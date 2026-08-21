/**
 * Clean-room monster-template definitions: declarative `AdjustOp` lists
 * authored from the published Pathfinder 1e rules text (Pathfinder RPG
 * Bestiary, Bestiary 2, and the Core Rulebook), not from any Foundry system
 * source. Each template's doc comment quotes the load-bearing rebuild-rules
 * language it was authored from, cross-checked against the Archives of
 * Nethys (aonprd.com) and the OGL d20pfsrd mirror where AoN's renderer
 * elided the rules table.
 *
 * `key` matches the corresponding id in
 * `packages/data-pipeline/data/monster-templates.json` for every template
 * that has a vendored counterpart (all seven here do).
 */

import type { AdjustOp, StatblockAdjustment } from "./types.js";

/** Rebuild-rules senses grant shared by all four "outer plane" simple templates. */
const DARKVISION_60: AdjustOp = {
  kind: "appendLine",
  field: "senses",
  text: "darkvision 60 ft.",
  skipIfPresent: "darkvision",
};

/** SR = new CR + 5, shared by all four "outer plane" simple templates. */
const SR_FROM_CR_PLUS_5: AdjustOp = { kind: "srFromCr", delta: 5 };

/** CR +0 at HD 1-4, +1 at HD 5+, shared by all four "outer plane" simple templates. */
const OUTER_PLANE_CR_TIERS: AdjustOp = {
  kind: "crTiers",
  tiers: [
    { minHd: 1, value: 0 },
    { minHd: 5, value: 1 },
  ],
};

const OUTER_PLANE_NOTES = [
  "Skill modifiers and special ability DCs are not adjusted.",
  "The smite ability is appended as descriptive text only; it does not modify the creature's attack or damage lines.",
];

/**
 * Celestial creature (simple template). Pathfinder RPG Bestiary.
 *
 * "A celestial creature's CR increases by +1 only if the base creature has
 * 5 or more HD." Rebuild rules: "Senses gains darkvision 60 ft.; Defensive
 * Abilities gains DR and energy resistance as noted on the table; SR gains
 * SR equal to new CR +5; Special Attacks smite evil 1/day as a swift action
 * (adds Cha bonus to attack rolls and damage bonus equal to HD against evil
 * foes; smite persists until target is dead or the celestial creature
 * rests)." Defense table: HD 1-4 resist acid/cold/electricity 5, no DR;
 * HD 5-10 resist 10, DR 5/evil; HD 11+ resist 15, DR 10/evil.
 * Confirmed against aonprd.com (WebFetch of legacy.aonprd.com/bestiary
 * /monsterAdvancement.html and the d20pfsrd Celestial Creature template
 * page, which mirrors the OGL Bestiary text verbatim including the table).
 */
const CELESTIAL: StatblockAdjustment = {
  key: "celestial",
  label: "Celestial Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "resistTiers",
      energies: ["acid", "cold", "electricity"],
      tiers: [
        { minHd: 1, value: 5 },
        { minHd: 5, value: 10 },
        { minHd: 11, value: 15 },
      ],
    },
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/evil" },
        { minHd: 11, value: "10/evil" },
      ],
    },
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite evil 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against evil foes; persists until the target is dead or the creature rests).",
    },
    OUTER_PLANE_CR_TIERS,
  ],
  notes: OUTER_PLANE_NOTES,
};

/**
 * Fiendish creature (simple template). Pathfinder RPG Bestiary.
 *
 * The mirror of the celestial creature template: "A fiendish creature's CR
 * increases by +1 only if the base creature has 5 or more HD." Rebuild
 * rules: "Senses gains darkvision 60 ft.; Defensive Abilities gains DR and
 * energy resistance as noted on the table; SR gains SR equal to new CR +5;
 * Special Attacks smite good 1/day as a swift action (adds Cha bonus to
 * attack rolls and damage bonus equal to HD against good foes; smite
 * persists until target is dead or the fiendish creature rests)." Defense
 * table: HD 1-4 resist cold/fire 5, no DR; HD 5-10 resist 10, DR 5/good;
 * HD 11+ resist 15, DR 10/good. Confirmed against the vendored pfdata
 * Bestiary text, which reproduces the same table shape verified for the
 * celestial creature template above.
 */
