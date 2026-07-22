/**
 * Clean-room PF1 magus arcana table (DESIGN §6, issue #61): hand-authored
 * from the published Ultimate Magic rules (verified against public SRD
 * text/AoN), same posture as `arcanist-exploits.ts` — magus arcana are NOT
 * part of the vendored Foundry data pack (only the class's own
 * spellcasting/BAB/Arcane Pool `uses.maxFormula` class feature is vendored,
 * plus a single generic "Magus Arcana" stub `ClassFeature` with no per-arcana
 * breakdown), so there is no upstream JSON to normalize.
 *
 * Scope: the 20 BASE Ultimate Magic magus arcana (UM p.10-12) a magus can
 * pick starting at 3rd level. Arcana added by LATER books (Ultimate Combat's
 * Enduring Blade, Weapon Master's Handbook's Arcane Redoubt/Bane Blade,
 * various Pathfinder Society boons, race-restricted arcana like
 * Vision-Clouding Strike, ...) are OUT OF SCOPE — add them in a follow-up if
 * the tracker needs to represent a higher-splatbook magus, mirroring how
 * arcanist Greater Exploits were deferred at that class's launch.
 *
 * Level gating (PF1 RAW: "starting at 3rd level, a magus gains an arcana...
 * at 3rd level and every 3 levels thereafter"): `minLevel` is the earliest
 * magus level at which an arcana can be selected — 3 for every arcana with
 * no additional stated prerequisite (the earliest any arcana can be picked
 * at all), or the arcana's own higher stated minimum (6th/9th/12th/15th) for
 * the handful UM restricts further. Unlike a hard block, this is SOFT
 * availability filtering — the picker greys out/annotates an arcana below
 * its `minLevel` but never removes the Add button, matching the project's
 * hybrid-prereqs philosophy (`model/traits.ts`/`model/feats.ts`: hard-block
 * only on structured ability/BAB/CL signals, soft-warn everything else).
 *
 * Modelling posture (mirrors arcanist-exploits.ts): every base arcana here
 * is either a SWIFT/IMMEDIATE-action ability that costs 1+ points from the
 * magus's Arcane Pool (already a real, vendored resource pool — see
 * `resources.ts`'s `deriveResourcePools`, which reads the class feature's
 * own `uses.maxFormula`) for a situational effect, a once-per-day
 * metamagic-flavored spell modifier, or a passive mechanic substitution with
 * no Change-shaped sheet target (e.g. "use Intelligence instead of the
 * wand's minimum caster level for its save DC" has no `wandDc` stat this
 * engine tracks). None grants a flat, unconditional, always-on numeric bonus
 * — so EVERY entry here is `displayOnly: true` with `changes: []` plus a
 * `contextNotes` reminder describing the cost/effect, never an over-applied
 * flat number.
 *   - `familiar` carries NO changes of its own, same posture as the
 *     arcanist's identically-named exploit — a tracked familiar's stat block
 *     is already fully modeled via `CharacterDoc.build.familiar` (see
 *     `familiar.ts`/`familiars.ts`); do not wire this entry's id into
 *     `collectModifiers`. The picker's summary points the player at the
 *     Familiar section of the builder instead.
 *   - `maneuverMastery` and `spellBlending` each require an additional
 *     player pick (which combat maneuver; which wizard spell(s) to add) that
 *     this table does not model as a nested choice — same "note it, don't
 *     invent new machinery" posture `arcanist-exploits.ts` takes for
 *     Bloodline/School Development.
 */

import type { Change, ContextNote, MagusArcana, RefData, SourceRef } from "@pf1/schema";

