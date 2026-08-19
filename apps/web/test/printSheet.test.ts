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

describe("buildPrintSheet — situational save totals", () => {
  it("prints a dwarf's Hardy line under Fortitude", () => {
    // Hardy is +2 racial vs. poison, spells, and spell-like abilities, which
    // is precisely what a printed sheet can't ask you to remember.
    let doc = createEmptyDoc("t");
    doc = setRace(doc, raceId("Dwarf"));
    doc = addClass(doc, "fighter");
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.saves.find((s) => s.label === "Fortitude")?.conditionals).toEqual([
      "+5 vs. spells/SLAs/poison",
    ]);
  });

  it("is empty for a character with nothing situational", () => {
    let doc = createEmptyDoc("t");
    doc = setRace(doc, raceId("Human"));
    doc = addClass(doc, "fighter");
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    for (const save of data.saves) expect(save.conditionals).toEqual([]);
  });
});

describe("buildPrintSheet — maneuver-scoped cmb/cmd totals", () => {
  it("formats cmb/cmd conditionals the same way save conditionals are formatted", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    const computed = compute(doc, ref);
    // No content wires `maneuverCategories` yet — synthesize the sheet-level
    // fields the way a compute() fixture eventually would, to cover the
    // print-formatting logic itself rather than any particular source.
    const sheet = {
      ...computed,
      cmbConditionals: [{ total: computed.cmb + 2, categories: ["trip"], labels: ["trip"] }],
      cmdConditionals: [
        { total: computed.cmd + 4, categories: ["bullRush"], labels: ["bull rush"] },
      ],
    };
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.cmbConditionals).toEqual([`+${computed.cmb + 2} vs. trip`]);
    expect(data.ac.cmdConditionals).toEqual([`+${computed.cmd + 4} vs. bull rush`]);
  });

  it("is empty when nothing maneuver-scoped applies", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.cmbConditionals).toEqual([]);
    expect(data.ac.cmdConditionals).toEqual([]);
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

describe("buildPrintSheet — natural attacks", () => {
  it("shares the weapon attack table, with the secondary suffix and notes folded in", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 1);
    const sheet = compute(doc, ref);
    // Grant tables are hand-authored elsewhere; this only checks buildPrintSheet's
    // own passthrough, so the fixture stands in rather than depending on a real grant.
    const withClaws = {
      ...sheet,
      naturalAttacks: [
        {
          name: "Claw",
          count: 2,
          kind: "primary" as const,
          attackBonus: 4,
          attackComponents: [],
          damageDice: "1d4",
          damageBonus: 2,
          damageComponents: [],
        },
        {
          name: "Bite",
          count: 1,
          kind: "secondary" as const,
          attackBonus: -1,
          attackComponents: [],
          damageDice: "1d6",
          damageBonus: 1,
          damageComponents: [],
          notes: ["Only while raging"],
        },
      ],
    };
    const data = buildPrintSheet(doc, withClaws, ref);

    const claw = data.attacks.find((a) => a.name === "2 claws");
    expect(claw?.attack).toBe("+4");
    expect(claw?.damage).toBe("1d4+2");
    expect(claw?.crit).toBeUndefined();

    const bite = data.attacks.find((a) => a.name === "Bite (secondary)");
    expect(bite?.attack).toBe("-1");
    expect(bite?.damage).toBe("1d6+1");
    expect(bite?.sub).toBe("Only while raging");
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

  it("prints the statblock ability-type tag a printed sheet would carry", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "monk");
    doc = setClassLevel(doc, "monk", 4);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    // Ki Pool is (Su): it stops working in an antimagic field, which is
    // exactly the kind of thing a paper sheet has to state.
    const ki = data.classFeatures.find((f) => f.name === "Ki Pool");
    expect(ki?.abilityType).toBe("(Su)");
    // Flurry of Blows is (Ex), and it keeps its numeric detail alongside the tag.
    const flurry = data.classFeatures.find((f) => f.name === "Flurry of Blows");
    expect(flurry?.abilityType).toBe("(Ex)");
    expect(flurry?.detail).toBeTruthy();
  });

  it("leaves the tag off features the dataset never typed", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "bard");
    doc = setClassLevel(doc, "bard", 1);
    const sheet = compute(doc, ref);
    const data = buildPrintSheet(doc, sheet, ref);

    expect(data.classFeatures.find((f) => f.name === "Countersong")?.abilityType).toBe("(Su)");
    // Bardic Performance itself carries no type upstream: print nothing there.
    expect(
      data.classFeatures.find((f) => f.name === "Bardic Performance")?.abilityType,
    ).toBeUndefined();
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
