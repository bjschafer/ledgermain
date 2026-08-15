import { describe, expect, it } from "bun:test";

import type { ArchetypeFeature } from "@pf1/schema";

import { loadRefData } from "../src/index.js";
import {
  SUPPLEMENTAL_ARCHETYPE_FEATURE_PAIRING,
  applyArchetypeFeaturePairingSupplements,
} from "../src/supplements.js";

const ref = loadRefData();

/**
 * One stand-in feature per table entry, since the apply pass walks the whole
 * table and would throw "not found" for any id the fixture omitted. `over`
 * patches the FIRST entry only, which is what each negative case perturbs.
 */
function fixtures(over: Partial<ArchetypeFeature> = {}): ArchetypeFeature[] {
  return Object.entries(SUPPLEMENTAL_ARCHETYPE_FEATURE_PAIRING).map(([id, s], i) => ({
    id,
    name: s.name,
    uuid: `test:${id}`,
    description: `<p>A sharptooth gains a swim speed of 10 feet. his ${s.keyword}.</p>`,
    archetypeId: id.split(":").slice(0, 2).join(":"),
    classTag: id.split(":")[0]!,
    level: 1,
    ...(i === 0 ? over : {}),
  }));
}

describe("every pairing supplement lands in the vendored slice", () => {
  it.each(
    Object.entries(SUPPLEMENTAL_ARCHETYPE_FEATURE_PAIRING).map(([id, s]) => [id, s] as const),
  )("%s", (id, s) => {
    const f = ref.archetypeFeatures[id];
    expect(f?.name).toBe(s.name);
    expect(f?.pairedBaseFeatureUuid).toBe(s.pairedBaseFeatureUuid);
  });

  it("pairs Sharptooth's swim speed against Fast Movement on both barbarian chassis", () => {
    // Barbarian's 1st level grants Fast Movement and Rage, so the level
    // fallback in `pairBaseFeature` declines to guess between them.
    for (const tag of ["barbarian", "barbarianUnchained"]) {
      const f = ref.archetypeFeatures[`${tag}:sharptooth:swim-like-a-fish:1`];
      expect(f?.pairedBaseFeatureUuid).toBe("Compendium.pf1.class-abilities.Item.9EX00obqhGHcrOdp");
    }
    const barbarian = Object.values(ref.classes).find((c) => c.tag === "barbarian");
    const fastMovement = barbarian?.features.find(
      (g) => g.uuid === "Compendium.pf1.class-abilities.Item.9EX00obqhGHcrOdp",
    );
    expect(fastMovement?.name).toBe("Fast Movement");
  });
});

describe("pairing drift guards", () => {
  it("pairs features that arrive unpaired", () => {
    const features = fixtures();
    applyArchetypeFeaturePairingSupplements(features);
    for (const f of features) {
      expect(f.pairedBaseFeatureUuid).toBe(
        SUPPLEMENTAL_ARCHETYPE_FEATURE_PAIRING[f.id]!.pairedBaseFeatureUuid,
      );
    }
  });

  it("throws when the supplemented id is gone", () => {
    expect(() => applyArchetypeFeaturePairingSupplements([])).toThrow(/not found in vendored set/);
  });

  it("throws when upstream renames the feature", () => {
    expect(() =>
      applyArchetypeFeaturePairingSupplements(fixtures({ name: "Swim Like A Fish" })),
    ).toThrow(/is now named/);
  });

  it("throws when the sentence the pairing was read from is gone", () => {
    expect(() =>
      applyArchetypeFeaturePairingSupplements(
        fixtures({ description: "<p>A sharptooth gains a swim speed of 10 feet.</p>" }),
      ),
    ).toThrow(/no longer says/);
  });

  it("throws when upstream starts pairing the feature itself", () => {
    expect(() =>
      applyArchetypeFeaturePairingSupplements(fixtures({ pairedBaseFeatureUuid: "whatever" })),
    ).toThrow(/retire its supplement entry/);
  });
});
