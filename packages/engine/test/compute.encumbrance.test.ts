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

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  gear?: ItemInstance[];
  encumbranceEnabled?: boolean;
  skillRanks?: Record<string, number>;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
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
      activeBuffs: [],
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
  it("armor's tighter max-Dex cap (not the load's looser one) binds, and ACP is additive", () => {
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
    // Combined ACP: armor -4 + load -3 = -7.
    expect(sheet.skills.acr!.acp).toBe(-7);
    // Combined max-Dex cap: min(3 armor, 3 load) = 3 — a tie. The load is
    // reported as (also) binding in this case (`<=`, not `<`), since it's
    // just as restrictive as the armor.
    const dexComponent = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComponent?.value).toBe(3);
    expect(dexComponent?.source).toBe("Dexterity (Medium load)");
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
