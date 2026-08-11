/**
 * Fixture tests wiring kineticist elements, cavalier/samurai orders, and
 * oracle mysteries into `compute.ts`'s `classSkillSet` — each grants 2 bonus
 * class skills in its printed text (Occult Adventures' per-element
 * "Elemental Focus" entries; APG's per-order text; each APG mystery's
 * `classSkills` list, hand-verified in `oracle-mysteries.ts`/`cavalier-
 * orders.ts`/`kineticist-elements.ts`), previously collected but never fed
 * into the derived skill list. Follows the cookbook's three-shape pattern
 * per class: real effect / unknown id / wrong class.
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

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  skillRanks?: Record<string, number>;
  oracleMystery?: string;
  cavalierOrder?: string;
  kineticistElement?: string;
  kineticistExpandedElements?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "element-order-mystery-skills-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 12, wis: 12, cha: 12 },
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(over.oracleMystery ? { oracleMystery: over.oracleMystery } : {}),
      ...(over.cavalierOrder ? { cavalierOrder: over.cavalierOrder } : {}),
      ...(over.kineticistElement ? { kineticistElement: over.kineticistElement } : {}),
      ...(over.kineticistExpandedElements
        ? { kineticistExpandedElements: over.kineticistExpandedElements }
        : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/* ------------------------------------------------------------- oracle mystery */

describe("compute(): oracleMystery grants its 2 bonus class skills", () => {
  // Battle mystery: classSkills = ["int", "ken", "per", "rid"] ("int" here is
  // the Foundry skill id for Intimidate, not the Intelligence ability).
  // Perception ("per") is the one of the four that ISN'T already a Fighter
  // class skill (int/ken/rid all are — CRB Fighter class skill list), so it's
  // the clean marker for isolating the mystery's own contribution.
  it("Perception becomes a class skill for a Battle oracle", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 1 }],
      oracleMystery: "battle",
      skillRanks: { per: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.per!.classSkill).toBe(true);
    expect(sheet.skills.per!.classSkillBonus).toBe(3);
  });

  it("an unknown mystery tag grants nothing (tolerated, not a crash)", () => {
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 1 }],
      oracleMystery: "not-a-real-mystery",
      skillRanks: { per: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.per!.classSkill).toBe(false);
  });

  it("a stale mystery field on a non-oracle grants nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      oracleMystery: "battle",
      skillRanks: { per: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.per!.classSkill).toBe(false);
  });
});

/* ------------------------------------------------------------- cavalier order */

describe("compute(): cavalierOrder grants its 2 bonus class skills", () => {
  // Order of the Cockatrice: orderSkills = ["apr", "prf"] (Appraise, Perform).
  it("Appraise becomes a class skill for a Cockatrice cavalier", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 1 }],
      cavalierOrder: "cockatrice",
      skillRanks: { apr: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(true);
    expect(sheet.skills.apr!.classSkillBonus).toBe(3);
  });

  it("also applies to a samurai (shared build.cavalierOrder field)", () => {
    const doc = makeDoc({
      classes: [{ tag: "samurai", level: 1 }],
      cavalierOrder: "cockatrice",
      skillRanks: { apr: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(true);
  });

  // Order of the Asp (Ultimate Combat splatbook order, not one of the six
  // APG orders): orderSkills = ["klo", "slt"] (Knowledge [local], Sleight of
  // Hand).
  it("Knowledge (local) becomes a class skill for an Order of the Asp cavalier", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 1 }],
      cavalierOrder: "order_of_the_asp",
      skillRanks: { klo: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.klo!.classSkill).toBe(true);
    expect(sheet.skills.klo!.classSkillBonus).toBe(3);
  });

  it("an unknown order tag grants nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 1 }],
      cavalierOrder: "not-a-real-order",
      skillRanks: { apr: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(false);
  });

  it("a stale order field on a non-cavalier/samurai grants nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      cavalierOrder: "cockatrice",
      skillRanks: { apr: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(false);
  });
});

/* ---------------------------------------------------------- kineticist element */

describe("compute(): kineticistElement grants its 2 bonus class skills", () => {
  // Aether element: classSkills = ["ken", "slt"] (Knowledge [engineering],
  // Sleight of Hand).
  it("Sleight of Hand becomes a class skill for an Aether kineticist", () => {
    const doc = makeDoc({
      classes: [{ tag: "kineticist", level: 1 }],
      kineticistElement: "aether",
      skillRanks: { slt: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.slt!.classSkill).toBe(true);
    expect(sheet.skills.slt!.classSkillBonus).toBe(3);
  });

  it("an Expanded Element pick (7th level) also contributes its class skills", () => {
    // Fire element (Expanded at 7th): classSkills = ["esc", "kna"].
    const doc = makeDoc({
      classes: [{ tag: "kineticist", level: 7 }],
      kineticistElement: "aether",
      kineticistExpandedElements: ["fire"],
      skillRanks: { esc: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.esc!.classSkill).toBe(true);
  });

  it("an unknown element tag grants nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "kineticist", level: 1 }],
      kineticistElement: "not-a-real-element",
      skillRanks: { slt: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.slt!.classSkill).toBe(false);
  });

  it("a stale element field on a non-kineticist grants nothing", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      kineticistElement: "aether",
      skillRanks: { slt: 1 },
    });
    const sheet = compute(doc, ref);
    expect(sheet.skills.slt!.classSkill).toBe(false);
  });
});
