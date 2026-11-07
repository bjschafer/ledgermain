import { describe, expect, it } from "bun:test";

import type { DerivedSkill } from "@pf1/schema";

import { createEmptyDoc, setFoldUntrainedSkills } from "../src/model/doc.js";
import { sheetSkillView, skillMatchesQuery } from "../src/model/sheetSkills.js";

function skill(id: string, ranks: number, usable = true): DerivedSkill {
  return {
    id,
    ability: "int",
    ranks,
    abilityMod: 0,
    classSkillBonus: 0,
    acp: 0,
    miscMod: 0,
    total: ranks,
    classSkill: false,
    components: [],
    trainedOnly: !usable,
    usable,
  };
}

const SKILLS = [
  skill("per", 4),
  skill("clm", 0),
  skill("kpl", 2),
  skill("kar", 0, false),
  skill("dip", 0),
];

const names = (v: { shown: DerivedSkill[] }) => v.shown.map((s) => s.id);

describe("sheetSkillView", () => {
  it("lists every usable skill alphabetically when not folding", () => {
    const v = sheetSkillView(SKILLS, { query: "", foldUntrained: false, showUntrained: false });
    expect(names(v)).toEqual(["clm", "dip", "kpl", "per"]);
    expect(v.foldedCount).toBe(0);
  });

  it("folds 0-rank skills and counts them", () => {
    const v = sheetSkillView(SKILLS, { query: "", foldUntrained: true, showUntrained: false });
    expect(names(v)).toEqual(["kpl", "per"]);
    expect(v.foldedCount).toBe(2);
  });

  it("shows everything once the fold is opened", () => {
    const v = sheetSkillView(SKILLS, { query: "", foldUntrained: true, showUntrained: true });
    expect(names(v)).toHaveLength(4);
    expect(v.foldedCount).toBe(0);
  });

  it("a query searches folded skills too, but never unusable ones", () => {
    const v = sheetSkillView(SKILLS, { query: "dip", foldUntrained: true, showUntrained: false });
    expect(names(v)).toEqual(["dip"]);
    expect(
      names(
        sheetSkillView(SKILLS, { query: "arcana", foldUntrained: false, showUntrained: false }),
      ),
    ).toEqual([]);
  });

  it("a blank query is no filter", () => {
    const v = sheetSkillView(SKILLS, { query: "   ", foldUntrained: true, showUntrained: false });
    expect(v.foldedCount).toBe(2);
  });
});

describe("skillMatchesQuery", () => {
  it("matches every word anywhere in the name, ignoring case", () => {
    expect(skillMatchesQuery(skill("kpl", 1), "know PLA")).toBe(true);
    expect(skillMatchesQuery(skill("kpl", 1), "planes know")).toBe(true);
    expect(skillMatchesQuery(skill("kpl", 1), "know arc")).toBe(false);
  });
});

describe("setFoldUntrainedSkills", () => {
  it("stores the preference on the character", () => {
    const d = setFoldUntrainedSkills(createEmptyDoc("t"), true);
    expect(d.build.settings?.foldUntrainedSkills).toBe(true);
  });
});
