import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  evaluatePrereqs,
  unqualifiedSelectedFeats,
  type PrereqContext,
} from "../src/model/prereqs.js";

const ref = loadRefData();

function featByName(name: string) {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[1];
}

/** A baseline context: strong abilities, BAB 1, no feats selected. */
function ctx(over: Partial<PrereqContext> = {}): PrereqContext {
  return {
    abilityTotals: { str: 16, dex: 16, con: 14, int: 16, wis: 12, cha: 10 },
    bab: 1,
    casterLevel: 0,
    characterLevel: 1,
    selectedFeats: new Set<string>(),
    refData: ref,
    ...over,
  };
}

describe("feat prereq gating", () => {
  it("BLOCKS a feat whose structured prerequisite (a required feat) is unmet", () => {
    // Cleave requires Power Attack (a structured @UUID feat prereq) + Str 13 + BAB 1.
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(cleave, ctx()); // Power Attack not selected
    expect(res.blocked).toBe(true);
    const powerAttackCheck = res.checks.find((c) => c.label === "Power Attack");
    expect(powerAttackCheck?.met).toBe(false);
  });

  it("ALLOWS a feat once every structured prerequisite is met", () => {
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(cleave, ctx({ selectedFeats: new Set([powerAttack.id]) }));
    expect(res.blocked).toBe(false);
    expect(res.checks.every((c) => c.met)).toBe(true);
  });

  it("issue #49: suppresses the prose warning once every fragment is covered by a MET structured check", () => {
    // Cleave's prereqText is "Str 13, Power Attack, base attack bonus +1." —
    // every fragment maps 1:1 to a structured check (ability, feat, BAB).
    // Once all three are met, the redundant prose warning should disappear
    // entirely rather than sit next to three ✓ checks looking contradictory.
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(cleave, ctx({ selectedFeats: new Set([powerAttack.id]) }));
    expect(res.blocked).toBe(false);
    expect(res.checks.length).toBeGreaterThan(0);
    expect(res.checks.every((c) => c.met)).toBe(true);
    expect(res.softText).toBeUndefined();
    expect(res.warn).toBe(false);
  });

  it("issue #49: Dodge shows a ✓ Dex 13 check with NO redundant 'Dex 13' prose warning once met", () => {
    // Reproduces the reported bug verbatim: Dodge's prereqText is "Dex 13."
    // and its only structured prereq is the same Dex 13 ability minimum.
    const dodge = featByName("Dodge");
    const res = evaluatePrereqs(dodge, ctx()); // baseline ctx has dex 16
    expect(res.checks).toEqual([{ label: "DEX 13", met: true }]);
    expect(res.softText).toBeUndefined();
    expect(res.warn).toBe(false);
  });

  it("issue #49: Dodge KEEPS the prose warning when Dex 13 is unmet (✗ and prose agree)", () => {
    const dodge = featByName("Dodge");
    const res = evaluatePrereqs(
      dodge,
      ctx({ abilityTotals: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }),
    );
    expect(res.checks).toEqual([{ label: "DEX 13", met: false }]);
    expect(res.blocked).toBe(true);
    // blocked=true already forces warn=false regardless of softText — the
    // "Locked" button + ✗ check is the signal, not a soft warning.
    expect(res.softText).toBe("Dex 13.");
  });

  it("issue #49: Mobility strips BOTH covered fragments (Dex 13 ability + Dodge feat) once met", () => {
    const dodge = featByName("Dodge");
    const mobility = featByName("Mobility");
    const res = evaluatePrereqs(mobility, ctx({ selectedFeats: new Set([dodge.id]) }));
    expect(res.checks.every((c) => c.met)).toBe(true);
    expect(res.softText).toBeUndefined();
    expect(res.warn).toBe(false);
  });

  it("issue #49: Improved Critical keeps the UNRECOGNIZED 'Proficient with weapon' fragment but drops the covered BAB +8 one", () => {
    // prereqText is "Proficient with weapon, base attack bonus +8." — only the
    // BAB fragment maps to a structured signal; "Proficient with weapon" has
    // no structured equivalent anywhere and must never be silently dropped.
    const improvedCritical = featByName("Improved Critical");
    const res = evaluatePrereqs(improvedCritical, ctx({ bab: 8 }));
    expect(res.checks).toEqual([{ label: "BAB +8", met: true }]);
    expect(res.softText).toBe("Proficient with weapon.");
    expect(res.warn).toBe(true);
  });

  it("BLOCKS on an unmet ability minimum", () => {
    const powerAttack = featByName("Power Attack"); // needs Str 13
    const res = evaluatePrereqs(
      powerAttack,
      ctx({ abilityTotals: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 10 } }),
    );
    expect(res.blocked).toBe(true);
    expect(res.checks.find((c) => c.label.startsWith("STR"))?.met).toBe(false);
  });

  it("WARNS (but does not block) when prereqs are only free text", () => {
    // Mounted Combat's only prereq ("Ride 1 rank") is prose — no structured signals.
    const mounted = featByName("Mounted Combat");
    const res = evaluatePrereqs(mounted, ctx());
    expect(res.blocked).toBe(false);
    expect(res.warn).toBe(true);
    expect(res.checks).toHaveLength(0);
    expect(res.softText).toBeTruthy();
  });
});

