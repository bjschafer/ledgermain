/**
 * Bard's slice of the pipeline (wave 2, 2026-07-06). Per the per-class file
 * convention (documented in `index.ts`), this file owns BOTH of bard's
 * pipeline artifacts — `BARD_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `BARD_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) — so a
 * future wave working on a different class never has a reason to touch this
 * file; only `index.ts` (the aggregator) needs one new import + one new spread
 * per class.
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
 *    Countersong, Fascinate, Versatile Performance, Well-Versed, Lore Master,
 *    and Jack of All Trades class features all carry EMPTY vendored `changes`
 *    in `class-features.json` (still true — that part never changes). **Update
 *    (triage):** a later same-day commit (`d8dec4b`, after this wave) wired
 *    `ClassFeature.grantsBuffs` up generically — `deriveResourcePools`'s
 *    `linkedBuffIds` + the tracker's `LinkedBuffToggle` (`apps/web`) now DOES
 *    let a player toggle base bard's Inspire Courage on/off (merged onto the
 *    Bardic Performance pool, exactly like Rage; see
 *    `packages/engine/test/resources.test.ts` and
 *    `apps/web/test/buffs.test.ts`'s `toggleLinkedBuff` coverage), applying
 *    its real, level-scaled vendored buff. This does NOT change any bucket
 *    below: the toggle only activates an EXISTING vendored `Buff` reached via
 *    `grantsBuffs`, and none of these archetype features grant, reflavor, or
 *    modify a performance via a vendored buff of their own — there is still no
 *    mechanism to hang a NEW or MODIFIED performance on without hand-
 *    authoring a bespoke buff per archetype (the "don't invent one" line). The
 *    other twelve core CRB performance types (Countersong, Distraction,
 *    Fascinate, Inspire Competence, Suggestion, Inspire Greatness, Inspire
 *    Heroics, Dirge of Doom, Frightening Tune, Soothing Performance, Mass
 *    Suggestion, Deadly Performance) carry the same shape of toggle,
 *    hand-authored onto the Bardic Performance pool's `tableOptions` in
 *    `bardic-performances.ts` rather than reached via `grantsBuffs`; Inspire
 *    Greatness and Inspire Heroics apply real numeric Changes when toggled,
 *    the rest are note-tier reminders. None of this reaches the archetype
 *    features classified below: a feature that itself grants a new
 *    performance, reflavors an existing one, or modifies performance action
 *    economy still has no buff of its own to hang a Change on, so the "don't
 *    invent one" rule stands for everything in this file. Any
 *    archetype feature that grants a NEW performance, reflavors an existing
 *    one, or changes performance action economy/rounds-cost — whether or not
 *    it's structurally paired via `pairedBaseFeatureUuid` to one of the ten
 *    performance-type base features (Inspire Competence, Suggestion, Mass
 *    Suggestion, Dirge of Doom, Frightening Tune, Inspire Greatness, Inspire
 *    Heroics, Jack of All Trades, Soothing Performance, Deadly Performance) —
 *    is bucketed `subsystem`, full stop, even when its own prose describes a
 *    clean, precisely-scaling number (e.g. Filidh's Echoes of Nature's Song,
 *    Busker's Quick Hands — both real numbers, both explicitly activated via
 *    "bardic performance"/"stunt" mechanics with no vendored buff of their own
 *    to hang the generic toggle on). A handful of features happen to be PAIRED
 *    to one of those ten uuids purely for suppression bookkeeping while their
 *    own content is NOT a performance at all (Archaeologist's/Sandman's Trap
 *    Sense, Archaeologist's Evasion/Advanced Talent, Archivist's mis-described
 *    Probable Path, Wasteland Chronicler's Wasteland Specialist) — these are
 *    classified by their own content, not by the blanket performance note;
 *    each says so explicitly.
 *
 * 2. **Bardic Knowledge is the one base bard feature with real vendored
 *    numbers** (`max(1, floor(@class.unlevel/2))` on `skill.knowledge`,
 *    confirmed in `class-features.json`) — unlike every other base feature
 *    an archetype might claim to replace. Grepping every vendored bard
 *    archetype feature's `pairedBaseFeatureUuid` against Bardic Knowledge's
 *    own uuid turns up exactly one match — Thundercaller's Bound to the Land,
 *    whose swap `activeArchetypeSwaps` honors correctly (classified `numeric`
 *    below, in the effects table). Every other "this replaces bardic
 *    knowledge" claim in the prose is an UNPAIRED swap, so
 *    `activeArchetypeSwaps` never suppresses Bardic Knowledge for any of
 *    those archetypes — the same composition trap as monk's Ironskin
 *    Monk (an ambiguous/unpaired swap
 *    displacing a base feature with real vendored `Change`s). The
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
 *  - `bard:buccaneer`'s Bonus Feat, Deeds, Exotic Pet, Grit, Gun Training,
 *    Liquid Courage, Raider's Riposte, and Sword and Pistol entries describe
 *    gunslinger grit/deeds/gun-training mechanics the base bard class
 *    doesn't have (one entry even says "a gunslinger gains a bonus feat"
 *    verbatim) — likely bled in from the separate `gunslinger:buccaneer`
 *    archetype during compilation. None of them carry an extractable number
 *    regardless of the mix-up.
 *  - `bard:dawnflower-dervish`'s Burst of Speed, Desert Stride, Rapid Attack,
 *    and Lightning Strike each claim in prose to replace an "armor training"
 *    tier the bard class doesn't have; their `pairedBaseFeatureUuid`s
 *    correctly point at real bard performance features instead (Inspire
 *    Competence, Suggestion, Inspire Heroics), so it's the prose — not the
 *    mechanical pairing — that's stale, apparently copied from the
 *    `fighter:dawnflower-dervish` version of this same archetype.
 *  - `bard:fey-prankster`'s Plant Traps, Steal Appearance, and Unseen
 *    Trickster reference "rogue level," a rogue's Intelligence modifier, and
 *    uncanny dodge — none of which the bard class has — reading like
 *    contamination from an unrelated rogue archetype rather than genuine
 *    Fey Prankster text.
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
    note: "real +4 Handle Animal bonus but scoped to one chosen animal kind and to influence checks only, too narrowly scoped to extract; its replacement of fascinate is now tracked as a removesTags entry in bardic-performance-variants/shardA.ts, dropping fascinate from this archetype's toggle list.",
  },
  "bard:animal-speaker:attract-rats:6": {
    archetypeId: "bard:animal-speaker",
    name: "Attract Rats",
    level: 6,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the 1d3/2d3(advanced)/3d3 rat-swarm summon schedule; still no self-facing Change since a summoned swarm isn't a bard buff.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the wild-empathy-style Perform check on an animal; still no self-facing Change since it's a check substitute, not a bard buff.",
  },
  "bard:animal-speaker:summon-nature-s-ally:1": {
    archetypeId: "bard:animal-speaker",
    name: "Summon Nature's Ally",
    level: 1,
    bucket: "subsystem",
    note: "spell-list/spells-known addition, no Change-shaped number; its replacement of mass suggestion is now tracked as a removesTags entry in bardic-performance-variants/shardA.ts, dropping mass suggestion from this archetype's toggle list.",
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
    note: "not a performance despite the old blanket rule — grants Medium (10th) / Heavy (16th) Armor Proficiency and removes arcane spell failure for bard spells in that armor, replacing jack of all trades; armor-proficiency grants and per-class ASF exemptions have no engine route",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the scaling weapon-enhancement bonus (+1 at 6th, +1 per 3 levels, max +5 at 18th); not modeled as a Change since it targets a chosen weapon, not a fixed sheet stat.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the multi-ally enhancement schedule (+4 at two allies down to +1 at five or more); still no self-facing Change.",
  },
  "bard:arcane-duelist:rallying-cry:1": {
    archetypeId: "bard:arcane-duelist",
    name: "Rallying Cry",
    level: 1,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the Intimidate-check-as-save substitution against fear/despair effects; still no self-facing Change.",
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
    bucket: "situational",
    note: "hand-verified, ground truth — see archetype-effects.ts (activated rounds-per-day luck bonus, deliberately notes-only; a numeric verdict here would demand a Change the activation gate forbids)",
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
    bucket: "numeric",
    note: 'the vendored description field for this id is mispaired (byte-identical to Inspire Competence\'s, not trap sense text at all — a data-pipeline artifact, not this ability); both halves are wired via saveCategories: ["traps"] and acCategories: ["traps"], verified against aonprd.com\'s Archaeologist page rather than the corrupted vendored text, and BARD_ARCHETYPE_EFFECTS_EXTRACTED\'s provenance is written from that source. "bard:archaeologist:trap-sense:6" was a phantom duplicate key with no matching vendored id (this archetype has only 7 real features, none at a second Trap Sense level) — removed rather than left dangling.',
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the Will save vs. dazed/confused on an already-fascinated target; still no self-facing Change.",
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
    note: "replaces Inspire Courage (bardVariantRemovesInspireCourage in bardic-performance-variants/shardA.ts now drops the linked buff) and surfaces as a note-tier toggle there too, but the insight AC/attack/save bonus itself still isn't extracted as a Change since it's scoped to one specifically-identified monster kind the static sheet can't track.",
  },
  "bard:archivist:pedantic-lecture:18": {
    archetypeId: "bard:archivist",
    name: "Pedantic Lecture",
    level: 18,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the mass dazed/confused/asleep upgrade to lamentable belaborment; still no self-facing Change.",
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
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability replaces dirge of doom AND frightening tune, not just dirge of doom as the pairedBaseFeatureUuid bookkeeping implied, and neither removal appears in the vendored description. Now tracked via removesTags plus a note-tier variant performance toggle in bardic-performance-variants/shardA.ts (ally weapons treated as silver, bane vs. evil outsiders at 14th, still no self-facing Change).",
  },
  "bard:argent-voice:limning-verse:1": {
    archetypeId: "bard:argent-voice",
    name: "Limning Verse",
    level: 1,
    bucket: "subsystem",
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability replaces fascinate, missing from the vendored description entirely. Now tracked via removesTags plus a note-tier variant performance toggle in bardic-performance-variants/shardA.ts (faerie-fire-on-evil-outsiders detection, still no self-facing Change).",
  },
  "bard:argent-voice:shattering-crescendo:6": {
    archetypeId: "bard:argent-voice",
    name: "Shattering Crescendo",
    level: 6,
    bucket: "subsystem",
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability replaces suggestion AND mass suggestion, not just suggestion as the pairedBaseFeatureUuid bookkeeping implied, and neither removal appears in the vendored description. Now tracked via removesTags plus a note-tier variant performance toggle in bardic-performance-variants/shardA.ts (dispel magic vs. evil/enchantment effects, still no self-facing Change).",
  },
  "bard:arrowsong-minstrel:arcane-archery:1": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Arcane Archery",
    level: 1,
    bucket: "subsystem",
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability actually replaces bardic knowledge, dirge of doom, distraction, fascinate, inspire competence, lore master, AND soothing performance, none of which appear in the vendored description. The five base-performance removals are now tracked via removesTags in bardic-performance-variants/shardA.ts; Arcane Archery itself just grants spells and a BAB-for-prereqs rule, so it still has no Change-shaped number or toggle of its own.",
  },
  "bard:arrowsong-minstrel:arrowsong-strike:6": {
    archetypeId: "bard:arrowsong-minstrel",
    name: "Arrowsong Strike",
    level: 6,
    bucket: "subsystem",
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability replaces suggestion AND mass suggestion, not just suggestion as the pairedBaseFeatureUuid bookkeeping implied, and neither removal appears in the vendored description. Now tracked via removesTags in bardic-performance-variants/shardA.ts; the spellstrike ability itself isn't a bardic performance (no rounds-of-performance cost), so it still has no Change-shaped number or toggle of its own.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the teamwork-feat-sharing mechanic; still no self-facing Change since the actual bonus depends on whichever teamwork feat is in play.",
  },
  "bard:averaka-arbiter:ritual-of-reconciliation:8": {
    archetypeId: "bard:averaka-arbiter",
    name: "Ritual of Reconciliation",
    level: 8,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the attitude-improvement/Will-save mechanic; still no self-facing Change.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the multi-enemy version of song of surrender; still no self-facing Change.",
  },
  "bard:buccaneer:song-of-surrender:4": {
    archetypeId: "bard:buccaneer",
    name: "Song of Surrender",
    level: 4,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the drop-weapons-and-fall-prone compulsion and its Will save; still no self-facing Change.",
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
    note: "busker stunt — rides the Busker Stunts pool, which redefines bardic performance wholesale rather than editing the standard toggle list; pool-redefining archetypes are outside the variant-toggle mechanism, so this stays unmodeled",
  },
  "bard:busker:inventive-juggler:9": {
    archetypeId: "bard:busker",
    name: "Inventive Juggler",
    level: 9,
    bucket: "subsystem",
    note: "busker stunt — rides the Busker Stunts pool, which redefines bardic performance wholesale rather than editing the standard toggle list; pool-redefining archetypes are outside the variant-toggle mechanism, so this stays unmodeled",
  },
  "bard:busker:living-statue:3": {
    archetypeId: "bard:busker",
    name: "Living Statue",
    level: 3,
    bucket: "subsystem",
    note: "busker stunt — rides the Busker Stunts pool, which redefines bardic performance wholesale rather than editing the standard toggle list; pool-redefining archetypes are outside the variant-toggle mechanism, so this stays unmodeled",
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
    note: "busker stunt — rides the Busker Stunts pool, which redefines bardic performance wholesale rather than editing the standard toggle list; pool-redefining archetypes are outside the variant-toggle mechanism, so this stays unmodeled; its scaling Acrobatics/AC/Reflex/attack numbers are real and waiting on a pool-graft mechanism",
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
    note: "removesTags now tracks that this replaces dirge of doom (bardic-performance-variants/shardA.ts); Shining Star itself is a passive enhancer of the base Fascinate performance (harder save, ignores shaken), not a standalone activated performance, so it still has no Change or note-tier entry of its own.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the sonic damage burst (1d4 + diva level to an object, half that to a creature); still no self-facing Change since it's a damage-dealing attack, not a bard buff.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the single-target frightened compulsion; still no self-facing Change.",
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
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com, printed elsewhere as 'Mantra of the Angel'): this ability replaces inspire heroics, missing from the vendored description entirely. Now tracked via removesTags plus a note-tier variant performance toggle in bardic-performance-variants/shardA.ts (reactive Knowledge (planes)-check-as-AC/save substitution vs. outsiders, still no self-facing Change since the roll is variable).",
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
    note: "VENDORED TEXT GAP (confirmed via aonprd.com/d20pfsrd.com): this ability replaces inspire greatness, missing from the vendored description entirely. Now tracked via removesTags plus a note-tier variant performance toggle in bardic-performance-variants/shardA.ts (ally-only planar infusions while off the Material Plane, still no self-facing Change).",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the flat-footed-unless-saved effect on nearby enemies; still no self-facing Change.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the Charisma-check/skill penalty on one target; still no self-facing Change.",
  },
  "bard:court-bard:satire:1": {
    archetypeId: "bard:court-bard",
    name: "Satire",
    level: 1,
    bucket: "subsystem",
    note: "replaces Inspire Courage (bardVariantRemovesInspireCourage in bardic-performance-variants/shardA.ts now drops the linked buff); Satire itself surfaces as a note-tier toggle there too (an attack/damage/fear-and-charm-save penalty on enemies), still no self-facing Change since the penalty applies to enemies, not you.",
  },
  "bard:court-bard:scandal:14": {
    archetypeId: "bard:court-bard",
    name: "Scandal",
    level: 14,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the song-of-discord-unless-saved effect on nearby enemies; still no self-facing Change.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the ignore-fatigued/shaken effect on one ally; still no self-facing Change (can't target yourself).",
  },
  "bard:court-fool:distracting-motley:1": {
    archetypeId: "bard:court-fool",
    name: "Distracting Motley",
    level: 1,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the Acrobatics-check-as-save substitution against confusion/fascination; still no self-facing Change.",
  },
  "bard:cultivator:nature-lore:3": {
    archetypeId: "bard:cultivator",
    name: "Nature Lore",
    level: 3,
    bucket: "subsystem",
    note: "scoped Lore Master variant (Knowledge (nature) checks and Survival tracking only) — same take-10/take-20 economy as base Lore Master, no number to model; NOTE the vendored text says 5th level while this key says 3rd (verified text/level mismatch)",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardA.ts): note-tier reminder describing the conjured plant-barrier cover mechanic (hardness 0, AC 5, 2 hp/level, max barriers = Cha mod + 1/2 bard level); still no self-facing Change since it's a battlefield object, not a bard buff.",
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
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
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
    note: "replaces inspire courage +1 — bardic-performance-variants/shardB.ts sets removesInspireCourage for bard:demagogue, so the vendored Inspire Courage linked buff drops from the pool; Famous's own regional-fame mechanic stays unmodeled (GM-adjudicated, no Change)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag inciteViolence, minLevel 6) — enemy-facing Will-save-or-rage effect, note-tier since there's no self-facing number; base Suggestion is removed",
  },
  "bard:demagogue:righteous-cause:18": {
    archetypeId: "bard:demagogue",
    name: "Righteous Cause",
    level: 18,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag righteousCause, minLevel 18) — enemy-facing Will-save-or-mass-suggestion effect, note-tier; base Mass Suggestion is removed",
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
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
  },
  "bard:dervish-dancer:dance-of-fury:12": {
    archetypeId: "bard:dervish-dancer",
    name: "Dance of Fury",
    level: 12,
    bucket: "subsystem",
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
  },
  "bard:dervish-dancer:fleet:1": {
    archetypeId: "bard:dervish-dancer",
    name: "Fleet",
    level: 1,
    bucket: "situational",
    note: "real, scaling land-speed bonus but only while the battle dance performance is active — battle dance is Dervish Dancer's own redefinition of bardic performance, not one of the core CRB performance types the hand-authored toggles (bardic-performances.ts) cover, so there is no toggle for this activated state",
  },
  "bard:dervish-dancer:leaf-on-the-wind:14": {
    archetypeId: "bard:dervish-dancer",
    name: "Leaf on the Wind",
    level: 14,
    bucket: "subsystem",
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
  },
  "bard:dervish-dancer:rain-of-blows:6": {
    archetypeId: "bard:dervish-dancer",
    name: "Rain of Blows",
    level: 6,
    bucket: "subsystem",
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
  },
  "bard:dervish-dancer:razor-s-kiss:8": {
    archetypeId: "bard:dervish-dancer",
    name: "Razor's Kiss",
    level: 8,
    bucket: "subsystem",
    note: "battle dance rider — this archetype redefines bardic performance as a self-only battle dance with its own effect list, and pool redefinition is outside the variant-toggle mechanism (bardic-performance-variants/ only edits the standard pool's list), so it stays unmodeled",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag carefulTeamwork, minLevel 1) — ally-only per RAW ('allies', not the bard), note-tier with the full bonus schedule; also sets removesInspireCourage",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag showYourselves, minLevel 15) — enemy-facing Will-save compulsion, note-tier; base Inspire Heroics is removed",
  },
  "bard:detective:true-confession:9": {
    archetypeId: "bard:detective",
    name: "True Confession",
    level: 9,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag trueConfession, minLevel 9) — enemy-facing Will-save interrogation effect, note-tier; base Inspire Greatness is removed",
  },
  "bard:disciple-of-the-forked-tongue:discordant-spiral:1": {
    archetypeId: "bard:disciple-of-the-forked-tongue",
    name: "Discordant Spiral",
    level: 1,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag discordantSpiral, minLevel 1) — enemy save/concentration debuff aura, note-tier; also sets removesInspireCourage (the vendored text omits its own 'replaces inspire courage' sentence, verified against d20pfsrd.com)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag venomousWhispers, minLevel 9) — enemy-facing mind-effect, note-tier; base Inspire Greatness is removed (the vendored text omits its own 'replaces' sentence, verified against d20pfsrd.com). The source text gives no saving throw for the target to resist this effect — possible further vendored-data gap",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag diplomaticImmunity, minLevel 1) — self-facing sanctuary effect, note-tier (sanctuary isn't a flat number); removes base Countersong and Fascinate (vendored text omits its 'replaces' sentence, verified against aonprd.com)",
  },
  "bard:dragon-herald:diplomatic-protection:3": {
    archetypeId: "bard:dragon-herald",
    name: "Diplomatic Protection",
    level: 3,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag diplomaticProtection, minLevel 3) — ally-only energy resistance/natural armor, note-tier; base Inspire Competence is removed (vendored text omits its 'replaces' sentence, verified against aonprd.com)",
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
    note: "not modeled as a performance toggle: its own text is a passive Draconic-comprehension ability with no 'use bardic performance' activation language, unlike this archetype's other paired features, despite the blanket bardic-performance-modification bucket. Replaces Jack of All Trades (verified against aonprd.com), which isn't a tracked base performance tag, so shardB.ts has nothing to remove or add for it",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag rebukeFoes, minLevel 12) — enemy-facing energy damage, note-tier; base Soothing Performance is removed (vendored text omits its 'replaces' sentence, verified against aonprd.com)",
  },
  "bard:dragon-herald:retreat-to-lair:15": {
    archetypeId: "bard:dragon-herald",
    name: "Retreat to Lair",
    level: 15,
    bucket: "subsystem",
    note: "still not modeled as a performance toggle (spends 5 daily uses of bardic performance rounds as a one-shot teleport, a resource conversion rather than a standalone toggle), but bardic-performance-variants/shardB.ts now records that it removes base Inspire Heroics (verified against aonprd.com, the vendored text omits its own 'replaces' sentence)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag frightfulSong, minLevel 8) — enemy-facing Will-save fear effect, note-tier; base Dirge of Doom is removed",
  },
  "bard:dragon-yapper:yapping-song:1": {
    archetypeId: "bard:dragon-yapper",
    name: "Yapping Song",
    level: 1,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag yappingSong, minLevel 1) — enemy debuff aura, no save, note-tier; base Fascinate is removed",
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
    note: "still not modeled as its own performance toggle (it enhances whichever base performance the duettist and familiar perform together, rather than granting a standalone type), but bardic-performance-variants/shardB.ts now records that it removes base Dirge of Doom",
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
    note: "still not modeled as its own performance toggle (lets duettist and familiar perform two different base performances at once, rather than granting a standalone type), but bardic-performance-variants/shardB.ts now records that it removes base Frightening Tune",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag scornOfTheWilds, minLevel 8) — enemy-facing curse, note-tier; removes base Dirge of Doom and Frightening Tune (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com: 'This replaces dirge of doom and frightening tune')",
  },
  "bard:fey-courtier:stone-dance:15": {
    archetypeId: "bard:fey-courtier",
    name: "Stone Dance",
    level: 15,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag stoneDance, minLevel 15) — animate-plants-style environmental effect, note-tier; base Inspire Heroics is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
  },
  "bard:fey-courtier:summon-fey-allies:3": {
    archetypeId: "bard:fey-courtier",
    name: "Summon Fey Allies",
    level: 3,
    bucket: "subsystem",
    note: "still not modeled as a performance toggle (a feat plus summon-spell-list grant, not itself activated via bardic performance), but bardic-performance-variants/shardB.ts now records that it removes base Inspire Competence (verified against d20pfsrd.com: 'This replaces inspire competence')",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag embarrassingSatire, minLevel 8) — enemy sicken effect, note-tier; base Dirge of Doom is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com). The source text gives no saving throw for the effect — possible further vendored-data gap",
  },
  "bard:fey-prankster:incite-unreliability:1": {
    archetypeId: "bard:fey-prankster",
    name: "Incite Unreliability",
    level: 1,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag inciteUnreliability, minLevel 1) — enemy-facing Will-save confusion effect, note-tier; also sets removesInspireCourage (vendored text omits its 'replaces inspire courage' sentence, verified against d20pfsrd.com)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag songOfClumsiness, minLevel 1) — enemy-facing Reflex-save compulsion, note-tier; base Countersong is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
  },
  "bard:filidh:divinatory-song:6": {
    archetypeId: "bard:filidh",
    name: "Divinatory Song",
    level: 6,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag divinatorySong, minLevel 6) — one-shot divination-equivalent effect, note-tier; base Suggestion is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
  },
  "bard:filidh:echoes-of-nature-s-song:1": {
    archetypeId: "bard:filidh",
    name: "Echoes of Nature's Song",
    level: 1,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag echoesOfNaturesSong, minLevel 1) — ally-only scaling insight bonus to Reflex/AC, note-tier since RAW says allies, not the bard; also sets removesInspireCourage (vendored text omits its 'replaces inspire courage' sentence, verified against d20pfsrd.com)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag songOfTheCycle, minLevel 20) — ally-only personal foresight, note-tier; base Deadly Performance is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
  },
  "bard:filidh:unity-of-life:15": {
    archetypeId: "bard:filidh",
    name: "Unity of Life",
    level: 15,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag unityOfLife, minLevel 15) — links two allies as shield other, note-tier, ally-only; base Inspire Heroics is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
  },
  "bard:filidh:voices-of-life:8": {
    archetypeId: "bard:filidh",
    name: "Voices of Life",
    level: 8,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag voicesOfLife, minLevel 8) — grants speak with animals/plants to the filidh and allies, note-tier (not a flat number); base Dirge of Doom is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag echoesOfTheFirstWorld, minLevel 1) — grants yourself or an ally a chosen fey-template special ability, note-tier since the ability is a player choice, not a fixed number; also sets removesInspireCourage (vendored text omits its 'replaces inspire courage' sentence, verified against d20pfsrd.com under this archetype's alternate 'Fey World Minstrel' listing)",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag gremlinsLuck, minLevel 8) — enemy-facing bad-luck debuff, note-tier; base Dirge of Doom is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
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
    note: "still not modeled as a performance toggle (adds spells to the bard spell list, not itself activated via bardic performance), but bardic-performance-variants/shardB.ts now records that it removes base Dirge of Doom (vendored text already states this)",
  },
  "bard:flame-dancer:fire-break:6": {
    archetypeId: "bard:flame-dancer",
    name: "Fire Break",
    level: 6,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag fireBreak, minLevel 6) — ally-only fire resistance, note-tier; base Suggestion is removed",
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
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag songOfTheFieryGaze, minLevel 3) — ally-only see-through-smoke effect, note-tier; base Inspire Competence is removed",
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
    note: "still not modeled as its own performance toggle (it shifts other performances' existing bonus/penalty by 1, rather than granting a standalone type), but bardic-performance-variants/shardB.ts now records that it removes base Countersong and Distraction (vendored text already states this)",
  },
  "bard:fortune-teller:transparent-fate:8": {
    archetypeId: "bard:fortune-teller",
    name: "Transparent Fate",
    level: 8,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag transparentFate, minLevel 8) — enemy-facing fate-reveal effect, note-tier; base Dirge of Doom is removed (vendored text omits its 'replaces' sentence, verified against d20pfsrd.com)",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts, dirge of doom is dropped): an enemy-facing truth-compulsion effect with no self-facing number.",
  },
  "bard:hoaxer:bad-deal:1": {
    archetypeId: "bard:hoaxer",
    name: "Bad Deal",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops inspire courage, inspire competence, and inspire greatness, with the hexed-object mechanic and its DC spelled out in the toggle's context note.",
  },
  "bard:hoaxer:buyer-beware:1": {
    archetypeId: "bard:hoaxer",
    name: "Buyer Beware",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops countersong, with the beguiling-gift DC spelled out in the toggle's context note.",
  },
  "bard:hoaxer:curse-breaker:12": {
    archetypeId: "bard:hoaxer",
    name: "Curse Breaker",
    level: 12,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): the break-enchantment-in-place-of-soothing-performance mechanic is spelled out in words.",
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
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops distraction, with the hex-delay mechanic spelled out in the toggle's context note.",
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
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it converts bardic performance rounds into a different resource (memorize page) rather than replacing or adding a performance type, and carries no 'replaces' clause of its own.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops both suggestion and mass suggestion (RAW replaces both, not just one), self-facing Perform-check substitution with no static number.",
  },
  "bard:impervious-messenger:unbroken-stride:8": {
    archetypeId: "bard:impervious-messenger",
    name: "Unbroken Stride",
    level: 8,
    bucket: "subsystem",
    note: "Now modeled with real Changes on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops both dirge of doom and frightening tune (RAW replaces both), grants an insight bonus on Acrobatics/Climb/Fly/Ride equal to half bard level plus an enhancement bonus to land speed; woodland stride and 12th-level freedom of movement stay context notes.",
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
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it redefines how the whole Bardic Performance pool can be spent (a single-target mode for any known performance, plus flat bonus/DC increments on several) rather than replacing or adding one specific performance type, so it doesn't fit bardic-performance-variants/shardC.ts's per-tag def shape.",
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
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it alters the fascinate performance's targeting for animals and fey in place rather than replacing or adding a performance type, so bardic-performance-variants/shardC.ts leaves fascinate untouched for this archetype.",
  },
  "bard:luring-piper:deadly-lure:8": {
    archetypeId: "bard:luring-piper",
    name: "Deadly Lure",
    level: 8,
    bucket: "subsystem",
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it modifies the suggestion performance's effect on animals and fey in place, with no 'replaces' clause of its own, so bardic-performance-variants/shardC.ts leaves suggestion untouched for this archetype.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops soothing performance, with the mass-inflict-serious-wounds-vs-fey mechanic spelled out in words.",
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
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops inspire courage; stays note-tier (not a real Change) because RAW says 'allies of the magician' only, with no clause extending it to the magician himself.",
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
    note: "The countersong removal is now reflected in the archetype's merged toggle list (bardic-performance-variants/shardC.ts), though the bonus feat itself still carries no Change-shaped number and grants no toggle of its own.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts), drops frightening tune. Flag: the vendored description text for this feature is a verbatim, mislabeled copy of Frightening Tune's own ability text, not real Metamagic Mastery text (which applies a metamagic feat to a spell about to be cast without increasing casting time) -- confirmed against aonprd.com/d20pfsrd; the modeled toggle uses the real ability's text, not the corrupted vendored copy.",
  },
  "bard:magician:spell-suppression:8": {
    archetypeId: "bard:magician",
    name: "Spell Suppression",
    level: 8,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops dirge of doom, with the counterspell-while-performing mechanic spelled out in words.",
  },
  "bard:magician:wand-mastery:10": {
    archetypeId: "bard:magician",
    name: "Wand Mastery",
    level: 10,
    bucket: "subsystem",
    note: "Jack of all trades is not one of the twelve tracked base performance types, so this replacement falls outside bardic-performance-variants/shardC.ts's tag list; still no Change-shaped number and no removal to reflect on the Bardic Performance pool.",
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
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops inspire competence; stays note-tier because the buffed skill is a live choice made when the performance starts (and swappable as a swift action), which this engine's Change schema can't bind to a fixed target.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops mass suggestion, with the ally-disguise mechanic and disbelieve DC spelled out in words.",
  },
  "bard:masked-performer:seamless-guise:1": {
    archetypeId: "bard:masked-performer",
    name: "Seamless Guise",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled with real Changes on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops countersong, grants a flat +10 untyped bonus on Disguise and Perform (act) checks (RAW states no bonus type, so modeled as untyped per this engine's convention for unnamed bonuses).",
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
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops suggestion; stays note-tier because the granted combat feat is a live choice made when the performance starts, which this engine's Change schema can't bind to a fixed target.",
  },
  "bard:mute-musician:ceaseless-performance:15": {
    archetypeId: "bard:mute-musician",
    name: "Ceaseless Performance",
    level: 15,
    bucket: "subsystem",
    note: "The inspire heroics removal (RAW: 'this ability replaces inspire heroics') is now reflected in the archetype's merged toggle list (bardic-performance-variants/shardC.ts), though Ceaseless Performance itself is an action-economy modifier, not a performance, so it grants no toggle of its own.",
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
    note: "RAW replaces jack-of-all-trades, which is not one of the twelve tracked base performance types, so this feature falls outside bardic-performance-variants/shardC.ts's tag list; still no Change-shaped number and no removal to reflect.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops frightening tune, with the confusion-aura save DC spelled out in words.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops mass suggestion, with the gate-as-travel effect spelled out in words.",
  },
  "bard:mute-musician:symphony-of-silence:3": {
    archetypeId: "bard:mute-musician",
    name: "Symphony of Silence",
    level: 3,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops inspire competence. Stays note-tier despite naming the bard as a beneficiary: this engine has no scoped-save Change target for a bonus that applies only against sonic/language-dependent effects (the same gap already noted for Piper's Attention and Dulled Horror).",
  },
  "bard:negotiator:advanced-talents:10": {
    archetypeId: "bard:negotiator",
    name: "Advanced Talents",
    level: 10,
    bucket: "subsystem",
    note: "advanced-rogue-talent access in place of rogue talents — a choice-list upgrade, not a performance; no talent-picker route exists for it",
  },
  "bard:negotiator:binding-contract:9": {
    archetypeId: "bard:negotiator",
    name: "Binding Contract",
    level: 9,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops inspire greatness, with the lesser-geas/geas-quest DC and Hit Dice limit spelled out in words.",
  },
  "bard:negotiator:fast-talk:1": {
    archetypeId: "bard:negotiator",
    name: "Fast Talk",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops inspire courage, with the listener save-penalty and Appraise-check schedule spelled out in the toggle's context note.",
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
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it alters the fascinate performance in place (adds a phrenology skill-unlock study option) rather than replacing or adding a performance type, so bardic-performance-variants/shardC.ts leaves fascinate untouched for this archetype.",
  },
  "bard:phrenologist:in-your-head:3": {
    archetypeId: "bard:phrenologist",
    name: "In Your Head",
    level: 3,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops inspire competence, with the witness-spell mechanic and its DC spelled out in words.",
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
    note: "Jack of all trades is not one of the twelve tracked base performance types, so this replacement falls outside bardic-performance-variants/shardC.ts's tag list; still no Change-shaped number and no removal to reflect.",
  },
  "bard:phrenologist:skull-sonata:1": {
    archetypeId: "bard:phrenologist",
    name: "Skull Sonata",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops inspire courage, with the enemy sonic-damage bonus spelled out in the toggle's context note.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops inspire greatness, with the commune-with-nature trigger spelled out in words.",
  },
  "bard:plant-speaker:mystical-allegory:5": {
    archetypeId: "bard:plant-speaker",
    name: "Mystical Allegory",
    level: 5,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle added to the Bardic Performance pool (bardic-performance-variants/shardC.ts): no base performance is removed (RAW replaces lore master, which isn't tracked here), but the augury/divination/legend-lore schedule is spelled out in words.",
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
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops mass suggestion, with the mass-hideous-laughter mechanic spelled out in words.",
  },
  "bard:prankster:mock:1": {
    archetypeId: "bard:prankster",
    name: "Mock",
    level: 1,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle (bardic-performance-variants/shardC.ts): drops fascinate, with the enemy save DC and attack/skill-check penalty spelled out in the toggle's context note.",
  },
  "bard:prankster:punchline:6": {
    archetypeId: "bard:prankster",
    name: "Punchline",
    level: 6,
    bucket: "subsystem",
    note: "Now modeled as a note-tier variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardC.ts): drops suggestion, with the hideous-laughter save DC spelled out in words.",
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
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it layers onto an already-active fascinate rather than consuming its own bardic performance activation, so it carries no toggle of its own despite naming a base performance type.",
  },
  "bard:provocateur:damning-performance:4": {
    archetypeId: "bard:provocateur",
    name: "Damning Performance",
    level: 4,
    bucket: "subsystem",
    note: "Evaluated for the archetype-aware toggle mechanism and intentionally left unmodeled: it layers onto an already-active fascinate rather than consuming its own bardic performance activation, so it carries no toggle of its own despite naming a base performance type.",
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
    note: "banks two (later three) already-known performances inside a cunning plan and extends triggered durations — performance-economy mechanic with no toggle of its own; the underlying performances are already toggles",
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
    note: "restates the base Inspire Competence schedule unchanged (plus an infeasible-uses caveat) — the base toggle on the Bardic Performance pool already covers it, nothing archetype-specific to model",
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
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Inspire Greatness in the pool; still no Change-shaped number, since stealthy spellcasting isn't a static bonus.",
  },
  "bard:sandman:greater-stealspell:15": {
    archetypeId: "bard:sandman",
    name: "Greater Stealspell",
    level: 15,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Inspire Heroics in the pool; still no Change-shaped number.",
  },
  "bard:sandman:mass-slumber-song:18": {
    archetypeId: "bard:sandman",
    name: "Mass Slumber Song",
    level: 18,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Mass Suggestion in the pool; still no Change-shaped number.",
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
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Suggestion in the pool; still no Change-shaped number, since the forced deep slumber is enemy-facing.",
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
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Deadly Performance in the pool; still no Change-shaped number, since the absorb-and-recast trigger isn't a static bonus.",
  },
  "bard:sandman:stealspell:1": {
    archetypeId: "bard:sandman",
    name: "Stealspell",
    level: 1,
    bucket: "subsystem",
    note: "now modeled as a real archetype performance toggle (bardic-performance-variants/shardD.ts): replaces the Inspire Courage linked buff with a note-tier Stealspell toggle (touch-attack spell theft, Will DC in the notes); still no static Change, since the theft is state-dependent, not a flat number.",
  },
  "bard:sandman:trap-sense:3": {
    archetypeId: "bard:sandman",
    name: "Trap Sense",
    level: 3,
    bucket: "situational",
    note: "the paired Inspire Competence tag this replaces is now actually dropped from the toggle pool (bardic-performance-variants/shardD.ts's sandman entry), on top of this feature's own unrelated Reflex/AC-vs-traps bonus.",
  },
  "bard:savage-skald:battle-song:18": {
    archetypeId: "bard:savage-skald",
    name: "Battle Song",
    level: 18,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Mass Suggestion in the pool; still no Change-shaped number.",
  },
  "bard:savage-skald:berserkergang:12": {
    archetypeId: "bard:savage-skald",
    name: "Berserkergang",
    level: 12,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Soothing Performance in the pool; still no Change-shaped number, and the rules text doesn't say whether the skald can target himself, so it stays note-tier rather than a self bonus.",
  },
  "bard:savage-skald:incite-rage:6": {
    archetypeId: "bard:savage-skald",
    name: "Incite Rage",
    level: 6,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Suggestion in the pool; still no Change-shaped number, since the effect targets one other creature and never the skald himself.",
  },
  "bard:savage-skald:inspiring-blow:1": {
    archetypeId: "bard:savage-skald",
    name: "Inspiring Blow",
    level: 1,
    bucket: "subsystem",
    note: "now modeled with a real Change (bardic-performance-variants/shardD.ts): temporary hit points equal to max(0, Cha modifier) on a tempHp target, replacing Fascinate in the pool. The ally +1 morale attack-roll bonus stays a context note, since it never lands on the skald's own sheet.",
  },
  "bard:savage-skald:song-of-the-fallen:10": {
    archetypeId: "bard:savage-skald",
    name: "Song of the Fallen",
    level: 10,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts); still no Change-shaped number, since summoning spectral warriors isn't a static bonus.",
  },
  "bard:sea-singer:call-the-storm:18": {
    archetypeId: "bard:sea-singer",
    name: "Call the Storm",
    level: 18,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Mass Suggestion in the pool; still no Change-shaped number, since the duplicated spells are environmental, not a bonus on the sea singer's own sheet.",
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
    bucket: "numeric",
    note: "the flat +2 CMD vs. grapple/overrun/trip is unconditional from 2nd level and now expressible via Change.maneuverCategories, wired in BARD_ARCHETYPE_EFFECTS_EXTRACTED. The save bonus vs. air/water effects and prone-causing effects has no matching SAVE_CATEGORIES entry and stays prose.",
  },
  "bard:sea-singer:sea-shanty:1": {
    archetypeId: "bard:sea-singer",
    name: "Sea Shanty",
    level: 1,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Countersong in the pool; the Perform-check substitution (explicitly including the sea singer himself) is spelled out in the toggle's context note, same posture as base Countersong.",
  },
  "bard:sea-singer:still-water:3": {
    archetypeId: "bard:sea-singer",
    name: "Still Water",
    level: 3,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Inspire Competence in the pool; still no Change-shaped number, since the DC reduction is scoped to specific out-of-combat checks the engine has no target for.",
  },
  "bard:sea-singer:whistle-the-wind:6": {
    archetypeId: "bard:sea-singer",
    name: "Whistle the Wind",
    level: 6,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Suggestion in the pool; still no Change-shaped number, since a gust of wind isn't a bonus on the sea singer's own sheet.",
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
    note: "now modeled (bardic-performance-variants/shardD.ts): drops the Inspire Courage linked buff and the Inspire Competence toggle, replaced by note-tier Shadow Puppets and Shadow Servant toggles (see their own entries).",
  },
  "bard:shadow-puppeteer:shadow-puppets-sp:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Puppets (Sp)",
    level: 1,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts); still no Change-shaped number, since the shadow-conjuration summon isn't a bonus on the puppeteer's own sheet.",
  },
  "bard:shadow-puppeteer:shadow-servant-sp:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Servant (Sp)",
    level: 1,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts); still no Change-shaped number, since an unseen-servant equivalent isn't a bonus on the puppeteer's own sheet.",
  },
  "bard:silver-balladeer:bardic-performance:1": {
    archetypeId: "bard:silver-balladeer",
    name: "Bardic performance",
    level: 1,
    bucket: "subsystem",
    note: "the three silver-instrument performances this grants (Break Curse, Holy Vibration, Mass Break Curse) are now modeled as note-tier archetype performance toggles (bardic-performance-variants/shardD.ts); see their own entries.",
  },
  "bard:silver-balladeer:break-curse-su:6": {
    archetypeId: "bard:silver-balladeer",
    name: "Break Curse (Su)",
    level: 6,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Suggestion in the pool; still no Change-shaped number, since curse suppression is ally-facing.",
  },
  "bard:silver-balladeer:holy-vibration-su:9": {
    archetypeId: "bard:silver-balladeer",
    name: "Holy Vibration (Su)",
    level: 9,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Inspire Greatness in the pool; still no Change-shaped number, since warding a door or window isn't a bonus on the balladeer's own sheet.",
  },
  "bard:silver-balladeer:mass-break-curse-su:18": {
    archetypeId: "bard:silver-balladeer",
    name: "Mass Break Curse (Su)",
    level: 18,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Mass Suggestion in the pool; still no Change-shaped number.",
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
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Countersong in the pool. The vendored description is missing the 'replaces countersong' sentence the published text carries (confirmed against d20pfsrd/aonprd), so this pairing wasn't identifiable from the vendored data alone. Still no Change-shaped number, since the stabilize/save bonus is ally-facing.",
  },
  "bard:solacer:invigorating-artistry:10": {
    archetypeId: "bard:solacer",
    name: "Invigorating Artistry",
    level: 10,
    bucket: "subsystem",
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts); still no Change-shaped number, since the curse/possession/mind-control save bonus is granted to listeners generally, not explicitly the solacer himself.",
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
    note: "now modeled as a note-tier archetype performance toggle (bardic-performance-variants/shardD.ts), replacing Frightening Tune in the pool; still no Change-shaped number, since heal/harm on a chosen target isn't a bonus on the songhealer's own sheet.",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing suggestion: note-tier with the 4d6 sonic / word ranged-touch schedule in words (dice, not a Change)",
  },
  "bard:sound-striker:wordstrike-su:3": {
    archetypeId: "bard:sound-striker",
    name: "Wordstrike (Su)",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence: note-tier with the 1d4 + bard level damage schedule in words (dice, not a Change)",
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
    note: "removesTags: [countersong] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd; the vendored description is missing its own 'replaces countersong' clause). No toggle def: Corpse Speaker never spends a round of bardic performance, it's an independent Su ability, so it stays out of the pool's toggle list.",
  },
  "bard:speaker-of-the-palatine-eye:keen-ritualist:10": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Keen Ritualist",
    level: 10,
    bucket: "subsystem",
    note: "confirmed via d20pfsrd it replaces jack-of-all-trades, not a performance in the Bardic Performance pool's toggle table (jack-of-all-trades was never one of the twelve tracked tags), so bardic-performance-variants/shardE.ts records no removal and no def for it; the ritual-DC-reduction subsystem itself stays unmodeled",
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
    note: "removesTags: [dirgeOfDoom] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd). No toggle def: Quake triggers automatically whenever the stonesinger begins any bardic performance rather than being its own selectable, round-costing performance, so it's not modeled as a standalone toggle.",
  },
  "bard:stonesinger:stone-song:1": {
    archetypeId: "bard:stonesinger",
    name: "Stone Song",
    level: 1,
    bucket: "subsystem",
    note: "confirmed via d20pfsrd ('this ability modifies bardic performance') that Stone Song redefines the Bardic Performance mechanism itself (tremorsense-perceived vibration, not audible) for every performance the stonesinger has, not one specific base type; bardic-performance-variants/shardE.ts deliberately authors no def for it (see that file's doc comment on pool-redefining archetypes) — genuinely unmodeled, needs a bigger mechanism than a per-tag toggle swap",
  },
  "bard:stonesinger:tremor:1": {
    archetypeId: "bard:stonesinger",
    name: "Tremor",
    level: 1,
    bucket: "subsystem",
    note: "removesTags: [countersong] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd). No toggle def: Tremor is an add-on bundled onto whatever performance is already active ('as part of another bardic performance'), not its own selectable, round-costing performance.",
  },
  "bard:street-performer:disappearing-act:1": {
    archetypeId: "bard:street-performer",
    name: "Disappearing Act",
    level: 1,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replaces Inspire Courage (removesInspireCourage: true): note-tier, targets an ally the bard chooses (never himself), Will save DC in words; also carries the 15th-level Slip through the Crowd upgrade as a folded context note rather than a separate def",
  },
  "bard:street-performer:gladhanding:1": {
    archetypeId: "bard:street-performer",
    name: "Gladhanding",
    level: 1,
    bucket: "subsystem",
    note: "removesTags: [countersong] recorded in bardic-performance-variants/shardE.ts. No toggle def: Gladhanding (double Perform income, Bluff-for-Diplomacy substitution) never spends a round of bardic performance, so it stays out of the pool's toggle list.",
  },
  "bard:street-performer:harmless-performer:3": {
    archetypeId: "bard:street-performer",
    name: "Harmless Performer",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence: note-tier, sanctuary-style Will save DC in words (no Change target exists for conditional immunity to being targeted)",
  },
  "bard:street-performer:madcap-prank:9": {
    archetypeId: "bard:street-performer",
    name: "Madcap Prank",
    level: 9,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire greatness: note-tier, enemy-facing Reflex save and random-debuff schedule in words",
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
    note: "folded into Disappearing Act's variant def as a second context note in bardic-performance-variants/shardE.ts (removesTags already covers inspire heroics on that same entry); not modeled as its own def since it only upgrades Disappearing Act's existing effect rather than adding a new selectable performance",
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
    note: "removesTags: [suggestion] recorded in bardic-performance-variants/shardE.ts (also replaces jack-of-all-trades, not a pool toggle tag). No toggle def: the scroll/spellbook casting mechanic never spends a round of bardic performance.",
  },
  "bard:studious-librarian:critical-research-focus:8": {
    archetypeId: "bard:studious-librarian",
    name: "Critical Research Focus",
    level: 8,
    bucket: "subsystem",
    note: "removesTags: [dirgeOfDoom] recorded in bardic-performance-variants/shardE.ts. No toggle def: the Research-check crit bonus never spends a round of bardic performance.",
  },
  "bard:studious-librarian:one-with-the-library:20": {
    archetypeId: "bard:studious-librarian",
    name: "One with the Library",
    level: 20,
    bucket: "subsystem",
    note: "removesTags: [deadlyPerformance] recorded in bardic-performance-variants/shardE.ts. No toggle def: the spell-swap mechanic never spends a round of bardic performance.",
  },
  "bard:studious-librarian:perfect-recollection:19": {
    archetypeId: "bard:studious-librarian",
    name: "Perfect Recollection",
    level: 19,
    bucket: "subsystem",
    note: "removesTags: [massSuggestion] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd; the vendored description is missing its own 'replaces mass suggestion' clause). No toggle def: the Knowledge take-20 mechanic never spends a round of bardic performance.",
  },
  "bard:studious-librarian:scribe-scroll:1": {
    archetypeId: "bard:studious-librarian",
    name: "Scribe Scroll",
    level: 1,
    bucket: "subsystem",
    note: "removesTags: [distraction] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd; the vendored description is missing its own 'replaces distraction' clause). No toggle def: a bonus feat never spends a round of bardic performance.",
  },
  "bard:voice-of-brigh:brigh-s-anger:8": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Anger",
    level: 8,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing dirge of doom: note-tier, functions as base Dirge of Doom but can also affect constructs",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing fascinate: note-tier, functions as base Fascinate but can also affect constructs",
  },
  "bard:voice-of-brigh:brigh-s-spark:12": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Spark",
    level: 12,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing soothing performance: note-tier, construct-reanimation mechanic (round-per-construct-per-round maintenance) spelled out in words",
  },
  "bard:voice-of-brigh:brigh-s-wrath:14": {
    archetypeId: "bard:voice-of-brigh",
    name: "Brigh's Wrath",
    level: 14,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing frightening tune: note-tier, functions as base Frightening Tune but can also affect constructs",
  },
  "bard:voice-of-brigh:distraction:1": {
    archetypeId: "bard:voice-of-brigh",
    name: "Distraction",
    level: 1,
    bucket: "subsystem",
    note: "suspected duplicate/mislabeled vendored entry: its text is byte-for-byte the same fascinate-construct-only ability as Brigh's Soothing, and aonprd.com's live Voice of Brigh page lists only five abilities total (Brigh's Knowledge, Brigh's Soothing, Brigh's Anger, Brigh's Spark, Brigh's Wrath) with no separate 'Distraction' among them. No def authored in bardic-performance-variants/shardE.ts; Brigh's Soothing covers the real ability.",
  },
  "bard:voice-of-the-wild:nature-magic:1": {
    archetypeId: "bard:voice-of-the-wild",
    name: "Nature Magic",
    level: 1,
    bucket: "subsystem",
    note: "removesTags: [countersong] recorded in bardic-performance-variants/shardE.ts (also claims versatile performance and jack-of-all-trades, neither a pool toggle tag). No toggle def: the druid/ranger spell-swap mechanic never spends a round of bardic performance.",
  },
  "bard:voice-of-the-wild:song-of-the-wild:3": {
    archetypeId: "bard:voice-of-the-wild",
    name: "Song of the Wild",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence, dirge of doom, and inspire heroics: note-tier, ally-only per RAW (the bard is never a legitimate target, unlike Inspire Greatness/Heroics)",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts): note-tier, sicken-or-reposition schedule in words; replaces only the 5th-level use of lore master, which isn't itself a pool toggle tag so no removesTags entry applies",
  },
  "bard:watersinger:watersong-su:1": {
    archetypeId: "bard:watersinger",
    name: "Watersong (Su)",
    level: 1,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing fascinate, suggestion, and mass suggestion: note-tier, water-shaping mechanic and hardness/HP schedule in words",
  },
  "bard:watersinger:waterstrike-su:3": {
    archetypeId: "bard:watersinger",
    name: "Waterstrike (Su)",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence: note-tier, dice slam-damage schedule in words",
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
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence, dirge of doom, and frightening tune (all three, confirmed via d20pfsrd; the 'paired to Inspire Competence' bookkeeping hint was incomplete): note-tier, dice nonlethal-damage schedule with the 8th/14th-level upgrades in words",
  },
  "bard:wit:duel-master:10": {
    archetypeId: "bard:wit",
    name: "Duel Master",
    level: 10,
    bucket: "subsystem",
    note: "confirmed via d20pfsrd it replaces jack-of-all-trades, not a performance in the Bardic Performance pool's toggle table (jack-of-all-trades was never one of the twelve tracked tags), so bardic-performance-variants/shardE.ts records no removal and no def for it; the verbal-duel subsystem itself stays unmodeled",
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
  "bard:archivist:lore-master:2": {
    archetypeId: "bard:archivist",
    name: "Lore Master",
    level: 2,
    bucket: "subsystem",
    note: "take-20-on-Knowledge-checks mechanic (limited uses/day, scaling with level), replaces versatile performance — no Change-shaped number",
  },
  "bard:buccaneer:bonus-feat:4": {
    archetypeId: "bard:buccaneer",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "restricted-list bonus-feat schedule reprint (combat/grit feats plus a short nautical list) — no count delta; vendored description is unedited gunslinger boilerplate, see this file's doc comment",
  },
  "bard:buccaneer:deeds:1": {
    archetypeId: "bard:buccaneer",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants the grit/deeds resource subsystem (four swapped-in deeds) — resource + activation mechanic, no Change-shaped number; see this file's doc comment",
  },
  "bard:buccaneer:exotic-pet:5": {
    archetypeId: "bard:buccaneer",
    name: "Exotic Pet",
    level: 5,
    bucket: "subsystem",
    note: "grants a familiar (wizard-style, half class level) plus conditional evasion while it's nearby — no Change-shaped number; replaces gun training 1, see this file's doc comment",
  },
  "bard:buccaneer:grit:1": {
    archetypeId: "bard:buccaneer",
    name: "Grit",
    level: 1,
    bucket: "subsystem",
    note: "reflavors the grit resource pool to key off Charisma instead of Wisdom — a resource-pool mechanic like bardic performance, not a Change; see this file's doc comment",
  },
  "bard:buccaneer:gun-training:13": {
    archetypeId: "bard:buccaneer",
    name: "Gun Training",
    level: 13,
    bucket: "situational",
    note: "real Dex-modifier-to-damage bonus but scoped to a single player-chosen firearm type when firing it — same unresolvable-free-choice bar as base Weapon Training's own group pick",
  },
  "bard:buccaneer:liquid-courage:2": {
    archetypeId: "bard:buccaneer",
    name: "Liquid Courage",
    level: 2,
    bucket: "subsystem",
    note: "grog-point resource mechanic that substitutes for grit — activated resource ability, no Change-shaped number",
  },
  "bard:buccaneer:raider-s-riposte:17": {
    archetypeId: "bard:buccaneer",
    name: "Raider's Riposte",
    level: 17,
    bucket: "subsystem",
    note: "grants a reactive attack-of-opportunity trigger — a rules permission, no numeric bonus to extract",
  },
  "bard:buccaneer:sword-and-pistol:9": {
    archetypeId: "bard:buccaneer",
    name: "Sword and Pistol",
    level: 9,
    bucket: "subsystem",
    note: "grants Sword and Pistol as a named bonus feat, prerequisites waived — a specific feat grant, not a bonusFeats count",
  },
  "bard:dawnflower-dervish:burst-of-speed:3": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Burst of Speed",
    level: 3,
    bucket: "situational",
    note: "real reduction to the standard post-charge AC penalty, but scoped to the charging action specifically — no matching general target; paired to Inspire Competence's uuid for bookkeeping only, not itself a performance (prose's 'replaces armor training 1' is stale, see this file's doc comment)",
  },
  "bard:dawnflower-dervish:desert-stride:7": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Desert Stride",
    level: 7,
    bucket: "subsystem",
    note: "terrain-movement rule, no engine target (prose's 'replaces armor training 2' is stale, see this file's doc comment)",
  },
  "bard:dawnflower-dervish:lightning-strike:15": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Lightning Strike",
    level: 15,
    bucket: "subsystem",
    note: "grants an extra full-attack action at a stacking -2 penalty — an action-economy grant, no Change-shaped number; paired to Inspire Heroics' uuid for bookkeeping only (prose's 'replaces armor training 4' is stale, see this file's doc comment)",
  },
  "bard:dawnflower-dervish:rapid-attack:11": {
    archetypeId: "bard:dawnflower-dervish",
    name: "Rapid Attack",
    level: 11,
    bucket: "subsystem",
    note: "lets a full attack be combined with movement — an action-economy rule, no Change-shaped number (prose's 'replaces armor training 3' is stale, see this file's doc comment)",
  },
  "bard:dirge-bard:bardic-performance:0": {
    archetypeId: "bard:dirge-bard",
    name: "Bardic Performance",
    level: 0,
    bucket: "subsystem",
    note: "modeled as a variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardB.ts, tag danceOfTheDead, minLevel 10 per the vendored feature's own level field, not the key's stale :0 suffix) — note-tier animate-dead-style summon, no Change-shaped number",
  },
  "bard:dirge-bard:haunted-eyes:2": {
    archetypeId: "bard:dirge-bard",
    name: "Haunted Eyes",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to fear/energy drain/death/necromantic effects specifically — no matching general save target; replaces well-versed (no vendored changes, safe swap either way)",
  },
  "bard:dirge-bard:haunting-refrain:5": {
    archetypeId: "bard:dirge-bard",
    name: "Haunting Refrain",
    level: 5,
    bucket: "situational",
    note: "real Perform-for-Intimidate substitution plus a fear-save-DC penalty, but both scoped to demoralize/fear specifically — no matching general targets; replaces lore master",
  },
  "bard:dirge-bard:secrets-of-the-grave:2": {
    archetypeId: "bard:dirge-bard",
    name: "Secrets of the Grave",
    level: 2,
    bucket: "situational",
    note: "real +1/2-level Knowledge (religion) bonus but scoped to identifying undead specifically, plus a spells-known addition — no matching general target; replaces versatile performance",
  },
  "bard:fey-prankster:greater-dirty-trick:6": {
    archetypeId: "bard:fey-prankster",
    name: "Greater Dirty Trick",
    level: 6,
    bucket: "subsystem",
    note: "grants Greater Dirty Trick as a named bonus feat, prerequisites waived — a specific feat grant, not a bonusFeats count",
  },
  "bard:fey-prankster:improved-dirty-trick:2": {
    archetypeId: "bard:fey-prankster",
    name: "Improved Dirty Trick",
    level: 2,
    bucket: "subsystem",
    note: "grants Improved Dirty Trick as a named bonus feat, prerequisites waived — a specific feat grant, not a bonusFeats count",
  },
  "bard:fey-prankster:plant-traps:8": {
    archetypeId: "bard:fey-prankster",
    name: "Plant Traps",
    level: 8,
    bucket: "subsystem",
    note: "grants an activated plant-trap-crafting ability (DC keyed to a rogue level the bard doesn't have — see this file's doc comment) — no Change-shaped number on the bard's own sheet",
  },
  "bard:fey-prankster:steal-appearance:4": {
    archetypeId: "bard:fey-prankster",
    name: "Steal Appearance",
    level: 4,
    bucket: "subsystem",
    note: "grants a disguise-swap ability with a target-facing save DC (keyed to a rogue level/Intelligence modifier the bard doesn't have — see this file's doc comment) — no Change-shaped number on the bard's own sheet",
  },
  "bard:fey-prankster:treacherous-plants:1": {
    archetypeId: "bard:fey-prankster",
    name: "Treacherous Plants",
    level: 1,
    bucket: "situational",
    note: "real Bluff bonus but scoped to feint/hide actions taken adjacent to plants specifically — no matching general target (prose's 'rogue level' is stale, see this file's doc comment)",
  },
  "bard:fey-prankster:unseen-trickster:12": {
    archetypeId: "bard:fey-prankster",
    name: "Unseen Trickster",
    level: 12,
    bucket: "subsystem",
    note: "lets Stealth be attempted without cover/concealment near plants — a rules exception, no Change-shaped number; paired to Soothing Performance's uuid for bookkeeping only",
  },
  "bard:lotus-geisha:enrapturing-performance:2": {
    archetypeId: "bard:lotus-geisha",
    name: "Enrapturing Performance",
    level: 2,
    bucket: "subsystem",
    note: "an alternate single-target activation mode layered over the bard's existing performances (which are already toggles) — a delivery mode, not a new performance type, so it carries no toggle of its own",
  },
  "bard:shadow-puppeteer:shadow-puppets:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Puppets",
    level: 1,
    bucket: "subsystem",
    note: "bardic performance modification (summons a shadow-conjuration creature) — no Change-shaped number to extract",
  },
  "bard:shadow-puppeteer:shadow-servant:1": {
    archetypeId: "bard:shadow-puppeteer",
    name: "Shadow Servant",
    level: 1,
    bucket: "subsystem",
    note: "grants an unseen-servant-style spell-like ability — no Change-shaped number",
  },
  "bard:silver-balladeer:break-curse:6": {
    archetypeId: "bard:silver-balladeer",
    name: "Break Curse",
    level: 6,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardD.ts, replaces Suggestion) — note-tier, the Perform-vs-curse-DC procedure rides the toggle's notes",
  },
  "bard:silver-balladeer:holy-vibration:9": {
    archetypeId: "bard:silver-balladeer",
    name: "Holy Vibration",
    level: 9,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardD.ts, replaces Inspire Greatness) — note-tier, the arcane-lock-style warding numbers ride the toggle's notes",
  },
  "bard:silver-balladeer:mass-break-curse:18": {
    archetypeId: "bard:silver-balladeer",
    name: "Mass Break Curse",
    level: 18,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardD.ts, replaces Mass Suggestion) — note-tier, extends Break Curse to any number of allies",
  },
  "bard:silver-balladeer:pure-heart:2": {
    archetypeId: "bard:silver-balladeer",
    name: "Pure Heart",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to curses/hexes/charm effects specifically — no matching general save target; replaces well-versed (no vendored changes, safe swap either way)",
  },
  "bard:silver-balladeer:silver-mastery:2": {
    archetypeId: "bard:silver-balladeer",
    name: "Silver Mastery",
    level: 2,
    bucket: "situational",
    note: "real +1 attack bonus but scoped to mithral-material weapons specifically (no engine target for weapon material, only weapon group), plus a DR-bypass rule with no matching target either",
  },
  "bard:solacer:creative-treatment:2": {
    archetypeId: "bard:solacer",
    name: "Creative Treatment",
    level: 2,
    bucket: "situational",
    note: "activated, limited-uses/day Heal-check reroll ability — not a flat number, same bar as the hand-verified table's Scoundrel's Fortune precedent",
  },
  "bard:solacer:inspire-tenacity:1": {
    archetypeId: "bard:solacer",
    name: "Inspire Tenacity",
    level: 1,
    bucket: "subsystem",
    note: "bardic performance modification (ally stabilize + save-bonus aura, granted to allies rather than the bard's own sheet) — no Change-shaped number to extract",
  },
  "bard:songhealer:enhance-healing:2": {
    archetypeId: "bard:songhealer",
    name: "Enhance Healing",
    level: 2,
    bucket: "subsystem",
    note: "activated ability (uses/day = Cha modifier) that boosts an item's caster level for healing effects — resource ability, no Change-shaped number",
  },
  "bard:songhealer:healing-performance:14": {
    archetypeId: "bard:songhealer",
    name: "Healing Performance",
    level: 14,
    bucket: "subsystem",
    note: "bardic performance modification (spends rounds of performance for a heal/harm effect), replaces frightening tune — no Change-shaped number to extract",
  },
  "bard:sorrowsoul:darkness-denied:2": {
    archetypeId: "bard:sorrowsoul",
    name: "Darkness Denied",
    level: 2,
    bucket: "situational",
    note: "real +4 save bonus but scoped to negative energy/death effects specifically — no matching general save target",
  },
  "bard:sorrowsoul:lyric-sorrow:1": {
    archetypeId: "bard:sorrowsoul",
    name: "Lyric Sorrow",
    level: 1,
    bucket: "subsystem",
    note: "bardic performance modification (doubles round cost, boosts inspire courage/greatness/heroics when self-only) — no Change-shaped number to extract",
  },
  "bard:sound-striker:weird-words:6": {
    archetypeId: "bard:sound-striker",
    name: "Weird Words",
    level: 6,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing suggestion: note-tier with the 4d6 sonic / word ranged-touch schedule in words (dice, not a Change)",
  },
  "bard:sound-striker:wordstrike:3": {
    archetypeId: "bard:sound-striker",
    name: "Wordstrike",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence: note-tier with the 1d4 + bard level damage schedule in words (dice, not a Change)",
  },
  "bard:speaker-of-the-palatine-eye:angelic-grace:1": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Angelic Grace",
    level: 1,
    bucket: "subsystem",
    note: "class-skill swap plus a bonus language — no Change-shaped number",
  },
  "bard:speaker-of-the-palatine-eye:corpse-speaker:1": {
    archetypeId: "bard:speaker-of-the-palatine-eye",
    name: "Corpse Speaker",
    level: 1,
    bucket: "subsystem",
    note: "removesTags: [countersong] recorded in bardic-performance-variants/shardE.ts (confirmed via d20pfsrd; the vendored description is missing its own 'replaces countersong' clause). No toggle def: Corpse Speaker never spends a round of bardic performance, it's an independent Su ability, so it stays out of the pool's toggle list.",
  },
  "bard:thundercaller:bardic-performance:0": {
    archetypeId: "bard:thundercaller",
    name: "Bardic Performance",
    level: 0,
    bucket: "subsystem",
    note: "all four performance types (Thunder Call L3, Incite Rage L6, Call Lightning L8, Call Lightning Storm L14) are modeled as level-gated toggles on the Bardic Performance pool in bardic-performance-variants/shardE.ts, note-tier with the enemy-facing save DCs and dice damage schedules in words; removesTags covers inspire competence, suggestion, mass suggestion, dirge of doom, and frightening tune",
  },
  "bard:thundercaller:bound-to-the-land:0": {
    archetypeId: "bard:thundercaller",
    name: "Bound to the Land",
    level: 0,
    bucket: "numeric",
    note: "extracted — see BARD_ARCHETYPE_EFFECTS_EXTRACTED below. Replaces bardic knowledge, and unlike every other bard 'replaces bardic knowledge' claim in this file, this one's pairedBaseFeatureUuid correctly matches Bardic Knowledge's own uuid (verified against classes.json/class-features.json), so activeArchetypeSwaps genuinely suppresses it — safe to extract with no double-count risk",
  },
  "bard:watersinger:lifewater:5": {
    archetypeId: "bard:watersinger",
    name: "Lifewater",
    level: 5,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts): note-tier, sicken-or-reposition schedule in words; replaces only the 5th-level use of lore master, which isn't itself a pool toggle tag so no removesTags entry applies",
  },
  "bard:watersinger:watersong:1": {
    archetypeId: "bard:watersinger",
    name: "Watersong",
    level: 1,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing fascinate, suggestion, and mass suggestion: note-tier, water-shaping mechanic and hardness/HP schedule in words",
  },
  "bard:watersinger:waterstrike:3": {
    archetypeId: "bard:watersinger",
    name: "Waterstrike",
    level: 3,
    bucket: "subsystem",
    note: "variant performance toggle on the Bardic Performance pool (bardic-performance-variants/shardE.ts), replacing inspire competence: note-tier, dice slam-damage schedule in words",
  },
};

/**
 * ── BARD_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────────
 *
 * Machine-extracted mechanical effects for bard archetype class features (wave
 * 2). Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine; no
 * Foundry source was consulted (DESIGN.md §6).
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

  // ── Genuinely paired swap of Bardic Knowledge ─────────────────────────────
  // Unlike every other "replaces bardic knowledge" claim in this file, this
  // feature's vendored pairedBaseFeatureUuid actually matches Bardic
  // Knowledge's own uuid (verified against classes.json/class-features.json),
  // so activeArchetypeSwaps genuinely suppresses Bardic Knowledge when this
  // archetype is active — safe to extract with no double-count risk, even
  // though the replacement bonus itself touches a Knowledge sub-skill.

  "bard:thundercaller:bound-to-the-land:0": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.han"),
      c("floor(@class.unlevel / 2)", "skill.kna"),
      c("floor(@class.unlevel / 2)", "skill.sur"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Handle Animal/Knowledge (nature)/Survival`,
    confidence: "high",
    provenance:
      "A thundercaller gains a bonus equal to half her level on Handle Animal checks, Knowledge (nature) " +
      "checks, and Survival checks. This replaces bardic knowledge.",
  },

  // ── Maneuver-scoped cmd / save-category-scoped Reflex (Change.maneuverCategories / Change.saveCategories) ──

  // Sea Singer's "Sea Legs": the CMD-vs-maneuvers half only (flat, unscoped
  // by anything else). The air/water-effects and prone-causing-effects save
  // bonus has no matching SAVE_CATEGORIES entry and is dropped.
  "bard:sea-singer:sea-legs:2": {
    changes: [
      {
        formula: "2",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["grapple", "overrun", "trip"],
      },
    ],
    detail: () => "+2 CMD vs. grapple/overrun/trip (air/water/prone save bonus not modeled)",
    confidence: "high",
    provenance:
      "He gains a +2 bonus to CMD against grapple, overrun, and trip. This ability replaces well-versed.",
  },

  // Archaeologist's "Trap Sense": the vendored description field for this id
  // is a data-pipeline mispairing (byte-identical to Inspire Competence's),
  // so this provenance is drawn from aonprd.com's Archaeologist page instead
  // of the (corrupted) vendored text — see this file's classification note
  // for the same id. Both the Reflex and dodge-AC halves are expressible.
  "bard:archaeologist:trap-sense:3": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 3), 1 + floor((@class.unlevel - 3) / 3), 0)",
        target: "ref",
        type: "untyped",
        saveCategories: ["traps"],
      },
      {
        formula: "if(gte(@class.unlevel, 3), 1 + floor((@class.unlevel - 3) / 3), 0)",
        target: "ac",
        type: "dodge",
        acCategories: ["traps"],
      },
    ],
    detail: (level) =>
      level >= 3
        ? `+${1 + Math.floor((level - 3) / 3)} Reflex and dodge AC vs. traps`
        : "not yet granted",
    confidence: "high",
    provenance:
      "At 3rd level, an archaeologist gains trap sense +1, as the rogue class feature of the " +
      "same name. An archaeologist gains an intuitive sense that alerts her to danger from " +
      "traps, giving her a +1 bonus on Reflex saves made to avoid traps and a +1 dodge bonus " +
      "to AC against attacks made by traps, with this bonus improving by +1 for every three " +
      "levels gained after 3rd, to a maximum of +6 at 18th level. (aonprd.com, Archaeologist " +
      "archetype; the vendored description for this id is mispaired, see this file's " +
      "classification entry)",
  },
};
