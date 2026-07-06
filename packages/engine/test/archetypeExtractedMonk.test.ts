import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  MONK_ARCHETYPE_EFFECTS_EXTRACTED,
  MONK_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/monk.js";
import { ARCHETYPE_FEATURE_EFFECTS, compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 (monk wave, 2026-07-06): fixture tests for
 * `archetype-extracted/monk.ts`. Unlike every other class file in this
 * pipeline, monk's own extraction pass found ZERO new numeric entries (see
 * that file's doc comment for why) — so these tests exercise the two things
 * that ARE load-bearing for this class: the Ironskin Monk `blocked`
 * composition trap (the documented reason this whole class needed the
 * `blocked` bucket invented in the first place) and the classification
 * table's completeness/precedence guarantees, same posture
 * `archetypeEffectsExtracted.test.ts` uses for fighter's own
 * "blocked composition trap" describe block.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
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
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
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
  };
}

describe("Monk archetype extraction, wave 2: zero new numeric entries (disclosed finding)", () => {
  it("the extracted table is empty — every real number found was situational, subsystem, or already hand-verified", () => {
    expect(Object.keys(MONK_ARCHETYPE_EFFECTS_EXTRACTED)).toEqual([]);
  });

  it("every one of the 60 vendored monk archetype features has a classification entry", () => {
    const monkFeatures = Object.values(ref.archetypeFeatures).filter((f) => f.classTag === "monk");
    expect(monkFeatures.length).toBe(60);
    for (const f of monkFeatures) {
      expect(MONK_ARCHETYPE_FEATURE_CLASSIFICATION[f.id]).toBeDefined();
    }
  });

  it("bucket counts match the audited totals (1 numeric, 2 blocked, 5 situational, 52 subsystem)", () => {
    const counts: Record<"numeric" | "situational" | "subsystem" | "blocked", number> = {
      numeric: 0,
      situational: 0,
      subsystem: 0,
      blocked: 0,
    };
    for (const entry of Object.values(MONK_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 1, situational: 5, subsystem: 52, blocked: 2 });
  });
});

describe("Nornkith (monk): Nimble Reflexes stays hand-verified, not duplicated in the extracted table", () => {
  it("resolves through the hand-verified table", () => {
    const resolved = resolveArchetypeFeatureEffect("monk:nornkith:nimble-reflexes:3");
    expect(resolved?.source).toBe("verified");
    expect(ARCHETYPE_FEATURE_EFFECTS["monk:nornkith:nimble-reflexes:3"]).toBeDefined();
    expect(MONK_ARCHETYPE_EFFECTS_EXTRACTED["monk:nornkith:nimble-reflexes:3"]).toBeUndefined();
  });

  it("+2 Reflex saves at L3, applied on the sheet", () => {
    const nornkith = archetypeId("Nornkith", "monk");
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 3 }], archetypes: [nornkith] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "monk", level: 3 }] }), ref);
    expect(sheet.saves.ref.total - withoutArchetype.saves.ref.total).toBe(2);
  });
});

describe("blocked composition trap: Ironskin Monk (Maneuver Master) — the documented case (issue #45)", () => {
  const maneuverMaster = archetypeId("Maneuver Master", "monk");

  it("Iron Skin and Tough as Nails have no entry in either effects table", () => {
    expect(resolveArchetypeFeatureEffect("monk:maneuver-master:iron-skin-1:1")).toBeUndefined();
    expect(resolveArchetypeFeatureEffect("monk:maneuver-master:tough-as-nails:6")).toBeUndefined();
  });

  it("both are classified blocked, citing the AC Bonus (MNK) Wis-to-AC and Fast Movement landSpeed traps", () => {
    const ironSkin = MONK_ARCHETYPE_FEATURE_CLASSIFICATION["monk:maneuver-master:iron-skin-1:1"];
    const toughAsNails =
      MONK_ARCHETYPE_FEATURE_CLASSIFICATION["monk:maneuver-master:tough-as-nails:6"];
    expect(ironSkin?.bucket).toBe("blocked");
    expect(toughAsNails?.bucket).toBe("blocked");
    expect(ironSkin?.note).toContain("Wis-to-AC");
    expect(toughAsNails?.note).toContain("landSpeed");
  });

  it("base monk's AC Bonus (Wis-to-AC) and Fast Movement (landSpeed) keep applying in full — neither table piles a number on top", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 6 }], archetypes: [maneuverMaster] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "monk", level: 6 }] }), ref);
    // Neither AC (Wis-to-AC) nor land speed (Fast Movement) is suppressed or
    // double-counted by the (nonexistent) Ironskin Monk table entries — the
    // archetype's presence changes nothing about these two numbers, which is
    // the RAW-imperfect but composition-SAFE behavior `blocked` guarantees.
    expect(sheet.ac.normal).toBe(withoutArchetype.ac.normal);
    expect(sheet.speeds.land).toBe(withoutArchetype.speeds.land);
  });
});
