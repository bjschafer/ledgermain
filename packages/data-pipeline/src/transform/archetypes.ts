import { existsSync, readFileSync } from "node:fs";

import type { Archetype, ArchetypeFeature, Class } from "@pf1/schema";

import { isFolderDoc, readPack, type RawDoc } from "../util/packs.js";
import {
  descriptionValue,
  guessLevelFromProse,
  normalizeSources,
  slug,
  type UuidResolver,
} from "./common.js";

/**
 * Attribution for the dataset's content (module + maintainer). See
 * `ARCHETYPE_REPO`/`ARCHETYPE_SHA` in config.ts for the pinned source.
 */
const CONTRIBUTOR_MODULE = "Tryss_Farron/pf1e-archetypes";

/**
 * Reads the previously-vendored `archetype-features.json` (if any — absent on
 * a from-scratch build) purely to recover `.level` for features the new
 * source doesn't itemize with a structured level (see
 * `transformArchetypePack`'s doc comment). Keyed by `${archetypeId}:${slug(featureName)}`
 * — level-independent, since the level is exactly what's missing. Not a
 * general "trust the old data" mechanism: name/description/existence always
 * come from the current source; only the numeric level falls back this way,
 * and only for the minority of features this source doesn't structure.
 */
export function loadLegacyArchetypeFeatureLevels(
  archetypeFeaturesJsonPath: string,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!existsSync(archetypeFeaturesJsonPath)) return out;
  const data = JSON.parse(readFileSync(archetypeFeaturesJsonPath, "utf8")) as Record<
    string,
    { archetypeId: string; name: string; level: number }
  >;
  for (const feature of Object.values(data)) {
    out.set(`${feature.archetypeId}:${slug(feature.name)}`, feature.level);
  }
  return out;
}

/**
 * The dataset names every archetype doc `"<Class> (<Archetype>)"` (e.g.
 * `"Fighter (Archer)"`, `"Bard (Ringleader (UI))"` when a book code
 * disambiguates two same-named archetypes). The bare archetype name is
 * everything from the first `(` to the matching final `)`.
 */
function bareArchetypeName(name: string): string {
  const idx = name.indexOf("(");
  if (idx === -1) return name.trim();
  let rest = name.slice(idx + 1);
  if (rest.endsWith(")")) rest = rest.slice(0, -1);
  return rest.trim();
}

/**
 * Feature docs are named `"<Feature> (<Archetype>)"`, and a handful bake an
 * ability-type tag in before that too (e.g. `"Invulnerability (Ex)
 * (Invulnerable Rager)"`, `"Dismiss (Su) (Spell Specialist)"`). Stripping only
 * the KNOWN trailing `" (<archetypeBareName>)"` (rather than blindly cutting
 * at the first `(`, the mirror image of `bareArchetypeName`) preserves that
 * `(Ex)`/`(Su)` tag — which matters for id stability: the CSV-era dataset
 * baked the same tag into its own feature names, so e.g. `"Invulnerability
 * (Ex)"` reproduces the existing `invulnerability-ex` slug exactly. Falls
 * back to cutting at the last `(` when the exact suffix isn't present
 * verbatim (occasional formatting drift, e.g. a stray space).
 */
function bareFeatureName(name: string, archetypeBareName: string): string {
  const suffix = ` (${archetypeBareName})`;
  if (name.endsWith(suffix)) return name.slice(0, -suffix.length).trim();
  const idx = name.lastIndexOf("(");
  return (idx === -1 ? name : name.slice(0, idx)).trim();
}

/**
 * Foundry `Folder` docs organize `pf-archetypes/` into one subfolder per base
 * class (see `util/packs.ts` `isFolderDoc`). Maps a folder's display name to
 * our class tag(s). Two classes duplicate an entry to a shared source folder
 * rather than distinguishing chained/unchained catalogs, matching how the
 * dataset itself treats them post-errata (an unchained rogue is just "the"
 * rogue in every archetype published after Pathfinder Unchained; likewise
 * barbarian): `rogueUnchained` mirrors `Rogue`, `barbarianUnchained` mirrors
 * `Barbarian`. `Monk`/`Summoner` are handled separately below — the dataset
 * DOES keep a distinct catalog for their Unchained variants, filed in the same
 * folder but with a `-uc-` filename infix.
 */
