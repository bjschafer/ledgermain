import { describe, expect, it } from "bun:test";

import { COVERAGE_NOTES } from "../src/model/coverageNotes.js";

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

  it("never leaks an internal issue-tracker reference into player-facing copy", () => {
    for (const n of COVERAGE_NOTES) {
      expect(n.category).not.toMatch(/#\d+/);
      expect(n.note).not.toMatch(/#\d+/);
    }
  });
});
