/**
 * Clean-room PF1 sorcerer bloodline arcana + powers table (DESIGN §6):
 * hand-authored from the published Core Rulebook rules (verified against SRD
 * text) — bloodline ARCANA and POWERS are prose-only upstream (only
 * `RefData.bloodlineSpellLists` is vendored, i.e. bonus spells known; see
 * `packages/schema/src/refdata.ts`), so there is no Foundry class-feature
 * data to normalize for them. Same posture as `traits.ts`/`conditions.ts` for
 * content the compendium doesn't carry.
 *
 * Scope: every published Paizo sorcerer bloodline — the 10 Core Rulebook
 * ones (issue #34) plus the full later-splatbook catalog, hand-authored from
 * aonprd.com. `packages/data-pipeline` vendors bloodline spell tags for
 * bonus-spell lists; bloodlines the upstream pack never tags ("Aberrant" and
 * a dozen splatbook ones) get hand-authored lists as a data-pipeline
 * supplement (issue #38 — see `data-pipeline/src/supplements.ts`); this
 * table's arcana/powers are independent of the spell-list dataset.
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
 *     records it. Powers whose numbers depend on that pick carry
 *     `variantChanges` — per-variant `Change` lists collect.ts applies only
 *     when the stored variant matches a key (Dragon Resistances' scaling
 *     energy resistance, Elemental Resistance, Elemental Movement's mode).
 *     No stored variant, or a stale id, emits nothing — the same safe
 *     default as `pickChoices` (`variantLabel` likewise returns `undefined`,
 *     never a crash).
 *   - `bonusFeatSlugs` (issue #57) is the bloodline's "Bonus Feats" list (CRB:
 *     a sorcerer picks one of these — no prerequisites waived, unlike a
 *     ranger's combat style — at 7th level and every six levels thereafter).
 *     Hand-authored clean-room from published SRD text (d20pfsrd.com bloodline
 *     pages), `featNameSlug`-normalized to match the vendored feat dataset by
 *     name. Several list entries name a specific Skill Focus sub-choice (e.g.
 *     Aberrant's "Skill Focus (Knowledge [dungeoneering])") — only the base
 *     feat ("skill-focus") is tracked here; the sub-skill restriction isn't
 *     modeled, matching the project's existing choice-feat granularity (Skill
 *     Focus's own skill picker is unconstrained by class already).
 */

import type { Change, ContextNote, RefData, SorcererBloodline, SourceRef } from "@pf1/schema";

import { featNameSlug } from "./feat-effects.js";

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
  /**
   * Per-variant Changes, keyed by `variantOptions` id — applied only when
   * `doc.build.sorcererBloodlineVariant` matches a key (see file doc
   * comment). No stored variant, or a stale id, emits nothing.
   */
  variantChanges?: Readonly<Record<string, readonly Change[]>>;
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
  /**
   * `featNameSlug`s of this bloodline's "Bonus Feats" list (see file doc
   * comment) — the feat picker restricts a sorcerer's bloodline-feat slots
   * (issue #57) to this list.
   */
  bonusFeatSlugs: readonly string[];
}

const c = (formula: string, target: string, type: string, operator?: "add" | "set"): Change => ({
  formula,
  target,
  type,
  ...(operator ? { operator } : {}),
});

/** `featNameSlug` every name in a bloodline's "Bonus Feats" list. */
const feats = (...names: string[]): readonly string[] => names.map((n) => featNameSlug(n));

/** CRB dragon type → its energy type — shared by every dragon-type variant list (sorcerer Draconic here, bloodrager Draconic in `bloodrager-bloodlines.ts`). */
export const DRAGON_TYPE_ENERGY: Readonly<Record<string, string>> = {
  black: "acid",
  blue: "electricity",
  brass: "fire",
  bronze: "electricity",
  copper: "acid",
  gold: "fire",
  green: "acid",
  red: "fire",
  silver: "cold",
  white: "cold",
};

/** The four classic elements → their energy type (CRB Elemental bloodline chart), shared with `bloodrager-bloodlines.ts`. */
export const ELEMENT_ENERGY: Readonly<Record<string, string>> = {
  air: "electricity",
  earth: "acid",
  fire: "fire",
  water: "cold",
};

/** Per-variant `eres.<energy>` grants for a whole variant→energy map, all sharing one scaling formula. */
export function energyResistanceVariantChanges(
  variantEnergy: Readonly<Record<string, string>>,
  formula: string,
): Readonly<Record<string, readonly Change[]>> {
  return Object.fromEntries(
    Object.entries(variantEnergy).map(([variant, energy]) => [
      variant,
      [c(formula, `eres.${energy}`, "untyped")],
    ]),
  );
}

/**
 * Per-variant `imm.<energy>` grants (true damage immunity, not resistance) for
 * a whole variant→energy map — the Draconic/Elemental capstones' "immune to
 * damage of your energy type" clause, unconditional once the capstone is
 * held. Immunity is a flag (`defenses.ts`'s `groupImmunities`): any positive
 * source turns it on, so a bare `"1"` formula is the whole grant.
 */
