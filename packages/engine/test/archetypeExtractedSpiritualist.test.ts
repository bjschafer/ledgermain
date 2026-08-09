import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED,
  SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/spiritualist.js";

/**
 * The spiritualist slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: spiritualist's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1)
 * assert directly against `SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * exported `changes` shape, (2) hand-compute each formula via the real
 * `formula.ts` evaluator (`evaluateFormula`) at several class levels/inputs
 * against the exact published-rules numbers cited in each entry's
 * `provenance`, and (3) verify `resolveArchetypeFeatureEffect` resolves
 * correctly when explicitly given this file's tables as its override
 * arguments (the mechanism it's designed for — see its doc comment).
 * `loadRefData` is used to sanity-check that every archetypeId/name this file
 * references actually exists in the real vendored data slice, same posture as
 * `archetypeEffectsExtracted.test.ts`.
 *
 * Spiritualist has NO suppression-composition case analogous to fighter's
 * Armor Training reflavors: both of this pass's `numeric` entries replace
 * base features that carry zero vendored `changes` themselves (Etheric
 * Tether and Greater Spiritual Interference — confirmed below), so there's
 * nothing to suppress and no `applied: false` to observe. This is noted
 * explicitly rather than forcing an artificial case.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "spiritualist",
  );
  if (!entry) throw new Error(`spiritualist archetype not found: ${name}`);
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

describe("SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored spiritualist archetype feature exactly once", () => {
    const spiritualistFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("spiritualist:"))
      .map((f) => f.id);
    expect(spiritualistFeatureIds.length).toBe(125);
    for (const id of spiritualistFeatureIds) {
      expect(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(125);
  });

  it("bucket counts match the audited totals (108 subsystem, 15 situational, 2 numeric, 0 blocked)", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 2, situational: 15, subsystem: 108, blocked: 0 });
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(2);
    for (const id of numericIds) {
      expect(SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name resolves in the real vendored data", () => {
    for (const [id, entry] of Object.entries(SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `${id}: missing from vendored archetypeFeatures`).toBeDefined();
      expect(feature!.archetypeId).toBe(entry.archetypeId);
      expect(feature!.name).toBe(entry.name);
      expect(feature!.level).toBe(entry.level);
      expect(
        ref.archetypes[entry.archetypeId],
        `${entry.archetypeId}: missing from vendored archetypes`,
      ).toBeDefined();
    }
  });
});

describe("Exciter: Fast Movement grants +10 ft. land speed under the vendored Fast Movement condition", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Exciter")).toBe("spiritualist:exciter");
  });

  it("+10 while light/medium/no armor and not heavily loaded; +0 while heavy armor or heavily loaded", () => {
    const id = "spiritualist:exciter:fast-movement:0";
    const [speedChange] = SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(speedChange!.target).toBe("landSpeed");
    expect(speedChange!.type).toBe("base");
    const at = (armorType: number, encumbranceLevel: number) =>
      evaluateFormula(speedChange!.formula, {
        armor: { type: armorType },
        attributes: { encumbrance: { level: encumbranceLevel } },
      });
    expect(at(0, 0)).toBe(10); // no armor, unencumbered
    expect(at(1, 0)).toBe(10); // light armor
    expect(at(2, 1)).toBe(10); // medium armor, medium load
    expect(at(3, 0)).toBe(0); // heavy armor — condition fails
    expect(at(0, 2)).toBe(0); // heavy load — condition fails
  });

  it("matches the vendored generic Fast Movement class feature's own formula and target exactly", () => {
    const fastMovement = Object.values(ref.classFeatures).find((f) => f.name === "Fast Movement");
    const id = "spiritualist:exciter:fast-movement:0";
    const [speedChange] = SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const vendoredChange = fastMovement?.changes?.[0];
    expect(vendoredChange?.target).toBe(speedChange!.target);
    expect(vendoredChange?.type).toBe(speedChange!.type);
    // The vendored formula omits the else branch (`if(cond, 10)`); this
    // table's formula spells out the explicit `, 0` else branch, which
    // evaluates identically (both are 0 when the condition is false).
    expect(evaluateFormula(vendoredChange!.formula, { armor: { type: 3 } })).toBe(
      evaluateFormula(speedChange!.formula, { armor: { type: 3 } }),
    );
  });

  it("has no paired base-feature slot with a vendored Change — replaces etheric tether, which carries zero changes", () => {
    const etherealTether = Object.values(ref.classFeatures).find(
      (f) => f.name === "Etheric Tether",
    );
    expect(etherealTether?.changes ?? []).toEqual([]);
  });
});

describe("Plague Eater: Greater Spiritual Inoculation grants flat disease immunity", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Plague Eater")).toBe("spiritualist:plague-eater");
  });

  it("immEffect.disease, unconditional", () => {
    const id = "spiritualist:plague-eater:greater-spiritual-inoculation:12";
    const [immChange] = SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(immChange!.target).toBe("immEffect.disease");
    expect(evaluateFormula(immChange!.formula, {})).toBe(1);
  });

  it("replaces greater spiritual interference, which carries zero vendored changes — nothing to double-count", () => {
    const greaterSpiritualInterference = Object.values(ref.classFeatures).find(
      (f) => f.name === "Greater Spiritual Interference",
    );
    expect(greaterSpiritualInterference?.changes ?? []).toEqual([]);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through spiritualist's tables when explicitly given as overrides", () => {
  it("falls back to the spiritualist extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "spiritualist:plague-eater:greater-spiritual-inoculation:12",
      {},
      SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("immEffect.disease");
  });

  it("returns undefined for a spiritualist feature classified subsystem/situational (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "spiritualist:grim-apostle:strength-focus:0",
        {},
        SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "spiritualist:necrologist:shared-conciousness:0",
        {},
        SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("provenance: every extracted entry's provenance is a verbatim substring of the vendored description", () => {
  for (const [id, entry] of Object.entries(SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(`${id}`, () => {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `${id}: missing from vendored archetypeFeatures`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id}: provenance drifted from vendored text`,
      ).toBe(true);
    });
  }
});

describe("phantom-scoped guardrail: the emotional-focus skill table has no formula-accessible path", () => {
  it("EMOTIONAL_FOCI records the two skills per focus, but no @phantom.* path exists for a formula to read the player's chosen focus (documents why Seeker of Enlightenment's Echoes of Expertise stays situational)", async () => {
    const { EMOTIONAL_FOCI } = await import("../src/phantom.js");
    expect(EMOTIONAL_FOCI.anger?.skills).toEqual(["int", "sur"]);
    // No Change formula in this file references "@phantom" — grep-level
    // guardrail so a future edit doesn't silently assume a path that isn't
    // wired into rolldata.ts.
    for (const entry of Object.values(SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const change of entry.changes) {
        expect(change.formula.includes("@phantom")).toBe(false);
      }
    }
  });
});
