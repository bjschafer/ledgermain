/**
 * Hand-computed fixture tests for the non-core races vendored from
 * `packs/races/other/` (issue #26). These exercise the same transform path
 * as the 7 core races but with content the core slice never touched: a
 * skill-tagged ability spread (Tiefling), a small-size race with a
 * `nac`/"base"-typed natural-armor change (Kobold), a non-30ft base land
 * speed (Oread), a race whose unmodeled racial trait (Drow Noble's scaling
 * spell resistance) must evaluate without throwing even though nothing in
 * the DerivedSheet surfaces it, and races that carry a `classSkills` grant
 * (issue #28) that the engine must union into the character's class-skill
 * set alongside the class-granted ones.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Fighter L1, all abilities at 10 (mod 0) before racial changes, no gear. */
function makeDoc(raceName: string, skillRanks: Record<string, number> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `race-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks,
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("vendored non-core race: Tiefling (ability mods + skill-tagged racial bonuses)", () => {
  const sheet = compute(makeDoc("Tiefling"), ref);

  it("Dex +2, Int +2, Cha -2 flow into ability totals", () => {
    expect(sheet.abilities.dex.total).toBe(12);
    expect(sheet.abilities.dex.mod).toBe(1);
    expect(sheet.abilities.int.total).toBe(12);
    expect(sheet.abilities.int.mod).toBe(1);
    expect(sheet.abilities.cha.total).toBe(8);
    expect(sheet.abilities.cha.mod).toBe(-1);
  });

  it("racial +2 to Bluff and Stealth apply even untrained (skill.blf / skill.ste)", () => {
    // total = ranks(0) + abilityMod(cha -1 for Bluff, dex +1 for Stealth) + racial(2)
    expect(sheet.skills.blf!.total).toBe(1);
    expect(sheet.skills.ste!.total).toBe(3);
  });

  it("medium size, 30ft land speed (no size or speed change)", () => {
    expect(sheet.speeds.land).toBe(30);
    expect(sheet.ac.components.find((c) => c.category === "size")).toBeUndefined();
  });
});

describe("vendored non-core race: Kobold (small size + natural-armor `nac`/base change)", () => {
  const sheet = compute(makeDoc("Kobold"), ref);

  it("Str -4, Con -2, Dex +2 flow into ability totals", () => {
    expect(sheet.abilities.str.total).toBe(6);
    expect(sheet.abilities.str.mod).toBe(-2);
    expect(sheet.abilities.con.total).toBe(8);
    expect(sheet.abilities.con.mod).toBe(-1);
    expect(sheet.abilities.dex.total).toBe(12);
    expect(sheet.abilities.dex.mod).toBe(1);
  });

  it("Small size gives +1 AC / +1 attack (SIZE_AC_MOD.sm = 1)", () => {
    const sizeComp = sheet.ac.components.find((c) => c.category === "size");
    expect(sizeComp?.value).toBe(1);
    expect(sheet.attack.melee.components.find((c) => c.source === "Size")?.value).toBe(1);
  });

  it("+1 natural armor (nac, type base) lands in the natural-armor AC category", () => {
    const natComp = sheet.ac.components.find((c) => c.category === "natural");
    expect(natComp?.value).toBe(1);
    expect(natComp?.applied).toBe(true);
  });

  it("AC total = base 10 + dex(1) + size(1) + natural(1) = 13; touch excludes natural, flat-footed excludes dex", () => {
    expect(sheet.ac.normal).toBe(13);
    expect(sheet.ac.touch).toBe(12);
    expect(sheet.ac.flatFooted).toBe(12);
  });

  it("melee attack = BAB(1) + str mod(-2) + size(1) = 0", () => {
    expect(sheet.attack.melee.total).toBe(0);
  });
});

describe("vendored non-core race: Oread (non-30ft base land speed)", () => {
  const sheet = compute(makeDoc("Oread"), ref);

  it("base land speed is 20ft, not the common 30ft default", () => {
    expect(sheet.speeds.land).toBe(20);
  });

  it("Str +2, Wis +2, Cha -2 flow into ability totals", () => {
    expect(sheet.abilities.str.total).toBe(12);
    expect(sheet.abilities.wis.total).toBe(12);
    expect(sheet.abilities.cha.total).toBe(8);
  });

  it("planetouched energy resistance 5/acid (SUPPLEMENTAL_RACE_ENERGY_RESISTANCE, prose-only upstream)", () => {
    expect(sheet.defenses?.resistances).toEqual([
      {
        total: 5,
        qualifier: "acid",
        components: [
          { source: "Oread", sourceId: raceId("Oread"), type: "untyped", value: 5, applied: true },
        ],
      },
    ]);
  });
});

describe("vendored non-core race: Aasimar / Tiefling planetouched energy resistances (all three elements each)", () => {
  it("Aasimar: eres 5 for acid/cold/electricity", () => {
    const sheet = compute(makeDoc("Aasimar"), ref);
    const qualifiers = sheet.defenses?.resistances.map((r) => r.qualifier).sort();
    expect(qualifiers).toEqual(["acid", "cold", "electricity"]);
    expect(sheet.defenses?.resistances.every((r) => r.total === 5)).toBe(true);
  });

  it("Tiefling: eres 5 for cold/electricity/fire", () => {
    const sheet = compute(makeDoc("Tiefling"), ref);
    const qualifiers = sheet.defenses?.resistances.map((r) => r.qualifier).sort();
    expect(qualifiers).toEqual(["cold", "electricity", "fire"]);
    expect(sheet.defenses?.resistances.every((r) => r.total === 5)).toBe(true);
  });
});

describe("vendored non-core race: Drow Noble (unmodeled scaling SR degrades gracefully)", () => {
  // Drow Noble carries a `{ target: "spellResist", operator: "set", formula:
  // "11 + @details.level.value" }` change — spell resistance the engine does
  // not surface anywhere in DerivedSheet. The formula must still evaluate
  // (no dice terms, just an @data path) without crashing compute(), and the
  // racial trait simply has no effect on the sheet beyond what IS modeled.
  it("compute() does not throw despite the unmodeled spellResist change", () => {
    expect(() => compute(makeDoc("Drow Noble"), ref)).not.toThrow();
  });

  const sheet = compute(makeDoc("Drow Noble"), ref);

  it("the modeled ability/skill changes alongside it still apply normally", () => {
    // Int +2, Cha +2, Con -2, Wis +2, Dex +4
    expect(sheet.abilities.int.total).toBe(12);
    expect(sheet.abilities.cha.total).toBe(12);
    expect(sheet.abilities.con.total).toBe(8);
    expect(sheet.abilities.wis.total).toBe(12);
    expect(sheet.abilities.dex.total).toBe(14);
  });
});

