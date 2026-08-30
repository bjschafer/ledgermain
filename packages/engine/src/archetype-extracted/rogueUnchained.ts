/**
 * Rogue (Unchained)'s slice of the pipeline (see `index.ts` for the per-class
 * file convention this follows). Covers all 76 vendored `rogueUnchained:*`
 * archetypes, 251 features, read individually.
 *
 * ── Class-specific mechanical facts this pass relies on ───────────────────
 *
 * 1. **Rogue talents** are a modeled pick-list subsystem
 *    (`packages/engine/src/rogue-talents.ts`, shared with the chained Rogue).
 *    Any feature that adds/swaps/restricts talents, or substitutes a
 *    different pick-list (investigator talents, vigilante social talents,
 *    alchemist discoveries, hexes) in their place, is `subsystem`.
 * 2. **Sneak attack's own die-count progression** is hardcoded and
 *    unconditional (`sneakAttackDice` in `tables.ts`, called directly from
 *    the character's raw class level with no `applied`/`replacedBy`
 *    awareness) — out of this file's scope to touch. Three archetype feature
 *    rows in the vendored data (Carnivalist, Eldritch Scoundrel, Snare
 *    Setter) are byte-identical reprints of the UNMODIFIED base "Sneak
 *    Attack (UC)" description under an archetype row, with no stated change
 *    or "this ability replaces/alters..." language — a vendored-data
 *    artifact (mirrors the chained Rogue file's identical finding), left
 *    `blocked` rather than risk touching the hardcoded formula. Features that
 *    upsize/downsize sneak attack's die TYPE (d8 vs d6) under a condition
 *    (Gun Smuggler's Selective Targeting, Knife Master's Sneak Stab,
 *    Skulking Slayer's Bold Strike, Waylayer's Ambuscading Sneak Attack) are
 *    `subsystem` instead — no engine target for sneak attack die size at all,
 *    so there's no double-count risk, just nothing to extract.
 * 3. **Trapfinding is NOT a zero-value base feature here**, unlike every
 *    other rogueUnchained base feature. `class-features.json`'s Trapfinding
 *    entry (id `pEODJDoTk7uhCZY7`, shared with the chained Rogue) carries a
 *    real vendored `changes`: `max(1, floor(@class.unlevel / 2))` to
 *    `skill.dev`. Every archetype feature below that "replaces trapfinding"
 *    fully suppresses that Change via the vendored swap pairing, so a new
 *    number introduced by the replacement is safe to extract (nothing
 *    coexists to double-count against) — same posture as extracting into an
 *    empty slot. Finesse Training (UC) similarly carries a real
 *    `bonusFeats: 1` (its free Weapon Finesse grant) and Rogue's Edge (UC)
 *    carries `bonusFeats: floor(@class.unlevel / 5)`; no feature in this
 *    file's 251 replaces or modifies either one, so neither ever comes up as
 *    a double-count risk in practice. Danger Sense, Debilitating Injury,
 *    Sneak Attack (UC), Evasion, Rogue Talents, Uncanny Dodge, Improved
 *    Uncanny Dodge, Advanced Talents (ROG), and Master Strike (UC) all carry
 *    `changes: []` upstream — confirmed individually, same zero-baseline
 *    posture as the chained Rogue file found for its own base features.
 * 4. **A save bonus scoped to a named category of effects** (fear, poison,
 *    disease, curses, mind-affecting, ...) is expressible via
 *    `Change.saveCategories` against `allSavingThrows` (see
 *    `class-feature-effects.ts` and `save-categories.ts`'s
 *    `SAVE_CATEGORIES` vocabulary) — used below wherever the prose names a
 *    category that vocabulary actually carries. A descriptor list partly
 *    outside that vocabulary promotes the fitting part only: Planar Sneak's
 *    Planar Sense names eight descriptors, four elemental (no matching
 *    category) and four alignment (evil/good/lawful/chaotic, now in
 *    vocabulary), so only the alignment half is wired below. A
 *    creature-type-scoped save like Sylvan Trickster's Resist Nature's Lure
 *    stays `situational` — no matching axis, same posture
 *    `class-feature-effects.ts`'s own doc comment documents for its declined
 *    candidates.
 * 5. **Darkvision/blindsight grants** are expressible as a `sense*` target
 *    (`senses.ts`'s `SENSE_TARGET_IDS`, in `targets.ts`'s applied set) —
 *    resolution is highest-wins across sources. Two features here (Shadow
 *    Scion's Shadow Dweller, Shadow Walker's Expanded Sight) grant a flat 30
 *    ft. darkvision that scales by a DIFFERENT increment than their own
 *    "if you already have darkvision, +10 ft." initial rider — per
 *    `senses.ts`'s own doc comment, a grant/rider mismatch can't be expressed
 *    with `operator: "add"` (that only works when the grant and the rider are
 *    the same X), so both are extracted as a flat scaling highest-wins grant
 *    with the initial rider dropped and noted (medium confidence), matching
 *    that module's documented precedent for Bat/Shadow's Sight-shaped cases.
 *
 * ── Rubric (same as the chained Rogue file / fighter pilot) ────────────────
 *  - "numeric": an unconditional bonus (or one gated on a condition this
 *    engine can check, `@armor.type`), expressible via a real
 *    `packages/engine/src/targets.ts` target. Mixed features: the
 *    unconditional/checkable clause is extracted and the dropped clause is
 *    named in the note (established precedent).
 *  - "situational": a REAL number scoped to a specific check purpose, enemy
 *    state, maneuver, terrain/lighting condition with no roll data, or a
 *    save-category outside `SAVE_CATEGORIES`' vocabulary.
 *  - "subsystem": an unrelated ability, resource, proficiency, choice-list
 *    (including talent-list substitutions), a debuff/effect applied to a
 *    TARGET rather than the rogue's own sheet, an action/roll-substitution
 *    mechanic, an absolute state grant with no modifier shape (auto-20 on a
 *    roll, "never flat-footed"), or a sense/speed grant with no formula input
 *    to express its stated value (Tidal Trickster's swim-speed-equal-to-
 *    land-speed clause, dropped from an otherwise-numeric entry).
 *  - "blocked": the text promises an unconditional number but no applied
 *    target exists, or the vendored prose is internally inconsistent /
 *    plainly misattributed (the three Sneak Attack reprints).
 *
 * Confidence: "high" = a literal, unconditional clause with no interpretive
 * reading, even if a separate NON-numeric rider is dropped alongside it.
 * "medium" = the extraction dropped a second, differently-scoped NUMERIC
 * clause, resolved a genuinely irregular level cadence, applied a
 * partial-condition read (one of two stated conditions isn't checkable), or
 * relied on a freeform per-instance skill slug with no established
 * convention (Profession (gambler), unlike Craft (alchemy)'s well-established
 * `crf.alchemy`). "low" unused, same as the established files in this
 * directory.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

const BLOCKED_SNEAK_ATTACK_REPRINT =
  "byte-identical reprint of the UNMODIFIED base Sneak Attack (UC) description under an " +
  "archetype 'feature' row — no stated change, no 'this ability replaces/alters...' language at " +
  "all. Suspected vendored-data artifact (a duplicate/mistagged CSV row), not a real archetype " +
  "modification. Left unmodeled rather than risk anything touching the hardcoded, atomic " +
  "sneakAttackDice() progression (tables.ts, out of this file's scope).";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── Acrobat ────────────────────────────────────────────────────────────
  "rogueUnchained:acrobat:expert-acrobat:1": {
    archetypeId: "rogueUnchained:acrobat",
    name: "Expert Acrobat",
    level: 1,
    bucket: "numeric",
    note:
      "+2 competence bonus on Acrobatics/Fly while unarmored (@armor.type==0 is checkable) — " +
      "extracted. The 'no ACP on listed skills while in light armor' half has no ACP-suppression " +
      "target and is dropped. Replaces trapfinding (contributes 0 to this build either way, since " +
      "the swap suppresses it).",
  },
  "rogueUnchained:acrobat:second-chance:3": {
    archetypeId: "rogueUnchained:acrobat",
    name: "Second Chance",
    level: 3,
    bucket: "subsystem",
    note: "reroll-a-just-made-check-at-a-penalty ability, limited uses/day — no flat number",
  },

  // ── Bandit ─────────────────────────────────────────────────────────────
  "rogueUnchained:bandit:ambush:4": {
    archetypeId: "rogueUnchained:bandit",
    name: "Ambush",
    level: 4,
    bucket: "subsystem",
    note: "extra actions in the surprise round — no Change-shaped number",
  },
  "rogueUnchained:bandit:fearsome-strike:8": {
    archetypeId: "rogueUnchained:bandit",
    name: "Fearsome Strike",
    level: 8,
    bucket: "situational",
    note: "conditional frighten rider on a confirmed sneak-attack crit — action-scoped, not an always-on number",
  },

  // ── Bekyar Kidnapper ───────────────────────────────────────────────────
  "rogueUnchained:bekyar-kidnapper:abductor:3": {
    archetypeId: "rogueUnchained:bekyar-kidnapper",
    name: "Abductor",
    level: 3,
    bucket: "numeric",
    note: 'scaling CMB bonus to grapple plus a CMD bonus resisting a grapple/an escape from her own grapple, unconditional from 3rd — now expressible via Change.maneuverCategories (maneuver-categories.ts), wired in ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED. The defensive half is written cmd (the vocabulary\'s own resisting/defending side) even though the source text says "combat maneuver bonus" for it too.',
  },
  "rogueUnchained:bekyar-kidnapper:clean-capture:1": {
    archetypeId: "rogueUnchained:bekyar-kidnapper",
    name: "Clean Capture",
    level: 1,
    bucket: "situational",
    note: "real penalty-reduction number scoped to a single combat maneuver (tie up a restrained target)",
  },

  // ── Bellflower Irrigator ───────────────────────────────────────────────
  "rogueUnchained:bellflower-irrigator:bellflower-crop:1": {
    archetypeId: "rogueUnchained:bellflower-irrigator",
    name: "Bellflower Crop",
    level: 1,
    bucket: "subsystem",
    note: "designates an ally group for other Bellflower abilities to reference — no number of its own",
  },
  "rogueUnchained:bellflower-irrigator:grafting:4": {
    archetypeId: "rogueUnchained:bellflower-irrigator",
    name: "Grafting",
    level: 4,
    bucket: "situational",
    note: "grants flanking status under a specific ally-positioning condition — not an always-on bonus",
  },
  "rogueUnchained:bellflower-irrigator:irrigation:8": {
    archetypeId: "rogueUnchained:bellflower-irrigator",
    name: "Irrigation",
    level: 8,
    bucket: "subsystem",
    note: "conditional death/paralysis rider on a 3-round-studied sneak attack — no Change-shaped number",
  },
  "rogueUnchained:bellflower-irrigator:poison-use:1": {
    archetypeId: "rogueUnchained:bellflower-irrigator",
    name: "Poison Use",
    level: 1,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled — nothing to remove",
  },

  // ── Burglar ────────────────────────────────────────────────────────────
  "rogueUnchained:burglar:careful-disarm:4": {
    archetypeId: "rogueUnchained:burglar",
    name: "Careful Disarm",
    level: 4,
    bucket: "subsystem",
    note: "trap-triggering-avoidance mechanic referencing the unmodeled Trap Sense/Danger Sense bonus — no Change-shaped number",
  },
  "rogueUnchained:burglar:distraction:8": {
    archetypeId: "rogueUnchained:burglar",
    name: "Distraction",
    level: 8,
    bucket: "subsystem",
    note: "opposed Bluff-vs-Sense-Motive check to cover a failed Stealth attempt — no flat bonus granted",
  },

  // ── Carnivalist ────────────────────────────────────────────────────────
  "rogueUnchained:carnivalist:animal-trainer:3": {
    archetypeId: "rogueUnchained:carnivalist",
    name: "Animal Trainer",
    level: 3,
    bucket: "situational",
    note: "+1/2-level Handle Animal bonus scoped to Tiny/Small animals only — not general Handle Animal",
  },
  "rogueUnchained:carnivalist:familiar:1": {
    archetypeId: "rogueUnchained:carnivalist",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar — familiar stat derivation is out of this table's scope",
  },
  "rogueUnchained:carnivalist:pet-performance:1": {
    archetypeId: "rogueUnchained:carnivalist",
    name: "Pet Performance",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance-style pet abilities — activated/resource-gated, no baseline number",
  },
  "rogueUnchained:carnivalist:sneak-attack:2": {
    archetypeId: "rogueUnchained:carnivalist",
    name: "Sneak Attack",
    level: 2,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },

  // ── Cat Burglar ────────────────────────────────────────────────────────
  "rogueUnchained:cat-burglar:phantom-presence:4": {
    archetypeId: "rogueUnchained:cat-burglar",
    name: "Phantom Presence",
    level: 4,
    bucket: "subsystem",
    note: "take-10-on-Stealth + leaves-no-trail utility ability — no flat number",
  },
  "rogueUnchained:cat-burglar:trap-saboteur:8": {
    archetypeId: "rogueUnchained:cat-burglar",
    name: "Trap Saboteur",
    level: 8,
    bucket: "subsystem",
    note: "trap-bypass timing/suppression ability — no Change-shaped number",
  },

  // ── Chameleon ──────────────────────────────────────────────────────────
  "rogueUnchained:chameleon:effortless-sneak:3": {
    archetypeId: "rogueUnchained:chameleon",
    name: "Effortless Sneak",
    level: 3,
    bucket: "subsystem",
    note: "take-10-on-Stealth in a chosen favored terrain — no flat number",
  },
  "rogueUnchained:chameleon:misdirection:1": {
    archetypeId: "rogueUnchained:chameleon",
    name: "Misdirection",
    level: 1,
    bucket: "subsystem",
    note: "a Bluff-ranks-sized resource pool spent on Stealth checks — an activated resource, not itself a flat Change",
  },

  // ── Charlatan ──────────────────────────────────────────────────────────
  "rogueUnchained:charlatan:grand-hoax:3": {
    archetypeId: "rogueUnchained:charlatan",
    name: "Grand Hoax",
    level: 3,
    bucket: "subsystem",
    note: "grants an advanced rogue talent early — talent-list change, out of scope",
  },
  "rogueUnchained:charlatan:natural-born-liar:1": {
    archetypeId: "rogueUnchained:charlatan",
    name: "Natural Born Liar",
    level: 1,
    bucket: "subsystem",
    note: "conditional penalty imposed on a TARGET's future Bluff checks against this character — not a bonus to the character's own sheet",
  },

  // ── Consigliere ────────────────────────────────────────────────────────
  "rogueUnchained:consigliere:bonus-feats:4": {
    archetypeId: "rogueUnchained:consigliere",
    name: "Bonus Feats",
    level: 4,
    bucket: "subsystem",
    note: "lets teamwork feats be taken in place of rogue talents — talent-list substitution, out of scope",
  },
  "rogueUnchained:consigliere:combat-advisor:4": {
    archetypeId: "rogueUnchained:consigliere",
    name: "Combat Advisor",
    level: 4,
    bucket: "situational",
    note: "conditional insight bonus granted to an ALLY's next attack after this character misses — no target for a bonus applied to another creature, and action-scoped besides",
  },
  "rogueUnchained:consigliere:convincing-attitude:1": {
    archetypeId: "rogueUnchained:consigliere",
    name: "Convincing Attitude",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus feat + a rogue talent + a Diplomacy-failure-mitigation rule — no flat number",
  },
  "rogueUnchained:consigliere:field-boss:10": {
    archetypeId: "rogueUnchained:consigliere",
    name: "Field Boss",
    level: 10,
    bucket: "subsystem",
    note: "grants a teamwork feat to nearby allies — no self-facing number",
  },

  // ── Construct Saboteur ─────────────────────────────────────────────────
  "rogueUnchained:construct-saboteur:arcane-sabotage:2": {
    archetypeId: "rogueUnchained:construct-saboteur",
    name: "Arcane Sabotage",
    level: 2,
    bucket: "subsystem",
    note: "menu of conditional, sneak-attack-dice-forgone debuffs against constructs — no self-facing flat number",
  },
  "rogueUnchained:construct-saboteur:arcane-strike:1": {
    archetypeId: "rogueUnchained:construct-saboteur",
    name: "Arcane Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants Arcane Strike as a bonus feat — no independent number",
  },
  "rogueUnchained:construct-saboteur:dismantling-strikes:3": {
    archetypeId: "rogueUnchained:construct-saboteur",
    name: "Dismantling Strikes",
    level: 3,
    bucket: "situational",
    note: "DR/hardness-bypass amount scoped to attacking constructs specifically — no target for a scoped bypass number",
  },

  // ── Counterfeit Mage ───────────────────────────────────────────────────
  "rogueUnchained:counterfeit-mage:magical-expertise:1": {
    archetypeId: "rogueUnchained:counterfeit-mage",
    name: "Magical Expertise",
    level: 1,
    bucket: "situational",
    note: "+1/2-level bonus scoped to three narrow use-cases (locate/disarm magical traps, activate scrolls/wands via UMD) — narrower than an unconditional whole-skill bonus",
  },
  "rogueUnchained:counterfeit-mage:signature-wand:4": {
    archetypeId: "rogueUnchained:counterfeit-mage",
    name: "Signature Wand",
    level: 4,
    bucket: "subsystem",
    note: "designates one wand for no-UMD-check activation — no flat number",
  },
  "rogueUnchained:counterfeit-mage:wand-adept:6": {
    archetypeId: "rogueUnchained:counterfeit-mage",
    name: "Wand Adept",
    level: 6,
    bucket: "subsystem",
    note: "substitutes Dex for Cha on wand UMD checks — an ability-swap, not a bonus",
  },

  // ── Cutpurse ───────────────────────────────────────────────────────────
  "rogueUnchained:cutpurse:measure-the-mark:1": {
    archetypeId: "rogueUnchained:cutpurse",
    name: "Measure the Mark",
    level: 1,
    bucket: "subsystem",
    note: "lets the rogue see a target's Perception result before deciding whether to attempt Sleight of Hand — no flat bonus",
  },
  "rogueUnchained:cutpurse:stab-and-grab:3": {
    archetypeId: "rogueUnchained:cutpurse",
    name: "Stab and Grab",
    level: 3,
    bucket: "situational",
    note: "conditional (sneak-attack-damage-dealt-gated) Sleight of Hand steal rider — action-scoped",
  },

  // ── Dark Lurker ────────────────────────────────────────────────────────
  "rogueUnchained:dark-lurker:blades-from-the-shadows:2": {
    archetypeId: "rogueUnchained:dark-lurker",
    name: "Blades from the Shadows",
    level: 2,
    bucket: "subsystem",
    note: "grants a bonus talent/AoO-vs-cover ability + (at 6th) precision damage vs. total concealment — talent grant + conditional rider, no flat number",
  },
  "rogueUnchained:dark-lurker:blind-fight:2": {
    archetypeId: "rogueUnchained:dark-lurker",
    name: "Blind-Fight",
    level: 2,
    bucket: "subsystem",
    note: "grants Blind-Fight as a bonus feat",
  },
  "rogueUnchained:dark-lurker:improved-blind-fight:8": {
    archetypeId: "rogueUnchained:dark-lurker",
    name: "Improved Blind-Fight",
    level: 8,
    bucket: "subsystem",
    note: "grants Improved Blind-Fight as a bonus feat",
  },
  "rogueUnchained:dark-lurker:greater-blind-fight:14": {
    archetypeId: "rogueUnchained:dark-lurker",
    name: "Greater Blind-Fight",
    level: 14,
    bucket: "subsystem",
    note: "grants Greater Blind-Fight as a bonus feat",
  },
  "rogueUnchained:dark-lurker:instinctual-sense:20": {
    archetypeId: "rogueUnchained:dark-lurker",
    name: "Instinctual Sense",
    level: 20,
    bucket: "numeric",
    note: "grants blindsight 30 ft. unconditionally, replacing the 20th-level rogue talent — a clean sense grant (sensebs is an applied target)",
  },

  // ── Deadly Courtesan ───────────────────────────────────────────────────
  "rogueUnchained:deadly-courtesan:bardic-performance:2": {
    archetypeId: "rogueUnchained:deadly-courtesan",
    name: "Bardic Performance",
    level: 2,
    bucket: "subsystem",
    note: "grants the bardic-performance resource + fascinate — activated/resource-gated, no baseline number",
  },
  "rogueUnchained:deadly-courtesan:inspire-competence:3": {
    archetypeId: "rogueUnchained:deadly-courtesan",
    name: "Inspire Competence",
    level: 3,
    bucket: "subsystem",
    note: "activated bardic-performance-style ally buff — no generic activated-performance-buff mechanism modeled",
  },
  "rogueUnchained:deadly-courtesan:performance-strike:8": {
    archetypeId: "rogueUnchained:deadly-courtesan",
    name: "Performance Strike",
    level: 8,
    bucket: "subsystem",
    note: "spends bardic-performance rounds for a scaling morale attack bonus — resource-gated activated ability",
  },

  // ── Desert Raider ──────────────────────────────────────────────────────
  "rogueUnchained:desert-raider:desert-tracker:1": {
    archetypeId: "rogueUnchained:desert-raider",
    name: "Desert Tracker",
    level: 1,
    bucket: "situational",
    note: "Survival bonus scoped to tracking in desert terrain specifically; the dazzled-immunity half is a flag, not a Change",
  },
  "rogueUnchained:desert-raider:light-step:3": {
    archetypeId: "rogueUnchained:desert-raider",
    name: "Light Step",
    level: 3,
    bucket: "situational",
    note: "the Survival-DC-to-track-HER increase isn't a bonus to her own checks at all; the Perception bonus is scoped to avoiding surprise specifically",
  },
  "rogueUnchained:desert-raider:sun-at-your-back:2": {
    archetypeId: "rogueUnchained:desert-raider",
    name: "Sun at Your Back",
    level: 2,
    bucket: "subsystem",
    note: "grants a Stealth-without-cover option (at a self-imposed -5) — a rules permission, not a bonus number",
  },

  // ── Discretion Specialist ──────────────────────────────────────────────
  "rogueUnchained:discretion-specialist:evidence-disposal:4": {
    archetypeId: "rogueUnchained:discretion-specialist",
    name: "Evidence Disposal",
    level: 4,
    bucket: "subsystem",
    note: "dress corpse, wired via the spell-like-abilities route (the 12th-level disintegrate-corpse upgrade isn't modeled)",
  },
  "rogueUnchained:discretion-specialist:fast-talker:1": {
    archetypeId: "rogueUnchained:discretion-specialist",
    name: "Fast Talker",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) bonus across all of Bluff/Diplomacy/Intimidate — extracted",
  },
  "rogueUnchained:discretion-specialist:no-loose-ends:4": {
    archetypeId: "rogueUnchained:discretion-specialist",
    name: "No Loose Ends",
    level: 4,
    bucket: "subsystem",
    note: "imposes a withdraw-denial / concentration-check burden on a sneak-attacked TARGET — not a bonus to the character",
  },
  "rogueUnchained:discretion-specialist:obfuscation:3": {
    archetypeId: "rogueUnchained:discretion-specialist",
    name: "Obfuscation",
    level: 3,
    bucket: "subsystem",
    note: "targeted memory-alteration ability with its own save DC — no bonus to the character's own sheet",
  },

  // ── Dreamthief ─────────────────────────────────────────────────────────
  "rogueUnchained:dreamthief:dream-infiltrator:8": {
    archetypeId: "rogueUnchained:dreamthief",
    name: "Dream Infiltrator",
    level: 8,
    bucket: "subsystem",
    note: "dream scan, wired via the spell-like-abilities route (the 12th-level option to cast dream travel instead isn't modeled)",
  },
  "rogueUnchained:dreamthief:dreamshard-focus:1": {
    archetypeId: "rogueUnchained:dreamthief",
    name: "Dreamshard Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants spiritualist-emotional-focus abilities + bonus skill ranks in two chosen skills — choice-bearing rank grant, not a Change-shaped bonus",
  },
  "rogueUnchained:dreamthief:lucid-dreamer:3": {
    archetypeId: "rogueUnchained:dreamthief",
    name: "Lucid Dreamer",
    level: 3,
    bucket: "subsystem",
    note: "grants Lucid Dreamer as a bonus feat",
  },
  "rogueUnchained:dreamthief:soothe-dreaming:4": {
    archetypeId: "rogueUnchained:dreamthief",
    name: "Soothe Dreaming",
    level: 4,
    bucket: "subsystem",
    note: "mesmerist touch-treatment-equivalent ability — resource-gated",
  },

  // ── Driver ─────────────────────────────────────────────────────────────
  "rogueUnchained:driver:driver-s-fortitude:3": {
    archetypeId: "rogueUnchained:driver",
    name: "Driver's Fortitude",
    level: 3,
    bucket: "subsystem",
    note: "a fixed-DC Fortitude check to remain conscious below 0 hp — a special stabilization rule, not a bonus",
  },
  "rogueUnchained:driver:hard-drive:1": {
    archetypeId: "rogueUnchained:driver",
    name: "Hard Drive",
    level: 1,
    bucket: "subsystem",
    note: "vehicle-driving-check DC/speed rule — no PC-facing Change target",
  },

  // ── Earthshadow ────────────────────────────────────────────────────────
  "rogueUnchained:earthshadow:earthcraft:2": {
    archetypeId: "rogueUnchained:earthshadow",
    name: "Earthcraft",
    level: 2,
    bucket: "subsystem",
    note: "a daily earthcraft-point pool spent at varying per-spell costs across several named spells — a shared point-pool budget, not a per-spell counter",
  },
  "rogueUnchained:earthshadow:earthlink:1": {
    archetypeId: "rogueUnchained:earthshadow",
    name: "Earthlink",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Acrobatics/Perception bonus gated on contact with natural earth/unworked stone — a terrain-contact condition the engine can't check",
  },

  // ── Eldritch Raider ────────────────────────────────────────────────────
  "rogueUnchained:eldritch-raider:detect-magic:2": {
    archetypeId: "rogueUnchained:eldritch-raider",
    name: "Detect Magic",
    level: 2,
    bucket: "subsystem",
    note: "detect magic (at will), wired via the spell-like-abilities route",
  },
  "rogueUnchained:eldritch-raider:eldritch-intuition:3": {
    archetypeId: "rogueUnchained:eldritch-raider",
    name: "Eldritch Intuition",
    level: 3,
    bucket: "situational",
    note: "+1/3-level UMD bonus scoped to activating arcane spell-completion/trigger items specifically — narrower than the whole Use Magic Device skill",
  },

  // ── Eldritch Scoundrel ─────────────────────────────────────────────────
  "rogueUnchained:eldritch-scoundrel:alarm-sense:3": {
    archetypeId: "rogueUnchained:eldritch-scoundrel",
    name: "Alarm Sense",
    level: 3,
    bucket: "subsystem",
    note: "a trap-spotter-talent variant limited to magic traps within 10 ft. — a detection ability, no flat number",
  },
  "rogueUnchained:eldritch-scoundrel:sneak-attack:3": {
    archetypeId: "rogueUnchained:eldritch-scoundrel",
    name: "Sneak Attack",
    level: 3,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },
  "rogueUnchained:eldritch-scoundrel:spells:1": {
    archetypeId: "rogueUnchained:eldritch-scoundrel",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "grants a whole prepared-arcane spellcasting subsystem (magus-style spell slots) — out of scope for a table entry",
  },
  "rogueUnchained:eldritch-scoundrel:uncanny-training:4": {
    archetypeId: "rogueUnchained:eldritch-scoundrel",
    name: "Uncanny Training",
    level: 4,
    bucket: "subsystem",
    note: "changes WHEN uncanny dodge/improved uncanny dodge are taken (talent-list substitution), not their numeric effect (both carry changes: [] upstream anyway)",
  },
  "rogueUnchained:eldritch-scoundrel:weapon-and-armor-proficiency:1": {
    archetypeId: "rogueUnchained:eldritch-scoundrel",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },

  // ── Escapologist ───────────────────────────────────────────────────────
  "rogueUnchained:escapologist:elusive:1": {
    archetypeId: "rogueUnchained:escapologist",
    name: "Elusive",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2-level (min 1) bonus across ALL Disable Device and Escape Artist checks — extracted; replaces trapfinding (its skill.dev change is suppressed by the swap, so no double-count)",
  },
  "rogueUnchained:escapologist:impossible-escape:8": {
    archetypeId: "rogueUnchained:escapologist",
    name: "Impossible Escape",
    level: 8,
    bucket: "subsystem",
    note: "substitutes a penalized Escape Artist check for a failed save/AC — an action-substitution mechanic, not a flat bonus",
  },
  "rogueUnchained:escapologist:unfettered-mind:3": {
    archetypeId: "rogueUnchained:escapologist",
    name: "Unfettered Mind",
    level: 3,
    bucket: "subsystem",
    note: "removes a mind-affecting effect via an Escape Artist check — a save-equivalent action, not a bonus",
  },

  // ── False Medium ───────────────────────────────────────────────────────
  "rogueUnchained:false-medium:dim-the-lights:1": {
    archetypeId: "rogueUnchained:false-medium",
    name: "Dim the Lights",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Bluff/Disguise/Sleight of Hand bonus gated on a lighting condition (dim light/darkness) the engine has no roll data for",
  },
  "rogueUnchained:false-medium:false-sensitivity:2": {
    archetypeId: "rogueUnchained:false-medium",
    name: "False Sensitivity",
    level: 2,
    bucket: "subsystem",
    note: "lets Bluff fake occult skill-unlock results — an opposed-check mechanic, no flat bonus",
  },
  "rogueUnchained:false-medium:haunting-presences:3": {
    archetypeId: "rogueUnchained:false-medium",
    name: "Haunting Presences",
    level: 3,
    bucket: "subsystem",
    note: "Bluff-powered illusion-mimicry ability with a scaling range — the range isn't a Change-shaped PC stat",
  },

  // ── Fey Prankster ──────────────────────────────────────────────────────
  "rogueUnchained:fey-prankster:dirty-trickster:2": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Dirty Trickster",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a bonus feat + a prerequisite waiver",
  },
  "rogueUnchained:fey-prankster:embarrassing-satire:8": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Embarrassing Satire",
    level: 8,
    bucket: "subsystem",
    note: "a sickened rider imposed on a TARGET via performance — not a bonus to the character's own sheet",
  },
  "rogueUnchained:fey-prankster:greater-dirty-trick:6": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Greater Dirty Trick",
    level: 6,
    bucket: "subsystem",
    note: "grants Greater Dirty Trick as a bonus feat",
  },
  "rogueUnchained:fey-prankster:improved-dirty-trick:2": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Improved Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a bonus feat (a second, apparently duplicate vendored row alongside Dirty Trickster at the same level — both are feat grants either way)",
  },
  "rogueUnchained:fey-prankster:incite-unreliability:1": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Incite Unreliability",
    level: 1,
    bucket: "subsystem",
    note: "enchantment (compulsion) performance effect imposed on a TARGET — not a bonus to self",
  },
  "rogueUnchained:fey-prankster:master-of-mischief:5": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Master of Mischief",
    level: 5,
    bucket: "subsystem",
    note: "take-10/take-20 ability, limited uses/day — no flat number",
  },
  "rogueUnchained:fey-prankster:mischievous-talent:1": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Mischievous Talent",
    level: 1,
    bucket: "numeric",
    note: "unconditional half-level (min 1) bonus across Bluff/Disguise/Sleight of Hand/Stealth — extracted; the untrained-Sleight-of-Hand permission is dropped (not a number)",
  },
  "rogueUnchained:fey-prankster:plant-traps:8": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Plant Traps",
    level: 8,
    bucket: "subsystem",
    note: "converts a plant into a trap with fixed DCs — no PC-facing bonus",
  },
  "rogueUnchained:fey-prankster:song-of-clumsiness:1": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Song of Clumsiness",
    level: 1,
    bucket: "subsystem",
    note: "enchantment (compulsion) performance effect imposed on enemies — not a bonus to self",
  },
  "rogueUnchained:fey-prankster:steal-appearance:4": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Steal Appearance",
    level: 4,
    bucket: "subsystem",
    note: "swaps two creatures'/items' apparent identity — a disguise-equivalent effect, no flat bonus",
  },
  "rogueUnchained:fey-prankster:treacherous-plants:1": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Treacherous Plants",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Bluff bonus scoped to two specific Bluff uses (distraction-to-hide, feint) near plants — narrower than general Bluff",
  },
  "rogueUnchained:fey-prankster:unseen-trickster:12": {
    archetypeId: "rogueUnchained:fey-prankster",
    name: "Unseen Trickster",
    level: 12,
    bucket: "subsystem",
    note: "Stealth-without-cover permission near plants — a rules permission, not a bonus",
  },

  // ── Filcher ────────────────────────────────────────────────────────────
  "rogueUnchained:filcher:filch:4": {
    archetypeId: "rogueUnchained:filcher",
    name: "Filch",
    level: 4,
    bucket: "subsystem",
    note: "substitutes Sleight of Hand for CMB on the steal maneuver — a roll-substitution mechanic, not an additive Change",
  },
  "rogueUnchained:filcher:quicker-than-the-eye:2": {
    archetypeId: "rogueUnchained:filcher",
    name: "Quicker than the Eye",
    level: 2,
    bucket: "subsystem",
    note: "reduces an OPPONENT's Perception DC to notice a Sleight of Hand attempt + speeds up drawing a hidden item — not a bonus to the filcher's own checks",
  },
  "rogueUnchained:filcher:rummage:3": {
    archetypeId: "rogueUnchained:filcher",
    name: "Rummage",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling Appraise bonus — extracted",
  },
  "rogueUnchained:filcher:superior-filching:8": {
    archetypeId: "rogueUnchained:filcher",
    name: "Superior Filching",
    level: 8,
    bucket: "subsystem",
    note: "grants Greater Steal as a bonus feat + negates an OPPONENT's CMD bonus — the CMD-negation is opponent-side, not a PC bonus",
  },

  // ── Galtan Agitator ────────────────────────────────────────────────────
  "rogueUnchained:galtan-agitator:enthralling-agitation:4": {
    archetypeId: "rogueUnchained:galtan-agitator",
    name: "Enthralling Agitation",
    level: 4,
    bucket: "subsystem",
    note: "as the spell enthrall, but the published DC scales with 1/2 rogue level rather than spell level — this table's DC is fixed to spell level, so wiring it would drift wrong as she levels; left as prose. The influence-shifting check isn't modeled either",
  },
  "rogueUnchained:galtan-agitator:leadership:12": {
    archetypeId: "rogueUnchained:galtan-agitator",
    name: "Leadership",
    level: 12,
    bucket: "subsystem",
    note: "grants Leadership as a bonus feat (with a Leadership-score-doubling rider) — no independent Change target for a Leadership score",
  },
  "rogueUnchained:galtan-agitator:ready-for-betrayal:3": {
    archetypeId: "rogueUnchained:galtan-agitator",
    name: "Ready for Betrayal",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Perception (recognize disguises/notice hiding) and Sense Motive (disbelieve lies) bonuses — both scoped to specific check purposes",
  },
  "rogueUnchained:galtan-agitator:reputation:1": {
    archetypeId: "rogueUnchained:galtan-agitator",
    name: "Reputation",
    level: 1,
    bucket: "subsystem",
    note: "social-influence/reputation mechanic (renown-talent equivalent) — no flat number",
  },
  "rogueUnchained:galtan-agitator:revolutionary-s-cause:8": {
    archetypeId: "rogueUnchained:galtan-agitator",
    name: "Revolutionary's Cause",
    level: 8,
    bucket: "subsystem",
    note: "a suggestion-equivalent effect on an already-enthralled crowd — resource-gated, no baseline number",
  },

  // ── Guerrilla ──────────────────────────────────────────────────────────
  "rogueUnchained:guerrilla:cover-of-night:2": {
    archetypeId: "rogueUnchained:guerrilla",
    name: "Cover of Night",
    level: 2,
    bucket: "situational",
    note: "+5 Disguise/Sleight of Hand/Stealth bonus gated on a lighting condition (dim light/darkness) the engine has no roll data for",
  },
  "rogueUnchained:guerrilla:guerrilla-sniping:4": {
    archetypeId: "rogueUnchained:guerrilla",
    name: "Guerrilla Sniping",
    level: 4,
    bucket: "subsystem",
    note: "reduces a specific sniping-Stealth penalty from -20 to -10 — no target for a scoped penalty reduction",
  },
  "rogueUnchained:guerrilla:secret-messenger:3": {
    archetypeId: "rogueUnchained:guerrilla",
    name: "Secret Messenger",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Bluff (convey) and Sense Motive (discern) bonuses scoped to secret-message use specifically",
  },
  "rogueUnchained:guerrilla:skilled-liar:1": {
    archetypeId: "rogueUnchained:guerrilla",
    name: "Skilled Liar",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) bonus scoped to the opposed roll when deceiving someone — narrower than general Bluff",
  },

  // ── Guild Agent ────────────────────────────────────────────────────────
  "rogueUnchained:guild-agent:criminal-mastermind:20": {
    archetypeId: "rogueUnchained:guild-agent",
    name: "Criminal Mastermind",
    level: 20,
    bucket: "subsystem",
    note: "renown-talent-equivalent reputation mechanic — no flat number",
  },
  "rogueUnchained:guild-agent:guild-connections:2": {
    archetypeId: "rogueUnchained:guild-agent",
    name: "Guild Connections",
    level: 2,
    bucket: "situational",
    note: "+1/2-level Knowledge (local)/Diplomacy bonus scoped to gathering info about the guild's own base of operations, plus a talent grant — narrower than general use of those skills",
  },
  "rogueUnchained:guild-agent:honor-among-thieves:1": {
    archetypeId: "rogueUnchained:guild-agent",
    name: "Honor Among Thieves",
    level: 1,
    bucket: "subsystem",
    note: "guild-membership/organizational-influence bookkeeping — no PC-facing number",
  },
  "rogueUnchained:guild-agent:pull-rank:8": {
    archetypeId: "rogueUnchained:guild-agent",
    name: "Pull Rank",
    level: 8,
    bucket: "subsystem",
    note: "calls in NPC guild members to assist — no PC-facing number",
  },

  // ── Gun Smuggler ───────────────────────────────────────────────────────
  "rogueUnchained:gun-smuggler:hidden-gun:1": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Hidden Gun",
    level: 1,
    bucket: "situational",
    note: "+1/2-level Sleight of Hand bonus scoped to concealing a one-handed firearm specifically; the DC-increase-for-opponents'-Perception half is opponent-facing, no PC target either way",
  },
  "rogueUnchained:gun-smuggler:secret-sidearm:1": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Secret Sidearm",
    level: 1,
    bucket: "subsystem",
    note: "grants a battered gun + Gunsmithing — equipment/feat grant, no flat number",
  },
  "rogueUnchained:gun-smuggler:selective-targeting:1": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Selective Targeting",
    level: 1,
    bucket: "subsystem",
    note: "changes sneak attack die SIZE (d4 vs d6) for non-signature weapons — no engine target for sneak attack die size",
  },
  "rogueUnchained:gun-smuggler:stolen-shots:3": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Stolen Shots",
    level: 3,
    bucket: "subsystem",
    note: "a daily ammunition-resource mechanic — no Change-shaped number",
  },
  "rogueUnchained:gun-smuggler:uncanny-aim:4": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Uncanny Aim",
    level: 4,
    bucket: "subsystem",
    note: "range-increment increase (10 ft. at 4th) + a damage-die-step increase (at 8th) for specific pistols — range increment now displays but has no Change target to increase it, and die-step increases remain inexpressible",
  },
  "rogueUnchained:gun-smuggler:weapon-and-armor-proficiency:1": {
    archetypeId: "rogueUnchained:gun-smuggler",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },

  // ── Heister ────────────────────────────────────────────────────────────
  "rogueUnchained:heister:ferret-s-grace:4": {
    archetypeId: "rogueUnchained:heister",
    name: "Ferret's Grace",
    level: 4,
    bucket: "subsystem",
    note: "grants Stealthy + squeezing-size/DC rules — no flat number",
  },
  "rogueUnchained:heister:rum-dubber:2": {
    archetypeId: "rogueUnchained:heister",
    name: "Rum Dubber",
    level: 2,
    bucket: "subsystem",
    note: "changes a lock-DC-without-tools penalty from -10 to -2 — no target for a scoped DC-penalty change",
  },
  "rogueUnchained:heister:unseen:8": {
    archetypeId: "rogueUnchained:heister",
    name: "Unseen",
    level: 8,
    bucket: "subsystem",
    note: "Stealth-while-observed permission + a duplicated rogue talent grant — no flat bonus",
  },

  // ── Investigator ───────────────────────────────────────────────────────
  "rogueUnchained:investigator:follow-up:1": {
    archetypeId: "rogueUnchained:investigator",
    name: "Follow Up",
    level: 1,
    bucket: "subsystem",
    note: "roll-twice-and-keep-both-results mechanic for gather-information Diplomacy — not a flat additive bonus",
  },

  // ── Kintargo Rebel ─────────────────────────────────────────────────────
  "rogueUnchained:kintargo-rebel:misdirection:4": {
    archetypeId: "rogueUnchained:kintargo-rebel",
    name: "Misdirection",
    level: 4,
    bucket: "subsystem",
    note: "misdirection (self plus a chosen creature), wired via the spell-like-abilities route",
  },
  "rogueUnchained:kintargo-rebel:sophisticated-stealth:3": {
    archetypeId: "rogueUnchained:kintargo-rebel",
    name: "Sophisticated Stealth",
    level: 3,
    bucket: "numeric",
    note: "the Knowledge (nobility) portion is unconditional and scaling — extracted. The Bluff/Sense Motive portion is scoped to secret-message use and dropped.",
  },

  // ── Kitsune Trickster ──────────────────────────────────────────────────
  "rogueUnchained:kitsune-trickster:kitsune-s-charm:3": {
    archetypeId: "rogueUnchained:kitsune-trickster",
    name: "Kitsune's Charm",
    level: 3,
    bucket: "subsystem",
    note: "charm person, wired via the spell-like-abilities route",
  },
  "rogueUnchained:kitsune-trickster:kitsune-s-guile:1": {
    archetypeId: "rogueUnchained:kitsune-trickster",
    name: "Kitsune's Guile",
    level: 1,
    bucket: "numeric",
    note: "unconditional Int-modifier bonus across Bluff/Diplomacy/Disguise/Sense Motive — extracted",
  },

  // ── Knife Master ───────────────────────────────────────────────────────
  "rogueUnchained:knife-master:blade-sense:3": {
    archetypeId: "rogueUnchained:knife-master",
    name: "Blade Sense",
    level: 3,
    bucket: "situational",
    note: "dodge AC bonus that only applies against attacks made WITH light blades — depends on the attacker's own weapon, which the static sheet can't know",
  },
  "rogueUnchained:knife-master:hidden-blade:1": {
    archetypeId: "rogueUnchained:knife-master",
    name: "Hidden Blade",
    level: 1,
    bucket: "situational",
    note: "Sleight of Hand bonus scoped to concealing a light blade specifically — not general Sleight of Hand",
  },
  "rogueUnchained:knife-master:sneak-stab:1": {
    archetypeId: "rogueUnchained:knife-master",
    name: "Sneak Stab",
    level: 1,
    bucket: "subsystem",
    note: "upsizes/downsizes sneak attack die TYPE for a named weapon list — no engine target for sneak attack die size",
  },

  // ── Makeshift Scrapper ─────────────────────────────────────────────────
  "rogueUnchained:makeshift-scrapper:improvised-weapon-mastery:12": {
    archetypeId: "rogueUnchained:makeshift-scrapper",
    name: "Improvised Weapon Mastery",
    level: 12,
    bucket: "subsystem",
    note: "grants Improvised Weapon Mastery as a bonus feat (talent-slot substitution)",
  },
  "rogueUnchained:makeshift-scrapper:improvised-weapons:1": {
    archetypeId: "rogueUnchained:makeshift-scrapper",
    name: "Improvised Weapons",
    level: 1,
    bucket: "subsystem",
    note: "grants Catch Off-Guard + Throw Anything as bonus feats",
  },
  "rogueUnchained:makeshift-scrapper:supernatural-improvisation:3": {
    archetypeId: "rogueUnchained:makeshift-scrapper",
    name: "Supernatural Improvisation",
    level: 3,
    bucket: "subsystem",
    note: "a per-day-rounds resource pool granting a swift-action, alternating enhancement/shield buff — activated/resource-gated",
  },
  "rogueUnchained:makeshift-scrapper:weapon-and-armor-proficiency:1": {
    archetypeId: "rogueUnchained:makeshift-scrapper",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change, no Change-shaped target",
  },

  // ── Master of Disguise ─────────────────────────────────────────────────
  "rogueUnchained:master-of-disguise:consummate-actor:1": {
    archetypeId: "rogueUnchained:master-of-disguise",
    name: "Consummate Actor",
    level: 1,
    bucket: "numeric",
    note: "the Disguise portion is unconditional — extracted. The Bluff-to-stay-in-character portion is scoped and dropped, along with a talent grant.",
  },
  "rogueUnchained:master-of-disguise:grandmaster-of-disguise:10": {
    archetypeId: "rogueUnchained:master-of-disguise",
    name: "Grandmaster of Disguise",
    level: 10,
    bucket: "subsystem",
    note: "an unlimited-use advanced rogue talent grant — talent-list, out of scope",
  },

  // ── Nameless Shadow ────────────────────────────────────────────────────
  "rogueUnchained:nameless-shadow:face-in-the-crowd:4": {
    archetypeId: "rogueUnchained:nameless-shadow",
    name: "Face in the Crowd",
    level: 4,
    bucket: "subsystem",
    note: "lets Bluff/Disguise substitute for Stealth in a crowd — a roll-substitution mechanic, not an additive bonus",
  },
  "rogueUnchained:nameless-shadow:harmless-guise:1": {
    archetypeId: "rogueUnchained:nameless-shadow",
    name: "Harmless Guise",
    level: 1,
    bucket: "subsystem",
    note: "vigilante-identity subsystem + a conditional AC penalty imposed on a TARGET — not a bonus to the character's own sheet",
  },

  // ── Needler ────────────────────────────────────────────────────────────
  "rogueUnchained:needler:adroit-poisoner:2": {
    archetypeId: "rogueUnchained:needler",
    name: "Adroit Poisoner",
    level: 2,
    bucket: "numeric",
    note: "the base unconditional Sleight of Hand bonus is extracted; the further increase while drawing a poisoned weapon specifically is scoped and dropped",
  },
  "rogueUnchained:needler:concealed-delivery:8": {
    archetypeId: "rogueUnchained:needler",
    name: "Concealed Delivery",
    level: 8,
    bucket: "subsystem",
    note: "a Sleight-of-Hand-vs-Perception poison-delivery mechanic — not a bonus",
  },
  "rogueUnchained:needler:needle-poisoner:6": {
    archetypeId: "rogueUnchained:needler",
    name: "Needle Poisoner",
    level: 6,
    bucket: "subsystem",
    note: "swift-action poison application — an action-economy change, no number",
  },
  "rogueUnchained:needler:subtle-poisoning:4": {
    archetypeId: "rogueUnchained:needler",
    name: "Subtle Poisoning",
    level: 4,
    bucket: "subsystem",
    note: "changes poison-application timing + reduces the POISON's own save DC by 1 — targets the poison, not the character's own defenses",
  },

  // ── Numerian Scavenger ─────────────────────────────────────────────────
  "rogueUnchained:numerian-scavenger:lucky-glitch:4": {
    archetypeId: "rogueUnchained:numerian-scavenger",
    name: "Lucky Glitch",
    level: 4,
    bucket: "subsystem",
    note: "roll-twice-and-choose for a glitch table, plus a flat bonus on that specific roll only — the roll it modifies isn't a modeled Change target",
  },
  "rogueUnchained:numerian-scavenger:robot-slayer:8": {
    archetypeId: "rogueUnchained:numerian-scavenger",
    name: "Robot Slayer",
    level: 8,
    bucket: "situational",
    note: "ignores a robot's hardness on sneak attack damage — a hardness-bypass scoped to one creature type, no target",
  },
  "rogueUnchained:numerian-scavenger:technic-training:1": {
    archetypeId: "rogueUnchained:numerian-scavenger",
    name: "Technic Training",
    level: 1,
    bucket: "situational",
    note: "+1/2-level (min 1) Perception/Disable Device bonus scoped to mechanical/high-tech traps specifically — not general Perception/DD",
  },

  // ── Okeno Liberator ────────────────────────────────────────────────────
  "rogueUnchained:okeno-liberator:bond-breaker:1": {
    archetypeId: "rogueUnchained:okeno-liberator",
    name: "Bond Breaker",
    level: 1,
    bucket: "numeric",
    note: "the Escape Artist portion is unconditional — extracted. The no-penalty-for-improvised-DD-tools half removes a penalty the engine never modeled, so there's nothing to add there.",
  },
  "rogueUnchained:okeno-liberator:catch-off-guard:4": {
    archetypeId: "rogueUnchained:okeno-liberator",
    name: "Catch Off-Guard",
    level: 4,
    bucket: "subsystem",
    note: "grants Catch Off-Guard as a bonus feat",
  },
  "rogueUnchained:okeno-liberator:covert-commander:3": {
    archetypeId: "rogueUnchained:okeno-liberator",
    name: "Covert Commander",
    level: 3,
    bucket: "situational",
    note: "grants a competence bonus to ALLIES' Disguise/Stealth checks — no target for a bonus applied to another creature",
  },

  // ── Phantom Thief ──────────────────────────────────────────────────────
  "rogueUnchained:phantom-thief:broad-education:2": {
    archetypeId: "rogueUnchained:phantom-thief",
    name: "Broad Education",
    level: 2,
    bucket: "subsystem",
    note: "expands which rogue talents/feats are selectable — talent-list change, out of scope",
  },
  "rogueUnchained:phantom-thief:master-of-all:20": {
    archetypeId: "rogueUnchained:phantom-thief",
    name: "Master of All",
    level: 20,
    bucket: "subsystem",
    note: "a once-per-minute reroll on trained class-skill checks — not a flat bonus",
  },
  "rogueUnchained:phantom-thief:refined-education:1": {
    archetypeId: "rogueUnchained:phantom-thief",
    name: "Refined Education",
    level: 1,
    bucket: "subsystem",
    note: "adds class skills + a per-skill half-level bonus on PLAYER-CHOSEN skills — choice-bearing, same posture as rogue talents",
  },
  "rogueUnchained:phantom-thief:social-sense:3": {
    archetypeId: "rogueUnchained:phantom-thief",
    name: "Social Sense",
    level: 3,
    bucket: "situational",
    note: "+1/3-level Sense Motive/Bluff/initiative bonuses all scoped to the surprise-round context specifically",
  },

  // ── Pirate ─────────────────────────────────────────────────────────────
  "rogueUnchained:pirate:sea-legs:1": {
    archetypeId: "rogueUnchained:pirate",
    name: "Sea Legs",
    level: 1,
    bucket: "subsystem",
    note: "grants the Sea Legs feat as a bonus feat",
  },
  "rogueUnchained:pirate:swinging-reposition:2": {
    archetypeId: "rogueUnchained:pirate",
    name: "Swinging Reposition",
    level: 2,
    bucket: "subsystem",
    note: "a positional/movement rule while charging or bull-rushing near ship structures — no Change-shaped number",
  },
  "rogueUnchained:pirate:unflinching:3": {
    archetypeId: "rogueUnchained:pirate",
    name: "Unflinching",
    level: 3,
    bucket: "numeric",
    note: "unconditional save bonus vs. fear and mind-affecting effects — expressible via saveCategories: ['mind'] (fear is a child category, already covered)",
  },

  // ── Planar Sneak ───────────────────────────────────────────────────────
  "rogueUnchained:planar-sneak:elemental-execution:4": {
    archetypeId: "rogueUnchained:planar-sneak",
    name: "Elemental Execution",
    level: 4,
    bucket: "subsystem",
    note: "lets sneak attack (at half damage) and crits apply to elemental/outsider creatures normally immune — a targeting-rule change, not a flat number",
  },
  "rogueUnchained:planar-sneak:planar-sense:3": {
    archetypeId: "rogueUnchained:planar-sneak",
    name: "Planar Sense",
    level: 3,
    bucket: "numeric",
    note: "+1/3-level save bonus scoped to eight descriptors; the four alignment ones (chaos/evil/good/law) are wired via SAVE_CATEGORIES, the four elemental ones (air/earth/fire/water) have no matching category and stay in the note",
  },

  // ── Poisoner ───────────────────────────────────────────────────────────
  "rogueUnchained:poisoner:master-poisoner:3": {
    archetypeId: "rogueUnchained:poisoner",
    name: "Master Poisoner",
    level: 3,
    bucket: "situational",
    note: "Craft (alchemy) bonus scoped to working with poison specifically — narrower than a general Craft (alchemy) bonus",
  },
  "rogueUnchained:poisoner:poison-use:1": {
    archetypeId: "rogueUnchained:poisoner",
    name: "Poison Use",
    level: 1,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled — nothing to remove",
  },

  // ── Rake ───────────────────────────────────────────────────────────────
  "rogueUnchained:rake:bravado-s-blade:1": {
    archetypeId: "rogueUnchained:rake",
    name: "Bravado's Blade",
    level: 1,
    bucket: "subsystem",
    note: "forgoes sneak attack dice for a scaling Intimidate check bonus — a per-hit resource-forgo mechanic, not an always-on number",
  },
  "rogueUnchained:rake:rake-s-smile:3": {
    archetypeId: "rogueUnchained:rake",
    name: "Rake's Smile",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling morale bonus on Bluff and Diplomacy — extracted",
  },

  // ── Relic Raider ───────────────────────────────────────────────────────
  "rogueUnchained:relic-raider:curse-sense:4": {
    archetypeId: "rogueUnchained:relic-raider",
    name: "Curse Sense",
    level: 4,
    bucket: "numeric",
    note: "the save-vs-curses clause maps to saveCategories: ['curse'] — extracted. The haunt-scoped Perception/Spellcraft/AC bonuses are dropped: 'haunts' names no SAVE_CATEGORIES or AC_CATEGORIES entry, and the AC bonus is scoped to haunt attacks specifically, not curses.",
  },
  "rogueUnchained:relic-raider:disable-curse:8": {
    archetypeId: "rogueUnchained:relic-raider",
    name: "Disable Curse",
    level: 8,
    bucket: "subsystem",
    note: "a Disable-Device-as-remove-curse mechanic, limited uses/day — activated, no flat number",
  },

  // ── River Rat ──────────────────────────────────────────────────────────
  "rogueUnchained:river-rat:rat-s-resilience:3": {
    archetypeId: "rogueUnchained:river-rat",
    name: "Rat's Resilience",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling save bonus vs. disease and poison — both are SAVE_CATEGORIES entries",
  },
  "rogueUnchained:river-rat:swamper:1": {
    archetypeId: "rogueUnchained:river-rat",
    name: "Swamper",
    level: 1,
    bucket: "numeric",
    note: "the Swim bonus is real and scaling, gated on 'wearing light or no armor and carrying no more than a light load' — @armor.type<=1 is checkable, the light-load half isn't and is dropped. The difficult-terrain/no-Acrobatics-Stealth-penalty half has no matching target either.",
  },

  // ── Roof Runner ────────────────────────────────────────────────────────
  "rogueUnchained:roof-runner:roof-running:1": {
    archetypeId: "rogueUnchained:roof-runner",
    name: "Roof Running",
    level: 1,
    bucket: "subsystem",
    note: "a terrain-specific move-at-full-speed/no-Dex-skill-or-Reflex-penalty permission, no flat number",
  },
  "rogueUnchained:roof-runner:tumbling-descent:2": {
    archetypeId: "rogueUnchained:roof-runner",
    name: "Tumbling Descent",
    level: 2,
    bucket: "subsystem",
    note: "a DC-based fall/descent mechanic, no flat bonus granted",
  },

  // ── Rotdrinker ─────────────────────────────────────────────────────────
  "rogueUnchained:rotdrinker:poison-resistance:2": {
    archetypeId: "rogueUnchained:rotdrinker",
    name: "Poison Resistance",
    level: 2,
    bucket: "numeric",
    note: "unconditional scaling save bonus vs. all poisons — a clean SAVE_CATEGORIES mapping",
  },
  "rogueUnchained:rotdrinker:unnatural-ingestion:4": {
    archetypeId: "rogueUnchained:rotdrinker",
    name: "Unnatural Ingestion",
    level: 4,
    bucket: "subsystem",
    note: "conditional temporary-hp-and-bonus grant that depends on which ingested poison was just consumed — a live, per-poison resource state this engine doesn't track",
  },

  // ── Sanctified Rogue ───────────────────────────────────────────────────
  "rogueUnchained:sanctified-rogue:divine-epiphany:8": {
    archetypeId: "rogueUnchained:sanctified-rogue",
    name: "Divine Epiphany",
    level: 8,
    bucket: "subsystem",
    note: "augury, wired via the spell-like-abilities route",
  },
  "rogueUnchained:sanctified-rogue:divine-purpose:4": {
    archetypeId: "rogueUnchained:sanctified-rogue",
    name: "Divine Purpose",
    level: 4,
    bucket: "numeric",
    note: "unconditional flat sacred bonus on Fortitude and Will saves — extracted",
  },

  // ── Sapper ─────────────────────────────────────────────────────────────
  "rogueUnchained:sapper:destructive-dismantle:1": {
    archetypeId: "rogueUnchained:sapper",
    name: "Destructive Dismantle",
    level: 1,
    bucket: "subsystem",
    note: "deals fixed damage to an OBJECT once/day, ignoring hardness — not a PC stat",
  },
  "rogueUnchained:sapper:fence:4": {
    archetypeId: "rogueUnchained:sapper",
    name: "Fence",
    level: 4,
    bucket: "subsystem",
    note: "a gold-generation downtime mechanic — no Change-shaped number",
  },
  "rogueUnchained:sapper:sapping:2": {
    archetypeId: "rogueUnchained:sapper",
    name: "Sapping",
    level: 2,
    bucket: "situational",
    note: "both clauses (Perception/Disable Device to find/disable traps; aid-another on specific Strength checks) are scoped to a narrow use-case, not the whole skill",
  },

  // ── Scout ──────────────────────────────────────────────────────────────
  "rogueUnchained:scout:scout-s-charge:4": {
    archetypeId: "rogueUnchained:scout",
    name: "Scout's Charge",
    level: 4,
    bucket: "situational",
    note: "grants sneak attack as if flat-footed, but only on a charge — sneak attack's own die count is untouched (tables.ts), and the trigger is action-scoped",
  },
  "rogueUnchained:scout:skirmisher:8": {
    archetypeId: "rogueUnchained:scout",
    name: "Skirmisher",
    level: 8,
    bucket: "situational",
    note: "same shape as Scout's Charge, scoped to moving 10+ ft. then attacking — action-scoped",
  },

  // ── Scroll Scoundrel ───────────────────────────────────────────────────
  "rogueUnchained:scroll-scoundrel:adaptive-learning:3": {
    archetypeId: "rogueUnchained:scroll-scoundrel",
    name: "Adaptive Learning",
    level: 3,
    bucket: "situational",
    note: "save bonus scoped to an effect already succeeded against within the last minute — a live, per-encounter condition this engine can't track, not a category",
  },
  "rogueUnchained:scroll-scoundrel:elusive-gambit:6": {
    archetypeId: "rogueUnchained:scroll-scoundrel",
    name: "Elusive Gambit",
    level: 6,
    bucket: "subsystem",
    note: "grants a flat-footed STATUS on a foe under a specific attack-of-opportunity sequence — a state grant, not a numeric modifier",
  },
  "rogueUnchained:scroll-scoundrel:fast-talker:2": {
    archetypeId: "rogueUnchained:scroll-scoundrel",
    name: "Fast Talker",
    level: 2,
    bucket: "situational",
    note: "a Bluff penalty reduction scoped to unlikely/farfetched lies, and a Diplomacy bonus scoped to adjusting starting attitude — both narrower than the whole skill",
  },
  "rogueUnchained:scroll-scoundrel:pay-it-back:4": {
    archetypeId: "rogueUnchained:scroll-scoundrel",
    name: "Pay it Back",
    level: 4,
    bucket: "situational",
    note: "attack/damage bonus scoped to foes who attacked him in the PREVIOUS round — a per-round conditional the static sheet can't track",
  },
  "rogueUnchained:scroll-scoundrel:spot-weakness:10": {
    archetypeId: "rogueUnchained:scroll-scoundrel",
    name: "Spot Weakness",
    level: 10,
    bucket: "subsystem",
    note: "a swift-action, once-per-attack DR/hardness-bypass ability — action-gated, not an always-on number",
  },

  // ── Sczarni Swindler ───────────────────────────────────────────────────
  "rogueUnchained:sczarni-swindler:cheat-fate:8": {
    archetypeId: "rogueUnchained:sczarni-swindler",
    name: "Cheat Fate",
    level: 8,
    bucket: "subsystem",
    note: "a limited-use reroll ability — resource-gated, not a flat number",
  },
  "rogueUnchained:sczarni-swindler:let-fate-decide:1": {
    archetypeId: "rogueUnchained:sczarni-swindler",
    name: "Let Fate Decide",
    level: 1,
    bucket: "subsystem",
    note: "an activated luck bonus whose target roll type is chosen fresh each use — no fixed Change target, resource-gated besides",
  },
  "rogueUnchained:sczarni-swindler:no-fool:4": {
    archetypeId: "rogueUnchained:sczarni-swindler",
    name: "No Fool",
    level: 4,
    bucket: "numeric",
    note: "unconditional scaling Will save bonus — extracted",
  },
  "rogueUnchained:sczarni-swindler:poker-face:3": {
    archetypeId: "rogueUnchained:sczarni-swindler",
    name: "Poker Face",
    level: 3,
    bucket: "numeric",
    note: "unconditional bonus on Bluff/Profession (gambler)/Sense Motive, using the skill.pro.gambler target — extracted, matching the sibling rogue:sczarni-swindler:poker-face:3 entry's ruling (the non-humanoid-feint rider is dropped)",
  },
  "rogueUnchained:sczarni-swindler:quicker-than-the-eye:2": {
    archetypeId: "rogueUnchained:sczarni-swindler",
    name: "Quicker Than the Eye",
    level: 2,
    bucket: "subsystem",
    note: "reduces an OPPONENT's Perception + a move-action Sleight of Hand permission — not a bonus to the swindler's own checks",
  },

  // ── Seeker of the Lost ─────────────────────────────────────────────────
  "rogueUnchained:seeker-of-the-lost:arcana-breaker:2": {
    archetypeId: "rogueUnchained:seeker-of-the-lost",
    name: "Arcana Breaker",
    level: 2,
    bucket: "situational",
    note: "Perception/Disable Device bonus scoped to magical traps specifically — not general Perception/DD",
  },
  "rogueUnchained:seeker-of-the-lost:underwater-striker:4": {
    archetypeId: "rogueUnchained:seeker-of-the-lost",
    name: "Underwater Striker",
    level: 4,
    bucket: "subsystem",
    note: "removes underwater sneak-attack damage-halving + a construct-hardness bypass — targeting-rule changes, no flat number",
  },
  "rogueUnchained:seeker-of-the-lost:wary-disarm:8": {
    archetypeId: "rogueUnchained:seeker-of-the-lost",
    name: "Wary Disarm",
    level: 8,
    bucket: "subsystem",
    note: "trap-triggering-avoidance mechanic referencing the unmodeled trap-sense bonus — no Change-shaped number",
  },

  // ── Shadow Scion ───────────────────────────────────────────────────────
  "rogueUnchained:shadow-scion:shadow-dweller:1": {
    archetypeId: "rogueUnchained:shadow-scion",
    name: "Shadow Dweller",
    level: 1,
    bucket: "numeric",
    note: "grants a flat, scaling darkvision (sensedv) — extracted as a highest-wins flat grant, dropping the 'if already had darkvision, +10' initial rider (grant/rider mismatch, see class note 5). The Stealth bonus is scoped to dim light/darkness and dropped.",
  },
  "rogueUnchained:shadow-scion:shadow-master:20": {
    archetypeId: "rogueUnchained:shadow-scion",
    name: "Shadow Master",
    level: 20,
    bucket: "situational",
    note: "DR and a luck save bonus, both scoped to being in an area of dim light — an environmental condition the engine can't check",
  },
  "rogueUnchained:shadow-scion:shadow-speaker:14": {
    archetypeId: "rogueUnchained:shadow-scion",
    name: "Shadow Speaker",
    level: 14,
    bucket: "subsystem",
    note: "functions as commune with nature (the vendored text names the actual spell, just reflavored to trigger via meditation), wired via the spell-like-abilities route",
  },
  "rogueUnchained:shadow-scion:shadow-step:8": {
    archetypeId: "rogueUnchained:shadow-scion",
    name: "Shadow Step",
    level: 8,
    bucket: "subsystem",
    note: "a Shadow-Plane teleport ability with a daily distance budget — resource-gated, no baseline sheet number",
  },
  "rogueUnchained:shadow-scion:shadow-strike:2": {
    archetypeId: "rogueUnchained:shadow-scion",
    name: "Shadow Strike",
    level: 2,
    bucket: "subsystem",
    note: "grants Shadow Strike (or Blind-Fight for an unchained rogue) as a bonus feat",
  },

  // ── Shadow Walker ──────────────────────────────────────────────────────
  "rogueUnchained:shadow-walker:expanded-sight:1": {
    archetypeId: "rogueUnchained:shadow-walker",
    name: "Expanded Sight",
    level: 1,
    bucket: "numeric",
    note: "grants a flat, scaling darkvision (sensedv) — same grant/rider mismatch as Shadow Scion's Shadow Dweller (class note 5); the light-sensitivity-removal rider is a non-numeric trait swap, dropped",
  },
  "rogueUnchained:shadow-walker:favored-illumination:4": {
    archetypeId: "rogueUnchained:shadow-walker",
    name: "Favored Illumination",
    level: 4,
    bucket: "situational",
    note: "scaling bonuses scoped to being within a chosen illumination level — an environmental condition the engine can't check",
  },
  "rogueUnchained:shadow-walker:illumination-control:3": {
    archetypeId: "rogueUnchained:shadow-walker",
    name: "Illumination Control",
    level: 3,
    bucket: "subsystem",
    note: "a daily illumination-point pool spent at varying per-spell costs across several named light/darkness spells — a shared point-pool budget, not a per-spell counter",
  },

  // ── Sharper ────────────────────────────────────────────────────────────
  "rogueUnchained:sharper:audacious-overconfidence:4": {
    archetypeId: "rogueUnchained:sharper",
    name: "Audacious Overconfidence",
    level: 4,
    bucket: "subsystem",
    note: "a limited-use, self-penalizing reroll ability — resource-gated, not a flat number",
  },
  "rogueUnchained:sharper:lucky-save:3": {
    archetypeId: "rogueUnchained:sharper",
    name: "Lucky Save",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling luck bonus on all saving throws — extracted",
  },
  "rogueUnchained:sharper:scam-artist:1": {
    archetypeId: "rogueUnchained:sharper",
    name: "Scam Artist",
    level: 1,
    bucket: "numeric",
    note: "unconditional half-level (min 1) bonus on all Bluff and Sleight of Hand checks — extracted",
  },
  "rogueUnchained:sharper:sticky-fingers:2": {
    archetypeId: "rogueUnchained:sharper",
    name: "Sticky Fingers",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved/Greater/Quick Steal as bonus feats on a level cadence",
  },

  // ── Skulking Slayer ────────────────────────────────────────────────────
  "rogueUnchained:skulking-slayer:bold-strike:3": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Bold Strike",
    level: 3,
    bucket: "subsystem",
    note: "upsizes sneak attack die TYPE on a charge with a two-handed weapon — no engine target for sneak attack die size",
  },
  "rogueUnchained:skulking-slayer:bonus-feats:2": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Bonus Feats",
    level: 2,
    bucket: "subsystem",
    note: "lets specific named feats be taken in place of a rogue talent — talent-list substitution",
  },
  "rogueUnchained:skulking-slayer:pass-for-human:1": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Pass for Human",
    level: 1,
    bucket: "situational",
    note: "Disguise bonus scoped to concealing half-orc heritage specifically — not general Disguise",
  },
  "rogueUnchained:skulking-slayer:shifty:6": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Shifty",
    level: 6,
    bucket: "situational",
    note: "Bluff bonus scoped to feint attempts specifically — not general Bluff",
  },
  "rogueUnchained:skulking-slayer:underhanded-maneuvers:1": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Underhanded Maneuvers",
    level: 1,
    bucket: "situational",
    note: "a real combat-maneuver-check bonus, but scoped to dirty trick/steal maneuvers specifically in place of a sneak attack — not general cmb",
  },
  "rogueUnchained:skulking-slayer:unexpected-charge:9": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Unexpected Charge",
    level: 9,
    bucket: "subsystem",
    note: "a swift-action feint before a charge — an action-economy change, no number",
  },
  "rogueUnchained:skulking-slayer:weapon-and-armor-proficiency:1": {
    archetypeId: "rogueUnchained:skulking-slayer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap, no Change-shaped target",
  },

  // ── Sly Saboteur ───────────────────────────────────────────────────────
  "rogueUnchained:sly-saboteur:catastrophic-failure:4": {
    archetypeId: "rogueUnchained:sly-saboteur",
    name: "Catastrophic Failure",
    level: 4,
    bucket: "subsystem",
    note: "rigs a device to deal damage to its USER on failure — targets others, not the saboteur's own sheet",
  },
  "rogueUnchained:sly-saboteur:disable-magic-device:8": {
    archetypeId: "rogueUnchained:sly-saboteur",
    name: "Disable Magic Device",
    level: 8,
    bucket: "subsystem",
    note: "extends Disable Device to magic items — a permission, no flat number",
  },
  "rogueUnchained:sly-saboteur:scamper:3": {
    archetypeId: "rogueUnchained:sly-saboteur",
    name: "Scamper",
    level: 3,
    bucket: "subsystem",
    note: "ignores difficult terrain for a scaling distance — no engine target for 'ignore difficult terrain,' distinct from a speed bonus",
  },

  // ── Smuggler ───────────────────────────────────────────────────────────
  "rogueUnchained:smuggler:bribery:3": {
    archetypeId: "rogueUnchained:smuggler",
    name: "Bribery",
    level: 3,
    bucket: "situational",
    note: "scaling Diplomacy bonus scoped to bribing officials at checkpoints/inspections specifically — not general Diplomacy",
  },
  "rogueUnchained:smuggler:conceal-item:1": {
    archetypeId: "rogueUnchained:smuggler",
    name: "Conceal Item",
    level: 1,
    bucket: "numeric",
    note: "the base Sleight of Hand bonus is unconditional and extracted; the item-concealment application is a separate, non-numeric capability",
  },
  "rogueUnchained:smuggler:distraction:2": {
    archetypeId: "rogueUnchained:smuggler",
    name: "Distraction",
    level: 2,
    bucket: "subsystem",
    note: "an opposed Bluff-vs-Perception mechanic to mislead a searcher — not a flat bonus",
  },

  // ── Snare Setter ───────────────────────────────────────────────────────
  "rogueUnchained:snare-setter:deadly-traps:3": {
    archetypeId: "rogueUnchained:snare-setter",
    name: "Deadly Traps",
    level: 3,
    bucket: "subsystem",
    note: "extra trap damage dealt to whoever triggers the trap — not a PC stat",
  },
  "rogueUnchained:snare-setter:master-snare-setter:20": {
    archetypeId: "rogueUnchained:snare-setter",
    name: "Master Snare Setter",
    level: 20,
    bucket: "subsystem",
    note: "attaches a master-strike rider to a trap, limited to one active at a time — a trap mechanic, no PC-facing number",
  },
  "rogueUnchained:snare-setter:sneak-attack:5": {
    archetypeId: "rogueUnchained:snare-setter",
    name: "Sneak Attack",
    level: 5,
    bucket: "blocked",
    note: BLOCKED_SNEAK_ATTACK_REPRINT,
  },
  "rogueUnchained:snare-setter:trapper:1": {
    archetypeId: "rogueUnchained:snare-setter",
    name: "Trapper",
    level: 1,
    bucket: "subsystem",
    note: "grants a ranger-trap feat and substitutes ranger traps for rogue tricks — a subsystem substitution",
  },
  "rogueUnchained:snare-setter:trapsmithing:1": {
    archetypeId: "rogueUnchained:snare-setter",
    name: "Trapsmithing",
    level: 1,
    bucket: "numeric",
    note: "the Craft (traps) portion is unconditional across that subskill — extracted, matching the sibling rogue:snare-setter:trapsmithing:1 entry's ruling (same byte-identical text). The Perception-to-detect-traps portion is scoped and dropped, as is the Craft-in-place-of-Disable-Device substitution.",
  },

  // ── Sniper ─────────────────────────────────────────────────────────────
  "rogueUnchained:sniper:accuracy:1": {
    archetypeId: "rogueUnchained:sniper",
    name: "Accuracy",
    level: 1,
    bucket: "subsystem",
    note: "halves range-increment attack penalties — no engine target for range-increment penalties (attack rolls don't model range)",
  },
  "rogueUnchained:sniper:deadly-range:3": {
    archetypeId: "rogueUnchained:sniper",
    name: "Deadly Range",
    level: 3,
    bucket: "subsystem",
    note: "extends the RANGE at which sneak attack applies — no Change target for sneak attack's applicable range",
  },

  // ── Snoop ──────────────────────────────────────────────────────────────
  "rogueUnchained:snoop:inspiration:1": {
    archetypeId: "rogueUnchained:snoop",
    name: "Inspiration",
    level: 1,
    bucket: "subsystem",
    note: "an investigator-style inspiration pool spent on skill checks — activated resource, not a flat Change",
  },
  "rogueUnchained:snoop:investigator-talents:2": {
    archetypeId: "rogueUnchained:snoop",
    name: "Investigator Talents",
    level: 2,
    bucket: "subsystem",
    note: "substitutes investigator talents for rogue talents — talent-list substitution",
  },
  "rogueUnchained:snoop:master-of-whispers:8": {
    archetypeId: "rogueUnchained:snoop",
    name: "Master of Whispers",
    level: 8,
    bucket: "subsystem",
    note: "grants the rumormonger advanced talent",
  },
  "rogueUnchained:snoop:uncanny-snoop:4": {
    archetypeId: "rogueUnchained:snoop",
    name: "Uncanny Snoop",
    level: 4,
    bucket: "situational",
    note: "Intimidate/Bluff/Diplomacy bonus scoped to forcing information out of an opponent, and Sense Motive scoped to detecting lies — both narrower than general skill use",
  },

  // ── Spy ────────────────────────────────────────────────────────────────
  "rogueUnchained:spy:advanced-talents:0": {
    archetypeId: "rogueUnchained:spy",
    name: "Advanced Talents",
    level: 0,
    bucket: "subsystem",
    note: "a recommended-talent-list reference, not a mechanical grant of its own — talent-list content, out of scope",
  },
  "rogueUnchained:spy:poison-use:0": {
    archetypeId: "rogueUnchained:spy",
    name: "Poison Use",
    level: 0,
    bucket: "subsystem",
    note: "removes a self-poisoning risk the engine never modeled — nothing to remove",
  },
  "rogueUnchained:spy:rogue-talents:0": {
    archetypeId: "rogueUnchained:spy",
    name: "Rogue Talents",
    level: 0,
    bucket: "subsystem",
    note: "a recommended-talent-list reference, not a mechanical grant of its own — talent-list content, out of scope",
  },
  "rogueUnchained:spy:skilled-liar:0": {
    archetypeId: "rogueUnchained:spy",
    name: "Skilled Liar",
    level: 0,
    bucket: "situational",
    note: "+1/2-level (min 1) bonus scoped to the opposed roll when deceiving someone, explicitly excluding feint/secret-message uses — narrower than general Bluff",
  },

  // ── Survivalist ────────────────────────────────────────────────────────
  "rogueUnchained:survivalist:endure-elements:3": {
    archetypeId: "rogueUnchained:survivalist",
    name: "Endure Elements",
    level: 3,
    bucket: "subsystem",
    note: "endure elements, wired via the spell-like-abilities route",
  },
  "rogueUnchained:survivalist:hardy:1": {
    archetypeId: "rogueUnchained:survivalist",
    name: "Hardy",
    level: 1,
    bucket: "subsystem",
    note: "doubles/triples days without water/food before starvation effects — no Change target for that",
  },

  // ── Swamp Poisoner ─────────────────────────────────────────────────────
  "rogueUnchained:swamp-poisoner:mark-the-vein:2": {
    archetypeId: "rogueUnchained:swamp-poisoner",
    name: "Mark the Vein",
    level: 2,
    bucket: "subsystem",
    note: "denies a poisoned TARGET's Dexterity bonus to AC — an effect on the enemy, not a bonus to the swamp poisoner's own sheet",
  },
  "rogueUnchained:swamp-poisoner:mucous-membrane:1": {
    archetypeId: "rogueUnchained:swamp-poisoner",
    name: "Mucous Membrane",
    level: 1,
    bucket: "numeric",
    note: "the Escape Artist portion is unconditional and extracted. The CMD bonus is scoped to resisting grapple attempts specifically (not general CMD) and is dropped.",
  },
  "rogueUnchained:swamp-poisoner:poison-the-well:3": {
    archetypeId: "rogueUnchained:swamp-poisoner",
    name: "Poison the Well",
    level: 3,
    bucket: "subsystem",
    note: "creates a poison-trap area effect + extra racial-poison uses — no PC-facing bonus",
  },

  // ── Swashbuckler ───────────────────────────────────────────────────────
  "rogueUnchained:swashbuckler:daring:3": {
    archetypeId: "rogueUnchained:swashbuckler",
    name: "Daring",
    level: 3,
    bucket: "numeric",
    note: "unconditional scaling morale bonus on Acrobatics AND on saves vs. fear (saveCategories) — both extracted from the same clause",
  },
  "rogueUnchained:swashbuckler:martial-training:1": {
    archetypeId: "rogueUnchained:swashbuckler",
    name: "Martial Training",
    level: 1,
    bucket: "subsystem",
    note: "a weapon-proficiency choice + an extra Combat Trick talent selection — no flat number",
  },

  // ── Swordmaster ────────────────────────────────────────────────────────
  "rogueUnchained:swordmaster:trance:3": {
    archetypeId: "rogueUnchained:swordmaster",
    name: "Trance",
    level: 3,
    bucket: "subsystem",
    note: "an activated stance granting one of several feat-equivalent benefits, resource-gated by rounds/day — not an always-on number",
  },

  // ── Sylvan Trickster ───────────────────────────────────────────────────
  "rogueUnchained:sylvan-trickster:fey-resistance:8": {
    archetypeId: "rogueUnchained:sylvan-trickster",
    name: "Fey Resistance",
    level: 8,
    bucket: "numeric",
    note: "unconditional scaling DR/cold iron — extracted",
  },
  "rogueUnchained:sylvan-trickster:fey-tricks:2": {
    archetypeId: "rogueUnchained:sylvan-trickster",
    name: "Fey Tricks",
    level: 2,
    bucket: "subsystem",
    note: "substitutes a witch hex for a rogue talent — hexes aren't modeled for a rogue talent slot, talent-list substitution",
  },
  "rogueUnchained:sylvan-trickster:resist-nature-s-lure:4": {
    archetypeId: "rogueUnchained:sylvan-trickster",
    name: "Resist Nature's Lure",
    level: 4,
    bucket: "situational",
    note: "a +4 save bonus scoped to fey creatures' spells/SLAs specifically — scoped to a property of the effect's SOURCE (a creature type), an axis SAVE_CATEGORIES doesn't carry (same declined shape class-feature-effects.ts documents for this exact ability)",
  },
  "rogueUnchained:sylvan-trickster:wild-empathy:1": {
    archetypeId: "rogueUnchained:sylvan-trickster",
    name: "Wild Empathy",
    level: 1,
    bucket: "subsystem",
    note: "the druid's wild empathy social-check mechanic for influencing animals — not modeled generally",
  },

  // ── Thug ───────────────────────────────────────────────────────────────
  "rogueUnchained:thug:brutal-beating:3": {
    archetypeId: "rogueUnchained:thug",
    name: "Brutal Beating",
    level: 3,
    bucket: "subsystem",
    note: "forgoes sneak attack dice for a sickened rider on a TARGET — not a bonus to self",
  },
  "rogueUnchained:thug:frightening:1": {
    archetypeId: "rogueUnchained:thug",
    name: "Frightening",
    level: 1,
    bucket: "subsystem",
    note: "extends a TARGET's shaken/frightened duration after a successful Intimidate — not a bonus to self",
  },

  // ── Tidal Trickster ────────────────────────────────────────────────────
  "rogueUnchained:tidal-trickster:liquid-disruption:4": {
    archetypeId: "rogueUnchained:tidal-trickster",
    name: "Liquid Disruption",
    level: 4,
    bucket: "subsystem",
    note: "removes precision-damage immunity for oozes/water creatures — a targeting-rule change, not a flat number",
  },
  "rogueUnchained:tidal-trickster:tidal-distortion:8": {
    archetypeId: "rogueUnchained:tidal-trickster",
    name: "Tidal Distortion",
    level: 8,
    bucket: "subsystem",
    note: "a complex full-attack-trading maneuver with a variable Bluff DC and attack-penalty interaction — action-scoped, not a flat bonus",
  },
  "rogueUnchained:tidal-trickster:wisdom-of-the-waves:1": {
    archetypeId: "rogueUnchained:tidal-trickster",
    name: "Wisdom of the Waves",
    level: 1,
    bucket: "numeric",
    note: "the swim speed (swimSpeed/base/set, the same idiom hunter.ts's Watery Stride establishes), the Swim skill bonus, and the Bluff bonus are all extracted. The 'already has a racial swim speed, +10 ft. instead' branch is dropped (an 'already has X, gets Y instead' rider the engine can't check, same posture as this file's own darkvision-rider precedent), and the Will-save-while-underwater bonus is an uncheckable environmental condition and is also dropped.",
  },

  // ── Toxic Talon ────────────────────────────────────────────────────────
  "rogueUnchained:toxic-talon:catalyst:4": {
    archetypeId: "rogueUnchained:toxic-talon",
    name: "Catalyst",
    level: 4,
    bucket: "subsystem",
    note: "boosts a POISON's own save DC, once/hour — targets the poison, not the toxic talon's own sheet",
  },
  "rogueUnchained:toxic-talon:poison-adept:3": {
    archetypeId: "rogueUnchained:toxic-talon",
    name: "Poison Adept",
    level: 3,
    bucket: "subsystem",
    note: "removes a self-poisoning risk + a move-action application permission — no flat number",
  },
  "rogueUnchained:toxic-talon:split-toxin:8": {
    archetypeId: "rogueUnchained:toxic-talon",
    name: "Split Toxin",
    level: 8,
    bucket: "subsystem",
    note: "poison-application logistics (envenom two weapons at once) — no PC-facing number",
  },
  "rogueUnchained:toxic-talon:weapon-and-armor-proficiency:1": {
    archetypeId: "rogueUnchained:toxic-talon",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap, no Change-shaped target",
  },

  // ── Trapsmith ──────────────────────────────────────────────────────────
  "rogueUnchained:trapsmith:careful-disarm:4": {
    archetypeId: "rogueUnchained:trapsmith",
    name: "Careful Disarm",
    level: 4,
    bucket: "subsystem",
    note: "trap-triggering-avoidance mechanic referencing the unmodeled trap-sense bonus — no Change-shaped number",
  },
  "rogueUnchained:trapsmith:trap-master:8": {
    archetypeId: "rogueUnchained:trapsmith",
    name: "Trap Master",
    level: 8,
    bucket: "subsystem",
    note: "lets a disarmed trap be bypassed and its allow-list modified — no flat number",
  },

  // ── Underground Chemist ────────────────────────────────────────────────
  "rogueUnchained:underground-chemist:chemical-weapons:2": {
    archetypeId: "rogueUnchained:underground-chemist",
    name: "Chemical Weapons",
    level: 2,
    bucket: "numeric",
    note: "the Craft (alchemy) bonus is unconditional and uses the established crf.alchemy convention — extracted. The Int-mod-to-splash-weapon-damage bonus is dropped: 'splash weapons' names no WEAPON_GROUPS category.",
  },
  "rogueUnchained:underground-chemist:discovery:10": {
    archetypeId: "rogueUnchained:underground-chemist",
    name: "Discovery",
    level: 10,
    bucket: "subsystem",
    note: "substitutes an alchemist discovery for a rogue talent — talent-list substitution",
  },
  "rogueUnchained:underground-chemist:precise-splash-weapons:4": {
    archetypeId: "rogueUnchained:underground-chemist",
    name: "Precise Splash Weapons",
    level: 4,
    bucket: "subsystem",
    note: "lets splash weapons deal sneak attack damage under specific action conditions — action-scoped, not a flat number",
  },

  // ── Vexing Dodger ──────────────────────────────────────────────────────
  "rogueUnchained:vexing-dodger:distracting-climber:8": {
    archetypeId: "rogueUnchained:vexing-dodger",
    name: "Distracting Climber",
    level: 8,
    bucket: "situational",
    note: "a combat-maneuver-check bonus scoped to a dirty trick attempt while climbing a creature specifically — not general cmb",
  },
  "rogueUnchained:vexing-dodger:improved-dirty-trick:2": {
    archetypeId: "rogueUnchained:vexing-dodger",
    name: "Improved Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a bonus feat",
  },
  "rogueUnchained:vexing-dodger:limb-climber:1": {
    archetypeId: "rogueUnchained:vexing-dodger",
    name: "Limb-Climber",
    level: 1,
    bucket: "subsystem",
    note: "imposes an attack-roll penalty on the climbed CREATURE — an effect on the target, not a bonus to the vexing dodger's own sheet",
  },
  "rogueUnchained:vexing-dodger:underfoot-agility:3": {
    archetypeId: "rogueUnchained:vexing-dodger",
    name: "Underfoot Agility",
    level: 3,
    bucket: "situational",
    note: "Acrobatics/Climb/Escape Artist bonus scoped to acting against larger-than-self creatures specifically — not general skill use",
  },
  "rogueUnchained:vexing-dodger:underfoot-trickster:4": {
    archetypeId: "rogueUnchained:vexing-dodger",
    name: "Underfoot Trickster",
    level: 4,
    bucket: "subsystem",
    note: "a movement permission (move through a larger creature's space) + a conditional maneuver-instead-of-sneak-damage option — no flat number",
  },

  // ── Waylayer ───────────────────────────────────────────────────────────
  "rogueUnchained:waylayer:ambuscading-sneak-attack:4": {
    archetypeId: "rogueUnchained:waylayer",
    name: "Ambuscading Sneak Attack",
    level: 4,
    bucket: "subsystem",
    note: "upsizes sneak attack die TYPE during a surprise round — no engine target for sneak attack die size",
  },
  "rogueUnchained:waylayer:danger-awareness:8": {
    archetypeId: "rogueUnchained:waylayer",
    name: "Danger Awareness",
    level: 8,
    bucket: "subsystem",
    note: "an absolute 'never unaware, always acts in the surprise round' state — not a modifier shape",
  },
  "rogueUnchained:waylayer:exceptional-reflexes:12": {
    archetypeId: "rogueUnchained:waylayer",
    name: "Exceptional Reflexes",
    level: 12,
    bucket: "subsystem",
    note: "a movement permission during the surprise round — no flat number",
  },
  "rogueUnchained:waylayer:masterful-reflexes:20": {
    archetypeId: "rogueUnchained:waylayer",
    name: "Masterful Reflexes",
    level: 20,
    bucket: "subsystem",
    note: "forces initiative to an automatic natural 20 — an absolute roll-replacement effect, not a modifier a Change can express (same posture as Kensai's auto-20-initiative in magus.ts)",
  },
  "rogueUnchained:waylayer:staggering-reflexes:1": {
    archetypeId: "rogueUnchained:waylayer",
    name: "Staggering Reflexes",
    level: 1,
    bucket: "situational",
    note: "the initiative bonus only applies if she acts in the surprise round — a per-combat condition the static sheet can't check; the never-flat-footed-at-start clause is an absolute state, not a number",
  },
};

/**
 * ── ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────
 *
 * Machine-extracted mechanical effects for Rogue (Unchained) archetype class
 * features (the prose→Change extraction pipeline, rogueUnchained slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table, which has no
 * `rogueUnchained:*` entries at all today) — every entry here additionally
 * carries `confidence`/`provenance` so a reviewer (or the UI) can never
 * confuse "a human read the rulebook and checked this" with "an extraction
 * pass inferred this from prose." Only 30 of Rogue (Unchained)'s 251 features
 * cleared the `numeric` bar (see
 * `ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — this kit leans heavily on rogue-talent substitutions,
 * activated/resource-gated abilities, and skill/save bonuses scoped to a
 * narrow use-case, all of which stay below the "unconditional, always-on"
 * bar this pipeline uses.
 */
