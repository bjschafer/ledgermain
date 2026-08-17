/**
 * Shifter's slice of the pipeline. Shifter has no prior hand-authored or
 * extracted archetype content anywhere (`ARCHETYPE_FEATURE_EFFECTS` carries
 * zero `shifter:` keys), so this file establishes the class's slice from
 * scratch: every vendored shifter archetype feature (14 archetypes, 60
 * features) is read in full and bucketed as `numeric` / `situational` /
 * `subsystem` / `blocked`, and the `numeric` ones get a real `Change`-shaped
 * extraction. Per the per-class file convention (`index.ts`'s doc comment),
 * this file owns BOTH of shifter's pipeline artifacts, so a future wave
 * working on a different class never has a reason to touch this file; only
 * `index.ts` (the aggregator, a later integration step not done here) needs a
 * new import + spread line.
 *
 * ── Shifter-specific mechanical facts this pass relies on ─────────────────
 *
 * 1. **Shifter Aspect** (base L1) is an activated minor/major form system
 *    (minutes/day for minor forms). Any number that applies only while an
 *    aspect or form is assumed — and shifter archetypes lean on this shape
 *    almost universally: draconic/fiendish/fey/vermin aspects, devastating
 *    form, style aspects, wild-effigy stone aspects — is an activated stance
 *    the static sheet can't check, so it stays `situational` (real numbers,
 *    form-gated) or `subsystem` (pick-lists/stance systems), the same
 *    posture druid's Totem Transformation family takes in `druid.ts`.
 * 2. **Wild Shape (SHI)** (base L4) rides a vendored
 *    `uses.maxFormula: "@class.unlevel + @abilities.wis.mod"`. Archetype
 *    restatements of its cadence (minutes- or hours-per-day conversions) or
 *    its available form list are `subsystem` — pool sizing isn't a Change
 *    target, and none of them yields a baseline modifier.
 * 3. **Shifter Claws** (base L1, no vendored `changes`) and every archetype
 *    natural-attack reflavor of it (slams, bites, gores, morphic weaponry,
 *    swarm touch attacks) are per-attack profiles — `nattack`/`ndamage`
 *    aren't applied targets (`targets.ts` unapplied list), so these are
 *    `situational`.
 * 4. **Defensive Instinct** (base L2) is the only base shifter feature whose
 *    vendored entry carries real `changes` (Wis mod + level/4 to ac/cmd).
 *    The one archetype feature replacing it (Wild Effigy's Heart of Earth)
 *    extracts nothing here, so no suppression/double-count composition case
 *    arises for this class.
 * 5. **"While unencumbered and wearing no armor or light/medium nonmetal
 *    armor"** — the recurring shifter defense condition. `@armor.type`
 *    (0 none / 1 light / 2 medium / 3 heavy) and
 *    `@attributes.encumbrance.level` (0 light load) are both checkable; the
 *    metal-vs-nonmetal MATERIAL axis is not, so it is dropped and flagged in
 *    `detail`, and the entry rates `medium` confidence (partial-honesty
 *    posture, same as the `@armor.type`-gated entries in `magus.ts`).
 * 6. **Blocked: none found.** Shifter's base kit carries only two vendored
 *    `Change`s (Defensive Instinct's, see note 4, and Timeless Body's
 *    `immEffect.magicalAging`) plus Wild Shape's `uses.maxFormula`; no
 *    extracted entry below lands on any of those targets, and no archetype
 *    feature restates a vendored pool size in an extractable way, so there
 *    is no double-count trap for this class to record.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── shifter:adaptive-shifter ──
  "shifter:adaptive-shifter:adaptive-claws:1": {
    archetypeId: "shifter:adaptive-shifter",
    name: "Adaptive Claws",
    level: 1,
    bucket: "situational",
    note: "swaps the shifter-claws attack profile for a bite/gore/tail-slap choice — per-attack natural-attack profile (class note 3)",
  },
  "shifter:adaptive-shifter:reactive-aspect:1": {
    archetypeId: "shifter:adaptive-shifter",
    name: "Reactive Aspect",
    level: 1,
    bucket: "subsystem",
    note: "activated, uses-per-day (3 + Wis + level) reactive-form buff system lasting until her next turn — resource-gated stance mechanic, no baseline number",
  },
  "shifter:adaptive-shifter:reactive-form:2": {
    archetypeId: "shifter:adaptive-shifter",
    name: "Reactive Form",
    level: 2,
    bucket: "subsystem",
    note: "the reactive-form pick-list itself (two known at 2nd, one more every 2 levels) — choice-list feeding the reactive-aspect stance",
  },

  // ── shifter:dragonblood-shifter ──
  "shifter:dragonblood-shifter:draconic-aspect:1": {
    archetypeId: "shifter:dragonblood-shifter",
    name: "Draconic Aspect",
    level: 1,
    bucket: "situational",
    note: "real scaling energy resistance (5/10/15/20), scent, breath weapon, and 20th-level SR, but all only while in the activated draconic aspect (minutes/day, swift action) — form-gated stance (class note 1); replaces shifter aspect and its improvements",
  },
  "shifter:dragonblood-shifter:greater-wyrmshifter:20": {
    archetypeId: "shifter:dragonblood-shifter",
    name: "Greater Wyrmshifter",
    level: 20,
    bucket: "numeric",
    note: "unconditional immunity to sleep and paralysis effects — both are exact immEffect vocabulary slugs (defenses.ts); the hours-per-day dragon wild shape clause is a wild-shape cadence change (class note 2) and is dropped. Paired base feature (Final Aspect) carries no vendored changes, nothing to double-count",
  },
  "shifter:dragonblood-shifter:improved-wyrmshifter:14": {
    archetypeId: "shifter:dragonblood-shifter",
    name: "Improved Wyrmshifter",
    level: 14,
    bucket: "numeric",
    note: "raises the wyrmshifter racial save bonus to +4 vs. sleep and paralysis effects, both real Change.saveCategories entries — racial typed-bonus stacking (highest-within-type) composes the +2/+4 pair without double-counting; the form-of-the-dragon-II wild shape clause is subsystem (class note 2) and dropped",
  },
  "shifter:dragonblood-shifter:wyrmshifter:9": {
    archetypeId: "shifter:dragonblood-shifter",
    name: "Wyrmshifter",
    level: 9,
    bucket: "numeric",
    note: "unconditional +2 racial bonus on saves vs. sleep and paralysis effects, both expressible via Change.saveCategories (['sleep', 'paralysis']). The delayed dragon-form wild shape clause is a wild-shape modification (class note 2) and is dropped",
  },

  // ── shifter:elementalist-shifter ──
  "shifter:elementalist-shifter:bonus-languages:1": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Bonus Languages",
    level: 1,
    bucket: "subsystem",
    note: "adds the four elemental tongues to the bonus-language options — language list, no Change",
  },
  "shifter:elementalist-shifter:elemental-aspect:1": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Elemental Aspect",
    level: 1,
    bucket: "subsystem",
    note: "swaps the shifter-aspect pick-list for elemental aspects on the same cadence — aspect choice-list (class note 1)",
  },
  "shifter:elementalist-shifter:elemental-form:4": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Elemental Form",
    level: 4,
    bucket: "subsystem",
    note: "changes wild shape to elemental body I limited to her elemental aspect's benefits — wild-shape form modification (class note 2)",
  },
  "shifter:elementalist-shifter:elemental-speech:1": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Elemental Speech",
    level: 1,
    bucket: "subsystem",
    note: "tongues effect vs. matching elemental-subtype creatures, and only while in her elemental aspect — aspect-gated non-numeric grant",
  },
  "shifter:elementalist-shifter:elemental-strike:1": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Elemental Strike",
    level: 1,
    bucket: "situational",
    note: "real scaling energy dice (1d6 to 6d6) on melee attacks, but activated as a swift action and lasting one round — per-attack, activation-gated damage, not a baseline modifier",
  },
  "shifter:elementalist-shifter:omnielementalist:9": {
    archetypeId: "shifter:elementalist-shifter",
    name: "Omnielementalist",
    level: 9,
    bucket: "subsystem",
    note: "dual-minor-form combination auras (miss chance, difficult-terrain/mist/sandstorm areas) active only while maintaining two elemental forms — form-gated effects with no applied targets (miss chance and area auras aren't Change targets)",
  },

  // ── shifter:feyform-shifter ──
  "shifter:feyform-shifter:fey-aspect:1": {
    archetypeId: "shifter:feyform-shifter",
    name: "Fey Aspect",
    level: 1,
    bucket: "situational",
    note: "real scaling DR/cold iron (1 to 10), low-light/darkvision, concealment, fly speed, and enchantment save bonus, but all only while in the activated fey aspect (minutes/day) — form-gated stance (class note 1)",
  },
  "shifter:feyform-shifter:fey-shape:4": {
    archetypeId: "shifter:feyform-shifter",
    name: "Fey Shape",
    level: 4,
    bucket: "subsystem",
    note: "changes wild shape to the fey form I-IV line — wild-shape form modification (class note 2)",
  },
  "shifter:feyform-shifter:fey-shifter:9": {
    archetypeId: "shifter:feyform-shifter",
    name: "Fey Shifter",
    level: 9,
    bucket: "subsystem",
    note: "grants a second (animal) aspect combinable with the fey aspect — aspect pick-list expansion (class note 1)",
  },
  "shifter:feyform-shifter:final-aspect:20": {
    archetypeId: "shifter:feyform-shifter",
    name: "Final Aspect",
    level: 20,
    bucket: "subsystem",
    note: "fourth aspect plus at-will minor/major forms — aspect-system cadence upgrade (class note 1)",
  },
  "shifter:feyform-shifter:greater-fey-shifter:14": {
    archetypeId: "shifter:feyform-shifter",
    name: "Greater Fey Shifter",
    level: 14,
    bucket: "subsystem",
    note: "third aspect, two minor forms alongside the fey aspect — aspect pick-list expansion (class note 1)",
  },

  // ── shifter:fiendflesh-shifter ──
  "shifter:fiendflesh-shifter:chimeric-fiend:9": {
    archetypeId: "shifter:fiendflesh-shifter",
    name: "Chimeric Fiend",
    level: 9,
    bucket: "situational",
    note: "real numbers (acid resistance 10, doubled electricity/fire resistance, +4 profane vs. disease) but chosen per use of fiendish aspect and active only in that form — form-gated daily pick-list",
  },
  "shifter:fiendflesh-shifter:fiendish-aspect:1": {
    archetypeId: "shifter:fiendflesh-shifter",
    name: "Fiendish Aspect",
    level: 1,
    bucket: "situational",
    note: "real scaling DR/good (1 to 10), darkvision, gore attack, fly speed, resistance doubling, and 20th-level immunities/SR, but all only while in the activated fiendish aspect (minutes/day) — form-gated stance (class note 1); the resistance-doubling clause also keeps the always-on fiendish resilience extraction honest (the doubled values are aspect-only)",
  },
  "shifter:fiendflesh-shifter:fiendish-resilience:2": {
    archetypeId: "shifter:fiendflesh-shifter",
    name: "Fiendish Resilience",
    level: 2,
    bucket: "numeric",
    note: "always-on natural armor (+1 to +4) and electricity/fire resistance (5/10/15) gated only on the checkable unencumbered + no/light/medium-armor condition — the nonmetal-material half of the condition isn't checkable and is dropped (class note 5)",
  },
  "shifter:fiendflesh-shifter:greater-chimeric-fiend:14": {
    archetypeId: "shifter:fiendflesh-shifter",
    name: "Greater Chimeric Fiend",
    level: 14,
    bucket: "situational",
    note: "real +4 enhancement ability bonuses and see-in-darkness, but per-use chimeric-fiend picks active only in fiendish aspect — form-gated daily pick-list",
  },
  "shifter:fiendflesh-shifter:infernal-claws:1": {
    archetypeId: "shifter:fiendflesh-shifter",
    name: "Infernal Claws",
    level: 1,
    bucket: "situational",
    note: "shifter claws treated as evil for DR-bypass — per-attack natural-attack profile (class note 3)",
  },

  // ── shifter:holy-beast ──
  "shifter:holy-beast:beast-s-blessing:1": {
    archetypeId: "shifter:holy-beast",
    name: "Beast's Blessing",
    level: 1,
    bucket: "subsystem",
    note: "deity-worship requirement — narrative constraint, no Change",
  },
  "shifter:holy-beast:blessed-claws:1": {
    archetypeId: "shifter:holy-beast",
    name: "Blessed Claws",
    level: 1,
    bucket: "situational",
    note: "shifter claws dealing piercing damage and gaining an aligned-weapon DR-bypass at 3rd — per-attack natural-attack profile (class note 3)",
  },
  "shifter:holy-beast:divine-fury:1": {
    archetypeId: "shifter:holy-beast",
    name: "Divine Fury",
    level: 1,
    bucket: "situational",
    note: "ranger favored enemy restricted to outsider types — real scaling bonuses, but scoped to chosen enemy types the engine can't check (the same enemy-scoped posture as ranger's own favored-enemy family)",
  },

  // ── shifter:leafshifter ──
  "shifter:leafshifter:leafshifter-s-aspect:1": {
    archetypeId: "shifter:leafshifter",
    name: "Leafshifter's Aspect",
    level: 1,
    bucket: "subsystem",
    note: "trades minor forms for a plant-focus pick-list from the plant master hunter archetype — aspect choice-list modification (class note 1)",
  },
  "shifter:leafshifter:shifter-s-slam:1": {
    archetypeId: "shifter:leafshifter",
    name: "Shifter's Slam",
    level: 1,
    bucket: "situational",
    note: "shifter claws as two bludgeoning/piercing slam attacks — per-attack natural-attack profile (class note 3)",
  },

  // ── shifter:oozemorph ──
  "shifter:oozemorph:clinging-ooze:4": {
    archetypeId: "shifter:oozemorph",
    name: "Clinging Ooze",
    level: 4,
    bucket: "situational",
    note: "real climb speed 10 ft., but only in the oozemorph's natural (fluidic-blob) form — for this archetype the natural form is a polymorph state distinct from the played humanoid form (see fluidic body), a form condition the engine can't check",
  },
  "shifter:oozemorph:compression:1": {
    archetypeId: "shifter:oozemorph",
    name: "Compression",
    level: 1,
    bucket: "subsystem",
    note: "compression universal monster rule (squeeze-through-spaces movement rule) — no engine target",
  },
  "shifter:oozemorph:damage-reduction:2": {
    archetypeId: "shifter:oozemorph",
    name: "Damage Reduction",
    level: 2,
    bucket: "numeric",
    note: "always-on scaling DR/slashing (4 to 14) gated only on the checkable unencumbered + no/light-armor condition — the nonmetal-material half isn't checkable and is dropped (class note 5)",
  },
  "shifter:oozemorph:fluidic-body:1": {
    archetypeId: "shifter:oozemorph",
    name: "Fluidic Body",
    level: 1,
    bucket: "subsystem",
    note: "replaces the character's base form with an ooze blob plus a limited-use humanoid-form polymorph system — a whole-form subsystem (crit/precision immunity, item-slot loss, per-day transformations) far outside Change-shaped modeling",
  },
  "shifter:oozemorph:morphic-weaponry:1": {
    archetypeId: "shifter:oozemorph",
    name: "Morphic Weaponry",
    level: 1,
    bucket: "situational",
    note: "creates 2-4 natural attacks of chosen damage types — per-attack natural-attack profiles (class note 3)",
  },
  "shifter:oozemorph:ooze-empathy:1": {
    archetypeId: "shifter:oozemorph",
    name: "Ooze Empathy",
    level: 1,
    bucket: "subsystem",
    note: "wild empathy restricted to oozes — wild empathy has no engine target at all",
  },

  // ── shifter:rageshaper ──
  "shifter:rageshaper:bestial-aspect:4": {
    archetypeId: "shifter:rageshaper",
    name: "Bestial Aspect",
    level: 4,
    bucket: "situational",
    note: "real damage-die step and +10 enhancement speed increases, but only for attacks/movement modes granted by an active polymorph spell — polymorph-state-gated (class note 1)",
  },
  "shifter:rageshaper:devastating-form:1": {
    archetypeId: "shifter:rageshaper",
    name: "Devastating Form",
    level: 1,
    bucket: "subsystem",
    note: "barbarian-rage-based transformation stance (rounds/day, size growth, exit saves, frenzy) — an activated rage/form system, no baseline number",
  },
  "shifter:rageshaper:furious-transformation:5": {
    archetypeId: "shifter:rageshaper",
    name: "Furious Transformation",
    level: 5,
    bucket: "subsystem",
    note: "extends polymorph-subschool bloodrager spells while bloodraging via concentration checks — spellcasting mechanic, no Change",
  },
  "shifter:rageshaper:invulnerable-defenses:2": {
    archetypeId: "shifter:rageshaper",
    name: "Invulnerable Defenses",
    level: 2,
    bucket: "situational",
    note: "real +2 natural armor and DR 2/-, but only while in devastating form (and unencumbered in no/light/medium nonmetal armor) — form-gated stance numbers (class note 1)",
  },
  "shifter:rageshaper:terrible-leap:5": {
    archetypeId: "shifter:rageshaper",
    name: "Terrible Leap",
    level: 5,
    bucket: "subsystem",
    note: "devastating-form-gated, per-day leap movement ability — activated ability, no modifier",
  },
  "shifter:rageshaper:terrible-slam:1": {
    archetypeId: "shifter:rageshaper",
    name: "Terrible Slam",
    level: 1,
    bucket: "situational",
    note: "shifter claws as slam attacks that ignore scaling object hardness — per-attack natural-attack profile (class note 3), and hardness-bypass has no target",
  },
  "shifter:rageshaper:unrestrained-stride:3": {
    archetypeId: "shifter:rageshaper",
    name: "Unrestrained Stride",
    level: 3,
    bucket: "situational",
    note: "difficult-terrain immunity and entangled-condition immunity, but only in devastating form — form-gated (class note 1), and neither clause has an applied target regardless (no terrain target; 'entangled' isn't an immEffect slug)",
  },

  // ── shifter:style-shifter ──
  "shifter:style-shifter:form-of-the-wild:6": {
    archetypeId: "shifter:style-shifter",
    name: "Form of the Wild",
    level: 6,
    bucket: "subsystem",
    note: "grants druid-style wild shape on an hours-per-day cadence — wild-shape subsystem (class note 2)",
  },
  "shifter:style-shifter:natural-strikes:1": {
    archetypeId: "shifter:style-shifter",
    name: "Natural Strikes",
    level: 1,
    bucket: "subsystem",
    note: "virtual Improved Unarmed Strike for feat prerequisites and feat-applicability to claws — prerequisite plumbing, no Change",
  },
  "shifter:style-shifter:style-mastery:1": {
    archetypeId: "shifter:style-shifter",
    name: "Style Mastery",
    level: 1,
    bucket: "numeric",
    note: "flat bonus-feat count (1st, 5th, and every 5 levels: 1 + floor(level/5)) restricted to style feats — bonusFeats is an applied budget target and restricted bonus-feat counts are established precedent; the 5th-level wildcard-style-slot alternative is a player choice not modeled, flagged in detail",
  },
  "shifter:style-shifter:style-shifting:1": {
    archetypeId: "shifter:style-shifter",
    name: "Style Shifting",
    level: 1,
    bucket: "subsystem",
    note: "style-aspect stance system (minutes/day, tied to style-feat stances) — activated stance subsystem (class note 1)",
  },
  "shifter:style-shifter:weapon-and-armor-proficiency:1": {
    archetypeId: "shifter:style-shifter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base shifter proficiency list and metal-armor prohibition — proficiency text, no Change",
  },

  // ── shifter:swarm-shifter ──
  "shifter:swarm-shifter:final-aspect:20": {
    archetypeId: "shifter:swarm-shifter",
    name: "Final Aspect",
    level: 20,
    bucket: "subsystem",
    note: "swarm skin (at will), wired via the spell-like-abilities route (CL = total character level); the swarm-ability picks it draws on are the swarm flow/greater swarm flow subsystem",
  },
  "shifter:swarm-shifter:greater-swarm-flow:14": {
    archetypeId: "shifter:swarm-shifter",
    name: "Greater Swarm Flow",
    level: 14,
    bucket: "situational",
    note: "real numbers (tremorsense 60 ft. + Perception +4, poison stingers, triggered fast healing) but chosen per use of vermin aspect and active only in that form — form-gated daily pick-list",
  },
  "shifter:swarm-shifter:swarm-flow:9": {
    archetypeId: "shifter:swarm-shifter",
    name: "Swarm Flow",
    level: 9,
    bucket: "situational",
    note: "real climb/fly/burrow speeds equal to base speed, but chosen per use of vermin aspect and active only in that form — form-gated daily pick-list",
  },
  "shifter:swarm-shifter:swarmer:4": {
    archetypeId: "shifter:swarm-shifter",
    name: "Swarmer",
    level: 4,
    bucket: "situational",
    note: "activated (swift action) vermin-hands touch attack with scaling dice, replacing claws while active — per-attack, activation-gated profile (class note 3)",
  },
  "shifter:swarm-shifter:vermin-aspect:1": {
    archetypeId: "shifter:swarm-shifter",
    name: "Vermin Aspect",
    level: 1,
    bucket: "situational",
    note: "real +2/+4 natural armor, size increase, and maneuver/crit immunities, but all only while in the activated vermin form (minutes/day) — form-gated stance (class note 1)",
  },

  // ── shifter:verdant-shifter ──
  "shifter:verdant-shifter:speak-with-plants:1": {
    archetypeId: "shifter:verdant-shifter",
    name: "Speak with Plants",
    level: 1,
    bucket: "subsystem",
    note: "speak with plants, wired via the spell-like-abilities route",
  },
  "shifter:verdant-shifter:verdant-body:1": {
    archetypeId: "shifter:verdant-shifter",
    name: "Verdant Body",
    level: 1,
    bucket: "numeric",
    note: "unconditional scaling enhancement bonus to Constitution (+2 at 5th, +4 at 8th, +6 at 15th) — extracted; the plant-creature dual typing and the PARTIAL (25/50%) crit/precision immunity have no applied targets (immEffect.criticalHits would over-claim a full immunity) and are dropped, flagged in detail",
  },
  "shifter:verdant-shifter:wild-armor:2": {
    archetypeId: "shifter:verdant-shifter",
    name: "Wild Armor",
    level: 2,
    bucket: "numeric",
    note: "always-on scaling natural armor (+2 to +7) gated only on the checkable unencumbered + no/light/medium-armor condition — the nonmetal-material half isn't checkable and is dropped (class note 5)",
  },

  // ── shifter:weretouched ──
  "shifter:weretouched:lycanthrope-aspect:1": {
    archetypeId: "shifter:weretouched",
    name: "Lycanthrope Aspect",
    level: 1,
    bucket: "numeric",
    note: "the 5th-level DR/silver equal to half shifter level (max 10) is an unconditional, permanent gain — extracted; the single-aspect restriction is a pick-list change (class note 1) and the curse-of-lycanthropy immunity is narrower than the blanket immEffect.curse slug (would over-claim) — both dropped, flagged in detail. Base Shifter Aspect carries no vendored changes, nothing to double-count",
  },
  "shifter:weretouched:lycanthropic-empathy:1": {
    archetypeId: "shifter:weretouched",
    name: "Lycanthropic Empathy",
    level: 1,
    bucket: "subsystem",
    note: "wild empathy (with a +4 check bonus) restricted to her aspect's animal type — wild empathy has no engine target at all",
  },
  "shifter:weretouched:lycanthropic-wild-shape:4": {
    archetypeId: "shifter:weretouched",
    name: "Lycanthropic Wild Shape",
    level: 4,
    bucket: "subsystem",
    note: "restricts wild shape to the aspect's animal and adds a hybrid form whose +2 Str/+2 natural armor apply only while transformed — wild-shape form modification with form-gated numbers (class note 2)",
  },

  // ── shifter:wild-effigy ──
  "shifter:wild-effigy:armor-plating:1": {
    archetypeId: "shifter:wild-effigy",
    name: "Armor Plating",
    level: 1,
    bucket: "situational",
    note: "real +1 to +6 enhancement to natural armor and DR/adamantine equal to half level, but only while shifted into a minor or major aspect (or aspect wild shape from 6th) — form-gated stance numbers (class note 1)",
  },
  "shifter:wild-effigy:heart-of-earth:4": {
    archetypeId: "shifter:wild-effigy",
    name: "Heart of Earth",
    level: 4,
    bucket: "situational",
    note: "real stabilize-check bonus and 25/50/75% fortification plus petrification/bleed immunities, but only while shifted into an aspect — form-gated (class note 1); replaces defensive instinct (the vendored pairing carries the suppression; nothing extracted here, see class note 4)",
  },
  "shifter:wild-effigy:stoneclaw-strike:6": {
    archetypeId: "shifter:wild-effigy",
    name: "Stoneclaw Strike",
    level: 6,
    bucket: "situational",
    note: "3/day, minute-long DR/hardness-ignoring claw buff paid for with minor-aspect minutes — resource-gated per-attack profile (class note 3)",
  },
};

/**
 * ── SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for shifter archetype class features
 * (the prose→Change extraction pipeline, shifter slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 9 of shifter's 60 features
 * cleared the `numeric` bar (see `SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — shifter archetypes lean almost
 * entirely on activated aspect/form stances and natural-attack profiles,
 * both of which stay classification-only (this file's header notes 1 and 3).
 *
 * Confidence rubric (identical to magus.ts's):
 *  - "high": a single, clearly-worded, fully general (no scope restriction)
 *    bonus or immunity whose vocabulary maps exactly onto an applied target.
 *  - "medium": composed from multiple sentences/tiers, or gated on a
 *    real-but-partial condition this engine CAN check (`@armor.type`,
 *    `@attributes.encumbrance.level`) while a textually-present second
 *    condition (the nonmetal-armor material axis) can't be checked and is
 *    dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass (a would-be "low" is bucketed `blocked`).
 */