const FIENDISH: StatblockAdjustment = {
  key: "fiendish",
  label: "Fiendish Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "resistTiers",
      energies: ["cold", "fire"],
      tiers: [
        { minHd: 1, value: 5 },
        { minHd: 5, value: 10 },
        { minHd: 11, value: 15 },
      ],
    },
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/good" },
        { minHd: 11, value: "10/good" },
      ],
    },
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite good 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against good foes; persists until the target is dead or the creature rests).",
    },
    OUTER_PLANE_CR_TIERS,
  ],
  notes: OUTER_PLANE_NOTES,
};

/**
 * Entropic creature (simple template). Pathfinder RPG Bestiary 2.
 *
 * "Creatures with the entropic template live in planes where chaos is
 * paramount... An entropic creature's CR increases by +1 only if the base
 * creature has 5 or more HD." Rebuild rules grant darkvision 60 ft., DR and
 * energy resistance per the table, SR equal to new CR +5, and "smite law
 * 1/day as a swift action (adds Cha bonus to attack rolls and damage bonus
 * equal to HD against lawful foes; smite persists until the target is dead
 * or the entropic creature rests)." Defense table: HD 1-4 resist acid/fire
 * 5, no DR; HD 5-10 resist 10, DR 5/lawful; HD 11+ resist 15, DR 10/lawful.
 * Confirmed against the d20pfsrd Entropic Creature template page (Bestiary
 * 2), which lists the same acid/fire resistance and lawful-bypass DR table.
 */
const ENTROPIC: StatblockAdjustment = {
  key: "entropic",
  label: "Entropic Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "resistTiers",
      energies: ["acid", "fire"],
      tiers: [
        { minHd: 1, value: 5 },
        { minHd: 5, value: 10 },
        { minHd: 11, value: 15 },
      ],
    },
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/lawful" },
        { minHd: 11, value: "10/lawful" },
      ],
    },
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite law 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against lawful foes; persists until the target is dead or the creature rests).",
    },
    OUTER_PLANE_CR_TIERS,
  ],
  notes: OUTER_PLANE_NOTES,
};

/**
 * Resolute creature (simple template). Pathfinder RPG Bestiary 2.
 *
 * "Creatures with the resolute template live in planes where law is
 * paramount... A resolute creature's CR increases by +1 only if the base
 * creature has 5 or more HD." Rebuild rules grant darkvision 60 ft., DR and
 * energy resistance per the table, SR equal to new CR +5, and "smite chaos
 * 1/day as a swift action (adds Cha bonus to attack rolls and damage bonus
 * equal to HD against chaotic foes; smite persists until target is dead or
 * the resolute creature rests)." Defense table: HD 1-4 resist acid, cold,
 * and fire 5, no DR; HD 5-10 resist 10, DR 5/chaotic; HD 11+ resist 15, DR
 * 10/chaotic (note: three resisted energies, not two, unlike the other
 * three outer-plane templates). Confirmed against the d20pfsrd Resolute
 * Creature template page (Bestiary 2), which lists the same acid/cold/fire
 * resistance and chaotic-bypass DR table.
 */
const RESOLUTE: StatblockAdjustment = {
  key: "resolute",
  label: "Resolute Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "resistTiers",
      energies: ["acid", "cold", "fire"],
      tiers: [
        { minHd: 1, value: 5 },
        { minHd: 5, value: 10 },
        { minHd: 11, value: 15 },
      ],
    },
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/chaotic" },
        { minHd: 11, value: "10/chaotic" },
      ],
    },
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite chaos 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against chaotic foes; persists until the target is dead or the creature rests).",
    },
    OUTER_PLANE_CR_TIERS,
  ],
  notes: OUTER_PLANE_NOTES,
};

/**
 * Advanced creature (simple template). Pathfinder RPG Bestiary, CR +1.
 *
 * Rebuild rules: "AC increase natural armor by +2; Ability Scores +4 to all
 * ability scores (except Int scores of 2 or less)." Confirmed against the
 * d20pfsrd Advanced Creature template page, which quotes the identical
 * rebuild-rules sentence.
 */
const ADVANCED: StatblockAdjustment = {
  key: "advanced",
  label: "Advanced Creature",
  ops: [
    { kind: "naturalArmor", delta: 2 },
    {
      kind: "ability",
      deltas: { str: 4, dex: 4, con: 4, int: 4, wis: 4, cha: 4 },
    },
    { kind: "crTiers", tiers: [{ minHd: 1, value: 1 }] },
  ],
  notes: [
    "Does not apply the published exception that skips the Intelligence increase for a base creature with an Int score of 2 or less; reduce Int by hand for such creatures.",
    "Skill modifiers and special ability DCs are not adjusted beyond what recomputing from the new ability scores produces.",
  ],
};

