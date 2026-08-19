import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Fixture coverage for the gunslinger archetypes added to the Gun Training
 * family (`gun-training.ts`) beyond the base feature and Musket/Pistol
 * Training (see `test/firearms.test.ts` for those). Rules text verified
 * against aonprd.com's Ultimate Combat archetype pages:
 *
 * - Bolt Ace, "Crossbow Training": "This ability replaces gun training."
 *   Same 5th/9th/13th/17th cadence, a chosen crossbow type instead of a
 *   firearm type.
 * - Mysterious Stranger, "Stranger's Fortune": "This ability replaces gun
 *   training 1." Gun training 2/3/4 (9th/13th/17th) are untouched.
 * - Commando, "Trapsmith": "in place of gaining the next level of gun
 *   training... This alters gun training." Only the 5th-level tier is
 *   traded away; 9th/13th/17th are untouched.
 * - Buccaneer: "Exotic Pet... replaces gun training 1", "Sword and
 *   Pistol... replaces gun training 2", "Raider's Riposte... replaces gun
 *   training 4", leaving only the 13th-level tier ("A buccaneer gains this
 *   ability only at 13th level with a single type of firearm").
 * - Gulch Gunner, "Belly Shot": "This ability replaces the gun training
 *   ability gained at 9th, 13th, and 17th level," leaving only the
 *   5th-level tier.
 * - Techslinger, "Technic Training": "This ability replaces gun training"
 *   (all four tiers, scoped to advanced technology firearms, a category
 *   with no vendored `WEAPON_GROUPS` tag) -- Experimental Gunsmith's
 *   Innovations and Firebrand's Bombs likewise replace the whole
 *   progression with a non-Dex-to-damage subsystem. All three are in the
 *   base entry's `suppressedBy` rather than modeled.
 *
 * `WeaponInstance` fixtures are constructed directly rather than pulled
 * from vendored weapon data, same convention as `firearms.test.ts`.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 14, dex: 18, con: 12, int: 10, wis: 10, cha: 10 } as const;

function musket(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Musket",
    category: "ranged",
    attackAbility: "dex",
    group: "musket",
    weaponGroups: ["firearmsTwoHanded"],
    rangeIncrement: 20,
    misfire: 4,
    capacity: 1,
    firearmEra: "early",
    ...overrides,
  };
}

function heavyCrossbow(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Heavy Crossbow",
    category: "ranged",
    attackAbility: "dex",
    group: "heavy crossbow",
    weaponGroups: ["crossbows"],
    rangeIncrement: 120,
    ...overrides,
  };
}

function ballista(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Ballista",
    category: "ranged",
    attackAbility: "dex",
    group: "ballista",
    ...overrides,
  };
}

