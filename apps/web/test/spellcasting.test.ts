import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  accessibleSpellLevels,
  bloodlineSpellsKnown,
  bonusSpellsForLevel,
  casterModelFor,
  concentrationDC,
  curseSpellsKnown,
  grantedCantrips,
  mysterySpellsKnown,
  preparedCapacityByLevel,
  spellSaveDC,
  spellSlotsByLevel,
  spellsKnownLimitsByLevel,
} from "../src/model/spellcasting.js";

const ref = loadRefData();

describe("bonusSpellsForLevel()", () => {
  it("returns 0 for cantrips (spell level 0) regardless of modifier", () => {
    expect(bonusSpellsForLevel(10, 0)).toBe(0);
    expect(bonusSpellsForLevel(0, 0)).toBe(0);
  });

  it("returns 0 when ability mod is below the spell level", () => {
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
    expect(bonusSpellsForLevel(2, 3)).toBe(0);
  });

  it("Int +3, spell level 1 → 1 bonus", () => {
    expect(bonusSpellsForLevel(3, 1)).toBe(1);
  });

  it("Int +5, spell level 1 → 2 bonuses", () => {
    expect(bonusSpellsForLevel(5, 1)).toBe(2);
  });

  it("Int +5, spell level 5 → 1 bonus (just qualifies)", () => {
    expect(bonusSpellsForLevel(5, 5)).toBe(1);
  });

  it("Int +1, spell level 1 → 1 bonus (minimum qualifying modifier)", () => {
    expect(bonusSpellsForLevel(1, 1)).toBe(1);
  });

  it("Int +0, spell level 1 → 0 (does not qualify)", () => {
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
  });
});

describe("casterModelFor()", () => {
  it("returns a prepared/int model for wizard", () => {
    const m = casterModelFor("wizard");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.knownLabel).toBe("Spellbook");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("returns undefined for an unregistered tag (e.g. monk)", () => {
    expect(casterModelFor("monk")).toBeUndefined();
  });
});

describe("casterModelFor() — cleric", () => {
  it("prepares from the full class list, not a curated known list", () => {
    const m = casterModelFor("cleric");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("wis");
    expect(m!.preparesFromClassList).toBe(true);
  });
});

describe("grantedCantrips()", () => {
  it("returns all wizard cantrips from the class spell list, sorted by name", () => {
    const list = grantedCantrips(ref, "wizard");
    expect(list.length).toBeGreaterThan(0);
    // Should be sorted
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.name.localeCompare(list[i]!.name)).toBeLessThanOrEqual(0);
    }
  });

  it("cantrip ids are the level-0 entries from spellLists", () => {
    const list = grantedCantrips(ref, "wizard");
    const expected = ref.spellLists["wizard"]![0]!;
    expect(list.map((c) => c.id).sort()).toEqual([...expected].sort());
  });

  it("returns empty array for a tag with no spell list", () => {
    expect(grantedCantrips(ref, "fighter")).toEqual([]);
  });
});

describe("casterModelFor() — sorcerer", () => {
  it("returns a spontaneous/cha model for sorcerer", () => {
    const m = casterModelFor("sorcerer");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("cha");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.knownProgression).toBe("sorcerer");
    expect(m!.preparesFromClassList).toBe(false);
  });
});

describe("casterModelFor() — arcanist (hybrid)", () => {
  it("returns a hybrid/int model with both a per-day and a prepared progression", () => {
    const m = casterModelFor("arcanist");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("hybrid");
    expect(m!.ability).toBe("int");
    expect(m!.progression).toBe("arcanist");
    expect(m!.preparedProgression).toBe("arcanist");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.preparesFromClassList).toBe(false);
  });
});

