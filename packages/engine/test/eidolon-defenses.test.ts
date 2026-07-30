import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  deriveEidolon,
  DR_NONE_QUALIFIER,
  foldEidolonGrantDefenses,
  type EidolonSubtypeGrant,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/**
 * `foldEidolonGrantDefenses` is pure and works off the `EidolonSubtypeGrant`
 * interface alone — these fixtures are inline literals, deliberately not
 * pulled from any real `EIDOLON_SUBTYPES` entry, since most subtype data
 * doesn't carry the structured defense fields yet (a parallel content pass
 * is filling those in).
 */
describe("foldEidolonGrantDefenses", () => {
  it("only counts unlocked grants (grant.level <= level)", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", resistances: [{ energy: "fire", amount: 5 }] },
      { level: 8, note: "n", resistances: [{ energy: "cold", amount: 10 }] },
    ];
    const result = foldEidolonGrantDefenses(grants, 4);
    expect(result).toEqual({
      resistances: [{ energy: "fire", amount: 5 }],
      damageImmunities: [],
      effectImmunities: [],
      dr: [],
    });
  });

  it("takes the highest amount per energy across unlocked resistance grants", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", resistances: [{ energy: "acid", amount: 5 }] },
      { level: 4, note: "n", resistances: [{ energy: "acid", amount: 10 }] },
    ];
    const result = foldEidolonGrantDefenses(grants, 4);
    expect(result?.resistances).toEqual([{ energy: "acid", amount: 10 }]);
  });

  it("a damage immunity to an energy supersedes (removes) any resistance to that same energy", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", resistances: [{ energy: "electricity", amount: 5 }] },
      { level: 16, note: "n", damageImmunities: ["electricity"] },
    ];
    const result = foldEidolonGrantDefenses(grants, 16);
    expect(result?.resistances).toEqual([]);
    expect(result?.damageImmunities).toEqual(["electricity"]);
  });

  it("a DR upgrade with the same bypass keeps the higher amount", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 12, note: "n", dr: { amount: 5, bypass: "adamantine" } },
      { level: 20, note: "n", dr: { amount: 10, bypass: "adamantine" } },
    ];
    const result = foldEidolonGrantDefenses(grants, 20);
    expect(result?.dr).toEqual([{ amount: 10, bypass: "adamantine" }]);
  });

  it("two DR lines with different bypasses both surface", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 12, note: "n", dr: { amount: 5, bypass: "evil" } },
      { level: 16, note: "n", dr: { amount: 5, bypass: DR_NONE_QUALIFIER } },
    ];
    const result = foldEidolonGrantDefenses(grants, 16);
    expect(result?.dr).toEqual([
      { amount: 5, bypass: "evil" },
      { amount: 5, bypass: DR_NONE_QUALIFIER },
    ]);
  });

  it("an unknown effect-immunity slug is dropped; a known slug resolves to its display label", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", effectImmunities: ["poison", "not-a-real-slug"] },
    ];
    const result = foldEidolonGrantDefenses(grants, 1);
    expect(result?.effectImmunities).toEqual(["poison"]);
  });

  it("damage immunities dedup by energy slug", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", damageImmunities: ["fire"] },
      { level: 4, note: "n", damageImmunities: ["fire"] },
    ];
    const result = foldEidolonGrantDefenses(grants, 4);
    expect(result?.damageImmunities).toEqual(["fire"]);
  });

  it("returns undefined when every unlocked grant carries no structured defense field", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "prose-only note" },
      { level: 4, note: "another prose-only note", poolBonus: 1 },
    ];
    expect(foldEidolonGrantDefenses(grants, 20)).toBeUndefined();
  });

  it("returns undefined for an empty grant list", () => {
    expect(foldEidolonGrantDefenses([], 20)).toBeUndefined();
  });

  // The Resistance evolution: "resistance 5 against that energy type. This
  // resistance increases by 5 for every 5 levels the summoner possesses, to
  // a maximum of 15 at 10th level" (legacy.aonprd.com, Unchained summoner).
  it("a scaling resistance follows the Resistance evolution's 5/10/15 schedule", () => {
    const grants: EidolonSubtypeGrant[] = [
      { level: 1, note: "n", resistances: [{ energy: "acid", amount: 5, scales: true }] },
    ];
    expect(foldEidolonGrantDefenses(grants, 1)?.resistances).toEqual([
      { energy: "acid", amount: 5 },
    ]);
    expect(foldEidolonGrantDefenses(grants, 4)?.resistances).toEqual([
      { energy: "acid", amount: 5 },
    ]);
    expect(foldEidolonGrantDefenses(grants, 5)?.resistances).toEqual([
      { energy: "acid", amount: 10 },
    ]);
    expect(foldEidolonGrantDefenses(grants, 9)?.resistances).toEqual([
      { energy: "acid", amount: 10 },
    ]);
    expect(foldEidolonGrantDefenses(grants, 10)?.resistances).toEqual([
      { energy: "acid", amount: 15 },
    ]);
    expect(foldEidolonGrantDefenses(grants, 20)?.resistances).toEqual([
      { energy: "acid", amount: 15 },
    ]);
  });
});

