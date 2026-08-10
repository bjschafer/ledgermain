import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED,
  SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/samurai.js";

/**
 * The samurai slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: samurai's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` is used to
 * sanity-check that every archetypeId/name this file references actually
 * exists in the real vendored data slice, same posture as
 * `archetypeEffectsExtracted.test.ts`.
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
    (a) => a.name === name && a.classTag === "samurai",
  );
  if (!entry) throw new Error(`samurai archetype not found: ${name}`);
  return entry.id;
}

describe("SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored samurai archetype feature exactly once", () => {
    const samuraiFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("samurai:"))
      .map((f) => f.id);
    expect(samuraiFeatureIds.length).toBe(26);
    for (const id of samuraiFeatureIds) {
      expect(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(26);
  });

  it("spans all 6 vendored samurai archetypes", () => {
    const covered = new Set(
      Object.values(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(covered.size).toBe(6);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(2);
    for (const id of numericIds) {
      expect(SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 2 numeric, 13 situational, 11 subsystem, 0 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 2, situational: 13, subsystem: 11, blocked: 0 });
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Brawling Blademaster: Nimble grants the gunslinger's dodge-AC progression at samurai level", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Brawling Blademaster")).toBe("samurai:brawling-blademaster");
  });

  it("+1 dodge AC at L2, +2 at L6, +3 at L10, +4 at L14, +5 at L18/L20 while light/unarmored", () => {
    const id = "samurai:brawling-blademaster:nimble:2";
    const [acChange] = SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.target).toBe("ac");
    expect(acChange!.type).toBe("dodge");
    const at = (level: number, armorType: number) =>
      evaluateFormula(acChange!.formula, { class: { unlevel: level }, armor: { type: armorType } });
    expect(at(2, 0)).toBe(1); // unarmored
    expect(at(5, 1)).toBe(1); // light armor, pre-6th
    expect(at(6, 1)).toBe(2);
    expect(at(10, 0)).toBe(3);
    expect(at(14, 1)).toBe(4);
    expect(at(18, 0)).toBe(5); // gunslinger nimble's published max
    expect(at(20, 0)).toBe(5);
    expect(at(18, 2)).toBe(0); // medium armor: condition fails
  });

  it("matches the vendored gunslinger Nimble class feature's own scaling (the base mechanism it reflavors)", () => {
    const gunslingerNimble = Object.values(ref.classFeatures).find((f) => f.name === "Nimble");
    expect(gunslingerNimble?.changes).toEqual([
      { formula: "1 + floor((@class.unlevel - 2) / 4)", target: "ac", type: "dodge" },
    ]);
  });

  it("is unpaired — samurai has no base AC-bonus feature to suppress or double-count", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "samurai:brawling-blademaster:nimble:2",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Warrior Poet: Dancer's Grace grants Cha-to-AC capped at samurai level while unarmored and shieldless", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Warrior Poet")).toBe("samurai:warrior-poet");
  });

  it("min(Cha mod, level), floored at 0, gated on no armor AND no shield", () => {
    const id = "samurai:warrior-poet:dancer-s-grace:1";
    const [acChange] = SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.target).toBe("ac");
    expect(acChange!.type).toBe("untyped");
    const at = (level: number, chaMod: number, armorType: number, shieldType: number) =>
      evaluateFormula(acChange!.formula, {
        class: { unlevel: level },
        abilities: { cha: { mod: chaMod } },
        armor: { type: armorType },
        shield: { type: shieldType },
      });
    expect(at(1, 4, 0, 0)).toBe(1); // level cap binds: min(4, 1)
    expect(at(3, 5, 0, 0)).toBe(3); // level cap binds: min(5, 3)
    expect(at(5, 4, 0, 0)).toBe(4); // Cha binds: min(4, 5)
    expect(at(10, -1, 0, 0)).toBe(0); // negative Cha modifier grants no bonus
    expect(at(5, 4, 1, 0)).toBe(0); // any armor: condition fails
    expect(at(5, 4, 0, 1)).toBe(0); // any shield: condition fails
  });

  it("is unpaired — a pure additive grant with nothing to suppress", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "samurai:warrior-poet:dancer-s-grace:1",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("replacement pairings in this slice suppress nothing numeric", () => {
  it("every paired base feature referenced by a samurai archetype feature carries zero vendored changes", () => {
    const pairedUuids = new Set(
      Object.values(ref.archetypeFeatures)
        .filter((f) => f.archetypeId.startsWith("samurai:") && f.pairedBaseFeatureUuid)
        .map((f) => f.pairedBaseFeatureUuid!.split(".").pop()!),
    );
    expect(pairedUuids.size).toBeGreaterThan(0);
    for (const uuid of pairedUuids) {
      const base = ref.classFeatures[uuid];
      expect(base, `paired base feature ${uuid} not found`).toBeDefined();
      expect(base!.changes ?? [], `${base!.name} unexpectedly carries vendored changes`).toEqual(
        [],
      );
    }
  });

  it("the base Resolve feature is a pure uses.maxFormula resource (class note 2's double-count rationale)", () => {
    const resolve = Object.values(ref.classFeatures).find((f) => f.name === "Resolve");
    expect(resolve?.changes ?? []).toEqual([]);
    expect(resolve?.uses?.maxFormula).toBe("ceil(@class.unlevel / 2)");
  });
});

describe("resolveArchetypeFeatureEffect: resolves through samurai's tables when explicitly given as overrides", () => {
  it("falls back to the samurai extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "samurai:brawling-blademaster:nimble:2",
      {},
      SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("medium");
    expect(resolved?.effect.changes[0]?.target).toBe("ac");
  });

  it("returns undefined for a samurai feature classified subsystem/situational (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "samurai:ward-speaker:propitiation:1",
        {},
        SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "samurai:sword-saint:iaijutsu-strike:1",
        {},
        SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
