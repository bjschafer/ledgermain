import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  PSYCHIC_DISCIPLINES,
  PSYCHIC_DISCIPLINE_TAGS,
} from "../src/index.js";

/**
 * Psychic disciplines (Occult Adventures, issue: 17-class expansion follow-up
 * wave) — hand-authored table validation against the real vendored data slice
 * plus the Phrenic Pool resource derivation, mirroring
 * `oracleMysteryCurse.test.ts` / `sorcererBloodline.test.ts`'s patterns.
 * Lookups are scoped by classTag (never bare name).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  classes: { tag: string; level: number }[],
  abilities: CharacterDoc["abilities"],
  psychicDiscipline?: string,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(psychicDiscipline ? { psychicDiscipline } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const BASE_ABILITIES = { str: 10, dex: 10, con: 10, int: 18, wis: 16, cha: 10 } as const;

describe("PSYCHIC_DISCIPLINES table shape", () => {
  it("ships exactly the 12 core Occult Adventures disciplines", () => {
    expect(PSYCHIC_DISCIPLINE_TAGS).toHaveLength(12);
    expect([...PSYCHIC_DISCIPLINE_TAGS].sort()).toEqual([
      "abomination",
      "dream",
      "enlightenment",
      "faith",
      "ferocity",
      "haunted",
      "lore",
      "pageantry",
      "pain",
      "rebirth",
      "self-perfection",
      "tranquility",
    ]);
  });

  it("every discipline: 9 bonus spells at the RAW cadence (1, 4, 6, ..., 18), ascending", () => {
    for (const tag of PSYCHIC_DISCIPLINE_TAGS) {
      const d = PSYCHIC_DISCIPLINES[tag]!;
      expect(d.bonusSpells.map((sp) => sp.level)).toEqual([1, 4, 6, 8, 10, 12, 14, 16, 18]);
    }
  });

  it("every bonus-spell id resolves against the vendored RefData.spells slice", () => {
    for (const tag of PSYCHIC_DISCIPLINE_TAGS) {
      for (const sp of PSYCHIC_DISCIPLINES[tag]!.bonusSpells) {
        const vendored = ref.spells[sp.id];
        expect(vendored).toBeDefined();
        expect(vendored!.name).toBe(sp.name);
      }
    }
  });

  it("phrenic pool ability split matches the vendored prose: 6 Wisdom, 6 Charisma", () => {
    const wis = PSYCHIC_DISCIPLINE_TAGS.filter(
      (t) => PSYCHIC_DISCIPLINES[t]!.phrenicPoolAbility === "wis",
    ).sort();
    const cha = PSYCHIC_DISCIPLINE_TAGS.filter(
      (t) => PSYCHIC_DISCIPLINES[t]!.phrenicPoolAbility === "cha",
    ).sort();
    expect(wis).toEqual([
      "enlightenment",
      "faith",
      "ferocity",
      "lore",
      "self-perfection",
      "tranquility",
    ]);
    expect(cha).toEqual(["abomination", "dream", "haunted", "pageantry", "pain", "rebirth"]);
  });
});

describe("psychic class vend + Phrenic Pool resource", () => {
  it("psychic 6 vends: low BAB (+3), good Will (+5 base), poor Fort/Ref (+2 base)", () => {
    const sheet = compute(makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES), ref);
    expect(sheet.bab).toBe(3); // low: floor(6/2)
    expect(sheet.saves.will.total).toBe(5 + 3); // good base 5 + Wis +3
    expect(sheet.saves.fort.total).toBe(2); // poor base 2 + Con 0
    expect(sheet.saves.ref.total).toBe(2); // poor base 2 + Dex 0
  });

  it("Phrenic Pool with no discipline chosen: vendored formula (floor(level/2) + Cha mod)", () => {
    // Cha 10 (+0) so the vendored cha-keyed formula gives exactly floor(6/2).
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES);
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(3); // floor(6/2) + 0
    expect(pool!.per).toBe("day");
  });

  it("Phrenic Pool with a WISDOM discipline (faith): floor(level/2) + Wis mod", () => {
    // Wis 16 (+3), Cha 10 (+0): the wis-alias correction must yield 3 + 3,
    // not the vendored cha-keyed 3 + 0.
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6);
  });

  it("Phrenic Pool with a CHARISMA discipline (abomination): floor(level/2) + Cha mod", () => {
    const abilities = { ...BASE_ABILITIES, wis: 10, cha: 16 };
    const doc = makeDoc([{ tag: "psychic", level: 6 }], abilities, "abomination");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6); // floor(6/2) + cha 3 — wis 10 must NOT leak in
  });

  it("an unknown discipline tag falls back to the vendored cha formula (soft posture)", () => {
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES, "notARealDiscipline");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(3);
  });

  it("psychic has a vendored spell list; kineticist has none (it does not cast)", () => {
    expect(ref.spellLists["psychic"]).toBeDefined();
    expect(ref.spellLists["kineticist"]).toBeUndefined();
  });
});
