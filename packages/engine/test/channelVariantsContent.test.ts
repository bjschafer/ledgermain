/**
 * Hand-computed fixtures for the content-wave CHANNEL_VARIANTS entries added
 * alongside `cleric:fiendish-vessel` (see `channel-variants.ts`'s module doc
 * comment for the mechanism, and `channelVariants.test.ts` for the
 * mechanism-level drift guards this file doesn't repeat): Blossoming Light's
 * Luminous Font, Evangelist's Sermonic Performance, Scroll Scholar's Secrets
 * Revealed, and Hospitaler's Channel Positive Energy.
 */

import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human, single class as given, abilities defaulting to 10 with overrides, plus archetypes. */
function makeDoc(over: {
  classTag: string;
  level: number;
  abilities?: Partial<Record<AbilityId, number>>;
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "channel-variants-content-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: over.classTag, level: over.level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: over.archetypes ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Hospitaler's Channel Positive Energy (Advanced Player's Guide p.62, hand-computed)", () => {
  it("paladin 7, Cha 14 (+2): own 3+Cha pool at paladin level -3 effective, separate from lay on hands", () => {
    const doc = makeDoc({
      classTag: "paladin",
      level: 7,
      abilities: { cha: 14 },
      archetypes: ["paladin:hospitaler"],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channel = pools.find((p) => p.name === "Channel Positive Energy")!;
    expect(channel).toBeDefined();
    // 3 + Cha mod (+2) = 5, its own daily pool.
    expect(channel.max).toBe(5);
    expect(channel.per).toBe("day");
    expect(channel.classTag).toBe("paladin");
    // Effective level 7 - 3 = 4: dice ceil(4/2) = 2d6, DC 10 + floor(4/2) + 2 = 14.
    expect(channel.detail).toBe(
      "2d6 (DC 14 Will) · its own resource pool, separate from lay on hands",
    );

    // No longer merges into lay on hands' detail line (base paladin Channel
    // Positive Energy is a lay-on-hands-uses spend; hospitaler's isn't).
    const layOnHands = pools.find((p) => p.name === "Lay on Hands");
    expect(layOnHands).toBeDefined();
    expect(layOnHands!.detail ?? "").not.toContain("Channel Positive Energy");

    const dcRow = sheet.abilityDCs?.find((d) => d.key === "channel");
    expect(dcRow?.dc).toBe(14);
    expect(dcRow?.save).toBe("Will");
  });
});

describe("Evangelist's Sermonic Performance (Ultimate Combat, hand-computed)", () => {
  it("cleric 15, Cha 14 (+2): channel energy dice capped at 7d6, DC unaffected", () => {
    const doc = makeDoc({
      classTag: "cleric",
      level: 15,
      abilities: { cha: 14 },
      archetypes: ["cleric:evangelist"],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channel = pools.find((p) => p.name === "Channel Energy")!;
    expect(channel).toBeDefined();
    expect(channel.max).toBe(5); // 3 + Cha mod (+2), unaffected
    // Uncapped cleric 15 would be ceil(15/2) = 8d6; capped at 7d6.
    // DC 10 + floor(15/2) + 2 = 19, unaffected by the archetype.
    expect(channel.detail).toBe("7d6 (DC 19 Will)");
  });
});

describe("Scroll Scholar's Secrets Revealed (Pathfinder Society Field Guide, hand-computed)", () => {
  it("cleric 5, Cha 14 (+2): the normal 5th-level bump to 3d6 is skipped, holding at 2d6", () => {
    const doc = makeDoc({
      classTag: "cleric",
      level: 5,
      abilities: { cha: 14 },
      archetypes: ["cleric:scroll-scholar"],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channel = pools.find((p) => p.name === "Channel Energy")!;
    expect(channel).toBeDefined();
    // Baseline cleric 5 would be ceil(5/2) = 3d6; Secrets Revealed holds it
    // at the pre-5th-level value (2d6). DC 10 + floor(5/2) + 2 = 14, unaffected.
    expect(channel.detail).toBe("2d6 (DC 14 Will)");
  });

  it("cleric 9, Cha 14 (+2): now running exactly 1d6 behind the normal progression", () => {
    const doc = makeDoc({
      classTag: "cleric",
      level: 9,
      abilities: { cha: 14 },
      archetypes: ["cleric:scroll-scholar"],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channel = pools.find((p) => p.name === "Channel Energy")!;
    expect(channel).toBeDefined();
    // Baseline cleric 9 would be ceil(9/2) = 5d6; Secrets Revealed's shifted
    // schedule gives ceil((9-2)/2) = 4d6 — 1d6 behind, matching the rules
    // text. DC 10 + floor(9/2) + 2 = 16, unaffected.
    expect(channel.detail).toBe("4d6 (DC 16 Will)");
  });
});

describe("Blossoming Light's Luminous Font (Adventurer's Guide p.112, hand-computed)", () => {
  it("cleric 5, Cha 14 (+2): pool enlarged to 5 + Cha + a level-scaled bump, dice/DC unaffected", () => {
    const doc = makeDoc({
      classTag: "cleric",
      level: 5,
      abilities: { cha: 14 },
      archetypes: ["cleric:blossoming-light"],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    expect(pools.find((p) => p.name === "Channel Energy")).toBeUndefined();
    const channel = pools.find((p) => p.name === "Luminous Font")!;
    expect(channel).toBeDefined();
    // 5 + Cha mod (+2) + floor(5/2) = 5 + 2 + 2 = 9, well above the vendored
    // flat 3 + Cha mod (5).
    expect(channel.max).toBe(9);
    expect(channel.per).toBe("day");
    // Dice/DC untouched: ceil(5/2) = 3d6, DC 10 + floor(5/2) + 2 = 14.
    expect(channel.detail).toBe(
      "3d6 (DC 14 Will) · at 7th level an additional use fills the area with daylight for a number of rounds equal to cleric level; at 10th level she can use atonement once per day as a spell-like ability to offer redemption to others",
    );
  });
});
