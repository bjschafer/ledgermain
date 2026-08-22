import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { generateConsumables } from "../src/model/consumables.js";
import { spendMoney } from "../src/model/doc.js";
import { castableSpellsFor } from "../src/model/knownSpells.js";
import {
  craftableKinds,
  craftCost,
  craftDC,
  craftedItemName,
  craftSources,
  craftTimeLabel,
  generateCraftEntries,
  resolveCraftCasterLevel,
} from "../src/model/crafting.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function spellId(name: string): string {
  const entry = Object.entries(ref.spells).find(([, s]) => s.name === name);
  if (!entry) throw new Error(`spell not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  feats?: string[];
  known?: string[];
  money?: { pp?: number; gp?: number; sp?: number; cp?: number };
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 14, cha: 14 },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: over.known ?? [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      money: over.money,
    },
  };
}

function sheetFor(doc: CharacterDoc) {
  return compute(doc, ref);
}

describe("craftableKinds", () => {
  it("counts the wizard's class-granted Scribe Scroll", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 3 }] });
    expect([...craftableKinds(doc, ref)]).toEqual(["scroll"]);
  });

  it("counts chosen item-creation feats alongside granted ones", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 5 }],
      feats: [featId("Brew Potion"), featId("Craft Wand")],
    });
    expect([...craftableKinds(doc, ref)].sort()).toEqual(["potion", "scroll", "wand"]);
  });

  it("is empty for a character with no item-creation feat", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 5 }] });
    expect(craftableKinds(doc, ref).size).toBe(0);
  });
});

describe("craft arithmetic (PF1 Core Rulebook, Magic Item Creation)", () => {
  it("costs half the market price", () => {
    expect(craftCost(375)).toBe(187.5);
    expect(craftCost(25)).toBe(12.5);
  });

  it("sets the Spellcraft DC at 5 + the item's caster level", () => {
    expect(craftDC(1)).toBe(6);
    expect(craftDC(5)).toBe(10);
    expect(craftDC(17)).toBe(22);
  });

  it("takes 2 hours for a scroll or potion at 250 gp or less", () => {
    expect(craftTimeLabel("scroll", 25)).toBe("2 hours"); // CL 1 1st-level scroll
    expect(craftTimeLabel("scroll", 250)).toBe("2 hours");
    expect(craftTimeLabel("potion", 50)).toBe("2 hours");
  });

  it("takes 1 day per 1,000 gp above that", () => {
    expect(craftTimeLabel("scroll", 375)).toBe("1 day"); // CL 5 3rd-level scroll
    expect(craftTimeLabel("scroll", 1125)).toBe("2 days");
    expect(craftTimeLabel("potion", 750)).toBe("1 day"); // CL 5 3rd-level potion
  });

  it("gives a wand no short-form clause: always at least a day", () => {
    expect(craftTimeLabel("wand", 750)).toBe("1 day"); // CL 1 1st-level wand
    expect(craftTimeLabel("wand", 11250)).toBe("12 days"); // CL 5 3rd-level wand
  });
});

describe("resolveCraftCasterLevel", () => {
  it("defaults to the cheapest legal version", () => {
    expect(resolveCraftCasterLevel(3, "min", 20)).toBe(5);
    expect(resolveCraftCasterLevel(0, "min", 20)).toBe(1);
  });

  it("clamps a pick up to the spell level's minimum", () => {
    // No one makes a CL 2 scroll of a 3rd-level spell: 5 is the floor.
    expect(resolveCraftCasterLevel(3, 2, 20)).toBe(5);
  });

  it("clamps a pick down to the crafter's own caster level", () => {
    expect(resolveCraftCasterLevel(1, 12, 7)).toBe(7);
  });
});

describe("craftedItemName", () => {
  it("names a minimum-CL scroll by its tradition alone", () => {
    expect(craftedItemName("Scroll of", "Fireball", "scroll", "arcane", 5, 5)).toBe(
      "Scroll of Fireball (arcane)",
    );
  });

  it("appends the caster level only when it is above the minimum", () => {
    expect(craftedItemName("Scroll of", "Dispel Magic", "scroll", "arcane", 10, 5)).toBe(
      "Scroll of Dispel Magic (arcane, CL 10)",
    );
  });

  it("leaves potions untagged: anyone can drink one", () => {
    expect(craftedItemName("Potion of", "Cure Light Wounds", "potion", "divine", 1, 1)).toBe(
      "Potion of Cure Light Wounds",
    );
  });
});

describe("castableSpellsFor", () => {
  it("gives a prepare-from-list caster their whole accessible class list", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 5 }] });
    const { byId, accessible } = castableSpellsFor(doc, ref, sheetFor(doc), "cleric");
    // Cleric 5 casts through 3rd level.
    expect(accessible).toEqual([0, 1, 2, 3]);
    expect(byId.get(spellId("Cure Light Wounds"))).toBe(1);
    // Restoration is a 4th-level cleric spell, still out of reach at 5th.
    expect(byId.has(spellId("Restoration"))).toBe(false);
  });

  it("gives a spellbook caster their own book plus free cantrips", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 5 }],
      known: [spellId("Fireball")],
    });
    const { byId } = castableSpellsFor(doc, ref, sheetFor(doc), "wizard");
    expect(byId.get(spellId("Fireball"))).toBe(3);
    expect(byId.get(spellId("Detect Magic"))).toBe(0);
    // Not in the spellbook, so not scribable however common it is.
    expect(byId.has(spellId("Magic Missile"))).toBe(false);
  });
});

describe("craftSources", () => {
  it("reports each caster class's own caster level and tradition", () => {
    const doc = makeDoc({
      classes: [
        { tag: "wizard", level: 5 },
        { tag: "cleric", level: 3 },
      ],
      known: [spellId("Fireball")],
    });
    const sources = craftSources(doc, ref, sheetFor(doc));
    expect(sources.map((s) => [s.classTag, s.casterLevel, s.tradition])).toEqual([
      ["wizard", 5, "arcane"],
      ["cleric", 3, "divine"],
    ]);
  });

  it("drops a class that cannot cast yet", () => {
    // Paladin casting starts at 4th; a 3rd-level paladin has CL 0.
    const doc = makeDoc({ classes: [{ tag: "paladin", level: 3 }] });
    expect(craftSources(doc, ref, sheetFor(doc))).toEqual([]);
  });
});

describe("generateCraftEntries", () => {
  it("prices from the crafter's own list level, not the cheapest in print", () => {
    // Stoneskin is 5th on the druid list (CL 9 minimum) but 3rd on the
    // summoner's, so a market scroll is 3 × 5 × 25 = 375 gp while the druid's
    // own is 5 × 9 × 25 = 1,125 gp, half of which is 562.5 gp to scribe.
    const doc = makeDoc({ classes: [{ tag: "druid", level: 9 }] });
    const source = craftSources(doc, ref, sheetFor(doc))[0]!;
    const entry = generateCraftEntries(source, ref.spells, "scroll", "min").find(
      (e) => e.spellName === "Stoneskin",
    );
    expect(entry).toBeDefined();
    expect(entry!.spellLevel).toBe(5);
    expect(entry!.casterLevel).toBe(9);
    expect(entry!.price).toBe(1125);
    expect(entry!.cost).toBe(562.5);
    expect(entry!.dc).toBe(14);
    expect(entry!.time).toBe("2 days");
    expect(entry!.needsMaterial).toBe(true);

    const market = generateConsumables(ref.spells, "scroll").find(
      (e) => e.spellName === "Stoneskin",
    );
    expect(market!.price).toBe(375);
  });

  it("raises the price when built above the minimum caster level", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 10 }],
      known: [spellId("Fireball")],
    });
    const source = craftSources(doc, ref, sheetFor(doc))[0]!;
    const min = generateCraftEntries(source, ref.spells, "scroll", "min").find(
      (e) => e.spellName === "Fireball",
    )!;
    const full = generateCraftEntries(source, ref.spells, "scroll", 10).find(
      (e) => e.spellName === "Fireball",
    )!;
    expect(min.casterLevel).toBe(5);
    expect(min.price).toBe(375); // 3 × 5 × 25
    expect(full.casterLevel).toBe(10);
    expect(full.price).toBe(750); // 3 × 10 × 25
    expect(full.cost).toBe(375);
    expect(full.name).toBe("Scroll of Fireball (arcane, CL 10)");
  });

  it("lists only spells the crafter can cast unless asked otherwise", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 5 }],
      known: [spellId("Fireball")],
    });
    const source = craftSources(doc, ref, sheetFor(doc))[0]!;
    const mine = generateCraftEntries(source, ref.spells, "scroll", "min");
    expect(mine.every((e) => e.castable)).toBe(true);
    expect(mine.some((e) => e.spellName === "Magic Missile")).toBe(false);

    const all = generateCraftEntries(source, ref.spells, "scroll", "min", true);
    const missile = all.find((e) => e.spellName === "Magic Missile");
    expect(missile).toBeDefined();
    expect(missile!.castable).toBe(false);
  });

  it("honours each kind's spell-level cap", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 20 }] });
    const source = craftSources(doc, ref, sheetFor(doc))[0]!;
    const wands = generateCraftEntries(source, ref.spells, "wand", "min");
    expect(wands.length).toBeGreaterThan(0);
    expect(wands.every((e) => e.spellLevel <= 4)).toBe(true);
    const potions = generateCraftEntries(source, ref.spells, "potion", "min");
    expect(potions.every((e) => e.spellLevel <= 3)).toBe(true);
  });

  it("gives every wand its 50 charges", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 5 }] });
    const source = craftSources(doc, ref, sheetFor(doc))[0]!;
    const wand = generateCraftEntries(source, ref.spells, "wand", "min").find(
      (e) => e.spellName === "Cure Light Wounds",
    )!;
    expect(wand.charges).toBe(50);
    expect(wand.price).toBe(750); // 1 × 1 × 750
    expect(wand.cost).toBe(375);
  });
});

describe("spendMoney", () => {
  it("breaks platinum only as far as paying requires", () => {
    const doc = makeDoc({ classes: [], money: { pp: 1, gp: 5 } });
    // 1,500 cp on hand, 1,250 cp spent, 250 cp back as 2 gp 5 sp.
    expect(spendMoney(doc, 12.5)?.live.money).toEqual({ gp: 2, sp: 5 });
  });

  it("leaves platinum alone when the remainder covers it", () => {
    const doc = makeDoc({ classes: [], money: { pp: 2, gp: 50 } });
    expect(spendMoney(doc, 5)?.live.money).toEqual({ pp: 2, gp: 45 });
  });

  it("refuses rather than overdrawing", () => {
    const doc = makeDoc({ classes: [], money: { gp: 10 } });
    expect(spendMoney(doc, 12.5)).toBeNull();
  });

  it("pays an exact purse down to nothing", () => {
    const doc = makeDoc({ classes: [], money: { gp: 10 } });
    expect(spendMoney(doc, 10)?.live.money).toBeUndefined();
  });
});
