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
  it("a chained eidolon with no defense-shaped evolutions picked derives defenses: undefined (chained has no subtype system at all)", () => {
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
 * The Resistance/Immunity/Damage Reduction evolutions are shared by both
 * variants (`EIDOLON_EVOLUTIONS` is one table; `deriveEidolon` is one
 * function) — a chained eidolon has no subtype system to feed `defenses` at
 * all, so these three evolutions are its ONLY way to populate that block.
 * Expected values hand-computed from d20pfsrd.com's "Eidolons" evolution
 * list: Resistance ("resist 5 against that energy type... increases by 5
 * for every 5 summoner levels... to a maximum of 15 at 10th level"),
 * Immunity ("gaining immunity to that type... Summoner must be at least 7th
 * level"), Damage Reduction ("DR 5 that can be bypassed by weapons that
 * possess the chosen alignment... Summoner must be at least 9th level").
 */
describe("deriveEidolon defenses: Resistance/Immunity/Damage Reduction evolution picks", () => {
  function chainedWith(level: number, evolutions: { id: string; choice?: string }[]) {
    const doc = makeDoc({
      classTag: "summoner",
      level,
      eidolon: { baseForm: "biped", name: "Grix", evolutions },
    });
    return deriveEidolon(doc, buildRollData(doc, ref))!;
  }

  it("Resistance follows the evolution's own 5/10/15-by-level schedule", () => {
    expect(chainedWith(1, [{ id: "resistance", choice: "fire" }]).defenses).toEqual({
      resistances: [{ energy: "fire", amount: 5 }],
      damageImmunities: [],
      effectImmunities: [],
      dr: [],
    });
    expect(chainedWith(5, [{ id: "resistance", choice: "fire" }]).defenses?.resistances).toEqual([
      { energy: "fire", amount: 10 },
    ]);
    expect(chainedWith(10, [{ id: "resistance", choice: "fire" }]).defenses?.resistances).toEqual([
      { energy: "fire", amount: 15 },
    ]);
  });

  it("Resistance picked twice for two different energies gives two independent lines", () => {
    const defenses = chainedWith(1, [
      { id: "resistance", choice: "cold" },
      { id: "resistance", choice: "acid" },
    ]).defenses;
    expect(defenses?.resistances).toEqual([
      { energy: "cold", amount: 5 },
      { energy: "acid", amount: 5 },
    ]);
  });

  it("Immunity grants a flat damage immunity, independent of level scaling", () => {
    const defenses = chainedWith(20, [{ id: "immunity", choice: "electricity" }]).defenses;
    expect(defenses?.damageImmunities).toEqual(["electricity"]);
  });

  it("Damage Reduction grants DR 5 bypassed by the chosen alignment", () => {
    const defenses = chainedWith(20, [{ id: "damage-reduction", choice: "evil" }]).defenses;
    expect(defenses?.dr).toEqual([{ amount: 5, bypass: "evil" }]);
  });

  it("a pick with no choice (or an invalid one) grants nothing — open-changes posture, never a guessed default", () => {
    expect(chainedWith(20, [{ id: "resistance" }]).defenses).toBeUndefined();
    expect(chainedWith(20, [{ id: "immunity", choice: "not-an-energy" }]).defenses).toBeUndefined();
    expect(
      chainedWith(20, [{ id: "damage-reduction", choice: "not-an-alignment" }]).defenses,
    ).toBeUndefined();
  });

  it("an unchained eidolon with no subtype set resolves the same three evolutions identically to the chained branch", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 10,
      eidolon: {
        baseForm: "biped",
        name: "Zeph",
        evolutions: [
          { id: "resistance", choice: "fire" },
          { id: "immunity", choice: "cold" },
          { id: "damage-reduction", choice: "chaotic" },
        ],
      },
    });
    const defenses = deriveEidolon(doc, buildRollData(doc, ref))!.defenses;
    expect(defenses).toEqual({
      resistances: [{ energy: "fire", amount: 15 }],
      damageImmunities: ["cold"],
      effectImmunities: [],
      dr: [{ amount: 5, bypass: "chaotic" }],
    });
  });

  /**
   * Stacking against a real unchained subtype's own grants (Angel:
   * aonprd.com "Subtypes - Eidolon (Unchained)" — 4th "electricity
   * resistance 10 and fire resistance 10" is a FLAT, non-scaling grant).
   * `foldEidolonGrantDefenses` takes the highest amount per energy across
   * BOTH sources (same rule PF1 uses for same-type energy resistance:
   * it doesn't stack, only the better value applies) — never a sum.
   */
  it("a same-energy Resistance pick and a subtype's flat resistance grant: highest wins, not a sum", () => {
    function angelWith(level: number, evolutions: { id: string; choice?: string }[]) {
      const doc = makeDoc({
        classTag: "summonerUnchained",
        level,
        eidolon: { baseForm: "biped", subtype: "angel", name: "Seraph", evolutions },
      });
      return deriveEidolon(doc, buildRollData(doc, ref))!.defenses;
    }

    // At 7th, the evolution's own scaled amount (10, per the 5/10/15
    // schedule) ties the subtype's flat 10 — same result either way.
    // At 10th the evolution's schedule has grown past the subtype's flat
    // value (15 > 10), so the merged line reads 15, not 10 and not 25.
    const electricityAt10 = angelWith(10, [
      { id: "resistance", choice: "electricity" },
    ])?.resistances.find((r) => r.energy === "electricity");
    expect(electricityAt10).toEqual({ energy: "electricity", amount: 15 });

    // Below 10th, the subtype's flat grant is still the better value, so
    // the evolution's smaller scaled amount never overrides it downward.
    const electricityAt4 = angelWith(4, [
      { id: "resistance", choice: "electricity" },
    ])?.resistances.find((r) => r.energy === "electricity");
    expect(electricityAt4).toEqual({ energy: "electricity", amount: 10 });
  });

  it("a Damage Reduction pick with a DIFFERENT bypass than the subtype's own DR grant surfaces as a second line", () => {
    const doc = makeDoc({
      classTag: "summonerUnchained",
      level: 12,
      eidolon: {
        baseForm: "biped",
        subtype: "angel",
        name: "Seraph",
        // Angel's own 12th-level grant is DR 5/evil; this pick adds a
        // second, independent DR line rather than merging into it.
        evolutions: [{ id: "damage-reduction", choice: "good" }],
      },
    });
    const defenses = deriveEidolon(doc, buildRollData(doc, ref))!.defenses;
    // Ordering is by ascending grant level (see `foldEidolonGrantDefenses`'s
    // doc comment); the evolution pick is always "unlocked" at level 0, so
    // it sorts before the subtype's own 12th-level grant.
    expect(defenses?.dr).toEqual([
      { amount: 5, bypass: "good" },
      { amount: 5, bypass: "evil" },
    ]);
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
