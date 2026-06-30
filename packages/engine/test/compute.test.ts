import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, raceGrantsFlexibleAbility } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  race?: string;
  skillRanks?: Record<string, number>;
  gear?: ItemInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Human"),
      classes: over.classes,
    },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
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

describe("compute: barbarian L1 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "barbarian", level: 1 }],
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    skillRanks: { acr: 1, per: 1, int: 1, swm: 1 },
  });
  const sheet = compute(doc, ref);

  it("ability modifiers", () => {
    expect(sheet.abilities.str.mod).toBe(3);
    expect(sheet.abilities.con.mod).toBe(2);
    expect(sheet.abilities.cha.mod).toBe(-1);
  });

  it("BAB +1 (high progression)", () => {
    expect(sheet.bab).toBe(1);
  });

  it("saves: Fort +4 (good), Ref +2, Will +1", () => {
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(2);
    expect(sheet.saves.will.total).toBe(1);
  });

  it("AC 12 / touch 12 / flat-footed 10", () => {
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.touch).toBe(12);
    expect(sheet.ac.flatFooted).toBe(10);
  });

  it("CMB +4, CMD 16", () => {
    expect(sheet.cmb).toBe(4);
    expect(sheet.cmd).toBe(16);
  });

  it("HP 14 (max d12 + Con)", () => {
    expect(sheet.hp.max).toBe(14);
  });

  it("attack lines (melee +4, ranged +3) and initiative +2", () => {
    expect(sheet.attack.melee.total).toBe(4);
    expect(sheet.attack.ranged.total).toBe(3);
    expect(sheet.initiative.total).toBe(2);
  });

  it("class skills get the +3 class-skill bonus when ranked", () => {
    expect(sheet.skills.acr!.total).toBe(6); // 1 + dex2 + 3
    expect(sheet.skills.per!.total).toBe(5); // 1 + wis1 + 3
    expect(sheet.skills.swm!.total).toBe(7); // 1 + str3 + 3
    expect(sheet.skills.int!.total).toBe(3); // 1 + cha-1 + 3 (Intimidate)
    expect(sheet.skills.acr!.classSkill).toBe(true);
  });
});

describe("compute: wizard L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "wizard", level: 5 }],
    abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
    skillRanks: { spl: 5, kar: 5 },
  });
  const sheet = compute(doc, ref);

  it("BAB +2 (low progression)", () => {
    expect(sheet.bab).toBe(2);
  });

  it("saves: Fort +2, Ref +3, Will +4 (good)", () => {
    expect(sheet.saves.fort.total).toBe(2);
    expect(sheet.saves.ref.total).toBe(3);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("AC 12 / touch 12 / flat-footed 10", () => {
    expect(sheet.ac.normal).toBe(12);
    expect(sheet.ac.touch).toBe(12);
    expect(sheet.ac.flatFooted).toBe(10);
  });

  it("CMB +1, CMD 13", () => {
    expect(sheet.cmb).toBe(1);
    expect(sheet.cmd).toBe(13);
  });

  it("HP 27 (6 + 4*4 + Con*5)", () => {
    expect(sheet.hp.max).toBe(27);
  });

  it("knowledge/spellcraft skills", () => {
    expect(sheet.skills.spl!.total).toBe(12); // 5 + int4 + 3
    expect(sheet.skills.kar!.total).toBe(12);
  });
});

