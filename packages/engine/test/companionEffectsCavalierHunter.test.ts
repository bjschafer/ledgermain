import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, collectCompanionMasterEffects, deriveCompanion } from "../src/index.js";

const ref = loadRefData();

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  animalCompanion?: CharacterDoc["build"]["animalCompanion"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: Object.entries(ref.races).find(([, r]) => r.name === "Human")![0],
      classes: overrides.classes,
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: overrides.archetypes,
      animalCompanion: overrides.animalCompanion,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Fast Mount (cavalier hussar) — scaling mount land speed", () => {
  it("adds +10 land speed at 1st level", () => {
    // "The base speed of any creature that the hussar is riding increases
    // by 10 feet." (Ultimate Combat, hussar)
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 1 }],
      archetypes: ["cavalier:hussar"],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion!.speeds.land).toBe(60 + 10);
  });

  it("scales to +15 at 5th level and caps at +30 at 20th", () => {
    // "At 5th level and every 5 cavalier levels thereafter, this bonus
    // increases by an additional 5 feet (to a maximum increase of 30 feet
    // at 20th level)."
    const at5 = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      archetypes: ["cavalier:hussar"],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master5 = collectCompanionMasterEffects(at5, ref);
    const companion5 = deriveCompanion(at5, buildRollData(at5, ref), false, false, master5);
    expect(companion5!.speeds.land).toBe(60 + 15);

    const at20 = makeDoc({
      classes: [{ tag: "cavalier", level: 20 }],
      archetypes: ["cavalier:hussar"],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master20 = collectCompanionMasterEffects(at20, ref);
    const companion20 = deriveCompanion(at20, buildRollData(at20, ref), false, false, master20);
    expect(companion20!.speeds.land).toBe(60 + 30);
  });

  it("does not apply without the hussar archetype", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion!.speeds.land).toBe(60);
  });
});

describe("Desert Wind (cavalier Qadiran horselord) — scaling mount land speed", () => {
  it("adds +5 land speed at 1st, +10 at 5th", () => {
    // "The speed of a Qadiran horselord's mount increases by 5 feet. Its
    // speed increases by an additional 5 feet at 5th level and every 5
    // cavalier levels thereafter."
    const at1 = makeDoc({
      classes: [{ tag: "cavalier", level: 1 }],
      archetypes: ["cavalier:qadiran-horselord"],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master1 = collectCompanionMasterEffects(at1, ref);
    const companion1 = deriveCompanion(at1, buildRollData(at1, ref), false, false, master1);
    expect(companion1!.speeds.land).toBe(60 + 5);

    const at5 = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      archetypes: ["cavalier:qadiran-horselord"],
      animalCompanion: { speciesId: "horse", name: "Steed", source: ["cavalier-mount"] },
    });
    const master5 = collectCompanionMasterEffects(at5, ref);
    const companion5 = deriveCompanion(at5, buildRollData(at5, ref), false, false, master5);
    expect(companion5!.speeds.land).toBe(60 + 10);
  });
});

describe("Fierce Devotion + Primeval Devotion (cavalier saurian champion) — mount save bonus", () => {
  it("grants the mount +4 vs. fear/emotion/enchantment from 5th level, ahead of the base table's own Devotion", () => {
    // "At 5th level, a saurian champion's mount gains the devotion ability,
    // and its effects also apply against emotion and fear effects."
    // The base companion progression (companion.ts) doesn't unlock Devotion
    // until companion level 6, so at cavalier 5 this is the ONLY source.
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 5 }],
      archetypes: ["cavalier:saurian-champion"],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    const fear = companion!.saveConditionals?.will?.find((c) => c.categories.includes("fear"));
    expect(fear?.total).toBe(companion!.saves.will + 4);
  });

  it("adds +2 more (total +6) to the devotion categories from 14th level", () => {
    // "At 14th level, the bonus on saving throws provided by the mount's
    // devotion ability increases by 2."
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 14 }],
      archetypes: ["cavalier:saurian-champion"],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    const fear = companion!.saveConditionals?.will?.find((c) => c.categories.includes("fear"));
    expect(fear?.total).toBe(companion!.saves.will + 6);
  });

  it("Primeval Devotion alone (below 14th) does not apply", () => {
    const at13 = makeDoc({
      classes: [{ tag: "cavalier", level: 13 }],
      archetypes: ["cavalier:saurian-champion"],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(at13, ref);
    const companion = deriveCompanion(at13, buildRollData(at13, ref), false, false, master);
    const fear = companion!.saveConditionals?.will?.find((c) => c.categories.includes("fear"));
    expect(fear?.total).toBe(companion!.saves.will + 4);
  });
});

