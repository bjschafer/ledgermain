/**
 * Clean-room PF1 bloodrager bloodline table (Advanced Class Guide, issue #65)
 * — the bloodrager-specific sibling of `bloodlines.ts` (sorcerer). Hand-
 * authored from published rules text (AoN/d20pfsrd — CLAUDE.md licensing:
 * Foundry source was never consulted) since bloodline powers/bonus-feat
 * lists/bonus-spell lists are prose-only in the vendored Foundry pack (only
 * the base "Bloodrage"/"Bloodrager Bloodline"/"Bloodline Feat (BLO)"/
 * "Bloodline Spells (BLO)" class features are vendored — see `class-
 * features.json`; the per-bloodline content itself is NOT).
 *
 * Scope: every published Paizo bloodrager bloodline on AoN's
 * `BloodragerBloodlineDisplay.aspx` — the 10 ACG ones (Aberrant, Abyssal,
 * Arcane, Celestial, Destined, Draconic, Elemental, Fey, Infernal, Undead)
 * plus the 14 later-splatbook ones (Aquatic, Black Blood, Hag, Kyton,
 * Martyred, Medusa, Naga, Phoenix, Salamander, Shadow, Shapechanger,
 * Sphinx, Verdant, Vestige), each verified against its own AoN page.
 *
 * Differences from a sorcerer bloodline (`BloodlineDef`), all RAW:
 *   - Bloodrager bloodline POWER gates are 1st/4th/8th/12th/16th/20th level
 *     (NOT sorcerer's 1st/3rd/9th/15th/20th) — verified against every
 *     fetched bloodline's own table.
 *   - No separate "bloodline arcana" ability — a bloodrager's 1st-level power
 *     IS its first bloodline power (no passive-arcana + powers split).
 *   - Bonus SPELLS KNOWN are a fixed 4-entry schedule at 7th/10th/13th/16th
 *     bloodrager level (one spell each), NOT the sorcerer's `2*spellLevel+1`
 *     cadence that produces up to 9 entries — structurally incompatible with
 *     `RefData.bloodlineSpellLists` (which assumes the sorcerer cadence), so
 *     `bonusSpells` here is a small hand-authored NAME-ONLY list (no vendored
 *     spell-id resolution attempted — same "acceptable degradation" posture
 *     the task brief green-lit for patron/mystery-style content still
 *     lacking a full vendored mapping) resolved by name against
 *     `refData.spells` at read time — see `model/spellcasting
 *     .bloodragerBonusSpellsKnown`.
 *
 * Modelling posture (mirrors `bloodlines.ts` exactly): `changes`/
 * `contextNotes` hold ONLY genuinely unconditional, always-on numeric
 * effects. A significant fraction of bloodrager bloodline powers explicitly
 * apply "while bloodraging" or "when entering a bloodrage" (conditional on
 * live buff-toggle state the static sheet doesn't inspect per-power) or are
 * X/day activated abilities with variable/rolled effects — those carry
 * `changes: []` plus a `contextNotes` reminder (or, where RAW gives an
 * explicit day-limit, a `resourcePool`), never an over-applied flat number.
 *
 * KNOWN AMBIGUITY (disclosed, not silently resolved): several fetched power
 * descriptions (e.g. Abyssal's Demon Resistances, Celestial's Celestial
 * Resistances, Infernal's Infernal Resistance) don't repeat a "while
 * bloodraging" qualifier the way clearly-combat-form powers do (Claws,
 * elemental strikes, wing-growing) — only each bloodline's 20th-level
 * capstone explicitly says "constantly, even while not bloodraging" for
 * contrast. This project follows the SAME bar `bloodlines.ts` already
 * applies to the sorcerer version of these exact named powers (Abyssal/
 * Celestial/Infernal "Resistances" are modeled as unconditional Changes
 * there too) for consistency, but acknowledges the primary sourcebook text
 * (not available to this session) is the only way to fully resolve whether
 * these are genuinely always-on for a BLOODRAGER specifically or, like most
 * of this class's powers, gated to the bloodrage state. If that turns out
 * to be wrong, the fix is narrowly scoped to this file's `changes` arrays.
 */

import type { BloodragerBloodline, Change, ContextNote, RefData, SourceRef } from "@pf1/schema";

import {
  type BloodlineResourcePool,
  DRAGON_TYPE_ENERGY,
  ELEMENT_ENERGY,
  energyImmunityVariantChanges,
  energyResistanceVariantChanges,
} from "./bloodlines.js";
import { featNameSlug } from "./feat-effects.js";

/** Bloodrager bloodline power level gates (ACG: always 1st/4th/8th/12th/16th/20th). */
export type BloodragerBloodlinePowerLevel = 1 | 4 | 8 | 12 | 16 | 20;

export interface BloodragerBloodlinePower {
  /** Stable slug, unique within the bloodline (e.g. "claws"). */
  id: string;
  level: BloodragerBloodlinePowerLevel;
  name: string;
  /** Short rules summary shown in the UI. */
  summary: string;
  /** Unconditional numeric modifiers (rare — see file doc comment). */
  changes?: Change[];
  /**
   * Per-variant Changes, keyed by `variantOptions` id — applied only when
   * `doc.build.bloodragerBloodlineVariant` matches a key (mirrors
   * `BloodlinePower.variantChanges`). No stored variant, or a stale id,
   * emits nothing.
   */
  variantChanges?: Readonly<Record<string, readonly Change[]>>;
  contextNotes?: ContextNote[];
  resourcePool?: BloodlineResourcePool;
}

/**
 * One bonus spell known, granted at a fixed bloodrager level (7th/10th/13th/
 * 16th — PF1 RAW's flat 4-entry schedule, distinct from a sorcerer
 * bloodline's `2*spellLevel+1` cadence). `name` only — resolved against
 * `refData.spells` by name at read time (see file doc comment).
 */
export interface BloodragerBonusSpell {
  grantedAtLevel: 7 | 10 | 13 | 16;
  name: string;
}

export interface BloodragerBloodlineVariantOption {
  id: string;
  label: string;
}

export interface BloodragerBloodlineDef {
  /** Matches `doc.build.bloodragerBloodline`. */
  tag: string;
  name: string;
  powers: BloodragerBloodlinePower[];
  /**
   * `featNameSlug`s of this bloodline's "Bonus Feats" list (ACG: a bloodrager
   * picks one of these — no prerequisites waived — at 6th level and every 3
   * levels thereafter; the vendored "Bloodline Feat (BLO)" class feature
   * already supplies the correct SLOT COUNT via its own `changes` — see
   * `class-features.json` — this table only supplies which feats are
   * eligible, matching `BLOODLINES.bonusFeatSlugs`' role for sorcerer).
   */
  bonusFeatSlugs: readonly string[];
  /** Bonus spells known — see {@link BloodragerBonusSpell}. Always exactly 4 entries (7th/10th/13th/16th). */
  bonusSpells: readonly BloodragerBonusSpell[];
  /** Prompt text shown by the picker when `variantOptions` is non-empty. */
  variantPrompt?: string;
  /** Energy type / dragon type choices, for bloodlines that need one. */
  variantOptions?: readonly BloodragerBloodlineVariantOption[];
}

const c = (formula: string, target: string, type: string, operator?: "add" | "set"): Change => ({
  formula,
  target,
  type,
  ...(operator ? { operator } : {}),
});

/** `featNameSlug` every name in a bloodline's "Bonus Feats" list. */
const feats = (...names: string[]): readonly string[] => names.map((n) => featNameSlug(n));

const bonusSpells = (
  l7: string,
  l10: string,
  l13: string,
  l16: string,
): readonly BloodragerBonusSpell[] => [
  { grantedAtLevel: 7, name: l7 },
  { grantedAtLevel: 10, name: l10 },
  { grantedAtLevel: 13, name: l13 },
  { grantedAtLevel: 16, name: l16 },
];

/** Ten Core Rulebook dragon types — same set `bloodlines.ts`' Draconic sorcerer bloodline offers. */
const DRAGON_TYPE_OPTIONS: readonly BloodragerBloodlineVariantOption[] = [
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
];

const ELEMENT_OPTIONS: readonly BloodragerBloodlineVariantOption[] = [
  { id: "air", label: "Air (electricity, fly 60 ft. at 8th)" },
  { id: "earth", label: "Earth (acid, burrow 30 ft. at 8th)" },
  { id: "fire", label: "Fire (fire, +30 ft. speed at 8th)" },
  { id: "water", label: "Water (cold, swim 60 ft. at 8th)" },
];

