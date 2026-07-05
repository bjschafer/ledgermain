import { describe, expect, it } from "bun:test";

import type { Spell } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  consumablePrice,
  effectiveSpellLevel,
  generateConsumables,
  isConsumableEligible,
  minCasterLevel,
} from "../src/model/consumables.js";

const ref = loadRefData();

function spellByName(name: string): Spell {
  const s = Object.values(ref.spells).find((sp) => sp.name === name);
  if (!s) throw new Error(`spell not found: ${name}`);
  return s;
}

describe("minCasterLevel", () => {
  it("uses CL 1 for a 0-level cantrip", () => {
    expect(minCasterLevel(0)).toBe(1);
  });

  it("uses 2·level − 1 (odd caster levels) for real spell levels", () => {
    expect(minCasterLevel(1)).toBe(1);
    expect(minCasterLevel(2)).toBe(3);
    expect(minCasterLevel(3)).toBe(5);
    expect(minCasterLevel(4)).toBe(7);
    expect(minCasterLevel(9)).toBe(17);
  });
});

describe("consumablePrice (PF1 item-creation tables)", () => {
  it("prices potions at spell level × CL × 50", () => {
    expect(consumablePrice("potion", 1)).toBe(50); // 1 × 1 × 50
    expect(consumablePrice("potion", 2)).toBe(300); // 2 × 3 × 50
    expect(consumablePrice("potion", 3)).toBe(750); // 3 × 5 × 50
    expect(consumablePrice("potion", 0)).toBe(25); // ½ × 1 × 50
  });

  it("prices scrolls at spell level × CL × 25", () => {
    expect(consumablePrice("scroll", 1)).toBe(25);
    expect(consumablePrice("scroll", 3)).toBe(375); // 3 × 5 × 25 (Scroll of Fireball)
    expect(consumablePrice("scroll", 0)).toBe(12.5); // ½ × 1 × 25
  });

  it("prices wands at spell level × CL × 750", () => {
    expect(consumablePrice("wand", 1)).toBe(750); // Wand of Cure Light Wounds
    expect(consumablePrice("wand", 4)).toBe(21000); // 4 × 7 × 750
  });
});

describe("effectiveSpellLevel", () => {
  it("takes the lowest level any class learns the spell at", () => {
    // Cure Light Wounds is 1st for clerics/etc, 2nd for rangers → 1.
    expect(effectiveSpellLevel(spellByName("Cure Light Wounds"))).toBe(1);
  });

  it("reads Fireball as a 3rd-level spell", () => {
    expect(effectiveSpellLevel(spellByName("Fireball"))).toBe(3);
  });
});

describe("isConsumableEligible", () => {
  it("makes touch/personal spells ≤3 into potions", () => {
    expect(isConsumableEligible(spellByName("Cure Light Wounds"), "potion")).toBe(true);
    expect(isConsumableEligible(spellByName("Mage Armor"), "potion")).toBe(true);
    expect(isConsumableEligible(spellByName("Shield"), "potion")).toBe(true);
  });

  it("excludes area/ranged spells from potions", () => {
    // Fireball is a long-range area spell — no Potion of Fireball.
    expect(isConsumableEligible(spellByName("Fireball"), "potion")).toBe(false);
  });

  it("caps potions at 3rd level and wands at 4th", () => {
    const fly = spellByName("Fly"); // 3rd level, touch → potion ok
    expect(isConsumableEligible(fly, "potion")).toBe(true);
    // A 5th-level+ spell is never a potion or a wand but is always a scroll.
    const highScroll = Object.values(ref.spells).find(
      (s) => effectiveSpellLevel(s) === 5 && s.actions.length > 0,
    );
    expect(highScroll).toBeDefined();
    expect(isConsumableEligible(highScroll!, "potion")).toBe(false);
    expect(isConsumableEligible(highScroll!, "wand")).toBe(false);
    expect(isConsumableEligible(highScroll!, "scroll")).toBe(true);
  });
});

describe("generateConsumables", () => {
  it("produces a named, priced Potion of Cure Light Wounds (50 gp)", () => {
    const potions = generateConsumables(ref.spells, "potion");
    const clw = potions.find((p) => p.spellName === "Cure Light Wounds");
    expect(clw).toBeDefined();
    expect(clw!.name).toBe("Potion of Cure Light Wounds");
    expect(clw!.price).toBe(50);
    expect(clw!.casterLevel).toBe(1);
    expect(clw!.charges).toBeUndefined();
  });

  it("gives wands 50 charges and Wand-of pricing", () => {
    const wands = generateConsumables(ref.spells, "wand");
    const clw = wands.find((w) => w.spellName === "Cure Light Wounds");
    expect(clw).toBeDefined();
    expect(clw!.name).toBe("Wand of Cure Light Wounds");
    expect(clw!.price).toBe(750);
    expect(clw!.charges).toBe(50);
  });

  it("returns entries sorted by name with no Potion of Fireball", () => {
    const potions = generateConsumables(ref.spells, "potion");
    expect(potions.some((p) => p.spellName === "Fireball")).toBe(false);
    const names = potions.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("offers scrolls for every spell level (0 through 9)", () => {
    const scrolls = generateConsumables(ref.spells, "scroll");
    const levels = new Set(scrolls.map((s) => s.spellLevel));
    for (const lvl of [0, 1, 5, 9]) expect(levels.has(lvl)).toBe(true);
  });
});
