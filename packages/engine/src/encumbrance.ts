/**
 * Carrying capacity / encumbrance (issue #16) — an OPTIONAL PF1 rule (gated by
 * `build.settings.encumbranceEnabled`, absent = off, same posture as
 * `settings.xpEnabled`). The carrying-capacity table, size multipliers, and
 * load-tier thresholds are hand-authored clean-room from the published PF1
 * CRB "Table: Carrying Capacity" and "Table: Speed" (Open Game Content /
 * Paizo Community Use — see DESIGN.md §6); the load-tier gating
 * (`@attributes.encumbrance.level`) is likewise not something Foundry's own
 * system computes numerically. `carryAdjustments`'s `carryStr`/`carryMult`
 * combination rule is the one piece here cross-checked against Foundry's GPL
 * `apply-changes.mjs`/`base-character-model.mjs` as a behavioral oracle only
 * (output comparison, not ported code or structure — see NOTICE.md §1) to
 * pin down semantics the published CRB text doesn't spell out for temporary
 * size-change spells.
 */

import type {
  CharacterDoc,
  DerivedEncumbrance,
  ItemInstance,
  LoadTier,
  RefData,
  SizeId,
} from "@pf1/schema";

import { forTarget, type CollectedModifier } from "./collect.js";

/* -------------------------------------------------------- carrying capacity */

/**
 * PF1 CRB "Table: Carrying Capacity", rows 1–29: `[light, medium, heavy]`
 * maximum weight in pounds for a Strength score equal to the row's 1-based
 * index. Each value is the ceiling of that tier ("up to N lb." — RAW: a
 * weight exactly at a threshold is still the lighter tier, never the
 * heavier one). Rows 21–29 ("tremendous Strength") are the CRB's own
 * extension of the base 1–20 table, cross-checked against the published
 * rule below for consistency (values may differ from a naive ×4-of-the-
 * matching-digit-row computation by rounding, matching the officially
 * printed table).
 */
const CARRYING_CAPACITY: readonly (readonly [number, number, number])[] = [
  [3, 6, 10], // 1
  [6, 13, 20], // 2
  [10, 20, 30], // 3
  [13, 26, 40], // 4
  [16, 33, 50], // 5
  [20, 40, 60], // 6
  [23, 46, 70], // 7
  [26, 53, 80], // 8
  [30, 60, 90], // 9
  [33, 66, 100], // 10
  [38, 76, 115], // 11
  [43, 86, 130], // 12
  [50, 100, 150], // 13
  [58, 116, 175], // 14
  [66, 133, 200], // 15
  [76, 153, 230], // 16
  [86, 173, 260], // 17
  [100, 200, 300], // 18
  [116, 233, 350], // 19
  [133, 266, 400], // 20
  [153, 306, 460], // 21
  [173, 346, 520], // 22
  [200, 400, 600], // 23
  [233, 466, 700], // 24
  [266, 533, 800], // 25
  [306, 613, 920], // 26
  [346, 693, 1040], // 27
  [400, 800, 1200], // 28
  [466, 933, 1400], // 29
];

/**
 * Carrying-capacity ceilings (light/medium/heavy, in pounds) for a Medium
 * creature with `strScore` Strength, BEFORE any size multiplier. Str scores
 * ≤0 are clamped to 1 (a helpless character isn't a meaningful carrying-
 * capacity edge case). Str scores above 29 use the CRB's own rule: "find the
 * Strength score between 20 and 29 that has the same number in the 'ones'
 * digit ... and multiply the numbers in that row by 4 for every 10 points
 * the creature's Strength is above the score for that row."
 */
export function carryingCapacity(strScore: number): {
  light: number;
  medium: number;
  heavy: number;
} {
  const str = Math.max(1, Math.round(strScore));
  if (str <= 29) {
    const [light, medium, heavy] = CARRYING_CAPACITY[str - 1]!;
    return { light, medium, heavy };
  }
  const digit = str % 10;
  const base = 20 + digit; // 20-29, same ones digit as `str`
  const tens = Math.round((str - base) / 10);
  const multiplier = 4 ** tens;
  const [light, medium, heavy] = CARRYING_CAPACITY[base - 1]!;
  return { light: light * multiplier, medium: medium * multiplier, heavy: heavy * multiplier };
}

/**
 * Size multiplier applied to carrying-capacity ceilings (PF1 CRB): Small ×¾,
 * Large ×2. Only these two are modeled in v1 — Tiny/Huge/etc. and quadruped-
 * specific multipliers are a documented gap (the vendored race sizes the app
 * actually uses in practice are overwhelmingly Small/Medium/Large).
 */
