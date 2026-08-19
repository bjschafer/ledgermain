/**
 * Clean-room PF1 vigilante talent tables (Ultimate Intrigue): hand-authored
 * from the published rules (verified against aonprd.com's Vigilante Talents
 * listings, "Social" and "Vigilante" categories), mirroring
 * `alchemist-discoveries.ts`'s posture — vigilante talents are NOT part of the
 * vendored Foundry data pack (the Vigilante class def only links the generic
 * "Social Talent"/"Vigilante Talent" stub `ClassFeature`s, no per-talent
 * breakdown — confirmed: `class-features.json` carries no per-talent entries),
 * so there is no upstream JSON to normalize.
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
 * Scope (full vendored-catalog parity): the tables below hand-author all 81
 * vigilante-pool entries and all 46 social-pool entries in
 * `RefData.vigilanteTalents`/`vigilanteSocialTalents` (pulled from Ultimate
 * Intrigue plus later sourcebooks — Antihero's Handbook, Blood of the Beast,
 * Chronicle of Legends, Disciple's Doctrine, Inner Sea Intrigue, People of the
 * Wastes, Spymaster's Handbook), not just Ultimate Intrigue's original lists.
 * The overwhelming majority are prose/prerequisite-gated abilities with no
 * flat number, exactly like `alchemist-discoveries.ts`'s bomb-rider majority —
 * those stay `displayOnly` (empty `changes[]`) with a `contextNotes` reminder
 * carrying the exact number or gating prerequisite. A handful are cross-table
 * "pick from elsewhere" stubs (Rogue Talent, Minor Magic, Major Magic, Magical
 * Familiarity, Racial Paragon) that point at the relevant table via
 * `contextNotes`, mirroring `investigator-talents.ts`'s
 * `alchemistDiscovery`/`rogueTalent` stubs. A few require a subtype this
 * engine doesn't model (the `shapechanger` subtype for Morphic Weaponry and
 * Seamless Shapechanger; specific prerequisite talents for others, e.g. Swamp
 * Concoctions requiring Environmental Weapon) — those get a `contextNotes`
 * reminder instead of enforcement, same soft-filter posture as `minLevel`.
 *
 * Modelling posture (mirrors alchemist-discoveries.ts's honesty bar): a
 * handful of talents here DO carry a flat, unconditional, self-targeting
 * numeric bonus once selected (Shadow's Speed's landSpeed bump, Monkey's
 * Paws's Escape Artist bonus, Rooftop Infiltrator's half-base-speed climb
 * speed grant — sweep) — these get real `changes[]`. Rooftop Infiltrator's
 * grant targets `climbSpeed` (additive, base 0 for a vigilante with no other
 * climb speed source — same shape as `ninja-tricks.ts`'s Wall Climber);
 * Monkey's Paws' OWN "climb speed equal to base speed" clause is deliberately
 * NOT promoted alongside its Escape Artist bonus, even though `climbSpeed` is
 * a live target, because Monkey's Paws requires Rooftop Infiltrator as a
 * prerequisite (a vigilante who has it always has Rooftop Infiltrator's grant
 * active too), and this engine's `climbSpeed` target is purely additive with
 * no "highest wins" resolution (`compute.ts`'s `applySpeedTarget`) — stacking
 * both would silently overstate the climb speed to 1.5x base rather than the
 * RAW-intended flat base speed, so it stays a `contextNotes` reminder instead.
 * Every other "flagged" talent turns out on close reading to be conditional on
 * something this engine doesn't track when the bonus applies (identity state —
 * Renown/Social Grace/Great Renown/Incredible Renown/Owl's Sight/ Loyal
 * Aid/Well-Known Expert/Skill Familiarity are all scoped to "while in
 * vigilante identity" or "in your area of renown", neither of which is modeled
 * — see `build.vigilanteIdentity`'s doc comment), a specific maneuver/attack
 * type rather than a general skill/save (Gator Wrangle, Favored Maneuver,
 * Chase Master's chase subsystem), or a feat/ability grant with no Change
 * target (Combat Expertise, Fist of the Avenger's unarmed damage rider) —
 * these stay `displayOnly: true` with a `contextNotes` reminder carrying the
 * exact number, same discipline as every prior table in this project. A later catalog pass
 * full-parity sweep (the ~65 entries added below the original curated slice)
 * surfaced no additional promotion candidates — every remaining talent's bonus
 * is either a bonus-feat grant (no numeric Change target), a cross-table pick,
 * or conditional on a prerequisite talent/subtype/ability score this engine
 * doesn't enforce.
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
  /** Deliberately prose-only after review — `scripts/mech-coverage.ts` reads this as acknowledged triage rather than flagging the entry. */
  displayOnly?: boolean;
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
    // Every social talent below carries no real Change (RAW's full-parity
    // sweep confirmed each one is honest prose — identity-gated, cross-table,
    // or a bonus this engine has no Change target for), so an entry with an
    // empty changes[] is triage-acknowledged rather than backlog.
    displayOnly: (e.changes?.length ?? 0) === 0,
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
    contextNotes: [
      note(
        "Adds the +20 seamless guise Disguise bonus only while using a vigilante talent in social identity, capped by onlooker count — situational and identity-gated, not a Change target.",
      ),
      identityGatedNote,
    ],
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
    contextNotes: [
      note(
        "+20 circumstance bonus on Disguise checks while in a mundane identity — a third identity state this engine doesn't track, not a Change target.",
      ),
    ],
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
    contextNotes: [
      note(
        "Grants a spell-like ability and a class-skill designation — this table has no class-skill grant route (unlike the mystery/element/order tables compute.ts reads), so add Handle Animal manually.",
      ),
    ],
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
  // --- full-parity sweep ---------------------------------------------
  {
    id: "ancestralEnlightenment",
    name: "Ancestral Enlightenment",
    minLevel: 5,
    summary:
      "Attempt any Knowledge check untrained, and gain a +4 bonus on Knowledge checks you already have ranks in.",
    contextNotes: [
      note(
        "+4 bonus only on Knowledge skills you already have ranks in — no single fixed skill target.",
      ),
    ],
  },
  {
    id: "anyGuise",
    name: "Any Guise",
    minLevel: 17,
    summary:
      "Your everyman disguise can impersonate any specific individual, even a ruler; divinations meant to find that individual find you instead.",
    contextNotes: [note("Requires the Everyman talent.")],
  },
  {
    id: "beastFriend",
    name: "Beast Friend",
    summary: "Cast charm animal once per day as a spell-like ability.",
    contextNotes: [note("Requires the Songbird talent.")],
  },
  {
    id: "beastSpeech",
    name: "Beast Speech",
    summary: "Cast speak with animals once per day as a spell-like ability.",
    contextNotes: [note("Requires the Songbird talent.")],
  },
  {
    id: "celebrityPerks",
    name: "Celebrity Perks",
    minLevel: 5,
    summary:
      "Fans in your area of renown shower you with free meals, lodging, and small gifts, and waive minor taxes and bribes; the perks scale with Great/Incredible Renown.",
    contextNotes: [
      note("Requires the Renown talent; benefits scale further with Great/Incredible Renown."),
      identityGatedNote,
    ],
  },
  {
    id: "companionToTheLonely",
    name: "Companion to the Lonely",
    summary:
      "Once per day, spend an hour with a willing partner to bank a pool of morale points you can spend to reroll a Charisma check or Will save.",
    contextNotes: [
      note(
        "Once per day, banks a morale-point pool equal to the higher of your or your partner's Charisma bonus, spent to reroll a Charisma check or Will save — activation-gated resource pool, not a Change target.",
      ),
    ],
  },
  {
    id: "everyman",
    name: "Everyman",
    minLevel: 11,
    summary:
      "Your mundane guises can impersonate a specific farmer, laborer, or peasant, with bonuses to Disguise and Bluff while playing the part and a chance to fool divinations meant to find that person.",
    contextNotes: [note("Requires the Many Guises talent.")],
  },
  {
    id: "feignInnocence",
    name: "Feign Innocence",
    minLevel: 5,
    summary:
      "Within your area of renown, your social identity is nonmagically shielded, as innocence.",
    contextNotes: [note("Requires the Renown talent."), identityGatedNote],
  },
  {
    id: "guiseOfLife",
    name: "Guise of Life",
    summary:
      "An undead vigilante gains an additional living-appearing identity that reads as alive to Knowledge checks and divinations.",
    contextNotes: [
      note(
        "Requires a corporeal undead creature (or the negative energy affinity racial trait for a humanoid) — not enforced by this engine.",
      ),
    ],
  },
  {
    id: "guiseOfUnlife",
    name: "Guise of Unlife",
    summary:
      "Gain an additional identity that's an undead version of one of your existing identities, reading as undead to Knowledge checks and divinations.",
    contextNotes: [note("Requires a living creature — unavailable to undead vigilantes.")],
  },
  {
    id: "hiddenMagic",
    name: "Hidden Magic",
    minLevel: 5,
    summary:
      "Suppress the magic aura of items you carry (as magic aura); at 11th level, you and your gear can appear entirely nonmagical (as greater magic aura).",
  },
  {
    id: "immediateChange",
    name: "Immediate Change",
    minLevel: 13,
    summary: "Switch identities as a move action, with no extra time needed to adjust appearance.",
    contextNotes: [note("Requires the Quick Change talent.")],
  },
  {
    id: "instantRecognition",
    name: "Instant Recognition",
    minLevel: 13,
    summary: "Transfer your renown benefits to a new community after only 4 hours of effort.",
    contextNotes: [note("Requires both the Incredible Renown and Triumphant Return talents.")],
  },
  {
    id: "inVogue",
    name: "In Vogue",
    minLevel: 5,
    summary:
      "Items you Craft with a Social Grace skill sell for a third more; Profession income from a Social Grace skill doubles.",
    contextNotes: [note("Requires both the Double Time and Social Grace talents.")],
  },
  {
    id: "seamlessShapechanger",
    name: "Seamless Shapechanger",
    summary:
      "Your seamless guise bonus also applies to the Disguise bonus you get from assuming another shape with a polymorph effect.",
    contextNotes: [note("Requires the shapechanger subtype — not enforced by this engine.")],
  },
  {
    id: "subjectiveTruth",
    name: "Subjective Truth",
    minLevel: 9,
    summary:
      "Statements true from your current identity's point of view read as true to lie-detecting magic, and satisfy truth-compelling effects.",
    contextNotes: [note("Requires the Feign Innocence talent.")],
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
    // Same posture as buildSocial's displayOnly derivation: the handful of
    // entries with a real changes[] (Monkey's Paws, Rooftop Infiltrator,
    // Shadow's Sight, Shadow's Speed) are the only ones NOT triaged as prose.
    displayOnly: (e.changes?.length ?? 0) === 0,
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
    contextNotes: [
      note(
        "Waives armor check penalty for 3 specific skills, only in light/medium armor — this engine applies ACP uniformly across skills, with no per-skill waiver target.",
      ),
    ],
  },
  {
    id: "brutalManeuver",
    name: "Brutal Maneuver",
    summary:
      "Take -5 on all attacks this round; a successful combat maneuver also deals your weapon's damage.",
    contextNotes: [
      note(
        "Once-per-round trade of a -5 attack penalty for weapon damage on a successful maneuver — activation-gated, not a Change target.",
      ),
    ],
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
    contextNotes: [
      note(
        "Foe-designated once per round; waives that foe's attack of opportunity and charge AC penalty — not a Change target.",
      ),
    ],
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
        "Requires the Rooftop Infiltrator talent. This talent's own climb-speed clause isn't auto-applied: you already have Rooftop Infiltrator's half-base-speed grant active, and climbSpeed is purely additive here, so a second automatic grant would wrongly stack to 1.5x base speed instead of the flat base speed RAW intends — set your climb speed to full base speed by hand instead.",
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
    changes: [
      { formula: "floor(@attributes.speed.land.total / 2)", target: "climbSpeed", type: "untyped" },
    ],
    contextNotes: [
      note(
        "The 'full speed when climbing a rope' upgrade isn't modeled — only the flat half-base-speed climb speed applies automatically.",
        "climbSpeed",
      ),
    ],
  },
  {
    id: "shadowsSight",
    name: "Shadow's Sight",
    summary:
      "Gain low-light vision and darkvision 60 ft. (or +30 ft. if you already have darkvision).",
    changes: [
      { formula: "60", operator: "set", target: "sensedv", type: "untyped" },
      { formula: "1", operator: "set", target: "sensell", type: "untyped" },
    ],
    contextNotes: [
      note(
        "The flat 60-ft. grant applies (senses resolve highest-wins); the alternative '+30 ft. to darkvision you already have' is not modeled, so a race with darkvision keeps its own range — add the 30 ft. by hand.",
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
      note(
        "Claw attack lines derive automatically (see the PC natural-attack table); the piercing-or-slashing damage-type choice stays at the table.",
      ),
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
  // --- full-parity sweep ----------------------------------------------
  {
    id: "animalPatron",
    name: "Animal Patron",
    minLevel: 5,
    summary: "Gain the benefits of one minor shifter aspect for several minutes per day.",
    contextNotes: [note("Ability grant, not a numeric Change.")],
  },
  {
    id: "aquaticAction",
    name: "Aquatic Action",
    minLevel: 8,
    summary:
      "Fight underwater as though under freedom of movement, and ignore the first 15 ft. of underwater ranged-attack penalties.",
    contextNotes: [note("Underwater-combat-specific — not a Change target.")],
  },
  {
    id: "blindSpot",
    name: "Blind Spot",
    gate: "stalker",
    minLevel: 6,
    summary:
      "Use Stealth to hide from creatures with senses that would normally auto-detect you (blindsense, blindsight, lifesense, scent, tremorsense); each such sense instead grants the creature a large circumstance bonus on Perception checks against you.",
    contextNotes: [
      note("Applies to an opposing creature's Perception, not your own — not a Change target."),
    ],
  },
  {
    id: "concealedStrike",
    name: "Concealed Strike",
    minLevel: 6,
    summary:
      "Attacking with a weapon your target didn't know you had lets you attempt to feint as a move action (a free action with Improved Feint).",
  },
  {
    id: "deceitfulTrick",
    name: "Deceitful Trick",
    summary:
      "Perform a dirty trick maneuver in place of your first attack in a full attack; take a penalty to inflict two conditions at once.",
    contextNotes: [note("Requires the Improved Dirty Trick and Greater Dirty Trick feats.")],
  },
  {
    id: "environmentalWeapon",
    name: "Environmental Weapon",
    summary:
      "Choose a favored-terrain type; in that terrain, find and use an improvised weapon from loose objects with no penalty. Add another terrain at 5th, 10th, 15th, and 20th level.",
  },
  {
    id: "exposeWeaknesses",
    name: "Expose Weaknesses",
    summary:
      "Add reducing a foe's DR or hardness by 10 to the options available on a dirty trick combat maneuver check.",
    contextNotes: [note("Maneuver-specific — not a Change target.")],
  },
  {
    id: "fantasticStride",
    name: "Fantastic Stride",
    minLevel: 6,
    summary:
      "Gain Spring Attack as a bonus feat, ignoring its prerequisites; designate additional creatures whose attacks of opportunity it avoids at 10th level and every 4 levels after.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "foeCollision",
    name: "Foe Collision",
    gate: "stalker",
    minLevel: 3,
    summary:
      "When your hidden strike hits a corporeal foe in melee, also deal that reduced hidden strike damage (as nonlethal bludgeoning) to an adjacent foe.",
    contextNotes: [note("Hidden-strike-specific damage rider — not a Change target.")],
  },
  {
    id: "heavyTraining",
    name: "Heavy Training",
    gate: "avenger",
    summary:
      "Gain Heavy Armor Proficiency as a bonus feat; Armor Skin's benefits extend to heavy armor (full speed in heavy armor at 16th level with Armor Skin).",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "hideInPlainSight",
    name: "Hide in Plain Sight",
    gate: "stalker",
    minLevel: 8,
    summary:
      "Use Stealth to hide even while observed, as long as you're within 10 ft. of dim light.",
  },
  {
    id: "inspiredVigilante",
    name: "Inspired Vigilante",
    summary:
      "Gain an investigator-style inspiration pool (equal to class level) usable only by expending a use, for deduction-style checks.",
    contextNotes: [note("Investigator inspiration pool isn't modeled — apply manually.")],
  },
  {
    id: "instantPlan",
    name: "Instant Plan",
    summary:
      "Once per day, rally nearby allies with a +2 morale bonus vs. fear (and immunity to demoralize) plus a +1 morale bonus on a chosen skill or maneuver check, for several rounds.",
    contextNotes: [
      note("Ally-targeted, once-per-day activation — not an unconditional self Change."),
    ],
  },
  {
    id: "leaveAnOpening",
    name: "Leave an Opening",
    gate: "stalker",
    minLevel: 3,
    summary:
      "A foe damaged by your hidden strike provokes an attack of opportunity from you at the start of its next turn, if you still threaten it.",
    contextNotes: [note("Hidden-strike-specific — not a Change target.")],
  },
  {
    id: "livingShield",
    name: "Living Shield",
    summary:
      "As an immediate action while grappling a foe, attempt to redirect an incoming attack onto the creature you're grappling.",
  },
  {
    id: "magicalFamiliarity",
    name: "Magical Familiarity",
    summary:
      "Cast a chosen 0-level sorcerer/wizard spell as an SLA several times per day; gain a second 0-level spell at 6th and a 1st-level spell at 12th.",
    contextNotes: [
      note("Requires an Intelligence score of at least 10."),
      note("Cross-table spell pick — not cross-referenced against this project's spell data."),
    ],
  },
  {
    id: "majorMagic",
    name: "Major Magic",
    minLevel: 4,
    summary:
      "Cast a 1st-level spell from Minor Magic's chosen list as an SLA, once per day per 4 vigilante levels.",
    contextNotes: [
      note("Requires the Minor Magic talent and a score of at least 11 in the relevant ability."),
      note("Cross-table spell pick — not cross-referenced against this project's spell data."),
    ],
  },
  {
    id: "malleableFlesh",
    name: "Malleable Flesh",
    summary:
      "Gain a physical (not illusory) disguise-self-like ability; halves the Disguise bonus from this ability and from seamless guise. Squeeze through narrow openings at 12th level.",
    contextNotes: [note("Ability grant with a self-penalty rider, not a flat Change.")],
  },
  {
    id: "mightyAmbush",
    name: "Mighty Ambush",
    gate: "stalker",
    minLevel: 10,
    summary:
      "Once per round on a successful hidden strike, knock the foe unconscious for 1d4 rounds unless it saves.",
    contextNotes: [note("Fort save negates; DC per the talent's text — not a Change target.")],
  },
  {
    id: "minorMagic",
    name: "Minor Magic",
    summary:
      "Choose a spellcasting class's list; cast a 0-level spell from it twice per day as an SLA.",
    contextNotes: [
      note("Cross-table spell pick — not cross-referenced against this project's spell data."),
    ],
  },
  {
    id: "mockery",
    name: "Mockery",
    summary:
      "Gain Antagonize as a bonus feat, usable twice per day with the Intimidate option; the effect's duration extends at 12th level.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "morphicWeaponry",
    name: "Morphic Weaponry",
    summary: "Shape your body into weaponry, as the oozemorph shifter's morphic weaponry ability.",
    contextNotes: [note("Requires the shapechanger subtype — not enforced by this engine.")],
  },
  {
    id: "perfectFall",
    name: "Perfect Fall",
    summary:
      "Take no falling damage if a wall or surface is within reach; otherwise take only half damage and land on your feet.",
  },
  {
    id: "perfectVulnerability",
    name: "Perfect Vulnerability",
    minLevel: 8,
    summary:
      "As a standard action, strike a foe's touch AC as though it were denied its Dexterity bonus; the same foe is immune to this from you for 24 hours after.",
  },
  {
    id: "poisoner",
    name: "Poisoner",
    summary:
      "Gain the alchemist's poison use class feature; at 6th level, synthesize an extra dose of a poison you're carrying 5+ doses of, once per day.",
  },
  {
    id: "pullIntoTheShadows",
    name: "Pull into the Shadows",
    summary:
      "As a full-round action, close on an unaware foe, attack, and attempt a bonus drag combat maneuver to reposition it.",
    contextNotes: [note("+4 bonus is maneuver-specific and situational — not a Change target.")],
  },
  {
    id: "racialParagon",
    name: "Racial Paragon",
    summary:
      "As a move action, temporarily gain the benefit of a feat with a racial prerequisite you meet but don't have, several times per day. Repeatable for more simultaneous feats or a faster action.",
    contextNotes: [
      note(
        "Grants temporary access to a racial-prerequisite feat — pick from Feats manually; not cross-referenced against feat prerequisite data.",
      ),
    ],
  },
  {
    id: "returningWeapon",
    name: "Returning Weapon",
    summary:
      "Choose a thrown weapon type; it always returns to your hand as if it had the returning property. At 14th level, ammunition-type choices auto-replenish, or non-ammunition choices can share one weapon's magic across a thrown full attack.",
  },
  {
    id: "rogueTalent",
    name: "Rogue Talent",
    gate: "stalker",
    summary:
      "Gain a rogue talent (not an advanced talent); one that modifies sneak attack applies to hidden strike instead. Repeatable for different talents.",
    contextNotes: [note("Pick a talent from the Rogue Talents table.")],
  },
  {
    id: "shackleSmash",
    name: "Shackle Smash",
    summary:
      "Make no more noise than talking on a sunder combat maneuver or a Strength check to break an object, and ignore half an object's hardness when doing so.",
  },
  {
    id: "shieldOfBlades",
    name: "Shield of Blades",
    summary:
      "Gain Power Attack as a bonus feat (or swap); when you take its penalty on every melee Strength attack this round, gain a shield bonus to AC equal to that penalty until your next turn.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "shieldOfFury",
    name: "Shield of Fury",
    summary:
      "Gain Improved Shield Bash as a bonus feat (or swap); at 6th level, treat yourself as having Two-Weapon Fighting while wielding a shield as a weapon, for qualifying feats.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "signatureArrows",
    name: "Signature Arrows",
    minLevel: 14,
    summary:
      "Choose a bow or crossbow type; after buying 50 pieces of a magic ammunition type for it once, replace it at crafting cost instead of market price. Repeatable for other weapon/ammo combinations.",
  },
  {
    id: "silentDispatch",
    name: "Silent Dispatch",
    summary:
      "Ambushing an unaware foe lets you roll Stealth at a penalty to set the DC for others to hear the fight, instead of the normal battle-noise DC, until the target's first action.",
    contextNotes: [
      note(
        "Sets a Perception DC for others to hear the fight; it doesn't grant you a bonus, so there's no Change target.",
      ),
    ],
  },
  {
    id: "steelSoldier",
    name: "Steel Soldier",
    gate: "avenger",
    summary:
      "Spend time and gold modifying a suit of armor you can conceal and don without aid; Armor Skin's benefits extend to it. At 8th level, the armor's enhancement bonus applies to gauntlet attacks.",
  },
  {
    id: "steelyResolve",
    name: "Steely Resolve",
    summary:
      "A few times per day, delay a failed Will save against a mind-affecting effect for several rounds before it takes hold.",
    contextNotes: [
      note(
        "3/day activation-gated delay (half your level in rounds) on a failed save's onset — not an unconditional Change target.",
      ),
    ],
  },
  {
    id: "swampConcoctions",
    name: "Swamp Concoctions",
    summary:
      "Twice per day, use Environmental Weapon to improvise a short-lived alchemical weapon, with the benefits of Throw Anything for it.",
    contextNotes: [
      note(
        "Requires the Environmental Weapon talent with the jungle, swamp, or water terrain chosen.",
      ),
    ],
  },
  {
    id: "sweepingStrike",
    name: "Sweeping Strike",
    gate: "avenger",
    summary:
      "Gain Cleave as a bonus feat (Great Cleave at 6th), ignoring prerequisites; at 12th level, Great Cleave's extra attack no longer requires hitting the first target.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "teamPlayer",
    name: "Team Player",
    summary:
      "Gain Swift Aid as a bonus feat, ignoring its prerequisites, usable as a standard action against every adjacent ally; at 10th level, aid another as a move action for a bigger bonus.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "throatJab",
    name: "Throat Jab",
    gate: "stalker",
    minLevel: 4,
    summary:
      "Your hidden strike silences the target until your next turn, blocking speech, verbal spells, and calls for help; immune to this from you again for 24 hours.",
    contextNotes: [note("Hidden-strike-specific — not a Change target.")],
  },
  {
    id: "turnabout",
    name: "Turnabout",
    summary:
      "When a foe provokes an attack of opportunity from you by attacking or casting, attempt a dirty trick maneuver instead, with the option to redirect the triggering attack or spell.",
  },
  {
    id: "twistingFear",
    name: "Twisting Fear",
    gate: "stalker",
    minLevel: 3,
    summary:
      "A foe you cause to become shaken, frightened, or panicked takes nonlethal damage equal to your reduced hidden strike damage, once per round.",
    contextNotes: [note("Hidden-strike-specific, variable damage — not a Change target.")],
  },
  {
    id: "unexpectedStrike",
    name: "Unexpected Strike",
    summary: "Gain Quick Draw as a bonus feat; draw hidden weapons as a swift action at 8th level.",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "upCloseAndPersonal",
    name: "Up Close and Personal",
    gate: "stalker",
    minLevel: 4,
    summary:
      "Tumbling through a foe's space with Acrobatics lets you make a swift-action melee attack, applying hidden strike damage as though the foe were unaware (or merely Dex-denied, on a failed check).",
    contextNotes: [note("Hidden-strike-specific, check-conditional — not a Change target.")],
  },
  {
    id: "vitalPunishment",
    name: "Vital Punishment",
    minLevel: 6,
    summary:
      "Gain Vital Strike as a bonus feat, ignoring its prerequisites; apply it once per round to an attack of opportunity you declare as a vital punishment (Improved/Greater Vital Strike too, once gained).",
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "volatileArrows",
    name: "Volatile Arrows",
    summary:
      "Attach an alchemist bomb (using vigilante level as alchemist level) to a bow or crossbow attack, several times per day.",
    contextNotes: [
      note(
        "Repeatable; each repeat past the first also grants an alchemist discovery — pick from the Alchemist Discoveries table.",
      ),
    ],
  },
  {
    id: "vortexSplash",
    name: "Vortex Splash",
    summary:
      "While in rain or waist-deep water, make a full-round whirling attack: a separate dirty trick or feint attempt against each adjacent foe.",
  },
  {
    id: "weaponFamiliarity",
    name: "Weapon Familiarity",
    gate: "avenger",
    summary:
      "Gain proficiency with two chosen simple/martial weapons (or one exotic weapon); gain Weapon Focus with them as a bonus feat at 8th level.",
    contextNotes: [
      note(
        "Grants weapon proficiency plus a bonus feat at 8th level — add the feat to Feats separately.",
        "bonusFeats",
      ),
    ],
  },
  {
    id: "whipOfVengeance",
    name: "Whip of Vengeance",
    summary:
      "Gain Whip Mastery as a bonus feat (or swap); gain Improved Whip Mastery too at 6th level, treating vigilante level as BAB for their prerequisites.",
    contextNotes: [note("Grants bonus feat(s) — add them to Feats separately.", "bonusFeats")],
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
 * `RefData.vigilanteSocialTalents`/`vigilanteTalents` (see those types' doc
 * comments) are the FULL published catalogs (46 social + 81 vigilante entries
 * after junk filtering), prose only. The hand-authored tables above stay
 * authoritative for MECHANICS — this section only merges for
 * BROWSING/resolving, mirroring `rage-powers.ts`'s "vendored catalog overlay"
 * section exactly, for BOTH pools.
 *
 * Collision audit (full-parity sweep): all 46 hand-authored social talents
 * match a vendored entry by normalized name, except `seamlessShapechanger`
 * ("Seamless Shapechanger", the published AoN spelling) — the vendored catalog
 * carries a source typo, key `seemless_shapechanger`/"Seemless Shapechanger",
 * recorded in `VIGILANTE_SOCIAL_TALENT_NAME_ALIASES` below. All 81
 * hand-authored vigilante talents match a vendored entry by normalized name,
 * except `evasion` ("Evasion") — the vendored catalog spells the same talent
 * "Evasive" (key `evasive`, confirmed by matching description text: "gains the
 * evasion ability..."), recorded in `VIGILANTE_TALENT_NAME_ALIASES` below.
 *
 * A vendored-only vigilante-talent entry's `gate` is NOT derived from its
 * `category` (e.g. "Avenger Talents"/"Stalker Talents") — see
 * `VigilanteTalent`'s doc comment — it defaults to `"either"` so the
 * specialization filter never hides a vendored-only option a character might
 * actually qualify for. (The hand-authored table above DOES read `category`
 * to set `gate` for its own entries — "Avenger Talents"/"Stalker Talents"
 * map to `"avenger"`/`"stalker"`, "Hidden Strike Talents" maps to `"stalker"`
 * too since hidden strike is a Stalker-only class feature — but that mapping
 * is a one-time authoring decision, not runtime logic, so it isn't re-derived
 * for vendored-only fallback rows.)
 */

const VIGILANTE_TALENT_NAME_ALIASES: Record<string, string> = {
  evasion: "Evasive",
};

const VIGILANTE_SOCIAL_TALENT_NAME_ALIASES: Record<string, string> = {
  seamlessShapechanger: "Seemless Shapechanger",
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

/** The full picker-browsable social-talent catalog — mirrors `mergedRagePowerCatalog` exactly. */
export function mergedVigilanteSocialTalentCatalog(
  refData: RefData,
): MergedVigilanteSocialTalentEntry[] {
  const handByNormName = new Map<string, VigilanteTalentDef>();
  for (const t of SOCIAL_TALENT_LIST) {
    handByNormName.set(
      normalizeVigilanteTalentName(VIGILANTE_SOCIAL_TALENT_NAME_ALIASES[t.id] ?? t.name),
      t,
    );
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