const FOLDER_TO_CLASS_TAGS: Record<string, string[]> = {
  Alchemist: ["alchemist"],
  Antipaladin: ["antipaladin"],
  Arcanist: ["arcanist"],
  Barbarian: ["barbarian", "barbarianUnchained"],
  Bard: ["bard"],
  Bloodrager: ["bloodrager"],
  Brawler: ["brawler"],
  Cavalier: ["cavalier"],
  Cleric: ["cleric"],
  Druid: ["druid"],
  Fighter: ["fighter"],
  Gunslinger: ["gunslinger"],
  Hunter: ["hunter"],
  Inquisitor: ["inquisitor"],
  Investigator: ["investigator"],
  Kineticist: ["kineticist"],
  Magus: ["magus"],
  Medium: ["medium"],
  Mesmerist: ["mesmerist"],
  Ninja: ["ninja"],
  Occultist: ["occultist"],
  Oracle: ["oracle"],
  Paladin: ["paladin"],
  Psychic: ["psychic"],
  Ranger: ["ranger"],
  Rogue: ["rogue", "rogueUnchained"],
  Samurai: ["samurai"],
  Shaman: ["shaman"],
  Shifter: ["shifter"],
  Skald: ["skald"],
  Slayer: ["slayer"],
  Sorcerer: ["sorcerer"],
  Spiritualist: ["spiritualist"],
  Swashbuckler: ["swashbuckler"],
  Vigilante: ["vigilante"],
  Warpriest: ["warpriest"],
  Witch: ["witch"],
  Wizard: ["wizard"],
  // Companion / Familiar folders hold non-class (animal companion / familiar)
  // archetypes — no matching class tag, so they're simply never emitted.
};

/**
 * Same idea as `FOLDER_TO_CLASS_TAGS`, keyed by the class name text an orphan
 * feature's `system.associations.classes` entry carries (used only for
 * features with no `folder`, see the "vanished-parent recovery" pass in
 * `transformArchetypePack` below). Includes the two Unchained variants, which
 * orphan features spell out
 * explicitly (`"Monk (Unchained)"`, `"Summoner (Unchained)"`) rather than via
 * a filename convention.
 */
const CLASS_NAME_TO_TAGS: Record<string, string[]> = {
  ...FOLDER_TO_CLASS_TAGS,
  Monk: ["monk"],
  "Monk (Unchained)": ["monkUnchained"],
  Summoner: ["summoner"],
  "Summoner (Unchained)": ["summonerUnchained"],
};

/**
 * A handful of `associations.classes` entries carry a stray trailing `)` —
 * upstream authoring noise in the source YAML (unbalanced parens in a
 * flow-list item, e.g. `classes: [Bard)]` instead of `[Bard]`) — harmless
 * once stripped.
 */
function cleanClassName(raw: string): string {
  return raw.replace(/\)+$/, "").trim();
}

/**
 * A tiny number of `links.supplements` entries point at the wrong feature —
 * confirmed by reading both docs: the archetype's OTHER features are
 * consistently for its own class, and the referenced feature is itself
 * `associations.classes`-tagged for an unrelated class's SAME-NAMED but
 * unrelated archetype (e.g. Wizard's "Primalist" cross-wired onto a feature
 * belonging to Bloodrager's own, entirely different, "Primalist" archetype).
 * NOT a general "class mismatch" filter — genuinely shared multi-class
 * archetypes (Divine Hunter, Skirmisher, Musketeer, ...) legitimately
 * reference features tagged for their OTHER class, so that broader check
 * produces false positives. Keyed by `${archetype doc _id}:${feature doc _id}`.
 */
const MISLINKED_SUPPLEMENTS = new Set<string>([
  // Wizard (Primalist) level-4 supplement resolves to Bloodrager (Primalist)'s
  // own "Primal Choices" feature (bloodrager-only prose: "bloodrager level",
  // "bloodrage") — Wizard's own Primalist has no such feature.
  "9ZCsmhPPdd6BJz1o:D89YgXvbeGfTTijR",
  // Wizard (Scroll Scholar)'s level-1 supplement resolves to a cleric-only
  // "Weapon and Armor Proficiency" swap (the dataset's own doc comment notes
  // Scroll Scholar is shared by clerics AND wizards, "they give up different
  // class abilities" — this specific feature is the cleric half).
  "Dtql9vRY7VG5XtVN:M8A86NznHJUmql2H",
]);

function classTagsForArchetypeDoc(folderName: string, fileBase: string): string[] {
  if (folderName === "Monk") return [/-uc-/.test(fileBase) ? "monkUnchained" : "monk"];
  if (folderName === "Summoner") return [/-uc-/.test(fileBase) ? "summonerUnchained" : "summoner"];
  return FOLDER_TO_CLASS_TAGS[folderName] ?? [];
}

/**
 * Base-class (level → granted feature uuid) pairing candidates: only levels
 * where the class grants exactly one feature, and that feature isn't a
 * "Bonus Feat"-style slot (multiple unrelated picks share that level/name
 * across the game, so a level-only cross-ref can't disambiguate which one an
 * archetype replaces). Everything else stays unpaired — the UI shows the
 * archetype feature's own prose as a soft warning instead of a struck-through
 * swap.
 */
