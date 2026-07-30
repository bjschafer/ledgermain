import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, deriveEidolon, EIDOLON_SUBTYPES } from "../src/index.js";

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

describe("deriveEidolon (unchained, Aquatic base form with no subtype — no subtype's baseForms list offers Aquatic/Avian/Tauric, so this always falls back to the form's own attacks)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "aquatic", subtype: "elemental-water", name: "Undine", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("falls back to the chained Aquatic form's own bite, even with Elemental (Water) set (RAW's Elemental baseForms list never offers Aquatic)", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", count: 1, damageDice: "1d6" });
  });

  it("still gets the unchained +2 base-form armor bonus and the subtype's own grants (1st-level immunity note, elemental pool)", () => {
    expect(eidolon!.naturalArmor).toBe(2);
    expect(eidolon!.subtypeName).toBe("Elemental (Water)");
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

describe("deriveEidolon (Aberrant base form, unchained L1, no subtype — Pathfinder Campaign Setting: Horror Realms)", () => {
  // aonprd.com "Subtypes - Eidolon (Unchained)" / d20pfsrd.com "Eidolons
  // (Unchained)": Aberrant base form starting stats "Str 12, Dex 13, Con 16
  // ...; Speed 20 ft., swim 20 ft.; ... Saves Fort (good), Ref (poor), Will
  // (good)"; free evolutions "bite, grab (tentacle mass), tentacle mass".
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "aberrant", name: "Yhog", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("Str 12, Dex 13, Con 16, Int 7, Wis 10, Cha 11 (no level-table bonus yet at L1)", () => {
    expect(eidolon!.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon!.abilities.dex).toEqual({ score: 13, mod: 1 });
    expect(eidolon!.abilities.con).toEqual({ score: 16, mod: 3 });
    expect(eidolon!.abilities.int).toEqual({ score: 7, mod: -2 });
    expect(eidolon!.abilities.wis).toEqual({ score: 10, mod: 0 });
    expect(eidolon!.abilities.cha).toEqual({ score: 11, mod: 0 });
  });

  it("Speed 20 ft., swim 20 ft.", () => {
    expect(eidolon!.speeds).toEqual({ land: 20, swim: 20 });
  });

  it("Saves: Fort good, Ref poor, Will good", () => {
    // hd 1: high = 2 + floor(1/2) = 2, low = floor(1/3) = 0.
    expect(eidolon!.saves).toEqual({ fort: 5, ref: 1, will: 2 });
  });

  it("natural armor is 2 (unchained base-form +2) + 0 (table armorBonus at L1)", () => {
    expect(eidolon!.naturalArmor).toBe(2);
  });

  it("attacks: bite (1d6) and tentacle mass (1d8), BOTH primary — Tentacle Mass's own rules text calls it out as a primary natural weapon, unlike the ordinary secondary-type Tentacle evolution", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    const bite = eidolon!.attacks.find((a) => a.name === "Bite")!;
    const tentacleMass = eidolon!.attacks.find((a) => a.name === "Tentacle mass")!;
    // baseAttackBonus = bab(1) + strMod(1) + size(med, 0) = 2; both primary, no penalty.
    expect(bite).toMatchObject({ count: 1, attack: 2, damageDice: "1d6", attackType: "primary" });
    expect(tentacleMass).toMatchObject({
      count: 1,
      attack: 2,
      damageDice: "1d8",
      attackType: "primary",
    });
  });

  it("free evolution chips list Bite, Grab (tentacle mass), Tentacle Mass", () => {
    expect(eidolon!.freeEvolutionNames).toEqual(["Bite", "Grab (tentacle mass)", "Tentacle Mass"]);
  });
});

describe("deriveEidolon (Aberrant subtype grants — 4th-level +1 evolution pool)", () => {
  it("evolution pool is 4 (unchained L4 column 3 + the unlocked 4th-level +1 pool grant)", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 4,
      eidolon: { baseForm: "biped", subtype: "aberrant", name: "Shai", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData);
    expect(eidolon!.evolutionPointsAvailable).toBe(4);
  });

  it("the 4th-level pool grant isn't unlocked yet at L3 (pool stays at the unchained L3 column, 3)", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 3,
      eidolon: { baseForm: "biped", subtype: "aberrant", name: "Shai", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData);
    expect(eidolon!.evolutionPointsAvailable).toBe(3);
  });

  it("the subtype's biped form grants a free Slam (1d8), same as the other slam-biped subtypes (Angel/Archon/Inevitable/Psychopomp)", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 1,
      eidolon: { baseForm: "biped", subtype: "aberrant", name: "Shai", evolutions: [] },
    });
    const rollData = buildRollData(doc, ref);
    const eidolon = deriveEidolon(doc, rollData);
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Slam", count: 1, damageDice: "1d8" });
  });
});

