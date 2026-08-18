import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  compute,
  deriveFamiliar,
  IMPROVED_FAMILIARS,
  type FamiliarMasterInputs,
} from "../src/index.js";

const ref = loadRefData();

const MEPHIT_IDS = [
  "air-mephit",
  "dust-mephit",
  "earth-mephit",
  "fire-mephit",
  "ice-mephit",
  "magma-mephit",
  "ooze-mephit",
  "salt-mephit",
  "steam-mephit",
  "water-mephit",
] as const;

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeMasterDoc(
  level: number,
  build: Partial<CharacterDoc["build"]> = {},
  live: Partial<CharacterDoc["live"]> = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 20, wis: 12, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      settings: { statOverrides: { "hp.max": 40 } },
      ...build,
    },
    live: {
      hp: { current: 40, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      ...live,
    },
  } as CharacterDoc;
}

function familiarFor(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  const master: FamiliarMasterInputs = {
    maxHp: sheet.hp.max,
    bab: sheet.bab,
    baseSaves: {
      fort: sheet.saves.fort.components.find((c) => c.type === "base")?.value ?? 0,
      ref: sheet.saves.ref.components.find((c) => c.type === "base")?.value ?? 0,
      will: sheet.saves.will.components.find((c) => c.type === "base")?.value ?? 0,
    },
  };
  const rollData = buildRollData(doc, ref, sheet.abilities, sheet.speeds, sheet.bab);
  return deriveFamiliar(doc, master, rollData);
}

describe("mephit improved familiars (drift guard)", () => {
  it("all ten mephits are present under the expected ids", () => {
    for (const id of MEPHIT_IDS) {
      expect(IMPROVED_FAMILIARS[id], id).toBeDefined();
    }
  });
});

// Wizard 7: BAB +3, base saves Fort +2/Ref +2/Will +5 (poor/poor/good), maxHp
// 40 (statOverrides) -> familiar hp.max 20. Same master doc as
// `improvedFamiliars.test.ts`'s imp fixture, reused here since both
// representative mephits share the imp test's master.
describe("deriveFamiliar: fire mephit for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "fire-mephit", name: "Ember" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar).toBeDefined();
    expect(familiar.creatureType).toBe("Outsider (fire)");
    expect(familiar.hd).toBe(3);
    expect(familiar.languages).toEqual(["Common", "Ignan"]);
  });

  it("HP is half the master's 40", () => {
    expect(familiar.hp.max).toBe(20);
  });

  it("AC 20 (10 +2 Dex +7 natural: own 3 + table 4 +1 size), touch 13, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(13);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("saves better-of the species' own poor-Fort/good-Ref/good-Will base and the master's", () => {
    // fort: max(species 1, master 2) + Con 1 = 3
    // ref: max(species 3, master 2) + Dex 2 = 5
    // will: max(species 3, master 5) + Wis 0 = 5
    expect(familiar.saves.fort).toBe(3);
    expect(familiar.saves.ref).toBe(5);
    expect(familiar.saves.will).toBe(5);
  });

  it("claw +6 x2 (master BAB 3 + Dex 2 + size 1), damage 1d3+1 (Str 1)", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.count).toBe(2);
    expect(familiar.attacks[0]!.attack).toBe(6);
    expect(familiar.attacks[0]!.damageBonus).toBe(1);
    expect(familiar.attacks[0]!.damageDice).toBe("1d3");
  });

  it("CMB +3 / CMD 15", () => {
    expect(familiar.cmb).toBe(3);
    expect(familiar.cmd).toBe(15);
  });

  it("own skill ranks + own class skills reproduce the printed totals", () => {
    expect(familiar.skills.blf!.total).toBe(8);
    expect(familiar.skills.fly!.total).toBe(10);
    expect(familiar.skills.per!.total).toBe(6);
    expect(familiar.skills.ste!.total).toBe(12);
  });

  it("defenses: DR 5/magic, fast healing 2, immune fire, vulnerable to cold", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/magic",
      fastHealing: 2,
      immune: ["fire"],
      weaknesses: ["vulnerability to cold"],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("two SLAs: Scorching Ray (1/hour, unmetered) and Heat Metal (1/day)", () => {
    expect(familiar.slas).toHaveLength(2);
    const ray = familiar.slas!.find((s) => s.slug === "scorching-ray")!;
    expect(ray.frequency).toBe("atWill");
    expect(ray.note).toBe("1/hour");
    expect(ray.cl).toBe(6);
    expect(ray.dcMod).toBe(2);
    const heatMetal = familiar.slas!.find((s) => s.slug === "heat-metal")!;
    expect(heatMetal.usesMax).toBe(1);
    expect(heatMetal.usesRemaining).toBe(1);
    expect(heatMetal.per).toBe("day");
  });

  it("never gains Speak with Animals of Its Kind", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });
});

