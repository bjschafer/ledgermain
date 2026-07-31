import { describe, expect, it } from "bun:test";

import type { DerivedResourcePool } from "@pf1/engine";

import { createEmptyDoc } from "../src/model/doc.js";
import { addNonlethal } from "../src/model/hp.js";
import {
  restAllResourcesWithRecovery,
  restorePool,
  spendPool,
  syncDerivedPools,
} from "../src/model/resources.js";

/**
 * Burn accepted is nonlethal damage taken, per the published rule the engine
 * puts on `DerivedResourcePool.nonlethalPerUse`: "For each point of burn she
 * accepts, a kineticist takes 1 point of nonlethal damage per character
 * level. This damage can't be healed by any means other than getting a full
 * night's rest, which removes all burn and associated nonlethal damage."
 */
const BURN: DerivedResourcePool = {
  id: "burn",
  name: "Burn",
  max: 6,
  restValue: 6,
  classTag: "kineticist",
  nonlethalPerUse: 7, // a 7th-level character
  linkedBuffIds: [],
};

/** A pool with no self-damage — every other derived pool in the app. */
const RAGE: DerivedResourcePool = {
  id: "rage",
  name: "Rage",
  max: 14,
  restValue: 14,
  classTag: "barbarian",
  linkedBuffIds: [],
};

function kineticist() {
  return syncDerivedPools(createEmptyDoc("t"), [BURN]);
}

describe("accepting burn", () => {
  it("takes 1 point of nonlethal per character level, per point accepted", () => {
    let d = kineticist();
    d = spendPool(d, BURN);
    expect(d.live.resources.burn!.used).toBe(1);
    expect(d.live.hp.nonlethal).toBe(7);

    d = spendPool(d, BURN, 2);
    expect(d.live.resources.burn!.used).toBe(3);
    expect(d.live.hp.nonlethal).toBe(21);
  });

  it("charges only for the burn actually accepted when the pool is nearly full", () => {
    let d = kineticist();
    d = spendPool(d, BURN, 5);
    // The pool clamps at its max of 6, so the 5th and 6th points cost 2 x 7.
    d = spendPool(d, BURN, 3);
    expect(d.live.resources.burn!.used).toBe(6);
    expect(d.live.hp.nonlethal).toBe(42);
  });

  it("takes nothing when the character is immune to nonlethal damage", () => {
    const d = spendPool(kineticist(), BURN, 2, { immuneToNonlethal: true });
    expect(d.live.resources.burn!.used).toBe(2);
    expect(d.live.hp.nonlethal).toBe(0);
  });

  it("leaves hit points alone for a pool that costs no nonlethal damage", () => {
    let d = syncDerivedPools(createEmptyDoc("t"), [RAGE]);
    d = spendPool(d, RAGE, 4);
    expect(d.live.resources.rage!.used).toBe(4);
    expect(d.live.hp.nonlethal).toBe(0);
  });
});

describe("releasing burn", () => {
  it("heals exactly what the released points cost", () => {
    let d = spendPool(kineticist(), BURN, 3);
    d = restorePool(d, BURN, 2);
    expect(d.live.resources.burn!.used).toBe(1);
    expect(d.live.hp.nonlethal).toBe(7);
  });

  it("never heals below zero, and only for points actually released", () => {
    let d = spendPool(kineticist(), BURN, 1);
    d = restorePool(d, BURN, 5); // only 1 point to give back
    expect(d.live.resources.burn!.used).toBe(0);
    expect(d.live.hp.nonlethal).toBe(0);
  });

  it("cannot tell burn nonlethal from any other nonlethal damage", () => {
    // Documented limitation: a character who took unrelated nonlethal damage
    // while holding burn keeps it, because releasing burn only heals its own
    // cost — but the two are the same pool of hit points either way.
    let d = addNonlethal(kineticist(), 4);
    d = spendPool(d, BURN, 1);
    expect(d.live.hp.nonlethal).toBe(11);
    d = restorePool(d, BURN, 1);
    expect(d.live.hp.nonlethal).toBe(4);
  });
});

describe("resting", () => {
  it("removes all burn and the nonlethal damage it was holding", () => {
    let d = spendPool(kineticist(), BURN, 4);
    expect(d.live.hp.nonlethal).toBe(28);
    d = restAllResourcesWithRecovery(d, [BURN]);
    expect(d.live.resources.burn!.used).toBe(0);
    expect(d.live.hp.nonlethal).toBe(0);
  });

  it("leaves nonlethal damage from other sources untouched", () => {
    let d = addNonlethal(spendPool(kineticist(), BURN, 1), 5);
    d = restAllResourcesWithRecovery(d, [BURN]);
    expect(d.live.hp.nonlethal).toBe(5);
  });

  it("restores pools that carry no nonlethal cost exactly as before", () => {
    let d = syncDerivedPools(createEmptyDoc("t"), [RAGE]);
    d = spendPool(d, RAGE, 6);
    d = restAllResourcesWithRecovery(d, [RAGE]);
    expect(d.live.resources.rage!.used).toBe(0);
    expect(d.live.hp.nonlethal).toBe(0);
  });
});