export function energyImmunityVariantChanges(
  variantEnergy: Readonly<Record<string, string>>,
): Readonly<Record<string, readonly Change[]>> {
  return Object.fromEntries(
    Object.entries(variantEnergy).map(([variant, energy]) => [
      variant,
      [c("1", `imm.${energy}`, "untyped")],
    ]),
  );
}

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
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Improved Disarm",
      "Improved Grapple",
      "Improved Initiative",
      "Improved Unarmed Strike",
      "Iron Will",
      "Silent Spell",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell of the polymorph subschool, its duration increases by 50% (minimum 1 round).",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+50% duration on polymorph-subschool spells only — apply manually.",
        },
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
        summary: "+5 ft. reach on melee touch attacks (+10 ft. at 11th, +15 ft. at 17th).",
        contextNotes: [
          {
            target: "reach",
            text: "Only extends reach for melee touch attacks — situational, not auto-applied.",
          },
        ],
      },
      {
        id: "unusualAnatomy",
        level: 9,
        name: "Unusual Anatomy",
        summary: "25% chance to ignore a critical hit or sneak attack (50% at 13th level).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Roll the percentile chance manually when hit by a crit/sneak attack.",
          },
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
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Aberrant): "At 20th
        // level, your body becomes truly unnatural. You are immune to
        // critical hits and sneak attacks. In addition, you gain blindsight
        // with a range of 60 feet and damage reduction 5/—." Sneak attack is
        // precision damage (immEffect.precisionDamage); "immune to critical
        // hits" is immEffect.criticalHits verbatim — both in the closed
        // EFFECT_IMMUNITY_LABELS vocabulary, same mapping the Elemental
        // bloodline's capstone uses below.
        changes: [
          c("60", "sensebs", "untyped"),
          c("5", "dr", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
        ],
      },
    ],
  },
  // ---- Abyssal ---------------------------------------------------------------
  {
    tag: "Abyssal",
    name: "Abyssal",
    bonusFeatSlugs: feats(
      "Augment Summoning",
      "Cleave",
      "Empower Spell",
      "Great Fortitude",
      "Improved Bull Rush",
      "Improved Sunder",
      "Power Attack",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a summon monster spell, the summoned creatures gain DR/good equal to 1/2 your sorcerer level (minimum 1).",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "DR/good applies to summoned creatures, not you — situational, not auto-applied.",
        },
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
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.electricity", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. poison only — not a general save bonus.",
          },
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
        contextNotes: [
          { target: "allChecks", text: "Only affects demon/fiendish summon monster spells." },
        ],
      },
      {
        id: "demonicMight",
        level: 20,
        name: "Demonic Might",
        summary:
          "Immune to electricity and poison; resist acid 10, cold 10, and fire 10; telepathy 60 ft.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Abyssal): "At 20th
        // level, the power of the Abyss flows through you. You gain immunity
        // to electricity and poison. You also gain resistance to acid 10,
        // cold 10, and fire 10, and gain telepathy with a range of 60 feet."
        changes: [
          c("10", "eres.acid", "untyped"),
          c("10", "eres.cold", "untyped"),
          c("10", "eres.fire", "untyped"),
          c("1", "imm.electricity", "untyped"),
          c("1", "immEffect.poison", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also grants 60-ft. telepathy — no telepathy sense target on the sheet, display only.",
          },
        ],
      },
    ],
  },
  // ---- Arcane ------------------------------------------------------------------
  {
    tag: "Arcane",
    name: "Arcane",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Improved Counterspell",
      "Improved Initiative",
      "Iron Will",
      "Scribe Scroll",
      "Skill Focus",
      "Spell Focus",
      "Still Spell",
    ),
    arcana: {
      summary:
        "Whenever you apply a metamagic feat that increases a spell's effective slot by at least one level, the spell's save DC increases by 1.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 DC only on metamagic'd spells that raise the slot level — apply manually.",
        },
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
        contextNotes: [
          { target: "allChecks", text: "Add the chosen spell to your known-spells list manually." },
        ],
      },
      {
        id: "schoolPower",
        level: 15,
        name: "School Power",
        summary: "Spells of one chosen school gain +2 to their save DC (stacks with Spell Focus).",
        contextNotes: [
          { target: "allChecks", text: "+2 DC only for the chosen school — apply manually." },
        ],
      },
      {
        id: "arcaneApotheosis",
        level: 20,
        name: "Arcane Apotheosis",
        summary:
          "Apply metamagic feats without increasing casting time at will; may expend spell slots (3 slot-levels per charge) to power charged magic items.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Display only — no charge-conversion tracking on the sheet.",
          },
        ],
      },
    ],
  },
  // ---- Celestial --------------------------------------------------------------
  {
    tag: "Celestial",
    name: "Celestial",
    bonusFeatSlugs: feats(
      "Dodge",
      "Extend Spell",
      "Iron Will",
      "Mobility",
      "Mounted Combat",
      "Ride-By Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a summon monster spell, the summoned creatures gain DR/evil equal to 1/2 your sorcerer level (minimum 1).",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "DR/evil applies to summoned creatures, not you — situational, not auto-applied.",
        },
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
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of flight/day",
        },
      },
      {
        id: "conviction",
        level: 15,
        name: "Conviction",
        summary:
          "Reroll one ability check, attack roll, skill check, or saving throw before results are revealed.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "ascension",
        level: 20,
        name: "Ascension",
        summary:
          "Immune to acid, cold, and petrification; resist electricity 10 and fire 10; +4 vs. poison; unlimited Wings of Heaven; speak with any creature.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Celestial): "At
        // 20th level, you become infused with the power of the heavens. You
        // gain immunity to acid, cold, and petrification. You also gain
        // resist electricity 10, resist fire 10, and a +4 racial bonus on
        // saves against poison. Finally, you gain unlimited use of the wings
        // of heaven ability. Finally, you gain the ability to speak with any
        // creature that has a language (as per the tongues spell)."
        changes: [
          c("10", "eres.electricity", "untyped"),
          c("10", "eres.fire", "untyped"),
          c("1", "imm.acid", "untyped"),
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.petrification", "untyped"),
        ],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 vs. poison only — not a general save bonus." },
          {
            target: "allChecks",
            text: "Also grants unlimited flight and tongues (display only).",
          },
        ],
      },
    ],
  },
  // ---- Destined ---------------------------------------------------------------
  {
    tag: "Destined",
    name: "Destined",
    bonusFeatSlugs: feats(
      "Arcane Strike",
      "Diehard",
      "Endurance",
      "Leadership",
      "Lightning Reflexes",
      "Maximize Spell",
      "Skill Focus",
      "Weapon Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell with a range of personal, you gain a luck bonus equal to the spell's level on saving throws for 1 round.",
      changes: [],
      contextNotes: [
        {
          target: "allSavingThrows",
          text: "Luck bonus only for 1 round after a personal-range spell — apply manually.",
        },
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
          {
            target: "ac",
            text: "Only applies during a surprise round or while unaware of the attack — situational.",
          },
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
        contextNotes: [
          {
            target: "allChecks",
            text: "Only triggers on a killing blow — situational, not auto-applied.",
          },
        ],
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
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Great Fortitude",
      "Improved Initiative",
      "Power Attack",
      "Quicken Spell",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "+1 hit point per sorcerer level. Whenever you cast a spell that deals energy damage of your dragon type, it deals +1 damage per die rolled.",
      changes: [c("@classes.sorcerer.level", "hp", "untyped")],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 damage/die only on spells matching your dragon type's energy — apply manually.",
        },
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
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Draconic): "At 3rd
        // level, you gain resist 5 against your energy type and a +1 natural
        // armor bonus. At 9th level, your energy resistance increases to 10
        // and natural armor bonus increases to +2. At 15th level, your
        // natural armor bonus increases to +4." (Resistance stays 10.)
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 15), 4, if(gte(@classes.sorcerer.level, 9), 2, 1))",
            "nac",
            "natural",
          ),
        ],
        variantChanges: energyResistanceVariantChanges(
          DRAGON_TYPE_ENERGY,
          "if(gte(@classes.sorcerer.level, 9), 10, 5)",
        ),
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
        summary:
          "Grow leathery wings for a fly speed of 60 ft. (average maneuverability), dismissible as a free action.",
        changes: [c("60", "flySpeed", "untyped")],
      },
      {
        id: "powerOfWyrms",
        level: 20,
        name: "Power of Wyrms",
        summary: "Immune to paralysis, sleep, and your energy type; blindsense 60 ft.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Draconic): "At 20th
        // level, your draconic heritage becomes manifest. You gain immunity
        // to paralysis, sleep, and damage of your energy type. You also gain
        // blindsense 60 feet."
        changes: [
          c("60", "sensebse", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        variantChanges: energyImmunityVariantChanges(DRAGON_TYPE_ENERGY),
      },
    ],
  },
  // ---- Elemental ----------------------------------------------------------------
  {
    tag: "Elemental",
    name: "Elemental",
    bonusFeatSlugs: feats(
      "Dodge",
      "Empower Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Spells you cast that deal energy damage can have their damage type changed to match your chosen element.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Energy-type swap is a casting-time choice — no number to track here.",
        },
      ],
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
        summary:
          "Ranged touch attack (30 ft.): 1d6 + 1 per two sorcerer levels of your energy type.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist 10 to your chosen energy type (20 at 9th level).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Elemental): "At 3rd
        // level, you gain energy resistance 10 against your energy type. At
        // 9th level, your energy resistance increases to 20."
        variantChanges: energyResistanceVariantChanges(
          ELEMENT_ENERGY,
          "if(gte(@classes.sorcerer.level, 9), 20, 10)",
        ),
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
          "Gain a movement mode keyed to your element: Air flies 60 ft. (average), Earth burrows 30 ft., Fire adds 30 ft. to base speed, Water swims 60 ft.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Elemental) chart:
        // air fly 60 ft. (average), earth burrow 30 ft., fire +30 ft. base
        // speed, water swim 60 ft. Whole-speed GRANTS use `operator: "set"`
        // and fire's "+30 ft." stays additive — the same convention as
        // rage-powers.ts's Greater Elemental Blood (see that entry's comment
        // on applySpeedTarget's set semantics). Maneuverability is
        // prose-only, as everywhere else.
        variantChanges: {
          air: [c("60", "flySpeed", "base", "set")],
          earth: [c("30", "burrowSpeed", "base", "set")],
          fire: [c("30", "landSpeed", "untyped")],
          water: [c("60", "swimSpeed", "base", "set")],
        },
      },
      {
        id: "elementalBody",
        level: 20,
        name: "Elemental Body",
        summary: "Immune to sneak attacks, critical hits, and damage of your chosen energy type.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Elemental): "At
        // 20th level, elemental power surges through your body. You gain
        // immunity to sneak attacks, critical hits, and damage from your
        // energy type." Sneak attack is precision damage
        // (immEffect.precisionDamage); "critical hits" is immEffect.criticalHits
        // verbatim.
        changes: [
          c("1", "immEffect.precisionDamage", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
        ],
        variantChanges: energyImmunityVariantChanges(ELEMENT_ENERGY),
      },
    ],
  },
  // ---- Fey ------------------------------------------------------------------------
  {
    tag: "Fey",
    name: "Fey",
    bonusFeatSlugs: feats(
      "Dodge",
      "Improved Initiative",
      "Lightning Reflexes",
      "Mobility",
      "Point-Blank Shot",
      "Precise Shot",
      "Quicken Spell",
      "Skill Focus",
    ),
    arcana: {
      summary: "Whenever you cast a spell of the compulsion subschool, its save DC increases by 2.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+2 DC only on compulsion-subschool spells — apply manually.",
        },
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
        contextNotes: [
          {
            target: "landSpeed",
            text: "Magically manipulated terrain still affects you — display only.",
          },
        ],
      },
      {
        id: "fleetingGlance",
        level: 9,
        name: "Fleeting Glance",
        summary:
          "Turn invisible (as greater invisibility) for a number of rounds per day equal to sorcerer level.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of invisibility/day",
        },
      },
      {
        id: "feyMagic",
        level: 15,
        name: "Fey Magic",
        summary:
          "Reroll a caster level check to overcome spell resistance, taking the second result.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "soulOfTheFey",
        level: 20,
        name: "Soul of the Fey",
        summary:
          "Immune to poison; DR 10/cold iron; animals won't attack you unless magically forced to; cast shadow walk once/day.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Fey): "At 20th
        // level, your soul becomes one with the world of the fey. You gain
        // immunity to poison and DR 10/cold iron. Creatures of the animal
        // type do not attack you unless compelled to do so through magic.
        // Once per day, you can cast shadow walk as a spell-like ability
        // using your sorcerer level as your caster level."
        changes: [c("10", "dr.cold-iron", "untyped"), c("1", "immEffect.poison", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also grants animal non-aggression and shadow walk (display only).",
          },
        ],
      },
    ],
  },
  // ---- Infernal -------------------------------------------------------------------
  {
    tag: "Infernal",
    name: "Infernal",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Combat Expertise",
      "Deceitful",
      "Extend Spell",
      "Improved Disarm",
      "Iron Will",
      "Skill Focus",
      "Spell Penetration",
    ),
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
        summary: "Melee touch attack: target is shaken for 1/2 sorcerer level rounds (minimum 1).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "infernalResistances",
        level: 3,
        name: "Infernal Resistances",
        summary: "Resist fire 5 and +2 vs. poison (fire 10, +4 vs. poison at 9th).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. poison only — not a general save bonus.",
          },
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
        summary:
          "Grow bat wings as a standard action for a fly speed of 60 ft. (average maneuverability).",
        changes: [c("60", "flySpeed", "untyped")],
      },
      {
        id: "powerOfThePit",
        level: 20,
        name: "Power of the Pit",
        summary:
          "Immune to fire and poison; resist acid 10 and cold 10; see perfectly in darkness to 60 ft.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Infernal): "Your
        // form becomes infused with vile power. You gain immunity to fire
        // and poison. You also gain resistance to acid 10 and cold 10, and
        // the ability to see perfectly in darkness of any kind to a range of
        // 60 feet." The 60-ft. cap is exactly darkvision's shape; the "of any
        // kind" (i.e. penetrates magical darkness too) piece has no
        // range-limited sense target to hold it, so only the numeric
        // darkvision half is modeled.
        changes: [
          c("10", "eres.acid", "untyped"),
          c("10", "eres.cold", "untyped"),
          c("1", "imm.fire", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("60", "sensedv", "untyped", "set"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also sees through magical darkness within that 60 ft. — the darkvision number is tracked, that extra qualifier isn't.",
          },
        ],
      },
    ],
  },
  // ---- Undead -----------------------------------------------------------------
  {
    tag: "Undead",
    name: "Undead",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Diehard",
      "Endurance",
      "Iron Will",
      "Skill Focus",
      "Spell Focus",
      "Still Spell",
      "Toughness",
    ),
    arcana: {
      summary:
        "Corporeal undead that were once humanoid are treated as humanoid for your mind-affecting spells.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Only relevant when targeting certain undead with mind-affecting spells.",
        },
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
        summary:
          "Resist cold 5 and DR 5/— vs. nonlethal damage (cold 10 and DR 10/— vs. nonlethal at 9th).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "The DR (5, 10 at 9th) applies only to nonlethal damage — not folded into your general DR total.",
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
        summary:
          "Become incorporeal for 1 round per sorcerer level (half damage from corporeal magic sources).",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "oneOfUs",
        level: 20,
        name: "One of Us",
        summary:
          "Immune to cold, nonlethal damage, paralysis, and sleep; DR 5/—; unintelligent undead ignore you; +4 morale vs. undead spells/abilities.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Undead): "At 20th
        // level, your form begins to rot ... and undead see you as one of
        // them. You gain immunity to cold, nonlethal damage, paralysis, and
        // sleep. You also gain DR 5/—. Unintelligent undead do not notice you
        // unless you attack them. You receive a +4 morale bonus on saving
        // throws made against spells and spell-like abilities cast by
        // undead." Nonlethal damage isn't a damage TYPE (it's a category of
        // hit, not a `DamageTypeId`) — no `imm.<x>` target can hold it, same
        // gap `rage-powers.ts`'s Undead Blood note documents.
        changes: [
          c("5", "dr", "untyped"),
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+4 morale vs. undead spells/abilities only — not a general save bonus.",
          },
          {
            target: "allChecks",
            text: "Also immune to nonlethal damage — no damage-type target holds that, so it stays manual.",
          },
        ],
      },
    ],
  },
  /* ------------------------------------------------ splatbook bloodlines --
   * Every published Paizo sorcerer bloodline beyond the Core Rulebook ten,
   * hand-authored clean-room from aonprd.com (OGL/Community Use) under the
   * same modelling posture as the entries above. Alphabetical. */
  // ---- Accursed ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Accursed)
  {
    tag: "Accursed",
    name: "Accursed",
    bonusFeatSlugs: feats(
      "Alertness",
      "Blind-Fight",
      "Combat Casting",
      "Deceitful",
      "Defensive Combat Training",
      "Endurance",
      "Great Fortitude",
      "Mounted Combat",
    ),
    arcana: {
      summary:
        "You count as a hag for joining a hag's coven (which must still include an actual hag). Within 30 feet of another Accursed sorcerer or a coven-hex witch, you can use aid another to grant them a +1 bonus to caster level for 1 round.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "The caster level aid another action is a situational choice, not an always-on bonus.",
        },
      ],
    },
    powers: [
      {
        id: "horrificVisage",
        level: 1,
        name: "Horrific Visage",
        summary:
          "Standard action: force one target within 30 ft. to make a Will save (DC 10 + 1/2 sorcerer level + Cha) or be shaken for 1 round per 2 sorcerer levels (minimum 1).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "wretchedEndurance",
        level: 3,
        name: "Wretched Endurance",
        summary:
          "+2 bonus on saving throws against charm, cold, fear, fire, and sleep effects (+4 at 9th level).",
        changes: [],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. charm, cold, fear, fire, and sleep effects only, not a general save bonus.",
          },
        ],
      },
      {
        id: "dreadGaze",
        level: 9,
        name: "Dread Gaze",
        summary:
          "Standard action: fix your gaze on a creature within 60 ft.; it makes a Will save (DC 10 + 1/2 sorcerer level + Cha) or is staggered for 1 round per 2 sorcerer levels. Usable once per day (twice at 17th, three times at 20th).",
        resourcePool: burstPool(9),
      },
      {
        id: "dreamWalking",
        level: 15,
        name: "Dream Walking",
        summary:
          "Enter the Ethereal Plane as ethereal jaunt, but for 1 minute per 2 sorcerer levels; once during the trip you may cast nightmare as a spell-like ability on a creature you see on the Material Plane.",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "AoN's text states no daily use limit for this power, display only.",
          },
        ],
      },
      {
        id: "fearsomeSurvival",
        level: 20,
        name: "Fearsome Survival",
        summary: "Damage reduction 10/cold iron and spell resistance equal to 6 + sorcerer level.",
        changes: [
          c("10", "dr.cold-iron", "untyped"),
          c("@classes.sorcerer.level + 6", "spellResist", "untyped", "set"),
        ],
      },
    ],
  },
  // ---- Aquatic ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Aquatic)
  {
    tag: "Aquatic",
    name: "Aquatic",
    bonusFeatSlugs: feats(
      "Athletic",
      "Brew Potion",
      "Defensive Combat Training",
      "Dodge",
      "Mobility",
      "Silent Spell",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell of the water type, your effective caster level increases by one; summoned creatures with a swim speed or the aquatic or water type gain a +1 morale bonus on attack and damage rolls.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Only applies to water-type spells and to qualifying summoned creatures, not to you generally.",
        },
      ],
    },
    powers: [
      {
        id: "dehydratingTouch",
        level: 1,
        name: "Dehydrating Touch",
        summary:
          "Melee touch attack: 1d6 nonlethal damage + 1 per two sorcerer levels and sickens the target for 1 round; lethal instead against oozes, plants, and aquatic or water creatures.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6 + 1/2 lvl nonlethal" },
      },
      {
        id: "aquaticAdaptation",
        level: 3,
        name: "Aquatic Adaptation",
        summary:
          "Swim speed 30 ft. (60 ft. at 15th). At 9th level, gain the amphibious quality, +1 natural armor, and resist cold 5; while immersed in water, gain blindsense 30 ft. (60 ft. at 15th).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Aquatic): the +1
        // natural armor and resist cold 5 first appear at 9th level, inside
        // this same power, so their formulas resolve to 0 before then rather
        // than being split into a separate power entry.
        changes: [
          c("if(gte(@classes.sorcerer.level, 15), 60, 30)", "swimSpeed", "base", "set"),
          c("if(gte(@classes.sorcerer.level, 9), 1, 0)", "nac", "natural"),
          c("if(gte(@classes.sorcerer.level, 9), 5, 0)", "eres.cold", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Blindsense only while immersed in water, not applied as an always-on sense.",
          },
        ],
      },
      {
        id: "aquaticTelepathy",
        level: 9,
        name: "Aquatic Telepathy",
        summary:
          "Telepathy 100 ft. with swimming or aquatic or water creatures; cast suggestion on such creatures a number of times per day equal to your Charisma modifier. At 15th level, once per day telepathically call one for demand or greater planar ally instead.",
        resourcePool: { usesFormula: "@abilities.cha.mod", per: "day", detail: "Suggestion" },
        contextNotes: [
          {
            target: "allChecks",
            text: "The 15th level demand or greater planar ally use is a separate once per day effect, display only.",
          },
        ],
      },
      {
        id: "raiseTheDeep",
        level: 15,
        name: "Raise the Deep",
        summary:
          "Create water as control water without water needing to be present, lasting 1 round per sorcerer level (dimensions doubled at 20th). Once per day.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "deepOne",
        level: 20,
        name: "Deep One",
        summary:
          "Blindsense 60 ft., DR 10/piercing, resist cold 20, and continuous freedom of movement; underwater, also evasion, blindsight 120 ft., and immunity to water pressure damage.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Aquatic): unlike
        // Aquatic Adaptation's earlier "when immersed" blindsense, this 60
        // ft. blindsense is granted outright, so it's unconditional here.
        changes: [
          c("60", "sensebse", "untyped"),
          c("10", "dr.piercing", "untyped"),
          c("20", "eres.cold", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Freedom of movement has no matching target; the underwater evasion, blindsight, and pressure immunity stay display only.",
          },
        ],
      },
    ],
  },
  // ---- Astral ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Astral)
  {
    tag: "Astral",
    name: "Astral",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Dodge",
      "Forge Ring",
      "Improved Initiative",
      "Lightning Reflexes",
      "Quicken Spell",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "When you cast a spell, you can choose to enhance the next spell you cast before the end of your next turn, increasing its save DC by 1.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "A per-spell choice made when casting the prior spell, apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "astralWarp",
        level: 1,
        name: "Astral Warp",
        summary:
          "Create a 5 ft. cube distortion field within 30 ft. that lasts until the start of your next turn: creatures entering it or starting their turn there take 1d4 force damage + 1 per two sorcerer levels (Fortitude negates) and take a -1 penalty on Reflex saves and to AC while inside.",
        resourcePool: { ...POOL_3_CHA, detail: "1d4 + 1/2 lvl force" },
      },
      {
        id: "peerlessSpeed",
        level: 3,
        name: "Peerless Speed",
        summary:
          "Once per day as a swift action, cast a cantrip you know as though quickened without raising its level; from 5th level onward, the maximum spell level you can augment this way rises by 1 every 2 levels, to 8th level at 19th.",
        resourcePool: { usesFormula: "1", per: "day" },
        contextNotes: [
          {
            target: "allChecks",
            text: "On the Astral Plane or a plane with the enhanced magic trait, you may empower or maximize instead of quicken, display only.",
          },
        ],
      },
      {
        id: "astralVoyager",
        level: 9,
        name: "Astral Voyager",
        summary:
          "Once per day, send your consciousness to the Astral Plane as lesser astral projection, bringing up to one willing creature per 2 sorcerer levels. At 13th level, cast plane shift once per day between the Material and Astral Planes only; at 17th, the projection functions as full astral projection.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "arrestTheFlow",
        level: 15,
        name: "Arrest the Flow",
        summary:
          "Once per day as an immediate action, halt the effects of one condition or affliction affecting you until the end of your next turn (twice per day at 19th level).",
        resourcePool: {
          usesFormula: "if(gte(@classes.sorcerer.level, 19), 2, 1)",
          per: "day",
        },
      },
      {
        id: "timelessSoul",
        level: 20,
        name: "Timeless Soul",
        summary:
          "Immune to the retroactive aging suffered when leaving a plane with the timeless planar trait.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Astral): "you
        // become immune to the retroactive aging side effects incurred when
        // leaving a plane with the timeless planar trait" maps directly to
        // the closed immEffect.magicalAging vocabulary.
        changes: [c("1", "immEffect.magicalAging", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also lets you return to your body on a Will save if your silver cord is severed, and reduces Quicken Spell's level adjustment to +3, display only.",
          },
        ],
      },
    ],
  },
  // ---- Boreal ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Boreal)
  {
    tag: "Boreal",
    name: "Boreal",
    bonusFeatSlugs: feats(
      "Arcane Strike",
      "Diehard",
      "Empower Spell",
      "Endurance",
      "Exotic Weapon Proficiency",
      "Power Attack",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary: "Whenever you cast a spell with the cold descriptor, its save DC increases by 1.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+1 DC only on cold-descriptor spells, apply manually." },
      ],
    },
    powers: [
      {
        id: "coldSteel",
        level: 1,
        name: "Cold Steel",
        summary:
          "Standard action: touch a weapon or up to 50 pieces of ammunition to grant the frost property for 1/2 sorcerer level rounds (minimum 1). At 9th level, confer icy burst instead at half duration.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "icewalker",
        level: 3,
        name: "Icewalker",
        summary:
          "Resist cold 5 (10 at 9th level); move across snow and ice without penalty or leaving tracks; at 9th level, climb icy surfaces as spider climb.",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "The tracked movement and 9th level spider climb over ice are display only.",
          },
        ],
      },
      {
        id: "snowShroud",
        level: 9,
        name: "Snow Shroud",
        summary:
          "Ignore concealment and Perception penalties from snow, ice, or fog; cloak yourself in swirling snow for a pool of rounds per day equal to sorcerer level (activated once per day at 9th, twice at 17th, three times at 20th), granting a 20% miss chance and a Stealth bonus equal to half sorcerer level in snowy or icy areas.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of chill shield cloak",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "The miss chance and Stealth bonus only apply while the cloak is active in snowy or icy terrain, display only.",
          },
        ],
      },
      {
        id: "blizzard",
        level: 15,
        name: "Blizzard",
        summary:
          "Create a winter storm centered on you: control winds, plus sleet storm and extreme cold across the area (not the eye at its center). Once per day.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "childOfAncientWinters",
        level: 20,
        name: "Child of Ancient Winters",
        summary:
          "Gain the cold subtype; immune to fatigue, exhaustion, sneak attacks, and critical hits. You also gain vulnerability to fire.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Boreal): sneak
        // attack is precision damage (immEffect.precisionDamage), "critical
        // hits" is immEffect.criticalHits verbatim. The cold subtype's
        // usual "immune to cold" isn't restated by this power's text, so it
        // stays unmodeled rather than assumed; there's no target for the
        // stated fire vulnerability.
        changes: [
          c("1", "immEffect.fatigue", "untyped"),
          c("1", "immEffect.exhaustion", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "The cold subtype and its usual cold immunity, plus the stated vulnerability to fire, are display only.",
          },
        ],
      },
    ],
  },
  // ---- Daemon ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Daemon)
  {
    tag: "Daemon",
    name: "Daemon",
    bonusFeatSlugs: feats(
      "Diehard",
      "Endurance",
      "Fast Healer",
      "Great Fortitude",
      "Heroic Defiance",
      "Heroic Recovery",
      "Sickening Spell",
      "Toughness",
    ),
    arcana: {
      summary:
        "Whenever a spell you cast kills a living creature with Intelligence 3 or higher, the caster level of any spell you cast next round increases by 1 for each creature that spell killed.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Triggered only by a killing spell, apply manually." },
      ],
    },
    powers: [
      {
        id: "wastingRay",
        level: 1,
        name: "Wasting Ray",
        summary:
          "Standard action: impose starvation or thirst on a living creature you can see within 30 ft. (once per 24 hours per target).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "daemonicResistances",
        level: 3,
        name: "Daemonic Resistances",
        summary:
          "Resist acid 5 and +2 on saves against poison and death effects (acid 10 and +4 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.acid", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. poison and death effects only, not a general save bonus.",
          },
        ],
      },
      {
        id: "ageOut",
        level: 9,
        name: "Age Out",
        summary:
          "Standard action: shift your effective age to the next aging step, ending a debilitating condition currently affecting you that originally allowed a Will or Fortitude save.",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only removes save-based conditions and can't push you past venerable, display only.",
          },
        ],
      },
      {
        id: "woundWarp",
        level: 15,
        name: "Wound Warp",
        summary:
          "Standard action: teleport to an unoccupied square adjacent to any dead creature within 10 ft. per caster level; adjacent creatures take 4d6 acid damage (Reflex half). Once per day (twice at 20th).",
        resourcePool: {
          usesFormula: "if(gte(@classes.sorcerer.level, 20), 2, 1)",
          per: "day",
          detail: "4d6 acid",
        },
      },
      {
        id: "oneWithAbaddon",
        level: 20,
        name: "One with Abaddon",
        summary:
          "Immune to acid, death effects, and poison; DR 5/good or silver; resist cold 10, electricity 10, and fire 10.",
        changes: [
          c("10", "eres.cold", "untyped"),
          c("10", "eres.electricity", "untyped"),
          c("10", "eres.fire", "untyped"),
          c("5", "dr.good-or-silver", "untyped"),
          c("1", "imm.acid", "untyped"),
          c("1", "immEffect.deathEffects", "untyped"),
          c("1", "immEffect.poison", "untyped"),
        ],
      },
    ],
  },
  // ---- Deep Earth ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Deep%20Earth)
  {
    tag: "Deep Earth",
    name: "Deep Earth",
    bonusFeatSlugs: feats(
      "Acrobatic Steps",
      "Alertness",
      "Blind-Fight",
      "Forge Ring",
      "Nimble Moves",
      "Skill Focus",
      "Stealthy",
      "Still Spell",
    ),
    arcana: {
      summary:
        "Whenever you and the target of your spell are both underground, the spell's save DC increases by 1.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Only when both you and the target are underground." },
      ],
    },
    powers: [
      {
        id: "tremor",
        level: 1,
        name: "Tremor",
        summary:
          "Standard action: shake the ground beneath a single creature within 30 ft., a trip maneuver using your sorcerer level + Charisma modifier in place of CMB.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "rockseer",
        level: 3,
        name: "Rockseer",
        summary:
          "Gain a dwarf's stonecunning (+4 instead of +2 if you're already a dwarf). At 9th level, gain tremorsense 30 ft. At 15th level, see through solid objects for a number of rounds per day equal to sorcerer level.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Deep%20Earth):
        // stonecunning is only a bonus "to notice unusual stonework," the
        // same narrow scope the Dwarf race's own Stonecunning racial trait
        // is modeled as (racial-traits.ts, skill.per contextNote only, no
        // computed number) — followed here for consistency.
        changes: [c("30", "sensets", "untyped")],
        contextNotes: [
          {
            target: "skill.per",
            text: "+2 (+4 if already a dwarf) on Perception checks to notice unusual stonework only, not a general Perception bonus.",
          },
          {
            target: "allChecks",
            text: "The 15th level ability to see through solid objects has no matching target, display only.",
          },
        ],
      },
      {
        id: "crystalShard",
        level: 9,
        name: "Crystal Shard",
        summary:
          "Standard action: touch a metal or stone weapon (or up to 50 pieces of ammunition) to give it the bane property against earth subtype creatures, oozes, or stone or metal constructs for 1 minute. Once per day (twice at 17th, three times at 20th).",
        resourcePool: burstPool(9),
      },
      {
        id: "earthGlide",
        level: 15,
        name: "Earth Glide",
        summary:
          "Glide through natural earth or stone, leaving no tunnel or trace, with a burrow speed equal to half your normal speed, for 1 minute per sorcerer level per day.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of burrow speed (half normal)",
        },
      },
      {
        id: "strengthOfStone",
        level: 20,
        name: "Strength of Stone",
        summary:
          "DR 10/adamantine and immunity to petrification; no penalty for squeezing through tight spaces, and immune to bull rush, drag, grapple, reposition, and trip maneuvers.",
        changes: [
          c("10", "dr.adamantine", "untyped"),
          c("1", "immEffect.petrification", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "The maneuver immunities and squeezing exemption have no matching target, display only.",
          },
        ],
      },
    ],
  },
  // ---- Div ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Div)
  {
    tag: "Div",
    name: "Div",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Deceitful",
      "Empower Spell",
      "Improved Initiative",
      "Iron Will",
      "Lightning Reflexes",
      "Persuasive",
      "Power Attack",
    ),
    arcana: {
      summary:
        "Whenever a spell you cast damages more than one creature with an area effect, your spells' save DCs increase by 1 for 1d4 rounds.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Triggered only by a multi-target area spell, apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "spoilingTouch",
        level: 1,
        name: "Spoiling Touch",
        summary:
          "Melee touch attack: impose the broken condition on a Medium or smaller object (magic items get a Fortitude save).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "divResistances",
        level: 3,
        name: "Div Resistances",
        summary: "Resist fire 5 and +2 vs. poison (fire 10 and +4 vs. poison at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. poison only, not a general save bonus.",
          },
        ],
      },
      {
        id: "corruptingAura",
        level: 9,
        name: "Corrupting Aura",
        summary:
          "Surround yourself with a corrupting aura for a number of rounds per day equal to sorcerer level: nearby creatures take nonlethal damage and are sickened, and divine spellcasters risk losing spells.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of corrupting aura",
        },
      },
      {
        id: "squander",
        level: 15,
        name: "Squander",
        summary:
          "Once per day as a standard action, force a target within 30 ft. to become staggered for a number of rounds equal to sorcerer level (Will save halves).",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "ahrimansFavor",
        level: 20,
        name: "Ahriman's Favor",
        summary:
          "Immune to fire and poison; resist acid 10 and electricity 10; see perfectly in darkness of any kind to 60 ft.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Div): the 60-ft.
        // cap matches darkvision's shape; the "of any kind" clause
        // (penetrating magical darkness too) has no range-limited sense
        // target to hold it, same posture as the Infernal bloodline's
        // Power of the Pit capstone.
        changes: [
          c("10", "eres.acid", "untyped"),
          c("10", "eres.electricity", "untyped"),
          c("1", "imm.fire", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("60", "sensedv", "untyped", "set"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also sees through magical darkness within that 60 ft.; the darkvision number is tracked, that extra qualifier isn't.",
          },
        ],
      },
    ],
  },
  // ---- Djinni ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Djinni)
  {
    tag: "Djinni",
    name: "Djinni",
    bonusFeatSlugs: feats(
      "Dodge",
      "Empower Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Spells you cast that deal energy damage can have that damage changed to electricity.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "A casting-time choice, no number to track here." },
      ],
    },
    powers: [
      {
        id: "electricityRay",
        level: 1,
        name: "Electricity Ray",
        summary:
          "Ranged touch attack (30 ft.), standard action: 1d6 electricity damage + 1 per two sorcerer levels.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6 + 1/2 lvl electricity" },
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist electricity 10 (20 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 20, 10)", "eres.electricity", "untyped")],
      },
      {
        id: "whirlwind",
        level: 9,
        name: "Whirlwind",
        summary: "Once per day, turn into a 10-ft.-high whirlwind for 1 round per sorcerer level.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Duration: 1 round/sorcerer level" },
      },
      {
        id: "elementalMovement",
        level: 15,
        name: "Elemental Movement",
        summary: "Fly speed of 60 ft. with average maneuverability.",
        // Whole-speed grant — same base/set convention as the Elemental
        // bloodline's identically-named power above.
        changes: [c("60", "flySpeed", "base", "set")],
      },
      {
        id: "powerOfTheDjinn",
        level: 20,
        name: "Power of the Djinn",
        summary:
          "Cast limited wish once per day as a spell-like ability; immune to electricity; cast plane shift once per day to or from the Plane of Air.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Djinni): "You
        // also become immune to electricity damage" is the only genuinely
        // unconditional numeric grant here.
        changes: [c("1", "imm.electricity", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Limited wish and plane shift (to the Plane of Air) are once-per-day spell-like abilities, display only.",
          },
        ],
      },
    ],
  },
  // ---- Dreamspun ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Dreamspun)
  {
    tag: "Dreamspun",
    name: "Dreamspun",
    bonusFeatSlugs: feats(
      "Alertness",
      "Blind-Fight",
      "Combat Expertise",
      "Deceitful",
      "Heighten Spell",
      "Improved Feint",
      "Persuasive",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Whenever you target a single creature with a spell, you gain an insight bonus equal to half the spell's level (minimum +1) to AC and saving throws against that creature for 1 round.",
      changes: [],
      contextNotes: [
        {
          target: "ac",
          text: "Insight bonus applies only against the targeted creature, for 1 round: apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "lullaby",
        level: 1,
        name: "Lullaby",
        summary:
          "Spell-like ability, usable a number of times per day equal to 3 + Cha modifier: as lullaby, lasting 1 minute without concentration; the save penalty vs. sleep effects it grants increases to -4.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "combatPrecognition",
        level: 3,
        name: "Combat Precognition",
        summary:
          "+1 insight bonus on initiative checks at 3rd level and every 4 levels thereafter (+5 by 19th).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Dreamspun): "At 3rd
        // level and every 4 levels thereafter, you gain a +1 insight bonus on
        // initiative checks." Unlike the other bloodlines' scoped/situational
        // combat bonuses, an initiative check has no trigger condition to be
        // scoped to, so this is genuinely unconditional.
        changes: [c("1 + floor(max(0, @classes.sorcerer.level - 3) / 4)", "init", "insight")],
      },
      {
        id: "dreamshaper",
        level: 9,
        name: "Dreamshaper",
        summary:
          "As modify memory or speak with dead (Will DC 10 + 1/2 sorcerer level + Cha negates, plus nightmare-spell modifiers); once daily, twice at 17th, three times at 20th.",
        resourcePool: burstPool(9),
      },
      {
        id: "eyeOfSomnus",
        level: 15,
        name: "Eye of Somnus",
        summary:
          "Once per day, project your consciousness as arcane eye; you may instead make the eye visible, where it acts as a stationary symbol of sleep to all who see it.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "solipsism",
        level: 20,
        name: "Solipsism",
        summary:
          "Become incorporeal for a number of minutes per day equal to sorcerer level, in 1-minute increments: half damage from corporeal magical attacks, no damage from nonmagical weapons and objects, and your own spells deal only half damage to corporeal creatures.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of incorporeality/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Incorporeal subtype and damage halving apply only while active: not modeled as a passive change.",
          },
        ],
      },
    ],
  },
  // ---- Ectoplasm ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Ectoplasm)
  {
    tag: "Ectoplasm",
    name: "Ectoplasm",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Dodge",
      "Ectoplasmic Spell",
      "Lingering Spell",
      "Silent Spell",
      "Skill Focus",
      "Spell Focus",
    ),
    arcana: {
      summary:
        "Incorporeal creatures take 75% of the normal damage from your damaging spells; against your non-damaging spells they roll saving throws twice and take the lower result.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Only affects incorporeal targets of your spells: apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "entanglingEctoplasm",
        level: 1,
        name: "Entangling Ectoplasm",
        summary:
          "Thrown, 30 ft.: acts as a tanglefoot bag that can also entangle incorporeal creatures, dissipating in 1d3 rounds; usable 3 + Cha modifier times per day.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "ectoplasmicReach",
        level: 3,
        name: "Ectoplasmic Reach",
        summary:
          "+5 ft. reach on touch spells delivered by melee touch attack (+10 ft. at 11th, +15 ft. at 17th).",
        contextNotes: [
          {
            target: "reach",
            text: "Only extends reach for melee touch spell attacks: situational, not auto-applied.",
          },
        ],
      },
      {
        id: "ectoplasmicForm",
        level: 9,
        name: "Ectoplasmic Form",
        summary:
          "Become a cloud of ectoplasm (as gaseous form, but fly speed 30 ft. and able to carry small objects) for a number of minutes per day equal to sorcerer level, in 1-minute increments.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of gaseous form/day",
        },
      },
      {
        id: "malevolentEctoplasm",
        level: 15,
        name: "Malevolent Ectoplasm",
        summary:
          "As black tentacles centered on you, also able to grapple ethereal and incorporeal creatures and never affecting you (though it affects allies), for a number of rounds per day equal to sorcerer level.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of black-tentacles effect/day",
        },
      },
      {
        id: "ectoplasmicBody",
        level: 20,
        name: "Ectoplasmic Body",
        summary: "Immune to sneak attacks and critical hits; DR 5/slashing.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Ectoplasm): "You are
        // more ectoplasm than flesh. You become immune to sneak attacks and
        // critical hits and gain DR 5/slashing." Sneak attack is precision
        // damage (immEffect.precisionDamage); "critical hits" is
        // immEffect.criticalHits verbatim, same mapping as every other
        // bloodline's identical clause in this file. DR 5/slashing is the
        // inverse of the usual bypass qualifier (slashing weapons bypass it,
        // not the other way round) but normalizeQualifier passes any string
        // through, so dr.slashing is a clean literal target.
        changes: [
          c("5", "dr.slashing", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
        ],
      },
    ],
  },
  // ---- Efreeti ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Efreeti)
  {
    tag: "Efreeti",
    name: "Efreeti",
    bonusFeatSlugs: feats(
      "Dodge",
      "Empower Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell that deals energy damage, you can change its damage type (and descriptors) to fire.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "A casting-time choice: no number to track here." },
      ],
    },
    powers: [
      {
        id: "fireRay",
        level: 1,
        name: "Fire Ray",
        summary:
          "Ranged touch attack (30 ft.), standard action: 1d6 fire damage + 1 per two sorcerer levels.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6 + 1/2 lvl fire" },
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist fire 10 (20 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 20, 10)", "eres.fire", "untyped")],
      },
      {
        id: "efreetiForm",
        level: 9,
        name: "Efreeti Form",
        summary:
          "Once per day, assume efreeti form (as giant form I, restricted to an efreeti) for 1 round per sorcerer level, gaining the efreeti's heat ability.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "elementalMovement",
        level: 15,
        name: "Elemental Movement",
        summary: "Base speed increases by 30 ft.",
        changes: [c("30", "landSpeed", "untyped")],
      },
      {
        id: "powerOfTheEfreet",
        level: 20,
        name: "Power of the Efreet",
        summary:
          "Immune to fire damage; once per day cast limited wish; once per day use plane shift to or from the Plane of Fire.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Efreeti): "You also
        // become immune to fire damage, and can use plane shift once per day
        // to travel to or from the Plane of Fire." The wish and plane shift
        // spell-like abilities are activated and stay display only; the flat
        // fire immunity is unconditional.
        changes: [c("1", "imm.fire", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also grants limited wish and plane shift, once per day each: display only.",
          },
        ],
      },
    ],
  },
  // ---- Ghoul ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Ghoul)
  {
    tag: "Ghoul",
    name: "Ghoul",
    bonusFeatSlugs: feats(
      "Arcane Strike",
      "Combat Casting",
      "Power Attack",
      "Skill Focus",
      "Spell Focus",
      "Toughness",
      "Warren Digger",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a necromancy spell that deals hit point damage, you heal 1 hit point per spell level.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Only triggers on damaging necromancy spells: apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "ghoulishClaws",
        level: 1,
        name: "Ghoulish Claws",
        summary:
          "Free action: two claw attacks at full base attack bonus, 1d4 (1d3 if Small) + Str; magic at 5th, 1d6 (1d4 Small) and paralysis (Fort negates) at 7th, longer paralysis and DR bypass at 7th and later.",
        resourcePool: { ...POOL_3_CHA, detail: "1d4+Str claws" },
      },
      {
        id: "leatherySkin",
        level: 3,
        name: "Leathery Skin",
        summary:
          "Resist cold 5 and +1 natural armor (cold 10 and +2 natural armor at 9th; +4 natural armor at 15th, resistance unchanged).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Ghoul): mirrors
        // Draconic's Dragon Resistances exactly in structure (flat energy
        // resistance step plus a separately-scaling natural armor bonus).
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 15), 4, if(gte(@classes.sorcerer.level, 9), 2, 1))",
            "nac",
            "natural",
          ),
          c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.cold", "untyped"),
        ],
      },
      {
        id: "ravenousFrenzy",
        level: 9,
        name: "Ravenous Frenzy",
        summary:
          "Gain the benefits of haste for a number of rounds per day equal to sorcerer level; hitting with both claws in a full attack while active also deals 1d4 bleed.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of haste/day",
        },
        contextNotes: [
          { target: "allChecks", text: "Haste's numeric benefits apply only while active." },
        ],
      },
      {
        id: "earthCrawler",
        level: 15,
        name: "Earth Crawler",
        summary:
          "Burrow speed 30 ft.; while surrounded by at least 5 feet of dirt or stone, gain fast healing 10 and heal 10 x sorcerer level hit points per day.",
        changes: [c("30", "burrowSpeed", "base", "set")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Fast healing 10 applies only while surrounded by 5+ feet of dirt or stone: situational.",
          },
        ],
      },
      {
        id: "ghoulishAspect",
        level: 20,
        name: "Ghoulish Aspect",
        summary:
          "Immune to cold, nonlethal damage, paralysis, and sleep; no longer need to eat; DR 5/-; stench (10-ft. radius, Fort save or sickened 1d6+4 minutes, DC uses half sorcerer level).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Ghoul): "You gain
        // immunity to cold, nonlethal damage, paralysis, and sleep... you
        // gain DR 5/—." Nonlethal damage isn't a DamageTypeId (same gap
        // rage-powers.ts's Undead Blood and this file's Undead One of Us
        // document); hunger immunity and the stench aura have no matching
        // Change target and stay display only.
        changes: [
          c("5", "dr", "untyped"),
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to nonlethal damage and no longer needs to eat, and grants a stench aura: none of those have a matching sheet target, so they stay manual.",
          },
        ],
      },
    ],
  },
  // ---- Harrow ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Harrow)
  {
    tag: "Harrow",
    name: "Harrow",
    bonusFeatSlugs: feats(
      "Alertness",
      "Craft Wondrous Item",
      "Extend Spell",
      "Fortune Teller",
      "Harrowed",
      "Skill Focus",
      "Varisian Tattoo",
    ),
    arcana: {
      summary:
        "Divination spells requiring a percentage roll add 5 to the result and may be rolled twice, taking the preferred result; their maximum chance of a meaningful reply is 100% instead of 90%.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Only applies to percentage-roll divination spells." },
      ],
    },
    powers: [
      {
        id: "twistedFortune",
        level: 1,
        name: "Twisted Fortune",
        summary:
          "30 ft., usable 3 + Cha modifier times per day: target is confused for 1 round (Will negates); a creature is then immune to this ability for 24 hours.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "seeItComing",
        level: 3,
        name: "See It Coming",
        summary:
          "Choose Fortitude, Reflex, or Will: +1 luck bonus on saves of that type, increasing by 1 every 4 levels beyond 3rd (max +5 at 19th).",
        // Blocker: the bonus is scoped to a single player-chosen save type
        // (Fortitude, Reflex, or Will) with no CharacterDoc field to record
        // that choice, so it can't target fort/ref/will specifically without
        // guessing; stays display only per the honesty bar.
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "Luck bonus applies to only one saving throw type, chosen at 3rd level: apply manually.",
          },
        ],
      },
      {
        id: "invokeTheHarrow",
        level: 9,
        name: "Invoke the Harrow",
        summary:
          "Draw a harrow card as a standard action: gain a +4 enhancement bonus to the ability score matching its suit, for a number of minutes per day equal to sorcerer level, in 1-minute increments.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of harrow-card boon/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Which ability score benefits depends on the card drawn: apply manually.",
          },
        ],
      },
      {
        id: "harrowedHome",
        level: 15,
        name: "Harrowed Home",
        summary:
          "Once every 24 hours, place a portal to a personal pocket-dimension sanctuary (as mage's magnificent mansion); time doesn't pass there while you're away.",
        contextNotes: [
          { target: "allChecks", text: "Display only: no location state on the sheet." },
        ],
      },
      {
        id: "kinToTheOldTales",
        level: 20,
        name: "Kin to the Old Tales",
        summary: "DR 10/cold iron; immune to curses, paralysis, and sleep.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Harrow): "You gain
        // DR 10/cold iron and immunity to curses, paralysis, and sleep."
        // "Curses" has no matching slug in the closed immEffect vocabulary,
        // so only the DR and the paralysis/sleep immunities are modeled.
        changes: [
          c("10", "dr.cold-iron", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to curses: no matching immunity target, so it stays manual.",
          },
        ],
      },
    ],
  },
  // ---- Imperious ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Imperious)
  {
    tag: "Imperious",
    name: "Imperious",
    bonusFeatSlugs: feats(
      "Diehard",
      "Endurance",
      "Heroic Defiance",
      "Heroic Recovery",
      "Improved Initiative",
      "Lingering Spell",
      "Magical Aptitude",
      "Persuasive",
    ),
    arcana: {
      summary:
        "Whenever you cast a harmful spell, you gain a bonus equal to the spell's level on Intimidate checks against a creature it adversely affects, until the end of your next turn.",
      changes: [],
      contextNotes: [
        {
          target: "skill.intimidate",
          text: "Only vs. a creature just hit by a harmful spell of yours, for a limited time: apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "studentOfHumanity",
        level: 1,
        name: "Student of Humanity",
        summary:
          "Gain insight into humans: several Knowledge and social skills relating to humans gain an insight bonus equal to your Cha modifier.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only applies when the subject is human: no class-skill-grant target on the sheet.",
          },
        ],
      },
      {
        id: "heroicEcho",
        level: 3,
        name: "Heroic Echo",
        summary:
          "Morale bonuses you grant with your spells increase by 1 (also applies to competence bonuses at 9th); once daily you can share the increase with an ally.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Boosts bonuses you grant to others, not a bonus to yourself: display only.",
          },
        ],
      },
      {
        id: "takeYourBestShot",
        level: 9,
        name: "Take Your Best Shot",
        summary:
          "Make an Intimidate check against a creature whenever you successfully resist one of its harmful effects.",
        contextNotes: [
          { target: "allChecks", text: "Only triggers after resisting a harmful effect." },
        ],
      },
      {
        id: "heroicLegends",
        level: 15,
        name: "Heroic Legends",
        summary:
          "Expend a spell slot to grant inspire-greatness- or inspire-heroics-like effects, lasting longer for human recipients.",
        contextNotes: [
          { target: "allChecks", text: "Activated, spell-slot-consuming ability: display only." },
        ],
      },
      {
        id: "immortalLegend",
        level: 20,
        name: "Immortal Legend",
        summary:
          "Cease aging and no longer need to eat, drink, or sleep; immune to death effects and energy drain.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Imperious): "you
        // cease aging; no longer need to eat, drink, or sleep; and gain
        // immunity to death effects and energy drain." Death effects map
        // onto immEffect.deathEffects verbatim; energy drain has no matching
        // slug in the closed vocabulary and stays manual, alongside the
        // non-numeric aging/sustenance clauses.
        changes: [c("1", "immEffect.deathEffects", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to energy drain, ceases aging, and no longer needs food, drink, or sleep: none of those have a matching sheet target.",
          },
        ],
      },
    ],
  },
  // ---- Impossible ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Impossible)
  {
    tag: "Impossible",
    name: "Impossible",
    bonusFeatSlugs: feats(
      "Craft Construct",
      "Craft Magic Arms and Armor",
      "Deft Hands",
      "Exotic Weapon Proficiency",
      "Far Shot",
      "Iron Will",
      "Point-Blank Shot",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Constructs are susceptible to your enchantment (compulsion) spells as though not mind-affecting, and are treated as living creatures for determining which of your spells affect them.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Only changes how constructs interact with your spells." },
      ],
    },
    powers: [
      {
        id: "disorientingTouch",
        level: 1,
        name: "Disorienting Touch",
        summary:
          "Melee touch attack, usable 3 + Cha modifier times per day: target sickened for 1/2 sorcerer level rounds (min 1); repeat applications extend duration but don't stack.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "spontaneousGeneration",
        level: 3,
        name: "Spontaneous Generation",
        summary:
          "Gain Craft Wondrous Item as a bonus feat; when crafting magic items, ignore one spell prerequisite without a DC increase (an additional prerequisite at 9th, 15th, and 20th).",
        // Blocker: granting a specific bonus feat outright (as opposed to
        // restricting the bloodline-feat-slot picker via bonusFeatSlugs) has
        // no Change mechanism in this engine; stays display only.
        contextNotes: [
          {
            target: "allChecks",
            text: "Bonus-feat grant and crafting-prerequisite waivers: display only.",
          },
        ],
      },
      {
        id: "distractingPattern",
        level: 9,
        name: "Distracting Pattern",
        summary:
          "Distort the scenery around you for a number of rounds equal to sorcerer level: attackers targeting you with ranged attacks have a 20% miss chance and you gain a Stealth bonus; once daily, twice at 17th, three times at 20th.",
        resourcePool: burstPool(9),
      },
      {
        id: "relativity",
        level: 15,
        name: "Relativity",
        summary:
          "Climb vertical surfaces at your normal land speed with none of the usual climbing penalties; immune to reverse gravity and similar effects.",
        // Blocker: "move at your normal land speed" needs a formula
        // reference to the character's own computed land speed, and the
        // formula DSL has no such path (land speed is a derived output, not
        // an input); climbSpeed stays unset rather than hardcoding a guess.
        // "Immune to reverse gravity" also has no matching immEffect slug.
        contextNotes: [
          {
            target: "allChecks",
            text: "Grants full-speed climbing and immunity to reverse gravity: neither has a matching sheet target, so both stay manual.",
          },
        ],
      },
      {
        id: "livingParadox",
        level: 20,
        name: "Living Paradox",
        summary:
          "Immune to disease and poison; take no additional damage from bleed effects, critical hits, or sneak attacks.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Impossible): "You
        // gain immunity to disease and poison. You take no additional damage
        // from bleed effects, critical hits, and sneak attacks." Taking no
        // extra damage from a crit or sneak attack is the same semantics as
        // every other bloodline's "immune to critical hits and sneak
        // attacks" clause (immEffect.criticalHits / .precisionDamage); bleed
        // has no matching slug and stays manual.
        changes: [
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
          c("1", "immEffect.disease", "untyped"),
          c("1", "immEffect.poison", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also takes no extra damage from bleed effects: no matching target, so it stays manual.",
          },
        ],
      },
    ],
  },
  // ---- Kobold Sorcerer ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Kobold%20Sorcerer)
  // AoN's own page title is "Kobold Sorcerer Bloodline" (Advanced Race Guide) —
  // no name mismatch versus the vendored tag, despite the brief's heads-up.
  {
    // Tag is the `bloodlineSpellLists` spelling ("Kobold"), which is what the
    // picker stores; the vendored prose catalog names it "Kobold Sorcerer",
    // bridged by SORCERER_BLOODLINE_NAME_ALIASES below.
    tag: "Kobold",
    name: "Kobold",
    bonusFeatSlugs: feats(
      "Alertness",
      "Combat Casting",
      "Defensive Combat Training",
      "Dodge",
      "Improved Initiative",
      "Lightning Reflexes",
      "Silent Spell",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell against a creature denied its Dexterity bonus to AC, that spell's save DC increases by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "Only applies to a creature currently denied its Dex bonus." },
      ],
    },
    powers: [
      {
        id: "trapRune",
        level: 1,
        name: "Trap Rune",
        summary:
          "Standard action: sketch a nearly invisible rune on a 5-ft. square; the next creature other than you to step on or touch it takes 1d8 + 1 per sorcerer level of energy damage (Reflex DC 10 + 1/2 sorcerer level + Cha for half), usable 3 + Cha modifier times per day.",
        resourcePool: { ...POOL_3_CHA, detail: "1d8 + 1/lvl trap rune" },
      },
      {
        id: "trapSense",
        level: 3,
        name: "Trap Sense",
        summary:
          "+2 bonus on Perception checks to notice traps, +1 bonus on Reflex saves against traps, and +1 dodge bonus to AC against trap attacks.",
        // All three bonuses are scoped to traps specifically, the same
        // "not a general bonus" posture as every other bloodline's
        // situation-scoped save/skill/AC bonus in this file.
        contextNotes: [
          {
            target: "allChecks",
            text: "Perception, Reflex, and AC bonuses apply only against traps, not generally: apply manually.",
          },
        ],
      },
      {
        id: "arcaneAmbush",
        level: 9,
        name: "Arcane Ambush",
        summary:
          "Swift action: expend a spell slot to grant yourself and up to one ally per four sorcerer levels (within 30 ft.) a bonus on attack and damage rolls equal to the slot's level, for 1 round, against foes they're flanking or that are denied their Dex bonus.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Consumes a spell slot and only applies against flanked or Dex-denied foes: display only.",
          },
        ],
      },
      {
        id: "earthGlide",
        level: 15,
        name: "Earth Glide",
        summary:
          "Gain the earth glide universal monster ability at a speed equal to your base speed, without the ability to breathe while doing so.",
        // Blocker: "speed equal to your base speed" needs a formula
        // reference to the character's own computed land speed, which the
        // formula DSL doesn't expose (same gap as Impossible's Relativity,
        // above); no speed target is set.
        contextNotes: [{ target: "allChecks", text: "Movement-mode grant: display only." }],
      },
      {
        id: "nimbleWalker",
        level: 20,
        name: "Nimble Walker",
        summary:
          "+5 racial bonus on Reflex saving throws; also +5 on Acrobatics checks to move through a threatened area or space, and can breathe while using Earth Glide.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Kobold%20Sorcerer):
        // "You gain a +5 racial bonus on Reflex saving throws and on
        // Acrobatics checks made to move through a creature's threatened
        // area or through its space." The Reflex clause reads as a general
        // save bonus (no trigger to scope it to), unlike the Acrobatics
        // clause which is explicitly scoped to moving through a threatened
        // area.
        changes: [c("5", "ref", "racial")],
        contextNotes: [
          {
            target: "skill.acr",
            text: "+5 racial bonus only for Acrobatics checks to move through a threatened area or space, not general Acrobatics.",
          },
          {
            target: "allChecks",
            text: "Also lets you breathe while using Earth Glide, itself display only above.",
          },
        ],
      },
    ],
  },
  // ---- Maestro ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Maestro)
  {
    tag: "Maestro",
    name: "Maestro",
    bonusFeatSlugs: feats(
      "Deceitful",
      "Greater Spell Focus",
      "Lingering Performance",
      "Persuasive",
      "Skill Focus",
      "Spell Focus",
      "Spellsong",
      "Still Spell",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell with a verbal component and no somatic or material component, treat your caster level as one higher.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 effective caster level only on verbal-only spells (no somatic or material component); apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "beguilingVoice",
        level: 1,
        name: "Beguiling Voice",
        summary:
          "Melee touch attack: acts as the daze spell, language-dependent, on a creature with Hit Dice not exceeding your sorcerer level.",
        resourcePool: { ...POOL_3_CHA, detail: "Daze (language-dependent)" },
      },
      {
        id: "fascinate",
        level: 3,
        name: "Fascinate",
        summary:
          "Use a Perform skill to fascinate one or more creatures (as the bardic fascinate ability), DC 10 + 1/2 sorcerer level + Cha, for 1 round per sorcerer level.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Maestro): "You may
        // use this ability once per day at 3rd level, twice per day at 8th
        // level, three times per day at 13th level, and four times per day
        // at 18th level."
        resourcePool: {
          usesFormula:
            "if(gte(@classes.sorcerer.level, 18), 4, if(gte(@classes.sorcerer.level, 13), 3, if(gte(@classes.sorcerer.level, 8), 2, 1)))",
          per: "day",
        },
      },
      {
        id: "perfectVoice",
        level: 9,
        name: "Perfect Voice",
        summary:
          "Understand all sound-based communication and be understood by any language-comprehending creature; language-dependent spell DCs increase by 1.",
        contextNotes: [
          {
            target: "allChecks",
            text: "+1 DC on language-dependent spells only; understanding all sound-based communication is display only; apply manually.",
          },
        ],
      },
      {
        id: "inspire",
        level: 15,
        name: "Inspire",
        summary: "Cast greater heroism as a spell-like ability.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Maestro): "You can
        // use this ability once per day at 15th level, twice per day at 17th
        // level, and three times per day at 19th level."
        resourcePool: {
          usesFormula:
            "if(gte(@classes.sorcerer.level, 19), 3, if(gte(@classes.sorcerer.level, 17), 2, 1))",
          per: "day",
        },
      },
      {
        id: "grandMaestro",
        level: 20,
        name: "Grand Maestro",
        summary:
          "Cast any spell with a verbal component as if under Still Spell, with no increase to casting time or spell slot; immune to sonic damage and language-dependent spells.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Maestro): "You gain
        // immunity to sonic damage and language-dependent spells." Sonic is a
        // true damage type (imm.sonic); "language-dependent spells" has no
        // matching slug in the closed immEffect vocabulary, so it stays
        // display only.
        changes: [c("1", "imm.sonic", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also casts any verbal spell with Still Spell applied for free and is immune to language-dependent spells beyond the sonic immunity above; display only.",
          },
        ],
      },
    ],
  },
  // ---- Marid ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Marid)
  {
    tag: "Marid",
    name: "Marid",
    bonusFeatSlugs: feats(
      "Dodge",
      "Empower Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell that deals energy damage, you can change its type to cold.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Energy-type swap to cold is a casting-time choice; no number to track here.",
        },
      ],
    },
    powers: [
      {
        id: "frostRay",
        level: 1,
        name: "Frost Ray",
        summary: "Ranged touch attack (30 ft.): 1d6 cold damage + 1 per two sorcerer levels.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6 + 1/2 lvl cold" },
        contextNotes: [
          { target: "allChecks", text: "Damage scales with sorcerer level; roll manually." },
        ],
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist cold 10 (20 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 20, 10)", "eres.cold", "untyped")],
      },
      {
        id: "watersFury",
        level: 9,
        name: "Water's Fury",
        summary:
          "60-ft. line of water: 1d6 damage per two sorcerer levels and blinds the target for 1d6 rounds, Reflex DC 10 + 1/2 sorcerer level + Cha halves damage and negates the blindness.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Marid): unlike the
        // Draconic/Elemental/Infernal/Undead burst powers, Water's Fury
        // carries no "X times per day" cap at all — verified against
        // d20pfsrd's mirrored text — so no resourcePool is added; it's a
        // plain at-will standard action.
        contextNotes: [
          {
            target: "allChecks",
            text: "Damage and the Reflex-negated blindness scale with sorcerer level; roll manually. RAW gives this power no daily-use cap.",
          },
        ],
      },
      {
        id: "elementalMovement",
        level: 15,
        name: "Elemental Movement",
        summary: "Gain a swim speed of 60 ft.",
        // Whole-speed grant — same base/set convention as the Elemental
        // bloodline's identically-named power above.
        changes: [c("60", "swimSpeed", "base", "set")],
      },
      {
        id: "powerOfTheMarid",
        level: 20,
        name: "Power of the Marid",
        summary:
          "Cast limited wish once daily; immune to cold damage; plane shift to or from the Plane of Water once daily.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Marid): "You become
        // immune to cold damage" is the only unconditional numeric grant;
        // limited wish and plane shift are both once-daily activated
        // spell-like abilities, kept display only (one resourcePool per
        // power, matching Fey's Soul of the Fey precedent for a capstone
        // with two separate 1/day SLAs).
        changes: [c("1", "imm.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also casts limited wish and plane shift to the Plane of Water once daily each; display only.",
          },
        ],
      },
    ],
  },
  // ---- Martyred ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Martyred)
  {
    tag: "Martyred",
    name: "Martyred",
    bonusFeatSlugs: feats(
      "Diehard",
      "Endurance",
      "Heroic Defiance",
      "Heroic Recovery",
      "Leadership",
      "Persuasive",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "Whenever you take damage in battle, your effective caster level increases by 1 during your next turn (no more than once per round).",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 effective caster level only for your next turn after taking damage; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "sacrificialBoon",
        level: 1,
        name: "Sacrificial Boon",
        summary:
          "Immediate action: sacrifice 1 hp for a +1 sacred bonus on your next damage roll, saving throw, or skill check.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "rallyingCry",
        level: 3,
        name: "Rallying Cry",
        summary:
          "Standard action once daily: you and allies within 30 ft. who can hear you gain a +1 morale bonus (+1 more at 7th and every 4 levels, max +5 at 19th) on attack and damage rolls for half your sorcerer level in rounds (minimum 1).",
        resourcePool: { usesFormula: "1", per: "day" },
        contextNotes: [
          {
            target: "allChecks",
            text: "Bonus applies to you and nearby allies who can hear the cry, not a fixed target; apply manually.",
          },
        ],
      },
      {
        id: "giftOfBlood",
        level: 9,
        name: "Gift of Blood",
        summary:
          "Standard action: sacrifice up to your character level in hp to grant an ally double that as temporary hp, lasting 1 minute per sorcerer level.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Martyred, verified
        // verbatim via d20pfsrd's mirror): "At 9th level, you can use this
        // ability once per day. At 17th level, you can use this ability
        // twice per day."
        resourcePool: {
          usesFormula: "if(gte(@classes.sorcerer.level, 17), 2, 1)",
          per: "day",
          detail: "Sacrifice up to character level hp for double as an ally's temp hp",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "You can't heal the sacrificed hit points until the target loses the temporary hit points; apply manually.",
          },
        ],
      },
      {
        id: "sacrificialExchange",
        level: 15,
        name: "Sacrificial Exchange",
        summary:
          "Swift action once daily (twice at 20th): take 2 temporary ability damage to one ability score for a temporary +2 inherent bonus to another, for up to 1 hour per sorcerer level.",
        resourcePool: { usesFormula: "if(gte(@classes.sorcerer.level, 20), 2, 1)", per: "day" },
        contextNotes: [
          {
            target: "allChecks",
            text: "Ability damage and the inherent bonus apply to scores you choose, not fixed targets; apply manually.",
          },
        ],
      },
      {
        id: "eternalMartyr",
        level: 20,
        name: "Eternal Martyr",
        summary:
          "Immune to death effects; material components for spells that restore you to life cost half as much; your body can't be turned into an undead creature.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Martyred): "You
        // become immune to death effects. ... Your body cannot be turned
        // into an undead creature, as though you were affected by a
        // permanent hallow effect." immEffect.deathEffects and
        // immEffect.undeath ("becoming undead") are exact vocabulary matches.
        changes: [
          c("1", "immEffect.deathEffects", "untyped"),
          c("1", "immEffect.undeath", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also halves material component costs for spells that restore you to life; display only.",
          },
        ],
      },
    ],
  },
  // ---- Naga ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Naga)
  {
    tag: "Naga",
    name: "Naga",
    bonusFeatSlugs: feats(
      "Alertness",
      "Blind-Fight",
      "Combat Casting",
      "Dodge",
      "Improved Initiative",
      "Lightning Reflexes",
      "Skill Focus",
      "Stealthy",
    ),
    arcana: {
      summary: "Whenever you cast a spell with the poison descriptor, its save DC increases by 2.",
      changes: [],
      contextNotes: [
        { target: "allChecks", text: "+2 DC only on poison-descriptor spells; apply manually." },
      ],
    },
    powers: [
      {
        id: "vanishing",
        level: 1,
        name: "Vanishing",
        summary:
          "Standard action: turn invisible (as invisibility) for a number of rounds per day equal to your sorcerer level + Charisma bonus.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level + max(0, @abilities.cha.mod)",
          per: "day",
          detail: "Rounds of invisibility/day",
        },
      },
      {
        id: "nagaResistances",
        level: 3,
        name: "Naga Resistances",
        summary: "+2 bonus on saves vs. mind-affecting and poison effects (+4 at 9th level).",
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. mind-affecting and poison effects only; not a general save bonus.",
          },
        ],
      },
      {
        id: "ensnaringEyes",
        level: 9,
        name: "Ensnaring Eyes",
        summary:
          "+2 to the save DC of any spell, spell-like ability, or supernatural ability you use that causes fascination or belongs to the charm subschool.",
        contextNotes: [
          {
            target: "allChecks",
            text: "+2 DC only on fascinate effects and charm-subschool abilities; apply manually.",
          },
        ],
      },
      {
        id: "castWithoutHands",
        level: 15,
        name: "Cast without Hands",
        summary:
          "Cast arcane spells with somatic components even with your hands full, at double arcane spell failure chance from armor; unusable while pinned or immobile.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Situational, hands-free casting only; not auto-applied.",
          },
        ],
      },
      {
        id: "powerOfTheNaga",
        level: 20,
        name: "Power of the Naga",
        summary:
          "Immune to charm effects, mind-reading effects, and poison; assume naga shape at will.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Naga): "You gain
        // immunity to charm effects, mind-reading effects, and poison."
        // immEffect.charm and immEffect.poison are exact matches;
        // "mind-reading effects" has no closed-vocab slug, so it stays
        // display only.
        changes: [c("1", "immEffect.charm", "untyped"), c("1", "immEffect.poison", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to mind-reading effects and can assume naga shape at will; display only beyond the two immunities above.",
          },
        ],
      },
    ],
  },
  // ---- Nanite ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Nanite)
  {
    tag: "Nanite",
    name: "Nanite",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Combat Expertise",
      "Dodge",
      "Eldritch Heritage",
      "Expanded Arcana",
      "Improved Disarm",
      "Lightning Reflexes",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a transmutation spell that targets only yourself, its duration increases by 50%.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+50% duration only on self-only transmutation spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "naniteStrike",
        level: 1,
        name: "Nanite Strike",
        summary:
          "Free action: coat a manufactured melee weapon with nanites; a hit poisons the target (Fort DC 10 + 1/2 sorcerer level + Con) for Strength damage, adding Constitution damage and worsening the dice at 5th, 7th, and 11th level.",
        resourcePool: {
          usesFormula: "3 + @abilities.cha.mod",
          per: "day",
          detail: "Rounds of nanite coating/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Poison damage and DCs scale with sorcerer level; roll manually.",
          },
        ],
      },
      {
        id: "naniteSurge",
        level: 3,
        name: "Nanite Surge",
        summary:
          "Immediate action once daily (twice at 9th): grant yourself a bonus equal to 3 + sorcerer level on one d20 roll.",
        resourcePool: { usesFormula: "if(gte(@classes.sorcerer.level, 9), 2, 1)", per: "day" },
        contextNotes: [
          {
            target: "allChecks",
            text: "Bonus applies to one chosen d20 roll, not a fixed target; apply manually.",
          },
        ],
      },
      {
        id: "naniteResurgence",
        level: 9,
        name: "Nanite Resurgence",
        summary:
          "Immediate action once daily (twice at 17th) when reduced to one-quarter hp: activate as resurgent transformation; at 20th level you never die of system shock from using it.",
        resourcePool: { usesFormula: "if(gte(@classes.sorcerer.level, 17), 2, 1)", per: "day" },
        contextNotes: [
          {
            target: "allChecks",
            text: "Triggers only when reduced to one-quarter maximum hp; situational, not auto-applied.",
          },
        ],
      },
      {
        id: "distributedBody",
        level: 15,
        name: "Distributed Body",
        summary:
          "25% chance that a critical hit or sneak attack against you has its extra damage negated.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Roll the percentile chance manually when crit/sneak attacked.",
          },
        ],
      },
      {
        id: "livingSwarm",
        level: 20,
        name: "Living Swarm",
        summary:
          "Immune to bleed effects, disease, and poison; DR 5/-; move as gaseous form at will.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Nanite): "You gain
        // immunity to bleed effects, diseases, and poisons... You also gain
        // DR 5/—." immEffect.disease and immEffect.poison are exact matches;
        // "bleed effects" has no closed-vocab slug, so it stays display only.
        changes: [
          c("5", "dr", "untyped"),
          c("1", "immEffect.disease", "untyped"),
          c("1", "immEffect.poison", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to bleed effects (no damage-type target holds that) and can move as gaseous form at will; both display only.",
          },
        ],
      },
    ],
  },
  // ---- Oni ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Oni)
  {
    tag: "Oni",
    name: "Oni",
    bonusFeatSlugs: feats(
      "Combat Expertise",
      "Combat Reflexes",
      "Enforcer",
      "Fast Healer",
      "Improved Initiative",
      "Iron Will",
      "Power Attack",
      "Skill Focus",
      // AoN prints "Weapon Proficiency (katana)"; the katana is an exotic
      // weapon, and no bare "Weapon Proficiency" feat exists in the vendored
      // catalog, so this maps to the base exotic-proficiency feat (same
      // base-feat-only granularity as Skill Focus sub-choices, see file doc).
      "Exotic Weapon Proficiency",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell of the charm or compulsion subschool, gain a bonus equal to the spell's level on Bluff, Diplomacy, and Intimidate checks for 1d4 rounds.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Skill bonus only after a charm/compulsion-subschool spell, for 1d4 rounds; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "touchOfAgony",
        level: 1,
        name: "Touch of Agony",
        summary:
          "Melee touch attack: 1d4 nonlethal damage per round for half your sorcerer level in rounds (minimum 1).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "alteredForm",
        level: 3,
        name: "Altered Form",
        summary:
          "Change shape (as alter self) for a number of minutes per day equal to your sorcerer level; unlimited duration at 17th level.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of alter self/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Unlimited duration at 17th level; the pool above reflects the cap below that level.",
          },
        ],
      },
      {
        id: "windborne",
        level: 9,
        name: "Windborne",
        summary:
          "Turn gaseous (as gaseous form) for a number of rounds per day equal to your sorcerer level; speed while gaseous increases by 10 ft. at 11th and every two levels after, to a maximum of 60 ft. at 19th.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of gaseous form/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Speed while gaseous scales with level; apply the increase manually.",
          },
        ],
      },
      {
        id: "oniHealing",
        level: 15,
        name: "Oni Healing",
        summary:
          "If your hp drops below 0, automatically stabilize and regenerate 2 hp per round for a number of rounds per day equal to your sorcerer level; negated by acid or fire damage.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of regeneration/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Triggers automatically only below 0 hp, and is negated by acid or fire damage; apply manually.",
          },
        ],
      },
      {
        id: "hedonisticMaster",
        level: 20,
        name: "Hedonistic Master",
        summary:
          "Spell resistance equal to 6 + sorcerer level; change shape between your natural form and a chosen Large giant-subtype humanoid at will; charm and compulsion spells gain +2 DC.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Oni): "you gain SR
        // equal to 6 + your sorcerer level" is the one unconditional numeric
        // grant; the shapechange and the charm/compulsion DC bonus are both
        // conditional/activated.
        changes: [c("6 + @classes.sorcerer.level", "spellResist", "untyped", "set")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also shapeshifts to a chosen Large giant-subtype humanoid at will, and charm/compulsion spells gain +2 DC; display only beyond the SR above.",
          },
        ],
      },
    ],
  },
  // ---- Orc ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Orc)
  {
    tag: "Orc",
    name: "Orc",
    bonusFeatSlugs: feats(
      "Diehard",
      "Endurance",
      "Great Fortitude",
      "Intimidating Prowess",
      "Improved Overrun",
      "Power Attack",
      "Toughness",
      "Widen Spell",
    ),
    arcana: {
      summary:
        "Gain the orc subtype, including darkvision 60 ft. (90 ft. if you already have darkvision) and light sensitivity. Whenever you cast a spell that deals damage, it deals +1 damage per die rolled.",
      // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Orc): "You gain the
      // orc subtype, including darkvision 60 feet and light sensitivity. If
      // you already have darkvision, its range increases to 90 feet." The
      // flat 60-ft. grant is unconditional and safe to apply (senses.ts
      // resolves darkvision highest-wins, same posture as the shifter Bat
      // aspect's darkvision grant); the "increases to 90 if you already have
      // darkvision" rider differs from the flat grant (not a same-size
      // add), so — like Bat's rider — it's left for the contextNote instead
      // of the unrepresentable max(grant, existing+30) shape.
      changes: [c("60", "sensedv", "untyped", "set")],
      contextNotes: [
        {
          target: "allChecks",
          text: "If you already have darkvision, its range becomes 90 ft. instead of the flat 60 ft. above; apply the difference manually. Light sensitivity has no penalty target and is display only.",
        },
        {
          target: "allChecks",
          text: "+1 damage per die only on spells that deal damage; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "touchOfRage",
        level: 1,
        name: "Touch of Rage",
        summary:
          "Standard action touch: morale bonus on attack rolls, damage rolls, and Will saves equal to half your sorcerer level (minimum 1) for 1 round.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "fearless",
        level: 3,
        name: "Fearless",
        summary:
          "+4 on saves vs. fear and +1 natural armor (natural armor +2, immune to fear, and light sensitivity lost at 9th level).",
        changes: [
          c("if(gte(@classes.sorcerer.level, 9), 2, 1)", "nac", "natural"),
          c("if(gte(@classes.sorcerer.level, 9), 1, 0)", "immEffect.fear", "untyped"),
        ],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+4 vs. fear only; not a general save bonus.",
          },
          {
            target: "allChecks",
            text: "Also loses light sensitivity at 9th level; display only.",
          },
        ],
      },
      {
        id: "strengthOfTheBeast",
        level: 9,
        name: "Strength of the Beast",
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
        id: "powerOfGiants",
        level: 15,
        name: "Power of Giants",
        summary:
          "Standard action: grow to Large size, gaining +6 Strength, -2 Dexterity, +4 Constitution, and +4 natural armor, for up to 1 minute per character level daily.",
        resourcePool: {
          usesFormula: "@attributes.hd.total",
          per: "day",
          detail: "Minutes of Large size/day (1-minute increments)",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Size bonuses only apply while enlarged, activated as a standard action; apply manually.",
          },
        ],
      },
      {
        id: "warlordReborn",
        level: 20,
        name: "Warlord Reborn",
        summary: "Immune to fire; DR 5/-; cast transformation once daily as a spell-like ability.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Orc): "You gain
        // immunity to fire and DR 5/—."
        changes: [c("1", "imm.fire", "untyped"), c("5", "dr", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also casts transformation once daily as a spell-like ability; display only.",
          },
        ],
      },
    ],
  },
  // ---- Pestilence ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Pestilence)
  {
    tag: "Pestilence",
    name: "Pestilence",
    bonusFeatSlugs: feats(
      "Brew Potion",
      "Diehard",
      "Endurance",
      "Great Fortitude",
      "Self Sufficient",
      "Skill Focus",
      "Silent Spell",
      "Toughness",
    ),
    arcana: {
      summary:
        "Vermin are treated as animals for the purposes of your mind-affecting spells that affect them.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Only relevant when targeting vermin with mind-affecting spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "plaguesCaress",
        level: 1,
        name: "Plague's Caress",
        summary:
          "Melee touch attack: living target breaks out in pustules and sores, sickened, for half your sorcerer level in rounds (minimum 1).",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "accustomedToAwfulness",
        level: 3,
        name: "Accustomed to Awfulness",
        summary:
          "Immune to the sickened condition and +4 on saves vs. nausea/disease (immune to the nauseated condition and the debilitating effects of disease, though still a carrier, at 9th level).",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Pestilence): "At
        // 9th level, you become immune to the nauseated condition and to
        // the debilitating effects of disease (but you can still be a
        // carrier of diseases)." immEffect.disease ("disease") is the
        // closed-vocab match for the 9th-level clause; the sickened/
        // nauseated condition immunities have no change target (same gap
        // bloodrager Aberrant's Aberrant Fortitude documents) and stay
        // display only.
        changes: [c("if(gte(@classes.sorcerer.level, 9), 1, 0)", "immEffect.disease", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to the sickened condition at 3rd level and the nauseated condition at 9th; neither has a change target, so both stay display only.",
          },
          {
            target: "allSavingThrows",
            text: "+4 vs. nausea and disease only; not a general save bonus.",
          },
        ],
      },
      {
        id: "shroudOfVermin",
        level: 9,
        name: "Shroud of Vermin",
        summary:
          "Immune to swarm attacks and can mentally command swarms with more Hit Dice than you; +1 natural armor (+2 at 11th, +3 at 17th).",
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 17), 3, if(gte(@classes.sorcerer.level, 11), 2, 1))",
            "nac",
            "natural",
          ),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to swarm attacks and can mentally command swarms with more Hit Dice than you; display only beyond the natural armor above.",
          },
        ],
      },
      {
        id: "pestilentialBreath",
        level: 15,
        name: "Pestilential Breath",
        summary:
          "30-ft. cone exhalation inflicting two diseases, Fortitude DC 10 + 1/2 sorcerer level + Cha; once daily (twice at 17th, three times at 20th).",
        resourcePool: {
          usesFormula:
            "if(gte(@classes.sorcerer.level, 20), 3, if(gte(@classes.sorcerer.level, 17), 2, 1))",
          per: "day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Inflicts two diseases via Fortitude save; apply manually.",
          },
        ],
      },
      {
        id: "plagueCarrier",
        level: 20,
        name: "Plague Carrier",
        summary:
          "Touch attack inflicts mummy rot, Fortitude DC 10 + 1/2 sorcerer level + Cha negates.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Touch attack inflicts mummy rot via Fortitude save; apply manually.",
          },
        ],
      },
    ],
  },
  // Sorcerer bloodline batch 4: Phoenix, Possessed, Protean, Psychic, Rakshasa,
  // Salamander, Scorpion, Serpentine. Assembler provides `c`, `feats`,
  // `POOL_3_CHA`, `burstPool` in scope; this module is the entry array only.

  // ---- Phoenix ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Phoenix)
  {
    tag: "Phoenix",
    name: "Phoenix",
    bonusFeatSlugs: feats(
      "Dodge",
      "Elemental Focus",
      "Fast Healer",
      "Improved Initiative",
      "Iron Will",
      "Mobility",
      "Quicken Spell",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell that deals fire damage, you can have it heal living creatures instead: the spell deals no damage, and affected creatures regain hit points equal to half the fire damage the spell would have dealt.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Fire-to-healing swap is a per-cast choice on fire-damage spells only; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "theUnseenWorld",
        level: 1,
        name: "The Unseen World",
        summary:
          "Gain detect magic and read magic as spells known; from 5th level, as a swift action identify a non-cursed magic item you hold (a number of times per day equal to your Charisma modifier); cursed items still need normal identification.",
        resourcePool: {
          usesFormula: "if(gte(@classes.sorcerer.level, 5), @abilities.cha.mod, 0)",
          per: "day",
          detail: "Swift-action identify (from 5th level)",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Detect magic and read magic are granted as spells known; add them to your known-spells list manually.",
          },
        ],
      },
      {
        id: "immolation",
        level: 3,
        name: "Immolation",
        summary:
          "Swift action: surround yourself in fire for a number of rounds per day equal to character level plus Charisma bonus (not consecutive); unarmed strikes deal +1d6 fire damage, and creatures ending their turn adjacent to you take 1d6 fire damage.",
        // RAW (aonprd.com): "rounds per day equal to your character level plus
        // your Charisma bonus" — character level, not sorcerer level, hence
        // `@level` (total character level) rather than `@classes.sorcerer.level`.
        resourcePool: {
          usesFormula: "@level + @abilities.cha.mod",
          per: "day",
          detail: "Rounds of immolation/day",
        },
      },
      {
        id: "vermilionWings",
        level: 9,
        name: "Vermilion Wings",
        summary:
          "Grow phoenix wings as a standard action for a fly speed of 60 feet with good maneuverability; dismiss as a free action.",
        changes: [c("60", "flySpeed", "untyped")],
      },
      {
        id: "restoringFlames",
        level: 15,
        name: "Restoring Flames",
        summary: "Cast greater restoration once per day as a spell-like ability.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Greater restoration (SLA)" },
      },
      {
        id: "rebirth",
        level: 20,
        name: "Rebirth",
        summary:
          "If you die, return to life via true resurrection after 1 minute, once per 24 hours; dying again within that period is permanent.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Auto-resurrection on death" },
        contextNotes: [
          {
            target: "allChecks",
            text: "Triggers automatically on death, not an activated action.",
          },
        ],
      },
    ],
  },
  // ---- Possessed ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Possessed)
  {
    tag: "Possessed",
    name: "Possessed",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Deceitful",
      "Fearsome Spell",
      "Improved Iron Will",
      "Iron Will",
      "Persuasive",
      "Selective Spell",
      "Skill Focus",
      "Spell Focus",
      "Traumatic Spell",
    ),
    arcana: {
      summary:
        "After casting a non-cantrip spell, you can roll your next Will save against a mind-affecting effect (before your next turn) twice and take the better result, or reattempt an already-failed save against an ongoing mind-affecting effect; once per effect, 3 + Charisma modifier times per day.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Uses a per-day pool (3 + Cha modifier) tied to a specific mind-affecting effect; track and apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "aggressivePossession",
        level: 1,
        name: "Aggressive Possession",
        summary:
          "Melee touch attack: target must succeed at a Will save or be confused for 1 round.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "sightUnseen",
        level: 3,
        name: "Sight Unseen",
        summary:
          "Gain darkvision 30 feet, or +30 feet if you already have darkvision; at 9th level also gain lifesense 30 feet.",
        // RAW (aonprd.com): "gain darkvision with a range of up to 30 feet. If
        // you already have darkvision, its range instead increases by 30
        // feet." Grant amount equals the rider amount (30 == 30), so operator
        // "add" applies per the grant==rider convention (see file doc comment
        // in bloodlines.ts). Lifesense is a flat 30-ft. grant gated to 9th
        // level within the same power entry, mirroring Undead's Death's Gift
        // level-gated resistance step.
        changes: [
          c("30", "sensedv", "untyped", "add"),
          c("if(gte(@classes.sorcerer.level, 9), 30, 0)", "sensels", "untyped"),
        ],
      },
      {
        id: "insideAgent",
        level: 9,
        name: "Inside Agent",
        summary:
          "Reroll a just-attempted Perception check, taking a -2 penalty on all other skill checks for 1 minute; at 13th level, reroll any skill check instead at a -4 penalty for 10 minutes. Must reroll before learning the original result, and can't be used while the penalty is already active.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Activated reroll with a skill-check penalty rider; no daily use cap given in the text; apply manually.",
          },
        ],
      },
      {
        id: "oneBodyTwoMinds",
        level: 15,
        name: "One Body, Two Minds",
        summary:
          "Once per day, apply Silent Spell, Still Spell, and (for a mind-affecting spell) Extend Spell to a spell without increasing its slot or casting time.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "dualSpirit",
        level: 20,
        name: "Dual Spirit",
        summary:
          "Immune to mind-affecting effects; when you successfully possess a creature, you keep full control of both your body and the possessed body.",
        changes: [c("1", "immEffect.mindAffecting", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also keeps you in control of both bodies during a possession effect; display only.",
          },
        ],
      },
    ],
  },
  // ---- Protean ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Protean)
  {
    tag: "Protean",
    name: "Protean",
    bonusFeatSlugs: feats(
      "Agile Maneuvers",
      "Defensive Combat Training",
      "Enlarge Spell",
      "Great Fortitude",
      "Improved Great Fortitude",
      "Skill Focus",
      "Spell Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "The DC to dispel transmutation spells, or conjuration (creation) spells, that you cast increases by 4.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+4 to your transmutation/conjuration (creation) spells' dispel DC only; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "protoplasm",
        level: 1,
        name: "Protoplasm",
        summary:
          "Ranged touch attack (30 ft.): create an entropic ball that acts as a tanglefoot bag and deals 1 acid damage per round, dissolving after 1d3 rounds.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "proteanResistances",
        level: 3,
        name: "Protean Resistances",
        summary:
          "Resist acid 5 and +2 on saves against polymorph, petrification, and transmutation effects (acid 10 and +4 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 10, 5)", "eres.acid", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. polymorph, petrification, and transmutation effects only; not a general save bonus.",
          },
        ],
      },
      {
        id: "realityWrinkle",
        level: 9,
        name: "Reality Wrinkle",
        summary:
          "Surround yourself with a 10-ft. mobile aura that grants a 20% miss chance to attackers, for a number of rounds per day equal to your sorcerer level.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of 20% miss chance/day",
        },
      },
      {
        id: "spatialTear",
        level: 15,
        name: "Spatial Tear",
        summary:
          "Once per day (twice at 20th level), cast dimension door while leaving black tentacles at your point of origin.",
        resourcePool: { usesFormula: "if(gte(@classes.sorcerer.level, 20), 2, 1)", per: "day" },
      },
      {
        id: "avatarOfChaos",
        level: 20,
        name: "Avatar of Chaos",
        summary:
          "Immune to acid, petrification, and polymorph effects (except your own); +2 to save DCs and spell penetration checks against creatures with the lawful subtype.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Protean): "immunity
        // to acid, petrification, and polymorph effects (except when cast on
        // self), as well as a +2 bonus to save DCs and on checks to overcome
        // spell penetration against creatures with the lawful subtype."
        // Polymorph-effect immunity has no closed-vocabulary immEffect slug
        // (only specific named effects like sleep/paralysis/phantasms are
        // covered) — stays display only, unlike acid/petrification.
        changes: [c("1", "imm.acid", "untyped"), c("1", "immEffect.petrification", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to polymorph effects (except your own); no polymorph-immunity target exists, so that clause and the +2 vs. lawful save DC/penetration bonus stay manual.",
          },
        ],
      },
    ],
  },
  // ---- Psychic ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Psychic)
  {
    tag: "Psychic",
    name: "Psychic",
    bonusFeatSlugs: feats(
      "Focused Spell",
      "Heighten Spell",
      "Intuitive Spell",
      "Iron Will",
      "Logical Spell",
      "Persuasive",
      "Quicken Spell",
      "Skill Focus",
      "Spell Focus",
    ),
    arcana: {
      summary:
        "Your sorcerer spells and spell-like abilities count as psychic instead of arcane, and use thought and emotion components instead of verbal and somatic ones.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Changes your spells' descriptor and components, not a numeric effect; track manually.",
        },
      ],
    },
    powers: [
      {
        id: "psychicStrike",
        level: 1,
        name: "Psychic Strike",
        summary:
          "Melee touch attack: 1d6 damage plus half your sorcerer level; on a failed Will save the target is also shaken for 1 round.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "mentalResistance",
        level: 3,
        name: "Mental Resistance",
        summary: "+2 bonus on saves against mind-affecting effects (+4 at 9th level).",
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "vs. mind-affecting effects only; not a general save bonus.",
          },
        ],
      },
      {
        id: "undercastingProdigy",
        level: 9,
        name: "Undercasting Prodigy",
        summary:
          "Whenever you cast a psychic spell at less than its maximum possible level, it's automatically cast at the highest level you could cast it at, for free.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Applies to undercast psychic spells only; apply manually when casting.",
          },
        ],
      },
      {
        id: "thoughtsense",
        level: 15,
        name: "Thoughtsense",
        summary:
          "Constant thoughtsense with a range of 30 feet, detecting the thoughts of living creatures around you.",
        changes: [c("30", "senseths", "untyped")],
      },
      {
        id: "trueThoughtForm",
        level: 20,
        name: "True Thought-Form",
        summary:
          "As an immediate action when killed, attempt to swap your mind into a nearby body, shedding your physical form.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Triggers only when you die; situational, not auto-applied.",
          },
        ],
      },
    ],
  },
  // ---- Rakshasa ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Rakshasa)
  {
    tag: "Rakshasa",
    name: "Rakshasa",
    bonusFeatSlugs: feats(
      "Arcane Armor Mastery",
      "Arcane Armor Training",
      "Deceitful",
      "Detect Expertise",
      "Empower Spell",
      // AoN prints "Light Armor Proficiency"; the vendored feat is named
      // "Armor Proficiency, Light".
      "Armor Proficiency, Light",
      "Martial Weapon Proficiency",
      "Stealthy",
    ),
    arcana: {
      summary:
        "Add half your sorcerer level to the Spellcraft DC for others to identify spells you cast; if a check fails by 5 or more, the observer instead believes you cast a different spell of your choosing.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Raises others' Spellcraft DC to identify your spells only; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "silverTongue",
        level: 1,
        name: "Silver Tongue",
        summary:
          "Swift action: +5 bonus on one Bluff check to convince someone your words are true; a magical effect used against you to detect lies or compel truth requires a caster level check (DC 10 + sorcerer level) to work.",
        resourcePool: { ...POOL_3_CHA, detail: "+5 Bluff (swift action)" },
      },
      {
        id: "mindReader",
        level: 3,
        name: "Mind Reader",
        summary:
          "Standard action: read a single target's mind as detect thoughts for 1 round; on a failed Will save, gain the information as if you had concentrated on the target for 3 rounds. Uses per day increase every four sorcerer levels beyond 3rd, up to five at 20th.",
        resourcePool: {
          usesFormula: "1 + floor(max(0, @classes.sorcerer.level - 3) / 4)",
          per: "day",
        },
      },
      {
        id: "hideAura",
        level: 9,
        name: "Hide Aura",
        summary: "Constant nondetection protects you; toggle it on or off as a move action.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Constant spell-like ability, not a numeric effect; display only.",
          },
        ],
      },
      {
        id: "alterSelf",
        level: 15,
        name: "Alter Self",
        summary:
          "Assume the form of any humanoid, as alter self, at will and for an indefinite duration.",
        contextNotes: [
          { target: "allChecks", text: "At-will shapechange with no stat effect tracked here." },
        ],
      },
      {
        id: "outsider",
        level: 20,
        name: "Outsider",
        summary:
          "Your true form becomes an animal-headed humanoid; you're treated as a native outsider rather than your original creature type (though you can still be raised or resurrected as your old type), and you gain DR 10/piercing.",
        changes: [c("10", "dr.piercing", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Type change to native outsider (with your old type's resurrection rules preserved) isn't tracked here.",
          },
        ],
      },
    ],
  },
  // ---- Salamander ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Salamander)
  {
    tag: "Salamander",
    name: "Salamander",
    bonusFeatSlugs: feats(
      "Cleave",
      "Craft Wondrous Item",
      "Iron Will",
      "Power Attack",
      "Prodigy",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "The save DC of your sorcerer spells increases by 2 against creatures currently suffering ongoing fire damage.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+2 DC only against creatures taking ongoing fire damage; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "ember",
        level: 1,
        name: "Ember",
        summary:
          "Expend uses (up to half your sorcerer level at once) for a circumstance bonus on a Craft check involving metal equal to twice the uses expended; 3 + Charisma modifier uses per day.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "forgeAndFire",
        level: 3,
        name: "Forge and Fire",
        summary:
          "Gain Craft Magic Arms and Armor as a bonus feat; nonpermanent enhancement spells you cast on a manufactured weapon also grant it the flaming property for the spell's duration, if it lacks one.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Craft Magic Arms and Armor bonus feat and the flaming rider aren't modeled here.",
          },
        ],
      },
      {
        id: "serpentsTail",
        level: 9,
        name: "Serpent's Tail",
        summary:
          "Free action: transform your legs into a serpentine tail, reducing speed by 10 feet (minimum 5) but making you immune to tripping; gain a tail slap attack (1d8, 1d6 if Small, plus Strength modifier; reach +5 feet at 15th level). Lasts a number of minutes per day, in 1-minute increments, equal to your sorcerer level.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes of serpent's tail/day",
        },
        contextNotes: [
          {
            target: "landSpeed",
            text: "-10 ft. speed, trip immunity, and the tail slap attack only apply while transformed; not auto-applied.",
          },
        ],
      },
      {
        id: "searingHeat",
        level: 15,
        name: "Searing Heat",
        summary:
          "Free action: your natural and metal melee attacks deal +1d6 fire damage (2d6 fire per round while grappling).",
        contextNotes: [{ target: "allChecks", text: "Activated damage rider; roll manually." }],
      },
      {
        id: "reforgedFlesh",
        level: 20,
        name: "Reforged Flesh",
        summary: "Immune to fire damage; DR 10/adamantine and magic.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Salamander): "you
        // become immune to fire damage and gain DR 10/adamantine and magic."
        // A weapon must be BOTH magic AND adamantine to bypass — the compound
        // `-and-` qualifier `damage-resolution.ts`'s qualifierBypassedBy
        // already splits with every-part-required semantics.
        changes: [c("1", "imm.fire", "untyped"), c("10", "dr.adamantine-and-magic", "untyped")],
      },
    ],
  },
  // ---- Scorpion ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Scorpion)
  {
    tag: "Scorpion",
    name: "Scorpion",
    bonusFeatSlugs: feats(
      "Arcane Strike",
      "Blind-Fight",
      "Combat Reflexes",
      "Disruptive Spell",
      "Improved Initiative",
      "Nimble Moves",
      "Skill Focus",
      "Stealthy",
    ),
    arcana: {
      summary:
        "You're trained in the use of poison and never risk poisoning yourself when applying poison to a weapon.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Removes the self-poisoning risk when applying poison; no roll to suppress here.",
        },
      ],
    },
    powers: [
      {
        id: "progenitorsSting",
        level: 1,
        name: "Progenitor's Sting",
        summary:
          "Apply toxic essence to a weapon: on a hit it deals 1 point of ability damage (Fortitude DC 10 + half sorcerer level + Charisma modifier negates). Damage becomes 1d3 at 5th level, a second ability score can be chosen at 7th, and at 11th it can be applied to all willing allies' weapons within 20 feet.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "modifyOnset",
        level: 3,
        name: "Modify Onset",
        summary:
          "Increase a poison's onset time by up to 1 hour per sorcerer level; at 9th level, instead delay onset up to a week and trigger it yourself as a swift action.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Applies to a poison you're delivering, not a stat effect; situational.",
          },
        ],
      },
      {
        id: "suddenSting",
        level: 9,
        name: "Sudden Sting",
        summary:
          "Act normally during a surprise round; cast accelerate poison and delay poison as spell-like abilities, three times per day combined.",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail: "Accelerate/delay poison (combined)",
        },
      },
      {
        id: "sandwalker",
        level: 15,
        name: "Sandwalker",
        summary: "Gain a burrow speed of 30 feet and tremorsense with a range of 60 feet.",
        changes: [c("30", "burrowSpeed", "base", "set"), c("60", "sensets", "untyped")],
      },
      {
        id: "itIsMyNature",
        level: 20,
        name: "It Is My Nature",
        summary:
          "Immediate action, three times per day: melee touch attack against an adjacent creature; on a failed Fortitude save (DC 10 + half sorcerer level + Charisma modifier) the target dies.",
        resourcePool: { usesFormula: "3", per: "day" },
      },
    ],
  },
  // ---- Serpentine ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Serpentine)
  {
    tag: "Serpentine",
    name: "Serpentine",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Combat Reflexes",
      "Deceitful",
      "Deft Hands",
      "Persuasive",
      "Silent Spell",
      "Skill Focus",
      "Stealthy",
    ),
    arcana: {
      summary:
        "Your mind-affecting and language-dependent spells affect animals, magical beasts, and monstrous humanoids as though they were humanoids who understand your language.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Widens which creature types your mind-affecting/language-dependent spells can target; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "serpentsFang",
        level: 1,
        name: "Serpent's Fang",
        summary:
          "Grow fangs as a free action dealing 1d4 plus Strength modifier plus poison (Fortitude DC 10 + half sorcerer level + Constitution modifier negates; 1 Constitution damage per round for 6 rounds, cured by 1 save). Fangs become magic at 5th (poison rises to 1d2 Con), need two saves to cure at 7th, and deal 1d4 Con at 11th. Usable for 3 + Charisma modifier rounds per day.",
        resourcePool: { ...POOL_3_CHA, detail: "Rounds of serpent's fang/day" },
      },
      {
        id: "serpentfriend",
        level: 3,
        name: "Serpentfriend",
        summary:
          "Cast speak with animals at will, limited to reptiles; gain a viper familiar using your sorcerer level minus 2 as your effective wizard level.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Speak with animals (reptiles) and the viper familiar aren't modeled as a granted SLA or familiar here.",
          },
        ],
      },
      {
        id: "snakeskin",
        level: 9,
        name: "Snakeskin",
        summary:
          "+1 natural armor, +2 racial bonus on saves against poison, and +2 on Escape Artist checks (all +1 higher at 13th and 17th level).",
        changes: [
          c(
            "if(gte(@classes.sorcerer.level, 17), 3, if(gte(@classes.sorcerer.level, 13), 2, 1))",
            "nac",
            "natural",
          ),
          c(
            "if(gte(@classes.sorcerer.level, 17), 4, if(gte(@classes.sorcerer.level, 13), 3, 2))",
            "skill.esc",
            "untyped",
          ),
        ],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+3 at 13th, +4 at 17th) vs. poison only; not a general save bonus.",
          },
        ],
      },
      {
        id: "denOfVipers",
        level: 15,
        name: "Den of Vipers",
        summary:
          "Once per day, summon serpent swarms as creeping doom; the swarms deal Constitution damage and entangle any creature (other than you) sharing their space.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "scaledSoul",
        level: 20,
        name: "Scaled Soul",
        summary:
          "Gain the shapechanger subtype; assume a reptilian humanoid form (as alter self) or a snake form from Diminutive to Huge (as beast shape III) at will, keeping speech and somatic components. Immune to poison and paralysis; use serpent's fang unlimited times, damaging any ability score you choose.",
        changes: [c("1", "immEffect.poison", "untyped"), c("1", "immEffect.paralysis", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Shapechanger subtype and the at-will alter self/beast shape III forms aren't modeled here.",
          },
        ],
      },
    ],
  },
  // ---- Shadow ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Shadow)
  {
    tag: "Shadow",
    name: "Shadow",
    bonusFeatSlugs: feats(
      "Acrobatic",
      "Blind-Fight",
      "Dodge",
      "Quick Draw",
      "Silent Spell",
      "Skill Focus",
      "Stealthy",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell with the darkness descriptor or the shadow subschool, you gain a circumstance bonus on Stealth checks equal to the spell's level for 1d4 rounds.",
      changes: [],
      contextNotes: [
        {
          target: "skill.ste",
          text: "Circumstance Stealth bonus only for 1d4 rounds after casting a darkness or shadow-subschool spell: apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "shadowstrike",
        level: 1,
        name: "Shadowstrike",
        summary:
          "Melee touch attack: 1d4 nonlethal damage + 1 per two sorcerer levels, dazzling the target for 1 minute (ineffective against low-light vision or darkvision).",
        resourcePool: { ...POOL_3_CHA, detail: "1d4+1/2 lvl nonlethal, dazzled" },
      },
      {
        id: "nighteye",
        level: 3,
        name: "Nighteye",
        summary:
          "Darkvision 30 ft. (60 ft. at 9th level); if you already have darkvision, its range increases by that amount instead.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Shadow): "you gain
        // darkvision 30 feet. At 9th level, you gain darkvision 60 feet. If
        // you already possess darkvision, its range is increased by these
        // amounts." Textbook grant==rider shape (senses.ts's operator "add"
        // convention): existing + X reproduces both halves (no darkvision ->
        // 0 + X = X).
        changes: [c("if(gte(@classes.sorcerer.level, 9), 60, 30)", "sensedv", "untyped", "add")],
      },
      {
        id: "shadowWell",
        level: 9,
        name: "Shadow Well",
        summary:
          "Use Stealth while observed within 10 ft. of a shadow; standard action to swap places with a willing ally in darkness/dim light (as dimension door), two allies at 13th level.",
        resourcePool: burstPool(9, "Switch-places uses/day"),
        contextNotes: [
          {
            target: "allChecks",
            text: "The Stealth-while-observed clause is always on but situational (must be within 10 ft. of a shadow); not auto-applied.",
          },
        ],
      },
      {
        id: "envelopingDarkness",
        level: 15,
        name: "Enveloping Darkness",
        summary:
          "Create an area of deeper darkness you see through without penalty; other creatures inside are entangled unless using freedom of movement or similar.",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "shadowMaster",
        level: 20,
        name: "Shadow Master",
        summary:
          "See perfectly in natural or magical darkness; shadow conjuration/evocation creations are 20% more real and gain the Augment Summoning benefit.",
        // RAW gives no numeric range for the darkness-sight clause (unlike
        // Infernal's Power of the Pit, which caps at 60 ft.), so there's no
        // sensedv formula to hold it — stays display only.
        contextNotes: [
          {
            target: "allChecks",
            text: "Display only: unlimited-range darkness sight and the shadow-spell reality/Augment Summoning boost aren't tracked on the sheet.",
          },
        ],
      },
    ],
  },
  // ---- Shaitan ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Shaitan)
  {
    tag: "Shaitan",
    name: "Shaitan",
    bonusFeatSlugs: feats(
      "Dodge",
      "Empower Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Skill Focus",
      "Weapon Finesse",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell that deals energy damage, you can change the damage type (and descriptors) to acid.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Energy-type swap to acid is a casting-time choice; no number to track here.",
        },
      ],
    },
    powers: [
      {
        id: "acidRay",
        level: 1,
        name: "Acid Ray",
        summary: "Ranged touch attack (30 ft.): 1d6 acid damage + 1 per two sorcerer levels.",
        resourcePool: { ...POOL_3_CHA, detail: "1d6+1/2 lvl acid" },
      },
      {
        id: "elementalResistance",
        level: 3,
        name: "Elemental Resistance",
        summary: "Resist acid 10 (20 at 9th level).",
        changes: [c("if(gte(@classes.sorcerer.level, 9), 20, 10)", "eres.acid", "untyped")],
      },
      {
        id: "avalanche",
        level: 9,
        name: "Avalanche",
        summary:
          "After hitting with a damaging spell, swift-action bull rush (CMB = caster level + Cha bonus, +4 if the target touches earth/stone/rock), no attack of opportunity.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only triggers after a damaging spell hits; situational, not auto-applied.",
          },
        ],
      },
      {
        id: "elementalMovement",
        level: 15,
        name: "Elemental Movement",
        summary: "Gain a burrow speed of 30 ft.",
        changes: [c("30", "burrowSpeed", "base", "set")],
      },
      {
        id: "powerOfTheShaitan",
        level: 20,
        name: "Power of the Shaitan",
        summary:
          "Immune to acid damage; cast limited wish once per day; use plane shift once per day to or from the Plane of Earth.",
        changes: [c("1", "imm.acid", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also grants limited wish and plane shift, both once per day (display only).",
          },
        ],
      },
    ],
  },
  // ---- Shapechanger ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Shapechanger)
  {
    tag: "Shapechanger",
    name: "Shapechanger",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Dodge",
      "Extend Spell",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "Transmutation spells you cast only on yourself affect you as though your caster level were 1 higher.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 effective caster level only for self-only transmutation spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "hardenedFists",
        level: 1,
        name: "Hardened Fists",
        summary:
          "Free action: unarmed strikes (or claws) deal damage as one size category larger, deal lethal damage, and don't provoke attacks of opportunity.",
        resourcePool: { ...POOL_3_CHA, detail: "Rounds/day of enlarged unarmed strikes" },
      },
      {
        id: "mutableFlesh",
        level: 3,
        name: "Mutable Flesh",
        summary:
          "Once per day, extend a self-only transmutation spell's duration from 1 minute/level to 10 minutes/level (1 hour/level at 9th level).",
        resourcePool: { usesFormula: "1", per: "day" },
      },
      {
        id: "vortexOfFlesh",
        level: 9,
        name: "Vortex of Flesh",
        summary:
          "Standard action: transform into erratic geometric shapes, dealing 1d6 damage per sorcerer level to every creature in a 20-ft.-radius spread (Reflex half).",
        resourcePool: burstPool(9),
      },
      {
        id: "superiorTransformation",
        level: 15,
        name: "Superior Transformation",
        summary:
          "Immune to polymorph effects unless willing; once per day, a self-cast polymorph spell also grants a fly speed of 60 ft., a swim speed of 60 ft., or +30 ft. base land speed (your choice).",
        // "Immune to polymorph effects" has no immEffect slug in the closed
        // vocabulary (magicSleep/sleep/paralysis/... doesn't include
        // polymorph) — stays display only, same gap Verdant's Shepherd of
        // the Trees hits below.
        contextNotes: [
          {
            target: "allChecks",
            text: "Polymorph immunity has no tracked target; the bonus movement mode only applies once daily when self-polymorphing; both display only.",
          },
        ],
      },
      {
        id: "amorphousAnatomy",
        level: 20,
        name: "Amorphous Anatomy",
        summary:
          "Immune to critical hits and sneak attacks; blindsight 60 ft.; damage reduction 5/-; automatically recover from blindness or deafness after 1 round.",
        // Same shape as Aberrant's Aberrant Form capstone above: sneak
        // attack is precision damage (immEffect.precisionDamage), "critical
        // hits" is immEffect.criticalHits verbatim.
        changes: [
          c("60", "sensebs", "untyped"),
          c("5", "dr", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Auto-recovery from blindness/deafness after 1 round isn't tracked; display only.",
          },
        ],
      },
    ],
  },
  // ---- Solar ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Solar)
  {
    tag: "Solar",
    name: "Solar",
    bonusFeatSlugs: feats(
      "Alertness",
      "Combat Casting",
      "Empower Spell",
      "Improved Initiative",
      "Lightning Reflexes",
      "Quicken Spell",
      "Spell Focus",
      "Spell Penetration",
    ),
    arcana: {
      summary:
        "Whenever you cast a damaging spell with the fire descriptor, it deals +1 point of damage per die rolled.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 damage/die only on fire-descriptor spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "sunsight",
        level: 1,
        name: "Sunsight",
        summary:
          "Low-light vision and immunity to being dazzled; if you already have low-light vision, +4 on saves against blindness effects instead.",
        // Grant (low-light vision) and rider (+4 vs. blindness) differ, so
        // this can't use the senses.ts operator "add" trick (module doc
        // comment's Bat/Shadow's Sight exception) — flat sensell grant plus
        // a contextNote for the rider, same posture as that file documents.
        changes: [c("1", "sensell", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+4 vs. blindness only if you already had low-light vision before this power; situational. Immunity to being dazzled isn't tracked (no matching target).",
          },
        ],
      },
      {
        id: "friendOfFire",
        level: 3,
        name: "Friend of Fire",
        summary:
          "Resist fire 10 (20 at 9th level, immune at 20th); when in contact with flame, healing effects on you gain +1 per die.",
        // RAW (aonprd.com, BloodlineDisplay.aspx?ItemName=Solar): the 20th-
        // level immunity clause lives inside this same power (there's a
        // separate "Solar Ascension" capstone for something else), so the
        // imm.fire grant is gated by an if(gte(...)) formula rather than
        // split into its own power entry — defenses.ts's groupImmunities
        // explicitly treats a zero-evaluating formula as "not granted" (the
        // same conditional-formula guard senses.ts uses), so this is safe.
        changes: [
          c("if(gte(@classes.sorcerer.level, 9), 20, 10)", "eres.fire", "untyped"),
          c("if(gte(@classes.sorcerer.level, 20), 1, 0)", "imm.fire", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "+1 healing per die only while in contact with flame (5th level); situational, not auto-applied.",
          },
        ],
      },
      {
        id: "cleansingFlame",
        level: 9,
        name: "Cleansing Flame",
        summary:
          "Standard action, touch: heal 2d8 + character level and remove one condition from a list (ability damage, blinded, confused, dazzled, deafened, diseased, exhausted, fatigued, nauseated, poisoned, sickened). Twice daily (3/day at 20th level).",
        resourcePool: {
          usesFormula: "if(gte(@classes.sorcerer.level, 20), 3, 2)",
          per: "day",
          detail: "2d8 + level healing, remove one condition",
        },
      },
      {
        id: "healingFire",
        level: 15,
        name: "Healing Fire",
        summary:
          "Channel energy twice per day as a cleric of half your level, converting the positive energy to fire damage instead of harming undead.",
        resourcePool: { usesFormula: "2", per: "day" },
      },
      {
        id: "solarAscension",
        level: 20,
        name: "Solar Ascension",
        summary:
          "Full-round action: become an incorporeal being of light for 1 round per sorcerer level, taking half damage from corporeal magic and dealing 2d6 fire damage to anyone you overrun through.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of incorporeal light form/day",
        },
      },
    ],
  },
  // ---- Starsoul ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Starsoul)
  {
    tag: "Starsoul",
    name: "Starsoul",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Craft Rod",
      "Dodge",
      "Endurance",
      "Improved Counterspell",
      "Iron Will",
      "Quicken Spell",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "Whenever you cast an evocation spell, targets that fail their saves are dazzled by tiny sparkling starlights for 1 round per level of the spell.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Dazzled rider only on failed saves against your evocation spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "minuteMeteors",
        level: 1,
        name: "Minute Meteors",
        summary:
          "Standard action: rain of meteorites in a 5-ft. column, 30 ft. high (30-ft. range), 1d4 fire damage + 1 per two sorcerer levels, Reflex negates.",
        resourcePool: { ...POOL_3_CHA, detail: "1d4+1/2 lvl fire, Reflex negates" },
      },
      {
        id: "voidwalker",
        level: 3,
        name: "Voidwalker",
        summary:
          "Low-light vision and resist cold and fire 5; at 9th level, no longer need to breathe.",
        changes: [
          c("1", "sensell", "untyped"),
          c("5", "eres.cold", "untyped"),
          c("5", "eres.fire", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "At 9th level you no longer need to breathe (as necklace of adaptation); no tracked target, display only.",
          },
        ],
      },
      {
        id: "auroraBorealis",
        level: 9,
        name: "Aurora Borealis",
        summary:
          "Create a wall-of-fire-like sheet of cold-damage color that fascinates up to 2 HD of creatures per sorcerer level within 10 ft. of one side (Will negates).",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of aurora/day",
        },
      },
      {
        id: "breachingTheGulf",
        level: 15,
        name: "Breaching the Gulf",
        summary:
          "+3 caster level for teleportation-subschool spells; once per day, banish a creature within 30 ft. into airless space (Will negates) for 6d6 cold damage per round until it escapes.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Banish into void" },
        contextNotes: [
          { target: "allChecks", text: "+3 caster level only for teleportation-subschool spells." },
        ],
      },
      {
        id: "starborn",
        level: 20,
        name: "Starborn",
        summary:
          "Immune to cold and blindness; see perfectly in any darkness; fast healing 1 while outdoors at night.",
        // "Blindness" has no immEffect slug in the closed vocabulary and the
        // darkness-sight clause carries no numeric range (unlike Infernal's
        // capped Power of the Pit above) — both stay display only.
        changes: [c("1", "imm.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to blindness and sees perfectly in any darkness (neither has a tracked target); fast healing 1 only outdoors at night.",
          },
        ],
      },
    ],
  },
  // ---- Stormborn ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Stormborn)
  {
    tag: "Stormborn",
    name: "Stormborn",
    bonusFeatSlugs: feats(
      "Deadly Aim",
      "Dodge",
      "Enlarge Spell",
      "Far Shot",
      "Great Fortitude",
      "Point-Blank Shot",
      "Skill Focus",
      "Wind Stance",
    ),
    arcana: {
      summary:
        "Whenever you cast a spell with the electricity or sonic descriptor, its save DC increases by 1.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "+1 DC only on electricity- or sonic-descriptor spells; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "thunderstaff",
        level: 1,
        name: "Thunderstaff",
        summary:
          "Standard action, touch a weapon: grants the shock property for rounds equal to half sorcerer level (min 1); shocking burst instead at 9th level (halved duration).",
        resourcePool: { ...POOL_3_CHA, detail: "Rounds of weapon shock/day" },
      },
      {
        id: "stormchild",
        level: 3,
        name: "Stormchild",
        summary:
          "Resist electricity 5 and sonic 5; treat wind effects as one step less severe (two at 9th level, plus blindsense 60 ft. against weather-based concealment).",
        // The 9th-level "blindsense 60 ft." clause is scoped narrowly to
        // weather-based concealment only (fog/mist/weather), not the full
        // blindsense sense (which ignores concealment/invisibility
        // generally) — granting sensebse would overstate it, so it stays a
        // contextNote alongside the wind-severity clause.
        changes: [c("5", "eres.electricity", "untyped"), c("5", "eres.sonic", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Wind-severity reduction and the 9th-level weather-only blindsense aren't tracked; situational, apply manually.",
          },
        ],
      },
      {
        id: "thunderbolt",
        level: 9,
        name: "Thunderbolt",
        summary:
          "Command a lightning strike (120-ft. range) in a 5-ft.-radius cylinder: 1d6 damage per sorcerer level, half electricity/half sonic, Reflex halves (failure also deafens 1 round).",
        resourcePool: burstPool(9),
      },
      {
        id: "rideTheLightning",
        level: 15,
        name: "Ride the Lightning",
        summary:
          "Full-round action: become living lightning, moving up to 10x speed in a straight line without provoking, affecting creatures in your path as Thunderbolt.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Rounds of lightning movement/day",
        },
      },
      {
        id: "stormLord",
        level: 20,
        name: "Storm Lord",
        summary:
          "Immune to deafness, stunning, and wind effects; blindsight 120 ft. against weather-based concealment; once per day, absorb an electricity or sonic attack for fast healing.",
        // Immunity to deafness has no immEffect slug (no "deafness" entry in
        // the closed vocabulary) and "wind effects" isn't a modelable
        // target either; the 120-ft. blindsight is the same weather-scoped
        // narrowing as Stormchild above, so it's likewise left untracked.
        // Only "stunning" maps cleanly (immEffect.stunned).
        changes: [c("1", "immEffect.stunned", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Immunity to deafness and wind effects, weather-scoped blindsight 120 ft., and the once-daily absorb-and-heal aren't tracked; all display only.",
          },
        ],
      },
    ],
  },
  // ---- Unicorn ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Unicorn)
  {
    tag: "Unicorn",
    name: "Unicorn",
    bonusFeatSlugs: feats(
      "Alertness",
      "Animal Affinity",
      "Brew Potion",
      "Fleet",
      "Great Fortitude",
      "Improved Counterspell",
      "Self-Sufficient",
      "Skill Focus",
    ),
    arcana: {
      summary:
        "Every time you cast a spell, you can restore hit points equal to double the spell's level to one target you can see.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Optional per-cast healing rider to a chosen visible target; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "safekeeping",
        level: 1,
        name: "Safekeeping",
        summary: "Standard action, touch: +2 insight bonus to AC for 1 round.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "pureOfMind",
        level: 3,
        name: "Pure of Mind",
        summary: "+2 vs. charm effects and +4 vs. evil-descriptor spells (+4/+6 at 9th level).",
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. charm effects and +4 (+6 at 9th) vs. evil-descriptor spells only; not a general save bonus.",
          },
        ],
      },
      {
        id: "righteousFury",
        level: 9,
        name: "Righteous Fury",
        summary:
          "Standard action: throw a spear of light (60 ft., ranged touch using Cha in place of Dex) for 1d6 damage per sorcerer level (1d8 vs. evil creatures), ignoring DR and hardness.",
        resourcePool: {
          usesFormula:
            "if(gte(@classes.sorcerer.level, 17), 3, if(gte(@classes.sorcerer.level, 13), 2, 1))",
          per: "day",
        },
      },
      {
        id: "friendToNature",
        level: 15,
        name: "Friend to Nature",
        summary:
          "Non-evil animals and magical beasts start at indifferent attitude or better toward you, absent provocation.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Narrative starting-attitude effect, not a numeric bonus; GM-adjudicated.",
          },
        ],
      },
      {
        id: "blessing",
        level: 20,
        name: "Blessing",
        summary:
          "Immune to poison, charm effects, and evil-descriptor spells/weapons; cast magic circle against evil at will.",
        // "Evil-descriptor spells/weapons" immunity has no single immEffect
        // slug (only the "charm" and "poison" halves map cleanly).
        changes: [c("1", "immEffect.poison", "untyped"), c("1", "immEffect.charm", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Immunity to evil-descriptor spells/weapons and the at-will magic circle against evil aren't tracked; display only.",
          },
        ],
      },
    ],
  },
  // ---- Verdant ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Verdant)
  {
    tag: "Verdant",
    name: "Verdant",
    bonusFeatSlugs: feats(
      "Acrobatic Steps",
      "Craft Staff",
      "Endurance",
      "Extend Spell",
      "Fleet",
      "Nimble Moves",
      "Skill Focus",
      "Toughness",
    ),
    arcana: {
      summary:
        "Whenever you cast a personal-range spell, gain a natural armor bonus equal to the spell's level for 1d4 rounds (doesn't stack with other natural armor).",
      changes: [],
      contextNotes: [
        {
          target: "ac",
          text: "Natural armor bonus only for 1d4 rounds after a personal-range spell; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "tanglevine",
        level: 1,
        name: "Tanglevine",
        summary:
          "Standard action: animated 15-ft. vine performs a single disarm, steal, or trip maneuver using sorcerer level + Cha modifier as CMB.",
        resourcePool: POOL_3_CHA,
      },
      {
        id: "photosynthesis",
        level: 3,
        name: "Photosynthesis",
        summary:
          "Reduced need to eat and sleep (as ring of sustenance); +2 vs. poison and sleep effects (+4 at 9th level).",
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 9th) vs. poison and sleep effects only; not a general save bonus. Reduced sustenance need isn't tracked.",
          },
        ],
      },
      {
        id: "massmorph",
        level: 9,
        name: "Massmorph",
        summary:
          "Full-round action: alter plant size/health (as plant growth/diminish plants), or transform willing non-plant creatures into tree shape (plant shape I at 15th, plant shape II at 20th); non-plant transformation is once per day.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Transform non-plant creatures" },
        contextNotes: [
          {
            target: "allChecks",
            text: "The plant-growth/diminish-plants clause is unlimited; only the creature-transformation use is capped and tracked here.",
          },
        ],
      },
      {
        id: "rooting",
        level: 15,
        name: "Rooting",
        summary:
          "Move action: extend roots (speed reduced to 5 ft.) for +4 natural armor, +10 CMD vs. bull rush/overrun/reposition/trip, tremorsense 30 ft., and fast healing 1.",
        resourcePool: {
          usesFormula: "@classes.sorcerer.level",
          per: "day",
          detail: "Minutes rooted/day",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "All benefits (and the speed penalty) apply only while rooted; situational, not auto-applied.",
          },
        ],
      },
      {
        id: "shepherdOfTheTrees",
        level: 20,
        name: "Shepherd of the Trees",
        summary:
          "+4 natural armor; immune to paralysis, poison, polymorph, sleep, and stunning; tremorsense 30 ft. even when not rooted.",
        // "Polymorph" has no immEffect slug in the closed vocabulary — the
        // other four map cleanly. Tremorsense is genuinely unconditional
        // here (unlike Rooting's 15th-level version, which only applies
        // while rooted).
        changes: [
          c("4", "nac", "natural"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
          c("1", "immEffect.stunned", "untyped"),
          c("30", "sensets", "untyped"),
        ],
        contextNotes: [
          { target: "allChecks", text: "Polymorph immunity has no tracked target; display only." },
        ],
      },
    ],
  },
  // ---- Vestige ---- (source: https://aonprd.com/BloodlineDisplay.aspx?ItemName=Vestige)
  {
    tag: "Vestige",
    name: "Vestige",
    bonusFeatSlugs: feats(
      "Arcane Strike",
      "Augment Summoning",
      "Craft Wondrous Item",
      "Echoing Spell",
      "Iron Will",
      "Leadership",
      "Skill Focus",
      "Spell Focus",
    ),
    arcana: {
      summary:
        "Whenever you cast a divination spell, gain an insight bonus equal to its level on your next Appraise, Craft, or Knowledge check within 24 hours.",
      changes: [],
      contextNotes: [
        {
          target: "allChecks",
          text: "Insight bonus only on the next Appraise/Craft/Knowledge check after a divination spell; apply manually.",
        },
      ],
    },
    powers: [
      {
        id: "bondedObject",
        level: 1,
        name: "Bonded Object",
        summary:
          "Gain a wizard-style arcane bond with an object; once per day it lets you cast any one spell you know and increase that spell's save DC by 1.",
        resourcePool: { usesFormula: "1", per: "day", detail: "Emergency spell (bonded object)" },
      },
      {
        id: "restoredGlory",
        level: 3,
        name: "Restored Glory",
        summary:
          "Broken items in your possession function normally; at 9th level, destroyed (0 hp) items function as merely broken; at 15th level, they appear fully repaired.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Equipment-condition state, not a character stat; display only.",
          },
        ],
      },
      {
        id: "callAncestor",
        level: 9,
        name: "Call Ancestor",
        summary:
          "Standard action: summon an ancestor simulacrum (as lesser simulacrum) with your statistics for 1 round per sorcerer level, trained in one chosen Knowledge skill.",
        resourcePool: burstPool(9),
      },
      {
        id: "eternalPast",
        level: 15,
        name: "Eternal Past",
        summary:
          "Gain a permanent mindscape (as greater create mindscape) shaped like a lost civilization, usable as a library for all Knowledge skills.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Passive utility ability, not a numeric bonus; display only.",
          },
        ],
      },
      {
        id: "manifestMemory",
        level: 20,
        name: "Manifest Memory",
        summary:
          "At will, overlay portions of your mindscape onto the world (as mirage arcana), maintaining only one at a time.",
        contextNotes: [
          {
            target: "allChecks",
            text: "At-will illusion ability, not a numeric bonus; display only.",
          },
        ],
      },
    ],
  },
];

