/**
 * Hand-computed fixture tests for alchemist discoveries (issue #65). Every
 * discovery in `ALCHEMIST_DISCOVERIES` is `displayOnly` with `changes: []`
 * (see that file's doc comment), so `collectModifiers` should never emit a
 * numeric modifier for one. What IS exercised: gating on actual alchemist
 * levels, unknown-id tolerance, and surfacing picked discoveries through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `magusArcana.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { ALCHEMIST_DISCOVERIES, ALCHEMIST_DISCOVERY_IDS } from "../src/alchemist-discoveries.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeAlchemist(level: number, alchemistDiscoveries?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "alchemist", level }],
    },
    abilities: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(alchemistDiscoveries ? { alchemistDiscoveries } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function discoveryFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "discovery")
    .map((f) => f.name)
    .sort();
}

describe("ALCHEMIST_DISCOVERIES table", () => {
  it("every discovery is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of ALCHEMIST_DISCOVERY_IDS) {
      const discovery = ALCHEMIST_DISCOVERIES[id]!;
      expect(discovery.displayOnly).toBe(true);
      expect(discovery.changes).toEqual([]);
    }
  });

  it("includes well-known APG entries", () => {
    expect(ALCHEMIST_DISCOVERIES.acidBomb?.name).toBe("Acid Bomb");
    expect(ALCHEMIST_DISCOVERIES.feralMutagen?.name).toBe("Feral Mutagen");
    expect(ALCHEMIST_DISCOVERIES.infusion?.name).toBe("Infusion");
  });

  it("includes the Cognatogen line (Ultimate Magic, same numeric shape as Mutagen per RAW)", () => {
    expect(ALCHEMIST_DISCOVERIES.cognatogen?.name).toBe("Cognatogen");
    expect(ALCHEMIST_DISCOVERIES.greaterCognatogen?.minLevel).toBe(12);
    expect(ALCHEMIST_DISCOVERIES.grandCognatogen?.minLevel).toBe(16);
  });

  it("covers 41 discoveries (29 APG core + 10 selected UM + 2 selected UC)", () => {
    expect(ALCHEMIST_DISCOVERY_IDS.length).toBe(41);
  });

  it("every entry has a minLevel of at least 2 (no discovery before 2nd level)", () => {
    for (const id of ALCHEMIST_DISCOVERY_IDS) {
      expect(ALCHEMIST_DISCOVERIES[id]!.minLevel).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("alchemist discoveries (collectModifiers)", () => {
  it("a chosen displayOnly discovery contributes no numeric modifier", () => {
    const doc = makeAlchemist(6, ["acidBomb", "cognatogen", "infusion"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "acidBomb" || m.sourceId === "cognatogen")).toBe(false);
  });

  it("unknown discovery ids are skipped, never crash", () => {
    const doc = makeAlchemist(6, ["not-a-real-discovery"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-alchemist with a stale alchemistDiscoveries field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeAlchemist(0, ["acidBomb"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "acidBomb")).toBe(false);
  });
});

describe("alchemist discoveries (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen discovery is surfaced with origin.kind 'discovery'", () => {
    const doc = makeAlchemist(6, ["acidBomb", "infusion"]);
    expect(discoveryFeatureNames(doc)).toEqual(["Acid Bomb", "Infusion"]);
  });

  it("no discovery chosen surfaces nothing", () => {
    const doc = makeAlchemist(6);
    expect(discoveryFeatureNames(doc)).toEqual([]);
  });

  it("carries the discovery's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeAlchemist(6, ["acidBomb"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "discovery");
    expect(feature?.detail).toBe(ALCHEMIST_DISCOVERIES.acidBomb!.summary);
  });

  it("collectGrantedFeatures gates on alchemist level (0 for a non-alchemist)", () => {
    const doc: CharacterDoc = {
      ...makeAlchemist(0, ["acidBomb"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "discovery")).toBe(false);
  });
});
