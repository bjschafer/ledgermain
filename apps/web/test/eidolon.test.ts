import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addEidolonEvolution,
  applyEidolonDamage,
  clearEidolon,
  deriveEidolonSheet,
  eidolonEvolutionPointsAvailable,
  eidolonEvolutionPointsSpent,
  eidolonEvolutionPoolNeedsWarning,
  eidolonFeatPrereqContext,
  eidolonHasWeaponFinesse,
  healEidolon,
  healEidolonNonlethal,
  addEidolonNonlethal,
  isEidolonSummoned,
  isSharedWithEidolon,
  removeEidolonEvolution,
  restEidolon,
  setEidolon,
  setEidolonNotes,
  toggleEidolonFeat,
  toggleEidolonSummoned,
  toggleSharedBuffEidolon,
} from "../src/model/eidolon.js";

const ref = loadRefData();

function summoner7(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "summoner");
  d = setClassLevel(d, "summoner", 7);
  return d;
}

describe("model/eidolon.ts transitions", () => {
  it("setEidolon sets base form + name, trimming a blank name, and seeds an empty evolutions list", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "  Grix  ");
    expect(d.build.eidolon).toEqual({ baseForm: "biped", name: "Grix", evolutions: [] });
  });

  it("setEidolon with a blank name falls back to 'Eidolon'", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "   ");
    expect(d.build.eidolon?.name).toBe("Eidolon");
  });

  it("setEidolon preserves existing evolutions when changing the base form", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "bite");
    d = setEidolon(d, "quadruped", "Grix");
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "bite", choice: undefined }]);
  });

  it("setEidolonNotes no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonNotes(d, "hi")).toBe(d);
  });

  it("clearEidolon removes both build and live state", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 3);
    d = clearEidolon(d);
    expect(d.build.eidolon).toBeUndefined();
    expect(d.live.eidolon).toBeUndefined();
  });

  it("addEidolonEvolution appends a pick; no-ops without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(addEidolonEvolution(empty, "bite")).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "ability-increase", "str");
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "ability-increase", choice: "str" }]);
  });

  it("removeEidolonEvolution removes by index (not by id, so repeats stay unambiguous)", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "ability-increase", "str");
    d = addEidolonEvolution(d, "ability-increase", "con");
    d = removeEidolonEvolution(d, 0);
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "ability-increase", choice: "con" }]);
  });

  it("removeEidolonEvolution no-ops out of range or without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(removeEidolonEvolution(empty, 0)).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "bite");
    expect(removeEidolonEvolution(d, 5)).toBe(d);
  });

  it("applyEidolonDamage / healEidolon track a damage counter", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 10);
    expect(d.live.eidolon?.damage).toBe(10);
    d = healEidolon(d, 4);
    expect(d.live.eidolon?.damage).toBe(6);
    d = healEidolon(d, 99);
    expect(d.live.eidolon?.damage).toBe(0);
  });

  it("addEidolonNonlethal / healEidolonNonlethal track nonlethal separately", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonNonlethal(d, 4);
    expect(d.live.eidolon?.nonlethal).toBe(4);
    d = healEidolonNonlethal(d, 10);
    expect(d.live.eidolon?.nonlethal).toBe(0);
  });

  it("restEidolon clears damage and nonlethal", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 5);
    d = addEidolonNonlethal(d, 2);
    d = restEidolon(d);
    expect(d.live.eidolon?.damage).toBe(0);
    expect(d.live.eidolon?.nonlethal).toBe(0);
  });

  it("toggleSharedBuffEidolon / isSharedWithEidolon", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(false);
    d = toggleSharedBuffEidolon(d, "buff-1");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(true);
    d = toggleSharedBuffEidolon(d, "buff-1");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(false);
  });

  it("isEidolonSummoned defaults to true; toggleEidolonSummoned flips it", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(isEidolonSummoned(d)).toBe(true);
    d = toggleEidolonSummoned(d);
    expect(isEidolonSummoned(d)).toBe(false);
    d = toggleEidolonSummoned(d);
    expect(isEidolonSummoned(d)).toBe(true);
  });

  it("toggleEidolonSummoned no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(toggleEidolonSummoned(d)).toBe(d);
  });
});

