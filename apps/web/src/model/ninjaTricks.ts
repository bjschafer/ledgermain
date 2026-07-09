/**
 * Pure ninja-trick transitions (issue #65 wave B). Trick ids are just
 * entries in `build.ninjaTricks`, mirroring `toggleWitchHex` in
 * `model/witchHexes.ts` — the engine's `NINJA_TRICKS` table maps each to its
 * (display-only) `changes[]`/`contextNotes`, applied through the same
 * change-collection path as hexes/revelations/discoveries (see `@pf1/engine`
 * `collect.ts`).
 *
 * Budget (PF1 Ultimate Combat, verified against Archives of Nethys/
 * d20pfsrd — no per-trick vendored data to cross-check against, see
 * `ninja-tricks.ts`'s doc comment): "Starting at 2nd level, a ninja gains
 * one ninja trick. She gains one additional ninja trick for every 2 levels
 * attained after 2nd" — 2nd, 4th, ..., 20th (10 total by 20th). Master
 * tricks (10th level, minLevel-gated in `NINJA_TRICKS`) are NOT an extra
 * pick — chosen "in place of" a normal trick, same budget, same posture as
 * `WITCH_HEXES`' major/grand tiers (see that file's doc comment). Each copy
 * of the "Extra Ninja Trick" feat (RAW repeatable — vendored `feats.json`:
 * "Special: You can gain this feat multiple times") adds one more, counted
 * by OCCURRENCE in `doc.build.feats` (not just presence) — same
 * "manually-added duplicates" convention `expectedWitchHexCount` uses for
 * "Extra Hex".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The ninja's class level (0 for a non-ninja, or a stale/multiclassed doc). */
export function ninjaLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "ninja")?.level ?? 0;
}

export function hasNinjaTrick(doc: CharacterDoc, id: string): boolean {
  return (doc.build.ninjaTricks ?? []).includes(id);
}

/** Add or remove a trick id. No-op add if already present (no duplicates). */
export function toggleNinjaTrick(doc: CharacterDoc, trickId: string): CharacterDoc {
  const current = doc.build.ninjaTricks ?? [];
  const has = current.includes(trickId);
  const ninjaTricks = has ? current.filter((t) => t !== trickId) : [...current, trickId];
  return { ...doc, build: { ...doc.build, ninjaTricks } };
}

/** The number of tricks currently chosen. */
export function chosenNinjaTrickCount(doc: CharacterDoc): number {
  return (doc.build.ninjaTricks ?? []).length;
}

/** UC progression: one trick at 2nd level, one more every even level thereafter (equivalently `floor(level/2)`). */
function baseTrickCount(level: number): number {
  if (level < 2) return 0;
  return Math.floor(level / 2);
}

/**
 * How many copies of the "Extra Ninja Trick" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable, the same convention `extraHexFeatCount`
 * relies on for "Extra Hex".
 */
function extraNinjaTrickFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Ninja Trick") count++;
  }
  return count;
}

/**
 * The number of tricks a ninja is expected to know at their current level:
 * the base UC progression plus one per "Extra Ninja Trick" feat. Returns 0
 * for a non-ninja.
 */
export function expectedNinjaTrickCount(doc: CharacterDoc, refData: RefData): number {
  const level = ninjaLevel(doc);
  if (level <= 0) return 0;
  return baseTrickCount(level) + extraNinjaTrickFeatCount(doc, refData);
}

/**
 * True when the chosen tricks should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `witchHexesNeedWarning` for the identical pattern).
 */
export function ninjaTricksNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenNinjaTrickCount(doc) > expectedNinjaTrickCount(doc, refData);
}
