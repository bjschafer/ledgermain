/**
 * Clean-room PF1 rage power table (Core Rulebook + Advanced Player's Guide
 * "core" set, issue #65/#67): hand-authored from the published rules
 * (verified against aonprd.com/d20pfsrd.com), mirroring `witch-hexes.ts`'s /
 * `alchemist-discoveries.ts`'s posture — rage powers are NOT part of the
 * vendored Foundry data pack (the Barbarian/Barbarian Unchained class defs
 * only link the generic "Rage Powers" stub `ClassFeature`, no per-power
 * breakdown — confirmed: `class-features.json` carries no per-rage-power
 * entries), so there is no upstream JSON to normalize.
 *
 * Scope: 30 entries — the 23 Core Rulebook rage powers plus 7 commonly-taken
 * Advanced Player's Guide additions (Superstition, Witch Hunter, Good For
 * What Ails You, Internal Fortitude, Sixth Sense, Spell Sunder, Swift Foot).
 * The remaining ~150+ splatbook rage powers (Totem chains, Bloodrager-shared
 * powers, Ultimate-line additions, ...) are OUT OF SCOPE — add them in a
 * follow-up, same posture as `witch-hexes.ts`/`magus-arcana.ts` scoping down
 * to a curated core set rather than the full published catalog.
 *
 * Shared by BOTH `barbarian` (chained) and `barbarianUnchained` — Pathfinder
 * Unchained's own "Rage Powers" class feature restates rather than replaces
 * the existing catalog ("a barbarian who uses this system can select from
 * the existing options presented in the Core Rulebook and other Pathfinder
 * RPG products"), so every entry below defaults to BOTH editions in
 * `editions` (the field exists so a future entry found to be chained-only or
 * unchained-only can narrow it — this table doesn't currently have one).
 *
 * Modelling posture (mirrors witch-hexes.ts's honesty bar): every rage power
 * here is either a per-rage/per-round ACTIVATED ability (Powerful Blow,
 * Renewed Vigor, Strength Surge, Surprise Accuracy, Guarded Stance, Rolling
 * Dodge, ...) or a bonus that only applies WHILE RAGING specifically
 * (Superstition's save bonus vs. spells, the Raging Climber/Leaper/Swimmer
 * skill bonuses, Low-Light Vision, Scent, ...). Both shapes need a
 * "gate this build choice's Change by whether a specific buff is currently
 * active" mechanism the engine doesn't have today (unlike a genuinely
 * always-on class feature or feat, or a buff's OWN `changes[]`, which
 * naturally only apply while that buff instance is active) — building one
 * for this single table is out of scope, same "near miss, not worth new
 * infra for one table" call `oracle-revelations.ts`/`witch-hexes.ts` already
 * made for their own conditional/activated near-misses. So EVERY entry here
 * is `displayOnly: true` with `changes: []`; `contextNotes` carries the exact
 * numbers/scaling/activation-cost instead, and `minLevel` gates soft-warn
 * (never block) the same way `WitchHexDef.minLevel`/`MagusArcanaDef.minLevel` do.
 */

import type { Change, ContextNote } from "@pf1/schema";

export type RagePowerEdition = "barbarian" | "barbarianUnchained";

