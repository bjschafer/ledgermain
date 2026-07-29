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
 * Scope: FULL vendored parity (issue #74) — 243 hand-authored entries,
 * matching every one of the 243 uniquely-named rage powers in the pinned
 * Pf Data 1e catalog (`packages/data-pipeline/data/rage-powers.json`, 244
 * raw rows — see the "vendored catalog overlay" section below for why 244
 * raw rows collapse to 243 unique names). Started from a 29-entry seed (the
 * 23 Core Rulebook rage powers plus 6 commonly-taken Advanced Player's Guide
 * additions: Superstition, Witch Hunter, Good For What Ails You, Internal
 * Fortitude, Spell Sunder, Swift Foot) and closed the remaining ~215-entry
 * gap (Totem chains, Bloodrager-shared powers, Ultimate-line additions, the
 * Linnorm Death Curses, ...) across three batches (same posture as
 * `witch-hexes.ts`'s/`alchemist-discoveries.ts`'s own #74 sweeps): batch 1
 * (A-F, +70), batch 2 (G-R, +106), batch 3 (S-Z, +38). A former 30th seed
 * entry, "Sixth Sense", was removed (see the note below) rather than counted.
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
 * Sense grants (Low-Light Vision, Scent) were NOT promoted at this point in
 * the sweep, on the theory that beneficial "set"-change grants are a
 * documented engine hazard (`compute.ts` resolves competing "set" changes on
 * a SPEED target by LOWEST value, which is tuned for penalties like Slow,
 * not beneficial grants). Batch 2 (G-R) found this reasoning didn't actually
 * apply to senses — `senses.ts`'s sense resolver is bespoke and takes the
 * HIGHEST value per sense kind regardless of operator — and batch 3 (S-Z)
 * finished the job by promoting Low-Light Vision and Scent themselves (see
 * that batch's writeup below); this paragraph is kept for the historical
 * record of how the original (incorrect) call was reached.
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
 *
 * Batch 2 (G-R) of the #74 catalog sweep added 106 entries and, along the
 * way, corrected a claim from the batch-1 promotion-bar writeup above: senses
 * (`sensedv`/`sensell`/...) do NOT share the beneficial-"set"-grant hazard
 * `landSpeed`/`flySpeed`/... have (`compute.ts`'s `applySpeedTarget` really
 * does resolve competing "set" changes by lowest value) — `senses.ts`'s
 * `computeSenses` is a separate, bespoke resolver that takes the single
 * HIGHEST value per sense kind, confirmed by reading it directly and by
 * `shifter-aspects.ts`'s Bat/Wolf aspects, which already promote flat
 * `sensedv`/`sensesc` grants on exactly that basis. This batch promotes
 * **Night Vision** (flat darkvision 60 ft. while raging) and **Lesser Moon
 * Totem** (flat darkvision 30 ft. while raging, with a note that the "+30 to
 * darkvision you already have" alternate wording isn't modeled — same
 * documented gap as shifter-aspects.ts's Bat) on this corrected understanding.
 * The existing Low-Light Vision/Scent entries are untouched by this batch
 * (out of scope — they're original-29-entry rows, not G-R), so their own
 * displayOnly status is left for a future pass to revisit against this
 * corrected understanding rather than changed here as a side effect.
 *
 * Also promoted this batch, all fixed-type/qualifier and unconditional while
 * raging, same bar as Celestial Blood: **Greater Abyssal Blood** (acid/cold/
 * fire resistance 5), **Infernal Blood** and **Lesser Sun Totem** (fire
 * resistance 5 each), **Greater Sun Totem** (fire resistance 20), **Greater
 * Undead Blood** (cold resistance 10 — its DR 10/- vs. nonlethal damage stays
 * note-only, a different mechanic than this engine's qualifier-bypass
 * `dr.<qualifier>` targets), **Raging Flyer** (enhancement bonus equal to
 * barbarian level on Fly checks, the same shape as Raging Climber/Swimmer),
 * and **Greater Chaos Totem** (DR/lawful equal to half barbarian level — a
 * genuinely qualifier-scoped DR entry, unlike Lesser Chaos Totem's
 * alignment-scoped deflection AC, which stays displayOnly). Ice Linnorm Death
 * Curse's +1 cold damage is ungated, matching its Cairn/Crag/Fjord siblings.
 *
 * Batch 3 (S-Z) of the #74 catalog sweep added the final 38 entries, closing
 * the table out to full vendored parity, plus a two-entry LEGACY revisit:
 *
 *   - **Sun Totem** (fire resistance 10 while raging) is the middle tier of
 *     the Lesser (5, batch 2) / Sun Totem (10) / Greater (20, batch 2)
 *     fire-resistance chain — promoted the same `eres.fire`-while-raging way
 *     as its siblings, verified against d20pfsrd.com. Its 1d6-round,
 *     flame-contact-triggered +10 ft. speed bonus stays note-only.
 *   - **Unrestrained Rage** (immune to paralysis while raging) is a new
 *     promotable shape for this table: the engine's closed `immEffect.*`
 *     vocabulary (`defenses.ts`) has an exact `paralysis` slug — unlike
 *     Fearless Rage's `immEffect.fear` (over-broad: reads as the whole fear
 *     family, including panicked, which Fearless Rage doesn't grant immunity
 *     to), "immune to paralysis" IS the whole, exact effect this power
 *     grants, so an unconditional gated `immEffect.paralysis` Change doesn't
 *     overstate anything. Same slug `alchemist-discoveries.ts`'s Cognatogen
 *     already uses unconditionally.
 *   - **Low-Light Vision** / **Scent** (the two original-29-entry rows batch
 *     2 flagged as a legacy revisit once senses were confirmed to resolve
 *     highest-wins, not lowest) are now promoted, using the same
 *     `sensell`/`sensesc` flag-Change shape `vigilante-talents.ts`'s Shadow's
 *     Sight and `shifter-aspects.ts`'s aspects already establish. Re-verifying
 *     Low-Light Vision's RAW against both the vendored prose and
 *     d20pfsrd.com in the process turned up a fabrication in its old
 *     `summary`: "(or double existing range)" is not real text anywhere in
 *     the published rage power (RAW is simply "gains low-light vision while
 *     raging," no doubling clause, no prerequisite) — corrected.
 *
 * Undead Blood (the non-Lesser, non-Greater tier) was checked as a promotion
 * candidate on the same basis as Greater Undead Blood's cold resistance, but
 * verified (d20pfsrd.com) to grant only the ghost touch weapon quality on
 * melee attacks while raging — no numeric resistance/DR at all — so there is
 * nothing to promote; stays displayOnly. Water Sense, Sharpened Accuracy, and
 * Spiritual Awareness were also close-read as candidates and found to be,
 * respectively: a conditional cover/range-penalty reduction (not a sense
 * grant — no fixed-range tremorsense/blindsense involved), an ability
 * conditioned on activating the (unmodeled) Surprise Accuracy, and a rider on
 * an existing Trap Sense bonus rather than a flat number of its own — all
 * three stay displayOnly.
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
  /**
   * A selection RAW locks in when the power is gained (an energy type, a
   * skill, ...). The player's pick is stored in
   * `doc.build.pickChoices["ragePower:<this id>"]`; until one is stored,
   * `choiceChanges` emit nothing (same safe default as `featChoices`).
   */
  choice?: PickChoice;
  /**
   * Which power's stored choice `choiceChanges` are keyed off — for chain
   * powers whose RAW selection was made by an earlier pick (Elemental
   * Blood reads Lesser Elemental Blood's element). Defaults to this
   * power's own id.
   */
  choiceFrom?: string;
  /**
   * Per-option Changes, keyed by option id — applied (through the usual
   * `activeWhenBuff` gating) only when the resolved choice matches a key.
   */
  choiceChanges?: Readonly<Record<string, readonly Change[]>>;
}

/** A choose-one selection an entry declares — see {@link RagePowerDef.choice}. */
export interface PickChoice {
  /** Dropdown prompt, e.g. "Energy type". */
  label: string;
  options: readonly { id: string; label: string }[];
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
  choice?: PickChoice;
  choiceFrom?: string;
  choiceChanges?: Readonly<Record<string, readonly Change[]>>;
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
      // A choice-gated power still counts as modeled: it moves real numbers
      // once its selection is stored.
      displayOnly: changes.length === 0 && !e.choiceChanges,
      choice: e.choice,
      choiceFrom: e.choiceFrom,
      choiceChanges: e.choiceChanges,
    };
  });
}

/** The four classic elemental energies, shared by the choose-one powers below. */
const ENERGY_CHOICE_OPTIONS = [
  { id: "acid", label: "Acid" },
  { id: "cold", label: "Cold" },
  { id: "electricity", label: "Electricity" },
  { id: "fire", label: "Fire" },
] as const;

/** `eres.<type> = formula`, while raging — the shape every chosen-energy resistance shares. */
function energyResistChoiceChanges(formula: string): Record<string, readonly Change[]> {
  const out: Record<string, readonly Change[]> = {};
  for (const { id } of ENERGY_CHOICE_OPTIONS) {
    out[id] = [{ formula, target: `eres.${id}`, type: "untyped", activeWhenBuff: WHILE_RAGING }];
  }
  return out;
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
    summary: "Gain low-light vision while raging.",
    changes: [{ formula: "1", target: "sensell", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Batch 3 legacy revisit: the old summary's '(or double existing range)' clause was a fabrication — verified against both the vendored prose and d20pfsrd.com, RAW is simply 'gains low-light vision while raging', no doubling clause and no prerequisite. Flag-only grant (senses.ts resolves sensell highest-source-wins, mirroring shifter-aspects.ts's Bat/Wolf and vigilante-talents.ts's Shadow's Sight), so it correctly does nothing when a race already has low-light vision.",
        "sensell",
      ),
    ],
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
    changes: [{ formula: "1", target: "sensesc", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Batch 3 legacy revisit: unconditional while-raging grant, no prerequisite (verified against both the vendored prose and d20pfsrd.com) — flag-only, same shape and highest-source-wins resolution as Low-Light Vision above.",
        "sensesc",
      ),
    ],
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
    choice: { label: "Energy type", options: ENERGY_CHOICE_OPTIONS },
    choiceChanges: energyResistChoiceChanges("5"),
    contextNotes: [note("Requires Lesser Draconic Blood and barbarian level 6.")],
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
    choiceFrom: "lesserElementalBlood",
    choiceChanges: energyResistChoiceChanges("10"),
    contextNotes: [
      note(
        "Requires Lesser Elemental Blood and barbarian level 6; the resistance keys off the energy type chosen there.",
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
    // RAW adds sonic to the classic four, so this power carries its own
    // option list instead of ENERGY_CHOICE_OPTIONS. The taken-again-for-a-
    // second-type case has no second pick slot (one choice per power id) —
    // track a second instance's type manually.
    choice: {
      label: "Energy type",
      options: [...ENERGY_CHOICE_OPTIONS, { id: "sonic", label: "Sonic" }],
    },
    choiceChanges: {
      ...energyResistChoiceChanges(`max(1, floor((${BARBARIAN_LEVEL_SUM}) / 2))`),
      sonic: [
        {
          formula: `max(1, floor((${BARBARIAN_LEVEL_SUM}) / 2))`,
          target: "eres.sonic",
          type: "untyped",
          activeWhenBuff: WHILE_RAGING,
        },
      ],
    },
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

  /* ---------------------------------------------------------- #74 sweep, batch 2 (G-R) -- */

  {
    id: "ghostRager",
    name: "Ghost Rager",
    minLevel: 6,
    summary:
      "While raging, deals full damage to incorporeal creatures even with nonmagical weapons, and gains a +3 morale bonus to touch AC (scaling +1 at 8th and every 4 levels after, max +7 at 20th) — never raising touch AC above full AC.",
    contextNotes: [
      note(
        "Barbarian level 6. The touch-AC bonus can't be modeled as a Change: this engine derives touch AC as full AC minus the armor/shield/natural components, so any other bonus type automatically counts toward BOTH full and touch AC — there's no way to grant a bonus that raises touch AC only, and an unconditional Change here would incorrectly also raise full AC.",
        "ac",
      ),
    ],
  },
  {
    id: "greaterAbyssalBlood",
    name: "Greater Abyssal Blood",
    minLevel: 10,
    summary: "While raging, resistance 5 to acid, cold, and fire.",
    changes: [
      { formula: "5", target: "eres.acid", type: "untyped", activeWhenBuff: WHILE_RAGING },
      { formula: "5", target: "eres.cold", type: "untyped", activeWhenBuff: WHILE_RAGING },
      { formula: "5", target: "eres.fire", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note(
        "Requires Abyssal Blood and barbarian level 10; three fixed energy types, the same promotable shape as Celestial Blood.",
      ),
    ],
  },
  {
    id: "greaterAirTotem",
    name: "Greater Air Totem",
    minLevel: 10,
    summary:
      "While raging, surrounded by a howling-wind aura: nearby spellcasters must succeed at a concentration check, ranged attacks against her take a penalty, and smaller creatures attacking her in melee with a natural weapon or touch attack risk being flung back and knocked prone.",
    contextNotes: [
      note(
        "Requires having chosen air with Lesser Elemental Totem and taken Air Totem, plus barbarian level 10. Every effect here targets attackers/other creatures, not the barbarian's own sheet — not modeled.",
      ),
    ],
  },
  {
    id: "greaterAncestorTotem",
    name: "Greater Ancestor Totem",
    minLevel: 10,
    summary:
      "Raises Lesser Ancestor Totem's insight bonus to +6 on the chosen skill, and once per rage allows rerolling a check with that skill (must keep the second result).",
    contextNotes: [
      note(
        "Requires Ancestor Totem and barbarian level 10; the skill choice is free-text from Lesser Ancestor Totem, not a fixed Change target — same as Ancestor Totem itself.",
      ),
    ],
  },
  {
    id: "greaterAnimalFury",
    name: "Greater Animal Fury",
    minLevel: 1,
    summary:
      "As Animal Fury, but the bite attack deals damage as though the barbarian were one size category larger.",
    contextNotes: [
      note(
        "Requires Animal Fury. Natural-attack sizing bump, not modeled as a Change — same manual-Weapons-entry posture as Animal Fury itself.",
      ),
    ],
  },
  {
    id: "greaterAtavismTotem",
    name: "Greater Atavism Totem",
    minLevel: 10,
    summary: "Grants the trample special attack.",
    contextNotes: [
      note("Requires Atavism Totem and barbarian level 10; trample isn't tracked as a Change."),
    ],
  },
  {
    id: "greaterBeastTotem",
    name: "Greater Beast Totem",
    minLevel: 10,
    summary:
      "While raging, gains the pounce ability (a full attack at the end of a charge); claw attacks improve to 1d8 damage (1d6 if Small) and ×3 on a critical hit.",
    contextNotes: [
      note(
        "Requires Beast Totem and barbarian level 10. No natural armor rider here (unlike Beast Totem itself, verified against d20pfsrd.com) — pounce and the claw-damage-die bump aren't Change targets this table has, so there's no double-counting risk with Beast Totem's own promoted nac Change.",
        "nac",
      ),
    ],
  },
  {
    id: "greaterBrawler",
    name: "Greater Brawler",
    minLevel: 1,
    summary: "While raging, fights as though wielding two weapons when making unarmed strikes.",
    contextNotes: [
      note("Requires Brawler. Feat-like grant, not modeled as a Change — same posture as Brawler."),
    ],
  },
  {
    id: "greaterCelestialBlood",
    name: "Greater Celestial Blood",
    minLevel: 10,
    summary:
      "Once per rage, reroll an ability check, skill check, or saving throw just made, before the result is revealed — must keep the second roll.",
    contextNotes: [note("Requires Celestial Blood and barbarian level 10.")],
  },
  {
    id: "greaterCelestialTotem",
    name: "Greater Celestial Totem",
    minLevel: 12,
    summary:
      "While raging, gains spell resistance (11 + class level) against spells with the evil descriptor, plus a +2 bonus on saves against spells and effects from evil creatures.",
    contextNotes: [
      note(
        "Requires Celestial Totem and barbarian level 12. Both bonuses are scoped to evil-descriptor/evil-source effects only — the engine's spellResist target is an unconditional whole-SR grant, so applying it here would give SR against every spell, not just evil ones; same over-broad-target issue as Superstition.",
        "spellResist",
      ),
    ],
  },
  {
    id: "greaterChaosTotem",
    name: "Greater Chaos Totem",
    minLevel: 10,
    summary:
      "While raging, gains DR/lawful equal to half barbarian level, and her weapons (including natural weapons) count as chaotic for bypassing damage reduction.",
    changes: [
      {
        formula: `floor((${BARBARIAN_LEVEL_SUM}) / 2)`,
        target: "dr.lawful",
        type: "untyped",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
    contextNotes: [
      note(
        "Requires Chaos Totem and barbarian level 10; verified as a genuinely qualifier-scoped DR entry (d20pfsrd.com), unlike Lesser Chaos Totem's alignment-scoped deflection AC — DR is inherently bypass-qualified, so dr.lawful is a clean target the same way judgments.ts's dr.magic and rogue-talents.ts's dr.adamantine are. The chaotic-weapons clause isn't modeled.",
        "dr.lawful",
      ),
    ],
  },
  {
    id: "greaterCultTotem",
    name: "Greater Cult Totem",
    minLevel: 10,
    summary:
      "While raging, hit-point damage that would drop her to dying/dead instead leaves her conscious (though disabled) until the end of her next turn, at which point the normal result applies.",
    contextNotes: [
      note(
        "Requires Lesser Cult Totem and Cult Totem, barbarian level 10. No effect against non-hit-point death (death effects, Constitution damage/drain). Not modeled as a Change — no target for delaying an HP threshold.",
      ),
    ],
  },
  {
    id: "greaterDaemonTotem",
    name: "Greater Daemon Totem",
    minLevel: 10,
    summary:
      "While raging, killing an intelligent creature of CR at least half her level heals 5 hit points (or grants 5 temporary hit points if already at full, non-stacking).",
    contextNotes: [
      note(
        "Requires Lesser Daemon Totem and Daemon Totem, barbarian level 10. Triggered by a kill — not modeled as a Change.",
      ),
    ],
  },
  {
    id: "greaterDraconicBlood",
    name: "Greater Draconic Blood",
    minLevel: 10,
    summary:
      "While raging, gains a once-per-day breath weapon (30-ft. cone for cold/fire, 60-ft. line for acid/electricity) dealing 1d6 damage per 2 barbarian levels of the energy type chosen for Draconic Blood, Reflex half.",
    contextNotes: [
      note(
        "Requires Draconic Blood and barbarian level 10. Dice-based damage with a player-chosen energy type — same not-modeled reasoning as Elemental Rage.",
        "damage",
      ),
    ],
  },
  {
    id: "greaterEarthTotem",
    name: "Greater Earth Totem",
    minLevel: 10,
    summary:
      "While raging, skin hardens like stone — any manufactured weapon that hits her takes damage equal to half the damage dealt, ignoring damage reduction.",
    contextNotes: [
      note(
        "Requires having chosen earth with Lesser Elemental Totem and taken Earth Totem, plus barbarian level 10. Damages the attacker's weapon, not the barbarian's own sheet — not modeled.",
      ),
    ],
  },
  {
    id: "greaterEclipsingRage",
    name: "Greater Eclipsing Rage",
    minLevel: 10,
    summary:
      "While raging, the light-level reduction from Eclipsing Rage doubles to two steps within 20 ft. (never below darkness).",
    contextNotes: [
      note(
        "Requires Eclipsing Rage and barbarian level 10; not a target this engine's light model tracks, same as Eclipsing Rage.",
      ),
    ],
  },
  {
    id: "greaterElementalBlood",
    name: "Greater Elemental Blood",
    minLevel: 10,
    summary:
      "While raging, gains a movement benefit keyed to the energy type chosen for Elemental Blood: burrow 30 ft. (acid), swim 60 ft. (cold), +30 ft. land speed (fire), or fly 60 ft. with good maneuverability (electricity).",
    choiceFrom: "lesserElementalBlood",
    // Whole-speed GRANTS use `operator: "set"` (applySpeedTarget replaces
    // the mode's value outright — correct for "gains a burrow/swim/fly
    // speed of N", and never additive-inflates a race that already flies or
    // swims); fire's "+30 ft." is an increase, so it stays additive.
    // Maneuverability (good, for fly) is prose-only, as everywhere else.
    choiceChanges: {
      acid: [
        {
          formula: "30",
          operator: "set",
          target: "burrowSpeed",
          type: "base",
          activeWhenBuff: WHILE_RAGING,
        },
      ],
      cold: [
        {
          formula: "60",
          operator: "set",
          target: "swimSpeed",
          type: "base",
          activeWhenBuff: WHILE_RAGING,
        },
      ],
      electricity: [
        {
          formula: "60",
          operator: "set",
          target: "flySpeed",
          type: "base",
          activeWhenBuff: WHILE_RAGING,
        },
      ],
      fire: [{ formula: "30", target: "landSpeed", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    },
    contextNotes: [
      note(
        "Requires Elemental Blood and barbarian level 10; the movement benefit keys off the energy type chosen at Lesser Elemental Blood.",
      ),
    ],
  },
  {
    id: "greaterElementalRage",
    name: "Greater Elemental Rage",
    minLevel: 12,
    summary:
      "While raging, melee critical hits deal an extra 1d10 points of the Elemental Rage energy type (2d10 at ×3 crit, 3d10 at ×4 crit).",
    contextNotes: [
      note(
        "Requires Elemental Rage and barbarian level 12. Crit-triggered dice damage of a player-chosen type — the static sheet doesn't add unresolved dice.",
        "damage",
      ),
    ],
  },
  {
    id: "greaterEnergyResistance",
    name: "Greater Energy Resistance",
    minLevel: 8,
    summary:
      "Once per rage, halve the damage of a single attack of the energy type covered by Energy Resistance before applying resistance, with no save.",
    contextNotes: [
      note(
        "Requires Energy Resistance and barbarian level 8. Once-per-rage triggered mitigation, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "greaterErraticCharge",
    name: "Greater Erratic Charge",
    minLevel: 8,
    summary:
      "As Erratic Charge, but the initial repositioning move increases to 10 ft. (the charge's maximum distance drops by 20 ft. instead of 10).",
    contextNotes: [
      note(
        "Requires Erratic Charge and barbarian level 8; same not-modeled reasoning as Erratic Charge — a situational movement mechanic, not a flat self-buff.",
      ),
    ],
  },
  {
    id: "greaterFerociousBeast",
    name: "Greater Ferocious Beast",
    minLevel: 8,
    summary:
      "While raging, the animal companion shares the benefit of any of the barbarian's rage powers that are constant in effect (not ones requiring an action to activate).",
    contextNotes: [
      note(
        "Requires Ferocious Beast and barbarian level 8. Affects the companion, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterFerociousMount",
    name: "Greater Ferocious Mount",
    minLevel: 8,
    summary:
      "While raging and mounted, the mount gains the benefit of any of the barbarian's constantly-active rage powers (not ones requiring an action to activate).",
    contextNotes: [
      note(
        "Requires Ferocious Mount and barbarian level 8. Affects the mount, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterFerociousTrample",
    name: "Greater Ferocious Trample",
    minLevel: 12,
    summary:
      "The mount's Ferocious Trample can affect creatures up to its own size, and it may attempt a free overrun against a creature that fails (or forgoes) its save against the trample.",
    contextNotes: [
      note(
        "Requires Ferocious Trample and barbarian level 12. Affects the mount's trample attack, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterFeyBlood",
    name: "Greater Fey Blood",
    minLevel: 10,
    summary:
      "While raging, moving at least 10 ft. in a round grants the benefit of blur for 1 round.",
    contextNotes: [
      note(
        "Requires Fey Blood and barbarian level 10. Movement-triggered concealment effect, not a flat AC/save Change.",
      ),
    ],
  },
  {
    id: "greaterFiendTotem",
    name: "Greater Fiend Totem",
    minLevel: 10,
    summary:
      "While raging, radiates a menacing aura: adjacent good creatures are shaken and take 2d6 slashing damage each round, adjacent neutral creatures are shaken only, and evil creatures are unaffected.",
    contextNotes: [
      note(
        "Requires Fiend Totem and barbarian level 10. Damages/debuffs nearby creatures, not a self-buff on the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterFireTotem",
    name: "Greater Fire Totem",
    minLevel: 10,
    summary:
      "While raging, can wreathe herself in a 10-ft.-radius cloud of smoke that follows her, forcing Fortitude saves on creatures inside or they suffer smoke-inhalation effects; the barbarian is immune to it.",
    contextNotes: [
      note(
        "Requires having chosen fire with Lesser Elemental Totem and taken Fire Totem, plus barbarian level 10. Affects nearby creatures, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterGroundBreaker",
    name: "Greater Ground Breaker",
    minLevel: 8,
    summary:
      "Ground Breaker's difficult-terrain/knockdown radius extends by 5 ft.; can be taken up to three times, stacking.",
    contextNotes: [
      note(
        "Requires Ground Breaker and barbarian level 8; same not-modeled reasoning as Ground Breaker — an area effect, not a flat self-buff.",
      ),
    ],
  },
  {
    id: "greaterGuardedLife",
    name: "Greater Guarded Life",
    minLevel: 6,
    summary:
      "Guarded Life's lethal-to-nonlethal conversion increases by 1 additional hit point per barbarian level.",
    contextNotes: [
      note(
        "Requires Guarded Life and barbarian level 6; same not-modeled reasoning as Guarded Life — no Change target for converting damage type on a triggered threshold.",
      ),
    ],
  },
  {
    id: "greaterHurling",
    name: "Greater Hurling",
    minLevel: 12,
    summary:
      "As Hurling, but may instead increase the range increment to 30 ft. or the hurled object's size by two categories.",
    contextNotes: [
      note(
        "Requires Hurling and barbarian level 12; same not-modeled reasoning as Hurling — an activated ranged attack.",
      ),
    ],
  },
  {
    id: "greaterInfernalBlood",
    name: "Greater Infernal Blood",
    minLevel: 10,
    summary: "While raging, gains a +4 bonus against enchantment effects and fear effects.",
    contextNotes: [
      note(
        "Requires Infernal Blood and barbarian level 10. Scoped to two effect categories, not a whole save type — the engine has no 'saves vs. enchantment+fear' target, so an unconditional Change here would overstate onto every save (same over-broad-target issue as Superstition).",
        "will",
      ),
    ],
  },
  {
    id: "greaterMoonTotem",
    name: "Greater Moon Totem",
    minLevel: 10,
    summary:
      "While raging, ignores the miss chance from concealment and treats total concealment as ordinary concealment.",
    contextNotes: [
      note(
        "Requires Moon Totem and barbarian level 10; a miss-chance rule, not a Change target this engine has.",
      ),
    ],
  },
  {
    id: "greaterPsychopompTotem",
    name: "Greater Psychopomp Totem",
    minLevel: 10,
    summary:
      "While raging, detects and locates undead within 30 ft. as though by blindsight, and any weapon she wields counts as having the ghost touch quality.",
    contextNotes: [
      note(
        "Requires Psychopomp Totem and barbarian level 10. The blindsight is scoped to undead only, not all creatures — the engine's sensebs target is an unconditional whole-blindsight grant, so applying it here would overstate detection to every creature type. The weapon quality grant isn't modeled either.",
        "sensebs",
      ),
    ],
  },
  {
    id: "greaterSpireTotem",
    name: "Greater Spire Totem",
    minLevel: 10,
    summary:
      "While raging, allies within 30 ft. gain a +2 morale bonus on Will saves, and may roll twice (taking the better) against fear effects.",
    contextNotes: [
      note(
        "Requires Spire Totem and barbarian level 10. Buffs allies, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterSpiritTotem",
    name: "Greater Spirit Totem",
    minLevel: 10,
    summary:
      "While raging, the spirit wisps from Spirit Totem reach 15 ft., their slam upgrades to 1d6 negative energy damage, and living enemies adjacent to the barbarian at the start of her turn take 1d8 negative energy damage.",
    contextNotes: [
      note(
        "Requires Spirit Totem and barbarian level 10. Damages nearby enemies, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "greaterSuffocatingGrip",
    name: "Greater Suffocating Grip",
    minLevel: 12,
    summary:
      "A creature grappled by Suffocating Grip can't hold its breath and begins suffocating immediately.",
    contextNotes: [
      note(
        "Requires Suffocating Grip and barbarian level 12; grapple-conditioned, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "greaterSunTotem",
    name: "Greater Sun Totem",
    minLevel: 10,
    summary:
      "While raging, gains fire resistance 20, a fiery halo that burns anyone hitting her with a touch/unarmed attack or a bull rush, drag, or grapple maneuver, and +1d6 fire damage on her own unarmed and natural-weapon attacks.",
    changes: [
      { formula: "20", target: "eres.fire", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note(
        "Requires Sun Totem and barbarian level 10; the fire resistance is unconditional and fixed-type, promoted the same way as Celestial Blood — but the retaliatory halo damage (hits an attacker) and the +1d6 fire on her own attacks are dice-based/targeted and aren't modeled.",
        "eres.fire",
      ),
    ],
  },
  {
    id: "greaterTyrantTotem",
    name: "Greater Tyrant Totem",
    minLevel: 12,
    summary: "While raging, gains the swallow whole special attack.",
    contextNotes: [
      note(
        "Requires Tyrant Totem and barbarian level 12; swallow whole isn't tracked as a Change.",
      ),
    ],
  },
  {
    id: "greaterUndeadBlood",
    name: "Greater Undead Blood",
    minLevel: 10,
    summary: "While raging, gains cold resistance 10 and DR 10/— against nonlethal damage.",
    changes: [
      { formula: "10", target: "eres.cold", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note(
        "Requires Undead Blood and barbarian level 10; the cold resistance is unconditional and fixed-type, promoted the same way as Celestial Blood. The nonlethal-only DR is a different mechanic than this engine's qualifier-bypass dr.<qualifier> targets (which reduce damage unless the attack has a specific quality, not 'only applies against one damage category') — no matching target, so it stays note-only.",
        "eres.cold",
      ),
    ],
  },
  {
    id: "greaterWaterTotem",
    name: "Greater Water Totem",
    minLevel: 10,
    summary:
      "While raging, gains tremorsense to 30 ft. while underwater, and can move and attack underwater as though under freedom of movement.",
    contextNotes: [
      note(
        "Requires Water Totem and barbarian level 10. Scoped to underwater only — the engine's sense/movement targets have no 'only while submerged' condition beyond the rage-buff gate, so an unconditional Change would overstate onto dry-land tremorsense.",
        "sensets",
      ),
    ],
  },
  {
    id: "groundBreaker",
    name: "Ground Breaker",
    minLevel: 6,
    summary:
      "Once per rage, as a standard action, attack the floor around her; if the damage exceeds the floor's hardness, her square and every adjacent square become difficult terrain and force a Reflex save or knock down anyone standing there.",
    contextNotes: [
      note("Barbarian level 6. Once-per-rage activated area attack, not modeled as a Change."),
    ],
  },
  {
    id: "guardedLife",
    name: "Guarded Life",
    minLevel: 1,
    summary:
      "While raging, if reduced below 0 hit points, converts 1 point of lethal damage per barbarian level to nonlethal; if already at negative hit points from lethal damage, stabilizes immediately.",
    contextNotes: [
      note(
        "Triggered by dropping below 0 hp — no Change target converts damage type on a threshold like this.",
      ),
    ],
  },
  {
    id: "hissingRage",
    name: "Hissing Rage",
    minLevel: 1,
    summary:
      "Once per hour, spit venom at an adjacent foe as a standard action (touch attack) or apply it as a swift action when a bite attack hits, dealing 1d2 Constitution damage on a failed save.",
    contextNotes: [note("Triggered poison delivery, once per hour; not modeled as a Change.")],
  },
  {
    id: "hiveTotem",
    name: "Hive Totem",
    minLevel: 4,
    summary:
      "While raging, takes half damage from vermin-swarm attacks (including swarm-like spells), and gains +1 per 4 barbarian levels (max +5) on Strength ability checks and to CMD against bull rush, drag, and trip.",
    contextNotes: [
      note(
        "Requires Animal Fury and barbarian level 4. Both bonuses are scoped — Strength ability checks only (not the whole ability score) and CMD against three specific maneuvers only (not whole CMD) — the engine has no 'ability check only' or 'CMD vs. specific maneuvers' target, so an unconditional Change would overstate onto every Strength use or every combat maneuver.",
        "cmd",
      ),
    ],
  },
  {
    id: "hiveTotemResilience",
    name: "Hive Totem Resilience",
    minLevel: 6,
    summary:
      "While raging, takes no damage at all from vermin-swarm attacks (including their secondary effects), and gains +1 per 4 barbarian levels (max +5) on combat maneuver checks and to CMD when grappling.",
    contextNotes: [
      note(
        "Requires Hive Totem and barbarian level 6. The CMB/CMD bonus is scoped to grappling only — same over-broad-target issue as Hive Totem.",
        "cmb",
      ),
    ],
  },
  {
    id: "hiveTotemToxicity",
    name: "Hive Totem Toxicity",
    minLevel: 8,
    summary:
      "While raging, the Animal Fury bite's damage die improves one step and its attack-roll penalty shrinks to -2; once per rage, a successful bite can deliver an injury poison (1d3 Constitution damage per round for 4 rounds, one save cures).",
    contextNotes: [
      note(
        "Requires Hive Totem and Hive Totem Resilience, barbarian level 8. Natural-attack die/poison mechanics, not Change targets this table models.",
      ),
    ],
  },
  {
    id: "hshurhasVeil",
    name: "Hshurha's Veil",
    minLevel: 6,
    summary:
      "While raging, can use Stealth and gains a bonus equal to half barbarian level on Stealth checks, plus the benefit of concealment against ranged attacks and attacks of opportunity.",
    contextNotes: [
      note(
        "An 'Elemental' rage power: requires Lesser Elemental Rage or Lesser Elemental Blood and barbarian level 6, only one elemental-category power (this, Aryzul's Curse, Kelizandri's Tide, Ymeri's Pyre) usable at a time, and an unchained barbarian needs the Elemental Stance to use it. That per-rage exclusive-choice shape is the same reason the stances in this table stay display-only — not simply 'on while raging'.",
        "skill.ste",
      ),
    ],
  },
  {
    id: "hurling",
    name: "Hurling",
    minLevel: 8,
    summary:
      "As Lesser Hurling, but may instead increase the range increment to 20 ft. or the hurled object's size by one category.",
    contextNotes: [
      note(
        "Requires Lesser Hurling and barbarian level 8; same not-modeled reasoning as Lesser Hurling — an activated ranged attack.",
      ),
    ],
  },
  {
    id: "hurlingCharge",
    name: "Hurling Charge",
    minLevel: 6,
    summary:
      "While raging and charging, may draw and throw a weapon partway through the charge (gaining the usual +2 on both that attack and the melee attack ending the charge), provided at least 10 ft. is moved before the throw and 10 more before the melee attack.",
    contextNotes: [
      note(
        "Requires Lesser Hurling and barbarian level 6; an activated charge variant, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "iceLinnormDeathCurse",
    name: "Ice Linnorm Death Curse",
    minLevel: 4,
    summary:
      "Melee attacks deal 1 additional point of cold damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or suffer the curse of frost (vulnerability to cold).",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as Cairn/Crag/Fjord Linnorm Death Curse — verified NOT scoped to 'while raging' (d20pfsrd.com). Barbarian level 4. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "impellingDisarm",
    name: "Impelling Disarm",
    minLevel: 4,
    summary:
      "Once per rage, in place of a melee attack, attempt a no-AoO disarm; on success, make a ranged attack (at -4) to send the disarmed weapon flying at the original target or another creature within 20 ft., dealing the weapon's damage on a hit.",
    contextNotes: [
      note("Barbarian level 4. Once-per-rage activated combat maneuver, not modeled as a Change."),
    ],
  },
  {
    id: "infernalBlood",
    name: "Infernal Blood",
    minLevel: 6,
    summary: "While raging, gains fire resistance 5 and a +2 bonus on saves against poison.",
    changes: [{ formula: "5", target: "eres.fire", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Requires Lesser Infernal Blood and barbarian level 6; the fire resistance is unconditional and fixed-type (promoted the same way as Celestial Blood). The poison-save bonus is scoped to poison only, not whole Fortitude — the engine has no 'saves vs. poison' target, so it stays note-only (same over-broad-target issue as Fierce Fortitude).",
        "fort",
      ),
    ],
  },
  {
    id: "inspireFerocity",
    name: "Inspire Ferocity",
    minLevel: 1,
    summary:
      "While raging, spend a move action to share the current Reckless Abandon trade-off with willing allies within 30 ft. for a number of rounds equal to Charisma modifier (minimum 1).",
    contextNotes: [note("Requires Reckless Abandon. Buffs allies, not the barbarian's own sheet.")],
  },
  {
    id: "inuredToTheDead",
    name: "Inured to the Dead",
    minLevel: 4,
    summary:
      "Once per rage, when failing a save against an undead-created effect, may reroll it (keeping the second result) as a free action.",
    contextNotes: [
      note("Barbarian level 4. Once-per-rage triggered reroll, not modeled as a Change."),
    ],
  },
  {
    id: "kelizandrisTide",
    name: "Kelizandri's Tide",
    minLevel: 6,
    summary:
      "While raging, as a full-round action, attempt a combat maneuver against every creature within 10 ft. to pull each 5 ft. closer on a success; once per day, may follow up with a free Whirlwind-Attack-style strike against every adjacent creature (twice per day if she also has Whirlwind Attack).",
    contextNotes: [
      note(
        "An 'Elemental' rage power — same exclusive-per-rage-choice shape as Hshurha's Veil (requires Lesser Elemental Rage/Blood, barbarian level 6, only one elemental power active at a time). Not modeled, same reasoning.",
      ),
    ],
  },
  {
    id: "knockdown",
    name: "Knockdown",
    minLevel: 1,
    summary:
      "Once per rage, in place of a melee attack, make a no-AoO trip attempt; on success also deals Strength-modifier damage.",
    contextNotes: [note("Once-per-rage activated combat maneuver, not modeled as a Change.")],
  },
  {
    id: "knockdownStance",
    name: "Knockdown Stance",
    minLevel: 1,
    summary:
      "Stance: while active, once per round may substitute a no-AoO trip attempt for a melee attack; success knocks the target prone (no extra damage).",
    contextNotes: [note("Activated stance, not modeled as a Change.")],
  },
  {
    id: "lesserAbyssalBlood",
    name: "Lesser Abyssal Blood",
    minLevel: 1,
    summary:
      "While raging, grows two primary claw attacks dealing 1d6 slashing (1d4 if Small) plus Strength modifier, at full base attack bonus.",
    contextNotes: [
      note(
        "Blood rage powers are mutually exclusive as a family — only one blood line may be known. Natural-attack grant, not modeled as a Change — add the claws manually to Weapons while raging, same posture as Animal Fury.",
      ),
    ],
  },
  {
    id: "lesserAncestorTotem",
    name: "Lesser Ancestor Totem",
    minLevel: 1,
    summary:
      "On entering a rage, choose a skill usable while raging; gain a +2 insight bonus to it for the rage's duration.",
    contextNotes: [
      note(
        "The skill choice is free-text, not a fixed Change target — no chooser mechanism in this table.",
      ),
    ],
  },
  {
    id: "lesserAtavismTotem",
    name: "Lesser Atavism Totem",
    minLevel: 1,
    summary:
      "Gains a bite attack, or if she already has one, it deals damage as though she were one size larger.",
    contextNotes: [note("Natural-attack grant/upsize, not modeled as a Change.")],
  },
  {
    id: "lesserBeastTotem",
    name: "Lesser Beast Totem",
    minLevel: 1,
    summary:
      "While raging, grows two primary claw attacks dealing 1d6 slashing (1d4 if Small) plus Strength modifier, at full base attack bonus.",
    contextNotes: [
      note(
        "Natural-attack grant, not modeled as a Change — same manual-Weapons-entry posture as Animal Fury/Lesser Abyssal Blood.",
      ),
    ],
  },
  {
    id: "lesserCelestialBlood",
    name: "Lesser Celestial Blood",
    minLevel: 1,
    summary:
      "While raging, melee attacks count as good-aligned for bypassing damage reduction, and deal an extra 1d6 damage against evil outsiders.",
    contextNotes: [
      note(
        "Situational bonus damage against a specific creature type plus a DR-bypass quality — neither is a flat self-buff this table models as a Change.",
      ),
    ],
  },
  {
    id: "lesserCelestialTotem",
    name: "Lesser Celestial Totem",
    minLevel: 1,
    summary:
      "While raging, magical healing she receives is more effective: +1 hit point per caster level from spells, or an amount equal to the healer's class level from non-spell healing (channeled energy, lay on hands, ...); doesn't affect fast healing or regeneration.",
    contextNotes: [
      note(
        "A rider on incoming healing, not a flat self-buff — no Change target for 'boost healing received'.",
      ),
    ],
  },
  {
    id: "lesserChaosTotem",
    name: "Lesser Chaos Totem",
    minLevel: 1,
    summary:
      "While raging, +1 deflection bonus to AC against lawful creatures' attacks and +1 resistance bonus on saves against confusion, insanity, polymorph, and lawful-descriptor effects; the bonus rises by 1 per additional Chaos Totem power known.",
    contextNotes: [
      note(
        "Both bonuses are alignment/effect-category-scoped (vs. lawful only) — not a general AC or save bonus, so the engine's whole ac/allSavingThrows targets would overstate it onto every attacker and every save. Same over-broad-target issue as Superstition.",
        "ac",
      ),
    ],
  },
  {
    id: "lesserCultTotem",
    name: "Lesser Cult Totem",
    minLevel: 1,
    summary:
      "While raging, morale bonuses and flanking bonuses that would apply to attack rolls are added to damage rolls instead (still morale bonuses, so they don't stack with other morale damage bonuses).",
    contextNotes: [
      note(
        "Reassigns an existing bonus's target rather than granting a new number — not representable as a flat Change.",
      ),
    ],
  },
  {
    id: "lesserDaemonTotem",
    name: "Lesser Daemon Totem",
    minLevel: 1,
    summary:
      "While raging, +2 bonus on saves against acid damage, death effects, disease, and poison, rising by 1 per additional Daemon Totem power known (excluding this one).",
    contextNotes: [
      note(
        "Scoped to four specific save categories, not a whole save type — the engine has no matching target, so an unconditional Change would overstate onto every Fortitude/Reflex save. Same over-broad-target issue as Superstition.",
        "fort",
      ),
    ],
  },
  {
    id: "lesserDraconicBlood",
    name: "Lesser Draconic Blood",
    minLevel: 1,
    summary:
      "While raging, grows two primary claw attacks dealing 1d6 slashing (1d4 if Small) plus Strength modifier, at full base attack bonus.",
    contextNotes: [
      note(
        "Natural-attack grant, not modeled as a Change — same manual-Weapons-entry posture as Lesser Abyssal Blood/Lesser Beast Totem.",
      ),
    ],
  },
  {
    id: "lesserElementalBlood",
    name: "Lesser Elemental Blood",
    minLevel: 1,
    summary:
      "Choose an energy type; while raging, up to three times a day as a swift action, imbue melee attacks with that energy for 1 round, adding 1d6 damage of that type.",
    // Declares the chain's energy-type choice: Elemental Blood and Greater
    // Elemental Blood key their choiceChanges off THIS power's stored pick
    // (`choiceFrom`). Its own swift-action 1d6 imbue stays prose — the
    // choice slot alone doesn't promote it.
    choice: { label: "Energy type", options: ENERGY_CHOICE_OPTIONS },
    contextNotes: [
      note(
        "Activated (swift action, limited uses/day) — the imbue itself is not modeled as a Change; the chosen energy type feeds Elemental Blood and Greater Elemental Blood.",
      ),
    ],
  },
  {
    id: "lesserElementalRage",
    name: "Lesser Elemental Rage",
    minLevel: 4,
    summary:
      "As a swift action, cause melee attacks to deal an extra 1d6 energy damage (acid, cold, electricity, or fire, chosen when used) for 1 round; usable once per rage.",
    contextNotes: [
      note(
        "Barbarian level 4. Activated, once per rage, dice-based, player-chosen type — not modeled as a Change.",
      ),
    ],
  },
  {
    id: "lesserElementalTotem",
    name: "Lesser Elemental Totem",
    minLevel: 1,
    summary:
      "Choose an elemental type (air, earth, fire, or water), permanently; while raging, gain a +1 bonus (scaling +1 every 4 levels, max +6 at 20th) on saves against spells with that descriptor, and gain access to the matching Totem power.",
    contextNotes: [
      note(
        "The save bonus is scoped to one elemental descriptor, not a whole save type, and the element itself is a player choice with no chooser in this table — same over-broad-target/blocked-choice issues as Superstition and Elemental Blood.",
        "will",
      ),
    ],
  },
  {
    id: "lesserFeyBlood",
    name: "Lesser Fey Blood",
    minLevel: 1,
    summary:
      "While raging, confirming a critical hit forces the target to save or be confused for 1 round (mind-affecting compulsion).",
    contextNotes: [note("Crit-triggered debuff on the target, not a self-buff.")],
  },
  {
    id: "lesserFiendTotem",
    name: "Lesser Fiend Totem",
    minLevel: 1,
    summary:
      "While raging, grows a gore attack (1d8 piercing, 1d6 if Small, plus Strength modifier) — primary if unarmed, secondary (half Strength, -5 to hit) if also attacking with weapons.",
    contextNotes: [
      note(
        "Natural-attack grant, not modeled as a Change — same manual-Weapons-entry posture as Animal Fury.",
      ),
    ],
  },
  {
    id: "lesserHurling",
    name: "Lesser Hurling",
    minLevel: 1,
    summary:
      "As a full-round action while raging, hurl an improvised object (up to one size smaller two-handed, or two sizes smaller one-handed) as a ranged touch attack with a 10-ft. range increment, dealing falling-object damage plus Strength bonus (halved if not stone/metal); Reflex save for half.",
    contextNotes: [note("Activated ranged attack, not modeled as a Change.")],
  },
  {
    id: "lesserInfernalBlood",
    name: "Lesser Infernal Blood",
    minLevel: 1,
    summary:
      "Up to three times a day as a swift action while raging, infuse melee attacks with the flaming weapon special ability for 1 round.",
    contextNotes: [note("Activated, limited uses/day — not modeled as a Change.")],
  },
  {
    id: "lesserMoonTotem",
    name: "Lesser Moon Totem",
    minLevel: 1,
    summary:
      "While raging, gains darkvision 30 ft., or if she already has darkvision, its range increases by 30 ft.",
    // `operator: "add"` extends existing darkvision instead of competing
    // with it (senses.ts) — "gain 30, or +30 if you already have it" is
    // exactly `existing + 30`, so both halves of the wording apply for real.
    changes: [
      {
        formula: "30",
        operator: "add",
        target: "sensedv",
        type: "untyped",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
  },
  {
    id: "lesserPsychopompTotem",
    name: "Lesser Psychopomp Totem",
    minLevel: 1,
    summary:
      "While raging, +1 deflection bonus to AC against undead attacks and +1 bonus on saves against death effects, disease, and poison, rising by 1 per additional Psychopomp Totem power known (excluding this one).",
    contextNotes: [
      note(
        "Both bonuses are creature-type/effect-category-scoped, not general — same over-broad-target issue as Lesser Daemon Totem/Superstition.",
        "ac",
      ),
    ],
  },
  {
    id: "lesserSpireTotem",
    name: "Lesser Spire Totem",
    minLevel: 1,
    summary:
      "While raging, +1 morale bonus on attack rolls against any creature that targeted an ally with an attack or harmful spell in the last round.",
    contextNotes: [note("Conditional on which creature she's fighting, not a flat self-buff.")],
  },
  {
    id: "lesserSpiritTotem",
    name: "Lesser Spirit Totem",
    minLevel: 1,
    summary:
      "While raging, spirit wisps surround her and make a slam attack (full base attack bonus + Charisma modifier, 1d4 + Charisma modifier negative energy damage) each round against an adjacent living foe.",
    contextNotes: [note("Damages nearby enemies, not the barbarian's own sheet.")],
  },
  {
    id: "lesserSunTotem",
    name: "Lesser Sun Totem",
    minLevel: 1,
    summary:
      "Immune to environmental heat, +2 Fortitude bonus against extreme heat, and fire resistance 5 while raging.",
    changes: [{ formula: "5", target: "eres.fire", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "The fire resistance is unconditional and fixed-type (promoted the same way as Celestial Blood). The environmental-heat immunity and the extreme-heat Fortitude bonus have no matching targets — a whole-Fortitude Change would overstate the latter onto every save.",
        "eres.fire",
      ),
    ],
  },
  {
    id: "lesserTyrantTotem",
    name: "Lesser Tyrant Totem",
    minLevel: 1,
    summary:
      "While raging, the barbarian's bite attack (from Animal Fury or a natural bite) deals damage as though she were one size larger.",
    contextNotes: [
      note(
        "Requires Animal Fury or a natural bite attack. Natural-attack upsize, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "lesserUndeadBlood",
    name: "Lesser Undead Blood",
    minLevel: 1,
    summary:
      "While raging, a successful charge attack leaves the target shaken for rounds equal to half barbarian level (minimum 1); doesn't stack with other fear effects into a worse condition.",
    contextNotes: [note("Charge-triggered debuff on the target, not a self-buff.")],
  },
  {
    id: "lethalAccuracy",
    name: "Lethal Accuracy",
    minLevel: 16,
    summary:
      "When using Surprise Accuracy, the critical multiplier for that attack's damage increases by 1 step.",
    contextNotes: [
      note(
        "Requires Surprise Accuracy, Deadly Accuracy, and barbarian level 16. Conditioned on activating Surprise Accuracy, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "liquidCourage",
    name: "Liquid Courage",
    minLevel: 1,
    summary:
      "While raging, each alcoholic drink consumed adds +1 morale bonus on saves against mind-affecting effects, up to +1 per 4 barbarian levels.",
    contextNotes: [
      note(
        "Scoped to mind-affecting saves only, and scales with drinks consumed rather than a level formula alone — not modeled as a Change.",
        "will",
      ),
    ],
  },
  {
    id: "lizardStride",
    name: "Lizard Stride",
    minLevel: 1,
    summary:
      "While charging or running during a rage, can cross the surface of water without sinking (sinks if she stops on it).",
    contextNotes: [note("Situational movement rule, not a Change target this engine has.")],
  },
  {
    id: "masterOfTheDeep",
    name: "Master of the Deep",
    minLevel: 8,
    summary:
      "As a standard action, issue a command-spell-style order (or an attack order, for a mindless/near-mindless target) to an aquatic creature within 30 ft.; a failed Will save compels obedience next turn. A creature is immune for 24 hours after its first save.",
    contextNotes: [
      note("Barbarian level 8. Activated, targets another creature — not modeled as a Change."),
    ],
  },
  {
    id: "mightySwing",
    name: "Mighty Swing",
    minLevel: 12,
    summary: "As an immediate action once per rage, automatically confirm a critical hit.",
    contextNotes: [
      note("Barbarian level 12. Once-per-rage activated ability, not modeled as a Change."),
    ],
  },
  {
    id: "moonTotem",
    name: "Moon Totem",
    minLevel: 6,
    summary:
      "While raging, gains a bonus equal to half barbarian level on Perception checks to pinpoint unseen creatures, and unseen attackers gain no bonus on attacks against her.",
    contextNotes: [
      note(
        "Requires Lesser Moon Totem and barbarian level 6. The Perception bonus is scoped to pinpointing unseen creatures only, not general Perception — same over-broad-target/partial-skill-use-case issue as Raging Leaper.",
        "skill.per",
      ),
    ],
  },
  {
    id: "nightVision",
    name: "Night Vision",
    minLevel: 1,
    summary: "While raging, gains darkvision 60 ft.",
    changes: [{ formula: "60", target: "sensedv", type: "untyped", activeWhenBuff: WHILE_RAGING }],
    contextNotes: [
      note(
        "Requires Low-Light Vision (as a rage power or racial trait). Unconditional flat grant while raging, and (per senses.ts / shifter-aspects.ts's Bat aspect) darkvision sources resolve highest-wins — so this correctly does nothing when a better darkvision source is already present.",
        "sensedv",
      ),
    ],
  },
  {
    id: "overbearingAdvance",
    name: "Overbearing Advance",
    minLevel: 1,
    summary:
      "While raging, a successful overrun combat maneuver also deals damage equal to her Strength bonus.",
    contextNotes: [
      note("Triggered by a successful maneuver against a target — not a self-buff Change."),
    ],
  },
  {
    id: "overbearingOnslaught",
    name: "Overbearing Onslaught",
    minLevel: 6,
    summary:
      "While raging, may overrun more than one target in a round, taking a cumulative -2 penalty on the combat maneuver check for each overrun attempt after the first.",
    contextNotes: [
      note(
        "Requires Overbearing Advance and barbarian level 6. A per-use penalty on a triggered maneuver, not a self-buff Change.",
      ),
    ],
  },
  {
    id: "packRage",
    name: "Pack Rage",
    minLevel: 6,
    summary:
      "When entering a rage, any other barbarian within 30 ft. who also knows this power may enter a rage too, spending rage rounds accordingly if it's not her turn.",
    contextNotes: [
      note(
        "Barbarian level 6. A rage-sharing trigger between characters, not a Change on the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "penetratingBite",
    name: "Penetrating Bite",
    minLevel: 4,
    summary:
      "The Animal Fury bite progressively bypasses more damage reduction as barbarian level rises: magic at 4th, cold iron and silver at 7th, chaotic at 10th, adamantine (also bypassing hardness) at 16th.",
    contextNotes: [
      note(
        "Requires Animal Fury and barbarian level 4. Upgrades a natural weapon's DR-bypass quality, not a Change target on the barbarian's own defenses.",
      ),
    ],
  },
  {
    id: "perfectClarity",
    name: "Perfect Clarity",
    minLevel: 1,
    summary:
      "While using Moment of Clarity, may roll twice (taking the better) for miss chances or Will saves to disbelieve illusions.",
    contextNotes: [
      note(
        "Requires Moment of Clarity. Conditioned on activating that free action, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "powerfulStance",
    name: "Powerful Stance",
    minLevel: 1,
    summary:
      "Stance: while active, +1 bonus on melee and thrown weapon damage rolls, scaling +1 per 4 barbarian levels.",
    contextNotes: [
      note(
        "Activated stance (own action to enter/exit), not simply on-while-raging — not modeled as a Change, same posture as Accurate Stance.",
        "damage",
      ),
    ],
  },
  {
    id: "primalScent",
    name: "Primal Scent",
    minLevel: 8,
    summary:
      "While using Scent, adds half barbarian level on Survival checks to track by scent and on Perception checks to pinpoint creatures she can't see; a pinpointed totally-concealed creature is treated as merely concealed.",
    contextNotes: [
      note(
        "Requires Scent and barbarian level 8. Both bonuses are scoped to specific check use-cases (tracking-by-scent, pinpointing-the-unseen), not whole Survival/Perception — same over-broad-target issue as Raging Leaper.",
        "skill.sur",
      ),
    ],
  },
  {
    id: "psychopompTotem",
    name: "Psychopomp Totem",
    minLevel: 6,
    summary:
      "While raging, the first time each round she strikes a creature with regeneration or fast healing, it must save or have that ability suppressed for 1 round.",
    contextNotes: [
      note(
        "Requires Lesser Psychopomp Totem and barbarian level 6. Debuffs a struck creature, not a self-buff.",
      ),
    ],
  },
  {
    id: "ragingFlier",
    name: "Raging Flier",
    minLevel: 6,
    summary:
      "Once per rage, as a move action, fly up to base speed (usable as part of a charge's movement).",
    contextNotes: [
      note(
        "Requires Raging Leaper and barbarian level 6. Once-per-rage activated flight, not unconditional-while-raging — not modeled as a Change, unlike Raging Flyer's flat skill bonus below.",
      ),
    ],
  },
  {
    id: "ragingFlyer",
    name: "Raging Flyer",
    minLevel: 1,
    summary: "While raging, adds barbarian level as an enhancement bonus on Fly checks.",
    changes: [
      {
        formula: BARBARIAN_LEVEL_SUM,
        target: "skill.fly",
        type: "enhancement",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
    contextNotes: [
      note(
        "Same shape as Raging Climber/Raging Swimmer: an enhancement bonus equal to barbarian level on one whole skill, with no partial-use-case split — promoted the same way.",
        "skill.fly",
      ),
    ],
  },
  {
    id: "ragingGrappler",
    name: "Raging Grappler",
    minLevel: 1,
    summary:
      "While raging, a successful check to start a grapple can also count as succeeding at maintaining it, and a successful check to maintain a grapple can impose prone on herself, the target, or both as a free action.",
    contextNotes: [
      note("A set of player-chosen options on a combat maneuver, not a flat self-buff."),
    ],
  },
  {
    id: "ragingWhirlwind",
    name: "Raging Whirlwind",
    minLevel: 12,
    summary:
      "As an immediate action after confirming a melee critical hit, may spin the target into the air until the end of her turn; a failed Fortitude save strips its Dexterity bonus to AC for the rest of her turn and drops it prone at the end. No effect on flying creatures.",
    contextNotes: [
      note("Barbarian level 12. Crit-triggered debuff on the target, not a self-buff."),
    ],
  },
  {
    id: "recklessStance",
    name: "Reckless Stance",
    minLevel: 1,
    summary:
      "Stance: while active, +1 bonus on attack rolls and -1 penalty to AC, both scaling by 1 every 4 barbarian levels.",
    contextNotes: [
      note(
        "Activated stance, not modeled as a Change — same posture as Accurate Stance/Powerful Stance.",
        "attack",
      ),
    ],
  },
  {
    id: "reflexiveDodge",
    name: "Reflexive Dodge",
    minLevel: 6,
    summary: "While using Rolling Dodge, may also apply its dodge bonus to Reflex saving throws.",
    contextNotes: [
      note(
        "Requires Rolling Dodge and barbarian level 6. Conditioned on activating Rolling Dodge (itself a per-round activation, not modeled), so this isn't either.",
      ),
    ],
  },
  {
    id: "regenerativeStance",
    name: "Regenerative Stance",
    minLevel: 4,
    summary:
      "Stance: at the start of her turn, regains 1 temporary hit point per 4 barbarian levels (max 5/round), capped by rage's normal temporary-hit-point maximum.",
    contextNotes: [note("Barbarian level 4. Activated stance, not modeled as a Change.")],
  },
  {
    id: "regenerativeVigor",
    name: "Regenerative Vigor",
    minLevel: 6,
    summary:
      "After using Renewed Vigor, gains fast healing 1 per 6 barbarian levels (max 3) until the current rage ends.",
    contextNotes: [
      note(
        "Requires Renewed Vigor and barbarian level 6. Conditioned on having just used the once-per-day Renewed Vigor, not unconditional-while-raging — not modeled as a Change.",
      ),
    ],
  },
  {
    id: "renewedLife",
    name: "Renewed Life",
    minLevel: 6,
    summary:
      "While raging, ignores the effect of one temporary negative level per 4 barbarian levels (max 5); once per day on ending a rage with negative levels remaining, may attempt saves to remove up to that many.",
    contextNotes: [
      note(
        "Requires Renewed Vitality and barbarian level 6. No Change target for ignoring negative-level effects; the once-daily save-off clause isn't modeled either.",
      ),
    ],
  },
  {
    id: "renewedVitality",
    name: "Renewed Vitality",
    minLevel: 4,
    summary:
      "While raging, ignores 1 point of ability penalty or damage per 2 barbarian levels (max 10); once per day on ending a rage with such damage remaining, may reroll a save that caused it and remove a matching amount on success.",
    contextNotes: [
      note(
        "Requires Renewed Vigor and barbarian level 4. No Change target for ignoring ability damage/penalties; the once-daily reroll clause isn't modeled either.",
      ),
    ],
  },
  {
    id: "roaringDrunk",
    name: "Roaring Drunk",
    minLevel: 1,
    summary:
      "While raging, each alcoholic drink consumed adds +1 morale bonus on Intimidate checks and to the save DC of fear effects she creates, up to +1 per 4 barbarian levels.",
    contextNotes: [
      note(
        "Scales with drinks consumed rather than a level formula alone, and the fear-DC bonus isn't a self-buff Change target — not modeled.",
        "skill.int",
      ),
    ],
  },

  /* ---------------------------------------------------------- #74 sweep, batch 3 (S-Z) -- */

  {
    id: "savageDirtyTrick",
    name: "Savage Dirty Trick",
    minLevel: 6,
    summary:
      "Once per round while raging, substitute a no-AoO dirty trick combat maneuver for a melee attack, dealing Strength-modifier damage; on a failed Fortitude save the target also suffers a brief extra penalty tied to the dirty trick chosen (e.g. blinded → staggered). Usable once per opponent per rage.",
    contextNotes: [
      note(
        "Barbarian level 6. Triggered combat-maneuver substitute with a save-DC table keyed to the maneuver's initial condition — not modeled as a Change.",
      ),
    ],
  },
  {
    id: "savageHurl",
    name: "Savage Hurl",
    minLevel: 1,
    summary:
      "+1 bonus on ranged attack rolls with thrown weapons that add Dexterity bonus to the attack roll, scaling to +2/+3/+4 at 4th/8th/12th level, each step gated on a rising Strength-modifier minimum.",
    contextNotes: [
      note(
        "Scoped to thrown weapons using Dex-to-attack only, not a general ranged-attack bonus, and gated on a Strength-modifier threshold as well as barbarian level — no clean Change target.",
        "attack",
      ),
    ],
  },
  {
    id: "savageIntuition",
    name: "Savage Intuition",
    minLevel: 1,
    summary:
      "If rounds of rage remain, automatically enter a rage at the start of the first round of combat (or the surprise round) with no action required, even if unaware combat has begun.",
    contextNotes: [
      note(
        "Requires being wereboar-kin or associated with wereboar-kin (not modeled). A combat-start trigger, not a Change.",
      ),
    ],
  },
  {
    id: "savageJaw",
    name: "Savage Jaw",
    minLevel: 1,
    summary:
      "While using Animal Fury, activate as a free action to gain the grab ability with the bite attack until the start of the next turn. Once per rage.",
    contextNotes: [
      note("Requires Animal Fury. Once-per-rage activated grab, not modeled as a Change."),
    ],
  },
  {
    id: "sharpenedAccuracy",
    name: "Sharpened Accuracy",
    minLevel: 8,
    summary:
      "While using Surprise Accuracy, ignore the miss chance from concealment (treating total concealment as concealment) and ignore cover penalties except from total cover.",
    contextNotes: [
      note(
        "Requires Surprise Accuracy and barbarian level 8. Conditioned on activating Surprise Accuracy (itself not modeled), so this isn't either.",
      ),
    ],
  },
  {
    id: "smasher",
    name: "Smasher",
    minLevel: 1,
    summary:
      "Once per rage, before the attack roll or sunder check, ignore an unattended object's hardness for an attack against it or a sunder combat maneuver.",
    contextNotes: [note("Once-per-rage activated ability, not modeled as a Change.")],
  },
  {
    id: "spellbreaker",
    name: "Spellbreaker",
    minLevel: 12,
    summary: "While raging, gain Spellbreaker as a bonus feat.",
    contextNotes: [
      note("Requires Disruptive and barbarian level 12. Feat grant, not modeled as a Change."),
    ],
  },
  {
    id: "spireTotem",
    name: "Spire Totem",
    minLevel: 6,
    summary:
      "While raging, take no penalty for dealing nonlethal damage with a weapon, and add half barbarian level to nonlethal damage rolls.",
    contextNotes: [
      note(
        "Requires Lesser Spire Totem and barbarian level 6. Scoped to nonlethal damage rolls only, not general damage — the engine's damage target is whole-attack, so an unconditional Change here would overstate onto lethal damage too.",
        "damage",
      ),
    ],
  },
  {
    id: "spiritSteed",
    name: "Spirit Steed",
    minLevel: 6,
    summary:
      "While raging and mounted, the mount gains DR/magic equal to half barbarian level, and its natural weapons count as magic for bypassing damage reduction.",
    contextNotes: [
      note(
        "Requires Ferocious Mount and barbarian level 6. Affects the mount, not the barbarian's own sheet.",
      ),
    ],
  },
  {
    id: "spiritTotem",
    name: "Spirit Totem",
    minLevel: 6,
    summary:
      "While raging, spirits surrounding the barbarian grant a 20% miss chance against ranged attacks and against melee attacks from non-adjacent creatures.",
    contextNotes: [
      note(
        "Requires Lesser Spirit Totem and barbarian level 6. A percentage miss chance, not a Change target this engine has (same posture as Chaos Totem's crit/sneak-attack-negation chance).",
      ),
    ],
  },
  {
    id: "spiritualAwareness",
    name: "Spiritual Awareness",
    minLevel: 1,
    summary:
      "While raging, the dodge bonus to AC from Trap Sense also applies against attacks made by incorporeal creatures.",
    contextNotes: [
      note(
        "Requires Trap Sense. A rider on an existing Trap Sense bonus, not a flat self-buff — no Change target for widening what an existing bonus applies against.",
        "ac",
      ),
    ],
  },
  {
    id: "springRage",
    name: "Spring Rage",
    minLevel: 1,
    summary:
      "While raging, ignore ability-score penalties from aging and the penalties (not the levels themselves) from negative levels.",
    contextNotes: [
      note(
        "Only one season-themed rage power (spring/summer/autumn/winter) can be known at a time. Ignoring a specific penalty source has no matching Change target — not modeled.",
      ),
    ],
  },
  {
    id: "sprint",
    name: "Sprint",
    minLevel: 4,
    summary: "Once per rage, run at 6x speed or charge at 3x speed as a full-round action.",
    contextNotes: [
      note(
        "Requires Swift Foot and barbarian level 4. Once-per-rage activated movement, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "staggeringDrunk",
    name: "Staggering Drunk",
    minLevel: 1,
    summary:
      "While raging, +1 dodge bonus to AC against attacks of opportunity per alcoholic drink consumed this rage, up to +1 per 4 barbarian levels.",
    contextNotes: [
      note(
        "Scoped to AoO only and scales with drinks consumed rather than a level formula alone, same posture as Roaring Drunk/Liquid Courage — not modeled.",
        "ac",
      ),
    ],
  },
  {
    id: "strengthStance",
    name: "Strength Stance",
    minLevel: 1,
    summary:
      "Stance: while active, +1 competence bonus (scaling +1/4 levels) on combat maneuver checks and to CMD, plus a flat +8 competence bonus on Strength checks to lift/push/bend/break objects.",
    contextNotes: [
      note(
        "Activated stance, not modeled as a Change — same posture as Accurate Stance/Powerful Stance/Reckless Stance.",
        "cmb",
      ),
    ],
  },
  {
    id: "suffocatingGrip",
    name: "Suffocating Grip",
    minLevel: 1,
    summary:
      "While raging, a maintained grapple can choke the opponent instead of dealing damage/moving/pinning/tying it up — it can't speak or breathe and must hold its breath or begin suffocating.",
    contextNotes: [note("Triggered by maintaining a grapple, not a self-buff Change.")],
  },
  {
    id: "summerRage",
    name: "Summer Rage",
    minLevel: 1,
    summary:
      "While raging, a creature within reach becomes fatigued for as long as it remains there, unless it succeeds at a Fortitude save (becoming immune for 24 hours).",
    contextNotes: [
      note(
        "Only one season-themed rage power can be known at a time. Debuffs nearby creatures, not a self-buff.",
      ),
    ],
  },
  {
    id: "sunTotem",
    name: "Sun Totem",
    minLevel: 6,
    summary:
      "While raging, fire resistance 10; also, for 1d6 rounds after touching open flame, speed increases by 10 ft.",
    changes: [
      { formula: "10", target: "eres.fire", type: "untyped", activeWhenBuff: WHILE_RAGING },
    ],
    contextNotes: [
      note(
        "Requires Lesser Sun Totem and barbarian level 6 — the middle tier of the Lesser (5) / Sun Totem (10) / Greater (20) fire-resistance chain, promoted the same way as its siblings (verified against d20pfsrd.com: 'She gains fire resistance 10 when raging'). The 1d6-round, flame-contact-triggered +10 ft. speed bonus is dice-duration and conditional — not modeled.",
        "eres.fire",
      ),
    ],
  },
  {
    id: "sunderEnchantment",
    name: "Sunder Enchantment",
    minLevel: 8,
    summary:
      "While raging, a successful sunder against a magic item suppresses its magical abilities for 1 round, plus 1 round per 5 points the combat maneuver check exceeded the target's CMD.",
    contextNotes: [
      note(
        "Requires Spell Sunder and barbarian level 8. Triggered by a successful sunder, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "taigaLinnormDeathCurse",
    name: "Taiga Linnorm Death Curse",
    minLevel: 4,
    summary:
      "Melee attacks deal 1 additional point of electricity damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or gain vulnerability to electricity.",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as the Cairn/Crag/Fjord/Ice/Tor Linnorm Death Curses — verified NOT scoped to 'while raging'. Barbarian level 4. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "tarnLinnormDeathCurse",
    name: "Tarn Linnorm Death Curse",
    minLevel: 4,
    summary:
      "Melee attacks deal 1 additional point of acid damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or become immune to healing (magical or natural) until the curse is removed.",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as the other Linnorm Death Curses. Barbarian level 4. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "tauntingStance",
    name: "Taunting Stance",
    minLevel: 12,
    summary:
      "Stance: while active, enemies gain +4 on attack and damage rolls against the barbarian, but every attack against her provokes an attack of opportunity from her, resolved before the provoking attack.",
    contextNotes: [
      note(
        "Activated stance, same shape as Come and Get Me but toggled rather than free-action — not modeled as a Change; the bonus applies to enemies, not the barbarian's own sheet, either way.",
      ),
    ],
  },
  {
    id: "torLinnormDeathCurse",
    name: "Tor Linnorm Death Curse",
    minLevel: 8,
    summary:
      "Melee attacks deal 1 additional point of fire damage. If the barbarian is knocked unconscious or killed by an attack or spell, the attacker must save or gain vulnerability to fire and become permanently staggered by the pain.",
    changes: [{ formula: "1", target: "mwdamage", type: "untyped" }],
    contextNotes: [
      note(
        "The +1 damage is unconditional, same as the other Linnorm Death Curses. Barbarian level 8. The retaliation clause targets the attacker — not modeled.",
        "mwdamage",
      ),
    ],
  },
  {
    id: "twoFangedPounce",
    name: "Two-Fanged Pounce",
    minLevel: 1,
    summary:
      "While charging with a pair of daggers, kukris, or punching daggers, attack once with each weapon in place of the normal charge attack, losing the charge attack bonus and taking an extra -2 AC penalty; precision damage/on-hit effects apply only once even if both attacks land.",
    contextNotes: [
      note(
        "Requires wielding a matched pair of light piercing weapons and charging — a full attack-routine substitution with its own trade-offs, not a flat self-buff Change.",
      ),
    ],
  },
  {
    id: "tyrantTotem",
    name: "Tyrant Totem",
    minLevel: 8,
    summary:
      "While raging, begin a grapple as a free action against any creature hit with the bite attack.",
    contextNotes: [
      note(
        "Requires Lesser Tyrant Totem and barbarian level 8. Triggered by a successful bite hit, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "ultimateClarity",
    name: "Ultimate Clarity",
    minLevel: 6,
    summary:
      "Once per rage, for 1 round, see through normal and magical darkness, invisibility, and illusions, and discern the exact location of concealed creatures — usable without activating Moment of Clarity.",
    contextNotes: [
      note(
        "Requires Moment of Clarity, Perfect Clarity, and barbarian level 6. Once-per-rage activated true-seeing-style ability, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "undeadBlood",
    name: "Undead Blood",
    minLevel: 6,
    summary: "While raging, all melee attacks count as though made with a ghost touch weapon.",
    contextNotes: [
      note(
        "Requires Lesser Undead Blood and barbarian level 6. Verified against d20pfsrd.com: unlike Greater Undead Blood (cold resistance 10, promoted in batch 2), this base tier grants only the ghost touch weapon quality — no numeric resistance or DR at all, so there's nothing here to promote.",
      ),
    ],
  },
  {
    id: "unexpectedStrike",
    name: "Unexpected Strike",
    minLevel: 8,
    summary:
      "Once per rage, make an attack of opportunity against a foe that moves into a threatened square, even if that movement wouldn't normally provoke one.",
    contextNotes: [
      note("Barbarian level 8. Once-per-rage triggered attack, not modeled as a Change."),
    ],
  },
  {
    id: "unrestrainedRage",
    name: "Unrestrained Rage",
    minLevel: 12,
    summary:
      "While raging, immune to paralysis. If targeted by a would-be paralysis effect while not raging, may enter a rage as an immediate action (if rounds remain) to avoid it.",
    changes: [
      {
        formula: "1",
        target: "immEffect.paralysis",
        type: "untyped",
        activeWhenBuff: WHILE_RAGING,
      },
    ],
    contextNotes: [
      note(
        "Barbarian level 12. The flat while-raging paralysis immunity matches the engine's closed immEffect vocabulary exactly (immEffect.paralysis — same slug alchemist-discoveries.ts's Cognatogen uses unconditionally), unlike Fearless Rage's over-broad fear target, so it's promoted. The immediate-action rage-to-dodge-paralysis clause (relevant only while NOT already raging) isn't modeled.",
        "immEffect.paralysis",
      ),
    ],
  },
  {
    id: "vipersBreath",
    name: "Viper's Breath",
    minLevel: 1,
    summary:
      "While holding a dose of poison in the mouth, exhale a 15-ft. cone of it as inhaled poison; targets save against the poison at DC -4 or suffer its effects immediately.",
    contextNotes: [
      note("Requires Viper's Kiss. Activated ranged attack, not modeled as a Change."),
    ],
  },
  {
    id: "vipersKiss",
    name: "Viper's Kiss",
    minLevel: 1,
    summary:
      "Drink a dose of ingested poison as a move action instead of standard; can hold it in the mouth for rounds equal to Constitution modifier (min 1) and deliver it via the next successful bite attack instead.",
    contextNotes: [
      note(
        "Requires a bite attack (e.g. from Animal Fury) at least while raging. Activated poison-delivery mechanic, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "waterSense",
    name: "Water Sense",
    minLevel: 1,
    summary:
      "While raging and on land, foes in water gain only partial (not improved) cover from the barbarian's attacks, and ranged attacks against them suffer only -1 per 5 ft. of water instead of -2.",
    contextNotes: [
      note(
        "Not a sense grant (no fixed-range tremorsense/blindsense) — it reduces an existing cover/range penalty in a specific attacker-vs.-target-in-water scenario, which has no matching Change target.",
      ),
    ],
  },
  {
    id: "waterTotem",
    name: "Water Totem",
    minLevel: 6,
    summary: "While raging, breathe water as well as air.",
    contextNotes: [
      note(
        "Requires having chosen water with Lesser Elemental Totem, and barbarian level 6. Waterbreathing isn't a Change target this engine tracks (same posture as Air Totem's air walk).",
      ),
    ],
  },
  {
    id: "winterRage",
    name: "Winter Rage",
    minLevel: 1,
    summary:
      "Standard action: exhale a 20-ft. cone of frigid air; creatures moving through it move at half speed until the barbarian's next turn.",
    contextNotes: [
      note(
        "Only one season-themed rage power can be known at a time. Debuffs an area, not a self-buff.",
      ),
    ],
  },
  {
    id: "worldSerpentSpirit",
    name: "World Serpent Spirit",
    minLevel: 6,
    summary:
      "While raging, weapons count as chaotic, evil, good, and lawful for bypassing damage reduction; also +1 resistance bonus on saves against alignment-descriptor effects or effects from outsiders/aberrations, scaling +1 per other World Serpent power known.",
    contextNotes: [
      note(
        "Requires World Serpent Totem and barbarian level 6. The DR-bypass weapon quality isn't a numeric Change (same as Greater Chaos Totem's unmodeled chaotic-weapons clause); the save bonus is scoped to alignment-descriptor/outsider/aberration sources only, not a whole save type — same over-broad-target issue as Superstition.",
        "will",
      ),
    ],
  },
  {
    id: "worldSerpentTotem",
    name: "World Serpent Totem",
    minLevel: 1,
    summary:
      "While raging, +1 insight bonus to AC against outsiders and aberrations, scaling +1 per other World Serpent power known. Requires the Totem Warrior archetype; mutually exclusive with every other totem family.",
    contextNotes: [
      note(
        "Creature-type-scoped AC bonus (outsiders/aberrations only), not a general AC bonus — same never-promote rule as Lesser Chaos Totem's alignment-scoped deflection AC.",
        "ac",
      ),
    ],
  },
  {
    id: "worldSerpentTotemUnity",
    name: "World Serpent Totem Unity",
    minLevel: 10,
    summary:
      "While raging, doubles the barbarian's fast-movement bonus to land speed, prevents being knocked prone, and doubles World Serpent Totem's AC bonus specifically against outsiders'/aberrations' critical-hit confirmation rolls.",
    contextNotes: [
      note(
        "Requires World Serpent Totem, World Serpent Spirit, and barbarian level 10. Every clause here derives from another bonus/condition rather than granting a flat number of its own — not modeled.",
      ),
    ],
  },
  {
    id: "ymerisPyre",
    name: "Ymeri's Pyre",
    minLevel: 6,
    summary:
      "While raging, each round reduces the remaining duration of harmful ongoing effects on the barbarian as though 2 rounds had passed; once per day, spend 5 rounds of rage to re-attempt saves against every non-permanent effect currently affecting her.",
    contextNotes: [
      note(
        "An 'Elemental' rage power — same exclusive-per-rage-choice shape as Hshurha's Veil/Aryzul's Curse/Kelizandri's Tide (requires Lesser Elemental Rage/Blood, barbarian level 6, only one elemental power usable at a time; an unchained barbarian needs Elemental Stance). Not modeled, same reasoning.",
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
 * this same audit for its 70 additions, batch 2 (G-R) for its 106, and batch
 * 3 (S-Z) for its final 38 — all three batches: zero collisions, zero
 * aliases needed. FINAL STATE (issue #74, full parity): all 243
 * hand-authored entries matched a vendored entry by normalized name; `RAGE_POWER_NAME_ALIASES`
 * stays empty across the entire table.
 *
 * One name COLLIDES within the vendored catalog itself: "Guarded Stance"
 * appears twice — the Core Rulebook original (`guarded_stance`, no
 * `category`) and a reworded Pathfinder Unchained "Stance"-category variant
 * (`guarded_stance_stance`, different scaling/duration). The hand-authored
 * entry's numbers (+1/6 levels, vs. melee only) match the CRB original, so
 * `mergedRagePowerCatalog` prefers the vendored entry WITHOUT a `category`
 * as the collision partner when more than one vendored entry shares a
 * normalized name — the Unchained variant stays in the catalog as its own
 * vendored-only (display-only) row rather than being silently dropped. This
 * is why the vendored catalog has 244 raw rows but only 243 UNIQUE
 * normalized names, and therefore why the hand-authored table's full-parity
 * count is 243, not 244: every unique published rage power has a
 * hand-authored row, and the one duplicate raw row (a reworded restatement
 * of a power already covered) surfaces correctly as its own display-only
 * catalog entry rather than being force-fit into a second "Guarded Stance"
 * hand entry (which the id-per-normalized-name matching below has no
 * mechanism to disambiguate, and which isn't needed — the Unchained
 * restatement has no numbers this table would add anything by duplicating).
 */

/**
 * Alias map for a hand-authored id whose vendored-catalog counterpart uses a
 * different name than ours (misspelling/wording drift) — matched instead of
 * this file's own `name`. Empty today: the full 243-entry audit found no
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
