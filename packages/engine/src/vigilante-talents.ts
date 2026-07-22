/**
 * Clean-room PF1 vigilante talent tables (Ultimate Intrigue, issue #65):
 * hand-authored from the published rules (verified against aonprd.com's
 * Vigilante Talents listings, "Social" and "Vigilante" categories),
 * mirroring `alchemist-discoveries.ts`'s posture — vigilante talents are NOT
 * part of the vendored Foundry data pack (the Vigilante class def only links
 * the generic "Social Talent"/"Vigilante Talent" stub `ClassFeature`s, no
 * per-talent breakdown — confirmed: `class-features.json` carries no
 * per-talent entries), so there is no upstream JSON to normalize.
 *
 * PF1 RAW grants TWO independent talent pools from two different class
 * features: a Social Talent at 1st level and every 2 levels thereafter
 * (10 by 20th), and a Vigilante Talent at 2nd level and every 2 levels
 * thereafter (10 by 20th) — see `model/vigilanteTalents.ts` for the budget
 * math on each. `VIGILANTE_SOCIAL_TALENTS` and `VIGILANTE_TALENTS` are kept
 * as two separate tables (rather than one `pool`-discriminated list) because
 * their content and specialization-gating shape are different enough that a
 * shared row type would need mostly-unused fields either way.
 *
 * Scope: Ultimate Intrigue's full lists run to ~46 social talents and ~74
 * shared vigilante talents (many gated to Avenger or Stalker, a handful to
 * niche subtypes like Zealot). Typing every RAW nuance for all ~120 entries
 * is out of proportion to this table's value (the overwhelming majority are
 * prose/prerequisite-gated abilities with no flat number, exactly like
 * `alchemist-discoveries.ts`'s bomb-rider majority) — this file covers a
 * curated ~35-entry slice: every talent AoN flags as granting a flat
 * unconditional numeric bonus (so the "extract statics where real" bar in
 * the issue has real material to work with), plus a spread of the most
 * commonly-played/iconic talents for menu completeness. The remaining ~85
 * are OUT OF SCOPE — add them in a follow-up, same posture as
 * `alchemist-discoveries.ts` scoping Ultimate Magic/Ultimate Combat down to a
 * selected slice.
 *
 * Modelling posture (mirrors alchemist-discoveries.ts's honesty bar): a
 * handful of talents here DO carry a flat, unconditional, self-targeting
 * numeric bonus once selected (Shadow's Speed's landSpeed bump, Monkey's
 * Paws's Escape Artist bonus) — these get real `changes[]`. Every other
 * "flagged" talent turns out on close reading to be conditional on
 * something this engine doesn't track when the bonus applies (identity
 * state — Renown/Social Grace/Great Renown/Incredible Renown/Owl's Sight/
 * Loyal Aid/Well-Known Expert/Skill Familiarity are all scoped to "while in
 * vigilante identity" or "in your area of renown", neither of which is
 * modeled — see `build.vigilanteIdentity`'s doc comment), a specific
 * maneuver/attack type rather than a general skill/save (Gator Wrangle,
 * Favored Maneuver, Chase Master's chase subsystem), or a feat/ability grant
 * with no Change target (Combat Expertise, Fist of the Avenger's unarmed
 * damage rider) — these stay `displayOnly: true` with a `contextNotes`
 * reminder carrying the exact number, same discipline as every prior table
 * in this project.
 */

import type {
  Change,
  ContextNote,
  RefData,
  SourceRef,
  VigilanteSocialTalent,
  VigilanteTalent,
} from "@pf1/schema";

export type VigilanteSpecialization = "avenger" | "stalker";
/** Which specialization(s) can pick this talent — "either" for shared-pool talents. */
export type VigilanteTalentGate = VigilanteSpecialization | "either";

export interface VigilanteTalentDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest vigilante level this talent can be selected at. Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the talent (empty unless noted otherwise — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (identity-gating, prerequisite talent, exact numbers not modeled, ...). */
  contextNotes?: ContextNote[];
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const identityGatedNote = note(
  "Only applies while in vigilante identity (unmodeled — see build.vigilanteIdentity's doc comment); apply manually.",
);

interface RawSocialTalent {
  id: string;
  name: string;
  minLevel?: number;
  summary: string;
  changes?: Change[];
  contextNotes?: ContextNote[];
}

function buildSocial(entries: RawSocialTalent[]): VigilanteTalentDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 1,
    changes: e.changes ?? [],
    contextNotes: e.contextNotes,
  }));
}

