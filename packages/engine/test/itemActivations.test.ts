import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, ITEM_ACTIVATIONS } from "../src/index.js";

/**
 * Worn items that activate a spell buff (`item-activations.ts`) become a pool
 * while equipped. Boots of Speed, CRB p. 503: "act as though affected by a
 * haste spell for up to 10 rounds each day"; the item is CL 10.
 */
const ref = loadRefData();

function itemByName(name: string): string {
  const entry = Object.entries(ref.items).find(([, it]) => it.name === name);
  if (!entry) throw new Error(`item not found: ${name}`);
  return entry[0];
}

function makeDoc(gear: ItemInstance[], activeBuffs: ActiveBuff[] = []): CharacterDoc {
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
      activeBuffs,
      resources: {},
    },
  };
}

describe("item activation pools", () => {
  it("every table entry names a vendored item and a vendored spell buff", () => {
    const itemNames = new Set(Object.values(ref.items).map((i) => i.name));
    const spellBuffs = new Set(
      Object.values(ref.buffs)
        .filter((b) => b.subType === "spell")
        .map((b) => b.name),
    );
    for (const [item, def] of Object.entries(ITEM_ACTIVATIONS)) {
      expect({ item, found: itemNames.has(item) }).toEqual({ item, found: true });
      expect({ item, buff: def.buff, found: spellBuffs.has(def.buff) }).toEqual({
        item,
        buff: def.buff,
        found: true,
      });
    }
  });

  it("equipped Boots of Speed: a 10-round daily pool linked to Haste at CL 10", () => {
    const boots = itemByName("Boots of Speed");
    const pool = deriveResourcePools(makeDoc([{ equipped: true, itemId: boots }]), ref).find(
      (p) => p.itemActivation?.itemId === boots,
    );
    const haste = Object.values(ref.buffs).find((b) => b.name === "Haste")!;
    expect(pool).toMatchObject({
      name: "Boots of Speed",
      max: 10,
      restValue: 10,
      per: "day",
      linkedBuffIds: [haste.id],
      itemActivation: { casterLevel: 10, meter: "round" },
    });
  });

  it("Winged Boots: three uses a day, each a 5-minute flight", () => {
    const boots = itemByName("Winged Boots");
    const pool = deriveResourcePools(makeDoc([{ equipped: true, itemId: boots }]), ref).find(
      (p) => p.itemActivation?.itemId === boots,
    );
    expect(pool).toMatchObject({
      max: 3,
      itemActivation: { casterLevel: 8, meter: "use", rounds: 50 },
    });
  });

  it("carried but not worn, the boots give no pool", () => {
    const boots = itemByName("Boots of Speed");
    const pools = deriveResourcePools(makeDoc([{ equipped: false, itemId: boots }]), ref);
    expect(pools.some((p) => p.itemActivation)).toBe(false);
  });

  it("the haste the boots switch on: +1 attack, +1 AC, +1 Reflex, +30 ft. (CRB p. 294)", () => {
    const boots = itemByName("Boots of Speed");
    const haste = Object.values(ref.buffs).find((b) => b.name === "Haste")!;
    const worn = makeDoc([{ equipped: true, itemId: boots }]);
    const base = compute(worn, ref);
    const hasted = compute(
      makeDoc(
        [{ equipped: true, itemId: boots }],
        [
          {
            instanceId: "b1",
            buffId: haste.id,
            name: haste.name,
            changes: haste.changes,
            casterLevel: 10,
            remainingRounds: 10,
            drainsPool: `item:${boots}`,
          },
        ],
      ),
      ref,
    );
    expect(hasted.attack.melee.total - base.attack.melee.total).toBe(1);
    expect(hasted.ac.normal - base.ac.normal).toBe(1);
    expect(hasted.saves.ref.total - base.saves.ref.total).toBe(1);
    expect(hasted.speeds.land).toBe((base.speeds.land ?? 0) + 30);
  });
});
