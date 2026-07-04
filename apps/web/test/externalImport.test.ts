/**
 * Unit tests for `model/externalImport.ts` — the shared name-matching +
 * `ExternalCharacterData` -> `CharacterDoc` mapping used by both the
 * Pathbuilder and Hero Lab importers (issue #3). Runs against the real
 * vendored RefData slice (same pattern as `test/languages.test.ts`) so
 * matches are against actual race/feat/item names, not hand-rolled fixtures.
 */
import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import { describe, expect, it } from "bun:test";

import {
  buildDocFromExternalData,
  emptyExternalData,
  matchAbilityId,
  matchSkillId,
} from "../src/model/externalImport.js";

const ref = loadRefData();

describe("matchSkillId", () => {
  it("matches a plain skill name case-insensitively", () => {
    expect(matchSkillId("Acrobatics")).toBe("acr");
    expect(matchSkillId("acrobatics")).toBe("acr");
  });

  it("matches a Knowledge subtype by its full parenthetical name", () => {
    expect(matchSkillId("Knowledge (Arcana)")).toBe("kar");
    expect(matchSkillId("Knowledge (nature)")).toBe("kna");
  });

  it("builds a parameterized Craft/Profession/Perform id from the parenthetical", () => {
    expect(matchSkillId("Craft (Alchemy)")).toBe("crf.alchemy");
    expect(matchSkillId("Perform (Oratory)")).toBe("prf.oratory");
  });

  it("returns undefined for an unrecognized name", () => {
    expect(matchSkillId("Interpretive Dance")).toBeUndefined();
  });
});

describe("matchAbilityId", () => {
  it("matches abbreviations and full names, case-insensitively", () => {
    expect(matchAbilityId("STR")).toBe("str");
    expect(matchAbilityId("strength")).toBe("str");
    expect(matchAbilityId("Charisma")).toBe("cha");
  });

  it("returns undefined for garbage", () => {
    expect(matchAbilityId("luck")).toBeUndefined();
  });
});

describe("buildDocFromExternalData", () => {
  it("maps a fully-recognized character and reports nothing unmapped", () => {
    const data = emptyExternalData();
    data.name = "Grombar";
    data.race = "Human";
    data.alignment = "Chaotic Evil";
    data.classes = [{ name: "Fighter", level: 3 }];
    data.abilities = { str: 18, dex: 14 };
    data.feats = ["Power Attack"];
    data.skills = [{ name: "Intimidate", ranks: 3 }];
    data.languages = ["Common", "Orc"];
    data.gear = [{ name: "Cloak of Resistance +3" }];
    data.money = { gp: 35 };

    const { doc, report } = buildDocFromExternalData(data, ref, "pathbuilder");

    expect(doc.identity.name).toBe("Grombar");
    expect(doc.identity.alignment).toBe("CE");
    expect(doc.identity.classes).toEqual([{ tag: "fighter", level: 3 }]);
    expect(doc.abilities.str).toBe(18);
    expect(doc.abilities.dex).toBe(14);
    expect(doc.build.skillRanks.int).toBe(3); // "int" = Intimidate skill id, not the ability
    expect(doc.build.bonusLanguages).toEqual(["Common", "Orc"]);
    expect(doc.live.money?.gp).toBe(35);

    const raceId = Object.entries(ref.races).find(([, r]) => r.name === "Human")![0];
    expect(doc.identity.race).toBe(raceId);
    const featId = Object.entries(ref.feats).find(([, f]) => f.name === "Power Attack")![0];
    expect(doc.build.feats).toEqual([featId]);
    expect(doc.build.gear.some((g) => g.itemId != null)).toBe(true);

    expect(report.unmapped).toEqual([]);
    expect(report.mapped.length).toBeGreaterThan(0);

    // Round-trip sanity: an imported doc must never crash compute().
    expect(() => compute(doc, ref)).not.toThrow();
  });

  it("reports unrecognized race/class/feat/skill/gear names without fabricating anything", () => {
    const data = emptyExternalData();
    data.race = "Definitely Not A Real Race";
    data.classes = [{ name: "Not A Class", level: 4 }];
    data.feats = ["Not A Feat"];
    data.skills = [{ name: "Not A Skill", ranks: 2 }];
    data.gear = [{ name: "Not A Real Item", quantity: 2 }];

    const { doc, report } = buildDocFromExternalData(data, ref, "herolab");

    expect(doc.identity.race).toBe("");
    expect(doc.identity.classes).toEqual([]);
    expect(doc.build.feats).toEqual([]);
    expect(doc.build.skillRanks["not-a-skill"]).toBeUndefined();
    // Unmatched gear is still preserved as a free-text custom entry, not dropped.
    expect(doc.build.gear.some((g) => g.name === "Not A Real Item" && g.quantity === 2)).toBe(true);

    expect(report.unmapped.length).toBe(5);
    expect(report.unmapped.some((l) => l.includes("Definitely Not A Real Race"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("Not A Class"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("Not A Feat"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("Not A Skill"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("Not A Real Item"))).toBe(true);

    expect(() => compute(doc, ref)).not.toThrow();
  });

  it("stores an unrecognized alignment as free text but flags it in the report", () => {
    const data = emptyExternalData();
    data.alignment = "Neutral-ish, kind of a jerk";
    const { doc, report } = buildDocFromExternalData(data, ref, "pathbuilder");
    expect(doc.identity.alignment).toBe("Neutral-ish, kind of a jerk");
    expect(report.unmapped.some((l) => l.includes("Neutral-ish"))).toBe(true);
  });

  it("skips zero-rank skill entries entirely (no report noise)", () => {
    const data = emptyExternalData();
    data.skills = [{ name: "Acrobatics", ranks: 0 }];
    const { doc, report } = buildDocFromExternalData(data, ref, "pathbuilder");
    expect(doc.build.skillRanks.acr).toBeUndefined();
    expect(report.mapped).toEqual([]);
    expect(report.unmapped).toEqual([]);
  });

  it("produces an empty, valid, compute()-safe doc from empty external data", () => {
    const { doc, report } = buildDocFromExternalData(emptyExternalData(), ref, "pathbuilder");
    expect(doc.schemaVersion).toBeGreaterThan(0);
    expect(report.mapped).toEqual([]);
    expect(report.unmapped).toEqual([]);
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
