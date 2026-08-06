import { describe, expect, it } from "bun:test";

import type { Feat } from "@pf1/schema";

import {
  parsePrerequisites,
  resolveNamedFeatPrereqs,
  resolveRacePrereqs,
} from "../src/transform/prereqs.js";
import type { UuidResolver } from "../src/transform/common.js";

/**
 * growing the structured-prereq set beyond what `feats.ts`'s
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

describe("parsePrerequisites — 'or'-joined @UUID feat refs (issue #108)", () => {
  function uuidRef(id: string, name: string): string {
    return `@UUID[Compendium.pf1.feats.Item.${id}]{${name}}`;
  }

  it("groups two @UUID feat refs joined by 'or' into featsAnyOf, not a flat AND (Aligned Crafting)", () => {
    const p = parse(
      `${uuidRef("cmaa", "Craft Magic Arms and Armor")} or ${uuidRef("cwi", "Craft Wondrous Item")}.`,
    );
    expect(p.feats).toEqual([]);
    expect(p.featsAnyOf).toEqual([
      [
        { id: "cmaa", name: "Craft Magic Arms and Armor", uuid: "Compendium.pf1.feats.Item.cmaa" },
        { id: "cwi", name: "Craft Wondrous Item", uuid: "Compendium.pf1.feats.Item.cwi" },
      ],
    ]);
  });

  it("groups an 'or' pair that sits alongside an unrelated AND-ed fragment (Improvised Weapon Mastery)", () => {
    const p = parse(
      `${uuidRef("cog", "Catch Off-Guard")} or ${uuidRef("ta", "Throw Anything")}, base attack bonus +8.`,
    );
    expect(p.feats).toEqual([]);
    expect(p.bab).toBe(8);
    expect(p.featsAnyOf).toEqual([
      [
        { id: "cog", name: "Catch Off-Guard", uuid: "Compendium.pf1.feats.Item.cog" },
        { id: "ta", name: "Throw Anything", uuid: "Compendium.pf1.feats.Item.ta" },
      ],
    ]);
  });

  it("does NOT hard-require two @UUID feat refs joined by 'and' (negative case)", () => {
    const p = parse(`${uuidRef("pa", "Power Attack")} and ${uuidRef("cl", "Cleave")}.`);
    expect(p.feats).toEqual([
      { id: "pa", name: "Power Attack", uuid: "Compendium.pf1.feats.Item.pa" },
      { id: "cl", name: "Cleave", uuid: "Compendium.pf1.feats.Item.cl" },
    ]);
    expect(p.featsAnyOf).toBeUndefined();
  });

  it("does not hard-require a lone @UUID feat ref whose only 'or' alternative is a non-feat condition", () => {
    // Real-world shape (Extra Grit): "Grit class feature or the Amateur
    // Gunslinger feat" — only one side is a feat; the other (a class
    // feature) never becomes a @UUID feat ref at all, so there's nothing to
    // pair it with into an any-of group. Hard-requiring the lone feat would
    // wrongly block a character who qualifies via the class feature instead.
    const p = parse(`Grit class feature or the ${uuidRef("ag", "Amateur Gunslinger")} feat.`);
    expect(p.feats).toEqual([]);
    expect(p.featsAnyOf ?? []).toEqual([]);
  });

  it("leaves an unrelated AND-ed @UUID feat ref alone when a different fragment in the same clause has its own 'or'", () => {
    const p = parse(
      `${uuidRef("dg", "Dodge")}, Shot on the Run or Spring Attack, ${uuidRef("mb", "Mobility")}.`,
    );
    expect(p.feats).toEqual([
      { id: "dg", name: "Dodge", uuid: "Compendium.pf1.feats.Item.dg" },
      { id: "mb", name: "Mobility", uuid: "Compendium.pf1.feats.Item.mb" },
    ]);
    expect(p.featsAnyOf ?? []).toEqual([]);
  });

  it("demotes an Oxford-style alternative whose branches mix a feat with other conditions, rather than misrepresenting it", () => {
    // Real-world shape (Modification Master): each branch is a feat AND a
    // skill-rank requirement, not a bare feat name — too messy to fit a flat
    // "any one of these feats" list without changing its meaning, so both
    // refs are dropped to the prose warning instead of guessed at.
    const p = parse(
      `${uuidRef("ca", "Creative Armorsmith")}, ${uuidRef("aa", "Armor Adept")}, and Craft (armor) 7 ranks, or Creative Weaponsmith, ${uuidRef("wa", "Weapon Adept")}, and Craft (weapons) 7 ranks.`,
    );
    expect(p.feats).toEqual([]);
    expect(p.featsAnyOf ?? []).toEqual([]);
  });
});

describe("parsePrerequisites — casterType", () => {
  it("parses a bare 'ability to cast arcane spells' fragment", () => {
    expect(parse("Ability to cast arcane spells.").casterType).toBe("arcane");
  });

  it("parses 'ability to prepare <kind> spells'", () => {
    expect(parse("Ability to prepare arcane spells.").casterType).toBe("arcane");
  });

  it("parses 'ability to spontaneously cast <kind> spells'", () => {
    expect(parse("Ability to spontaneously cast divine spells, kobold.").casterType).toBe("divine");
  });

  it("parses a bare '<kind> spellcaster' fragment", () => {
    expect(parse("Arcane spellcaster, caster level 10th.").casterType).toBe("arcane");
  });

  it("tolerates words between 'cast' and the kind (spell level, etc.)", () => {
    expect(parse("Base attack bonus +4, ability to cast 2nd-level arcane spells.").casterType).toBe(
      "arcane",
    );
  });

  it("does NOT structure a psychic caster requirement offered as an alternative to a feat", () => {
    // Real-world shape: "Psychic Sensitivity or ability to cast psychic
    // spells" is a genuine either/or — a character with the Psychic
    // Sensitivity feat but no psychic spellcasting still qualifies, so
    // hard-blocking on casterType here would be wrong.
    const p = parse("Psychic Sensitivity or the ability to cast psychic spells.");
    expect(p.casterType).toBeUndefined();
  });

  it("does not let an 'or' alternative in one fragment affect an unrelated AND-ed fragment", () => {
    const p = parse(
      "Cha 11, Psychic Sensitivity or the ability to cast psychic spells, Heal 3 ranks.",
    );
    expect(p.casterType).toBeUndefined();
  });

  it("leaves casterType unset when the text names more than one distinct kind", () => {
    // Real-world shape (a multiclass-caster prereq): can't be represented by
    // this single-value field, so it stays prose-only rather than picking
    // one kind and silently dropping the other.
    const p = parse(
      "Wis 13, Int or Cha 13, able to cast 1st-level arcane spells, able to cast 1st-level divine spells.",
    );
    expect(p.casterType).toBeUndefined();
  });

  it("leaves casterType unset when no kind word is present", () => {
    expect(parse("Ability to cast spells.").casterType).toBeUndefined();
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

describe("resolveRacePrereqs", () => {
  const RACES = [
    "Dwarf",
    "Elf",
    "Gnome",
    "Goblin",
    "Half-Elf",
    "Half-Orc",
    "Halfling",
    "Human",
    "Orc",
    "Lashunta (Female)",
    "Lashunta (Male)",
  ];

  function feat(name: string, prereqText?: string): Feat {
    return {
      id: name,
      name,
      uuid: `Compendium.pf1.feats.Item.${name}`,
      tags: [],
      prerequisites: { abilities: [], feats: [], skills: [], prereqText },
    };
  }

  function races(prereqText: string): string[] | undefined {
    const f = feat("Subject", prereqText);
    resolveRacePrereqs([f], RACES);
    return f.prerequisites.races;
  }

  it("parses a lone race fragment, normalizing case to the vendored name", () => {
    expect(races("Base attack bonus +1, orc.")).toEqual(["Orc"]);
  });

  it("parses an 'A or B' fragment as alternatives", () => {
    expect(races("Wis 13, half-orc or orc.")).toEqual(["Half-Orc", "Orc"]);
  });

  it("parses an Oxford-comma race list spanning several fragments", () => {
    expect(races("Con 13; dwarf, half-orc, or orc.")).toEqual(["Dwarf", "Half-Orc", "Orc"]);
  });

  it("collapses a parenthetical race variant to its base name", () => {
    expect(races("Lashunta.")).toEqual(["Lashunta"]);
  });

  it("ignores a trailing parenthetical aside", () => {
    expect(races("Half-elf, half-orc, or halfling (see Special).")).toEqual([
      "Half-Elf",
      "Half-Orc",
      "Halfling",
    ]);
  });

  it("ignores a race named inside a longer fragment (a racial trait, not the race)", () => {
    expect(races("Con 13, orc ferocity racial trait.")).toBeUndefined();
  });

  it("ignores a race that is only part of another feat's name", () => {
    expect(races("Str 13, Cleave, Goblin Cleaver, Power Attack.")).toBeUndefined();
  });

  it("ignores a race named inside an equipment clause", () => {
    expect(
      races("Point-Blank Shot, proficient with sling or halfling sling staff."),
    ).toBeUndefined();
  });

  it("ignores an ethnicity parenthetical but keeps the race", () => {
    expect(races("Human (Chelaxian).")).toEqual(["Human"]);
  });

  it("leaves a feat with no prereqText untouched", () => {
    const f = feat("No Prereq Feat");
    resolveRacePrereqs([f], RACES);
    expect(f.prerequisites.races).toBeUndefined();
  });
});
