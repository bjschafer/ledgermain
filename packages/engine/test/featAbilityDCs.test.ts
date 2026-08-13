/**
 * Hand-computed fixture tests for the DC-modifying feats that land on
 * `DerivedSheet.abilityDCs` (`ability-dcs.ts`'s seven-family vocabulary,
 * `abilityDC.<key>` `Change.target`) — Improved Channel (core pack) and
 * Stunning Fist Adept / Quivering Palm Adept (community pack), all wired as
 * `StaticFeatEntry`s in `feat-effects.ts`. Every fixture goes through the
 * full `compute()` pipeline, matching the cookbook's §4 pattern and
 * `abilityDCs.test.ts`'s own style for this family.
 */

import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

function feat(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

/** Human, `classes` as given, abilities defaulting to 10 with `abilities` overrides. */
function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: Partial<Record<AbilityId, number>>;
  feats?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "feat-ability-dc-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Improved Channel", () => {
  it("cleric 5, Cha 14 (+2): base Channel DC 14 (CRB), +2 from the feat -> 16", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "cleric", level: 5 }],
        abilities: { cha: 14 },
        feats: [feat("Improved Channel")],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 16, save: "Will" },
    ]);
  });

  it("on a fighter (prereq-invalid, state-possible: no channel-granting class), produces no channel line and no crash", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 10 }],
        feats: [feat("Improved Channel")],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toBeUndefined();
  });
});

describe("Stunning Fist Adept", () => {
  it("monk 5, Wis 16 (+3): base Stunning Fist DC 15, +1 from the feat -> 16", () => {
    // Base per abilityDCs.test.ts's own Stunning Fist fixture: 10 + 2 + 3 = 15.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 5 }],
        abilities: { wis: 16 },
        feats: [feat("Stunning Fist Adept")],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 16, save: "Fortitude" },
    ]);
  });
});

describe("Quivering Palm Adept", () => {
  it("chained monk 15, Wis 18 (+4): base Quivering Palm DC 21, +2 from the feat -> 23", () => {
    // Base per abilityDCs.test.ts's own Quivering Palm fixture: 10 + 7 + 4 = 21.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 15 }],
        abilities: { wis: 18 },
        feats: [feat("Quivering Palm Adept")],
      }),
      ref,
    );
    const qp = sheet.abilityDCs?.find((d) => d.key === "quiveringPalm");
    expect(qp).toEqual({
      key: "quiveringPalm",
      label: "Quivering Palm DC",
      dc: 23,
      save: "Fortitude",
    });
  });

  it("on a chained monk below 15th (state-possible without the class feature yet), produces no quivering-palm line and no crash", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 10 }],
        abilities: { wis: 18 },
        feats: [feat("Quivering Palm Adept")],
      }),
      ref,
    );
    expect(sheet.abilityDCs?.some((d) => d.key === "quiveringPalm")).toBe(false);
  });
});
