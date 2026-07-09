/**
 * Tracked phantoms (`CharacterDoc.build.phantom`) — the Occult Adventures
 * Spiritualist's eidolon-like companion, modeled as its OWN trackable
 * creature (HD/BAB/saves/AC/attacks/skills), mirroring `companion.ts`'s
 * shape and posture closely (own HD/BAB/saves, unlike `familiar.ts`'s
 * borrow-the-master's-numbers approach). Clean-room from the published PF1
 * rules (Occult Adventures "Spiritualist" class, the "Phantom" class
 * feature, and the "Emotional Focus" subsystem) — paraphrased from
 * aonprd.com/d20pfsrd.com during authoring (issue #65); no Foundry source was
 * consulted (see DESIGN §6). Foundry's GPL system code is never used as
 * anything but a behavioral oracle in tests, per the repo's clean-room
 * discipline.
 *
 * Phantom Basics (PF1 Occult Adventures "Phantom"):
 *   - The phantom has its OWN Hit Dice, BAB, and saves — like an animal
 *     companion, NOT like a familiar. HD/BAB (full, 1/HD) come straight from
 *     {@link PHANTOM_PROGRESSION}; two of its three saves are "good" and one
 *     is "poor," with WHICH two are good chosen by the phantom's Emotional
 *     Focus (`EmotionalFocus.goodSaves`) rather than being fixed — reusing
 *     `tables.ts`'s `babForLevels("high", hd)` / `saveForLevels("high"|"low",
 *     hd)` reproduces the published progression exactly (verified by hand
 *     against the source table during authoring).
 *   - HP: PF1 RAW average-hp-per-HD on a d10 (average 5.5/HD, floored) plus
 *     the phantom's own Constitution modifier per HD, floored at 1 hp/HD —
 *     same `Math.floor(avg * hd) + conMod * hd` shape as `companion.ts`'s d8
 *     companion, just with the d10 average.
 *   - Base ability scores (before Emotional Focus/level adjustments): Str 12,
 *     Dex 14, Con 13, Int 7, Wis 10, Cha 13 (fixed — the phantom has no
 *     species table the way a familiar/companion does).
 *   - Each level of {@link PHANTOM_PROGRESSION} adds the SAME bonus to BOTH
 *     Dexterity and Charisma (the published "Manifested Phantom's Base
 *     Statistics" table's two adjustment columns move in lockstep) — distinct
 *     from the separate, player-CHOSEN "Ability Score Increase" special
 *     ability at spiritualist levels 5/10/15 (`build.phantom.abilityIncreases`,
 *     mirroring `AnimalCompanionBuild`'s shape), which is a real free +1 to
 *     any one ability on top of the automatic Dex/Cha table bonus.
 *   - AC bonus: the published table gives a natural-armor bonus while
 *     manifested ectoplasmic, or a Charisma-based deflection bonus while
 *     manifested incorporeal — same numeric magnitude either way (see the
 *     table's own base value; the deflection variant additionally scales with
 *     Cha, which this module folds into the flat per-level number for
 *     simplicity). Per this project's existing schema-documented
 *     simplification (`PhantomLiveState.manifestation`'s doc comment: "the
 *     phantom's stat block is the same regardless of state"), `derivePhantom`
 *     always applies {@link PHANTOM_PROGRESSION}'s `acBonus` as a flat
 *     natural-armor-type AC bonus, independent of the live manifestation
 *     toggle — a deliberate, documented v1 simplification, not a missed rule.
 *   - Size: PF1 RAW lets the spiritualist manifest her phantom one size
 *     smaller than herself (or, if Small or smaller, one size larger) —
 *     modeled as a real build choice (`build.phantom.size`, `"sm"|"med"|"lg"`,
 *     default `"med"`) since it has a genuine numeric effect on AC/CMB/CMD
 *     (via `tables.ts`'s `SIZE_AC_MOD`/`specialSizeMod`, same as
 *     `companion.ts`) and on slam-attack damage dice (see
 *     {@link PHANTOM_SLAM_DAMAGE}).
 *   - Attacks: two slam natural attacks, damage dice scaling with spiritualist
 *     level per {@link PHANTOM_SLAM_DAMAGE} (verified against aonprd.com's
 *     "Table: Phantom Slam Damage" during authoring — Medium: 1d6 at levels
 *     1–4, 1d8 at 5–12, 2d6 at 13–16, 2d8 at 17–20; Small/Large are one step
 *     down/up the standard PF1 natural-weapon damage-die ladder at each tier,
 *     which reproduces the published 1st-level values (Small 1d4, Large 1d8)
 *     exactly). No primary/secondary natural-attack halving is modeled here
 *     either (matches `companion.ts`/`familiar.ts`'s existing posture).
 *   - Skills: the phantom's Emotional Focus grants exactly two class skills,
 *     with bonus ranks always equal to its Hit Dice (PF1 RAW) — modeled as
 *     the phantom's only two numerically-tracked skills (unlike
 *     `companion.ts`'s fixed six-skill set, which has no per-species "which
 *     skills" choice to key off of).
 *   - Damage reduction, Devotion, Deliver Touch Spells, Incorporeal Flight,
 *     Magic Attacks, Darkvision, Link, and Share Spells are all surfaced as
 *     display-only special-ability chips (see {@link PHANTOM_SPECIAL_ABILITY_DETAIL}) —
 *     same posture as `companion.ts`'s Devotion/Multiattack chips; this
 *     module has no DR/resistance block, fly-speed movement mode wiring, or
 *     touch-spell-delivery mechanic of its own (matches `familiar.ts`'s
 *     explicit "no DR/resistance block ... at all yet" scope note).
 */