const SOCIAL_TALENT_LIST: VigilanteTalentDef[] = buildSocial([
  {
    id: "alwaysPrepared",
    name: "Always Prepared",
    summary: "Once per day, retrieve a small stashed item as if you'd planned for the situation.",
  },
  {
    id: "beginnersLuck",
    name: "Beginner's Luck",
    summary: "Add your seamless guise bonus to Disguise checks made while using other talents.",
  },
  {
    id: "bellflowerInnuendo",
    name: "Bellflower Innuendo",
    summary: "Pass secret messages via Bluff without the normal time penalty.",
  },
  {
    id: "caseTheJoint",
    name: "Case the Joint",
    summary: "Scout a location in advance to reroll a related skill check within the next week.",
  },
  {
    id: "celebrityDiscount",
    name: "Celebrity Discount",
    minLevel: 3,
    summary: "Purchase items at 90% of market price within your area of renown.",
    contextNotes: [
      note("Renown-area-scoped price discount — not a Change target."),
      identityGatedNote,
    ],
  },
  {
    id: "conflictedIdentity",
    name: "Conflicted Identity",
    summary:
      "50% chance to be treated as though in your other identity for the purpose of a harmful effect.",
    contextNotes: [note("Situational probability effect — not a Change target.")],
  },
  {
    id: "discreetInquiries",
    name: "Discreet Inquiries",
    summary: "Gather information via Diplomacy with a +4 bonus on the associated Bluff check.",
    contextNotes: [note("Activated, info-gathering-specific — apply manually while gathering.")],
  },
  {
    id: "doubleTime",
    name: "Double Time",
    summary: "Craft/Profession work requires only 6 hours a day instead of 8.",
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur",
    summary: "Use skills other than Perception/UMD to earn a living, as Profession.",
  },
  {
    id: "gossipCollector",
    name: "Gossip Collector",
    summary: "Reduce information-gathering time from 1d4 hours to 1d2 hours.",
  },
  {
    id: "greatRenown",
    name: "Great Renown",
    minLevel: 7,
    summary:
      "Expands your renown's reach; the Intimidate bonus from Renown increases to +6 in vigilante identity.",
    contextNotes: [
      note("+6 circumstance bonus on Intimidate checks while in vigilante identity.", "skill.int"),
      identityGatedNote,
    ],
  },
  {
    id: "incredibleRenown",
    name: "Incredible Renown",
    minLevel: 11,
    summary:
      "Expands renown to major cities; the Intimidate bonus from Renown increases to +8 in vigilante identity.",
    contextNotes: [
      note("+8 circumstance bonus on Intimidate checks while in vigilante identity.", "skill.int"),
      identityGatedNote,
    ],
  },
  {
    id: "intrigueFeats",
    name: "Intrigue Feats",
    summary: "Gain a bonus feat from a specified list of social/intrigue feats.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "kalistocratsAcumen",
    name: "Kalistocrat's Acumen",
    summary:
      "Treat settlements as one size category larger for purchase limits (two at 9th, four at 15th).",
  },
  {
    id: "loyalAid",
    name: "Loyal Aid",
    minLevel: 3,
    summary:
      "Gain a bonus equal to half your vigilante level on Diplomacy to gather info in your area of renown.",
    contextNotes: [
      note("+1/2 vigilante level bonus on Diplomacy, area-of-renown-scoped.", "skill.dip"),
      identityGatedNote,
    ],
  },
  {
    id: "manyGuises",
    name: "Many Guises",
    minLevel: 5,
    summary: "Create mundane (not specific-individual) social identities at will.",
  },
  {
    id: "mockingbird",
    name: "Mockingbird",
    minLevel: 5,
    summary: "Mimic voices and throw your voice, as ghost sound and ventriloquism.",
  },
  {
    id: "morphicMask",
    name: "Morphic Mask",
    summary:
      "Your vigilante identity looks significantly different from your social one; gain +2 per significant physical alteration to seamless guise's Disguise bonus.",
    contextNotes: [
      note("Scales seamless guise's Disguise check bonus, not a class Change target."),
    ],
  },
  {
    id: "notoriousFool",
    name: "Notorious Fool",
    summary: "Bluff onlookers after a failed Stealth/Sleight of Hand check in social identity.",
  },
  {
    id: "obscurity",
    name: "Obscurity",
    summary:
      "In your area of obscurity, no Disguise check is needed to maintain your social identity.",
  },
  {
    id: "owlsSight",
    name: "Owl's Sight",
    summary:
      "Gain low-light vision (or a +4 competence bonus in low-light conditions); +2 competence on Stealth/Sleight of Hand at night.",
    contextNotes: [
      note(
        "+4 competence bonus in low-light conditions; +2 more on Stealth/Sleight of Hand at night — both lighting-conditional, not modeled as a Change.",
      ),
    ],
  },
  {
    id: "quickChange",
    name: "Quick Change",
    minLevel: 7,
    summary: "Switch identities as a full-round action instead of taking 1 minute.",
  },
  {
    id: "renown",
    name: "Renown",
    summary:
      "Become known in your community after a week; NPCs' attitude starts one step better, and you gain a +4 circumstance bonus on Intimidate checks in vigilante identity.",
    contextNotes: [
      note("+4 circumstance bonus on Intimidate checks while in vigilante identity.", "skill.int"),
      identityGatedNote,
    ],
  },
  {
    id: "safeHouse",
    name: "Safe House",
    summary: "Establish a hidden refuge; its protections improve at 7th and 13th level.",
  },
  {
    id: "skillFamiliarity",
    name: "Skill Familiarity",
    minLevel: 9,
    summary:
      "Take 10 on chosen skills even while distracted; gain a bonus equal to 1/4 vigilante level (min +2) on those checks when not distracted.",
    contextNotes: [
      note("+1/4 vigilante level (min +2) bonus, only while not distracted — not a Change target."),
    ],
  },
  {
    id: "socialGrace",
    name: "Social Grace",
    summary:
      "Gain a +4 circumstance bonus on a chosen Int/Wis/Cha-based skill while in social identity; select an additional skill at 5th level and every 4 levels thereafter.",
    contextNotes: [
      note("+4 circumstance bonus on a chosen skill while in social identity.", "skills"),
      identityGatedNote,
    ],
  },
  {
    id: "songbird",
    name: "Songbird",
    summary:
      "Cast animal messenger once per day as a spell-like ability; Handle Animal becomes a class skill.",
  },
  {
    id: "transformationSequence",
    name: "Transformation Sequence",
    summary:
      "Requires spellcasting/SLAs. Identity switching becomes faster and magically flashier.",
  },
  {
    id: "triumphantReturn",
    name: "Triumphant Return",
    minLevel: 3,
    summary: "Regain renown in a previously-visited community in 3 days instead of a week.",
  },
  {
    id: "wellKnownExpert",
    name: "Well-Known Expert",
    summary:
      "Take 10 on aid another for certain skills; gain a bonus equal to half class level on Bluff checks related to your expertise, plus +3 when aiding another in your area of renown.",
    contextNotes: [
      note(
        "+1/2 level Bluff bonus (expertise-scoped) and +3 aid-another bonus (renown-area-scoped) — neither is a Change target.",
      ),
      identityGatedNote,
    ],
  },
]);

