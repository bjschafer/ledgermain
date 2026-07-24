import type {
  BabTier,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  Domain,
  ElementalSchoolTag,
  FeatureAction,
  SaveTier,
  WizardSchool,
  WizardSchoolTag,
} from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid, parseUuid } from "../util/uuid.js";
import {
  asNumber,
  asStringArray,
  descriptionValue,
  normalizeChanges,
  normalizeSources,
  normalizeUses,
  type UuidResolver,
} from "./common.js";

/** Transform a `class-abilities` pack entry (e.g. Rage). */
export function transformClassFeature(doc: RawDoc, resolveUuid: UuidResolver): ClassFeature {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const grantsBuffs = supplementsOf(sys)
    .map((s) => (typeof s.uuid === "string" ? s.uuid : null))
    .filter((u): u is string => u !== null);

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: typeof sys.tag === "string" ? sys.tag : undefined,
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    abilityType: typeof sys.abilityType === "string" ? sys.abilityType : undefined,
    uses: normalizeUses(sys.uses),
    changes: normalizeChanges(sys.changes),
    grantsBuffs,
    actions: transformFeatureActions(sys.actions),
  };
}

/**
 * Extract the `links.supplements` array off a raw doc's `system`, if present.
 * Exported for `transform/subdomains.ts`, which shares this shape.
 */
export function supplementsOf(sys: Record<string, unknown>): Record<string, unknown>[] {
  const links = sys.links as Record<string, unknown> | undefined;
  return Array.isArray(links?.supplements) ? (links!.supplements as Record<string, unknown>[]) : [];
}

/**
 * Extract a lean {@link FeatureAction}[] from a class feature's `system.actions`
 * map (same "object keyed by random id" shape `transformSpell`'s actions
 * block uses — see `transform/spells.ts`). Only the first damage part of each
 * action is kept (the vendored slice never has a feature action with more
 * than one), and actions carrying none of actionType/damage/save are dropped
 * (activation-only entries have nothing useful to summarize). Returns
 * `undefined` (not `[]`) when the feature has no usable actions, so
 * `ClassFeature.actions` stays truly absent for the ~215 of 254 sliced
 * features with none.
 */
function transformFeatureActions(value: unknown): FeatureAction[] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  const out: FeatureAction[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const damage = a.damage as Record<string, unknown> | undefined;
    const parts = Array.isArray(damage?.parts) ? (damage!.parts as Record<string, unknown>[]) : [];
    const firstPart = parts[0];
    const save = a.save as Record<string, unknown> | undefined;
    const activation = a.activation as Record<string, unknown> | undefined;

    const actionType = typeof a.actionType === "string" ? a.actionType : undefined;
    const dmg = firstPart
      ? { formula: String(firstPart.formula ?? ""), types: asStringArray(firstPart.types) }
      : undefined;
    const saveOut =
      save &&
      (typeof save.dc === "string" || typeof save.dc === "number" || typeof save.type === "string")
        ? {
            type: typeof save.type === "string" ? save.type : "",
            dcFormula: save.dc == null ? undefined : String(save.dc),
          }
        : undefined;
    if (!actionType && !dmg && !saveOut) continue; // activation-only — nothing to summarize

    out.push({
      name: typeof a.name === "string" ? a.name : undefined,
      actionType,
      damage: dmg,
      save: saveOut,
      activation: typeof activation?.type === "string" ? activation.type : undefined,
      touch: a.touch === true ? true : undefined,
      range: formatFeatureRange(a.range as Record<string, unknown> | undefined),
    });
  }
  return out.length > 0 ? out : undefined;
}

/** Format a feature action's `range` block into a display string, e.g. "30 ft", "touch". */
function formatFeatureRange(range: Record<string, unknown> | undefined): string | undefined {
  if (!range) return undefined;
  const units = typeof range.units === "string" ? range.units : undefined;
  const value = range.value == null ? undefined : String(range.value);
  if (!units) return value;
  if (units === "ft" && value) return `${value} ft`;
  if (value && !["seeText", "personal", "touch"].includes(units)) return `${value} ${units}`;
  return units === "seeText" ? undefined : units;
}

/**
 * Resolve a `links.supplements` array into level-tagged `ClassFeatureGrant`s.
 * Unresolvable links are kept with `resolved: false` so nothing is silently
 * dropped. Shared by classes, domains, and wizard schools — all three grant
 * features through the same `links.supplements` shape.
 */
export function resolveFeatureGrants(
  supplements: Record<string, unknown>[],
  resolveFeatureName: (id: string) => string | null,
): ClassFeatureGrant[] {
  const features: ClassFeatureGrant[] = [];
  for (const s of supplements) {
    const uuid = typeof s.uuid === "string" ? s.uuid : null;
    if (!uuid) continue;
    const level = asNumber(s.level) ?? 0;
    const parsed = parseUuid(uuid);
    const id = parsed?.id ?? "";
    const resolvedName = id ? resolveFeatureName(id) : null;
    features.push({
      level,
      uuid,
      featureId: id,
      name: resolvedName ?? uuid,
      resolved: resolvedName !== null,
    });
  }
  features.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return features;
}

