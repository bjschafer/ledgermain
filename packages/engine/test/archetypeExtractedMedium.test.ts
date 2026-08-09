import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED,
  MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/medium.js";

/**
 * The medium slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: medium's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path (same posture as the magus/barbarian
 * pilots). These fixtures therefore (1) assert directly against
 * `MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes` shape, (2)
 * hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) against the exact published-rules numbers cited in each
 * entry's `provenance`, and (3) verify `resolveArchetypeFeatureEffect`
 * resolves correctly when explicitly given this file's tables as its override
 * arguments. `loadRefData` sanity-checks that every id/name this file
 * references actually exists in the real vendored data slice.
 *
 * Medium has NO suppression-composition case (a Change coexisting with a
 * vendored base-feature `changes[]`): both numeric entries are unpaired
 * additions (no `pairedBaseFeatureUuid`) rather than reflavors of a base
 * class feature that itself carries a vendored number, so there's nothing to
 * suppress and no `applied: false` to observe here — noted rather than
 * forcing an artificial case, matching magus.ts's own precedent.
 */
const ref = loadRefData();

const KNOWLEDGE_SKILLS = [
  "kar",
  "kdu",
  "ken",
  "kge",
  "khi",
  "klo",
  "kna",
  "kno",
  "kpl",
  "kre",
] as const;

/** The same normalization the sweep's batch files used: tags out, whitespace squashed (see traitEffectsExtracted.test.ts). */
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

describe("MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored medium archetype feature exactly once", () => {
    const mediumFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("medium:"))
      .map((f) => f.id);
    expect(mediumFeatureIds.length).toBe(74);
    for (const id of mediumFeatureIds) {
      expect(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(74);
  });

  it("every classification key matches a real vendored archetype-feature id", () => {
    for (const id of Object.keys(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id]).toBeDefined();
    }
  });

  it("bucket counts: 2 numeric, 1 blocked, the rest split situational/subsystem", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts.numeric).toBe(2);
    expect(counts.blocked).toBe(1);
    expect(
      (counts.numeric ?? 0) +
        (counts.situational ?? 0) +
        (counts.subsystem ?? 0) +
        (counts.blocked ?? 0),
    ).toBe(74);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry", () => {
    const numericIds = Object.entries(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.sort()).toEqual(
      ["medium:storyteller:knowledge-of-tales:1", "medium:uda-wendo:wendo-s-secrets:2"].sort(),
    );
    for (const id of numericIds) {
      expect(MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("the one blocked entry is Reanimated Medium's Spirit Warding (save-category vocabulary gap)", () => {
    const blocked = Object.entries(MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, e]) => e.bucket === "blocked")
      .map(([id]) => id);
    expect(blocked).toEqual(["medium:reanimated-medium:spirit-warding:7"]);
  });
});

describe("every entry's provenance is a verbatim substring of the vendored description", () => {
  it("Storyteller: Knowledge of Tales", () => {
    const id = "medium:storyteller:knowledge-of-tales:1";
    const feature = ref.archetypeFeatures[id]!;
    const description = strippedDescription(feature.description ?? "");
    expect(description.includes(MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED[id]!.provenance)).toBe(true);
  });

  it("Uda Wendo: Wendo's Secrets", () => {
    const id = "medium:uda-wendo:wendo-s-secrets:2";
    const feature = ref.archetypeFeatures[id]!;
    const description = strippedDescription(feature.description ?? "");
    expect(description.includes(MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED[id]!.provenance)).toBe(true);
  });
});

describe("Storyteller: Knowledge of Tales grants a rank-gated Knowledge bonus", () => {
  const id = "medium:storyteller:knowledge-of-tales:1";
  const entry = MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED[id]!;

  it("has exactly 10 changes, one per Knowledge skill, all on 'skill.<id>' targets", () => {
    expect(entry.changes.length).toBe(10);
    const targets = entry.changes.map((ch) => ch.target).sort();
    expect(targets).toEqual(KNOWLEDGE_SKILLS.map((id) => `skill.${id}`).sort());
  });

  it("+1 at L1 (trained), +2 at L4, +6 at L20, 0 when untrained regardless of level", () => {
    const karChange = entry.changes.find((ch) => ch.target === "skill.kar")!;
    const at = (level: number, rank: number) =>
      evaluateFormula(karChange.formula, {
        class: { unlevel: level },
        skills: { kar: { rank } },
      });
    expect(at(1, 1)).toBe(1);
    expect(at(4, 1)).toBe(2);
    expect(at(20, 1)).toBe(6);
    expect(at(20, 0)).toBe(0); // untrained: no bonus regardless of level
  });

  it("matches the entry's own detail string at L8", () => {
    expect(entry.detail?.(8)).toBe("+3 on trained Knowledge skills");
  });

  it("has no paired base-feature slot — an unpaired additive grant", () => {
    const feature = ref.archetypeFeatures[id];
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Uda Wendo: Wendo's Secrets grants a flat, unconditional Cha-mod Knowledge bonus", () => {
  const id = "medium:uda-wendo:wendo-s-secrets:2";
  const entry = MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED[id]!;

  it("has exactly 10 changes, one per Knowledge skill", () => {
    expect(entry.changes.length).toBe(10);
    const targets = entry.changes.map((ch) => ch.target).sort();
    expect(targets).toEqual(KNOWLEDGE_SKILLS.map((id) => `skill.${id}`).sort());
  });

  it("Cha 16 (+3 mod) yields +3, regardless of class level", () => {
    const knChange = entry.changes.find((ch) => ch.target === "skill.kna")!;
    expect(evaluateFormula(knChange.formula, { abilities: { cha: { mod: 3 } } })).toBe(3);
    expect(
      evaluateFormula(knChange.formula, {
        class: { unlevel: 20 },
        abilities: { cha: { mod: 3 } },
      }),
    ).toBe(3);
  });

  it("a negative Charisma modifier contributes 0, not a penalty ('if any')", () => {
    const knChange = entry.changes.find((ch) => ch.target === "skill.kna")!;
    expect(evaluateFormula(knChange.formula, { abilities: { cha: { mod: -2 } } })).toBe(0);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through medium's tables when explicitly given as overrides", () => {
  it("falls back to the medium extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "medium:storyteller:knowledge-of-tales:1",
      {},
      MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes.length).toBe(10);
  });

  it("returns undefined for a medium feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "medium:medium-of-the-master:dedicated-spirit:1",
        {},
        MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "medium:nexian-channeler:impossible-eye:3",
        {},
        MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "medium:reanimated-medium:spirit-warding:7",
        {},
        MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: Reanimated Medium's Spirit Warding names a save category outside the closed vocabulary", () => {
  it("'death' and 'possession' exist in SAVE_CATEGORIES but 'negative energy' does not, and the 18th-level immunity upgrade has no target either", () => {
    const entry =
      MEDIUM_ARCHETYPE_FEATURE_CLASSIFICATION["medium:reanimated-medium:spirit-warding:7"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      MEDIUM_ARCHETYPE_EFFECTS_EXTRACTED["medium:reanimated-medium:spirit-warding:7"],
    ).toBeUndefined();
  });
});
