import { describe, expect, it } from "bun:test";

import type { CharacterDoc, DerivedKineticBlast } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Kinetic blast attack/damage lines. Expected values are hand-computed from
 * the published kineticist rules (Occult Adventures, Kinetic Blast):
 *
 *   - simple physical: 1d6+1 + Con, +1d6+1 per 2 levels beyond 1st
 *   - simple energy:   1d6 + 1/2 Con, +1d6 per 2 levels beyond 1st (touch)
 *   - composite:       doubles the dice and the per-die rider; the Con addend
 *                      is not doubled
 *   - Elemental Overflow: +1 attack per point of burn held (cap
 *                      floor(level/3)), damage twice that
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const BURN_FEATURE_ID = Object.values(ref.classFeatures).find((f) => f.tag === "burn")!.id;

function makeKineticist(opts: {
  level: number;
  element: string;
  expanded?: string[];
  simpleBlasts?: Record<string, string>;
  con?: number;
  dex?: number;
  burn?: number;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "kineticist", level: opts.level }],
    },
    abilities: {
      str: 10,
      dex: opts.dex ?? 14,
      con: opts.con ?? 16,
      int: 10,
      wis: 10,
      cha: 10,
    },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      kineticistElement: opts.element,
      kineticistExpandedElements: opts.expanded,
      kineticistSimpleBlasts: opts.simpleBlasts,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: opts.burn ? { [BURN_FEATURE_ID]: { used: opts.burn, max: 10 } } : {},
    },
  };
}

function blast(doc: CharacterDoc, name: string): DerivedKineticBlast {
  const found = compute(doc, ref).kineticBlasts.find((b) => b.name === name);
  if (!found) throw new Error(`blast not on sheet: ${name}`);
  return found;
}

describe("simple blast lines", () => {
  it("energy blast: 2d6 + 1/2 Con at 4th, resolved as a ranged TOUCH attack", () => {
    // Kineticist 4: BAB +3 (med), Dex 14 (+2), Con 16 (+3).
    const fire = blast(makeKineticist({ level: 4, element: "fire" }), "Fire Blast");
    expect(fire.damageDice).toBe("2d6");
    expect(fire.damageBonus.total).toBe(1); // floor(3 / 2), no per-die rider
    expect(fire.attack.total).toBe(5); // 3 BAB + 2 Dex
    expect(fire.touch).toBe(true);
    expect(fire.blastType).toBe("energy");
    expect(fire.burn).toBe(0);
    expect(fire.range).toBe(30);
  });

  it("physical blast: 2d6+2 + Con at 4th, resolved against normal AC", () => {
    const earth = blast(makeKineticist({ level: 4, element: "earth" }), "Earth Blast");
    expect(earth.damageDice).toBe("2d6");
    expect(earth.damageBonus.total).toBe(5); // +2 per-die rider + 3 Con
    expect(earth.touch).toBe(false);
    expect(earth.blastType).toBe("physical");
  });

  it("dice track ceil(level/2): 1d6 at 1st, 3d6 at 5th, 10d6 at 20th", () => {
    expect(blast(makeKineticist({ level: 1, element: "fire" }), "Fire Blast").damageDice).toBe(
      "1d6",
    );
    expect(blast(makeKineticist({ level: 5, element: "fire" }), "Fire Blast").damageDice).toBe(
      "3d6",
    );
    expect(blast(makeKineticist({ level: 20, element: "fire" }), "Fire Blast").damageDice).toBe(
      "10d6",
    );
  });

  it("the recorded simple-blast choice decides which line an element contributes", () => {
    const air = compute(makeKineticist({ level: 3, element: "air" }), ref).kineticBlasts;
    expect(air.map((b) => b.name)).toEqual(["Air Blast"]);

    const electric = compute(
      makeKineticist({ level: 3, element: "air", simpleBlasts: { air: "electricBlast" } }),
      ref,
    ).kineticBlasts;
    expect(electric.map((b) => b.name)).toEqual(["Electric Blast"]);
    expect(electric[0]!.touch).toBe(true); // electricity is an energy blast
  });

  it("no lines at all for a character with no kineticist levels or no element", () => {
    const noElement = makeKineticist({ level: 4, element: "" });
    expect(compute(noElement, ref).kineticBlasts).toEqual([]);
  });
});