export function sizeCarryingMultiplier(size: SizeId): number {
  if (size === "sm") return 0.75;
  if (size === "lg") return 2;
  return 1;
}

/**
 * Light/medium/heavy weight ceilings (pounds) for `strScore` Strength and
 * `size`, with the size multiplier applied and each result floored to a whole
 * pound (PF1 RAW: round down).
 *
 * `carryStrDelta`/`carryMultiplier` fold in the `carryStr`/`carryMult` Change
 * targets (Ant Haul, masterwork backpack, Enlarge/Reduce Person, ...) — see
 * `carryAdjustments`'s doc comment for where they come from and why they're
 * separate from `strScore`/`size` rather than pre-baked into them.
 */
export function loadThresholds(
  strScore: number,
  size: SizeId = "med",
  carryStrDelta = 0,
  carryMultiplier = 1,
): { light: number; medium: number; heavy: number } {
  const cap = carryingCapacity(strScore + carryStrDelta);
  const mult = sizeCarryingMultiplier(size) * carryMultiplier;
  return {
    light: Math.floor(cap.light * mult),
    medium: Math.floor(cap.medium * mult),
    heavy: Math.floor(cap.heavy * mult),
  };
}

/**
 * Which load tier `weight` pounds falls into for `strScore` Strength and
 * `size`. "up to" a threshold is the lighter tier (PF1 RAW); weight beyond
 * the heavy ceiling ("overloaded" — can't move at all under strict RAW) is
 * NOT modeled as a distinct state in v1 and is reported as `"heavy"`.
 */
export function loadTier(
  weight: number,
  strScore: number,
  size: SizeId = "med",
  carryStrDelta = 0,
  carryMultiplier = 1,
): LoadTier {
  const { light, medium } = loadThresholds(strScore, size, carryStrDelta, carryMultiplier);
  if (weight <= light) return "light";
  if (weight <= medium) return "medium";
  return "heavy";
}

/** Maps a {@link LoadTier} to Foundry's `@attributes.encumbrance.level` convention (0/1/2). */
export function encumbranceLevelFor(tier: LoadTier): 0 | 1 | 2 {
  return tier === "light" ? 0 : tier === "medium" ? 1 : 2;
}

/** RAW max Dexterity bonus to AC for a load tier; `undefined` at light load (no load-based cap). */
export function loadMaxDexCap(tier: LoadTier): number | undefined {
  if (tier === "medium") return 3;
  if (tier === "heavy") return 1;
  return undefined;
}

/** RAW armor check penalty contributed by a load tier alone (0 / -3 / -6). */
export function loadAcp(tier: LoadTier): number {
  if (tier === "medium") return -3;
  if (tier === "heavy") return -6;
  return 0;
}

/** Display label for provenance chips ("Medium load" / "Heavy load"). */
export function loadTierLabel(tier: LoadTier): string {
  return tier === "medium" ? "Medium load" : tier === "heavy" ? "Heavy load" : "Light load";
}

/* --------------------------------------------------------------- speed ---- */

/**
 * PF1 CRB "Table: Speed" (reduced speed under a medium/heavy load, or when
 * wearing medium/heavy armor) — `[minBase, maxBase, reduced]` ranges,
 * hand-authored clean-room from the published rule.
 */
const ENCUMBERED_SPEED_RANGES: readonly (readonly [number, number, number])[] = [
  [5, 5, 5],
  [10, 15, 10],
  [20, 20, 15],
  [25, 30, 20],
  [35, 35, 25],
  [40, 45, 30],
  [50, 50, 35],
  [55, 60, 40],
  [65, 65, 45],
  [70, 75, 50],
  [80, 80, 55],
  [85, 90, 60],
  [95, 95, 65],
  [100, 105, 70],
  [110, 110, 75],
  [115, 120, 80],
];

/**
 * Reduced land speed for `base` feet under a medium or heavy load. Speeds
 * outside the tabled 5–120 ft range extrapolate at the ~2:3 ratio the table
 * converges to (not a normal PF1 PC speed, but avoids a cliff-edge no-op).
 */
export function encumberedSpeed(base: number): number {
  if (base <= 0) return base;
  for (const [min, max, reduced] of ENCUMBERED_SPEED_RANGES) {
    if (base >= min && base <= max) return reduced;
  }
  if (base > 120) return Math.floor((base * 2) / 3 / 5) * 5;
  return base;
}

