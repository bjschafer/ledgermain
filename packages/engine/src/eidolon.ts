/**
 * Tracked eidolons (`CharacterDoc.build.eidolon`) — the Summoner's signature
 * companion, modeled as its OWN trackable creature (HD/BAB/saves/AC/attacks/
 * skills), mirroring `companion.ts`'s shape and posture closely (own HD/BAB/
 * saves, NOT a familiar's borrow-the-master's-numbers approach). Two genuine
 * additions beyond `companion.ts`'s shape: a BASE FORM choice
 * (`EIDOLON_BASE_FORMS`, in place of a species) and an EVOLUTION POOL spend
 * (`EIDOLON_EVOLUTIONS`, in place of ability-score-increase slots). Models
 * BOTH the chained (Advanced Player's Guide) and unchained (Pathfinder
 * Unchained) eidolon: `eidolonVariant` picks the branch, and the unchained
 * one additionally layers on a subtype (Angel/Demon/Devil/...) — see
 * `eidolon-unchained.ts` for that half of the system, and this module's
 * "Scope/deferrals" section below for exactly how the two branches share
 * this file's data tables. Clean-room from the published PF1 rules (Advanced
 * Player's Guide "Summoner"/"Eidolon"/"Evolutions", Pathfinder Unchained
 * "Eidolons (Unchained)") — paraphrased from aonprd.com/d20pfsrd.com during
 * authoring (issue #65, groundwork for issue #68's future full-stat-block
 * companion work; unchained subtype system added issue #74); no Foundry
 * source was consulted (see DESIGN §6). Foundry's GPL system code is never
 * used as anything but a behavioral oracle in tests, per the repo's
 * clean-room discipline.
 *
 * Eidolon Basics (PF1 APG "Eidolon"):
 *   - The eidolon has its OWN Hit Dice, BAB, and saves. Its BAB is FULL
 *     (equal to its Hit Dice — `babForLevels("high", hd)`), unlike an animal
 *     companion's 3/4 BAB — verified row-by-row against aonprd.com/
 *     d20pfsrd.com's "Table: Eidolon Base Statistics" during authoring (HD
 *     and BAB columns are identical at every row, 1st through 20th). Two of
 *     its three saves are "good" (`saveForLevels("high", hd)`) and one
 *     "poor" (`saveForLevels("low", hd)`), with WHICH two determined by its
 *     BASE FORM (`EidolonBaseForm.goodSaves`) rather than fixed — same
 *     per-source-varying-saves shape `phantom.ts`'s per-Emotional-Focus
 *     `goodSaves` already established, just keyed off base form instead.
 *   - HD are d10s (verified against the table's own "10-sided (d10) Hit
 *     Dice" note). HP: PF1 RAW average-hp-per-HD (`floor(5.5*hd)`) plus the
 *     eidolon's own Constitution modifier per HD, floored at 1 hp/HD — same
 *     shape as `phantom.ts`'s identical d10 math.
 *   - Base ability scores are UNIVERSAL across every base form for
 *     Int/Wis/Cha (7/10/11 — verified against aonprd.com's "Base Forms"
 *     section, which states this baseline explicitly before each form's own
 *     Str/Dex/Con override); Str/Dex/Con are form-specific (see
 *     {@link EIDOLON_BASE_FORMS}). On top of the base scores, EVERY row of
 *     {@link EIDOLON_PROGRESSION} adds the SAME bonus to BOTH Strength and
 *     Dexterity (the table's "Str/Dex Bonus" column) — independent of any
 *     player-chosen "Ability Increase" EVOLUTION (a genuine evolution-pool
 *     spend, `build.eidolon.evolutions`, unlike `PhantomBuild`/
 *     `AnimalCompanionBuild`'s separate automatic ASI-slot mechanic; an
 *     eidolon has no automatic ASI slots at all — every ability increase
 *     beyond the table's own Str/Dex bonus is paid for from the pool).
 *   - Natural armor: {@link EIDOLON_PROGRESSION}'s "Armor Bonus" column,
 *     applied as a flat natural-armor-type AC bonus (same simplification
 *     `phantom.ts`/`companion.ts` already use — PF1 RAW actually lets the
 *     summoner split this bonus between a literal armor bonus and a natural
 *     armor bonus at will; this project always applies it as natural armor,
 *     documented here rather than silently guessed at), on top of the
 *     "Improved Natural Armor" evolution's own flat +2/rank.
 *   - Evolution pool ({@link eidolonProgressionRow}'s `evolutionPool`
 *     column): the total evolution points available to spend on
 *     {@link EIDOLON_EVOLUTIONS}. Free-choice, soft warning only on
 *     overspend — same posture as `traits`/`racialTraits`/every other
 *     budgeted picker in this codebase (see `apps/web/src/model/eidolon.ts`).
 *     `maxAttacks` (the table's own natural-attack cap) is surfaced for
 *     display only — not enforced, matching the pool's own soft posture.
 *   - Skills: the table's flat `4 * HD` skill-point total (verified against
 *     the table's own column) is surfaced as a DISPLAY-ONLY aggregate number
 *     (`skillPoints`), same "no rank-by-rank distribution modeled" posture
 *     as `companion.ts`'s `bonusTricks`/`bonusFeats` — an eidolon has EVERY
 *     skill as a class skill (unlike the companion's fixed six-skill set or
 *     the phantom's exactly-two), so a full per-skill picker is out of scope
 *     for this v1 pass; the "Skilled" evolution (+8 racial to one skill) is
 *     therefore left `displayOnly` rather than wired to a skill this module
 *     doesn't track.
 *   - Attacks: the base form's own free natural attacks (`baseAttacks`,
 *     e.g. Biped's 2 claws) plus any attack-granting evolutions chosen
 *     (bite/claws/gore/hooves/pincers/slam/sting/tail slap/tentacle/wing
 *     buffet). Primary/secondary natural-attack math (full BAB+Str vs. −5/−2
 *     and half Str) is shared with `companion.ts` via `natural-attacks.ts`
 *     (issue #68's classification: bite/claws/gore/slam/sting are
 *     primary-type; hooves/pincers/tail slap/tentacle/wing buffet are
 *     secondary-type — the same names this module's own evolution flavor
 *     text above already uses). "Multiattack" (unlocked at 9th,
 *     {@link EIDOLON_PROGRESSION}) softens the secondary penalty from −5 to
 *     −2, same as a companion's.
 *   - Attack rolls use Strength, per PF1's natural-attack rules — NOT the
 *     "better of Str/Dex" rule that governs a familiar (CRB Familiar Basics
 *     is an explicit, narrow exception; see `familiar.ts`). An eidolon can
 *     still get a Dex-based attack roll the RAW way: by picking Weapon
 *     Finesse (natural weapons are light weapons for this purpose) from its
 *     own feat list (`build.eidolon.feats`). `hasWeaponFinesse` is resolved
 *     by the CALLER (this pure module has no `RefData`), same posture as
 *     `companion.ts`'s `hasBoonCompanion`/`hasWeaponFinesse`, and only ever
 *     changes the ATTACK roll — damage stays Str-based
 *     (`naturalAttackDamageBonus`) either way.
 *   - Special abilities table column (Darkvision/Link/Share Spells at 1st,
 *     Evasion at 2nd, Devotion at 6th, Multiattack at 9th, Improved Evasion
 *     at 14th) are display-only chips, same posture as
 *     `COMPANION_SPECIAL_ABILITY_DETAIL`/`PHANTOM_SPECIAL_ABILITY_DETAIL`.
 *   - Conditions: the eidolon has its OWN active-conditions list
 *     (`live.eidolon.conditions`), independent of the summoner's
 *     `live.conditions` — routed through the exact same `routeSharedBuffs`
 *     pipeline as a shared buff, same as `companion.ts`'s own conditions.
 *
 * Scope/deferrals (all documented here, none silently dropped):
 *   - **Unchained subtype system: 12 core subtypes, Elemental split into 4**
 *     (Agathion/Angel/Archon/Azata/Daemon/Demon/Devil/Div/Elemental ×4
 *     elements/Inevitable/Protean/Psychopomp — see `eidolon-unchained.ts`).
 *     `eidolonSummonerLevel` below still sums BOTH `summoner` (chained) and
 *     `summonerUnchained` class levels for the LEVEL number itself (a
 *     character genuinely multiclassed across both, though PF1 doesn't
 *     really support that, keeps the existing summed-level CHAINED
 *     derivation — see `eidolon-unchained.ts`'s `eidolonVariant` doc
 *     comment for that narrow edge-case call); only which TABLE/subtype
 *     system applies depends on the variant. Every subtype grant beyond a
 *     small structured set (evolution pool bonuses, one free evolution,
 *     land-speed bonuses, a free +2 ability increase) is a paraphrased
 *     display-only chip, same honesty-bar discipline as this file's own
 *     `displayOnly` evolutions — later-splatbook subtypes (e.g. Pathfinder
 *     Campaign Setting: Heroes of the Wild's "Aberrant") are out of scope,
 *     matching the base-form deferral immediately below.
 *   - **Three base forms only** (Biped, Quadruped, Serpentine) of APG's six
 *     — Aquatic, Avian, and Tauric are deferred (no `EIDOLON_BASE_FORMS`
 *     entry), matching the task brief's explicit scoping call.
 *   - **~80 evolutions curated, the complete APG-core list** — every 1/2/3/4
 *     point evolution from Advanced Player's Guide's own "Evolutions" list
 *     is present below (no splatbook-only entries beyond APG core), but only
 *     the ones with a clean, unconditional numeric shape (attacks, ability
 *     increase, natural armor, one size step, and a handful of movement
 *     modes) are wired as real numeric grants; the rest are `displayOnly`
 *     with a paraphrased `summary`, same honesty-bar discipline as
 *     `rogue-talents.ts`/`witch-hexes.ts`. Size growth is capped at "Large"
 *     (the 4-point "Large" evolution); the further Huge upsize (available at
 *     13th by spending Large's own evolution again) is NOT modeled — a
 *     documented v1 simplification, not a missed rule.
 *   - Life Link, Bond Senses, Shield Ally, Merge Forms, Maker's Call, and
 *     the rest of the SUMMONER-side (not eidolon-side) class features are
 *     surfaced generically as prose class-feature rows already (this module
 *     adds no eidolon-specific detail for them beyond `summoned`'s doc
 *     comment reminder about Life Link — see `EidolonLiveState.summoned`
 *     in `packages/schema/src/character.ts`).
 */

