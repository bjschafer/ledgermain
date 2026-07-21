import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, addWeapon, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addSavedRoll,
  addSavedRollFeat,
  attachableFeats,
  availableSavedRollSources,
  ownedFeatSlugs,
  removeSavedRoll,
  removeSavedRollFeat,
  resolveSavedRoll,
  setSavedRollFeatOption,
  updateSavedRoll,
} from "../src/model/savedRolls.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

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
    expect(
      options.some((o) => o.source.kind === "weapon" && o.source.weaponName === "Longsword"),
    ).toBe(true);
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

/** Fixture with a ranged weapon too (Longbow), for feat-attachment tests. */
function freshWithBow(): CharacterDoc {
  return addWeapon(fresh(), {
    name: "Longbow",
    attackAbility: "dex",
    damageAbility: "none",
    damageDice: "1d8",
    category: "ranged",
  });
}

describe("saved-roll feat attachment transitions", () => {
  it("addSavedRollFeat appends a ref; re-adding the same slug replaces it", () => {
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    expect(doc.build.savedRolls![0]!.feats).toEqual([
      { slug: "power-attack", name: "Power Attack" },
    ]);

    doc = addSavedRollFeat(doc, id, {
      slug: "power-attack",
      name: "Power Attack",
      option: "two-handed",
    });
    expect(doc.build.savedRolls![0]!.feats).toEqual([
      { slug: "power-attack", name: "Power Attack", option: "two-handed" },
    ]);
  });

  it("removeSavedRollFeat drops only the matching slug", () => {
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    doc = addSavedRollFeat(doc, id, { slug: "furious-focus", name: "Furious Focus" });
    doc = removeSavedRollFeat(doc, id, "power-attack");
    expect(doc.build.savedRolls![0]!.feats).toEqual([
      { slug: "furious-focus", name: "Furious Focus" },
    ]);
  });

  it("setSavedRollFeatOption sets and clears the variant", () => {
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    doc = setSavedRollFeatOption(doc, id, "power-attack", "two-handed");
    expect(doc.build.savedRolls![0]!.feats![0]!.option).toBe("two-handed");
    doc = setSavedRollFeatOption(doc, id, "power-attack", undefined);
    expect(doc.build.savedRolls![0]!.feats![0]!.option).toBeUndefined();
  });
});

