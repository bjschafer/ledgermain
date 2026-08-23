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
 * that has a vendored counterpart (all fourteen here do).
 */

import type { AdjustOp, StatblockAdjustment } from "./types.js";

/** Rebuild-rules senses grant shared by all four "outer plane" simple templates. */
const DARKVISION_60: AdjustOp = {
  kind: "appendLine",
  field: "senses",
  text: "darkvision 60 ft.",
  skipIfPresent: "darkvision",
};

/**
 * SR = new CR + 5. Ops apply in order, so every template lists this AFTER its
 * CR-adjusting op; putting it first would compute SR off the pre-template CR.
 */
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
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite evil 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against evil foes; persists until the target is dead or the creature rests).",
    },
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
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite good 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against good foes; persists until the target is dead or the creature rests).",
    },
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
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite law 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against lawful foes; persists until the target is dead or the creature rests).",
    },
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
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite chaos 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against chaotic foes; persists until the target is dead or the creature rests).",
    },
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
      except: { ability: "int", atMost: 2 },
    },
    { kind: "crTiers", tiers: [{ minHd: 1, value: 1 }] },
  ],
  notes: [
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
    "Fly and Stealth are shifted for the size change only, not for the Dexterity change; carrying capacity is not adjusted.",
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
    "Fly and Stealth are shifted for the size change only, not for the Dexterity change; carrying capacity is not adjusted.",
  ],
};

/**
 * Counterpoised creature (simple template). Pathfinder Player Companion:
 * Champions of Balance, pg. 33 (sidebar to the Summon Neutral Monster feat).
 *
 * "Counterpoised creatures dwell in the Outer Planes where balance between
 * elements or ideologies is paramount, but they can be summoned using
 * spells such as summon monster and planar ally. A counterpoised creature's
 * CR increases by 1 only if the base creature has 5 or more Hit Dice."
 * Rebuild rules: "Senses gains darkvision 60 ft.; Defensive Abilities gains
 * DR and energy resistance as noted on the table; SR gains SR equal to new
 * CR +5; Special Attacks smite bias 1/day as a swift action (adds Cha bonus
 * to attack rolls and damage bonus equal to HD against a foe that is chaotic
 * evil, chaotic good, lawful evil, or lawful good; smite persists until the
 * target is dead or the counterpoised creature rests)." Defense table: HD
 * 1-4 resist cold/electricity/fire 5, no DR; HD 5-10 resist 10, DR
 * 5/adamantine; HD 11+ resist 15, DR 10/adamantine. Confirmed against
 * aonprd.com's reproduction on the Summon Neutral Monster feat page and the
 * vendored template prose.
 */
const COUNTERPOISED: StatblockAdjustment = {
  key: "counterpoised",
  label: "Counterpoised Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "resistTiers",
      energies: ["cold", "electricity", "fire"],
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
        { minHd: 5, value: "5/adamantine" },
        { minHd: 11, value: "10/adamantine" },
      ],
    },
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
    {
      kind: "appendLine",
      field: "specialAttacks",
      text: "smite bias 1/day (swift action; adds {chaMod} to attack rolls and {hd} to damage rolls against a chaotic evil, chaotic good, lawful evil, or lawful good foe; persists until the target is dead or the creature rests).",
    },
  ],
  notes: OUTER_PLANE_NOTES,
};

/** The Versatile Summon Monster / Versatile Summon Nature's Ally elemental-plane templates share one defense ladder. */
const PLANAR_DR_TIERS: AdjustOp = {
  kind: "drTiers",
  tiers: [
    { minHd: 1, value: null },
    { minHd: 5, value: "3/-" },
    { minHd: 11, value: "5/-" },
  ],
};

function planarResist(energy: string): AdjustOp {
  return {
    kind: "resistTiers",
    energies: [energy],
    tiers: [
      { minHd: 1, value: 10 },
      { minHd: 5, value: 15 },
      { minHd: 11, value: 20 },
    ],
  };
}

function planarRider(energy: string): AdjustOp {
  return {
    kind: "attackRider",
    scope: "natural",
    tiers: [
      { minHd: 1, value: `1 ${energy}` },
      { minHd: 5, value: `1d6 ${energy}` },
      { minHd: 11, value: `2d6 ${energy}` },
    ],
  };
}