export interface MagusArcanaDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest magus level this arcana can be selected at — 3 (the earliest any
   * arcana is available) unless UM states a higher minimum. Soft-filtered
   * only (see file doc comment); never blocks selection.
   */
  minLevel: number;
  /** Typed modifiers granted by the arcana (empty for every base arcana — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (arcane pool cost, activation type, scaling formula, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no base arcana has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

const ARCANA_LIST: MagusArcanaDef[] = [
  {
    id: "arcaneAccuracy",
    name: "Arcane Accuracy",
    summary:
      "Swift action, 1 arcane pool point: gain an insight bonus equal to your Intelligence modifier on all attack rolls until the end of your turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Costs 1 arcane pool point per use; apply the insight bonus manually.")],
    displayOnly: true,
  },
  {
    id: "broadStudy",
    name: "Broad Study",
    summary:
      "If you have levels in another arcane spellcasting class, you may use spell combat and spellstrike with spells from that class's list too.",
    minLevel: 6,
    changes: [],
    contextNotes: [note("Multiclass-only option — no numeric sheet effect to model.")],
    displayOnly: true,
  },
  {
    id: "closeRange",
    name: "Close Range",
    summary: "Deliver ray spells as melee touch attacks through spellstrike.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Delivery-method option only — no numeric sheet effect to model.")],
    displayOnly: true,
  },
  {
    id: "concentrate",
    name: "Concentrate",
    summary: "Once per day, reroll a failed concentration check with a +4 bonus on the reroll.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Situational reroll — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "criticalStrike",
    name: "Critical Strike",
    summary:
      "Once per day, after confirming a critical hit, cast a touch spell as a swift action and deliver it with a free touch attack.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Situational free action — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "dispellingStrike",
    name: "Dispelling Strike",
    summary:
      "1 arcane pool point: imbue your weapon so its next successful hit within 1 minute triggers a targeted dispel magic against the struck creature.",
    minLevel: 9,
    changes: [],
    contextNotes: [note("Costs 1 arcane pool point per use; roll the dispel check manually.")],
    displayOnly: true,
  },
  {
    id: "empoweredMagic",
    name: "Empowered Magic",
    summary:
      "Once per day, cast a spell as if affected by the Empower Spell feat, at no level increase.",
    minLevel: 6,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "familiar",
    name: "Familiar",
    summary:
      "Gain a familiar, as the wizard's arcane bond class feature, using magus level as effective wizard level.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Reminder: set up your familiar in the Familiar section of the Classes panel — this toggle is informational.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "hastedAssault",
    name: "Hasted Assault",
    summary:
      "1 arcane pool point: gain the effects of haste for a number of rounds equal to your Intelligence bonus (yourself only).",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Temporary, self-only haste — not a permanent Change; apply manually while active.",
        "speed.land",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "maneuverMastery",
    name: "Maneuver Mastery",
    summary:
      "Choose one type of combat maneuver; use your magus level in place of your base attack bonus when calculating your CMB for it. Can be selected more than once for different maneuvers.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Which combat maneuver you chose is a separate pick — record it in a note.", "cmb"),
    ],
    displayOnly: true,
  },
  {
    id: "maximizedMagic",
    name: "Maximized Magic",
    summary:
      "Once per day, cast a spell as if affected by the Maximize Spell feat, at no level increase.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "poolStrike",
    name: "Pool Strike",
    summary:
      "Standard action, 1 arcane pool point: melee touch attack dealing 2d6 damage of a chosen energy type, +1d6 per three magus levels beyond 1st.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; roll the scaling touch-attack damage manually."),
    ],
    displayOnly: true,
  },
  {
    id: "quickenedMagic",
    name: "Quickened Magic",
    summary:
      "Once per day, cast a spell as if affected by the Quicken Spell feat, at no level increase.",
    minLevel: 15,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "reflection",
    name: "Reflection",
    summary:
      "Spend arcane pool points to attempt to turn a targeted spell back on its caster (as spell turning), or gain an insight bonus on the save instead.",
    minLevel: 15,
    changes: [],
    contextNotes: [note("Situational reaction — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "silentMagic",
    name: "Silent Magic",
    summary:
      "Once per day, cast a spell as if affected by the Silent Spell feat, at no level increase.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "spellBlending",
    name: "Spell Blending",
    summary:
      "Add one wizard spell (or two of half your highest magus spell level or lower) to your magus spell list and spellbook. Can be selected more than once.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Which wizard spell(s) you add is a separate choice — record them in the Spells section.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "spellShield",
    name: "Spell Shield",
    summary:
      "Immediate action, 1 arcane pool point: gain a shield bonus to AC equal to your Intelligence modifier until the start of your next turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Temporary shield bonus while active — not a permanent Change; apply manually.", "ac"),
    ],
    displayOnly: true,
  },
  {
    id: "stillMagic",
    name: "Still Magic",
    summary:
      "Once per day, cast a spell as if affected by the Still Spell feat, at no level increase.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "wandMastery",
    name: "Wand Mastery",
    summary:
      "Use your Intelligence modifier, if higher, instead of the wand's default modifier when calculating the save DC of a spell cast from a wand.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Mechanic substitution only — no dedicated wand-DC sheet stat to modify.")],
    displayOnly: true,
  },
  {
    id: "wandWielder",
    name: "Wand Wielder",
    summary: "Activate a wand or staff in place of casting a spell during spell combat.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Action-economy option only — no numeric effect to model.")],
    displayOnly: true,
  },
];

export const MAGUS_ARCANA: Record<string, MagusArcanaDef> = Object.fromEntries(
  ARCANA_LIST.map((a) => [a.id, a]),
);

export const MAGUS_ARCANA_IDS: readonly string[] = ARCANA_LIST.map((a) => a.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3b: `RefData.magusArcana` (see that type's doc comment) is
 * the FULL published magus-arcana catalog (~64 entries after junk
 * filtering), prose only. The hand-verified table above stays authoritative
 * for MECHANICS — this section only merges the two for BROWSING (the picker)
 * and for resolving a picked id back to a definition (`collect.ts`/
 * `archetypes.ts`), mirroring `rage-powers.ts`'s `mergedRagePowerCatalog`
 * exactly.
 *
 * Matching is by NORMALIZED NAME, never id — same rationale as rage
 * powers/hexes.
 *
 * Collision audit (all 20 hand-authored entries, run against the pinned Pf
 * Data 1e slice): all 20 matched a vendored entry by normalized name, with NO
 * naming drift, so `ARCANA_NAME_ALIASES` is empty (kept for a future
 * hand-authored addition that DOES drift). No vendored-catalog-internal name
 * collisions either — every one of the 64 vendored arcana has a unique
 * normalized name.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const ARCANA_NAME_ALIASES: Record<string, string> = {};

function normalizeArcanaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

/** A catalog entry the picker can browse — either the hand-authored def (matched) with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedMagusArcanaEntry extends MagusArcanaDef {
  /** Ability-type suffix as published, e.g. "(Ex)"/"(Su)"/"(Sp)" — undefined when no vendored counterpart backs this id. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredArcanaToDef(entry: MagusArcana): MergedMagusArcanaEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    // 3rd is the earliest ANY magus arcana can be selected (UM RAW) — this
    // source carries no per-entry level field at all (unlike rage powers'
    // non-gate `level`, there isn't even a misleading number to avoid using
    // here). A vendored-only entry with a higher stated minimum only has that
    // prose inside `description` (do not attempt to parse it out
    // structurally — see `MagusArcana`'s doc comment).
    minLevel: 3,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked magus-arcana id (`doc.build.magusArcana` entries) to its
 * definition — hand-authored table first (mechanics-authoritative), falling
 * back to the vendored catalog for an id that only exists there. Used by
 * `collect.ts` (modifier collection) and `archetypes.ts` (the Class Features
 * list) instead of indexing `MAGUS_ARCANA` directly, so a vendored-only pick
 * resolves to a real (display-only) definition rather than being silently
 * dropped.
 */
