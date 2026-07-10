/**
 * Bard's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (documented in
 * `index.ts`), this file owns BOTH of
 * bard's pipeline artifacts — `BARD_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `BARD_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) — so a
 * future wave working on a different class never has a reason to touch this
 * file; only `index.ts` (the aggregator) needs one new import + one new
 * spread per class.
 *
 * Scope: all 70 vendored bard archetypes, 347 features. Bucket rubric is
 * identical to `fighter.ts`'s (numeric / situational / subsystem / blocked —
 * see that file's doc comment for the full definitions), with two bard-
 * specific rules this wave establishes (per the task's process notes, itself
 * derived from the round-2 hand-authored table's Archaeologist finding):
 *
 * 1. **Bardic Performance modifications are always `subsystem`.** At the time
 *    this wave was written, the engine modeled bardic performance only as a
 *    rounds/day resource pool (`resources.ts`), with no generic "activated
 *    performance buff" mechanism — base bard's own Inspire Courage,
 *    Countersong, Fascinate, Versatile Performance, Well-Versed, Lore
 *    Master, and Jack of All Trades class features all carry EMPTY vendored
 *    `changes` in `class-features.json` (still true — that part never
 *    changes). **Update (issue #45 follow-up triage):** a later same-day
 *    commit (`d8dec4b`, after this wave) wired `ClassFeature.grantsBuffs` up
 *    generically — `deriveResourcePools`'s `linkedBuffIds` + the tracker's
 *    `LinkedBuffToggle` (`apps/web`) now DOES let a player toggle base bard's
 *    Inspire Courage on/off (merged onto the Bardic Performance pool,
 *    exactly like Rage; see `packages/engine/test/resources.test.ts` and
 *    `apps/web/test/buffs.test.ts`'s `toggleLinkedBuff` coverage), applying
 *    its real, level-scaled vendored buff. This does NOT change any bucket
 *    below: the toggle only activates an EXISTING vendored `Buff` reached via
 *    `grantsBuffs`, and none of these archetype features grant, reflavor, or
 *    modify a performance via a vendored buff of their own — there is still
 *    no mechanism to hang a NEW or MODIFIED performance on without hand-
 *    authoring a bespoke buff per archetype (the "don't invent one" line).
 *    Any archetype feature that grants a NEW performance, reflavors
 *    an existing one, or changes performance action economy/rounds-cost —
 *    whether or not it's structurally paired via `pairedBaseFeatureUuid` to
 *    one of the ten performance-type base features (Inspire Competence,
 *    Suggestion, Mass Suggestion, Dirge of Doom, Frightening Tune, Inspire
 *    Greatness, Inspire Heroics, Jack of All Trades, Soothing Performance,
 *    Deadly Performance) — is bucketed `subsystem`, full stop, even when its
 *    own prose describes a clean, precisely-scaling number (e.g. Filidh's
 *    Echoes of Nature's Song, Busker's Quick Hands — both real numbers,
 *    both explicitly activated via "bardic performance"/"stunt" mechanics
 *    with no vendored buff of their own to hang the generic toggle on). A
 *    handful of features
 *    happen to be PAIRED to one of those ten uuids purely for suppression
 *    bookkeeping while their own content is NOT a performance at all
 *    (Archaeologist's/Sandman's Trap Sense, Archaeologist's Evasion/Advanced
 *    Talent, Archivist's mis-described Probable Path, Wasteland Chronicler's
 *    Wasteland Specialist) — these are classified by their own content, not
 *    by the blanket performance note; each says so explicitly.
 *
 * 2. **Bardic Knowledge is the one base bard feature with real vendored
 *    numbers** (`max(1, floor(@class.unlevel/2))` on `skill.knowledge`,
 *    confirmed in `class-features.json`) — unlike every other base feature
 *    an archetype might claim to replace. Grepping every vendored bard
 *    archetype feature's `pairedBaseFeatureUuid` against Bardic Knowledge's
 *    own uuid turns up ZERO matches: every single "this replaces bardic
 *    knowledge" claim in the prose is an UNPAIRED swap. That means
 *    `activeArchetypeSwaps` never suppresses Bardic Knowledge for any of
 *    these archetypes today — the same composition trap as monk's Ironskin
 *    Monk (an ambiguous/unpaired swap
 *    displacing a base feature with real vendored `Change`s). This wave's
 *    rule: a bardic-knowledge-replacement whose own bonus touches ANY
 *    Knowledge sub-skill (`skill.knowledge` fans out to every `k*` skill —
 *    `tables.ts`'s `SKILL_GROUPS`) is `blocked` (extracting would double-
 *    count on that sub-skill, since the un-suppressed Bardic Knowledge stays
 *    fully active). A bardic-knowledge-replacement whose bonus does NOT
 *    touch any Knowledge sub-skill is safe to extract as `numeric` — the
 *    pre-existing "Bardic Knowledge itself stays wrongly active" gap is real
 *    but is not worsened by extracting an unrelated, non-overlapping number
 *    (same reasoning the existing hand-verified table already applies to
 *    Sorcerer of Sleep's Pesh Expert / bloodline arcana gap). Two archetypes
 *    (Voice of Brigh's Brigh's Knowledge, Wasteland Chronicler's Wasteland
 *    Knowledge) grant a Knowledge-overlapping bonus WITHOUT claiming to
 *    replace anything at all (no "replaces bardic knowledge" clause) — those
 *    are genuinely additive, and since Bardic Knowledge's own bonus is
 *    `type: "untyped"` (untyped bonuses sum per this engine's typed-stacking
 *    rules, `stacking.ts`), a second untyped Knowledge bonus is a real RAW
 *    stack, not a double-count bug, so those ARE extracted as `numeric`.
 *    9 features landed `blocked` this wave, all via rule 2 (Court Bard's
 *    Heraldic Expertise, Detective's Eye for Detail, Geisha's Geisha
 *    Knowledge, Magician's Magical Talent, Negotiator's Hard Bargainer,
 *    Phrenologist's Phrenological Knowledge, Sea Singer's World Traveler,
 *    Street Performer's Streetwise, Voice of the Wild's Wild Knowledge) —
 *    several of these have a non-Knowledge portion (Perception/Sense Motive,
 *    Spellcraft/UMD, a player-chosen Perform type) that would be safe to
 *    extract in isolation (same "model only the modelable half" posture as
 *    the hand-verified table's Hawkeye entry), but this wave blocks the
 *    whole feature rather than partial-extracting every one, to keep 70
 *    archetypes' worth of judgment calls consistent and reviewable; a future
 *    pass could split these the way this file's Impervious Messenger/
 *    Solacer entries do.
 *
 * Two suspected vendored-data quality issues surfaced (not fixed here, per
 * the task's "report suspects, don't fix" instruction):
 *  - `bard:archivist:probable-path:10`'s description is a VERBATIM,
 *    unedited copy of the base Versatile Performance ability text — not an
 *    actual 10th-level Archivist ability at all. Likely a CSV row
 *    misalignment in the third-party `pf1e-archetypes` compilation.
 *  - `bard:animal-speaker:versatile-performance:2` is the same kind of
 *    verbatim, unedited copy (no archetype-specific edit, no "replaces"
 *    clause) — reads like a reprinted retained feature rather than a real
 *    reflavor.
 *  - `bard:chelish-diva:costume-proficiency-heavy:11`'s description text is
 *    byte-identical to its own L5 Costume Proficiency (Medium) entry (still
 *    says "gains medium armor proficiency..." at the "heavy" tier), and
 *    `bard:court-fool:caper-and-jeer:11`'s description is byte-identical to
 *    its own L5 entry — both read as CSV duplication artifacts (the L11 text
 *    was presumably meant to add a tier/uses-per-day, not restate the
 *    ability verbatim). Neither changes this file's classification (both
 *    buckets are `subsystem` either way), but both are flagged here since a
 *    future data-quality pass might want to backfill the correct L11 text.
 *
 * Methodology note (disclosed, same posture as `fighter.ts`): EVERY feature
 * of every vendored bard archetype was individually read against its full
 * prose (not just regex-scanned) — bard's smaller `situational`/`subsystem`
 * split doesn't rely on a heuristic pass the way fighter's did, because the
 * two bard-specific rules above (bardic-performance / bardic-knowledge-
 * overlap) resolve the large majority of features mechanically and
 * consistently once applied; the remainder were read case-by-case.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const BARD_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "bard:animal-speaker:animal-friend:1": {
    archetypeId: "bard:animal-speaker",
    name: "Animal Friend",
    level: 1,
    bucket: "situational",
    note: "real +4 Handle Animal bonus but scoped to one chosen animal kind and to influence checks only — replaces fascinate (no vendored changes, safe swap) but too narrowly scoped to extract",
  },
  "bard:animal-speaker:attract-rats:6": {
    archetypeId: "bard:animal-speaker",
    name: "Attract Rats",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:animal-speaker:nature-s-speaker:5": {
    archetypeId: "bard:animal-speaker",
    name: "Nature's Speaker",
    level: 5,
    bucket: "subsystem",
    note: "grants at-will speak with animals (spell-like) on chosen animal kinds — no Change-shaped number",
  },
  "bard:animal-speaker:soothing-performance:3": {
    archetypeId: "bard:animal-speaker",
    name: "Soothing Performance",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:animal-speaker:summon-nature-s-ally:1": {
    archetypeId: "bard:animal-speaker",
    name: "Summon Nature's Ally",
    level: 1,
    bucket: "subsystem",
    note: "spell-list/spells-known addition — no Change-shaped number",
  },
  "bard:animal-speaker:versatile-performance:2": {
    archetypeId: "bard:animal-speaker",
    name: "Versatile performance",
    level: 2,
    bucket: "subsystem",
    note: "SUSPECTED VENDORED-DATA ARTIFACT: description is a verbatim copy of the base Versatile Performance text with no archetype-specific edit and no 'replaces' clause — reads like a reprinted retained feature, not an actual reflavor. Nothing to extract.",
  },
  "bard:arcane-duelist:arcane-armor:10": {
    archetypeId: "bard:arcane-duelist",
    name: "Arcane Armor",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:arcane-duelist:arcane-bond:5": {
    archetypeId: "bard:arcane-duelist",
    name: "Arcane Bond",
    level: 5,
    bucket: "subsystem",
    note: "grants wizard-style arcane bond — no Change-shaped number",
  },
  "bard:arcane-duelist:arcane-strike:1": {
    archetypeId: "bard:arcane-duelist",
    name: "Arcane Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants Arcane Strike as a named bonus feat (replaces bardic knowledge) — a specific feat grant isn't expressible via the bonusFeats count target",
  },
  "bard:arcane-duelist:bladethirst:6": {
    archetypeId: "bard:arcane-duelist",
    name: "Bladethirst",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:arcane-duelist:bonus-feat:2": {
    archetypeId: "bard:arcane-duelist",
    name: "Bonus Feat",
    level: 2,
    bucket: "subsystem",
    note: "grants a FIXED schedule of specific named feats (Combat Casting, Disruptive, ...), not a player-chosen count from a restricted list — not expressible via bonusFeats",
  },
  "bard:arcane-duelist:mass-bladethirst:18": {
    archetypeId: "bard:arcane-duelist",
    name: "Mass Bladethirst",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:arcane-duelist:rallying-cry:1": {
    archetypeId: "bard:arcane-duelist",
    name: "Rallying Cry",
    level: 1,
    bucket: "subsystem",
    note: "Intimidate-check-as-save substitution mechanic tied to performance (replaces countersong) — no Change-shaped number",
  },
  "bard:arcane-healer:channel-energy:2": {
    archetypeId: "bard:arcane-healer",
    name: "Channel Energy",
    level: 2,
    bucket: "subsystem",
    note: "grants cleric-style channel energy as a new resource ability — no Change-shaped number",
  },
  "bard:arcane-healer:inspiring-healing-clw:5": {
    archetypeId: "bard:arcane-healer",
    name: "Inspiring Healing (CLW)",
    level: 5,
    bucket: "subsystem",
    note: "spends bardic performance rounds for a spell-like heal — resource conversion, no flat number",
  },
  "bard:archaeologist:advanced-talent:12": {
    archetypeId: "bard:archaeologist",
    name: "Advanced Talent",
    level: 12,
    bucket: "subsystem",
    note: "grants a rogue advanced talent (choice-list) — no Change-shaped number; paired to Advanced Talent's uuid for bookkeeping only",
  },
  "bard:archaeologist:archaeologist-s-luck:1": {
    archetypeId: "bard:archaeologist",
    name: "Archaeologist's Luck",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts (activated luck bonus, not modeled as a Change; recorded there as notes-only)",
  },
  "bard:archaeologist:clever-explorer:2": {
    archetypeId: "bard:archaeologist",
    name: "Clever Explorer",
    level: 2,
    bucket: "numeric",
    note: "extracted — +1/2 class level on Disable Device/Perception, unconditional, replaces versatile performance (no vendored changes, safe swap)",
  },
  "bard:archaeologist:evasion:6": {
    archetypeId: "bard:archaeologist",
    name: "Evasion",
    level: 6,
    bucket: "subsystem",
    note: "grants the rogue evasion mechanic — no Change-shaped number; paired to Suggestion's uuid for bookkeeping only",
  },
  "bard:archaeologist:rogue-talents:4": {
    archetypeId: "bard:archaeologist",
    name: "Rogue Talents",
    level: 4,
    bucket: "subsystem",
    note: "grants a rogue talent (choice-list) — no Change-shaped number",
  },
  "bard:archaeologist:trap-sense:3": {
    archetypeId: "bard:archaeologist",
    name: "Trap Sense",
    level: 3,
    bucket: "situational",
    note: "real Reflex-save/dodge-AC bonus but scoped to traps only — no matching general target; paired to Inspire Competence's uuid for bookkeeping only, not itself a performance",
  },
  "bard:archaeologist:trap-sense:6": {
    archetypeId: "bard:archaeologist",
    name: "Trap Sense",
    level: 6,
    bucket: "situational",
    note: "real Reflex-save/dodge-AC bonus but scoped to traps only — no matching general target; paired to Suggestion's uuid for bookkeeping only, not itself a performance",
  },
  "bard:archaeologist:uncanny-dodge:2": {
    archetypeId: "bard:archaeologist",
    name: "Uncanny Dodge",
    level: 2,
    bucket: "subsystem",
    note: "grants uncanny dodge (can't be caught flat-footed) — a rules mechanic, no Change-shaped number",
  },
  "bard:archivist:jack-of-all-trades:5": {
    archetypeId: "bard:archivist",
    name: "Jack of All Trades",
    level: 5,
    bucket: "subsystem",
    note: "untrained-skill-use/take-10 mechanic — no Change-shaped number",
  },
  "bard:archivist:lamentable-belaborment:6": {
    archetypeId: "bard:archivist",
    name: "Lamentable Belaborment",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:archivist:lore-master-1-day:2": {
    archetypeId: "bard:archivist",
    name: "Lore Master (1/day)",
    level: 2,
    bucket: "subsystem",
    note: "take-20-on-Knowledge-checks mechanic (limited uses/day) — no Change-shaped number",
  },
  "bard:archivist:magic-lore:2": {
    archetypeId: "bard:archivist",
    name: "Magic Lore",
    level: 2,
    bucket: "situational",
    note: "real +1/2-level Spellcraft bonus but scoped to identifying items/deciphering scrolls only, plus save bonuses scoped to magical traps/symbols — no matching general targets",
  },
  "bard:archivist:naturalist:1": {
    archetypeId: "bard:archivist",
    name: "Naturalist",
    level: 1,
    bucket: "situational",
    note: "real +1 insight AC/attack/save bonus but scoped to one specifically-identified monster kind (e.g. 'frost giants') — the static sheet can't track a per-encounter identified-creature-type condition",
  },
  "bard:archivist:pedantic-lecture:18": {
    archetypeId: "bard:archivist",
    name: "Pedantic Lecture",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:archivist:probable-path:10": {
    archetypeId: "bard:archivist",
    name: "Probable Path",
    level: 10,
    bucket: "subsystem",
    note: "SUSPECTED VENDORED-DATA BUG: description is a verbatim, unedited copy of the base Versatile Performance ability text (not this archetype's actual 10th-level ability) — likely a CSV row misalignment in the third-party compilation. Nothing to extract regardless.",
  },
  "bard:argent-voice:dedicated-performance:2": {
    archetypeId: "bard:argent-voice",
    name: "Dedicated Performance",
    level: 2,
    bucket: "subsystem",
    note: "bonus scales with the number of OTHER Perform skills maxed out — depends on the player's own rank investment, not a fixed level-based formula",
  },
  "bard:argent-voice:devilbane-refrain:8": {
    archetypeId: "bard:argent-voice",
    name: "Devilbane Refrain",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:argent-voice:limning-verse:1": {
    archetypeId: "bard:argent-voice",
    name: "Limning Verse",
    level: 1,
    bucket: "subsystem",
    note: "faerie-fire-on-evil-outsiders detection/status effect — not a sheet stat, no Change-shaped number",
  },
  "bard:argent-voice:shattering-crescendo:6": {
    archetypeId: "bard:argent-voice",
    name: "Shattering Crescendo",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:arrowsong-minstrel:arcane-archery:1": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Arcane Archery",
    level: 1,
    bucket: "subsystem",
    note: "adds sorcerer/wizard evocation spells to the spell list + treats bard level as BAB for feat prereqs — no Change-shaped number",
  },
  "bard:arrowsong-minstrel:arrowsong-strike:6": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Arrowsong Strike",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:arrowsong-minstrel:diminished-spellcasting:1": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spells per day by one of each level — no engine target to reduce spell slots (spells-per-day comes from CASTER_MODELS/tables, not collectModifiers)",
  },
  "bard:arrowsong-minstrel:precise-minstrel:2": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Precise Minstrel",
    level: 2,
    bucket: "subsystem",
    note: "grants Precise Shot as a named bonus feat plus a soft-cover-negation rule — no Change-shaped number",
  },
  "bard:arrowsong-minstrel:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap — no Change-shaped number",
  },
  "bard:averaka-arbiter:inspire-teamwork:3": {
    archetypeId: "bard:averaka-arbiter",
    name: "Inspire Teamwork",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:averaka-arbiter:ritual-of-reconciliation:8": {
    archetypeId: "bard:averaka-arbiter",
    name: "Ritual of Reconciliation",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:averaka-arbiter:versatile-teamwork:2": {
    archetypeId: "bard:averaka-arbiter",
    name: "Versatile Teamwork",
    level: 2,
    bucket: "numeric",
    note: "extracted — a countable teamwork-bonus-feat schedule (1 at 2nd, +1 every 4 levels from 6th), same shape as the hand-verified table's ranger Combat-Style-Feat/Crusader precedent; replaces versatile performance and well-versed (no vendored changes, safe swap)",
  },
  "bard:brazen-deceiver:blatant-subtlety:2": {
    archetypeId: "bard:brazen-deceiver",
    name: "Blatant Subtlety",
    level: 2,
    bucket: "subsystem",
    note: "grants Spellsong as a named bonus feat plus a performance-detection-DC rule — no Change-shaped number",
  },
  "bard:brazen-deceiver:deceptive-tale:1": {
    archetypeId: "bard:brazen-deceiver",
    name: "Deceptive Tale",
    level: 1,
    bucket: "subsystem",
    note: "halves the Bluff penalty for unlikely/far-fetched/impossible lies — a DC-reduction mechanic, no Change-shaped number on the bard's own sheet",
  },
  "bard:brazen-deceiver:devil-s-tongue:11": {
    archetypeId: "bard:brazen-deceiver",
    name: "Devil's Tongue",
    level: 11,
    bucket: "subsystem",
    note: "lore-master-style take-10/take-20 mechanic scoped to Bluff — no Change-shaped number",
  },
  "bard:brazen-deceiver:invoke-vyriavaxus:2": {
    archetypeId: "bard:brazen-deceiver",
    name: "Invoke Vyriavaxus",
    level: 2,
    bucket: "subsystem",
    note: "adds specific spells to spells known at fixed levels — no Change-shaped number",
  },
  "bard:brazen-deceiver:shameless-scoundrel:1": {
    archetypeId: "bard:brazen-deceiver",
    name: "Shameless Scoundrel",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Bluff/Disguise/Stealth, unconditional, purely additive (no base feature swapped)",
  },
  "bard:buccaneer:hilt-bash:1": {
    archetypeId: "bard:buccaneer",
    name: "Hilt Bash",
    level: 1,
    bucket: "subsystem",
    note: "lets a lethal weapon deal nonlethal damage with no penalty — a rules exception, no Change-shaped number (replaces bardic knowledge; no overlap either way)",
  },
  "bard:buccaneer:knock-out:5": {
    archetypeId: "bard:buccaneer",
    name: "Knock Out",
    level: 5,
    bucket: "situational",
    note: "real Cha-bonus-to-attack/level-to-damage bonus but only vs. one chosen target per use, activated (swift action, limited uses/day)",
  },
  "bard:buccaneer:mass-song-of-surrender:18": {
    archetypeId: "bard:buccaneer",
    name: "Mass Song of Surrender",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:buccaneer:song-of-surrender:4": {
    archetypeId: "bard:buccaneer",
    name: "Song of Surrender",
    level: 4,
    bucket: "subsystem",
    note: "performance-based enemy-surrender compulsion — no Change-shaped number",
  },
  "bard:busker:busker-stunts:1": {
    archetypeId: "bard:busker",
    name: "Busker Stunts",
    level: 1,
    bucket: "subsystem",
    note: "defines the busker's bardic-performance-equivalent resource pool ('treated as bardic performance') — no Change-shaped number",
  },
  "bard:busker:flexible-performer:1": {
    archetypeId: "bard:busker",
    name: "Flexible Performer",
    level: 1,
    bucket: "subsystem",
    note: "skill-substitution mechanic (Acrobatics/Disguise/Sleight of Hand/Stealth for money checks, Bluff-for-Diplomacy) — no Change-shaped number",
  },
  "bard:busker:impossible-sleight-of-hand:15": {
    archetypeId: "bard:busker",
    name: "Impossible Sleight of Hand",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:busker:inventive-juggler:9": {
    archetypeId: "bard:busker",
    name: "Inventive Juggler",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:busker:living-statue:3": {
    archetypeId: "bard:busker",
    name: "Living Statue",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:busker:patter:1": {
    archetypeId: "bard:busker",
    name: "Patter",
    level: 1,
    bucket: "subsystem",
    note: "stunt-based (performance-equivalent) Will-save compulsion to answer a question — no Change-shaped number",
  },
  "bard:busker:quick-hands:1": {
    archetypeId: "bard:busker",
    name: "Quick Hands",
    level: 1,
    bucket: "subsystem",
    note: "activated stunt (performance-equivalent) granting a scaling Acrobatics/AC/Reflex/attack buff, same shape as Archaeologist's Luck — no generic activated-performance-buff mechanism to hang it on",
  },
  "bard:celebrity:famous:1": {
    archetypeId: "bard:celebrity",
    name: "Famous",
    level: 1,
    bucket: "situational",
    note: "real, precisely-scaling Diplomacy/Intimidate bonus but scoped to a specific home region the static sheet can't track",
  },
  "bard:celebrity:gather-crowd:5": {
    archetypeId: "bard:celebrity",
    name: "Gather Crowd",
    level: 5,
    bucket: "subsystem",
    note: "crowd-size/GM-adjudicated social mechanic — no Change-shaped number",
  },
  "bard:celebrity:shining-star:8": {
    archetypeId: "bard:celebrity",
    name: "Shining Star",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:chelish-diva:costume-proficiency-heavy:11": {
    archetypeId: "bard:chelish-diva",
    name: "Costume Proficiency (Heavy)",
    level: 11,
    bucket: "subsystem",
    note: "grants heavy armor proficiency + arcane-spell-failure negation — no Change-shaped number (vendored description text is identical to the L5 Costume Proficiency (Medium) entry, a likely CSV duplication artifact, but the classification is unaffected)",
  },
  "bard:chelish-diva:costume-proficiency-medium:5": {
    archetypeId: "bard:chelish-diva",
    name: "Costume Proficiency (Medium)",
    level: 5,
    bucket: "subsystem",
    note: "grants medium armor proficiency + arcane-spell-failure negation — no Change-shaped number",
  },
  "bard:chelish-diva:devastating-aria:3": {
    archetypeId: "bard:chelish-diva",
    name: "Devastating Aria",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:chelish-diva:famous:1": {
    archetypeId: "bard:chelish-diva",
    name: "Famous",
    level: 1,
    bucket: "situational",
    note: "real, precisely-scaling Bluff/Intimidate bonus but scoped to a specific home region the static sheet can't track (replaces bardic knowledge; no Knowledge overlap either way)",
  },
  "bard:chelish-diva:prima-donna:2": {
    archetypeId: "bard:chelish-diva",
    name: "Prima Donna",
    level: 2,
    bucket: "subsystem",
    note: "spends extra bardic performance rounds for a +2 Perform/DC bonus on other performances — a performance-economy mechanic, no standalone Change",
  },
  "bard:chelish-diva:scathing-tirade:8": {
    archetypeId: "bard:chelish-diva",
    name: "Scathing Tirade",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:chronicler-of-worlds:amoral-scholar:2": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Amoral Scholar",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to alignment-based spells/effects only — no matching general save target",
  },
  "bard:chronicler-of-worlds:mantra-of-tabris:15": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Mantra of Tabris",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:chronicler-of-worlds:planar-lore:1": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Planar Lore",
    level: 1,
    bucket: "subsystem",
    note: "take-10/take-20-on-Knowledge(planes) mechanic + untrained-Knowledge-checks — no Change-shaped number",
  },
  "bard:chronicler-of-worlds:quintessence-infusion:9": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Quintessence Infusion",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:chronicler-of-worlds:scrivener-s-versatility:2": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Scrivener's Versatility",
    level: 2,
    bucket: "subsystem",
    note: "skill-substitution mechanic (Linguistics bonus in place of a chosen skill) — no Change-shaped number",
  },
  "bard:chronicler-of-worlds:wanderer-s-insight:1": {
    archetypeId: "bard:chronicler-of-worlds",
    name: "Wanderer's Insight",
    level: 1,
    bucket: "subsystem",
    note: "substitutes Intelligence for Charisma across all bard class features — an ability-score-substitution mechanic too broad to model safely via a table entry",
  },
  "bard:court-bard:glorious-epic:8": {
    archetypeId: "bard:court-bard",
    name: "Glorious Epic",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:court-bard:heraldic-expertise:1": {
    archetypeId: "bard:court-bard",
    name: "Heraldic Expertise",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired — no pairedBaseFeatureUuid) with a clean, unconditional +1/2-level bonus on Diplomacy/Knowledge(history)/Knowledge(local)/Knowledge(nobility) — but the Knowledge sub-skills OVERLAP Bardic Knowledge's own skill.knowledge target, and the unpaired swap means Bardic Knowledge stays fully (and incorrectly) active; extracting would double-count on those three Knowledge subskills. Same composition trap as the Ironskin Monk case.",
  },
  "bard:court-bard:mockery:3": {
    archetypeId: "bard:court-bard",
    name: "Mockery",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:court-bard:satire:1": {
    archetypeId: "bard:court-bard",
    name: "Satire",
    level: 1,
    bucket: "subsystem",
    note: "performance-based attack/damage/save debuff aura on enemies who hear the performance (replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:court-bard:scandal:14": {
    archetypeId: "bard:court-bard",
    name: "Scandal",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:court-bard:wide-audience:5": {
    archetypeId: "bard:court-bard",
    name: "Wide Audience",
    level: 5,
    bucket: "subsystem",
    note: "widens the area/target-count of the bard's OTHER performances — a performance-modification, not a standalone number",
  },
  "bard:court-fool:buffoonery:1": {
    archetypeId: "bard:court-fool",
    name: "Buffoonery",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Acrobatics/Bluff/Climb/Disguise, unconditional, purely additive",
  },
  "bard:court-fool:caper-and-jeer:11": {
    archetypeId: "bard:court-fool",
    name: "Caper and Jeer",
    level: 11,
    bucket: "subsystem",
    note: "take-10/take-20 mechanic (vendored description is identical to the L5 Caper and Jeer entry — likely a CSV duplication artifact; the L11 half is presumably meant to add uses/day, not restate the ability) — no Change-shaped number either way",
  },
  "bard:court-fool:caper-and-jeer:5": {
    archetypeId: "bard:court-fool",
    name: "Caper and Jeer",
    level: 5,
    bucket: "subsystem",
    note: "take-10/take-20-on-Acrobatics/Bluff mechanic — no Change-shaped number",
  },
  "bard:court-fool:defuse-tension:3": {
    archetypeId: "bard:court-fool",
    name: "Defuse Tension",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:court-fool:distracting-motley:1": {
    archetypeId: "bard:court-fool",
    name: "Distracting Motley",
    level: 1,
    bucket: "subsystem",
    note: "Acrobatics-check-as-save substitution mechanic for allies — no Change-shaped number",
  },
  "bard:cultivator:nature-lore:3": {
    archetypeId: "bard:cultivator",
    name: "Nature Lore",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:cultivator:plant-magic:1": {
    archetypeId: "bard:cultivator",
    name: "Plant Magic",
    level: 1,
    bucket: "subsystem",
    note: "spell-list addition — no Change-shaped number",
  },
  "bard:cultivator:resist-nature-s-lure:2": {
    archetypeId: "bard:cultivator",
    name: "Resist Nature's Lure",
    level: 2,
    bucket: "situational",
    note: "real +2/+4 save bonus but scoped to fey/nature-lure-style effects specifically — no matching general save target",
  },
  "bard:cultivator:song-of-growth:1": {
    archetypeId: "bard:cultivator",
    name: "Song of Growth",
    level: 1,
    bucket: "subsystem",
    note: "performance-based conjured cover-barrier ability — no Change-shaped number",
  },
  "bard:cultivator:verdant-voice:1": {
    archetypeId: "bard:cultivator",
    name: "Verdant Voice",
    level: 1,
    bucket: "subsystem",
    note: "extends mind-affecting performances to plant-type targets at an extra performance-rounds cost — a performance-economy mechanic",
  },
  "bard:daredevil:agile:1": {
    archetypeId: "bard:daredevil",
    name: "Agile",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Acrobatics/Bluff/Climb/Escape Artist, replaces bardic knowledge; no Knowledge-subskill overlap, so extraction doesn't double-count anything (the separate, pre-existing gap where Bardic Knowledge itself stays unsuppressed on an unpaired swap is a known limitation, not worsened by this entry)",
  },
  "bard:daredevil:canny-foe:2": {
    archetypeId: "bard:daredevil",
    name: "Canny Foe",
    level: 2,
    bucket: "situational",
    note: "real +2 CMB/CMD bonus but scoped to ONE chosen combat maneuver type — same bar as the hand-verified table's Dirty Fighter precedent",
  },
  "bard:daredevil:dauntless:2": {
    archetypeId: "bard:daredevil",
    name: "Dauntless",
    level: 2,
    bucket: "situational",
    note: "real, scaling save bonus but scoped to mind-affecting/fear effects specifically — no matching general save target (fort/ref/will/allSavingThrows would over-apply)",
  },
  "bard:daredevil:derring-do:1": {
    archetypeId: "bard:daredevil",
    name: "Derring-do",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ally buff (Reflex/AC/Dex-skill bonuses, replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:daredevil:scoundrel-s-fortune:5": {
    archetypeId: "bard:daredevil",
    name: "Scoundrel's Fortune",
    level: 5,
    bucket: "situational",
    note: "activated, limited-uses/day reroll ability — not a flat number",
  },
  "bard:dawnflower-dervish:battle-dance:1": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Battle Dance",
    level: 1,
    bucket: "subsystem",
    note: "redefines bardic performance as a self-only, doubled-bonus 'battle dance' — a performance-mechanism change, no standalone Change",
  },
  "bard:dawnflower-dervish:dervish-dance:1": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Dervish Dance",
    level: 1,
    bucket: "subsystem",
    note: "grants Dervish Dance as a named bonus feat (replaces bardic knowledge) — a specific feat grant, not a bonusFeats count",
  },
  "bard:dawnflower-dervish:meditative-whirl:8": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Meditative Whirl",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:dawnflower-dervish:spinning-spellcaster:5": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Spinning Spellcaster",
    level: 5,
    bucket: "situational",
    note: "real +4 concentration bonus but scoped to casting defensively specifically — no matching general target (and 'concentration' is itself an UNAPPLIED_TARGET_LABELS target the engine never consumes)",
  },
  "bard:dawnflower-dervish:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap (scimitar in place of rapier/whip) — no Change-shaped number",
  },
  "bard:demagogue:famous:1": {
    archetypeId: "bard:demagogue",
    name: "Famous",
    level: 1,
    bucket: "situational",
    note: "same regional-fame mechanic as Celebrity's Famous, reflavored to Bluff/Intimidate — scoped to a home region the static sheet can't track (replaces inspire courage +1, no vendored changes to suppress)",
  },
  "bard:demagogue:gather-crowd:5": {
    archetypeId: "bard:demagogue",
    name: "Gather Crowd",
    level: 5,
    bucket: "subsystem",
    note: "crowd-size/GM-adjudicated social mechanic — no Change-shaped number",
  },
  "bard:demagogue:incite-violence:6": {
    archetypeId: "bard:demagogue",
    name: "Incite Violence",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:demagogue:righteous-cause:18": {
    archetypeId: "bard:demagogue",
    name: "Righteous Cause",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:dervish-dancer:battle-dance:1": {
    archetypeId: "bard:dervish-dancer",
    name: "Battle Dance",
    level: 1,
    bucket: "subsystem",
    note: "redefines bardic performance as a self-only 'battle dance' — a performance-mechanism change, no standalone Change",
  },
  "bard:dervish-dancer:battle-fury:20": {
    archetypeId: "bard:dervish-dancer",
    name: "Battle Fury",
    level: 20,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Deadly Performance)",
  },
  "bard:dervish-dancer:dance-of-fury:12": {
    archetypeId: "bard:dervish-dancer",
    name: "Dance of Fury",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:dervish-dancer:fleet:1": {
    archetypeId: "bard:dervish-dancer",
    name: "Fleet",
    level: 1,
    bucket: "situational",
    note: "real, scaling land-speed bonus but only while the battle dance performance is active — conditional on an activated-performance state the engine doesn't toggle",
  },
  "bard:dervish-dancer:leaf-on-the-wind:14": {
    archetypeId: "bard:dervish-dancer",
    name: "Leaf on the Wind",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:dervish-dancer:rain-of-blows:6": {
    archetypeId: "bard:dervish-dancer",
    name: "Rain of Blows",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:dervish-dancer:razor-s-kiss:8": {
    archetypeId: "bard:dervish-dancer",
    name: "Razor's Kiss",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:dervish-dancer:versatile-dance:2": {
    archetypeId: "bard:dervish-dancer",
    name: "Versatile Dance",
    level: 2,
    bucket: "numeric",
    note: "extracted (medium confidence) — +1/2 level on Perform (dance) specifically (a fixed, non-player-chosen Perform subtype), replaces versatile performance (no vendored changes, safe swap); uses the parameterized skill.prf.dance target, same convention as the hand-verified table's skill.crf.alchemy",
  },
  "bard:dervish-dancer:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:dervish-dancer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap (scimitar/kukri in place of rapier/whip) — no Change-shaped number",
  },
  "bard:detective:arcane-insight:2": {
    archetypeId: "bard:detective",
    name: "Arcane Insight",
    level: 2,
    bucket: "situational",
    note: "real +4 save/CL-check bonuses but scoped to illusions/disguises/divination-detection specifically — no matching general target",
  },
  "bard:detective:arcane-investigation:2": {
    archetypeId: "bard:detective",
    name: "Arcane Investigation",
    level: 2,
    bucket: "subsystem",
    note: "adds divination spells to the class spell list — no Change-shaped number",
  },
  "bard:detective:careful-teamwork:1": {
    archetypeId: "bard:detective",
    name: "Careful Teamwork",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ally buff (Initiative/Perception/Disable Device/Reflex/AC, replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:detective:eye-for-detail:1": {
    archetypeId: "bard:detective",
    name: "Eye for Detail",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a clean +1/2-level bonus that includes Knowledge (local) — overlaps Bardic Knowledge's skill.knowledge target the same way Court Bard's Heraldic Expertise does; the Perception/Sense Motive portions would be safe in isolation but aren't split out here (same conservative call as Geisha Knowledge/Magical Talent below)",
  },
  "bard:detective:show-yourselves:15": {
    archetypeId: "bard:detective",
    name: "Show Yourselves",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:detective:true-confession:9": {
    archetypeId: "bard:detective",
    name: "True Confession",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:disciple-of-the-forked-tongue:discordant-spiral:1": {
    archetypeId: "bard:disciple-of-the-forked-tongue",
    name: "Discordant Spiral",
    level: 1,
    bucket: "subsystem",
    note: "performance-based save/concentration-check debuff aura on enemies who hear the performance — no Change-shaped number the bard's own sheet applies",
  },
  "bard:disciple-of-the-forked-tongue:serpent-of-the-mind:2": {
    archetypeId: "bard:disciple-of-the-forked-tongue",
    name: "Serpent of the Mind",
    level: 2,
    bucket: "subsystem",
    note: "adds a curse-descriptor spell to spells known — no Change-shaped number",
  },
  "bard:disciple-of-the-forked-tongue:venomous-whispers:9": {
    archetypeId: "bard:disciple-of-the-forked-tongue",
    name: "Venomous Whispers",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:dragon-herald:coat-of-arms:1": {
    archetypeId: "bard:dragon-herald",
    name: "Coat of Arms",
    level: 1,
    bucket: "subsystem",
    note: "real, unconditional energy-resistance-equal-to-level grant, but the energy type is a player-chosen 'dragon patron' with no build field recording the choice — same unresolvable-free-choice bar as base Weapon Training's own group pick",
  },
  "bard:dragon-herald:diplomatic-immunity:1": {
    archetypeId: "bard:dragon-herald",
    name: "Diplomatic Immunity",
    level: 1,
    bucket: "subsystem",
    note: "performance-based sanctuary effect — no Change-shaped number",
  },
  "bard:dragon-herald:diplomatic-protection:3": {
    archetypeId: "bard:dragon-herald",
    name: "Diplomatic Protection",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:dragon-herald:dragon-patron:1": {
    archetypeId: "bard:dragon-herald",
    name: "Dragon Patron",
    level: 1,
    bucket: "subsystem",
    note: "build-flavor choice (which dragon species/energy type) — no number of its own",
  },
  "bard:dragon-herald:dragon-voice:1": {
    archetypeId: "bard:dragon-herald",
    name: "Dragon Voice",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level on Intimidate/Diplomacy, unconditional, replaces bardic knowledge; no Knowledge-subskill overlap",
  },
  "bard:dragon-herald:extol-glory:10": {
    archetypeId: "bard:dragon-herald",
    name: "Extol Glory",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:dragon-herald:master-of-persuasion:5": {
    archetypeId: "bard:dragon-herald",
    name: "Master of Persuasion",
    level: 5,
    bucket: "subsystem",
    note: "take-10/limited-uses-per-day Diplomacy/Intimidate mechanic — no Change-shaped number",
  },
  "bard:dragon-herald:rebuke-foes:12": {
    archetypeId: "bard:dragon-herald",
    name: "Rebuke Foes",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:dragon-herald:retreat-to-lair:15": {
    archetypeId: "bard:dragon-herald",
    name: "Retreat to Lair",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:dragon-herald:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:dragon-herald",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap — no Change-shaped number",
  },
  "bard:dragon-yapper:frightful-song:8": {
    archetypeId: "bard:dragon-yapper",
    name: "Frightful Song",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:dragon-yapper:yapping-song:1": {
    archetypeId: "bard:dragon-yapper",
    name: "Yapping Song",
    level: 1,
    bucket: "subsystem",
    note: "performance-based attack/damage/save debuff aura on enemies who hear the performance (replaces fascinate) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:duettist:familiar:1": {
    archetypeId: "bard:duettist",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar (replaces bardic knowledge) — no Change-shaped number",
  },
  "bard:duettist:harmonizing-familiar:8": {
    archetypeId: "bard:duettist",
    name: "Harmonizing Familiar",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:duettist:performing-familiar:4": {
    archetypeId: "bard:duettist",
    name: "Performing Familiar",
    level: 4,
    bucket: "subsystem",
    note: "lets the familiar use the bard's performances — a performance-economy mechanic",
  },
  "bard:duettist:symphonic-familiar:14": {
    archetypeId: "bard:duettist",
    name: "Symphonic Familiar",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:duettist:versatile-familiar:2": {
    archetypeId: "bard:duettist",
    name: "Versatile Familiar",
    level: 2,
    bucket: "subsystem",
    note: "extends versatile performance to the familiar — no standalone number",
  },
  "bard:dwarven-scholar:dwarven-training:2": {
    archetypeId: "bard:dwarven-scholar",
    name: "Dwarven Training",
    level: 2,
    bucket: "numeric",
    note: "extracted — a countable bonus-combat-feat schedule (1 at 2nd, +1 every 4 levels from 6th), same shape as the hand-verified table's ranger Combat-Style-Feat/Crusader precedent; purely additive, no base feature swapped",
  },
  "bard:dwarven-scholar:studied-insight:1": {
    archetypeId: "bard:dwarven-scholar",
    name: "Studied Insight",
    level: 1,
    bucket: "subsystem",
    note: "substitutes Wisdom for Charisma across all bard class features — an ability-score-substitution mechanic too broad to model safely via a table entry",
  },
  "bard:dwarven-scholar:war-chant:1": {
    archetypeId: "bard:dwarven-scholar",
    name: "War Chant",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ally combat-feat-sharing ability — no Change-shaped number",
  },
  "bard:faith-singer:devout-spell-knowledge:2": {
    archetypeId: "bard:faith-singer",
    name: "Devout Spell Knowledge",
    level: 2,
    bucket: "subsystem",
    note: "grants a domain spell-like ability — no Change-shaped number",
  },
  "bard:faith-singer:faithful:1": {
    archetypeId: "bard:faith-singer",
    name: "Faithful",
    level: 1,
    bucket: "subsystem",
    note: "deity/alignment restriction — no bonus of its own",
  },
  "bard:fey-courtier:fey-contacts:2": {
    archetypeId: "bard:fey-courtier",
    name: "Fey Contacts",
    level: 2,
    bucket: "subsystem",
    note: "settlement-value/purchase-limit mechanic for magic-item trading in the wilderness — no Change-shaped number",
  },
  "bard:fey-courtier:scorn-of-the-wilds:8": {
    archetypeId: "bard:fey-courtier",
    name: "Scorn of the Wilds",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:fey-courtier:stone-dance:15": {
    archetypeId: "bard:fey-courtier",
    name: "Stone Dance",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:fey-courtier:summon-fey-allies:3": {
    archetypeId: "bard:fey-courtier",
    name: "Summon Fey Allies",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:fey-prankster:dirty-trickster:2": {
    archetypeId: "bard:fey-prankster",
    name: "Dirty Trickster",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a named bonus feat plus a prerequisite-counting rule — no Change-shaped number",
  },
  "bard:fey-prankster:embarrassing-satire:8": {
    archetypeId: "bard:fey-prankster",
    name: "Embarrassing Satire",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:fey-prankster:incite-unreliability:1": {
    archetypeId: "bard:fey-prankster",
    name: "Incite Unreliability",
    level: 1,
    bucket: "subsystem",
    note: "performance-based confusion-effect compulsion — no Change-shaped number",
  },
  "bard:fey-prankster:master-of-mischief:5": {
    archetypeId: "bard:fey-prankster",
    name: "Master of Mischief",
    level: 5,
    bucket: "subsystem",
    note: "take-10/take-20-on-specific-skills mechanic — no Change-shaped number",
  },
  "bard:fey-prankster:mischievous-talent:1": {
    archetypeId: "bard:fey-prankster",
    name: "Mischievous Talent",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Bluff/Disguise/Sleight of Hand/Stealth, unconditional, purely additive",
  },
  "bard:fey-prankster:song-of-clumsiness:1": {
    archetypeId: "bard:fey-prankster",
    name: "Song of Clumsiness",
    level: 1,
    bucket: "subsystem",
    note: "performance-based reflex-save compulsion (drop items/fall prone) — no Change-shaped number",
  },
  "bard:filidh:divinatory-song:6": {
    archetypeId: "bard:filidh",
    name: "Divinatory Song",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:filidh:echoes-of-nature-s-song:1": {
    archetypeId: "bard:filidh",
    name: "Echoes of Nature's Song",
    level: 1,
    bucket: "subsystem",
    note: "explicitly a bardic-performance ability ('can use his bardic performance to imbue his allies') despite an otherwise clean scaling Reflex/AC number — subsystem per the bard bardic-performance rubric",
  },
  "bard:filidh:natural-magic:1": {
    archetypeId: "bard:filidh",
    name: "Natural Magic",
    level: 1,
    bucket: "subsystem",
    note: "converts the bard's spells from arcane to divine — no Change-shaped number",
  },
  "bard:filidh:nature-s-song:1": {
    archetypeId: "bard:filidh",
    name: "Nature's Song",
    level: 1,
    bucket: "subsystem",
    note: "spell-slot-for-bardic-performance-rounds exchange — a resource conversion, not a flat number",
  },
  "bard:filidh:song-of-the-cycle:20": {
    archetypeId: "bard:filidh",
    name: "Song of the Cycle",
    level: 20,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Deadly Performance)",
  },
  "bard:filidh:unity-of-life:15": {
    archetypeId: "bard:filidh",
    name: "Unity of Life",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:filidh:voices-of-life:8": {
    archetypeId: "bard:filidh",
    name: "Voices of Life",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:filidh:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:filidh",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap (wood/no-metal restriction) — no Change-shaped number",
  },
  "bard:first-world-minstrel:echoes-of-the-first-world:1": {
    archetypeId: "bard:first-world-minstrel",
    name: "Echoes of the First World",
    level: 1,
    bucket: "subsystem",
    note: "grants a temporary fey-creature-template special ability — no Change-shaped number",
  },
  "bard:first-world-minstrel:fey-magic:1": {
    archetypeId: "bard:first-world-minstrel",
    name: "Fey Magic",
    level: 1,
    bucket: "subsystem",
    note: "substitutes summon nature's ally for summon monster on the spell list — no Change-shaped number",
  },
  "bard:first-world-minstrel:gremlin-s-luck:8": {
    archetypeId: "bard:first-world-minstrel",
    name: "Gremlin's Luck",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:first-world-minstrel:resist-nature-s-lure:2": {
    archetypeId: "bard:first-world-minstrel",
    name: "Resist Nature's Lure",
    level: 2,
    bucket: "situational",
    note: "grants the druid resist nature's lure class feature — a real +4 save bonus scoped to fey-effect-style saves specifically, no matching general target",
  },
  "bard:first-world-minstrel:wild-empathy:1": {
    archetypeId: "bard:first-world-minstrel",
    name: "Wild Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants the druid wild empathy mechanic — an opposed-check ability, not a tracked sheet stat",
  },
  "bard:flame-dancer:fan-the-flames:8": {
    archetypeId: "bard:flame-dancer",
    name: "Fan the Flames",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:flame-dancer:fire-break:6": {
    archetypeId: "bard:flame-dancer",
    name: "Fire Break",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:flame-dancer:fire-dance:1": {
    archetypeId: "bard:flame-dancer",
    name: "Fire Dance",
    level: 1,
    bucket: "subsystem",
    note: "performance-based fire-save substitution for allies (replaces countersong) — no Change-shaped number",
  },
  "bard:flame-dancer:song-of-the-fiery-gaze:3": {
    archetypeId: "bard:flame-dancer",
    name: "Song of the Fiery Gaze",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:flamesinger:blazing-blades:1": {
    archetypeId: "bard:flamesinger",
    name: "Blazing Blades",
    level: 1,
    bucket: "situational",
    note: "real, scaling bonus fire damage dice on allies' weapon attacks, but a dice-based (not flat-number) bonus tied to hearing the bard perform — not expressible via a flat Change",
  },
  "bard:flamesinger:fire-music:1": {
    archetypeId: "bard:flamesinger",
    name: "Fire Music",
    level: 1,
    bucket: "subsystem",
    note: "grants Fire Music as a named bonus feat plus scaling summon monster spells known — no Change-shaped number",
  },
  "bard:flamesinger:wildfire:2": {
    archetypeId: "bard:flamesinger",
    name: "Wildfire",
    level: 2,
    bucket: "numeric",
    note: "extracted — +5 ft. enhancement bonus to base land speed at 2nd level and every 4 levels thereafter (capped +25 ft. at 18th), unconditional, purely additive",
  },
  "bard:fortune-teller:fortune-teller-s-acumen:2": {
    archetypeId: "bard:fortune-teller",
    name: "Fortune-Teller's Acumen",
    level: 2,
    bucket: "subsystem",
    note: "material-component substitution (+1 CL if forgoing it) — 'cl' is an UNAPPLIED_TARGET_LABELS target the engine never consumes, and the bonus is conditional on a specific casting choice besides",
  },
  "bard:fortune-teller:fortune-teller-s-divinations:1": {
    archetypeId: "bard:fortune-teller",
    name: "Fortune-Teller's Divinations",
    level: 1,
    bucket: "subsystem",
    note: "adds divination spells to the class spell list — no Change-shaped number",
  },
  "bard:fortune-teller:oracular-performance:1": {
    archetypeId: "bard:fortune-teller",
    name: "Oracular Performance",
    level: 1,
    bucket: "subsystem",
    note: "performance-based fortune-reading mechanic that shifts OTHER performances' bonuses by ±1 — a performance-modification, not a standalone number",
  },
  "bard:fortune-teller:transparent-fate:8": {
    archetypeId: "bard:fortune-teller",
    name: "Transparent Fate",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:geisha:geisha-knowledge:1": {
    archetypeId: "bard:geisha",
    name: "Geisha Knowledge",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (nobility) — overlaps Bardic Knowledge's skill.knowledge target; the chosen-Perform-type portion is also an unrecorded player choice. Same composition trap as Court Bard's Heraldic Expertise.",
  },
  "bard:geisha:scribe-scroll:1": {
    archetypeId: "bard:geisha",
    name: "Scribe Scroll",
    level: 1,
    bucket: "subsystem",
    note: "grants Scribe Scroll as a named bonus feat — no Change-shaped number",
  },
  "bard:geisha:tea-ceremony:1": {
    archetypeId: "bard:geisha",
    name: "Tea Ceremony",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ritual to pre-apply other performances — a performance-economy mechanic",
  },
  "bard:geisha:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:geisha",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap (loses normal armor/shield proficiency) — no Change-shaped number",
  },
  "bard:hatharat-agent:called-favor:1": {
    archetypeId: "bard:hatharat-agent",
    name: "Called Favor",
    level: 1,
    bucket: "subsystem",
    note: "roleplay/GM-adjudicated favor mechanic (replaces bardic knowledge) — no Change-shaped number",
  },
  "bard:hatharat-agent:informed-persuasion:2": {
    archetypeId: "bard:hatharat-agent",
    name: "Informed Persuasion",
    level: 2,
    bucket: "situational",
    note: "real Int-modifier-added-to-social-skill bonus but scoped to a specific Knowledge-linked target category the static sheet can't track",
  },
  "bard:hatharat-agent:master-of-manipulation:8": {
    archetypeId: "bard:hatharat-agent",
    name: "Master of Manipulation",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:hoaxer:bad-deal:1": {
    archetypeId: "bard:hoaxer",
    name: "Bad Deal",
    level: 1,
    bucket: "subsystem",
    note: "witch-hex-via-cursed-object mechanic (replaces three performances) — no Change-shaped number",
  },
  "bard:hoaxer:buyer-beware:1": {
    archetypeId: "bard:hoaxer",
    name: "Buyer Beware",
    level: 1,
    bucket: "subsystem",
    note: "performance-based beguiling-gift compulsion — no Change-shaped number",
  },
  "bard:hoaxer:curse-breaker:12": {
    archetypeId: "bard:hoaxer",
    name: "Curse Breaker",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:hoaxer:curse-crafter:5": {
    archetypeId: "bard:hoaxer",
    name: "Curse Crafter",
    level: 5,
    bucket: "subsystem",
    note: "grants an item-creation feat (choice) plus a cursed-item-crafting rule — no Change-shaped number",
  },
  "bard:hoaxer:misery:2": {
    archetypeId: "bard:hoaxer",
    name: "Misery",
    level: 2,
    bucket: "situational",
    note: "real, scaling morale bonus but scoped to attacking creatures already suffering a curse/hex/harmful mind-affecting effect — the static sheet can't check an enemy's condition",
  },
  "bard:hoaxer:personal-guarantee:1": {
    archetypeId: "bard:hoaxer",
    name: "Personal Guarantee",
    level: 1,
    bucket: "subsystem",
    note: "performance-based hex-delay mechanic — no Change-shaped number",
  },
  "bard:hoaxer:versed-in-curses:2": {
    archetypeId: "bard:hoaxer",
    name: "Versed in Curses",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to curses/hexes/language-dependent effects specifically — no matching general save target",
  },
  "bard:impervious-messenger:chant-of-perfect-recall:1": {
    archetypeId: "bard:impervious-messenger",
    name: "Chant of Perfect Recall",
    level: 1,
    bucket: "subsystem",
    note: "performance-based memorize-page utility ability — no Change-shaped number",
  },
  "bard:impervious-messenger:cryptic-whisper:2": {
    archetypeId: "bard:impervious-messenger",
    name: "Cryptic Whisper",
    level: 2,
    bucket: "numeric",
    note: "extracted (medium confidence, partial) — models only the unconditional +1/2-level Linguistics half; the accompanying Bluff bonus is scoped to 'delivering secret messages' specifically and is left unmodeled, same 'model only the modelable half' posture as the hand-verified table's Hawkeye entry",
  },
  "bard:impervious-messenger:song-of-subterfuge:6": {
    archetypeId: "bard:impervious-messenger",
    name: "Song of Subterfuge",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:impervious-messenger:unbroken-stride:8": {
    archetypeId: "bard:impervious-messenger",
    name: "Unbroken Stride",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:juggler:combat-juggling:2": {
    archetypeId: "bard:juggler",
    name: "Combat Juggling",
    level: 2,
    bucket: "subsystem",
    note: "juggling-multiple-items mechanic (free-hand bookkeeping, concentration-check substitution) — no Change-shaped number",
  },
  "bard:juggler:evasion:2": {
    archetypeId: "bard:juggler",
    name: "Evasion",
    level: 2,
    bucket: "subsystem",
    note: "grants rogue evasion — a rules mechanic, no Change-shaped number",
  },
  "bard:juggler:fast-reactions:1": {
    archetypeId: "bard:juggler",
    name: "Fast Reactions",
    level: 1,
    bucket: "subsystem",
    note: "grants Deflect Arrows/Snatch Arrows as named bonus feats (replaces bardic knowledge and lore master) — no Change-shaped number",
  },
  "bard:juggler:improved-evasion:11": {
    archetypeId: "bard:juggler",
    name: "Improved Evasion",
    level: 11,
    bucket: "subsystem",
    note: "grants rogue improved evasion — a rules mechanic, no Change-shaped number",
  },
  "bard:juggler:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:juggler",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap (thrown weapons, no shields) — no Change-shaped number",
  },
  "bard:lotus-geisha:bonus-feat:1": {
    archetypeId: "bard:lotus-geisha",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "grants Spell Focus (enchantment) as a named bonus feat (replaces bardic knowledge and lore master) — no Change-shaped number",
  },
  "bard:lotus-geisha:bonus-feat:5": {
    archetypeId: "bard:lotus-geisha",
    name: "Bonus Feat",
    level: 5,
    bucket: "subsystem",
    note: "grants Greater Spell Focus (enchantment) as a named bonus feat — no Change-shaped number",
  },
  "bard:lotus-geisha:enrapturing-performance-su:2": {
    archetypeId: "bard:lotus-geisha",
    name: "Enrapturing Performance (Su)",
    level: 2,
    bucket: "subsystem",
    note: "grants a single-target performance variant — a performance-mechanism change",
  },
  "bard:lotus-geisha:weapon-and-armor-proficiency:1": {
    archetypeId: "bard:lotus-geisha",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap — no Change-shaped number",
  },
  "bard:luring-piper:charming-melody:1": {
    archetypeId: "bard:luring-piper",
    name: "Charming Melody",
    level: 1,
    bucket: "subsystem",
    note: "modifies the fascinate performance's effect on animals/fey — a performance-modification",
  },
  "bard:luring-piper:deadly-lure:8": {
    archetypeId: "bard:luring-piper",
    name: "Deadly Lure",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:luring-piper:fey-secrets:1": {
    archetypeId: "bard:luring-piper",
    name: "Fey Secrets",
    level: 1,
    bucket: "situational",
    note: "real +1/2-level bonus on 5 skills but scoped to 'when interacting with fey' specifically — the static sheet can't check the interaction target's creature type",
  },
  "bard:luring-piper:fey-wounding-song:12": {
    archetypeId: "bard:luring-piper",
    name: "Fey-Wounding Song",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:luring-piper:luring-presentation:1": {
    archetypeId: "bard:luring-piper",
    name: "Luring Presentation",
    level: 1,
    bucket: "situational",
    note: "real ±2 save penalty/bonus but scoped by the TARGET's creature type (animal/fey vs. everything else) — the static sheet can't check an opponent's type",
  },
  "bard:luring-piper:piper-s-attention:2": {
    archetypeId: "bard:luring-piper",
    name: "Piper's Attention",
    level: 2,
    bucket: "subsystem",
    note: "real +4 save bonus but conditional on actively using a specific Perform type as part of an active bardic performance — a performance-state condition",
  },
  "bard:magician:arcane-bond:5": {
    archetypeId: "bard:magician",
    name: "Arcane Bond",
    level: 5,
    bucket: "subsystem",
    note: "grants wizard-style arcane bond — no Change-shaped number",
  },
  "bard:magician:dweomercraft:1": {
    archetypeId: "bard:magician",
    name: "Dweomercraft",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ally CL-check/concentration/spell-attack buff (replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:magician:expanded-repertoire:2": {
    archetypeId: "bard:magician",
    name: "Expanded Repertoire",
    level: 2,
    bucket: "subsystem",
    note: "adds a player-chosen arcane spell to spells known — no Change-shaped number",
  },
  "bard:magician:extended-performance:2": {
    archetypeId: "bard:magician",
    name: "Extended Performance",
    level: 2,
    bucket: "subsystem",
    note: "extends a performance's duration by sacrificing a spell slot — a resource conversion, not a flat number",
  },
  "bard:magician:improved-counterspell:1": {
    archetypeId: "bard:magician",
    name: "Improved Counterspell",
    level: 1,
    bucket: "subsystem",
    note: "grants Improved Counterspell as a named bonus feat (replaces countersong) — no Change-shaped number",
  },
  "bard:magician:magical-talent:1": {
    archetypeId: "bard:magician",
    name: "Magical Talent",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (arcana) — overlaps Bardic Knowledge's skill.knowledge target; the Spellcraft/UMD portions would be safe in isolation but aren't split out here (same conservative call as Geisha Knowledge/Eye for Detail)",
  },
  "bard:magician:metamagic-mastery:14": {
    archetypeId: "bard:magician",
    name: "Metamagic Mastery",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:magician:spell-suppression:8": {
    archetypeId: "bard:magician",
    name: "Spell Suppression",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:magician:wand-mastery:10": {
    archetypeId: "bard:magician",
    name: "Wand Mastery",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:masked-performer:dual-identity:1": {
    archetypeId: "bard:masked-performer",
    name: "Dual Identity",
    level: 1,
    bucket: "subsystem",
    note: "grants the vigilante dual-identity mechanic — no Change-shaped number",
  },
  "bard:masked-performer:exaggerated-pose:3": {
    archetypeId: "bard:masked-performer",
    name: "Exaggerated Pose",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:masked-performer:masked-talent:5": {
    archetypeId: "bard:masked-performer",
    name: "Masked Talent",
    level: 5,
    bucket: "subsystem",
    note: "grants a rogue-talent-style choice from a fixed list — no Change-shaped number",
  },
  "bard:masked-performer:multiplicity-of-masks:18": {
    archetypeId: "bard:masked-performer",
    name: "Multiplicity of Masks",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:masked-performer:seamless-guise:1": {
    archetypeId: "bard:masked-performer",
    name: "Seamless Guise",
    level: 1,
    bucket: "subsystem",
    note: "performance-based Disguise/Perform(act) bonus while maintaining character — a performance-mechanism",
  },
  "bard:masked-performer:social-grace:2": {
    archetypeId: "bard:masked-performer",
    name: "Social Grace",
    level: 2,
    bucket: "subsystem",
    note: "grants a vigilante social talent (choice) — no Change-shaped number",
  },
  "bard:masked-performer:stage-combat:6": {
    archetypeId: "bard:masked-performer",
    name: "Stage Combat",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:mute-musician:ceaseless-performance:15": {
    archetypeId: "bard:mute-musician",
    name: "Ceaseless Performance",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:mute-musician:dulled-horror:2": {
    archetypeId: "bard:mute-musician",
    name: "Dulled Horror",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to confusion/fear/insanity/aberration-Su effects specifically — no matching general save target",
  },
  "bard:mute-musician:eldritch-caesura:10": {
    archetypeId: "bard:mute-musician",
    name: "Eldritch Caesura",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:mute-musician:eschew-materials:1": {
    archetypeId: "bard:mute-musician",
    name: "Eschew Materials",
    level: 1,
    bucket: "subsystem",
    note: "grants Eschew Materials as a named bonus feat — no Change-shaped number",
  },
  "bard:mute-musician:insights-from-beyond:2": {
    archetypeId: "bard:mute-musician",
    name: "Insights from Beyond",
    level: 2,
    bucket: "subsystem",
    note: "adds player-chosen spells to spells known — no Change-shaped number",
  },
  "bard:mute-musician:maddening-harmonics:14": {
    archetypeId: "bard:mute-musician",
    name: "Maddening Harmonics",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:mute-musician:mute:1": {
    archetypeId: "bard:mute-musician",
    name: "Mute",
    level: 1,
    bucket: "subsystem",
    note: "roleplay restriction (cannot speak) with a communication-mode workaround — no bonus of its own",
  },
  "bard:mute-musician:song-of-the-conjunction:18": {
    archetypeId: "bard:mute-musician",
    name: "Song of the Conjunction",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:mute-musician:symphony-of-silence:3": {
    archetypeId: "bard:mute-musician",
    name: "Symphony of Silence",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:negotiator:advanced-talents:10": {
    archetypeId: "bard:negotiator",
    name: "Advanced Talents",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:negotiator:binding-contract:9": {
    archetypeId: "bard:negotiator",
    name: "Binding Contract",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:negotiator:fast-talk:1": {
    archetypeId: "bard:negotiator",
    name: "Fast Talk",
    level: 1,
    bucket: "subsystem",
    note: "performance-based enchantment/illusion save debuff plus an Appraise-check debuff on listeners (replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:negotiator:hard-bargainer:1": {
    archetypeId: "bard:negotiator",
    name: "Hard Bargainer",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (local) — overlaps Bardic Knowledge's skill.knowledge target. Same composition trap as Court Bard's Heraldic Expertise.",
  },
  "bard:negotiator:master-of-rhetoric:5": {
    archetypeId: "bard:negotiator",
    name: "Master of Rhetoric",
    level: 5,
    bucket: "subsystem",
    note: "take-10/take-20-on-specific-skills mechanic — no Change-shaped number",
  },
  "bard:negotiator:rogue-talent:2": {
    archetypeId: "bard:negotiator",
    name: "Rogue Talent",
    level: 2,
    bucket: "subsystem",
    note: "grants a rogue talent (choice-list, excluding sneak-attack-modifying talents) — no Change-shaped number",
  },
  "bard:phrenologist:fingers-of-fascination:1": {
    archetypeId: "bard:phrenologist",
    name: "Fingers of Fascination",
    level: 1,
    bucket: "subsystem",
    note: "modifies the fascinate performance to also study a target with a skill unlock — a performance-modification",
  },
  "bard:phrenologist:in-your-head:3": {
    archetypeId: "bard:phrenologist",
    name: "In Your Head",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:phrenologist:phrenological-knowledge:1": {
    archetypeId: "bard:phrenologist",
    name: "Phrenological Knowledge",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a Knowledge(arcana) bonus that ALSO overlaps Bardic Knowledge's own skill.knowledge target (and is additionally scoped to the phrenology skill-unlock use-case specifically) — doubly disqualified",
  },
  "bard:phrenologist:phrenological-savant:10": {
    archetypeId: "bard:phrenologist",
    name: "Phrenological Savant",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:phrenologist:skull-sonata:1": {
    archetypeId: "bard:phrenologist",
    name: "Skull Sonata",
    level: 1,
    bucket: "subsystem",
    note: "performance-based bonus sonic damage aura scoped to enemies 'with skulls' — a dice/aura effect, no flat Change-shaped number",
  },
  "bard:phrenologist:skull-versed:2": {
    archetypeId: "bard:phrenologist",
    name: "Skull-Versed",
    level: 2,
    bucket: "subsystem",
    note: "-2 enemy save penalty contingent on a prior phrenology skill-unlock use against that specific creature — a per-encounter conditional, no sheet stat",
  },
  "bard:pitax-academy-of-grand-arts:focused-performance:2": {
    archetypeId: "bard:pitax-academy-of-grand-arts",
    name: "Focused Performance",
    level: 2,
    bucket: "subsystem",
    note: "grants Extra Performance as a named bonus feat restricted to one chosen Perform category — no Change-shaped number",
  },
  "bard:plant-speaker:leshy-speaker:9": {
    archetypeId: "bard:plant-speaker",
    name: "Leshy Speaker",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:plant-speaker:mystical-allegory:5": {
    archetypeId: "bard:plant-speaker",
    name: "Mystical Allegory",
    level: 5,
    bucket: "subsystem",
    note: "performance-based augury/divination/legend-lore spell-like grant — no Change-shaped number",
  },
  "bard:plant-speaker:plant-speech:1": {
    archetypeId: "bard:plant-speaker",
    name: "Plant Speech",
    level: 1,
    bucket: "subsystem",
    note: "extends mind-affecting effects to plants and racial plant-speech range — no Change-shaped number",
  },
  "bard:prankster:mass-punchline:18": {
    archetypeId: "bard:prankster",
    name: "Mass Punchline",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:prankster:mock:1": {
    archetypeId: "bard:prankster",
    name: "Mock",
    level: 1,
    bucket: "subsystem",
    note: "performance-based attack/skill-check debuff compulsion on enemies (replaces fascinate) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:prankster:punchline:6": {
    archetypeId: "bard:prankster",
    name: "Punchline",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:prankster:swap:2": {
    archetypeId: "bard:prankster",
    name: "Swap",
    level: 2,
    bucket: "subsystem",
    note: "steal-combat-maneuver substitution mechanic (Sleight of Hand in place of CMB check) — no Change-shaped number",
  },
  "bard:provocateur:calumny:2": {
    archetypeId: "bard:provocateur",
    name: "Calumny",
    level: 2,
    bucket: "subsystem",
    note: "skill-substitution mechanic (Perform in place of Bluff/Diplomacy/Intimidate for specific social actions) — no Change-shaped number",
  },
  "bard:provocateur:damning-performance:18": {
    archetypeId: "bard:provocateur",
    name: "Damning Performance",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:provocateur:damning-performance:4": {
    archetypeId: "bard:provocateur",
    name: "Damning Performance",
    level: 4,
    bucket: "subsystem",
    note: "performance-based attitude/influence/trust debuff on observers (Ultimate Intrigue subsystems not modeled) — no Change-shaped number",
  },
  "bard:provocateur:provocateur:1": {
    archetypeId: "bard:provocateur",
    name: "Provocateur",
    level: 1,
    bucket: "subsystem",
    note: "bonus scoped to Ultimate Intrigue's influence/attitude-reduction skill checks — no engine target for those subsystems",
  },
  "bard:ringleader:countless-contingencies:6": {
    archetypeId: "bard:ringleader",
    name: "Countless Contingencies",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:ringleader:cunning-plan:1": {
    archetypeId: "bard:ringleader",
    name: "Cunning Plan",
    level: 1,
    bucket: "subsystem",
    note: "banks a bardic performance to trigger later — a performance-economy mechanic",
  },
  "bard:ringleader:hidden-plans:2": {
    archetypeId: "bard:ringleader",
    name: "Hidden Plans",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to mind-reading/compelled-truth effects specifically — no matching general save target",
  },
  "bard:ringleader:inspire-competence:3": {
    archetypeId: "bard:ringleader",
    name: "Inspire competence",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:ringleader:inspired-plan:2": {
    archetypeId: "bard:ringleader",
    name: "Inspired Plan",
    level: 2,
    bucket: "subsystem",
    note: "delays/redirects a banked performance to a single ally later — a performance-economy mechanic",
  },
  "bard:ringleader:never-lose-face:2": {
    archetypeId: "bard:ringleader",
    name: "Never Lose Face",
    level: 2,
    bucket: "situational",
    note: "real +2 save bonus but scoped to effects that also target one or more allies — a per-encounter condition the static sheet can't check",
  },
  "bard:ringleader:prepared:5": {
    archetypeId: "bard:ringleader",
    name: "Prepared",
    level: 5,
    bucket: "subsystem",
    note: "retroactive gear-purchase mechanic (Knowledge check to have bought an item in advance) — no Change-shaped number",
  },
  "bard:ringleader:sinister-mien:2": {
    archetypeId: "bard:ringleader",
    name: "Sinister Mien",
    level: 2,
    bucket: "subsystem",
    note: "Intimidate-for-Perform substitution plus a named bonus feat (Dazzling Display) — no Change-shaped number",
  },
  "bard:sandman:dramatic-subtext:9": {
    archetypeId: "bard:sandman",
    name: "Dramatic Subtext",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:sandman:greater-stealspell:15": {
    archetypeId: "bard:sandman",
    name: "Greater Stealspell",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:sandman:mass-slumber-song:18": {
    archetypeId: "bard:sandman",
    name: "Mass Slumber Song",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:sandman:master-of-deception:1": {
    archetypeId: "bard:sandman",
    name: "Master of Deception",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level on Bluff/Sleight of Hand/Stealth, unconditional, replaces bardic knowledge; no Knowledge-subskill overlap",
  },
  "bard:sandman:slumber-song:6": {
    archetypeId: "bard:sandman",
    name: "Slumber Song",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:sandman:sneak-attack:5": {
    archetypeId: "bard:sandman",
    name: "Sneak Attack",
    level: 5,
    bucket: "situational",
    note: "real, scaling bonus damage dice but conditional on flanking/denied-Dex and a dice-based (not flat-number) bonus",
  },
  "bard:sandman:sneakspell:2": {
    archetypeId: "bard:sandman",
    name: "Sneakspell",
    level: 2,
    bucket: "situational",
    note: "real DC/CL-check bonuses but scoped to opponents denied their Dex bonus specifically — no matching general target, and the CL-vs-SR half targets an UNAPPLIED_TARGET_LABELS target ('cl') the engine never consumes",
  },
  "bard:sandman:spell-catching:20": {
    archetypeId: "bard:sandman",
    name: "Spell Catching",
    level: 20,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Deadly Performance)",
  },
  "bard:sandman:stealspell:1": {
    archetypeId: "bard:sandman",
    name: "Stealspell",
    level: 1,
    bucket: "subsystem",
    note: "performance-based spell-theft mechanic (replaces inspire courage) — no Change-shaped number",
  },
  "bard:sandman:trap-sense:3": {
    archetypeId: "bard:sandman",
    name: "Trap Sense",
    level: 3,
    bucket: "situational",
    note: "real Reflex-save bonus but scoped to traps only — no matching general target; paired to Inspire Competence's uuid for bookkeeping only, not itself a performance",
  },
  "bard:savage-skald:battle-song:18": {
    archetypeId: "bard:savage-skald",
    name: "Battle Song",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:savage-skald:berserkergang:12": {
    archetypeId: "bard:savage-skald",
    name: "Berserkergang",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:savage-skald:incite-rage:6": {
    archetypeId: "bard:savage-skald",
    name: "Incite Rage",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:savage-skald:inspiring-blow:1": {
    archetypeId: "bard:savage-skald",
    name: "Inspiring Blow",
    level: 1,
    bucket: "subsystem",
    note: "crit-triggered temp-HP/ally-attack-bonus performance (replaces fascinate) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:savage-skald:song-of-the-fallen:10": {
    archetypeId: "bard:savage-skald",
    name: "Song of the Fallen",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:sea-singer:call-the-storm:18": {
    archetypeId: "bard:sea-singer",
    name: "Call the Storm",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:sea-singer:familiar:2": {
    archetypeId: "bard:sea-singer",
    name: "Familiar",
    level: 2,
    bucket: "subsystem",
    note: "grants a familiar (replaces versatile performance) — no Change-shaped number",
  },
  "bard:sea-singer:sea-legs:2": {
    archetypeId: "bard:sea-singer",
    name: "Sea Legs",
    level: 2,
    bucket: "situational",
    note: "real save/CMD bonuses but scoped to air/water effects and specific maneuvers (grapple/overrun/trip) — no matching general target",
  },
  "bard:sea-singer:sea-shanty:1": {
    archetypeId: "bard:sea-singer",
    name: "Sea Shanty",
    level: 1,
    bucket: "subsystem",
    note: "performance-based save substitution for allies vs. exhaustion/fatigue/nausea/sickness (replaces countersong) — no Change-shaped number",
  },
  "bard:sea-singer:still-water:3": {
    archetypeId: "bard:sea-singer",
    name: "Still Water",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:sea-singer:whistle-the-wind:6": {
    archetypeId: "bard:sea-singer",
    name: "Whistle the Wind",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:sea-singer:world-traveler:1": {
    archetypeId: "bard:sea-singer",
    name: "World Traveler",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (geography)/Knowledge (local)/Knowledge (nature) — overlaps Bardic Knowledge's skill.knowledge target. Same composition trap as Court Bard's Heraldic Expertise.",
  },
  "bard:shadow-puppeteer:bardic-performance:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Bardic performance",
    level: 1,
    bucket: "subsystem",
    note: "grants entirely new performance types (replaces inspire courage/inspire competence) — no Change-shaped number",
  },
  "bard:shadow-puppeteer:shadow-puppets-sp:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Puppets (Sp)",
    level: 1,
    bucket: "subsystem",
    note: "performance-based summon-monster-as-shadow-conjuration spell-like — no Change-shaped number",
  },
  "bard:shadow-puppeteer:shadow-servant-sp:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Servant (Sp)",
    level: 1,
    bucket: "subsystem",
    note: "grants an unseen-servant-equivalent spell-like ability — no Change-shaped number",
  },
  "bard:silver-balladeer:bardic-performance:1": {
    archetypeId: "bard:silver-balladeer",
    name: "Bardic performance",
    level: 1,
    bucket: "subsystem",
    note: "grants entirely new (silver-instrument-gated) performance types — no Change-shaped number",
  },
  "bard:silver-balladeer:break-curse-su:6": {
    archetypeId: "bard:silver-balladeer",
    name: "Break Curse (Su)",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:silver-balladeer:holy-vibration-su:9": {
    archetypeId: "bard:silver-balladeer",
    name: "Holy Vibration (Su)",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:silver-balladeer:mass-break-curse-su:18": {
    archetypeId: "bard:silver-balladeer",
    name: "Mass Break Curse (Su)",
    level: 18,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Mass Suggestion)",
  },
  "bard:silver-balladeer:pure-heart-ex:2": {
    archetypeId: "bard:silver-balladeer",
    name: "Pure Heart (Ex)",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to curses/hexes/charm effects specifically — no matching general save target",
  },
  "bard:silver-balladeer:silver-mastery-su:2": {
    archetypeId: "bard:silver-balladeer",
    name: "Silver Mastery (Su)",
    level: 2,
    bucket: "situational",
    note: "real +1 attack bonus but scoped to mithral weapons specifically, plus a DR-bypass rule for silver weapons — narrower than the hand-verified table's weapon-group bar",
  },
  "bard:solacer:creative-treatment-su:2": {
    archetypeId: "bard:solacer",
    name: "Creative Treatment (Su)",
    level: 2,
    bucket: "subsystem",
    note: "reroll-on-failed-Heal-check mechanic plus a Horror Adventures sanity-system substitution (subsystem this app doesn't model) — no Change-shaped number",
  },
  "bard:solacer:inspire-tenacity-su:1": {
    archetypeId: "bard:solacer",
    name: "Inspire Tenacity (Su)",
    level: 1,
    bucket: "subsystem",
    note: "performance-based ally stabilize/save-bonus ability — no Change-shaped number the bard's own sheet applies",
  },
  "bard:solacer:invigorating-artistry:10": {
    archetypeId: "bard:solacer",
    name: "Invigorating Artistry",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:solacer:learned-physician:1": {
    archetypeId: "bard:solacer",
    name: "Learned Physician",
    level: 1,
    bucket: "numeric",
    note: "extracted (partial) — models only the unconditional +1/2-level (min 1) Heal bonus; the accompanying untrained-Knowledge-checks/take-10/take-20 mechanics are left unmodeled (no Change-shaped number for those parts)",
  },
  "bard:songhealer:enhance-healing-su:2": {
    archetypeId: "bard:songhealer",
    name: "Enhance Healing (Su)",
    level: 2,
    bucket: "subsystem",
    note: "boosts the caster level of healing spell-completion/trigger items used — 'cl' is an UNAPPLIED_TARGET_LABELS target the engine never consumes, and the effect is scoped to specific item types besides",
  },
  "bard:songhealer:healing-performance-su:14": {
    archetypeId: "bard:songhealer",
    name: "Healing Performance (Su)",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:sorrowsoul:darkness-denied-ex:2": {
    archetypeId: "bard:sorrowsoul",
    name: "Darkness Denied (Ex)",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to negative energy/death effects specifically — no matching general save target",
  },
  "bard:sorrowsoul:lyric-sorrow-su:1": {
    archetypeId: "bard:sorrowsoul",
    name: "Lyric Sorrow (Su)",
    level: 1,
    bucket: "subsystem",
    note: "entirely a bardic-performance modification (doubles performance costs for boosted effects on specific performances) — no Change-shaped number",
  },
  "bard:sorrowsoul:spurn-harm:5": {
    archetypeId: "bard:sorrowsoul",
    name: "Spurn Harm",
    level: 5,
    bucket: "subsystem",
    note: "activated, performance-rounds-gated save/SR/DR grant — a resource conversion, not a flat number",
  },
  "bard:sound-striker:weird-words-su:6": {
    archetypeId: "bard:sound-striker",
    name: "Weird Words (Su)",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:sound-striker:wordstrike-su:3": {
    archetypeId: "bard:sound-striker",
    name: "Wordstrike (Su)",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:speaker-of-the-palatine-eye:angelic-grace-ex:1": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Angelic Grace (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "class-skill swap plus a bonus language — no Change-shaped number",
  },
  "bard:speaker-of-the-palatine-eye:corpse-speaker-su:1": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Corpse Speaker (Su)",
    level: 1,
    bucket: "subsystem",
    note: "ventriloquism-style illusion spell-like ability — no Change-shaped number",
  },
  "bard:speaker-of-the-palatine-eye:keen-ritualist:10": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Keen Ritualist",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:stonesinger:earth-magic:1": {
    archetypeId: "bard:stonesinger",
    name: "Earth Magic",
    level: 1,
    bucket: "subsystem",
    note: "conditional Eschew Materials (while touching stone) plus a spell-list addition — no Change-shaped number",
  },
  "bard:stonesinger:quake:8": {
    archetypeId: "bard:stonesinger",
    name: "Quake",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:stonesinger:stone-song:1": {
    archetypeId: "bard:stonesinger",
    name: "Stone Song",
    level: 1,
    bucket: "subsystem",
    note: "redefines bardic performance as a tremorsense-perceived vibration — a performance-mechanism change",
  },
  "bard:stonesinger:tremor:1": {
    archetypeId: "bard:stonesinger",
    name: "Tremor",
    level: 1,
    bucket: "subsystem",
    note: "performance-based AC-penalty aura on enemies (as part of another performance) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:street-performer:disappearing-act:1": {
    archetypeId: "bard:street-performer",
    name: "Disappearing Act",
    level: 1,
    bucket: "subsystem",
    note: "performance-based single-target invisibility illusion (replaces inspire courage) — no Change-shaped number the bard's own sheet applies",
  },
  "bard:street-performer:gladhanding:1": {
    archetypeId: "bard:street-performer",
    name: "Gladhanding",
    level: 1,
    bucket: "subsystem",
    note: "double Perform-check income plus a Bluff-for-Diplomacy substitution (replaces countersong) — no Change-shaped number",
  },
  "bard:street-performer:harmless-performer:3": {
    archetypeId: "bard:street-performer",
    name: "Harmless Performer",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:street-performer:madcap-prank:9": {
    archetypeId: "bard:street-performer",
    name: "Madcap Prank",
    level: 9,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Greatness)",
  },
  "bard:street-performer:quick-change:5": {
    archetypeId: "bard:street-performer",
    name: "Quick Change",
    level: 5,
    bucket: "subsystem",
    note: "take-10/take-20-on-Bluff/Disguise mechanic — no Change-shaped number",
  },
  "bard:street-performer:slip-through-the-crowd:15": {
    archetypeId: "bard:street-performer",
    name: "Slip through the Crowd",
    level: 15,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Heroics)",
  },
  "bard:street-performer:streetwise:1": {
    archetypeId: "bard:street-performer",
    name: "Streetwise",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (local) — overlaps Bardic Knowledge's skill.knowledge target. Same composition trap as Court Bard's Heraldic Expertise.",
  },
  "bard:studious-librarian:comparative-arcane-studies:6": {
    archetypeId: "bard:studious-librarian",
    name: "Comparative Arcane Studies",
    level: 6,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Suggestion)",
  },
  "bard:studious-librarian:critical-research-focus:8": {
    archetypeId: "bard:studious-librarian",
    name: "Critical Research Focus",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:studious-librarian:one-with-the-library:20": {
    archetypeId: "bard:studious-librarian",
    name: "One with the Library",
    level: 20,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Deadly Performance)",
  },
  "bard:studious-librarian:perfect-recollection:19": {
    archetypeId: "bard:studious-librarian",
    name: "Perfect Recollection",
    level: 19,
    bucket: "subsystem",
    note: "always-take-20-on-Knowledge-checks mechanic — no Change-shaped number",
  },
  "bard:studious-librarian:scribe-scroll:1": {
    archetypeId: "bard:studious-librarian",
    name: "Scribe Scroll",
    level: 1,
    bucket: "subsystem",
    note: "grants Scribe Scroll as a named bonus feat — no Change-shaped number",
  },
  "bard:voice-of-brigh:brigh-s-anger:8": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Anger",
    level: 8,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Dirge of Doom)",
  },
  "bard:voice-of-brigh:brigh-s-knowledge:1": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Knowledge",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Knowledge(arcana)/Knowledge(dungeoneering)/Knowledge(engineering)/Knowledge(religion), purely additive (no 'replaces' clause). Overlaps Bardic Knowledge's skill.knowledge target, but since both are 'untyped' bonuses (which sum per the engine's typed-stacking rules) and the archetype text never claims to replace Bardic Knowledge, this is a genuine RAW stack, not a double-count bug — same reasoning as any other untyped-bonus source",
  },
  "bard:voice-of-brigh:brigh-s-soothing:1": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Soothing",
    level: 1,
    bucket: "subsystem",
    note: "fascinate reflavor (constructs are normally immune) — a performance-modification, no standalone number",
  },
  "bard:voice-of-brigh:brigh-s-spark:12": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Spark",
    level: 12,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Soothing Performance)",
  },
  "bard:voice-of-brigh:brigh-s-wrath:14": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Wrath",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Frightening Tune)",
  },
  "bard:voice-of-brigh:distraction:1": {
    archetypeId: "bard:voice-of-brigh",
    name: "Distraction",
    level: 1,
    bucket: "subsystem",
    note: "fascinate-construct-only reflavor — a performance-modification",
  },
  "bard:voice-of-the-wild:nature-magic:1": {
    archetypeId: "bard:voice-of-the-wild",
    name: "Nature Magic",
    level: 1,
    bucket: "subsystem",
    note: "swaps in druid/ranger spells known in place of bard spells (replaces countersong, versatile performance, jack of all trades) — no Change-shaped number",
  },
  "bard:voice-of-the-wild:song-of-the-wild:3": {
    archetypeId: "bard:voice-of-the-wild",
    name: "Song of the Wild",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:voice-of-the-wild:wild-knowledge:1": {
    archetypeId: "bard:voice-of-the-wild",
    name: "Wild Knowledge",
    level: 1,
    bucket: "blocked",
    note: "replaces bardic knowledge (unpaired) with a bonus that includes Knowledge (nature) — overlaps Bardic Knowledge's skill.knowledge target. Same composition trap as Court Bard's Heraldic Expertise.",
  },
  "bard:wasteland-chronicler:wasteland-knowledge:1": {
    archetypeId: "bard:wasteland-chronicler",
    name: "Wasteland Knowledge",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1/2 level (min 1) on Knowledge(geography)/Knowledge(local)/Knowledge(nature)/Knowledge(planes)/Survival, purely additive (no 'replaces' clause at all — this archetype doesn't touch bardic knowledge). Overlaps Bardic Knowledge's skill.knowledge target, but both are untyped bonuses that genuinely stack per RAW, same reasoning as Brigh's Knowledge above",
  },
  "bard:wasteland-chronicler:wasteland-specialist:3": {
    archetypeId: "bard:wasteland-chronicler",
    name: "Wasteland Specialist",
    level: 3,
    bucket: "situational",
    note: "favored-terrain grant (ranger mechanic, not modeled) plus a real Diplomacy bonus scoped to 'wasteland dwellers' only — no matching general target; paired to Inspire Competence's uuid for bookkeeping only",
  },
  "bard:watersinger:lifewater-su:5": {
    archetypeId: "bard:watersinger",
    name: "Lifewater (Su)",
    level: 5,
    bucket: "subsystem",
    note: "performance-based sicken/reposition-maneuver ability (replaces lore master) — no Change-shaped number",
  },
  "bard:watersinger:watersong-su:1": {
    archetypeId: "bard:watersinger",
    name: "Watersong (Su)",
    level: 1,
    bucket: "subsystem",
    note: "redefines bardic performance as tremorsense-perceived water manipulation (replaces fascinate/suggestion/mass suggestion) — a performance-mechanism change",
  },
  "bard:watersinger:waterstrike-su:3": {
    archetypeId: "bard:watersinger",
    name: "Waterstrike (Su)",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:wit:cantrips:1": {
    archetypeId: "bard:wit",
    name: "Cantrips",
    level: 1,
    bucket: "subsystem",
    note: "reprints the base bard cantrips-known mechanic — not an archetype-specific number",
  },
  "bard:wit:cutting-remark:3": {
    archetypeId: "bard:wit",
    name: "Cutting Remark",
    level: 3,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Inspire Competence)",
  },
  "bard:wit:duel-master:10": {
    archetypeId: "bard:wit",
    name: "Duel Master",
    level: 10,
    bucket: "subsystem",
    note: "bardic performance modification (reflavors/grants/modifies a performance type) — the engine models bardic performance only as a rounds/day resource pool with no activated-performance-buff mechanism (issue #45 bard rubric); no Change-shaped number to extract (paired to Jack of All Trades)",
  },
  "bard:wit:on-the-ball:5": {
    archetypeId: "bard:wit",
    name: "On the Ball",
    level: 5,
    bucket: "subsystem",
    note: "treats an initiative roll as a fixed 10 (or 20 at 20th) rather than granting a flat bonus — not expressible via the init Change target (which is additive, not roll-replacing)",
  },
  "bard:wit:way-with-words:1": {
    archetypeId: "bard:wit",
    name: "Way with Words",
    level: 1,
    bucket: "numeric",
    note: "extracted — +1 at 1st, +1 every 4 levels thereafter (min at 1, cap +6 at 20th) on Bluff/Diplomacy/Intimidate/Linguistics/Sense Motive, purely additive (no base feature swapped); the accompanying verbal-duel 'edges' mechanic (Ultimate Intrigue) is not modeled",
  },
};

/**
 * ── BARD_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────────
 *
 * Machine-extracted mechanical effects for bard archetype class features
 * (issue #45, wave 2). Clean-room from the published PF1 rules — the
 * vendored prose this was extracted from (`archetype-features.json`) is OGL,
 * so reading it is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * Only `numeric` features (per `BARD_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above) get an entry here. `bard:archaeologist:archaeologist-s-luck:1` is
 * ALSO `numeric` but deliberately has NO entry here — it's the pre-existing
 * hand-verified table's notes-only entry (`archetype-effects.ts`), and
 * `resolveArchetypeFeatureEffect` always checks that table first, so
 * duplicating it here would be dead code at best and a silent precedence
 * footgun at worst.
 *
 * Confidence rubric is identical to `fighter.ts`'s:
 *  - "high": a single, clearly-worded, fully general (no scope restriction)
 *    scaling bonus, or a literal reflavor of an already-modeled mechanism.
 *  - "medium": the formula required deriving a schedule from prose, OR the
 *    extraction uses a less-battle-tested target convention (the
 *    parameterized `skill.prf.<type>` target for a fixed, non-player-chosen
 *    Perform subtype — Versatile Dance is the only user of this so far), OR
 *    the extraction models only PART of a feature's benefits (the other part
 *    being scoped/conditional and dropped, same "model only the modelable
 *    half" posture as the hand-verified table's Hawkeye entry).
 *  - "low": not used this wave.
 */
