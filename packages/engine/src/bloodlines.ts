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
 * vendors 40 bloodline tags for spells. "Aberrant" is absent from the upstream
 * Foundry pack (no spell tags it), so its bonus-spell list is hand-authored as
 * a data-pipeline supplement (issue #38 — see `data-pipeline/src/supplements.ts`);
 * this table keys "Aberrant" for arcana/powers, which are independent of the
 * spell-list dataset.
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
        // creature that has a language (as per the tongues spell)." No
        // `immEffect.petrification` slug exists in the closed
        // EFFECT_IMMUNITY_LABELS vocabulary — that piece stays display-only.
        changes: [
          c("10", "eres.electricity", "untyped"),
          c("10", "eres.fire", "untyped"),
          c("1", "imm.acid", "untyped"),
          c("1", "imm.cold", "untyped"),
        ],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 vs. poison only — not a general save bonus." },
          {
            target: "allChecks",
            text: "Also grants petrification immunity (no matching slug on the sheet), unlimited flight, and tongues (display only).",
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
];

export const BLOODLINES: Record<string, BloodlineDef> = Object.fromEntries(
  BLOODLINE_LIST.map((b) => [b.tag, b]),
);

export const BLOODLINE_TAGS: readonly string[] = BLOODLINE_LIST.map((b) => b.tag);

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
 * `mergedRagePowerCatalog`. The hand-verified 10-Core-Rulebook-bloodline
 * table above stays authoritative for arcana/powers/bonus feats; this
 * section merges the two for browsing.
 *
 * Matching is by NORMALIZED NAME (this table's `tag` doubles as its display
 * `name`, e.g. `"Aberrant"`). Collision audit (all 10 hand-authored
 * bloodlines): all 10 matched a vendored entry by normalized name — no
 * aliasing needed. Distinct from `RefData.bloodlineSpellLists` (the
 * Foundry-vendored bonus-spell progressions `BloodlinePicker` already
 * lists) — this catalog only adds ARCANA/POWERS prose for the ~41
 * vendored-only bloodlines that table doesn't cover.
 */

const SORCERER_BLOODLINE_NAME_ALIASES: Record<string, string> = {};

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
