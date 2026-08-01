/**
 * Hand-authored category-scoped save bonuses for feats whose benefit the
 * published text states as "+N on saves against X" — the feat counterpart of
 * `class-feature-effects.ts` and `buff-effects.ts`.
 *
 * Why this is a separate table rather than more entries in `FEAT_EFFECTS` or
 * either extracted table: those three form a PRECEDENCE CHAIN
 * (`resolveFeatEffect` takes the first hit and stops), so exactly one entry
 * per feat can ever win. A feat that grants both an unconditional bonus and a
 * scoped save bonus could not express both there without one shadowing the
 * other. `collect.ts` emits this table ADDITIVELY, alongside whatever
 * `resolveFeatEffect` returns, so the two compose.
 *
 * That also means the double-count check is on the author, not the resolver:
 * before adding a slug here, confirm the feat's existing entry (if it has one)
 * doesn't already emit an `allSavingThrows` change covering the same bonus.
 * The test file enforces this.
 *
 * Keyed by `featNameSlug(feat.name)`, matching every other feat table.
 *
 * A feat classified "situational" in `feat-classification.ts` is a CANDIDATE
 * here, not a disqualification: most were classified that way precisely
 * because the bonus applies only against a kind of effect, which is the gap
 * `Change.saveCategories` exists to close. Those classification tables are an
 * audit record of what was read, not a live gate, and are left alone.
 *
 * Clean-room from each feat's vendored `description` text and the published
 * PF1 rules — no Foundry source consulted, matching `feat-effects.ts`.
 *
 * Deliberately NOT promoted, and why (the description-text sweep surfaced 157
 * candidates; most fail one of these):
 * - Scoped to a property of the ATTACKER rather than the effect, which the
 *   vocabulary has no axis for: Vengeful Banisher ("spells or effects
 *   originating from demon worshipers and from creatures of the demon type"),
 *   Witchbreaker ("of hags and witches"), Fey-Guarded ("cast by creatures of
 *   the fey type"), Dragonheart ("of creatures with the dragon type"),
 *   Lastwall Phalanx ("of evil creatures"), Pure Legion Assault ("abilities
 *   from outsiders"), Robot's Bane ("from robots"), Shrouded in Mystery
 *   ("only against humanoid creatures of races other than your own"),
 *   Angelic Blood/Divine Defiance/Fury of the Tainted (a spell's alignment or
 *   casting tradition, not its effect).
 * - Narrower than any category in the vocabulary (pain, elemental/energy
 *   descriptors, written/visual/sonic effects, ability damage/drain, and
 *   "ingested" as a poison sub-scope are all real PF1 scopes with no
 *   `SAVE_CATEGORIES` entry): Flagellant, Implacable, Gray Maiden Initiate's
 *   Scarred option (pain); Inner Flame, Scorching Weapons, Airy Step, Wings
 *   of Air (fire/light/air/electricity descriptors); Careful Reader (written
 *   magic); Hardy Liver, and the "ingested poisons (but not other poisons)"
 *   half of Ironguts and Carrion Feeder's own poison clause (their disease
 *   half is still promoted below, being un-narrowed); Focused Undead
 *   Expertise (ability damage/drain, energy drain, negative energy - also
 *   scales off a favored-enemy bonus this loop can't read, see below);
 *   Improved Shadowy Resistance's own energy-drain/negative-energy clause and
 *   its necromancy-school clause (school is narrower than the whole
 *   spell/SLA axis - only its `death` clause is promoted below).
 * - Grants the bonus to an ally, a mount, or a cohort rather than the
 *   character themselves: Relentless Cheer, Flagbearer, Inspiring Bravery,
 *   Dragonbane Aura, Alien Mindpaths, Taskmaster, Hands of Valor, Devotion
 *   against the Unnatural (the animal companion's save, not the feat-taker's).
 * - Needs an activation, a per-day use, a stance, or a temporary state this
 *   loop cannot read as always-on: Mindful Meditation and Body Control (both
 *   "for 24 hours after you meditate"), Standing Tall (once/day move action),
 *   Dragon Style and Deadhand Style (stance-gated "while using this style"),
 *   Pesh Euphoria (after taking a dose of pesh), Fury of the Tainted ("while
 *   raging"), Battle Cry and Courage in Numbers (scale with nearby allies,
 *   a live-adjacency count this loop doesn't have).
 * - A reroll rather than a bonus (explicitly out of scope): Aboleth Deceiver.
 * - Needs a player choice this static table can't express: Expanded
 *   Resistance and Spell Denial (pick a school), Disciplinary Devotee (a
 *   psychic discipline, and even then scoped to "spells from your
 *   discipline" - narrower than the `spell` axis), Focused Aberration
 *   Expertise (picks Fortitude-vs-transformation or Will-vs-mind-affecting),
 *   Outer Planes Traveler (picks a plane), Gray Maiden Initiate (picks 2 of
 *   several unrelated benefits, only one of which touches saves and even
 *   that is a mixed bonus/penalty scoped to a specific alignment of caster).
 * - Scales off a favored-enemy bonus, which this loop has no per-target-type
 *   number for (favored enemy is keyed by creature type/subtype, not a flat
 *   rollData path): Focused Dragon Expertise, Elf-Magic Defense, Foebane
 *   Magic (also targets favored enemies, not the caster's own save).
 * - Names only an intersection of two axes the vocabulary can express
 *   separately but not combined: Inured to Draconic Majesty ("extraordinary
 *   or supernatural fear effects" specifically - promoting plain `fear` would
 *   also cover fear SPELLS, which the feat's text excludes).
 * - Conditioned on the phantom's manifestation mode, the same "live
 *   creature/buff state this loop cannot read" reject as
 *   `class-feature-effects.ts`'s Spiritual Interference: Shared Soul ("while
 *   your phantom is confined within your consciousness").
 */