export function pairableBaseFeatureLevels(classDef: Class): Map<number, string> {
  const byLevel = new Map<number, { uuid: string; name: string }[]>();
  for (const f of classDef.features) {
    const grants = byLevel.get(f.level) ?? [];
    grants.push({ uuid: f.uuid, name: f.name });
    byLevel.set(f.level, grants);
  }

  const pairable = new Map<number, string>();
  for (const [level, grants] of byLevel) {
    if (grants.length !== 1) continue;
    if (/bonus feat/i.test(grants[0]!.name)) continue;
    pairable.set(level, grants[0]!.uuid);
  }
  return pairable;
}

function makeFeature(
  archetypeId: string,
  archetypeBareName: string,
  classTag: string,
  featDoc: RawDoc,
  level: number,
  pairable: Map<number, string>,
  resolveUuid: UuidResolver,
): ArchetypeFeature {
  const name = bareFeatureName(featDoc.name, archetypeBareName);
  const id = `${archetypeId}:${slug(name)}:${level}`;
  const sys = (featDoc.system ?? {}) as Record<string, unknown>;
  return {
    id,
    uuid: `archetype-feature:${id}`,
    name,
    archetypeId,
    classTag,
    level,
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    pairedBaseFeatureUuid: pairable.get(level),
  };
}

function tagsOf(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const t = sys.tags;
  return Array.isArray(t) ? t.filter((v): v is string => typeof v === "string") : [];
}

function classesOf(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const assoc = sys.associations as Record<string, unknown> | undefined;
  const classes = assoc?.classes;
  return Array.isArray(classes)
    ? classes.filter((v): v is string => typeof v === "string").map(cleanClassName)
    : [];
}

/**
 * Reads the vendored archetype YAML packs and produces `Archetype` +
 * `ArchetypeFeature` entries matching the CSV-era normalized shape and id
 * convention (`<classTag>:<slug>` / `<archetypeId>:<featureSlug>:<level>`), so
 * existing `CharacterDoc.build.archetypes` references keep resolving.
 *
 * `pf-archetypes/` holds one doc per archetype, filed under a per-class
 * `Folder`; most link their sub-features via `system.links.supplements`
 * (`{level, uuid}` pairs resolved against `pf-arch-features/`). A minority
 * (~3.5%) fold everything into one inline-prose doc with no supplements list
 * at all — for those, and for archetypes whose *entire* doc is themselves
 * missing from `pf-archetypes/` (the dataset restructured a few multi-variant
 * mechanics, e.g. Paladin's Sacred Oaths, as freestanding features with no
 * archetype wrapper), features are recovered by grouping `pf-arch-features/`
 * items by their shared `tags[0]` value instead. Those recovered features
 * have no structured level, so it's taken from the previously-vendored data
 * when the same (archetype, feature) pair existed before (continuity for
 * existing `CharacterDoc`s and the hand-authored `@pf1/engine`
 * `archetype-effects.ts` table that keys off these exact ids), falling back to
 * a "Nth level" scrape of the feature's own prose for anything genuinely new.
 */
