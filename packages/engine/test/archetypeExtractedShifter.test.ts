import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, isTargetApplied, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED,
  SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/shifter.js";

/**
 * The shifter slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: shifter's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact published-
 * rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` is used to
 * sanity-check that every archetypeId/name this file references actually
 * exists in the real vendored data slice.
 *
 * Shifter has NO suppression-composition case: the only base shifter feature
 * with vendored `changes` is Defensive Instinct (ac/cmd), and no extracted
 * entry here touches those targets or is paired against it — see shifter.ts's
 * header notes 4 and 6.
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
    (a) => a.name === name && a.classTag === "shifter",
  );
  if (!entry) throw new Error(`shifter archetype not found: ${name}`);
  return entry.id;
}

describe("SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored shifter archetype feature exactly once", () => {
    const shifterFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("shifter:"))
      .map((f) => f.id);
    expect(shifterFeatureIds.length).toBe(60);
    for (const id of shifterFeatureIds) {
      expect(SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(60);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(9);
    for (const id of numericIds) {
      expect(SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 9 numeric, 0 blocked, 24 situational, 27 subsystem", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SHIFTER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(9);
    expect(counts.blocked).toBe(0);
    expect(counts.situational).toBe(24);
    expect(counts.subsystem).toBe(27);
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every extracted change lands on an applied target with a real formula", () => {
    for (const [id, entry] of Object.entries(SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Dragonblood Shifter: the wyrmshifter save-bonus / immunity line", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Dragonblood Shifter")).toBe("shifter:dragonblood-shifter");
  });

  it("Wyrmshifter (9th): flat +2 racial, scoped to the sleep and paralysis save categories", () => {
    const id = "shifter:dragonblood-shifter:wyrmshifter:9";
    const [save] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.target).toBe("allSavingThrows");
    expect(save!.type).toBe("racial");
    expect(save!.saveCategories).toEqual(["sleep", "paralysis"]);
    expect(evaluateFormula(save!.formula, {})).toBe(2);
  });

  it("Improved Wyrmshifter (14th): flat +4 with the same racial type, so highest-within-type stacking yields +4 (not +6) once both are active", () => {
    const id = "shifter:dragonblood-shifter:improved-wyrmshifter:14";
    const [save] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.target).toBe("allSavingThrows");
    expect(save!.saveCategories).toEqual(["sleep", "paralysis"]);
    expect(evaluateFormula(save!.formula, {})).toBe(4);
    const l9 = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED["shifter:dragonblood-shifter:wyrmshifter:9"]!;
    expect(save!.type).toBe(l9.changes[0]!.type);
  });

  it("Greater Wyrmshifter (20th): flag-shaped sleep + paralysis effect immunities", () => {
    const id = "shifter:dragonblood-shifter:greater-wyrmshifter:20";
    const [sleep, paralysis] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(sleep!.target).toBe("immEffect.sleep");
    expect(paralysis!.target).toBe("immEffect.paralysis");
    expect(evaluateFormula(sleep!.formula, {})).toBe(1);
    expect(evaluateFormula(paralysis!.formula, {})).toBe(1);
  });

  it("the paired base feature (Final Aspect) carries zero vendored changes — nothing to double-count", () => {
    const finalAspect = Object.values(ref.classFeatures).find(
      (f) => f.uuid === "Compendium.pf1.class-abilities.Item.joNziZgJl9ZOJZlF",
    );
    expect(finalAspect?.changes ?? []).toEqual([]);
  });
});

describe("Fiendflesh Shifter: Fiendish Resilience natural armor + energy resistance", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Fiendflesh Shifter")).toBe("shifter:fiendflesh-shifter");
  });

  const id = "shifter:fiendflesh-shifter:fiendish-resilience:2";
  const at = (formula: string, level: number, armorType: number, encumbrance = 0) =>
    evaluateFormula(formula, {
      class: { unlevel: level },
      armor: { type: armorType },
      attributes: { encumbrance: { level: encumbrance } },
    });

  it("natural armor: +1 at L2, +2 at L4, +3 at L12, +4 at L20 (published tier schedule)", () => {
    const [nac] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(nac!.target).toBe("nac");
    expect(nac!.type).toBe("base");
    expect(at(nac!.formula, 2, 0)).toBe(1);
    expect(at(nac!.formula, 4, 1)).toBe(2);
    expect(at(nac!.formula, 12, 2)).toBe(3);
    expect(at(nac!.formula, 20, 0)).toBe(4);
  });

  it("electricity/fire resistance: 5 at L2, 10 at L8, 15 at L16 and beyond", () => {
    const [, electricity, fire] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(electricity!.target).toBe("eres.electricity");
    expect(fire!.target).toBe("eres.fire");
    expect(at(electricity!.formula, 2, 0)).toBe(5);
    expect(at(electricity!.formula, 8, 0)).toBe(10);
    expect(at(fire!.formula, 16, 0)).toBe(15);
    expect(at(fire!.formula, 20, 0)).toBe(15);
  });

  it("all three halves vanish in heavy armor or under a medium load (the checkable conditions)", () => {
    const [nac, electricity] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(at(nac!.formula, 20, 3)).toBe(0); // heavy armor
    expect(at(electricity!.formula, 20, 0, 1)).toBe(0); // medium load
    expect(at(nac!.formula, 20, 2)).toBe(4); // medium armor still qualifies
  });
});

describe("Oozemorph: Damage Reduction scaling DR/slashing", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Oozemorph")).toBe("shifter:oozemorph");
  });

  it("DR 4 at L2, 6 at L4, 10 at L12, 14 at L20; 0 in medium armor or under load", () => {
    const id = "shifter:oozemorph:damage-reduction:2";
    const [dr] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr.slashing");
    const at = (level: number, armorType: number, encumbrance = 0) =>
      evaluateFormula(dr!.formula, {
        class: { unlevel: level },
        armor: { type: armorType },
        attributes: { encumbrance: { level: encumbrance } },
      });
    expect(at(2, 0)).toBe(4);
    expect(at(4, 1)).toBe(6);
    expect(at(12, 0)).toBe(10);
    expect(at(20, 1)).toBe(14);
    expect(at(20, 2)).toBe(0); // medium armor fails the no/light condition
    expect(at(20, 0, 1)).toBe(0); // medium load fails unencumbered
  });
});

describe("Style Shifter: Style Mastery bonus-feat count", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Style Shifter")).toBe("shifter:style-shifter");
  });

  it("1 + floor(unlevel/5): 1 at L1, 2 at L5, 3 at L10, 5 at L20", () => {
    const id = "shifter:style-shifter:style-mastery:1";
    const [feats] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(5)).toBe(2);
    expect(at(10)).toBe(3);
    expect(at(20)).toBe(5);
  });
});

describe("Verdant Shifter: Verdant Body Con enhancement and Wild Armor natural armor", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Verdant Shifter")).toBe("shifter:verdant-shifter");
  });

  it("Verdant Body: 0 before 5th, +2 at L5, +4 at L8, +4 at L14, +6 at L15", () => {
    const id = "shifter:verdant-shifter:verdant-body:1";
    const [con] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(con!.target).toBe("con");
    expect(con!.type).toBe("enhancement");
    const at = (level: number) => evaluateFormula(con!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(5)).toBe(2);
    expect(at(8)).toBe(4);
    expect(at(14)).toBe(4);
    expect(at(15)).toBe(6);
  });

  it("Wild Armor: +2 at L2, +3 at L4, +7 at L20; 0 in heavy armor or under a medium load", () => {
    const id = "shifter:verdant-shifter:wild-armor:2";
    const [nac] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(nac!.target).toBe("nac");
    expect(nac!.type).toBe("base");
    const at = (level: number, armorType: number, encumbrance = 0) =>
      evaluateFormula(nac!.formula, {
        class: { unlevel: level },
        armor: { type: armorType },
        attributes: { encumbrance: { level: encumbrance } },
      });
    expect(at(2, 0)).toBe(2);
    expect(at(4, 1)).toBe(3);
    expect(at(20, 2)).toBe(7); // medium armor still qualifies
    expect(at(20, 3)).toBe(0);
    expect(at(20, 0, 1)).toBe(0);
  });
});

describe("Weretouched: Lycanthrope Aspect DR/silver", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Weretouched")).toBe("shifter:weretouched");
  });

  it("0 before 5th, then half level: 2 at L5, 5 at L11, capped at 10 at L20", () => {
    const id = "shifter:weretouched:lycanthrope-aspect:1";
    const [dr] = SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr.silver");
    const at = (level: number) => evaluateFormula(dr!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(0);
    expect(at(5)).toBe(2);
    expect(at(11)).toBe(5);
    expect(at(20)).toBe(10);
  });

  it("the base Shifter Aspect class feature carries zero vendored changes — nothing to double-count", () => {
    const aspect = Object.values(ref.classFeatures).find(
      (f) => f.uuid === "Compendium.pf1.class-abilities.Item.ph7qA9fJX3iPuqxa",
    );
    expect(aspect?.changes ?? []).toEqual([]);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through shifter's tables when explicitly given as overrides", () => {
  it("falls back to the shifter extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "shifter:weretouched:lycanthrope-aspect:1",
      {},
      SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("dr.silver");
  });

  it("returns undefined for a shifter feature classified subsystem/situational (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "shifter:oozemorph:fluidic-body:1",
        {},
        SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "shifter:feyform-shifter:fey-aspect:1",
        {},
        SHIFTER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