describe("deriveEidolon (Small eidolon — Pathfinder Unchained sidebar variant, unchained L1 biped)", () => {
  // d20pfsrd.com "Eidolons (Unchained)": "If the eidolon is Small, it gains
  // a +2 bonus to Dexterity. It takes a -4 penalty to Strength and a -2
  // penalty to Constitution. It also has a +1 size bonus to AC and on
  // attack rolls, a -1 penalty on combat maneuver checks and to CMD, a +2
  // bonus on Fly checks, and a +4 bonus on Stealth checks. Reduce the
  // damage of all of its attacks by one step (for example, 1d6 becomes
  // 1d4, and 1d4 becomes 1d3)."
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "biped", name: "Tich", evolutions: [], small: true },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("is flagged small, with size 'sm'", () => {
    expect(eidolon!.small).toBe(true);
    expect(eidolon!.size).toBe("sm");
  });

  it("Str 12 (16 base -4), Dex 14 (12 base +2), Con 11 (13 base -2)", () => {
    expect(eidolon!.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(eidolon!.abilities.dex).toEqual({ score: 14, mod: 2 });
    expect(eidolon!.abilities.con).toEqual({ score: 11, mod: 0 });
  });

  it("AC 15 (base 10 + Dex 2 + natural armor 2 + size 1), CMB +1, CMD 13 (size special mod -1)", () => {
    expect(eidolon!.ac.normal).toBe(15);
    expect(eidolon!.cmb).toBe(1);
    expect(eidolon!.cmd).toBe(13);
  });

  it("the free Claw attack's damage die steps down one (1d4 -> 1d3), attack roll includes the +1 size bonus", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    // baseAttackBonus = bab(1) + strMod(1) + sizeAcMod(1) = 3.
    expect(eidolon!.attacks[0]).toMatchObject({
      name: "Claw",
      count: 2,
      attack: 3,
      damageDice: "1d3",
      damageBonus: 1,
    });
  });

  it("Fly +2 / Stealth +4 racial bonuses show up on the modeled skill total", () => {
    // dexMod(2) + racial(2) = 4 for Fly; dexMod(2) + racial(4) = 6 for Stealth.
    expect(eidolon!.skills.fly!.total).toBe(4);
    expect(eidolon!.skills.ste!.total).toBe(6);
  });
});

