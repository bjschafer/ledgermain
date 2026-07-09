import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenInvestigatorTalentCount,
  expectedInvestigatorTalentCount,
  hasInvestigatorTalent,
  investigatorLevel,
  investigatorTalentsNeedWarning,
  toggleInvestigatorTalent,
} from "../src/model/investigatorTalents.js";

const ref = loadRefData();

function idByFeatName(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  feats?: string[];
  investigatorTalents?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: "",
      classes: over.classes ?? [{ tag: "investigator", level: 7 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      investigatorTalents: over.investigatorTalents,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/investigatorTalents: toggleInvestigatorTalent", () => {
  it("adds a talent id not yet present", () => {
    const doc = toggleInvestigatorTalent(makeDoc({}), "quickStudy");
    expect(doc.build.investigatorTalents).toEqual(["quickStudy"]);
    expect(hasInvestigatorTalent(doc, "quickStudy")).toBe(true);
  });

  it("removes a talent id already present", () => {
    const doc = toggleInvestigatorTalent(
      makeDoc({ investigatorTalents: ["quickStudy", "empathy"] }),
      "quickStudy",
    );
    expect(doc.build.investigatorTalents).toEqual(["empathy"]);
  });
});

describe("model/investigatorTalents: budget math", () => {
  it("investigatorLevel returns 0 for a non-investigator", () => {
    expect(investigatorLevel(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }))).toBe(0);
  });

  it("expected count follows 3rd + every 2 levels (9 by 20th)", () => {
    expect(
      expectedInvestigatorTalentCount(
        makeDoc({ classes: [{ tag: "investigator", level: 1 }] }),
        ref,
      ),
    ).toBe(0);
    expect(
      expectedInvestigatorTalentCount(
        makeDoc({ classes: [{ tag: "investigator", level: 3 }] }),
        ref,
      ),
    ).toBe(1);
    expect(
      expectedInvestigatorTalentCount(
        makeDoc({ classes: [{ tag: "investigator", level: 5 }] }),
        ref,
      ),
    ).toBe(2);
    expect(
      expectedInvestigatorTalentCount(
        makeDoc({ classes: [{ tag: "investigator", level: 20 }] }),
        ref,
      ),
    ).toBe(9);
  });

  it("each Extra Investigator Talent feat adds one more", () => {
    const extraId = idByFeatName("Extra Investigator Talent");
    const doc = makeDoc({
      classes: [{ tag: "investigator", level: 3 }],
      feats: [extraId, extraId],
    });
    expect(expectedInvestigatorTalentCount(doc, ref)).toBe(3); // 1 base + 2 extra
  });

  it("chosenInvestigatorTalentCount counts current picks", () => {
    const doc = makeDoc({ investigatorTalents: ["quickStudy", "empathy"] });
    expect(chosenInvestigatorTalentCount(doc)).toBe(2);
  });

  it("warns only when overspent, never blocks", () => {
    const underDoc = makeDoc({
      classes: [{ tag: "investigator", level: 3 }],
      investigatorTalents: ["quickStudy"],
    });
    expect(investigatorTalentsNeedWarning(underDoc, ref)).toBe(false);

    const overDoc = makeDoc({
      classes: [{ tag: "investigator", level: 3 }],
      investigatorTalents: ["quickStudy", "empathy"],
    });
    expect(investigatorTalentsNeedWarning(overDoc, ref)).toBe(true);
    // Still allowed to add more — never blocks.
    const doc2 = toggleInvestigatorTalent(overDoc, "deviceTalent");
    expect(doc2.build.investigatorTalents?.length).toBe(3);
  });
});
