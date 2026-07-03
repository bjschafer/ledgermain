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

describe("compute: rogue L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "rogue", level: 5 }],
    abilities: { str: 12, dex: 16, con: 14, int: 14, wis: 10, cha: 8 },
    // ste (Stealth, class skill) maxed at 5 ranks; hea (Heal) is NOT a rogue
    // class skill, ranked to confirm no class-skill bonus applies to it.
    skillRanks: { ste: 5, hea: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +3 (poor base 1 + con2), Ref +7 (good base 4 + dex3), Will +1 (poor base 1 + wis0)", () => {
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(7);
    expect(sheet.saves.will.total).toBe(1);
  });

  it("HP 38 (8 max d8 + 4*5 avg d8 + Con2*5)", () => {
    expect(sheet.hp.max).toBe(38);
  });

  it("class skill (Stealth) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.ste!.total).toBe(11); // 5 ranks + dex3 + 3
    expect(sheet.skills.ste!.classSkill).toBe(true);
  });

  it("non-class skill (Heal) gets no class-skill bonus", () => {
    expect(sheet.skills.hea!.total).toBe(1); // 1 rank + wis0
    expect(sheet.skills.hea!.classSkill).toBe(false);
  });

  it("8 + Int skill points/level in ref data (rogue class def)", () => {
    const rogueEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "rogue");
    expect(rogueEntry).toBeDefined();
    expect(rogueEntry![1].skillsPerLevel).toBe(8);
    expect(rogueEntry![1].hd).toBe(8);
    expect(rogueEntry![1].bab).toBe("med");
    expect(rogueEntry![1].saves).toEqual({ fort: "low", ref: "high", will: "low" });
  });

  it("Sneak Attack class feature carries hand-authored dice detail (3d6 at L5)", () => {
    const sneakAttack = sheet.classFeatures.find((f) => f.name === "Sneak Attack");
    expect(sneakAttack).toBeDefined();
    expect(sneakAttack!.classTag).toBe("rogue");
    expect(sneakAttack!.detail).toBe("3d6");
  });
});

describe("compute: paladin L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "paladin", level: 5 }],
    abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    // dip (Diplomacy, class skill) maxed at 5 ranks; ste (Stealth) is NOT a
    // paladin class skill, ranked to confirm no class-skill bonus applies.
    skillRanks: { dip: 5, ste: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +5 (high progression: 1/level)", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +9, Ref +4, Will +8 (good/poor base + ability + Divine Grace's Cha3 on all saves)", () => {
    // Divine Grace (L2 class feature) applies @abilities.cha.mod as an untyped
    // bonus to allSavingThrows via its vendored `changes[]` — exercised here
    // for free by the generic class-feature/formula pipeline (no step-2
    // hand-authoring needed for this one).
    expect(sheet.saves.fort.total).toBe(9); // good base 4 + con2 + cha3
    expect(sheet.saves.ref.total).toBe(4); // poor base 1 + dex0 + cha3
    expect(sheet.saves.will.total).toBe(8); // good base 4 + wis1 + cha3
  });

  it("HP 44 (10 max d10 + 4*6 avg d10 + Con2*5)", () => {
    expect(sheet.hp.max).toBe(44);
  });

  it("class skill (Diplomacy) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.dip!.total).toBe(11); // 5 ranks + cha3 + 3
    expect(sheet.skills.dip!.classSkill).toBe(true);
  });

  it("non-class skill (Stealth) gets no class-skill bonus", () => {
    expect(sheet.skills.ste!.total).toBe(1); // 1 rank + dex0
    expect(sheet.skills.ste!.classSkill).toBe(false);
  });

  it("2 + Int skill points/level in ref data (paladin class def)", () => {
    const paladinEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "paladin");
    expect(paladinEntry).toBeDefined();
    expect(paladinEntry![1].skillsPerLevel).toBe(2);
    expect(paladinEntry![1].hd).toBe(10);
    expect(paladinEntry![1].bab).toBe("high");
    expect(paladinEntry![1].saves).toEqual({ fort: "high", ref: "low", will: "high" });
  });
});

