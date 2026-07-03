import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, addWeapon, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addSavedRoll,
  availableSavedRollSources,
  removeSavedRoll,
  resolveSavedRoll,
  updateSavedRoll,
} from "../src/model/savedRolls.js";

const ref = loadRefData();

function fresh(): CharacterDoc {
  let doc = createEmptyDoc("t");
  doc = addClass(doc, "fighter");
  doc = setClassLevel(doc, "fighter", 8); // BAB 8 -> iterative attacks
  doc = addWeapon(doc, {
    name: "Longsword",
    attackAbility: "str",
    damageDice: "1d8",
  });
  return doc;
}

describe("addSavedRoll / removeSavedRoll / updateSavedRoll", () => {
  it("adds a saved roll pointing at a source", () => {
    const doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    expect(doc.build.savedRolls).toHaveLength(1);
    expect(doc.build.savedRolls![0]!.label).toBe("CMB");
    expect(doc.build.savedRolls![0]!.source).toEqual({ kind: "cmb" });
  });

  it("assigns a stable id and appends without disturbing existing rolls", () => {
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    doc = addSavedRoll(doc, { kind: "cmd" }, "CMD");
    expect(doc.build.savedRolls).toHaveLength(2);
    expect(doc.build.savedRolls![0]!.id).not.toBe(doc.build.savedRolls![1]!.id);
  });

  it("removeSavedRoll drops only the matching id", () => {
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    doc = addSavedRoll(doc, { kind: "cmd" }, "CMD");
    const targetId = doc.build.savedRolls![0]!.id;
    doc = removeSavedRoll(doc, targetId);
    expect(doc.build.savedRolls).toHaveLength(1);
    expect(doc.build.savedRolls![0]!.label).toBe("CMD");
  });

  it("updateSavedRoll patches only the given fields", () => {
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { label: "Grapple CMB" });
    expect(doc.build.savedRolls![0]!.label).toBe("Grapple CMB");
    expect(doc.build.savedRolls![0]!.source).toEqual({ kind: "cmb" });

    doc = updateSavedRoll(doc, id, { attackModifier: -2 });
    expect(doc.build.savedRolls![0]!.label).toBe("Grapple CMB");
    expect(doc.build.savedRolls![0]!.attackModifier).toBe(-2);
  });

  it("removeSavedRoll on a doc with no savedRolls is a no-op", () => {
    const doc = removeSavedRoll(fresh(), "nonexistent");
    expect(doc.build.savedRolls).toEqual([]);
  });
});

describe("availableSavedRollSources()", () => {
  it("includes melee, ranged, CMB, CMD, initiative, all three saves, and the added weapon", () => {
    const sheet = compute(fresh(), ref);
    const options = availableSavedRollSources(sheet);
    const kinds = options.map((o) => o.source.kind);
    expect(kinds).toContain("melee");
    expect(kinds).toContain("ranged");
    expect(kinds).toContain("cmb");
    expect(kinds).toContain("cmd");
    expect(kinds).toContain("initiative");
    expect(options.filter((o) => o.source.kind === "save")).toHaveLength(3);
    expect(options.some((o) => o.source.kind === "weapon" && o.source.weaponName === "Longsword")).toBe(true);
    expect(kinds).toContain("custom");
  });

  it("only lists usable skills", () => {
    const sheet = compute(fresh(), ref);
    const options = availableSavedRollSources(sheet);
    const skillOptions = options.filter((o) => o.source.kind === "skill");
    for (const opt of skillOptions) {
      const id = (opt.source as { kind: "skill"; skillId: string }).skillId;
      expect(sheet.skills[id as keyof typeof sheet.skills]!.usable).toBe(true);
    }
  });
});