describe("resolveSavedRoll() with attached feats", () => {
  // Fixture: Fighter 8 -> BAB 8 (iteratives), all abilities 10.
  // Deadly Aim / Power Attack tier at BAB 8: p = 1 + floor(8/4) = 3.

  it("PBS + Rapid Shot + Deadly Aim on the base ranged attack: -4 to every entry, one extra at the top", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "ranged" }, "Full ranged");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "point-blank-shot", name: "Point-Blank Shot" });
    doc = addSavedRollFeat(doc, id, { slug: "rapid-shot", name: "Rapid Shot" });
    doc = addSavedRollFeat(doc, id, { slug: "deadly-aim", name: "Deadly Aim" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // Attack delta: +1 (PBS) - 2 (Rapid Shot) - 3 (Deadly Aim) = -4.
    const base = sheet.attack.ranged.iteratives!; // [+8, +3] at BAB 8, dex 10
    const adjusted = base.map((n) => n - 4);
    const expected = [adjusted[0]!, ...adjusted]; // Rapid Shot extra at the top
    expect(resolved.display).toBe(expected.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));

    // Provenance: one component per numerically-contributing feat.
    expect(resolved.components).toContainEqual({
      source: "Point-Blank Shot",
      type: "untyped",
      value: 1,
      applied: true,
    });
    expect(resolved.components).toContainEqual({
      source: "Rapid Shot",
      type: "untyped",
      value: -2,
      applied: true,
    });
    expect(resolved.components).toContainEqual({
      source: "Deadly Aim",
      type: "untyped",
      value: -3,
      applied: true,
    });

    // Notes from applied entries.
    expect(resolved.notes).toEqual(["within 30 ft", "full attack only"]);

    // All three chips applied.
    expect(resolved.featChips.map((c) => c.applied)).toEqual([true, true, true]);
  });

  it("extraAttacks ordering: base +8/+3 with Rapid Shot alone -> +6/+6/+1", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "ranged" }, "Rapid");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "rapid-shot", name: "Rapid Shot" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const base = sheet.attack.ranged.iteratives!;
    const adjusted = base.map((n) => n - 2);
    const expected = [adjusted[0]!, ...adjusted];
    expect(resolved.display).toBe(expected.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
  });

  it("Power Attack two-handed on a melee weapon: -3 attack, +9 damage at BAB 8, with provenance", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "PA Longsword");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "power-attack",
      name: "Power Attack",
      option: "two-handed",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
    expect(resolved.components).toContainEqual({
      source: "Power Attack",
      type: "untyped",
      value: -3,
      applied: true,
    });

    const expectedBonus = atk.damageBonus.total + 9;
    expect(resolved.damage!.display).toBe(`${atk.damageDice}+${expectedBonus}`);
    expect(resolved.damage!.components).toContainEqual({
      source: "Power Attack",
      type: "untyped",
      value: 9,
      applied: true,
    });
  });

  it("Power Attack defaults to one-handed (+6 damage at BAB 8) when no option is set", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "PA Longsword");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage!.display).toBe(`${atk.damageDice}+${atk.damageBonus.total + 6}`);
  });

  it("Furious Focus + Power Attack (issue #94): negates the PA penalty on the first attack only", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "PA + FF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "power-attack",
      name: "Power Attack",
      option: "two-handed",
    });
    doc = addSavedRollFeat(doc, id, { slug: "furious-focus", name: "Furious Focus" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // PA -3 to every entry, then Furious Focus +3 back on the first only.
    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    adjusted[0] = atk.attack.iteratives![0]!; // first attack: penalty negated
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));

    expect(resolved.components).toContainEqual({
      source: "Power Attack",
      type: "untyped",
      value: -3,
      applied: true,
    });
    expect(resolved.components).toContainEqual({
      source: "Furious Focus (first attack)",
      type: "untyped",
      value: 3,
      applied: true,
    });

    // Damage is untouched by Furious Focus — still the full Power Attack bonus.
    expect(resolved.damage!.display).toBe(`${atk.damageDice}+${atk.damageBonus.total + 9}`);
    expect(resolved.damage!.components).not.toContainEqual(
      expect.objectContaining({ source: "Furious Focus (first attack)" }),
    );
  });

  it("Furious Focus negation is order-independent (listed before Power Attack)", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "FF + PA");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "furious-focus", name: "Furious Focus" });
    doc = addSavedRollFeat(doc, id, {
      slug: "power-attack",
      name: "Power Attack",
      option: "two-handed",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    adjusted[0] = atk.attack.iteratives![0]!;
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
  });

  it("Furious Focus alone conjures no phantom first-attack bonus (needs Power Attack)", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "FF only");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "furious-focus", name: "Furious Focus" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // No Power Attack attached -> sequence unchanged; only the reminder note.
    expect(resolved.display).toBe(
      atk.attack.iteratives!.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
    expect(resolved.components).not.toContainEqual(
      expect.objectContaining({ source: "Furious Focus (first attack)" }),
    );
    expect(resolved.notes).toEqual(["ignore Power Attack penalty on first attack each turn"]);
  });

  it("Piranha Strike (light-weapon Power Attack cousin): -3 attack, +6 damage at BAB 8", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Piranha");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "piranha-strike", name: "Piranha Strike" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
    expect(resolved.components).toContainEqual({
      source: "Piranha Strike",
      type: "untyped",
      value: -3,
      applied: true,
    });
    expect(resolved.damage!.display).toBe(`${atk.damageDice}+${atk.damageBonus.total + 6}`);
    expect(resolved.notes).toEqual(["light weapons only"]);
  });

  it("Furious Focus negates ONLY Power Attack, not Piranha Strike", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Piranha + FF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "piranha-strike", name: "Piranha Strike" });
    doc = addSavedRollFeat(doc, id, { slug: "furious-focus", name: "Furious Focus" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // Piranha Strike's -3 stays on every entry, including the first — Furious
    // Focus only cancels Power Attack's penalty.
    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
    expect(resolved.components).not.toContainEqual(
      expect.objectContaining({ source: "Furious Focus (first attack)" }),
    );
  });

  it("note-only melee feats (Cleave / Vital Strike) surface reminders without touching numbers", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "cleave", name: "Cleave" });
    doc = addSavedRollFeat(doc, id, { slug: "vital-strike", name: "Vital Strike" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    expect(resolved.display).toBe(
      sheet.attack.melee.iteratives!.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
    expect(resolved.components).toBe(sheet.attack.melee.components); // untouched, reference-equal
    expect(resolved.notes).toHaveLength(2);
    expect(resolved.featChips.every((c) => c.applied)).toBe(true);
  });

  it("Combat Expertise (issue #62): -3 attack at BAB 8, +3 dodge AC surfaced as a note, never applied to damage", () => {
    const sheet = compute(fresh(), ref);
    const atk = sheet.attacks.find((a) => a.name === "Longsword")!;
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "CE Longsword");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "combat-expertise", name: "Combat Expertise" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    const adjusted = atk.attack.iteratives!.map((n) => n - 3);
    expect(resolved.display).toBe(adjusted.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
    expect(resolved.components).toContainEqual({
      source: "Combat Expertise",
      type: "untyped",
      value: -3,
      applied: true,
    });
    // acDelta is display-only — no damage-side contribution at all.
    const expectedDamage =
      atk.damageBonus.total !== 0
        ? `${atk.damageDice}+${atk.damageBonus.total}`
        : `${atk.damageDice}`;
    expect(resolved.damage!.display).toBe(expectedDamage);
    expect(resolved.notes).toEqual(["+3 dodge AC"]);
  });

  it("an un-owned feat contributes nothing but chips with applied: false", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet, new Set<string>());

    expect(resolved.display).toBe(
      sheet.attack.melee.iteratives!.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
    expect(resolved.featChips).toEqual([
      {
        slug: "power-attack",
        name: "Power Attack",
        option: undefined,
        applied: false,
        modeled: true,
        owned: false,
      },
    ]);
  });

  it("an un-modeled feat chips without touching numbers", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "iron-will", name: "Iron Will" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    expect(resolved.display).toBe(
      sheet.attack.melee.iteratives!.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
    expect(resolved.components).toBe(sheet.attack.melee.components); // untouched, reference-equal
    expect(resolved.featChips).toEqual([
      {
        slug: "iron-will",
        name: "Iron Will",
        option: undefined,
        applied: false,
        modeled: false,
        owned: true,
      },
    ]);
  });

  it("Two-Weapon Fighting alone: -2 to the primary sequence + a single off-hand attack", () => {
    const sheet = compute(fresh(), ref);
    const base = sheet.attack.melee.iteratives!; // [+8, +3] at BAB 8
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "TWF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "light",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // Primary: every entry -2.
    const primary = base.map((n) => n - 2);
    expect(resolved.display).toBe(primary.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"));
    // Off-hand: one attack at the primary's top (offset 0), i.e. base[0] - 2 = +6.
    expect(resolved.offHand).toBe("+6");
    expect(resolved.components).toContainEqual({
      source: "Two-Weapon Fighting",
      type: "untyped",
      value: -2,
      applied: true,
    });
  });

  it("one-handed off-hand grip applies the -4 penalty instead", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "TWF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "one-handed",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    // base [+8,+3] - 4 -> primary +4/-1, off-hand top +4.
    expect(resolved.display).toBe("+4/-1");
    expect(resolved.offHand).toBe("+4");
  });

  it("full chain (TWF + Improved + Greater): three off-hand attacks at 0 / -5 / -10", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Two-weapon full");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "light",
    });
    doc = addSavedRollFeat(doc, id, {
      slug: "improved-two-weapon-fighting",
      name: "Improved Two-Weapon Fighting",
    });
    doc = addSavedRollFeat(doc, id, {
      slug: "greater-two-weapon-fighting",
      name: "Greater Two-Weapon Fighting",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    // Primary top is +6 (base +8 - 2 TWF); off-hand sequence +6 / +1 / -4.
    expect(resolved.offHand).toBe("+6/+1/-4");
  });

  it("chain order is irrelevant — Greater attached first still sorts highest-first", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "TWF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "greater-two-weapon-fighting",
      name: "Greater Two-Weapon Fighting",
    });
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "light",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    // TWF (0) + Greater (-10) -> +6 / -4 (no Improved, so no -5 middle entry).
    expect(resolved.offHand).toBe("+6/-4");
  });

  it("Improved TWF alone (no base TWF) conjures no off-hand line", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Improved only");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "improved-two-weapon-fighting",
      name: "Improved Two-Weapon Fighting",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.offHand).toBeUndefined();
    // Primary sequence untouched (Improved TWF carries no primary-hand penalty).
    expect(resolved.display).toBe(
      sheet.attack.melee.iteratives!.map((n) => (n >= 0 ? `+${n}` : `${n}`)).join("/"),
    );
  });

  it("Power Attack stacks onto the off-hand line (same total delta as the primary)", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "PA + TWF");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "light",
    });
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    // BAB 8 -> Power Attack p = 3. Total attack delta -2 (TWF) - 3 (PA) = -5.
    // base top +8 - 5 = +3 -> off-hand +3.
    expect(resolved.offHand).toBe("+3");
    expect(resolved.display).toBe("+3/-2");
  });

  it("a non-attack source never grows an off-hand line even with TWF attached", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, {
      slug: "two-weapon-fighting",
      name: "Two-Weapon Fighting",
      option: "light",
    });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.offHand).toBeUndefined();
    expect(resolved.components).toBe(sheet.saves.fort.components);
  });

  it("feats on a non-attack source (save) render as chips only, never numbers", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort");
    const id = doc.build.savedRolls![0]!.id;
    doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);

    expect(resolved.components).toBe(sheet.saves.fort.components);
    expect(resolved.featChips[0]!.applied).toBe(false);
    expect(resolved.notes).toEqual([]);
  });

  it("feat effects apply to a custom roll (attack-like)", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "custom" }, "Custom full attack");
    const id = doc.build.savedRolls![0]!.id;
    doc = updateSavedRoll(doc, id, { attackModifier: 10 });
    doc = addSavedRollFeat(doc, id, { slug: "rapid-shot", name: "Rapid Shot" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    // 10 - 2 = +8, plus one extra attack at the top -> "+8/+8".
    expect(resolved.display).toBe("+8/+8");
  });
});

