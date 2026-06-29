import type {
  BabTier,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  SaveTier,
} from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid, parseUuid } from "../util/uuid.js";
import {
  asNumber,
  asStringArray,
  normalizeChanges,
  normalizeSources,
} from "./common.js";

function descValue(sys: Record<string, unknown>): string | undefined {
  const d = sys.description as Record<string, unknown> | undefined;
  return typeof d?.value === "string" ? d.value : undefined;
}

/** Transform a `class-abilities` pack entry (e.g. Rage). */
export function transformClassFeature(doc: RawDoc): ClassFeature {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const uses = sys.uses as Record<string, unknown> | undefined;
  const links = sys.links as Record<string, unknown> | undefined;
  const supplements = Array.isArray(links?.supplements)
    ? (links!.supplements as Record<string, unknown>[])
    : [];
  const grantsBuffs = supplements
    .map((s) => (typeof s.uuid === "string" ? s.uuid : null))
    .filter((u): u is string => u !== null);

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descValue(sys),
    sources: normalizeSources(sys.sources),
    tag: typeof sys.tag === "string" ? sys.tag : undefined,
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    abilityType: typeof sys.abilityType === "string" ? sys.abilityType : undefined,
    uses:
      uses && (uses.maxFormula != null || uses.per != null)
        ? {
            maxFormula:
              typeof uses.maxFormula === "string" ? uses.maxFormula : undefined,
            per: typeof uses.per === "string" ? uses.per : undefined,
          }
        : undefined,
    changes: normalizeChanges(sys.changes),
    grantsBuffs,
  };
}

/**
 * Transform a class. `links.supplements` UUIDs are resolved against the provided
 * resolver into `ClassFeatureGrant`s tagged by level. Unresolvable links are kept
 * with `resolved: false` so nothing is silently dropped.
 */
export function transformClass(
  doc: RawDoc,
  resolveFeatureName: (id: string) => string | null,
): Class {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const saves = (sys.savingThrows ?? {}) as Record<string, { value?: unknown }>;
  const links = sys.links as Record<string, unknown> | undefined;
  const supplements = Array.isArray(links?.supplements)
    ? (links!.supplements as Record<string, unknown>[])
    : [];

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

  const saveTier = (k: string): SaveTier =>
    (saves[k]?.value === "high" ? "high" : "low") as SaveTier;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("classes", doc._id),
    description: descValue(sys),
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
