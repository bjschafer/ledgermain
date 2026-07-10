import { describe, expect, it } from "bun:test";

import { compute, deriveResourcePools } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import {
  addClass,
  createEmptyDoc,
  setClassLevel,
  setName,
  setRace,
  toggleFeat,
  toggleKnownSpell,
} from "../src/model/doc.js";
import { prepareSpell, setExpendedAt } from "../src/model/preparedSpells.js";
import { buildPrintSheet } from "../src/model/printSheet.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

describe("buildPrintSheet — header", () => {
  it("carries name/race/class/level", () => {
    let doc = createEmptyDoc("t");
    doc = setName(doc, "Thalia Stormrider");
    doc = setRace(doc, raceId("Human"));
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 5);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.header.name).toBe("Thalia Stormrider");
    expect(data.header.raceName).toBe("Human");
    expect(data.header.classLine).toBe("Fighter 5");
    expect(data.header.level).toBe(5);
  });

  it("falls back to 'Unnamed' for a blank name", () => {
    const doc = setName(createEmptyDoc("t"), "");
    const sheet = compute(doc, ref);
    expect(buildPrintSheet(doc, sheet, ref).header.name).toBe("Unnamed");
  });
});

describe("buildPrintSheet — abilities/saves/AC", () => {
  it("matches the computed sheet's numbers", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 4);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.abilities.find((a) => a.id === "str")?.total).toBe(sheet.abilities.str.total);
    expect(data.saves.find((s) => s.label === "Fortitude")?.total).toBe(
      sheet.saves.fort.total >= 0 ? `+${sheet.saves.fort.total}` : `${sheet.saves.fort.total}`,
    );
    expect(data.ac.normal).toBe(sheet.ac.normal);
    expect(data.ac.cmd).toBe(sheet.cmd);
  });
});

describe("buildPrintSheet — feats", () => {
  it("lists a chosen feat by name", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 1);
    const toughness = featId("Toughness");
    doc = toggleFeat(doc, toughness);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.feats.some((f) => f.name === "Toughness")).toBe(true);
  });
});

describe("buildPrintSheet — class features", () => {
  it("includes a barbarian's 1st-level Rage", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "barbarian");
    doc = setClassLevel(doc, "barbarian", 1);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.classFeatures.some((f) => f.name === "Rage" && f.level === 1)).toBe(true);
  });
});

describe("buildPrintSheet — resources", () => {
  it("matches deriveResourcePools for a raging barbarian", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "barbarian");
    doc = setClassLevel(doc, "barbarian", 4);
    const sheet = compute(doc, ref);
    const derived = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = derived.find((p) => p.name === "Rage");
    expect(rage).toBeDefined();

    const data = buildPrintSheet(doc, sheet, ref);
    const printed = data.resources.find((r) => r.id === rage!.id);
    expect(printed).toBeDefined();
    expect(printed!.max).toBe(rage!.max);
    expect(printed!.remaining).toBe(rage!.max);
    expect(printed!.used).toBe(0);
  });

  it("reflects manually-spent uses from doc.live.resources", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "barbarian");
    doc = setClassLevel(doc, "barbarian", 4);
    const sheet = compute(doc, ref);
    const derived = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = derived.find((p) => p.name === "Rage")!;
    doc = { ...doc, live: { ...doc.live, resources: { [rage.id]: { used: 2, max: rage.max } } } };

    const data = buildPrintSheet(doc, compute(doc, ref), ref);
    const printed = data.resources.find((r) => r.id === rage.id)!;
    expect(printed.used).toBe(2);
    expect(printed.remaining).toBe(rage.max - 2);
  });
});

describe("buildPrintSheet — prepared caster (wizard)", () => {
  it("lists granted cantrips as ready and a prepared spell in its level bucket", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "wizard");
    doc = setClassLevel(doc, "wizard", 3);
    const level1SpellId = ref.spellLists["wizard"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, level1SpellId, "wizard");
    doc = prepareSpell(doc, level1SpellId);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    const wiz = data.casters.find((c) => c.classTag === "wizard");
    expect(wiz).toBeDefined();
    expect(wiz!.preparation).toBe("prepared");
    const cantrips = wiz!.levels.find((l) => l.level === 0);
    expect(cantrips?.spells.length).toBeGreaterThan(0);
    expect(cantrips?.spells.every((s) => s.ready)).toBe(true);

    const level1 = wiz!.levels.find((l) => l.level === 1);
    const spellName = ref.spells[level1SpellId]!.name;
    expect(level1?.spells.some((s) => s.name === spellName && s.ready)).toBe(true);
  });

  it("marks an expended prepared spell as not ready", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "wizard");
    doc = setClassLevel(doc, "wizard", 3);
    const level1SpellId = ref.spellLists["wizard"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, level1SpellId, "wizard");
    doc = prepareSpell(doc, level1SpellId);
    doc = setExpendedAt(doc, 0, true);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    const wiz = data.casters.find((c) => c.classTag === "wizard")!;
    const level1 = wiz.levels.find((l) => l.level === 1)!;
    const spellName = ref.spells[level1SpellId]!.name;
    expect(level1.spells.find((s) => s.name === spellName)?.ready).toBe(false);
  });
});

describe("buildPrintSheet — spontaneous caster (sorcerer)", () => {
  it("lists known spells as always ready", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "sorcerer");
    doc = setClassLevel(doc, "sorcerer", 3);
    const level1SpellId = ref.spellLists["sorcerer"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, level1SpellId, "sorcerer");
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    const sorc = data.casters.find((c) => c.classTag === "sorcerer");
    expect(sorc).toBeDefined();
    expect(sorc!.preparation).toBe("spontaneous");
    const spellName = ref.spells[level1SpellId]!.name;
    const level1 = sorc!.levels.find((l) => l.level === 1);
    expect(level1?.spells.some((s) => s.name === spellName && s.ready)).toBe(true);
  });
});
