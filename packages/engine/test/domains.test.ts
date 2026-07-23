import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, resolveClassFeatures } from "../src/index.js";
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
  return classFeatures
    .filter((f) => f.origin?.kind === "domain")
    .map((f) => f.name)
    .sort();
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

  it("an unresolvable domain tag grants nothing, not an error", () => {
    const doc = makeCleric(6, ["NotARealDomain"]);
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

describe("cleric subdomain selection (in place of a parent domain)", () => {
  it("Ash (Fire's subdomain, no structured override) grants exactly what Fire itself grants", () => {
    const withAsh = makeCleric(6, ["Ash"]);
    const withFire = makeCleric(6, ["Fire"]);
    expect(domainFeatureNames(withAsh)).toEqual(domainFeatureNames(withFire));
    expect(domainFeatureNames(withAsh)).toEqual(["Fire Bolt", "Fire Resistance"]);

    const { classFeatures } = resolveClassFeatures(withAsh, ref);
    const fireBolt = classFeatures.find((f) => f.name === "Fire Bolt")!;
    // Label names the subdomain actually chosen, not its parent.
    expect(fireBolt.origin).toEqual({ kind: "domain", label: "Ash Subdomain" });
  });

  it("Cloud (Air's subdomain, structured override) replaces Air's 2nd power with Thundercloud at level 8, keeps Lightning Arc", () => {
    const withCloud = makeCleric(8, ["Cloud"]);
    expect(domainFeatureNames(withCloud)).toEqual(["Lightning Arc", "Thundercloud"]);

    // Air itself grants Electricity Resistance at level 6, not Thundercloud —
    // confirms the subdomain's own `features` fully replaces Air's, not merges.
    const withAir = makeCleric(8, ["Air"]);
    expect(domainFeatureNames(withAir)).toEqual(["Electricity Resistance", "Lightning Arc"]);
  });

  it("Cloud's 8th-level Thundercloud is gated by cleric level like any other grant", () => {
    const doc = makeCleric(6, ["Cloud"]);
    expect(domainFeatureNames(doc)).toEqual(["Lightning Arc"]);
  });
});

describe("cleric domain / subdomain direct changes (issue #99)", () => {
  const saveTotals = (doc: CharacterDoc) => {
    const sheet = compute(doc, ref);
    return {
      fort: sheet.saves.fort.total,
      ref: sheet.saves.ref.total,
      will: sheet.saves.will.total,
    };
  };

  it("Protection domain grants a +1 resistance bonus to all saves at level 1", () => {
    const withProtection = saveTotals(makeCleric(1, ["Protection"]));
    const withoutDomain = saveTotals(makeCleric(1, []));
    expect(withProtection.fort - withoutDomain.fort).toBe(1);
    expect(withProtection.ref - withoutDomain.ref).toBe(1);
    expect(withProtection.will - withoutDomain.will).toBe(1);
  });

  it("Protection's save bonus scales to +2 at level 5 and +3 at level 10 (1 + floor(level/5))", () => {
    const l5 = saveTotals(makeCleric(5, ["Protection"]));
    const l5None = saveTotals(makeCleric(5, []));
    expect(l5.will - l5None.will).toBe(2);

    const l10 = saveTotals(makeCleric(10, ["Protection"]));
    const l10None = saveTotals(makeCleric(10, []));
    expect(l10.will - l10None.will).toBe(3);
  });

  it("Purity subdomain (Protection's subdomain) grants the same save resistance", () => {
    const withPurity = saveTotals(makeCleric(5, ["Purity"]));
    const withoutDomain = saveTotals(makeCleric(5, []));
    expect(withPurity.fort - withoutDomain.fort).toBe(2);
    expect(withPurity.ref - withoutDomain.ref).toBe(2);
    expect(withPurity.will - withoutDomain.will).toBe(2);
  });

  it("Travel domain grants +10 base land speed", () => {
    const withTravel = compute(makeCleric(1, ["Travel"]), ref);
    const withoutDomain = compute(makeCleric(1, []), ref);
    expect((withTravel.speeds.land ?? 0) - (withoutDomain.speeds.land ?? 0)).toBe(10);
  });

  it("a domain change is inert without cleric levels (stale tag on a non-cleric)", () => {
    // Same doc shape but the class isn't cleric — the gate must skip it.
    const wizardWithStaleDomain: CharacterDoc = {
      ...makeCleric(5, ["Protection"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "wizard", level: 5 }],
      },
    };
    const wizardNoDomain: CharacterDoc = {
      ...wizardWithStaleDomain,
      build: { ...wizardWithStaleDomain.build, clericDomains: [] },
    };
    expect(saveTotals(wizardWithStaleDomain)).toEqual(saveTotals(wizardNoDomain));
  });

  it("a domain with no direct changes (Fire) contributes no save/speed modifier", () => {
    const withFire = saveTotals(makeCleric(5, ["Fire"]));
    const withoutDomain = saveTotals(makeCleric(5, []));
    expect(withFire).toEqual(withoutDomain);
  });
});
