/**
 * Fixture tests for issue #45's feat batch-extraction pass: a representative
 * sample of `FEAT_EFFECTS_EXTRACTED` entries (feat-effects-extracted.ts),
 * hand-computed against the real vendored data slice (loadRefData()), plus
 * the hand-vs-extracted precedence rule (feat-effects-resolve.ts). Mirrors
 * the existing pattern in feats.test.ts / weapon_feats.test.ts.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { FEAT_EFFECTS } from "../src/feat-effects.js";
import { FEAT_EFFECTS_EXTRACTED } from "../src/feat-effects-extracted.js";
import { resolveFeatEffect } from "../src/feat-effects-resolve.js";
import { deriveResourcePools } from "../src/resources.js";
import { compute } from "../src/index.js";

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

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  featChoices?: Record<string, string>;
  skillRanks?: CharacterDoc["build"]["skillRanks"];
  weapons?: WeaponInstance[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: over.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: over.weapons ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// ─── Acrobatic (skill-pair family) ──────────────────────────────────────────

describe("Acrobatic feat (extracted)", () => {
  it("adds +2 to Acrobatics and Fly below 10 ranks", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Acrobatic")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["acr"]!.total - baseSheet.skills["acr"]!.total).toBe(2);
    expect(featSheet.skills["fly"]!.total - baseSheet.skills["fly"]!.total).toBe(2);
  });

  it("increases to +4 on Acrobatics only once ranks reach 10", () => {
    const base = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      skillRanks: { acr: 10 },
    });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      feats: [featId("Acrobatic")],
      skillRanks: { acr: 10 },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["acr"]!.total - baseSheet.skills["acr"]!.total).toBe(4);
    // Fly ranks are still 0 → stays at +2.
    expect(featSheet.skills["fly"]!.total - baseSheet.skills["fly"]!.total).toBe(2);
  });

  it("does not affect an unrelated skill", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Acrobatic")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["ste"]!.total).toBe(baseSheet.skills["ste"]!.total);
  });
});

// ─── Stealthy (second skill-pair sample) ────────────────────────────────────

describe("Stealthy feat (extracted)", () => {
  it("adds +2 to Escape Artist and Stealth", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Stealthy")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["esc"]!.total - baseSheet.skills["esc"]!.total).toBe(2);
    expect(featSheet.skills["ste"]!.total - baseSheet.skills["ste"]!.total).toBe(2);
  });
});

// ─── Intimidating Prowess ────────────────────────────────────────────────────

describe("Intimidating Prowess feat (extracted)", () => {
  it("adds the Str modifier to Intimidate", () => {
    const base = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    });
    const withFeat = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      abilities: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      feats: [featId("Intimidating Prowess")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Str 18 -> +4 mod.
    expect(featSheet.skills["int"]!.total - baseSheet.skills["int"]!.total).toBe(4);
  });

  it("adds +0 at Str 10 (mod 0) — never subtracts", () => {
    const base = makeDoc({ classes: [{ tag: "fighter", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [featId("Intimidating Prowess")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["int"]!.total).toBe(baseSheet.skills["int"]!.total);
  });
});

// ─── Greater Weapon Focus / Greater Weapon Specialization ───────────────────

const longsword: WeaponInstance = {
  name: "Longsword",
  attackAbility: "str",
  damageDice: "1d8",
  group: "longsword",
  category: "melee",
};

describe("Greater Weapon Focus (extracted)", () => {
  it("adds +1 attack, stacking with Weapon Focus on the same weapon", () => {
    const gwfId = featId("Greater Weapon Focus");
    const wfId = featId("Weapon Focus");
    const base = makeDoc({ classes: [{ tag: "fighter", level: 8 }], weapons: [longsword] });
    const withGwfOnly = makeDoc({
      classes: [{ tag: "fighter", level: 8 }],
      weapons: [longsword],
      feats: [gwfId],
      featChoices: { [gwfId]: "longsword" },
    });
    const withBoth = makeDoc({
      classes: [{ tag: "fighter", level: 8 }],
      weapons: [longsword],
      feats: [wfId, gwfId],
      featChoices: { [wfId]: "longsword", [gwfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const gwfSheet = compute(withGwfOnly, ref);
    const bothSheet = compute(withBoth, ref);
    expect(gwfSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
    expect(bothSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(2);
  });

  it("does not affect a weapon of a different group", () => {
    const gwfId = featId("Greater Weapon Focus");
    const dagger: WeaponInstance = {
      name: "Dagger",
      attackAbility: "str",
      damageDice: "1d4",
      group: "dagger",
      category: "melee",
    };
    const base = makeDoc({
      classes: [{ tag: "fighter", level: 8 }],
      weapons: [longsword, dagger],
    });
    const withFeat = makeDoc({
      classes: [{ tag: "fighter", level: 8 }],
      weapons: [longsword, dagger],
      feats: [gwfId],
      featChoices: { [gwfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.attacks[1]!.attack.total).toBe(baseSheet.attacks[1]!.attack.total);
  });
});

describe("Greater Weapon Specialization (extracted)", () => {
  it("adds +2 damage, stacking with Weapon Specialization on the same weapon", () => {
    const gwsId = featId("Greater Weapon Specialization");
    const wsId = featId("Weapon Specialization");
    const base = makeDoc({ classes: [{ tag: "fighter", level: 12 }], weapons: [longsword] });
    const withBoth = makeDoc({
      classes: [{ tag: "fighter", level: 12 }],
      weapons: [longsword],
      feats: [wsId, gwsId],
      featChoices: { [wsId]: "longsword", [gwsId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const bothSheet = compute(withBoth, ref);
    expect(bothSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(
      4,
    );
  });
});

// ─── Master Craftsman ────────────────────────────────────────────────────────

describe("Master Craftsman feat (extracted, partial)", () => {
  it("adds +2 to the chosen Craft/Profession skill", () => {
    const mcId = featId("Master Craftsman");
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [mcId],
      featChoices: { [mcId]: "crf" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["crf"]!.total - baseSheet.skills["crf"]!.total).toBe(2);
  });

  it("gives +0 when no choice is set", () => {
    const mcId = featId("Master Craftsman");
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({ classes: [{ tag: "wizard", level: 1 }], feats: [mcId] });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["crf"]!.total).toBe(baseSheet.skills["crf"]!.total);
  });
});

// ─── Extra Arcane Pool (new FEAT_POOL_EFFECTS entry) ────────────────────────

describe("Extra Arcane Pool feat (new pool entry)", () => {
  it("magus 4's Arcane Pool (floor(4/2) + int mod = 2) gains +2 -> 4", () => {
    const base: CharacterDoc = makeDoc({
      classes: [{ tag: "magus", level: 4 }],
    });
    const withFeat: CharacterDoc = makeDoc({
      classes: [{ tag: "magus", level: 4 }],
      feats: [featId("Extra Arcane Pool")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    const basePool = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Arcane Pool",
    );
    const featPool = deriveResourcePools(withFeat, ref, featSheet.abilities).find(
      (p) => p.name === "Arcane Pool",
    );
    expect(basePool?.max).toBe(2);
    expect(featPool?.max).toBe(4);
  });

  it("stacks across two instances of the feat", () => {
    const withTwo: CharacterDoc = makeDoc({
      classes: [{ tag: "magus", level: 4 }],
      feats: [featId("Extra Arcane Pool"), featId("Extra Arcane Pool")],
    });
    const sheet = compute(withTwo, ref);
    const pool = deriveResourcePools(withTwo, ref, sheet.abilities).find(
      (p) => p.name === "Arcane Pool",
    );
    expect(pool?.max).toBe(6);
  });
});

// ─── Precedence (issue #45) ──────────────────────────────────────────────────

describe("resolveFeatEffect precedence (issue #45)", () => {
  it("hand-verified wins over extracted when the same slug is present in both tables", () => {
    const slug = "synthetic-overlap-feat";
    const handTable = {
      [slug]: {
        type: "static" as const,
        changes: [{ target: "ac", type: "untyped", formula: "1" }],
      },
    };
    const extractedTable = {
      [slug]: {
        type: "static" as const,
        changes: [{ target: "ac", type: "untyped", formula: "99" }],
        confidence: "high" as const,
        provenance: "n/a — synthetic test fixture",
      },
    };
    const resolved = resolveFeatEffect(slug, handTable, extractedTable);
    expect(resolved?.source).toBe("hand");
    expect(resolved?.entry.type).toBe("static");
    expect(resolved && resolved.entry.type === "static" && resolved.entry.changes[0]?.formula).toBe(
      "1",
    );
  });

  it("falls back to the extracted table when no hand-verified entry exists", () => {
    const resolved = resolveFeatEffect("acrobatic");
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
  });

  it("uses the hand-verified table for an already-hand-authored feat", () => {
    const resolved = resolveFeatEffect("toughness");
    expect(resolved?.source).toBe("hand");
    expect(resolved?.confidence).toBeUndefined();
  });

  it("returns undefined for a feat with no effect entry in either table", () => {
    expect(resolveFeatEffect("cleave")).toBeUndefined();
  });

  it("no real feat slug is present in both production tables today", () => {
    const overlap = Object.keys(FEAT_EFFECTS).filter((slug) => slug in FEAT_EFFECTS_EXTRACTED);
    expect(overlap).toEqual([]);
  });
});
