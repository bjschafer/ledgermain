/**
 * Class category classification (`model/classCategory.ts`): the Core / Base /
 * Hybrid tier tables and the `"other"` fallback, verified against the real
 * vendored class slice so a data-pipeline rename that silently drops a named
 * class to "other" trips a test — same guard shape as `rarity.test.ts`.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  CLASS_CATEGORY_ORDER,
  classCategory,
  groupClassesByCategory,
} from "../src/model/classCategory.js";

const ref = loadRefData();

const CLASS_NAMES = new Set(Object.values(ref.classes).map((c) => c.name));

const CORE = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Wizard",
];
const BASE = [
  "Alchemist",
  "Cavalier",
  "Gunslinger",
  "Inquisitor",
  "Magus",
  "Oracle",
  "Shifter",
  "Summoner",
  "Vigilante",
  "Witch",
];
const HYBRID = [
  "Arcanist",
  "Bloodrager",
  "Brawler",
  "Hunter",
  "Investigator",
  "Shaman",
  "Skald",
  "Slayer",
  "Swashbuckler",
  "Warpriest",
];

describe("classCategory", () => {
  it("classifies every Core Rulebook class as core, and each exists in the vendored slice", () => {
    for (const name of CORE) {
      expect(CLASS_NAMES.has(name)).toBe(true);
      expect(classCategory({ name })).toBe("core");
    }
  });

  it("classifies the APG/UM/UC/UI/UW base classes as base, and each exists in the vendored slice", () => {
    for (const name of BASE) {
      expect(CLASS_NAMES.has(name)).toBe(true);
      expect(classCategory({ name })).toBe("base");
    }
  });

  it("classifies the ACG hybrid classes as hybrid, and each exists in the vendored slice", () => {
    for (const name of HYBRID) {
      expect(CLASS_NAMES.has(name)).toBe(true);
      expect(classCategory({ name })).toBe("hybrid");
    }
  });

  it("no vendored class falls through to 'other' today (a rename or new vendoring trips this)", () => {
    for (const cls of Object.values(ref.classes)) {
      expect(classCategory(cls)).not.toBe("other");
    }
  });

  it("defaults unlisted names (future occult/unchained/prestige vendoring) to other", () => {
    expect(classCategory({ name: "Psychic" })).toBe("other");
    expect(classCategory({ name: "Unchained Monk" })).toBe("other");
  });
});

describe("groupClassesByCategory", () => {
  it("splits the full vendored slice 11 / 10 / 10 into ordered sections with no 'other'", () => {
    const groups = groupClassesByCategory(Object.values(ref.classes));
    expect(groups.map((g) => g.category)).toEqual(["core", "base", "hybrid"]);
    expect(groups.map((g) => g.items.length)).toEqual([11, 10, 10]);
  });

  it("orders sections per CLASS_CATEGORY_ORDER and drops empty ones", () => {
    const groups = groupClassesByCategory([{ name: "Warpriest" }, { name: "Fighter" }]);
    expect(groups.map((g) => g.category)).toEqual(["core", "hybrid"]);
    expect(CLASS_CATEGORY_ORDER.indexOf("core")).toBeLessThan(
      CLASS_CATEGORY_ORDER.indexOf("hybrid"),
    );
  });
});
