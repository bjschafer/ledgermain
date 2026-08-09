import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, isTargetApplied, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
  MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/monkUnchained.js";

/**
 * The unchained-monk slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: this class's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` sanity-checks
 * that every id this file references actually exists in the real vendored
 * data slice, same posture as `archetypeExtractedMagus.test.ts`.
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

describe("MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored monkUnchained archetype feature exactly once", () => {
    const monkUnchainedFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("monkUnchained:"))
      .map((f) => f.id);
    expect(monkUnchainedFeatureIds.length).toBe(69);
    for (const id of monkUnchainedFeatureIds) {
      expect(
        MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id],
        `missing classification for ${id}`,
      ).toBeDefined();
    }
    expect(Object.keys(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(69);
  });

  it("every classified id actually starts with the monkUnchained: tag", () => {
    for (const id of Object.keys(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(id.startsWith("monkUnchained:")).toBe(true);
    }
  });

  it("bucket counts match this pass's audit: 3 numeric, 5 situational, 1 blocked, 60 subsystem", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 3, situational: 5, subsystem: 60, blocked: 1 });
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(3);
    for (const id of numericIds) {
      expect(MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("provenance: every entry's provenance is a verbatim substring of the vendored description", () => {
  for (const [id, entry] of Object.entries(MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
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
  for (const [id, entry] of Object.entries(MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(id, () => {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("Perfect Scholar: Lore grants a flat half-monk-level Knowledge bonus", () => {
  it("archetype exists in the vendored data", () => {
    const entry = Object.values(ref.archetypes).find(
      (a) => a.name === "Perfect Scholar" && a.classTag === "monkUnchained",
    );
    expect(entry?.id).toBe("monkUnchained:perfect-scholar");
  });

  it("floor(unlevel / 2) skill.knowledge — +2 at L4, +5 at L10, +10 at L20", () => {
    const id = "monkUnchained:perfect-scholar:lore:4";
    const [knowledge] = MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(knowledge!.target).toBe("skill.knowledge");
    const at = (level: number) =>
      evaluateFormula(knowledge!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
    expect(at(20)).toBe(10);
  });
});

describe("Scaled Fist: Draconic Mettle grants a flat +2 save bonus vs. fear/sleep", () => {
  it("archetype exists in the vendored data", () => {
    const entry = Object.values(ref.archetypes).find(
      (a) => a.name === "Scaled Fist" && a.classTag === "monkUnchained",
    );
    expect(entry?.id).toBe("monkUnchained:scaled-fist");
  });

  it("flat 2, allSavingThrows, scoped to fear and sleep (paralysis has no SAVE_CATEGORIES entry)", () => {
    const id = "monkUnchained:scaled-fist:draconic-mettle:4";
    const [saveChange] = MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(saveChange!.target).toBe("allSavingThrows");
    expect(saveChange!.saveCategories).toEqual(["fear", "sleep"]);
    expect(evaluateFormula(saveChange!.formula, {})).toBe(2);
  });
});

describe("Soul Shepherd: Otherworldly Resilience grants unconditional DR + energy resistance", () => {
  it("archetype exists in the vendored data", () => {
    const entry = Object.values(ref.archetypes).find(
      (a) => a.name === "Soul Shepherd" && a.classTag === "monkUnchained",
    );
    expect(entry?.id).toBe("monkUnchained:soul-shepherd");
  });

  it("DR 2/adamantine + cold/electricity resistance 5 below L9, DR 5 + resistance 10 at L9+", () => {
    const id = "monkUnchained:soul-shepherd:otherworldly-resilience:2";
    const [dr, cold, electricity] = MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr.adamantine");
    expect(cold!.target).toBe("eres.cold");
    expect(electricity!.target).toBe("eres.electricity");

    const at = (formula: string, level: number) =>
      evaluateFormula(formula, { class: { unlevel: level } });
    expect(at(dr!.formula, 2)).toBe(2);
    expect(at(dr!.formula, 8)).toBe(2);
    expect(at(dr!.formula, 9)).toBe(5);
    expect(at(dr!.formula, 20)).toBe(5);
    expect(at(cold!.formula, 2)).toBe(5);
    expect(at(cold!.formula, 9)).toBe(10);
    expect(at(electricity!.formula, 2)).toBe(5);
    expect(at(electricity!.formula, 9)).toBe(10);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through this class's tables when explicitly given as overrides", () => {
  it("falls back to the monkUnchained extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "monkUnchained:perfect-scholar:lore:4",
      {},
      MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.knowledge");
  });

  it("returns undefined for a monkUnchained feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "monkUnchained:softstrike-monk:nonlethal-strikes:1",
        {},
        MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "monkUnchained:invested-regent:hellcat-fury:1",
        {},
        MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });

  it("no monkUnchained id has a hand-verified entry today, so this class resolves entirely through the extracted table", () => {
    for (const id of Object.keys(MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const resolved = resolveArchetypeFeatureEffect(id);
      if (resolved) expect(resolved.source).toBe("extracted");
    }
  });
});

describe("blocked bucket: Nonlethal Strikes' unarmed-damage-table trap (softstrike monk)", () => {
  it("is recorded as blocked, not backfilled", () => {
    const entry =
      MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "monkUnchained:softstrike-monk:nonlethal-strikes:1"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      MONK_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "monkUnchained:softstrike-monk:nonlethal-strikes:1"
      ],
    ).toBeUndefined();
  });
});

describe("byte-identity spot-check: monkUnchained prose matches chained monk's vendored text", () => {
  it("Scaled Fist's Draconic Might (an ability-score-basis swap, subsystem in both) is identical text across both class tags", () => {
    const unchained = ref.archetypeFeatures["monkUnchained:scaled-fist:draconic-might:1"];
    const chained = ref.archetypeFeatures["monk:scaled-fist:draconic-might:1"];
    expect(unchained).toBeDefined();
    expect(chained).toBeDefined();
    expect(unchained!.description).toBe(chained!.description);
  });

  it("Disciple of Wholeness's Healing Ki differs by one unchained-specific phrase, but the classification is unaffected", () => {
    const unchained = ref.archetypeFeatures["monkUnchained:disciple-of-wholness:healing-ki:4"];
    const chained = ref.archetypeFeatures["monk:disciple-of-wholeness:healing-ki:4"];
    expect(unchained).toBeDefined();
    expect(chained).toBeDefined();
    expect(unchained!.description).not.toBe(chained!.description);
    expect(
      MONK_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "monkUnchained:disciple-of-wholness:healing-ki:4"
      ]?.bucket,
    ).toBe("subsystem");
  });
});
