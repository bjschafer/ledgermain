import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

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

/** Build a minimal doc; abilities all 10 by default (no modifiers). */
function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  featChoices?: Record<string, string>;
  skillRanks?: CharacterDoc["build"]["skillRanks"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
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
      classes: over.classes,
    },
    abilities: over.abilities ?? {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      skillRanks: over.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

// ─── Toughness ───────────────────────────────────────────────────────────────

describe("Toughness feat", () => {
  // Barbarian d12 HD, con 10 (no con bonus).
  // Without Toughness: L3 HP = 12 + 7 + 7 = 26; L5 HP = 12 + 7 + 7 + 7 + 7 = 40.
  // Toughness at HD 3 → max(3, 3) = +3 HP.
  // Toughness at HD 5 → max(3, 5) = +5 HP.

  it("adds +3 max HP at HD 3 (threshold exactly)", () => {
    const base = makeDoc({ classes: [{ tag: "barbarian", level: 3 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "barbarian", level: 3 }],
      feats: [featId("Toughness")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.hp.max - baseSheet.hp.max).toBe(3);
  });

  it("adds +5 max HP at HD 5 (scales beyond the base 3)", () => {
    const base = makeDoc({ classes: [{ tag: "barbarian", level: 5 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      feats: [featId("Toughness")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.hp.max - baseSheet.hp.max).toBe(5);
  });

  it("adds +3 at HD 1 (below the threshold — minimum is 3)", () => {
    const base = makeDoc({ classes: [{ tag: "barbarian", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "barbarian", level: 1 }],
      feats: [featId("Toughness")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.hp.max - baseSheet.hp.max).toBe(3);
  });

  it("Toughness component appears in sheet.hp.components", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 3 }],
      feats: [featId("Toughness")],
    });
    const sheet = compute(doc, ref);
    const comp = sheet.hp.components.find((c) => c.source === "Toughness");
    expect(comp).toBeDefined();
    expect(comp?.applied).toBe(true);
    expect(comp?.value).toBe(3);
  });
});

// ─── Iron Will ───────────────────────────────────────────────────────────────

describe("Iron Will feat", () => {
  // Wizard L1, wis 10 (wis mod 0). Poor will: base 0 + wis 0 = 0.
  it("adds +2 to Will saving throw", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Iron Will")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.saves.will.total - baseSheet.saves.will.total).toBe(2);
  });

  it("does not affect Fort or Ref", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Iron Will")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.saves.fort.total).toBe(baseSheet.saves.fort.total);
    expect(featSheet.saves.ref.total).toBe(baseSheet.saves.ref.total);
  });
});

// ─── Dodge ───────────────────────────────────────────────────────────────────

describe("Dodge feat", () => {
  it("adds +1 dodge bonus to AC", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Dodge")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.ac.normal - baseSheet.ac.normal).toBe(1);
    expect(featSheet.ac.touch - baseSheet.ac.touch).toBe(1);
    // Dodge applies to touch AC (see TOUCH_CATEGORIES in compute.ts)
  });

  it("Dodge feat stacks with another dodge-type bonus (dodge type sums in stacker)", () => {
    // Per stacking.ts, "dodge" is a STACKING_TYPE — multiple dodge bonuses sum.
    const withFeatOnly = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Dodge")],
    });
    const withFeatAndBuff = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Dodge")],
      activeBuffs: [
        {
          instanceId: "buff-1",
          name: "Blur",
          changes: [{ target: "ac", type: "dodge", formula: "2" }],
        },
      ],
    });
    const sheetFeat = compute(withFeatOnly, ref);
    const sheetBoth = compute(withFeatAndBuff, ref);
    // Dodge feat (+1) + buff (+2) should both apply → total AC up by 2 from buff.
    expect(sheetBoth.ac.normal - sheetFeat.ac.normal).toBe(2);
  });
});

// ─── Stacking: untyped feat bonuses stack; non-stacking typed bonuses don't ─

