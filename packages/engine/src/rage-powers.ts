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
 * Collision audit (all 29 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name, so
 * no `NAME_ALIASES` entry is needed — the source's own spelling/wording
 * matched ours exactly (case-insensitively). (The former 30th entry, Sixth
 * Sense, matched nothing under any key — one of the tells it wasn't real;
 * see the file doc comment.)
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
