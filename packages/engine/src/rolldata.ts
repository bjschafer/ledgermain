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

/**
 * Build the roll-data context. If `abilities` is omitted, ability mods are
 * derived from the document's base scores (used for the bootstrap pass that
 * resolves ability-targeting changes, which are constant formulas in practice).
 */
export function buildRollData(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
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
      encumbrance: { level: 0 },
    },
    armor: { type: armorType },
    item: { level: 0 },
    level,
  };
}
