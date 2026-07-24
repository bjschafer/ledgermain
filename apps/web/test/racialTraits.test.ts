import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { setRace } from "../src/model/doc.js";
import { expectedFeatCount } from "../src/model/feats.js";
import { isMultitalented } from "../src/model/race.js";
import {
  availableRacialTraits,
  availableVendoredRacialTraits,
  conflictingRacialTraitIds,
  hasRacialTrait,
  hasVendoredRacialTrait,
  openChangeTargetOptions,
  setVendoredRacialTraitTarget,
  suppressedRaceTargets,
  toggleRacialTrait,
  toggleVendoredRacialTrait,
  unfilledVendoredRacialTraitTargets,
  vendoredRacialTraitPoints,
  vendoredRacialTraitTarget,
} from "../src/model/racialTraits.js";
import { skillBudget } from "../src/model/skills.js";

const ref: RefData = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  raceName: string,
  racialTraits?: string[],
  vendoredRacialTraits?: string[],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(raceName), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      racialTraits,
      vendoredRacialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("toggle + availability", () => {
  it("toggleRacialTrait adds then removes an id", () => {
    let doc = makeDoc("Human");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(false);
    doc = toggleRacialTrait(doc, "human-focused-study");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(true);
    doc = toggleRacialTrait(doc, "human-focused-study");
    expect(hasRacialTrait(doc, "human-focused-study")).toBe(false);
  });

  it("availableRacialTraits is scoped to the current race", () => {
    const human = availableRacialTraits(makeDoc("Human"), ref).map((t) => t.id);
    expect(human).toContain("human-focused-study");
    expect(human).not.toContain("halfling-outrider");
  });

  it("Sylph alternates are scoped to Sylph only", () => {
    const sylph = availableRacialTraits(makeDoc("Sylph"), ref).map((t) => t.id);
    expect(sylph).toEqual(
      expect.arrayContaining([
        "sylph-like-the-wind",
        "sylph-whispering-wind",
        "sylph-storm-in-the-blood",
        "sylph-mostly-human",
      ]),
    );
    expect(availableRacialTraits(makeDoc("Human"), ref).map((t) => t.id)).not.toContain(
      "sylph-like-the-wind",
    );
  });

  it("setRace clears chosen alternate racial traits", () => {
    const doc = makeDoc("Human", ["human-focused-study"]);
    const switched = setRace(doc, raceId("Elf"));
    expect(switched.build.racialTraits).toBeUndefined();
  });
});

describe("conflict detection", () => {
  it("flags two alternates that replace the same standard trait", () => {
    // Outrider and Practicality both replace Sure-Footed.
    const doc = makeDoc("Halfling", ["halfling-outrider", "halfling-practicality"]);
    const conflicts = conflictingRacialTraitIds(doc, ref);
    expect(conflicts.has("halfling-outrider")).toBe(true);
    expect(conflicts.has("halfling-practicality")).toBe(true);
  });

  it("no conflict when alternates replace different standard traits", () => {
    // Sacred Tattoo (Orc Ferocity) + Shaman's Apprentice (Intimidating).
    const doc = makeDoc("Half-Orc", ["half-orc-sacred-tattoo", "half-orc-shamans-apprentice"]);
    expect(conflictingRacialTraitIds(doc, ref).size).toBe(0);
  });

  it("all four Sylph alternates coexist without conflict (each replaces a distinct standard trait)", () => {
    // Like the Wind (Energy Resistance), Whispering Wind (Spell-Like Ability),
    // Storm in the Blood (Air Affinity), Mostly Human (Type/Languages) — no
    // two of these swap the same standard trait, unlike Halfling's pair above.
    const doc = makeDoc("Sylph", [
      "sylph-like-the-wind",
      "sylph-whispering-wind",
      "sylph-storm-in-the-blood",
      "sylph-mostly-human",
    ]);
    expect(conflictingRacialTraitIds(doc, ref).size).toBe(0);
  });
});

describe("model-layer budgets respect swaps", () => {
  it("Focused Study drops the Human bonus feat from the feat budget", () => {
    const plain = expectedFeatCount(makeDoc("Human"), ref);
    const swapped = expectedFeatCount(makeDoc("Human", ["human-focused-study"]), ref);
    expect(swapped).toBe(plain - 1);
    expect(
      suppressedRaceTargets(makeDoc("Human", ["human-focused-study"]), ref).has("bonusFeats"),
    ).toBe(true);
  });

  it("Eye for Talent drops the Human bonus skill rank from the skill budget", () => {
    const plain = skillBudget(makeDoc("Human"), ref, 0).total;
    const swapped = skillBudget(makeDoc("Human", ["human-eye-for-talent"]), ref, 0).total;
    // Human Skilled grants +1 rank per Hit Die; a level-1 fighter loses exactly 1.
    expect(swapped).toBe(plain - 1);
  });
});

