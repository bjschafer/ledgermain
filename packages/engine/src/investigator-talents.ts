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
 * (Pathfinder Unchained, Pathfinder Society boons, ...) have no hand-verified
 * mechanics HERE but ARE now browsable, display-only, via the vendored
 * catalog overlay at the bottom of this file (issue #74 Phase 3b) — see
 * `mergedInvestigatorTalentCatalog`.
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3b: `RefData.investigatorTalents` (see that type's doc
 * comment) is the FULL published catalog — the 28 core talents above plus
 * every later-splatbook talent this table has never modeled — prose only.
 * Same pattern as `rage-powers.ts`'s `mergedRagePowerCatalog` (see that
 * file's doc comment for the general shape).
 *
 * Collision audit (all 28 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name —
 * no drift, no alias needed. No name collides within the vendored catalog
 * itself either.
 */

/** Empty — see the collision-audit comment above. */
const INVESTIGATOR_TALENT_NAME_ALIASES: Record<string, string> = {};

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
