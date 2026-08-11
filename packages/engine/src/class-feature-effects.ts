/**
 * Hand-authored extra `Change[]` appended to vendored class features whose own
 * `changes[]` are missing a numeric effect their published description text
 * promises — the class-feature counterpart of `buff-effects.ts`'s
 * `BUFF_CHANGE_PATCHES`, and the same clean-room posture as
 * `feat-effects.ts`/`archetype-effects.ts`.
 *
 * The gap this exists for: a class feature whose benefit is a save bonus
 * against a CATEGORY of effects (fighter Bravery's "+1 on Will saves against
 * fear") carries no vendored `Change`, because the pack has no way to say
 * "against fear". `Change.saveCategories` can now say it, so the bonus becomes
 * a real number instead of description prose nobody reads mid-combat.
 *
 * Keyed by the feature's NAME, not its `RefData.classFeatures` id (a content
 * hash that could shift across a data-pipeline rebuild), matching
 * `BUFF_CHANGE_PATCHES`. Applied in `collect.ts`'s class-feature loop, which
 * means the formulas are evaluated with that granting class's own level in
 * scope: `@class.unlevel` is THIS class's level, which is what a
 * "+1 per four levels after 2nd" progression needs.
 *
 * That loop only walks `RefData.classes[*].features` (a base/prestige class's
 * own automatic grant list) — it never sees a domain granted power, a chosen
 * arcane discovery/rage power/hex/revelation/talent, or an archetype feature
 * (those each have their own dedicated collection path, most of which don't
 * consult this table at all), and it does not honor `Change.activeWhenBuff`
 * (`collectModifiers`' own comment: "Items, class features, buffs, and
 * conditions deliberately skip the check"). A name that resolves through a
 * different path is a silent no-op here, so every key below was checked
 * against `RefData.classes[*].features` before being added, not just against
 * the description text.
 *
 * Deliberately NOT promoted, and why (the vendored gap sweep surfaced ~80
 * candidates; most fail one of these):
 * - Ally/mount-only, not a bonus to the character carrying the feature:
 *   cavalier/samurai Banner and Greater Banner, paladin Aura of
 *   Courage/Resolve/Righteousness (already carry their own `immEffect.*`
 *   self-immunity change; the +bonus is for allies only), Shaitan's Blessing
 *   (the mount's save, not the rider's), Tranquility Aura (redundant with the
 *   same class's own Tranquility once it is read as covering the caster too,
 *   and ambiguous enough about self-inclusion not to risk), Companion Soul
 *   (the animal companion's devotion save, not the warden's), Command: None
 *   Shall Fall, Freed by Blood, To the Rescue.
 * - Antipaladin auras impose a PENALTY on nearby enemies, not a bonus on the
 *   antipaladin: Aura of Cowardice, Aura of Depravity.
 * - Scoped to a property of the effect's source rather than to a kind of
 *   effect, which the vocabulary has no axis for: Blessed Conviction/Deadly
 *   Conviction ("created by undead creatures"), Eradication ("of outsiders"),
 *   Crusader/Resist Nature's Lure (vs. a named creature type), Blood
 *   Sanctuary (spells "he or an ally casts" specifically), Founders' Favor
 *   and Favor: Dotara's Shroud ("created by city guards"), Nonbeliever and
 *   Mistrust of Magic (scoped to a spellcasting TRADITION - arcane, divine,
 *   psychic - a distinction `SAVE_CATEGORIES` does not carry).
 * - Needs a player choice to know its scope, which a static table entry can't
 *   express: Force of Will (picks a descriptor from a list), Cypher:
 *   Thassilonian Focus (picks a school), Defy Danger (picks a danger).
 * - Narrower than any category in the vocabulary (traps, writing-based
 *   magic, visual effects, sonic/language-dependent effects, elemental
 *   descriptors, pain effects are all real PF1 scopes with no
 *   `SAVE_CATEGORIES` entry): Cypherlord, Sigil Master, Signifer Mask,
 *   Well-Versed, Eye of the Storm, Masochism, Trap Sense (every variant),
 *   Danger Sense's trap-Reflex variant.
 * - Needs an activation, a per-day/per-use resource, or is conditioned on
 *   live buff/creature state this loop cannot read (raging, a manifested
 *   phantom's mode): Scar: Suffering, Energumen, Alien Mind, Indomitable
 *   Will, Shared Consciousness, Spiritual Interference and its Greater
 *   version.
 * - Scoped to one use of a skill, not the skill wholesale: Alchemist Alchemy
 *   (the class-level Craft (alchemy) bonus applies only to checks made to
 *   create alchemical items; published stat blocks print it parenthetically).
 * - Explicitly non-stacking with same-shaped effects, which untyped bonuses
 *   cannot express: Heritor's Honor (Cha to Will, "doesn't stack with those
 *   from similar effects" — would double-count with antipaladin Unholy
 *   Resilience or paladin Divine Grace).
 * - Not reachable through this table at all: Guarded Mind is a domain
 *   granted power (`RefData.domains[*].features`, a different collection
 *   path with no patch hook), Void Awareness is a chosen wizard arcane
 *   discovery (no per-discovery collection loop exists).
 */

