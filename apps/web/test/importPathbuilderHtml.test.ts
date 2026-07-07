/**
 * Unit + fixture tests for `model/importPathbuilderHtml.ts` — the Pathbuilder
 * 1e HTML stat-block importer (issue #3), run against the owner's real
 * export sample (`test/fixtures/pathbuilder-statblock-c1-orcAlchemist.html`,
 * an Orc Fighter 4 / Alchemist 8) and against the real vendored RefData
 * slice, same pattern as `externalImport.test.ts`.
 */
import { readFileSync } from "node:fs";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import { describe, expect, it } from "bun:test";

import {
  importPathbuilderHtml,
  isPathbuilderStatBlockHtml,
  pathbuilderHtmlToIntermediate,
} from "../src/model/importPathbuilderHtml.js";

const ref = loadRefData();

const fixtureHtml = readFileSync(
  new URL("./fixtures/pathbuilder-statblock-c1-orcAlchemist.html", import.meta.url),
  "utf8",
);

describe("isPathbuilderStatBlockHtml", () => {
  it("recognizes the fixture", () => {
    expect(isPathbuilderStatBlockHtml(fixtureHtml)).toBe(true);
  });

  it("rejects unrelated HTML and JSON", () => {
    expect(isPathbuilderStatBlockHtml("<html><body>hi</body></html>")).toBe(false);
    expect(isPathbuilderStatBlockHtml('{"name":"Grombar"}')).toBe(false);
  });
});

describe("pathbuilderHtmlToIntermediate", () => {
  it("extracts name, alignment, race, and multiclass levels", () => {
    const { data } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(data.name).toBe("C1-ORCALCHEMIST");
    expect(data.alignment).toBe("Neutral");
    expect(data.race).toBe("Orc");
    expect(data.classes).toEqual([
      { name: "Fighter", level: 4 },
      { name: "Alchemist", level: 8 },
    ]);
  });

  it("extracts final (pre-back-out) ability scores", () => {
    const { data } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(data.abilities).toEqual({ str: 16, dex: 18, con: 14, int: 20, wis: 10, cha: 8 });
  });

  it("extracts all 11 feats, splitting the 'Weapon Focus: Falchion' choice suffix", () => {
    const { data, extras } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(data.feats).toEqual([
      "Armor Focus",
      "Brew Potion",
      "Cleave",
      "Dodge",
      "Great Cleave",
      "Point-Blank Shot",
      "Power Attack",
      "Precise Shot",
      "Rapid Shot",
      "Throw Anything",
      "Weapon Focus",
    ]);
    expect(data.feats.length).toBe(11);
    expect(extras.featChoices).toEqual([{ feat: "Weapon Focus", choice: "Falchion" }]);
  });

  it("extracts spell names per level from the Alchemist spells-prepared block", () => {
    const { extras } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(extras.spellcasting).toHaveLength(1);
    const [block] = extras.spellcasting;
    expect(block!.className).toBe("Alchemist");
    expect(block!.levels.map((l) => l.label)).toEqual([
      "3rd (3/day)",
      "2nd (5/day)",
      "1st (6/day)",
    ]);
    expect(block!.levels[0]!.spellNames).toEqual([
      "Haste",
      "Lightning Lash Bomb Admixture",
      "Thorn Body",
    ]);
    expect(block!.levels[1]!.spellNames).toEqual([
      "Barkskin",
      "Cat's Grace",
      "Invisibility",
      "Ironskin",
      "See Invisibility",
    ]);
    expect(block!.levels[2]!.spellNames).toEqual([
      "Blend",
      "Bomber's Eye",
      "Enlarge Person",
      "Invisibility Alarm",
      "Targeted Bomb Admixture",
      "True Strike",
    ]);
  });

  it("extracts skill totals only (no ranks) and SQ/discoveries as free text", () => {
    const { extras } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(extras.skillTotals).toEqual([
      { name: "Craft (a)", total: 20 },
      { name: "Knowledge (arcana)", total: 20 },
      { name: "Perception", total: 15 },
      { name: "Profession (a)", total: 15 },
      { name: "Spellcraft", total: 20 },
      { name: "Survival", total: 9 },
    ]);
    expect(extras.specialQualities).toContain("Alchemy");
    expect(extras.discoveries).toEqual([
      "Acid Bomb",
      "Precise Bombs",
      "Sand Bomb",
      "Spontaneous Healing",
    ]);
    // The source sheet's first SQ anchor (Weapon Training) has no visible text.
    expect(extras.hasUnlabeledSpecialQuality).toBe(true);
  });

  it("reports an empty Equipment section and source combat stats", () => {
    const { extras } = pathbuilderHtmlToIntermediate(fixtureHtml);
    expect(extras.equipmentText).toBe("");
    expect(extras.sourceStats).toEqual({
      ac: 21,
      touch: 15,
      flatFooted: 16,
      hp: 85,
      fort: 12,
      ref: 11,
      will: 3,
      bab: 10,
      cmb: 13,
      cmd: 28,
      init: 4,
      perception: 15,
    });
  });
});

