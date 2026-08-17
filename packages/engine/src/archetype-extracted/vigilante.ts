/**
 * Vigilante's slice of the pipeline (2026-08-08): 27 vigilante archetypes, 143
 * archetype features, read individually and bucketed `numeric` / `situational`
 * / `subsystem` / `blocked` (same methodology the fighter/magus pilots
 * validated). Per the per-class file convention (`index.ts`'s doc comment),
 * this file owns BOTH of vigilante's pipeline artifacts —
 * `VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION`.
 *
 * ── Vigilante-specific mechanical facts this pass relies on ────────────────
 *
 * 1. **Vigilante Talents** and **Social Talents** (`vigilante-talents.ts`'s
 *    `VIGILANTE_TALENTS`/`VIGILANTE_SOCIAL_TALENTS`) are both modeled
 *    pick-list subsystems. An archetype feature that adds a talent to either
 *    pool, restricts the pool, grants a specific talent outright, or swaps
 *    one talent slot for a whole different ability is `subsystem` — the
 *    talent itself (if any) either already lives in those tables or is a
 *    pick this pipeline doesn't reach.
 * 2. **Dual Identity** and **Seamless Guise** (the class's base features) are
 *    narrative — no vendored `changes[]`, no numeric model anywhere in this
 *    engine. Every archetype feature that "alters dual identity" is
 *    `subsystem` even when the alteration itself contains numbers (e.g. a
 *    full elf-to-drow transformation's ability bonuses), because the
 *    transformation mechanic itself is the unmodeled thing, not a standing
 *    character stat.
 * 3. **Vigilante Specialization** (avenger's full-BAB-as-vigilante-level vs.
 *    stalker's hidden strike) is structural, not a vendored `Change`:
 *    `compute.ts`'s BAB loop special-cases
 *    `doc.build.vigilanteSpecialization === "avenger"` directly, and hidden
 *    strike's die count comes from `tables.ts`'s hardcoded
 *    `hiddenStrikeDice()` (the same "atomic, out of this file's scope"
 *    posture rogue.ts documents for `sneakAttackDice()`). An archetype
 *    feature that forces one specialization, replaces specialization
 *    entirely with something else, or reads/alters hidden strike is
 *    `subsystem` (a structural interaction, not a Change) or `blocked` (a
 *    real formula divergence that would double-count) — never backfilled as
 *    a new number.
 * 4. **`build.vigilanteIdentity`** ("social" | "vigilante", the identity
 *    chip) is explicitly documented in `@pf1/schema` as display-forward
 *    table state, NOT a numeric input `compute()` reads — no vendored
 *    `Change` gates on it, and identity-scoped talent bonuses (Renown,
 *    Social Grace, ...) are deliberately left as manual `contextNotes` in
 *    `vigilante-talents.ts` rather than wired to the flag. Consequently, ANY
 *    archetype feature phrased "while in his/her vigilante identity" (or
 *    "while wearing the mask/armor/etc. required to assume it") is
 *    `situational` even when the underlying number is a real, clean, always
 *    -scaling bonus — there is no formula input to gate it on.
 * 5. **Renown**-family social features (Renown, Great/Incredible Renown,
 *    Calling Card's renown interaction, ...) are situational/narrative for
 *    the same reason as class note 4 — "in your area of renown" isn't
 *    tracked either.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in
 * `VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED`'s `provenance`. Only 4 of
 * vigilante's 143 features cleared the `numeric` bar — the kit leans heavily
 * on identity-gated transformations, vigilante/social talent picks, and
 * assassin/witch/occultist/druid sub-ability grants, none of which are
 * Change-shaped in this engine today.
 *
 * ── Rubric (same as the fighter/magus pilots) ───────────────────────────────
 *  - "numeric": an unconditional bonus, or one gated on a condition this
 *    engine can check (`@armor.type`, `@class.unlevel`), expressible via a
 *    real `packages/engine/src/targets.ts` target.
 *  - "situational": a REAL number scoped to a per-attack/per-round condition,
 *    a chosen weapon/enemy, an activated stance, a resource spend, a
 *    duration, or (per class note 4) "while in vigilante identity."
 *  - "subsystem": modifies a pick-list or subsystem the engine models
 *    elsewhere or defers entirely (talents, familiars, mounts, hexes,
 *    inquisitions, occultist implements, assassin/slayer sub-abilities, ...),
 *    or is purely narrative (dual identity alterations, alignment
 *    restrictions) with no number to extract.
 *  - "blocked": the text promises an unconditional number but no applied
 *    target in `targets.ts` can express it (e.g. skill ranks per level), or
 *    extracting it risks double-counting a vendored formula.
 *  - `confidence`: "high" = one explicit sentence, no interpretation;
 *    "medium" = composed from two facts (e.g. a named base-ability reference
 *    plus that ability's already-known formula) or a mild reading to isolate
 *    one clause of a mixed feature; "low" is not used — bucket `blocked`
 *    instead.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

const NOTE_IDENTITY_GATED =
  "real number, but conditioned on being in his/her vigilante identity (or wearing the specific " +
  "item required to assume it) — vigilanteIdentity is a display-only chip (schema doc comment), " +
  "not a Change-checkable input, so this can't be safely auto-applied (class note 4)";

const NOTE_SPECIALIZATION_STRUCTURAL =
  "alters/replaces vigilante specialization — avenger's full-BAB bump and stalker's hidden strike " +
  "are handled by class/build configuration (doc.build.vigilanteSpecialization in compute.ts's BAB " +
  "loop, tables.ts's hiddenStrikeDice()), not a Change, so a specialization swap has no Change-shaped " +
  "number here (class note 3)";

const NOTE_CLASS_SKILLS_SWAP =
  "swaps which skills are class skills — no Change target exists for class-skill-list membership " +
  "(a structural relationship read from refData.classes, not a Change)";

const NOTE_SKILL_RANKS_PER_LEVEL =
  "changes skill ranks per level (4 + Int instead of the vigilante's normal 6 + Int) — extracted " +
  "as a flat -2/level `bonusSkillRanks` delta (the target the web model's skill budget consumes; " +
  "same idiom as cleric Cardinal's Political Skill)";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── vigilante:agathiel ──
  "vigilante:agathiel:agathion-blessing:0": {
    archetypeId: "vigilante:agathiel",
    name: "Agathion Blessing",
    level: 2,
    bucket: "subsystem",
    note:
      "grants Aspect of the Beast as a bonus feat while in his vigilante identity (" +
      NOTE_IDENTITY_GATED +
      "), replaces the 2nd-level vigilante talent — feat grant either way, no Change-shaped number",
  },
  "vigilante:agathiel:bestial-identity:1": {
    archetypeId: "vigilante:agathiel",
    name: "Bestial Identity",
    level: 1,
    bucket: "subsystem",
    note:
      "alters dual identity into a beast-shape polymorph progression (beast shape I-IV via " +
      "player-chosen abilities) and replaces the vigilante talents gained at 4th/8th/12th/16th — a " +
      "shapechange subsystem tied to dual identity (class note 2), no flat number",
  },
  "vigilante:agathiel:immortal-commitment:0": {
    archetypeId: "vigilante:agathiel",
    name: "Immortal Commitment",
    level: 0,
    bucket: "subsystem",
    note:
      "alignment restriction with a punitive permanent negative level on violation — narrative " +
      "drawback, no Change to extract",
  },

  // ── vigilante:anaphexia-thought-killer ──
  "vigilante:anaphexia-thought-killer:false-reading:15": {
    archetypeId: "vigilante:anaphexia-thought-killer",
    name: "False Reading",
    level: 15,
    bucket: "subsystem",
    note:
      "grants immunity to mind-reading plus a Bluff-vs-Sense-Motive opposed check to feed false " +
      "results — an immunity/opposed-check mechanic, no flat bonus, replaces the 15th-level " +
      "vigilante talent",
  },
  "vigilante:anaphexia-thought-killer:monastic-communication:2": {
    archetypeId: "vigilante:anaphexia-thought-killer",
    name: "Monastic Communication",
    level: 2,
    bucket: "situational",
    note:
      "real +1/2-level Bluff bonus, but scoped to a specific check purpose (passing a secret " +
      "message through body language, in half the normal time) — not a general Bluff bonus, " +
      "replaces the 2nd-level social talent",
  },
  "vigilante:anaphexia-thought-killer:silent-to-magic:6": {
    archetypeId: "vigilante:anaphexia-thought-killer",
    name: "Silent to Magic",
    level: 6,
    bucket: "subsystem",
    note:
      "grants nondetection against mind-reading (later extended to both identities at 10th) — a " +
      "protection grant, no Change target, replaces the 6th-level social talent",
  },
  "vigilante:anaphexia-thought-killer:thought-scent:7": {
    archetypeId: "vigilante:anaphexia-thought-killer",
    name: "Thought-Scent",
    level: 7,
    bucket: "subsystem",
    note:
      "scent-like divination to locate a creature who knows a chosen fact, limited minutes/level " +
      "per day — an activated ability, no Change-shaped number, replaces the 7th-level vigilante " +
      "talent",
  },
  "vigilante:anaphexia-thought-killer:tongue-sacrifice:0": {
    archetypeId: "vigilante:anaphexia-thought-killer",
    name: "Tongue Sacrifice",
    level: 0,
    bucket: "subsystem",
    note:
      "narrative identity-change cost (self-mutilation) plus a self-only regenerate SLA restricted " +
      "to restoring her own tongue — no Change",
  },

  // ── vigilante:avenging-beast ──
  "vigilante:avenging-beast:animal-mask:0": {
    archetypeId: "vigilante:avenging-beast",
    name: "Animal Mask",
    level: 0,
    bucket: "subsystem",
    note: "alters dual identity around a physical mask focus (class note 2) — narrative, no number",
  },
  "vigilante:avenging-beast:class-skills:0": {
    archetypeId: "vigilante:avenging-beast",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:avenging-beast:patron-spells:0": {
    archetypeId: "vigilante:avenging-beast",
    name: "Patron Spells",
    level: 0,
    bucket: "subsystem",
    note:
      "replaces vigilante specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ") with witch patron bonus spells added to the spell list — a spell-list subsystem, no number",
  },
  "vigilante:avenging-beast:skill-ranks-per-level:0": {
    archetypeId: "vigilante:avenging-beast",
    name: "Skill Ranks per Level",
    level: 0,
    bucket: "numeric",
    note: NOTE_SKILL_RANKS_PER_LEVEL,
  },
  "vigilante:avenging-beast:spellcasting:0": {
    archetypeId: "vigilante:avenging-beast",
    name: "Spellcasting",
    level: 0,
    bucket: "subsystem",
    note:
      "replaces the vigilante talents gained at 4th/8th/10th/14th/16th with hunter spellcasting and " +
      "the hunter spell list — no Change-shaped number",
  },
  "vigilante:avenging-beast:wild-shape:5": {
    archetypeId: "vigilante:avenging-beast",
    name: "Wild Shape",
    level: 5,
    bucket: "subsystem",
    note:
      "grants druid-style wild shape (capped at beast shape I) with a uses-per-day progression — a " +
      "resource/shapechange mechanic, replaces startling appearance, frightening appearance, and " +
      "stunning appearance",
  },

  // ── vigilante:bellflower-harvester ──
  "vigilante:bellflower-harvester:bellflower-crop:0": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Bellflower Crop",
    level: 0,
    bucket: "subsystem",
    note:
      "designates allies as a 'crop' who must stay within 30 ft. to benefit from crop-wide " +
      "abilities — an ally-targeting mechanic, not the vigilante's own number",
  },
  "vigilante:bellflower-harvester:crop-vigilance:0": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Crop Vigilance",
    level: 5,
    bucket: "situational",
    note:
      "real, scaling aid-another bonus (+3 at 5th, +1 every 6 levels to +6 at 17th), but scoped to " +
      "the aid another action specifically — action-scoped, not always-on; replaces vigilante " +
      "specialization but the harvester keeps stalker-specialization talent access (structural, " +
      "class note 3, not itself numeric)",
  },
  "vigilante:bellflower-harvester:obsequious:0": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Obsequious",
    level: 1,
    bucket: "situational",
    note:
      "real, scaling Bluff bonus (+2 at 1st, +1 every 4 levels to +6 at 17th), but scoped to using " +
      "Bluff instead of Disguise to deflect suspicion about vigilante activity — a specific check " +
      "purpose, not a general Bluff bonus, replaces the 1st-level social talent",
  },
  "vigilante:bellflower-harvester:rebellious-identity:0": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Rebellious Identity",
    level: 0,
    bucket: "subsystem",
    note: "alters dual identity with an alignment/appearance restriction (class note 2) — narrative, no number",
  },
  "vigilante:bellflower-harvester:social-talents:0": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Social Talents",
    level: 0,
    bucket: "subsystem",
    note:
      "recommends specific social and vigilante talents that complement the archetype (class note " +
      "1) — a talent-list note, no number of its own",
  },
  "vigilante:bellflower-harvester:tend-the-garden:2": {
    archetypeId: "vigilante:bellflower-harvester",
    name: "Tend the Garden",
    level: 2,
    bucket: "subsystem",
    note:
      "grants Stealth Synergy as a bonus feat plus teamwork-feat sharing with the crop — an " +
      "ally-targeting/feat mechanic, replaces the 2nd-level vigilante talent",
  },

  // ── vigilante:brute ──
  "vigilante:brute:awesome-blow:16": {
    archetypeId: "vigilante:brute",
    name: "Awesome Blow",
    level: 16,
    bucket: "subsystem",
    note:
      "grants the Awesome Blow monster feat (ignoring its prerequisites) while in his vigilante " +
      "identity, plus a combat-maneuver damage rider that scales at 16th — feat grant/maneuver " +
      "mechanic, identity-gated besides (class note 4)",
  },
  "vigilante:brute:heavy-punches:1": {
    archetypeId: "vigilante:brute",
    name: "Heavy Punches",
    level: 1,
    bucket: "subsystem",
    note:
      "unarmed strike damage as a monk of his level while in his vigilante identity — no Change " +
      "target for unarmed-strike damage dice (nattack/ndamage are unapplied per targets.ts), and " +
      "identity-gated besides",
  },
  "vigilante:brute:scale-surroundings:4": {
    archetypeId: "vigilante:brute",
    name: "Scale Surroundings",
    level: 4,
    bucket: "situational",
    note: "real climb speed 30 ft., but " + NOTE_IDENTITY_GATED,
  },
  "vigilante:brute:sizing-equipment:6": {
    archetypeId: "vigilante:brute",
    name: "Sizing Equipment",
    level: 6,
    bucket: "subsystem",
    note:
      "rules for wearing mis-sized magic armor/weapons across identities — an equipment-fit " +
      "mechanic, no flat number this engine's item model can express",
  },
  "vigilante:brute:total-destruction:8": {
    archetypeId: "vigilante:brute",
    name: "Total Destruction",
    level: 8,
    bucket: "situational",
    note:
      "real thrown-object/creature damage (with a scaling Reflex-save DC at 16th), but an activated " +
      "standard-action ability gated on being in his vigilante identity — action- and identity-" +
      "scoped (class note 4)",
  },

  // ── vigilante:cabalist ──
  "vigilante:cabalist:bond-of-blood:4": {
    archetypeId: "vigilante:cabalist",
    name: "Bond of Blood",
    level: 4,
    bucket: "situational",
    note:
      "real, scaling temporary-hit-point grant, but triggered only on dealing bleed damage or 5+ " +
      "piercing/slashing damage to an adjacent living creature, once per hour — a per-hit trigger " +
      "condition, not always-on",
  },
  "vigilante:cabalist:familiar:1": {
    archetypeId: "vigilante:cabalist",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar (wizard-level equivalent) — companion subsystem, not the character's own number",
  },
  "vigilante:cabalist:living-shadow:14": {
    archetypeId: "vigilante:cabalist",
    name: "Living Shadow",
    level: 14,
    bucket: "subsystem",
    note:
      "once-per-day self-polymorph into a living shadow — a shapechange/resource mechanic, no flat " +
      "number",
  },
  "vigilante:cabalist:necromantic-focus:1": {
    archetypeId: "vigilante:cabalist",
    name: "Necromantic Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants Spell Focus (necromancy) as a bonus feat plus spellbook additions — feat/spell-list grant, no Change",
  },
  "vigilante:cabalist:shadow-jump:10": {
    archetypeId: "vigilante:cabalist",
    name: "Shadow Jump",
    level: 10,
    bucket: "subsystem",
    note:
      "grants the shadowdancer's shadow jump ability with a derived effective level — a movement " +
      "subsystem, no applied target for a daily-distance pool",
  },
  "vigilante:cabalist:tattoo-chamber:1": {
    archetypeId: "vigilante:cabalist",
    name: "Tattoo Chamber",
    level: 1,
    bucket: "subsystem",
    note: "extradimensional item-storage mechanic — no Change-shaped number",
  },

  // ── vigilante:chu-ye-enforcer ──
  "vigilante:chu-ye-enforcer:deadly-horns:6": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Deadly Horns",
    level: 6,
    bucket: "subsystem",
    note:
      "gains a gore natural attack while in his vigilante identity — no Change target for natural-" +
      "attack damage (nattack/ndamage unapplied per targets.ts), identity-gated besides, replaces " +
      "the 6th-level vigilante talent",
  },
  "vigilante:chu-ye-enforcer:deceitful-form:4": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Deceitful Form",
    level: 4,
    bucket: "subsystem",
    note:
      "grants an alter-self-style shapechange (upgrading to giant form at 14th/18th) with a daily-" +
      "minutes pool — shapechange/resource mechanic, replaces the vigilante talents gained at " +
      "4th/14th/18th",
  },
  "vigilante:chu-ye-enforcer:oni-mask:0": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Oni Mask",
    level: 0,
    bucket: "situational",
    note:
      "real Intimidate bonus (1/2 level, min +1), but scoped to wearing the specific mask required " +
      "to assume his vigilante identity — " +
      NOTE_IDENTITY_GATED,
  },
  "vigilante:chu-ye-enforcer:steel-dictate:0": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Steel Dictate",
    level: 1,
    bucket: "situational",
    note:
      "grants Improved Unarmed Strike plus a real unarmed-strike damage bonus (half level, min +1, " +
      "max +5), but scoped to unarmed strikes specifically — no Change target for unarmed-strike " +
      "damage (nattack/ndamage unapplied), replaces the 1st-level social talent",
  },
  "vigilante:chu-ye-enforcer:third-eye:12": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Third Eye",
    level: 12,
    bucket: "subsystem",
    note:
      "limited-use ranged touch attack SLA (fire beam, scaling damage at 18th) — an activated " +
      "ability, no flat number, replaces the 12th-level vigilante talent",
  },
  "vigilante:chu-ye-enforcer:yokai-heart:0": {
    archetypeId: "vigilante:chu-ye-enforcer",
    name: "Yokai Heart",
    level: 0,
    bucket: "situational",
    note:
      "real darkvision/low-light vision grant (senses are a live target family), but " +
      NOTE_IDENTITY_GATED +
      "; the oni-subtype type-change has no engine target either",
  },

  // ── vigilante:darklantern ──
  "vigilante:darklantern:dark-identity:1": {
    archetypeId: "vigilante:darklantern",
    name: "Dark Identity",
    level: 1,
    bucket: "subsystem",
    note:
      "alters dual identity into a full elf-to-drow transformation (+2 Dex/Cha, darkvision, light " +
      "blindness) with a Will-save-gated reversion — this IS the archetype's dual-identity mechanic " +
      "(class note 2), not a standing character stat, so it stays with dual identity's narrative " +
      "posture despite containing real numbers",
  },
  "vigilante:darklantern:drow-magic:1": {
    archetypeId: "vigilante:darklantern",
    name: "Drow Magic",
    level: 1,
    bucket: "subsystem",
    note:
      "1/day SLAs (dancing lights, darkness, faerie fire) while in her vigilante identity — a " +
      "resource mechanic, replaces the 1st-level social talent",
  },
  "vigilante:darklantern:drow-paragon:4": {
    archetypeId: "vigilante:darklantern",
    name: "Drow Paragon",
    level: 4,
    bucket: "situational",
    note:
      "real Spell Resistance (6 + level) and a darkvision-range increase (spellResist and senses " +
      "are live target families), but " +
      NOTE_IDENTITY_GATED +
      ", replaces the 4th-level vigilante talent",
  },
  "vigilante:darklantern:elven-ancestry:0": {
    archetypeId: "vigilante:darklantern",
    name: "Elven Ancestry",
    level: 0,
    bucket: "subsystem",
    note: "race/subtype prerequisite — no number",
  },

  // ── vigilante:dragonscale-loyalist ──
  "vigilante:dragonscale-loyalist:conqueror-s-wrath:0": {
    archetypeId: "vigilante:dragonscale-loyalist",
    name: "Conqueror’s Wrath",
    level: 17,
    bucket: "subsystem",
    note:
      "full-round-action charge-and-attack maneuver with an attack-of-opportunity-bonus rider for " +
      "enemies — an activated combat mechanic, replaces stunning appearance",
  },
  "vigilante:dragonscale-loyalist:dragonscale-vigilance:0": {
    archetypeId: "vigilante:dragonscale-loyalist",
    name: "Dragonscale Vigilance",
    level: 11,
    bucket: "subsystem",
    note:
      "constant perceive-betrayal-style divination while in his vigilante identity — a detection " +
      "ability, no flat number, replaces frightening appearance",
  },
  "vigilante:dragonscale-loyalist:false-allegiance:0": {
    archetypeId: "vigilante:dragonscale-loyalist",
    name: "False Allegiance",
    level: 5,
    bucket: "numeric",
    note:
      "one of seven house-specific grants chosen at 5th, wired via the archetypeFeature " +
      "PickChoice mechanism. The numerically-clean houses are wired: Lodovka (Sea Legs' flat " +
      "+2 Acrobatics/Climb/Swim), Orlovsky (+3 CMD), Lebeda/Rogarvia (their Skill Focus bonus " +
      "feat's flat +3/+6 Appraise or Knowledge [history]), Surtova (Persuasive's flat " +
      "+2/+4 Diplomacy and Intimidate). Garess (Sure Grasp's reroll, no flat number; dwarven " +
      "stonecunning, scoped to noticing stonework) and Medvyed (Endurance, all narrow " +
      "Fortitude-only special checks; resist nature's lure, scoped to fey attackers with no " +
      "matching category) emit nothing. Each house's bonus feat itself has no baseline number " +
      "beyond what's cited above and every house's remaining narrowly-scoped rider (gather-" +
      "information-only Diplomacy, allies-only Sense Motive, resale percentage, ACP exemption, " +
      "...) is dropped, per the honesty bar; replaces startling appearance",
  },
  "vigilante:dragonscale-loyalist:reflexive-reaction:0": {
    archetypeId: "vigilante:dragonscale-loyalist",
    name: "Reflexive Reaction",
    level: 3,
    bucket: "subsystem",
    note:
      "trades a full round of actions in a surprise round for being staggered the next round — a " +
      "situational action-economy trade, no flat number, replaces unshakable",
  },
  "vigilante:dragonscale-loyalist:ruby-courtier:0": {
    archetypeId: "vigilante:dragonscale-loyalist",
    name: "Ruby Courtier",
    level: 1,
    bucket: "subsystem",
    note:
      "grants Exotic Weapon Proficiency (Aldori dueling sword) plus a social-identity/talent " +
      "restriction — feat grant, replaces the 1st-level social talent",
  },

  // ── vigilante:experimenter ──
  "vigilante:experimenter:brew-potion:3": {
    archetypeId: "vigilante:experimenter",
    name: "Brew Potion",
    level: 3,
    bucket: "subsystem",
    note:
      "grants Brew Potion as a bonus feat with a Craft(alchemy)-for-Spellcraft substitution — " +
      "feat/crafting mechanic, replaces unshakable",
  },
  "vigilante:experimenter:class-skills:0": {
    archetypeId: "vigilante:experimenter",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:experimenter:craft-construct:11": {
    archetypeId: "vigilante:experimenter",
    name: "Craft Construct",
    level: 11,
    bucket: "subsystem",
    note:
      "grants Craft Construct as a bonus feat with a Knowledge(engineering)-for-Spellcraft " +
      "substitution — feat/crafting mechanic, replaces frightening appearance",
  },
  "vigilante:experimenter:forbidden-science:0": {
    archetypeId: "vigilante:experimenter",
    name: "Forbidden Science",
    level: 0,
    bucket: "numeric",
    note:
      "mixed feature: a real, unconditional half-level Knowledge (engineering) bonus (extracted) " +
      "alongside a Craft (alchemy) bonus scoped to creating alchemical items specifically (dropped, " +
      "same 'extract the unconditional clause' posture as mixed features elsewhere) and a mutagen-" +
      "learning/involuntary-transformation-on-confusion drama (unmodeled resource/trigger mechanic, " +
      "not a standing number); replaces vigilante specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ")",
  },
  "vigilante:experimenter:lore-master:5": {
    archetypeId: "vigilante:experimenter",
    name: "Lore Master",
    level: 5,
    bucket: "subsystem",
    note:
      "grants the bard's lore master class feature — an ability grant with its own (unmodeled) " +
      "once-per-day-reroll mechanic, replaces startling appearance",
  },
  "vigilante:experimenter:mutable-mutagen:17": {
    archetypeId: "vigilante:experimenter",
    name: "Mutable Mutagen",
    level: 17,
    bucket: "subsystem",
    note:
      "extends mutagen duration to 1 hour/level — a resource-duration change tied to the unmodeled " +
      "mutagen mechanic, replaces stunning appearance",
  },
  "vigilante:experimenter:mutagenic-change:0": {
    archetypeId: "vigilante:experimenter",
    name: "Mutagenic Change",
    level: 0,
    bucket: "subsystem",
    note:
      "lets consuming a mutagen double as the quick change social talent for identity-switching — " +
      "an action-economy/resource interaction, no flat number, replaces the 1st-level social talent",
  },
  "vigilante:experimenter:weapon-and-armor-proficiency:0": {
    archetypeId: "vigilante:experimenter",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "restricts proficiency (no martial weapons, medium armor, or shields) — a proficiency restriction, no Change",
  },

  // ── vigilante:faceless-enforcer ──
  "vigilante:faceless-enforcer:armored-juggernaut:2": {
    archetypeId: "vigilante:faceless-enforcer",
    name: "Armored Juggernaut",
    level: 2,
    bucket: "situational",
    note:
      "real donning-time reductions, a Stealth/Acrobatics/Escape-Artist ACP exemption, and a " +
      "scaling movement-speed bonus while in heavy armor capped at 'his base speed' — the per-skill " +
      "ACP exemption has no target, and the speed cap references a value (unarmored base speed) " +
      "this engine can't isolate from the current armored total without risking an overstatement, " +
      "replaces the 2nd-level vigilante talent",
  },
  "vigilante:faceless-enforcer:dual-identity:0": {
    archetypeId: "vigilante:faceless-enforcer",
    name: "Dual Identity",
    level: 0,
    bucket: "subsystem",
    note:
      "alters dual identity around donning/removing a specific armored outfit (class note 2) — " +
      "narrative, no number",
  },
  "vigilante:faceless-enforcer:enforcer-s-wrath:6": {
    archetypeId: "vigilante:faceless-enforcer",
    name: "Enforcer’s Wrath",
    level: 6,
    bucket: "situational",
    note:
      "real +4 Intimidate bonus, but scoped to 'no other opponents within 30 feet' — a per-encounter " +
      "positioning condition, replaces the 6th-level vigilante talent",
  },
  "vigilante:faceless-enforcer:faceless-infiltrator:5": {
    archetypeId: "vigilante:faceless-enforcer",
    name: "Faceless Infiltrator",
    level: 5,
    bucket: "subsystem",
    note:
      "grants a third (fictional) identity with its own scaling Disguise/Bluff bonuses — the whole " +
      "third-identity mechanic is unmodeled (only 'social'/'vigilante' exists in build." +
      "vigilanteIdentity, class note 4), replaces the social talents gained at 5th/11th/17th",
  },
  "vigilante:faceless-enforcer:weapon-and-armor-proficiencies:0": {
    archetypeId: "vigilante:faceless-enforcer",
    name: "Weapon and Armor Proficiencies",
    level: 0,
    bucket: "subsystem",
    note: "grants heavy armor proficiency, denies shields — proficiency swap, no Change",
  },

  // ── vigilante:ferocious-hunter ──
  "vigilante:ferocious-hunter:hidden-heritage:0": {
    archetypeId: "vigilante:ferocious-hunter",
    name: "Hidden Heritage",
    level: 0,
    bucket: "subsystem",
    note:
      "alters dual identity to a fixed human/half-orc pairing plus Pass for Human as a bonus feat " +
      "(class note 2) — narrative/feat grant, no number",
  },
  "vigilante:ferocious-hunter:spirit-of-ferocity:3": {
    archetypeId: "vigilante:ferocious-hunter",
    name: "Spirit of Ferocity",
    level: 3,
    bucket: "subsystem",
    note:
      "extends orc ferocity's fight-on duration by his Constitution modifier in rounds — a racial-" +
      "trait interaction this engine doesn't track as a duration counter, replaces unshakable",
  },
  "vigilante:ferocious-hunter:symbol-of-mastery:8": {
    archetypeId: "vigilante:ferocious-hunter",
    name: "Symbol of Mastery",
    level: 8,
    bucket: "subsystem",
    note:
      "grants Improved Critical (with his symbol-of-pride weapon) plus a BAB-equals-vigilante-level " +
      "substitution for Critical Focus prerequisites — a feat-prerequisite interaction, no Change " +
      "target for crit-feat prereqs, replaces the 8th-level vigilante talent",
  },
  "vigilante:ferocious-hunter:symbol-of-pride:2": {
    archetypeId: "vigilante:ferocious-hunter",
    name: "Symbol of Pride",
    level: 2,
    bucket: "subsystem",
    note:
      "grants the signature weapon vigilante talent (restricted to falchion/greataxe/orc-named " +
      "weapons) regardless of specialization — a talent-pick grant (class note 1), replaces the " +
      "2nd-level vigilante talent",
  },

  // ── vigilante:gunmaster ──
  "vigilante:gunmaster:deadeye:6": {
    archetypeId: "vigilante:gunmaster",
    name: "Deadeye",
    level: 6,
    bucket: "subsystem",
    note:
      "limited-use ability to resolve an attack against touch AC at an extended range increment — " +
      "a resource-gated combat option, no flat number",
  },
  "vigilante:gunmaster:death-s-shot:20": {
    archetypeId: "vigilante:gunmaster",
    name: "Death's Shot",
    level: 20,
    bucket: "subsystem",
    note: "limited-use save-or-die on a confirmed critical hit — an activated ability, no flat number",
  },
  "vigilante:gunmaster:gunmaster-initiative:4": {
    archetypeId: "vigilante:gunmaster",
    name: "Gunmaster Initiative",
    level: 4,
    bucket: "numeric",
    note:
      "flat, unconditional +2 initiative bonus — clean extraction; the accompanying free-action-" +
      "firearm-draw-on-initiative rider (Quick Draw-gated) is dropped as an action-economy grant, " +
      "not a number",
  },
  "vigilante:gunmaster:lightning-reload:12": {
    archetypeId: "vigilante:gunmaster",
    name: "Lightning Reload",
    level: 12,
    bucket: "subsystem",
    note: "limited-use faster-reload options — a resource/action-economy mechanic, no flat number",
  },
  "vigilante:gunmaster:quick-clear:12": {
    archetypeId: "vigilante:gunmaster",
    name: "Quick Clear",
    level: 12,
    bucket: "subsystem",
    note: "once-per-day repair of a broken firearm — a resource mechanic, no flat number",
  },

  // ── vigilante:half-elf-double-scion ──
  "vigilante:half-elf-double-scion:dual-heritage:0": {
    archetypeId: "vigilante:half-elf-double-scion",
    name: "Dual Heritage",
    level: 1,
    bucket: "subsystem",
    note:
      "alters dual identity to a fixed elf/human pairing with a shared alignment across both " +
      "identities (class note 2) — narrative, no number",
  },
  "vigilante:half-elf-double-scion:half-elf-double-scion-talents:0": {
    archetypeId: "vigilante:half-elf-double-scion",
    name: "Half-Elf Double Scion Talents",
    level: 14,
    bucket: "subsystem",
    note:
      "adds three archetype-specific vigilante talents (a weapon-proficiency/Weapon-Focus grant, a " +
      "limited-use crit-auto-confirm ability, and a 10-ft. move-without-provoking-AoO) to the " +
      "talent pick-list (class note 1) — talent-list addition, no baseline number",
  },

  // ── vigilante:hangman ──
  "vigilante:hangman:bound-to-truth-ex-sp:3": {
    archetypeId: "vigilante:hangman",
    name: "Bound to Truth (Ex, Sp)",
    level: 3,
    bucket: "situational",
    note:
      "real half-level Sense Motive bonus plus a zone-of-truth-style SP, but both scoped to a " +
      "creature currently grappled/entangled by his noose — a specific-target-state condition, " +
      "replaces unshakable",
  },
  "vigilante:hangman:chokehold:5": {
    archetypeId: "vigilante:hangman",
    name: "Chokehold",
    level: 5,
    bucket: "subsystem",
    note: "grants Chokehold as a bonus feat — feat grant, replaces startling appearance",
  },
  "vigilante:hangman:hangman-s-noose:2": {
    archetypeId: "vigilante:hangman",
    name: "Hangman's Noose",
    level: 2,
    bucket: "subsystem",
    note:
      "lets a rope noose be wielded as a net/whip with Improved Grapple benefits — a weapon-" +
      "property grant, no flat number, replaces the 2nd-level vigilante talent",
  },
  "vigilante:hangman:suffocation:17": {
    archetypeId: "vigilante:hangman",
    name: "Suffocation",
    level: 17,
    bucket: "subsystem",
    note:
      "grapple-maintenance-triggered suffocation/unconsciousness — a save-based combat mechanic, " +
      "no flat number, replaces stunning appearance",
  },
  "vigilante:hangman:tighten-the-noose:11": {
    archetypeId: "vigilante:hangman",
    name: "Tighten the Noose",
    level: 11,
    bucket: "situational",
    note:
      "increased hidden strike damage, but scoped to a swift action against a target already " +
      "grappled by his noose — a per-round/per-target condition; also touches hidden strike's " +
      "hardcoded progression (tables.ts, class note 3), left unmodeled rather than risk it, " +
      "replaces frightening appearance",
  },
  "vigilante:hangman:twisted-rope:4": {
    archetypeId: "vigilante:hangman",
    name: "Twisted Rope",
    level: 4,
    bucket: "subsystem",
    note:
      "1-hour prep grants the noose temporary hit points/hardness/break-DC boosts for 8 hours — an " +
      "item-buff resource mechanic, replaces the 4th-level vigilante talent",
  },
  "vigilante:hangman:vigilante-specialization:0": {
    archetypeId: "vigilante:hangman",
    name: "Vigilante Specialization",
    level: 0,
    bucket: "subsystem",
    note: "forces the stalker specialization — " + NOTE_SPECIALIZATION_STRUCTURAL,
  },
  "vigilante:hangman:weapon-and-armor-proficiency:0": {
    archetypeId: "vigilante:hangman",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "grants net/whip proficiency, denies shields — proficiency swap, no Change",
  },

  // ── vigilante:hidden-current ──
  "vigilante:hidden-current:guise-of-the-land-walker:1": {
    archetypeId: "vigilante:hidden-current",
    name: "Guise of the Land Walker",
    level: 1,
    bucket: "subsystem",
    note:
      "grants the many guises social talent restricted to a nonaquatic, land-only guise (class " +
      "note 1) — a talent-pick grant, replaces the 1st-level social talent",
  },
  "vigilante:hidden-current:sea-s-return:11": {
    archetypeId: "vigilante:hidden-current",
    name: "Sea’s Return",
    level: 11,
    bucket: "subsystem",
    note:
      "limited-use dimension-door-style land/sea transition — an activated ability, no flat number, " +
      "replaces frightening appearance",
  },
  "vigilante:hidden-current:stealthy-swimmer:0": {
    archetypeId: "vigilante:hidden-current",
    name: "Stealthy Swimmer",
    level: 0,
    bucket: "situational",
    note:
      "real +5 circumstance Stealth bonus, but scoped to the specific turn he crosses the land/" +
      "water boundary — a per-round movement condition, replaces the 2nd-level vigilante talent",
  },

  // ── vigilante:imperial-agent ──
  "vigilante:imperial-agent:false-flag:5": {
    archetypeId: "vigilante:imperial-agent",
    name: "False Flag",
    level: 5,
    bucket: "subsystem",
    note:
      "grants a third (faction) identity with its own Disguise bonus/penalty pair — the third-" +
      "identity mechanic is unmodeled (class note 4), replaces the 5th-level social talent",
  },
  "vigilante:imperial-agent:manipulative:3": {
    archetypeId: "vigilante:imperial-agent",
    name: "Manipulative",
    level: 3,
    bucket: "situational",
    note:
      "real half-level Bluff/Intimidate bonus, but explicitly excludes feint and demoralize — the " +
      "two most common uses of those skills share the same skill total in this engine (no separate " +
      "'feint'/'demoralize' roll type), so a flat Change would incorrectly buff the excluded uses " +
      "too; replaces unshakable",
  },
  "vigilante:imperial-agent:slander:1": {
    archetypeId: "vigilante:imperial-agent",
    name: "Slander",
    level: 1,
    bucket: "subsystem",
    note:
      "a settlement-attitude social mechanic (Bluff/Diplomacy checks vs. a DC that shifts public " +
      "opinion) — not a character-facing number, no flat bonus, replaces the 1st-level social talent",
  },

  // ── vigilante:magical-child ──
  "vigilante:magical-child:animal-guide:0": {
    archetypeId: "vigilante:magical-child",
    name: "Animal Guide",
    level: 3,
    bucket: "subsystem",
    note:
      "grants/evolves a familiar (later swappable to improved-familiar forms) with a DR/magic grant " +
      "equal to her level — companion subsystem, replaces vigilante specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ")",
  },
  "vigilante:magical-child:class-skills:0": {
    archetypeId: "vigilante:magical-child",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:magical-child:skill-ranks-per-level:0": {
    archetypeId: "vigilante:magical-child",
    name: "Skill Ranks per Level",
    level: 0,
    bucket: "numeric",
    note: NOTE_SKILL_RANKS_PER_LEVEL,
  },
  "vigilante:magical-child:spellcasting:0": {
    archetypeId: "vigilante:magical-child",
    name: "Spellcasting",
    level: 0,
    bucket: "subsystem",
    note:
      "replaces the vigilante talents gained at 4th/8th/10th/14th/16th with unchained-summoner-" +
      "style spellcasting — no Change-shaped number",
  },
  "vigilante:magical-child:staunch-ally:0": {
    archetypeId: "vigilante:magical-child",
    name: "Staunch Ally",
    level: 20,
    bucket: "subsystem",
    note:
      "lets the familiar share/use startling appearance, frightening appearance, stunning " +
      "appearance, and vengeance strike — an ally-interaction rule altering unmodeled abilities, " +
      "no flat number of its own",
  },
  "vigilante:magical-child:transformation-sequence:0": {
    archetypeId: "vigilante:magical-child",
    name: "Transformation Sequence",
    level: 0,
    bucket: "subsystem",
    note: "changes identity-switch timing and spectacle — narrative, no number",
  },
  "vigilante:magical-child:weapon-and-armor-proficiencies:0": {
    archetypeId: "vigilante:magical-child",
    name: "Weapon and Armor Proficiencies",
    level: 0,
    bucket: "subsystem",
    note:
      "denies medium armor proficiency, exempts light armor from arcane spell failure — " +
      "proficiency/casting-restriction swap, no Change",
  },

  // ── vigilante:masked-maiden ──
  "vigilante:masked-maiden:armor-training:0": {
    archetypeId: "vigilante:masked-maiden",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note:
      "grants the fighter's Armor Training class feature on its normal 4-level cadence (3rd/7th/" +
      "11th/15th) plus Armor Mastery (DR 5/- while armored) at 19th, using vigilante level as " +
      "fighter level — both named by their base-ability name only (no restated numbers), so the " +
      "formula is composed from the already-known fighter Armor Training/Armor Mastery values, " +
      "same posture as the magus pilot's Armored Battlemage/Myrmidarch entries; replaces the " +
      "vigilante's social talents gained at 3rd/7th/11th/15th/19th",
  },
  "vigilante:masked-maiden:imperfect-control:0": {
    archetypeId: "vigilante:masked-maiden",
    name: "Imperfect Control",
    level: 0,
    bucket: "situational",
    note:
      "real -2 penalty on Charisma-based checks (except Intimidate) plus loss of morale bonuses/" +
      "bardic performance benefit, but scoped to 'while in her vigilante identity' — " +
      NOTE_IDENTITY_GATED +
      "; the Will-save identity-switch trigger is a narrative/trigger mechanic besides",
  },
  "vigilante:masked-maiden:scars-of-the-past:0": {
    archetypeId: "vigilante:masked-maiden",
    name: "Scars of the Past",
    level: 0,
    bucket: "subsystem",
    note:
      "forces the avenger specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ") plus grants free battered Gray Maiden plate armor — an equipment grant, replaces seamless " +
      "guise (class note 2)",
  },
  "vigilante:masked-maiden:weapon-and-armor-proficiency:0": {
    archetypeId: "vigilante:masked-maiden",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "grants proficiency with a specific named armor (Gray Maiden plate) only — proficiency swap, no Change",
  },

  // ── vigilante:mounted-fury ──
  "vigilante:mounted-fury:class-skills:0": {
    archetypeId: "vigilante:mounted-fury",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:mounted-fury:furious-charge:6": {
    archetypeId: "vigilante:mounted-fury",
    name: "Furious Charge",
    level: 6,
    bucket: "situational",
    note:
      "real +4 (instead of the normal +2) charge attack-roll bonus and a no-AC-penalty-after-" +
      "charging rule, but scoped to charging while mounted — a per-round action condition",
  },
  "vigilante:mounted-fury:mighty-charge:12": {
    archetypeId: "vigilante:mounted-fury",
    name: "Mighty Charge",
    level: 12,
    bucket: "situational",
    note:
      "real doubled critical threat range plus a free combat maneuver, but scoped to a mounted " +
      "charge attack — a per-round action condition",
  },
  "vigilante:mounted-fury:mount:0": {
    archetypeId: "vigilante:mounted-fury",
    name: "Mount",
    level: 0,
    bucket: "subsystem",
    note:
      "grants a mount (vigilante level 1:1) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto " +
      "the tracked companion's stat block; the 3rd-level teamwork-feat sharing and 5th-level " +
      "startling-appearance sharing stay unwired (behavior/ability riders, not flat numbers), as " +
      "does avenger-talent access regardless of specialization. Replaces vigilante specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ")",
  },
  "vigilante:mounted-fury:thorough-change:0": {
    archetypeId: "vigilante:mounted-fury",
    name: "Thorough Change",
    level: 0,
    bucket: "subsystem",
    note: "alters dual identity's timing and mount-disguise rules (class note 2) — narrative, no number",
  },
  "vigilante:mounted-fury:vengeance-strike:20": {
    archetypeId: "vigilante:mounted-fury",
    name: "Vengeance Strike",
    level: 20,
    bucket: "subsystem",
    note:
      "alters vengeance strike's mounted-timing requirement — a rules tweak to an unmodeled " +
      "ability, no flat number",
  },

  // ── vigilante:mutated-defender ──
  "vigilante:mutated-defender:mutant-blast:9": {
    archetypeId: "vigilante:mutated-defender",
    name: "Mutant Blast",
    level: 9,
    bucket: "subsystem",
    note: "elemental ray SLA (sorcerer-bloodline-power equivalent) — an activated ability, no flat number",
  },
  "vigilante:mutated-defender:mutant-evolution:1": {
    archetypeId: "vigilante:mutated-defender",
    name: "Mutant Evolution",
    level: 1,
    bucket: "subsystem",
    note: "grants a player-chosen 1-point eidolon evolution — a pick-list subsystem the engine doesn't model",
  },
  "vigilante:mutated-defender:mutated-lobe:4": {
    archetypeId: "vigilante:mutated-defender",
    name: "Mutated Lobe",
    level: 4,
    bucket: "subsystem",
    note: "limited-use detect thoughts SLA — an activated ability, no flat number",
  },

  // ── vigilante:psychometrist ──
  "vigilante:psychometrist:class-skills:0": {
    archetypeId: "vigilante:psychometrist",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:psychometrist:implements-and-focus-powers:2": {
    archetypeId: "vigilante:psychometrist",
    name: "Implements and Focus Powers",
    level: 2,
    bucket: "subsystem",
    note:
      "occultist implement-school/focus-power subsystem — no occultist implement modeling exists " +
      "in this engine at all, replaces the vigilante talents gained at 2nd/6th/12th/18th",
  },
  "vigilante:psychometrist:mental-focus:2": {
    archetypeId: "vigilante:psychometrist",
    name: "Mental Focus",
    level: 2,
    bucket: "subsystem",
    note:
      "a new resource pool (half level + Int) feeding the implement subsystem above — a resource " +
      "mechanic the engine doesn't track; distinct from any vendored uses.maxFormula so not a " +
      "double-count risk, just unmodeled",
  },
  "vigilante:psychometrist:object-reading:2": {
    archetypeId: "vigilante:psychometrist",
    name: "Object Reading",
    level: 2,
    bucket: "subsystem",
    note:
      "grants the occultist's object-reading ability — an information-gathering ability, no flat " +
      "number, replaces unshakable",
  },
  "vigilante:psychometrist:occult-awareness:1": {
    archetypeId: "vigilante:psychometrist",
    name: "Occult Awareness",
    level: 1,
    bucket: "subsystem",
    note: "grants Psychic Sensitivity as a bonus feat — feat grant, replaces the 1st-level social talent",
  },
  "vigilante:psychometrist:psychometric-strike:20": {
    archetypeId: "vigilante:psychometrist",
    name: "Psychometric Strike",
    level: 20,
    bucket: "subsystem",
    note:
      "doubles vengeance strike's benefits against a target holding an object that once belonged to " +
      "her — alters an unmodeled ability under a specific-target-state condition, no flat number " +
      "of its own",
  },

  // ── vigilante:serial-killer ──
  "vigilante:serial-killer:alignment:0": {
    archetypeId: "vigilante:serial-killer",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction with a class-progression lockout on violation — narrative drawback, no number",
  },
  "vigilante:serial-killer:calling-card:7": {
    archetypeId: "vigilante:serial-killer",
    name: "Calling Card",
    level: 7,
    bucket: "subsystem",
    note:
      "speeds up establishing renown in a new settlement plus a +2 Intimidate bump tied to renown " +
      "— renown-family social feature (class note 5), no standing number, replaces the 7th-level " +
      "social talent",
  },
  "vigilante:serial-killer:charming:5": {
    archetypeId: "vigilante:serial-killer",
    name: "Charming",
    level: 5,
    bucket: "subsystem",
    note: "grants the witch's charm hex — a hex-subsystem grant this engine doesn't model, replaces startling appearance",
  },
  "vigilante:serial-killer:death-attack:6": {
    archetypeId: "vigilante:serial-killer",
    name: "Death Attack",
    level: 6,
    bucket: "subsystem",
    note:
      "grants the assassin's death attack ability — an activated save-or-die mechanic, no flat " +
      "number, replaces the 6th-level vigilante talent",
  },
  "vigilante:serial-killer:grisly-murder:11": {
    archetypeId: "vigilante:serial-killer",
    name: "Grisly Murder",
    level: 11,
    bucket: "subsystem",
    note:
      "grants Dreadful Carnage as a bonus feat plus a nightmare-SLA rider on calling-card kills — " +
      "feat/activated-ability grant, no flat number, replaces frightening appearance",
  },
  "vigilante:serial-killer:quiet-death:12": {
    archetypeId: "vigilante:serial-killer",
    name: "Quiet Death",
    level: 12,
    bucket: "subsystem",
    note:
      "grants the assassin's quiet death class feature — an ability grant, no flat number, " +
      "replaces the 12th-level vigilante talent",
  },
  "vigilante:serial-killer:studied-target:4": {
    archetypeId: "vigilante:serial-killer",
    name: "Studied Target",
    level: 4,
    bucket: "subsystem",
    note:
      "grants the slayer's studied target ability at a reduced effective level — a pick/tracking " +
      "subsystem this engine doesn't model, replaces the vigilante talents gained at 4th/14th and " +
      "the social talents gained at 9th/19th",
  },
  "vigilante:serial-killer:swift-death:17": {
    archetypeId: "vigilante:serial-killer",
    name: "Swift Death",
    level: 17,
    bucket: "subsystem",
    note:
      "grants the assassin's swift death class feature — an ability grant, no flat number, " +
      "replaces stunning appearance",
  },
  "vigilante:serial-killer:thwart-pursuit:3": {
    archetypeId: "vigilante:serial-killer",
    name: "Thwart Pursuit",
    level: 3,
    bucket: "situational",
    note:
      "real half-level bonus, but scoped to the GameMastery Guide chase subsystem (plus the DCs of " +
      "checks made against her, tracking/gather-information) — the chase subsystem isn't modeled " +
      "anywhere in this engine (matches vigilante-talents.ts's Chase Master precedent), replaces " +
      "unshakable",
  },
  "vigilante:serial-killer:vigilante-specialization:0": {
    archetypeId: "vigilante:serial-killer",
    name: "Vigilante Specialization",
    level: 0,
    bucket: "subsystem",
    note:
      "forces the stalker specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      "); also states her hidden strike counts as sneak attack for prerequisites/sneak-attack-" +
      "dependent abilities — a cross-subsystem interaction this pipeline doesn't model",
  },

  // ── vigilante:splintersoul ──
  "vigilante:splintersoul:splintered-identity:0": {
    archetypeId: "vigilante:splintersoul",
    name: "Splintered Identity",
    level: 0,
    bucket: "subsystem",
    note:
      "restricts vigilante-talent use to the vigilante identity and adds per-identity alignment-" +
      "eligibility rules for classes/feats — a narrative/eligibility mechanic (class note 2), no " +
      "flat number",
  },
  "vigilante:splintersoul:sudden-change:0": {
    archetypeId: "vigilante:splintersoul",
    name: "Sudden Change",
    level: 3,
    bucket: "subsystem",
    note:
      "forces specific social-talent picks (quick change at 3rd, immediate change at 7th) ignoring " +
      "their minimum levels — a talent-pick timing rule (class note 1), replaces unshakable and " +
      "alters the social talents gained at 3rd/7th",
  },
  "vigilante:splintersoul:surprising-change:7": {
    archetypeId: "vigilante:splintersoul",
    name: "Surprising Change",
    level: 7,
    bucket: "subsystem",
    note:
      "lets startling/frightening/stunning appearance be used against unaware foes when revealing " +
      "his identity, limited by Charisma modifier per day — alters unmodeled abilities, no flat " +
      "number",
  },

  // ── vigilante:teisatsu ──
  "vigilante:teisatsu:ki-power:1": {
    archetypeId: "vigilante:teisatsu",
    name: "Ki Power",
    level: 1,
    bucket: "subsystem",
    note: "grants a player-chosen unchained-monk ki power — a pick-list subsystem the engine doesn't model",
  },
  "vigilante:teisatsu:shadow-tricks:1": {
    archetypeId: "vigilante:teisatsu",
    name: "Shadow Tricks",
    level: 1,
    bucket: "subsystem",
    note:
      "grants a player-chosen ninja trick, applied to hidden strikes instead of sneak attacks for " +
      "asterisked tricks — a pick-list subsystem the engine doesn't model, and a cross-subsystem " +
      "interaction with hidden strike (class note 3) besides",
  },

  // ── vigilante:warlock ──
  "vigilante:warlock:arcane-striker:12": {
    archetypeId: "vigilante:warlock",
    name: "Arcane Striker",
    level: 12,
    bucket: "subsystem",
    note:
      "grants Arcane Strike as a bonus feat with a menu of weapon special abilities to apply while " +
      "it's active, expanding at 16th — a feat/choice-list grant, no flat number",
  },
  "vigilante:warlock:elemental-armor:4": {
    archetypeId: "vigilante:warlock",
    name: "Elemental Armor",
    level: 4,
    bucket: "situational",
    note: "real, scaling energy resistance and reactive damage, but " + NOTE_IDENTITY_GATED,
  },
  "vigilante:warlock:familiar:1": {
    archetypeId: "vigilante:warlock",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar — companion subsystem, not the character's own number",
  },
  "vigilante:warlock:social-simulacrum:8": {
    archetypeId: "vigilante:warlock",
    name: "Social Simulacrum",
    level: 8,
    bucket: "subsystem",
    note:
      "once-per-day short-lived duplicate of her social identity — an activated ability, no flat " +
      "number",
  },
  "vigilante:warlock:tattoo-chamber:1": {
    archetypeId: "vigilante:warlock",
    name: "Tattoo Chamber",
    level: 1,
    bucket: "subsystem",
    note: "functions as the cabalist's identical ability — extradimensional storage, no Change",
  },

  // ── vigilante:wildsoul ──
  "vigilante:wildsoul:arachnid:2": {
    archetypeId: "vigilante:wildsoul",
    name: "Arachnid",
    level: 2,
    bucket: "numeric",
    note:
      "mixed feature: Web Specialist's climb speed 30 ft. at 12th level is real, unconditional, " +
      "and NOT identity-gated (unlike this same archetype's Falconine sub-type below), so it's " +
      "extracted (same climbSpeed-target posture as vigilante-talents.ts's Rooftop Infiltrator); " +
      "the stalker sense talent grant (2nd), web ranged-touch-attack tanglefoot effect (6th), and " +
      "silk-rope-shooting/web-swinging abilities (12th/18th) are all ability grants with no flat " +
      "number and stay unmodeled",
  },
  "vigilante:wildsoul:falconine:2": {
    archetypeId: "vigilante:wildsoul",
    name: "Falconine",
    level: 2,
    bucket: "situational",
    note:
      "real half-level competence bonus, but scoped to visual Perception checks specifically (this " +
      "engine's skill.per target can't be split into visual/non-visual sub-checks); its 12th-level " +
      "fly speed is separately " +
      NOTE_IDENTITY_GATED +
      "; the perfect fall talent grant (2nd) and dive-attack damage (18th) are unmodeled besides",
  },
  "vigilante:wildsoul:feline:2": {
    archetypeId: "vigilante:wildsoul",
    name: "Feline",
    level: 2,
    bucket: "situational",
    note:
      "real Perception-range-penalty reduction and a conditional +2-per-existing-sense bonus, both " +
      "scoped to specific circumstances a flat Change would over-apply outside of; uncanny dodge/" +
      "improved uncanny dodge and the mad rush/defensive roll talent grants have no Change target " +
      "either",
  },
  "vigilante:wildsoul:ursine:2": {
    archetypeId: "vigilante:wildsoul",
    name: "Ursine",
    level: 2,
    bucket: "situational",
    note:
      "real, scaling natural armor bonus (+1 at 12th/16th/20th), but " +
      NOTE_IDENTITY_GATED +
      "; the claw/bite natural attacks have no Change target (nattack/ndamage unapplied) and the " +
      "18th-level bear-form shapechange is unmodeled",
  },

  // ── vigilante:zealot ──
  "vigilante:zealot:alignment:0": {
    archetypeId: "vigilante:zealot",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction gating spellcasting by identity — narrative drawback, no number",
  },
  "vigilante:zealot:aura:0": {
    archetypeId: "vigilante:zealot",
    name: "Aura",
    level: 0,
    bucket: "subsystem",
    note:
      "alignment-aura grant scoped to his vigilante identity — a detection-ability grant, no " +
      "number",
  },
  "vigilante:zealot:chaotic-evil-good-and-lawful-spells:0": {
    archetypeId: "vigilante:zealot",
    name: "Chaotic, Evil, Good, and Lawful Spells",
    level: 0,
    bucket: "subsystem",
    note: "alignment-based spell restriction — a spell-list rule, no number",
  },
  "vigilante:zealot:class-skills:0": {
    archetypeId: "vigilante:zealot",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: NOTE_CLASS_SKILLS_SWAP,
  },
  "vigilante:zealot:inquisition:0": {
    archetypeId: "vigilante:zealot",
    name: "Inquisition",
    level: 0,
    bucket: "subsystem",
    note:
      "replaces vigilante specialization (" +
      NOTE_SPECIALIZATION_STRUCTURAL +
      ") with an inquisitor inquisition — the inquisition subsystem isn't modeled in this engine",
  },
  "vigilante:zealot:skill-ranks-per-level:0": {
    archetypeId: "vigilante:zealot",
    name: "Skill Ranks per Level",
    level: 0,
    bucket: "numeric",
    note: NOTE_SKILL_RANKS_PER_LEVEL,
  },
  "vigilante:zealot:spellcasting:0": {
    archetypeId: "vigilante:zealot",
    name: "Spellcasting",
    level: 0,
    bucket: "subsystem",
    note:
      "replaces the vigilante talents gained at 4th/8th/10th/14th/16th with inquisitor " +
      "spellcasting and the inquisitor spell list — no Change-shaped number",
  },
  "vigilante:zealot:weapon-proficiencies:0": {
    archetypeId: "vigilante:zealot",
    name: "Weapon Proficiencies",
    level: 0,
    bucket: "subsystem",
    note:
      "grants proficiency with the deity's favored weapon, with an Improved Unarmed Strike " +
      "fallback if that weapon is unarmed strike — proficiency/feat grant, no Change",
  },
  "vigilante:zealot:zealot-talents:0": {
    archetypeId: "vigilante:zealot",
    name: "Zealot Talents",
    level: 0,
    bucket: "subsystem",
    note:
      "adds a zealot-specific talent menu (channel energy, discern lies, empower symbol, stalwart, " +
      "stern gaze, zealot smite) to the talent pick-list (class note 1) — a menu of mostly " +
      "activated/resource-gated abilities the engine doesn't model, mirrors vigilante-talents.ts's " +
      "treatment of similarly-shaped picks",
  },
};

/**
 * ── VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for vigilante archetype class features
 * (the prose→Change extraction pipeline, vigilante slice). Clean-room from
 * the published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from any hand-verified table — every
 * entry here additionally carries `confidence`/`provenance` so a reviewer
 * (or the UI) can never confuse "a human read the rulebook and checked this"
 * with "an extraction pass inferred this from prose." Only 4 of vigilante's
 * 143 features cleared the `numeric` bar (see
 * `VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — vigilante's kit leans heavily on identity-gated transformations,
 * vigilante/social talent picks, and other classes' sub-abilities grafted on
 * wholesale, none of which are Change-shaped in this engine today.
 *
 * Confidence rubric (identical to the fighter/magus pilots'): see this file's
 * header doc comment.
 */
