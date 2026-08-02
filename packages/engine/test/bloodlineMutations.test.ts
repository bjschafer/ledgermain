import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  BLOODLINE_MUTATIONS,
  BLOODLINES,
  compute,
  mutatedBloodlineDef,
  mutationsForBloodlineTag,
  resolveSorcererBloodlineOrMutation,
} from "../src/index.js";

/**
 * Wildblooded mutation coverage (Ultimate Magic p.70): a wildblooded sorcerer
 * keeps the base bloodline's class skill, bonus spells, and bonus feats,
 * takes the MUTATION's bloodline arcana, and keeps the base bloodline's
 * powers except where the mutation replaces one. `build.sorcererBloodline`
 * may name either shape (`resolveSorcererBloodlineOrMutation`); a plain base
 * pick must compute byte-identically to before this feature existed.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  classes: { tag: string; level: number }[],
  sorcererBloodline?: string,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes,
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(sorcererBloodline ? { sorcererBloodline } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("BLOODLINE_MUTATIONS", () => {
  it("has 24 entries — every published '(Wildblooded Mutation)' heading in the pinned Pf Data 1e slice", () => {
    expect(Object.keys(BLOODLINE_MUTATIONS)).toHaveLength(24);
  });

  it("every mutation's parentTag resolves to a hand-authored base bloodline", () => {
    for (const mutation of Object.values(BLOODLINE_MUTATIONS)) {
      expect(BLOODLINES[mutation.parentTag]).toBeDefined();
    }
  });

  it("every swap's `replaces` id names a real power on the parent bloodline", () => {
    for (const mutation of Object.values(BLOODLINE_MUTATIONS)) {
      const parent = BLOODLINES[mutation.parentTag]!;
      for (const swap of mutation.swaps) {
        expect(parent.powers.some((p) => p.id === swap.replaces)).toBe(true);
      }
    }
  });

  it("matches the vendored catalog's 24 mutation ids exactly", () => {
    const vendoredIds = new Set(Object.keys(ref.sorcererBloodlineMutations));
    expect(new Set(Object.keys(BLOODLINE_MUTATIONS))).toEqual(vendoredIds);
  });
});

describe("mutatedBloodlineDef()", () => {
  it("Sage (Arcane): swaps arcane bond for arcane bolt, keeps every other power", () => {
    const parent = BLOODLINES.Arcane!;
    const mutation = BLOODLINE_MUTATIONS["arcane-sage"]!;
    const merged = mutatedBloodlineDef(mutation, parent);

    expect(merged.powers.map((p) => p.id)).toEqual([
      "arcaneBolt",
      "metamagicAdept",
      "newArcana",
      "schoolPower",
      "arcaneApotheosis",
    ]);
    expect(merged.arcana.summary).toContain("Intelligence");
    expect(merged.name).toBe("Sage (Arcane)");
    // Unchanged from the parent — bonus feats stay the base bloodline's.
    expect(merged.bonusFeatSlugs).toEqual(parent.bonusFeatSlugs);
  });

  it("Sylvan (Fey): a two-power mutation swaps both named targets and keeps the rest", () => {
    const parent = BLOODLINES.Fey!;
    const mutation = BLOODLINE_MUTATIONS["fey-sylvan"]!;
    const merged = mutatedBloodlineDef(mutation, parent);

    expect(merged.powers.map((p) => p.id)).toEqual([
      "animalCompanion",
      "woodlandStride",
      "fleetingGlance",
      "feyWings",
      "soulOfTheFey",
    ]);
  });
});

describe("resolveSorcererBloodlineOrMutation()", () => {
  it("resolves a base bloodline tag exactly like resolveSorcererBloodline", () => {
    const resolved = resolveSorcererBloodlineOrMutation("Arcane", ref);
    expect(resolved?.displayOnly).toBe(false);
    expect(resolved?.powers).toEqual(BLOODLINES.Arcane!.powers);
  });

  it("resolves a mutation id to the merged def", () => {
    const resolved = resolveSorcererBloodlineOrMutation("arcane-sage", ref);
    expect(resolved?.displayOnly).toBe(false);
    expect(resolved?.name).toBe("Sage (Arcane)");
    expect(resolved?.powers.some((p) => p.id === "arcaneBolt")).toBe(true);
    expect(resolved?.powers.some((p) => p.id === "arcaneBond")).toBe(false);
    expect(resolved?.description).toBeDefined();
  });

  it("returns undefined for an unknown tag", () => {
    expect(resolveSorcererBloodlineOrMutation("not-a-real-bloodline", ref)).toBeUndefined();
  });
});

describe("mutationsForBloodlineTag()", () => {
  it("lists Sage under Arcane", () => {
    const mutations = mutationsForBloodlineTag("Arcane", ref);
    expect(mutations).toEqual([{ id: "arcane-sage", name: "Sage" }]);
  });

  it("lists both Primal and Lifewater under Elemental", () => {
    const mutations = mutationsForBloodlineTag("Elemental", ref);
    expect(mutations.map((m) => m.id).sort()).toEqual(["elemental-lifewater", "elemental-primal"]);
  });

  it("is empty for a bloodline with no published mutation", () => {
    expect(mutationsForBloodlineTag("Accursed", ref)).toEqual([]);
  });
});

describe("compute() + build.sorcererBloodline (wildblooded mutation)", () => {
  it("a plain Arcane sorcerer is unchanged: still has arcane bond, no arcane bolt", () => {
    const doc = compute(makeDoc([{ tag: "sorcerer", level: 5 }], "Arcane"), ref);
    const names = doc.classFeatures.map((f) => f.name);
    expect(names).toContain("Arcane Bond");
    expect(names).not.toContain("Arcane Bolt");
  });

  it("a Sage (Arcane) sorcerer's sheet shows the swapped power, keeps Arcane's unswapped powers", () => {
    const level = 5;
    const sage = compute(makeDoc([{ tag: "sorcerer", level }], "arcane-sage"), ref);

    const sageNames = sage.classFeatures.map((f) => f.name);
    expect(sageNames).toContain("Arcane Bolt");
    expect(sageNames).not.toContain("Arcane Bond");
    // Metamagic Adept (3rd level) is untouched by the Sage swap — still granted.
    expect(sageNames).toContain("Metamagic Adept");

    const sageFeature = sage.classFeatures.find((f) => f.name === "Arcane Bolt");
    expect(sageFeature?.origin?.label).toBe("Sage (Arcane) Bloodline");
  });

  it("Sage's +2 Knowledge (arcana)/Spellcraft arcana lands as an untyped skill bonus", () => {
    const sage = compute(makeDoc([{ tag: "sorcerer", level: 5 }], "arcane-sage"), ref);
    const plain = compute(makeDoc([{ tag: "sorcerer", level: 5 }], "Arcane"), ref);
    const karBonus = (sheet: typeof sage) => sheet.skills["kar"]?.total ?? 0;
    expect(karBonus(sage)).toBe(karBonus(plain) + 2);
  });
});
