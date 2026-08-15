import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/fighter.js";

/**
 * Fixture test for `archetype-extracted/fighter.ts`'s one maneuver-scoped
 * cmb/cmd promotion (`fighter:dirty-fighter:maneuver-training:5`), run
 * end-to-end through `compute()` — the aggregator (`archetype-extracted/
 * index.ts`) already merges every class's tables into the production
 * `ARCHETYPE_FEATURE_EFFECTS_EXTRACTED`, so a fighter with the Dirty Fighter
 * archetype picks this up the same way a hand-verified `archetype-effects.ts`
 * entry would.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function makeDoc(
  level: number,
  archetypes: string[],
  pickChoices?: Record<string, string>,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes,
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      pickChoices,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Maneuver Training (Dirty Fighter, dirty-trick-scoped cmb/cmd)", () => {
  it("classification is numeric, backed by an extracted-effects entry", () => {
    const entry =
      FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION["fighter:dirty-fighter:maneuver-training:5"];
    expect(entry?.bucket).toBe("numeric");
    expect(
      FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED["fighter:dirty-fighter:maneuver-training:5"],
    ).toBeDefined();
  });

  it("+2 cmb/cmd on dirty trick only, headline cmb/cmd untouched, at 5th level", () => {
    // "At 5th level, a dirty fighter becomes a master of dirty tricks. He
    // gains a +2 bonus on dirty trick combat maneuver checks and +2 to his
    // CMD when he is the target of a dirty trick combat maneuver." Fighter
    // has full BAB, so BAB 5 at level 5; Str 10 and Medium size contribute
    // nothing, so headline cmb/cmd read straight off BAB (cmd = 10 + BAB).
    const dirtyFighter = archetypeId("Dirty Fighter", "fighter");
    const sheet = compute(makeDoc(5, [dirtyFighter]), ref);
    expect(sheet.cmb).toBe(5);
    expect(sheet.cmd).toBe(15);
    expect(sheet.cmbConditionals).toEqual([
      { total: 7, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
    expect(sheet.cmdConditionals).toEqual([
      { total: 17, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });

  it("no conditional lines without the archetype", () => {
    const sheet = compute(makeDoc(5, []), ref);
    expect(sheet.cmbConditionals ?? []).toEqual([]);
    expect(sheet.cmdConditionals ?? []).toEqual([]);
  });
});

describe("Cavern Sniper: Sniper Training bow-or-crossbow pick (build.pickChoices)", () => {
  const cavernSniper = archetypeId("Cavern Sniper", "fighter");
  const featureId = "fighter:cavern-sniper:sniper-training:5";
  const pickChoiceKey = `archetypeFeature:${featureId}`;
  const bow: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Longbow",
    attackAbility: "dex",
    category: "ranged",
    weaponGroups: ["bows"],
  };
  const crossbow: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Light Crossbow",
    attackAbility: "dex",
    category: "ranged",
    weaponGroups: ["crossbows"],
  };

  function makeDocWithWeapon(
    level: number,
    archetypes: string[],
    weapon: NonNullable<CharacterDoc["build"]["weapons"]>[number],
    pickChoices?: Record<string, string>,
  ): CharacterDoc {
    const doc = makeDoc(level, archetypes, pickChoices);
    return { ...doc, build: { ...doc.build, weapons: [weapon] } };
  }

  it("no stored pick: no attack/damage bonus", () => {
    const sheet = compute(makeDocWithWeapon(5, [cavernSniper], bow), ref);
    const base = compute(makeDocWithWeapon(5, [], bow), ref);
    expect(sheet.attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total);
  });

  it("bows pick: +2 attack/damage at L5, +3 at L9", () => {
    const pickChoices = { [pickChoiceKey]: "bows" };
    const at5 = compute(makeDocWithWeapon(5, [cavernSniper], bow, pickChoices), ref);
    const base5 = compute(makeDocWithWeapon(5, [], bow), ref);
    expect(at5.attacks[0]!.attack.total - base5.attacks[0]!.attack.total).toBe(2);
    expect(at5.attacks[0]!.damageBonus.total - base5.attacks[0]!.damageBonus.total).toBe(2);

    const at9 = compute(makeDocWithWeapon(9, [cavernSniper], bow, pickChoices), ref);
    const base9 = compute(makeDocWithWeapon(9, [], bow), ref);
    expect(at9.attacks[0]!.attack.total - base9.attacks[0]!.attack.total).toBe(3);
  });

  it("crossbows pick doesn't apply to a bow, and vice versa", () => {
    const base = compute(makeDocWithWeapon(5, [], crossbow), ref);
    const bowsPick = compute(
      makeDocWithWeapon(5, [cavernSniper], crossbow, { [pickChoiceKey]: "bows" }),
      ref,
    );
    expect(bowsPick.attacks[0]!.attack.total).toBe(base.attacks[0]!.attack.total);

    const crossbowsPick = compute(
      makeDocWithWeapon(5, [cavernSniper], crossbow, { [pickChoiceKey]: "crossbows" }),
      ref,
    );
    expect(crossbowsPick.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(2);
  });
});

describe("Skirmisher: Conditioning specialization pick (build.pickChoices)", () => {
  const skirmisher = archetypeId("Skirmisher", "fighter");
  const featureId = "fighter:skirmisher:conditioning:2";
  const pickChoiceKey = `archetypeFeature:${featureId}`;

  function sheetWithSpec(level: number, spec: string | undefined) {
    return compute(makeDoc(level, [skirmisher], spec ? { [pickChoiceKey]: spec } : undefined), ref);
  }

  // Fighter Fortitude is a good save (2 + floor(level/2): 3 at L2, 5 at L6);
  // Will is a poor save (floor(level/3): 0 at L2). Abilities are all 10
  // (mod 0), so each conditional's `total` is that class-level base plus the
  // specialization's own bonus. Category order follows SAVE_CATEGORY_ORDER
  // (save-categories.ts's declaration order), not the order cited in text.

  it("no stored pick: no conditional save lines", () => {
    const sheet = sheetWithSpec(2, undefined);
    expect(sheet.saves.fort.conditionals ?? []).toEqual([]);
    expect(sheet.saves.will.conditionals ?? []).toEqual([]);
  });

  it("alpine: fatigue-scoped Fortitude bonus, +1 at L2, +2 at L6", () => {
    expect(sheetWithSpec(2, "alpine").saves.fort.conditionals).toEqual([
      { total: 4, categories: ["fatigue"], labels: ["fatigue/exhaustion"] },
    ]);
    expect(sheetWithSpec(6, "alpine").saves.fort.conditionals).toEqual([
      { total: 7, categories: ["fatigue"], labels: ["fatigue/exhaustion"] },
    ]);
  });

  it("counter-interrogation: charm/divination-scoped Will bonus, +1 at L2", () => {
    expect(sheetWithSpec(2, "counter-interrogation").saves.will.conditionals).toEqual([
      { total: 1, categories: ["divination", "charm"], labels: ["divination", "charm"] },
    ]);
  });

  it("jungle: disease/poison-scoped Fortitude bonus, +1 at L2", () => {
    expect(sheetWithSpec(2, "jungle").saves.fort.conditionals).toEqual([
      { total: 4, categories: ["poison", "disease"], labels: ["poison", "disease"] },
    ]);
  });

  it("light-infantry: no matching save category, no conditional lines", () => {
    const sheet = sheetWithSpec(2, "light-infantry");
    expect(sheet.saves.fort.conditionals ?? []).toEqual([]);
    expect(sheet.saves.ref.conditionals ?? []).toEqual([]);
    expect(sheet.saves.will.conditionals ?? []).toEqual([]);
  });
});
