import { describe, expect, it } from "bun:test";

import type { ClassFeature } from "@pf1/schema";

import { loadRefData } from "../src/index.js";
import {
  SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY,
  applyClassFeatureEffectImmunitySupplements,
} from "../src/supplements.js";

const ref = loadRefData();

describe("class-feature names are not unique, which is why the supplement table keys on id", () => {
  it('the vendored slice really does carry three distinct features named "Aura of Courage"', () => {
    // The whole reason for id keying (paladin's own, plus the Asavir and
    // Chevalier prestige versions). If upstream ever collapses these, this
    // test should fail loudly so the decision can be revisited.
    const named = Object.values(ref.classFeatures).filter((f) => f.name === "Aura of Courage");
    expect(named).toHaveLength(3);
    expect(new Set(named.map((f) => f.id)).size).toBe(3);
  });
});

describe("every supplement id resolves to the feature it claims", () => {
  it.each(
    Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY).map(
      ([id, s]) => [s.name, id] as const,
    ),
  )("%s (%s)", (name, id) => {
    expect(ref.classFeatures[id]?.name).toBe(name);
  });

  it("each carries exactly its supplemented immEffect targets in the built data", () => {
    for (const [id, supp] of Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY)) {
      const targets = ref.classFeatures[id]!.changes.map((c) => c.target).filter((t) =>
        t.startsWith("immEffect."),
      );
      expect(targets.sort()).toEqual(supp.effects.map((e) => `immEffect.${e}`).sort());
    }
  });
});

describe("applyClassFeatureEffectImmunitySupplements drift guards", () => {
  const bare = (id: string, name: string, description: string): ClassFeature =>
    ({
      id,
      name,
      uuid: `Compendium.pf1.class-abilities.Item.${id}`,
      description,
      changes: [],
      grantsBuffs: [],
    }) as ClassFeature;

  it("throws when a supplemented id is missing from the vendored set", () => {
    expect(() =>
      applyClassFeatureEffectImmunitySupplements([bare("some-other-id", "Whatever", "")]),
    ).toThrow(/not found in vendored class features/);
  });

  it("throws when the id now points at a differently-named feature", () => {
    const features = Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY).map(([id]) =>
      bare(id, "Renamed Upstream", ""),
    );
    expect(() => applyClassFeatureEffectImmunitySupplements(features)).toThrow(
      /the vendored content moved under this id/,
    );
  });

  it("throws when a feature's description no longer mentions its recorded keyword", () => {
    const features = Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY).map(([id, s]) =>
      bare(id, s.name, "<p>Rewritten upstream to grant something else.</p>"),
    );
    expect(() => applyClassFeatureEffectImmunitySupplements(features)).toThrow(
      /description no longer mentions/,
    );
  });

  it("appends to existing changes rather than replacing them", () => {
    const [id, supp] = Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY)[0]!;
    const feature = bare(id, supp.name, `<p>${supp.keyword}</p>`);
    feature.changes = [{ formula: "1", target: "ac", type: "dodge" }];
    const rest = Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY)
      .slice(1)
      .map(([rid, rs]) => bare(rid, rs.name, `<p>${rs.keyword}</p>`));
    applyClassFeatureEffectImmunitySupplements([feature, ...rest]);
    expect(feature.changes[0]).toEqual({ formula: "1", target: "ac", type: "dodge" });
    expect(feature.changes).toHaveLength(1 + supp.effects.length);
  });
});
