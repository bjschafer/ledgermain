/**
 * Hand-computed fixture tests for the "size" change target (Enlarge Person,
 * Reduce Person, and similar effects). These shift the character along the
 * size ladder (fine..col) BEFORE size-derived numbers (attack/AC size mod,
 * CMB/CMD special size mod) are derived, so a +1/-1 "size" buff should move
 * every size-dependent number by the expected amount.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

/** Minimal CharacterDoc factory; barbarian L1 (medium, human) with an optional buff. */
function makeDoc(activeBuffs: ActiveBuff[] = [], weapons: WeaponInstance[] = []): CharacterDoc {
  const humanEntry = Object.entries(ref.races).find(([, r]) => r.name === "Human");
  if (!humanEntry) throw new Error("Human race not found in ref data");
  const [humanId] = humanEntry;

  return {
    schemaVersion: 1,
    id: "size-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: humanId,
      classes: [{ tag: "barbarian", level: 1 }],
    },
    // STR 16 -> mod +3; DEX 14 -> mod +2
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

// Baseline (medium, no size change): BAB 1, STR mod 3, DEX mod 2.
const baseline = compute(makeDoc(), ref);

describe("size: no change target present leaves size mods at Medium baseline", () => {
  it("melee attack has no Size component (0 mod at Medium)", () => {
    const comps = baseline.attack.melee.components;
    expect(comps.find((c) => c.source === "Size")).toBeUndefined();
  });

  it("cmb = BAB(1) + STR(3) + specialSize(0) = 4", () => {
    expect(baseline.cmb).toBe(4);
  });
});

describe("size: Enlarge Person (+1 size step) shifts AC/attack/CMB/CMD", () => {
  const enlarge: ActiveBuff = {
    instanceId: "buff-enlarge",
    name: "Enlarge Person",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };
  const sheet = compute(makeDoc([enlarge]), ref);

  it("melee/ranged attack lose 1 (size mod for Large = -1)", () => {
    expect(sheet.attack.melee.total).toBe(baseline.attack.melee.total - 1);
    expect(sheet.attack.ranged.total).toBe(baseline.attack.ranged.total - 1);
  });

  it("AC loses 1 (size mod for Large = -1)", () => {
    expect(sheet.ac.normal).toBe(baseline.ac.normal - 1);
  });

  it("CMB gains 1 (special size mod for Large = +1)", () => {
    expect(sheet.cmb).toBe(baseline.cmb + 1);
  });

  it("CMD gains 1 (special size mod for Large = +1)", () => {
    expect(sheet.cmd).toBe(baseline.cmd + 1);
  });
});

describe("size: Reduce Person (-1 size step) shifts AC/attack/CMB/CMD the other way", () => {
  const reduce: ActiveBuff = {
    instanceId: "buff-reduce",
    name: "Reduce Person",
    changes: [{ target: "size", type: "untyped", formula: "-1" }],
  };
  const sheet = compute(makeDoc([reduce]), ref);

  it("melee/ranged attack gain 1 (size mod for Small = +1)", () => {
    expect(sheet.attack.melee.total).toBe(baseline.attack.melee.total + 1);
    expect(sheet.attack.ranged.total).toBe(baseline.attack.ranged.total + 1);
  });

  it("AC gains 1 (size mod for Small = +1)", () => {
    expect(sheet.ac.normal).toBe(baseline.ac.normal + 1);
  });

  it("CMB loses 1 (special size mod for Small = -1)", () => {
    expect(sheet.cmb).toBe(baseline.cmb - 1);
  });

  it("CMD loses 1 (special size mod for Small = -1)", () => {
    expect(sheet.cmd).toBe(baseline.cmd - 1);
  });
});

describe("size: per-weapon attack lines pick up the shifted size mod too", () => {
  const sword: WeaponInstance = {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
  };
  const enlarge: ActiveBuff = {
    instanceId: "buff-enlarge-weapon",
    name: "Enlarge Person",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };
  const baselineWithWeapon = compute(makeDoc([], [sword]), ref);
  const sheet = compute(makeDoc([enlarge], [sword]), ref);

  it("weapon attack line loses 1 relative to the un-enlarged baseline", () => {
    expect(sheet.attacks[0]!.attack.total).toBe(baselineWithWeapon.attacks[0]!.attack.total - 1);
  });

  it("weapon attack components include a Size entry of -1", () => {
    const comp = sheet.attacks[0]!.attack.components.find((c) => c.source === "Size");
    expect(comp?.value).toBe(-1);
  });
});

describe("size: stacked size changes round toward zero and sum before shifting", () => {
  // Two +0.5-ish fractional formulas aren't realistic PF1 content, but two
  // separate +1 sources should sum to +2 steps (Medium -> Huge), not double-apply
  // per source independently of stacking rules (size steps aren't a "type" the
  // stacking engine dedupes — they're a plain sum per the plan).
  const first: ActiveBuff = {
    instanceId: "buff-a",
    name: "Effect A",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };
  const second: ActiveBuff = {
    instanceId: "buff-b",
    name: "Effect B",
    changes: [{ target: "size", type: "untyped", formula: "1" }],
  };
  const sheet = compute(makeDoc([first, second]), ref);

  it("AC reflects a 2-step shift to Huge (size mod -2)", () => {
    expect(sheet.ac.normal).toBe(baseline.ac.normal - 2);
  });
});

describe("size: clamps at the ladder's ends instead of going out of range", () => {
  const hugeShift: ActiveBuff = {
    instanceId: "buff-huge-shift",
    name: "Absurd Growth",
    changes: [{ target: "size", type: "untyped", formula: "20" }],
  };
  const sheet = compute(makeDoc([hugeShift]), ref);

  it("clamps at Colossal (size mod -8) instead of throwing or going further", () => {
    expect(sheet.ac.normal).toBe(baseline.ac.normal - 8);
  });
});
