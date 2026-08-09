/**
 * Slayer's slice of the pipeline. Every vendored archetype feature for the
 * class (26 slayer archetypes, 133 features) is read in full and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked`, following the exact
 * methodology the fighter/magus pilots validated. Per the per-class file
 * convention (`index.ts`'s doc comment), this file owns BOTH of slayer's
 * pipeline artifacts — `SLAYER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts` (the
 * aggregator, a later integration step not done here) needs a new import +
 * spread line.
 *
 * ── Slayer-specific mechanical facts this pass relies on ──────────────────
 *
 * 1. **Studied Target** (the slayer's signature 1st-level ability, a scaling
 *    bonus on Bluff/Knowledge/Perception/Sense Motive/Survival checks and
 *    weapon attack/damage rolls against ONE chosen foe) carries no `Change`
 *    anywhere in this engine — confirmed both by the vendored class feature
 *    (`changes: []` in `class-features.json`) and by precedent
 *    (`archetype-extracted/druid.ts`'s Nature Fang entry, `slayer-talents.ts`'s
 *    own doc comment). A feature that adds a genuine NUMBER on top of Studied
 *    Target (a bigger bonus, a bonus that also applies to a new check) is
 *    `situational` — the number is real, but it only ever matters against the
 *    one enemy currently studied, which this static sheet has no notion of.
 *    A feature that only reshapes Studied Target's RULES (who can be studied,
 *    how many at once, which checks it does or doesn't apply to) with no
 *    number of its own is `subsystem` — nothing to be situational about.
 * 2. **Slayer Talents** (`doc.build.slayerTalents`, `slayer-talents.ts`) are
 *    an already-modeled pick-list subsystem — any archetype feature that
 *    adds to, restricts, or swaps out the talent/advanced-talent list (the
 *    ubiquitous "the following slayer talents complement this archetype"
 *    flavor-text features, one per archetype, carrying no mechanics of their
 *    own) is `subsystem`.
 * 3. **Sneak attack** dice/damage totals ride `tables.ts`'s hand-authored
 *    `sneakAttackDice` table, not a `Change` — there is no applied target in
 *    `targets.ts` for "extra sneak attack dice" or "extra sneak attack range"
 *    at all. Every archetype feature here that explicitly "alters sneak
 *    attack" (adds conditional dice, extends its range, or swaps its
 *    trigger) is `blocked`: there's no target to express even the
 *    unconditional half of it, and stacking a guessed Change on top of the
 *    hand table risks exactly the double-count this pipeline's other class
 *    files were warned off of for resource pools.
 * 4. **Track/Quarry/Improved Quarry/Stalker/Swift Tracker/Slayer's
 *    Advance/Master Slayer** (the base features most of these archetypes
 *    replace) were checked directly against `class-features.json` before
 *    writing a single entry below: every one of them carries `changes: []`
 *    vendored — none is Change-shaped at all (Track and Quarry are
 *    themselves narrowly scoped to "checks to follow/track" and would be
 *    `situational` near-misses if a hand-authored table ever covered the
 *    base class this way). There is therefore no risk of a replacement
 *    feature's own extracted number double-counting a suppressed base
 *    number anywhere in this file — every `pairedBaseFeatureUuid` link was
 *    still checked per-entry (noted below) for completeness, but none needed
 *    a `blocked` verdict on THIS basis.
 *
 * Only 5 of slayer's 133 features cleared the `numeric` bar — slayer's kit
 * leans overwhelmingly on Studied Target riders (per-enemy, hence
 * `situational`), the Slayer Talents pick-list, and terrain/weapon/stance-
 * scoped combat riders, all `situational` or `subsystem` by the rubric
 * above. See each entry's `note` for the specific reason it didn't clear the
 * bar.
 *
 * Confidence rubric (identical to magus.ts's):
 *  - "high": a literal, fully general (no scope restriction), single-sentence
 *    scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence, or a
 *    second textually-present detail (an accompanying ability grant, a
 *    speed-cap footnote) is dropped from the extracted Change and flagged in
 *    `detail`.
 *  - "low": not used in this pass.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── slayer:ankou-s-shadow ──
  "slayer:ankou-s-shadow:advanced-slayer-talents:0": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text list of which advanced talents complement the archetype — no mechanics of its own, see class note 2",
  },
  "slayer:ankou-s-shadow:ankou-s-vision:7": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Ankou’s Vision",
    level: 7,
    bucket: "subsystem",
    note: "see invisibility as an SLA a number of minutes/day, replaces Stalker (changes:[] — see class note 4); a resource-gated ability grant, no flat number",
  },
  "slayer:ankou-s-shadow:shadow-double:0": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Shadow Double",
    level: 5,
    bucket: "subsystem",
    note: "grants mirror-image-like shadow doubles (up to 4), replaces Studied Target (changes:[] — class note 4); an unrelated illusion-duplicate subsystem, no number to the slayer's own stats",
  },
  "slayer:ankou-s-shadow:shadow-prey:0": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Shadow Prey",
    level: 0,
    bucket: "subsystem",
    note: "alters quarry/improved quarry's targeting rule (requires a shadow double present) — no number",
  },
  "slayer:ankou-s-shadow:slayer-talents:0": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:ankou-s-shadow:unfettered-shadows:20": {
    archetypeId: "slayer:ankou-s-shadow",
    name: "Unfettered Shadows",
    level: 20,
    bucket: "subsystem",
    note: "activated, limited-use-per-day ability letting shadow doubles act independently — resource-gated, no flat number",
  },

  // ── slayer:avalancher ──
  "slayer:avalancher:cliff-jumper:0": {
    archetypeId: "slayer:avalancher",
    name: "Cliff Jumper",
    level: 11,
    bucket: "situational",
    note: "real half-level Acrobatics bonus and a falling-damage reduction, but scoped to checks 'to jump or soften a fall' specifically, not all Acrobatics uses — same sub-skill-scoped near-miss shape as slayer-talents.ts's Sure Footing",
  },
  "slayer:avalancher:death-from-above:20": {
    archetypeId: "slayer:avalancher",
    name: "Death from Above",
    level: 20,
    bucket: "subsystem",
    note: "activated, once-per-24-hours-per-target save-or-die/paralyze attack, replaces Master Slayer (changes:[]) — a resource/action-gated ability, not a modifier",
  },
  "slayer:avalancher:fall-by-attack:14": {
    archetypeId: "slayer:avalancher",
    name: "Fall-By Attack",
    level: 14,
    bucket: "subsystem",
    note: "converts a long jump into a full-round attack sequence — an action-economy grant, no flat number",
  },
  "slayer:avalancher:falling-dodge:7": {
    archetypeId: "slayer:avalancher",
    name: "Falling Dodge",
    level: 7,
    bucket: "situational",
    note: "rides Falling Strike's own attack/damage bonus (itself situational, see below) as an AC bonus, but only while jumping through threatened squares — double-conditional, replaces Stalker (changes:[])",
  },
  "slayer:avalancher:falling-strike:0": {
    archetypeId: "slayer:avalancher",
    name: "Falling Strike",
    level: 0,
    bucket: "situational",
    note: "real, scaling +1 (to +5 at 20th) on Stealth/attack/damage, but only on an attack made after falling at least 10 feet first — a per-attack condition, replaces Studied Target (changes:[])",
  },

  // ── slayer:bloody-jake ──
  "slayer:bloody-jake:alignment:0": {
    archetypeId: "slayer:bloody-jake",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "roleplay/alignment restriction, no mechanical number",
  },
  "slayer:bloody-jake:cruel-trick:11": {
    archetypeId: "slayer:bloody-jake",
    name: "Cruel Trick",
    level: 11,
    bucket: "subsystem",
    note: "trades sneak attack dice for Dex/Cha ability damage on the target — an enemy-facing debuff substitution, not a number on the slayer's own sheet, replaces Swift Tracker (changes:[])",
  },
  "slayer:bloody-jake:cruel-tricks:0": {
    archetypeId: "slayer:bloody-jake",
    name: "Cruel Tricks",
    level: 1,
    bucket: "subsystem",
    note: "a resource-gated SLA list (ventriloquism/disorient/fear/blindsense), replaces 1st-level Studied Target and several slayer talent slots — no flat number",
  },
  "slayer:bloody-jake:favored-terrain:1": {
    archetypeId: "slayer:bloody-jake",
    name: "Favored Terrain",
    level: 1,
    bucket: "situational",
    note: "the standard ranger favored-terrain bonus family (a scaling bonus across multiple skills/checks), but only active in the chosen terrain type — terrain state isn't tracked as a toggle here, replaces medium armor/shield proficiency",
  },
  "slayer:bloody-jake:poor-study:0": {
    archetypeId: "slayer:bloody-jake",
    name: "Poor Study",
    level: 5,
    bucket: "situational",
    note: "a real, scaling +1-per-5-levels bonus, but it's Studied Target's own bonus delayed to 5th level — a per-enemy number, see class note 1; replaces Studied Target (changes:[])",
  },
  "slayer:bloody-jake:sadistic-snare:6": {
    archetypeId: "slayer:bloody-jake",
    name: "Sadistic Snare",
    level: 6,
    bucket: "subsystem",
    note: "grants a ranger-trap bonus feat and a sneak-attack-into-trap-damage conversion — trap subsystem, no engine target",
  },
  "slayer:bloody-jake:woodland-shortcut:13": {
    archetypeId: "slayer:bloody-jake",
    name: "Woodland Shortcut",
    level: 13,
    bucket: "subsystem",
    note: "1/day tree stride SLA, replaces Slayer's Advance (changes:[]) — resource-gated, no flat number",
  },

  // ── slayer:bounty-hunter ──
  "slayer:bounty-hunter:advanced-slayer-talents:0": {
    archetypeId: "slayer:bounty-hunter",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:bounty-hunter:dirty-trick:2": {
    archetypeId: "slayer:bounty-hunter",
    name: "Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "converts sneak attack damage into a free dirty trick combat maneuver check bonus — an enemy-facing maneuver conversion, no number to the slayer's own sheet, replaces a slayer talent slot",
  },
  "slayer:bounty-hunter:incapacitate:10": {
    archetypeId: "slayer:bounty-hunter",
    name: "Incapacitate",
    level: 10,
    bucket: "subsystem",
    note: "functions as the (unmodeled) Assassinate slayer talent except nonlethal — reflavor of an ability this engine never modeled in the first place, replaces an advanced talent slot",
  },
  "slayer:bounty-hunter:slayer-talents:0": {
    archetypeId: "slayer:bounty-hunter",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:bounty-hunter:submission-hold:6": {
    archetypeId: "slayer:bounty-hunter",
    name: "Submission Hold",
    level: 6,
    bucket: "subsystem",
    note: "adds sneak attack damage to a grapple check at a -5 penalty — an enemy-facing conversion, no number to the slayer's own sheet, replaces a slayer talent slot",
  },
  "slayer:bounty-hunter:weapon-and-armor-proficiency:0": {
    archetypeId: "slayer:bounty-hunter",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency grant/restriction, no Change",
  },

  // ── slayer:butterfly-blade ──
  "slayer:butterfly-blade:bonus-feats:0": {
    archetypeId: "slayer:butterfly-blade",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "swaps slayer talent slots for a fixed feat list — a pick-list variant, see class note 2",
  },
  "slayer:butterfly-blade:butterfly-s-kiss:0": {
    archetypeId: "slayer:butterfly-blade",
    name: "Butterfly’s Kiss",
    level: 3,
    bucket: "situational",
    note: "real, scaling attack bonus and a weapon damage-die increase, but scoped to butterfly swords specifically — a chosen-weapon condition; replaces sneak attack entirely with this unrelated weapon-scoped mechanic (not an alteration of the sneak attack progression itself, so class note 3 doesn't apply)",
  },
  "slayer:butterfly-blade:deadly-butterfly:19": {
    archetypeId: "slayer:butterfly-blade",
    name: "Deadly Butterfly",
    level: 19,
    bucket: "subsystem",
    note: "auto-confirms critical threats with a butterfly sword and grants it the speed weapon ability — absolute effects with no engine target (not a modifier), replaces Improved Quarry (changes:[])",
  },
  "slayer:butterfly-blade:innocent-butterfly:7": {
    archetypeId: "slayer:butterfly-blade",
    name: "Innocent Butterfly",
    level: 7,
    bucket: "subsystem",
    note: "an at-will/limited-use SLA, replaces Stalker/Swift Tracker/Quarry (all changes:[]) — resource-gated, no flat number",
  },
  "slayer:butterfly-blade:studied-stalker:0": {
    archetypeId: "slayer:butterfly-blade",
    name: "Studied Stalker",
    level: 1,
    bucket: "subsystem",
    note: "moves Stalker's onset to 1st level and drops Studied Target's Knowledge/Survival bonus — a timing/rule change with no number of its own, see class note 1",
  },

  // ── slayer:cleaner ──
  "slayer:cleaner:advanced-slayer-talents:0": {
    archetypeId: "slayer:cleaner",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:cleaner:deceitful:1": {
    archetypeId: "slayer:cleaner",
    name: "Deceitful",
    level: 1,
    bucket: "subsystem",
    note: "grants Deceitful as a bonus feat, replaces Track (changes:[], class note 4) — feat grant, no Change",
  },
  "slayer:cleaner:mislead:7": {
    archetypeId: "slayer:cleaner",
    name: "Mislead",
    level: 7,
    bucket: "subsystem",
    note: "at-will self-misdirection SLA, replaces Stalker (changes:[]) — ability grant, no flat number",
  },
  "slayer:cleaner:slayer-talents:0": {
    archetypeId: "slayer:cleaner",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:cleaner:without-a-trace:4": {
    archetypeId: "slayer:cleaner",
    name: "Without a Trace",
    level: 4,
    bucket: "situational",
    note: "real +4 bonus on several checks, but scoped to a location the cleaner has specifically studied and altered — a location-state condition this sheet doesn't track, replaces a slayer talent slot",
  },

  // ── slayer:covenbane ──
  "slayer:covenbane:disrupt-coven:0": {
    archetypeId: "slayer:covenbane",
    name: "Disrupt Coven",
    level: 0,
    bucket: "subsystem",
    note: "denies coven-ally status to anyone the slayer threatens — a rules interaction, no number, replaces Stalker (changes:[])",
  },
  "slayer:covenbane:hag-sense:0": {
    archetypeId: "slayer:covenbane",
    name: "Hag Sense",
    level: 0,
    bucket: "situational",
    note: "real half-level bonus across three skills, but scoped to checks 'to identify, recognize, or track a hag, arcane spellcaster, or creature with spell-like abilities' specifically — not those skills generally, replaces Track (changes:[])",
  },
  "slayer:covenbane:studied-coven:2": {
    archetypeId: "slayer:covenbane",
    name: "Studied Coven",
    level: 2,
    bucket: "subsystem",
    note: "lets one Studied Target designation cover an entire coven — a targeting-rule change with no number of its own, see class note 1; replaces a slayer talent slot",
  },
  "slayer:covenbane:unseen-sense:11": {
    archetypeId: "slayer:covenbane",
    name: "Unseen Sense",
    level: 11,
    bucket: "subsystem",
    note: "extends Hag Sense to invisible/disguised creatures and grants a scoped Blind-Fight bonus feat, replaces Swift Tracker (changes:[]) — ability extension plus a feat grant, no new flat number",
  },

  // ── slayer:cutthroat ──
  "slayer:cutthroat:advanced-slayer-talents:0": {
    archetypeId: "slayer:cutthroat",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:cutthroat:class-skills:0": {
    archetypeId: "slayer:cutthroat",
    name: "Class Skills",
    level: 0,
    bucket: "blocked",
    note: "adds/removes named skills from the slayer's class-skill list — there is no Change target for class-skill-list membership (it isn't in targets.ts's vocabulary at all; the class-skill bonus is driven by the vendored per-class skill list, not a per-archetype override), so nothing here can be expressed even though the effect is real and unconditional",
  },
  "slayer:cutthroat:opportune-target:2": {
    archetypeId: "slayer:cutthroat",
    name: "Opportune Target",
    level: 2,
    bucket: "subsystem",
    note: "lets Studied Target be declared as a free action during a surprise round — an action-economy change riding an unmodeled ability, no number, replaces a slayer talent slot",
  },
  "slayer:cutthroat:slayer-talents:0": {
    archetypeId: "slayer:cutthroat",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:cutthroat:stab-and-grab:6": {
    archetypeId: "slayer:cutthroat",
    name: "Stab and Grab",
    level: 6,
    bucket: "subsystem",
    note: "grants a swift-action steal combat maneuver against a helpless/critically-hit foe — an enemy-facing maneuver grant, no number, replaces a slayer talent slot",
  },
  "slayer:cutthroat:street-stalker:1": {
    archetypeId: "slayer:cutthroat",
    name: "Street Stalker",
    level: 1,
    bucket: "situational",
    note: "real half-level bonus, but scoped to ONE player-chosen skill (Acrobatics, Climb, or Knowledge [local]) and only in urban environments — a chosen-skill-plus-terrain condition, replaces Track (changes:[])",
  },

  // ── slayer:deliverer ──
  "slayer:deliverer:advanced-slayer-talents:0": {
    archetypeId: "slayer:deliverer",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:deliverer:determined-zeal:2": {
    archetypeId: "slayer:deliverer",
    name: "Determined Zeal",
    level: 2,
    bucket: "situational",
    note: "real +2 Will bonus and a Diehard-feat benefit, but only against an opponent whose alignment is at least two steps from the deliverer's own — no formula input for an opponent's alignment gap, replaces a slayer talent slot",
  },
  "slayer:deliverer:divine-anathema:10": {
    archetypeId: "slayer:deliverer",
    name: "Divine Anathema",
    level: 10,
    bucket: "situational",
    note: "real +2d6 damage vs. one declared foe, but only while that foe's alignment is at least two steps from the deliverer's own — same uncheckable condition as Determined Zeal, replaces an advanced talent slot",
  },
  "slayer:deliverer:ex-deliverers:0": {
    archetypeId: "slayer:deliverer",
    name: "Ex-Deliverers",
    level: 0,
    bucket: "subsystem",
    note: "roleplay/code-of-conduct forfeiture clause, no number",
  },
  "slayer:deliverer:slayer-talents:0": {
    archetypeId: "slayer:deliverer",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:deliverer:true-believer:6": {
    archetypeId: "slayer:deliverer",
    name: "True Believer",
    level: 6,
    bucket: "subsystem",
    note: "suppresses the staggered/1-hp-loss-per-round effects of negative hp while under Diehard against a two-alignment-steps-away foe — a conditional immunity, not a modifier this sheet can express, replaces a slayer talent slot",
  },
  "slayer:deliverer:weapon-and-armor-proficiency:0": {
    archetypeId: "slayer:deliverer",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "grants proficiency with the deliverer's deity's favored weapon — proficiency grant, no Change",
  },

  // ── slayer:dune-rider ──
  "slayer:dune-rider:desert-skirmisher:0": {
    archetypeId: "slayer:dune-rider",
    name: "Desert Skirmisher",
    level: 5,
    bucket: "situational",
    note: "real, scaling init/Perception/Stealth/attack/damage bonuses, but only 'while in such terrain' (warm desert, hills, mountains) — terrain state isn't tracked here, replaces Studied Target (changes:[])",
  },
  "slayer:dune-rider:dunes-of-death:20": {
    archetypeId: "slayer:dune-rider",
    name: "Dunes of Death",
    level: 20,
    bucket: "subsystem",
    note: "once-per-24-hours-per-target save-or-die/paralyze attack, replaces Master Slayer (changes:[]) — action/resource-gated ability, not a modifier",
  },
  "slayer:dune-rider:dust-vision:8": {
    archetypeId: "slayer:dune-rider",
    name: "Dust Vision",
    level: 8,
    bucket: "subsystem",
    note: "grants heat tolerance and immunity to sand/dust/heat-shimmer Perception penalties — an immunity to an unmodeled environmental penalty, nothing to counteract with a Change, replaces a slayer talent slot",
  },
  "slayer:dune-rider:galloping-fire:4": {
    archetypeId: "slayer:dune-rider",
    name: "Galloping Fire",
    level: 4,
    bucket: "situational",
    note: "real reduction to mounted ranged-attack penalties, but mounted combat state isn't tracked on this sheet at all — nothing to reduce, replaces Stalker and a slayer talent slot",
  },
  "slayer:dune-rider:sand-foot:0": {
    archetypeId: "slayer:dune-rider",
    name: "Sand Foot",
    level: 11,
    bucket: "situational",
    note: "real half-level Ride bonus and a +10 ft. speed bonus, but both scoped to warm desert/hills/mountains terrain specifically, replaces Track and Fast Tracker",
  },

  // ── slayer:family-hunter ──
  "slayer:family-hunter:disrupt-teamwork:6": {
    archetypeId: "slayer:family-hunter",
    name: "Disrupt Teamwork",
    level: 6,
    bucket: "subsystem",
    note: "denies ally status (for flanking/teamwork feats/aid another) between the studied target and its allies — a rules interaction, no number, replaces a slayer talent slot",
  },
  "slayer:family-hunter:find-family:2": {
    archetypeId: "slayer:family-hunter",
    name: "Find Family",
    level: 2,
    bucket: "subsystem",
    note: "at-will SLA (discern next of kin) against a chosen family line, replaces a slayer talent slot — ability grant, no flat number",
  },
  "slayer:family-hunter:kinslayer:3": {
    archetypeId: "slayer:family-hunter",
    name: "Kinslayer",
    level: 3,
    bucket: "blocked",
    note: "the text explicitly 'alters sneak attack' by adding +1d6 vs. a chosen family line — sneak attack dice have no Change target at all (class note 3), and the bonus is additionally scoped to one specific family line, so there's no way to express even a conditional version safely",
  },
  "slayer:family-hunter:studied-target:5": {
    archetypeId: "slayer:family-hunter",
    name: "Studied Target",
    level: 5,
    bucket: "subsystem",
    note: "restricts holding multiple studied targets to closely-related creatures — a rule change with no number of its own, see class note 1; alters Studied Target (changes:[])",
  },

  // ── slayer:grave-warden ──
  "slayer:grave-warden:advanced-slayer-talents:0": {
    archetypeId: "slayer:grave-warden",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:grave-warden:death-ward:7": {
    archetypeId: "slayer:grave-warden",
    name: "Death Ward",
    level: 7,
    bucket: "subsystem",
    note: "a resource-costed ritual granting death ward, replaces Stalker (changes:[]) — ability grant, no flat number",
  },
  "slayer:grave-warden:dustbringer:10": {
    archetypeId: "slayer:grave-warden",
    name: "Dustbringer",
    level: 10,
    bucket: "subsystem",
    note: "functions as the (unmodeled) Assassinate slayer talent against undead specifically — reflavor of an ability never modeled, replaces an advanced talent slot",
  },
  "slayer:grave-warden:holy-water-sprinkler:2": {
    archetypeId: "slayer:grave-warden",
    name: "Holy Water Sprinkler",
    level: 2,
    bucket: "subsystem",
    note: "a weapon-delivery mechanic for holy water against undead, replaces a slayer talent slot — no flat number",
  },
  "slayer:grave-warden:slayer-talents:0": {
    archetypeId: "slayer:grave-warden",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },

  // ── slayer:guerrilla ──
  "slayer:guerrilla:astonishing-strike:14": {
    archetypeId: "slayer:guerrilla",
    name: "Astonishing Strike",
    level: 14,
    bucket: "subsystem",
    note: "denies a studied target's Dexterity bonus to AC after a surprise-round sneak attack — an enemy-facing condition, not a modifier to the slayer's own sheet, replaces Quarry and Improved Quarry (both changes:[])",
  },
  "slayer:guerrilla:quick-start:6": {
    archetypeId: "slayer:guerrilla",
    name: "Quick Start",
    level: 6,
    bucket: "subsystem",
    note: "allows a full-distance charge during the surprise round — an action-economy rule, no number, replaces a slayer talent slot",
  },
  "slayer:guerrilla:strike-first-strike-last:0": {
    archetypeId: "slayer:guerrilla",
    name: "Strike First, Strike Last",
    level: 0,
    bucket: "situational",
    note: "real half-level bonuses to Stealth (while motionless), sniping penalty reduction, and initiative, but every clause is conditioned on remaining motionless, sniping, or a surprise round where the guerrilla is aware and a foe isn't — no unconditional clause remains, replaces Track and Swift Tracker",
  },

  // ── slayer:pureblade ──
  "slayer:pureblade:aberration-hunter:0": {
    archetypeId: "slayer:pureblade",
    name: "Aberration Hunter",
    level: 0,
    bucket: "subsystem",
    note: "lets the (unmodeled) Studied Target bonus apply retroactively against aberrations without a prior sneak attack, and allows untrained Knowledge (dungeoneering) checks to identify them — no new number, rides an unmodeled ability, replaces Track (changes:[])",
  },
  "slayer:pureblade:aberration-slayer:20": {
    archetypeId: "slayer:pureblade",
    name: "Aberration Slayer",
    level: 20,
    bucket: "subsystem",
    note: "lets the (unmodeled) Master Slayer ability target any aberration, not just a studied one — a targeting-rule change, no number, alters Master Slayer (changes:[])",
  },
  "slayer:pureblade:alien-prescience:2": {
    archetypeId: "slayer:pureblade",
    name: "Alien Prescience",
    level: 2,
    bucket: "subsystem",
    note: "standard-action detect-aberrations SLA, replaces a slayer talent slot — ability grant, no flat number",
  },
  "slayer:pureblade:discern-weakness:7": {
    archetypeId: "slayer:pureblade",
    name: "Discern Weakness",
    level: 7,
    bucket: "subsystem",
    note: "roll-twice-keep-higher on critical-hit confirmation rolls against aberrations — a roll mechanic, not a flat modifier, replaces Stalker (changes:[])",
  },
  "slayer:pureblade:steely-mind:8": {
    archetypeId: "slayer:pureblade",
    name: "Steely Mind",
    level: 8,
    bucket: "numeric",
    note: "a flat, unconditional resistance bonus vs. mind-affecting spells/effects — a clean Change.saveCategories case (same idiom as class-feature-effects.ts's Unchained Heart); the accompanying once-per-day break enchantment SLA is dropped (a separate resource-gated ability, not a number), replaces a slayer talent slot",
  },

  // ── slayer:sczarni-executioner ──
  "slayer:sczarni-executioner:assassinate:10": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Assassinate",
    level: 10,
    bucket: "subsystem",
    note: "forces the (unmodeled) Assassinate slayer talent as the 10th-level advanced talent pick — a pick-list constraint, no number",
  },
  "slayer:sczarni-executioner:bloodstained-hands:0": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Bloodstained Hands",
    level: 0,
    bucket: "subsystem",
    note: "roleplay/alignment restriction, no number",
  },
  "slayer:sczarni-executioner:class-skills:0": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Class Skills",
    level: 0,
    bucket: "blocked",
    note: "adds/removes named skills from the class-skill list — same gap as Cutthroat's Class Skills above: no Change target for class-skill-list membership exists",
  },
  "slayer:sczarni-executioner:focused-killer:1": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Focused Killer",
    level: 1,
    bucket: "situational",
    note: "a real +1/-1 modifier to Studied Target's bonus and DCs depending on the target's humanoid-or-not type — a per-enemy number riding an unmodeled ability, see class note 1; alters Studied Target (changes:[])",
  },
  "slayer:sczarni-executioner:painful-strike:4": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Painful Strike*",
    level: 4,
    bucket: "subsystem",
    note: "forces a Fortitude save on the sneak-attacked target to avoid sickened — an enemy-facing status effect, no number to the slayer's own sheet",
  },
  "slayer:sczarni-executioner:swift-death:14": {
    archetypeId: "slayer:sczarni-executioner",
    name: "Swift Death",
    level: 14,
    bucket: "subsystem",
    note: "1-2/day use of the (unmodeled) Assassinate ability without first studying the target — reflavor of an ability never modeled, replaces Quarry and Improved Quarry (both changes:[])",
  },

  // ── slayer:sniper ──
  "slayer:sniper:accuracy:1": {
    archetypeId: "slayer:sniper",
    name: "Accuracy",
    level: 1,
    bucket: "blocked",
    note: "halves range-increment penalties on ranged attacks — this sheet's attack rolls don't model range increments at all (no engine target for a range-increment penalty, same gap as magus.ts's Hawkeye precedent), replaces Track (changes:[])",
  },
  "slayer:sniper:advanced-slayer-talents:0": {
    archetypeId: "slayer:sniper",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:sniper:deadly-sniper:2": {
    archetypeId: "slayer:sniper",
    name: "Deadly Sniper",
    level: 2,
    bucket: "blocked",
    note: "adds the sniper's level as bonus sneak attack damage and lifts the normal 30-foot ranged-sneak-attack limit against an unaware first-attack target — sneak attack damage has no Change target at all (class note 3), and the bonus is additionally conditional on the target being unaware within the first range increment",
  },
  "slayer:sniper:slayer-talents:0": {
    archetypeId: "slayer:sniper",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },

  // ── slayer:spawn-slayer ──
  "slayer:spawn-slayer:force-vulnerability:20": {
    archetypeId: "slayer:spawn-slayer",
    name: "Force Vulnerability",
    level: 20,
    bucket: "subsystem",
    note: "a standard-action attack that bypasses DR and strips a defensive ability on a failed save, replaces Master Slayer (changes:[]) — an activated, once-per-24-hours-per-target ability, not a modifier",
  },
  "slayer:spawn-slayer:gain-leverage:7": {
    archetypeId: "slayer:spawn-slayer",
    name: "Gain Leverage",
    level: 7,
    bucket: "situational",
    note: "a real CMB/CMD bonus equal to the foe's size modifier, but only against a Large-or-larger studied target — a per-enemy number, see class note 1; replaces Stalker (changes:[])",
  },
  "slayer:spawn-slayer:studied-spawn:0": {
    archetypeId: "slayer:spawn-slayer",
    name: "Studied Spawn",
    level: 5,
    bucket: "situational",
    note: "real, scaling attack/damage/skill/DC bonuses (further scaling by the target's size), but entirely conditioned on a single studied target — a per-enemy number, see class note 1; alters Studied Target (changes:[])",
  },

  // ── slayer:spire-diver ──
  "slayer:spire-diver:diver-s-advance:13": {
    archetypeId: "slayer:spire-diver",
    name: "Diver’s Advance",
    level: 13,
    bucket: "subsystem",
    note: "1-2/day double-swim-speed move action, replaces Slayer's Advance (changes:[]) — resource-gated, no flat number",
  },
  "slayer:spire-diver:diver-s-quarry:0": {
    archetypeId: "slayer:spire-diver",
    name: "Diver’s Quarry",
    level: 14,
    bucket: "subsystem",
    note: "trades Quarry/Improved Quarry's take-10/take-20-while-tracking benefit for the same on Knowledge checks to identify her quarry — a rule swap with no number of its own, alters Quarry and Improved Quarry (both changes:[])",
  },
  "slayer:spire-diver:hold-breath:0": {
    archetypeId: "slayer:spire-diver",
    name: "Hold Breath",
    level: 0,
    bucket: "blocked",
    note: "a real, unconditional +2-rounds-per-level breath-holding duration, but breath-holding endurance isn't tracked anywhere on this sheet — no applied target exists for it, replaces Track (changes:[])",
  },
  "slayer:spire-diver:slayer-talents:0": {
    archetypeId: "slayer:spire-diver",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "grants access to one specific rogue talent as a slayer talent pick — pick-list addition, see class note 2",
  },
  "slayer:spire-diver:studied-target:0": {
    archetypeId: "slayer:spire-diver",
    name: "Studied Target",
    level: 7,
    bucket: "situational",
    note: "real, scaling underwater range-increment bonus for bows/crossbows, but only against her studied target while underwater — a per-enemy, per-environment number, see class note 1; alters Studied Target and Stalker",
  },
  "slayer:spire-diver:swift-swimmer:11": {
    archetypeId: "slayer:spire-diver",
    name: "Swift Swimmer",
    level: 11,
    bucket: "numeric",
    note: "an unconditional swim speed equal to base land speed — the same `swimSpeed`/base/set idiom bloodrager-bloodlines.ts's Serpentine Swim already uses, replaces Swift Tracker (changes:[])",
  },

  // ── slayer:spiritslayer ──
  "slayer:spiritslayer:disrupt-possession:8": {
    archetypeId: "slayer:spiritslayer",
    name: "Disrupt Possession",
    level: 8,
    bucket: "subsystem",
    note: "redirects sneak attack damage to a possessing entity and grants the possessed creature a bonus save to end the possession — an enemy-facing redirect, not a number added to the slayer's own sneak attack total (it explicitly alters WHERE the existing damage lands, not how much), no engine target either way",
  },
  "slayer:spiritslayer:greater-spirit-sense:10": {
    archetypeId: "slayer:spiritslayer",
    name: "Greater Spirit Sense",
    level: 10,
    bucket: "situational",
    note: "grants Greater Blind-Fight (a bonus feat) plus a real half-level Perception bonus, but the Perception bonus is scoped to checks 'to pinpoint the location of ethereal creatures' specifically, and a separate free pinpoint-invisible-creatures check once per round — sub-skill-scoped, same near-miss shape as Hag Sense above",
  },
  "slayer:spiritslayer:improved-spirit-sense:6": {
    archetypeId: "slayer:spiritslayer",
    name: "Improved Spirit Sense",
    level: 6,
    bucket: "situational",
    note: "grants Improved Blind-Fight (a bonus feat) plus a real half-level Perception bonus scoped to checks 'to pinpoint the location of an invisible creature' specifically — sub-skill-scoped",
  },

  // ── slayer:stygian-slayer ──
  "slayer:stygian-slayer:advanced-slayer-talents:0": {
    archetypeId: "slayer:stygian-slayer",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:stygian-slayer:armor-proficiency:0": {
    archetypeId: "slayer:stygian-slayer",
    name: "Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "restricts proficiency to light armor only, no Change",
  },
  "slayer:stygian-slayer:invisibility:4": {
    archetypeId: "slayer:stygian-slayer",
    name: "Invisibility",
    level: 4,
    bucket: "subsystem",
    note: "limited-use-per-day invisibility SLA, replaces a slayer talent slot — resource-gated, no flat number",
  },
  "slayer:stygian-slayer:shadowy-mist-form:10": {
    archetypeId: "slayer:stygian-slayer",
    name: "Shadowy Mist Form",
    level: 10,
    bucket: "subsystem",
    note: "minutes-per-day gaseous-form-plus-fog-cloud SLA, replaces an advanced talent slot — resource-gated, no flat number",
  },
  "slayer:stygian-slayer:slayer-talents:0": {
    archetypeId: "slayer:stygian-slayer",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:stygian-slayer:spell-use:7": {
    archetypeId: "slayer:stygian-slayer",
    name: "Spell Use",
    level: 7,
    bucket: "subsystem",
    note: "grants use of spell completion/trigger items from a fixed spell list, replaces Stalker (changes:[]) — an item-use permission, no flat number",
  },

  // ── slayer:toxic-sniper ──
  "slayer:toxic-sniper:marksman:6": {
    archetypeId: "slayer:toxic-sniper",
    name: "Marksman",
    level: 6,
    bucket: "situational",
    note: "real, scaling sniping-penalty reduction and ranged-sneak-attack-range increase, but both are scoped to 'while sniping' and 'against his studied target' respectively — an activated-stance-plus-per-enemy condition, replaces multiple slayer talent slots",
  },
  "slayer:toxic-sniper:precise-toxin:10": {
    archetypeId: "slayer:toxic-sniper",
    name: "Precise Toxin",
    level: 10,
    bucket: "subsystem",
    note: "trades forgone sneak attack damage for a higher poison DC — a resource-conversion, no flat number to this sheet, replaces a slayer talent slot",
  },
  "slayer:toxic-sniper:scrapper-s-gun:0": {
    archetypeId: "slayer:toxic-sniper",
    name: "Scrapper’s Gun",
    level: 0,
    bucket: "subsystem",
    note: "grants Gunsmithing plus a starting battered gun, replaces Track (changes:[]) — item/feat grant, no Change",
  },
  "slayer:toxic-sniper:sharpshooter-s-study:0": {
    archetypeId: "slayer:toxic-sniper",
    name: "Sharpshooter’s Study",
    level: 0,
    bucket: "subsystem",
    note: "restricts the (unmodeled) Studied Target attack/damage bonus to ranged weapons only — no new number, a scope restriction on an already-unmodeled ability, alters Studied Target (changes:[])",
  },
  "slayer:toxic-sniper:toxic-grit:2": {
    archetypeId: "slayer:toxic-sniper",
    name: "Toxic Grit",
    level: 2,
    bucket: "subsystem",
    note: "grants Amateur Gunslinger as a bonus feat, replaces a slayer talent slot — feat grant, no Change",
  },
  "slayer:toxic-sniper:toxic-shots:4": {
    archetypeId: "slayer:toxic-sniper",
    name: "Toxic Shots",
    level: 4,
    bucket: "subsystem",
    note: "a limited-use-per-day poisoned-ammunition mechanic, replaces a slayer talent slot — resource-gated, no flat number",
  },
  "slayer:toxic-sniper:weapon-and-armor-proficiency:0": {
    archetypeId: "slayer:toxic-sniper",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "restricts proficiency to simple weapons, firearms, and light armor, no Change",
  },

  // ── slayer:turncoat ──
  "slayer:turncoat:double-speak:7": {
    archetypeId: "slayer:turncoat",
    name: "Double Speak",
    level: 7,
    bucket: "subsystem",
    note: "lets Bluff substitute for Diplomacy against a studied target — a skill-substitution rule, no number, replaces Stalker (changes:[])",
  },
  "slayer:turncoat:dubious-recognition:0": {
    archetypeId: "slayer:turncoat",
    name: "Dubious Recognition",
    level: 0,
    bucket: "situational",
    note: "real half-level Sense Motive bonus, but scoped to checks 'to recognize when a creature is lying or attempting to take advantage of' the slayer — not Sense Motive generally, replaces Track (changes:[])",
  },
  "slayer:turncoat:sudden-betrayal:14": {
    archetypeId: "slayer:turncoat",
    name: "Sudden Betrayal",
    level: 14,
    bucket: "situational",
    note: "real, scaling Diplomacy bonus and an auto-crit-confirm effect, but scoped to one chosen target and gated on that target's attitude, once per day — a per-enemy, per-use condition",
  },

  // ── slayer:vanguard ──
  "slayer:vanguard:advanced-slayer-talents:0": {
    archetypeId: "slayer:vanguard",
    name: "Advanced Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:vanguard:ever-ready:7": {
    archetypeId: "slayer:vanguard",
    name: "Ever Ready",
    level: 7,
    bucket: "subsystem",
    note: "guarantees the ability to act in a surprise round — an absolute rules effect, not a modifier, replaces Stalker (changes:[])",
  },
  "slayer:vanguard:lookout:1": {
    archetypeId: "slayer:vanguard",
    name: "Lookout",
    level: 1,
    bucket: "numeric",
    note: "a flat, fully unconditional half-level (minimum 1) bonus to initiative — 'init' is an applied target and nothing scopes this beyond 'initiative checks', replaces Track (changes:[])",
  },
  "slayer:vanguard:slayer-talents:0": {
    archetypeId: "slayer:vanguard",
    name: "Slayer Talents",
    level: 0,
    bucket: "subsystem",
    note: "flavor-text talent-list suggestion, see class note 2",
  },
  "slayer:vanguard:tactician:2": {
    archetypeId: "slayer:vanguard",
    name: "Tactician",
    level: 2,
    bucket: "subsystem",
    note: "grants and shares a teamwork feat with nearby allies — an ally-targeted, resource-gated ability, replaces a slayer talent slot",
  },
  "slayer:vanguard:vanguard-s-bond:4": {
    archetypeId: "slayer:vanguard",
    name: "Vanguard’s Bond",
    level: 4,
    bucket: "subsystem",
    note: "shares half the (unmodeled) Studied Target bonus with nearby allies — the bonus lands on ALLIES, not the vanguard, same ally-targeted carve-out as slayer-talents.ts's Studied Ally, replaces a slayer talent slot",
  },

  // ── slayer:velvet-blade ──
  "slayer:velvet-blade:armor-proficiency:0": {
    archetypeId: "slayer:velvet-blade",
    name: "Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "removes medium armor/shield proficiency, no Change",
  },
  "slayer:velvet-blade:class-skills:0": {
    archetypeId: "slayer:velvet-blade",
    name: "Class Skills",
    level: 0,
    bucket: "blocked",
    note: "swaps named skills on the class-skill list — same gap as Cutthroat's Class Skills above: no Change target for class-skill-list membership exists",
  },
  "slayer:velvet-blade:courtly-graces:0": {
    archetypeId: "slayer:velvet-blade",
    name: "Courtly Graces",
    level: 0,
    bucket: "numeric",
    note: "a flat, fully unconditional half-level (minimum +1) bonus on Knowledge (nobility) checks generally — not scoped to a sub-use of the skill, same shape as slayer-talents.ts's Foil Scrutiny, replaces Track (changes:[])",
  },
  "slayer:velvet-blade:silent-dispatch:11": {
    archetypeId: "slayer:velvet-blade",
    name: "Silent Dispatch",
    level: 11,
    bucket: "subsystem",
    note: "grants the (unmodeled) vigilante silent dispatch talent, replaces Swift Tracker (changes:[]) — talent grant from an unmodeled subsystem, no number",
  },
  "slayer:velvet-blade:studied-socialite:0": {
    archetypeId: "slayer:velvet-blade",
    name: "Studied Socialite",
    level: 0,
    bucket: "subsystem",
    note: "reassigns the (unmodeled) Studied Target bonus onto social/Perception/Stealth checks instead of weapon rolls — a scope reassignment, no new number, alters Studied Target (changes:[])",
  },
  "slayer:velvet-blade:treacherous-blade:7": {
    archetypeId: "slayer:velvet-blade",
    name: "Treacherous Blade",
    level: 7,
    bucket: "blocked",
    note: "grants the Betrayer feat plus a scaling +2d6-and-up sneak attack damage bonus on a first attack against a target that believes her harmless — sneak attack damage has no Change target at all (class note 3), and the bonus is additionally conditional on the target's belief state",
  },

  // ── slayer:witch-killer ──
  "slayer:witch-killer:burn-the-witch:10": {
    archetypeId: "slayer:witch-killer",
    name: "Burn the Witch",
    level: 10,
    bucket: "subsystem",
    note: "limited-use-per-day debuff SLAs targeting an observed arcane caster, replaces a slayer talent slot — resource-gated, no flat number",
  },
  "slayer:witch-killer:class-skills:0": {
    archetypeId: "slayer:witch-killer",
    name: "Class Skills",
    level: 0,
    bucket: "blocked",
    note: "adds named skills to the class-skill list — same gap as Cutthroat's Class Skills above: no Change target for class-skill-list membership exists",
  },
  "slayer:witch-killer:lingering-thrust:4": {
    archetypeId: "slayer:witch-killer",
    name: "Lingering Thrust",
    level: 4,
    bucket: "subsystem",
    note: "raises a caster's concentration-check DC and adds ongoing damage from sneak attack — 'concentration' isn't an applied target (targets.ts), and the effect lands on the enemy's DC, not the slayer's own sheet, replaces a slayer talent slot",
  },
  "slayer:witch-killer:scent-magic:5": {
    archetypeId: "slayer:witch-killer",
    name: "Scent Magic",
    level: 5,
    bucket: "subsystem",
    note: "at-will scent-based detect-arcane-magic ability, no flat number",
  },
  "slayer:witch-killer:studied-witch:0": {
    archetypeId: "slayer:witch-killer",
    name: "Studied Witch",
    level: 0,
    bucket: "situational",
    note: "the (unmodeled) Studied Target bonus now also applies to Spellcraft checks and saves vs. arcane magic, reduced by 1 against a non-arcane target — a real -1 modifier riding an unmodeled ability, see class note 1; alters Studied Target (changes:[])",
  },
  "slayer:witch-killer:superstitous:0": {
    archetypeId: "slayer:witch-killer",
    name: "Superstitous",
    level: 0,
    bucket: "subsystem",
    note: "swaps ranger combat-style feats for a fixed list of barbarian rage powers as slayer talent picks — a pick-list variant, see class note 2",
  },

  // ── slayer:woodland-sniper ──
  "slayer:woodland-sniper:branchwalking:11": {
    archetypeId: "slayer:woodland-sniper",
    name: "Branchwalking",
    level: 11,
    bucket: "numeric",
    note: "an unconditional climb speed equal to base land speed at 11th level — same `climbSpeed`/base/set idiom as Swift Swimmer above; the accompanying 13th-level branch-to-branch DC adjustment is dropped (no engine target for a movement-check DC), replaces Swift Tracker and Slayer's Advance",
  },
  "slayer:woodland-sniper:ranged-sneak-attack:3": {
    archetypeId: "slayer:woodland-sniper",
    name: "Ranged Sneak Attack",
    level: 3,
    bucket: "blocked",
    note: "the text explicitly 'alters sneak attack', replacing it with a ranged-only progression plus a growing range increment — sneak attack dice/range have no Change target at all (class note 3)",
  },
  "slayer:woodland-sniper:still-shot:7": {
    archetypeId: "slayer:woodland-sniper",
    name: "Still Shot",
    level: 7,
    bucket: "situational",
    note: "real half-level Stealth-while-sniping penalty reduction, but conditioned on having tree cover and being in the sniping stance, replaces Stalker (changes:[])",
  },
  "slayer:woodland-sniper:tree-climber:0": {
    archetypeId: "slayer:woodland-sniper",
    name: "Tree Climber",
    level: 0,
    bucket: "situational",
    note: "real half-level bonus on Acrobatics AND Climb, but scoped to checks 'to move between, through, or up trees' specifically — sub-skill-scoped on two skills at once, replaces Track (changes:[])",
  },
};

/**
 * ── SLAYER_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for slayer archetype class features
 * (the prose→Change extraction pipeline, slayer slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 5 of slayer's 133 features
 * cleared the `numeric` bar (see `SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit).
 */
