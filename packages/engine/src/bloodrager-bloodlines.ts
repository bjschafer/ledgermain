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
 * Scope: the 9 ACG bloodrager bloodlines (Abyssal, Arcane, Celestial,
 * Destined, Draconic, Elemental, Fey, Infernal, Undead) — verified against
 * AoN's `BloodragerBloodlineDisplay.aspx` list, which also carries 15 later-
 * splatbook bloodlines (Aberrant, Aquatic, Black Blood, Hag, Kyton, Martyred,
 * Medusa, Naga, Phoenix, Salamander, Shadow, Shapechanger, Sphinx, Verdant,
 * Vestige) deliberately out of scope, same "Core-book-first" posture
 * `bloodlines.ts` takes for the 10 CRB sorcerer bloodlines.
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

import type { Change, ContextNote } from "@pf1/schema";

import type { BloodlineResourcePool } from "./bloodlines.js";
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
        contextNotes: [
          { target: "allChecks", text: "Immunities aren't tracked on the sheet — display only." },
        ],
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
        changes: [c("10", "eres.electricity", "untyped"), c("10", "eres.fire", "untyped")],
        contextNotes: [
          { target: "allSavingThrows", text: "+4 vs. poison only — not a general save bonus." },
          {
            target: "allChecks",
            text: "Also grants acid/cold/petrification immunity (display only).",
          },
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
        contextNotes: [
          { target: "allChecks", text: "Immunities aren't tracked on the sheet — display only." },
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
        summary: "Resist 5 to your energy type; +1 natural armor bonus to AC.",
        changes: [c("1", "nac", "natural")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Energy resistance is to your chosen dragon type only — free-text pick, not tracked as a number; add it manually.",
          },
        ],
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
        contextNotes: [
          { target: "allChecks", text: "Immunities/blindsense aren't tracked — display only." },
        ],
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
        contextNotes: [
          {
            target: "allChecks",
            text: "Resistance is to your chosen element's energy type only — free-text pick, not tracked as a number; add it manually.",
          },
        ],
      },
      {
        id: "elementalMovement",
        level: 8,
        name: "Elemental Movement",
        summary:
          "Gain a movement mode keyed to your element: Air flies 60 ft., Earth burrows 30 ft., Fire adds 30 ft. speed, Water swims 60 ft.",
        contextNotes: [
          {
            target: "allChecks",
            text: "Movement mode depends on your chosen element — not tracked as a number; add it manually.",
          },
        ],
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
        contextNotes: [
          { target: "allChecks", text: "Immunities aren't tracked on the sheet — display only." },
        ],
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
        changes: [c("10", "eres.acid", "untyped"), c("10", "eres.cold", "untyped")],
        contextNotes: [
          {
            target: "allChecks",
            text: "Also grants fire/poison immunity and see in darkness (display only).",
          },
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
        contextNotes: [
          { target: "allChecks", text: "Immunities aren't tracked on the sheet — display only." },
        ],
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

/** Human-readable label for a bloodrager bloodline's chosen variant id, or `undefined` if unset/unknown. */
export function bloodragerBloodlineVariantLabel(
  tag: string,
  variantId: string | undefined,
): string | undefined {
  if (!variantId) return undefined;
  const bloodline = BLOODRAGER_BLOODLINES[tag];
  return bloodline?.variantOptions?.find((v) => v.id === variantId)?.label;
}