describe("ownedFeatSlugs() / attachableFeats()", () => {
  function withFeats(...names: string[]): CharacterDoc {
    const doc = freshWithBow();
    return { ...doc, build: { ...doc.build, feats: names.map(featId) } };
  }

  it("ownedFeatSlugs maps build.feats through RefData names to slugs", () => {
    const doc = withFeats("Power Attack", "Iron Will");
    expect(ownedFeatSlugs(doc, ref)).toEqual(new Set(["power-attack", "iron-will"]));
  });

  it("orders modeled+compatible feats first for a ranged source", () => {
    const doc = withFeats("Iron Will", "Power Attack", "Rapid Shot", "Point-Blank Shot");
    const list = attachableFeats(doc, ref, { kind: "ranged" });
    expect(list.map((f) => f.slug)).toEqual([
      // ranged-compatible modeled feats, alphabetical
      "point-blank-shot",
      "rapid-shot",
      // the rest, alphabetical (Power Attack is modeled but melee-only)
      "iron-will",
      "power-attack",
    ]);
    expect(list[0]!.modeled).toBe(true);
    expect(list[2]!.modeled).toBe(false);
  });

  it("orders melee-compatible feats first for a melee source and carries options", () => {
    const doc = withFeats("Rapid Shot", "Power Attack");
    const list = attachableFeats(doc, ref, { kind: "melee" });
    expect(list.map((f) => f.slug)).toEqual(["power-attack", "rapid-shot"]);
    expect(list[0]!.options).toEqual([
      { id: "one-handed", label: "One-handed" },
      { id: "two-handed", label: "Two-handed" },
    ]);
  });

  it("uses the weapon's category for weapon sources (Longbow -> ranged-compatible first)", () => {
    const doc = withFeats("Power Attack", "Deadly Aim");
    const list = attachableFeats(doc, ref, { kind: "weapon", weaponName: "Longbow" });
    expect(list.map((f) => f.slug)).toEqual(["deadly-aim", "power-attack"]);
  });

  it("treats every modeled feat as compatible for custom sources", () => {
    const doc = withFeats("Iron Will", "Power Attack", "Deadly Aim");
    const list = attachableFeats(doc, ref, { kind: "custom" });
    expect(list.map((f) => f.slug)).toEqual(["deadly-aim", "power-attack", "iron-will"]);
  });
});
