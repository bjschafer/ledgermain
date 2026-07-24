/**
 * Hand-computed fixture tests for shifter aspects (issue #65): the
 * `SHIFTER_ASPECTS` table's shape, `shifterClawsDamageDie`'s progression,
 * and the genuine minor-form `Change` formulas (applied as an active buff,
 * mirroring `model/shifterAspects.ts`'s `toggleAspectMinorForm` shape)
 * scaling correctly at 1st/8th/15th shifter level.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { SHIFTER_ASPECTS, SHIFTER_ASPECT_IDS } from "../src/shifter-aspects.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { shifterClawsDamageDie, shifterClawsLabel } from "../src/tables.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeShifter(level: number, shifterAspects?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "shifter", level }],
    },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(shifterAspects ? { shifterAspects } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function aspectFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "shifterAspect")
    .map((f) => f.name)
    .sort();
}

describe("SHIFTER_ASPECTS table", () => {
  it("covers all 30 Blood of the Beast aspects", () => {
    expect(SHIFTER_ASPECT_IDS.length).toBe(30);
  });

  it("includes well-known aspects with the right minor-form shape", () => {
    expect(SHIFTER_ASPECTS.bear?.name).toBe("Bear");
    expect(SHIFTER_ASPECTS.bear?.minorFormChanges.length).toBe(1);
    expect(SHIFTER_ASPECTS.mouse?.minorFormChanges).toEqual([]);
    expect(SHIFTER_ASPECTS.mouse?.contextNotes?.length).toBeGreaterThan(0);
  });

  it("every aspect points its major form at issue #70 (deferred)", () => {
    for (const id of SHIFTER_ASPECT_IDS) {
      expect(SHIFTER_ASPECTS[id]!.majorFormNote).toContain("#70");
    }
  });

  it("a genuine plurality of aspects DO carry a real minor-form Change (unlike hexes/discoveries)", () => {
    const withChanges = SHIFTER_ASPECT_IDS.filter(
      (id) => SHIFTER_ASPECTS[id]!.minorFormChanges.length > 0,
    );
    expect(withChanges.length).toBeGreaterThanOrEqual(15);
  });
});

describe("shifterClawsDamageDie / shifterClawsLabel", () => {
  it("level 1 -> 1d4, crit x2", () => {
    expect(shifterClawsDamageDie(1)).toEqual({ dieLabel: "1d4", critLabel: "x2" });
  });
  it("level 7 -> 1d6", () => {
    expect(shifterClawsDamageDie(7).dieLabel).toBe("1d6");
  });
  it("level 11 -> 1d8", () => {
    expect(shifterClawsDamageDie(11).dieLabel).toBe("1d8");
  });
  it("level 13 -> 1d10 (die stops increasing after this)", () => {
    expect(shifterClawsDamageDie(13).dieLabel).toBe("1d10");
    expect(shifterClawsDamageDie(20).dieLabel).toBe("1d10");
  });
  it("level 17 -> crit x3", () => {
    expect(shifterClawsDamageDie(17).critLabel).toBe("x3");
    expect(shifterClawsLabel(17)).toBe("1d10 (crit x3)");
  });
});

describe("Shifter Claws class-feature detail line", () => {
  it("level 11 shifter shows 1d8 (crit x2)", () => {
    const doc = makeShifter(11);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const claws = classFeatures.find((f) => f.name === "Shifter Claws");
    expect(claws?.detail).toBe("1d8 (crit x2)");
  });
});

describe("minor-form Change formulas (applied as an active buff)", () => {
  function withMinorForm(doc: CharacterDoc, aspectId: string): CharacterDoc {
    return {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "b1",
            buffId: `shifter-aspect:${aspectId}`,
            name: `${SHIFTER_ASPECTS[aspectId]!.name} (minor form)`,
            changes: SHIFTER_ASPECTS[aspectId]!.minorFormChanges.map((c) => ({ ...c })),
          },
        ],
      },
    };
  }

  it("Bear's Con enhancement scales 2/4/6 at 1st/8th/15th", () => {
    for (const [level, expected] of [
      [1, 2],
      [7, 2],
      [8, 4],
      [14, 4],
      [15, 6],
      [20, 6],
    ] as const) {
      const doc = withMinorForm(makeShifter(level), "bear");
      const rollData = buildRollData(doc, ref);
      const mods = collectModifiers(doc, ref, rollData);
      const conMod = mods.find((m) => m.target === "con");
      expect(conMod?.value).toBe(expected);
      expect(conMod?.type).toBe("enhancement");
    }
  });

  it("Stag's landSpeed enhancement scales 5/10/20 at 1st/8th/15th", () => {
    for (const [level, expected] of [
      [1, 5],
      [8, 10],
      [15, 20],
    ] as const) {
      const doc = withMinorForm(makeShifter(level), "stag");
      const rollData = buildRollData(doc, ref);
      const mods = collectModifiers(doc, ref, rollData);
      expect(mods.find((m) => m.target === "landSpeed")?.value).toBe(expected);
    }
  });

  it("Falcon's Perception competence scales 4/6/8 at 1st/8th/15th", () => {
    for (const [level, expected] of [
      [1, 4],
      [8, 6],
      [15, 8],
    ] as const) {
      const doc = withMinorForm(makeShifter(level), "falcon");
      const rollData = buildRollData(doc, ref);
      const mods = collectModifiers(doc, ref, rollData);
      const mod = mods.find((m) => m.target === "skill.per");
      expect(mod?.value).toBe(expected);
      expect(mod?.type).toBe("competence");
    }
  });

  it("Mantis's reach bonus is 0 below 12th level and +5 at 12th+", () => {
    const below = withMinorForm(makeShifter(11), "mantis");
    const belowRollData = buildRollData(below, ref);
    expect(
      collectModifiers(below, ref, belowRollData).find((m) => m.target === "reach")?.value,
    ).toBe(0);

    const at = withMinorForm(makeShifter(12), "mantis");
    const atRollData = buildRollData(at, ref);
    expect(collectModifiers(at, ref, atRollData).find((m) => m.target === "reach")?.value).toBe(5);
  });

  it("Bat's darkvision scales 60 / 90 / 90 with shifter level", () => {
    for (const [level, expected] of [
      [1, 60],
      [8, 90],
      [15, 90],
    ] as const) {
      const doc = withMinorForm(makeShifter(level), "bat");
      const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
      expect(mods.find((m) => m.target === "sensedv")?.value).toBe(expected);
    }
  });

  it("Wolf's scent scales 10 / 20 / 30 with shifter level", () => {
    for (const [level, expected] of [
      [1, 10],
      [8, 20],
      [15, 30],
    ] as const) {
      const doc = withMinorForm(makeShifter(level), "wolf");
      const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
      expect(mods.find((m) => m.target === "sensesc")?.value).toBe(expected);
    }
  });
});

describe("shifter aspects (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen aspect is surfaced with origin.kind 'shifterAspect'", () => {
    const doc = makeShifter(15, ["bear", "falcon", "mouse"]);
    expect(aspectFeatureNames(doc)).toEqual(["Bear", "Falcon", "Mouse"]);
  });

  it("no aspect chosen surfaces nothing", () => {
    const doc = makeShifter(15);
    expect(aspectFeatureNames(doc)).toEqual([]);
  });

  it("collectGrantedFeatures gates on shifter level (0 for a non-shifter)", () => {
    const doc: CharacterDoc = {
      ...makeShifter(0, ["bear"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "shifterAspect")).toBe(false);
  });

  it("unknown aspect ids are skipped, never crash", () => {
    const doc = makeShifter(15, ["not-a-real-aspect"]);
    expect(() => resolveClassFeatures(doc, ref)).not.toThrow();
  });
});