export const VIGILANTE_SOCIAL_TALENTS: Record<string, VigilanteTalentDef> = Object.fromEntries(
  SOCIAL_TALENT_LIST.map((t) => [t.id, t]),
);

export const VIGILANTE_SOCIAL_TALENT_IDS: readonly string[] = SOCIAL_TALENT_LIST.map((t) => t.id);

/* ------------------------------------------------------- vigilante talents */

export interface VigilanteTalentEntry extends VigilanteTalentDef {
  gate: VigilanteTalentGate;
}

interface RawVigilanteTalent extends RawSocialTalent {
  gate?: VigilanteTalentGate;
}

function buildTalent(entries: RawVigilanteTalent[]): VigilanteTalentEntry[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 2,
    changes: e.changes ?? [],
    contextNotes: e.contextNotes,
    gate: e.gate ?? "either",
  }));
}

const SPEED_ENH = (formula: string): Change => ({
  formula,
  target: "landSpeed",
  type: "enhancement",
});

const TALENT_LIST: VigilanteTalentEntry[] = buildTalent([
  {
    id: "anotherDay",
    name: "Another Day",
    summary:
      "Automatically stabilize when dropped to negative HP; can feign death (Heal DC 20 + level to detect).",
  },
  {
    id: "armorSkin",
    name: "Armor Skin",
    summary:
      "No armor check penalty on Acrobatics/Escape Artist/Stealth in light or medium armor; full speed in medium armor at 8th level.",
  },
  {
    id: "brutalManeuver",
    name: "Brutal Maneuver",
    summary:
      "Take -5 on all attacks this round; a successful combat maneuver also deals your weapon's damage.",
  },
  {
    id: "chaseMaster",
    name: "Chase Master",
    summary: "Gain a bonus on chase checks equal to half your level or +4, whichever is greater.",
    contextNotes: [note("Chase subsystem isn't modeled — no Change target.")],
  },
  {
    id: "closeTheGap",
    name: "Close the Gap",
    summary:
      "Designate a foe within 20 ft. each round; moving adjacent to it doesn't provoke, and you can charge it ignoring the -2 AC penalty from it.",
  },
  {
    id: "combatExpertise",
    name: "Combat Expertise",
    summary:
      "Gain Combat Expertise as a bonus feat (or swap an existing feat); treat Intelligence as 13 for its prerequisite chains.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "combatSkill",
    name: "Combat Skill",
    gate: "avenger",
    summary:
      "Gain a combat feat as a bonus feat, treating half your vigilante level as fighter levels for its prerequisites.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "cunningFeint",
    name: "Cunning Feint",
    summary:
      "Feint as a move action (or in place of your first attack); at 8th level, a feinted foe is denied its Dex bonus until your next turn.",
  },
  {
    id: "evasion",
    name: "Evasion",
    gate: "stalker",
    summary: "Gain evasion, as the rogue class feature (improved evasion at 12th level).",
    contextNotes: [note("Ability grant, not a numeric Change.")],
  },
  {
    id: "favoredManeuver",
    name: "Favored Maneuver",
    summary:
      "Choose a combat maneuver; gain its Improved feat and a +2 bonus with it against unaware foes. Repeatable for different maneuvers.",
    contextNotes: [
      note(
        "+2 bonus vs. unaware foes, maneuver-specific — not a generic CMB Change target.",
        "cmb",
      ),
    ],
  },
  {
    id: "fistOfTheAvenger",
    name: "Fist of the Avenger",
    gate: "avenger",
    summary:
      "Gain Improved Unarmed Strike; add half your level (min +1, max +5) to damage on unarmed/gauntlet hits.",
    contextNotes: [
      note("Unarmed-strike-specific damage rider — not a general damage Change target."),
    ],
  },
  {
    id: "gatorWrangle",
    name: "Gator Wrangle",
    summary:
      "+8 to CMD against grapple while using a grab ability; halve constrict damage taken; avenger deals extra damage (half level) to a grappling creature.",
    contextNotes: [note("Grab/grapple-specific — not a generic CMD Change target.")],
  },
  {
    id: "leapAndBound",
    name: "Leap and Bound",
    minLevel: 10,
    summary:
      "Add Strength to Acrobatics jump checks; treat all jumps as having a running start; never fall until the end of your turn.",
  },
  {
    id: "lethalGrace",
    name: "Lethal Grace",
    summary:
      "Gain Weapon Finesse as a bonus feat (or swap); while finessing a weapon, add half your level to its damage.",
    contextNotes: [
      note("Finesse-weapon-specific damage rider — not a general damage Change target."),
    ],
  },
  {
    id: "madRush",
    name: "Mad Rush",
    gate: "avenger",
    minLevel: 12,
    summary: "Make a full attack when charging, at a -4 AC penalty until your next turn.",
  },
  {
    id: "monkeysPaws",
    name: "Monkey's Paws",
    minLevel: 5,
    summary:
      "Requires Rooftop Infiltrator. Gain a climb speed equal to your base speed and a +4 competence bonus on Escape Artist checks.",
    changes: [{ formula: "4", target: "skill.esc", type: "competence" }],
    contextNotes: [
      note(
        "Requires the Rooftop Infiltrator talent. Climb-speed grant not modeled — apply manually.",
        "climbSpeed",
      ),
    ],
  },
  {
    id: "nothingCanStopMe",
    name: "Nothing Can Stop Me",
    gate: "avenger",
    summary:
      "Once per round while moving, attack an unattended object in your path as a free action; destroying it lets you keep moving through it.",
  },
  {
    id: "oneWithTheWild",
    name: "One with the Wild",
    summary:
      "Requires Environmental Weapon. In your chosen terrain, gain a +4 competence bonus on Stealth, Survival, and Perception checks.",
    contextNotes: [note("Terrain-conditional — not an unconditional Change target.")],
  },
  {
    id: "rooftopInfiltrator",
    name: "Rooftop Infiltrator",
    summary: "Gain a climb speed equal to half your base speed (full speed when climbing a rope).",
    contextNotes: [note("Climb-speed grant not modeled — apply manually.", "climbSpeed")],
  },
  {
    id: "shadowsSight",
    name: "Shadow's Sight",
    summary:
      "Gain low-light vision and darkvision 60 ft. (or +30 ft. if you already have darkvision).",
    contextNotes: [
      note(
        "Darkvision grant/increase — the engine resolves competing 'set' darkvision changes by lowest-value, which would be wrong for a beneficial grant like this; apply manually rather than risk suppressing a better existing source.",
        "sensedv",
      ),
    ],
  },
  {
    id: "shadowsSpeed",
    name: "Shadow's Speed",
    summary: "Base speed increases by 10 ft. (an additional 10 ft. at 10th level).",
    changes: [SPEED_ENH("if(gte(@classes.vigilante.level, 10), 20, 10)")],
  },
  {
    id: "signatureWeapon",
    name: "Signature Weapon",
    gate: "avenger",
    summary:
      "Choose a weapon; gain Weapon Focus as a bonus feat (or swap). Gain Weapon Specialization with it at 8th level.",
    contextNotes: [note("Grants bonus feat(s) — add them to Feats separately.", "bonusFeats")],
  },
  {
    id: "sniper",
    name: "Sniper",
    gate: "stalker",
    minLevel: 6,
    summary:
      "Deal hidden strike damage with ranged attacks at any distance, not just within 30 ft.",
  },
  {
    id: "stalkerSense",
    name: "Stalker Sense",
    gate: "stalker",
    summary:
      "Always act during a surprise round; gain uncanny dodge at 6th level, improved uncanny dodge at 12th.",
  },
  {
    id: "strikeTheUnseen",
    name: "Strike the Unseen",
    summary:
      "Gain Blind-Fight as a bonus feat; deal hidden strike damage against total concealment. Improved/Greater Blind-Fight at 10th/16th.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "suckerPunch",
    name: "Sucker Punch",
    gate: "avenger",
    summary:
      "A nonlethal attack against an unaware/allied foe deals an extra 1d6 nonlethal damage, increasing by 1d6 at 6th/12th/18th level.",
  },
  {
    id: "sureFooted",
    name: "Sure-Footed",
    summary:
      "Move at full speed while using Stealth or Acrobatics without penalty; at 8th level, full speed across difficult terrain too.",
  },
  {
    id: "surpriseStrike",
    name: "Surprise Strike",
    summary:
      "+1 bonus on attacks against foes denied their Dexterity bonus to AC, increasing to +2 at 8th and +3 at 16th.",
    contextNotes: [
      note(
        "Conditional on the target's Dex-denied state — not an unconditional Change target.",
        "attack",
      ),
    ],
  },
  {
    id: "takeEmAlive",
    name: "Take 'Em Alive",
    summary:
      "No -4 penalty on attacks dealing nonlethal damage; nonlethal-only attacks with no secondary effect gain +1, scaling up by 1 per 3 levels (max +5 at 20th).",
    contextNotes: [note("Nonlethal-attack-specific — not a general damage Change target.")],
  },
  {
    id: "tigersClaws",
    name: "Tiger's Claws",
    summary:
      "Gain claws as natural weapons (1d4 piercing/slashing, 1d3 if Small; 1d6/1d4 at 11th level), extendable at will.",
    contextNotes: [
      note("Natural-attack grant — this engine has no natural-attack builder; add manually."),
    ],
  },
  {
    id: "unkillable",
    name: "Unkillable",
    gate: "avenger",
    summary:
      "Gain Diehard as a bonus feat; further benefits at 6th/12th/18th (act while disabled, survive past HP death briefly, act at negative HP).",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "vigilantesReflexes",
    name: "Vigilante's Reflexes",
    summary:
      "Gain Combat Reflexes as a bonus feat (or swap); gain an additional attack of opportunity per round at 8th and 16th level.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
]);

export const VIGILANTE_TALENTS: Record<string, VigilanteTalentEntry> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const VIGILANTE_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);

