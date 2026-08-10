import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED,
  PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/psychic.js";

/**
 * The psychic slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: psychic's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) against the exact published-rules numbers cited in each
 * entry's `provenance`, and (3) verify `resolveArchetypeFeatureEffect`
 * resolves correctly when explicitly given this file's tables as its override
 * arguments (the mechanism it's designed for — see its doc comment).
 * `loadRefData` is used to sanity-check that every archetypeId/name this file
 * references actually exists in the real vendored data slice, same posture as
 * `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "psychic",
  );
  if (!entry) throw new Error(`psychic archetype not found: ${name}`);
  return entry.id;
}

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

describe("PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored psychic archetype feature exactly once", () => {
    const psychicFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("psychic:"))
      .map((f) => f.id);
    expect(psychicFeatureIds.length).toBe(29);
    for (const id of psychicFeatureIds) {
      expect(PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(29);
  });

  it("bucket counts match the audited totals (numeric 1, situational 3, subsystem 22, blocked 3)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts).toEqual({ numeric: 1, situational: 3, subsystem: 22, blocked: 3 });
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa", () => {
    const numericIds = Object.entries(PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(1);
    for (const id of numericIds) {
      expect(PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
    expect(Object.keys(PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(1);
  });
});

describe("every provenance is a verbatim substring of the vendored description", () => {
  for (const [id, entry] of Object.entries(PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(id, () => {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored archetype feature id ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature!.name}): provenance drifted from vendored text`,
      ).toBe(true);
    });
  }
});

describe("Psychic Marauder: Unreal Understanding grants mind-affecting immunity", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Psychic Marauder")).toBe("psychic:psychic-marauder");
  });

  it("flat immEffect.mindAffecting flag, level-independent", () => {
    const id = "psychic:psychic-marauder:unreal-understanding:20";
    const [imm] = PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(imm!.target).toBe("immEffect.mindAffecting");
    // Flat presence flag — evaluates to 1 with or without class-level roll data.
    expect(evaluateFormula(imm!.formula, {})).toBe(1);
    expect(evaluateFormula(imm!.formula, { class: { unlevel: 20 } })).toBe(1);
  });

  it("replaces Remade Self, which carries zero vendored changes — nothing to double-count", () => {
    const feature = ref.archetypeFeatures["psychic:psychic-marauder:unreal-understanding:20"];
    expect(feature?.pairedBaseFeatureUuid).toBeDefined();
    const remadeSelf = Object.values(ref.classFeatures).find(
      (f) => f.uuid === feature!.pairedBaseFeatureUuid,
    );
    expect(remadeSelf?.name).toBe("Remade Self");
    expect(remadeSelf?.changes ?? []).toEqual([]);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through psychic's tables when explicitly given as overrides", () => {
  it("falls back to the psychic extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "psychic:psychic-marauder:unreal-understanding:20",
      {},
      PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("immEffect.mindAffecting");
  });

  it("returns undefined for a psychic feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "psychic:formless-adept:phrenic-charisma:1",
        {},
        PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "psychic:mutation-mind:physical-mutation:1",
        {},
        PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: phrenic pool basis and closed-vocabulary immunities", () => {
  it("Formless Adept's Phrenic Charisma (pool ability basis change) is blocked, not backfilled", () => {
    const entry =
      PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION["psychic:formless-adept:phrenic-charisma:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED["psychic:formless-adept:phrenic-charisma:1"],
    ).toBeUndefined();
  });

  it("the real vendored Phrenic Pool class feature carries zero changes[] (only a uses.maxFormula resource) — pool sizing is never a Change target in this pipeline", () => {
    const phrenicPool = Object.values(ref.classFeatures).find((f) => f.name === "Phrenic Pool");
    expect(phrenicPool?.changes ?? []).toEqual([]);
    expect(phrenicPool?.uses?.maxFormula).toBe("floor(@class.unlevel / 2) + @abilities.cha.mod");
  });

  it("Cracked Perspectives (confusion/insanity immunity) is blocked — neither slug exists in the closed immEffect vocabulary", () => {
    const entry =
      PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION["psychic:psychic-marauder:cracked-perspectives:9"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED["psychic:psychic-marauder:cracked-perspectives:9"],
    ).toBeUndefined();
  });

  it("Skewed Mentality (Cha-for-Wis on Will saves) is blocked — a substitution, not a Change-expressible bonus", () => {
    const entry =
      PSYCHIC_ARCHETYPE_FEATURE_CLASSIFICATION["psychic:psychic-marauder:skewed-mentality:2"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      PSYCHIC_ARCHETYPE_EFFECTS_EXTRACTED["psychic:psychic-marauder:skewed-mentality:2"],
    ).toBeUndefined();
  });
});
