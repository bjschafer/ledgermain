/**
 * PC natural attacks granted by base-class features and archetype features —
 * see `types.ts`'s header for the table family's charter and `index.ts` for
 * the resolver.
 *
 * - `CLASS_FEATURE_NATURAL_ATTACKS`, keyed by the vendored `classFeatures`
 *   pack id (the `PER_DAY_ACTIVATIONS`/`CLASS_FEATURE_SLA_GRANTS`
 *   convention) — e.g. a druid's Wild Shape is NOT here (it's the dedicated
 *   `polymorph.ts` surface), but a class feature that grants a standing bite
 *   or claws directly onto the PC's own body (a shifter's claws, for
 *   instance) belongs here. Talent-pick subsystems (rage powers, alchemist
 *   discoveries, witch hexes, ...) are ALSO keyed here, off the same
 *   synthetic `featureId` prefix `archetypes.ts`'s `collectGrantedFeatures`
 *   already uses for that pick family (`ragePower:<id>`, `discovery:<id>`,
 *   `hex:<id>`, ...) — that function only yields the entry when the player
 *   actually has the pick stored, so no extra `when(doc)` gate is needed to
 *   check the pick itself; only a genuinely separate LIVE condition (raging,
 *   a mutagen active) needs `requiredBuff`.
 * - `ARCHETYPE_FEATURE_NATURAL_ATTACKS`, keyed by the vendored
 *   `archetypeFeatures` pack id, gated by the resolver on the archetype
 *   being chosen and its class level.
 *
 * Verified against aonprd.com/d20pfsrd.com during authoring; every entry's
 * source line is cited in its own comment. Most published PC-body natural
 * attacks stay unwired — either they're an ACTIVATED grant with no live buff
 * this engine can gate on (a rounds/day or times/day resource pool with no
 * `linkedBuffIds`, e.g. the sorcerer/bloodrager Draconic and Abyssal
 * bloodline "Claws" powers), a per-round tactical condition this static
 * sheet can't check (Fiend Totem's gore is primary if unarmed but secondary
 * if also swinging a weapon), a die-size/rider upgrade with nothing to
 * attach it to without double-granting the base line (Greater Beast Totem's
 * claw-die bump), or a per-attack property this table's shape can't express
 * (an ability score other than Strength feeding damage, a DR-bypass quality,
 * a critical-multiplier change). Each such case is called out in the
 * relevant source file's own contextNotes/classification note, not silently
 * dropped.
 */

import type { PcNaturalAttackDef } from "./types.js";
import { WHILE_RAGING } from "../rage-powers.js";

/**
 * Vendored `RefData.buffs` ids for the three Mutagen variants (Str/Dex/Con)
 * — the alchemist's base 1st-level class feature's `grantsBuffs`, confirmed
 * against `buffs.json` ("Mutagen, Str"/"Mutagen, Dex"/"Mutagen, Con"). Feral
 * Mutagen's claws/bite only exist while one of these three is active — which
 * physical score the mutagen boosted doesn't matter for the natural-attack
 * grant, only that a mutagen is currently in effect.
 */
const MUTAGEN_BUFF_IDS = ["a3P821aUxxJbSpVV", "bleCnwZmMAOu4nE4", "L6gBfTUHFJMiY9Uj"] as const;

export const CLASS_FEATURE_NATURAL_ATTACKS: Readonly<
  Record<string, readonly PcNaturalAttackDef[]>