import type { Change } from "@pf1/schema";

/**
 * Fighter's signature always-on save bonus, and the most conspicuous vendored
 * gap this table closes: every fighter has this from 2nd level, so a
 * conditional line missing under Will was the motivating case. "Starting at
 * 2nd level, a fighter gains a +1 bonus on Will saves against fear. This
 * bonus increases by +1 for every four levels beyond 2nd" (Core Rulebook):
 * +1 at 2nd, +2 at 6th, +3 at 10th, ... `@class.unlevel` is fighter level
 * specifically (a multiclass fighter's Bravery does not scale off other
 * classes), matching "levels beyond 2nd" read as fighter levels.
 */
const BRAVERY: Change = {
  formula: "1 + floor((@class.unlevel - 2) / 4)",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["fear"],
};

/**
 * "The monk gains a +2 bonus on saving throws against enchantment spells and
 * effects" (Core Rulebook, 3rd level; Monk Unchained grants the identically
 * worded feature too). Untyped in both editions' text.
 */
const STILL_MIND: Change = {
  formula: "2",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["enchantment"],
};

/**
 * Steel Falcon (prestige, Faction Guide) 1st level: "gains a +4 morale bonus
 * on saving throws against charm and compulsion effects and attempts to
 * possess her body or mind." All three named scopes exist in the vocabulary
 * (charm and compulsion are the two enchantment subschools; "attempts to
 * possess" is the `possession` category), and the text names charm and
 * compulsion individually rather than their `enchantment` parent, so all
 * three are listed rather than collapsed to one.
 */
const HEART_OF_FREEDOM: Change = {
  formula: "4",
  target: "allSavingThrows",
  type: "morale",
  saveCategories: ["charm", "compulsion", "possession"],
};

/**
 * Brightness Seeker (prestige, Faiths of Purity) 2nd level: "Brightness
 * Seekers... gain a +10 resistance bonus on saves against fear effects."
 */
const TRANQUILITY: Change = {
  formula: "10",
  target: "allSavingThrows",
  type: "resistance",
  saveCategories: ["fear"],
};

/**
 * Sanguine Angel (prestige, Faiths of Corruption) 5th level: "a sanguine
 * angel gains Alertness as a bonus feat and gains a +4 profane bonus on Will
 * saves against illusions." The bonus feat is granted through the web layer's
 * `grantedFeats`, not this table (see the `bonusFeats` note on the domain
 * loop above this table's own doc comment); only the save half is a gap here.
 */
const EYE_OF_MAHATHALLAH: Change = {
  formula: "4",
  target: "allSavingThrows",
  type: "profane",
  saveCategories: ["illusion"],
};