export function transformArchetypePack(
  archetypesDir: string,
  archFeaturesDir: string,
  classesByTag: ReadonlyMap<string, Class>,
  legacyFeatureLevels: ReadonlyMap<string, number>,
  resolveUuid: UuidResolver,
): { archetypes: Archetype[]; archetypeFeatures: ArchetypeFeature[] } {
  const archPack = readPack(archetypesDir);
  const featPack = readPack(archFeaturesDir).filter((pf) => !isFolderDoc(pf.doc));
  const featById = new Map(featPack.map((pf) => [pf.doc._id, pf.doc]));

  const folderNameById = new Map(
    archPack.filter((pf) => isFolderDoc(pf.doc)).map((pf) => [pf.doc._id, pf.doc.name]),
  );

  const archetypes: Archetype[] = [];
  const archetypeFeatures: ArchetypeFeature[] = [];
  /** `${classTag}:${archetypeSlug}` for every archetype we emit — guards the orphan pass below from re-creating one that already exists. */
  const claimedKeys = new Set<string>();
  /** Feature ids already attached to some archetype via `links.supplements` — excluded from the orphan grouping below. */
  const consumedFeatureIds = new Set<string>();

  for (const pf of archPack) {
    if (isFolderDoc(pf.doc)) continue;
    const doc = pf.doc;
    const folderName = typeof doc.folder === "string" ? folderNameById.get(doc.folder) : undefined;
    if (!folderName) continue;
    const fileBase = pf.relPath.split("/").pop() ?? "";
    const classTags = classTagsForArchetypeDoc(folderName, fileBase);
    if (classTags.length === 0) continue; // Companion/Familiar/unmapped — not a class archetype

    const bareName = bareArchetypeName(doc.name);
    const archetypeSlug = slug(bareName);
    const sys = (doc.system ?? {}) as Record<string, unknown>;
    const description = descriptionValue(sys, resolveUuid);
    const sources = normalizeSources(sys.sources);
    const links = sys.links as Record<string, unknown> | undefined;
    const supplements = Array.isArray(links?.supplements)
      ? (links.supplements as { level?: number; uuid?: string }[])
      : [];

    for (const classTag of classTags) {
      if (!classesByTag.has(classTag)) continue; // class not in this slice yet
      const archetypeId = `${classTag}:${archetypeSlug}`;
      claimedKeys.add(archetypeId);
      archetypes.push({
        id: archetypeId,
        uuid: `archetype:${archetypeId}`,
        name: bareName,
        classTag,
        contributorModule: CONTRIBUTOR_MODULE,
        description,
        sources,
      });

      const pairable = pairableBaseFeatureLevels(classesByTag.get(classTag)!);

      if (supplements.length > 0) {
        for (const s of supplements) {
          const uuid = s.uuid;
          if (typeof uuid !== "string") continue;
          const featureId = uuid.split(".").pop();
          if (featureId !== undefined && MISLINKED_SUPPLEMENTS.has(`${doc._id}:${featureId}`))
            continue;
          const featDoc = featureId ? featById.get(featureId) : undefined;
          if (!featDoc || featureId === undefined) continue;
          consumedFeatureIds.add(featureId);
          const level = typeof s.level === "number" ? s.level : 0;
          archetypeFeatures.push(
            makeFeature(archetypeId, bareName, classTag, featDoc, level, pairable, resolveUuid),
          );
        }
      } else {
        // Inline-prose archetype (no links.supplements) — recover features by
        // matching pf-arch-features items tagged with this archetype's own
        // name, same fallback as the orphan pass below.
        for (const fp of featPack) {
          if (consumedFeatureIds.has(fp.doc._id)) continue;
          if (tagsOf(fp.doc)[0] !== bareName) continue;
          consumedFeatureIds.add(fp.doc._id);
          const name = bareFeatureName(fp.doc.name, bareName);
          const legacyLevel = legacyFeatureLevels.get(`${archetypeId}:${slug(name)}`);
          const level =
            legacyLevel ?? guessLevelFromProse(descriptionValue(fp.doc.system ?? {}, resolveUuid));
          archetypeFeatures.push(
            makeFeature(archetypeId, bareName, classTag, fp.doc, level, pairable, resolveUuid),
          );
        }
      }
    }
  }

  // --- vanished-parent recovery -----------------------------------------
  // Group every still-unconsumed feature by its tag[0] + resolved class(es).
  // A group whose (classTag, slug) key was never claimed above means the
  // dataset dropped that archetype's wrapper doc entirely (e.g. Paladin's
  // Sacred Oaths) — synthesize a minimal Archetype (name only, no prose of
  // its own — each feature carries its own description) so the id survives.
  const groups = new Map<string, { tag: string; docs: RawDoc[] }>();
  for (const fp of featPack) {
    if (consumedFeatureIds.has(fp.doc._id)) continue;
    const tag = tagsOf(fp.doc)[0];
    if (!tag) continue;
    const key = `${tag}${classesOf(fp.doc).join(",")}`;
    const group = groups.get(key) ?? { tag, docs: [] };
    group.docs.push(fp.doc);
    groups.set(key, group);
  }

  for (const { tag, docs } of groups.values()) {
    const archetypeSlug = slug(tag);
    const classNames = classesOf(docs[0]!);
    const candidateTags = classNames.flatMap((c) => CLASS_NAME_TO_TAGS[c] ?? []);

    for (const classTag of candidateTags) {
      const archetypeId = `${classTag}:${archetypeSlug}`;
      if (claimedKeys.has(archetypeId) || !classesByTag.has(classTag)) continue;
      claimedKeys.add(archetypeId);
      archetypes.push({
        id: archetypeId,
        uuid: `archetype:${archetypeId}`,
        name: tag,
        classTag,
        contributorModule: CONTRIBUTOR_MODULE,
      });

      const pairable = pairableBaseFeatureLevels(classesByTag.get(classTag)!);
      for (const featDoc of docs) {
        const name = bareFeatureName(featDoc.name, tag);
        const legacyLevel = legacyFeatureLevels.get(`${archetypeId}:${slug(name)}`);
        const level =
          legacyLevel ?? guessLevelFromProse(descriptionValue(featDoc.system ?? {}, resolveUuid));
        archetypeFeatures.push(
          makeFeature(archetypeId, tag, classTag, featDoc, level, pairable, resolveUuid),
        );
      }
    }
  }

  return { archetypes, archetypeFeatures };
}
