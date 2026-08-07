/**
 * Unit tests for `model/skillBreakdown.ts` — the synthesized provenance list
 * that lets a skill row expand the same way AC/saves/attacks already do.
 */
import { describe, expect, it } from "bun:test";

import type { DerivedSkill } from "@pf1/schema";

import { skillBreakdownComponents } from "../src/model/skillBreakdown.js";

function makeSkill(over: Partial<DerivedSkill> = {}): DerivedSkill {
  return {
    id: "ste",
    ability: "dex",
    ranks: 0,
    abilityMod: 0,
    classSkillBonus: 0,
    acp: 0,
    miscMod: 0,
    total: 0,
    classSkill: false,
    components: [],
    trainedOnly: false,
    usable: true,
    ...over,
  };
}

describe("skillBreakdownComponents", () => {
  it("always includes ranks and ability mod, naming the ability", () => {
    const skill = makeSkill({ ranks: 4, ability: "dex", abilityMod: 3 });
    const components = skillBreakdownComponents(skill);
    expect(components).toContainEqual({
      source: "Ranks",
      type: "ranks",
      value: 4,
      applied: true,
    });
    expect(components).toContainEqual({
      source: "Ability (DEX)",
      type: "ability",
      value: 3,
      applied: true,
    });
  });

  it("includes a class skill row (even pre-rank, +0) when classSkill is true", () => {
    const skill = makeSkill({ classSkill: true, classSkillBonus: 0, ranks: 0 });
    const components = skillBreakdownComponents(skill);
    expect(components).toContainEqual({
      source: "Class skill",
      type: "class",
      value: 0,
      applied: true,
    });
  });

  it("shows the class skill +3 once ranked", () => {
    const skill = makeSkill({ classSkill: true, classSkillBonus: 3, ranks: 1 });
    const components = skillBreakdownComponents(skill);
    expect(components).toContainEqual({
      source: "Class skill",
      type: "class",
      value: 3,
      applied: true,
    });
  });

  it("omits the class skill row entirely for a non-class skill", () => {
    const skill = makeSkill({ classSkill: false });
    const components = skillBreakdownComponents(skill);
    expect(components.some((c) => c.source === "Class skill")).toBe(false);
  });

  it("omits the armor check penalty row when acp is 0", () => {
    const skill = makeSkill({ acp: 0 });
    const components = skillBreakdownComponents(skill);
    expect(components.some((c) => c.source === "Armor check penalty")).toBe(false);
  });

  it("includes the armor check penalty row when nonzero", () => {
    const skill = makeSkill({ acp: -4 });
    const components = skillBreakdownComponents(skill);
    expect(components).toContainEqual({
      source: "Armor check penalty",
      type: "acp",
      value: -4,
      applied: true,
    });
  });

  it("appends misc modifier components verbatim, including struck-through overrides", () => {
    const skill = makeSkill({
      components: [
        { source: "Cloak of Elvenkind", type: "circumstance", value: 5, applied: true },
        { source: "Aura of Cowardice (overridden)", type: "morale", value: -2, applied: false },
      ],
    });
    const components = skillBreakdownComponents(skill);
    expect(components).toContainEqual({
      source: "Cloak of Elvenkind",
      type: "circumstance",
      value: 5,
      applied: true,
    });
    expect(components).toContainEqual({
      source: "Aura of Cowardice (overridden)",
      type: "morale",
      value: -2,
      applied: false,
    });
  });

  it("puts ranks and ability first, then class skill, then acp, then misc", () => {
    const skill = makeSkill({
      ranks: 2,
      classSkill: true,
      classSkillBonus: 3,
      acp: -2,
      components: [{ source: "Feat", type: "untyped", value: 2, applied: true }],
    });
    const sources = skillBreakdownComponents(skill).map((c) => c.source);
    expect(sources).toEqual([
      "Ranks",
      "Ability (DEX)",
      "Class skill",
      "Armor check penalty",
      "Feat",
    ]);
  });
});
