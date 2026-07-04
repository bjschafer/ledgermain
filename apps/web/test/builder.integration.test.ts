import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { addClass, createEmptyDoc, setAbility, setRace, setSkillRank } from "../src/model/doc.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/**
 * Stage 3 success criterion: drive the pure builder model end-to-end to construct
 * a level-1 human fighter, then assert `compute()` produces the expected sheet.
 * No DOM — this proves the builder→CharacterDoc→compute data flow at the model
 * level (the React layer is a thin view over exactly these transitions).
 */
describe("build a level-1 human fighter (model -> compute)", () => {
  let doc = createEmptyDoc("itest");
  doc = setRace(doc, raceId("Human"));
  doc = addClass(doc, "fighter");
  doc = setAbility(doc, "str", 16);
  doc = setAbility(doc, "dex", 14);
  doc = setAbility(doc, "con", 14);
  doc = setAbility(doc, "int", 10);
  doc = setAbility(doc, "wis", 12);
  doc = setAbility(doc, "cha", 8);
  doc = setSkillRank(doc, "clm", 1);
  doc = setSkillRank(doc, "swm", 1);

  it("recorded the build choices on the document", () => {
    expect(doc.identity.classes).toEqual([{ tag: "fighter", level: 1 }]);
    expect(doc.identity.favoredClass).toBe("fighter");
    expect(doc.build.skillRanks).toEqual({ clm: 1, swm: 1 });
  });

  const sheet = compute(doc, ref);

  it("ability modifiers (Str +3, Con +2, Cha -1)", () => {
    expect(sheet.abilities.str.mod).toBe(3);
    expect(sheet.abilities.con.mod).toBe(2);
    expect(sheet.abilities.cha.mod).toBe(-1);
  });

  it("BAB +1 (fighter high progression)", () => {
    expect(sheet.bab).toBe(1);
  });

  it("saves: Fort +4 (good + Con), Ref +2, Will +1", () => {
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(2);
    expect(sheet.saves.will.total).toBe(1);
  });

  it("AC 12 / touch 12 / flat-footed 10 (unarmored)", () => {
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.touch).toBe(12);
    expect(sheet.ac.flatFooted).toBe(10);
  });

  it("HP 12 (max d10 + Con)", () => {
    expect(sheet.hp.max).toBe(12);
  });

  it("CMB +4, CMD 16; attacks melee +4 / ranged +3; init +2", () => {
    expect(sheet.cmb).toBe(4);
    expect(sheet.cmd).toBe(16);
    expect(sheet.attack.melee.total).toBe(4);
    expect(sheet.attack.ranged.total).toBe(3);
    expect(sheet.initiative.total).toBe(2);
  });

  it("class skills earn the +3 class-skill bonus when ranked", () => {
    expect(sheet.skills.clm!.classSkill).toBe(true);
    expect(sheet.skills.clm!.total).toBe(7); // 1 rank + Str 3 + 3 class
    expect(sheet.skills.swm!.total).toBe(7);
  });
});
