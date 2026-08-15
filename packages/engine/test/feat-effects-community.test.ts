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
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
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
      extraFeats: over?.extraFeats,
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

/**
 * Fixtures for the "options" / "energy" / "craft" feat-choice axes (extends
 * `ChoiceFeatEntry` beyond skill/weapon/school — see feat-effects.ts).
 */
describe("feat-choice axes: options / energy / craft", () => {
  const angelicFlesh = featId("Angelic Flesh");

  it("Angelic Flesh: no choice stored emits nothing at all, not even the penalty", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [angelicFlesh] }), ref);
    expect(sheet.skills.dis?.total).toBe(base.skills.dis?.total);
    expect(sheet.skills.ste?.total).toBe(base.skills.ste?.total);
    expect(sheet.ac.normal).toBe(base.ac.normal);
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Angelic Flesh (Steel): +1 natural armor, plus the unconditional -2/-2", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [angelicFlesh], featChoices: { [angelicFlesh]: "steel" } }),
      ref,
    );
    expect(sheet.ac.normal).toBe(base.ac.normal + 1);
    expect(
      sheet.ac.components.some(
        (c) => c.category === "natural" && c.source === "Angelic Flesh" && c.applied,
      ),
    ).toBe(true);
    expect(sheet.skills.dis?.total).toBe((base.skills.dis?.total ?? 0) - 2);
    expect(sheet.skills.ste?.total).toBe((base.skills.ste?.total ?? 0) - 2);
  });

  it("Angelic Flesh (Brazen): fire resistance 5, plus the unconditional -2/-2", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [angelicFlesh], featChoices: { [angelicFlesh]: "brazen" } }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
    expect(sheet.skills.dis?.total).toBe((base.skills.dis?.total ?? 0) - 2);
    expect(sheet.skills.ste?.total).toBe((base.skills.ste?.total ?? 0) - 2);
  });

  it("Angelic Flesh (Silver): +2 vs paralysis/petrification/poison, plus the unconditional -2/-2", () => {
    const sheet = compute(
      makeDoc({ feats: [angelicFlesh], featChoices: { [angelicFlesh]: "silver" } }),
      ref,
    );
    const fortCond = sheet.saves.fort.conditionals?.find((c) => c.categories.includes("poison"));
    expect(fortCond?.total).toBe(sheet.saves.fort.total + 2);
    expect([...(fortCond?.categories ?? [])].sort()).toEqual([
      "paralysis",
      "petrification",
      "poison",
    ]);
    // Petrification/poison are Fortitude-only; paralysis also allows Will.
    const willCond = sheet.saves.will.conditionals?.find((c) => c.categories.includes("paralysis"));
    expect(willCond?.total).toBe(sheet.saves.will.total + 2);
  });

  it("Angelic Flesh (Golden): only the unconditional -2/-2, no numeric target for its own benefit", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [angelicFlesh], featChoices: { [angelicFlesh]: "golden" } }),
      ref,
    );
    expect(sheet.ac.normal).toBe(base.ac.normal);
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
    expect(sheet.skills.dis?.total).toBe((base.skills.dis?.total ?? 0) - 2);
    expect(sheet.skills.ste?.total).toBe((base.skills.ste?.total ?? 0) - 2);
  });

  const expandedFiendishResistance = featId("Expanded Fiendish Resistance");

  it("Expanded Fiendish Resistance: no choice stored emits nothing", () => {
    const sheet = compute(makeDoc({ feats: [expandedFiendishResistance] }), ref);
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Expanded Fiendish Resistance: resistance 5 to the chosen (RAW-supported) energy type", () => {
    const sheet = compute(
      makeDoc({
        feats: [expandedFiendishResistance],
        featChoices: { [expandedFiendishResistance]: "fire" },
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
  });

  it("Expanded Fiendish Resistance: Sonic is on the shared 'energy' picker but outside this feat's own RAW list, so it's a safe no-op", () => {
    const sheet = compute(
      makeDoc({
        feats: [expandedFiendishResistance],
        featChoices: { [expandedFiendishResistance]: "sonic" },
      }),
      ref,
    );
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Expanded Fiendish Resistance: repeatable, each extraFeats instance keeps its own choice", () => {
    const sheet = compute(
      makeDoc({
        feats: [expandedFiendishResistance],
        featChoices: { [expandedFiendishResistance]: "acid" },
        extraFeats: [{ instanceId: "x1", featId: expandedFiendishResistance, choiceId: "cold" }],
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(5);
  });

  const skillFocusCraft = featId("Skill Focus (Craft)");

  it("Skill Focus (Craft): no choice stored emits nothing", () => {
    const base = compute(makeDoc({ skillRanks: { "crf.alchemy": 5 } }), ref);
    const sheet = compute(
      makeDoc({ feats: [skillFocusCraft], skillRanks: { "crf.alchemy": 5 } }),
      ref,
    );
    expect(sheet.skills["crf.alchemy"]?.total).toBe(base.skills["crf.alchemy"]?.total);
  });

  it("Skill Focus (Craft): +3 on the chosen Craft instance below 10 ranks, +6 at 10+", () => {
    // crf.alchemy: 5 ranks + 3 class skill (fighter) + 0 Int mod = 8 -> +3 = 11.
    const low = compute(
      makeDoc({
        feats: [skillFocusCraft],
        featChoices: { [skillFocusCraft]: "crf.alchemy" },
        skillRanks: { "crf.alchemy": 5 },
      }),
      ref,
    );
    expect(low.skills["crf.alchemy"]?.total).toBe(11);

    // crf.alchemy: 10 ranks + 3 class skill + 0 Int mod = 13 -> +6 = 19.
    const high = compute(
      makeDoc({
        feats: [skillFocusCraft],
        featChoices: { [skillFocusCraft]: "crf.alchemy" },
        skillRanks: { "crf.alchemy": 10 },
      }),
      ref,
    );
    expect(high.skills["crf.alchemy"]?.total).toBe(19);
  });

  it("Skill Focus (Craft): repeatable, primary + extraFeats instance each target their own instance", () => {
    const sheet = compute(
      makeDoc({
        feats: [skillFocusCraft],
        featChoices: { [skillFocusCraft]: "crf.alchemy" },
        skillRanks: { "crf.alchemy": 5, "crf.armor": 5 },
        extraFeats: [{ instanceId: "x1", featId: skillFocusCraft, choiceId: "crf.armor" }],
      }),
      ref,
    );
    expect(sheet.skills["crf.alchemy"]?.total).toBe(11);
    expect(sheet.skills["crf.armor"]?.total).toBe(11);
  });

  const skillFocusPerform = featId("Skill Focus (Perform)");
  const skillFocusProfession = featId("Skill Focus (Profession)");

  it("Skill Focus (Perform): +3 below 10 ranks, +6 at 10+, mirrors Skill Focus (Craft)", () => {
    const low = compute(
      makeDoc({
        feats: [skillFocusPerform],
        featChoices: { [skillFocusPerform]: "prf.oratory" },
        skillRanks: { "prf.oratory": 5 },
      }),
      ref,
    );
    // prf.oratory: 5 ranks - 1 Cha mod (not a fighter class skill) + 3 feat = 7.
    expect(low.skills["prf.oratory"]?.total).toBe(7);
    const high = compute(
      makeDoc({
        feats: [skillFocusPerform],
        featChoices: { [skillFocusPerform]: "prf.oratory" },
        skillRanks: { "prf.oratory": 10 },
      }),
      ref,
    );
    // 10 ranks - 1 Cha mod + 6 feat = 15.
    expect(high.skills["prf.oratory"]?.total).toBe(15);
  });

  it("Skill Focus (Profession): +3 below 10 ranks, +6 at 10+, mirrors Skill Focus (Craft)", () => {
    const low = compute(
      makeDoc({
        feats: [skillFocusProfession],
        featChoices: { [skillFocusProfession]: "pro.brewer" },
        skillRanks: { "pro.brewer": 5 },
      }),
      ref,
    );
    // pro.brewer: 5 ranks + 3 class skill (fighter) + 1 Wis mod = 9 -> +3 = 12.
    expect(low.skills["pro.brewer"]?.total).toBe(12);
    const high = compute(
      makeDoc({
        feats: [skillFocusProfession],
        featChoices: { [skillFocusProfession]: "pro.brewer" },
        skillRanks: { "pro.brewer": 10 },
      }),
      ref,
    );
    // 10 ranks + 3 class skill + 1 Wis mod + 6 feat = 20.
    expect(high.skills["pro.brewer"]?.total).toBe(20);
  });
});

/**
 * Fixtures for content wave C1: the remaining choice-blocked community feats
 * wired onto the "options"/"energy"/craft-family axes.
 */
describe("content wave C1: options-axis feat choices", () => {
  const mothersGift = featId("Mother's Gift");

  it("Mother's Gift: no choice stored emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [mothersGift] }), ref);
    expect(sheet.ac.normal).toBe(base.ac.normal);
    expect(sheet.defenses?.sr).toBeUndefined();
  });

  it("Mother's Gift (Hag Claws): no PC-facing claw-attack target, emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [mothersGift], featChoices: { [mothersGift]: "hag-claws" } }),
      ref,
    );
    expect(sheet.ac.normal).toBe(base.ac.normal);
    expect(sheet.defenses?.sr).toBeUndefined();
  });

  it("Mother's Gift (Surprisingly Tough): +1 natural armor bonus", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [mothersGift], featChoices: { [mothersGift]: "surprisingly-tough" } }),
      ref,
    );
    expect(sheet.ac.normal).toBe(base.ac.normal + 1);
    expect(
      sheet.ac.components.some(
        (c) => c.category === "natural" && c.source === "Mother's Gift" && c.applied,
      ),
    ).toBe(true);
  });

  it("Mother's Gift (Uncanny Resistance): SR = 6 + character level (fighter 5 -> 11)", () => {
    const sheet = compute(
      makeDoc({ feats: [mothersGift], featChoices: { [mothersGift]: "uncanny-resistance" } }),
      ref,
    );
    expect(sheet.defenses?.sr?.total).toBe(11);
  });

  it("Mother's Gift: repeatable, primary + extraFeats instance each apply their own manifestation", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({
        feats: [mothersGift],
        featChoices: { [mothersGift]: "surprisingly-tough" },
        extraFeats: [{ instanceId: "x1", featId: mothersGift, choiceId: "uncanny-resistance" }],
      }),
      ref,
    );
    expect(sheet.ac.normal).toBe(base.ac.normal + 1);
    expect(sheet.defenses?.sr?.total).toBe(11);
  });

  const cecaeliaTattoo = featId("Cecaelia Focus Tattoo");

  it("Cecaelia Focus Tattoo: no choice stored emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [cecaeliaTattoo] }), ref);
    expect(sheet.saves.fort.conditionals ?? []).toEqual(base.saves.fort.conditionals ?? []);
  });

  it("Cecaelia Focus Tattoo (Crimson Spiral): +1 competence vs death effects, Fortitude only", () => {
    const sheet = compute(
      makeDoc({ feats: [cecaeliaTattoo], featChoices: { [cecaeliaTattoo]: "crimson-spiral" } }),
      ref,
    );
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: sheet.saves.fort.total + 1, categories: ["death"], labels: ["death"] },
    ]);
  });

  it("Cecaelia Focus Tattoo (Aureoln Prong): on-land-only darkvision range has no target, emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [cecaeliaTattoo], featChoices: { [cecaeliaTattoo]: "aureoln-prong" } }),
      ref,
    );
    expect(sheet.saves.fort.conditionals ?? []).toEqual(base.saves.fort.conditionals ?? []);
  });

  const auspiciousBirth = featId("Auspicious Birth");

  it("Auspicious Birth: no choice stored emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(makeDoc({ feats: [auspiciousBirth] }), ref);
    expect(sheet.saves.ref.total).toBe(base.saves.ref.total);
  });

  it("Auspicious Birth (Apparent Retrograde): +1 luck bonus on Reflex saves", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({
        feats: [auspiciousBirth],
        featChoices: { [auspiciousBirth]: "apparent-retrograde" },
      }),
      ref,
    );
    expect(sheet.saves.ref.total).toBe(base.saves.ref.total + 1);
  });

  it("Auspicious Birth (Sun Sign): spell-DC/CL descriptor scoping has no target, emits nothing", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [auspiciousBirth], featChoices: { [auspiciousBirth]: "sun-sign" } }),
      ref,
    );
    expect(sheet.saves.ref.total).toBe(base.saves.ref.total);
  });

  const tribalScars = featId("Tribal Scars");

  it("Tribal Scars (Bearpelt): +1 Fortitude, +2 Intimidate", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "bearpelt" } }),
      ref,
    );
    expect(sheet.saves.fort.total).toBe(base.saves.fort.total + 1);
    expect(sheet.skills.int?.total).toBe((base.skills.int?.total ?? 0) + 2);
  });

  it("Tribal Scars (Greattusk): +2 CMB on bull rush/overrun, +2 Ride", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "greattusk" } }),
      ref,
    );
    expect(sheet.cmb).toBe(base.cmb);
    expect(sheet.cmbConditionals).toEqual([
      {
        total: base.cmb + 2,
        categories: ["bullRush", "overrun"],
        labels: ["bull rush", "overrun"],
      },
    ]);
    expect(sheet.skills.rid?.total).toBe((base.skills.rid?.total ?? 0) + 2);
  });

  it("Tribal Scars (Ice Chasm): +1 Reflex, +2 Climb", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "ice-chasm" } }),
      ref,
    );
    expect(sheet.saves.ref.total).toBe(base.saves.ref.total + 1);
    expect(sheet.skills.clm?.total).toBe((base.skills.clm?.total ?? 0) + 2);
  });

  it("Tribal Scars (Night Hunt): +2 Perception, +2 Survival", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "night-hunt" } }),
      ref,
    );
    expect(sheet.skills.per?.total).toBe((base.skills.per?.total ?? 0) + 2);
    expect(sheet.skills.sur?.total).toBe((base.skills.sur?.total ?? 0) + 2);
  });

  it("Tribal Scars (Raptorscale): +5 ft base speed, +2 Acrobatics", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "raptorscale" } }),
      ref,
    );
    expect(sheet.speeds.land).toBe((base.speeds.land ?? 0) + 5);
    expect(sheet.skills.acr?.total).toBe((base.skills.acr?.total ?? 0) + 2);
  });

  it("Tribal Scars (Slothjaw): +1 Will, +2 Handle Animal", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [tribalScars], featChoices: { [tribalScars]: "slothjaw" } }),
      ref,
    );
    expect(sheet.saves.will.total).toBe(base.saves.will.total + 1);
    expect(sheet.skills.han?.total).toBe((base.skills.han?.total ?? 0) + 2);
  });

  const totemSpirit = featId("Totem Spirit");

  it("Totem Spirit (Lyrune-Quah): +1 Will, +2 Perception", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [totemSpirit], featChoices: { [totemSpirit]: "lyrune-quah" } }),
      ref,
    );
    expect(sheet.saves.will.total).toBe(base.saves.will.total + 1);
    expect(sheet.skills.per?.total).toBe((base.skills.per?.total ?? 0) + 2);
  });

  it("Totem Spirit (Shadde-Quah): +2 Intimidate wired; extra rage rounds has no pool-per-choice mechanism, stays unwired", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [totemSpirit], featChoices: { [totemSpirit]: "shadde-quah" } }),
      ref,
    );
    expect(sheet.skills.int?.total).toBe((base.skills.int?.total ?? 0) + 2);
  });

  it("Totem Spirit (Skoan-Quah): +2 Heal wired; bonus damage vs undead has no target, stays unwired", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [totemSpirit], featChoices: { [totemSpirit]: "skoan-quah" } }),
      ref,
    );
    expect(sheet.skills.hea?.total).toBe((base.skills.hea?.total ?? 0) + 2);
  });

  it("Totem Spirit (Tamiir-Quah): +5 ft base speed, +2 Acrobatics", () => {
    const base = compute(makeDoc(), ref);
    const sheet = compute(
      makeDoc({ feats: [totemSpirit], featChoices: { [totemSpirit]: "tamiir-quah" } }),
      ref,
    );
    expect(sheet.speeds.land).toBe((base.speeds.land ?? 0) + 5);
    expect(sheet.skills.acr?.total).toBe((base.skills.acr?.total ?? 0) + 2);
  });

  const whisperedKnowledge = featId("Whispered Knowledge");

  it("Whispered Knowledge (Secret of Bone): DR 5/bludgeoning", () => {
    const sheet = compute(
      makeDoc({
        feats: [whisperedKnowledge],
        featChoices: { [whisperedKnowledge]: "bone" },
      }),
      ref,
    );
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "bludgeoning")?.total).toBe(5);
  });

  it("Whispered Knowledge (Secret of the Grave): fast healing has no target, emits nothing", () => {
    const sheet = compute(
      makeDoc({
        feats: [whisperedKnowledge],
        featChoices: { [whisperedKnowledge]: "grave" },
      }),
      ref,
    );
    expect(sheet.defenses?.dr ?? []).toEqual([]);
  });

  const draconicAspect = featId("Draconic Aspect");

  it("Draconic Aspect (Red): resistance 5 to fire", () => {
    const sheet = compute(
      makeDoc({ feats: [draconicAspect], featChoices: { [draconicAspect]: "red" } }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
  });

  it("Draconic Aspect (Black and Green): both share the acid energy type", () => {
    const black = compute(
      makeDoc({ feats: [draconicAspect], featChoices: { [draconicAspect]: "black" } }),
      ref,
    );
    const green = compute(
      makeDoc({ feats: [draconicAspect], featChoices: { [draconicAspect]: "green" } }),
      ref,
    );
    expect(black.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
    expect(green.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
  });
});

/**
 * Spirit Focus (content wave C1): the +1 lives in collect.ts's medium
 * spirit-bonus loop, not in feat-effects-extracted-community.ts's build() —
 * see that loop's comment. `abilitySkills` legends (Archmage's Int-based
 * skills) fan out to every skill.<id> keyed to that ability, matching the
 * plain Spirit Bonus's own fan-out (mediumSpirits.test.ts's Archmage fixture).
 */
describe("content wave C1: Spirit Focus (medium spirit-bonus loop)", () => {
  const spiritFocus = featId("Spirit Focus");

  function mediumDoc(over: { mediumSpirit?: string; featChoice?: string }): CharacterDoc {
    const doc = makeDoc({
      classes: [{ tag: "medium", level: 5 }],
      feats: over.featChoice !== undefined ? [spiritFocus] : [],
      featChoices: over.featChoice !== undefined ? { [spiritFocus]: over.featChoice } : undefined,
    });
    return { ...doc, live: { ...doc.live, mediumSpirit: over.mediumSpirit } };
  }

  it("channeled spirit matches the chosen legend: +1 on top of the Spirit Bonus", () => {
    const withoutFocus = compute(mediumDoc({ mediumSpirit: "guardian" }), ref);
    const withFocus = compute(mediumDoc({ mediumSpirit: "guardian", featChoice: "guardian" }), ref);
    // Guardian's Spirit Bonus is flat AC/Fortitude/Reflex/CMD; check AC.
    expect(withFocus.ac.normal).toBe(withoutFocus.ac.normal + 1);
  });

  it("channeled spirit differs from the chosen legend: no change", () => {
    const withoutFocus = compute(mediumDoc({ mediumSpirit: "guardian" }), ref);
    const withFocus = compute(
      mediumDoc({ mediumSpirit: "guardian", featChoice: "trickster" }),
      ref,
    );
    expect(withFocus.ac.normal).toBe(withoutFocus.ac.normal);
  });

  it("feat taken with no choice stored: no change", () => {
    const withoutFeat = compute(mediumDoc({ mediumSpirit: "guardian" }), ref);
    const doc = mediumDoc({ mediumSpirit: "guardian" });
    const withFeatNoChoice = compute(
      { ...doc, build: { ...doc.build, feats: [spiritFocus] } },
      ref,
    );
    expect(withFeatNoChoice.ac.normal).toBe(withoutFeat.ac.normal);
  });
});