export function resolveMagusArcanum(id: string, refData: RefData): MagusArcanaDef | undefined {
  const hand = MAGUS_ARCANA[id];
  if (hand) return hand;
  const vendored = refData.magusArcana?.[id];
  return vendored ? vendoredArcanaToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and mechanics, but
 * carrying the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today —
 * see the collision-audit comment above). `!entry.displayOnly` marks which
 * rows have live mechanics, for the picker's "M" badge — every base arcana
 * here is `displayOnly` (see the file's top doc comment), so the badge never
 * actually appears yet.
 */
export function mergedMagusArcanaCatalog(refData: RefData): MergedMagusArcanaEntry[] {
  const handByNormName = new Map<string, MagusArcanaDef>();
  for (const a of ARCANA_LIST) {
    handByNormName.set(normalizeArcanaName(ARCANA_NAME_ALIASES[a.id] ?? a.name), a);
  }

  const usedHandIds = new Set<string>();
  const merged: MergedMagusArcanaEntry[] = [];
  for (const v of Object.values(refData.magusArcana ?? {})) {
    const handMatch = handByNormName.get(normalizeArcanaName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredArcanaToDef(v));
    }
  }
  for (const a of ARCANA_LIST) {
    if (!usedHandIds.has(a.id)) merged.push(a);
  }
  return merged;
}
