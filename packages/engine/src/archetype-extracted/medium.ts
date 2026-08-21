/**
 * Medium's slice of the pipeline (2026-08-08). Every vendored archetype
 * feature for the class (15 medium archetypes, 74 features) was read in full
 * and bucketed as `numeric` / `situational` / `subsystem` / `blocked`, per the
 * per-class file convention (`index.ts`'s doc comment). This file owns BOTH
 * of medium's pipeline artifacts — `MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION`.
 *
 * ── Medium-specific mechanical facts this pass relies on ──────────────────
 *
 * 1. **Channeled spirits are a modeled pick-list subsystem**
 *    (`medium-spirits.ts`): the currently-channeled spirit lives in
 *    `doc.live.mediumSpirit`, and its Spirit Bonus / Séance Boon / influence
 *    penalty are applied by `collect.ts` reading that field DIRECTLY in
 *    TypeScript — never through a `Change` formula. Critically,
 *    `buildRollData` (`rolldata.ts`) exposes NO `@live.*`/`@mediumSpirit`
 *    path at all, so a `Change` formula in THIS file has no way to condition
 *    on "while channeling spirit X" or "while channeling any spirit" — any
 *    archetype feature phrased that way is, from this pipeline's point of
 *    view, un-checkable, not merely inconvenient. Per the wave brief:
 *    features that swap/restrict which spirits can be channeled, or that add
 *    to / modify what a channeled spirit's Spirit Bonus grants, are
 *    `subsystem` — never `numeric`, even when the archetype locks the
 *    character into a single spirit (e.g. Medium of the Master's Dedicated
 *    Spirit restricts her to Champion only) — the bonus is still gated on
 *    the daily, revocable act of channeling, which this pipeline can't see.
 * 2. **Taboo and Spirit Surge are non-numeric live mechanics.** Taboo grants
 *    a fixed "twice free" spirit-surge-cost waiver and a soft penalty on
 *    violation (`medium-spirits.ts`'s doc comment: "flavor-only example
 *    text... not a tracked toggle"); Spirit Surge is an at-the-table die
 *    roll this app doesn't simulate. Every archetype feature that alters
 *    either (taboo severity, surge die size, surge frequency, when surge can
 *    be used) is `subsystem`.
 * 3. **Several archetypes replace "channel a legendary spirit" with
 *    channeling something else** (a kami, a wendo spirit, an alien
 *    emissary, an outsider, or the medium's own future potential) — these
 *    still route through the same `live.mediumSpirit`/`live.mediumInfluence`
 *    fields per `medium-spirits.ts`'s architecture, so they're classified
 *    exactly like an ordinary spirit-restriction feature: `subsystem`.
 * 4. **Toggle/duration abilities with no live-state field** — Storm
 *    Dreamer's Storm Trance, Nexian Channeler's Third Eye, Spirit Dancer's
 *    Spirit Dance — have no schema field tracking whether the toggle is
 *    currently active, so a bonus gated on "while active" can't be checked
 *    either. Where the underlying bonus is a real number, this is
 *    `situational`; where the feature is itself just resource/duration
 *    bookkeeping with no number, it's `subsystem`.
 * 5. **Knowledge-skill bonuses ARE extractable.** `@skills.<id>.rank` and
 *    `@abilities.<id>.mod` are real roll-data paths (`rolldata.ts`), so a
 *    flat or rank-gated bonus across the ten Knowledge skills (`kar`, `kdu`,
 *    `ken`, `kge`, `khi`, `klo`, `kna`, `kno`, `kpl`, `kre` — confirmed
 *    against `oracle-mysteries.ts`'s own Knowledge-skill lists) is a clean,
 *    unconditional `numeric` extraction, same idiom as the community feat
 *    sweep's rank-gated Skill Focus entries (`feat-effects-extracted-
 *    community.ts`).
 *
 * Two vendored-data oddities worth flagging (not blockers, just recorded):
 * Kami Medium's `taboo:1` and Outer Channeler's `taboo:2` each restate the
 * FULL base "Taboo" class-feature description verbatim, appended with the
 * archetype's own one- or two-sentence alteration — i.e. the vendored data
 * duplicates the base ability's prose inside the archetype override rather
 * than referencing it, unlike every other altered/replaced feature in this
 * table (which state only the delta). Both are still real, distinct
 * archetype-feature ids (not byte-identical duplicates of each other), so
 * both get their own classification entry rather than being dropped.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** The ten Knowledge skill ids (confirmed against `oracle-mysteries.ts`'s classSkills lists / `tables.ts`). */
