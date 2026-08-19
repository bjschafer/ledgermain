/**
 * Hand-computed fixtures for the prestige-class channel rules in
 * `channel-variants.ts`'s prestige section: Holy Vindicator's general level
 * stack (APG p.263, "The vindicator's class level stacks with levels in any
 * other class that grants the channel energy ability") and Death Slayer's
 * standalone harm-undead grant (Adventurer's Guide p.152, "functions as a
 * cleric's ability to channel positive energy to deal damage to undead"),
 * whose vendored Channel Energy features carry no formulas of their own.
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

/** Human, classes as given, abilities defaulting to 10 with overrides. */
function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: Partial<Record<AbilityId, number>>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "channel-prestige-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Holy Vindicator channel stacking (APG p.263, hand-computed)", () => {
  it("cleric 5 / vindicator 3, Cha 14 (+2): dice and DC evaluate at combined level 8", () => {
    const doc = makeDoc({
      classes: [
        { tag: "cleric", level: 5 },
        { tag: "holyVindicator", level: 3 },
      ],
      abilities: { cha: 14 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channels = pools.filter((p) => p.name === "Channel Energy");
    // The vindicator's own bare Channel Energy feature must not spawn a
    // second pool — its levels fold into the cleric's.
    expect(channels).toHaveLength(1);
    const channel = channels[0]!;
    // Uses stay 3 + Cha mod (+2) = 5: the uses formula carries no level term.
    expect(channel.max).toBe(5);
    expect(channel.classTag).toBe("cleric");
    // Combined level 5 + 3 = 8: dice ceil(8/2) = 4d6, DC 10 + floor(8/2) + 2 = 16.
    expect(channel.detail).toBe("4d6 (DC 16 Will)");

    const dcRows = sheet.abilityDCs?.filter((d) => d.key === "channel") ?? [];
    expect(dcRows).toHaveLength(1);
    expect(dcRows[0]!.dc).toBe(16);
    expect(dcRows[0]!.save).toBe("Will");
  });
});

describe("Death Slayer standalone channel grant (Adventurer's Guide p.152, hand-computed)", () => {
  it("death slayer 3 with no base channel class, Cha 14 (+2): cleric-shaped numbers at slayer level", () => {
    const doc = makeDoc({
      classes: [{ tag: "deathSlayer", level: 3 }],
      abilities: { cha: 14 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channel = pools.find((p) => p.name === "Channel Energy")!;
    expect(channel).toBeDefined();
    // 3 + Cha mod (+2) = 5 uses/day, its own pool.
    expect(channel.max).toBe(5);
    expect(channel.per).toBe("day");
    // Level 3: dice ceil(3/2) = 2d6, DC 10 + floor(3/2) + 2 = 13.
    expect(channel.detail).toBe(
      "2d6 (DC 13 Will) · harms undead only, never heals or harms the living",
    );

    const dcRows = sheet.abilityDCs?.filter((d) => d.key === "channel") ?? [];
    expect(dcRows).toHaveLength(1);
    expect(dcRows[0]!.dc).toBe(13);
    expect(dcRows[0]!.save).toBe("Will");
  });

  it("cleric 3 / death slayer 2, Cha 14 (+2): no second pool, dice-stack reminder note only", () => {
    const doc = makeDoc({
      classes: [
        { tag: "cleric", level: 3 },
        { tag: "deathSlayer", level: 2 },
      ],
      abilities: { cha: 14 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);

    const channels = pools.filter((p) => p.name === "Channel Energy");
    // Death Slayer's stack is dice-only AND undead-only, so the cleric's
    // numbers stay at cleric level 3 (2d6, DC 10 + 1 + 2 = 13) with a
    // reminder note rather than a formula substitution.
    expect(channels).toHaveLength(1);
    expect(channels[0]!.classTag).toBe("cleric");
    expect(channels[0]!.max).toBe(5);
    expect(channels[0]!.detail).toBe(
      "2d6 (DC 13 Will) · Death Slayer levels stack when determining damage dice against undead",
    );

    const dcRows = sheet.abilityDCs?.filter((d) => d.key === "channel") ?? [];
    expect(dcRows).toHaveLength(1);
    expect(dcRows[0]!.dc).toBe(13);
  });
});
