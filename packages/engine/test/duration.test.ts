import { describe, expect, it } from "bun:test";
import type { ActiveBuff } from "@pf1/schema";

import { advanceConditionRounds, advanceRounds } from "../src/duration.js";

function buff(over: Partial<ActiveBuff> & { name: string }): ActiveBuff {
  return { instanceId: `b-${over.name}`, changes: [], ...over };
}

describe("advanceRounds", () => {
  it("decrements a timed buff and leaves an indefinite one alone", () => {
    const { buffs, expired } = advanceRounds(
      [buff({ name: "Bless", remainingRounds: 5 }), buff({ name: "Mage Armor" })],
      1,
    );
    expect(expired).toEqual([]);
    expect(buffs[0]!.remainingRounds).toBe(4);
    expect(buffs[1]!.remainingRounds).toBeUndefined();
  });

  it("expires a buff whose timer reaches zero", () => {
    const { buffs, expired } = advanceRounds([buff({ name: "Bless", remainingRounds: 2 })], 2);
    expect(buffs).toEqual([]);
    expect(expired.map((b) => b.name)).toEqual(["Bless"]);
  });

  it("counts elapsed rounds on an indefinite buff", () => {
    const one = advanceRounds([buff({ name: "Rage" })], 1).buffs;
    const three = advanceRounds(one, 2).buffs;
    expect(three[0]!.roundsActive).toBe(3);
  });

  it("credits an expiring buff only the rounds it actually had left", () => {
    // 2 rounds left, clock advanced 5: it ran for 2 more rounds, not 5.
    const { expired } = advanceRounds(
      [buff({ name: "Rage", remainingRounds: 2, roundsActive: 4 })],
      5,
    );
    expect(expired[0]!.roundsActive).toBe(6);
  });

  it("treats a zero-round advance as no time passing", () => {
    const { buffs } = advanceRounds([buff({ name: "Rage", remainingRounds: 3 })], 0);
    expect(buffs[0]!.remainingRounds).toBe(3);
    expect(buffs[0]!.roundsActive).toBe(0);
  });
});

describe("advanceConditionRounds", () => {
  it("is a no-op when nothing is timed", () => {
    const out = advanceConditionRounds(["fatigued", "shaken"], undefined, 3);
    expect(out.conditions).toEqual(["fatigued", "shaken"]);
    expect(out.expired).toEqual([]);
    expect(out.conditionRounds).toBeUndefined();
  });

  it("counts a timed condition down without touching untimed ones", () => {
    const out = advanceConditionRounds(["fatigued", "shaken"], { fatigued: 10 }, 4);
    expect(out.conditions).toEqual(["fatigued", "shaken"]);
    expect(out.conditionRounds).toEqual({ fatigued: 6 });
  });

  it("drops the condition and its timer when the countdown runs out", () => {
    const out = advanceConditionRounds(["fatigued", "shaken"], { fatigued: 2 }, 2);
    expect(out.conditions).toEqual(["shaken"]);
    expect(out.expired).toEqual(["fatigued"]);
    expect(out.conditionRounds).toBeUndefined();
  });

  it("discards a countdown left behind by a condition cleared by hand", () => {
    const out = advanceConditionRounds(["shaken"], { fatigued: 8 }, 1);
    expect(out.conditions).toEqual(["shaken"]);
    expect(out.conditionRounds).toBeUndefined();
    expect(out.expired).toEqual([]);
  });
});
