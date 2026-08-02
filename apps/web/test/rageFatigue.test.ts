import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import { advanceRound, removeBuff, toggleLinkedBuff, toggleTableBuff } from "../src/model/buffs.js";
import { conditionRoundsLeft, hasCondition, toggleCondition } from "../src/model/conditions.js";

/**
 * Rage/bloodrage fatigue aftermath: PF1 RAW differs by rage flavor —
 *   - Chained Rage (barbarian, CRB): fatigued for 2x rounds raged, UNLESS
 *     Tireless Rage (17th level) — aonprd.com, 2026-07-25.
 *   - Bloodrage (bloodrager, ACG): identical, gated by Tireless Bloodrage
 *     (17th) — aonprd.com, 2026-07-25.
 *   - Rage (Unchained): fatigued for a flat 1 minute (10 rounds), regardless
 *     of how long the rage ran.
 *   - Inspired Rage (skald's Raging Song): no fatigue at all per RAW.
 * Ending a covered buff auto-activates `fatigued`, with a `conditionRounds`
 * countdown whenever the duration is knowable — the flat unchained minute
 * always, and twice the rounds raged when the round clock measured them. A
 * chained rage ended without the clock running yields an UNTIMED fatigue, the
 * honest answer for an unknown elapsed time.
 */
function makeDoc(classes: { tag: string; level: number }[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function activeBuff(over: Partial<ActiveBuff> & { name: string }): ActiveBuff {
  return { instanceId: "buff-1", changes: [], ...over };
}

describe("rage fatigue aftermath — manual removal (removeBuff)", () => {
  it("chained Rage ending auto-applies fatigued", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(after.live.activeBuffs).toEqual([]);
    expect(hasCondition(after, "fatigued")).toBe(true);
  });

  it("Bloodrage ending auto-applies fatigued", () => {
    const doc = makeDoc([{ tag: "bloodrager", level: 4 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Bloodrage", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(true);
  });

  it("Rage (Unchained) ending applies fatigued for a flat 10 rounds (1 minute)", () => {
    const doc = makeDoc([{ tag: "barbarianUnchained", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        // Raged for 6 rounds: the unchained aftermath ignores that entirely.
        activeBuffs: [activeBuff({ name: "Rage (Unchained)", instanceId: "b1", roundsActive: 6 })],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(true);
    expect(conditionRoundsLeft(after, "fatigued")).toBe(10);
  });

  it("chained Rage ending after a measured rage lasts twice the rounds raged", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1", roundsActive: 5 })],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(conditionRoundsLeft(after, "fatigued")).toBe(10);
  });

  it("chained Rage ended without the round clock leaves the fatigue untimed", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(true);
    expect(conditionRoundsLeft(after, "fatigued")).toBeUndefined();
  });

  it("Inspired Rage (skald's Raging Song) ending does NOT auto-apply fatigued", () => {
    const doc = makeDoc([{ tag: "skald", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff({
            name: "Inspired Rage",
            instanceId: "b1",
            effectTag: "ragingSong:inspiredRage",
          }),
        ],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
  });

  it("Rage (Spell) ending does NOT auto-apply fatigued (RAW: no fatigue)", () => {
    const doc = makeDoc([]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Rage (Spell)", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
  });

  it("a 17th-level barbarian's Tireless Rage negates the aftermath entirely", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 17 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
  });

  it("a 17th-level bloodrager's Tireless Bloodrage negates the aftermath entirely", () => {
    const doc = makeDoc([{ tag: "bloodrager", level: 17 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Bloodrage", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
  });

  it("removing an unrelated buff (e.g. Mage Armor) never touches fatigued", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Mage Armor", instanceId: "b1" })] },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
  });

  it("is idempotent if fatigued is already active (never gets removed/re-toggled)", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        conditions: ["fatigued"],
        activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(true);
  });

  it("does not downgrade an already-exhausted character (ladder-aware)", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        conditions: ["exhausted"],
        activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(after.live.conditions).toEqual(["exhausted"]);
  });
});

describe("rage fatigue aftermath — resource-pool toggle (toggleLinkedBuff / toggleTableBuff)", () => {
  it("toggling the linked Rage buff off auto-applies fatigued", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const buff = {
      id: "vendored-rage",
      name: "Rage",
      uuid: "Compendium.pf1.buffs.Item.rage",
      changes: [],
      contextNotes: [],
    };
    const raging = toggleLinkedBuff(doc, buff, 4);
    expect(raging.live.activeBuffs).toHaveLength(1);
    const after = toggleLinkedBuff(raging, buff, 4);
    expect(after.live.activeBuffs).toHaveLength(0);
    expect(hasCondition(after, "fatigued")).toBe(true);
  });

  it("toggling a table buff off (e.g. a hand-authored option sharing the Bloodrage name) auto-applies fatigued", () => {
    const doc = makeDoc([{ tag: "bloodrager", level: 4 }]);
    const option = { id: "bloodrage:test", name: "Bloodrage", changes: [] };
    const raging = toggleTableBuff(doc, option);
    const after = toggleTableBuff(raging, option);
    expect(hasCondition(after, "fatigued")).toBe(true);
  });
});

describe("rage fatigue aftermath — round-clock expiry (advanceRound)", () => {
  it("a timed Rage buff expiring on the clock auto-applies fatigued", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1", remainingRounds: 1 })],
      },
    };
    const { doc: after, expired } = advanceRound(withBuff, 1);
    expect(expired).toHaveLength(1);
    expect(after.live.activeBuffs).toEqual([]);
    expect(hasCondition(after, "fatigued")).toBe(true);
  });

  it("a timed Rage (Unchained) buff expiring on the clock applies its 10-round fatigue", () => {
    const doc = makeDoc([{ tag: "barbarianUnchained", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff({ name: "Rage (Unchained)", instanceId: "b1", remainingRounds: 1 }),
        ],
      },
    };
    const { doc: after } = advanceRound(withBuff, 1);
    expect(hasCondition(after, "fatigued")).toBe(true);
    // The round that ended the rage must not also spend a round of the fatigue.
    expect(conditionRoundsLeft(after, "fatigued")).toBe(10);
  });

  it("the fatigue countdown ticks down and clears itself when it runs out", () => {
    const doc = makeDoc([{ tag: "barbarianUnchained", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff({ name: "Rage (Unchained)", instanceId: "b1", remainingRounds: 1 }),
        ],
      },
    };
    const raged = advanceRound(withBuff, 1).doc;
    expect(conditionRoundsLeft(advanceRound(raged, 9).doc, "fatigued")).toBe(1);
    const tenLater = advanceRound(raged, 10);
    expect(hasCondition(tenLater.doc, "fatigued")).toBe(false);
    expect(tenLater.expiredConditions).toEqual(["fatigued"]);
    expect(tenLater.doc.live.conditionRounds).toBeUndefined();
  });

  it("clearing a timed condition by hand takes its countdown with it", () => {
    const doc = makeDoc([{ tag: "barbarianUnchained", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff({ name: "Rage (Unchained)", instanceId: "b1", remainingRounds: 1 }),
        ],
      },
    };
    const raged = advanceRound(withBuff, 1).doc;
    const cleared = toggleCondition(raged, "fatigued");
    expect(cleared.live.conditionRounds).toBeUndefined();
  });

  it("counts rounds raged for a rage with no set duration", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1" })] },
    };
    const threeRounds = advanceRound(advanceRound(advanceRound(withBuff).doc).doc).doc;
    expect(threeRounds.live.activeBuffs[0]!.roundsActive).toBe(3);
    const after = removeBuff(threeRounds, "b1");
    expect(conditionRoundsLeft(after, "fatigued")).toBe(6);
  });

  it("a still-active (non-expiring) Rage buff never triggers the aftermath early", () => {
    const doc = makeDoc([{ tag: "barbarian", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [activeBuff({ name: "Rage", instanceId: "b1", remainingRounds: 5 })],
      },
    };
    const { doc: after, expired } = advanceRound(withBuff, 1);
    expect(expired).toHaveLength(0);
    expect(hasCondition(after, "fatigued")).toBe(false);
  });
});
