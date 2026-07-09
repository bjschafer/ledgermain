import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deedsForClass,
  deriveResourcePools,
  GUNSLINGER_DEEDS,
  preciseStrikeBonus,
  SWASHBUCKLER_DEEDS,
} from "../src/index.js";

/**
 * Fixture coverage for issue #65's gunslinger/swashbuckler deed subsystem.
 *
 * First confirms the premise the task brief asked to verify rather than
 * assume: grit (gunslinger) and panache (swashbuckler) pools already derive
 * from the generic `uses.maxFormula` resource-pool pipeline
 * (`resources.ts`), same as every other class resource pool — no
 * hand-authored pool logic was added for either.
 *
 * Then covers `deeds.ts`'s hand-authored reference table: level gating
 * (deeds are automatic, not a budgeted pick — every deed of your level and
 * below is available) and Precise Strike's numeric bonus.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(tag: string, level: number, abilities: CharacterDoc["abilities"]): CharacterDoc {
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

describe("Grit pool already rides the generic uses.maxFormula pipeline (verified, not rebuilt)", () => {
  it("gunslinger L5, Wis 14 (+2): grit max(1, 2) = 2/day", () => {
    const doc = makeDoc("gunslinger", 5, { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 8 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit?.max).toBe(2);
    expect(grit?.per).toBe("day");
  });

  it("gunslinger L5, Wis 8 (-1): grit max(1, -1) = 1/day (floor)", () => {
    const doc = makeDoc("gunslinger", 5, { str: 12, dex: 16, con: 12, int: 10, wis: 8, cha: 8 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Grit")?.max).toBe(1);
  });
});

describe("Panache pool already rides the generic uses.maxFormula pipeline (verified, not rebuilt)", () => {
  it("swashbuckler L5, Cha 16 (+3): panache max(1, 3) = 3/day", () => {
    const doc = makeDoc("swashbuckler", 5, { str: 12, dex: 16, con: 12, int: 10, wis: 8, cha: 16 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const panache = pools.find((p) => p.name === "Panache");
    expect(panache?.max).toBe(3);
    expect(panache?.per).toBe("day");
  });

  it("swashbuckler L5, Cha 8 (-1): panache max(1, -1) = 1/day (floor)", () => {
    const doc = makeDoc("swashbuckler", 5, { str: 12, dex: 16, con: 12, int: 10, wis: 8, cha: 8 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Panache")?.max).toBe(1);
  });
});

describe("deedsForClass — level gating (automatic, not a budgeted pick)", () => {
  it("gunslinger L1: only the three L1 deeds", () => {
    const names = deedsForClass("gunslinger", 1).map((d) => d.name);
    expect(names.sort()).toEqual(["Deadeye", "Gunslinger's Dodge", "Quick Clear"].sort());
  });

  it("gunslinger L2: Nimble (L2) is a class feature, not in this deed table — still just the L1 three", () => {
    const names = deedsForClass("gunslinger", 2).map((d) => d.name);
    expect(names.sort()).toEqual(["Deadeye", "Gunslinger's Dodge", "Quick Clear"].sort());
  });

  it("gunslinger L3: adds the three L3 deeds (6 total)", () => {
    expect(deedsForClass("gunslinger", 3)).toHaveLength(6);
  });

  it("gunslinger L20: all 19 deeds (True Grit included)", () => {
    expect(deedsForClass("gunslinger", 20)).toHaveLength(19);
    expect(deedsForClass("gunslinger", 20).map((d) => d.name)).toContain("True Grit");
  });

  it("gunslinger L19: True Grit (L20) not yet available", () => {
    expect(deedsForClass("gunslinger", 19).map((d) => d.name)).not.toContain("True Grit");
  });

  it("swashbuckler L1: only the three L1 deeds", () => {
    const names = deedsForClass("swashbuckler", 1).map((d) => d.name);
    expect(names.sort()).toEqual(
      ["Derring-Do", "Dodging Panache", "Opportune Parry and Riposte"].sort(),
    );
  });

  it("swashbuckler L3: Precise Strike becomes available", () => {
    expect(deedsForClass("swashbuckler", 3).map((d) => d.name)).toContain("Precise Strike");
    expect(deedsForClass("swashbuckler", 2).map((d) => d.name)).not.toContain("Precise Strike");
  });

  it("swashbuckler L19: 19 total deeds (final tier: Cheat Death, Deadly Stab, Stunning Stab)", () => {
    expect(deedsForClass("swashbuckler", 19)).toHaveLength(19);
  });

  it("deedsForClass never cross-contaminates gunslinger/swashbuckler tables", () => {
    expect(deedsForClass("gunslinger", 20).every((d) => d.classTag === "gunslinger")).toBe(true);
    expect(deedsForClass("swashbuckler", 20).every((d) => d.classTag === "swashbuckler")).toBe(
      true,
    );
  });
});

describe("Precise Strike numeric bonus", () => {
  it("flat bonus = swashbuckler level", () => {
    expect(preciseStrikeBonus(1)).toBe(1);
    expect(preciseStrikeBonus(7)).toBe(7);
    expect(preciseStrikeBonus(20)).toBe(20);
  });

  it("doubled variant (1 panache, swift action) doubles the bonus", () => {
    expect(preciseStrikeBonus(7, true)).toBe(14);
  });

  it("clamps to 0 for a non-positive level rather than going negative", () => {
    expect(preciseStrikeBonus(0)).toBe(0);
    expect(preciseStrikeBonus(-3)).toBe(0);
  });

  it("Precise Strike's table entry carries a contextNotes caveat about the unchecked weapon/panache condition", () => {
    const entry = SWASHBUCKLER_DEEDS["swashbuckler:preciseStrike"];
    expect(entry?.contextNotes?.length).toBeGreaterThan(0);
    expect(entry?.displayOnly).toBe(true);
  });
});

describe("Deed table sanity", () => {
  it("every gunslinger deed id is namespaced gunslinger:*", () => {
    expect(Object.keys(GUNSLINGER_DEEDS).every((id) => id.startsWith("gunslinger:"))).toBe(true);
  });

  it("every swashbuckler deed id is namespaced swashbuckler:*", () => {
    expect(Object.keys(SWASHBUCKLER_DEEDS).every((id) => id.startsWith("swashbuckler:"))).toBe(
      true,
    );
  });

  it("gunslinger table has 19 deeds (Deadeye through True Grit)", () => {
    expect(Object.keys(GUNSLINGER_DEEDS)).toHaveLength(19);
  });

  it("swashbuckler table has 19 deeds (Derring-Do through Stunning Stab)", () => {
    expect(Object.keys(SWASHBUCKLER_DEEDS)).toHaveLength(19);
  });
});
