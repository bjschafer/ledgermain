import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED,
  BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/bloodrager.js";

/**
 * The bloodrager slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: bloodrager's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
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
    (a) => a.name === name && a.classTag === "bloodrager",
  );
  if (!entry) throw new Error(`bloodrager archetype not found: ${name}`);
  return entry.id;
}

describe("BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored bloodrager archetype feature exactly once", () => {
    const bloodragerFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("bloodrager:"))
      .map((f) => f.id);
    expect(bloodragerFeatureIds.length).toBe(61);
    for (const id of bloodragerFeatureIds) {
      expect(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(61);
  });

  it("spans 17 of the 18 vendored bloodrager archetypes (Crossblooded Rager has no feature rows — see below)", () => {
    const covered = new Set(
      Object.values(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(covered.size).toBe(17);
    expect(covered.has("bloodrager:crossblooded-rager")).toBe(false);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(3);
    for (const id of numericIds) {
      expect(BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 3 numeric, 3 situational, 55 subsystem, 0 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 3, situational: 3, subsystem: 55, blocked: 0 });
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Hag-Riven: Scarred Hide grants a flat, scaling natural armor bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Hag-Riven")).toBe("bloodrager:hag-riven");
  });

  it("+1 at 7th, +1 more at 10th/13th/16th/19th, capped at +5", () => {
    const id = "bloodrager:hag-riven:scarred-hide:7";
    const [change] = BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("nac");
    expect(change!.type).toBe("natural");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(7)).toBe(1);
    expect(at(9)).toBe(1);
    expect(at(10)).toBe(2);
    expect(at(13)).toBe(3);
    expect(at(16)).toBe(4);
    expect(at(19)).toBe(5);
    expect(at(20)).toBe(5); // caps at +5, no further increase past 19th
  });

  it("is unpaired — nothing to double-count", () => {
    const feature = ref.archetypeFeatures["bloodrager:hag-riven:scarred-hide:7"];
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Steelblood: Indomitable Stance grants flat CMB, CMD-vs-overrun, and AC-vs-charge bonuses (Reflex-vs-trample and atk/dmg-vs-charging clauses are dropped)", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Steelblood")).toBe("bloodrager:steelblood");
  });

  it("flat +1 combat maneuver checks, level-independent", () => {
    const id = "bloodrager:steelblood:indomitable-stance:1";
    const [change] = BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("cmb");
    expect(change!.type).toBe("untyped");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 20 } })).toBe(1);
  });

  it("flat +1 CMD vs. overrun, scoped via maneuverCategories", () => {
    const id = "bloodrager:steelblood:indomitable-stance:1";
    const [, cmdChange] = BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(cmdChange!.target).toBe("cmd");
    expect(cmdChange!.type).toBe("untyped");
    expect(cmdChange!.maneuverCategories).toEqual(["overrun"]);
    expect(evaluateFormula(cmdChange!.formula, { class: { unlevel: 1 } })).toBe(1);
  });

  it("flat +1 AC vs. charge attacks, scoped via acCategories", () => {
    const id = "bloodrager:steelblood:indomitable-stance:1";
    const [, , acChange] = BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.target).toBe("ac");
    expect(acChange!.type).toBe("untyped");
    expect(acChange!.acCategories).toEqual(["charge"]);
    expect(evaluateFormula(acChange!.formula, { class: { unlevel: 1 } })).toBe(1);
  });
});

describe("Steelblood: Armor Training reflavors the fighter mDexA/acpA mechanism on a 5th/9th/13th/17th cadence", () => {
  it("+1 max Dex / -1 ACP at 5th, scaling to +4/-4 at 17th, capped there", () => {
    const id = "bloodrager:steelblood:armor-training:5";
    const [mDexA, acpA] = BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(mDexA!.target).toBe("mDexA");
    expect(acpA!.target).toBe("acpA");
    const atMDex = (level: number) =>
      evaluateFormula(mDexA!.formula, { class: { unlevel: level } });
    const atAcp = (level: number) => evaluateFormula(acpA!.formula, { class: { unlevel: level } });
    expect(atMDex(4)).toBe(0);
    expect(atMDex(5)).toBe(1);
    expect(atAcp(5)).toBe(-1);
    expect(atMDex(9)).toBe(2);
    expect(atMDex(13)).toBe(3);
    expect(atMDex(17)).toBe(4);
    expect(atAcp(17)).toBe(-4);
    expect(atMDex(20)).toBe(4); // caps at +4/-4 past 17th
    expect(atAcp(20)).toBe(-4);
  });

  it("matches the vendored fighter Armor Training class feature's own formula shape (just a shifted cadence)", () => {
    const fighterArmorTraining = Object.values(ref.classFeatures).find(
      (f) => f.name === "Armor Training",
    );
    expect(fighterArmorTraining?.changes).toEqual([
      { formula: "clamp(floor((@class.unlevel + 1) / 4), 0, 4)", target: "mDexA", type: "untyped" },
      {
        formula: "-clamp(floor((@class.unlevel + 1) / 4), 0, 4)",
        target: "acpA",
        type: "untyped",
      },
    ]);
  });

  it("replaces improved uncanny dodge, which carries zero vendored changes — no double-count risk", () => {
    const iud = Object.values(ref.classFeatures).find((f) => f.name === "Improved Uncanny Dodge");
    expect(iud?.changes ?? []).toEqual([]);
  });
});

describe("subsystem posture: base Damage Reduction carries zero vendored changes", () => {
  it("Damage Reduction (all copies) has empty changes, so Bloody Knuckles has nothing to strike", () => {
    const dr = Object.values(ref.classFeatures).filter((f) => f.name === "Damage Reduction");
    expect(dr.length).toBeGreaterThan(0);
    for (const f of dr) {
      expect(f.changes ?? []).toEqual([]);
    }
  });

  it("Fast Movement (base) carries a real landSpeed Change, and stays unsuppressed by the 4 unpaired archetype features that claim to replace it", () => {
    const fastMovement = Object.values(ref.classFeatures).find(
      (f) => f.name === "Fast Movement" && (f.changes?.length ?? 0) > 0,
    );
    expect(fastMovement?.changes).toEqual([
      {
        formula: "if(and(lte(@armor.type, 2), lt(@attributes.encumbrance.level, 2)), 10)",
        target: "landSpeed",
        type: "base",
      },
    ]);
    for (const id of [
      "bloodrager:bloodrider:fast-rider:1",
      "bloodrager:blood-conduit:contact-specialist:1",
      "bloodrager:bloody-knuckled-rowdy:pugilist:1",
      "bloodrager:steelblood:indomitable-stance:1",
    ]) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `feature not found: ${id}`).toBeDefined();
      expect(feature?.pairedBaseFeatureUuid, `${id} unexpectedly paired`).toBeUndefined();
    }
  });
});

describe("vendored-data oddities recorded in the classification (not guessed at)", () => {
  it("Crossblooded Rager has zero archetypeFeatures rows — its -2 Will penalty lives only in the archetype description", () => {
    expect(
      Object.values(ref.archetypes).some((a) => a.id === "bloodrager:crossblooded-rager"),
    ).toBe(true);
    const features = Object.values(ref.archetypeFeatures).filter(
      (f) => f.archetypeId === "bloodrager:crossblooded-rager",
    );
    expect(features).toEqual([]);
    const description = strippedDescription(
      ref.archetypes["bloodrager:crossblooded-rager"]?.description ?? "",
    );
    expect(description).toContain("takes a");
    expect(description).toContain("penalty to all Will saving throws at all times");
  });

  it("Rageshaper's Devastating Form/Terrible Slam/Terrible Leap measure their numbers in 'shifter level,' despite Rageshaper being a bloodrager archetype", () => {
    for (const id of [
      "bloodrager:rageshaper:devastating-form:1",
      "bloodrager:rageshaper:terrible-leap:5",
    ]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(strippedDescription(feature.description ?? "")).toContain("shifter level");
    }
    const terribleSlam = ref.archetypeFeatures["bloodrager:rageshaper:terrible-slam:1"]!;
    expect(strippedDescription(terribleSlam.description ?? "")).toContain(
      "the shifter claws class ability",
    );
  });

  it("Prowler at World's End and Untouchable Rager both have a 'Bloodline' row restating the generic base Bloodline text", () => {
    const baseBloodlineOpening =
      "Each bloodrager has a source of magic somewhere in his heritage that empowers his " +
      "bloodrages, bonus feats, and bonus spells.";
    for (const id of [
      "bloodrager:prowler-at-world-s-end:bloodline-destined:1",
      "bloodrager:untouchable-rager:bloodline:1",
    ]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(strippedDescription(feature.description ?? "")).toContain(baseBloodlineOpening);
      expect(BLOODRAGER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
    }
  });

  it("Untouchable Rager's two 'Raging Resistance' rows (4th/7th) carry byte-identical description text", () => {
    const four = ref.archetypeFeatures["bloodrager:untouchable-rager:raging-resistance:4"]!;
    const seven = ref.archetypeFeatures["bloodrager:untouchable-rager:raging-resistance:7"]!;
    expect(strippedDescription(four.description ?? "")).toBe(
      strippedDescription(seven.description ?? ""),
    );
  });
});

describe("resolveArchetypeFeatureEffect: resolves through bloodrager's tables when explicitly given as overrides", () => {
  it("falls back to the bloodrager extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "bloodrager:hag-riven:scarred-hide:7",
      {},
      BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("nac");
  });

  it("returns undefined for a bloodrager feature classified subsystem/situational (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "bloodrager:rageshaper:invulnerable-defenses:2",
        {},
        BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "bloodrager:urban-bloodrager:controlled-bloodrage:1",
        {},
        BLOODRAGER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
