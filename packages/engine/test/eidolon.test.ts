import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  deriveEidolon,
  eidolonStartingAbilities,
  eidolonSummonerLevel,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  eidolon?: CharacterDoc["build"]["eidolon"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  sharedBuffIds?: string[];
  /** The eidolon's OWN active conditions, independent of the summoner's `live.conditions`. */
  eidolonConditions?: string[];
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
      classes: overrides.classes,
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
      activeBuffs: overrides.activeBuffs ?? [],
      resources: {},
      eidolon:
        overrides.sharedBuffIds || overrides.eidolonConditions
          ? { sharedBuffIds: overrides.sharedBuffIds, conditions: overrides.eidolonConditions }
          : undefined,
    },
  } as CharacterDoc;
}

describe("deriveEidolon (summoner-7 biped eidolon, hand-computed fixture)", () => {
  const doc = makeDoc({
    classes: [{ tag: "summoner", level: 7 }],
    eidolon: {
      baseForm: "biped",
      name: "Grix",
      evolutions: [{ id: "bite" }, { id: "ability-increase", choice: "str" }],
    },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("derives an eidolon at summoner level 7", () => {
    expect(eidolon).toBeDefined();
    expect(eidolon!.level).toBe(7);
  });

  it("HD 6, BAB +6 (full BAB)", () => {
    expect(eidolon!.hd).toBe(6);
    expect(eidolon!.bab).toBe(6);
  });

  it("Ability scores: Str 21 (16 base + 3 table + 2 evolution), Dex 15, Con 13, Int 7, Wis 10, Cha 11", () => {
    expect(eidolon!.abilities.str).toEqual({ score: 21, mod: 5 });
    expect(eidolon!.abilities.dex).toEqual({ score: 15, mod: 2 });
    expect(eidolon!.abilities.con).toEqual({ score: 13, mod: 1 });
    expect(eidolon!.abilities.int).toEqual({ score: 7, mod: -2 });
    expect(eidolon!.abilities.wis).toEqual({ score: 10, mod: 0 });
    expect(eidolon!.abilities.cha).toEqual({ score: 11, mod: 0 });
  });

  it("Saves: Fort +6, Ref +4, Will +5 (Biped's good Fort/Will, poor Ref)", () => {
    expect(eidolon!.saves.fort).toBe(6);
    expect(eidolon!.saves.ref).toBe(4);
    expect(eidolon!.saves.will).toBe(5);
  });

  it("AC 18, touch 12, flat-footed 16 (base 10 + Dex 2 + natural armor 6)", () => {
    expect(eidolon!.ac.normal).toBe(18);
    expect(eidolon!.ac.touch).toBe(12);
    expect(eidolon!.ac.flatFooted).toBe(16);
  });

  it("CMB +11, CMD 23", () => {
    expect(eidolon!.cmb).toBe(11);
    expect(eidolon!.cmd).toBe(23);
  });

  it("Attacks: 2 claws +11 (1d4+5) and 1 bite +11 (1d6+5)", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    expect(eidolon!.attacks[0]).toMatchObject({
      name: "Claw",
      count: 2,
      attack: 11,
      damageDice: "1d4",
      damageBonus: 5,
    });
    expect(eidolon!.attacks[1]).toMatchObject({
      name: "Bite",
      count: 1,
      attack: 11,
      damageDice: "1d6",
      damageBonus: 5,
    });
  });

  it("HP max 39 (floor(5.5*6) + 1*6)", () => {
    expect(eidolon!.hp.max).toBe(39);
    expect(eidolon!.hp.current).toBe(39);
  });

  it("Evolution pool: 3 spent (1 bite + 2 ability increase) of 10 available", () => {
    expect(eidolon!.evolutionPointsSpent).toBe(3);
    expect(eidolon!.evolutionPointsAvailable).toBe(10);
  });

  it("chosenEvolutions resolves both picks with names/costs", () => {
    expect(eidolon!.chosenEvolutions).toEqual([
      { id: "bite", name: "Bite", cost: 1, choice: undefined },
      { id: "ability-increase", name: "Ability Increase", cost: 2, choice: "str" },
    ]);
  });

  it("special abilities cumulative through level 7", () => {
    const names = eidolon!.specialAbilities.map((a) => a.name);
    expect(names).toEqual(["Darkvision", "Link", "Share Spells", "Evasion", "Devotion"]);
  });

  it("free evolution chips reflect the base form", () => {
    expect(eidolon!.freeEvolutionNames).toEqual(["Claws", "Limbs (arms)", "Limbs (legs)"]);
  });

  it("shared Barkskin (+2 natural armor) raises AC and flat-footed but not touch", () => {
    const withBuff: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "barkskin-1",
            name: "Barkskin",
            changes: [{ target: "nac", type: "enhancement", formula: "2" }],
          },
        ],
        eidolon: { sharedBuffIds: ["barkskin-1"] },
      },
    };
    const buffed = deriveEidolon(withBuff, rollData);
    expect(buffed!.ac.normal).toBe(20);
    expect(buffed!.ac.touch).toBe(12);
    expect(buffed!.ac.flatFooted).toBe(18);
  });
});