/**
 * Sanguine Angel 9th level: "she gains a +4 profane bonus on saving throws
 * against emotion and pain effects, and she is immune to fear effects." Only
 * `emotion` is promoted: `pain` names no `SAVE_CATEGORIES` entry (PF1 has no
 * uniform "pain" descriptor family the way it has mind-affecting), and the
 * fear immunity is not a bonus.
 */
const HOLLOWNESS_OF_DOLORAS: Change = {
  formula: "4",
  target: "allSavingThrows",
  type: "profane",
  saveCategories: ["emotion"],
};

/**
 * Heritor Knight (prestige, Champions of Corruption) 2nd level: "a heritor
 * knight gains a bonus equal to half her class level on saves against hexes
 * and curse effects." Only `curse` is promoted: hexes (the witch/shaman
 * class feature) are not a `SAVE_CATEGORIES` entry of their own, and folding
 * them into `curse` would be a guess this codebase's curse category
 * deliberately avoids (see `save-categories.ts`'s doc comment on why curse
 * stays unnarrowed rather than assumed).
 */
const WITCHES_WOE: Change = {
  formula: "floor(@class.unlevel / 2)",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["curse"],
};

/**
 * Chernasardo Warden (prestige, Wardens of the Reborn Forge) 1st level: "she
 * gains a +2 bonus on Will saving throws made against compulsions and
 * mind-affecting effects... increases to +3 at 4th level and +4 at 7th
 * level." `mind` alone is used: it is the broadest category the text names,
 * and already covers compulsion as a descendant (`save-categories.ts`'s
 * inheritance), so a separate `compulsion` entry would only ever duplicate
 * the same total under a second label nothing else names.
 */
const UNCHAINED_HEART: Change = {
  formula: "if(gte(@class.unlevel, 7), 4, if(gte(@class.unlevel, 4), 3, 2))",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["mind"],
};

/**
 * Assassin (prestige, Core Rulebook) 2nd level: "an assassin gains a +1 bonus
 * on saving throws against poison; this bonus increases by +1 every two
 * levels thereafter (4th, 6th, 8th, 10th), to a maximum of +5 at 10th level."
 * +1/+2/+3/+4/+5 at 2nd/4th/6th/8th/10th.
 */
const SAVE_BONUS_AGAINST_POISON: Change = {
  formula: "min(5, 1 + floor((@class.unlevel - 2) / 2))",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["poison"],
};

/**
 * Mystery Cultist (prestige, Cults of Golarion) 7th level: "the mystery
 * cultist gains a +2 bonus on saving throws versus disease and poison." Both
 * named categories exist in the vocabulary and both are Fortitude-only, so
 * this produces one line, not two, whenever both totals match.
 */
const INCORRUPTIBLE: Change = {
  formula: "2",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["disease", "poison"],
};

/**
 * Rose Warden (prestige, Faction Guide) 5th level: "A rose warden gains a +2
 * bonus on saving throws to resist charm, compulsion, and fear effects. This
 * bonus increases to +4 at 5th level." The vendored grant level is 5th
 * itself, so every character who has this feature at all already satisfies
 * the "at 5th level" clause — the `if` is kept for fidelity to the published
 * two-tier text rather than collapsed to a bare "4".
 */
const LIBERATED_MIND: Change = {
  formula: "if(gte(@class.unlevel, 5), 4, 2)",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["charm", "compulsion", "fear"],
};

/**
 * Souldrinker (prestige, Book of the Damned) 1st level: "This vow also grants
 * the souldrinker a +3 bonus on saving throws against death effects and
 * negative energy, which stacks with other such bonuses." Only the death half
 * is expressible: negative energy names no `SAVE_CATEGORIES` entry.
 */
const APOCALYPTIC_VOW: Change = {
  formula: "3",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["death"],
};

/**
 * Living Monolith (prestige, Faction Guide) 1st level: "The soul stone grants
 * the living monolith a +2 bonus on saving throws against death effects,
 * mind-affecting effects, effects that grant negative levels, and on saves to
 * overcome negative levels." The negative-level clauses are not promoted:
 * negative levels name no `SAVE_CATEGORIES` entry.
 */
