/**
 * The "what's new" cue's state: which entry the reader has already been shown,
 * and whether anything has landed since.
 *
 * Holds no copy of its own. The entries live in `changelogEntries.ts` and are
 * always passed in, so the app shell can carry this logic without carrying the
 * list: the mode tab decides whether to show its dot from a list it fetches
 * separately, and only Settings ever loads the prose.
 */
import type { ChangelogEntry } from "./changelogEntries.js";

export type { ChangelogEntry };

const LAST_SEEN_KEY = "pf1-tracker:changelogLastSeen";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2026-07-24` -> `24 Jul 2026`. Formatted from the string parts rather than
 * through `Date`, which would shift the day backwards for anyone west of UTC
 * (an ISO date parses as midnight UTC).
 */
export function formatEntryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/** The id of the newest entry, or `null` when the list is empty. */
export function latestEntryId(entries: readonly ChangelogEntry[]): string | null {
  return entries[0]?.id ?? null;
}

/**
 * Whether anything has landed since the reader's high-water mark.
 *
 * A `null` mark means "never recorded" — a first-ever visit — and gets no cue:
 * nothing is *new* to someone who has never seen the app. An unrecognizable
 * mark (an entry that was pruned) counts as unseen, so the cue errs toward
 * showing once and then settling rather than going permanently dark.
 */
export function hasUnseenEntries(
  entries: readonly ChangelogEntry[],
  lastSeen: string | null,
): boolean {
  if (entries.length === 0 || lastSeen == null) return false;
  return entries.findIndex((e) => e.id === lastSeen) !== 0;
}

/** The stored high-water mark, or `null` if none has been written. */
export function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(id: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, id);
  } catch {
    // Storage unavailable — the cue just won't persist across reloads.
  }
}

/**
 * Read the high-water mark, seeding it to the newest entry on a first-ever
 * visit. Seeding is what keeps a brand-new player from being greeted by a
 * "new" cue over a list they've never not seen; the cost is that the deploy
 * introducing this panel is silent for existing readers too.
 */
export function initChangelogSeen(entries: readonly ChangelogEntry[]): string | null {
  const stored = readLastSeen();
  if (stored != null) return stored;
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
  return latest;
}

/** Record that the reader has been shown the current list. */
export function markChangelogSeen(entries: readonly ChangelogEntry[]): void {
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
}
