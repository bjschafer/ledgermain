import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, deriveEidolon } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(overrides: {
  classTag: "summoner" | "summonerUnchained";
  level: number;
  eidolon: CharacterDoc["build"]["eidolon"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Summoner",
      race: raceId("Human"),
      classes: [{ tag: overrides.classTag, level: overrides.level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      eidolon: overrides.eidolon,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("deriveEidolon (unchained, Angel L1 biped, no picks)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "biped", subtype: "angel", name: "Seraph", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("is the unchained variant, with the angel subtype resolved", () => {
    expect(eidolon).toBeDefined();
    expect(eidolon!.variant).toBe("unchained");
    expect(eidolon!.subtypeId).toBe("angel");
    expect(eidolon!.subtypeName).toBe("Angel");
    expect(eidolon!.subtypeAlignmentText).toBe("Any good");
  });

  it("evolution pool is 1 (unchained L1 column, no unlocked pool-bonus grants)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(1);
  });

  it("natural armor is 2 (unchained base-form +2) + 0 (table armorBonus at L1)", () => {
    expect(eidolon!.naturalArmor).toBe(2);
  });

  it("attacks: a single slam 1d8 (the subtype's biped attack), NOT the chained form's claws", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({
      name: "Slam",
      count: 1,
      damageDice: "1d8",
      attackType: "primary",
    });
  });

  it("AC 13 (base 10 + Dex 1 + natural armor 2), saves Fort +3/Ref +1/Will +2 (Biped's good Fort/Will)", () => {
    expect(eidolon!.ac.normal).toBe(13);
    expect(eidolon!.saves).toEqual({ fort: 3, ref: 1, will: 2 });
  });

  it("grantedEvolutions lists ALL six milestone grants, only the 1st unlocked", () => {
    expect(eidolon!.grantedEvolutions).toHaveLength(6);
    expect(eidolon!.grantedEvolutions[0]).toMatchObject({ level: 1, unlocked: true });
    const eighth = eidolon!.grantedEvolutions.find((g) => g.level === 8)!;
    expect(eighth.unlocked).toBe(false);
  });

  it("the 8th-level Flight grant isn't unlocked yet, so no fly speed is derived", () => {
    expect(eidolon!.speeds.fly).toBeUndefined();
  });

  it("has no automatic Ability Score Increase slots yet (first at 5th)", () => {
    expect(eidolon!.abilityIncreaseSlots).toBe(0);
  });
});

describe("deriveEidolon (unchained, Elemental (Air) L8 quadruped)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "quadruped", subtype: "elemental-air", name: "Squall", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("evolution pool is 7 (unchained L8 column 6 + the unlocked 4th-level +1 pool grant)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(7);
  });

  it("gains a fly speed equal to its land speed via the free 8th-level Flight evolution", () => {
    expect(eidolon!.speeds.land).toBe(40);
    expect(eidolon!.speeds.fly).toBe(40);
  });

  it("attacks with a bite (the subtype's quadruped attack), ×1.5 Str (sole natural attack, UMR)", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    // Str mod that would otherwise give damageBonus 4 is scaled ×1.5 (floor) to 6 — this bite is the eidolon's only attack form.
    expect(eidolon!.attacks[0]).toMatchObject({
      name: "Bite",
      attack: 10,
      damageDice: "1d6",
      damageBonus: 6,
      attackType: "primary",
    });
  });

  it("natural armor is 2 (unchained base-form) + 6 (table armorBonus at L8) = 8", () => {
    expect(eidolon!.naturalArmor).toBe(8);
  });
});

