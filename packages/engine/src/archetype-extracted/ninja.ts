/**
 * Ninja's slice of the pipeline (2026-08-09; see `index.ts` for the per-class
 * file convention this follows). Covers all 5 vendored ninja archetypes, 21
 * features, each read individually — small enough for the fully exhaustive
 * per-feature pass, no heuristic split.
 *
 * ── Ninja-specific mechanical facts this pass relies on ───────────────────
 *
 * 1. **Ki Pool (NIN)** (base 2nd-level feature) rides a real vendored
 *    `uses.maxFormula: "floor(@class.unlevel / 2) + @abilities.cha.mod"`,
 *    applied generically via the resource-pool pipeline. Any archetype
 *    feature changing the pool's SIZE would be `blocked` (double-count with
 *    that vendored formula) — none of the 21 features does. Ki SPENDS are
 *    `situational` (an activated resource cost, never a baseline number);
 *    8 of the 21 features are ki-spend actives.
 * 2. **Sneak Attack** follows rogue's landscape exactly (rogue.ts's key
 *    finding): the die count is display-only via `sneakAttackDice()`
 *    (`tables.ts`), and per-attack sneak-attack-shaped numbers are
 *    `situational` — Hunting Serpent's Certain Demise (applicability vs. a
 *    marked target) and Petal Ninja's Blossom Shower (forgoes sneak dice to
 *    fuel an AoE) both land there. No feature in this slice touches the
 *    hardcoded die-count progression, so rogue's one `blocked` trap never
 *    arises.
 * 3. **Base features these rows pair to** — No Trace, Uncanny Dodge,
 *    Improved Uncanny Dodge, Master Tricks, Light Steps — ALL carry empty
 *    vendored `changes[]` (confirmed against `class-features.json`), and
 *    none has a hand-authored numeric table in the engine. Nothing to
 *    double-count anywhere; this file's `blocked` bucket is empty.
 * 4. **Ninja tricks** are a deferred pick-list subsystem (the rogue-talent
 *    analog) — unusually, none of the 5 vendored archetypes modifies the
 *    trick list, so the bucket never comes up.
 * 5. **Mask of the Living God is a dual-identity archetype**: its Mask
 *    feature states that "Abilities granted by this class other than
 *    undercover faith function only while the mask of the Living God is
 *    wearing his mask," and Undercover Faith grants a vigilante-style
 *    mundane identity while unmasked. Per vigilante.ts's class note 4 (any
 *    bonus gated "while wearing the mask/armor/etc. required to assume" an
 *    identity is `situational` — no formula input tracks a worn-item/
 *    identity state; same call as witch.ts's mask-gated Heal/Intimidate
 *    entry), even a clean scaling bonus under this gate stays
 *    classification-only. This is what keeps Stern Gaze — the slice's one
 *    otherwise-extractable number — out of the `numeric` bucket.
 * 6. **The two "No Trace" rows** (Frozen Shadow, Gunpowder Bombardier) are
 *    byte-identical restatements of the base No Trace class feature, each
 *    paired to that very feature (`V3TQ2f5HeX4K6l4p`) — a vendoring
 *    artifact of listing a retained base feature under the archetype, the
 *    same shape as cleric.ts's Channel Energy restatements. Their content
 *    is conditional regardless (see the entries), so nothing is lost.
 *
 * ── Rubric (same as the fighter/magus pilots) ──────────────────────────────
 *  - "numeric": an unconditional bonus, or one gated on a condition this
 *    engine can check (`@armor.type`, `@class.unlevel`), expressible via a
 *    real `targets.ts` target. No ninja feature cleared this bar.
 *  - "situational": a REAL number scoped to a per-attack/per-round
 *    condition, a marked/chosen enemy, a resource spend (ki, forgone sneak
 *    dice), a task-scoped slice of a skill ("Survival checks to follow
 *    tracks," not general Survival), an effect subset narrower than a
 *    SAVE_CATEGORIES entry, or a worn-mask/identity state (class note 5).
 *  - "subsystem": grants a binary rules ability (uncanny dodge family), a
 *    proficiency, or an identity/narrative mechanic with no number.
 *  - "blocked": unused — no double-count or missing-target case exists in
 *    this slice (class notes 1 and 3).
 */

