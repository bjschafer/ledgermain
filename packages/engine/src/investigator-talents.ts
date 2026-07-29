/**
 * Clean-room PF1 investigator talent table (Advanced Class Guide, issue #65
 * / #13's investigator-audit follow-up; full vendored-catalog parity added
 * per issue #74): hand-authored from the published rules (verified against
 * aonprd.com's Investigator Talents listing, cross-checked against
 * d20pfsrd.com's mirror of the Paizo text where a name needed disambiguating
 * — see the "Iconoclastic Strike" alias note below), mirroring
 * `alchemist-discoveries.ts`'s posture — investigator talents are NOT part
 * of the vendored Foundry data pack (the Investigator class def only links
 * the generic "Investigator Talent" stub `ClassFeature`, no per-talent
 * breakdown — confirmed: `class-features.json` carries no per-talent
 * entries), so there is no upstream JSON to normalize for MECHANICS;
 * `investigator-talents.json` (a separate pipeline slice,
 * `RefData.investigatorTalents`) carries prose only and backs the vendored
 * catalog overlay at the bottom of this file.
 *
 * Scope: FULL vendored parity as of issue #74 — all 67 published
 * investigator talents (Advanced Class Guide's original 28 plus every
 * later-splatbook addition the pinned data carries: Advanced Class Origins,
 * Inner Sea Intrigue, Magic Tactics Toolbox, Disciple's Doctrine, Potions &
 * Poisons, Elemental Master's Handbook, Blood of the Beast, Spymaster's
 * Handbook, Adventurer's Guide). A handful of "meta" talents that hand off
 * to an entirely different table this project already has (Alchemist
 * Discovery, Rogue Talent) are included as stub entries pointing at those
 * tables via `contextNotes` rather than expanded inline — same posture as
 * `oracleRevelations.ts`'s "Bonded Mount" pointing at the Animal Companion
 * section.
 *
 * Budget (PF1 Advanced Class Guide, verified against the class table): an
 * investigator gains a talent at 3rd level and every 2 levels thereafter
 * (3rd, 5th, 7th, ..., 19th — 9 total by 20th; see `model/investigatorTalents.ts`
 * for the budget math). `minLevel` below is the talent's OWN stated minimum
 * (several — the Studied Strike-tagged talents especially — require a higher
 * investigator level than the 3rd-level talent floor); soft-filtered only
 * (never blocks selection), same convention as `magus-arcana.ts`.
 *
 * Modelling posture (mirrors alchemist-discoveries.ts's honesty bar): every
 * talent here either expends/modifies the Inspiration pool, rides Studied
 * Combat/Studied Strike (both already covered as detail-line context via
 * `tables.ts` `studiedCombatBonus`/`studiedStrikeDice`, wired in
 * `archetypes.ts`), or grants a situational/activated ability with no flat
 * always-on number this engine's Change system can safely target. So EVERY
 * entry here is `displayOnly: true` with `changes: []`; a `contextNotes`
 * reminder carries the mechanic's numbers/prerequisite instead.
 */

import type { Change, ContextNote, InvestigatorTalent, RefData, SourceRef } from "@pf1/schema";

export type InvestigatorTalentCategory = "studiedStrike" | "other";

