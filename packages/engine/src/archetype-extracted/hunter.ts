/**
 * Hunter's slice of the pipeline (2026-08-08). Per the per-class file
 * convention (documented in `index.ts`), this file owns BOTH of hunter's
 * pipeline artifacts — `HUNTER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs one new
 * import + one new spread line.
 *
 * Every one of hunter's 21 vendored archetypes (100 features), individually
 * read against `packages/data-pipeline/data/archetype-features.json` and
 * bucketed `numeric` / `situational` / `subsystem` / `blocked` using the same
 * bar `archetype-effects.ts`'s own header documents.
 *
 * ── Hunter-specific mechanical facts this pass relies on ──────────────────
 *
 * 1. **Animal Companion** is a companion creature (a separate stat block the
 *    engine does not fold into the hunter's own `DerivedSheet`). Any feature
 *    that grants, restricts, or buffs the companion itself — including a
 *    "+X to the companion's Y" bonus — is `subsystem`/`situational`, never
 *    extracted onto the hunter's own sheet, per this wave's brief.
 * 2. **Animal Focus** (base L1 feature, `uses.maxFormula: "@class.unlevel"`
 *    per day, vendored `changes: []`) is a swift-action-activated, chosen-
 *    aspect buff with a minutes/day duration budget — every archetype
 *    reflavor that swaps in a different aspect list (aquatic, plant, vermin,
 *    deep-sea, Egyptian, feykiller-specific, ...) is `situational`: real
 *    per-aspect numbers exist, but they're gated on an activated, chosen,
 *    duration-limited state, same posture as an unmodeled buff.
 * 3. **Teamwork-feat grants** (the base Teamwork Feat class feature and
 *    every archetype variant of it — Feral Hunter's/Packmaster's own
 *    reflavors) are uniformly `subsystem` per this wave's brief, regardless
 *    of whether the count itself would otherwise read as a countable
 *    `bonusFeats` slot.
 * 4. **A fixed named-feat grant** (Precise Shot, Improved Unarmed Strike, a
 *    named choice between two specific feats) is `subsystem`, not a
 *    countable `bonusFeats` slot — see `archetype-extracted/cleric.ts`'s
 *    Undead Lord entry for the established split between a named-feat grant
 *    (dropped) and a real bonus-feat count from a broader restricted list
 *    (extracted, same posture as `iron-ring-striker:bonus-feat:5` in
 *    `magus.ts`).
 * 5. **Base hunter class features carrying a real vendored `changes`**
 *    (relevant to every replacement-suppression double-count check below):
 *    Precise Companion (`bonusFeats: 1`, a fixed Precise Shot grant to
 *    hunter and companion) and Teamwork Feat
 *    (`bonusFeats: floor(@class.unlevel / 3)`). Every other base hunter
 *    feature (Animal Companion, Animal Focus, Nature Training, Hunter
 *    Tactics, Track, Woodland Stride, Bonus Tricks, Second Animal Focus,
 *    Swift Tracker, Raise Animal Companion, Speak with Master, Greater
 *    Empathic Link, Improved Empathic Link, One with the Wild, Master
 *    Hunter) carries `changes: []` — confirmed individually against
 *    `class-features.json`.
 * 6. **One genuine composition trap** (issue #45's category): Urban
 *    Hunter's Captor claims to replace "hunter tactics and teamwork feat"
 *    but carries no `pairedBaseFeatureUuid` — the base Teamwork Feat's real
 *    `bonusFeats` formula never gets suppressed, so backfilling Captor's own
 *    restricted-list bonus-feat schedule would double it up. `blocked`
 *    rather than guessed at, same shape as `ranger.ts`'s Beast Master/
 *    Falconer partial-tier traps.
 * 7. **A verified engine interaction, not a vendored-data problem**:
 *    `compute.ts`'s `applySpeedTarget` takes ONLY the minimum among
 *    competing `"set"`-operator mods for a speed target, and drops any
 *    purely-additive mod for that SAME target entirely whenever even one
 *    `"set"` mod is present. Flood Flourisher's Watery Stride (5th level, a
 *    `"base"/"set"` grant, extracted below) and its own Fast Swimmer (18th
 *    level, a plain "+20 ft." additive grant) collide on this: Fast
 *    Swimmer's addition would be silently swallowed by the engine rather
 *    than adding on top, and re-expressing it as a second `"set"` value
 *    would lose too (set-vs-set resolves to the lower of the two). Fast
 *    Swimmer is `blocked` for exactly this reason — see its entry.
 * 8. **Divine Hunter is a vendored-data class-tag mismatch, not a real
 *    hunter archetype.** All 9 of its features describe PALADIN class
 *    features verbatim (aura of resolve/justice/courage, lay on hands,
 *    divine bond, a domain, smite-evil-fueled feat grants) with no hunter
 *    mechanic in sight. This is confirmed, not just suspected: Precise Shot
 *    "replaces her Heavy Armor Proficiency," but the hunter class's own
 *    `armorProf` list (`classes.json`) is light/medium/shield only — a
 *    hunter has no Heavy Armor Proficiency to replace, so this text cannot
 *    describe a hunter ability at all. Every Divine Hunter entry below is
 *    bucketed by its own content (situational/subsystem, per the ability it
 *    actually describes) with the mismatch noted; nothing is extracted from
 *    any of them regardless of bucket.
 *
 * Confidence rubric for the extracted table below is identical to magus's/
 * ranger's: "high" = a literal or near-literal reflavor of an already-
 * modeled mechanism, or a single, clearly-worded, fully general scaling
 * bonus. "medium" = the formula required dropping a textually-present
 * alternate branch this engine can't check (an "already has X, gets Y
 * instead" rider — same posture as `ranger.ts`'s Strong Senses/`
 * rogueUnchained.ts`'s darkvision-rider precedent) or an interpretive
 * reading of "no daily limit" as "now unconditional." "low" unused (bucketed
 * `blocked` instead per this wave's brief).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Shared note text for the many Animal-Focus-reflavoring archetype features (see class note 2). */
const ANIMAL_FOCUS_NOTE =
  "reflavor of Animal Focus with an alternate list of aspect choices — the base ability is a " +
  "swift-action-activated, duration-limited (minutes/day) buff, situational per the base " +
  "feature's own posture (class note 2), not a flat always-on number.";