describe("feat bonus stacking behaviour", () => {
  it("two untyped HP bonuses (Toughness + a buff) both apply (untyped stacks)", () => {
    // An active buff that grants +5 untyped HP — should stack with Toughness.
    const withToughness = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      feats: [featId("Toughness")],
    });
    const withToughnessAndBuff = makeDoc({
      classes: [{ tag: "barbarian", level: 5 }],
      feats: [featId("Toughness")],
      activeBuffs: [
        {
          instanceId: "buff-1",
          name: "Bear's Endurance",
          changes: [{ target: "hp", type: "untyped", formula: "5" }],
        },
      ],
    });
    const sheetFeat = compute(withToughness, ref);
    const sheetBoth = compute(withToughnessAndBuff, ref);
    // Toughness adds +5 at HD5; buff adds another +5; both apply → +5 from buff.
    expect(sheetBoth.hp.max - sheetFeat.hp.max).toBe(5);
  });

  it("two same-typed non-stacking bonuses: only the higher applies", () => {
    // Two enhancement bonuses to STR: only the higher one applies.
    const docOne = makeDoc({
      classes: [{ tag: "barbarian", level: 1 }],
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "Bull's Strength +2",
          changes: [{ target: "str", type: "enh", formula: "2" }],
        },
      ],
    });
    const docTwo = makeDoc({
      classes: [{ tag: "barbarian", level: 1 }],
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "Bull's Strength +2",
          changes: [{ target: "str", type: "enh", formula: "2" }],
        },
        {
          instanceId: "b2",
          name: "Bull's Strength +4",
          changes: [{ target: "str", type: "enh", formula: "4" }],
        },
      ],
    });
    const s1 = compute(docOne, ref);
    const s2 = compute(docTwo, ref);
    // With two enh bonuses, only the higher (+4) applies — net from base 10 is +4.
    expect(s1.abilities.str.total).toBe(12); // 10 + 2 enh
    expect(s2.abilities.str.total).toBe(14); // 10 + 4 enh (not 10+2+4)
  });
});

// ─── Skill Focus ─────────────────────────────────────────────────────────────

describe("Skill Focus feat", () => {
  // Skill Focus (Perception): +3 untyped bonus on Perception. +6 at 10+ ranks.
  // Wizard L1, wis 10 (wis mod 0), no ranks → base Perception = 0.

  it("adds +3 to the chosen skill when a choice is set and ranks < 10", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Skill Focus")],
      featChoices: { [featId("Skill Focus")]: "per" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["per"]!.total - baseSheet.skills["per"]!.total).toBe(3);
  });

  it("applies the bonus to the chosen skill only (not all skills)", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Skill Focus")],
      featChoices: { [featId("Skill Focus")]: "per" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Perception gets +3; Stealth should be unchanged.
    expect(featSheet.skills["per"]!.total - baseSheet.skills["per"]!.total).toBe(3);
    expect(featSheet.skills["ste"]!.total).toBe(baseSheet.skills["ste"]!.total);
  });

  it("gives +0 when no choice is set (never crashes)", () => {
    // feat present in build.feats but featChoices is absent / missing entry.
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeatNoChoice = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Skill Focus")],
      // featChoices intentionally omitted
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeatNoChoice, ref);
    // No bonus without a choice — sheet is identical to base.
    expect(featSheet.skills["per"]!.total).toBe(baseSheet.skills["per"]!.total);
  });

  it("moving the choice to a different skill moves the bonus", () => {
    const fId = featId("Skill Focus");
    const choosePer = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [fId],
      featChoices: { [fId]: "per" },
    });
    const chooseSte = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [fId],
      featChoices: { [fId]: "ste" },
    });
    const sheetPer = compute(choosePer, ref);
    const sheetSte = compute(chooseSte, ref);
    // With "per": Perception boosted, Stealth unchanged.
    expect(sheetPer.skills["per"]!.miscMod).toBeGreaterThan(0);
    expect(sheetPer.skills["ste"]!.miscMod).toBe(0);
    // With "ste": Stealth boosted, Perception unchanged.
    expect(sheetSte.skills["ste"]!.miscMod).toBeGreaterThan(0);
    expect(sheetSte.skills["per"]!.miscMod).toBe(0);
  });

  it("gives +6 when the character has 10+ ranks in the chosen skill", () => {
    const fId = featId("Skill Focus");
    // A level-10 wizard can have 10 ranks in Perception.
    const base = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      skillRanks: { per: 10 },
    });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      feats: [fId],
      featChoices: { [fId]: "per" },
      skillRanks: { per: 10 },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["per"]!.total - baseSheet.skills["per"]!.total).toBe(6);
  });

  it("gives only +3 at exactly 9 ranks (threshold is 10)", () => {
    const fId = featId("Skill Focus");
    const base = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      skillRanks: { per: 9 },
    });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      feats: [fId],
      featChoices: { [fId]: "per" },
      skillRanks: { per: 9 },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["per"]!.total - baseSheet.skills["per"]!.total).toBe(3);
  });
});