describe("preparedCapacityByLevel() — arcanist", () => {
  it("L4: 6 cantrips, 3 first-level, 1 second-level prepared", () => {
    const m = casterModelFor("arcanist")!;
    const limits = new Map(preparedCapacityByLevel(m, 4).map((l) => [l.level, l.limit]));
    expect(limits.get(0)).toBe(6);
    expect(limits.get(1)).toBe(3);
    expect(limits.get(2)).toBe(1);
    expect(limits.has(3)).toBe(false);
  });

  it("prepared cap is smaller than the per-day cast-slot total at the same level (the hybrid asymmetry)", () => {
    const m = casterModelFor("arcanist")!;
    const prepared = new Map(preparedCapacityByLevel(m, 4).map((l) => [l.level, l.limit]));
    const slots = new Map(spellSlotsByLevel(m, 4, 5).map((s) => [s.level, s.total]));
    expect(prepared.get(1)!).toBeLessThan(slots.get(1)!); // 3 prepared < 6 slots/day (Int 20)
    expect(prepared.get(2)!).toBeLessThan(slots.get(2)!); // 1 prepared < 3 slots/day (Int 20)
  });

  it("prepared capacity is NOT adjusted by ability score (no bonus column, unlike per-day slots)", () => {
    const m = casterModelFor("arcanist")!;
    // Same limit regardless of what abilityMod would be passed to a slots
    // helper — preparedCapacityByLevel takes no ability modifier at all.
    const a = preparedCapacityByLevel(m, 4);
    const b = preparedCapacityByLevel(m, 4);
    expect(a).toEqual(b);
  });

  it("returns empty array for a model with no preparedProgression (e.g. wizard)", () => {
    const m = casterModelFor("wizard")!;
    expect(preparedCapacityByLevel(m, 4)).toEqual([]);
  });
});

describe("spellSaveDC()", () => {
  it("level 3 spell, CHA +4 → DC 17", () => {
    expect(spellSaveDC(3, 4)).toBe(17);
  });

  it("level 0 cantrip, INT +3 → DC 13", () => {
    expect(spellSaveDC(0, 3)).toBe(13);
  });

  it("level 1, +0 modifier → DC 11", () => {
    expect(spellSaveDC(1, 0)).toBe(11);
  });
});

describe("concentrationDC()", () => {
  it("level 0 cantrip → 15", () => {
    expect(concentrationDC(0)).toBe(15);
  });

  it("level 3 → 21 (15 + 2*3)", () => {
    expect(concentrationDC(3)).toBe(21);
  });

  it("level 9 → 33 (15 + 18)", () => {
    expect(concentrationDC(9)).toBe(33);
  });
});

