/**
 * Fixtures for `FEAT_NATURAL_ATTACKS` (pc-natural-attacks/feats.ts) — the
 * feat-keyed grant shard — plus one fixture proving a promoted nattack/
 * ndamage `Change` (Mother's Gift's Hag Claws manifestation,
 * feat-effects-extracted-community.ts) folds correctly into a natural-attack
 * line's total. Math facts cited against natural-attacks.ts's own doc
 * comment, same as pcNaturalAttacks.test.ts; feat text cited against
 * aonprd.com during authoring (see feats.ts's own comments).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { featNameSlug } from "../src/feat-effects.js";
import {
  derivePcNaturalAttacks,
  FEAT_NATURAL_ATTACKS,
  PC_NATURAL_ATTACK_TABLES,
  type PcNaturalAttackTables,
} from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";
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

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0]!;
}

const HUMAN = raceId("Human");
const CHANGELING = raceId("Changeling");
const RAZORTUSK = featId("Razortusk");
const TAIL_TERROR = featId("Tail Terror");
const MOTHERS_GIFT = featId("Mother's Gift");
// A feat with no attack/damage effects of its own — a neutral "carrier" used
// to key a synthetic FEAT_NATURAL_ATTACKS entry, same convention as
// pcNaturalAttacks.test.ts.
const CARRIER_FEAT = featId("Glorious Heat");
const CARRIER_SLUG = featNameSlug("Glorious Heat");

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

describe("FEAT_NATURAL_ATTACKS: real feat-keyed grants", () => {
  it("Razortusk grants a Bite that is always secondary, even as the character's sole natural attack", () => {
    // aonprd.com Razortusk: "If used as part of a full attack action, the
    // bite is considered a secondary attack and is made at your full base
    // attack bonus -5, and adds half your Strength modifier to damage" — the
    // feat's own text overrides the general "sole natural attack is always
    // primary, ×1.5 Str" rule (Universal Monster Rules).
    const doc = baseDoc({ build: { ...baseDoc().build, feats: [RAZORTUSK] } });
    const attacks = derivePcNaturalAttacks(
      doc,
      ref,
      5,
      4,
      SIZE_AC_MOD.med,
      "med",
      [],
      [],
      PC_NATURAL_ATTACK_TABLES,
    )!;
    expect(attacks).toHaveLength(1);
    const bite = attacks[0]!;
    expect(bite.name).toBe("Bite");
    expect(bite.kind).toBe("secondary");
    expect(bite.damageDice).toBe("1d4");
    expect(bite.attackBonus).toBe(4); // BAB 5 + Str 4 - 5 (secondary penalty)
    expect(bite.damageBonus).toBe(2); // floor(4 / 2), half Str
  });

  it("Tail Terror grants a secondary Tail Slap for a kobold", () => {
    // aonprd.com Tail Terror: "This is a secondary natural attack that deals
    // 1d4 points of bludgeoning damage."
    const doc = baseDoc({
      identity: { name: "Test", race: raceId("Kobold"), classes: [{ tag: "rogue", level: 3 }] },
      build: { ...baseDoc().build, feats: [TAIL_TERROR] },
    });
    const attacks = derivePcNaturalAttacks(
      doc,
      ref,
      3,
      2,
      SIZE_AC_MOD.sm,
      "sm",
      [],
      [],
      PC_NATURAL_ATTACK_TABLES,
    )!;
    expect(attacks).toHaveLength(1);
    const tail = attacks[0]!;
    expect(tail.name).toBe("Tail Slap");
    expect(tail.kind).toBe("secondary");
    expect(tail.attackBonus).toBe(1); // BAB 3 + Str 2 + Size(sm) 1 - 5
  });

  it("FEAT_NATURAL_ATTACKS is keyed by the same name-slug convention as the rest of the feat tables", () => {
    expect(Object.keys(FEAT_NATURAL_ATTACKS).sort()).toEqual(["razortusk", "tail-terror"]);
  });
});

describe("Mother's Gift (Hag Claws): a promoted nattack/ndamage Change", () => {
  it("the hag-claws choice emits +1 nattack/+1 ndamage via the real collect() pipeline", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: CHANGELING, classes: [{ tag: "witch", level: 4 }] },
      build: {
        ...baseDoc().build,
        feats: [MOTHERS_GIFT],
        featChoices: { [MOTHERS_GIFT]: "hag-claws" },
      },
    });
    const collected = collectModifiers(doc, ref, buildRollData(doc, ref));
    const nattack = collected.find((m) => m.target === "nattack" && m.source === "Mother's Gift");
    const ndamage = collected.find((m) => m.target === "ndamage" && m.source === "Mother's Gift");
    expect(nattack?.value).toBe(1);
    expect(ndamage?.value).toBe(1);

    // The other two manifestations stay off when a different choice is stored.
    const toughDoc = baseDoc({
      identity: { name: "Test", race: CHANGELING, classes: [{ tag: "witch", level: 4 }] },
      build: {
        ...baseDoc().build,
        feats: [MOTHERS_GIFT],
        featChoices: { [MOTHERS_GIFT]: "surprisingly-tough" },
      },
    });
    const toughCollected = collectModifiers(toughDoc, ref, buildRollData(toughDoc, ref));
    expect(toughCollected.find((m) => m.target === "nattack")).toBeUndefined();
    expect(toughCollected.find((m) => m.target === "nac")).toBeDefined();
  });

  it("that Change folds into a natural-attack line's total with visible provenance", () => {
    // Hag Claws modifies an EXISTING claw line rather than granting one, so
    // the racial claws grant (owned by racial.ts, a different content shard)
    // is stood in here with a synthetic table, same posture as
    // pcNaturalAttacks.test.ts's own fixture (e).
    const doc = baseDoc({
      identity: { name: "Test", race: CHANGELING, classes: [{ tag: "witch", level: 4 }] },
      build: {
        ...baseDoc().build,
        feats: [CARRIER_FEAT, MOTHERS_GIFT],
        featChoices: { [MOTHERS_GIFT]: "hag-claws" },
      },
    });
    const collected = collectModifiers(doc, ref, buildRollData(doc, ref));
    const tables: PcNaturalAttackTables = {
      ...emptyTables,
      feat: {
        [CARRIER_SLUG]: [
          { slug: "changeling-claws", attacks: [{ name: "Claw", mediumDice: "1d4" }] },
        ],
      },
    };
    const attacks = derivePcNaturalAttacks(
      doc,
      ref,
      5,
      4,
      SIZE_AC_MOD.med,
      "med",
      collected,
      [],
      tables,
    )!;
    expect(attacks).toHaveLength(1);
    const claw = attacks[0]!;
    // Lone attack -> primary, ×1.5 Str: floor(4 * 1.5) = 6, plus Hag Claws' +1 ndamage.
    expect(claw.attackBonus).toBe(10); // BAB 5 + Str 4 + nattack 1
    expect(claw.damageBonus).toBe(7); // 6 + ndamage 1
    const attackProvenance = claw.attackComponents.find((c) => c.source === "Mother's Gift");
    expect(attackProvenance).toEqual({
      source: "Mother's Gift",
      sourceId: MOTHERS_GIFT,
      type: "untyped",
      value: 1,
      applied: true,
    });
    const damageProvenance = claw.damageComponents.find((c) => c.source === "Mother's Gift");
    expect(damageProvenance).toEqual({
      source: "Mother's Gift",
      sourceId: MOTHERS_GIFT,
      type: "untyped",
      value: 1,
      applied: true,
    });
  });
});
