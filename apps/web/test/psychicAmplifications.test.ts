import { describe, expect, it } from "bun:test";

import { mergedPhrenicAmplificationCatalog } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  amplificationBelowLevel,
  chosenPsychicAmplificationCount,
  expectedPsychicAmplificationCount,
  hasPsychicAmplification,
  parseFlatPointCost,
  phrenicAmplificationActions,
  phrenicAmplificationPrereqResult,
  psychicAmplificationsNeedWarning,
  psychicLevel,
  togglePsychicAmplification,
} from "../src/model/psychicAmplifications.js";

const ref = loadRefData();

function idByName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  psychicAmplifications?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "psychic", level: 4 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      psychicAmplifications: over.psychicAmplifications,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/psychicAmplifications: togglePsychicAmplification", () => {
  it("adds an amplification id not yet present", () => {
    const doc = togglePsychicAmplification(makeDoc({}), "biokineticHealing");
    expect(doc.build.psychicAmplifications).toEqual(["biokineticHealing"]);
    expect(hasPsychicAmplification(doc, "biokineticHealing")).toBe(true);
  });

  it("adds to an undefined psychicAmplifications array (back-compat docs)", () => {
    const doc = togglePsychicAmplification(
      makeDoc({ psychicAmplifications: undefined }),
      "biokineticHealing",
    );
    expect(doc.build.psychicAmplifications).toEqual(["biokineticHealing"]);
  });

  it("removes an amplification id already present", () => {
    const doc = togglePsychicAmplification(
      makeDoc({ psychicAmplifications: ["biokineticHealing", "focusedForce"] }),
      "biokineticHealing",
    );
    expect(doc.build.psychicAmplifications).toEqual(["focusedForce"]);
  });

  it("never blocks taking more than the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing"],
    });
    const withExtra = togglePsychicAmplification(doc, "focusedForce");
    expect(withExtra.build.psychicAmplifications).toEqual(["biokineticHealing", "focusedForce"]);
  });
});

describe("model/psychicAmplifications: psychicLevel", () => {
  it("returns the psychic class level", () => {
    expect(psychicLevel(makeDoc({ classes: [{ tag: "psychic", level: 12 }] }))).toBe(12);
  });

  it("returns 0 for a non-psychic", () => {
    expect(psychicLevel(makeDoc({ classes: [{ tag: "fighter", level: 12 }] }))).toBe(0);
  });
});

describe("model/psychicAmplifications: expectedPsychicAmplificationCount (OA progression)", () => {
  it("0 for a non-psychic", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "fighter", level: 10 }] }), ref),
    ).toBe(0);
  });

  it("level 1: 1 amplification (first is 1st level)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 1 }] }), ref),
    ).toBe(1);
  });

  it("level 2: still 1 (next gain is 3rd)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 2 }] }), ref),
    ).toBe(1);
  });

  it("level 19: 6 amplifications (all six thresholds reached)", () => {
    expect(
      expectedPsychicAmplificationCount(makeDoc({ classes: [{ tag: "psychic", level: 19 }] }), ref),
    ).toBe(6);
  });

  it("Extra Amplification feat adds one more", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      feats: [idByName("Extra Amplification")],
    });
    expect(expectedPsychicAmplificationCount(doc, ref)).toBe(2);
  });

  it("two copies of Extra Amplification each count (stackable feat)", () => {
    const featId = idByName("Extra Amplification");
    const doc = makeDoc({ classes: [{ tag: "psychic", level: 1 }], feats: [featId, featId] });
    expect(expectedPsychicAmplificationCount(doc, ref)).toBe(3);
  });
});

describe("model/psychicAmplifications: soft budget warning", () => {
  it("no warning at exactly the expected count", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing"],
    });
    expect(chosenPsychicAmplificationCount(doc)).toBe(expectedPsychicAmplificationCount(doc, ref));
    expect(psychicAmplificationsNeedWarning(doc, ref)).toBe(false);
  });

  it("warns when more than expected is chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "psychic", level: 1 }],
      psychicAmplifications: ["biokineticHealing", "focusedForce"],
    });
    expect(psychicAmplificationsNeedWarning(doc, ref)).toBe(true);
  });

  it("empty selection needs no warning", () => {
    expect(psychicAmplificationsNeedWarning(makeDoc({}), ref)).toBe(false);
  });
});

describe("model/psychicAmplifications: amplificationBelowLevel", () => {
  it("a major amplification (minLevel 11) is below level for a 5th-level psychic", () => {
    const doc = makeDoc({ classes: [{ tag: "psychic", level: 5 }] });
    expect(amplificationBelowLevel(doc, 11)).toBe(true);
  });

  it("is not below level once the psychic reaches minLevel", () => {
    const doc = makeDoc({ classes: [{ tag: "psychic", level: 11 }] });
    expect(amplificationBelowLevel(doc, 11)).toBe(false);
  });

  it("a basic amplification (minLevel 1) is never below level for any psychic", () => {
    const doc = makeDoc({ classes: [{ tag: "psychic", level: 1 }] });
    expect(amplificationBelowLevel(doc, 1)).toBe(false);
  });

  it("false for a non-psychic (no level to gate on)", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 20 }] });
    expect(amplificationBelowLevel(doc, 11)).toBe(false);
  });
});

