import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, compute, RAGE_POWER_IDS, RAGE_POWERS } from "../src/index.js";

/**
 * Fixture coverage for the rage-power table + picker plumbing (issue #65/#67).
 * Most entries are `displayOnly` (see `rage-powers.ts`'s doc comment); a
 * small set (Raging Climber, Raging Swimmer, Swift Foot) was promoted to a
 * real buff-gated `Change` by issue #75, and a further set by the #74
 * parity-sweep batch-1 (A-F) pass (Beast Totem, Celestial Blood, Chaos
 * Totem, Draconic Blood, Earth Totem, plus the three Linnorm Death Curses'
 * UNCONDITIONAL — not rage-gated — damage Changes), batch-2 (G-R) pass
 * (Greater Abyssal Blood, Greater Chaos Totem, Greater Sun Totem, Greater
 * Undead Blood, Infernal Blood, Lesser Sun Totem, Lesser Moon Totem, Night
 * Vision, Raging Flyer, plus Ice Linnorm Death Curse's UNCONDITIONAL damage
 * Change), and batch-3 (S-Z) pass, which closed out full vendored parity
 * (Sun Totem, Unrestrained Rage, plus a legacy revisit that promoted the two
 * original-29-entry rows Low-Light Vision and Scent) — see
 * `rageBuffGate.test.ts` for that mechanism's dedicated fixture coverage
 * (raging vs. not, typed stacking). These tests cover: table shape/count,
 * shared-editions availability, gating on barbarian levels (either edition)
 * in `collectGrantedFeatures`, and that picked powers surface on
 * `DerivedSheet.classFeatures` with a "Rage Power" origin label.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: { classTag: string; level: number; ragePowers?: string[] }): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: over.classTag, level: over.level }],
    },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ragePowers: over.ragePowers,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// Promoted by issue #75 (while-raging buff gate) or the #74 parity-sweep
// batch-1 (A-F) / batch-2 (G-R) / batch-3 (S-Z) passes — see
// rageBuffGate.test.ts.
//
// Choose-one powers (`choiceChanges` keyed off `build.pickChoices`) also
// count as promoted even when their unconditional `changes` list is empty —
// they move real numbers once the pick is stored.
const CHOICE_PROMOTED_IDS = new Set([
  "energyResistance",
  "elementalBlood",
  "greaterElementalBlood",
]);
const PROMOTED_IDS = new Set([
  "ragingClimber",
  "ragingSwimmer",
  "swiftFoot",
  "beastTotem",
  "celestialBlood",
  "chaosTotem",
  "draconicBlood",
  "earthTotem",
  "cairnLinnormDeathCurse",
  "cragLinnormDeathCurse",
  "fjordLinnormDeathCurse",
  "greaterAbyssalBlood",
  "greaterChaosTotem",
  "greaterSunTotem",
  "greaterUndeadBlood",
  "infernalBlood",
  "lesserSunTotem",
  "lesserMoonTotem",
  "nightVision",
  "ragingFlyer",
  "iceLinnormDeathCurse",
  "sunTotem",
  "unrestrainedRage",
  "taigaLinnormDeathCurse",
  "tarnLinnormDeathCurse",
  "torLinnormDeathCurse",
  "lowLightVision",
  "scent",
]);

describe("RAGE_POWERS table", () => {
  it("has 243 entries, every one available to both editions; every entry is displayOnly with no changes EXCEPT the promoted set", () => {
    expect(RAGE_POWER_IDS).toHaveLength(243);
    for (const id of RAGE_POWER_IDS) {
      const power = RAGE_POWERS[id]!;
      if (CHOICE_PROMOTED_IDS.has(id)) {
        expect(power.displayOnly).toBe(false);
        expect(power.choiceChanges).toBeDefined();
      } else if (PROMOTED_IDS.has(id)) {
        expect(power.displayOnly).toBe(false);
        expect(power.changes.length).toBeGreaterThan(0);
      } else {
        expect(power.displayOnly).toBe(true);
        expect(power.changes).toEqual([]);
      }
      expect(power.editions).toContain("barbarian");
      expect(power.editions).toContain("barbarianUnchained");
    }
  });

  it("has no duplicate ids or names", () => {
    const names = RAGE_POWER_IDS.map((id) => RAGE_POWERS[id]!.name);
    expect(new Set(RAGE_POWER_IDS).size).toBe(RAGE_POWER_IDS.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("Renewed Vigor gates at 4th level; Animal Fury has no level gate", () => {
    expect(RAGE_POWERS.renewedVigor!.minLevel).toBe(4);
    expect(RAGE_POWERS.animalFury!.minLevel).toBe(1);
  });
});

describe("Rage powers surface on the sheet for both chained and unchained barbarian", () => {
  it("chained barbarian: picked powers appear in classFeatures, tagged Rage Power", () => {
    const doc = makeDoc({
      classTag: "barbarian",
      level: 3,
      ragePowers: ["animalFury", "guardedStance"],
    });
    const sheet = compute(doc, ref);
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Animal Fury");
    expect(names).toContain("Guarded Stance");
  });

  it("unchained barbarian: same table, same wiring", () => {
    const doc = makeDoc({
      classTag: "barbarianUnchained",
      level: 3,
      ragePowers: ["strengthSurge"],
    });
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Strength Surge");
  });

  it("a non-barbarian's stale ragePowers field grants nothing", () => {
    const doc = makeDoc({ classTag: "fighter", level: 5, ragePowers: ["animalFury"] });
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).not.toContain("Animal Fury");
  });

  it("collectGrantedFeatures reports origin.kind 'ragePower' with a Rage Power label", () => {
    const doc = makeDoc({ classTag: "barbarian", level: 3, ragePowers: ["animalFury"] });
    const granted = collectGrantedFeatures(doc, ref);
    const entry = granted.find((g) => g.grant.name === "Animal Fury");
    expect(entry?.origin).toEqual({ kind: "ragePower", label: "Rage Power" });
  });

  it("an unrecognized rage power id is silently ignored (no crash)", () => {
    const doc = makeDoc({ classTag: "barbarian", level: 3, ragePowers: ["not-a-real-power"] });
    expect(() => compute(doc, ref)).not.toThrow();
  });
});
