/**
 * Clean-room PF1 occultist implement-school table (Occult Adventures, DESIGN
 * §6): hand-authored, mirroring `psychic-disciplines.ts`'s posture exactly —
 * IMPLEMENTS' data provenance is the same "vendored but not linked from the
 * class def" case documented there. The vendored Foundry pack DOES ship 8
 * `*-resonant-school.*.yaml` standalone entries (one per school), but each
 * only carries the school's flavor text + implement-object list, NOT its
 * base/resonant focus power (those live in their OWN standalone
 * `class-abilities` entries — e.g. `warding-talisman.*.yaml`,
 * `mind-barrier.*.yaml` — also unlinked from the class def). Every number
 * below is hand-authored clean-room from aonprd.com's "Occultist" class page
 * (verified against its exact "Implements"/"Mental Focus"/"Focus Powers"
 * class-feature text and each resonant power's own prose), NOT transcribed
 * from the vendored YAML — the YAML was consulted only for the implement
 * OBJECT lists (Amulet/armor/bell/... — flavor text, not a rules number) and
 * for cross-checking which class-ability entries exist at all, same
 * "consulted for provenance, not copied" posture `psychic-disciplines.ts`
 * documents for its own bonus-spell ids.
 *
 * Implement-school cadence (verified verbatim against the "Implements" class
 * feature): "At 1st level, an occultist learns to use two implement schools.
 * At 2nd level and every 4 occultist levels thereafter, the occultist learns
 * to use one additional implement school, to a maximum of seven schools at
 * 18th level." → 2 at 1st, +1 at 2nd/6th/10th/14th/18th (six picks total).
 * "An occultist can select an implement school more than once in order to
 * learn additional spells from the associated school" — so
 * `build.occultistImplements` is a MULTISET (see its own doc comment in
 * `@pf1/schema` `character.ts`), unlike every other budgeted picker in this
 * codebase.
 *
 * Focus-power cadence (verified verbatim against the "Focus Powers" class
 * feature): "At 1st level, an occultist learns the base focus power from
 * both of his two implement schools and can select one more focus power...
 * at 3rd level and every 2 levels thereafter" → 1 pick at 1st, +1 at
 * 3rd/5th/7th/.../19th (ten picks total by 19th). See
 * `apps/web/src/model/occultistImplements.ts` for both budgets' math.
 *
 * Mental Focus pool ("@class.unlevel + @abilities.int.mod", per day) is
 * already a real vendored `uses.maxFormula` on the occultist's own linked
 * "Mental Focus" class feature (confirmed: unlike the Phrenic Pool case
 * `psychic-disciplines.ts` documents, Int IS the occultist's own casting
 * ability, so no cha→X alias correction is needed here) — it rides the
 * fully generic resource-pool pipeline for free, no table needed in this
 * file.
 *
 * RESONANT POWERS — the mental-focus-scaled, per-implement passive bonus
 * that activates automatically once focus is invested (`live.
 * occultistFocusInvested[tag]`) — are "mostly numeric" per RAW, but only
 * FOUR of the eight have a bonus target this engine's derived sheet actually
 * models as an always-on stat (`appliesAsChange: true`, wired into
 * `collect.ts`'s occultist block as real `Change`s):
 *   - Abjuration (Warding Talisman): resistance bonus on ALL saving throws
 *     — a clean, unconditional target (`allSavingThrows`).
 *   - Divination (Third Eye): insight bonus on Perception — clean,
 *     unconditional (`skill.per`). Third Eye ALSO grants tiered vision
 *     upgrades (low-light at 3rd level w/ 3+ focus, darkvision 60ft at 5th
 *     w/ 6+, see invisibility at 7th w/ 9+, blindsense 60ft at 13th w/ 12+,
 *     blindsight 30ft at 19th w/ 15+) — this engine has no vision-tier stat
 *     anywhere in `DerivedSheet`, so those tiers are display-only prose in
 *     `summary`, not modeled.
 *   - Enchantment (Glorious Presence): competence bonus on "all
 *     Charisma-based skill checks AND ability checks" — the SKILL half is
 *     clean (looped over every Cha-keyed skill in `collect.ts`); the ABILITY
 *     CHECK half has no home in this engine (no distinct "ability check"
 *     roll exists outside the ability score itself — applying it to the
 *     score's `Change` target would incorrectly cascade into every other
 *     Cha-derived stat, e.g. spell DCs). Documented gap, not silently
 *     dropped — same posture as `live.negativeLevels`' own undocumented-
 *     ability-check-penalty gap (see that field's doc comment).
 *   - Transmutation (Physical Enhancement): enhancement bonus to ONE
 *     PLAYER-CHOSEN physical ability score
 *     (`live.occultistPhysicalEnhancementAbility`, default "str") — clean,
 *     though RAW lets the choice change per-invocation and this app tracks
 *     only the current choice (documented simplification, see that field's
 *     schema doc comment).
 * The other four are genuinely SITUATIONAL/CONDITIONAL — their bonus only
 * applies to certain spells cast THROUGH that implement, or to a game
 * concept this engine's `DerivedSheet` doesn't track at all (miss chance %,
 * undead Hit Dice controlled) — so `appliesAsChange: false` and they are
 * NEVER injected as sheet-wide `Change`s (that would silently overstate the
 * character, e.g. Evocation's damage bonus applying to EVERY attack roll
 * instead of just certain spells). `computeBonus` is still exported for all
 * eight so the Implement picker can show "current value" as a preview —
 * mirroring the project's existing posture for other situational bonuses
 * (e.g. ranger favored-enemy bonuses, per `build.favoredEnemies`' doc
 * comment: "NEVER folded into the always-on derived sheet").
 *   - Conjuration (Casting Focus): +1 caster level per 2 focus invested
 *     (cap = occultist level), but ONLY for conjuration spells with a
 *     duration in rounds/level, cast using the implement as a focus
 *     component — not a blanket CL bonus.
 *   - Evocation (Intense Focus): +1 damage per 2 focus invested (cap = 1 +
 *     1 per 2 occultist levels), but ONLY for damaging evocations with an
 *     instantaneous duration — this engine computes no spell-damage stat at
 *     all (damage formulas are per-spell prose, not summed anywhere).
 *   - Illusion (Distortion): 5% concealment miss chance per focus invested
 *     (cap 5% + 5% per 2 occultist levels; at 50% grants full invisibility
 *     benefits instead of scaling further) — this engine has no "miss
 *     chance %" stat anywhere in `DerivedSheet`.
 *   - Necromancy (Necromantic Focus): control 2 additional undead Hit Dice
 *     per focus invested (cap = 4 × occultist level) — this engine has no
 *     undead-control-pool stat anywhere.
 *
 * BASE FOCUS POWERS and the FOCUS-POWER MENU are, per the task brief,
 * note-tier/`displayOnly` (name + one-line summary, no `Change[]`) —
 * EVERY occultist focus power (base or menu) is an ACTIVATED ability spent
 * from the Mental Focus pool (a swift/standard/move action, often with its
 * own duration/save), not a passive always-on bonus, so none of them are
 * candidates for a persistent sheet `Change` the way a resonant power's
 * always-on investment bonus is — same "activated, not passive" reasoning
 * `psychic-disciplines.ts` gives for leaving phrenic amplifications
 * unmodeled, and `oracle-revelations.ts`/`witch-hexes.ts` give for their own
 * `changes: []` entries.
 */