> = {
  // Shifter Claws (base shifter class feature, 1st level, vendored id
  // fi5PsRq1XW7MStPM): "At will... a shifter in her natural form can extend
  // her claws as a swift action to use as a weapon... The claws on each hand
  // can be used as a primary natural attack, dealing 1d4 points of piercing
  // and slashing damage (1d3 if Small)." No activated stance to gate on (the
  // swift action just readies the claws, same posture this table treats
  // Shifter Claws' "usable at will" as always-on). Damage rises with level:
  // "At 7th level, her claw damage increases to 1d6... At 11th level...
  // 1d8... At 13th level... 1d10." (aonprd.com, class-features.json
  // fi5PsRq1XW7MStPM.) Two riders have no target this table can express and
  // stay note-only: 3rd level bypasses DR/cold iron, DR/magic, and DR/silver;
  // 17th level raises the critical multiplier to x3 (no die-size change);
  // 19th level adds DR/adamantine and DR/— bypass. If the adaptive-shifter
  // archetype's Adaptive Claws swaps the attack form (bite/gore/tail slap
  // instead of claws), this base grant still fires as the default —
  // Adaptive Claws itself stays unwired (a player choice with no stored pick
  // field; see `archetype-extracted/shifter.ts`).
  fi5PsRq1XW7MStPM: [
    {
      slug: "claws",
      attacks: [
        {
          name: "Claw",
          count: 2,
          mediumDice: (classLevel) =>
            classLevel >= 13 ? "1d10" : classLevel >= 11 ? "1d8" : classLevel >= 7 ? "1d6" : "1d4",
        },
      ],
      note: "Ignores DR/cold iron, DR/magic, and DR/silver at 3rd level; critical multiplier rises to x3 at 17th; ignores DR/adamantine and DR/- at 19th.",
    },
  ],

  // Dragon Bite (dragon disciple prestige class feature, 2nd level, vendored
  // id prestige:dragon-disciple:dragon-bite): "a dragon disciple gains a
  // bite attack, usable as a primary natural attack, dealing 1d6 points of
  // damage (1d4 if Small) plus 1-1/2 times her Strength modifier." No
  // activation to gate — a standing feature once the level is reached.
  // (aonprd.com, class-features.json prestige:dragon-disciple:dragon-bite.)
  "prestige:dragon-disciple:dragon-bite": [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d6" }],
      note: "At 6th level the bite deals an extra 1d6 points of energy damage matching her draconic bloodline's energy type — no Change target for a bonus energy-damage die, apply it by hand.",
    },
  ],

  // Tiger's Claws (vigilante talent, vigilante-talents.ts's "tigersClaws"):
  // "he gains a pair of claws... primary natural attacks that each deal 1d4
  // points of damage (1d3 if the vigilante is Small). At 11th level, the
  // damage of the claws increases to 1d6 (1d4 if the vigilante is Small)."
  // (aonprd.com Vigilante Talents.) Extendable at will, so always on.
  "vigilanteTalent:tigersClaws": [
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: (level) => (level >= 11 ? "1d6" : "1d4") }],
    },
  ],

  // Animal Fury (barbarian/barbarianUnchained rage power, ragePowers.ts's
  // "animalFury"): "gains a bite attack... usable as part of a full attack
  // [alongside weapon attacks]... the bite attack is treated as a secondary
  // natural attack... [made] using the barbarian's base attack bonus -5...
  // deals 1d4 points of damage (1d3 if Small) plus half the barbarian's
  // Strength modifier." (aonprd.com Barbarian Rage Powers, cross-checked
  // d20pfsrd.com.) Explicit `kind: "secondary"` because this is the ONLY
  // natural-attack line most barbarians have — without the override,
  // `classifyNaturalAttacks`'s lone-attack rule would treat it as primary
  // with a x1.5 Strength rider, which Animal Fury's own text overrides with
  // a flat -5/half-Strength secondary attack regardless of what else is
  // active.
  "ragePower:animalFury": [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d4", kind: "secondary" }],
      requiredBuff: WHILE_RAGING,
      note: "Always a secondary attack (base attack bonus -5, half Strength to damage) even used alone, per Animal Fury's own text, not the usual lone-natural-attack rule.",
    },
  ],

  // Lesser Abyssal Blood (rage power): "While raging, an abyssal blood-
  // raged barbarian grows two claws that deal 1d6 points of slashing damage
  // (1d4 if Small) plus her Strength modifier. These claws are treated as
  // primary natural attacks and can be used as part of a full attack at her
  // full base attack bonus." (aonprd.com Rage Powers.)
  "ragePower:lesserAbyssalBlood": [
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d6" }],
      requiredBuff: WHILE_RAGING,
    },
  ],

  // Lesser Beast Totem (rage power): identical claws shape to Lesser Abyssal
  // Blood/Lesser Draconic Blood (aonprd.com Rage Powers). Greater Beast
  // Totem's die-size bump (1d6 -> 1d8) and pounce have no hook here — see
  // this table's own header and `rage-powers.ts`'s "greaterBeastTotem" note.
  "ragePower:lesserBeastTotem": [
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d6" }],
      requiredBuff: WHILE_RAGING,
    },
  ],

  // Lesser Draconic Blood (rage power): identical claws shape to Lesser
  // Abyssal Blood/Lesser Beast Totem (aonprd.com Rage Powers). Draconic
  // Blood/Greater Draconic Blood's energy resistance, natural armor, and
  // breath weapon riders are separate, already-modeled or already-noted
  // entries in `rage-powers.ts` and don't touch this grant.
  "ragePower:lesserDraconicBlood": [
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d6" }],
      requiredBuff: WHILE_RAGING,
    },
  ],

  // Feral Mutagen (alchemist discovery): "Whenever the alchemist imbibes a
  // mutagen affected by this discovery, he sprouts two claw attacks and a
  // bite attack... primary natural attacks made using his full base attack
  // bonus. The claw attacks deal 1d6 points of damage (1d4 if Small) and the
  // bite attack deals 1d8 points of damage (1d6 if Small)." (aonprd.com
  // Discoveries; the +2 Intimidate rider has no Change target and stays a
  // manual reminder — it's a skill bonus this table doesn't touch.) Gated on
  // any of the three Mutagen buffs (which physical score it boosted doesn't
  // matter here) since Feral Mutagen only modifies whichever mutagen is
  // currently in effect.
  "discovery:feralMutagen": [
    {
      slug: "claws-and-bite",
      attacks: [
        { name: "Claw", count: 2, mediumDice: "1d6" },
        { name: "Bite", mediumDice: "1d8" },
      ],
      requiredBuff: { buffIds: [...MUTAGEN_BUFF_IDS] },
      note: "Also grants a +2 competence bonus on Intimidate checks while the mutagen is active.",
    },
  ],

  // Nails hex (witch): "The witch's fingernails grow into claws, which she
  // can use as natural weapons that deal 1d3 points of damage (1d2 if
  // Small)... a secondary attack." (aonprd.com Witch Hexes.) Standing once
  // known — no duration or activation to gate. `kind: "secondary"` is
  // explicit for the same lone-attack reason as Animal Fury above: nails are
  // usually the only natural-attack line a witch has, and RAW calls them out
  // as secondary regardless.
  "hex:nails": [
    {
      slug: "nails",
      attacks: [{ name: "Claw", mediumDice: "1d3", kind: "secondary" }],
    },
  ],
};

