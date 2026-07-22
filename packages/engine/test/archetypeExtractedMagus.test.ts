import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  MAGUS_ARCHETYPE_EFFECTS_EXTRACTED,
  MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/magus.js";

/**
 * Issue #45 (magus slice of the prose->Change extraction pipeline, 2026-07-06).
 *
 * TEST APPROACH: magus's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute()` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures therefore
 * (1) assert directly against `MAGUS_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData()` is used to sanity-check that
 * every archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 *
 * Magus has NO suppression-composition case analogous to fighter's Armor
 * Training reflavors: every magus archetype feature this pass extracted a
 * Change for is either unpaired (Iron-Ring Striker's Bonus Feat) or paired
 * to a base feature that itself carries zero vendored `changes` (Magus
 * Arcana, Improved/Greater Spell Combat, True Magus — all confirmed
 * `changes: []` in class-features.json), so there's nothing to suppress and
 * no `applied: false` to observe. This is noted explicitly rather than
 * forcing an artificial case.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "magus",
  );
  if (!entry) throw new Error(`magus archetype not found: ${name}`);
  return entry.id;
}

// The 31 archetypes this wave's audit actually covered (see
// MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION's own archetypeId values) — the
// archetype data source repoint (config.ts ARCHETYPE_REPO/ARCHETYPE_SHA)
// brought magus from 31 to 39 archetypes, so "every vendored magus feature"
// is no longer this table's job; classifying the other 8 is a follow-up
// wave, not a regression of this one.
const AUDITED_MAGUS_ARCHETYPE_IDS = new Set(
  Object.values(MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
);

describe("MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every feature of the 31 originally-audited magus archetypes exactly once", () => {
    expect(AUDITED_MAGUS_ARCHETYPE_IDS.size).toBe(31);
    const magusFeatureIds = Object.values(ref.archetypeFeatures)
      .filter(
        (f) => f.archetypeId.startsWith("magus:") && AUDITED_MAGUS_ARCHETYPE_IDS.has(f.archetypeId),
      )
      .map((f) => f.id);
    expect(magusFeatureIds.length).toBe(150);
    for (const id of magusFeatureIds) {
      expect(MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(150);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry", () => {
    const numericIds = Object.entries(MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(8);
    for (const id of numericIds) {
      expect(MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(MAGUS_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("Armored Battlemage: Armor Training reflavor on a 5-level cadence", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Armored Battlemage")).toBe("magus:armored-battlemage");
  });

  it("clamp(1 + floor((unlevel-3)/5), 0, 4) mDexA/acpA — +1 at L3, +2 at L8, +3 at L13, +4 at L18, capped at L20", () => {
    const id = "magus:armored-battlemage:armor-training:3";
    const [mDexA, acpA] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(mDexA!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(13)).toBe(3);
    expect(at(18)).toBe(4);
    expect(at(20)).toBe(4); // capped, no further tier past 18th in the published text
    expect(evaluateFormula(acpA!.formula, { class: { unlevel: 18 } })).toBe(-4);
  });
});

describe("Esoteric: AC Bonus grants a scaling dodge bonus while light/unarmored", () => {
  it("+1 dodge AC at L7 (armor.type 0 = none), +2 at L13, 0 while armored (armor.type >= 2)", () => {
    const id = "magus:esoteric:ac-bonus:7";
    const [acChange] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.type).toBe("dodge");
    const at = (level: number, armorType: number) =>
      evaluateFormula(acChange!.formula, { class: { unlevel: level }, armor: { type: armorType } });
    expect(at(7, 0)).toBe(1); // unarmored
    expect(at(7, 1)).toBe(1); // light armor
    expect(at(13, 1)).toBe(2); // light armor, 13th level
    expect(at(13, 2)).toBe(0); // medium armor — condition fails
  });
});

describe("Iron-Ring Striker: Bonus Feat grants an unpaired, additive bonus-feat count", () => {
  it("1 + floor((unlevel-5)/6) — 1 at L5, 2 at L11, 3 at L17", () => {
    const id = "magus:iron-ring-striker:bonus-feat:5";
    const [feats] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(5)).toBe(1);
    expect(at(11)).toBe(2);
    expect(at(17)).toBe(3);
  });

  it("has no paired base-feature slot — magus has no baseline bonus-feat progression to swap", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "magus:iron-ring-striker:bonus-feat:5",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Kensai: Iaijutsu grants a flat Int-modifier initiative bonus", () => {
  it("max(0, int.mod) — unconditional, unrelated to level", () => {
    const id = "magus:kensai:iaijutsu:7";
    const [initChange] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(initChange!.target).toBe("init");
    expect(evaluateFormula(initChange!.formula, { abilities: { int: { mod: 4 } } })).toBe(4);
    expect(evaluateFormula(initChange!.formula, { abilities: { int: { mod: -2 } } })).toBe(0); // minimum 0
  });
});

describe("Myrmidarch: Armor Mastery grants conditional DR while armored", () => {
  it("DR 5/- only while wearing armor (armor.type >= 1)", () => {
    const id = "magus:myrmidarch:armor-mastery:20";
    const [drChange] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(drChange!.target).toBe("dr");
    expect(evaluateFormula(drChange!.formula, { armor: { type: 0 } })).toBe(0); // unarmored: no DR
    expect(evaluateFormula(drChange!.formula, { armor: { type: 1 } })).toBe(5); // light armor
    expect(evaluateFormula(drChange!.formula, { armor: { type: 3 } })).toBe(5); // heavy armor
  });
});

describe("Myrmidarch: Armor Training reflavor on a reduced 2-tier cadence", () => {
  it("+1 mDexA/acpA at L8, +2 at L14 (no further scaling)", () => {
    const id = "magus:myrmidarch:armor-training:8";
    const [mDexA, acpA] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(evaluateFormula(mDexA!.formula, { class: { unlevel: 8 } })).toBe(1);
    expect(evaluateFormula(mDexA!.formula, { class: { unlevel: 13 } })).toBe(1);
    expect(evaluateFormula(mDexA!.formula, { class: { unlevel: 14 } })).toBe(2);
    expect(evaluateFormula(mDexA!.formula, { class: { unlevel: 20 } })).toBe(2);
    expect(evaluateFormula(acpA!.formula, { class: { unlevel: 14 } })).toBe(-2);
  });
});

describe("Spell Dancer: Dance of Avoidance / Greater Dance of Avoidance insight AC", () => {
  it("+2 insight AC at L7 while light/unarmored, 0 while armored", () => {
    const id = "magus:spell-dancer:dance-of-avoidance:7";
    const [acChange] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.type).toBe("insight");
    expect(evaluateFormula(acChange!.formula, { armor: { type: 1 } })).toBe(2);
    expect(evaluateFormula(acChange!.formula, { armor: { type: 2 } })).toBe(0);
  });

  it("Greater Dance of Avoidance raises the same insight bonus to +4 under the identical condition", () => {
    const id = "magus:spell-dancer:greater-dance-of-avoidance:13";
    const [acChange] = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.type).toBe("insight");
    expect(evaluateFormula(acChange!.formula, { armor: { type: 0 } })).toBe(4);
    expect(evaluateFormula(acChange!.formula, { armor: { type: 3 } })).toBe(0);
  });

  it("both entries share the 'insight' stacking type, so typed-bonus stacking (highest-within-type) naturally yields +4 total once both are active — not +6", () => {
    // This is a documentation-level assertion about the stacking contract
    // (verified generically by stacking.test.ts's typed-bonus-stacking
    // suite); recorded here so a future aggregator-wiring pass can see why
    // two independent flat Changes for the "same" progressive bonus are
    // safe without extra arithmetic.
    const l7 = MAGUS_ARCHETYPE_EFFECTS_EXTRACTED["magus:spell-dancer:dance-of-avoidance:7"]!;
    const l13 =
      MAGUS_ARCHETYPE_EFFECTS_EXTRACTED["magus:spell-dancer:greater-dance-of-avoidance:13"]!;
    expect(l7.changes[0]!.type).toBe(l13.changes[0]!.type);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through magus's tables when explicitly given as overrides", () => {
  it("falls back to the magus extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "magus:kensai:iaijutsu:7",
      {},
      MAGUS_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("init");
  });

  it("returns undefined for a magus feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "magus:bladebound:arcane-pool:1",
        {},
        MAGUS_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "magus:eldritch-scion:spell-combat:1",
        {},
        MAGUS_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: Arcane Pool size/formula divergences (issue #45, magus)", () => {
  it("Bladebound's Arcane Pool restates a different (1/3-level) size formula than the vendored 1/2-level one — recorded as blocked, not backfilled", () => {
    const entry = MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION["magus:bladebound:arcane-pool:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(MAGUS_ARCHETYPE_EFFECTS_EXTRACTED["magus:bladebound:arcane-pool:1"]).toBeUndefined();
  });

  it("Deep Marshal's Bound by Tradition explicitly resizes the pool to 1/3 level — also blocked", () => {
    const entry = MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION["magus:deep-marshal:bound-by-tradition:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      MAGUS_ARCHETYPE_EFFECTS_EXTRACTED["magus:deep-marshal:bound-by-tradition:1"],
    ).toBeUndefined();
  });

  it("the real vendored Arcane Pool class feature carries zero changes[] (only a uses.maxFormula resource) — confirms there is nothing for a Change to double-count against directly, the risk is purely formula/size divergence", () => {
    const arcanePool = Object.values(ref.classFeatures).find((f) => f.name === "Arcane Pool");
    expect(arcanePool?.changes ?? []).toEqual([]);
    expect(arcanePool?.uses?.maxFormula).toBe(
      "max(1, floor(@class.unlevel / 2)) + @abilities.int.mod",
    );
  });
});
