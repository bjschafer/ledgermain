import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  addCustomGearItem,
  addGearItem,
  createEmptyDoc,
  setGearCharges,
} from "../src/model/doc.js";
import { playItems, rechargeDailyItems, restoreItem, spendItem } from "../src/model/playItems.js";
import { restNewDay } from "../src/model/rest.js";

const ref = loadRefData();

function itemId(name: string): string {
  const item = Object.values(ref.items).find((i) => i.name === name);
  if (!item) throw new Error(`no vendored item named ${name}`);
  return item.id;
}

function withGear(...steps: ((d: CharacterDoc) => CharacterDoc)[]): CharacterDoc {
  return steps.reduce((d, step) => step(d), createEmptyDoc("t"));
}

describe("playItems", () => {
  it("picks out what gets used up and leaves the rest of the inventory alone", () => {
    const doc = withGear(
      (d) => addCustomGearItem(d, "Potion of Cure Light Wounds", { price: 50, quantity: 3 }),
      (d) => addCustomGearItem(d, "Scroll of Shield", { price: 25 }),
      (d) => addCustomGearItem(d, "Wand of Magic Missile", { price: 750, charges: 50 }),
      (d) => addGearItem(d, itemId("Alchemist's Fire")),
      (d) => addGearItem(d, itemId("Staff of Healing")),
      (d) => addGearItem(d, itemId("Rope")),
      (d) => addGearItem(d, itemId("Crystal Ball (Normal)")),
      (d) => addCustomGearItem(d, "Lucky coin"),
    );

    expect(
      playItems(doc, ref).map(({ name, track, left, max }) => ({ name, track, left, max })),
    ).toEqual([
      { name: "Potion of Cure Light Wounds", track: "quantity", left: 3, max: undefined },
      { name: "Scroll of Shield", track: "quantity", left: 1, max: undefined },
      { name: "Wand of Magic Missile", track: "charges", left: 50, max: 50 },
      { name: "Alchemist's Fire", track: "quantity", left: 1, max: undefined },
      { name: "Staff of Healing", track: "charges", left: 10, max: 10 },
    ]);
  });

  it("marks items that refill on their own", () => {
    const doc = withGear(
      (d) => addGearItem(d, itemId("Lucky Horseshoe")),
      (d) => addGearItem(d, itemId("Bag of Tricks, Gray")),
    );
    expect(playItems(doc, ref).map((i) => i.per)).toEqual(["day", "week"]);
  });
});

describe("spendItem / restoreItem", () => {
  it("spends a potion down to zero and keeps the row for an undo to find", () => {
    let doc = withGear((d) =>
      addCustomGearItem(d, "Potion of Cure Light Wounds", { price: 50, quantity: 2 }),
    );
    const use = () => {
      const [potion] = playItems(doc, ref);
      doc = spendItem(doc, potion!);
    };
    use();
    use();
    use();
    expect(doc.build.gear).toHaveLength(1);
    expect(playItems(doc, ref)[0]?.left).toBe(0);

    doc = restoreItem(doc, playItems(doc, ref)[0]!);
    expect(playItems(doc, ref)[0]?.left).toBe(1);
  });

  it("spends wand charges and never restores past the cap", () => {
    let doc = withGear((d) => addCustomGearItem(d, "Wand of Magic Missile", { charges: 50 }));
    doc = spendItem(doc, playItems(doc, ref)[0]!);
    expect(playItems(doc, ref)[0]?.left).toBe(49);

    doc = restoreItem(doc, playItems(doc, ref)[0]!);
    const full = playItems(doc, ref)[0]!;
    expect(full.left).toBe(50);
    expect(restoreItem(doc, full)).toBe(doc);
  });
});

describe("daily recharge", () => {
  const spentEverything = withGear(
    (d) => addGearItem(d, itemId("Lucky Horseshoe")),
    (d) => addGearItem(d, itemId("Bag of Tricks, Gray")),
    (d) => addGearItem(d, itemId("Staff of Healing")),
    (d) => setGearCharges(d, 0, 1),
    (d) => setGearCharges(d, 1, 4),
    (d) => setGearCharges(d, 2, 3),
  );

  it("refills only the items that recharge daily", () => {
    const next = rechargeDailyItems(spentEverything, ref);
    expect(next.build.gear.map((g) => g.chargesUsed)).toEqual([undefined, 4, 3]);
  });

  it("runs as part of New Day and says so", () => {
    const { doc, summary } = restNewDay(spentEverything, undefined, ref);
    expect(doc.build.gear.map((g) => g.chargesUsed)).toEqual([undefined, 4, 3]);
    expect(summary).toContain("1 item recharged");
  });
});
