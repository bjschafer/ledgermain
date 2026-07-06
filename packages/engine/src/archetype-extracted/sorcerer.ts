/**
 * Sorcerer's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns BOTH of
 * sorcerer's pipeline artifacts — `SORCERER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on
 * a different class never has a reason to touch this file; only `index.ts`
 * (the aggregator) needs one new import + one new spread per class.
 *
 * Scope: all 11 vendored sorcerer archetypes, 36 features.
 * `SORCERER_ARCHETYPE_EFFECTS_EXTRACTED` is EMPTY this wave — every feature
 * that isn't already covered by the pre-existing hand-verified table
 * (`archetype-effects.ts`'s Sorcerer of Sleep's Pesh Expert and Seeker's
 * Tinkering, both flagged `numeric` below with a "hand-verified, ground
 * truth" note and deliberately NOT re-added here, same posture as
 * `bard.ts`'s Archaeologist's Luck) landed `situational`, `subsystem`, or
 * `blocked` on individual reading. This is a real, disclosed finding, not a
 * shortcut — see "Findings" below.
 *
 * **The bloodline-suppression composition gap (per the task's sorcerer-
 * specific instructions).** Sorcerer bloodline arcana/powers are hand-
 * authored in `bloodlines.ts` and applied by a dedicated loop in `collect.ts`
 * that has NO archetype-swap awareness at all (documented in
 * IMPLEMENTATION_PLAN's round-2 section via Sorcerer of Sleep's Pesh
 * Expert). Every one of this file's `pairedBaseFeatureUuid` values (where
 * present) resolves to a "bloodline power"/"bloodline feat" slot rather than
 * a normal `RefData.classFeatures` entry, confirming this gap applies to
 * nearly every archetype in this class. Two features are `blocked`
 * specifically because their OWN correctness depends on suppressing or
 * substituting the character's selected bloodline, which this engine has no
 * mechanism for:
 *
 *  - **Mongrel Mage's Mongrel Reservoir** (L1) doesn't just replace a
 *    bloodline power — it replaces the ENTIRE bloodline class feature,
 *    letting the character select a *different* bloodline each day from a
 *    resource pool, rather than a single bloodline fixed at 1st level (which
 *    is the only shape `build.sorcererBloodline` — the hand-authored,
 *    single-choice equivalent of `build.oracleMystery`/`build.oracleCurse`
 *    — can represent at all). There is no flat number to extract here
 *    either way (it's a resource-pool-gated ACTIVATION mechanic, not a
 *    passive bonus), but it's called out as `blocked` rather than
 *    `subsystem` per the task's explicit framing, since a future pass
 *    attempting to model this archetype at all would need to solve the
 *    daily-bloodline-reselection problem first.
 *  - **Nine-Tailed Heir's Magical Tail** (L3) is a SUSPECTED VENDORED-DATA
 *    BUG: its description is a verbatim copy of the generic, class-wide
 *    bloodline bonus-spell/bonus-feat progression blurb ("Each sorcerer has
 *    a source of magic somewhere in her heritage... At 3rd level, and every
 *    two levels thereafter, a sorcerer learns an additional spell... At 7th
 *    level... a sorcerer receives one bonus feat...") rather than any
 *    kitsune-specific ability — it doesn't even mention "tail" or
 *    "kitsune" anywhere in the body text, only in the feature's own name.
 *    This looks like a CSV row that failed to receive its real replacement
 *    text in the third-party `pf1e-archetypes` compilation. Even setting
 *    the vendored-data question aside, correctly modeling whatever this
 *    archetype ACTUALLY does would require reasoning about the hand-
 *    authored bloodline bonus-spell/feat progression's suppression — same
 *    composition gap as Mongrel Reservoir — so `blocked` either way; not
 *    fixed here per "report suspects, don't fix."
 *
 * No other sorcerer archetype's OWN replacement feature clears the
 * `numeric` bar (see the classification table for each one's specific
 * reason) — so beyond those two `blocked` entries, this composition gap
 * doesn't force any OTHER classification decision this wave (nothing else
 * had a clean number that suppression would have made unsafe to extract).
 *
 * **Findings that should change how a future wave reads (or doesn't need
 * to re-derive) this file:** sorcerer's archetype surface is small (11
 * archetypes) and thematically narrow — most either (a) trade a bloodline
 * power/feat for an ACTIVATED, resource-gated ability (Dragon Drinker's
 * dragon's-blood mechanics, Umbral Scion's darkness manipulation, Tattooed
 * Sorcerer's tattoo abilities, Wishcrafter's wish-granting, Stone Warder's
 * rune-of-warding) with no baseline passive number, or (b) grant a real but
 * narrowly-scoped bonus this engine's honesty bar excludes (Dragon Drinker's
 * Bleeding Spells is scoped to creatures of the dragon type; Razmiran
 * Priest's False Piety is scoped to divine spell-trigger/completion items).
 * A handful of features would apply a bonus to caster level or concentration
 * checks specifically (Stone Warder's Power of Stone, Umbral Scion's Potent
 * Shadows, Wishcrafter's Wishbound Arcana, Seeker's Seeker Lore) — `cl` and
 * `concentration` are both `UNAPPLIED_TARGET_LABELS` targets `targets.ts`
 * documents as collected-and-ignored by `compute()`, so even an otherwise
 * clean, unconditional bonus to either one would silently do nothing on the
 * sheet; these are classified `subsystem` rather than `numeric` for that
 * reason (in addition to most of them ALSO being terrain/school/spell-
 * type-conditional).
 */

