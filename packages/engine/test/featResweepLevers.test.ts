import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Hand-computed fixtures for the speed/class-value/natural-armor re-sweep
 * wave (see feat-classification-community.ts and feat-classification.ts).
 * Each cites the vendored feat's own Benefits text (this repo's OGL data
 * slice) or, for Bravery-linked feats, the hand-verified Bravery entry
 * (class-feature-effects.ts) whose progression they reuse.
 */
const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over?: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
  race?: string;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: over?.race ?? "",
      classes: over?.classes ?? [{ tag: "fighter", level: 5 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over?.feats ?? [],
      extraFeats: over?.extraFeats,
      skillRanks: {},
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

describe("speed set-mode feats (base land speed primitive)", () => {
  // No race is set (baseSpeeds falls back to { land: 30 }), so base land
  // speed is 30 throughout this block.

  it("Barracuda Dash: swim speed equal to base land speed (Pathfinder Society Field Guide)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Barracuda Dash")] }), ref);
    expect(sheet.speeds.land).toBe(30);
    expect(sheet.speeds.swim).toBe(30);
  });

  it("Oread Burrower: burrow speed equal to half base land speed (APG)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Oread Burrower")] }), ref);
    expect(sheet.speeds.burrow).toBe(15);
  });

  it("Fiendish Wings: fly speed equal to base land speed", () => {
    const sheet = compute(makeDoc({ feats: [featId("Fiendish Wings")] }), ref);
    expect(sheet.speeds.fly).toBe(30);
  });

  it("Fiendish Serpent: climb and swim speed both equal to base land speed", () => {
    const sheet = compute(makeDoc({ feats: [featId("Fiendish Serpent")] }), ref);
    expect(sheet.speeds.climb).toBe(30);
    expect(sheet.speeds.swim).toBe(30);
  });

  it("Master Swimmer: swim speed is min(30, base land speed) — 30 for a base-30 walker", () => {
    const sheet = compute(makeDoc({ feats: [featId("Master Swimmer")] }), ref);
    expect(sheet.speeds.swim).toBe(30);
  });

  it("Master Swimmer: caps at base land speed when that's below 30 (Halfling, base 20)", () => {
    const sheet = compute(
      makeDoc({ race: raceId("Halfling"), feats: [featId("Master Swimmer")] }),
      ref,
    );
    expect(sheet.speeds.land).toBe(20);
    expect(sheet.speeds.swim).toBe(20);
  });
});

