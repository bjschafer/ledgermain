/**
 * The casting-economy adjustment fold (`castingDeltasFor` + the optional
 * deltas parameters on the slot/known/prepared functions). Hand-computed
 * against the CRB sorcerer/wizard/arcanist tables; the engine-side
 * resolution of WHICH adjustments a build grants is covered in
 * `packages/engine/test/castingEconomy.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { DerivedCastingAdjustment } from "@pf1/schema";

import {
  casterModelFor,
  castingDeltasFor,
  preparedCapacityByLevel,
  spellSlotsByLevel,
  spellsKnownLimitsByLevel,
} from "../src/model/spellcasting.js";

function adj(over: Partial<DerivedCastingAdjustment>): DerivedCastingAdjustment {
  return {
    id: "castadj:test:x",
    kind: "slots",
    classTag: "sorcerer",
    spellLevels: "each",
    delta: -1,
    source: "Test",
    ...over,
  };
}

describe("castingDeltasFor", () => {
  it("sums matching adjustments and filters by class and kind", () => {
    const adjustments = [
      adj({ id: "a", spellLevels: "each", delta: -1 }),
      adj({ id: "b", spellLevels: [1, 2], delta: 1 }),
      adj({ id: "c", classTag: "bard" }),
      adj({ id: "d", kind: "known" }),
    ];
    const deltas = castingDeltasFor(adjustments, "sorcerer", "slots")!;
    expect(deltas.each).toBe(-1);
    expect(deltas.byLevel.get(1)).toBe(1);
    expect(deltas.byLevel.get(2)).toBe(1);
    expect(deltas.byLevel.get(3)).toBeUndefined();
    expect(castingDeltasFor(adjustments, "wizard", "slots")).toBeUndefined();
    expect(castingDeltasFor(undefined, "sorcerer", "slots")).toBeUndefined();
  });
});

describe("spellSlotsByLevel fold", () => {
  const sorcerer = casterModelFor("sorcerer")!;

  it("diminished spellcasting (-1 each leveled slot) applies to every slot row and clamps at 0", () => {
    // CRB sorcerer 4 (Cha +3): slot rows at levels 1/2 only (cantrips are
    // at-will, no slot row), base 6/3 + bonus 1/1.
    const plain = spellSlotsByLevel(sorcerer, 4, 3);
    expect(plain.map((s) => s.level)).toEqual([1, 2]);
    const deltas = castingDeltasFor([adj({})], "sorcerer", "slots");
    const diminished = spellSlotsByLevel(sorcerer, 4, 3, undefined, deltas);
    expect(diminished.map((s) => s.level)).toEqual(plain.map((s) => s.level));
    for (const [i, slot] of diminished.entries()) {
      const base = plain[i]!;
      if (slot.level === 0) {
        expect(slot.total).toBe(base.total);
        expect(slot.adjustment).toBeUndefined();
      } else {
        expect(slot.total).toBe(Math.max(0, base.total - 1));
        expect(slot.adjustment).toBe(-1);
      }
    }
  });

  it("per-level bonus slots apply only at their level and never unlock new levels", () => {
    // Sorcerer 4 reaches spell level 2; a +1 at level 3 must NOT add a row.
    const deltas = castingDeltasFor([adj({ spellLevels: [1, 3], delta: 1 })], "sorcerer", "slots");
    const slots = spellSlotsByLevel(sorcerer, 4, 3, undefined, deltas);
    expect(slots.map((s) => s.level)).toEqual([1, 2]);
    const level1 = slots.find((s) => s.level === 1)!;
    expect(level1.adjustment).toBe(1);
    // CRB: sorcerer 4 has 6 base + 1 bonus (Cha +3) = 7; +1 adjustment = 8.
    expect(level1.total).toBe(8);
    expect(slots.find((s) => s.level === 2)!.adjustment).toBeUndefined();
  });
});

describe("spellsKnownLimitsByLevel fold", () => {
  const sorcerer = casterModelFor("sorcerer")!;

  it("reduced spells known (-1 each) skips cantrips and clamps at 0", () => {
    // CRB sorcerer 4 knows 6/3/1 at levels 0/1/2; "each" leaves cantrips
    // alone, and 2nd level clamps at 0 rather than going negative.
    const deltas = castingDeltasFor([adj({ kind: "known" })], "sorcerer", "known");
    const limits = spellsKnownLimitsByLevel(sorcerer, 4, deltas);
    expect(limits).toEqual([
      { level: 0, limit: 6 },
      { level: 1, limit: 2 },
      { level: 2, limit: 0 },
    ]);
  });
});

describe("preparedCapacityByLevel fold", () => {
  const arcanist = casterModelFor("arcanist")!;

  it("prepared-capacity edits fold with the clamp; slots stay separate", () => {
    // ACG arcanist 4 readies 6/3/1 at levels 0/1/2.
    const deltas = castingDeltasFor(
      [adj({ kind: "prepared", spellLevels: "each" })],
      "sorcerer",
      "prepared",
    );
    const capacity = preparedCapacityByLevel(arcanist, 4, undefined, undefined, deltas);
    const plain = preparedCapacityByLevel(arcanist, 4);
    for (const [i, row] of capacity.entries()) {
      const base = plain[i]!;
      expect(row.limit).toBe(row.level === 0 ? base.limit : Math.max(0, base.limit - 1));
    }
  });
});