describe("race-granted class skills (issue #28)", () => {
  // Strix always treat Fly as a class skill (system.classSkills: ["fly"]).
  // Fighter's own classSkills list does NOT include Fly, so this is a grant
  // the class alone would never produce.
  it("Strix (race classSkills: fly) grants the +3 bonus once ranks are invested, Fighter has no Fly class-skill of its own", () => {
    const sheet = compute(makeDoc("Strix", { fly: 1 }), ref);
    expect(sheet.skills.fly!.classSkill).toBe(true);
    expect(sheet.skills.fly!.classSkillBonus).toBe(3);
  });

  it("without ranks invested, the race grant alone does not add the +3 (bonus requires ranks >= 1)", () => {
    const sheet = compute(makeDoc("Strix"), ref);
    expect(sheet.skills.fly!.classSkill).toBe(true);
    expect(sheet.skills.fly!.classSkillBonus).toBe(0);
  });

  it("Human (no race classSkills) leaves Fly as a non-class skill for a Fighter", () => {
    const sheet = compute(makeDoc("Human", { fly: 1 }), ref);
    expect(sheet.skills.fly!.classSkill).toBe(false);
    expect(sheet.skills.fly!.classSkillBonus).toBe(0);
  });

  it("Adaro (race classSkills: swm) overlapping Fighter's own Swim class-skill does not double the +3", () => {
    const sheet = compute(makeDoc("Adaro", { swm: 1 }), ref);
    expect(sheet.skills.swm!.classSkill).toBe(true);
    expect(sheet.skills.swm!.classSkillBonus).toBe(3);
  });
});