describe("deriveEidolon (Small variant regression — an ordinary Medium unchained eidolon is unaffected)", () => {
  it("small: false (explicit) derives identically to small omitted entirely", () => {
    const withFalse = makeDoc({
      classTag: "summonerUnchained",
      level: 1,
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [], small: false },
    });
    const withoutField = makeDoc({
      classTag: "summonerUnchained",
      level: 1,
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
    });
    const a = deriveEidolon(withFalse, buildRollData(withFalse, ref));
    const b = deriveEidolon(withoutField, buildRollData(withoutField, ref));
    expect(a).toEqual(b);
  });

  it("stays Medium size with unstepped Claw damage dice and no Fly/Stealth racial bonus", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 1,
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
    });
    const eidolon = deriveEidolon(doc, buildRollData(doc, ref));
    expect(eidolon!.small).toBe(false);
    expect(eidolon!.size).toBe("med");
    expect(eidolon!.abilities.str).toEqual({ score: 16, mod: 3 });
    expect(eidolon!.abilities.dex).toEqual({ score: 12, mod: 1 });
    expect(eidolon!.abilities.con).toEqual({ score: 13, mod: 1 });
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Claw", damageDice: "1d4" });
    expect(eidolon!.skills.fly!.total).toBe(1); // dexMod(1) only, no racial bonus.
  });

  it("a Small pick is ignored entirely for a CHAINED eidolon (unchained-only variant)", () => {
    const doc: CharacterDoc = {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test Summoner",
        race: raceId("Human"),
        classes: [{ tag: "summoner", level: 1 }],
      },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        eidolon: { baseForm: "biped", name: "Grix", evolutions: [], small: true },
      },
      live: {
        hp: { current: 1, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    } as CharacterDoc;
    const eidolon = deriveEidolon(doc, buildRollData(doc, ref));
    expect(eidolon!.variant).toBe("chained");
    expect(eidolon!.small).toBe(false);
    expect(eidolon!.size).toBe("med");
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

// Genie is ONE subtype id (not per-kind variants): RAW's Elemental Master's
// Handbook text gives two independent free choices (any energy at 1st/12th;
// flight/burrow/gills+swim at 8th) and never names genie kinds — see the
// entry's own source comment. https://www.aonprd.com/EidolonUCSubtypes.aspx
describe("EIDOLON_SUBTYPES.genie (shape)", () => {
  it("is a single biped-only subtype with six grants and no structured 8th-level pick", () => {
    const genie = EIDOLON_SUBTYPES.genie!;
    expect(genie.alignments).toEqual(["CG", "CN", "LE", "LN", "N"]);
    expect(Object.keys(genie.baseForms)).toEqual(["biped"]);
    expect(genie.baseForms.biped!.attacks).toEqual([{ name: "Slam", count: 1, damageDice: "1d8" }]);
    expect(genie.grants).toHaveLength(6);
    // The 8th-level movement pick is the summoner's free choice — deliberately
    // unstructured so no RAW-legal combination is forbidden.
    for (const grant of genie.grants) {
      expect(grant.evolutionIds).toBeUndefined();
      expect(grant.abilityIncrease).toBeUndefined();
    }
    expect(genie.grants.map((g) => g.level)).toEqual([1, 4, 8, 12, 16, 20]);
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Aeon", Plane-Hopper's
// Handbook p.24).
describe("EIDOLON_SUBTYPES.aeon (shape)", () => {
  const aeon = EIDOLON_SUBTYPES.aeon!;

  it("is Neutral-only, with biped and serpentine base forms", () => {
    expect(aeon.alignments).toEqual(["N"]);
    expect(Object.keys(aeon.baseForms).sort()).toEqual(["biped", "serpentine"]);
  });

  it("has all six milestone grants, the 8th being the Flight evolutionIds grant", () => {
    expect(aeon.grants).toHaveLength(6);
    const eighth = aeon.grants.find((g) => g.level === 8)!;
    expect(eighth.evolutionIds).toEqual(["flight"]);
  });

  it("serpentine form has a single Slam 1d8 attack (no bite — RAW's free-evolution list omits it)", () => {
    expect(aeon.baseForms.serpentine!.attacks).toEqual([
      { name: "Slam", count: 1, damageDice: "1d8" },
    ]);
  });
});

describe("deriveEidolon (unchained, Aeon L8 biped — free Flight, no pool bonus)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "biped", subtype: "aeon", name: "Balance", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("gains a fly speed equal to its (unchanged 30 ft.) land speed via the free 8th-level Flight evolution", () => {
    expect(eidolon!.speeds.land).toBe(30);
    expect(eidolon!.speeds.fly).toBe(30);
  });

  it("evolution pool is 6 (unchained L8 column — aeon grants no poolBonus)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(6);
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability. Ancestor has NO structured
// grants (see ancestor.report.md), so this is shape-only — no derived
// fixture.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Ancestor", Blood of
// the Beast p.31).
describe("EIDOLON_SUBTYPES.ancestor (shape)", () => {
  const ancestor = EIDOLON_SUBTYPES.ancestor!;

  it("allows any alignment (no alignment subtype), single biped base form with no free attack", () => {
    expect(ancestor.alignments).toHaveLength(9);
    expect(Object.keys(ancestor.baseForms)).toEqual(["biped"]);
    expect(ancestor.baseForms.biped!.attacks).toEqual([]);
  });

  it("has all six milestone grants, none with a structured field (every mechanic is race/template-conditional prose)", () => {
    expect(ancestor.grants).toHaveLength(6);
    for (const g of ancestor.grants) {
      expect(g.evolutionIds).toBeUndefined();
      expect(g.poolBonus).toBeUndefined();
      expect(g.abilityIncrease).toBeUndefined();
      expect(g.landSpeedBonus).toBeUndefined();
      expect(g.note.length).toBeGreaterThan(0);
    }
  });
});

describe("deriveEidolon (unchained, Ancestor L1 biped — falls back to no attacks, unchained pool)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "biped", subtype: "ancestor", name: "Forebear", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the ancestor subtype with no free natural attacks (RAW grants none)", () => {
    expect(eidolon!.subtypeId).toBe("ancestor");
    expect(eidolon!.attacks).toEqual([]);
  });

  it("evolution pool is 1 (unchained L1 column, no subtype poolBonus)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(1);
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Astral", Plane-
// Hopper's Handbook p.24).
describe("EIDOLON_SUBTYPES.astral (shape)", () => {
  const astral = EIDOLON_SUBTYPES.astral!;

  it("is Neutral-only, with biped and serpentine base forms", () => {
    expect(astral.alignments).toEqual(["N"]);
    expect(Object.keys(astral.baseForms).sort()).toEqual(["biped", "serpentine"]);
  });

  it("has all six milestone grants, the 8th being the Flight evolutionIds grant", () => {
    expect(astral.grants).toHaveLength(6);
    const eighth = astral.grants.find((g) => g.level === 8)!;
    expect(eighth.evolutionIds).toEqual(["flight"]);
  });
});

describe("deriveEidolon (unchained, Astral L8 serpentine — free Flight stacks with the innate climb speed)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "serpentine", subtype: "astral", name: "Cordwalker", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("gains a fly speed equal to its 20 ft. land speed, on top of the serpentine form's own 20 ft. climb speed", () => {
    expect(eidolon!.speeds.land).toBe(20);
    expect(eidolon!.speeds.climb).toBe(20);
    expect(eidolon!.speeds.fly).toBe(20);
  });

  it("evolution pool is 6 (unchained L8 column — astral grants no poolBonus)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(6);
  });
});

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Astral", Plane-
// Hopper's Handbook p.24): "A summoner's class level is halved for the
// purpose of determining the rate at which his astral eidolon's Strength
// and Dexterity increase." Only the Str/Dex Bonus column is affected; HD/
// BAB/saves/evolution pool/armor bonus all stay keyed on the real level
// (see the L8 fixture above, whose pool is the unmodified L8 column).
describe("deriveEidolon (unchained, Astral — halved Str/Dex table level, RAW rounds down)", () => {
  // Biped starts Str 16/Dex 12 (`EIDOLON_BASE_FORMS.biped`). At L7 the
  // eidolon has one automatic Ability Score Increase slot (unlocked at 5th),
  // defaulting to Str, on top of both subtypes here.
  it("L7 biped: Astral's Str/Dex bonus is the L3 column (halved from 7), not the real L7 column", () => {
    const astralDoc = makeDoc({
      classTag: "summonerUnchained",
      level: 7,
      eidolon: { baseForm: "biped", subtype: "astral", name: "Cordwalker", evolutions: [] },
    });
    const angelDoc = makeDoc({
      classTag: "summonerUnchained",
      level: 7,
      eidolon: { baseForm: "biped", subtype: "angel", name: "Seraph", evolutions: [] },
    });
    const astral = deriveEidolon(astralDoc, buildRollData(astralDoc, ref))!;
    const angel = deriveEidolon(angelDoc, buildRollData(angelDoc, ref))!;

    // Real L7 column strDexBonus is 3; L3 (floor(7/2)) column strDexBonus is
    // 1 — a 2-point gap on both Str and Dex.
    expect(angel.abilities.str.score).toBe(20); // 16 + 3 (L7) + 1 (ASI slot, defaults Str)
    expect(angel.abilities.dex.score).toBe(15); // 12 + 3 (L7)
    expect(astral.abilities.str.score).toBe(18); // 16 + 1 (L3) + 1 (ASI slot, defaults Str)
    expect(astral.abilities.dex.score).toBe(13); // 12 + 1 (L3)

    // Every other progression-table column is untouched by the halving.
    expect(astral.hd).toBe(angel.hd);
    expect(astral.bab).toBe(angel.bab);
    expect(astral.evolutionPointsAvailable).toBe(angel.evolutionPointsAvailable);
  });

  it("L13 biped: floor(13/2)=3rd row (level6), not a rounded 7th-row lookup", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 13,
      eidolon: { baseForm: "biped", subtype: "astral", name: "Cordwalker", evolutions: [] },
    });
    const eidolon = deriveEidolon(doc, buildRollData(doc, ref))!;

    // floor(13/2) = 6; the L6 column's strDexBonus is 2 (the L7 column's is
    // 3 — rounding instead of flooring would produce Str 21/Dex 15 here).
    // Two automatic ASI slots (5th, 10th) have unlocked by L13, both
    // defaulting to Str.
    expect(eidolon.abilities.str.score).toBe(20); // 16 + 2 (L6) + 2 (two ASI slots, default Str)
    expect(eidolon.abilities.dex.score).toBe(14); // 12 + 2 (L6)
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Deepwater", Blood of
// the Sea p.23).
describe("EIDOLON_SUBTYPES.deepwater (shape)", () => {
  const deepwater = EIDOLON_SUBTYPES.deepwater!;

  it("restricts to CE/CN/N/NE, serpentine-only base form", () => {
    expect(deepwater.alignments).toEqual(["CE", "CN", "N", "NE"]);
    expect(Object.keys(deepwater.baseForms)).toEqual(["serpentine"]);
  });

  it("has all six milestone grants, the 1st being the Swim evolutionIds grant", () => {
    expect(deepwater.grants).toHaveLength(6);
    const first = deepwater.grants.find((g) => g.level === 1)!;
    expect(first.evolutionIds).toEqual(["swim"]);
  });

  it("serpentine form's attacks are bite 1d6 + tail slap 1d6, same dice as the base Serpentine form", () => {
    expect(deepwater.baseForms.serpentine!.attacks).toEqual([
      { name: "Bite", count: 1, damageDice: "1d6" },
      { name: "Tail slap", count: 1, damageDice: "1d6" },
    ]);
  });
});

describe("deriveEidolon (unchained, Deepwater L1 serpentine — free Swim from 1st level)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "serpentine", subtype: "deepwater", name: "Fathom", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("gains a swim speed equal to its 20 ft. land speed via the free 1st-level Swim evolution", () => {
    expect(eidolon!.speeds.land).toBe(20);
    expect(eidolon!.speeds.swim).toBe(20);
  });

  it("evolution pool is 1 (unchained L1 column — deepwater grants no poolBonus)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(1);
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability. Kami has NO structured
// grants (see kami.report.md), so this is shape-only — no derived fixture.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Kami", Wilderness
// Origins p.18).
describe("EIDOLON_SUBTYPES.kami (shape)", () => {
  const kami = EIDOLON_SUBTYPES.kami!;

  it("allows any non-evil alignment, single biped base form with a Slam 1d8 attack", () => {
    expect(kami.alignments).toEqual(["LG", "NG", "CG", "LN", "N", "CN"]);
    expect(kami.baseForms.biped!.attacks).toEqual([{ name: "Slam", count: 1, damageDice: "1d8" }]);
  });

  it("has all six milestone grants, none with a structured field (ward/merge mechanics are unmodeled)", () => {
    expect(kami.grants).toHaveLength(6);
    for (const g of kami.grants) {
      expect(g.evolutionIds).toBeUndefined();
      expect(g.poolBonus).toBeUndefined();
      expect(g.abilityIncrease).toBeUndefined();
      expect(g.landSpeedBonus).toBeUndefined();
    }
  });
});

describe("deriveEidolon (unchained, Kami L1 biped — attacks and pool unaffected by prose-only grants)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "biped", subtype: "kami", name: "Mori", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("attacks with the subtype's own Slam 1d8, not the chained Biped's claws", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Slam", count: 1, damageDice: "1d8" });
  });

  it("evolution pool is 1 (unchained L1 column, no subtype poolBonus)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(1);
  });
});