export const BARD_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── +1/2 level (some with a minimum of 1) flat skill bonuses ─────────────
  // Purely additive or a clean, non-overlapping replacement of bardic
  // knowledge (see rule 2 above) — same shape as the hand-verified table's
  // Cloistered Cleric / Sorcerer of Sleep / Seeker entries.

  "bard:brazen-deceiver:shameless-scoundrel:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.dis"),
      c("max(1, floor(@class.unlevel / 2))", "skill.ste"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Bluff/Disguise/Stealth`,
    confidence: "high",
    provenance:
      "A brazen deceiver adds half his level (minimum +1) on Bluff, Disguise, and Stealth checks.",
  },
  "bard:court-fool:buffoonery:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.acr"),
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.clm"),
      c("max(1, floor(@class.unlevel / 2))", "skill.dis"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Acrobatics/Bluff/Climb/Disguise`,
    confidence: "high",
    provenance:
      "A court fool gains a bonus equal to 1/2 his bard level on Acrobatics, Bluff, Climb, and Disguise checks (minimum +1).",
  },
  "bard:daredevil:agile:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.acr"),
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
      c("max(1, floor(@class.unlevel / 2))", "skill.clm"),
      c("max(1, floor(@class.unlevel / 2))", "skill.esc"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Acrobatics/Bluff/Climb/Escape Artist`,
    confidence: "high",
    provenance:
      "A daredevil adds half her class level (minimum 1) on Acrobatics, Bluff, Climb, and Escape Artist checks. " +
      "This ability replaces bardic knowledge.",
  },
  "bard:dragon-herald:dragon-voice:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.dip"),
      c("floor(@class.unlevel / 2)", "skill.int"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Intimidate/Diplomacy`,
    confidence: "high",
    provenance:
      "A dragon herald gains a bonus equal to half her level on Intimidate and Diplomacy checks. This ability " +
      "replaces bardic knowledge.",
  },
  "bard:fey-prankster:mischievous-talent:1": {
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
      "A fey prankster adds half her class level (minimum 1) on Bluff, Disguise, Sleight of Hand, and Stealth " +
      "skill checks, and can attempt Sleight of Hand checks untrained.",
  },
  "bard:sandman:master-of-deception:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.blf"),
      c("floor(@class.unlevel / 2)", "skill.slt"),
      c("floor(@class.unlevel / 2)", "skill.ste"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Bluff/Sleight of Hand/Stealth`,
    confidence: "high",
    provenance:
      "A sandman gains a bonus equal to half his level on Bluff, Sleight of Hand, and Stealth checks. This " +
      "ability replaces bardic knowledge.",
  },
  "bard:solacer:learned-physician:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.hea")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Heal`,
    confidence: "medium",
    provenance:
      "A solacer adds 1/2 his class level (minimum 1) on Heal checks and can attempt Knowledge checks " +
      "untrained. (take-10/take-20 half of this feature not modeled)",
  },
  "bard:voice-of-brigh:brigh-s-knowledge:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.kar"),
      c("max(1, floor(@class.unlevel / 2))", "skill.kdu"),
      c("max(1, floor(@class.unlevel / 2))", "skill.ken"),
      c("max(1, floor(@class.unlevel / 2))", "skill.kre"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Knowledge (arcana/dungeoneering/engineering/religion)`,
    confidence: "high",
    provenance:
      "A bard adds half his class level (minimum 1) as a bonus on Knowledge (arcana), Knowledge " +
      "(dungeoneering), Knowledge (engineering), and Knowledge (religion) checks and can attempt these skill " +
      "checks untrained. (purely additive — no 'replaces bardic knowledge' clause; both are untyped bonuses, so " +
      "they genuinely stack per RAW)",
  },
  "bard:wasteland-chronicler:wasteland-knowledge:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.kge"),
      c("max(1, floor(@class.unlevel / 2))", "skill.klo"),
      c("max(1, floor(@class.unlevel / 2))", "skill.kna"),
      c("max(1, floor(@class.unlevel / 2))", "skill.kpl"),
      c("max(1, floor(@class.unlevel / 2))", "skill.sur"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Knowledge (geography/local/nature/planes)/Survival`,
    confidence: "high",
    provenance:
      "A wasteland chronicler adds half his level (minimum 1) as a bonus on Knowledge (geography), Knowledge " +
      "(local), Knowledge (nature), Knowledge (planes), and Survival checks. (purely additive — no 'replaces " +
      "bardic knowledge' clause; both are untyped bonuses, so they genuinely stack per RAW)",
  },

  // ── Other clean, unconditional scaling bonuses ────────────────────────────

  "bard:archaeologist:clever-explorer:2": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.dev"),
      c("floor(@class.unlevel / 2)", "skill.per"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Disable Device/Perception`,
    confidence: "high",
    provenance:
      "At 2nd level, an archaeologist gains a bonus equal to half his class level on Disable Device and " +
      "Perception checks. This ability replaces the versatile performance ability. (the take-10/half-time/" +
      "disarm-magical-traps half at 6th level is not modeled)",
  },
  "bard:wit:way-with-words:1": {
    changes: [
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.blf"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.dip"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.int"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.lin"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.sen"),
    ],
    detail: (level) =>
      `+${Math.min(6, 1 + Math.floor(level / 4))} Bluff/Diplomacy/Intimidate/Linguistics/Sense Motive`,
    confidence: "high",
    provenance:
      "A wit gains a +1 bonus on Bluff, Diplomacy, Intimidate, Linguistics, and Sense Motive checks. At 4th " +
      "level, and every 4 bard levels thereafter, this bonus increases by 1, to a maximum of +6 at 20th level. " +
      "(the verbal-duel 'edges' mechanic is not modeled)",
  },
  "bard:flamesinger:wildfire:2": {
    changes: [
      c("min(25, 5 * (1 + floor(max(0, @class.unlevel - 2) / 4)))", "landSpeed", "enhancement"),
    ],
    detail: (level) =>
      `+${Math.min(25, 5 * (1 + Math.floor(Math.max(0, level - 2) / 4)))} ft. land speed`,
    confidence: "high",
    provenance:
      "Like a raging wildfire, a flamesinger moves with blistering speed. At 2nd level and every 4 levels " +
      "thereafter, the flamesinger gains a +5-foot enhancement bonus to her base speed (to a maximum of +25 " +
      "feet at 18th level).",
  },
  "bard:impervious-messenger:cryptic-whisper:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.lin")],
    detail: (level) => `+${Math.floor(level / 2)} Linguistics`,
    confidence: "medium",
    provenance:
      "At 2nd level, the impervious messenger internalizes his understanding of language and ciphers... He " +
      "adds half his bard level to all Linguistics checks and Bluff checks to deliver secret messages... " +
      "(models only the unconditional Linguistics half; the Bluff half is scoped to delivering secret messages)",
  },

  // ── Restricted-list bonus-feat-count reflavors ────────────────────────────
  // Same shape as the hand-verified table's ranger Combat-Style-Feat / Crusader
  // entries: a countable schedule of bonus feats from a restricted list, safe
  // to model as a `bonusFeats` count even though which specific feat is chosen
  // isn't tracked.

  "bard:averaka-arbiter:versatile-teamwork:2": {
    changes: [c("1 + floor(max(0, @class.unlevel - 2) / 4)", "bonusFeats")],
    detail: (level) => `${1 + Math.floor(Math.max(0, level - 2) / 4)} bonus teamwork feat(s)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an Averaka arbiter gains a bonus teamwork feat. He gains an additional bonus teamwork " +
      "feat at 6th level and every 4 levels thereafter. This ability replaces versatile performance and " +
      "well-versed.",
  },
  "bard:dwarven-scholar:dwarven-training:2": {
    changes: [c("1 + floor(max(0, @class.unlevel - 2) / 4)", "bonusFeats")],
    detail: (level) => `${1 + Math.floor(Math.max(0, level - 2) / 4)} bonus combat feat(s)`,
    confidence: "medium",
    provenance:
      "At 2nd level, a dwarven scholar masters one aspect of dwarven combat and gains a bonus combat feat... " +
      "At 6th level and every 4 levels thereafter, she gains another bonus combat feat.",
  },

  // ── Fixed (non-player-chosen) Perform-subtype bonus ───────────────────────
  // Uses the parameterized skill.prf.<type> target, same convention as the
  // hand-verified table's skill.crf.alchemy (Sorcerer of Sleep's Pesh Expert).

  "bard:dervish-dancer:versatile-dance:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.prf.dance")],
    detail: (level) => `+${Math.floor(level / 2)} Perform (dance)`,
    confidence: "medium",
    provenance:
      "At 2nd level, a dervish dancer gains a bonus equal to half his level on Perform (dance) checks. This " +
      "ability replaces versatile performance. (the Perform-dance-in-place-of-Acrobatics substitution half is " +
      "not modeled)",
  },
};