describe("compute: fighter L5 (full plate + magic items, stacking + armor training)", () => {
  const gear: ItemInstance[] = [
    {
      equipped: true,
      name: "Full Plate",
      armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
    },
    { equipped: true, itemId: itemByName("Belt of Physical Might +4 (Str & Dex)") },
    { equipped: true, itemId: itemByName("Ring of Protection +2") },
    { equipped: true, itemId: itemByName("Amulet of Natural Armor +2") },
    { equipped: true, itemId: itemByName("Cloak of Resistance +3") },
  ];
  const doc = makeDoc({
    classes: [{ tag: "fighter", level: 5 }],
    abilities: { str: 18, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    skillRanks: { clm: 5 },
    gear,
  });
  const sheet = compute(doc, ref);

  it("belt enhancement raises Str and Dex (enh, not stacking with base)", () => {
    expect(sheet.abilities.str.total).toBe(22); // 18 + 4 enh
    expect(sheet.abilities.str.mod).toBe(6);
    expect(sheet.abilities.dex.total).toBe(18); // 14 + 4 enh
    expect(sheet.abilities.dex.mod).toBe(4);
  });

  it("BAB +5 (high progression)", () => {
    expect(sheet.bab).toBe(5);
  });

  it("AC: armor + capped Dex (armor training +1 maxDex) + deflection + natural", () => {
    // 10 + 9 armor + 2 capped-dex (maxDex 1 + mDexA 1 = 2) + 2 deflection + 2 natural
    expect(sheet.ac.normal).toBe(25);
    expect(sheet.ac.touch).toBe(14); // 10 + dex2 + deflection2
    expect(sheet.ac.flatFooted).toBe(23); // 10 + armor9 + nat2 + defl2
  });

  it("saves include the Cloak of Resistance +3 (resist, stacks)", () => {
    expect(sheet.saves.fort.total).toBe(9); // 4 base + con2 + 3
    expect(sheet.saves.ref.total).toBe(8); // 1 base + dex4 + 3
    expect(sheet.saves.will.total).toBe(5); // 1 base + wis1 + 3
  });

  it("CMB +11, CMD 27 (deflection applies, Dex uncapped)", () => {
    expect(sheet.cmb).toBe(11); // 5 + str6
    expect(sheet.cmd).toBe(27); // 10 + 5 + str6 + dex4 + deflection2
  });

  it("HP 44 (10 + 4*6 + Con*5)", () => {
    expect(sheet.hp.max).toBe(44);
  });

  it("Climb reflects armor-training-reduced ACP", () => {
    // 5 ranks + str6 + 3 class + effective ACP (-6 + 1 armor training = -5)
    expect(sheet.skills.clm!.total).toBe(9);
  });

  it("deflection AC bonus carries provenance", () => {
    const defl = sheet.ac.components.find((c) => c.category === "deflection");
    expect(defl?.source).toBe("Ring of Protection +2");
    expect(defl?.applied).toBe(true);
  });
});

describe("compute: maxHpOverride", () => {
  const base = makeDoc({
    classes: [{ tag: "barbarian", level: 1 }],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  // Barbarian L1, con 10 → auto = 12 (max d12) + 0 con = 12

  it("without override: max === auto (rules average)", () => {
    const sheet = compute(base, ref);
    expect(sheet.hp.auto).toBe(12);
    expect(sheet.hp.max).toBe(12);
  });

  it("with override set: max equals override, auto is still the rules average", () => {
    const doc = { ...base, build: { ...base.build, maxHpOverride: 8 } };
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(12);
    expect(sheet.hp.max).toBe(8);
  });

  it("with override > auto: max equals override", () => {
    const doc = { ...base, build: { ...base.build, maxHpOverride: 50 } };
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(12);
    expect(sheet.hp.max).toBe(50);
  });
});

describe("trained-only skill flags", () => {
  const doc = makeDoc({
    classes: [{ tag: "wizard", level: 3 }],
    abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
    // kar (Knowledge arcana) gets 2 ranks; acr (Acrobatics) stays at 0
    skillRanks: { kar: 2 },
  });
  const sheet = compute(doc, ref);

  it("trained-only skill at 0 ranks: usable=false, trainedOnly=true (e.g. dev)", () => {
    const skill = sheet.skills.dev!;
    expect(skill.trainedOnly).toBe(true);
    expect(skill.usable).toBe(false);
  });

  it("untrained-usable skill at 0 ranks: usable=true, trainedOnly=false (e.g. acr)", () => {
    const skill = sheet.skills.acr!;
    expect(skill.trainedOnly).toBe(false);
    expect(skill.usable).toBe(true);
  });

  it("trained-only skill with ranks: usable=true (kar with 2 ranks)", () => {
    const skill = sheet.skills.kar!;
    expect(skill.trainedOnly).toBe(true);
    expect(skill.usable).toBe(true);
    expect(skill.ranks).toBe(2);
  });
});

describe("flexible racial +2 (Human / Half-Elf / Half-Orc)", () => {
  it("raceGrantsFlexibleAbility returns true for Human", () => {
    const human = ref.races[raceId("Human")]!;
    expect(raceGrantsFlexibleAbility(human)).toBe(true);
  });

  it("raceGrantsFlexibleAbility returns false for Elf (fixed +2 Dex, +2 Int, -2 Con)", () => {
    const elf = ref.races[raceId("Elf")]!;
    expect(raceGrantsFlexibleAbility(elf)).toBe(false);
  });

  it("flexible race with flexibleAbility='str' applies +2 racial bonus to STR", () => {
    const base = 14;
    const doc: CharacterDoc = {
      ...makeDoc({
        classes: [{ tag: "barbarian", level: 1 }],
        abilities: { str: base, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        race: "Human",
      }),
      identity: {
        ...makeDoc({
          classes: [{ tag: "barbarian", level: 1 }],
          abilities: { str: base, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          race: "Human",
        }).identity,
        flexibleAbility: "str",
      },
    };
    const sheet = compute(doc, ref);
    expect(sheet.abilities.str.total).toBe(base + 2);
    const racial = sheet.abilities.str.components.find((c) => c.type === "racial");
    expect(racial).toBeDefined();
    expect(racial?.value).toBe(2);
    expect(racial?.applied).toBe(true);
  });

  it("flexible race without flexibleAbility set applies no racial ability bonus", () => {
    const base = 14;
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 1 }],
      abilities: { str: base, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      race: "Human",
    });
    const sheet = compute(doc, ref);
    expect(sheet.abilities.str.total).toBe(base);
    const racial = sheet.abilities.str.components.find((c) => c.type === "racial");
    expect(racial).toBeUndefined();
  });
});

describe("compute: level-up ability score increases", () => {
  const base = { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 8 };

  function docWith(level: number, abilityIncreases: AbilityId[]) {
    const d = makeDoc({ classes: [{ tag: "barbarian", level }], abilities: base });
    return { ...d, build: { ...d.build, abilityIncreases } };
  }

  it("level 8 with two STR increases applies +2 to STR", () => {
    const sheet = compute(docWith(8, ["str", "str"]), ref);
    expect(sheet.abilities.str.total).toBe(base.str + 2);
    expect(sheet.abilities.dex.total).toBe(base.dex);
  });

  it("level 8 with STR and DEX increases applies +1 to each", () => {
    const sheet = compute(docWith(8, ["str", "dex"]), ref);
    expect(sheet.abilities.str.total).toBe(base.str + 1);
    expect(sheet.abilities.dex.total).toBe(base.dex + 1);
  });

  it("level 4 with two STR entries only applies one (cap = floor(4/4) = 1)", () => {
    const sheet = compute(docWith(4, ["str", "str"]), ref);
    expect(sheet.abilities.str.total).toBe(base.str + 1);
  });

  it("level 3 (below first threshold) applies no increases even when entries exist", () => {
    const sheet = compute(docWith(3, ["str"]), ref);
    expect(sheet.abilities.str.total).toBe(base.str);
  });
});

function itemByName(name: string): string {
  const entry = Object.entries(ref.items).find(([, it]) => it.name === name);
  if (!entry) throw new Error(`item not found: ${name}`);
  return entry[0];
}
