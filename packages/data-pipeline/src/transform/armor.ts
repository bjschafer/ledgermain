import type { ArmorRef } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import { asNumber, asStringArray, normalizeSources } from "./common.js";

const ARMOR_WEIGHT: Record<string, ArmorRef["weightClass"]> = {
  lightArmor: 1,
  mediumArmor: 2,
  heavyArmor: 3,
};

/**
 * Transform a raw `armors-and-shields` pack document into a {@link ArmorRef}.
 * Mundane only — magical suits (`enh` / `aura` / `masterwork`) are filtered out
 * upstream in `normalize.ts`.
 */
export function transformArmor(doc: RawDoc): ArmorRef {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const armor = (sys.armor ?? {}) as Record<string, unknown>;
  const baseTypes = asStringArray(sys.baseTypes);
  const subType = str(sys.subType);
  const equipSub = str(sys.equipmentSubtype);
  const weight = readWeight(sys.weight);

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("armors-and-shields", doc._id),
    sources: normalizeSources(sys.sources),
    slot: subType === "shield" ? "shield" : "armor",
    ac: asNumber(armor.value) ?? 0,
    maxDex: asNumber(armor.dex),
    acp: asNumber(armor.acp),
    weightClass: equipSub ? (ARMOR_WEIGHT[equipSub] ?? undefined) : undefined,
    baseTypes: baseTypes.length > 0 ? baseTypes : undefined,
    proficiency: equipSub,
    price: asNumber(sys.price),
    weight,
  };
}

/**
 * True if a pack doc is the kind of "mundane base" we vendor: equipment entry,
 * an armor/shield subtype, and no magical markers. Folder entries have
 * `type: "Item"` and lack a meaningful `subType`, so they are excluded by the
 * subtype check.
 */
export function isMundaneArmor(doc: RawDoc): boolean {
  if (doc.type !== "equipment") return false;
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const subType = str(sys.subType);
  if (subType !== "armor" && subType !== "shield") return false;
  return !isMagical(sys);
}

function isMagical(sys: Record<string, unknown>): boolean {
  if (sys.masterwork === true) return true;
  if (sys.enh != null && Number(sys.enh) > 0) return true;
  const aura = sys.aura as Record<string, unknown> | undefined;
  if (aura && typeof aura.school === "string" && aura.school !== "") return true;
  return false;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function readWeight(v: unknown): number | undefined {
  if (!v || typeof v !== "object") return undefined;
  const w = v as Record<string, unknown>;
  return asNumber(w.value);
}