describe("deriveEidolon base-form variants", () => {
  it("Quadruped: Fort/Ref good, Will poor; free bite attack", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "quadruped", name: "Bounder", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.baseFormName).toBe("Quadruped");
    expect(eidolon.attacks).toEqual([
      {
        name: "Bite",
        count: 1,
        attack: expect.any(Number),
        damageDice: "1d6",
        damageBonus: expect.any(Number),
        attackType: "primary",
      },
    ]);
    // HD 1, saveForLevels: high=2, low=0.
    expect(eidolon.saves.fort).toBeGreaterThan(eidolon.saves.will);
    expect(eidolon.saves.ref).toBeGreaterThan(eidolon.saves.will);
  });

  it("Serpentine: Ref/Will good, Fort poor; climb speed from the free Climb evolution; primary bite + secondary tail slap (hand-computed, issue #68)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "serpentine", name: "Coil", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.speeds).toEqual({ land: 20, climb: 20 });
    expect(eidolon.attacks.map((a) => a.name)).toEqual(["Bite", "Tail slap"]);

    // level 1 row: hd 1, strDexBonus 0. Serpentine base Str 12/Dex 16/Con 13.
    // Str 12 + 0 -> mod +1. Dex 16 + 0 -> mod +3. bab = babForLevels("high", 1) = 1.
    expect(eidolon.hd).toBe(1);
    expect(eidolon.bab).toBe(1);
    expect(eidolon.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon.abilities.dex).toEqual({ score: 16, mod: 3 });

    // Bite/Tail slap are two distinct attack forms -> classified individually:
    // "Bite" is primary-type, "Tail slap" is secondary-type (natural-attacks.ts).
    // No Multiattack yet (unlocked at 9th), so the secondary penalty is -5.
    const bite = eidolon.attacks.find((a) => a.name === "Bite")!;
    const tailSlap = eidolon.attacks.find((a) => a.name === "Tail slap")!;
    // bite (primary): bab(1) + strMod(1) + size(med, 0) = 2; damage strMod(1) -> 1d6+1.
    expect(bite).toMatchObject({
      attackType: "primary",
      attack: 2,
      damageDice: "1d6",
      damageBonus: 1,
    });
    // tail slap (secondary, no Multiattack): 2 - 5 = -3; damage half of +1 floors to 0 -> 1d6+0.
    expect(tailSlap).toMatchObject({
      attackType: "secondary",
      attack: -3,
      damageDice: "1d6",
      damageBonus: 0,
    });
  });

  it("Large evolution: +8 Str/+4 Con/-2 Dex, +2 natural armor, Large size", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 9 }],
      eidolon: { baseForm: "biped", name: "Titan", evolutions: [{ id: "large" }] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    // level 9 row: hd 7, armorBonus 6, strDexBonus 3.
    // Str: 16 + 3 (table) + 8 (large) = 27 -> mod +8.
    // Dex: 12 + 3 (table) - 2 (large) = 13 -> mod +1.
    // Con: 13 + 4 (large) = 17 -> mod +3.
    expect(eidolon.size).toBe("lg");
    expect(eidolon.abilities.str).toEqual({ score: 27, mod: 8 });
    expect(eidolon.abilities.dex).toEqual({ score: 13, mod: 1 });
    expect(eidolon.abilities.con).toEqual({ score: 17, mod: 3 });
    expect(eidolon.naturalArmor).toBe(8); // 6 (table) + 2 (large)
  });

  it("Multiattack (9th+): a secondary attack's penalty softens from -5 to -2 (hand-computed, issue #68)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 9 }],
      eidolon: { baseForm: "biped", name: "Grothul", evolutions: [{ id: "hooves" }] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.specialAbilities.map((a) => a.name)).toContain("Multiattack");

    // level 9 row: hd 7, strDexBonus 3. Biped base Str 16/Dex 12.
    // Str 16 + 3 -> mod +4. bab = babForLevels("high", 7) = 7.
    expect(eidolon.hd).toBe(7);
    expect(eidolon.bab).toBe(7);
    expect(eidolon.abilities.str).toEqual({ score: 19, mod: 4 });

    // Biped's free "Claw" (primary-type) + the "Hooves" evolution's "Hoof"
    // (secondary-type) are two distinct attack forms.
    const claw = eidolon.attacks.find((a) => a.name === "Claw")!;
    const hoof = eidolon.attacks.find((a) => a.name === "Hoof")!;
    // claw (primary): bab(7) + strMod(4) + size(med, 0) = 11; damage strMod(4) -> 1d4+4.
    expect(claw).toMatchObject({ attackType: "primary", attack: 11, damageBonus: 4 });
    // hoof (secondary, Multiattack): 11 - 2 = 9; damage half of +4 floors to 2 -> 1d4+2.
    expect(hoof).toMatchObject({ attackType: "secondary", attack: 9, damageBonus: 2 });
  });

  it("Flight/Climb/Swim/Burrow evolutions grant the expected speeds", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 9 }],
      eidolon: {
        baseForm: "biped",
        name: "Skimmer",
        evolutions: [{ id: "flight" }, { id: "swim" }, { id: "swim" }, { id: "limbs-legs" }],
      },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    // Biped land 30 + 10 (one limbs-legs pick) = 40.
    expect(eidolon.speeds.land).toBe(40);
    expect(eidolon.speeds.fly).toBe(40);
    // Two swim picks: first = land speed, each additional +20.
    expect(eidolon.speeds.swim).toBe(60);
  });
});

