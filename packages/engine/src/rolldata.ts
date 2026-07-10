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

  // `baseMod` mirrors Foundry's `@abilities.<id>.baseMod` — the modifier from
  // the BASE score alone, unaffected by enhancement/buff bonuses folded into
  // `mod`/`total`. Not part of `AbilityView` (nothing else in the engine
  // reads it) — added only on this roll-data copy for the handful of feat
  // formulas that reference it (e.g. Combat Vigor's `@abilities.con.baseMod`
  // uses/day pool, see `resources.ts`'s `deriveFeatResourcePools`).
  const rollAbilities: Record<string, AbilityView & { baseMod: number }> = {};
  for (const id of ABILITY_IDS) {
    // `abilities` is sometimes a deliberately PARTIAL map in tests (only the
    // ability a fixture cares about) — falling back to the document's base
    // score for anything missing keeps that tolerant, same as `resolvePath`
    // treating an absent `@abilities.<id>` path as 0 rather than throwing.
    const resolved: AbilityView = abilities?.[id] ?? {
      base: doc.abilities[id] ?? 10,
      total: doc.abilities[id] ?? 10,
      mod: abilityMod(doc.abilities[id] ?? 10),
    };
    rollAbilities[id] = { ...resolved, baseMod: abilityMod(resolved.base) };
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
    abilities: rollAbilities,
    classes,
    // `@class` is the "current class" context; defaults to the whole character
    // and is overridden per class-feature when its changes are evaluated.
    class: { level, unlevel: level },
    // Caster level (single-class assumption for Stage 2). Issue #66 chunk 2
    // (prestige casting advancement): `buildRollData` takes no `refData`
    // parameter and can't cheaply gain one just for this, so `@cl` does NOT
    // account for a prestige class's `castingAdvancement` bonus the way
    // `apps/web/src/model/casterLevel.ts`'s `effectiveCasterClassLevel` does
    // — a Wizard 5 / Eldritch Knight 1 with an EK slot targeting wizard reads
    // `@cl` = 5 here, not the effective 6 that module and the UI display. In
    // practice this doesn't yet miscompute any vendored formula: the
    // builder's class picker doesn't expose prestige classes yet (chunk 2
    // wires the math, not the UI — see
    // `apps/web/src/components/builder/ClassesSection.tsx`), so no document
    // can reach this divergence today. Revisit once chunk 3 makes prestige
    // classes selectable.
    cl: maxClassLevel,
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
