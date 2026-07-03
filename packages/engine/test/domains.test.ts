import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { deriveResourcePools, resolveClassFeatures } from "../src/index.js";
import type { AbilityView } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "cleric", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      clericDomains,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function domainFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures.filter((f) => f.origin?.kind === "domain").map((f) => f.name).sort();
}

describe("cleric domain powers", () => {
  it("a level-1 cleric with Fire domain gets Fire Bolt, not Fire Resistance (level 6)", () => {
    const doc = makeCleric(1, ["Fire"]);
    expect(domainFeatureNames(doc)).toEqual(["Fire Bolt"]);

    const { classFeatures } = resolveClassFeatures(doc, ref);
    const fireBolt = classFeatures.find((f) => f.name === "Fire Bolt")!;
    expect(fireBolt.origin).toEqual({ kind: "domain", label: "Fire Domain" });
    expect(fireBolt.classTag).toBe("cleric");
  });

  it("a level-6 cleric with Fire domain gets both Fire Bolt and Fire Resistance", () => {
    const doc = makeCleric(6, ["Fire"]);
    expect(domainFeatureNames(doc)).toEqual(["Fire Bolt", "Fire Resistance"]);
  });

  it("no chosen domain grants no domain-origin features", () => {
    const doc = makeCleric(6, []);
    expect(domainFeatureNames(doc)).toEqual([]);
  });

  it("an unresolvable domain tag (e.g. a subdomain) grants nothing, not an error", () => {
    const doc = makeCleric(6, ["Ash"]);
    expect(domainFeatureNames(doc)).toEqual([]);
  });

  it("Fire Bolt surfaces as a resource pool with max = 3 + Wis mod", () => {
    const doc = makeCleric(1, ["Fire"]);
    const abilities: Record<string, AbilityView> = {
      wis: { base: 16, total: 16, mod: 3 },
    };
    const pools = deriveResourcePools(doc, ref, abilities);
    const fireBolt = pools.find((p) => p.name === "Fire Bolt");
    expect(fireBolt).toBeDefined();
    expect(fireBolt!.max).toBe(6);
    expect(fireBolt!.per).toBe("day");
    expect(fireBolt!.classTag).toBe("cleric");
  });
});