/**
 * Giant creature (simple template). Pathfinder RPG Bestiary, CR +1.
 * "This template cannot be applied to creatures that are Colossal."
 *
 * Rebuild rules: "Size increase by one category; AC increase natural armor
 * by +3; Attacks increase dice rolled by one step; Ability Scores +4 size
 * bonus to Str and Con, -2 Dex." Confirmed against the d20pfsrd Giant
 * Creature template page, which quotes the identical rebuild-rules
 * sentence.
 */
const GIANT: StatblockAdjustment = {
  key: "giant",
  label: "Giant Creature",
  ops: [
    { kind: "sizeStep", delta: 1 },
    { kind: "naturalArmor", delta: 3 },
    { kind: "ability", deltas: { str: 4, con: 4, dex: -2 } },
    { kind: "crTiers", tiers: [{ minHd: 1, value: 1 }] },
  ],
  notes: [
    "Cannot be applied to a Colossal base creature; the rules give no larger size step to grow into.",
    "Skills that scale with size (Fly, Stealth) and carrying capacity are not adjusted.",
  ],
};

/**
 * Young creature (simple template). Pathfinder RPG Bestiary, CR -1.
 * "This template cannot be applied to creatures that increase in power
 * through aging or feeding (such as dragons or barghests) or creatures
 * that are Fine-sized."
 *
 * Rebuild rules: "Size decrease by one category; AC reduce natural armor by
 * -2 (minimum +0); Attacks decrease damage dice by one step; Ability Scores
 * -4 Strength, -4 Con, +4 size bonus to Dex." Confirmed against the
 * d20pfsrd Young Creature template page, which quotes the identical
 * rebuild-rules sentence.
 */
const YOUNG: StatblockAdjustment = {
  key: "young",
  label: "Young Creature",
  ops: [
    { kind: "sizeStep", delta: -1 },
    { kind: "naturalArmor", delta: -2 },
    { kind: "ability", deltas: { str: -4, con: -4, dex: 4 } },
    { kind: "crTiers", tiers: [{ minHd: 1, value: -1 }] },
  ],
  notes: [
    "Cannot be applied to a Fine-sized base creature, or to a creature that ages or feeds into a more powerful form (dragons, barghests).",
    "Does not enforce the published minimum-+0 floor on natural armor; if the base creature's natural armor bonus is already 0 or 1, apply the reduction by hand instead.",
    "Skills that scale with size (Fly, Stealth) and carrying capacity are not adjusted.",
  ],
};

export const STATBLOCK_TEMPLATES: readonly StatblockAdjustment[] = [
  CELESTIAL,
  FIENDISH,
  ENTROPIC,
  RESOLUTE,
  ADVANCED,
  GIANT,
  YOUNG,
];

/** The four simple templates the rules describe as summonable via summon monster / planar ally spells. */
export const SUMMON_TEMPLATE_KEYS: readonly string[] = [
  CELESTIAL.key,
  FIENDISH.key,
  ENTROPIC.key,
  RESOLUTE.key,
];

/**
 * Augment Summoning (feat, not a template). Pathfinder RPG Core Rulebook,
 * pg. 118. Prerequisite: Spell Focus (conjuration).
 *
 * "Benefit: Each creature you conjure with any summon spell gains a +4
 * enhancement bonus to Strength and Constitution for the duration of the
 * spell that summoned it." Confirmed via aonprd.com FeatDisplay for
 * Augment Summoning.
 */
export const AUGMENT_SUMMONING: StatblockAdjustment = {
  key: "augment-summoning",
  label: "Augment Summoning",
  ops: [{ kind: "ability", deltas: { str: 4, con: 4 } }],
  notes: [
    "Applies only to creatures you summon with conjuration (summoning) spells, and only for the duration of the spell that summoned them.",
    "Requires Spell Focus (conjuration) as a prerequisite; this adjustment does not check for it.",
  ],
};

export function statblockTemplate(key: string): StatblockAdjustment | undefined {
  if (key === AUGMENT_SUMMONING.key) {
    return AUGMENT_SUMMONING;
  }
  return STATBLOCK_TEMPLATES.find((template) => template.key === key);
}