/**
 * Transform a class. `links.supplements` UUIDs are resolved against the provided
 * resolver into `ClassFeatureGrant`s tagged by level. Unresolvable links are kept
 * with `resolved: false` so nothing is silently dropped.
 */
export function transformClass(
  doc: RawDoc,
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): Class {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const saves = (sys.savingThrows ?? {}) as Record<string, { value?: unknown }>;
  const features = resolveFeatureGrants(supplementsOf(sys), resolveFeatureName);

  const saveTier = (k: string): SaveTier =>
    (saves[k]?.value === "high" ? "high" : "low") as SaveTier;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("classes", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: typeof sys.tag === "string" ? sys.tag : doc.name.toLowerCase(),
    subType: typeof sys.subType === "string" ? sys.subType : "base",
    hd: asNumber(sys.hd) ?? 0,
    bab: (typeof sys.bab === "string" ? sys.bab : "med") as BabTier,
    saves: {
      fort: saveTier("fort"),
      ref: saveTier("ref"),
      will: saveTier("will"),
    },
    skillsPerLevel: asNumber(sys.skillsPerLevel) ?? 0,
    classSkills: asStringArray(sys.classSkills),
    armorProf: asStringArray(sys.armorProf),
    weaponProf: asStringArray(sys.weaponProf),
    features,
  };
}

/** Transform a top-level `class-abilities/domains/*.yaml` entry (e.g. Fire Domain). */
export function transformDomain(
  doc: RawDoc,
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): Domain {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: doc.name.replace(/ Domain$/, ""),
    features: resolveFeatureGrants(supplementsOf(sys), resolveFeatureName),
    changes: normalizeChanges(sys.changes),
  };
}

/**
 * Foundry names wizard schools with the full word ("Evocation School"); the
 * schema's `WizardSchoolTag` uses the short PF1 abbreviation to match
 * `Spell.school`. Fixed 9-entry mapping — same posture as `tables.ts`'s
 * hardcoded BAB/save tiers, not derived from any GPL source.
 */
const SCHOOL_NAME_TO_TAG: Record<string, WizardSchoolTag> = {
  "Abjuration School": "abj",
  "Conjuration School": "con",
  "Divination School": "div",
  "Enchantment School": "enc",
  "Evocation School": "evo",
  "Illusion School": "ill",
  "Necromancy School": "nec",
  "Transmutation School": "trs",
  "Universalist School": "uni",
};

/**
 * Transform a top-level `class-abilities/wizard-schools/*.yaml` entry. Returns
 * `null` for non-school marker docs in the same folder ("Elemental Schools",
 * "Focused Schools" — index items describing optional variant rules, not a
 * pickable school).
 */
export function transformWizardSchool(
  doc: RawDoc,
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): WizardSchool | null {
  const tag = SCHOOL_NAME_TO_TAG[doc.name];
  if (!tag) return null;
  return buildWizardSchool(doc, tag, resolveFeatureName, resolveUuid);
}

/**
 * Foundry names elemental schools "<Element> Elemental School"; the schema's
 * `ElementalSchoolTag` matches that as a slug. Fixed 8-entry mapping, same
 * posture as `SCHOOL_NAME_TO_TAG` above.
 */
const ELEMENTAL_SCHOOL_NAME_TO_TAG: Record<string, ElementalSchoolTag> = {
  "Aether Elemental School": "aether-elemental",
  "Air Elemental School": "air-elemental",
  "Earth Elemental School": "earth-elemental",
  "Fire Elemental School": "fire-elemental",
  "Metal Elemental School": "metal-elemental",
  "Void Elemental School": "void-elemental",
  "Water Elemental School": "water-elemental",
  "Wood Elemental School": "wood-elemental",
};

/** Element display name (as it appears in the "Opposing element / school" prose) -> tag. */
const ELEMENT_NAME_TO_TAG: Record<string, ElementalSchoolTag> = {
  aether: "aether-elemental",
  air: "air-elemental",
  earth: "earth-elemental",
  fire: "fire-elemental",
  metal: "metal-elemental",
  void: "void-elemental",
  water: "water-elemental",
  wood: "wood-elemental",
};

/**
 * Parse an elemental school's "Opposing element / school: ..." line into the
 * elements it may oppose. The heading wording varies ("Opposing element /
 * school" vs plain "Opposing school") and the values come in three shapes: a
 * single fixed element ("Earth"), a source-dependent choice of two
 * ("Air<sup>(APG)</sup> or Wood<sup>(UM)</sup>"), and the four-way pick Void
 * and Aether offer ("Air, Earth, Fire or Water"). `<sup>` source citations and
 * `@UUID`/`@Source` markup are stripped before splitting on commas and "or".
 */
