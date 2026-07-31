import { describe, expect, it } from "bun:test";

import { srCheckOutcome, srNeededRoll } from "../src/model/srCheck.js";

describe("srNeededRoll()", () => {
  it("computes the plain margin when it falls within the die range", () => {
    // SR 20 vs. CL 10 needs a 10 to beat it.
    const r = srNeededRoll(20, 10);
    expect(r.margin).toBe(10);
    expect(r.neededRoll).toBe(10);
    expect(r.autoSucceeds).toBe(false);
    expect(r.impossible).toBe(false);
  });

  it("reports auto-success once caster level alone meets SR", () => {
    // SR 15 vs. CL 15: even a 1 clears it (1 + 15 = 16 >= 15).
    const r = srNeededRoll(15, 15);
    expect(r.margin).toBe(0);
    expect(r.neededRoll).toBe(1);
    expect(r.autoSucceeds).toBe(true);
  });

  it("clamps the needed roll at 1 rather than going negative", () => {
    const r = srNeededRoll(10, 25);
    expect(r.margin).toBe(-15);
    expect(r.neededRoll).toBe(1);
    expect(r.autoSucceeds).toBe(true);
  });

  it("reports impossible once the margin exceeds what a natural 20 can close", () => {
    // No natural-20 auto-success against SR, so a 21+ margin is unbeatable.
    const r = srNeededRoll(40, 10);
    expect(r.margin).toBe(30);
    expect(r.neededRoll).toBe(21);
    expect(r.impossible).toBe(true);
  });

  it("treats a margin of exactly 20 as still beatable (needs a natural 20)", () => {
    const r = srNeededRoll(30, 10);
    expect(r.margin).toBe(20);
    expect(r.neededRoll).toBe(20);
    expect(r.impossible).toBe(false);
  });

  it("treats a margin of exactly 21 as impossible", () => {
    const r = srNeededRoll(31, 10);
    expect(r.margin).toBe(21);
    expect(r.neededRoll).toBe(21);
    expect(r.impossible).toBe(true);
  });
});

describe("srCheckOutcome()", () => {
  it("affects the target when the total meets SR exactly", () => {
    expect(srCheckOutcome(18, 18)).toBe("affects");
  });

  it("affects the target when the total exceeds SR", () => {
    expect(srCheckOutcome(18, 25)).toBe("affects");
  });

  it("is resisted when the total falls short of SR", () => {
    expect(srCheckOutcome(18, 17)).toBe("resisted");
  });
});
