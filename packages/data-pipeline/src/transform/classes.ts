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
  descriptionValue,
  normalizeChanges,
  normalizeSources,
  normalizeUses,
  type UuidResolver,
} from "./common.js";

/** Transform a `class-abilities` pack entry (e.g. Rage). */
export function transformClassFeature(doc: RawDoc, resolveUuid: UuidResolver): ClassFeature {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
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
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: typeof sys.tag === "string" ? sys.tag : undefined,
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    abilityType: typeof sys.abilityType === "string" ? sys.abilityType : undefined,
    uses: normalizeUses(sys.uses),
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
  resolveUuid: UuidResolver,
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