function makeDoc(opts: {
  level: number;
  weapons: WeaponInstance[];
  gunTrainingPicks?: Partial<Record<string, string[]>>;
  archetypes?: string[];
  classTag?: string;
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
      classes: [{ tag: opts.classTag ?? "gunslinger", level: opts.level }],
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: opts.weapons,
      gunTrainingPicks: opts.gunTrainingPicks,
      archetypes: opts.archetypes,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Bolt Ace (Crossbow Training): same cadence as base Gun Training, scoped to crossbows", () => {
  it("applies Dex mod to a picked crossbow type at 5th level (UC: 'replaces gun training')", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [heavyCrossbow()],
      archetypes: ["gunslinger:bolt-ace"],
      gunTrainingPicks: { gunslinger: ["heavy crossbow"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("does not apply to a weapon that wasn't picked (picks matching stays free-text, per-weapon)", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:bolt-ace"],
      // "heavy crossbow" is the stored pick; a musket doesn't match it
      // regardless of archetype -- pickGroupTag is a picker-UI hint only,
      // it never narrows `picksMatch`'s free-text matching (see
      // gun-training.ts's doc comment).
      gunTrainingPicks: { gunslinger: ["heavy crossbow"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });
});

describe("Mysterious Stranger: Stranger's Fortune replaces only gun training 1", () => {
  it("does not apply at 5th level (tier 1 traded away, no 5th-level pick slot)", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:mysterious-stranger"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("applies Dex mod at 9th level (gun training 2, untouched by Stranger's Fortune)", () => {
    const doc = makeDoc({
      level: 9,
      weapons: [musket()],
      archetypes: ["gunslinger:mysterious-stranger"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });
});

describe("Commando: Trapsmith alters only the 5th-level gun training tier", () => {
  it("does not apply at 5th level (tier traded away for Trapsmith)", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:commando"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("applies Dex mod at 9th level (the surviving tier)", () => {
    const doc = makeDoc({
      level: 9,
      weapons: [musket()],
      archetypes: ["gunslinger:commando"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });
});

describe("Buccaneer: only the 13th-level gun training tier survives", () => {
  it("does not apply at 9th level (tiers 1/2 traded for Exotic Pet/Sword and Pistol)", () => {
    const doc = makeDoc({
      level: 9,
      weapons: [musket()],
      archetypes: ["gunslinger:buccaneer"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("applies Dex mod at 13th level ('a buccaneer gains this ability only at 13th level')", () => {
    const doc = makeDoc({
      level: 13,
      weapons: [musket()],
      archetypes: ["gunslinger:buccaneer"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("does not apply at 17th level either (tier 4 traded for Raider's Riposte, no further picks)", () => {
    const doc = makeDoc({
      level: 17,
      weapons: [musket(), pistolWeapon()],
      archetypes: ["gunslinger:buccaneer"],
      gunTrainingPicks: { gunslinger: ["musket", "pistol"] },
    });
    const sheet = compute(doc, ref);
    // Only the 13th-level pick (musket) ever unlocks; a stored 2nd pick
    // (pistol) has no tier left to attach to.
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
    expect(sheet.attacks[1]!.damageBonus.total).toBe(0);
  });
});

function pistolWeapon(overrides: Partial<WeaponInstance> = {}): WeaponInstance {
  return {
    name: "Pistol",
    category: "ranged",
    attackAbility: "dex",
    group: "pistol",
    weaponGroups: ["firearmsOneHanded"],
    rangeIncrement: 10,
    misfire: 4,
    firearmEra: "early",
    ...overrides,
  };
}

describe("Gulch Gunner: only the 5th-level gun training tier survives", () => {
  it("applies Dex mod at 5th level (the surviving tier)", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:gulch-gunner"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });

  it("does not apply at 9th level even with a 2nd pick stored (tiers 2/3/4 replaced by Belly Shot)", () => {
    const doc = makeDoc({
      level: 9,
      weapons: [musket(), pistolWeapon()],
      archetypes: ["gunslinger:gulch-gunner"],
      gunTrainingPicks: { gunslinger: ["musket", "pistol"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
    // pistol = pick index 1, but only unlockLevels: [5] exists for this
    // archetype, so no 2nd tier is ever unlocked.
    expect(sheet.attacks[1]!.damageBonus.total).toBe(0);
  });
});

describe("Wyrm Sniper's Heavy Gunner: no replacement, base picks already cover a siege weapon type", () => {
  it("applies Dex mod to a picked light siege weapon at 5th level (no archetype-specific entry needed)", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [ballista()],
      archetypes: ["gunslinger:wyrm-sniper"],
      gunTrainingPicks: { gunslinger: ["ballista"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(4);
  });
});

describe("suppressedBy: archetypes that replace gun training wholesale with an unexpressible variant", () => {
  it("Techslinger suppresses the base picks grant even with a matching pick stored", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:techslinger"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("Experimental Gunsmith suppresses the base picks grant even with a matching pick stored", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:experimental-gunsmith"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });

  it("Firebrand suppresses the base picks grant even with a matching pick stored", () => {
    const doc = makeDoc({
      level: 5,
      weapons: [musket()],
      archetypes: ["gunslinger:firebrand"],
      gunTrainingPicks: { gunslinger: ["musket"] },
    });
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]!.damageBonus.total).toBe(0);
  });
});