// Snippet for eidolon-unchained.test.ts — assumes that file's existing
// `ref`/`raceId`/`makeDoc` helpers are already in scope; shown here with
// the same imports for standalone runnability.

// AoN: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Kyton", Curse of the
// Crimson Throne p.431).
describe("EIDOLON_SUBTYPES.kyton (shape)", () => {
  const kyton = EIDOLON_SUBTYPES.kyton!;

  it("is Lawful evil-only, single biped base form with Improved Natural Armor but no attack", () => {
    expect(kyton.alignments).toEqual(["LE"]);
    expect(kyton.baseForms.biped!.attacks).toEqual([]);
    expect(kyton.baseForms.biped!.freeEvolutionIds).toEqual(["improved-natural-armor"]);
  });

  it("has all six milestone grants, the 4th being the +1 pool point poolBonus grant", () => {
    expect(kyton.grants).toHaveLength(6);
    const fourth = kyton.grants.find((g) => g.level === 4)!;
    expect(fourth.poolBonus).toBe(1);
  });
});

describe("deriveEidolon (unchained, Kyton L4 biped — +2 natural armor from Improved Natural Armor, +1 pool)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 4,
    eidolon: { baseForm: "biped", subtype: "kyton", name: "Chainwrought", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("evolution pool is 4 (unchained L4 column 3 + the unlocked 4th-level +1 pool grant)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(4);
  });

  it("natural armor includes the base form's Improved Natural Armor free evolution (+2) on top of the unchained +2 base-form bonus", () => {
    // unchainedFormArmorBonus 2 + table armorBonus at L4 (2) + Improved Natural Armor's own +2 = 6.
    expect(eidolon!.naturalArmor).toBe(6);
  });

  it("has no free natural attack (RAW's Kyton biped grants none)", () => {
    expect(eidolon!.attacks).toEqual([]);
  });
});

