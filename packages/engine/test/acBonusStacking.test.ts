import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Armor, shield, and natural-armor bonuses are *bonus types* (CRB p. 562,
 * "Bonus Types"): two of the same type never stack, the highest applies. The
 * vendored data types them inconsistently — worn armor carries none, Mage
 * Armor and the Shield spell say `base`, the Robe of the Archmagi says
 * `untyped` — so before `computeAc`'s `acBonusType` normalization they landed
 * in separate always-summing groups and every source added.
 *
 * Expected values below are hand-computed from the CRB spell/item entries:
 * mage armor "+4 armor bonus", shield "+4 shield bonus", magic vestment
 * "enhancement bonus ... +1 per four caster levels".
 */
const ref = loadRefData();

function buffByName(name: string): {
  id: string;
  changes: { formula: string; target: string; type: string }[];
} {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return { id: entry[0], changes: entry[1].changes.map((c) => ({ ...c })) };
}

function makeDoc(gear: ItemInstance[], activeBuffs: ActiveBuff[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [{ tag: "wizard", level: 5 }] },
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

function activate(name: string, casterLevel = 5): ActiveBuff {
  const buff = buffByName(name);
  return {
    instanceId: `buff-${buff.id}`,
    buffId: buff.id,
    name,
    changes: buff.changes,
    casterLevel,
  };
}

const CHAIN_SHIRT: ItemInstance = {
  equipped: true,
  name: "Chain Shirt",
  armor: { slot: "armor", ac: 4, type: 1 },
};

describe("AC bonus types compete rather than stack", () => {
  it("mage armor does not stack with worn armor — the higher applies", () => {
    // Mage armor's +4 ties the chain shirt's +4; either way AC is 14, not 18.
    const sheet = compute(makeDoc([CHAIN_SHIRT], [activate("Mage Armor")]), ref);
    expect(sheet.ac.normal).toBe(14);
    const applied = sheet.ac.components.filter((c) => c.category === "armor" && c.applied);
    expect(applied).toHaveLength(1);
  });

  it("mage armor alone grants its full +4 armor bonus", () => {
    const sheet = compute(makeDoc([], [activate("Mage Armor")]), ref);
    expect(sheet.ac.normal).toBe(14);
  });

  it("the shield spell does not stack with a worn shield", () => {
    const shield: ItemInstance = {
      equipped: true,
      name: "Heavy Steel Shield",
      armor: { slot: "shield", ac: 2 },
    };
    // Shield's +4 shield bonus beats the heavy steel shield's +2: 10 + 4 = 14.
    const sheet = compute(makeDoc([shield], [activate("Shield")]), ref);
    expect(sheet.ac.normal).toBe(14);
    const worn = sheet.ac.components.find((c) => c.source === "Heavy Steel Shield");
    expect(worn?.applied).toBe(false);
  });

  it("magic vestment's enhancement bonus still stacks with the armor bonus", () => {
    // A different bonus type from the armor bonus, so RAW it adds:
    // 10 + 4 (chain shirt) + 1 (magic vestment at CL 5) = 15.
    const sheet = compute(makeDoc([CHAIN_SHIRT], [activate("Magic Vestment")]), ref);
    expect(sheet.ac.normal).toBe(15);
    const enh = sheet.ac.components.find((c) => c.category === "armor" && c.type === "enh");
    expect(enh?.value).toBe(1);
    expect(enh?.applied).toBe(true);
  });

  it("the Robe of the Archmagi does not stack with worn armor", () => {
    const robe = Object.entries(ref.items).find(
      ([, it]) => it.name === "Robe of the Archmagi (Grey)",
    );
    if (!robe) throw new Error("Robe of the Archmagi (Grey) not found");
    // The robe's +5 armor bonus beats the chain shirt's +4: 10 + 5 = 15.
    const sheet = compute(makeDoc([CHAIN_SHIRT, { equipped: true, itemId: robe[0] }]), ref);
    expect(sheet.ac.normal).toBe(15);
  });

  it("two worn body armors compete instead of summing", () => {
    const sheet = compute(
      makeDoc([
        CHAIN_SHIRT,
        { equipped: true, name: "Breastplate", armor: { slot: "armor", ac: 6, type: 2 } },
      ]),
      ref,
    );
    expect(sheet.ac.normal).toBe(16);
  });

  it("barkskin's enhancement to natural armor stacks with a natural armor bonus", () => {
    // Distinct types (enhancement vs. natural armor), so both apply — this is
    // the case the normalization must NOT collapse.
    const sheet = compute(makeDoc([], [activate("Barkskin", 6)]), ref);
    const natural = sheet.ac.components.filter((c) => c.category === "natural");
    expect(natural.every((c) => c.applied)).toBe(true);
    // Barkskin: +2 natural armor, +1 per 3 caster levels above 3rd — +3 at CL 6.
    expect(sheet.ac.normal).toBe(13);
  });
});

/** A hand-authored active buff carrying explicit changes, for the cases no vendored buff exercises. */
function handBuff(
  name: string,
  changes: { formula: string; target: string; type: string }[],
): ActiveBuff {
  return { instanceId: `hand-${name}`, buffId: `hand-${name}`, name, changes };
}

describe('the "increase" stacking type sums with the natural-armor bonus', () => {
  // "Your natural armor bonus increases by +N" (Improved Natural Armor's
  // wording, aonprd.com Monster Feats) modifies the existing bonus rather
  // than competing with it, unlike "you gain a +N natural armor bonus"
  // (Ironhide's wording) which is an ordinary same-type bonus.
  it("a +1 increase adds on top of a +2 natural armor bonus (both applied)", () => {
    const sheet = compute(
      makeDoc(
        [],
        [
          handBuff("Scaly Hide", [{ formula: "2", target: "nac", type: "untyped" }]),
          handBuff("Hardened Hide", [{ formula: "1", target: "nac", type: "increase" }]),
        ],
      ),
      ref,
    );
    // 10 + 2 (natural) + 1 (increase) = 13 — the increase must not be
    // normalized into the natural group and lose highest-wins.
    expect(sheet.ac.normal).toBe(13);
    const natural = sheet.ac.components.filter((c) => c.category === "natural");
    expect(natural.every((c) => c.applied)).toBe(true);
  });

  it("two increases sum with each other (repeatable 'increases by' takes)", () => {
    const sheet = compute(
      makeDoc(
        [],
        [
          handBuff("Scaly Hide", [{ formula: "2", target: "nac", type: "untyped" }]),
          handBuff("First Take", [{ formula: "1", target: "nac", type: "increase" }]),
          handBuff("Second Take", [{ formula: "1", target: "nac", type: "increase" }]),
        ],
      ),
      ref,
    );
    expect(sheet.ac.normal).toBe(14);
  });

  it("natural armor still never applies to touch AC, increases included", () => {
    const sheet = compute(
      makeDoc([], [handBuff("Hardened Hide", [{ formula: "1", target: "nac", type: "increase" }])]),
      ref,
    );
    expect(sheet.ac.normal).toBe(11);
    expect(sheet.ac.touch).toBe(10);
  });

  it("two untyped natural armor bonuses still compete rather than sum", () => {
    // The contrast case: without the explicit increase type, normalization
    // keeps same-type natural armor highest-wins.
    const sheet = compute(
      makeDoc(
        [],
        [
          handBuff("Scaly Hide", [{ formula: "2", target: "nac", type: "untyped" }]),
          handBuff("Rocky Hide", [{ formula: "1", target: "nac", type: "untyped" }]),
        ],
      ),
      ref,
    );
    expect(sheet.ac.normal).toBe(12);
  });
});
