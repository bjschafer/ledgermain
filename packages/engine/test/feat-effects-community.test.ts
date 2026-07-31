import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { deriveResourcePools } from "../src/resources.js";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over?: {
  classes?: { tag: string; level: number }[];
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  featChoices?: Record<string, string>;
  skillRanks?: Record<string, number>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: over?.classes ?? [{ tag: "fighter", level: 5 }],
    },
    abilities: over?.abilities ?? { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: over?.feats ?? [],
      featChoices: over?.featChoices,
      skillRanks: over?.skillRanks ?? { acr: 5 },
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

/**
 * Hand-computed fixtures for the community feat sweep's extracted/pool
 * entries (see feat-classification-community.ts). Expected values cite the
 * published rule the vendored description carries.
 */
describe("community feat sweep: extracted static effects", () => {
  it("Sea Legs: +2 on Acrobatics, Climb, and Swim (Pirates of the Inner Sea)", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [featId("Sea Legs")] }), ref);
    // acr: 5 ranks + 2 Dex (not a fighter class skill) = 7 -> 9
    expect(base.skills.acr?.total).toBe(7);
    expect(sheet.skills.acr?.total).toBe(9);
    // clm: 0 ranks + 3 Str = 3 -> 5; swm same
    expect(sheet.skills.clm?.total).toBe((base.skills.clm?.total ?? 0) + 2);
    expect(sheet.skills.swm?.total).toBe((base.skills.swm?.total ?? 0) + 2);
  });

  it("Skill Focus (Perception): +3, and +6 once Perception has 10 ranks (CRB shape)", () => {
    const base = compute(makeDoc(), ref);
    const low = compute(makeDoc({ feats: [featId("Skill Focus (Perception)")] }), ref);
    expect(low.skills.per?.total).toBe((base.skills.per?.total ?? 0) + 3);

    const ranked = makeDoc({
      classes: [{ tag: "fighter", level: 10 }],
      feats: [featId("Skill Focus (Perception)")],
      skillRanks: { per: 10 },
    });
    const rankedBase = makeDoc({
      classes: [{ tag: "fighter", level: 10 }],
      skillRanks: { per: 10 },
    });
    expect(compute(ranked, ref).skills.per?.total).toBe(
      (compute(rankedBase, ref).skills.per?.total ?? 0) + 6,
    );
  });

  it("Storm Soul: immunity to electricity (giant feat)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Storm Soul")] }), ref);
    const qualifiers = (sheet.defenses?.immunities ?? []).map((i) => i.qualifier);
    expect(qualifiers).toContain("electricity");
  });

  it("Noble Scion: +2 Knowledge (nobility) AND kno becomes a class skill (+3 with a rank)", () => {
    const base = compute(makeDoc({ skillRanks: { kno: 1 } }), ref);
    // Fighter: kno is not a class skill; 1 rank + 0 Int = 1.
    expect(base.skills.kno?.total).toBe(1);
    const sheet = compute(makeDoc({ skillRanks: { kno: 1 }, feats: [featId("Noble Scion")] }), ref);
    // 1 rank + 3 class skill + 2 feat = 6.
    expect(sheet.skills.kno?.total).toBe(6);
  });

  it("Exotic Heritage: +2 on the chosen skill via the stored featChoice", () => {
    const id = featId("Exotic Heritage");
    const sheet = compute(makeDoc({ feats: [id], featChoices: { [id]: "acr" } }), ref);
    // acr: 5 ranks + 2 Dex + 2 feat (below 10 ranks) = 9.
    expect(sheet.skills.acr?.total).toBe(9);
  });

  it("Warrior Priest: +1 initiative", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [featId("Warrior Priest")] }), ref);
    expect(sheet.initiative.total).toBe(base.initiative.total + 1);
  });
});

describe("community feat sweep: pool promotions", () => {
  it("Extended Bane: inquisitor 5 w/ Wis 16's Bane (5 rounds) gains +Wis mod -> 8 (Ultimate Magic)", () => {
    const doc = makeDoc({
      classes: [{ tag: "inquisitor", level: 5 }],
      abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 16, cha: 10 },
      feats: [featId("Extended Bane")],
    });
    const sheet = compute(doc, ref);
    const bane = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Bane");
    expect(bane?.max).toBe(8);
  });

  it("Practiced Tactician: cavalier 5's Tactician (1 + floor(5/5) = 2) gains +1 -> 3 (ACG)", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      feats: [featId("Practiced Tactician")],
    });
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find((p) =>
      p.name.toLowerCase().includes("tactician"),
    );
    expect(pool?.max).toBe(3);
  });

  it("Mantis Style's extra Stunning Fist attempt applies without the stance (unprefixed clause)", () => {
    const doc = makeDoc({
      classes: [{ tag: "monk", level: 5 }],
      feats: [featId("Mantis Style")],
    });
    const base = { ...doc, build: { ...doc.build, feats: [] } };
    const sheet = compute(doc, ref);
    const baseSheet = compute(base, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.name === "Stunning Fist",
    );
    const basePool = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Stunning Fist",
    );
    expect(pool?.max).toBe((basePool?.max ?? 0) + 1);
  });
});