import type { AbilityId, CharacterDoc, ModifierComponent } from "@pf1/schema";

import { abilityMod, totalLevel } from "./rolldata.js";
import {
  applySharedAbilityBonuses,
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

/** Fixed base ability scores every phantom starts with (PF1 Occult Adventures "Phantom"), before any adjustment. */
export const PHANTOM_BASE_ABILITIES: Readonly<Record<AbilityId, number>> = {
  str: 12,
  dex: 14,
  con: 13,
  int: 7,
  wis: 10,
  cha: 13,
};

/** One PF1 Emotional Focus (Occult Adventures "Emotional Focus") — the phantom's skills/saves/theme. */
export interface EmotionalFocus {
  name: string;
  /**
   * The two skill ids the phantom gains as class skills, with bonus ranks
   * always equal to its Hit Dice (PF1 RAW). Also the two skills in which the
   * SPIRITUALIST herself gains Skill Focus (not modeled numerically here —
   * that's a master-side bonus, out of this module's scope; see
   * `apps/web/src/model/phantom.ts` for where a caller could wire it).
   */
  skills: readonly [string, string];
  /** Which two of fort/ref/will are "good" saves for this phantom; the third is "poor". */
  goodSaves: readonly ("fort" | "ref" | "will")[];
  /**
   * Paraphrased, display-only summary of the focus's special ability (PF1
   * RAW grants a themed combat/utility power, often with a higher-level
   * upgrade around 7th-level phantom HD) — no numeric hook, same posture as
   * `SHIFTER_ASPECTS`/`WITCH_HEXES`' prose-only entries.
   */
  detail: string;
}

/**
 * All fifteen PF1 Occult Adventures Emotional Foci, keyed by a stable slug.
 * Skills/good-saves are structured (clean numeric shape); each focus's
 * special ability is paraphrased into `detail` only — none of the fifteen
 * abilities reduces to an unconditional numeric `Change` the way e.g. a
 * companion's Devotion (+4 Will vs. enchantment) does, so none is wired
 * further (see module doc comment).
 */
export const EMOTIONAL_FOCI: Readonly<Record<string, EmotionalFocus>> = {
  anger: {
    name: "Anger",
    skills: ["int", "sur"],
    goodSaves: ["fort", "will"],
    detail:
      "Slam attacks deal bonus damage as though the phantom were one size larger, and it can emanate a fury aura that worsens nearby foes.",
  },
  dedication: {
    name: "Dedication",
    skills: ["dip", "sen"],
    goodSaves: ["ref", "will"],
    detail:
      "Deals bonus damage against whatever last attacked it, and can project a defending aura that helps allies resist harm.",
  },
  despair: {
    name: "Despair",
    skills: ["int", "ste"],
    goodSaves: ["fort", "will"],
    detail:
      "Worsens the condition of frightened foes and can emanate an aura of despair that saps enemy morale.",
  },
  desperation: {
    name: "Desperation",
    skills: ["acr", "esc"],
    goodSaves: ["ref", "will"],
    detail:
      "Gains Combat Reflexes and substitutes Dexterity for Strength on grapple checks; can later emanate an aura that disrupts nearby spellcasting.",
  },
  fear: {
    name: "Fear",
    skills: ["int", "ste"],
    goodSaves: ["ref", "will"],
    detail:
      "Slam attacks force a Will save against the shaken condition, later amplified by a fear aura.",
  },
  greed: {
    name: "Greed",
    skills: ["apr", "slt"],
    goodSaves: ["fort", "ref"],
    detail:
      "Threatens critical hits on a 19–20 and can emanate a covetous aura that siphons beneficial magic from foes.",
  },
  hatred: {
    name: "Hatred",
    skills: ["acr", "per"],
    goodSaves: ["fort", "ref"],
    detail:
      "Can designate a hated target for a bonus to hit and extra precision damage against it.",
  },
  jealousy: {
    name: "Jealousy",
    skills: ["apr", "blf"],
    goodSaves: ["ref", "will"],
    detail:
      "Slam attacks penalize a struck foe's attacks against anyone but the phantom, and it deals bonus damage to creatures attacking its master.",
  },
  kindness: {
    name: "Kindness",
    skills: ["dip", "hea"],
    goodSaves: ["fort", "will"],
    detail:
      "Can grant an ally an immediate counterattack when the phantom aids it in combat, later upgraded to a faster action with a damage bonus.",
  },
  lust: {
    name: "Lust",
    skills: ["blf", "dip"],
    goodSaves: ["fort", "will"],
    detail:
      "Can redirect an attack meant for an ally onto itself, and grants rerolls against charm/compulsion effects.",
  },
  pride: {
    name: "Pride",
    skills: ["int", "per"],
    goodSaves: ["ref", "will"],
    detail:
      "Immune to fear once it succeeds at a save against it, and doubles its morale bonuses while fear-immune.",
  },
  remorse: {
    name: "Remorse",
    skills: ["per", "sen"],
    goodSaves: ["fort", "will"],
    detail:
      "Slam attacks impose an accuracy penalty on the struck foe; at high HD a successful hit can briefly paralyze the target.",
  },
  suffering: {
    name: "Suffering",
    skills: ["clm", "hea"],
    goodSaves: ["fort", "will"],
    detail:
      "Can bull rush a foe it strikes in melee, and later emanates an aura that helps allies resist disease/curses or absorbs harmful conditions on their behalf.",
  },
  whimsey: {
    name: "Whimsey",
    skills: ["acr", "per"],
    goodSaves: ["ref", "will"],
    detail:
      "Can unleash a cone of stunning colors against weaker foes, later upgraded to an aura that distracts and disorients nearby enemies.",
  },
  zeal: {
    name: "Zeal",
    skills: ["acr", "sur"],
    goodSaves: ["fort", "ref"],
    detail:
      "Threatens critical hits on a 19–20, can manifest even while its master sleeps, and can reroll a failed attack roll.",
  },
};

/** All Emotional Focus slugs, for the builder's picker. */
export const EMOTIONAL_FOCUS_IDS = Object.keys(EMOTIONAL_FOCI);

/** One row of the PF1 Occult Adventures "Manifested Phantom's Base Statistics" table, by spiritualist level. */
export interface PhantomProgressionRow {
  level: number;
  hd: number;
  /** Natural-armor (ectoplasmic) / deflection (incorporeal) AC bonus — see module doc comment for why this project applies one flat value regardless of manifestation. */
  acBonus: number;
  /** Added to BOTH Dexterity and Charisma automatically (not a player choice; see module doc comment for the separate chosen ASI). */
  abilityBonus: number;
  /** Special abilities newly granted AT this level (not cumulative — see {@link phantomSpecialAbilityNames}). */
  special: string[];
}

/**
 * Table: Manifested Phantom's Base Statistics (PF1 Occult Adventures
 * "Phantom"), indexed by spiritualist level 1–20. `hd` reproduces
 * `babForLevels("high", hd)` exactly (full BAB, 1/level) for every row —
 * verified by hand during authoring.
 */
export const PHANTOM_PROGRESSION: readonly PhantomProgressionRow[] = [
  { level: 1, hd: 1, acBonus: 0, abilityBonus: 0, special: ["Darkvision", "Link", "Share Spells"] },
  { level: 2, hd: 2, acBonus: 2, abilityBonus: 1, special: [] },
  { level: 3, hd: 3, acBonus: 2, abilityBonus: 1, special: ["Deliver Touch Spells"] },
  { level: 4, hd: 3, acBonus: 2, abilityBonus: 1, special: ["Magic Attacks"] },
  {
    level: 5,
    hd: 4,
    acBonus: 4,
    abilityBonus: 2,
    special: ["Ability Score Increase", "Damage Reduction 5/magic"],
  },
  { level: 6, hd: 5, acBonus: 4, abilityBonus: 2, special: ["Devotion"] },
  { level: 7, hd: 6, acBonus: 6, abilityBonus: 2, special: [] },
  { level: 8, hd: 6, acBonus: 6, abilityBonus: 3, special: [] },
  { level: 9, hd: 7, acBonus: 6, abilityBonus: 3, special: ["Incorporeal Flight"] },
  {
    level: 10,
    hd: 8,
    acBonus: 8,
    abilityBonus: 4,
    special: ["Ability Score Increase", "Damage Reduction 10/magic"],
  },
  { level: 11, hd: 9, acBonus: 8, abilityBonus: 4, special: [] },
  { level: 12, hd: 9, acBonus: 10, abilityBonus: 5, special: ["Deliver Touch Spells (50 ft.)"] },
  { level: 13, hd: 10, acBonus: 10, abilityBonus: 5, special: [] },
  { level: 14, hd: 11, acBonus: 10, abilityBonus: 5, special: [] },
  {
    level: 15,
    hd: 12,
    acBonus: 12,
    abilityBonus: 6,
    special: ["Ability Score Increase", "Damage Reduction 15/magic"],
  },
  { level: 16, hd: 12, acBonus: 12, abilityBonus: 6, special: [] },
  { level: 17, hd: 13, acBonus: 14, abilityBonus: 7, special: [] },
  { level: 18, hd: 14, acBonus: 14, abilityBonus: 7, special: [] },
  { level: 19, hd: 15, acBonus: 14, abilityBonus: 7, special: [] },
  { level: 20, hd: 15, acBonus: 16, abilityBonus: 8, special: ["Damage Reduction 15/—"] },
];

/** The progression row for `level`, clamped to [1, 20] (no spiritualist below 1; the table caps at 20). */
export function phantomProgressionRow(level: number): PhantomProgressionRow {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  return PHANTOM_PROGRESSION[clamped - 1]!;
}

/** Every special-ability name unlocked by `level` (cumulative — union of every row up to and including it). */
export function phantomSpecialAbilityNames(level: number): string[] {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  const names: string[] = [];
  for (let i = 0; i < clamped; i++) {
    for (const name of PHANTOM_PROGRESSION[i]!.special) {
      if (name !== "Ability Score Increase") names.push(name);
    }
  }
  return names;
}

/** Display detail text for each one-time special ability a phantom can have (beyond its Emotional Focus's own). */
export const PHANTOM_SPECIAL_ABILITY_DETAIL: Readonly<Record<string, string>> = {
  Darkvision: "Darkvision out to 60 feet.",
  Link: "The spiritualist can handle the phantom as though it were an animal companion with the Link special ability.",
  "Share Spells":
    "The spiritualist may cast a spell targeting only herself on the phantom instead (touch range).",
  "Deliver Touch Spells":
    "The phantom can deliver the spiritualist's touch spells for her (30 ft.).",
  "Deliver Touch Spells (50 ft.)": "The phantom's touch-spell delivery range increases to 50 feet.",
  "Magic Attacks": "The phantom's slam attacks count as magic for overcoming damage reduction.",
  "Damage Reduction 5/magic": "DR 5/magic while manifested in ectoplasmic form.",
  "Damage Reduction 10/magic": "DR 10/magic while manifested in ectoplasmic form.",
  "Damage Reduction 15/magic": "DR 15/magic while manifested in ectoplasmic form.",
  "Damage Reduction 15/—": "DR 15/— (no longer bypassed by any weapon type) while ectoplasmic.",
  Devotion: "+4 morale bonus on Will saves against enchantment spells and effects.",
  "Incorporeal Flight": "Gains a 40 ft. fly speed while manifested in incorporeal form.",
};

/** Spiritualist levels at which a phantom gains an Ability Score Increase (PF1 RAW: 5th, 10th, 15th). */
export const PHANTOM_ABILITY_INCREASE_LEVELS: readonly number[] = [5, 10, 15];

/** How many Ability Score Increase slots a phantom has earned by `level`. */
export function phantomAbilityIncreaseSlots(level: number): number {
  return PHANTOM_ABILITY_INCREASE_LEVELS.filter((l) => l <= level).length;
}

/**
 * Medium phantom slam damage by spiritualist level (aonprd.com's "Table:
 * Phantom Slam Damage", paraphrased during authoring). Small/Large step one
 * rung down/up the standard PF1 natural-weapon damage-die ladder
 * (…1d4→1d6→1d8→1d10→2d6→2d8→2d10…) at each tier — this reproduces the
 * published 1st-level values exactly (Small 1d4, Medium 1d6, Large 1d8).
 */
const PHANTOM_SLAM_DAMAGE: Readonly<Record<"sm" | "med" | "lg", readonly string[]>> = {
  sm: ["1d4", "1d6", "1d10", "2d6"],
  med: ["1d6", "1d8", "2d6", "2d8"],
  lg: ["1d8", "1d10", "2d8", "2d10"],
};

/** Which of {@link PHANTOM_SLAM_DAMAGE}'s four tiers `level` falls into (1–4 / 5–12 / 13–16 / 17–20). */
function phantomSlamDamageTier(level: number): number {
  if (level >= 17) return 3;
  if (level >= 13) return 2;
  if (level >= 5) return 1;
  return 0;
}

/** The slam damage dice for a phantom of `size` at spiritualist `level`. */
export function phantomSlamDamage(size: "sm" | "med" | "lg", level: number): string {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)));
  return PHANTOM_SLAM_DAMAGE[size][phantomSlamDamageTier(clamped)]!;
}