describe("Breadth of Experience feat", () => {
  // Breadth of Experience: +2 untyped on all Knowledge subskills and all
  // Profession instances (PZO1115 p. 151). skill.knowledge fans out to every
  // "k*" skill; skill.pro fans out to the bare "pro" id plus every "pro.*"
  // instance the character has ranks in.
  it("adds +2 to every Knowledge subskill", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Breadth of Experience")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["kar"]!.total - baseSheet.skills["kar"]!.total).toBe(2);
    expect(featSheet.skills["khi"]!.total - baseSheet.skills["khi"]!.total).toBe(2);
  });

  it("adds +2 to a named Profession instance the character has ranks in", () => {
    const base = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      skillRanks: { "pro.innkeeper": 1 },
    });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Breadth of Experience")],
      skillRanks: { "pro.innkeeper": 1 },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(
      featSheet.skills["pro.innkeeper"]!.total - baseSheet.skills["pro.innkeeper"]!.total,
    ).toBe(2);
  });

  it("does not touch an unrelated skill like Stealth", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [featId("Breadth of Experience")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["ste"]!.total).toBe(baseSheet.skills["ste"]!.total);
  });
});

// ─── Combat maneuver feats (Improved/Greater X family) ────────────────────────

describe("Improved Trip (CRB p. 131, both halves wired via maneuverCategories)", () => {
  it("adds +2 to the trip line on both CMB and CMD, headline totals untouched", () => {
    // Fighter 4, all abilities 10 -> BAB 4, str/dex mod 0, no size mod.
    // CMB = 4 + 0 + 0 = 4. CMD = 10 + 4 + 0 + 0 = 14.
    // "you receive a +2 bonus on checks made to trip a foe. You also receive
    // a +2 bonus to your Combat Maneuver Defense whenever an opponent tries
    // to trip you." (PF1 CRB p. 131)
    const base = makeDoc({ classes: [{ tag: "fighter", level: 4 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "fighter", level: 4 }],
      feats: [featId("Improved Trip")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);

    expect(baseSheet.cmb).toBe(4);
    expect(baseSheet.cmd).toBe(14);
    // Headline totals are untouched — the bonus is category-scoped, not general.
    expect(featSheet.cmb).toBe(4);
    expect(featSheet.cmd).toBe(14);
    expect(featSheet.cmbConditionals).toEqual([
      { total: 6, categories: ["trip"], labels: ["trip"] },
    ]);
    expect(featSheet.cmdConditionals).toEqual([
      { total: 16, categories: ["trip"], labels: ["trip"] },
    ]);
  });
});

describe("Greater Trip (APG, stacks with Improved Trip per the feat's own text)", () => {
  it("adds another +2 to the CMB trip line only — no CMD line from Greater Trip", () => {
    // Greater Trip: "You receive a +2 bonus on checks made to trip a foe.
    // This bonus stacks with the bonus granted by Improved Trip." Both are
    // untyped feat bonuses, which sum by default (stacking.ts) — no special
    // handling needed for the "stacks with" clause. Greater Trip's text
    // carries no CMD line at all.
    const withBoth = makeDoc({
      classes: [{ tag: "fighter", level: 4 }],
      feats: [featId("Improved Trip"), featId("Greater Trip")],
    });
    const sheet = compute(withBoth, ref);
    expect(sheet.cmb).toBe(4); // headline still untouched
    expect(sheet.cmbConditionals).toEqual([{ total: 8, categories: ["trip"], labels: ["trip"] }]);
    // CMD trip line comes from Improved Trip alone (+2), Greater Trip adds nothing.
    expect(sheet.cmdConditionals).toEqual([{ total: 16, categories: ["trip"], labels: ["trip"] }]);
  });
});
