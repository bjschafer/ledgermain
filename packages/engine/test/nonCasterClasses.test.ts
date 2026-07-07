import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for the seven non-caster classes added to the vendored
 * data slice (cavalier, gunslinger, brawler, slayer, swashbuckler, vigilante,
 * shifter). None of these need a casting model — the point of this file is
 * to prove each one works end-to-end through the *existing* generic
 * machinery (BAB/save tiers from `tables.ts`, average-mode HP, granted
 * class-feature listing, and `deriveResourcePools`'s generic
 * `uses.maxFormula` scan), same posture and hand-computed-against-SRD style
 * as `compute.test.ts`/`resources.test.ts`.
 *
 * Ability scores are held at a consistent str16/dex14/con14/int10/wis14/cha14
 * (all mod +2 except str +3) across every class below so the BAB/save/HP math
 * is easy to eyeball and cross-check between classes; a couple of resource
 * pool assertions vary Wis/Cha specifically to probe the grit/panache
 * "minimum 1" floor (see the supplement added in
 * `packages/data-pipeline/src/supplements.ts`).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  tag: string,
  level: number,
  abilities: CharacterDoc["abilities"] = { str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 14 },
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag, level }] },
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

function featureNames(sheet: ReturnType<typeof compute>): string[] {
  return sheet.classFeatures.map((f) => f.name);
}

describe("cavalier L6 (BAB high, Fort good/Ref poor/Will poor, d10)", () => {
  const doc = makeDoc("cavalier", 6);
  const sheet = compute(doc, ref);

  it("BAB +6", () => {
    expect(sheet.bab).toBe(6);
  });

  it("saves: Fort +7 (good), Ref +4 (poor), Will +4 (poor) — poor tiers still add the governing ability mod", () => {
    // good = 2 + floor(6/2) = 5, +2 Con = 7; poor = floor(6/3) = 2, +2 Dex/Wis = 4.
    expect(sheet.saves.fort.total).toBe(7);
    expect(sheet.saves.ref.total).toBe(4);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 52 (average mode: L1 max d10=10, L2-6 5x(floor(10/2)+1=6)=30, +Con 2/level=12)", () => {
    expect(sheet.hp.max).toBe(52);
  });

  it("level-appropriate features present (L1-L6), Greater Tactician (L9) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Challenge (CAV)");
    expect(names).toContain("Mount");
    expect(names).toContain("Order");
    expect(names).toContain("Tactician");
    expect(names).toContain("Cavalier's Charge");
    expect(names).toContain("Expert Trainer");
    expect(names).toContain("Banner");
    expect(names).toContain("Bonus Feat (CAV)");
    expect(names).not.toContain("Greater Tactician");
  });

  it("resource pools: Challenge 2/day, Tactician 2/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const challenge = pools.find((p) => p.name === "Challenge (CAV)");
    // 1 + floor((6-1)/3) = 2.
    expect(challenge?.max).toBe(2);
    expect(challenge?.per).toBe("day");
    const tactician = pools.find((p) => p.name === "Tactician");
    // 1 + floor(6/5) = 2.
    expect(tactician?.max).toBe(2);
    expect(tactician?.per).toBe("day");
  });
});

