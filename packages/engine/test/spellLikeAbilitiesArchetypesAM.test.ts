/**
 * Hand-computed fixtures for `ARCHETYPE_SLA_GRANTS_AM` (classes A-M). Each
 * case cites the published archetype-feature text the grant was wired from;
 * `spellLikeAbilities.test.ts` already covers the shared drift guards
 * (spell resolution, slug shape, no `attachToSourcePool` on archetype
 * features), so these fixtures focus on gating, caster level, and metering.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const human = raceId("Human");

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: human, classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

function withArchetype(classTag: string, level: number, archetypeId: string): CharacterDoc {
  return baseDoc({
    identity: { name: "Test", race: human, classes: [{ tag: classTag, level }] },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: [archetypeId],
    },
  });
}

function slasFor(doc: CharacterDoc) {
  return compute(doc, ref).spellLikeAbilities ?? [];
}

describe("archetype spell-like abilities (A-M shard)", () => {
  it("arcanist:occultist Planar Contact (7th): augury 1/day, contact other plane 1/week at CL = arcanist level", () => {
    // Villain Codex, Planar Contact: "an occultist can cast augury once per
    // day and contact other plane once per week, using her arcanist level
    // as her caster level."
    const slas = slasFor(withArchetype("arcanist", 7, "arcanist:occultist"));
    const ids = slas.map((s) => s.id).sort();
    expect(ids).toEqual([
      "sla:arcanist:occultist:planar-contact:7:augury",
      "sla:arcanist:occultist:planar-contact:7:contact-other-plane",
    ]);
    const augury = slas.find((s) => s.name === "Augury")!;
    const contact = slas.find((s) => s.name === "Contact Other Plane")!;
    expect(augury.casterLevel).toBe(7);
    expect(augury.frequency).toBe("perDay");
    expect(contact.casterLevel).toBe(7);
    expect(contact.frequency).toBe("perWeek");
    const pools = deriveResourcePools(withArchetype("arcanist", 7, "arcanist:occultist"), ref);
    expect(pools.find((p) => p.id === augury.id)?.max).toBe(1);
    expect(pools.find((p) => p.id === contact.id)?.max).toBe(1);

    // Below the feature's level, nothing derives.
    expect(slasFor(withArchetype("arcanist", 6, "arcanist:occultist"))).toEqual([]);
  });

  it("bard:animal-speaker Nature's Speaker (5th): speak with animals at will", () => {
    // Ultimate Magic, Nature's Speaker: "the bard can use speak with
    // animals at will on animals of his selected kinds."
    const slas = slasFor(withArchetype("bard", 5, "bard:animal-speaker"));
    expect(slas).toHaveLength(1);
    expect(slas[0]!.name).toBe("Speak with Animals");
    expect(slas[0]!.frequency).toBe("atWill");
    expect(slas[0]!.poolId).toBeUndefined();
  });

  it("cavalier:herald-squire Transcend Language (3rd): tongues 3/day at CL = cavalier level", () => {
    // Pathfinder Player Companion: Knights of the Inner Sea, Transcend
    // Language: "three times per day, a herald squire can cast tongues on
    // herself, using her herald squire level as her caster level."
    const doc = withArchetype("cavalier", 3, "cavalier:herald-squire");
    const slas = slasFor(doc);
    expect(slas).toHaveLength(1);
    expect(slas[0]!.name).toBe("Tongues");
    expect(slas[0]!.casterLevel).toBe(3);
    const pools = deriveResourcePools(doc, ref);
    expect(pools.find((p) => p.id === slas[0]!.id)?.max).toBe(3);
  });

  it("cavalier:hooded-knight Champion of the Roads (9th): dimension door scales 1/2/3 per day", () => {
    // Pathfinder Player Companion: Legacy of the First World, Champion of
    // the Roads: "once per day, plus one additional time for every 4 levels
    // beyond 9th, to a maximum of three times per day at 17th level."
    const maxAt = (level: number) => {
      const doc = withArchetype("cavalier", level, "cavalier:hooded-knight");
      const pools = deriveResourcePools(doc, ref);
      const slas = slasFor(doc);
      expect(slas).toHaveLength(1);
      return pools.find((p) => p.id === slas[0]!.id)?.max;
    };
    expect(maxAt(9)).toBe(1);
    expect(maxAt(12)).toBe(1);
    expect(maxAt(13)).toBe(2);
    expect(maxAt(16)).toBe(2);
    expect(maxAt(17)).toBe(3);
    expect(maxAt(20)).toBe(3);
  });

  it("cleric:fiendish-vessel Fiendish Familiar: augury at 3rd, divination unlocks at 9th and scales to 3/day at 13th", () => {
    // Advanced Race Guide (tiefling), Fiendish Familiar: "Fiendish Augury
    // ... acts like the augury spell ... once per day" (3rd); "Fiendish
    // Divination ... acts like the divination spell ... once per day"
    // (9th); "Extra Divination ... use fiendish divination up to 3 times
    // per day" (13th).
    const at3 = withArchetype("cleric", 3, "cleric:fiendish-vessel");
    const slas3 = slasFor(at3);
    expect(slas3.map((s) => s.name)).toEqual(["Fiendish Augury"]);
    expect(slas3[0]!.spellId).toBeDefined();
    expect(ref.spells[slas3[0]!.spellId!]?.name).toBe("Augury");

    const at9 = withArchetype("cleric", 9, "cleric:fiendish-vessel");
    const slas9 = slasFor(at9);
    expect(slas9.map((s) => s.name).sort()).toEqual(["Fiendish Augury", "Fiendish Divination"]);
    const divination9 = slas9.find((s) => s.name === "Fiendish Divination")!;
    expect(ref.spells[divination9.spellId!]?.name).toBe("Divination");
    expect(deriveResourcePools(at9, ref).find((p) => p.id === divination9.id)?.max).toBe(1);

    const at13 = withArchetype("cleric", 13, "cleric:fiendish-vessel");
    const divination13 = slasFor(at13).find((s) => s.name === "Fiendish Divination")!;
    expect(deriveResourcePools(at13, ref).find((p) => p.id === divination13.id)?.max).toBe(3);
  });

  it("monkUnchained:brazen-disciple Genie Apotheosis (20th): limited wish 1/day at fixed CL 20", () => {
    // Genie Apotheosis: "Once per day, the brazen disciple can grant a
    // limited wish (as per the spell limited wish) to a non-outsider as a
    // spell-like ability (CL 20th)."
    const doc = withArchetype("monkUnchained", 20, "monkUnchained:brazen-disciple");
    const slas = slasFor(doc);
    expect(slas).toHaveLength(1);
    expect(slas[0]!.name).toBe("Limited Wish");
    expect(slas[0]!.casterLevel).toBe(20);
    expect(deriveResourcePools(doc, ref).find((p) => p.id === slas[0]!.id)?.max).toBe(1);
  });
});
