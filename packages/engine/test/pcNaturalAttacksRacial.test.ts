/**
 * Fixtures for the racial content wired into `pc-natural-attacks/racial.ts`
 * (`RACE_NATURAL_ATTACKS`/`RACIAL_TRAIT_NATURAL_ATTACKS`) — the
 * primary/secondary math itself is exhaustively covered by
 * `pcNaturalAttacks.test.ts`'s synthetic fixtures, so this file only checks
 * that the real racial/racial-trait tables resolve the right names, dice,
 * kind, notes, and suppression against real `loadRefData()` records. Every
 * dice fact is quoted from `racial.ts`'s own comments, which in turn quote
 * aonprd.com's published race/trait text.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { derivePcNaturalAttacks } from "../src/index.js";
import { SIZE_AC_MOD } from "../src/tables.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0]!;
}

const CECAELIA = raceId("Cecaelia");
const CHANGELING = raceId("Changeling");
const CATFOLK = raceId("Catfolk");
const LIZARDFOLK = raceId("Lizardfolk");

// The vendored "Hag Magic (AoE)" Changeling alternate trait, whose own
// `replacedTraitNames` names `"Claws"` verbatim (see `racial.ts`'s Changeling
// entry) — the id that should suppress the base race's claw grant.
const HAG_MAGIC_AOE_ID = "NBbiF9fQTgRfNaFb";
// The vendored Catfolk "Cat's Claws" alternate trait.
const CATS_CLAWS_ID = "iPSjQFQo6BRxvAf8";

function baseDoc(race: string, over: Partial<CharacterDoc> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race, classes: [{ tag: "fighter", level: 3 }] },
    abilities: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

function attacksFor(doc: CharacterDoc, bab = 3, strMod = 2) {
  return derivePcNaturalAttacks(doc, ref, bab, strMod, SIZE_AC_MOD.med, "med", [], []);
}

describe("pc-natural-attacks/racial.ts: RACE_NATURAL_ATTACKS", () => {
  it("(race) Cecaelia's two tentacle attacks classify PRIMARY despite the name heuristic default", () => {
    // aonprd.com "Cecaelia" Offensive Racial Traits, "Tentacle Attacks (3
    // RP)": "two tentacle attacks that deal 1d4 points of damage. These
    // attacks are primary natural attacks" — an explicit override, since
    // `natural-attacks.ts` classifies a bare "Tentacle" secondary by name.
    const attacks = attacksFor(baseDoc(CECAELIA), 3, 2)!;
    expect(attacks).toHaveLength(1);
    const tentacle = attacks[0]!;
    expect(tentacle.name).toBe("Tentacle");
    expect(tentacle.count).toBe(2);
    expect(tentacle.kind).toBe("primary");
    expect(tentacle.damageDice).toBe("1d4");
    // Two total attacks (count 2) rules out the UMR lone-attack ×1.5 Str
    // rider, so full (not half, not ×1.5) Str applies since it's primary.
    expect(tentacle.damageBonus).toBe(2);
    expect(tentacle.attackBonus).toBe(5); // BAB 3 + Str 2, no secondary penalty
  });

  it("(race, suppression) Changeling's Claws grant is suppressed by the vendored Hag Magic (AoE) trait", () => {
    // aonprd.com "Changeling" Offensive Racial Traits, "Claws": "two claw
    // attacks (1d4 points of damage each)." The vendored "Hag Magic (AoE)"
    // alternate's `replacedTraitNames` include "Claws" verbatim.
    const withoutAlt = attacksFor(baseDoc(CHANGELING))!;
    expect(withoutAlt).toHaveLength(1);
    expect(withoutAlt[0]!.name).toBe("Claw");
    expect(withoutAlt[0]!.count).toBe(2);
    expect(withoutAlt[0]!.damageDice).toBe("1d4");

    const withAlt = baseDoc(CHANGELING, {
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: [HAG_MAGIC_AOE_ID],
      },
    });
    expect(attacksFor(withAlt)).toBeUndefined();
  });

  it("(race, split defs) Lizardfolk's bite carries the unarmed-only note; its claws don't", () => {
    // aonprd.com "Lizardfolk" Offensive Racial Traits: the bite is "a
    // primary attack, or a secondary attack if the creature is wielding
    // manufactured weapons" (not modeled — carries a note instead); the
    // claws have no such caveat. Two separate defs in `racial.ts` keep the
    // note from bleeding onto the claw line (see that file's comment).
    const attacks = attacksFor(baseDoc(LIZARDFOLK))!;
    expect(attacks).toHaveLength(2);
    const bite = attacks.find((a) => a.name === "Bite")!;
    const claw = attacks.find((a) => a.name === "Claw")!;
    expect(bite.damageDice).toBe("1d3");
    expect(bite.notes).toBeDefined();
    expect(bite.notes![0]).toContain("manufactured-weapon");
    expect(claw.count).toBe(2);
    expect(claw.damageDice).toBe("1d4");
    expect(claw.notes).toBeUndefined();
  });
});

describe("pc-natural-attacks/racial.ts: RACIAL_TRAIT_NATURAL_ATTACKS", () => {
  it("(racial trait) Catfolk's vendored Cat's Claws grants two claw attacks at 1d4 only once selected", () => {
    // aonprd.com Catfolk "Cat's Claws" (replaces Natural Hunter): "a pair of
    // claws ... primary attacks that deal 1d4 points of damage."
    const withoutTrait = attacksFor(baseDoc(CATFOLK));
    expect(withoutTrait).toBeUndefined();

    const withTrait = baseDoc(CATFOLK, {
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        vendoredRacialTraits: [CATS_CLAWS_ID],
      },
    });
    const attacks = attacksFor(withTrait)!;
    expect(attacks).toHaveLength(1);
    expect(attacks[0]!.name).toBe("Claw");
    expect(attacks[0]!.count).toBe(2);
    expect(attacks[0]!.kind).toBe("primary");
    expect(attacks[0]!.damageDice).toBe("1d4");
  });
});
