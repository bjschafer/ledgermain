import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, raceGrantsFlexibleAbility } from "../src/index.js";

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

  it("Smite Evil class feature carries hand-authored attack/damage/AC detail (Cha +3, L5)", () => {
    const smiteEvil = sheet.classFeatures.find((f) => f.name === "Smite Evil");
    expect(smiteEvil).toBeDefined();
    expect(smiteEvil!.classTag).toBe("paladin");
    expect(smiteEvil!.detail).toBe("+3 atk, +5 dmg, +3 AC vs. evil");
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

describe("compute: bard L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "bard", level: 5 }],
    abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    // prf (Perform, class skill) maxed at 5 ranks; kar (Knowledge [arcana],
    // also a bard class skill) ranked to exercise Bardic Knowledge's group
    // bonus; hea (Heal) is NOT a bard class skill, ranked to confirm no
    // class-skill bonus applies to it.
    skillRanks: { prf: 5, kar: 2, hea: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +3 (poor base 1 + con2), Ref +6 (good base 4 + dex2), Will +4 (good base 4 + wis0)", () => {
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.ref.total).toBe(6);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 38 (8 max d8 + 4*5 avg d8 + Con2*5)", () => {
    expect(sheet.hp.max).toBe(38);
  });

  it("class skill (Perform) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.prf!.total).toBe(11); // 5 ranks + cha3 + 3
    expect(sheet.skills.prf!.classSkill).toBe(true);
  });

  it("non-class skill (Heal) gets no class-skill bonus", () => {
    expect(sheet.skills.hea!.total).toBe(1); // 1 rank + wis0
    expect(sheet.skills.hea!.classSkill).toBe(false);
  });

  it("6 + Int skill points/level in ref data (bard class def)", () => {
    const bardEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "bard");
    expect(bardEntry).toBeDefined();
    expect(bardEntry![1].skillsPerLevel).toBe(6);
    expect(bardEntry![1].hd).toBe(8);
    expect(bardEntry![1].bab).toBe("med");
    expect(bardEntry![1].saves).toEqual({ fort: "low", ref: "high", will: "high" });
  });

  it("Bardic Knowledge's untyped bonus reaches a real Knowledge skill via the skill.knowledge group target", () => {
    // Bardic Knowledge's vendored changes[]: max(1, floor(@class.unlevel / 2))
    // untyped bonus to target "skill.knowledge" — a Foundry compound-skill
    // group alias (means "every Knowledge skill"), not one specific skill id
    // like Rogue's Trapfinding ("skill.dev"). Discovered while building this
    // fixture that the engine didn't fan group targets out to real skill ids
    // (it created a bogus synthetic "knowledge" bucket instead) — fixed via
    // SKILL_GROUPS in tables.ts + compute.ts's skill pre-grouping pass.
    // floor(5/2) = 2.
    expect(sheet.skills.kar!.total).toBe(7); // 2 ranks + int0 + classSkill3 + BK2
    expect(sheet.skills.kar!.classSkill).toBe(true);
  });

  it("Bardic Performance resource pool: 4 + Cha mod + 2*(level-1) rounds/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const performance = pools.find((p) => p.name === "Bardic Performance");
    expect(performance).toBeDefined();
    expect(performance?.max).toBe(15); // 4 + cha3 + (5*2 - 2)
    expect(performance?.per).toBe("day");
  });

  it("Lore Master resource pool: floor((level+1)/6) uses/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loreMaster = pools.find((p) => p.name === "Lore Master");
    expect(loreMaster).toBeDefined();
    expect(loreMaster?.max).toBe(1); // floor(6/6)
    expect(loreMaster?.per).toBe("day");
  });

  it("Inspire Courage (vendored linked buff 3p34GJemfcLdKckV) scales attack + weapon damage via @item.level", () => {
    const inspireCourage = ref.buffs["3p34GJemfcLdKckV"]!;
    expect(inspireCourage.name).toBe("Inspire Courage");

    const withWeapon = {
      ...doc,
      build: { ...doc.build, weapons: [{ name: "Rapier", attackAbility: "str" as const }] },
    };
    const baseSheet = compute(withWeapon, ref);

    const buffed = {
      ...withWeapon,
      live: {
        ...withWeapon.live,
        activeBuffs: [
          {
            instanceId: "inspire-courage",
            buffId: inspireCourage.id,
            name: inspireCourage.name,
            changes: inspireCourage.changes,
            casterLevel: 5, // 1 + max(0, floor((5+1)/6)) = 2 (the L5-L10 tier)
          },
        ],
      },
    };
    const buffedSheet = compute(buffed, ref);

    expect(buffedSheet.attack.melee.total - baseSheet.attack.melee.total).toBe(2);
    expect(buffedSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(2);
    expect(
      buffedSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total,
    ).toBe(2);
  });

  it("Inspire Courage's tier breakpoints match the SRD (+1 at L1, +2 at L5, +3 at L11, +4 at L17)", () => {
    const inspireCourage = ref.buffs["3p34GJemfcLdKckV"]!;
    const buffedAt = (casterLevel: number) => {
      const withBuff = {
        ...doc,
        live: {
          ...doc.live,
          activeBuffs: [
            {
              instanceId: "inspire-courage",
              buffId: inspireCourage.id,
              name: inspireCourage.name,
              changes: inspireCourage.changes,
              casterLevel,
            },
          ],
        },
      };
      return compute(withBuff, ref);
    };
    expect(buffedAt(1).attack.melee.total - sheet.attack.melee.total).toBe(1);
    expect(buffedAt(5).attack.melee.total - sheet.attack.melee.total).toBe(2);
    expect(buffedAt(11).attack.melee.total - sheet.attack.melee.total).toBe(3);
    expect(buffedAt(17).attack.melee.total - sheet.attack.melee.total).toBe(4);
  });
});

