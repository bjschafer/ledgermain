/**
 * Pure rage-power transitions (issue #65/#67). Power ids are just entries in
 * `build.ragePowers`, mirroring `toggleWitchHex` in `model/witchHexes.ts` —
 * the engine's `RAGE_POWERS` table maps each to its `changes[]`/
 * `contextNotes` (mostly display-only; a few carry a real buff-gated Change
 * that applies only while Rage is active — issue #75, see that table's doc
 * comment), applied through the same change-collection path as
 * hexes/discoveries/arcana (see `@pf1/engine` `collect.ts`).
 *
 * Shared by BOTH `barbarian` (chained) and `barbarianUnchained` — see
 * `RAGE_POWERS`'s doc comment for why the catalog is one shared table rather
 * than split per edition. `barbarianLevel` therefore SUMS both classes'
 * levels (mirroring `@pf1/engine` `defenses.ts`'s own `barbarianLevel()` —
 * a character would only ever have one of the two, but summing is correct
 * regardless of which).
 *
 * Budget (PF1 CRB, verified against aonprd.com's class table, and confirmed
 * identical for the Unchained rewrite): a barbarian gains a rage power at
 * 2nd level and every two levels thereafter (2nd, 4th, ..., 20th — 10 total
 * by 20th) — `floor((level - 2) / 2) + 1` for level >= 2. Each copy of the
 * "Extra Rage Power" feat (a stackable general feat — APG: "You can gain
 * Extra Rage Power multiple times") adds one more, counted by OCCURRENCE in
 * `doc.build.feats` (not just presence) — same "manually-added duplicates"
 * convention `expectedWitchHexCount`/`expectedMagusArcanaCount` use for their
 * own "Extra X" feats.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets, and a rage power's `minLevel` gate is likewise a soft reminder
 * only (see `RagePowerPicker`'s "Requires barbarian Nth" hint).
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** Combined barbarian (chained + Unchained) level — 0 for a non-barbarian. */
export function barbarianLevel(doc: CharacterDoc): number {
  return doc.identity.classes
    .filter((c) => c.tag === "barbarian" || c.tag === "barbarianUnchained")
    .reduce((sum, c) => sum + c.level, 0);
}

export function hasRagePower(doc: CharacterDoc, id: string): boolean {
  return (doc.build.ragePowers ?? []).includes(id);
}

/** Add or remove a rage power id. No-op add if already present (no duplicates). */
export function toggleRagePower(doc: CharacterDoc, powerId: string): CharacterDoc {
  const current = doc.build.ragePowers ?? [];
  const has = current.includes(powerId);
  const ragePowers = has ? current.filter((p) => p !== powerId) : [...current, powerId];
  return { ...doc, build: { ...doc.build, ragePowers } };
}

/** The number of rage powers currently chosen. */
export function chosenRagePowerCount(doc: CharacterDoc): number {
  return (doc.build.ragePowers ?? []).length;
}

/**
 * Base CRB/Unchained progression: one rage power at 2nd level, one more
 * every 2 levels thereafter (4th, 6th, ..., 20th) — equivalently
 * `floor((level - 2) / 2) + 1`. Returns 0 below 2nd level.
 */
function baseRagePowerCount(level: number): number {
  if (level < 2) return 0;
  return Math.floor((level - 2) / 2) + 1;
}

/**
 * How many copies of the "Extra Rage Power" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable, the same convention `expectedWitchHexCount`
 * relies on for "Extra Hex".
 */
function extraRagePowerFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Rage Power") count++;
  }
  return count;
}

/**
 * The number of rage powers a barbarian is expected to know at their
 * current (combined chained + Unchained) level: the base progression plus
 * one per "Extra Rage Power" feat. Returns 0 for a non-barbarian.
 */
export function expectedRagePowerCount(doc: CharacterDoc, refData: RefData): number {
  const level = barbarianLevel(doc);
  if (level <= 0) return 0;
  return baseRagePowerCount(level) + extraRagePowerFeatCount(doc, refData);
}

/**
 * True when the chosen rage powers should prompt a soft warning: more than
 * the expected count. Never used to block — only to color the count badge
 * (see `witchHexesNeedWarning` for the identical pattern).
 */
export function ragePowersNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenRagePowerCount(doc) > expectedRagePowerCount(doc, refData);
}