export const SLAYER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Pureblade's "Steely Mind" (People of the Stars) is a flat, unconditional
  // resistance bonus vs. mind-affecting spells/effects — the "mind" save
  // category already means "will save vs. mind-affecting" (save-categories.ts),
  // so target: "allSavingThrows" + saveCategories: ["mind"] is the same idiom
  // class-feature-effects.ts's Unchained Heart uses for near-identical wording.
  // The once-per-day break enchantment SLA in the same paragraph is a separate
  // resource-gated ability, not a number, and is dropped.
  "slayer:pureblade:steely-mind:8": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 16), 6, if(gte(@class.unlevel, 12), 4, 2))",
        target: "allSavingThrows",
        type: "resistance",
        saveCategories: ["mind"],
      },
    ],
    detail: (level) =>
      `+${level >= 16 ? 6 : level >= 12 ? 4 : 2} resistance vs. mind-affecting (break enchantment SLA not modeled)`,
    confidence: "high",
    provenance:
      "At 8th level, a Pureblade gains a +2 resistance bonus on saving throws against " +
      "mind-affecting spells and effects. This bonus increases to +4 at 12th level and +6 at " +
      "16th level.",
  },

  // Vanguard's "Lookout" (Blood of the Night) is a flat, fully unconditional
  // half-level (minimum 1) initiative bonus — "init" is an applied target and
  // nothing in the text scopes this beyond "initiative checks" generally.
  "slayer:vanguard:lookout:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "init")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} initiative`,
    confidence: "high",
    provenance: "At 1st level, a vanguard adds 1/2 his level (minimum 1) to initiative checks.",
  },

  // Velvet Blade's "Courtly Graces" (Blood of the Night) is a flat,
  // unconditional half-level (minimum +1) bonus on Knowledge (nobility)
  // checks generally — a named, unrestricted skill, same shape as
  // slayer-talents.ts's Foil Scrutiny. The provenance quote below preserves
  // the vendored text's own "(nobility checks)" parenthetical exactly as
  // published, typo and all.
  "slayer:velvet-blade:courtly-graces:0": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.kno")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Knowledge (nobility)`,
    confidence: "high",
    provenance:
      "She gains a bonus on Knowledge (nobility checks) equal to half her slayer level " +
      "(minimum +1).",
  },

  // Spire Diver's "Swift Swimmer" (Pathfinder #124: City in the Deep) grants
  // an unconditional swim speed equal to base land speed at 11th level — the
  // same swimSpeed/"base"/"set" idiom bloodrager-bloodlines.ts's Serpentine
  // Swim already establishes for "gain a swim speed equal to your base
  // speed." Replaces Swift Tracker, which carries no vendored Change.
  "slayer:spire-diver:swift-swimmer:11": {
    changes: [
      {
        formula: "@attributes.speed.land.total",
        target: "swimSpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: () => "swim speed = base land speed",
    confidence: "high",
    provenance: "At 11th level, a spire diver gains a swim speed equal to her base speed.",
  },

  // Woodland Sniper's "Branchwalking" (Blood of the Wilds) grants an
  // unconditional climb speed equal to base land speed at 11th level — same
  // idiom as Swift Swimmer above. The separate 13th-level "+5 DC to move
  // between branches" clause has no engine target (a movement-check DC
  // modifier) and is dropped, flagged in detail. Replaces Swift Tracker and
  // Slayer's Advance, neither of which carries a vendored Change.
  "slayer:woodland-sniper:branchwalking:11": {
    changes: [
      {
        formula: "@attributes.speed.land.total",
        target: "climbSpeed",
        type: "base",
        operator: "set",
      },
    ],
    detail: () => "climb speed = base land speed (13th-level branch-DC rule not modeled)",
    confidence: "medium",
    provenance: "At 11th level, the woodland sniper gains a climb speed equal to his base speed.",
  },
};
