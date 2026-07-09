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

import type { Change, ContextNote } from "@pf1/schema";

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