describe("deriveEidolon (unchained, Demon L12 serpentine, ability increases stacked with the subtype grant)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 12,
    eidolon: {
      baseForm: "serpentine",
      subtype: "demon",
      name: "Vrex",
      evolutions: [],
      abilityIncreases: ["str", "str"],
      subtypeGrantChoices: { "12": "str" },
    },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("evolution pool is 10 (unchained L12 column 9 + the unlocked 8th-level +1 pool grant)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(10);
  });

  it("Str is 21: 12 (serpentine base) + 5 (table Str/Dex bonus at L12) + 4 (two +1 automatic ASI slots, both Str, plus the 12th-level subtype grant's own +2 Str)", () => {
    expect(eidolon!.abilities.str).toEqual({ score: 21, mod: 5 });
  });

  it("attacks: bite 1d8 (primary, Improved Damage baked in) + tail slap 1d6 (secondary)", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    expect(eidolon!.attacks[0]).toMatchObject({
      name: "Bite",
      attack: 14,
      damageDice: "1d8",
      damageBonus: 5,
      attackType: "primary",
    });
    expect(eidolon!.attacks[1]).toMatchObject({
      name: "Tail slap",
      attack: 12,
      damageDice: "1d6",
      damageBonus: 2,
      attackType: "secondary",
    });
  });
});

describe("deriveEidolon (unchained, Fire Elemental L8, +20 ft. land speed)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "biped", subtype: "elemental-fire", name: "Cinder", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("land speed is 50: the Biped's base 30 ft. + the 8th-level subtype grant's +20 ft.", () => {
    expect(eidolon!.speeds.land).toBe(50);
  });
});

describe("deriveEidolon (unchained with no subtype set — chained-form fallback, unchained pool)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 3,
    eidolon: { baseForm: "biped", name: "Nameless", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("is the unchained variant with no subtype resolved", () => {
    expect(eidolon!.variant).toBe("unchained");
    expect(eidolon!.subtypeId).toBeUndefined();
    expect(eidolon!.subtypeName).toBeUndefined();
    expect(eidolon!.grantedEvolutions).toEqual([]);
  });

  it("falls back to the chained Biped's own free attacks (2 claws), never leaving attacks empty", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Claw", count: 2, damageDice: "1d4" });
  });

  it("evolution pool is the UNCHAINED L3 column (3), not the chained column (5)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(3);
  });
});

describe("deriveEidolon (chained summoner regression guard — same level, unaffected by the unchained system)", () => {
  const doc = makeDoc({
    classTag: "summoner",
    level: 3,
    eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("is the chained variant, with the chained L3 evolution pool (5) untouched", () => {
    expect(eidolon!.variant).toBe("chained");
    expect(eidolon!.evolutionPointsAvailable).toBe(5);
    expect(eidolon!.abilityIncreaseSlots).toBe(0);
  });

  it("still uses the chained Biped's own free attacks", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Claw", count: 2, damageDice: "1d4" });
  });

  it("naturalArmor is just the table's armorBonus (2) — no unchained +2 base-form bonus", () => {
    expect(eidolon!.naturalArmor).toBe(2);
  });
});

describe("deriveEidolon (unchained ability-increase slot clamp — extra entries beyond unlocked slots are ignored)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 6,
    eidolon: {
      baseForm: "biped",
      name: "Halfway",
      evolutions: [],
      // Only 1 slot is unlocked at L6 (the 5th-level milestone); "con" and
      // "wis" are supplied but must be ignored, same slice-to-unlocked-slots
      // clamp as `PhantomBuild.abilityIncreases`/`AnimalCompanionBuild.abilityIncreases`.
      abilityIncreases: ["dex", "con", "wis"],
    },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("has exactly 1 unlocked slot at L6", () => {
    expect(eidolon!.abilityIncreaseSlots).toBe(1);
  });

  it("applies only the first entry (Dex), ignoring the extra Con/Wis entries", () => {
    // Biped base Dex 12 + table Str/Dex bonus at L6 (2) + the 1 unlocked slot = 15.
    expect(eidolon!.abilities.dex.score).toBe(15);
    // Biped base Con 13, universal Wis 10 — neither gets a slot, so both stay at their base value.
    expect(eidolon!.abilities.con.score).toBe(13);
    expect(eidolon!.abilities.wis.score).toBe(10);
  });
});
