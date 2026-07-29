import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Issue #34 (bloodline arcana + powers) gave `build.sorcererBloodline` real
 * numeric weight: a KNOWN bloodline tag (one of the 10 CRB bloodlines
 * hand-authored in `@pf1/engine` `bloodlines.ts`) now changes `compute()`'s
 * output (e.g. Draconic's +1 HP/level arcana). An UNKNOWN tag, or the field
 * set on a non-sorcerer, still changes nothing — same posture as an
 * unresolvable cleric domain/wizard school tag.
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
  sorcererBloodlineVariant?: string,
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
      ...(sorcererBloodlineVariant ? { sorcererBloodlineVariant } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute() + build.sorcererBloodline (issue #34)", () => {
  it("a Draconic sorcerer 7 gets +7 HP (arcana) over the same doc with no bloodline", () => {
    const withBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], "Draconic"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], undefined), ref);
    expect(withBloodline.hp.max).toBe(withoutBloodline.hp.max + 7);
    const bonus = withBloodline.hp.components.find((c) => c.source.includes("Draconic"));
    expect(bonus).toBeDefined();
    expect(bonus!.value).toBe(7);
    expect(bonus!.applied).toBe(true);
  });

  it("an unknown bloodline tag computes byte-identically to no bloodline (engine ignores it)", () => {
    const withUnknown = compute(makeDoc([{ tag: "sorcerer", level: 7 }], "NotARealBloodline"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], undefined), ref);
    expect(withUnknown).toEqual(withoutBloodline);
  });

  it("a non-sorcerer with a stale Draconic bloodline field gets nothing", () => {
    const withBloodline = compute(makeDoc([{ tag: "fighter", level: 7 }], "Draconic"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "fighter", level: 7 }], undefined), ref);
    expect(withBloodline).toEqual(withoutBloodline);
  });
});

/**
 * Variant-dependent bloodline powers (`BloodlinePower.variantChanges`, keyed
 * off `build.sorcererBloodlineVariant`): Dragon Resistances' energy
 * resistance, Elemental Resistance, and Elemental Movement. RAW citations
 * live on the entries (aonprd.com's sorcerer BloodlineDisplay pages);
 * expected values hand-computed from the text quoted there.
 */
describe("variant-dependent bloodline powers (build.sorcererBloodlineVariant)", () => {
  const resist = (doc: CharacterDoc, qualifier: string) =>
    compute(doc, ref).defenses?.resistances.find((r) => r.qualifier === qualifier)?.total;

  it("Dragon Resistances: a red-dragon sorcerer gets fire resistance 5, then 10 at 9th (never 20)", () => {
    expect(resist(makeDoc([{ tag: "sorcerer", level: 3 }], "Draconic", "red"), "fire")).toBe(5);
    expect(resist(makeDoc([{ tag: "sorcerer", level: 9 }], "Draconic", "red"), "fire")).toBe(10);
    // At 15th only the natural armor steps up — resistance stays 10.
    expect(resist(makeDoc([{ tag: "sorcerer", level: 15 }], "Draconic", "red"), "fire")).toBe(10);
  });

  it("Dragon Resistances: the dragon type sets the energy (silver → cold), and no variant emits nothing", () => {
    expect(resist(makeDoc([{ tag: "sorcerer", level: 9 }], "Draconic", "silver"), "cold")).toBe(10);
    const noVariant = compute(makeDoc([{ tag: "sorcerer", level: 9 }], "Draconic"), ref);
    expect(noVariant.defenses?.resistances ?? []).toEqual([]);
    // The natural-armor half never depended on the variant.
    const withVariant = compute(
      makeDoc([{ tag: "sorcerer", level: 9 }], "Draconic", "silver"),
      ref,
    );
    expect(noVariant.ac.normal).toBe(withVariant.ac.normal);
  });

  it("Elemental Resistance: chosen element's energy at 10, then 20 at 9th (water → cold)", () => {
    expect(resist(makeDoc([{ tag: "sorcerer", level: 3 }], "Elemental", "water"), "cold")).toBe(10);
    expect(resist(makeDoc([{ tag: "sorcerer", level: 9 }], "Elemental", "water"), "cold")).toBe(20);
  });

  it("Elemental Movement at 15th: air grants fly 60, earth burrow 30, water swim 60 (set, not add)", () => {
    const air = compute(makeDoc([{ tag: "sorcerer", level: 15 }], "Elemental", "air"), ref);
    expect(air.speeds.fly).toBe(60);
    const earth = compute(makeDoc([{ tag: "sorcerer", level: 15 }], "Elemental", "earth"), ref);
    expect(earth.speeds.burrow).toBe(30);
    const water = compute(makeDoc([{ tag: "sorcerer", level: 15 }], "Elemental", "water"), ref);
    expect(water.speeds.swim).toBe(60);
  });

  it("Elemental Movement: fire's +30 ft. is additive to land speed, and nothing moves below 15th", () => {
    const fire = compute(makeDoc([{ tag: "sorcerer", level: 15 }], "Elemental", "fire"), ref);
    const baseline = compute(makeDoc([{ tag: "sorcerer", level: 15 }], "Elemental"), ref);
    expect(fire.speeds.land).toBe(baseline.speeds.land! + 30);
    const below = compute(makeDoc([{ tag: "sorcerer", level: 14 }], "Elemental", "air"), ref);
    expect(below.speeds.fly ?? 0).toBe(0);
  });

  it("a stale variant id (option since renamed) emits nothing", () => {
    const sheet = compute(makeDoc([{ tag: "sorcerer", level: 9 }], "Elemental", "aether"), ref);
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });
});