const METAL_WEAPONS_NOTE =
  "Bonus energy damage is added to natural attacks only; the base creature's metal manufactured weapons also deal it, add that by hand.";
const PLANAR_GATE_NOTE =
  "Can be applied only to a non-outsider without the air, cold, earth, fire, or water subtype.";

/**
 * Aerial creature (simple template). Pathfinder Player Companion: Monster
 * Summoner's Handbook, pg. 18 (Simple Summoning Templates). Requires
 * Versatile Summon Monster / Versatile Summon Nature's Ally.
 *
 * "This template can be applied only to a non-outsider with none of the
 * subtypes that follow: air, cold, earth, fire, or water. An aerial
 * creature's CR increases by 1 only if the base creature has 5 or more HD."
 * Rebuild rules: "Type gains the air subtype; Senses gains darkvision 60
 * ft.; Defensive Abilities gains DR and resistance to electricity as noted
 * on the table below; Speed gains a fly speed equal to its highest speed
 * with perfect maneuverability (maximum fly speed of 10 feet per HD);
 * Attacks gains bonus electricity damage as noted on the table below on
 * attacks with natural weapons and metal weapons." Table: HD 1-4 no DR,
 * resist electricity 10, 1 point; HD 5-10 DR 3/-, resist 15, 1d6; HD 11+
 * DR 5/-, resist 20, 2d6. Quoted from the vendored template prose.
 */
const AERIAL: StatblockAdjustment = {
  key: "aerial",
  label: "Aerial Creature",
  ops: [
    { kind: "subtypes", add: ["air"] },
    DARKVISION_60,
    PLANAR_DR_TIERS,
    planarResist("electricity"),
    {
      kind: "speedGrant",
      movement: "fly",
      multiplier: 1,
      plus: 0,
      maxPerHd: 10,
      maneuverability: "perfect",
    },
    planarRider("electricity"),
    OUTER_PLANE_CR_TIERS,
  ],
  notes: [PLANAR_GATE_NOTE, METAL_WEAPONS_NOTE],
};

/**
 * Aqueous creature (simple template). Monster Summoner's Handbook, pg. 18.
 *
 * Same gate and CR rule as the aerial creature. Rebuild rules: "Type gains
 * the water subtype; Senses gains darkvision 60 ft.; Defensive Abilities
 * gains DR and resistance to cold as noted on the table below; Speed gains
 * a swim speed equal to its highest speed + 10 ft.; Attacks gains bonus cold
 * damage as noted on the table below on attacks with natural weapons and
 * metal weapons." Table: HD 1-4 no DR, resist cold 10, 1 point; HD 5-10 DR
 * 3/-, resist 15, 1d6; HD 11+ DR 5/-, resist 20, 2d6.
 */
const AQUEOUS: StatblockAdjustment = {
  key: "aqueous",
  label: "Aqueous Creature",
  ops: [
    { kind: "subtypes", add: ["water"] },
    DARKVISION_60,
    PLANAR_DR_TIERS,
    planarResist("cold"),
    { kind: "speedGrant", movement: "swim", multiplier: 1, plus: 10 },
    planarRider("cold"),
    OUTER_PLANE_CR_TIERS,
  ],
  notes: [PLANAR_GATE_NOTE, METAL_WEAPONS_NOTE],
};

/**
 * Chthonic creature (simple template). Monster Summoner's Handbook, pg. 18.
 *
 * Same gate and CR rule as the aerial creature. Rebuild rules: "Type The
 * creature gains the earth subtype; Senses gains darkvision 60 ft.;
 * Defensive Abilities gains DR and resistance to acid as noted on the table
 * below; Speed gains a burrow speed equal to half its highest speed (its
 * tunnels always collapse behind it, and never leave behind a usable
 * passage); Attacks gains bonus acid damage as noted on the table below on
 * attacks with natural weapons." Table: HD 1-4 no DR, resist acid 10, 1
 * point; HD 5-10 DR 3/-, resist 15, 1d6; HD 11+ DR 5/-, resist 20, 2d6.
 * Natural weapons only: no metal-weapon clause for this one.
 */
