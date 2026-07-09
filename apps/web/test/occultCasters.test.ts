/**
 * Occult Adventures caster wiring (17-class expansion follow-up wave):
 * psychic + medium caster models and — the known per-class gotcha — the
 * FULL_CASTER_TAGS regression (a prior class shipped with the Sheet header
 * showing CL 0 because casterLevel.ts wasn't updated; see
 * lyle.integration.test.ts's arcanist regression note). Kineticist casts no
 * spells and must stay out of every caster surface.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { casterLevel, casterLevelForClass, isCasterTag } from "../src/model/casterLevel.js";
import {
  casterModelFor,
  disciplineSpellsKnown,
  spellSlotsByLevel,
  spellsKnownLimitsByLevel,
} from "../src/model/spellcasting.js";

const ref = loadRefData();

function docWith(classes: { tag: string; level: number }[]): CharacterDoc {
  return { identity: { name: "", race: "", classes } } as unknown as CharacterDoc;
}

describe("psychic caster level (FULL_CASTER_TAGS regression)", () => {
  it("CL = class level at 1st, 7th, and 20th (never 0)", () => {
    expect(casterLevelForClass("psychic", 1)).toBe(1);
    expect(casterLevelForClass("psychic", 7)).toBe(7);
    expect(casterLevelForClass("psychic", 20)).toBe(20);
    expect(casterLevel(docWith([{ tag: "psychic", level: 7 }]))).toBe(7);
    expect(isCasterTag("psychic")).toBe(true);
  });

  it("medium is level-gated (issue #65), NOT in the flat full-caster set; kineticist never casts at all", () => {
    // Medium casts nothing before 4th level — a flat classLevel would wrongly
    // report CL 1-3 pre-#65 (the bloodrager posture, see casterLevel.ts).
    // Since #65, medium is a `LEVEL_GATED_CASTER_TAGS` entry: CL 0 below the
    // gate, CL = classLevel from the gate on (still never a plain
    // `FULL_CASTER_TAGS` member — the binary switch would still be wrong
    // below 4th level). Kineticist never casts at all, at any level.
    expect(casterLevelForClass("medium", 1)).toBe(0);
    expect(casterLevelForClass("medium", 3)).toBe(0);
    expect(casterLevelForClass("medium", 4)).toBe(4);
    expect(casterLevelForClass("medium", 10)).toBe(10);
    expect(casterLevelForClass("kineticist", 10)).toBe(0);
    expect(isCasterTag("medium")).toBe(true);
    expect(isCasterTag("kineticist")).toBe(false);
  });
});

describe("CASTER_MODELS: psychic", () => {
  const model = casterModelFor("psychic")!;

  it("is a spontaneous int-based caster reusing the sorcerer known table", () => {
    expect(model).toBeDefined();
    expect(model.preparation).toBe("spontaneous");
    expect(model.ability).toBe("int");
    expect(model.knownProgression).toBe("sorcerer");
    expect(model.grantsAllCantrips).toBe(false);
    expect(model.preparesFromClassList).toBe(false);
  });

  it("slots match the sorcerer shape: L4 psychic Int +4 → 6+1 first-level, 3+1 second-level", () => {
    const slots = spellSlotsByLevel(model, 4, 4);
    const byLevel = new Map(slots.map((s) => [s.level, s]));
    expect(byLevel.get(1)!.base).toBe(6);
    expect(byLevel.get(1)!.total).toBe(7);
    expect(byLevel.get(2)!.base).toBe(3);
    expect(byLevel.get(2)!.total).toBe(4);
    expect(byLevel.has(0)).toBe(false); // knacks cast at will, no slot column
  });

  it("spells-known caps at L1: 4 knacks + 2 first-level (sorcerer table)", () => {
    const limits = new Map(spellsKnownLimitsByLevel(model, 1).map((l) => [l.level, l.limit]));
    expect(limits.get(0)).toBe(4);
    expect(limits.get(1)).toBe(2);
  });
});

describe("CASTER_MODELS: medium (slots vs. Table: Medium at 1/5/10/20)", () => {
  const model = casterModelFor("medium")!;

  it("is a spontaneous cha-based 4-level caster with its own tables", () => {
    expect(model).toBeDefined();
    expect(model.preparation).toBe("spontaneous");
    expect(model.ability).toBe("cha");
    expect(model.progression).toBe("medium");
    expect(model.knownProgression).toBe("medium");
  });

  it("L1: no slots at all (late start)", () => {
    expect(spellSlotsByLevel(model, 1, 3)).toEqual([]);
  });

  it("L5 Cha +3: 1 base + 1 bonus first-level slot, nothing higher", () => {
    const slots = spellSlotsByLevel(model, 5, 3);
    expect(slots).toEqual([{ level: 1, base: 1, bonus: 1, total: 2 }]);
  });

  it("L10 Cha +3: 2/1/1 base across levels 1-3", () => {
    const byLevel = new Map(spellSlotsByLevel(model, 10, 3).map((s) => [s.level, s.base]));
    expect(byLevel.get(1)).toBe(2);
    expect(byLevel.get(2)).toBe(1);
    expect(byLevel.get(3)).toBe(1);
    expect(byLevel.has(4)).toBe(false);
  });

  it("L20 Cha +3: 4/4/3/2 base across levels 1-4", () => {
    const byLevel = new Map(spellSlotsByLevel(model, 20, 3).map((s) => [s.level, s.base]));
    expect(byLevel.get(1)).toBe(4);
    expect(byLevel.get(2)).toBe(4);
    expect(byLevel.get(3)).toBe(3);
    expect(byLevel.get(4)).toBe(2);
  });
});

describe("kineticist has no caster model", () => {
  it("casterModelFor('kineticist') is undefined and there is no vendored spell list", () => {
    expect(casterModelFor("kineticist")).toBeUndefined();
    expect(ref.spellLists["kineticist"]).toBeUndefined();
  });
});

describe("disciplineSpellsKnown() (against the real vendored data slice)", () => {
  it("faith psychic 5: Bless (Lv1) + Spiritual Weapon (Lv4), sorted by name", () => {
    const spells = disciplineSpellsKnown(ref, "faith", 5);
    expect(spells.map((s) => s.name)).toEqual(["Bless", "Spiritual Weapon"]);
    expect(spells.map((s) => s.level)).toEqual([1, 4]);
  });

  it("faith psychic 1: just the 1st-level Bless (cadence starts at 1, not 2)", () => {
    expect(disciplineSpellsKnown(ref, "faith", 1).map((s) => s.name)).toEqual(["Bless"]);
  });

  it("psychic 20 has all 9 discipline bonus spells, every id resolving in refData.spells", () => {
    const spells = disciplineSpellsKnown(ref, "abomination", 20);
    expect(spells).toHaveLength(9);
    for (const sp of spells) {
      expect(ref.spells[sp.id]).toBeDefined();
      expect(ref.spells[sp.id]!.name).toBe(sp.name);
    }
  });

  it("no/unknown discipline tag or zero psychic levels → empty", () => {
    expect(disciplineSpellsKnown(ref, undefined, 10)).toEqual([]);
    expect(disciplineSpellsKnown(ref, "notARealDiscipline", 10)).toEqual([]);
    expect(disciplineSpellsKnown(ref, "faith", 0)).toEqual([]);
  });
});
