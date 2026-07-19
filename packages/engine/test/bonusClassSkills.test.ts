/**
 * Player-chosen bonus class skills — `bonus-class-skills.ts` (issue #93).
 *
 * Two layers, mirroring `abilitySubstitution.test.ts`:
 *   1. `collectBonusClassSkillGrants` / `chosenBonusClassSkills` directly,
 *      including the level-down truncation that makes stored picks safe to
 *      keep.
 *   2. Student of War's Additional Skill end-to-end through `compute()`, with
 *      the +3 hand-computed off the real vendored data.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  BONUS_CLASS_SKILL_GRANTS,
  chosenBonusClassSkills,
  collectBonusClassSkillGrants,
  compute,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  skillRanks?: Record<string, number>;
  bonusClassSkills?: Record<string, string[]>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: { str: 14, dex: 12, con: 12, int: 14, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(over.bonusClassSkills ? { bonusClassSkills: over.bonusClassSkills } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/* --------------------------------------------- collectBonusClassSkillGrants */

describe("collectBonusClassSkillGrants", () => {
  it("finds nothing for a character with no granting feature", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 10 }] });
    expect(collectBonusClassSkillGrants(doc, ref)).toEqual([]);
  });

  it("grants Additional Skill picks on the 1st/3rd/5th/7th/9th progression", () => {
    // floor((level + 1) / 2): 1 pick at SoW 1-2, 2 at 3-4, ..., 5 at 9-10.
    const expected = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    expected.forEach((slots, i) => {
      const doc = makeDoc({
        classes: [
          { tag: "fighter", level: 5 },
          { tag: "studentOfWar", level: i + 1 },
        ],
      });
      const grants = collectBonusClassSkillGrants(doc, ref);
      expect(grants).toHaveLength(1);
      expect(grants[0]!.key).toBe("additional-skill");
      expect(grants[0]!.source).toBe("Additional Skill");
      expect(grants[0]!.slots).toBe(slots);
    });
  });

  it("counts the GRANTING class's level, not total character level", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 12 },
        { tag: "studentOfWar", level: 1 },
      ],
    });
    expect(collectBonusClassSkillGrants(doc, ref)[0]!.slots).toBe(1);
  });

  it("respects a synthetic registry", () => {
    // Fighter's Weapon Training arrives at 5th level.
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 5 }] });
    const registry = { "weapon-training": { picks: "2" } };
    const grants = collectBonusClassSkillGrants(doc, ref, registry);
    expect(grants.map((g) => [g.key, g.slots])).toEqual([["weapon-training", 2]]);
  });
});

/* ------------------------------------------------- chosenBonusClassSkills */

describe("chosenBonusClassSkills", () => {
  const sowClasses = [
    { tag: "fighter", level: 5 },
    { tag: "studentOfWar", level: 9 },
  ];

  it("is empty when nothing has been picked", () => {
    expect(chosenBonusClassSkills(makeDoc({ classes: sowClasses }), ref).size).toBe(0);
  });

  it("returns the picks a character is entitled to", () => {
    const doc = makeDoc({
      classes: sowClasses,
      bonusClassSkills: { "additional-skill": ["dip", "ste", "umd"] },
    });
    expect([...chosenBonusClassSkills(doc, ref)].sort()).toEqual(["dip", "ste", "umd"]);
  });

  it("truncates to the entitlement after a level-down, without destroying picks", () => {
    const picks = { "additional-skill": ["dip", "ste", "umd", "fly", "acr"] };
    const low = makeDoc({
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level: 3 },
      ],
      bonusClassSkills: picks,
    });
    // SoW 3 = 2 slots, so only the first two picks count...
    expect([...chosenBonusClassSkills(low, ref)].sort()).toEqual(["dip", "ste"]);
    // ...and the stored array is untouched, so levelling back up restores them.
    expect(low.build.bonusClassSkills?.["additional-skill"]).toHaveLength(5);
  });

  it("ignores empty slots and picks under a key with no active grant", () => {
    const doc = makeDoc({
      classes: sowClasses,
      bonusClassSkills: { "additional-skill": ["dip", "", "umd"], "not-a-feature": ["ste"] },
    });
    expect([...chosenBonusClassSkills(doc, ref)].sort()).toEqual(["dip", "umd"]);
  });
});

/* ------------------------------------------------------------- end-to-end */

describe("bonus class skills through compute()", () => {
  it("makes a chosen skill a class skill, granting the +3 once ranked", () => {
    // Use Magic Device is not a fighter or Student of War class skill, and
    // isn't on the Human racial list — so the only way it can be one here is
    // the pick. Int 14 (+2), 1 rank.
    const classes = [
      { tag: "fighter", level: 5 },
      { tag: "studentOfWar", level: 1 },
    ];
    const without = compute(makeDoc({ classes, skillRanks: { umd: 1 } }), ref);
    expect(without.skills.umd!.classSkill).toBe(false);
    expect(without.skills.umd!.classSkillBonus).toBe(0);

    const withPick = compute(
      makeDoc({
        classes,
        skillRanks: { umd: 1 },
        bonusClassSkills: { "additional-skill": ["umd"] },
      }),
      ref,
    );
    expect(withPick.skills.umd!.classSkill).toBe(true);
    expect(withPick.skills.umd!.classSkillBonus).toBe(3);
    expect(withPick.skills.umd!.total).toBe(without.skills.umd!.total + 3);
  });

  it("grants no +3 without a rank, same as any other class skill", () => {
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "fighter", level: 5 },
          { tag: "studentOfWar", level: 1 },
        ],
        bonusClassSkills: { "additional-skill": ["umd"] },
      }),
      ref,
    );
    expect(sheet.skills.umd!.classSkill).toBe(true);
    expect(sheet.skills.umd!.classSkillBonus).toBe(0);
  });

  it("a pick beyond the entitlement does not apply", () => {
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "fighter", level: 5 },
          { tag: "studentOfWar", level: 1 },
        ],
        skillRanks: { umd: 1, ste: 1 },
        bonusClassSkills: { "additional-skill": ["umd", "ste"] },
      }),
      ref,
    );
    expect(sheet.skills.umd!.classSkill).toBe(true);
    expect(sheet.skills.ste!.classSkill).toBe(false);
  });
});

describe("BONUS_CLASS_SKILL_GRANTS", () => {
  it("keys match a real feature name slug", () => {
    // The registry is keyed by name slug, so a renamed feature silently stops
    // granting picks — assert the link the way the ability-substitution test
    // does for Mind Over Metal.
    const names = new Set(Object.values(ref.classFeatures).map((f) => f.name));
    expect(Object.keys(BONUS_CLASS_SKILL_GRANTS)).toContain("additional-skill");
    expect(names).toContain("Additional Skill");
  });
});