describe("accessibleSpellLevels()", () => {
  it("a level-1 cleric can access cantrips and level 1 only", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 1)).toEqual([0, 1]);
  });

  it("a level-3 cleric can access up to level 2", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 3)).toEqual([0, 1, 2]);
  });

  it("a level-17 cleric can access every level 0-9", () => {
    const cleric = casterModelFor("cleric")!;
    expect(accessibleSpellLevels(cleric, 17)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("matches the levels spellSlotsByLevel reports as accessible (ability mod 0)", () => {
    const cleric = casterModelFor("cleric")!;
    const fromSlots = spellSlotsByLevel(cleric, 5, 0).map((s) => s.level);
    expect(accessibleSpellLevels(cleric, 5)).toEqual(fromSlots);
  });
});

describe("spellsKnownLimitsByLevel()", () => {
  it("returns empty array for prepared caster (wizard)", () => {
    const wizModel = casterModelFor("wizard")!;
    expect(spellsKnownLimitsByLevel(wizModel, 5)).toEqual([]);
  });

  it("L1 sorcerer knows 2 first-level spells and no higher", () => {
    const sorcModel = casterModelFor("sorcerer")!;
    const limits = spellsKnownLimitsByLevel(sorcModel, 1);
    const l0 = limits.find((l) => l.level === 0);
    const l1 = limits.find((l) => l.level === 1);
    const l2 = limits.find((l) => l.level === 2);
    expect(l0).toBeDefined(); // 4 cantrips known
    expect(l0!.limit).toBe(4);
    expect(l1).toBeDefined();
    expect(l1!.limit).toBe(2);
    expect(l2).toBeUndefined(); // no 2nd-level access yet
  });

  it("L10 sorcerer can know up to 5 first-level and 4 second-level spells", () => {
    const sorcModel = casterModelFor("sorcerer")!;
    const limits = spellsKnownLimitsByLevel(sorcModel, 10);
    expect(limits.find((l) => l.level === 1)!.limit).toBe(5);
    expect(limits.find((l) => l.level === 2)!.limit).toBe(4);
  });
});

describe("bloodlineSpellsKnown()", () => {
  it("returns [] below sorcerer level 3 (Draconic's L1 spell unlocks at 3)", () => {
    expect(bloodlineSpellsKnown(ref, "Draconic", 1)).toEqual([]);
    expect(bloodlineSpellsKnown(ref, "Draconic", 2)).toEqual([]);
  });

  it("L3 sorcerer unlocks exactly the bloodline's 1st-level spell", () => {
    const spells = bloodlineSpellsKnown(ref, "Draconic", 3);
    expect(spells.length).toBe(1);
    expect(spells[0]!.level).toBe(1);
    expect(spells[0]!.name).toBe("Mage Armor");
  });

  it("L7 sorcerer unlocks bloodline spells of levels 1-3", () => {
    const spells = bloodlineSpellsKnown(ref, "Draconic", 7);
    expect(spells.map((s) => s.level).sort()).toEqual([1, 2, 3]);
  });

  it("returns [] for an unknown bloodline tag (soft fail, no throw)", () => {
    expect(bloodlineSpellsKnown(ref, "NotARealBloodline", 20)).toEqual([]);
  });

  it("returns [] when no bloodline is chosen (undefined tag)", () => {
    expect(bloodlineSpellsKnown(ref, undefined, 20)).toEqual([]);
  });
});

describe("casterModelFor() — magus", () => {
  it("returns a prepared/int model, its own progression, capped display shape mirrors wizard", () => {
    const m = casterModelFor("magus");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.progression).toBe("magus");
    expect(m!.knownLabel).toBe("Spellbook");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.preparesFromClassList).toBe(false);
  });
});

describe("casterModelFor() — oracle", () => {
  it("returns a spontaneous/cha model reusing the sorcerer progression tables", () => {
    const m = casterModelFor("oracle");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("cha");
    expect(m!.progression).toBe("sorcerer");
    expect(m!.knownProgression).toBe("sorcerer");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });
});