export const VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Three archetypes reduce the vigilante's skill ranks per level from
  // 6 + Int to 4 + Int — a flat -2/level delta on `bonusSkillRanks`, the
  // target the web model's skill budget consumes (see targets.ts's doc
  // comment; cleric Cardinal's Political Skill established the idiom for a
  // per-level ranks delta). The Int-modifier half of the sentence is the
  // unchanged baseline, not part of the delta.
  "vigilante:avenging-beast:skill-ranks-per-level:0": {
    changes: [c("-2 * @class.unlevel", "bonusSkillRanks")],
    detail: () => "-2 skill ranks per vigilante level (4 + Int, not 6 + Int)",
    confidence: "high",
    provenance:
      "An avenging beast gains a number of skill ranks equal to 4 + his Intelligence modifier at " +
      "each level, instead of 6 + his Intelligence modifier.",
  },
  "vigilante:magical-child:skill-ranks-per-level:0": {
    changes: [c("-2 * @class.unlevel", "bonusSkillRanks")],
    detail: () => "-2 skill ranks per vigilante level (4 + Int, not 6 + Int)",
    confidence: "high",
    provenance:
      "A magical child gains a number of skill ranks equal to 4 + her Intelligence modifier at " +
      "each level, instead of the normal 6 + her Intelligence modifier skill ranks.",
  },
  "vigilante:zealot:skill-ranks-per-level:0": {
    changes: [c("-2 * @class.unlevel", "bonusSkillRanks")],
    detail: () => "-2 skill ranks per vigilante level (4 + Int, not 6 + Int)",
    confidence: "high",
    provenance:
      "A zealot gains a number of skill ranks equal to 4 + his Intelligence modifier at each " +
      "level, instead of 6 + his Intelligence modifier skill ranks.",
  },
  // Experimenter's "Forbidden Science" (Champions of Corruption) states two
  // half-level skill bonuses in one sentence: one scoped to Craft (alchemy)
  // checks "to create alchemical items" (dropped — a specific check purpose,
  // same posture as other scoped-Craft entries), and one on Knowledge
  // (engineering) checks generally (unscoped, extracted). Both share the
  // same "(minimum +1)" floor.
  "vigilante:experimenter:forbidden-science:0": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.ken")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Knowledge (engineering) (Craft [alchemy] bonus and ` +
      `mutagen-trigger drama not modeled)`,
    confidence: "medium",
    provenance:
      "An experimenter gains a bonus equal to 1/2 his vigilante level on Craft (alchemy) checks " +
      "to create alchemical items and on Knowledge (engineering) checks (minimum +1).",
  },

  // Gunmaster Initiative (Ultimate Intrigue) is a flat, unconditional +2 to
  // initiative checks — the accompanying free-action-firearm-draw rider
  // (gated on having Quick Draw) is a distinct action-economy grant, not a
  // number, and is dropped, same posture as Kensai's Iaijutsu entry in the
  // magus pilot (a clean number kept even though a secondary non-numeric
  // grant is noted, not modeled).
  "vigilante:gunmaster:gunmaster-initiative:4": {
    changes: [c("2", "init")],
    detail: () => "+2 initiative (Quick Draw firearm-draw rider not modeled)",
    confidence: "high",
    provenance: "The gunmaster gains a +2 bonus on initiative checks.",
  },

  // Masked Maiden's own "Armor Training" (Grand Bazaar) grants the fighter's
  // Armor Training class feature on the fighter's normal 4-level cadence
  // (3rd/7th/11th/15th, capping at +4) plus Armor Mastery (DR 5/- while
  // wearing armor) at 19th, using vigilante level as fighter level — the
  // text names both abilities without restating their numbers (unlike the
  // magus pilot's Myrmidarch, which explicitly wrote "DR 5/-"), so this
  // extraction composes the vendored text's level-equivalence with the
  // already-known Fighter Armor Training/Armor Mastery formulas, same
  // "named ability reference" posture as the magus pilot's Armored
  // Battlemage/Myrmidarch Armor Training entries.
  "vigilante:masked-maiden:armor-training:0": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
      c("if(and(gte(@class.unlevel, 19), gte(@armor.type, 1)), 5, 0)", "dr"),
    ],
    detail: (level) => {
      const tier = Math.min(4, Math.floor((level + 1) / 4));
      return level >= 19
        ? `+${tier} max Dex / -ACP (armor), DR 5/- (armored)`
        : `+${tier} max Dex / -ACP (armor)`;
    },
    confidence: "medium",
    provenance:
      "At 3rd level, a masked maiden gains the fighter’s armor training class feature, and at " +
      "19th level she gains armor mastery. She treats her vigilante level as her fighter level " +
      "for the purposes of both.",
  },

  // Wildsoul's "Arachnid" sub-type (Blood of the Beast) bundles four
  // level-gated abilities under one feature id; only Web Specialist's climb
  // speed 30 ft. at 12th level is a flat, unconditional number NOT scoped to
  // "while in his vigilante identity" (this archetype's own Falconine
  // sub-type explicitly gates its 12th-level fly speed that way — Arachnid's
  // climb speed carries no such qualifier), so it's the one clause safe to
  // extract, same posture vigilante-talents.ts uses for Rooftop Infiltrator's
  // climbSpeed grant.
  "vigilante:wildsoul:arachnid:2": {
    changes: [c("if(gte(@class.unlevel, 12), 30, 0)", "climbSpeed")],
    detail: (level) =>
      level >= 12
        ? "climb speed 30 ft. (stalker sense/web attacks not modeled)"
        : "stalker sense talent, web ranged touch attack — not modeled (climb speed 30 ft. at 12th)",
    confidence: "high",
    provenance:
      "At 12th level, an arachnid wildsoul can coat his hands and feet in super-sticky webbing, " +
      "even over equipment such as gloves and boots. This gives him a climb speed of 30 feet.",
  },

  // Dragonscale Loyalist's "False Allegiance" grants a bonus feat plus one of
  // seven house-specific abilities at 5th level. Only the numerically-clean
  // houses are wired (the flat bonus each cited house's own named bonus feat
  // grants, per that feat's own text, plus one archetype-text-stated flat
  // CMD bonus); every narrowly-scoped rider (gather-information-only
  // Diplomacy, allies-only Sense Motive, resale percentage, Swim ACP
  // exemption, dwarven stonecunning) is dropped, and Garess/Medvyed's houses
  // emit nothing (their own named feats — Sure Grasp, Endurance — have no
  // flat baseline number, and Medvyed's resist nature's lure bonus is scoped
  // to fey attackers with no matching save category).
  "vigilante:dragonscale-loyalist:false-allegiance:0": {
    changes: [],
    choice: {
      label: "House",
      options: [
        { id: "garess", label: "House Garess" },
        { id: "lebeda", label: "House Lebeda (+3/+6 Appraise)" },
        { id: "lodovka", label: "House Lodovka (+2 Acrobatics/Climb/Swim)" },
        { id: "medvyed", label: "House Medvyed" },
        { id: "orlovsky", label: "House Orlovsky (+3 CMD)" },
        { id: "rogarvia", label: "House Rogarvia (+3/+6 Knowledge [history])" },
        { id: "surtova", label: "House Surtova (+2/+4 Diplomacy/Intimidate)" },
      ],
    },
    choiceChanges: {
      garess: [],
      lebeda: [c("if(gte(@skills.apr.rank, 10), 6, 3)", "skill.apr")],
      lodovka: [c("2", "skill.acr"), c("2", "skill.clm"), c("2", "skill.swm")],
      medvyed: [],
      orlovsky: [c("3", "cmd")],
      rogarvia: [c("if(gte(@skills.khi.rank, 10), 6, 3)", "skill.khi")],
      surtova: [
        c("if(gte(@skills.dip.rank, 10), 4, 2)", "skill.dip"),
        c("if(gte(@skills.int.rank, 10), 4, 2)", "skill.int"),
      ],
    },
    detail: () =>
      "Garess: none · Lebeda: +3/+6 Appraise · Lodovka: +2 Acrobatics/Climb/Swim · Medvyed: none · " +
      "Orlovsky: +3 CMD · Rogarvia: +3/+6 Knowledge (history) · Surtova: +2/+4 Diplomacy/Intimidate " +
      "(choice stored per pick)",
    confidence: "medium",
    // The full description is quoted verbatim (rather than excerpted per
    // house) because the test fixture requires `provenance` to be one
    // contiguous substring of the vendored text, and the wired houses aren't
    // adjacent to each other in it.
    provenance:
      "Eventually, a loyalist begins training to infiltrate one of Brevoy’s great houses. " +
      "At 5th level, a Dragonscale loyalist chooses one of the seven houses of Brevoy, gaining " +
      "a bonus feat and a special ability appropriate to the chosen house. He need not meet " +
      "the feat’s prerequisites. House Garess : The Dragonscale loyalist gains Sure Grasp " +
      "UC and dwarves’ stonecunning racial trait. House Lebeda : The Dragonscale loyalist " +
      "gains Skill Focus (Appraise). He can also resell items for 60% of their listed value, " +
      "rather than 50%. The purchase limit of the settlement must be high enough to " +
      "accommodate the increased value. House Lodovka : The Dragonscale loyalist gains Sea " +
      "Legs UC . When attempting Swim checks, he ignores the armor check penalty of light or " +
      "medium armor. If the loyalist has the heavy training vigilante talent, this applies to " +
      "heavy armor as well. House Medvyed : The Dragonscale loyalist gains Endurance and the " +
      "druid’s resist nature’s lure class feature. House Orlovsky: The Dragonscale " +
      "loyalist gains Call Truce UI and a +3 bonus to his CMD. House Rogarvia : The Dragonscale " +
      "loyalist gains Skill Focus (Knowledge [history]) and a +2 bonus on Diplomacy checks to " +
      "gather information. This bonus increases to +4 when gathering information related to " +
      "the Rogarvias. House Surtova : The Dragonscale loyalist gains Persuasive and a +4 bonus " +
      "on Sense Motive checks against creatures that profess to be his allies. This ability " +
      "replaces startling appearance.",
  },
};
