/**
 * Unit tests for the bonus-languages transition (`model/doc.ts:setBonusLanguages`,
 * issue #25).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setBonusLanguages } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setBonusLanguages()", () => {
  it("a fresh document has no bonus languages", () => {
    expect(doc().build.bonusLanguages).toBeUndefined();
  });

  it("sets the list", () => {
    expect(setBonusLanguages(doc(), ["Draconic", "Celestial"]).build.bonusLanguages).toEqual([
      "Draconic",
      "Celestial",
    ]);
  });

  it("trims whitespace from entries", () => {
    expect(setBonusLanguages(doc(), ["  Draconic  "]).build.bonusLanguages).toEqual(["Draconic"]);
  });

  it("drops blank/whitespace-only entries", () => {
    expect(setBonusLanguages(doc(), ["Draconic", "", "   "]).build.bonusLanguages).toEqual([
      "Draconic",
    ]);
  });

  it("replaces the whole list rather than appending", () => {
    const withOne = setBonusLanguages(doc(), ["Draconic"]);
    expect(setBonusLanguages(withOne, ["Celestial"]).build.bonusLanguages).toEqual(["Celestial"]);
  });

  it("passing an empty array clears bonus languages", () => {
    const withOne = setBonusLanguages(doc(), ["Draconic"]);
    expect(setBonusLanguages(withOne, []).build.bonusLanguages).toEqual([]);
  });

  it("does not dedupe (dedup happens at display time in model/languages.ts)", () => {
    expect(setBonusLanguages(doc(), ["Draconic", "Draconic"]).build.bonusLanguages).toEqual([
      "Draconic",
      "Draconic",
    ]);
  });
});
