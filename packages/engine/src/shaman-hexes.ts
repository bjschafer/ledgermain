/**
 * Clean-room PF1 GENERAL shaman hex table (Advanced Class Guide's own
 * spirit-agnostic "Shaman Hexes" table, issue #65/#74): hand-authored from
 * the published rules (verified against aonprd.com's live "Shaman Hexes"
 * index page, which aggregates every source book's additions to this single
 * catalog), mirroring `witch-hexes.ts`'s posture and file shape closely.
 *
 * Scope: all 16 entries in the vendored `RefData.shamanHexes` catalog
 * (`packages/data-pipeline/data/shaman-hexes.json`) — the Advanced Class
 * Guide's original 12 (Chant, Charm, Evil Eye, Fetish, Fortune, Fury,
 * Healing, Misfortune, Secret, Shapeshift, Tongues, Ward) plus three later
 * additions from Heroes from the Fringe (Draconic Resilience, Intimidating
 * Display, Wings) and one from Legacy of the First World (Silkstring
 * Snare). Distinct from `shaman-spirits.ts`'s `ShamanSpiritHex` (the 5
 * hexes each of the 8 spirits individually grants, hand-authored
 * separately) — this table is the spirit-independent list every shaman can
 * pick from regardless of spirit, out of scope here.
 *
 * `minLevel` is 2 for every entry: unlike the witch's own Hex table (which
 * splits into 1st/10th/18th-level tiers), this catalog carries no
 * major/grand split at all — verified against aonprd.com that none of the
 * 16 entries states a level requirement for SELECTION, only level-gated
 * scaling of an already-selectable hex's effect (e.g. Evil Eye's -2
 * penalty becoming -4 at 8th level). A shaman's first hex pick (of either
 * kind, spirit-exclusive or general) comes at 2nd level (ACG's Hex class
 * feature; see `apps/web/src/model/shamanHexes.ts`'s `SHAMAN_HEX_LEVELS`).
 *
 * Modelling posture (mirrors witch-hexes.ts's honesty bar): every one of
 * the 16 hexes here is a foe/ally-targeted, activated, feat-granting, or
 * limited-duration ability with no flat always-on number on the SHAMAN's
 * own sheet — the same conclusion `witch-hexes.ts` reached for its
 * 27-entry table. Specifically:
 *   - Fortune, Fury, Ward, Draconic Resilience, Healing: the shaman chooses
 *     a target (an ally, a touched creature) fresh each activation — never
 *     an unconditional bonus on the shaman's OWN sheet. Ward is RAW
 *     explicit that it cannot target the shaman herself, same as
 *     `witch-hexes.ts`'s identically-named Ward entry.
 *   - Evil Eye, Misfortune, Charm, Silkstring Snare: target a foe within
 *     range, save-triggered, never a bonus on the shaman's own sheet.
 *   - Chant: a move action that extends the duration of another already-
 *     active hex — no bonus of its own to model.
 *   - Fetish: +4 insight on Spellcraft checks made ONLY to identify a magic
 *     item's properties, not all Spellcraft checks — a sub-skill-scoping
 *     near-miss (see this project's honesty-bar blockers; the same shape as
 *     `witch-hexes.ts`'s Cauldron/Craft (Alchemy) entry), plus a Craft
 *     Wondrous Item bonus-feat grant with no `Change` target for "auto-grant
 *     this specific named feat" (`targets.ts`'s `bonusFeats` only tracks the
 *     player's free-choice budget count, not an engine-driven named-feat
 *     grant).
 *   - Secret: grants one (player-chosen) metamagic feat as a bonus feat —
 *     same no-target-for-a-named-feat-grant gap as Fetish.
 *   - Intimidating Display: grants Dazzling Display as a bonus feat
 *     (ignoring its prerequisites) and changes a usage rule (no weapon
 *     required) — a feat-grant/feat-usage change, not a numeric bonus.
 *   - Healing, Shapeshift, Tongues, Wings: activated abilities limited to a
 *     number of minutes/rounds per day (touch heal, an alter-self-line
 *     transformation, comprehend-languages-line, temporary flight/natural
 *     attack) — not a permanent passive effect, the same "Flight" near-miss
 *     `witch-hexes.ts` documents for its own Tongues/Flight entries.
 * None of the 16 clears the bar for an unconditional (or buff-gated)
 * `Change` on the shaman's own sheet, so every entry here is
 * `displayOnly: true` with `changes: []`; `contextNotes` carries the DC,
 * duration, scaling, and activation shape instead.
 *
 * All 16 numbers/DCs verified against aonprd.com's live "Shaman Hexes" page
 * (https://aonprd.com/ShamanHexes.aspx) during authoring, cross-checked
 * against the vendored `description` HTML in
 * `packages/data-pipeline/data/shaman-hexes.json` (sourced under OGL from
 * the same "Pf Data 1e" dataset `witch-hexes.ts`'s sibling catalog uses) —
 * both agreed on every number with zero discrepancies.
 */