describe("eidolon evolution-pool budget helpers", () => {
  it("eidolonEvolutionPointsSpent sums resolved costs, ignoring unknown ids", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    d = addEidolonEvolution(d, "bite"); // 1
    d = addEidolonEvolution(d, "ability-increase", "str"); // 2
    d = addEidolonEvolution(d, "not-a-real-evolution"); // 0
    expect(eidolonEvolutionPointsSpent(d)).toBe(3);
  });

  it("eidolonEvolutionPointsAvailable reads the progression table at the current summoner level", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    // level 7 row: evolutionPool 10.
    expect(eidolonEvolutionPointsAvailable(d)).toBe(10);
  });

  it("eidolonEvolutionPointsAvailable is 0 with no summoner levels", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(eidolonEvolutionPointsAvailable(d)).toBe(0);
  });

  it("eidolonEvolutionPoolNeedsWarning flags overspend but never blocks", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    expect(eidolonEvolutionPoolNeedsWarning(d)).toBe(false);
    for (let i = 0; i < 12; i++) d = addEidolonEvolution(d, "tentacle");
    expect(eidolonEvolutionPointsSpent(d)).toBe(12);
    expect(eidolonEvolutionPoolNeedsWarning(d)).toBe(true);
  });
});

describe("derivEidolonSheet() — wired through the normal doc model", () => {
  it("returns undefined without an eidolon", () => {
    const d = summoner7();
    expect(deriveEidolonSheet(d, ref)).toBeUndefined();
  });

  it("hand-computed fixture: summoner-7 biped eidolon, HD 6, BAB +6, Medium", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");

    const eidolon = deriveEidolonSheet(d, ref);
    expect(eidolon).toBeDefined();
    expect(eidolon!.level).toBe(7);
    expect(eidolon!.hd).toBe(6);
    expect(eidolon!.bab).toBe(6);
    expect(eidolon!.size).toBe("med");
  });

  it("returns undefined for an unknown base form id", () => {
    let d = summoner7();
    d = setEidolon(d, "not-a-form", "Ghost");
    expect(deriveEidolonSheet(d, ref)).toBeUndefined();
  });
});

describe("eidolon feat investment", () => {
  const powerAttackId = Object.values(ref.feats).find((f) => f.name === "Power Attack")!.id;

  it("toggleEidolonFeat adds then removes a feat id, no-ops without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(toggleEidolonFeat(empty, powerAttackId)).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = toggleEidolonFeat(d, powerAttackId);
    expect(d.build.eidolon?.feats).toEqual([powerAttackId]);
    d = toggleEidolonFeat(d, powerAttackId);
    expect(d.build.eidolon?.feats).toEqual([]);
  });

  it("eidolonFeatPrereqContext checks structured prereqs against the EIDOLON's own BAB/abilities, not the summoner's", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    const eidolon = deriveEidolonSheet(d, ref)!;
    d = toggleEidolonFeat(d, powerAttackId);
    const ctx = eidolonFeatPrereqContext(d, eidolon, ref);
    expect(ctx.bab).toBe(eidolon.bab);
    expect(ctx.abilityTotals.str).toBe(eidolon.abilities.str.score);
    expect(ctx.casterLevel).toBe(0);
    expect(ctx.selectedFeats).toEqual(new Set([powerAttackId]));
  });

  it("eidolonHasWeaponFinesse reads the EIDOLON's own feats (build.eidolon.feats), not the summoner's", () => {
    const weaponFinesseId = Object.values(ref.feats).find((f) => f.name === "Weapon Finesse")!.id;
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(eidolonHasWeaponFinesse(d, ref)).toBe(false);
    d = toggleEidolonFeat(d, weaponFinesseId);
    expect(eidolonHasWeaponFinesse(d, ref)).toBe(true);
  });

  it("Weapon Finesse switches the attack roll to Dex; damage stays Str-based (issue #68)", () => {
    // summoner-1 serpentine eidolon: Str 12 (mod +1), Dex 16 (mod +3) — Dex
    // ahead of Str, so this fixture can show the swap.
    const weaponFinesseId = Object.values(ref.feats).find((f) => f.name === "Weapon Finesse")!.id;
    let d = createEmptyDoc("t");
    d = addClass(d, "summoner");
    d = setClassLevel(d, "summoner", 1);
    d = setEidolon(d, "serpentine", "Coil");

    const withoutFinesse = deriveEidolonSheet(d, ref)!;
    const biteWithout = withoutFinesse.attacks.find((a) => a.name === "Bite")!;
    // HD 1, BAB +1; Medium (size mod 0). bab(1) + strMod(1) + size(0) = 2.
    expect(biteWithout).toMatchObject({ attack: 2, damageBonus: 1 });

    d = toggleEidolonFeat(d, weaponFinesseId);
    const withFinesse = deriveEidolonSheet(d, ref)!;
    const biteWith = withFinesse.attacks.find((a) => a.name === "Bite")!;
    // bab(1) + dexMod(3) + size(0) = 4; damage stays Str-based (strMod 1).
    expect(biteWith).toMatchObject({ attack: 4, damageBonus: 1 });
  });
});
