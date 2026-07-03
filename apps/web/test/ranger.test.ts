import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, addWeapon, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addFavoredEnemy,
  addFavoredTerrain,
  combatStyleFeatSlugs,
  favoredEnemyBudget,
  favoredTerrainBudget,
  isCombatStyleFeat,
  isRanger,
  removeFavoredEnemy,
  setCombatStyle,
  setFavoredEnemyBonus,
  setFavoredEnemyType,
  setFavoredTerrainBonus,
  setFavoredTerrainType,
} from "../src/model/ranger.js";
import { addSavedRoll, addSavedRollRanger, resolveSavedRoll } from "../src/model/savedRolls.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

/** A ranger with a longbow, at the given level. */
function ranger(level = 10): CharacterDoc {
  let doc = createEmptyDoc("t");
  doc = addClass(doc, "ranger");
  doc = setClassLevel(doc, "ranger", level);
  doc = addWeapon(doc, { name: "Longbow", attackAbility: "dex", damageDice: "1d8" });
  return doc;
}

describe("ranger build transitions", () => {
  it("isRanger gates on ranger levels", () => {
    expect(isRanger(ranger(1))).toBe(true);
    let fighter = createEmptyDoc("t");
    fighter = addClass(fighter, "fighter");
    expect(isRanger(fighter)).toBe(false);
  });

  it("adds, types, re-bonuses, and removes a favored enemy", () => {
    let doc = addFavoredEnemy(ranger());
    expect(doc.build.favoredEnemies).toEqual([{ type: "", bonus: 2 }]);
    doc = setFavoredEnemyType(doc, 0, "undead");
    doc = setFavoredEnemyBonus(doc, 0, 6);
    expect(doc.build.favoredEnemies).toEqual([{ type: "undead", bonus: 6 }]);
    doc = removeFavoredEnemy(doc, 0);
    expect(doc.build.favoredEnemies).toEqual([]);
  });

  it("clamps a favored bonus to a non-negative integer", () => {
    let doc = addFavoredEnemy(ranger());
    doc = setFavoredEnemyBonus(doc, 0, -3);
    expect(doc.build.favoredEnemies![0]!.bonus).toBe(0);
    doc = setFavoredEnemyBonus(doc, 0, 2.7);
    expect(doc.build.favoredEnemies![0]!.bonus).toBe(3);
  });

  it("setCombatStyle sets and clears", () => {
    let doc = setCombatStyle(ranger(), "archery");
    expect(doc.build.combatStyle).toBe("archery");
    doc = setCombatStyle(doc, null);
    expect(doc.build.combatStyle).toBeUndefined();
  });
});

describe("favored budgets (soft-validation hints)", () => {
  it("reports slots, budget, and current usage for a level-10 ranger", () => {
    let doc = addFavoredEnemy(ranger(10));
    doc = setFavoredEnemyBonus(doc, 0, 6);
    const b = favoredEnemyBudget(doc);
    expect(b.slots).toBe(3); // 1, 5, 10
    expect(b.bonusBudget).toBe(10); // 4*3 - 2
    expect(b.chosen).toBe(1);
    expect(b.bonusAssigned).toBe(6);
  });

  it("terrain budget starts at level 3", () => {
    expect(favoredTerrainBudget(ranger(2)).slots).toBe(0);
    let doc = addFavoredTerrain(ranger(3));
    expect(favoredTerrainBudget(doc).slots).toBe(1);
  });
});

describe("combat-style prereq bypass", () => {
  it("combatStyleFeatSlugs returns the chosen style's tree, empty otherwise", () => {
    expect(combatStyleFeatSlugs(ranger()).size).toBe(0);
    const doc = setCombatStyle(ranger(), "archery");
    expect(combatStyleFeatSlugs(doc).has("rapid-shot")).toBe(true);
    expect(combatStyleFeatSlugs(doc).has("two-weapon-fighting")).toBe(false);
  });

  it("isCombatStyleFeat resolves a feat id against the chosen style", () => {
    const doc = setCombatStyle(ranger(), "archery");
    expect(isCombatStyleFeat(doc, ref, featId("Rapid Shot"))).toBe(true);
    expect(isCombatStyleFeat(doc, ref, featId("Power Attack"))).toBe(false);
  });
});

describe("favored enemy/terrain saved-roll folding", () => {
  it("folds a favored-enemy bonus into attack and damage on a weapon roll", () => {
    let doc = addFavoredEnemy(ranger());
    doc = setFavoredEnemyType(doc, 0, "undead");
    doc = setFavoredEnemyBonus(doc, 0, 4);
    doc = addSavedRoll(doc, { kind: "weapon", weaponName: "Longbow" }, "Longbow vs Undead");
    const rollId = doc.build.savedRolls![0]!.id;
    doc = addSavedRollRanger(doc, rollId, { kind: "favored-enemy", type: "undead", name: "Undead" });

    const sheet = compute(doc, ref);
    const baseline = resolveSavedRoll(
      { ...doc.build.savedRolls![0]!, rangerBonuses: [] },
      sheet,
    );
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const baseAtk = Number(baseline.display.split("/")[0]);
    const withAtk = Number(resolved.display.split("/")[0]);
    expect(withAtk - baseAtk).toBe(4);
    expect(resolved.damage!.display).toContain("+");
    expect(resolved.rangerChips).toEqual([
      { kind: "favored-enemy", type: "undead", name: "Undead", bonus: 4, applied: true },
    ]);
  });

  it("a since-removed favored pick resolves to a reminder chip with no number", () => {
    let doc = addFavoredEnemy(ranger());
    doc = setFavoredEnemyType(doc, 0, "undead");
    doc = setFavoredEnemyBonus(doc, 0, 4);
    doc = addSavedRoll(doc, { kind: "weapon", weaponName: "Longbow" }, "Longbow vs Undead");
    const rollId = doc.build.savedRolls![0]!.id;
    doc = addSavedRollRanger(doc, rollId, { kind: "favored-enemy", type: "undead", name: "Undead" });
    doc = removeFavoredEnemy(doc, 0); // player drops the favored enemy

    const sheet = compute(doc, ref);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.rangerChips[0]!.applied).toBe(false);
    expect(resolved.rangerChips[0]!.bonus).toBe(0);
  });

  it("folds a favored-terrain bonus into an initiative roll but not damage", () => {
    let doc = addFavoredTerrain(ranger());
    doc = setFavoredTerrainType(doc, 0, "forest");
    doc = setFavoredTerrainBonus(doc, 0, 2);
    doc = addSavedRoll(doc, { kind: "initiative" }, "Init in Forest");
    const rollId = doc.build.savedRolls![0]!.id;
    doc = addSavedRollRanger(doc, rollId, { kind: "favored-terrain", type: "forest", name: "Forest" });

    const sheet = compute(doc, ref);
    const base = resolveSavedRoll({ ...doc.build.savedRolls![0]!, rangerBonuses: [] }, sheet);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(Number(resolved.display) - Number(base.display)).toBe(2);
    expect(resolved.damage).toBeUndefined();
  });
});