/** Shared note text for features that only modify the animal companion (see class note 1). */
const COMPANION_SCOPED_NOTE =
  "companion-scoped ability — modifies the animal companion, not the hunter's own sheet; " +
  "companion-scoped numbers are never extracted onto the character sheet (class note 1).";

/** Shared note text for teamwork-feat grants/variants (see class note 3). */
const TEAMWORK_FEAT_NOTE =
  "teamwork-feat grant/variant — subsystem regardless of count, per this wave's brief (class note 3).";

/** Shared note text for a fixed named-feat (or short named-list) grant (see class note 4). */
const NAMED_FEAT_GRANT_NOTE =
  "grants a fixed named feat, not a countable bonusFeats slot (class note 4)";

/** Shared note text for Divine Hunter's vendored-data class-tag mismatch (see class note 8). */
const DIVINE_HUNTER_MISMATCH =
  "the vendored description is Paladin class-feature text (aura of resolve/justice/courage, " +
  "lay on hands, divine bond, a domain, smite-evil-fueled feat grants) under a hunter: id — a " +
  "vendored-data class-tag mismatch, confirmed by its own Precise Shot entry claiming to " +
  "replace Heavy Armor Proficiency, which the hunter class doesn't have (class note 8). No " +
  "hunter number extracted regardless of bucket.";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── hunter:aquatic-beastmaster ──
  "hunter:aquatic-beastmaster:animal-focus:1": {
    archetypeId: "hunter:aquatic-beastmaster",
    name: "Animal Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (aquatic-only aspect list)",
  },
  "hunter:aquatic-beastmaster:oceanic-defense:4": {
    archetypeId: "hunter:aquatic-beastmaster",
    name: "Oceanic Defense",
    level: 4,
    bucket: "situational",
    note:
      "real +4 save bonus, but scoped to a category (spells with the water descriptor; " +
      "extraordinary/supernatural abilities of aquatic/water-subtype creatures) this engine " +
      "doesn't model as a qualified save target, AND conditioned on the animal companion being " +
      "within 60 feet — a companion-proximity state the engine can't check.",
  },
  "hunter:aquatic-beastmaster:wild-empathy:1": {
    archetypeId: "hunter:aquatic-beastmaster",
    name: "Wild Empathy",
    level: 1,
    bucket: "subsystem",
    note:
      "restricts wild empathy's usable creature types (swim-speed/aquatic/water-subtype, plus " +
      "low-Int creatures of any type) — wild empathy is a Diplomacy-style check formula, not a " +
      "Change-shaped ability, so there's nothing to extract regardless of the restriction.",
  },

  // ── hunter:chameleon-adept ──
  "hunter:chameleon-adept:animal-shape:5": {
    archetypeId: "hunter:chameleon-adept",
    name: "Animal Shape",
    level: 5,
    bucket: "subsystem",
    note:
      "standard-action polymorph granting only forms of movement (no bonuses/attacks), " +
      "duration-limited (minutes/level/day) — activated ability, no flat number.",
  },
  "hunter:chameleon-adept:improved-shifting-companion:10": {
    archetypeId: "hunter:chameleon-adept",
    name: "Improved Shifting Companion",
    level: 10,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Grants the companion a limited wild shape.",
  },
  "hunter:chameleon-adept:one-with-the-wild:17": {
    archetypeId: "hunter:chameleon-adept",
    name: "One with the Wild",
    level: 17,
    bucket: "subsystem",
    note:
      "ties the companion's wild-shape state to the base One with the Wild ability (vendored " +
      "changes: [] — nothing to double-count against). " +
      COMPANION_SCOPED_NOTE,
  },
  "hunter:chameleon-adept:savage-diplomacy:2": {
    archetypeId: "hunter:chameleon-adept",
    name: "Savage Diplomacy",
    level: 2,
    bucket: "situational",
    note:
      "real, scaling circumstance bonus (+2 at 2nd, +1 every 4 levels to +6 at 17th) on " +
      "Diplomacy/Intimidate, but conditioned on being in humanoid form AND the target being " +
      "able to see both the hunter and her animal companion — a companion-visibility state the " +
      "engine can't check.",
  },
  "hunter:chameleon-adept:shifting-companion:3": {
    archetypeId: "hunter:chameleon-adept",
    name: "Shifting Companion",
    level: 3,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Polymorphs the companion into a humanoid form.",
  },
  "hunter:chameleon-adept:terrain-chameleon:1": {
    archetypeId: "hunter:chameleon-adept",
    name: "Terrain Chameleon",
    level: 1,
    bucket: "situational",
    note:
      "real Stealth bonus (half hunter level) but scoped to a chosen favored-terrain type — " +
      "same posture as ranger.ts's favored-terrain entries: the free-form favoredTerrains list " +
      "already lets a player encode this, and terrain state is GM-judged.",
  },

  // ── hunter:colluding-scoundrel ──
  "hunter:colluding-scoundrel:backstabber:8": {
    archetypeId: "hunter:colluding-scoundrel",
    name: "Backstabber",
    level: 8,
    bucket: "situational",
    note:
      "real precision damage (2d6, 3d6 at 15th), but scoped to a target threatened by an ally " +
      "currently designated as her scapegoat — a per-round, resource-and-ally-state condition.",
  },
  "hunter:colluding-scoundrel:master-backstabber:20": {
    archetypeId: "hunter:colluding-scoundrel",
    name: "Master Backstabber",
    level: 20,
    bucket: "subsystem",
    note:
      "standard-action save-or-die attack against a scapegoat-affected target — an attack " +
      "action with its own DC, not a passive modifier.",
  },
  "hunter:colluding-scoundrel:scapegoat:1": {
    archetypeId: "hunter:colluding-scoundrel",
    name: "Scapegoat",
    level: 1,
    bucket: "subsystem",
    note:
      "swift-action, per-day resource ability imposing a penalty on a chosen foe — no baseline " +
      "number for the hunter's own sheet.",
  },

  // ── hunter:courtly-hunter ──
  "hunter:courtly-hunter:alternate-form:7": {
    archetypeId: "hunter:courtly-hunter",
    name: "Alternate Form",
    level: 7,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Adds a polymorph form choice for the companion.",
  },
  "hunter:courtly-hunter:courtly-companion:1": {
    archetypeId: "hunter:courtly-hunter",
    name: "Courtly Companion",
    level: 1,
    bucket: "subsystem",
    note:
      COMPANION_SCOPED_NOTE + " Changes the companion's type and grants it an Intelligence score.",
  },
  "hunter:courtly-hunter:refined-focus:1": {
    archetypeId: "hunter:courtly-hunter",
    name: "Refined Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (courtly-hunter-specific aspect list)",
  },
  "hunter:courtly-hunter:second-refined-focus:8": {
    archetypeId: "hunter:courtly-hunter",
    name: "Second Refined Focus",
    level: 8,
    bucket: "situational",
    note:
      ANIMAL_FOCUS_NOTE +
      " (doubles the number of active aspects, mirrors the base Second Animal Focus)",
  },
  "hunter:courtly-hunter:skill-bond:3": {
    archetypeId: "hunter:courtly-hunter",
    name: "Skill Bond",
    level: 3,
    bucket: "subsystem",
    note:
      "lets the companion use the hunter's own ranks (capped at hunter level) in a player-" +
      "chosen skill, in place of its own ranks, whichever gives the higher total. " +
      COMPANION_SCOPED_NOTE +
      " Not wireable even as a companion Change: the companion skill route only honors the six " +
      "tracked companion skills (acr/clm/fly/per/ste/swm), which excludes most of what this " +
      "ability is meant to share (Diplomacy in the ability's own example), and 'ranks in place " +
      "of its own, whichever is higher' isn't a flat-additive Change shape regardless.",
  },
  "hunter:courtly-hunter:subtle-companion:2": {
    archetypeId: "hunter:courtly-hunter",
    name: "Subtle Companion",
    level: 2,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Polymorphs the companion into a Tiny animal.",
  },

  // ── hunter:divine-hunter (see class note 8 — vendored-data class-tag mismatch) ──
  "hunter:divine-hunter:aura-of-care:8": {
    archetypeId: "hunter:divine-hunter",
    name: "Aura of Care",
    level: 8,
    bucket: "subsystem",
    note:
      "removes a cover requirement between nearby allies — no flat number. " +
      DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:distant-mercy:6": {
    archetypeId: "hunter:divine-hunter",
    name: "Distant Mercy",
    level: 6,
    bucket: "subsystem",
    note: "spends lay on hands charges at range — a resource ability. " + DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:divine-bond:5": {
    archetypeId: "hunter:divine-hunter",
    name: "Divine Bond",
    level: 5,
    bucket: "situational",
    note:
      "real, scaling weapon-enhancement bonus, but a once/day-plus, standard-action-activated, " +
      "minutes/level-duration effect on a called weapon — activated/resource-gated regardless. " +
      DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:domain:3": {
    archetypeId: "hunter:divine-hunter",
    name: "Domain",
    level: 3,
    bucket: "subsystem",
    note: "grants a cleric domain's powers/spells — pick-list subsystem. " + DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:hunter-s-blessing:11": {
    archetypeId: "hunter:divine-hunter",
    name: "Hunter's Blessing",
    level: 11,
    bucket: "subsystem",
    note:
      "swift-action, resource-spending grant of three fixed named feats to nearby allies for a " +
      "minute — activated named-feat grant (class note 4). " +
      DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:otherworldly-companion:3": {
    archetypeId: "hunter:divine-hunter",
    name: "Otherworldly Companion",
    level: 3,
    bucket: "subsystem",
    note:
      COMPANION_SCOPED_NOTE +
      " Grants the companion a celestial/fiendish template. " +
      DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:precise-shot:1": {
    archetypeId: "hunter:divine-hunter",
    name: "Precise Shot",
    level: 1,
    bucket: "subsystem",
    note: NAMED_FEAT_GRANT_NOTE + " (Precise Shot). " + DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:righteous-hunter:14": {
    archetypeId: "hunter:divine-hunter",
    name: "Righteous Hunter",
    level: 14,
    bucket: "subsystem",
    note:
      "treats ranged weapons (hers and nearby allies') as good-aligned for DR — no matching " +
      "Change target (dr.<bypass> models the character's OWN damage reduction, not making an " +
      "attack overcome a defender's DR). " +
      DIVINE_HUNTER_MISMATCH,
  },
  "hunter:divine-hunter:shared-precision:3": {
    archetypeId: "hunter:divine-hunter",
    name: "Shared Precision",
    level: 3,
    bucket: "situational",
    note:
      "grants nearby allies the Precise Shot benefit, but only against a target she just hit " +
      "with a ranged attack, until her next turn — a per-hit, per-round condition. " +
      DIVINE_HUNTER_MISMATCH,
  },

  // ── hunter:feral-hunter ──
  "hunter:feral-hunter:feral-focus:1": {
    archetypeId: "hunter:feral-hunter",
    name: "Feral Focus",
    level: 1,
    bucket: "situational",
    note:
      "reflavor of Animal Focus applied only to the hunter herself (no companion), unlimited " +
      "duration and free-action to end — still an activated, chosen-aspect ability (class note 2).",
  },
  "hunter:feral-hunter:precise-summoned-animal:2": {
    archetypeId: "hunter:feral-hunter",
    name: "Precise Summoned Animal",
    level: 2,
    bucket: "subsystem",
    note:
      "alters Precise Companion to extend teamwork-feat sharing to summoned animals instead of " +
      "a permanent companion — summon-scoped. " +
      TEAMWORK_FEAT_NOTE,
  },
  "hunter:feral-hunter:second-feral-focus:8": {
    archetypeId: "hunter:feral-hunter",
    name: "Second Feral Focus",
    level: 8,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (doubles the number of active aspects on herself)",
  },
  "hunter:feral-hunter:solitary:1": {
    archetypeId: "hunter:feral-hunter",
    name: "Solitary",
    level: 1,
    bucket: "subsystem",
    note: "removes the animal companion entirely — a structural build restriction, not a number.",
  },
  "hunter:feral-hunter:summon-pack:6": {
    archetypeId: "hunter:feral-hunter",
    name: "Summon Pack",
    level: 6,
    bucket: "subsystem",
    note: TEAMWORK_FEAT_NOTE,
  },
  "hunter:feral-hunter:teamwork-feat:3": {
    archetypeId: "hunter:feral-hunter",
    name: "Teamwork Feat",
    level: 3,
    bucket: "subsystem",
    note: TEAMWORK_FEAT_NOTE,
  },
  "hunter:feral-hunter:wild-shape:4": {
    archetypeId: "hunter:feral-hunter",
    name: "Wild Shape",
    level: 4,
    bucket: "subsystem",
    note:
      "grants druid-style wild shape (animal forms only) — an activated polymorph ability, no " +
      "flat number.",
  },

  // ── hunter:feykiller ──
  "hunter:feykiller:animal-focus:1": {
    archetypeId: "hunter:feykiller",
    name: "Animal Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (adds fey-countering aspect choices)",
  },
  "hunter:feykiller:grounded:17": {
    archetypeId: "hunter:feykiller",
    name: "Grounded",
    level: 17,
    bucket: "situational",
    note:
      "real +4 insight save bonus vs. illusion/enchantment plus immunity to fey illusion/" +
      "enchantment, but scoped to a save category this engine doesn't model (only fort/ref/" +
      "will) AND conditioned on the companion being within 60 feet.",
  },
  "hunter:feykiller:iron-talons:1": {
    archetypeId: "hunter:feykiller",
    name: "Iron Talons",
    level: 1,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Treats the companion's natural attacks as cold iron.",
  },
  "hunter:feykiller:resist-nature-s-lure:4": {
    archetypeId: "hunter:feykiller",
    name: "Resist Nature's Lure",
    level: 4,
    bucket: "situational",
    note:
      "grants the druid Resist Nature's Lure save bonus (itself scoped to fey abilities, a " +
      "category this engine doesn't model) conditioned on the companion being within 60 feet.",
  },

  // ── hunter:flood-flourisher ──
  "hunter:flood-flourisher:aquatic-action:9": {
    archetypeId: "hunter:flood-flourisher",
    name: "Aquatic Action",
    level: 9,
    bucket: "subsystem",
    note: "grants the Aquatic Action vigilante talent's benefits — borrowed-subsystem ability grant, no flat number.",
  },
  "hunter:flood-flourisher:fast-submerged-stealth:15": {
    archetypeId: "hunter:flood-flourisher",
    name: "Fast Submerged Stealth",
    level: 15,
    bucket: "situational",
    note: "real full-speed Stealth plus retained tremorsense, but scoped to a deep-bog environment specifically.",
  },
  "hunter:flood-flourisher:fast-swimmer:18": {
    archetypeId: "hunter:flood-flourisher",
    name: "Fast Swimmer",
    level: 18,
    bucket: "blocked",
    note:
      "'increases her swim speed by 20 feet' is otherwise a plain additive swimSpeed Change, " +
      "but this archetype's own Watery Stride (5th level, this file's numeric entry) grants the " +
      "base swim speed via a base/set Change — compute.ts's applySpeedTarget takes ONLY the " +
      "minimum among competing 'set' mods for a target and drops any purely-additive mod for " +
      "that SAME target entirely whenever any 'set' mod is present (see class note 7), so a " +
      "separate +20 additive Change here would be silently swallowed by the engine rather than " +
      "adding on top. Re-expressing it as a second 'set' value would also lose, since set-vs-" +
      "set resolves to the LOWER of the two. No way to express 'increase an already-set speed " +
      "by N' with the current target semantics.",
  },
  "hunter:flood-flourisher:skilled-ambusher:3": {
    archetypeId: "hunter:flood-flourisher",
    name: "Skilled Ambusher",
    level: 3,
    bucket: "subsystem",
    note: NAMED_FEAT_GRANT_NOTE + " (Athletic or Stealthy, player's choice of the two).",
  },
  "hunter:flood-flourisher:submerged-stealth:8": {
    archetypeId: "hunter:flood-flourisher",
    name: "Submerged Stealth",
    level: 8,
    bucket: "situational",
    note: "real Stealth/tremorsense/breath-holding benefits, all scoped to a deep-bog environment.",
  },
  "hunter:flood-flourisher:sudden-strike:12": {
    archetypeId: "hunter:flood-flourisher",
    name: "Sudden Strike",
    level: 12,
    bucket: "situational",
    note: "extra actions during a surprise round specifically — a per-encounter action-economy effect, not a flat modifier.",
  },
  "hunter:flood-flourisher:twin-hunters:3": {
    archetypeId: "hunter:flood-flourisher",
    name: "Twin Hunters",
    level: 3,
    bucket: "subsystem",
    note:
      "meta-rule extending every OTHER flood-flourisher benefit to the animal companion too — " +
      COMPANION_SCOPED_NOTE +
      " Carries no number of its own.",
  },
  "hunter:flood-flourisher:water-striker:6": {
    archetypeId: "hunter:flood-flourisher",
    name: "Water Striker",
    level: 6,
    bucket: "subsystem",
    note:
      NAMED_FEAT_GRANT_NOTE +
      " (Shot on the Run or Spring Attack, player's choice), additionally scoped to only while using a swim speed.",
  },
  "hunter:flood-flourisher:watery-stride:5": {
    archetypeId: "hunter:flood-flourisher",
    name: "Watery Stride",
    level: 5,
    bucket: "numeric",
    note:
      "unconditional swim speed equal to base land speed (max 30 ft.) — the base/set idiom " +
      "already established elsewhere (bloodrager-bloodlines.ts's Serpentine Swim, slayer.ts's " +
      "Swift Swimmer/Branchwalking). The accompanying '+10 Acrobatics if already has a swim " +
      "speed' rider is dropped, same posture as ranger.ts's Strong Senses/rogueUnchained.ts's " +
      "darkvision-rider precedent (an 'already has X, gets Y instead' branch the engine can't " +
      "check).",
  },

  // ── hunter:forester ──
  "hunter:forester:animal-focus:1": {
    archetypeId: "hunter:forester",
    name: "Animal Focus",
    level: 1,
    bucket: "situational",
    note:
      ANIMAL_FOCUS_NOTE + " (a forester has no companion, so both aspects always apply to herself)",
  },
  "hunter:forester:bonus-feat:2": {
    archetypeId: "hunter:forester",
    name: "Bonus Feat",
    level: 2,
    bucket: "numeric",
    note:
      "unconditional bonus combat feat at 2nd, 7th, 13th, and 19th (1/2/3/4 total) — the " +
      "combat-feat-list restriction isn't modeled, only the count, same posture as magus.ts's " +
      "Iron-Ring Striker Bonus Feat.",
  },
  "hunter:forester:breath-of-life:10": {
    archetypeId: "hunter:forester",
    name: "Breath of Life",
    level: 10,
    bucket: "subsystem",
    note: "1/day breath of life, wired via the spell-like-abilities route.",
  },
  "hunter:forester:camouflage:7": {
    archetypeId: "hunter:forester",
    name: "Camouflage",
    level: 7,
    bucket: "situational",
    note: "Stealth-without-cover permission scoped to her favored terrains.",
  },
  "hunter:forester:evasion:4": {
    archetypeId: "hunter:forester",
    name: "Evasion",
    level: 4,
    bucket: "subsystem",
    note: "grants rogue Evasion — a defensive re-roll mechanic, no engine target.",
  },
  "hunter:forester:favored-terrain:1": {
    archetypeId: "hunter:forester",
    name: "Favored Terrain",
    level: 1,
    bucket: "situational",
    note:
      "grants/modifies the ranger's favored terrain progression — real numbers, but the free-" +
      "form favoredTerrains list already lets a player encode any custom schedule, and " +
      "applicability is GM-judged same as the base ability (matches ranger.ts's own posture).",
  },
  "hunter:forester:hide-in-plain-sight:14": {
    archetypeId: "hunter:forester",
    name: "Hide in Plain Sight",
    level: 14,
    bucket: "situational",
    note: "Stealth-while-observed permission scoped to her favored terrains.",
  },
  "hunter:forester:improved-evasion:11": {
    archetypeId: "hunter:forester",
    name: "Improved Evasion",
    level: 11,
    bucket: "subsystem",
    note: "upgrades Evasion — same no-engine-target posture.",
  },
  "hunter:forester:tactician:3": {
    archetypeId: "hunter:forester",
    name: "Tactician",
    level: 3,
    bucket: "subsystem",
    note:
      TEAMWORK_FEAT_NOTE +
      " Grants the benefit of one teamwork feat to nearby allies temporarily, limited daily uses.",
  },

  // ── hunter:packmaster ──
  "hunter:packmaster:master-of-the-pack:20": {
    archetypeId: "hunter:packmaster",
    name: "Master of the Pack",
    level: 20,
    bucket: "subsystem",
    note:
      "full-speed tracking plus an extra daily animal-focus use — " +
      COMPANION_SCOPED_NOTE +
      " for the tracking half; the animal-focus half is situational per class note 2.",
  },
  "hunter:packmaster:pack-bond:1": {
    archetypeId: "hunter:packmaster",
    name: "Pack Bond",
    level: 1,
    bucket: "subsystem",
    note:
      "replaces the base Animal Companion grant (effective druid level = hunter level, no " +
      "offset) with the same formula split across multiple companions, and splits precise " +
      "companion/woodland stride/teamwork-feat sharing across them too. " +
      COMPANION_SCOPED_NOTE +
      " A multi-companion split (this engine tracks one companion stat block), so the plain " +
      "classLevel/0 grant stays unwired despite the formula itself being trivial.",
  },
  "hunter:packmaster:pack-focus:1": {
    archetypeId: "hunter:packmaster",
    name: "Pack Focus",
    level: 1,
    bucket: "situational",
    note:
      ANIMAL_FOCUS_NOTE +
      " (companion accounting differs across a pack; aspects otherwise unchanged)",
  },
  "hunter:packmaster:second-pack-focus:8": {
    archetypeId: "hunter:packmaster",
    name: "Second Pack Focus",
    level: 8,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE,
  },
  "hunter:packmaster:teamwork-feat:3": {
    archetypeId: "hunter:packmaster",
    name: "Teamwork Feat",
    level: 3,
    bucket: "subsystem",
    note:
      TEAMWORK_FEAT_NOTE +
      " Alters which companions share Precise Companion/Woodland Stride/teamwork feats.",
  },

  // ── hunter:patient-ambusher ──
  "hunter:patient-ambusher:additional-trap:3": {
    archetypeId: "hunter:patient-ambusher",
    name: "Additional Trap",
    level: 3,
    bucket: "subsystem",
    note:
      "learns a new ranger trap type from the Ultimate Magic trap list — pick-list addition, " +
      "same posture as ranger.ts's spell-trapper trap-subsystem entries.",
  },
  "hunter:patient-ambusher:snare-trap:3": {
    archetypeId: "hunter:patient-ambusher",
    name: "Snare Trap",
    level: 3,
    bucket: "subsystem",
    note: "grants a specific trap plus a daily-use resource pool — trap subsystem.",
  },
  "hunter:patient-ambusher:trapfinding:1": {
    archetypeId: "hunter:patient-ambusher",
    name: "Trapfinding",
    level: 1,
    bucket: "numeric",
    note:
      "unconditional half-level (min +1) Disable Device bonus is extracted; the paired " +
      "Perception clause is scoped to 'checks to locate traps' specifically, not general " +
      "Perception, and is dropped — matches oracle.ts's Seeker (Tinkering) and the hand-" +
      "verified sorcerer:seeker entry's own established precedent for this exact ability text. " +
      "Unpaired (hunter has no base Trapfinding to suppress), so no double-count risk either way.",
  },

  // ── hunter:pelagic-hunter ──
  "hunter:pelagic-hunter:blood-to-water:5": {
    archetypeId: "hunter:pelagic-hunter",
    name: "Blood to Water",
    level: 5,
    bucket: "subsystem",
    note: "anti-tracking narrative effect (bleed turns to water underwater) — no flat number.",
  },
  "hunter:pelagic-hunter:pelagic-companion:1": {
    archetypeId: "hunter:pelagic-hunter",
    name: "Pelagic Companion",
    level: 1,
    bucket: "subsystem",
    note:
      COMPANION_SCOPED_NOTE +
      " Restricts the companion to aquatic animals and grants it skirmisher tricks.",
  },
  "hunter:pelagic-hunter:pelagic-focus:1": {
    archetypeId: "hunter:pelagic-hunter",
    name: "Pelagic Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (deep-sea-creature aspect list instead of animals)",
  },

  // ── hunter:plant-master ──
  "hunter:plant-master:green-empathy:1": {
    archetypeId: "hunter:plant-master",
    name: "Green Empathy",
    level: 1,
    bucket: "subsystem",
    note: "wild-empathy analog for plant creatures — a Diplomacy-style check formula, not a Change-shaped ability.",
  },
  "hunter:plant-master:master-hunter:20": {
    archetypeId: "hunter:plant-master",
    name: "Master Hunter",
    level: 20,
    bucket: "subsystem",
    note:
      "reflavor of Master Hunter (base changes: []) restricted to plant foci — an action-" +
      "economy tweak to Animal Focus usage, no number of its own.",
  },
  "hunter:plant-master:plant-companion:1": {
    archetypeId: "hunter:plant-master",
    name: "Plant Companion",
    level: 1,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Grants a plant companion instead of an animal one.",
  },
  "hunter:plant-master:plant-focus:1": {
    archetypeId: "hunter:plant-master",
    name: "Plant Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (plant-aspect list instead of animal)",
  },
  "hunter:plant-master:plant-shield:17": {
    archetypeId: "hunter:plant-master",
    name: "Plant Shield",
    level: 17,
    bucket: "subsystem",
    note: "low-Int plant creatures won't willingly attack the plant master or companion — a narrative deterrence effect, no flat number.",
  },

  // ── hunter:primal-companion-hunter ──
  "hunter:primal-companion-hunter:primal-master:20": {
    archetypeId: "hunter:primal-companion-hunter",
    name: "Primal Master",
    level: 20,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Free-action primal-aspect activation, double evolutions.",
  },
  "hunter:primal-companion-hunter:primal-surge:8": {
    archetypeId: "hunter:primal-companion-hunter",
    name: "Primal Surge",
    level: 8,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Grants the companion a temporary summoner-style evolution.",
  },
  "hunter:primal-companion-hunter:primal-transformation:1": {
    archetypeId: "hunter:primal-companion-hunter",
    name: "Primal Transformation",
    level: 1,
    bucket: "subsystem",
    note:
      "grants the companion (or the hunter herself, if the companion is dead) a summoner-" +
      "eidolon-style evolution-point pool — an entirely separate, unmodeled evolution " +
      "subsystem for archetype grants (eidolon.ts models summoner eidolons directly, not " +
      "archetype-granted evolution pools).",
  },

  // ── hunter:roof-runner ──
  "hunter:roof-runner:alley-ghost:8": {
    archetypeId: "hunter:roof-runner",
    name: "Alley Ghost",
    level: 8,
    bucket: "subsystem",
    note: "grants the Fast Stealth rogue talent's benefits — borrowed-subsystem ability grant, no flat number.",
  },
  "hunter:roof-runner:master-climber:20": {
    archetypeId: "hunter:roof-runner",
    name: "Master Climber",
    level: 20,
    bucket: "numeric",
    note:
      "unconditional climb speed equal to base land speed, no branching condition in the text " +
      "— the same climbSpeed/base/set idiom slayer.ts's Branchwalking already establishes, " +
      "replaces Master Hunter (vendored changes: []).",
  },
  "hunter:roof-runner:natural-leaper:2": {
    archetypeId: "hunter:roof-runner",
    name: "Natural Leaper",
    level: 2,
    bucket: "situational",
    note:
      "real half-level Acrobatics bonus, but scoped to jump checks specifically — PF1's " +
      "Acrobatics is one skill covering jump/balance/tumble together, so a general skill.acr " +
      "Change would over-apply to unrelated Acrobatics uses.",
  },
  "hunter:roof-runner:shingle-stride:5": {
    archetypeId: "hunter:roof-runner",
    name: "Shingle Stride",
    level: 5,
    bucket: "situational",
    note:
      "full-speed Acrobatics on narrow/uneven surfaces plus faster climbing — an action-economy " +
      "rule, not a climb-speed number; also shared with the companion.",
  },
  "hunter:roof-runner:skilled:1": {
    archetypeId: "hunter:roof-runner",
    name: "Skilled",
    level: 1,
    bucket: "subsystem",
    note:
      "adds Acrobatics/Escape Artist/Sleight of Hand to the class-skill list — this pipeline's " +
      "ExtractedArchetypeFeatureEffect type carries no classSkills field (that's a structural " +
      "relationship computed from refData.classes, not a Change target) — and swaps away " +
      "medium-armor/shield proficiency, also not Change-shaped.",
  },
  "hunter:roof-runner:weapon-and-armor-proficiency:1": {
    archetypeId: "hunter:roof-runner",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant — not a Change target.",
  },

  // ── hunter:scarab-stalker ──
  "hunter:scarab-stalker:desert-walker:5": {
    archetypeId: "hunter:scarab-stalker",
    name: "Desert Walker",
    level: 5,
    bucket: "situational",
    note: "full-speed desert movement without harm — scoped to desert terrain specifically; also shared with the companion.",
  },
  "hunter:scarab-stalker:sacred-animal-focus:1": {
    archetypeId: "hunter:scarab-stalker",
    name: "Sacred Animal Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (Egyptian-animal-themed aspect list)",
  },

  // ── hunter:totem-bonded ──
  "hunter:totem-bonded:primeval-companion:1": {
    archetypeId: "hunter:totem-bonded",
    name: "Primeval Companion",
    level: 1,
    bucket: "subsystem",
    note:
      "restricts companion choice; at 7th level, for a companion whose growth table caps at " +
      "Medium the way a bear's does, grants Str +4/Dex -2/Con +2/AC +1 natural armor and a " +
      "one-die-size natural-attack damage increase, plus growth to Large. " +
      COMPANION_SCOPED_NOTE +
      " The Str/Dex/Con/natural-armor bundle is wired via COMPANION_EFFECT_ARCHETYPE_FEATURES " +
      "onto the tracked companion's stat block, gated on the bear species; the Large size " +
      "increase itself and the natural-attack damage die increase have no companion target.",
  },
  "hunter:totem-bonded:shared-strength:1": {
    archetypeId: "hunter:totem-bonded",
    name: "Shared Strength",
    level: 1,
    bucket: "subsystem",
    note:
      "swift-action ability manifesting one (later two) of the companion's own aspects " +
      "(natural armor, speed, natural attacks) on the hunter herself — the specific bonus " +
      "depends on the companion's own stat block (not exposed to formulas) and is activated/" +
      "duration-limited; also grants the companion its own separate bonuses.",
  },

  // ── hunter:treestrider ──
  "hunter:treestrider:animal-companion:1": {
    archetypeId: "hunter:treestrider",
    name: "Animal Companion",
    level: 1,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Forces an ape companion.",
  },
  "hunter:treestrider:brachiation:1": {
    archetypeId: "hunter:treestrider",
    name: "Brachiation",
    level: 1,
    bucket: "numeric",
    note:
      "below 15th level this is a duration-limited, free-action-activated climb speed (not " +
      "modeled — situational in isolation); at 15th, the text removes the daily-duration cap " +
      "entirely ('she can use brachiation with no limit on the duration'), which this pass " +
      "reads as becoming unconditional from that point on. Only the 15th-level-and-later, " +
      "'equal to her base speed' tier is extracted for the hunter's own sheet here. The " +
      "companion's own climb-speed enhancement bonus (+10 ft. from 1st level, +20 ft. from 8th, " +
      "unconditional and not duration-limited) is wired via COMPANION_EFFECT_ARCHETYPE_FEATURES " +
      "onto the tracked companion's stat block instead (class note 1).",
  },
  "hunter:treestrider:improved-unarmed-strike:2": {
    archetypeId: "hunter:treestrider",
    name: "Improved Unarmed Strike",
    level: 2,
    bucket: "subsystem",
    note: NAMED_FEAT_GRANT_NOTE + " (Improved Unarmed Strike).",
  },
  "hunter:treestrider:tree-stride:10": {
    archetypeId: "hunter:treestrider",
    name: "Tree Stride",
    level: 10,
    bucket: "subsystem",
    note: "limited-use teleport-style movement ability (as the tree stride spell) — no flat number.",
  },

  // ── hunter:uprooter-scout ──
  "hunter:uprooter-scout:demon-s-end:17": {
    archetypeId: "hunter:uprooter-scout",
    name: "Demon's End",
    level: 17,
    bucket: "situational",
    note: "swift-action Intimidate-to-demoralize vs. demons specifically — creature-type-scoped and activated.",
  },
  "hunter:uprooter-scout:lore-of-the-blight:6": {
    archetypeId: "hunter:uprooter-scout",
    name: "Lore of the Blight",
    level: 6,
    bucket: "situational",
    note:
      "real, scaling multi-skill/initiative bonus (+2/+4/+6), but scoped to being in the Abyss " +
      "or Abyss-tainted terrain — a planar/terrain state the engine can't check.",
  },
  "hunter:uprooter-scout:unnatural-stride:10": {
    archetypeId: "hunter:uprooter-scout",
    name: "Unnatural Stride",
    level: 10,
    bucket: "subsystem",
    note: "woodland-stride analog for corrupted terrain — a movement-rule permission, no flat number; shared with the companion.",
  },

  // ── hunter:urban-hunter ──
  "hunter:urban-hunter:animal-companion:1": {
    archetypeId: "hunter:urban-hunter",
    name: "Animal Companion",
    level: 1,
    bucket: "subsystem",
    note:
      COMPANION_SCOPED_NOTE +
      " Restricts companion choice to urban/domestic animals and adds a stealth/perception " +
      "social mechanic for the companion.",
  },
  "hunter:urban-hunter:animal-insight:5": {
    archetypeId: "hunter:urban-hunter",
    name: "Animal Insight",
    level: 5,
    bucket: "situational",
    note:
      "real Sense Motive/Will-save bonuses, but conditioned on the companion being within 30 " +
      "feet AND (for the Will half) scoped to a save category (illusions/mind-affecting " +
      "effects) this engine doesn't model.",
  },
  "hunter:urban-hunter:captor:3": {
    archetypeId: "hunter:urban-hunter",
    name: "Captor",
    level: 3,
    bucket: "blocked",
    note:
      "claims to replace 'hunter tactics and teamwork feat' but carries no " +
      "pairedBaseFeatureUuid — the base Teamwork Feat's real bonusFeats formula " +
      "(floor(@class.unlevel / 3)) never gets suppressed, so backfilling Captor's own " +
      "restricted-list bonus-feat schedule (6th level and every 3 levels thereafter) would " +
      "double it up (class note 6, same shape as ranger.ts's Beast Master/Falconer partial-" +
      "tier traps). The accompanying 'no penalty for nonlethal damage' clause is unrelated and " +
      "not Change-shaped either way.",
  },
  "hunter:urban-hunter:frightful-ferocity:17": {
    archetypeId: "hunter:urban-hunter",
    name: "Frightful Ferocity",
    level: 17,
    bucket: "subsystem",
    note: "grants a swift-action Intimidate-to-demoralize attempt for hunter and companion — no flat bonus of its own.",
  },

  // ── hunter:verminous-hunter ──
  "hunter:verminous-hunter:swarm-stride:5": {
    archetypeId: "hunter:verminous-hunter",
    name: "Swarm Stride",
    level: 5,
    bucket: "situational",
    note: "immunity to swarm damage/distraction, scoped to being within a vermin swarm's own space specifically.",
  },
  "hunter:verminous-hunter:vermin-companion:1": {
    archetypeId: "hunter:verminous-hunter",
    name: "Vermin Companion",
    level: 1,
    bucket: "subsystem",
    note: COMPANION_SCOPED_NOTE + " Forces a vermin companion instead of an animal one.",
  },
  "hunter:verminous-hunter:vermin-empathy:1": {
    archetypeId: "hunter:verminous-hunter",
    name: "Vermin Empathy",
    level: 1,
    bucket: "subsystem",
    note: "wild empathy restricted to vermin — a Diplomacy-style check formula, not Change-shaped.",
  },
  "hunter:verminous-hunter:vermin-focus:1": {
    archetypeId: "hunter:verminous-hunter",
    name: "Vermin Focus",
    level: 1,
    bucket: "situational",
    note: ANIMAL_FOCUS_NOTE + " (vermin-aspect list instead of animal)",
  },
};

