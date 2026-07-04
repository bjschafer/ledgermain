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

  it("WARNS even when structured checks are all met, as long as prereqText exists", () => {
    // Cleave has fully-structured prereqs (Str 13, Power Attack, BAB +1), all met
    // here, but it also carries verbatim prereqText — the advisory should still
    // surface (blocked, driven only by structured checks, stays false).
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(cleave, ctx({ selectedFeats: new Set([powerAttack.id]) }));
    expect(res.blocked).toBe(false);
    expect(res.checks.length).toBeGreaterThan(0);
    expect(res.checks.every((c) => c.met)).toBe(true);
    expect(res.softText).toBeTruthy();
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
