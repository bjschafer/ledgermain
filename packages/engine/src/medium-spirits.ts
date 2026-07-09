/**
 * Clean-room PF1 Medium legendary-spirit table (Occult Adventures, issue
 * #65): hand-authored from published rules (aonprd.com's "Medium" class page
 * and "Spirits - Medium" index, cross-checked against d20pfsrd.com's per-
 * spirit pages), NOT from the vendored data pack.
 *
 * Data provenance — audited before authoring, per this project's "audit
 * vendored data first" discipline (`shaman-spirits.ts`/`psychic-
 * disciplines.ts` precedent): unlike shaman spirits or psychic disciplines
 * (individually vendored as standalone `class-abilities` entries, just not
 * linked from their class def), the Medium's 6 legendary spirits (Archmage,
 * Champion, Guardian, Hierophant, Marshal, Trickster) carry NO vendored
 * entries at all in `packages/data-pipeline/data/` — confirmed by direct
 * grep across every `data/*.json` file for each spirit's name; the vendored
 * Medium class links only generic stub features ("Spirit Bonus", "Spirit
 * Surge", "Taboo", "Location Channel", ...) with empty `changes: []` and no
 * spirit-specific breakdown (only the Medium's own ARCHETYPES — Kami Medium,
 * Medium of the Master, Nexian Channeler, ... — appear in
 * `archetype-features.json`, none of which substitute for the base spirit
 * list). So this table is entirely hand-authored, same "no upstream JSON to
 * normalize" shape as `monk-ki-powers.ts`/`rogue-talents.ts`.
 *
 * THE LIVE-CHOICE SHAPE (this is the point of the issue): a medium's spirit
 * is chosen fresh each day via the séance ritual (PF1 RAW, "Séance": "each
 * morning ... a medium can perform a special ritual ... to determine which
 * spirit ... the medium channels for that day") — genuinely daily live
 * state, NOT a permanent build choice like a shaman's Spirit or an oracle's
 * Mystery. Modeled as `live.mediumSpirit` (see that field's schema doc
 * comment for why it's intentionally NOT reset by `restNewDay`, mirroring
 * `live.occultistFocusInvested`'s precedent) plus `live.mediumInfluence`, a
 * genuinely numeric 0-5 counter (see that field's doc comment).
 *
 * SPIRIT BONUS: "When a medium channels a spirit, he gains a bonus on
 * certain checks and to certain statistics, depending on the spirit. A
 * 1st-level medium's spirit bonus is +1; it increases by 1 at 4th level and
 * every 4 levels thereafter" (+1/+2/+3/+4/+5/+6 at 1st/4th/8th/12th/16th/
 * 20th — see {@link mediumSpiritBonus}). No bonus TYPE is named anywhere in
 * the rules text for this ability (unlike a named "morale"/"insight"/...
 * bonus) — modeled as `"untyped"` throughout this table, matching this
 * project's existing convention for unnamed class-defining bonuses (e.g.
 * ability-score-increase `Change`s in `collect.ts`).
 *
 * Which spirits' Spirit Bonus targets are real, unconditional `Change`s vs.
 * situational/unmodeled prose (audited against `targets.ts`'s
 * `APPLIED_TARGETS` — the single source of truth for what `compute()`
 * actually consumes):
 *   - "Concentration checks" (Archmage, Hierophant's "Wisdom checks" via
 *     Ask the Spirits-adjacent prose) and any bare "<ability> checks" (Str/
 *     Int/Wis/Cha) are NOT modeled — `targets.ts` explicitly lists
 *     `concentration` under `UNAPPLIED_TARGET_LABELS` (confirmed by
 *     `traits.ts`'s own Focused Mind trait: "Concentration checks aren't
 *     tracked on the sheet as a discrete number — apply manually"), and
 *     there is no discrete "ability check" stat anywhere in `DerivedSheet`
 *     (same gap `occultist-implements.ts`'s Glorious Presence documents for
 *     its own ability-check half).
 *   - "<Ability>-BASED skill checks" (Archmage's Int-skills, Hierophant's
 *     Wis-skills, Marshal's Cha-skills) ARE modeled — NOT via a fake
 *     `chaSkills`-style group target (confirmed inert: `oracle-curses.ts`
 *     copies a vendored `chaSkills` target verbatim for Wasting curse, but
 *     `compute.ts` never special-cases it, so it silently contributes
 *     nothing — a known upstream-data gap this table deliberately does NOT
 *     repeat), but the same pattern `collect.ts`'s occultist Enchantment
 *     block already uses: loop `SKILL_ABILITY` for the matching ability and
 *     push one real `skill.<id>` `Change` per skill (see
 *     `spiritBonusTargets`'s `abilitySkills` variant, wired in `collect.ts`).
 *   - "Skill checks" with no ability qualifier (Trickster) maps directly to
 *     the engine's own global `"skills"` target (confirmed applied,
 *     `computeSkills`'s `globalSkillMods`).
 *   - Flat named stats (Champion's attack/non-spell-damage/Fortitude,
 *     Guardian's AC/Fortitude/Reflex, Trickster's Reflex) map directly to
 *     `attack`/`damage`/`fort`/`ref`/`ac` — all confirmed real targets.
 *   - Marshal's "spirit surge rolls" bonus has no modeled target (spirit
 *     surge itself — rolling 1d6/1d8/1d10 onto a failed check at the cost of
 *     1 influence — is an at-the-table die roll this app doesn't simulate,
 *     same posture as not tracking individual attack rolls) — prose only.
 *
 * SÉANCE BOON: a 24-hour benefit active while that spirit is channeled (PF1
 * RAW, "Séance Boon"). Only Champion's (+2 non-spell damage — same `damage`
 * target as its Spirit Bonus, a second additive `untyped` source) and
 * Guardian's (+1 CMD) are flat, unconditional, no-further-choice numbers;
 * see each `seanceBoonChange` — `undefined` elsewhere means the boon is
 * prose-only (Archmage/Hierophant boost OTHER creatures' spell/healing
 * output, which this engine doesn't compute as a stat; Marshal's boon is a
 * meta-choice of which OTHER boon to borrow; Trickster's boon needs a
 * player-chosen skill this table doesn't carry a sub-picker for — same
 * "documented gap, not silently dropped" posture as `occultist-
 * implements.ts`'s ability-check half).
 *
 * INFLUENCE PENALTY: each spirit's own "when influence is 3 or more, you
 * suffer this specific penalty" clause (PF1 RAW, "Legendary Spirit" —
 * "Whenever a medium's current amount of influence reaches 3 or more, he
 * takes a penalty based on the spirit he is currently channeling"). Soft,
 * prose-only — surfaced by the tracker panel as a warning banner once
 * `live.mediumInfluence >= 3`, never auto-applied as a `Change` (several
 * reference unmodeled stats like Constitution/Wisdom checks; the few that
 * DO reference modeled stats, e.g. Guardian's damage penalty, are still
 * conditional on the "always fights/casts defensively" behavioral
 * restriction this app can't adjudicate) — matches the task's explicit
 * "soft, not hard-modeled" instruction.
 *
 * TABOO: PF1 RAW's 2nd-level "Taboo" class feature (accept a spirit-specific
 * personal restriction each séance; keeping it all day waives spirit
 * surge's influence cost for the first 2 uses, breaking it costs 1 influence
 * plus a 1-hour -2 penalty on attack/damage/ability/skill/save rolls) is
 * OUT OF SCOPE for live tracking. Unlike a genuine per-day resource pool
 * (which this app does track, e.g. `deriveResourcePools`), Taboo grants no
 * discrete countable pool beyond a fixed, non-scaling "twice, free" — closer
 * to a roleplay reminder than a resource, and not one of the fields this
 * task called for. `taboos` below is flavor-only example text for the panel,
 * not a tracked toggle.
 *
 * SPIRIT POWERS: exactly ONE named power per tier per spirit (lesser 1st,
 * intermediate 6th, greater 11th, supreme 17th — confirmed against
 * d20pfsrd's per-spirit pages and pathfinder.d20srd.org's class table; NOT
 * a "choose 1 of 2" menu — every source lists a single fixed power per
 * tier). Every power is either an activated ability spending an influence
 * point, a passive substitution (e.g. swapping which spell list a "spirit
 * magic"-shaped ability draws from), or a narrow situational trigger — none
 * has a flat always-on numeric effect this engine's `Change` pipeline could
 * safely apply unconditionally, so (same honesty bar as `psychic-
 * disciplines.ts`'s Discipline Powers) every power here is granted as a
 * note-tier `GrantedFeature` (`archetypes.ts`, `origin.kind: "spiritPower"`)
 * with a summary only, gated on medium level AND the currently channeled
 * spirit (`live.mediumSpirit`) — auto-granted, not a further budgeted pick,
 * same "automatic once you qualify" shape as a discipline power.
 */

