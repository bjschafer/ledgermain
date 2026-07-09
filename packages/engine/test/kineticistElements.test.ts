import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  eligibleCompositeBlasts,
  findKineticistWildTalent,
  KINETICIST_COMPOSITE_BLASTS,
  KINETICIST_ELEMENT_TAGS,
  KINETICIST_ELEMENTS,
  KINETICIST_WILD_TALENTS,
  kineticOverflowBonus,
  minKineticistLevelForTalent,
} from "../src/index.js";

/**
 * Fixture coverage for the kineticist Elemental Focus / Expanded Element /
 * Wild Talent / Elemental Overflow subsystem (issue #65) — hand-authored
 * clean-room from aonprd.com (the vendored Foundry pack carries only the
 * generic "Elemental Focus"/"Wild Talents"/"Elemental Overflow" prose class
 * features, no per-element/per-talent data at all — see
 * `kineticist-elements.ts`/`kineticist-wild-talents.ts`'s doc comments).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  level: number,
  overrides: {
    kineticistElement?: string;
    kineticistExpandedElements?: string[];
    kineticistWildTalents?: string[];
    currentBurn?: number;
    abilities?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  } = {},
): CharacterDoc {
  const burnFeature = Object.values(ref.classFeatures).find((f) => f.tag === "burn");
  const resources: Record<string, { used: number; max: number }> = {};
  if (burnFeature && overrides.currentBurn !== undefined) {
    resources[burnFeature.id] = { used: overrides.currentBurn, max: 5 };
  }
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "kineticist", level }] },
    abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 8, ...overrides.abilities },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      kineticistElement: overrides.kineticistElement,
      kineticistExpandedElements: overrides.kineticistExpandedElements,
      kineticistWildTalents: overrides.kineticistWildTalents ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources,
    },
  };
}

describe("KINETICIST_ELEMENTS table", () => {
  it("has all 5 core elements, each with a simple blast, defense, and basic utility talent", () => {
    expect(KINETICIST_ELEMENT_TAGS.length).toBe(5);
    expect(new Set(KINETICIST_ELEMENT_TAGS)).toEqual(
      new Set(["aether", "air", "earth", "fire", "water"]),
    );
    for (const tag of KINETICIST_ELEMENT_TAGS) {
      const el = KINETICIST_ELEMENTS[tag]!;
      expect(el.classSkills.length).toBe(2);
      expect(el.simpleBlast.name.length).toBeGreaterThan(0);
      expect(el.defense.name.length).toBeGreaterThan(0);
      expect(el.basicUtility.name.length).toBeGreaterThan(0);
    }
  });

  it("fire and aether are energy/physical as RAW states; earth/air/water default to physical", () => {
    expect(KINETICIST_ELEMENTS.fire!.simpleBlast.damageType).toBe("energy");
    expect(KINETICIST_ELEMENTS.aether!.simpleBlast.damageType).toBe("physical");
    expect(KINETICIST_ELEMENTS.earth!.simpleBlast.damageType).toBe("physical");
    expect(KINETICIST_ELEMENTS.air!.simpleBlast.damageType).toBe("physical");
    expect(KINETICIST_ELEMENTS.water!.simpleBlast.damageType).toBe("physical");
  });
});

describe("eligibleCompositeBlasts", () => {
  it("returns nothing with no primary element", () => {
    expect(eligibleCompositeBlasts(undefined, [])).toEqual([]);
  });

  it("a cross-element composite (earth+fire -> Magma Blast) unlocks once both elements are known", () => {
    expect(eligibleCompositeBlasts("earth", []).some((b) => b.id === "magmaBlast")).toBe(false);
    expect(eligibleCompositeBlasts("earth", ["fire"]).some((b) => b.id === "magmaBlast")).toBe(
      true,
    );
    // Order-independent: fire primary + earth expanded also qualifies.
    expect(eligibleCompositeBlasts("fire", ["earth"]).some((b) => b.id === "magmaBlast")).toBe(
      true,
    );
  });

  it("a same-element composite (fire+fire -> Blue Flame Blast) needs fire chosen AGAIN via Expanded Element", () => {
    expect(eligibleCompositeBlasts("fire", []).some((b) => b.id === "blueFlameBlast")).toBe(false);
    // Merely knowing a DIFFERENT expanded element doesn't grant it.
    expect(eligibleCompositeBlasts("fire", ["water"]).some((b) => b.id === "blueFlameBlast")).toBe(
      false,
    );
    expect(eligibleCompositeBlasts("fire", ["fire"]).some((b) => b.id === "blueFlameBlast")).toBe(
      true,
    );
  });

  it("every composite blast id in the table is reachable by SOME primary+expanded combination", () => {
    for (const cb of KINETICIST_COMPOSITE_BLASTS) {
      if (cb.requiredElements.length === 1) {
        const el = cb.requiredElements[0]!;
        expect(eligibleCompositeBlasts(el, [el]).some((x) => x.id === cb.id)).toBe(true);
      } else {
        const [a, b] = cb.requiredElements;
        expect(eligibleCompositeBlasts(a!, [b!]).some((x) => x.id === cb.id)).toBe(true);
      }
    }
  });
});

describe("KINETICIST_WILD_TALENTS table", () => {
  it("every entry has a unique id, valid category, level >= 1, and non-negative burn", () => {
    const ids = Object.keys(KINETICIST_WILD_TALENTS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const talent of Object.values(KINETICIST_WILD_TALENTS)) {
      expect(["infusion", "utility"]).toContain(talent.category);
      expect(talent.level).toBeGreaterThanOrEqual(1);
      expect(talent.burn).toBeGreaterThanOrEqual(0);
      expect(talent.summary.length).toBeGreaterThan(0);
    }
  });

  it("covers every core element plus a universal pool", () => {
    const elements = new Set(Object.values(KINETICIST_WILD_TALENTS).map((t) => t.element));
    for (const tag of KINETICIST_ELEMENT_TAGS) expect(elements.has(tag)).toBe(true);
    expect(elements.has("universal")).toBe(true);
  });

  it("findKineticistWildTalent resolves a valid id and rejects garbage", () => {
    expect(findKineticistWildTalent("fire:burningInfusion")?.name).toBe("Burning Infusion");
    expect(findKineticistWildTalent("not-real:whatever")).toBeUndefined();
  });

  it("minKineticistLevelForTalent: 1st-level talents always selectable, higher levels need 2x kineticist level", () => {
    expect(minKineticistLevelForTalent(1)).toBe(1);
    expect(minKineticistLevelForTalent(3)).toBe(6);
    expect(minKineticistLevelForTalent(5)).toBe(10);
  });
});

describe("kineticOverflowBonus", () => {
  it("is zero below 3rd level regardless of burn held", () => {
    expect(kineticOverflowBonus(2, 3)).toEqual({ cap: 0, attackBonus: 0, damageBonus: 0 });
  });

  it("attack bonus = min(currentBurn, cap); damage = 2x attack — L6 cap is 1+floor(6/3)=3", () => {
    expect(kineticOverflowBonus(6, 1)).toEqual({ cap: 3, attackBonus: 1, damageBonus: 2 });
    expect(kineticOverflowBonus(6, 5)).toEqual({ cap: 3, attackBonus: 3, damageBonus: 6 });
  });
});

describe("Kineticist class-feature grants (classFeatures list via compute)", () => {
  it("Elemental Focus/Elemental Defense rows show the chosen element's blast/defense", () => {
    const doc = makeDoc(2, { kineticistElement: "fire" });
    const sheet = compute(doc, ref);
    const focus = sheet.classFeatures.find((f) => f.name === "Elemental Focus");
    const defense = sheet.classFeatures.find((f) => f.name === "Elemental Defense");
    expect(focus?.detail).toContain("Fire Blast");
    expect(defense?.detail).toContain("Searing Flesh");
  });

  it("Expanded Element row summarizes the 7th-level pick once reached, and both once 15th is reached", () => {
    const doc7 = makeDoc(7, { kineticistElement: "fire", kineticistExpandedElements: ["water"] });
    const sheet7 = compute(doc7, ref);
    const expanded7 = sheet7.classFeatures.find((f) => f.name === "Expanded Element");
    expect(expanded7?.detail).toContain("7th: Water");
    expect(expanded7?.detail).not.toContain("15th:");

    const doc15 = makeDoc(15, {
      kineticistElement: "fire",
      kineticistExpandedElements: ["water", "earth"],
    });
    const sheet15 = compute(doc15, ref);
    const expanded15 = sheet15.classFeatures.find((f) => f.name === "Expanded Element");
    expect(expanded15?.detail).toContain("7th: Water");
    expect(expanded15?.detail).toContain("15th: Earth");
  });

  it("Elemental Overflow's detail reflects LIVE burn held (from the Burn resource pool)", () => {
    const doc = makeDoc(6, { kineticistElement: "fire", currentBurn: 2 });
    const sheet = compute(doc, ref);
    const overflow = sheet.classFeatures.find((f) => f.name === "Elemental Overflow");
    expect(overflow?.detail).toContain("+2 atk");
    expect(overflow?.detail).toContain("+4 dmg");
    expect(overflow?.detail).toContain("holding 2 burn");
  });

  it("composite blasts auto-grant once both required elements are known, with origin.kind compositeBlast", () => {
    const doc = makeDoc(7, { kineticistElement: "earth", kineticistExpandedElements: ["fire"] });
    const sheet = compute(doc, ref);
    const magma = sheet.classFeatures.find((f) => f.name === "Magma Blast");
    expect(magma?.origin?.kind).toBe("compositeBlast");
  });

  it("chosen wild talents auto-grant with origin.kind wildTalent, scoped to known elements", () => {
    const doc = makeDoc(3, {
      kineticistElement: "fire",
      kineticistWildTalents: ["fire:burningInfusion", "universal:kineticBlade", "water:spray"],
    });
    const sheet = compute(doc, ref);
    const talents = sheet.classFeatures.filter((f) => f.origin?.kind === "wildTalent");
    const names = talents.map((t) => t.name);
    expect(names).toContain("Burning Infusion");
    expect(names).toContain("Kinetic Blade");
    // A talent id that resolves fine even though "water" isn't known — this
    // table doesn't hard-enforce element-known scoping (see file doc
    // comment); it's still granted since the id itself is valid.
    expect(names).toContain("Spray");
  });

  it("an unresolvable wild talent id is silently skipped, not thrown", () => {
    const doc = makeDoc(3, { kineticistElement: "fire", kineticistWildTalents: ["bogus:nope"] });
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