describe("resolveSavedRoll()", () => {
  it("resolves CMB to the sheet's signed total with no components", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(false);
    expect(resolved.display).toBe(sheet.cmb >= 0 ? `+${sheet.cmb}` : `${sheet.cmb}`);
  });

  it("resolves melee attack as an iterative sequence at BAB 8", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(false);
    expect(resolved.display).toContain("/");
    expect(resolved.components).toBe(sheet.attack.melee.components);
  });

  it("resolves a per-weapon attack by name", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    const doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Longsword");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(false);
    expect(resolved.components).toBe(atk.attack.components);
    expect(resolved.display).toContain("/"); // BAB 8 -> iterative sequence
  });

  it("flags a removed weapon as missing rather than crashing", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Greataxe" }, "Greataxe");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(true);
    expect(resolved.display).toBe("—");
    expect(resolved.components).toEqual([]);
  });

  it("flags an unknown/removed skill id as missing", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "skill", skillId: "notaskill" as never }, "???");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(true);
  });

  it("resolves a save to its signed total with provenance", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(false);
    expect(resolved.components).toBe(sheet.saves.fort.components);
  });

  it("resolves a per-weapon attack's damage line (dice + bonus + crit)", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    const doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Longsword");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage).toBeDefined();
    expect(resolved.damage!.crit).toBe(atk.crit);
    expect(resolved.damage!.display.startsWith(atk.damageDice ?? "")).toBe(true);
  });

  it("non-weapon sources never resolve a damage line", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage).toBeUndefined();
  });
});

describe("resolveSavedRoll() with attackModifier / damageModifier (Rapid Shot / Deadly Aim-style adjustments)", () => {
  it("shifts every entry of an iterative melee sequence by attackModifier", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { attackModifier: -2 });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const base = sheet.attack.melee;
    const expectedIteratives = base.iteratives!.map((n) => n - 2);
    expect(resolved.display).toBe(
      expectedIteratives.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
  });

  it("adds a synthetic 'Manual adjustment' component when attackModifier is set", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { attackModifier: 3 });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.display).toBe(sheet.cmb + 3 >= 0 ? `+${sheet.cmb + 3}` : `${sheet.cmb + 3}`);
    expect(resolved.components).toEqual([
      { source: "Manual adjustment", type: "untyped", value: 3, applied: true },
    ]);
  });

  it("a zero/undefined attackModifier leaves components untouched (reference-equal)", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.components).toBe(sheet.saves.fort.components);
  });

  it("damageModifier adjusts a weapon roll's damage bonus and display", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Longsword");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { damageModifier: 2 });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    const expectedBonus = atk.damageBonus.total + 2;
    expect(resolved.damage!.display).toBe(`${atk.damageDice}+${expectedBonus}`);
  });
});

describe("resolveSavedRoll() for a fully custom roll", () => {
  it("a bare custom roll resolves to +0 with no components", () => {
    const doc = addSavedRoll(fresh(), { kind: "custom" }, "Aid Another");
    const sheet = compute(fresh(), ref);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(false);
    expect(resolved.display).toBe("+0");
    expect(resolved.components).toEqual([]);
  });

  it("attackModifier is the custom roll's entire value", () => {
    let doc = addSavedRoll(fresh(), { kind: "custom" }, "Called Shot");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { attackModifier: 7 });
    const sheet = compute(fresh(), ref);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.display).toBe("+7");
  });

  it("customDamage surfaces verbatim as the damage line", () => {
    let doc = addSavedRoll(fresh(), { kind: "custom" }, "Alchemist's Fire");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { customDamage: "1d4 fire, splash 1" });
    const sheet = compute(fresh(), ref);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage).toEqual({ display: "1d4 fire, splash 1", components: [] });
  });

  it("customDamage is ignored for non-custom sources", () => {
    // Only reachable via a manually-crafted doc (the UI never sets customDamage
    // on a non-custom roll), but resolveSavedRoll should still ignore it safely.
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { customDamage: "should be ignored" });
    const sheet = compute(fresh(), ref);
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage).toBeUndefined();
  });
});
