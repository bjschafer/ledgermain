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
      spells: { known: [], prepared: [] },
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