export interface DerivedPhantomSkill {
  id: string;
  ability: AbilityId;
  total: number;
  components: ModifierComponent[];
}

export interface DerivedPhantomAttack {
  name: string;
  count: number;
  attack: number;
  damageDice: string;
  damageBonus: number;
}

export interface DerivedPhantomAc {
  normal: number;
  touch: number;
  flatFooted: number;
  components: ModifierComponent[];
}

/** The full derived stat block for a tracked phantom (`build.phantom`). */
export interface DerivedPhantom {
  focusId: string;
  focusName: string;
  name: string;
  size: "sm" | "med" | "lg";
  /** The spiritualist's total character level (the phantom's effective level). */
  level: number;
  hd: number;
  abilities: Record<AbilityId, { score: number; mod: number }>;
  hp: { max: number; current: number; nonlethal: number };
  init: number;
  ac: DerivedPhantomAc;
  saves: { fort: number; ref: number; will: number };
  bab: number;
  cmb: number;
  cmd: number;
  attacks: DerivedPhantomAttack[];
  skills: Record<string, DerivedPhantomSkill>;
  /** One-time special abilities unlocked so far (Darkvision, Link, Share Spells, Devotion, ...). */
  specialAbilities: { name: string; detail: string }[];
}

/**
 * Derive the tracked phantom's full stat block, or `undefined` when the
 * document has no `build.phantom`, or its `focus` isn't in
 * {@link EMOTIONAL_FOCI} — soft-warning posture, never a crash; the UI simply
 * shows nothing.
 *
 * The phantom's effective level is the spiritualist's own total character
 * level (PF1 RAW: the phantom's HD tracks the spiritualist's level 1:1, no
 * "effective level" indirection the way animal companions have from Nature
 * Bond/Hunter's Bond) — `derivePhantom` needs no master `DerivedSheet`
 * inputs, only `rollData` to evaluate any shared buffs' formulas, same as
 * `deriveCompanion`.
 */
