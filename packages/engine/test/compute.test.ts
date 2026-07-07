import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, ItemInstance, WeaponInstance } from "@pf1/schema";
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
  weapons?: WeaponInstance[];
  settings?: NonNullable<CharacterDoc["build"]>["settings"];
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
      ...(over.weapons ? { weapons: over.weapons } : {}),
      ...(over.settings ? { settings: over.settings } : {}),
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

describe("compute: Craft/Profession/Perform parameterized subskills (issue #24)", () => {
  // Bard L5: "prf" is a bard class skill (bare id, confirmed in the vendored
  // class data — classes.json never lists a per-instance craft/profession/
  // perform id), so both prf.* instances below should independently pick up
  // the class-skill +3. "pro" is trained-only (SKILL_TRAINED_ONLY), so
  // pro.blacksmithing inherits that from its base id.
  const doc = makeDoc({
    classes: [{ tag: "bard", level: 5 }],
    abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    skillRanks: {
      "prf.oratory": 5,
      "prf.dancing": 2,
      "pro.blacksmithing": 3,
    },
  });
  const sheet = compute(doc, ref);

  it("two Perform instances have independent ranks/totals (cha3 + class +3)", () => {
    expect(sheet.skills["prf.oratory"]!.ranks).toBe(5);
    expect(sheet.skills["prf.oratory"]!.total).toBe(11); // 5 + cha3 + 3
    expect(sheet.skills["prf.dancing"]!.ranks).toBe(2);
    expect(sheet.skills["prf.dancing"]!.total).toBe(8); // 2 + cha3 + 3
  });

  it("both Perform instances resolve to Charisma and are marked class skills (base id 'prf' is a bard class skill)", () => {
    expect(sheet.skills["prf.oratory"]!.ability).toBe("cha");
    expect(sheet.skills["prf.dancing"]!.ability).toBe("cha");
    expect(sheet.skills["prf.oratory"]!.classSkill).toBe(true);
    expect(sheet.skills["prf.dancing"]!.classSkill).toBe(true);
  });

  it("Profession instance inherits trained-only from its base id 'pro'", () => {
    expect(sheet.skills["pro.blacksmithing"]!.trainedOnly).toBe(true);
    expect(sheet.skills["pro.blacksmithing"]!.usable).toBe(true); // ranked
  });

  it("an unranked bare 'pro' still renders as trained-only and unusable", () => {
    expect(sheet.skills.pro!.trainedOnly).toBe(true);
    expect(sheet.skills.pro!.ranks).toBe(0);
    expect(sheet.skills.pro!.usable).toBe(false);
  });

  it("a 'skill.prf' group-style modifier (e.g. a Versatile-Performance-shaped buff) hits every prf.* instance, not unrelated skills", () => {
    const buffed = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "test-perform-boost",
            name: "Test Perform Boost",
            changes: [{ formula: "2", target: "skill.prf", type: "untyped" }],
          },
        ],
      },
    };
    const buffedSheet = compute(buffed, ref);
    expect(buffedSheet.skills["prf.oratory"]!.total - sheet.skills["prf.oratory"]!.total).toBe(2);
    expect(buffedSheet.skills["prf.dancing"]!.total - sheet.skills["prf.dancing"]!.total).toBe(2);
    // The bare "prf" id (unranked, but still rendered) also gets the group bonus...
    expect(buffedSheet.skills.prf!.total - sheet.skills.prf!.total).toBe(2);
    // ...but an unrelated skill (Diplomacy) is untouched.
    expect(buffedSheet.skills.dip!.total).toBe(sheet.skills.dip!.total);
  });

  it("a 'skill.prf.oratory' specific-instance modifier hits only that one instance", () => {
    const buffed = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "test-oratory-boost",
            name: "Test Oratory Boost",
            changes: [{ formula: "4", target: "skill.prf.oratory", type: "untyped" }],
          },
        ],
      },
    };
    const buffedSheet = compute(buffed, ref);
    expect(buffedSheet.skills["prf.oratory"]!.total - sheet.skills["prf.oratory"]!.total).toBe(4);
    expect(buffedSheet.skills["prf.dancing"]!.total).toBe(sheet.skills["prf.dancing"]!.total);
    expect(buffedSheet.skills.prf!.total).toBe(sheet.skills.prf!.total);
  });
});

