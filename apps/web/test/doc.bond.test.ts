import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setArcaneBond } from "../src/model/doc.js";

describe("setArcaneBond", () => {
  it("sets a familiar bond with a trimmed kind", () => {
    const doc = setArcaneBond(createEmptyDoc("t"), {
      type: "familiar",
      familiarKind: "  bat  ",
    });
    expect(doc.build.arcaneBond).toEqual({ type: "familiar", familiarKind: "bat" });
  });

  it("no-ops on a blank familiar kind", () => {
    const base = createEmptyDoc("t");
    expect(setArcaneBond(base, { type: "familiar", familiarKind: "   " })).toBe(base);
  });

  it("sets an object bond with a name", () => {
    const doc = setArcaneBond(createEmptyDoc("t"), {
      type: "object",
      bondedItemName: "Grandfather's ring",
    });
    expect(doc.build.arcaneBond).toEqual({
      type: "object",
      bondedItemName: "Grandfather's ring",
    });
  });

  it("drops a whitespace-only object name (recorded as unnamed bonded object)", () => {
    const doc = setArcaneBond(createEmptyDoc("t"), {
      type: "object",
      bondedItemName: "   ",
    });
    expect(doc.build.arcaneBond).toEqual({ type: "object" });
  });

  it("allows an object bond with no name at all", () => {
    const doc = setArcaneBond(createEmptyDoc("t"), { type: "object" });
    expect(doc.build.arcaneBond).toEqual({ type: "object" });
  });

  it("null clears the bond entirely", () => {
    const withBond = setArcaneBond(createEmptyDoc("t"), {
      type: "familiar",
      familiarKind: "cat",
    });
    const cleared = setArcaneBond(withBond, null);
    expect(cleared.build.arcaneBond).toBeUndefined();
    expect("arcaneBond" in cleared.build).toBe(false);
  });

  it("switching bond type replaces the previous choice", () => {
    let doc = setArcaneBond(createEmptyDoc("t"), {
      type: "familiar",
      familiarKind: "toad",
    });
    doc = setArcaneBond(doc, { type: "object", bondedItemName: "staff" });
    expect(doc.build.arcaneBond).toEqual({ type: "object", bondedItemName: "staff" });
  });

  it("does not mutate the input document", () => {
    const base = createEmptyDoc("t");
    setArcaneBond(base, { type: "familiar", familiarKind: "bat" });
    expect(base.build.arcaneBond).toBeUndefined();
  });
});
