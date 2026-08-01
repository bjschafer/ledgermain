import { describe, expect, it } from "bun:test";

import type { Feat } from "@pf1/schema";

import { parsePrerequisites, resolveNamedFeatPrereqs } from "../src/transform/prereqs.js";
import type { UuidResolver } from "../src/transform/common.js";

/**
 * Issue #108: growing the structured-prereq set beyond what `feats.ts`'s
 * `parsePrerequisites` already covered (abilities, BAB, caster level, `@UUID`
 * feat refs). These tests pin the new signals (character level, a "BAB"
 * abbreviation, plain-text feat-name matching) and, just as importantly, the
 * "or" alternative handling that keeps the parser from mis-reading "Cha 15,
 * Int 15, or Wis 15" (any ONE suffices) as a three-ability AND requirement —
 * see the block comment in `transform/prereqs.ts` above `excludedFragments`.
 */

const noUuid: UuidResolver = () => undefined;

function prereqHtml(text: string): string {
  return `<p><strong>Prerequisites</strong>: ${text}</p>`;
}

function parse(text: string) {
  return parsePrerequisites(prereqHtml(text), noUuid);
}

describe("parsePrerequisites — structured signals", () => {
  it("parses an ability minimum", () => {
    expect(parse("Str 13.").abilities).toEqual([{ ability: "str", min: 13 }]);
  });

  it("parses base attack bonus", () => {
    expect(parse("base attack bonus +6.").bab).toBe(6);
  });

  it("parses the 'BAB' abbreviation (not present in vendored data today, but matched defensively)", () => {
    expect(parse("BAB +6.").bab).toBe(6);
  });

  it("parses caster level", () => {
    expect(parse("caster level 7th.").casterLevel).toBe(7);
  });

  it("parses character level", () => {
    expect(parse("character level 7th.").characterLevel).toBe(7);
  });

  it("parses several fragments together, each independently", () => {
    const p = parse("Str 13, base attack bonus +1, character level 3rd.");
    expect(p.abilities).toEqual([{ ability: "str", min: 13 }]);
    expect(p.bab).toBe(1);
    expect(p.characterLevel).toBe(3);
  });

  it("caster/character level tolerate a qualifying prefix word ('divine caster level 5th')", () => {
    // A prefix word before the pattern must not defeat the match — the
    // extractor searches within each fragment rather than requiring the
    // fragment to be nothing BUT the pattern.
    expect(parse("divine caster level 5th.").casterLevel).toBe(5);
  });
});

describe("parsePrerequisites — 'or' alternatives stay prose (precision over recall)", () => {
  it("does NOT structure 'Str 13 or Dex 13' as two required abilities", () => {
    const p = parse("Str 13 or Dex 13.");
    expect(p.abilities).toEqual([]);
    expect(p.prereqText).toBe("Str 13 or Dex 13.");
  });

  it("does NOT structure an Oxford-comma three-way alternative ('Cha 15, Int 15, or Wis 15')", () => {
    const p = parse("Cha 15, Int 15, or Wis 15 (see special).");
    expect(p.abilities).toEqual([]);
  });

  it("excludes only the alternative fragment, keeping unrelated AND-ed fragments in the same clause", () => {
    // "Con 13 or Wis 13" is one alternative pair; "Iron Will" and "base attack
    // bonus +4" are separate, unconditional requirements alongside it.
    const p = parse("Con 13 or Wis 13, Iron Will, base attack bonus +4.");
    expect(p.abilities).toEqual([]);
    expect(p.bab).toBe(4);
  });

  it("treats 'or higher/more/greater/better' as a plain minimum, not a real alternative", () => {
    // "caster level 6th or higher" just means >= 6 -- exactly what a minimum
    // already means -- so it must still structure normally.
    expect(parse("caster level 6th or higher.").casterLevel).toBe(6);
    expect(parse("Str 15 or greater.").abilities).toEqual([{ ability: "str", min: 15 }]);
  });

  it("does not let a parenthetical skill list's internal 'or' wipe out an earlier, unrelated fragment", () => {
    // Real-world shape (Kirin Path): the comma-separated skill choices inside
    // "Knowledge (dungeoneering, local, nature, planes, or religion)" must
    // stay one fragment, not spill an "or"-triggered exclusion back onto
    // "Int 13" earlier in the same clause.
    const p = parse(
      "Int 13, Knowledge (dungeoneering, local, nature, planes, or religion) 5 ranks.",
    );
    expect(p.abilities).toEqual([{ ability: "int", min: 13 }]);
  });

  it("an alternative clause does not affect requirements in another semicolon-separated clause", () => {
    // Real-world shape (Pummeling Bully): the feat-name clause before the ";"
    // is a flat AND list; only the BAB-or-monk-level clause after it is the
    // alternative.
    const p = parse(
      "Improved Trip, Improved Unarmed Strike; base attack bonus +9 or monk level 5th.",
    );
    expect(p.bab).toBeUndefined();
  });
});

