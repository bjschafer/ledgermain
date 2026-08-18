/**
 * Tracked familiars (`CharacterDoc.build.familiar`) — the familiar as its OWN
 * trackable creature (AC/saves/attacks/skills), distinct from `familiars.ts`
 * (which only models the small always-on bonus a familiar grants its
 * MASTER). Clean-room from the published PF1 rules — the "Familiars" rules
 * (base stats: half master's HP, master's BAB, better-of saves/skills, the
 * master-level progression table) and the individual Bestiary "Animals"
 * entries this module's `BASE_FAMILIARS` table is drawn from (verified
 * against d20pfsrd.com during authoring; no Foundry source was consulted —
 * see DESIGN §6). Foundry's GPL system code is never used as anything but a
 * behavioral oracle in tests, per the repo's clean-room discipline.
 *
 * Familiar Basics (PF1 CRB / Bestiary "Familiars"):
 *   - HP: half the master's total hit points, rounded down.
 *   - BAB: the master's, as calculated from all his classes.
 *   - Saves: for each save, the BETTER of the familiar's own base save bonus
 *     (Fort +2, Ref +2, Will +0 for every 1-HD animal in this table — the
 *     standard "good Fort/Ref, poor Will" animal progression at 1 HD) or the
 *     master's own base save bonus, PLUS the familiar's own ability modifier.
 *   - Skills: for each skill, the better of the master's ranks or the
 *     familiar's own (v1 simplification: the familiar never separately
 *     invests its own ranks, so this always resolves to the master's ranks —
 *     see the doc comment on {@link deriveFamiliar}'s skills section), using
 *     the familiar's OWN ability modifiers/size modifiers/racial bonuses.
 *   - Melee attack bonus with natural weapons: BAB + the BETTER of the
 *     familiar's Dex or Str modifier + size modifier (Familiar Basics, not a
 *     Weapon Finesse dependency). Damage bonus still uses the familiar's
 *     (often negative) Str modifier, undiminished, with no primary/secondary
 *     natural-attack halving — a deliberate v1 simplification (this module
 *     never models more than one attack "line" worth of provenance).
 *   - Combat Maneuvers: Tiny-or-smaller creatures use their Dex modifier in
 *     place of Str for CMB only (PF1 universal combat-maneuver rule); CMD
 *     uses the standard 10 + BAB + Str + Dex + special-size formula
 *     unmodified (both abilities already contribute there).
 *   - Conditions: the familiar has its OWN active-conditions list
 *     (`live.familiar.conditions`), independent of the master's
 *     `live.conditions` — routed through the exact same `routeSharedBuffs`
 *     pipeline as a shared buff, same as `companion.ts`'s own conditions.
 *
 * Familiar progression table (by master's total character level):
 *   ML 1–2: +1 natural armor, Int 6, Alertness/Improved Evasion/Share
 *     Spells/Empathic Link. ML 3–4: +2 natural armor, Int 7, Deliver Touch
 *     Spells. ML 5–6: +3/Int 8, Speak with Master. ML 7–8: +4/Int 9, Speak
 *     with Animals of Its Kind. ML 9–10: +5/Int 10. ML 11–12: +6/Int 11,
 *     Spell Resistance (master's level + 5). ML 13–14: +7/Int 12, Scry on
 *     Familiar. ML 15–20: +8 to +10 natural armor, Int 13–15. Both the
 *     natural-armor adjustment and Int score follow a clean `ceil(level/2)`
 *     stepped formula that reproduces every row of the published table
 *     exactly (verified by hand against all ten rows) — see
 *     {@link familiarNaturalArmorAdj} / {@link familiarIntScore}.
 *
 * Improved Familiars (`improved-familiars/`): non-animal species and the four
 * animal templates ride this same derivation — the published feat keeps the
 * normal familiar rules with exactly two exceptions (type unchanged; no Speak
 * with Animals of Its Kind), so HP stays half the master's and attacks stay
 * on the master's BAB even for a multi-HD creature. The improved surfaces
 * (own Int/skill ranks/class skills, defenses, spell-like abilities) are
 * feature-detected off the species entry — see `improved-familiars/types.ts`
 * for the rules posture, including the deliberate better-of Int resolution.
 */

import type { AbilityId, ActiveBuff, CharacterDoc, ModifierComponent, SizeId } from "@pf1/schema";

import { CONDITIONS } from "./conditions.js";
import {
  FAMILIAR_TEMPLATES,
  IMPROVED_FAMILIARS,
  isImprovedFamiliar,
} from "./improved-familiars/index.js";
import type {
  CreatureDefenses,
  FamiliarSlaDef,
  ImprovedFamiliar,
} from "./improved-familiars/types.js";
import { abilityMod, totalLevel } from "./rolldata.js";
import {
  creatureSaveConditionals,
  resolveSave,
  type CreatureSaveConditionals,
} from "./save-categories.js";
import {
  applySharedAbilityBonuses,
  applySharedSpeeds,
  routeSharedBuffs,
  type AcCandidate,
} from "./shared-creature-buffs.js";
import { resolveStack } from "./stacking.js";
import { SIZE_AC_MOD, SKILL_ABILITY, specialSizeMod } from "./tables.js";
import type { RollData } from "./formula.js";

/** How well a species flies — drives the Fly skill's maneuverability bonus below. */
export type FlyManeuverability = "clumsy" | "poor" | "average" | "good" | "perfect";

/**
 * Fly skill bonus granted by each maneuverability class (PF1 CRB "Fly":
 * clumsy −8, poor −4, average +0, good +4, perfect +8). The good/perfect
 * values were originally doubled (+8/+16) to make the bat's printed Fly +16
 * reconcile without ranks — a compensating error: the real decomposition is
 * RAW +4 plus the bat's own 1 invested rank (and the class-skill +3), which
 * `ownSkillRanks` now models directly.
 */
