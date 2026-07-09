/**
 * Pure Medium séance transitions (issue #65) — the live daily spirit pick
 * (`live.mediumSpirit`, mirroring `model/vigilanteIdentity.ts`'s "live
 * display-forward chip" shape) plus the Influence counter (`live.
 * mediumInfluence`, mirroring `model/heroPoints.ts`'s clamped-counter shape).
 * See both fields' schema doc comments in `@pf1/schema` `character.ts` for
 * why neither is touched by `model/rest.ts`'s `restNewDay` — a medium
 * re-affirms their spirit and influence bookkeeping by explicitly performing
 * a séance (this module's `performSeance`), not as an implicit side effect
 * of the global "New day" rest button.
 *
 * Influence is clamped to 0-5 (PF1 RAW: at 5 "the spirit takes over" — the
 * medium becomes an NPC under GM control until the next day, a full loss of
 * player control this app has no way to represent as sheet state, so 5 is
 * simply the counter's ceiling, not a blocked/disabled state). 3+ and 5 are
 * surfaced by `MediumSpiritPanel` as soft warning banners, reading each
 * spirit's own `influencePenaltySummary` from `@pf1/engine` `MEDIUM_SPIRITS`
 * — never auto-applied as a `Change` (see that table's file doc comment).
 */

import type { CharacterDoc } from "@pf1/schema";

/** Influence is a 0-5 point counter (PF1 RAW: 5 = "the spirit takes over"). */
export const MEDIUM_INFLUENCE_MAX = 5;

/** The medium's class level (0 for a non-medium, or a stale/multiclassed doc). */
export function mediumLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "medium")?.level ?? 0;
}

export function isMedium(doc: CharacterDoc): boolean {
  return mediumLevel(doc) > 0;
}

/** The currently channeled legendary spirit tag, or `undefined` if no séance has been performed today. */
export function currentMediumSpirit(doc: CharacterDoc): string | undefined {
  return doc.live.mediumSpirit;
}

/** Current Influence (0 when the field is absent). */
export function mediumInfluence(doc: CharacterDoc): number {
  return doc.live.mediumInfluence ?? 0;
}

function clampInfluence(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(MEDIUM_INFLUENCE_MAX, Math.trunc(n)));
}

/**
 * Perform a fresh séance: channel `spiritTag` (a `MEDIUM_SPIRITS` key,
 * tolerated even if unrecognized — same "stale id tolerated" posture as
 * `shamanSpirit`) and reset Influence to 0, matching PF1 RAW's "each
 * morning" ritual — every séance, whether it's the same spirit as
 * yesterday or a different one, starts influence fresh.
 */
export function performSeance(doc: CharacterDoc, spiritTag: string): CharacterDoc {
  return { ...doc, live: { ...doc.live, mediumSpirit: spiritTag, mediumInfluence: 0 } };
}

/** Clear the current séance entirely (no spirit channeled, no Influence). */
export function endSeance(doc: CharacterDoc): CharacterDoc {
  return { ...doc, live: { ...doc.live, mediumSpirit: undefined, mediumInfluence: 0 } };
}

/** Set Influence to an explicit value, clamped to 0-5. NaN is treated as 0. */
export function setMediumInfluence(doc: CharacterDoc, value: number): CharacterDoc {
  return { ...doc, live: { ...doc.live, mediumInfluence: clampInfluence(value) } };
}

/** Gain 1 point of Influence (spirit surge, a broken taboo, ...), capped at 5. */
export function gainMediumInfluence(doc: CharacterDoc): CharacterDoc {
  return setMediumInfluence(doc, mediumInfluence(doc) + 1);
}

/** Lose 1 point of Influence (e.g. Propitiation, 9th level), floored at 0. */
export function loseMediumInfluence(doc: CharacterDoc): CharacterDoc {
  return setMediumInfluence(doc, mediumInfluence(doc) - 1);
}

/** True once Influence reaches 3+ — the spirit's own influence-penalty text applies (soft warning). */
export function hasInfluencePenalty(doc: CharacterDoc): boolean {
  return mediumInfluence(doc) >= 3;
}

/** True at Influence 5 — "the spirit takes over" (soft warning; this app can't adjudicate it). */
export function spiritHasTakenOver(doc: CharacterDoc): boolean {
  return mediumInfluence(doc) >= MEDIUM_INFLUENCE_MAX;
}