describe("compute: druid L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "druid", level: 5 }],
    abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 18, cha: 8 },
    // sur (Survival, class skill) and kna (Knowledge [nature], class skill)
    // both exercise Nature Sense's flat +2; dip (Diplomacy) is NOT a druid
    // class skill, ranked to confirm no class-skill bonus applies to it.
    skillRanks: { sur: 5, kna: 2, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +6 (good base 4 + con2), Ref +2 (poor base 1 + dex1), Will +8 (good base 4 + wis4)", () => {
    expect(sheet.saves.fort.total).toBe(6);
    expect(sheet.saves.ref.total).toBe(2);
    expect(sheet.saves.will.total).toBe(8);
  });

  it("HP 38 (8 max d8 + 4*5 avg d8 + Con2*5)", () => {
    expect(sheet.hp.max).toBe(38);
  });

  it("4 + Int skill points/level in ref data (druid class def)", () => {
    const druidEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "druid");
    expect(druidEntry).toBeDefined();
    expect(druidEntry![1].skillsPerLevel).toBe(4);
    expect(druidEntry![1].hd).toBe(8);
    expect(druidEntry![1].bab).toBe("med");
    expect(druidEntry![1].saves).toEqual({ fort: "high", ref: "low", will: "high" });
  });

  it("Nature Sense's vendored +2 untyped bonus reaches Survival and Knowledge (nature)", () => {
    expect(sheet.skills.sur!.total).toBe(14); // 5 ranks + wis4 + classSkill3 + NatureSense2
    expect(sheet.skills.sur!.classSkill).toBe(true);
    expect(sheet.skills.kna!.total).toBe(7); // 2 ranks + int0 + classSkill3 + NatureSense2
    expect(sheet.skills.kna!.classSkill).toBe(true);
  });

  it("non-class skill (Diplomacy) gets no class-skill bonus or Nature Sense", () => {
    expect(sheet.skills.dip!.total).toBe(0); // 1 rank + cha-1
    expect(sheet.skills.dip!.classSkill).toBe(false);
  });
});

