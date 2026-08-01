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
};
