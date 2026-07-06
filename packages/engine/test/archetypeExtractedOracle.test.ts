import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 wave 2 (oracle): fixture tests for `archetype-extracted/
 * oracle.ts`, hand-computed against the real vendored data slice via
 * `loadRefData()`, same posture as `archetypeEffectsExtracted.test.ts`
 * (fighter pilot). Each expectation is derived straight from the published
 * PF1 rules cited (as `provenance`) in the extracted table's entries.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 12, dex: 14, con: 14, int: 10, wis: 12, cha: 16 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
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
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Enlightened Philosopher (oracle): Final Revelation grants Cha to all saving throws", () => {
  const enlightenedPhilosopher = archetypeId("Enlightened Philosopher");

  it("+3 to fort/ref/will at L20 (Cha 16, +3 mod) vs. a baseline oracle", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 20 }], archetypes: [enlightenedPhilosopher] }),
      ref,
    );
    const baseline = compute(makeDoc({ classes: [{ tag: "oracle", level: 20 }] }), ref);
    expect(withArchetype.saves.fort.total - baseline.saves.fort.total).toBe(3);
    expect(withArchetype.saves.ref.total - baseline.saves.ref.total).toBe(3);
    expect(withArchetype.saves.will.total - baseline.saves.will.total).toBe(3);

    const finalRevelation = withArchetype.classFeatures.find((f) => f.name === "Final Revelation");
    expect(finalRevelation?.applied).toBe(false); // cleanly paired 1:1
  });
});

describe("Tree Soul (oracle): Tree Soul Revelation grants natural armor + DR/slashing", () => {
  const treeSoul = archetypeId("Tree Soul");

  it("+4 natural armor and DR 10/slashing at L20", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 20 }], archetypes: [treeSoul] }),
      ref,
    );
    expect(sheet.ac.components.find((c) => c.category === "natural")?.value).toBe(4);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "slashing")?.total).toBe(10);
  });
});

describe("Seeker (oracle): Tinkering grants a general Disable Device bonus (separate id from the hand-verified sorcerer:seeker entry)", () => {
  const seeker = archetypeId("Seeker", "oracle");

  it("+5 Disable Device at L10", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 10 }], archetypes: [seeker] }),
      ref,
    );
    expect(sheet.skills["dev"]?.components.find((c) => c.source === "Tinkering")?.value).toBe(5);
  });

  it("is a distinct id from the sorcerer archetype of the same name", () => {
    const sorcererSeeker = archetypeId("Seeker", "sorcerer");
    expect(seeker).not.toBe(sorcererSeeker);
  });
});

describe("Purifier (oracle): Celestial Armor grants Armor Training as a fighter 4 levels lower", () => {
  const purifier = archetypeId("Purifier");

  it("+1 max Dex / -1 ACP at L7 (fighter-level-equivalent 3)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 7 }], archetypes: [purifier] }),
      ref,
    );
    const own = sheet.activeArchetypes
      .find((a) => a.id === purifier)
      ?.features.find((f) => f.name === "Celestial Armor");
    expect(own?.detail).toBe("+1 max Dex / -ACP (armor, as fighter 4 levels lower)");
  });

  it("+2 max Dex / -2 ACP at L11 (fighter-level-equivalent 7)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 11 }], archetypes: [purifier] }),
      ref,
    );
    const own = sheet.activeArchetypes
      .find((a) => a.id === purifier)
      ?.features.find((f) => f.name === "Celestial Armor");
    expect(own?.detail).toBe("+2 max Dex / -ACP (armor, as fighter 4 levels lower)");
  });
});

describe("blocked composition trap: Black-Blooded Oracle's Curse of Black Blood (issue #45)", () => {
  // An unpaired, wholesale replacement of the oracle's curse with a custom
  // mechanic that isn't one of the 6 hand-tabled ORACLE_CURSES entries — the
  // same unsuppressible-hand-table gap documented for sorcerer bloodlines.
  // Recorded as `blocked`, not extracted; ORACLE_CURSES stays keyed purely
  // off `build.oracleCurse`, unaffected by this archetype either way.
  it("has no entry in either effects table", () => {
    expect(
      resolveArchetypeFeatureEffect("oracle:black-blooded-oracle:curse-of-black-blood:1"),
    ).toBeUndefined();
  });

  it("an independently-chosen build.oracleCurse still applies untouched (the gap this leaves)", () => {
    const blackBloodedOracle = archetypeId("Black-Blooded Oracle");
    const doc = makeDoc({
      classes: [{ tag: "oracle", level: 5 }],
      archetypes: [blackBloodedOracle],
    });
    doc.build.oracleCurse = "wasting";
    const sheet = compute(doc, ref);
    // Wasting's own -4 chaSkills Change is authored but inert (chaSkills is
    // an UNAPPLIED target in this engine) — this assertion documents that,
    // not a claim this archetype's own curse text is modeled anywhere.
    const withoutCurse = compute(
      makeDoc({ classes: [{ tag: "oracle", level: 5 }], archetypes: [blackBloodedOracle] }),
      ref,
    );
    expect(sheet.skills["blf"]?.total).toBe(withoutCurse.skills["blf"]?.total);
  });
});
