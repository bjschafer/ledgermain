/**
 * Hand-computed fixture tests for the inquisitor Judgment table (issue #65),
 * both the derived-pool wiring (`deriveResourcePools`'s `tableOptions`, see
 * `judgments.ts`) and the individual judgments' `changes` flowing through
 * `compute()` exactly like any other active buff.
 *
 * RAW numbers verified against aonprd.com's live Inquisitor class page
 * (2026-07-08): Destruction +1/+1 per 3 levels (weapon damage), Justice/
 * Protection/Purity +1/+1 per 5 levels (attack/AC/saves), Resiliency DR
 * 1/magic +1 per 5 levels, Resistance/Smiting have no single unambiguous
 * numeric target (see judgments.ts doc comment) and are context-note only.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  INQUISITOR_JUDGMENTS,
  judgmentToggleOptions,
  maxSimultaneousJudgments,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  level: number;
  abilities?: CharacterDoc["abilities"];
  weapons?: WeaponInstance[];
  activeBuffs?: ActiveBuff[];
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
      classes: [{ tag: "inquisitor", level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 16, dex: 12, con: 14, int: 10, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: opts.weapons ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function judgmentBuff(tag: string): ActiveBuff {
  const def = INQUISITOR_JUDGMENTS.find((j) => j.tag === tag);
  if (!def) throw new Error(`judgment not found: ${tag}`);
  return {
    instanceId: `buff-${tag}`,
    effectTag: `judgment:${tag}`,
    name: def.name,
    changes: def.changes,
    contextNotes: def.contextNotes,
  };
}

describe("INQUISITOR_JUDGMENTS table", () => {
  it("has all seven core judgments, each with a unique tag", () => {
    expect(INQUISITOR_JUDGMENTS).toHaveLength(7);
    const tags = INQUISITOR_JUDGMENTS.map((j) => j.tag);
    expect(new Set(tags).size).toBe(7);
  });

  it("Resistance and Smiting carry no numeric changes (energy type / DR bypass type not chosen here)", () => {
    const resistance = INQUISITOR_JUDGMENTS.find((j) => j.tag === "resistance")!;
    const smiting = INQUISITOR_JUDGMENTS.find((j) => j.tag === "smiting")!;
    expect(resistance.changes).toEqual([]);
    expect(smiting.changes).toEqual([]);
    expect(resistance.contextNotes?.length).toBeGreaterThan(0);
    expect(smiting.contextNotes?.length).toBeGreaterThan(0);
  });
});

describe("judgmentToggleOptions", () => {
  it("maps every judgment to a `judgment:<tag>`-prefixed ToggleBuffOption", () => {
    const options = judgmentToggleOptions();
    expect(options).toHaveLength(7);
    expect(options.map((o) => o.id)).toContain("judgment:destruction");
    expect(options.map((o) => o.id)).toContain("judgment:resistance");
  });
});

describe("maxSimultaneousJudgments", () => {
  it("1 before 8th level", () => {
    expect(maxSimultaneousJudgments(1)).toBe(1);
    expect(maxSimultaneousJudgments(7)).toBe(1);
  });
  it("2 at 8th-15th (Second Judgment)", () => {
    expect(maxSimultaneousJudgments(8)).toBe(2);
    expect(maxSimultaneousJudgments(15)).toBe(2);
  });
  it("3 at 16th+ (Third Judgment)", () => {
    expect(maxSimultaneousJudgments(16)).toBe(3);
    expect(maxSimultaneousJudgments(20)).toBe(3);
  });
});

describe("deriveResourcePools: Judgment pool (inquisitor)", () => {
  it("inquisitor L1: 1 use/day (vendored uses.maxFormula), 7 tableOptions, 1-active-at-a-time detail", () => {
    const doc = makeDoc({ level: 1 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const judgment = pools.find((p) => p.name === "Judgment");
    expect(judgment).toBeDefined();
    expect(judgment!.max).toBe(1);
    expect(judgment!.per).toBe("day");
    expect(judgment!.tableOptions).toHaveLength(7);
    expect(judgment!.detail).toContain("1 judgment active at a time");
  });

  it("inquisitor L9: 1 + floor(8/3) = 3 uses/day", () => {
    const doc = makeDoc({ level: 9 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const judgment = pools.find((p) => p.name === "Judgment");
    expect(judgment!.max).toBe(3);
  });

  it("inquisitor L8: pool detail mentions 2 simultaneous judgments (Second Judgment)", () => {
    const doc = makeDoc({ level: 8 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const judgment = pools.find((p) => p.name === "Judgment");
    expect(judgment!.detail).toContain("2 judgments active at once");
  });
});

describe("Judgment changes through compute()", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    category: "melee",
    attackAbility: "str",
    damageDice: "1d8",
  };

  it("Destruction at L9: +4 sacred weapon damage (1 + floor(9/3))", () => {
    const noBuff = compute(makeDoc({ level: 9, weapons: [sword] }), ref);
    const withBuff = compute(
      makeDoc({ level: 9, weapons: [sword], activeBuffs: [judgmentBuff("destruction")] }),
      ref,
    );
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 4);
    const comp = withBuff.attacks[0]!.damageBonus.components.find(
      (c) => c.source === "Destruction",
    );
    expect(comp?.value).toBe(4);
    expect(comp?.type).toBe("sacred");
  });

  it("Justice at L10: +3 sacred attack (1 + floor(10/5))", () => {
    const noBuff = compute(makeDoc({ level: 10 }), ref);
    const withBuff = compute(makeDoc({ level: 10, activeBuffs: [judgmentBuff("justice")] }), ref);
    expect(withBuff.attack.melee.total).toBe(noBuff.attack.melee.total + 3);
  });

  it("Protection at L10: +3 sacred AC (1 + floor(10/5))", () => {
    const noBuff = compute(makeDoc({ level: 10 }), ref);
    const withBuff = compute(
      makeDoc({ level: 10, activeBuffs: [judgmentBuff("protection")] }),
      ref,
    );
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal + 3);
  });

  it("Purity at L10: +3 sacred on all three saves (1 + floor(10/5))", () => {
    const noBuff = compute(makeDoc({ level: 10 }), ref);
    const withBuff = compute(makeDoc({ level: 10, activeBuffs: [judgmentBuff("purity")] }), ref);
    expect(withBuff.saves.fort.total).toBe(noBuff.saves.fort.total + 3);
    expect(withBuff.saves.ref.total).toBe(noBuff.saves.ref.total + 3);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 3);
  });

  it("Resiliency at L15: DR 4/magic (1 + floor(15/5))", () => {
    const withBuff = compute(
      makeDoc({ level: 15, activeBuffs: [judgmentBuff("resiliency")] }),
      ref,
    );
    expect(withBuff.defenses).toBeDefined();
    expect(withBuff.defenses!.dr).toEqual([
      {
        total: 4,
        qualifier: "magic",
        components: [
          {
            source: "Resiliency",
            sourceId: "buff-resiliency",
            type: "untyped",
            value: 4,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("Destruction at L1: minimum +1 (1 + floor(1/3) = 1)", () => {
    const noBuff = compute(makeDoc({ level: 1, weapons: [sword] }), ref);
    const withBuff = compute(
      makeDoc({ level: 1, weapons: [sword], activeBuffs: [judgmentBuff("destruction")] }),
      ref,
    );
    expect(withBuff.attacks[0]!.damageBonus.total).toBe(noBuff.attacks[0]!.damageBonus.total + 1);
  });
});
