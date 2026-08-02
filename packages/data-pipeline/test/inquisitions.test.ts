import { describe, expect, it } from "bun:test";

import type { ClassFeature } from "@pf1/schema";

import { loadRefData } from "../src/index.js";
import { transformInquisitions } from "../src/transform/inquisitions.js";
import type { PfDataDictionary } from "../src/util/pfdata.js";

/**
 * Unit coverage for the inquisition granted-power parse, on hand-built input
 * shaped like the real `class_ability_inquisitions.json` (bold-led power
 * paragraphs, no `::ab[]` directives — a different shape than the subdomain
 * import). `RefData.inquisitions` below covers the result against the real
 * vendored slice.
 */
const CONVERSION: PfDataDictionary = {
  not_found: { name: "Unknown", description: ["## Error", "", "Unable to find."] },
  conversion: {
    name: "Conversion",
    sources: ["Ultimate Magic"],
    description: [
      "## Conversion",
      "",
      "‹SOURCE Ultimate Magic/41›  ",
      "**Deities** Any deity",
      "",
      "**Granted Powers:** You are a powerful persuader.",
      "",
      "**Charm of Wisdom (Ex):** You use your Wisdom modifier instead of your Charisma modifier.",
      "",
      "**Swaying Word (Sp):** At 8th level, once per day you may speak a word of power.",
    ],
  },
  // No named power paragraphs at all — the whole "Granted Powers" text is one
  // flat sentence, same shape as the real Black Powder/Spellkiller entries.
  black_powder: {
    name: "Black Powder",
    description: [
      "## Black Powder",
      "",
      "‹SOURCE Ultimate Combat/52›  ",
      "**Deities** Any",
      "",
      "**Granted Powers:** You gain a bonus feat and a firearm trick.",
    ],
  },
  // A power with no colon at all after its bold name (Imprisonment's "Divine
  // Prison" in the real data) and a mid-chain level gate (6th, not 8th).
  justice: {
    name: "Justice",
    description: [
      "## Justice",
      "",
      "‹SOURCE Ultimate Magic/43›  ",
      "**Deities** Iomedae",
      "",
      "**Granted Powers:** Justice must be served.",
      "",
      "**Judicious Force (Su):** Add +4 to a confirmation roll.",
      "",
      "**Divine Prison** At 6th level, you can bind a foe in chains.",
    ],
  },
};

describe("transformInquisitions", () => {
  it("drops the dataset's not_found sentinel", () => {
    const classFeatures: ClassFeature[] = [];
    const result = transformInquisitions(CONVERSION, classFeatures);
    expect(result.find((i) => i.id === "not_found")).toBeUndefined();
    expect(result).toHaveLength(3);
  });

  it("parses each bold-led power into a level-gated ClassFeatureGrant, defaulting an unstated level to 0", () => {
    const classFeatures: ClassFeature[] = [];
    const [conversion] = transformInquisitions(CONVERSION, classFeatures);
    expect(conversion!.tag).toBe("conversion");
    expect(conversion!.features).toEqual([
      {
        level: 0,
        uuid: "pfdata:inquisition-power:conversion:charm-of-wisdom",
        featureId: "inquisition-power:conversion:charm-of-wisdom",
        name: "Charm of Wisdom",
        resolved: true,
      },
      {
        level: 8,
        uuid: "pfdata:inquisition-power:conversion:swaying-word",
        featureId: "inquisition-power:conversion:swaying-word",
        name: "Swaying Word",
        resolved: true,
      },
    ]);
  });

  it("pushes a synthesized ClassFeature per granted power, prose-only (empty changes/grantsBuffs)", () => {
    const classFeatures: ClassFeature[] = [];
    transformInquisitions(CONVERSION, classFeatures);
    const charm = classFeatures.find(
      (f) => f.id === "inquisition-power:conversion:charm-of-wisdom",
    );
    expect(charm).toBeDefined();
    expect(charm!.name).toBe("Charm of Wisdom");
    expect(charm!.abilityType).toBe("ex");
    expect(charm!.changes).toEqual([]);
    expect(charm!.grantsBuffs).toEqual([]);
    expect(charm!.description).toContain("Wisdom modifier instead of your Charisma modifier");
  });

  it("reads a level gate stated as 'At Nth level' anywhere in the granted-power text, not just 8th", () => {
    const classFeatures: ClassFeature[] = [];
    const [, , justice] = transformInquisitions(CONVERSION, classFeatures);
    expect(justice!.features.map((f) => f.level)).toEqual([0, 6]);
  });

  it("parses a power with no colon at all after its bold name (a real upstream quirk — Imprisonment's Divine Prison)", () => {
    const classFeatures: ClassFeature[] = [];
    const [, , justice] = transformInquisitions(CONVERSION, classFeatures);
    const divinePrison = justice!.features.find((f) => f.name === "Divine Prison");
    expect(divinePrison).toBeDefined();
    expect(divinePrison!.level).toBe(6);
  });

  it("leaves `features` empty (never fabricated) for an entry with no bold-led power paragraph, keeping its full prose on `description`", () => {
    const classFeatures: ClassFeature[] = [];
    const [, blackPowder] = transformInquisitions(CONVERSION, classFeatures);
    expect(blackPowder!.features).toEqual([]);
    expect(blackPowder!.description).toContain("bonus feat and a firearm trick");
  });

  it("throws rather than silently overwriting on a duplicate synthesized feature id", () => {
    const classFeatures: ClassFeature[] = [
      {
        id: "inquisition-power:conversion:charm-of-wisdom",
        name: "Charm of Wisdom",
        uuid: "pfdata:inquisition-power:conversion:charm-of-wisdom",
        subType: "classFeat",
        changes: [],
        grantsBuffs: [],
      },
    ];
    expect(() => transformInquisitions(CONVERSION, classFeatures)).toThrow(/duplicate/);
  });
});