import type { AbilityId } from "@pf1/schema";

export interface OccultistBaseFocusPower {
  name: string;
  summary: string;
}

export interface OccultistFocusPowerDef {
  /** Stable slug, unique within the school — id is `"<schoolTag>:<slug>"`. */
  slug: string;
  name: string;
  /** Minimum occultist level to select, when RAW states one; omitted = no gate. */
  minLevel?: number;
  summary: string;
}

export interface OccultistResonantPower {
  name: string;
  /** Full scaling rule, quoted/paraphrased from aonprd.com. */
  summary: string;
  /**
   * True for the four resonant powers whose bonus target is unconditional
   * enough to model as a real, always-on `Change` (see this file's doc
   * comment for exactly which four and why). False = situational/
   * conditional — `computeBonus` is still exported for a display preview,
   * but `collect.ts` never injects it into the sheet.
   */
  appliesAsChange: boolean;
  /**
   * Current bonus for `invested` Mental Focus points at `occultistLevel`,
   * per the resonant power's own cap formula. Illusion's Distortion returns
   * a PERCENTAGE (5/10/15/...), every other power returns a flat bonus.
   */
  computeBonus: (invested: number, occultistLevel: number) => number;
}

export interface OccultistSchoolDef {
  /** Matches `build.occultistImplements` entries / `live.occultistFocusInvested` keys. */
  tag: string;
  name: string;
  /** Flavor text: the objects that can serve as this school's implement. */
  implements: string;
  basePower: OccultistBaseFocusPower;
  resonantPower: OccultistResonantPower;
  /** The selectable focus-power menu for this school (excludes the base power). */
  focusPowers: OccultistFocusPowerDef[];
}