import type { AbilityId, ActiveBuff, CharacterDoc, ModifierComponent, SizeId } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { CONDITIONS } from "./conditions.js";
import {
  eidolonSubtypeGrantedEvolutions,
  eidolonUnchainedAbilityIncreaseSlots,
  eidolonUnchainedProgressionRow,
  eidolonUnchainedSpecialAbilityNames,
  eidolonVariant,
  EIDOLON_SUBTYPES,
} from "./eidolon-unchained.js";
import {
  classifyNaturalAttacks,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  type NaturalAttackType,
} from "./natural-attacks.js";
import { abilityMod } from "./rolldata.js";
import {
  applySharedAbilityBonuses,
  applySharedSpeeds,
  routeSharedBuffs,
  type AcCandidate,
} from "./shared-creature-buffs.js";
import { resolveStack } from "./stacking.js";
import {
  babForLevels,
  saveForLevels,
  SIZE_AC_MOD,
  SKILL_ABILITY,
  specialSizeMod,
} from "./tables.js";
import type { RollData } from "./formula.js";

/** Universal base ability scores every eidolon starts with for Int/Wis/Cha (APG "Base Forms"), before any base-form Str/Dex/Con override. */
export const EIDOLON_UNIVERSAL_ABILITIES = { int: 7, wis: 10, cha: 11 } as const;

/**
 * An eidolon's STARTING ability scores for `baseForm` — the form's own
 * Str/Dex/Con plus the universal Int/Wis/Cha — with any player-set
 * `EidolonBuild.baseAbilities` override applied on top. The single source of
 * truth for those defaults, shared by `deriveEidolon` and the builder's
 * ability-score editor so both agree on what "default" means. Falls back to
 * the biped's scores for an unrecognized form id (soft posture: never an
 * undefined stat block just because the form id is stale).
 *
 * Everything level-scaled (the table's Str/Dex bonus, Large's deltas,
 * evolutions, ASI slots, subtype grants, buffs) applies ON TOP of this and
 * is deliberately NOT included here.
 */
