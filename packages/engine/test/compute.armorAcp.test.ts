/**
 * Hand-computed fixture tests for the masterwork/magic armor check penalty
 * (ACP) reduction (CRB, Equipment: masterwork armor/shields have their check
 * penalty lessened by 1, to a minimum of 0; magic armor with an enhancement
 * bonus of +1 or higher is automatically masterwork and gets that same
 * single -1, not a further reduction). `armorPieceAcp` is exercised both
 * directly (exact values, per piece) and through `compute` (proving it
 * reaches `DerivedSkill.acp` for a Str/Dex skill) to guard both the pure
 * function and its wiring.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance, WornArmor } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { armorPieceAcp, compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(armor: WornArmor): CharacterDoc {
  const gear: ItemInstance[] = [{ equipped: true, name: "Test Armor", armor }];
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: { clm: 1 },
      classFeatureChoices: [],
      spells: { known: [] },
      gear,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("armorPieceAcp() (CRB, Equipment: masterwork armor)", () => {
  it("masterwork chainmail: -5 listed -> -4 effective", () => {
    // Chainmail ACP -5 (CRB Table: Armor and Shields); masterwork lessens by
    // 1, to -4.
    expect(armorPieceAcp({ acp: -5, masterwork: true })).toBe(-4);
  });

  it("+1 breastplate: -4 listed -> -3 effective (enhancement implies masterwork, no further reduction)", () => {
    // Breastplate ACP -4; a +1 enhancement bonus implies masterwork quality
    // (same single -1 as an explicit masterwork flag), not an additional
    // reduction on top of it.
    expect(armorPieceAcp({ acp: -4, enhancement: 1 })).toBe(-3);
  });

  it("masterwork padded armor: 0 listed stays 0 (never flips positive)", () => {
    // Padded Armor has no listed ACP; masterwork's -1 floors at 0 rather
    // than granting a bonus.
    expect(armorPieceAcp({ acp: 0, masterwork: true })).toBe(0);
    expect(armorPieceAcp({ masterwork: true })).toBe(0);
  });

  it("mithral +1 chainmail: -2 listed (already includes masterwork) stays -2, not -1", () => {
    // Mithral armor is "always considered masterwork" (special materials
    // rule) and its own -3 ACP adjustment already reflects that — applied at
    // pick time in `apps/web/src/model/materials.ts` (chainmail 5 magnitude
    // - 3 = 2, i.e. acp -2). The +1 enhancement must not stack a further -1
    // on top of the material's already-inclusive reduction.
    expect(armorPieceAcp({ acp: -2, enhancement: 1, material: "mithral" })).toBe(-2);
  });

  it("non-mithral special material still gets the ordinary masterwork -1", () => {
    // Adamantine has no mechanical ACP adjustment in this repo's material
    // table, so a masterwork adamantine breastplate reduces normally.
    expect(armorPieceAcp({ acp: -4, masterwork: true, material: "adamantine" })).toBe(-3);
  });

  it("mundane (non-masterwork, non-magic) armor is unaffected", () => {
    expect(armorPieceAcp({ acp: -5 })).toBe(-5);
  });
});

describe("compute: masterwork/magic armor ACP reaches skills (CRB, Equipment: masterwork armor)", () => {
  it("masterwork chainmail reduces Climb's ACP from -5 to -4", () => {
    const sheet = compute(
      makeDoc({ slot: "armor", ac: 6, maxDex: 2, acp: -5, type: 2, masterwork: true }),
      ref,
    );
    expect(sheet.skills.clm!.acp).toBe(-4);
  });

  it("+1 breastplate reduces Climb's ACP from -4 to -3", () => {
    const sheet = compute(
      makeDoc({ slot: "armor", ac: 6, maxDex: 3, acp: -4, type: 2, enhancement: 1 }),
      ref,
    );
    expect(sheet.skills.clm!.acp).toBe(-3);
  });

  it("masterwork padded armor leaves Climb's ACP at 0", () => {
    const sheet = compute(
      makeDoc({ slot: "armor", ac: 1, maxDex: 8, type: 1, masterwork: true }),
      ref,
    );
    expect(sheet.skills.clm!.acp).toBe(0);
  });

  it("mithral +1 chainmail: Climb's ACP is -2, not -1 (no double-counting masterwork)", () => {
    const sheet = compute(
      makeDoc({
        slot: "armor",
        ac: 6,
        maxDex: 4,
        acp: -2,
        type: 1,
        enhancement: 1,
        material: "mithral",
      }),
      ref,
    );
    expect(sheet.skills.clm!.acp).toBe(-2);
  });
});