describe("compute: monk L5 (human, no armor)", () => {
  const doc = makeDoc({
    classes: [{ tag: "monk", level: 5 }],
    abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 8 },
    // acr (Acrobatics, class skill) maxed at 5 ranks; dip (Diplomacy) is NOT a
    // monk class skill, ranked to confirm no class-skill bonus applies.
    skillRanks: { acr: 5, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Fort +6, Ref +7, Will +7 (all good/high base 4 + ability)", () => {
    expect(sheet.saves.fort.total).toBe(6); // good base 4 + con2
    expect(sheet.saves.ref.total).toBe(7); // good base 4 + dex3
    expect(sheet.saves.will.total).toBe(7); // good base 4 + wis3
  });

  it("HP 38 (8 max d8 + 4*5 avg d8 + Con2*5)", () => {
    expect(sheet.hp.max).toBe(38);
  });

  it("class skill (Acrobatics) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.acr!.total).toBe(11); // 5 ranks + dex3 + 3
    expect(sheet.skills.acr!.classSkill).toBe(true);
  });

  it("non-class skill (Diplomacy) gets no class-skill bonus", () => {
    expect(sheet.skills.dip!.total).toBe(0); // 1 rank + cha-1
    expect(sheet.skills.dip!.classSkill).toBe(false);
  });

  it("4 + Int skill points/level in ref data (monk class def), non-caster (no spellcasting block)", () => {
    const monkEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "monk");
    expect(monkEntry).toBeDefined();
    expect(monkEntry![1].skillsPerLevel).toBe(4);
    expect(monkEntry![1].hd).toBe(8);
    expect(monkEntry![1].bab).toBe("med");
    expect(monkEntry![1].saves).toEqual({ fort: "high", ref: "high", will: "high" });
  });

  it("Maneuver Training's CMB correction: @attributes.bab.total is wired into rollData, so it nets to level-minus-BAB", () => {
    // Maneuver Training's vendored changes[]: "@class.unlevel - @attributes.bab.total"
    // untyped bonus to cmb — swaps medium-BAB CMB for a full-monk-level CMB,
    // i.e. a "+ (unlevel - actualBAB)" correction. BAB is now computed before
    // roll data is built and threaded through as `attributes.bab.total`, so
    // this nets to `unlevel - bab` (5 - 3 = 2), not the pre-fix `unlevel - 0`.
    // cmb = bab(3) + str2 + sizeSpecial(0) + maneuverTraining(5 - 3) = 7
    expect(sheet.cmb).toBe(7);
  });

  it("Fast Movement: +10 land speed at L3-5 (10 * floor(unlevel / 3))", () => {
    // floor(5/3) = 1 → +10ft, applied as an "enh" additive to landSpeed via
    // the generic applySpeedTarget/landSpeed pipeline — no hand-authoring
    // needed.
    expect(sheet.speeds.land).toBe(40); // 30 base (medium, human) + 10
  });

  it("Ki Pool resource pool (granted at monk L4+): floor(unlevel/2) + Wis mod", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const kiPool = pools.find((p) => p.name === "Ki Pool");
    expect(kiPool).toBeDefined();
    expect(kiPool?.max).toBe(5); // floor(5/2) + wis3 = 2 + 3
    expect(kiPool?.per).toBe("day");
  });

  it("Ki Pool is absent before monk L4 (feature grants at rL 4)", () => {
    const preKiDoc = { ...doc, identity: { ...doc.identity, classes: [{ tag: "monk", level: 3 }] } };
    const preKiSheet = compute(preKiDoc, ref);
    const pools = deriveResourcePools(preKiDoc, ref, preKiSheet.abilities);
    expect(pools.find((p) => p.name === "Ki Pool")).toBeUndefined();
  });

  it("Stunning Fist resource pool: unlevel + floor((hd.total - unlevel) / 4) uses/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const stunningFist = pools.find((p) => p.name === "Stunning Fist");
    expect(stunningFist).toBeDefined();
    // Pure monk: hd.total === unlevel, so the correction term is 0 → just 5.
    expect(stunningFist?.max).toBe(5);
    expect(stunningFist?.per).toBe("day");
  });

  it("Unarmed Strike class feature carries hand-authored damage-die detail (1d8 at L5)", () => {
    const unarmedStrike = sheet.classFeatures.find((f) => f.name === "Unarmed Strike");
    expect(unarmedStrike).toBeDefined();
    expect(unarmedStrike!.classTag).toBe("monk");
    expect(unarmedStrike!.detail).toBe("1d8");
  });

  it("Flurry of Blows class feature carries hand-authored attack-count detail (2 attacks at L5)", () => {
    const flurryOfBlows = sheet.classFeatures.find((f) => f.name === "Flurry of Blows");
    expect(flurryOfBlows).toBeDefined();
    expect(flurryOfBlows!.classTag).toBe("monk");
    expect(flurryOfBlows!.detail).toBe("2 attacks at -2 (BAB = monk level)");
  });

  // Diamond Soul (L13, "10 + @class.unlevel" targeting "spellResist") is
  // correctly vendored but has nowhere to land: Spell Resistance isn't a
  // tracked stat anywhere in DerivedSheet or consumed as a compute.ts target
  // (this app doesn't model SR at all yet) — documented as a gap in
  // IMPLEMENTATION_PLAN.md rather than built here.
  //
  // Still Mind (L3) carries a vendored `contextNotes` entry (+2 saves vs.
  // enchantment) rather than a `changes[]` entry — same shape as Ranger's
  // Track, and same non-gap: `ClassFeature` has no `contextNotes` field at
  // all, so nothing in the pipeline captures it and the engine's own
  // `contextNotes` concept (conditions.ts) is an unrelated, hand-authored
  // mechanism. Already covered by the general note from the Ranger pass.
});

