/**
 * Purchase pricing: what each add flow charges, and what paying does to the
 * purse. Expected values are the published PF1 prices for the worked examples
 * (Core Rulebook: armor and weapon tables, Magic Items → Magic Armor / Magic
 * Weapons), computed by hand here rather than read back from the data.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { ArmorRef, Item, WeaponRef } from "@pf1/schema";

import { buildAbilityCatalog } from "../src/model/abilities.js";
import { createEmptyDoc, setMoney } from "../src/model/doc.js";
import { isKit } from "../src/model/kits.js";
import {
  addPaying,
  armorQuote,
  customQuote,
  formatGp,
  itemQuote,
  kitQuote,
  purseGp,
  weaponQuote,
} from "../src/model/purchase.js";

const ref = loadRefData();
const catalog = buildAbilityCatalog(ref.itemAbilities);

/** "Kit, Wizard's" — the worked example in the kit rules. */
const WIZARD_KIT = "CDQCyfYfW9aneX9e";

function armor(name: string): ArmorRef {
  const found = Object.values(ref.armors).find((a) => a.name === name);
  if (!found) throw new Error(`no armor named ${name}`);
  return found;
}

function weapon(name: string): WeaponRef {
  const found = Object.values(ref.weapons).find((w) => w.name === name);
  if (!found) throw new Error(`no weapon named ${name}`);
  return found;
}

/** The catalog id of an ability by display name, for the pricing fixtures. */
function abilityId(name: string): string {
  const option = catalog.options.find((o) => o.name === name);
  if (!option) throw new Error(`no ability named ${name}`);
  return option.id;
}

describe("itemQuote()", () => {
  it("prices a vendored item, and multiplies by quantity", () => {
    const item = { id: "x", name: "Potion", price: 50 } as Item;
    expect(itemQuote(item)).toEqual({ gp: 50 });
    expect(itemQuote(item, 3)).toEqual({ gp: 150 });
  });

  it("is unpriced for an item with no listed price, or none at all", () => {
    expect(itemQuote({ id: "x", name: "Oddity" } as Item).gp).toBeNull();
    expect(itemQuote(undefined).gp).toBeNull();
  });
});

describe("kitQuote()", () => {
  it("totals what a kit packs, since the vendored kits list no price of their own", () => {
    const kit = ref.items[WIZARD_KIT];
    if (!kit || !isKit(kit)) throw new Error("wizard kit missing");
    const quote = kitQuote(kit, ref.items);
    // The published kit is 21 gp; the pack's own per-item prices total to
    // within a gp of it, so this pins the arithmetic, not the source.
    expect(quote.gp).toBeGreaterThan(20);
    expect(quote.gp).toBeLessThan(23);
  });

  it("prefers a kit's own price when it carries one", () => {
    const kit = {
      id: "k",
      name: "Kit",
      price: 40,
      contents: [{ name: "Rope", price: 1 }],
    } as never;
    expect(kitQuote(kit, ref.items)).toEqual({ gp: 40 });
  });
});

describe("customQuote()", () => {
  it("multiplies the typed unit price by the quantity", () => {
    expect(customQuote(0.05, 20)).toEqual({ gp: 1 });
  });

  it("is unpriced at zero, which is what an untouched form holds", () => {
    expect(customQuote(0, 5).gp).toBeNull();
  });
});

describe("armorQuote()", () => {
  it("charges the listed price for a mundane suit", () => {
    // Full plate: 1,500 gp.
    expect(armorQuote(armor("Full Plate"), {}, catalog)).toEqual({ gp: 1500 });
  });

  it("adds 150 gp for masterwork", () => {
    expect(armorQuote(armor("Full Plate"), { masterwork: true }, catalog).gp).toBe(1650);
  });

  it("prices a magic suit as base + masterwork + bonus squared x 1,000", () => {
    // +2 full plate: 1,500 + 150 + 4,000 = 5,650 gp.
    expect(armorQuote(armor("Full Plate"), { enhancement: 2 }, catalog).gp).toBe(5650);
    // Masterwork is charged whether or not the flag is set, since a magic
    // enhancement bonus implies it.
    expect(armorQuote(armor("Full Plate"), { enhancement: 2, masterwork: true }, catalog).gp).toBe(
      5650,
    );
  });

  it("squares the combined total when an ability is priced as a bonus", () => {
    // Balanced is a +1 equivalent, so +1 balanced full plate is priced as a
    // +2 item: 1,500 + 150 + 4,000.
    const quote = armorQuote(
      armor("Full Plate"),
      { enhancement: 1, abilities: [abilityId("Balanced")] },
      catalog,
    );
    expect(quote.gp).toBe(5650);
  });

  it("adds a flat-priced ability on top without touching the bonus total", () => {
    // Glamered is 2,700 gp flat: 1,500 + 150 + 1,000 + 2,700.
    const quote = armorQuote(
      armor("Full Plate"),
      { enhancement: 1, abilities: [abilityId("Glamered (armor)")] },
      catalog,
    );
    expect(quote.gp).toBe(5350);
  });

  it("prices mithral and adamantine by weight class, with masterwork included", () => {
    // Core Rulebook, Special Materials: mithral chain shirt 1,100 gp, mithral
    // full plate 10,500 gp, mithral heavy steel shield 1,020 gp; adamantine
    // full plate 16,500 gp.
    expect(armorQuote(armor("Chain Shirt"), { material: "mithral" }, catalog)).toEqual({
      gp: 1100,
    });
    expect(armorQuote(armor("Full Plate"), { material: "mithral" }, catalog)).toEqual({
      gp: 10500,
    });
    expect(armorQuote(armor("Heavy Steel Shield"), { material: "mithral" }, catalog)).toEqual({
      gp: 1020,
    });
    expect(armorQuote(armor("Full Plate"), { material: "adamantine" }, catalog)).toEqual({
      gp: 16500,
    });
    // +2 mithral full plate: 1,500 + 9,000 + 4,000, no separate masterwork charge.
    expect(
      armorQuote(armor("Full Plate"), { material: "mithral", enhancement: 2 }, catalog).gp,
    ).toBe(14500);
  });

  it("prices darkwood at 10 gp/lb on top of the masterwork shield", () => {
    // Core Rulebook armor table: darkwood heavy shield 257 gp, light 203 gp.
    expect(armorQuote(armor("Heavy Wooden Shield"), { material: "darkwood" }, catalog)).toEqual({
      gp: 257,
    });
    expect(armorQuote(armor("Light Wooden Shield"), { material: "darkwood" }, catalog)).toEqual({
      gp: 203,
    });
  });

  it("says so when the rules list no price for the material on that item", () => {
    // Adamantine's price table has rows for armor by weight class and for
    // weapons, none for shields.
    const quote = armorQuote(armor("Heavy Steel Shield"), { material: "adamantine" }, catalog);
    expect(quote.gp).toBe(20);
    expect(quote.caveat).toBeTruthy();
  });
});

