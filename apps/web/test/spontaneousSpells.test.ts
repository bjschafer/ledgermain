import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import { casterModelFor } from "../src/model/spellcasting.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  restoreSpontaneousSlot,
  slotsUsedAtLevel,
  spontaneousSlotStatus,
} from "../src/model/spontaneousSpells.js";

const sorcModel = casterModelFor("sorcerer")!;

function fresh() {
  return createEmptyDoc("t");
}

describe("slotsUsedAtLevel()", () => {
  it("returns 0 for a fresh doc (no slotsUsed)", () => {
    expect(slotsUsedAtLevel(fresh(), 1)).toBe(0);
    expect(slotsUsedAtLevel(fresh(), 5)).toBe(0);
  });
});

describe("castSpontaneousSlot()", () => {
  it("spending a slot increments slotsUsed at that level", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 5, 4, 1); // L5 sorc, CHA+4, level-1 slot
    expect(slotsUsedAtLevel(doc, 1)).toBe(1);
    expect(slotsUsedAtLevel(doc, 2)).toBe(0); // others untouched
  });

  it("spending multiple times accumulates correctly", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    expect(slotsUsedAtLevel(doc, 1)).toBe(2);
  });

  it("cannot exceed total slots available (clamped)", () => {
    // L5 sorcerer, CHA +0: 6 level-1 slots per day
    let doc = fresh();
    for (let i = 0; i < 10; i++) {
      doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    }
    const status = spontaneousSlotStatus(doc, sorcModel, 5, 0);
    const l1 = status.find((s) => s.level === 1)!;
    expect(l1.used).toBe(l1.total); // not more than total
    expect(l1.remaining).toBe(0);
  });

  it("no-op for inaccessible spell level (L1 sorcerer has no 2nd-level slots)", () => {
    let doc = fresh();
    const before = slotsUsedAtLevel(doc, 2);
    doc = castSpontaneousSlot(doc, sorcModel, 1, 0, 2);
    expect(slotsUsedAtLevel(doc, 2)).toBe(before);
  });
});

describe("restoreSpontaneousSlot()", () => {
  it("decrements used count", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    doc = restoreSpontaneousSlot(doc, 1);
    expect(slotsUsedAtLevel(doc, 1)).toBe(1);
  });

  it("no-op when used is already 0", () => {
    const before = fresh();
    const after = restoreSpontaneousSlot(before, 1);
    expect(after).toBe(before); // same reference
  });

  it("cleans up the key when restored to 0", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    doc = restoreSpontaneousSlot(doc, 1);
    expect(doc.live.spells?.slotsUsed?.[1]).toBeUndefined();
  });
});

describe("resetSpontaneousSlots()", () => {
  it("clears all used slots on new day", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 10, 0, 1);
    doc = castSpontaneousSlot(doc, sorcModel, 10, 0, 2);
    doc = resetSpontaneousSlots(doc);
    expect(slotsUsedAtLevel(doc, 1)).toBe(0);
    expect(slotsUsedAtLevel(doc, 2)).toBe(0);
  });

  it("returns same reference when nothing was used", () => {
    const doc = fresh();
    expect(resetSpontaneousSlots(doc)).toBe(doc);
  });
});

describe("spontaneousSlotStatus()", () => {
  it("L1 sorcerer CHA+0 has 3 level-1 slots, none used", () => {
    const doc = fresh();
    const status = spontaneousSlotStatus(doc, sorcModel, 1, 0);
    const l1 = status.find((s) => s.level === 1);
    expect(l1).toBeDefined();
    expect(l1!.total).toBe(3);
    expect(l1!.used).toBe(0);
    expect(l1!.remaining).toBe(3);
  });

  it("bonus slots from Charisma are reflected in total", () => {
    // L1 sorc, CHA +2 → 1 bonus level-1 slot → 3 + 1 = 4
    const doc = fresh();
    const status = spontaneousSlotStatus(doc, sorcModel, 1, 2);
    const l1 = status.find((s) => s.level === 1)!;
    expect(l1.total).toBe(4); // 3 base + 1 bonus
  });

  it("no level-0 (cantrips) appear in spontaneous slot status", () => {
    const doc = fresh();
    const status = spontaneousSlotStatus(doc, sorcModel, 5, 0);
    expect(status.find((s) => s.level === 0)).toBeUndefined();
  });

  it("tracks remaining correctly after spending", () => {
    let doc = fresh();
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1);
    const status = spontaneousSlotStatus(doc, sorcModel, 5, 0);
    const l1 = status.find((s) => s.level === 1)!;
    expect(l1.used).toBe(2);
    expect(l1.remaining).toBe(l1.total - 2);
  });
});
