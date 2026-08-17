/**
 * Hand-computed fixtures for `ARCHETYPE_SLA_GRANTS_NZ` (classes ninja–wizard).
 * Drift guards (spell resolution, slug shape, metering-shape exclusivity,
 * archetype-feature id resolution) live in `spellLikeAbilities.test.ts` and
 * cover this table too; these fixtures check the actual computed rows
 * against the published archetype text.
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

const HUMAN = raceId("Human");

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: [{ tag: "rogue", level: 1 }] },
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

function slasFor(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return sheet.spellLikeAbilities ?? [];
}

describe("spiritualist involutionist: Involuate (animate objects)", () => {
  // Occult Adventures p.? — "she gains the ability to cast animate objects as
  // a spell-like ability once per day (CL = her character level)... At 15th
  // and 19th levels, she can use this ability one additional time per day."
  it("resolves at 11th level with CL = total character level, not just spiritualist level", () => {
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: HUMAN,
        classes: [
          { tag: "spiritualist", level: 11 },
          { tag: "fighter", level: 2 },
        ],
      },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["spiritualist:involutionist"],
      },
    });
    const slas = slasFor(doc);
    const involuate = slas.find(
      (s) => s.id === "sla:spiritualist:involutionist:involuate:11:involuate",
    );
    expect(involuate).toBeDefined();
    expect(involuate?.name).toBe("Animate Objects");
    expect(involuate?.casterLevel).toBe(13); // 11 + 2, total HD
    expect(involuate?.frequency).toBe("perDay");
  });

  it("gains a second daily use at 15th level, none below 11th, and none without the archetype", () => {
    const at15 = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "spiritualist", level: 15 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["spiritualist:involutionist"],
      },
    });
    const pools = deriveResourcePools(at15, ref);
    const pool = pools.find(
      (p) => p.id === "sla:spiritualist:involutionist:involuate:11:involuate",
    );
    expect(pool?.max).toBe(2);

    const at10 = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "spiritualist", level: 10 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["spiritualist:involutionist"],
      },
    });
    expect(
      slasFor(at10).find((s) => s.id === "sla:spiritualist:involutionist:involuate:11:involuate"),
    ).toBeUndefined();

    const noArchetype = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "spiritualist", level: 11 }] },
    });
    expect(
      slasFor(noArchetype).find(
        (s) => s.id === "sla:spiritualist:involutionist:involuate:11:involuate",
      ),
    ).toBeUndefined();
  });
});

describe("shifter swarm-shifter: Final Aspect (swarm skin)", () => {
  // "she can cast swarm skin as a spell-like ability at will with a caster
  // level equal to her character level" — an explicit character-level (not
  // class-level) caster-level override.
  it("is at will with CL = total character level across a multiclass build", () => {
    const doc = baseDoc({
      identity: {
        name: "Test",
        race: HUMAN,
        classes: [
          { tag: "shifter", level: 20 },
          { tag: "fighter", level: 3 },
        ],
      },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["shifter:swarm-shifter"],
      },
    });
    const slas = slasFor(doc);
    const finalAspect = slas.find(
      (s) => s.id === "sla:shifter:swarm-shifter:final-aspect:20:final-aspect",
    );
    expect(finalAspect?.name).toBe("Swarm Skin");
    expect(finalAspect?.frequency).toBe("atWill");
    expect(finalAspect?.casterLevel).toBe(23);
  });
});

describe("ranger urban-ranger: Invisibility Trick (greater invisibility)", () => {
  // "She can use this spell-like ability a number of times per day equal to
  // her Wisdom modifier (minimum 1)."
  it("meters uses by Wisdom modifier, self only", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "ranger", level: 17 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["ranger:urban-ranger"],
      },
    });
    const slas = slasFor(doc);
    const trick = slas.find(
      (s) => s.id === "sla:ranger:urban-ranger:invisibility-trick:17:invisibility-trick",
    );
    expect(trick?.name).toBe("Greater Invisibility (self)");
    expect(trick?.spellId).toBeDefined();
    expect(ref.spells[trick!.spellId!]?.name).toBe("Invisibility, Greater");
    const pool = deriveResourcePools(doc, ref).find(
      (p) => p.id === "sla:ranger:urban-ranger:invisibility-trick:17:invisibility-trick",
    );
    expect(pool?.max).toBe(2); // Wis 14 -> +2 mod
  });

  it("floors at a minimum of 1 use even with a negative Wisdom modifier", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "ranger", level: 17 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 6, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["ranger:urban-ranger"],
      },
    });
    const pool = deriveResourcePools(doc, ref).find(
      (p) => p.id === "sla:ranger:urban-ranger:invisibility-trick:17:invisibility-trick",
    );
    expect(pool?.max).toBe(1);
  });
});

describe("rogue kitsune trickster: Kitsune's Charm (charm person)", () => {
  // "caster level equal to her rogue level - 2 ... At 6th level, and every
  // three levels thereafter, the kitsune trickster gains an additional daily
  // use of this ability."
  it("CL trails rogue level by 2, one use at the 3rd-level gate", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "rogue", level: 3 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["rogue:kitsune-trickster"],
      },
    });
    const slas = slasFor(doc);
    const charm = slas.find(
      (s) => s.id === "sla:rogue:kitsune-trickster:kitsune-s-charm:3:kitsune-s-charm",
    );
    expect(charm?.name).toBe("Charm Person");
    expect(charm?.casterLevel).toBe(1); // 3 - 2
  });

  it("gains additional daily uses every 3 levels starting at 6th", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "rogue", level: 9 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["rogue:kitsune-trickster"],
      },
    });
    const pool = deriveResourcePools(doc, ref).find(
      (p) => p.id === "sla:rogue:kitsune-trickster:kitsune-s-charm:3:kitsune-s-charm",
    );
    // 1 base + floor((9-3)/3) = 1 + 2 = 3
    expect(pool?.max).toBe(3);
  });
});

describe("oracle cyclopean seer: Final Revelation (three named spells)", () => {
  // "You can use each of the following once per day as a spell-like ability:
  // discern location, prying eyes, and stone tell."
  it("grants all three as separate 1/day rows at 20th level", () => {
    const doc = baseDoc({
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "oracle", level: 20 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        archetypes: ["oracle:cyclopean-seer"],
      },
    });
    const slas = slasFor(doc);
    const names = slas
      .filter((s) => s.id.startsWith("sla:oracle:cyclopean-seer:final-revelation:20:"))
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(["Discern Location", "Prying Eyes", "Stone Tell"]);
    for (const sla of slas) {
      if (sla.id.startsWith("sla:oracle:cyclopean-seer:final-revelation:20:")) {
        expect(sla.frequency).toBe("perDay");
        expect(sla.casterLevel).toBe(20);
      }
    }
  });
});

describe("rogue shadow scion: Shadow Speaker (functions as commune with nature)", () => {
  // "functions as commune with nature ... once per day at 14th level and
  // twice per day at 19th level" — real spell reflavored by trigger/scope,
  // in scope per the "functions as the spell X" rule.
  it("is one use per day at 14th level and two at 19th, for both rogue and rogueUnchained", () => {
    for (const tag of ["rogue", "rogueUnchained"] as const) {
      const at14 = baseDoc({
        identity: { name: "Test", race: HUMAN, classes: [{ tag, level: 14 }] },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [`${tag}:shadow-scion`],
        },
      });
      const pool14 = deriveResourcePools(at14, ref).find(
        (p) => p.id === `sla:${tag}:shadow-scion:shadow-speaker:14:shadow-speaker`,
      );
      expect(pool14?.max, `${tag} at 14th`).toBe(1);

      const at19 = baseDoc({
        identity: { name: "Test", race: HUMAN, classes: [{ tag, level: 19 }] },
        build: {
          feats: [],
          skillRanks: {},
          classFeatureChoices: [],
          spells: { known: [] },
          gear: [],
          archetypes: [`${tag}:shadow-scion`],
        },
      });
      const pool19 = deriveResourcePools(at19, ref).find(
        (p) => p.id === `sla:${tag}:shadow-scion:shadow-speaker:14:shadow-speaker`,
      );
      expect(pool19?.max, `${tag} at 19th`).toBe(2);
    }
  });
});
