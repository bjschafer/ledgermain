/**
 * `buildRollData`'s `@cl` field — specifically the paladin/ranger/antipaladin
 * CRB half-caster offset (`CL_OFFSET_CASTER_TAGS` in `rolldata.ts`, mirroring
 * `apps/web/src/model/casterLevel.ts`'s `OFFSET_CASTER_TAGS`).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { evaluateFormula } from "../src/formula.js";
import { buildRollData } from "../src/rolldata.js";

function docWith(classes: { tag: string; level: number }[]): CharacterDoc {
  return {
    schemaVersion: 2,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as unknown as CharacterDoc;
}

const ref = { races: {} } as unknown as Parameters<typeof buildRollData>[1];

describe("buildRollData @cl: paladin/ranger/antipaladin -3 offset", () => {
  it("paladin below the gate (no spells yet) reads @cl 0, not raw class level", () => {
    const doc = docWith([{ tag: "paladin", level: 3 }]);
    expect(buildRollData(doc, ref).cl).toBe(0);
  });

  it("paladin at/above the gate reads @cl = classLevel - 3", () => {
    expect(buildRollData(docWith([{ tag: "paladin", level: 4 }]), ref).cl).toBe(1);
    expect(buildRollData(docWith([{ tag: "paladin", level: 9 }]), ref).cl).toBe(6);
    expect(buildRollData(docWith([{ tag: "paladin", level: 20 }]), ref).cl).toBe(17);
  });

  it("ranger and antipaladin share the same offset shape", () => {
    expect(buildRollData(docWith([{ tag: "ranger", level: 9 }]), ref).cl).toBe(6);
    expect(buildRollData(docWith([{ tag: "antipaladin", level: 9 }]), ref).cl).toBe(6);
  });

  it("Divine Favor's formula evaluates correctly off the offset @cl", () => {
    // RAW: paladin 9 -> CL 6 -> min(3, floor(6/3)) = +2, NOT +3 (which a raw
    // @cl=9 would wrongly produce).
    const rollData = buildRollData(docWith([{ tag: "paladin", level: 9 }]), ref);
    expect(evaluateFormula("min(3, floor(@cl/3))", rollData)).toBe(2);

    const belowGate = buildRollData(docWith([{ tag: "paladin", level: 3 }]), ref);
    expect(evaluateFormula("min(3, floor(@cl/3))", belowGate)).toBe(0);
  });

  it("bard is a true full caster: @cl = bard level, no offset", () => {
    expect(buildRollData(docWith([{ tag: "bard", level: 5 }]), ref).cl).toBe(5);
  });

  it("bloodrager/medium keep flat classLevel once gated — unaffected by the offset fix", () => {
    expect(buildRollData(docWith([{ tag: "bloodrager", level: 4 }]), ref).cl).toBe(4);
    expect(buildRollData(docWith([{ tag: "bloodrager", level: 10 }]), ref).cl).toBe(10);
    expect(buildRollData(docWith([{ tag: "medium", level: 4 }]), ref).cl).toBe(4);
  });

  it("non-caster classes are passed through unchanged (documented single-class @cl limitation)", () => {
    expect(buildRollData(docWith([{ tag: "fighter", level: 10 }]), ref).cl).toBe(10);
  });

  it("multiclass takes the max per-class CL across classes (paladin's own CL, not raw level, competes)", () => {
    // Paladin 9 (CL 6) / Fighter 10 (no CL concept, passed through as 10) ->
    // max(6, 10) = 10, same "single-class assumption" ceiling as before this
    // fix — this fix only corrects the OFFSET applied to paladin/ranger/
    // antipaladin's own contribution, not the pre-existing multiclass @cl
    // simplification.
    const doc = docWith([
      { tag: "paladin", level: 9 },
      { tag: "fighter", level: 10 },
    ]);
    expect(buildRollData(doc, ref).cl).toBe(10);
  });
});