import type { AbilityId } from "@pf1/schema";

/** The 4 level gates at which a medium's Spirit Power tier unlocks (PF1 RAW). */
export const MEDIUM_SPIRIT_POWER_LEVELS = {
  lesser: 1,
  intermediate: 6,
  greater: 11,
  supreme: 17,
} as const;

export type MediumSpiritPowerTier = keyof typeof MEDIUM_SPIRIT_POWER_LEVELS;

export interface MediumSpiritPower {
  tier: MediumSpiritPowerTier;
  /** Medium level this power is gained — mirrors `MEDIUM_SPIRIT_POWER_LEVELS[tier]`. */
  level: number;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
}

/** One real, unconditional `Change` target the flat Spirit Bonus applies to. */
export interface MediumSpiritBonusFlatTarget {
  kind: "flat";
  /** A confirmed-applied `Change` target (see `targets.ts` `APPLIED_TARGETS`). */
  target: string;
}

/**
 * Every skill keyed to `ability` (via `SKILL_ABILITY`) gets the flat Spirit
 * Bonus as its own `skill.<id>` `Change` — how `collect.ts` expresses an
 * "<Ability>-based skill checks" bonus, since no group target like
 * `chaSkills` is actually consumed by `compute.ts` (see file doc comment).
 */
export interface MediumSpiritBonusAbilitySkillsTarget {
  kind: "abilitySkills";
  ability: AbilityId;
}

