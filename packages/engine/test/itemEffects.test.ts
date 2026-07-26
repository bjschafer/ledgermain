import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Bracers of Armor (CRB p. 460, issue #67): "Bracers of armor surround the
 * wearer with an invisible but tangible field of force, granting an armor
 * bonus of +1 to +8, just as though he were wearing armor" — confirmed
 * against aonprd.com, 2026-07-25. All eight vendored entries carry an empty
 * `changes[]` upstream, so equipping one granted nothing before
 * `ITEM_CHANGE_PATCHES` (`item-effects.ts`) patched it in via `collect.ts`'s
 * equipped-items loop.
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

describe("Bracers of Armor (ITEM_CHANGE_PATCHES)", () => {
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

  it("adds onto worn armor rather than capping at the higher of the two (a pre-existing engine gap shared with the vendored Robe of the Archmagi — see item-effects.ts's doc comment; RAW says bracers and ordinary armor should not stack)", () => {
    const doc = makeDoc([
      { equipped: true, itemId: itemByName("Bracers of Armor +1") },
      { equipped: true, name: "Chain Shirt", armor: { slot: "armor", ac: 4, type: 1 } },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(15); // 10 base + 4 (chain shirt) + 1 (bracers) — see note above
  });

  it("every Bracers of Armor variant (+1 through +8) grants exactly its own bonus", () => {
    for (let bonus = 1; bonus <= 8; bonus++) {
      const doc = makeDoc([{ equipped: true, itemId: itemByName(`Bracers of Armor +${bonus}`) }]);
      expect(compute(doc, ref).ac.normal).toBe(10 + bonus);
    }
  });
});