describe("deriveEidolon multiclass summoner levels", () => {
  it("sums summoner (chained) and summonerUnchained levels (deferred-unchained-table posture)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "summoner", level: 3 },
        { tag: "summonerUnchained", level: 4 },
      ],
    });
    expect(eidolonSummonerLevel(doc)).toBe(7);
  });
});

describe("deriveEidolon edge cases", () => {
  it("returns undefined with no build.eidolon", () => {
    const doc = makeDoc({ classes: [{ tag: "summoner", level: 5 }] });
    const rollData = buildRollData(doc, ref);
    expect(deriveEidolon(doc, rollData)).toBeUndefined();
  });

  it("returns undefined for an unknown base form id (soft fail, no crash)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      eidolon: { baseForm: "not-a-form", name: "Ghost", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveEidolon(doc, rollData)).toBeUndefined();
  });

  it("returns undefined with 0 summoner levels", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      eidolon: { baseForm: "biped", name: "Ghost", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveEidolon(doc, rollData)).toBeUndefined();
  });

  it("unknown evolution ids in the pick list are skipped, not crashing", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 3 }],
      eidolon: { baseForm: "biped", name: "Ghost", evolutions: [{ id: "not-a-real-evolution" }] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData);
    expect(eidolon).toBeDefined();
    expect(eidolon!.evolutionPointsSpent).toBe(0);
    expect(eidolon!.chosenEvolutions).toEqual([]);
  });

  it("overspending the evolution pool is a soft warning only — no clamping, no crash", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: {
        baseForm: "biped",
        name: "Ghost",
        evolutions: [{ id: "bite" }, { id: "claws" }, { id: "slam" }, { id: "gore" }],
      },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    // level 1 pool is 3; these four evolutions cost 1+1+1+2 = 5.
    expect(eidolon.evolutionPointsSpent).toBe(5);
    expect(eidolon.evolutionPointsAvailable).toBe(3);
    // Biped's free 2-claw attack row + 4 evolution-granted attack rows (bite/claws/slam/gore).
    expect(eidolon.attacks).toHaveLength(5);
  });
});

