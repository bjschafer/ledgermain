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
    // Thrown weapon attack rolls (NOT touch attacks — see computeWeaponAttacks
    // in compute.ts). Applied conditionally per-weapon (ranged + tagged
    // "thrown"), but that condition lives in compute.ts, not here — this
    // module only tracks whether the target is EVER consumed.
    "tattack",
    // Natural attack rolls/damage — derivePcNaturalAttacks (the PC's own
    // body) and computePolymorphAttacks (an active polymorph form).
    "nattack",
    "ndamage",
  ])("treats %s as applied", (target) => {
    expect(isTargetApplied(target)).toBe(true);
  });

  it.each(["allChecks"])("treats %s as unapplied", (target) => {
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

  it("Accurate Stance has no unapplied changes now that tattack feeds thrown weapon attacks", () => {
    // This is the buff at the center of the bug report: its mattack/tattack
    // pair used to show "tattack" as an unapplied touch-attack target, which
    // was doubly wrong (mislabeled, and the target is consumed after all).
    const buff = buffByName("Accurate Stance");
    expect(unappliedChanges(buff.changes)).toEqual([]);
  });
});
