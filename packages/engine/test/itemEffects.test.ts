import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, EFFECT_IMMUNITY_LABELS } from "../src/index.js";

/**
 * Bracers of Armor (CRB p. 460): "Bracers of armor surround the wearer with an
 * invisible but tangible field of force, granting an armor bonus of +1 to +8,
 * just as though he were wearing armor." The vendored entries carry an empty
 * `changes[]`; the data pipeline's item change supplement fills them.
 */
const ref = loadRefData();

function itemByName(name: string): string {
  const entry = Object.entries(ref.items).find(([, it]) => it.name === name);
  if (!entry) throw new Error(`item not found: ${name}`);
  return entry[0];
}

function makeDoc(gear: ItemInstance[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Bracers of Armor", () => {
  it("+3 bracers grant a +3 armor bonus to AC with no worn armor (10 base + 3)", () => {
    const doc = makeDoc([{ equipped: true, itemId: itemByName("Bracers of Armor +3") }]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(13);
    expect(sheet.ac.flatFooted).toBe(13);
  });

  it("an unequipped pair of bracers grants nothing", () => {
    const doc = makeDoc([{ equipped: false, itemId: itemByName("Bracers of Armor +3") }]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(10);
  });

  it("does not stack with worn armor — the higher armor bonus applies (CRB p. 460)", () => {
    const doc = makeDoc([
      { equipped: true, itemId: itemByName("Bracers of Armor +1") },
      { equipped: true, name: "Chain Shirt", armor: { slot: "armor", ac: 4, type: 1 } },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(14); // 10 base + 4 (chain shirt beats the +1 bracers)
    const bracers = sheet.ac.components.find((c) => c.source.startsWith("Bracers of Armor"));
    expect(bracers?.applied).toBe(false);
  });

  it("beats worn armor when the bracers are the higher bonus", () => {
    const doc = makeDoc([
      { equipped: true, itemId: itemByName("Bracers of Armor +6") },
      { equipped: true, name: "Chain Shirt", armor: { slot: "armor", ac: 4, type: 1 } },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(16); // 10 base + 6 (bracers beat the chain shirt)
    const shirt = sheet.ac.components.find((c) => c.source === "Chain Shirt");
    expect(shirt?.applied).toBe(false);
  });

  it("takes the losing armor's enhancement bonus down with it", () => {
    // A +1 chain shirt's enhancement bonus enhances the chain shirt's own armor
    // bonus; once the bracers beat that bonus, there is nothing left for it to
    // enhance, so AC is 16 (10 + 6), not 17.
    const doc = makeDoc([
      { equipped: true, itemId: itemByName("Bracers of Armor +6") },
      {
        equipped: true,
        name: "Chain Shirt +1",
        armor: { slot: "armor", ac: 4, enhancement: 1, type: 1 },
      },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(16);
    const enh = sheet.ac.components.find((c) => c.source === "Chain Shirt +1 (enhancement)");
    expect(enh?.applied).toBe(false);
  });

  it("every Bracers of Armor variant (+1 through +8) grants exactly its own bonus", () => {
    for (let bonus = 1; bonus <= 8; bonus++) {
      const doc = makeDoc([{ equipped: true, itemId: itemByName(`Bracers of Armor +${bonus}`) }]);
      expect(compute(doc, ref).ac.normal).toBe(10 + bonus);
    }
  });
});

describe("item immunity grants", () => {
  const effectSlugs = (doc: CharacterDoc) =>
    compute(doc, ref).defenses?.effectImmunities?.map((e) => e.qualifier) ?? [];

  it("Periapt of Proof against Poison: poison immunity while worn (CRB p. 525)", () => {
    const itemId = itemByName("Periapt of Proof against Poison");
    expect(effectSlugs(makeDoc([{ equipped: true, itemId }]))).toEqual(["poison"]);
    expect(compute(makeDoc([{ equipped: false, itemId }]), ref).defenses).toBeUndefined();
  });

  it("Storm Kindler's Rod: cold and electricity damage immunity while held", () => {
    const sheet = compute(
      makeDoc([{ equipped: true, itemId: itemByName("Storm Kindler's Rod") }]),
      ref,
    );
    expect(sheet.defenses?.immunities?.map((i) => i.qualifier)).toEqual(["cold", "electricity"]);
  });

  it("every immEffect slug an item carries has a label", () => {
    for (const item of Object.values(ref.items)) {
      for (const ch of item.changes) {
        if (ch.target.startsWith("immEffect.")) {
          expect(EFFECT_IMMUNITY_LABELS[ch.target.slice("immEffect.".length)]).toBeDefined();
        }
      }
    }
  });
});

describe("promoted worn items", () => {
  it("Goggles of Night: darkvision 60 ft. while worn (CRB p. 515)", () => {
    const itemId = itemByName("Goggles of Night");
    const senses = compute(makeDoc([{ equipped: true, itemId }]), ref).senses;
    expect(senses.map((s) => [s.kind, s.range])).toEqual([["darkvision", 60]]);
    expect(compute(makeDoc([{ equipped: false, itemId }]), ref).senses).toEqual([]);
  });

  it("Cat's Eye Crown extends existing darkvision by 60 ft. (UE p. 222)", () => {
    const sheet = compute(
      makeDoc([
        { equipped: true, itemId: itemByName("Goggles of Night") },
        { equipped: true, itemId: itemByName("Cat's Eye Crown") },
      ]),
      ref,
    );
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(120);
  });

  it("Boots of the Mire: +2 resistance on Fortitude only vs poison and disease (UE p. 229)", () => {
    const base = compute(makeDoc([]), ref);
    const sheet = compute(
      makeDoc([{ equipped: true, itemId: itemByName("Boots of the Mire") }]),
      ref,
    );
    expect(sheet.saves.fort.total).toBe(base.saves.fort.total);
    const line = sheet.saves.fort.conditionals?.find((c) => c.categories.includes("poison"));
    expect(line?.total).toBe(base.saves.fort.total + 2);
    expect(line?.categories).toEqual(["poison", "disease"]);
  });

  it("Ring of Fire Resistance, Minor: fire resistance 10 (CRB p. 480)", () => {
    const sheet = compute(
      makeDoc([{ equipped: true, itemId: itemByName("Ring of Fire Resistance, Minor") }]),
      ref,
    );
    expect(sheet.defenses?.resistances.map((e) => [e.qualifier, e.total])).toEqual([["fire", 10]]);
  });
});