const FLY_MANEUVER_BONUS: Record<FlyManeuverability, number> = {
  clumsy: -8,
  poor: -4,
  average: 0,
  good: 4,
  perfect: 8,
};

/** Stealth's size modifier (PF1 CRB "Stealth") — smaller creatures hide better. */
const STEALTH_SIZE_MOD: Record<SizeId, number> = {
  fine: 16,
  dim: 12,
  tiny: 8,
  sm: 4,
  med: 0,
  lg: -4,
  huge: -8,
  grg: -12,
  col: -16,
};

/** Fly's size modifier (PF1 CRB "Fly") — independent of the Stealth table above. */
const FLY_SIZE_MOD: Record<SizeId, number> = {
  fine: 8,
  dim: 6,
  tiny: 4,
  sm: 2,
  med: 0,
  lg: -2,
  huge: -4,
  grg: -6,
  col: -8,
};

/**
 * The six skills every animal-type creature treats as a class skill
 * regardless of its own "class" (PF1 Bestiary Universal Monster Rules,
 * "Animal" type) — a skill in this set gets the usual +3 trained bonus once
 * the character (here: the master, per the "whichever is better" ranks rule)
 * has at least 1 rank in it.
 */
const ANIMAL_CLASS_SKILLS: ReadonlySet<string> = new Set([
  "acr",
  "clm",
  "fly",
  "per",
  "ste",
  "swm",
]);

/** Tiny-or-smaller sizes, for the CMB Dex-instead-of-Str substitution. */
const TINY_OR_SMALLER: ReadonlySet<SizeId> = new Set(["fine", "dim", "tiny"]);

/** One natural weapon a base animal attacks with. */
export interface FamiliarNaturalAttack {
  name: string;
  /** How many of this attack the creature makes (e.g. 2 for "2 claws"). */
  count: number;
  /** Damage dice before the Str-modifier addend, e.g. "1d3". */
  damageDice: string;
  /** Freeform display note, e.g. "plus poison" or "plus attach". */
  note?: string;
}

/**
 * A hand-authored PF1 Bestiary "Animals" stat block, trimmed to what a
 * familiar needs. Ability scores are FIXED except Intelligence, which is
 * overridden entirely by the master-level progression table (see
 * {@link familiarIntScore}) — the animal's own listed Int is irrelevant once
 * it's a familiar. `baseSaves` is `{ fort: 2, ref: 2, will: 0 }` (the standard
 * 1-HD ANIMAL progression) for most entries, but the four VERMIN entries
 * (scorpion, centipede, king crab, spider) use `{ fort: 2, ref: 0, will: 0 }`
 * instead (1-HD vermin's own good-Fort/poor-Ref/poor-Will progression) — kept
 * per-entry rather than a shared constant since it already varies by type,
 * and in case a future addition isn't 1 HD. `naturalArmor` is the creature's
 * OWN bonus (0 for entries with no natural armor listed in their printed AC
 * breakdown; nonzero where one is — viper/weasel/pig/scorpion/king
 * crab/centipede/spider/turtle/compsognathus — confirmed by solving each
 * stat block's printed AC), separate from the level-scaling familiar-table
 * bonus.
 *
 * `skillRacialMods`/`skillAbilityOverrides` encode only the bonuses/overrides
 * EXPLICITLY called out in the source stat block (e.g. cat's "+4 racial
 * modifier" to Climb/Stealth, and its Dex-based Climb). A species whose
 * printed skill total doesn't fully reconcile from these plus the generic
 * rules below (e.g. a species investing its own unlabeled ranks) is a
 * documented, accepted gap — same posture as `familiars.ts`'s hawk/owl
 * conditional-bonus notes. Two rules are NOT per-species data because they're
 * universal and verified across every relevant entry: a species with a climb
 * (or swim) speed gets a +8 racial bonus and uses Dex instead of Str for that
 * specific skill (PF1 Bestiary Universal Monster Rules) — applied generically
 * in {@link deriveFamiliar} from `speeds.climb`/`speeds.swim` presence.
 */
export interface BaseFamiliar {
  name: string;
  size: SizeId;
  abilities: { str: number; dex: number; con: number; wis: number; cha: number };
  baseSaves: { fort: number; ref: number; will: number };
  naturalArmor: number;
  attacks: FamiliarNaturalAttack[];
  /** Movement speeds in feet, keyed by mode ("land", "fly", "climb", "swim"). */
  speeds: Record<string, number>;
  /** Display-only sense list, e.g. ["low-light vision", "scent"]. */
  senses: string[];
  /** Present only when the species has a fly speed. */
  flyManeuverability?: FlyManeuverability;
  /** Skill id -> flat racial bonus explicitly named in the source stat block. */
  skillRacialMods?: Record<string, number>;
  /** Skill id -> ability override (e.g. cat's Climb uses Dex, not Str). */
  skillAbilityOverrides?: Partial<Record<string, AbilityId>>;
  /**
   * The creature's own invested skill ranks (skill id → ranks), where the
   * printed stat block only reconciles with ranks — the familiar "whichever
   * is better" rule compares these against the master's ranks per skill.
   * Ranks, not totals: subtract the printed ability/size/racial/class-skill
   * parts back out when authoring. Most standard animals carry none; every
   * improved species has its full printed allocation.
   */
  ownSkillRanks?: Record<string, number>;
}

