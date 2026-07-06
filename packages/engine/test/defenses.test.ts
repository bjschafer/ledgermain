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
  gear?: CharacterDoc["build"]["gear"];
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
      gear: over.gear ?? [],
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
        components: [
          {
            source: "Damage Reduction",
            sourceId: "barbarian-dr",
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
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
      {
        source: "Diamond Soul",
        sourceId: expect.any(String),
        type: "base",
        value: 23,
        applied: true,
      },
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
          {
            source: "Resist Energy (Fire)",
            sourceId: "buff-1",
            type: "untyped",
            value: 10,
            applied: true,
          },
        ],
      },
    ]);
    expect(sheet.defenses!.sr).toBeUndefined();
  });

  it("a conditional dr Change that evaluates to 0 does NOT materialize a spurious Defenses line (issue #45 finding 2, the dr-at-0 wart)", () => {
    // Reproduces the exact shape of Warlord's Sun-Bronzed Skin: DR 5/- gated
    // on being unarmored (@armor.type == 0). An armored character with no
    // other DR/resistance/SR source used to still get a "DR/— 0" seal,
    // because the conditional Change is collected even when it evaluates to
    // 0 (only ac/skill-shaped always-rendered totals safely absorb a zero
    // component; defenses.ts only materializes the section at all when a
    // dr/resistance/sr entry exists).
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 19 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      // Wearing armor -> @armor.type is 2 (medium) -> the condition is false -> 0.
      gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("the same conditional dr Change DOES show once its condition is met", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 19 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      // No gear at all -> @armor.type resolves to 0 (unarmored).
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 5,
        qualifier: "—",
        components: [
          {
            source: "Sun-Bronzed Skin",
            sourceId: "sun-bronzed-skin",
            type: "untyped",
            value: 5,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("a conditional dr Change that evaluates to 0 doesn't suppress a real DR source on another qualifier", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 13 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeDefined();
    // Barbarian DR (—) still wins the qualifier (3 > 0); Sun-Bronzed Skin's
    // now-0 contribution stays visible as a losing, unapplied component (same
    // strike-through convention as typed-bonus stacking) rather than either
    // disappearing silently or spuriously creating its OWN "—" entry.
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 3,
        qualifier: "—",
        components: [
          {
            source: "Sun-Bronzed Skin",
            sourceId: "sun-bronzed-skin",
            type: "untyped",
            value: 0,
            applied: false,
          },
          {
            source: "Damage Reduction",
            sourceId: "barbarian-dr",
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
      },
    ]);
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
