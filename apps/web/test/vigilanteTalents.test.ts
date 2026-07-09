import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  chosenVigilanteSocialTalentCount,
  chosenVigilanteTalentCount,
  expectedVigilanteSocialTalentCount,
  expectedVigilanteTalentCount,
  hasVigilanteSocialTalent,
  hasVigilanteTalent,
  toggleVigilanteSocialTalent,
  toggleVigilanteTalent,
  vigilanteLevel,
  vigilanteSocialTalentsNeedWarning,
  vigilanteTalentsNeedWarning,
} from "../src/model/vigilanteTalents.js";
import { setVigilanteSpecialization } from "../src/model/doc.js";

function makeDoc(over: {
  classes?: { tag: string; level: number }[];
  vigilanteSocialTalents?: string[];
  vigilanteTalents?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "vigilante", level: 7 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vigilanteSocialTalents: over.vigilanteSocialTalents,
      vigilanteTalents: over.vigilanteTalents,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/doc: setVigilanteSpecialization", () => {
  it("sets and clears the specialization", () => {
    const doc = setVigilanteSpecialization(makeDoc({}), "avenger");
    expect(doc.build.vigilanteSpecialization).toBe("avenger");
    const cleared = setVigilanteSpecialization(doc, null);
    expect(cleared.build.vigilanteSpecialization).toBeUndefined();
  });
});

describe("model/vigilanteTalents: social talent toggle + budget", () => {
  it("adds/removes a social talent id", () => {
    const doc = toggleVigilanteSocialTalent(makeDoc({}), "renown");
    expect(doc.build.vigilanteSocialTalents).toEqual(["renown"]);
    expect(hasVigilanteSocialTalent(doc, "renown")).toBe(true);
    const doc2 = toggleVigilanteSocialTalent(doc, "renown");
    expect(doc2.build.vigilanteSocialTalents).toEqual([]);
  });

  it("expected count follows 1st + every 2 levels (10 by 20th)", () => {
    expect(
      expectedVigilanteSocialTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 1 }] })),
    ).toBe(1);
    expect(
      expectedVigilanteSocialTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 3 }] })),
    ).toBe(2);
    expect(
      expectedVigilanteSocialTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 20 }] })),
    ).toBe(10);
  });

  it("chosenVigilanteSocialTalentCount + warning behavior", () => {
    const doc = makeDoc({
      classes: [{ tag: "vigilante", level: 1 }],
      vigilanteSocialTalents: ["renown", "doubleTime"],
    });
    expect(chosenVigilanteSocialTalentCount(doc)).toBe(2);
    expect(vigilanteSocialTalentsNeedWarning(doc)).toBe(true);
  });
});

describe("model/vigilanteTalents: vigilante talent toggle + budget", () => {
  it("adds/removes a vigilante talent id, independent of social pool", () => {
    const doc = toggleVigilanteTalent(makeDoc({}), "shadowsSpeed");
    expect(doc.build.vigilanteTalents).toEqual(["shadowsSpeed"]);
    expect(hasVigilanteTalent(doc, "shadowsSpeed")).toBe(true);
    expect(doc.build.vigilanteSocialTalents).toBeUndefined();
  });

  it("expected count follows 2nd + every 2 levels (10 by 20th)", () => {
    expect(
      expectedVigilanteTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 1 }] })),
    ).toBe(0);
    expect(
      expectedVigilanteTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 2 }] })),
    ).toBe(1);
    expect(
      expectedVigilanteTalentCount(makeDoc({ classes: [{ tag: "vigilante", level: 20 }] })),
    ).toBe(10);
  });

  it("chosenVigilanteTalentCount + warning behavior, never blocks", () => {
    const doc = makeDoc({
      classes: [{ tag: "vigilante", level: 2 }],
      vigilanteTalents: ["shadowsSpeed", "armorSkin"],
    });
    expect(chosenVigilanteTalentCount(doc)).toBe(2);
    expect(vigilanteTalentsNeedWarning(doc)).toBe(true);
    const doc2 = toggleVigilanteTalent(doc, "evasion");
    expect(doc2.build.vigilanteTalents?.length).toBe(3);
  });

  it("vigilanteLevel returns 0 for a non-vigilante", () => {
    expect(vigilanteLevel(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }))).toBe(0);
    expect(expectedVigilanteTalentCount(makeDoc({ classes: [{ tag: "fighter", level: 5 }] }))).toBe(
      0,
    );
  });
});
