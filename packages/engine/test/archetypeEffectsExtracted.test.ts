import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_FEATURE_EFFECTS,
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  compute,
  resolveArchetypeFeatureEffect,
} from "../src/index.js";

/**
 * Issue #45 (fighter pilot of the prose→Change extraction pipeline): fixture
 * tests for `archetype-effects-extracted.ts`, hand-computed against the real
 * vendored data slice via `loadRefData()`, same posture as
 * `archetypeEffects.test.ts`. Each expectation is derived straight from the
 * published PF1 rules cited (as `provenance`) in the extracted table's
 * entries — these hand computations ARE this pilot's spot-verification pass
 * for the entries they cover.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  gear?: CharacterDoc["build"]["gear"];
  weapons?: CharacterDoc["build"]["weapons"];
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
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      weapons: over.weapons,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Aerial Assaulter (fighter): literal Armor Training reflavor", () => {
  const aerialAssaulter = archetypeId("Aerial Assaulter");

  it("clamp(floor((unlevel+1)/4),0,4) mDexA/acpA at L3", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 3 }], archetypes: [aerialAssaulter] }),
      ref,
    );
    const feature = sheet.classFeatures.find((f) => f.name === "Armor Training" && f.level === 3);
    expect(feature?.applied).toBe(false); // swapped out, paired 1:1
    const archEntry = sheet.activeArchetypes.find((a) => a.id === aerialAssaulter);
    const own = archEntry?.features.find((f) => f.name === "Armor Training");
    expect(own?.detail).toBe("+1 max Dex / -ACP (armor)");
    expect(own?.effectSource).toBe("extracted");
  });

  it("caps at +4 by L15", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 15 }], archetypes: [aerialAssaulter] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === aerialAssaulter);
    const own = archEntry?.features.find((f) => f.name === "Armor Training");
    expect(own?.detail).toBe("+4 max Dex / -ACP (armor)");
  });
});

describe("Cyber-Soldier (fighter): Armor Training reflavor with a reduced 2-tier cadence", () => {
  const cyberSoldier = archetypeId("Cyber-Soldier");

  it("+1 at L3, +2 at L7 (no further scaling)", () => {
    const at3 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 3 }], archetypes: [cyberSoldier] }),
      ref,
    );
    const feature3 = at3.activeArchetypes
      .find((a) => a.id === cyberSoldier)
      ?.features.find((f) => f.name === "Armor Training");
    expect(feature3?.detail).toBe("+1 max Dex / -ACP (armor)");

    const at12 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 12 }], archetypes: [cyberSoldier] }),
      ref,
    );
    const feature12 = at12.activeArchetypes
      .find((a) => a.id === cyberSoldier)
      ?.features.find((f) => f.name === "Armor Training");
    expect(feature12?.detail).toBe("+2 max Dex / -ACP (armor)");
  });
});

describe("Dragoon (fighter): Armor Training reflavor with no further scaling at all", () => {
  const dragoon = archetypeId("Dragoon");

  it("flat +1 max Dex / -1 ACP at L10", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 10 }], archetypes: [dragoon] }),
      ref,
    );
    const own = sheet.activeArchetypes
      .find((a) => a.id === dragoon)
      ?.features.find((f) => f.name === "Armor Training");
    expect(own?.detail).toBe("+1 max Dex / -1 ACP (armor)");
  });
});

describe("Aerial Assaulter (fighter): Aerial Expertise grants a scaling Fly bonus", () => {
  const aerialAssaulter = archetypeId("Aerial Assaulter");

  it("+2 at L2, +6 at L10 (min(10, 2 + 2*floor((level-2)/4)))", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 10 }], archetypes: [aerialAssaulter] }),
      ref,
    );
    const fly = sheet.skills["fly"];
    const comp = fly?.components.find((c) => c.source === "Aerial Expertise");
    expect(comp?.value).toBe(6);
  });

  it("caps at +10 by L18", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 18 }], archetypes: [aerialAssaulter] }),
      ref,
    );
    const comp = sheet.skills["fly"]?.components.find((c) => c.source === "Aerial Expertise");
    expect(comp?.value).toBe(10);
  });
});

describe("Tactician (fighter): Tactical Awareness grants a scaling initiative bonus", () => {
  const tactician = archetypeId("Tactician");

  it("caps at +5 by L18", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 18 }], archetypes: [tactician] }),
      ref,
    );
    const comp = sheet.initiative.components.find((c) => c.source === "Tactical Awareness");
    expect(comp?.value).toBe(5);
  });
});

describe("Lore Warden [PFS Field Guide] (fighter): Maneuver Mastery grants general CMB/CMD", () => {
  const loreWarden = archetypeId("Lore Warden [PFS Field Guide]");

  it("+8 CMB and CMD by L15 (capped) — cmb/cmd are plain totals, so compare against the no-archetype baseline", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 15 }], archetypes: [loreWarden] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "fighter", level: 15 }] }), ref);
    expect(withArchetype.cmb - withoutArchetype.cmb).toBe(8);
    expect(withArchetype.cmd - withoutArchetype.cmd).toBe(8);
  });
});

describe("Dragonheir Scion (fighter): Draconic Defense grants scaling natural armor", () => {
  const dragonheirScion = archetypeId("Dragonheir Scion");

  it("+3 natural armor by L13", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 13 }], archetypes: [dragonheirScion] }),
      ref,
    );
    const natural = sheet.ac.components.find(
      (c) => c.category === "natural" && c.source === "Draconic Defense",
    );
    expect(natural?.value).toBe(3);
  });
});

describe("Skirmisher (fighter): Mobility Training grants dodge AC + land speed while lightly armored", () => {
  const skirmisher = archetypeId("Skirmisher");

  it("+4 dodge AC and +10 ft. land speed by L15, no armor", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 15 }], archetypes: [skirmisher] }),
      ref,
    );
    const dexComp = sheet.ac.components.find(
      (c) => c.category === "dodge" && c.source === "Mobility Training",
    );
    expect(dexComp?.value).toBe(4);
  });

  it("nothing while wearing medium+ armor", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 15 }],
        archetypes: [skirmisher],
        gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
      }),
      ref,
    );
    expect(
      sheet.ac.components.find((c) => c.source === "Mobility Training" && c.value !== 0),
    ).toBeUndefined();
  });
});

describe("Swarm Fighter (fighter): Athletic Prowess grants a general Acrobatics/Climb bonus", () => {
  const swarmFighter = archetypeId("Swarm Fighter");

  it("+5 Acrobatics/Climb at L10", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 10 }], archetypes: [swarmFighter] }),
      ref,
    );
    expect(
      sheet.skills["acr"]?.components.find((c) => c.source === "Athletic Prowess")?.value,
    ).toBe(5);
    expect(
      sheet.skills["clm"]?.components.find((c) => c.source === "Athletic Prowess")?.value,
    ).toBe(5);
  });
});

describe("Warlord (fighter): Sun-Bronzed Skin grants conditional DR (issue #45 finding 2, promoted after the dr-at-0 fix)", () => {
  const warlord = archetypeId("Warlord");

  it("DR 5/— at L19 while unarmored", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 19 }], archetypes: [warlord] }),
      ref,
    );
    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 5,
        qualifier: "—",
        components: [
          {
            source: "Sun-Bronzed Skin",
            sourceId: expect.any(String),
            type: "untyped",
            value: 5,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("no spurious Defenses line while armored (condition unmet, evaluates to 0)", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 19 }],
        archetypes: [warlord],
        gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
      }),
      ref,
    );
    expect(sheet.defenses).toBeUndefined();
  });
});

describe("Weapon Training reflavors, reclassified after the weapon-group-targeting fix (issue #45)", () => {
  const bow: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Longbow",
    attackAbility: "dex",
    category: "ranged",
    weaponGroups: ["bows"],
  };
  const crossbow: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Light Crossbow",
    attackAbility: "dex",
    category: "ranged",
    weaponGroups: ["crossbows"],
  };
  const spear: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Spear",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["spears"],
  };
  const hammer: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Warhammer",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["hammers"],
  };
  const polearm: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Glaive",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["polearms"],
  };
  const tribalWeapon: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Klar",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["tribal"],
  };
  const monkWeapon: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Kama",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["monk"],
  };
  const lightBlade: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Rapier",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["blades-light"],
  };
  const closeWeapon: NonNullable<CharacterDoc["build"]["weapons"]>[number] = {
    name: "Punching Dagger",
    attackAbility: "str",
    category: "melee",
    weaponGroups: ["close"],
  };

  it("Archer (Expert Archer): +1 bows at L5, +2 at L9", () => {
    const archer = archetypeId("Archer");
    const at5 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], archetypes: [archer], weapons: [bow] }),
      ref,
    );
    const base5 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [bow] }),
      ref,
    );
    expect(at5.attacks[0]!.attack.total - base5.attacks[0]!.attack.total).toBe(1);
    const at9 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 9 }], archetypes: [archer], weapons: [bow] }),
      ref,
    );
    const base9 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 9 }], weapons: [bow] }),
      ref,
    );
    expect(at9.attacks[0]!.attack.total - base9.attacks[0]!.attack.total).toBe(2);
  });

  it("Crossbowman (Crossbow Expert): +1 attack/damage with crossbows at L5", () => {
    const crossbowman = archetypeId("Crossbowman");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [crossbowman],
        weapons: [crossbow],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [crossbow] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(1);
    expect(sheet.attacks[0]!.damageBonus.total - base.attacks[0]!.damageBonus.total).toBe(1);
  });

  it("Dragoon (Spear Training): +1 attack/+2 damage with spears at L5, caps at +4/+8 by L17", () => {
    const dragoon = archetypeId("Dragoon");
    const at5 = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [dragoon],
        weapons: [spear],
      }),
      ref,
    );
    const base5 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [spear] }),
      ref,
    );
    expect(at5.attacks[0]!.attack.total - base5.attacks[0]!.attack.total).toBe(1);
    expect(at5.attacks[0]!.damageBonus.total - base5.attacks[0]!.damageBonus.total).toBe(2);

    const at20 = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 20 }],
        archetypes: [dragoon],
        weapons: [spear],
      }),
      ref,
    );
    const base20 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 20 }], weapons: [spear] }),
      ref,
    );
    expect(at20.attacks[0]!.attack.total - base20.attacks[0]!.attack.total).toBe(4);
    expect(at20.attacks[0]!.damageBonus.total - base20.attacks[0]!.damageBonus.total).toBe(8);
  });

  it("Foehammer: +1 attack/damage with hammers at L5", () => {
    const foehammer = archetypeId("Foehammer");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [foehammer],
        weapons: [hammer],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [hammer] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(1);
    expect(sheet.attacks[0]!.damageBonus.total - base.attacks[0]!.damageBonus.total).toBe(1);
  });

  it("Polearm Master: +1 attack/damage applies to BOTH spears and polearms at L5", () => {
    const polearmMaster = archetypeId("Polearm Master");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [polearmMaster],
        weapons: [spear, polearm],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [spear, polearm] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(1);
    expect(sheet.attacks[1]!.attack.total - base.attacks[1]!.attack.total).toBe(1);
  });

  it("Tribal Fighter (Tribal Weapon Training): +1 attack/damage with tribal weapons at L5", () => {
    const tribalFighter = archetypeId("Tribal Fighter");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [tribalFighter],
        weapons: [tribalWeapon],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [tribalWeapon] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(1);
  });

  it("Unarmed Fighter: +4 attack/damage with monk weapons by L17 (natural-weapon half not modeled)", () => {
    const unarmedFighter = archetypeId("Unarmed Fighter");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 17 }],
        archetypes: [unarmedFighter],
        weapons: [monkWeapon],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 17 }], weapons: [monkWeapon] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(4);
  });

  it("Ustalavic Duelist (Duelist Training): +1 attack/damage with light blades at L5, capped +4 by L17", () => {
    const duelist = archetypeId("Ustalavic Duelist");
    const at17 = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 17 }],
        archetypes: [duelist],
        weapons: [lightBlade],
      }),
      ref,
    );
    const base17 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 17 }], weapons: [lightBlade] }),
      ref,
    );
    expect(at17.attacks[0]!.attack.total - base17.attacks[0]!.attack.total).toBe(4);
  });

  it("Brawler (Close Combatant): +1 attack/+3 damage with close weapons at L3, caps +5/+7 by L19", () => {
    const brawler = archetypeId("Brawler");
    const at3 = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 3 }],
        archetypes: [brawler],
        weapons: [closeWeapon],
      }),
      ref,
    );
    const base3 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 3 }], weapons: [closeWeapon] }),
      ref,
    );
    expect(at3.attacks[0]!.attack.total - base3.attacks[0]!.attack.total).toBe(1);
    expect(at3.attacks[0]!.damageBonus.total - base3.attacks[0]!.damageBonus.total).toBe(3);

    const at19 = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 19 }],
        archetypes: [brawler],
        weapons: [closeWeapon],
      }),
      ref,
    );
    const base19 = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 19 }], weapons: [closeWeapon] }),
      ref,
    );
    expect(at19.attacks[0]!.attack.total - base19.attacks[0]!.attack.total).toBe(5);
    expect(at19.attacks[0]!.damageBonus.total - base19.attacks[0]!.damageBonus.total).toBe(7);
  });

  it("Spear Fighter: guaranteed +1 attack/damage with spears at L5 (partial — other tiers not modeled)", () => {
    const spearFighter = archetypeId("Spear Fighter");
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 5 }],
        archetypes: [spearFighter],
        weapons: [spear],
      }),
      ref,
    );
    const base = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 5 }], weapons: [spear] }),
      ref,
    );
    expect(sheet.attacks[0]!.attack.total - base.attacks[0]!.attack.total).toBe(1);
  });
});

describe("resolveArchetypeFeatureEffect precedence (issue #45)", () => {
  it("hand-verified wins over extracted when the same id is present in both tables", () => {
    const id = "test:synthetic-overlap:feature:1";
    const verifiedTable = {
      [id]: { changes: [{ formula: "1", target: "ac", type: "untyped" }] },
    };
    const extractedTable = {
      [id]: {
        changes: [{ formula: "99", target: "ac", type: "untyped" }],
        confidence: "high" as const,
        provenance: "n/a — synthetic test fixture",
      },
    };
    const resolved = resolveArchetypeFeatureEffect(id, verifiedTable, extractedTable);
    expect(resolved?.source).toBe("verified");
    expect(resolved?.effect.changes[0]?.formula).toBe("1");
  });

  it("falls back to the extracted table when no verified entry exists", () => {
    const resolved = resolveArchetypeFeatureEffect("fighter:swarm-fighter:athletic-prowess:1");
    expect(resolved?.source).toBe("extracted");
  });

  it("no real feature id is present in both production tables today", () => {
    const overlap = Object.keys(ARCHETYPE_FEATURE_EFFECTS).filter(
      (id) => id in ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
    );
    expect(overlap).toEqual([]);
  });
});

describe("blocked composition trap: partial-tier Armor Training swaps (issue #45)", () => {
  // Unbreakable never pairs ANY feature to Armor Training's base-feature
  // uuid — Quick Recovery (L11) and Unlimited Endurance (L15) each claim to
  // "replace armor training 3"/"4" (a single tier of the atomic mDexA/acpA
  // formula) but are UNPAIRED, so `activeArchetypeSwaps` never suppresses
  // the base grant at all. Classified `blocked` rather than backfilled: with
  // no compensating entry in either table, the base Armor Training formula
  // just keeps applying in full — RAW-imperfect (a real character would lose
  // some tiers), but not a double-count, and not something this table can
  // safely fix without splitting Armor Training into per-tier grants.
  const unbreakable = archetypeId("Unbreakable");

  it("Quick Recovery and Unlimited Endurance have no entry in either table", () => {
    expect(resolveArchetypeFeatureEffect("fighter:unbreakable:quick-recovery:11")).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect("fighter:unbreakable:unlimited-endurance:15"),
    ).toBeUndefined();
  });

  it("base Armor Training keeps applying in full at L15 — neither table piles a number on top", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 15 }], archetypes: [unbreakable] }),
      ref,
    );
    const feature = sheet.classFeatures.find((f) => f.name === "Armor Training" && f.level === 3);
    expect(feature?.applied).toBe(true); // never suppressed — no paired swap exists at all
    expect(feature?.replacedBy).toBeUndefined();

    // Quick Recovery / Unlimited Endurance carry no `detail` — this agent did
    // not backfill a second, doubled-up mDexA/acpA number for them.
    const archEntry = sheet.activeArchetypes.find((a) => a.id === unbreakable);
    expect(archEntry?.features.find((f) => f.name === "Quick Recovery")?.detail).toBeUndefined();
    expect(
      archEntry?.features.find((f) => f.name === "Unlimited Endurance")?.detail,
    ).toBeUndefined();
  });
});