export const ARCHETYPE_FEATURE_NATURAL_ATTACKS: Readonly<
  Record<string, readonly PcNaturalAttackDef[]>
> = {
  // Savage Bite (barbarian archetype "Feral Gnasher", 1st level, replaces
  // Fast Movement — mirrored under both barbarian and barbarianUnchained
  // since the archetype is published for both editions and a character can
  // only ever have chosen one edition's copy): "a feral gnasher gains a
  // savage bite attack. This is a primary natural attack that deals 1d4
  // points of damage... At 10th level, the damage from a feral gnasher's
  // bite increases to 1d6... and deals x3 damage on a critical hit."
  // (aonprd.com Barbarian Archetypes.) Two riders have no target this table
  // can express and stay note-only: the critical-multiplier bump at 10th,
  // and "if the goblin already has the hard head, big teeth racial trait,
  // the damage increases to 1d6" (an extra step this def's level-only dice
  // function can't condition on a racial trait pick).
  "barbarian:feral-gnasher:savage-bite:1": [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: (classLevel) => (classLevel >= 10 ? "1d6" : "1d4") }],
      note: "Critical multiplier rises to x3 at 10th level. A goblin with the Hard Head, Big Teeth racial trait bumps this bite's damage die one step early (to 1d6, then 1d8 at 10th) — apply that by hand.",
    },
  ],
  "barbarianUnchained:feral-gnasher:savage-bite:1": [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: (classLevel) => (classLevel >= 10 ? "1d6" : "1d4") }],
      note: "Critical multiplier rises to x3 at 10th level. A goblin with the Hard Head, Big Teeth racial trait bumps this bite's damage die one step early (to 1d6, then 1d8 at 10th) — apply that by hand.",
    },
  ],

  // Claws of the Hag (bloodrager archetype "Hag-Riven", 1st level): "grows a
  // pair of vicious claws... primary attacks... deal 1d4 points of damage
  // each (1d3 for a Small creature)... At 5th level, the damage increases to
  // 1d6... At 16th level, the damage increases again to 1d8." (aonprd.com
  // Bloodrager Archetypes.) Unconditional once gained — no rage/activation
  // gate. Two riders have no target this table can express and stay note-
  // only: 2nd level treats the claws as magic weapons for DR; 13th level
  // adds a 19-20 critical threat range.
  "bloodrager:hag-riven:claws-of-the-hag:1": [
    {
      slug: "claws",
      attacks: [
        {
          name: "Claw",
          count: 2,
          mediumDice: (classLevel) => (classLevel >= 16 ? "1d8" : classLevel >= 5 ? "1d6" : "1d4"),
        },
      ],
      note: "Treated as magic weapons for overcoming DR at 2nd level; threatens a critical hit on a natural 19-20 at 13th level.",
    },
  ],

  // Terrible Slam (bloodrager archetype "Rageshaper", 1st level): "functions
  // as the shifter claws class ability, except his natural weapons are
  // treated as slam attacks. Additionally, rather than granting the ability
  // to bypass different kinds of damage reduction, the rageshaper's terrible
  // slam ignores some of an object's hardness." (aonprd.com Bloodrager
  // Archetypes.) Same unconditional grant and dice progression as Shifter
  // Claws above (1d4 -> 1d6 at 7th -> 1d8 at 11th -> 1d10 at 13th), just
  // named Slam and with a hardness-bypass rider (5/10/15/20 points at
  // 1st/5th/10th/15th) instead of Shifter Claws' DR-bypass rider — no target
  // for bypassing an object's hardness, so that rider stays note-only.
  "bloodrager:rageshaper:terrible-slam:1": [
    {
      slug: "slam",
      attacks: [
        {
          name: "Slam",
          count: 2,
          mediumDice: (classLevel) =>
            classLevel >= 13 ? "1d10" : classLevel >= 11 ? "1d8" : classLevel >= 7 ? "1d6" : "1d4",
        },
      ],
      note: "Ignores 5 points of an object's hardness at 1st level, rising to 10 at 5th, 15 at 10th, and 20 at 15th.",
    },
  ],
};