describe("gunslinger L5 (BAB high, Fort/Ref good, Will poor, d10)", () => {
  const doc = makeDoc("gunslinger", 5);
  const sheet = compute(doc, ref);

  it("BAB +5", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +6, Ref +6, Will +3 (poor +Wis)", () => {
    // good = 2 + floor(5/2) = 4, +2 Con/Dex = 6; poor = floor(5/3) = 1, +2 Wis = 3.
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(6);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("HP 44 (L1 max 10, L2-5 4x6=24, +Con 2/level=10)", () => {
    expect(sheet.hp.max).toBe(44);
  });

  it("level-appropriate features present (L1-L5), Dead Shot (L7) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Deadeye");
    expect(names).toContain("Grit");
    expect(names).toContain("Gunslinger's Dodge");
    expect(names).toContain("Gunsmith");
    expect(names).toContain("Quick Clear");
    expect(names).toContain("Nimble");
    expect(names).toContain("Gunslinger Initiative");
    expect(names).toContain("Gun Training");
    expect(names).not.toContain("Dead Shot");
  });

  it("Grit pool: Wis mod (+2) uses/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit?.max).toBe(2);
    expect(grit?.per).toBe("day");
  });

  it("Grit floors to 1/day even with a 0-or-negative Wis mod (RAW 'minimum 1' — the supplement fix)", () => {
    const lowWisDoc = makeDoc("gunslinger", 5, {
      str: 16,
      dex: 14,
      con: 14,
      int: 10,
      wis: 8,
      cha: 10,
    });
    const lowSheet = compute(lowWisDoc, ref);
    const pools = deriveResourcePools(lowWisDoc, ref, lowSheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit).toBeDefined();
    expect(grit?.max).toBe(1);
  });
});

describe("brawler L3 (BAB high, Fort/Ref good, Will poor, d10)", () => {
  const doc = makeDoc("brawler", 3);
  const sheet = compute(doc, ref);

  it("BAB +3", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +5, Ref +5, Will +3 (poor +Wis)", () => {
    // good = 2 + floor(3/2) = 3, +2 = 5; poor = floor(3/3) = 1, +2 Wis = 3.
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("HP 28 (L1 max 10, L2-3 2x6=12, +Con 2/level=6)", () => {
    expect(sheet.hp.max).toBe(28);
  });

  it("level-appropriate features present (L1-L3), AC Bonus/Knockout (L4) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Brawler's Cunning");
    expect(names).toContain("Martial Flexibility");
    expect(names).toContain("Martial Training");
    expect(names).toContain("Unarmed Strike (BRA)");
    expect(names).toContain("Bonus Combat Feats (BRA)");
    expect(names).toContain("Brawler's Flurry");
    expect(names).toContain("Maneuver Training (BRA)");
    expect(names).not.toContain("Knockout");
  });

  it("Martial Flexibility pool: 4/day (3 + floor(3/2))", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const flex = pools.find((p) => p.name === "Martial Flexibility");
    expect(flex?.max).toBe(4);
    expect(flex?.per).toBe("day");
  });
});

describe("slayer L3 (BAB high, Fort/Ref good, Will poor, d10)", () => {
  const doc = makeDoc("slayer", 3);
  const sheet = compute(doc, ref);

  it("BAB +3", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +5, Ref +5, Will +3 (poor +Wis, same tiers/math as brawler)", () => {
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("HP 28 (same d10/L3 math as brawler)", () => {
    expect(sheet.hp.max).toBe(28);
  });

  it("level-appropriate features present (L1-L3), Stalker (L7) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Studied Target");
    expect(names).toContain("Track");
    expect(names).toContain("Slayer Talents");
    expect(names).toContain("Sneak Attack (SLA)");
    expect(names).not.toContain("Stalker");
  });

  it("has no derivable resource pools at L3 (no class feature carries a uses.maxFormula until Slayer's Advance at L13)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.filter((p) => p.classTag === "slayer")).toEqual([]);
  });
});

