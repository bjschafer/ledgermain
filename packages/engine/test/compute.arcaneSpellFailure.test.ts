/**
 * Engine integration fixtures for issue #8 / issue #64:
 * `DerivedSheet.arcaneSpellFailure` sums ASF across equipped armor/shields,
 * shown only for characters with an arcane-casting class (wizard, sorcerer,
 * arcanist, magus, bard, summoner, skald, witch, bloodrager), with each
 * class's PF1-RAW "Weapon and Armor Proficiency" armor exemption applied
 * only when that class is the character's sole arcane class:
 *
 * - Bard: light armor AND a shield.
 * - Summoner / Summoner (Unchained): light armor only, shield still incurs ASF.
 * - Skald: light OR medium armor, even with a shield.
 * - Bloodrager: light OR medium armor, shield still incurs ASF.
 * - Magus: level-gated — light at 1st, medium at 7th, heavy at 13th; shield
 *   always incurs ASF regardless of level.
 *
 * Wording verified clean-room against each class's Archives of Nethys page
 * (legacy.aonprd.com), not Foundry source.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  gear?: ItemInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const ABILITIES: CharacterDoc["abilities"] = {
  str: 14,
  dex: 14,
  con: 12,
  int: 10,
  wis: 10,
  cha: 10,
};

const LIGHT_ARMOR: ItemInstance = {
  equipped: true,
  name: "Padded",
  armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, asf: 5 },
};

const MEDIUM_ARMOR: ItemInstance = {
  equipped: true,
  name: "Chain Shirt",
  armor: { slot: "armor", ac: 4, maxDex: 4, acp: -2, type: 2, asf: 20 },
};

const HEAVY_ARMOR: ItemInstance = {
  equipped: true,
  name: "Full Plate",
  armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3, asf: 35 },
};

const SHIELD: ItemInstance = {
  equipped: true,
  name: "Buckler",
  armor: { slot: "shield", ac: 1, acp: -1, asf: 5 },
};

describe("compute: arcane spell failure (issue #8 / issue #64)", () => {
  it("is undefined for a character with no arcane-casting class", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toBeUndefined();
  });

  it("is undefined for a divine-only caster (cleric) even in heavy armor", () => {
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toBeUndefined();
  });

  it("sums ASF across worn armor + shield for a wizard (no exemption)", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 10,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("a wizard with no armor equipped still reports (zero) ASF, not undefined", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], abilities: ABILITIES });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("arcanist incurs ASF like wizard (no armor proficiency, no exemption)", () => {
    const doc = makeDoc({
      classes: [{ tag: "arcanist", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 5,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("magus incurs ASF (is now recognised as an arcane caster)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 1 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR],
    });
    // 1st-level magus is only exempt in light armor; medium still incurs ASF.
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 20,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("bard-only + light armor + no shield: exempt, total reads 0", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Bard: exempt in light armor (shield included)",
    });
  });

  it("bard-only + heavy armor: exemption does NOT apply (medium/heavy armor isn't covered)", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 35,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("bard-only + light armor + a shield: exemption STILL applies (PF1 RAW covers shields for bards)", () => {
    const doc = makeDoc({
      classes: [{ tag: "bard", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Bard: exempt in light armor (shield included)",
    });
  });

  it("multiclass wizard/bard in light armor: exemption does NOT apply (another arcane class present)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "bard", level: 1 },
        { tag: "wizard", level: 1 },
      ],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 5,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("summoner-only + light armor + no shield: exempt", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Summoner: exempt in light armor, no shield",
    });
  });

  it("summoner-only + light armor + a shield: exemption does NOT apply (shields always incur ASF for summoners)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 10,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("summoner (unchained)-only + light armor + no shield: exempt", () => {
    const doc = makeDoc({
      classes: [{ tag: "summonerUnchained", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Summoner (Unchained): exempt in light armor, no shield",
    });
  });

  it("skald-only + medium armor + a shield: exempt (skald covers light/medium AND shields)", () => {
    const doc = makeDoc({
      classes: [{ tag: "skald", level: 1 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Skald: exempt in light or medium armor (shield included)",
    });
  });

  it("skald-only + heavy armor: exemption does NOT apply", () => {
    const doc = makeDoc({
      classes: [{ tag: "skald", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 35,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("bloodrager-only + medium armor + no shield: exempt", () => {
    const doc = makeDoc({
      classes: [{ tag: "bloodrager", level: 1 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Bloodrager: exempt in light or medium armor, no shield",
    });
  });

  it("bloodrager-only + medium armor + a shield: exemption does NOT apply (shields always incur ASF for bloodragers)", () => {
    const doc = makeDoc({
      classes: [{ tag: "bloodrager", level: 1 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 25,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("bloodrager-only + heavy armor: exemption does NOT apply", () => {
    const doc = makeDoc({
      classes: [{ tag: "bloodrager", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 35,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("magus L1 + light armor: exempt (Weapon and Armor Proficiency)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 1 }],
      abilities: ABILITIES,
      gear: [LIGHT_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Magus: exempt in light armor, no shield",
    });
  });

  it("magus L6 + medium armor: exemption does NOT apply yet (Medium Armor is a 7th-level feature)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 6 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 20,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("magus L7 + medium armor: exempt (Medium Armor class feature)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 7 }],
      abilities: ABILITIES,
      gear: [MEDIUM_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Magus: exempt in light or medium armor, no shield",
    });
  });

  it("magus L12 + heavy armor: exemption does NOT apply yet (Heavy Armor is a 13th-level feature)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 12 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 35,
      exempt: false,
      exemptNote: undefined,
    });
  });

  it("magus L13 + heavy armor: exempt (Heavy Armor class feature)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 13 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 0,
      exempt: true,
      exemptNote: "Magus: exempt in light, medium, or heavy armor, no shield",
    });
  });

  it("magus L13 + heavy armor + a shield: exemption does NOT apply (shields always incur ASF for magi)", () => {
    const doc = makeDoc({
      classes: [{ tag: "magus", level: 13 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR, SHIELD],
    });
    expect(compute(doc, ref).arcaneSpellFailure).toEqual({
      total: 40,
      exempt: false,
      exemptNote: undefined,
    });
  });
});
