/**
 * Ranking and filtering for the one search box. Pure and DOM-free: the page
 * holds the filter state and renders whatever `searchIndex` hands back.
 *
 * Deliberately not a search library — the index is a flat array of ~8,000 short
 * names, and a single linear scan per keystroke is faster than the fetch that
 * would be needed to load anything cleverer.
 */

import type { CollectionId } from "../shared/collections.js";
import { collectionCode } from "../shared/collections.js";
import type { IndexEntry } from "../shared/indexCodec.js";

/** `null` means "no restriction" for both facets. */
export interface SearchFilter {
  query: string;
  collection: CollectionId | null;
  /** Spell level; only meaningful while `collection === "spells"`. */
  level: number | null;
}

export const EMPTY_FILTER: SearchFilter = { query: "", collection: null, level: null };

export interface SearchResult {
  /** The rendered slice, capped at the caller's limit. */
  entries: IndexEntry[];
  /** How many entries matched in total, cap included. */
  total: number;
}

/**
 * Rank buckets for a name against a query. Lower sorts first. A player typing
 * "mirror" wants Mirror Image before Wall of Mirrors, and "fire" should put
 * Fireball above Delayed Blast Fireball — so a match at a word boundary beats
 * one buried mid-word.
 */
export function matchRank(name: string, query: string): number {
  const lower = name.toLowerCase();
  const at = lower.indexOf(query);
  if (at < 0) return -1;
  if (at === 0) return lower.length === query.length ? 0 : 1;
  return isBoundary(lower[at - 1]) ? 2 : 3;
}

/** Names carry commas, parentheses, and hyphens ("Cure Light Wounds, Mass"). */
function isBoundary(char: string | undefined): boolean {
  return char !== undefined && !/[a-z0-9]/.test(char);
}

/**
 * Filter by query/collection/level, then order: best match rank, then collection
 * order, then spell level, then name. Without a query every rank is 0, which
 * reduces this to the plain browse ordering the empty-query view wants.
 */
export function searchIndex(
  entries: readonly IndexEntry[],
  filter: SearchFilter,
  limit: number,
): SearchResult {
  const query = filter.query.trim().toLowerCase();
  const matches: { entry: IndexEntry; rank: number }[] = [];

  for (const entry of entries) {
    if (filter.collection !== null && entry.collection !== filter.collection) continue;
    if (filter.level !== null && entry.level !== filter.level) continue;
    const rank = query ? matchRank(entry.name, query) : 0;
    if (rank < 0) continue;
    matches.push({ entry, rank });
  }

  matches.sort(
    (a, b) =>
      a.rank - b.rank ||
      collectionCode(a.entry.collection) - collectionCode(b.entry.collection) ||
      a.entry.level - b.entry.level ||
      a.entry.name.localeCompare(b.entry.name),
  );

  return { entries: matches.slice(0, limit).map((m) => m.entry), total: matches.length };
}

/** How many entries each collection holds, for the empty-query overview. */
export function countByCollection(
  entries: readonly IndexEntry[],
): Record<string, number | undefined> {
  const counts: Record<string, number | undefined> = {};
  for (const entry of entries) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1;
  return counts;
}

/** The spell levels present in the index, ascending. */
export function spellLevels(entries: readonly IndexEntry[]): number[] {
  const levels = new Set<number>();
  for (const entry of entries) if (entry.collection === "spells") levels.add(entry.level);
  return [...levels].sort((a, b) => a - b);
}
