/**
 * Unit tests for the Oracle Mystery/Curse additions to model/doc.ts:
 * `setOracleMystery`, `setOracleCurse`. Mirrors `doc.bloodline.test.ts`'s
 * pattern for `setSorcererBloodline`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setOracleCurse, setOracleMystery } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setOracleMystery()", () => {
  it("sets a mystery tag", () => {
    expect(setOracleMystery(doc(), "life").build.oracleMystery).toBe("life");
  });

  it("clears the mystery when passed null", () => {
    const withMystery = setOracleMystery(doc(), "life");
    expect(setOracleMystery(withMystery, null).build.oracleMystery).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setOracleMystery(doc(), "").build.oracleMystery).toBeUndefined();
    expect(setOracleMystery(doc(), "   ").build.oracleMystery).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setOracleMystery(doc(), "  life  ").build.oracleMystery).toBe("life");
  });

  it("a fresh document has no mystery set", () => {
    expect(doc().build.oracleMystery).toBeUndefined();
  });
});

describe("setOracleCurse()", () => {
  it("sets a curse tag", () => {
    expect(setOracleCurse(doc(), "lame").build.oracleCurse).toBe("lame");
  });

  it("clears the curse when passed null", () => {
    const withCurse = setOracleCurse(doc(), "lame");
    expect(setOracleCurse(withCurse, null).build.oracleCurse).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setOracleCurse(doc(), "").build.oracleCurse).toBeUndefined();
    expect(setOracleCurse(doc(), "   ").build.oracleCurse).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setOracleCurse(doc(), "  lame  ").build.oracleCurse).toBe("lame");
  });

  it("a fresh document has no curse set", () => {
    expect(doc().build.oracleCurse).toBeUndefined();
  });

  it("setting mystery and curse are independent of each other", () => {
    const withBoth = setOracleCurse(setOracleMystery(doc(), "life"), "lame");
    expect(withBoth.build.oracleMystery).toBe("life");
    expect(withBoth.build.oracleCurse).toBe("lame");
  });
});
