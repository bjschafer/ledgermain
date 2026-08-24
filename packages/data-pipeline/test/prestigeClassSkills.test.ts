/**
 * The prestige-class chassis correction (`src/transform/prestigeClassSkills.ts`):
 * the archetype module's `system.classSkills` arrays drop Sense Motive from
 * most classes, Sleight of Hand from many, invent a Craft on classes that have
 * none, and truncate a few lists outright, so the pinned prose catalog's own
 * "Class Skills" sentence wins.
 *
 * Expected values below are the published lists, spot-checked against
 * aonprd.com rather than against the catalog this parses (which would only
 * restate the parser's own input).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { parseClassSkillSentence } from "../src/transform/prestigeClassSkills.js";

const ref = loadRefData();

function classByName(name: string) {
  const cls = Object.values(ref.classes).find((c) => c.name === name);
  if (!cls) throw new Error(`class not found: ${name}`);
  return cls;
}

describe("parseClassSkillSentence", () => {
  it("reads both the linked and the bare skill names in one sentence", () => {
    const ids = parseClassSkillSentence(
      "The Example's class skills are ‹skill/Bluff› (Cha), ‹skill/Climb› (Str), " +
        "Sense Motive (Wis), and Sleight of Hand (Dex).",
    );
    expect(ids).toEqual(["blf", "clm", "sen", "slt"]);
  });

  it("expands Knowledge (all) to all ten Knowledge skills", () => {
    const ids = parseClassSkillSentence(
      "The Example's class skills are ‹skill/Knowledge (all)› (Int), ‹skill/Spellcraft› (Int).",
    );
    expect(ids).toEqual([
      "kar",
      "kdu",
      "ken",
      "kge",
      "khi",
      "klo",
      "kna",
      "kno",
      "kpl",
      "kre",
      "spl",
    ]);
  });

  it("strips the catalog's link-stem marker off a parameterized skill", () => {
    expect(
      parseClassSkillSentence("class skills are ‹skill/Perform« (oratory)› (Cha), Ride (Dex)"),
    ).toEqual(["prf", "rid"]);
  });

  it("treats the 3.5 spelling of Knowledge (nobility and royalty) as one skill", () => {
    expect(
      parseClassSkillSentence(
        "class skills are Knowledge (nobility and royalty) (Int), Ride (Dex)",
      ),
    ).toEqual(["kno", "rid"]);
  });

  it("refuses a sentence whose Knowledge mention names no field", () => {
    expect(
      parseClassSkillSentence("class skills are Knowledge (Int), Ride (Dex), Swim (Str)"),
    ).toBe(null);
  });

  it("refuses a sentence it can't find at all", () => {
    expect(parseClassSkillSentence("The Example's hit die is d8.")).toBe(null);
  });
});

describe("corrected prestige class skills", () => {
  // Inner Sea Magic p. 46: Diplomacy, Linguistics, Sense Motive, Use Magic Device.
  it("restores the Sense Motive the module dropped (Arclord of Nex)", () => {
    expect(classByName("Arclord of Nex").classSkills).toEqual(["dip", "lin", "sen", "umd"]);
  });

  // Ultimate Combat p. 61: Acrobatics, Climb, Intimidate, Perception, Sense Motive.
  it("restores it on Stalwart Defender too", () => {
    expect(classByName("Stalwart Defender").classSkills).toEqual([
      "acr",
      "clm",
      "int",
      "per",
      "sen",
    ]);
  });

  // Ultimate Intrigue p. 174: no Craft on the master spy's list, but Sleight
  // of Hand and Sense Motive both belong to it.
  it("restores Sleight of Hand as well (Master Spy)", () => {
    const skills = classByName("Master Spy").classSkills;
    expect(skills).toContain("slt");
    expect(skills).toContain("sen");
    expect(skills).not.toContain("crf");
  });

  // Pathfinder #45 p. 71: Bluff, Heal, Intimidate, Knowledge (arcana, history,
  // religion), Linguistics, Spellcraft, Use Magic Device. No Craft.
  it("drops a Craft the published list never granted (Agent of the Grave)", () => {
    expect(classByName("Agent of the Grave").classSkills).toEqual([
      "blf",
      "hea",
      "int",
      "kar",
      "khi",
      "kre",
      "lin",
      "spl",
      "umd",
    ]);
  });

  // Inner Sea Intrigue p. 24 — the module's list stopped after five entries.
  it("completes a truncated list (Lion Blade)", () => {
    expect(classByName("Lion Blade").classSkills).toEqual([
      "acr",
      "blf",
      "clm",
      "dev",
      "dip",
      "dis",
      "int",
      "klo",
      "kno",
      "lin",
      "per",
      "prf",
      "sen",
      "slt",
      "ste",
    ]);
  });

  it("corrects the one hit die the module got wrong (Lion Blade, d8)", () => {
    expect(classByName("Lion Blade").hd).toBe(8);
  });

  it("leaves the hand-authored CRB classes alone", () => {
    // Core Rulebook p. 376 — hand-authored, and already correct.
    expect(classByName("Duelist").classSkills).toEqual(["acr", "blf", "esc", "per", "prf", "sen"]);
  });

  it("gives Sense Motive to most of the catalog, as the published lists do", () => {
    const prestige = Object.values(ref.classes).filter((c) => c.subType === "prestige");
    const withSenseMotive = prestige.filter((c) => c.classSkills.includes("sen"));
    // 7 before the correction pass, out of 119.
    expect(withSenseMotive.length).toBeGreaterThan(70);
  });
});