describe("compute: Craft/Profession/Perform back-compat (bare ids, pre-#24 documents)", () => {
  // A document written before parameterized subskill support existed only
  // ever has the bare "crf"/"pro"/"prf" ids in skillRanks. Confirms those
  // keep behaving exactly as before: unaffected by skillBaseId resolution
  // (a bare id IS its own base id) and by the new parameterized-prefix
  // fan-out (a "skill.crf" target still reaches the bare "crf" id itself).
  const doc = makeDoc({
    classes: [{ tag: "rogue", level: 5 }],
    abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 10, cha: 10 },
    skillRanks: { crf: 3 },
  });
  const sheet = compute(doc, ref);

  it("bare 'crf' resolves ability/class-skill/total exactly as a non-parameterized skill", () => {
    expect(sheet.skills.crf!.ability).toBe("int");
    expect(sheet.skills.crf!.classSkill).toBe(true); // rogue class skill
    expect(sheet.skills.crf!.total).toBe(7); // 3 ranks + int1 + class3
  });

  it("a 'skill.crf' modifier target still reaches the bare id", () => {
    const buffed = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "test-craft-boost",
            name: "Test Craft Boost",
            changes: [{ formula: "1", target: "skill.crf", type: "untyped" }],
          },
        ],
      },
    };
    const buffedSheet = compute(buffed, ref);
    expect(buffedSheet.skills.crf!.total - sheet.skills.crf!.total).toBe(1);
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
    const preKiDoc = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "monk", level: 3 }] },
    };
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

  it("unarmored monk with positive Wis gets the AC/CMD bonus exactly once (issue #33)", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 5 }], abilities });
    const sheet = compute(doc, ref);
    // AC Bonus (MNK): if(not shield && not armored && not encumbered, 1) *
    // (wisMod + floor(unlevel/4)) = 1 * (3 + 1) = 4, untyped, category
    // "generic" — applies to ac.normal (and ac.touch, since "generic" is a
    // touch-AC category).
    expect(sheet.ac.normal).toBe(17); // 10 base + dex3 + wisToAc4
    expect(sheet.ac.touch).toBe(17);
    // AC Bonus (MNK) carries BOTH a generic "ac" change and its own explicit
    // "cmd" change with the identical untyped formula. Untyped AC bonuses are
    // not one of RAW's eight CMD-eligible types (deflection/dodge/
    // circumstance/insight/luck/morale/profane/sacred), so the "ac" copy is
    // never auto-derived into CMD regardless of dedup; only the explicit
    // "cmd" copy counts, applied exactly once (issue #33 fix).
    // cmd = 10 + bab3 + str2 + dex3 + size0 + wisToAc4(explicit cmd only) = 22
    expect(sheet.cmd).toBe(22);
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

  it("encumbered monk (medium load, encumbranceEnabled) does NOT get the AC/CMD bonus (issue #16)", () => {
    const doc = makeDoc({
      classes: [{ tag: "monk", level: 5 }],
      abilities,
      settings: { encumbranceEnabled: true },
      // Str 14 carrying capacity: 58/116/175 (CRB table). 100 lb lands in
      // the medium band (59-116).
      gear: [{ equipped: true, name: "Heavy Backpack", weight: 100 }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.tier).toBe("medium");
    // @attributes.encumbrance.level is now 1 (medium), so lt(level, 1) is
    // false — the gate zeroes out exactly like the armored-monk case above.
    expect(sheet.ac.normal).toBe(13); // 10 base + dex3 + wisToAc0
    expect(sheet.cmd).toBe(18); // 10 + bab3 + str2 + dex3 + size0 + 0
  });

  it("encumbered monk (heavy load, encumbranceEnabled) does NOT get the AC/CMD bonus (issue #16)", () => {
    const doc = makeDoc({
      classes: [{ tag: "monk", level: 5 }],
      abilities,
      settings: { encumbranceEnabled: true },
      // Str 14 carrying capacity: 58/116/175. 200 lb pushes past heavy (175).
      gear: [{ equipped: true, name: "Anvil", weight: 200 }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.tier).toBe("heavy");
    // @attributes.encumbrance.level is now correctly wired to 2 (heavy), so
    // lt(@attributes.encumbrance.level, 1) is false — the monk AC/CMD bonus
    // gate correctly zeroes out, closing the documented pre-#16 gap. Heavy
    // load ALSO caps max Dex to +1 (Dex mod here is +3), so the "Dexterity"
    // AC component is capped down to 1 as well.
    expect(sheet.ac.normal).toBe(11); // 10 base + dex(capped 1) + wisToAc0
    // CMD's Dex term is never capped by armor OR load (RAW — only AC's Dex
    // bonus is capped), so this is identical to the medium-load case above.
    expect(sheet.cmd).toBe(18); // 10 + bab3 + str2 + dex3(uncapped) + size0 + 0
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(1);
    expect(dexComponent?.source).toBe("Dexterity (Heavy load)");
  });

  // Remaining documented gap: @shield.type is never populated in rolldata.ts
  // (missing path → 0), so a monk wielding a shield still incorrectly
  // receives this bonus. Encumbrance is now wired (see the two tests above).
});

describe("compute: CMD RAW-correct derivation, no double-counting (issue #33)", () => {
  // Fighter L5, no gear, no buffs: bab5 + str2 + dex3 + size0.
  // cmd = 10 + 5 + 2 + 3 = 20; ac.normal = 10 + dex3 = 13.
  const baseDoc = () =>
    makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      abilities: { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 8 },
    });
  const baseSheet = compute(baseDoc(), ref);

  it("baseline sanity: CMD 20, AC 13", () => {
    expect(baseSheet.cmd).toBe(20);
    expect(baseSheet.ac.normal).toBe(13);
  });

  it("Iron Mask (masterwork) no longer double-counts its Dex-halving penalty into CMD", () => {
    // Iron Mask, masterwork: two identical untyped changes, one targeting
    // "ac" and one targeting "cmd", both
    // `min(0, -floor(@abilities.dex.mod / 2))`. With dexMod=3: floor(3/2)=1,
    // so the formula evaluates to -1 on each target.
    const doc = {
      ...baseDoc(),
      build: {
        ...baseDoc().build,
        gear: [{ equipped: true, itemId: itemByName("Iron Mask, masterwork") }],
      },
    };
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(12); // 13 - 1
    // Untyped is not one of RAW's eight CMD-eligible AC bonus types, so the
    // "ac" copy is never auto-derived into CMD (dedup is moot here — it's
    // excluded on type alone); only the explicit "cmd" copy applies once.
    // cmd = 20 - 1 = 19, NOT 20 - 1 - 1 = 18 (the pre-fix double count).
    expect(sheet.cmd).toBe(19);
  });

  it("Deflection Aura buff applies its +2 deflection to CMD exactly once", () => {
    const { id: buffId, buff } = buffByName("Deflection Aura");
    const doc = {
      ...baseDoc(),
      live: {
        ...baseDoc().live,
        activeBuffs: [
          { instanceId: "deflection-aura", buffId, name: buff.name, changes: buff.changes },
        ],
      },
    };
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(15); // 13 + 2 deflection
    // Deflection Aura carries both an "ac" deflection change and its own
    // explicit "cmd" deflection change (same formula, same source). The "ac"
    // copy is excluded from auto-derivation because this source also has an
    // explicit "cmd" change, so only that explicit +2 counts.
    // cmd = 20 + 2 = 22, NOT 20 + 2 + 2 = 24 (the pre-fix double count).
    expect(sheet.cmd).toBe(22);
  });

  it("a plain deflection source with no explicit cmd change (Shield of Faith) still auto-derives into CMD", () => {
    const { id: buffId, buff } = buffByName("Shield of Faith");
    const doc = {
      ...baseDoc(),
      live: {
        ...baseDoc().live,
        activeBuffs: [
          { instanceId: "shield-of-faith", buffId, name: buff.name, changes: buff.changes },
        ],
      },
    };
    const sheet = compute(doc, ref);
    // Formula: 2 + min(3, floor(@item.level / 6)); no casterLevel override on
    // the ActiveBuff → @item.level reads as the missing-path default of 0, so
    // it evaluates to 2 + min(3, 0) = 2 deflection, "ac" target only.
    expect(sheet.ac.normal).toBe(15); // 13 + 2
    expect(sheet.cmd).toBe(22); // 20 + 2, auto-derived (deflection is CMD-eligible)
  });

  it("a dodge bonus (Total Defense, ac-only) auto-derives into CMD", () => {
    const { id: buffId, buff } = buffByName("Total Defense");
    const doc = {
      ...baseDoc(),
      live: {
        ...baseDoc().live,
        activeBuffs: [
          { instanceId: "total-defense", buffId, name: buff.name, changes: buff.changes },
        ],
      },
    };
    const sheet = compute(doc, ref);
    // Formula: 4 + if(gte(@skills.acr.rank, 3), 2); no Acrobatics ranks on
    // this doc → gte(0, 3) is false, so it evaluates to a flat +4 dodge.
    expect(sheet.ac.normal).toBe(17); // 13 + 4
    expect(sheet.cmd).toBe(24); // 20 + 4, auto-derived (dodge is CMD-eligible)
  });

  it("an armor bonus does NOT reach CMD", () => {
    const doc = {
      ...baseDoc(),
      build: {
        ...baseDoc().build,
        gear: [
          {
            equipped: true,
            name: "Studded Leather",
            armor: { slot: "armor" as const, ac: 3, maxDex: 5, acp: -1, type: 1 },
          },
        ],
      },
    };
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(16); // 13 + 3 armor (maxDex 5 doesn't cap dex3)
    expect(sheet.cmd).toBe(20); // unchanged — armor bonuses never apply to CMD
  });

  it("two deflection sources still only apply the highest to CMD (stacking rules hold within CMD)", () => {
    // Ring of Protection +2: plain "ac" deflection, no explicit "cmd" change
    // (auto-derives). Deflection Aura: "ac" deflection +2 AND an explicit
    // "cmd" deflection +2 (its "ac" copy is excluded per the dedup test
    // above). Both are type "deflection" (a non-stacking type), so the
    // combined CMD stack should apply only one +2, not both.
    const { id: buffId, buff } = buffByName("Deflection Aura");
    const doc = {
      ...baseDoc(),
      build: {
        ...baseDoc().build,
        gear: [{ equipped: true, itemId: itemByName("Ring of Protection +2") }],
      },
      live: {
        ...baseDoc().live,
        activeBuffs: [
          { instanceId: "deflection-aura", buffId, name: buff.name, changes: buff.changes },
        ],
      },
    };
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(15); // 13 + 2 (deflection doesn't stack with itself in AC either)
    expect(sheet.cmd).toBe(22); // 20 + 2, NOT 20 + 2 + 2 = 24
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
    const armorEnh = sheet.ac.components.find((c) => c.category === "armor" && c.type === "enh");
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
    const shieldEnh = sheet.ac.components.find((c) => c.category === "shield" && c.type === "enh");
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

function buffByName(name: string) {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  const [id, buff] = entry;
  return { id, buff };
}

// --- issue #15 (item/equipment breadth) -------------------------------------
//
// The `items` pack widened from 111 to 1089 vendored entries (every non-folder
// doc, not just those carrying typed `changes`). All 111 typed-change items —
// including Cloak of Resistance and Ring of Protection, exercised below — were
// *already* present under the old filter (it selected on `changes.length >
// 0`), so there are no genuinely new stat-granting items to add here; the
// first two cases below are regression coverage confirming the broadened
// dataset didn't disturb them. "Staff of Healing" and "Air Bladder" are
// genuinely new (mundane / changeless), added by the breadth expansion, and
// exercise the previously-absent charges shape and a no-op equip path.
describe("compute: item breadth (issue #15)", () => {
  it("Cloak of Resistance +1 applies a resist bonus to all saves when equipped", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      gear: [{ equipped: true, itemId: itemByName("Cloak of Resistance +1") }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(5); // 2 base (good) + con2 + 1 resist
    expect(sheet.saves.ref.total).toBe(2); // 0 base (poor) + dex1 + 1 resist
    expect(sheet.saves.will.total).toBe(1); // 0 base (poor) + wis0 + 1 resist
  });

  it("Ring of Protection +1 applies a deflection bonus to AC/CMD with provenance", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      gear: [{ equipped: true, itemId: itemByName("Ring of Protection +1") }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(12); // 10 + dex1 + deflection1
    const defl = sheet.ac.components.find((c) => c.category === "deflection");
    expect(defl).toMatchObject({ source: "Ring of Protection +1", value: 1, applied: true });
  });

  it("a charged consumable (Staff of Healing) vends with a maxFormula/per charges shape", () => {
    // Confirms the newly-captured `uses` shape on RefData.items — reference
    // data only (no live `value`; current charges are session state, not
    // modeled by this issue).
    const staff = ref.items[itemByName("Staff of Healing")]!;
    expect(staff.uses).toEqual({ maxFormula: "10", per: "charges" });
    expect(staff.changes).toEqual([]);

    // Equipping a changeless charged item is a no-op on the derived sheet
    // (no crash, no phantom bonus) — this is the common case for the ~978
    // newly-vendored mundane/consumable items that carry no typed changes.
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      gear: [{ equipped: true, itemId: itemByName("Staff of Healing") }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(4); // 2 base (good) + con2, unaffected by the staff
  });

  it("mundane adventuring gear (Air Bladder) equips cleanly with weight + price captured", () => {
    const air = ref.items[itemByName("Air Bladder")];
    expect(air).toMatchObject({ subType: "adventuring", price: 0.1, weight: 0.5 });
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      gear: [{ equipped: true, itemId: itemByName("Air Bladder") }],
    });
    expect(() => compute(doc, ref)).not.toThrow();
  });
});

describe("compute: arcanist L4 (human, no armor) — ACG hybrid caster (issue #13)", () => {
  // Str/Dex/Con/Wis held at 10 (mod 0) so BAB/saves read as their bare tier
  // values below; Int 20 (mod +5) drives spell DC/bonus slots, Cha 14 (mod +2)
  // drives Consume Spells uses/day.
  const doc = makeDoc({
    classes: [{ tag: "arcanist", level: 4 }],
    abilities: { str: 10, dex: 10, con: 10, int: 20, wis: 10, cha: 14 },
    skillRanks: { spl: 4, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +2 (1/2 low progression: floor(4/2))", () => {
    expect(sheet.bab).toBe(2);
  });

  it("saves: Fort +1, Ref +1 (poor base), Will +4 (good base) — abilities held at 0 mod", () => {
    expect(sheet.saves.fort.total).toBe(1);
    expect(sheet.saves.ref.total).toBe(1);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 18 (d6 HD: 6 max L1 + 4 avg * 3 more levels, Con at 0 mod)", () => {
    expect(sheet.hp.max).toBe(18);
  });

  it("2 + Int skill points/level, d6 HD, low BAB, fort/ref low + will high in ref data (arcanist class def)", () => {
    const arcanistEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "arcanist");
    expect(arcanistEntry).toBeDefined();
    expect(arcanistEntry![1].skillsPerLevel).toBe(2);
    expect(arcanistEntry![1].hd).toBe(6);
    expect(arcanistEntry![1].bab).toBe("low");
    expect(arcanistEntry![1].saves).toEqual({ fort: "low", ref: "low", will: "high" });
  });

  it("spellcraft (class skill) gets the +3 class-skill bonus; non-class skill does not", () => {
    expect(sheet.skills.spl!.total).toBe(12); // 4 ranks + int5 + classSkill3
    expect(sheet.skills.spl!.classSkill).toBe(true);
    expect(sheet.skills.dip!.total).toBe(3); // 1 rank + cha2, dip not an arcanist class skill
    expect(sheet.skills.dip!.classSkill).toBe(false);
  });

  it("Int modifier +5 feeds spell DC (10 + spell level + Int mod)", () => {
    expect(sheet.abilities.int.mod).toBe(5);
  });

  it("Arcane Reservoir resource pool: 3 + arcanist level, no ability bonus (RAW cap; daily refill is a separate 3 + level/2 formula not modeled — see IMPLEMENTATION_PLAN.md)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const reservoir = pools.find((p) => p.name === "Arcane Reservoir");
    expect(reservoir).toBeDefined();
    expect(reservoir?.max).toBe(7); // 3 + 4
    expect(reservoir?.per).toBe("day");
  });

  it("Consume Spells resource pool: Cha modifier uses/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const consumeSpells = pools.find((p) => p.name === "Consume Spells");
    expect(consumeSpells).toBeDefined();
    expect(consumeSpells?.max).toBe(2); // cha mod +2
    expect(consumeSpells?.per).toBe("day");
  });
});

describe("compute: magus L7 (human, no armor) — UM medium prepared-arcane caster", () => {
  // Con 14 (mod +2) drives HP; Int 18 (mod +4) drives spell DC/Arcane Pool.
  const doc = makeDoc({
    classes: [{ tag: "magus", level: 7 }],
    abilities: { str: 10, dex: 10, con: 14, int: 18, wis: 10, cha: 10 },
    skillRanks: { spl: 7, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +5 (3/4 medium progression: floor(7*3/4))", () => {
    expect(sheet.bab).toBe(5);
  });

  it("saves: Fort +7 and Will +5 (good bases, Fort also gets +2 Con), Ref +2 (poor)", () => {
    expect(sheet.saves.fort.total).toBe(7); // base 5 (2 + floor(7/2)) + con mod 2
    expect(sheet.saves.will.total).toBe(5); // base 5 (2 + floor(7/2)) + wis mod 0
    expect(sheet.saves.ref.total).toBe(2); // base 2 (floor(7/3)) + dex mod 0
  });

  it("HP 52 (d8 HD: 8 max L1 + 5 avg * 6 more levels, +2 Con/level)", () => {
    expect(sheet.hp.max).toBe(52);
  });

  it("2 + Int skill points/level, d8 HD, medium BAB, fort/will high + ref low (magus class def)", () => {
    const magusEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "magus");
    expect(magusEntry).toBeDefined();
    expect(magusEntry![1].skillsPerLevel).toBe(2);
    expect(magusEntry![1].hd).toBe(8);
    expect(magusEntry![1].bab).toBe("med");
    expect(magusEntry![1].saves).toEqual({ fort: "high", ref: "low", will: "high" });
  });

  it("spellcraft (class skill) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.spl!.total).toBe(14); // 7 ranks + int mod 4 + classSkill 3
    expect(sheet.skills.spl!.classSkill).toBe(true);
  });

  it("Arcane Pool resource pool: 1/2 magus level (min 1) + Int mod, no daily-refill nuance modeled (rides the generic uses.maxFormula pipeline)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const arcanePool = pools.find((p) => p.name === "Arcane Pool");
    expect(arcanePool).toBeDefined();
    expect(arcanePool?.max).toBe(7); // floor(7/2)=3 + int mod 4
    expect(arcanePool?.per).toBe("day");
  });
});

