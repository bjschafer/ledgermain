import { describe, expect, it } from "bun:test";

import {
  accessibleSpellLevels,
  casterModelFor,
  spellSlotsByLevel,
  unlockedSpellLevels,
} from "../src/model/spellcasting.js";

describe("early-bonus-spells homebrew — spellSlotsByLevel()", () => {
  it("wizard L1, Int +3, RAW (no setting) → levels 0 and 1 only", () => {
    const m = casterModelFor("wizard")!;
    const slots = spellSlotsByLevel(m, 1, 3);
    expect(slots.map((s) => s.level)).toEqual([0, 1]);
  });

  it("wizard L1, Int +3, toSecond → adds level 2 (base 0, bonus 1, total 1), not level 3", () => {
    const m = casterModelFor("wizard")!;
    const slots = new Map(spellSlotsByLevel(m, 1, 3, "toSecond").map((s) => [s.level, s]));
    expect(slots.get(2)).toEqual({ level: 2, base: 0, bonus: 1, total: 1 });
    expect(slots.has(3)).toBe(false);
  });

  it("wizard L1, Int +3, all → adds level 3 too (bonus 1), on top of the toSecond level-2 row", () => {
    const m = casterModelFor("wizard")!;
    const slots = new Map(spellSlotsByLevel(m, 1, 3, "all").map((s) => [s.level, s]));
    expect(slots.get(2)).toEqual({ level: 2, base: 0, bonus: 1, total: 1 });
    expect(slots.get(3)).toEqual({ level: 3, base: 0, bonus: 1, total: 1 });
    expect(slots.has(4)).toBe(false);
  });

  it("wizard L1, Int +1, toSecond → adds nothing (bonusSpellsForLevel(1,2) is 0)", () => {
    const m = casterModelFor("wizard")!;
    const slots = spellSlotsByLevel(m, 1, 1, "toSecond");
    expect(slots.map((s) => s.level)).toEqual([0, 1]);
  });

  it("sorcerer L1, Cha +5, all → early levels 2-5 each get 1 bonus slot, nothing at 6+", () => {
    const m = casterModelFor("sorcerer")!;
    const slots = new Map(spellSlotsByLevel(m, 1, 5, "all").map((s) => [s.level, s]));
    for (const level of [2, 3, 4, 5]) {
      expect(slots.get(level)).toEqual({ level, base: 0, bonus: 1, total: 1 });
    }
    expect(slots.has(6)).toBe(false);
  });

  it("paladin L1, Cha +4, toSecond or all → no slots at all (guard 1: no RAW-accessible level yet)", () => {
    const m = casterModelFor("paladin")!;
    expect(spellSlotsByLevel(m, 1, 4, "toSecond")).toEqual([]);
    expect(spellSlotsByLevel(m, 1, 4, "all")).toEqual([]);
  });

  it("paladin L4, Cha +4, toSecond → the RAW level-1 row plus an early level-2 bonus row", () => {
    const m = casterModelFor("paladin")!;
    // Verify the real table first: at L4 a paladin has 0 base 1st-level slots
    // and no 2nd-level access at all yet (2nd unlocks at L7).
    expect(accessibleSpellLevels(m, 4)).toEqual([1]);
    const raw = new Map(spellSlotsByLevel(m, 4, 4).map((s) => [s.level, s]));
    expect(raw.get(1)).toEqual({ level: 1, base: 0, bonus: 1, total: 1 });
    expect(raw.has(2)).toBe(false);

    const early = new Map(spellSlotsByLevel(m, 4, 4, "toSecond").map((s) => [s.level, s]));
    expect(early.get(1)).toEqual({ level: 1, base: 0, bonus: 1, total: 1 });
    expect(early.get(2)).toEqual({ level: 2, base: 0, bonus: 1, total: 1 });
  });

  it("bard, all, hypothetically Cha +7 → capped at bard's max-ever level 6, nothing at 7+", () => {
    const m = casterModelFor("bard")!;
    const slots = new Map(spellSlotsByLevel(m, 1, 7, "all").map((s) => [s.level, s]));
    expect(slots.has(6)).toBe(true);
    expect(slots.has(7)).toBe(false);
    expect(slots.has(8)).toBe(false);
    expect(slots.has(9)).toBe(false);
  });
});

describe("early-bonus-spells homebrew — unlockedSpellLevels()", () => {
  it("mirrors accessibleSpellLevels when no setting is passed", () => {
    const m = casterModelFor("wizard")!;
    expect(unlockedSpellLevels(m, 1, 3)).toEqual(accessibleSpellLevels(m, 1));
  });

  it("wizard L1, Int +3, toSecond → [0, 1, 2]", () => {
    const m = casterModelFor("wizard")!;
    expect(unlockedSpellLevels(m, 1, 3, "toSecond")).toEqual([0, 1, 2]);
  });

  it("wizard L1, Int +3, all → [0, 1, 2, 3]", () => {
    const m = casterModelFor("wizard")!;
    expect(unlockedSpellLevels(m, 1, 3, "all")).toEqual([0, 1, 2, 3]);
  });

  it("paladin L1, Cha +4 → empty under either mode (guard 1)", () => {
    const m = casterModelFor("paladin")!;
    expect(unlockedSpellLevels(m, 1, 4, "toSecond")).toEqual([]);
    expect(unlockedSpellLevels(m, 1, 4, "all")).toEqual([]);
  });

  it("paladin L4, Cha +4, toSecond → [1, 2]", () => {
    const m = casterModelFor("paladin")!;
    expect(unlockedSpellLevels(m, 4, 4, "toSecond")).toEqual([1, 2]);
  });
});

describe("early-bonus-spells homebrew — accessibleSpellLevels() stays RAW", () => {
  it("is unaffected by an ability modifier that would otherwise unlock a level early", () => {
    const m = casterModelFor("wizard")!;
    // Int +3 would unlock level 2/3 early under the homebrew, but this
    // RAW-only helper (used by classPrereqs.ts) must never reflect that.
    expect(accessibleSpellLevels(m, 1)).toEqual([0, 1]);
  });
});
