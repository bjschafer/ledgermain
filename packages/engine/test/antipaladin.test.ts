import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { baseSpellsPerDay, compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for the Antipaladin (APG) — a clean mirror of Paladin:
 * high BAB, good Fort/Will (poor Ref), d10, quarter-caster spells (same
 * base table as paladin/ranger). Confirms the generic pipelines already do
 * almost all of the work once the class is vendored:
 *
 * - Unholy Resilience (`changes: [{formula: "max(0, @abilities.cha.mod)",
 *   target: "allSavingThrows"}]`) is a real vendored `Change` — Divine
 *   Grace's antipaladin twin — so it rides `collect.ts`'s generic stacking
 *   pipeline with zero hand-authoring, gated on class level 2+ same as the
 *   vendored grant level.
 * - Smite Good carries `uses.maxFormula` byte-identical to Smite Evil's
 *   (`1 + floor((@class.unlevel - 1) / 3)`) but — like Smite Evil — no
 *   vendored `actions[]`, so its attack/damage/AC display line is hand-
 *   authored (`smiteGoodLabel(smiteEvilDetail(...))`, `tables.ts`) and wired
 *   into both `resources.ts`'s pool `detail` and `archetypes.ts`'s
 *   classFeature `detail` via `feature.tag === "smiteGood"` / name+classTag
 *   matching, mirroring Smite Evil/paladin exactly.
 * - Touch of Corruption (Lay on Hands' antipaladin twin) carries BOTH
 *   `uses.maxFormula` (`floor(@class.unlevel / 2) + @abilities.cha.mod`) AND
 *   a real `actions[].damage.formula` dice term — no hand-authoring needed,
 *   `actionBasedDetail` derives "melee touch · Nd6 negative" for free.
 * - Channel Negative Energy (`uses.source: "touchOfCorruption"`) merges its
 *   own dice/DC into Touch of Corruption's pool detail via the same
 *   "linked features" pass that already handles paladin's Channel Positive
 *   Energy -> Lay on Hands.
 *
 * Spells-per-day: `antipaladin` reuses `PALADIN_RANGER_SPELLS_PER_DAY`
 * wholesale (`tables.ts`'s `PROGRESSIONS.antipaladin`) — verified identical
 * to paladin's own numbers at a spot-checked level.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(tag: string, level: number, abilities: CharacterDoc["abilities"]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag, level }] },
    abilities,
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("antipaladin L8 (BAB high, Fort/Will good, Ref poor, d10)", () => {
  const abilities = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 18 } as const;
  const doc = makeDoc("antipaladin", 8, abilities);
  const sheet = compute(doc, ref);

  it("BAB +8", () => {
    expect(sheet.bab).toBe(8);
  });

  it("saves: Fort +12, Ref +7, Will +10 (Unholy Resilience's Cha bonus (+4) folded into all three)", () => {
    // fort good = 2+floor(8/2)=6, +Con2=8, +Unholy Resilience Cha4 = 12.
    // ref poor = floor(8/3)=2, +Dex1=3, +Cha4 = 7.
    // will good = 2+floor(8/2)=6, +Wis0=6, +Cha4 = 10.
    expect(sheet.saves.fort.total).toBe(12);
    expect(sheet.saves.ref.total).toBe(7);
    expect(sheet.saves.will.total).toBe(10);
  });

  it("HP 68 (average mode: L1 max d10=10, L2-8 7x(floor(10/2)+1=6)=42, +Con 2/level=16)", () => {
    expect(sheet.hp.max).toBe(68);
  });

  it("level-appropriate features present (L1-L8), Fiendish Boon (L5)+, Aura of Despair (L8) absent above L8", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Aura of Evil");
    expect(names).toContain("Detect Good");
    expect(names).toContain("Smite Good");
    expect(names).toContain("Touch of Corruption");
    expect(names).toContain("Unholy Resilience");
    expect(names).toContain("Aura of Cowardice");
    expect(names).toContain("Cruelty");
    expect(names).toContain("Plague Bringer");
    expect(names).toContain("Antipaladin Spells");
    expect(names).toContain("Channel Negative Energy");
    expect(names).toContain("Fiendish Boon");
    expect(names).toContain("Aura of Despair (APA)");
    expect(names).not.toContain("Aura of Vengeance"); // L11
  });

  it("Smite Good's classFeature detail mirrors Smite Evil's display shape, 'vs. good'", () => {
    const smite = sheet.classFeatures.find((f) => f.name === "Smite Good");
    expect(smite?.detail).toBe("+4 atk, +8 dmg, +4 AC vs. good");
  });

  it("resource pools: Smite Good 3/day with the mirrored detail line", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const smiteGood = pools.find((p) => p.name === "Smite Good");
    // 1 + floor((8-1)/3) = 3.
    expect(smiteGood?.max).toBe(3);
    expect(smiteGood?.per).toBe("day");
    expect(smiteGood?.detail).toBe("+4 atk, +8 dmg, +4 AC vs. good");
  });

  it("Touch of Corruption 8/day, dice + linked Channel Negative Energy detail — both fully generic, no hand-authoring", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const touch = pools.find((p) => p.name === "Touch of Corruption");
    // floor(8/2) + Cha mod(4) = 8.
    expect(touch?.max).toBe(8);
    expect(touch?.per).toBe("day");
    // Touch of Corruption's own dice: floor(8/2) = 4d6. Channel Negative
    // Energy's dice/DC (antipaladin level as effective cleric level):
    // dice = ceil(8/2) = 4d6, DC = 10 + floor(8/2) + 4 = 18.
    expect(touch?.detail).toBe(
      "melee touch · 4d6 negative · Channel Negative Energy: 4d6 (DC 18 Will)",
    );
    // Channel Negative Energy has no maxFormula of its own (spends Touch of
    // Corruption uses) — never its own pool row.
    expect(pools.find((p) => p.name === "Channel Negative Energy")).toBeUndefined();
  });
});

