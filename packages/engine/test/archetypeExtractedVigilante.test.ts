import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED,
  VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/vigilante.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The vigilante slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: vigilante's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that every
 * archetypeId/name this file references actually exists in the real vendored
 * data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "vigilante",
  );
  if (!entry) throw new Error(`vigilante archetype not found: ${name}`);
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

describe("VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored vigilante archetype feature exactly once", () => {
    const vigilanteFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("vigilante:"))
      .map((f) => f.id);
    expect(vigilanteFeatureIds.length).toBe(143);
    for (const id of vigilanteFeatureIds) {
      expect(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(143);
  });

  it("bucket counts match this wave's audit", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(7);
    expect(counts["blocked"]).toBe(0);
    expect((counts["situational"] ?? 0) + (counts["subsystem"] ?? 0)).toBe(143 - 7);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(7);
    for (const id of numericIds) {
      expect(VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the vendored feature", () => {
    for (const [id, entry] of Object.entries(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `${id}: not found in vendored data`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED: provenance and applied-target hygiene", () => {
  const entries = Object.entries(VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED);

  it("has exactly 7 entries", () => {
    expect(entries.length).toBe(7);
  });

  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of entries) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of entries) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Experimenter: Forbidden Science grants a half-vigilante-level Knowledge (engineering) bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Experimenter")).toBe("vigilante:experimenter");
  });

  it("max(1, floor(unlevel/2)) skill.ken — minimum +1 at low levels, scales at 1/2 level", () => {
    const id = "vigilante:experimenter:forbidden-science:0";
    const [kne] = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(kne!.target).toBe("skill.ken");
    const at = (level: number) => evaluateFormula(kne!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1); // minimum +1
    expect(at(3)).toBe(1);
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
  });
});

describe("Gunmaster: Gunmaster Initiative grants a flat +2 initiative bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Gunmaster")).toBe("vigilante:gunmaster");
  });

  it("flat +2, unconditional and level-independent", () => {
    const id = "vigilante:gunmaster:gunmaster-initiative:4";
    const [initChange] = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(initChange!.target).toBe("init");
    expect(evaluateFormula(initChange!.formula, {})).toBe(2);
    expect(evaluateFormula(initChange!.formula, { class: { unlevel: 20 } })).toBe(2);
  });
});

describe("Masked Maiden: Armor Training reflavors the fighter's Armor Training + Armor Mastery", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Masked Maiden")).toBe("vigilante:masked-maiden");
  });

  it("clamp(floor((unlevel+1)/4), 0, 4) mDexA/acpA — +1 at L3, +2 at L7, +3 at L11, +4 at L15, capped at L20", () => {
    const id = "vigilante:masked-maiden:armor-training:0";
    const [mDexA, acpA] = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(mDexA!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(11)).toBe(3);
    expect(at(15)).toBe(4);
    expect(at(20)).toBe(4); // capped
    expect(evaluateFormula(acpA!.formula, { class: { unlevel: 15 } })).toBe(-4);
  });

  it("DR 5/- only at 19th level and only while wearing armor", () => {
    const id = "vigilante:masked-maiden:armor-training:0";
    const drChange = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes[2]!;
    expect(drChange.target).toBe("dr");
    expect(evaluateFormula(drChange.formula, { class: { unlevel: 18 }, armor: { type: 1 } })).toBe(
      0,
    ); // too low level
    expect(evaluateFormula(drChange.formula, { class: { unlevel: 19 }, armor: { type: 0 } })).toBe(
      0,
    ); // unarmored
    expect(evaluateFormula(drChange.formula, { class: { unlevel: 19 }, armor: { type: 3 } })).toBe(
      5,
    );
  });
});

describe("Wildsoul (Arachnid): Web Specialist grants a flat climb speed at 12th level", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Wildsoul")).toBe("vigilante:wildsoul");
  });

  it("0 below 12th, 30 ft. at and above 12th", () => {
    const id = "vigilante:wildsoul:arachnid:2";
    const [climb] = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(climb!.target).toBe("climbSpeed");
    expect(evaluateFormula(climb!.formula, { class: { unlevel: 6 } })).toBe(0);
    expect(evaluateFormula(climb!.formula, { class: { unlevel: 12 } })).toBe(30);
    expect(evaluateFormula(climb!.formula, { class: { unlevel: 18 } })).toBe(30);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through vigilante's tables when explicitly given as overrides", () => {
  it("falls back to the vigilante extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "vigilante:gunmaster:gunmaster-initiative:4",
      {},
      VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("init");
  });

  it("returns undefined for a vigilante feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "vigilante:hangman:vigilante-specialization:0",
        {},
        VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "vigilante:avenging-beast:spellcasting:0",
        {},
        VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("skill-ranks-per-level divergences: flat -2/level bonusSkillRanks delta", () => {
  it("Avenging Beast, Magical Child, and Zealot each extract -2 * vigilante level on bonusSkillRanks", () => {
    for (const id of [
      "vigilante:avenging-beast:skill-ranks-per-level:0",
      "vigilante:magical-child:skill-ranks-per-level:0",
      "vigilante:zealot:skill-ranks-per-level:0",
    ]) {
      expect(VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
      const effect = VIGILANTE_ARCHETYPE_EFFECTS_EXTRACTED[id]!;
      expect(effect.changes).toHaveLength(1);
      expect(effect.changes[0]!.target).toBe("bonusSkillRanks");
      // 4 + Int instead of 6 + Int: -2 ranks for every vigilante level taken.
      expect(evaluateFormula(effect.changes[0]!.formula, { class: { unlevel: 1 } })).toBe(-2);
      expect(evaluateFormula(effect.changes[0]!.formula, { class: { unlevel: 7 } })).toBe(-14);
      expect(evaluateFormula(effect.changes[0]!.formula, { class: { unlevel: 20 } })).toBe(-40);
    }
  });
});

describe("vigilante specialization: structural, never a Change (class note 3)", () => {
  it("features that force or replace vigilante specialization are classified subsystem, never numeric/blocked", () => {
    for (const id of [
      "vigilante:hangman:vigilante-specialization:0",
      "vigilante:serial-killer:vigilante-specialization:0",
      "vigilante:avenging-beast:patron-spells:0",
      "vigilante:experimenter:forbidden-science:0",
      "vigilante:magical-child:animal-guide:0",
      "vigilante:mounted-fury:mount:0",
      "vigilante:zealot:inquisition:0",
    ]) {
      const entry = VIGILANTE_ARCHETYPE_FEATURE_CLASSIFICATION[id];
      expect(entry, id).toBeDefined();
      // Forbidden Science is numeric for its unrelated skill-bonus clause;
      // every other specialization-replacing feature here has nothing else
      // numeric about it.
      if (id !== "vigilante:experimenter:forbidden-science:0") {
        expect(entry?.bucket).toBe("subsystem");
      }
    }
  });
});
