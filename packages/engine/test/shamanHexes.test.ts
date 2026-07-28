/**
 * Hand-computed fixture tests for the GENERAL shaman-hex table (issue #65,
 * #74) — mirrors `witchHexes.test.ts` exactly. Every hex in
 * `SHAMAN_GENERAL_HEXES` is `displayOnly` with `changes: []` (see that
 * file's doc comment — no ACG general shaman hex grants an unconditional
 * flat number this engine safely targets: every entry is either
 * foe/ally-targeted, an activated limited-daily-use ability, or a
 * feat/skill grant this engine has no honest Change target for), so
 * `collectModifiers` should never emit a numeric modifier for one. What IS
 * exercised: gating on actual shaman levels, unknown-id tolerance, spirit-
 * scoped ids being skipped by this loop (they resolve through
 * `shaman-spirits.ts` instead, never through `resolveGeneralShamanHex`),
 * and surfacing a picked general hex through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `witchHexes.test.ts`/`magusArcana.test.ts`.
 *
 * All published numbers cited in `shaman-hexes.ts`'s `contextNotes` were
 * verified against aonprd.com's live "Shaman Hexes" index
 * (https://aonprd.com/ShamanHexes.aspx) during authoring, cross-checked
 * against `packages/data-pipeline/data/shaman-hexes.json`'s vendored prose
 * — both sources agreed with zero discrepancies (Advanced Class Guide pp.
 * 36-37 for the 12 core entries; Heroes from the Fringe p. 8 for Draconic
 * Resilience/Intimidating Display/Wings; Legacy of the First World p. 17
 * for Silkstring Snare).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";
import { SHAMAN_GENERAL_HEXES, SHAMAN_GENERAL_HEX_IDS } from "../src/shaman-hexes.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeShaman(level: number, shamanHexes?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "shaman", level }],
    },
    abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 18, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      shamanSpirit: "battle",
      ...(shamanHexes ? { shamanHexes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      activeBuffs: [],
      conditions: [],
      resources: {},
    },
  } as CharacterDoc;
}

function hexFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "hex")
    .map((f) => f.name)
    .sort();
}

describe("SHAMAN_GENERAL_HEXES table", () => {
  it("every hex is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of SHAMAN_GENERAL_HEX_IDS) {
      const hex = SHAMAN_GENERAL_HEXES[id]!;
      expect(hex.displayOnly).toBe(true);
      expect(hex.changes).toEqual([]);
    }
  });

  it("covers all 16 vendored general shaman hexes, minLevel 2 (no major/grand split)", () => {
    expect(SHAMAN_GENERAL_HEX_IDS.length).toBe(16);
    expect(SHAMAN_GENERAL_HEX_IDS.length).toBe(Object.keys(ref.shamanHexes).length);
    for (const id of SHAMAN_GENERAL_HEX_IDS) {
      expect(SHAMAN_GENERAL_HEXES[id]!.minLevel).toBe(2);
    }
  });

  it("includes well-known entries by their vendored (snake_case) ids", () => {
    expect(SHAMAN_GENERAL_HEXES.evil_eye?.name).toBe("Evil Eye");
    expect(SHAMAN_GENERAL_HEXES.ward?.name).toBe("Ward");
    expect(SHAMAN_GENERAL_HEXES.draconic_resilience?.name).toBe("Draconic Resilience");
    expect(SHAMAN_GENERAL_HEXES.silkstring_snare?.name).toBe("Silkstring Snare");
  });
});

describe("general shaman hexes (collectModifiers)", () => {
  it("a chosen displayOnly general hex contributes no numeric modifier", () => {
    const doc = makeShaman(6, ["evil_eye", "ward", "fetish"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "evil_eye" || m.sourceId === "ward")).toBe(false);
  });

  it("a spirit-scoped hex id (not the general catalog) is skipped by this loop without crashing", () => {
    const doc = makeShaman(6, ["battle:battleMaster"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("unknown/stale hex ids are skipped, never crash", () => {
    const doc = makeShaman(6, ["not-a-real-hex"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-shaman with a stale shamanHexes field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeShaman(0, ["evil_eye"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "evil_eye")).toBe(false);
  });
});

describe("general shaman hexes (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen general hex is surfaced with origin.kind 'hex'", () => {
    const doc = makeShaman(12, ["evil_eye", "fetish"]);
    expect(hexFeatureNames(doc)).toEqual(["Evil Eye", "Fetish"]);
  });

  it("no hex chosen surfaces nothing", () => {
    const doc = makeShaman(6);
    expect(hexFeatureNames(doc)).toEqual([]);
  });

  it("carries the hex's hand-authored summary as detail", () => {
    const doc = makeShaman(6, ["evil_eye"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "hex");
    expect(feature?.detail).toBe(SHAMAN_GENERAL_HEXES.evil_eye!.summary);
  });

  it("collectGrantedFeatures gates on shaman level (0 for a non-shaman)", () => {
    const doc: CharacterDoc = {
      ...makeShaman(0, ["evil_eye"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "hex")).toBe(false);
  });
});