describe("compute: monk AC Bonus (Wis-to-AC), armored vs. unarmored", () => {
  const abilities = { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 8 } as const;

  it("unarmored monk with positive Wis gets the AC/CMD bonus", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 5 }], abilities });
    const sheet = compute(doc, ref);
    // AC Bonus (MNK): if(not shield && not armored && not encumbered, 1) *
    // (wisMod + floor(unlevel/4)) = 1 * (3 + 1) = 4, untyped, category
    // "generic" — applies to ac.normal (and ac.touch, since "generic" is a
    // touch-AC category).
    expect(sheet.ac.normal).toBe(17); // 10 base + dex3 + wisToAc4
    expect(sheet.ac.touch).toBe(17);
    // CMD ALSO gets +4 twice here: once via cmdAcBonus (derived generically
    // from any "dodge"/"deflection"/"generic" ac.components, which already
    // picks up AC Bonus's "ac"-target change) and again via AC Bonus's own
    // separate explicit "cmd"-target change carrying the identical formula.
    // This is a real double-count in the vendored data + this engine's CMD
    // derivation, not a test error — documented in IMPLEMENTATION_PLAN.md.
    // cmd = 10 + bab3 + str2 + dex3 + size0 + cmdAcBonus4 + cmdStack4 = 26
    expect(sheet.cmd).toBe(26);
  });

  it("armored monk does NOT get the AC/CMD bonus (the armor half of the gate works correctly)", () => {
    const doc = makeDoc({
      classes: [{ tag: "monk", level: 5 }],
      abilities,
      gear: [
        {
          equipped: true,
          name: "Studded Leather",
          armor: { slot: "armor", ac: 3, maxDex: 5, acp: -1, type: 1 },
        },
      ],
    });
    const sheet = compute(doc, ref);
    // @armor.type is correctly populated by rolldata.ts from equipped gear,
    // so lt(@armor.type, 1) is false and the whole if(...) short-circuits to
    // 0 * (...) = 0 — both the "ac" and "cmd" targeted changes zero out
    // together, so there's no bonus to double-count here either.
    expect(sheet.ac.normal).toBe(16); // 10 base + armor3 + dex3 + wisToAc0
    expect(sheet.cmd).toBe(18); // 10 + bab3 + str2 + dex3 + size0 + 0 + 0
  });

  // NOT tested here (documented gap, not built — see IMPLEMENTATION_PLAN.md):
  // @shield.type is never populated in rolldata.ts (missing path → 0) and
  // @attributes.encumbrance.level is hardcoded to 0 (no encumbrance model
  // yet, issue #16), so a monk wielding a shield or carrying a heavy load
  // would incorrectly still receive this bonus. The armor check — the most
  // common real-world case — works correctly, per the assertions above.
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
