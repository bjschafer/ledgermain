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
const UNCHAINED = [
  "Barbarian (Unchained)",
  "Monk (Unchained)",
  "Rogue (Unchained)",
  "Summoner (Unchained)",
];
const ALTERNATE = ["Antipaladin", "Ninja", "Samurai"];
const OCCULT = ["Kineticist", "Medium", "Mesmerist", "Occultist", "Psychic", "Spiritualist"];
const PRESTIGE = [
  "Arcane Archer",
  "Arcane Trickster",
  "Assassin",
  "Dragon Disciple",
  "Duelist",
  "Eldritch Knight",
  "Loremaster",
  "Mystic Theurge",
  "Pathfinder Chronicler",
  "Shadowdancer",
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

  it("classifies the Unchained / alternate / Occult Adventures classes, and each exists in the vendored slice", () => {
    for (const [names, category] of [
      [UNCHAINED, "unchained"],
      [ALTERNATE, "alternate"],
      [OCCULT, "occult"],
    ] as const) {
      for (const name of names) {
        expect(CLASS_NAMES.has(name)).toBe(true);
        expect(classCategory({ name })).toBe(category);
      }
    }
  });

  it("classifies the hand-authored prestige classes as prestige, and each exists in the vendored slice (issue #66 chunks 1 + 4)", () => {
    for (const name of PRESTIGE) {
      expect(CLASS_NAMES.has(name)).toBe(true);
      expect(classCategory({ name })).toBe("prestige");
    }
  });

  it("no vendored class falls through to 'other' today (a rename or new vendoring trips this)", () => {
    for (const cls of Object.values(ref.classes)) {
      expect(classCategory(cls)).not.toBe("other");
    }
  });

  it("defaults an unlisted name with no subType to other (an NPC-class name, or a caller that only has a bare name)", () => {
    expect(classCategory({ name: "Adept" })).toBe("other");
    expect(classCategory({ name: "Made-Up Class" })).toBe("other");
  });

  it("classifies EVERY vendored prestige class (issue #74 phase 2c's ~108 splatbook classes, not just the eleven hand-authored ones) as prestige via subType, even with a name not in CLASS_CATEGORY", () => {
    // Horizon Walker is real vendored data (not hand-authored, and not in the
    // CLASS_CATEGORY name table above) — it only resolves to "prestige"
    // because its `subType` is passed through, proving the subType-first
    // check (not the name table) is what makes phase 2c's classes work.
    const horizonWalker = Object.values(ref.classes).find((c) => c.name === "Horizon Walker");
    expect(horizonWalker?.subType).toBe("prestige");
    expect(classCategory(horizonWalker!)).toBe("prestige");
    // But the SAME name with no subType (a bare `{name}` caller) still falls
    // through to "other" — subType is what disambiguates, not the name.
    expect(classCategory({ name: "Horizon Walker" })).toBe("other");
  });
});

describe("groupClassesByCategory", () => {
  it("splits the full vendored slice 11 / 10 / 10 / 4 / 3 / 6 / 119 into ordered sections with no 'other'", () => {
    const groups = groupClassesByCategory(Object.values(ref.classes));
    expect(groups.map((g) => g.category)).toEqual([
      "core",
      "base",
      "hybrid",
      "unchained",
      "alternate",
      "occult",
      "prestige",
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([11, 10, 10, 4, 3, 6, 119]);
  });

  it("orders sections per CLASS_CATEGORY_ORDER and drops empty ones", () => {
    const groups = groupClassesByCategory([{ name: "Warpriest" }, { name: "Fighter" }]);
    expect(groups.map((g) => g.category)).toEqual(["core", "hybrid"]);
    expect(CLASS_CATEGORY_ORDER.indexOf("core")).toBeLessThan(
      CLASS_CATEGORY_ORDER.indexOf("hybrid"),
    );
  });
});