/** All shared-pool vigilante talents available to a given specialization ("either" is always included). */
export function vigilanteTalentsForSpecialization(
  spec: VigilanteSpecialization | undefined,
): VigilanteTalentEntry[] {
  return TALENT_LIST.filter((t) => t.gate === "either" || t.gate === spec);
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3b: `RefData.vigilanteSocialTalents`/`vigilanteTalents` (see
 * those types' doc comments) are the FULL published catalogs (46 social + 81
 * vigilante entries after junk filtering), prose only. The hand-authored
 * tables above stay authoritative for MECHANICS — this section only merges
 * for BROWSING/resolving, mirroring `rage-powers.ts`'s "vendored catalog
 * overlay" section exactly, for BOTH pools.
 *
 * Collision audit: all 30 hand-authored social talents matched a vendored
 * entry by normalized name (no aliases needed). Of the 32 hand-authored
 * vigilante talents, 31 matched; the lone exception is `evasion` ("Evasion")
 * — the vendored catalog spells the same talent "Evasive" (key `evasive`,
 * confirmed by matching description text: "gains the evasion ability..."),
 * recorded in `VIGILANTE_TALENT_NAME_ALIASES` below.
 *
 * A vendored-only vigilante-talent entry's `gate` is NOT derived from its
 * `category` (e.g. "Avenger Talents"/"Stalker Talents") — see
 * `VigilanteTalent`'s doc comment — it defaults to `"either"` so the
 * specialization filter never hides a vendored-only option a character might
 * actually qualify for.
 */

const VIGILANTE_TALENT_NAME_ALIASES: Record<string, string> = {
  evasion: "Evasive",
};

function normalizeVigilanteTalentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A social-talent catalog entry the picker can browse — hand-authored def (with vendored prose attached) or a vendored-only display-only row. */
export interface MergedVigilanteSocialTalentEntry extends VigilanteTalentDef {
  nameSuffix?: string;
  category?: string;
  description?: string;
  sources?: SourceRef[];
}

/** A vigilante-talent catalog entry the picker can browse — same shape, plus the specialization `gate`. */
export interface MergedVigilanteTalentEntry extends VigilanteTalentEntry {
  nameSuffix?: string;
  category?: string;
  description?: string;
  sources?: SourceRef[];
}

function vendoredSocialToDef(entry: VigilanteSocialTalent): MergedVigilanteSocialTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    // NOT `entry.level` — uninterpreted source field, see `VigilanteSocialTalent.level`'s doc comment.
    minLevel: 1,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    description: entry.description,
    sources: entry.sources,
  };
}

