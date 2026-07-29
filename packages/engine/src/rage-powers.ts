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
 * Scope: 29 entries — the 23 Core Rulebook rage powers plus 6 commonly-taken
 * Advanced Player's Guide additions (Superstition, Witch Hunter, Good For
 * What Ails You, Internal Fortitude, Spell Sunder, Swift Foot). A former
 * 30th entry, "Sixth Sense", was removed (see the note below).
 * The remaining ~150+ splatbook rage powers (Totem chains, Bloodrager-shared
 * powers, Ultimate-line additions, ...) were OUT OF SCOPE as of the above —
 * a full-catalog #74 parity sweep is now in progress across this file (same
 * posture as `witch-hexes.ts`/`alchemist-discoveries.ts`'s own #74 passes):
 * batch 1 of 3 (A-F, +70 entries) has landed below; batches 2-3 (G-Z) follow.
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
 *
 * A follow-up audit (re-checking every remaining entry against
 * aonprd.com/d20pfsrd.com for a promotable Change) found no further
 * candidates that clear the bar, but did turn up both new near-misses worth
 * recording and — separately — several entries whose `summary`/
 * `contextNotes` didn't match verified RAW at all (now corrected below,
 * same "factually wrong, fix it" posture as everywhere else in this repo):
 *
 *   - **Fearless Rage**: real RAW (CRB, verified against both
 *     legacy.aonprd.com's Core Rulebook page and d20pfsrd.com) is "immune to
 *     the shaken and frightened conditions" only — not "the fear condition"
 *     generically, and with no below-0-HP/unconsciousness clause (that
 *     clause doesn't exist in the actual power; this file's old summary
 *     fabricated it). Even corrected, it's still a near-miss for promotion:
 *     the engine's only fear-adjacent target, `immEffect.fear` ("fear
 *     effects"), reads as the whole fear family INCLUDING panicked, which
 *     Fearless Rage does not grant immunity to — same over-broad-target
 *     shape as Superstition, so it stays displayOnly.
 *   - **Witch Hunter** and **Spell Sunder**: both `summary`/`contextNotes`
 *     described a different mechanic than the real rage power (Witch
 *     Hunter's bonus targets creatures with spells/SLAs, not "hexes", and
 *     has no save-bonus clause; Spell Sunder requires the Witch Hunter power
 *     at barbarian level 6, not a standalone level-8 pick, and is a combat
 *     maneuver check against a spell effect, not an attack-of-opportunity
 *     dispel) — corrected below, verified against d20pfsrd.com's dedicated
 *     page for each. Neither is a promotion candidate regardless (both
 *     target-scoped/once-per-rage, same as before).
 *   - **Good For What Ails You**: corrected — real RAW (d20pfsrd.com) is
 *     "drink alcohol while raging to re-attempt a save against one of a
 *     listed set of conditions, or against an active poison"; this file's
 *     old summary described an unrelated Renewed-Vigor-gated cure that
 *     isn't the power's actual text. Still not a promotion candidate
 *     (triggered, situational, no flat number).
 *   - **Increased Damage Reduction**: "+1/— while raging, stacks up to 3
 *     times" (d20pfsrd.com) looks identical in shape to Raging
 *     Climber/Swift Foot, but `defenses.ts`'s `groupByQualifier` resolves
 *     competing `dr` modifiers by taking the HIGHEST value per qualifier,
 *     not summing them (DR generally doesn't stack in PF1, unlike a typed
 *     bonus) — a separate gated Change here would be silently swallowed by
 *     the barbarian's own (larger) base DR entry rather than adding to it,
 *     which is a WRONG number, not an honestly-partial one. Correctly
 *     representing this needs a `defenses.ts`-side change (out of this
 *     file's scope), not a rage-powers.ts Change.
 *   - **Internal Fortitude**: immunity to sickened/nauseated while raging
 *     would otherwise be a clean `immEffect`-gated Change, but neither
 *     condition is in `defenses.ts`'s `EFFECT_IMMUNITY_LABELS` closed
 *     vocabulary (only `fear`/`poison`/`disease`/... — no sickened/nauseated
 *     slug exists today) — a new-target addition, out of this file's scope.
 *   - **Guarded Stance** / **Rolling Dodge**: a +1 (scaling) dodge AC bonus
 *     vs. melee/ranged respectively, but each is its OWN move-action
 *     activation with its own Con-modifier-round duration (verified:
 *     d20pfsrd.com) — not simply "on while raging" the way Swift Foot is.
 *     Shape-matches the toggle-buff-pool pattern (`judgments.ts`'s
 *     `ToggleBuffOption`) better than the `activeWhenBuff` gate; flagged as
 *     a toggle-buff candidate, not implemented (needs `resources.ts`
 *     plumbing beyond this file).
 *   - **Sixth Sense**: REMOVED. An audit could not corroborate it as a
 *     real barbarian rage power in any Paizo source — aonprd.com and
 *     d20pfsrd.com's full Paizo rage-power index both lack it, and it never
 *     matched the vendored catalog under any key. The only published
 *     "Sixth Sense" is the Superstitious archetype's own class feature,
 *     with different numbers and no raging gate. A stale `sixthSense` pick
 *     in a saved doc resolves to nothing, same as any unknown id.
 *
 * The remaining ~20 entries in this table were spot-checked, not
 * exhaustively re-verified line-by-line against source in this pass — the
 * error rate found above (4 of the 7 APG additions this file's own scope
 * note calls out by name) suggests a fuller correctness audit of the CRB
 * portion is worth doing as a follow-up, separate from this promotion sweep.
 */

import type { BuffGate, Change, ContextNote, RagePower, RefData, SourceRef } from "@pf1/schema";

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
    summary: "Immune to the shaken and frightened conditions while raging.",
    contextNotes: [
      note(
        "Immune to shaken/frightened only (not panicked or other fear/emotion effects), only while raging — the engine's only fear-adjacent target (immEffect.fear) reads as the whole fear family including panicked, so an unconditional gated Change here would overstate it (same over-broad-target issue as Superstition).",
      ),
    ],
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
      "+1 bonus on damage rolls (scaling +1/4 levels) against creatures possessing spells or spell-like abilities, while raging.",
    contextNotes: [
      note(
        "+1 damage vs. creatures with spells/SLAs, scaling +1 at 4th/8th/12th/16th/20th, only while raging — no save-bonus clause; target-scoped (which creature you're fighting), so not a Change on the barbarian's own sheet.",
        "damage",
      ),
    ],
  },
  {
    id: "goodForWhatAilsYou",
    name: "Good For What Ails You",
    minLevel: 4,
    summary:
      "While raging, drinking a dose of alcohol lets you re-attempt a saving throw against one of several ongoing conditions (blinded, confused, dazzled, deafened, exhausted, fatigued, frightened, nauseated, panicked, shaken, sickened) or against a poison currently affecting you.",
    contextNotes: [
      note(
        "Triggered by drinking alcohol while raging; success suppresses the chosen condition for the rage's duration, or counts as one save toward curing the poison.",
      ),
    ],
  },
  {
    id: "internalFortitude",
    name: "Internal Fortitude",
    minLevel: 8,
    summary: "Immune to the sickened and nauseated conditions while raging.",
  },
  {
    id: "spellSunder",
    name: "Spell Sunder",
    minLevel: 6,
    summary:
      "Requires Witch Hunter. Once per rage, attempt to sunder an ongoing spell effect with a combat maneuver check against CMD 15 + the effect's caster level (or the target's CMD + 5 for an effect on a creature); exceeding it by 5+ suppresses the effect for extra rounds, by 10+ dispels it outright. Also ignores miss chances from spells/SLAs.",
    contextNotes: [
      note(
        "Requires the Witch Hunter rage power and barbarian level 6 (not a standalone level-8 pick); once per rage, roll the combat maneuver check manually.",
      ),
    ],
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

  /* ---------------------------------------------------------- #74 sweep, batch 1 (A-F) -- */

  {
    id: "abyssalBlood",
    name: "Abyssal Blood",
    minLevel: 6,
    summary:
      "Once per day when entering a rage, grow one size category larger, as enlarge person (even if not humanoid).",
    contextNotes: [note("Requires Lesser Abyssal Blood and barbarian level 6.")],
  },
  {
    id: "accurateStance",
    name: "Accurate Stance",
    minLevel: 1,
    summary:
      "Stance: while active, +1 competence bonus on melee and thrown weapon attack rolls, scaling +1 per 4 barbarian levels.",
    contextNotes: [
      note(
        "Activated stance (own move action to enter/exit), not simply on-while-raging — not modeled as a Change.",
        "attack",
      ),
    ],
  },
  {
    id: "airTotem",
    name: "Air Totem",
    minLevel: 6,
    summary: "Once per rage, move for 1 round as if under the effect of air walk.",
    contextNotes: [
      note("Requires having chosen air with Lesser Elemental Totem, and barbarian level 6."),
    ],
  },
  {
    id: "ancestorTotem",
    name: "Ancestor Totem",
    minLevel: 6,
    summary:
      "Raises Lesser Ancestor Totem's insight bonus to +4 and lets it apply to any skill — even a Cha/Dex/Int-based one, or one requiring patience/concentration — usable while raging.",
    contextNotes: [
      note(
        "Requires Lesser Ancestor Totem (which sets which skill) and barbarian level 6; the skill choice is free-text from that earlier pick, not a fixed Change target.",
      ),
    ],
  },
  {
    id: "armorRipper",
    name: "Armor Ripper",
    minLevel: 1,
    summary: "While raging, +2 on combat maneuver checks to sunder with a natural attack.",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled). Scoped to sunder maneuvers with natural attacks only — the engine's cmb target is whole-maneuver, so an unconditional Change here would overstate onto every combat maneuver.",
        "cmb",
      ),
    ],
  },
  {
    id: "aryzulsCurse",
    name: "Aryzul's Curse",
    minLevel: 6,
    summary:
      "While raging, emanates a 5-ft. aura (10-ft. at 12th, by choice) that cumulatively saps Strength (-2/round per creature, Fortitude negates, capped at barbarian level) from creatures who start their turn in it.",
    contextNotes: [
      note(
        "Requires Lesser Elemental Rage/Blood (or, for an unchained barbarian, adopting the Elemental Stance rage power); only one elemental rage power usable at a time; barbarian level 6. Affects enemies, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "atavismTotem",
    name: "Atavism Totem",
    minLevel: 6,
    summary:
      "Gain ferocity (can keep fighting while disabled/dying instead of falling unconscious).",
    contextNotes: [
      note(
        "Requires Lesser Atavism Totem and barbarian level 6; ferocity isn't tracked as a Change.",
      ),
    ],
  },
  {
    id: "auspiciousMark",
    name: "Auspicious Mark",
    minLevel: 1,
    summary:
      "Once per rage, as a swift action costing 2 rounds of rage, add +1d6 to a d20 roll already made (after seeing the result).",
  },
  {
    id: "autumnRage",
    name: "Autumn Rage",
    minLevel: 1,
    summary:
      "While raging, +2 on combat maneuver checks to reposition or trip, and the same bonus on attack rolls to confirm critical hits.",
    contextNotes: [
      note(
        "Only one season-themed rage power (spring/summer/autumn/winter) can be known at a time. Scoped to reposition/trip maneuvers and crit confirmation only — the engine's cmb target is whole-maneuver, so this stays note-only.",
        "cmb",
      ),
    ],
  },
  {
    id: "battleRoar",
    name: "Battle Roar",
    minLevel: 6,
    summary:
      "When Intimidating Glare successfully demoralizes a foe, also deal 1d6 sonic damage to it.",
    contextNotes: [note("Requires Intimidating Glare and barbarian level 6.")],
  },
  {
    id: "beastTotem",
    name: "Beast Totem",
    minLevel: 6,
    summary: "While raging, +1 natural armor bonus, scaling +1 per 4 barbarian levels.",
    changes: [
      {
        formula: `1 + max(0, floor((${BARBARIAN_LEVEL_SUM} - 6) / 4))`,
        target: "nac",
        type: "natural",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
    contextNotes: [
      note(
        "Requires Lesser Beast Totem and barbarian level 6; scaling verified as +1 at 6th, +2 at 10th, +3 at 14th, +4 at 18th (d20pfsrd.com).",
        "nac",
      ),
    ],
  },
  {
    id: "bestialClimber",
    name: "Bestial Climber",
    minLevel: 6,
    summary: "While raging, gain a natural climb speed equal to land speed.",
    contextNotes: [
      note(
        "Requires Raging Climber and barbarian level 6. Not modeled as a Change: a climbSpeed formula can only see the pre-buff BASE land speed in roll data (see buildRollData), not the final post-bonus value, so an automatic grant could understate the real number (e.g. once Swift Foot is also active).",
        "climbSpeed",
      ),
    ],
  },
  {
    id: "bestialFlyer",
    name: "Bestial Flyer",
    minLevel: 6,
    summary:
      "While raging, fly speed increases by 10 ft. and maneuverability improves one category.",
    contextNotes: [
      note(
        "Requires already having a fly speed before raging, the Raging Flyer rage power (not in this table), and barbarian level 6.",
        "flySpeed",
      ),
    ],
  },
  {
    id: "bestialLeaper",
    name: "Bestial Leaper",
    minLevel: 6,
    summary:
      "While raging, may take a move action to move and take her normal standard action at any point during that move.",
    contextNotes: [note("Requires Raging Leaper and barbarian level 6.")],
  },
  {
    id: "bestialSwimmer",
    name: "Bestial Swimmer",
    minLevel: 6,
    summary: "While raging, gain a natural swim speed equal to land speed.",
    contextNotes: [
      note(
        "Requires Raging Swimmer and barbarian level 6. Same not-modeled reasoning as Bestial Climber — a swimSpeed formula can't see the final post-bonus land speed.",
        "swimSpeed",
      ),
    ],
  },
  {
    id: "bleedingBlow",
    name: "Bleeding Blow",
    minLevel: 8,
    summary:
      "When using Powerful Blow, also deal matching bleed damage (bypasses damage reduction).",
    contextNotes: [note("Requires Powerful Blow and barbarian level 8.")],
  },
  {
    id: "bloodyBite",
    name: "Bloody Bite",
    minLevel: 1,
    summary: "Half-orc only: bite attack also deals 1d6 bleed damage.",
    contextNotes: [
      note(
        "Requires Animal Fury or an existing natural bite attack; available to half-orc barbarians only (not enforced by this app).",
      ),
    ],
  },
  {
    id: "bloodyFist",
    name: "Bloody Fist",
    minLevel: 12,
    summary:
      "Once per rage, confirming a critical hit with a natural attack or unarmed strike forces a Fortitude save (DC 10 + 1/2 barbarian level + Str mod) or the target takes 1d4 Constitution damage.",
    contextNotes: [note("Barbarian level 12.")],
  },
  {
    id: "boarsCharge",
    name: "Boar's Charge",
    minLevel: 12,
    summary:
      "While raging, a gore attack that hits as part of a charge automatically threatens a critical (still confirm normally).",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled) and barbarian level 12.",
      ),
    ],
  },
  {
    id: "boastingTaunt",
    name: "Boasting Taunt",
    minLevel: 6,
    summary:
      "While raging, a successful Intimidate demoralize check also shakes the target until it melees the barbarian or she's no longer visible or raging; +2 circumstance on the check per alcoholic drink consumed this rage.",
    contextNotes: [
      note("Language-dependent, mind-affecting, relies on audible components; barbarian level 6."),
    ],
  },
  {
    id: "bodyBludgeon",
    name: "Body Bludgeon",
    minLevel: 10,
    summary:
      "While raging, a pinned opponent smaller than the barbarian can be wielded as an improvised two-handed bludgeon (1d8 at Small, scaling by size); damage dealt to the target also hits the pinned creature.",
    contextNotes: [note("Barbarian level 10.")],
  },
  {
    id: "brawler",
    name: "Brawler",
    minLevel: 1,
    summary:
      "While raging, treated as having Improved Unarmed Strike; if already possessed, unarmed strikes instead deal 1d6 damage (1d4 if Small).",
    contextNotes: [
      note(
        "Feat grant / unarmed damage-die bump, not modeled as a Change — add the improved unarmed strike damage manually to Weapons while raging.",
      ),
    ],
  },
  {
    id: "breathtaker",
    name: "Breathtaker",
    minLevel: 1,
    summary:
      "While raging, a successful melee hit against a foe holding its breath costs it a number of rounds of held breath equal to the barbarian's Strength modifier.",
  },
  {
    id: "cairnLinnormDeathCurse",
    name: "Cairn Linnorm Death Curse",
    minLevel: 8,
    summary:
      "Melee attacks deal 1 additional point of negative energy damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or suffer the curse of decay (1 Con damage and 1 year aged per day).",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional — verified (d20pfsrd.com) as NOT scoped to 'while raging' like most of this table, so no rage-buff gate applies. Barbarian level 8. The death-curse retaliation clause targets the attacker, not the barbarian's own sheet — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "calmStance",
    name: "Calm Stance",
    minLevel: 1,
    summary:
      "Stance: while active, keep rage's temporary hit points but none of its other bonuses or penalties (including the AC penalty and action restrictions); rounds spent still count against the daily rage-round total.",
    contextNotes: [note("Activated stance, not modeled as a Change.")],
  },
  {
    id: "celestialBlood",
    name: "Celestial Blood",
    minLevel: 6,
    summary: "While raging, resistance 5 to acid and cold.",
    changes: [
      { formula: "5", target: "eres.acid", type: "untyped", activeWhenBuff: WHILE_RAGING },
      { formula: "5", target: "eres.cold", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [note("Requires Lesser Celestial Blood and barbarian level 6.")],
  },
  {
    id: "celestialTotem",
    name: "Celestial Totem",
    minLevel: 8,
    summary:
      "While raging, shines with a halo of daylight-level light and triggers an invisibility purge (against nongood creatures only) in her square and each adjacent square.",
    contextNotes: [
      note(
        "Requires Lesser Celestial Totem and barbarian level 8; light/invisibility-purge effects aren't tracked as Changes.",
      ),
    ],
  },
  {
    id: "chaosTotem",
    name: "Chaos Totem",
    minLevel: 6,
    summary:
      "While raging, +4 bonus on Escape Artist checks and a 25% chance to ignore extra damage from critical hits and sneak attacks.",
    changes: [{ formula: "4", target: "skill.esc", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Requires Lesser Chaos Totem and barbarian level 6. The 25% crit/sneak-attack-negation chance has no Change target (a percentage chance, not a stacking modifier) — note only.",
      ),
    ],
  },
  {
    id: "comeAndGetMe",
    name: "Come and Get Me",
    minLevel: 12,
    summary:
      "Free action while raging: enemies gain +4 on attack and damage rolls against the barbarian until the start of her next turn, but every attack against her provokes an attack of opportunity from her, resolved before the enemy's attack.",
    contextNotes: [
      note("Barbarian level 12. The bonus applies to enemies, not the barbarian's own sheet."),
    ],
  },
  {
    id: "contagiousRage",
    name: "Contagious Rage",
    minLevel: 6,
    summary:
      "Willing animals and magical beasts within 30 ft. gain the benefits of the rage spell for as long as the barbarian maintains her rage; they're fatigued afterward for the same number of rounds she raged.",
    contextNotes: [note("Barbarian level 6. Affects allies, not the barbarian.")],
  },
  {
    id: "cragLinnormDeathCurse",
    name: "Crag Linnorm Death Curse",
    minLevel: 4,
    summary:
      "Melee attacks deal 1 additional point of fire damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or suffer the curse of fire (vulnerability to fire).",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as Cairn Linnorm Death Curse — verified NOT scoped to 'while raging' (d20pfsrd.com). Barbarian level 4. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "cripplingBlow",
    name: "Crippling Blow",
    minLevel: 8,
    summary:
      "When using Powerful Blow, may forgo its normal damage bonus (and any Bleeding Blow bleed) to instead deal 1 point of Strength or Dexterity damage per 4 barbarian levels (Fortitude halves).",
    contextNotes: [note("Requires Powerful Blow and barbarian level 8.")],
  },
  {
    id: "cultTotem",
    name: "Cult Totem",
    minLevel: 6,
    summary:
      "May make an attack of opportunity against a creature within reach that damages an ally with a melee attack (only the enemy needs to be in reach); can't target the same creature again for 24 hours.",
    contextNotes: [note("Requires Lesser Cult Totem and barbarian level 6.")],
  },
  {
    id: "daemonTotem",
    name: "Daemon Totem",
    minLevel: 6,
    summary:
      "While raging, a confirmed critical hit imposes a temporary negative level on the target (fades automatically after 1 hour, no save).",
    contextNotes: [
      note(
        "Requires Lesser Daemon Totem and barbarian level 6. Affects the target, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "deadlyAccuracy",
    name: "Deadly Accuracy",
    minLevel: 4,
    summary:
      "If Surprise Accuracy scores a critical threat, double its bonus when rolling to confirm the critical.",
    contextNotes: [note("Requires Surprise Accuracy and barbarian level 4.")],
  },
  {
    id: "deathlessFrenzy",
    name: "Deathless Frenzy",
    minLevel: 12,
    summary:
      "While raging, ignore the effects of being at 0 or fewer hit points until having been so for 1 full round (even death can be postponed this way if healed in time).",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled) and barbarian level 12.",
      ),
    ],
  },
  {
    id: "disembowelingTusks",
    name: "Disemboweling Tusks",
    minLevel: 10,
    summary:
      "While raging, confirming a critical hit with a gore attack also deals 1d4 Constitution damage.",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled) and barbarian level 10.",
      ),
    ],
  },
  {
    id: "disruptive",
    name: "Disruptive",
    minLevel: 8,
    summary: "While raging, gain Disruptive as a bonus feat.",
    contextNotes: [
      note("Requires Superstition and barbarian level 8. Feat grant, not modeled as a Change."),
    ],
  },
  {
    id: "dissipatingRage",
    name: "Dissipating Rage",
    minLevel: 1,
    summary:
      "While raging, the barbarian and adjacent creatures don't gain concealment from fog, precipitation, or similar mundane obscuring effects (stronger magical effects are unaffected).",
  },
  {
    id: "draconicBlood",
    name: "Draconic Blood",
    minLevel: 6,
    summary:
      "While raging, resistance 5 to a chosen energy type (acid, cold, fire, or electricity) and a +1 natural armor bonus.",
    changes: [{ formula: "1", target: "nac", type: "natural", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Requires Lesser Draconic Blood and barbarian level 6. The energy-resistance type is a player choice this table has no chooser for — track it manually; only the unconditional +1 natural armor is modeled.",
        "eres.*",
      ),
    ],
  },
  {
    id: "dragonTotem",
    name: "Dragon Totem",
    minLevel: 6,
    summary:
      "Choose a dragon color as totem; while raging, +1 bonus on Perception checks and +1 morale bonus on saves against fear, paralysis, and sleep effects, increasing +1 per additional dragon-totem power known.",
    contextNotes: [
      note(
        "Requires Animal Fury and Intimidating Glare, barbarian level 6; Totem Warrior archetype only, exclusive with every other totem family. The Perception bonus scales with how many OTHER dragon-totem powers are known (not derivable from a level formula), and the save bonus is scoped to fear/paralysis/sleep only, not a whole save type — both stay note-only.",
        "skill.per",
      ),
    ],
  },
  {
    id: "dragonTotemResilience",
    name: "Dragon Totem Resilience",
    minLevel: 8,
    summary:
      "While raging, energy resistance to the totem dragon color's associated energy type equal to double the barbarian's DR/— from her class feature, increasing +2 per dragon-totem power known (including this one).",
    contextNotes: [
      note(
        "Requires Dragon Totem and barbarian level 8. Both the energy type (tied to the chosen dragon color) and the scaling (tied to barbarian DR and totem-power count) are outside what a flat/level Change can express — note only.",
      ),
    ],
  },
  {
    id: "dragonTotemWings",
    name: "Dragon Totem Wings",
    minLevel: 10,
    summary:
      "Standard action while raging in medium or lighter armor: manifest spectral dragon wings for a fly speed equal to base land speed (average maneuverability); costs 2 rounds of rage per round spent flying, or spend 2 rounds as an immediate action to manifest them faster. Fly (Dex) becomes a class skill.",
    contextNotes: [
      note(
        "Requires Dragon Totem and Dragon Totem Resilience, barbarian level 10. Activated (not simply on-while-raging), so not modeled as a Change.",
      ),
    ],
  },
  {
    id: "earthTotem",
    name: "Earth Totem",
    minLevel: 6,
    summary:
      "While raging, burrow through sand, loose soil, or gravel at 20 ft. (no ability to breathe underground; the tunnel collapses 1 round after leaving the area).",
    changes: [
      { formula: "20", target: "burrowSpeed", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note("Requires having chosen earth with Lesser Elemental Totem, and barbarian level 6."),
    ],
  },
  {
    id: "eaterOfMagic",
    name: "Eater of Magic",
    minLevel: 10,
    summary:
      "Once per rage, reroll a failed save against a spell, spell-like ability, or supernatural ability; on success, the effect is negated entirely and the barbarian gains temporary hit points equal to its caster level (or the creator's CR for a Su ability), lasting until damaged or 1 minute.",
    contextNotes: [note("Requires Superstition and barbarian level 10.")],
  },
  {
    id: "eclipsingRage",
    name: "Eclipsing Rage",
    minLevel: 6,
    summary:
      "While raging, the light level within 10 ft. of the barbarian drops by one step (never below darkness); multiple barbarians with this power don't stack the reduction.",
    contextNotes: [note("Barbarian level 6; not a target this engine's light/sense model tracks.")],
  },
  {
    id: "elementalBlood",
    name: "Elemental Blood",
    minLevel: 6,
    summary:
      "While raging, energy resistance 10 to the energy type chosen with Lesser Elemental Blood.",
    contextNotes: [
      note(
        "Requires Lesser Elemental Blood and barbarian level 6. The energy type is a player choice fixed at that earlier pick — no chooser in this table, so this stays note-only (same blocked-choice shape as the standalone Energy Resistance power).",
        "eres.*",
      ),
    ],
  },
  {
    id: "elementalRage",
    name: "Elemental Rage",
    minLevel: 8,
    summary:
      "While raging, all melee attacks deal an extra 1d6 damage of a chosen energy type (acid, cold, electricity, or fire), picked when the rage begins; can be combined with Lesser Elemental Rage using a different type.",
    contextNotes: [
      note(
        "Requires Lesser Elemental Rage and barbarian level 8. The energy type is chosen per-rage and the bonus is a dice term — the static sheet doesn't add unresolved dice damage.",
        "damage",
      ),
    ],
  },
  {
    id: "elementalStance",
    name: "Elemental Stance",
    minLevel: 4,
    summary:
      "Stance: while active, choose an energy type; melee attacks deal +1 damage of that type (1d6 at 8th), and critical hits add +1d10 more (scaled by the weapon's crit multiplier) at 12th.",
    contextNotes: [
      note(
        "Activated stance with a per-activation energy-type choice, not modeled as a Change. Barbarian level 4.",
      ),
    ],
  },
  {
    id: "energyAbsorption",
    name: "Energy Absorption",
    minLevel: 12,
    summary:
      "Once per rage, absorb a single attack of the chosen energy type (from Greater Energy Resistance) with no save and no damage taken, instead gaining 1 temporary hit point per 3 points of damage it would have dealt (lasts until the rage ends).",
    contextNotes: [
      note("Requires Greater Energy Resistance (not in this table) and barbarian level 12."),
    ],
  },
  {
    id: "energyEruption",
    name: "Energy Eruption",
    minLevel: 16,
    summary:
      "Once per rage, absorb one attack's energy (as Energy Absorption) and later release it as a 60-ft. line or 30-ft. cone breath weapon (Reflex half, even if the original effect didn't allow a save).",
    contextNotes: [note("Requires Energy Absorption and barbarian level 16.")],
  },
  {
    id: "energyResistance",
    name: "Energy Resistance",
    minLevel: 1,
    summary:
      "While raging, resistance to one chosen energy type (acid, cold, electricity, fire, or sonic) equal to half barbarian level (minimum 1); can be taken again for a different type, but instances don't stack with each other.",
    contextNotes: [
      note(
        "The energy type is a player choice — this app has no mechanism to let a build pick which energy type a rage power applies to, so this stays note-only even though the scaling itself (half level, min 1) is a clean level formula.",
        "eres.*",
      ),
    ],
  },
  {
    id: "enhanceVenom",
    name: "Enhance Venom",
    minLevel: 1,
    summary:
      "Add Constitution modifier to the save DC of any poison delivered via Viper's Kiss or Viper's Breath.",
    contextNotes: [note("Requires both Viper's Breath and Viper's Kiss (not in this table).")],
  },
  {
    id: "erraticCharge",
    name: "Erratic Charge",
    minLevel: 1,
    summary:
      "As part of a charge against a foe at least 20 ft. away, may move 5 ft. in any direction before charging (provokes normally, not a 5-ft. step); reduces the charge's maximum distance by 10 ft.",
  },
  {
    id: "feastOfBlood",
    name: "Feast of Blood",
    minLevel: 14,
    summary:
      "Within 1 minute of using Bloody Fist, may eat the extracted organ (full-round action, provokes) to heal hit points equal to the victim's Hit Dice and gain half its energy resistances/immunities (immunities become resistance 20) for rounds equal to half its Hit Dice.",
    contextNotes: [note("Requires Bloody Fist and barbarian level 14.")],
  },
  {
    id: "feastingBite",
    name: "Feasting Bite",
    minLevel: 1,
    summary:
      "Half-orc only: confirming a critical hit with a bite attack heals half the damage dealt; costs 1 round of rage.",
    contextNotes: [
      note(
        "Requires Bloody Bite and (Animal Fury or a natural bite attack); available to half-orc barbarians only (not enforced by this app).",
      ),
    ],
  },
  {
    id: "ferociousBeast",
    name: "Ferocious Beast",
    minLevel: 1,
    summary:
      "While raging, the barbarian's animal companion also gains the benefits of her rage (including greater/mighty/tireless rage); costs 1 extra round of rage per round if the companion starts or ends its turn adjacent to her, 2 extra if not.",
    contextNotes: [note("Requires an animal companion.")],
  },
  {
    id: "ferociousMount",
    name: "Ferocious Mount",
    minLevel: 1,
    summary:
      "While raging and mounted, the mount also gains the benefits of rage (including greater/mighty rage) as long as it's mounted or adjacent; costs 1 extra round of rage per round (the barbarian may decline, in which case the mount doesn't rage).",
  },
  {
    id: "ferociousTrample",
    name: "Ferocious Trample",
    minLevel: 8,
    summary:
      "While raging and mounted, the mount gains the trample attack (1d8 for a Medium mount, 2d6 Large, 2d8 Huge, plus 1.5x the mount's Str modifier; Reflex halves).",
    contextNotes: [note("Requires Ferocious Mount and barbarian level 8.")],
  },
  {
    id: "feyBlood",
    name: "Fey Blood",
    minLevel: 6,
    summary: "While raging, ignore difficult terrain (including magical terrain) while charging.",
    contextNotes: [note("Requires Lesser Fey Blood and barbarian level 6.")],
  },
  {
    id: "fiendTotem",
    name: "Fiend Totem",
    minLevel: 6,
    summary:
      "While raging, sprouts wicked barbs — anyone striking the barbarian with a melee weapon, unarmed strike, or natural weapon takes 1d6 piercing damage.",
    contextNotes: [
      note(
        "Requires Lesser Fiend Totem and barbarian level 6. Damages attackers, not a self-buff on the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "fierceFortitude",
    name: "Fierce Fortitude",
    minLevel: 1,
    summary: "+4 bonus on saving throws against diseases and poison.",
    contextNotes: [
      note(
        "A skald must be trained in Intimidate to select this power. Scoped to disease/poison saves only, not a whole save type — the engine's Fortitude target has no 'vs. a category' variant, so an unconditional Change here would overstate onto every Fortitude save (same over-broad-target issue as Superstition).",
        "fort",
      ),
    ],
  },
  {
    id: "fireTotem",
    name: "Fire Totem",
    minLevel: 6,
    summary:
      "While raging, any foe who confirms a critical hit against her with a piercing or slashing melee weapon (reach weapons immune) is sprayed with liquid fire — 1d6 fire damage per barbarian level (Reflex halves; DC 10 + 1/2 barbarian level + Con mod).",
    contextNotes: [
      note(
        "Requires having chosen fire with Lesser Elemental Totem, and barbarian level 6. Damages the attacker, not a self-buff.",
      ),
    ],
  },
  {
    id: "fjordLinnormDeathCurse",
    name: "Fjord Linnorm Death Curse",
    minLevel: 4,
    summary:
      "Melee attacks deal 1 additional point of cold damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or suffer the curse of drowning (can't breathe water even with magic, holds its breath only half as long as normal, and is sickened whenever it holds its breath).",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as Cairn/Crag Linnorm Death Curse — verified NOT scoped to 'while raging' (d20pfsrd.com). Barbarian level 4. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "fleshWound",
    name: "Flesh Wound",
    minLevel: 10,
    summary:
      "Once per rage, after an attack roll but before damage is rolled, attempt a Fortitude save (DC equal to the damage that would be dealt; armor check penalty applies) to take half damage as nonlethal instead.",
    contextNotes: [note("Barbarian level 10.")],
  },
  {
    id: "flightResponse",
    name: "Flight Response",
    minLevel: 1,
    summary:
      "On a saving throw against a fear effect, may enter rage as an immediate action (costs 3 rounds of the daily allotment) to gain the Will-save bonus from rage immediately.",
    contextNotes: [
      note(
        "Only useful when not already raging — a skald's raging song can't grant this to allies.",
      ),
    ],
  },
  {
    id: "fueledByVengeance",
    name: "Fueled by Vengeance",
    minLevel: 6,
    summary:
      "While raging, dealing weapon damage to a creature that damaged the barbarian since her last turn adds 1 round to her remaining daily rage rounds (max +1 per round).",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled) and barbarian level 6.",
      ),
    ],
  },
  {
    id: "furiousBarrage",
    name: "Furious Barrage",
    minLevel: 4,
    summary:
      "Treated as having Rapid Shot for thrown-weapon attacks only, ignoring its prerequisites.",
    contextNotes: [
      note("Requires Furious Draw and barbarian level 4. Feat grant, not modeled as a Change."),
    ],
  },
  {
    id: "furiousDraw",
    name: "Furious Draw",
    minLevel: 1,
    summary: "Treated as having Quick Draw.",
    contextNotes: [
      note(
        "Not scoped to 'while raging' — always on once known, unlike most of this table. Feat grant, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "gearbreaker",
    name: "Gearbreaker",
    minLevel: 1,
    summary:
      "Once per round while raging, before the attack roll, may ignore an amount of a construct's hardness equal to barbarian level.",
    contextNotes: [
      note(
        "Requires the Smasher rage power (not in this table); stacks with the Numerian liberator archetype's Hard Hitter.",
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.ragePowers` (see that type's doc comment) is
 * the FULL published catalog (~244 entries after junk filtering), prose
 * only. The hand-verified table above stays authoritative for MECHANICS —
 * this section only merges the two for BROWSING (the picker) and for
 * resolving a picked id back to a definition (`collect.ts`/`archetypes.ts`),
 * mirroring `traits.ts`'s `resolveTrait` fallback-to-`doc.build.homebrew`
 * pattern: hand-authored first, vendored catalog as the fallback source of
 * definitions rather than a second table to keep in sync by hand.
 *
 * Matching is by NORMALIZED NAME, never id — the two tables use disjoint id
 * spaces by construction (this file's camelCase vs. the vendored dataset's
 * snake_case slug), so an id collision can't happen, but a hand-authored
 * entry's `Change`/`contextNotes` must still land on the SAME published
 * power the vendored catalog describes under a possibly-differently-cased
 * name.
 *
 * Collision audit (all 29 original hand-authored entries, run against the
 * pinned Pf Data 1e slice): every one matched a vendored entry by normalized
 * name, so no `NAME_ALIASES` entry is needed — the source's own
 * spelling/wording matched ours exactly (case-insensitively). (The former
 * 30th entry, Sixth Sense, matched nothing under any key — one of the tells
 * it wasn't real; see the file doc comment.) The batch-1 (A-F) sweep re-ran
 * this same audit for its 70 additions — also zero collisions, zero aliases
 * needed.
 *
 * One name COLLIDES within the vendored catalog itself: "Guarded Stance"
 * appears twice — the Core Rulebook original (`guarded_stance`, no
 * `category`) and a reworded Pathfinder Unchained "Stance"-category variant
 * (`guarded_stance_stance`, different scaling/duration). The hand-authored
 * entry's numbers (+1/6 levels, vs. melee only) match the CRB original, so
 * `mergedRagePowerCatalog` prefers the vendored entry WITHOUT a `category`
 * as the collision partner when more than one vendored entry shares a
 * normalized name — the Unchained variant stays in the catalog as its own
 * vendored-only (display-only) row rather than being silently dropped.
 */

/**
 * Alias map for a hand-authored id whose vendored-catalog counterpart uses a
 * different name than ours (misspelling/wording drift) — matched instead of
 * this file's own `name`. Empty today: the full 30-entry audit found no
 * drift (see the collision-audit comment above) — kept so a FUTURE
 * hand-authored addition that DOES drift from the vendored spelling has
 * somewhere to record it instead of silently going unmatched.
 */
const RAGE_POWER_NAME_ALIASES: Record<string, string> = {};

function normalizeRagePowerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row (the hand-authored table's `summary` field is a curated paraphrase this app doesn't have for vendored-only prose). */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A catalog entry the picker can browse — either the hand-authored def (matched or Sixth-Sense-style unmatched) with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedRagePowerEntry extends RagePowerDef {
  /** Ability-type suffix as published, e.g. "(Ex)" — undefined for a hand-authored entry with no vendored counterpart (none today). */
  nameSuffix?: string;
  /** Vendored grouping tag (e.g. "Totem", "Blood", "Stance"), when present. */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id — always present today (every hand entry matches a vendored one). */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: RagePower): MergedRagePowerEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    // NOT `entry.level` — that field isn't a level-gate (see `RagePower.level`'s
    // doc comment). Any real "requires Nth level" prerequisite is already
    // prose inside `description`; a vendored-only entry gets no soft-warning
    // gate at all rather than a fabricated/misleading one.
    minLevel: 1,
    summary: plainTextPreview(entry.description ?? ""),
    editions: BOTH,
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked rage-power id (`doc.build.ragePowers` entries) to its
 * definition — hand-authored table first (mechanics-authoritative), falling
 * back to the vendored catalog for an id that only exists there (a power
 * picked straight from the full-catalog picker with no hand-authored
 * counterpart). Used by `collect.ts` (modifier collection) and
 * `archetypes.ts` (the Class Features list) instead of indexing `RAGE_POWERS`
 * directly, so a vendored-only pick resolves to a real (display-only)
 * definition rather than being silently dropped.
 */
export function resolveRagePower(id: string, refData: RefData): RagePowerDef | undefined {
  const hand = RAGE_POWERS[id];
  if (hand) return hand;
  const vendored = refData.ragePowers?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and real mechanics, but
 * carrying the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today —
 * see the collision-audit comment above). `!entry.displayOnly` marks which rows have
 * live mechanics, for the picker's "M" badge (same convention as
 * `archetypeModeledEffectTier`/`ArchetypePicker`'s `badge-modeled`).
 */
export function mergedRagePowerCatalog(refData: RefData): MergedRagePowerEntry[] {
  const handByNormName = new Map<string, RagePowerDef>();
  for (const p of RAGE_POWER_LIST) {
    handByNormName.set(normalizeRagePowerName(RAGE_POWER_NAME_ALIASES[p.id] ?? p.name), p);
  }

  const vendored = Object.values(refData.ragePowers ?? {});
  // Base (no `category`) vendored entries are processed first, so when a name
  // collides WITHIN the vendored catalog itself (e.g. Guarded Stance's CRB
  // original vs. its Pathfinder Unchained "Stance" variant — see file doc
  // comment) the hand-authored match claims the base entry, leaving the
  // variant as its own vendored-only row rather than being dropped.
  const ordered = [...vendored].sort((a, b) => (a.category ? 1 : 0) - (b.category ? 1 : 0));

  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedRagePowerEntry[] = [];
  for (const v of ordered) {
    const norm = normalizeRagePowerName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const p of RAGE_POWER_LIST) {
    if (!usedHandIds.has(p.id)) merged.push(p);
  }
  return merged;
}
