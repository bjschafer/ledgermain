/**
 * Occultist's slice of the pipeline (2026-08-08). Every vendored archetype
 * feature for the class (20 occultist archetypes, 100 features) was read in
 * full and bucketed as `numeric` / `situational` / `subsystem` / `blocked`.
 * Per the per-class file convention (`index.ts`'s doc comment), this file
 * owns BOTH of occultist's pipeline artifacts —
 * `OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on
 * a different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Occultist-specific mechanical facts this pass relies on ──────────────
 *
 * 1. **Implements + Mental Focus** are a modeled LIVE subsystem
 *    (`occultist-implements.ts`, driven by `build.occultistImplements` —
 *    which schools are known — and `live.occultistFocusInvested` — how much
 *    of the day's focus currently sits in each). The Mental Focus POOL SIZE
 *    itself rides a real vendored `uses.maxFormula`
 *    (`"@class.unlevel + @abilities.int.mod"` on the occultist's own linked
 *    "Mental Focus" class feature, confirmed against `class-features.json`)
 *    already applied generically via `deriveResourcePools`/`resources.ts`.
 *    Any archetype feature that changes the pool's SIZE, its stat basis
 *    (Int → something else), or its formula/cadence is `blocked` (would
 *    double-count or conflict with the vendored formula) — same posture as
 *    the magus pilot's Arcane Pool cases. A feature that only changes which
 *    implement schools are available, how many are known, or what a school's
 *    focus can be spent on is `subsystem` — a pick-list/spend-option change,
 *    no baseline number to model.
 * 2. **Focus Powers and Resonant Powers** are entirely pick-list/subsystem
 *    territory in this pass, full stop — including the FOUR resonant powers
 *    (`allSavingThrows`, `skill.per`, Cha-skill `competence`, one physical
 *    ability `enhancement`) that `occultist-implements.ts`/`collect.ts` DO
 *    apply as real sheet `Change`s for the base class. That application is
 *    hardcoded directly against `live.occultistFocusInvested` inside
 *    `collect.ts` (a computed JS function, `computeBonus`), NOT routed
 *    through the formula/`Change` pipeline this extraction table feeds —
 *    `rollData` (the object `evaluateFormula` evaluates archetype-extracted
 *    formulas against) carries no `@live.occultistFocusInvested.*` path at
 *    all. So an archetype feature that reflavors, extends, restricts, or
 *    scales a resonant/focus power (a new "terrain focus" pool, an extra
 *    focus-power pick, an effective-level bump feeding into
 *    `computeBonus`) has no mechanism this table can hook — `subsystem` (or
 *    `blocked` when the text states an otherwise-unconditional number with
 *    literally no applicable target, e.g. a level-effective-value bump into
 *    a hardcoded calculation).
 * 3. **Magic-item-analysis features** — Object Reading, Magic Item Skill,
 *    Aura Sight, Outside Contact, magic circles and their many archetype
 *    reflavors/restrictions — are narrative/situational: `Magic Item Skill`
 *    is the sole one of these with a real vendored `Change`
 *    (`floor(@class.unlevel / 2)` untyped to `skill.umd`, confirmed in
 *    `class-features.json`) and no archetype feature here changes its
 *    formula, only its SCOPE (e.g. "only on checks with weapons, armor, and
 *    shields") — a restriction of an existing effect this engine can't
 *    express (there's no per-item-type breakdown of UMD), so those stay
 *    classification-only rather than risk under- or over-applying.
 * 4. **Two vendored copy-paste errors** surfaced in this pass (documented
 *    per-entry below rather than guessed at):
 *    - The entire `occultist:naturalist` archetype (8 features) is,
 *      verbatim, Summoner's own "Naturalist" archetype — every feature
 *      references an eidolon, a summoner level, or replaces a summoner base
 *      feature (Shield Ally, Greater Shield Ally, Life Bond, Aspect,
 *      Greater Aspect) that doesn't exist anywhere on the occultist class.
 *      Confirmed against `class-features.json`: `Shield Ally`,
 *      `Greater Shield Ally`, `Life Bond`, `Aspect`, and `Greater Aspect`
 *      all exist as class features, but not on occultist. All 8 are
 *      `blocked`.
 *    - `occultist:occult-historian:trap-sense:3`'s description is, verbatim,
 *      the base occultist class's own "Focus Powers" feature text (confirmed
 *      identical against `class-features.json`'s "Focus Powers" entry) —
 *      nothing about trap sense at all. `blocked`.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in
 * `OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED`'s `provenance`. Only 2 of
 * occultist's 100 features cleared the `numeric` bar — occultist's kit is
 * built almost entirely from the implement/mental-focus/focus-power
 * subsystem (deferred wholesale per note 2 above) plus a large volume of
 * standalone spell-like/resource-gated abilities (summon effects, ranged
 * touch attacks, information-gathering rituals) that don't take the shape of
 * a stacking bonus to an existing stat at all.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── occultist:ancestral-aspirant ──
  "occultist:ancestral-aspirant:courtly-contacts:8": {
    archetypeId: "occultist:ancestral-aspirant",
    name: "Courtly Contacts",
    level: 8,
    bucket: "subsystem",
    note: "reflavor of outside contact (info-gathering ritual, later a settlement-wide reputation-damage effect) — narrative ability, no bonus-shaped number",
  },
  "occultist:ancestral-aspirant:emotional-reading:2": {
    archetypeId: "occultist:ancestral-aspirant",
    name: "Emotional Reading",
    level: 2,
    bucket: "subsystem",
    note: "GM-adjudicated information-gathering ability (learn a fact about a creature's emotions) — no number at all",
  },
  "occultist:ancestral-aspirant:family-jewels:1": {
    archetypeId: "occultist:ancestral-aspirant",
    name: "Family Jewels",
    level: 1,
    bucket: "subsystem",
    note: "forces one starting implement to be from the enchantment school — a pick-list constraint, no Change",
  },

  // ── occultist:battle-host ──
  "occultist:battle-host:battle-reading:2": {
    archetypeId: "occultist:battle-host",
    name: "Battle Reading",
    level: 2,
    bucket: "subsystem",
    note: "restricts Object Reading to weapons/armor/shields — Object Reading carries zero vendored changes (magic-item-analysis, narrative), so this is a scope restriction on an already-unmodeled ability",
  },
  "occultist:battle-host:battle-skill:2": {
    archetypeId: "occultist:battle-host",
    name: "Battle Skill",
    level: 2,
    bucket: "subsystem",
    note: "restricts Magic Item Skill's vendored +floor(level/2) UMD bonus (class-features.json) to checks with weapons/armor/shields only — a SCOPE restriction on an existing effect, not an addition; this engine has no per-item-type breakdown of skill.umd to express 'only for these item types', and the archetype feature isn't paired to strike the base bonus, so nothing safe to add or remove here",
  },
  "occultist:battle-host:bonus-feat:4": {
    archetypeId: "occultist:battle-host",
    name: "Bonus Feat",
    level: 4,
    bucket: "numeric",
    note: "flat bonus-feat count on a 4-level cadence (4th/8th/12th/16th, capped at 4 total); replaces shift focus, magic circles, binding circles, and fast circles (paired to shift focus), all confirmed changes:[] in class-features.json — no double-count risk. The restriction to combat feats isn't modeled, only the count, same posture as the hand-verified/magus-pilot bonus-feat entries",
  },
  "occultist:battle-host:heroic-splendor:6": {
    archetypeId: "occultist:battle-host",
    name: "Heroic Splendor",
    level: 6,
    bucket: "situational",
    note: "real +4 insight bonus to a player-chosen physical ability score, but a swift-action, once-per-day (plus more at higher levels), 1-minute-duration activated buff — a resource-gated/duration-scoped state this engine can't model as an always-on Change; replaces outside contact",
  },
  "occultist:battle-host:panoply-bond:1": {
    archetypeId: "occultist:battle-host",
    name: "Panoply Bond",
    level: 1,
    bucket: "subsystem",
    note: "replaces the implement/mental-focus/spellcasting/implement-mastery subsystem wholesale with a single bonded item that gains schools over time — implement-subsystem alteration (class note 1/2), no flat number",
  },
  "occultist:battle-host:spirit-warrior:5": {
    archetypeId: "occultist:battle-host",
    name: "Spirit Warrior",
    level: 5,
    bucket: "subsystem",
    note: "spell-like-ability grant (functions as spiritual ally), limited uses per day — standalone summon effect, not a stat bonus; replaces aura sight",
  },
  "occultist:battle-host:weapon-and-armor-proficiency:1": {
    archetypeId: "occultist:battle-host",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "expanded proficiency grant (martial weapons, all armor including tower shields) — proficiency, no Change",
  },

  // ── occultist:construct-collector ──
  "occultist:construct-collector:constructed-focus:3": {
    archetypeId: "occultist:construct-collector",
    name: "Constructed Focus",
    level: 3,
    bucket: "subsystem",
    note: "a homebrewed 'active component' resource for storing generic focus outside the body — resource mechanic, class note 2 territory, no flat number",
  },
  "occultist:construct-collector:repower-construct:8": {
    archetypeId: "occultist:construct-collector",
    name: "Repower Construct",
    level: 8,
    bucket: "subsystem",
    note: "activated ability that restores hit points to and temporarily controls a destroyed construct — an ally/summon-shaped effect, not the character's own stat, resource-gated",
  },

  // ── occultist:curator ──
  "occultist:curator:adaptable-powers:3": {
    archetypeId: "occultist:curator",
    name: "Adaptable Powers",
    level: 3,
    bucket: "subsystem",
    note: "focus-power selection-list change tied to the curator's relic collection — pick-list, class note 2, no Change",
  },
  "occultist:curator:complex-collection:8": {
    archetypeId: "occultist:curator",
    name: "Complex Collection",
    level: 8,
    bucket: "subsystem",
    note: "lets the curator empower two relics at once, splitting the same focus pool between them — resource-allocation mechanic, no flat number",
  },
  "occultist:curator:extensive-collection:1": {
    archetypeId: "occultist:curator",
    name: "Extensive Collection",
    level: 1,
    bucket: "subsystem",
    note: "replaces the implement subsystem with a relic collection (activated, one-relic-at-a-time access to two/more schools) — implement-subsystem alteration, class note 1, no flat number",
  },
  "occultist:curator:mental-catalog:8": {
    archetypeId: "occultist:curator",
    name: "Mental Catalog",
    level: 8,
    bucket: "blocked",
    note: "'the points of mental focus invested in the curator's relic collection increase by 2' (+1 more at 12th/16th) — a direct focus-POOL-SIZE increase on top of the curator's own already-altered relic-collection pool (see split-focus below); extracting it risks double-counting whatever baseline that pool resolves to, same trap as a vendored uses.maxFormula resize",
  },
  "occultist:curator:relic-resistance:4": {
    archetypeId: "occultist:curator",
    name: "Relic Resistance",
    level: 4,
    bucket: "situational",
    note: "real +4 Will bonus, but scoped narrowly to 'resolve personality conflicts with intelligent magic items' — a specific-scenario condition the engine can't check; the rest of the feature (no negative levels from item alignment, easier cursed-item identification, a suppress-curse save) is magic-item-analysis narrative with no bonus shape at all",
  },
  "occultist:curator:split-focus:1": {
    archetypeId: "occultist:curator",
    name: "Split Focus",
    level: 1,
    bucket: "blocked",
    note: "restates the mental focus pool as 'equal to only his occultist level' — dropping the vendored formula's Int-modifier term entirely (vendored: @class.unlevel + @abilities.int.mod, class-features.json) — a genuine formula divergence; backfilling it would conflict with the vendored Mental Focus uses.maxFormula",
  },

  // ── occultist:esoteric-initiate ──
  "occultist:esoteric-initiate:implements-of-the-palatine-eye:1": {
    archetypeId: "occultist:esoteric-initiate",
    name: "Implements of the Palatine Eye",
    level: 1,
    bucket: "blocked",
    note: "'when the initiate benefits from his implements' resonant powers, he treats his occultist level as 1 higher for the purpose of determining the powers' benefits only' — an otherwise-unconditional +1 effective level, but resonant-power bonuses are computed by a hardcoded JS function directly off the real occultist level (collect.ts/occultist-implements.ts), not through the formula/Change pipeline this table feeds, so there is no target to attach '+1 effective level' to (class note 2); the rest (implement-material restrictions, losing the ability to bank generic focus) is subsystem",
  },
  "occultist:esoteric-initiate:symbolism:5": {
    archetypeId: "occultist:esoteric-initiate",
    name: "Symbolism",
    level: 5,
    bucket: "subsystem",
    note: "spell-like-ability grant (comprehend languages) plus a Linguistics-check bonus scoped to deciphering a hidden message found via this specific ability — narrow, non-general skill use, and the SLA itself has no stat-bonus shape",
  },

  // ── occultist:extemporaneous-channeler ──
  "occultist:extemporaneous-channeler:fleeting-focus:1": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Fleeting Focus",
    level: 1,
    bucket: "blocked",
    note: "restates generic focus as 'her occultist level + twice her Intelligence modifier' — doubling the vendored formula's Int-modifier term (vendored: @class.unlevel + @abilities.int.mod) — a genuine formula divergence; backfilling would conflict with the vendored Mental Focus uses.maxFormula",
  },
  "occultist:extemporaneous-channeler:improvisational-combatant:1": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Improvisational Combatant",
    level: 1,
    bucket: "subsystem",
    note: "removes improvised-weapon penalties and grants feat-equivalent prerequisite credit — this engine doesn't model an improvised-weapon nonproficiency penalty at all, so there's nothing to offset with a Change",
  },
  "occultist:extemporaneous-channeler:improvised-spell:8": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Improvised Spell",
    level: 8,
    bucket: "subsystem",
    note: "limited-use ability to cast a spell from a known implement school as a spell known, expending a slot — resource/action mechanic, no flat number",
  },
  "occultist:extemporaneous-channeler:transformative-resonance:1": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Transformative Resonance",
    level: 1,
    bucket: "situational",
    note: "real, scaling enhancement bonus (+1 at 1st, +1 every 4 levels to +5 at 17th) to attack/damage, but scoped to whatever item is currently being used as an improvised weapon for a 1-minute activated duration — same posture as Jistkan Artificer's Empowered Arm (magus pilot): no stable weapon-group target for a freely-rechosen makeshift weapon",
  },
  "occultist:extemporaneous-channeler:weapon-and-armor-proficiency:1": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base occultist proficiency list verbatim — no Change",
  },
  "occultist:extemporaneous-channeler:withdraw-focus:4": {
    archetypeId: "occultist:extemporaneous-channeler",
    name: "Withdraw Focus",
    level: 4,
    bucket: "subsystem",
    note: "lets focus be shifted from implements back to the body as a standard action — resource-management mechanic, no flat number",
  },

  // ── occultist:geomancer ──
  "occultist:geomancer:dominion:7": {
    archetypeId: "occultist:geomancer",
    name: "Dominion",
    level: 7,
    bucket: "situational",
    note: "real +1 morale bonus (per point of mental focus expended, capped at 1/4 occultist level) to attack/damage/Fortitude for self and nearby allies, but a standard-action, resource-spend, 1-minute-duration activated buff — this engine has no `@terrain focus` input and the effect isn't always-on",
  },
  "occultist:geomancer:geomancy:1": {
    archetypeId: "occultist:geomancer",
    name: "Geomancy",
    level: 1,
    bucket: "subsystem",
    note: "swaps one implement school for a terrain-dependent spells-known list that changes as the geomancer moves between terrain types — spell-list mechanic, no Change-shaped number",
  },
  "occultist:geomancer:geomantic-focus:1": {
    archetypeId: "occultist:geomancer",
    name: "Geomantic Focus",
    level: 1,
    bucket: "subsystem",
    note: "redirects invested mental focus into 'the surrounding terrain' instead of an implement object, unlocking the geomancer's own terrain-focus-power family — implement-subsystem alteration (class note 1/2), no flat number itself",
  },
  "occultist:geomancer:survivalist:2": {
    archetypeId: "occultist:geomancer",
    name: "Survivalist",
    level: 2,
    bucket: "situational",
    note: "real +1-per-point Survival bonus (capped at occultist level) scaled by mental focus invested in the terrain — a resonant-power-shaped bonus (class note 2) with no `@terrain focus` input this table's formulas can read",
  },
  "occultist:geomancer:terrain-stride:5": {
    archetypeId: "occultist:geomancer",
    name: "Terrain Stride",
    level: 5,
    bucket: "situational",
    note: "real +10 ft. / +20 ft. bonus to all movement speeds, but a swift-action, resource-spend (1 or 2 points of terrain-invested focus) activated effect with no stated duration — resource-gated, not always-on",
  },
  "occultist:geomancer:wall-of-terrain:13": {
    archetypeId: "occultist:geomancer",
    name: "Wall of Terrain",
    level: 13,
    bucket: "subsystem",
    note: "activated ability that creates a wall of stone (an object, not a character stat) by expending terrain-invested focus — standalone spell effect",
  },

  // ── occultist:haunt-collector ──
  "occultist:haunt-collector:extricate-haunt:8": {
    archetypeId: "occultist:haunt-collector",
    name: "Extricate Haunt",
    level: 8,
    bucket: "subsystem",
    note: "creates a standalone spell-trap creature (its own HP/initiative/AC), limited uses per day — not a character stat, resource-gated",
  },
  "occultist:haunt-collector:hauntist:5": {
    archetypeId: "occultist:haunt-collector",
    name: "Hauntist",
    level: 5,
    bucket: "subsystem",
    note: "grants the medium's haunt channeler class feature at a derived effective level — cross-class subsystem grant, no engine modeling for medium haunt channeling exists to hook into",
  },
  "occultist:haunt-collector:possessed-possessions:2": {
    archetypeId: "occultist:haunt-collector",
    name: "Possessed Possessions",
    level: 2,
    bucket: "subsystem",
    note: "swaps an implement's resonant power for a medium spirit's séance boon plus an activated spirit-bonus effect — resonant-power/pick-list alteration, class note 2",
  },
  "occultist:haunt-collector:spirit-speaker:8": {
    archetypeId: "occultist:haunt-collector",
    name: "Spirit Speaker",
    level: 8,
    bucket: "subsystem",
    note: "limited-use speak-with-dead-style information ritual — narrative ability, no bonus-shaped number",
  },

  // ── occultist:naturalist (vendoring error: this whole archetype is Summoner's own "Naturalist" archetype) ──
  "occultist:naturalist:animal-focus:4": {
    archetypeId: "occultist:naturalist",
    name: "Animal Focus",
    level: 4,
    bucket: "blocked",
    note: "vendored description is Summoner's Naturalist archetype verbatim ('enhance his eidolon', 'his summoner level', replaces Shield Ally/Greater Shield Ally) — none of these exist on the occultist class (class note 4); recorded as a data error, no number guessed",
  },
  "occultist:naturalist:natural-focus:1": {
    archetypeId: "occultist:naturalist",
    name: "Natural Focus",
    level: 1,
    bucket: "blocked",
    note: "same Summoner Naturalist copy-paste error as the archetype's other features (class note 4); the ability's own text is internally plausible in isolation (spend generic focus to add a die to a roll) but the archetype it's attributed to isn't a real occultist archetype, so its cadence/interactions with the rest of the (also-mismatched) archetype can't be trusted",
  },
  "occultist:naturalist:nature-s-call:1": {
    archetypeId: "occultist:naturalist",
    name: "Nature's Call",
    level: 1,
    bucket: "blocked",
    note: "vendored description is Summoner's Naturalist archetype verbatim (replaces 'summon monster I', a summoner spell-like ability occultist doesn't have) — data error, class note 4",
  },
  "occultist:naturalist:reflect-on-the-land:12": {
    archetypeId: "occultist:naturalist",
    name: "Reflect on the Land",
    level: 12,
    bucket: "blocked",
    note: "part of the same mismatched Summoner Naturalist archetype (class note 4); even though this single feature's text doesn't itself reference an eidolon, its archetype attribution is unreliable",
  },
  "occultist:naturalist:second-animal-focus:10": {
    archetypeId: "occultist:naturalist",
    name: "Second Animal Focus",
    level: 10,
    bucket: "blocked",
    note: "vendored description is Summoner's Naturalist archetype verbatim ('whenever a naturalist uses animal focus', replaces 'the aspect summoner class ability') — data error, class note 4",
  },
  "occultist:naturalist:shared-focus:10": {
    archetypeId: "occultist:naturalist",
    name: "Shared Focus",
    level: 10,
    bucket: "blocked",
    note: "vendored description is Summoner's Naturalist archetype verbatim ('the naturalist begins to take on some of the feral nature of his eidolon', replaces Life Bond) — data error, class note 4",
  },
  "occultist:naturalist:third-animal-focus:18": {
    archetypeId: "occultist:naturalist",
    name: "Third Animal Focus",
    level: 18,
    bucket: "blocked",
    note: "vendored description is Summoner's Naturalist archetype verbatim (replaces Greater Aspect) — data error, class note 4",
  },
  "occultist:naturalist:tree-talker:8": {
    archetypeId: "occultist:naturalist",
    name: "Tree Talker",
    level: 8,
    bucket: "blocked",
    note: "part of the same mismatched Summoner Naturalist archetype (class note 4); grants a spell-like ability with no bonus-shaped number regardless",
  },

  // ── occultist:necroccultist ──
  "occultist:necroccultist:deadspeaker:2": {
    archetypeId: "occultist:necroccultist",
    name: "Deadspeaker",
    level: 2,
    bucket: "subsystem",
    note: "limited-use blood-biography-style information ritual, replaces object reading — narrative ability, no number",
  },
  "occultist:necroccultist:ghostly-horde:5": {
    archetypeId: "occultist:necroccultist",
    name: "Ghostly Horde",
    level: 5,
    bucket: "subsystem",
    note: "standalone AoE damage effect against enemies (1d6/2 levels), limited uses per day, replaces aura sight — not a bonus to the character's own stats",
  },
  "occultist:necroccultist:life-drain:8": {
    archetypeId: "occultist:necroccultist",
    name: "Life Drain",
    level: 8,
    bucket: "subsystem",
    note: "standalone ranged-touch attack (negative levels + self-healing), limited uses per day, replaces outside contact — an attack effect, not a stat modifier",
  },
  "occultist:necroccultist:necromantic-bond:1": {
    archetypeId: "occultist:necroccultist",
    name: "Necromantic Bond",
    level: 1,
    bucket: "blocked",
    note: "restricts implements to necromancy (subsystem, no number) but ALSO states an unconditional 'at 14th level, the DCs of saving throws to resist a necroccultist's necromancy spells and necromancy focus powers increase by 2' — no spell-DC target exists anywhere in this engine (targets.ts), so the promised number has nothing to attach to",
  },

  // ── occultist:occult-historian ──
  "occultist:occult-historian:crumbling-strike:12": {
    archetypeId: "occultist:occult-historian",
    name: "Crumbling Strike",
    level: 12,
    bucket: "subsystem",
    note: "standalone once-per-day (plus more at 16th/20th) melee attack dealing its own dice-scaled damage total on a hit — a self-contained special attack, not a modifier stacked onto normal damage, same posture as Kensai's Perfect Strike in the magus pilot",
  },
  "occultist:occult-historian:ruin-reading:2": {
    archetypeId: "occultist:occult-historian",
    name: "Ruin Reading",
    level: 2,
    bucket: "subsystem",
    note: "Knowledge (history)-check-gated information-gathering ritual — narrative ability, no bonus-shaped number",
  },
  "occultist:occult-historian:trap-sense:3": {
    archetypeId: "occultist:occult-historian",
    name: "Trap Sense",
    level: 3,
    bucket: "blocked",
    note: "vendored description is verbatim the base occultist class's own 'Focus Powers' feature text (confirmed identical against class-features.json) — nothing about trap sense at all; a copy-paste error, no number guessed",
  },

  // ── occultist:panoply-savant ──
  "occultist:panoply-savant:combined-powers:16": {
    archetypeId: "occultist:panoply-savant",
    name: "Combined Powers",
    level: 16,
    bucket: "subsystem",
    note: "lets a second focus power be used alongside the first for extra focus cost — focus-power-interaction mechanic (class note 2), no flat number",
  },
  "occultist:panoply-savant:implement-specialist:8": {
    archetypeId: "occultist:panoply-savant",
    name: "Implement Specialist",
    level: 8,
    bucket: "subsystem",
    note: "lets magic items matching the chosen panoply use the savant's own caster level, or restores charges/daily uses to them — magic-item-analysis/resource ability, no bonus-shaped stat",
  },
  "occultist:panoply-savant:panoply-focus:4": {
    archetypeId: "occultist:panoply-savant",
    name: "Panoply Focus",
    level: 4,
    bucket: "blocked",
    note: "'gains 1 additional point of mental focus each day...increases by 1...to a maximum of 5 points at 20th level' — a direct focus-POOL-SIZE increase; extracting it would double-count against the vendored Mental Focus uses.maxFormula, same trap as a pool-size resize elsewhere",
  },
  "occultist:panoply-savant:panoply-specialization:1": {
    archetypeId: "occultist:panoply-savant",
    name: "Panoply Specialization",
    level: 1,
    bucket: "subsystem",
    note: "restricts which implement schools can be learned to those in the chosen panoply — pick-list constraint, no Change",
  },
  "occultist:panoply-savant:panoptic-call:12": {
    archetypeId: "occultist:panoply-savant",
    name: "Panoptic Call",
    level: 12,
    bucket: "subsystem",
    note: "telekinesis-style item-summoning ability with its own bespoke disarm/steal check (occultist level as BAB, Int as Str) — a standalone maneuver, not an application to the sheet's actual cmb, resource-gated",
  },
  "occultist:panoply-savant:panoptic-harmony:8": {
    archetypeId: "occultist:panoply-savant",
    name: "Panoptic Harmony",
    level: 8,
    bucket: "situational",
    note: "real +2 caster-level bonus, but conditioned on having used a focus power or cast a spell with a DIFFERENT panoply implement on the previous turn — a specific-action condition the engine can't check, and there is no 'cl' engine target regardless (targets.ts unapplied list), same posture as the magus pilot's Deep Marshal Miner's Focus",
  },

  // ── occultist:planar-harmonizer ──
  "occultist:planar-harmonizer:conductor:1": {
    archetypeId: "occultist:planar-harmonizer",
    name: "Conductor",
    level: 1,
    bucket: "blocked",
    note: "restricts implements to conjuration and adds spells to the list (subsystem, no number) but ALSO states 'at 14th level, the DCs of saving throws to resist a planar harmonizer's conjuration spells and conjuration focus powers increase by 2' unconditionally — no spell-DC target exists anywhere in this engine (targets.ts), same gap as necromantic-bond above",
  },
  "occultist:planar-harmonizer:harmonic-shield:4": {
    archetypeId: "occultist:planar-harmonizer",
    name: "Harmonic Shield",
    level: 4,
    bucket: "subsystem",
    note: "removes ability-check penalties for being on a plane whose alignment traits clash with the harmonizer's own (this engine has no plane-alignment-clash concept to check), plus an activated planar-adaptation spell-like ability — no bonus-shaped number",
  },
  "occultist:planar-harmonizer:outside-messenger:5": {
    archetypeId: "occultist:planar-harmonizer",
    name: "Outside Messenger",
    level: 5,
    bucket: "subsystem",
    note: "grants the magic circles class feature (itself changes:[] in class-features.json) plus an outside-contact-style binding variant — narrative summon/info ability, no number",
  },
  "occultist:planar-harmonizer:planar-scholar:2": {
    archetypeId: "occultist:planar-harmonizer",
    name: "Planar Scholar",
    level: 2,
    bucket: "numeric",
    note: "flat, unconditional Knowledge (planes) bonus equal to half occultist level (skill.kpl, tables.ts) — a single clearly-worded sentence, no scope restriction",
  },

  // ── occultist:psychodermist ──
  "occultist:psychodermist:discern-death:2": {
    archetypeId: "occultist:psychodermist",
    name: "Discern Death",
    level: 2,
    bucket: "subsystem",
    note: "limited-use blood-biography-style information ritual on a corpse — narrative ability, no number",
  },
  "occultist:psychodermist:manifest-abilities:12": {
    archetypeId: "occultist:psychodermist",
    name: "Manifest Abilities",
    level: 12,
    bucket: "subsystem",
    note: "activated ability that copies a slain creature's special abilities or spell-like abilities from a trophy — standalone ability grant, not a stat modifier, resource-gated",
  },
  "occultist:psychodermist:monster-hunting-lore:2": {
    archetypeId: "occultist:psychodermist",
    name: "Monster Hunting Lore",
    level: 2,
    bucket: "situational",
    note: "real +1/2-level bonus, but scoped to two specific check purposes ('skill checks made to craft trophies' and 'Knowledge checks made to identify the abilities and weaknesses of creatures') rather than general skill use — not a blanket skill bonus a formula can express",
  },
  "occultist:psychodermist:residual-hatred:8": {
    archetypeId: "occultist:psychodermist",
    name: "Residual Hatred",
    level: 8,
    bucket: "situational",
    note: "real, scaling favored-enemy-style bonus scoped to a specific creature variety chosen per trophy — same posture this engine already documents for ranger favored-enemy bonuses (occultist-implements.ts's own doc comment: never folded into the always-on derived sheet)",
  },
  "occultist:psychodermist:seek-prey:5": {
    archetypeId: "occultist:psychodermist",
    name: "Seek Prey",
    level: 5,
    bucket: "subsystem",
    note: "activated detection ability (as aura sight, scoped to a chosen creature type) — no bonus-shaped number",
  },
  "occultist:psychodermist:trophies:1": {
    archetypeId: "occultist:psychodermist",
    name: "Trophies",
    level: 1,
    bucket: "subsystem",
    note: "grants a specific named feat (Harvest Parts) plus a monster-part-implement mechanic — a named-feat grant isn't a 'bonusFeats' count (same distinction the magus pilot draws for Kapenia Dancer's Weapon Focus grant)",
  },

  // ── occultist:reliquarian ──
  "occultist:reliquarian:diminished-focus-power:1": {
    archetypeId: "occultist:reliquarian",
    name: "Diminished Focus Power",
    level: 1,
    bucket: "subsystem",
    note: "reduces starting focus-power count from two to one — focus-power pick-list change (class note 2), no Change",
  },
  "occultist:reliquarian:divine-focus:1": {
    archetypeId: "occultist:reliquarian",
    name: "Divine Focus",
    level: 1,
    bucket: "subsystem",
    note: "swaps the mental focus pool's stat basis from Intelligence to Wisdom — the same Int-to-X stat-basis swap the magus pilot's Eldritch Scion Eldritch Pool leaves unmodeled: resource-pool sizing is a vendored uses.maxFormula, not a Change target, so nothing to extract; a known resource-formula gap, not a double-count risk",
  },
  "occultist:reliquarian:domain:1": {
    archetypeId: "occultist:reliquarian",
    name: "Domain",
    level: 1,
    bucket: "subsystem",
    note: "grants a cleric domain and its powers at the occultist's level — cleric-domain mechanics aren't modeled for occultist, deferred",
  },
  "occultist:reliquarian:faithful:1": {
    archetypeId: "occultist:reliquarian",
    name: "Faithful",
    level: 1,
    bucket: "subsystem",
    note: "alignment restriction plus a deity's-favored-weapon proficiency grant — no Change",
  },
  "occultist:reliquarian:orisons:1": {
    archetypeId: "occultist:reliquarian",
    name: "Orisons",
    level: 1,
    bucket: "subsystem",
    note: "grants an extra 0-level spell known per implement school selected — spell-list mechanic, no Change-shaped number",
  },
  "occultist:reliquarian:sacred-implements:1": {
    archetypeId: "occultist:reliquarian",
    name: "Sacred Implements",
    level: 1,
    bucket: "subsystem",
    note: "alters implements to a single deity-relic item tied to domain access — implement-subsystem alteration, no flat number",
  },
  "occultist:reliquarian:spells:1": {
    archetypeId: "occultist:reliquarian",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "changes spellcasting to divine (verbal/somatic components, a divine focus) instead of psychic — no Change-shaped number",
  },

  // ── occultist:secret-broker ──
  "occultist:secret-broker:broker-secrets:2": {
    archetypeId: "occultist:secret-broker",
    name: "Broker Secrets",
    level: 2,
    bucket: "subsystem",
    note: "narrative memory-transfer/destruction ability tied to object-reading-derived secrets — no number",
  },
  "occultist:secret-broker:erase-secret:12": {
    archetypeId: "occultist:secret-broker",
    name: "Erase Secret",
    level: 12,
    bucket: "subsystem",
    note: "activated modify-memory-style ability, resource-gated — no bonus-shaped number",
  },
  "occultist:secret-broker:knowledge-is-power:1": {
    archetypeId: "occultist:secret-broker",
    name: "Knowledge Is Power",
    level: 1,
    bucket: "subsystem",
    note: "alters implement-acquisition schedule and extends the divination resonant power's Perception bonus onto Profession/Sense Motive/Knowledge checks — a resonant-power reflavor (class note 2), and even the base bonus it extends is computed by the hardcoded `computeBonus` function, not a formula this table can hook",
  },
  "occultist:secret-broker:purge-secret:16": {
    archetypeId: "occultist:secret-broker",
    name: "Purge Secret",
    level: 16,
    bucket: "subsystem",
    note: "activated AoE version of Erase Secret — resource-gated, no bonus-shaped number",
  },
  "occultist:secret-broker:share-memory:4": {
    archetypeId: "occultist:secret-broker",
    name: "Share Memory",
    level: 4,
    bucket: "subsystem",
    note: "at-will use of an existing narrative ability — no number",
  },
  "occultist:secret-broker:steal-secret:8": {
    archetypeId: "occultist:secret-broker",
    name: "Steal Secret",
    level: 8,
    bucket: "subsystem",
    note: "extends share memory to unwilling targets — narrative ability, no number",
  },

  // ── occultist:sha-ir ──
  "occultist:sha-ir:augment-jin:2": {
    archetypeId: "occultist:sha-ir",
    name: "Augment Jin",
    level: 2,
    bucket: "subsystem",
    note: "improves the jin companion's own saves/HP/statistics — companion-only stats, not the character's own numbers (explicitly subsystem per the extraction bar's familiar/companion carve-out)",
  },
  "occultist:sha-ir:jin-spy:8": {
    archetypeId: "occultist:sha-ir",
    name: "Jin Spy",
    level: 8,
    bucket: "subsystem",
    note: "alters outside contact to use jin companions for tasks instead of true names — companion-mediated ability, no number",
  },
  "occultist:sha-ir:jin:1": {
    archetypeId: "occultist:sha-ir",
    name: "Jin",
    level: 1,
    bucket: "subsystem",
    note: "grants elemental jin companions as living implements plus elemental spell-list additions — companion/implement-subsystem grant, no flat number",
  },
  "occultist:sha-ir:manifest-jin:7": {
    archetypeId: "occultist:sha-ir",
    name: "Manifest Jin",
    level: 7,
    bucket: "subsystem",
    note: "permanently upgrades one jin's statistics — companion-only stat, replaces aura sight",
  },

  // ── occultist:silksworn ──
  "occultist:silksworn:cantrips:1": {
    archetypeId: "occultist:silksworn",
    name: "Cantrips",
    level: 1,
    bucket: "subsystem",
    note: "grants an extra 0-level spell known per implement school selected — spell-list mechanic, no Change",
  },
  "occultist:silksworn:devoted-mystic:1": {
    archetypeId: "occultist:silksworn",
    name: "Devoted Mystic",
    level: 1,
    bucket: "subsystem",
    note: "grants more implement schools on an accelerated schedule and later increases spells-per-day counts — pick-list/spell-slot-count changes, no Change target for either (spell slot counts aren't Change-shaped, per magus pilot precedent)",
  },
  "occultist:silksworn:implement-mastery:20": {
    archetypeId: "occultist:silksworn",
    name: "Implement Mastery",
    level: 20,
    bucket: "blocked",
    note: "extends the base Implement Mastery class feature's own restricted-use focus-point bonus ('4 additional points of mental focus') to a second school simultaneously — a focus-POOL-SIZE increase (doubling an already-unmodeled per-school bonus) with no Change target to express a school-restricted focus allotment; risks double-counting if the underlying base bonus is ever modeled",
  },
  "occultist:silksworn:implements:1": {
    archetypeId: "occultist:silksworn",
    name: "Implements",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Implements feature (unaltered cadence: 2 at 1st, +1 at 2nd/6th/10th/14th/18th) with an added magic-item-slot requirement per school — implement-subsystem restriction, no flat number",
  },
  "occultist:silksworn:mental-focus:1": {
    archetypeId: "occultist:silksworn",
    name: "Mental Focus",
    level: 1,
    bucket: "blocked",
    note: "restates mental focus as 'his occultist level + his Intelligence modifier + his Charisma modifier' — adding a Charisma-modifier term the vendored formula (@class.unlevel + @abilities.int.mod, class-features.json) doesn't have; a genuine formula divergence, would conflict with the vendored Mental Focus uses.maxFormula if backfilled",
  },
  "occultist:silksworn:silksworn-arcana:16": {
    archetypeId: "occultist:silksworn",
    name: "Silksworn Arcana",
    level: 16,
    bucket: "blocked",
    note: "'the spell's saving throw DC increases by 2' while wearing the matching magic clothing item — an otherwise-unconditional number (the clothing requirement is already implicit in casting at all), but no spell-DC target exists anywhere in this engine (targets.ts), same gap as necromantic-bond/conductor above",
  },
  "occultist:silksworn:silksworn-deception:12": {
    archetypeId: "occultist:silksworn",
    name: "Silksworn Deception",
    level: 12,
    bucket: "subsystem",
    note: "grants an opposed Bluff-vs-Sense-Motive check option to hide spellcasting — no bonus number, just a new check opportunity",
  },
  "occultist:silksworn:silksworn-eloquence:8": {
    archetypeId: "occultist:silksworn",
    name: "Silksworn Eloquence",
    level: 8,
    bucket: "situational",
    note: "real +1-per-item Bluff/Diplomacy bonus, but scaled by how many implement-school magic-item slots are currently occupied by clothing — no formula input exists to count equipped-gear-by-slot at evaluation time",
  },
  "occultist:silksworn:spells:1": {
    archetypeId: "occultist:silksworn",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "changes spellcasting to arcane (verbal/somatic components) instead of psychic — no Change-shaped number",
  },

  // ── occultist:talisman-crafter ──
  "occultist:talisman-crafter:shared-talisman:4": {
    archetypeId: "occultist:talisman-crafter",
    name: "Shared Talisman",
    level: 4,
    bucket: "subsystem",
    note: "creates a talisman any creature can trigger — item/spell-delivery mechanic, no number",
  },
  "occultist:talisman-crafter:spellbound-tailsman:2": {
    archetypeId: "occultist:talisman-crafter",
    name: "Spellbound Tailsman",
    level: 2,
    bucket: "subsystem",
    note: "thrown/touch spell-delivery mechanism for prepared talismans — action/delivery mechanic, no bonus-shaped number",
  },
  "occultist:talisman-crafter:talismanic-implements:1": {
    archetypeId: "occultist:talisman-crafter",
    name: "Talismanic Implements",
    level: 1,
    bucket: "subsystem",
    note: "replaces normal implements with daily-crafted master talismans (unaltered schedule) — implement-subsystem alteration, no flat number",
  },
  "occultist:talisman-crafter:warding-seal:5": {
    archetypeId: "occultist:talisman-crafter",
    name: "Warding Seal",
    level: 5,
    bucket: "subsystem",
    note: "glyph-of-warding-style trap mechanism for prepared spells — resource/action mechanic, no number",
  },

  // ── occultist:tome-eater ──
  "occultist:tome-eater:bonded-tome:1": {
    archetypeId: "occultist:tome-eater",
    name: "Bonded Tome",
    level: 1,
    bucket: "subsystem",
    note: "replaces the implement/mental-focus/spellcasting/implement-mastery subsystem with a single bonded book that gains schools over time (same shape as Battle Host's Panoply Bond) plus an activated CL/DC-bump spend — implement-subsystem alteration, class note 1/2, no flat number",
  },
  "occultist:tome-eater:devour-books-and-scrolls:4": {
    archetypeId: "occultist:tome-eater",
    name: "Devour Books and Scrolls",
    level: 4,
    bucket: "subsystem",
    note: "resource-recovery and counterspell/spell-turning mechanic built around consuming books/scrolls — resource/action mechanic, no bonus-shaped number",
  },
  "occultist:tome-eater:word-sense:5": {
    archetypeId: "occultist:tome-eater",
    name: "Word Sense",
    level: 5,
    bucket: "subsystem",
    note: "continuous read magic plus a skim-a-text information ability, replaces aura sight — no number",
  },
};

/**
 * ── OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────
 *
 * Machine-extracted mechanical effects for occultist archetype class
 * features (the prose→Change extraction pipeline, occultist slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 2 of occultist's 100
 * features cleared the `numeric` bar (see
 * `OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — occultist's kit is overwhelmingly implement/
 * mental-focus/focus-power subsystem territory, all of which is deferred
 * (see this file's header doc comment), plus a large volume of standalone
 * spell-like/resource-gated abilities that aren't shaped like a stacking
 * bonus at all.
 *
 * Confidence rubric (identical to the magus pilot's):
 *  - "high": a single, clearly-worded, fully general (no scope restriction)
 *    scaling bonus, or a literal reflavor of an already-modeled mechanism.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or a real-but-partial condition is dropped and flagged.
 *  - "low": not used in this pass (a `low`-confidence read is bucketed
 *    `blocked` instead, per the wave brief).
 */
