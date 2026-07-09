/**
 * Pure alchemist-discovery transitions (issue #65). Discovery ids are just
 * entries in `build.alchemistDiscoveries`, mirroring `toggleMagusArcana` in
 * `model/magusArcana.ts` — the engine's `ALCHEMIST_DISCOVERIES` table maps
 * each to its (mostly display-only) `changes[]`/`contextNotes`, applied
 * through the same change-collection path as arcana/exploits/hexes (see
 * `@pf1/engine` `collect.ts`).
 *
 * Budget (PF1 Advanced Player's Guide, verified against the SRD class
 * table): an alchemist learns a new discovery at 2nd level and every even
 * level thereafter (2nd, 4th, ..., 20th — 10 total by 20th) —
 * `floor(alchemistLevel / 2)`. The 20th-level "Grand Discovery" is automatic
 * (informational only, not one of these picks — same treatment as oracle's
 * Final Revelation, see `ORACLE_MYSTERY_FINAL_REVELATIONS`). Each copy of
 * the "Extra Discovery" feat (a stackable general feat) adds one more,
 * counted by OCCURRENCE in `doc.build.feats` (not just presence) — same
 * "manually-added duplicates" convention `expectedMagusArcanaCount` uses for
 * "Extra Arcana".
 *
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

/** The alchemist's class level (0 for a non-alchemist, or a stale/multiclassed doc). */
export function alchemistLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "alchemist")?.level ?? 0;
}

export function hasAlchemistDiscovery(doc: CharacterDoc, id: string): boolean {
  return (doc.build.alchemistDiscoveries ?? []).includes(id);
}

/** Add or remove a discovery id. No-op add if already present (no duplicates). */
export function toggleAlchemistDiscovery(doc: CharacterDoc, discoveryId: string): CharacterDoc {
  const current = doc.build.alchemistDiscoveries ?? [];
  const has = current.includes(discoveryId);
  const alchemistDiscoveries = has
    ? current.filter((d) => d !== discoveryId)
    : [...current, discoveryId];
  return { ...doc, build: { ...doc.build, alchemistDiscoveries } };
}

/** The number of discoveries currently chosen. */
export function chosenAlchemistDiscoveryCount(doc: CharacterDoc): number {
  return (doc.build.alchemistDiscoveries ?? []).length;
}

/**
 * Base APG progression: one discovery at 2nd level, one more every 2 levels
 * thereafter (4th, 6th, ..., 20th) — equivalently `floor(level / 2)`.
 * Returns 0 below 2nd level or for a non-alchemist (level 0).
 */
function baseDiscoveryCount(level: number): number {
  if (level < 2) return 0;
  return Math.floor(level / 2);
}

/**
 * How many copies of the "Extra Discovery" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable (each copy grants one more discovery), the
 * same convention `expectedMagusArcanaCount` relies on for "Extra Arcana".
 */
function extraDiscoveryFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Discovery") count++;
  }
  return count;
}

/**
 * The number of discoveries an alchemist is expected to know at their
 * current level: the base APG progression plus one per "Extra Discovery"
 * feat. Returns 0 for a non-alchemist.
 */
export function expectedAlchemistDiscoveryCount(doc: CharacterDoc, refData: RefData): number {
  const level = alchemistLevel(doc);
  if (level <= 0) return 0;
  return baseDiscoveryCount(level) + extraDiscoveryFeatCount(doc, refData);
}

/**
 * True when the chosen discoveries should prompt a soft warning: more than
 * the expected count. Never used to block — only to color the count badge
 * (see `magusArcanaNeedWarning` for the identical pattern).
 */
export function alchemistDiscoveriesNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenAlchemistDiscoveryCount(doc) > expectedAlchemistDiscoveryCount(doc, refData);
}
