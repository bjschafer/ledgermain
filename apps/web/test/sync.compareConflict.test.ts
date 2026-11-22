import { describe, expect, test } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import { describeBrowser } from "../src/state/deviceName.js";
import {
  compareConflict,
  describeGap,
  type ConflictComparison,
} from "../src/sync/compareConflict.js";

const ref = loadRefData();

const POWER_ATTACK = "FUW5mIXHNBBIQ1Sq";
const TOUGHNESS = "8snLqsJN4LLL00Nq";
const DODGE = "JreaiTHdyWFNj3Tb";

function fighter(level: number, edit: (d: CharacterDoc) => CharacterDoc = (d) => d): CharacterDoc {
  const base = createEmptyDoc("lyle");
  return edit({
    ...base,
    identity: { ...base.identity, name: "Lyle", classes: [{ tag: "fighter", level }] },
  });
}

function section(result: ConflictComparison, title: string) {
  return result.sections.find((s) => s.title === title)?.rows ?? [];
}

describe("compareConflict", () => {
  test("copies that differ only in sync bookkeeping have nothing to show", () => {
    const local = fighter(5);
    const remote = {
      ...local,
      version: 12,
      updatedAt: "2026-11-06T22:00:00.000Z",
      savedOn: "iPad",
    };
    expect(compareConflict(local, remote, ref)).toEqual({ headline: [], sections: [] });
  });

  test("names feats and lists only what each copy has that the other lacks", () => {
    const local = fighter(5, (d) => ({
      ...d,
      build: { ...d.build, feats: [POWER_ATTACK, TOUGHNESS] },
    }));
    const remote = fighter(5, (d) => ({ ...d, build: { ...d.build, feats: [TOUGHNESS, DODGE] } }));
    expect(section(compareConflict(local, remote, ref), "Build")).toContainEqual({
      label: "Feats",
      local: "Power Attack",
      remote: "Dodge",
    });
  });

  test("leads with recognizable stats: level, hit points, buffs", () => {
    const local = fighter(6, (d) => ({
      ...d,
      live: {
        ...d.live,
        hp: { current: 12, temp: 0, nonlethal: 0 },
        activeBuffs: [{ instanceId: "b1", name: "Haste", changes: [] }],
      },
    }));
    const remote = fighter(5, (d) => ({
      ...d,
      live: { ...d.live, hp: { current: 30, temp: 0, nonlethal: 0 } },
    }));
    const { headline } = compareConflict(local, remote, ref);
    expect(headline.find((r) => r.label === "Classes")).toEqual({
      label: "Classes",
      local: "Fighter 6",
      remote: "Fighter 5",
    });
    expect(headline.find((r) => r.label === "Hit points")?.local).toStartWith("12 / ");
    expect(headline.find((r) => r.label === "Buffs")).toEqual({
      label: "Buffs",
      local: "Haste",
      remote: "none",
    });
  });

  test("pairs gear by name and reports what changed inside an entry", () => {
    const rope = { name: "Silk rope", equipped: false, quantity: 1 };
    const local = fighter(5, (d) => ({
      ...d,
      build: {
        ...d.build,
        gear: [
          { ...rope, quantity: 3 },
          { name: "Lantern", equipped: false },
        ],
      },
    }));
    const remote = fighter(5, (d) => ({ ...d, build: { ...d.build, gear: [rope] } }));
    const rows = section(compareConflict(local, remote, ref), "Build");
    expect(rows).toContainEqual({ label: "Gear › Silk rope › Quantity", local: "3", remote: "1" });
    expect(rows).toContainEqual({ label: "Gear", local: "Lantern", remote: "nothing extra" });
  });

  test("shows where a long note starts to differ, not its shared opening", () => {
    const opening = "Owes the Pathfinder Society a favor after the Absalom docks job, ";
    const note = (n: string) => (d: CharacterDoc) => ({
      ...d,
      identity: { ...d.identity, notes: opening + n },
    });
    const rows = section(
      compareConflict(fighter(5, note("paid in full.")), fighter(5, note("still unpaid.")), ref),
      "Identity",
    );
    expect(rows[0]?.local).toContain("paid in full.");
    expect(rows[0]?.remote).toContain("still unpaid.");
  });
});

describe("describeGap", () => {
  const here = "2026-11-21T20:36:00.000Z";
  test("says how much older the other copy is", () => {
    expect(describeGap(here, "2026-11-06T22:00:00.000Z")).toBe("15 days earlier");
  });
  test("and how much newer", () => {
    expect(describeGap(here, "2026-11-21T23:36:00.000Z")).toBe("3 hours later");
  });
  test("treats saves under a minute apart as simultaneous", () => {
    expect(describeGap(here, "2026-11-21T20:36:30.000Z")).toBe("at about the same time");
  });
});

describe("describeBrowser", () => {
  test.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      0,
      "Chrome on macOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      0,
      "Edge on Windows",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      5,
      "Safari on iPhone",
    ],
    // iPadOS asks for desktop sites by claiming to be a Mac.
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
      5,
      "Safari on iPad",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
      0,
      "Firefox on Linux",
    ],
  ])("%s", (ua, touch, expected) => {
    expect(describeBrowser(ua, touch)).toBe(expected);
  });
});
