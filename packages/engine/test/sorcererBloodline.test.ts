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

/**
 * 20th-level capstone immunities/senses/DR, newly wired to real Change
 * targets (imm.<type>/immEffect.<slug>/sense*) rather than left display-only.
 * RAW citations live on each entry in `bloodlines.ts`; expected values
 * hand-computed from the quoted text.
 */
describe("sorcerer bloodline capstone immunities/senses (20th level)", () => {
  const immune = (doc: CharacterDoc, qualifier: string) =>
    compute(doc, ref).defenses?.immunities?.some((i) => i.qualifier === qualifier) ?? false;
  const effectImmune = (doc: CharacterDoc, qualifier: string) =>
    compute(doc, ref).defenses?.effectImmunities?.some((i) => i.qualifier === qualifier) ?? false;
  const senseRange = (doc: CharacterDoc, kind: string) =>
    compute(doc, ref).senses.find((s) => s.kind === kind)?.range;

  it("Aberrant Form: immune to critical hits and precision damage, blindsight 60, DR 5/—", () => {
    // RAW: "You are immune to critical hits and sneak attacks. In addition,
    // you gain blindsight with a range of 60 feet and damage reduction 5/—."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Aberrant");
    expect(effectImmune(doc, "criticalHits")).toBe(true);
    expect(effectImmune(doc, "precisionDamage")).toBe(true);
    expect(senseRange(doc, "blindsight")).toBe(60);
    expect(compute(doc, ref).defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(5);
  });

  it("Demonic Might: immune to electricity and poison", () => {
    // RAW: "You gain immunity to electricity and poison."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Abyssal");
    expect(immune(doc, "electricity")).toBe(true);
    expect(effectImmune(doc, "poison")).toBe(true);
  });

  it("Ascension: immune to acid and cold (petrification has no matching slug)", () => {
    // RAW: "You gain immunity to acid, cold, and petrification."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Celestial");
    expect(immune(doc, "acid")).toBe(true);
    expect(immune(doc, "cold")).toBe(true);
  });

  it("Power of Wyrms: immune to paralysis, sleep, and your energy type; blindsense 60 (red → fire)", () => {
    // RAW: "You gain immunity to paralysis, sleep, and damage of your energy
    // type. You also gain blindsense 60 feet."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Draconic", "red");
    expect(effectImmune(doc, "paralysis")).toBe(true);
    expect(effectImmune(doc, "sleep")).toBe(true);
    expect(immune(doc, "fire")).toBe(true);
    expect(senseRange(doc, "blindsense")).toBe(60);
    // No stored variant: the energy immunity doesn't fire, but the
    // level-gated paralysis/sleep immunity and blindsense still do.
    const noVariant = makeDoc([{ tag: "sorcerer", level: 20 }], "Draconic");
    expect(immune(noVariant, "fire")).toBe(false);
    expect(effectImmune(noVariant, "paralysis")).toBe(true);
  });

  it("Elemental Body: immune to precision damage, critical hits, and your energy type (fire → fire)", () => {
    // RAW: "You gain immunity to sneak attacks, critical hits, and damage
    // from your energy type."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Elemental", "fire");
    expect(effectImmune(doc, "precisionDamage")).toBe(true);
    expect(effectImmune(doc, "criticalHits")).toBe(true);
    expect(immune(doc, "fire")).toBe(true);
    const water = makeDoc([{ tag: "sorcerer", level: 20 }], "Elemental", "water");
    expect(immune(water, "fire")).toBe(false);
    expect(immune(water, "cold")).toBe(true);
  });

  it("Soul of the Fey: immune to poison", () => {
    // RAW: "You gain immunity to poison and DR 10/cold iron."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Fey");
    expect(effectImmune(doc, "poison")).toBe(true);
    expect(compute(doc, ref).defenses?.dr.find((d) => d.qualifier === "cold-iron")?.total).toBe(10);
  });

  it("Power of the Pit: immune to fire and poison, darkvision 60", () => {
    // RAW: "You gain immunity to fire and poison. ... the ability to see
    // perfectly in darkness of any kind to a range of 60 feet."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Infernal");
    expect(immune(doc, "fire")).toBe(true);
    expect(effectImmune(doc, "poison")).toBe(true);
    expect(senseRange(doc, "darkvision")).toBe(60);
  });

  it("One of Us: immune to cold, paralysis, sleep; DR 5/—", () => {
    // RAW: "You gain immunity to cold, nonlethal damage, paralysis, and
    // sleep. You also gain DR 5/—."
    const doc = makeDoc([{ tag: "sorcerer", level: 20 }], "Undead");
    expect(immune(doc, "cold")).toBe(true);
    expect(effectImmune(doc, "paralysis")).toBe(true);
    expect(effectImmune(doc, "sleep")).toBe(true);
    expect(compute(doc, ref).defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(5);
  });
});
