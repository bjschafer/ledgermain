import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, compute, evaluateFormula } from "../src/index.js";
import {
  BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED,
  BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/barbarian.js";

/**
 * The barbarian slice of the prose→Change extraction pipeline,
 * mirroring the fighter pilot's `archetypeEffectsExtracted.test.ts`
 * methodology). Hand- computed fixture tests for
 * `archetype-extracted/barbarian.ts`, verified against the real vendored data
 * slice via `loadRefData`.
 *
 * IMPORTANT difference from the fighter test file: per this wave's task
 * boundary, `archetype-extracted/index.ts` (the aggregator) is NOT touched by
 * this wave — `BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED` is not yet merged into
 * the production `ARCHETYPE_FEATURE_EFFECTS_EXTRACTED` table `collect.ts`
 * actually reads via `resolveArchetypeFeatureEffect`. That means `compute`
 * does NOT yet apply this file's `changes` end-to-end (a later integration
 * pass wires it in, the same one-import-one-spread way fighter's is wired in
 * today). So instead of diffing `compute` output with/without the archetype
 * (the fighter pattern), the formula-correctness tests below build the same
 * `RollData` context `collect.ts` would (via `buildRollData`, the exact
 * function it uses internally) and evaluate each extracted `Change`'s formula
 * directly with `evaluateFormula` — an equally "hand-computed against the real
 * vendored data slice" fixture, just one level below the full `collect.ts`
 * pipeline. The one exception is the suppression-composition case below, which
 * exercises an archetype (Wildborn) whose numeric effect IS already wired into
 * production today via the separate, always-wired `archetype-effects.ts`
 * hand-verified table — that one runs through the real `compute` pipeline
 * end-to-end.
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
  pickChoices?: Record<string, string>;
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
      pickChoices: over.pickChoices,
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
  it("has exactly 161 entries", () => {
    expect(Object.keys(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(161);
  });

  it("every classification key matches a real vendored archetype-feature id", () => {
    for (const id of Object.keys(BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id]).toBeDefined();
    }
  });

  it("blocked entries are the rounds/day-cadence and base-restatement cases", () => {
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

describe("Sharptooth: Scent of Blood grants scent, doubling range to keen scent at L5", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:sharptooth:scent-of-blood:2"]!;
  const formula = entry.changes[0]!.formula;

  it("30 ft. below L5, 60 ft. at L5+", () => {
    expect(evalAtLevel(formula, 2)).toBe(30);
    expect(evalAtLevel(formula, 4)).toBe(30);
    expect(evalAtLevel(formula, 5)).toBe(60);
    expect(evalAtLevel(formula, 12)).toBe(60);
  });

  it("matches the entry's own detail string", () => {
    expect(entry.detail?.(2)).toBe("scent 30 ft.");
    expect(entry.detail?.(5)).toBe("scent 60 ft. (keen scent)");
  });

  it("shows up in compute()'s sheet.senses end-to-end (first sense-target extraction in this pipeline)", () => {
    const sharptooth = archetypeId("Sharptooth");
    const sheet = compute(makeDoc({ level: 5, archetypes: [sharptooth] }), ref);
    const scent = sheet.senses.find((s) => s.kind === "scent");
    expect(scent?.range).toBe(60);
  });
});

describe("Sharptooth: Swim Like a Fish grants a swim speed stepping every 5 levels", () => {
  // Advanced Class Guide: "A sharptooth gains a swim speed of 10 feet. At 5th
  // level and every 5 levels thereafter, her swim speed increases by 5 feet."
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:sharptooth:swim-like-a-fish:1"]!;
  const formula = entry.changes[0]!.formula;

  it("10 ft. at L1-4, 15 at L5, 20 at L10, 30 at L20", () => {
    expect(evalAtLevel(formula, 1)).toBe(10);
    expect(evalAtLevel(formula, 4)).toBe(10);
    expect(evalAtLevel(formula, 5)).toBe(15);
    expect(evalAtLevel(formula, 9)).toBe(15);
    expect(evalAtLevel(formula, 10)).toBe(20);
    expect(evalAtLevel(formula, 20)).toBe(30);
  });

  it("matches the entry's own detail string", () => {
    expect(entry.detail?.(1)).toBe("swim speed 10 ft.");
    expect(entry.detail?.(20)).toBe("swim speed 30 ft.");
  });

  it("shows up in compute()'s sheet.speeds.swim, and only with the archetype", () => {
    const sharptooth = archetypeId("Sharptooth", "barbarian");
    const sheet = compute(makeDoc({ level: 10, archetypes: [sharptooth] }), ref);
    expect(sheet.speeds.swim).toBe(20);
    expect(compute(makeDoc({ level: 10 }), ref).speeds.swim ?? 0).toBe(0);
  });

  it("is paired against Fast Movement, which the hand-authored pairing supplement supplies", () => {
    const feature = ref.archetypeFeatures["barbarian:sharptooth:swim-like-a-fish:1"];
    expect(feature?.pairedBaseFeatureUuid).toBe(
      "Compendium.pf1.class-abilities.Item.9EX00obqhGHcrOdp",
    );
  });
});

describe("Superstitious: Keen Senses grants a level-gated sequence of special senses", () => {
  const entry = BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED["barbarian:superstitious:keen-senses:7"]!;

  it("low-light vision at L7 (formula index 0)", () => {
    const formula = entry.changes[0]!.formula;
    expect(evalAtLevel(formula, 6)).toBe(0);
    expect(evalAtLevel(formula, 7)).toBe(1);
  });

  it("darkvision 60 ft. at L10 (formula index 1, operator add)", () => {
    const formula = entry.changes[1]!.formula;
    expect(entry.changes[1]!.operator).toBe("add");
    expect(evalAtLevel(formula, 9)).toBe(0);
    expect(evalAtLevel(formula, 10)).toBe(60);
  });

  it("scent 30 ft. at L13, blindsense 30 ft. at L16, blindsight 30 ft. at L19", () => {
    expect(evalAtLevel(entry.changes[2]!.formula, 12)).toBe(0);
    expect(evalAtLevel(entry.changes[2]!.formula, 13)).toBe(30);
    expect(evalAtLevel(entry.changes[3]!.formula, 15)).toBe(0);
    expect(evalAtLevel(entry.changes[3]!.formula, 16)).toBe(30);
    expect(evalAtLevel(entry.changes[4]!.formula, 18)).toBe(0);
    expect(evalAtLevel(entry.changes[4]!.formula, 19)).toBe(30);
  });

  it("matches the entry's own detail string across breakpoints", () => {
    expect(entry.detail?.(7)).toBe("low-light vision");
    expect(entry.detail?.(10)).toBe("low-light vision, darkvision 60 ft.");
    expect(entry.detail?.(19)).toBe(
      "low-light vision, darkvision 60 ft., scent, blindsense 30 ft., blindsight 30 ft.",
    );
  });

  it("shows up in compute()'s sheet.senses end-to-end at L19 (all five senses, darkvision using the add-extension idiom)", () => {
    const superstitious = archetypeId("Superstitious");
    const sheet = compute(makeDoc({ level: 19, archetypes: [superstitious] }), ref);
    expect(sheet.senses.find((s) => s.kind === "lowLight")).toBeDefined();
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);
    expect(sheet.senses.find((s) => s.kind === "scent")?.range).toBe(30);
    expect(sheet.senses.find((s) => s.kind === "blindsense")?.range).toBe(30);
    expect(sheet.senses.find((s) => s.kind === "blindsight")?.range).toBe(30);
  });

  it("suppresses base Damage Reduction when paired (no double-count)", () => {
    const superstitious = archetypeId("Superstitious");
    const sheet = compute(makeDoc({ level: 19, archetypes: [superstitious] }), ref);
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature?.applied).toBe(false);
  });
});

describe("BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED shape", () => {
  it("has exactly 14 entries", () => {
    expect(Object.keys(BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(14);
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

  it("Dishonorable (Untamed Rager): +1 CMB/CMD vs. dirty trick at 7th, +2 at 10th, end to end via compute()", () => {
    // "At 7th level and every 3 barbarian levels thereafter, the untamed
    // rager gains a +1 bonus on combat maneuver checks when performing
    // dirty tricks and to her CMD to resist others' dirty tricks." Barbarian
    // has full BAB, so BAB 7/10 at levels 7/10; this file's default ability
    // block (Str 16/+3, Dex 14/+2) feeds cmb (Str only) and cmd (Str + Dex)
    // the same as always.
    const untamedRager = archetypeId("Untamed Rager");
    const at7 = compute(makeDoc({ level: 7, archetypes: [untamedRager] }), ref);
    expect(at7.cmb).toBe(10); // BAB 7 + Str mod 3
    expect(at7.cmd).toBe(22); // 10 + BAB 7 + Str mod 3 + Dex mod 2
    expect(at7.cmbConditionals).toEqual([
      { total: 11, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
    expect(at7.cmdConditionals).toEqual([
      { total: 23, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);

    const at10 = compute(makeDoc({ level: 10, archetypes: [untamedRager] }), ref);
    expect(at10.cmb).toBe(13); // BAB 10 + Str mod 3
    expect(at10.cmbConditionals).toEqual([
      { total: 15, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });
});

describe("Invulnerable Rager: Extreme Endurance fire-or-cold pick (build.pickChoices)", () => {
  // "the barbarian gains 1 point of fire or cold resistance for every three
  // levels beyond 3rd" — 0 at 3rd, 1 at 6th, 2 at 9th. Exercised end to end
  // via compute() since the archetypeFeature choice mechanism is wired in
  // collect.ts's archetype-feature loop (unlike this file's other formula
  // fixtures, which evaluate below the full pipeline — see this file's
  // header comment).
  const invulnerableRager = archetypeId("Invulnerable Rager");
  const featureId = "barbarian:invulnerable-rager:extreme-endurance:3";
  const pickChoiceKey = `archetypeFeature:${featureId}`;

  it("no stored pick: no fire or cold resistance", () => {
    const sheet = compute(makeDoc({ level: 9, archetypes: [invulnerableRager] }), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")).toBeUndefined();
  });

  it("a stale option id (not fire or cold) grants nothing", () => {
    const sheet = compute(
      makeDoc({
        level: 9,
        archetypes: [invulnerableRager],
        pickChoices: { [pickChoiceKey]: "acid" },
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")).toBeUndefined();
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "acid")).toBeUndefined();
  });

  it("fire pick: 0 at L3, 1 at L6, 2 at L9", () => {
    const pickChoices = { [pickChoiceKey]: "fire" };
    const at3 = compute(makeDoc({ level: 3, archetypes: [invulnerableRager], pickChoices }), ref);
    expect(at3.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();

    const at6 = compute(makeDoc({ level: 6, archetypes: [invulnerableRager], pickChoices }), ref);
    expect(at6.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(1);
    expect(at6.defenses?.resistances.find((r) => r.qualifier === "cold")).toBeUndefined();

    const at9 = compute(makeDoc({ level: 9, archetypes: [invulnerableRager], pickChoices }), ref);
    expect(at9.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(2);
  });

  it("cold pick: 1 at L6, applies to cold not fire", () => {
    const pickChoices = { [pickChoiceKey]: "cold" };
    const at6 = compute(makeDoc({ level: 6, archetypes: [invulnerableRager], pickChoices }), ref);
    expect(at6.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(1);
    expect(at6.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });
});
