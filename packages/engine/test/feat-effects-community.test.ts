import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { deriveResourcePools } from "../src/resources.js";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over?: {
  classes?: { tag: string; level: number }[];
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  featChoices?: Record<string, string>;
  skillRanks?: Record<string, number>;
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
      classes: over?.classes ?? [{ tag: "fighter", level: 5 }],
    },
    abilities: over?.abilities ?? { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: over?.feats ?? [],
      featChoices: over?.featChoices,
      skillRanks: over?.skillRanks ?? { acr: 5 },
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

/**
 * Hand-computed fixtures for the community feat sweep's extracted/pool
 * entries (see feat-classification-community.ts). Expected values cite the
 * published rule the vendored description carries.
 */
describe("community feat sweep: extracted static effects", () => {
  it("Sea Legs: +2 on Acrobatics, Climb, and Swim (Pirates of the Inner Sea)", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [featId("Sea Legs")] }), ref);
    // acr: 5 ranks + 2 Dex (not a fighter class skill) = 7 -> 9
    expect(base.skills.acr?.total).toBe(7);
    expect(sheet.skills.acr?.total).toBe(9);
    // clm: 0 ranks + 3 Str = 3 -> 5; swm same
    expect(sheet.skills.clm?.total).toBe((base.skills.clm?.total ?? 0) + 2);
    expect(sheet.skills.swm?.total).toBe((base.skills.swm?.total ?? 0) + 2);
  });

  it("Skill Focus (Perception): +3, and +6 once Perception has 10 ranks (CRB shape)", () => {
    const base = compute(makeDoc(), ref);
    const low = compute(makeDoc({ feats: [featId("Skill Focus (Perception)")] }), ref);
    expect(low.skills.per?.total).toBe((base.skills.per?.total ?? 0) + 3);

    const ranked = makeDoc({
      classes: [{ tag: "fighter", level: 10 }],
      feats: [featId("Skill Focus (Perception)")],
      skillRanks: { per: 10 },
    });
    const rankedBase = makeDoc({
      classes: [{ tag: "fighter", level: 10 }],
      skillRanks: { per: 10 },
    });
    expect(compute(ranked, ref).skills.per?.total).toBe(
      (compute(rankedBase, ref).skills.per?.total ?? 0) + 6,
    );
  });

  it("Storm Soul: immunity to electricity (giant feat)", () => {
    const sheet = compute(makeDoc({ feats: [featId("Storm Soul")] }), ref);
    const qualifiers = (sheet.defenses?.immunities ?? []).map((i) => i.qualifier);
    expect(qualifiers).toContain("electricity");
  });

  it("Noble Scion: +2 Knowledge (nobility) AND kno becomes a class skill (+3 with a rank)", () => {
    const base = compute(makeDoc({ skillRanks: { kno: 1 } }), ref);
    // Fighter: kno is not a class skill; 1 rank + 0 Int = 1.
    expect(base.skills.kno?.total).toBe(1);
    const sheet = compute(makeDoc({ skillRanks: { kno: 1 }, feats: [featId("Noble Scion")] }), ref);
    // 1 rank + 3 class skill + 2 feat = 6.
    expect(sheet.skills.kno?.total).toBe(6);
  });

  it("Exotic Heritage: +2 on the chosen skill via the stored featChoice", () => {
    const id = featId("Exotic Heritage");
    const sheet = compute(makeDoc({ feats: [id], featChoices: { [id]: "acr" } }), ref);
    // acr: 5 ranks + 2 Dex + 2 feat (below 10 ranks) = 9.
    expect(sheet.skills.acr?.total).toBe(9);
  });

  it("Warrior Priest: +1 initiative", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [featId("Warrior Priest")] }), ref);
    expect(sheet.initiative.total).toBe(base.initiative.total + 1);
  });
});

describe("community feat sweep: pool promotions", () => {
  it("Extended Bane: inquisitor 5 w/ Wis 16's Bane (5 rounds) gains +Wis mod -> 8 (Ultimate Magic)", () => {
    const doc = makeDoc({
      classes: [{ tag: "inquisitor", level: 5 }],
      abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 16, cha: 10 },
      feats: [featId("Extended Bane")],
    });
    const sheet = compute(doc, ref);
    const bane = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Bane");
    expect(bane?.max).toBe(8);
  });

  it("Practiced Tactician: cavalier 5's Tactician (1 + floor(5/5) = 2) gains +1 -> 3 (ACG)", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      feats: [featId("Practiced Tactician")],
    });
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find((p) =>
      p.name.toLowerCase().includes("tactician"),
    );
    expect(pool?.max).toBe(3);
  });

  it("Mantis Style's extra Stunning Fist attempt applies without the stance (unprefixed clause)", () => {
    const doc = makeDoc({
      classes: [{ tag: "monk", level: 5 }],
      feats: [featId("Mantis Style")],
    });
    const base = { ...doc, build: { ...doc.build, feats: [] } };
    const sheet = compute(doc, ref);
    const baseSheet = compute(base, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.name === "Stunning Fist",
    );
    const basePool = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Stunning Fist",
    );
    expect(pool?.max).toBe((basePool?.max ?? 0) + 1);
  });
});

/**
 * Fixtures for the maneuver-category and save-category re-sweep (post-dates
 * the original community classification pass; see feat-classification-
 * community.ts's header) — proves both a community maneuver-scoped CMB/CMD
 * feat and a community save-category feat compose the same way the hand-
 * verified fixtures in maneuverCategories.test.ts and featSaveCategories.test.ts
 * already established.
 */