/**
 * The 23 PF1 familiar species this app models: the eleven common CRB
 * "Familiars" (bat/cat/hawk/lizard/monkey/owl/rat/raven/toad/viper/weasel)
 * plus eleven from Ultimate Magic's "New Familiars" table and Bestiary 2
 * (compsognathus/fox/king crab/octopus/osprey/pig/scorpion/spider/centipede/
 * thrush/turtle), plus the rabbit (Ultimate Wilderness's "Arctic Hare" —
 * see the `rabbit` entry below for why that's the closest published option),
 * keyed by the same kind slugs `familiars.ts`/`build.arcaneBond.familiarKind`
 * use. Verified against d20pfsrd.com and legacy.aonprd.com's Ultimate Magic
 * "New Familiars" reference during authoring (see the module doc comment).
 *
 * The Ultimate Magic additions are printed as already-a-1st-level-familiar
 * stat blocks (Fort/Ref/Will already include the ability modifier); each
 * entry's `baseSaves` here is reverse-derived by subtracting the printed
 * ability modifier back out. Most reproduce the standard 1-HD ANIMAL
 * progression (good Fort/Ref, poor Will: 2/2/0), same as the CRB eleven — but
 * the four VERMIN entries (scorpion, centipede, king crab, spider) use
 * vermin's own 1-HD progression instead (good Fort, poor Ref, poor Will:
 * 2/0/0), confirmed by the same subtraction against their printed totals.
 * Pig's printed Fort (+6) additionally includes the Great Fortitude feat
 * (+2) baked into the raw animal's own stat block; since this module has no
 * separate per-species feat-bonus field, that +2 is folded directly into
 * `baseSaves.fort` (4, not the standard 2) rather than dropped. The rabbit
 * (below) is reverse-derived the same way and reproduces the plain 2/2/0
 * ANIMAL progression with no feat baked in.
 */
