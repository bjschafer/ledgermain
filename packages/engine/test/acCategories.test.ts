/**
 * Hand-computed fixture tests for category-scoped AC bonuses — a bonus that
 * applies only against one category of attacks ("+1 dodge bonus to AC
 * against attacks made by traps") rather than to AC as a whole. Mirrors
 * `maneuverCategories.test.ts`'s load-bearing behaviours: such a bonus must
 * stay OUT of the headline totals (normal, touch, AND flat-footed), it must
 * re-stack against the unconditional modifiers rather than simply adding to
 * the headline, and it must not leak into the CMD auto-derivation that
 * reads bare-`ac` modifiers.
 *
 * Every fixture here synthesizes the scoped Change on a buff, the same way
 * `maneuverCategories.test.ts` does — real content that wires `acCategories`
 * (Trap Sense, Defensive Training) has its own fixtures in
 * `trapSense.test.ts` and `raceAcNotes.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import { AC_CATEGORIES, AC_CATEGORY_ORDER, acCategoryLabel } from "../src/ac-categories.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Human Fighter 1, all abilities 10, no gear — AC 10, every ability mod 0. */
function makeDoc(): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "ac-category-test",
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
    target: string;
    acCategories?: string[];
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

describe("AC-scoped bonus (a category-scoped Change stays out of every headline)", () => {
  it("leaves normal/touch/flat-footed untouched but prints a traps line", () => {
    const base = compute(makeDoc(), ref);
    expect(base.ac.normal).toBe(10);
    expect(base.ac.conditionals).toBeUndefined();

    const sheet = compute(
      withChanges([{ formula: "2", type: "dodge", target: "ac", acCategories: ["traps"] }]),
      ref,
    );
    expect(sheet.ac.normal).toBe(10);
    expect(sheet.ac.touch).toBe(10);
    // A dodge bonus never reaches flat-footed AC anyway, but the scope must
    // hold it out of flat-footed regardless of type — checked with an
    // untyped scoped bonus in the CMD test below.
    expect(sheet.ac.flatFooted).toBe(10);
    expect(sheet.ac.conditionals).toEqual([
      { total: 12, categories: ["traps"], labels: ["traps"] },
    ]);
  });

  it("keeps a scoped bonus out of the CMD auto-derivation", () => {
    // An unconditional dodge bonus to AC auto-applies to CMD (CMD_AC_TYPES);
    // the same bonus scoped to a category must not — it is conditional, and
    // AC categories describe attacks, not maneuvers, so it earns no CMD
    // conditional line either.
    const base = compute(makeDoc(), ref);
    const unconditional = compute(
      withChanges([{ formula: "2", type: "dodge", target: "ac" }]),
      ref,
    );
    expect(unconditional.cmd).toBe(base.cmd + 2);

    const scoped = compute(
      withChanges([{ formula: "2", type: "dodge", target: "ac", acCategories: ["giants"] }]),
      ref,
    );
    expect(scoped.cmd).toBe(base.cmd);
    expect(scoped.cmdConditionals).toBeUndefined();
  });
});

describe("re-stacking against unconditional modifiers", () => {
  it("sums a scoped dodge bonus with an unconditional dodge bonus (dodge stacks)", () => {
    const sheet = compute(
      withChanges([
        { formula: "1", type: "dodge", target: "ac" },
        { formula: "2", type: "dodge", target: "ac", acCategories: ["traps"] },
      ]),
      ref,
    );
    expect(sheet.ac.normal).toBe(11);
    expect(sheet.ac.conditionals).toEqual([
      { total: 13, categories: ["traps"], labels: ["traps"] },
    ]);
  });

  it("collides a scoped typed bonus with an unconditional bonus of the same type", () => {
    // +2 insight (unconditional) vs. +3 insight scoped: highest-wins within
    // the type, so the traps line moves by +1, not +3.
    const sheet = compute(
      withChanges([
        { formula: "2", type: "insight", target: "ac" },
        { formula: "3", type: "insight", target: "ac", acCategories: ["traps"] },
      ]),
      ref,
    );
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.conditionals).toEqual([
      { total: 13, categories: ["traps"], labels: ["traps"] },
    ]);
  });

  it("produces no line when the category resolves to the same total as the headline", () => {
    const sheet = compute(
      withChanges([
        { formula: "2", type: "insight", target: "ac" },
        { formula: "2", type: "insight", target: "ac", acCategories: ["traps"] },
      ]),
      ref,
    );
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.conditionals).toBeUndefined();
  });

  it("merges categories that resolve to the same total into one line", () => {
    const sheet = compute(
      withChanges([
        { formula: "4", type: "dodge", target: "ac", acCategories: ["giants", "aberrations"] },
      ]),
      ref,
    );
    // Canonical AC_CATEGORY_ORDER puts giants before aberrations.
    expect(sheet.ac.conditionals).toEqual([
      { total: 14, categories: ["giants", "aberrations"], labels: ["giants", "aberrations"] },
    ]);
  });
});

describe("ac-category vocabulary", () => {
  it("has exactly the promoted keys, with the specified labels", () => {
    expect(AC_CATEGORY_ORDER).toEqual([
      "traps",
      "aoo",
      "charge",
      "giants",
      "aberrations",
      "animals",
      "evil",
      "good",
      "lawful",
      "chaotic",
    ]);
    expect(AC_CATEGORIES.traps?.label).toBe("traps");
    expect(AC_CATEGORIES.aoo?.label).toBe("AoOs");
    expect(AC_CATEGORIES.charge?.label).toBe("charging foes");
    expect(AC_CATEGORIES.giants?.label).toBe("giants");
    expect(AC_CATEGORIES.aberrations?.label).toBe("aberrations");
    expect(AC_CATEGORIES.animals?.label).toBe("animals");
    expect(AC_CATEGORIES.evil?.label).toBe("evil");
    expect(AC_CATEGORIES.good?.label).toBe("good");
    expect(AC_CATEGORIES.lawful?.label).toBe("lawful");
    expect(AC_CATEGORIES.chaotic?.label).toBe("chaotic");
  });

  it("falls back to the raw key for an unknown category", () => {
    expect(acCategoryLabel("nonsense")).toBe("nonsense");
  });
});