const KNOWLEDGE_SKILLS = [
  "kar",
  "kdu",
  "ken",
  "kge",
  "khi",
  "klo",
  "kna",
  "kno",
  "kpl",
  "kre",
] as const;

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── medium:fiend-keeper ──
  "medium:fiend-keeper:dark-communion:3": {
    archetypeId: "medium:fiend-keeper",
    name: "Dark Communion",
    level: 3,
    bucket: "subsystem",
    note: "X/day full-round-action ability where the fiend keeper picks ONE of five temporary buff options (profane atk/dmg/AC, darkvision/fly, claw/bite natural attacks, +spirit bonus, or energy resistance) for 1 minute — a resource-gated menu choice, not an always-on number; replaces haunt channeler, location channel, connection channel, and ask the spirits (all themselves subsystem/no vendored numbers)",
  },
  "medium:fiend-keeper:evil-spirit:1": {
    archetypeId: "medium:fiend-keeper",
    name: "Evil Spirit",
    level: 1,
    bucket: "subsystem",
    note: "the fiend keeper's own spirit variant: grants an evil aura at 3+ influence and ties influence gain to evil acts — spirit/influence mechanics are modeled elsewhere (medium-spirits.ts) via doc.live.mediumSpirit/mediumInfluence directly, not through this table's Change formulas; no number to extract here",
  },

  // ── medium:kami-medium ──
  "medium:kami-medium:ask-the-kami:13": {
    archetypeId: "medium:kami-medium",
    name: "Ask the Kami",
    level: 13,
    bucket: "subsystem",
    note: "reflavor of the base Ask the Spirits activated ability (commune with nature instead) — no flat number",
  },
  "medium:kami-medium:kami-channeler:1": {
    archetypeId: "medium:kami-medium",
    name: "Kami Channeler",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit: swaps the six legendary spirits for location-specific kami equivalents and drops archmage entirely — restricts which spirits can be channeled, no number (class note 1)",
  },
  "medium:kami-medium:natural-taboo:1": {
    archetypeId: "medium:kami-medium",
    name: "Natural Taboo",
    level: 1,
    bucket: "subsystem",
    note: "alters taboo: forces the hierophant 'revere nature/avoid metal armor' taboo regardless of channeled spirit — taboo mechanics are non-numeric (class note 2)",
  },
  "medium:kami-medium:ofuda:1": {
    archetypeId: "medium:kami-medium",
    name: "Ofuda",
    level: 1,
    bucket: "subsystem",
    note: "changes spell delivery/targeting mechanics (a physical focus item replacing the normal attack-roll/dispel rules for divine-surge spells) — no Change-shaped number",
  },
  "medium:kami-medium:shikigami:3": {
    archetypeId: "medium:kami-medium",
    name: "Shikigami",
    level: 3,
    bucket: "subsystem",
    note: "grants a familiar (an origami-bound shikigami) — unrelated subsystem, no flat number",
  },
  "medium:kami-medium:taboo:1": {
    archetypeId: "medium:kami-medium",
    name: "Taboo",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Taboo class feature in full (a vendoring oddity — see file header) plus the same 'revere nature/avoid metal armor' note as Natural Taboo above — taboo mechanics are non-numeric (class note 2)",
  },
  "medium:kami-medium:ward:14": {
    archetypeId: "medium:kami-medium",
    name: "Ward",
    level: 14,
    bucket: "subsystem",
    note: "grants the kami subtype's 'ward'/'merge with ward' abilities over a declared location/object, replacing astral journey — a location-bound activated ability, no flat number",
  },

  // ── medium:medium-of-the-master ──
  "medium:medium-of-the-master:dedicated-spirit:1": {
    archetypeId: "medium:medium-of-the-master",
    name: "Dedicated Spirit",
    level: 1,
    bucket: "subsystem",
    note: "restricts the medium to channeling only a champion spirit (plus extra favored locations) — restricts which spirits can be channeled, no number (class note 1)",
  },
  "medium:medium-of-the-master:dedicated-surge:1": {
    archetypeId: "medium:medium-of-the-master",
    name: "Dedicated Surge",
    level: 1,
    bucket: "subsystem",
    note: "grants extra free spirit-surge uses plus a larger surge die — spirit surge is an unmodeled at-the-table die roll (class note 2)",
  },
  "medium:medium-of-the-master:ki-contact:15": {
    archetypeId: "medium:medium-of-the-master",
    name: "Ki Contact",
    level: 15,
    bucket: "subsystem",
    note: "swift-action, influence-spent ability granting a ki power plus temporary ki points — activated resource mechanic, no flat number",
  },
  "medium:medium-of-the-master:master-s-power:1": {
    archetypeId: "medium:medium-of-the-master",
    name: "Master's Power",
    level: 1,
    bucket: "subsystem",
    note: "grants monk-level unarmed strike damage while channeling a champion spirit — gated on currently channeling a spirit (unchecked, class note 1) and there is no engine target for unarmed-strike damage dice regardless",
  },
  "medium:medium-of-the-master:master-s-strike:6": {
    archetypeId: "medium:medium-of-the-master",
    name: "Master's Strike",
    level: 6,
    bucket: "subsystem",
    note: "grants a choosable 'style strike' usable on a Sudden Attack extra blow while channeling a champion spirit — spirit-conditioned choice-list ability, no number",
  },
  "medium:medium-of-the-master:master-s-style:17": {
    archetypeId: "medium:medium-of-the-master",
    name: "Master's Style",
    level: 17,
    bucket: "subsystem",
    note: "grants a bonus style feat plus its two feat-path feats while channeling a champion spirit — a real feat count, but gated on currently channeling a spirit, which this pipeline can't check (class note 1), and it lapses whenever the medium isn't actively channeling that day",
  },
  "medium:medium-of-the-master:shared-prowess:2": {
    archetypeId: "medium:medium-of-the-master",
    name: "Shared Prowess",
    level: 2,
    bucket: "subsystem",
    note:
      "dodge AC equal to the champion spirit's Spirit Bonus while light/unarmored (@armor.type " +
      "<=1 is checkable on its own). Investigated for this wave: the Spirit Bonus value only " +
      "applies while a spirit is actively channeled (doc.live.mediumSpirit), and " +
      "medium-spirits.ts's own architecture applies that directly in collect.ts's TypeScript, " +
      "never through a Change formula — rolldata.ts exposes no @live.mediumSpirit path a Change " +
      "formula in this table could check (class note 1). Wiring this would mean extending " +
      "collect.ts's existing champion-spirit Spirit Bonus loop to also push an archetype-gated " +
      "dodge AC Change (checking doc.build.archetypes for medium-of-the-master) — new " +
      "cross-module plumbing in a file this wave doesn't own, not a self-contained " +
      "medium-spirits.ts addition, so left unwired.",
  },
  "medium:medium-of-the-master:spirit-call:1": {
    archetypeId: "medium:medium-of-the-master",
    name: "Spirit Call",
    level: 1,
    bucket: "subsystem",
    note: "standard-action, influence-spent ability to channel the champion spirit outside a seance — spirit-channeling mechanic, no number (class note 1/2)",
  },

  // ── medium:nexian-channeler ──
  "medium:nexian-channeler:impossible-eye:3": {
    archetypeId: "medium:nexian-channeler",
    name: "Impossible Eye",
    level: 3,
    bucket: "situational",
    note: "real, level-gated bonuses (CL+1 for divination, darkvision 60 ft., detect magic/arcane sight, see invisibility, true seeing, ...) but every one is scoped to 'while his third eye is open', a per-day duration toggle with no live-state field this pipeline can check (class note 4)",
  },
  "medium:nexian-channeler:legend-of-nex:1": {
    archetypeId: "medium:nexian-channeler",
    name: "Legend of Nex",
    level: 1,
    bucket: "subsystem",
    note: "swaps the archmage spirit for a custom 'Nex' legendary spirit — restricts/replaces which spirit can be channeled, no number (class note 1)",
  },
  "medium:nexian-channeler:living-third-eye:20": {
    archetypeId: "medium:nexian-channeler",
    name: "Living Third Eye",
    level: 20,
    bucket: "subsystem",
    note: "makes the (situational, toggle-gated) third eye from Impossible Eye permanently open and grants at-will use of two utility actions (analyze dweomer, read aura) — no number of its own to extract; the senses/CL bonuses it makes permanent live on the separately-classified Impossible Eye entry",
  },
  "medium:nexian-channeler:third-eye-mastery:19": {
    archetypeId: "medium:nexian-channeler",
    name: "Third Eye Mastery",
    level: 19,
    bucket: "subsystem",
    note: "extends the third eye's daily open-duration and lets read aura be used multiple times per day — resource/duration bookkeeping, no flat number",
  },
  "medium:nexian-channeler:third-eye:1": {
    archetypeId: "medium:nexian-channeler",
    name: "Third Eye",
    level: 1,
    bucket: "subsystem",
    note: "reduces knacks known by one but grants Third Eye as a bonus feat, and swaps free spirit-surge uses for third-eye open-duration when a taboo is accepted — alters knacks/taboo, no Change-shaped number",
  },

  // ── medium:outer-channeler ──
  "medium:outer-channeler:ask-the-planes:14": {
    archetypeId: "medium:outer-channeler",
    name: "Ask the Planes",
    level: 14,
    bucket: "subsystem",
    note: "reflavor of the base Ask the Spirits ability (visits the chosen outsider subtype's native plane instead) — no flat number",
  },
  "medium:outer-channeler:outsider-invocation:1": {
    archetypeId: "medium:outer-channeler",
    name: "Outsider Invocation",
    level: 1,
    bucket: "subsystem",
    note: "replaces channeling legendary spirits with invoking outsiders of a chosen subtype (each mapped onto one of the six spirits' benefits) — restricts/alters which 'spirits' can be channeled, no number (class note 1/3)",
  },
  "medium:outer-channeler:servitor:3": {
    archetypeId: "medium:outer-channeler",
    name: "Servitor",
    level: 3,
    bucket: "subsystem",
    note: "grants a familiar (an outsider-typed improved familiar at 7th) — unrelated subsystem",
  },
  "medium:outer-channeler:shared-seance:2": {
    archetypeId: "medium:outer-channeler",
    name: "Shared Seance",
    level: 2,
    bucket: "subsystem",
    note: "shares the medium's Séance Boon with participating allies for 24 hours — an ally-facing bonus, never the character's own number",
  },
  "medium:outer-channeler:site-channeling:5": {
    archetypeId: "medium:outer-channeler",
    name: "Site Channeling",
    level: 5,
    bucket: "subsystem",
    note: "expands the list of valid channeling locations — no Change-shaped number",
  },
  "medium:outer-channeler:taboo:2": {
    archetypeId: "medium:outer-channeler",
    name: "Taboo",
    level: 2,
    bucket: "subsystem",
    note: "restates the base Taboo class feature in full (same vendoring oddity as Kami Medium's taboo:1 — see file header) plus a mandatory-taboo rule for invoked outsiders — taboo mechanics are non-numeric (class note 2)",
  },

  // ── medium:reanimated-medium ──
  "medium:reanimated-medium:channel-self:1": {
    archetypeId: "medium:reanimated-medium",
    name: "Channel Self",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit: the reanimated medium possesses its own body instead of channeling a legend, with influence gain/loss and control thresholds inverted — a wholesale spirit/influence-mechanic replacement, no number (class note 1/3)",
  },
  "medium:reanimated-medium:ease-passage:3": {
    archetypeId: "medium:reanimated-medium",
    name: "Ease Passage",
    level: 3,
    bucket: "subsystem",
    note: "reduces the negative levels taken from raise dead from 2 to 1 — a real, exact number, but negative levels/raise dead outcomes aren't modeled anywhere in this engine, same posture as other whole-mechanic-unmodeled entries in this table",
  },
  "medium:reanimated-medium:lingering-spirit:5": {
    archetypeId: "medium:reanimated-medium",
    name: "Lingering Spirit",
    level: 5,
    bucket: "subsystem",
    note: "influence-spent ability letting the spirit linger 1 round after death to allow healing — death-state/influence mechanic, no flat number",
  },
  "medium:reanimated-medium:living-legend:20": {
    archetypeId: "medium:reanimated-medium",
    name: "Living Legend",
    level: 20,
    bucket: "subsystem",
    note: "lets allies perform a seance to borrow the reanimated medium's own abilities — an ally-facing mechanic, never the character's own number",
  },
  "medium:reanimated-medium:nothing-is-taboo:2": {
    archetypeId: "medium:reanimated-medium",
    name: "Nothing Is Taboo",
    level: 2,
    bucket: "subsystem",
    note: "the reanimated medium simply doesn't gain the Taboo class feature — a removal, not a number",
  },
  "medium:reanimated-medium:spirit-warding:7": {
    archetypeId: "medium:reanimated-medium",
    name: "Spirit Warding",
    level: 7,
    bucket: "blocked",
    note: "+4 on saves vs. possession, death effects, AND negative energy, upgrading to full immunity at 18th — 'possession' and 'death' exist in save-categories.ts's closed SAVE_CATEGORIES vocabulary but 'negative energy' has no matching key (and inventing one is prohibited), and the 18th-level immunity upgrade has no expressible target either; recording as blocked rather than silently extracting only 2 of the 3 named categories",
  },

  // ── medium:relic-channeler ──
  "medium:relic-channeler:apport-relic:5": {
    archetypeId: "medium:relic-channeler",
    name: "Apport Relic",
    level: 5,
    bucket: "subsystem",
    note: "1/day ability to summon a relic from a distance, with a scaling range — an activated ability, not a passive stat",
  },
  "medium:relic-channeler:connection-specialty:7": {
    archetypeId: "medium:relic-channeler",
    name: "Connection Specialty",
    level: 7,
    bucket: "subsystem",
    note: "alters connection channel (usable without location channel) — activated-ability access change, no flat number",
  },
  "medium:relic-channeler:object-reading:3": {
    archetypeId: "medium:relic-channeler",
    name: "Object Reading",
    level: 3,
    bucket: "subsystem",
    note: "grants the occultist's object reading (psychometry) ability — unrelated subsystem, no Change-shaped number",
  },
  "medium:relic-channeler:powerful-bond:1": {
    archetypeId: "medium:relic-channeler",
    name: "Powerful Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants extra spell/proficiency/feat/skill choices from certain spirit powers plus a free Alertness-equivalent while suffering influence penalty — spirit-power choice-list expansion, no flat number (class note 1)",
  },
  "medium:relic-channeler:relics:1": {
    archetypeId: "medium:relic-channeler",
    name: "Relics",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit: replaces location-based channeling with item-based relics and locks in spirit-power/taboo choices per legend — a channeling-mechanic change, no number (class note 1)",
  },

  // ── medium:rivethun-spirit-channeler ──
  "medium:rivethun-spirit-channeler:haunt-channeler:7": {
    archetypeId: "medium:rivethun-spirit-channeler",
    name: "Haunt Channeler",
    level: 7,
    bucket: "subsystem",
    note: "grants surprise-round actions and a damage-funneling/possession interaction against haunts — a rare, narrow subsystem (haunts) with no engine modeling, no flat number",
  },
  "medium:rivethun-spirit-channeler:mind-and-soul:1": {
    archetypeId: "medium:rivethun-spirit-channeler",
    name: "Mind and Soul",
    level: 1,
    bucket: "subsystem",
    note: "the -1 spell known per level is wired via the casting-economy tables; the Wisdom-instead-of-Charisma swap for medium class abilities is an ability-score-basis swap with no Change target (same posture as magus's Eldritch Scion Int-to-Cha swap)",
  },
  "medium:rivethun-spirit-channeler:spiritual-invocation:1": {
    archetypeId: "medium:rivethun-spirit-channeler",
    name: "Spiritual Invocation",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit: channels a local spirit daily instead of a legend (as Spirit Dancer's spirit dance, without the location requirement) — a channeling-mechanic replacement, no number",
  },
  "medium:rivethun-spirit-channeler:spiritual-parley:2": {
    archetypeId: "medium:rivethun-spirit-channeler",
    name: "Spiritual Parley",
    level: 2,
    bucket: "situational",
    note: "real +1/2 medium level to Diplomacy, but scoped to specific target creature types (fey, elementals, most outsiders, undead) — the engine has no notion of the target's creature type",
  },
  "medium:rivethun-spirit-channeler:wrangle-condition:3": {
    archetypeId: "medium:rivethun-spirit-channeler",
    name: "Wrangle Condition",
    level: 3,
    bucket: "subsystem",
    note: "grants the animist shaman's wrangle condition ability (an activated haunt/spirit-condition interaction) — unrelated subsystem, no number",
  },

  // ── medium:spirit-dancer ──
  "medium:spirit-dancer:attacca:18": {
    archetypeId: "medium:spirit-dancer",
    name: "Attacca",
    level: 18,
    bucket: "subsystem",
    note: "removes the post-spirit-dance penalty and lets a new dance start immediately — spirit-dance resource bookkeeping, no flat number",
  },
  "medium:spirit-dancer:dance-of-infinite-forms:20": {
    archetypeId: "medium:spirit-dancer",
    name: "Dance of Infinite Forms",
    level: 20,
    bucket: "subsystem",
    note: "capstone reworking of spirit-dance action economy (extra once-per-day power uses, cheaper troika, all six spirits at once) — resource mechanic, no flat number",
  },
  "medium:spirit-dancer:nothing-is-taboo:2": {
    archetypeId: "medium:spirit-dancer",
    name: "Nothing Is Taboo",
    level: 2,
    bucket: "subsystem",
    note: "the spirit dancer simply doesn't gain the Taboo class feature — a removal, not a number",
  },
  "medium:spirit-dancer:spirit-aura:2": {
    archetypeId: "medium:spirit-dancer",
    name: "Spirit Aura",
    level: 2,
    bucket: "subsystem",
    note: "shares the current Séance Boon with allies within 30 ft. — an ally-facing bonus, never the character's own number",
  },
  "medium:spirit-dancer:spirit-dance:1": {
    archetypeId: "medium:spirit-dancer",
    name: "Spirit Dance",
    level: 1,
    bucket: "subsystem",
    note: "replaces Spirit Bonus/Spirit Surge with a resource pool (rounds of 'spirit dance') that swaps freely among all six prepared spirits — a wholesale channeling-mechanic replacement with no live-state field this pipeline can check, no number",
  },
  "medium:spirit-dancer:spirit-troika:15": {
    archetypeId: "medium:spirit-dancer",
    name: "Spirit Troika",
    level: 15,
    bucket: "subsystem",
    note: "lets spirit dance grant two spirits' worth of abilities at once at extra resource cost — spirit-dance resource mechanic, no flat number",
  },

  // ── medium:spirit-eater ──
  "medium:spirit-eater:consume-spirit:7": {
    archetypeId: "medium:spirit-eater",
    name: "Consume Spirit",
    level: 7,
    bucket: "subsystem",
    note: "activated ability to consume an incorporeal creature for a player-chosen +1 (atk/save/skill) and temp HP equal to the consumed creature's own Hit Dice, capacity gated by spirit bonus — a resource-gated, choice-list ability whose temp HP value isn't even derivable from the medium's own sheet, no unconditional number",
  },
  "medium:spirit-eater:ectoplasmic-strikes:3": {
    archetypeId: "medium:spirit-eater",
    name: "Ectoplasmic Strikes",
    level: 3,
    bucket: "subsystem",
    note: "grants all attacks the ghost touch weapon property (bypasses incorporeal miss chance) — a boolean weapon-property grant, not a Change-shaped number; no target family for this exists",
  },

  // ── medium:storm-dreamer ──
  "medium:storm-dreamer:dream-storm:5": {
    archetypeId: "medium:storm-dreamer",
    name: "Dream Storm",
    level: 5,
    bucket: "subsystem",
    note: "choice-gated among call lightning/sleet storm/wind wall, each cast costing a minute of Storm Trance duration rather than a day/week counter — non-counter budget",
  },
  "medium:storm-dreamer:gozreh-s-domain:1": {
    archetypeId: "medium:storm-dreamer",
    name: "Gozreh's Domain",
    level: 1,
    bucket: "subsystem",
    note: "grants the 1st-level granted power of a player-chosen domain (Air/Animal/Plant/Water/Weather) plus its bonus spells. A PickChoice could record which domain was picked, but every one of the five domains' own 1st-level granted powers (Lightning Arc, Speak with Animals, Wooden Fist, Icicle, Storm Burst) is itself an activated Sp/Su ability with a limited daily/rounds-per-day use, not an always-on number — so no branch would clear the honesty bar regardless of which domain is chosen",
  },
  "medium:storm-dreamer:storm-seer:7": {
    archetypeId: "medium:storm-dreamer",
    name: "Storm Seer",
    level: 7,
    bucket: "situational",
    note: "real blindsense/blindsight and flanking immunity, but scoped to 'while in her storm trance' (and further to stormy weather for the blindsight upgrade) — a toggle/duration state with no live-state field this pipeline can check",
  },
  "medium:storm-dreamer:storm-trance:3": {
    archetypeId: "medium:storm-dreamer",
    name: "Storm Trance",
    level: 3,
    bucket: "situational",
    note: "real energy resistance and save bonuses vs. wind/air/electricity effects, but scoped to 'while in a storm trance', a per-day-duration toggle with no live-state field this pipeline can check",
  },

  // ── medium:storyteller ──
  "medium:storyteller:diminished-spirits:1": {
    archetypeId: "medium:storyteller",
    name: "Diminished Spirits",
    level: 1,
    bucket: "subsystem",
    note: "removes the Séance Boon, forbids channeling a weaker spirit, and starts influence at 2 instead of 1 — spirit/influence mechanic changes, no flat number",
  },
  "medium:storyteller:knowledge-of-tales:1": {
    archetypeId: "medium:storyteller",
    name: "Knowledge of Tales",
    level: 1,
    bucket: "numeric",
    note: "flat, unconditional +1 (scaling every 4 levels) on Knowledge checks for Knowledge skills the storyteller is trained in — rank-gated per skill via @skills.<id>.rank, the same idiom as the community feat sweep's rank-gated Skill Focus entries",
  },
  "medium:storyteller:learn-the-story:7": {
    archetypeId: "medium:storyteller",
    name: "Learn the Story",
    level: 7,
    bucket: "subsystem",
    note: "spends storyteller's performance rounds for retrocognition/legend lore/vision effects — activated, resource-gated, no flat stat",
  },
  "medium:storyteller:living-story:20": {
    archetypeId: "medium:storyteller",
    name: "Living Story",
    level: 20,
    bucket: "subsystem",
    note: "capstone activated ability (a sonic/language-dependent microcosm on nearby listeners) — targets other creatures, not the storyteller's own sheet",
  },
  "medium:storyteller:storyteller-s-performance:2": {
    archetypeId: "medium:storyteller",
    name: "Storyteller's Performance",
    level: 2,
    bucket: "subsystem",
    note: "grants a bardic-performance-style resource (inspire courage/competence/greatness/heroics) — an activated, ally-facing performance ability, same posture as bardic performance itself (never auto-applied)",
  },
  "medium:storyteller:versatile-surge:2": {
    archetypeId: "medium:storyteller",
    name: "Versatile Surge",
    level: 2,
    bucket: "subsystem",
    note: "lets spirit surge be used after any failed ability/skill/save, not just certain rolls — spirit surge is an unmodeled at-the-table die roll",
  },

  // ── medium:uda-wendo ──
  "medium:uda-wendo:class-skills:0": {
    archetypeId: "medium:uda-wendo",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "swaps Perform for Knowledge (geography) and Knowledge (nature) as class skills — a class-skill-list edit, no Change-shaped number",
  },
  "medium:uda-wendo:wendo-s-secrets:2": {
    archetypeId: "medium:uda-wendo",
    name: "Wendo's Secrets",
    level: 2,
    bucket: "numeric",
    note: "flat, unconditional Charisma modifier (if positive) added to all Knowledge checks, on top of the normal Intelligence modifier — a clean ability-mod add-on across the ten Knowledge skills, no condition to check",
  },
  "medium:uda-wendo:wendo-tongue:3": {
    archetypeId: "medium:uda-wendo",
    name: "Wendo Tongue",
    level: 3,
    bucket: "subsystem",
    note: "grants a per-day-minutes pool of speak with dead/animals-and-plants/tongues effects — activated, resource-gated, no flat stat",
  },
  "medium:uda-wendo:wendo:0": {
    archetypeId: "medium:uda-wendo",
    name: "Wendo",
    level: 0,
    bucket: "subsystem",
    note: "alters spirit: channels an otherworldly 'wendo' via sacrifice/burn instead of a legendary spirit, granting a chosen domain's 1st-level power — a channeling-mechanic replacement plus the same unpickable domain-choice gap as Gozreh's Domain, no number",
  },

  // ── medium:vessel-of-the-failed ──
  "medium:vessel-of-the-failed:heroic-exceptions:2": {
    archetypeId: "medium:vessel-of-the-failed",
    name: "Heroic Exceptions",
    level: 2,
    bucket: "subsystem",
    note: "lets a broken-taboo penalty be softened from -2 to -1 in exchange for extra influence — taboo/influence mechanic, no flat number",
  },
  "medium:vessel-of-the-failed:reckless-surge:1": {
    archetypeId: "medium:vessel-of-the-failed",
    name: "Reckless Surge",
    level: 1,
    bucket: "subsystem",
    note: "a percentage-chance bonus-die gamble on a failed roll, paid for with extra influence — spirit surge/influence mechanic with a randomized outcome, no flat number",
  },
  "medium:vessel-of-the-failed:spiritual-swan-song:15": {
    archetypeId: "medium:vessel-of-the-failed",
    name: "Spiritual Swan Song",
    level: 15,
    bucket: "subsystem",
    note: "choice-gated: which spell depends on the possessing spirit's legend (and the archmage/hierophant legends offer a further pick), granted a use at a time by a saving throw rather than a day/week counter — no stored pick to key from",
  },
  "medium:vessel-of-the-failed:will-of-the-failed:1": {
    archetypeId: "medium:vessel-of-the-failed",
    name: "Will of the Failed",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit/spirit mastery: a save-based sequence for delaying loss of control to the spirit, with escalating unavoidable conditions — an influence-mechanic replacement, no flat number",
  },

  // ── medium:voice-of-the-void ──
  "medium:voice-of-the-void:blasphemy:2": {
    archetypeId: "medium:voice-of-the-void",
    name: "Blasphemy",
    level: 2,
    bucket: "subsystem",
    note: "alters taboo (a Charisma-check penalty when accepting one) and increases the spirit-surge die size — taboo/spirit-surge mechanics, no flat number",
  },
  "medium:voice-of-the-void:emissary:1": {
    archetypeId: "medium:voice-of-the-void",
    name: "Emissary",
    level: 1,
    bucket: "subsystem",
    note: "alters spirit: swaps legendary spirits for alien 'emissaries' with a per-influence-point Will/Wisdom penalty and Wisdom-damage-on-control loss — a wholesale spirit/influence-mechanic replacement, no number",
  },
  "medium:voice-of-the-void:surge-of-the-void:1": {
    archetypeId: "medium:voice-of-the-void",
    name: "Surge of the Void",
    level: 1,
    bucket: "subsystem",
    note: "grants extra free spirit-surge uses at the cost of temporary confusion — spirit-surge mechanic, no flat number",
  },
  "medium:voice-of-the-void:void-channeler:3": {
    archetypeId: "medium:voice-of-the-void",
    name: "Void Channeler",
    level: 3,
    bucket: "subsystem",
    note: "a custom dice-based burst (Will save, secondary confusion) with no named-spell equivalent — spell-equivalent effect, an activated area attack rather than a passive character stat",
  },
};

