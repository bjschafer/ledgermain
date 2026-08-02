/**
 * Unit tests for the inquisitor's inquisition choice added to model/doc.ts:
 * `setInquisition`, and its mutual exclusion with `setClericDomains`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setClericDomains, setInquisition } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setInquisition()", () => {
  it("sets an inquisition tag", () => {
    expect(setInquisition(doc(), "conversion").build.inquisition).toBe("conversion");
  });

  it("clears the inquisition when passed null", () => {
    const withInquisition = setInquisition(doc(), "conversion");
    expect(setInquisition(withInquisition, null).build.inquisition).toBeUndefined();
  });

  it("clears the inquisition when passed a blank string", () => {
    const withInquisition = setInquisition(doc(), "conversion");
    expect(setInquisition(withInquisition, "  ").build.inquisition).toBeUndefined();
  });

  it("trims surrounding whitespace on a tag", () => {
    expect(setInquisition(doc(), "  justice ").build.inquisition).toBe("justice");
  });

  it("replaces a previously chosen inquisition (single choice, not additive)", () => {
    let d = setInquisition(doc(), "conversion");
    d = setInquisition(d, "justice");
    expect(d.build.inquisition).toBe("justice");
  });

  it("a fresh document has no inquisition set", () => {
    expect(doc().build.inquisition).toBeUndefined();
  });

  it("clears any chosen domain — an inquisition is never picked alongside one", () => {
    const withDomain = setClericDomains(doc(), ["Fire"]);
    const withInquisition = setInquisition(withDomain, "conversion");
    expect(withInquisition.build.clericDomains).toEqual([]);
    expect(withInquisition.build.inquisition).toBe("conversion");
  });

  it("setClericDomains clears any chosen inquisition — the same mutual exclusion in the other direction", () => {
    const withInquisition = setInquisition(doc(), "conversion");
    const withDomain = setClericDomains(withInquisition, ["Fire"]);
    expect(withDomain.build.inquisition).toBeUndefined();
    expect(withDomain.build.clericDomains).toEqual(["Fire"]);
  });
});
