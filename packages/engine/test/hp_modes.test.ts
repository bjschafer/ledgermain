/**
 * Engine tests for Stage 2 HP mode enhancements:
 * - average / max / rolled HP modes
 * - FCB HP counting ("hp" | "both")
 * - generic stat overrides (bounded allowlist)
 * - hp.components provenance
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function baseDoc(overrides: Partial<CharacterDoc["build"]> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test-hp",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "barbarian", level: 3 }],
    },
    // barbarian d12; con 10 → mod 0
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...overrides,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// Barbarian L3, con 10: L1=12, L2=7, L3=7 → average total = 26
const AVERAGE_TOTAL = 26;

// ---------------------------------------------------------------------------
// Average mode (default)
// ---------------------------------------------------------------------------
describe("HP mode: average (default)", () => {
  it("L1 = max HD, subsequent levels = floor(HD/2)+1", () => {
    const sheet = compute(baseDoc(), ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL);
    expect(sheet.hp.max).toBe(AVERAGE_TOTAL);
  });

  it("components include a Hit Dice entry", () => {
    const sheet = compute(baseDoc(), ref);
    const hdComp = sheet.hp.components.find((c) => c.source === "Hit Dice");
    expect(hdComp).toBeDefined();
    expect(hdComp?.value).toBe(AVERAGE_TOTAL); // con 0, no fcb
  });
});

// ---------------------------------------------------------------------------
// Max mode
// ---------------------------------------------------------------------------
describe("HP mode: max", () => {
  it("every level uses the full die value", () => {
    // barbarian d12: 3 levels all max → 36
    const doc = baseDoc({ settings: { hpMode: "max" } });
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(36);
    expect(sheet.hp.max).toBe(36);
  });
});

// ---------------------------------------------------------------------------
// Rolled mode
// ---------------------------------------------------------------------------
describe("HP mode: rolled", () => {
  it("L1 is always maxed; subsequent levels use stored rolls", () => {
    // rolls[0]=5 (ignored; L1 is maxed), rolls[1]=8, rolls[2]=4
    const doc = baseDoc({
      hpRolls: [5, 8, 4],
      settings: { hpMode: "rolled" },
    });
    const sheet = compute(doc, ref);
    // L1=12 (max d12), L2=8, L3=4 → 24
    expect(sheet.hp.auto).toBe(24);
  });

  it("falls back to average when a roll is missing", () => {
    // only L2 stored, L3 missing → L3 uses floor(12/2)+1 = 7
    const doc = baseDoc({
      hpRolls: [0, 10],
      settings: { hpMode: "rolled" },
    });
    const sheet = compute(doc, ref);
    // L1=12 (max), L2=10, L3=7 (average fallback)
    expect(sheet.hp.auto).toBe(29);
  });
});

// ---------------------------------------------------------------------------
// FCB HP counting
// ---------------------------------------------------------------------------
describe("FCB HP bonus", () => {
  it("counts 'hp' entries", () => {
    const doc = baseDoc({ favoredClassBonus: ["hp", "skill", "hp"] });
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL + 2);
  });

  it("counts 'both' entries (house-rule)", () => {
    const doc = baseDoc({ favoredClassBonus: ["both", "both"] });
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL + 2);
  });

  it("does not count 'skill' or 'other' or 'alternate'", () => {
    const doc = baseDoc({ favoredClassBonus: ["skill", "other", "alternate"] });
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL);
  });

  it("FCB shows in components", () => {
    const doc = baseDoc({ favoredClassBonus: ["hp"] });
    const sheet = compute(doc, ref);
    const fcbComp = sheet.hp.components.find((c) => c.source === "Favored class");
    expect(fcbComp?.value).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Con modifier shows in components
// ---------------------------------------------------------------------------
describe("HP components: Con modifier", () => {
  it("Con +2 × 3 HD = +6 is a component", () => {
    const doc = baseDoc();
    // set con to 14 (mod +2)
    doc.abilities.con = 14;
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL + 6);
    const conComp = sheet.hp.components.find((c) => c.source.startsWith("Con"));
    expect(conComp?.value).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Per-HD minimum 1 HP (PF1 CRB: "a creature always gains at least 1 hit point
// per Hit Die, no matter its Constitution modifier").
// ---------------------------------------------------------------------------
describe("HP per-HD minimum", () => {
  it("rolled mode: a rolled 2 with Con -3 still contributes 1 HP for that level, not -1", () => {
    // Wizard (d6). Con 4 -> mod -3. L1 is always maxed (die=6) regardless of
    // Con, so its floor never binds; check the L2 contribution specifically by
    // comparing totals: L1 max(6-3,1)=3, L2 rolled=2 -> naive 2-3=-1, floored to 1.
    // Expected auto = 3 (L1) + 1 (L2, floored) = 4.
    const doc = baseDoc({
      hpRolls: [0, 2],
      settings: { hpMode: "rolled" },
    });
    doc.identity.classes = [{ tag: "wizard", level: 2 }];
    doc.abilities.con = 4; // mod -3
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(4);
  });

  it("does not affect L1 (always maxed) even with a harsh Con penalty", () => {
    // Wizard L1, d6, Con 4 (mod -3): naive would be 6-3=3, which never hits the
    // per-HD floor of 1, so this should equal the unfloored value.
    const doc = baseDoc();
    doc.identity.classes = [{ tag: "wizard", level: 1 }];
    doc.abilities.con = 4; // mod -3
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(3);
  });

  it("floors an extreme Con penalty at 1 HP for that level (average mode)", () => {
    // Wizard L2, d6 average (floor(6/2)+1=4), Con -10 (score 1, mod -5... but
    // ability scores are clamped elsewhere; use a still-legal low score).
    // Con 1 -> mod -5. L2 average levelHp=4; naive 4-5=-1, floored to 1.
    const doc = baseDoc();
    doc.identity.classes = [{ tag: "wizard", level: 2 }];
    doc.abilities.con = 1; // mod -5
    const sheet = compute(doc, ref);
    // L1 maxed: 6-5=1, never negative here since maxed die 6 - 5 = 1 already.
    // L2 average 4-5=-1 -> floored to 1. Total = 1 + 1 = 2.
    expect(sheet.hp.auto).toBe(2);
  });

  it("Hit Dice and Con components still sum to the true (floored) total", () => {
    const doc = baseDoc();
    doc.identity.classes = [{ tag: "wizard", level: 2 }];
    doc.abilities.con = 1; // mod -5
    const sheet = compute(doc, ref);
    // Raw (pre-Con) Hit Dice: L1 max(6) + L2 average(4) = 10. Applied Con delta
    // is the actual floored shortfall (-8), not the naive -5*2=-10, because
    // both levels hit the per-HD floor of 1.
    const hdComp = sheet.hp.components.find((c) => c.source === "Hit Dice");
    const conComp = sheet.hp.components.find((c) => c.source.startsWith("Con"));
    expect(hdComp?.value).toBe(10);
    expect(conComp?.value).toBe(-8);
    expect((hdComp?.value ?? 0) + (conComp?.value ?? 0)).toBe(sheet.hp.auto);
  });

  it("preserves existing (unfloored) behavior when the minimum never binds", () => {
    // Barbarian L3, con 10 (mod 0) is the existing AVERAGE_TOTAL fixture; a
    // positive Con case is already covered above by the pre-existing suite.
    // This confirms a moderate negative Con that never dips a level below 1
    // also matches the naive conMod*hd calculation.
    const doc = baseDoc(); // barbarian d12, L3
    doc.abilities.con = 8; // mod -1
    const sheet = compute(doc, ref);
    // L1=12-1=11, L2=7-1=6, L3=7-1=6 -> 23 (none hit the floor)
    expect(sheet.hp.auto).toBe(23);
    const conComp = sheet.hp.components.find((c) => c.source.startsWith("Con"));
    expect(conComp?.value).toBe(-3); // naive conMod(-1) * hd(3) = -3, matches
  });
});

// ---------------------------------------------------------------------------
// Stat overrides
// ---------------------------------------------------------------------------
describe("Generic stat overrides", () => {
  it("hp.max override replaces max but leaves auto unchanged", () => {
    const doc = baseDoc({ settings: { statOverrides: { "hp.max": 99 } } });
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL);
    expect(sheet.hp.max).toBe(99);
  });

  it("hp.max override adds an 'override' component to hp.components", () => {
    const doc = baseDoc({ settings: { statOverrides: { "hp.max": 50 } } });
    const sheet = compute(doc, ref);
    const ov = sheet.hp.components.find((c) => c.type === "override");
    expect(ov).toBeDefined();
    expect(ov?.source).toBe("Manual override");
    expect(ov?.value).toBe(50);
  });

  it("bab override replaces sheet.bab", () => {
    const doc = baseDoc({ settings: { statOverrides: { bab: 10 } } });
    const sheet = compute(doc, ref);
    expect(sheet.bab).toBe(10);
  });

  it("saves.fort.total override replaces fort total and appends component", () => {
    const doc = baseDoc({ settings: { statOverrides: { "saves.fort.total": 20 } } });
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(20);
    const ov = sheet.saves.fort.components.find((c) => c.type === "override");
    expect(ov).toBeDefined();
  });

  it("unknown override keys are silently ignored", () => {
    const doc = baseDoc({ settings: { statOverrides: { "unknown.key": 5 } as Record<string, number> } });
    // Should not throw, and sheet is otherwise unmodified
    const sheet = compute(doc, ref);
    expect(sheet.hp.auto).toBe(AVERAGE_TOTAL);
  });

  it("speeds.land override replaces land speed", () => {
    const doc = baseDoc({ settings: { statOverrides: { "speeds.land": 50 } } });
    const sheet = compute(doc, ref);
    expect(sheet.speeds.land).toBe(50);
  });
});
