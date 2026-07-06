import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_FEATURE_EFFECTS,
  compute,
  evaluateFormula,
  resolveArchetypeFeatureEffect,
} from "../src/index.js";
import {
  WIZARD_ARCHETYPE_EFFECTS_EXTRACTED,
  WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/wizard.js";

/**
 * Issue #45 (wizard slice of the prose→Change extraction pipeline): fixture
 * tests for `archetype-extracted/wizard.ts`, hand-computed against the real
 * vendored data slice via `loadRefData()`, same posture as
 * `archetypeEffectsExtracted.test.ts` (fighter's pilot).
 *
 * IMPORTANT scope note: `wizard.ts` is a standalone per-class file that has
 * NOT been wired into `archetype-extracted/index.ts`'s aggregator yet (that
 * wiring is an explicit hard boundary for this wave — the aggregator is
 * owned by the integration step). That means `compute()`'s real pipeline
 * (which resolves archetype effects through `resolveArchetypeFeatureEffect`
 * using ITS default, production-merged tables) does not yet see
 * `WIZARD_ARCHETYPE_EFFECTS_EXTRACTED` at all. Tests below that need to
 * exercise resolution/precedence for the new wizard table pass it in
 * explicitly as `resolveArchetypeFeatureEffect`'s override parameter — the
 * exact same pattern the fighter test file already uses for its synthetic
 * precedence fixture, just with the real wizard table instead of a made-up
 * one. Tests that only need to observe BASE wizard class-feature behavior
 * (unaffected by whether wizard.ts is wired in) exercise the real `compute()`
 * pipeline directly.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 10, dex: 10, con: 10, int: 18, wis: 12, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
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
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
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

const WIZARD_FEATURES = Object.values(ref.archetypeFeatures).filter((f) => f.classTag === "wizard");

describe("WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION completeness (issue #45 wizard slice)", () => {
  it("covers exactly the 108 vendored wizard archetype features, no more, no less", () => {
    expect(WIZARD_FEATURES.length).toBe(108);
    for (const f of WIZARD_FEATURES) {
      expect(WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION[f.id]).toBeDefined();
    }
    expect(Object.keys(WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(108);
  });

  it("every classification entry uses a valid bucket and matches the real feature's archetypeId/level", () => {
    for (const f of WIZARD_FEATURES) {
      const entry = WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION[f.id]!;
      expect(["numeric", "situational", "subsystem", "blocked"]).toContain(entry.bucket);
      expect(entry.archetypeId).toBe(f.archetypeId);
      expect(entry.level).toBe(f.level);
    }
  });

  it("bucket tally matches the audited counts (1 numeric / 8 situational / 79 subsystem / 20 blocked)", () => {
    const tally: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      tally[entry.bucket] = (tally[entry.bucket] ?? 0) + 1;
    }
    expect(tally).toEqual({ numeric: 1, situational: 8, subsystem: 79, blocked: 20 });
  });
});

describe("wizard archetype features are all UNPAIRED (issue #45 wizard slice, mechanical fact underlying most `blocked` entries)", () => {
  it("none of the 108 vendored wizard archetype features carry a pairedBaseFeatureUuid", () => {
    for (const f of WIZARD_FEATURES) {
      expect(f.pairedBaseFeatureUuid).toBeUndefined();
    }
  });

  it("compute() marks every wizard archetype feature `ambiguous: true` (no paired swap ever fires)", () => {
    const familiarAdept = Object.values(ref.archetypes).find(
      (a) => a.name === "Familiar Adept" && a.classTag === "wizard",
    )!;
    const sheet = compute(
      makeDoc({ classes: [{ tag: "wizard", level: 10 }], archetypes: [familiarAdept.id] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === familiarAdept.id);
    expect(archEntry?.features.length).toBeGreaterThan(0);
    for (const feature of archEntry?.features ?? []) {
      expect(feature.ambiguous).toBe(true);
    }
  });
});

describe("blocked composition trap: Bonus Feats (WIZ) / Scribe Scroll are un-suppressible for wizard archetypes (issue #45)", () => {
  // Familiar Adept's Diminished Expertise explicitly says "doesn't gain
  // Scribe Scroll at 1st level or the wizard's bonus feats at 5th and 10th
  // levels" — but since it (like every wizard archetype feature) carries no
  // pairedBaseFeatureUuid, `activeArchetypeSwaps` never suppresses anything
  // for wizard, so the base grants should keep applying in full regardless.
  const familiarAdept = Object.values(ref.archetypes).find(
    (a) => a.name === "Familiar Adept" && a.classTag === "wizard",
  )!;

  it("Bonus Feats (WIZ) and Scribe Scroll both remain `applied: true` at L20 despite Diminished Expertise's text", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "wizard", level: 20 }], archetypes: [familiarAdept.id] }),
      ref,
    );
    const bonusFeats = sheet.classFeatures.find((f) => f.name === "Bonus Feats (WIZ)");
    const scribeScroll = sheet.classFeatures.find((f) => f.name === "Scribe Scroll");
    expect(bonusFeats?.applied).toBe(true);
    expect(bonusFeats?.replacedBy).toBeUndefined();
    expect(scribeScroll?.applied).toBe(true);
    expect(scribeScroll?.replacedBy).toBeUndefined();
  });

  it("Diminished Expertise itself carries no `detail` (not backfilled with a doubled-up number)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "wizard", level: 20 }], archetypes: [familiarAdept.id] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === familiarAdept.id);
    const own = archEntry?.features.find((f) => f.name === "Diminished Expertise");
    expect(own?.detail).toBeUndefined();
  });

  it("resolveArchetypeFeatureEffect has no entry for Diminished Expertise in either production table", () => {
    expect(
      resolveArchetypeFeatureEffect("wizard:familiar-adept:diminished-expertise:1"),
    ).toBeUndefined();
  });
});

describe("Worldseeker (wizard): Walk the Planes grants a flat +2 Knowledge (planes) (issue #45 wizard slice's sole numeric extraction)", () => {
  const id = "wizard:worldseeker:walk-the-planes:1";

  it("the extracted Change is a flat, unconditional +2 to skill.kpl", () => {
    const entry = WIZARD_ARCHETYPE_EFFECTS_EXTRACTED[id];
    expect(entry).toBeDefined();
    expect(entry!.changes).toEqual([{ formula: "2", target: "skill.kpl", type: "untyped" }]);
    expect(evaluateFormula(entry!.changes[0]!.formula)).toBe(2);
    expect(entry!.confidence).toBe("high");
    expect(entry!.detail?.(1)).toBe("+2 Knowledge (planes); constant endure elements not modeled");
  });

  it("resolves as an 'extracted' effect once the wizard table is supplied to the resolver", () => {
    const resolved = resolveArchetypeFeatureEffect(
      id,
      ARCHETYPE_FEATURE_EFFECTS,
      WIZARD_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes).toHaveLength(1);
  });

  it("is not present in the hand-verified table (so it truly is this wave's own extraction, not a duplicate)", () => {
    expect(ARCHETYPE_FEATURE_EFFECTS[id]).toBeUndefined();
  });
});

describe("wizard:spell-sage:focused-spells:1 is intentionally NOT duplicated in the extracted table (issue #45 skip instruction)", () => {
  const id = "wizard:spell-sage:focused-spells:1";

  it("has no entry in WIZARD_ARCHETYPE_EFFECTS_EXTRACTED", () => {
    expect(WIZARD_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
  });

  it("is classified `subsystem` in the audit table (matching its notes-only hand-verified entry)", () => {
    expect(WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
  });

  it("already resolves via the hand-verified table today (production default args, no override needed)", () => {
    const resolved = resolveArchetypeFeatureEffect(id);
    expect(resolved?.source).toBe("verified");
    expect(resolved?.effect.changes).toEqual([]);
  });
});

describe("no id collision between the wizard extracted table and the hand-verified table (issue #45)", () => {
  it("every WIZARD_ARCHETYPE_EFFECTS_EXTRACTED key is absent from ARCHETYPE_FEATURE_EFFECTS", () => {
    const overlap = Object.keys(WIZARD_ARCHETYPE_EFFECTS_EXTRACTED).filter(
      (id) => id in ARCHETYPE_FEATURE_EFFECTS,
    );
    expect(overlap).toEqual([]);
  });
});
