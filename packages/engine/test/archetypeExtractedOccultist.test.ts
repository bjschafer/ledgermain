import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED,
  OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/occultist.js";

/**
 * The occultist slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: occultist's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that
 * every archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 *
 * Occultist has NO suppression-composition case analogous to fighter's Armor
 * Training reflavors: both extracted entries are safe additive grants with
 * nothing to double-count (Battle Host's Bonus Feat is paired to Shift
 * Focus, one of the four base features it replaces, but all four are
 * confirmed `changes: []` in class-features.json; Planar Harmonizer's Planar
 * Scholar has no paired base feature at all), so there's nothing to suppress
 * and no `applied: false` to observe. This is noted explicitly rather than
 * forcing an artificial case.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "occultist",
  );
  if (!entry) throw new Error(`occultist archetype not found: ${name}`);
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

describe("OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored occultist archetype feature exactly once", () => {
    const occultistFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("occultist:"))
      .map((f) => f.id);
    expect(occultistFeatureIds.length).toBe(100);
    for (const id of occultistFeatureIds) {
      expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(100);
  });

  it("every classified id is a real vendored occultist feature (no stray/typo'd keys)", () => {
    for (const id of Object.keys(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id], `unknown vendored feature id ${id}`).toBeDefined();
    }
  });

  it("bucket counts match the audited totals", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(4);
    expect(counts.situational).toBe(10);
    expect(counts.subsystem).toBe(69);
    expect(counts.blocked).toBe(17);
    expect(counts.numeric + counts.situational + counts.subsystem + counts.blocked).toBe(100);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(4);
    for (const id of numericIds) {
      expect(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
    expect(Object.keys(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(4);
  });
});

describe("OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED: provenance is verbatim vendored text", () => {
  it("every provenance is a verbatim substring of the vendored description after HTML-stripping/whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Battle Host: Bonus Feat grants a safe, additive bonus-feat count", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Battle Host")).toBe("occultist:battle-host");
  });

  it("clamp(floor(unlevel/4), 0, 4) — 1 at L4, 2 at L8, 3 at L12, 4 at L16, capped at L20", () => {
    const id = "occultist:battle-host:bonus-feat:4";
    const [feats] = OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(0);
    expect(at(4)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(12)).toBe(3);
    expect(at(16)).toBe(4);
    expect(at(20)).toBe(4); // capped, no further tier past 16th in the published text
  });

  it("is paired to Shift Focus (one of its four replaced base features), and every replaced base feature carries zero vendored changes — nothing to suppress or double-count", () => {
    const feature = ref.archetypeFeatures["occultist:battle-host:bonus-feat:4"];
    expect(feature?.pairedBaseFeatureUuid).toBe(
      "Compendium.pf1.class-abilities.Item.lkVGkpsywFpdtoIs",
    );
    for (const name of ["Shift Focus", "Magic Circles", "Binding Circles", "Fast Circles"]) {
      const base = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(base?.changes ?? [], `${name} should carry no vendored changes`).toEqual([]);
    }
  });
});

describe("Planar Harmonizer: Planar Scholar grants a flat Knowledge (planes) bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Planar Harmonizer")).toBe("occultist:planar-harmonizer");
  });

  it("floor(unlevel/2) skill.kpl — unconditional, scales with occultist level", () => {
    const id = "occultist:planar-harmonizer:planar-scholar:2";
    const [skillChange] = OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(skillChange!.target).toBe("skill.kpl");
    const at = (level: number) =>
      evaluateFormula(skillChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(8)).toBe(4);
    expect(at(20)).toBe(10);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through occultist's tables when explicitly given as overrides", () => {
  it("falls back to the occultist extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "occultist:planar-harmonizer:planar-scholar:2",
      {},
      OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.kpl");
  });

  it("returns undefined for an occultist feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "occultist:curator:split-focus:1",
        {},
        OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "occultist:geomancer:survivalist:2",
        {},
        OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "occultist:naturalist:animal-focus:4",
        {},
        OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: mental-focus-pool formula/size divergences (occultist)", () => {
  it("the real vendored Mental Focus class feature carries zero changes[] (only a uses.maxFormula resource) — confirms there is nothing for a Change to double-count against directly, the risk is purely formula/size divergence", () => {
    const mentalFocus = Object.values(ref.classFeatures).find((f) => f.name === "Mental Focus");
    expect(mentalFocus?.changes ?? []).toEqual([]);
    expect(mentalFocus?.uses?.maxFormula).toBe("@class.unlevel + @abilities.int.mod");
  });

  it("Curator's Split Focus drops the Int-modifier term entirely — blocked, not backfilled", () => {
    const entry = OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION["occultist:curator:split-focus:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED["occultist:curator:split-focus:1"],
    ).toBeUndefined();
  });

  it("Extemporaneous Channeler's Fleeting Focus doubles the Int-modifier term — also blocked", () => {
    const entry =
      OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[
        "occultist:extemporaneous-channeler:fleeting-focus:1"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED["occultist:extemporaneous-channeler:fleeting-focus:1"],
    ).toBeUndefined();
  });

  it("Silksworn's Mental Focus adds a Charisma-modifier term the vendored formula doesn't have — also blocked", () => {
    const entry = OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION["occultist:silksworn:mental-focus:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED["occultist:silksworn:mental-focus:1"],
    ).toBeUndefined();
  });

  it("Panoply Savant's Panoply Focus and Curator's Mental Catalog both directly resize a focus pool — blocked", () => {
    for (const id of [
      "occultist:panoply-savant:panoply-focus:4",
      "occultist:curator:mental-catalog:8",
    ]) {
      expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("blocked bucket: vendored copy-paste errors (occultist)", () => {
  it("every occultist:naturalist feature is blocked — the archetype's vendored text is Summoner's own Naturalist archetype", () => {
    const naturalistIds = Object.keys(ref.archetypeFeatures).filter((id) =>
      id.startsWith("occultist:naturalist:"),
    );
    expect(naturalistIds.length).toBe(8);
    for (const id of naturalistIds) {
      expect(
        OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket,
        `${id} should be blocked (mismatched vendored data)`,
      ).toBe("blocked");
    }
  });

  it("Summoner-only base features referenced by the mismatched naturalist text exist in the vendored data, but not as occultist content", () => {
    for (const name of [
      "Shield Ally",
      "Greater Shield Ally",
      "Life Bond",
      "Aspect",
      "Greater Aspect",
    ]) {
      const found = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(found, `${name} should exist as vendored class-feature content`).toBeDefined();
    }
  });

  it("Occult Historian's Trap Sense is blocked — its vendored description is verbatim the base class's Focus Powers text", () => {
    const trapSense = ref.archetypeFeatures["occultist:occult-historian:trap-sense:3"]!;
    const focusPowers = Object.values(ref.classFeatures).find((f) => f.name === "Focus Powers")!;
    const stripped = (html: string) => strippedDescription(html);
    expect(stripped(trapSense.description ?? "").slice(0, 80)).toBe(
      stripped(focusPowers.description ?? "").slice(0, 80),
    );
    expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[trapSense.id]?.bucket).toBe("blocked");
  });
});

describe("blocked bucket: Silksworn Arcana's DC bonus needs a per-cast equipped-gear check spellDC.<school> can't express", () => {
  it("Silksworn Arcana stays blocked (school-matched clothing slot is a live equipment condition)", () => {
    const id = "occultist:silksworn:silksworn-arcana:16";
    expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
    expect(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
  });
});

describe("Necroccultist: Necromantic Bond raises the DC of necromancy spells by 2 at 14th level", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Necroccultist")).toBe("occultist:necroccultist");
  });

  it("if(unlevel >= 14, 2, 0) targeting spellDC.necromancy — 0 before 14th, +2 at and after", () => {
    const id = "occultist:necroccultist:necromantic-bond:1";
    const [dcChange] = OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dcChange!.target).toBe("spellDC.necromancy");
    const at = (level: number) => evaluateFormula(dcChange!.formula, { class: { unlevel: level } });
    expect(at(10)).toBe(0);
    expect(at(13)).toBe(0);
    expect(at(14)).toBe(2);
    expect(at(20)).toBe(2);
  });

  it("classified numeric, with a matching extracted entry", () => {
    const id = "occultist:necroccultist:necromantic-bond:1";
    expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    expect(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
  });
});

describe("Planar Harmonizer: Conductor raises the DC of conjuration spells by 2 at 14th level", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Planar Harmonizer")).toBe("occultist:planar-harmonizer");
  });

  it("if(unlevel >= 14, 2, 0) targeting spellDC.conjuration — 0 before 14th, +2 at and after", () => {
    const id = "occultist:planar-harmonizer:conductor:1";
    const [dcChange] = OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dcChange!.target).toBe("spellDC.conjuration");
    const at = (level: number) => evaluateFormula(dcChange!.formula, { class: { unlevel: level } });
    expect(at(10)).toBe(0);
    expect(at(13)).toBe(0);
    expect(at(14)).toBe(2);
    expect(at(20)).toBe(2);
  });

  it("classified numeric, with a matching extracted entry", () => {
    const id = "occultist:planar-harmonizer:conductor:1";
    expect(OCCULTIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    expect(OCCULTIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
  });
});
