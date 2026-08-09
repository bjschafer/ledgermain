import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED,
  MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/mesmerist.js";

/**
 * The mesmerist slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: mesmerist's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
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
    (a) => a.name === name && a.classTag === "mesmerist",
  );
  if (!entry) throw new Error(`mesmerist archetype not found: ${name}`);
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

describe("MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored mesmerist archetype feature exactly once", () => {
    const mesmeristFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("mesmerist:"))
      .map((f) => f.id);
    expect(mesmeristFeatureIds.length).toBe(92);
    for (const id of mesmeristFeatureIds) {
      expect(MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(92);
  });

  it("bucket counts match the audited totals (numeric 7, blocked 1, situational 13, subsystem 71)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts).toEqual({ numeric: 7, situational: 13, subsystem: 71, blocked: 1 });
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa", () => {
    const numericIds = Object.entries(MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(7);
    for (const id of numericIds) {
      expect(MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
    expect(Object.keys(MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(7);
  });
});

describe("every provenance is a verbatim substring of the vendored description", () => {
  for (const [id, entry] of Object.entries(MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
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

describe("Cult Master: Insidious Personality reflavors Consummate Liar's Bluff bonus onto Diplomacy", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Cult Master")).toBe("mesmerist:cult-master");
  });

  it("max(1, floor(unlevel/2)) skill.dip — 1 at L1, 3 at L6, 6 at L12", () => {
    const id = "mesmerist:cult-master:insidious-personality:1";
    const [dip] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dip!.target).toBe("skill.dip");
    const at = (level: number) => evaluateFormula(dip!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(6)).toBe(3);
    expect(at(12)).toBe(6);
  });
});

describe("Dreamstalker: Sleepless grants immunity to sleep effects", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Dreamstalker")).toBe("mesmerist:dreamstalker");
  });

  it("flat immEffect.sleep flag, level-independent", () => {
    const id = "mesmerist:dreamstalker:sleepless:2";
    const [imm] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(imm!.target).toBe("immEffect.sleep");
    expect(evaluateFormula(imm!.formula, {})).toBe(1);
  });
});

describe("Enigma: Veiled Steps reflavors Consummate Liar's Bluff bonus onto Stealth", () => {
  it("max(1, floor(unlevel/4)) skill.ste — 1 at L1, 2 at L8, 4 at L16", () => {
    const id = "mesmerist:enigma:veiled-steps:1";
    const [ste] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(ste!.target).toBe("skill.ste");
    const at = (level: number) => evaluateFormula(ste!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(16)).toBe(4);
  });
});

describe("Fey Trickster: One with the Fey grants low-light vision (unconditional clause of a mixed feature)", () => {
  it("flat sensell flag, level-independent", () => {
    const id = "mesmerist:fey-trickster:one-with-the-fey:20";
    const [sense] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(sense!.target).toBe("sensell");
    expect(evaluateFormula(sense!.formula, {})).toBe(1);
  });
});

describe("Gaslighter: Consummate Cruelty reflavors Consummate Liar's Bluff bonus onto Intimidate", () => {
  it("max(1, floor(unlevel/2)) skill.int — 1 at L1, 3 at L6, 6 at L12", () => {
    const id = "mesmerist:gaslighter:consummate-cruelty:1";
    const [int] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(int!.target).toBe("skill.int");
    const at = (level: number) => evaluateFormula(int!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(6)).toBe(3);
    expect(at(12)).toBe(6);
  });
});

describe("Mindwyrm Mesmer: Innate Coercion reflavors Consummate Liar's Bluff bonus onto Intimidate", () => {
  it("max(1, floor(unlevel/2)) skill.int — 1 at L1, 5 at L10", () => {
    const id = "mesmerist:mindwyrm-mesmer:innate-coercion:1";
    const [int] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(int!.target).toBe("skill.int");
    const at = (level: number) => evaluateFormula(int!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(10)).toBe(5);
  });
});

describe("Toxitician: Deft Fingers reflavors Consummate Liar's Bluff bonus onto Sleight of Hand", () => {
  it("max(1, floor(unlevel/2)) skill.slt — 1 at L1, 3 at L6", () => {
    const id = "mesmerist:toxitician:deft-fingers:1";
    const [slt] = MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(slt!.target).toBe("skill.slt");
    const at = (level: number) => evaluateFormula(slt!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(6)).toBe(3);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through mesmerist's tables when explicitly given as overrides", () => {
  it("falls back to the mesmerist extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "mesmerist:cult-master:insidious-personality:1",
      {},
      MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.dip");
  });

  it("returns undefined for a mesmerist feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "mesmerist:aromaphile:hypnotic-aroma:1",
        {},
        MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "mesmerist:vexing-trickster:consummate-trickster:1",
        {},
        MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: Consummate Trickster's missing replacement pairing (mesmerist)", () => {
  it("Vexing Trickster's Consummate Trickster is recorded as blocked, not backfilled", () => {
    const entry =
      MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION[
        "mesmerist:vexing-trickster:consummate-trickster:1"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED["mesmerist:vexing-trickster:consummate-trickster:1"],
    ).toBeUndefined();
  });

  it("the real vendored Consummate Liar class feature carries a genuine skill.blf Change — confirms the double-count risk this entry's note describes is real, not hypothetical", () => {
    const consummateLiar = Object.values(ref.classFeatures).find(
      (f) => f.name === "Consummate Liar",
    );
    expect(consummateLiar?.changes).toEqual([
      { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.blf", type: "untyped" },
    ]);
  });

  it("none of the ~9 mesmerist archetype features that replace Consummate Liar in prose carry a pairedBaseFeatureUuid to it — a vendored-data gap, not a modeling choice", () => {
    const consummateLiarUuid = Object.values(ref.classFeatures).find(
      (f) => f.name === "Consummate Liar",
    )?.uuid;
    expect(consummateLiarUuid).toBeDefined();
    const pairedToConsummateLiar = Object.values(ref.archetypeFeatures).filter(
      (f) =>
        f.archetypeId.startsWith("mesmerist:") && f.pairedBaseFeatureUuid === consummateLiarUuid,
    );
    expect(pairedToConsummateLiar.length).toBe(0);
  });
});
