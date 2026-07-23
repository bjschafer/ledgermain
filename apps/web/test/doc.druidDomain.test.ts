/**
 * Unit tests for the druid nature-bond domain choice (issue #98) added to
 * model/doc.ts: `setDruidNatureBondDomain`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setDruidNatureBondDomain } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setDruidNatureBondDomain()", () => {
  it("sets a domain tag", () => {
    expect(setDruidNatureBondDomain(doc(), "Wolf").build.druidNatureBondDomain).toBe("Wolf");
  });

  it("clears the domain when passed null", () => {
    const withDomain = setDruidNatureBondDomain(doc(), "Wolf");
    expect(setDruidNatureBondDomain(withDomain, null).build.druidNatureBondDomain).toBeUndefined();
  });

  it("clears the domain when passed a blank string", () => {
    const withDomain = setDruidNatureBondDomain(doc(), "Wolf");
    expect(setDruidNatureBondDomain(withDomain, "  ").build.druidNatureBondDomain).toBeUndefined();
  });

  it("trims surrounding whitespace on a tag", () => {
    expect(setDruidNatureBondDomain(doc(), "  Jungle ").build.druidNatureBondDomain).toBe("Jungle");
  });

  it("replaces a previously chosen domain (single choice, not additive)", () => {
    let d = setDruidNatureBondDomain(doc(), "Wolf");
    d = setDruidNatureBondDomain(d, "Desert");
    expect(d.build.druidNatureBondDomain).toBe("Desert");
  });

  it("a fresh document has no nature-bond domain set", () => {
    expect(doc().build.druidNatureBondDomain).toBeUndefined();
  });
});