const BLOODRAGER_BLOODLINE_LIST: BloodragerBloodlineDef[] = [
  // ---- Aberrant ------------------------------------------------------------
  // Every power below 20th sits under this bloodline's own umbrella sentence
  // ("While bloodraging, you gain the abilities and immunities of some
  // aberrations"), so none of them carry unconditional `changes` — unlike the
  // Abyssal/Celestial/Infernal "Resistances" powers, whose text has no such
  // gate (see the KNOWN AMBIGUITY note above). Only the capstone, which says
  // "constantly, even while not bloodraging" in as many words, is modeled.
  {
    tag: "Aberrant",
    name: "Aberrant",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Great Fortitude",
      "Improved Disarm",
      "Improved Grapple",
      "Improved Initiative",
      "Improved Unarmed Strike",
      "Iron Will",
    ),
    bonusSpells: bonusSpells(
      "Enlarge Person",
      "See Invisibility",
      "Displacement",
      "Black Tentacles",
    ),
    powers: [
      {
        id: "staggeringStrike",
        level: 1,
        name: "Staggering Strike",
        summary:
          "On a confirmed critical hit, the target is staggered 1 round unless it succeeds at a Fortitude save (DC 10 + 1/2 bloodrager level + Con mod). Stacks with Staggering Critical — save against each separately.",
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging — crit-confirmation rider." },
        ],
      },
      {
        id: "abnormalReach",
        level: 4,
        name: "Abnormal Reach",
        summary: "Your limbs elongate; your reach increases by 5 feet.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging, so the +5 ft. isn't added to your standing reach.",
          },
        ],
      },
      {
        id: "aberrantFortitude",
        level: 8,
        name: "Aberrant Fortitude",
        summary: "Immune to the sickened and nauseated conditions.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; immunities aren't tracked on the sheet — display only.",
          },
        ],
      },
      {
        id: "unusualAnatomy",
        level: 12,
        name: "Unusual Anatomy",
        summary:
          "Your organs shift, giving a 50% chance to negate any critical hit or sneak attack against you (damage is rolled normally instead).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging — roll the 50% miss chance manually.",
          },
        ],
      },
      {
        id: "aberrantResistance",
        level: 16,
        name: "Aberrant Resistance",
        summary: "Immune to disease, exhaustion, fatigue, poison, and the staggered condition.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; immunities aren't tracked on the sheet — display only.",
          },
        ],
      },
      {
        id: "aberrantForm",
        level: 20,
        name: "Aberrant Form",
        summary:
          "Immune to critical hits and sneak attacks, blindsight 60 ft., and your bloodrager damage reduction increases by 1 — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Aberrant):
        // "At 20th level, your body becomes truly unnatural. You are immune
        // to critical hits and sneak attacks. In addition, you gain
        // blindsight with a range of 60 feet and your bloodrager damage
        // reduction increases by 1. You have these benefits constantly, even
        // while not bloodraging." Sneak attack is precision damage
        // (immEffect.precisionDamage); "critical hits" is
        // immEffect.criticalHits verbatim — same pair the sorcerer sibling
        // and the Elemental capstones use. The "+1" is a delta on the base
        // bloodrager class's own Damage Reduction progression (level 7/10/
        // 13/16/19, vendored with an empty `changes[]` and not otherwise
        // hand-authored in this engine — see `defenses.ts`), so this flat
        // `dr` grant understates the true total for a 20th-level Aberrant
        // bloodrager; fixing that needs the base progression modeled first.
        changes: [
          c("60", "sensebs", "untyped"),
          c("1", "dr", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
        ],
      },
    ],
  },
  // ---- Abyssal -----------------------------------------------------------
  {
    tag: "Abyssal",
    name: "Abyssal",
    bonusFeatSlugs: feats(
      "Cleave",
      "Great Fortitude",
      "Improved Bull Rush",
      "Improved Sunder",
      "Intimidating Prowess",
      "Power Attack",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Ray of Enfeeblement", "Bull's Strength", "Rage", "Stoneskin"),
    powers: [
      {
        id: "claws",
        level: 1,
        name: "Claws",
        summary:
          "While bloodraging, grow claws (two claw attacks, full BAB, 1d6+Str each, 1d4 if Small); magic at 5th, 1d8 at 8th, +1d6 fire (flaming) at 12th.",
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging — not a standing attack option." },
        ],
      },
      {
        id: "demonicBulk",
        level: 4,
        name: "Demonic Bulk",
        summary:
          "When entering a bloodrage, choose to grow one size category larger (as enlarge person).",
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "demonResistances",
        level: 8,
        name: "Demon Resistances",
        summary: "Resist acid, cold, and fire 5 (10 at 16th).",
        changes: [
          c("if(gte(@classes.bloodrager.level, 16), 10, 5)", "eres.acid", "untyped"),
          c("if(gte(@classes.bloodrager.level, 16), 10, 5)", "eres.cold", "untyped"),
          c("if(gte(@classes.bloodrager.level, 16), 10, 5)", "eres.fire", "untyped"),
        ],
      },
      {
        id: "demonicAura",
        level: 16,
        name: "Demonic Aura",
        summary:
          "While bloodraging, exude a 5-ft. burst fire aura dealing 2d6 + Con mod fire damage to creatures ending their turn in it.",
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging — roll damage manually." },
        ],
      },
      {
        id: "demonicImmunities",
        level: 20,
        name: "Demonic Immunities",
        summary: "Immune to electricity and poison, constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Abyssal):
        // "At 20th level, you're immune to electricity and poison. You have
        // this benefit constantly, even while not bloodraging."
        changes: [c("1", "imm.electricity", "untyped"), c("1", "immEffect.poison", "untyped")],
      },
    ],
  },
  // ---- Arcane --------------------------------------------------------------
  {
    tag: "Arcane",
    name: "Arcane",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Disruptive",
      "Improved Initiative",
      "Iron Will",
      "Power Attack",
      "Quick Draw",
      "Spellbreaker",
    ),
    bonusSpells: bonusSpells("Magic Missile", "Invisibility", "Lightning Bolt", "Dimension Door"),
    powers: [
      {
        id: "disruptiveBloodrage",
        level: 1,
        name: "Disruptive Bloodrage",
        summary:
          "While bloodraging, the DC to cast defensively increases by 2 for enemies within your threatened area.",
        contextNotes: [
          { target: "allChecks", text: "Affects enemies' casting DC, not your own stats." },
        ],
      },
      {
        id: "arcaneBloodrage",
        level: 4,
        name: "Arcane Bloodrage",
        summary:
          "When entering a bloodrage, choose blur, protection from arrows, resist energy, or spider climb on yourself for the bloodrage's duration.",
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "greaterArcaneBloodrage",
        level: 8,
        name: "Greater Arcane Bloodrage",
        summary: "When entering a bloodrage, also choose displacement or haste on yourself.",
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "castersScourge",
        level: 12,
        name: "Caster's Scourge",
        summary:
          "Gain extra attacks of opportunity (equal to Dex mod, min 1) usable only against spellcasters casting/casting defensively in your threatened area.",
        contextNotes: [
          { target: "allChecks", text: "Narrow AoO trigger — not modeled numerically." },
        ],
      },
      {
        id: "trueArcaneBloodrage",
        level: 16,
        name: "True Arcane Bloodrage",
        summary:
          "When entering a bloodrage, choose beast shape IV (self size or larger), form of the dragon I, or transformation.",
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "castersBane",
        level: 20,
        name: "Caster's Bane",
        summary:
          "Spellcasters with a caster level lower than your bloodrager level always provoke AoOs in your threatened area, even casting defensively.",
        contextNotes: [
          { target: "allChecks", text: "Situational trigger — not modeled numerically." },
        ],
      },
    ],
  },
  // ---- Celestial -------------------------------------------------------------
  {
    tag: "Celestial",
    name: "Celestial",
    bonusFeatSlugs: feats(
      "Dodge",
      "Improved Initiative",
      "Iron Will",
      "Mobility",
      "Mounted Combat",
      "Ride-By Attack",
      "Weapon Focus",
    ),
    bonusSpells: bonusSpells("Bless", "Resist Energy", "Heroism", "Holy Smite"),
    powers: [
      {
        id: "angelicAttacks",
        level: 1,
        name: "Angelic Attacks",
        summary: "Melee attacks count as good-aligned for DR; +1d6 damage against evil outsiders.",
        contextNotes: [
          { target: "allChecks", text: "+1d6 vs. evil outsiders only — roll manually." },
        ],
      },
      {
        id: "celestialResistances",
        level: 4,
        name: "Celestial Resistances",
        summary: "Resist acid and cold 5 (10 at 12th).",
        changes: [
          c("if(gte(@classes.bloodrager.level, 12), 10, 5)", "eres.acid", "untyped"),
          c("if(gte(@classes.bloodrager.level, 12), 10, 5)", "eres.cold", "untyped"),
        ],
      },
      {
        id: "conviction",
        level: 8,
        name: "Conviction",
        summary:
          "Once per bloodrage, reroll an ability check, skill check, or save just made (must take the second result).",
        contextNotes: [
          { target: "allChecks", text: "Once per bloodrage, not a per-day pool — manual reroll." },
        ],
      },
      {
        id: "wingsOfHeaven",
        level: 12,
        name: "Wings of Heaven",
        summary: "Grow feathery wings, fly speed 60 ft. good (80 ft. at 20th).",
        contextNotes: [
          { target: "allChecks", text: "Choice power — situational, not auto-applied." },
        ],
      },
      {
        id: "angelicProtection",
        level: 16,
        name: "Angelic Protection",
        summary:
          "+4 deflection to AC; +4 resistance on saves vs. evil creatures' attacks/effects; as protection from evil (undispellable).",
        changes: [c("4", "ac", "deflection")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+4 resistance vs. evil creatures only — not a general save bonus.",
          },
        ],
      },
      {
        id: "ascension",
        level: 20,
        name: "Ascension",
        summary:
          "Immune to acid, cold, and petrification; resist electricity and fire 10; +4 vs. poison — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Celestial):
        // "At 20th level, you become infused with the power of the heavens.
        // You gain immunity to acid, cold, and petrification. You also gain
        // resistance 10 to electricity and fire, as well as a +4 racial
        // bonus on saving throws against poison. You have these benefits
        // constantly, even while not bloodraging."
        changes: [
          c("10", "eres.electricity", "untyped"),
          c("10", "eres.fire", "untyped"),
          c("1", "imm.acid", "untyped"),
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.petrification", "untyped"),
        ],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 vs. poison only — not a general save bonus." },
        ],
      },
    ],
  },
  // ---- Destined --------------------------------------------------------------
  {
    tag: "Destined",
    name: "Destined",
    bonusFeatSlugs: feats(
      "Diehard",
      "Endurance",
      "Improved Initiative",
      "Intimidating Prowess",
      "Leadership",
      "Lightning Reflexes",
      "Weapon Focus",
    ),
    bonusSpells: bonusSpells("Shield", "Blur", "Protection from Energy", "Freedom of Movement"),
    powers: [
      {
        id: "destinedStrike",
        level: 1,
        name: "Destined Strike",
        summary:
          "Free action, up to 3/day: grant yourself an insight bonus (1/2 bloodrager level, min +1) on one melee attack.",
        resourcePool: { usesFormula: "3", per: "day", detail: "Insight bonus on one melee attack" },
      },
      {
        id: "fatedBloodrager",
        level: 4,
        name: "Fated Bloodrager",
        summary: "+1 luck bonus to AC and saves; +1 every 4 levels thereafter (max +5 at 20th).",
        changes: [
          c("1 + floor((@classes.bloodrager.level - 4) / 4)", "ac", "luck"),
          c("1 + floor((@classes.bloodrager.level - 4) / 4)", "allSavingThrows", "luck"),
        ],
      },
      {
        id: "certainStrike",
        level: 8,
        name: "Certain Strike",
        summary: "Once during a bloodrage, reroll an attack roll (must take the second result).",
        contextNotes: [{ target: "allChecks", text: "Once per bloodrage, not a per-day pool." }],
      },
      {
        id: "defyDeath",
        level: 12,
        name: "Defy Death",
        summary:
          "Once per day, when a killing attack/spell would drop you, DC 20 Fortitude save to drop to 1 hp instead.",
        resourcePool: {
          usesFormula: "1",
          per: "day",
          detail: "DC 20 Fort to survive a killing blow",
        },
      },
      {
        id: "unstoppable",
        level: 16,
        name: "Unstoppable",
        summary:
          "Your critical threats auto-confirm; crits against you confirm only on a natural 20.",
        contextNotes: [
          { target: "allChecks", text: "Crit-confirmation rule — not a numeric bonus." },
        ],
      },
      {
        id: "victoryOrDeath",
        level: 20,
        name: "Victory or Death",
        summary:
          "Immune to paralysis, petrification, stunned, dazed, and staggered — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Destined):
        // "You are immune to paralysis and petrification, as well as to the
        // stunned, dazed, and staggered conditions. You have these benefits
        // constantly, even while not bloodraging."
        changes: [
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.petrification", "untyped"),
          c("1", "immEffect.stunned", "untyped"),
          c("1", "immEffect.dazed", "untyped"),
          c("1", "immEffect.staggered", "untyped"),
        ],
      },
    ],
  },
  // ---- Draconic --------------------------------------------------------------
  {
    tag: "Draconic",
    name: "Draconic",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Cleave",
      "Great Fortitude",
      "Improved Initiative",
      "Power Attack",
      "Skill Focus",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Shield", "Resist Energy", "Fly", "Fear"),
    variantPrompt: "Dragon type (sets your energy type)",
    variantOptions: DRAGON_TYPE_OPTIONS,
    powers: [
      {
        id: "claws",
        level: 1,
        name: "Claws",
        summary:
          "While bloodraging, grow claws (two claw attacks, full BAB, 1d6+Str, 1d4 if Small); magic at 4th, 1d8 at 8th, +1d6 of your energy type at 12th.",
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging — not a standing attack option." },
        ],
      },
      {
        id: "draconicResistance",
        level: 4,
        name: "Draconic Resistance",
        summary:
          "Resist 5 to your energy type and a +1 natural armor bonus (resist 10 and +2 at 8th; +4 natural armor at 16th, resistance unchanged).",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Draconic):
        // "At 4th level, you gain resistance 5 against your energy type and a
        // +1 natural armor bonus to AC. At 8th level, your energy resistance
        // increases to 10 and your natural armor bonus increases to +2. At
        // 16th level, your natural armor bonus increases to +4." (Resistance
        // stays 10 — unlike the sorcerer power, there is no 20 step.)
        changes: [
          c(
            "if(gte(@classes.bloodrager.level, 16), 4, if(gte(@classes.bloodrager.level, 8), 2, 1))",
            "nac",
            "natural",
          ),
        ],
        variantChanges: energyResistanceVariantChanges(
          DRAGON_TYPE_ENERGY,
          "if(gte(@classes.bloodrager.level, 8), 10, 5)",
        ),
      },
      {
        id: "breathWeapon",
        level: 8,
        name: "Breath Weapon",
        summary:
          "Once per day, breathe your energy type for 1d6 damage per bloodrager level (Reflex half); line or cone per dragon type.",
        resourcePool: { usesFormula: "1", per: "day", detail: "1d6/lvl breath weapon" },
      },
      {
        id: "dragonWings",
        level: 12,
        name: "Dragon Wings",
        summary:
          "When entering a bloodrage, grow leathery wings for a fly speed of 60 ft. (average maneuverability).",
        contextNotes: [{ target: "allChecks", text: "Choice power on entering a bloodrage." }],
      },
      {
        id: "dragonForm",
        level: 16,
        name: "Dragon Form",
        summary:
          "When entering a bloodrage, take the form of your dragon type (as form of the dragon II).",
        contextNotes: [{ target: "allChecks", text: "Choice power on entering a bloodrage." }],
      },
      {
        id: "powerOfWyrms",
        level: 20,
        name: "Power of Wyrms",
        summary: "Immune to paralysis, sleep, and your energy type; blindsense 60 ft.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Draconic):
        // "At 20th level, you gain immunity to paralysis, sleep, and damage
        // from your energy type. You also gain blindsense with a range of 60
        // feet. You have these benefits constantly, even while not
        // bloodraging."
        changes: [
          c("60", "sensebse", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        variantChanges: energyImmunityVariantChanges(DRAGON_TYPE_ENERGY),
      },
    ],
  },
  // ---- Elemental -------------------------------------------------------------
  {
    tag: "Elemental",
    name: "Elemental",
    bonusFeatSlugs: feats(
      "Cleave",
      "Dodge",
      "Great Fortitude",
      "Improved Initiative",
      "Lightning Reflexes",
      "Power Attack",
      "Weapon Focus",
    ),
    bonusSpells: bonusSpells(
      "Burning Hands",
      "Scorching Ray",
      "Protection from Energy",
      "Elemental Body I",
    ),
    variantPrompt: "Element (sets your energy type and 8th-level movement mode)",
    variantOptions: ELEMENT_OPTIONS,
    powers: [
      {
        id: "elementalStrikes",
        level: 1,
        name: "Elemental Strikes",
        summary:
          "Swift action, 3/day: for 1 round, melee attacks deal +1d6 damage of your energy type.",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail: "+1d6 energy on melee attacks, 1 round",
        },
      },
      {
        id: "elementalResistance",
        level: 4,
        name: "Elemental Resistance",
        summary: "Energy resistance 10 against your chosen energy type.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Elemental):
        // "At 4th level, you gain energy resistance 10 against your energy
        // type." Flat — no scaling step, unlike the sorcerer power's 20 at
        // 9th.
        variantChanges: energyResistanceVariantChanges(ELEMENT_ENERGY, "10"),
      },
      {
        id: "elementalMovement",
        level: 8,
        name: "Elemental Movement",
        summary:
          "Gain a movement mode keyed to your element: Air flies 60 ft., Earth burrows 30 ft., Fire adds 30 ft. speed, Water swims 60 ft.",
        // Same speed-grant conventions as the sorcerer power (see
        // bloodlines.ts's elementalMovement): whole-speed grants "set", fire's
        // "+30 ft." additive. Like the resistances above, the text carries no
        // "while bloodraging" qualifier — the file's KNOWN AMBIGUITY posture
        // models it as constant, matching the sorcerer sibling.
        variantChanges: {
          air: [c("60", "flySpeed", "base", "set")],
          earth: [c("30", "burrowSpeed", "base", "set")],
          fire: [c("30", "landSpeed", "untyped")],
          water: [c("60", "swimSpeed", "base", "set")],
        },
      },
      {
        id: "powerOfTheElements",
        level: 12,
        name: "Power of the Elements",
        summary:
          "Elemental Strikes' damage bypasses resistance to that energy type (half vs. immunity).",
        contextNotes: [{ target: "allChecks", text: "Modifies Elemental Strikes only." }],
      },
      {
        id: "elementalForm",
        level: 16,
        name: "Elemental Form",
        summary:
          "Once per day, when entering a bloodrage, take elemental form (as elemental body IV).",
        resourcePool: { usesFormula: "1", per: "day", detail: "Elemental body IV" },
      },
      {
        id: "elementalBody",
        level: 20,
        name: "Elemental Body",
        summary: "Immune to sneak attacks, critical hits, and damage of your energy type.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Elemental):
        // "elemental power surges through your body. You gain immunity to
        // sneak attacks, critical hits, and damage from your energy type. You
        // have this benefit constantly, even while not bloodraging." Sneak
        // attack is precision damage (immEffect.precisionDamage); "critical
        // hits" is immEffect.criticalHits verbatim.
        changes: [
          c("1", "immEffect.precisionDamage", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
        ],
        variantChanges: energyImmunityVariantChanges(ELEMENT_ENERGY),
      },
    ],
  },
  // ---- Fey -------------------------------------------------------------------
  {
    tag: "Fey",
    name: "Fey",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Dodge",
      "Improved Initiative",
      "Intimidating Prowess",
      "Lightning Reflexes",
      "Mobility",
      "Step Up",
    ),
    bonusSpells: bonusSpells("Entangle", "Hideous Laughter", "Haste", "Confusion"),
    powers: [
      {
        id: "confusingCritical",
        level: 1,
        name: "Confusing Critical",
        summary:
          "On a confirmed critical hit, target makes a Will save (DC 10 + 1/2 level + Con mod) or is confused 1 round.",
        contextNotes: [{ target: "allChecks", text: "Only on a confirmed crit — situational." }],
      },
      {
        id: "leapingCharger",
        level: 4,
        name: "Leaping Charger",
        summary: "Charges ignore difficult terrain (move through it at normal speed).",
        contextNotes: [
          { target: "allChecks", text: "Charge-only — not modeled as a speed Change." },
        ],
      },
      {
        id: "blurringMovement",
        level: 8,
        name: "Blurring Movement",
        summary: "Moving at least 10 ft. grants the effects of blur for 1 round.",
        contextNotes: [{ target: "allChecks", text: "Triggered by movement — situational." }],
      },
      {
        id: "quicklingBloodrage",
        level: 12,
        name: "Quickling Bloodrage",
        summary: "While bloodraging, treated as under the effects of haste.",
        contextNotes: [{ target: "allChecks", text: "Only while bloodraging." }],
      },
      {
        id: "oneWithNature",
        level: 16,
        name: "One with Nature",
        summary:
          "Animals/plants won't attack you unfairly; 3/day, transport tree to tree (as tree stride, half range).",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail: "Tree-to-tree transport (half tree stride range)",
        },
      },
      {
        id: "furyOfTheFey",
        level: 20,
        name: "Fury of the Fey",
        summary: "Melee attacks are treated as having bane against one chosen creature type.",
        contextNotes: [{ target: "allChecks", text: "Choice power — not a general damage bonus." }],
      },
    ],
  },
  // ---- Infernal --------------------------------------------------------------
  {
    tag: "Infernal",
    name: "Infernal",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Combat Reflexes",
      "Deceitful",
      "Improved Disarm",
      "Improved Sunder",
      "Intimidating Prowess",
      "Iron Will",
    ),
    bonusSpells: bonusSpells("Protection from Good", "Scorching Ray", "Suggestion", "Fire Shield"),
    powers: [
      {
        id: "hellfireStrike",
        level: 1,
        name: "Hellfire Strike",
        summary:
          "Swift action, 3/day (5/day at 12th): melee attacks gain flaming for 1 round (flaming burst at 12th).",
        resourcePool: {
          usesFormula: "if(gte(@classes.bloodrager.level, 12), 5, 3)",
          per: "day",
          detail: "Flaming (flaming burst at 12th) melee, 1 round",
        },
      },
      {
        id: "infernalResistance",
        level: 4,
        name: "Infernal Resistance",
        summary: "Resist fire 5 (10 at 8th); +2 vs. poison (+4 at 8th).",
        changes: [c("if(gte(@classes.bloodrager.level, 8), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 8th) vs. poison only — not a general save bonus.",
          },
        ],
      },
      {
        id: "diabolicalArrogance",
        level: 8,
        name: "Diabolical Arrogance",
        summary: "+4 on saves against enchantment and fear effects.",
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+4 vs. enchantment/fear only — not a general save bonus.",
          },
        ],
      },
      {
        id: "darkWings",
        level: 12,
        name: "Dark Wings",
        summary:
          "When entering a bloodrage, grow batlike wings for a fly speed of 60 ft. (80 ft. good at 16th).",
        contextNotes: [{ target: "allChecks", text: "Choice power on entering a bloodrage." }],
      },
      {
        id: "hellfireCharge",
        level: 16,
        name: "Hellfire Charge",
        summary:
          "A charge's final attack gains Hellfire Strike free; if already active, ignores fire resistance ≤10.",
        contextNotes: [{ target: "allChecks", text: "Modifies Hellfire Strike on a charge." }],
      },
      {
        id: "fiendOfThePit",
        level: 20,
        name: "Fiend of the Pit",
        summary:
          "Immune to fire and poison; resist acid and cold 10; see in darkness — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Infernal):
        // "At 20th level, you gain immunity to fire and poison. You also gain
        // resistance 10 to acid and cold, and gain the see in darkness
        // ability. You have these benefits constantly, even while not
        // bloodraging." Unlike the sorcerer Infernal capstone, no range is
        // stated for the darkness sight — a plain, rangeless `sensesid` flag
        // (senses.ts's "see in darkness" target) fits without overstating a
        // cap that isn't in the text.
        changes: [
          c("10", "eres.acid", "untyped"),
          c("10", "eres.cold", "untyped"),
          c("1", "imm.fire", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("1", "sensesid", "untyped", "set"),
        ],
      },
    ],
  },
  // ---- Undead ----------------------------------------------------------------
  {
    tag: "Undead",
    name: "Undead",
    bonusFeatSlugs: feats(
      "Diehard",
      "Dodge",
      "Endurance",
      "Intimidating Prowess",
      "Iron Will",
      "Mobility",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Chill Touch", "False Life", "Vampiric Touch", "Enervation"),
    powers: [
      {
        id: "frightfulCharger",
        level: 1,
        name: "Frightful Charger",
        summary:
          "A successful charge attack shakens the target for 1/2 bloodrager level rounds (min 1).",
        contextNotes: [{ target: "allChecks", text: "Charge-only — situational." }],
      },
      {
        id: "ghostStrike",
        level: 4,
        name: "Ghost Strike",
        summary: "Melee attacks treated as having the ghost touch weapon special ability.",
        contextNotes: [
          { target: "allChecks", text: "Affects incorporeal targeting, not damage numbers." },
        ],
      },
      {
        id: "deathsGift",
        level: 8,
        name: "Death's Gift",
        summary: "Resist cold 10; DR 10/— against nonlethal damage.",
        changes: [c("10", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "The DR 10/— applies only to nonlethal damage — not folded into your general DR total.",
          },
        ],
      },
      {
        id: "frightfulStrikes",
        level: 12,
        name: "Frightful Strikes",
        summary:
          "Swift action, once per bloodrage: melee attacks shaken targets for 1 round (frightened if already shaken).",
        contextNotes: [{ target: "allChecks", text: "Once per bloodrage, not a per-day pool." }],
      },
      {
        id: "incorporealBloodrager",
        level: 16,
        name: "Incorporeal Bloodrager",
        summary:
          "Once per day, become incorporeal (half damage from magic, none from mundane sources).",
        resourcePool: { usesFormula: "1", per: "day", detail: "Become incorporeal" },
      },
      {
        id: "oneFootInTheGrave",
        level: 20,
        name: "One Foot in the Grave",
        summary:
          "Immune to cold, nonlethal damage, paralysis, and sleep — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Undead):
        // "At 20th level, you gain immunity to cold, nonlethal damage,
        // paralysis, and sleep. The DR from your damage reduction ability
        // increases to 8. Unintelligent undead don't notice you unless you
        // attack them." ("Damage reduction ability" is the base bloodrager
        // class's own DR progression, not modeled anywhere in this engine
        // today — see coverage notes; "increases to 8" is this bloodline's
        // final number regardless, so a flat `dr` grant is exact for a 20th-
        // level Undead bloodrager specifically, same posture as the sorcerer
        // sibling's flat DR 5. Nonlethal damage isn't a damage TYPE — no
        // `imm.<x>` target can hold it, same gap `rage-powers.ts`'s Undead
        // Blood note documents.)
        changes: [
          c("8", "dr", "untyped"),
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to nonlethal damage — no damage-type target holds that, so it stays manual.",
          },
        ],
      },
    ],
  },
  // ---- Martyred (Paizo splatbook, not ACG core) ------------------------------
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
      "Toughness",
    ),
    bonusSpells: bonusSpells(
      "Endure Elements",
      "Surmount Affliction",
      "Heroism",
      "Blessing of Fervor",
    ),
    variantPrompt:
      "Ancestral damage type (good if you're good, evil if you're evil; neutral picks one and can't change it)",
    variantOptions: [
      { id: "good", label: "Good-aligned" },
      { id: "evil", label: "Evil-aligned" },
    ],
    powers: [
      {
        id: "ancestralStrikes",
        level: 1,
        name: "Ancestral Strikes",
        summary:
          "Swift action, 3/day (5/day at 8th): for 1 round, melee attacks deal +1d6 aligned damage — good if you're good, evil if you're evil, or your chosen type (above) if neutral. At 20th this becomes constant — no activation needed.",
        resourcePool: {
          usesFormula: "if(gte(@classes.bloodrager.level, 8), 5, 3)",
          per: "day",
          detail: "+1d6 aligned damage on melee, 1 round",
        },
      },
      {
        id: "martyrsResistances",
        level: 4,
        name: "Martyr's Resistances",
        summary: "Resist fire 5 (10 at 8th); +2 on saves vs. fear and pain effects (+4 at 8th).",
        changes: [c("if(gte(@classes.bloodrager.level, 8), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 8th) vs. fear and pain only — not a general save bonus.",
          },
        ],
      },
      {
        id: "forebearsReserves",
        level: 8,
        name: "Forebear's Reserves",
        summary:
          "Once per bloodrage, reroll a saving throw (decide after the roll, before the result is revealed).",
        contextNotes: [{ target: "allChecks", text: "Once per bloodrage, not a per-day pool." }],
      },
      {
        id: "ancestralChampion",
        level: 12,
        name: "Ancestral Champion",
        summary:
          "Ancestral Strikes deal +2d6 (instead of +1d6) against creatures of opposed alignment.",
        contextNotes: [{ target: "allChecks", text: "Modifies Ancestral Strikes only." }],
      },
      {
        id: "sacrificialExchange",
        level: 16,
        name: "Sacrificial Exchange",
        summary:
          "Swift action, once per day while bloodraging: take a –2 AC penalty (–4 at 20th) to grant one ally within 30 ft. a +4 morale bonus (+6 at 20th) to one ability score for the bloodrage's duration.",
        resourcePool: {
          usesFormula: "1",
          per: "day",
          detail: "–2 AC (–4 at 20th) → an ally's +4/+6 ability boost",
        },
      },
      {
        id: "eternalMartyr",
        level: 20,
        name: "Eternal Martyr",
        summary:
          "Immune to death effects; can't be raised as undead (constant hallow); resurrection material components cost half — constantly, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Martyred):
        // "At 20th level, your ancestor's act of martyrdom infuses your
        // spirit. You become immune to death effects. Material components for
        // spells and effects to bring you back to life (such as raise dead or
        // resurrection) cost half as much as normal. Your body cannot be
        // turned into an undead creature, as though you were affected by a
        // permanent hallow effect (caster level = your bloodrager level). You
        // have these benefits constantly, even while not bloodraging."
        // "Cannot be turned into an undead creature" is exactly
        // immEffect.undeath's "becoming undead" wording. The half-cost
        // resurrection component is an economy detail, not an immunity —
        // display-only.
        changes: [
          c("1", "immEffect.undeath", "untyped"),
          c("1", "immEffect.deathEffects", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also halves the material-component cost of spells that bring you back to life — display only.",
          },
        ],
      },
    ],
  },
  /* ------------------------------------------------ splatbook bloodlines --
   * The remaining later-splatbook Paizo bloodrager bloodlines, hand-authored
   * clean-room from aonprd.com under the same posture (and the same
   * "while bloodraging" ambiguity bar) as the entries above. Alphabetical. */
  // ---- Aquatic ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Aquatic)
  {
    tag: "Aquatic",
    name: "Aquatic",
    bonusFeatSlugs: feats(
      "Aquadynamic Focus",
      "Dodge",
      "Lightning Reflexes",
      "Mobility",
      "Skill Focus",
      "Steam Spell",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Hydraulic Push", "Slipstream", "Hydraulic Torrent", "Control Water"),
    powers: [
      {
        id: "underwaterAttacks",
        level: 1,
        name: "Underwater Attacks",
        summary:
          "Bludgeoning and slashing melee attacks made while underwater ignore the usual underwater penalties.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Underwater only. The sheet does not track combat environment, so this stays manual.",
          },
        ],
      },
      {
        id: "aquaticAdaptation",
        level: 4,
        name: "Aquatic Adaptation",
        summary:
          "Swim speed 30 ft. and the ability to breathe underwater and in air while bloodraging, becoming constant at 12th; cold resistance 5 while bloodraging at 8th; swim speed 60 ft. while bloodraging at 12th.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Aquatic):
        // "At 4th level, you gain a swim speed of 30 feet and the ability to
        // breathe both underwater and in air. At 8th level, you gain cold
        // resistance 5. At 12th level, your swim speed increases to 60 feet,
        // and you have the 4th-level benefits of aquatic adaptation
        // constantly, even when not in bloodrage (but not the 8th- and
        // 12th-level benefits)." The 12th-level clause is an explicit,
        // unusually direct resolution of this file's usual "while
        // bloodraging" ambiguity: everything below 12th is conditional, and
        // even at 12th+ only the base 30 ft./breathing grant turns constant,
        // never the 8th/12th increments. Modeled literally: swim speed 0
        // below 12th (a no-op), 30 ft. constant at 12th+; breathing has no
        // Change target so stays display-only; cold resistance and the 60
        // ft. bump stay bloodrage-only forever per RAW's own parenthetical.
        changes: [c("if(gte(@classes.bloodrager.level, 12), 30, 0)", "swimSpeed", "base", "set")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Below 12th level the swim speed and amphibious breathing apply only while bloodraging. The 8th level cold resistance 5 and 12th level bump to 60 ft. swim speed stay bloodrage only forever, per RAW.",
          },
        ],
      },
      {
        id: "watersense",
        level: 8,
        name: "Watersense",
        summary: "Tremorsense 30 ft. in water (60 ft. at 12th).",
        // RAW scopes the sense to "in water" — granting a standing
        // tremorsense row would overstate it on land, so it stays a note
        // (same bar as Stormborn's weather-scoped senses in bloodlines.ts).
        contextNotes: [
          { target: "allChecks", text: "Tremorsense 30 ft. (60 ft. at 12th) only while in water." },
        ],
      },
      {
        id: "wavedarter",
        level: 12,
        name: "Wavedarter",
        summary:
          "While underwater during a bloodrage, your reach increases by 5 ft. and you gain the effects of haste.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging and underwater, so it stays manual.",
          },
        ],
      },
      {
        id: "currentcaller",
        level: 16,
        name: "Currentcaller",
        summary:
          "Swift action, up to three times per day when underwater: create a current with a speed of 20 ft. in a chosen direction, lasting until the end of your turn.",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail: "Current, 20 ft. in your space, until end of turn",
        },
      },
      {
        id: "deepFury",
        level: 20,
        name: "Deep Fury",
        summary:
          "Tremorsense 120 ft. in water, evasion, and immunity to cold and pressure damage, constantly, even when not in bloodrage.",
        // RAW: "At 20th level, you gain tremorsense 120 feet in water, as
        // well as evasion and immunity to cold and pressure damage. You have
        // these benefits constantly, even when not in bloodrage." Evasion
        // has no generic Change target in this engine; "pressure damage"
        // isn't a modeled damage type; the tremorsense is scoped to water
        // (a standing sense row would overstate it on land). All three stay
        // display-only; only the cold immunity is unconditional.
        changes: [c("1", "imm.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Tremorsense 120 ft. only while in water. Evasion and pressure-damage immunity have no matching slot, so they stay manual.",
          },
        ],
      },
    ],
  },
  // ---- Black Blood ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Black%20Blood)
  {
    tag: "Black Blood",
    name: "Black Blood",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Diehard",
      "Endurance",
      "Great Fortitude",
      "Improved Initiative",
      "Iron Will",
      "Toughness",
    ),
    bonusSpells: bonusSpells(
      "Chill Touch",
      "Unshakable Chill",
      "Elemental Aura",
      "Black Tentacles",
    ),
    powers: [
      {
        id: "blackBlood",
        level: 1,
        name: "Black Blood",
        summary:
          "Immune to black blood's beneficial and harmful effects, constantly, even while not bloodraging. While bloodraging, when damaged by a slashing or piercing attack, immediate action up to three times per day: your melee attacks gain the frost weapon property for 2 rounds.",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail:
            "Frost weapon property on melee attacks for 2 rounds, immediate action when hit by slashing or piercing damage while bloodraging",
        },
        // "Black blood" is a setting-specific substance (Land of Black
        // Blood), not one of the closed immEffect vocabulary's conditions,
        // so the constant immunity has no matching Change target.
        contextNotes: [
          {
            target: "allChecks",
            text: "Immune to black blood's effects specifically. No matching immunity slug exists, so it stays manual.",
          },
        ],
      },
      {
        id: "abnormalReach",
        level: 4,
        name: "Abnormal Reach",
        summary: "Your reach increases by 5 ft.",
        // RAW states no bloodraging qualifier at all ("the black blood
        // pumping within you twists and elongates your limbs. Your reach
        // increases by 5 feet."), unlike the identically-named Aberrant
        // power elsewhere in this file, whose bloodline carries an explicit
        // umbrella "while bloodraging" sentence. Always on, but `reach`
        // isn't a computed stat (no applied target), so it stays a note.
        contextNotes: [{ target: "reach", text: "+5 ft. reach, always on." }],
      },
      {
        id: "blackBloodResistance",
        level: 8,
        name: "Black Blood Resistance",
        summary:
          "Resist cold 5 and +2 on saves against ability drain, death effects, disease, energy drain, paralysis, and poison (10 and +4 at 16th).",
        changes: [c("if(gte(@classes.bloodrager.level, 16), 10, 5)", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 16th) vs. ability drain, death effects, disease, energy drain, paralysis, and poison only. Not a general save bonus.",
          },
        ],
      },
      {
        id: "retributiveSpray",
        level: 12,
        name: "Retributive Spray",
        summary:
          "When hit by a slashing or piercing attack, black blood sprays toward the attacker for 1d8 plus 1 cold damage per two bloodrager levels (Reflex half).",
        contextNotes: [{ target: "allChecks", text: "Reactive, rolled damage. Apply manually." }],
      },
      {
        id: "blackBloodTransfusion",
        level: 16,
        name: "Black Blood Transfusion",
        summary:
          "On a confirmed critical hit, infuses the target with black blood that negates its next positive energy healing effect until removed (DC 25 Heal check).",
        contextNotes: [
          { target: "allChecks", text: "Situational rider on a crit. Apply manually." },
        ],
      },
      {
        id: "blackBloodImmunity",
        level: 20,
        name: "Black Blood Immunity",
        summary:
          "Immune to cold, nonlethal damage, critical hits, and sneak attacks, constantly, even while not bloodraging.",
        changes: [
          c("1", "imm.cold", "untyped"),
          c("1", "immEffect.criticalHits", "untyped"),
          c("1", "immEffect.precisionDamage", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to nonlethal damage. No damage type target holds that, so it stays manual.",
          },
        ],
      },
    ],
  },
  // ---- Hag ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Hag)
  // Every power sits under this bloodline's own umbrella sentence ("While
  // bloodraging, you manifest the physical power and arcane corruption of
  // your hag ancestor"), so none of them carry unconditional changes.
  // Unlike its siblings, Hag's own capstone (Curse Conduit) never restates
  // "constantly, even while not bloodraging" either, so it stays scoped to
  // the intro sentence too.
  {
    tag: "Hag",
    name: "Hag",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Deceitful",
      "Great Fortitude",
      "Improved Natural Attack",
      "Intimidating Prowess",
      "Mother's Gift",
    ),
    bonusSpells: bonusSpells("Chill Touch", "Blindness/Deafness", "Bestow Curse", "Charm Monster"),
    powers: [
      {
        id: "evilEye",
        level: 1,
        name: "Evil Eye",
        summary:
          "Standard action: curse a creature within 30 ft., imposing a -2 penalty to AC and attack rolls for 1 round per class level or until it hits you (Will negates). Uses per day equal to 3 + Charisma modifier.",
        resourcePool: {
          usesFormula: "3 + @abilities.cha.mod",
          per: "day",
          detail: "-2 AC and attack penalty on a cursed target",
        },
        contextNotes: [
          { target: "allChecks", text: "Debuffs the target, not you. No self Change." },
        ],
      },
      {
        id: "hagFortitude",
        level: 4,
        name: "Hag Fortitude",
        summary: "Immune to mundane and magical diseases; also immune to poison at 8th.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging, per this bloodline's own intro. Immunities are not tracked on the sheet either way, so it stays display only.",
          },
        ],
      },
      {
        id: "hagTransformation",
        level: 12,
        name: "Hag Transformation",
        summary:
          "While bloodraging: morale bonus to Strength increases by 2, gain low-light vision and darkvision 60 ft., but take a -2 penalty to Dexterity and Wisdom. At 16th, the morale bonus also applies to Fortitude and Reflex saves against spells and spell-like abilities while bloodraging.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Every part of this power is scoped to while bloodraging, including the penalties, so none of it is safe to apply as a standing Change.",
          },
        ],
      },
      {
        id: "covenguard",
        level: 16,
        name: "Covenguard",
        summary:
          "Cast bestow curse three times per day as a spell-like ability. Counts as a hag for joining a coven that already has one.",
        resourcePool: {
          usesFormula: "3",
          per: "day",
          detail: "Bestow curse as a spell-like ability",
        },
        contextNotes: [{ target: "allChecks", text: "Coven membership is flavor. Not modeled." }],
      },
      {
        id: "curseConduit",
        level: 20,
        name: "Curse Conduit",
        summary:
          "Immune to negative energy damage and spells with the curse descriptor. On a confirmed melee critical hit, free action: target the opponent with bestow curse.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Unlike this file's other capstones, RAW never restates these immunities as constant outside bloodrage, so it stays scoped to while bloodraging. The curse-descriptor immunity also has no matching immEffect slug.",
          },
        ],
      },
    ],
  },
  // ---- Kyton ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Kyton)
  {
    tag: "Kyton",
    name: "Kyton",
    bonusFeatSlugs: feats(
      "Alertness",
      "Blind-Fight",
      "Exotic Weapon Proficiency",
      "Great Fortitude",
      "Improved Dirty Trick",
      "Iron Will",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Persuasive Goad", "Pain Strike", "Deeper Darkness", "Fear"),
    powers: [
      {
        id: "painfulStrike",
        level: 1,
        name: "Painful Strike",
        summary:
          "On a confirmed critical hit, the target is sickened for 1/2 your bloodrager level in rounds (minimum 1) and must succeed at a concentration check (DC 15 + spell level) to cast spells while sickened this way.",
        contextNotes: [
          { target: "allChecks", text: "Debuffs the target, not you. No self Change." },
        ],
      },
      {
        id: "graspingChains",
        level: 4,
        name: "Grasping Chains",
        summary:
          "Chains grant a +4 bonus on Climb checks (+8 at 9th, plus a climb speed equal to half your base speed).",
        // RAW states no bloodraging qualifier at all for either tier of this
        // power; the chains are described as covering the bloodrager's body
        // outright. Modeled unconditionally, matching Abnormal Reach's
        // treatment elsewhere in this batch.
        changes: [
          c("if(gte(@classes.bloodrager.level, 9), 8, 4)", "skill.clm", "untyped"),
          c(
            "if(gte(@classes.bloodrager.level, 9), floor(@attributes.speed.land.total / 2), 0)",
            "climbSpeed",
            "base",
            "set",
          ),
        ],
      },
      {
        id: "armorOfChains",
        level: 8,
        name: "Armor of Chains",
        summary:
          "Resist cold 5 and a +4 armor bonus to AC with no armor check penalty, maximum Dexterity bonus, or added weight (10 and +8 at 16th).",
        changes: [
          c("if(gte(@classes.bloodrager.level, 16), 10, 5)", "eres.cold", "untyped"),
          c("if(gte(@classes.bloodrager.level, 16), 8, 4)", "ac", "armor"),
        ],
      },
      {
        id: "agonysEmbrace",
        level: 12,
        name: "Agony's Embrace",
        summary:
          "When hit by a critical hit, your bloodrage Strength bonus increases by 2 for 1d6 rounds or until the bloodrage ends (4 at 16th, 6 at 20th).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Reactive and scoped to an active bloodrage. Apply manually.",
          },
        ],
      },
      {
        id: "unnervingGaze",
        level: 16,
        name: "Unnerving Gaze",
        summary: "Gaze attack, range 30 ft.: foes that fail a Will save are shaken for 1d3 rounds.",
        contextNotes: [
          { target: "allChecks", text: "Debuffs foes in range, not you. No self Change." },
        ],
      },
      {
        id: "kytonImmunities",
        level: 20,
        name: "Kyton Immunities",
        summary: "Immune to cold and DR 10/good and silver, constantly, even when not bloodraging.",
        changes: [c("1", "imm.cold", "untyped"), c("10", "dr.good-and-silver", "untyped")],
      },
    ],
  },
  // ---- Medusa ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Medusa)
  // Unlike this file's other bloodlines, Medusa's text never once ties a
  // power to bloodraging, not even a "constantly, even while not
  // bloodraging" override on the capstone, so the numeric powers below are
  // modeled as genuinely always on rather than treated as an unstated rage
  // gate.
  {
    tag: "Medusa",
    name: "Medusa",
    bonusFeatSlugs: feats(
      "Alertness",
      "Blind-Fight",
      "Great Fortitude",
      "Improved Initiative",
      "Improved Unarmed Strike",
      "Intimidating Prowess",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Cause Fear", "Resist Energy", "Hold Person", "Stoneskin"),
    powers: [
      {
        id: "gaze",
        level: 1,
        name: "Gaze",
        summary:
          "Standard action: a creature within 30 ft. must succeed at a Fortitude save or have its speed halved for a number of rounds equal to your Constitution modifier (minimum 1).",
        contextNotes: [
          { target: "allChecks", text: "Debuffs the target, not you. No self Change." },
        ],
      },
      {
        id: "giftOfTheAncients",
        level: 4,
        name: "Gift of the Ancients",
        summary:
          "+2 resistance bonus on saves against gaze attacks and to resist poison, plus a +2 competence bonus on Perception checks (all +4 at 8th).",
        changes: [c("if(gte(@classes.bloodrager.level, 8), 4, 2)", "skill.per", "competence")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 (+4 at 8th) resistance vs. gaze attacks and poison only. Not a general save bonus.",
          },
        ],
      },
      {
        id: "staggeringGaze",
        level: 8,
        name: "Staggering Gaze",
        summary: "Creatures affected by your Gaze power are staggered in addition to slowed.",
        contextNotes: [
          { target: "allChecks", text: "Modifies the Gaze power's effect on the target only." },
        ],
      },
      {
        id: "vipersTouch",
        level: 12,
        name: "Viper's Touch",
        summary:
          "Grow two venomous claws as primary natural attacks (1d8, 1d6 if Small) that also deal 1d3 Strength poison damage over 4 rounds (Fortitude negates further doses).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Natural attack with rolled poison damage. Not modeled as a standing attack option.",
          },
        ],
      },
      {
        id: "stoneResistance",
        level: 16,
        name: "Stone Resistance",
        summary:
          "Acid resistance 10, immune to disease, poison, sickened, and staggered, and can't be flanked.",
        changes: [
          c("10", "eres.acid", "untyped"),
          c("1", "immEffect.disease", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("1", "immEffect.staggered", "untyped"),
        ],
        // "Sickened" has no slug in the closed immEffect vocabulary (only
        // "staggered" does), and "can't be flanked" isn't a Change target
        // either, so both stay display-only.
        contextNotes: [
          {
            target: "allChecks",
            text: "Also immune to sickened and can't be flanked. Neither has a matching Change target, so they stay manual.",
          },
        ],
      },
      {
        id: "truePetrification",
        level: 20,
        name: "True Petrification",
        summary:
          "Your Gaze power can permanently turn a creature to stone (as flesh to stone) instead of its lesser effects; declare the choice when you use it.",
        contextNotes: [
          { target: "allChecks", text: "Enhances the Gaze power's effect on the target only." },
        ],
      },
    ],
  },
  // ---- Naga ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Naga)
  {
    tag: "Naga",
    name: "Naga",
    bonusFeatSlugs: feats(
      "Alertness",
      "Combat Casting",
      "Combat Reflexes",
      "Dodge",
      "Lightning Reflexes",
      "Power Attack",
      "Stealthy",
    ),
    bonusSpells: bonusSpells("Ray of Enfeeblement", "Invisibility", "Lightning Bolt", "Poison"),
    powers: [
      {
        id: "serpentFangs",
        level: 1,
        name: "Serpent Fangs",
        summary:
          "Grow serpentine fangs: a primary natural bite attack dealing 1d8 (1d6 if Small) plus Strength modifier. Overcomes damage reduction as a magic weapon at 4th; damage increases to 1d10 (1d8 if Small) at 8th.",
        contextNotes: [
          { target: "allChecks", text: "Natural attack. Not modeled as a standing attack option." },
        ],
      },
      {
        id: "serpentineSwim",
        level: 4,
        name: "Serpentine Swim",
        summary: "Gain a swim speed equal to your base speed.",
        // RAW states no bloodraging qualifier at all ("you can swim
        // sinuously, like a snake"). Modeled unconditionally, unlike the
        // "when entering a bloodrage" powers later in this bloodline.
        changes: [c("@attributes.speed.land.total", "swimSpeed", "base", "set")],
      },
      {
        id: "nagaDefenses",
        level: 8,
        name: "Naga Defenses",
        summary:
          "When entering a bloodrage: +2 enhancement to natural armor and +4 on poison saves (+4 and +8 at 16th; +6 natural armor and poison immunity at 20th).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Only for the duration of a bloodrage you enter, including the 20th level tier. RAW never restates it as constant.",
          },
        ],
      },
      {
        id: "poisonFangs",
        level: 12,
        name: "Poison Fangs",
        summary:
          "Bite delivers poison: Fortitude DC 10 + 1/2 bloodrager level + Constitution modifier, 1/round for 6 rounds, 1d2 Constitution damage, cured by 1 save.",
        contextNotes: [
          { target: "allChecks", text: "Rolled poison damage on the target. Apply manually." },
        ],
      },
      {
        id: "nagaForm",
        level: 16,
        name: "Naga Form",
        summary: "When entering a bloodrage, assume the form of a naga (as naga shape III).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Activated choice on entering a bloodrage. Not modeled as a standing polymorph.",
          },
        ],
      },
      {
        id: "nagaThoughts",
        level: 20,
        name: "Naga Thoughts",
        summary:
          "When entering a bloodrage: immune to charm effects and mind reading, +2 on saves against other mind-affecting effects, the effects of see invisibility, and at-will detect thoughts.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Scoped to when you enter a bloodrage, including the immunities. RAW never restates it as constant, unlike most 20th level capstones in this table.",
          },
        ],
      },
    ],
  },
  // ---- Phoenix ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Phoenix)
  {
    tag: "Phoenix",
    name: "Phoenix",
    bonusFeatSlugs: feats(
      "Combat Reflexes",
      "Critical Focus",
      "Diehard",
      "Dodge",
      "Endurance",
      "Improved Initiative",
      "Mobility",
    ),
    bonusSpells: bonusSpells(
      "Burning Hands",
      "Lesser Restoration",
      "Cure Serious Wounds",
      "Fire Shield",
    ),
    powers: [
      {
        id: "dispellingStrikes",
        level: 1,
        name: "Dispelling Strikes",
        summary:
          "On a confirmed critical hit, attempt a targeted dispel magic against one magical effect on the target (once per creature per day; +2 on the check at 8th; can target all its magical effects at 20th).",
        contextNotes: [
          {
            target: "allChecks",
            text: "Affects the target's magic, not your stats. No self Change.",
          },
        ],
      },
      {
        id: "heartOfFire",
        level: 4,
        name: "Heart of Fire",
        summary:
          "Fire resistance 5 and 1 extra hit point per die when healed by a cure spell (10 and 2 extra hit points per die at 8th).",
        // RAW states no bloodraging qualifier for this power at all.
        changes: [c("if(gte(@classes.bloodrager.level, 8), 10, 5)", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "The extra healing per die has no matching Change target, so it stays manual.",
          },
        ],
      },
      {
        id: "blazingVitality",
        level: 8,
        name: "Blazing Vitality",
        summary:
          "While bloodraging, a 10 foot aura grants allies who end their turn in it temporary hit points equal to your Constitution modifier, lasting 1 minute.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Buffs nearby allies while bloodraging, not you. No self Change.",
          },
        ],
      },
      {
        id: "moltenWings",
        level: 12,
        name: "Molten Wings",
        summary:
          "When entering a bloodrage, grow wings of flame for a fly speed of 60 ft. average (80 ft. good at 16th).",
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "selfResurrection",
        level: 16,
        name: "Self-Resurrection",
        summary:
          "Once per day, when reduced below 0 hit points while bloodraging, trigger breath of life on yourself with no action (heal instead at 20th, using your bloodrager level as caster level).",
        resourcePool: {
          usesFormula: "1",
          per: "day",
          detail: "Breath of life (heal at 20th) when dropped below 0 hp while bloodraging",
        },
      },
      {
        id: "phoenixFire",
        level: 20,
        name: "Phoenix Fire",
        summary:
          "While bloodraging: melee attacks deal an extra 2d6 fire damage, enemies within 20 ft. take 4d6 fire damage at the start of their turn unless they succeed at a Reflex save, and creatures that hit you with a natural or non-reach weapon take 1d6 fire damage with no save.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Scoped to while bloodraging. RAW never restates it as constant, unlike most 20th level capstones in this table.",
          },
        ],
      },
    ],
  },
  // ---- Salamander ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Salamander)
  {
    tag: "Salamander",
    name: "Salamander",
    bonusFeatSlugs: feats(
      "Cleave",
      "Improved Grapple",
      "Improved Iron Will",
      "Iron Will",
      "Power Attack",
      "Skill Focus",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Lead Blades", "Make Whole", "Versatile Weapon", "Fire Shield"),
    powers: [
      {
        id: "serpentsTail",
        level: 1,
        name: "Serpent's Tail",
        summary:
          "While bloodraging, your legs fuse into a serpentine tail: speed reduced by 10 ft. (minimum 5, penalty removed at 4th), immune to trip, and a tail slap natural attack (1d6+Str, 1d4 if Small; 1d8/1d6 at 8th; +5 ft. reach at 12th).",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Salamander):
        // the powers list opens with "When you bloodrage, you gain the form
        // and flame of the salamander and the following powers" - an
        // umbrella intro gating every non-capstone power to the bloodraging
        // state (Salamander is explicit here where the ACG core bloodlines
        // this file otherwise follows are not). No unconditional Change
        // fits a while-bloodraging-only speed penalty or trip immunity (no
        // immEffect slug for trip exists), and there's no natural-weapon
        // mechanism to grant the tail slap attack either.
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging. Footwear also melds into your tail and stops functioning unless it grants a constant bonus.",
          },
        ],
      },
      {
        id: "salamanderScales",
        level: 4,
        name: "Salamander Scales",
        summary:
          "While bloodraging, fire resistance 5 (10 at 8th, 20 at 16th) and a natural armor bonus of +1 (+2 at 8th, +3 at 16th).",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Only while bloodraging." }],
      },
      {
        id: "bloodsmith",
        level: 8,
        name: "Bloodsmith",
        summary:
          "When entering a bloodrage, choose one wielded weapon, shield, or worn armor to gain the benefit of greater magic weapon or magic vestment (caster level equal to bloodrager level) until the bloodrage ends or you stop wielding or wearing it.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "scorchingHeat",
        level: 12,
        name: "Scorching Heat",
        summary:
          "While bloodraging, natural weapons and metal melee weapons deal +1d6 fire damage; a creature you grapple takes 2d6 fire damage per round (no damage to equipment).",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; roll the extra fire damage manually.",
          },
        ],
      },
      {
        id: "masterBloodsmith",
        level: 16,
        name: "Master Bloodsmith",
        summary: "Bloodsmith can affect two items at once (three items at 20th level).",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Modifies Bloodsmith only." }],
      },
      {
        id: "essenceOfFire",
        level: 20,
        name: "Essence of Fire",
        summary:
          "Immune to fire damage; bloodrager damage reduction increases by 5 (DR 10/magic instead if you have none yet) constantly, even while not bloodraging.",
        // RAW: "At 20th level, you become immune to fire damage. In
        // addition, your bloodrager damage reduction increases by 5. If you
        // don't have bloodrager damage reduction, you gain DR 10/magic
        // instead. You have these benefits constantly, even while you are
        // not bloodraging." Same "+5 delta on an unmodeled base DR
        // progression" gap the Aberrant and Undead capstones above document
        // (base bloodrager DR isn't hand-authored anywhere in this engine);
        // the "DR 10/magic if you have none yet" branch (true below 7th
        // level) isn't modeled either.
        changes: [c("1", "imm.fire", "untyped"), c("5", "dr", "untyped")],
      },
    ],
  },
  // ---- Shadow ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Shadow)
  {
    tag: "Shadow",
    name: "Shadow",
    bonusFeatSlugs: feats(
      "Blind-Fight",
      "Combat Reflexes",
      "Improved Initiative",
      "Lightning Reflexes",
      "Quick Draw",
      "Step Up",
    ),
    bonusSpells: bonusSpells(
      "Ray of Enfeeblement",
      "Darkvision",
      "Deeper Darkness",
      "Shadow Conjuration",
    ),
    powers: [
      {
        id: "shadowVision",
        level: 1,
        name: "Shadow Vision",
        summary:
          "While bloodraging, gain low-light vision (or darkvision 30 ft. if you already have low-light vision); at 10th level, darkvision 30 ft., or +30 ft. to existing darkvision instead.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Only while bloodraging." }],
      },
      {
        id: "shadesOfRage",
        level: 4,
        name: "Shades of Rage",
        summary:
          "Entering a bloodrage dims natural light within 30 ft. by one step; a caster can dispel it with a caster level check (DC 10 + your class level) against magical illumination.",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Environmental effect, not a character stat." },
        ],
      },
      {
        id: "strengthOfShadows",
        level: 8,
        name: "Strength of Shadows",
        summary:
          "Resist cold 10 (20 at 13th level); melee attacks deal additional cold damage equal to the weapon's critical multiplier; immune to cold damage at 18th level.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Shadow):
        // unlike Shadow Vision and Shades of Rage above, this power's own
        // text carries no "while bloodraging" qualifier, and this bloodline
        // (unlike the other five in this batch) has no umbrella
        // while-bloodraging intro sentence either — modeled unconditionally
        // on the same no-qualifier-found basis bloodlines.ts/bloodrager-
        // bloodlines.ts already apply to the Abyssal/Celestial/Infernal
        // "Resistances" powers.
        changes: [
          c("if(gte(@classes.bloodrager.level, 13), 20, 10)", "eres.cold", "untyped"),
          c("if(gte(@classes.bloodrager.level, 18), 1, 0)", "imm.cold", "untyped"),
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Extra cold damage on melee hits equal to weapon critical multiplier; roll manually.",
          },
        ],
      },
      {
        id: "strikeThroughShadow",
        level: 12,
        name: "Strike Through Shadow",
        summary:
          "Declare one melee attack per use as a strike through shadow, attacking the target's touch AC instead of its full AC; usable once per day (twice at 15th, three times at 18th).",
        resourcePool: {
          usesFormula:
            "if(gte(@classes.bloodrager.level, 18), 3, if(gte(@classes.bloodrager.level, 15), 2, 1))",
          per: "day",
          detail: "Melee attack vs. touch AC",
        },
      },
      {
        id: "shadowDoor",
        level: 16,
        name: "Shadow Door",
        summary:
          "Teleport through shadows as dimension door, unusable in brightly lit areas; total range 10 ft. per bloodrager level per day.",
        resourcePool: {
          usesFormula: "10 * @classes.bloodrager.level",
          per: "day",
          detail: "Feet of shadow-teleport movement/day",
        },
      },
      {
        id: "shadowWarrior",
        level: 20,
        name: "Shadow Warrior",
        summary:
          "See perfectly in natural and magical darkness; whenever you deal hit point damage with a spell or attack, also deal 2 points of Strength damage to each creature damaged.",
        // RAW gives no explicit "while bloodraging" restriction for this
        // capstone and no "constantly, even while not bloodraging"
        // boilerplate either (unlike every other bloodline's capstone in
        // this batch) — judged unconditional on the same no-qualifier-found
        // basis as Strength of Shadows above; flagged in the report as the
        // shakiest call in this batch. The Strength-damage rider has no
        // matching Change target (no "extra ability damage dealt on a hit"
        // target exists) and stays a contextNote regardless.
        changes: [c("1", "sensesid", "untyped", "set")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also deals 2 Str damage to anything you deal hit point damage to; no rider target exists, apply manually.",
          },
        ],
      },
    ],
  },
  // ---- Shapechanger ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Shapechanger)
  {
    tag: "Shapechanger",
    name: "Shapechanger",
    bonusFeatSlugs: feats(
      "Dodge",
      "Fleet",
      "Improved Initiative",
      "Improved Unarmed Strike",
      "Lightning Reflexes",
      "Power Attack",
      "Weapon Focus",
    ),
    bonusSpells: bonusSpells("Enlarge Person", "Alter Self", "Fly", "Stoneskin"),
    powers: [
      {
        id: "shiftingAspect",
        level: 1,
        name: "Shifting Aspect",
        summary:
          "While bloodraging, gain the benefit of the Aspect of the Beast feat, choosing one of its four manifestations each time you enter a bloodrage.",
        // Aspect of the Beast (feat-classification.ts) has no hand-authored
        // mechanical effects anywhere in this engine, on top of this power
        // being bloodrage-gated — no mechanism to grant its manifestations.
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; Aspect of the Beast's benefits aren't modeled.",
          },
        ],
      },
      {
        id: "spontaneousChange",
        level: 4,
        name: "Spontaneous Change",
        summary:
          "When entering a bloodrage, cast a self-only transmutation spell (normal casting time 1 round or less) as a swift action; its duration extends through the bloodrage.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "evolvingAspect",
        level: 8,
        name: "Evolving Aspect",
        summary:
          "Gain Aspect of the Beast as a bonus feat even without meeting its prerequisites; while bloodraging, apply a second manifestation simultaneously with the first.",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Aspect of the Beast's benefits aren't modeled." },
        ],
      },
      {
        id: "beastskin",
        level: 12,
        name: "Beastskin",
        summary:
          "When entering a bloodrage, your bloodrager damage reduction increases by 2 (bypassed by silver instead of its normal bypass), and your natural attacks, including unarmed strikes, count as silver for overcoming damage reduction.",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; base bloodrager damage reduction isn't modeled either.",
          },
        ],
      },
      {
        id: "shedSkin",
        level: 16,
        name: "Shed Skin",
        summary:
          "When your bloodrage ends, attempt to dispel one spell or spell-like ability affecting you as an immediate action (dispel check 1d20 + bloodrager level, as dispel magic).",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Triggered when a bloodrage ends; roll the dispel check manually.",
          },
        ],
      },
      {
        id: "trueShapechanger",
        level: 20,
        name: "True Shapechanger",
        summary:
          "Immune to transmutation spells and effects unless a willing target; at-will self-only greater polymorph as a spell-like ability (caster level equal to bloodrager level), constantly, even while not bloodraging.",
        // No Change target covers "immune to a spell school" (the same gap
        // the sorcerer Arcane bloodline's arcana leaves display-only in
        // bloodlines.ts), and "greater polymorph at will" is a spell-like
        // ability, not a flat number — this capstone stays fully
        // display-only despite being unconditional.
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "No school-immunity target exists; apply manually." },
        ],
      },
    ],
  },
  // ---- Sphinx ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Sphinx)
  {
    tag: "Sphinx",
    name: "Sphinx",
    bonusFeatSlugs: feats(
      "Alertness",
      "Combat Casting",
      "Dazzling Display",
      "Improved Critical",
      "Iron Will",
      "Rending Fury",
      "Skill Focus",
      "Voice of the Sibyl",
    ),
    bonusSpells: bonusSpells("Divine Favor", "Touch of Idiocy", "Searing Light", "Bestow Curse"),
    powers: [
      {
        id: "claws",
        level: 1,
        name: "Claws",
        summary:
          "While bloodraging, grow claws (two claw attacks, full BAB, 1d6+Str each, 1d4 if Small; 1d8/1d6 at 8th).",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging; not a standing attack option." },
        ],
      },
      {
        id: "roar",
        level: 4,
        name: "Roar",
        summary:
          "Standard action, 3 + Charisma modifier/day: roar; enemies within 60 ft. are frightened for 1d6 rounds unless they succeed at a Will save (DC 10 + 1/2 character level + Charisma modifier).",
        resourcePool: {
          usesFormula: "3 + @abilities.cha.mod",
          per: "day",
          detail: "Fear roar, 60 ft.",
        },
      },
      {
        id: "desertFortitude",
        level: 8,
        name: "Desert Fortitude",
        summary:
          "Resist electricity 5 and fire 5; endure elements as a constant spell-like ability; +2 competence bonus on saves against arcane spells (+6 at 20th level).",
        // RAW carries no "while bloodraging" qualifier for this power
        // (unlike Claws above, which explicitly has one) — modeled
        // unconditionally on the same basis as the ACG core Abyssal/
        // Celestial/Infernal "Resistances" powers.
        changes: [c("5", "eres.electricity", "untyped"), c("5", "eres.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+2 competence bonus (+6 at 20th) vs. arcane spells only; not a general save bonus.",
          },
        ],
      },
      {
        id: "rendingRage",
        level: 12,
        name: "Rending Rage",
        summary: "Gain a rend attack dealing 2d4 + 1-1/2x Strength modifier extra damage.",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Combat-maneuver rider; no matching Change target." },
        ],
      },
      {
        id: "masterOfMysteries",
        level: 16,
        name: "Master of Mysteries",
        summary:
          "Once per day, cast maze or symbol of insanity as a spell-like ability (caster level equal to character level); spell resistance equal to 11 + bloodrager level.",
        changes: [c("11 + @classes.bloodrager.level", "spellResist", "untyped", "set")],
        resourcePool: { usesFormula: "1", per: "day", detail: "Maze or symbol of insanity" },
      },
      {
        id: "finalRiddle",
        level: 20,
        name: "Final Riddle",
        summary:
          "Immune to fire and electricity; ignore environmental penalties from temperature; competence bonus vs. arcane spells increases to +6, constantly, even while not bloodraging.",
        changes: [c("1", "imm.electricity", "untyped"), c("1", "imm.fire", "untyped")],
        contextNotes: [
          {
            target: "allSavingThrows",
            text: "+6 competence vs. arcane spells only; not a general save bonus.",
          },
          {
            target: "allChecks",
            text: "Also ignores environmental temperature penalties; display only.",
          },
        ],
      },
    ],
  },
  // ---- Verdant ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Verdant)
  {
    tag: "Verdant",
    name: "Verdant",
    bonusFeatSlugs: feats(
      "Bolstered Resilience",
      "Diehard",
      "Endurance",
      "Great Fortitude",
      "Power Attack",
      "Raging Vitality",
      "Toughness",
    ),
    bonusSpells: bonusSpells("Entangle", "Greensight", "Burst of Nettles", "Command Plants"),
    powers: [
      {
        id: "verdantGrowth",
        level: 1,
        name: "Verdant Growth",
        summary:
          "While bloodraging, fast healing 1, increasing by 1 at 4th level and every 3 levels thereafter, to a maximum of fast healing 6 at 19th level.",
        // No fastHealing Change target exists in this engine, on top of the
        // bloodrage gate — display only.
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Only while bloodraging; no fast-healing target exists." },
        ],
      },
      {
        id: "oakenSkin",
        level: 4,
        name: "Oaken Skin",
        summary:
          "When entering a bloodrage, +2 enhancement bonus to natural armor, increasing by 1 at 8th level and every 4 levels thereafter.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "botanicalPlasticity",
        level: 8,
        name: "Botanical Plasticity",
        summary: "Swift action: reach increases by 5 feet until the end of your turn.",
        changes: [],
        contextNotes: [
          { target: "reach", text: "Only for the rest of the turn it's activated; situational." },
        ],
      },
      {
        id: "verdantCall",
        level: 12,
        name: "Verdant Call",
        summary:
          "When entering a bloodrage, swift action: animate nearby plants to fight for you, as wilderness soldiers, using your Charisma modifier instead of Wisdom.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Activated choice on entering a bloodrage." }],
      },
      {
        id: "naturesThorns",
        level: 16,
        name: "Nature's Thorns",
        summary:
          "Creatures that hit you in melee, other than with manufactured reach weapons, take 4d6 piercing damage, once per creature per round.",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Reactive damage rider; no matching Change target." },
        ],
      },
      {
        id: "verdantApotheosis",
        level: 20,
        name: "Verdant Apotheosis",
        summary:
          "While bloodraging, tremorsense 30 ft. Immune to paralysis, poison, sleep, and stunning, even while not bloodraging.",
        // RAW (aonprd.com, BloodragerBloodlineDisplay.aspx?ItemName=Verdant):
        // "While bloodraging, you gain tremorsense out to 30 feet. In
        // addition, you gain immunity to paralysis, poison, sleep, and
        // stunning effects, even while you are not bloodraging." Only the
        // immunities carry the "even while not bloodraging" carve-out;
        // tremorsense stays bloodrage-gated and display-only.
        changes: [
          c("1", "immEffect.paralysis", "untyped"),
          c("1", "immEffect.poison", "untyped"),
          c("1", "immEffect.sleep", "untyped"),
          c("1", "immEffect.stunned", "untyped"),
        ],
        contextNotes: [{ target: "allChecks", text: "Tremorsense 30 ft. only while bloodraging." }],
      },
    ],
  },
  // ---- Vestige ---- (source: https://aonprd.com/BloodragerBloodlineDisplay.aspx?ItemName=Vestige)
  {
    tag: "Vestige",
    name: "Vestige",
    bonusFeatSlugs: feats(
      "Combat Casting",
      "Exotic Weapon Proficiency",
      "Greater Weapon Focus",
      "Greater Weapon Specialization",
      "Iron Will",
      "Weapon Focus",
      "Weapon Specialization",
    ),
    bonusSpells: bonusSpells("True Strike", "False Life", "Phantom Steed", "Mass Enlarge Person"),
    powers: [
      {
        id: "warriorsDiscipline",
        level: 1,
        name: "Warrior's Discipline",
        summary:
          "Swift action: halve your morale bonuses from bloodrage for 1 round so you can use Intelligence- or Charisma-based skills, or abilities requiring patience or concentration.",
        changes: [],
        contextNotes: [{ target: "allChecks", text: "Self-imposed trade-off, not a flat bonus." }],
      },
      {
        id: "ancientTactics",
        level: 4,
        name: "Ancient Tactics",
        summary:
          "While bloodraging, bonuses you or allies within 30 ft. gain from battlefield position (flanking, cover, etc.) increase by 1; expending a spell slot increases it by 1 more per slot level.",
        changes: [],
        contextNotes: [
          {
            target: "allChecks",
            text: "Only while bloodraging; boosts situational position bonuses, not a flat one.",
          },
        ],
      },
      {
        id: "legacyStyle",
        level: 8,
        name: "Legacy Style",
        summary:
          "Select a style feat usable while bloodraging even without its prerequisites, by expending a spell slot (benefit lasts 1 round per spell slot level, or the bloodrage's duration, whichever is shorter).",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Style feats aren't modeled; only while bloodraging." },
        ],
      },
      {
        id: "warsMemory",
        level: 12,
        name: "War's Memory",
        summary:
          "Once per day, manifest an illusory battlefield from your ancestors' past, as hallucinatory terrain, lasting until your bloodrage ends.",
        resourcePool: {
          usesFormula: "1",
          per: "day",
          detail: "Hallucinatory terrain (ancestral battlefield)",
        },
        contextNotes: [
          {
            target: "allChecks",
            text: "Failed saves also impose a fear-save penalty and shaken condition; not modeled.",
          },
        ],
      },
      {
        id: "legacyConduit",
        level: 16,
        name: "Legacy Conduit",
        summary:
          "Swift action, expending a spell slot: share Legacy Style's selected style feat with allies within 30 feet.",
        changes: [],
        contextNotes: [
          { target: "allChecks", text: "Extends Legacy Style; style feats aren't modeled." },
        ],
      },
      {
        id: "callToArms",
        level: 20,
        name: "Call to Arms",
        summary:
          "Once per day, summon a ghostly army as spiritual ally (caster level equal to bloodrager level), a number of allies equal to your Constitution modifier that use your Strength modifier for attacks, lasting until your bloodrage ends.",
        resourcePool: {
          usesFormula: "1",
          per: "day",
          detail: "Spiritual-ally-style ghostly allies",
        },
      },
    ],
  },
];