import type { FeatChange } from "./feat-effects.js";

/**
 * Fearless Curiosity (human, Cha 13): "You gain a +1 bonus on saving throws
 * against effects with the emotion descriptor." The reduced-severity rider on
 * an active fear effect is a per-round judgment call, not a flat modifier, so
 * only the flat +1 is promoted.
 */
const FEARLESS_CURIOSITY: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "1",
  saveCategories: ["emotion"],
};

/**
 * Intimidating Confidence (human, prereq Fearless Curiosity): "You gain a +1
 * bonus on saving throws against effects with the emotion descriptor; this
 * bonus stacks with the bonus granted by Fearless Curiosity." Both are
 * untyped, which already sums by default (no special-casing needed) - the
 * "stacks with" clause is just confirming the untyped default, not asking for
 * a distinct type.
 */
const INTIMIDATING_CONFIDENCE: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "1",
  saveCategories: ["emotion"],
};

/**
 * Dauntless Destiny (human, prereq Fearless Curiosity): "You gain a +1 bonus
 * on saving throws against effects with the emotion descriptor; this bonus
 * stacks with those granted by Fearless Curiosity and Intimidating
 * Confidence." Same untyped-stacks-by-default reasoning as Intimidating
 * Confidence; the once/day reroll rider is a reroll, not a bonus, and is
 * excluded per this table's scope.
 */
const DAUNTLESS_DESTINY: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "1",
  saveCategories: ["emotion"],
};

/**
 * Eerily Centered (gnome, Bleachling racial trait): "You gain a +4 racial
 * bonus on saving throws against spells and effects with the emotion
 * descriptor." The halved-duration/doubled-activation-cost rider is a
 * secondary effect on effects that land anyway, not a save modifier.
 */
const EERILY_CENTERED: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "4",
  saveCategories: ["emotion"],
};

/**
 * Jackal Heritage (humanoid, 1st level only): "You gain a +2 racial bonus on
 * saving throws against mind-affecting effects." The feat's own Perception
 * bonus is handled by `FEAT_EFFECTS_EXTRACTED_COMMUNITY`'s `jackal-heritage`
 * entry (`target: "skill.per"`), which doesn't touch saves - no overlap.
 */
const JACKAL_HERITAGE: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "2",
  saveCategories: ["mind"],
};

/**
 * Free Spirit (Cha 13, any chaotic alignment): "You gain a +2 morale bonus on
 * saving throws made against mind-affecting effects..." (the rest of the
 * sentence is an Escape Artist/grapple bonus, a different target entirely).
 */
const FREE_SPIRIT: FeatChange = {
  target: "allSavingThrows",
  type: "morale",
  formula: "2",
  saveCategories: ["mind"],
};