/**
 * End-to-end coverage for the vendored inquisition catalog against the real
 * pinned Pf Data 1e slice.
 */
const ref = loadRefData();

describe("RefData.inquisitions", () => {
  it("has 39 entries — 40 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.inquisitions)).toHaveLength(39);
  });

  it("never includes the dataset's own junk key", () => {
    expect(ref.inquisitions.not_found).toBeUndefined();
  });

  it("every entry has a stable id/tag matching the source dictionary key, a synthetic uuid, and non-empty prose", () => {
    for (const [key, inquisition] of Object.entries(ref.inquisitions)) {
      expect(inquisition.id).toBe(key);
      expect(inquisition.tag).toBe(key);
      expect(inquisition.uuid).toBe(`pfdata:inquisition:${key}`);
      expect(inquisition.description ?? "").not.toBe("");
    }
  });

  it("resolves ‹…› cross-refs to plain display text, and strips the redundant leading ## header + SOURCE citation lines", () => {
    for (const inquisition of Object.values(ref.inquisitions)) {
      expect(inquisition.description ?? "").not.toMatch(/[‹›«»]/);
      expect(inquisition.description ?? "").not.toMatch(/^##\s/);
    }
  });

  it("a known entry (Conversion) carries its two granted powers as level-gated feature grants", () => {
    const conversion = ref.inquisitions.conversion!;
    expect(conversion.name).toBe("Conversion");
    expect(conversion.features.map((f) => ({ name: f.name, level: f.level }))).toEqual([
      { name: "Charm of Wisdom", level: 0 },
      { name: "Swaying Word", level: 8 },
    ]);
    for (const grant of conversion.features) {
      expect(grant.resolved).toBe(true);
      expect(ref.classFeatures[grant.featureId]).toBeDefined();
    }
  });

  it("the two entries with no named power paragraph (Black Powder, Spellkiller) carry empty features but full prose", () => {
    for (const tag of ["black_powder", "spellkiller"]) {
      const inquisition = ref.inquisitions[tag]!;
      expect(inquisition.features).toEqual([]);
      expect(inquisition.description).toContain("Granted Powers");
    }
  });

  it("every synthesized inquisition-power ClassFeature is prose-only, never a fabricated numeric mechanic", () => {
    for (const feature of Object.values(ref.classFeatures)) {
      if (!feature.id.startsWith("inquisition-power:")) continue;
      expect(feature.changes).toEqual([]);
      expect(feature.grantsBuffs).toEqual([]);
      expect(feature.description ?? "").not.toBe("");
    }
  });

  it("meta records a hash for inquisitions.json and the collection count", () => {
    expect(ref.meta.hashes["inquisitions.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.inquisitions).toBe(39);
  });
});
