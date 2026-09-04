import type { WeaponRef } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import { asNumber, asStringArray, normalizeSources, readPrice, readWeight } from "./common.js";

/** Weapon subtypes we vendor. Ammunition, siege, and magical excluded. */
const PROFICIENCIES = new Set(["simple", "martial", "exotic"]);

/**
 * Transform a raw `weapons-and-ammo` pack document into a {@link WeaponRef}.
 * Mundane only — named magical weapons (`magic-weapons/` folder) and ammo are
 * filtered out upstream in `normalize.ts`.
 */
export function transformWeapon(doc: RawDoc): WeaponRef {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const subType = str(sys.subType) ?? "";
  const action = pickAttackAction(sys.actions);

  const ability = (action?.ability ?? {}) as Record<string, unknown>;
  const actionType = str(action?.actionType);
  const range = action?.range as Record<string, unknown> | undefined;
  const rangeUnits = str(range?.units);
  const damageAbility = str(ability.damage);
  const weaponSubtype = str(sys.weaponSubtype);
  const baseTypes = asStringArray(sys.baseTypes);
  const weaponGroups = asStringArray(sys.weaponGroups);
  const ammo = (sys.ammo ?? {}) as Record<string, unknown>;

  // Pipeline-synthesized handedness subgroups of "firearms" — Foundry's own
  // weaponGroups vocabulary never splits firearms by hand count, but Musket
  // Training / Pistol Training-style category effects need to target exactly
  // that split. camelCase to match the vendored ("bladesHeavy") style; the
  // engine normalizes to kebab-case.
  const emittedWeaponGroups = weaponGroups.includes("firearms")
    ? [...weaponGroups, asNumber(sys.hands) === 2 ? "firearmsTwoHanded" : "firearmsOneHanded"]
    : weaponGroups;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("weapons-and-ammo", doc._id),
    sources: normalizeSources(sys.sources),
    damageDice: parseDamageDice(action?.damage),
    critRange: asNumber(ability.critRange) ?? undefined,
    critMult: asNumber(ability.critMult) ?? undefined,
    category: categoryOf(actionType, rangeUnits),
    attackAbility: actionType === "rwak" ? "dex" : "str",
    damageAbility: damageAbility === "str" ? "str" : "none",
    damageMultiplier: weaponSubtype === "2h" ? 1.5 : undefined,
    proficiency: subType,
    weaponGroups: emittedWeaponGroups.length > 0 ? emittedWeaponGroups : undefined,
    weaponSubtype,
    baseTypes: baseTypes.length > 0 ? baseTypes : undefined,
    group: slugifyBase(baseTypes[0]),
    price: readPrice(sys.price),
    weight: readWeight(sys.weight),
    rangeIncrement: rangeUnits === "ft" ? parsePositiveNumber(range?.value) : undefined,
    misfire: asNumber(ammo.misfire),
    capacity: asNumber(ammo.capacity),
    firearmEra: firearmEraOf(sys.tags),
  };
}

/** Leniently parses a plain positive number from an upstream field that's a string and sometimes empty/non-numeric. */
function parsePositiveNumber(value: unknown): number | undefined {
  const n = asNumber(value);
  return n !== undefined && n > 0 ? n : undefined;
}

/** Maps a weapon's "Early/Advanced/Modern Firearm" tag (if any) to its era. */
function firearmEraOf(tags: unknown): "early" | "advanced" | "modern" | undefined {
  const list = asStringArray(tags);
  if (list.includes("Early Firearm")) return "early";
  if (list.includes("Advanced Firearm")) return "advanced";
  if (list.includes("Modern Firearm")) return "modern";
  return undefined;
}

/** True if a pack doc is the kind of mundane base weapon we vendor. */
export function isMundaneWeapon(doc: RawDoc): boolean {
  if (doc.type !== "weapon") return false;
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const subType = str(sys.subType);
  if (!subType || !PROFICIENCIES.has(subType)) return false;
  return !isMagical(sys);
}

/* ----------------------------------------------------------- internals -- */

interface WeaponAction {
  _id?: string;
  name?: string;
  ability?: Record<string, unknown>;
  actionType?: string;
  damage?: {
    parts?: { formula?: string; types?: string[] }[];
    nonCritParts?: { formula?: string; types?: string[] }[];
  };
  range?: { units?: string; value?: string };
}

/**
 * Pick the action that describes the weapon's primary attack. Foundry stores
 * actions as an object keyed by random ids; the weapon's "Attack" entry (where
 * present) is the one with damage parts. Falls back to the first action.
 */
function pickAttackAction(actions: unknown): WeaponAction | undefined {
  const arr = recordToArray(actions) as WeaponAction[];
  if (arr.length === 0) return undefined;
  const byName = arr.find((a) => a.name === "Attack");
  if (byName) return byName;
  const withDamage = arr.find((a) => a.damage?.parts?.length);
  return withDamage ?? arr[0];
}

/** `sizeRoll(N, F, …)` or `NdM` (optionally followed by `+/-…`) → "N d F". */
function parseDamageDice(damage: WeaponAction["damage"]): string | undefined {
  const parts = damage?.parts ?? [];
  const formula = parts.find((p) => typeof p.formula === "string")?.formula;
  if (!formula) return undefined;

  // sizeRoll(N, F, ...) — args 1 and 2 are the dice count and faces.
  let m = /sizeRoll\(\s*(\d+)\s*,\s*(\d+)\s*,/i.exec(formula);
  if (m) return `${m[1]}d${m[2]}`;

  // Plain `NdM` (ignoring any added flat bonus, e.g. "1d6 + 3", "12d6+9").
  m = /(\d+)\s*d\s*(\d+)/i.exec(formula);
  if (m) return `${m[1]}d${m[2]}`;

  return undefined;
}

function categoryOf(
  actionType: string | undefined,
  rangeUnits: string | undefined,
): "melee" | "ranged" {
  if (rangeUnits === "melee" || rangeUnits === "reach") return "melee";
  if (
    rangeUnits === "ft" ||
    rangeUnits === "touch" ||
    rangeUnits === "close" ||
    rangeUnits === "medium" ||
    rangeUnits === "long"
  )
    return "ranged";
  if (actionType === "rwak") return "ranged";
  return "melee";
}

function isMagical(sys: Record<string, unknown>): boolean {
  if (sys.masterwork === true) return true;
  if (sys.enh != null && Number(sys.enh) > 0) return true;
  const aura = sys.aura as Record<string, unknown> | undefined;
  if (aura && typeof aura.school === "string" && aura.school !== "") return true;
  return false;
}

/** Slug a base-type label for the per-weapon feat-routing group. */
function slugifyBase(base?: string): string | undefined {
  if (!base) return undefined;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Foundry stores collections as objects keyed by random ids; coerce to array. */
function recordToArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v))
    return v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
  if (v && typeof v === "object")
    return Object.values(v).filter(
      (x): x is Record<string, unknown> => typeof x === "object" && x !== null,
    );
  return [];
}
