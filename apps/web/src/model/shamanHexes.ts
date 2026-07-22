/**
 * Pure shaman-hex transitions (issue #65). Hex ids are just entries in
 * `build.shamanHexes`, mirroring `toggleOracleRevelation` in
 * `model/oracleRevelations.ts` — the engine's `SHAMAN_SPIRITS[tag].hexes`
 * table maps each to its (display-only) `summary`, applied through the same
 * class-features surfacing path as revelations (see `@pf1/engine`
 * `archetypes.ts` `collectGrantedFeatures`).
 *
 * Budget (PF1 Advanced Class Guide, verified against aonprd.com's Shaman
 * class page): a shaman learns her first hex at 2nd level, then a new one at
 * 4th, 8th, 10th, 12th, 16th, 18th, and 20th level — 8 total by 20th. This is
 * NOT the "every 4 levels from 2nd" cadence a witch's own Hex table uses (a
 * witch gains one every EVEN level from 2nd on — 10 by 20th) — the two
 * classes' hex tables merely share a name, not a progression, so this module
 * hand-rolls its own `SHAMAN_HEX_LEVELS` rather than importing one from a
 * (nonexistent, and intentionally not built here — see `shaman-spirits.ts`'s
 * doc comment) shared hex-progression helper. Each copy of the "Extra Hex"
 * feat (a stackable general feat both witch and shaman can take) adds one
 * more, counted by OCCURRENCE in `doc.build.feats` — same "manually-added
 * duplicates" convention `expectedOracleRevelationCount` uses for "Extra
 * Revelation".
 *
 * Hexes are PER-SPIRIT: only hex ids that resolve AND belong to the
 * character's currently-chosen `build.shamanSpirit` count toward the chosen
 * total — a leftover pick from a spirit the player has since changed away
 * from silently drops out, the same tolerance `chosenOracleRevelationCount`
 * applies for a stale mystery.
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import { findShamanHex } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

/** True when `id` is a GENERAL shaman hex (the vendored, spirit-agnostic ACG "Shaman Hexes" table — issue #74 Phase 3b), not one of the current spirit's own 5 hexes. */
function isGeneralShamanHex(id: string, refData: RefData): boolean {
  return !findShamanHex(id) && refData.shamanHexes?.[id] !== undefined;
}

/** The shaman's class level (0 for a non-shaman, or a stale/multiclassed doc). */
export function shamanLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "shaman")?.level ?? 0;
}

export function hasShamanHex(doc: CharacterDoc, id: string): boolean {
  return (doc.build.shamanHexes ?? []).includes(id);
}

/** Add or remove a hex id. No-op add if already present (no duplicates). */
export function toggleShamanHex(doc: CharacterDoc, hexId: string): CharacterDoc {
  const current = doc.build.shamanHexes ?? [];
  const has = current.includes(hexId);
  const shamanHexes = has ? current.filter((h) => h !== hexId) : [...current, hexId];
  return { ...doc, build: { ...doc.build, shamanHexes } };
}

/**
 * The number of hexes currently chosen that resolve against the character's
 * CURRENT spirit (see file doc comment) — a raw `.length` would over-count a
 * leftover pick from a since-abandoned spirit.
 */
export function chosenShamanHexCount(doc: CharacterDoc): number {
  const spirit = doc.build.shamanSpirit;
  if (!spirit) return 0;
  return (doc.build.shamanHexes ?? []).filter((id) =>
    findShamanHex(id)?.id.startsWith(`${spirit}:`),
  ).length;
}

/**
 * The number of chosen hexes that resolve against the vendored GENERAL
 * shaman-hex catalog (issue #74 Phase 3b) instead of the current spirit's
 * own list — counted separately from `chosenShamanHexCount` (which only
 * covers spirit-scoped ids) so the two can be summed for a total budget
 * count without double-counting or needing to change that function's
 * existing signature.
 */
export function chosenGeneralShamanHexCount(doc: CharacterDoc, refData: RefData): number {
  return (doc.build.shamanHexes ?? []).filter((id) => isGeneralShamanHex(id, refData)).length;
}

/** ACG progression thresholds: 2nd, 4th, 8th, 10th, 12th, 16th, 18th, 20th. */
const SHAMAN_HEX_LEVELS: readonly number[] = [2, 4, 8, 10, 12, 16, 18, 20];

/**
 * Base ACG progression: one hex at each threshold in {@link SHAMAN_HEX_LEVELS}
 * reached. Returns 0 for a non-shaman (level 0).
 */
function baseHexCount(level: number): number {
  if (level <= 0) return 0;
  return SHAMAN_HEX_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Hex" feat are in `doc.build.feats` — matched
 * by name (feat ids are opaque RefData keys), counted by occurrence since the
 * feat is stackable (each copy grants one more hex), the same convention
 * `expectedOracleRevelationCount` relies on for "Extra Revelation". The
 * vendored "Extra Hex" feat is shared between witch and shaman (both grant
 * "one hex" per copy), so no shaman-specific filtering is needed here.
 */
function extraHexFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Hex") count++;
  }
  return count;
}

/**
 * The number of hexes a shaman is expected to know at their current level:
 * the base ACG progression plus one per "Extra Hex" feat. Returns 0 for a
 * non-shaman.
 */
export function expectedShamanHexCount(doc: CharacterDoc, refData: RefData): number {
  const level = shamanLevel(doc);
  if (level <= 0) return 0;
  return baseHexCount(level) + extraHexFeatCount(doc, refData);
}

/**
 * True when the chosen hexes should prompt a soft warning: more than the
 * expected count, counting BOTH spirit-scoped and general-catalog picks (see
 * `chosenGeneralShamanHexCount`) — both draw from the same ACG "Hex" budget.
 * Never used to block — only to color the count badge (see
 * `oracleRevelationsNeedWarning` for the identical pattern).
 */
export function shamanHexesNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  const chosen = chosenShamanHexCount(doc) + chosenGeneralShamanHexCount(doc, refData);
  return chosen > expectedShamanHexCount(doc, refData);
}
