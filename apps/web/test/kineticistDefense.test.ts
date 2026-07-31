import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  clearKineticistDefenseBurn,
  setKineticistDefenseBurn,
  setKineticistShroudMode,
} from "../src/model/kineticistBuild.js";

/**
 * The live half of Elemental Defense: how much of the burn held went into the
 * defense, and which shape Shroud of Water is currently in. The arithmetic
 * these feed lives in `@pf1/engine`'s `resolveKineticistDefense`; what's
 * tested here is that the transitions stay pure and store nothing they don't
 * have to.
 */
function doc() {
  return createEmptyDoc("t");
}

describe("burn spent on the defense", () => {
  it("records whole, non-negative points", () => {
    expect(setKineticistDefenseBurn(doc(), 3).live.kineticistDefenseBurn).toBe(3);
    expect(setKineticistDefenseBurn(doc(), 2.7).live.kineticistDefenseBurn).toBe(2);
    expect(setKineticistDefenseBurn(doc(), -4).live.kineticistDefenseBurn).toBeUndefined();
  });

  it("drops the field entirely at zero rather than storing a 0", () => {
    const spent = setKineticistDefenseBurn(doc(), 2);
    expect(setKineticistDefenseBurn(spent, 0).live.kineticistDefenseBurn).toBeUndefined();
  });

  it("does not validate against the burn held, leaving that to the engine's clamp", () => {
    // Soft posture: an overstated counter is inert, not rejected.
    expect(setKineticistDefenseBurn(doc(), 99).live.kineticistDefenseBurn).toBe(99);
  });

  it("clears for a rest, and is a no-op when there was nothing to clear", () => {
    const spent = setKineticistDefenseBurn(doc(), 4);
    expect(clearKineticistDefenseBurn(spent).live.kineticistDefenseBurn).toBeUndefined();
    const clean = doc();
    expect(clearKineticistDefenseBurn(clean)).toBe(clean);
  });

  it("never mutates the document it was given", () => {
    const before = doc();
    setKineticistDefenseBurn(before, 5);
    expect(before.live.kineticistDefenseBurn).toBeUndefined();
  });
});

describe("Shroud of Water's shape", () => {
  it("stores only the non-default shield shape", () => {
    expect(setKineticistShroudMode(doc(), "shield").live.kineticistShroudMode).toBe("shield");
    const shielded = setKineticistShroudMode(doc(), "shield");
    expect(setKineticistShroudMode(shielded, "armor").live.kineticistShroudMode).toBeUndefined();
  });
});