describe("model/psychicAmplifications: phrenicAmplificationPrereqResult", () => {
  // "When the psychic uses this major amplification, she chooses two other
  // amplifications or major amplifications she knows to apply to the same
  // linked spell." (Dual Amplification's own vendored description) is the
  // only structured, checkable "requires another amplification" signal
  // across all 31 published entries — nothing else names another
  // amplification by name or count, so this test also documents that the
  // audit found exactly one.
  it("only Dual Amplification, of all 31 catalog entries, carries a structured requirement", () => {
    const doc = makeDoc({});
    const catalog = mergedPhrenicAmplificationCatalog(ref);
    expect(catalog.length).toBe(31);
    const withRequirement = catalog
      .filter((a) => phrenicAmplificationPrereqResult(doc, a.id, a.description) !== undefined)
      .map((a) => a.id);
    expect(withRequirement).toEqual(["dualAmplification"]);
  });

  it("unmet with fewer than 2 other known amplifications", () => {
    const doc = makeDoc({ psychicAmplifications: ["dualAmplification"] });
    const dual = mergedPhrenicAmplificationCatalog(ref).find((a) => a.id === "dualAmplification")!;
    const result = phrenicAmplificationPrereqResult(doc, "dualAmplification", dual.description);
    expect(result?.checks).toEqual([{ label: "Know 2 other amplifications", met: false }]);
  });

  it("met with 2 other known amplifications (itself excluded from its own count)", () => {
    const doc = makeDoc({
      psychicAmplifications: ["dualAmplification", "biokineticHealing", "focusedForce"],
    });
    const dual = mergedPhrenicAmplificationCatalog(ref).find((a) => a.id === "dualAmplification")!;
    const result = phrenicAmplificationPrereqResult(doc, "dualAmplification", dual.description);
    expect(result?.checks[0]?.met).toBe(true);
  });

  it("undefined for an amplification with no structured requirement", () => {
    const doc = makeDoc({});
    const biokinetic = mergedPhrenicAmplificationCatalog(ref).find(
      (a) => a.id === "biokineticHealing",
    )!;
    expect(
      phrenicAmplificationPrereqResult(doc, "biokineticHealing", biokinetic.description),
    ).toBeUndefined();
  });
});

describe("model/psychicAmplifications: parseFlatPointCost", () => {
  it("parses a single flat cost", () => {
    expect(parseFlatPointCost("1 point")).toBe(1);
    expect(parseFlatPointCost("2 points")).toBe(2);
  });

  it("returns 0 for Phrenic Strike's no-cost label", () => {
    expect(parseFlatPointCost("no cost (requires ≥1 pool point)")).toBe(0);
  });

  it("returns undefined for a choice, multiplier, or formula cost", () => {
    expect(parseFlatPointCost("1 or 2 points")).toBeUndefined();
    expect(parseFlatPointCost("2, 4, or 6 points")).toBeUndefined();
    expect(parseFlatPointCost("1 point per target")).toBeUndefined();
    expect(parseFlatPointCost("points = spell level")).toBeUndefined();
  });
});

describe("model/psychicAmplifications: phrenicAmplificationActions", () => {
  it("empty for no picked amplifications", () => {
    expect(phrenicAmplificationActions(makeDoc({}), ref)).toEqual([]);
  });

  it("one action per picked amplification, in pick order, with cost parsed from costLabel", () => {
    const doc = makeDoc({ psychicAmplifications: ["focusedForce", "biokineticHealing"] });
    const actions = phrenicAmplificationActions(doc, ref);
    expect(actions.map((a) => a.id)).toEqual(["focusedForce", "biokineticHealing"]);
    expect(actions[0]).toMatchObject({ name: "Focused Force", tier: "basic", cost: 1 });
  });

  it("a variable-cost amplification (Dual Amplification) has no flat cost", () => {
    const doc = makeDoc({ psychicAmplifications: ["dualAmplification"] });
    const [action] = phrenicAmplificationActions(doc, ref);
    expect(action?.cost).toBeUndefined();
    expect(action?.tier).toBe("major");
  });

  it("silently skips an unresolvable/stale picked id", () => {
    const doc = makeDoc({ psychicAmplifications: ["not-a-real-amplification", "focusedForce"] });
    const actions = phrenicAmplificationActions(doc, ref);
    expect(actions.map((a) => a.id)).toEqual(["focusedForce"]);
  });
});
