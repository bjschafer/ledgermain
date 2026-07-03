/**
 * Clean-room PF1 sorcerer bloodline arcana + powers table (DESIGN §6):
 * hand-authored from the published Core Rulebook rules (verified against SRD
 * text) — bloodline ARCANA and POWERS are prose-only upstream (only
 * `RefData.bloodlineSpellLists` is vendored, i.e. bonus spells known; see
 * `packages/schema/src/refdata.ts`), so there is no Foundry class-feature
 * data to normalize for them. Same posture as `traits.ts`/`conditions.ts` for
 * content the compendium doesn't carry.
 *
 * Scope: the 10 Core Rulebook bloodlines (issue #34). `packages/data-pipeline`
 * vendors 39 bloodline tags for spells; note "Aberrant" is NOT among them (a
 * gap in the upstream Foundry pack, not this table — see BloodlinePicker's
 * doc comment). This table keys "Aberrant" anyway since arcana/powers are
 * independent of the spell-list dataset; it just won't show up in the
 * spell-list picker's dropdown yet.
 *
 * Modelling posture (mirrors traits.ts):
 *   - `arcana.changes` / `power.changes` hold ONLY genuinely unconditional,
 *     always-on numeric effects (e.g. Draconic's +1 HP/level, Undead's flat
 *     DR 5/— at 20th). Most bloodline arcana/powers are conditional on a
 *     situation the static sheet can't detect (specific spell schools,
 *     "when unaware of an attack", touch-attack-only reach) or are activated
 *     abilities with variable/rolled effects — those carry `changes: []` plus
 *     a `contextNotes` reminder, never an over-applied flat number.
 *   - `resourcePool` is set only where RAW gives an explicit uses/day (or
 *     rounds/day) formula, mirroring how vendored class-feature `uses.maxFormula`
 *     pools already derive (see `resources.ts`) — hand-authored here since
 *     there's no vendored formula to read.
 *   - Draconic (dragon type) and Elemental (element) require a player pick of
 *     energy type at bloodline selection; `CharacterDoc.build.sorcererBloodlineVariant`
 *     records it. That choice is DISPLAY-ONLY in this table (which energy type
 *     the flavor text names) — the numeric bonuses these two bloodlines grant
 *     that would otherwise depend on the chosen type (energy resistance,
 *     Elemental Movement's mode) are deliberately left as `contextNotes`
 *     rather than wired as variant-conditional `Change`s, keeping the data
 *     shape static and simple; only the variant-INDEPENDENT numbers (Draconic
 *     natural armor, +1 HP/level, wings' fly speed) are modeled as `Change`s.
 *     Unknown/absent variant ids just fall back to generic text — never a
 *     crash (`variantLabel` returns `undefined` for them).
 */

import type { Change, ContextNote } from "@pf1/schema";

/** Sorcerer bloodline power level gates (PF1 CRB: always 1st/3rd/9th/15th/20th). */
export type BloodlinePowerLevel = 1 | 3 | 9 | 15 | 20;

export interface BloodlineResourcePool {
  /** Formula (engine formula DSL) evaluated against sorcerer level + abilities. */
  usesFormula: string;
  /** Recharge period; always "day" (matches Rage's convention even for a
   *  "rounds/day" pool — the unit is rounds, the recharge is daily). */
  per: "day";
  /** Short mechanical summary for the resource row (e.g. dice/DC). */
  detail?: string;
}

export interface BloodlinePower {
  /** Stable slug, unique within the bloodline (e.g. "claws"). */
  id: string;
  level: BloodlinePowerLevel;
  name: string;
  /** Short rules summary shown in the UI. */
  summary: string;
  /** Unconditional numeric modifiers (rare — most powers are activated). */
  changes?: Change[];
  contextNotes?: ContextNote[];
  resourcePool?: BloodlineResourcePool;
}

export interface BloodlineVariantOption {
  id: string;
  label: string;
}

export interface BloodlineDef {
  /** Matches `doc.build.sorcererBloodline` / (where present) `RefData.bloodlineSpellLists` keys. */
  tag: string;
  name: string;
  arcana: {
    summary: string;
    /** Unconditional numeric modifiers (rare — see file doc comment). */
    changes: Change[];
    contextNotes?: ContextNote[];
  };
  powers: BloodlinePower[];
  /** Prompt text shown by the picker when `variantOptions` is non-empty. */
  variantPrompt?: string;
  /** Energy type / dragon type choices, for bloodlines that need one. */
  variantOptions?: BloodlineVariantOption[];
}