import type { Change, ContextNote, RefData, ShamanHex, SourceRef } from "@pf1/schema";

export interface ShamanGeneralHexDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest shaman level this hex can be selected at — 2 for every entry (see file doc comment). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the hex (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (save DC, duration, activation cost, scaling, ...). */
  contextNotes?: ContextNote[];
  /** True when `changes` is empty — every entry here today (see file doc comment). */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawHex {
  id: string;
  name: string;
  summary: string;
  changes?: Change[];
  contextNotes?: ContextNote[];
}

function build(entries: RawHex[]): ShamanGeneralHexDef[] {
  return entries.map((e) => {
    const changes = e.changes ?? [];
    return {
      id: e.id,
      name: e.name,
      summary: e.summary,
      minLevel: 2,
      changes,
      contextNotes: e.contextNotes,
      displayOnly: changes.length === 0,
    };
  });
}

// Vendored ids (`packages/data-pipeline/data/shaman-hexes.json`) are already
// the "Pf Data 1e" dataset's own snake_case slugs (`evil_eye`,
// `draconic_resilience`, ...) — unlike `witch-hexes.ts`'s camelCase ids
// (matched to its vendored counterpart by normalized NAME because the two
// id vocabularies are disjoint by construction), this table reuses the
// vendored ids directly so `doc.build.shamanHexes` entries resolve the same
// way whether they came from this hand table or a fallback vendored lookup.
const HEX_LIST: ShamanGeneralHexDef[] = build([
  {
    id: "chant",
    name: "Chant",
    summary:
      "Move action: add 1 round to the remaining duration of a Charm, Evil Eye, Fortune, Fury, or Misfortune hex you currently have active on a target within 30 ft.",
    contextNotes: [note("Extends an already-active hex only — no effect of its own to apply.")],
  },
  {
    id: "charm",
    name: "Charm",
    summary:
      "Beckon an animal or humanoid within 30 ft. into a friendlier mood, as though you'd succeeded on a Diplomacy check.",
    contextNotes: [
      note(
        "Improves attitude 1 step (2 at 8th level) for rounds equal to your Wisdom modifier (min. 1); Will negates. Mind-affecting.",
      ),
    ],
  },
  {
    id: "draconic_resilience",
    name: "Draconic Resilience",
    summary:
      "Touch a creature to grant it temporary immunity to magical sleep effects, gaining paralysis immunity too at 7th level.",
    contextNotes: [
      note(
        "Duration = rounds equal to your shaman level; a creature can't benefit again for 24 hours. Heroes from the Fringe p. 8.",
      ),
    ],
  },
  {
    id: "evil_eye",
    name: "Evil Eye",
    summary:
      "Curse a foe within 30 ft. with a -2 penalty (your choice of ability checks, AC, attack rolls, saves, or skill checks) that worsens to -4 at 8th level.",
    contextNotes: [
      note(
        "Duration = 3 + your Wisdom modifier rounds (Will save reduces this to 1 round); mind-affecting. Category is chosen per use.",
      ),
    ],
  },
  {
    id: "fetish",
    name: "Fetish",
    summary:
      "Gain Craft Wondrous Item as a bonus feat, plus a permanent bonus on Spellcraft checks made to identify a magic item's properties.",
    contextNotes: [
      note(
        "+4 insight bonus, but only on the identify-a-magic-item use of Spellcraft, not the skill generally — not auto-applied; the Craft Wondrous Item bonus feat isn't modeled either (no Change target exists for auto-granting a specific named feat).",
        "skill.spl",
      ),
    ],
  },
  {
    id: "fortune",
    name: "Fortune",
    summary:
      "Grant a creature within 30 ft. a stroke of luck for 1 round: once, it may reroll an ability check, attack roll, save, or skill check and keep the better result.",
    contextNotes: [
      note(
        "Duration extends by 1 round at 8th and 16th level; target must decide to use the reroll before the first roll. Player-chosen target each activation, not a self-buff.",
      ),
    ],
  },
  {
    id: "fury",
    name: "Fury",
    summary:
      "Fill a creature within 30 ft. with primal fury, granting a bonus on attack rolls and a bonus on saves against fear.",
    contextNotes: [
      note(
        "+2/+2, rising to +3/+3 at 8th and +4/+4 at 16th; lasts a number of rounds equal to your Wisdom modifier. Player-chosen target each activation, not a self-buff.",
      ),
    ],
  },
  {
    id: "healing",
    name: "Healing",
    summary:
      "Touch a creature to heal it as cure light wounds using your shaman level as caster level, upgrading to cure moderate wounds at 5th level.",
    contextNotes: [
      note(
        "A given creature can't benefit again for 24 hours. Activated touch ability, not a permanent bonus.",
      ),
    ],
  },
  {
    id: "intimidating_display",
    name: "Intimidating Display",
    summary:
      "Gain Dazzling Display as a bonus feat even without meeting its prerequisites, and use it without wielding a weapon.",
    contextNotes: [
      note(
        "Feat grant plus a feat-usage-rule change, not a numeric bonus — no Change target exists for auto-granting a specific named feat. Heroes from the Fringe p. 8.",
      ),
    ],
  },
  {
    id: "misfortune",
    name: "Misfortune",
    summary:
      "Curse a foe within 30 ft. for 1 round: it must roll twice on ability checks, attack rolls, saves, and skill checks, and take the worse result.",
    contextNotes: [
      note(
        "Will negates; duration extends by 1 round at 8th and 16th level. Affects every roll the target makes while it lasts.",
      ),
    ],
  },
  {
    id: "secret",
    name: "Secret",
    summary:
      "Gain one metamagic feat of your choice as a bonus feat, provided you meet its prerequisites.",
    contextNotes: [
      note(
        "Feat grant, not a numeric bonus — no Change target exists for auto-granting a specific named feat.",
      ),
    ],
  },
  {
    id: "shapeshift",
    name: "Shapeshift",
    summary:
      "Change your own shape for a limited number of minutes per day, as alter self, upgrading through the beast shape line at 8th/12th/16th/20th level.",
    contextNotes: [
      note(
        "Minutes/day = your shaman level, spent in 1-minute increments; standard action to change (including back). Limited daily-use activation, not a permanent effect.",
      ),
    ],
  },
  {
    id: "silkstring_snare",
    name: "Silkstring Snare",
    summary:
      "Erupt spider silk beneath a foe, entangling and anchoring it in place unless it saves.",
    contextNotes: [
      note(
        "Reflex negates; duration = 3 + your Wisdom modifier rounds. The target can escape as a standard action (Escape Artist or Strength check at the same DC) or by dealing damage equal to double your class level (silk has hardness 0); a creature can't be re-affected for 24 hours. Legacy of the First World p. 17.",
      ),
    ],
  },
  {
    id: "tongues",
    name: "Tongues",
    summary:
      "Understand any spoken language for a limited number of minutes per day; from 5th level, also speak any language during that time.",
    contextNotes: [
      note(
        "Minutes/day = your shaman level, spent in 1-minute increments. Limited daily-use activation, not a permanent effect.",
      ),
    ],
  },
  {
    id: "ward",
    name: "Ward",
    summary:
      "Place a protective ward on one creature (never yourself), granting a deflection bonus to AC and a resistance bonus on saves until it's hit or fails a save.",
    contextNotes: [
      note(
        "+2/+2, rising by 1 at 8th and 16th level; only one ward active at a time (a new one ends the old). Cannot target yourself — apply manually to the warded ally's sheet while active.",
        "ac",
      ),
    ],
  },
  {
    id: "wings",
    name: "Wings",
    summary:
      "Grow wings for a limited number of minutes per day, usable as a natural attack; gain feather fall at 3rd level and a limited fly speed at 7th.",
    contextNotes: [
      note(
        "Minutes/day = your shaman level; wings deal 1d3 damage (1d2 if Small) as a secondary natural attack. At 7th level, fly speed 30 ft. with poor maneuverability, must land each turn or fall. A second selection at 8th+ doubles the daily minutes and upgrades to average maneuverability. Limited daily-use activation, not a permanent fly speed. Heroes from the Fringe p. 8.",
        "speed.fly",
      ),
    ],
  },
]);

export const SHAMAN_GENERAL_HEXES: Record<string, ShamanGeneralHexDef> = Object.fromEntries(
  HEX_LIST.map((h) => [h.id, h]),
);

export const SHAMAN_GENERAL_HEX_IDS: readonly string[] = HEX_LIST.map((h) => h.id);

/** Cheap HTML->text preview for a vendored-only entry's picker row (the hand-authored table's `summary` field is a curated paraphrase this app doesn't have for vendored-only prose). */
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.shamanHexes` is the FULL published GENERAL shaman-hex
 * catalog (16 entries after junk/`witch_hex`-meta-rule filtering — see that
 * type's doc comment in `@pf1/schema`). The hand-authored table above stays
 * authoritative for MECHANICS/context; this section merges the two for
 * BROWSING (the picker) and for resolving a picked id back to a definition
 * (`collect.ts`/`archetypes.ts`), mirroring `witch-hexes.ts`'s
 * `mergedWitchHexCatalog` exactly.
 *
 * Matching is by NORMALIZED NAME, same convention as `witch-hexes.ts` — even
 * though every hand-authored id here already equals its vendored
 * counterpart's id by construction (see the id-choice note above `HEX_LIST`,
 * verified: all 16 matched with zero drift), name-matching (rather than a
 * bare id lookup) keeps this merge logic identical to its sibling catalogs
 * and tolerant of a future vendored-data rebuild that renames an id but
 * keeps the display name stable.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const SHAMAN_HEX_NAME_ALIASES: Record<string, string> = {};

function normalizeHexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def (matched) with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface ShamanGeneralHexEntry extends ShamanGeneralHexDef {
  /** Ability-type suffix as published, e.g. "(Su)" — undefined when no vendored counterpart backs this id. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredHexToDef(entry: ShamanHex): ShamanGeneralHexEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    minLevel: 2,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked general-shaman-hex id (`doc.build.shamanHexes` entries
 * that aren't spirit-scoped — see `findShamanHex`) to its definition —
 * hand-authored table first (mechanics-authoritative), falling back to the
 * vendored catalog for an id that only exists there. Used by `collect.ts`
 * (modifier collection) and `archetypes.ts` (the Class Features list)
 * instead of indexing `SHAMAN_GENERAL_HEXES` directly, so a vendored-only
 * pick resolves to a real (display-only) definition rather than being
 * silently dropped.
 */
export function resolveGeneralShamanHex(
  id: string,
  refData: RefData,
): ShamanGeneralHexEntry | undefined {
  const hand = SHAMAN_GENERAL_HEXES[id];
  if (hand) return { ...hand, nameSuffix: refData.shamanHexes?.[id]?.nameSuffix };
  const vendored = refData.shamanHexes?.[id];
  return vendored ? vendoredHexToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id), but carrying the
 * vendored entry's prose/sources along for display, plus any hand-authored
 * entry with no vendored counterpart appended (none today — see the
 * collision-audit comment above; the fallback exists for a future
 * addition). `!entry.displayOnly` marks a live-mechanics row for the
 * picker's "M" badge, same convention as `mergedWitchHexCatalog`/
 * `mergedRagePowerCatalog` — every hex here is `displayOnly` today (see the
 * file's top doc comment), so the badge never actually appears yet.
 * Recomputes from `refData.shamanHexes` on every call — callers should
 * memoize on `refData`, same convention as this catalog's siblings.
 */
export function mergedShamanHexCatalog(refData: RefData): ShamanGeneralHexEntry[] {
  const handByNormName = new Map<string, ShamanGeneralHexDef>();
  for (const h of HEX_LIST) {
    handByNormName.set(normalizeHexName(SHAMAN_HEX_NAME_ALIASES[h.id] ?? h.name), h);
  }

  const usedHandIds = new Set<string>();
  const merged: ShamanGeneralHexEntry[] = [];
  for (const v of Object.values(refData.shamanHexes ?? {})) {
    const handMatch = handByNormName.get(normalizeHexName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredHexToDef(v));
    }
  }
  for (const h of HEX_LIST) {
    if (!usedHandIds.has(h.id)) merged.push(h);
  }
  return merged;
}
