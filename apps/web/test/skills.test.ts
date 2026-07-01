/**
 * Unit tests for the skill-point budget (`model/skills.ts:skillBudget`),
 * including the GM-grant skill-rank addend.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { skillBudget } from "../src/model/skills.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  race?: string;
  skillRanks?: Record<string, number>;
  gmSkillRanks?: number;
  int?: number;
}): CharacterDoc {
  return {
    schemaVersion: 2,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Human"),
      classes: over.classes,
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      // Int 10 → +0 mod by default; override to drive the per-level grant.
      int: over.int ?? 10,
      wis: 10,
      cha: 10,
    },
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      gmGrants: over.gmSkillRanks != null ? { skillRanks: over.gmSkillRanks } : undefined,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("skillBudget: base progression (no GM grant)", () => {
  // Elf has no bonus-skill-rank racial, so totals are clean class+Int only.
  // Wizard skillsPerLevel = 2.
  it("level 1 Elf wizard, Int 10 → 2 skill points", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    const b = skillBudget(doc, ref, 0);
    expect(b.total).toBe(2);
    expect(b.spent).toBe(0);
    expect(b.remaining).toBe(2);
  });

  it("level 1 Elf wizard, Int 12 (+1) → 3 skill points", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      int: 12,
    });
    expect(skillBudget(doc, ref, 1).total).toBe(3);
  });

  it("floor of 1 rank per level even with negative Int", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      int: 5,
    });
    expect(skillBudget(doc, ref, -3).total).toBe(1);
  });

  it("Human racial +1/level bonus is included in the total", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Human" });
    // wizard 2 + Int 0 = 2, + Human +1 = 3
    expect(skillBudget(doc, ref, 0).total).toBe(3);
  });

  it("spent counts the ranks the player has assigned", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 2 }],
      race: "Elf",
      skillRanks: { per: 2, acr: 1 },
    });
    const b = skillBudget(doc, ref, 0);
    expect(b.spent).toBe(3);
  });
});

describe("skillBudget: GM-grant skill-rank addend", () => {
  it("adds a positive grant to the total", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    const granted = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      gmSkillRanks: 4,
    });
    expect(skillBudget(base, ref, 0).total).toBe(2);
    expect(skillBudget(granted, ref, 0).total).toBe(6);
  });

  it("does not change spent", () => {
    const granted = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      gmSkillRanks: 4,
      skillRanks: { per: 1 },
    });
    const b = skillBudget(granted, ref, 0);
    expect(b.spent).toBe(1);
    expect(b.remaining).toBe(5);
  });

  it("a negative grant (claw-back) reduces the total", () => {
    const granted = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      gmSkillRanks: -2,
    });
    expect(skillBudget(granted, ref, 0).total).toBe(0);
  });

  it("an absent gmGrants object behaves as 0 (back-compat)", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    expect(doc.build.gmGrants).toBeUndefined();
    expect(skillBudget(doc, ref, 0).total).toBe(2);
  });

  it("a gmGrants object with no skillRanks key behaves as 0", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    const withEmpty: CharacterDoc = {
      ...doc,
      build: { ...doc.build, gmGrants: { featSlots: 1 } },
    };
    expect(skillBudget(withEmpty, ref, 0).total).toBe(2);
  });
});