describe("deriveEidolon own active conditions", () => {
  // summoner-1 biped, no evolutions: hd 1, bab +1, Str 16 (mod +3), Dex 12
  // (mod +1), Con 13 (mod +1), Wis 10 (mod +0); claw attack = bab(1) +
  // strMod(3) + size(0) = 4, saves fort 2(base)+1(con)=3 / ref 0(base)+1(dex)=1
  // / will 2(base)+0(wis)=2, per total = wisMod(0) = 0 — hand-verified
  // baseline for the deltas below.
  function biped1(eidolonConditions?: string[]): CharacterDoc {
    return makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
      eidolonConditions,
    });
  }

  it("shaken (-2 attack, -2 all saves, -2 skills — global 'skills' target)", () => {
    const doc = biped1(["shaken"]);
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    // baseline claw attack 4 (see biped1's comment above) - 2 (shaken) = 2.
    expect(eidolon.attacks[0]).toMatchObject({ attack: 2 });
    expect(eidolon.saves).toEqual({ fort: 1, ref: -1, will: 0 });
    expect(eidolon.skills.per!.total).toBe(-2);
  });

  it("is independent of the summoner's own live.conditions (no active conditions -> unaffected baseline)", () => {
    const doc = biped1();
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.attacks[0]).toMatchObject({ attack: 4 });
    expect(eidolon.saves).toEqual({ fort: 3, ref: 1, will: 2 });
    expect(eidolon.skills.per!.total).toBe(0);
  });
});

describe("baseAbilities override (player-set starting scores)", () => {
  it("eidolonStartingAbilities: base form defaults + universal Int/Wis/Cha, overrides applied on top", () => {
    expect(eidolonStartingAbilities("serpentine")).toEqual({
      str: 12,
      dex: 16,
      con: 13,
      int: 7,
      wis: 10,
      cha: 11,
    });
    expect(eidolonStartingAbilities("serpentine", { str: 18, cha: 14 })).toEqual({
      str: 18,
      dex: 16,
      con: 13,
      int: 7,
      wis: 10,
      cha: 14,
    });
  });

  it("falls back to the biped's scores for an unrecognized base form", () => {
    expect(eidolonStartingAbilities("aquatic")).toEqual(eidolonStartingAbilities("biped"));
  });

  // Same summoner-7 biped fixture as above (Str 16 base + 3 table + 2 evolution
  // = 21), with the starting Str hand-set to 14: every level-scaled addend
  // still applies on top, so Str lands at 14 + 3 + 2 = 19.
  it("everything level-scaled still stacks on top of an overridden starting score", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 7 }],
      eidolon: {
        baseForm: "biped",
        name: "Grix",
        baseAbilities: { str: 14, int: 12 },
        evolutions: [{ id: "ability-increase", choice: "str" }],
      },
    });
    const eidolon = deriveEidolon(doc, buildRollData(doc, ref))!;
    expect(eidolon.abilities.str).toEqual({ score: 19, mod: 4 });
    expect(eidolon.abilities.int).toEqual({ score: 12, mod: 1 });
    // untouched abilities keep their RAW defaults
    expect(eidolon.abilities.dex).toEqual({ score: 15, mod: 2 });
    expect(eidolon.abilities.cha).toEqual({ score: 11, mod: 0 });
  });

  it("an empty/absent override derives identically to RAW defaults", () => {
    const build = { baseForm: "quadruped", name: "Grix", evolutions: [] };
    const raw = makeDoc({ classes: [{ tag: "summoner", level: 5 }], eidolon: build });
    const empty = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      eidolon: { ...build, baseAbilities: {} },
    });
    expect(deriveEidolon(empty, buildRollData(empty, ref))!.abilities).toEqual(
      deriveEidolon(raw, buildRollData(raw, ref))!.abilities,
    );
  });
});