// Radiant: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Radiant" entry,
// Plane-Hopper's Handbook p.25).
describe("deriveEidolon (unchained, Radiant L8 biped — free Flight grant)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "biped", subtype: "radiant", name: "Lumen", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the radiant subtype (Neutral)", () => {
    expect(eidolon!.subtypeId).toBe("radiant");
    expect(eidolon!.subtypeName).toBe("Radiant");
    expect(eidolon!.subtypeAlignmentText).toBe("Neutral");
  });

  it("lists all six milestone grants, with the 8th unlocked", () => {
    expect(eidolon!.grantedEvolutions).toHaveLength(6);
    const eighth = eidolon!.grantedEvolutions.find((g) => g.level === 8)!;
    expect(eighth.unlocked).toBe(true);
  });

  it("attacks with a single bite 1d6 (the subtype's biped attack, not a claw)", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", count: 1, damageDice: "1d6" });
  });

  it("evolution pool is 6 (unchained L8 column; radiant has no pool-bonus grants)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(6);
  });

  it("gains a fly speed equal to its land speed via the free 8th-level Flight evolution", () => {
    expect(eidolon!.speeds.land).toBe(30);
    expect(eidolon!.speeds.fly).toBe(30);
  });
});

// Shadow: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Shadow" entry,
// Blood of Shadows p.11).
describe("deriveEidolon (unchained, Shadow L8 quadruped — +1 pool grant)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "quadruped", subtype: "shadow", name: "Umbra", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the shadow subtype (any nongood)", () => {
    expect(eidolon!.subtypeId).toBe("shadow");
    expect(eidolon!.subtypeAlignmentText).toBe("Any nongood");
  });

  it("attacks with a single bite 1d6 (the subtype's quadruped attack)", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", count: 1, damageDice: "1d6" });
  });

  it("evolution pool is 7 (unchained L8 column 6 + the unlocked 8th-level +1 pool grant)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(7);
  });

  it("natural armor is 8: 2 (unchained base-form bonus) + 6 (table armorBonus at L8)", () => {
    expect(eidolon!.naturalArmor).toBe(8);
  });
});