/* -------------------------------------------------------- carried weight -- */

/**
 * Per-instance unit weight, in pounds, resolved the same way for gear rows and
 * the engine total. An explicit `weight` on the instance always wins: it's what
 * the player typed into the gear editor, and a hand-corrected weight must beat
 * whatever the vendored item or armor snapshot says.
 */
export function gearUnitWeight(inst: ItemInstance, refData: RefData): number {
  if (inst.weight != null) return inst.weight;
  if (inst.itemId) return refData.items[inst.itemId]?.weight ?? 0;
  if (inst.armor) return inst.armor.weight ?? 0;
  return 0;
}

/**
 * Total carried weight in pounds: every `build.gear` entry's unit weight ×
 * quantity (regardless of `equipped` — an item in the backpack still weighs
 * you down), plus every `build.weapons` entry's weight (weapons have no
 * quantity field; each entry is one physical weapon). Independent of
 * `collectModifiers` — purely a sum over the document's own gear/weapon data.
 */
export function totalCarriedWeight(doc: CharacterDoc, refData: RefData): number {
  let total = 0;
  for (const inst of doc.build.gear ?? []) {
    total += gearUnitWeight(inst, refData) * (inst.quantity ?? 1);
  }
  for (const w of doc.build.weapons ?? []) {
    total += w.weight ?? 0;
  }
  return total;
}

/**
 * Net carrying-capacity adjustment from `carryStr`/`carryMult` Change targets
 * (Ant Haul, masterwork backpack, traits, Enlarge/Reduce Person). Both stack
 * additively across sources — Foundry's own semantics (`carryStr`/`carryMult`
 * are always-untyped targets, confirmed against `apply-changes.mjs`), not a
 * guess: `carryStr` sums onto the character's Strength score before the carry
 * table lookup (e.g. masterwork backpack's `+1` is a flat effective-Str
 * bonus), and `carryMult` sums onto a base multiplier of `1` (Ant Haul's
 * vendored `+2` therefore yields a total multiplier of `1 + 2 = 3`, an exact
 * match for its RAW "carrying capacity triples" — no correction needed).
 *
 * Enlarge/Reduce Person's `carryStr ∓2`/`carryMult ∓0.5` are NOT a pipeline
 * artifact to strip: they are a deliberate offset (see each buff's own
 * description, "partially accounting for your gear not changing in size")
 * against the size-category multiplier and the size-typed Str bonus the SAME
 * spell also grants — both of which flow into carrying capacity through the
 * ordinary size/Str paths below. Consuming carryStr/carryMult here (rather
 * than stripping them) is what keeps a spell-enlarged character's carrying
 * capacity close to its pre-spell value instead of jumping by a full size
 * category on top of the size bonus to Strength, which no published ruling
 * supports and which the Foundry-authored numbers were explicitly tuned to
 * avoid.
 */
export function carryAdjustments(collected: CollectedModifier[]): {
  strDelta: number;
  multiplier: number;
} {
  const strDelta = forTarget(collected, "carryStr").reduce((s, m) => s + m.value, 0);
  const multiplierDelta = forTarget(collected, "carryMult").reduce((s, m) => s + m.value, 0);
  return { strDelta, multiplier: 1 + multiplierDelta };
}

/**
 * Full encumbrance computation for `compute()` — only called when
 * `settings.encumbranceEnabled` is true. `strScore` should be the character's
 * (post racial/item/buff) Strength total; `size` is the character's effective
 * size category (post size-shift/polymorph, same value `compute()` uses for
 * AC/attack); `carry` is `carryAdjustments`'s result, or omitted for none.
 */
export function computeEncumbrance(
  doc: CharacterDoc,
  refData: RefData,
  strScore: number,
  size: SizeId,
  carry?: { strDelta: number; multiplier: number },
): DerivedEncumbrance {
  const carryStrDelta = carry?.strDelta ?? 0;
  const carryMultiplier = carry?.multiplier ?? 1;
  const totalWeight = totalCarriedWeight(doc, refData);
  const tier = loadTier(totalWeight, strScore, size, carryStrDelta, carryMultiplier);
  return {
    totalWeight,
    strScore,
    thresholds: loadThresholds(strScore, size, carryStrDelta, carryMultiplier),
    tier,
    maxDexCap: loadMaxDexCap(tier),
    acp: loadAcp(tier),
    speedPenalty: tier !== "light",
  };
}