const SOUL_STONE: Change = {
  formula: "2",
  target: "allSavingThrows",
  type: "untyped",
  saveCategories: ["death", "mind"],
};

/**
 * Spherewalker (prestige, Pathfinder #2) 2nd level: "a spherewalker gains a
 * +4 sacred bonus to resist sleep effects and only needs 4 hours of sleep."
 * The reduced-sleep-requirement half is a rules exception with no target.
 */
const EFFICIENT_SLEEP: Change = {
  formula: "4",
  target: "allSavingThrows",
  type: "sacred",
  saveCategories: ["sleep"],
};

/**
 * Proctor (prestige, Concordance of Rivals) 1st level: "The comforting
 * inevitability of this fate grants the proctor a +2 bonus on Will saves."
 * Unscoped, so the bare save target rather than a category.
 */
const SOULTENDED: Change = { formula: "2", target: "will", type: "untyped" };

/**
 * Halfling Opportunist (prestige, Adventurer's Guide) 2nd level: "Her
 * halfling racial bonus on saving throws increases to +2. This bonus
 * increases to +3 at 4th level." Typed `racial` deliberately: the vendored
 * Halfling race's own Halfling Luck change is a racial-typed
 * `allSavingThrows` +1, so a second racial-typed Change with the higher
 * value supersedes it via highest-within-type stacking — exactly the
 * "increases to" semantics. A luck typing would SUM with the racial +1 and
 * over-credit every real halfling entrant by 1.
 */
const EXCEPTIONALLY_LUCKY: Change = {
  formula: "if(gte(@class.unlevel, 4), 3, 2)",
  target: "allSavingThrows",
  type: "racial",
};

/**
 * Asavir (prestige, Qadira Jewel of the East) 10th level: "Both the asavir
 * and her mount gain a +1 luck bonus on all saving throws." The once/day
 * roll-twice ability and the mount's copy are unmodeled (activated / no
 * mount sheet).
 */
const JANNIS_BLESSING: Change = { formula: "1", target: "allSavingThrows", type: "luck" };

/**
 * Duelist (prestige, Core Rulebook) 4th level: "a duelist gains a +2
 * competence bonus on Reflex saves while wearing light or no armor and not
 * using a shield." The gate is expressible with the `@armor.type` /
 * `@shield.type` numeric encodings (0 none, 1 light, 2 medium, 3 heavy),
 * the same paths the psychic-discipline AC formulas already use.
 */
const DUELIST_GRACE: Change = {
  formula: "if(and(lt(@armor.type, 2), lt(@shield.type, 1)), 2, 0)",
  target: "ref",
  type: "competence",
};

/**
 * Duelist (prestige, Core Rulebook) 2nd level: "a duelist gains a +2 bonus on
 * initiative checks, increasing to +4 at 8th level; this stacks with the
 * Improved Initiative feat." Untyped reproduces the stated stacking (Improved
 * Initiative's own bonus is untyped `init` in `feat-effects.ts`).
 */
const IMPROVED_REACTION: Change = {
  formula: "if(gte(@class.unlevel, 8), 4, 2)",
  target: "init",
  type: "untyped",
};

/**
 * Evangelist (prestige, Inner Sea Gods) 2nd level: "the evangelist gains a +1
 * dodge bonus to AC. This bonus increases to +2 at 7th level." Losing it when
 * denied Dex is generic dodge-bonus behavior the engine already applies.
 */
const PROTECTIVE_GRACE: Change = {
  formula: "if(gte(@class.unlevel, 7), 2, 1)",
  target: "ac",
  type: "dodge",
};

/**
 * Dragon Disciple (prestige, Core Rulebook): "a cumulative +1 natural armor
 * bonus to AC at 1st, 4th, and 7th level (+3 total by 7th level)". This is
 * the hand-authored prestige stub (`prestige:dragon-disciple:natural-armor`,
 * empty vendored `changes[]`), and no other class-features entry shares the
 * bare name "Natural Armor".
 */
