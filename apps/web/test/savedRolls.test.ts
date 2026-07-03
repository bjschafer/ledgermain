import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, addWeapon, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addSavedRoll,
  availableSavedRollSources,
  removeSavedRoll,
  renameSavedRoll,
  resolveSavedRoll,
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

describe("addSavedRoll / removeSavedRoll / renameSavedRoll", () => {
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

  it("renameSavedRoll updates only the label", () => {
    let doc = addSavedRoll(fresh(), { kind: "cmb" }, "CMB");
    const id = doc.build.savedRolls![0]!.id;
    doc = renameSavedRoll(doc, id, "Grapple CMB");
    expect(doc.build.savedRolls![0]!.label).toBe("Grapple CMB");
    expect(doc.build.savedRolls![0]!.source).toEqual({ kind: "cmb" });
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
});
