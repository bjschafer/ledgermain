/**
 * Encounter tracking for a statblock page: hit points and conditions for the
 * one creature this browser tab has open. Pure logic only; the panel UI and
 * the sessionStorage hook live elsewhere.
 *
 * State stores damage *taken*, not current hp: toggling a template mid-fight
 * moves the maximum, and damage already dealt should ride along rather than
 * being rescaled or lost.
 */

import type { Monster } from "@pf1/schema";

export interface TrackState {
  /** Damage taken so far; >= 0 and may exceed the printed hp (negative current hp). */
  damage: number;
  /** Active condition ids, in the order they were marked. */
  conditions: string[];
  /**
   * Adjustment keys the bestiary page had applied, persisted with the rest so
   * a reload restores the whole worksheet. The summon page keeps its own
   * template selection in the URL and leaves this empty.
   */
  adjustments: string[];
}

export const EMPTY_TRACK: TrackState = { damage: 0, conditions: [], adjustments: [] };

export function isTrackEmpty(state: TrackState): boolean {
  return state.damage === 0 && state.conditions.length === 0 && state.adjustments.length === 0;
}

/** Keeps the arithmetic printable; no monster survives anywhere near this. */
export const DAMAGE_CAP = 99_999;

export function clampDamage(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(DAMAGE_CAP, Math.trunc(n)));
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** Tolerant decoder for a stored record: anything malformed collapses to empty. */
export function decodeTrackState(raw: string | null): TrackState {
  if (!raw) return EMPTY_TRACK;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_TRACK;
    const rec = parsed as Record<string, unknown>;
    return {
      damage: clampDamage(typeof rec.damage === "number" ? rec.damage : 0),
      conditions: strings(rec.conditions),
      adjustments: strings(rec.adjustments),
    };
  } catch {
    return EMPTY_TRACK;
  }
}

export function encodeTrackState(state: TrackState): string {
  return JSON.stringify(state);
}

export type HpStatusKind = "up" | "disabled" | "dying" | "dead" | "destroyed";

export interface HpStatusResult {
  kind: HpStatusKind;
  /** One-line rules reminder for the page; null while the creature is above 0. */
  text: string | null;
  /** Condition entry to link the reminder to, when one exists in the reference data. */
  conditionId?: string;
  /**
   * Set when the hp line carries regeneration: such a creature cannot die
   * while its regeneration functions, so a "dying"/"dead" reading needs this
   * caveat next to it.
   */
  regenerationCaveat?: string;
}

const REGENERATION_CAVEAT =
  "It has regeneration (see the hp line): it cannot die while its regeneration " +
  "functions, only fall unconscious.";

/**
 * The CRB "Injury and Death" ladder read against the printed statblock:
 * disabled at exactly 0, dying below 0, dead at negative hp equal to Con.
 * Undead and constructs are destroyed at 0 by their creature-type traits, as
 * is anything with no Con score at all (the nonability rule).
 */
export function hpStatus(monster: Monster, current: number): HpStatusResult {
  if (current > 0) return { kind: "up", text: null };

  const type = monster.creatureType;
  const con = monster.abilityScores?.con;
  if (type === "undead" || type === "construct" || con === undefined) {
    return {
      kind: "destroyed",
      text: "Destroyed: undead, constructs, and creatures without a Constitution score are removed from play at 0 hit points.",
    };
  }

  if (current === 0) {
    return {
      kind: "disabled",
      conditionId: "disabled",
      text: "Disabled: one move or standard action a round, and a strenuous action deals 1 damage.",
    };
  }

  const regenerating = monster.hpNote?.toLowerCase().includes("regeneration") ?? false;
  const deadAt = -con;
  if (current <= deadAt) {
    return {
      kind: "dead",
      text: `Dead: hit points at or below ${deadAt} (its Constitution score in the negatives).`,
      ...(regenerating ? { regenerationCaveat: REGENERATION_CAVEAT } : {}),
    };
  }
  return {
    kind: "dying",
    conditionId: "unconscious",
    text: `Dying: unconscious, loses 1 hp each round until stabilized. Dead at ${deadAt} hp.`,
    ...(regenerating ? { regenerationCaveat: REGENERATION_CAVEAT } : {}),
  };
}
