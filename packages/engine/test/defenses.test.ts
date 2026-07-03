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

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  race?: string;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Human"),
      classes: over.classes,
    },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } as const;

describe("compute: defenses (issue #21)", () => {
  it("a character with no DR/resistance/SR sources has no defenses line at all", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 5 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("barbarian L13 gets hand-authored DR 3/— (1 at L7, +1 every 3 levels)", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarian", level: 13 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);

    // classFeatures list shows the "DR 3/—" detail string alongside the grant.
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature).toBeDefined();
    expect(feature!.detail).toBe("3/—");

    // and the defenses line carries the same number with provenance.
    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 3,
        qualifier: "—",
        components: [{ source: "Damage Reduction", sourceId: "barbarian-dr", type: "untyped", value: 3, applied: true }],
      },
    ]);
    expect(sheet.defenses!.resistances).toEqual([]);
    expect(sheet.defenses!.sr).toBeUndefined();
  });

  it("barbarian below L7 has no DR yet", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarian", level: 6 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("Diamond Soul (monk L13, vendored spellResist change) routes into sr = 10 + level", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 13 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);

    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.sr).toBeDefined();
    expect(sheet.defenses!.sr!.total).toBe(23);
    expect(sheet.defenses!.sr!.components).toEqual([
      { source: "Diamond Soul", sourceId: expect.any(String), type: "base", value: 23, applied: true },
    ]);
  });

  it("a custom (user-authored) buff granting fire resistance 10 flows through with provenance, no special-casing", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "buff-1",
          name: "Resist Energy (Fire)",
          changes: [{ formula: "10", target: "eres.fire", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);

    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([]);
    expect(sheet.defenses!.resistances).toEqual([
      {
        total: 10,
        qualifier: "fire",
        components: [
          { source: "Resist Energy (Fire)", sourceId: "buff-1", type: "untyped", value: 10, applied: true },
        ],
      },
    ]);
    expect(sheet.defenses!.sr).toBeUndefined();
  });

  it("a custom buff granting DR/magic combines with barbarian DR/— as separate qualifiers", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 13 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "buff-2",
          name: "Stoneskin (homebrew changes)",
          changes: [{ formula: "10", target: "dr.magic", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);

    expect(sheet.defenses!.dr).toHaveLength(2);
    const byQualifier = Object.fromEntries(sheet.defenses!.dr.map((d) => [d.qualifier, d.total]));
    expect(byQualifier).toEqual({ "—": 3, magic: 10 });
  });
});
