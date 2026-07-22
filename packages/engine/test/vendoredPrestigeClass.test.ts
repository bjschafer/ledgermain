import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for issue #74 phase 2c — the ~108 vendored (non-hand-
 * authored) prestige classes now flowing through `classes.json` from the
 * same third-party archetype module as the archetype catalog (see
 * `packages/data-pipeline/src/transform/prestigeClasses.ts`). The point isn't
 * new engine machinery — a vendored prestige class runs through the exact
 * same generic per-class-level loop (`tables.ts`'s `babForLevels`/
 * `saveForLevels`, average-mode HP, granted-feature listing) the hand-
 * authored CRB prestige classes already use — it's proving that loop
 * actually reaches this new data correctly, hand-computed against the
 * published Hellknight (Pathfinder Campaign Setting) table.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(tag: string, level: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag, level }] },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 14 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("vendored prestige class chassis (Hellknight, hd 10 / BAB high / Fort good / Ref+Will poor)", () => {
  const hellknight = Object.values(ref.classes).find((c) => c.name === "Hellknight");

  it("is vendored (not hand-authored) and carries the expected chassis", () => {
    expect(hellknight).toBeDefined();
    expect(hellknight?.subType).toBe("prestige");
    // Hand-authored prestige classes use a `prestige-class:<classSlug>` id
    // that always doubles as a full kebab slug with no further structure;
    // this one resolves the same way — the vendored/hand-authored split is
    // an id-scheme convention, not a schema difference.
    expect(hellknight?.uuid).toBe("prestige-class:hellknight");
    expect(hellknight?.hd).toBe(10);
    expect(hellknight?.bab).toBe("high");
    expect(hellknight?.saves).toEqual({
      fort: "highPrestige",
      ref: "lowPrestige",
      will: "lowPrestige",
    });
    expect(hellknight?.skillsPerLevel).toBe(2);
    // No structured casting advancement was hand-authored for vendored
    // prestige classes (out of scope, see the transform's doc comment) —
    // Hellknight has no spellcasting to advance anyway.
    expect(hellknight?.castingAdvancement).toBeUndefined();
    // Prose-only soft advisory, never a hard-blocking structured prereq.
    expect(hellknight?.prereqs?.prereqText).toContain("Base Attack Bonus");
    expect(hellknight?.prereqs?.bab).toBeUndefined();
  });

  it("contributes BAB/saves/HP at 5th level exactly like a hand-authored prestige class would", () => {
    const doc = makeDoc(hellknight!.tag, 5);
    const sheet = compute(doc, ref);

    // BAB high = 1/level: 5.
    expect(sheet.bab).toBe(5);
    // Fort (highPrestige, good): floor((5+1)/2) = 3, +2 Con = 5.
    expect(sheet.saves.fort.total).toBe(5);
    // Ref/Will (lowPrestige, poor): floor((5+1)/3) = 2, +2 Dex/Wis = 4.
    expect(sheet.saves.ref.total).toBe(4);
    expect(sheet.saves.will.total).toBe(4);
    // Average-mode HP: L1 max d10=10, L2-5 (4 levels) x (floor(10/2)+1=6)=24, +Con 2/level x5=10.
    expect(sheet.hp.max).toBe(44);
  });

  it("grants its level-linked features up through the character's current level, none beyond it", () => {
    const sheet = compute(makeDoc(hellknight!.tag, 3), ref);
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Aura of Law");
    expect(names).toContain("Discern Lies"); // 2nd level
    expect(names).toContain("Disciplines"); // 3rd level
    expect(names).not.toContain("Lawbringer"); // 7th-level feature not yet reached
    expect(names).not.toContain("Hell's Knight"); // 10th-level feature not yet reached
  });
});
