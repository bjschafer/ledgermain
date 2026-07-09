/**
 * Hand-computed fixture tests for witch hexes (issue #65). Every hex in
 * `WITCH_HEXES` is `displayOnly` with `changes: []` (see that file's doc
 * comment — no APG hex grants an unconditional flat number this engine
 * safely targets), so `collectModifiers` should never emit a numeric
 * modifier for one. What IS exercised: gating on actual witch levels,
 * unknown-id tolerance, and surfacing picked hexes through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `magusArcana.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { hexesForTier, witchHexDC, WITCH_HEXES, WITCH_HEX_IDS } from "../src/witch-hexes.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeWitch(level: number, witchHexes?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "witch", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 18, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(witchHexes ? { witchHexes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
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

describe("WITCH_HEXES table", () => {
  it("every hex is displayOnly with no changes (no unconditional flat number)", () => {
    for (const id of WITCH_HEX_IDS) {
      const hex = WITCH_HEXES[id]!;
      expect(hex.displayOnly).toBe(true);
      expect(hex.changes).toEqual([]);
    }
  });

  it("includes well-known regular/major/grand hexes", () => {
    expect(WITCH_HEXES.evilEye?.name).toBe("Evil Eye");
    expect(WITCH_HEXES.ward?.name).toBe("Ward");
    expect(WITCH_HEXES.agony?.tier).toBe("major");
    expect(WITCH_HEXES.lifeGiver?.tier).toBe("grand");
  });

  it("covers the 27 APG core hexes (14 regular + 8 major + 5 grand; UM hexes out of scope)", () => {
    expect(WITCH_HEX_IDS.length).toBe(27);
    expect(hexesForTier("hex").length).toBe(14);
    expect(hexesForTier("major").length).toBe(8);
    expect(hexesForTier("grand").length).toBe(5);
  });

  it("regular hexes have minLevel 1, major hexes 10, grand hexes 18", () => {
    for (const h of hexesForTier("hex")) expect(h.minLevel).toBe(1);
    for (const h of hexesForTier("major")) expect(h.minLevel).toBe(10);
    for (const h of hexesForTier("grand")) expect(h.minLevel).toBe(18);
  });
});

describe("witchHexDC", () => {
  it("level 1 witch, Int 18 (+4) — DC 14", () => {
    expect(witchHexDC(1, 4)).toBe(14);
  });

  it("level 7 witch, Int 18 (+4) — DC 17 (10 + 3 + 4)", () => {
    expect(witchHexDC(7, 4)).toBe(17);
  });

  it("level 0 (non-witch) — DC 0", () => {
    expect(witchHexDC(0, 4)).toBe(0);
  });
});

describe("witch hexes (collectModifiers)", () => {
  it("a chosen displayOnly hex contributes no numeric modifier", () => {
    const doc = makeWitch(6, ["evilEye", "ward", "cauldron"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "evilEye" || m.sourceId === "ward")).toBe(false);
  });

  it("unknown hex ids are skipped, never crash", () => {
    const doc = makeWitch(6, ["not-a-real-hex"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-witch with a stale witchHexes field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeWitch(0, ["evilEye"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "evilEye")).toBe(false);
  });
});

describe("witch hexes (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen hex is surfaced with origin.kind 'hex', regardless of tier", () => {
    const doc = makeWitch(18, ["evilEye", "agony", "lifeGiver"]);
    expect(hexFeatureNames(doc)).toEqual(["Agony", "Evil Eye", "Life Giver"]);
  });

  it("no hex chosen surfaces nothing", () => {
    const doc = makeWitch(6);
    expect(hexFeatureNames(doc)).toEqual([]);
  });

  it("carries the hex's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeWitch(6, ["evilEye"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "hex");
    expect(feature?.detail).toBe(WITCH_HEXES.evilEye!.summary);
  });

  it("collectGrantedFeatures gates on witch level (0 for a non-witch)", () => {
    const doc: CharacterDoc = {
      ...makeWitch(0, ["evilEye"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "hex")).toBe(false);
  });

  it("hexes are NOT patron-scoped — every chosen hex surfaces regardless of build.witchPatron", () => {
    const doc: CharacterDoc = {
      ...makeWitch(6, ["evilEye"]),
      build: { ...makeWitch(6, ["evilEye"]).build, witchPatron: "healing" },
    };
    expect(hexFeatureNames(doc)).toEqual(["Evil Eye"]);
  });
});