export type MediumSpiritBonusTarget =
  | MediumSpiritBonusFlatTarget
  | MediumSpiritBonusAbilitySkillsTarget;

export interface MediumSpiritDef {
  /** Matches `live.mediumSpirit` values. */
  tag: string;
  name: string;
  /**
   * Full prose of what the Spirit Bonus applies to (including the
   * unmodeled parts — ability checks, concentration, spirit surge rolls;
   * see file doc comment) — shown verbatim in the tracker panel.
   */
  spiritBonusSummary: string;
  /** Real `Change` targets the flat, level-scaling Spirit Bonus is wired to (may be empty). */
  spiritBonusTargets: readonly MediumSpiritBonusTarget[];
  /** Full prose of the Séance Boon (24h benefit while this spirit is channeled). */
  seanceBoonSummary: string;
  /** Flat, unconditional `Change` for the boon, when one exists (see file doc comment). */
  seanceBoonChange?: { target: string; value: number };
  /** Full prose of the 3+ influence penalty (soft — shown as a panel warning, never auto-applied). */
  influencePenaltySummary: string;
  /** Where this spirit is more easily contacted (flavor text). */
  favoredLocations: string;
  /** Example taboos a medium channeling this spirit might accept (flavor text — see file doc comment). */
  taboos: string;
  /** Exactly 4 entries, one per tier. */
  powers: readonly MediumSpiritPower[];
}

/** `1 + floor(mediumLevel / 4)`, PF1 RAW's Spirit Bonus progression; 0 below level 1. */
export function mediumSpiritBonus(mediumLevel: number): number {
  if (mediumLevel < 1) return 0;
  return 1 + Math.floor(mediumLevel / 4);
}

function flat(target: string): MediumSpiritBonusFlatTarget {
  return { kind: "flat", target };
}