export const BLOODLINES: Record<string, BloodlineDef> = Object.fromEntries(
  BLOODLINE_LIST.map((b) => [b.tag, b]),
);

export const BLOODLINE_TAGS: readonly string[] = BLOODLINE_LIST.map((b) => b.tag);

/**
 * True when the bloodline carries any live mechanics — a `changes`/
 * `variantChanges` array or a resource pool — as opposed to being fully
 * rules-text. The picker's "M" badge convention (a hand-authored entry whose
 * every power is prose still doesn't move numbers, so it gets no badge).
 */
export function bloodlineMovesNumbers(def: {
  arcana?: { changes: Change[] };
  powers: BloodlinePower[];
}): boolean {
  if (def.arcana?.changes.length) return true;
  return def.powers.some(
    (p) =>
      (p.changes?.length ?? 0) > 0 ||
      Object.keys(p.variantChanges ?? {}).length > 0 ||
      p.resourcePool !== undefined,
  );
}

/** Human-readable label for a bloodline's chosen variant id, or `undefined` if unset/unknown. */
export function bloodlineVariantLabel(
  tag: string,
  variantId: string | undefined,
): string | undefined {
  if (!variantId) return undefined;
  const bloodline = BLOODLINES[tag];
  return bloodline?.variantOptions?.find((v) => v.id === variantId)?.label;
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.sorcererBloodlines` is the FULL published
 * catalog (51 entries after junk filtering), prose only — same "catalog
 * from data, mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified table above (now the whole
 * published catalog) stays authoritative for arcana/powers/bonus feats;
 * this section attaches each vendored entry's prose description and
 * sources for browsing.
 *
 * Matching is by NORMALIZED NAME (this table's `tag` doubles as its display
 * `name`, e.g. `"Aberrant"`). Collision audit: every hand-authored
 * bloodline matches a vendored entry by normalized name except "Kobold"
 * (vendored as "Kobold Sorcerer"), bridged by the alias map below. The
 * vendored-only fallback path below is retained for future data bumps that
 * add bloodlines before a hand entry exists.
 */

const SORCERER_BLOODLINE_NAME_ALIASES: Record<string, string> = {
  // Hand tag (the `bloodlineSpellLists` spelling the picker stores) → the
  // vendored prose catalog's name for the same bloodline.
  Kobold: "Kobold Sorcerer",
};

function normalizeBloodlineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedSorcererBloodlineEntry extends BloodlineDef {
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only bloodline with no hand-authored arcana/powers — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredBloodlineToDef(entry: SorcererBloodline): MergedSorcererBloodlineEntry {
  return {
    tag: entry.name,
    name: entry.name,
    arcana: { summary: "", changes: [] },
    powers: [],
    bonusFeatSlugs: [],
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked bloodline tag (`doc.build.sorcererBloodline`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveSorcererBloodline(
  tag: string,
  refData: RefData,
): MergedSorcererBloodlineEntry | undefined {
  const hand = BLOODLINES[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = Object.values(refData.sorcererBloodlines ?? {}).find(
    (v) => normalizeBloodlineName(v.name) === normalizeBloodlineName(tag),
  );
  return vendored ? vendoredBloodlineToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored bloodline, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedSorcererBloodlineCatalog(refData: RefData): MergedSorcererBloodlineEntry[] {
  const handByNormName = new Map<string, BloodlineDef>();
  for (const b of BLOODLINE_LIST) {
    handByNormName.set(normalizeBloodlineName(SORCERER_BLOODLINE_NAME_ALIASES[b.tag] ?? b.name), b);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedSorcererBloodlineEntry[] = [];
  for (const v of Object.values(refData.sorcererBloodlines ?? {})) {
    const handMatch = handByNormName.get(normalizeBloodlineName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredBloodlineToDef(v));
    }
  }
  for (const b of BLOODLINE_LIST) {
    if (!usedHandTags.has(b.tag)) merged.push({ ...b, displayOnly: false });
  }
  return merged;
}