describe("compute: oracle L5 (human, no armor) — APG spontaneous divine caster", () => {
  // Con 12 (mod +1) drives HP; Cha 16 (mod +3) drives spell DC/spells known.
  const doc = makeDoc({
    classes: [{ tag: "oracle", level: 5 }],
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 10, cha: 16 },
    skillRanks: { hea: 5, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Will +4 (good), Fort +2 (poor base + Con) and Ref +1 (poor)", () => {
    expect(sheet.saves.will.total).toBe(4); // base 4 (2 + floor(5/2)) + wis mod 0
    expect(sheet.saves.fort.total).toBe(2); // base 1 (floor(5/3)) + con mod 1
    expect(sheet.saves.ref.total).toBe(1); // base 1 (floor(5/3)) + dex mod 0
  });

  it("HP 33 (d8 HD: 8 max L1 + 5 avg * 4 more levels, +1 Con/level)", () => {
    expect(sheet.hp.max).toBe(33);
  });

  it("4 + Int skill points/level, d8 HD, medium BAB, will high + fort/ref low (oracle class def)", () => {
    const oracleEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "oracle");
    expect(oracleEntry).toBeDefined();
    expect(oracleEntry![1].skillsPerLevel).toBe(4);
    expect(oracleEntry![1].hd).toBe(8);
    expect(oracleEntry![1].bab).toBe("med");
    expect(oracleEntry![1].saves).toEqual({ fort: "low", ref: "low", will: "high" });
  });

  it("heal (class skill) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.hea!.total).toBe(8); // 5 ranks + wis0 + classSkill3
    expect(sheet.skills.hea!.classSkill).toBe(true);
  });
});