describe("resolveNamedFeatPrereqs", () => {
  function feat(id: string, name: string, prereqText?: string): Feat {
    return {
      id,
      name,
      uuid: `Compendium.pf1.feats.Item.${id}`,
      tags: [],
      prerequisites: { abilities: [], feats: [], skills: [], prereqText },
    };
  }

  it("converts an exact, unique plain-text feat-name fragment into a structured feat ref", () => {
    const powerAttack = feat("pa1", "Power Attack");
    const cleave = feat("cl1", "Cleave", "Str 13, Power Attack, base attack bonus +1.");
    const feats = [powerAttack, cleave];
    resolveNamedFeatPrereqs(feats);
    expect(cleave.prerequisites.feats).toEqual([
      { id: "pa1", name: "Power Attack", uuid: "Compendium.pf1.feats.Item.pa1" },
    ]);
  });

  it("does NOT match a near-miss fragment (precision over recall)", () => {
    const improvedTwf = feat("itwf1", "Improved Two-Weapon Fighting");
    const mystery = feat("m1", "Mystery Feat", "Improved Two, base attack bonus +6.");
    const feats = [improvedTwf, mystery];
    resolveNamedFeatPrereqs(feats);
    expect(mystery.prerequisites.feats).toEqual([]);
  });

  it("skips an ambiguous name shared by more than one feat", () => {
    const a = feat("dup1", "Duplicate Name");
    const b = feat("dup2", "Duplicate Name");
    const needsIt = feat("n1", "Needs It", "Duplicate Name, base attack bonus +2.");
    const feats = [a, b, needsIt];
    resolveNamedFeatPrereqs(feats);
    expect(needsIt.prerequisites.feats).toEqual([]);
  });

  it("does not convert a fragment inside an 'or' alternative", () => {
    const endurance = feat("end1", "Endurance");
    const acclimation = feat("acc1", "Heavy Gravity Acclimation", "Str 17 or Endurance.");
    const feats = [endurance, acclimation];
    resolveNamedFeatPrereqs(feats);
    expect(acclimation.prerequisites.feats).toEqual([]);
  });

  it("never adds a self-reference or a duplicate of an already-linked feat", () => {
    const powerAttack = feat("pa2", "Power Attack");
    const cleave = feat("cl2", "Cleave", "Power Attack, Cleave.");
    // Already linked via @UUID (simulating extractFeatRefs having found it).
    cleave.prerequisites.feats = [
      { id: "pa2", name: "Power Attack", uuid: "Compendium.pf1.feats.Item.pa2" },
    ];
    const feats = [powerAttack, cleave];
    resolveNamedFeatPrereqs(feats);
    // Still just the one (pre-existing) ref -- no duplicate, and "Cleave"
    // (itself) never becomes a self-referential prerequisite.
    expect(cleave.prerequisites.feats).toEqual([
      { id: "pa2", name: "Power Attack", uuid: "Compendium.pf1.feats.Item.pa2" },
    ]);
  });

  it("leaves a feat with no prereqText untouched", () => {
    const other = feat("o1", "Other Feat");
    const noPrereq = feat("np1", "No Prereq Feat");
    const feats = [other, noPrereq];
    resolveNamedFeatPrereqs(feats);
    expect(noPrereq.prerequisites.feats).toEqual([]);
  });
});
