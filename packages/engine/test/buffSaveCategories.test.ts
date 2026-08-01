/**
 * Hand-computed fixture tests for the vendored buffs whose save bonus the pack
 * ships only as a contextNote (see `buff-effects.ts`'s `SAVE_CATEGORY_PATCHES`).
 * Expected values are the published spells and items: bless and aid (+1 morale
 * on saves against fear, CRB), bane (-1, CRB), death ward (+4 morale vs. death
 * effects, CRB), inspire courage (+1 morale vs. charm and fear, rising every
 * six bard levels, CRB), and purity (a sacred bonus doubled against curses,
 * diseases, and poisons at caster level 10).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { BUFF_CHANGE_PATCHES, buildRollData, compute, deriveCompanion } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/** Human fighter 1, all abilities 10, carrying `buffs`. */
function makeDoc(buffs: ActiveBuff[], classes = [{ tag: "fighter", level: 1 }]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "buff-save-test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: buffs,
      resources: {},
    },
  } as CharacterDoc;
}

/** An activated vendored buff, exactly as `makeActiveBuff` snapshots it. */
function activate(name: string, casterLevel?: number): ActiveBuff {
  const entry = Object.values(ref.buffs).find((b) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return {
    instanceId: `${name}-1`,
    buffId: entry.id,
    name: entry.name,
    changes: entry.changes,
    contextNotes: entry.contextNotes,
    casterLevel,
  } as ActiveBuff;
}

describe("Bless (+1 morale vs. fear)", () => {
  const sheet = compute(makeDoc([activate("Bless")]), ref);

  it("leaves the headline saves alone", () => {
    // Fighter 1, all 10s: Fort +2, Ref +0, Will +0.
    expect(sheet.saves.fort.total).toBe(2);
    expect(sheet.saves.will.total).toBe(0);
  });

  it("adds a fear line on Will only", () => {
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 1, categories: ["fear"], labels: ["fear"] },
    ]);
    expect(sheet.saves.fort.conditionals).toBeUndefined();
    expect(sheet.saves.ref.conditionals).toBeUndefined();
  });

  it("keeps the scoped modifier out of the save's breakdown", () => {
    // It is not part of the number the breakdown explains.
    expect(sheet.saves.will.components.some((c) => c.source === "Bless")).toBe(false);
  });
});

describe("Bane (-1 vs. fear)", () => {
  it("shows a fear line BELOW the headline", () => {
    const sheet = compute(makeDoc([activate("Bane")]), ref);
    expect(sheet.saves.will.total).toBe(0);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: -1, categories: ["fear"], labels: ["fear"] },
    ]);
  });
});

describe("Death Ward (+4 morale vs. death effects)", () => {
  it("shows on Fortitude only, where death effects are rolled", () => {
    const sheet = compute(makeDoc([activate("Death Ward")]), ref);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 6, categories: ["death"], labels: ["death"] },
    ]);
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });
});

describe("Inspire Courage (scales with the bard's level)", () => {
  it("is +1 at 1st and +2 at 5th, against charm and fear alike", () => {
    // 1 + max(0, floor((level + 1) / 6)): +1 through 4th, +2 from 5th. Both
    // categories share the total, so they merge into one line.
    const low = compute(makeDoc([activate("Inspire Courage", 1)]), ref);
    const high = compute(makeDoc([activate("Inspire Courage", 5)]), ref);
    expect(low.saves.will.conditionals).toEqual([
      { total: 1, categories: ["fear", "charm"], labels: ["fear", "charm"] },
    ]);
    expect(high.saves.will.conditionals).toEqual([
      { total: 2, categories: ["fear", "charm"], labels: ["fear", "charm"] },
    ]);
  });
});

describe("Purity (a sacred bonus doubled against three categories at CL 10)", () => {
  it("below caster level 10 the bonus is flat, so there is no situational line", () => {
    // CL 5: +2 sacred on every save, nothing extra.
    const sheet = compute(makeDoc([activate("Purity", 5)]), ref);
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.fort.conditionals).toBeUndefined();
  });

  it("at caster level 10 it doubles rather than stacking", () => {
    // CL 10: +3 sacred headline, doubled to +6 vs. curses/diseases/poisons.
    // Two sacred bonuses never sum, so the doubled value has to win outright.
    const sheet = compute(makeDoc([activate("Purity", 10)]), ref);
    expect(sheet.saves.fort.total).toBe(5);
    expect(sheet.saves.fort.conditionals).toEqual([
      {
        total: 8,
        categories: ["poison", "disease", "curse"],
        labels: ["poison", "disease", "curses"],
      },
    ]);
  });
});

describe("a shared buff carries its scope to the companion", () => {
  it("bless shared with a wolf raises its Will line against fear only", () => {
    const doc = makeDoc([activate("Bless")], [{ tag: "druid", level: 7 }]);
    const withCompanion: CharacterDoc = {
      ...doc,
      build: {
        ...doc.build,
        animalCompanion: { speciesId: "wolf", name: "Fang", source: ["nature-bond"] },
      },
      live: { ...doc.live, animalCompanion: { sharedBuffIds: ["Bless-1"] } },
    };
    const wolf = deriveCompanion(withCompanion, buildRollData(withCompanion, ref))!;
    // Will +3 headline; Devotion (+4 morale) and bless (+1 morale) are the
    // same type, so against fear alone bless gives +1 and against enchantment
    // Devotion gives +4.
    expect(wolf.saves.will).toBe(3);
    expect(wolf.saveConditionals?.will).toEqual([
      { total: 7, categories: ["enchantment"], labels: ["enchantment"] },
      { total: 4, categories: ["fear"], labels: ["fear"] },
    ]);
  });
});

describe("the note-matching contract", () => {
  it("every patched buff still exists and still carries the note it was read from", () => {
    // The patches were transcribed from each buff's own contextNote, so a data
    // bump that adds real changes[] upstream must retire the patch rather than
    // double it.
    const problems: string[] = [];
    for (const name of Object.keys(BUFF_CHANGE_PATCHES)) {
      const entry = Object.values(ref.buffs).find((b) => b.name === name);
      if (!entry) {
        problems.push(`${name}: no vendored buff by that name`);
        continue;
      }
      const patched = BUFF_CHANGE_PATCHES[name]!;
      const scoped = patched.filter((c) => (c.saveCategories?.length ?? 0) > 0);
      if (scoped.length === 0) continue; // the tempHp patch, checked elsewhere
      const notes = entry.contextNotes.filter((n) => n.target === "allSavingThrows");
      if (notes.length < scoped.length) {
        problems.push(`${name}: ${scoped.length} scoped patches but ${notes.length} save notes`);
      }
      if (entry.changes.some((c) => c.target === "allSavingThrows")) {
        // Purity ships an unconditional save change its patch deliberately
        // doubles; anything else would be a double-count.
        if (name !== "Purity") problems.push(`${name}: now ships its own save change`);
      }
    }
    expect(problems).toEqual([]);
  });
});