export function eidolonStartingAbilities(
  baseForm: string,
  overrides?: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> {
  const form = EIDOLON_BASE_FORMS[baseForm] ?? EIDOLON_BASE_FORMS.biped!;
  const defaults: Record<AbilityId, number> = {
    str: form.abilities.str,
    dex: form.abilities.dex,
    con: form.abilities.con,
    ...EIDOLON_UNIVERSAL_ABILITIES,
  };
  if (!overrides) return defaults;
  for (const id of ABILITY_IDS) {
    const value = overrides[id];
    if (typeof value === "number" && Number.isFinite(value)) defaults[id] = Math.trunc(value);
  }
  return defaults;
}

/** One natural weapon a base form (or an attack-granting evolution) contributes. */
export interface EidolonAttackGrant {
  name: string;
  /** How many of this attack the creature makes (e.g. 2 for "2 claws"). */
  count: number;
  /** Damage dice before the Str-modifier addend, e.g. "1d6". */
  damageDice: string;
}

/** One of the three modeled PF1 APG "Base Forms" (see module doc comment for the other three's deferral). */
export interface EidolonBaseForm {
  name: string;
  abilities: { str: number; dex: number; con: number };
  /** Movement speeds in feet, keyed by mode ("land", "climb", ...). */
  speeds: Record<string, number>;
  /** The form's own free natural attacks. */
  baseAttacks: EidolonAttackGrant[];
  /** Which two of fort/ref/will are "good" saves for this base form; the third is "poor". */
  goodSaves: readonly ("fort" | "ref" | "will")[];
  /** Display-only chip names for the evolutions this form grants for free (already reflected in `baseAttacks`/`speeds` above — not separately spent from the pool). */
  freeEvolutionNames: readonly string[];
}

/**
 * The three core PF1 APG eidolon base forms (verified against aonprd.com/
 * d20pfsrd.com's "Base Forms" section during authoring — see module doc
 * comment for the three deferred forms).
 */
export const EIDOLON_BASE_FORMS: Readonly<Record<string, EidolonBaseForm>> = {
  biped: {
    name: "Biped",
    abilities: { str: 16, dex: 12, con: 13 },
    speeds: { land: 30 },
    baseAttacks: [{ name: "Claw", count: 2, damageDice: "1d4" }],
    goodSaves: ["fort", "will"],
    freeEvolutionNames: ["Claws", "Limbs (arms)", "Limbs (legs)"],
  },
  quadruped: {
    name: "Quadruped",
    abilities: { str: 14, dex: 14, con: 13 },
    speeds: { land: 40 },
    baseAttacks: [{ name: "Bite", count: 1, damageDice: "1d6" }],
    goodSaves: ["fort", "ref"],
    freeEvolutionNames: ["Bite", "Limbs (legs) x2"],
  },
  serpentine: {
    name: "Serpentine",
    abilities: { str: 12, dex: 16, con: 13 },
    speeds: { land: 20, climb: 20 },
    baseAttacks: [
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Tail slap", count: 1, damageDice: "1d6" },
    ],
    goodSaves: ["ref", "will"],
    freeEvolutionNames: ["Bite", "Climb", "Reach (bite)", "Tail", "Tail Slap"],
  },
};

/** All base-form slugs, for the builder's picker. */
export const EIDOLON_BASE_FORM_IDS = Object.keys(EIDOLON_BASE_FORMS);

/** One row of the APG "Table: Eidolon Base Statistics", by summoner level. */
export interface EidolonProgressionRow {
  level: number;
  hd: number;
  /** Flat natural-armor-type AC bonus (see module doc comment for why armor-vs-natural-armor isn't split). */
  armorBonus: number;
  /** Added to BOTH Strength and Dexterity. */
  strDexBonus: number;
  evolutionPool: number;
  /** Display-only cap on natural attacks — not enforced (see module doc comment). */
  maxAttacks: number;
  /** Display-only skill-point aggregate (`4 * hd` — see module doc comment). */
  skillPoints: number;
  /** Display-only bonus feats earned so far — no eidolon feat picker in v1 (matches `companion.ts`'s `bonusFeats`). */
  bonusFeats: number;
  /** Special abilities newly granted AT this level (not cumulative — see {@link eidolonSpecialAbilityNames}). */
  special: string[];
}

/**
 * Table: Eidolon Base Statistics (PF1 APG "Eidolon"), indexed by summoner
 * level 1–20. `hd`/BAB (`babForLevels("high", hd)`) and both saves
 * (`saveForLevels("high"|"low", hd)`) reproduce the published table exactly
 * (verified by hand against every row during authoring — see module doc
 * comment). `armorBonus`/`strDexBonus` verified against two independent
 * transcriptions of the table during authoring.
 */
export const EIDOLON_PROGRESSION: readonly EidolonProgressionRow[] = [
  {
    level: 1,
    hd: 1,
    armorBonus: 0,
    strDexBonus: 0,
    evolutionPool: 3,
    maxAttacks: 3,
    skillPoints: 4,
    bonusFeats: 1,
    special: ["Darkvision", "Link", "Share Spells"],
  },
  {
    level: 2,
    hd: 2,
    armorBonus: 2,
    strDexBonus: 1,
    evolutionPool: 4,
    maxAttacks: 3,
    skillPoints: 8,
    bonusFeats: 1,
    special: ["Evasion"],
  },
  {
    level: 3,
    hd: 3,
    armorBonus: 2,
    strDexBonus: 1,
    evolutionPool: 5,
    maxAttacks: 3,
    skillPoints: 12,
    bonusFeats: 2,
    special: [],
  },
  {
    level: 4,
    hd: 3,
    armorBonus: 2,
    strDexBonus: 1,
    evolutionPool: 7,
    maxAttacks: 4,
    skillPoints: 12,
    bonusFeats: 2,
    special: [],
  },
  {
    level: 5,
    hd: 4,
    armorBonus: 4,
    strDexBonus: 2,
    evolutionPool: 8,
    maxAttacks: 4,
    skillPoints: 16,
    bonusFeats: 2,
    special: [],
  },
  {
    level: 6,
    hd: 5,
    armorBonus: 4,
    strDexBonus: 2,
    evolutionPool: 9,
    maxAttacks: 4,
    skillPoints: 20,
    bonusFeats: 3,
    special: ["Devotion"],
  },
  {
    level: 7,
    hd: 6,
    armorBonus: 6,
    strDexBonus: 3,
    evolutionPool: 10,
    maxAttacks: 4,
    skillPoints: 24,
    bonusFeats: 3,
    special: [],
  },
  {
    level: 8,
    hd: 6,
    armorBonus: 6,
    strDexBonus: 3,
    evolutionPool: 11,
    maxAttacks: 4,
    skillPoints: 24,
    bonusFeats: 3,
    special: [],
  },
  {
    level: 9,
    hd: 7,
    armorBonus: 6,
    strDexBonus: 3,
    evolutionPool: 13,
    maxAttacks: 5,
    skillPoints: 28,
    bonusFeats: 4,
    special: ["Multiattack"],
  },
  {
    level: 10,
    hd: 8,
    armorBonus: 8,
    strDexBonus: 4,
    evolutionPool: 14,
    maxAttacks: 5,
    skillPoints: 32,
    bonusFeats: 4,
    special: [],
  },
  {
    level: 11,
    hd: 9,
    armorBonus: 8,
    strDexBonus: 4,
    evolutionPool: 15,
    maxAttacks: 5,
    skillPoints: 36,
    bonusFeats: 5,
    special: [],
  },
  {
    level: 12,
    hd: 9,
    armorBonus: 10,
    strDexBonus: 5,
    evolutionPool: 16,
    maxAttacks: 5,
    skillPoints: 36,
    bonusFeats: 5,
    special: [],
  },
  {
    level: 13,
    hd: 10,
    armorBonus: 10,
    strDexBonus: 5,
    evolutionPool: 17,
    maxAttacks: 5,
    skillPoints: 40,
    bonusFeats: 5,
    special: [],
  },
  {
    level: 14,
    hd: 11,
    armorBonus: 10,
    strDexBonus: 5,
    evolutionPool: 19,
    maxAttacks: 6,
    skillPoints: 44,
    bonusFeats: 6,
    special: ["Improved Evasion"],
  },
  {
    level: 15,
    hd: 12,
    armorBonus: 12,
    strDexBonus: 6,
    evolutionPool: 20,
    maxAttacks: 6,
    skillPoints: 48,
    bonusFeats: 6,
    special: [],
  },
  {
    level: 16,
    hd: 12,
    armorBonus: 12,
    strDexBonus: 6,
    evolutionPool: 21,
    maxAttacks: 6,
    skillPoints: 48,
    bonusFeats: 6,
    special: [],
  },
  {
    level: 17,
    hd: 13,
    armorBonus: 14,
    strDexBonus: 7,
    evolutionPool: 22,
    maxAttacks: 6,
    skillPoints: 52,
    bonusFeats: 7,
    special: [],
  },
  {
    level: 18,
    hd: 14,
    armorBonus: 14,
    strDexBonus: 7,
    evolutionPool: 23,
    maxAttacks: 6,
    skillPoints: 56,
    bonusFeats: 7,
    special: [],
  },
  {
    level: 19,
    hd: 15,
    armorBonus: 14,
    strDexBonus: 7,
    evolutionPool: 25,
    maxAttacks: 7,
    skillPoints: 60,
    bonusFeats: 8,
    special: [],
  },
  {
    level: 20,
    hd: 15,
    armorBonus: 16,
    strDexBonus: 8,
    evolutionPool: 26,
    maxAttacks: 7,
    skillPoints: 60,
    bonusFeats: 8,
    special: [],
  },
];

/** The progression row for `level`, clamped to [1, 20] (no summoner source below 1; the table caps at 20). */
export function eidolonProgressionRow(level: number): EidolonProgressionRow {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  return EIDOLON_PROGRESSION[clamped - 1]!;
}

/** Every special-ability name unlocked by `level` (cumulative — union of every row up to and including it). */
export function eidolonSpecialAbilityNames(level: number): string[] {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const names: string[] = [];
  for (let i = 0; i < clamped; i++) {
    names.push(...EIDOLON_PROGRESSION[i]!.special);
  }
  return names;
}

/** Display detail text for each one-time special ability an eidolon can have. */
export const EIDOLON_SPECIAL_ABILITY_DETAIL: Readonly<Record<string, string>> = {
  Darkvision: "Darkvision out to 60 feet.",
  Link: "The summoner can handle the eidolon as though it were an animal companion with the Link special ability.",
  "Share Spells":
    "The summoner may cast a spell targeting only herself on the eidolon instead (touch range).",
  Evasion: "On a Reflex save for half damage, the eidolon takes no damage on a success.",
  Devotion: "+4 morale bonus on Will saves against enchantment spells and effects.",
  Multiattack:
    "With 3+ natural attacks, the eidolon gains Multiattack as a bonus feat (not separately modeled numerically here).",
  "Improved Evasion":
    "The eidolon takes no damage on a successful Reflex save, half on a failed one.",
  /**
   * Unchained-only (5th/10th/15th, see `eidolon-unchained.ts`'s
   * `EIDOLON_UNCHAINED_SPECIAL_BY_LEVEL`) — the chained eidolon has no
   * automatic Ability Score Increase special at all (its "Ability Increase"
   * is a plain evolution pick instead), so this entry is only ever looked
   * up by the unchained branch.
   */
  "Ability Score Increase": "+1 to one ability score of the summoner's choice.",
};

/**
 * The summoner's effective level for eidolon purposes — the sum of
 * `summoner` (chained) and `summonerUnchained` class levels (see module doc
 * comment for why both draw from the SAME table in this v1 pass). Additive
 * multiclass stacking mirrors `companion.ts`'s `baseCompanionEffectiveLevel`
 * precedent for a character with more than one companion-granting source.
 */
export function eidolonSummonerLevel(doc: CharacterDoc): number {
  const summoner = doc.identity.classes.find((c) => c.tag === "summoner")?.level ?? 0;
  const unchained = doc.identity.classes.find((c) => c.tag === "summonerUnchained")?.level ?? 0;
  return summoner + unchained;
}

/** Which "kind" of numeric grant an evolution contributes — see module doc comment for the honesty-bar split. */
export type EidolonEvolutionKind = "ability" | "attack" | "armor" | "size" | "speed" | "display";

export interface EidolonSpeedGrant {
  mode: "climb" | "swim" | "fly" | "burrow";
  /** `"base"` = set to the eidolon's land speed (first pick only); `"half-base"` = burrow's fixed half-speed; a number = flat feet added per pick (repeatable modes). */
  amount: "base" | "half-base" | number;
}

export interface EidolonEvolutionDef {
  id: string;
  name: string;
  cost: number;
  kind: EidolonEvolutionKind;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** True if this evolution may be picked more than once (see `EidolonEvolutionPick`'s doc comment). */
  repeatable?: boolean;
  /** Earliest summoner level this evolution can be selected at — soft-noted only, never blocks. */
  minLevel?: number;
  /** Restricts to specific base forms — soft-noted only, never blocks (undefined = any form). */
  baseForms?: readonly string[];
  /** `kind: "attack"` grant. */
  attack?: EidolonAttackGrant;
  /** `kind: "armor"` grant — flat natural armor added per pick. */
  armorBonus?: number;
  /** `kind: "speed"` grant. */
  speed?: EidolonSpeedGrant;
  /** `kind: "ability"` grant — always +2 to the pick's `choice` ability (Ability Increase is the only structured ability evolution). */
  abilityBonus?: number;
}

const attackEvo = (
  id: string,
  name: string,
  cost: number,
  attack: EidolonAttackGrant,
  summary: string,
  extra: Partial<EidolonEvolutionDef> = {},
): EidolonEvolutionDef => ({ id, name, cost, kind: "attack", summary, attack, ...extra });

const displayEvo = (
  id: string,
  name: string,
  cost: number,
  summary: string,
  extra: Partial<EidolonEvolutionDef> = {},
): EidolonEvolutionDef => ({ id, name, cost, kind: "display", summary, ...extra });

const EVOLUTION_LIST: EidolonEvolutionDef[] = [
  // --- 1-point: structured -------------------------------------------------
  attackEvo(
    "bite",
    "Bite",
    1,
    { name: "Bite", count: 1, damageDice: "1d6" },
    "A primary bite attack (1d6, larger if the eidolon is Large+).",
  ),
  attackEvo(
    "claws",
    "Claws",
    1,
    { name: "Claw", count: 2, damageDice: "1d4" },
    "Two primary claw attacks (1d4 each). Requires Limbs (arms).",
  ),
  attackEvo(
    "hooves",
    "Hooves",
    1,
    { name: "Hoof", count: 2, damageDice: "1d4" },
    "Two secondary hoof attacks (1d4 each).",
  ),
  attackEvo(
    "pincers",
    "Pincers",
    1,
    { name: "Pincer", count: 2, damageDice: "1d6" },
    "Two secondary pincer attacks (1d6 each).",
  ),
  attackEvo(
    "slam",
    "Slam",
    1,
    { name: "Slam", count: 1, damageDice: "1d8" },
    "A primary slam attack (1d8).",
  ),
  attackEvo(
    "sting",
    "Sting",
    1,
    { name: "Sting", count: 1, damageDice: "1d4" },
    "A primary sting attack (1d4). Requires a tail.",
  ),
  attackEvo(
    "tail-slap",
    "Tail Slap",
    1,
    { name: "Tail slap", count: 1, damageDice: "1d6" },
    "A secondary tail slap attack (1d6). Requires a tail.",
  ),
  attackEvo(
    "tentacle",
    "Tentacle",
    1,
    { name: "Tentacle", count: 1, damageDice: "1d4" },
    "A secondary tentacle attack (1d4).",
    { repeatable: true },
  ),
  attackEvo(
    "wing-buffet",
    "Wing Buffet",
    1,
    { name: "Wing buffet", count: 2, damageDice: "1d4" },
    "Two secondary wing buffet attacks (1d4 each). Requires flight with wings.",
  ),
  {
    id: "improved-natural-armor",
    name: "Improved Natural Armor",
    cost: 1,
    kind: "armor",
    armorBonus: 2,
    repeatable: true,
    summary:
      "+2 natural armor bonus to AC. Can be taken once at 1st level and again at 5th, 10th, 15th, and 20th.",
  },
  {
    id: "climb",
    name: "Climb",
    cost: 1,
    kind: "speed",
    speed: { mode: "climb", amount: "base" },
    repeatable: true,
    summary: "A climb speed equal to base speed; each further pick adds +20 feet.",
  },
  {
    id: "swim",
    name: "Swim",
    cost: 1,
    kind: "speed",
    speed: { mode: "swim", amount: "base" },
    repeatable: true,
    summary: "A swim speed equal to base speed; each further pick adds +20 feet.",
  },
  displayEvo(
    "basic-magic",
    "Basic Magic",
    1,
    "A cantrip-level spell-like ability, usable at will. Requires Charisma 10+.",
  ),
  displayEvo("bleed", "Bleed", 1, "One attack type inflicts 1d6 bleed damage.", {
    repeatable: true,
  }),
  displayEvo("gills", "Gills", 1, "The eidolon can breathe underwater indefinitely."),
  displayEvo(
    "improved-damage",
    "Improved Damage",
    1,
    "One natural attack's damage die increases one step.",
    { repeatable: true },
  ),
  displayEvo(
    "limbs-arms",
    "Limbs (Arms)",
    1,
    "Grows a pair of arms, unlocking arm-based natural attacks (claws, pincers, slam).",
  ),
  {
    // No `speed` field — `deriveEidolon` special-cases this id directly
    // (adds +10 ft. of LAND speed per pick, not a new movement mode), unlike
    // every other `kind: "speed"` entry which grants a distinct mode.
    id: "limbs-legs",
    name: "Limbs (Legs)",
    cost: 1,
    kind: "speed",
    repeatable: true,
    summary: "Grows a pair of legs, adding +10 feet of land speed.",
  },
  displayEvo(
    "low-light-vision",
    "Low-Light Vision",
    1,
    "Sees twice as far as a human in dim light.",
  ),
  displayEvo(
    "magic-attacks",
    "Magic Attacks",
    1,
    "Natural attacks count as magic for overcoming damage reduction.",
  ),
  displayEvo(
    "mount",
    "Mount",
    1,
    "The eidolon can be ridden — must be at least one size larger than its rider.",
    {
      baseForms: ["quadruped", "serpentine"],
    },
  ),
  displayEvo("pounce", "Pounce", 1, "Can make a full attack after a charge.", {
    baseForms: ["quadruped"],
  }),
  displayEvo(
    "pull",
    "Pull",
    1,
    "A successful attack allows a free CMB check to pull the target 5 feet closer. Requires 10+ feet of reach.",
  ),
  displayEvo(
    "push",
    "Push",
    1,
    "A successful attack allows a free CMB check to push the target 5 feet away.",
  ),
  displayEvo("reach", "Reach", 1, "Increases one natural attack's reach by 5 feet."),
  displayEvo(
    "resistance",
    "Resistance",
    1,
    "Energy resistance 5 against one chosen energy type; scales with summoner level.",
    {
      repeatable: true,
    },
  ),
  displayEvo(
    "scent",
    "Scent",
    1,
    "Gains the scent ability (30 ft., 60 ft. upwind, 15 ft. downwind).",
  ),
  displayEvo(
    "shared-evolution",
    "Shared Evolution",
    1,
    "Transfers a 1- or 2-point evolution to the summoner as an aspect. Requires a twinned eidolon.",
  ),
  displayEvo(
    "skilled",
    "Skilled",
    1,
    "+8 racial bonus on one chosen skill (not distributed to a specific eidolon skill here).",
    {
      repeatable: true,
    },
  ),
  displayEvo(
    "slippery",
    "Slippery",
    1,
    "+4 bonus to CMD and Escape Artist checks against grapples.",
  ),
  displayEvo("sticky", "Sticky", 1, "+4 bonus on CMB checks to start or maintain a grapple."),
  displayEvo(
    "tail",
    "Tail",
    1,
    "+2 racial bonus on Acrobatics checks to balance; grants a tail for tail-based evolutions.",
    {
      repeatable: true,
    },
  ),
  displayEvo(
    "unnatural-aura",
    "Unnatural Aura",
    1,
    "Normal animals refuse to approach within 30 feet unless they succeed at a DC 25 check.",
  ),
  // --- 2-point ---------------------------------------------------------------
  {
    id: "ability-increase",
    name: "Ability Increase",
    cost: 2,
    kind: "ability",
    abilityBonus: 2,
    repeatable: true,
    summary:
      "+2 to one ability score. Can only apply to a given ability once, plus one additional time for every 6 summoner levels.",
  },
  attackEvo(
    "gore",
    "Gore",
    2,
    { name: "Gore", count: 1, damageDice: "1d6" },
    "A primary gore attack (1d6).",
  ),
  {
    id: "flight",
    name: "Flight",
    cost: 2,
    kind: "speed",
    speed: { mode: "fly", amount: "base" },
    summary:
      "A fly speed equal to base speed (average maneuverability). Upgradeable to perfect maneuverability or faster flight.",
  },
  displayEvo(
    "alignment-smite",
    "Alignment Smite",
    2,
    "Once per day, deal +1d6 damage against an opposed-alignment target. Requires 5th level; good-aligned only.",
    {
      minLevel: 5,
      repeatable: true,
    },
  ),
  displayEvo(
    "channel-resistance",
    "Channel Resistance",
    2,
    "+2 bonus against channel energy effects. Requires the Undead Appearance evolution.",
  ),
  displayEvo(
    "constrict",
    "Constrict",
    2,
    "A grabbed foe takes extra damage equal to the grab attack's own damage.",
    {
      baseForms: ["serpentine"],
    },
  ),
  displayEvo(
    "energy-attacks",
    "Energy Attacks",
    2,
    "Natural attacks deal +1d6 of one chosen energy type. Requires 5th level.",
    {
      minLevel: 5,
    },
  ),
  displayEvo(
    "extra-feat",
    "Extra Feat",
    2,
    "A bonus feat, if prerequisites are met. Requires a twinned eidolon.",
  ),
  displayEvo(
    "grab",
    "Grab",
    2,
    "A chosen attack allows a free grapple CMB check on a hit, with a +4 bonus.",
  ),
  displayEvo(
    "head",
    "Head",
    2,
    "Grows an additional head, unlocking further head-based evolutions.",
    { repeatable: true },
  ),
  displayEvo("immunity", "Immunity", 2, "Immunity to one chosen energy type. Requires 7th level.", {
    minLevel: 7,
  }),
  displayEvo(
    "keen-scent",
    "Keen Scent",
    2,
    "Detects blood at up to a mile and creatures by scent underwater. Requires Gills and Scent.",
  ),
  displayEvo("limbs", "Limbs (extra pair)", 2, "An additional pair of limbs, as arms or legs.", {
    repeatable: true,
  }),
  displayEvo(
    "minor-magic",
    "Minor Magic",
    2,
    "A 1st-level spell-like ability, usable once daily. Requires Charisma 11+, Basic Magic, and 4th level.",
    {
      minLevel: 4,
    },
  ),
  displayEvo(
    "poison",
    "Poison",
    2,
    "A bite or sting attack inflicts poison (1d4 Str damage, upgradeable). Requires 7th level.",
    {
      minLevel: 7,
    },
  ),
  displayEvo(
    "rake",
    "Rake",
    2,
    "Two primary rake attacks (1d4) while grappling. Requires 4th level.",
    {
      baseForms: ["quadruped"],
      minLevel: 4,
    },
  ),
  displayEvo(
    "rend",
    "Rend",
    2,
    "Two successful claw hits deal extra damage. Requires Claws and 6th level.",
    { minLevel: 6 },
  ),
  displayEvo(
    "rider-bond",
    "Rider Bond",
    2,
    "Ride check bonus equal to half summoner level, plus Mounted Combat. Requires Mount.",
  ),
  displayEvo(
    "shadow-blend",
    "Shadow Blend",
    2,
    "20% concealment (50% with Shadow Form) in non-bright light, toggleable.",
  ),
  displayEvo(
    "shadow-form",
    "Shadow Form",
    2,
    "Constant 20% concealment; can affect incorporeal creatures; melee vs. corporeal targets deals half damage.",
  ),
  displayEvo(
    "shared-slot",
    "Shared Slot",
    2,
    "A magic item slot can be occupied by both summoner and eidolon simultaneously. Requires a twinned eidolon.",
    {
      repeatable: true,
    },
  ),
  displayEvo(
    "sickening",
    "Sickening",
    2,
    "Living creatures within 20 feet must save or be sickened (immune for 24 hours after a save).",
  ),
  displayEvo(
    "trample",
    "Trample",
    2,
    "A full-round action to overrun smaller creatures (1d6 damage).",
    {
      baseForms: ["biped", "quadruped"],
    },
  ),
  displayEvo("tremorsense", "Tremorsense", 2, "Tremorsense out to 30 feet. Requires 7th level.", {
    minLevel: 7,
  }),
  displayEvo(
    "trip",
    "Trip",
    2,
    "The bite attack allows a free trip CMB check on a hit. Requires Bite.",
  ),
  displayEvo(
    "undead-appearance",
    "Undead Appearance",
    2,
    "Heals from negative energy, harmed by positive; +2 on several saves. Upgradeable.",
  ),
  displayEvo(
    "weapon-training",
    "Weapon Training",
    2,
    "Simple Weapon Proficiency; upgradeable to martial for 2 more points.",
  ),
  // --- 3-point -----------------------------------------------------------
  displayEvo(
    "blindsense",
    "Blindsense",
    3,
    "Pinpoints unseen creatures within 30 feet without a Perception check. Requires 9th level.",
    {
      minLevel: 9,
    },
  ),
  {
    id: "burrow",
    name: "Burrow",
    cost: 3,
    kind: "speed",
    speed: { mode: "burrow", amount: "half-base" },
    minLevel: 9,
    summary:
      "A burrow speed equal to half base speed, leaving no tunnel behind. Requires 9th level.",
  },
  displayEvo(
    "celestial-appearance",
    "Celestial Appearance",
    3,
    "Appears celestial; +2 on several saves; SR 5+HD vs. evil spells. Good-aligned summoner only.",
  ),
  displayEvo(
    "damage-reduction",
    "Damage Reduction",
    3,
    "DR 5, bypassed by a chosen opposing alignment type. Requires 9th level.",
    {
      minLevel: 9,
    },
  ),
  displayEvo(
    "fiendish-appearance",
    "Fiendish Appearance",
    3,
    "Appears fiendish; +2 on several saves; SR 5+HD vs. good spells. Evil-aligned summoner only.",
  ),
  displayEvo(
    "frightful-presence",
    "Frightful Presence",
    3,
    "Attacking triggers a fear save in nearby foes. Requires 11th level.",
    {
      minLevel: 11,
    },
  ),
  displayEvo(
    "major-magic",
    "Major Magic",
    3,
    "A 2nd-level spell-like ability, usable once daily. Requires Charisma 12+, Minor Magic, and 7th level.",
    {
      minLevel: 7,
      repeatable: true,
    },
  ),
  displayEvo(
    "sacrifice",
    "Sacrifice",
    3,
    "As a standard action, sacrifice HP to heal a touched creature for half that amount.",
  ),
  displayEvo(
    "see-in-darkness",
    "See in Darkness",
    3,
    "Sees perfectly in any darkness, including magical darkness. Requires 9th level.",
    {
      minLevel: 9,
    },
  ),
  displayEvo(
    "swallow-whole",
    "Swallow Whole",
    3,
    "A grabbed, smaller creature can be swallowed whole. Requires Grab (bite) and 9th level.",
    {
      minLevel: 9,
    },
  ),
  displayEvo(
    "web",
    "Web",
    3,
    "A ranged touch web attack, usable 8/day. Requires Climb and 7th level.",
    { minLevel: 7 },
  ),
  // --- 4-point -------------------------------------------------------------
  {
    id: "large",
    name: "Large",
    cost: 4,
    kind: "size",
    minLevel: 8,
    summary:
      "Grows to Large: +8 Str, +4 Con, −2 Dex, +2 natural armor, and (Biped only) +5 feet of reach. Requires Medium size and 8th level.",
  },
  displayEvo(
    "blindsight",
    "Blindsight",
    4,
    "Full blindsight within 30 feet. Requires Blindsense and 11th level.",
    { minLevel: 11 },
  ),
  displayEvo(
    "breath-weapon",
    "Breath Weapon",
    4,
    "A cone or line breath weapon, usable once daily (upgradeable). Requires 9th level.",
    {
      minLevel: 9,
    },
  ),
  displayEvo(
    "dimension-door",
    "Dimension Door",
    4,
    "Casts dimension door once daily. Requires Charisma 14+ and 13th level.",
    {
      minLevel: 13,
    },
  ),
  displayEvo(
    "fast-healing",
    "Fast Healing",
    4,
    "Fast healing 1/round (upgradeable). Requires 11th level; doesn't function off-plane.",
    {
      minLevel: 11,
    },
  ),
  displayEvo(
    "incorporeal-form",
    "Incorporeal Form",
    4,
    "Becomes incorporeal for 1 round/summoner level, once daily. Requires 15th level.",
    {
      minLevel: 15,
    },
  ),
  displayEvo(
    "lifesense",
    "Lifesense",
    4,
    "Detects living creatures within 60 feet. Requires Undead Appearance and 11th level.",
    {
      minLevel: 11,
    },
  ),
  displayEvo(
    "no-breath",
    "No Breath",
    4,
    "Doesn't need to breathe; immune to breath-dependent effects. Requires 11th level.",
    {
      minLevel: 11,
    },
  ),
  displayEvo(
    "spell-resistance",
    "Spell Resistance",
    4,
    "SR = 11 + summoner level (except the summoner's own spells). Requires 9th level.",
    {
      minLevel: 9,
    },
  ),
  displayEvo(
    "ultimate-magic",
    "Ultimate Magic",
    4,
    "A 3rd-level spell-like ability, usable once daily. Requires Charisma 13+, Major Magic, and 11th level.",
    {
      minLevel: 11,
      repeatable: true,
    },
  ),
];

export const EIDOLON_EVOLUTIONS: Readonly<Record<string, EidolonEvolutionDef>> = Object.fromEntries(
  EVOLUTION_LIST.map((e) => [e.id, e]),
);

/** All evolution ids, for the builder's picker. */
export const EIDOLON_EVOLUTION_IDS: readonly string[] = EVOLUTION_LIST.map((e) => e.id);

export interface DerivedEidolonSkill {
  id: string;
  ability: AbilityId;
  total: number;
  components: ModifierComponent[];
}

export interface DerivedEidolonAttack {
  name: string;
  count: number;
  attack: number;
  damageDice: string;
  damageBonus: number;
  /** Primary (full BAB+Str) or secondary (−5/−2 with Multiattack, half Str) — see `natural-attacks.ts`. */
  attackType: NaturalAttackType;
}

export interface DerivedEidolonAc {
  normal: number;
  touch: number;
  flatFooted: number;
  components: ModifierComponent[];
}

/** The full derived stat block for a tracked eidolon (`build.eidolon`). */
export interface DerivedEidolon {
  baseFormId: string;
  baseFormName: string;
  name: string;
  size: SizeId;
  /** The summoner's effective level for eidolon purposes (see {@link eidolonSummonerLevel}). */
  level: number;
  hd: number;
  abilities: Record<AbilityId, { score: number; mod: number }>;
  hp: { max: number; current: number; nonlethal: number };
  init: number;
  speeds: Record<string, number>;
  ac: DerivedEidolonAc;
  saves: { fort: number; ref: number; will: number };
  bab: number;
  cmb: number;
  cmd: number;
  attacks: DerivedEidolonAttack[];
  skills: Record<string, DerivedEidolonSkill>;
  naturalArmor: number;
  /** Evolution points spent so far (sum of chosen evolutions' `cost`) — free subtype/base-form grants never count here (see `eidolon-unchained.ts`). */
  evolutionPointsSpent: number;
  /** Evolution points available at this level — variant-aware (chained: `eidolonProgressionRow(level).evolutionPool`; unchained: `eidolonUnchainedProgressionRow(level).evolutionPool` plus any unlocked subtype `poolBonus` grants). */
  evolutionPointsAvailable: number;
  /** Display-only skill-point aggregate (see module doc comment). */
  skillPoints: number;
  /** Display-only bonus feats earned so far. */
  bonusFeats: number;
  /** Display-only cap on natural attacks (not enforced). */
  maxAttacks: number;
  /** One-time special abilities unlocked so far (Darkvision, Link, Share Spells, Evasion, Devotion, Multiattack, Improved Evasion). */
  specialAbilities: { name: string; detail: string }[];
  /** Display-only chip names for the evolutions this base form grants for free. */
  freeEvolutionNames: readonly string[];
  /** Every chosen evolution, resolved to its definition (unresolved ids from `build.eidolon.evolutions` are skipped). */
  chosenEvolutions: { id: string; name: string; cost: number; choice?: string }[];
  /** "chained" (APG) or "unchained" (Pathfinder Unchained) — see `eidolonVariant`. */
  variant: "chained" | "unchained";
  /** The chosen subtype id (key into `EIDOLON_SUBTYPES`), when recognized. Always `undefined` for a chained eidolon (subtype is unchained-only). */
  subtypeId?: string;
  /** The subtype's display name, when resolved. */
  subtypeName?: string;
  /** The subtype's alignment requirement, human-readable, for a soft warning (see `eidolon-unchained.ts` — never enforced here). */
  subtypeAlignmentText?: string;
  /** Every themed grant the subtype offers (1st/4th/8th/12th/16th/20th), each with an `unlocked` flag so the UI can show upcoming ones grayed out. Empty for a chained eidolon or when no subtype is set. */
  grantedEvolutions: { level: number; note: string; unlocked: boolean }[];
  /** Automatic Ability Score Increase slots earned so far (unchained 5th/10th/15th — see `eidolon-unchained.ts`). Always 0 for a chained eidolon, which has no automatic ASI slots at all. */
  abilityIncreaseSlots: number;
}

/** A skeletal minimal skills set surfaced for an eidolon — the six physical/perceptual skills every companion-style creature in this codebase surfaces, plus any "Skilled" evolution chip note is left to the UI (see module doc comment). */
const EIDOLON_SKILLS: readonly string[] = ["acr", "clm", "fly", "per", "ste", "swm"];

/** AC bucket membership mirroring `compute.ts`'s (duplicated locally — compute.ts's are private, same posture as `companion.ts`/`phantom.ts`). */
const TOUCH_CATEGORIES: ReadonlySet<string> = new Set([
  "base",
  "dex",
  "size",
  "dodge",
  "deflection",
  "generic",
]);
const FLAT_FOOTED_CATEGORIES: ReadonlySet<string> = new Set([
  "base",
  "armor",
  "shield",
  "natural",
  "size",
  "deflection",
  "generic",
]);

/**
 * Mutable accumulator for the numeric effect of one evolution — shared
 * between a paid build pick (`EidolonEvolutionPick`) and a FREE subtype/
 * base-form grant (unchained only, `eidolon-unchained.ts`), both processed
 * through {@link applyEvolutionEffect}'s identical `EidolonEvolutionDef.kind`
 * switch so the two paths can never numerically diverge.
 */
interface EvolutionAccumulator {
  abilityBonus: Record<AbilityId, number>;
  naturalArmorBonus: number;
  isLarge: boolean;
  attacks: EidolonAttackGrant[];
  climbPicks: number;
  swimPicks: number;
  hasFlight: boolean;
  hasBurrow: boolean;
  legPairs: number;
}

function newEvolutionAccumulator(): EvolutionAccumulator {
  return {
    abilityBonus: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    naturalArmorBonus: 0,
    isLarge: false,
    attacks: [],
    climbPicks: 0,
    swimPicks: 0,
    hasFlight: false,
    hasBurrow: false,
    legPairs: 0,
  };
}

/**
 * Apply one evolution's numeric effect onto `acc` — `choice` (an
 * `EidolonEvolutionPick.choice`) only matters for `kind: "ability"`; a free
 * grant with no per-pick target (subtype grants target ability increases
 * through their OWN `subtypeGrantChoices` mechanism, not this one) omits it.
 */
function applyEvolutionEffect(
  acc: EvolutionAccumulator,
  def: EidolonEvolutionDef,
  choice?: string,
): void {
  switch (def.kind) {
    case "ability": {
      const ability = ABILITY_IDS.includes(choice as AbilityId) ? (choice as AbilityId) : "str";
      acc.abilityBonus[ability] += def.abilityBonus ?? 0;
      break;
    }
    case "armor":
      acc.naturalArmorBonus += def.armorBonus ?? 0;
      break;
    case "size":
      acc.isLarge = true;
      break;
    case "attack":
      if (def.attack) acc.attacks.push(def.attack);
      break;
    case "speed":
      if (def.id === "limbs-legs") acc.legPairs += 1;
      else if (def.speed?.mode === "climb") acc.climbPicks += 1;
      else if (def.speed?.mode === "swim") acc.swimPicks += 1;
      else if (def.speed?.mode === "fly") acc.hasFlight = true;
      else if (def.speed?.mode === "burrow") acc.hasBurrow = true;
      break;
    case "display":
      break;
  }
}

/**
 * Derive the tracked eidolon's full stat block, or `undefined` when the
 * document has no `build.eidolon`, its `baseForm` isn't in
 * {@link EIDOLON_BASE_FORMS}, or the summoner's effective level
 * (`eidolonSummonerLevel`) is 0 — soft-warning posture, never a crash; the
 * UI simply shows nothing.
 *
 * Like a companion or phantom, the eidolon has its OWN Hit Dice/BAB/saves —
 * `rollData` is needed only to evaluate any shared buffs' formulas
 * (`live.eidolon.sharedBuffIds`), exactly like `deriveCompanion`/
 * `derivePhantom`'s buff-sharing routing (see `shared-creature-buffs.ts`).
 *
 * `hasWeaponFinesse` switches the attack roll (never damage) from Str to Dex
 * — see module doc comment's attack bullet — and is resolved by the CALLER
 * the same way `deriveCompanion`'s is, defaulting to `false`.
 */
export function deriveEidolon(
  doc: CharacterDoc,
  rollData: RollData,
  hasWeaponFinesse = false,
): DerivedEidolon | undefined {
  const build = doc.build.eidolon;
  if (!build) return undefined;
  const form = EIDOLON_BASE_FORMS[build.baseForm];
  if (!form) return undefined;

  const level = eidolonSummonerLevel(doc);
  if (level <= 0) return undefined;

  // --- variant + subtype resolution (see `eidolon-unchained.ts`'s module
  // doc comment for the "unchained iff summonerUnchained-only" edge-case
  // call) — `row` below carries the RIGHT evolutionPool/special columns for
  // either variant; every other column is identical between the two tables --
  const variant = eidolonVariant(doc);
  const row =
    variant === "unchained" ? eidolonUnchainedProgressionRow(level) : eidolonProgressionRow(level);
  const hd = row.hd;
  const bab = babForLevels("high", hd);

  const subtypeId = variant === "unchained" ? build.subtype : undefined;
  const subtype = subtypeId ? EIDOLON_SUBTYPES[subtypeId] : undefined;
  const subtypeForm = subtype?.baseForms[build.baseForm];

  const picks = build.evolutions ?? [];
  const chosenEvolutions: { id: string; name: string; cost: number; choice?: string }[] = [];
  let evolutionPointsSpent = 0;
  const acc = newEvolutionAccumulator();

  for (const pick of picks) {
    const def = EIDOLON_EVOLUTIONS[pick.id];
    if (!def) continue;
    evolutionPointsSpent += def.cost;
    chosenEvolutions.push({ id: def.id, name: def.name, cost: def.cost, choice: pick.choice });
    applyEvolutionEffect(acc, def, pick.choice);
  }

  // --- unchained only: the subtype's own themed grants (evolutionIds/
  // poolBonus/abilityIncrease/landSpeedBonus) and the base form's structured
  // free evolutions, applied at ZERO pool cost through the exact same
  // `applyEvolutionEffect` switch as a paid pick above — free evolutions
  // never touch `evolutionPointsSpent`/`chosenEvolutions` (see module doc
  // comment's honesty-bar note) ------------------------------------------
  let subtypePoolBonus = 0;
  let subtypeLandSpeedBonus = 0;
  if (subtype) {
    for (const grant of subtype.grants) {
      if (grant.level > level) continue;
      subtypePoolBonus += grant.poolBonus ?? 0;
      subtypeLandSpeedBonus += grant.landSpeedBonus ?? 0;
      if (grant.abilityIncrease) {
        const choice = build.subtypeGrantChoices?.[String(grant.level)] ?? "str";
        acc.abilityBonus[choice] += 2;
      }
      for (const id of grant.evolutionIds ?? []) {
        const evoDef = EIDOLON_EVOLUTIONS[id];
        if (evoDef) applyEvolutionEffect(acc, evoDef);
      }
    }
  }
  for (const id of subtypeForm?.freeEvolutionIds ?? []) {
    const evoDef = EIDOLON_EVOLUTIONS[id];
    if (evoDef) applyEvolutionEffect(acc, evoDef);
  }

  // --- unchained only: automatic Ability Score Increase slots (5th/10th/
  // 15th) — the chained eidolon has NO automatic ASI slots at all (its own
  // "Ability Increase" is just one more evolution pick, see module doc
  // comment), so this is always 0 for a chained derivation --------------
  const abilityIncreaseSlots =
    variant === "unchained" ? eidolonUnchainedAbilityIncreaseSlots(level) : 0;
  const chosenAbilityIncreases = (build.abilityIncreases ?? []).slice(0, abilityIncreaseSlots);
  for (let i = 0; i < abilityIncreaseSlots; i++) {
    const ability = chosenAbilityIncreases[i] ?? "str";
    acc.abilityBonus[ability] += 1;
  }

  // --- ability scores: starting scores (form + universal, or the player's own
  // `baseAbilities` override) + table strDexBonus (both Str and Dex) + Large's
  // fixed deltas + evolution picks --------------------------------------
  const largeDelta: Record<AbilityId, number> = acc.isLarge
    ? { str: 8, dex: -2, con: 4, int: 0, wis: 0, cha: 0 }
    : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

  const start = eidolonStartingAbilities(build.baseForm, build.baseAbilities);

  const baseStr = start.str + row.strDexBonus + largeDelta.str + acc.abilityBonus.str;
  const baseDex = start.dex + row.strDexBonus + largeDelta.dex + acc.abilityBonus.dex;
  const baseCon = start.con + largeDelta.con + acc.abilityBonus.con;
  const baseInt = start.int + acc.abilityBonus.int;
  const baseWis = start.wis + acc.abilityBonus.wis;
  const baseCha = start.cha + acc.abilityBonus.cha;

  let abilities: Record<AbilityId, { score: number; mod: number }> = {
    str: { score: baseStr, mod: abilityMod(baseStr) },
    dex: { score: baseDex, mod: abilityMod(baseDex) },
    con: { score: baseCon, mod: abilityMod(baseCon) },
    int: { score: baseInt, mod: abilityMod(baseInt) },
    wis: { score: baseWis, mod: abilityMod(baseWis) },
    cha: { score: baseCha, mod: abilityMod(baseCha) },
  };

  const size: SizeId = acc.isLarge ? "lg" : "med";
  const sizeAcMod = SIZE_AC_MOD[size];

  // --- shared buffs: evaluate + bucket by target (mirrors companion.ts/phantom.ts) --
  const sharedIds = new Set(doc.live.eidolon?.sharedBuffIds ?? []);
  const sharedBuffs = (doc.live.activeBuffs ?? []).filter((b) => sharedIds.has(b.instanceId));

  // --- the eidolon's OWN active conditions: reshaped as synthetic ActiveBuffs
  // so `routeSharedBuffs` applies their Change[] through the exact same
  // typed-stacking pipeline as a shared buff — see `companion.ts`'s doc comment.
  const conditionBuffs: ActiveBuff[] = (doc.live.eidolon?.conditions ?? [])
    .map((id) => CONDITIONS[id])
    .filter((c): c is NonNullable<typeof c> => c != null && c.changes.length > 0)
    .map((c) => ({ instanceId: `condition:${c.id}`, name: c.name, changes: c.changes }));

  const routed = routeSharedBuffs([...sharedBuffs, ...conditionBuffs], rollData);

  abilities = applySharedAbilityBonuses(abilities, routed.ability, abilityMod);
  const strMod = abilities.str.mod;
  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;

  // --- HP: PF1 RAW average-per-HD (d10: 5.5/HD, rounded down) + Con mod/HD, min 1/HD ---
  const avgHpBeforeCon = Math.floor(5.5 * hd);
  const hpMax = Math.max(hd, avgHpBeforeCon + conMod * hd);

  // --- speeds: form base + limbs-legs land bonus + subtype land-speed bonus
  // (e.g. Fire Elemental's +20 ft. at 8th, unchained only) + climb/swim/fly/
  // burrow evolutions, all derived off the resulting land speed -----------
  const landSpeed = (form.speeds.land ?? 0) + acc.legPairs * 10 + subtypeLandSpeedBonus;
  const speeds: Record<string, number> = { land: landSpeed };
  if (form.speeds.climb) speeds.climb = form.speeds.climb;
  if (acc.climbPicks > 0) speeds.climb = landSpeed + 20 * (acc.climbPicks - 1);
  if (acc.swimPicks > 0) speeds.swim = landSpeed + 20 * (acc.swimPicks - 1);
  if (acc.hasFlight) speeds.fly = landSpeed;
  if (acc.hasBurrow) speeds.burrow = Math.floor(landSpeed / 2);

  // --- AC: unchained base forms grant a flat +2 natural armor the chained
  // forms don't (see `eidolon-unchained.ts`'s module doc comment) ---------
  const unchainedFormArmorBonus = variant === "unchained" ? 2 : 0;
  const naturalArmor =
    unchainedFormArmorBonus + row.armorBonus + acc.naturalArmorBonus + (acc.isLarge ? 2 : 0);
  const acCandidates: AcCandidate[] = [
    { category: "base", type: "base", value: 10, source: "Base" },
    { category: "dex", type: "untyped", value: dexMod, source: "Dexterity" },
    ...(naturalArmor !== 0
      ? [{ category: "natural", type: "untyped", value: naturalArmor, source: "Natural armor" }]
      : []),
    ...(sizeAcMod !== 0
      ? [{ category: "size", type: "size", value: sizeAcMod, source: "Size" }]
      : []),
    ...routed.ac,
  ];
  const acGroups = new Map<string, AcCandidate[]>();
  for (const c of acCandidates) {
    const arr = acGroups.get(c.category);
    if (arr) arr.push(c);
    else acGroups.set(c.category, [c]);
  }
  let acNormal = 0;
  let acTouch = 0;
  let acFlatFooted = 0;
  const acComponents: ModifierComponent[] = [];
  for (const [category, group] of acGroups) {
    const stack = resolveStack(group);
    for (const m of stack.modifiers) {
      acComponents.push({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
      });
      if (!m.applied) continue;
      acNormal += m.value;
      if (TOUCH_CATEGORIES.has(category)) acTouch += m.value;
      if (FLAT_FOOTED_CATEGORIES.has(category)) acFlatFooted += m.value;
    }
  }

  // --- saves: two good (by base form), one poor -------------------------------
  const goodSaves = new Set(form.goodSaves);
  const saves = {
    fort:
      saveForLevels(goodSaves.has("fort") ? "high" : "low", hd) +
      conMod +
      resolveStack(routed.fort).total,
    ref:
      saveForLevels(goodSaves.has("ref") ? "high" : "low", hd) +
      dexMod +
      resolveStack(routed.ref).total,
    will:
      saveForLevels(goodSaves.has("will") ? "high" : "low", hd) +
      abilities.wis.mod +
      resolveStack(routed.will).total,
  };

  // --- CMB/CMD ------------------------------------------------------------------
  const sizeSpecial = specialSizeMod(size);
  const cmb = bab + strMod + sizeSpecial;
  const cmd = 10 + bab + strMod + dexMod + sizeSpecial;

  // --- special abilities: variant-aware cumulative list (see
  // `eidolon-unchained.ts`'s doc comment for why the unchained one, unlike
  // chained/companion/phantom, deliberately KEEPS "Ability Score Increase") --
  const specialAbilityNames =
    variant === "unchained"
      ? eidolonUnchainedSpecialAbilityNames(level)
      : eidolonSpecialAbilityNames(level);

  // --- attacks: the SUBTYPE's own attack list when one is set and models
  // the chosen base form (unchained only); otherwise the chained form's
  // free attacks — never undefined just because no subtype is picked (see
  // `eidolon-unchained.ts`'s module doc comment) — plus evolution attacks,
  // eidolon's own BAB + Str (or Dex with Weapon Finesse) + size + shared
  // bonus, with primary/secondary natural-attack math — see
  // `natural-attacks.ts`. Multiattack (unlocked at 9th, see module doc
  // comment) softens the secondary penalty from −5 to −2.
  const hasMultiattack = specialAbilityNames.includes("Multiattack");
  const sharedAttackBonus = resolveStack(routed.attack).total;
  const sharedDamageBonus = resolveStack(routed.damage).total;
  const attackAbilityMod = hasWeaponFinesse ? dexMod : strMod;
  const baseAttackBonus = bab + attackAbilityMod + sizeAcMod + sharedAttackBonus;
  const baseAttacksForVariant = subtypeForm ? subtypeForm.attacks : form.baseAttacks;
  const allAttacks = [...baseAttacksForVariant, ...acc.attacks];
  const classifiedAttacks = classifyNaturalAttacks(allAttacks);
  const attacks: DerivedEidolonAttack[] = classifiedAttacks.map((a) => ({
    name: a.name,
    count: a.count,
    attack: naturalAttackBonus(baseAttackBonus, a.attackType, hasMultiattack),
    damageDice: a.damageDice,
    damageBonus:
      naturalAttackDamageBonus(strMod, a.attackType, a.strMultiplier) + sharedDamageBonus,
    attackType: a.attackType,
  }));

  // --- skills: six physical/perceptual skills, no rank investment modeled -----
  // (see module doc comment — an eidolon has ALL skills as class skills, out of
  // scope for a full per-skill picker in v1; matches `companion.ts`'s posture).
  const hasClimbSpeed = speeds.climb !== undefined;
  const hasSwimSpeed = speeds.swim !== undefined;
  const skills: Record<string, DerivedEidolonSkill> = {};
  for (const id of EIDOLON_SKILLS) {
    let ability: AbilityId = SKILL_ABILITY[id] ?? "dex";
    if (id === "clm" && hasClimbSpeed) ability = "dex";
    if (id === "swm" && hasSwimSpeed) ability = "dex";
    const abilityModVal = abilities[ability].mod;

    let racial = 0;
    if (id === "clm" && hasClimbSpeed) racial += 8;
    if (id === "swm" && hasSwimSpeed) racial += 8;

    const miscStack = resolveStack([...(routed.skill.get(id) ?? []), ...routed.skillsGlobal]);
    const components: ModifierComponent[] = [];
    if (racial !== 0)
      components.push({ source: "Racial", type: "racial", value: racial, applied: true });
    components.push(
      ...miscStack.modifiers.map((m) => ({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
      })),
    );

    skills[id] = {
      id,
      ability,
      total: abilityModVal + racial + miscStack.total,
      components,
    };
  }

  return {
    baseFormId: build.baseForm,
    baseFormName: form.name,
    name: build.name,
    size,
    level,
    hd,
    abilities,
    hp: {
      max: hpMax,
      current: hpMax - (doc.live.eidolon?.damage ?? 0),
      nonlethal: doc.live.eidolon?.nonlethal ?? 0,
    },
    init: dexMod + resolveStack(routed.init).total,
    speeds: applySharedSpeeds(speeds, routed.speed),
    ac: { normal: acNormal, touch: acTouch, flatFooted: acFlatFooted, components: acComponents },
    saves,
    bab,
    cmb,
    cmd,
    attacks,
    skills,
    naturalArmor,
    evolutionPointsSpent,
    evolutionPointsAvailable: row.evolutionPool + subtypePoolBonus,
    skillPoints: row.skillPoints,
    bonusFeats: row.bonusFeats,
    maxAttacks: row.maxAttacks,
    specialAbilities: specialAbilityNames.map((name) => ({
      name,
      detail: EIDOLON_SPECIAL_ABILITY_DETAIL[name] ?? "",
    })),
    freeEvolutionNames: subtypeForm?.freeNames ?? form.freeEvolutionNames,
    chosenEvolutions,
    variant,
    subtypeId,
    subtypeName: subtype?.name,
    subtypeAlignmentText: subtype?.alignmentText,
    grantedEvolutions: eidolonSubtypeGrantedEvolutions(subtypeId, level),
    abilityIncreaseSlots,
  };
}