describe("issue #108: character level + plain-text feat-name prereqs", () => {
  it("BLOCKS a feat on an unmet character-level minimum", () => {
    // Inner Breath: "Character level 11th, sylph." -- character level is the
    // feat's only structured signal (sylph is a race, stays prose).
    const innerBreath = featByName("Inner Breath");
    const res = evaluatePrereqs(innerBreath, ctx({ characterLevel: 5 }));
    expect(res.blocked).toBe(true);
    expect(res.checks).toEqual([{ label: "Character level 11", met: false }]);
  });

  it("ALLOWS a feat once character level is met, and drops the now-redundant prose warning", () => {
    const innerBreath = featByName("Inner Breath");
    const res = evaluatePrereqs(innerBreath, ctx({ characterLevel: 11 }));
    expect(res.blocked).toBe(false);
    expect(res.checks).toEqual([{ label: "Character level 11", met: true }]);
    // "sylph" has no structured equivalent, so the soft warning survives.
    expect(res.softText).toBe("sylph.");
    expect(res.warn).toBe(true);
  });

  it("Restorative Vigor: ability + plain-text feat name + character level all structure together", () => {
    // prereqText is "Con 15, Combat Vigor, character level 8th." -- "Combat
    // Vigor" is matched by NAME (not a `@UUID` link) via the data-pipeline's
    // resolveNamedFeatPrereqs post-pass.
    const combatVigor = featByName("Combat Vigor");
    const restorativeVigor = featByName("Restorative Vigor");
    const res = evaluatePrereqs(
      restorativeVigor,
      ctx({
        abilityTotals: { str: 10, dex: 10, con: 15, int: 10, wis: 10, cha: 10 },
        characterLevel: 8,
        selectedFeats: new Set([combatVigor.id]),
      }),
    );
    expect(res.blocked).toBe(false);
    expect(res.checks.every((c) => c.met)).toBe(true);
    expect(res.checks).toHaveLength(3);
    // Every prereqText fragment maps to a met structured check -- no residual
    // soft warning.
    expect(res.softText).toBeUndefined();
    expect(res.warn).toBe(false);
  });

  it("Restorative Vigor BLOCKS when the by-name-matched feat (Combat Vigor) isn't selected", () => {
    const restorativeVigor = featByName("Restorative Vigor");
    const res = evaluatePrereqs(
      restorativeVigor,
      ctx({
        abilityTotals: { str: 10, dex: 10, con: 15, int: 10, wis: 10, cha: 10 },
        characterLevel: 8,
      }),
    );
    expect(res.blocked).toBe(true);
    const combatVigorCheck = res.checks.find((c) => c.label === "Combat Vigor");
    expect(combatVigorCheck?.met).toBe(false);
  });
});