describe("deriveEidolon (unchained, Shadow L1 serpentine — Improved Natural Armor baked into the form)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "serpentine", subtype: "shadow", name: "Gloam", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("attacks with a bite 1d6 (primary) and a tail slap 1d6 (secondary)", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", damageDice: "1d6" });
    expect(eidolon!.attacks[1]).toMatchObject({ name: "Tail slap", damageDice: "1d6" });
  });

  it("natural armor includes the form's free Improved Natural Armor evolution on top of the base +2", () => {
    // Serpentine's unchained-base +2, plus the Improved Natural Armor
    // evolution's own +2 (see EIDOLON_EVOLUTIONS), plus the L1 table
    // armorBonus of 0.
    expect(eidolon!.naturalArmor).toBe(4);
  });
});

// Storykin: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Storykin" entry,
// Plane-Hopper's Handbook p.26). Modeled as a single subtype id (alignment
// and harrow-suit targeting stay prose-only) — see storykin.report.md.
describe("deriveEidolon (unchained, Storykin L8 biped — harrow-suit Ability Increase grant, Cha chosen)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: {
      baseForm: "biped",
      subtype: "storykin",
      name: "Painted One",
      evolutions: [],
      subtypeGrantChoices: { "8": "cha" },
    },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the storykin subtype with a 'varies' alignment text and no fixed alignment codes", () => {
    expect(eidolon!.subtypeId).toBe("storykin");
    expect(eidolon!.subtypeAlignmentText).toMatch(/varies/i);
  });

  it("attacks with a single slam 1d8 (the subtype's biped attack)", () => {
    expect(eidolon!.attacks).toHaveLength(1);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Slam", count: 1, damageDice: "1d8" });
  });

  it("evolution pool is 6 (unchained L8 column; storykin has no pool-bonus grants)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(6);
  });

  it("Cha is 13 (universal 11 + the 8th-level grant's +2, targeted via subtypeGrantChoices)", () => {
    expect(eidolon!.abilities.cha).toEqual({ score: 13, mod: 1 });
  });
});

