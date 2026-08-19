/**
 * Hand-computed fixtures for the #132 N-Z casting-economy content wave:
 * archetype rows in `casting-economy/archetypesNZ.ts` and
 * `casting-economy/bonus-knownNZ.ts`. Exercises the real (non-injected)
 * tables through `resolveCastingAdjustments` / `resolveBonusKnownSpells`,
 * same posture as `castingEconomy.test.ts`'s own resolution-path tests.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_BONUS_KNOWN_SPELLS,
  ARCHETYPE_CASTING_ADJUSTMENTS,
  baseSpellsPerDay,
  resolveBonusKnownSpells,
  resolveCastingAdjustments,
  spellIdByName,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function docWith(classTag: string, level: number, archetypeId: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: classTag, level }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: [archetypeId],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("oracle Bonus Spell archetypes (mystery-replacement cluster)", () => {
  it("community guardian: gates on oracle level, assigns the mystery bonus-spell parity level, unions the full replace schedule", () => {
    // Bless Water is a 1st-level cleric/oracle spell (PZO1110 p.249); the
    // mystery bonus-spell schedule fixes it at oracle level 2 -> spell
    // level 1, level 4 -> spell level 2, independent of any other class's
    // nominal spell level for the same name.
    const resolved = resolveBonusKnownSpells(
      docWith("oracle", 4, "oracle:community-guardian"),
      ref,
    );
    expect(resolved).toBeDefined();
    expect(resolved!.spells).toHaveLength(2);
    const byName = new Map(resolved!.spells.map((s) => [s.name, s]));
    expect(byName.get("Bless Water")?.level).toBe(1);
    expect(byName.get("Bless Water")?.spellId).toBe(spellIdByName(ref, "Bless Water"));
    expect(byName.get("Consecrate")?.level).toBe(2);
    // Remove Disease (6th), Hallow (10th), Heroes' Feast (12th) aren't
    // reached yet at oracle 4.
    expect(byName.has("Remove Disease")).toBe(false);
    // The archetype's full replacement schedule is a static fact of the
    // feature, not filtered to the character's current level.
    expect(resolved!.mysteryReplacedLevels).toEqual([2, 4, 6, 10, 12]);
  });

  it("purifier: the -1 slot per level and the bonus-spell schedule both resolve from the real tables", () => {
    const doc = docWith("oracle", 5, "oracle:purifier");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.kind).toBe("slots");
    expect(adjs[0]!.spellLevels).toBe("each");
    expect(adjs[0]!.delta).toBe(-1);
    expect(adjs[0]!.classTag).toBe("oracle");
    // Oracle spells/day tracks the sorcerer table (`oracle: progression:
    // "sorcerer"` elsewhere in this engine) — a purifier's wired -1/level
    // edits whatever this table says, e.g. at oracle 5 the base 1st-level
    // count below drops by one.
    expect(baseSpellsPerDay("sorcerer", 5, 1)).toBeGreaterThan(0);

    const bonus = resolveBonusKnownSpells(doc, ref);
    expect(bonus).toBeDefined();
    const byName = new Map(bonus!.spells.map((s) => [s.name, s]));
    expect(byName.get("Veil of Heaven")?.level).toBe(1);
    expect(byName.get("Confess")?.level).toBe(2);
    // Cast Out (6th) isn't reached yet at oracle 5.
    expect(byName.has("Cast Out")).toBe(false);
  });
});

describe("occultist Devoted Mystic (tiered +1 slot cluster)", () => {
  it("grants nothing below 8th occultist level, +1 slot of every level at 8th", () => {
    const below = resolveCastingAdjustments(docWith("occultist", 7, "occultist:silksworn"), ref);
    expect(below).toEqual([]);

    const at8 = resolveCastingAdjustments(docWith("occultist", 8, "occultist:silksworn"), ref);
    expect(at8).toHaveLength(1);
    expect(at8[0]!.kind).toBe("slots");
    expect(at8[0]!.spellLevels).toBe("each");
    expect(at8[0]!.delta).toBe(1);
    expect(at8[0]!.classTag).toBe("occultist");
  });

  it("stacks a second +1 tier at 12th, a third at 16th", () => {
    expect(
      resolveCastingAdjustments(docWith("occultist", 12, "occultist:silksworn"), ref),
    ).toHaveLength(2);
    expect(
      resolveCastingAdjustments(docWith("occultist", 16, "occultist:silksworn"), ref),
    ).toHaveLength(3);
  });
});

describe("summoner Chaos/Law Magic (net-replaced known cluster)", () => {
  it("morphic savant: -1 known per level 1-6 pairs with the 6 fixed replacement spells", () => {
    const doc = docWith("summoner", 16, "summoner:morphic-savant");
    const adjs = resolveCastingAdjustments(doc, ref);
    expect(adjs).toHaveLength(1);
    expect(adjs[0]!.kind).toBe("known");
    expect(adjs[0]!.spellLevels).toEqual([1, 2, 3, 4, 5, 6]);
    expect(adjs[0]!.delta).toBe(-1);

    const bonus = resolveBonusKnownSpells(doc, ref);
    expect(bonus).toBeDefined();
    expect(bonus!.spells).toHaveLength(6);
    const byName = new Map(bonus!.spells.map((s) => [s.name, s]));
    // Word of Chaos is nominally a 7th-level spell, but the archetype
    // explicitly grants it "as a 6th-level spell" -- the summoner's own max
    // spell level -- so the explicit override must win over the nominal
    // fallback.
    expect(byName.get("Word of Chaos")?.level).toBe(6);
    expect(byName.get("Protection from Law")?.level).toBe(1);
  });
});

describe("skald Seed of Discord (explicit spellLevel override cluster)", () => {
  it("gates each fixed spell on the skald spell-level access schedule and honors the explicit level override", () => {
    // Skald casts off the bard per-day table (1st @ skald 1, 2nd @ 4, 3rd @
    // 7, ...): at skald 7 only doom/castigate/charm monster are reachable.
    const doc = docWith("skald", 7, "skald:red-tongue");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    const byName = new Map(resolved!.spells.map((s) => [s.name, s]));
    expect(resolved!.spells).toHaveLength(3);
    expect(byName.get("Doom")?.level).toBe(1);
    expect(byName.get("Castigate")?.level).toBe(2);
    // Charm Monster is nominally a 4th-level spell; the archetype grants it
    // "as" a 3rd-level spell known, matching the description text.
    expect(byName.get("Charm Monster")?.level).toBe(3);
    expect(byName.has("Denounce")).toBe(false);
  });
});

describe("wizard Reanimator (spellbook-merge cluster)", () => {
  it("gates the nine fixed spells on wizard level, resolves ids for comma-suffixed vendored names", () => {
    const doc = docWith("wizard", 5, "wizard:undead-master");
    const resolved = resolveBonusKnownSpells(doc, ref);
    expect(resolved).toBeDefined();
    expect(resolved!.spells).toHaveLength(3);
    const byName = new Map(resolved!.spells.map((s) => [s.name, s]));
    expect(byName.get("Repair Undead")).toBeDefined();
    // "Lesser Animate Dead" is vendored as "Animate Dead, Lesser".
    const lesser = byName.get("Animate Dead, Lesser");
    expect(lesser?.spellId).toBe(spellIdByName(ref, "Animate Dead, Lesser"));
    expect(byName.get("Animate Dead")).toBeDefined();
    expect(byName.has("Undead Anatomy I")).toBe(false);
  });
});

describe("deliberate residue stays out of the N-Z tables", () => {
  it("restricted-slot and choice-gated entries are not present as castingAdjustment or bonusKnown keys", () => {
    const residueKeys = [
      "psychic:esoteric-starseeker:written-in-the-stars:1",
      "paladin:sacred-servant:spells:4",
      "wizard:runesage:runic-focus:1",
      "skald:hunt-caller:wilderness-magic:5",
      "wizard:pact-wizard-hhh:patron-spells:1",
      "wizard:poleiheira-adherent:bonded-book:1",
    ];
    for (const key of residueKeys) {
      expect(
        ARCHETYPE_CASTING_ADJUSTMENTS[key],
        `${key} unexpectedly wired as a slot/known adjustment`,
      ).toBeUndefined();
      expect(
        ARCHETYPE_BONUS_KNOWN_SPELLS[key],
        `${key} unexpectedly wired as a bonus-known grant`,
      ).toBeUndefined();
    }
  });
});