export const BLOODRAGER_BLOODLINES: Record<string, BloodragerBloodlineDef> = Object.fromEntries(
  BLOODRAGER_BLOODLINE_LIST.map((b) => [b.tag, b]),
);

export const BLOODRAGER_BLOODLINE_TAGS: readonly string[] = BLOODRAGER_BLOODLINE_LIST.map(
  (b) => b.tag,
);

/**
 * True when the bloodline carries any live mechanics — a `changes`/
 * `variantChanges` array or a resource pool — as opposed to being fully
 * rules-text. Mirrors `bloodlines.ts`'s `bloodlineMovesNumbers` for the
 * picker's "M" badge.
 */
export function bloodragerBloodlineMovesNumbers(def: {
  powers: BloodragerBloodlinePower[];
}): boolean {
  return def.powers.some(
    (p) =>
      (p.changes?.length ?? 0) > 0 ||
      Object.keys(p.variantChanges ?? {}).length > 0 ||
      p.resourcePool !== undefined,
  );
}

/** Human-readable label for a bloodrager bloodline's chosen variant id, or `undefined` if unset/unknown. */
export function bloodragerBloodlineVariantLabel(
  tag: string,
  variantId: string | undefined,
): string | undefined {
  if (!variantId) return undefined;
  const bloodline = BLOODRAGER_BLOODLINES[tag];
  return bloodline?.variantOptions?.find((v) => v.id === variantId)?.label;
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.bloodragerBloodlines` is the FULL published
 * catalog (24 entries after junk filtering), prose only — same "catalog
 * from data, mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified table above (now the whole
 * published catalog) stays authoritative for powers/bonus feats/bonus
 * spells; this section attaches each vendored entry's prose description
 * and sources for browsing.
 *
 * Matching is by NORMALIZED NAME (this table's `tag` doubles as its display
 * `name`). Collision audit: every hand-authored bloodline matches a
 * vendored entry by normalized name — no aliasing needed. The vendored-only
 * fallback path below is retained for future data bumps that add bloodlines
 * before a hand entry exists.
 */

const BLOODRAGER_BLOODLINE_NAME_ALIASES: Record<string, string> = {};

function normalizeBloodragerBloodlineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedBloodragerBloodlineEntry extends BloodragerBloodlineDef {
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only bloodline with no hand-authored powers/bonus feats — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredBloodragerBloodlineToDef(
  entry: BloodragerBloodline,
): MergedBloodragerBloodlineEntry {
  return {
    tag: entry.name,
    name: entry.name,
    powers: [],
    bonusFeatSlugs: [],
    bonusSpells: [],
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked bloodline tag (`doc.build.bloodragerBloodline`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveBloodragerBloodline(
  tag: string,
  refData: RefData,
): MergedBloodragerBloodlineEntry | undefined {
  const hand = BLOODRAGER_BLOODLINES[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = Object.values(refData.bloodragerBloodlines ?? {}).find(
    (v) => normalizeBloodragerBloodlineName(v.name) === normalizeBloodragerBloodlineName(tag),
  );
  return vendored ? vendoredBloodragerBloodlineToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored bloodline, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedBloodragerBloodlineCatalog(
  refData: RefData,
): MergedBloodragerBloodlineEntry[] {
  const handByNormName = new Map<string, BloodragerBloodlineDef>();
  for (const b of BLOODRAGER_BLOODLINE_LIST) {
    handByNormName.set(
      normalizeBloodragerBloodlineName(BLOODRAGER_BLOODLINE_NAME_ALIASES[b.tag] ?? b.name),
      b,
    );
  }

  const usedHandTags = new Set<string>();
  const merged: MergedBloodragerBloodlineEntry[] = [];
  for (const v of Object.values(refData.bloodragerBloodlines ?? {})) {
    const handMatch = handByNormName.get(normalizeBloodragerBloodlineName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredBloodragerBloodlineToDef(v));
    }
  }
  for (const b of BLOODRAGER_BLOODLINE_LIST) {
    if (!usedHandTags.has(b.tag)) merged.push({ ...b, displayOnly: false });
  }
  return merged;
}
