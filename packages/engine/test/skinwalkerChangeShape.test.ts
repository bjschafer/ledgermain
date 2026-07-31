/**
 * Fixture coverage for the Skinwalker "-Kin" heritage shapechanged riders:
 * each heritage's "+2 X while shapechanged" clause (data-pipeline
 * `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES`) is a `Change` gated by
 * `activeWhenBuff: { effectTags: ["skinwalker:changeShape"] }`, toggled by
 * the web app's `model/skinwalker.ts` `toggleChangeShape` (a marker buff with
 * no changes of its own, the same "no vendored buff to link" shape as
 * `@pf1/engine` `toggle-buffs.ts`'s `ToggleBuffOption`).
 *
 * These fixtures also regression-guard `collect.ts`'s vendored-racial-trait
 * loop actually consulting `gateOpen` — it silently skipped the check for
 * every vendored trait (and every hand-authored one) until this heritage
 * needed it, see that file's doc comment.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string): string {
  const entry = Object.values(ref.racialTraits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored racial trait not found: ${name}`);
  return entry.id;
}

const CHANGE_SHAPE_BUFF = {
  instanceId: "change-shape-1",
  effectTag: "skinwalker:changeShape",
  name: "Change Shape (Skinwalker)",
  changes: [],
};

function makeDoc(vendoredRacialTraits: string[], shapechanged: boolean): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Skinwalker"),
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      vendoredRacialTraits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: shapechanged ? [CHANGE_SHAPE_BUFF] : [],
      resources: {},
    },
  };
}

describe("Skinwalker -Kin heritage shapechanged riders (activeWhenBuff gate)", () => {
  it("Ragebred: +2 Con only while shapechanged, off by default", () => {
    const ragebred = traitId("Wereboar-Kin (Ragebred)");
    const notShapechanged = compute(makeDoc([ragebred], false), ref);
    const baseline = compute(makeDoc([], false), ref);
    expect(notShapechanged.abilities.con.total).toBe(baseline.abilities.con.total);

    const shapechanged = compute(makeDoc([ragebred], true), ref);
    expect(shapechanged.abilities.con.total).toBe(baseline.abilities.con.total + 2);
    // The always-on half (+2 Str, -2 Cha) is unaffected by the toggle.
    expect(shapechanged.abilities.str.total).toBe(notShapechanged.abilities.str.total);
    expect(shapechanged.abilities.cha.total).toBe(notShapechanged.abilities.cha.total);
  });

  it("Coldborn: the shapechanged bonus can land on a MENTAL ability (Wis), not just physical", () => {
    // Base skinwalker's own generic rider restricts the choice to a
    // physical ability (Str/Dex/Con); a -Kin heritage's own fixed rider is
    // not bound by that restriction (Coldborn: "+2 Con, -2 Cha (+2 Wis
    // while shapechanged)" — verified against aonprd.com).
    const coldborn = traitId("Werebear-Kin (Coldborn)");
    const notShapechanged = compute(makeDoc([coldborn], false), ref);
    const shapechanged = compute(makeDoc([coldborn], true), ref);
    expect(shapechanged.abilities.wis.total).toBe(notShapechanged.abilities.wis.total + 2);
  });

  it("Fanglord: +2 Cha only while shapechanged", () => {
    const fanglord = traitId("Weretiger-Kin (Fanglord)");
    const notShapechanged = compute(makeDoc([fanglord], false), ref);
    const shapechanged = compute(makeDoc([fanglord], true), ref);
    expect(shapechanged.abilities.cha.total).toBe(notShapechanged.abilities.cha.total + 2);
  });

  it("Ragebred and Scaleheart correct a mistyped vendored primary ability (Str/Con, not Wis/Int)", () => {
    // Both heritages' vendored `description` prose itself says "+2 Wis"/
    // "+2 Int" (matched verbatim by the supplement's drift-guard `keyword`),
    // but the published heritages (aonprd.com) are "+2 Strength" and
    // "+2 Constitution" respectively — only the shapechanged half and the
    // ability penalty were correct upstream.
    const ragebred = traitId("Wereboar-Kin (Ragebred)");
    const scaleheart = traitId("Werecrocodile-Kin (Scaleheart)");
    const baseline = compute(makeDoc([], false), ref);

    const withRagebred = compute(makeDoc([ragebred], false), ref);
    expect(withRagebred.abilities.str.total).toBe(baseline.abilities.str.total + 2);
    expect(withRagebred.abilities.wis.total).toBe(baseline.abilities.wis.total - 2);

    const withScaleheart = compute(makeDoc([scaleheart], false), ref);
    expect(withScaleheart.abilities.con.total).toBe(baseline.abilities.con.total + 2);
    // Scaleheart doesn't touch Int at all; the base race's own -2 Int is
    // suppressed away with the rest of "Base Statistics", so Int recovers.
    expect(withScaleheart.abilities.int.total).toBe(baseline.abilities.int.total + 2);
  });

  it("a plain buffId-matched buff (not the effectTag) does not open the gate", () => {
    // The gate is `effectTags`-only for this heritage rider (no vendored
    // buff exists to key a real `buffId` off) — an unrelated active buff
    // must not accidentally satisfy it.
    const ragebred = traitId("Wereboar-Kin (Ragebred)");
    const doc = makeDoc([ragebred], false);
    const withUnrelatedBuff: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          { instanceId: "b1", buffId: "not-change-shape", name: "Unrelated", changes: [] },
        ],
      },
    };
    const sheet = compute(withUnrelatedBuff, ref);
    const baseline = compute(makeDoc([], false), ref);
    expect(sheet.abilities.con.total).toBe(baseline.abilities.con.total);
  });

  it("toggling back off removes the bonus again", () => {
    const ragebred = traitId("Wereboar-Kin (Ragebred)");
    const on = compute(makeDoc([ragebred], true), ref);
    const off = compute(makeDoc([ragebred], false), ref);
    expect(on.abilities.con.total).toBe(off.abilities.con.total + 2);
  });

  it("shapechanged with NO -Kin heritage picked grants nothing (base race's own choice is not modeled)", () => {
    const baseline = compute(makeDoc([], false), ref);
    const shapechangedNoHeritage = compute(makeDoc([], true), ref);
    for (const id of ["str", "dex", "con", "int", "wis", "cha"] as const) {
      expect(shapechangedNoHeritage.abilities[id].total).toBe(baseline.abilities[id].total);
    }
  });
});