/** `min(floor(invested / perPoints), capBase + floor(occultistLevel / capPerLevels))`. */
function cappedFocusBonus(
  invested: number,
  occultistLevel: number,
  perPoints: number,
  capBase: number,
  capPerLevels: number,
): number {
  const raw = Math.floor(invested / perPoints);
  const cap = capBase + Math.floor(occultistLevel / capPerLevels);
  return Math.max(0, Math.min(raw, cap));
}

const SCHOOL_LIST: OccultistSchoolDef[] = [
  {
    tag: "abjuration",
    name: "Abjuration",
    implements: "Amulet, armor, bell, bracers, brooch, cloak, holy symbol, shield",
    basePower: {
      name: "Mind Barrier",
      summary:
        "Swift action, 1 focus: a shield of mental energy prevents 2 damage per occultist level, lasting until the start of your next turn or until exhausted.",
    },
    resonantPower: {
      name: "Warding Talisman",
      summary:
        "+1 resistance bonus on saving throws for every 2 points of mental focus invested in the implement, to a maximum bonus of 1 + 1 for every 4 occultist levels you possess.",
      appliesAsChange: true,
      computeBonus: (invested, level) => cappedFocusBonus(invested, level, 2, 1, 4),
    },
    focusPowers: [
      {
        slug: "aegis",
        name: "Aegis",
        summary:
          "Standard action, 1 focus: touch a suit of armor or a shield to grant it an enhancement bonus of 1 + 1 for every 6 occultist levels (max +4 at 18th), or an equivalent special ability instead. Lasts 1 minute.",
      },
      {
        slug: "energy-shield",
        name: "Energy Shield",
        minLevel: 3,
        summary:
          "Swift action (or immediate for 2 focus), 1 focus: surround yourself with a shield absorbing up to 5 points per occultist level of one chosen energy type (acid/cold/electricity/fire). Lasts 1 minute or until exhausted.",
      },
      {
        slug: "globe-of-negation",
        name: "Globe of Negation",
        minLevel: 11,
        summary:
          "Standard action, 3 focus: create a stationary 10-ft.-diameter globe that cancels spells cast into or through it, up to a total spell level equal to your occultist level; exceeding that grants affected creatures a +4 circumstance bonus on saves. Lasts occultist level in rounds.",
      },
      {
        slug: "loci-sentry",
        name: "Loci Sentry",
        summary:
          "Standard action, 1 focus: set a ward over an area (radius 10 ft. + 5 ft./occultist level) that dazes 1 round (Will negates) any creature entering it. Lasts up to 1 hour/level or until triggered.",
      },
      {
        slug: "planar-ward",
        name: "Planar Ward",
        summary:
          "Standard action, 2 focus: surround yourself with a ward against extraplanar/outsider creatures — they take a -4 penalty on attacks against you, and you gain a +4 circumstance bonus on saves against their spells and abilities. Lasts 1 minute.",
      },
      {
        slug: "unraveling",
        name: "Unraveling",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: functions as targeted dispel magic against an effect you're adjacent to; gain a +5 bonus on the caster level check when targeting a psychic-magic effect.",
      },
    ],
  },
  {
    tag: "conjuration",
    name: "Conjuration",
    implements: "Bowl, brazier, compass, figurine, lantern, mirror",
    basePower: {
      name: "Servitor",
      summary:
        "Standard action, 1 focus: functions as summon monster I (a single creature, 1 minute); the spell level cast increases at 4th level and every 3 levels thereafter, up to summon monster VII at 19th.",
    },
    resonantPower: {
      name: "Casting Focus",
      summary:
        "Add the implement as a focus component to any conjuration spell with a duration in rounds/level: +1 caster level for every 2 points of mental focus stored in the implement, to a maximum bonus equal to your occultist level. Situational (only certain conjuration spells cast through the implement) — shown as a computed preview only, not applied to the sheet's caster level.",
      appliesAsChange: false,
      computeBonus: (invested, level) => cappedFocusBonus(invested, level, 2, 0, 1),
    },
    focusPowers: [
      {
        slug: "mind-steed",
        name: "Mind Steed",
        summary:
          "Standard action, 1 focus (2 for a flying mount at 9th+): conjure a spectral mount functioning as the mount spell for 10 minutes/occultist level; gains flight at 9th level.",
      },
      {
        slug: "conjure-implement",
        name: "Conjure Implement",
        minLevel: 3,
        summary:
          "Standard action, 1 focus: conjure any implement item you know how to use, as a masterwork version, for 10 minutes/occultist level.",
      },
      {
        slug: "flesh-mend",
        name: "Flesh Mend",
        minLevel: 3,
        summary:
          "Standard action, 1 focus: heal a living creature by touch for 1d8 + occultist level, +1d8 for every 4 levels beyond 3rd (max 5d8+19 at 19th).",
      },
      {
        slug: "psychic-fog",
        name: "Psychic Fog",
        minLevel: 3,
        summary:
          "Standard action, 1 focus (2 for solid fog at 7th+): create a fog bank (fog cloud, or solid fog at 7th+) lasting 1 minute/occultist level, unaffected by wind.",
      },
      {
        slug: "purge-corruption",
        name: "Purge Corruption",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: touch-range neutralize poison or remove disease, occultist level as caster level.",
      },
      {
        slug: "side-step",
        name: "Side Step",
        minLevel: 7,
        summary:
          "Part of a move action, 1 focus: teleport up to 10 ft./occultist level, costing 5 ft. of your movement, without provoking attacks of opportunity.",
      },
    ],
  },
  {
    tag: "divination",
    name: "Divination",
    implements: "Book, crystal ball, goggles, harrow deck, headband, lenses, planchette",
    basePower: {
      name: "Sudden Insight",
      summary:
        "Swift action, 1 focus: gain an insight bonus equal to half your occultist level (minimum +1) on one ability check, attack roll, or skill check made before the end of your turn.",
    },
    resonantPower: {
      name: "Third Eye",
      summary:
        "+1 insight bonus on Perception checks for every 2 points of mental focus invested, to a maximum equal to your occultist level. Also grants tiered vision upgrades as you invest more focus and gain levels: low-light vision (3rd level, 3+ focus), darkvision 60 ft (5th level, 6+ focus), see invisibility (7th level, 9+ focus), blindsense 60 ft (13th level, 12+ focus), blindsight 30 ft (19th level, 15+ focus) — the vision tiers are display-only prose; this engine has no vision-tier stat to model them against.",
      appliesAsChange: true,
      computeBonus: (invested, level) => cappedFocusBonus(invested, level, 2, 0, 1),
    },
    focusPowers: [
      {
        slug: "future-gaze",
        name: "Future Gaze",
        summary:
          "Standard action, 1 focus: functions as augury, using your occultist level as caster level.",
      },
      {
        slug: "watchful-eye",
        name: "Watchful Eye",
        summary:
          "Standard action, 1 focus: create an invisible 5-ft. sensor within 30 ft. that alerts you when creatures enter it, lasting 10 minutes/occultist level; each additional focus spent expands its coverage by 5 ft.",
      },
      {
        slug: "powerful-connection",
        name: "Powerful Connection",
        summary:
          "1 focus: double the saving-throw penalty on a divination spell that uses a physical connection to its target, or increase its DC by 2 for other target-connected divinations.",
      },
      {
        slug: "danger-sight",
        name: "Danger Sight",
        minLevel: 3,
        summary:
          "Immediate action, 1 focus: gain an insight bonus equal to half your occultist level on your next AC or saving throw before the end of the round.",
      },
      {
        slug: "mind-eye",
        name: "Mind Eye",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: create an invisible Fine sensor (AC 18, fly 60 ft., perfect maneuverability) you can see through from up to 1 mile away, requiring concentration; lasts 1 minute/occultist level.",
      },
      {
        slug: "object-seer",
        name: "Object Seer",
        minLevel: 7,
        summary:
          "Full-round action, 1 focus: ask one question about an object you hold regarding its nature, prior owner, or history, functioning as commune with cryptic answers possible.",
      },
    ],
  },
  {
    tag: "enchantment",
    name: "Enchantment",
    implements: "Censer, crown, helm, musical instrument, necklace",
    basePower: {
      name: "Cloud Mind",
      summary:
        "Standard action, 1 focus: a target within 30 ft is dazed 1 round (HD ≤ your occultist level) or staggered 1 round (HD higher) — Will negates; a creature that saves (or that you affect) is immune to this power for 1 day.",
    },
    resonantPower: {
      name: "Glorious Presence",
      summary:
        "+1 competence bonus on all Charisma-based skill checks and ability checks for every 2 points of mental focus invested, to a maximum bonus of 1 + 1 for every 4 occultist levels you possess. Only the skill-check half is applied to the sheet (every Charisma-keyed skill) — the ability-check half has no modelable target in this engine (see this file's doc comment).",
      appliesAsChange: true,
      computeBonus: (invested, level) => cappedFocusBonus(invested, level, 2, 1, 4),
    },
    focusPowers: [
      {
        slug: "inspired-assault",
        name: "Inspired Assault",
        summary:
          "Standard action, 1 focus: touch a living creature to grant it a morale bonus on attack rolls and fear saves of 1 + 1 per 6 occultist levels (max +4), lasting 1 minute.",
      },
      {
        slug: "mental-discord",
        name: "Mental Discord",
        summary:
          "Standard action, 1 focus: a target within 30 ft. can't concentrate on spells effectively, taking a -4 penalty (-2 for thought-component casters) on concentration checks for 1 round/occultist level.",
      },
      {
        slug: "obey",
        name: "Obey",
        summary:
          "Standard action, 1 focus: functions as command against one living creature (a -2 penalty on the save if it shares your creature type).",
      },
      {
        slug: "mind-slumber",
        name: "Mind Slumber",
        minLevel: 3,
        summary:
          "Standard action, 1 focus: lull a living creature into deep sleep for occultist level rounds or until damaged, with a fresh save each round it's disturbed.",
      },
      {
        slug: "forced-alliance",
        name: "Forced Alliance",
        minLevel: 5,
        summary:
          "Standard action, 1 focus (2 for a different creature type): a living creature perceives you as a trusted ally for 1 round/occultist level.",
      },
      {
        slug: "binding-pattern",
        name: "Binding Pattern",
        minLevel: 7,
        summary:
          "Standard action, 1 focus: paralyze a living creature for 1 round per 2 occultist levels; it may save at the end of its turn to become staggered instead of paralyzed.",
      },
    ],
  },
  {
    tag: "evocation",
    name: "Evocation",
    implements: "Gloves, rod, staff, wand",
    basePower: {
      name: "Energy Ray",
      summary:
        "1 focus: a ranged touch attack (30 ft) dealing 1d6 damage of a chosen energy type (acid/cold/electricity/fire), +1d6 for every 2 occultist levels beyond 1st, to a maximum of 10d6 at 19th level.",
    },
    resonantPower: {
      name: "Intense Focus",
      summary:
        "Add the implement as a focus component to damaging evocations with an instantaneous duration: +1 damage for every 2 points of mental focus invested, to a maximum of 1 + 1 for every 2 occultist levels you possess. Situational (only certain evocations cast through the implement) — this engine computes no spell-damage stat at all, so it's shown as a computed preview only.",
      appliesAsChange: false,
      computeBonus: (invested, level) => cappedFocusBonus(invested, level, 2, 1, 2),
    },
    focusPowers: [
      {
        slug: "light-matrix",
        name: "Light Matrix",
        minLevel: 1,
        summary:
          "Standard action, 1 focus: create a glowing orb you can move up to 30 ft./round; at 5th level it can make a melee touch attack that blinds the target 1d4 rounds on a failed Fortitude save. Lasts 1 hour/occultist level.",
      },
      {
        slug: "radiance",
        name: "Radiance",
        minLevel: 1,
        summary:
          "Standard action, 1 focus: touch a weapon to make it glow for 1 minute/occultist level; on a critical hit the wielder can end the glow to illuminate the foe (no concealment/invisibility/Stealth benefit, +2 circumstance bonus on attacks against it) for 1d4 rounds.",
      },
      {
        slug: "shape-mastery",
        name: "Shape Mastery",
        minLevel: 1,
        summary:
          "As part of casting an area evocation spell, expend up to your Intelligence modifier in focus to exclude that many squares from the spell's area.",
      },
      {
        slug: "energy-blast",
        name: "Energy Blast",
        minLevel: 5,
        summary:
          "Standard action (provokes), 2 focus: a 20-ft.-radius energy burst at 100 ft. dealing 5d6 damage +1d6 per 2 occultist levels beyond 5th (max 12d6 at 19th); Reflex halves.",
      },
      {
        slug: "energy-ward",
        name: "Energy Ward",
        minLevel: 7,
        summary:
          "Standard action, 1 focus: gain resistance 10 (15 at 13th, 20 at 19th) to one chosen energy type, and creatures that hit you in melee take 1d6 of that energy damage. Lasts 1 round/occultist level.",
      },
      {
        slug: "wall-of-power",
        name: "Wall of Power",
        minLevel: 9,
        summary:
          "Standard action, 1 focus: create a wall of energy up to 5 ft./occultist level long, 10 ft. high, dealing 2d6 + 1/occultist level damage to anything passing through it. Lasts 1 round/occultist level.",
      },
    ],
  },
  {
    tag: "illusion",
    name: "Illusion",
    implements: "Crystal, hat, mask, prism, ring",
    basePower: {
      name: "Minor Figment",
      summary:
        "Standard action, 1 focus: functions as ghost sound or minor image (your choice), lasting a number of rounds equal to your occultist level.",
    },
    resonantPower: {
      name: "Distortion",
      summary:
        "Grants concealment: 5% miss chance for every point of mental focus invested, to a maximum of 5% + 5% for every 2 occultist levels you possess; at 50% you gain the full benefits of invisibility instead of scaling further. This engine has no miss-chance-% stat, so it's shown as a computed preview only, not applied to the sheet.",
      appliesAsChange: false,
      computeBonus: (invested, level) => 5 * cappedFocusBonus(invested, level, 1, 1, 2),
    },
    focusPowers: [
      {
        slug: "cloak-image",
        name: "Cloak Image",
        minLevel: 1,
        summary:
          "Standard action, 1 focus: functions as disguise self for 1 minute/occultist level; at 5th level 2 focus lets you appear as a different creature type of the same size, and at 7th level 1 more focus extends the effect to a willing ally.",
      },
      {
        slug: "color-beam",
        name: "Color Beam",
        minLevel: 1,
        summary:
          "Standard action, 1 focus: a ranged touch beam that blinds (HD ≤ your level) or dazzles (higher HD) a target for 1 round, Will negates; the target is immune for 1 day.",
      },
      {
        slug: "unseen",
        name: "Unseen",
        minLevel: 3,
        summary:
          "Standard action, 1 focus (2 to include a willing adjacent ally): grants invisibility for 1 minute/occultist level; 1 additional focus extends it past an attack if the target stays within 30 ft.",
      },
      {
        slug: "mirage",
        name: "Mirage",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: cloaks up to one 5-ft. cube/occultist level in illusion, functioning as major image; physical interaction grants a Will save to disbelieve.",
      },
      {
        slug: "masquerade",
        name: "Masquerade",
        minLevel: 7,
        summary:
          "Standard action, 1 focus: take on the appearance of a touched creature, gaining a circumstance bonus on Disguise checks equal to occultist level + 10, for 10 minutes/level (renewable for 1 more focus).",
      },
      {
        slug: "shadow-beast",
        name: "Shadow Beast",
        minLevel: 9,
        summary:
          "Standard action, 1 focus: summons shadowy creatures duplicating a summon monster spell (up to level V, scaling with occultist level); they deal only 50% damage to creatures that disbelieve them. Lasts 1 round/occultist level.",
      },
    ],
  },
  {
    tag: "necromancy",
    name: "Necromancy",
    implements: "Bone, coin, doll, drum, robe, skull",
    basePower: {
      name: "Mind Fear",
      summary:
        "Standard action, 1 focus: a target within 30 ft is frightened 1d4 rounds (HD ≤ your occultist level) or shaken 1d4 rounds (HD higher) — Will negates; mind-affecting fear.",
    },
    resonantPower: {
      name: "Necromantic Focus",
      summary:
        "Control 2 additional Hit Dice of undead for every point of mental focus invested in the implement, to a maximum number of Hit Dice equal to 4 × your occultist level. This engine has no undead-control-pool stat, so it's shown as a computed preview only, not applied to the sheet.",
      appliesAsChange: false,
      computeBonus: (invested, level) => Math.min(2 * invested, 4 * level),
    },
    focusPowers: [
      {
        slug: "necromantic-servant",
        name: "Necromantic Servant",
        summary:
          "Standard action, 1 focus: raise a skeleton or zombie that serves you for 10 minutes/occultist level, with half your max HP and bonus damage equal to half your occultist level; gains new abilities at 5th/9th/13th/17th.",
      },
      {
        slug: "soulbound-puppet",
        name: "Soulbound Puppet",
        summary:
          "Full-round action, 1 focus: animate a construct-like familiar/homunculus companion lasting 10 minutes/occultist level; only one puppet active at a time.",
      },
      {
        slug: "spirit-shroud",
        name: "Spirit Shroud",
        minLevel: 3,
        summary:
          "Standard action, 1 focus: grants 1d6 + occultist level temporary hit points for 1 minute/level; at 4th level also grants resistance against death effects and negative energy.",
      },
      {
        slug: "flesh-rot",
        name: "Flesh Rot",
        minLevel: 3,
        summary:
          "Standard action, melee touch, 1 focus: rots a living creature's flesh for 1d8 + occultist level damage, scaling up to 5d8 at 19th level.",
      },
      {
        slug: "psychic-curse",
        name: "Psychic Curse",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: afflict a creature within 30 ft. with one of memory lapse, mental block, or pain confusion, lasting 1 day/occultist level.",
      },
      {
        slug: "pain-wave",
        name: "Pain Wave",
        minLevel: 7,
        summary:
          "Standard action, 1 focus: a 20-ft.-radius burst within 100 ft. sickens living creatures for 1 round/occultist level (Will save reduces to 1 round).",
      },
    ],
  },
  {
    tag: "transmutation",
    name: "Transmutation",
    implements: "Belt, boots, sandals, vest, weapon",
    basePower: {
      name: "Legacy Weapon",
      summary:
        "1 focus: touch a weapon to grant it an enhancement bonus of 1 + 1 for every 6 occultist levels (max +4 at 18th), stacking with the weapon's own enhancement bonus to a maximum total of +5; can imbue a weapon special ability instead of a flat bonus. Lasts 1 minute.",
    },
    resonantPower: {
      name: "Physical Enhancement",
      summary:
        "+2 temporary enhancement bonus to one physical ability score (Strength, Dexterity, or Constitution, your choice) for every 3 points of mental focus invested in the implement, to a maximum of +2 at 1st level plus an additional +2 for every 6 occultist levels you possess.",
      appliesAsChange: true,
      computeBonus: (invested, level) => {
        const units = Math.floor(invested / 3);
        const cap = 2 + 2 * Math.floor(level / 6);
        return Math.max(0, Math.min(2 * units, cap));
      },
    },
    focusPowers: [
      {
        slug: "philosophers-touch",
        name: "Philosopher's Touch",
        summary:
          "Standard action, 1 focus: touch a weapon to let it overcome cold-iron or silver damage reduction for 1 minute/occultist level; touch an additional weapon at 4th level and every 4 levels thereafter for the same cost, and at 11th level the benefit upgrades to overcoming adamantine DR.",
      },
      {
        slug: "size-alteration",
        name: "Size Alteration",
        summary:
          "Standard action, 1 focus: touch a creature to increase or decrease its size by one step (as enlarge person/reduce person, not limited by creature type); a hostile target gets a melee-touch-triggered Fortitude save. Lasts 1 round/occultist level.",
      },
      {
        slug: "sudden-speed",
        name: "Sudden Speed",
        summary:
          "Swift action, 1 focus: increase your land speed by 30 ft. for 1 minute; doesn't stack with itself.",
      },
      {
        slug: "quickness",
        name: "Quickness",
        minLevel: 5,
        summary:
          "Standard action, 1 focus: functions as haste on yourself or a touched willing creature, but the AC/Reflex bonus increases to +2. Lasts 1 round/occultist level.",
      },
      {
        slug: "mind-over-gravity",
        name: "Mind Over Gravity",
        minLevel: 7,
        summary:
          "Standard action, 1 focus: gain a fly speed of 60 ft. with perfect maneuverability for 1 minute/occultist level.",
      },
      {
        slug: "telekinetic-mastery",
        name: "Telekinetic Mastery",
        minLevel: 9,
        summary:
          "Standard action, 1 focus: functions as telekinesis without requiring concentration to maintain (using any of its effects is a standard action). Lasts 1 round/occultist level.",
      },
    ],
  },
];

