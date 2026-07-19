/**
 * Unit tests for `model/bonusClassSkills.ts` (issue #93 — player-chosen bonus
 * class skills). The entitlement/truncation half lives in the engine
 * (`bonusClassSkills.test.ts` there); this covers the builder's side: the
 * slot-indexed setter and the "already a class skill" / stale-pick advice.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  existingClassSkills,
  isExistingClassSkill,
  setBonusClassSkill,
  staleBonusClassSkillPicks,
} from "../src/model/bonusClassSkills.js";
import { createEmptyDoc } from "../src/model/doc.js";

const ref = loadRefData();
const KEY = "additional-skill";

function doc() {
  return createEmptyDoc("t");
}

/** A Student of War with a fighter base, at the given SoW level. */
function studentOfWar(level: number) {
  const d = doc();
  return {
    ...d,
    identity: {
      ...d.identity,
      classes: [
        { tag: "fighter", level: 5 },
        { tag: "studentOfWar", level },
      ],
    },
  };
}

describe("setBonusClassSkill()", () => {
  it("sets slot 0", () => {
    expect(setBonusClassSkill(doc(), KEY, 0, "umd").build.bonusClassSkills).toEqual({
      [KEY]: ["umd"],
    });
  });

  it("sets a later slot, filling earlier ones with empty placeholders", () => {
    expect(setBonusClassSkill(doc(), KEY, 2, "umd").build.bonusClassSkills).toEqual({
      [KEY]: ["", "", "umd"],
    });
  });

  it("clearing the last pick drops the key, and the last key drops the field", () => {
    const withPick = setBonusClassSkill(doc(), KEY, 0, "umd");
    expect(setBonusClassSkill(withPick, KEY, 0, null).build.bonusClassSkills).toBeUndefined();
  });

  it("clearing a middle slot keeps later slots at their index", () => {
    let d = setBonusClassSkill(doc(), KEY, 0, "umd");
    d = setBonusClassSkill(d, KEY, 1, "ste");
    expect(setBonusClassSkill(d, KEY, 0, null).build.bonusClassSkills).toEqual({
      [KEY]: ["", "ste"],
    });
  });

  it("keeps other granting features' picks independent", () => {
    let d = setBonusClassSkill(doc(), KEY, 0, "umd");
    d = setBonusClassSkill(d, "other-feature", 0, "ste");
    expect(d.build.bonusClassSkills).toEqual({ [KEY]: ["umd"], "other-feature": ["ste"] });
  });

  it("negative slotIndex is a no-op", () => {
    expect(setBonusClassSkill(doc(), KEY, -1, "umd").build.bonusClassSkills).toBeUndefined();
  });

  it("trims whitespace", () => {
    expect(setBonusClassSkill(doc(), KEY, 0, "  umd  ").build.bonusClassSkills).toEqual({
      [KEY]: ["umd"],
    });
  });
});

describe("existingClassSkills()", () => {
  it("unions the character's classes' class skills", () => {
    const existing = existingClassSkills(studentOfWar(1), ref);
    // Climb is a fighter class skill; Use Magic Device is on neither list.
    expect(existing.has("clm")).toBe(true);
    expect(existing.has("umd")).toBe(false);
  });

  it("resolves a parameterized instance through its base id", () => {
    const existing = existingClassSkills(studentOfWar(1), ref);
    expect(existing.has("crf")).toBe(true);
    expect(isExistingClassSkill(existing, "crf.alchemy")).toBe(true);
    expect(isExistingClassSkill(existing, "umd")).toBe(false);
  });
});

describe("staleBonusClassSkillPicks()", () => {
  function withPicks(level: number, picks: string[]) {
    const d = studentOfWar(level);
    return { ...d, build: { ...d.build, bonusClassSkills: { [KEY]: picks } } };
  }

  it("is empty for distinct, non-class-skill picks", () => {
    expect(staleBonusClassSkillPicks(withPicks(3, ["umd", "ste"]), ref)).toEqual([]);
  });

  it("flags a pick that is already a class skill from another source", () => {
    const stale = staleBonusClassSkillPicks(withPicks(1, ["clm"]), ref);
    expect(stale).toEqual([{ key: KEY, slotIndex: 0, skillId: "clm", reason: "already" }]);
  });

  it("flags a duplicate pick, blaming the later slot", () => {
    const stale = staleBonusClassSkillPicks(withPicks(3, ["umd", "umd"]), ref);
    expect(stale).toEqual([{ key: KEY, slotIndex: 1, skillId: "umd", reason: "duplicate" }]);
  });

  it("ignores picks past the entitlement — those aren't applying anyway", () => {
    // SoW 1 = 1 slot, so the invalid second pick isn't the player's problem yet.
    expect(staleBonusClassSkillPicks(withPicks(1, ["umd", "umd"]), ref)).toEqual([]);
  });
});