describe("Bravery-linked feats (fighter class-level formula primitive)", () => {
  // Bravery: "+1 bonus... starting at 2nd level... increases by +1 for every
  // four levels beyond 2nd" (Core Rulebook) — 1 + floor((level - 2) / 4).
  // Below 2nd level a fighter has no Bravery at all, and the raw formula
  // self-gates to 0 there (floor((0-2)/4) = -1, so 1 + -1 = 0).

  it("Bravery in Action: adds the Bravery bonus to initiative — +1 at fighter 2, +2 at fighter 6", () => {
    const base2 = compute(makeDoc({ classes: [{ tag: "fighter", level: 2 }] }), ref);
    const withFeat2 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 2 }], feats: [featId("Bravery in Action")] }),
      ref,
    );
    expect(withFeat2.initiative.total).toBe(base2.initiative.total + 1);

    const base6 = compute(makeDoc({ classes: [{ tag: "fighter", level: 6 }] }), ref);
    const withFeat6 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 6 }], feats: [featId("Bravery in Action")] }),
      ref,
    );
    expect(withFeat6.initiative.total).toBe(base6.initiative.total + 2);
  });

  it("Bravery in Action: no bonus below fighter 2nd level (Bravery hasn't been gained yet)", () => {
    const base1 = compute(makeDoc({ classes: [{ tag: "fighter", level: 1 }] }), ref);
    const withFeat1 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [featId("Bravery in Action")] }),
      ref,
    );
    expect(withFeat1.initiative.total).toBe(base1.initiative.total);
  });

  it("Social Bravery: morale bonus equal to Bravery on Bluff and Intimidate, at two fighter levels", () => {
    const base2 = compute(makeDoc({ classes: [{ tag: "fighter", level: 2 }] }), ref);
    const with2 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 2 }], feats: [featId("Social Bravery")] }),
      ref,
    );
    expect(with2.skills.blf?.total).toBe((base2.skills.blf?.total ?? 0) + 1);
    expect(with2.skills.int?.total).toBe((base2.skills.int?.total ?? 0) + 1);

    const base6 = compute(makeDoc({ classes: [{ tag: "fighter", level: 6 }] }), ref);
    const with6 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 6 }], feats: [featId("Social Bravery")] }),
      ref,
    );
    expect(with6.skills.blf?.total).toBe((base6.skills.blf?.total ?? 0) + 2);
    expect(with6.skills.int?.total).toBe((base6.skills.int?.total ?? 0) + 2);
  });

  it("Unbound Bravery: adds the Bravery bonus to Escape Artist checks", () => {
    const base = compute(makeDoc({ classes: [{ tag: "fighter", level: 6 }] }), ref);
    const withFeat = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 6 }], feats: [featId("Unbound Bravery")] }),
      ref,
    );
    expect(withFeat.skills.esc?.total).toBe((base.skills.esc?.total ?? 0) + 2);
  });

  it("Undaunted Bravery: adds the Bravery bonus to Intimidate checks", () => {
    const base = compute(makeDoc({ classes: [{ tag: "fighter", level: 6 }] }), ref);
    const withFeat = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 6 }], feats: [featId("Undaunted Bravery")] }),
      ref,
    );
    expect(withFeat.skills.int?.total).toBe((base.skills.int?.total ?? 0) + 2);
  });
});

describe("Natural armor: 'increase' sums, an ordinary bonus competes", () => {
  it("Ironhide (+1 untyped nac) and Improved Natural Armor (+1 increase) both apply and sum", () => {
    const sheet = compute(
      makeDoc({ feats: [featId("Ironhide"), featId("Improved Natural Armor")] }),
      ref,
    );
    // 10 + 1 (Ironhide, natural) + 1 (Improved Natural Armor, increase) = 12.
    expect(sheet.ac.normal).toBe(12);
    const natural = sheet.ac.components.filter((c) => c.category === "natural");
    expect(natural.every((c) => c.applied)).toBe(true);
  });

  it("Armor of the Pit (+2 untyped nac) beats Ironhide (+1) — same type competes highest-wins", () => {
    const sheet = compute(
      makeDoc({ feats: [featId("Ironhide"), featId("Armor of the Pit")] }),
      ref,
    );
    // 10 + 2 (Armor of the Pit wins the natural-armor competition) = 12.
    expect(sheet.ac.normal).toBe(12);
    const ironhide = sheet.ac.components.find((c) => c.source === "Ironhide");
    expect(ironhide?.applied).toBe(false);
  });

  it("Improved Natural Armor taken twice (extraFeats) sums to +2, not highest-wins", () => {
    const featIdVal = featId("Improved Natural Armor");
    const sheet = compute(
      makeDoc({
        feats: [featIdVal],
        extraFeats: [{ instanceId: "ina-2", featId: featIdVal }],
      }),
      ref,
    );
    // 10 + 1 + 1 (two independent increase Changes) = 12.
    expect(sheet.ac.normal).toBe(12);
  });

  it("Stone Soul (+1 increase) sums with Ironhide (+1 untyped) rather than competing", () => {
    const sheet = compute(makeDoc({ feats: [featId("Ironhide"), featId("Stone Soul")] }), ref);
    // 10 + 1 (Ironhide, natural) + 1 (Stone Soul, increase) = 12.
    expect(sheet.ac.normal).toBe(12);
  });
});