describe("swashbuckler L3 (BAB high, Fort poor/Ref good/Will poor, d10)", () => {
  const doc = makeDoc("swashbuckler", 3);
  const sheet = compute(doc, ref);

  it("BAB +3", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +3 (poor), Ref +5 (good), Will +3 (poor)", () => {
    // poor = floor(3/3) = 1, +2 Con/Wis = 3; good = 2+floor(3/2) = 3, +2 Dex = 5.
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("HP 28 (same d10/L3 math)", () => {
    expect(sheet.hp.max).toBe(28);
  });

  it("level-appropriate features present (L1-L3), Bonus Feats (SWA) (L4) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Panache");
    expect(names).toContain("Swashbuckler Deeds");
    expect(names).toContain("Swashbuckler Finesse");
    expect(names).toContain("Charmed Life");
    expect(names).toContain("Nimble (SWA)");
    expect(names).not.toContain("Bonus Feats (SWA)");
  });

  it("Panache pool: Cha mod (+2) uses/day; Charmed Life 3/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const panache = pools.find((p) => p.name === "Panache");
    expect(panache?.max).toBe(2);
    expect(panache?.per).toBe("day");
    const charmedLife = pools.find((p) => p.name === "Charmed Life");
    // 2 + floor((3+2)/4) = 3.
    expect(charmedLife?.max).toBe(3);
  });

  it("Panache floors to 1/day even with a 0-or-negative Cha mod (RAW 'minimum 1' — the supplement fix)", () => {
    const lowChaDoc = makeDoc("swashbuckler", 3, {
      str: 16,
      dex: 14,
      con: 14,
      int: 10,
      wis: 10,
      cha: 8,
    });
    const lowSheet = compute(lowChaDoc, ref);
    const pools = deriveResourcePools(lowChaDoc, ref, lowSheet.abilities);
    const panache = pools.find((p) => p.name === "Panache");
    expect(panache).toBeDefined();
    expect(panache?.max).toBe(1);
  });
});

describe("vigilante L3 (BAB med, Fort poor/Ref+Will good, d8)", () => {
  const doc = makeDoc("vigilante", 3);
  const sheet = compute(doc, ref);

  it("BAB +2 (medium: floor(3*3/4))", () => {
    expect(sheet.bab).toBe(2);
  });

  it("saves: Fort +3, Ref +5, Will +5", () => {
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(5);
  });

  it("HP 24 (d8: L1 max 8, L2-3 2x(floor(8/2)+1=5)=10, +Con 2/level=6)", () => {
    expect(sheet.hp.max).toBe(24);
  });

  it("level-appropriate features present (L1-L3), Startling Appearance (L5) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Dual Identity");
    expect(names).toContain("Seamless Guise");
    expect(names).toContain("Social Talent");
    expect(names).toContain("Vigilante Specialization");
    expect(names).toContain("Vigilante Talent");
    expect(names).toContain("Unshakable");
    expect(names).not.toContain("Startling Appearance");
  });

  it("has no derivable resource pools at all (no vigilante class feature in the vendored slice carries a uses.maxFormula)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.filter((p) => p.classTag === "vigilante")).toEqual([]);
  });
});

describe("shifter L4 (BAB high, Fort/Ref good, Will poor, d10)", () => {
  const doc = makeDoc("shifter", 4);
  const sheet = compute(doc, ref);

  it("BAB +4", () => {
    expect(sheet.bab).toBe(4);
  });

  it("saves: Fort +6, Ref +6, Will +3 (poor +Wis)", () => {
    // good = 2 + floor(4/2) = 4, +2 = 6; poor = floor(4/3) = 1, +2 Wis = 3.
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(6);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("HP 36 (L1 max 10, L2-4 3x6=18, +Con 2/level=8)", () => {
    expect(sheet.hp.max).toBe(36);
  });

  it("level-appropriate features present (L1-L4), Trackless Step (L5) absent", () => {
    const names = featureNames(sheet);
    expect(names).toContain("Bonus Languages (SHI)");
    expect(names).toContain("Shifter Aspect");
    expect(names).toContain("Shifter Claws");
    expect(names).toContain("Wild Empathy");
    expect(names).toContain("Defensive Instinct");
    expect(names).toContain("Track");
    expect(names).toContain("Woodland Stride");
    expect(names).toContain("Wild Shape (SHI)");
    expect(names).not.toContain("Trackless Step");
  });

  it("Wild Shape (SHI) pool: level + Wis mod (4 + 2 = 6) uses/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const wildShape = pools.find((p) => p.name === "Wild Shape (SHI)");
    expect(wildShape?.max).toBe(6);
    expect(wildShape?.per).toBe("day");
  });

  it("Shifter Aspect derives no pool — the vendored feature carries no uses.maxFormula at all (see follow-up note)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Shifter Aspect")).toBeUndefined();
  });
});
