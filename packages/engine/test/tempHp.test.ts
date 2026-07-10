import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for temporary HP (issue #67):
 *   1. Unchained Rage's hand-authored `tempHp` patch (`buff-effects.ts`) —
 *      the vendored "Rage (Unchained)" buff itself carries no `tempHp`
 *      Change (confirmed absent in `barbarian-unchained.test.ts`), so this
 *      exercises the patch end to end via `compute()`.
 *   2. The PF1 RAW temp-HP stacking rule (Paizo FAQ / CRB p. 208 "Combining
 *      Magical Effects"): same source doesn't stack (highest wins); different
 *      sources DO stack (sum) — via two synthetic buffs targeting `tempHp`
 *      directly (no vendored source needed to prove the aggregation math).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  level: number;
  classTag?: string;
  abilities?: CharacterDoc["abilities"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: over.classTag ?? "barbarianUnchained", level: over.level }],
    },
    abilities: over.abilities ?? { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

describe("Unchained Rage temp HP (issue #67)", () => {
  it("not raging: grantedTemp is 0", () => {
    const doc = makeDoc({ level: 5 });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(0);
    expect(sheet.hp.grantedTemp.components).toEqual([]);
  });

  it("L5 Con 14 barbarianUnchained raging: 2 temp HP per Hit Die x 5 HD = 10", () => {
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const doc = makeDoc({
      level: 5,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(10);
  });

  it("L11 (Greater Rage tier, 3/HD): 3 x 11 = 33", () => {
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const doc = makeDoc({
      level: 11,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(33);
  });

  it("L20 (Mighty Rage tier, 4/HD): 4 x 20 = 80", () => {
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const doc = makeDoc({
      level: 20,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(80);
  });

  it("chained Rage (not Unchained) grants no temp HP — the patch is keyed strictly by the Unchained buff's name", () => {
    const chainedRageBuff = ref.buffs[buffId("Rage")]!;
    const doc = makeDoc({
      level: 5,
      classTag: "barbarian",
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: chainedRageBuff.id,
          name: chainedRageBuff.name,
          changes: chainedRageBuff.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(0);
  });
});

describe("Temp HP stacking (PF1 RAW: same source doesn't stack; different sources do)", () => {
  it("two instances of the SAME source: highest applies, not the sum", () => {
    const doc = makeDoc({
      level: 1,
      activeBuffs: [
        {
          instanceId: "a1",
          name: "Aid",
          changes: [{ formula: "5", target: "tempHp", type: "untyped" }],
        },
        {
          instanceId: "a2",
          name: "Aid",
          changes: [{ formula: "9", target: "tempHp", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(9);
    const applied = sheet.hp.grantedTemp.components.filter((c) => c.applied);
    expect(applied).toHaveLength(1);
    expect(applied[0]!.value).toBe(9);
  });

  it("two DIFFERENT sources: stack (sum), not highest-only", () => {
    const doc = makeDoc({
      level: 1,
      activeBuffs: [
        {
          instanceId: "a1",
          name: "Aid",
          changes: [{ formula: "5", target: "tempHp", type: "untyped" }],
        },
        {
          instanceId: "b1",
          name: "Vampiric Touch",
          changes: [{ formula: "12", target: "tempHp", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.hp.grantedTemp.total).toBe(17);
    expect(sheet.hp.grantedTemp.components.filter((c) => c.applied)).toHaveLength(2);
  });
});