/**
 * Uncanny Alertness (prereq Alertness): "...you gain a +2 bonus on saving
 * throws against sleep and charm effects." Sleep and charm are both direct
 * children of `mind`, not of each other, so both are listed rather than
 * collapsed. The feat's own Perception/Sense Motive bonus is handled by
 * `FEAT_EFFECTS_EXTRACTED_COMMUNITY`'s `uncanny-alertness` entry (both
 * `skill.*` targets), which doesn't touch saves - no overlap.
 */
const UNCANNY_ALERTNESS: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "2",
  saveCategories: ["sleep", "charm"],
};

/**
 * Discerning Eye (elf or half-elf, keen senses racial trait): "You receive a
 * +2 racial bonus on saving throws against illusion spells and effects..."
 * (the rest is a Linguistics bonus, a different target).
 */
const DISCERNING_EYE: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "2",
  saveCategories: ["illusion"],
};

/**
 * Scapegoat (prereq Great Fortitude or Iron Will): "You gain a +2 bonus on
 * saving throws against curses." The once/day curse-absorption ability is a
 * standard-action use, not a passive save number, and is excluded.
 */
const SCAPEGOAT: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "2",
  saveCategories: ["curse"],
};

/**
 * Stoic (prereq Iron Will): "You gain a +1 bonus on all saving throws against
 * fear effects." The 24-hour immunity-on-success rider is conditioned on a
 * successful roll against a specific source, not a flat modifier.
 */
const STOIC: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "1",
  saveCategories: ["fear"],
};

/**
 * Focused Discipline: "You gain a +2 bonus on all saving throws against fear
 * effects." The attack/damage/CMB rider that triggers when a fear effect
 * fails against you (plus its Stamina-point Combat Trick variant) is a
 * separate situational combat bonus, not a save modifier.
 */
const FOCUSED_DISCIPLINE: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "2",
  saveCategories: ["fear"],
};

/**
 * Eagle's Resolve (prereq Iron Will): "You receive a +1 bonus on saving
 * throws against mind-affecting effects." The follow-up morale bonus on
 * attack/damage/saves "when you succeed at such a saving throw" is a
 * conditional rider triggered by the roll itself, not a standing modifier.
 */
const EAGLES_RESOLVE: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "1",
  saveCategories: ["mind"],
};

/**
 * Pure Faith (prereq Divine health class feature): "You gain a +4 sacred
 * bonus to saving throws against poison."
 */
const PURE_FAITH: FeatChange = {
  target: "allSavingThrows",
  type: "sacred",
  formula: "4",
  saveCategories: ["poison"],
};

/**
 * Valiant Steed (prereq Animal or magical beast type): "You gain a +4 morale
 * bonus on saves against fear and emotion effects." `fear` and `emotion` are
 * siblings under `mind`, neither an ancestor of the other, so both are
 * listed. The rest of the feat's text (a rider for a creature that can serve
 * as a mount, benefiting the RIDER) is excluded - not the feat-taker's own
 * save.
 */
const VALIANT_STEED: FeatChange = {
  target: "allSavingThrows",
  type: "morale",
  formula: "4",
  saveCategories: ["fear", "emotion"],
};

/**
 * Lifeless Gaze (prereq Iron Will, Bluff 5 ranks): "You gain a +2 insight
 * bonus on Will saving throws against emotion effects..." (the rest is a
 * Bluff bonus and an offensive gaze/Diplomacy rider against a TARGET, neither
 * of which is the feat-taker's own save). The feat's own Bluff bonus is
 * handled by `FEAT_EFFECTS_EXTRACTED_COMMUNITY`'s `lifeless-gaze` entry
 * (`target: "skill.blf"`), which doesn't touch saves - no overlap.
 */
const LIFELESS_GAZE: FeatChange = {
  target: "allSavingThrows",
  type: "insight",
  formula: "2",
  saveCategories: ["emotion"],
};

/**
 * Hard-Headed (base attack bonus +1, dwarf): "You receive a +2 bonus on
 * saves against spells and special abilities that cause you to become
 * staggered or stunned." Only `stun` is promoted - "staggered" names no
 * `SAVE_CATEGORIES` entry of its own, so a staggered-only effect prints no
 * line here even though the feat covers it. The Stamina-point Combat Trick
 * rider is a spend-before-rolling option, not a standing modifier.
 */
const HARD_HEADED: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "2",
  saveCategories: ["stun"],
};

