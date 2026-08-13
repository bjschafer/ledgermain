/**
 * Unit tests for `model/spellDCs.ts` — the display folding of
 * `DerivedSheet.spellDCs`/`clChecks` into per-spell DC adjustments, the SR
 * check line, and the print hints. The engine-side stacking behavior is
 * covered by `packages/engine/test/spell-dcs.test.ts`; these tests exercise
 * the fold with hand-built derived shapes.
 */
import { describe, expect, it } from "bun:test";

import type { DerivedClChecks, DerivedSpellDCs } from "@pf1/schema";

import {
  spellDCAdjustment,
  spellDCSchoolDeltas,
  srCheckBonus,
  srCheckDetail,
} from "../src/model/spellDCs.js";

const comp = (source: string, value: number, applied = true) => ({
  source,
  type: "untyped",
  value,
  applied,
});

const focusEvocation: DerivedSpellDCs = {
  all: 0,
  allComponents: [],
  schools: [
    {
      key: "evocation",
      tag: "evo",
      label: "Evocation",
      bonus: 2,
      components: [comp("Spell Focus", 1), comp("Greater Spell Focus", 1)],
    },
  ],
};

describe("spellDCAdjustment", () => {
  it("returns zero/null when the sheet has no spellDCs at all", () => {
    expect(spellDCAdjustment(undefined, "evo")).toEqual({ bonus: 0, detail: null });
  });

  it("matches a spell to its school line by vendored tag", () => {
    expect(spellDCAdjustment(focusEvocation, "evo")).toEqual({
      bonus: 2,
      detail: "Spell Focus +1, Greater Spell Focus +1",
    });
  });

  it("falls back to the all-schools bonus for other schools, zero here", () => {
    expect(spellDCAdjustment(focusEvocation, "nec")).toEqual({ bonus: 0, detail: null });
    expect(spellDCAdjustment(focusEvocation, undefined)).toEqual({ bonus: 0, detail: null });
  });

  it("uses the all-schools bonus when non-zero and the school has no line", () => {
    const withAll: DerivedSpellDCs = {
      all: 1,
      allComponents: [comp("Homebrew Charm", 1)],
      schools: focusEvocation.schools,
    };
    expect(spellDCAdjustment(withAll, "nec")).toEqual({ bonus: 1, detail: "Homebrew Charm +1" });
    // The school line already folds the all-schools part in — never summed.
    expect(spellDCAdjustment(withAll, "evo").bonus).toBe(2);
  });

  it("drops overridden (non-applied) components from the detail string", () => {
    const overridden: DerivedSpellDCs = {
      all: 0,
      allComponents: [],
      schools: [
        {
          key: "evocation",
          tag: "evo",
          label: "Evocation",
          bonus: 1,
          components: [comp("Lesser Charm", 1, false), comp("Spell Focus", 1)],
        },
      ],
    };
    expect(spellDCAdjustment(overridden, "evo").detail).toBe("Spell Focus +1");
  });
});

describe("srCheckBonus / srCheckDetail", () => {
  const clChecks: DerivedClChecks = {
    sr: {
      bonus: 4,
      components: [comp("Spell Penetration", 2), comp("Greater Spell Penetration", 2)],
    },
  };

  it("reads the SR bonus, zero when absent", () => {
    expect(srCheckBonus(clChecks)).toBe(4);
    expect(srCheckBonus(undefined)).toBe(0);
    expect(srCheckBonus({})).toBe(0);
  });

  it("formats provenance, null when absent", () => {
    expect(srCheckDetail(clChecks)).toBe("Spell Penetration +2, Greater Spell Penetration +2");
    expect(srCheckDetail(undefined)).toBeNull();
  });
});

describe("spellDCSchoolDeltas", () => {
  it("is empty with no bonuses", () => {
    expect(spellDCSchoolDeltas(undefined)).toEqual([]);
  });

  it("lists deltas over the all-schools base, skipping schools that match it", () => {
    expect(spellDCSchoolDeltas(focusEvocation)).toEqual(["Evocation +2"]);
    const withAll: DerivedSpellDCs = {
      all: 1,
      allComponents: [comp("Homebrew Charm", 1)],
      schools: [
        { key: "evocation", tag: "evo", label: "Evocation", bonus: 2, components: [] },
        { key: "necromancy", tag: "nec", label: "Necromancy", bonus: 1, components: [] },
      ],
    };
    // Necromancy's +1 equals the all-schools base already printed in the DC
    // column, so only evocation's extra shows.
    expect(spellDCSchoolDeltas(withAll)).toEqual(["Evocation +1"]);
  });
});
