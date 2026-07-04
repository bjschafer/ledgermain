import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  addXp,
  DEFAULT_XP_TRACK,
  MAX_TRACKED_LEVEL,
  nextLevelAt,
  setXp,
  XP_TRACKS,
  xp,
  xpEnabled,
  xpProgress,
  xpTrack,
} from "../src/model/xp.js";

function doc() {
  return createEmptyDoc("t");
}

function docAtLevel(level: number) {
  const d = doc();
  return {
    ...d,
    identity: { ...d.identity, classes: [{ tag: "fighter", level }] },
  };
}

// ---------------------------------------------------------------------------
// Threshold table spot-checks against the published PF1 CRB values
// ---------------------------------------------------------------------------
describe("XP_TRACKS", () => {
  it("medium track: level 2 requires 2,000 XP", () => {
    expect(XP_TRACKS.medium[1]).toBe(2_000);
  });

  it("slow track: level 5 requires 23,000 XP", () => {
    expect(XP_TRACKS.slow[4]).toBe(23_000);
  });

  it("fast track: level 20 requires 2,400,000 XP", () => {
    expect(XP_TRACKS.fast[19]).toBe(2_400_000);
  });

  it("every track starts level 1 at 0 XP", () => {
    expect(XP_TRACKS.slow[0]).toBe(0);
    expect(XP_TRACKS.medium[0]).toBe(0);
    expect(XP_TRACKS.fast[0]).toBe(0);
  });

  it("every track is strictly increasing", () => {
    for (const track of ["slow", "medium", "fast"] as const) {
      const table = XP_TRACKS[track];
      for (let i = 1; i < table.length; i++) {
        const prev = table[i - 1] ?? 0;
        const curr = table[i] ?? 0;
        expect(curr).toBeGreaterThan(prev);
      }
    }
  });

  it("every track has exactly MAX_TRACKED_LEVEL entries", () => {
    expect(XP_TRACKS.slow.length).toBe(MAX_TRACKED_LEVEL);
    expect(XP_TRACKS.medium.length).toBe(MAX_TRACKED_LEVEL);
    expect(XP_TRACKS.fast.length).toBe(MAX_TRACKED_LEVEL);
  });
});

describe("nextLevelAt()", () => {
  it("returns the level-2 threshold from level 1", () => {
    expect(nextLevelAt("medium", 1)).toBe(2_000);
  });

  it("returns the level-20 threshold from level 19", () => {
    expect(nextLevelAt("fast", 19)).toBe(2_400_000);
  });

  it("returns null at the max tracked level (no further threshold)", () => {
    expect(nextLevelAt("medium", 20)).toBeNull();
  });

  it("returns null past the max tracked level", () => {
    expect(nextLevelAt("medium", 25)).toBeNull();
  });

  it("returns null for level 0 or below", () => {
    expect(nextLevelAt("medium", 0)).toBeNull();
    expect(nextLevelAt("medium", -1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// xp() / addXp() / setXp() — live pool transitions
// ---------------------------------------------------------------------------
describe("xp()", () => {
  it("returns 0 when the field is absent", () => {
    expect(xp(doc())).toBe(0);
  });

  it("reads the stored value when present", () => {
    const d = doc();
    const withXp = { ...d, live: { ...d.live, xp: 4_200 } };
    expect(xp(withXp)).toBe(4_200);
  });
});

describe("addXp()", () => {
  it("adds to the current total", () => {
    let d = addXp(doc(), 1_000);
    d = addXp(d, 500);
    expect(xp(d)).toBe(1_500);
  });

  it("clamps the running total at 0 (negative correction below zero)", () => {
    const d = addXp(doc(), -100);
    expect(xp(d)).toBe(0);
  });

  it("does not mutate the original doc", () => {
    const original = doc();
    addXp(original, 500);
    expect(xp(original)).toBe(0);
  });
});

describe("setXp()", () => {
  it("sets an explicit value", () => {
    expect(xp(setXp(doc(), 12_345))).toBe(12_345);
  });

  it("clamps negative values to 0", () => {
    expect(xp(setXp(doc(), -5))).toBe(0);
  });

  it("treats NaN as 0", () => {
    expect(xp(setXp(doc(), NaN))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// xpEnabled() / xpTrack() — optional-rule opt-in, defaults OFF unlike hero points
// ---------------------------------------------------------------------------
describe("xpEnabled()", () => {
  it("defaults to false when the setting is absent (milestone by default)", () => {
    expect(xpEnabled(doc())).toBe(false);
  });

  it("returns true when explicitly enabled", () => {
    const d = { ...doc(), build: { ...doc().build, settings: { xpEnabled: true } } };
    expect(xpEnabled(d)).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    const d = { ...doc(), build: { ...doc().build, settings: { xpEnabled: false } } };
    expect(xpEnabled(d)).toBe(false);
  });
});

describe("xpTrack()", () => {
  it("defaults to medium", () => {
    expect(xpTrack(doc())).toBe(DEFAULT_XP_TRACK);
    expect(xpTrack(doc())).toBe("medium");
  });

  it("reads an explicit track", () => {
    const d = { ...doc(), build: { ...doc().build, settings: { xpTrack: "fast" as const } } };
    expect(xpTrack(d)).toBe("fast");
  });
});

// ---------------------------------------------------------------------------
// xpProgress() — combines current xp, track, and build level
// ---------------------------------------------------------------------------
describe("xpProgress()", () => {
  it("reports level from identity.classes, not from xp", () => {
    const d = docAtLevel(4);
    expect(xpProgress(d).level).toBe(4);
  });

  it("computes the next threshold for the character's level and track", () => {
    let d = docAtLevel(1);
    d = { ...d, build: { ...d.build, settings: { xpTrack: "medium" } } };
    expect(xpProgress(d).nextThreshold).toBe(2_000);
  });

  it("readyToLevel is false below the threshold", () => {
    let d = docAtLevel(1);
    d = setXp(d, 1_999);
    expect(xpProgress(d).readyToLevel).toBe(false);
  });

  it("readyToLevel is true at or above the threshold", () => {
    let d = docAtLevel(1);
    d = setXp(d, 2_000);
    expect(xpProgress(d).readyToLevel).toBe(true);
  });

  it("nextThreshold is null and readyToLevel is false past the max tracked level", () => {
    const d = docAtLevel(20);
    const progress = xpProgress(d);
    expect(progress.nextThreshold).toBeNull();
    expect(progress.readyToLevel).toBe(false);
  });
});
