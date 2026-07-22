/**
 * Clean-room PF1 Monk (Unchained) Style Strikes table (Pathfinder Unchained,
 * issue #65): hand-authored from the published rules (verified against
 * aonprd.com's "Style Strikes - Monk (Unchained)" listing, cross-checked
 * against d20pfsrd's Unchained Monk page for the core book's own list — same
 * scoping discipline as `monk-ki-powers.ts`). Style strikes are NOT part of
 * the vendored Foundry data pack (the class def only links a single generic
 * "Style Strikes" stub `ClassFeature`, no per-strike breakdown), so there is
 * no upstream JSON to normalize.
 *
 * PF1 RAW: "At 5th level, a monk learns to focus his flurry of blows on a
 * particular style ... At 9th level, and every four levels thereafter (13th
 * and 17th), a monk learns an additional style strike" — 4 total picks by
 * 17th level (see `model/monkStyleStrikes.ts` for the budget math). "At 15th
 * level, he can designate up to two of his unarmed strikes each round as a
 * style strike" is a USAGE upgrade to the same pool (see the class's
 * already-generic `uses.maxFormula: ceil(@class.level / 14)` per-round
 * resource, verified working in `resources.ts`/`monk-unchained.test.ts`) —
 * not a 5th pick, so it has no entry here.
 *
 * There is no `minLevel` tiering (unlike ki powers/hexes) — every style
 * strike in the core list is available starting at the 5th-level baseline;
 * only the COUNT a monk knows grows with level.
 *
 * Modelling posture: every style strike is a rider resolved "whenever a monk
 * makes a flurry of blows, he can designate one of his unarmed strikes ... as
 * a style strike" — a per-attack, per-round choice with no unconditional
 * numeric effect on the monk's own sheet (the effect only applies to ONE
 * designated strike in a specific round, not persistently). Same discipline
 * as `monk-ki-powers.ts`/`witch-hexes.ts`: every entry here is
 * `displayOnly: true` with `changes: []`, task brief confirmed.
 */

import type { Change, ContextNote, MonkStyleStrike, RefData, SourceRef } from "@pf1/schema";

export interface MonkStyleStrikeDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** True if this strike is limited to a fist-only (unarmed, not kick) unarmed strike. */
  fistOnly?: boolean;
  /** True if this strike is limited to a kick-only unarmed strike. */
  kickOnly?: boolean;
  /** Typed modifiers granted by the strike (empty for every entry — see file doc comment). */
  changes: Change[];
  contextNotes?: ContextNote[];
  /** Always true here — no style strike has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawStrike {
  id: string;
  name: string;
  summary: string;
  fistOnly?: boolean;
  kickOnly?: boolean;
  contextNotes?: ContextNote[];
}

function toDef(e: RawStrike): MonkStyleStrikeDef {
  return {
    id: e.id,
    name: e.name,
    summary: e.summary,
    fistOnly: e.fistOnly,
    kickOnly: e.kickOnly,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  };
}

const STYLE_STRIKE_LIST: MonkStyleStrikeDef[] = [
  toDef({
    id: "break",
    name: "Break",
    summary:
      "When grappled, add the strike's damage as a bonus on your grapple check or Escape Artist check to break free.",
  }),
  toDef({
    id: "defensiveSpin",
    name: "Defensive Spin",
    fistOnly: true,
    summary:
      "Gain a +4 dodge bonus to AC against the struck target's attacks until your next turn.",
    contextNotes: [note("Requires a fist (unarmed, not kick) strike.", "ac")],
  }),
  toDef({
    id: "dirtyStrikes",
    name: "Dirty Strikes",
    summary:
      "Perform a free dirty trick combat maneuver at a -5 penalty against the struck target.",
  }),
  toDef({
    id: "elbowSmash",
    name: "Elbow Smash",
    fistOnly: true,
    summary: "If the strike hits, make an additional attack at -5 dealing nonlethal damage.",
    contextNotes: [note("Requires a fist strike.")],
  }),
  toDef({
    id: "flyingKick",
    name: "Flying Kick",
    kickOnly: true,
    summary: "Move up to your fast movement bonus and make a kick attack as part of the flurry.",
    contextNotes: [note("Requires a kick strike.")],
  }),
  toDef({
    id: "footStomp",
    name: "Foot Stomp",
    kickOnly: true,
    summary:
      "The struck target's movement is restricted to spaces adjacent to you until your next turn.",
    contextNotes: [note("Requires a kick strike.")],
  }),
  toDef({
    id: "hammerblow",
    name: "Hammerblow",
    fistOnly: true,
    summary: "Roll the strike's unarmed damage twice and add both results together.",
    contextNotes: [note("Requires a fist strike and both hands free.")],
  }),
  toDef({
    id: "headButt",
    name: "Head-Butt",
    summary:
      "On a hit, make a free combat maneuver check; success staggers the target for 1 round.",
  }),
  toDef({
    id: "knockbackKick",
    name: "Knockback Kick",
    kickOnly: true,
    summary:
      "On a hit, make a free combat maneuver check to push the target back 10 feet (plus 10 more per 5 points you exceed its CMD by).",
    contextNotes: [note("Requires a kick strike.")],
  }),
  toDef({
    id: "legSweep",
    name: "Leg Sweep",
    kickOnly: true,
    summary: "On a hit, make a free trip attempt against the struck target.",
    contextNotes: [note("Requires a kick strike.")],
  }),
  toDef({
    id: "overbearingAssault",
    name: "Overbearing Assault",
    summary: "Perform a free reposition combat maneuver at a -5 penalty against the struck target.",
  }),
  toDef({
    id: "rabbitPunch",
    name: "Rabbit Punch",
    fistOnly: true,
    summary: "The strike's critical threat range increases by 1, with a +2 bonus to confirm crits.",
    contextNotes: [note("Requires a fist strike.")],
  }),
  toDef({
    id: "shatteringPunch",
    name: "Shattering Punch",
    fistOnly: true,
    summary: "The strike bypasses the target's damage reduction and hardness.",
    contextNotes: [note("Requires a fist strike.")],
  }),
  toDef({
    id: "spinKick",
    name: "Spin Kick",
    kickOnly: true,
    summary: "The strike is made against the target's flat-footed AC.",
    contextNotes: [note("Requires a kick strike.")],
  }),
  toDef({
    id: "throatCrush",
    name: "Throat Crush",
    fistOnly: true,
    summary:
      "On a hit, hamper the target's speech (as the caster's croak spellblight) for 1 round.",
    contextNotes: [note("Requires a fist strike.")],
  }),
];

export const MONK_STYLE_STRIKES: Record<string, MonkStyleStrikeDef> = Object.fromEntries(
  STYLE_STRIKE_LIST.map((s) => [s.id, s]),
);

export const MONK_STYLE_STRIKE_IDS: readonly string[] = STYLE_STRIKE_LIST.map((s) => s.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3c: `RefData.monkStyleStrikes` (see that type's doc
 * comment) is the full published style-strike catalog — 15 entries, an
 * EXACT 1:1 match with this file's 15 hand-authored entries (verified by
 * normalized name; no drift, no alias, no orphan on either side — unlike
 * every other catalog imported so far, there is no vendored-only "extra"
 * entry here at all). Kept for the same "picker browses the merged catalog,
 * hand-authored wins on a name collision" shape `rage-powers.ts` documents,
 * even though today it only ever attaches vendored prose to an existing
 * hand-authored row.
 */

function normalizeStyleStrikeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. Unused today (no vendored-only entry exists — see file doc comment) but kept for parity if a future splatbook style strike is vendored without an initial hand-authored counterpart. */
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

/** A catalog entry the picker can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry rendered display-only (see file doc comment — none exist today). */
export interface MergedMonkStyleStrikeEntry extends MonkStyleStrikeDef {
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: MonkStyleStrike): MergedMonkStyleStrikeEntry {
  return {
    id: entry.id,
    name: entry.name,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked style-strike id (`doc.build.monkStyleStrikes` entries) to
 * its definition — hand-authored table first (mechanics-authoritative),
 * falling back to the vendored catalog for an id that only exists there
 * (none today — see file doc comment). Used by `collect.ts`/`archetypes.ts`
 * instead of indexing `MONK_STYLE_STRIKES` directly.
 */
export function resolveMonkStyleStrike(
  id: string,
  refData: RefData,
): MonkStyleStrikeDef | undefined {
  const hand = MONK_STYLE_STRIKES[id];
  if (hand) return hand;
  const vendored = refData.monkStyleStrikes?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name) against a hand-authored entry REPLACED by
 * that hand-authored def (keeping its id and real mechanics, but carrying
 * the vendored entry's prose/sources along for display). Per the file doc
 * comment, this is every one of the 15 vendored entries today — there is no
 * vendored-only row to append. `!entry.displayOnly` marks which rows carry
 * real mechanics, for the picker's "M" badge.
 */
export function mergedMonkStyleStrikeCatalog(refData: RefData): MergedMonkStyleStrikeEntry[] {
  const handByNormName = new Map<string, MonkStyleStrikeDef>();
  for (const s of STYLE_STRIKE_LIST) {
    handByNormName.set(normalizeStyleStrikeName(s.name), s);
  }

  const vendored = Object.values(refData.monkStyleStrikes ?? {});
  const merged: MergedMonkStyleStrikeEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeStyleStrikeName(v.name));
    merged.push(
      handMatch
        ? { ...handMatch, description: v.description, sources: v.sources }
        : vendoredToDef(v),
    );
  }
  return merged;
}