describe("Dual Minded disables Multitalented", () => {
  it("Half-Elf is multitalented until Dual Minded is taken", () => {
    expect(isMultitalented(makeDoc("Half-Elf"), ref)).toBe(true);
    expect(isMultitalented(makeDoc("Half-Elf", ["half-elf-dual-minded"]), ref)).toBe(false);
  });
});

describe("vendored racial traits (issue #74 fill plan)", () => {
  function vendoredIdByName(name: string): string {
    const found = Object.values(ref.racialTraits).find((t) => t.name === name);
    if (!found) throw new Error(`vendored racial trait not found: ${name}`);
    return found.id;
  }

  it("toggleVendoredRacialTrait adds then removes an id", () => {
    const graniteSkin = vendoredIdByName("Granite Skin");
    let doc = makeDoc("Oread");
    expect(hasVendoredRacialTrait(doc, graniteSkin)).toBe(false);
    doc = toggleVendoredRacialTrait(doc, graniteSkin);
    expect(hasVendoredRacialTrait(doc, graniteSkin)).toBe(true);
    doc = toggleVendoredRacialTrait(doc, graniteSkin);
    expect(hasVendoredRacialTrait(doc, graniteSkin)).toBe(false);
  });

  it("availableVendoredRacialTraits is scoped to the current race", () => {
    const oread = availableVendoredRacialTraits(makeDoc("Oread"), ref).map((t) => t.name);
    expect(oread).toContain("Granite Skin");
    expect(availableVendoredRacialTraits(makeDoc("Human"), ref).map((t) => t.name)).not.toContain(
      "Granite Skin",
    );
  });

  it("extends coverage well beyond the 8 hand-authored races (e.g. Oread has none there)", () => {
    expect(availableRacialTraits(makeDoc("Oread"), ref)).toEqual([]);
    expect(availableVendoredRacialTraits(makeDoc("Oread"), ref).length).toBeGreaterThan(0);
  });

  it("excludes a vendored entry whose name duplicates a hand-authored one for the same race", () => {
    // "Focused Study" is vendored for Human AND hand-authored as
    // human-focused-study — the vendored duplicate must not appear, so a
    // player can't pick a non-suppressing copy of a trait the hand-authored
    // table already enforces correctly.
    const humanVendored = availableVendoredRacialTraits(makeDoc("Human"), ref).map((t) => t.name);
    expect(humanVendored).not.toContain("Focused Study");
    // Sanity: the hand-authored version is still there, and other vendored
    // Human entries (no hand-authored counterpart) are NOT filtered out.
    const humanHandAuthored = availableRacialTraits(makeDoc("Human"), ref).map((t) => t.name);
    expect(humanHandAuthored).toContain("Focused Study");
    expect(humanVendored.length).toBeGreaterThan(0);
  });

  it("setRace clears chosen vendored racial traits too", () => {
    const graniteSkin = vendoredIdByName("Granite Skin");
    const doc = makeDoc("Oread", undefined, [graniteSkin]);
    const switched = setRace(doc, raceId("Human"));
    expect(switched.build.vendoredRacialTraits).toBeUndefined();
  });

  it("a vendored pick never suppresses race skill/feat budgets (no suppressTargets)", () => {
    // Contrast with the hand-authored `human-focused-study` case above: a
    // vendored-only pick must never move a budget number, since nothing
    // suppresses the standard trait it claims to replace.
    const graniteSkin = vendoredIdByName("Granite Skin");
    const plain = expectedFeatCount(makeDoc("Oread"), ref);
    const withVendored = expectedFeatCount(makeDoc("Oread", undefined, [graniteSkin]), ref);
    expect(withVendored).toBe(plain);
  });

  it("offers heritage variants for the base race, labeled by heritage", () => {
    const aasimar = availableVendoredRacialTraits(makeDoc("Aasimar"), ref);
    const plumekith = aasimar.find((t) => t.name === "Spell-Like Ability (Aasimar - Plumekith)");
    expect(plumekith?.heritage).toBe("Plumekith");
  });
});

