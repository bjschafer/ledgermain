/**
 * The "what's new" cue's state: which entry the reader has already been shown,
 * and whether anything has landed since.
 *
 * Holds no copy of the entries, which live in `changelogEntries.ts` and load
 * only with the Settings panel. The mode tab's dot needs nothing but the
 * newest id, so that one string is kept here and the dot is decided
 * synchronously. Waiting on the entries chunk instead meant a state update
 * landing mid-render whenever the chunk arrived during the first paint.
 */
import type { ChangelogEntry } from "./changelogEntries.js";

export type { ChangelogEntry };

const LAST_SEEN_KEY = "pf1-tracker:changelogLastSeen";

/**
 * The id of the newest entry in `changelogEntries.ts`. Update it with every new
 * entry; `test/changelog.test.ts` fails, naming the value, if the two differ.
 */
export const LATEST_ENTRY_ID = "2026-11-06-tidier-build-pickers";

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
 * Whether anything has landed since the reader's high-water mark: any mark but
 * the newest id.
 *
 * A `null` mark means "never recorded" — a first-ever visit — and gets no cue:
 * nothing is *new* to someone who has never seen the app. An unrecognizable
 * mark (an entry that was pruned) counts as unseen, so the cue errs toward
 * showing once and then settling rather than going permanently dark.
 */
export function hasUnseenEntries(latest: string | null, lastSeen: string | null): boolean {
  if (latest == null || lastSeen == null) return false;
  return lastSeen !== latest;
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
export function initChangelogSeen(latest: string | null): string | null {
  const stored = readLastSeen();
  if (stored != null) return stored;
  if (latest != null) writeLastSeen(latest);
  return latest;
}

/** Record that the reader has been shown the current list. */
export function markChangelogSeen(latest: string | null): void {
  if (latest != null) writeLastSeen(latest);
}