export interface RagePowerDef {
  id: string;
  name: string;
  /** Earliest barbarian level this power can be selected at (1 = no prerequisite beyond having the class feature). Soft-filtered only. */
  minLevel: number;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Which barbarian edition(s) can select this power — see file doc comment on why every entry defaults to both. */
  editions: readonly RagePowerEdition[];
  /** Typed modifiers granted unconditionally (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (exact numbers, scaling, activation cost, prerequisites). */
  contextNotes?: ContextNote[];
  /** Always true here — no power has a flat always-on, unconditional numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const BOTH: readonly RagePowerEdition[] = ["barbarian", "barbarianUnchained"];

interface RawPower {
  id: string;
  name: string;
  minLevel: number;
  summary: string;
  contextNotes?: ContextNote[];
}

function build(entries: RawPower[]): RagePowerDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    minLevel: e.minLevel,
    summary: e.summary,
    editions: BOTH,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const RAGE_POWER_LIST: RagePowerDef[] = build([
  {
    id: "animalFury",
    name: "Animal Fury",
    minLevel: 1,
    summary: "Gain a bite natural attack while raging, usable as part of a full attack.",
    contextNotes: [
      note(
        "1d4 damage (1d3 if Small); no natural-attack builder in this app — add the bite manually to Weapons while raging.",
      ),
    ],
  },
  {
    id: "clearMind",
    name: "Clear Mind",
    minLevel: 8,
    summary: "Once per rage, reroll a failed Will save (must take the second result).",
  },
  {
    id: "fearlessRage",
    name: "Fearless Rage",
    minLevel: 12,
    summary:
      "Immune to the fear condition while raging (but not other emotion effects), and can keep fighting below 0 HP without falling unconscious for one extra round.",
  },
  {
    id: "guardedStance",
    name: "Guarded Stance",
    minLevel: 1,
    summary:
      "Move action: gain a +1 dodge bonus to AC against melee attacks (scaling +1/6 levels) for rounds equal to Con modifier (min 1).",
    contextNotes: [note("Activated (move action, no AoO); scales +1 at 7th/13th/19th.", "ac")],
  },
  {
    id: "increasedDamageReduction",
    name: "Increased Damage Reduction",
    minLevel: 8,
    summary: "Barbarian's DR/— increases by 1 (stacks with itself if taken again).",
    contextNotes: [
      note("Stacks with the base barbarian DR progression; can be taken more than once.", "dr"),
    ],
  },
  {
    id: "intimidatingGlare",
    name: "Intimidating Glare",
    minLevel: 1,
    summary: "Move action: attempt an Intimidate check to demoralize a foe while raging.",
  },
  {
    id: "knockback",
    name: "Knockback",
    minLevel: 1,
    summary: "Substitute a bull rush (no AoO, no move) for a melee attack while raging.",
  },
  {
    id: "lowLightVision",
    name: "Low-Light Vision",
    minLevel: 1,
    summary: "Gain low-light vision while raging (or double existing range).",
  },
  {
    id: "momentOfClarity",
    name: "Moment of Clarity",
    minLevel: 1,
    summary:
      "Free action: end all rage effects for 1 round to act as if not raging (e.g. to cast a spell), without ending the rage itself.",
  },
  {
    id: "noEscape",
    name: "No Escape",
    minLevel: 1,
    summary:
      "Immediate action: move up to double speed when an adjacent foe moves away, while raging.",
  },
  {
    id: "powerfulBlow",
    name: "Powerful Blow",
    minLevel: 1,
    summary:
      "Swift action before an attack roll: +1 bonus on a single damage roll (scaling +1/4 levels), once per rage.",
    contextNotes: [
      note("Swift action, once per rage; scales +1 at 4th/8th/12th/16th/20th.", "damage"),
    ],
  },
  {
    id: "quickReflexes",
    name: "Quick Reflexes",
    minLevel: 1,
    summary: "Gain one extra attack of opportunity per round while raging.",
  },
  {
    id: "ragingClimber",
    name: "Raging Climber",
    minLevel: 1,
    summary: "+4 competence bonus on Climb checks while raging.",
    contextNotes: [note("+4 competence bonus, only while the raging buff is active.", "skill.clm")],
  },
  {
    id: "ragingLeaper",
    name: "Raging Leaper",
    minLevel: 1,
    summary: "+4 competence bonus on Acrobatics checks made to jump while raging.",
    contextNotes: [
      note(
        "+4 competence bonus on jump checks only, while the raging buff is active.",
        "skill.acr",
      ),
    ],
  },
  {
    id: "ragingSwimmer",
    name: "Raging Swimmer",
    minLevel: 1,
    summary: "+4 competence bonus on Swim checks while raging.",
    contextNotes: [note("+4 competence bonus, only while the raging buff is active.", "skill.swm")],
  },
  {
    id: "recklessAbandon",
    name: "Reckless Abandon",
    minLevel: 1,
    summary:
      "While raging, take a penalty on AC to gain an equal bonus on attack rolls (up to Con modifier, adjustable each round).",
    contextNotes: [
      note(
        "Player-set trade, up to Con mod, adjustable at the start of each turn while raging.",
        "attack",
      ),
    ],
  },
  {
    id: "renewedVigor",
    name: "Renewed Vigor",
    minLevel: 4,
    summary:
      "Standard action, once per day while raging: heal 1d8 + Con modifier damage (scaling +1d8/4 levels above 4th, max 5d8).",
    contextNotes: [
      note("Once per day, only while raging; 1d8+Con at 4th, up to 5d8+Con at 20th.", "hp"),
    ],
  },
  {
    id: "rollingDodge",
    name: "Rolling Dodge",
    minLevel: 1,
    summary:
      "Move action: gain a +1 dodge bonus to AC against ranged attacks (scaling +1/6 levels) for rounds equal to Con modifier (min 1).",
    contextNotes: [note("Activated (move action); scales +1 at 7th/13th/19th.", "ac")],
  },
  {
    id: "rousedAnger",
    name: "Roused Anger",
    minLevel: 1,
    summary:
      "Can enter rage even while fatigued; ending this rage leaves the barbarian exhausted instead of fatigued.",
  },
  {
    id: "scent",
    name: "Scent",
    minLevel: 1,
    summary: "Gain the scent ability while raging.",
  },
  {
    id: "strengthSurge",
    name: "Strength Surge",
    minLevel: 1,
    summary:
      "Swift action, once per rage: +1 enhancement bonus per two barbarian levels on a single Strength check, combat maneuver check, or to CMD when resisting one.",
    contextNotes: [note("Swift action, once per rage; +1 per 2 barbarian levels.", "cmb")],
  },
  {
    id: "surpriseAccuracy",
    name: "Surprise Accuracy",
    minLevel: 1,
    summary:
      "Swift action, once per rage: +1 morale bonus per four barbarian levels on a single attack roll.",
    contextNotes: [note("Swift action, once per rage; +1 per 4 barbarian levels.", "attack")],
  },
  {
    id: "terrifyingHowl",
    name: "Terrifying Howl",
    minLevel: 8,
    summary:
      "Standard action (requires Intimidating Glare): frighten every foe within 30 ft. who hears the howl and fails a Will save.",
    contextNotes: [
      note("Requires Intimidating Glare; Will save DC = 10 + 1/2 barbarian level + Cha mod."),
    ],
  },
  {
    id: "superstition",
    name: "Superstition",
    minLevel: 1,
    summary:
      "+2 morale bonus (scaling +1/4 levels) on saves against spells, spell-like abilities, and supernatural abilities while raging; but must save against all such effects, even beneficial ones from allies.",
    contextNotes: [
      note(
        "+2 vs. spells/SLAs/Su only, scaling +1 at 4th/8th/12th/16th/20th, only while raging — no target for a saves-vs-a-category-only bonus, so this is manual.",
        "allSavingThrows",
      ),
    ],
  },
  {
    id: "witchHunter",
    name: "Witch Hunter",
    minLevel: 1,
    summary:
      "+2 bonus on damage rolls against creatures with hexes, and +2 on saves against hexes, while raging.",
    contextNotes: [note("+2 damage/+2 save vs. hexes only, only while raging.", "damage")],
  },
  {
    id: "goodForWhatAilsYou",
    name: "Good For What Ails You",
    minLevel: 4,
    summary:
      "Requires Renewed Vigor: using Renewed Vigor also cures the barbarian of one poison, disease, or ability-damage-draining effect currently affecting her.",
    contextNotes: [note("Requires Renewed Vigor; triggers whenever Renewed Vigor is used.")],
  },
  {
    id: "internalFortitude",
    name: "Internal Fortitude",
    minLevel: 8,
    summary: "Immune to the sickened and nauseated conditions while raging.",
  },
  {
    id: "sixthSense",
    name: "Sixth Sense",
    minLevel: 8,
    summary: "+2 insight bonus to initiative and cannot be caught flat-footed while raging.",
    contextNotes: [note("+2 insight to initiative, only while raging.", "init")],
  },
  {
    id: "spellSunder",
    name: "Spell Sunder",
    minLevel: 8,
    summary:
      "As an attack of opportunity, forgo an attack against a spellcaster to instead attempt to dispel one of their active spells (as targeted greater dispel magic).",
  },
  {
    id: "swiftFoot",
    name: "Swift Foot",
    minLevel: 1,
    summary: "+5 ft. enhancement bonus to land speed while raging.",
    contextNotes: [note("+5 ft. land speed, only while raging.", "landSpeed")],
  },
]);

export const RAGE_POWERS: Record<string, RagePowerDef> = Object.fromEntries(
  RAGE_POWER_LIST.map((p) => [p.id, p]),
);

export const RAGE_POWER_IDS: readonly string[] = RAGE_POWER_LIST.map((p) => p.id);

/** All rage powers available to a given edition, in table order. */
export function ragePowersForEdition(edition: RagePowerEdition): RagePowerDef[] {
  return RAGE_POWER_LIST.filter((p) => p.editions.includes(edition));
}
