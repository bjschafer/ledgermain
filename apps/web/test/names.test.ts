/**
 * Unit tests for `changeTargetLabel()`, the shared humanizer for raw
 * `Change`/`ContextNote` target strings (issue: copy & readability audit).
 * Covers the flat vocabulary in `packages/engine/src/targets.ts` plus the
 * prefixed forms (`skill.`, `attack.weapon.`, `damage.weapon.`, `dr.`,
 * `eres.`) and the unmapped-target fallback.
 */
import { describe, expect, it } from "bun:test";

import { changeTargetLabel } from "../src/model/names.js";

describe("changeTargetLabel()", () => {
  it("humanizes abilities", () => {
    expect(changeTargetLabel("str")).toBe("Strength");
    expect(changeTargetLabel("cha")).toBe("Charisma");
  });

  it("humanizes saves", () => {
    expect(changeTargetLabel("fort")).toBe("Fortitude");
    expect(changeTargetLabel("ref")).toBe("Reflex");
    expect(changeTargetLabel("will")).toBe("Will");
    expect(changeTargetLabel("allSavingThrows")).toBe("all saving throws");
  });

  it("humanizes AC variants", () => {
    expect(changeTargetLabel("ac")).toBe("AC");
    expect(changeTargetLabel("aac")).toBe("AC (armor)");
    expect(changeTargetLabel("sac")).toBe("AC (shield)");
    expect(changeTargetLabel("nac")).toBe("AC (natural)");
  });

  it("humanizes attack/damage variants", () => {
    expect(changeTargetLabel("tattack")).toBe("touch attack rolls");
    expect(changeTargetLabel("mattack")).toBe("melee attack rolls");
    expect(changeTargetLabel("rattack")).toBe("ranged attack rolls");
    expect(changeTargetLabel("nattack")).toBe("natural attack rolls");
    expect(changeTargetLabel("twdamage")).toBe("thrown weapon damage");
  });

  it("humanizes skill.<id> composites via skillName", () => {
    expect(changeTargetLabel("skill.per")).toBe("Perception");
    expect(changeTargetLabel("skill.kre")).toBe("Knowledge (religion)");
    expect(changeTargetLabel("skill.crf.alchemy")).toBe("Craft (Alchemy)");
  });

  it("humanizes weapon-group attack/damage composites", () => {
    expect(changeTargetLabel("attack.weapon.blades-light")).toBe(
      "Blades Light weapon attack rolls",
    );
    expect(changeTargetLabel("damage.weapon.bows")).toBe("Bows weapon damage");
  });

  it("humanizes DR-bypass and energy-resistance composites", () => {
    expect(changeTargetLabel("dr.magic")).toBe("DR (bypassed by magic)");
    expect(changeTargetLabel("dr.coldIron")).toBe("DR (bypassed by cold iron)");
    expect(changeTargetLabel("eres.fire")).toBe("fire resistance");
  });

  it("humanizes ability-check/skill/penalty composites", () => {
    expect(changeTargetLabel("strChecks")).toBe("Str-based ability checks");
    expect(changeTargetLabel("chaSkills")).toBe("Cha-based skill checks");
    expect(changeTargetLabel("dexPen")).toBe("Dexterity penalties");
  });

  it("falls back to the raw target string when unmapped", () => {
    expect(changeTargetLabel("someUnknownTarget")).toBe("someUnknownTarget");
  });
});
