import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 (rogue wave): hand-computed fixture tests for
 * `archetype-extracted/rogue.ts`, same posture as the fighter pilot's
 * `archetypeEffectsExtracted.test.ts` — derived straight from the published
 * PF1 rules cited (as `provenance`) in each extracted entry.
 */
const ref = loadRefData();

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITIES = { str: 12, dex: 14, con: 12, int: 16, wis: 10, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  gear?: CharacterDoc["build"]["gear"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Discretion Specialist (rogue): Fast Talker grants an unconditional Bluff/Diplomacy/Intimidate bonus", () => {
  const archetype = archetypeId("Discretion Specialist");

  it("+2 at L4 (max(1, floor(level/2)))", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 4 }], archetypes: [archetype] }),
      ref,
    );
    expect(sheet.skills["blf"]?.components.find((c) => c.source === "Fast Talker")?.value).toBe(2);
    expect(sheet.skills["dip"]?.components.find((c) => c.source === "Fast Talker")?.value).toBe(2);
    expect(sheet.skills["int"]?.components.find((c) => c.source === "Fast Talker")?.value).toBe(2);
  });

  it("floors to the minimum of +1 at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 1 }], archetypes: [archetype] }),
      ref,
    );
    expect(sheet.skills["blf"]?.components.find((c) => c.source === "Fast Talker")?.value).toBe(1);
  });
});

describe("Kitsune Trickster (rogue): Kitsune's Guile adds Int modifier to four skills", () => {
  const archetype = archetypeId("Kitsune Trickster");

  it("+3 (Int 16 -> +3 mod) on Bluff/Diplomacy/Disguise/Sense Motive", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 1 }], archetypes: [archetype] }),
      ref,
    );
    for (const skill of ["blf", "dip", "dis", "sen"]) {
      expect(
        sheet.skills[skill]?.components.find((c) => c.source === "Kitsune's Guile")?.value,
      ).toBe(3);
    }
  });
});

describe("Sczarni Swindler (rogue): No Fool grants a capped Will save bonus", () => {
  const archetype = archetypeId("Sczarni Swindler");

  it("+1 at L4, caps at +5 by L20", () => {
    const at4 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 4 }], archetypes: [archetype] }),
      ref,
    );
    const base4 = compute(makeDoc({ classes: [{ tag: "rogue", level: 4 }] }), ref);
    expect(at4.saves.will.total - base4.saves.will.total).toBe(1);

    const at20 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 20 }], archetypes: [archetype] }),
      ref,
    );
    const base20 = compute(makeDoc({ classes: [{ tag: "rogue", level: 20 }] }), ref);
    expect(at20.saves.will.total - base20.saves.will.total).toBe(5);
  });
});

describe("Sharper (rogue): Lucky Save grants a stepped luck bonus on all saving throws", () => {
  const archetype = archetypeId("Sharper");

  it("+1 at L3, +2 at L9, +3 at L15", () => {
    const at3 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 3 }], archetypes: [archetype] }),
      ref,
    );
    const base3 = compute(makeDoc({ classes: [{ tag: "rogue", level: 3 }] }), ref);
    expect(at3.saves.fort.total - base3.saves.fort.total).toBe(1);
    expect(at3.saves.ref.total - base3.saves.ref.total).toBe(1);
    expect(at3.saves.will.total - base3.saves.will.total).toBe(1);

    const at9 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 9 }], archetypes: [archetype] }),
      ref,
    );
    const base9 = compute(makeDoc({ classes: [{ tag: "rogue", level: 9 }] }), ref);
    expect(at9.saves.fort.total - base9.saves.fort.total).toBe(2);

    const at15 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 15 }], archetypes: [archetype] }),
      ref,
    );
    const base15 = compute(makeDoc({ classes: [{ tag: "rogue", level: 15 }] }), ref);
    expect(at15.saves.fort.total - base15.saves.fort.total).toBe(3);
  });
});

