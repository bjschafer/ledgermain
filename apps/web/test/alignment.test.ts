/**
 * Fixture tests for issue #53: class alignment restrictions. Cross-checked
 * against PF1 CRB class alignment entries (see model/alignment.ts's doc
 * comment for sourcing/licensing notes).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { classAlignmentWarnings, CLASS_ALIGNMENT_RESTRICTIONS } from "../src/model/alignment.js";
import {
  addClass,
  createEmptyDoc,
  setAlignment,
  setIgnoreClassAlignmentRestrictions,
} from "../src/model/doc.js";

const ref = loadRefData();

describe("classAlignmentWarnings()", () => {
  it("returns no warnings when no alignment is set (legacy docs)", () => {
    const doc = addClass(createEmptyDoc("t"), "barbarian");
    expect(doc.identity.alignment).toBeUndefined();
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("warns for a lawful Barbarian (requires nonlawful)", () => {
    let doc = addClass(createEmptyDoc("t"), "barbarian");
    doc = setAlignment(doc, "LG");
    const warnings = classAlignmentWarnings(doc, ref);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.classTag).toBe("barbarian");
    expect(warnings[0]!.message).toContain("Barbarian");
    expect(warnings[0]!.message).toMatch(/rage/i);
  });

  it("does not warn for a chaotic neutral Barbarian", () => {
    let doc = addClass(createEmptyDoc("t"), "barbarian");
    doc = setAlignment(doc, "CN");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("warns for a chaotic Monk (requires lawful)", () => {
    let doc = addClass(createEmptyDoc("t"), "monk");
    doc = setAlignment(doc, "CG");
    const warnings = classAlignmentWarnings(doc, ref);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.classTag).toBe("monk");
  });

  it("does not warn for a lawful-neutral Monk", () => {
    let doc = addClass(createEmptyDoc("t"), "monk");
    doc = setAlignment(doc, "LN");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("warns for any non-lawful-good Paladin", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = setAlignment(doc, "LN");
    expect(classAlignmentWarnings(doc, ref)).toHaveLength(1);
  });

  it("does not warn for a lawful good Paladin", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = setAlignment(doc, "LG");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("warns for a chaotic good Druid (needs a neutral component)", () => {
    let doc = addClass(createEmptyDoc("t"), "druid");
    doc = setAlignment(doc, "CG");
    expect(classAlignmentWarnings(doc, ref)).toHaveLength(1);
  });

  it("does not warn for a true-neutral Druid", () => {
    let doc = addClass(createEmptyDoc("t"), "druid");
    doc = setAlignment(doc, "N");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("does not warn for a neutral-good Druid", () => {
    let doc = addClass(createEmptyDoc("t"), "druid");
    doc = setAlignment(doc, "NG");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("Bard has no alignment restriction (PF1 dropped 3.5e's nonlawful rule)", () => {
    let doc = addClass(createEmptyDoc("t"), "bard");
    doc = setAlignment(doc, "LE");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
    expect(CLASS_ALIGNMENT_RESTRICTIONS.bard).toBeUndefined();
  });

  it("Cleric is not checked (no deity->alignment mapping to validate against)", () => {
    let doc = addClass(createEmptyDoc("t"), "cleric");
    doc = setAlignment(doc, "CE");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
    expect(CLASS_ALIGNMENT_RESTRICTIONS.cleric).toBeUndefined();
  });

  it("classes with no restriction (fighter, wizard, sorcerer, rogue, ranger) never warn", () => {
    for (const tag of [
      "fighter",
      "wizard",
      "sorcerer",
      "rogue",
      "ranger",
      "magus",
      "arcanist",
      "oracle",
    ]) {
      let doc = addClass(createEmptyDoc("t"), tag);
      doc = setAlignment(doc, "CE");
      expect(classAlignmentWarnings(doc, ref)).toEqual([]);
    }
  });

  it("warns for a chaotic evil Shifter (ACG: 'Any neutral', same restriction shape as Druid)", () => {
    let doc = addClass(createEmptyDoc("t"), "shifter");
    doc = setAlignment(doc, "CE");
    const warnings = classAlignmentWarnings(doc, ref);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.classTag).toBe("shifter");
    expect(warnings[0]!.message).toMatch(/supernatural abilities/i);
  });

  it("does not warn for a lawful-neutral Shifter", () => {
    let doc = addClass(createEmptyDoc("t"), "shifter");
    doc = setAlignment(doc, "LN");
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("the other six non-caster classes added alongside Shifter are all 'Any' (unrestricted, verified against aonprd.com)", () => {
    for (const tag of [
      "cavalier",
      "gunslinger",
      "brawler",
      "slayer",
      "swashbuckler",
      "vigilante",
    ]) {
      let doc = addClass(createEmptyDoc("t"), tag);
      doc = setAlignment(doc, "CE");
      expect(classAlignmentWarnings(doc, ref)).toEqual([]);
      expect(CLASS_ALIGNMENT_RESTRICTIONS[tag]).toBeUndefined();
    }
  });

  it("multiclass: warns per offending class only", () => {
    let doc = addClass(createEmptyDoc("t"), "barbarian");
    doc = addClass(doc, "monk");
    doc = setAlignment(doc, "CG");
    const warnings = classAlignmentWarnings(doc, ref);
    // Barbarian allows CG (nonlawful); Monk requires lawful, so only Monk warns.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.classTag).toBe("monk");
  });

  it("multiclass: warns for both classes when both are violated", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = addClass(doc, "monk");
    doc = setAlignment(doc, "NG");
    const warnings = classAlignmentWarnings(doc, ref);
    const tags = warnings.map((w) => w.classTag).sort();
    expect(tags).toEqual(["monk", "paladin"]);
  });

  it("suppressed entirely by the ignoreClassAlignmentRestrictions house rule", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = setAlignment(doc, "CE");
    expect(classAlignmentWarnings(doc, ref)).toHaveLength(1);
    doc = setIgnoreClassAlignmentRestrictions(doc, true);
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });

  it("accepts a free-text alignment label, not just the two-letter code", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = { ...doc, identity: { ...doc.identity, alignment: "Lawful Good" } };
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
    doc = { ...doc, identity: { ...doc.identity, alignment: "Chaotic Evil" } };
    expect(classAlignmentWarnings(doc, ref)).toHaveLength(1);
  });

  it("does not warn on unrecognized alignment text (nothing to check against)", () => {
    let doc = addClass(createEmptyDoc("t"), "paladin");
    doc = { ...doc, identity: { ...doc.identity, alignment: "???" } };
    expect(classAlignmentWarnings(doc, ref)).toEqual([]);
  });
});
