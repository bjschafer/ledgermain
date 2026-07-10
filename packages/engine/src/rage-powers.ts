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
 * skill bonuses, Low-Light Vision, Scent, ...). The WHILE-RAGING shape used
 * to need a "gate this build choice's Change by whether a specific buff is
 * currently active" mechanism the engine didn't have (unlike a genuinely
 * always-on class feature or feat, or a buff's OWN `changes[]`, which
 * naturally only apply while that buff instance is active) — issue #75 adds
 * exactly that mechanism (`Change.activeWhenBuff`, gated at collect-time by
 * `@pf1/engine` `collect.ts`'s `buffGateSatisfied`), so a clean subset of
 * the while-raging entries below is now promoted off `displayOnly`:
 *
 *   - **Raging Climber** / **Raging Swimmer**: RAW is an ENHANCEMENT bonus
 *     equal to barbarian level on Climb / Swim checks respectively — NOT the
 *     flat "+4 competence" this file's `contextNotes` used to (incorrectly)
 *     claim before this change (verified against d20pfsrd.com's Raging
 *     Climber/Raging Swimmer entries, both stating "adds her level as an
 *     enhancement bonus" verbatim). Promoted to a real gated `Change`
 *     targeting the whole skill (Climb/Swim have no partial-use-case split
 *     the way Acrobatics does), typed `enhancement` (so it correctly does
 *     NOT stack with another enhancement source on the same skill, per RAW).
 *   - **Swift Foot**: RAW is a flat +5 ft. ENHANCEMENT bonus to land speed
 *     while raging (confirmed unscaled — d20pfsrd.com), takeable up to 3
 *     times with stacking effect. The rage-power picker (`build.ragePowers`,
 *     a plain string-id array via `toggleRagePower` in
 *     `apps/web/src/model/ragePowers.ts`) has no duplicate-instance support
 *     today (unlike the "Extra Rage Power"-style repeatable-FEAT mechanism
 *     from issue #58's `build.extraFeats`) — this ships the single-instance
 *     +5 ft. version only; taking Swift Foot a 2nd/3rd time has no
 *     additional effect until a rage-power duplicate-instance mechanism
 *     exists (same class of documented limitation, not a new one).
 *
 * Two while-raging entries are deliberately LEFT display-only despite the
 * new mechanism existing — the honest call, not an oversight:
 *
 *   - **Superstition**: the morale bonus is scoped to saves "against spells,
 *     supernatural abilities, and spell-like abilities" only (verified:
 *     d20pfsrd.com/multiple SRD mirrors) — the engine has no "saves vs a
 *     source-category" conditional target (only whole-save-type targets
 *     like `will`/`allSavingThrows`), so an unconditional gated Change here
 *     would apply the bonus to EVERY save (including ones with no spell/Su/
 *     SLA origin), overstating it. `contextNotes` still carries the exact
 *     numbers/scaling (already correct pre-#75: +2 at 1st, +1/4 levels).
 *   - **Raging Leaper**: RAW is the identical enhancement-bonus-equal-to-
 *     level shape as Climber/Swimmer above, but scoped to Acrobatics checks
 *     "made to jump" only (verified: d20pfsrd.com) — Acrobatics also covers
 *     balance/tumble/etc., so an unconditional gated Change on `skill.acr`
 *     would overstate it the same way Superstition would. Same honest-call
 *     rule; `contextNotes` corrected to state the enhancement (not
 *     competence) bonus type and level-equal scaling.
 *
 * Sense grants (Low-Light Vision, Scent) are NOT promoted even though they
 * ARE unconditional-while-raging — beneficial "set"-change grants are a
 * documented engine hazard (`compute.ts` resolves competing "set" changes on
 * a sense/speed target by LOWEST value, which is tuned for penalties like
 * Slow, not beneficial grants — see `shifter-aspects.ts`'s Bat/Wolf entries
 * for the identical carve-out) — these stay `displayOnly` regardless of the
 * new gate mechanism.
 *
 * `contextNotes` carries the exact numbers/scaling/activation-cost for every
 * still-display-only entry, and `minLevel` gates soft-warn (never block) the
 * same way `WitchHexDef.minLevel`/`MagusArcanaDef.minLevel` do.
 */

import type { BuffGate, Change, ContextNote } from "@pf1/schema";

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
  /**
   * Typed modifiers this power grants — empty for most entries (see file doc
   * comment). The handful promoted by issue #75 carry a real `Change` gated
   * by `activeWhenBuff` (see `WHILE_RAGING`), applied only while the
   * character has the (chained or Unchained) Rage buff active.
   */
  changes: Change[];
  /** Non-mechanical reminders (exact numbers, scaling, activation cost, prerequisites). */
  contextNotes?: ContextNote[];
  /**
   * True when this power has no live `Change` at all — a pure per-round
   * activated ability, or one of the two conditional-target near-misses
   * (Superstition, Raging Leaper) deliberately left note-only even though
   * the while-raging gate mechanism exists (see file doc comment). False
   * for the small set of unconditional-while-raging entries promoted to a
   * real gated `Change`.
   */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const BOTH: readonly RagePowerEdition[] = ["barbarian", "barbarianUnchained"];

/**
 * The "while raging" buff gate (issue #75): matches EITHER vendored Rage
 * buff — chained "Rage" (`RefData.buffs` id `UgjpRD8vtiSWRxuL`) or
 * Unchained "Rage (Unchained)" (`ciAO4KwMonUzAGY0`) — since this table is
 * shared by both barbarian editions (see file doc comment) and a rage power
 * doesn't care which edition granted it, only whether the character is
 * CURRENTLY raging. Both ids pinned against real vendored refdata by a
 * fixture test in `ragePowers.test.ts` rather than hardcoded from memory —
 * see that test for the `loadRefData()` lookup that confirms them.
 *
 * Deliberately does NOT include skald Inspired Rage's hand-authored
 * `effectTag: "ragingSong:inspiredRage"` (`raging-song.ts`): RAW, an ally
 * affected by Inspired Rage does not thereby gain the use of the
 * BARBARIAN's rage powers — that requires the skald to separately have the
 * Ultimate Combat "Master Skald" class feature, which this app doesn't model
 * at all yet. Inspired Rage grants its own flat Str/Con/Will/AC changes
 * (see `raging-song.ts`'s `INSPIRED_RAGE_CHANGES`) — it is not "morally
 * Rage" for rage-power purposes, so including its `effectTag` here would let
 * a skald's song silently unlock rage powers RAW never grants it.
 */
const WHILE_RAGING: BuffGate = { buffIds: ["UgjpRD8vtiSWRxuL", "ciAO4KwMonUzAGY0"] };

/** `@classes.barbarian.level + @classes.barbarianUnchained.level` — see `apps/web/src/model/ragePowers.ts`'s `barbarianLevel` for why summing both is correct (a character only ever truly has one, but summing is safe regardless). Missing class paths resolve to 0 (Foundry roll-data convention). */
const BARBARIAN_LEVEL_SUM = "@classes.barbarian.level + @classes.barbarianUnchained.level";

interface RawPower {
  id: string;
  name: string;
  minLevel: number;
  summary: string;
  contextNotes?: ContextNote[];
  /** Real gated (or, in principle, unconditional) Changes — empty/omitted for every non-promoted entry, see file doc comment. */
  changes?: Change[];
}

function build(entries: RawPower[]): RagePowerDef[] {
  return entries.map((e) => {
    const changes = e.changes ?? [];
    return {
      id: e.id,
      name: e.name,
      minLevel: e.minLevel,
      summary: e.summary,
      editions: BOTH,
      changes,
      contextNotes: e.contextNotes,
      displayOnly: changes.length === 0,
    };
  });
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
    summary: "Enhancement bonus equal to barbarian level on Climb checks while raging.",
    changes: [
      {
        formula: BARBARIAN_LEVEL_SUM,
        target: "skill.clm",
        type: "enhancement",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
  },
  {
    id: "ragingLeaper",
    name: "Raging Leaper",
    minLevel: 1,
    summary:
      "Enhancement bonus equal to barbarian level on Acrobatics checks made to jump while raging (always counts as a running start).",
    contextNotes: [
      note(
        "Enhancement bonus equal to barbarian level, on jump checks only (not general Acrobatics) — while the raging buff is active; also always counts as having a running start.",
        "skill.acr",
      ),
    ],
  },
  {
    id: "ragingSwimmer",
    name: "Raging Swimmer",
    minLevel: 1,
    summary: "Enhancement bonus equal to barbarian level on Swim checks while raging.",
    changes: [
      {
        formula: BARBARIAN_LEVEL_SUM,
        target: "skill.swm",
        type: "enhancement",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
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
    changes: [
      { formula: "5", target: "landSpeed", type: "enhancement", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note(
        "RAW: can be taken up to 3 times, stacking (+5/+10/+15 ft. total). This app's rage-power picker has no duplicate-instance support yet (see file doc comment) — only the single +5 ft. instance is modeled; a 2nd/3rd copy currently has no additional effect.",
        "landSpeed",
      ),
    ],
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
