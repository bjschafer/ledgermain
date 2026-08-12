/**
 * Hand-computed fixture tests for category-scoped save bonuses — a bonus that
 * applies only against a category of effects ("+4 vs. spells") rather than to
 * a whole save. The two behaviours that matter: such a bonus must stay OUT of
 * the headline total, and it must re-stack against the unconditional
 * modifiers rather than simply adding to that total.
 *
 * Dwarf Steel Soul is the fixture: "+2 racial vs. poison, +4 racial vs. spells
 * and spell-like abilities" (Advanced Race Guide), replacing Hardy.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  SAVE_CATEGORIES,
  categoryAppliesToSave,
  saveCategoryLabel,
  saveCategoryWithAncestors,
} from "../src/save-categories.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Dwarf Fighter 1, all abilities 10 before racial changes, no gear. */
function makeDoc(racialTraits: string[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "save-category-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Dwarf"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      racialTraits,
      vendoredRacialTraits: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Steel Soul (category-scoped racial save bonuses)", () => {
  const base = compute(makeDoc(), ref);
  const steel = compute(makeDoc(["dwarf-steel-soul"]), ref);

  // Dwarf: Con +2 (mod +1), Wis +2 (mod +1), Cha -2. Fighter 1 saves are
  // Fort good (+2), Ref poor (+0), Will poor (+0).
  it("leaves the headline totals untouched", () => {
    expect(base.saves.fort.total).toBe(3);
    expect(base.saves.ref.total).toBe(0);
    expect(base.saves.will.total).toBe(1);

    expect(steel.saves.fort.total).toBe(3);
    expect(steel.saves.ref.total).toBe(0);
    expect(steel.saves.will.total).toBe(1);
  });

  it("shows the standard trait it replaces without the trait", () => {
    // Hardy is +2 vs. poison, spells, and spell-like abilities, recovered
    // from the race's contextNote (see `race-save-notes.ts`); Steel Soul
    // suppresses that note and supersedes it below.
    expect(base.saves.fort.conditionals).toEqual([
      { total: 5, categories: ["spell", "sla", "poison"], labels: ["spells", "SLAs", "poison"] },
    ]);
    expect(base.saves.ref.conditionals).toEqual([
      { total: 2, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(base.saves.will.conditionals).toEqual([
      { total: 3, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
  });

  it("adds both categories to Fortitude, highest first", () => {
    // Fort 3, +4 vs spells/SLAs = 7; +2 vs poison = 5.
    expect(steel.saves.fort.conditionals).toEqual([
      { total: 7, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
      { total: 5, categories: ["poison"], labels: ["poison"] },
    ]);
  });

  it("merges categories that share a total into one entry", () => {
    // spell and sla both resolve to 7, so they are one line, not two.
    const fort = steel.saves.fort.conditionals!;
    expect(fort.filter((c) => c.total === 7)).toHaveLength(1);
  });

  it("omits poison from Reflex and Will, which it can never be rolled against", () => {
    // Ref 0 + 4 = 4; Will 1 + 4 = 5. Poison is Fortitude-only.
    expect(steel.saves.ref.conditionals).toEqual([
      { total: 4, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
    expect(steel.saves.will.conditionals).toEqual([
      { total: 5, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
    ]);
  });

  it("does not leak the scoped bonus into the headline provenance", () => {
    const racial = steel.saves.will.components.filter((c) => c.type === "racial");
    expect(racial).toHaveLength(0);
  });
});

describe("Near Death (level-tiered categories)", () => {
  function oracle(level: number): CharacterDoc {
    const doc = makeDoc();
    doc.identity.race = raceId("Human");
    doc.identity.classes = [{ tag: "oracle", level }];
    doc.build.oracleMystery = "bones";
    doc.build.oracleRevelations = ["bones:nearDeath"];
    return doc;
  }

  it("covers only the first tier below 7th level", () => {
    const sheet = compute(oracle(6), ref);
    const fort = sheet.saves.fort.conditionals ?? [];
    const will = sheet.saves.will.conditionals ?? [];
    // disease + poison are Fortitude; mind-affecting is Will. Death, sleep
    // and stunning have not unlocked, so they produce no line at all.
    expect(fort.flatMap((c) => c.categories).sort()).toEqual(["disease", "poison"]);
    expect(will.flatMap((c) => c.categories)).toEqual(["mind"]);
  });

  it("adds the second tier at 7th, still at the first bonus", () => {
    const sheet = compute(oracle(7), ref);
    const fort = sheet.saves.fort.conditionals ?? [];
    expect(fort.flatMap((c) => c.categories).sort()).toEqual([
      "death",
      "disease",
      "poison",
      "stun",
    ]);
    // Both tiers are +2 at 7th, so every Fortitude category shares one entry.
    expect(fort).toHaveLength(1);
  });

  it("raises both tiers to +4 at 11th", () => {
    const six = compute(oracle(6), ref);
    const eleven = compute(oracle(11), ref);
    const gap = (s: typeof six) => (s.saves.fort.conditionals![0]!.total ?? 0) - s.saves.fort.total;
    expect(gap(six)).toBe(2);
    expect(gap(eleven)).toBe(4);
  });
});

describe("save-category vocabulary", () => {
  it("gives every category at least one save it can be rolled against", () => {
    for (const [key, cat] of Object.entries(SAVE_CATEGORIES)) {
      expect(cat.saves.length, `${key} has no saves`).toBeGreaterThan(0);
      expect(cat.label.length, `${key} has no label`).toBeGreaterThan(0);
    }
  });

  it("scopes poison, disease, and death to Fortitude only", () => {
    for (const key of ["poison", "disease", "death"]) {
      expect(categoryAppliesToSave(key, "fort")).toBe(true);
      expect(categoryAppliesToSave(key, "ref")).toBe(false);
      expect(categoryAppliesToSave(key, "will")).toBe(false);
    }
  });

  it("scopes the mind-affecting family to Will only", () => {
    for (const key of ["mind", "fear", "sleep", "enchantment", "illusion", "emotion"]) {
      expect(categoryAppliesToSave(key, "will")).toBe(true);
      expect(categoryAppliesToSave(key, "fort")).toBe(false);
    }
  });

  it("leaves spells, SLAs, and Su on all three saves", () => {
    for (const key of ["spell", "sla", "su"]) {
      for (const save of ["fort", "ref", "will"] as const) {
        expect(categoryAppliesToSave(key, save)).toBe(true);
      }
    }
  });

  it("uses Paizo's own abbreviation for supernatural abilities", () => {
    expect(saveCategoryLabel("su")).toBe("Su");
  });

  it("falls back to the raw key for an unknown category", () => {
    expect(saveCategoryLabel("nonsense")).toBe("nonsense");
    expect(categoryAppliesToSave("nonsense", "will")).toBe(false);
  });
});

describe("category inheritance (a bonus against the parent covers the child)", () => {
  /** HUMAN fighter 1, all 10s (no racial save notes of its own), plus `changes`. */
  function withScoped(changes: { formula: string; type: string; saveCategories: string[] }[]) {
    const doc = makeDoc();
    doc.identity.race = raceId("Human");
    return compute(
      {
        ...doc,
        live: {
          ...doc.live,
          activeBuffs: [
            {
              instanceId: "b1",
              name: "Test",
              changes: changes.map((c) => ({ ...c, target: "allSavingThrows" })),
            },
          ],
        },
      } as typeof doc,
      ref,
    );
  }

  it("names only what a modifier names", () => {
    // A mind-affecting bonus must not print a line for every descendant.
    const sheet = withScoped([{ formula: "2", type: "racial", saveCategories: ["mind"] }]);
    const lines = sheet.saves.will.conditionals ?? [];
    expect(lines.flatMap((l) => l.categories)).toEqual(["mind"]);
  });

  it("folds an ancestor's bonus into the child's total", () => {
    // Will 0. +2 racial vs. mind-affecting and +1 morale vs. charm both apply
    // to a charm effect: 0 + 2 + 1 = 3. Different types, so they sum.
    const sheet = withScoped([
      { formula: "2", type: "racial", saveCategories: ["mind"] },
      { formula: "1", type: "morale", saveCategories: ["charm"] },
    ]);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 3, categories: ["charm"], labels: ["charm"] },
      { total: 2, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });

  it("does not leak sideways between siblings", () => {
    // Charm and compulsion are both enchantment subschools, but a charm bonus
    // says nothing about a compulsion.
    const sheet = withScoped([
      { formula: "4", type: "racial", saveCategories: ["charm"] },
      { formula: "1", type: "morale", saveCategories: ["compulsion"] },
    ]);
    const compulsion = sheet.saves.will.conditionals?.find((c) =>
      c.categories.includes("compulsion"),
    );
    expect(compulsion?.total).toBe(1); // 0 + 1, not 0 + 4
  });

  it("inherits transitively, despair through emotion to mind-affecting", () => {
    const sheet = withScoped([
      { formula: "2", type: "racial", saveCategories: ["mind"] },
      { formula: "1", type: "morale", saveCategories: ["despair"] },
    ]);
    const despair = sheet.saves.will.conditionals?.find((c) => c.categories.includes("despair"));
    expect(despair?.total).toBe(3); // 0 + 2 + 1
  });

  it("keeps the source axis separate from the effect axis", () => {
    // A "+2 vs. spells" is not a mind-affecting bonus, so a fear line does not
    // absorb it even though many fear effects are spells.
    const sheet = withScoped([
      { formula: "2", type: "racial", saveCategories: ["spell"] },
      { formula: "1", type: "morale", saveCategories: ["fear"] },
    ]);
    const fear = sheet.saves.will.conditionals?.find((c) => c.categories.includes("fear"));
    expect(fear?.total).toBe(1); // 0 + 1
  });

  it("every parent names a real category and the graph is acyclic", () => {
    for (const key of Object.keys(SAVE_CATEGORIES)) {
      const chain = saveCategoryWithAncestors(key);
      expect(new Set(chain).size).toBe(chain.length);
      for (const link of chain) expect(SAVE_CATEGORIES[link]).toBeDefined();
    }
  });
});

describe("new category fixtures (traps, confusion)", () => {
  /** HUMAN fighter 1, all 10s, plus one buff change scoped to a single save target. */
  function withTargeted(target: "fort" | "ref" | "will", saveCategories: string[]) {
    const doc = makeDoc();
    doc.identity.race = raceId("Human");
    return compute(
      {
        ...doc,
        live: {
          ...doc.live,
          activeBuffs: [
            {
              instanceId: "b1",
              name: "Test",
              changes: [{ formula: "2", type: "racial", target, saveCategories }],
            },
          ],
        },
      } as typeof doc,
      ref,
    );
  }

  it("credits a Reflex-targeted trap bonus to Reflex only", () => {
    // Trap Sense (rogue) is the real-world analog: a bonus that only ever
    // shows up on the Reflex save a trap actually triggers, even though the
    // `traps` category itself stays unnarrowed for the magic-trap case.
    const sheet = withTargeted("ref", ["traps"]);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: 2, categories: ["traps"], labels: ["traps"] },
    ]);
    expect(sheet.saves.fort.conditionals ?? []).toEqual([]);
    expect(sheet.saves.will.conditionals ?? []).toEqual([]);
  });

  it("folds a mind-affecting bonus into confusion's total via the parent edge", () => {
    // Confusion (PF1 Core Rulebook) is a mind-affecting effect, so a bonus
    // against the whole family reaches it the same way it reaches fear or
    // charm above.
    const doc = makeDoc();
    doc.identity.race = raceId("Human");
    const sheet = compute(
      {
        ...doc,
        live: {
          ...doc.live,
          activeBuffs: [
            {
              instanceId: "b1",
              name: "Test",
              changes: [
                {
                  formula: "2",
                  type: "racial",
                  target: "allSavingThrows",
                  saveCategories: ["mind"],
                },
                {
                  formula: "1",
                  type: "morale",
                  target: "allSavingThrows",
                  saveCategories: ["confusion"],
                },
              ],
            },
          ],
        },
      } as typeof doc,
      ref,
    );
    const confusion = sheet.saves.will.conditionals?.find((c) =>
      c.categories.includes("confusion"),
    );
    expect(confusion?.total).toBe(3); // Will 0 + 2 mind-affecting + 1 confusion
  });
});
