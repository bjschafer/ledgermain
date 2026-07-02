import { describe, expect, it } from "bun:test";

import type { ActiveBuff } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  addNonlethal,
  applyDamage,
  applyHealing,
  healNonlethal,
  restHp,
  setTempHp,
} from "../src/model/hp.js";
import { hasCondition, toggleCondition } from "../src/model/conditions.js";
import {
  addBuff,
  advanceRound,
  makeCustomBuff,
  removeBuff,
  setBuffRounds,
} from "../src/model/buffs.js";
import {
  addManualPool,
  drainResource,
  remaining,
  removePool,
  restAllResources,
  restoreResource,
  syncDerivedPools,
} from "../src/model/resources.js";

function doc() {
  return createEmptyDoc("t");
}

describe("HP math", () => {
  it("damage drains temp HP first, then current (which can go negative)", () => {
    let d = doc();
    d = setTempHp(d, 5);
    d = { ...d, live: { ...d.live, hp: { ...d.live.hp, current: 10 } } };
    d = applyDamage(d, 8); // 5 from temp, 3 from current
    expect(d.live.hp.temp).toBe(0);
    expect(d.live.hp.current).toBe(7);
    d = applyDamage(d, 9); // current 7 -> -2
    expect(d.live.hp.current).toBe(-2);
  });

  it("healing restores current up to max and never restores temp", () => {
    let d = doc();
    d = { ...d, live: { ...d.live, hp: { current: 2, temp: 0, nonlethal: 0 } } };
    d = applyHealing(d, 5, 12); // 2 -> 7
    expect(d.live.hp.current).toBe(7);
    d = applyHealing(d, 99, 12); // cap at max
    expect(d.live.hp.current).toBe(12);
  });

  it("healing hit point damage also removes an equal amount of nonlethal damage", () => {
    let d = doc();
    d = { ...d, live: { ...d.live, hp: { current: 4, temp: 0, nonlethal: 8 } } };
    d = applyHealing(d, 5, 12); // heal 5: nonlethal 8 -> 3
    expect(d.live.hp.nonlethal).toBe(3);
  });

  it("healing more than current nonlethal floors nonlethal at 0", () => {
    let d = doc();
    d = { ...d, live: { ...d.live, hp: { current: 4, temp: 0, nonlethal: 3 } } };
    d = applyHealing(d, 5, 12); // heal 5 > nonlethal 3 -> floored at 0
    expect(d.live.hp.nonlethal).toBe(0);
  });

  it("nonlethal accumulates and heals separately; rest clears everything", () => {
    let d = doc();
    d = { ...d, live: { ...d.live, hp: { current: 4, temp: 3, nonlethal: 0 } } };
    d = addNonlethal(d, 6);
    expect(d.live.hp.nonlethal).toBe(6);
    d = healNonlethal(d, 2);
    expect(d.live.hp.nonlethal).toBe(4);
    d = restHp(d, 12);
    expect(d.live.hp).toEqual({ current: 12, temp: 0, nonlethal: 0 });
  });
});

describe("conditions", () => {
  it("toggles on and off", () => {
    let d = doc();
    expect(hasCondition(d, "prone")).toBe(false);
    d = toggleCondition(d, "prone");
    expect(hasCondition(d, "prone")).toBe(true);
    d = toggleCondition(d, "prone");
    expect(hasCondition(d, "prone")).toBe(false);
  });
});

describe("buffs add/remove/round-advance", () => {
  const buff = (id: string, rounds?: number): ActiveBuff =>
    makeCustomBuff("Test", [{ formula: "1", target: "attack", type: "morale" }], {
      instanceId: id,
      remainingRounds: rounds,
    });

  it("adds and removes by instance id", () => {
    let d = doc();
    d = addBuff(d, buff("a"));
    d = addBuff(d, buff("b"));
    expect(d.live.activeBuffs.map((b) => b.instanceId)).toEqual(["a", "b"]);
    d = removeBuff(d, "a");
    expect(d.live.activeBuffs.map((b) => b.instanceId)).toEqual(["b"]);
  });

  it("advancing rounds ticks timers and auto-expires", () => {
    let d = doc();
    d = addBuff(d, buff("timed", 2));
    d = addBuff(d, buff("forever")); // indefinite
    let res = advanceRound(d, 1);
    d = res.doc;
    expect(res.expired).toHaveLength(0);
    expect(d.live.activeBuffs.find((b) => b.instanceId === "timed")?.remainingRounds).toBe(1);
    res = advanceRound(d, 1);
    d = res.doc;
    expect(res.expired.map((b) => b.instanceId)).toEqual(["timed"]);
    expect(d.live.activeBuffs.map((b) => b.instanceId)).toEqual(["forever"]);
  });

  it("can set/clear a buff's remaining rounds", () => {
    let d = doc();
    d = addBuff(d, buff("a"));
    d = setBuffRounds(d, "a", 5);
    expect(d.live.activeBuffs[0]!.remainingRounds).toBe(5);
    d = setBuffRounds(d, "a", undefined);
    expect(d.live.activeBuffs[0]!.remainingRounds).toBeUndefined();
  });
});

describe("resources drain/restore/sync/rest", () => {
  it("syncs derived pools, preserving used and tracking max changes", () => {
    let d = doc();
    d = syncDerivedPools(d, [{ id: "rage", name: "Rage", max: 14, classTag: "barbarian" }]);
    expect(d.live.resources.rage).toEqual({ used: 0, max: 14 });
    d = drainResource(d, "rage", 3);
    expect(d.live.resources.rage!.used).toBe(3);
    // Max shrinks (e.g. Con drain) -> used clamps.
    d = syncDerivedPools(d, [{ id: "rage", name: "Rage", max: 2, classTag: "barbarian" }]);
    expect(d.live.resources.rage).toEqual({ used: 2, max: 2 });
  });

  it("manual pools drain, restore, and rest to full", () => {
    let d = doc();
    d = addManualPool(d, "Spell slots L1", 4);
    expect(remaining(d.live.resources["Spell slots L1"]!)).toBe(4);
    d = drainResource(d, "Spell slots L1", 1);
    d = drainResource(d, "Spell slots L1", 10); // clamps at max
    expect(d.live.resources["Spell slots L1"]!.used).toBe(4);
    d = restoreResource(d, "Spell slots L1", 1);
    expect(d.live.resources["Spell slots L1"]!.used).toBe(3);
    d = restAllResources(d);
    expect(d.live.resources["Spell slots L1"]!.used).toBe(0);
    d = removePool(d, "Spell slots L1");
    expect(d.live.resources["Spell slots L1"]).toBeUndefined();
  });
});
