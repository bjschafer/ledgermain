/**
 * Pure Hero Point transitions for the live tracker. Each function returns a NEW
 * document — no mutation — so they are trivially unit-testable and safe as React
 * state reducers. Hero Points are a PF1 optional rule: a small pool (standard
 * maximum = 3) that the player spends at the table for mechanical benefits.
 * They are purely a tracker-level concept; the rules engine never reads them.
 */

import type { CharacterDoc } from "@pf1/schema";

/** Standard maximum number of hero points a character may hold at once (PF1 CRB). */
export const HERO_POINT_CAP = 3;

/**
 * What a hero point buys (Advanced Player's Guide p.322-325). This app is a
 * tracker, not a resolver — it never rolls or auto-applies any of these, so
 * the pool above is the only mechanical state; this table is purely a
 * reference the panel renders so a table doesn't need the book open to
 * remember the menu. Hand-authored from the published rule text (clean-room
 * — see CLAUDE.md §Licensing), not extracted from Foundry data.
 */
export interface HeroPointSpendOption {
  label: string;
  cost: string;
  effect: string;
}

export const HERO_POINT_SPEND_OPTIONS: readonly HeroPointSpendOption[] = [
  { label: "Bonus", cost: "1", effect: "+8 luck bonus on one d20 roll before rolling (+4 after)." },
  { label: "Reroll", cost: "1", effect: "Reroll any one d20 roll; the second result stands." },
  { label: "Extra action", cost: "1", effect: "Gain one additional move or standard action now." },
  {
    label: "Act out of turn",
    cost: "1",
    effect: "Act immediately, then resume normal init order.",
  },
  {
    label: "Inspiration",
    cost: "1",
    effect: "Ask the GM for a hint; refunded if there's none to give.",
  },
  {
    label: "Recall",
    cost: "1",
    effect: "Recast a spell already cast today, or regain one use of a daily ability.",
  },
  {
    label: "Cheat death",
    cost: "2",
    effect: "Instead of dying, drop to -1 HP and stabilize automatically.",
  },
] as const;

/** Only one hero point may be spent per combat round (Cheat Death is the sole exception). */
export const HERO_POINT_COMBAT_LIMIT_NOTE =
  "At most 1 hero point per round in combat (Cheat Death is the exception).";

function withHeroPoints(doc: CharacterDoc, n: number): CharacterDoc {
  return { ...doc, live: { ...doc.live, heroPoints: n } };
}

function clampToRange(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Current hero points held (0 when the field is absent). */
export function heroPoints(doc: CharacterDoc): number {
  return doc.live.heroPoints ?? 0;
}

/**
 * Whether hero points are enabled for this character. Absent = true (the
 * historical default); set `settings.heroPointsEnabled` to false to opt out of
 * the optional rule entirely.
 */
export function heroPointsEnabled(doc: CharacterDoc): boolean {
  return doc.build.settings?.heroPointsEnabled ?? true;
}

/** Gain one hero point, capped at `cap` (default: HERO_POINT_CAP). */
export function gainHeroPoint(doc: CharacterDoc, cap = HERO_POINT_CAP): CharacterDoc {
  const next = clampToRange(heroPoints(doc) + 1, 0, cap);
  return withHeroPoints(doc, next);
}

/** Spend one hero point, floored at 0 (no-op when already at 0). */
export function spendHeroPoint(doc: CharacterDoc): CharacterDoc {
  const next = Math.max(0, heroPoints(doc) - 1);
  return withHeroPoints(doc, next);
}

/**
 * Set the hero point pool to an explicit value, clamped to 0..cap.
 * NaN is treated as 0.
 */
export function setHeroPoints(
  doc: CharacterDoc,
  value: number,
  cap = HERO_POINT_CAP,
): CharacterDoc {
  const next = clampToRange(value, 0, cap);
  return withHeroPoints(doc, next);
}
