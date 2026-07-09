/**
 * Pure witch-hex transitions (issue #65). Hex ids are just entries in
 * `build.witchHexes`, mirroring `toggleMagusArcana` in `model/magusArcana.ts`
 * — the engine's `WITCH_HEXES` table maps each to its (mostly display-only)
 * `changes[]`/`contextNotes`, applied through the same change-collection path
 * as arcana/exploits/revelations (see `@pf1/engine` `collect.ts`).
 *
 * Unlike oracle revelations, hexes are NOT scoped to a patron — a witch's
 * patron only grants bonus spells (see `model/spellcasting.patronSpellsKnown`
 * / `@pf1/engine` `witch-patrons.ts`); every hex in `WITCH_HEXES` is
 * available to every witch regardless of patron. So this module mirrors
 * `magusArcana.ts`'s flat shape, not `oracleRevelations.ts`'s mystery-scoped
 * one.
 *
 * Budget (PF1 Advanced Player's Guide, verified against the SRD class
 * table): a witch learns a new hex at 1st level and every even level
 * thereafter (1st, 2nd, 4th, 6th, ..., 20th — 11 total by 20th). Major hexes
 * (APG: "at 10th level, and every two levels thereafter, a witch can choose
 * one of the following hexes in place of one of her regular hex choices")
 * and Grand hexes (18th level) are NOT extra picks — they're just additional
 * options available within the same budget once the witch reaches that
 * level (see `WitchHexDef.tier`/`minLevel` — soft-filtered, same posture as
 * `MAGUS_ARCANA`'s `minLevel`). Each copy of the "Extra Hex" feat (a
 * stackable general feat) adds one more, counted by OCCURRENCE in
 * `doc.build.feats` (not just presence) — same "manually-added duplicates"
 * convention `expectedMagusArcanaCount` uses for "Extra Arcana".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The witch's class level (0 for a non-witch, or a stale/multiclassed doc). */
export function witchLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
}

export function hasWitchHex(doc: CharacterDoc, id: string): boolean {
  return (doc.build.witchHexes ?? []).includes(id);
}

/** Add or remove a hex id. No-op add if already present (no duplicates). */
export function toggleWitchHex(doc: CharacterDoc, hexId: string): CharacterDoc {
  const current = doc.build.witchHexes ?? [];
  const has = current.includes(hexId);
  const witchHexes = has ? current.filter((h) => h !== hexId) : [...current, hexId];
  return { ...doc, build: { ...doc.build, witchHexes } };
}

/** The number of hexes currently chosen. */
export function chosenWitchHexCount(doc: CharacterDoc): number {
  return (doc.build.witchHexes ?? []).length;
}

/**
 * Base APG progression: one hex at 1st level, one more at every even level
 * thereafter (2nd, 4th, ..., 20th) — equivalently `1 + floor(level / 2)`.
 * Returns 0 for a non-witch (level 0).
 */
function baseHexCount(level: number): number {
  if (level <= 0) return 0;
  return 1 + Math.floor(level / 2);
}

/**
 * How many copies of the "Extra Hex" feat are in `doc.build.feats` — matched
 * by name (feat ids are opaque RefData keys), counted by occurrence since the
 * feat is stackable (each copy grants one more hex), the same convention
 * `expectedMagusArcanaCount` relies on for "Extra Arcana".
 */
function extraHexFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Hex") count++;
  }
  return count;
}

/**
 * The number of hexes a witch is expected to know at their current level:
 * the base APG progression plus one per "Extra Hex" feat. Returns 0 for a
 * non-witch.
 */
export function expectedWitchHexCount(doc: CharacterDoc, refData: RefData): number {
  const level = witchLevel(doc);
  if (level <= 0) return 0;
  return baseHexCount(level) + extraHexFeatCount(doc, refData);
}

/**
 * True when the chosen hexes should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `magusArcanaNeedWarning` for the identical pattern).
 */
export function witchHexesNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenWitchHexCount(doc) > expectedWitchHexCount(doc, refData);
}
