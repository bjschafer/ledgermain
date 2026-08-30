/**
 * Fixture tests for the class-feature/domain/inquisition-power shard of the
 * spell-like-ability grant tables (`spell-like-abilities/class-features.ts`).
 * Six representative wirings, hand-computed against the published text and
 * cross-checked against the vendored `class-features.json` description each
 * def is authored from.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, deriveSpellLikeAbilities } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "sla-class-features-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 14, cha: 12 },
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

function slasFor(doc: CharacterDoc) {
  return compute(doc, ref).spellLikeAbilities ?? [];
}

describe("Inquisitor, Discern Lies (5th): attaches to the vendored pool", () => {
  // Vendored uses.maxFormula is "@class.unlevel" (rounds/day equal to
  // inquisitor level) — no synthetic pool, the row rides that pool directly.
  it("inquisitor 8: Discern Lies at CL 8, pool max 8, poolId equal to the feature id", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "inquisitor", level: 8 }] },
    });
    const slas = slasFor(doc);
    const discernLies = slas.find((s) => s.id === "sla:S9lYCsz7oA7v3GzR:discern-lies");
    expect(discernLies).toBeDefined();
    expect(discernLies?.name).toBe("Discern Lies");
    expect(discernLies?.casterLevel).toBe(8);
    expect(discernLies?.frequency).toBe("perDay");
    expect(discernLies?.poolId).toBe("S9lYCsz7oA7v3GzR");
    const pools = deriveResourcePools(doc, ref);
    expect(pools.find((p) => p.id === "S9lYCsz7oA7v3GzR")?.max).toBe(8);
  });
});

describe("Paladin, Detect Evil (1st): at-will, no pool", () => {
  // CRB: "At will, a paladin can use Detect Evil, as the spell."
  it("paladin 3: at-will Detect Evil, CL 3, no poolId", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "paladin", level: 3 }] },
    });
    const slas = slasFor(doc);
    const detectEvil = slas.find((s) => s.id === "sla:2YqtYAfLcV7KWkpJ:detect-evil");
    expect(detectEvil).toBeDefined();
    expect(detectEvil?.frequency).toBe("atWill");
    expect(detectEvil?.casterLevel).toBe(3);
    expect(detectEvil?.poolId).toBeUndefined();
  });
});

describe("Lantern Bearer, Lantern Arcana (1st): a tiered SLA list gated by minLevel", () => {
  // Each tier's use count is 1/day when gained, +1 every 2 class levels
  // after: floor((level - tierLevel) / 2) + 1. At 8th level: the "at will"
  // tier is unmetered; 1st-tier gained at 1st -> floor((8-1)/2)+1 = 4; 3rd
  // tier gained at 3rd -> floor((8-3)/2)+1 = 3; 5th tier gained at 5th ->
  // floor((8-5)/2)+1 = 2; 7th tier gained at 7th -> floor((8-7)/2)+1 = 1.
  it("lantern bearer 8: all five tiers present with the published use counts", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "lanternBearer", level: 8 }] },
    });
    const slas = slasFor(doc);
    const byId = new Map(slas.map((s) => [s.id, s]));

    const dancingLights = byId.get("sla:rJ8E3SxHrK2PR5S8:dancing-lights");
    expect(dancingLights?.frequency).toBe("atWill");
    expect(dancingLights?.casterLevel).toBe(8);
    // CL and DC ability are both overridden by the published text: character
    // level (not lantern bearer level) and Intelligence (not the family default
    // of Charisma).
    expect(dancingLights?.abilityMod).toBe(3); // Int 16 -> +3

    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:faerie-fire")).toBeDefined();
    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:darkvision")).toBeDefined();
    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:continual-flame")).toBeDefined();
    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:daylight")).toBeDefined();
    // Continual Flame is pinned to spell level 3 by the published text
    // (its natural sor/wiz level is 2); Heightened Daylight to level 4.
    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:continual-flame")?.spellLevel).toBe(3);
    expect(byId.get("sla:rJ8E3SxHrK2PR5S8:daylight")?.spellLevel).toBe(4);

    const pools = deriveResourcePools(doc, ref);
    const maxOf = (slug: string) => pools.find((p) => p.id === `sla:rJ8E3SxHrK2PR5S8:${slug}`)?.max;
    expect(maxOf("faerie-fire")).toBe(4);
    expect(maxOf("darkvision")).toBe(3);
    expect(maxOf("continual-flame")).toBe(2);
    expect(maxOf("daylight")).toBe(1);
  });

  it("lantern bearer 4: the 5th- and 7th-level tiers haven't been gained yet", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "lanternBearer", level: 4 }] },
    });
    const ids = new Set(slasFor(doc).map((s) => s.id));
    expect(ids.has("sla:rJ8E3SxHrK2PR5S8:faerie-fire")).toBe(true);
    expect(ids.has("sla:rJ8E3SxHrK2PR5S8:darkvision")).toBe(true);
    expect(ids.has("sla:rJ8E3SxHrK2PR5S8:continual-flame")).toBe(false);
    expect(ids.has("sla:rJ8E3SxHrK2PR5S8:daylight")).toBe(false);
  });
});

describe("Cleric domain granted power, Lightning Lord (Weather domain, 8th): a granted-power case reached via a domain choice", () => {
  // APG Weather domain: "you can call down a number of bolts of lightning
  // per day equal to your cleric level ... this ability otherwise functions
  // as call lightning." Vendored uses.maxFormula carries the cleric-level
  // budget, so the def attaches instead of restating it.
  function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "cleric", level }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains,
      },
    });
  }

  it("cleric 8 with the Weather domain: Call Lightning at CL 8, pool max 8", () => {
    const doc = makeCleric(8, ["Weather"]);
    const slas = slasFor(doc);
    const lightningLord = slas.find((s) => s.id === "sla:FZdWscHJvJpGPoDz:call-lightning");
    expect(lightningLord).toBeDefined();
    expect(lightningLord?.name).toBe("Call Lightning");
    expect(lightningLord?.casterLevel).toBe(8);
    expect(lightningLord?.poolId).toBe("FZdWscHJvJpGPoDz");
    expect(deriveResourcePools(doc, ref).find((p) => p.id === "FZdWscHJvJpGPoDz")?.max).toBe(8);
  });

  it("cleric 8 WITHOUT the Weather domain: nothing derives", () => {
    const doc = makeCleric(8, ["Protection"]);
    expect(slasFor(doc).some((s) => s.id === "sla:FZdWscHJvJpGPoDz:call-lightning")).toBe(false);
  });
});

describe("Inquisition granted power, Awaken Discontent (Reformation, 8th): a formula-metered enemy-facing grant", () => {
  // "you can deliver a stirring speech ... causing the target ... to be
  // affected by charm person with a caster level equal to your inquisitor
  // level and a save DC of 10 + 1/2 your inquisitor level + your Wisdom
  // modifier. You may use this ability a number of times per day equal to
  // your Wisdom modifier." No vendored uses block, so a formula-metered def;
  // DC ability is explicitly Wisdom, not the family's Charisma default.
  function makeInquisitor(level: number, inquisition: string): CharacterDoc {
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "inquisitor", level }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        inquisition,
      },
    });
  }

  it("inquisitor 8 with the Reformation inquisition (Wis 14, +2 mod): Charm Person, 2/day, DC ability Wisdom", () => {
    const doc = makeInquisitor(8, "reformation");
    const slas = slasFor(doc);
    const awaken = slas.find(
      (s) => s.id === "sla:inquisition-power:reformation:awaken-discontent:charm-person",
    );
    expect(awaken).toBeDefined();
    expect(awaken?.name).toBe("Charm Person");
    expect(awaken?.casterLevel).toBe(8);
    expect(awaken?.abilityMod).toBe(2); // Wis 14 -> +2
    const pools = deriveResourcePools(doc, ref);
    expect(pools.find((p) => p.id === awaken?.poolId)?.max).toBe(2);
  });

  it("inquisitor 8 with a DIFFERENT inquisition: nothing derives", () => {
    const doc = makeInquisitor(8, "fate");
    expect(
      slasFor(doc).some(
        (s) => s.id === "sla:inquisition-power:reformation:awaken-discontent:charm-person",
      ),
    ).toBe(false);
  });
});

describe("Souldrinker, Enervation (2nd): tiered per-day formula scaling by class level, CL overridden to character level", () => {
  // "At 2nd level, a souldrinker can cast enervation twice per day ... At
  // 5th level, four times per day, and at 8th level, six times per day (CL =
  // her character level)."
  function makeSouldrinker(level: number): CharacterDoc {
    return baseDoc({
      identity: {
        name: "Test",
        race: HUMAN,
        classes: [
          { tag: "souldrinker", level },
          { tag: "fighter", level: 2 },
        ],
      },
    });
  }

  it("2/day at 2nd level, CL = total character level (souldrinker + fighter)", () => {
    const doc = makeSouldrinker(2);
    const pools = deriveResourcePools(doc, ref);
    const enervation = slasFor(doc).find((s) => s.id === "sla:mMt5L8PmgkhviG3G:enervation");
    expect(enervation?.casterLevel).toBe(4); // 2 souldrinker + 2 fighter
    expect(pools.find((p) => p.id === "sla:mMt5L8PmgkhviG3G:enervation")?.max).toBe(2);
  });

  it("4/day at 5th level", () => {
    const pools = deriveResourcePools(makeSouldrinker(5), ref);
    expect(pools.find((p) => p.id === "sla:mMt5L8PmgkhviG3G:enervation")?.max).toBe(4);
  });

  it("6/day at 8th level", () => {
    const pools = deriveResourcePools(makeSouldrinker(8), ref);
    expect(pools.find((p) => p.id === "sla:mMt5L8PmgkhviG3G:enervation")?.max).toBe(6);
  });
});

describe("Stargazer Sidereal Arcana: deliberately left unwired (auto-listed choice, no pick-tracking)", () => {
  // Regression guard for the near-miss this wave caught: all twelve arcana
  // (Arcana: The Rider at 4th) are vendored as automatic grants on every
  // stargazer, so wiring either would have handed every stargazer a free
  // phantom steed / cultural adaptation regardless of which arcanum they
  // actually picked.
  it("stargazer 4 gets neither Phantom Steed nor Cultural Adaptation", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "stargazer", level: 4 }] },
    });
    const names = slasFor(doc).map((s) => s.name);
    expect(names).not.toContain("Phantom Steed");
    expect(names).not.toContain("Cultural Adaptation");
  });
});

describe("Exalted, Ardent Vision (8th): choice-gated at-will detect chaos/evil/good/law", () => {
  // Pathfinder Player Companion: Faiths of Corruption p. 200: "the exalted
  // ... gains the ability to cast detect chaos/evil/good/law at will, with a
  // caster level equal to her character level. The exalted must choose one
  // alignment to detect that is opposed to her alignment ... once this
  // choice is made it can't be changed." Four options, one def each, gated
  // by `when` on `classFeature:lRmf8xptuEyiZ8o5`.
  function makeExalted(level: number, pickChoices?: Record<string, string>): CharacterDoc {
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "exalted", level }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        pickChoices,
      },
    });
  }

  it("no stored pick: nothing granted", () => {
    const slas = slasFor(makeExalted(8));
    expect(slas.some((s) => s.id.startsWith("sla:lRmf8xptuEyiZ8o5:"))).toBe(false);
  });

  it("a stale option id grants nothing", () => {
    const slas = slasFor(makeExalted(8, { "classFeature:lRmf8xptuEyiZ8o5": "bogus" }));
    expect(slas.some((s) => s.id.startsWith("sla:lRmf8xptuEyiZ8o5:"))).toBe(false);
  });

  it("'evil' pick: only Detect Evil grants, at will, caster level = character level", () => {
    const doc = makeExalted(8, { "classFeature:lRmf8xptuEyiZ8o5": "evil" });
    const own = slasFor(doc).filter((s) => s.id.startsWith("sla:lRmf8xptuEyiZ8o5:"));
    expect(own).toHaveLength(1);
    expect(own[0]?.name).toBe("Detect Evil");
    expect(own[0]?.frequency).toBe("atWill");
    expect(own[0]?.casterLevel).toBe(8); // @attributes.hd.total override, not @class.unlevel
    expect(own[0]?.poolId).toBeUndefined();
  });

  it("'law' pick: only Detect Law grants", () => {
    const doc = makeExalted(8, { "classFeature:lRmf8xptuEyiZ8o5": "law" });
    const own = slasFor(doc).filter((s) => s.id.startsWith("sla:lRmf8xptuEyiZ8o5:"));
    expect(own).toHaveLength(1);
    expect(own[0]?.name).toBe("Detect Law");
  });
});

describe("Pure Legion Enforcer, Aura Sense (1st): choice-gated at-will detect chaos/evil/good/law", () => {
  // Pathfinder Player Companion: Faiths of Corruption p. 32: "A Pure Legion
  // enforcer can cast detect chaos/evil/good/law at will as a spell-like
  // ability, though he can detect only auras of moderate or higher power. He
  // can detect only one type of aura at any given time." No caster level is
  // stated, so it defaults to the granting class's own level.
  function makeEnforcer(level: number, pickChoices?: Record<string, string>): CharacterDoc {
    return baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "pureLegionEnforcer", level }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        pickChoices,
      },
    });
  }

  it("no stored pick: nothing granted", () => {
    const slas = slasFor(makeEnforcer(3));
    expect(slas.some((s) => s.id.startsWith("sla:c61UW4qjDBxLEBaK:"))).toBe(false);
  });

  it("'chaos' pick: only Detect Chaos grants, at will, caster level = granting class level", () => {
    const doc = makeEnforcer(3, { "classFeature:c61UW4qjDBxLEBaK": "chaos" });
    const own = slasFor(doc).filter((s) => s.id.startsWith("sla:c61UW4qjDBxLEBaK:"));
    expect(own).toHaveLength(1);
    expect(own[0]?.name).toBe("Detect Chaos");
    expect(own[0]?.frequency).toBe("atWill");
    expect(own[0]?.casterLevel).toBe(3);
    expect(own[0]?.note).toContain("moderate");
  });
});

describe("deriveSpellLikeAbilities matches compute()'s spellLikeAbilities for a mixed case", () => {
  it("inquisitor 8 with the Reformation inquisition and the Weather domain slot unused", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "inquisitor", level: 8 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        inquisition: "reformation",
      },
    });
    expect(deriveSpellLikeAbilities(doc, ref)).toEqual(slasFor(doc));
  });
});
