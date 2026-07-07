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
  archetypes?: string[];
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
      archetypes: over.archetypes,
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

  it("spent counts parameterized Craft/Profession/Perform instances too (issue #24)", () => {
    // Two Perform instances plus a bare Craft entry — skillBudget sums every
    // key in skillRanks regardless of whether it's a plain or "base.slug" id,
    // so no special-casing was needed here for the new subskill ids.
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 2 }],
      race: "Elf",
      skillRanks: { "prf.oratory": 2, "prf.dancing": 1, crf: 1 },
    });
    const b = skillBudget(doc, ref, 0);
    expect(b.spent).toBe(4);
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

describe("skillBudget: archetype-authored bonusSkillRanks (issue #62)", () => {
  // Both Faithful Wanderer's Wanderer's Lore and Tortured Crusader's
  // Self-Sufficient double a paladin's 2 + Int skill ranks/level to 4 + Int
  // — a flat +2/level delta, granted from 1st level. Elf (no racial
  // bonusSkillRanks) isolates the archetype delta from the racial one.
  it("Faithful Wanderer paladin 1, Int 10 -> base 2 + archetype delta 2 = 4", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 1 }],
      race: "Elf",
      archetypes: ["paladin:faithful-wanderer"],
    });
    expect(skillBudget(doc, ref, 0).total).toBe(4);
  });

  it("Faithful Wanderer paladin 5, Int 10 -> base 10 + archetype delta 10 = 20", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 5 }],
      race: "Elf",
      archetypes: ["paladin:faithful-wanderer"],
    });
    expect(skillBudget(doc, ref, 0).total).toBe(20);
  });

  it("Tortured Crusader paladin 1, Int 10 -> base 2 + archetype delta 2 = 4", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 1 }],
      race: "Elf",
      archetypes: ["paladin:tortured-crusader"],
    });
    expect(skillBudget(doc, ref, 0).total).toBe(4);
  });

  it("same paladin without the archetype gets no delta", () => {
    const doc = makeDoc({ classes: [{ tag: "paladin", level: 1 }], race: "Elf" });
    expect(skillBudget(doc, ref, 0).total).toBe(2);
  });

  it("an unrelated archetype on the same class contributes nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 1 }],
      race: "Elf",
      archetypes: ["paladin:divine-guardian"],
    });
    expect(skillBudget(doc, ref, 0).total).toBe(2);
  });

  it("the archetype's class isn't in doc.identity.classes -> gated to 0 (no crash)", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      archetypes: ["paladin:faithful-wanderer"],
    });
    // wizard 2 + Int 0, no paladin level to satisfy the level-1 gate.
    expect(skillBudget(doc, ref, 0).total).toBe(2);
  });
});