describe("compute: witch L7 (human, no armor) — APG full prepared-arcane caster", () => {
  // Con 14 (mod +2) drives HP; Int 18 (mod +4) drives spell DC/bonus spells.
  const doc = makeDoc({
    classes: [{ tag: "witch", level: 7 }],
    abilities: { str: 10, dex: 10, con: 14, int: 18, wis: 10, cha: 10 },
    skillRanks: { spl: 7, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (1/2 low progression: floor(7/2))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Will +5 (good base + no wis mod), Fort +4 (poor base + Con), Ref +2 (poor)", () => {
    expect(sheet.saves.will.total).toBe(5); // base 5 (2 + floor(7/2)) + wis mod 0
    expect(sheet.saves.fort.total).toBe(4); // base 2 (floor(7/3)) + con mod 2
    expect(sheet.saves.ref.total).toBe(2); // base 2 (floor(7/3)) + dex mod 0
  });

  it("HP 44 (d6 HD: L1 max 6+2 Con, + 6 more levels at avg 4+2 Con each)", () => {
    expect(sheet.hp.max).toBe(44);
  });

  it("2 + Int skill points/level, d6 HD, low BAB, will high + fort/ref low (witch class def)", () => {
    const witchEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "witch");
    expect(witchEntry).toBeDefined();
    expect(witchEntry![1].skillsPerLevel).toBe(2);
    expect(witchEntry![1].hd).toBe(6);
    expect(witchEntry![1].bab).toBe("low");
    expect(witchEntry![1].saves).toEqual({ fort: "low", ref: "low", will: "high" });
  });

  it("spellcraft (class skill) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.spl!.total).toBe(14); // 7 ranks + int mod 4 + classSkill 3
    expect(sheet.skills.spl!.classSkill).toBe(true);
  });
});