const CHTHONIC: StatblockAdjustment = {
  key: "chthonic",
  label: "Chthonic Creature",
  ops: [
    { kind: "subtypes", add: ["earth"] },
    DARKVISION_60,
    PLANAR_DR_TIERS,
    planarResist("acid"),
    { kind: "speedGrant", movement: "burrow", multiplier: 0.5, plus: 0 },
    planarRider("acid"),
    OUTER_PLANE_CR_TIERS,
  ],
  notes: [
    PLANAR_GATE_NOTE,
    "Its burrow tunnels collapse behind it and never leave a usable passage.",
  ],
};

/**
 * Fiery creature (simple template). Monster Summoner's Handbook, pg. 18.
 *
 * Same gate and CR rule as the aerial creature, plus "Creatures with a swim
 * speed can't be fiery creatures." Rebuild rules: "Type gains the fire
 * subtype; Senses gains darkvision 60 ft.; Defensive Abilities gains DR as
 * noted on the table below; Attacks gains bonus fire damage as noted on the
 * table below on attacks with natural weapons and metal weapons." Table: HD
 * 1-4 no DR, 1 point; HD 5-10 DR 3/-, 2d6; HD 11+ DR 5/-, 3d6. Note the
 * steeper damage ladder (2d6/3d6, not 1d6/2d6) and no energy resistance:
 * the fire subtype itself carries fire immunity and cold vulnerability.
 */
const FIERY: StatblockAdjustment = {
  key: "fiery",
  label: "Fiery Creature",
  ops: [
    { kind: "subtypes", add: ["fire"] },
    DARKVISION_60,
    PLANAR_DR_TIERS,
    { kind: "appendLine", field: "immune", text: "fire", skipIfPresent: "fire" },
    {
      kind: "appendLine",
      field: "weaknesses",
      text: "vulnerability to cold",
      skipIfPresent: "cold",
    },
    {
      kind: "attackRider",
      scope: "natural",
      tiers: [
        { minHd: 1, value: "1 fire" },
        { minHd: 5, value: "2d6 fire" },
        { minHd: 11, value: "3d6 fire" },
      ],
    },
    OUTER_PLANE_CR_TIERS,
  ],
  notes: [
    PLANAR_GATE_NOTE,
    "Cannot be applied to a creature with a swim speed.",
    "Fire immunity and cold vulnerability come from the fire subtype the template grants.",
    METAL_WEAPONS_NOTE,
  ],
};

/**
 * Primordial creature (simple template). Monster Summoner's Handbook, pg. 18.
 *
 * "Primordial creatures are magical precursors or echoes of creatures from
 * the Material Plane. A primordial creature's CR increases by 1 only if the
 * base creature has 5 or more HD." Rebuild rules: "Defensive Abilities gains
 * DR as noted on the table below; SR gains SR equal to its new CR + 6;
 * Speed gains a +10-ft. bonus to all speeds; Attacks the damage dice for one
 * primary natural weapon increases as if the creature were one size larger
 * (if the creature has more than one primary attack, the increased damage is
 * applied to the first attack type it has from this list: bite, claw, slam,
 * gore, talon, sting); Spell-Like Abilities gains spell-like abilities
 * listed on the table below according to its Hit Dice (including all the
 * spell-like abilities of lower-Hit Die primordial creatures), each
 * available 1/day. The DCs of any saves against these abilities are equal to
 * 10 + the primordial creature's Charisma bonus + spell level." Table: HD
 * 1-4 no DR, dancing lights; HD 5-10 DR 5/cold iron, faerie fire; HD 11+ DR
 * 10/cold iron, lesser confusion. No gate: any creature qualifies.
 */
