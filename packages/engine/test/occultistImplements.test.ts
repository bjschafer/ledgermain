import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  findOccultistFocusPower,
  OCCULTIST_APPLIED_RESONANT_SCHOOLS,
  OCCULTIST_SCHOOL_TAGS,
  OCCULTIST_SCHOOLS,
} from "../src/index.js";

/**
 * Fixture coverage for the occultist's Implements/Mental Focus/Focus Powers/
 * Resonant Powers subsystem (issue #65) — deferred in the prior "Mesmerist,
 * Occultist, Spiritualist mechanical audit" pass (see
 * IMPLEMENTATION_PLAN.md), now built out. `OCCULTIST_SCHOOLS` is clean-room,
 * hand-authored from aonprd.com's "Occultist" class page and its 8
 * implement-school subpages (the vendored Foundry pack carries only the
 * generic "Implements"/"Focus Powers" prose class features + the Mental
 * Focus resource pool — no per-school data at all, confirmed by a dedicated
 * audit before authoring this table).
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
    occultistImplements?: string[];
    occultistFocusPowers?: string[];
    occultistFocusInvested?: Record<string, number>;
    occultistPhysicalEnhancementAbility?: "str" | "dex" | "con";
    abilities?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  } = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "occultist", level }] },
    abilities: { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 8, ...overrides.abilities },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      occultistImplements: overrides.occultistImplements ?? [],
      occultistFocusPowers: overrides.occultistFocusPowers ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      occultistFocusInvested: overrides.occultistFocusInvested,
      occultistPhysicalEnhancementAbility: overrides.occultistPhysicalEnhancementAbility,
    },
  };
}

describe("OCCULTIST_SCHOOLS table", () => {
  it("has all 8 core implement schools, each with a base power, resonant power, and 6 focus powers", () => {
    expect(OCCULTIST_SCHOOL_TAGS.length).toBe(8);
    for (const tag of OCCULTIST_SCHOOL_TAGS) {
      const school = OCCULTIST_SCHOOLS[tag]!;
      expect(school.basePower.name.length).toBeGreaterThan(0);
      expect(school.resonantPower.name.length).toBeGreaterThan(0);
      expect(school.focusPowers.length).toBe(6);
      for (const power of school.focusPowers) {
        expect(power.slug.length).toBeGreaterThan(0);
        expect(power.summary.length).toBeGreaterThan(0);
      }
    }
  });

  it("exactly 4 resonant powers are flagged appliesAsChange (Abjuration/Divination/Enchantment/Transmutation)", () => {
    expect(new Set(OCCULTIST_APPLIED_RESONANT_SCHOOLS)).toEqual(
      new Set(["abjuration", "divination", "enchantment", "transmutation"]),
    );
  });

  it("findOccultistFocusPower resolves a valid '<school>:<slug>' id and rejects garbage", () => {
    const found = findOccultistFocusPower("abjuration:aegis");
    expect(found?.power.name).toBe("Aegis");
    expect(found?.school.tag).toBe("abjuration");
    expect(findOccultistFocusPower("not-a-school:whatever")).toBeUndefined();
    expect(findOccultistFocusPower("abjuration:not-a-power")).toBeUndefined();
  });
});

describe("Occultist Mental Focus resource pool (fully vendored/generic)", () => {
  it("Int-based, @class.unlevel + @abilities.int.mod, at L5 with 16 Int (+3 mod)", () => {
    const doc = makeDoc(5, { abilities: { int: 16 } });
    const pools = deriveResourcePools(doc, ref);
    const pool = pools.find((p) => p.name === "Mental Focus");
    expect(pool?.max).toBe(5 + 3);
  });
});

describe("Occultist implement school + focus power grants (classFeatures list)", () => {
  it("a distinct known school grants its base + resonant power once, even with a duplicate multiset pick", () => {
    const doc = makeDoc(6, { occultistImplements: ["abjuration", "abjuration", "divination"] });
    const sheet = compute(doc, ref);
    const implementFeatures = sheet.classFeatures.filter(
      (f) => f.origin?.kind === "implementSchool",
    );
    // 2 distinct schools * (base + resonant) = 4, not 6 (the duplicate abjuration pick grants no extra).
    expect(implementFeatures.length).toBe(4);
    expect(implementFeatures.some((f) => f.name.includes("Mind Barrier"))).toBe(true);
    expect(implementFeatures.some((f) => f.name.includes("Warding Talisman"))).toBe(true);
    expect(implementFeatures.some((f) => f.name.includes("Third Eye"))).toBe(true);
  });

  it("a focus power grant is scoped to a currently-known school; a leftover pick from an abandoned school is dropped", () => {
    const doc = makeDoc(6, {
      occultistImplements: ["abjuration"],
      occultistFocusPowers: ["abjuration:aegis", "divination:future-gaze"],
    });
    const sheet = compute(doc, ref);
    const focusFeatures = sheet.classFeatures.filter((f) => f.origin?.kind === "focusPower");
    expect(focusFeatures.length).toBe(1);
    expect(focusFeatures[0]!.name).toContain("Aegis");
  });
});

describe("Occultist resonant powers as real sheet Changes (the 4 unconditional ones)", () => {
  it("Abjuration's Warding Talisman applies a resistance bonus to all saves once focus is invested", () => {
    // L5: cappedFocusBonus(4, 5, perPoints=2, capBase=1, capPerLevels=4) = min(floor(4/2)=2, 1+floor(5/4)=2) = 2.
    const doc = makeDoc(5, {
      occultistImplements: ["abjuration"],
      occultistFocusInvested: { abjuration: 4 },
    });
    const sheet = compute(doc, ref);
    const comp = sheet.saves.fort.components.find((c) => c.source.includes("Warding Talisman"));
    expect(comp?.value).toBe(2);
  });

  it("Divination's Third Eye applies an insight bonus to Perception once focus is invested", () => {
    const doc = makeDoc(5, {
      occultistImplements: ["divination"],
      occultistFocusInvested: { divination: 4 },
    });
    const sheet = compute(doc, ref);
    const comp = sheet.skills["per"]!.components.find((c) => c.source.includes("Third Eye"));
    expect(comp?.value).toBe(2);
  });

  it("Enchantment's Glorious Presence applies a competence bonus to every Cha-based skill", () => {
    const doc = makeDoc(9, {
      occultistImplements: ["enchantment"],
      occultistFocusInvested: { enchantment: 6 },
    });
    const sheet = compute(doc, ref);
    // cappedFocusBonus(6, 9, 2, 1, 4) = min(floor(6/2)=3, 1+floor(9/4)=3) = 3.
    for (const skillId of ["blf", "dip", "dis", "han", "int", "prf", "umd"]) {
      const comp = sheet.skills[skillId]!.components.find((c) =>
        c.source.includes("Glorious Presence"),
      );
      expect(comp?.value).toBe(3);
    }
    // A non-Cha skill (e.g. Perception, Wis-based) gets nothing from this power.
    expect(
      sheet.skills["per"]!.components.some((c) => c.source.includes("Glorious Presence")),
    ).toBe(false);
  });

  it("Transmutation's Physical Enhancement grants an enhancement bonus to the chosen physical ability, defaulting to Str", () => {
    const doc = makeDoc(6, {
      occultistImplements: ["transmutation"],
      occultistFocusInvested: { transmutation: 3 },
    });
    const sheet = compute(doc, ref);
    // units = floor(3/3) = 1; cap = 2 + 2*floor(6/6) = 4; bonus = min(2, 4) = 2.
    const comp = sheet.abilities.str.components.find((c) =>
      c.source.includes("Physical Enhancement"),
    );
    expect(comp?.value).toBe(2);
  });

  it("Physical Enhancement targets a player-chosen ability (Dex) instead of the default", () => {
    const doc = makeDoc(6, {
      occultistImplements: ["transmutation"],
      occultistFocusInvested: { transmutation: 3 },
      occultistPhysicalEnhancementAbility: "dex",
    });
    const sheet = compute(doc, ref);
    const strComp = sheet.abilities.str.components.find((c) =>
      c.source.includes("Physical Enhancement"),
    );
    const dexComp = sheet.abilities.dex.components.find((c) =>
      c.source.includes("Physical Enhancement"),
    );
    expect(strComp).toBeUndefined();
    expect(dexComp?.value).toBe(2);
  });

  it("no bonus is applied for a known school with 0 focus invested", () => {
    const doc = makeDoc(5, { occultistImplements: ["abjuration"], occultistFocusInvested: {} });
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.components.some((c) => c.source.includes("Warding Talisman"))).toBe(
      false,
    );
  });

  it("no bonus is applied for a school not currently known, even with focus recorded", () => {
    const doc = makeDoc(5, { occultistImplements: [], occultistFocusInvested: { abjuration: 4 } });
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.components.some((c) => c.source.includes("Warding Talisman"))).toBe(
      false,
    );
  });

  it("a situational resonant power (Evocation's Intense Focus) is never applied as a sheet Change", () => {
    const doc = makeDoc(9, {
      occultistImplements: ["evocation"],
      occultistFocusInvested: { evocation: 6 },
    });
    const sheet = compute(doc, ref);
    // No attack/damage/save/skill/ability component anywhere should mention Intense Focus.
    const allComponents = [
      ...sheet.saves.fort.components,
      ...sheet.saves.ref.components,
      ...sheet.saves.will.components,
      ...Object.values(sheet.skills).flatMap((s) => s.components),
      ...Object.values(sheet.abilities).flatMap((a) => a.components),
    ];
    expect(allComponents.some((c) => c.source.includes("Intense Focus"))).toBe(false);
  });
});
