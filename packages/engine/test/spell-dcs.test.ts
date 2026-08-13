import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, isTargetApplied } from "../src/index.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Minimal wizard doc; abilities all 10 (no modifiers to muddy DC math). */
function makeDoc(over: {
  feats?: string[];
  featChoices?: Record<string, string>;
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level: 5 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      extraFeats: over.extraFeats,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// ─── Spell Focus family → DerivedSheet.spellDCs ─────────────────────────────

describe("spell save DC bonuses (spellDC targets)", () => {
  it("omits spellDCs entirely when nothing targets it", () => {
    const sheet = compute(makeDoc({}), ref);
    expect(sheet.spellDCs).toBeUndefined();
    expect(sheet.clChecks).toBeUndefined();
  });

  it("Spell Focus (evocation): +1 to evocation only (CRB p. 134)", () => {
    const sf = featId("Spell Focus");
    const sheet = compute(makeDoc({ feats: [sf], featChoices: { [sf]: "evocation" } }), ref);
    expect(sheet.spellDCs).toBeDefined();
    expect(sheet.spellDCs!.all).toBe(0);
    expect(sheet.spellDCs!.schools).toHaveLength(1);
    const evo = sheet.spellDCs!.schools[0]!;
    expect(evo.key).toBe("evocation");
    expect(evo.tag).toBe("evo");
    expect(evo.label).toBe("Evocation");
    expect(evo.bonus).toBe(1);
    expect(evo.components.some((c) => c.source === "Spell Focus" && c.applied)).toBe(true);
  });

  it("Spell Focus + Greater Spell Focus (evocation) stack to +2 (CRB p. 125: 'This bonus stacks')", () => {
    const sf = featId("Spell Focus");
    const gsf = featId("Greater Spell Focus");
    const sheet = compute(
      makeDoc({ feats: [sf, gsf], featChoices: { [sf]: "evocation", [gsf]: "evocation" } }),
      ref,
    );
    expect(sheet.spellDCs!.schools).toHaveLength(1);
    expect(sheet.spellDCs!.schools[0]!.bonus).toBe(2);
  });

  it("Spell Focus taken twice (extraFeats) covers two schools at +1 each", () => {
    const sf = featId("Spell Focus");
    const sheet = compute(
      makeDoc({
        feats: [sf],
        featChoices: { [sf]: "evocation" },
        extraFeats: [{ instanceId: "i2", featId: sf, choiceId: "necromancy" }],
      }),
      ref,
    );
    const byKey = new Map(sheet.spellDCs!.schools.map((s) => [s.key, s.bonus]));
    expect(byKey.get("evocation")).toBe(1);
    expect(byKey.get("necromancy")).toBe(1);
    expect(byKey.size).toBe(2);
  });

  it("emits nothing while the school choice is unmade", () => {
    const sf = featId("Spell Focus");
    const sheet = compute(makeDoc({ feats: [sf] }), ref);
    expect(sheet.spellDCs).toBeUndefined();
  });
});

// ─── Spell Penetration family → DerivedSheet.clChecks ───────────────────────

describe("caster level check bonuses (clCheck targets)", () => {
  it("Spell Penetration: +2 on CL checks vs SR, no dispel entry (CRB p. 134)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Spell Penetration")] }), ref);
    expect(sheet.clChecks).toBeDefined();
    expect(sheet.clChecks!.sr!.bonus).toBe(2);
    expect(sheet.clChecks!.sr!.components.some((c) => c.source === "Spell Penetration")).toBe(true);
    expect(sheet.clChecks!.dispel).toBeUndefined();
  });

  it("Spell Penetration + Greater stack to +4 (CRB p. 125: 'stacks with the one from Spell Penetration')", () => {
    const sheet = compute(
      makeDoc({ feats: [featId("Spell Penetration"), featId("Greater Spell Penetration")] }),
      ref,
    );
    expect(sheet.clChecks!.sr!.bonus).toBe(4);
  });
});

// ─── Target registry ─────────────────────────────────────────────────────────

describe("targets.ts registration", () => {
  it("applies the new targets; caster level itself stays unapplied", () => {
    expect(isTargetApplied("spellDC")).toBe(true);
    expect(isTargetApplied("spellDC.evocation")).toBe(true);
    expect(isTargetApplied("clCheck")).toBe(true);
    expect(isTargetApplied("clCheck.sr")).toBe(true);
    expect(isTargetApplied("clCheck.dispel")).toBe(true);
    expect(isTargetApplied("cl")).toBe(false);
  });
});
