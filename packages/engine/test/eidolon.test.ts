import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  deriveEidolon,
  eidolonBaseFormIdsForVariant,
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

  // Ultimate Magic p.74 "Base Forms - Eidolon" (aonprd.com): "Size Medium;
  // Speed 20 ft., swim 40 ft.; AC +4 natural armor ...; Saves Fort (good),
  // Ref (good), Will (bad); Attack bite (1d6); ... Str 16, Dex 12, Con 13
  // ...; Free Evolutions bite, improved natural armor, gills, swim (2)".
  it("Aquatic: Fort/Ref good, Will poor; swim 40 (land 20 + two free Swim picks); sole bite gets the UMR ×1.5 Str rider", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "aquatic", name: "Riptide", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.baseFormName).toBe("Aquatic");
    expect(eidolon.speeds).toEqual({ land: 20, swim: 40 });
    // level 1: hd 1, strDexBonus 0. Str 16 -> mod +3. bab = babForLevels("high", 1) = 1.
    expect(eidolon.abilities.str).toEqual({ score: 16, mod: 3 });
    expect(eidolon.hd).toBe(1);
    expect(eidolon.bab).toBe(1);
    expect(eidolon.saves.fort).toBeGreaterThan(eidolon.saves.will);
    expect(eidolon.saves.ref).toBeGreaterThan(eidolon.saves.will);
    // Bite is the ONLY attack form (count 1 total) -> UMR sole-natural-attack
    // rule applies (natural-attacks.ts): full BAB, ×1.5 Str on damage
    // (floor(3*1.5)=4), not the ordinary ×1 primary multiplier.
    expect(eidolon.attacks).toEqual([
      {
        name: "Bite",
        count: 1,
        attack: 4,
        damageDice: "1d6",
        damageBonus: 4,
        attackType: "primary",
      },
    ]);
    expect(eidolon.freeEvolutionNames).toEqual([
      "Bite",
      "Improved Natural Armor",
      "Gills",
      "Swim x2",
    ]);
  });

  // Player Companion: Cohorts and Companions p.9 (aonprd.com "Base Forms -
  // Eidolon"): "Speed 30 ft., fly 30 ft. (good); ... Saves Fort (bad), Ref
  // (good), Will (good); Attack 2 claws (1d3); ... Str 12, Dex 16, Con 13
  // ...; Free Evolutions claws, flight, limbs (legs)". `mediumSizeUpgrade` is
  // set here so this fixture tests the form's Medium-baseline numbers same as
  // every other base-form variant test in this describe block; the form's
  // own default-Small state has its own dedicated describe block below.
  it("Avian: Ref/Will good, Fort poor; innate fly speed equal to land speed; 2 claws (1d3), no ×1.5 (2 total attacks)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "avian", name: "Skree", evolutions: [], mediumSizeUpgrade: true },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.baseFormName).toBe("Avian");
    expect(eidolon.speeds).toEqual({ land: 30, fly: 30 });
    // level 1: Str 12 -> mod +1, Dex 16 -> mod +3. bab = 1.
    expect(eidolon.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon.abilities.dex).toEqual({ score: 16, mod: 3 });
    expect(eidolon.saves.ref).toBeGreaterThan(eidolon.saves.fort);
    expect(eidolon.saves.will).toBeGreaterThan(eidolon.saves.fort);
    // "2 claws" totals 2 attacks (not the UMR sole-attack case), so the usual
    // ×1 primary multiplier applies: bab(1)+strMod(1)+size(0)=2; damage strMod(1) -> 1d3+1.
    expect(eidolon.attacks).toEqual([
      {
        name: "Claw",
        count: 2,
        attack: 2,
        damageDice: "1d3",
        damageBonus: 1,
        attackType: "primary",
      },
    ]);
  });

  // Player Companion: Cohorts and Companions p.9 (aonprd.com "Base Forms -
  // Eidolon"): "Speed 40 ft.; ... Saves Fort (good), Ref (bad), Will (good);
  // Attack 2 claws (1d4); ... Str 14, Dex 14, Con 13 ...; Free Evolutions
  // claws, limbs (arms), limbs (legs) (2)". Same Medium-upgrade opt-in as
  // Avian's fixture above, for the same reason.
  it("Tauric: Fort/Will good, Ref poor; land speed 40 with no other movement mode; 2 claws (1d4)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "tauric", name: "Centaur", evolutions: [], mediumSizeUpgrade: true },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData)!;
    expect(eidolon.baseFormName).toBe("Tauric");
    expect(eidolon.speeds).toEqual({ land: 40 });
    // level 1: Str 14 -> mod +2, Dex 14 -> mod +2. bab = 1.
    expect(eidolon.abilities.str).toEqual({ score: 14, mod: 2 });
    expect(eidolon.abilities.dex).toEqual({ score: 14, mod: 2 });
    // fort (good): saveForLevels("high",1)=2 + conMod(1) = 3. ref (poor): 0 + dexMod(2) = 2.
    // will (good): 2 + wisMod(0) = 2 — ties Ref here since Wis is untouched, but Fort is
    // unambiguously the higher of the two good saves.
    expect(eidolon.saves).toEqual({ fort: 3, ref: 2, will: 2 });
    // bab(1)+strMod(2)+size(0)=3; damage strMod(2) -> 1d4+2 (2 total attacks, no ×1.5).
    expect(eidolon.attacks).toEqual([
      {
        name: "Claw",
        count: 2,
        attack: 3,
        damageDice: "1d4",
        damageBonus: 2,
        attackType: "primary",
      },
    ]);
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

  it("returns undefined for a CHAINED summoner with baseForm 'aberrant' (Horror Realms/unchained-only, gated via EidolonBaseForm.variants)", () => {
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      eidolon: { baseForm: "aberrant", name: "Ghost", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    expect(deriveEidolon(doc, rollData)).toBeUndefined();
  });

  it("eidolonBaseFormIdsForVariant excludes 'aberrant' for chained, includes it for unchained", () => {
    expect(eidolonBaseFormIdsForVariant("chained")).not.toContain("aberrant");
    expect(eidolonBaseFormIdsForVariant("chained")).toEqual(
      expect.arrayContaining(["biped", "quadruped", "serpentine"]),
    );
    expect(eidolonBaseFormIdsForVariant("unchained")).toContain("aberrant");
  });

  it("eidolonBaseFormIdsForVariant offers Aquatic/Avian/Tauric to BOTH variants (no variants restriction, unlike Aberrant)", () => {
    for (const variant of ["chained", "unchained"] as const) {
      expect(eidolonBaseFormIdsForVariant(variant)).toEqual(
        expect.arrayContaining(["aquatic", "avian", "tauric"]),
      );
    }
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
    expect(eidolonStartingAbilities("not-a-real-form")).toEqual(eidolonStartingAbilities("biped"));
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

describe("deriveEidolon (Avian/Tauric default-Small sidebar rule, chained summoner-1)", () => {
  // aonprd.com "Base Forms - Eidolon", Avian's own Size Note: "When summoned,
  // an avian eidolon is Small unless it spends 2 points from its evolution
  // pool." The form's single printed ability-score line (Str 12, Dex 16, Con
  // 13) is unchanged either way — neither the Avian nor the Tauric sidebar
  // text states an ability-score delta for the Small state, unlike the
  // unrelated Pathfinder Unchained "Small eidolon" variant (`EidolonBuild.small`).
  const doc = makeDoc({
    classes: [{ tag: "summoner", level: 1 }],
    eidolon: { baseForm: "avian", name: "Skree", evolutions: [] },
  });
  const eidolon = deriveEidolon(doc, buildRollData(doc, ref))!;

  it("is Small by default, with 0 evolution points spent on the upgrade", () => {
    expect(eidolon.size).toBe("sm");
    expect(eidolon.formDefaultsSmall).toBe(true);
    expect(eidolon.small).toBe(false); // the unrelated Unchained sidebar flag, not this rule
    expect(eidolon.evolutionPointsSpent).toBe(0);
  });

  it("ability scores are the form's printed Str 12/Dex 16/Con 13, unaffected by being Small", () => {
    expect(eidolon.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon.abilities.dex).toEqual({ score: 16, mod: 3 });
    expect(eidolon.abilities.con).toEqual({ score: 13, mod: 1 });
  });

  it("AC/CMB/CMD carry the Small size modifier (base 10 + Dex 3 + size 1 = 14 AC; CMB +1; CMD 14)", () => {
    expect(eidolon.ac.normal).toBe(14);
    expect(eidolon.cmb).toBe(1);
    expect(eidolon.cmd).toBe(14);
  });

  it("the free Claw attack's damage die steps down for Small (1d3 -> 1d2), attack roll includes the +1 size bonus", () => {
    expect(eidolon.attacks).toHaveLength(1);
    // baseAttackBonus = bab(1) + strMod(1) + sizeAcMod(1) = 3.
    expect(eidolon.attacks[0]).toMatchObject({
      name: "Claw",
      count: 2,
      attack: 3,
      damageDice: "1d2",
      damageBonus: 1,
    });
  });

  it("Fly +2 / Stealth +4 size-based skill bonuses apply, same as any other Small creature", () => {
    // dexMod(3) + racial(2) = 5 for Fly; dexMod(3) + racial(4) = 7 for Stealth.
    expect(eidolon.skills.fly!.total).toBe(5);
    expect(eidolon.skills.ste!.total).toBe(7);
  });
});

describe("deriveEidolon (Avian/Tauric mediumSizeUpgrade — spends 2 points to be Medium)", () => {
  const doc = makeDoc({
    classes: [{ tag: "summoner", level: 1 }],
    eidolon: {
      baseForm: "avian",
      name: "Skree",
      evolutions: [],
      mediumSizeUpgrade: true,
    },
  });
  const eidolon = deriveEidolon(doc, buildRollData(doc, ref))!;

  it("derives Medium, with the 2-point upgrade counted in evolutionPointsSpent", () => {
    expect(eidolon.size).toBe("med");
    expect(eidolon.formDefaultsSmall).toBe(false);
    expect(eidolon.evolutionPointsSpent).toBe(2);
    expect(eidolon.evolutionPointsAvailable).toBe(3); // the pool itself is untouched by the spend
  });

  it("ability scores are still the same printed Str 12/Dex 16/Con 13 — no delta for either size", () => {
    expect(eidolon.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon.abilities.dex).toEqual({ score: 16, mod: 3 });
    expect(eidolon.abilities.con).toEqual({ score: 13, mod: 1 });
  });

  it("AC/CMB/CMD/attacks drop the Small size bonus, and the claw damage die is back to its printed 1d3", () => {
    expect(eidolon.ac.normal).toBe(13);
    expect(eidolon.cmb).toBe(2);
    expect(eidolon.cmd).toBe(15);
    expect(eidolon.attacks[0]).toMatchObject({ attack: 2, damageDice: "1d3" });
    expect(eidolon.skills.fly!.total).toBe(3); // dexMod(3) only, no size racial bonus
  });

  it("Tauric's own Size Note reads the same way (Str 14/Dex 14/Con 13 unchanged, Medium via the flag)", () => {
    const tauric = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "tauric", name: "Bront", evolutions: [], mediumSizeUpgrade: true },
    });
    const derived = deriveEidolon(tauric, buildRollData(tauric, ref))!;
    expect(derived.size).toBe("med");
    expect(derived.evolutionPointsSpent).toBe(2);
    expect(derived.abilities.str).toEqual({ score: 14, mod: 2 });
    expect(derived.attacks[0]).toMatchObject({ name: "Claw", damageDice: "1d4" });
  });

  it("a Medium avian's fly speed gains +40 ft at 5th (the sidebar's own rider); a Small one never does", () => {
    // "At 5th level, a Medium or larger avian eidolon's flight speed
    // increases by 40 feet, as if it had 2 more points in the flight
    // evolution." (Cohorts and Companions p.9, aonprd.com.)
    const medium5 = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      eidolon: { baseForm: "avian", name: "Skree", evolutions: [], mediumSizeUpgrade: true },
    });
    expect(deriveEidolon(medium5, buildRollData(medium5, ref))!.speeds["fly"]).toBe(70); // 30 + 40
    const small5 = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      eidolon: { baseForm: "avian", name: "Skree", evolutions: [] },
    });
    expect(deriveEidolon(small5, buildRollData(small5, ref))!.speeds["fly"]).toBe(30);
    const medium4 = makeDoc({
      classes: [{ tag: "summoner", level: 4 }],
      eidolon: { baseForm: "avian", name: "Skree", evolutions: [], mediumSizeUpgrade: true },
    });
    expect(deriveEidolon(medium4, buildRollData(medium4, ref))!.speeds["fly"]).toBe(30);
  });
});

describe("deriveEidolon (mediumSizeUpgrade is a no-op on any form other than Avian/Tauric)", () => {
  it("a Biped with the flag set derives identically to one without it", () => {
    const withFlag = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [], mediumSizeUpgrade: true },
    });
    const withoutFlag = makeDoc({
      classes: [{ tag: "summoner", level: 1 }],
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
    });
    const a = deriveEidolon(withFlag, buildRollData(withFlag, ref));
    const b = deriveEidolon(withoutFlag, buildRollData(withoutFlag, ref));
    expect(a).toEqual(b);
    expect(a!.size).toBe("med");
    expect(a!.evolutionPointsSpent).toBe(0);
    expect(a!.formDefaultsSmall).toBe(false);
  });
});
