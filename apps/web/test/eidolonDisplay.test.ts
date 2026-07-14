import { describe, expect, it } from "bun:test";

import type { DerivedEidolon, DerivedEidolonAttack } from "@pf1/engine";

import {
  eidolonAttackInstanceCount,
  eidolonSkillRows,
  formatEidolonAttackDamage,
  formatEidolonAttackName,
  formatEidolonAttackRoll,
  formatEidolonAttackTypeSuffix,
  formatEidolonEvolutionBudget,
  formatEidolonSummary,
} from "../src/model/eidolonDisplay.js";

function makeAttack(overrides: Partial<DerivedEidolonAttack> = {}): DerivedEidolonAttack {
  return {
    name: "Claw",
    count: 1,
    attack: 8,
    damageDice: "1d6",
    damageBonus: 4,
    attackType: "primary",
    ...overrides,
  };
}

function makeEidolon(overrides: Partial<DerivedEidolon> = {}): DerivedEidolon {
  return {
    baseFormId: "biped",
    baseFormName: "Biped",
    name: "Grothul",
    size: "med",
    level: 7,
    hd: 6,
    abilities: {
      str: { score: 18, mod: 4 },
      dex: { score: 14, mod: 2 },
      con: { score: 15, mod: 2 },
      int: { score: 7, mod: -2 },
      wis: { score: 10, mod: 0 },
      cha: { score: 11, mod: 0 },
    },
    hp: { max: 55, current: 55, nonlethal: 0 },
    init: 2,
    speeds: { land: 30 },
    ac: { normal: 20, touch: 12, flatFooted: 18, components: [] },
    saves: { fort: 8, ref: 4, will: 3 },
    bab: 6,
    cmb: 10,
    cmd: 22,
    attacks: [makeAttack()],
    skills: {
      per: { id: "per", ability: "wis", total: 5, components: [] },
    },
    naturalArmor: 4,
    evolutionPointsSpent: 3,
    evolutionPointsAvailable: 10,
    skillPoints: 24,
    bonusFeats: 3,
    maxAttacks: 3,
    specialAbilities: [],
    freeEvolutionNames: [],
    chosenEvolutions: [],
    variant: "chained",
    grantedEvolutions: [],
    abilityIncreaseSlots: 0,
    ...overrides,
  };
}

describe("formatEidolonSummary", () => {
  it("joins base form/size and land speed with the app's '·' convention", () => {
    const eidolon = makeEidolon();
    expect(formatEidolonSummary(eidolon)).toBe("Biped, Medium · Speed 30 ft.");
  });

  it("formats multiple speed modes with their mode label", () => {
    const eidolon = makeEidolon({ speeds: { land: 30, climb: 20 } });
    expect(formatEidolonSummary(eidolon)).toBe("Biped, Medium · Speed 30 ft., climb 20 ft.");
  });

  it("omits the speed segment entirely when there are no speeds", () => {
    const eidolon = makeEidolon({ speeds: {} });
    expect(formatEidolonSummary(eidolon)).toBe("Biped, Medium");
  });
});

describe("formatEidolonAttackName", () => {
  it("shows a single attack unpluralized", () => {
    expect(formatEidolonAttackName(makeAttack({ name: "Bite", count: 1 }))).toBe("Bite");
  });

  it("pluralizes and lowercases multi-attacks", () => {
    expect(formatEidolonAttackName(makeAttack({ name: "Claw", count: 2 }))).toBe("2 claws");
  });
});

describe("formatEidolonAttackTypeSuffix", () => {
  it("is blank for a primary attack", () => {
    expect(formatEidolonAttackTypeSuffix(makeAttack({ attackType: "primary" }))).toBe("");
  });

  it("flags a secondary attack", () => {
    expect(formatEidolonAttackTypeSuffix(makeAttack({ attackType: "secondary" }))).toBe(
      "(secondary)",
    );
  });
});

describe("formatEidolonAttackRoll / formatEidolonAttackDamage", () => {
  it("formats the attack roll as a signed number", () => {
    expect(formatEidolonAttackRoll(makeAttack({ attack: 8 }))).toBe("+8");
    expect(formatEidolonAttackRoll(makeAttack({ attack: -2 }))).toBe("-2");
  });

  it("formats damage dice plus a nonzero bonus", () => {
    expect(formatEidolonAttackDamage(makeAttack({ damageDice: "1d6", damageBonus: 4 }))).toBe(
      "1d6+4",
    );
    expect(formatEidolonAttackDamage(makeAttack({ damageDice: "1d6", damageBonus: 0 }))).toBe(
      "1d6",
    );
  });
});

describe("eidolonSkillRows", () => {
  it("surfaces the eidolon's skills, sorted by display name", () => {
    const rows = eidolonSkillRows(makeEidolon());
    expect(rows.map((r) => r.id)).toEqual(["per"]);
    expect(rows[0]!.total).toBe(5);
  });
});

describe("formatEidolonEvolutionBudget", () => {
  it("formats spent / available", () => {
    expect(
      formatEidolonEvolutionBudget(
        makeEidolon({ evolutionPointsSpent: 3, evolutionPointsAvailable: 10 }),
      ),
    ).toBe("3 / 10");
  });
});

describe("eidolonAttackInstanceCount", () => {
  it("sums each attack row's count", () => {
    const eidolon = makeEidolon({
      attacks: [makeAttack({ name: "Bite", count: 1 }), makeAttack({ name: "Claw", count: 2 })],
    });
    expect(eidolonAttackInstanceCount(eidolon)).toBe(3);
  });

  it("is zero when the eidolon has no attacks", () => {
    expect(eidolonAttackInstanceCount(makeEidolon({ attacks: [] }))).toBe(0);
  });
});
