import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED,
  SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/shaman.js";

/**
 * The shaman slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: shaman's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) against the exact published-rules numbers cited in
 * each entry's `provenance`, and (3) verify `resolveArchetypeFeatureEffect`
 * resolves correctly when explicitly given this file's tables as its
 * override arguments. `loadRefData` is used to sanity-check that every
 * archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeEffectsExtracted.test.ts`.
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

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "shaman",
  );
  if (!entry) throw new Error(`shaman archetype not found: ${name}`);
  return entry.id;
}

describe("SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored shaman archetype feature exactly once", () => {
    const shamanFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("shaman:"))
      .map((f) => f.id);
    expect(shamanFeatureIds.length).toBe(61);
    for (const id of shamanFeatureIds) {
      expect(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(61);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(1);
    for (const id of numericIds) {
      expect(SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 1 numeric, 5 situational, 55 subsystem, 0 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(1);
    expect(counts.situational).toBe(5);
    expect(counts.subsystem).toBe(55);
    expect(counts.blocked).toBe(0);
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Spirit Warden: Laugh at Death grants a flat insight bonus vs. death-effect saves", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Spirit Warden")).toBe("shaman:spirit-warden");
  });

  it("+4 insight on allSavingThrows scoped to the 'death' save category, level-independent", () => {
    const id = "shaman:spirit-warden:laugh-at-death:10";
    const [change] = SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.type).toBe("insight");
    expect(change!.saveCategories).toEqual(["death"]);
    // Flat +4 per the published text ("She gains a +4 insight bonus..."),
    // with no level scaling — same value at the granting level and beyond.
    expect(evaluateFormula(change!.formula, { class: { unlevel: 10 } })).toBe(4);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 15 } })).toBe(4);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 20 } })).toBe(4);
  });

  it("replaces the hex gained at 10th level; the base Hex (SHA) class feature carries zero vendored changes — no double-count risk", () => {
    const hex = Object.values(ref.classFeatures).find((f) => f.name === "Hex (SHA)");
    expect(hex).toBeDefined();
    expect(hex?.changes ?? []).toEqual([]);
  });
});

describe("subsystem posture: every paired shaman base feature carries zero vendored changes", () => {
  // Hex (SHA), Wandering Hex, Wandering Spirit, and Spirit (greater) are the
  // only base features the vendored shaman archetype rows pair against, and
  // none of them carries a vendored `changes` array — confirming there is no
  // replacement-suppression double-count risk anywhere in this class (the
  // reason this slice has zero `blocked` entries).
  it("Hex (SHA), Wandering Hex, Wandering Spirit, Spirit (greater) all have empty changes", () => {
    for (const name of ["Hex (SHA)", "Wandering Hex", "Wandering Spirit", "Spirit (greater)"]) {
      const feature = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(feature, `base class feature not found: ${name}`).toBeDefined();
      expect(feature?.changes ?? [], `${name} unexpectedly carries changes`).toEqual([]);
    }
  });
});

describe("vendored-data oddities recorded in the classification (not guessed at)", () => {
  it("both 14th-level Wandering Hex upgrade slots restate the base 6th-level Wandering Hex text", () => {
    for (const id of [
      "shaman:possessed-shaman:wandering-hex:14",
      "shaman:visionary:wandering-hex:14",
    ]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(strippedDescription(feature.description ?? "")).toContain(
        "At 6th level, a shaman can temporarily gain the use of one of the hexes",
      );
      expect(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
    }
  });

  it("Witch Doctor's Alignment row carries vendored level 0 (a restriction, not a leveled feature)", () => {
    const feature = ref.archetypeFeatures["shaman:witch-doctor:alignment:0"]!;
    expect(feature.level).toBe(0);
    expect(SHAMAN_ARCHETYPE_FEATURE_CLASSIFICATION["shaman:witch-doctor:alignment:0"]?.bucket).toBe(
      "subsystem",
    );
  });
});

describe("resolveArchetypeFeatureEffect: resolves through shaman's tables when explicitly given as overrides", () => {
  it("falls back to the shaman extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "shaman:spirit-warden:laugh-at-death:10",
      {},
      SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("medium");
    expect(resolved?.effect.changes[0]?.target).toBe("allSavingThrows");
  });

  it("returns undefined for a shaman feature classified subsystem/situational (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "shaman:unsworn-shaman:second-wandering-spirit:6",
        {},
        SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "shaman:spirit-warden:unnatural-mien:1",
        {},
        SHAMAN_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