describe("antipaladin L1 — Unholy Resilience not yet granted (2nd level feature)", () => {
  const doc = makeDoc("antipaladin", 1, {
    str: 16,
    dex: 14,
    con: 14,
    int: 10,
    wis: 12,
    cha: 16,
  });
  const sheet = compute(doc, ref);

  it("saves have no Cha bonus yet: Fort +4, Ref +2, Will +3", () => {
    // fort good = 2+floor(1/2)=2, +Con2 = 4 (no Cha yet).
    // ref poor = floor(1/3)=0, +Dex2 = 2.
    // will good = 2+floor(1/2)=2, +Wis1 = 3.
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(2);
    expect(sheet.saves.will.total).toBe(3);
  });

  it("Smite Good is granted at L1 (1/day) but Touch of Corruption is not yet (L2)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Smite Good")?.max).toBe(1);
    expect(pools.find((p) => p.name === "Touch of Corruption")).toBeUndefined();
  });
});

describe("antipaladin spells-per-day — reuses the paladin quarter-caster table wholesale", () => {
  it("matches paladin at every accessible level (spot-checked L4/L9/L20)", () => {
    for (const [level, spellLevel] of [
      [4, 1],
      [9, 1],
      [9, 2],
      [20, 1],
      [20, 4],
    ] as const) {
      expect(baseSpellsPerDay("antipaladin", level, spellLevel)).toBe(
        baseSpellsPerDay("paladin", level, spellLevel),
      );
    }
  });

  it("caps at 4th-level spells (column 5+ always null, same as paladin)", () => {
    expect(baseSpellsPerDay("antipaladin", 20, 5)).toBeNull();
  });

  it("no spells at all below 4th level (quarter-caster late start)", () => {
    expect(baseSpellsPerDay("antipaladin", 3, 1)).toBeNull();
  });
});

/**
 * Issue #65 wave B additions: cruelties (Touch of Corruption riders),
 * Fiendish Boon (weapon/servant choice), and Aura of Depravity/Unholy
 * Champion's DR/good — see `antipaladin-cruelties.ts`/`tables.ts`'s doc
 * comments for the clean-room sourcing (all three read straight from the
 * vendored `class-features.json` prose, no external site needed).
 */
