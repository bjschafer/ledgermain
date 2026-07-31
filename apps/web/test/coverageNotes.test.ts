import { describe, expect, it } from "bun:test";

import { COVERAGE_NOTES, INTERNAL_GAPS } from "../src/model/coverageNotes.js";
import { expectNoDashes, expectWithinBudget } from "./houseStyle.js";

/**
 * Budgets sized just above the longest entry at the time they were written,
 * so they ratchet. Raising one is a decision to make the panel longer, and
 * should be argued for rather than done reflexively to land a sentence.
 */
const NOTE_BUDGET = 65;
const ISSUE_DETAIL_BUDGET = 65;
const INTERNAL_DETAIL_BUDGET = 35;

/**
 * Constructions that only appear when an entry is narrating work that landed
 * instead of describing what's missing. This file has drifted that way once
 * already, tripling in length while the gap count held flat, because closing
 * a gap kept meaning "rewrite the entry to say what now works" rather than
 * "delete the entry".
 */
const NARRATION: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /\bused to\b/i, why: "describes a past state" },
  { pattern: /\bno longer\b/i, why: "describes a past state" },
  { pattern: /\bpreviously\b/i, why: "describes a past state" },
  { pattern: /\bnow (?:also|too|finally)\b/i, why: "announces new work" },
  { pattern: /\bcaught up\b/i, why: "announces new work" },
  { pattern: /\bnewly\b/i, why: "announces new work" },
  { pattern: /\bas before\b/i, why: "compares against a past state" },
];

function expectDescribesTheGap(label: string, text: string): void {
  for (const { pattern, why } of NARRATION) {
    const hit = text.match(pattern);
    if (hit) {
      throw new Error(
        `${label}: "${hit[0]}" ${why}. This table lists what's missing; shipped work ` +
          `belongs in changelog.ts. Closing a gap means deleting or shrinking its entry.\n  ${text}`,
      );
    }
  }
}

/**
 * Tells on an entry that's describing where the app hands the ruling to the
 * table. That isn't a gap: Ledgermain never models the attacker's side, so no
 * future version closes it, and listing it implies one will. Such an entry is
 * affordance documentation, and belongs where the player uses the affordance.
 */
const NOT_A_GAP: readonly RegExp[] = [
  /\byour GM\b/i,
  /\byours to say\b/i,
  /\bleaves the ruling\b/i,
  /\ba reminder for you\b/i,
];

function expectCloseable(label: string, text: string): void {
  for (const pattern of NOT_A_GAP) {
    const hit = text.match(pattern);
    if (hit) {
      throw new Error(
        `${label}: "${hit[0]}" reads as a table ruling rather than unbuilt work. An entry ` +
          `belongs here only if some future version could close it; document the boundary ` +
          `next to the affordance instead.\n  ${text}`,
      );
    }
  }
}

describe("COVERAGE_NOTES", () => {
  it("is non-empty, with a non-blank category and note per entry", () => {
    expect(COVERAGE_NOTES.length).toBeGreaterThan(0);
    for (const n of COVERAGE_NOTES) {
      expect(n.category.trim().length).toBeGreaterThan(0);
      expect(n.note.trim().length).toBeGreaterThan(0);
    }
  });

  it("has unique categories (so it renders as a clean list, no duplicate keys)", () => {
    const categories = COVERAGE_NOTES.map((n) => n.category);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("never leaks an internal issue-tracker reference, in either field", () => {
    for (const n of COVERAGE_NOTES) {
      expect(n.category).not.toMatch(/#\d+/);
      expect(n.note).not.toMatch(/#\d+/);
      // issueDetail feeds a generated issue body, where a cross-reference
      // reads as commit provenance rather than inventory.
      expect(n.issueDetail ?? "").not.toMatch(/#\d+/);
    }
  });

  it("keeps every entry inside its length budget", () => {
    for (const n of COVERAGE_NOTES) {
      expectWithinBudget(`${n.category} (note)`, n.note, NOTE_BUDGET);
      if (n.issueDetail) {
        expectWithinBudget(`${n.category} (issueDetail)`, n.issueDetail, ISSUE_DETAIL_BUDGET);
      }
    }
  });

  it("describes what's missing, never what got fixed", () => {
    for (const n of COVERAGE_NOTES) {
      expectDescribesTheGap(`${n.category} (note)`, n.note);
      expectDescribesTheGap(`${n.category} (issueDetail)`, n.issueDetail ?? "");
    }
  });

  it("lists only gaps a future version could close, not table rulings", () => {
    for (const n of COVERAGE_NOTES) {
      expectCloseable(`${n.category} (note)`, n.note);
      expectCloseable(`${n.category} (issueDetail)`, n.issueDetail ?? "");
    }
  });

  it("uses no em or en dashes in copy the Settings panel renders", () => {
    for (const n of COVERAGE_NOTES) {
      expectNoDashes(`${n.category} (category)`, n.category);
      expectNoDashes(`${n.category} (note)`, n.note);
    }
  });
});

describe("INTERNAL_GAPS", () => {
  it("is non-empty, with a non-blank category and detail per entry", () => {
    expect(INTERNAL_GAPS.length).toBeGreaterThan(0);
    for (const g of INTERNAL_GAPS) {
      expect(g.category.trim().length).toBeGreaterThan(0);
      expect(g.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it("has unique categories, distinct from COVERAGE_NOTES' (feeds one generated list)", () => {
    const internalCategories = INTERNAL_GAPS.map((g) => g.category);
    expect(new Set(internalCategories).size).toBe(internalCategories.length);
    const playerCategories = new Set(COVERAGE_NOTES.map((n) => n.category));
    for (const category of internalCategories) {
      expect(playerCategories.has(category)).toBe(false);
    }
  });

  it("holds to the same budget and gap-only discipline", () => {
    for (const g of INTERNAL_GAPS) {
      expectWithinBudget(`${g.category} (detail)`, g.detail, INTERNAL_DETAIL_BUDGET);
      expectDescribesTheGap(`${g.category} (detail)`, g.detail);
      expectCloseable(`${g.category} (detail)`, g.detail);
      expect(g.detail).not.toMatch(/#\d+/);
    }
  });
});
