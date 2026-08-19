import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { CHANNEL_VARIANTS, channelVariantFor, compute, deriveResourcePools } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeClericDoc(archetypes: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Vessel",
      race: raceId("Human"),
      classes: [{ tag: "cleric", level: 5 }],
    },
    // Cha 14 (+2): 3 + 2 = 5 uses/day; L5 dice count ceil(5/2) = 3; DC 10 + 2 + 2 = 14.
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes,
    },
    live: {
      hp: { current: 30, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("CHANNEL_VARIANTS (drift guards)", () => {
  it("every def's key equals its archetypeId and resolves to a vendored archetype of that class", () => {
    for (const [key, def] of Object.entries(CHANNEL_VARIANTS)) {
      expect(def.archetypeId).toBe(key);
      const archetype = ref.archetypes[key];
      expect(archetype, `${key}: no vendored archetype under this id`).toBeDefined();
      expect(`${archetype!.classTag}:`).toBe(key.slice(0, archetype!.classTag.length + 1));
      // A def with no formula override at all belongs in a classification
      // note, not this table.
      expect(
        def.usesFormula !== undefined ||
          def.damageFormula !== undefined ||
          def.dcFormula !== undefined,
        `${key}: no formula override`,
      ).toBe(true);
    }
  });
});

describe("channelVariantFor", () => {
  it("matches only the granting class's own archetype", () => {
    const doc = makeClericDoc(["cleric:fiendish-vessel"]);
    expect(channelVariantFor(doc, "cleric")?.archetypeId).toBe("cleric:fiendish-vessel");
    expect(channelVariantFor(doc, "paladin")).toBeUndefined();
  });

  it("returns undefined with no archetypes chosen", () => {
    expect(channelVariantFor(makeClericDoc([]), "cleric")).toBeUndefined();
  });
});

describe("Fiendish Vessel's Channel Evil (Cheliax, Empire of Devils p.21, hand-computed)", () => {
  it("cleric 5 baseline: Channel Energy 3d6 (DC 14 Will), 5/day", () => {
    const doc = makeClericDoc([]);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy")!;
    expect(channel.max).toBe(5);
    expect(channel.detail).toBe("3d6 (DC 14 Will)");
  });

  it("with the archetype: renamed Channel Evil, d4 dice on the same schedule, same DC and uses", () => {
    const doc = makeClericDoc(["cleric:fiendish-vessel"]);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Channel Energy")).toBeUndefined();
    const channel = pools.find((p) => p.name === "Channel Evil")!;
    expect(channel).toBeDefined();
    // Pool id stays the vendored feature's id, so an existing character's
    // drained count survives adopting the archetype.
    expect(channel.max).toBe(5);
    expect(channel.per).toBe("day");
    expect(channel.detail).toBe(
      "3d4 (DC 14 Will) · heals evil creatures and harms good ones; a good creature that fails its save is sickened for 1d4 rounds",
    );
  });

  it("an unrelated archetype leaves the base progression alone", () => {
    const doc = makeClericDoc(["cleric:ecclesitheurge"]);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Channel Energy")?.detail).toBe("3d6 (DC 14 Will)");
  });
});
