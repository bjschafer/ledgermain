/**
 * Hand-authored prestige-class chassis (issue #66 chunks 1 + 4 — all ten CRB
 * prestige classes: Arcane Archer, Arcane Trickster, Assassin, Dragon
 * Disciple, Duelist, Eldritch Knight, Loremaster, Mystic Theurge, Pathfinder
 * Chronicler, Shadowdancer). Foundry's pf1 pack ships no prestige classes at
 * all, so unlike the rest of `refdata.test.ts` this isn't guarding a
 * transform of upstream data — it's a spot-check of the hand-authored
 * chassis in `src/supplements.ts` against the values verified there (Core
 * Rulebook, cross-checked against legacy.aonprd.com raw HTML, d20pfsrd.com,
 * and aonprd.com).
 */
import { describe, expect, it } from "bun:test";

import type { SaveTier } from "@pf1/schema";

import { loadRefData } from "../src/index.js";

const ref = loadRefData();

function classByName(name: string) {
  const cls = Object.values(ref.classes).find((c) => c.name === name);
  if (!cls) throw new Error(`class not found: ${name}`);
  return cls;
}

/**
 * Mirrors `saveForLevels` in `@pf1/engine` `tables.ts` exactly (see that
 * file's doc comment for the formulas' provenance). Duplicated here — rather
 * than imported — to avoid a `data-pipeline` -> `engine` dependency in the
 * wrong direction (`engine` already depends on `data-pipeline` for its own
 * test fixtures via `loadRefData()`).
 */
function saveForLevel(tier: SaveTier, level: number): number {
  switch (tier) {
    case "high":
      return 2 + Math.floor(level / 2);
    case "low":
      return Math.floor(level / 3);
    case "highPrestige":
      return Math.floor((level + 1) / 2);
    case "lowPrestige":
      return Math.floor((level + 1) / 3);
  }
}

const ALL_PRESTIGE = [
  "Arcane Archer",
  "Arcane Trickster",
  "Assassin",
  "Dragon Disciple",
  "Duelist",
  "Eldritch Knight",
  "Loremaster",
  "Mystic Theurge",
  "Pathfinder Chronicler",
  "Shadowdancer",
  "Student of War",
];

