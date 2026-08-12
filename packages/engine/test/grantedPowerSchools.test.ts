/**
 * Fixture tests for `SCHOOL_POWER_PATCHES` (`granted-power-effects/schools.ts`)
 * and the `collect.ts` granted-power loop that applies it — see
 * `grantedPowerEffects.test.ts`'s doc comment for the hook this proves.
 *
 * Fire Supremacy (Fire elemental arcane school, Pathfinder Player Companion:
 * Blood of the Elements): "You gain resistance 5 to fire. At 10th level,
 * this resistance increases to 10." Vendored grant level is 0 (immediate).
 *
 * Void Awareness (Void arcane school, Pathfinder Player Companion: Occult
 * Mysteries p. 29): "You gain a +2 insight bonus on saving throws against
 * spells and spell-like abilities. This bonus increases by +1 for every
 * five wizard levels you possess." Vendored grant level is 0 (immediate).
 *
 * Both powers are granted from a wizard's first level in the school (grant
 * level 0), so there is no cleric-domain-style "chosen but not yet granted"
 * gap to test; instead the level-gating slot below covers a wizard of a
 * *different* school and a non-wizard, both of whom must get nothing.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human wizard, all abilities 10 (every mod 0), chosen school as given. */
function makeWizard(level: number, wizardSchool?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "granted-power-schools-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "wizard", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(wizardSchool ? { wizardSchool } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Fire Supremacy (Fire elemental arcane school, tiered fire resistance)", () => {
  it("level 5: resistance 5 (below the 10th-level tier bump)", () => {
    const sheet = compute(makeWizard(5, "fire-elemental"), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
  });

  it("level 12: resistance 10 (10th-level tier bump applied)", () => {
    const sheet = compute(makeWizard(12, "fire-elemental"), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(10);
  });

  it("a wizard of a different school gets no fire resistance", () => {
    const sheet = compute(makeWizard(12, "water-elemental"), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("a non-wizard with a stale wizardSchool field gets nothing (no wizard levels to grant it)", () => {
    const doc = makeWizard(5, "fire-elemental");
    const fighter: CharacterDoc = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 5 }] },
    };
    const sheet = compute(fighter, ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });
});

describe("Void Awareness (Void arcane school, insight save bonus vs. spells/SLAs)", () => {
  it("level 4: +2 insight (below the first every-five-levels bump)", () => {
    // Wizard saves: Fort/Ref low (floor(level/3)), Will high (2+floor(level/2)).
    // Level 4, all mods 0: Fort floor = 1, Ref floor = 1, Will floor = 4.
    // Insight bonus = 2 + floor(4/5) = 2. Conditional totals: Fort 3, Ref 3, Will 6.
    const sheet = compute(makeWizard(4, "void-elemental"), ref);
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 3, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(sheet.saves.ref.total).toBe(1);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 3, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(sheet.saves.will.total).toBe(4);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 6, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
  });

  it("level 15: +5 insight (2 + floor(15/5))", () => {
    // Level 15: Fort floor = floor(15/3) = 5, Ref floor = 5, Will floor = 2+7 = 9.
    // Insight bonus = 2 + floor(15/5) = 5. Conditional totals: Fort 10, Ref 10, Will 14.
    const sheet = compute(makeWizard(15, "void-elemental"), ref);
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 10, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 10, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(sheet.saves.will.total).toBe(9);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 14, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
  });

  it("a wizard of a different school gets no conditional", () => {
    const sheet = compute(makeWizard(10, "air-elemental"), ref);
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("spell"))).toBeFalsy();
  });

  it("a non-wizard with a stale wizardSchool field gets nothing (no wizard levels to grant it)", () => {
    const doc = makeWizard(5, "void-elemental");
    const fighter: CharacterDoc = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 5 }] },
    };
    const sheet = compute(fighter, ref);
    // A level-5 fighter's own Bravery adds an unrelated "fear" conditional —
    // orthogonal to this hook, so the assertion targets "spell" specifically.
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("spell"))).toBeFalsy();
  });
});
