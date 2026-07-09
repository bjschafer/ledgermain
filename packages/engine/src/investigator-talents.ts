/**
 * Clean-room PF1 investigator talent table (Advanced Class Guide, issue #65
 * / #13's investigator-audit follow-up): hand-authored from the published
 * rules (verified against aonprd.com's Investigator Talents listing),
 * mirroring `alchemist-discoveries.ts`'s posture — investigator talents are
 * NOT part of the vendored Foundry data pack (the Investigator class def
 * only links the generic "Investigator Talent" stub `ClassFeature`, no
 * per-talent breakdown — confirmed: `class-features.json` carries no
 * per-talent entries), so there is no upstream JSON to normalize.
 *
 * Scope: the 28 core Advanced Class Guide investigator talents. A handful of
 * "meta" talents that hand off to an entirely different table this project
 * already has (Alchemist Discovery, Rogue Talent) are included as stub
 * entries pointing at those tables via `contextNotes` rather than expanded
 * inline — same posture as `oracleRevelations.ts`'s "Bonded Mount" pointing
 * at the Animal Companion section. Later-splatbook investigator talents
 * (Pathfinder Unchained, Pathfinder Society boons, ...) are OUT OF SCOPE —
 * add them in a follow-up, same posture as `witch-hexes.ts`/
 * `alchemist-discoveries.ts` scoping to their core sourcebook.
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

import type { Change, ContextNote } from "@pf1/schema";

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
]);

export const INVESTIGATOR_TALENTS: Record<string, InvestigatorTalentDef> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const INVESTIGATOR_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);
