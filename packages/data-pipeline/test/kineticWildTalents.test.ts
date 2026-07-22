import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored kineticist-wild-talent catalog (issue
 * #74 Phase 3b) against the real pinned Pf Data 1e slice — the trickiest of
 * the three Phase 3b imports (see `transform/kineticWildTalents.ts`'s doc
 * comment): unlike rage powers/investigator talents/arcanist exploits, this
 * subsystem file carries NO per-entry `category`/`level`/`compilationSources`
 * dictionary fields at all — everything is parsed out of the entry's own
 * description text.
 */
const ref = loadRefData();

describe("RefData.kineticWildTalents", () => {
  it("has 278 entries — 300 raw dictionary keys minus 21 redirect aliases and the 'not_found' sentinel", () => {
    expect(Object.keys(ref.kineticWildTalents)).toHaveLength(278);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.kineticWildTalents.not_found).toBeUndefined();
    expect(ref.kineticWildTalents.darkness_infusion_greater).toBeUndefined(); // a redirect alias
  });

  it("a known universal form infusion (Extended Range) parses element/kind/level/burn from the stat-line", () => {
    const talent = ref.kineticWildTalents.extended_range!;
    expect(talent.name).toBe("Extended Range");
    expect(talent.kind).toBe("infusion");
    expect(talent.infusionKind).toBe("form");
    expect(talent.elements).toEqual(["universal"]);
    expect(talent.level).toBe(1);
    expect(talent.burn).toBe(1);
  });

  it("a known element-scoped utility talent (Air Cushion) parses correctly, nameSuffix from the stat-line's own suffix", () => {
    const talent = ref.kineticWildTalents.air_cushion!;
    expect(talent.name).toBe("Air Cushion");
    expect(talent.kind).toBe("utility");
    expect(talent.infusionKind).toBeUndefined();
    expect(talent.elements).toEqual(["air"]);
    expect(talent.level).toBe(1);
    expect(talent.burn).toBe(0);
    expect(talent.nameSuffix).toBe("(Sp)");
  });

  it("Extreme Range (level 3, burn 2) and Aerial Evasion (level 3, burn 1) match @pf1/engine's hand-authored table exactly — the empirical check that `level` IS a real level gate here (unlike RagePower.level)", () => {
    expect(ref.kineticWildTalents.extreme_range!.level).toBe(3);
    expect(ref.kineticWildTalents.extreme_range!.burn).toBe(2);
    expect(ref.kineticWildTalents.aerial_evasion!.level).toBe(3);
    expect(ref.kineticWildTalents.aerial_evasion!.burn).toBe(1);
  });

  it("simple blasts, composite blasts, and defense talents classify correctly and carry no spell level", () => {
    const airBlast = ref.kineticWildTalents.air_blast!;
    expect(airBlast.kind).toBe("simpleBlast");
    expect(airBlast.elements).toEqual(["air"]);
    expect(airBlast.level).toBeUndefined();

    const aethericBoost = ref.kineticWildTalents.aetheric_boost!;
    expect(aethericBoost.kind).toBe("compositeBlast");
    expect(aethericBoost.elements).toEqual(["aether"]);
    expect(aethericBoost.burn).toBe(2);
    expect(aethericBoost.level).toBeUndefined();

    const envelopingWinds = ref.kineticWildTalents.enveloping_winds!;
    expect(envelopingWinds.kind).toBe("defense");
    expect(envelopingWinds.elements).toEqual(["air"]);
    expect(envelopingWinds.level).toBeUndefined();
  });

  it("a multi-element infusion (Pushing Infusion) carries every listed element, not just the first", () => {
    const talent = ref.kineticWildTalents.pushing_infusion!;
    expect(talent.kind).toBe("infusion");
    expect(talent.elements).toEqual(["aether", "air", "earth", "void", "water", "wood"]);
  });

  it("the description does NOT retain the markdown header, SOURCE citation, or stat-line (all redundant with structured fields), but DOES keep other stat-block lines like Associated Blasts/Prerequisite", () => {
    const talent = ref.kineticWildTalents.pushing_infusion!;
    expect(talent.description).not.toContain("## Pushing Infusion");
    expect(talent.description).not.toContain("SOURCE");
    expect(talent.description).not.toContain("**Element**");
    expect(talent.description).toContain("Associated Blasts");
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.kineticWildTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:kinetic-talent:${key}`);
    }
  });

  it("no entry falls back to 'unclassified' in the pinned slice — every entry's Type phrase is recognized", () => {
    const unclassified = Object.values(ref.kineticWildTalents).filter(
      (t) => t.kind === "unclassified",
    );
    expect(unclassified).toHaveLength(0);
  });

  it("meta records a hash for kinetic-wild-talents.json and the collection count", () => {
    expect(ref.meta.hashes["kinetic-wild-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.kineticWildTalents).toBe(278);
  });
});
