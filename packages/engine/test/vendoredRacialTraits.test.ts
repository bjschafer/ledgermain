/**
 * Hand-computed fixture tests for the vendored alternate-racial-trait catalog
 * (issue #74, `RefData.racialTraits`) — distinct from the
 * hand-authored 8-race `RACIAL_TRAITS` table covered by `racial-traits.test.ts`.
 * A vendored pick's `changes[]` apply; whether the race's standard `Change`s
 * are suppressed alongside depends on the race: the six featured races in
 * `VENDORED_STANDARD_TRAIT_TARGETS` drop the replaced standard trait's
 * verified targets (Phase 6 fixtures below), every other race keeps the
 * historical apply-on-top posture (see `RacialTrait`'s doc comment in
 * `@pf1/schema`), which the Granite Skin fixtures prove.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, VENDORED_STANDARD_TRAIT_TARGETS } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string): string {
  const entry = Object.values(ref.racialTraits).find((t) => t.name === name);
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

describe("Oread Granite Skin (vendored, +1 racial natural armor)", () => {
  // Verified against the source: "Rocky growths cover the skin of oreads
  // with this racial trait. They gain a +1 racial bonus to natural armor.
  // This racial trait replaces energy resistance." (replacedTraitNames:
  // ["Energy Resistance"]) — Oread is NOT one of the 8 hand-authored races,
  // so this proves the fill plan's new coverage, not just re-testing the
  // existing table.
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

  it("leaves the race's own standard changes untouched (no suppression)", () => {
    // Oread's standard ability changes (Str/Wis up, Dex down) still apply in
    // full alongside the vendored grant — nothing here suppresses them.
    const base = compute(makeDoc("Oread"), ref);
    const withTrait = compute(makeDoc("Oread", [graniteSkin]), ref);
    expect(withTrait.abilities.str.total).toBe(base.abilities.str.total);
    expect(withTrait.abilities.wis.total).toBe(base.abilities.wis.total);
    expect(withTrait.abilities.dex.total).toBe(base.abilities.dex.total);
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
 * Featured-race suppression (issue #74 Phase 6): for the six races in
 * `VENDORED_STANDARD_TRAIT_TARGETS`, a vendored alternate that names a
 * structured standard trait in `replacedTraitNames` now DROPS that trait's
 * `Race.changes` while active — expected values verified against the ARG
 * race write-ups and the vendored `races.json` change lists.
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

  it("an unmapped race keeps the historical apply-on-top posture (Oread above is the proof)", () => {
    // Oread has no `VENDORED_STANDARD_TRAIT_TARGETS` entry, so Granite
    // Skin's replaced Energy Resistance still applies alongside it — covered
    // by the Granite Skin describe block; this fixture pins the map itself.
    expect(VENDORED_STANDARD_TRAIT_TARGETS["Oread"]).toBeUndefined();
    expect(Object.keys(VENDORED_STANDARD_TRAIT_TARGETS).sort()).toEqual([
      "Aasimar",
      "Dhampir",
      "Kitsune",
      "Ratfolk",
      "Tengu",
      "Tiefling",
    ]);
  });
});