describe("composite blast lines", () => {
  /** Fire primary, earth taken as the 7th-level Expanded Element pick → Magma Blast. */
  function magmaKineticist(level: number, burn?: number): CharacterDoc {
    return makeKineticist({ level, element: "fire", expanded: ["earth"], burn });
  }

  it("physical composite doubles dice and rider but not the Con addend", () => {
    // Kineticist 7: simple dice = ceil(7/2) = 4, so a composite rolls 8d6
    // with an +8 rider; Con 16 (+3) adds once, not twice.
    const magma = blast(magmaKineticist(7), "Magma Blast");
    expect(magma.kind).toBe("composite");
    expect(magma.damageDice).toBe("8d6");
    expect(magma.damageBonus.total).toBe(11); // 8 rider + 3 Con
    expect(magma.burn).toBe(2);
    expect(magma.touch).toBe(false);
  });

  it("Force Blast is the exception: composite burn cost, SIMPLE energy damage", () => {
    // "Force blast deals damage as a simple energy blast instead of a
    // composite energy blast" — aether primary, aether expanded.
    const force = blast(
      makeKineticist({ level: 7, element: "aether", expanded: ["aether"] }),
      "Force Blast",
    );
    expect(force.damageDice).toBe("4d6"); // simple progression, not 8d6
    expect(force.damageBonus.total).toBe(1); // floor(3/2), energy
    expect(force.burn).toBe(2);
    expect(force.touch).toBe(true);
  });

  it("Aetheric Boost and Gravitic Boost get no line — they infuse another blast", () => {
    const names = compute(
      makeKineticist({ level: 7, element: "aether", expanded: ["aether"] }),
      ref,
    ).kineticBlasts.map((b) => b.name);
    expect(names).toContain("Force Blast");
    expect(names).not.toContain("Aetheric Boost");
  });

  it("a composite whose elements aren't both known never appears", () => {
    const names = compute(makeKineticist({ level: 7, element: "fire" }), ref).kineticBlasts.map(
      (b) => b.name,
    );
    expect(names).toEqual(["Fire Blast"]);
  });
});

describe("Elemental Overflow rides the live burn count", () => {
  it("adds +1 attack per burn held and double that to damage, capped by level", () => {
    // Kineticist 6 (cap floor(6/3) = +2), Con 16, Dex 14: BAB +4, Dex +2.
    const clean = blast(makeKineticist({ level: 6, element: "earth" }), "Earth Blast");
    expect(clean.attack.total).toBe(6); // 4 BAB + 2 Dex, no burn held

    const burning = blast(makeKineticist({ level: 6, element: "earth", burn: 2 }), "Earth Blast");
    expect(burning.attack.total).toBe(8); // +2 overflow
    // 3 per-die rider (3d6 at 6th) + 3 Con + 4 overflow damage
    expect(burning.damageBonus.total).toBe(10);
  });

  it("caps the attack bonus at floor(level/3) however much burn is held", () => {
    const overCap = blast(makeKineticist({ level: 6, element: "earth", burn: 5 }), "Earth Blast");
    expect(overCap.attack.total).toBe(8); // capped at +2, not +5
  });

  it("grants nothing below 3rd level, where Elemental Overflow isn't yet a feature", () => {
    const low = blast(makeKineticist({ level: 2, element: "earth", burn: 2 }), "Earth Blast");
    expect(low.attack.total).toBe(3); // 1 BAB + 2 Dex, no overflow
    expect(low.attack.components.some((c) => c.source === "Elemental Overflow")).toBe(false);
  });

  it("names its contribution in the attack and damage provenance", () => {
    const burning = blast(makeKineticist({ level: 6, element: "earth", burn: 2 }), "Earth Blast");
    expect(burning.attack.components).toContainEqual({
      source: "Elemental Overflow",
      type: "untyped",
      value: 2,
      applied: true,
    });
    expect(burning.damageBonus.components).toContainEqual({
      source: "Elemental Overflow",
      type: "untyped",
      value: 4,
      applied: true,
    });
  });
});