export const BASE_FAMILIARS: Readonly<Record<string, BaseFamiliar>> = {
  bat: {
    name: "Bat",
    size: "dim",
    abilities: { str: 1, dex: 15, con: 6, wis: 14, cha: 5 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 5, fly: 40 },
    senses: ["blindsense 20 ft.", "low-light vision"],
    flyManeuverability: "good",
    skillRacialMods: { per: 4 },
    // Printed Fly +16 = Dex +2, size +6, good +4, 1 rank, class +3 — see
    // FLY_MANEUVER_BONUS's doc comment.
    ownSkillRanks: { fly: 1 },
  },
  cat: {
    name: "Cat",
    size: "tiny",
    abilities: { str: 3, dex: 15, con: 8, wis: 12, cha: 7 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [
      { name: "Claw", count: 2, damageDice: "1d2" },
      { name: "Bite", count: 1, damageDice: "1d3" },
    ],
    speeds: { land: 30 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { ste: 4, clm: 4 },
    skillAbilityOverrides: { clm: "dex" },
  },
  hawk: {
    name: "Hawk",
    size: "tiny",
    abilities: { str: 6, dex: 17, con: 11, wis: 14, cha: 7 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Talon", count: 2, damageDice: "1d4" }],
    speeds: { land: 10, fly: 60 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
    skillRacialMods: { per: 8 },
  },
  lizard: {
    name: "Lizard",
    size: "tiny",
    abilities: { str: 3, dex: 15, con: 8, wis: 12, cha: 2 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4" }],
    speeds: { land: 20, climb: 20 },
    senses: ["low-light vision"],
    skillRacialMods: { acr: 8 },
  },
  monkey: {
    name: "Monkey",
    size: "tiny",
    abilities: { str: 3, dex: 15, con: 10, wis: 12, cha: 5 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 30, climb: 30 },
    senses: ["low-light vision"],
    skillRacialMods: { acr: 8 },
  },
  owl: {
    name: "Owl",
    size: "tiny",
    abilities: { str: 6, dex: 17, con: 11, wis: 15, cha: 6 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Talon", count: 2, damageDice: "1d4" }],
    speeds: { land: 10, fly: 60 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
    skillRacialMods: { per: 4, ste: 4 },
  },
  rat: {
    name: "Rat",
    size: "tiny",
    abilities: { str: 2, dex: 15, con: 11, wis: 13, cha: 2 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 15, climb: 15, swim: 15 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { ste: 4 },
  },
  raven: {
    name: "Raven",
    size: "tiny",
    abilities: { str: 2, dex: 15, con: 8, wis: 15, cha: 7 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 10, fly: 40 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
  },
  toad: {
    name: "Toad",
    size: "dim",
    abilities: { str: 1, dex: 12, con: 6, wis: 15, cha: 4 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [],
    speeds: { land: 5 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { ste: 4 },
  },
  viper: {
    name: "Viper (snake)",
    size: "tiny",
    abilities: { str: 4, dex: 17, con: 8, wis: 13, cha: 2 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d2", note: "plus poison" }],
    speeds: { land: 20, climb: 20, swim: 20 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { per: 4, ste: 4 },
  },
  weasel: {
    name: "Weasel",
    size: "tiny",
    abilities: { str: 3, dex: 15, con: 10, wis: 12, cha: 5 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus attach" }],
    speeds: { land: 20, climb: 20 },
    senses: ["low-light vision", "scent"],
    skillRacialMods: { acr: 8, ste: 4 },
  },
  compsognathus: {
    name: "Compsognathus",
    size: "tiny",
    abilities: { str: 8, dex: 15, con: 14, wis: 11, cha: 5 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 40, swim: 20 },
    senses: ["low-light vision", "scent"],
  },
  fox: {
    name: "Fox",
    size: "tiny",
    abilities: { str: 9, dex: 15, con: 13, wis: 12, cha: 6 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 40 },
    senses: ["low-light vision", "scent"],
  },
  "king-crab": {
    name: "King Crab",
    size: "tiny",
    abilities: { str: 7, dex: 15, con: 12, wis: 10, cha: 2 },
    // Vermin progression (good Fort, poor Ref/Will) — see module doc comment.
    baseSaves: { fort: 2, ref: 0, will: 0 },
    naturalArmor: 4,
    attacks: [{ name: "Claw", count: 2, damageDice: "1d2", note: "plus grab" }],
    speeds: { land: 30, swim: 20 },
    senses: ["darkvision 60 ft."],
    skillRacialMods: { per: 4 },
  },
  octopus: {
    name: "Octopus (blue-ringed)",
    size: "tiny",
    abilities: { str: 8, dex: 21, con: 10, wis: 13, cha: 3 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d2", note: "plus poison" }],
    speeds: { land: 20, swim: 30, jet: 60 },
    senses: ["low-light vision"],
    skillRacialMods: { esc: 10, ste: 8 },
  },
  osprey: {
    // Rules text: "Osprey (use hawk statistics)" — an identical stat block
    // under its own species id/master bonus (d20pfsrd Familiars table).
    name: "Osprey",
    size: "tiny",
    abilities: { str: 6, dex: 17, con: 11, wis: 14, cha: 7 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Talon", count: 2, damageDice: "1d4" }],
    speeds: { land: 10, fly: 60 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
    skillRacialMods: { per: 8 },
  },
  pig: {
    name: "Pig",
    size: "sm",
    // Includes the Great Fortitude feat baked into base Fort — see module doc comment.
    baseSaves: { fort: 4, ref: 2, will: 0 },
    abilities: { str: 11, dex: 12, con: 15, wis: 13, cha: 4 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d4" }],
    speeds: { land: 30 },
    senses: ["low-light vision", "scent"],
  },
  scorpion: {
    name: "Scorpion (greensting)",
    size: "tiny",
    abilities: { str: 3, dex: 16, con: 10, wis: 10, cha: 2 },
    baseSaves: { fort: 2, ref: 0, will: 0 },
    naturalArmor: 3,
    attacks: [{ name: "Sting", count: 1, damageDice: "1d2", note: "plus poison" }],
    speeds: { land: 30 },
    senses: ["darkvision 60 ft."],
    skillRacialMods: { clm: 4, per: 4, ste: 4 },
  },
  spider: {
    name: "Spider (scarlet)",
    size: "tiny",
    abilities: { str: 3, dex: 21, con: 10, wis: 10, cha: 2 },
    baseSaves: { fort: 2, ref: 0, will: 0 },
    naturalArmor: 1,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 30, climb: 30 },
    senses: ["darkvision 60 ft."],
    // The published stat block's Climb total (+21) only reconciles if this
    // +8 stacks on top of the universal climb-speed +8 below — i.e. this
    // species really does carry both (verified by solving the printed total).
    skillRacialMods: { acr: 8, clm: 8, per: 4, ste: 4 },
  },
  centipede: {
    name: "Centipede (house)",
    size: "tiny",
    abilities: { str: 1, dex: 17, con: 10, wis: 10, cha: 2 },
    baseSaves: { fort: 2, ref: 0, will: 0 },
    naturalArmor: 2,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3", note: "plus poison" }],
    speeds: { land: 40, climb: 40 },
    senses: ["darkvision 60 ft."],
    skillRacialMods: { per: 4, ste: 8 },
  },
  thrush: {
    name: "Thrush",
    size: "dim",
    abilities: { str: 1, dex: 15, con: 6, wis: 15, cha: 6 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d2" }],
    speeds: { land: 10, fly: 40 },
    senses: ["low-light vision"],
    flyManeuverability: "average",
  },
  turtle: {
    name: "Turtle",
    size: "tiny",
    abilities: { str: 3, dex: 6, con: 8, wis: 12, cha: 3 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 6,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 5, swim: 20 },
    senses: ["low-light vision"],
  },
  // PF1 has no familiar literally named "Rabbit": the plain "Rabbit" Bestiary
  // entry (Ultimate Wilderness p.191) isn't on the Familiars table a master
  // must choose from, but that table's "Arctic Hare" (also Ultimate
  // Wilderness p.191, reprinted from the Reign of Winter Player's Guide
  // p.10) is — and its own flavor text calls it "this white rabbit". Same
  // reuse posture as `osprey` (hawk's stats): this entry is the Arctic
  // Hare's stat block under the `rabbit` slug. Its one point of departure
  // from the plain Rabbit entry, +4 Stealth "in snow", is a situational
  // bonus (like hawk/owl's lighting-conditioned Perception in
  // `familiars.ts`) and is deliberately NOT baked into `skillRacialMods`,
  // which would over-apply it outside snow.
  rabbit: {
    name: "Rabbit (arctic hare)",
    size: "tiny",
    abilities: { str: 3, dex: 16, con: 9, wis: 12, cha: 5 },
    baseSaves: { fort: 2, ref: 2, will: 0 },
    naturalArmor: 0,
    attacks: [{ name: "Bite", count: 1, damageDice: "1d3" }],
    speeds: { land: 50 },
    senses: ["low-light vision"],
  },
};

/** All base-familiar species slugs, for the builder's picker. */
export const BASE_FAMILIAR_IDS = Object.keys(BASE_FAMILIARS);

/**
 * Look up a familiar species across the standard table and the Improved
 * Familiar shards (`improved-familiars/`) — one shared id namespace, standard
 * first (the namespaces must never collide; a drift guard in
 * `improvedFamiliars.test.ts` enforces it). Lives here rather than in
 * `improved-familiars/index.ts` so that directory never imports this module
 * at runtime (its `types.ts` import of {@link BaseFamiliar} is type-only) —
 * keeping the module graph acyclic.
 */
export function familiarSpecies(id: string): BaseFamiliar | ImprovedFamiliar | undefined {
  return BASE_FAMILIARS[id] ?? IMPROVED_FAMILIARS[id];
}

/**
 * Familiar's Intelligence score at a given master level (CRB "Familiars"
 * progression table) — replaces the base animal's own Int entirely. The
 * published table steps every 2 master levels (6 at ML1-2, 7 at ML3-4, ...,
 * 15 at ML19-20); `5 + ceil(level/2)` reproduces every row exactly.
 */
export function familiarIntScore(masterLevel: number): number {
  return 5 + Math.ceil(Math.max(1, masterLevel) / 2);
}

/**
 * Natural armor bonus ADDED by the familiar progression table at a given
 * master level (on top of the base animal's own `naturalArmor`) — same
 * stepped-every-2-levels shape as {@link familiarIntScore}; `ceil(level/2)`
 * reproduces every row (+1 at ML1-2 through +10 at ML19-20) exactly.
 */
export function familiarNaturalArmorAdj(masterLevel: number): number {
  return Math.ceil(Math.max(1, masterLevel) / 2);
}

/** One special ability a familiar gains at a master-level threshold (CRB "Familiars"). */
export interface FamiliarSpecialAbility {
  name: string;
  minLevel: number;
  detail: string;
}

/**
 * Every familiar special ability and the master level it unlocks at (CRB
 * "Familiars"). `Spell Resistance`'s value (master level + 5) is computed by
 * the caller (see {@link DerivedFamiliar.spellResistance}), not baked into
 * `detail` here.
 */
export const FAMILIAR_SPECIAL_ABILITIES: readonly FamiliarSpecialAbility[] = [
  {
    name: "Alertness",
    minLevel: 1,
    detail: "While the familiar is within arm's reach, the master gains the Alertness feat.",
  },
  {
    name: "Improved Evasion",
    minLevel: 1,
    detail:
      "On a Reflex save for half damage, the familiar takes no damage on a success and half on a failure.",
  },
  {
    name: "Share Spells",
    minLevel: 1,
    detail:
      "The master may cast a spell targeting only himself on the familiar instead (touch range).",
  },
  {
    name: "Empathic Link",
    minLevel: 1,
    detail: "Empathic (not visual) link with the master out to 1 mile.",
  },
  {
    name: "Deliver Touch Spells",
    minLevel: 3,
    detail: "The familiar can deliver the master's touch spells for him.",
  },
  {
    name: "Speak with Master",
    minLevel: 5,
    detail: "The familiar and master can converse as if sharing a language.",
  },
  {
    name: "Speak with Animals of Its Kind",
    minLevel: 7,
    detail: "The familiar can communicate with animals of approximately its own kind.",
  },
  {
    name: "Spell Resistance",
    minLevel: 11,
    detail: "Spell resistance equal to the master's level + 5.",
  },
  {
    name: "Scry on Familiar",
    minLevel: 13,
    detail: "The master may scry on the familiar (as the scrying spell) once per day.",
  },
];

/** Every special ability the familiar has unlocked by `masterLevel`. */
export function familiarSpecialAbilities(masterLevel: number): FamiliarSpecialAbility[] {
  return FAMILIAR_SPECIAL_ABILITIES.filter((a) => a.minLevel <= masterLevel);
}

/**
 * The master-derived numbers {@link deriveFamiliar} needs but can't safely
 * recompute itself (they depend on the master's FULL collected-modifier pass
 * — feats, buffs, etc. — which would be circular to redo here). Callers pass
 * these straight from the already-computed master `DerivedSheet` (see
 * `compute.ts`). `baseSaves` is the master's BASE save bonus per save
 * (before their ability modifier) summed across classes — deliberately NOT
 * derived from `RefData` here so a master class missing from the vendored
 * data (e.g. this worktree has no Arcanist) can still be modeled by a caller
 * that already knows the numbers.
 */
export interface FamiliarMasterInputs {
  /** Master's current max HP (already includes buffs/feats/FCB/etc.). */
  maxHp: number;
  /** Master's current BAB. */
  bab: number;
  /** Master's base save bonus per save, before ability modifier. */
  baseSaves: { fort: number; ref: number; will: number };
}

export interface DerivedFamiliarSkill {
  id: string;
  ability: AbilityId;
  total: number;
  components: ModifierComponent[];
}

export interface DerivedFamiliarAttack {
  name: string;
  count: number;
  attack: number;
  damageDice: string;
  damageBonus: number;
  note?: string;
}

export interface DerivedFamiliarAc {
  normal: number;
  touch: number;
  flatFooted: number;
  components: ModifierComponent[];
}

/**
 * One spell-like ability on the familiar's derived sheet, from an improved
 * species' own stat block (`ImprovedFamiliar.slas`). The save DC is finished
 * web-side (10 + spell level + `dcMod`) because resolving the spell's level
 * needs `RefData`, which this pure module never sees — same split as the
 * spell name → `SpellDetail` resolution.
 */
export interface DerivedFamiliarSla {
  /** The def's slug — also the `live.familiar.slaUses` key for metered abilities. */
  slug: string;
  name: string;
  /** Vendored spell name to resolve for detail display (`spell ?? name` from the def). */
  spell: string;
  frequency: FamiliarSlaDef["frequency"];
  cl: number;
  /** The familiar's OWN modifier for the DC ability (post-shared-buffs), Cha by default. */
  dcMod: number;
  /** Present for metered abilities: the per-period budget and what's left today. */
  usesMax?: number;
  usesRemaining?: number;
  per?: "day" | "week";
  note?: string;
}

/** The full derived stat block for a tracked familiar (`build.familiar`). */
export interface DerivedFamiliar {
  speciesId: string;
  speciesName: string;
  name: string;
  size: SizeId;
  /** The master's total character level (the familiar's effective level). */
  level: number;
  abilities: Record<AbilityId, { score: number; mod: number }>;
  hp: { max: number; current: number; nonlethal: number };
  init: number;
  speeds: Record<string, number>;
  senses: string[];
  ac: DerivedFamiliarAc;
  saves: { fort: number; ref: number; will: number };
  /**
   * Situational save totals from a category-scoped shared buff, omitted when
   * nothing applies. See `save-categories.ts`.
   */
  saveConditionals?: CreatureSaveConditionals;
  bab: number;
  cmb: number;
  cmd: number;
  attacks: DerivedFamiliarAttack[];
  skills: Record<string, DerivedFamiliarSkill>;
  /** Total natural armor (base animal's own + the level-scaled table bonus). */
  naturalArmor: number;
  specialAbilities: FamiliarSpecialAbility[];
  /**
   * The higher of the progression table's SR (master level + 5, from ML 11)
   * and an improved species' own printed SR; absent when neither applies.
   */
  spellResistance?: number;
  /** Full printed type line for an improved species ("Outsider (devil, evil, extraplanar, lawful)"). */
  creatureType?: string;
  /** An improved species' own Hit Dice (the HD whichever-is-higher rule + display). */
  hd?: number;
  /**
   * DR / energy resistance / immunities / fast healing, from an improved
   * species' stat block or an applied template. SR is deliberately absent
   * here — it's folded into {@link spellResistance} so the sheet shows one
   * number.
   */
  defenses?: Omit<CreatureDefenses, "sr">;
  /** Spell-like abilities, for improved species that carry them. */
  slas?: DerivedFamiliarSla[];
  /** Languages, as printed (improved species only; display). */
  languages?: string[];
  /** Special-quality reminders with no numeric surface ("poison (DC 13)", "breath weapon..."). */
  specialNotes?: string[];
}

/** AC bucket membership mirroring `compute.ts`'s (duplicated locally — compute.ts's are private). */
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
 * Derive the tracked familiar's full stat block, or `undefined` when the
 * document has no `build.familiar` or its `speciesId` isn't in
 * {@link BASE_FAMILIARS} (unknown species — soft-warning posture, never a
 * crash; the UI simply shows nothing).
 *
 * Buff sharing (`live.familiar.sharedBuffIds`): each shared buff's `changes[]`
 * is evaluated against `rollData` (the MASTER's roll data — a shared buff's
 * formula, e.g. Mage Armor's flat "4", doesn't need the familiar's own ability
 * scores) exactly like the master's own buffs, and routed into the familiar's:
 *   - AC (`ac`/`aac`/`sac`/`nac` targets)
 *   - saves (`fort`/`ref`/`will`/`allSavingThrows`)
 *   - skills (`skill.*`)
 *   - attack rolls (`attack`/`mattack` targets — applied to every natural
 *     attack line alike, matching this module's existing no-provenance-split
 *     posture for attacks)
 *   - damage rolls (`damage` target — added to every attack's damage bonus)
 *   - ability scores (`str`/`dex`/`con`/`int`/`wis`/`cha` targets — e.g. a
 *     shared Eagle's Splendor or Heroism-style buff). Ability bonuses are
 *     applied to the familiar's own base scores BEFORE any dependent number
 *     is derived, so they cascade into AC (Dex), saves (Con/Dex/Wis),
 *     CMB/CMD (Str/Dex), skills, attacks (Str/Dex), and initiative (Dex)
 *     exactly the way the familiar's own base ability scores already do —
 *     there is no separate "shared ability bonus" pathway downstream of this.
 *   - movement speed (`landSpeed`/`flySpeed`/`swimSpeed`/`climbSpeed`/
 *     `burrowSpeed` targets, e.g. a shared Longstrider/Expeditious Retreat)
 *   - initiative (`init` target)
 * — every one of these goes through the same `resolveStack` typed-stacking
 * path already used for AC (highest-within-type, dodge/untyped/circumstance
 * sum, penalties always stack), just like `collect.ts`/`compute.ts` do for
 * the master.
 *
 * Deliberately NOT modeled for shared buffs (documented scope limit, not a
 * silent drop — buffs that only carry these targets simply have no effect
 * on the familiar's sheet):
 *   - HP / temporary HP (`hp` target): the familiar's HP is always half the
 *     master's max, recomputed from `master.maxHp` — there's no per-familiar
 *     HP buff pathway.
 *   - Damage reduction / energy resistances: this module has no DR/resistance
 *     block for the familiar at all yet (master or shared), so there is
 *     nothing to route a shared buff's DR/resistance changes into.
 *   - Speed's `operator: "set"` semantics (used by compute.ts for the
 *     master's Slow/Debilitating-Injury-style overrides): shared buffs are
 *     player buffs, not conditions, so in practice none of the vendored
 *     "shared-able" buffs ever set an absolute speed — only additive
 *     (typed-stacking) speed bonuses are honored here.
 */
export function deriveFamiliar(
  doc: CharacterDoc,
  master: FamiliarMasterInputs,
  rollData: RollData,
): DerivedFamiliar | undefined {
  const build = doc.build.familiar;
  if (!build) return undefined;
  const species = familiarSpecies(build.speciesId);
  if (!species) return undefined;
  const improved = isImprovedFamiliar(species) ? species : undefined;
  // Templates only apply to a standard animal species (see the schema doc
  // comment on `FamiliarBuild.template`); an unknown template id degrades to
  // none, same soft posture as an unknown species.
  const template = !improved && build.template ? FAMILIAR_TEMPLATES[build.template] : undefined;

  const level = Math.max(1, totalLevel(doc));
  // Better-of for an improved species' own printed Int — see
  // `improved-familiars/types.ts`'s rules-posture note.
  const intScore = Math.max(familiarIntScore(level), improved?.ownInt ?? 0);
  let abilities: Record<AbilityId, { score: number; mod: number }> = {
    str: { score: species.abilities.str, mod: abilityMod(species.abilities.str) },
    dex: { score: species.abilities.dex, mod: abilityMod(species.abilities.dex) },
    con: { score: species.abilities.con, mod: abilityMod(species.abilities.con) },
    int: { score: intScore, mod: abilityMod(intScore) },
    wis: { score: species.abilities.wis, mod: abilityMod(species.abilities.wis) },
    cha: { score: species.abilities.cha, mod: abilityMod(species.abilities.cha) },
  };

  const size = species.size;
  const sizeAcMod = SIZE_AC_MOD[size];

  // --- shared buffs: evaluate + bucket by target ----------------
  const sharedIds = new Set(doc.live.familiar?.sharedBuffIds ?? []);
  const sharedBuffs = (doc.live.activeBuffs ?? []).filter((b) => sharedIds.has(b.instanceId));

  // --- the familiar's OWN active conditions: reshaped as synthetic
  // ActiveBuffs so `routeSharedBuffs` applies their Change[] through the
  // exact same typed-stacking pipeline as a shared buff — see
  // `companion.ts`'s doc comment.
  const conditionBuffs: ActiveBuff[] = (doc.live.familiar?.conditions ?? [])
    .map((id) => CONDITIONS[id])
    .filter((c): c is NonNullable<typeof c> => c != null && c.changes.length > 0)
    .map((c) => ({ instanceId: `condition:${c.id}`, name: c.name, changes: c.changes }));

  const routed = routeSharedBuffs([...sharedBuffs, ...conditionBuffs], rollData);
  const { ac: sharedAc, fort: sharedFort, ref: sharedRef, will: sharedWill } = routed;
  const sharedSkill = routed.skill;
  const {
    attack: sharedAttack,
    damage: sharedDamage,
    speed: sharedSpeed,
    init: sharedInit,
  } = routed;

  // Apply shared ability-score buffs to the familiar's own base scores BEFORE
  // deriving anything that depends on them — see `applySharedAbilityBonuses`'s
  // doc comment.
  abilities = applySharedAbilityBonuses(abilities, routed.ability, abilityMod);
  const strMod = abilities.str.mod;
  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;
  const wisMod = abilities.wis.mod;

  // --- AC -------------------------------------------------------------------
  const naturalArmor = species.naturalArmor + familiarNaturalArmorAdj(level);
  const acCandidates: AcCandidate[] = [
    { category: "base", type: "base", value: 10, source: "Base" },
    { category: "dex", type: "untyped", value: dexMod, source: "Dexterity" },
    { category: "natural", type: "natural", value: naturalArmor, source: "Natural armor" },
    ...(sizeAcMod !== 0
      ? [{ category: "size", type: "size", value: sizeAcMod, source: "Size" }]
      : []),
    ...sharedAc,
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

  // --- saves ------------------------------------------------------------------
  // A shared buff scoped to a category of effects stays out of the headline
  // total here exactly as it does on the master's sheet (see
  // `save-categories.ts`); a familiar has no Devotion of its own.
  const fortSave = resolveSave(
    "fort",
    Math.max(species.baseSaves.fort, master.baseSaves.fort) + conMod,
    sharedFort,
  );
  const refSave = resolveSave(
    "ref",
    Math.max(species.baseSaves.ref, master.baseSaves.ref) + dexMod,
    sharedRef,
  );
  const willSave = resolveSave(
    "will",
    Math.max(species.baseSaves.will, master.baseSaves.will) + wisMod,
    sharedWill,
  );
  const saves = { fort: fortSave.total, ref: refSave.total, will: willSave.total };
  const saveConditionals = creatureSaveConditionals(fortSave, refSave, willSave);

  // --- CMB/CMD ----------------------------------------------------------------
  const sizeSpecial = specialSizeMod(size);
  const cmb = master.bab + (TINY_OR_SMALLER.has(size) ? dexMod : strMod) + sizeSpecial;
  const cmd = 10 + master.bab + strMod + dexMod + sizeSpecial;

  // --- attacks ------------------------------------------------------------------
  // Familiar Basics: BAB + the BETTER of Dex/Str + size, for every natural
  // attack alike (no primary/secondary halving modeled — see module doc),
  // plus any shared "attack"/"mattack" bonus. Shared "damage" is
  // likewise added to every attack's damage bonus alike.
  const sharedAttackBonus = resolveStack(sharedAttack).total;
  const sharedDamageBonus = resolveStack(sharedDamage).total;
  const attackBonus = master.bab + Math.max(strMod, dexMod) + sizeAcMod + sharedAttackBonus;
  const attacks: DerivedFamiliarAttack[] = species.attacks.map((a) => ({
    name: a.name,
    count: a.count,
    attack: attackBonus,
    damageDice: a.damageDice,
    damageBonus: strMod + sharedDamageBonus,
    note: a.note,
  }));

  // --- skills -------------------------------------------------------------------
  const skillIds = new Set<string>([
    ...Object.keys(SKILL_ABILITY),
    ...Object.keys(doc.build.skillRanks ?? {}),
    ...Object.keys(species.ownSkillRanks ?? {}),
  ]);
  const skills: Record<string, DerivedFamiliarSkill> = {};
  // The Universal Monster Rules animal class-skill set only applies to an
  // animal/vermin chassis; an improved non-animal species carries its own
  // printed class-skill list instead (a templated animal stays an animal).
  const classSkills: ReadonlySet<string> =
    improved && improved.typeKind !== "animal" && improved.typeKind !== "vermin"
      ? new Set(improved.classSkills ?? [])
      : ANIMAL_CLASS_SKILLS;
  const hasClimbSpeed = species.speeds.climb !== undefined;
  const hasSwimSpeed = species.speeds.swim !== undefined;
  for (const id of skillIds) {
    let ability: AbilityId = species.skillAbilityOverrides?.[id] ?? SKILL_ABILITY[id] ?? "int";
    // Universal Monster Rules: a creature with a climb/swim speed uses Dex
    // (not Str) for that specific skill, verified against every relevant
    // species in BASE_FAMILIARS (see module doc comment).
    if (id === "clm" && hasClimbSpeed) ability = "dex";
    if (id === "swm" && hasSwimSpeed) ability = "dex";
    const abilityModVal = abilities[ability].mod;

    // "Whichever is better" per skill: the master's invested ranks vs the
    // creature's own printed ranks (most standard animals carry none, so
    // this usually resolves to the master's — the original v1 behavior).
    const ranks = Math.max(doc.build.skillRanks?.[id] ?? 0, species.ownSkillRanks?.[id] ?? 0);
    const classSkillBonus = classSkills.has(id) && ranks >= 1 ? 3 : 0;

    let racial = species.skillRacialMods?.[id] ?? 0;
    if (id === "clm" && hasClimbSpeed) racial += 8;
    if (id === "swm" && hasSwimSpeed) racial += 8;

    let sizeSkillMod = 0;
    if (id === "ste") sizeSkillMod = STEALTH_SIZE_MOD[size];
    if (id === "fly") {
      sizeSkillMod =
        FLY_SIZE_MOD[size] +
        (species.flyManeuverability ? FLY_MANEUVER_BONUS[species.flyManeuverability] : 0);
    }

    const miscStack = resolveStack([...(sharedSkill.get(id) ?? []), ...routed.skillsGlobal]);
    const components: ModifierComponent[] = [];
    if (racial !== 0)
      components.push({
        source: `${species.name} (racial)`,
        type: "racial",
        value: racial,
        applied: true,
      });
    if (sizeSkillMod !== 0)
      components.push({ source: "Size", type: "size", value: sizeSkillMod, applied: true });
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
      total: ranks + abilityModVal + classSkillBonus + racial + sizeSkillMod + miscStack.total,
      components,
    };
  }

  // --- improved-familiar surfaces -------------------------------------------
  // Improved species and templates are mutually exclusive (templates only
  // apply to standard animals), so this is a pick, not a merge. Every
  // BASE_FAMILIARS animal is 1 HD — the tier argument stays explicit so a
  // future multi-HD base can't silently get the wrong template tier.
  const rawDefenses = improved?.defenses ?? template?.defensesForHd(1);
  const defenses: Omit<CreatureDefenses, "sr"> | undefined = rawDefenses
    ? {
        ...(rawDefenses.dr !== undefined && { dr: rawDefenses.dr }),
        ...(rawDefenses.fastHealing !== undefined && { fastHealing: rawDefenses.fastHealing }),
        ...(rawDefenses.resist !== undefined && { resist: rawDefenses.resist }),
        ...(rawDefenses.immune !== undefined && { immune: rawDefenses.immune }),
        ...(rawDefenses.weaknesses !== undefined && { weaknesses: rawDefenses.weaknesses }),
      }
    : undefined;
  const hasDefenses = defenses !== undefined && Object.keys(defenses).length > 0;
  // One SR on the sheet: the higher of the species' own and the progression's.
  const srValue = Math.max(rawDefenses?.sr ?? 0, level >= 11 ? level + 5 : 0);

  // "Improved familiars do not gain the ability to speak with other creatures
  // of their kind" (the feat's second exception) — applies to templated
  // animals too, since a celestial hawk is itself an improved familiar.
  const specialAbilities = familiarSpecialAbilities(level).filter(
    (a) => !(improved || template) || a.name !== "Speak with Animals of Its Kind",
  );
  if (template) {
    specialAbilities.push({
      name: `${template.name} template`,
      minLevel: 1,
      detail: template.note,
    });
  }

  const slas: DerivedFamiliarSla[] | undefined = improved?.slas?.map((def) => {
    const metered = typeof def.frequency === "object" ? def.frequency : undefined;
    const spent = doc.live.familiar?.slaUses?.[def.slug] ?? 0;
    return {
      slug: def.slug,
      name: def.name,
      spell: def.spell ?? def.name,
      frequency: def.frequency,
      cl: def.cl,
      dcMod: abilities[def.dcAbility ?? "cha"].mod,
      ...(metered && {
        usesMax: metered.uses,
        usesRemaining: Math.max(0, metered.uses - spent),
        per: metered.per,
      }),
      ...(def.note !== undefined && { note: def.note }),
    };
  });

  const senses = template
    ? [...species.senses, ...template.senses.filter((s) => !species.senses.includes(s))]
    : species.senses;

  return {
    speciesId: build.speciesId,
    speciesName: template ? `${template.name} ${species.name}` : species.name,
    name: build.name,
    size,
    level,
    abilities,
    hp: {
      max: Math.floor(master.maxHp / 2),
      current: Math.floor(master.maxHp / 2) - (doc.live.familiar?.damage ?? 0),
      nonlethal: doc.live.familiar?.nonlethal ?? 0,
    },
    init: dexMod + resolveStack(sharedInit).total,
    speeds: applySharedSpeeds(species.speeds, sharedSpeed),
    senses,
    ac: { normal: acNormal, touch: acTouch, flatFooted: acFlatFooted, components: acComponents },
    saves,
    saveConditionals,
    bab: master.bab,
    cmb,
    cmd,
    attacks,
    skills,
    naturalArmor,
    specialAbilities,
    spellResistance: srValue > 0 ? srValue : undefined,
    ...(improved && {
      creatureType: improved.creatureType,
      hd: improved.hd,
      ...(improved.languages !== undefined && { languages: improved.languages }),
      ...(improved.specialNotes !== undefined && { specialNotes: improved.specialNotes }),
    }),
    ...(hasDefenses && { defenses }),
    ...(slas !== undefined && slas.length > 0 && { slas }),
  };
}
