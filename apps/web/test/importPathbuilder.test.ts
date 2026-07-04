/**
 * Unit tests for `model/importPathbuilder.ts`. Since no confirmed sample of a
 * real Pathbuilder 1e export was available (see that module's doc comment),
 * these fixtures exercise the defensive `FIELD_PATHS` table against a few
 * plausible shapes (bare top-level keys, a `build`-wrapped shape mirroring
 * Pathbuilder 2e, classes as an array vs. an object map, skills as an object
 * map vs. an array) rather than asserting against one "true" shape.
 */
import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import { describe, expect, it } from "bun:test";

import {
  importPathbuilderJson,
  pathbuilderJsonToIntermediate,
} from "../src/model/importPathbuilder.js";

const ref = loadRefData();

describe("pathbuilderJsonToIntermediate", () => {
  it("reads a minimal, bare-top-level-keys shape", () => {
    const data = pathbuilderJsonToIntermediate({
      name: "Grombar",
      race: "Human",
      classes: [{ name: "Fighter", level: 3 }],
      abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 10, cha: 8 },
    });
    expect(data.name).toBe("Grombar");
    expect(data.race).toBe("Human");
    expect(data.classes).toEqual([{ name: "Fighter", level: 3 }]);
    expect(data.abilities.str).toBe(18);
  });

  it("reads a build-wrapped shape (mirrors Pathbuilder 2e's nesting)", () => {
    const data = pathbuilderJsonToIntermediate({
      build: {
        name: "Sariel",
        race: "Elf",
        level: 5,
        class: "Wizard",
        abilities: {
          strength: 8,
          dexterity: 16,
          constitution: 12,
          intelligence: 20,
          wisdom: 12,
          charisma: 10,
        },
      },
    });
    expect(data.name).toBe("Sariel");
    expect(data.race).toBe("Elf");
    expect(data.classes).toEqual([{ name: "Wizard", level: 5 }]);
    expect(data.abilities.int).toBe(20);
  });

  it("reads classes as an object map of name -> level", () => {
    const data = pathbuilderJsonToIntermediate({ classes: { Fighter: 3, Rogue: 2 } });
    expect(data.classes).toEqual(
      expect.arrayContaining([
        { name: "Fighter", level: 3 },
        { name: "Rogue", level: 2 },
      ]),
    );
  });

  it("reads skills as an object map, an array, and with nested {ranks}", () => {
    const asMap = pathbuilderJsonToIntermediate({ skills: { Acrobatics: 5 } });
    expect(asMap.skills).toEqual([{ name: "Acrobatics", ranks: 5 }]);

    const asArray = pathbuilderJsonToIntermediate({ skills: [{ name: "Stealth", ranks: 4 }] });
    expect(asArray.skills).toEqual([{ name: "Stealth", ranks: 4 }]);

    const nested = pathbuilderJsonToIntermediate({ skills: { Perception: { ranks: 6 } } });
    expect(nested.skills).toEqual([{ name: "Perception", ranks: 6 }]);
  });

  it("reads feats and languages as arrays of strings or {name} objects", () => {
    const data = pathbuilderJsonToIntermediate({
      feats: ["Power Attack", { name: "Cleave" }],
      languages: ["Common", "Elven"],
    });
    expect(data.feats).toEqual(["Power Attack", "Cleave"]);
    expect(data.languages).toEqual(["Common", "Elven"]);
  });

  it("reads gear as strings or {name, quantity} objects", () => {
    const data = pathbuilderJsonToIntermediate({
      gear: ["Backpack", { name: "Arrows", quantity: 20 }],
    });
    expect(data.gear).toEqual([{ name: "Backpack" }, { name: "Arrows", quantity: 20 }]);
  });

  it("reads money under either denomination-code or full-name keys", () => {
    const data = pathbuilderJsonToIntermediate({ money: { gold: 35, silver: 2 } });
    expect(data.money).toEqual({ gp: 35, sp: 2 });
  });

  it("throws on a JSON export that isn't even an object", () => {
    expect(() => pathbuilderJsonToIntermediate([1, 2, 3])).toThrow();
    expect(() => pathbuilderJsonToIntermediate("just a string")).toThrow();
    expect(() => pathbuilderJsonToIntermediate(42)).toThrow();
    expect(() => pathbuilderJsonToIntermediate(null)).toThrow();
  });

  it("returns all-empty fields for an empty object rather than throwing", () => {
    const data = pathbuilderJsonToIntermediate({});
    expect(data.classes).toEqual([]);
    expect(data.feats).toEqual([]);
    expect(data.name).toBeUndefined();
  });
});

describe("importPathbuilderJson", () => {
  it("produces a compute()-safe doc and a report for a fuller fixture", () => {
    const raw = {
      name: "Grombar",
      race: "Human",
      alignment: "CE",
      classes: [{ name: "Fighter", level: 3 }],
      abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 10, cha: 8 },
      feats: ["Power Attack", "Not A Real Feat"],
      skills: { Intimidate: 3 },
      languages: ["Common"],
      gear: ["Cloak of Resistance +3", "Bag of Holding Prop"],
      money: { gp: 12 },
    };
    const { doc, report } = importPathbuilderJson(raw, ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(doc.identity.classes).toEqual([{ tag: "fighter", level: 3 }]);
    expect(report.mapped.length).toBeGreaterThan(0);
    expect(report.unmapped.some((l) => l.includes("Not A Real Feat"))).toBe(true);
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