const DRAGON_DISCIPLE_NATURAL_ARMOR: Change = {
  formula: "min(3, 1 + floor((@class.unlevel - 1) / 3))",
  target: "nac",
  type: "natural",
};

/**
 * Bloatmage (prestige, Pathfinder Chronicles: Seekers of Secrets) 3rd level:
 * "her rolls of fatty, blood-laden flesh grant her a +1 natural armor bonus.
 * At 7th level, this bonus increases to +2 but reduces her speed by 10 feet."
 * The speed penalty is NOT wired: `applySpeedTarget` has no floor clamp, so a
 * bare -10 landSpeed Change could drive a slowed or encumbered bloatmage
 * below the published 5 ft floor.
 */
const CORPULENCE: Change = {
  formula: "if(gte(@class.unlevel, 7), 2, if(gte(@class.unlevel, 3), 1, 0))",
  target: "nac",
  type: "natural",
};

/**
 * Living Monolith (prestige, Faction Guide): "A living monolith gains DR
 * 1/—... At 5th level and again at 8th level, this DR increases by 1." The
 * bare `dr` target is unqualified DR/—; the fortification percentage and
 * disease immunity halves have no engine target.
 */
const FORTIFIED_FLESH: Change = {
  formula: "if(gte(@class.unlevel, 8), 3, if(gte(@class.unlevel, 5), 2, 1))",
  target: "dr",
  type: "untyped",
};

/**
 * Low Templar (prestige, Pathfinder Campaign Setting) 1st level: "gains a +2
 * bonus on all combat maneuver checks." Explicitly "all", so unscoped —
 * unlike the size- or maneuver-scoped bonuses left as prose elsewhere.
 */
const DIRTY_FIGHTING: Change = { formula: "2", target: "cmb", type: "untyped" };

/**
 * Sanguine Angel (prestige, Faiths of Corruption) 10th level: "She gains fire
 * resistance 30, telepathy with a range of 50 feet, and the see in darkness
 * universal monster ability... granting her a fly speed of 50 feet with good
 * maneuverability." The outsider type change and the maneuverability quality
 * have no target. Senses and fly speed use `set` per the engine's sense-grant
 * and speed conventions.
 */
const ANGEL_OF_EISETH: readonly Change[] = [
  { formula: "30", target: "eres.fire", type: "untyped" },
  { formula: "50", target: "sensetele", type: "untyped", operator: "set" },
  { formula: "1", target: "sensesid", type: "untyped", operator: "set" },
  { formula: "50", target: "flySpeed", type: "untyped", operator: "set" },
];

/**
 * Mortal Usher (prestige, Book of the Dead) 9th level: "a mortal usher gains
 * a 60-foot fly speed with good maneuverability and resistance to cold equal
 * to 10 + his class level. The mortal usher gains a +5 circumstance bonus on
 * Acrobatics checks and on concentration checks attempted while casting a
 * spell." Concentration is not a modeled target; the maneuverability quality
 * is untracked.
 */
const VANTH_WINGS: readonly Change[] = [
  { formula: "60", target: "flySpeed", type: "untyped", operator: "set" },
  { formula: "10 + @class.unlevel", target: "eres.cold", type: "untyped" },
  { formula: "5", target: "skill.acr", type: "circumstance" },
];

/**
 * Storm Kindler (prestige, Faiths of Purity): "A Storm Kindler gains a bonus
 * equal to her class level on Fly and Swim checks... She gains resistance to
 * electricity 5 and sonic 5. At 5th level... 10. At 9th level... 20." The
 * weather-concentration waiver is a rules exception with no target.
 */
const OCEANIC_SPIRIT: readonly Change[] = [
  { formula: "@class.unlevel", target: "skill.fly", type: "untyped" },
  { formula: "@class.unlevel", target: "skill.swm", type: "untyped" },
  {
    formula: "if(gte(@class.unlevel, 9), 20, if(gte(@class.unlevel, 5), 10, 5))",
    target: "eres.electricity",
    type: "untyped",
  },
  {
    formula: "if(gte(@class.unlevel, 9), 20, if(gte(@class.unlevel, 5), 10, 5))",
    target: "eres.sonic",
    type: "untyped",
  },
];

