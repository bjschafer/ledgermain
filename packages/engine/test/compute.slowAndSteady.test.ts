/**
 * Engine integration fixtures for issue #52 (Slow and Steady): d20pfsrd core
 * Dwarf/Duergar trait, clean-room — "Dwarves have a base speed of 20 feet,
 * but their speed is never modified by armor or encumbrance." Both of the
 * existing land-speed reductions (worn medium/heavy ARMOR, issue #8 — and
 * the optional carrying-capacity encumbrance rule, issue #16) must be
 * skipped for a race with this trait, while every OTHER encumbrance effect
 * (AC max-Dex cap, skill ACP) still applies normally — the trait only
 * exempts speed.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, slowAndSteadySuppressedBy, type AlternateRacialTrait } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  race: string;
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  gear?: ItemInstance[];
  encumbranceEnabled?: boolean;
  racialTraits?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(over.race), classes: over.classes },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      ...(over.racialTraits ? { racialTraits: over.racialTraits } : {}),
      ...(over.encumbranceEnabled !== undefined
        ? { settings: { encumbranceEnabled: over.encumbranceEnabled } }
        : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const ABILITIES: CharacterDoc["abilities"] = {
  str: 16,
  dex: 14,
  con: 14,
  int: 10,
  wis: 10,
  cha: 8,
};

const HEAVY_ARMOR: ItemInstance = {
  equipped: true,
  name: "Full Plate",
  armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
};

describe("compute: Slow and Steady exempts land speed from armor/encumbrance (issue #52)", () => {
  it("a dwarf in heavy armor keeps her full 20 ft base speed (not reduced to 15)", () => {
    const doc = makeDoc({
      race: "Dwarf",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    const sheet = compute(doc, ref);
    expect(sheet.speeds.land).toBe(20);
  });

  it("a dwarf under a heavy carried load (encumbrance rule ON) also keeps 20 ft", () => {
    const doc = makeDoc({
      race: "Dwarf",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      encumbranceEnabled: true,
      gear: [{ equipped: true, name: "Treasure Chest", weight: 999 }],
    });
    const sheet = compute(doc, ref);
    // The encumbrance tier/flag itself is race-independent (still reports the
    // load correctly for display) — only the speed *application* is exempt.
    expect(sheet.encumbrance?.tier).toBe("heavy");
    expect(sheet.encumbrance?.speedPenalty).toBe(true);
    expect(sheet.speeds.land).toBe(20);
  });

  it("a duergar (dwarf subtype) in heavy armor also keeps 20 ft — the exemption follows the subtype, not a hardcoded race name", () => {
    const doc = makeDoc({
      race: "Duergar",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    const sheet = compute(doc, ref);
    expect(sheet.speeds.land).toBe(20);
  });

  it("a non-dwarf (human) in heavy armor is still slowed (30 -> 20), unaffected by the exemption", () => {
    const doc = makeDoc({
      race: "Human",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
    });
    const sheet = compute(doc, ref);
    expect(sheet.speeds.land).toBe(20);
  });

  it("real Dwarf alternate racial traits (Lorekeeper, Steel Soul, Rock Stepper) do not accidentally disable the exemption", () => {
    const doc = makeDoc({
      race: "Dwarf",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      gear: [HEAVY_ARMOR],
      racialTraits: ["dwarf-lorekeeper", "dwarf-steel-soul", "dwarf-rock-stepper"],
    });
    const sheet = compute(doc, ref);
    expect(sheet.speeds.land).toBe(20);
  });

  it("encumbrance's OTHER effects (AC max-Dex cap, skill ACP) still apply to a dwarf — only speed is exempt", () => {
    const doc = makeDoc({
      race: "Dwarf",
      classes: [{ tag: "fighter", level: 1 }],
      abilities: ABILITIES,
      encumbranceEnabled: true,
      gear: [{ equipped: true, name: "Treasure Chest", weight: 999 }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.acp).toBeLessThan(0);
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(sheet.encumbrance?.maxDexCap);
  });
});

describe("slowAndSteadySuppressedBy: an alternate racial trait CAN swap the trait away (issue #52 hook)", () => {
  // No published Dwarf alternate racial trait actually replaces Slow and
  // Steady per d20pfsrd (Lorekeeper/Steel Soul/Rock Stepper replace
  // Greed/Hardy/Stonecunning instead), so `RACIAL_TRAITS` carries no such
  // entry today. This exercises the suppression mechanism itself with a
  // synthetic trait, standing in for the "dwarf who swapped it away" case
  // the mechanism exists to support.
  const fakeTraitThatSwapsItAway: AlternateRacialTrait = {
    id: "test-only-swap",
    race: "Dwarf",
    name: "Test-Only Swap",
    summary: "test fixture only",
    replaces: ["Slow and Steady"],
    changes: [],
    suppressTargets: ["slowAndSteady"],
  };

  it("is false with no active traits", () => {
    expect(slowAndSteadySuppressedBy([])).toBe(false);
  });

  it("is false when active traits don't target the slowAndSteady hook (e.g. real Rock Stepper)", () => {
    const rockStepper: AlternateRacialTrait = {
      id: "dwarf-rock-stepper",
      race: "Dwarf",
      name: "Rock Stepper",
      summary: "test fixture",
      replaces: ["Stonecunning"],
      changes: [],
    };
    expect(slowAndSteadySuppressedBy([rockStepper])).toBe(false);
  });

  it("is true once an active trait suppresses the slowAndSteady target", () => {
    expect(slowAndSteadySuppressedBy([fakeTraitThatSwapsItAway])).toBe(true);
  });
});
