import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, collectCompanionMasterEffects, deriveCompanion } from "../src/index.js";

const ref = loadRefData();

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  animalCompanion?: CharacterDoc["build"]["animalCompanion"];
  paladinBond?: "weapon" | "mount";
  clericDomains?: string[];
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
      animalCompanion: overrides.animalCompanion,
      paladinBond: overrides.paladinBond,
      clericDomains: overrides.clericDomains,
    },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("COMPANION_EFFECT_CLASS_FEATURES — level grants (create a companion)", () => {
  it('Divine Bond mount: paladin 5 with paladinBond "mount" creates a companion, level = paladin level', () => {
    // "This mount functions as a druid's animal companion, using the
    // paladin's level as her effective druid level" (empyreal-knight
    // archetype's restatement of the base ability, class-features.json id
    // z4NJaCcj9VZpBv7d).
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 5 }],
      animalCompanion: { speciesId: "horse", name: "Providence", source: [] },
      paladinBond: "mount",
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(5);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion).toBeDefined();
    expect(companion!.level).toBe(5);
  });

  it("Divine Bond: weapon option or no bond chosen grants no companion level", () => {
    const withWeapon = makeDoc({
      classes: [{ tag: "paladin", level: 5 }],
      animalCompanion: { speciesId: "horse", name: "Providence", source: [] },
      paladinBond: "weapon",
    });
    expect(collectCompanionMasterEffects(withWeapon, ref).grantLevels).toBe(0);

    const unset = makeDoc({
      classes: [{ tag: "paladin", level: 5 }],
      animalCompanion: { speciesId: "horse", name: "Providence", source: [] },
    });
    expect(collectCompanionMasterEffects(unset, ref).grantLevels).toBe(0);
  });

  it("Divine Bond gates on paladin level 5 (minLevel)", () => {
    const doc = makeDoc({
      classes: [{ tag: "paladin", level: 4 }],
      animalCompanion: { speciesId: "horse", name: "Providence", source: [] },
      paladinBond: "mount",
    });
    expect(collectCompanionMasterEffects(doc, ref).grantLevels).toBe(0);
  });

  it("Animal Domain: cleric 7 with the Animal domain creates a companion at cleric level - 3", () => {
    // "Your effective druid level for this animal companion is equal to
    // your cleric level – 3" (class-features.json id 1jMb1iCiNjS5yfwe,
    // domains.json tag "Animal").
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 7 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: [] },
      clericDomains: ["Animal"],
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(4);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion!.level).toBe(4);
  });

  it("Animal Domain gates on the domain actually being chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 7 }],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: [] },
      clericDomains: ["Fire"],
    });
    expect(collectCompanionMasterEffects(doc, ref).grantLevels).toBe(0);
  });

  it("Venom subdomain's Serpent Companion: cleric 6 creates a companion at cleric level - 2", () => {
    // "Your effective druid level for this animal companion is equal to
    // your cleric level –2" (class-features.json id szRzBgTW01Vov922,
    // subdomains.json tag "Venom" — despite the ability's own name, there
    // is no "Serpent" subdomain in the vendored data).
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 6 }],
      animalCompanion: { speciesId: "wolf", name: "Sss", source: [] },
      clericDomains: ["Venom"],
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(4);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion!.level).toBe(4);
  });

  it("Equine Bond: asavir 3 creates a horse companion at asavir level + 2", () => {
    // "This mount functions as a druid's animal companion, using the
    // asavir's level + 2 as her effective druid level" (class-features.json
    // id X0tGpISvrvBwb180). A second, non-companion class keeps the
    // character-level cap from masking the +2 offset (asavir alone would be
    // clamped to 3 by "can never exceed her total character level").
    const doc = makeDoc({
      classes: [
        { tag: "asavir", level: 3 },
        { tag: "fighter", level: 5 },
      ],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(5);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion!.level).toBe(5);
  });

  it("Equine Bond gates on asavir level 3 (minLevel)", () => {
    const doc = makeDoc({
      classes: [{ tag: "asavir", level: 2 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    expect(collectCompanionMasterEffects(doc, ref).grantLevels).toBe(0);
  });
});

describe("COMPANION_EFFECT_CLASS_FEATURES — stat mods on an existing companion", () => {
  it("Companion Soul: nature warden 10 raises Devotion's +4 Will-vs-enchantment to +8 (same type, highest wins)", () => {
    // "The companion's devotion ability increases to a +8 morale bonus on
    // Will saves against enchantment spells and effects" (class-features.json
    // id T8jF1LURViyIo56i). Ranger 9 with hunters-bond gives a companion at
    // effective level 6 (9 - 3), where Devotion (+4 morale) unlocks on the
    // CRB companion table.
    const doc = makeDoc({
      classes: [
        { tag: "ranger", level: 9 },
        { tag: "natureWarden", level: 10 },
      ],
      animalCompanion: { speciesId: "wolf", name: "Kodo", source: ["hunters-bond"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const withSoul = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    const withoutSoul = deriveCompanion(doc, buildRollData(doc, ref), false, false, {
      ...master,
      buffs: master.buffs.filter((b) => b.name !== "Companion Soul"),
    });
    // Devotion alone (no Companion Soul) reads +4 on the enchantment line.
    const enchantmentLine = (total: typeof withSoul) =>
      total!.saveConditionals?.will?.find((c) => c.categories.includes("enchantment"));
    expect(enchantmentLine(withoutSoul)!.total).toBe(withoutSoul!.saves.will + 4);
    // Companion Soul supersedes it (same "morale" type, highest wins) rather
    // than stacking on top: +8, not +12.
    expect(enchantmentLine(withSoul)!.total).toBe(withSoul!.saves.will + 8);
  });

  it("Companion Soul gates on nature warden level 10 (minLevel)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "ranger", level: 9 },
        { tag: "natureWarden", level: 9 },
      ],
      animalCompanion: { speciesId: "wolf", name: "Kodo", source: ["hunters-bond"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.buffs.some((b) => b.name === "Companion Soul")).toBe(false);
  });

  it("Shaitan's Blessing: asavir mount gains +2 (or +4 at 9th) racial vs. mind-affecting/fear", () => {
    // "a +2 racial bonus on saving throws against all mind-affecting and
    // fear effects. When the asavir reaches 9th level, this bonus increases
    // to +4" (class-features.json id 6Ouq3IotfDzfos5z).
    const at8 = makeDoc({
      classes: [{ tag: "asavir", level: 8 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master8 = collectCompanionMasterEffects(at8, ref);
    const with8 = deriveCompanion(at8, buildRollData(at8, ref), false, false, master8);
    const without8 = deriveCompanion(at8, buildRollData(at8, ref), false, false, {
      ...master8,
      buffs: master8.buffs.filter((b) => b.name !== "Shaitan's Blessing"),
    });
    const mindLine = (total: typeof with8) =>
      total!.saveConditionals?.will?.find((c) => c.categories.includes("mind"));
    expect(mindLine(with8)!.total).toBe(without8!.saves.will + 2);

    const at9 = makeDoc({
      classes: [{ tag: "asavir", level: 9 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master9 = collectCompanionMasterEffects(at9, ref);
    const with9 = deriveCompanion(at9, buildRollData(at9, ref), false, false, master9);
    const without9 = deriveCompanion(at9, buildRollData(at9, ref), false, false, {
      ...master9,
      buffs: master9.buffs.filter((b) => b.name !== "Shaitan's Blessing"),
    });
    expect(mindLine(with9)!.total).toBe(without9!.saves.will + 4);
  });

  it("Marid's Blessing: asavir 6 mount gains +2 racial on Reflex saves", () => {
    // "The mount gains a +2 racial bonus on Reflex saves" (class-features.json
    // id UbYjMsQ8DDXRaX84).
    const doc = makeDoc({
      classes: [{ tag: "asavir", level: 6 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const withMarid = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    const withoutMarid = deriveCompanion(doc, buildRollData(doc, ref), false, false, {
      ...master,
      buffs: master.buffs.filter((b) => b.name !== "Marid's Blessing"),
    });
    expect(withMarid!.saves.ref).toBe(withoutMarid!.saves.ref + 2);
  });

  it("Marid's Blessing gates on asavir level 6 (minLevel)", () => {
    const doc = makeDoc({
      classes: [{ tag: "asavir", level: 5 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.buffs.some((b) => b.name === "Marid's Blessing")).toBe(false);
  });

  it("Janni's Blessing: asavir 10 mount gains +1 luck on all saving throws", () => {
    // "Both the asavir and her mount gain a +1 luck bonus on all saving
    // throws" (class-features.json id Got8x5eMbGLgR2lc).
    const doc = makeDoc({
      classes: [{ tag: "asavir", level: 10 }],
      animalCompanion: { speciesId: "horse", name: "Sandrunner", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    const withJanni = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    const withoutJanni = deriveCompanion(doc, buildRollData(doc, ref), false, false, {
      ...master,
      buffs: master.buffs.filter((b) => b.name !== "Janni's Blessing"),
    });
    expect(withJanni!.saves.fort).toBe(withoutJanni!.saves.fort + 1);
    expect(withJanni!.saves.ref).toBe(withoutJanni!.saves.ref + 1);
    expect(withJanni!.saves.will).toBe(withoutJanni!.saves.will + 1);
  });
});
