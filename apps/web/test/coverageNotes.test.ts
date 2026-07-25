import { describe, expect, it } from "bun:test";

import { COVERAGE_NOTES, INTERNAL_GAPS } from "../src/model/coverageNotes.js";

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
});