describe("Sylvan Trickster (rogue): Fey Resistance grants scaling, capped DR/cold iron", () => {
  const archetype = archetypeId("Sylvan Trickster");

  it("DR 2/cold iron at L8", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 8 }], archetypes: [archetype] }),
      ref,
    );
    expect(sheet.defenses?.dr).toEqual([
      {
        total: 2,
        qualifier: "cold-iron",
        components: [
          {
            source: "Fey Resistance",
            sourceId: expect.any(String),
            type: "untyped",
            value: 2,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("caps at DR 10/cold iron by L20", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 20 }], archetypes: [archetype] }),
      ref,
    );
    expect(sheet.defenses?.dr?.[0]?.total).toBe(10);
  });
});

describe("River Rat (rogue): Swamper grants an armor-gated Swim bonus", () => {
  const archetype = archetypeId("River Rat");

  it("+2 Swim at L4 while unarmored", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 4 }], archetypes: [archetype] }),
      ref,
    );
    expect(sheet.skills["swm"]?.components.find((c) => c.source === "Swamper")?.value).toBe(2);
  });

  it("nothing while wearing medium+ armor", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "rogue", level: 4 }],
        archetypes: [archetype],
        gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
      }),
      ref,
    );
    expect(
      sheet.skills["swm"]?.components.find((c) => c.source === "Swamper" && c.value !== 0),
    ).toBeUndefined();
  });
});

describe("Sanctified Rogue (rogue): Divine Purpose grants a flat sacred Fortitude/Will bonus", () => {
  const archetype = archetypeId("Sanctified Rogue");

  it("+1 sacred on both saves, no further scaling", () => {
    const at4 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 4 }], archetypes: [archetype] }),
      ref,
    );
    const base4 = compute(makeDoc({ classes: [{ tag: "rogue", level: 4 }] }), ref);
    expect(at4.saves.fort.total - base4.saves.fort.total).toBe(1);
    expect(at4.saves.will.total - base4.saves.will.total).toBe(1);

    const at20 = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 20 }], archetypes: [archetype] }),
      ref,
    );
    const base20 = compute(makeDoc({ classes: [{ tag: "rogue", level: 20 }] }), ref);
    expect(at20.saves.fort.total - base20.saves.fort.total).toBe(1);
  });
});

describe("resolveArchetypeFeatureEffect precedence for rogue ids (issue #45)", () => {
  it("Knife Master's Hidden Blade resolves to the hand-verified table, not duplicated in the extracted table", () => {
    const resolved = resolveArchetypeFeatureEffect("rogue:knife-master:hidden-blade:1");
    expect(resolved?.source).toBe("verified");
  });

  it("a rogue id with no entry in either table (e.g. a subsystem feature) resolves to undefined", () => {
    expect(resolveArchetypeFeatureEffect("rogue:bandit:ambush:4")).toBeUndefined();
  });
});

describe("blocked composition trap: Sneak Attack reprint rows (issue #45)", () => {
  // Carnivalist, Eldritch Scoundrel, and Snare Setter each carry a "Sneak
  // Attack" archetype feature row that is a byte-identical reprint of the
  // UNMODIFIED base Sneak Attack description (no stated change) — classified
  // `blocked` rather than extracted, since this table cannot safely touch
  // the hardcoded, atomic `sneakAttackDice()` progression (tables.ts) that
  // any REAL sneak-attack-count modification would require. Confirms
  // neither table piles a number on top of the base sneak attack dice.
  const carnivalist = archetypeId("Carnivalist");

  it("Carnivalist's reprinted Sneak Attack row has no entry in either table", () => {
    expect(resolveArchetypeFeatureEffect("rogue:carnivalist:sneak-attack:2")).toBeUndefined();
  });

  it("sneak attack dice count is unaffected by the archetype", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "rogue", level: 10 }], archetypes: [carnivalist] }),
      ref,
    );
    const feature = sheet.classFeatures.find((f) => f.name === "Sneak Attack");
    // sneakAttackDice(10) => 5d6 ("+5d6" per tables.ts's dice-label convention)
    expect(feature?.detail).toBe("5d6");
  });
});