import type {
  ArchetypeFeatureClassificationEntry,
  ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "sorcerer:dragon-drinker:bleeding-spells:1": {
    archetypeId: "sorcerer:dragon-drinker",
    name: "Bleeding Spells",
    level: 1,
    bucket: "situational",
    note: "real 1/spell-level bleed damage but scoped to creatures of the dragon type specifically — no matching general target; replaces bloodline arcana (composition gap noted at file top, not a blocker for this entry since there's no number to extract regardless)",
  },
  "sorcerer:dragon-drinker:blood-drinking:1": {
    archetypeId: "sorcerer:dragon-drinker",
    name: "Blood Drinking",
    level: 1,
    bucket: "subsystem",
    note: "activated, item-consumption-gated (or resource-gated free-action fallback) heal/save-bonus mechanic — no baseline Change-shaped number; replaces the claws bloodline power",
  },
  "sorcerer:dragon-drinker:energy-assimilation:7": {
    archetypeId: "sorcerer:dragon-drinker",
    name: "Energy Assimilation",
    level: 7,
    bucket: "subsystem",
    note: "temporarily swaps energy-resistance TYPE (not amount) while drinking specific dragon blood — a conditional state swap, no flat number to extract",
  },
  "sorcerer:dragon-drinker:breath-mimicry:13": {
    archetypeId: "sorcerer:dragon-drinker",
    name: "Breath Mimicry",
    level: 13,
    bucket: "subsystem",
    note: "lets the next breath-weapon use borrow another dragon's shape/energy type — a conditional swap, no Change-shaped number",
  },
  "sorcerer:dragon-drinker:blood-siphon:19": {
    archetypeId: "sorcerer:dragon-drinker",
    name: "Blood Siphon",
    level: 19,
    bucket: "subsystem",
    note: "activated heal/resistance mechanic tied to nearby bleeding dragon-type creatures — no baseline Change-shaped number",
  },
  "sorcerer:eldritch-scrapper:martial-flexibility:1": {
    archetypeId: "sorcerer:eldritch-scrapper",
    name: "Martial Flexibility",
    level: 1,
    bucket: "subsystem",
    note: "grants the brawler's martial flexibility (temporary combat-feat access) as a resource-gated subsystem — no Change-shaped number",
  },
  "sorcerer:eldritch-scrapper:bloodline-weapons:4": {
    archetypeId: "sorcerer:eldritch-scrapper",
    name: "Bloodline Weapons",
    level: 4,
    bucket: "subsystem",
    note: "lets the character choose their 1st-level bloodline power again at 3rd level instead of the normal 3rd-level power — a choice/timing swap, no flat number of its own",
  },
  "sorcerer:mongrel-mage:mongrel-reservoir:1": {
    archetypeId: "sorcerer:mongrel-mage",
    name: "Mongrel Reservoir",
    level: 1,
    bucket: "blocked",
    note: "replaces the ENTIRE bloodline class feature with a daily-reselectable-bloodline resource pool — the character doesn't have a single fixed bloodline the way build.sorcererBloodline (or any other archetype's swap) assumes, so this can't be modeled without solving the daily-bloodline-reselection problem first (see file header). No flat number exists to extract either way (a resource-gated activation, not a passive bonus), but flagged blocked per the bloodline-suppression composition gap rather than a plain subsystem grant.",
  },
  "sorcerer:nine-tailed-heir:magical-tail:3": {
    archetypeId: "sorcerer:nine-tailed-heir",
    name: "Magical Tail",
    level: 3,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA BUG: description is a verbatim copy of the generic, class-wide bloodline bonus-spell/bonus-feat progression blurb, not a kitsune-specific ability (never mentions 'tail'/'kitsune' in the body text) — likely a CSV row that never received its real replacement text. Even setting that aside, whatever this archetype actually modifies would depend on the hand-authored bloodline progression's suppression (same gap as Mongrel Reservoir), so blocked either way. Not fixed here — see file header, 'report suspects, don't fix.'",
  },
  "sorcerer:razmiran-priest:false-piety:1": {
    archetypeId: "sorcerer:razmiran-priest",
    name: "False Piety",
    level: 1,
    bucket: "situational",
    note: "real +1/2-level UMD bonus but scoped to activating divine spell-trigger/spell-completion items specifically — no matching general target; also grants a named bonus feat (False Focus) and swaps class skills, neither of which is Change-shaped",
  },
  "sorcerer:razmiran-priest:lay-healer:3": {
    archetypeId: "sorcerer:razmiran-priest",
    name: "Lay Healer",
    level: 3,
    bucket: "subsystem",
    note: "adds two specific spells to spells known in place of bloodline spells — no Change-shaped number",
  },
  "sorcerer:razmiran-priest:razmiran-channel:9": {
    archetypeId: "sorcerer:razmiran-priest",
    name: "Razmiran Channel",
    level: 9,
    bucket: "subsystem",
    note: "spends a higher-level spell slot + a UMD check to power divine spell-trigger/completion items — a resource-conversion mechanic, no flat number",
  },
  "sorcerer:seeker:tinkering:1": {
    archetypeId: "sorcerer:seeker",
    name: "Tinkering",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts (Disable Device half only; the Perception-to-locate-traps half is scoped and left unmodeled there too)",
  },
  "sorcerer:seeker:seeker-lore:3": {
    archetypeId: "sorcerer:seeker",
    name: "Seeker Lore",
    level: 3,
    bucket: "subsystem",
    note: "real +4 bonus, but on concentration checks and CL-checks-to-overcome-SR — both 'concentration'/'cl' are UNAPPLIED_TARGET_LABELS targets the engine never consumes — plus a Knowledge(arcana)/Spellcraft portion scoped to 'topics associated with his bonus spells' specifically",
  },
  "sorcerer:seeker:seeker-magic:15": {
    archetypeId: "sorcerer:seeker",
    name: "Seeker Magic",
    level: 15,
    bucket: "subsystem",
    note: "reduces a metamagic feat's spell-level cost by 1 on bonus spells specifically — no Change-shaped target for metamagic-cost reduction",
  },
  "sorcerer:sorcerer-of-sleep:pesh-expert:1": {
    archetypeId: "sorcerer:sorcerer-of-sleep",
    name: "Pesh Expert",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts",
  },
  "sorcerer:sorcerer-of-sleep:pesh-touch:1": {
    archetypeId: "sorcerer:sorcerer-of-sleep",
    name: "Pesh Touch",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated (3+Cha/day) touch-attack status-effect ability — no baseline Change-shaped number",
  },
  "sorcerer:sorcerer-of-sleep:sahir-afiyun:1": {
    archetypeId: "sorcerer:sorcerer-of-sleep",
    name: "Sahir-Afiyun",
    level: 1,
    bucket: "subsystem",
    note: "grants a named bonus feat (Sahir-Afiyun) and adds specific feats to the bloodline-feat list — no Change-shaped number",
  },
  "sorcerer:stone-warder:blood-of-the-earth:1": {
    archetypeId: "sorcerer:stone-warder",
    name: "Blood of the Earth",
    level: 1,
    bucket: "subsystem",
    note: "restricts which bloodlines may be selected — a build-choice restriction, no bonus of its own",
  },
  "sorcerer:stone-warder:power-of-stone:1": {
    archetypeId: "sorcerer:stone-warder",
    name: "Power of Stone",
    level: 1,
    bucket: "subsystem",
    note: "real, scaling caster-level bonus, but 'cl' is an UNAPPLIED_TARGET_LABELS target the engine never consumes, and the bonus is additionally conditional on terrain (hills/mountains/underground) — doubly disqualified",
  },
  "sorcerer:stone-warder:rune-of-warding:1": {
    archetypeId: "sorcerer:stone-warder",
    name: "Rune of Warding",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated (3+Cha/day) trap-creation ability that stores a spell — no Change-shaped number",
  },
  "sorcerer:tattooed-sorcerer:bloodline-tattoos:1": {
    archetypeId: "sorcerer:tattooed-sorcerer",
    name: "Bloodline Tattoos",
    level: 1,
    bucket: "subsystem",
    note: "flavor text interacting with the Varisian Tattoo feat (a feat-effects.ts concern, not an archetype-feature Change) — no number of its own",
  },
  "sorcerer:tattooed-sorcerer:familiar-tattoo:1": {
    archetypeId: "sorcerer:tattooed-sorcerer",
    name: "Familiar Tattoo",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar in place of the 1st-level bloodline power — no Change-shaped number",
  },
  "sorcerer:tattooed-sorcerer:varisian-tattoo:1": {
    archetypeId: "sorcerer:tattooed-sorcerer",
    name: "Varisian Tattoo",
    level: 1,
    bucket: "subsystem",
    note: "grants Varisian Tattoo as a named bonus feat (replaces Eschew Materials) — no Change-shaped number",
  },
  "sorcerer:tattooed-sorcerer:create-spell-tattoo:7": {
    archetypeId: "sorcerer:tattooed-sorcerer",
    name: "Create Spell Tattoo",
    level: 7,
    bucket: "subsystem",
    note: "activated, limited-uses/day spell-storing-tattoo ability (replaces a bloodline feat) — no Change-shaped number",
  },
  "sorcerer:tattooed-sorcerer:enhanced-varisian-tattoo:9": {
    archetypeId: "sorcerer:tattooed-sorcerer",
    name: "Enhanced Varisian Tattoo",
    level: 9,
    bucket: "subsystem",
    note: "grants a chosen known spell as a once/day spell-like ability at +2 CL (replaces a bloodline power) — no Change-shaped number",
  },
  "sorcerer:umbral-scion:diminished-spellcasting:1": {
    archetypeId: "sorcerer:umbral-scion",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spells per day of each level by one — no engine target to reduce spell slots (spells-per-day comes from CASTER_MODELS/tables, not collectModifiers)",
  },
  "sorcerer:umbral-scion:encroaching-darkness:1": {
    archetypeId: "sorcerer:umbral-scion",
    name: "Encroaching Darkness",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated (3+Cha/day) light-level-manipulation ability — no Change-shaped number",
  },
  "sorcerer:umbral-scion:shrouded-spells:1": {
    archetypeId: "sorcerer:umbral-scion",
    name: "Shrouded Spells",
    level: 1,
    bucket: "subsystem",
    note: "increases the DC to identify the umbral scion's OWN spells when cast — no engine target for spell-identification DC",
  },
  "sorcerer:umbral-scion:potent-shadows:7": {
    archetypeId: "sorcerer:umbral-scion",
    name: "Potent Shadows",
    level: 7,
    bucket: "subsystem",
    note: "real, scaling caster-level bonus, but 'cl' is an UNAPPLIED_TARGET_LABELS target the engine never consumes, and the bonus is additionally conditional on the shadow subschool/darkness descriptor and dim-light/darkness conditions",
  },
  "sorcerer:umbral-scion:crippling-darkness:13": {
    archetypeId: "sorcerer:umbral-scion",
    name: "Crippling Darkness",
    level: 13,
    bucket: "subsystem",
    note: "increases the save DC of specific spells cast in darkness against a target — no engine target for a scoped, subschool-conditional spell-DC bonus",
  },
  "sorcerer:wishcrafter:wishbound-arcana:1": {
    archetypeId: "sorcerer:wishcrafter",
    name: "Wishbound Arcana",
    level: 1,
    bucket: "subsystem",
    note: "real +1 caster-level bonus, but 'cl' is an UNAPPLIED_TARGET_LABELS target the engine never consumes, and the bonus is additionally conditional on using a creature's wish as a verbal component; replaces bloodline arcana (composition gap noted at file top, not a blocker for this entry since there's no extractable number regardless)",
  },
  "sorcerer:wishcrafter:expanded-wishcraft:3": {
    archetypeId: "sorcerer:wishcrafter",
    name: "Expanded Wishcraft",
    level: 3,
    bucket: "subsystem",
    note: "adds a player-chosen arcane spell to spells known in place of bloodline spells — no Change-shaped number",
  },
  "sorcerer:wishcrafter:heart-s-desire:7": {
    archetypeId: "sorcerer:wishcrafter",
    name: "Heart's Desire",
    level: 7,
    bucket: "subsystem",
    note: "activated Will-save compulsion (replaces a bloodline bonus feat) — no Change-shaped number",
  },
  "sorcerer:wishcrafter:twisted-wish:13": {
    archetypeId: "sorcerer:wishcrafter",
    name: "Twisted Wish",
    level: 13,
    bucket: "subsystem",
    note: "inflicts a save penalty on the TARGET of a wish-fueled spell, not a bonus on the wishcrafter's own sheet — no Change-shaped number for the caster",
  },
  "sorcerer:wishcrafter:perfect-wishcraft:19": {
    archetypeId: "sorcerer:wishcrafter",
    name: "Perfect Wishcraft",
    level: 19,
    bucket: "subsystem",
    note: "activated, once/day cast-any-spell-on-the-list ability (replaces a bloodline bonus feat) — no Change-shaped number",
  },
};

/**
 * ── SORCERER_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────
 *
 * Empty this wave — see the file-header "Findings" section. Every sorcerer
 * archetype feature that clears the `numeric` bar is already covered by the
 * pre-existing hand-verified table (`archetype-effects.ts`'s Sorcerer of
 * Sleep and Seeker entries); no NEW numeric extraction was found across the
 * other 9 archetypes on individual reading. Kept as a typed empty object
 * (not omitted) so `index.ts`'s spread and this file's own export shape stay
 * identical to every other class file in this directory.
 */
export const SORCERER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {};
