/**
 * Unit tests for `setFeatSlotPin` (model/doc.ts) — the player-declared feat
 * INSTANCE -> class feat-slot GROUP attribution stored in
 * `build.featSlotAssignments`. Pure transition tests only; `featSlots.test.ts`
 * covers how `assignFeatsToSlots` consumes the stored pins.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setFeatSlotPin } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setFeatSlotPin()", () => {
  it("pins a feat instance to a slot group", () => {
    const next = setFeatSlotPin(doc(), "power-attack", "brawlerCombat");
    expect(next.build.featSlotAssignments).toEqual({ "power-attack": "brawlerCombat" });
  });

  it("pins multiple instances independently", () => {
    let next = setFeatSlotPin(doc(), "power-attack", "brawlerCombat");
    next = setFeatSlotPin(next, "cleave", "combat");
    expect(next.build.featSlotAssignments).toEqual({
      "power-attack": "brawlerCombat",
      cleave: "combat",
    });
  });

  it("re-pinning the same instance replaces its prior pin", () => {
    let next = setFeatSlotPin(doc(), "power-attack", "brawlerCombat");
    next = setFeatSlotPin(next, "power-attack", "combat");
    expect(next.build.featSlotAssignments).toEqual({ "power-attack": "combat" });
  });

  it("clearing with null removes just that instance's pin", () => {
    let next = setFeatSlotPin(doc(), "power-attack", "brawlerCombat");
    next = setFeatSlotPin(next, "cleave", "combat");
    next = setFeatSlotPin(next, "power-attack", null);
    expect(next.build.featSlotAssignments).toEqual({ cleave: "combat" });
  });

  it("clearing the last pin drops the field entirely rather than leaving an empty object", () => {
    let next = setFeatSlotPin(doc(), "power-attack", "brawlerCombat");
    next = setFeatSlotPin(next, "power-attack", null);
    expect(next.build.featSlotAssignments).toBeUndefined();
  });

  it("clearing an instance that was never pinned is a no-op", () => {
    const base = doc();
    expect(setFeatSlotPin(base, "power-attack", null)).toBe(base);
  });

  it("a fresh document has no pins", () => {
    expect(doc().build.featSlotAssignments).toBeUndefined();
  });
});
