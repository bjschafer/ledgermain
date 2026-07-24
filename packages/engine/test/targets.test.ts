import { describe, expect, it } from "bun:test";

import type { Change } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { isTargetApplied, unappliedChanges } from "../src/index.js";

describe("isTargetApplied", () => {
  it.each([
    "attack",
    "skill.per",
    "attack.weapon.longsword",
    "landSpeed",
    "size",
    "str",
    "bonusFeats",
    "spellResist",
    "dr",
    "dr.magic",
    "eres.fire",
    "carryStr",
    "carryMult",
    "sensedv",
    "sensell",
    "sensesc",
  ])("treats %s as applied", (target) => {
    expect(isTargetApplied(target)).toBe(true);
  });

  it.each(["nattack", "allChecks"])("treats %s as unapplied", (target) => {
    expect(isTargetApplied(target)).toBe(false);
  });
});

describe("unappliedChanges", () => {
  it("filters a mixed list down to only the unapplied changes", () => {
    const changes: Change[] = [
      { formula: "1", target: "attack", type: "untyped" },
      { formula: "2", target: "spellResist", type: "untyped" },
      { formula: "skill.per", target: "skill.per", type: "untyped" },
      { formula: "3", target: "reach", type: "untyped" },
    ];

    expect(unappliedChanges(changes)).toEqual([{ formula: "3", target: "reach", type: "untyped" }]);
  });
});

describe("real refdata buffs", () => {
  const ref = loadRefData();

  function buffByName(name: string) {
    const entry = Object.values(ref.buffs).find((b) => b.name === name);
    if (!entry) throw new Error(`buff not found: ${name}`);
    return entry;
  }

  it("Divine Favor has no unapplied changes (attack/wdamage are both applied)", () => {
    const buff = buffByName("Divine Favor");
    expect(unappliedChanges(buff.changes)).toEqual([]);
  });

  it("Spell Resistance has no unapplied changes now that spellResist feeds the defenses line", () => {
    const buff = buffByName("Spell Resistance");
    expect(unappliedChanges(buff.changes)).toEqual([]);
  });

  it("Ant Haul has no unapplied changes now that carryMult feeds carrying capacity", () => {
    const buff = buffByName("Ant Haul");
    expect(unappliedChanges(buff.changes)).toEqual([]);
  });

  it("Enlarge Person has no unapplied changes now that carryStr/carryMult are consumed", () => {
    const buff = buffByName("Enlarge Person");
    expect(unappliedChanges(buff.changes)).toEqual([]);
  });
});