const PRIMORDIAL: StatblockAdjustment = {
  key: "primordial",
  label: "Primordial Creature",
  ops: [
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/cold iron" },
        { minHd: 11, value: "10/cold iron" },
      ],
    },
    OUTER_PLANE_CR_TIERS,
    { kind: "srFromCr", delta: 6 },
    { kind: "speedShift", delta: 10 },
    { kind: "primaryNaturalDiceStep", steps: 1 },
    {
      kind: "slaTiers",
      tiers: [
        { minHd: 1, value: "dancing lights" },
        { minHd: 5, value: "faerie fire" },
        { minHd: 11, value: "lesser confusion ({dc1})" },
      ],
    },
  ],
  notes: [
    "The enlarged damage dice go to the creature's only natural attack, or to the first it has from bite, claw, slam, gore, talon, sting.",
  ],
};

/**
 * Dark creature (simple template). Monster Summoner's Handbook, pg. 18.
 * Requires Versatile Summon Monster (the Nature's Ally feat does not offer it).
 *
 * Same gate and CR rule as the aerial creature. Rebuild rules: "Senses gain
 * darkvision 60 ft. and low-light vision; Defensive Abilities gains DR and
 * resistance to cold and electricity based on its Hit Dice, as noted on the
 * table below; SR gains SR equal to its new CR + 5." Table: HD 1-4 no DR,
 * resist 5; HD 5-10 DR 5/magic, resist 10; HD 11+ DR 10/magic, resist 15.
 */
const DARK: StatblockAdjustment = {
  key: "dark",
  label: "Dark Creature",
  ops: [
    DARKVISION_60,
    {
      kind: "appendLine",
      field: "senses",
      text: "low-light vision",
      skipIfPresent: "low-light vision",
    },
    {
      kind: "drTiers",
      tiers: [
        { minHd: 1, value: null },
        { minHd: 5, value: "5/magic" },
        { minHd: 11, value: "10/magic" },
      ],
    },
    {
      kind: "resistTiers",
      energies: ["cold", "electricity"],
      tiers: [
        { minHd: 1, value: 5 },
        { minHd: 5, value: 10 },
        { minHd: 11, value: 15 },
      ],
    },
    OUTER_PLANE_CR_TIERS,
    SR_FROM_CR_PLUS_5,
  ],
  notes: [PLANAR_GATE_NOTE],
};