describe("compute: shaman L5 (human, no armor) — ACG full prepared-divine caster", () => {
  // Con 12 (mod +1) drives HP; Wis 16 (mod +3) drives spell DC/bonus spells.
  const doc = makeDoc({
    classes: [{ tag: "shaman", level: 5 }],
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    skillRanks: { hea: 5, dip: 1 },
  });
  const sheet = compute(doc, ref);

  it("BAB +3 (3/4 medium progression: floor(5*3/4))", () => {
    expect(sheet.bab).toBe(3);
  });

  it("saves: Will +7 (good base + Wis), Fort +2 (poor base + Con), Ref +1 (poor)", () => {
    expect(sheet.saves.will.total).toBe(7); // base 4 (2 + floor(5/2)) + wis mod 3
    expect(sheet.saves.fort.total).toBe(2); // base 1 (floor(5/3)) + con mod 1
    expect(sheet.saves.ref.total).toBe(1); // base 1 (floor(5/3)) + dex mod 0
  });

  it("HP 33 (d8 HD: L1 max 8+1 Con, + 4 more levels at avg 5+1 Con each)", () => {
    expect(sheet.hp.max).toBe(33);
  });

  it("4 + Int skill points/level, d8 HD, medium BAB, will high + fort/ref low (shaman class def)", () => {
    const shamanEntry = Object.entries(ref.classes).find(([, c]) => c.tag === "shaman");
    expect(shamanEntry).toBeDefined();
    expect(shamanEntry![1].skillsPerLevel).toBe(4);
    expect(shamanEntry![1].hd).toBe(8);
    expect(shamanEntry![1].bab).toBe("med");
    expect(shamanEntry![1].saves).toEqual({ fort: "low", ref: "low", will: "high" });
  });

  it("heal (class skill) gets the +3 class-skill bonus", () => {
    expect(sheet.skills.hea!.total).toBe(11); // 5 ranks + wis mod 3 + classSkill 3
    expect(sheet.skills.hea!.classSkill).toBe(true);
  });
});
