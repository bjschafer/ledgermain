/**
 * Psychic's slice of the pipeline (2026-08-09). All 29 vendored archetype
 * features across psychic's 8 archetypes are read in full and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked`, and the `numeric` ones
 * get a real `Change`-shaped extraction, the same methodology the magus pilot
 * (`magus.ts`) established. Per the per-class file convention (`index.ts`'s
 * doc comment), this file owns BOTH of psychic's pipeline artifacts —
 * `PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts` (the
 * aggregator, a later integration step not done here) needs a new import +
 * spread line.
 *
 * ── Psychic-specific mechanical facts this pass relies on ─────────────────
 *
 * 1. **Phrenic Pool** (base L1 feature) rides a real vendored
 *    `uses.maxFormula: "floor(@class.unlevel / 2) + @abilities.cha.mod"`,
 *    applied generically via `deriveResourcePools` (resources.ts). The
 *    vendored formula hardcodes Charisma, but RAW the pool's ability is
 *    discipline-determined — resources.ts already corrects this by aliasing
 *    `@abilities.cha` to Wisdom's values when the chosen discipline
 *    (`PSYCHIC_DISCIPLINES[doc.build.psychicDiscipline].phrenicPoolAbility`)
 *    is Wisdom-based. Any archetype feature that changes the pool's
 *    SIZE/basis is `blocked` (a Change would double-count or fight both the
 *    vendored formula and that aliasing correction); a feature that only
 *    adds a new way to SPEND pool points is `subsystem` — no baseline
 *    number, it's a spend-option.
 * 2. **Psychic disciplines** (`psychic-disciplines.ts`,
 *    `doc.build.psychicDiscipline`) and **phrenic amplifications**
 *    (`phrenic-amplifications.ts`, picked at 1st/3rd/7th/11th/15th/19th) are
 *    modeled PICK-LIST subsystems — any archetype feature that adds options
 *    to, restricts, or swaps out an amplification slot or discipline
 *    spell/power is `subsystem`.
 * 3. **Spellcasting alterations** (spells known, spell slots, spell-list
 *    additions, discipline-spell swaps) have no Change target — spells
 *    known/slots aren't Change-shaped — so they're `subsystem`, same as
 *    every other caster's slice.
 * 4. **Effect immunities** are the one place psychic archetypes yield an
 *    unconditional number: `immEffect.<slug>` is an applied target, but its
 *    vocabulary is CLOSED (defenses.ts `EFFECT_IMMUNITY_LABELS` — a slug
 *    outside the table is dropped rather than shown). "Mind-affecting" has a
 *    slug (`mindAffecting`); "confusion" and "insanity" do not, and using
 *    the broader `mindAffecting` for those would over-claim.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in `PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * `provenance`. The 29 features are small enough that every description was
 * read individually — see each entry's `note` for the specific reason it
 * didn't clear the `numeric` bar.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── psychic:amnesiac ──
  "psychic:amnesiac:repressed-memories:1": {
    archetypeId: "psychic:amnesiac",
    name: "Repressed Memories",
    level: 1,
    bucket: "subsystem",
    note: "purely narrative memory-loss framing (forgetfulness, reverts to standard psychic if memories restored) — no Change-shaped number",
  },
  "psychic:amnesiac:spell-recollection:1": {
    archetypeId: "psychic:amnesiac",
    name: "Spell Recollection",
    level: 1,
    bucket: "subsystem",
    note: "once-per-hour activated spell-remembering mechanic resolved on a random d% table, spending amnesia slots — a spellcasting subsystem with no baseline number (class note 3)",
  },
  "psychic:amnesiac:spells:1": {
    archetypeId: "psychic:amnesiac",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "replaces the spells-known schedule with a daily half-retained/half-amnesia-slot split — spells known/slots aren't Change targets (class note 3)",
  },

  // ── psychic:esoteric-starseeker ──
  "psychic:esoteric-starseeker:written-in-the-stars:1": {
    archetypeId: "psychic:esoteric-starseeker",
    name: "Written in the Stars",
    level: 1,
    bucket: "subsystem",
    note: "a real +1 slot per spell level, but restricted to spells matching her attuned constellation — restricted-slot machinery, not a generic slot; folding it into the flat slot count would overstate what she can prepare. The chosen-school casting-time drawback also has no matching engine hook",
  },

  // ── psychic:formless-adept ──
  "psychic:formless-adept:bonus-spells:1": {
    archetypeId: "psychic:formless-adept",
    name: "Bonus Spells",
    level: 1,
    bucket: "subsystem",
    note: "adds spells known usable only in a formless body, replacing discipline spells — spell-list change (class notes 2/3)",
  },
  "psychic:formless-adept:formless-body:1": {
    archetypeId: "psychic:formless-adept",
    name: "Formless Body",
    level: 1,
    bucket: "subsystem",
    note: "activated rounds/minutes-per-day form (blur/gaseous form/incorporeal spell effects) — resource-gated with no baseline modifier; blur's concealment miss chance isn't a Change target either",
  },
  "psychic:formless-adept:formless-master:20": {
    archetypeId: "psychic:formless-adept",
    name: "Formless Master",
    level: 20,
    bucket: "situational",
    note: "real Cha-to-AC deflection bonus, but only while in the activated, rounds-limited formless body — a stance the engine can't check; the action-economy upgrades are not numbers",
  },
  "psychic:formless-adept:formless-spell:1": {
    archetypeId: "psychic:formless-adept",
    name: "Formless Spell",
    level: 1,
    bucket: "subsystem",
    note: "grants a specific phrenic amplification (a pool-spend option) in place of the 1st-level amplification pick — amplification-list modification (class notes 1/2)",
  },
  "psychic:formless-adept:phrenic-charisma:1": {
    archetypeId: "psychic:formless-adept",
    name: "Phrenic Charisma",
    level: 1,
    bucket: "blocked",
    note: "forces the phrenic pool's ability basis to Charisma — pool sizing is the vendored uses.maxFormula (never a Change target), and resources.ts's discipline-based cha-to-wis aliasing would still apply Wisdom for a Wis-discipline formless adept, contradicting this feature; fixing that needs an archetype-aware carve-out in resources.ts, not a table entry (class note 1)",
  },
  "psychic:formless-adept:psychic-possession:15": {
    archetypeId: "psychic:formless-adept",
    name: "Psychic Possession",
    level: 15,
    bucket: "subsystem",
    note: "activated possession ability (as greater possession) usable only during incorporeal body, replacing the 15th-level phrenic amplification — no number (class note 2)",
  },

  // ── psychic:magaambyan-telepath ──
  "psychic:magaambyan-telepath:know-the-land:9": {
    archetypeId: "psychic:magaambyan-telepath",
    name: "Know the Land",
    level: 9,
    bucket: "subsystem",
    note: "commune with nature, wired via the spell-like-abilities route; the spell-slot-conversion option isn't modeled",
  },
  "psychic:magaambyan-telepath:nature-s-command:1": {
    archetypeId: "psychic:magaambyan-telepath",
    name: "Nature's Command",
    level: 1,
    bucket: "subsystem",
    note: "phrenic-pool spend-option (2 points to overcome plant immunity to mind-affecting effects) — pool spend-options are subsystem (class note 1)",
  },
  "psychic:magaambyan-telepath:primal-spells:1": {
    archetypeId: "psychic:magaambyan-telepath",
    name: "Primal Spells",
    level: 1,
    bucket: "subsystem",
    note: "adds one druid spell per spell level to the spell list and spells known — spell-list change (class note 3)",
  },
  "psychic:magaambyan-telepath:wild-mind:17": {
    archetypeId: "psychic:magaambyan-telepath",
    name: "Wild Mind",
    level: 17,
    bucket: "subsystem",
    note: "extends the telepathy class feature to animals and plants — a communication ability, no number",
  },

  // ── psychic:mutation-mind ──
  "psychic:mutation-mind:bodily-mutation:2": {
    archetypeId: "psychic:mutation-mind",
    name: "Bodily Mutation",
    level: 2,
    bucket: "subsystem",
    note: "adds a bodily-mutation option list to the phrenic amplification picks — amplification-list modification (class note 2); every listed mutation's number is additionally gated on the activated physical mutation anyway",
  },
  "psychic:mutation-mind:improved-bodily-mutation:11": {
    archetypeId: "psychic:mutation-mind",
    name: "Improved Bodily Mutation",
    level: 11,
    bucket: "subsystem",
    note: "adds improved bodily-mutation options to the same amplification pick-list — same posture as Bodily Mutation above (class note 2)",
  },
  "psychic:mutation-mind:phrenic-empowerment:7": {
    archetypeId: "psychic:mutation-mind",
    name: "Phrenic Empowerment",
    level: 7,
    bucket: "situational",
    note: "real +2 Strength bump, but triggered per amplified spell, lasting rounds equal to spell level, only while the activated physical mutation is up, with a stacking Will-save failure drawback — a per-cast buff state the engine can't check",
  },
  "psychic:mutation-mind:physical-mutation:1": {
    archetypeId: "psychic:mutation-mind",
    name: "Physical Mutation",
    level: 1,
    bucket: "situational",
    note: "real +4/+6 enhancement Strength and -2 Intelligence, but an activated, minutes-per-day form with a fatigue comedown — an activated stance, not an always-on number",
  },

  // ── psychic:psychic-duelist ──
  "psychic:psychic-duelist:expert-manifester:17": {
    archetypeId: "psychic:psychic-duelist",
    name: "Expert Manifester",
    level: 17,
    bucket: "subsystem",
    note: "cheapens the psychic-duel manifestation-point economy (+1 MP per manifestation) — the psychic-duel subsystem isn't modeled, no sheet number",
  },
  "psychic:psychic-duelist:manifestation-amplifications:7": {
    archetypeId: "psychic:psychic-duelist",
    name: "Manifestation Amplifications",
    level: 7,
    bucket: "subsystem",
    note: "adds a manifestation-amplification option list to the phrenic amplification picks — amplification-list modification (class note 2); each listed option is a pool-spend on the unmodeled psychic-duel subsystem",
  },
  "psychic:psychic-duelist:psychic-duel-acumen:4": {
    archetypeId: "psychic:psychic-duelist",
    name: "Psychic Duel Acumen",
    level: 4,
    bucket: "subsystem",
    note: "the added spell known is wired via the casting-economy tables; the +1 DC for that one spell (spellDC only has school-wide granularity, no per-spell target) and d8s instead of d4s for duel manifestation damage have no matching engine hook",
  },
  "psychic:psychic-duelist:thought-made-real:9": {
    archetypeId: "psychic:psychic-duelist",
    name: "Thought Made Real",
    level: 9,
    bucket: "subsystem",
    note: "delivers offensive manifestations outside a psychic duel as a full-round casting — psychic-duel subsystem mechanic, no number",
  },

  // ── psychic:psychic-marauder ──
  "psychic:psychic-marauder:aura-of-insanity:3": {
    archetypeId: "psychic:psychic-marauder",
    name: "Aura of Insanity",
    level: 3,
    bucket: "subsystem",
    note: "activated, phrenic-pool-spent confusion aura targeting enemies — resource-gated and enemy-facing (never the character's own number), with later pool-spend riders (class note 1)",
  },
  "psychic:psychic-marauder:cracked-perspectives:9": {
    archetypeId: "psychic:psychic-marauder",
    name: "Cracked Perspectives",
    level: 9,
    bucket: "blocked",
    note: "unconditional immunity to confusion and insanity effects, but neither 'confusion' nor 'insanity' is a slug in the closed immEffect vocabulary (defenses.ts EFFECT_IMMUNITY_LABELS) — an immEffect change with an unknown slug is dropped before rendering, and the broader mindAffecting slug would over-claim (class note 4)",
  },
  "psychic:psychic-marauder:skewed-mentality:2": {
    archetypeId: "psychic:psychic-marauder",
    name: "Skewed Mentality",
    level: 2,
    bucket: "blocked",
    note: "substitutes Charisma for Wisdom on Will saves — a substitution, not a bonus, so a Change (which only ever adds) can't express it; the engine's ability-substitution registry (ability-substitution.ts) has a save.ref slot but no save.will slot, and unlike that registry's benefit-only entries this one can also LOWER the save when Cha < Wis, so a max() reading isn't safe either — needs a new substitution slot (engine work), same posture as witch's Ancient Tradition",
  },
  "psychic:psychic-marauder:unreal-understanding:20": {
    archetypeId: "psychic:psychic-marauder",
    name: "Unreal Understanding",
    level: 20,
    bucket: "numeric",
    note: "unconditional immunity to all mind-affecting effects at 20th — maps exactly onto the closed immEffect vocabulary's mindAffecting slug (class note 4); replaces remade self, which carries zero vendored changes, so nothing to double-count",
  },

  // ── psychic:terror-weaver ──
  "psychic:terror-weaver:aura-of-intimidation:9": {
    archetypeId: "psychic:terror-weaver",
    name: "Aura of Intimidation",
    level: 9,
    bucket: "subsystem",
    note: "aura of doom, wired via the spell-like-abilities route; the slot-conversion option and the 11th/19th-level condition worsening (frightened, then panicked) aren't modeled",
  },
  "psychic:terror-weaver:manipulation:2": {
    archetypeId: "psychic:terror-weaver",
    name: "Manipulation",
    level: 2,
    bucket: "subsystem",
    note: "charm person, wired via the spell-like-abilities route; the slot-conversion option and a spells-known swap aren't modeled (class note 3)",
  },
  "psychic:terror-weaver:persistent-nightmare:15": {
    archetypeId: "psychic:terror-weaver",
    name: "Persistent Nightmare",
    level: 15,
    bucket: "subsystem",
    note: "phrenic-pool spend-option (2 points to rider a nightmare spell onto a successful mind-affecting spell) — resource-gated and enemy-facing (the -2 Will penalty is the target's, not the character's) (class note 1)",
  },
};

/**
 * ── PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for psychic archetype class features
 * (the prose→Change extraction pipeline, psychic slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry source
 * was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 1 of psychic's 29 features
 * cleared the `numeric` bar (see `PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — psychic's archetype kit is almost
 * entirely spellcasting alterations, phrenic-pool spend-options,
 * amplification pick-list changes, and activated forms, all deferred
 * subsystems in this engine today (see this file's header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or the bonus is gated on a real-but-partial condition this
 *    engine CAN check while a second, textually-present condition can't be
 *    checked and is dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Psychic Marauder's "Unreal Understanding" (replacing remade self at
  // 20th; the vendored pairing confirms the swap and Remade Self carries
  // zero vendored changes) grants blanket, unconditional immunity to
  // mind-affecting effects — `immEffect.mindAffecting` is this engine's own
  // closed-vocabulary immunity target (defenses.ts), flat "1" flag, same
  // shape as Mesmerist Dreamstalker's Sleepless and the cavalier immunity
  // extractions.
  "psychic:psychic-marauder:unreal-understanding:20": {
    changes: [c("1", "immEffect.mindAffecting")],
    detail: () => "immune to mind-affecting effects",
    confidence: "high",
    provenance:
      "At 20th level, a psychic marauder's mindset becomes completely aberrant, to the point " +
      "that no outside force can penetrate her psyche. Because of this, the psychic marauder " +
      "becomes immune to all mind-affecting effects.",
  },
};