/**
 * Gray Gardener (prestige, Inner Sea Magic) 2nd level: "a Gray Gardener
 * receives a morale bonus equal to 1/2 his class level on Intimidate and
 * Sense Motive checks." The formula matches the Inquisitor's own vendored
 * Stern Gaze `changes[]` verbatim — the name-keyed patch therefore also
 * lands on the Inquisitor's entry, harmlessly: same morale type and same
 * value, so highest-within-type stacking keeps the total unchanged. The RAW
 * cross-class level stacking ("class levels stack with other classes that
 * grant stern gaze") is not modeled; each class's copy scales off its own
 * level, which can only under-credit a multiclass, never over-credit.
 */
const STERN_GAZE: readonly Change[] = [
  { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.int", type: "morale" },
  { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.sen", type: "morale" },
];

/**
 * Enchanting Courtesan (prestige, Inner Sea Intrigue) 2nd level: "an
 * enchanting courtesan gains a competence bonus equal to half his class level
 * on Bluff, Diplomacy, Sense Motive, and Sleight of Hand checks." The
 * modifier-substitution clause for attraction targets is not wired (it swaps
 * which ability applies rather than adding a number).
 */
const SEDUCTIVE_INTUITION: readonly Change[] = [
  { formula: "floor(@class.unlevel / 2)", target: "skill.blf", type: "competence" },
  { formula: "floor(@class.unlevel / 2)", target: "skill.dip", type: "competence" },
  { formula: "floor(@class.unlevel / 2)", target: "skill.sen", type: "competence" },
  { formula: "floor(@class.unlevel / 2)", target: "skill.slt", type: "competence" },
];

/**
 * Noble Scion (prestige, Paths of Prestige) 3rd level: "a noble scion gains a
 * bonus equal to 1/2 his class level on Diplomacy, Knowledge (local), and
 * Knowledge (nobility) checks." The DC reduction for other people's checks
 * about the scion has no self-facing target.
 */
const ARISTOCRATIC_ERUDITION: readonly Change[] = [
  { formula: "floor(@class.unlevel / 2)", target: "skill.dip", type: "untyped" },
  { formula: "floor(@class.unlevel / 2)", target: "skill.klo", type: "untyped" },
  { formula: "floor(@class.unlevel / 2)", target: "skill.kno", type: "untyped" },
];

/**
 * Umbral Court Agent (prestige, Paths of Prestige): "An Umbral Court agent
 * gains a competence bonus on Bluff, Diplomacy, and Knowledge (nobility)
 * checks equal to his class level."
 */
const UMBRAL_COURTIER: readonly Change[] = [
  { formula: "@class.unlevel", target: "skill.blf", type: "competence" },
  { formula: "@class.unlevel", target: "skill.dip", type: "competence" },
  { formula: "@class.unlevel", target: "skill.kno", type: "competence" },
];

/**
 * Low Templar (prestige, Pathfinder Campaign Setting) 1st level: "The low
 * templar gains a +2 bonus on all Bluff and Disguise checks, and on
 * Linguistics checks made to create forgeries." The forgery-scoped
 * Linguistics half is narrower than the skill and is not wired.
 */
const FLAG_OF_CONVENIENCE: readonly Change[] = [
  { formula: "2", target: "skill.blf", type: "untyped" },
  { formula: "2", target: "skill.dis", type: "untyped" },
];

/**
 * Lion Blade (prestige, Inner Sea Intrigue) 10th level: "The Lion Blade gains
 * a +10 circumstance bonus on Stealth checks." The spell-resistance-vs-
 * mind-affecting half has no Change-shaped target.
 */
const SILENT_SOUL: Change = { formula: "10", target: "skill.ste", type: "circumstance" };

/**
 * Lion Blade (prestige, Inner Sea Intrigue) 9th level: "She gains a +2
 * circumstance bonus on Disguise checks (this does not stack with the bonus
 * from an actual disguise kit)." The kit's item bonus is unmodeled, so the
 * parenthetical changes nothing here.
 */
const GRANDMASTER_OF_DISGUISE: Change = { formula: "2", target: "skill.dis", type: "circumstance" };

/**
 * Exalted (prestige, Inner Sea Gods) 7th level: the physical trait an exalted
 * gains "confer[s] no special attacks or abilities and impose[s] a -4 penalty
 * on Disguise checks." Permanent from the grant; the chosen protection effect
 * has no expressible target.
 */
const ASPECT_OF_DIVINITY: Change = { formula: "-4", target: "skill.dis", type: "untyped" };

/**
 * Balanced Scale of Abadar (prestige, Faction Guide): "She gains a +2 sacred
 * bonus to all Appraise checks." The fast-appraisal-at-a-penalty alternate
 * use is an action-economy tradeoff, not a number.
 */
const APPRAISING_EYE: Change = { formula: "2", target: "skill.apr", type: "sacred" };

/**
 * Steel Falcon (prestige, Faction Guide) 5th level: "She gains a +10
 * competence bonus on Acrobatics checks to make high or long jumps, a +4
 * bonus on Perception checks, and the benefits of feather fall at all times."
 * Only the Perception line is unscoped; jump checks are narrower than
 * Acrobatics and feather fall is a rules exception.
 */
const TALMANDORS_BLESSING: Change = { formula: "4", target: "skill.per", type: "untyped" };

export const CLASS_FEATURE_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  Bravery: [BRAVERY],
  "Still Mind": [STILL_MIND],
  "Heart of Freedom": [HEART_OF_FREEDOM],
  Tranquility: [TRANQUILITY],
  "Eye of Mahathallah": [EYE_OF_MAHATHALLAH],
  "Hollowness of Doloras": [HOLLOWNESS_OF_DOLORAS],
  "Witches' Woe (Sp, Su)": [WITCHES_WOE],
  "Unchained Heart": [UNCHAINED_HEART],
  "Save Bonus Against Poison": [SAVE_BONUS_AGAINST_POISON],
  Incorruptible: [INCORRUPTIBLE],
  "Liberated Mind": [LIBERATED_MIND],
  "Apocalyptic Vow": [APOCALYPTIC_VOW],
  "Soul Stone": [SOUL_STONE],
  "Efficient Sleep": [EFFICIENT_SLEEP],
  Soultended: [SOULTENDED],
  "Exceptionally Lucky": [EXCEPTIONALLY_LUCKY],
  "Janni's Blessing": [JANNIS_BLESSING],
  Grace: [DUELIST_GRACE],
  "Improved Reaction": [IMPROVED_REACTION],
  "Protective Grace": [PROTECTIVE_GRACE],
  "Natural Armor": [DRAGON_DISCIPLE_NATURAL_ARMOR],
  Corpulence: [CORPULENCE],
  "Fortified Flesh": [FORTIFIED_FLESH],
  "Dirty Fighting": [DIRTY_FIGHTING],
  "Angel of Eiseth": ANGEL_OF_EISETH,
  "Vanth Wings": VANTH_WINGS,
  "Oceanic Spirit": OCEANIC_SPIRIT,
  "Stern Gaze": STERN_GAZE,
  "Seductive Intuition": SEDUCTIVE_INTUITION,
  "Aristocratic Erudition": ARISTOCRATIC_ERUDITION,
  "Umbral Courtier": UMBRAL_COURTIER,
  "Flag of Convenience": FLAG_OF_CONVENIENCE,
  "Silent Soul": [SILENT_SOUL],
  "Grandmaster of Disguise": [GRANDMASTER_OF_DISGUISE],
  "Aspect of Divinity": [ASPECT_OF_DIVINITY],
  "Appraising Eye": [APPRAISING_EYE],
  "Talmandor's Blessing": [TALMANDORS_BLESSING],
};