describe("compute: ranger L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "ranger", level: 5 }],
    abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 12, cha: 8 },
    // sur (Survival, class skill) maxed at 5 ranks; dip (Diplomacy) is NOT a
    // ranger class skill, ranked to confirm no class-skill bonus applies.
    skillRanks: { sur: 5, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +5 (high progression: 1/level)", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +5 (good base 4 + con1), Ref +6 (good base 4 + dex2), Will +2 (poor base 1 + wis1)", () => {
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.ref.total).toBe(6);
    expect(sheet.saves.will.total).toBe(2);
  });

  it("HP 39 (10 max d10 + 4*7 avg d10 + Con1*5)", () => {
    expect(sheet.hp.max).toBe(39);
  });

  it("class skill (Survival) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.sur!.total).toBe(9); // 5 ranks + wis1 + 3
    expect(sheet.skills.sur!.classSkill).toBe(true);
  });

  it("non-class skill (Diplomacy) gets no class-skill bonus", () => {
    expect(sheet.skills.dip!.total).toBe(0); // 1 rank + cha-1
    expect(sheet.skills.dip!.classSkill).toBe(false);
  });

  it("6 + Int skill points/level in ref data (ranger class def)", () => {
    const rangerEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "ranger");
    expect(rangerEntry).toBeDefined();
    expect(rangerEntry![1].skillsPerLevel).toBe(6);
    expect(rangerEntry![1].hd).toBe(10);
    expect(rangerEntry![1].bab).toBe("high");
    expect(rangerEntry![1].saves).toEqual({ fort: "high", ref: "high", will: "low" });
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

describe("compute: armor & shield enhancement bonuses to AC", () => {
  it("armor enhancement adds to AC as a separate enh-typed component", () => {
    const gear: ItemInstance[] = [
      {
        equipped: true,
        name: "Full Plate +3",
        armor: { slot: "armor", ac: 9, enhancement: 3, maxDex: 1, type: 3 },
      },
    ];
    const d = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      gear,
    });
    const sheet = compute(d, ref);
    // 10 + 9 armor + 3 enh + 1 capped-dex = 23
    expect(sheet.ac.normal).toBe(23);
    // Both components appear in provenance
    const armorBase = sheet.ac.components.find(
      (c) => c.category === "armor" && c.type === "untyped",
    );
    const armorEnh = sheet.ac.components.find(
      (c) => c.category === "armor" && c.type === "enh",
    );
    expect(armorBase?.value).toBe(9);
    expect(armorBase?.applied).toBe(true);
    expect(armorEnh?.value).toBe(3);
    expect(armorEnh?.applied).toBe(true);
  });

  it("armor enhancement + shield enhancement both apply (different categories)", () => {
    const gear: ItemInstance[] = [
      {
        equipped: true,
        name: "Full Plate +2",
        armor: { slot: "armor", ac: 9, enhancement: 2, maxDex: 1, type: 3 },
      },
      {
        equipped: true,
        name: "Heavy Steel Shield +2",
        armor: { slot: "shield", ac: 2, enhancement: 2 },
      },
    ];
    const d = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      gear,
    });
    const sheet = compute(d, ref);
    // 10 + 9 armor + 2 armor-enh + 2 shield + 2 shield-enh + 1 capped-dex = 26
    expect(sheet.ac.normal).toBe(26);
    // Shield enhancement appears as a separate enh component in the shield category
    const shieldEnh = sheet.ac.components.find(
      (c) => c.category === "shield" && c.type === "enh",
    );
    expect(shieldEnh?.value).toBe(2);
    expect(shieldEnh?.applied).toBe(true);
  });

  it("two armor enhancement sources to the same slot don't stack (highest enh wins)", () => {
    // Edge case: two equipped body armors (unusual but the engine handles it).
    // Note: base armor AC is type "untyped" which sums by PF1 rules; enhancement
    // is type "enh" which takes the highest within a (category|type) group.
    const gear: ItemInstance[] = [
      {
        equipped: true,
        name: "Full Plate +3",
        armor: { slot: "armor", ac: 9, enhancement: 3, maxDex: 1, type: 3 },
      },
      {
        equipped: true,
        name: "Breastplate +1",
        armor: { slot: "armor", ac: 4, enhancement: 1, maxDex: 3, type: 2 },
      },
    ];
    const d = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      gear,
    });
    const sheet = compute(d, ref);
    // Only one enh component should be applied (the +3, not the +1).
    const enhApplied = sheet.ac.components.filter(
      (c) => c.category === "armor" && c.type === "enh" && c.applied,
    );
    expect(enhApplied).toHaveLength(1);
    expect(enhApplied[0]!.value).toBe(3);
    // The +1 enh should be present but struck through (not applied).
    const enhNotApplied = sheet.ac.components.filter(
      (c) => c.category === "armor" && c.type === "enh" && !c.applied,
    );
    expect(enhNotApplied).toHaveLength(1);
    expect(enhNotApplied[0]!.value).toBe(1);
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