export const OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Battle Host's "Bonus Feat" (4th/8th/12th/16th, capped at 4 total) is
  // paired to Shift Focus, one of the four base features it replaces
  // (Shift Focus, Magic Circles, Binding Circles, Fast Circles) — all four
  // are confirmed changes:[] in class-features.json, so this is a safe
  // additive grant with nothing to double-count. The restriction to combat
  // feats isn't modeled, only the count (same posture as the magus pilot's
  // Iron-Ring Striker Bonus Feat entry).
  "occultist:battle-host:bonus-feat:4": {
    changes: [c("clamp(floor(@class.unlevel / 4), 0, 4)", "bonusFeats")],
    detail: (level) => `${Math.min(4, Math.floor(level / 4))} bonus feat(s) (combat feats only)`,
    confidence: "high",
    provenance:
      "At 4th, 8th, 12th, and 16th levels, a battle host gains a bonus feat in addition to " +
      "those gained from normal advancement.",
  },

  // Planar Harmonizer's "Planar Scholar" is a clean, unconditional, always-on
  // Knowledge (planes) bonus scaling with occultist level — no scope
  // restriction, no activated component. Knowledge (planes) is "kpl" per
  // tables.ts's SKILL_ABILITY table.
  "occultist:planar-harmonizer:planar-scholar:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.kpl")],
    detail: (level) => `+${Math.floor(level / 2)} Knowledge (planes)`,
    confidence: "high",
    provenance: "She gains a bonus on Knowledge (planes) checks equal to half her occultist level.",
  },
};
