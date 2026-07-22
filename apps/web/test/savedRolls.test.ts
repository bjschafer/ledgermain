import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  addClass,
  addWeapon,
  createEmptyDoc,
  setAbility,
  setClassLevel,
} from "../src/model/doc.js";
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
  setSavedRollTwf,
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
    expect(resolved.damage).toEqual({
      display: "1d4 fire, splash 1",
      formula: "1d4 fire, splash 1",
      components: [],
    });
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

  it("a non-attack source never grows an off-hand line, even flagged two-weapon", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort");
    const id = doc.build.savedRolls![0]!.id;
    doc = setSavedRollTwf(doc, id, { offHand: "light" });
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet, new Set());
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

/**
 * Two-weapon fighting (issue #97). Fixture: fighter 8 (BAB 8, melee +8/+3),
 * Str 18 (+4), a longsword in the main hand and a shortsword off-hand entered
 * as a normal one-handed weapon (×1 Str damage, +4) — so the off-hand line has
 * to restate the ability damage itself.
 */
describe("resolveSavedRoll — two-weapon fighting", () => {
  function twoWeaponDoc(): CharacterDoc {
    let doc = setAbility(fresh(), "str", 18);
    // +1 so the off-hand's own attack/damage totals differ from the longsword's.
    doc = addWeapon(doc, {
      name: "Shortsword",
      attackAbility: "str",
      damageDice: "1d6",
      enhancement: 1,
    });
    return doc;
  }

  /** A saved roll on the fixture's main-hand weapon, flagged two-weapon. */
  function twoWeaponRoll(
    twf: Parameters<typeof setSavedRollTwf>[2],
    ...featNames: string[]
  ): { doc: CharacterDoc; owned: Set<string> } {
    let doc = twoWeaponDoc();
    doc = { ...doc, build: { ...doc.build, feats: featNames.map(featId) } };
    doc = addSavedRoll(doc, { kind: "weapon", weaponName: "Longsword" }, "Two-weapon full attack");
    doc = setSavedRollTwf(doc, doc.build.savedRolls![0]!.id, twf);
    return { doc, owned: ownedFeatSlugs(doc, ref) };
  }

  function resolve(twf: Parameters<typeof setSavedRollTwf>[2], ...featNames: string[]) {
    const { doc, owned } = twoWeaponRoll(twf, ...featNames);
    return resolveSavedRoll(doc.build.savedRolls![0]!, compute(doc, ref), owned);
  }

  describe("the penalty table (no feats required)", () => {
    it("bare, one-handed off-hand: -6 primary / -10 off-hand", () => {
      const r = resolve({ offHand: "one-handed" });
      // Longsword attack +12 (BAB 8 + Str 4) -> +12/+7 before penalties.
      expect(r.display).toBe("+6/+1");
      expect(r.offHand).toBe("+2");
    });

    it("bare, light off-hand: -4 / -8", () => {
      const r = resolve({ offHand: "light" });
      expect(r.display).toBe("+8/+3");
      expect(r.offHand).toBe("+4");
    });

    it("Two-Weapon Fighting, one-handed off-hand: -4 / -4", () => {
      const r = resolve({ offHand: "one-handed" }, "Two-Weapon Fighting");
      expect(r.display).toBe("+8/+3");
      expect(r.offHand).toBe("+8");
    });

    it("Two-Weapon Fighting + light off-hand: -2 / -2", () => {
      const r = resolve({ offHand: "light" }, "Two-Weapon Fighting");
      expect(r.display).toBe("+10/+5");
      expect(r.offHand).toBe("+10");
    });

    it("records each hand's penalty in its own provenance", () => {
      const r = resolve({ offHand: "light" });
      expect(r.components).toContainEqual({
        source: "Two-weapon fighting (main hand)",
        type: "untyped",
        value: -4,
        applied: true,
      });
      expect(r.offHandComponents).toContainEqual({
        source: "Two-weapon fighting (off hand)",
        type: "untyped",
        value: -8,
        applied: true,
      });
    });
  });

  describe("the off-hand sequence", () => {
    it("Improved / Greater add off-hand attacks at -5 / -10", () => {
      const r = resolve(
        { offHand: "light" },
        "Two-Weapon Fighting",
        "Improved Two-Weapon Fighting",
        "Greater Two-Weapon Fighting",
      );
      expect(r.offHand).toBe("+10/+5/+0");
    });

    it("is the off-hand WEAPON's own attack bonus when one is chosen", () => {
      const r = resolve({ offHand: "light", offHandWeapon: "Shortsword" }, "Two-Weapon Fighting");
      // Built from the shortsword's +13, not the longsword's +12.
      expect(r.offHand).toBe("+11");
      expect(r.offHandComponents!.some((c) => c.source === "Shortsword (enhancement)")).toBe(true);
    });

    it("notes an off-hand weapon that no longer exists", () => {
      const r = resolve({ offHand: "light", offHandWeapon: "Dagger" });
      expect(r.notes).toContain('off-hand weapon "Dagger" not found');
      expect(r.offHand).toBe("+4"); // falls back to the primary's bonus
      expect(r.offHandDamage).toBeUndefined();
    });
  });

  describe("off-hand damage", () => {
    it("halves the ability damage regardless of how the weapon is configured", () => {
      const r = resolve({ offHand: "light", offHandWeapon: "Shortsword" }, "Two-Weapon Fighting");
      // Shortsword carries ×1 Str (+4) as a main-hand weapon; off-hand is ½ -> +2,
      // plus its +1 enhancement.
      expect(r.offHandDamage!.display).toBe("1d6+3");
    });

    it("Double Slice restores the full ability bonus", () => {
      const r = resolve(
        { offHand: "light", offHandWeapon: "Shortsword" },
        "Two-Weapon Fighting",
        "Double Slice",
      );
      expect(r.offHandDamage!.display).toBe("1d6+5");
    });

    it("Power Attack's damage bonus is halved on the off hand", () => {
      let { doc, owned } = twoWeaponRoll(
        { offHand: "light", offHandWeapon: "Shortsword" },
        "Two-Weapon Fighting",
        "Power Attack",
      );
      const id = doc.build.savedRolls![0]!.id;
      doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
      const r = resolveSavedRoll(doc.build.savedRolls![0]!, compute(doc, ref), owned);
      // BAB 8 -> p = 3: -3 attack, +6 damage one-handed, +3 on the off hand.
      expect(r.damage!.display).toBe("1d8+10"); // Str 4 + Power Attack 6
      expect(r.offHandDamage!.display).toBe("1d6+6"); // ½ Str 2 + enh 1 + ½ Power Attack 3
      expect(r.display).toBe("+7/+2");
      expect(r.offHand).toBe("+8");
    });
  });

  describe("feats, chips and reminders", () => {
    it("applies every owned chain feat without the player attaching anything", () => {
      const r = resolve(
        { offHand: "light" },
        "Two-Weapon Fighting",
        "Improved Two-Weapon Fighting",
        "Two-Weapon Rend",
      );
      const chips = r.featChips.filter((c) => c.auto);
      expect(chips.map((c) => c.slug)).toEqual([
        "two-weapon-fighting",
        "improved-two-weapon-fighting",
        "two-weapon-rend",
      ]);
      // Rend moves no number, so it reads as a reminder instead.
      expect(chips.find((c) => c.slug === "two-weapon-rend")!.applied).toBe(false);
      expect(r.notes.some((n) => n.includes("once/round"))).toBe(true);
    });

    it("lists no chain chips for a character with none of the feats", () => {
      const r = resolve({ offHand: "light" });
      expect(r.featChips).toEqual([]);
      expect(r.offHand).toBe("+4");
    });

    it("upgrades a pre-#97 roll that attached the Two-Weapon Fighting feat", () => {
      let doc = twoWeaponDoc();
      doc = { ...doc, build: { ...doc.build, feats: [featId("Two-Weapon Fighting")] } };
      doc = addSavedRoll(doc, { kind: "melee" }, "Legacy TWF");
      const id = doc.build.savedRolls![0]!.id;
      doc = addSavedRollFeat(doc, id, {
        slug: "two-weapon-fighting",
        name: "Two-Weapon Fighting",
        option: "one-handed",
      });
      const sheet = compute(doc, ref);
      const r = resolveSavedRoll(doc.build.savedRolls![0]!, sheet, ownedFeatSlugs(doc, ref));
      // The legacy `option` becomes the grip: -4 / -4 with the feat.
      expect(r.display).toBe("+8/+3");
      expect(r.offHand).toBe("+8");
      // Surfaced once, as an auto chip — not also as an attached one.
      expect(r.featChips.map((c) => c.slug)).toEqual(["two-weapon-fighting"]);
      expect(r.featChips[0]!.auto).toBe(true);
    });

    it("the chain isn't offered in the manual feat picker", () => {
      const { doc } = twoWeaponRoll({ offHand: "light" }, "Two-Weapon Fighting", "Power Attack");
      const slugs = attachableFeats(doc, ref, { kind: "melee" }).map((f) => f.slug);
      expect(slugs).toEqual(["power-attack"]);
    });
  });

  describe("setSavedRollTwf", () => {
    it("turns the mode off and clears legacy chain attachments", () => {
      let doc = addSavedRoll(twoWeaponDoc(), { kind: "melee" }, "Legacy");
      const id = doc.build.savedRolls![0]!.id;
      doc = addSavedRollFeat(doc, id, { slug: "two-weapon-fighting", name: "Two-Weapon Fighting" });
      doc = addSavedRollFeat(doc, id, { slug: "power-attack", name: "Power Attack" });
      doc = setSavedRollTwf(doc, id, undefined);
      expect(doc.build.savedRolls![0]!.twf).toBeUndefined();
      expect(doc.build.savedRolls![0]!.feats!.map((f) => f.slug)).toEqual(["power-attack"]);
    });

    it("stores the grip and off-hand weapon", () => {
      let doc = addSavedRoll(twoWeaponDoc(), { kind: "melee" }, "TWF");
      const id = doc.build.savedRolls![0]!.id;
      doc = setSavedRollTwf(doc, id, { offHand: "one-handed", offHandWeapon: "Shortsword" });
      expect(doc.build.savedRolls![0]!.twf).toEqual({
        offHand: "one-handed",
        offHandWeapon: "Shortsword",
      });
    });
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

describe("resolveSavedRoll — copyable roll formulas (issue #96)", () => {
  it("emits a pasteable d20 formula for a flat stat", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "save", save: "fort" }, "Fort Save");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.formula).toBe(`1d20 + ${sheet.saves.fort.total}`);
  });

  it("emits one line per attack in an iterative sequence", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "melee" }, "Melee");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    // Fighter 8 -> +8/+3.
    expect(resolved.display).toBe("+8/+3");
    expect(resolved.formula).toBe("1d20 + 8\n1d20 + 3");
  });

  it("gives the off-hand line its own formula", () => {
    const sheet = compute(fresh(), ref);
    let doc = addSavedRoll(fresh(), { kind: "melee" }, "Two-weapon");
    const id = doc.build.savedRolls![0]!.id;
    doc = setSavedRollTwf(doc, id, { offHand: "light" });
    // No feats: -4 primary (+8/+3 -> +4/-1), -8 off-hand (+8 -> 0).
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet, new Set());
    expect(resolved.formula).toBe("1d20 + 4\n1d20 - 1");
    expect(resolved.offHandFormula).toBe("1d20");
  });

  it("formats weapon damage as dice + bonus", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Longsword" }, "Longsword");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.damage!.formula).toBe(
      sheet.attacks[0]!.damageBonus.total === 0
        ? "1d8"
        : `1d8 + ${sheet.attacks[0]!.damageBonus.total}`,
    );
  });

  it("has no formula for CMD — a static defense, never rolled", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "cmd" }, "CMD");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.formula).toBeUndefined();
  });

  it("has no formula when the source no longer resolves", () => {
    const sheet = compute(fresh(), ref);
    const doc = addSavedRoll(fresh(), { kind: "weapon", weaponName: "Gone" }, "Gone");
    const resolved = resolveSavedRoll(doc.build.savedRolls![0]!, sheet);
    expect(resolved.missing).toBe(true);
    expect(resolved.formula).toBeUndefined();
  });
});
