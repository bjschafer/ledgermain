import type { Class, ClassFeature, ClassFeatureGrant } from "@pf1/schema";

import { stripHtml } from "../util/html.js";
import { readPack, type RawDoc } from "../util/packs.js";
import { transformClassFeature } from "./classes.js";
import {
  asStringArray,
  descriptionValue,
  guessLevelFromProse,
  normalizeSources,
  slug,
  type UuidResolver,
} from "./common.js";

/**
 * Vendors the ~108 splatbook prestige classes NOT already hand-authored in
 * `supplements.ts` from the same third-party archetype module already pinned
 * for `pf-archetypes`/`pf-arch-features` (see `transformArchetypePack`'s doc
 * comment) — `pf-prestige-classes/` (one doc per class, real chassis fields:
 * `hd`, `bab`, `savingThrows`, `skillsPerLevel`, `classSkills`, `tag`) and
 * `pf-prestige-features/` (one doc per granted ability, tagged with its owning
 * class by NAME via `system.associations.classes` — the same association shape
 * the archetype orphan-feature recovery pass already reads, see `classesOf` in
 * `archetypes.ts` — rather than a structured level-linked list).
 *
 * `excludeNames` skips any class whose name matches a hand-authored entry
 * (the CRB ten + Student of War) — those stay authoritative (richer:
 * structured `prereqs`/`castingAdvancement`, cross-checked against published
 * tables). `existingClasses`/`existingClassFeatures` are the
 * already-normalized arrays (base classes + the hand-authored prestige
 * supplement); this function mutates them in place, appending the vendored
 * entries, and throws loudly on any id/uuid/tag/name collision — same
 * "fail the build, don't silently overwrite" posture as
 * `applyPrestigeClassSupplements`.
 *
 * ## Id/uuid scheme
 *
 * Real Foundry ids exist for both classes and features (this is real,
 * `_id`-bearing module content), but they aren't from the pinned `pf1`
 * system's own compendium, so `RefEntity.uuid`'s `Compendium.pf1.<pack>...`
 * shape would misrepresent their provenance. Classes mint a synthetic id from
 * a name slug (`prestige:<slug>` / `prestige-class:<slug>`), matching the
 * hand-authored convention exactly (so e.g. a future data source repoint that
 * accidentally reintroduces an already-hand-authored class trips the same
 * collision guard). Features keep their real Foundry `_id` as `ClassFeature.id`
 * (via `transformClassFeature`, shared with the `class-abilities` pack) but
 * get a `prestige-feature:<foundryId>` uuid instead of a fabricated
 * `class-abilities` one.
 *
 * ## What's NOT derived
 *
 * No `armorProf`/`weaponProf` — the source class template carries neither
 * field at all (unlike the hand-authored set, which states "no proficiencies"
 * from the published text); defaulting to `[]` doesn't assert anything false,
 * it just means proficiency isn't tracked for these classes yet.
 * `Class.prereqs` carries ONLY `prereqText` (the class's own "Requirements"
 * section, lightly cleaned up) — no structured `bab`/`feats`/`skillRanks`
 * fields, per the hybrid prereq policy: the source has no reliable structured
 * signal beyond prose, so hard-blocking here would mean fragile parsing of
 * ~108 free-text requirement blocks. `evaluateClassPrereqs` already renders a
 * class with only `prereqText` as a pure soft-advisory (no checks, never
 * blocked).
 */
/**
 * Spells-per-day advancement read off the class's own published table, which
 * survives verbatim in the vendored `description` prose (the "Spells Per Day"
 * column of the level table, one `+1 level of ...` cell per advancing level).
 * There is no structured field for it, so the table is the source.
 *
 * Fails closed rather than guessing: a cell the descriptor vocabulary below
 * doesn't recognize, or a column whose descriptor changes between rows (which
 * one slot can't express), abandons the whole class and leaves
 * `castingAdvancement` undefined — advancement untracked is honest, a wrong
 * schedule silently mis-advances a caster.
 *
 * `kind` follows the column's own wording: `"any"` when it says "spellcasting
 * class" with no school restriction, `"arcane"`/`"divine"` only when the text
 * restricts it, and `classTags` when it names classes outright.
 *
 * Two classes are deliberately skipped by the "Level" header requirement:
 * Prophet of Kalistrade and Red Mantis Assassin print their OWN spell
 * progression (numbered 1st-4th columns under a merged "Spells Per Day"
 * banner) rather than advancing an existing class, a shape
 * `Class.castingAdvancement` can't represent at all.
 */
const CELL_ADVANCEMENT = /^\+\s*1\s+level\s+of\s+(.+)$/i;

/** A "no advancement this level" cell: an em/en dash, a hyphen, or nothing. */
const CELL_EMPTY = /^[—–-]?$/;

/**
 * Columns that name specific classes instead of a kind. Keyed by the
 * descriptor exactly as printed, so a wording this map hasn't seen abandons
 * the class rather than being pattern-matched into a guess.
 */