/**
 * ── HUNTER_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for hunter archetype class features
 * (the prose->Change extraction pipeline, hunter slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 5 of hunter's 100 features
 * cleared the `numeric` bar (see `HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — hunter's kit leans heavily on
 * companion-scoped bonuses, Animal Focus's activated aspect lists, and
 * teamwork-feat/named-feat grants, all bucketed per this file's class notes.
 */
export const HUNTER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Forester's "Bonus Feat" (Blood of the Wilds) grants an unconditional
  // bonus combat feat at 2nd, then again at 7th/13th/19th — no paired base-
  // feature slot to suppress, a pure additive grant. The combat-feat-list
  // restriction isn't modeled, only the count (same posture as magus.ts's
  // Iron-Ring Striker Bonus Feat).
  "hunter:forester:bonus-feat:2": {
    changes: [
      c(
        "if(gte(@class.unlevel, 19), 4, if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 7), 2, if(gte(@class.unlevel, 2), 1, 0))))",
        "bonusFeats",
      ),
    ],
    detail: (level) =>
      `${level >= 19 ? 4 : level >= 13 ? 3 : level >= 7 ? 2 : level >= 2 ? 1 : 0} bonus combat feat(s)`,
    confidence: "high",
    provenance:
      "At 2nd level, a forester gains one bonus combat feat. She must meet the prerequisites " +
      "for this feat as normal. She gains an additional bonus combat feat at 7th, 13th, and " +
      "19th levels.",
  },

  // Patient Ambusher's "Trapfinding" (Ultimate Magic) is the classic +1/2-
  // level (min 1) Perception-to-locate-traps-and-Disable-Device text. Only
  // the general Disable Device half is extracted — the Perception half is
  // scoped to "checks to locate traps" specifically, not general Perception
  // — matching oracle.ts's Seeker (Tinkering) and the hand-verified
  // sorcerer:seeker entry's own established precedent for this exact
  // ability text. Unpaired (the hunter chassis has no base Trapfinding to
  // suppress), so there's no double-count risk either way.
  "hunter:patient-ambusher:trapfinding:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
    confidence: "high",
    provenance:
      "A patient ambusher adds half her hunter level (minimum +1) on Perception checks to " +
      "locate traps and on Disable Device skill checks.",
  },

  // Roof Runner's "Master Climber" (20th level, replacing Master Hunter,
  // which carries vendored changes: []) grants an unconditional climb speed
  // equal to base land speed — the same climbSpeed/"base"/"set" idiom
  // slayer.ts's Branchwalking already establishes for materially identical
  // wording, with no branching condition in the text to drop.
  "hunter:roof-runner:master-climber:20": {
    changes: [
      {
        formula: "@attributes.speed.land.total",
        target: "climbSpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: () => "climb speed = base land speed",
    confidence: "high",
    provenance:
      "At 20th level, a roof runner gains a climb speed equal to her base land speed, instead " +
      "of being able to move at full speed while tracking.",
  },

  // Flood Flourisher's "Watery Stride" (5th level, unpaired) grants an
  // unconditional swim speed equal to base land speed (capped at 30 ft.) —
  // the same swimSpeed/"base"/"set" idiom bloodrager-bloodlines.ts's
  // Serpentine Swim and slayer.ts's Swift Swimmer already establish. The
  // accompanying "+10 Acrobatics if already has a swim speed" rider is
  // dropped (an "already has X, gets Y instead" branch the engine can't
  // check — same posture as ranger.ts's Strong Senses/rogueUnchained.ts's
  // darkvision-rider precedent). NOTE: Fast Swimmer (18th level, this same
  // archetype) is deliberately NOT extracted — see its classification
  // entry's note for the verified compute.ts interaction that would drop
  // its bonus silently if both were Changes on the same target.
  "hunter:flood-flourisher:watery-stride:5": {
    changes: [
      {
        formula: "min(30, @attributes.speed.land.total)",
        target: "swimSpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: () => "swim speed = base land speed (max 30 ft.)",
    confidence: "medium",
    provenance:
      "At 5th level, a flood flourisher and her animal companion gain a swim speed equal to " +
      "their base land speed (maximum 30 feet).",
  },

  // Treestrider's "Brachiation" (1st level) is duration-limited (and so not
  // modeled) below 15th level; at 15th, the text removes the daily-duration
  // cap entirely ("she can use brachiation with no limit on the duration"),
  // read here as becoming unconditional from that point on. Only the 15th-
  // level-and-later "equal to her base speed" tier is extracted as a plain
  // additive climbSpeed Change (contributing 0 below 15th, a no-op) — NOT a
  // "base"/"set" Change, since a conditional 0-value "set" would compete via
  // compute.ts's min-of-set-mods rule and could wrongly zero out a climb
  // speed granted by another source below 15th (see class note 7's
  // set-mod-interaction finding). The companion's own climb-speed
  // enhancement bonus is dropped (class note 1).
  "hunter:treestrider:brachiation:1": {
    changes: [c("if(gte(@class.unlevel, 15), @attributes.speed.land.total, 0)", "climbSpeed")],
    detail: (level) =>
      level >= 15
        ? "climb speed = base land speed (unlimited duration from 15th)"
        : "duration-limited below 15th, not modeled",
    confidence: "medium",
    provenance:
      "At 8th level, the treestrider's climb speed increases to equal her base speed, the " +
      "duration of her brachiation increases to 10 minutes per hunter level per day (usable in " +
      "10-minute increments), and the enhancement bonus to her companion's climb speed " +
      "increases to +20 feet. At 15th level, she can use brachiation with no limit on the " +
      "duration.",
  },
};
