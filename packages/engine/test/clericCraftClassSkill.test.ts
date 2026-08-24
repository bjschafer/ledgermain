/**
 * Hand-computed fixture for Craft as a cleric class skill (CRB p. 40). The
 * pinned Foundry cleric doc is the only base class whose `system.classSkills`
 * omits `crf`, so the +3 trained bonus is restored by the
 * `SUPPLEMENTAL_CLASS_SKILLS` data-pipeline supplement
 * (packages/data-pipeline/src/supplements.ts) rather than by the engine.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Human cleric L1, all abilities 10 (mod 0), no gear. */
function makeDoc(skillRanks: Record<string, number>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "cleric-craft-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "cleric", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks,
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("cleric Craft class skill", () => {
  it("lists crf among the cleric's class skills", () => {
    const cleric = Object.values(ref.classes).find((c) => c.tag === "cleric");
    expect(cleric?.classSkills).toContain("crf");
  });

  it("gives a ranked Craft subskill the +3 trained bonus", () => {
    const sheet = compute(makeDoc({ "crf.weapons": 1 }), ref);
    const craft = sheet.skills["crf.weapons"];
    // 1 rank + 0 Int + 3 class skill = 4.
    expect(craft?.classSkill).toBe(true);
    expect(craft?.classSkillBonus).toBe(3);
    expect(craft?.total).toBe(4);
  });

  it("still withholds it from a skill the cleric doesn't have", () => {
    const sheet = compute(makeDoc({ acr: 1 }), ref);
    expect(sheet.skills.acr?.classSkill).toBe(false);
    expect(sheet.skills.acr?.total).toBe(1);
  });
});
