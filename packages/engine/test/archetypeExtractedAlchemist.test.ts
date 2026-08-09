import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/alchemist.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The alchemist slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: alchemist's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments, and (4) verify every
 * `provenance` string is a verbatim substring of the vendored description
 * after HTML-stripping and whitespace-squashing (the same compare
 * `traitEffectsExtracted.test.ts` uses). `loadRefData` sanity-checks that
 * every id this file references actually exists in the real vendored data
 * slice, same posture as `archetypeEffectsExtracted.test.ts`.
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

describe("ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored alchemist archetype feature exactly once (219 features)", () => {
    const alchemistFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.id.startsWith("alchemist:"))
      .map((f) => f.id);
    expect(alchemistFeatureIds.length).toBe(219);
    for (const id of alchemistFeatureIds) {
      expect(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(219);
  });

  it("bucket counts match the audited totals (numeric 13 / situational 6 / subsystem 156 / blocked 44)", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(13);
    expect(counts["situational"]).toBe(6);
    expect(counts["subsystem"]).toBe(156);
    expect(counts["blocked"]).toBe(44);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(13);
    for (const id of numericIds) {
      expect(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    expect(Object.keys(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(13);
    for (const id of Object.keys(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the vendored feature it keys", () => {
    for (const [id, entry] of Object.entries(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED: structural checks", () => {
  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of Object.entries(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Aerochemist: Aerodynamic Prowess grants a scaling Fly bonus", () => {
  it("+2 at L2, +4 at L5, +6 at L8", () => {
    const id = "alchemist:aerochemist:aerodynamic-prowess:2";
    const [flyChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(flyChange!.target).toBe("skill.fly");
    const at = (level: number) =>
      evaluateFormula(flyChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
    expect(at(20)).toBe(6);
  });
});

describe("Alchemical Sapper: Master Engineer grants three flat +1/2-level skill bonuses", () => {
  it("floor(level/2) to Knowledge (engineering), Craft (stonemasonry), Craft (traps)", () => {
    const id = "alchemist:alchemical-sapper:master-engineer:2";
    const [ken, stonemasonry, traps] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(ken!.target).toBe("skill.ken");
    expect(stonemasonry!.target).toBe("skill.crf.stonemasonry");
    expect(traps!.target).toBe("skill.crf.traps");
    expect(evaluateFormula(ken!.formula, { class: { unlevel: 2 } })).toBe(1);
    expect(evaluateFormula(ken!.formula, { class: { unlevel: 9 } })).toBe(4);
    expect(evaluateFormula(stonemasonry!.formula, { class: { unlevel: 9 } })).toBe(4);
    expect(evaluateFormula(traps!.formula, { class: { unlevel: 9 } })).toBe(4);
  });
});

describe("Trapfinding-family grants: alchemical-trapper / crypt-breaker / trap-breaker / vaultbreaker", () => {
  it("all four mirror the vendored Trapfinding formula (skill.dev, max(1, floor(level/2)))", () => {
    const ids = [
      "alchemist:alchemical-trapper:trapfinding:4",
      "alchemist:crypt-breaker:trapfinding:1",
      "alchemist:trap-breaker:trapfinding:2",
      "alchemist:vaultbreaker:breaking-and-entering:1",
    ];
    for (const id of ids) {
      const [devChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
      expect(devChange!.target).toBe("skill.dev");
      expect(evaluateFormula(devChange!.formula, { class: { unlevel: 1 } })).toBe(1); // minimum 1
      expect(evaluateFormula(devChange!.formula, { class: { unlevel: 10 } })).toBe(5);
    }
  });

  it("this mirrors a real vendored convention: the base Trapfinding class feature carries exactly this Change", () => {
    const trapfinding = Object.values(ref.classFeatures).find(
      (f) => f.name === "Trapfinding" && f.changes?.length,
    );
    expect(trapfinding?.changes).toEqual([
      { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.dev", type: "untyped" },
    ]);
  });
});

describe("Ectochymist: Cool-Headed grants a scaling save bonus vs. death/fear", () => {
  it("+2 at L2, +4 at L5, +6 at L8, scoped to death and fear only ('negative energy effects' dropped)", () => {
    const id = "alchemist:ectochymist:cool-headed:2";
    const [saveChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(saveChange!.target).toBe("allSavingThrows");
    expect(saveChange!.saveCategories).toEqual(["death", "fear"]);
    const at = (level: number) =>
      evaluateFormula(saveChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
  });
});

describe("Energist (Negative/Positive): Energist Resistance grants flat negative-energy resistance", () => {
  it("resistance equals alchemist level for both archetype variants", () => {
    const negId = "alchemist:energist-negative:energist-resistance:2";
    const posId = "alchemist:energist-positive:energist-resistance:2";
    const [negChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[negId]!.changes;
    const [posChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[posId]!.changes;
    expect(negChange!.target).toBe("eres.negative");
    expect(posChange!.target).toBe("eres.negative");
    expect(evaluateFormula(negChange!.formula, { class: { unlevel: 7 } })).toBe(7);
    expect(evaluateFormula(posChange!.formula, { class: { unlevel: 7 } })).toBe(7);
  });
});

describe("Ice Chemist: Cold Sweat grants flat cold resistance equal to level", () => {
  it("eres.cold = class level, unconditional", () => {
    const id = "alchemist:ice-chemist:cold-sweat:2";
    const [coldChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(coldChange!.target).toBe("eres.cold");
    expect(evaluateFormula(coldChange!.formula, { class: { unlevel: 12 } })).toBe(12);
  });
});

describe("Oenopion Researcher: Acid Resistance grants a flat, level-independent 5", () => {
  it("eres.acid = 5 always", () => {
    const id = "alchemist:oenopion-researcher:acid-resistance:3";
    const [acidChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acidChange!.target).toBe("eres.acid");
    expect(evaluateFormula(acidChange!.formula, { class: { unlevel: 3 } })).toBe(5);
    expect(evaluateFormula(acidChange!.formula, { class: { unlevel: 20 } })).toBe(5);
  });
});

describe("Mindchemist: Perfect Recall doubles Intelligence on every Knowledge check", () => {
  it("skill.knowledge = @abilities.int.mod, fanning out to every Knowledge subskill", () => {
    const id = "alchemist:mindchemist:perfect-recall:2";
    const [knowledgeChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(knowledgeChange!.target).toBe("skill.knowledge");
    expect(evaluateFormula(knowledgeChange!.formula, { abilities: { int: { mod: 3 } } })).toBe(3);
  });
});

describe("Herbalist: Herbalism grants a flat competence bonus to Profession (herbalist)", () => {
  it("floor(level/2) competence bonus (Wis-as-key-ability swap not modeled)", () => {
    const id = "alchemist:herbalist:herbalism:1";
    const [proChange] = ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(proChange!.target).toBe("skill.pro.herbalist");
    expect(proChange!.type).toBe("competence");
    expect(evaluateFormula(proChange!.formula, { class: { unlevel: 9 } })).toBe(4);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through alchemist's tables when explicitly given as overrides", () => {
  it("falls back to the alchemist extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "alchemist:ice-chemist:cold-sweat:2",
      {},
      ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("eres.cold");
  });

  it("returns undefined for an alchemist feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "alchemist:dragonblood-chymist:dragonblood-mutagen:1",
        {},
        ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "alchemist:aerochemist:bombs-away:2",
        {},
        ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: vendored-data duplicate-id pairs (byte-identical description within one archetype)", () => {
  const duplicatePairs: [string, string][] = [
    [
      "alchemist:dragonblood-chymist:draconic-resistances:2",
      "alchemist:dragonblood-chymist:draconic-immunity:10",
    ],
    [
      "alchemist:plague-bringer:disease-resistance:2",
      "alchemist:plague-bringer:disease-immunity:10",
    ],
    [
      "alchemist:internal-alchemist:disease-resistance:3",
      "alchemist:internal-alchemist:disease-immunity:10",
    ],
    ["alchemist:horticulturist:plant-voice:2", "alchemist:horticulturist:speak-with-plants:10"],
    [
      "alchemist:crypt-breaker:alkahest-bombs:1",
      "alchemist:crypt-breaker:alkahest-bomb-damage-increase:3",
    ],
    ["alchemist:reanimator:bomb:1", "alchemist:reanimator:simple-reanimation:7"],
  ];

  it("each pair really does share byte-identical vendored description text (confirms the duplication, not a guess)", () => {
    for (const [a, b] of duplicatePairs) {
      expect(ref.archetypeFeatures[a]?.description).toBe(ref.archetypeFeatures[b]?.description);
    }
  });

  it("both ids in every pair are bucketed blocked, with no extracted entry for either", () => {
    for (const [a, b] of duplicatePairs) {
      expect(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION[a]?.bucket).toBe("blocked");
      expect(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION[b]?.bucket).toBe("blocked");
      expect(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[a]).toBeUndefined();
      expect(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[b]).toBeUndefined();
    }
  });
});

describe("blocked bucket: eldritch-poisoner's five level-0 poison-stat-block artifacts", () => {
  it("cure/effect/frequency/save/type are not real features and carry no extracted entry", () => {
    const artifactIds = [
      "alchemist:eldritch-poisoner:cure:0",
      "alchemist:eldritch-poisoner:effect:0",
      "alchemist:eldritch-poisoner:frequency:0",
      "alchemist:eldritch-poisoner:save:0",
      "alchemist:eldritch-poisoner:type:0",
    ];
    for (const id of artifactIds) {
      expect(ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("subsystem bucket: the base Bomb class feature carries zero vendored changes (confirms nothing to double-count)", () => {
  it("the real vendored Bomb class feature has an empty changes[] and a uses.maxFormula pool", () => {
    const bomb = Object.values(ref.classFeatures).find((f) => f.name === "Bomb");
    expect(bomb?.changes ?? []).toEqual([]);
    expect(bomb?.uses?.maxFormula).toBe("@class.unlevel + @abilities.int.mod");
  });
});
