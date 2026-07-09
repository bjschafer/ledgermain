import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, PHRENIC_AMPLIFICATION_IDS, PHRENIC_AMPLIFICATIONS } from "../src/index.js";

/**
 * Fixture coverage for psychic Phrenic Amplifications (issue #65
 * follow-through — `psychic-disciplines.ts` shipped bonus spells/phrenic
 * pool ability and explicitly deferred amplifications). Clean-room,
 * hand-authored (see `phrenic-amplifications.ts`), `displayOnly` in its
 * entirety (every amplification is a cast-time rider on a linked spell, no
 * standing Change this engine's stacking pipeline could safely apply),
 * mirroring `mesmeristTricksBoldStares.test.ts`'s pattern.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(level: number, psychicAmplifications: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "psychic", level }] },
    abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 12 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      psychicAmplifications,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("PHRENIC_AMPLIFICATIONS table", () => {
  it("has 31 amplifications (22 basic + 9 major), all displayOnly with no changes", () => {
    expect(PHRENIC_AMPLIFICATION_IDS.length).toBe(31);
    for (const id of PHRENIC_AMPLIFICATION_IDS) {
      const amp = PHRENIC_AMPLIFICATIONS[id]!;
      expect(amp.displayOnly).toBe(true);
      expect(amp.changes).toEqual([]);
    }
    const major = PHRENIC_AMPLIFICATION_IDS.filter(
      (id) => PHRENIC_AMPLIFICATIONS[id]!.tier === "major",
    );
    expect(major.length).toBe(9);
    expect(major.every((id) => PHRENIC_AMPLIFICATIONS[id]!.minLevel === 11)).toBe(true);
  });
});

describe("Psychic L12 with chosen amplifications", () => {
  it("chosen amplifications (basic + major, both within budget at L12) surface in classFeatures with cost + summary as detail", () => {
    const doc = makeDoc(12, ["biokineticHealing", "dispellingPulse"]);
    const sheet = compute(doc, ref);
    const biokinetic = sheet.classFeatures.find((f) => f.name === "Biokinetic Healing");
    expect(biokinetic).toBeDefined();
    expect(biokinetic!.classTag).toBe("psychic");
    expect(biokinetic!.detail).toBe(
      `${PHRENIC_AMPLIFICATIONS.biokineticHealing!.costLabel} — ${PHRENIC_AMPLIFICATIONS.biokineticHealing!.summary}`,
    );
    expect(biokinetic!.origin).toEqual({ kind: "amplification", label: "Phrenic Amplification" });
    const dispelling = sheet.classFeatures.find((f) => f.name === "Dispelling Pulse");
    expect(dispelling).toBeDefined();
  });

  it("an unrecognized/stale amplification id is silently skipped, not crashed on", () => {
    const doc = makeDoc(12, ["not-a-real-amplification"]);
    const sheet = compute(doc, ref);
    expect(
      sheet.classFeatures.some((f) => f.featureId === "amplification:not-a-real-amplification"),
    ).toBe(false);
  });

  it("a non-psychic character with a stale field gets nothing granted", () => {
    const doc = makeDoc(0, ["biokineticHealing"]);
    doc.identity.classes = [{ tag: "mesmerist", level: 12 }];
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Biokinetic Healing")).toBe(false);
  });
});