const c = (formula: string, target: string, type: string, operator?: "add" | "set"): Change => ({
  formula,
  target,
  type,
  ...(operator ? { operator } : {}),
});

const POOL_3_CHA: BloodlineResourcePool = {
  usesFormula: "3 + @abilities.cha.mod",
  per: "day",
};

/** 1/day at the gate level, 2/day 8 levels later, 3/day 11 levels later (the CRB's common burst-power cadence). */
function burstPool(baseLevel: number, detail?: string): BloodlineResourcePool {
  return {
    usesFormula: `if(gte(@classes.sorcerer.level, ${baseLevel + 11}), 3, if(gte(@classes.sorcerer.level, ${baseLevel + 8}), 2, 1))`,
    per: "day",
    detail,
  };
}

const BLOODLINE_LIST: BloodlineDef[] = [
  // ---- Aberrant --------------------------------------------------------------
  {
    tag: "Aberrant",
    name: "Aberrant",
    arcana: {
      summary:
        "Whenever you cast a spell of the polymorph subschool, its duration increases by 50% (minimum 1 round).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+50% duration on polymorph-subschool spells only — apply manually." },
      ],
    },
    powers: [
      {
        id: "acidicRay",
        level: 1,
        name: "Acidic Ray",
        summary:
          "Ranged touch attack (30 ft.), standard action: 1d6 acid damage + 1 per two sorcerer levels.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6 + 1/2 lvl acid" },
        contextNotes: [
          { target: "allChecks", text: "Damage scales with sorcerer level; roll manually." },
        ],
      },
      {
        id: "longLimbs",
        level: 3,
        name: "Long Limbs",
        summary:
          "+5 ft. reach on melee touch attacks (+10 ft. at 11th, +15 ft. at 17th).",
        contextNotes: [
          { target: "reach", text: "Only extends reach for melee touch attacks — situational, not auto-applied." },
        ],
      },
      {
        id: "unusualAnatomy",
        level: 9,
        name: "Unusual Anatomy",
        summary: "25% chance to ignore a critical hit or sneak attack (50% at 13th level).",
        contextNotes: [
          { target: "allChecks", text: "Roll the percentile chance manually when hit by a crit/sneak attack." },
        ],
      },
      {
        id: "alienResistance",
        level: 15,
        name: "Alien Resistance",
        summary: "Spell resistance equal to sorcerer level + 10.",
        changes: [c("@classes.sorcerer.level + 10", "spellResist", "untyped", "set")],
      },
      {
        id: "aberrantForm",
        level: 20,
        name: "Aberrant Form",
        summary:
          "Immune to critical hits and sneak attacks; blindsight 60 ft.; damage reduction 5/—.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Crit/sneak-attack immunity and blindsight aren't tracked on the sheet — apply manually.",
          },
        ],
      },
    ],
  },
  // ---- Abyssal ---------------------------------------------------------------
  {
    tag: "Abyssal",
    name: "Abyssal",
    arcana: {
      summary:
        "Whenever you cast a summon monster spell, the summoned creatures gain DR/good equal to 1/2 your sorcerer level (minimum 1).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "DR/good applies to summoned creatures, not you — situational, not auto-applied." },
      ],
    },
    powers: [
      {
        id: "claws",
        level: 1,
        name: "Claws",
        summary:
          "Free action: claws deal 1d4 (1d3 if Small) + Str; magic at 5th, 1d6 (1d4 Small) at 7th, +1d6 fire (flaming) at 11th.",
        resourcePool: { ...POOL_3_CHA, detail: "1d4+Str claws" },
      },
      {
        id: "demonResistances",
        level: 3,
        name: "Demon Resistances",
        summary: "Resist electricity 5 and +2 vs. poison (electricity 10, +4 vs. poison at 9th).",
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 9), 10, 5)",
            "eres.electricity",
            "untyped",
          ),
        ],
        contextNotes: [
          { target: "allSavingThrows", text: "+2 (+4 at 9th) vs. poison only — not a general save bonus." },
        ],
      },
      {
        id: "strengthOfTheAbyss",
        level: 9,
        name: "Strength of the Abyss",
        summary: "+2 inherent bonus to Strength (+4 at 13th, +6 at 17th).",
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 17), 6, if(gte(@classes.sorcerer.level, 13), 4, 2))",
            "str",
            "inherent",
          ),
        ],
      },
      {
        id: "addedSummonings",
        level: 15,
        name: "Added Summonings",
        summary:
          "Summon monster spells that call a demon (or fiendish-templated creature) summon one additional creature of the same kind.",
        contextNotes: [{ target: "allChecks", text: "Only affects demon/fiendish summon monster spells." }],
      },
      {
        id: "demonicMight",
        level: 20,
        name: "Demonic Might",
        summary:
          "Immune to electricity and poison; resist acid 10, cold 10, and fire 10; telepathy 60 ft.",
        changes: [
          c("10", "eres.acid", "untyped"),
          c("10", "eres.cold", "untyped"),
          c("10", "eres.fire", "untyped"),
        ],
        contextNotes: [
          { target: "allChecks", text: "Also grants electricity/poison immunity and 60-ft. telepathy (display only)." },
        ],
      },
    ],
  },
  // ---- Arcane ------------------------------------------------------------------
  {
    tag: "Arcane",
    name: "Arcane",
    arcana: {
      summary:
        "Whenever you apply a metamagic feat that increases a spell's effective slot by at least one level, the spell's save DC increases by 1.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+1 DC only on metamagic'd spells that raise the slot level — apply manually." },
      ],
    },
    powers: [
      {
        id: "arcaneBond",
        level: 1,
        name: "Arcane Bond",
        summary:
          "Gain a wizard-style arcane bond (familiar or bonded object); a bonded object can cast a known spell once daily in an emergency.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Emergency spell (bonded object)" },
      },
      {
        id: "metamagicAdept",
        level: 3,
        name: "Metamagic Adept",
        summary:
          "Apply a known metamagic feat to a spell without increasing its casting time; +1 use per four sorcerer levels beyond 3rd (max 5/day at 19th).",
        resourcePool: {
          usesFormula: "1 + floor(max(0, @classes.sorcerer.level - 3) / 4)",
          per: "day",
        },
      },
      {
        id: "newArcana",
        level: 9,
        name: "New Arcana",
        summary: "Add one sorcerer/wizard spell to your spells known (repeats at 13th and 17th).",
        contextNotes: [{ target: "allChecks", text: "Add the chosen spell to your known-spells list manually." }],
      },
      {
        id: "schoolPower",
        level: 15,
        name: "School Power",
        summary: "Spells of one chosen school gain +2 to their save DC (stacks with Spell Focus).",
        contextNotes: [{ target: "allChecks", text: "+2 DC only for the chosen school — apply manually." }],
      },
      {
        id: "arcaneApotheosis",
        level: 20,
        name: "Arcane Apotheosis",
        summary:
          "Apply metamagic feats without increasing casting time at will; may expend spell slots (3 slot-levels per charge) to power charged magic items.",
        contextNotes: [{ target: "allChecks", text: "Display only — no charge-conversion tracking on the sheet." }],
      },
    ],
  },
  // ---- Celestial --------------------------------------------------------------
  {
    tag: "Celestial",
    name: "Celestial",
    arcana: {
      summary:
        "Whenever you cast a summon monster spell, the summoned creatures gain DR/evil equal to 1/2 your sorcerer level (minimum 1).",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "DR/evil applies to summoned creatures, not you — situational, not auto-applied." },
      ],
    },
    powers: [
      {
        id: "heavenlyFire",
        level: 1,
        name: "Heavenly Fire",
        summary:
          "Ranged touch attack (30 ft.): 1d4 + 1 per two sorcerer levels divine damage to an evil creature, or heals a good creature (once/day/target).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "celestialResistances",
        level: 3,
        name: "Celestial Resistances",
        summary: "Resist acid 5 and cold 5 (10 each at 9th level).",
        changes: [
          c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.acid", "untyped"),
          c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.cold", "untyped"),
        ],
      },
      {
        id: "wingsOfHeaven",
        level: 9,
        name: "Wings of Heaven",
        summary:
          "Grow wings for a fly speed of 60 ft. (good maneuverability), usable in 1-minute increments.",
        resourcePool: { usesFormula: "@classes.sorcerer.level", per: "day", detail: "Minutes of flight/day" },
      },
      {
        id: "conviction",
        level: 15,
        name: "Conviction",
        summary: "Reroll one ability check, attack roll, skill check, or saving throw before results are revealed.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "ascension",
        level: 20,
        name: "Ascension",
        summary:
          "Immune to acid, cold, and petrification; resist electricity 10 and fire 10; +4 vs. poison; unlimited Wings of Heaven; speak with any creature.",
        changes: [c("10", "eres.electricity", "untyped"), c("10", "eres.fire", "untyped")],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 vs. poison only — not a general save bonus." },
          { target: "allChecks", text: "Also grants acid/cold/petrification immunity, unlimited flight, and tongues (display only)." },
        ],
      },
    ],
  },
  // ---- Destined ---------------------------------------------------------------
  {
    tag: "Destined",
    name: "Destined",
    arcana: {
      summary:
        "Whenever you cast a spell with a range of personal, you gain a luck bonus equal to the spell's level on saving throws for 1 round.",
      changes: [],
      contextNotes: [
        { target: "allSavingThrows", text: "Luck bonus only for 1 round after a personal-range spell — apply manually." },
      ],
    },
    powers: [
      {
        id: "touchOfDestiny",
        level: 1,
        name: "Touch of Destiny",
        summary:
          "Touch attack grants an insight bonus (1/2 sorcerer level, min +1) on one attack roll, skill check, ability check, or save for 1 round.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "fated",
        level: 3,
        name: "Fated",
        summary:
          "+1 luck bonus to AC and saves during surprise rounds or when unaware of an attack (+1 more at 7th and every 4 levels, max +5 at 19th).",
        contextNotes: [
          { target: "ac", text: "Only applies during a surprise round or while unaware of the attack — situational." },
        ],
      },
      {
        id: "itWasMeantToBe",
        level: 9,
        name: "It Was Meant to Be",
        summary:
          "Reroll one attack roll, critical-hit confirmation, or caster level check vs. spell resistance before the result is revealed.",
        resourcePool: burstPool(9),
      },
      {
        id: "withinReach",
        level: 15,
        name: "Within Reach",
        summary:
          "When an attack or spell would kill you, DC 20 Will save to instead drop to -1 hp and stabilize.",
        contextNotes: [{ target: "allChecks", text: "Only triggers on a killing blow — situational, not auto-applied." }],
      },
      {
        id: "destinyRealized",
        level: 20,
        name: "Destiny Realized",
        summary:
          "Critical hits against you only confirm on a natural 20; your own critical threats auto-confirm; once/day auto-succeed a caster level check vs. spell resistance.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Auto-success CL check vs. SR" },
      },
    ],
  },
  // ---- Draconic -----------------------------------------------------------------
  {
    tag: "Draconic",
    name: "Draconic",
    arcana: {
      summary:
        "+1 hit point per sorcerer level. Whenever you cast a spell that deals energy damage of your dragon type, it deals +1 damage per die rolled.",
      changes: [c("@classes.sorcerer.level", "hp", "untyped")],
      contextNotes: [
        { target: "allChecks", text: "+1 damage/die only on spells matching your dragon type's energy — apply manually." },
      ],
    },
    variantPrompt: "Dragon type (sets your energy type and breath weapon shape)",
    variantOptions: [
      { id: "black", label: "Black (acid, line)" },
      { id: "blue", label: "Blue (electricity, line)" },
      { id: "brass", label: "Brass (fire, line)" },
      { id: "bronze", label: "Bronze (electricity, line)" },
      { id: "copper", label: "Copper (acid, line)" },
      { id: "gold", label: "Gold (fire, cone)" },
      { id: "green", label: "Green (acid, cone)" },
      { id: "red", label: "Red (fire, cone)" },
      { id: "silver", label: "Silver (cold, cone)" },
      { id: "white", label: "White (cold, cone)" },
    ],
    powers: [
      {
        id: "claws",
        level: 1,
        name: "Claws",
        summary:
          "Free action: claws deal 1d4 + Str; magic at 5th, 1d6 at 7th, +1d6 of your energy type at 11th.",
        resourcePool: { ...POOL_3_CHA, detail: "1d4+Str claws" },
      },
      {
        id: "dragonResistances",
        level: 3,
        name: "Dragon Resistances",
        summary:
          "Resist 5 to your energy type + 1 natural armor (10/+2 at 9th; +4 natural armor at 15th, resistance unchanged).",
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 15), 4, if(gte(@classes.sorcerer.level, 9), 2, 1))",
            "nac",
            "natural",
          ),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Energy resistance (5, 10 at 9th) is to your chosen dragon type only — not tracked as a Change since the type is a free-text pick; add it manually.",
          },
        ],
      },
      {
        id: "breathWeapon",
        level: 9,
        name: "Breath Weapon",
        summary:
          "Breathe your energy type for 1d6 damage per sorcerer level (Reflex DC 10 + 1/2 sorcerer level + Cha for half); line or cone per dragon type.",
        resourcePool: burstPool(9),
      },
      {
        id: "wings",
        level: 15,
        name: "Wings",
        summary: "Grow leathery wings for a fly speed of 60 ft. (average maneuverability), dismissible as a free action.",
        changes: [c("60", "flySpeed", "untyped")],
      },
      {
        id: "powerOfWyrms",
        level: 20,
        name: "Power of Wyrms",
        summary: "Immune to paralysis, sleep, and your energy type; blindsense 60 ft.",
        contextNotes: [{ target: "allChecks", text: "Immunities and blindsense aren't tracked on the sheet — display only." }],
      },
    ],
  },
  // ---- Elemental ----------------------------------------------------------------
  {
    tag: "Elemental",
    name: "Elemental",
    arcana: {
      summary: "Spells you cast that deal energy damage can have their damage type changed to match your chosen element.",
      changes: [],
      contextNotes: [{ target: "allChecks", text: "Energy-type swap is a casting-time choice — not modeled numerically." }],
    },
    variantPrompt: "Element (sets your energy type and 15th-level movement mode)",
    variantOptions: [
      { id: "air", label: "Air (electricity, fly 60 ft.)" },
      { id: "earth", label: "Earth (acid, burrow 30 ft.)" },
      { id: "fire", label: "Fire (fire, +30 ft. speed)" },
      { id: "water", label: "Water (cold, swim 60 ft.)" },
    ],
    powers: [
      {
        id: "elementalRay",
        level: 1,
        name: "Elemental Ray",
        summary: "Ranged touch attack (30 ft.): 1d6 + 1 per two sorcerer levels of your energy type.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist 10 to your chosen energy type (20 at 9th level).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Resistance is to your chosen element's energy type only — not tracked as a Change since the choice is free-text; add it manually.",
          },
        ],
      },
      {
        id: "elementalBlast",
        level: 9,
        name: "Elemental Blast",
        summary:
          "20-ft.-radius burst (60 ft. range): 1d6 damage per sorcerer level of your energy type; failed Reflex (DC 10 + 1/2 sorcerer level + Cha) also grants vulnerability to that type until your next turn.",
        resourcePool: burstPool(9),
      },
      {
        id: "elementalMovement",
        level: 15,
        name: "Elemental Movement",
        summary:
          "Gain a movement mode keyed to your element: Air flies 60 ft., Earth burrows 30 ft., Fire adds 30 ft. to base speed, Water swims 60 ft.",
        contextNotes: [
          { target: "allChecks", text: "Movement mode depends on your chosen element — not tracked as a Change; add it manually." },
        ],
      },
      {
        id: "elementalBody",
        level: 20,
        name: "Elemental Body",
        summary: "Immune to sneak attacks, critical hits, and damage of your chosen energy type.",
        contextNotes: [{ target: "allChecks", text: "Immunities aren't tracked on the sheet — display only." }],
      },
    ],
  },
  // ---- Fey ------------------------------------------------------------------------
  {
    tag: "Fey",
    name: "Fey",
    arcana: {
      summary: "Whenever you cast a spell of the compulsion subschool, its save DC increases by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+2 DC only on compulsion-subschool spells — apply manually." },
      ],
    },
    powers: [
      {
        id: "laughingTouch",
        level: 1,
        name: "Laughing Touch",
        summary:
          "Melee touch attack: target laughs uncontrollably for 1 round (move actions only); 24-hour immunity afterward.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "woodlandStride",
        level: 3,
        name: "Woodland Stride",
        summary: "Move through natural undergrowth at normal speed without harm or impediment.",
        contextNotes: [{ target: "landSpeed", text: "Magically manipulated terrain still affects you — display only." }],
      },
      {
        id: "fleetingGlance",
        level: 9,
        name: "Fleeting Glance",
        summary: "Turn invisible (as greater invisibility) for a number of rounds per day equal to sorcerer level.",
        resourcePool: { usesFormula: "@classes.sorcerer.level", per: "day", detail: "Rounds of invisibility/day" },
      },
      {
        id: "feyMagic",
        level: 15,
        name: "Fey Magic",
        summary: "Reroll a caster level check to overcome spell resistance, taking the second result.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "soulOfTheFey",
        level: 20,
        name: "Soul of the Fey",
        summary:
          "Immune to poison; DR 10/cold iron; animals won't attack you unless magically forced to; cast shadow walk once/day.",
        changes: [c("10", "dr.cold-iron", "untyped")],
        contextNotes: [
          { target: "allChecks", text: "Also grants poison immunity, animal non-aggression, and shadow walk (display only)." },
        ],
      },
    ],
  },
  // ---- Infernal -------------------------------------------------------------------
  {
    tag: "Infernal",
    name: "Infernal",
    arcana: {
      summary: "Whenever you cast a spell of the charm subschool, its save DC increases by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+2 DC only on charm-subschool spells — apply manually." },
      ],
    },
    powers: [
      {
        id: "corruptingTouch",
        level: 1,
        name: "Corrupting Touch",
        summary:
          "Melee touch attack: target is shaken for 1/2 sorcerer level rounds (minimum 1).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "infernalResistances",
        level: 3,
        name: "Infernal Resistances",
        summary: "Resist fire 5 and +2 vs. poison (fire 10, +4 vs. poison at 9th).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          { target: "allSavingThrows", text: "+2 (+4 at 9th) vs. poison only — not a general save bonus." },
        ],
      },
      {
        id: "hellfire",
        level: 9,
        name: "Hellfire",
        summary:
          "10-ft.-radius burst (60 ft. range): 1d6 fire damage per sorcerer level, Reflex DC 10 + 1/2 sorcerer level + Cha for half.",
        resourcePool: burstPool(9),
      },
      {
        id: "onDarkWings",
        level: 15,
        name: "On Dark Wings",
        summary: "Grow bat wings as a standard action for a fly speed of 60 ft. (average maneuverability).",
        changes: [c("60", "flySpeed", "untyped")],
      },
      {
        id: "powerOfThePit",
        level: 20,
        name: "Power of the Pit",
        summary:
          "Immune to fire and poison; resist acid 10 and cold 10; see perfectly in darkness to 60 ft.",
        changes: [c("10", "eres.acid", "untyped"), c("10", "eres.cold", "untyped")],
        contextNotes: [
          { target: "allChecks", text: "Also grants fire/poison immunity and 60-ft. darkvision (display only)." },
        ],
      },
    ],
  },
  // ---- Undead -----------------------------------------------------------------
  {
    tag: "Undead",
    name: "Undead",
    arcana: {
      summary:
        "Corporeal undead that were once humanoid are treated as humanoid for your mind-affecting spells.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Only relevant when targeting certain undead with mind-affecting spells." },
      ],
    },
    powers: [
      {
        id: "graveTouch",
        level: 1,
        name: "Grave Touch",
        summary:
          "Melee touch attack: living target shaken for 1/2 sorcerer level rounds (min 1); if its HD is below your sorcerer level, frightened for 1 round instead.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "deathsGift",
        level: 3,
        name: "Death's Gift",
        summary: "Resist cold 5 and DR 5/— vs. nonlethal damage (cold 10 and DR 10/— vs. nonlethal at 9th).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "The DR (5, 10 at 9th) applies only to nonlethal damage — not modeled as a general DR Change.",
          },
        ],
      },
      {
        id: "graspOfTheDead",
        level: 9,
        name: "Grasp of the Dead",
        summary:
          "20-ft.-radius burst (60 ft. range) of skeletal arms: 1d6 damage per sorcerer level, Reflex DC 10 + 1/2 sorcerer level + Cha for half (failure also halts movement 1 round).",
        resourcePool: burstPool(9),
      },
      {
        id: "incorporealForm",
        level: 15,
        name: "Incorporeal Form",
        summary: "Become incorporeal for 1 round per sorcerer level (half damage from corporeal magic sources).",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "oneOfUs",
        level: 20,
        name: "One of Us",
        summary:
          "Immune to cold, nonlethal damage, paralysis, and sleep; DR 5/—; unintelligent undead ignore you; +4 morale vs. undead spells/abilities.",
        changes: [c("5", "dr", "untyped")],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 morale vs. undead spells/abilities only — not a general save bonus." },
        ],
      },
    ],
  },
];

export const BLOODLINES: Record<string, BloodlineDef> = Object.fromEntries(
  BLOODLINE_LIST.map((b) => [b.tag, b]),
);

export const BLOODLINE_TAGS: readonly string[] = BLOODLINE_LIST.map((b) => b.tag);

/** Human-readable label for a bloodline's chosen variant id, or `undefined` if unset/unknown. */
export function bloodlineVariantLabel(tag: string, variantId: string | undefined): string | undefined {
  if (!variantId) return undefined;
  const bloodline = BLOODLINES[tag];
  return bloodline?.variantOptions?.find((v) => v.id === variantId)?.label;
}