describe("Titanic Mount (cavalier saurian champion) — mount Str/Con/natural-armor bundle", () => {
  it("grants +2 Str / +2 Con / -2 Dex at 10th level", () => {
    // "It also gains a +2 size bonus to its Strength and Constitution
    // score... a -2 penalty to Dexterity."
    const base = makeDoc({
      classes: [{ tag: "cavalier", level: 10 }],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const withArch = {
      ...base,
      build: { ...base.build, archetypes: ["cavalier:saurian-champion"] },
    };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const titanic = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(titanic!.abilities.str.score).toBe(plain!.abilities.str.score + 2);
    expect(titanic!.abilities.con.score).toBe(plain!.abilities.con.score + 2);
    expect(titanic!.abilities.dex.score).toBe(plain!.abilities.dex.score - 2);
    // No natural-armor bonus yet at 10th (only from 12th on) — no "Titanic
    // Mount" AC component should be present.
    expect(titanic!.ac.components.some((c) => c.source === "Titanic Mount")).toBe(false);
  });

  it("adds the scheduled Str/Con/natural-armor increments at 12th/14th", () => {
    // "At 12th, 14th, 16th, and 18th levels, the bonus to Strength increases
    // by 2 and the mount's natural armor increases by 1. At 14th and 18th
    // levels, the bonus to Constitution increases by 2."
    const base = makeDoc({
      classes: [{ tag: "cavalier", level: 14 }],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const withArch = {
      ...base,
      build: { ...base.build, archetypes: ["cavalier:saurian-champion"] },
    };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const titanic = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    // Str: +2 (10th) + 2 (12th) + 2 (14th) = +6.
    expect(titanic!.abilities.str.score).toBe(plain!.abilities.str.score + 6);
    // Con: +2 (10th) + 2 (14th) = +4.
    expect(titanic!.abilities.con.score).toBe(plain!.abilities.con.score + 4);
    // Natural armor: +1 (12th) + 1 (14th) = +2, as its own AC component
    // (type "increase" sums on top of the mount's intrinsic natural armor
    // rather than competing highest-wins against it).
    const nac = titanic!.ac.components.find((c) => c.source === "Titanic Mount");
    expect(nac?.value).toBe(2);
    expect(nac?.applied).toBe(true);
  });

  it("does not apply below 10th level", () => {
    const base = makeDoc({
      classes: [{ tag: "cavalier", level: 9 }],
      animalCompanion: { speciesId: "deinonychus", name: "Rex", source: ["cavalier-mount"] },
    });
    const withArch = {
      ...base,
      build: { ...base.build, archetypes: ["cavalier:saurian-champion"] },
    };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const titanic = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(titanic!.abilities.str.score).toBe(plain!.abilities.str.score);
  });
});

describe("Primeval Companion (hunter totem-bonded) — 7th-level bear size-up bundle", () => {
  it("grants Str +4 / Dex -2 / Con +2 to a bear companion at 7th level", () => {
    // "Ability Scores Str +4, Dex -2, Con +2" (bear is the example species
    // whose companion growth table caps at Medium, matching the archetype's
    // own condition).
    const base = makeDoc({
      classes: [{ tag: "hunter", level: 7 }],
      animalCompanion: { speciesId: "bear", name: "Bruno", source: ["hunter-companion"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["hunter:totem-bonded"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const grown = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(grown!.abilities.str.score).toBe(plain!.abilities.str.score + 4);
    expect(grown!.abilities.dex.score).toBe(plain!.abilities.dex.score - 2);
    expect(grown!.abilities.con.score).toBe(plain!.abilities.con.score + 2);
  });

  it("does not apply to a non-bear companion", () => {
    const base = makeDoc({
      classes: [{ tag: "hunter", level: 7 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["hunter-companion"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["hunter:totem-bonded"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const wolf = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(wolf!.abilities.str.score).toBe(plain!.abilities.str.score);
  });

  it("does not apply below 7th level even for a bear", () => {
    const base = makeDoc({
      classes: [{ tag: "hunter", level: 6 }],
      animalCompanion: { speciesId: "bear", name: "Bruno", source: ["hunter-companion"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["hunter:totem-bonded"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const bear = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(bear!.abilities.str.score).toBe(plain!.abilities.str.score);
  });
});

describe("Brachiation (hunter treestrider) — companion climb speed", () => {
  it("grants the companion a +10 climb speed enhancement bonus from 1st level", () => {
    // "The treestrider's companion gains a +10-foot enhancement bonus to
    // its climb speed." Ape already has a base climb speed (30 ft.), so this
    // adds onto it rather than creating one from nothing.
    const base = makeDoc({
      classes: [{ tag: "hunter", level: 1 }],
      animalCompanion: { speciesId: "ape", name: "Kong", source: ["hunter-companion"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["hunter:treestrider"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const companion = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(companion!.speeds.climb).toBe(plain!.speeds.climb! + 10);
  });

  it("increases to +20 at 8th level", () => {
    // "At 8th level... the enhancement bonus to her companion's climb speed
    // increases to +20 feet."
    const base = makeDoc({
      classes: [{ tag: "hunter", level: 8 }],
      animalCompanion: { speciesId: "ape", name: "Kong", source: ["hunter-companion"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["hunter:treestrider"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    const companion = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(companion!.speeds.climb).toBe(plain!.speeds.climb! + 20);
  });
});
