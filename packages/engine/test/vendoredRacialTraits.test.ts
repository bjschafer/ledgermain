/**
 * Hand-computed fixture tests for the vendored alternate-racial-trait catalog
 * (`RefData.racialTraits`) — distinct from the hand-authored 8-race
 * `RACIAL_TRAITS` table covered by `racial-traits.test.ts`. A vendored pick's
 * `changes[]` apply; whether the race's standard `Change`s are suppressed
 * alongside depends on the race: races in `VENDORED_STANDARD_TRAIT_TARGETS`
 * drop the replaced standard trait's verified targets (fixtures below), every
 * other race keeps the historical apply-on-top posture (see `RacialTrait`'s
 * doc comment in `@pf1/schema`), which the Granite Skin fixtures prove.
 */

import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  FLEXIBLE_ABILITY_SUPPRESS_TARGET,
  vendoredTraitSuppressTargets,
  VENDORED_STANDARD_TRAIT_TARGETS,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string, race?: string): string {
  const entry = Object.values(ref.racialTraits).find(
    (t) => t.name === name && (race == null || [t.race].flat().includes(race)),
  );
  if (!entry) throw new Error(`vendored racial trait not found: ${name}`);
  return entry.id;
}

/** Fighter L1, all abilities 10 (mod 0) before racial changes, no gear. */
function makeDoc(
  raceName: string,
  vendoredRacialTraits: string[] = [],
  vendoredRacialTraitTargets?: Record<string, string[]>,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: `vrt-test-${raceName}`,
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(raceName),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits,
      ...(vendoredRacialTraitTargets ? { vendoredRacialTraitTargets } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** Sets a player-picked flexible +2 ability (Human/Half-Elf/Half-Orc) on a fixture doc. */
function withFlexibleAbility(doc: CharacterDoc, ability: AbilityId): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, flexibleAbility: ability } };
}

describe("Oread Granite Skin (vendored, +1 racial natural armor, issue #74 Phase 6)", () => {
  // Verified against the source: "Rocky growths cover the skin of oreads
  // with this racial trait. They gain a +1 racial bonus to natural armor.
  // This racial trait replaces energy resistance." (replacedTraitNames:
  // ["Energy Resistance"]) — Oread is now mapped in
  // `VENDORED_STANDARD_TRAIT_TARGETS`, so Energy Resistance's acid
  // resistance 5 is suppressed while Granite Skin is active (it names
  // nothing else, so Oread's ability-score changes are untouched).
  const graniteSkin = traitId("Granite Skin");

  it("adds +1 to natural armor (flat-footed AC, which includes natural but not Dex)", () => {
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted + 1);
    expect(withTrait.ac.normal).toBe(base.ac.normal + 1);
  });

  it("does not touch touch AC (natural armor is excluded from touch)", () => {
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.ac.touch).toBe(base.ac.touch);
  });

  it("suppresses the standard Energy Resistance it replaces (acid resistance 5 disappears)", () => {
    const base = compute(makeDoc("Oread"), ref);
    expect(base.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.defenses?.resistances ?? []).toEqual([]);
  });

  it("leaves the race's own ability-score changes untouched (Granite Skin names nothing else)", () => {
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
  });
});

describe("Half-Elf Kindred-Raised open change (issue #102)", () => {
  // "They gain a +2 bonus to Charisma and one other ability score of their
  // choice." The source ships the Charisma half targeted and the player's
  // half untargeted — `changes` vs `openChanges`.
  const kindredRaised = traitId("Kindred-Raised");

  it("applies the fixed +2 Cha but nothing for an unchosen open change", () => {
    const base = compute(makeDoc("Half-Elf"), ref);
    const picked = compute(makeDoc("Half-Elf", [kindredRaised]), ref);
    expect(picked.abilities.cha.total).toBe(base.abilities.cha.total + 2);
    for (const id of ["str", "dex", "con", "int", "wis"] as const) {
      expect(picked.abilities[id].total).toBe(base.abilities[id].total);
    }
  });

  it("applies the open change once a target is chosen", () => {
    const base = compute(makeDoc("Half-Elf"), ref);
    const picked = compute(makeDoc("Half-Elf", [kindredRaised], { [kindredRaised]: ["int"] }), ref);
    expect(picked.abilities.int.total).toBe(base.abilities.int.total + 2);
    expect(picked.abilities.cha.total).toBe(base.abilities.cha.total + 2);
  });

  it("ignores targets for a trait that isn't chosen", () => {
    const base = compute(makeDoc("Half-Elf"), ref);
    const stale = compute(makeDoc("Half-Elf", [], { [kindredRaised]: ["int"] }), ref);
    expect(stale.abilities.int.total).toBe(base.abilities.int.total);
  });

  it("skips an unfilled slot but still applies a later filled one", () => {
    // Dual Talent (Human) ships TWO open changes; choosing only the second
    // must not shift the first one's grant onto it.
    const dualTalent = traitId("Dual Talent");
    const base = compute(makeDoc("Human"), ref);
    const picked = compute(makeDoc("Human", [dualTalent], { [dualTalent]: ["", "wis"] }), ref);
    expect(picked.abilities.wis.total).toBe(base.abilities.wis.total + 2);
    expect(picked.abilities.str.total).toBe(base.abilities.str.total);
  });
});