export interface InvestigatorTalentDef {
  id: string;
  name: string;
  category: InvestigatorTalentCategory;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest investigator level this talent can be selected at. Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the talent (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (nested pick, prerequisite talent, pointer to another tracked table, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no talent has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTalent {
  id: string;
  name: string;
  category?: InvestigatorTalentCategory;
  minLevel?: number;
  summary: string;
  contextNotes?: ContextNote[];
}

function build(entries: RawTalent[]): InvestigatorTalentDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category ?? "other",
    summary: e.summary,
    minLevel: e.minLevel ?? 3,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const TALENT_LIST: InvestigatorTalentDef[] = build([
  // --- Studied Combat / Studied Strike talents (require Studied Strike, 4th) --
  {
    id: "sappingOffensive",
    name: "Sapping Offensive",
    category: "studiedStrike",
    minLevel: 5,
    summary: "A studied strike also denies the target attacks of opportunity for 1 round.",
  },
  {
    id: "sickeningOffensive",
    name: "Sickening Offensive",
    category: "studiedStrike",
    minLevel: 7,
    summary: "A studied strike also sickens the target for 1 round.",
  },
  {
    id: "topplingStrike",
    name: "Toppling Strike",
    category: "studiedStrike",
    minLevel: 9,
    summary: "A studied strike lets you attempt a free trip combat maneuver, no AoO provoked.",
  },
  {
    id: "repositioningStrike",
    name: "Repositioning Strike",
    category: "studiedStrike",
    minLevel: 13,
    summary:
      "A studied strike lets you attempt a free reposition combat maneuver, no AoO provoked.",
  },
  {
    id: "deafeningStrike",
    name: "Deafening Strike",
    category: "studiedStrike",
    minLevel: 15,
    summary: "A studied strike forces a Fortitude save or the target is permanently deafened.",
    contextNotes: [note("Fort negates (reduces to 1 round deafened); DC per the talent's text.")],
  },
  {
    id: "blindingStrike",
    name: "Blinding Strike",
    category: "studiedStrike",
    minLevel: 17,
    summary:
      "A studied strike forces a Fortitude save or the target is permanently blinded (dazzled 1d4 rounds on a success).",
    contextNotes: [note("Fort negates (reduces to dazzled); DC per the talent's text.")],
  },
  {
    id: "confusingStrike",
    name: "Confusing Strike",
    category: "studiedStrike",
    minLevel: 19,
    summary:
      "A studied strike forces a Will save or the target is confused for 1d4+1 rounds (1 round on a success). No effect on mindless/construct/ooze/plant/undead/incorporeal targets.",
    contextNotes: [note("Will negates (reduces duration); DC per the talent's text.")],
  },
  // ---- splatbook additions (issue #74; full vendored parity) ----
  {
    id: "timedStrike",
    name: "Timed Strike",
    category: "studiedStrike",
    summary:
      "A studied strike deals extra damage equal to the number of consecutive rounds you studied the target with studied combat.",
  },
  {
    id: "twilightTalonImprovisation",
    name: "Twilight Talon Improvisation",
    category: "studiedStrike",
    summary:
      "When a studied strike lands with an improvised weapon, perform a free dirty trick combat maneuver against that foe (provokes attacks of opportunity as normal).",
  },
  {
    id: "dominoEffect",
    name: "Domino Effect",
    category: "studiedStrike",
    minLevel: 5,
    summary:
      "When a studied strike damages a foe, apply studied combat to an adjacent foe as a free action.",
  },
  {
    id: "numericalStrike",
    name: "Numerical Strike",
    category: "studiedStrike",
    minLevel: 5,
    summary:
      "Once per day when a studied strike confirms a critical hit, deal average damage instead of rolling (both the base hit and the studied strike dice), no action required; expend a use of inspiration to use this a second time per day.",
  },
  {
    id: "slowingStrike",
    name: "Slowing Strike",
    category: "studiedStrike",
    minLevel: 7,
    summary:
      "A studied strike forces a Fortitude save or reduces every one of the target's speeds by 5 ft. (minimum 5 ft.) until healed of any hit point damage or with a DC 15 Heal check; multiple uses stack down to the 5-ft. floor.",
    contextNotes: [note("Fort negates; DC = 10 + 1/2 investigator level + Int mod.")],
  },
  {
    id: "greaterNumericalStrike",
    name: "Greater Numerical Strike",
    category: "studiedStrike",
    minLevel: 13,
    summary:
      "Once per day when a studied strike confirms a critical hit, deal maximum damage instead of rolling (both the base hit and the studied strike dice), no action required; expend a use of inspiration to use this a second time per day.",
    contextNotes: [note("Requires the Numerical Strike talent.")],
  },
  {
    id: "iconoclasticStrike",
    name: "Iconoclastic Strike",
    category: "studiedStrike",
    minLevel: 13,
    summary:
      "When a studied strike damages a foe, perform a free sunder against it; sundering a holy symbol or divine scroll this way provokes no attack of opportunity and deals maximum damage on a hit.",
  },
  {
    id: "prolongedStudy",
    name: "Prolonged Study",
    category: "studiedStrike",
    minLevel: 13,
    summary:
      "Studied combat's effect lasts twice your Intelligence modifier in rounds (minimum 2), or until you land a studied strike, whichever comes first — instead of ending immediately.",
  },
  {
    id: "stealingStrike",
    name: "Stealing Strike",
    category: "studiedStrike",
    minLevel: 13,
    summary:
      "When a studied strike damages a foe, perform a free steal combat maneuver against it; this steal provokes no attack of opportunity.",
  },
  {
    id: "silencingStrike",
    name: "Silencing Strike",
    category: "studiedStrike",
    minLevel: 15,
    summary:
      "A studied strike forces a Fortitude save or silences the target (even for verbal spell components) for 1d4+1 rounds (1 round on a success). No effect on creatures immune to critical hits.",
    contextNotes: [
      note("Fort negates (reduces duration); DC = 10 + 1/2 investigator level + Int mod."),
    ],
  },
  {
    id: "masterfulNumericalStrike",
    name: "Masterful Numerical Strike",
    category: "studiedStrike",
    minLevel: 17,
    summary:
      "Use Numerical Strike and Greater Numerical Strike up to three times per day each without expending inspiration (never more than three uses of either per day).",
    contextNotes: [note("Requires the Numerical Strike and Greater Numerical Strike talents.")],
  },
  // --- Other talents -----------------------------------------------------
  {
    id: "alchemistDiscovery",
    name: "Alchemist Discovery",
    summary:
      "Gain an alchemist discovery, using investigator level as alchemist level for qualification. Repeatable for different discoveries.",
    contextNotes: [note("Pick a discovery from the Alchemist Discoveries table.")],
  },
  {
    id: "amazingInspiration",
    name: "Amazing Inspiration",
    minLevel: 7,
    summary: "Roll a d8 instead of a d6 when expending inspiration (2d8 at 20th level).",
    contextNotes: [
      note("Upgrades the inspiration die — the pool's die size isn't a tracked Change target."),
    ],
  },
  {
    id: "combatInspiration",
    name: "Combat Inspiration",
    minLevel: 9,
    summary: "Using inspiration on an attack roll or saving throw costs only 1 use instead of 2.",
  },
  {
    id: "deviceTalent",
    name: "Device Talent",
    summary:
      "Use Use Magic Device untrained, or use it trained without expending inspiration for the class-related check.",
  },
  {
    id: "effortlessAid",
    name: "Effortless Aid",
    summary: "Attempt aid another as a move action, or as a swift action by expending inspiration.",
  },
  {
    id: "eideticRecollection",
    name: "Eidetic Recollection",
    minLevel: 11,
    summary:
      "Always treat a Knowledge check as if you'd taken 10, even when threatened; expend inspiration to take 20 instead.",
  },
  {
    id: "empathy",
    name: "Empathy",
    minLevel: 5,
    summary:
      "Gain a bonus on Sense Motive checks; expend inspiration to read a nearby target's surface thoughts.",
  },
  {
    id: "expandedInspiration",
    name: "Expanded Inspiration",
    summary:
      "Add the inspiration die to Diplomacy, Heal, Perception, Profession, or Sense Motive checks without expending a use (when trained).",
  },
  {
    id: "hiddenAgendas",
    name: "Hidden Agendas",
    minLevel: 11,
    summary:
      "Double the inspiration die on Bluff and Linguistics checks; free inspiration use on saves vs. divination.",
  },
  {
    id: "inspirationalExpertise",
    name: "Inspirational Expertise",
    minLevel: 7,
    summary:
      "After identifying a monster via Knowledge, expend inspiration as a swift action to grant allies within 30 ft. a +4 insight bonus on attack rolls against it for 1 round.",
    contextNotes: [note("Activated, ally-targeted — apply the +4 manually while active.")],
  },
  {
    id: "inspiredAlertness",
    name: "Inspired Alertness",
    summary: "Expend inspiration to ignore the flat-footed condition when you become flat-footed.",
  },
  {
    id: "inspiredIntelligence",
    name: "Inspired Intelligence",
    summary:
      "Add the inspiration die to all Knowledge, Linguistics, and Spellcraft checks without expending inspiration.",
  },
  {
    id: "inspiredIntimidator",
    name: "Inspired Intimidator",
    summary:
      "Expend inspiration to extend an Intimidate demoralize's duration by 5 rounds per additional use.",
  },
  {
    id: "itemLore",
    name: "Item Lore",
    minLevel: 7,
    summary:
      "Use Spellcraft to identify a magic item's properties and command words without detect magic.",
  },
  {
    id: "perceptiveTracking",
    name: "Perceptive Tracking",
    summary: "Use Perception instead of Survival to find and follow tracks, at the same DCs.",
  },
  {
    id: "quickStudy",
    name: "Quick Study",
    summary: "Use Studied Combat as a swift action instead of a move action.",
  },
  {
    id: "rogueTalent",
    name: "Rogue Talent",
    summary:
      "Gain a rogue talent (from a specified list), using investigator level for its calculations. Repeatable for different talents.",
    contextNotes: [note("Not cross-referenced against this project's rogue talent data.")],
  },
  {
    id: "studiedDefense",
    name: "Studied Defense",
    minLevel: 9,
    summary:
      "Apply Studied Combat's insight bonus to AC against the studied target instead of to attack rolls.",
    contextNotes: [
      note(
        "Redirects the Studied Combat bonus (see the Studied Combat class-feature detail line) from attack to AC — apply manually.",
        "ac",
      ),
    ],
  },
  {
    id: "tenaciousInspiration",
    name: "Tenacious Inspiration",
    minLevel: 13,
    summary: "Roll two inspiration dice and take the higher result.",
  },
  {
    id: "unconventionalInspiration",
    name: "Unconventional Inspiration",
    summary:
      "Choose one skill; add the inspiration die to checks with it without expending inspiration.",
  },
  {
    id: "underworldInspiration",
    name: "Underworld Inspiration",
    summary:
      "Add the inspiration die to Bluff, Disable Device, Disguise, Intimidate, or Sleight of Hand checks without expending inspiration (when trained).",
  },
  // ---- splatbook additions (issue #74; full vendored parity) ----
  {
    id: "anathema",
    name: "Anathema",
    summary:
      "Spend a use of inspiration when creating or preparing a poison to instead brew an anathema that also affects a chosen creature type (from the ranger favored enemy list): a failed save lowers one of DR, energy resistance, fast healing, speed, or spell resistance by 5 (minimum 0) for 1 round per investigator level, bypassing the target's usual immunity to that save type.",
    contextNotes: [
      note(
        "Save DC and delivery method mirror the base poison used to make it — not a tracked Change target.",
      ),
    ],
  },
  {
    id: "appliedEngineering",
    name: "Applied Engineering",
    summary:
      "Spend a use of inspiration as a full-round action to study an object or area with Knowledge (engineering); on your next turn, use that check's result in place of a Strength check to break the object or a Perception check to find hidden doors or compartments there.",
  },
  {
    id: "atheistInspiration",
    name: "Atheist Inspiration",
    summary: "Apply inspiration to saving throws against divine spells without expending a use.",
    contextNotes: [note("Counts as the Divine Defiance feat for other feats' prerequisites.")],
  },
  {
    id: "castling",
    name: "Castling",
    summary:
      "Treat soft cover granted by a creature your size or larger as full cover instead — this cover doesn't grant a Stealth check.",
  },
  {
    id: "chroniclersInsight",
    name: "Chronicler's Insight",
    summary:
      "Read a Pathfinder Chronicle as a standard action, gaining its full benefit despite the normal 1d4-round reading time. Spend a use of inspiration to extend that benefit for hours equal to your Intelligence modifier and unlock one extra bonus tied to the Chronicle's associated Knowledge skill (only one active at a time).",
    contextNotes: [
      note(
        "The extra bonus varies by Knowledge skill (Arcana/Nature/Planes/Religion, Dungeoneering, Engineering, Geography, History, Local, or Nobility) — none of these are tracked here.",
      ),
    ],
  },
  {
    id: "didacticStrike",
    name: "Didactic Strike",
    summary:
      "In place of dealing studied strike damage, mark the struck foe: until the start of your next turn, each ally within 30 ft. who can see you deals extra precision damage equal to one-third your level on their first hit against it, or you can end this early as an immediate action to instead deliver your own studied strike damage through an ally's next successful hit.",
    contextNotes: [note("Precision damage — no effect on creatures immune to sneak attacks.")],
  },
  {
    id: "eldritchConduit",
    name: "Eldritch Conduit",
    summary:
      "As a full-round action, use two potions, wands, or scrolls at once, each expended/losing a charge normally: gain one item's magical effect but calculate it at the other item's caster level. One Use Magic Device check covers both items.",
  },
  {
    id: "extraEarthcraft",
    name: "Extra Earthcraft",
    summary: "Gain 2 additional earthcraft points each day. Requires the Earthcraft ability.",
    contextNotes: [note("Earthcraft is a resource pool this app doesn't track.")],
  },
  {
    id: "falseSpellcaster",
    name: "False Spellcaster",
    summary:
      "Deliver an extract as a covert skin-applied oil while faking verbal/somatic components, disguising the effect as a spell cast (Bluff vs. an observer's opposed Spellcraft check to see through it; DC to identify the true effect is 20 + the extract's spell level).",
    contextNotes: [
      note(
        "With the Infusion discovery, delivered infusions grant a +2 bonus on the observer's opposed Spellcraft check.",
      ),
    ],
  },
  {
    id: "favoredBeat",
    name: "Favored Beat",
    summary:
      "Gain the renown vigilante social talent for a community you're familiar with, and can pick from a list of vigilante social talents (celebrity discount, celebrity perks, gossip collector, great renown, incredible renown, loyal aid) in place of future investigator talents, using investigator level as vigilante level.",
    contextNotes: [note("Not cross-referenced against this project's vigilante talent data.")],
  },
  {
    id: "fortifiedPosition",
    name: "Fortified Position",
    summary:
      "Whenever cover grants you a Reflex-save bonus, gain an equal bonus on Fortitude saves.",
    contextNotes: [
      note("Cover isn't tracked as sheet state, so this can't be auto-applied.", "fort"),
    ],
  },
  {
    id: "gracefulAthlete",
    name: "Graceful Athlete",
    summary: "Gain Graceful Athlete as a bonus feat, provided you meet its prerequisites.",
    contextNotes: [
      note("Feat grant — add Graceful Athlete to Feats by hand if prerequisites are met."),
    ],
  },
  {
    id: "greaterAnathema",
    name: "Greater Anathema",
    summary:
      "Anathema's ability reduction increases to 10 and can also target DR/- or regeneration; you can also name a specific foe (such as a particular vampire) for a +2 DC bump against it.",
    contextNotes: [note("Requires the Anathema talent.")],
  },
  {
    id: "greaterCombatInspiration",
    name: "Greater Combat Inspiration",
    minLevel: 19,
    summary:
      "Choose one weapon type; while you have at least 1 inspiration point, Combat Inspiration works with that weapon's attacks without expending a use.",
    contextNotes: [note("Requires the Combat Inspiration talent.")],
  },
  {
    id: "greaterNumericalAlchemy",
    name: "Greater Numerical Alchemy",
    minLevel: 11,
    summary:
      "Spend a use of inspiration to mix an extract as a standard action, faster than Numerical Alchemy's already-reduced 1-round mixing time.",
    contextNotes: [note("Requires the Numerical Alchemy talent.")],
  },
  {
    id: "innocentFacade",
    name: "Innocent Facade",
    summary:
      "Once per day, cast innocence as a spell-like ability, using investigator level as caster level.",
    contextNotes: [note("Requires the Underworld Inspiration talent.")],
  },
  {
    id: "justAFaceInTheCrowd",
    name: "Just a Face in the Crowd",
    summary:
      "Gain a bonus equal to half your investigator level on Disguise and Perception checks whenever 10 or more creatures of your size are within 30 ft. of you.",
    contextNotes: [note("Conditional on nearby crowd size — apply by hand.", "skills")],
  },
  {
    id: "lingeringVenom",
    name: "Lingering Venom",
    minLevel: 5,
    summary:
      "Poisons you personally apply to weapons, traps, or foes require one additional successful save to cure.",
  },
  {
    id: "numericalAlchemy",
    name: "Numerical Alchemy",
    summary:
      "Spend a use of inspiration to mix an extract in 1 round instead of the normal 1 minute.",
  },
  {
    id: "occultDungeoneer",
    name: "Occult Dungeoneer",
    summary:
      "Use spell-trigger/completion items as though detect secret doors, find traps, knock, locate object, and obscure object were on your spell list (using class level as caster level where the item allows it); also cast knock once per day as a supernatural ability at investigator level.",
  },
  {
    id: "oneOfThoseFaces",
    name: "One of Those Faces",
    summary:
      "Use disguise self as a spell-like ability for up to 10 minutes per character level each day, spent in 10-minute increments; once used in a day, subsequent uses within 24 hours must keep the same alternate appearance.",
  },
  {
    id: "rapidPerception",
    name: "Rapid Perception",
    summary:
      "Attempt an intentional Perception search as a swift action instead of a move action; halves an invisible creature's Stealth bonus when searching for it specifically.",
    contextNotes: [note("Requires the Expanded Inspiration talent.")],
  },
  {
    id: "scrySlip",
    name: "Scry Slip",
    summary:
      "Anyone targeting you with a Will-save scrying effect must beat a caster level check (DC 15 + your investigator level); wards you and anything you're carrying.",
  },
  {
    id: "scryingFamiliarity",
    name: "Scrying Familiarity",
    summary:
      "Roll twice and take the better result on saves against scrying/divination effects, on Perception checks to spot scrying sensors, and on caster level checks to beat spell resistance with a scrying effect; a noticed sensor can be avoided with a Stealth check opposed by the caster's caster level check.",
  },
  {
    id: "spellStoring",
    name: "Spell Storing",
    summary:
      "Hold a single harmless, standard-action-cast spell of up to 2nd level cast on you instead of it taking effect immediately, then release it later as a standard action.",
    contextNotes: [note("Requires 1 rank of Use Magic Device to select.")],
  },
  {
    id: "sustainedInspirationalExpertise",
    name: "Sustained Inspirational Expertise",
    minLevel: 11,
    summary:
      "When using Inspirational Expertise, spend a use of inspiration as a swift action on the following round to extend the granted insight bonus by 1 more round, at -1 to the bonus each time it's used.",
    contextNotes: [note("Requires the Inspirational Expertise talent.")],
  },
  {
    id: "theWholeTime",
    name: "The Whole Time",
    summary:
      "Use spell-trigger/completion items as though greater invisibility, invisibility, and vanish were on your spell list. If you become visible after attacking, sheathe your weapon as a free action; a successful Bluff or Disguise check (opposed by witnesses' Sense Motive or Perception) leaves no obvious sign you were the attacker.",
  },
  {
    id: "unbalancingTrick",
    name: "Unbalancing Trick",
    summary:
      "Gain Improved Trip as a bonus feat, even without meeting its prerequisites; at 6th level, you're treated as meeting Greater Trip's prerequisites too, but must still take the feat to gain its benefits.",
  },
]);

export const INVESTIGATOR_TALENTS: Record<string, InvestigatorTalentDef> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const INVESTIGATOR_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.investigatorTalents` (see that type's doc
 * comment) is the FULL published catalog — all 67 talents above now have a
 * hand-authored, mechanics-authoritative counterpart — prose only. Same
 * pattern as `rage-powers.ts`'s `mergedRagePowerCatalog` (see that file's
 * doc comment for the general shape).
 *
 * Collision audit (all 67 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name,
 * with ONE naming drift — the vendored `iconclastic_strike` entry carries a
 * typo'd name ("Iconclastic Strike", missing the second "o"); the published
 * name (confirmed against d20pfsrd.com's mirror of the Paizo text, since
 * aonprd.com's own listing repeats the same typo) is "Iconoclastic Strike",
 * recorded below as `iconoclasticStrike`. No name collides within the
 * vendored catalog itself either.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different (typo'd) name — see the collision-audit comment above. */
const INVESTIGATOR_TALENT_NAME_ALIASES: Record<string, string> = {
  iconoclasticStrike: "Iconclastic Strike",
};

function normalizeTalentName(name: string): string {
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

/**
 * This file's own `category` is a narrow "does the picker show a Studied
 * Strike badge" enum, not the source's richer grouping (5 category labels —
 * "Inspiration Talents", "Studied Strike Talents", "Other Studied Strike
 * Talents", "Alchemist and Poison Talents", "Other Talents"). A vendored-only
 * entry is bucketed `studiedStrike` when the source's own category label
 * says so (both "...Studied Strike..." labels), `other` otherwise — a
 * faithful narrowing of what the source already states, not a guess.
 */
function categoryFromVendored(category: string | undefined): InvestigatorTalentCategory {
  return category?.includes("Studied Strike") ? "studiedStrike" : "other";
}

/** A catalog entry the picker can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedInvestigatorTalentEntry extends InvestigatorTalentDef {
  /** Ability-type suffix as published, e.g. "(Ex)" — undefined for the (currently none) hand-authored-only case. */
  nameSuffix?: string;
  /** The source's own grouping label (richer than this file's `category` enum), e.g. "Alchemist and Poison Talents", when known. */
  vendorCategory?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: InvestigatorTalent): MergedInvestigatorTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: categoryFromVendored(entry.category),
    vendorCategory: entry.category,
    // NOT `entry.level` — same within-chain-tier-marker caveat as
    // `RagePower.level` (see `InvestigatorTalent.level`'s doc comment); any
    // real "requires Nth level" prerequisite is already prose in `description`.
    minLevel: 3,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked talent id (`doc.build.investigatorTalents` entries) to
 * its definition — hand-authored table first (mechanics-authoritative),
 * falling back to the vendored catalog for an id that only exists there.
 * Used by `collect.ts`/`archetypes.ts` instead of indexing
 * `INVESTIGATOR_TALENTS` directly, so a vendored-only pick resolves to a
 * real (display-only) definition rather than being silently dropped.
 */
export function resolveInvestigatorTalent(
  id: string,
  refData: RefData,
): InvestigatorTalentDef | undefined {
  const hand = INVESTIGATOR_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.investigatorTalents?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and real mechanics, but
 * carrying the vendored entry's prose/sources along for display); no
 * hand-authored-only entries exist to append per the collision audit above.
 * `!entry.displayOnly` marks which rows carry real mechanics.
 */
export function mergedInvestigatorTalentCatalog(refData: RefData): MergedInvestigatorTalentEntry[] {
  const handByNormName = new Map<string, InvestigatorTalentDef>();
  for (const t of TALENT_LIST) {
    handByNormName.set(normalizeTalentName(INVESTIGATOR_TALENT_NAME_ALIASES[t.id] ?? t.name), t);
  }

  const vendored = Object.values(refData.investigatorTalents ?? {});
  const merged: MergedInvestigatorTalentEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeTalentName(v.name));
    merged.push(
      handMatch
        ? {
            ...handMatch,
            nameSuffix: v.nameSuffix,
            vendorCategory: v.category,
            description: v.description,
            sources: v.sources,
          }
        : vendoredToDef(v),
    );
  }
  return merged;
}