describe("deriveFamiliar: ice mephit for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "ice-mephit", name: "Frost" } });
  const familiar = familiarFor(doc)!;

  it("shares the fire mephit's chassis numbers (AC, saves, attack, CMB/CMD, skills)", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(13);
    expect(familiar.ac.flatFooted).toBe(18);
    expect(familiar.saves).toEqual({ fort: 3, ref: 5, will: 5 });
    expect(familiar.attacks[0]!.attack).toBe(6);
    expect(familiar.attacks[0]!.damageBonus).toBe(1);
    expect(familiar.cmb).toBe(3);
    expect(familiar.cmd).toBe(15);
    expect(familiar.skills.blf!.total).toBe(8);
    expect(familiar.skills.fly!.total).toBe(10);
    expect(familiar.skills.per!.total).toBe(6);
    expect(familiar.skills.ste!.total).toBe(12);
  });

  it("defenses: immune cold, vulnerable to fire", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/magic",
      fastHealing: 2,
      immune: ["cold"],
      weaknesses: ["vulnerability to fire"],
    });
  });

  it("two SLAs: Magic Missile (1/hour, unmetered) and Chill Metal (1/day)", () => {
    expect(familiar.slas).toHaveLength(2);
    const missile = familiar.slas!.find((s) => s.slug === "magic-missile")!;
    expect(missile.frequency).toBe("atWill");
    expect(missile.note).toBe("1/hour");
    const chillMetal = familiar.slas!.find((s) => s.slug === "chill-metal")!;
    expect(chillMetal.usesMax).toBe(1);
    expect(chillMetal.usesRemaining).toBe(1);
  });
});

describe("deriveFamiliar: all ten mephits (table-driven sanity pass)", () => {
  for (const id of MEPHIT_IDS) {
    it(`${id} derives cleanly with the shared chassis surfaces`, () => {
      const doc = makeMasterDoc(7, { familiar: { speciesId: id, name: "Test" } });
      const familiar = familiarFor(doc)!;
      expect(familiar).toBeDefined();

      const species = IMPROVED_FAMILIARS[id]!;
      expect(species.defenses?.dr).toBe("5/magic");
      expect(species.defenses?.fastHealing).toBe(2);
      expect(species.prereq.casterLevel).toBe(7);
      expect(species.prereq.alignment).toBe("N");
      expect(species.slas?.length ?? 0).toBeGreaterThan(0);
      expect(species.specialNotes?.some((n) => n.toLowerCase().includes("breath weapon"))).toBe(
        true,
      );

      expect(familiar.defenses?.dr).toBe("5/magic");
      expect(familiar.defenses?.fastHealing).toBe(2);
      expect(familiar.slas!.length).toBeGreaterThan(0);
    });
  }

  it("air and dust omit Fly ranks (perfect-maneuverability overshoot, documented departure)", () => {
    expect(IMPROVED_FAMILIARS["air-mephit"]!.ownSkillRanks?.fly).toBeUndefined();
    expect(IMPROVED_FAMILIARS["dust-mephit"]!.ownSkillRanks?.fly).toBeUndefined();
  });

  it("ooze and water carry a swim speed instead of fly", () => {
    expect(IMPROVED_FAMILIARS["ooze-mephit"]!.speeds.fly).toBeUndefined();
    expect(IMPROVED_FAMILIARS["ooze-mephit"]!.speeds.swim).toBe(30);
    expect(IMPROVED_FAMILIARS["water-mephit"]!.speeds.fly).toBeUndefined();
    expect(IMPROVED_FAMILIARS["water-mephit"]!.speeds.swim).toBe(30);
  });
});