function vendoredTalentToDef(entry: VigilanteTalent): MergedVigilanteTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    minLevel: 2,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    gate: "either",
    description: entry.description,
    sources: entry.sources,
  };
}

/** Resolve a picked social-talent id (`doc.build.vigilanteSocialTalents` entries) — hand-authored table first, vendored fallback. Mirrors `resolveRagePower`. */
export function resolveVigilanteSocialTalent(
  id: string,
  refData: RefData,
): VigilanteTalentDef | undefined {
  const hand = VIGILANTE_SOCIAL_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.vigilanteSocialTalents?.[id];
  return vendored ? vendoredSocialToDef(vendored) : undefined;
}

/** Resolve a picked vigilante-talent id (`doc.build.vigilanteTalents` entries) — hand-authored table first, vendored fallback. Mirrors `resolveRagePower`. */
export function resolveVigilanteTalent(
  id: string,
  refData: RefData,
): VigilanteTalentEntry | undefined {
  const hand = VIGILANTE_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.vigilanteTalents?.[id];
  return vendored ? vendoredTalentToDef(vendored) : undefined;
}

/** The full picker-browsable social-talent catalog — mirrors `mergedRagePowerCatalog` exactly (no aliases needed for this pool — see file doc comment). */
export function mergedVigilanteSocialTalentCatalog(
  refData: RefData,
): MergedVigilanteSocialTalentEntry[] {
  const handByNormName = new Map<string, VigilanteTalentDef>();
  for (const t of SOCIAL_TALENT_LIST) {
    handByNormName.set(normalizeVigilanteTalentName(t.name), t);
  }

  const vendored = Object.values(refData.vigilanteSocialTalents ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedVigilanteSocialTalentEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeVigilanteTalentName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredSocialToDef(v));
    }
  }
  for (const t of SOCIAL_TALENT_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}

/** The full picker-browsable vigilante-talent catalog — mirrors `mergedRagePowerCatalog` exactly. */
export function mergedVigilanteTalentCatalog(refData: RefData): MergedVigilanteTalentEntry[] {
  const handByNormName = new Map<string, VigilanteTalentEntry>();
  for (const t of TALENT_LIST) {
    handByNormName.set(
      normalizeVigilanteTalentName(VIGILANTE_TALENT_NAME_ALIASES[t.id] ?? t.name),
      t,
    );
  }

  const vendored = Object.values(refData.vigilanteTalents ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedVigilanteTalentEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeVigilanteTalentName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredTalentToDef(v));
    }
  }
  for (const t of TALENT_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}