describe("deriveEidolon (unchained, Storykin L1 serpentine — same free evolutions as Protean's serpentine)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "serpentine", subtype: "storykin", name: "Rabbit Prince", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("attacks with a bite 1d6 (primary) and a tail slap 1d6 (secondary)", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", damageDice: "1d6" });
    expect(eidolon!.attacks[1]).toMatchObject({ name: "Tail slap", damageDice: "1d6" });
  });
});

// Twinned: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Twinned" entry,
// Legacy of the First World p.18).
describe("deriveEidolon (unchained, Twinned L16 biped — 16th-level Ability Increase grant, Int chosen)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 16,
    eidolon: {
      baseForm: "biped",
      subtype: "twinned",
      name: "Mirror",
      evolutions: [],
      subtypeGrantChoices: { "16": "int" },
    },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the twinned subtype (any alignment)", () => {
    expect(eidolon!.subtypeId).toBe("twinned");
    expect(eidolon!.subtypeAlignmentText).toBe("Any");
  });

  it("has NO natural attacks — the twinned biped is weapon-wielding, like Azata's", () => {
    expect(eidolon!.attacks).toHaveLength(0);
  });

  it("evolution pool is 12 (unchained L16 column; twinned has no pool-bonus grants)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(12);
  });

  it("Int is 9 (universal 7 + the 16th-level grant's +2, targeted via subtypeGrantChoices)", () => {
    expect(eidolon!.abilities.int).toEqual({ score: 9, mod: -1 });
  });
});

describe("deriveEidolon (unchained, Twinned L4 biped — no grant yet)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 4,
    eidolon: { baseForm: "biped", subtype: "twinned", name: "Echo", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("lists all six milestone grants, with only 1st and 4th unlocked", () => {
    expect(eidolon!.grantedEvolutions).toHaveLength(6);
    expect(eidolon!.grantedEvolutions.filter((g) => g.unlocked)).toHaveLength(2);
  });
});

// Void: https://www.aonprd.com/EidolonUCSubtypes.aspx ("Void" entry,
// Plane-Hopper's Handbook p.25).
describe("deriveEidolon (unchained, Void L8 biped — free Flight grant)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 8,
    eidolon: { baseForm: "biped", subtype: "void", name: "Sceadu", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("resolves the void subtype (neutral or neutral evil)", () => {
    expect(eidolon!.subtypeId).toBe("void");
    expect(eidolon!.subtypeAlignmentText).toBe("Neutral or neutral evil");
  });

  it("attacks with a bite 1d6 and 2 wing buffets 1d4 (the subtype's biped attacks)", () => {
    expect(eidolon!.attacks).toHaveLength(2);
    expect(eidolon!.attacks[0]).toMatchObject({ name: "Bite", count: 1, damageDice: "1d6" });
    expect(eidolon!.attacks[1]).toMatchObject({
      name: "Wing buffet",
      count: 2,
      damageDice: "1d4",
    });
  });

  it("evolution pool is 6 (unchained L8 column; void has no pool-bonus grants)", () => {
    expect(eidolon!.evolutionPointsAvailable).toBe(6);
  });

  it("gains a fly speed equal to its land speed via the free 8th-level Flight evolution", () => {
    expect(eidolon!.speeds.land).toBe(30);
    expect(eidolon!.speeds.fly).toBe(30);
  });
});

describe("deriveEidolon (unchained, Void L1 biped — no Flight grant yet)", () => {
  const doc = makeDoc({
    classTag: "summonerUnchained",
    level: 1,
    eidolon: { baseForm: "biped", subtype: "void", name: "Wisp", evolutions: [] },
  });
  const rollData = buildRollData(doc, ref);
  const eidolon = deriveEidolon(doc, rollData);

  it("has no fly speed yet at 1st level", () => {
    expect(eidolon!.speeds.fly).toBeUndefined();
  });
});
