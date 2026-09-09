/**
 * Gear picker/inventory display strings (`model/gearDisplay.ts`). These read
 * off real vendored items where one exists, so a data reshape that drops a
 * field shows up here as a changed string rather than as a silently thinner
 * picker row.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { ArmorRef, Item } from "@pf1/schema";

import type { ConsumableEntry } from "../src/model/consumables.js";
import {
  armorRefMeta,
  changeLabel,
  consumableMeta,
  gp,
  itemMaxCharges,
  itemMeta,
  kitSummary,
} from "../src/model/gearDisplay.js";
import { isKit, type Kit } from "../src/model/kits.js";

const ref = loadRefData();

describe("changeLabel()", () => {
  it("names the bonus type and the target", () => {
    expect(changeLabel({ formula: "+2", target: "ac", type: "deflection" })).toBe(
      "+2 deflection to AC",
    );
  });

  it("drops the type when it is untyped, since 'untyped' is not worth the words", () => {
    expect(changeLabel({ formula: "+1", target: "ac", type: "untyped" })).toBe("+1 to AC");
    expect(changeLabel({ formula: "+1", target: "ac", type: "" })).toBe("+1 to AC");
  });

  it("drops the target clause when there is no target", () => {
    expect(changeLabel({ formula: "+2", target: "", type: "enh" })).toBe("+2 enh");
  });
});

describe("itemMaxCharges()", () => {
  it("is null for an item with no uses block at all", () => {
    expect(itemMaxCharges(undefined)).toBeNull();
    expect(itemMaxCharges({})).toBeNull();
  });

  it("reads a plain numeric maxFormula", () => {
    expect(itemMaxCharges({ uses: { maxFormula: "50", per: "charges" } })).toBe(50);
  });

  it("truncates a fractional result rather than showing a partial charge", () => {
    expect(itemMaxCharges({ uses: { maxFormula: "10 / 3", per: "charges" } })).toBe(3);
  });

  it("is null for a formula that evaluates to zero or below", () => {
    expect(itemMaxCharges({ uses: { maxFormula: "0", per: "charges" } })).toBeNull();
    expect(itemMaxCharges({ uses: { maxFormula: "-4", per: "charges" } })).toBeNull();
  });

  it("is null rather than throwing on a formula that can't produce a number", () => {
    expect(itemMaxCharges({ uses: { maxFormula: "1d6", per: "charges" } })).toBeNull();
  });
});

describe("itemMeta()", () => {
  it("joins slot, weight and price", () => {
    const item = { name: "x", slot: "ring", weight: 1, price: 2000 } as Item;
    expect(itemMeta(item)).toBe("ring · 1 lb · 2000 gp");
  });

  it("omits fields the data doesn't carry, with no stray separators", () => {
    expect(itemMeta({ name: "x", weight: 2 } as Item)).toBe("2 lb");
    expect(itemMeta({ name: "x" } as Item)).toBe("");
  });

  it("treats a weightless, priceless item as having nothing to say", () => {
    expect(itemMeta({ name: "x", weight: 0, price: 0 } as Item)).toBe("");
  });
});

describe("kitSummary()", () => {
  const kit = (contents: { name: string; quantity?: number }[]) => ({ name: "k", contents }) as Kit;

  it("counts the contents and lists the first three", () => {
    expect(kitSummary(kit([{ name: "Torch", quantity: 10 }, { name: "Ink" }]))).toBe(
      "2 items · Torch ×10, Ink",
    );
  });

  it("says '+N more' past three", () => {
    expect(kitSummary(kit([1, 2, 3, 4, 5].map((n) => ({ name: `i${n}` }))))).toBe(
      "5 items · i1, i2, i3 +2 more",
    );
  });

  it("keeps the singular for a one-item kit", () => {
    expect(kitSummary(kit([{ name: "Rope" }]))).toBe("1 item · Rope");
  });

  it("summarizes a real vendored kit without an empty or NaN field", () => {
    const realKit = Object.values(ref.items).find(isKit);
    expect(realKit).toBeDefined();
    expect(kitSummary(realKit as Kit)).toMatch(/^\d+ items? · \S/);
  });
});

describe("consumableMeta()", () => {
  const entry = (over: Partial<ConsumableEntry>) =>
    ({ casterLevel: 1, spellLevel: 1, price: 50, ...over }) as ConsumableEntry;

  it("leads with caster level, spell level and price", () => {
    expect(consumableMeta(entry({}))).toBe("CL 1 · spell lvl 1 · 50 gp");
  });

  it("adds charges only for the items that have them", () => {
    expect(consumableMeta(entry({ charges: 50 }))).toBe("CL 1 · spell lvl 1 · 50 gp · 50 charges");
  });
});

describe("gp()", () => {
  it("leaves a whole price whole", () => {
    expect(gp(50)).toBe("50");
  });

  it("keeps two decimals for a halved odd price", () => {
    expect(gp(12.5)).toBe("12.5");
    expect(gp(6.25)).toBe("6.25");
  });

  it("rounds off anything finer than a copper", () => {
    expect(gp(6.666)).toBe("6.67");
  });
});

describe("armorRefMeta()", () => {
  it("names the weight class for armor", () => {
    const a = { slot: "armor", weightClass: 2, maxDex: 3, acp: 4, asf: 25 } as ArmorRef;
    expect(armorRefMeta(a)).toBe("Medium Armor · max Dex +3 · ACP −4 · ASF 25%");
  });

  it("says Shield instead, and drops the weight class with it", () => {
    const a = { slot: "shield", weightClass: 1, acp: 1 } as ArmorRef;
    expect(armorRefMeta(a)).toBe("Shield · ACP −1");
  });

  it("omits max Dex only when it is absent, not when it is 0", () => {
    expect(armorRefMeta({ slot: "armor", maxDex: 0 } as ArmorRef)).toBe("Armor · max Dex +0");
    expect(armorRefMeta({ slot: "armor" } as ArmorRef)).toBe("Armor");
  });

  it("drops a zero ACP and a zero ASF, which say nothing", () => {
    expect(armorRefMeta({ slot: "armor", acp: 0, asf: 0 } as ArmorRef)).toBe("Armor");
  });
});
