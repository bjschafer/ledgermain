import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  collectCompanionMasterEffects,
  companionEffectiveLevel,
  deriveCompanion,
} from "../src/index.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.values(ref.feats).find((f) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry.id;
}

function makeDoc(overrides: {
  classes: { tag: string; level: number }[];
  feats?: string[];
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
      feats: overrides.feats ?? [],
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

describe("collectCompanionMasterEffects — feat entries", () => {
  it("resolves nothing for a character with no companion-affecting feats", () => {
    const doc = makeDoc({ classes: [{ tag: "druid", level: 7 }] });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(0);
    expect(master.bonusLevels).toBe(0);
    expect(master.buffs).toEqual([]);
    expect(master.bonusTricks).toBe(0);
    expect(master.bonusFeats).toBe(0);
  });

  it("Boon Companion via the table matches the legacy hasBoonCompanion boolean exactly", () => {
    // Druid 7 / Fighter 4 with nature-bond: base 7, +4 = 11, character level
    // 11 leaves room — CRB "Boon Companion" ("as though your class were 4
    // levels higher, to a maximum effective druid level equal to your
    // character level").
    const doc = makeDoc({
      classes: [
        { tag: "druid", level: 7 },
        { tag: "fighter", level: 4 },
      ],
      feats: [featId("Boon Companion")],
      animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.bonusLevels).toBe(4);
    expect(master.grantLevels).toBe(0);
    expect(companionEffectiveLevel(doc, false, master)).toBe(11);
    expect(companionEffectiveLevel(doc, false, master)).toBe(companionEffectiveLevel(doc, true));
  });

  it("Boon Companion alone never creates a companion (bonus, not grant)", () => {
    // Fighter 5 with the feat but no companion class source: still level 0.
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      feats: [featId("Boon Companion")],
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(companionEffectiveLevel(doc, false, master)).toBe(0);
  });

  it("Animal Ally grants a companion with no class source at all (character level − 3)", () => {
    // Fighter 7 with Animal Ally: effective druid level 7 − 3 = 4 — feat
    // text "You gain an animal companion as if you were a druid of your
    // character level −3".
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 7 }],
      feats: [featId("Animal Ally")],
      animalCompanion: { speciesId: "wolf", name: "Rex", source: [] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.grantLevels).toBe(4);
    expect(companionEffectiveLevel(doc, false, master)).toBe(4);
    const companion = deriveCompanion(doc, buildRollData(doc, ref), false, false, master);
    expect(companion).toBeDefined();
    expect(companion!.level).toBe(4);
    // CRB companion table, effective level 4: HD 4, BAB +3 (3/4 of 4).
    expect(companion!.hd).toBe(4);
    expect(companion!.bab).toBe(3);
  });

  it("Animal Ally stacks with a class source, capped at total character level", () => {
    // Druid 5 / Fighter 2 with Animal Ally: nature-bond 5 + grant (7 − 3 = 4)
    // = 9, capped at character level 7 — feat text "the effective druid
    // level granted by this feat stacks with that granted by other sources"
    // plus the standing character-level cap.
    const doc = makeDoc({
      classes: [
        { tag: "druid", level: 5 },
        { tag: "fighter", level: 2 },
      ],
      feats: [featId("Animal Ally")],
      animalCompanion: { speciesId: "wolf", name: "Rex", source: ["nature-bond"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(companionEffectiveLevel(doc, false, master)).toBe(7);
  });
});

describe("collectCompanionMasterEffects — archetype entries", () => {
  it("Brute Steed (cavalier fell rider): +2 Str / −2 Dex on the mount's own scores", () => {
    // Cavalier 4 wolf mount (Str 13 → 15, Dex 15 → 13 at effective level 4:
    // wolf base Str 13 Dex 15, table adj +1 to both at L4 per the CRB
    // companion table... verified below against the no-archetype baseline
    // rather than re-deriving the whole stack by hand).
    const base = makeDoc({
      classes: [{ tag: "cavalier", level: 4 }],
      animalCompanion: { speciesId: "wolf", name: "Nightmare", source: ["cavalier-mount"] },
    });
    const withArch = { ...base, build: { ...base.build, archetypes: ["cavalier:fell-rider"] } };
    const plain = deriveCompanion(base, buildRollData(base, ref), false, false);
    const master = collectCompanionMasterEffects(withArch, ref);
    expect(master.buffs).toHaveLength(1);
    const brute = deriveCompanion(withArch, buildRollData(withArch, ref), false, false, master);
    expect(brute!.abilities.str.score).toBe(plain!.abilities.str.score + 2);
    expect(brute!.abilities.dex.score).toBe(plain!.abilities.dex.score - 2);
  });

  it("archetype entries gate on the owning class's level (minLevel)", () => {
    // Beast-master ranger 11 with hunters-bond: Strong Bond (12th) not yet —
    // effective level stays 11 − 3 = 8.
    const at11 = makeDoc({
      classes: [{ tag: "ranger", level: 11 }],
      archetypes: ["ranger:beast-master"],
      animalCompanion: { speciesId: "wolf", name: "Kodo", source: ["hunters-bond"] },
    });
    expect(companionEffectiveLevel(at11, false, collectCompanionMasterEffects(at11, ref))).toBe(8);
    // At 12th, Strong Bond's +3 undoes the −3 offset: "The ranger's
    // effective druid level for his animal companions is now equal to his
    // ranger level."
    const at12 = makeDoc({
      classes: [{ tag: "ranger", level: 12 }],
      archetypes: ["ranger:beast-master"],
      animalCompanion: { speciesId: "wolf", name: "Kodo", source: ["hunters-bond"] },
    });
    expect(companionEffectiveLevel(at12, false, collectCompanionMasterEffects(at12, ref))).toBe(12);
  });

  it("archetype entries require the archetype to be chosen", () => {
    const doc = makeDoc({
      classes: [{ tag: "cavalier", level: 4 }],
      animalCompanion: { speciesId: "wolf", name: "Nightmare", source: ["cavalier-mount"] },
    });
    const master = collectCompanionMasterEffects(doc, ref);
    expect(master.buffs).toEqual([]);
  });
});
