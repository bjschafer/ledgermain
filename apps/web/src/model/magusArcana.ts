/**
 * Pure magus-arcana transitions (issue #61). Arcana ids are just entries in
 * `build.magusArcana`, mirroring `toggleArcanistExploit` in
 * `model/arcanistExploits.ts` — the engine's `MAGUS_ARCANA` table maps each to
 * its (display-only) `changes[]`/`contextNotes`, applied through the same
 * change-collection path as exploits/bloodline powers (see `@pf1/engine`
 * `collect.ts`).
 *
 * Budget (PF1 Ultimate Magic, verified against the SRD class table): a magus
 * learns a new arcana at 3rd level and every 3 levels thereafter (3rd, 6th,
 * 9th, ...) — i.e. `floor(magusLevel / 3)` arcana known at a given level (1
 * at levels 3-5, 2 at levels 6-8, 3 at levels 9-11, ...). Each copy of the
 * "Extra Arcana" feat (a stackable general feat) adds one more, counted by
 * OCCURRENCE in `doc.build.feats` (not just presence) — same "manually-added
 * duplicates" convention `expectedArcanistExploitCount` uses for "Extra
 * Arcanist Exploit".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The magus's class level (0 for a non-magus, or a stale/multiclassed doc). */
export function magusLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
}

export function hasMagusArcana(doc: CharacterDoc, id: string): boolean {
  return (doc.build.magusArcana ?? []).includes(id);
}

/** Add or remove an arcana id. No-op add if already present (no duplicates). */
export function toggleMagusArcana(doc: CharacterDoc, arcanaId: string): CharacterDoc {
  const current = doc.build.magusArcana ?? [];
  const has = current.includes(arcanaId);
  const magusArcana = has ? current.filter((a) => a !== arcanaId) : [...current, arcanaId];
  return { ...doc, build: { ...doc.build, magusArcana } };
}

/** The number of arcana currently chosen. */
export function chosenMagusArcanaCount(doc: CharacterDoc): number {
  return (doc.build.magusArcana ?? []).length;
}

/**
 * Base UM progression: one arcana at 3rd level, one more every 3 levels
 * thereafter (6th, 9th, ...) — equivalently `floor(level / 3)`. Returns 0
 * below 3rd level or for a non-magus (level 0).
 */
function baseArcanaCount(level: number): number {
  if (level < 3) return 0;
  return Math.floor(level / 3);
}

/**
 * How many copies of the "Extra Arcana" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable (each copy grants one more arcana), the same
 * convention `expectedArcanistExploitCount` relies on for "Extra Arcanist
 * Exploit".
 */
function extraArcanaFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Arcana") count++;
  }
  return count;
}

/**
 * The number of arcana a magus is expected to know at their current level:
 * the base UM progression plus one per "Extra Arcana" feat. Returns 0 for a
 * non-magus.
 */
export function expectedMagusArcanaCount(doc: CharacterDoc, refData: RefData): number {
  const level = magusLevel(doc);
  if (level <= 0) return 0;
  return baseArcanaCount(level) + extraArcanaFeatCount(doc, refData);
}

/**
 * True when the chosen arcana should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `arcanistExploitsNeedWarning` for the identical pattern).
 */
export function magusArcanaNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenMagusArcanaCount(doc) > expectedMagusArcanaCount(doc, refData);
}
