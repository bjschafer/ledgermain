import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { baseSpellsKnown, baseSpellsPerDay, compute } from "../src/index.js";

/**
 * Medium (Occult Adventures, 17-class expansion follow-up wave) — the
 * hand-authored 4-level spells-per-day/known tables validated against the
 * published "Table: Medium" / "Table: Medium Spells Known" (legacy.aonprd.com,
 * quoted verbatim during authoring), plus a class-vend smoke test against the
 * real vendored data slice. Lookups scoped by classTag, never bare name.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classes: { tag: string; level: number }[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("MEDIUM_SPELLS_PER_DAY (vs. the published Table: Medium)", () => {
  it("levels 1-3: no spell slots at all (late-start caster)", () => {
    for (let lvl = 1; lvl <= 3; lvl++) {
      for (let spell = 0; spell <= 4; spell++) {
        expect(baseSpellsPerDay("medium", lvl, spell)).toBeNull();
      }
    }
  });

  it("L4: 1 first-level slot, nothing else", () => {
    expect(baseSpellsPerDay("medium", 4, 1)).toBe(1);
    expect(baseSpellsPerDay("medium", 4, 2)).toBeNull();
  });

  it("L5: still 1/-/-/-", () => {
    expect(baseSpellsPerDay("medium", 5, 1)).toBe(1);
    expect(baseSpellsPerDay("medium", 5, 2)).toBeNull();
  });

  it("L10: 2/1/1/-", () => {
    expect(baseSpellsPerDay("medium", 10, 1)).toBe(2);
    expect(baseSpellsPerDay("medium", 10, 2)).toBe(1);
    expect(baseSpellsPerDay("medium", 10, 3)).toBe(1);
    expect(baseSpellsPerDay("medium", 10, 4)).toBeNull();
  });

  it("L13: 3/2/1/1 (first 4th-level slot)", () => {
    expect(baseSpellsPerDay("medium", 13, 1)).toBe(3);
    expect(baseSpellsPerDay("medium", 13, 2)).toBe(2);
    expect(baseSpellsPerDay("medium", 13, 3)).toBe(1);
    expect(baseSpellsPerDay("medium", 13, 4)).toBe(1);
  });

  it("L20: 4/4/3/2, and never any 0- or 5th-level slot column", () => {
    expect(baseSpellsPerDay("medium", 20, 1)).toBe(4);
    expect(baseSpellsPerDay("medium", 20, 2)).toBe(4);
    expect(baseSpellsPerDay("medium", 20, 3)).toBe(3);
    expect(baseSpellsPerDay("medium", 20, 4)).toBe(2);
    expect(baseSpellsPerDay("medium", 20, 0)).toBeNull(); // knacks cast at will
    expect(baseSpellsPerDay("medium", 20, 5)).toBeNull(); // caps at 4th
  });
});

describe("MEDIUM_SPELLS_KNOWN (vs. the published Table: Medium Spells Known)", () => {
  it("L1: 2 knacks known, no leveled spells yet", () => {
    expect(baseSpellsKnown("medium", 1, 0)).toBe(2);
    expect(baseSpellsKnown("medium", 1, 1)).toBeNull();
  });

  it("L4: 4 knacks + 2 first-level known (first leveled spells)", () => {
    expect(baseSpellsKnown("medium", 4, 0)).toBe(4);
    expect(baseSpellsKnown("medium", 4, 1)).toBe(2);
  });

  it("L13: 6/6/5/4/2 (first 4th-level known)", () => {
    expect(baseSpellsKnown("medium", 13, 0)).toBe(6);
    expect(baseSpellsKnown("medium", 13, 1)).toBe(6);
    expect(baseSpellsKnown("medium", 13, 2)).toBe(5);
    expect(baseSpellsKnown("medium", 13, 3)).toBe(4);
    expect(baseSpellsKnown("medium", 13, 4)).toBe(2);
  });

  it("L20: 6/6/6/6/5", () => {
    expect(baseSpellsKnown("medium", 20, 0)).toBe(6);
    expect(baseSpellsKnown("medium", 20, 1)).toBe(6);
    expect(baseSpellsKnown("medium", 20, 2)).toBe(6);
    expect(baseSpellsKnown("medium", 20, 3)).toBe(6);
    expect(baseSpellsKnown("medium", 20, 4)).toBe(5);
  });
});

describe("medium class vend (real vendored data slice)", () => {
  it("medium 8 computes: medium BAB (+6), good Will, poor Fort/Ref", () => {
    const sheet = compute(makeDoc([{ tag: "medium", level: 8 }]), ref);
    expect(sheet.bab).toBe(6); // med: floor(8 * 3/4)
    expect(sheet.saves.will.total).toBe(6); // good base 6 + Wis 0
    expect(sheet.saves.fort.total).toBe(2); // poor base 2 + Con 0
    expect(sheet.saves.ref.total).toBe(2); // poor base 2 + Dex 0
  });

  it("medium has a vendored spell list (387 entries came through the pipeline)", () => {
    const list = ref.spellLists["medium"];
    expect(list).toBeDefined();
    expect(Object.values(list!).flat().length).toBeGreaterThan(300);
  });

  it("spirit machinery is deferred: no per-spirit entries in the vendored classFeatures slice", () => {
    // Spirits are a live/daily seance choice, not a build choice. The upstream
    // Foundry pack DOES ship six standalone `*-spirit.*.yaml` legend entries
    // (archmage/champion/guardian/hierophant/marshal/trickster) plus spirit
    // power entries in `packs/class-abilities/`, but — exactly like the
    // per-mystery and per-discipline YAMLs before hand-authoring — they are
    // NOT linked from the medium class def and do not come through the
    // pipeline into `RefData.classFeatures`. This pins the deferral posture:
    // a follow-up would hand-author them the
    // way `psychic-disciplines.ts` did, with the choice stored in `live.*`.
    const names = new Set(Object.values(ref.classFeatures).map((f) => f.name));
    expect(names.has("Archmage Spirit")).toBe(false);
    // The generic base features the class DOES link are vendored normally.
    expect(names.has("Spirit Bonus")).toBe(true);
    expect(names.has("Spirit Surge")).toBe(true);
  });
});