describe("Half-Elf / Half-Orc flexible +2 suppression (Ability Score Modifiers key, issue #35 follow-up)", () => {
  it("Half-Elf Kindred-Raised retires the flexible +2 and drops adaptability/elven immunities/keen senses", () => {
    // Kindred-Raised: "This racial trait replaces the half-elf's usual
    // racial ability score modifiers, as well as adaptability, elven
    // immunities, keen senses, and multitalented." Without the trait, a
    // player-chosen flexible +2 (here Str) lands as normal.
    const kindredRaised = traitId("Kindred-Raised");
    const base = compute(withFlexibleAbility(makeDoc("Half-Elf"), "str"), ref);
    expect(base.abilities.str.total).toBe(12);
    expect(base.skills["per"]!.total).toBeGreaterThan(0);
    expect(base.defenses?.effectImmunities?.some((i) => i.qualifier === "magicSleep")).toBe(true);

    const picked = compute(withFlexibleAbility(makeDoc("Half-Elf", [kindredRaised]), "str"), ref);
    // The flexible +2 to Str no longer applies...
    expect(picked.abilities.str.total).toBe(10);
    // ...but Kindred-Raised's own fixed +2 Cha still lands.
    expect(picked.abilities.cha.total).toBe(base.abilities.cha.total + 2);
    // Keen Senses' +2 Perception and Elven Immunities' magic-sleep immunity
    // are also retired.
    expect(picked.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
    expect(picked.defenses?.effectImmunities ?? []).toEqual([]);
  });

  it("Half-Orc Orc Atavism retires the flexible +2 and drops intimidating, but its own Str +2 and open mental penalty land", () => {
    // Orc Atavism: "This racial trait replaces the half-orc's usual racial
    // ability score modifiers, as well as intimidating, orc blood, and orc
    // ferocity. They gain a +2 bonus to Strength and a -2 penalty to one
    // mental ability score of their choice."
    // Flexible ability picked as Dex (not Str/Wis/Int/Cha) so it never
    // overlaps with Orc Atavism's own changes or Intimidate's key ability
    // (Cha) and so isolates the suppression's effect cleanly.
    const orcAtavism = traitId("Orc Atavism");
    const base = compute(withFlexibleAbility(makeDoc("Half-Orc"), "dex"), ref);
    expect(base.abilities.dex.total).toBe(12);
    expect(base.skills["int"]!.total).toBeGreaterThan(0);

    const picked = compute(
      withFlexibleAbility(makeDoc("Half-Orc", [orcAtavism], { [orcAtavism]: ["wis"] }), "dex"),
      ref,
    );
    // The flexible +2 to Dex no longer applies...
    expect(picked.abilities.dex.total).toBe(10);
    // ...but Orc Atavism's own fixed +2 Str and chosen -2 Wis still land.
    expect(picked.abilities.str.total).toBe(base.abilities.str.total + 2);
    expect(picked.abilities.wis.total).toBe(base.abilities.wis.total - 2);
    // Intimidating's +2 Intimidate is retired too.
    expect(picked.skills["int"]!.total).toBe(base.skills["int"]!.total - 2);
  });

  it("a non-replacing Half-Orc alternate leaves the flexible +2 intact", () => {
    // Scavenger only names Intimidating in `replacedTraitNames` — it never
    // touches "Ability Score Modifiers", so the flexible +2 keeps applying
    // alongside it.
    const scavenger = traitId("Scavenger");
    expect(vendoredTraitSuppressTargets(ref.racialTraits[scavenger]!, "Half-Orc")).not.toContain(
      FLEXIBLE_ABILITY_SUPPRESS_TARGET,
    );
    const base = compute(withFlexibleAbility(makeDoc("Half-Orc"), "dex"), ref);
    const picked = compute(withFlexibleAbility(makeDoc("Half-Orc", [scavenger]), "dex"), ref);
    expect(picked.abilities.dex.total).toBe(base.abilities.dex.total);
    expect(picked.abilities.dex.total).toBe(12);
  });

  it("an unrelated race's flexible +2 (Human) is unaffected by the sentinel key", () => {
    // Human's vendored literal for the flexible +2 is "+2 to One Ability
    // Score", not "Ability Score Modifiers" — the two keys are independent,
    // and a Human doc with no alternate picked is never gated.
    expect(VENDORED_STANDARD_TRAIT_TARGETS["Human"]?.["Ability Score Modifiers"]).toBeUndefined();
    const base = compute(withFlexibleAbility(makeDoc("Human"), "wis"), ref);
    expect(base.abilities.wis.total).toBe(12);
  });

  it("Human Dual Talent retires the flexible +2 while its own two chosen +2s land", () => {
    // Dual Talent: "This racial trait replaces the +2 bonus to any one
    // ability score, the bonus feat, and the skilled traits." Its own two
    // +2s are open changes targeted via `vendoredRacialTraitTargets`.
    const dualTalent = traitId("Dual Talent");
    const base = compute(withFlexibleAbility(makeDoc("Human"), "dex"), ref);
    expect(base.abilities.dex.total).toBe(12);

    const picked = compute(
      withFlexibleAbility(makeDoc("Human", [dualTalent], { [dualTalent]: ["str", "wis"] }), "dex"),
      ref,
    );
    // The flexible +2 to Dex no longer applies...
    expect(picked.abilities.dex.total).toBe(10);
    // ...while Dual Talent's own chosen +2 Str / +2 Wis both land.
    expect(picked.abilities.str.total).toBe(base.abilities.str.total + 2);
    expect(picked.abilities.wis.total).toBe(base.abilities.wis.total + 2);
  });
});

describe("vendored racial-trait resource pools (issue #102)", () => {
  const plumekith = traitId("Spell-Like Ability (Aasimar - Plumekith)");

  function pools(doc: CharacterDoc) {
    return deriveResourcePools(doc, ref, compute(doc, ref).abilities);
  }

  it("a heritage spell-like ability's uses become a tracker pool", () => {
    // Plumekith: *see invisibility* 1/day (uses.maxFormula "1", per "day").
    const pool = pools(makeDoc("Aasimar", [plumekith])).find((p) => p.id === plumekith);
    expect(pool).toMatchObject({
      name: "Spell-Like Ability (Aasimar - Plumekith)",
      max: 1,
      restValue: 1,
      per: "day",
      classTag: "racial",
    });
  });

  it("no pool for a trait the character hasn't chosen", () => {
    expect(pools(makeDoc("Aasimar")).find((p) => p.id === plumekith)).toBeUndefined();
  });

  it("no pool when the trait's race doesn't match the character's", () => {
    expect(pools(makeDoc("Human", [plumekith])).find((p) => p.id === plumekith)).toBeUndefined();
  });
});

describe("guards", () => {
  it("ignores a vendored trait id whose race doesn't match", () => {
    const graniteSkin = traitId("Granite Skin");
    const doc = compute(makeDoc("Human", [graniteSkin]), ref);
    const clean = compute(makeDoc("Human"), ref);
    expect(doc.ac.normal).toBe(clean.ac.normal);
  });

  it("ignores an unknown vendored trait id without throwing", () => {
    expect(() => compute(makeDoc("Oread", ["not-a-real-vendored-trait"]), ref)).not.toThrow();
  });
});

/**
 * Featured-race suppression (6): for the six races in
 * `VENDORED_STANDARD_TRAIT_TARGETS`, a vendored alternate that names a
 * structured standard trait in `replacedTraitNames` now DROPS that trait's
 * `Race.changes` while active — expected values verified against the ARG race
 * write-ups and the vendored `races.json` change lists.
 */
describe("featured-race vendored suppression (issue #74 Phase 6)", () => {
  it("Aasimar Deathless Spirit (Blood of Angels): Celestial Resistance's acid/cold/electricity 5 disappears", () => {
    const base = compute(makeDoc("Aasimar"), ref);
    for (const q of ["acid", "cold", "electricity"]) {
      expect(base.defenses?.resistances.find((r) => r.qualifier === q)?.total).toBe(5);
    }
    const withTrait = compute(makeDoc("Aasimar", [traitId("Deathless Spirit")]), ref);
    expect(withTrait.defenses?.resistances ?? []).toEqual([]);
  });

  it("Aasimar Halo (Blood of Angels): darkvision 60 is swapped away", () => {
    const base = compute(makeDoc("Aasimar"), ref);
    expect(base.senses.some((s) => s.label === "Darkvision" && s.range === 60)).toBe(true);
    const withTrait = compute(makeDoc("Aasimar", [traitId("Halo")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Darkvision")).toBe(false);
  });

  it("Tiefling Scaled Skin (Blood of Fiends): fiendish resistance goes, its own +1 natural armor lands", () => {
    const base = compute(makeDoc("Tiefling"), ref);
    expect(base.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
    const withTrait = compute(makeDoc("Tiefling", [traitId("Scaled Skin")]), ref);
    expect(withTrait.defenses?.resistances ?? []).toEqual([]);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted + 1);
  });

  it("Kitsune Keen Kitsune (ARG): +2 Dex/+2 Int/-2 Str replaces the standard +2 Dex/+2 Cha/-2 Str", () => {
    const base = compute(makeDoc("Kitsune"), ref);
    expect(base.abilities.cha.total).toBe(12);
    expect(base.abilities.dex.total).toBe(12);
    expect(base.abilities.str.total).toBe(8);
    const withTrait = compute(makeDoc("Kitsune", [traitId("Keen Kitsune")]), ref);
    expect(withTrait.abilities.cha.total).toBe(10);
    expect(withTrait.abilities.dex.total).toBe(12);
    expect(withTrait.abilities.int.total).toBe(12);
    expect(withTrait.abilities.str.total).toBe(8);
  });

  it("Aasimar heritage Skilled variant (Plumekith): standard Diplomacy/Perception +2 swaps for Acrobatics/Fly +2", () => {
    // `replacedTraitNames` is empty on heritage Skilled bundles — the
    // `"Skilled ("` name inference in `vendoredTraitSuppressTargets` covers
    // them (see its doc comment).
    const base = compute(makeDoc("Aasimar"), ref);
    const withTrait = compute(makeDoc("Aasimar", [traitId("Skilled (Aasimar - Plumekith)")]), ref);
    expect(withTrait.skills["dip"]!.total).toBe(base.skills["dip"]!.total - 2);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
    expect(withTrait.skills["acr"]!.total).toBe(base.skills["acr"]!.total + 2);
    expect(withTrait.skills["fly"]!.total).toBe(base.skills["fly"]!.total + 2);
  });

  it("Tengu Carrion Sense (ARG): Gifted Linguist's +4 Linguistics drops, Sneaky stays", () => {
    const base = compute(makeDoc("Tengu"), ref);
    const withTrait = compute(makeDoc("Tengu", [traitId("Carrion Sense")]), ref);
    expect(withTrait.skills["lin"]!.total).toBe(base.skills["lin"]!.total - 4);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total);
  });

  it("Ifrit Wildfire Heart (ARG): fire resistance 5 drops, +4 initiative lands", () => {
    const base = compute(makeDoc("Ifrit"), ref);
    expect(base.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
    const withTrait = compute(makeDoc("Ifrit", [traitId("Wildfire Heart")]), ref);
    expect(withTrait.defenses?.resistances ?? []).toEqual([]);
    expect(withTrait.initiative.total).toBe(base.initiative.total + 4);
  });

  it("Undine Water Sense (ARG): cold resistance 5 drops (Energy Resistance replaced)", () => {
    const base = compute(makeDoc("Undine"), ref);
    expect(base.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(5);
    const withTrait = compute(makeDoc("Undine", [traitId("Water Sense (Undine)")]), ref);
    expect(withTrait.defenses?.resistances ?? []).toEqual([]);
  });

  it("Undine Deepsight (ARG): standard darkvision 60 is swapped away", () => {
    const base = compute(makeDoc("Undine"), ref);
    expect(base.senses.some((s) => s.label === "Darkvision" && s.range === 60)).toBe(true);
    const withTrait = compute(makeDoc("Undine", [traitId("Deepsight")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Darkvision")).toBe(false);
  });

  it("Drow Poison Minion (ARG): Drow Immunities' magic-sleep immunity drops", () => {
    const base = compute(makeDoc("Drow"), ref);
    expect(base.defenses?.effectImmunities?.some((i) => i.qualifier === "magicSleep")).toBe(true);
    const withTrait = compute(makeDoc("Drow", [traitId("Poison Minion (Drow)")]), ref);
    expect(withTrait.defenses?.effectImmunities ?? []).toEqual([]);
  });

  it("Drow Darklands Guide (ARG): Keen Senses' +2 Perception drops", () => {
    const base = compute(makeDoc("Drow"), ref);
    const withTrait = compute(makeDoc("Drow", [traitId("Darklands Guide")]), ref);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
  });

  it("Kobold Prehensile Tail (ARG): Armor's +1 natural armor drops, +2 Acrobatics/Climb lands", () => {
    const base = compute(makeDoc("Kobold"), ref);
    const withTrait = compute(makeDoc("Kobold", [traitId("Prehensile Tail (Kobold)")]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted - 1);
    expect(withTrait.skills["acr"]!.total).toBe(base.skills["acr"]!.total + 2);
    expect(withTrait.skills["clm"]!.total).toBe(base.skills["clm"]!.total + 2);
  });

  it("Kobold Wild Forest Kobold (ARG): Crafty's +2 Perception drops, +2 Stealth/Survival lands", () => {
    const base = compute(makeDoc("Kobold"), ref);
    const withTrait = compute(makeDoc("Kobold", [traitId("Wild Forest Kobold")]), ref);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total + 2);
    expect(withTrait.skills["sur"]!.total).toBe(base.skills["sur"]!.total + 2);
  });

  it("Duergar Dwarf Traits (ARG): Duergar Immunities' paralysis/phantasms/poison immunity drops", () => {
    const base = compute(makeDoc("Duergar"), ref);
    for (const q of ["paralysis", "phantasms", "poison"]) {
      expect(base.defenses?.effectImmunities?.some((i) => i.qualifier === q)).toBe(true);
    }
    const withTrait = compute(makeDoc("Duergar", [traitId("Dwarf Traits")]), ref);
    expect(withTrait.defenses?.effectImmunities ?? []).toEqual([]);
  });

  it("Duergar Daysighted (ARG): superior darkvision 120 drops to plain darkvision 60", () => {
    const base = compute(makeDoc("Duergar"), ref);
    expect(base.senses.some((s) => s.label === "Darkvision" && s.range === 120)).toBe(true);
    const withTrait = compute(makeDoc("Duergar", [traitId("Daysighted")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Darkvision" && s.range === 60)).toBe(true);
    expect(withTrait.senses.some((s) => s.range === 120)).toBe(false);
  });

  it("Hobgoblin Scarred (ARG): Darkvision is swapped away, +1 natural armor lands", () => {
    const base = compute(makeDoc("Hobgoblin"), ref);
    expect(base.senses.some((s) => s.label === "Darkvision" && s.range === 60)).toBe(true);
    const withTrait = compute(makeDoc("Hobgoblin", [traitId("Scarred")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Darkvision")).toBe(false);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted + 1);
  });

  it("Hobgoblin Slave Hunter (ARG): Sneaky's +4 Stealth drops, +2 Survival lands", () => {
    const base = compute(makeDoc("Hobgoblin"), ref);
    const withTrait = compute(makeDoc("Hobgoblin", [traitId("Slave Hunter")]), ref);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total - 4);
    expect(withTrait.skills["sur"]!.total).toBe(base.skills["sur"]!.total + 2);
  });

  it("Goblin City Scavenger (ARG): Skilled's +4 Ride/Stealth drops, +2 Survival/Perception lands", () => {
    const base = compute(makeDoc("Goblin"), ref);
    const withTrait = compute(makeDoc("Goblin", [traitId("City Scavenger")]), ref);
    expect(withTrait.skills["rid"]!.total).toBe(base.skills["rid"]!.total - 4);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total - 4);
    expect(withTrait.skills["sur"]!.total).toBe(base.skills["sur"]!.total + 2);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total + 2);
  });

  it("Fetchling World Walker (ARG): Skilled's +2 Knowledge (planes)/Stealth drops, its own trio lands", () => {
    const base = compute(makeDoc("Fetchling"), ref);
    const withTrait = compute(makeDoc("Fetchling", [traitId("World Walker")]), ref);
    expect(withTrait.skills["kpl"]!.total).toBe(base.skills["kpl"]!.total - 2);
    expect(withTrait.skills["kna"]!.total).toBe(base.skills["kna"]!.total + 1);
    expect(withTrait.skills["klo"]!.total).toBe(base.skills["klo"]!.total + 1);
    // World Walker's own Stealth +2 replaces Skilled's Stealth +2 1-for-1.
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total);
  });

  it("Fetchling Umbral Escort (ARG): standard low-light vision is swapped away", () => {
    const base = compute(makeDoc("Fetchling"), ref);
    expect(base.senses.some((s) => s.label === "Low-light vision")).toBe(true);
    const withTrait = compute(makeDoc("Fetchling", [traitId("Umbral Escort")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Low-light vision")).toBe(false);
  });

  it("Catfolk Clever Cat (ARG): Natural Hunter's +2 Perception/Stealth/Survival drops, its own trio lands", () => {
    const base = compute(makeDoc("Catfolk"), ref);
    const withTrait = compute(makeDoc("Catfolk", [traitId("Clever Cat")]), ref);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total - 2);
    expect(withTrait.skills["sur"]!.total).toBe(base.skills["sur"]!.total - 2);
    expect(withTrait.skills["blf"]!.total).toBe(base.skills["blf"]!.total + 2);
    expect(withTrait.skills["dip"]!.total).toBe(base.skills["dip"]!.total + 2);
    expect(withTrait.skills["sen"]!.total).toBe(base.skills["sen"]!.total + 2);
  });

  it("Catfolk Scent (ARG): standard low-light vision is swapped away for scent", () => {
    const base = compute(makeDoc("Catfolk"), ref);
    expect(base.senses.some((s) => s.label === "Low-light vision")).toBe(true);
    const withTrait = compute(makeDoc("Catfolk", [traitId("Scent (Catfolk)")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Low-light vision")).toBe(false);
    expect(withTrait.senses.some((s) => s.label === "Scent" && s.range === 30)).toBe(true);
  });

  it("Vine Leshy Swamp Leshy (ARG): Climber's +2 Climb drops, +2 Swim lands", () => {
    const base = compute(makeDoc("Vine Leshy"), ref);
    const withTrait = compute(makeDoc("Vine Leshy", [traitId("Swamp Leshy")]), ref);
    expect(withTrait.skills["clm"]!.total).toBe(base.skills["clm"]!.total - 2);
    expect(withTrait.skills["swm"]!.total).toBe(base.skills["swm"]!.total + 2);
  });

  it("Vine Leshy Writhing Eye (ARG): standard darkvision and low-light vision are both swapped away", () => {
    const base = compute(makeDoc("Vine Leshy"), ref);
    expect(base.senses.some((s) => s.label === "Darkvision")).toBe(true);
    expect(base.senses.some((s) => s.label === "Low-light vision")).toBe(true);
    const withTrait = compute(makeDoc("Vine Leshy", [traitId("Writhing Eye")]), ref);
    expect(withTrait.senses.some((s) => s.label === "Darkvision")).toBe(false);
    expect(withTrait.senses.some((s) => s.label === "Low-light vision")).toBe(false);
  });

  it("Vine Leshy Agile (ARG): Ability Scores' Con swap is replaced by Dex, Wis/Int unchanged", () => {
    // Standard: Con +2, Wis +2, Int -2. Agile: Dex +2, Wis +2, Int -2 —
    // suppressing the standard trio and applying Agile's own leaves the net
    // effect as "Con +2 becomes Dex +2", matching the source text exactly.
    const base = compute(makeDoc("Vine Leshy"), ref);
    const withTrait = compute(makeDoc("Vine Leshy", [traitId("Agile (Vine Leshy)")]), ref);
    expect(withTrait.abilities.con.total).toBe(base.abilities.con.total - 2);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total + 2);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
    expect(withTrait.abilities.int.total).toBe(base.abilities.int.total);
  });

  it("an unmapped race keeps the historical apply-on-top posture (Kasatha Stealthy)", () => {
    // Kasatha has no `VENDORED_STANDARD_TRAIT_TARGETS` entry. Stealthy names
    // `replacedTraitNames: ["Jumper", "Stalker"]`, but both replaced traits
    // are prose-only (a conditional jump bonus; a class-skill grant), so
    // there is nothing to suppress and its own +2 Stealth lands on top of
    // the untouched standard changes, the posture for every unmapped race.
    expect(VENDORED_STANDARD_TRAIT_TARGETS["Kasatha"]).toBeUndefined();
    const base = compute(makeDoc("Kasatha"), ref);
    const withTrait = compute(makeDoc("Kasatha", [traitId("Stealthy", "Kasatha")]), ref);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total + 2);
    expect(withTrait.ac.normal).toBe(base.ac.normal);
  });

  it("pins the full set of mapped races", () => {
    expect(Object.keys(VENDORED_STANDARD_TRAIT_TARGETS).sort()).toEqual([
      "Aasimar",
      "Aquatic Elf",
      "Catfolk",
      "Changeling",
      "Dhampir",
      "Drow",
      "Duergar",
      "Duskwalker",
      "Fetchling",
      "Gathlain",
      "Ghoran",
      "Goblin",
      "Half-Elf",
      "Half-Orc",
      "Hobgoblin",
      "Human",
      "Ifrit",
      "Kitsune",
      "Kobold",
      "Locathah",
      "Merfolk",
      "Nagaji",
      "Oread",
      "Ratfolk",
      "Shabti",
      "Skinwalker",
      "Suli",
      "Svirfneblin",
      "Sylph",
      "Tengu",
      "Tiefling",
      "Undine",
      "Vanara",
      "Vine Leshy",
      "Vishkanya",
      "Wayang",
      "Wyrwood",
      "Wyvaran",
    ]);
  });
});

describe("Skinwalker / Changeling / Gathlain suppression (issue #74, messy-race round)", () => {
  it("Skinwalker Fanglord's Alternate Skill Modifiers retires Animal-Minded's Handle Animal bonus", () => {
    // Standard Animal-Minded: +2 Handle Animal (the wild-empathy half is
    // prose). Fanglord's replacement: +2 Acrobatics/+2 Perception.
    const base = compute(makeDoc("Skinwalker"), ref);
    expect(base.skills["han"]!.total).toBe(2);
    const withTrait = compute(
      makeDoc("Skinwalker", [traitId("Alternate Skill Modifiers (Skinwalker - Fanglord)")]),
      ref,
    );
    expect(withTrait.skills["han"]!.total).toBe(base.skills["han"]!.total - 2);
    expect(withTrait.skills["acr"]!.total).toBe(base.skills["acr"]!.total + 2);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total + 2);
  });

  it("Changeling Witchborn swaps the +2 Wis for +2 Int, Cha/Con unchanged", () => {
    // Standard: Cha +2, Wis +2, Con -2. Witchborn: Int +2, Cha +2, Con -2.
    const base = compute(makeDoc("Changeling"), ref);
    const withTrait = compute(makeDoc("Changeling", [traitId("Witchborn")]), ref);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total - 2);
    expect(withTrait.abilities.int.total).toBe(base.abilities.int.total + 2);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
    expect(withTrait.abilities.con.total).toBe(base.abilities.con.total);
  });

  it("Changeling Brine May's Ability Modifiers bundle replaces the base array via prefix inference", () => {
    // "Ability Modifiers (Changeling - Brine May)" ships empty
    // `replacedTraitNames`; the "Ability Modifiers (" prefix inference maps
    // it to "Ability Score Modifiers". Standard: Cha +2, Wis +2, Con -2.
    // Brine May: Dex +2, Wis +2, Con -2 — and its changes are `untyped`, so
    // WITHOUT suppression they'd sum with the base racial ones (+4 net Wis).
    const base = compute(makeDoc("Changeling"), ref);
    const withTrait = compute(
      makeDoc("Changeling", [traitId("Ability Modifiers (Changeling - Brine May)")]),
      ref,
    );
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total - 2);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total + 2);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
    expect(withTrait.abilities.con.total).toBe(base.abilities.con.total);
  });

  it("Changeling Hag Magic (ISR) retires the +1 natural armor", () => {
    const base = compute(makeDoc("Changeling"), ref);
    const withTrait = compute(makeDoc("Changeling", [traitId("Hag Magic (ISR)")]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted - 1);
    expect(withTrait.ac.touch).toBe(base.ac.touch);
  });

  it("Gathlain Photosynthetic Vision trades low-light vision for +2 Perception", () => {
    const base = compute(makeDoc("Gathlain"), ref);
    expect(base.senses.some((s) => s.kind === "lowLight")).toBe(true);
    const withTrait = compute(makeDoc("Gathlain", [traitId("Photosynthetic Vision")]), ref);
    expect(withTrait.senses.some((s) => s.kind === "lowLight")).toBe(false);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total + 2);
  });

  it("Gathlain Bower Born retires the +1 natural armor for +2 Diplomacy/Handle Animal", () => {
    const base = compute(makeDoc("Gathlain"), ref);
    const withTrait = compute(makeDoc("Gathlain", [traitId("Bower Born")]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted - 1);
    expect(withTrait.skills["dip"]!.total).toBe(base.skills["dip"]!.total + 2);
    expect(withTrait.skills["han"]!.total).toBe(base.skills["han"]!.total + 2);
  });

  it("Gathlain Tree-Born drops the Con penalty, keeps Cha/Dex, and slows both speeds", () => {
    // The bundle re-supplies Cha +2/Dex +2 itself (see the map doc comment),
    // so the visible net effect is only "no Con penalty" plus the speed sets.
    const base = compute(makeDoc("Gathlain"), ref);
    expect(base.abilities.con.total).toBe(8);
    const withTrait = compute(makeDoc("Gathlain", [traitId("Tree-Born")]), ref);
    expect(withTrait.abilities.con.total).toBe(10);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total);
    expect(withTrait.speeds.land).toBe(20);
    expect(withTrait.speeds.fly).toBe(30);
  });
});

describe("uncommon-race vendored suppression (issue #74)", () => {
  it("Vanara Acrobatic: Nimble's +2 Stealth drops, its own Acrobatics/Escape Artist land", () => {
    // Standard Nimble: +2 Acrobatics/+2 Stealth. Acrobatic re-supplies the
    // +2 Acrobatics itself, so the net effect is Stealth for Escape Artist.
    const base = compute(makeDoc("Vanara"), ref);
    const withTrait = compute(makeDoc("Vanara", [traitId("Acrobatic (Vanara)")]), ref);
    expect(withTrait.skills["acr"]!.total).toBe(base.skills["acr"]!.total);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total - 2);
    expect(withTrait.skills["esc"]!.total).toBe(base.skills["esc"]!.total + 2);
  });

  it("Svirfneblin Healthy: Fortunate's +2 on all saves drops", () => {
    // Healthy's own +4 vs. disease/poison is conditional prose; the traded
    // Fortunate is the structured +2 racial on every save.
    const base = compute(makeDoc("Svirfneblin"), ref);
    const withTrait = compute(makeDoc("Svirfneblin", [traitId("Healthy", "Svirfneblin")]), ref);
    expect(withTrait.saves.fort.total).toBe(base.saves.fort.total - 2);
    expect(withTrait.saves.ref.total).toBe(base.saves.ref.total - 2);
    expect(withTrait.saves.will.total).toBe(base.saves.will.total - 2);
  });

  it("Wayang In the Shadows: Lurker's +2 Perception/Stealth drops", () => {
    const base = compute(makeDoc("Wayang"), ref);
    const withTrait = compute(makeDoc("Wayang", [traitId("In the Shadows")]), ref);
    expect(withTrait.skills["per"]!.total).toBe(base.skills["per"]!.total - 2);
    expect(withTrait.skills["ste"]!.total).toBe(base.skills["ste"]!.total - 2);
  });

  it("Aquatic Elf Deep Sea Dweller: low-light vision and the magic-sleep immunity drop, darkvision 60 lands", () => {
    const base = compute(makeDoc("Aquatic Elf"), ref);
    expect(base.senses.some((s) => s.kind === "lowLight")).toBe(true);
    expect(base.defenses?.effectImmunities?.some((i) => i.qualifier === "magicSleep")).toBe(true);
    const withTrait = compute(makeDoc("Aquatic Elf", [traitId("Deep Sea Dweller")]), ref);
    expect(withTrait.senses.some((s) => s.kind === "lowLight")).toBe(false);
    expect(withTrait.senses.some((s) => s.label === "Darkvision" && s.range === 60)).toBe(true);
    expect(withTrait.defenses?.effectImmunities ?? []).toEqual([]);
  });

  it("Merfolk Secret Magic: Armor's +2 natural armor drops", () => {
    const base = compute(makeDoc("Merfolk"), ref);
    const withTrait = compute(makeDoc("Merfolk", [traitId("Secret Magic")]), ref);
    expect(withTrait.ac.flatFooted).toBe(base.ac.flatFooted - 2);
    expect(withTrait.ac.touch).toBe(base.ac.touch);
  });

  it("Shabti Facsimile: the undeath-transform immunity drops", () => {
    const base = compute(makeDoc("Shabti"), ref);
    expect(base.defenses?.effectImmunities?.some((i) => i.qualifier === "undeath")).toBe(true);
    const withTrait = compute(makeDoc("Shabti", [traitId("Facsimile")]), ref);
    expect(withTrait.defenses?.effectImmunities ?? []).toEqual([]);
  });

  it("Duskwalker Fosterling: Skilled's +2 Heal/Knowledge (religion) drops, +2 Handle Animal/Diplomacy lands", () => {
    const base = compute(makeDoc("Duskwalker"), ref);
    const withTrait = compute(makeDoc("Duskwalker", [traitId("Fosterling")]), ref);
    expect(withTrait.skills["hea"]!.total).toBe(base.skills["hea"]!.total - 2);
    expect(withTrait.skills["kre"]!.total).toBe(base.skills["kre"]!.total - 2);
    expect(withTrait.skills["han"]!.total).toBe(base.skills["han"]!.total + 2);
    expect(withTrait.skills["dip"]!.total).toBe(base.skills["dip"]!.total + 2);
  });
});

describe("heritage ability-array swaps (supplemented arrays + Base Statistics suppression)", () => {
  // Each heritage's replacement array is hand-authored in
  // `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` (data-pipeline) from the entry's own
  // prose; the map's "Base Statistics" key retires the base race's array.
  // Expected values are the published net effect: base array out,
  // heritage array in.

  it("Tiefling Devil-Spawn (Hellspawn): +2 Con/+2 Wis/-2 Cha replaces +2 Dex/+2 Int/-2 Cha", () => {
    const base = compute(makeDoc("Tiefling"), ref);
    const withTrait = compute(makeDoc("Tiefling", [traitId("Devil-Spawn (Hellspawn)")]), ref);
    expect(withTrait.abilities.con.total).toBe(base.abilities.con.total + 2);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total + 2);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total - 2);
    expect(withTrait.abilities.int.total).toBe(base.abilities.int.total - 2);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
  });

  it("Aasimar Angel-Blooded (Angelkin): +2 Str/+2 Cha replaces +2 Cha/+2 Wis", () => {
    const base = compute(makeDoc("Aasimar"), ref);
    const withTrait = compute(makeDoc("Aasimar", [traitId("Angel-Blooded (Angelkin)")]), ref);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total + 2);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total - 2);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
  });

  it("Ifrit Sunsoul (Solar Ifrit): +2 Str/+2 Cha/-2 Wis replaces +2 Dex/+2 Cha/-2 Wis", () => {
    const base = compute(makeDoc("Ifrit"), ref);
    const withTrait = compute(makeDoc("Ifrit", [traitId("Sunsoul (Solar Ifrit)")]), ref);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total + 2);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total - 2);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
  });

  it("Skinwalker Wereboar-Kin (Ragebred): +2 Str/-2 Cha replaces +2 Wis/-2 Int; +2 Con only while shapechanged", () => {
    // Published (aonprd.com): "+2 Strength, -2 Charisma (+2 Constitution
    // while shapechanged)" — the vendored description's own "Ability
    // Modifiers" line is mistyped ("+2 Wis" instead of "+2 Str"; matched
    // verbatim by the supplement's drift-guard `keyword`), corrected in
    // `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` (data-pipeline). See
    // `skinwalkerChangeShape.test.ts` for the shapechanged-gate fixtures.
    const base = compute(makeDoc("Skinwalker"), ref);
    const withTrait = compute(makeDoc("Skinwalker", [traitId("Wereboar-Kin (Ragebred)")]), ref);
    expect(withTrait.abilities.int.total).toBe(base.abilities.int.total + 2);
    expect(withTrait.abilities.cha.total).toBe(base.abilities.cha.total - 2);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total - 2);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total + 2);
    // Not shapechanged: no Con bonus.
    expect(withTrait.abilities.con.total).toBe(base.abilities.con.total);
  });

  it("heritage swaps leave the race's non-ability standard traits alone (Hellspawn keeps fiendish resistance)", () => {
    const withTrait = compute(makeDoc("Tiefling", [traitId("Devil-Spawn (Hellspawn)")]), ref);
    expect(
      withTrait.defenses?.resistances.some((r) => r.qualifier === "fire" && r.total === 5),
    ).toBe(true);
    expect(withTrait.senses.some((s) => s.label === "Darkvision")).toBe(true);
  });
});

describe("supplement-authored prose-only numbers beyond ability arrays", () => {
  it("Gathlain Fey Resilience: DR 1/cold iron, +1 per 5 HD", () => {
    // "A gathlain with this racial trait gains DR 1/cold iron. This DR
    // increases by 1 for every 5 HD the gathlain has." (Advanced Race
    // Guide). Fighter L1: 1 + floor(1/5) = 1. Fighter L10: 1 + floor(10/5)
    // = 3. The vendored entry ships the number as prose only (its own note
    // says to set the DR by hand); the supplement's formula computes it.
    const id = traitId("Fey Resilience");
    const l1 = compute(makeDoc("Gathlain", [id]), ref);
    expect(l1.defenses?.dr).toEqual([
      { total: 1, qualifier: "cold-iron", components: expect.anything() },
    ]);
    const doc10 = makeDoc("Gathlain", [id]);
    doc10.identity.classes = [{ tag: "fighter", level: 10 }];
    const l10 = compute(doc10, ref);
    expect(l10.defenses?.dr).toEqual([
      { total: 3, qualifier: "cold-iron", components: expect.anything() },
    ]);
  });
});