export const SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Dragonblood Shifter's "Wyrmshifter" (9th) grants an unconditional +2
  // racial bonus on saves vs. sleep and paralysis effects. Both `sleep` and
  // `paralysis` are real Change.saveCategories entries (save-categories.ts),
  // so the full save-bonus clause is wired. The delayed dragon-form wild
  // shape clause is a wild-shape modification (header note 2) and stays
  // prose-only.
  "shifter:dragonblood-shifter:wyrmshifter:9": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "racial",
        saveCategories: ["sleep", "paralysis"],
      },
    ],
    detail: () => "+2 racial vs. sleep and paralysis (dragon wild shape not modeled)",
    confidence: "medium",
    provenance: "She gains a +2 racial bonus on saving throws against sleep and paralysis effects.",
  },

  // "Improved Wyrmshifter" (14th) raises the same racial bonus to +4 under
  // the same scope. Because both entries share the "racial" stacking type,
  // typed-bonus stacking (highest-within-type) yields the prose's
  // "increases to +4" once both are active, without double-counting — the
  // same composition as magus spell-dancer's insight AC pair. The
  // form-of-the-dragon-II wild shape clause stays prose-only.
  "shifter:dragonblood-shifter:improved-wyrmshifter:14": {
    changes: [
      {
        formula: "4",
        target: "allSavingThrows",
        type: "racial",
        saveCategories: ["sleep", "paralysis"],
      },
    ],
    detail: () => "+4 racial vs. sleep and paralysis (dragon wild shape not modeled)",
    confidence: "medium",
    provenance: "Her bonus on saves against sleep and paralysis effects increases to +4.",
  },

  // "Greater Wyrmshifter" (20th) grants unconditional immunity to sleep and
  // paralysis effects — both are exact slugs in the closed immEffect
  // vocabulary (defenses.ts's EFFECT_IMMUNITY_LABELS), authored with the
  // same flag-shaped c("1", ...) idiom the vendored Timeless Body Change
  // uses. The hours-per-day dragon wild shape clause is a cadence change on
  // the vendored Wild Shape uses.maxFormula (header note 2) and stays
  // prose-only. Paired base feature (Final Aspect) carries zero vendored
  // changes — nothing to double-count.
  "shifter:dragonblood-shifter:greater-wyrmshifter:20": {
    changes: [c("1", "immEffect.sleep"), c("1", "immEffect.paralysis")],
    detail: () => "immune to sleep and paralysis (dragon wild shape not modeled)",
    confidence: "high",
    provenance: "She becomes immune to sleep and paralysis effects.",
  },

  // Fiendflesh Shifter's "Fiendish Resilience" (2nd) is always-on: +1
  // natural armor (+1 more at 4th/12th/20th) and electricity/fire
  // resistance 5 (+5 at 8th/16th), gated on being unencumbered in no armor
  // or light/medium nonmetal armor. @armor.type<=2 and
  // @attributes.encumbrance.level<=0 are checkable; the nonmetal MATERIAL
  // axis is not and is dropped (header note 5). `nac`/type "base" matches
  // the vendored natural-armor convention so it correctly doesn't stack
  // with another natural-armor source. The 10th-level aspect-only
  // resistance doubling lives on Fiendish Aspect (situational) and is
  // deliberately NOT folded in here.
  "shifter:fiendflesh-shifter:fiendish-resilience:2": {
    changes: [
      c(
        "if(and(lte(@armor.type, 2), lte(@attributes.encumbrance.level, 0)), 1 + if(gte(@class.unlevel, 4), 1, 0) + if(gte(@class.unlevel, 12), 1, 0) + if(gte(@class.unlevel, 20), 1, 0), 0)",
        "nac",
        "base",
      ),
      c(
        "if(and(lte(@armor.type, 2), lte(@attributes.encumbrance.level, 0)), 5 + if(gte(@class.unlevel, 8), 5, 0) + if(gte(@class.unlevel, 16), 5, 0), 0)",
        "eres.electricity",
      ),
      c(
        "if(and(lte(@armor.type, 2), lte(@attributes.encumbrance.level, 0)), 5 + if(gte(@class.unlevel, 8), 5, 0) + if(gte(@class.unlevel, 16), 5, 0), 0)",
        "eres.fire",
      ),
    ],
    detail: (level) => {
      const na = 1 + (level >= 4 ? 1 : 0) + (level >= 12 ? 1 : 0) + (level >= 20 ? 1 : 0);
      const res = 5 + (level >= 8 ? 5 : 0) + (level >= 16 ? 5 : 0);
      return `+${na} natural armor, electricity/fire resist ${res} (no/light/medium armor, unencumbered; nonmetal not checked)`;
    },
    confidence: "medium",
    provenance:
      "At 2nd level, a fiendflesh shifter gains a +1 natural armor bonus to her AC and " +
      "resistance 5 to electricity and fire, but only while unencumbered and either wearing " +
      "no armor or wearing light or medium nonmetal armor. At 4th level, 12th level, and 20th " +
      "level, this natural armor bonus increases by 1. At 8th level and 16th level, the " +
      "fiendflesh shifter's resistance to electricity and fire increases by 5.",
  },

  // Oozemorph's "Damage Reduction" (2nd) is always-on scaling DR/slashing
  // (4, +2 at 4th and every 4 levels, to 14 at 20th), gated on being
  // unencumbered in no armor or light nonmetal armor — @armor.type<=1 and
  // @attributes.encumbrance.level<=0 are checkable, the nonmetal axis is
  // dropped (header note 5). dr.slashing is the same qualified-DR prefix
  // idiom oracle's and druid's extracted slices already use.
  "shifter:oozemorph:damage-reduction:2": {
    changes: [
      c(
        "if(and(lte(@armor.type, 1), lte(@attributes.encumbrance.level, 0)), 4 + 2 * floor(@class.unlevel / 4), 0)",
        "dr.slashing",
      ),
    ],
    detail: (level) =>
      `DR ${Math.min(14, 4 + 2 * Math.floor(level / 4))}/slashing (no/light armor, unencumbered; nonmetal not checked)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an oozemorph gains DR 4/slashing while unencumbered and either wearing " +
      "no armor or wearing light nonmetal armor. This damage reduction increases by 2 at 4th " +
      "level and every 4 levels thereafter, to a maximum of DR 14/slashing at 20th level.",
  },

  // Style Shifter's "Style Mastery" grants a flat bonus-feat count on a
  // 1st/5th/every-5-levels cadence (1 + floor(level/5): one at 1st, five by
  // 20th), restricted to style feats — only the count is modeled, the same
  // posture as magus iron-ring-striker's restricted Bonus Feat. From 5th the
  // shifter may take a wildcard style slot INSTEAD of a feat — a player
  // choice this table can't record, so the count is a ceiling; flagged in
  // detail and rated medium.
  "shifter:style-shifter:style-mastery:1": {
    changes: [c("1 + floor(@class.unlevel / 5)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor(level / 5)} bonus style feat(s) (wildcard-slot swap not modeled)`,
    confidence: "medium",
    provenance:
      "At 1st level, 5th level, and every 5 levels thereafter, a style shifter gains a bonus " +
      "style feat.",
  },

  // Verdant Shifter's "Verdant Body" carries one clean unconditional number:
  // a scaling enhancement bonus to Constitution (+2 at 5th, +4 at 8th, +6 at
  // 15th; the feature itself is granted at 1st, so the formula gates each
  // tier on class level). The plant-creature dual typing and the PARTIAL
  // 25/50% crit/precision immunity have no applied targets (a flag-shaped
  // immEffect.criticalHits would over-claim a full immunity) and are
  // dropped, flagged in detail.
  "shifter:verdant-shifter:verdant-body:1": {
    changes: [
      c(
        "if(gte(@class.unlevel, 15), 6, if(gte(@class.unlevel, 8), 4, if(gte(@class.unlevel, 5), 2, 0)))",
        "con",
        "enhancement",
      ),
    ],
    detail: (level) =>
      level >= 5
        ? `+${level >= 15 ? 6 : level >= 8 ? 4 : 2} enhancement Con (partial crit immunity not modeled)`
        : "Con bonus from 5th (partial crit immunity not modeled)",
    confidence: "medium",
    provenance:
      "At 5th level, the verdant shifter gains a +2 enhancement bonus to her Constitution " +
      "score. At 8th level, the enhancement bonus to her Constitution score increases to +4 " +
      "and her immunity to critical hits increases to 50%. At 15th level, the enhancement " +
      "bonus her Constitution score increases to +6.",
  },

  // Verdant Shifter's "Wild Armor" (2nd) is always-on scaling natural armor
  // (+2, +1 at 4th and every 4 levels, to +7 at 20th), gated on being
  // unencumbered in no armor or light/medium nonmetal armor — same
  // checkable-condition split as Fiendish Resilience above (header note 5).
  // `nac`/type "base" keeps it from stacking with another natural-armor
  // source, matching the vendored convention.
  "shifter:verdant-shifter:wild-armor:2": {
    changes: [
      c(
        "if(and(lte(@armor.type, 2), lte(@attributes.encumbrance.level, 0)), 2 + floor(@class.unlevel / 4), 0)",
        "nac",
        "base",
      ),
    ],
    detail: (level) =>
      `+${Math.min(7, 2 + Math.floor(level / 4))} natural armor (no/light/medium armor, unencumbered; nonmetal not checked)`,
    confidence: "medium",
    provenance:
      "At 2nd level, a verdant shifter gains a +2 natural armor bonus to her AC while " +
      "unencumbered and either wearing no armor or wearing light or medium nonmetal armor. " +
      "This bonus increases by 1 at 4th level and every 4 levels thereafter, to a maximum of " +
      "a +7 natural armor bonus to AC at 20th level.",
  },

  // Weretouched's "Lycanthrope Aspect" carries one clean unconditional
  // number: from 5th level, DR/silver equal to half shifter level (max
  // DR 10/silver at 20th) — a permanent gain, not gated on the aspect being
  // active. The single-aspect restriction (a pick-list change) and the
  // curse-of-lycanthropy immunity (narrower than the blanket immEffect.curse
  // slug — using it would over-claim immunity to all curses) are dropped,
  // same keep-the-clean-number posture as magus kensai's Iaijutsu.
  "shifter:weretouched:lycanthrope-aspect:1": {
    changes: [c("if(gte(@class.unlevel, 5), min(10, floor(@class.unlevel / 2)), 0)", "dr.silver")],
    detail: (level) =>
      level >= 5
        ? `DR ${Math.min(10, Math.floor(level / 2))}/silver`
        : "DR/silver from 5th (lycanthropy-curse immunity not modeled)",
    confidence: "high",
    provenance:
      "At 5th level, a weretouched gains DR/silver equal to half her shifter level, to a " +
      "maximum of DR 10/silver at 20th level.",
  },
};