/**
 * ── MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for medium archetype class features
 * (the prose→Change extraction pipeline, medium slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 2 of medium's 74 features
 * cleared the `numeric` bar (see `MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — medium's kit leans almost entirely
 * on the channeled-spirit/influence/taboo/spirit-surge subsystem, which
 * `medium-spirits.ts` already models outside this pipeline's `Change`
 * formulas (see this file's header doc comment, point 1).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or the bonus is gated on a real-but-partial condition this
 *    engine CAN check while a second condition can't be and is dropped.
 *  - "low": not used in this pass.
 */
export const MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Storyteller's "Knowledge of Tales" grants a flat +1 (scaling by 1 every 4
  // medium levels) on Knowledge checks, but ONLY for Knowledge skills the
  // storyteller is trained in ("in which he's trained") — expressed as one
  // rank-gated Change per Knowledge skill, the same `@skills.<id>.rank`
  // idiom the community feat sweep's rank-gated Skill Focus entries use
  // (`feat-effects-extracted-community.ts`).
  "medium:storyteller:knowledge-of-tales:1": {
    changes: KNOWLEDGE_SKILLS.map((id) =>
      c(`if(gte(@skills.${id}.rank, 1), 1 + floor(@class.unlevel / 4), 0)`, `skill.${id}`),
    ),
    detail: (level) => `+${1 + Math.floor(level / 4)} on trained Knowledge skills`,
    confidence: "high",
    provenance:
      "A storyteller gains a +1 bonus on all Knowledge skill checks with Knowledge skills " +
      "in which he's trained. This bonus increases by 1 for every 4 medium levels that he " +
      "possesses.",
  },

  // Uda Wendo's "Wendo's Secrets" adds the Charisma modifier (if positive —
  // "if any") to EVERY Knowledge check, unconditionally, on top of the
  // normal Intelligence modifier the sheet already applies — one flat
  // Change per Knowledge skill, no rank gate (unlike Knowledge of Tales
  // above, the text doesn't require training).
  "medium:uda-wendo:wendo-s-secrets:2": {
    changes: KNOWLEDGE_SKILLS.map((id) => c("max(0, @abilities.cha.mod)", `skill.${id}`)),
    detail: () => "+Cha modifier (if positive) on Knowledge checks, alongside Int",
    confidence: "high",
    provenance:
      "He adds his Charisma bonus (if any) to all Knowledge checks that he attempts in " +
      "addition to his Intelligence modifier.",
  },
};
