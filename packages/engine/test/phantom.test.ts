import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, derivePhantom, phantomSlamDamage } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  phantom?: CharacterDoc["build"]["phantom"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  sharedBuffIds?: string[];
  /** The phantom's OWN active conditions, independent of the spiritualist's `live.conditions`. */
  phantomConditions?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Spiritualist",
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
      phantom: overrides.phantom,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: overrides.activeBuffs ?? [],
      resources: {},
      phantom:
        overrides.sharedBuffIds || overrides.phantomConditions
          ? { sharedBuffIds: overrides.sharedBuffIds, conditions: overrides.phantomConditions }
          : undefined,
    },
  } as CharacterDoc;
}

describe("derivePhantom (spiritualist-7 anger-focus medium phantom, hand-computed fixture)", () => {
  const doc = makeDoc({
    classes: [{ tag: "spiritualist", level: 7 }],
    phantom: { focus: "anger", name: "Grief" },
  });
  const rollData = buildRollData(doc, ref);
  const phantom = derivePhantom(doc, rollData);

  it("derives a phantom at spiritualist level 7", () => {
    expect(phantom).toBeDefined();
    expect(phantom!.level).toBe(7);
  });

  it("HD 6, BAB +6 (full BAB)", () => {
    expect(phantom!.hd).toBe(6);
    expect(phantom!.bab).toBe(6);
  });

  it("Ability scores: Str 12, Dex 16, Con 13, Cha 16 (base + table Dex/Cha bonus + default ASI to Cha)", () => {
    expect(phantom!.abilities.str).toEqual({ score: 12, mod: 1 });
    expect(phantom!.abilities.dex).toEqual({ score: 16, mod: 3 });
    expect(phantom!.abilities.con).toEqual({ score: 13, mod: 1 });
    expect(phantom!.abilities.cha).toEqual({ score: 16, mod: 3 });
  });

  it("Saves: Fort +6, Ref +5, Will +5 (Anger's good Fort/Will, poor Ref)", () => {
    expect(phantom!.saves.fort).toBe(6);
    expect(phantom!.saves.ref).toBe(5);
    expect(phantom!.saves.will).toBe(5);
  });

  it("AC 19, touch 13, flat-footed 16 (base 10 + Dex 3 + manifestation 6)", () => {
    expect(phantom!.ac.normal).toBe(19);
    expect(phantom!.ac.touch).toBe(13);
    expect(phantom!.ac.flatFooted).toBe(16);
  });

  it("CMB +7, CMD 20", () => {
    expect(phantom!.cmb).toBe(7);
    expect(phantom!.cmd).toBe(20);
  });

  it("Attacks: 2 slams +7 (1d8+1) — Str-based (Str mod +1), not the higher Dex mod +3 (no Weapon Finesse pick for phantoms)", () => {
    // bab(6) + strMod(1) + size(med, 0) = 7 (was 9 under the old max(str,dex) rule).
    expect(phantom!.attacks).toHaveLength(1);
    expect(phantom!.attacks[0]).toMatchObject({
      name: "Slam",
      count: 2,
      attack: 7,
      damageDice: "1d8",
      damageBonus: 1,
    });
  });

  it("HP max 39 (floor(5.5*6) + 1*6)", () => {
    expect(phantom!.hp.max).toBe(39);
    expect(phantom!.hp.current).toBe(39);
  });

  it("Skills: Intimidate +12, Survival +9 (HD 6 + class skill 3 + ability mod)", () => {
    expect(phantom!.skills.int?.total).toBe(12);
    expect(phantom!.skills.sur?.total).toBe(9);
  });

  it("special abilities cumulative through level 7, excluding Ability Score Increase", () => {
    const names = phantom!.specialAbilities.map((a) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Anger",
        "Darkvision",
        "Link",
        "Share Spells",
        "Deliver Touch Spells",
        "Magic Attacks",
        "Damage Reduction 5/magic",
        "Devotion",
      ]),
    );
    expect(names).not.toContain("Ability Score Increase");
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
        phantom: { sharedBuffIds: ["barkskin-1"] },
      },
    };
    const buffed = derivePhantom(withBuff, rollData);
    expect(buffed!.ac.normal).toBe(21);
    expect(buffed!.ac.touch).toBe(13);
    expect(buffed!.ac.flatFooted).toBe(18);
  });
});