describe("community maneuver/save-category promotions", () => {
  it("Feline Grace: +2 CMD against all five named maneuvers, one merged line", () => {
    // "You gain a +2 bonus to your CMD against bull rush, grapple, overrun,
    // repositioning, and trip combat maneuvers." Fighter 5, str 16 (+3), dex
    // 14 (+2): CMD = 10 + BAB 5 + str 3 + dex 2 = 20.
    const base = makeDoc();
    const withFeat = makeDoc({ feats: [featId("Feline Grace")] });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(baseSheet.cmd).toBe(20);
    expect(featSheet.cmd).toBe(20); // headline untouched
    expect(featSheet.cmdConditionals).toEqual([
      {
        total: 22,
        categories: ["bullRush", "grapple", "overrun", "reposition", "trip"],
        labels: ["bull rush", "grapple", "overrun", "reposition", "trip"],
      },
    ]);
  });

  it("Flagellant: +4 untyped vs. pain effects, headline Fortitude untouched", () => {
    // "You gain a +4 bonus on saving throws against pain effects." `pain`
    // applies to both Fortitude and Will (save-categories.ts).
    const base = makeDoc();
    const withFeat = makeDoc({ feats: [featId("Flagellant")] });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.saves.fort.total).toBe(baseSheet.saves.fort.total);
    expect(featSheet.saves.fort.conditionals).toEqual([
      { total: baseSheet.saves.fort.total + 4, categories: ["pain"], labels: ["pain"] },
    ]);
  });
});

/**
 * Fixtures for the community feats promoted onto the new spell-DC/CL-check
 * vocabulary (spell-dcs.ts) — the same re-sweep that wired Spell Focus and
 * Spell Penetration in feat-classification.ts.
 */
describe("community spell-DC / CL-check promotions", () => {
  it("Dispel Focus + Greater Dispel Focus: +2 each on dispel checks, stacking to +4 (community pack)", () => {
    const sheet = compute(
      makeDoc({ feats: [featId("Dispel Focus"), featId("Greater Dispel Focus")] }),
      ref,
    );
    expect(sheet.clChecks?.dispel?.bonus).toBe(4);
    expect(sheet.clChecks?.sr).toBeUndefined();
  });

  it("Elven Spirit: +2 racial on caster level checks to overcome SR (community pack)", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [featId("Elven Spirit")] }), ref);
    expect(base.clChecks).toBeUndefined();
    expect(sheet.clChecks?.sr?.bonus).toBe(2);
    expect(
      sheet.clChecks?.sr?.components.some((c) => c.source === "Elven Spirit" && c.applied),
    ).toBe(true);
  });
});

/**
 * Fixtures for the parameterized-skill-family re-sweep: named Craft/
 * Profession/Perform instances and whole-family targets, now that compute.ts
 * supports dotted per-instance targets and bare-prefix fan-out (see
 * feat-classification-community.ts's brewmaster/fabulist/master-alchemist/
 * fascinated-by-the-mundane notes).
 */
describe("community parameterized-skill-family promotions", () => {
  it("Brewmaster: +2 on Craft (alchemy) and +2 on Profession (brewer), two distinct instances", () => {
    const base = compute(makeDoc(), ref);
    expect(base.skills["crf.alchemy"]).toBeUndefined();
    expect(base.skills["pro.brewer"]).toBeUndefined();
    const sheet = compute(makeDoc({ feats: [featId("Brewmaster")] }), ref);
    // crf.alchemy: 0 ranks + 0 Int mod + 2 feat = 2.
    expect(sheet.skills["crf.alchemy"]?.total).toBe(2);
    // pro.brewer: 0 ranks + 1 Wis mod + 2 feat = 3.
    expect(sheet.skills["pro.brewer"]?.total).toBe(3);
  });

  it("Master Alchemist: +2 on Craft (alchemy) only, no Profession instance created", () => {
    const sheet = compute(makeDoc({ feats: [featId("Master Alchemist")] }), ref);
    expect(sheet.skills["crf.alchemy"]?.total).toBe(2);
    expect(sheet.skills["pro.brewer"]).toBeUndefined();
  });

  it("Fabulist: +1 on the four named Perform instances, and Perform is a class skill", () => {
    const sheet = compute(makeDoc({ feats: [featId("Fabulist")] }), ref);
    for (const slug of ["prf.act", "prf.comedy", "prf.oratory", "prf.sing"]) {
      expect(sheet.skills[slug]?.components.some((c) => c.source === "Fabulist" && c.applied)).toBe(
        true,
      );
      expect(sheet.skills[slug]?.classSkill).toBe(true);
    }
    // An unrelated Perform instance never named by the feat gets neither.
    expect(sheet.skills["prf.dance"]).toBeUndefined();
  });

  it("Fascinated by the Mundane: +2 on the named Charisma skills and the whole Perform family, not Diplomacy", () => {
    const base = compute(makeDoc({ skillRanks: { "prf.oratory": 2 } }), ref);
    const sheet = compute(
      makeDoc({ skillRanks: { "prf.oratory": 2 }, feats: [featId("Fascinated by the Mundane")] }),
      ref,
    );
    for (const id of ["blf", "dis", "han", "int", "umd", "prf", "prf.oratory"]) {
      expect(sheet.skills[id]?.total).toBe((base.skills[id]?.total ?? 0) + 2);
    }
    expect(sheet.skills.dip?.total).toBe(base.skills.dip?.total);
  });
});