export const OCCULTIST_SCHOOLS: Record<string, OccultistSchoolDef> = Object.fromEntries(
  SCHOOL_LIST.map((s) => [s.tag, s]),
);

export const OCCULTIST_SCHOOL_TAGS: readonly string[] = SCHOOL_LIST.map((s) => s.tag);

/**
 * Every school's focus power ids that are unconditional/always-applied
 * `Change`s once ANY focus is invested — used by `collect.ts` to iterate
 * only the four modelable resonant powers without a school-tag switch.
 */
export const OCCULTIST_APPLIED_RESONANT_SCHOOLS: readonly string[] = SCHOOL_LIST.filter(
  (s) => s.resonantPower.appliesAsChange,
).map((s) => s.tag);

/** Look up a focus-power menu entry by its `"<schoolTag>:<slug>"` id. */
export function findOccultistFocusPower(
  id: string,
): { school: OccultistSchoolDef; power: OccultistFocusPowerDef } | undefined {
  const [tag, ...rest] = id.split(":");
  const slug = rest.join(":");
  const school = tag ? OCCULTIST_SCHOOLS[tag] : undefined;
  if (!school) return undefined;
  const power = school.focusPowers.find((p) => p.slug === slug);
  if (!power) return undefined;
  return { school, power };
}

/** Physical ability score ids `occultistPhysicalEnhancementAbility` may hold. */
export const OCCULTIST_PHYSICAL_ABILITIES: readonly AbilityId[] = ["str", "dex", "con"];
