import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import type { CharacterDoc } from "@pf1/schema";

import {
  compute,
  evaluateFormula,
  isTargetApplied,
  resolveArchetypeFeatureEffect,
} from "../src/index.js";
import {
  BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED,
  BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/brawler.js";

/**
 * The brawler slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: this class's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) against the exact published-rules numbers cited in each
 * entry's `provenance`, and (3) verify `resolveArchetypeFeatureEffect`
 * resolves correctly when explicitly given this file's tables as its override
 * arguments. `loadRefData` sanity-checks that every id this file references
 * actually exists in the real vendored data slice, same posture as
 * `archetypeExtractedMagus.test.ts`.
 */
const ref = loadRefData();

/** The same normalization the sweep's batch files used: tags out, whitespace squashed. */
function strippedDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;|&ndash;/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored brawler archetype feature exactly once", () => {
    const brawlerFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("brawler:"))
      .map((f) => f.id);
    expect(brawlerFeatureIds.length).toBe(62);
    for (const id of brawlerFeatureIds) {
      expect(
        BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION[id],
        `missing classification for ${id}`,
      ).toBeDefined();
    }
    expect(Object.keys(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(62);
  });

  it("every classified id actually starts with the brawler: tag", () => {
    for (const id of Object.keys(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(id.startsWith("brawler:")).toBe(true);
    }
  });

  it("spans all 19 vendored brawler archetypes", () => {
    const audited = new Set(
      Object.values(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(audited.size).toBe(19);
  });

  it("bucket counts match this pass's audit: 2 numeric, 19 situational, 37 subsystem, 4 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 2, situational: 19, subsystem: 37, blocked: 4 });
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(2);
    for (const id of numericIds) {
      expect(BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("provenance: every entry's provenance is a verbatim substring of the vendored description", () => {
  for (const [id, entry] of Object.entries(BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(id, () => {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored archetype feature id ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id}: provenance drifted from vendored text`,
      ).toBe(true);
    });
  }
});

describe("every extracted change lands on an applied target with a real formula", () => {
  for (const [id, entry] of Object.entries(BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(id, () => {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("Steel-Breaker: Sunder Training grants maneuver-scoped cmb/cmd, end to end via compute()", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(level: number, archetypes: string[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "brawler", level }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        archetypes,
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("+2 CMB/CMD vs. sunder only, at 3rd level (disarm not yet granted)", () => {
    // "At 3rd level, a steel-breaker receives additional training in sunder
    // combat maneuvers. She gains a +2 bonus when attempting a sunder combat
    // maneuver checks and a +2 bonus to her CMD when defending against this
    // maneuver." Brawler has full BAB, so BAB 3 at level 3.
    const steelBreaker = Object.values(ref.archetypes).find(
      (a) => a.name === "Steel-Breaker" && a.classTag === "brawler",
    );
    expect(steelBreaker?.id).toBe("brawler:steel-breaker");
    const sheet = compute(makeDoc(3, [steelBreaker!.id]), ref);
    expect(sheet.cmb).toBe(3);
    expect(sheet.cmd).toBe(13);
    expect(sheet.cmbConditionals).toEqual([
      { total: 5, categories: ["sunder"], labels: ["sunder"] },
    ]);
    expect(sheet.cmdConditionals).toEqual([
      { total: 15, categories: ["sunder"], labels: ["sunder"] },
    ]);
  });

  it("+3 CMB/CMD vs. sunder, +2 CMB/CMD vs. disarm, at 7th level", () => {
    // "At 7th level, these bonuses increase by 1, and she gains a +2 bonus
    // on disarm combat maneuver checks and a +2 bonus to her CMD when
    // defending against a disarm maneuver." BAB 7 at level 7; base brawler's
    // own AC Bonus (BRA) class feature also contributes a +1 dodge bonus to
    // CMD (its own tier starting at 4th level, unrelated to this archetype),
    // so the CMD headline includes it while CMB (dodge doesn't apply there)
    // does not.
    const steelBreaker = Object.values(ref.archetypes).find(
      (a) => a.name === "Steel-Breaker" && a.classTag === "brawler",
    );
    const sheet = compute(makeDoc(7, [steelBreaker!.id]), ref);
    expect(sheet.cmb).toBe(7);
    expect(sheet.cmd).toBe(18);
    expect(sheet.cmbConditionals).toEqual([
      { total: 10, categories: ["sunder"], labels: ["sunder"] },
      { total: 9, categories: ["disarm"], labels: ["disarm"] },
    ]);
    expect(sheet.cmdConditionals).toEqual([
      { total: 21, categories: ["sunder"], labels: ["sunder"] },
      { total: 20, categories: ["disarm"], labels: ["disarm"] },
    ]);
  });
});

describe("Verdant Grappler: Phytological Anatomy grants a flat +2 vs. save categories", () => {
  it("archetype exists in the vendored data", () => {
    const entry = Object.values(ref.archetypes).find(
      (a) => a.name === "Verdant Grappler" && a.classTag === "brawler",
    );
    expect(entry?.id).toBe("brawler:verdant-grappler");
  });

  it("flat 2, allSavingThrows, scoped to mind/paralysis/poison/polymorph/stun (sleep is a child of mind)", () => {
    const id = "brawler:verdant-grappler:phytological-anatomy:11";
    const [saveChange] = BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(saveChange!.target).toBe("allSavingThrows");
    expect(saveChange!.type).toBe("untyped");
    expect(saveChange!.saveCategories).toEqual([
      "mind",
      "paralysis",
      "poison",
      "polymorph",
      "stun",
    ]);
    // Flat and level-independent: +2 at the granting level and at 20th alike.
    expect(evaluateFormula(saveChange!.formula, { class: { unlevel: 11 } })).toBe(2);
    expect(evaluateFormula(saveChange!.formula, { class: { unlevel: 20 } })).toBe(2);
    expect(evaluateFormula(saveChange!.formula, {})).toBe(2);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through this class's tables when explicitly given as overrides", () => {
  it("falls back to the brawler extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "brawler:verdant-grappler:phytological-anatomy:11",
      {},
      BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("allSavingThrows");
  });

  it("returns undefined for a brawler feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "brawler:wild-child:animal-companion:1",
        {},
        BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "brawler:living-avalanche:unyielding:4",
        {},
        BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: base-feature double-count and copy-paste traps, recorded not backfilled", () => {
  it("Unyielding restates the base AC Bonus (BRA) number, which already carries vendored dodge ac/cmd changes — blocked, no extracted entry", () => {
    const entry = BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION["brawler:living-avalanche:unyielding:4"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED["brawler:living-avalanche:unyielding:4"],
    ).toBeUndefined();
    // The double-count risk is real: the vendored base feature models this
    // exact number as dodge-typed ac + cmd changes, and dodge stacks with dodge.
    const acBonus = Object.values(ref.classFeatures).find((f) => f.name === "AC Bonus (BRA)");
    expect(acBonus).toBeDefined();
    expect(acBonus!.changes.length).toBeGreaterThan(0);
    expect(acBonus!.changes.every((ch) => ch.type === "dodge")).toBe(true);
    expect(new Set(acBonus!.changes.map((ch) => ch.target))).toEqual(new Set(["ac", "cmd"]));
    // ...and the archetype feature carries no vendored pairing that would
    // strike the base row through and make a re-extraction safe.
    expect(
      ref.archetypeFeatures["brawler:living-avalanche:unyielding:4"]?.pairedBaseFeatureUuid,
    ).toBeUndefined();
  });

  it("Lesser Flexibility resizes the martial flexibility pool against the real vendored uses.maxFormula — blocked", () => {
    const entry = BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION["brawler:bouncer:lesser-flexibility:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED["brawler:bouncer:lesser-flexibility:1"],
    ).toBeUndefined();
    const martialFlexibility = Object.values(ref.classFeatures).find(
      (f) => f.name === "Martial Flexibility",
    );
    expect(martialFlexibility?.uses?.maxFormula).toBe("3 + floor(@class.unlevel / 2)");
  });

  it("Opportunist's vendored description is the base Maneuver Training text (a copy-paste error) — blocked, no number guessed", () => {
    const entry =
      BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION["brawler:snakebite-striker:opportunist:11"];
    expect(entry?.bucket).toBe("blocked");
    const feature = ref.archetypeFeatures["brawler:snakebite-striker:opportunist:11"];
    expect(feature?.level).toBe(11);
    // The internal inconsistency this pass recorded: an 11th-level feature
    // whose text opens with the 3rd-level maneuver-training boilerplate.
    expect(
      strippedDescription(feature!.description ?? "").startsWith(
        "At 3rd level, a brawler can select one combat maneuver",
      ),
    ).toBe(true);
  });

  it("Venomous Strike's unarmed-damage-die downsize rides the hardcoded unarmedDamageDie table — blocked", () => {
    const entry = BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION["brawler:venomfist:venomous-strike:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED["brawler:venomfist:venomous-strike:1"],
    ).toBeUndefined();
  });
});