export const ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Acrobat's "Expert Acrobat" (Advanced Class Guide) grants a flat
  // competence bonus to Acrobatics/Fly while wearing no armor at all
  // (@armor.type == 0, not "light or no armor" — the text's own ACP clause
  // names light armor separately from the "not wearing armor" bonus clause).
  "rogueUnchained:acrobat:expert-acrobat:1": {
    changes: [
      c("if(eq(@armor.type, 0), 2, 0)", "skill.acr", "competence"),
      c("if(eq(@armor.type, 0), 2, 0)", "skill.fly", "competence"),
    ],
    detail: () => "+2 competence Acrobatics/Fly (unarmored only; ACP suppression not modeled)",
    confidence: "medium",
    provenance:
      "When she is not wearing armor, she gains a +2 competency bonus on Acrobatics and Fly " +
      "skill checks.",
  },

  // Bekyar Kidnapper's "Abductor" (Change.maneuverCategories — mirrors the
  // chained rogue's identically-worded feature in ./rogue.ts).
  "rogueUnchained:bekyar-kidnapper:abductor:3": {
    changes: [
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "cmb",
        type: "untyped",
        maneuverCategories: ["grapple"],
      },
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["grapple"],
      },
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} CMB/CMD vs. grapple`,
    confidence: "high",
    provenance:
      "At 3rd level, a Bekyar kidnapper gains a +1 bonus on combat maneuver checks to grapple " +
      "a foe. In addition, the Bekyar kidnapper treats her combat maneuver bonus as 1 higher " +
      "when a foe tries to grapple her or when a grappled target attempts to break free of her " +
      "grapple. These bonuses increase by 1 for every 3 levels beyond 3rd. This ability " +
      "replaces trap sense.",
  },

  // Dark Lurker's "Instinctual Sense" (replacing the 20th-level rogue talent)
  // is a clean, unconditional blindsight grant — sensebs is a real applied
  // sense target, highest-wins resolution.
  "rogueUnchained:dark-lurker:instinctual-sense:20": {
    changes: [c("30", "sensebs")],
    detail: () => "Blindsight 30 ft.",
    confidence: "high",
    provenance: "At 20th level, a dark lurker gains blindsight with a range of 30 feet.",
  },

  // Discretion Specialist's "Fast Talker" is a single, fully general
  // half-level (min 1) bonus across three social skills — no scoping at all.
  "rogueUnchained:discretion-specialist:fast-talker:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.dip"),
      c("max(1, floor(@class.unlevel / 2))", "skill.int"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Bluff/Diplomacy/Intimidate`,
    confidence: "high",
    provenance:
      "A discretion specialist adds half her rogue level (minimum +1) as a bonus on Bluff, " +
      "Diplomacy, and Intimidate checks.",
  },

  // Escapologist's "Elusive" is a clean, unconditional whole-skill bonus on
  // two skills, replacing trapfinding (whose own skill.dev change is
  // suppressed by the swap — see class note 3).
  "rogueUnchained:escapologist:elusive:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.dev"),
      c("max(1, floor(@class.unlevel / 2))", "skill.esc"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device/Escape Artist`,
    confidence: "high",
    provenance:
      "An escapologist adds 1/2 her rogue level (minimum +1) as a bonus on all Disable Device " +
      "and Escape Artist checks.",
  },

  // Fey Prankster's "Mischievous Talent" is a fully general half-level
  // (min 1) bonus across four skills; the untrained-Sleight-of-Hand
  // permission is a separate, non-numeric rider.
  "rogueUnchained:fey-prankster:mischievous-talent:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.dis"),
      c("max(1, floor(@class.unlevel / 2))", "skill.slt"),
      c("max(1, floor(@class.unlevel / 2))", "skill.ste"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Bluff/Disguise/Sleight of Hand/Stealth`,
    confidence: "high",
    provenance:
      "A fey prankster adds half her class level (minimum 1) on Bluff, Disguise, Sleight of " +
      "Hand, and Stealth skill checks, and can attempt Sleight of Hand checks untrained.",
  },

  // Filcher's "Rummage" is a clean, unconditional scaling Appraise bonus.
  "rogueUnchained:filcher:rummage:3": {
    changes: [c("floor(@class.unlevel / 3)", "skill.apr")],
    detail: (level) => `+${Math.floor(level / 3)} Appraise`,
    confidence: "high",
    provenance:
      "She gains a +1 bonus on Appraise checks and an additional +1 bonus every three levels " +
      "thereafter.",
  },

  // Kintargo Rebel's "Sophisticated Stealth" names three skills, but only
  // the Knowledge (nobility) clause is unconditional — the Bluff/Sense
  // Motive clause is explicitly scoped to conveying/discerning secret
  // messages.
  "rogueUnchained:kintargo-rebel:sophisticated-stealth:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 3)", "skill.kno")],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} Knowledge (nobility)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a Kintargo rebel gains a +1 bonus on Knowledge (nobility) checks. In " +
      "addition, she gains a +1 bonus on Bluff checks to convey a secret message and on Sense " +
      "Motive checks to discern secret messages. These bonuses increase by 1 every 3 rogue " +
      "levels thereafter.",
  },

  // Kitsune Trickster's "Kitsune's Guile" is a clean, unconditional
  // Int-modifier bonus across four skills.
  "rogueUnchained:kitsune-trickster:kitsune-s-guile:1": {
    changes: [
      c("@abilities.int.mod", "skill.blf"),
      c("@abilities.int.mod", "skill.dip"),
      c("@abilities.int.mod", "skill.dis"),
      c("@abilities.int.mod", "skill.sen"),
    ],
    detail: () => "+Int modifier to Bluff/Diplomacy/Disguise/Sense Motive",
    confidence: "high",
    provenance:
      "She adds her Intelligence modifier on Bluff, Diplomacy, Disguise, and Sense Motive checks.",
  },

  // Master of Disguise's "Consummate Actor" names two skills, but only the
  // Disguise clause is unconditional — the Bluff clause is scoped to staying
  // in character while disguised.
  "rogueUnchained:master-of-disguise:consummate-actor:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dis")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disguise`,
    confidence: "medium",
    provenance:
      "A master of disguise adds half her rogue level (minimum 1) on all Disguise checks and " +
      "on Bluff checks to stay in character while using Disguise.",
  },

  // Needler's "Adroit Poisoner" states a base, unconditional Sleight of Hand
  // bonus that rises further ONLY when drawing a poisoned hidden weapon —
  // the base clause is extracted, the poison-specific rider is dropped.
  "rogueUnchained:needler:adroit-poisoner:2": {
    changes: [c("if(gte(@class.unlevel, 8), 4, 2)", "skill.slt")],
    detail: (level) => `+${level >= 8 ? 4 : 2} Sleight of Hand`,
    confidence: "medium",
    provenance:
      "At 2nd level, a needler gains a +2 bonus on Sleight of Hand checks. This bonus increases " +
      "to +4 when the needler uses Sleight of Hand to draw a hidden weapon that is coated in " +
      "poison. At 8th level, these bonuses increase to +4 and +6, respectively.",
  },

  // Okeno Liberator's "Bond Breaker" names an Escape Artist bonus (clean,
  // unconditional) plus a removal of an improvised-tool DD penalty this
  // engine never modeled in the first place — nothing to add for the latter.
  "rogueUnchained:okeno-liberator:bond-breaker:1": {
    changes: [c("floor(@class.unlevel / 2)", "skill.esc")],
    detail: (level) => `+${Math.floor(level / 2)} Escape Artist`,
    confidence: "high",
    provenance:
      "An Okeno liberator adds 1/2 her class level to Escape Artist checks, and never takes a " +
      "penalty on Disable Device checks when using improvised tools to open locks.",
  },

  // Pirate's "Unflinching" names fear AND mind-affecting effects — "mind" in
  // SAVE_CATEGORIES already covers fear as a child category (save-categories.ts),
  // so a single saveCategories: ["mind"] entry reproduces both halves of the
  // prose without a redundant "fear" line.
  "rogueUnchained:pirate:unflinching:3": {
    changes: [
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind"],
      },
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} saves vs. fear/mind-affecting`,
    confidence: "high",
    provenance:
      "At 3rd level, a pirate gains a +1 bonus on saving throws against fear and mind-affecting " +
      "effects. This bonus increases by +1 for every three levels, to a maximum of +6 at 18th " +
      "level.",
  },

  // Planar Sneak's "Planar Sense" names eight descriptors; only the four
  // alignment ones have a SAVE_CATEGORIES entry, so only those four are
  // carried — the air/earth/fire/water half stays in the note.
  "rogueUnchained:planar-sneak:planar-sense:3": {
    changes: [
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["chaotic", "evil", "good", "lawful"],
      },
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 3)} saves vs. chaotic/evil/good/lawful (air/earth/fire/water half not modeled)`,
    confidence: "high",
    provenance:
      "At 3rd level, a planar sneak gains a +1 bonus on saving throws against all effects with " +
      "the air, chaos, earth, evil, fire, good, law, or water descriptors. This bonus increases " +
      "by 1 for every 3 rogue levels thereafter (to a maximum of +6 at 18th level).",
  },

  // Rake's "Rake's Smile" is a clean, unconditional scaling morale bonus on
  // two skills.
  "rogueUnchained:rake:rake-s-smile:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.blf", "morale"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.dip", "morale"),
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} morale Bluff/Diplomacy`,
    confidence: "high",
    provenance:
      "At 3rd level, a rake gains a +1 morale bonus on Bluff and Diplomacy checks. This bonus " +
      "increases by +1 for every 3 levels beyond 3rd.",
  },

  // Relic Raider's "Curse Sense" names curses AND haunts. Only "curse" is a
  // SAVE_CATEGORIES entry; the haunt-scoped Perception/Spellcraft bonuses and
  // the haunt-only AC bonus have no matching axis on either SAVE_CATEGORIES
  // or AC_CATEGORIES and are dropped.
  "rogueUnchained:relic-raider:curse-sense:4": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 6), 2 + floor((@class.unlevel - 6) / 3), 1)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["curse"],
      },
    ],
    detail: (level) =>
      `+${level >= 6 ? 2 + Math.floor((level - 6) / 3) : 1} saves vs. curses (haunt bonuses not modeled)`,
    confidence: "medium",
    provenance:
      "At 4th level, a relic raider adds 1/2 her rogue level on Perception checks to notice " +
      "haunts and on Spellcraft checks to identify cursed items (using detect magic or similar " +
      "effects). In addition, the relic raider gains a +1 bonus on saving throws against curses " +
      "and haunts and a +1 dodge bonus to AC against attacks by haunts. These bonuses increase " +
      "by 1 at 6th level and every 3 rogue levels thereafter (to a maximum of +6 at 18th level).",
  },

  // River Rat's "Rat's Resilience" names disease AND poison, both real
  // SAVE_CATEGORIES entries — a clean mapping.
  "rogueUnchained:river-rat:rat-s-resilience:3": {
    changes: [
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["disease", "poison"],
      },
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} saves vs. disease/poison`,
    confidence: "high",
    provenance:
      "At 3rd level, a river rat gains a +1 bonus on saving throws against disease and poison " +
      "effects. This bonus increases by 1 every 3 levels thereafter, to a maximum bonus of +6 " +
      "at 18th level.",
  },

  // River Rat's "Swamper" gates its whole ability list on wearing light or no
  // armor AND carrying no more than a light load — only the armor half is
  // checkable (@armor.type<=1); the load half is dropped.
  "rogueUnchained:river-rat:swamper:1": {
    changes: [c("if(lte(@armor.type, 1), max(1, floor(@class.unlevel / 2)), 0)", "skill.swm")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Swim (light/no armor; load not checked)`,
    confidence: "medium",
    provenance:
      "At 1st level, a river rat gains a bonus equal to half her rogue level on Swim checks " +
      "(minimum +1). A river rat ignores difficult terrain caused by light undergrowth and " +
      "shallow bogs, and it costs her only 2 squares of movement to enter a square of deep bog " +
      "or heavy undergrowth, rather than 4 squares of movement. She takes no penalty on " +
      "Acrobatics or Stealth checks for being in bogs and undergrowth. All of these abilities " +
      "apply only when she is wearing light or no armor and carrying no more than a light load.",
  },

  // Rotdrinker's "Poison Resistance" is a clean SAVE_CATEGORIES mapping.
  "rogueUnchained:rotdrinker:poison-resistance:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 4, 2)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["poison"],
      },
    ],
    detail: (level) => `+${level >= 8 ? 4 : 2} saves vs. poison`,
    confidence: "high",
    provenance:
      "At 2nd level, a rotdrinker gains a +2 bonus on saving throws against all poisons. This " +
      "bonus increases to +4 at 8th level.",
  },

  // Sanctified Rogue's "Divine Purpose" is a clean, flat, unconditional
  // sacred bonus on two saves.
  "rogueUnchained:sanctified-rogue:divine-purpose:4": {
    changes: [c("1", "fort", "sacred"), c("1", "will", "sacred")],
    detail: () => "+1 sacred Fortitude/Will",
    confidence: "high",
    provenance: "She gains a +1 sacred bonus on Fortitude and Will saving throws.",
  },

  // Sczarni Swindler's "No Fool" is a clean, unconditional scaling Will bonus.
  "rogueUnchained:sczarni-swindler:no-fool:4": {
    changes: [c("min(5, 1 + floor((@class.unlevel - 4) / 4))", "will")],
    detail: (level) => `+${Math.min(5, 1 + Math.floor((level - 4) / 4))} Will`,
    confidence: "high",
    provenance:
      "At 4th level, the Sczarni swindler gains a +1 bonus on Will saving throws. This bonus " +
      "increases by 1 for every 4 levels beyond 4th (to a maximum of +5 at 20th level).",
  },

  // Sczarni Swindler's "Poker Face" names three skills plus a feint
  // permission; Profession (gambler) is a fixed, non-player-chosen instance
  // (same posture as the sibling rogue:sczarni-swindler:poker-face:3 entry,
  // which already wires skill.pro.gambler for the byte-identical feature).
  "rogueUnchained:sczarni-swindler:poker-face:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.blf"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.pro.gambler"),
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.sen"),
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 3)} Bluff/Profession (gambler)/Sense Motive`,
    confidence: "high",
    provenance:
      "At 3rd level, the Sczarni swindler gains a +1 bonus on Bluff, Profession (gambler), and " +
      "Sense Motive checks. This bonus increases by 1 for every 3 levels beyond 3rd.",
  },

  // Shadow Scion's "Shadow Dweller" grants a flat, level-scaling darkvision.
  // The text's OWN grant (30 ft.) and its "already has darkvision" rider
  // (+10 ft.) differ from the per-tier increment (also +10 ft., but on a
  // different trigger) — per senses.ts's documented grant/rider-mismatch
  // rule, this is extracted as a flat highest-wins progression with the
  // initial rider dropped, not an `operator: "add"` Change.
  "rogueUnchained:shadow-scion:shadow-dweller:1": {
    changes: [c("30 + 10 * floor((@class.unlevel - 1) / 2)", "sensedv")],
    detail: (level) => `Darkvision ${30 + 10 * Math.floor((level - 1) / 2)} ft.`,
    confidence: "medium",
    provenance:
      "A shadow scion gains darkvision with a range of 30 feet and a +1 competence bonus on " +
      "Stealth checks in dim light and darkness. If she already has darkvision, the range of " +
      "her darkvision increases by 10 feet. At 3rd level, and every 2 levels thereafter, the " +
      "range of her darkvision increases by 10 feet and her bonus on Stealth checks increases " +
      "by 1.",
  },

  // Sharper's "Lucky Save" is a clean, unconditional scaling luck bonus on
  // all saving throws.
  "rogueUnchained:sharper:lucky-save:3": {
    changes: [
      c(
        "if(gte(@class.unlevel, 15), 3, if(gte(@class.unlevel, 9), 2, 1))",
        "allSavingThrows",
        "luck",
      ),
    ],
    detail: (level) => `+${level >= 15 ? 3 : level >= 9 ? 2 : 1} luck saves`,
    confidence: "high",
    provenance:
      "At 3rd level, when a sharper's wits aren't enough to pull her out of a bad situation, " +
      "her luck still just might save her. She gains a +1 luck bonus on all saving throws. This " +
      "bonus increases to +2 at 9th level and to +3 at 15th level.",
  },

  // Sharper's "Scam Artist" is a clean, unconditional half-level (min 1)
  // bonus on two skills.
  "rogueUnchained:sharper:scam-artist:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.slt"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Bluff/Sleight of Hand`,
    confidence: "high",
    provenance:
      "A sharper gains a bonus equal to half her rogue level (minimum +1) on all Bluff and " +
      "Sleight of Hand checks.",
  },

  // Shadow Walker's "Expanded Sight" is the same grant/rider-mismatch shape
  // as Shadow Scion's Shadow Dweller above.
  "rogueUnchained:shadow-walker:expanded-sight:1": {
    changes: [c("30 + 10 * floor((@class.unlevel - 1) / 2)", "sensedv")],
    detail: (level) => `Darkvision ${30 + 10 * Math.floor((level - 1) / 2)} ft.`,
    confidence: "medium",
    provenance:
      "At 1st level, a shadow walker gains darkvision with a range of 30 feet. If she already " +
      "has darkvision, the range of her darkvision increases by 10 feet. When the shadow " +
      "walker reaches 3rd level, and every 2 rogue levels thereafter, the range of her " +
      "darkvision increases by 10 feet.",
  },

  // Smuggler's "Conceal Item" states a base, unconditional Sleight of Hand
  // bonus before describing its (non-numeric) application.
  "rogueUnchained:smuggler:conceal-item:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.slt")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Sleight of Hand`,
    confidence: "high",
    provenance: "A smuggler adds 1/2 her level on Sleight of Hand checks (minimum +1).",
  },

  // Snare Setter's "Trapsmithing" Craft (traps) clause is unconditional
  // across that subskill (same posture as Craft (alchemy) elsewhere in this
  // pipeline); the Perception-to-detect-traps portion is scoped and the
  // Craft-in-place-of-Disable-Device substitution has no engine hook, so
  // both are dropped. Byte-identical text to the sibling
  // rogue:snare-setter:trapsmithing:1 entry, which reaches the same ruling.
  "rogueUnchained:snare-setter:trapsmithing:1": {
    changes: [c("floor(@class.unlevel / 2)", "skill.crf.traps")],
    detail: (level) =>
      `+${Math.floor(level / 2)} Craft (traps) (Perception-vs-traps half not modeled)`,
    confidence: "medium",
    provenance:
      "A snare setter gains a bonus on Perception skill checks to detect traps and on Craft " +
      "(traps) checks equal to 1/2 his snare setter level.",
  },

  // Swamp Poisoner's "Mucous Membrane" names an Escape Artist bonus (clean)
  // plus a CMD bonus scoped to resisting grapples specifically — the latter
  // is dropped (a scoped-to-one-maneuver number, not general CMD).
  "rogueUnchained:swamp-poisoner:mucous-membrane:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.esc")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Escape Artist (grapple-CMD bonus not modeled)`,
    confidence: "medium",
    provenance:
      "A swamp poisoner gains a bonus equal to half his class level on Escape Artist checks and " +
      "to his CMD when resisting grapple attempts (minimum 1).",
  },

  // Swashbuckler's "Daring" names Acrobatics AND saves vs. fear in the same
  // clause, same morale bonus, same cadence — both are extracted.
  "rogueUnchained:swashbuckler:daring:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 3)", "skill.acr", "morale"),
      {
        formula: "1 + floor((@class.unlevel - 3) / 3)",
        target: "allSavingThrows",
        type: "morale",
        saveCategories: ["fear"],
      },
    ],
    detail: (level) => `+${1 + Math.floor((level - 3) / 3)} morale Acrobatics/saves vs. fear`,
    confidence: "high",
    provenance:
      "At 3rd level, a swashbuckler gains a +1 morale bonus on Acrobatics checks and saving " +
      "throws against fear. This bonus increases by +1 for every 3 levels beyond 3rd.",
  },

  // Sylvan Trickster's "Fey Resistance" is a clean, unconditional scaling DR.
  "rogueUnchained:sylvan-trickster:fey-resistance:8": {
    changes: [c("2 + 2 * floor(max(0, @class.unlevel - 8) / 3)", "dr.cold-iron")],
    detail: (level) => `DR ${2 + 2 * Math.floor(Math.max(0, level - 8) / 3)}/cold iron`,
    confidence: "high",
    provenance:
      "At 8th level, a sylvan trickster gains DR 2/cold iron. At 11th level and every 3 levels " +
      "thereafter, this damage reduction increases by 2 (to a maximum of DR 10/cold iron at " +
      "20th level).",
  },

  // Tidal Trickster's "Wisdom of the Waves" names four things: a swim-SPEED
  // grant (no formula input to express "equal to base land speed"), a Swim
  // skill bonus (unconditional), a Bluff bonus (unconditional), and a
  // Will-save bonus scoped to being underwater (uncheckable). Only the two
  // unconditional skill bonuses are extracted.
  "rogueUnchained:tidal-trickster:wisdom-of-the-waves:1": {
    changes: [
      {
        formula: "@attributes.speed.land.total",
        target: "swimSpeed",
        type: "base",
        operator: "set",
      },
      c("4 + floor(@class.unlevel / 2)", "skill.swm", "racial"),
      c("floor(@class.unlevel / 2)", "skill.blf"),
    ],
    detail: (level) =>
      `swim speed = base land speed, +${4 + Math.floor(level / 2)} racial Swim, ` +
      `+${Math.floor(level / 2)} Bluff (underwater Will bonus not modeled)`,
    confidence: "medium",
    provenance:
      "A tidal trickster gains a swim speed equal to her unmodified base land speed (or " +
      "increases her swim speed by 10 feet, if she has a racial swim speed). Instead of the +8 " +
      "bonus granted by a swim speed, she gains a racial bonus on Swim checks equal to 4 + half " +
      "her rogue level (if she has a racial swim speed, she uses the better bonus). She gains a " +
      "bonus on Bluff checks equal to half her rogue level.",
  },

  // Underground Chemist's "Chemical Weapons" names a Craft (alchemy) bonus
  // (unconditional, using the established crf.alchemy convention) and an
  // Int-mod-to-splash-damage bonus with no matching weapon-group target.
  "rogueUnchained:underground-chemist:chemical-weapons:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.crf.alchemy")],
    detail: (level) =>
      `+${Math.floor(level / 2)} Craft (alchemy) (splash-weapon damage bonus not modeled)`,
    confidence: "medium",
    provenance: "She adds 1/2 her level to Craft (alchemy) checks.",
  },
};
