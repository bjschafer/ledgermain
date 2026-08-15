/**
 * Hand-computed fixture tests for `TRAIT_CHOICES` (`trait-effects-extracted.ts`)
 * and the `collect.ts`/`traitGrantedClassSkills` consumption it feeds — the
 * trait pick-choice namespace's pilot.
 *
 * Deep Cover (Pathfinder Society trait): "Bluff or Disguise (your choice) is
 * a class skill for you." The "always take 10 to assume/maintain your cover
 * identity" clause is unconditional but stays vendored `contextNotes` prose
 * (not this table's concern) — only the choose-one class-skill grant is
 * wired here.
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

const HUMAN = raceId("Human");
const DEEP_COVER = "9QVXtD2lZkIzyBt5";
const PICK_KEY = `trait:${DEEP_COVER}`;

/** Human fighter (no class-skill overlap with Bluff/Disguise), all abilities 10. */
function makeDoc(pickChoices?: Record<string, string>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "trait-choices-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      traits: [DEEP_COVER],
      pickChoices,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Deep Cover: Bluff-or-Disguise class-skill pick", () => {
  it("no stored pick: neither Bluff nor Disguise is a class skill from this trait", () => {
    const sheet = compute(makeDoc(), ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("a stale option id grants nothing", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "int" }), ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("Bluff pick: Bluff becomes a class skill, Disguise does not", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "blf" }), ref);
    expect(sheet.skills.blf!.classSkill).toBe(true);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("Disguise pick: Disguise becomes a class skill, Bluff does not", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "dis" }), ref);
    expect(sheet.skills.dis!.classSkill).toBe(true);
    expect(sheet.skills.blf!.classSkill).toBe(false);
  });

  it("Bluff pick with 1 rank: the usual +3 class-skill bonus applies", () => {
    const doc = makeDoc({ [PICK_KEY]: "blf" });
    const withRank: CharacterDoc = {
      ...doc,
      build: { ...doc.build, skillRanks: { blf: 1 } },
    };
    const sheet = compute(withRank, ref);
    expect(sheet.skills.blf!.classSkillBonus).toBe(3);
  });

  it("without the trait taken at all, a stray pick under its key still grants nothing", () => {
    const doc = makeDoc({ [PICK_KEY]: "blf" });
    const withoutTrait: CharacterDoc = { ...doc, build: { ...doc.build, traits: [] } };
    const sheet = compute(withoutTrait, ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
  });
});