/**
 * Carrion Feeder (tengu): "You gain a +2 racial bonus on saving throws
 * against diseases and ingested poisons (but not other poisons)." Only
 * `disease` is promoted - the poison half is scoped to ingested poisons
 * specifically, and `SAVE_CATEGORIES`' `poison` doesn't distinguish delivery
 * method, so promoting it would also (wrongly) cover injury/inhaled/contact
 * poisons the feat's text explicitly excludes.
 */
const CARRION_FEEDER: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "2",
  saveCategories: ["disease"],
};

/**
 * Jungle Survivalist (prereq Favored terrain [jungle]): "You gain a +2 bonus
 * on saving throws against diseases, poisons, and the distraction ability of
 * creatures with the swarm subtype." Unlike Carrion Feeder/Hardy Liver, this
 * text says "poisons" unqualified, so both `disease` and `poison` are
 * promoted; "distraction" names no category and is left prose.
 */
const JUNGLE_SURVIVALIST: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "2",
  saveCategories: ["disease", "poison"],
};

/**
 * Filth Forager: "You gain a +4 bonus on all saving throws against diseases
 * and any effect that would cause you to become nauseated or sickened." Only
 * `disease` is promoted - nauseated/sickened names no `SAVE_CATEGORIES`
 * entry.
 */
const FILTH_FORAGER: FeatChange = {
  target: "allSavingThrows",
  type: "untyped",
  formula: "4",
  saveCategories: ["disease"],
};

/**
 * Improved Shadowy Resistance (fetchling, shadowy resistance racial trait):
 * "...and gain a +2 racial bonus on saving throws against death effects,
 * energy drain, negative energy, and spells or spell-like abilities of the
 * necromancy school." Only `death` is promoted: energy drain/negative energy
 * name no category, and necromancy is a single school, narrower than the
 * whole `spell`/`sla` axis this vocabulary can express. The feat's negative
 * energy resistance is handled by `FEAT_EFFECTS_EXTRACTED_COMMUNITY`'s
 * `improved-shadowy-resistance` entry (`target: "eres.negativeEnergy"`),
 * which doesn't touch saves - no overlap.
 */
const IMPROVED_SHADOWY_RESISTANCE: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "2",
  saveCategories: ["death"],
};

/**
 * Steel Soul (dwarf, hardy racial trait): "You receive a +4 racial bonus on
 * saving throws against spells and spell-like abilities. This replaces the
 * normal bonus from the dwarf's hardy racial trait."
 *
 * The "replaces" needs no suppression machinery: Hardy's own +2 (recovered
 * from the race's contextNote in `race-save-notes.ts`) is racial too, so
 * highest-within-type resolves the pair to +4 on its own. Hardy's poison half,
 * which this feat does not mention, keeps applying at +2 — which is exactly
 * the published outcome. Note this is a DIFFERENT source from the dwarf
 * alternate racial trait of the same name in `racial-traits.ts`; a dwarf with
 * both still lands on +4, again by highest-within-type.
 */
const STEEL_SOUL: FeatChange = {
  target: "allSavingThrows",
  type: "racial",
  formula: "4",
  saveCategories: ["spell", "sla"],
};

export const FEAT_SAVE_CATEGORY_CHANGES: Readonly<Record<string, readonly FeatChange[]>> = {
  "fearless-curiosity": [FEARLESS_CURIOSITY],
  "intimidating-confidence": [INTIMIDATING_CONFIDENCE],
  "dauntless-destiny": [DAUNTLESS_DESTINY],
  "eerily-centered": [EERILY_CENTERED],
  "jackal-heritage": [JACKAL_HERITAGE],
  "free-spirit": [FREE_SPIRIT],
  "uncanny-alertness": [UNCANNY_ALERTNESS],
  "discerning-eye": [DISCERNING_EYE],
  scapegoat: [SCAPEGOAT],
  stoic: [STOIC],
  "focused-discipline": [FOCUSED_DISCIPLINE],
  "eagle-s-resolve": [EAGLES_RESOLVE],
  "pure-faith": [PURE_FAITH],
  "valiant-steed": [VALIANT_STEED],
  "lifeless-gaze": [LIFELESS_GAZE],
  "hard-headed": [HARD_HEADED],
  "carrion-feeder": [CARRION_FEEDER],
  "jungle-survivalist": [JUNGLE_SURVIVALIST],
  "filth-forager": [FILTH_FORAGER],
  "improved-shadowy-resistance": [IMPROVED_SHADOWY_RESISTANCE],
  "steel-soul": [STEEL_SOUL],
};