describe("antipaladin L6 — cruelty wiring", () => {
  const doc = makeDoc("antipaladin", 6, {
    str: 16,
    dex: 12,
    con: 14,
    int: 10,
    wis: 10,
    cha: 18,
  });
  const withCruelties: CharacterDoc = {
    ...doc,
    build: { ...doc.build, antipaladinCruelties: ["fatigued", "dazed"] },
  };
  const sheet = compute(withCruelties, ref);

  it("chosen cruelties (both tiers within budget at L6) appear in classFeatures with their summary as detail", () => {
    const fatigued = sheet.classFeatures.find((f) => f.name === "Fatigued");
    expect(fatigued?.detail).toBe("The target becomes fatigued.");
    expect(fatigued?.origin).toEqual({ kind: "cruelty", label: "Cruelty" });

    const dazed = sheet.classFeatures.find((f) => f.name === "Dazed");
    expect(dazed?.origin).toEqual({ kind: "cruelty", label: "Cruelty" });
  });

  it("an unrecognized/stale cruelty id is silently skipped, not thrown", () => {
    const staleDoc: CharacterDoc = {
      ...doc,
      build: { ...doc.build, antipaladinCruelties: ["fatigued", "not-a-real-cruelty"] },
    };
    const staleSheet = compute(staleDoc, ref);
    expect(staleSheet.classFeatures.map((f) => f.name)).toContain("Fatigued");
    expect(staleSheet.classFeatures.map((f) => f.name)).not.toContain("not-a-real-cruelty");
  });
});

describe("antipaladin — Fiendish Boon detail line", () => {
  it("no boon chosen yet: prompts the picker", () => {
    const doc = makeDoc("antipaladin", 5, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const sheet = compute(doc, ref);
    const boon = sheet.classFeatures.find((f) => f.name === "Fiendish Boon");
    expect(boon?.detail).toBe("Choose weapon or servant below — fixed once chosen (PF1 RAW).");
  });

  it("weapon boon at L11: +3 enhancement-equivalent (1 + floor(6/3)), 2/day (1 + floor(6/4))", () => {
    const doc = makeDoc("antipaladin", 11, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const withBoon: CharacterDoc = { ...doc, build: { ...doc.build, antipaladinBoon: "weapon" } };
    const sheet = compute(withBoon, ref);
    const boon = sheet.classFeatures.find((f) => f.name === "Fiendish Boon");
    expect(boon?.detail).toBe(
      "+3 enhancement-equivalent (max +5 enhancement, remainder into properties), 2/day, standard action, 1 min/level each — weapon math stays manual",
    );
  });

  it("servant boon: defers to issue #68, no numbers claimed", () => {
    const doc = makeDoc("antipaladin", 7, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const withBoon: CharacterDoc = { ...doc, build: { ...doc.build, antipaladinBoon: "servant" } };
    const sheet = compute(withBoon, ref);
    const boon = sheet.classFeatures.find((f) => f.name === "Fiendish Boon");
    expect(boon?.detail).toContain("issue #68");
  });
});

describe("antipaladin L17/L20 — Aura of Depravity / Unholy Champion DR", () => {
  it("no DR below 17th level", () => {
    const doc = makeDoc("antipaladin", 16, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "good")).toBeUndefined();
  });

  it("DR 5/good at L17-19 (Aura of Depravity)", () => {
    const doc = makeDoc("antipaladin", 19, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const sheet = compute(doc, ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "good");
    expect(dr?.total).toBe(5);
    expect(dr?.components[0]?.source).toBe("Aura of Depravity");
  });

  it("DR 10/good at L20 (Unholy Champion, replaces the 17th-level value)", () => {
    const doc = makeDoc("antipaladin", 20, {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    });
    const sheet = compute(doc, ref);
    const dr = sheet.defenses?.dr.find((d) => d.qualifier === "good");
    expect(dr?.total).toBe(10);
    expect(dr?.components[0]?.source).toBe("Unholy Champion");
  });
});