import type {
  ArchetypeFeatureClassificationEntry,
  ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const NINJA_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── ninja:frozen-shadow ──
  "ninja:frozen-shadow:hardy-killer:2": {
    archetypeId: "ninja:frozen-shadow",
    name: "Hardy Killer",
    level: 2,
    bucket: "situational",
    note: "1-ki daily endure elements buff (ki spends are situational, class note 1); the rest is a pair of jump-scoped Acrobatics drawbacks (loses running-start treatment; at 10th can't halve jump DCs) — task-scoped slices of one skill, not a whole-skill modifier, and they revoke benefits a base ninja only has via tricks anyway",
  },
  "ninja:frozen-shadow:no-trace:3": {
    archetypeId: "ninja:frozen-shadow",
    name: "No Trace",
    level: 3,
    bucket: "situational",
    note: "byte-identical restatement of the base No Trace class feature it is itself paired to (a vendoring artifact, class note 6; the base carries zero vendored changes). Content is conditional regardless: an opponent-facing Survival track-DC increase (not the character's own number) and scaling insight bonuses on Disguise/opposed Stealth gated on staying stationary and actionless for a full round — an uncheckable live-play condition the ambiguous sentence scopes over both bonuses",
  },
  "ninja:frozen-shadow:swift-tracker:8": {
    archetypeId: "ninja:frozen-shadow",
    name: "Swift Tracker",
    level: 8,
    bucket: "situational",
    note: "reduces the move-while-tracking Survival penalties (-5 to 0, -20 to -10) — task-scoped tracking modifiers; and raises track-victim:4's Will bonus to +4 against disbelieving illusions affecting a creature or creatures — a real subset of the `illusion` SAVE_CATEGORIES entry (excludes object/scene figments), so a saveCategories extraction would over-apply to every illusion save line",
  },
  "ninja:frozen-shadow:track-victim:4": {
    archetypeId: "ninja:frozen-shadow",
    name: "Track Victim",
    level: 4,
    bucket: "situational",
    note: "half ninja level on Survival checks to follow tracks and Perception checks to see through disguises — task-scoped slices of both skills (extracting to skill.sur/skill.per would over-apply to the whole skill); the +2 Will bonus is scoped to disbelieving illusions affecting a creature or creatures, narrower than the `illusion` save category (see swift-tracker:8)",
  },

  // ── ninja:gunpowder-bombardier ──
  "ninja:gunpowder-bombardier:delayed-explosive:8": {
    archetypeId: "ninja:gunpowder-bombardier",
    name: "Delayed Explosive",
    level: 8,
    bucket: "situational",
    note: "standard-action planting mode for the ki-spend gunpowder bomb (timer up to ninja level in rounds, one active at a time) — an activated, resource-gated delivery mechanic riding gunpowder-bomb:2, no baseline number",
  },
  "ninja:gunpowder-bombardier:explosive-impairment:4": {
    archetypeId: "ninja:gunpowder-bombardier",
    name: "Explosive Impairment",
    level: 4,
    bucket: "situational",
    note: "+1-ki rider that adds a condition (dazzled/deafened/entangled/shaken, later nauseated/stunned) to a thrown gunpowder bomb — resource spend on top of a resource spend (class note 1), target-facing effect, no sheet number",
  },
  "ninja:gunpowder-bombardier:gunpowder-bomb:2": {
    archetypeId: "ninja:gunpowder-bombardier",
    name: "Gunpowder Bomb",
    level: 2,
    bucket: "situational",
    note: "1-ki thrown AoE attack — per-attack damage dice (1d6 scaling to 9d6) and a Reflex DC, all resource-gated per-use numbers (ki spends and per-attack numbers are situational, class notes 1-2), same posture as alchemist bomb damage",
  },
  "ninja:gunpowder-bombardier:no-trace:3": {
    archetypeId: "ninja:gunpowder-bombardier",
    name: "No Trace",
    level: 3,
    bucket: "situational",
    note: "identical base-No-Trace restatement as frozen-shadow's copy (class note 6) — a cross-archetype duplicate, each classified under its own archetype (not the within-one-archetype duplicate trap); same stationary-conditional insight bonuses and opponent-facing track DC, nothing unconditional",
  },

  // ── ninja:hunting-serpent ──
  "ninja:hunting-serpent:certain-demise:10": {
    archetypeId: "ninja:hunting-serpent",
    name: "Certain Demise",
    level: 10,
    bucket: "situational",
    note: "makes sneak attack damage apply on the first attack each round against the death-marked target — per-attack applicability against one chosen/marked enemy (sneak attack numbers are per-attack, class note 2), no standing modifier",
  },
  "ninja:hunting-serpent:death-mark:4": {
    archetypeId: "ninja:hunting-serpent",
    name: "Death Mark",
    level: 4,
    bucket: "situational",
    note: "1/day (scaling) swift-action mark; the +1 to +4 competence bonus on attack/damage/Survival-tracking applies only against the currently marked opponent — a chosen-enemy scope with no engine input, resource-gated on top",
  },
  "ninja:hunting-serpent:relentless-pursuit:3": {
    archetypeId: "ninja:hunting-serpent",
    name: "Relentless Pursuit",
    level: 3,
    bucket: "situational",
    note: "+1 per 3 levels on Diplomacy checks to gather information and Survival checks to identify or follow tracks — task-scoped slices of both skills; extracting to skill.dip/skill.sur would over-apply to every use of those skills, the same honesty bar as traits.ts's scoped-skill entries",
  },

  // ── ninja:mask-of-the-living-god ──
  "ninja:mask-of-the-living-god:expurgate:2": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Expurgate",
    level: 2,
    bucket: "situational",
    note: "1-ki on-damage debuff (fumbletongue, later mute 1d4 rounds) with a Will-negates DC — resource-gated, target-facing effect (class note 1); also mask-gated like every ability of this archetype (class note 5)",
  },
  "ninja:mask-of-the-living-god:improved-uncanny-dodge:8": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Improved Uncanny Dodge",
    level: 8,
    bucket: "subsystem",
    note: "binary flank-denial ability restating the base Improved Uncanny Dodge it is paired to — a rules mechanic with no Change target, same bucket as every other class file's uncanny dodge entries",
  },
  "ninja:mask-of-the-living-god:mask:1": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Mask",
    level: 1,
    bucket: "subsystem",
    note: "narrative gating feature: every other ability of this archetype functions only while the mask is worn (move action to don/doff) — no number of its own, but the reason stern-gaze:3 stays situational (class note 5)",
  },
  "ninja:mask-of-the-living-god:stern-gaze:3": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Stern Gaze",
    level: 3,
    bucket: "situational",
    note: "real morale bonus of half ninja level on Intimidate and Sense Motive (skill.int/skill.sen are applied targets, and the paired base No Trace carries zero vendored changes) — but mask:1 gates every ability of this archetype on wearing the mask, an untracked worn-item/identity state; per vigilante.ts class note 4 and witch.ts's mask-gated precedent, extracting would over-apply in the unmasked mundane identity, so the slice's one near-numeric stays classification-only (class note 5)",
  },
  "ninja:mask-of-the-living-god:uncanny-dodge:4": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Uncanny Dodge",
    level: 4,
    bucket: "subsystem",
    note: "binary defensive ability (can't be caught flat-footed / keep Dex vs. invisible attackers), restating the base Uncanny Dodge it is paired to — no Change-shaped number",
  },
  "ninja:mask-of-the-living-god:undercover-faith:1": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Undercover Faith",
    level: 1,
    bucket: "subsystem",
    note: "grants a vigilante many-guises-style mundane identity while unmasked — an identity/disguise subsystem this engine defers (vigilante.ts class note 2 posture), no number",
  },
  "ninja:mask-of-the-living-god:weapon-and-armor-proficiency:1": {
    archetypeId: "ninja:mask-of-the-living-god",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base ninja proficiency list and adds bolas, saps, and whips — proficiency grant, no Change",
  },

  // ── ninja:petal-ninja ──
  "ninja:petal-ninja:blossom-shower:2": {
    archetypeId: "ninja:petal-ninja",
    name: "Blossom Shower",
    level: 2,
    bucket: "situational",
    note: "1-ki AoE that additionally forgoes 1-6 sneak attack dice to pick an effect tier (concealment through nauseated) for half-level rounds — a double resource spend (ki plus temporarily-unavailable sneak dice, class notes 1-2), activated with a duration, no baseline number",
  },
  "ninja:petal-ninja:burst-of-blossoms:4": {
    archetypeId: "ninja:petal-ninja",
    name: "Burst of Blossoms",
    level: 4,
    bucket: "situational",
    note: "1-ki gaseous-form transformation for 1 round (later 1+Cha rounds); the +4 circumstance Stealth bonus applies only while insubstantial during the effect — an activated buff state, resource-gated (class note 1)",
  },
  "ninja:petal-ninja:sundial:6": {
    archetypeId: "ninja:petal-ninja",
    name: "Sundial",
    level: 6,
    bucket: "situational",
    note: "move-action light-level control at 1 ki per step for 1 minute — resource-gated environment manipulation, no sheet number (replaces light steps, itself zero vendored changes)",
  },
};

/**
 * No ninja feature classified `numeric` — 0 of 21 cleared the bar (see this
 * file's doc comment: 8 ki-spend actives, task-scoped skill slices, marked-
 * enemy bonuses, binary uncanny-dodge grants, and one mask-gated morale bonus
 * held back by the vigilante identity-gate precedent). Kept as an empty,
 * correctly-typed table so `index.ts`'s per-class import + two-spread pattern
 * needs no special case for an all-situational/subsystem class — same shape
 * as `arcanist.ts` and `summonerUnchained.ts`.
 */
export const NINJA_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {};
