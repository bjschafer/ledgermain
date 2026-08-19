/**
 * Fixtures for `derivePcNaturalAttacks` (`pc-natural-attacks/`) — the PC's
 * own body's natural-attack lines. Every math fact is cited against
 * `natural-attacks.ts`'s own doc comment (the primary/secondary rules it
 * quotes from aonprd.com's "Combat" chapter and the Universal Monster
 * Rules), the same source this module's math is built from.
 *
 * All source tables ship empty (a content wave fills them later), so every
 * fixture injects a synthetic `PcNaturalAttackTables` via the resolver's
 * table parameter rather than seeding real racial/class/archetype/feat data.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, ModifierComponent } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import type { CollectedModifier } from "../src/collect.js";
import { featNameSlug } from "../src/feat-effects.js";
import {
  derivePcNaturalAttacks,
  type PcNaturalAttackDef,
  type PcNaturalAttackTables,
} from "../src/index.js";
import { SIZE_AC_MOD } from "../src/tables.js";

const ref = loadRefData();

const emptyTables: PcNaturalAttackTables = {
  race: {},
  racialTrait: {},
  classFeature: {},
  archetypeFeature: {},
  feat: {},
};

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0]!;
}

const HUMAN = raceId("Human");

// A feat with no attack/damage effects of its own — a neutral "carrier" the
// fixtures grant to key a FEAT_NATURAL_ATTACKS entry off, distinct from the
// real Multiattack feat used by fixture (d).
const CARRIER_FEAT = Object.values(ref.feats).find((f) => f.name === "Glorious Heat")!;
const CARRIER_SLUG = featNameSlug(CARRIER_FEAT.name);
const MULTIATTACK_FEAT = Object.values(ref.feats).find((f) => f.name === "Multiattack")!;

function baseDoc(over: Partial<CharacterDoc> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: [{ tag: "fighter", level: 5 }] },
    abilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [CARRIER_FEAT.id],
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

interface CallOptions {
  bab?: number;
  strMod?: number;
  size?: "sm" | "med";
  collected?: CollectedModifier[];
  flatAttackPenaltyComponents?: ModifierComponent[];
  tables: PcNaturalAttackTables;
}

function attacksFor(doc: CharacterDoc, opts: CallOptions) {
  const size = opts.size ?? "med";
  return derivePcNaturalAttacks(
    doc,
    ref,
    opts.bab ?? 5,
    opts.strMod ?? 3,
    SIZE_AC_MOD[size],
    size,
    opts.collected ?? [],
    opts.flatAttackPenaltyComponents ?? [],
    opts.tables,
  );
}

describe("derivePcNaturalAttacks", () => {
  it("(a) bite + 2 claws all classify primary, each at full BAB and full Str damage", () => {
    // aonprd.com "Natural Attacks": several primary-type attack forms at
    // once (a bear's Bite + 2 Claws) are each made at full BAB/Str — the
    // classification is per KIND, never "one primary per routine".
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [
          {
            slug: "bear-form",
            attacks: [
              { name: "Bite", mediumDice: "1d6" },
              { name: "Claw", count: 2, mediumDice: "1d4" },
            ],
          },
        ],
      },
    };
    const attacks = attacksFor(baseDoc(), { bab: 5, strMod: 3, tables })!;
    expect(attacks).toHaveLength(2);
    for (const a of attacks) {
      expect(a.kind).toBe("primary");
      expect(a.attackBonus).toBe(8); // BAB 5 + Str 3
      expect(a.damageBonus).toBe(3); // full Str, no ×1.5 (total count 3, not 1)
    }
    const bite = attacks.find((a) => a.name === "Bite")!;
    expect(bite.count).toBe(1);
    expect(bite.damageDice).toBe("1d6");
    const claw = attacks.find((a) => a.name === "Claw")!;
    expect(claw.count).toBe(2);
  });

  it("(b) a mixed set with a secondary Tail Slap resolves at -5 to hit and half Str to damage", () => {
    // aonprd.com: secondary attacks use "base attack bonus minus 5" and
    // "only half your Strength modifier on damage rolls".
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [
          {
            slug: "tailed-form",
            attacks: [
              { name: "Bite", mediumDice: "1d6" },
              { name: "Tail Slap", mediumDice: "1d4" },
            ],
          },
        ],
      },
    };
    const attacks = attacksFor(baseDoc(), { bab: 5, strMod: 4, tables })!;
    const bite = attacks.find((a) => a.name === "Bite")!;
    const tail = attacks.find((a) => a.name === "Tail Slap")!;
    expect(bite.kind).toBe("primary");
    expect(bite.attackBonus).toBe(9); // 5 + 4
    expect(bite.damageBonus).toBe(4); // full Str
    expect(tail.kind).toBe("secondary");
    expect(tail.attackBonus).toBe(4); // 5 + 4 - 5
    expect(tail.damageBonus).toBe(2); // floor(4 / 2)
    // Provenance: the secondary penalty is visible as its own component.
    const penalty = tail.attackComponents.find((c) => c.source === "Secondary natural attack");
    expect(penalty?.value).toBe(-5);
  });

  it("(c) a single lone bite is always primary and adds 1.5x Str to damage", () => {
    // Universal Monster Rules: "If a creature has only one natural attack,
    // it is always made using the creature's full base attack bonus and
    // adds 1-1/2 times the Strength bonus."
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [{ slug: "lone-bite", attacks: [{ name: "Bite", mediumDice: "1d6" }] }],
      },
    };
    const attacks = attacksFor(baseDoc(), { bab: 5, strMod: 4, tables })!;
    expect(attacks).toHaveLength(1);
    const bite = attacks[0]!;
    expect(bite.kind).toBe("primary");
    expect(bite.attackBonus).toBe(9); // no secondary penalty
    expect(bite.damageBonus).toBe(6); // floor(4 * 1.5) = 6
  });

  it("(d) the Multiattack feat softens the secondary penalty from -5 to -2", () => {
    // aonprd.com Multiattack: "secondary attacks with natural weapons take
    // only a -2 penalty". A PC never gets this automatically (unlike a
    // companion/eidolon) — it only applies once the character has taken it.
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [
          {
            slug: "tailed-form",
            attacks: [
              { name: "Bite", mediumDice: "1d6" },
              { name: "Tail Slap", mediumDice: "1d4" },
            ],
          },
        ],
      },
    };
    const withoutFeat = attacksFor(baseDoc(), { bab: 5, strMod: 4, tables })!;
    expect(withoutFeat.find((a) => a.name === "Tail Slap")!.attackBonus).toBe(4); // -5

    const withMultiattack = attacksFor(
      baseDoc({
        build: {
          feats: [CARRIER_FEAT.id, MULTIATTACK_FEAT.id],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
        },
      }),
      { bab: 5, strMod: 4, tables },
    )!;
    expect(withMultiattack.find((a) => a.name === "Tail Slap")!.attackBonus).toBe(7); // -2
  });

  it("(e) an nattack-targeting Change folds into attack, ndamage folds into damage, with visible provenance", () => {
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [{ slug: "lone-bite", attacks: [{ name: "Bite", mediumDice: "1d6" }] }],
      },
    };
    const collected: CollectedModifier[] = [
      { target: "nattack", type: "enh", value: 2, source: "Test Nattack Buff" },
      { target: "ndamage", type: "enh", value: 3, source: "Test Ndamage Buff" },
    ];
    const attacks = attacksFor(baseDoc(), { bab: 5, strMod: 3, tables, collected })!;
    const bite = attacks[0]!;
    expect(bite.attackBonus).toBe(10); // BAB 5 + Str 3 + nattack 2
    // Lone bite -> ×1.5 Str rider: floor(3 * 1.5) = 4, plus the ndamage stack (+3).
    expect(bite.damageBonus).toBe(7);
    const nattackComp = bite.attackComponents.find((c) => c.source === "Test Nattack Buff");
    expect(nattackComp).toEqual({
      source: "Test Nattack Buff",
      type: "enh",
      value: 2,
      applied: true,
    });
    const ndamageComp = bite.damageComponents.find((c) => c.source === "Test Ndamage Buff");
    expect(ndamageComp).toEqual({
      source: "Test Ndamage Buff",
      type: "enh",
      value: 3,
      applied: true,
    });
  });

  it("(f) an active polymorph form suppresses the PC's own natural-attack lines entirely", () => {
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [{ slug: "lone-bite", attacks: [{ name: "Bite", mediumDice: "1d6" }] }],
      },
    };
    const doc = baseDoc({
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
        activeForm: { tier: "beastShapeI", creatureType: "animal", size: "med", formName: "Wolf" },
      },
    });
    expect(attacksFor(doc, { tables })).toBeUndefined();
  });

  it("(g) a Small-size character gets the mediumDice stepped down one size category", () => {
    // The dice string is authored assuming a Medium creature (CRB "Table:
    // Natural Attacks" convention); a Small effective size steps it down via
    // the same size/dice FAQ chart `compute.ts`'s weapon lines use.
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [{ slug: "lone-bite", attacks: [{ name: "Bite", mediumDice: "1d6" }] }],
      },
    };
    const attacks = attacksFor(baseDoc(), { bab: 5, strMod: 3, tables, size: "sm" })!;
    expect(attacks[0]!.damageDice).toBe("1d4");
  });

  it("(h) a requiredBuff gate: the line is absent until a matching active buff exists", () => {
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [
          {
            slug: "feral-claws",
            attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
            requiredBuff: { effectTags: ["feralMutagen"] },
          },
        ],
      },
    };
    expect(attacksFor(baseDoc(), { tables })).toBeUndefined();

    const buff: ActiveBuff = {
      instanceId: "b1",
      effectTag: "feralMutagen",
      name: "Feral Mutagen",
      changes: [],
    };
    const withBuff = baseDoc({
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [buff],
        resources: {},
      },
    });
    const attacks = attacksFor(withBuff, { tables })!;
    expect(attacks).toHaveLength(1);
    expect(attacks[0]!.name).toBe("Claw");
  });

  it("(i) minLevel/classTag gating with a level-scaled mediumDice function", () => {
    // Shifter-claws shape: dice grow with the granting class's level, and
    // the grant doesn't apply at all below its minLevel in that class.
    const def: PcNaturalAttackDef = {
      slug: "shifter-claws",
      classTag: "ranger",
      minLevel: 4,
      attacks: [
        {
          name: "Claw",
          count: 2,
          mediumDice: (classLevel) => (classLevel >= 8 ? "1d6" : "1d4"),
        },
      ],
    };
    const tables: PcNaturalAttackTables = { ...emptyTables, feat: { [CARRIER_SLUG]: [def] } };

    const belowMin = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "ranger", level: 3 }] },
    });
    expect(attacksFor(belowMin, { tables })).toBeUndefined();

    const atMin = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "ranger", level: 5 }] },
    });
    expect(attacksFor(atMin, { tables })![0]!.damageDice).toBe("1d4");

    const highLevel = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "ranger", level: 9 }] },
    });
    expect(attacksFor(highLevel, { tables })![0]!.damageDice).toBe("1d6");
  });
});
