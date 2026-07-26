import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import { advanceRound, removeBuff, toggleLinkedBuff, toggleTableBuff } from "../src/model/buffs.js";
import { hasCondition } from "../src/model/conditions.js";

/**
 * Rage/bloodrage fatigue aftermath (issue #67): PF1 RAW differs by rage
 * flavor —
 *   - Chained Rage (barbarian, CRB): fatigued for 2x rounds raged, UNLESS
 *     Tireless Rage (17th level) — aonprd.com, 2026-07-25.
 *   - Bloodrage (bloodrager, ACG): identical, gated by Tireless Bloodrage
 *     (17th) — aonprd.com, 2026-07-25.
 *   - Rage (Unchained): fatigued 1 minute flat — a DIFFERENT, timer-shaped
 *     claim this tracker doesn't attempt (see `rage-fatigue.ts`), so no
 *     fatigue is auto-applied for it at all.
 *   - Inspired Rage (skald's Raging Song): no fatigue at all per RAW.
 * This app has no timed-condition model, so the tested behavior is: ending a
 * covered buff auto-activates `fatigued` UNTIMED (never a duration), and
 * never for the excluded buffs.
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

  it("Rage (Unchained) ending does NOT auto-apply fatigued (1-minute flat duration, not modeled as untimed)", () => {
    const doc = makeDoc([{ tag: "barbarianUnchained", level: 4 }]);
    const withBuff = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [activeBuff({ name: "Rage (Unchained)", instanceId: "b1" })],
      },
    };
    const after = removeBuff(withBuff, "b1");
    expect(hasCondition(after, "fatigued")).toBe(false);
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

  it("a timed Rage (Unchained) buff expiring on the clock does NOT auto-apply fatigued", () => {
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
    expect(hasCondition(after, "fatigued")).toBe(false);
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
