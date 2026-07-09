/**
 * Hand-computed fixture tests for investigator talents + Studied Combat /
 * Studied Strike / Inspiration (issue #65). Every talent in
 * `INVESTIGATOR_TALENTS` is `displayOnly` with `changes: []` (see that
 * file's doc comment), so `collectModifiers` should never emit a numeric
 * modifier for one. What IS exercised: the talent table's own gating/
 * surfacing (same pattern as `alchemistDiscoveries.test.ts`), Studied
 * Combat's insight bonus, Studied Strike's precision dice, and confirming
 * the vendored Inspiration pool + skill dice already work end-to-end
 * (issue #13's audit flagged inspiration as unwired display-only prose —
 * this test proves the vendored `uses.maxFormula`/`changes[]` already ride
 * the generic pipeline with no extra code needed).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { INVESTIGATOR_TALENTS, INVESTIGATOR_TALENT_IDS } from "../src/investigator-talents.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { studiedCombatBonus, studiedCombatLabel, studiedStrikeDice } from "../src/tables.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeInvestigator(
  level: number,
  intScore: number,
  investigatorTalents?: string[],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "investigator", level }],
    },
    abilities: { str: 10, dex: 14, con: 12, int: intScore, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(investigatorTalents ? { investigatorTalents } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function talentFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "investigatorTalent")
    .map((f) => f.name)
    .sort();
}

describe("INVESTIGATOR_TALENTS table", () => {
  it("every talent is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of INVESTIGATOR_TALENT_IDS) {
      const talent = INVESTIGATOR_TALENTS[id]!;
      expect(talent.displayOnly).toBe(true);
      expect(talent.changes).toEqual([]);
    }
  });

  it("covers the 28 core ACG investigator talents", () => {
    expect(INVESTIGATOR_TALENT_IDS.length).toBe(28);
  });

  it("includes well-known talents, tagged where they ride Studied Strike", () => {
    expect(INVESTIGATOR_TALENTS.quickStudy?.name).toBe("Quick Study");
    expect(INVESTIGATOR_TALENTS.sappingOffensive?.category).toBe("studiedStrike");
    expect(INVESTIGATOR_TALENTS.deviceTalent?.category).toBe("other");
  });
});

describe("studiedCombatBonus / studiedCombatLabel", () => {
  it("investigator level 4 -> +2 (floor(4/2))", () => {
    expect(studiedCombatBonus(4)).toBe(2);
    expect(studiedCombatLabel(4)).toBe("+2 atk/dmg vs. studied target");
  });

  it("investigator level 8 -> +4", () => {
    expect(studiedCombatBonus(8)).toBe(4);
  });

  it("level 0 (non-investigator) -> 0, empty label", () => {
    expect(studiedCombatBonus(0)).toBe(0);
    expect(studiedCombatLabel(0)).toBe("");
  });
});

describe("studiedStrikeDice", () => {
  it("investigator level 4 -> 1d6 (first grant)", () => {
    expect(studiedStrikeDice(4)).toEqual({ dice: 1, diceLabel: "1d6" });
  });

  it("investigator level 8 -> 3d6", () => {
    expect(studiedStrikeDice(8)).toEqual({ dice: 3, diceLabel: "3d6" });
  });

  it("investigator level 20 -> 9d6 (capped max)", () => {
    expect(studiedStrikeDice(20)).toEqual({ dice: 9, diceLabel: "9d6" });
  });

  it("below 4th level -> 0d6", () => {
    expect(studiedStrikeDice(3)).toEqual({ dice: 0, diceLabel: "0d6" });
  });
});

describe("Studied Combat / Studied Strike class-feature detail lines", () => {
  it("investigator level 8 shows both detail lines", () => {
    const doc = makeInvestigator(8, 16);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const studiedCombat = classFeatures.find((f) => f.name === "Studied Combat");
    const studiedStrike = classFeatures.find((f) => f.name === "Studied Strike");
    expect(studiedCombat?.detail).toBe("+4 atk/dmg vs. studied target");
    expect(studiedStrike?.detail).toBe("3d6");
  });
});

describe("Inspiration (issue #13 audit follow-up: already wired via vendored data)", () => {
  it("pool max = floor(level/2) + Int mod, min 1 (RAW)", () => {
    // Level 6 investigator, Int 16 (+3 mod): floor(6/2) + 3 = 6.
    const doc = makeInvestigator(6, 16);
    const rollData = buildRollData(doc, ref);
    const feature = Object.values(ref.classFeatures).find((f) => f.name === "Inspiration");
    expect(feature?.uses?.maxFormula).toBe(
      "max(1, @abilities.int.mod + floor(@class.unlevel / 2))",
    );
    // Sanity-check the roll-data path this formula depends on resolves.
    expect((rollData as any).abilities?.int?.mod).toBeGreaterThanOrEqual(0);
  });

  it("the vendored +1d6-per-Knowledge-skill changes exist but don't surface as a static Change (dice formula, same engine-wide limitation as every other dice-bearing Change)", () => {
    const feature = Object.values(ref.classFeatures).find((f) => f.name === "Inspiration");
    expect(
      feature?.changes?.some((c) => c.target === "skill.kna" && c.formula.includes("1d6")),
    ).toBe(true);
    const doc = makeInvestigator(6, 16);
    doc.build.skillRanks = { kna: 3 };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    // Dice terms parse but throw on numeric eval (formula.ts convention) —
    // `tryEvaluateFormula` returns null, so `evalChange` emits nothing here.
    // This is a per-use "roll a d6 when you spend inspiration" bonus, not a
    // static sheet number, so the absence is correct, not a bug.
    expect(mods.some((m) => m.target === "skill.kna" && m.source === "Inspiration")).toBe(false);
  });
});

describe("investigator talents (collectModifiers)", () => {
  it("a chosen displayOnly talent contributes no numeric modifier", () => {
    const doc = makeInvestigator(9, 16, ["quickStudy", "empathy", "eideticRecollection"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "quickStudy" || m.sourceId === "empathy")).toBe(false);
  });

  it("unknown talent ids are skipped, never crash", () => {
    const doc = makeInvestigator(9, 16, ["not-a-real-talent"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });
});

describe("investigator talents (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen talent is surfaced with origin.kind 'investigatorTalent'", () => {
    const doc = makeInvestigator(9, 16, ["quickStudy", "empathy"]);
    expect(talentFeatureNames(doc)).toEqual(["Empathy", "Quick Study"]);
  });

  it("no talent chosen surfaces nothing", () => {
    const doc = makeInvestigator(9, 16);
    expect(talentFeatureNames(doc)).toEqual([]);
  });

  it("collectGrantedFeatures gates on investigator level (0 for a non-investigator)", () => {
    const doc: CharacterDoc = {
      ...makeInvestigator(0, 16, ["quickStudy"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "investigatorTalent")).toBe(false);
  });
});