const NAMED_CLASS_DESCRIPTORS: Readonly<Record<string, readonly string[]>> = {
  "witch class": ["witch"],
  alchemist: ["alchemist"],
  "cleric or paladin": ["cleric", "paladin"],
};

/** A descriptor restricted to one school: "existing arcane spellcasting class" and its variants. */
const KIND_DESCRIPTOR = /^(?:existing )?(arcane|divine)(?: spellcasting)?(?: class)?$/;

/** An unrestricted descriptor: "existing class", "spellcasting class", "existing spellcasting class". */
const ANY_DESCRIPTOR = /^(?:existing )?(?:spellcasting )?class$/;

type Slot = NonNullable<Class["castingAdvancement"]>[number];

function parseDescriptor(descriptor: string): Omit<Slot, "levels"> | undefined {
  const text = descriptor.toLowerCase().replace(/\.$/, "").trim();
  const named = NAMED_CLASS_DESCRIPTORS[text];
  if (named) return { kind: "any", classTags: [...named] };
  const kind = KIND_DESCRIPTOR.exec(text);
  if (kind) return { kind: kind[1] as "arcane" | "divine" };
  if (ANY_DESCRIPTOR.test(text)) return { kind: "any" };
  return undefined;
}

/** Every `<table>` in `html`, each as a grid of tag-stripped cell texts. */
function parseTables(html: string): string[][][] {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((table) =>
    [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((row) =>
      [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripHtml(cell[1]!)),
    ),
  );
}

function extractCastingAdvancement(html: string | undefined): Slot[] | undefined {
  for (const rows of parseTables(html ?? "")) {
    // The level table's header row, not a merged banner row above it. Several
    // tables also pad themselves out to ten `<tr></tr>` with empty rows past
    // the class's real length (the Faction Guide's 3- and 5-level classes).
    const header = rows.findIndex((row) => row[0] === "Level");
    if (header === -1) continue;
    const columns = rows[header]!.flatMap((cell, i) =>
      /^spells?\s*per\s*day$/i.test(cell) ? [i] : [],
    );
    if (columns.length === 0) continue;

    const slots: Slot[] = [];
    for (const column of columns) {
      const levels: number[] = [];
      let shape: Omit<Slot, "levels"> | undefined;
      for (const row of rows.slice(header + 1)) {
        const level = /^(\d+)(?:st|nd|rd|th)$/.exec(row[0] ?? "");
        if (!level) continue;
        const cell = row[column] ?? "";
        if (CELL_EMPTY.test(cell)) continue;
        const descriptor = CELL_ADVANCEMENT.exec(cell);
        if (!descriptor) return undefined;
        const parsed = parseDescriptor(descriptor[1]!);
        if (!parsed) return undefined;
        if (shape && JSON.stringify(shape) !== JSON.stringify(parsed)) return undefined;
        shape = parsed;
        levels.push(Number(level[1]));
      }
      if (shape && levels.length > 0) slots.push({ ...shape, levels });
    }
    return slots.length > 0 ? slots : undefined;
  }
  return undefined;
}

export function transformPrestigeClassPack(
  classesDir: string,
  featuresDir: string,
  excludeNames: ReadonlySet<string>,
  existingClasses: Class[],
  existingClassFeatures: ClassFeature[],
  resolveUuid: UuidResolver,
): void {
  const classDocs = readPack(classesDir)
    .map((pf) => pf.doc)
    .filter((doc) => doc.type === "class" && !excludeNames.has(doc.name));

  const featureDocsByClassName = new Map<string, RawDoc[]>();
  for (const pf of readPack(featuresDir)) {
    const doc = pf.doc;
    if (doc.type !== "feat") continue;
    for (const className of classNamesOf(doc)) {
      if (excludeNames.has(className)) continue; // owned by the hand-authored class instead
      const bucket = featureDocsByClassName.get(className) ?? [];
      bucket.push(doc);
      featureDocsByClassName.set(className, bucket);
    }
  }

  for (const doc of classDocs) {
    const sys = (doc.system ?? {}) as Record<string, unknown>;
    const idSlug = slug(doc.name);
    const cls: Class = {
      id: `prestige:${idSlug}`,
      uuid: `prestige-class:${idSlug}`,
      name: doc.name,
      description: descriptionValue(sys, resolveUuid),
      sources: normalizeSources(sys.sources),
      tag: typeof sys.tag === "string" ? sys.tag : idSlug,
      subType: "prestige",
      hd: typeof sys.hd === "number" ? sys.hd : 0,
      bab: (typeof sys.bab === "string" ? sys.bab : "med") as Class["bab"],
      saves: {
        fort: prestigeSaveTier(sys, "fort"),
        ref: prestigeSaveTier(sys, "ref"),
        will: prestigeSaveTier(sys, "will"),
      },
      skillsPerLevel: typeof sys.skillsPerLevel === "number" ? sys.skillsPerLevel : 0,
      classSkills: asStringArray(sys.classSkills),
      armorProf: [],
      weaponProf: [],
      features: [],
    };

    const requirements = extractRequirementsText(cls.description);
    if (requirements) cls.prereqs = { prereqText: requirements };

    const advancement = extractCastingAdvancement(cls.description);
    if (advancement) cls.castingAdvancement = advancement;

    assertNoCollision(existingClasses, cls);
    existingClasses.push(cls);

    const grants: ClassFeatureGrant[] = [];
    for (const featDoc of featureDocsByClassName.get(doc.name) ?? []) {
      const feature = transformClassFeature(featDoc, resolveUuid);
      feature.uuid = `prestige-feature:${featDoc._id}`;
      assertNoFeatureCollision(existingClassFeatures, feature);
      existingClassFeatures.push(feature);

      // Every class in this pack is a 10-level prestige table (verified: `hd`
      // in {6,8,10,12}, no `savingThrows`/`bab` tier beyond the standard set —
      // see `prestigeSaveTier`'s doc comment). A handful of features mention a
      // level above 10 in prose for an unrelated reason (e.g. Thuvian
      // Alchemist's "Capture Elemental" requiring 12th COMBINED alchemist
      // level, not a 12th prestige-class level that doesn't exist) — clamping
      // keeps `guessLevelFromProse`'s best-effort scrape from producing a
      // grant the class can never reach instead of just an imprecise one.
      const level = Math.min(10, guessLevelFromProse(feature.description));
      grants.push({
        level,
        uuid: feature.uuid,
        featureId: feature.id,
        name: feature.name,
        resolved: true,
      });
    }
    grants.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    cls.features = grants;
  }
}

function classNamesOf(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const assoc = sys.associations as Record<string, unknown> | undefined;
  return asStringArray(assoc?.classes);
}

/**
 * PF1's 10-level prestige classes use a different poor-save progression than
 * 20-level base classes (`lowPrestige`, not `low` — see `SaveTier`'s doc
 * comment in `@pf1/schema` `primitives.ts`, verified in `supplements.ts`'s
 * hand-authored chassis against three independently-sourced CRB tables). The
 * source YAML only ever encodes the generic `"high"`/`"low"` label (same
 * field shape base classes use) because `pf-prestige-classes/` is exclusively
 * 10-level prestige-style tables, so every entry here maps to the prestige
 * tier — never the base `high`/`low` tier `transformClass` uses.
 */
function prestigeSaveTier(
  sys: Record<string, unknown>,
  key: "fort" | "ref" | "will",
): "highPrestige" | "lowPrestige" {
  const saves = sys.savingThrows as Record<string, { value?: unknown }> | undefined;
  return saves?.[key]?.value === "high" ? "highPrestige" : "lowPrestige";
}

/**
 * Pull the class's own published entry requirements out of its description
 * prose as plain text — every doc but one (Technomancer) uses an explicit
 * "Requirements" heading followed by one or more `<p>` blocks, bounded by the
 * next `<h2>`. Technomancer instead states requirements inline with no
 * heading at all and no other reliable landmark before the level table, so
 * rather than risk swallowing unrelated prose (the level table, class-skill
 * list, etc.) into the advisory text, it's left with no `prereqs` at all —
 * `evaluateClassPrereqs` already treats a missing `prereqs` as unconditionally
 * unblocked, so this degrades to "no advisory shown", not a wrong one.
 */
function extractRequirementsText(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const heading = /<h2>\s*Requirements\s*<\/h2>/i.exec(html);
  if (!heading) return undefined;
  const rest = html.slice(heading.index + heading[0].length);
  const end = rest.search(/<h2[ >]/i);
  const section = end === -1 ? rest : rest.slice(0, end);
  const text = stripHtml(section)
    .replace(/\s+:/g, ":")
    .replace(
      /^To qualify to become (?:a|an) [^,]+, a character must fulfill(?: all)? the following criteria\.\s*/i,
      "",
    )
    .trim();
  return text.length > 0 ? text : undefined;
}

function assertNoCollision(existing: Class[], next: Class): void {
  const collision = existing.find(
    (c) => c.id === next.id || c.uuid === next.uuid || c.tag === next.tag || c.name === next.name,
  );
  if (collision) {
    throw new Error(
      `[prestigeClasses] vendored prestige class "${next.name}" collides with existing class "${collision.name}" (id=${collision.id})`,
    );
  }
}

function assertNoFeatureCollision(existing: ClassFeature[], next: ClassFeature): void {
  const collision = existing.find((f) => f.id === next.id || f.uuid === next.uuid);
  if (collision) {
    throw new Error(
      `[prestigeClasses] vendored prestige feature "${next.name}" collides with existing class feature "${collision.name}" (id=${collision.id})`,
    );
  }
}
