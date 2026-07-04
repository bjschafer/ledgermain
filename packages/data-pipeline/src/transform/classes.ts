import type {
  BabTier,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  Domain,
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
  type UuidResolver,
} from "./common.js";

/** Transform a `class-abilities` pack entry (e.g. Rage). */
export function transformClassFeature(doc: RawDoc, resolveUuid: UuidResolver): ClassFeature {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const uses = sys.uses as Record<string, unknown> | undefined;
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
    uses:
      uses && (uses.maxFormula != null || uses.per != null)
        ? {
            maxFormula: typeof uses.maxFormula === "string" ? uses.maxFormula : undefined,
            per: typeof uses.per === "string" ? uses.per : undefined,
          }
        : undefined,
    changes: normalizeChanges(sys.changes),
    grantsBuffs,
  };
}

/** Extract the `links.supplements` array off a raw doc's `system`, if present. */
function supplementsOf(sys: Record<string, unknown>): Record<string, unknown>[] {
  const links = sys.links as Record<string, unknown> | undefined;
  return Array.isArray(links?.supplements) ? (links!.supplements as Record<string, unknown>[]) : [];
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