describe("open-change target picks (issue #102)", () => {
  function vendoredIdByName(name: string): string {
    const found = Object.values(ref.racialTraits).find((t) => t.name === name);
    if (!found) throw new Error(`vendored racial trait not found: ${name}`);
    return found.id;
  }
  const kindredRaised = vendoredIdByName("Kindred-Raised");

  it("sets and clears a slot's target", () => {
    let doc = toggleVendoredRacialTrait(makeDoc("Half-Elf"), kindredRaised);
    expect(vendoredRacialTraitTarget(doc, kindredRaised, 0)).toBe("");
    doc = setVendoredRacialTraitTarget(doc, kindredRaised, 0, "int");
    expect(vendoredRacialTraitTarget(doc, kindredRaised, 0)).toBe("int");
    doc = setVendoredRacialTraitTarget(doc, kindredRaised, 0, null);
    expect(vendoredRacialTraitTarget(doc, kindredRaised, 0)).toBe("");
  });

  it("pads earlier slots so a later one can be chosen first", () => {
    const dualTalent = vendoredIdByName("Dual Talent");
    const doc = setVendoredRacialTraitTarget(makeDoc("Human"), dualTalent, 1, "wis");
    expect(doc.build.vendoredRacialTraitTargets?.[dualTalent]).toEqual(["", "wis"]);
  });

  it("removing the trait drops its target picks", () => {
    let doc = toggleVendoredRacialTrait(makeDoc("Half-Elf"), kindredRaised);
    doc = setVendoredRacialTraitTarget(doc, kindredRaised, 0, "int");
    doc = toggleVendoredRacialTrait(doc, kindredRaised);
    expect(doc.build.vendoredRacialTraitTargets?.[kindredRaised]).toBeUndefined();
  });

  it("setRace clears target picks alongside the traits", () => {
    let doc = toggleVendoredRacialTrait(makeDoc("Half-Elf"), kindredRaised);
    doc = setVendoredRacialTraitTarget(doc, kindredRaised, 0, "int");
    expect(setRace(doc, raceId("Human")).build.vendoredRacialTraitTargets).toBeUndefined();
  });

  it("flags a chosen trait with an unfilled slot, and stops once it's filled", () => {
    let doc = toggleVendoredRacialTrait(makeDoc("Half-Elf"), kindredRaised);
    expect(unfilledVendoredRacialTraitTargets(doc, ref).has(kindredRaised)).toBe(true);
    doc = setVendoredRacialTraitTarget(doc, kindredRaised, 0, "int");
    expect(unfilledVendoredRacialTraitTargets(doc, ref).has(kindredRaised)).toBe(false);
  });

  it("never flags a trait that has no open changes", () => {
    const graniteSkin = vendoredIdByName("Granite Skin");
    const doc = toggleVendoredRacialTrait(makeDoc("Oread"), graniteSkin);
    expect(unfilledVendoredRacialTraitTargets(doc, ref).size).toBe(0);
  });

  it("offers ability scores plus every skill, including the character's own subskills", () => {
    const doc = makeDoc("Human");
    doc.build.skillRanks = { "prf.sing": 1 };
    const options = openChangeTargetOptions(doc);
    expect(options.find((o) => o.value === "cha")).toMatchObject({ group: "Ability score" });
    expect(options.find((o) => o.value === "skill.kar")?.label).toBe("Knowledge (arcana)");
    expect(options.find((o) => o.value === "skill.prf.sing")?.label).toBe("Perform (Sing)");
  });
});

describe("race points (issue #102)", () => {
  function vendoredIdByName(name: string): string {
    const found = Object.values(ref.racialTraits).find((t) => t.name === name);
    if (!found) throw new Error(`vendored racial trait not found: ${name}`);
    return found.id;
  }

  it("sums only the tagged picks, counting all of them", () => {
    // Alternate Skill Modifiers (Dhampir - Svetocher) is tagged 4 RP.
    const tagged = vendoredIdByName("Alternate Skill Modifiers (Dhampir - Svetocher)");
    const doc = toggleVendoredRacialTrait(makeDoc("Dhampir"), tagged);
    expect(vendoredRacialTraitPoints(doc, ref)).toEqual({ total: 4, tagged: 1, chosen: 1 });
  });

  it("ignores a pick whose race doesn't match the character's", () => {
    const tagged = vendoredIdByName("Alternate Skill Modifiers (Dhampir - Svetocher)");
    const doc = makeDoc("Human", undefined, [tagged]);
    expect(vendoredRacialTraitPoints(doc, ref)).toEqual({ total: 0, tagged: 0, chosen: 0 });
  });
});
