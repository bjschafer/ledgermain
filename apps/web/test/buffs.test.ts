import { describe, expect, it } from "bun:test";
import type { Buff } from "@pf1/schema";

import {
  formatDuration,
  roundsToDisplay,
  suggestRounds,
  toRounds,
} from "../src/model/buffs.js";

function buffWithDuration(units: string, value: string): Buff {
  return {
    id: "test-buff",
    name: "Test Buff",
    uuid: "Compendium.pf1.test.Item.test-buff",
    changes: [],
    contextNotes: [],
    duration: { units, value },
  };
}

describe("roundsToDisplay", () => {
  it("returns undefined for indefinite (undefined rounds)", () => {
    expect(roundsToDisplay(undefined)).toBeUndefined();
  });

  it("40 rds → 4 min — the 4-min/level CL4 case that motivated this helper", () => {
    expect(roundsToDisplay(40)).toEqual({ value: 4, unit: "min" });
  });

  it("100 rds → 10 min", () => {
    expect(roundsToDisplay(100)).toEqual({ value: 10, unit: "min" });
  });

  it("1200 rds → 2 hr", () => {
    expect(roundsToDisplay(1200)).toEqual({ value: 2, unit: "hr" });
  });

  it("600 rds → 1 hr (hr checked before min; 600 % 600 === 0 wins)", () => {
    expect(roundsToDisplay(600)).toEqual({ value: 1, unit: "hr" });
  });

  it("7 rds → 7 rds (not a multiple of 10)", () => {
    expect(roundsToDisplay(7)).toEqual({ value: 7, unit: "rds" });
  });

  it("90 rds → 9 min (clean multiple of 10)", () => {
    expect(roundsToDisplay(90)).toEqual({ value: 9, unit: "min" });
  });

  it("1 rds → 1 rds", () => {
    expect(roundsToDisplay(1)).toEqual({ value: 1, unit: "rds" });
  });

  it("10 rds → 1 min", () => {
    expect(roundsToDisplay(10)).toEqual({ value: 1, unit: "min" });
  });
});

describe("toRounds", () => {
  it("rds passthrough", () => {
    expect(toRounds(7, "rds")).toBe(7);
  });

  it("min → ×10", () => {
    expect(toRounds(4, "min")).toBe(40);
  });

  it("hr → ×600", () => {
    expect(toRounds(2, "hr")).toBe(1200);
  });

  it("fractional input rounds to nearest whole round", () => {
    expect(toRounds(1.5, "min")).toBe(15);
  });
});

describe("round-trip: roundsToDisplay → toRounds", () => {
  it("40 rds round-trips via min", () => {
    const d = roundsToDisplay(40)!;
    expect(toRounds(d.value, d.unit)).toBe(40);
  });

  it("1200 rds round-trips via hr", () => {
    const d = roundsToDisplay(1200)!;
    expect(toRounds(d.value, d.unit)).toBe(1200);
  });

  it("7 rds round-trips via rds", () => {
    const d = roundsToDisplay(7)!;
    expect(toRounds(d.value, d.unit)).toBe(7);
  });

  it("600 rds round-trips via hr", () => {
    const d = roundsToDisplay(600)!;
    expect(toRounds(d.value, d.unit)).toBe(600);
  });
});

describe("formatDuration", () => {
  it("undefined → ∞", () => {
    expect(formatDuration(undefined)).toBe("∞");
  });

  it("40 → '4 min'", () => {
    expect(formatDuration(40)).toBe("4 min");
  });

  it("7 → '7 rds'", () => {
    expect(formatDuration(7)).toBe("7 rds");
  });

  it("1200 → '2 hr'", () => {
    expect(formatDuration(1200)).toBe("2 hr");
  });

  it("600 → '1 hr'", () => {
    expect(formatDuration(600)).toBe("1 hr");
  });

  it("90 → '9 min'", () => {
    expect(formatDuration(90)).toBe("9 min");
  });
});

describe("suggestRounds", () => {
  it("treats @item.level as per-level (existing behavior)", () => {
    // duration "@item.level" minutes at CL4 → 4 * 10 = 40 rounds.
    expect(suggestRounds(buffWithDuration("minute", "@item.level"), 4)).toBe(40);
  });

  it("treats @cl as per-level (vendored durations use @cl, not @item.level)", () => {
    // duration "@cl" minutes at CL4 → 4 * 10 = 40 rounds.
    expect(suggestRounds(buffWithDuration("minute", "@cl"), 4)).toBe(40);
  });

  it("treats a formula containing @cl (e.g. '10 * @cl') as per-level too", () => {
    expect(suggestRounds(buffWithDuration("round", "10 * @cl"), 3)).toBe(3);
  });

  it("does not mistake @classes.*/@class.level paths for @cl", () => {
    // Not a per-level match: falls back to the literal-number parse, which
    // fails for a non-numeric formula and defaults to 1 round of base.
    expect(suggestRounds(buffWithDuration("round", "@classes.barbarian.level"), 5)).toBe(1);
  });

  it("returns undefined for a buff with no duration units", () => {
    expect(suggestRounds({ ...buffWithDuration("round", "1"), duration: undefined }, 5)).toBeUndefined();
  });
});