describe("issue #108: 'or'-joined @UUID feat refs (featsAnyOf)", () => {
  it("Improvised Weapon Mastery: ALLOWS with only Catch Off-Guard selected (not Throw Anything)", () => {
    const catchOffGuard = featByName("Catch Off-Guard");
    const mastery = featByName("Improvised Weapon Mastery");
    const res = evaluatePrereqs(
      mastery,
      ctx({ bab: 8, selectedFeats: new Set([catchOffGuard.id]) }),
    );
    expect(res.blocked).toBe(false);
    expect(res.checks.every((c) => c.met)).toBe(true);
  });

  it("Improvised Weapon Mastery: ALLOWS with only Throw Anything selected (the other branch)", () => {
    const throwAnything = featByName("Throw Anything");
    const mastery = featByName("Improvised Weapon Mastery");
    const res = evaluatePrereqs(
      mastery,
      ctx({ bab: 8, selectedFeats: new Set([throwAnything.id]) }),
    );
    expect(res.blocked).toBe(false);
  });

  it("Improvised Weapon Mastery: BLOCKS with neither Catch Off-Guard nor Throw Anything selected", () => {
    const mastery = featByName("Improvised Weapon Mastery");
    const res = evaluatePrereqs(mastery, ctx({ bab: 8 }));
    expect(res.blocked).toBe(true);
    const group = res.checks.find((c) => c.label.includes("Catch Off-Guard"));
    expect(group?.met).toBe(false);
  });

  it("Aligned Crafting: ALLOWS with only Craft Wondrous Item selected (not Craft Magic Arms and Armor)", () => {
    const craftWondrousItem = featByName("Craft Wondrous Item");
    const alignedCrafting = featByName("Aligned Crafting");
    const res = evaluatePrereqs(
      alignedCrafting,
      ctx({ selectedFeats: new Set([craftWondrousItem.id]) }),
    );
    expect(res.blocked).toBe(false);
  });

  it("Aligned Crafting: BLOCKS with neither crafting feat selected", () => {
    const alignedCrafting = featByName("Aligned Crafting");
    const res = evaluatePrereqs(alignedCrafting, ctx());
    expect(res.blocked).toBe(true);
  });

  it("negative: an 'and'-joined @UUID feat pair stays all-required (Cleave still needs Power Attack)", () => {
    // Cleave's structured prereq is a flat AND (Power Attack + Str 13 + BAB
    // 1), not an alternative — confirms the fix didn't loosen a genuine AND.
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(cleave, ctx()); // Power Attack not selected
    expect(res.blocked).toBe(true);
  });
});

describe("unqualifiedSelectedFeats() — issue #9 (retained feat whose prereq was removed)", () => {
  it("flags a selected feat once its required feat is no longer selected", () => {
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    // Cleave was added while Power Attack was selected; Power Attack was then
    // removed — Cleave stays in build.feats, but its structured prereq is
    // unmet again.
    const context = ctx({ selectedFeats: new Set() }); // Power Attack no longer selected
    expect(unqualifiedSelectedFeats([cleave.id], context)).toEqual([cleave.id]);
    // Power Attack itself (Str 13, met by the baseline ctx()) is still fine —
    // only the dependent (Cleave) is flagged.
    expect(unqualifiedSelectedFeats([powerAttack.id, cleave.id], context)).toEqual([cleave.id]);
  });

  it("does not flag a feat whose prereqs are still met", () => {
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    const context = ctx({ selectedFeats: new Set([powerAttack.id]) });
    expect(unqualifiedSelectedFeats([cleave.id], context)).toEqual([]);
  });

  it("does not flag a feat with only prose prereqs (never structurally blocked)", () => {
    const mounted = featByName("Mounted Combat");
    expect(unqualifiedSelectedFeats([mounted.id], ctx())).toEqual([]);
  });

  it("respects the ranger combat-style bypass — a waived feat is never flagged", () => {
    // Cleave's prereqs (Power Attack, Str 13, BAB +1) are unmet, but bypassed
    // via the combat-style slug set — same waiver evaluatePrereqs applies.
    const cleave = featByName("Cleave");
    const context = ctx({
      selectedFeats: new Set(),
      bypassBlockedSlugs: new Set(["cleave"]),
    });
    expect(unqualifiedSelectedFeats([cleave.id], context)).toEqual([]);
  });

  it("ignores an id with no matching feat in RefData", () => {
    expect(unqualifiedSelectedFeats(["not-a-real-feat-id"], ctx())).toEqual([]);
  });
});