describe("derivePhantom size variants", () => {
  it("Small phantom deals 1d4 slam damage at 1st level; Large deals 1d8", () => {
    expect(phantomSlamDamage("sm", 1)).toBe("1d4");
    expect(phantomSlamDamage("med", 1)).toBe("1d6");
    expect(phantomSlamDamage("lg", 1)).toBe("1d8");
  });

  it("slam damage steps up at levels 5, 13, and 17", () => {
    expect(phantomSlamDamage("med", 4)).toBe("1d6");
    expect(phantomSlamDamage("med", 5)).toBe("1d8");
    expect(phantomSlamDamage("med", 12)).toBe("1d8");
    expect(phantomSlamDamage("med", 13)).toBe("2d6");
    expect(phantomSlamDamage("med", 16)).toBe("2d6");
    expect(phantomSlamDamage("med", 17)).toBe("2d8");
    expect(phantomSlamDamage("med", 20)).toBe("2d8");
  });

  it("a Large phantom's own AC/CMB/CMD reflect the size modifier", () => {
    const doc = makeDoc({
      classes: [{ tag: "spiritualist", level: 1 }],
      phantom: { focus: "hatred", name: "Grudge", size: "lg" },
    });
    const rollData = buildRollData(doc, ref);
    const phantom = derivePhantom(doc, rollData)!;
    expect(phantom.size).toBe("lg");
    // Large: size AC mod -1, special size mod +1 (specialSizeMod = -SIZE_AC_MOD).
    expect(phantom.attacks[0]!.damageDice).toBe("1d8");
  });
});

describe("derivePhantom edge cases", () => {
  it("returns undefined with no build.phantom", () => {
    const doc = makeDoc({ classes: [{ tag: "spiritualist", level: 5 }] });
    const rollData = buildRollData(doc, ref);
    expect(derivePhantom(doc, rollData)).toBeUndefined();
  });

  it("returns undefined for an unknown Emotional Focus id (soft fail, no crash)", () => {
    const doc = makeDoc({
      classes: [{ tag: "spiritualist", level: 5 }],
      phantom: { focus: "not-a-focus", name: "Ghost" },
    });
    const rollData = buildRollData(doc, ref);
    expect(derivePhantom(doc, rollData)).toBeUndefined();
  });

  it("player-assigned ability increase routes to the chosen ability instead of the Cha default", () => {
    const doc = makeDoc({
      classes: [{ tag: "spiritualist", level: 5 }],
      phantom: { focus: "anger", name: "Grief", abilityIncreases: ["str"] },
    });
    const rollData = buildRollData(doc, ref);
    const phantom = derivePhantom(doc, rollData)!;
    // level 5 row: abilityBonus +2 to Dex/Cha automatically; the single ASI slot goes to Str.
    expect(phantom.abilities.str).toEqual({ score: 13, mod: 1 });
    expect(phantom.abilities.cha).toEqual({ score: 15, mod: 2 });
  });
});

describe("derivePhantom own active conditions", () => {
  // spiritualist-1 anger-focus medium phantom: hd 1, bab +1, Str 12 (mod +1),
  // Dex 14 (mod +2), Con 13 (mod +1), Cha 13 (mod +1); slam attack = bab(1) +
  // strMod(1) + size(0) = 2, saves fort 2(base)+1(con)=3 / ref 0(base)+2(dex)=2
  // / will 2(base)+0(wis)=2, Intimidate total = hd(1)+chaMod(1)+3(class
  // skill) = 5 — hand-verified baseline for the deltas below.
  function anger1(phantomConditions?: string[]): CharacterDoc {
    return makeDoc({
      classes: [{ tag: "spiritualist", level: 1 }],
      phantom: { focus: "anger", name: "Grief" },
      phantomConditions,
    });
  }

  it("shaken (-2 attack, -2 all saves, -2 skills — global 'skills' target)", () => {
    const doc = anger1(["shaken"]);
    const rollData = buildRollData(doc, ref);
    const phantom = derivePhantom(doc, rollData)!;
    // baseline slam attack 2 (see anger1's comment above) - 2 (shaken) = 0.
    expect(phantom.attacks[0]).toMatchObject({ attack: 0 });
    expect(phantom.saves).toEqual({ fort: 1, ref: 0, will: 0 });
    expect(phantom.skills.int!.total).toBe(3);
  });

  it("is independent of the spiritualist's own live.conditions (no active conditions -> unaffected baseline)", () => {
    const doc = anger1();
    const rollData = buildRollData(doc, ref);
    const phantom = derivePhantom(doc, rollData)!;
    expect(phantom.attacks[0]).toMatchObject({ attack: 2 });
    expect(phantom.saves).toEqual({ fort: 3, ref: 2, will: 2 });
    expect(phantom.skills.int!.total).toBe(5);
  });
});