describe("importPathbuilderHtml", () => {
  it("builds a doc from the fixture, matching Fighter but not Alchemist", () => {
    const { doc, report } = importPathbuilderHtml(fixtureHtml, ref);

    expect(doc.identity.name).toBe("C1-ORCALCHEMIST");
    expect(doc.identity.alignment).toBe("N");
    const raceId = Object.entries(ref.races).find(([, r]) => r.name === "Orc")![0];
    expect(doc.identity.race).toBe(raceId);
    expect(doc.identity.classes).toEqual([{ tag: "fighter", level: 4 }]);

    expect(report.unmapped.some((l) => l.includes('Class "Alchemist" (level 8)'))).toBe(true);
    expect(report.mapped.some((l) => l.includes('Class: "Fighter"'))).toBe(true);

    // 10 of the 11 feats are in the vendored slice; "Armor Focus" isn't.
    expect(doc.build.feats.length).toBe(10);
    expect(report.unmapped.some((l) => l.includes('Feat "Armor Focus"'))).toBe(true);
    expect(
      report.unmapped.some(
        (l) => l.includes('Feat choice "Falchion"') && l.includes("Weapon Focus"),
      ),
    ).toBe(true);

    expect(() => compute(doc, ref)).not.toThrow();
  });

  it("backs out Orc's racial ability modifiers from the source sheet's final scores", () => {
    const { doc, report } = importPathbuilderHtml(fixtureHtml, ref);
    // Source sheet: Str 16, Dex 18, Con 14, Int 20, Wis 10, Cha 8.
    // Orc: Str +4, Int -2, Wis -2, Cha -2 racial.
    expect(doc.abilities).toEqual({ str: 12, dex: 18, con: 14, int: 22, wis: 12, cha: 10 });
    expect(report.mapped.some((l) => l.includes("backed out Orc's racial modifiers"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("level-based ability increases"))).toBe(true);
  });

  it("flags the skills, equipment, SQ/discoveries, and spell caveats in the warnings", () => {
    const { report } = importPathbuilderHtml(fixtureHtml, ref);
    expect(report.unmapped.some((l) => l.includes('Skill "Craft (a)"') && l.includes("+20"))).toBe(
      true,
    );
    expect(report.unmapped.some((l) => l.includes("Equipment section was empty"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("special qualities"))).toBe(true);
    expect(
      report.unmapped.some(
        (l) => l.includes('spells under "Alchemist spells"') && l.includes("Haste"),
      ),
    ).toBe(true);
    expect(
      report.unmapped.some((l) => l.includes("Source sheet reported") && l.includes("AC 21")),
    ).toBe(true);
  });

  it("never throws on compute() for the fixture", () => {
    const { doc } = importPathbuilderHtml(fixtureHtml, ref);
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
