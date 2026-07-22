import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, compute, evaluateFormula } from "../src/index.js";
import {
  BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED,
  BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/barbarian.js";

/**
 * Issue #45 (barbarian slice of the prose→Change extraction pipeline, mirroring
 * the fighter pilot's `archetypeEffectsExtracted.test.ts` methodology). Hand-
 * computed fixture tests for `archetype-extracted/barbarian.ts`, verified
 * against the real vendored data slice via `loadRefData()`.
 *
 * IMPORTANT difference from the fighter test file: per this wave's task
 * boundary, `archetype-extracted/index.ts` (the aggregator) is NOT touched by
 * this wave — `BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED` is not yet merged into
 * the production `ARCHETYPE_FEATURE_EFFECTS_EXTRACTED` table `collect.ts`
 * actually reads via `resolveArchetypeFeatureEffect`. That means `compute()`
 * does NOT yet apply this file's `changes` end-to-end (a later integration
 * pass wires it in, the same one-import-one-spread way fighter's is wired in
 * today). So instead of diffing `compute()` output with/without the
 * archetype (the fighter pattern), the formula-correctness tests below build
 * the same `RollData` context `collect.ts` would (via `buildRollData`, the
 * exact function it uses internally) and evaluate each extracted `Change`'s
 * formula directly with `evaluateFormula` — an equally "hand-computed against
 * the real vendored data slice" fixture, just one level below the full
 * `collect.ts` pipeline. The one exception is the suppression-composition
 * case below, which exercises an archetype (Wildborn) whose numeric effect
 * IS already wired into production today via the separate, always-wired
 * `archetype-effects.ts` hand-verified table — that one runs through the
 * real `compute()` pipeline end-to-end.
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

function makeDoc(over: {
  level: number;
  archetypes?: string[];
  gear?: CharacterDoc["build"]["gear"];
  abilities?: CharacterDoc["abilities"];
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
      classes: [{ tag: "barbarian", level: over.level }],
    },
    abilities: over.abilities ?? { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 12 },
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** `evaluateFormula` against the same RollData shape `collect.ts` builds for archetype effects. */
function evalAtLevel(
  formula: string,
  level: number,
  opts?: { gear?: CharacterDoc["build"]["gear"]; abilities?: CharacterDoc["abilities"] },
): number {
  const doc = makeDoc({ level, gear: opts?.gear, abilities: opts?.abilities });
  const rollData = buildRollData(doc, ref);
  return evaluateFormula(formula, rollData);
}

const LIGHT_ARMOR: NonNullable<CharacterDoc["build"]["gear"]>[number] = {
  equipped: true,
  name: "Studded Leather",
  armor: { slot: "armor", ac: 3, type: 1 },
};
const MEDIUM_ARMOR: NonNullable<CharacterDoc["build"]["gear"]>[number] = {
  equipped: true,
  name: "Chain Shirt",
  armor: { slot: "armor", ac: 4, type: 2 },
};
const HEAVY_ARMOR: NonNullable<CharacterDoc["build"]["gear"]>[number] = {
  equipped: true,
  name: "Full Plate",
  armor: { slot: "armor", ac: 9, type: 3 },
};

describe("classification table covers every vendored barbarian archetype feature", () => {
  it("has exactly 149 entries", () => {
    expect(Object.keys(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(149);
  });

  it("every classification key matches a real vendored archetype-feature id", () => {
    for (const id of Object.keys(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id]).toBeDefined();
    }
  });

  it("blocked entries are the rounds/day-cadence and suspected-mispairing cases", () => {
    const blocked = Object.entries(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, e]) => e.bucket === "blocked")
      .map(([id]) => id);
    expect(blocked.sort()).toEqual(
      [
        "barbarian:elemental-kin:elemental-fury:3",
        "barbarian:hateful-rager:feed-the-rage:5",
        "barbarian:hateful-rager:reduced-rage:2",
        "barbarian:jungle-rager:damage-reduction:8",
        "barbarian:mad-dog:rage:4",
        "barbarian:raging-cannibal:consume-vigor:2",
        "barbarian:sharptooth:swim-like-a-fish:1",
        "barbarian:shoanti-burn-rider:give-me-fire:5",
      ].sort(),
    );
  });

  it("the four hand-verified ids are classified but never duplicated into the extracted table", () => {
    const handVerifiedIds = [
      "barbarian:urban-barbarian:controlled-rage:1",
      "barbarian:invulnerable-rager:invulnerability:2",
      "barbarian:savage-barbarian:natural-toughness:7",
      "barbarian:wildborn:damage-reduction:7",
    ];
    for (const id of handVerifiedIds) {
      expect(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
      expect(BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("suspected vendored-data issue: Jungle Rager's 'Damage reduction' entry is unpaired", () => {
  it("carries no pairedBaseFeatureUuid despite restating base Damage Reduction verbatim", () => {
    const feature = ref.archetypeFeatures["barbarian:jungle-rager:damage-reduction:8"];
    expect(feature).toBeDefined();
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Wildborn (barbarian): hand-verified Damage Reduction reflavor — suppression composition case", () => {
  // Wildborn's own DR replacement is hand-verified in archetype-effects.ts
  // (already wired into production, unlike this wave's own extracted table —
  // see this file's header comment) and its archetype feature pairs 1:1 to
  // the base "Damage Reduction" class feature's uuid, so `activeArchetypeSwaps`
  // suppresses the base grant for free. This exercises exactly the
  // suppression machinery barbarian-specific note 3 describes, end-to-end
  // through the real `compute()` pipeline.
  const wildborn = archetypeId("Wildborn");

  it("base Damage Reduction shows applied: false, replaced by Wildborn's own feature", () => {
    const sheet = compute(makeDoc({ level: 10, archetypes: [wildborn] }), ref);
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature?.applied).toBe(false);
    expect(feature?.replacedBy).toBeDefined();
  });

  it("Wildborn's own DR number appears in its archetype feature detail (1 + floor((level-7)/3))", () => {
    const sheet = compute(makeDoc({ level: 10, archetypes: [wildborn] }), ref);
    const archEntry = sheet.activeArchetypes.find((a) => a.id === wildborn);
    const own = archEntry?.features.find((f) => f.name === "Damage reduction");
    expect(own?.detail).toBe("DR 2/—"); // 1 + floor((10-7)/3) = 2
    expect(own?.effectSource).toBe("verified");
  });

  it("without the archetype, base Damage Reduction is unsuppressed", () => {
    const sheet = compute(makeDoc({ level: 10 }), ref);
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature?.applied).toBe(true);
    expect(feature?.replacedBy).toBeUndefined();
  });
});

describe("Armored Hulk: Armored Swiftness grants +5 ft. land speed while medium/heavy armored", () => {
  const entry =
    BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:armored-hulk:armored-swiftness:2"]!;
  const formula = entry.changes[0]!.formula;

  it("0 unarmored, 0 in light armor, +5 in medium armor, +5 in heavy armor", () => {
    expect(evalAtLevel(formula, 5)).toBe(0);
    expect(evalAtLevel(formula, 5, { gear: [LIGHT_ARMOR] })).toBe(0);
    expect(evalAtLevel(formula, 5, { gear: [MEDIUM_ARMOR] })).toBe(5);
    expect(evalAtLevel(formula, 5, { gear: [HEAVY_ARMOR] })).toBe(5);
  });

  it("matches the entry's own detail string", () => {
    expect(entry.detail?.(5)).toBe("+5 ft. land speed (medium/heavy armor)");
  });
});

describe("Armored Hulk: Improved Armored Swiftness grants +10 ft. land speed in any armor short of a heavy load", () => {
  const entry =
    BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:armored-hulk:improved-armored-swiftness:5"]!;
  const formula = entry.changes[0]!.formula;

  it("0 unarmored, +10 in light/medium/heavy armor", () => {
    expect(evalAtLevel(formula, 10)).toBe(0);
    expect(evalAtLevel(formula, 10, { gear: [LIGHT_ARMOR] })).toBe(10);
    expect(evalAtLevel(formula, 10, { gear: [MEDIUM_ARMOR] })).toBe(10);
    expect(evalAtLevel(formula, 10, { gear: [HEAVY_ARMOR] })).toBe(10);
  });
});

describe("Deepwater Rager: Strong Lungs adds Con mod to Intimidate", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:deepwater-rager:strong-lungs:1"]!;
  const formula = entry.changes[0]!.formula;

  it("Con 14 (+2 mod) yields +2", () => {
    expect(
      evalAtLevel(formula, 1, {
        abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 12 },
      }),
    ).toBe(2);
  });

  it("Con 18 (+4 mod) yields +4", () => {
    expect(
      evalAtLevel(formula, 1, {
        abilities: { str: 16, dex: 14, con: 18, int: 10, wis: 10, cha: 12 },
      }),
    ).toBe(4);
  });
});

describe("Fearsome Defender: Bloodlust adds Cha mod to initiative", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:fearsome-defender:bloodlust:5"]!;
  const formula = entry.changes[0]!.formula;

  it("Cha 12 (+1 mod) yields +1", () => {
    expect(
      evalAtLevel(formula, 5, {
        abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 12 },
      }),
    ).toBe(1);
  });
});

describe("Fearsome Defender: Silent Threat grants scaling general Intimidate", () => {
  const entry =
    BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:fearsome-defender:silent-threat:3"]!;
  const formula = entry.changes[0]!.formula;

  it("+1 at L3, +2 at L6, +4 at L12", () => {
    expect(evalAtLevel(formula, 3)).toBe(1);
    expect(evalAtLevel(formula, 6)).toBe(2);
    expect(evalAtLevel(formula, 12)).toBe(4);
  });

  it("matches the entry's own detail string at L6", () => {
    expect(entry.detail?.(6)).toBe("+2 Intimidate");
  });
});

describe("Pack Rager: Bonus Feat grants a scaling teamwork-feat count", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:pack-rager:bonus-feat:2"]!;
  const formula = entry.changes[0]!.formula;

  it("1 at L2, 2 at L6, 5 at L18", () => {
    expect(evalAtLevel(formula, 2)).toBe(1);
    expect(evalAtLevel(formula, 6)).toBe(2);
    expect(evalAtLevel(formula, 18)).toBe(5);
  });
});

describe("Savage Barbarian: Naked Courage grants dodge AC while unarmored", () => {
  const entry =
    BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:savage-barbarian:naked-courage:3"]!;
  const formula = entry.changes[0]!.formula;

  it("+1 unarmored at L3, 0 in light armor, +2 unarmored at L9", () => {
    expect(evalAtLevel(formula, 3)).toBe(1);
    expect(evalAtLevel(formula, 3, { gear: [LIGHT_ARMOR] })).toBe(0);
    expect(evalAtLevel(formula, 9)).toBe(2);
  });
});

describe("Superstitious: Sixth Sense grants scaling general initiative", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:superstitious:sixth-sense:3"]!;
  const formula = entry.changes[0]!.formula;

  it("+1 at L3, +2 at L6, +3 at L9", () => {
    expect(evalAtLevel(formula, 3)).toBe(1);
    expect(evalAtLevel(formula, 6)).toBe(2);
    expect(evalAtLevel(formula, 9)).toBe(3);
  });
});

describe("Untamed Rager: Feral Appearance grants scaling general Intimidate (no dropped clauses)", () => {
  const entry =
    BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:untamed-rager:feral-appearance:3"]!;
  const formula = entry.changes[0]!.formula;

  it("+1 at L3, +2 at L6, +6 at L18", () => {
    expect(evalAtLevel(formula, 3)).toBe(1);
    expect(evalAtLevel(formula, 6)).toBe(2);
    expect(evalAtLevel(formula, 18)).toBe(6);
  });

  it("matches the entry's own detail string at L18", () => {
    expect(entry.detail?.(18)).toBe("+6 Intimidate");
  });
});

describe("BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED shape", () => {
  it("has exactly 9 entries", () => {
    expect(Object.keys(BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(9);
  });

  it("every extracted id is classified numeric in the audit table", () => {
    for (const id of Object.keys(BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every entry carries a non-empty provenance sentence", () => {
    for (const entry of Object.values(BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(entry.provenance.length).toBeGreaterThan(10);
    }
  });
});
