/**
 * Filtering, ranking, and grouping for the spell manager's browse pane.
 *
 * Pure and DOM-free: the manager component holds the filter state and renders
 * the result of `filterSpells` / `groupSpellsByLevel`.
 */

export interface SpellEntry {
  id: string;
  name: string;
  level: number;
  school?: string;
}

/** `null` means "no restriction" for both facets. */
export interface SpellFilter {
  query: string;
  school: string | null;
  level: number | null;
}

export const EMPTY_SPELL_FILTER: SpellFilter = { query: "", school: null, level: null };

export function isFilterActive(f: SpellFilter): boolean {
  return f.query.trim() !== "" || f.school !== null || f.level !== null;
}

/**
 * Rank buckets for a name against a query. Lower sorts first. A player typing
 * "mirror" wants Mirror Image before Wall of Mirrors, and "fire" should put
 * Fireball above Delayed Blast Fireball — so a match at a word boundary beats
 * one buried mid-word.
 */
function matchRank(name: string, q: string): number {
  const lower = name.toLowerCase();
  const at = lower.indexOf(q);
  if (at < 0) return -1;
  if (at === 0) return lower.length === q.length ? 0 : 1;
  return lower[at - 1] === " " ? 2 : 3;
}

/**
 * Filter by query/school/level, then order: best match rank first, then by
 * spell level, then by name. Without a query, rank is uniform and this reduces
 * to the plain level-then-name ordering the reference lists use.
 */
export function filterSpells(entries: readonly SpellEntry[], filter: SpellFilter): SpellEntry[] {
  const q = filter.query.trim().toLowerCase();
  const out: { entry: SpellEntry; rank: number }[] = [];

  for (const entry of entries) {
    if (filter.school !== null && entry.school !== filter.school) continue;
    if (filter.level !== null && entry.level !== filter.level) continue;
    const rank = q ? matchRank(entry.name, q) : 0;
    if (rank < 0) continue;
    out.push({ entry, rank });
  }

  out.sort(
    (a, b) =>
      a.rank - b.rank || a.entry.level - b.entry.level || a.entry.name.localeCompare(b.entry.name),
  );
  return out.map((r) => r.entry);
}

/** Group into ascending-level buckets, each keeping its incoming order. */
export function groupSpellsByLevel(
  entries: readonly SpellEntry[],
): { level: number; entries: SpellEntry[] }[] {
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    const arr = byLevel.get(e.level);
    if (arr) arr.push(e);
    else byLevel.set(e.level, [e]);
  }
  return [...byLevel.keys()]
    .sort((a, b) => a - b)
    .map((level) => ({
      level,
      entries: byLevel.get(level)!,
    }));
}

/** The schools present on a spell list, sorted by the caller's label function. */
export function schoolsOf(
  entries: readonly SpellEntry[],
  label: (school: string) => string,
): string[] {
  const set = new Set<string>();
  for (const e of entries) if (e.school) set.add(e.school);
  return [...set].sort((a, b) => label(a).localeCompare(label(b)));
}

/** The spell levels present on a spell list, ascending. */
export function levelsOf(entries: readonly SpellEntry[]): number[] {
  return [...new Set(entries.map((e) => e.level))].sort((a, b) => a - b);
}
