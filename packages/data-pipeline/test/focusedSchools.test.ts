import { describe, expect, it } from "bun:test";

import type { WizardSchool } from "@pf1/schema";

import type { RawDoc } from "../src/util/packs.js";
import {
  parseAssociatedSchoolId,
  parseReplacedPowers,
  transformFocusedSchool,
} from "../src/transform/focusedSchools.js";

/**
 * Unit coverage for the focused-school parser, on hand-built input shaped
 * like the real vendored `wizard-schools/focused-schools/*.yaml` docs.
 * `refdata.test.ts` covers the result against the real vendored slice.
 */

describe("parseAssociatedSchoolId", () => {
  it("reads the Associated School @UUID link's id, with or without the .Item. segment", () => {
    expect(
      parseAssociatedSchoolId(
        "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.Sy1M5VOCitnDDNKw]{Evocation School}</p>",
      ),
    ).toBe("Sy1M5VOCitnDDNKw");
    expect(
      parseAssociatedSchoolId(
        "<p><strong>Associated School</strong>: @UUID[Compendium.pf1.class-abilities.Item.tSmRmVuqYPDTyVZY]{Universalist}.</p>",
      ),
    ).toBe("tSmRmVuqYPDTyVZY");
  });

  it("returns undefined when the line is absent", () => {
    expect(parseAssociatedSchoolId("<p>No such line here.</p>")).toBeUndefined();
  });
});

describe("parseReplacedPowers", () => {
  it("reads @UUID-linked replacement targets as ids", () => {
    const html =
      "<p><strong>Replacement Powers:</strong> The following school powers replace the " +
      "@UUID[Compendium.pf1.class-abilities.OZ1vgybloYDVfWff]{force missile} and " +
      "@UUID[Compendium.pf1.class-abilities.52vhE9asxPlXIr39]{elemental wall} powers of the evocation school.</p>";
    expect(parseReplacedPowers(html)).toEqual({
      ids: ["OZ1vgybloYDVfWff", "52vhE9asxPlXIr39"],
      names: [],
    });
  });

  it("falls back to normalized bare names when the sentence names no @UUID target (Infernal Binder)", () => {
    const html =
      "<p><b>Replacement Powers:</b> This subschool replaces the acid dart and dimensional steps " +
      "powers of the <em>conjuration</em> school.</p>";
    expect(parseReplacedPowers(html)).toEqual({
      ids: [],
      names: ["acid dart", "dimensional steps"],
    });
  });

  it("returns empty when there's no Replacement Powers sentence at all", () => {
    expect(parseReplacedPowers("<p>Nothing relevant here.</p>")).toEqual({ ids: [], names: [] });
  });
});

function school(id: string, tag: WizardSchool["tag"], name: string): WizardSchool {
  return {
    id,
    name,
    uuid: `Compendium.pf1.class-abilities.Item.${id}`,
    tag,
    features: [
      { level: 0, uuid: "u:a", featureId: "power-a", name: "Power A", resolved: true },
      { level: 8, uuid: "u:b", featureId: "power-b", name: "Power B (Su)", resolved: true },
    ],
  };
}

function rawDoc(overrides: Partial<RawDoc> & { html: string; supplements?: unknown[] }): RawDoc {
  return {
    _id: overrides._id ?? "focused-1",
    name: overrides.name ?? "Test Subschool",
    type: "feat",
    system: {
      description: { value: overrides.html },
      links: { supplements: overrides.supplements ?? [] },
    },
  };
}

const FEATURE_NAMES: Record<string, string> = { "new-power": "New Power" };
const resolveFeatureName = (id: string) => FEATURE_NAMES[id] ?? null;
const resolveUuid = () => undefined;

describe("transformFocusedSchool", () => {
  const parent = school("evo-id", "evo", "Evocation School");

  it("merges the parent's kept powers with its own, sorted by level, when the target resolves by id", () => {
    const doc = rawDoc({
      name: "Admixture Subschool",
      html:
        "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.evo-id]{Evocation School}</p>" +
        "<p><strong>Replacement Powers:</strong> replaces the @UUID[Compendium.pf1.class-abilities.power-a]{power a} power of the evocation school.</p>",
      supplements: [{ level: 1, uuid: "Compendium.pf1.class-abilities.Item.new-power" }],
    });
    const result = transformFocusedSchool(doc, [parent], resolveFeatureName, resolveUuid);
    expect(result.tag).toBe("Admixture");
    expect(result.parentTag).toBe("evo");
    // Sorted by level: the new level-1 power before the kept level-8 one.
    expect(result.features.map((f) => f.featureId)).toEqual(["new-power", "power-b"]);
  });

  it("throws when the Associated School link doesn't resolve to a vendored school", () => {
    const doc = rawDoc({
      html:
        "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.nonexistent]{Nope}</p>" +
        "<p><strong>Replacement Powers:</strong> replaces the @UUID[Compendium.pf1.class-abilities.power-a]{power a} power.</p>",
    });
    expect(() => transformFocusedSchool(doc, [parent], resolveFeatureName, resolveUuid)).toThrow();
  });

  it("throws when no Replacement Powers target is named at all", () => {
    const doc = rawDoc({
      html: "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.evo-id]{Evocation School}</p>",
    });
    expect(() => transformFocusedSchool(doc, [parent], resolveFeatureName, resolveUuid)).toThrow();
  });

  it("throws when a named replacement target doesn't match any of the parent's powers", () => {
    const doc = rawDoc({
      html:
        "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.evo-id]{Evocation School}</p>" +
        "<p><strong>Replacement Powers:</strong> replaces the @UUID[Compendium.pf1.class-abilities.no-such-power]{ghost} power.</p>",
    });
    expect(() => transformFocusedSchool(doc, [parent], resolveFeatureName, resolveUuid)).toThrow();
  });

  it("resolves a bare-name replacement target (Infernal Binder's shape) against the parent's power names", () => {
    const doc = rawDoc({
      name: "Infernal Binder Subschool",
      html:
        "<p><strong>Associated School:</strong> @UUID[Compendium.pf1.class-abilities.evo-id]{Evocation School}</p>" +
        "<p><b>Replacement Powers:</b> This subschool replaces the power a and power b powers of the evocation school.</p>",
    });
    const result = transformFocusedSchool(doc, [parent], resolveFeatureName, resolveUuid);
    expect(result.features).toEqual([]); // both parent powers displaced, no own supplements given
  });
});