describe("Eldritch Knight (CRB, PZO1110)", () => {
  const ek = classByName("Eldritch Knight");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 2+Int skills", () => {
    expect(ek.hd).toBe(10);
    expect(ek.bab).toBe("high");
    expect(ek.armorProf).toEqual([]);
    expect(ek.weaponProf).toEqual([]);
    expect(ek.skillsPerLevel).toBe(2);
    expect(ek.subType).toBe("prestige");
    expect(ek.tag).toBe("eldritchKnight");
  });

  it("has a good (highPrestige) Fort save and poor (lowPrestige) Ref/Will", () => {
    expect(ek.saves).toEqual({ fort: "highPrestige", ref: "lowPrestige", will: "lowPrestige" });
    // Level 5: highPrestige Fort = floor((5+1)/2) = 3.
    expect(saveForLevel(ek.saves.fort, 5)).toBe(3);
  });

  it("advances one arcane casting slot starting at 2nd level (no 1st-level slot)", () => {
    expect(ek.castingAdvancement).toEqual([
      { kind: "arcane", levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("grants Diverse Training + Bonus Combat Feat at 1st and Spell Critical at 10th", () => {
    const byLevel = new Map(ek.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Diverse Training")).toBe(1);
    expect(byLevel.get("Bonus Combat Feat")).toBe(1);
    expect(byLevel.get("Spell Critical")).toBe(10);
  });

  it("has structured prereqs: caster level 3 arcane, plus the verbatim requirements line", () => {
    expect(ek.prereqs?.casting).toEqual([{ kind: "arcane", spellLevel: 3 }]);
    expect(ek.prereqs?.prereqText).toContain("3rd-level arcane spells");
  });
});

describe("Mystic Theurge (CRB, PZO1110)", () => {
  const mt = classByName("Mystic Theurge");

  it("has the published chassis: d6 HD, half BAB, no proficiencies, 2+Int skills", () => {
    expect(mt.hd).toBe(6);
    expect(mt.bab).toBe("low");
    expect(mt.armorProf).toEqual([]);
    expect(mt.weaponProf).toEqual([]);
    expect(mt.skillsPerLevel).toBe(2);
    expect(mt.subType).toBe("prestige");
    expect(mt.tag).toBe("mysticTheurge");
  });

  it("has a good (highPrestige) Will save and poor (lowPrestige) Fort/Ref", () => {
    expect(mt.saves).toEqual({ fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" });
    // Level 6: highPrestige Will = floor((6+1)/2) = 3.
    expect(saveForLevel(mt.saves.will, 6)).toBe(3);
  });

  it("advances two casting slots (arcane + divine), both starting at 1st level", () => {
    expect(mt.castingAdvancement).toEqual([
      { kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { kind: "divine", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("grants Combined Spells at 1st and Spell Synthesis at 10th", () => {
    const byLevel = new Map(mt.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Combined Spells")).toBe(1);
    expect(byLevel.get("Spell Synthesis")).toBe(10);
  });

  it("has structured prereqs: 3 ranks each Knowledge (arcana/religion), 2nd-level arcane+divine casting", () => {
    expect(mt.prereqs?.skillRanks).toEqual([
      { skill: "kar", ranks: 3 },
      { skill: "kre", ranks: 3 },
    ]);
    expect(mt.prereqs?.casting).toEqual([
      { kind: "arcane", spellLevel: 2 },
      { kind: "divine", spellLevel: 2 },
    ]);
  });
});

describe("Arcane Archer (CRB, PZO1110)", () => {
  const aa = classByName("Arcane Archer");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 4+Int skills", () => {
    expect(aa.hd).toBe(10);
    expect(aa.bab).toBe("high");
    expect(aa.armorProf).toEqual([]);
    expect(aa.weaponProf).toEqual([]);
    expect(aa.skillsPerLevel).toBe(4);
    expect(aa.subType).toBe("prestige");
  });

  it("has good (highPrestige) Fort/Ref and poor (lowPrestige) Will", () => {
    expect(aa.saves).toEqual({ fort: "highPrestige", ref: "highPrestige", will: "lowPrestige" });
    // Level 4: highPrestige Ref = floor((4+1)/2) = 2.
    expect(saveForLevel(aa.saves.ref, 4)).toBe(2);
  });

  it("advances one arcane casting slot, skipping 1st/5th/9th level", () => {
    expect(aa.castingAdvancement).toEqual([{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }]);
  });

  it("grants Arrow of Death at 10th level", () => {
    const byLevel = new Map(aa.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Enhance Arrows")).toBe(1);
    expect(byLevel.get("Arrow of Death")).toBe(10);
  });

  it("has structured prereqs: BAB 6, Point-Blank Shot + Precise Shot, 1st-level arcane casting", () => {
    expect(aa.prereqs?.bab).toBe(6);
    expect(aa.prereqs?.feats).toEqual(["Point-Blank Shot", "Precise Shot"]);
    expect(aa.prereqs?.casting).toEqual([{ kind: "arcane", spellLevel: 1 }]);
    expect(aa.prereqs?.prereqText).toContain("Weapon Focus (longbow or shortbow)");
  });
});

describe("Arcane Trickster (CRB, PZO1110)", () => {
  const at = classByName("Arcane Trickster");

  it("has the published chassis: d6 HD, half BAB, no proficiencies, 4+Int skills", () => {
    expect(at.hd).toBe(6);
    expect(at.bab).toBe("low");
    expect(at.armorProf).toEqual([]);
    expect(at.weaponProf).toEqual([]);
    expect(at.skillsPerLevel).toBe(4);
  });

  it("has good (highPrestige) Ref/Will and poor (lowPrestige) Fort", () => {
    expect(at.saves).toEqual({ fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" });
    // Level 7: lowPrestige Fort = floor((7+1)/3) = 2.
    expect(saveForLevel(at.saves.fort, 7)).toBe(2);
  });

  it("advances one arcane casting slot at every level, 1-10", () => {
    expect(at.castingAdvancement).toEqual([
      { kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("has structured prereqs: 4 ranks Disable Device/Escape Artist/Knowledge (arcana), 2nd-level arcane casting", () => {
    expect(at.prereqs?.skillRanks).toEqual([
      { skill: "dev", ranks: 4 },
      { skill: "esc", ranks: 4 },
      { skill: "kar", ranks: 4 },
    ]);
    expect(at.prereqs?.casting).toEqual([{ kind: "arcane", spellLevel: 2 }]);
  });
});

describe("Assassin (CRB, PZO1110)", () => {
  const asn = classByName("Assassin");

  it("has the published chassis: d8 HD, 3/4 (med) BAB, no proficiencies, 4+Int skills", () => {
    expect(asn.hd).toBe(8);
    expect(asn.bab).toBe("med");
    expect(asn.armorProf).toEqual([]);
    expect(asn.weaponProf).toEqual([]);
    expect(asn.skillsPerLevel).toBe(4);
  });

  it("has a good (highPrestige) Ref save and poor (lowPrestige) Fort/Will", () => {
    expect(asn.saves).toEqual({ fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" });
    // Level 9: lowPrestige Will = floor((9+1)/3) = 3.
    expect(saveForLevel(asn.saves.will, 9)).toBe(3);
  });

  it("has no casting advancement", () => {
    expect(asn.castingAdvancement).toBeUndefined();
  });

  it("grants Death Attack at 1st and Angel of Death at 10th", () => {
    const byLevel = new Map(asn.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Death Attack")).toBe(1);
    expect(byLevel.get("Angel of Death")).toBe(10);
  });

  it("has structured prereqs: 2 ranks Disguise, 5 ranks Stealth", () => {
    expect(asn.prereqs?.skillRanks).toEqual([
      { skill: "dis", ranks: 2 },
      { skill: "ste", ranks: 5 },
    ]);
    expect(asn.prereqs?.casting).toBeUndefined();
    expect(asn.prereqs?.prereqText).toContain("Any evil");
  });
});

describe("Dragon Disciple (CRB, PZO1110)", () => {
  const dd = classByName("Dragon Disciple");

  it("has the published chassis: d12 HD, 3/4 (med) BAB, no proficiencies, 2+Int skills", () => {
    expect(dd.hd).toBe(12);
    expect(dd.bab).toBe("med");
    expect(dd.armorProf).toEqual([]);
    expect(dd.weaponProf).toEqual([]);
    expect(dd.skillsPerLevel).toBe(2);
  });

  it("has good (highPrestige) Fort/Will and poor (lowPrestige) Ref", () => {
    expect(dd.saves).toEqual({ fort: "highPrestige", ref: "lowPrestige", will: "highPrestige" });
    // Level 8: highPrestige Fort = floor((8+1)/2) = 4.
    expect(saveForLevel(dd.saves.fort, 8)).toBe(4);
  });

  it("advances one arcane casting slot, skipping 1st/5th/9th level", () => {
    expect(dd.castingAdvancement).toEqual([{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }]);
  });

  it("grants Strength Increase TWICE (2nd and 4th level), each a +2 untyped change", () => {
    const strGrants = dd.features.filter((f) => f.name === "Strength Increase");
    expect(strGrants.map((f) => f.level)).toEqual([2, 4]);
    // Both grants resolve to the SAME underlying feature (one `changes`
    // array applied twice — see supplements.ts's chunk-4 doc comment).
    expect(new Set(strGrants.map((f) => f.featureId)).size).toBe(1);
    const feature = ref.classFeatures[strGrants[0]!.featureId];
    expect(feature?.changes).toEqual([{ formula: "2", target: "str", type: "untyped" }]);
  });

  it("grants Constitution Increase (+2 con, untyped) at 6th and Intelligence Increase (+2 int, untyped) at 8th", () => {
    const conGrant = dd.features.find((f) => f.name === "Constitution Increase");
    const intGrant = dd.features.find((f) => f.name === "Intelligence Increase");
    expect(conGrant?.level).toBe(6);
    expect(intGrant?.level).toBe(8);
    expect(ref.classFeatures[conGrant!.featureId]?.changes).toEqual([
      { formula: "2", target: "con", type: "untyped" },
    ]);
    expect(ref.classFeatures[intGrant!.featureId]?.changes).toEqual([
      { formula: "2", target: "int", type: "untyped" },
    ]);
  });

  it("has structured prereqs: 5 ranks Knowledge (arcana), 1st-level arcane casting", () => {
    expect(dd.prereqs?.skillRanks).toEqual([{ skill: "kar", ranks: 5 }]);
    expect(dd.prereqs?.casting).toEqual([{ kind: "arcane", spellLevel: 1 }]);
    expect(dd.prereqs?.prereqText).toContain("draconic bloodline");
  });
});

describe("Duelist (CRB, PZO1110)", () => {
  const duelist = classByName("Duelist");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 4+Int skills", () => {
    expect(duelist.hd).toBe(10);
    expect(duelist.bab).toBe("high");
    expect(duelist.armorProf).toEqual([]);
    expect(duelist.weaponProf).toEqual([]);
    expect(duelist.skillsPerLevel).toBe(4);
  });

  it("has a good (highPrestige) Ref save and poor (lowPrestige) Fort/Will", () => {
    expect(duelist.saves).toEqual({
      fort: "lowPrestige",
      ref: "highPrestige",
      will: "lowPrestige",
    });
    // Level 10: highPrestige Ref = floor((10+1)/2) = 5.
    expect(saveForLevel(duelist.saves.ref, 10)).toBe(5);
  });

  it("has no casting advancement", () => {
    expect(duelist.castingAdvancement).toBeUndefined();
  });

  it("grants Crippling Critical at 10th level", () => {
    const byLevel = new Map(duelist.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Crippling Critical")).toBe(10);
  });

  it("has structured prereqs: BAB 6, Dodge/Mobility/Weapon Finesse, 2 ranks Acrobatics/Perform", () => {
    expect(duelist.prereqs?.bab).toBe(6);
    expect(duelist.prereqs?.feats).toEqual(["Dodge", "Mobility", "Weapon Finesse"]);
    expect(duelist.prereqs?.skillRanks).toEqual([
      { skill: "acr", ranks: 2 },
      { skill: "prf", ranks: 2 },
    ]);
  });
});

describe("Loremaster (CRB, PZO1110)", () => {
  const lm = classByName("Loremaster");

  it("has the published chassis: d6 HD, half BAB, no proficiencies, 4+Int skills", () => {
    expect(lm.hd).toBe(6);
    expect(lm.bab).toBe("low");
    expect(lm.armorProf).toEqual([]);
    expect(lm.weaponProf).toEqual([]);
    expect(lm.skillsPerLevel).toBe(4);
  });

  it("has a good (highPrestige) Will save and poor (lowPrestige) Fort/Ref", () => {
    expect(lm.saves).toEqual({ fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" });
    // Level 3: highPrestige Will = floor((3+1)/2) = 2.
    expect(saveForLevel(lm.saves.will, 3)).toBe(2);
  });

  it("advances one 'any' casting slot at every level, 1-10 (no arcane/divine restriction)", () => {
    expect(lm.castingAdvancement).toEqual([
      { kind: "any", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("has no structured prereqs beyond the verbatim text (every requirement is an OR/count/parametrized clause)", () => {
    expect(lm.prereqs?.bab).toBeUndefined();
    expect(lm.prereqs?.feats).toBeUndefined();
    expect(lm.prereqs?.skillRanks).toBeUndefined();
    expect(lm.prereqs?.casting).toBeUndefined();
    expect(lm.prereqs?.prereqText).toContain("Knowledge (any two) 7 ranks");
  });
});

describe("Pathfinder Chronicler (CRB, PZO1110)", () => {
  const pc = classByName("Pathfinder Chronicler");

  it("has the published chassis: d8 HD, 3/4 (med) BAB, no proficiencies, 8+Int skills", () => {
    expect(pc.hd).toBe(8);
    expect(pc.bab).toBe("med");
    expect(pc.armorProf).toEqual([]);
    expect(pc.weaponProf).toEqual([]);
    expect(pc.skillsPerLevel).toBe(8);
  });

  it("has good (highPrestige) Ref/Will and poor (lowPrestige) Fort", () => {
    expect(pc.saves).toEqual({ fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" });
    // Level 2: highPrestige Will = floor((2+1)/2) = 1.
    expect(saveForLevel(pc.saves.will, 2)).toBe(1);
  });

  it("has no casting advancement", () => {
    expect(pc.castingAdvancement).toBeUndefined();
  });

  it("grants Bardic Knowledge (disambiguated) at 1st and Lay of the Exalted Dead at 10th", () => {
    const byLevel = new Map(pc.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Bardic Knowledge (Pathfinder Chronicler)")).toBe(1);
    expect(byLevel.get("Lay of the Exalted Dead")).toBe(10);
  });

  it("has structured prereqs: 3 ranks Linguistics only (Perform/Profession subskills stay prose-only)", () => {
    expect(pc.prereqs?.skillRanks).toEqual([{ skill: "lin", ranks: 3 }]);
    expect(pc.prereqs?.prereqText).toContain("Perform (oratory) 5 ranks");
  });
});

describe("Shadowdancer (CRB, PZO1110)", () => {
  const sd = classByName("Shadowdancer");

  it("has the published chassis: d8 HD, 3/4 (med) BAB, no proficiencies, 6+Int skills", () => {
    expect(sd.hd).toBe(8);
    expect(sd.bab).toBe("med");
    expect(sd.armorProf).toEqual([]);
    expect(sd.weaponProf).toEqual([]);
    expect(sd.skillsPerLevel).toBe(6);
  });

  it("has a good (highPrestige) Ref save and poor (lowPrestige) Fort/Will", () => {
    expect(sd.saves).toEqual({ fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" });
    // Level 1: lowPrestige Fort = floor((1+1)/3) = 0.
    expect(saveForLevel(sd.saves.fort, 1)).toBe(0);
  });

  it("has no casting advancement", () => {
    expect(sd.castingAdvancement).toBeUndefined();
  });

  it("grants Hide in Plain Sight (disambiguated) at 1st and Shadow Master at 10th", () => {
    const byLevel = new Map(sd.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Hide in Plain Sight (Shadowdancer)")).toBe(1);
    expect(byLevel.get("Shadow Master")).toBe(10);
  });

  it("has structured prereqs: Combat Reflexes/Dodge/Mobility, 5 ranks Stealth (Perform subskill stays prose-only)", () => {
    expect(sd.prereqs?.feats).toEqual(["Combat Reflexes", "Dodge", "Mobility"]);
    expect(sd.prereqs?.skillRanks).toEqual([{ skill: "ste", ranks: 5 }]);
    expect(sd.prereqs?.prereqText).toContain("Perform (dance) 2 ranks");
  });
});

describe("Student of War (Adventurer's Guide, PZO1138)", () => {
  const sow = classByName("Student of War");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 6+Int skills", () => {
    expect(sow.hd).toBe(10);
    expect(sow.bab).toBe("high");
    expect(sow.armorProf).toEqual([]);
    expect(sow.weaponProf).toEqual([]);
    expect(sow.skillsPerLevel).toBe(6);
  });

  it("has a good (highPrestige) Will save and poor (lowPrestige) Fort/Ref", () => {
    expect(sow.saves).toEqual({ fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" });
    // The published table, level by level: Fort/Ref 0,1,1,1,2,2,2,3,3,3 and
    // Will 1,1,2,2,3,3,4,4,5,5.
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(levels.map((l) => saveForLevel(sow.saves.fort, l))).toEqual([
      0, 1, 1, 1, 2, 2, 2, 3, 3, 3,
    ]);
    expect(levels.map((l) => saveForLevel(sow.saves.will, l))).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });

  it("has no casting advancement", () => {
    expect(sow.castingAdvancement).toBeUndefined();
  });

  it("treats all ten Knowledge skills as class skills", () => {
    for (const k of ["kar", "kdu", "ken", "kge", "khi", "klo", "kna", "kno", "kpl", "kre"]) {
      expect(sow.classSkills, k).toContain(k);
    }
  });

  it("grants its features at the published levels", () => {
    const byLevel = new Map(sow.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Additional Skill")).toBe(1);
    expect(byLevel.get("Know Your Enemy")).toBe(1);
    expect(byLevel.get("Mind Over Metal")).toBe(2);
    expect(byLevel.get("Bonus Combat Feat (SOW)")).toBe(2);
    expect(byLevel.get("Anticipate")).toBe(3);
    expect(byLevel.get("Telling Blow")).toBe(6);
    expect(byLevel.get("Nemesis")).toBe(9);
    expect(byLevel.get("Deadly Blow")).toBe(10);
  });

  it("grants real bonus feat slots: 1/2/3 at levels 2/5/8", () => {
    const feature = ref.classFeatures["prestige:student-of-war:bonus-combat-feat"];
    const change = feature?.changes?.find((c) => c.target === "bonusFeats");
    expect(change?.formula).toBe("floor((@class.unlevel + 1) / 3)");
    const at = (level: number) => Math.floor((level + 1) / 3);
    expect([1, 2, 4, 5, 7, 8, 10].map(at)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("has structured prereqs: BAB +5 and two named feats (the rest stay prose-only)", () => {
    expect(sow.prereqs?.bab).toBe(5);
    expect(sow.prereqs?.feats).toEqual(["Combat Expertise", "Dodge"]);
    // Parametrized/OR requirements are advisory per the hybrid prereq model.
    expect(sow.prereqs?.skillRanks).toBeUndefined();
    expect(sow.prereqs?.prereqText).toContain("Skill Focus (any one Knowledge skill)");
    expect(sow.prereqs?.prereqText).toContain("Knowledge (any two) 4 ranks in each");
    expect(sow.prereqs?.prereqText).toContain("proficient with two martial weapons");
  });

  it("is sourced to the Adventurer's Guide, not the CRB", () => {
    expect(sow.sources?.[0]?.id).toBe("PZO1138");
    expect(ref.classFeatures["prestige:student-of-war:mind-over-metal"]?.sources?.[0]?.id).toBe(
      "PZO1138",
    );
  });
});

describe("prestige class feature resolution (all eleven)", () => {
  it("every ClassFeatureGrant on every prestige class resolves to an existing classFeature id", () => {
    for (const name of ALL_PRESTIGE) {
      const cls = classByName(name);
      for (const grant of cls.features) {
        expect(grant.resolved, `${name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId]?.name, `${name}: ${grant.name}`).toBe(grant.name);
      }
    }
  });

  it("no prestige class collides with a vendored (or sibling) class id/uuid/tag/name", () => {
    const prestige = ALL_PRESTIGE.map(classByName);
    for (const cls of prestige) {
      const others = Object.values(ref.classes).filter((c) => c !== cls);
      for (const other of others) {
        expect(other.id).not.toBe(cls.id);
        expect(other.uuid).not.toBe(cls.uuid);
        expect(other.tag).not.toBe(cls.tag);
        expect(other.name).not.toBe(cls.name);
      }
    }
  });

  it("every prestige class has a subType of 'prestige' and a non-empty prereqText", () => {
    for (const name of ALL_PRESTIGE) {
      const cls = classByName(name);
      expect(cls.subType, name).toBe("prestige");
      expect(cls.prereqs?.prereqText, name).toBeTruthy();
    }
  });
});
