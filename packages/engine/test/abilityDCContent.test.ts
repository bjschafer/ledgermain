/**
 * Content-side promotions onto `DerivedSheet.abilityDCs` (`ability-dcs.ts`),
 * covering the pieces this wave owns: the Sacred Conduit character trait
 * (`traits.ts`) and the Master of Many Styles / Martial Artist "Pain Points"
 * archetype feature (`archetype-extracted/monk.ts`). Mirrors
 * `abilityDCs.test.ts`'s full-`compute()` fixture style so the
 * `targets.ts`/`collect.ts` wiring is exercised too, not just the raw table
 * entries.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const HUMAN = raceId("Human");
const MASTER_OF_MANY_STYLES = archetypeId("Master of Many Styles", "monk");
const MARTIAL_ARTIST = archetypeId("Martial Artist", "monk");

/** Human, `classes` as given, abilities defaulting to 10 with `abilities` overrides. */
function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: Partial<CharacterDoc["abilities"]>;
  traits?: string[];
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "ability-dc-content-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: [],
      skillRanks: {},
      traits: over.traits ?? [],
      archetypes: over.archetypes ?? [],
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
  } as CharacterDoc;
}

describe("Sacred Conduit trait (channel DC promotion)", () => {
  it("raises a cleric's Channel Energy DC by 1 (APG: +1 trait bonus to the save DC of any energy you channel)", () => {
    // Base: cleric 5, Cha 14 (+2) -> 10 + 2 + 2 = 14 (same fixture as
    // abilityDCs.test.ts's cleric case). Sacred Conduit adds a flat +1.
    const withoutTrait = compute(
      makeDoc({ classes: [{ tag: "cleric", level: 5 }], abilities: { cha: 14 } }),
      ref,
    );
    expect(withoutTrait.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 14, save: "Will" },
    ]);

    const withTrait = compute(
      makeDoc({
        classes: [{ tag: "cleric", level: 5 }],
        abilities: { cha: 14 },
        traits: ["sacredConduit"],
      }),
      ref,
    );
    expect(withTrait.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 15, save: "Will" },
    ]);
  });
});

describe("Monk 'Pain Points' archetype feature (Stunning Fist / Quivering Palm DC promotion)", () => {
  it("a Master of Many Styles monk 3 gets +1 on the Stunning Fist DC line (Ultimate Combat p.59 Pain Points, stamped under this archetypeId in the vendored data)", () => {
    // Monk 3, Wis 14 (+2): base Stunning Fist DC = 10 + 1 + 2 = 13.
    const withoutArchetype = compute(
      makeDoc({ classes: [{ tag: "monk", level: 3 }], abilities: { wis: 14 } }),
      ref,
    );
    expect(withoutArchetype.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 13, save: "Fortitude" },
    ]);

    const withArchetype = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 3 }],
        abilities: { wis: 14 },
        archetypes: [MASTER_OF_MANY_STYLES],
      }),
      ref,
    );
    expect(withArchetype.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 14, save: "Fortitude" },
    ]);
  });

  it("a Martial Artist monk 15 gets +1 on BOTH the Stunning Fist and Quivering Palm DC lines (UC: 'increases the DC of his stunning fist and quivering palm by 1')", () => {
    // Monk 15, Wis 18 (+4): base Stunning Fist DC = 10 + 7 + 4 = 21;
    // base Quivering Palm DC (chained monk 15th level) = 10 + 7 + 4 = 21.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 15 }],
        abilities: { wis: 18 },
        archetypes: [MARTIAL_ARTIST],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 22, save: "Fortitude" },
      { key: "quiveringPalm", label: "Quivering Palm DC", dc: 22, save: "Fortitude" },
    ]);
  });

  it("the archetype without the level gets no bump (Pain Points is a 3rd-level feature, not granted at 2nd)", () => {
    // Monk 2, Wis 14 (+2): base Stunning Fist DC = 10 + 1 + 2 = 13, same as
    // an unarchetyped monk 2 would show — the archetype is selected but the
    // granting class hasn't reached the feature's level yet.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "monk", level: 2 }],
        abilities: { wis: 14 },
        archetypes: [MARTIAL_ARTIST],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 13, save: "Fortitude" },
    ]);
  });
});
