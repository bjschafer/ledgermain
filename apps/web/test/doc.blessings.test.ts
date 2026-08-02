/**
 * Unit tests for the warpriest blessing choice in model/doc.ts: `setBlessings`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setBlessings } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setBlessings()", () => {
  it("sets the chosen blessing ids", () => {
    expect(setBlessings(doc(), ["air", "sun"]).build.blessings).toEqual(["air", "sun"]);
  });

  it("caps at two, same allowance as setClericDomains", () => {
    expect(setBlessings(doc(), ["air", "sun", "nobility"]).build.blessings).toEqual(["air", "sun"]);
  });

  it("filters out blank entries", () => {
    expect(setBlessings(doc(), ["air", "", "sun"]).build.blessings).toEqual(["air", "sun"]);
  });

  it("clears the pick when passed an empty array", () => {
    const picked = setBlessings(doc(), ["air", "sun"]);
    expect(setBlessings(picked, []).build.blessings).toEqual([]);
  });

  it("replaces the whole list rather than adding to it", () => {
    const picked = setBlessings(doc(), ["air", "sun"]);
    expect(setBlessings(picked, ["nobility"]).build.blessings).toEqual(["nobility"]);
  });

  it("a fresh document has no blessings chosen", () => {
    expect(doc().build.blessings).toBeUndefined();
  });
});