export function derivePhantom(doc: CharacterDoc, rollData: RollData): DerivedPhantom | undefined {
  const build = doc.build.phantom;
  if (!build) return undefined;
  const focus = EMOTIONAL_FOCI[build.focus];
  if (!focus) return undefined;

  const level = Math.max(1, totalLevel(doc));
  const row = phantomProgressionRow(level);
  const hd = row.hd;
  const phantomBab = babForLevels("high", hd);
  const size = build.size ?? "med";
  const sizeAcMod = SIZE_AC_MOD[size];

  // --- ability scores: fixed base + automatic Dex/Cha table bonus + chosen ASIs
  const increaseSlots = phantomAbilityIncreaseSlots(level);
  const chosenIncreases = (build.abilityIncreases ?? []).slice(0, increaseSlots);
  const increaseBonus: Record<AbilityId, number> = {
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  };
  for (let i = 0; i < increaseSlots; i++) {
    const ability = chosenIncreases[i] ?? "cha";
    increaseBonus[ability] += 1;
  }
  const baseStr = PHANTOM_BASE_ABILITIES.str + increaseBonus.str;
  const baseDex = PHANTOM_BASE_ABILITIES.dex + row.abilityBonus + increaseBonus.dex;
  const baseCon = PHANTOM_BASE_ABILITIES.con + increaseBonus.con;
  const baseInt = PHANTOM_BASE_ABILITIES.int + increaseBonus.int;
  const baseWis = PHANTOM_BASE_ABILITIES.wis + increaseBonus.wis;
  const baseCha = PHANTOM_BASE_ABILITIES.cha + row.abilityBonus + increaseBonus.cha;

  let abilities: Record<AbilityId, { score: number; mod: number }> = {
    str: { score: baseStr, mod: abilityMod(baseStr) },
    dex: { score: baseDex, mod: abilityMod(baseDex) },
    con: { score: baseCon, mod: abilityMod(baseCon) },
    int: { score: baseInt, mod: abilityMod(baseInt) },
    wis: { score: baseWis, mod: abilityMod(baseWis) },
    cha: { score: baseCha, mod: abilityMod(baseCha) },
  };

  // --- shared buffs: evaluate + bucket by target (mirrors companion.ts) ------
  const sharedIds = new Set(doc.live.phantom?.sharedBuffIds ?? []);
  const sharedBuffs = (doc.live.activeBuffs ?? []).filter((b) => sharedIds.has(b.instanceId));
  const routed = routeSharedBuffs(sharedBuffs, rollData);

  abilities = applySharedAbilityBonuses(abilities, routed.ability, abilityMod);
  const strMod = abilities.str.mod;
  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;

  // --- HP: PF1 RAW average-per-HD (d10: 5.5/HD, rounded down) + Con mod/HD, min 1/HD ---
  const avgHpBeforeCon = Math.floor(5.5 * hd);
  const hpMax = Math.max(hd, avgHpBeforeCon + conMod * hd);

  // --- AC: flat natural-armor-type bonus regardless of manifestation (see module doc comment) ---
  const acCandidates: AcCandidate[] = [
    { category: "base", type: "base", value: 10, source: "Base" },
    { category: "dex", type: "untyped", value: dexMod, source: "Dexterity" },
    ...(row.acBonus !== 0
      ? [{ category: "natural", type: "untyped", value: row.acBonus, source: "Manifestation" }]
      : []),
    ...(sizeAcMod !== 0
      ? [{ category: "size", type: "size", value: sizeAcMod, source: "Size" }]
      : []),
    ...routed.ac,
  ];
  const TOUCH_CATEGORIES = new Set(["base", "dex", "size", "dodge", "deflection", "generic"]);
  const FLAT_FOOTED_CATEGORIES = new Set([
    "base",
    "armor",
    "shield",
    "natural",
    "size",
    "deflection",
    "generic",
  ]);
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

  // --- saves: two good (by Emotional Focus), one poor -----------------------
  const goodSaves = new Set(focus.goodSaves);
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

  // --- CMB/CMD ----------------------------------------------------------------
  const sizeSpecial = specialSizeMod(size);
  const cmb = phantomBab + strMod + sizeSpecial;
  const cmd = 10 + phantomBab + strMod + dexMod + sizeSpecial;

  // --- attacks: two slams, phantom's own BAB + better of Str/Dex + size -----
  const sharedAttackBonus = resolveStack(routed.attack).total;
  const sharedDamageBonus = resolveStack(routed.damage).total;
  const attackBonus = phantomBab + Math.max(strMod, dexMod) + sizeAcMod + sharedAttackBonus;
  const attacks: DerivedPhantomAttack[] = [
    {
      name: "Slam",
      count: 2,
      attack: attackBonus,
      damageDice: phantomSlamDamage(size, level),
      damageBonus: strMod + sharedDamageBonus,
    },
  ];

  // --- skills: exactly the Emotional Focus's two class skills, ranks = HD ---
  const skills: Record<string, DerivedPhantomSkill> = {};
  for (const id of focus.skills) {
    const ability = SKILL_ABILITY[id] ?? "int";
    const abilityModVal = abilities[ability].mod;
    const miscStack = resolveStack(routed.skill.get(id) ?? []);
    const components: ModifierComponent[] = [
      { source: "Hit Dice", type: "untyped", value: hd, applied: true },
      { source: "Class skill", type: "untyped", value: 3, applied: true },
      ...miscStack.modifiers.map((m) => ({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
      })),
    ];
    skills[id] = {
      id,
      ability,
      total: hd + abilityModVal + 3 + miscStack.total,
      components,
    };
  }

  const specialAbilities = [
    { name: focus.name, detail: focus.detail },
    ...phantomSpecialAbilityNames(level).map((name) => ({
      name,
      detail: PHANTOM_SPECIAL_ABILITY_DETAIL[name] ?? "",
    })),
  ];

  return {
    focusId: build.focus,
    focusName: focus.name,
    name: build.name,
    size,
    level,
    hd,
    abilities,
    hp: {
      max: hpMax,
      current: hpMax - (doc.live.phantom?.damage ?? 0),
      nonlethal: doc.live.phantom?.nonlethal ?? 0,
    },
    init: dexMod + resolveStack(routed.init).total,
    ac: { normal: acNormal, touch: acTouch, flatFooted: acFlatFooted, components: acComponents },
    saves,
    bab: phantomBab,
    cmb,
    cmd,
    attacks,
    skills,
    specialAbilities,
  };
}
