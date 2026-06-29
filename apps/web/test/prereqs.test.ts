import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluatePrereqs, type PrereqContext } from "../src/model/prereqs.js";

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

  it("ALLOWS a feat once every structured prerequisite is met (no warning)", () => {
    const powerAttack = featByName("Power Attack");
    const cleave = featByName("Cleave");
    const res = evaluatePrereqs(
      cleave,
      ctx({ selectedFeats: new Set([powerAttack.id]) }),
    );
    expect(res.blocked).toBe(false);
    expect(res.warn).toBe(false);
    expect(res.checks.every((c) => c.met)).toBe(true);
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
