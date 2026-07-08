import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for Rogue (Unchained) (`rogueUnchained`). Same BAB/save
 * tiers/HD as the chained rogue (medium BAB, Fort poor/Ref good/Will poor,
 * d8) — confirmed straight off `RefData.classes.rogueUnchained`, no
 * hand-authoring needed. Sneak Attack's dice progression is identical to
 * chained rogue's (`sneakAttackDice`, extended in `archetypes.ts` to key off
 * this class tag too, matched by the class-specific vendored feature name
 * "Sneak Attack (UC)" rather than chained's plain "Sneak Attack"). Danger
 * Sense (replacing Trap Sense) carries an empty vendored `changes: []` — same
 * unmodeled "vs. traps only" posture chained rogue's own Trap Sense already
 * has (see `archetype-extracted/rogue.ts`'s doc comment); not a regression,
 * a pre-existing scoping limit this class inherits. Finesse Training (UC)'s
 * fixed Weapon Finesse grant and Rogue's Edge (UC)'s spurious `bonusFeats`
 * vendored-data bug are covered in `apps/web/test/feats.test.ts` (both are
 * feat-budget concerns, model-layer territory, not engine territory).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 12, dex: 18, con: 12, int: 10, wis: 10, cha: 10 } as const;

function makeDoc(level: number): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "rogueUnchained", level }],
    },
    abilities: ABILITIES,
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Rogue (Unchained) L5 (BAB med, Fort poor/Ref good/Will poor, d8 — same tiers as chained rogue)", () => {
  const doc = makeDoc(5);
  const sheet = compute(doc, ref);

  it("BAB +3 (medium: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +2 (poor), Ref +8 (good), Will +1 (poor)", () => {
    // poor = floor(5/3) = 1, +1 Con = 2; good = 2 + floor(5/2) = 4, +4 Dex = 8.
    expect(sheet.saves.fort.total).toBe(2);
    expect(sheet.saves.ref.total).toBe(8);
    expect(sheet.saves.will.total).toBe(1);
  });

  it("HP 33 (d8: L1 max 8, L2-5 4x5=20, +Con 1/level=5)", () => {
    expect(sheet.hp.max).toBe(33);
  });

  it("level-appropriate features present (L1-L5), Improved Uncanny Dodge (L8) absent", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Finesse Training (UC)");
    expect(names).toContain("Sneak Attack (UC)");
    expect(names).toContain("Trapfinding");
    expect(names).toContain("Evasion");
    expect(names).toContain("Rogue Talents");
    expect(names).toContain("Danger Sense");
    expect(names).toContain("Debilitating Injury");
    expect(names).toContain("Uncanny Dodge");
    expect(names).toContain("Rogue's Edge (UC)");
    expect(names).not.toContain("Improved Uncanny Dodge");
    expect(names).not.toContain("Advanced Talents (ROG)");
    expect(names).not.toContain("Master Strike (UC)");
  });

  it("Sneak Attack (UC) carries the same hand-authored dice progression as chained rogue (3d6 at L5)", () => {
    const sneakAttack = sheet.classFeatures.find((f) => f.name === "Sneak Attack (UC)");
    expect(sneakAttack).toBeDefined();
    expect(sneakAttack!.classTag).toBe("rogueUnchained");
    expect(sneakAttack!.detail).toBe("3d6");
  });

  it("Danger Sense carries no numeric detail — same unmodeled 'vs. traps only' scoping as chained rogue's Trap Sense", () => {
    const dangerSense = sheet.classFeatures.find((f) => f.name === "Danger Sense");
    expect(dangerSense).toBeDefined();
    expect(dangerSense!.detail).toBeUndefined();
  });
});
