/**
 * Race rarity classification (`model/rarity.ts`): the Core / Featured /
 * Uncommon tier tables and the `"exotic"` fallback, verified against the real
 * vendored race slice so a data-pipeline rename that silently drops a named
 * race to "exotic" trips a test.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { groupRacesByRarity, RARITY_ORDER, raceRarity } from "../src/model/rarity.js";

const ref = loadRefData();

/** All vendored race names, for existence guards below. */
const RACE_NAMES = new Set(Object.values(ref.races).map((r) => r.name));

describe("raceRarity", () => {
  it("classifies every Core Rulebook race as core", () => {
    for (const name of ["Dwarf", "Elf", "Gnome", "Half-Elf", "Half-Orc", "Halfling", "Human"]) {
      expect(RACE_NAMES.has(name)).toBe(true);
      expect(raceRarity({ name })).toBe("core");
    }
  });

  it("classifies ARG featured/uncommon races into their tiers", () => {
    expect(raceRarity({ name: "Aasimar" })).toBe("featured");
    expect(raceRarity({ name: "Tiefling" })).toBe("featured");
    expect(raceRarity({ name: "Drow" })).toBe("featured");
    expect(raceRarity({ name: "Kitsune" })).toBe("uncommon");
    expect(raceRarity({ name: "Svirfneblin" })).toBe("uncommon");
  });

  it("defaults the late-vendored planar/monstrous races to exotic", () => {
    // The owner's own examples of the mixing problem this fixes.
    expect(raceRarity({ name: "Android" })).toBe("exotic");
    expect(raceRarity({ name: "Aphorite" })).toBe("exotic");
    // Monstrous variants of a classified race stay exotic, not inherited.
    expect(raceRarity({ name: "Drow Noble" })).toBe("exotic");
    expect(raceRarity({ name: "Reborn Samsaran" })).toBe("exotic");
  });

  it("resolves every named core/featured/uncommon race against vendored data", () => {
    // Guards against a data rename silently demoting a classified race: every
    // race we deliberately place in a non-exotic tier must exist by that name.
    const named = Object.values(ref.races).filter((r) => raceRarity(r) !== "exotic");
    expect(named.length).toBe(7 + 16 + 14);
  });

  it("assigns a valid tier to every vendored race", () => {
    for (const race of Object.values(ref.races)) {
      expect(RARITY_ORDER).toContain(raceRarity(race));
    }
  });
});

describe("groupRacesByRarity", () => {
  it("buckets the full race slice into ordered, non-empty tiers", () => {
    const entries = Object.entries(ref.races);
    const groups = groupRacesByRarity(entries);
    expect(groups.map((g) => g.category)).toEqual(["core", "featured", "uncommon", "exotic"]);
    // Every race lands in exactly one section.
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(entries.length);
    expect(groups[0]?.items.length).toBe(7); // core
  });

  it("drops empty tiers when a filtered subset has no core races", () => {
    const exoticOnly = Object.entries(ref.races).filter(([, r]) => raceRarity(r) === "exotic");
    const groups = groupRacesByRarity(exoticOnly);
    expect(groups.map((g) => g.category)).toEqual(["exotic"]);
  });
});
