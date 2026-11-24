/**
 * Ranking and filtering for the one search box. Pure and DOM-free: the page
 * holds the filter state and renders whatever `searchIndex` hands back.
 *
 * Deliberately not a search library — the index is a flat array of ~17,000 short
 * names, and a single linear scan per keystroke is faster than the fetch that
 * would be needed to load anything cleverer.
 */

import type { CollectionId } from "../shared/collections.js";
import { COLLECTIONS, collectionCode } from "../shared/collections.js";
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
 * The form both sides of a match are compared in: lowercased, apostrophes
 * dropped, and every other run of punctuation a single space, so "5 foot step"
 * finds Take 5-Foot Step and "natures ally" finds Summon Nature's Ally.
 */
function searchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Names never change once decoded, so each is keyed once rather than per keystroke. */
const nameKeys = new WeakMap<IndexEntry, string>();

function nameKey(entry: IndexEntry): string {
  let key = nameKeys.get(entry);
  if (key === undefined) {
    key = searchKey(entry.name);
    nameKeys.set(entry, key);
  }
  return key;
}

function rankKeys(name: string, query: string): number {
  const at = name.indexOf(query);
  if (at < 0) return -1;
  if (at === 0) return name.length === query.length ? 0 : 1;
  return name[at - 1] === " " ? 2 : 3;
}

/**
 * Rank buckets for a name against a query. Lower sorts first. A player typing
 * "mirror" wants Mirror Image before Wall of Mirrors, and "fire" should put
 * Fireball above Delayed Blast Fireball — so a match at a word boundary beats
 * one buried mid-word.
 */
export function matchRank(name: string, query: string): number {
  return rankKeys(searchKey(name), searchKey(query));
}

/**
 * Tie-break order between equally ranked rows. A rules page names a whole
 * concept ("Charge", "Scrolls"), so it leads; a section inside one ("Holding
 * the Charge") is the narrowest hit, so it trails everything else.
 */
function tieOrder(entry: IndexEntry): number {
  if (entry.collection !== "rules") return collectionCode(entry.collection);
  return entry.anchor === undefined ? -1 : COLLECTIONS.length;
}

/**
 * Filter by query/collection/level, then order: best match rank, then
 * `tieOrder`, then spell level, then name. Without a query every rank is 0,
 * which reduces this to the plain browse ordering the empty-query view wants.
 */
export function searchIndex(
  entries: readonly IndexEntry[],
  filter: SearchFilter,
  limit: number,
): SearchResult {
  const query = searchKey(filter.query);
  const matches: { entry: IndexEntry; rank: number }[] = [];

  for (const entry of entries) {
    if (filter.collection !== null && entry.collection !== filter.collection) continue;
    if (filter.level !== null && entry.level !== filter.level) continue;
    const rank = query ? rankKeys(nameKey(entry), query) : 0;
    if (rank < 0) continue;
    matches.push({ entry, rank });
  }

  matches.sort(
    (a, b) =>
      a.rank - b.rank ||
      tieOrder(a.entry) - tieOrder(b.entry) ||
      a.entry.level - b.entry.level ||
      a.entry.name.localeCompare(b.entry.name),
  );

  return { entries: matches.slice(0, limit).map((m) => m.entry), total: matches.length };
}

/** How many entries each collection holds, for the empty-query overview. Sections aren't entries. */
export function countByCollection(
  entries: readonly IndexEntry[],
): Record<string, number | undefined> {
  const counts: Record<string, number | undefined> = {};
  for (const entry of entries) {
    if (entry.anchor === undefined) counts[entry.collection] = (counts[entry.collection] ?? 0) + 1;
  }
  return counts;
}

/** The spell levels present in the index, ascending. */
export function spellLevels(entries: readonly IndexEntry[]): number[] {
  const levels = new Set<number>();
  for (const entry of entries) if (entry.collection === "spells") levels.add(entry.level);
  return [...levels].sort((a, b) => a - b);
}