describe("weaponQuote()", () => {
  it("prices a magic weapon as base + 300 + bonus squared x 2,000", () => {
    // +1 longsword: 15 + 300 + 2,000 = 2,315 gp.
    expect(weaponQuote(weapon("Longsword"), { enhancement: 1 }, catalog).gp).toBe(2315);
    // +3: 15 + 300 + 18,000.
    expect(weaponQuote(weapon("Longsword"), { enhancement: 3 }, catalog).gp).toBe(18315);
  });

  it("charges masterwork alone at 300 gp", () => {
    expect(weaponQuote(weapon("Longsword"), { masterwork: true }, catalog).gp).toBe(315);
  });

  it("prices mithral weapons at 500 gp/lb and adamantine at 3,000, masterwork included", () => {
    // Longsword, 4 lb: 15 + 2,000; +1 adds only the 2,000 enhancement.
    expect(weaponQuote(weapon("Longsword"), { material: "mithral" }, catalog)).toEqual({
      gp: 2015,
    });
    expect(
      weaponQuote(weapon("Longsword"), { material: "mithral", enhancement: 1 }, catalog).gp,
    ).toBe(4015);
    expect(weaponQuote(weapon("Longsword"), { material: "adamantine" }, catalog)).toEqual({
      gp: 3015,
    });
  });

  it("doubles a cold iron weapon's base and adds 2,000 gp once it is enchanted", () => {
    expect(weaponQuote(weapon("Longsword"), { material: "cold-iron" }, catalog)).toEqual({
      gp: 30,
    });
    // +1 cold iron longsword: 30 + 300 + 2,000 + 2,000.
    expect(
      weaponQuote(weapon("Longsword"), { material: "cold-iron", enhancement: 1 }, catalog).gp,
    ).toBe(4330);
  });

  it("prices alchemical silver by handedness, and not at all on a ranged weapon", () => {
    expect(weaponQuote(weapon("Dagger"), { material: "silver" }, catalog)).toEqual({ gp: 22 });
    expect(weaponQuote(weapon("Longsword"), { material: "silver" }, catalog)).toEqual({ gp: 105 });
    expect(weaponQuote(weapon("Greatsword"), { material: "silver" }, catalog)).toEqual({ gp: 230 });
    expect(weaponQuote(weapon("Longbow"), { material: "silver" }, catalog).caveat).toBeTruthy();
  });
});

describe("formatGp()", () => {
  it("groups thousands and keeps a fractional price", () => {
    expect(formatGp(18315)).toBe("18,315");
    expect(formatGp(12.5)).toBe("12.5");
    expect(formatGp(0.05)).toBe("0.05");
  });
});

describe("purseGp()", () => {
  it("totals every coin column in gp", () => {
    let doc = setMoney(createEmptyDoc("t"), "pp", 2);
    doc = setMoney(doc, "gp", 5);
    doc = setMoney(doc, "sp", 3);
    doc = setMoney(doc, "cp", 4);
    expect(purseGp(doc)).toBeCloseTo(25.34, 5);
  });
});

describe("addPaying()", () => {
  const add = (d: ReturnType<typeof createEmptyDoc>) => setMoney(d, "sp", 1);

  it("leaves the purse alone when the player isn't paying", () => {
    const doc = setMoney(createEmptyDoc("t"), "gp", 100);
    const result = addPaying(doc, add, 50, false);
    expect(result.doc.live.money?.gp).toBe(100);
    expect(result.paid).toBeUndefined();
  });

  it("spends the quote when paying", () => {
    const doc = setMoney(createEmptyDoc("t"), "gp", 100);
    const result = addPaying(doc, add, 50, true);
    expect(result.doc.live.money?.gp).toBe(50);
    expect(result.paid).toBe(50);
    expect(result.short).toBe(false);
  });

  it("still adds when the purse is short, and reports it", () => {
    const doc = setMoney(createEmptyDoc("t"), "gp", 10);
    const result = addPaying(doc, add, 50, true);
    expect(result.short).toBe(true);
    expect(result.doc.live.money?.gp).toBe(10);
    // The add itself went through regardless.
    expect(result.doc.live.money?.sp).toBe(1);
  });

  it("charges nothing for an unpriced add", () => {
    const doc = setMoney(createEmptyDoc("t"), "gp", 100);
    const result = addPaying(doc, add, null, true);
    expect(result.doc.live.money?.gp).toBe(100);
    expect(result.short).toBe(false);
  });
});
