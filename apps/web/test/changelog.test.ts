import { describe, expect, it } from "bun:test";

import { CHANGELOG } from "../src/model/changelogEntries.js";
import {
  formatEntryDate,
  hasUnseenEntries,
  latestEntryId,
  type ChangelogEntry,
} from "../src/model/changelog.js";
import { expectNoDashes, expectWithinBudget } from "./houseStyle.js";

/** Sized just above the longest shipped entry, so it ratchets. */
const NOTE_BUDGET = 175;
const TITLE_BUDGET = 12;

function entry(id: string, date = "2026-01-01"): ChangelogEntry {
  return { id, date, title: "t", note: "n" };
}

describe("CHANGELOG", () => {
  it("is non-empty, with a non-blank title and note per entry", () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (const e of CHANGELOG) {
      expect(e.title.trim().length).toBeGreaterThan(0);
      expect(e.note.trim().length).toBeGreaterThan(0);
    }
  });

  it("has unique ids, each prefixed with its own ISO date", () => {
    const ids = CHANGELOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of CHANGELOG) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.id.startsWith(`${e.date}-`)).toBe(true);
    }
  });

  // The unseen cue is positional — it asks "is the stored id still at index
  // 0?" — so an entry appended out of order would silently never announce.
  it("is ordered newest first", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i]!.date <= CHANGELOG[i - 1]!.date).toBe(true);
    }
  });

  it("never leaks an internal issue-tracker reference into player-facing copy", () => {
    for (const e of CHANGELOG) {
      expect(e.title).not.toMatch(/#\d+/);
      expect(e.note).not.toMatch(/#\d+/);
    }
  });

  it("uses no em or en dashes", () => {
    for (const e of CHANGELOG) {
      expectNoDashes(`${e.id} (title)`, e.title);
      expectNoDashes(`${e.id} (note)`, e.note);
    }
  });

  it("keeps entries short enough to skim in a panel", () => {
    for (const e of CHANGELOG) {
      expectWithinBudget(`${e.id} (title)`, e.title, TITLE_BUDGET);
      expectWithinBudget(`${e.id} (note)`, e.note, NOTE_BUDGET);
    }
  });
});

describe("latestEntryId()", () => {
  it("returns the first entry's id, or null when the list is empty", () => {
    expect(latestEntryId([entry("a"), entry("b")])).toBe("a");
    expect(latestEntryId([])).toBe(null);
  });
});

describe("hasUnseenEntries()", () => {
  const entries = [entry("c", "2026-03-01"), entry("b", "2026-02-01"), entry("a", "2026-01-01")];

  it("stays quiet for a first-ever visit with no recorded mark", () => {
    expect(hasUnseenEntries(entries, null)).toBe(false);
  });

  it("stays quiet when the mark is already the newest entry", () => {
    expect(hasUnseenEntries(entries, "c")).toBe(false);
  });

  it("fires when entries have landed since the mark", () => {
    expect(hasUnseenEntries(entries, "b")).toBe(true);
    expect(hasUnseenEntries(entries, "a")).toBe(true);
  });

  it("fires for an unrecognized mark, so a pruned entry shows once rather than going dark", () => {
    expect(hasUnseenEntries(entries, "long-gone")).toBe(true);
  });

  it("stays quiet when there is nothing to announce", () => {
    expect(hasUnseenEntries([], "anything")).toBe(false);
  });
});

describe("formatEntryDate()", () => {
  it("renders an ISO date without a timezone shift", () => {
    expect(formatEntryDate("2026-07-24")).toBe("24 Jul 2026");
    expect(formatEntryDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatEntryDate("2026-12-31")).toBe("31 Dec 2026");
  });

  it("passes through anything that isn't an ISO date", () => {
    expect(formatEntryDate("soon")).toBe("soon");
    expect(formatEntryDate("2026-13-01")).toBe("2026-13-01");
  });
});
