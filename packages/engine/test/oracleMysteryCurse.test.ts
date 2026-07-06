import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * `build.oracleCurse` gives `compute()`'s output real numeric weight for the
 * two base APG curses with an unconditional `Change` (Lame's variable
 * land-speed penalty, Wasting's -4 Cha-based skills) — see `oracle-curses.ts`.
 * `build.oracleMystery` (Mystery picker) has NO unconditional `Change` of its
 * own (class skills are display-only, bonus spells are a known-spells
 * concern handled in `apps/web/src/model/spellcasting.ts`, not `compute()`),
 * so it isn't exercised here — mirrors `sorcererBloodline.test.ts`'s pattern
 * for a build choice that DOES move the sheet.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(classes: { tag: string; level: number }[], oracleCurse?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes,
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(oracleCurse ? { oracleCurse } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute() + build.oracleCurse (Lame)", () => {
  it("a Lame oracle 5 (Human, base land speed 30) loses 10 ft. of land speed", () => {
    const withCurse = compute(makeDoc([{ tag: "oracle", level: 5 }], "lame"), ref);
    const withoutCurse = compute(makeDoc([{ tag: "oracle", level: 5 }], undefined), ref);
    expect(withoutCurse.speeds.land).toBe(30);
    expect(withCurse.speeds.land).toBe(20);
  });

  it("an unknown curse tag computes byte-identically to no curse (engine ignores it)", () => {
    const withUnknown = compute(makeDoc([{ tag: "oracle", level: 5 }], "notARealCurse"), ref);
    const withoutCurse = compute(makeDoc([{ tag: "oracle", level: 5 }], undefined), ref);
    expect(withUnknown).toEqual(withoutCurse);
  });

  it("a non-oracle with a stale Lame curse field gets nothing (gated on oracle level)", () => {
    const withCurse = compute(makeDoc([{ tag: "fighter", level: 5 }], "lame"), ref);
    const withoutCurse = compute(makeDoc([{ tag: "fighter", level: 5 }], undefined), ref);
    expect(withCurse).toEqual(withoutCurse);
  });
});