function makeDoc(overrides: {
  classTag: "summoner" | "summonerUnchained";
  level: number;
  eidolon: CharacterDoc["build"]["eidolon"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Summoner",
      race: raceId("Human"),
      classes: [{ tag: overrides.classTag, level: overrides.level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      eidolon: overrides.eidolon,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("deriveEidolon defenses field", () => {
  it("a chained eidolon (no subtype system at all) always derives defenses: undefined", () => {
    const doc = makeDoc({
      classTag: "summoner",
      level: 12,
      eidolon: { baseForm: "biped", name: "Grix", evolutions: [] },
    });
    const eidolon = deriveEidolon(doc, buildRollData(doc, ref));
    expect(eidolon).toBeDefined();
    expect(eidolon!.defenses).toBeUndefined();
  });
});

/**
 * End-to-end against the real Angel subtype data. Expected values
 * hand-computed from aonprd.com "Subtypes - Eidolon (Unchained)": 1st "the
 * resistance (acid) and resistance (cold) evolutions" (Resistance evolution
 * scaling, 5/10/15 by summoner level 1/5/10); 4th "electricity resistance 10
 * and fire resistance 10" (flat); 12th "DR 5/evil ... immunity to
 * petrification"; 16th "lose the resistance (acid) and resistance (cold)
 * evolutions, and instead gain the immunity (acid) and immunity (cold)
 * evolutions".
 */
describe("deriveEidolon defenses: Angel end to end", () => {
  function angelAt(level: number) {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level,
      eidolon: { baseForm: "biped", subtype: "angel", name: "Seraph", evolutions: [] },
    });
    return deriveEidolon(doc, buildRollData(doc, ref))!.defenses;
  }

  it("at 1st: acid 5 and cold 5, nothing else", () => {
    expect(angelAt(1)).toEqual({
      resistances: [
        { energy: "acid", amount: 5 },
        { energy: "cold", amount: 5 },
      ],
      damageImmunities: [],
      effectImmunities: [],
      dr: [],
    });
  });

  it("at 7th: the 1st-level evolutions have scaled to 10 alongside the flat 4th-level 10s", () => {
    expect(angelAt(7)?.resistances).toEqual([
      { energy: "acid", amount: 10 },
      { energy: "cold", amount: 10 },
      { energy: "electricity", amount: 10 },
      { energy: "fire", amount: 10 },
    ]);
  });

  it("at 12th: acid/cold capped at 15, DR 5/evil, immune to petrification", () => {
    expect(angelAt(12)).toEqual({
      resistances: [
        { energy: "acid", amount: 15 },
        { energy: "cold", amount: 15 },
        { energy: "electricity", amount: 10 },
        { energy: "fire", amount: 10 },
      ],
      damageImmunities: [],
      effectImmunities: ["petrification"],
      dr: [{ amount: 5, bypass: "evil" }],
    });
  });

  it("genie choose-one grants: nothing until chosen, then the chosen energy scales and upgrades", () => {
    // aonprd.com: 1st "gain the resistance evolution for any one energy
    // type"; 12th "lose the resistance evolution gained at 1st level and
    // instead gain the immunity evolution".
    function genieAt(level: number, choices?: Record<string, string>) {
      const doc = makeDoc({
        classTag: "summonerUnchained",
        level,
        eidolon: {
          baseForm: "biped",
          subtype: "genie",
          name: "Zeph",
          evolutions: [],
          subtypeGrantChoices: choices,
        },
      });
      return deriveEidolon(doc, buildRollData(doc, ref))!;
    }

    // Unchosen: the choice grants contribute nothing at all.
    expect(genieAt(12).defenses).toBeUndefined();
    // Chosen fire at 1st: the scaling Resistance evolution (10 at summoner 7).
    expect(genieAt(7, { "1": "fire" }).defenses?.resistances).toEqual([
      { energy: "fire", amount: 10 },
    ]);
    // At 12th the same chosen energy flips to immunity.
    const at12 = genieAt(12, { "1": "fire" }).defenses;
    expect(at12?.resistances).toEqual([]);
    expect(at12?.damageImmunities).toEqual(["fire"]);
    // An invalid stored value grants nothing rather than guessing.
    expect(genieAt(12, { "1": "radiant" }).defenses).toBeUndefined();

    // 8th-level movement package: flight only once chosen.
    expect(genieAt(8).speeds["fly"]).toBeUndefined();
    expect(genieAt(8, { "8": "flight" }).speeds["fly"]).toBeGreaterThan(0);
    const aquatic = genieAt(8, { "8": "aquatic" });
    expect(aquatic.speeds["swim"]).toBeGreaterThan(0);
  });

  it("at 16th: acid and cold flip from resistance to immunity; electricity and fire stay 10", () => {
    expect(angelAt(16)).toEqual({
      resistances: [
        { energy: "electricity", amount: 10 },
        { energy: "fire", amount: 10 },
      ],
      damageImmunities: ["acid", "cold"],
      effectImmunities: ["petrification"],
      dr: [{ amount: 5, bypass: "evil" }],
    });
  });
});
