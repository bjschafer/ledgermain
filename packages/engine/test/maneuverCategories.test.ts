/**
 * Hand-computed fixture tests for category-scoped cmb/cmd bonuses — a bonus
 * that applies only against one combat maneuver ("+2 on attempts to trip")
 * rather than to CMB/CMD as a whole. Mirrors `saveCategories.test.ts`'s two
 * load-bearing behaviours: such a bonus must stay OUT of the headline total,
 * and it must re-stack against the unconditional modifiers rather than
 * simply adding to that total.
 *
 * Every fixture here synthesizes the scoped Change on a buff, the same way
 * `saveCategories.test.ts`'s "category inheritance" block does for saves —
 * real content that wires `maneuverCategories` (character traits, racial
 * traits) has its own fixtures in `traits.test.ts`,
 * `vendoredCharacterTraitManeuvers.test.ts`, and
 * `vendoredRacialTraitManeuvers.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  MANEUVER_CATEGORIES,
  MANEUVER_CATEGORY_ORDER,
  maneuverCategoryLabel,
} from "../src/maneuver-categories.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Human Fighter 1, all abilities 10, no gear — BAB 1, every ability mod 0. */
function makeDoc(): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "maneuver-category-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** `makeDoc()` plus one buff granting the given changes. */
function withChanges(
  changes: {
    formula: string;
    type: string;
    target: "cmb" | "cmd";
    maneuverCategories?: string[];
  }[],
): CharacterDoc {
  const doc = makeDoc();
  return {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: [{ instanceId: "b1", name: "Test", changes }],
    },
  };
}

describe("maneuver-scoped cmb bonus (a category-scoped Change stays out of the headline)", () => {
  it("leaves headline CMB untouched but prints a trip line", () => {
    // BAB 1 + Str mod 0 + no size mod = CMB 1.
    const base = compute(makeDoc(), ref);
    expect(base.cmb).toBe(1);
    expect(base.cmbConditionals).toBeUndefined();

    const sheet = compute(
      withChanges([{ formula: "2", type: "racial", target: "cmb", maneuverCategories: ["trip"] }]),
      ref,
    );
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmbConditionals).toEqual([{ total: 3, categories: ["trip"], labels: ["trip"] }]);
  });
});

describe("maneuver-scoped cmd bonus (several keys apply independently, an OR)", () => {
  it("leaves headline CMD untouched but prints one merged line for both maneuvers", () => {
    // 10 + BAB 1 + Str mod 0 + Dex mod 0 + no size mod = CMD 11.
    const base = compute(makeDoc(), ref);
    expect(base.cmd).toBe(11);
    expect(base.cmdConditionals).toBeUndefined();

    const sheet = compute(
      withChanges([
        {
          formula: "4",
          type: "racial",
          target: "cmd",
          maneuverCategories: ["bullRush", "trip"],
        },
      ]),
      ref,
    );
    expect(sheet.cmd).toBe(11);
    // Canonical MANEUVER_CATEGORY_ORDER puts bullRush before trip.
    expect(sheet.cmdConditionals).toEqual([
      { total: 15, categories: ["bullRush", "trip"], labels: ["bull rush", "trip"] },
    ]);
    // Flat-footed CMD has no conditional treatment at all — bare number,
    // unaffected by the maneuver scope either way.
    expect(sheet.cmdFlatFooted).toBe(base.cmdFlatFooted);
  });
});

describe("same-type collision between an unconditional and a scoped bonus", () => {
  it("produces no line when the category resolves to the same total as the headline", () => {
    // +2 racial (unconditional) and +2 racial vs. trip (scoped) are the SAME
    // stacking type, so they compete rather than sum — highest wins, per
    // stacking.ts. Both are +2, so trip's re-stacked total (1 + 2 = 3)
    // exactly equals the headline (also 1 + 2 = 3), and the save-category
    // mechanism's rule applies here too: a category that resolves to the
    // headline total earns no line.
    const sheet = compute(
      withChanges([
        { formula: "2", type: "racial", target: "cmb" },
        { formula: "2", type: "racial", target: "cmb", maneuverCategories: ["trip"] },
      ]),
      ref,
    );
    expect(sheet.cmb).toBe(3);
    expect(sheet.cmbConditionals).toBeUndefined();
  });
});

describe("maneuver-category vocabulary", () => {
  it("has exactly the CRB six plus the APG four, with the specified labels", () => {
    expect(MANEUVER_CATEGORY_ORDER).toEqual([
      "bullRush",
      "dirtyTrick",
      "disarm",
      "drag",
      "grapple",
      "overrun",
      "reposition",
      "steal",
      "sunder",
      "trip",
    ]);
    expect(MANEUVER_CATEGORIES.bullRush?.label).toBe("bull rush");
    expect(MANEUVER_CATEGORIES.dirtyTrick?.label).toBe("dirty trick");
    expect(MANEUVER_CATEGORIES.disarm?.label).toBe("disarm");
    expect(MANEUVER_CATEGORIES.drag?.label).toBe("drag");
    expect(MANEUVER_CATEGORIES.grapple?.label).toBe("grapple");
    expect(MANEUVER_CATEGORIES.overrun?.label).toBe("overrun");
    expect(MANEUVER_CATEGORIES.reposition?.label).toBe("reposition");
    expect(MANEUVER_CATEGORIES.steal?.label).toBe("steal");
    expect(MANEUVER_CATEGORIES.sunder?.label).toBe("sunder");
    expect(MANEUVER_CATEGORIES.trip?.label).toBe("trip");
  });

  it("falls back to the raw key for an unknown category", () => {
    expect(maneuverCategoryLabel("nonsense")).toBe("nonsense");
  });
});