function abilitySkills(ability: AbilityId): MediumSpiritBonusAbilitySkillsTarget {
  return { kind: "abilitySkills", ability };
}

const SPIRIT_LIST: MediumSpiritDef[] = [
  {
    tag: "archmage",
    name: "Archmage",
    spiritBonusSummary:
      "Applies to concentration checks, Intelligence checks, and Intelligence-based skill checks. Concentration checks and bare Intelligence checks aren't tracked on this sheet — apply the bonus manually for those; Intelligence-based skills (Appraise, Craft, Knowledge, Linguistics, Spellcraft) are applied automatically below.",
    spiritBonusTargets: [abilitySkills("int")],
    seanceBoonSummary:
      "Damaging spells you cast deal an additional 2 points of damage of the spell's own type to each target. Spell damage isn't computed on this sheet — apply manually.",
    influencePenaltySummary:
      "At 3+ influence: the Spirit Bonus becomes a PENALTY on Strength checks/skills, Constitution checks, attack rolls, and non-spell damage rolls instead.",
    favoredLocations: "Arcane redoubts, areas of unusual magic, libraries, schools",
    taboos:
      "Example: refuse to use or benefit from divine magic; never pass up a real chance to learn something (DC 20+ Knowledge check); always prefer a magical solution over a mundane one.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Archmage's Arcana",
        summary:
          "Each séance, add one arcane (sorcerer/wizard) spell of every level you can cast (including 0-level) to your known spells until the connection ends; cast them as arcane spells (verbal/somatic components).",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Arcane Surge",
        summary:
          "Spend 1 influence to cast a medium spell you know without expending a spell slot, at +1 caster level and +1 to its save DC (no metamagic).",
      },
      {
        tier: "greater",
        level: 11,
        name: "Wild Arcana",
        summary:
          "Spend 1 influence to cast any sorcerer/wizard spell of a level you can cast, using one of your own spell slots (no metamagic).",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Archmage",
        summary:
          "Once per day, cast any sorcerer/wizard spell of any level with no spell slot, no influence cost, and no metamagic restriction.",
      },
    ],
  },
  {
    tag: "champion",
    name: "Champion",
    spiritBonusSummary:
      "Applies to attack rolls, non-spell damage rolls, Strength checks, Strength-based skill checks, and Fortitude saves. Strength checks/skills aren't tracked on this sheet — apply manually.",
    spiritBonusTargets: [flat("attack"), flat("damage"), flat("fort")],
    seanceBoonSummary: "+2 bonus on all non-spell damage rolls.",
    seanceBoonChange: { target: "damage", value: 2 },
    influencePenaltySummary:
      "At 3+ influence: the Spirit Bonus becomes a penalty on Intelligence checks/skills, and your effective caster level drops by the bonus's value (minimum 0, no caster-level-boosting benefits while reduced).",
    favoredLocations: "Arenas, battlefields, places of violence, practice yards",
    taboos:
      "Example: refuse to use or benefit from arcane magic; fight only with one chosen manufactured weapon; never refuse a legitimate challenge to combat.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Champion's Prowess",
        summary:
          "Gain proficiency with all martial weapons plus one exotic weapon of your choice; may reselect the exotic weapon at each séance.",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Sudden Attack",
        summary:
          "When making a full attack, gain one extra attack at your highest base attack bonus. Stacks with haste; doesn't stack with flurry of blows or spell combat.",
      },
      {
        tier: "greater",
        level: 11,
        name: "Fleet Charge",
        summary:
          "As a swift or full-round action, move up to your speed and then make a full attack.",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Champion",
        summary:
          "Gain 2 combat feats (reselectable each séance); treat your medium level as your base attack bonus for those feats' prerequisites and effects, and count as having a full base attack bonus progression for qualifying for them.",
      },
    ],
  },
  {
    tag: "guardian",
    name: "Guardian",
    spiritBonusSummary:
      "Applies to AC, Constitution checks, Fortitude saves, and Reflex saves. Constitution checks aren't tracked on this sheet — apply manually.",
    spiritBonusTargets: [flat("ac"), flat("fort"), flat("ref")],
    seanceBoonSummary: "+1 bonus to Combat Maneuver Defense (CMD).",
    seanceBoonChange: { target: "cmd", value: 1 },
    influencePenaltySummary:
      "At 3+ influence: you must always fight and cast defensively, and take a penalty equal to the bonus's value on all damage rolls.",
    favoredLocations: "City walls, forts, gates, keeps",
    taboos:
      "Example: protect others whenever able (breaks if you drop below half your max hp while an ally you could protect is endangered); never speak or use sonic effects; breaks if you become enraged, frightened, or panicked.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Guardian's Shield",
        summary: "Gain proficiency with heavy armor and all shields, including tower shields.",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Absorb Blow",
        summary:
          "Gain damage reduction and energy resistance (acid, cold, electricity, fire, and sonic) equal to half your medium level; add paladin's sacrifice to your known spells as a 2nd-level spell.",
      },
      {
        tier: "greater",
        level: 11,
        name: "Sudden Block",
        summary:
          "As a reaction to an incoming attack against you or an adjacent ally, spend a spirit surge and add the result to the target's AC; if this causes the attack to miss, you may immediately make one attack at your highest base attack bonus against the attacker.",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Guardian",
        summary:
          "Once per day as an immediate action, completely negate the effects of a single attack or targeted spell against you (others within its area or effect are still affected normally).",
      },
    ],
  },
  {
    tag: "hierophant",
    name: "Hierophant",
    spiritBonusSummary:
      "Applies to Wisdom checks, Wisdom-based skill checks, and Will saves. Wisdom checks aren't tracked on this sheet — apply manually; Wisdom-based skills (Heal, Perception, Profession, Sense Motive, Survival) are applied automatically below.",
    spiritBonusTargets: [flat("will"), abilitySkills("wis")],
    seanceBoonSummary:
      "Your healing spells and abilities restore an additional 2 hit points to each target (not healing from magic items or fast healing). Healing amounts aren't summed on this sheet — apply manually.",
    influencePenaltySummary:
      "At 3+ influence: you must deal nonlethal damage whenever possible, and take a penalty equal to the bonus's value on Charisma checks/skills against anyone who doesn't share your faith (except attempts to convert them).",
    favoredLocations: "Altars, churches, sacred groves, shrines",
    taboos:
      "Example: never wear metal armor or carry a metal shield; follow a code of conduct matching the spirit's faith (as a paladin or antipaladin); never speak an outright lie, or knowingly withhold the truth when directly asked.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Divine Surge",
        summary:
          "Each séance, add one divine (cleric/oracle) spell of every level you can cast (including 0-level) to your known spells until the connection ends; requires a divine focus if the spell normally does.",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Energy Font",
        summary:
          "Channel positive or negative energy (matching the spirit's faith) 1 + Charisma modifier times per day, as a cleric of your medium level; add the matching cure/inflict spells to your known spells.",
      },
      {
        tier: "greater",
        level: 11,
        name: "Overflowing Grace",
        summary:
          "Healing a creature to full hit points (or one already at full) grants it a +1 sacred or profane bonus on attack rolls, skill checks, ability checks, and saves for 1 round; destroying undead (or killing a creature) via channel energy grants you the same bonus.",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Hierophant",
        summary:
          "Once per day, request a minor miracle from your deity or patron (limited to the non-diamond-cost options of the miracle spell) — whether it's granted is the GM's call.",
      },
    ],
  },
  {
    tag: "marshal",
    name: "Marshal",
    spiritBonusSummary:
      "Applies to Charisma checks, Charisma-based skill checks, and spirit surge rolls. Charisma checks and spirit surge rolls aren't tracked on this sheet — apply manually; Charisma-based skills (Bluff, Diplomacy, Disguise, Handle Animal, Intimidate, Perform, Use Magic Device) are applied automatically below.",
    spiritBonusTargets: [abilitySkills("cha")],
    seanceBoonSummary:
      "Choose a Séance Boon from any of the other five legends instead of your own; each participant in a shared séance may choose a different boon.",
    influencePenaltySummary:
      "At 3+ influence: the Spirit Bonus becomes a penalty on Wisdom checks/skills, and you lose the Spirit Bonus and Séance Boon entirely whenever you aren't nominally in charge of the allies present.",
    favoredLocations: "Council rooms, stages, theaters, throne rooms",
    taboos:
      "Example: never let a fleeing (not regrouping) enemy escape without pursuit; never abandon or sacrifice an ally, including summoned creatures; always seize a genuine chance to spread your (or an ally's) legend.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Marshal's Order",
        summary:
          "Apply your spirit surge to an attack roll, saving throw, ability check, concentration check, or skill check made by an ally within 30 ft. who participated in your séance and who you can see and effect, instead of your own roll (still limited to one surge per round).",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Inspiring Call",
        summary:
          "As a standard action, grant every ally who can see or hear you a competence bonus equal to your Spirit Bonus on saving throws, OR on attack and damage rolls (your choice), for 1 round.",
      },
      {
        tier: "greater",
        level: 11,
        name: "Decisive Strike",
        summary:
          "Spend 1 influence as a swift action to let an ally within 30 ft. who can see or hear you immediately make one melee or ranged attack during your turn; alternatively, spend it as a standard action to grant that ally any standard action instead.",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Marshal",
        summary:
          "Use a lesser spirit surge (capped at 1d6, no Spirit Bonus added) without spending influence; still counts toward the once-per-round spirit surge limit, but doesn't consume Taboo's free uses.",
      },
    ],
  },
  {
    tag: "trickster",
    name: "Trickster",
    spiritBonusSummary:
      "Applies to Dexterity checks, all skill checks, and Reflex saves. Dexterity checks aren't tracked on this sheet — apply manually; the skill-check bonus (applied to every skill, not just Dex-based ones) is applied automatically below.",
    spiritBonusTargets: [flat("ref"), flat("skills")],
    seanceBoonSummary:
      "Choose one skill: gain a +1 bonus on it, and it becomes a class skill for you if it wasn't already. Which skill was chosen isn't tracked on this sheet — apply manually.",
    influencePenaltySummary:
      "At 3+ influence: you no longer count as an ally for the purposes of others' abilities or as a willing target for spells, touch spells targeting you require a melee touch attack roll (harmless spells skip their save), and you gain no benefit when someone aids another on your behalf.",
    favoredLocations: "Alleys, mazes, taverns, trap-filled locations",
    taboos:
      "Example: your true identity must stay hidden — breaks the instant anyone (even an ally) sees through a disguise; you can never speak the truth; you must always take the more lucrative of two offers, even if it means switching sides.",
    powers: [
      {
        tier: "lesser",
        level: 1,
        name: "Trickster's Edge",
        summary:
          "Choose 2 skills: both become class skills for you, and you're treated as having a number of bonus ranks in each equal to your medium level (never exceeding your character level).",
      },
      {
        tier: "intermediate",
        level: 6,
        name: "Surprise Strike",
        summary:
          "Deal an extra 1d6 precision damage per 3 medium levels against a target denied its Dexterity bonus to AC. Once per day, your first attack against a foe automatically treats it as flat-footed (even against uncanny dodge); that foe is then immune to this effect for 24 hours.",
      },
      {
        tier: "greater",
        level: 11,
        name: "Transfer Magic",
        summary:
          "Spend 1 influence for a melee touch attack that steals a random harmless, currently-ongoing beneficial spell from the target (ending it early for them; you gain its remaining duration). Doesn't work on personal-range, instantaneous, or permanent effects.",
      },
      {
        tier: "supreme",
        level: 17,
        name: "Legendary Trickster",
        summary:
          "Once per day, take a 20 on a skill check instead of rolling. Also gain the ability to change your shape at will, as if under a constant greater polymorph effect limited to mimicking a specific individual's form.",
      },
    ],
  },
];

export const MEDIUM_SPIRITS: Record<string, MediumSpiritDef> = Object.fromEntries(
  SPIRIT_LIST.map((s) => [s.tag, s]),
);

export const MEDIUM_SPIRIT_TAGS: readonly string[] = SPIRIT_LIST.map((s) => s.tag);