export function parseElementalOpposition(html: string): ElementalSchoolTag[] {
  const norm = html.replace(/\s+/g, " ");
  const m = /Opposing[^<]*?:?\s*<\/strong>\s*(.*?)<\/p>/i.exec(norm);
  if (!m) return [];
  const text = m[1]!
    .replace(/<sup>.*?<\/sup>/g, " ")
    .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/<[^>]+>/g, " ");
  const out: ElementalSchoolTag[] = [];
  for (const part of text.split(/,|\bor\b/i)) {
    const tag = ELEMENT_NAME_TO_TAG[part.trim().toLowerCase()];
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * Upstream spell-name repairs for the elemental "Spells" lists: two entries
 * lost the separator between adjacent names, one is misspelled. Applied before
 * name resolution so the affected spells aren't silently dropped; everything
 * else that fails to resolve (e.g. spells outside the vendored slice) is.
 */
const ELEMENTAL_SPELL_NAME_FIXES: Record<string, string[]> = {
  "firey body": ["fiery body"],
  "share memorypact": ["share memory"],
  "spiritual weaponlife pact": ["spiritual weapon", "life pact"],
};

/**
 * Normalize a spell name for matching an elemental school's free-text list
 * against real spell names. Beyond case/whitespace/apostrophe folding, a
 * trailing arabic numeral becomes its roman equivalent — the lists write
 * "summon monster 2" and "elemental body i" interchangeably where the spell is
 * named "Summon Monster II".
 */
export function normalizeElementalSpellName(name: string): string {
  const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];
  return name
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ ([1-9])$/, (_, d: string) => ` ${ROMAN[Number(d)]}`);
}

/**
 * Parse an elemental school's `<h3>Spells</h3>` list into level -> spellId
 * entries. Unlike a domain's list, the source `@UUID`-links nothing here: each
 * level is a comma-joined run of lowercase spell names, some of which
 * themselves contain a comma ("resist energy, communal"). `resolveName` is the
 * caller's index of real spell names — matching tries the longest candidate
 * first, so "protection from energy, resist energy, communal" resolves to
 * *Protection from Energy* plus *Resist Energy, Communal* rather than the
 * (nonexistent) "Protection from Energy, Resist Energy". Names that resolve to
 * nothing (spells outside the vendored slice) are dropped.
 */
export function parseElementalSpellEntries(
  html: string,
  resolveName: (name: string) => string | undefined,
): { level: number; spellId: string }[] {
  const norm = html.replace(/\s+/g, " ");
  const start = norm.search(/<h3>\s*Spells\s*<\/h3>/i);
  if (start < 0) return [];
  const out: { level: number; spellId: string }[] = [];
  for (const li of norm.slice(start).matchAll(/<li>(.*?)<\/li>/g)) {
    const m = /^\s*<strong>\s*(\d)(?:st|nd|rd|th)?\s*<\/strong>\s*(.*)$/i.exec(li[1]!);
    if (!m) continue;
    const level = Number(m[1]);
    const names = m[2]!
      .replace(/<[^>]+>/g, " ")
      .replace(/^\s*[-–—]\s*/, "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    for (let i = 0; i < names.length; ) {
      // Longest match first: a two-token join covers the ", greater"/", mass"/
      // ", communal"/", lesser" variant names, which is the deepest the source goes.
      const pairId =
        names[i + 1] === undefined ? undefined : resolveName(`${names[i]}, ${names[i + 1]}`);
      if (pairId) {
        out.push({ level, spellId: pairId });
        i += 2;
        continue;
      }
      const single = names[i]!;
      for (const name of ELEMENTAL_SPELL_NAME_FIXES[single.toLowerCase()] ?? [single]) {
        const spellId = resolveName(name);
        if (spellId) out.push({ level, spellId });
      }
      i += 1;
    }
  }
  return out;
}

/**
 * Transform a `class-abilities/wizard-schools/elemental-schools/*.yaml` entry.
 * The bonus-slot spell list isn't derived here — it needs the full spell index
 * to resolve names, so `normalize.ts` parses it separately into
 * `RefData.elementalSchoolSpellLists`. Returns `null` for anything not in the
 * fixed 8-entry map (the nested "focused-schools" variant-rule subfolder is
 * excluded upstream in `normalize.ts` by relPath depth, so this should only
 * ever see the eight real elemental schools).
 */
export function transformElementalWizardSchool(
  doc: RawDoc,
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): WizardSchool | null {
  const tag = ELEMENTAL_SCHOOL_NAME_TO_TAG[doc.name];
  if (!tag) return null;
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const description = (sys.description ?? {}) as Record<string, unknown>;
  const oppositionOptions = parseElementalOpposition(
    typeof description.value === "string" ? description.value : "",
  );
  return {
    ...buildWizardSchool(doc, tag, resolveFeatureName, resolveUuid),
    ...(oppositionOptions.length > 0 ? { oppositionOptions } : {}),
  };
}

function buildWizardSchool(
  doc: RawDoc,
  tag: WizardSchoolTag | ElementalSchoolTag,
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): WizardSchool {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag,
    features: resolveFeatureGrants(supplementsOf(sys), resolveFeatureName),
  };
}
