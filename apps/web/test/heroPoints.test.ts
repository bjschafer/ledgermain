import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  HERO_POINT_CAP,
  gainHeroPoint,
  heroPoints,
  heroPointsEnabled,
  setHeroPoints,
  spendHeroPoint,
} from "../src/model/heroPoints.js";

function doc() {
  return createEmptyDoc("t");
}

describe("heroPoints()", () => {
  it("returns 0 when the field is absent", () => {
    expect(heroPoints(doc())).toBe(0);
  });

  it("reads the stored value when present", () => {
    const d = doc();
    const with2 = { ...d, live: { ...d.live, heroPoints: 2 } };
    expect(heroPoints(with2)).toBe(2);
  });
});

describe("gainHeroPoint()", () => {
  it("increments by 1", () => {
    const d = gainHeroPoint(doc());
    expect(heroPoints(d)).toBe(1);
  });

  it("caps at HERO_POINT_CAP", () => {
    let d = doc();
    for (let i = 0; i < HERO_POINT_CAP + 5; i++) {
      d = gainHeroPoint(d);
    }
    expect(heroPoints(d)).toBe(HERO_POINT_CAP);
  });

  it("respects a custom cap", () => {
    let d = gainHeroPoint(doc(), 1);
    d = gainHeroPoint(d, 1); // already at cap
    expect(heroPoints(d)).toBe(1);
  });

  it("does not mutate the original doc", () => {
    const original = doc();
    gainHeroPoint(original);
    expect(heroPoints(original)).toBe(0);
  });
});

describe("spendHeroPoint()", () => {
  it("decrements by 1", () => {
    let d = gainHeroPoint(doc());
    d = gainHeroPoint(d);
    d = spendHeroPoint(d);
    expect(heroPoints(d)).toBe(1);
  });

  it("is a no-op at 0 (floored)", () => {
    const d = spendHeroPoint(doc());
    expect(heroPoints(d)).toBe(0);
  });

  it("does not mutate the original doc", () => {
    const original = gainHeroPoint(doc());
    spendHeroPoint(original);
    expect(heroPoints(original)).toBe(1);
  });
});

describe("setHeroPoints()", () => {
  it("sets an explicit value within range", () => {
    expect(heroPoints(setHeroPoints(doc(), 2))).toBe(2);
  });

  it("clamps above cap to cap", () => {
    expect(heroPoints(setHeroPoints(doc(), 99))).toBe(HERO_POINT_CAP);
  });

  it("clamps negative values to 0", () => {
    expect(heroPoints(setHeroPoints(doc(), -5))).toBe(0);
  });

  it("treats NaN as 0", () => {
    expect(heroPoints(setHeroPoints(doc(), NaN))).toBe(0);
  });

  it("respects a custom cap", () => {
    expect(heroPoints(setHeroPoints(doc(), 10, 5))).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Hero-point cap from doc.build.settings.heroPointsCap
// ---------------------------------------------------------------------------
describe("heroPointsCap via doc settings", () => {
  it("gainHeroPoint uses a custom cap when passed explicitly", () => {
    // Simulate HeroPointsPanel reading doc.build.settings.heroPointsCap
    const cap = 5;
    let d = doc();
    for (let i = 0; i < 10; i++) {
      d = gainHeroPoint(d, cap);
    }
    expect(heroPoints(d)).toBe(cap);
  });

  it("setHeroPoints with custom cap clamps correctly", () => {
    expect(heroPoints(setHeroPoints(doc(), 10, 7))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// heroPointsEnabled() — optional-rule opt-out
// ---------------------------------------------------------------------------
describe("heroPointsEnabled()", () => {
  it("defaults to true when the setting is absent", () => {
    expect(heroPointsEnabled(doc())).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    const d = { ...doc(), build: { ...doc().build, settings: { heroPointsEnabled: false } } };
    expect(heroPointsEnabled(d)).toBe(false);
  });

  it("returns true when explicitly enabled", () => {
    const d = { ...doc(), build: { ...doc().build, settings: { heroPointsEnabled: true } } };
    expect(heroPointsEnabled(d)).toBe(true);
  });
});
