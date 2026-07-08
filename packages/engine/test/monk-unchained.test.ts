import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for Monk (Unchained) (`monkUnchained`), the Pathfinder
 * Unchained rewrite. Key departures from the chained monk this file proves
 * against real vendored data rather than assuming:
 *
 *  - Saves are FULL BAB + good Fort/Ref but POOR Will (chained monk is
 *    medium BAB with good Fort/Ref/Will all three) — confirmed straight off
 *    `RefData.classes.monkUnchained`'s `bab`/`saves` tiers, no hand-authoring
 *    needed for BAB/saves themselves.
 *  - Flurry of Blows is a full rewrite (extra attack(s) at the monk's TRUE
 *    BAB, no penalty) — `flurryOfBlowsUnchainedLabel`, distinct from the
 *    chained `flurryOfBlowsLabel`.
 *  - Ki Pool arrives at 3rd level (not 4th, like chained) but is otherwise
 *    the same Wis-based formula, riding the fully generic
 *    `uses.maxFormula` resource-pool pipeline with zero hand-authoring.
 *  - AC Bonus (Wis-to-AC) and Unarmed Strike (grants Improved Unarmed Strike)
 *    are SHARED vendored featureIds with chained monk and apply through the
 *    same generic `changes[]`/`bonusFeats` pipelines already exercised by
 *    the chained-monk fixtures in `compute.test.ts`.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 8 } as const;

function makeDoc(level: number, abilities: CharacterDoc["abilities"] = ABILITIES): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "monkUnchained", level }],
    },
    abilities,
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Monk (Unchained) L5 (BAB HIGH, Fort/Ref good, Will POOR — unlike chained monk, d10)", () => {
  const doc = makeDoc(5);
  const sheet = compute(doc, ref);

  it("BAB +5 (high, not medium like chained monk)", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +6, Ref +7 (good), Will +4 (poor — the unchained divergence)", () => {
    // good = 2 + floor(5/2) = 4, +2 Con = 6; +3 Dex = 7.
    // poor = floor(5/3) = 1, +3 Wis = 4.
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(7);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 44 (d10: L1 max 10, L2-5 4x6=24, +Con 2/level=10)", () => {
    expect(sheet.hp.max).toBe(44);
  });

  it("level-appropriate features present (L1-L5), Improved Evasion (L9) absent", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("AC Bonus (MNK)");
    expect(names).toContain("Bonus Feat (MNK)");
    expect(names).toContain("Flurry of Blows (UC)");
    expect(names).toContain("Stunning Fist");
    expect(names).toContain("Unarmed Strike");
    expect(names).toContain("Evasion");
    expect(names).toContain("Ki Pool (UC)"); // L3 for unchained (L4 chained)
    expect(names).toContain("Ki powers (UC)");
    expect(names).toContain("Still Mind");
    expect(names).toContain("Purity of Body");
    expect(names).toContain("Style Strikes");
    expect(names).not.toContain("Improved Evasion");
  });

  it("Unarmed Strike carries the same hand-authored damage-die detail as chained monk (1d8 at L5, top of the L4-7 tier)", () => {
    const unarmedStrike = sheet.classFeatures.find((f) => f.name === "Unarmed Strike");
    expect(unarmedStrike).toBeDefined();
    expect(unarmedStrike!.classTag).toBe("monkUnchained");
    expect(unarmedStrike!.detail).toBe("1d8");
  });

  it("Flurry of Blows (UC) carries the REDESIGNED unchained detail: 1 extra attack at full BAB, no penalty", () => {
    const flurry = sheet.classFeatures.find((f) => f.name === "Flurry of Blows (UC)");
    expect(flurry).toBeDefined();
    expect(flurry!.classTag).toBe("monkUnchained");
    expect(flurry!.detail).toBe("1 extra attack at full BAB (no penalty)");
  });

  it("AC Bonus (Wis-to-AC) applies via the fully generic changes[] pipeline (shared vendored featureId with chained monk)", () => {
    // if(no shield && no armor && no encumbrance, 1) * (wisMod + floor(unlevel/4))
    // = 1 * (3 + 1) = 4, untyped, on both ac and cmd.
    expect(sheet.ac.normal).toBe(17); // 10 base + dex3 + wisToAc4
    expect(sheet.ac.touch).toBe(17);
    expect(sheet.cmd).toBe(24); // 10 + bab5 + str2 + dex3 + size0 + wisToAc4
  });

  it("Ki Pool (UC) resource pool: floor(unlevel/2) + Wis mod = 2 + 3 = 5/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const ki = pools.find((p) => p.name === "Ki Pool (UC)");
    expect(ki).toBeDefined();
    expect(ki!.max).toBe(5);
    expect(ki!.per).toBe("day");
  });

  it("Style Strikes resource pool: ceil(class.level / 14) = 1/round", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const styleStrikes = pools.find((p) => p.name === "Style Strikes");
    expect(styleStrikes).toBeDefined();
    expect(styleStrikes!.max).toBe(1);
    expect(styleStrikes!.per).toBe("round");
  });
});

describe("Monk (Unchained) L11 — second Flurry of Blows extra attack", () => {
  it("Flurry of Blows (UC) detail: 2 extra attacks at full BAB, no penalty", () => {
    const doc = makeDoc(11);
    const sheet = compute(doc, ref);
    const flurry = sheet.classFeatures.find((f) => f.name === "Flurry of Blows (UC)");
    expect(flurry!.detail).toBe("2 extra attacks at full BAB (no penalty)");
  });
});
