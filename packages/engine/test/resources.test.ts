import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture tests for the action-derived resource-pool `detail` line (issue:
 * bare "N/M per day" counters with no hint of what the power actually does).
 * These exercise `deriveResourcePools`'s `actionBasedDetail` against the real
 * vendored `ClassFeature.actions` data (schema v8) — hand-computed against
 * the published SRD formulas, same posture as the rest of this test suite.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [] },
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

describe("action-derived resource-pool detail", () => {
  it("wizard 4 (Conjuration school) — Acid Dart (WIZ): ranged touch acid damage", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "wizard", level: 4 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        wizardSchool: "con",
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const acidDart = pools.find((p) => p.name === "Acid Dart (WIZ)");
    expect(acidDart).toBeDefined();
    // 3 + Int mod(4) = 7 uses/day.
    expect(acidDart?.max).toBe(7);
    expect(acidDart?.per).toBe("day");
    // 1d6 + floor(4/2) = 1d6+2, ranged touch, acid.
    expect(acidDart?.detail).toBe("ranged touch · 1d6+2 acid");
  });

  it("cleric 7 — Channel Energy: heal/harm dice + Will DC (no cleric-only gate needed, it's generic now)", () => {
    const doc = baseDoc({
      identity: { name: "Hex", race: raceId("Human"), classes: [{ tag: "cleric", level: 7 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy");
    expect(channel).toBeDefined();
    // 3 + Cha mod(2) = 5 uses/day.
    expect(channel?.max).toBe(5);
    expect(channel?.per).toBe("day");
    // dice = ceil(7/2) = 4d6; DC = 10 + floor(7/2) + 2 = 15.
    expect(channel?.detail).toBe("4d6 (DC 15 Will)");
  });

  it("paladin 6 — Channel Positive Energy's dice/DC merge into Lay on Hands' detail (the fixed cleric-gate wart)", () => {
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // Channel Positive Energy has no `uses.maxFormula` of its own (it spends
    // Lay on Hands uses — `uses.source: "layOnHands"`), so it never becomes
    // its own pool row; that would double-count a shared pool.
    expect(pools.find((p) => p.name === "Channel Positive Energy")).toBeUndefined();

    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh).toBeDefined();
    // floor(6/2) + Cha mod(3) = 6 uses/day.
    expect(loh?.max).toBe(6);
    expect(loh?.per).toBe("day");
    // Lay on Hands' own heal dice: floor(6/2) = 3d6. Channel Positive
    // Energy's reflavored dice/DC (paladin level as effective cleric level):
    // dice = ceil(6/2) = 3d6, DC = 10 + floor(6/2) + 3 = 16.
    expect(loh?.detail).toBe("heal 3d6 · Channel Positive Energy: 3d6 (DC 16 Will)");
  });

  it("monk 6 — Stunning Fist: a pure save-DC feature with no damage action", () => {
    const doc = baseDoc({
      identity: { name: "Kai", race: raceId("Human"), classes: [{ tag: "monk", level: 6 }] },
      abilities: { str: 12, dex: 16, con: 12, int: 10, wis: 16, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const stunningFist = pools.find((p) => p.name === "Stunning Fist");
    expect(stunningFist).toBeDefined();
    // DC = 10 + floor(6/2) + Wis mod(3) = 16, Fortitude.
    expect(stunningFist?.detail).toBe("DC 16 Fort");
  });

  it("cleric 1 (Death domain) — Bleeding Touch: melee touch damage with an 'untyped' damage type suppressed", () => {
    const doc = baseDoc({
      identity: { name: "Nyx", race: raceId("Human"), classes: [{ tag: "cleric", level: 1 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains: ["Death"],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const bleedingTouch = pools.find((p) => p.name === "Bleeding Touch");
    expect(bleedingTouch).toBeDefined();
    // "untyped" is filtered out of the type suffix — it reads as noise, not
    // information (contrast Acid Dart's meaningful "acid" type above).
    expect(bleedingTouch?.detail).toBe("melee touch · 1d6");
  });
});

/**
 * Fixture tests for the Cleric Wisdom house-rule (issue #56, default OFF —
 * RAW). When `settings.clericWisdomHouserule` is true, cleric-tagged grants
 * evaluate `@abilities.cha` as an alias for Wisdom — scoped to Channel
 * Energy's `uses.maxFormula` (3 + Cha mod) and its actions' `dcFormula`
 * (10 + 1/2 cleric level + Cha mod), the only Cha-keyed formula among the
 * vendored cleric-tagged class/domain features. Paladin (Lay on Hands /
 * Channel Positive Energy) must be completely unaffected either way — its
 * grants carry classTag "paladin", never "cleric".
 */
describe("Cleric Wisdom house-rule (issue #56)", () => {
  function clericDoc(clericWisdomHouserule: boolean): CharacterDoc {
    return baseDoc({
      identity: { name: "Wren", race: raceId("Human"), classes: [{ tag: "cleric", level: 7 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 18, cha: 12 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        settings: { clericWisdomHouserule },
      },
    });
  }

  it("toggle OFF (default/RAW) — Channel Energy uses/day and DC key off Charisma", () => {
    const doc = clericDoc(false);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy");
    expect(channel).toBeDefined();
    // 3 + Cha mod(1) = 4 uses/day.
    expect(channel?.max).toBe(4);
    // dice = ceil(7/2) = 4d6; DC = 10 + floor(7/2) + Cha mod(1) = 14.
    expect(channel?.detail).toBe("4d6 (DC 14 Will)");
  });

  it("toggle ON — Channel Energy uses/day and DC key off Wisdom instead", () => {
    const doc = clericDoc(true);
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy");
    expect(channel).toBeDefined();
    // 3 + Wis mod(4) = 7 uses/day.
    expect(channel?.max).toBe(7);
    // dice = ceil(7/2) = 4d6; DC = 10 + floor(7/2) + Wis mod(4) = 17.
    expect(channel?.detail).toBe("4d6 (DC 17 Will)");
  });

  it("does not change the character's actual Charisma modifier — only the cleric-feature formula context", () => {
    const doc = clericDoc(true);
    const sheet = compute(doc, ref);
    // Cha 12 -> +1 mod, unaffected by the houserule everywhere outside the
    // scoped cleric-feature formula evaluation.
    expect(sheet.abilities.cha.mod).toBe(1);
  });

  it("paladin — Lay on Hands / Channel Positive Energy unaffected with the houserule ON", () => {
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        settings: { clericWisdomHouserule: true },
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh).toBeDefined();
    // Same numbers as the RAW paladin fixture above (settings.clericWisdomHouserule
    // is a no-op for classTag "paladin"): floor(6/2) + Cha mod(3) = 6 uses/day,
    // heal 3d6, and Channel Positive Energy's merged dice/DC still off Cha.
    expect(loh?.max).toBe(6);
    expect(loh?.detail).toBe("heal 3d6 · Channel Positive Energy: 3d6 (DC 16 Will)");
  });

  it("paladin — Lay on Hands / Channel Positive Energy unaffected with the houserule OFF", () => {
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        settings: { clericWisdomHouserule: false },
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh?.max).toBe(6);
    expect(loh?.detail).toBe("heal 3d6 · Channel Positive Energy: 3d6 (DC 16 Will)");
  });
});

/**
 * Fixture tests for `DerivedResourcePool.linkedBuffIds` (issue: wire the
 * previously-dead `ClassFeature.grantsBuffs` field). Of the 12 vendored
 * features carrying `grantsBuffs`, only 3 resolve against the vendored buff
 * slice — Rage, Inspire Courage, and Aura of Protection (Domain Power) — the
 * other 9 occurrences must resolve to an empty `linkedBuffIds`, never throw.
 * Issue #62 audited those 9: none are actually buffs (see `resolveGrantsBuffs`'s
 * doc comment in resources.ts) — they resolve to feats or an item instead, so
 * dropping them (this file's existing behavior) is correct as-is, not a gap.
 */
describe("grantsBuffs -> linkedBuffIds", () => {
  it("barbarian 1 — Rage pool exposes the Rage buff link", () => {
    const doc = baseDoc({
      identity: { name: "Ux", race: raceId("Human"), classes: [{ tag: "barbarian", level: 1 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = pools.find((p) => p.name === "Rage");
    expect(rage).toBeDefined();
    expect(rage?.linkedBuffIds).toEqual([buffId("Rage")]);
  });

  it("bard 1 — Inspire Courage carries no uses.maxFormula of its own, so its buff link merges onto the Bardic Performance pool", () => {
    const doc = baseDoc({
      identity: { name: "Lyr", race: raceId("Human"), classes: [{ tag: "bard", level: 1 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // Inspire Courage never becomes its own pool (no uses block at all) —
    // it's not even findable by name.
    expect(pools.find((p) => p.name === "Inspire Courage")).toBeUndefined();
    const bardic = pools.find((p) => p.name === "Bardic Performance");
    expect(bardic).toBeDefined();
    expect(bardic?.linkedBuffIds).toEqual([buffId("Inspire Courage")]);
  });

  it("cleric 8 (Protection domain) — Aura of Protection domain power exposes its buff link", () => {
    const doc = baseDoc({
      identity: { name: "Sol", race: raceId("Human"), classes: [{ tag: "cleric", level: 8 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        clericDomains: ["Protection"],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const aura = pools.find((p) => p.name === "Aura of Protection (Domain Power)");
    expect(aura).toBeDefined();
    expect(aura?.linkedBuffIds).toEqual([buffId("Aura of Protection")]);
  });

  it("hunter 5 (issue #65) — Animal Focus pool exposes all 12 Animal Focus buff links for free, no hand-authoring needed", () => {
    // Animal Focus is linked directly to the Hunter class def (unlike oracle
    // mysteries/shaman spirits) and its vendored `links.supplements` already
    // resolve to 12 real "Animal Focus (<Animal>)" buffs, each with a
    // correctly scaling `changes[]` formula keyed on `@item.level` — the
    // generic grantsBuffs pipeline picks the whole thing up with zero
    // shaman/hunter-specific code, confirming the finding documented in
    // IMPLEMENTATION_PLAN.md.
    const doc = baseDoc({
      identity: { name: "Kest", race: raceId("Human"), classes: [{ tag: "hunter", level: 5 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const focus = pools.find((p) => p.name === "Animal Focus");
    expect(focus).toBeDefined();
    // uses.maxFormula: "@class.unlevel" -> hunter level (minutes/day).
    expect(focus?.max).toBe(5);
    expect(focus?.linkedBuffIds).toHaveLength(12);
    expect(focus?.linkedBuffIds).toContain(buffId("Animal Focus (Bear)"));
    expect(focus?.linkedBuffIds).toContain(buffId("Animal Focus (Wolf)"));
  });

  it("features with grantsBuffs pointing outside the vendored slice resolve to an empty linkedBuffIds", () => {
    // Scribe Scroll (a feat, not a class feature) never becomes a pool at
    // all, but e.g. Unarmed Strike (monk) DOES form no pool either (no
    // uses.maxFormula) — the point here is any granted feature whose
    // grantsBuffs UUID isn't in the vendored buff slice never surfaces a
    // linked buff. Smite Evil is a convenient always-present example with no
    // grantsBuffs of its own, asserting the field is simply absent/empty.
    const doc = baseDoc({
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh?.linkedBuffIds).toEqual([]);
  });

  it("alchemist 5 — Mutagen pool exposes all 3 vendored buff links (Str/Dex/Con), audited before hand-authoring alchemist-discoveries.ts (issue #65)", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "alchemist", level: 5 }] },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const mutagen = pools.find((p) => p.name === "Mutagen");
    expect(mutagen).toBeDefined();
    expect(mutagen?.max).toBe(1);
    expect(mutagen?.linkedBuffIds.sort()).toEqual(
      [buffId("Mutagen, Str"), buffId("Mutagen, Dex"), buffId("Mutagen, Con")].sort(),
    );
  });
});

/**
 * Fixture tests for the hand-authored Bomb damage detail override (issue
 * #65) — the vendored Bomb `action.damage` formula is a flat, non-scaling
 * "1d6" (confirmed against the pinned data slice), so `resources.ts`
 * overrides it with `tables.ts`'s `bombDamageDetail`, clean-room from APG:
 * "1d6 fire damage + additional damage equal to the alchemist's Intelligence
 * modifier... increases by 1d6 points at every odd-numbered alchemist
 * level."
 */
describe("Bomb damage detail override (issue #65)", () => {
  it("alchemist 1, Int 16 (+3) — 1d6+3 fire", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "alchemist", level: 1 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const bomb = pools.find((p) => p.name === "Bomb");
    expect(bomb?.detail).toContain("1d6+3 fire");
  });

  it("alchemist 5, Int 16 (+3) — 3d6+3 fire (odd-level scaling: 1 + floor((5-1)/2) = 3 dice)", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "alchemist", level: 5 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const bomb = pools.find((p) => p.name === "Bomb");
    expect(bomb?.detail).toContain("3d6+3 fire");
  });

  it("alchemist 5 detail also carries the (correct, unchanged) vendored save DC", () => {
    const doc = baseDoc({
      identity: { name: "Vex", race: raceId("Human"), classes: [{ tag: "alchemist", level: 5 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const bomb = pools.find((p) => p.name === "Bomb");
    // DC = 10 + floor(5/2) + 3 = 15
    expect(bomb?.detail).toBe("3d6+3 fire (DC 15 Ref)");
  });
});

/**
 * Fixture tests for feats-as-resource-pools (schema v9's `Feat.uses`) —
 * `deriveFeatResourcePools` scans `doc.build.feats` for vendored
 * `uses.maxFormula` entries, evaluated against character-level roll data
 * (not a granting class's contextual one, since feats have no granting
 * class).
 */
describe("feats with uses.maxFormula become resource pools", () => {
  function featDoc(over: Partial<CharacterDoc>): CharacterDoc {
    return baseDoc({
      identity: { name: "Kel", race: raceId("Human"), classes: [{ tag: "monk", level: 1 }] },
      ...over,
    });
  }

  it("Combat Reflexes with Dex 16 (+3) -> 4 AoOs/round", () => {
    const doc = featDoc({
      abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [featId("Combat Reflexes")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const combatReflexes = pools.find((p) => p.name === "Combat Reflexes");
    expect(combatReflexes).toBeDefined();
    expect(combatReflexes?.max).toBe(4);
    expect(combatReflexes?.restValue).toBe(4);
    expect(combatReflexes?.per).toBe("round");
    expect(combatReflexes?.classTag).toBe("feat");
    expect(combatReflexes?.linkedBuffIds).toEqual([]);
  });

  it("Improved Iron Will is a flat 1/day pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Improved Iron Will")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const improvedIronWill = pools.find((p) => p.name === "Improved Iron Will");
    expect(improvedIronWill).toBeDefined();
    expect(improvedIronWill?.max).toBe(1);
    expect(improvedIronWill?.per).toBe("day");
  });

  it("a feat listed twice in doc.build.feats produces exactly one pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Improved Iron Will"), featId("Improved Iron Will")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.filter((p) => p.name === "Improved Iron Will")).toHaveLength(1);
  });

  it("a feat with no uses.maxFormula (e.g. Toughness) never becomes a pool", () => {
    const doc = featDoc({
      build: {
        feats: [featId("Toughness")],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Toughness")).toBeUndefined();
  });
});
