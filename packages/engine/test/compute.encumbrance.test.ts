/**
 * Engine integration fixtures for issue #16 encumbrance: AC max-Dex cap,
 * skill ACP, and land-speed penalties flowing through `compute()` with
 * provenance, gated entirely behind `build.settings.encumbranceEnabled`
 * (default off = zero behavior change).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  race?: string;
  gear?: ItemInstance[];
  encumbranceEnabled?: boolean;
  skillRanks?: Record<string, number>;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId(over.race ?? "Human"), classes: over.classes },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: over.skillRanks ?? { acr: 1, clm: 1 },
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      ...(over.encumbranceEnabled !== undefined
        ? { settings: { encumbranceEnabled: over.encumbranceEnabled } }
        : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

// Rogue L5 (no Armor Training / ACP-affecting class features to muddy the
// encumbrance-only ACP math), Str 16 (+3), Dex 18 (+4). Carrying capacity for
// Str 16: 76/153/230 (CRB table).
const FIGHTER: { classes: { tag: string; level: number }[]; abilities: CharacterDoc["abilities"] } =
  {
    classes: [{ tag: "rogue", level: 5 }],
    abilities: { str: 16, dex: 18, con: 14, int: 10, wis: 10, cha: 8 },
  };

describe("compute: encumbrance disabled (default) — zero behavior change", () => {
  it("no settings at all: sheet.encumbrance is undefined regardless of gear weight", () => {
    const doc = makeDoc({
      ...FIGHTER,
      gear: [{ equipped: true, name: "Anvil", weight: 999 }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance).toBeUndefined();
  });

  it("explicit encumbranceEnabled: false behaves identically to absent settings", () => {
    const withHeavyGear = (enabled: boolean | undefined) =>
      makeDoc({
        ...FIGHTER,
        encumbranceEnabled: enabled,
        gear: [{ equipped: true, name: "Anvil", weight: 999 }],
      });
    const sheetAbsent = compute(withHeavyGear(undefined), ref);
    const sheetFalse = compute(withHeavyGear(false), ref);
    expect(sheetFalse).toEqual(sheetAbsent);
  });

  it("a heavy non-magical item contributes nothing to AC/skills/speed when disabled (byte-equal to no gear at all)", () => {
    const withGear = compute(
      makeDoc({ ...FIGHTER, gear: [{ equipped: true, name: "Anvil", weight: 999, quantity: 5 }] }),
      ref,
    );
    const withoutGear = compute(makeDoc({ ...FIGHTER, gear: [] }), ref);
    expect(withGear.ac).toEqual(withoutGear.ac);
    expect(withGear.skills).toEqual(withoutGear.skills);
    expect(withGear.speeds).toEqual(withoutGear.speeds);
    expect(withGear.cmd).toBe(withoutGear.cmd);
  });
});

describe("compute: encumbrance enabled — medium load", () => {
  // Str 16 medium ceiling = 153. 100 lb lands in the medium band (77-153).
  const doc = makeDoc({
    ...FIGHTER,
    encumbranceEnabled: true,
    gear: [{ equipped: true, name: "Adventuring Gear", weight: 100 }],
  });
  const sheet = compute(doc, ref);

  it("reports the medium tier with correct thresholds", () => {
    expect(sheet.encumbrance).toEqual({
      totalWeight: 100,
      strScore: 16,
      thresholds: { light: 76, medium: 153, heavy: 230 },
      tier: "medium",
      maxDexCap: 3,
      acp: -3,
      speedPenalty: true,
    });
  });

  it("caps AC's Dex bonus at +3 (Dex mod is +4, unarmored) with 'Medium load' provenance", () => {
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(3);
    expect(dexComponent?.source).toBe("Dexterity (Medium load)");
    expect(sheet.ac.normal).toBe(13); // 10 base + dex(capped 3)
  });

  it("CMD's Dex term is uncapped (RAW — only AC's Dex bonus is capped)", () => {
    // Rogue L5 med BAB = floor(5*3/4) = 3.
    // cmd = 10 + bab3 + str3 + dex4(uncapped) + size0 = 20
    expect(sheet.cmd).toBe(20);
  });

  it("applies -3 ACP to Str/Dex skills, with a 'Medium load' provenance chip", () => {
    const acrobatics = sheet.skills.acr!; // Dex-based, uses ACP
    expect(acrobatics.acp).toBe(-3);
    expect(acrobatics.components.some((c) => c.source === "Medium load" && c.value === -3)).toBe(
      true,
    );
    const climb = sheet.skills.clm!; // Str-based, uses ACP
    expect(climb.acp).toBe(-3);
  });

  it("does not apply ACP to non-Str/Dex skills", () => {
    expect(sheet.skills.spl?.acp ?? 0).toBe(0); // Spellcraft (Int)
  });

  it("reduces land speed 30 -> 20", () => {
    expect(sheet.speeds.land).toBe(20);
  });
});

describe("compute: encumbrance enabled — heavy load", () => {
  // Str 16 heavy ceiling = 230. 250 lb exceeds it.
  const doc = makeDoc({
    ...FIGHTER,
    encumbranceEnabled: true,
    gear: [{ equipped: true, name: "Treasure Chest", weight: 250 }],
  });
  const sheet = compute(doc, ref);

  it("reports the heavy tier", () => {
    expect(sheet.encumbrance?.tier).toBe("heavy");
    expect(sheet.encumbrance?.maxDexCap).toBe(1);
    expect(sheet.encumbrance?.acp).toBe(-6);
  });

  it("caps AC's Dex bonus at +1 with 'Heavy load' provenance", () => {
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(1);
    expect(dexComponent?.source).toBe("Dexterity (Heavy load)");
  });

  it("applies -6 ACP to Str/Dex skills", () => {
    expect(sheet.skills.acr!.acp).toBe(-6);
    expect(sheet.skills.clm!.acp).toBe(-6);
  });

  it("reduces land speed 30 -> 20 (same reduction as medium load, per RAW)", () => {
    expect(sheet.speeds.land).toBe(20);
  });
});

describe("compute: encumbrance combines with worn armor as 'more restrictive wins'", () => {
  it("armor's tighter max-Dex cap (not the load's looser one) binds, and ACP takes the worse of the two (not additive)", () => {
    const doc = makeDoc({
      ...FIGHTER,
      encumbranceEnabled: true,
      gear: [
        // Breastplate: maxDex 3, acp -4. Medium load alone would cap Dex at 3
        // too (a tie) and impose -3 ACP.
        {
          equipped: true,
          name: "Breastplate",
          armor: { slot: "armor", ac: 6, maxDex: 3, acp: -4, type: 2, weight: 30 },
        },
        { equipped: true, name: "Adventuring Gear", weight: 100 }, // pushes to medium (76 < 130 <= 153)
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.tier).toBe("medium");
    // RAW (CRB p.171): the worse of armor ACP (-4) and load ACP (-3) applies,
    // not the sum — so -4, not -7.
    expect(sheet.skills.acr!.acp).toBe(-4);
    // Combined max-Dex cap: min(3 armor, 3 load) = 3 — a tie. The load is
    // reported as (also) binding in this case (`<=`, not `<`), since it's
    // just as restrictive as the armor.
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(3);
    expect(dexComponent?.source).toBe("Dexterity (Medium load)");
  });

  it("the load's worse ACP wins over a lighter armor's ACP (worse-of, not additive)", () => {
    const doc = makeDoc({
      ...FIGHTER,
      encumbranceEnabled: true,
      gear: [
        // Light armor: acp -1 only. Heavy load's own ACP (-6) is worse.
        {
          equipped: true,
          name: "Studded Leather",
          armor: { slot: "armor", ac: 3, maxDex: 5, acp: -1, type: 1, weight: 20 },
        },
        { equipped: true, name: "Treasure Chest", weight: 250 }, // heavy load: acp -6
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.tier).toBe("heavy");
    expect(sheet.encumbrance?.acp).toBe(-6);
    // Worse of armor(-1) and load(-6) is -6, not -7.
    expect(sheet.skills.acr!.acp).toBe(-6);
  });

  it("the load's tighter cap wins over a looser armor cap", () => {
    const doc = makeDoc({
      ...FIGHTER,
      encumbranceEnabled: true,
      gear: [
        // Padded armor: maxDex 8 (very loose), acp 0.
        {
          equipped: true,
          name: "Padded",
          armor: { slot: "armor", ac: 1, maxDex: 8, type: 1, weight: 10 },
        },
        { equipped: true, name: "Treasure Chest", weight: 250 }, // heavy load: maxDex cap 1
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.encumbrance?.tier).toBe("heavy");
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(1);
    expect(dexComponent?.source).toBe("Dexterity (Heavy load)");
  });
});

// A Str-10 Medium human — Enlarge/Reduce Person's ±2 size-typed Str bonus and
// the size-category shift both start from a round baseline (33/66/100) here.
const BASELINE: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
} = {
  classes: [{ tag: "fighter", level: 1 }],
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
};

describe("compute: encumbrance — carryStr/carryMult consumption (Ant Haul, masterwork backpack, Enlarge/Reduce Person)", () => {
  it("Ant Haul triples carrying capacity (carryMult +2 sums onto a base multiplier of 1, not a bare ×2)", () => {
    const doc = makeDoc({
      ...FIGHTER,
      encumbranceEnabled: true,
      activeBuffs: [
        {
          instanceId: "ant-haul",
          buffId: buffId("Ant Haul"),
          name: "Ant Haul",
          changes: ref.buffs[buffId("Ant Haul")]!.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    // Str 16 baseline (see FIGHTER's own comment): 76/153/230 -> ×3.
    expect(sheet.encumbrance?.thresholds).toEqual({ light: 228, medium: 459, heavy: 690 });
  });

  it("a masterwork backpack's carryStr +1 raises the effective Str used for the carry table by 1", () => {
    const doc = makeDoc({
      ...BASELINE,
      encumbranceEnabled: true,
      gear: [
        {
          equipped: true,
          itemId: "O1IuoaVvgX5nAl18", // Backpack, masterwork
        },
      ],
    });
    const sheet = compute(doc, ref);
    // Str 10 (33/66/100) treated as Str 11 (38/76/115) for the carry table only.
    expect(sheet.encumbrance?.thresholds).toEqual({ light: 38, medium: 76, heavy: 115 });
  });

  it("Enlarge Person's carryStr/carryMult offset the SAME spell's own size-category ×2 and +2 Str size bonus (anti-double-count)", () => {
    const doc = makeDoc({
      ...BASELINE,
      encumbranceEnabled: true,
      activeBuffs: [
        {
          instanceId: "enlarge",
          buffId: buffId("Enlarge Person"),
          name: "Enlarge Person",
          changes: ref.buffs[buffId("Enlarge Person")]!.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    // The spell really did apply: Large, Str 12 (10 + size bonus 2).
    expect(sheet.size).toBe("lg");
    expect(sheet.abilities.str.total).toBe(12);
    // A naive implementation that applies the size ×2 and the +2 Str size
    // bonus WITHOUT consuming carryStr/carryMult would show thresholds far
    // above baseline (~66/153/230+). Consuming them nets back to the
    // pre-spell baseline instead — Foundry's own buff description says why
    // ("partially accounting for your gear not changing in size"), and no
    // published ruling grants a free carrying-capacity boost from this spell.
    expect(sheet.encumbrance?.thresholds).toEqual({ light: 33, medium: 66, heavy: 100 });
  });

  it("Reduce Person's carryStr/carryMult keep carrying capacity close to baseline despite shrinking to Small", () => {
    const doc = makeDoc({
      ...BASELINE,
      encumbranceEnabled: true,
      activeBuffs: [
        {
          instanceId: "reduce",
          buffId: buffId("Reduce Person"),
          name: "Reduce Person",
          changes: ref.buffs[buffId("Reduce Person")]!.changes,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.size).toBe("sm");
    expect(sheet.abilities.str.total).toBe(8);
    // Effective Str-for-carry = 8 (actual) + 1 (carryStr) = 9 -> 30/60/90;
    // multiplier = 0.75 (Small) * 1.5 (carryMult total 1 + 0.5) = 1.125.
    expect(sheet.encumbrance?.thresholds).toEqual({ light: 33, medium: 67, heavy: 101 });
  });
});