export const STATBLOCK_TEMPLATES: readonly StatblockAdjustment[] = [
  CELESTIAL,
  FIENDISH,
  ENTROPIC,
  RESOLUTE,
  COUNTERPOISED,
  AERIAL,
  AQUEOUS,
  CHTHONIC,
  FIERY,
  PRIMORDIAL,
  DARK,
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

/** Summon Neutral Monster's alternative to the celestial/fiendish pick on a templated row. */
export const COUNTERPOISED_KEY = COUNTERPOISED.key;

/** Versatile Summon Monster's pick list ("aerial, aqueous, chthonic, dark, fiery, or primordial"). */
export const VERSATILE_SM_TEMPLATE_KEYS: readonly string[] = [
  AERIAL.key,
  AQUEOUS.key,
  CHTHONIC.key,
  DARK.key,
  FIERY.key,
  PRIMORDIAL.key,
];

/** Versatile Summon Nature's Ally's pick list ("aerial, aqueous, chthonic, fiery, or primordial"; no dark). */
export const VERSATILE_SNA_TEMPLATE_KEYS: readonly string[] = [
  AERIAL.key,
  AQUEOUS.key,
  CHTHONIC.key,
  FIERY.key,
  PRIMORDIAL.key,
];

const PLANAR_GATED_KEYS = new Set([AERIAL.key, AQUEOUS.key, CHTHONIC.key, FIERY.key, DARK.key]);
const PLANAR_BLOCKING_SUBTYPES = new Set(["air", "cold", "earth", "fire", "water"]);

/**
 * Why a template can't go on this creature, per its own published gate, or
 * null when nothing structured forbids it. Only the gates the statblock can
 * answer are checked (creature type, subtypes, swim speed); the Giant/Young
 * size limits stay notes because applying them is still a legal thing to try.
 */
export function templateIneligibility(
  key: string,
  monster: { creatureType?: string; subtypes?: string[]; speed?: string },
): string | null {
  if (!PLANAR_GATED_KEYS.has(key)) return null;
  if ((monster.creatureType ?? "").toLowerCase() === "outsider") {
    return "an outsider can't take this template";
  }
  const blocking = (monster.subtypes ?? []).find((s) =>
    PLANAR_BLOCKING_SUBTYPES.has(s.toLowerCase()),
  );
  if (blocking) return `a creature with the ${blocking} subtype can't take this template`;
  if (key === FIERY.key && /\bswim\b/i.test(monster.speed ?? "")) {
    return "a creature with a swim speed can't take this template";
  }
  return null;
}

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

/**
 * Moonlight Summons (feat). Pathfinder RPG Ultimate Magic, pg. 153.
 * Prerequisites: Spell Focus (conjuration), able to cast summon nature's ally.
 *
 * "Benefit: Creatures you summon shed light as a light spell. They are
 * immune to confusion and sleep effects, and their natural weapons are
 * treated as silver for the purposes of overcoming damage reduction."
 * Confirmed via aonprd.com FeatDisplay for Moonlight Summons.
 */
export const MOONLIGHT_SUMMONS: StatblockAdjustment = {
  key: "moonlight-summons",
  label: "Moonlight Summons",
  ops: [
    { kind: "appendLine", field: "immune", text: "confusion effects" },
    { kind: "appendLine", field: "immune", text: "sleep effects" },
    {
      kind: "appendLine",
      field: "sq",
      text: "sheds light as a light spell; natural weapons count as silver for overcoming damage reduction",
    },
  ],
};

/**
 * Starlight Summons (feat). Pathfinder RPG Ultimate Magic, pg. 157.
 * Prerequisites: Spell Focus (conjuration), able to cast summon nature's ally.
 *
 * "Benefit: Creatures you summon gain the Blind-Fight feat, a +5 bonus to
 * Perception and Stealth checks in dim light or darkness, and their natural
 * weapons are treated as cold iron for overcoming damage reduction."
 * Confirmed via aonprd.com FeatDisplay for Starlight Summons.
 */
export const STARLIGHT_SUMMONS: StatblockAdjustment = {
  key: "starlight-summons",
  label: "Starlight Summons",
  ops: [
    { kind: "appendLine", field: "feats", text: "Blind-Fight", skipIfPresent: "Blind-Fight" },
    {
      kind: "appendLine",
      field: "sq",
      text: "+5 on Perception and Stealth checks in dim light or darkness; natural weapons count as cold iron for overcoming damage reduction",
    },
  ],
  notes: ["The +5 Perception/Stealth bonus is conditional, so the Skills line is left as printed."],
};

/**
 * Summon Good Monster (feat). Pathfinder Player Companion: Champions of
 * Purity, pg. 33. "Your righteous determination grants these summoned
 * creatures the Diehard feat." Applies to creatures taken from the feat's
 * own list, not to the standard Summon Monster rows.
 */
export const SUMMON_GOOD_DIEHARD: StatblockAdjustment = {
  key: "summon-good-monster",
  label: "Summon Good Monster",
  ops: [{ kind: "appendLine", field: "feats", text: "Diehard", skipIfPresent: "Diehard" }],
};

/**
 * Summon Neutral Monster (feat). Pathfinder Player Companion: Champions of
 * Balance, pg. 33. "Creatures you summon from the list on this page and
 * creatures you summon with the counterpoised template gain a +2 resistance
 * bonus on Will saves."
 */
export const SUMMON_NEUTRAL_WILL: StatblockAdjustment = {
  key: "summon-neutral-monster",
  label: "Summon Neutral Monster",
  ops: [{ kind: "saveShift", delta: 2, save: "will" }],
  notes: [
    "The +2 to Will is a resistance bonus; it does not stack with a resistance bonus the base creature already has.",
  ],
};

const FEAT_ADJUSTMENTS: readonly StatblockAdjustment[] = [
  AUGMENT_SUMMONING,
  MOONLIGHT_SUMMONS,
  STARLIGHT_SUMMONS,
  SUMMON_GOOD_DIEHARD,
  SUMMON_NEUTRAL_WILL,
];

export function statblockTemplate(key: string): StatblockAdjustment | undefined {
  const feat = FEAT_ADJUSTMENTS.find((adj) => adj.key === key);
  if (feat) return feat;
  return STATBLOCK_TEMPLATES.find((template) => template.key === key);
}
