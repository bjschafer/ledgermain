/**
 * Assembles the roll-data context that formulas resolve `@paths` against, from a
 * character document + reference data. Mirrors the slice of Foundry's roll data
 * the observed formulas actually reference (abilities, class levels, skill ranks,
 * HD, caster level, armor type).
 */

import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import type { RollData } from "./formula.js";

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export interface AbilityView {
  base: number;
  total: number;
  mod: number;
}

/** Total character level (sum of class levels). */
export function totalLevel(doc: CharacterDoc): number {
  return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

/** Movement modes the engine tracks and exposes under `@attributes.speed.*`. */
const SPEED_MODES = ["land", "fly", "swim", "climb", "burrow"] as const;

/**
 * Build the roll-data context. If `abilities` is omitted, ability mods are
 * derived from the document's base scores (used for the bootstrap pass that
 * resolves ability-targeting changes, which are constant formulas in practice).
 *
 * If `speeds` is omitted, it defaults to the character's race base speeds
 * (`refData.races[doc.identity.race]?.speeds`, falling back to `{ land: 30 }`)
 * — i.e. PRE-buff, pre-additive-modifier speeds. This is deliberately the
 * simple choice (race base only, not race + passive `landSpeed`-style
 * bonuses): some vendored buffs (Slow, Debilitating Injury) author their
 * formulas against `@attributes.speed.<mode>.total`, and evaluating those
 * against the race baseline is enough to make them non-degenerate. Getting
 * passive bonuses folded in first would require an extra collect() pass
 * (collect → speeds → rollData → collect again) for a case the vendored data
 * doesn't currently exercise.
 */
export function buildRollData(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
  speeds?: Record<string, number>,
  bab?: number,
  encumbranceLevel?: 0 | 1 | 2,
): RollData {
  const level = totalLevel(doc);

  const abilityData: Record<string, AbilityView> = {};
  for (const id of ABILITY_IDS) {
    if (abilities) {
      abilityData[id] = abilities[id];
    } else {
      const base = doc.abilities[id] ?? 10;
      abilityData[id] = { base, total: base, mod: abilityMod(base) };
    }
  }

  const classes: Record<string, { level: number }> = {};
  let maxClassLevel = 0;
  for (const c of doc.identity.classes) {
    classes[c.tag] = { level: c.level };
    if (c.level > maxClassLevel) maxClassLevel = c.level;
  }

  const skills: Record<string, { rank: number }> = {};
  for (const [id, rank] of Object.entries(doc.build.skillRanks ?? {})) {
    skills[id] = { rank };
  }

  // Worn-armor weight class for `@armor.type` (0 none, 1 light, 2 med, 3 heavy).
  let armorType = 0;
  for (const item of doc.build.gear ?? []) {
    if (item.equipped && item.armor?.slot === "armor" && item.armor.type) {
      armorType = Math.max(armorType, item.armor.type);
    }
  }

  const baseSpeeds = speeds ?? refData.races[doc.identity.race]?.speeds ?? { land: 30 };
  const speedAttr: Record<string, { total: number }> = {};
  for (const mode of SPEED_MODES) {
    speedAttr[mode] = { total: baseSpeeds[mode] ?? 0 };
  }

  return {
    abilities: abilityData,
    classes,
    // `@class` is the "current class" context; defaults to the whole character
    // and is overridden per class-feature when its changes are evaluated.
    class: { level, unlevel: level },
    cl: maxClassLevel, // caster level (single-class assumption for Stage 2)
    skills,
    attributes: {
      hd: { total: level },
      bab: { total: bab ?? 0 },
      // Only wired to a real tier when `settings.encumbranceEnabled` is on
      // (issue #16) — see `compute.ts`; absent/off characters keep the
      // historical hardcoded 0 (no load ever gates a formula for them).
      encumbrance: { level: encumbranceLevel ?? 0 },
      speed: speedAttr,
    },
    armor: { type: armorType },
    item: { level: 0 },
    level,
  };
}
