import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  NINJA_ARCHETYPE_EFFECTS_EXTRACTED,
  NINJA_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/ninja.js";

/**
 * The ninja slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: ninja's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). Ninja is one of the zero-numeric
 * classes (like arcanist and unchained summoner): 0 of its 21 features
 * cleared the extraction bar, so there are no formula fixtures — the suites
 * below instead pin the coverage/bucket counts, prove the extracted table is
 * empty on purpose, exercise `resolveArchetypeFeatureEffect`'s override
 * arguments against these tables, and assert the vendored-data facts the
 * classification's key rulings rest on (the mask gate, the No Trace
 * restatement pairing, the zero-changes base-feature landscape). The
 * provenance check is kept in place so any future extracted entry is
 * machine-verified from day one.
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
    (a) => a.name === name && a.classTag === "ninja",
  );
  if (!entry) throw new Error(`ninja archetype not found: ${name}`);
  return entry.id;
}

describe("NINJA_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored ninja archetype feature exactly once", () => {
    const ninjaFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("ninja:"))
      .map((f) => f.id);
    expect(ninjaFeatureIds.length).toBe(21);
    for (const id of ninjaFeatureIds) {
      expect(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(21);
  });

  it("all 5 vendored ninja archetypes exist under the ninja class tag", () => {
    expect(archetypeId("Frozen Shadow")).toBe("ninja:frozen-shadow");
    expect(archetypeId("Gunpowder Bombardier")).toBe("ninja:gunpowder-bombardier");
    expect(archetypeId("Hunting Serpent")).toBe("ninja:hunting-serpent");
    expect(archetypeId("Mask of the Living God")).toBe("ninja:mask-of-the-living-god");
    expect(archetypeId("Petal Ninja")).toBe("ninja:petal-ninja");
  });

  it("bucket counts: 0 numeric, 16 situational, 5 subsystem, 0 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(0);
    expect(counts.situational).toBe(16);
    expect(counts.subsystem).toBe(5);
    expect(counts.blocked).toBe(0);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (both empty for ninja)", () => {
    const numericIds = Object.entries(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(0);
    for (const id of numericIds) {
      expect(NINJA_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(NINJA_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
    expect(Object.keys(NINJA_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(0);
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    // Vacuous while the extracted table is empty — kept so any future entry
    // is machine-verified from day one, same compare as the other slices.
    for (const [id, entry] of Object.entries(NINJA_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("no double-count landscape: every base feature paired by a ninja archetype row carries zero vendored changes", () => {
  it("No Trace / Uncanny Dodge / Improved Uncanny Dodge / Master Tricks / Light Steps all have empty changes[]", () => {
    const pairedNames = [
      "No Trace",
      "Uncanny Dodge",
      "Improved Uncanny Dodge",
      "Master Tricks",
      "Light Steps",
    ];
    for (const name of pairedNames) {
      const feature = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(feature, `base class feature not found: ${name}`).toBeDefined();
      expect(feature?.changes ?? []).toEqual([]);
    }
  });

  it("the base Ki Pool (NIN) sizes itself via a vendored uses.maxFormula, the reason any pool-size change would be blocked (none occurs in this slice)", () => {
    const kiPool = Object.values(ref.classFeatures).find((f) => f.name === "Ki Pool (NIN)");
    expect(kiPool?.changes ?? []).toEqual([]);
    expect(kiPool?.uses?.maxFormula).toBe("floor(@class.unlevel / 2) + @abilities.cha.mod");
  });
});

describe("vendored-data artifact: both No Trace rows restate the base No Trace feature they are paired to", () => {
  it("frozen-shadow's and gunpowder-bombardier's No Trace descriptions are byte-identical to each other", () => {
    const a = ref.archetypeFeatures["ninja:frozen-shadow:no-trace:3"]!;
    const b = ref.archetypeFeatures["ninja:gunpowder-bombardier:no-trace:3"]!;
    expect(a.description).toBe(b.description);
  });

  it("both are paired to the base No Trace class feature (which contributes zero to the sheet)", () => {
    for (const id of ["ninja:frozen-shadow:no-trace:3", "ninja:gunpowder-bombardier:no-trace:3"]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(feature.pairedBaseFeatureUuid).toContain("V3TQ2f5HeX4K6l4p");
    }
    const baseNoTrace = ref.classFeatures["V3TQ2f5HeX4K6l4p"]!;
    expect(baseNoTrace.name).toBe("No Trace");
    expect(baseNoTrace.changes ?? []).toEqual([]);
  });

  it("both rows are classified situational (stationary-conditional bonuses, opponent-facing track DC) — not extracted", () => {
    for (const id of ["ninja:frozen-shadow:no-trace:3", "ninja:gunpowder-bombardier:no-trace:3"]) {
      expect(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("situational");
      expect(NINJA_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("mask gate: Stern Gaze's clean morale bonus is held back by the archetype's own Mask feature", () => {
  it("the vendored Mask text states the gate this ruling rests on", () => {
    const mask = ref.archetypeFeatures["ninja:mask-of-the-living-god:mask:1"]!;
    expect(strippedDescription(mask.description ?? "")).toContain(
      "Abilities granted by this class other than undercover faith function only while the mask " +
        "of the Living God is wearing his mask",
    );
  });

  it("Stern Gaze's own text is an unconditional half-level morale bonus — the gate lives in the sibling feature", () => {
    const sternGaze = ref.archetypeFeatures["ninja:mask-of-the-living-god:stern-gaze:3"]!;
    expect(strippedDescription(sternGaze.description ?? "")).toContain(
      "he gains a morale bonus equal to half his ninja level on Intimidate and Sense Motive checks",
    );
  });

  it("classified situational per the vigilante identity-gate precedent, with no extracted entry", () => {
    const id = "ninja:mask-of-the-living-god:stern-gaze:3";
    expect(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("situational");
    expect(NINJA_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
  });
});

describe("resolveArchetypeFeatureEffect: resolves through ninja's tables when explicitly given as overrides", () => {
  it("returns undefined for every ninja feature — the extracted table is empty and no verified entry exists", () => {
    for (const id of Object.keys(NINJA_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(resolveArchetypeFeatureEffect(id, {}, NINJA_ARCHETYPE_EFFECTS_EXTRACTED)).toBe(
        undefined,
      );
    }
  });

  it("the override path itself works: a verified-table override for a ninja id resolves as 'verified'", () => {
    // Proves the resolver consults the override arguments (not the global
    // tables) — the mechanism a future aggregator-wiring pass relies on —
    // without pretending ninja has a real entry.
    const resolved = resolveArchetypeFeatureEffect(
      "ninja:mask-of-the-living-god:stern-gaze:3",
      { "ninja:mask-of-the-living-god:stern-gaze:3": { changes: [] } },
      NINJA_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("verified");
    expect(resolved?.confidence).toBeUndefined();
  });
});
