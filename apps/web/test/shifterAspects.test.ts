import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  chosenShifterAspectCount,
  expectedShifterAspectCount,
  hasShifterAspect,
  isAspectMinorFormActive,
  shifterAspectsNeedWarning,
  shifterLevel,
  toggleAspectMinorForm,
  toggleShifterAspect,
} from "../src/model/shifterAspects.js";

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  shifterAspects?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "shifter", level: 10 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      shifterAspects: over.shifterAspects,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/shifterAspects: toggleShifterAspect (known aspects)", () => {
  it("adds an aspect id not yet known", () => {
    const doc = toggleShifterAspect(makeDoc({}), "bear");
    expect(doc.build.shifterAspects).toEqual(["bear"]);
    expect(hasShifterAspect(doc, "bear")).toBe(true);
  });

  it("removes an aspect id already known, and deactivates its minor form if active", () => {
    let doc = toggleShifterAspect(makeDoc({}), "bear");
    doc = toggleAspectMinorForm(doc, "bear");
    expect(isAspectMinorFormActive(doc, "bear")).toBe(true);

    doc = toggleShifterAspect(doc, "bear"); // remove known aspect
    expect(doc.build.shifterAspects).toEqual([]);
    expect(isAspectMinorFormActive(doc, "bear")).toBe(false);
  });
});

describe("model/shifterAspects: budget math", () => {
  it("shifterLevel returns 0 for a non-shifter", () => {
    expect(shifterLevel(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }))).toBe(0);
  });

  it("expected count follows 1st/5th/10th/15th/20th (5 total)", () => {
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 1 }] }))).toBe(
      1,
    );
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 4 }] }))).toBe(
      1,
    );
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 5 }] }))).toBe(
      2,
    );
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 10 }] }))).toBe(
      3,
    );
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 15 }] }))).toBe(
      4,
    );
    expect(expectedShifterAspectCount(makeDoc({ classes: [{ tag: "shifter", level: 20 }] }))).toBe(
      5,
    );
  });

  it("chosenShifterAspectCount + warning behavior, never blocks", () => {
    const doc = makeDoc({
      classes: [{ tag: "shifter", level: 1 }],
      shifterAspects: ["bear", "bull"],
    });
    expect(chosenShifterAspectCount(doc)).toBe(2);
    expect(shifterAspectsNeedWarning(doc)).toBe(true);
    const doc2 = toggleShifterAspect(doc, "stag");
    expect(doc2.build.shifterAspects?.length).toBe(3);
  });
});

describe("model/shifterAspects: minor-form buff toggle", () => {
  it("activating builds an ActiveBuff snapshot from SHIFTER_ASPECTS' changes", () => {
    const doc = toggleAspectMinorForm(makeDoc({}), "bear");
    expect(doc.live.activeBuffs.length).toBe(1);
    const buff = doc.live.activeBuffs[0]!;
    expect(buff.buffId).toBe("shifter-aspect:bear");
    expect(buff.name).toBe("Bear (minor form)");
    expect(buff.changes.length).toBe(1);
  });

  it("toggling again deactivates it", () => {
    let doc = toggleAspectMinorForm(makeDoc({}), "bear");
    expect(isAspectMinorFormActive(doc, "bear")).toBe(true);
    doc = toggleAspectMinorForm(doc, "bear");
    expect(isAspectMinorFormActive(doc, "bear")).toBe(false);
    expect(doc.live.activeBuffs).toEqual([]);
  });

  it("unknown aspect id is a no-op", () => {
    const doc = toggleAspectMinorForm(makeDoc({}), "not-a-real-aspect");
    expect(doc.live.activeBuffs).toEqual([]);
  });

  it("two different aspects can both be active at once (chimeric-aspect scenario, unenforced count cap)", () => {
    let doc = toggleAspectMinorForm(makeDoc({}), "bear");
    doc = toggleAspectMinorForm(doc, "falcon");
    expect(doc.live.activeBuffs.length).toBe(2);
  });
});
