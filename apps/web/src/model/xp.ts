/**
 * Pure XP transitions + advancement-track thresholds for the live tracker.
 * XP is a PF1 optional rule (issue #27) — off by default because the owner's
 * table plays milestone leveling. When enabled, this is purely a tracker-level
 * display: "you have earned N XP, the next level starts at M." Nothing here
 * (or anywhere in the engine) ever auto-levels the character — `level`
 * (`identity.classes[].level`, see `totalLevel` in `model/doc.ts`) stays a
 * build choice the player makes at the table. That's also why the threshold
 * table lives here in the web model rather than in `packages/engine`: the
 * engine's `compute()` never reads or needs XP, so pulling it into the
 * pure-rules crown jewel would be unjustified surface area for a value the
 * engine has no use for.
 *
 * The three tracks (slow/medium/fast) are hand-authored, clean-room, from the
 * published Pathfinder RPG Core Rulebook's Character Advancement table (Table
 * 3-2 / "Table: Character Advancement and Level-Dependent Bonuses"), which is
 * Open Game Content under the OGL — see CLAUDE.md §Licensing. No Foundry
 * source was read or referenced to produce these numbers.
 */

import type { CharacterDoc } from "@pf1/schema";

import { totalLevel } from "./doc.js";

export type XpTrack = "slow" | "medium" | "fast";

/** Default advancement track when `build.settings.xpTrack` is unset. */
export const DEFAULT_XP_TRACK: XpTrack = "medium";

/**
 * Cumulative XP required to *be* at a given character level. Index `i`
 * (0-based) holds the threshold for character level `i + 1` — e.g.
 * `XP_TRACKS.medium[1] === 2000` is the XP required to reach level 2.
 * Level 1 always starts at 0 XP. Values run through level 20.
 */
export const XP_TRACKS: Record<XpTrack, readonly number[]> = {
	slow: [
		0, 3_000, 7_500, 14_000, 23_000, 35_000, 53_000, 77_000, 115_000, 160_000,
		235_000, 330_000, 475_000, 665_000, 955_000, 1_350_000, 1_900_000,
		2_700_000, 3_850_000, 5_350_000,
	],
	medium: [
		0, 2_000, 5_000, 9_000, 15_000, 23_000, 35_000, 51_000, 75_000, 105_000,
		155_000, 220_000, 315_000, 445_000, 635_000, 890_000, 1_300_000,
		1_800_000, 2_550_000, 3_600_000,
	],
	fast: [
		0, 1_300, 3_300, 6_000, 10_000, 15_000, 23_000, 34_000, 50_000, 71_000,
		105_000, 145_000, 210_000, 295_000, 425_000, 600_000, 850_000, 1_200_000,
		1_700_000, 2_400_000,
	],
} as const;

/** Highest character level with a known threshold in the advancement tables. */
export const MAX_TRACKED_LEVEL = 20;

function clampToRange(n: number, min: number, max: number): number {
	if (Number.isNaN(n)) return min;
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Current total XP earned (0 when the field is absent). */
export function xp(doc: CharacterDoc): number {
	return doc.live.xp ?? 0;
}

/**
 * Whether XP tracking is enabled for this character. Absent = false — unlike
 * hero points, XP defaults OFF because the app's default posture is milestone
 * leveling; set `settings.xpEnabled` to opt in to the optional rule.
 */
export function xpEnabled(doc: CharacterDoc): boolean {
	return doc.build.settings?.xpEnabled ?? false;
}

/** The character's chosen advancement track (default `"medium"`). */
export function xpTrack(doc: CharacterDoc): XpTrack {
	return doc.build.settings?.xpTrack ?? DEFAULT_XP_TRACK;
}

/**
 * XP required to advance from `currentLevel` to `currentLevel + 1` on the
 * given track. Returns `null` once `currentLevel` is at or beyond
 * `MAX_TRACKED_LEVEL` (no further published threshold). `currentLevel` is
 * taken as a plain argument (e.g. from `totalLevel(doc)`) rather than
 * recomputed here, so this stays a cheap pure function with no dependency on
 * the engine or a `DerivedSheet`.
 */
export function nextLevelAt(
	track: XpTrack,
	currentLevel: number,
): number | null {
	const table = XP_TRACKS[track];
	if (currentLevel < 1 || currentLevel >= table.length) return null;
	return table[currentLevel] ?? null;
}

/** Add `amount` XP, floored at 0 total (negative `amount` is allowed to correct entries). */
export function addXp(doc: CharacterDoc, amount: number): CharacterDoc {
	const next = clampToRange(xp(doc) + amount, 0, Number.MAX_SAFE_INTEGER);
	return { ...doc, live: { ...doc.live, xp: next } };
}

/** Set total XP to an explicit value, clamped to >= 0. NaN is treated as 0. */
export function setXp(doc: CharacterDoc, value: number): CharacterDoc {
	const next = clampToRange(value, 0, Number.MAX_SAFE_INTEGER);
	return { ...doc, live: { ...doc.live, xp: next } };
}

/** Snapshot of a character's XP standing, for the tracker panel. */
export interface XpProgress {
	current: number;
	track: XpTrack;
	level: number;
	/** XP required for `level + 1`, or `null` past `MAX_TRACKED_LEVEL`. */
	nextThreshold: number | null;
	/** True once `current` has reached (or passed) `nextThreshold`. */
	readyToLevel: boolean;
}

/**
 * Resolve a character's current XP progress against its chosen track. `level`
 * is `totalLevel(doc)` (sum of class levels) — the player's build choice, not
 * anything XP-derived.
 */
export function xpProgress(doc: CharacterDoc): XpProgress {
	const current = xp(doc);
	const track = xpTrack(doc);
	const level = totalLevel(doc);
	const nextThreshold = nextLevelAt(track, level);
	return {
		current,
		track,
		level,
		nextThreshold,
		readyToLevel: nextThreshold != null && current >= nextThreshold,
	};
}