describe("casterModelFor() — witch", () => {
  it("returns a prepared/int model, own progression aliasing wizard's shape", () => {
    const m = casterModelFor("witch");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.progression).toBe("witch");
    expect(m!.knownLabel).toBe("Familiar's Spells");
    expect(m!.grantsAllCantrips).toBe(true);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("witch spells-per-day matches the wizard's numbers exactly (L1/L5/L10/L20)", () => {
    const m = casterModelFor("witch")!;
    const wiz = casterModelFor("wizard")!;
    for (const level of [1, 5, 10, 20]) {
      const witchSlots = new Map(spellSlotsByLevel(m, level, 0).map((s) => [s.level, s.base]));
      const wizSlots = new Map(spellSlotsByLevel(wiz, level, 0).map((s) => [s.level, s.base]));
      expect(witchSlots).toEqual(wizSlots);
    }
  });

  it("returns all witch cantrips from the class spell list", () => {
    const list = grantedCantrips(ref, "witch");
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("casterModelFor() — shaman", () => {
  it("prepares from the full class list, not a curated known list", () => {
    const m = casterModelFor("shaman");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("wis");
    expect(m!.progression).toBe("shaman");
    expect(m!.preparesFromClassList).toBe(true);
    expect(m!.grantsAllCantrips).toBe(true);
  });

  it("shaman spells-per-day matches the cleric's numbers exactly (L1/L5/L10/L20)", () => {
    const m = casterModelFor("shaman")!;
    const cleric = casterModelFor("cleric")!;
    for (const level of [1, 5, 10, 20]) {
      const shamanSlots = new Map(spellSlotsByLevel(m, level, 0).map((s) => [s.level, s.base]));
      const clericSlots = new Map(
        spellSlotsByLevel(cleric, level, 0).map((s) => [s.level, s.base]),
      );
      expect(shamanSlots).toEqual(clericSlots);
    }
  });

  it("returns all shaman cantrips from the class spell list", () => {
    const list = grantedCantrips(ref, "shaman");
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("mysterySpellsKnown()", () => {
  it("returns [] below oracle level 2 (a mystery's first bonus spell unlocks at 2)", () => {
    expect(mysterySpellsKnown(ref, "life", 1)).toEqual([]);
  });

  it("L2 oracle unlocks exactly the mystery's first bonus spell", () => {
    const spells = mysterySpellsKnown(ref, "life", 2);
    expect(spells.length).toBe(1);
    expect(spells[0]!.level).toBe(2);
    expect(spells[0]!.name).toBe("Detect Undead");
  });

  it("L9 oracle unlocks bonus spells granted at levels 2, 4, 6, and 8", () => {
    const spells = mysterySpellsKnown(ref, "life", 9);
    expect(spells.map((s) => s.level).sort((a, b) => a - b)).toEqual([2, 4, 6, 8]);
  });

  it("returns [] for an unknown mystery tag (soft fail, no throw)", () => {
    expect(mysterySpellsKnown(ref, "notARealMystery", 20)).toEqual([]);
  });

  it("returns [] when no mystery is chosen (undefined tag)", () => {
    expect(mysterySpellsKnown(ref, undefined, 20)).toEqual([]);
  });
});

describe("casterModelFor() — inquisitor, summoner, skald (spontaneous, bard-shaped tables)", () => {
  it("inquisitor: spontaneous/wis, own progression tag, cantrips not granted", () => {
    const m = casterModelFor("inquisitor");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("wis");
    expect(m!.progression).toBe("inquisitor");
    expect(m!.knownProgression).toBe("inquisitor");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("summoner: spontaneous/cha, own progression tag, cantrips not granted", () => {
    const m = casterModelFor("summoner");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("cha");
    expect(m!.progression).toBe("summoner");
    expect(m!.knownProgression).toBe("summoner");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("skald: spontaneous/cha, own progression tag, cantrips not granted", () => {
    const m = casterModelFor("skald");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("spontaneous");
    expect(m!.ability).toBe("cha");
    expect(m!.progression).toBe("skald");
    expect(m!.knownProgression).toBe("skald");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("L1 known-spells limits match bard's shape for all three (4 cantrips, 2 first-level)", () => {
    for (const tag of ["inquisitor", "summoner", "skald"]) {
      const m = casterModelFor(tag)!;
      const limits = spellsKnownLimitsByLevel(m, 1);
      expect(limits.find((l) => l.level === 0)!.limit).toBe(4);
      expect(limits.find((l) => l.level === 1)!.limit).toBe(2);
      expect(limits.find((l) => l.level === 2)).toBeUndefined();
    }
  });

  it("L10 per-day slots + known limits match bard's shape for all three", () => {
    for (const tag of ["inquisitor", "summoner", "skald"]) {
      const m = casterModelFor(tag)!;
      const slots = new Map(spellSlotsByLevel(m, 10, 0).map((s) => [s.level, s.base]));
      expect(slots.get(1)).toBe(5);
      expect(slots.get(2)).toBe(4);
      expect(slots.get(3)).toBe(3);
      expect(slots.get(4)).toBe(1);
      const limits = new Map(spellsKnownLimitsByLevel(m, 10).map((l) => [l.level, l.limit]));
      expect(limits.get(1)).toBe(5);
      expect(limits.get(2)).toBe(5);
      expect(limits.get(3)).toBe(4);
      expect(limits.get(4)).toBe(2);
    }
  });

  it("a high casting-ability score adds bonus per-day slots on top of the base table (Wis +3, L4 inquisitor)", () => {
    const m = casterModelFor("inquisitor")!;
    const slots = new Map(spellSlotsByLevel(m, 4, 3).map((s) => [s.level, s]));
    expect(slots.get(1)!.base).toBe(3);
    expect(slots.get(1)!.bonus).toBe(1); // floor((3-1)/4)+1 = 1
    expect(slots.get(1)!.total).toBe(4);
  });

  it("caps at 6th-level spells; level 0 is absent from accessibleSpellLevels (cantrips are known/cast-at-will, not a per-day slot, same as bard)", () => {
    for (const tag of ["inquisitor", "summoner", "skald"]) {
      const m = casterModelFor(tag)!;
      expect(accessibleSpellLevels(m, 20)).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });
});

describe("curseSpellsKnown()", () => {
  it("Haunted grants Mage Hand + Ghost Sound at 1st level", () => {
    const spells = curseSpellsKnown(ref, "haunted", 1);
    expect(spells.map((s) => s.name).sort()).toEqual(["Ghost Sound", "Mage Hand"]);
  });

  it("a curse with no bonus spells (Lame) returns []", () => {
    expect(curseSpellsKnown(ref, "lame", 20)).toEqual([]);
  });

  it("returns [] when no curse is chosen (undefined tag)", () => {
    expect(curseSpellsKnown(ref, undefined, 20)).toEqual([]);
  });
});

describe("casterModelFor() — alchemist and investigator (extract casters)", () => {
  it("alchemist: prepared/int model, own progression, no cantrips, own known list (Formula Book)", () => {
    const m = casterModelFor("alchemist");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.progression).toBe("alchemist");
    expect(m!.knownLabel).toBe("Formula Book");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("investigator: prepared/int model, aliases the alchemist progression table, no cantrips", () => {
    const m = casterModelFor("investigator");
    expect(m).toBeDefined();
    expect(m!.preparation).toBe("prepared");
    expect(m!.ability).toBe("int");
    expect(m!.progression).toBe("investigator");
    expect(m!.knownLabel).toBe("Formula Book");
    expect(m!.grantsAllCantrips).toBe(false);
    expect(m!.preparesFromClassList).toBe(false);
  });

  it("neither class ever gains a 0-level (cantrip) extract at any level, unlike wizard/cleric", () => {
    const alchemist = casterModelFor("alchemist")!;
    const investigator = casterModelFor("investigator")!;
    for (const level of [1, 4, 7, 10, 20]) {
      expect(accessibleSpellLevels(alchemist, level)).not.toContain(0);
      expect(accessibleSpellLevels(investigator, level)).not.toContain(0);
    }
  });

  it("accessible extract levels start at 1st (unlike paladin/ranger's 4th-level start)", () => {
    const alchemist = casterModelFor("alchemist")!;
    expect(accessibleSpellLevels(alchemist, 1)).toEqual([1]);
    expect(accessibleSpellLevels(alchemist, 4)).toEqual([1, 2]);
  });

  it("investigator's per-day slot counts match the alchemist's exactly (aliased progression)", () => {
    const alchemist = casterModelFor("alchemist")!;
    const investigator = casterModelFor("investigator")!;
    for (const level of [1, 4, 7, 10, 16, 20]) {
      expect(spellSlotsByLevel(investigator, level, 4)).toEqual(
        spellSlotsByLevel(alchemist, level, 4),
      );
    }
  });

  it("L7 alchemist with Int mod +4: base 4/3/1 at extract levels 1-3, plus bonus spells from the ability score", () => {
    const alchemist = casterModelFor("alchemist")!;
    const slots = new Map(spellSlotsByLevel(alchemist, 7, 4).map((s) => [s.level, s]));
    expect(slots.get(1)).toEqual({ level: 1, base: 4, bonus: 1, total: 5 }); // (4-1)/4+1 = 1
    expect(slots.get(2)).toEqual({ level: 2, base: 3, bonus: 1, total: 4 }); // (4-2)/4+1 = 1
    expect(slots.get(3)).toEqual({ level: 3, base: 1, bonus: 1, total: 2 }); // (4-3)/4+1 = 1
    expect(slots.has(4)).toBe(false); // not accessible yet at class level 7
  });
});
