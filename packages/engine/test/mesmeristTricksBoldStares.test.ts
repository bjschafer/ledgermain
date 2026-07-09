import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  MESMERIST_BOLD_STARE_IDS,
  MESMERIST_BOLD_STARES,
  MESMERIST_TRICK_IDS,
  MESMERIST_TRICKS,
} from "../src/index.js";

/**
 * Fixture coverage for mesmerist Tricks + Bold Stares (issue #65
 * follow-through) — the "trick MENU + bold stares" slice the task brief
 * calls for on top of the already-vendored Mesmerist Tricks resource pool
 * (`uses.maxFormula`, unaffected by this table). Both tables are clean-room,
 * hand-authored (see `mesmerist-tricks.ts`/`mesmerist-bold-stares.ts`),
 * `displayOnly` in their entirety, mirroring
 * `monkKiPowersStyleStrikes.test.ts`'s pattern: prove the tables are
 * internally consistent, chosen picks surface in `classFeatures`, and bold
 * stares additionally enrich the Hypnotic Stare `detail` line.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  level: number,
  mesmeristTricks: string[] = [],
  mesmeristBoldStares: string[] = [],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "mesmerist", level }] },
    abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      mesmeristTricks,
      mesmeristBoldStares,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("MESMERIST_TRICKS table", () => {
  it("has 26 OA-core tricks (17 regular + 9 masterful), all displayOnly with no changes", () => {
    expect(MESMERIST_TRICK_IDS.length).toBe(26);
    for (const id of MESMERIST_TRICK_IDS) {
      const trick = MESMERIST_TRICKS[id]!;
      expect(trick.displayOnly).toBe(true);
      expect(trick.changes).toEqual([]);
    }
    const masterful = MESMERIST_TRICK_IDS.filter(
      (id) => MESMERIST_TRICKS[id]!.tier === "masterful",
    );
    expect(masterful.length).toBe(9);
    expect(masterful.every((id) => MESMERIST_TRICKS[id]!.minLevel === 12)).toBe(true);
  });
});

describe("MESMERIST_BOLD_STARES table", () => {
  it("has the 7 OA-core bold stare options, all displayOnly with no changes", () => {
    expect(MESMERIST_BOLD_STARE_IDS.length).toBe(7);
    for (const id of MESMERIST_BOLD_STARE_IDS) {
      const stare = MESMERIST_BOLD_STARES[id]!;
      expect(stare.displayOnly).toBe(true);
      expect(stare.changes).toEqual([]);
    }
  });
});

describe("Mesmerist L12 with chosen tricks + bold stares", () => {
  it("chosen tricks (regular + masterful, both within budget at L12) surface in classFeatures with their action/summary as detail", () => {
    const doc = makeDoc(12, ["astoundingAvoidance", "avianEscape"]);
    const sheet = compute(doc, ref);
    const astounding = sheet.classFeatures.find((f) => f.name === "Astounding Avoidance");
    expect(astounding).toBeDefined();
    expect(astounding!.classTag).toBe("mesmerist");
    expect(astounding!.detail).toBe(
      `${MESMERIST_TRICKS.astoundingAvoidance!.actionNote} — ${MESMERIST_TRICKS.astoundingAvoidance!.summary}`,
    );
    expect(astounding!.origin).toEqual({ kind: "trick", label: "Trick" });
    const avianEscape = sheet.classFeatures.find((f) => f.name === "Avian Escape");
    expect(avianEscape).toBeDefined();
  });

  it("chosen bold stares surface as their own classFeatures row AND enrich the Hypnotic Stare detail", () => {
    const doc = makeDoc(12, [], ["disorientation", "timidity"]);
    const sheet = compute(doc, ref);
    const disorientation = sheet.classFeatures.find((f) => f.name === "Disorientation");
    expect(disorientation).toBeDefined();
    expect(disorientation!.origin).toEqual({ kind: "stare", label: "Bold Stare" });

    const hypnoticStare = sheet.classFeatures.find((f) => f.name === "Hypnotic Stare");
    expect(hypnoticStare).toBeDefined();
    expect(hypnoticStare!.detail).toContain("also on attack rolls (Disorientation)");
    expect(hypnoticStare!.detail).toContain("also on damage rolls (Timidity)");
  });

  it("no bold stares chosen: Hypnotic Stare detail is unchanged from the base penalty label", () => {
    const doc = makeDoc(12);
    const sheet = compute(doc, ref);
    const hypnoticStare = sheet.classFeatures.find((f) => f.name === "Hypnotic Stare");
    expect(hypnoticStare?.detail).not.toContain(";");
  });

  it("an unrecognized/stale trick or stare id is silently skipped, not crashed on", () => {
    const doc = makeDoc(12, ["not-a-real-trick"], ["not-a-real-stare"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.featureId === "trick:not-a-real-trick")).toBe(false);
    expect(sheet.classFeatures.some((f) => f.featureId === "stare:not-a-real-stare")).toBe(false);
  });

  it("a non-mesmerist character with a stale field gets nothing granted", () => {
    const doc = makeDoc(0, ["astoundingAvoidance"]);
    doc.identity.classes = [{ tag: "rogueUnchained", level: 12 }];
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Astounding Avoidance")).toBe(false);
  });

  it("the Mesmerist Tricks resource pool rides the vendored uses.maxFormula, unaffected by the picked menu", () => {
    // Cha 18 (+4): max(1, floor(12/2)) + 4 = 10/day.
    const doc = makeDoc(12, ["astoundingAvoidance"]);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const pool = pools.find((p) => p.classTag === "mesmerist" && p.name === "Mesmerist Tricks");
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(10);
    expect(pool!.per).toBe("day");
  });
});
