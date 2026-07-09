import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  MEDIUM_SPIRIT_POWER_LEVELS,
  MEDIUM_SPIRIT_TAGS,
  MEDIUM_SPIRITS,
  mediumSpiritBonus,
} from "../src/index.js";

/**
 * Fixture coverage for the Medium's legendary-spirit subsystem (issue #65):
 * `live.mediumSpirit` (the daily séance pick) drives both the flat Spirit
 * Bonus + Séance Boon `Change`s (`collect.ts`) and the spirit's 4 Spirit
 * Powers (`archetypes.ts`'s `collectGrantedFeatures`). See `medium-
 * spirits.ts`'s file doc comment for the per-spirit audit of which parts are
 * real, unconditional `Change`s vs. prose-only (verified against
 * `targets.ts`'s `APPLIED_TARGETS`).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  level: number,
  overrides: {
    classTag?: string;
    mediumSpirit?: string;
    weapon?: boolean;
  } = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: overrides.classTag ?? "medium", level }],
    },
    abilities: { str: 14, dex: 12, con: 12, int: 14, wis: 14, cha: 14 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: overrides.weapon ? [{ name: "Sword", attackAbility: "str", category: "melee" }] : [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      mediumSpirit: overrides.mediumSpirit,
    },
  };
}

describe("MEDIUM_SPIRITS table", () => {
  it("has all 6 legendary spirits", () => {
    expect(new Set(MEDIUM_SPIRIT_TAGS)).toEqual(
      new Set(["archmage", "champion", "guardian", "hierophant", "marshal", "trickster"]),
    );
  });

  it("every spirit has exactly 4 powers, one per tier, at the correct level gates", () => {
    for (const tag of MEDIUM_SPIRIT_TAGS) {
      const spirit = MEDIUM_SPIRITS[tag]!;
      expect(spirit.powers.length).toBe(4);
      const tiers = spirit.powers.map((p) => p.tier);
      expect(tiers).toEqual(["lesser", "intermediate", "greater", "supreme"]);
      for (const power of spirit.powers) {
        expect(power.level).toBe(MEDIUM_SPIRIT_POWER_LEVELS[power.tier]);
        expect(power.name.length).toBeGreaterThan(0);
        expect(power.summary.length).toBeGreaterThan(0);
      }
    }
  });

  it("every spirit contributes at least one real spiritBonusTarget", () => {
    // Audited in the file doc comment: no spirit is left entirely inert.
    for (const tag of MEDIUM_SPIRIT_TAGS) {
      expect(MEDIUM_SPIRITS[tag]!.spiritBonusTargets.length).toBeGreaterThan(0);
    }
  });
});

describe("mediumSpiritBonus scaling (PF1 RAW: +1 at 1st, +1 more every 4 levels)", () => {
  it("matches the 1/2/3/4/5/6 progression at 1st/4th/8th/12th/16th/20th", () => {
    expect(mediumSpiritBonus(0)).toBe(0);
    expect(mediumSpiritBonus(1)).toBe(1);
    expect(mediumSpiritBonus(3)).toBe(1);
    expect(mediumSpiritBonus(4)).toBe(2);
    expect(mediumSpiritBonus(7)).toBe(2);
    expect(mediumSpiritBonus(8)).toBe(3);
    expect(mediumSpiritBonus(11)).toBe(3);
    expect(mediumSpiritBonus(12)).toBe(4);
    expect(mediumSpiritBonus(16)).toBe(5);
    expect(mediumSpiritBonus(20)).toBe(6);
  });
});

describe("Guardian: AC/Fortitude/Reflex Spirit Bonus + CMD Séance Boon", () => {
  it("applies the scaling bonus to ac/fort/ref, and a flat +1 boon to cmd", () => {
    const withSpirit = compute(makeDoc(5, { mediumSpirit: "guardian" }), ref);
    const without = compute(makeDoc(5), ref);
    const bonus = mediumSpiritBonus(5); // 1 + floor(5/4) = 2

    const acComp = withSpirit.ac.components.find((c) => c.source.includes("Spirit Bonus"));
    expect(acComp?.value).toBe(bonus);
    const fortComp = withSpirit.saves.fort.components.find((c) =>
      c.source.includes("Spirit Bonus"),
    );
    expect(fortComp?.value).toBe(bonus);
    const refComp = withSpirit.saves.ref.components.find((c) => c.source.includes("Spirit Bonus"));
    expect(refComp?.value).toBe(bonus);

    // CMD isn't broken into components on DerivedSheet; assert the diff
    // against an identical character with no spirit channeled instead. The
    // "ac" spirit bonus is untyped (not one of the 8 RAW-named CMD-inclusive
    // AC types), so only the explicit +1 cmd Séance Boon should show up here.
    expect(withSpirit.cmd - without.cmd).toBe(1);
  });

  it("Wisdom/Constitution-adjacent skills get nothing from Guardian (no abilitySkills target)", () => {
    const sheet = compute(makeDoc(5, { mediumSpirit: "guardian" }), ref);
    expect(sheet.skills["hea"]!.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(
      false,
    );
  });
});

describe("Champion: attack/damage/Fortitude Spirit Bonus + non-spell-damage Séance Boon", () => {
  it("applies to base + per-weapon attack, weapon damage bonus, and Fortitude", () => {
    const sheet = compute(makeDoc(6, { mediumSpirit: "champion", weapon: true }), ref);
    const bonus = mediumSpiritBonus(6); // 1 + floor(6/4) = 2

    const meleeAttackComp = sheet.attack.melee.components.find((c) =>
      c.source.includes("Spirit Bonus"),
    );
    expect(meleeAttackComp?.value).toBe(bonus);
    const fortComp = sheet.saves.fort.components.find((c) => c.source.includes("Spirit Bonus"));
    expect(fortComp?.value).toBe(bonus);

    const weaponAttack = sheet.attacks[0]!;
    const weaponAttackComp = weaponAttack.attack.components.find((c) =>
      c.source.includes("Spirit Bonus"),
    );
    expect(weaponAttackComp?.value).toBe(bonus);

    const spiritDamageComp = weaponAttack.damageBonus.components.find(
      (c) => c.source === "Spirit Bonus (Champion Spirit)",
    );
    expect(spiritDamageComp?.value).toBe(bonus);
    const boonDamageComp = weaponAttack.damageBonus.components.find(
      (c) => c.source === "Séance Boon (Champion Spirit)",
    );
    expect(boonDamageComp?.value).toBe(2);
  });
});

describe("Archmage: Intelligence-based skills only (no flat targets)", () => {
  it("applies to Int-keyed skills, not to saves/AC/other-ability skills", () => {
    const sheet = compute(makeDoc(8, { mediumSpirit: "archmage" }), ref);
    const bonus = mediumSpiritBonus(8); // 1 + floor(8/4) = 3

    for (const skillId of ["apr", "crf", "kar", "lin", "spl"]) {
      const comp = sheet.skills[skillId]!.components.find((c) => c.source.includes("Spirit Bonus"));
      expect(comp?.value).toBe(bonus);
    }
    expect(sheet.skills["blf"]!.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(
      false,
    );
    expect(sheet.saves.will.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
    expect(sheet.ac.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
  });
});

describe("Hierophant: Will save + Wisdom-based skills", () => {
  it("applies to will and Wis-keyed skills, not Cha-keyed skills", () => {
    const sheet = compute(makeDoc(4, { mediumSpirit: "hierophant" }), ref);
    const bonus = mediumSpiritBonus(4); // 2

    const willComp = sheet.saves.will.components.find((c) => c.source.includes("Spirit Bonus"));
    expect(willComp?.value).toBe(bonus);
    for (const skillId of ["hea", "per", "sen", "sur"]) {
      const comp = sheet.skills[skillId]!.components.find((c) => c.source.includes("Spirit Bonus"));
      expect(comp?.value).toBe(bonus);
    }
    expect(sheet.skills["dip"]!.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(
      false,
    );
  });
});

describe("Marshal: Charisma-based skills only", () => {
  it("applies to Cha-keyed skills, nothing else", () => {
    const sheet = compute(makeDoc(9, { mediumSpirit: "marshal" }), ref);
    const bonus = mediumSpiritBonus(9); // 1 + floor(9/4) = 3

    for (const skillId of ["blf", "dip", "int", "umd"]) {
      const comp = sheet.skills[skillId]!.components.find((c) => c.source.includes("Spirit Bonus"));
      expect(comp?.value).toBe(bonus);
    }
    expect(sheet.skills["kar"]!.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(
      false,
    );
    expect(sheet.saves.will.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
  });
});

describe("Trickster: Reflex save + ALL skill checks (global target)", () => {
  it("applies to reflex and every skill regardless of key ability", () => {
    const sheet = compute(makeDoc(12, { mediumSpirit: "trickster" }), ref);
    const bonus = mediumSpiritBonus(12); // 4

    const refComp = sheet.saves.ref.components.find((c) => c.source.includes("Spirit Bonus"));
    expect(refComp?.value).toBe(bonus);
    for (const skillId of ["acr", "kar", "swm", "umd"]) {
      const comp = sheet.skills[skillId]!.components.find((c) => c.source.includes("Spirit Bonus"));
      expect(comp?.value).toBe(bonus);
    }
  });
});

describe("No séance performed / non-medium character", () => {
  it("no spirit chosen contributes nothing anywhere", () => {
    const sheet = compute(makeDoc(10), ref);
    expect(sheet.ac.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
    expect(sheet.saves.fort.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
    expect(sheet.classFeatures.some((f) => f.origin?.kind === "spiritPower")).toBe(false);
  });

  it("a stale mediumSpirit on a non-medium character grants nothing", () => {
    const sheet = compute(
      makeDoc(10, { classTag: "rogueUnchained", mediumSpirit: "guardian" }),
      ref,
    );
    expect(sheet.ac.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
  });

  it("an unrecognized spirit tag is tolerated, not crashed on", () => {
    expect(() => compute(makeDoc(5, { mediumSpirit: "not-a-real-spirit" }), ref)).not.toThrow();
    const sheet = compute(makeDoc(5, { mediumSpirit: "not-a-real-spirit" }), ref);
    expect(sheet.ac.components.some((c) => c.source.includes("Spirit Bonus"))).toBe(false);
  });
});

describe("Spirit Powers grant list (classFeatures, origin.kind: spiritPower)", () => {
  it("grants only the lesser power at 1st level", () => {
    const sheet = compute(makeDoc(1, { mediumSpirit: "trickster" }), ref);
    const powers = sheet.classFeatures.filter((f) => f.origin?.kind === "spiritPower");
    expect(powers.length).toBe(1);
    expect(powers[0]!.name).toBe("Trickster's Edge");
    expect(powers[0]!.detail).toBe(MEDIUM_SPIRITS.trickster!.powers[0]!.summary);
    expect(powers[0]!.classTag).toBe("medium");
  });

  it("grants lesser + intermediate at 6th, all 4 at 17th", () => {
    const at6 = compute(makeDoc(6, { mediumSpirit: "guardian" }), ref);
    expect(at6.classFeatures.filter((f) => f.origin?.kind === "spiritPower").length).toBe(2);

    const at17 = compute(makeDoc(17, { mediumSpirit: "guardian" }), ref);
    const powersAt17 = at17.classFeatures.filter((f) => f.origin?.kind === "spiritPower");
    expect(powersAt17.length).toBe(4);
    expect(powersAt17.map((p) => p.name).sort()).toEqual(
      MEDIUM_SPIRITS.guardian!.powers.map((p) => p.name).sort(),
    );
  });

  it("switching spirits grants a different power set, not a union of both", () => {
    const archmage = compute(makeDoc(6, { mediumSpirit: "archmage" }), ref);
    const champion = compute(makeDoc(6, { mediumSpirit: "champion" }), ref);
    const archmageNames = archmage.classFeatures
      .filter((f) => f.origin?.kind === "spiritPower")
      .map((f) => f.name);
    const championNames = champion.classFeatures
      .filter((f) => f.origin?.kind === "spiritPower")
      .map((f) => f.name);
    expect(archmageNames).toEqual(["Archmage's Arcana", "Arcane Surge"]);
    expect(championNames).toEqual(["Champion's Prowess", "Sudden Attack"]);
  });
});
