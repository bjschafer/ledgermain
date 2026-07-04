/**
 * `restNewDay` (issue #30) composes HP/ability-damage/resource/spell rest
 * transitions into a single "new day" action. This suite builds a multiclass
 * (cleric/sorcerer) document with damage, drain, expended pools/spells across
 * both classes, and confirms one call resets everything RAW says a night's
 * rest should, while leaving negative levels, drain, and buffs untouched.
 */
import { describe, expect, it } from "bun:test";

import { compute, deriveResourcePools } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { setAbilityAffliction, setNegativeLevels } from "../src/model/afflictions.js";
import { addClass, createEmptyDoc, setClassLevel, toggleKnownSpell } from "../src/model/doc.js";
import { addNonlethal, applyDamage, setTempHp } from "../src/model/hp.js";
import { prepareSpell, preparedSpells, setExpendedAt } from "../src/model/preparedSpells.js";
import { restNewDay } from "../src/model/rest.js";
import { drainResource, remaining, syncDerivedPools } from "../src/model/resources.js";
import { casterModelFor, storedClassTag } from "../src/model/spellcasting.js";
import { castSpontaneousSlot, slotsUsedAtLevel } from "../src/model/spontaneousSpells.js";

const ref = loadRefData();

/** Cleric 4 / sorcerer 3 multiclass: cleric prepares, sorcerer casts spontaneously. */
function clericSorcererDoc(): CharacterDoc {
  let doc = addClass(createEmptyDoc("t"), "cleric");
  doc = setClassLevel(doc, "cleric", 4);
  doc = addClass(doc, "sorcerer");
  doc = setClassLevel(doc, "sorcerer", 3);
  return doc;
}

describe("restNewDay()", () => {
  it("resets HP, ability damage, resources, and both classes' spells; leaves drain/negative-levels/buffs alone", () => {
    let doc = clericSorcererDoc();
    const clericSpellId = ref.spellLists["cleric"]![1]![0]!;
    const sorcTag = storedClassTag(doc, ref, "sorcerer"); // "sorcerer" (cleric added first, so primary)
    const sorcModel = casterModelFor("sorcerer")!;

    doc = toggleKnownSpell(doc, ref, ref.spellLists["sorcerer"]![1]![0]!, "sorcerer");

    // HP: damaged + nonlethal + temp.
    doc = applyDamage(doc, 5);
    doc = addNonlethal(doc, 2);
    doc = setTempHp(doc, 3);

    // Ability damage (heals 1/day) and drain (never heals from rest).
    doc = setAbilityAffliction(doc, "damage", "str", 3);
    doc = setAbilityAffliction(doc, "drain", "con", 2);

    // A per-day resource pool, partially spent.
    doc = { ...doc, live: { ...doc.live, resources: { rage: { used: 2, max: 5 } } } };

    // Cleric prepared spell, cast (expended).
    doc = prepareSpell(doc, clericSpellId, undefined);
    doc = setExpendedAt(doc, 0, true);

    // Sorcerer spontaneous slot, cast (3 CHA mod for a level-3 sorcerer with default 10 CHA -> 0 mod is fine either way).
    doc = castSpontaneousSlot(doc, sorcModel, 3, 0, 1, sorcTag);
    expect(slotsUsedAtLevel(doc, 1, sorcTag)).toBe(1);

    // Negative levels: one temporary (needs a save, never auto-cleared) + one permanent.
    doc = setNegativeLevels(doc, "temporary", 1);
    doc = setNegativeLevels(doc, "permanent", 1);

    const sheet = compute(doc, ref);
    const result = restNewDay(doc, sheet, ref);
    const rested = result.doc;

    // HP fully healed, nonlethal + temp cleared.
    expect(rested.live.hp.current).toBe(sheet.hp.max);
    expect(rested.live.hp.nonlethal).toBe(0);
    expect(rested.live.hp.temp).toBe(0);

    // Ability damage healed by 1 (3 -> 2); drain untouched.
    expect(rested.live.abilityDamage?.str).toBe(2);
    expect(rested.live.abilityDrain?.con).toBe(2);

    // Resource pool reset.
    expect(rested.live.resources["rage"]).toEqual({ used: 0, max: 5 });

    // Cleric's prepared spell un-expended.
    expect(preparedSpells(rested)[0]!.expended).toBe(false);

    // Sorcerer's spontaneous slot usage reset.
    expect(slotsUsedAtLevel(rested, 1, sorcTag)).toBe(0);

    // Negative levels untouched; reminder flagged because a temporary one exists.
    expect(rested.live.negativeLevels).toEqual({ temporary: 1, permanent: 1 });
    expect(result.tempNegativeLevelReminder).toBe(true);
  });

  it("no reminder when there are no temporary negative levels", () => {
    const doc = clericSorcererDoc();
    const sheet = compute(doc, ref);
    const result = restNewDay(doc, sheet, ref);
    expect(result.tempNegativeLevelReminder).toBe(false);
  });

  it("leaves active buffs untouched", () => {
    let doc = clericSorcererDoc();
    const buff = { instanceId: "b1", name: "Bless", changes: [] };
    doc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [buff],
      },
    };
    const sheet = compute(doc, ref);
    const result = restNewDay(doc, sheet, ref);
    expect(result.doc.live.activeBuffs).toEqual([buff]);
  });

  it("without derived/refData, still resets ability damage/resources and the flat (primary-class) spell fields", () => {
    let doc = addClass(createEmptyDoc("t"), "wizard");
    doc = setClassLevel(doc, "wizard", 1);
    const wizardSpellId = ref.spellLists["wizard"]![1]![0]!;
    doc = prepareSpell(doc, wizardSpellId);
    doc = setExpendedAt(doc, 0, true);
    doc = setAbilityAffliction(doc, "damage", "dex", 1);

    const result = restNewDay(doc);
    // No `derived` passed => HP untouched (can't know max HP).
    expect(result.doc.live.hp).toEqual(doc.live.hp);
    expect(result.doc.live.abilityDamage?.dex).toBeUndefined();
    expect(preparedSpells(result.doc)[0]!.expended).toBe(false);
  });

  it("respects settings.restMode 'natural': heals 1×level instead of to max (issue #32)", () => {
    let doc = clericSorcererDoc(); // cleric 4 / sorcerer 3 = level 7
    doc = {
      ...doc,
      build: { ...doc.build, settings: { ...doc.build.settings, restMode: "natural" } },
    };
    const maxSheet = compute(doc, ref);
    const startCurrent = Math.max(0, maxSheet.hp.max - 5);
    doc = {
      ...doc,
      live: { ...doc.live, hp: { current: startCurrent, temp: 3, nonlethal: 2 } },
    };

    const sheet = compute(doc, ref);
    expect(sheet.level).toBe(7);
    const result = restNewDay(doc, sheet, ref);

    // Heals 7 (level), capped at max.
    expect(result.doc.live.hp.current).toBe(Math.min(sheet.hp.max, startCurrent + 7));
    // Nonlethal and temp still fully cleared under natural mode.
    expect(result.doc.live.hp.nonlethal).toBe(0);
    expect(result.doc.live.hp.temp).toBe(0);
  });

  it("absent settings.restMode behaves as 'full' (heal to max) — pre-#32 default preserved", () => {
    let doc = clericSorcererDoc();
    doc = applyDamage(doc, 5);
    const sheet = compute(doc, ref);
    const result = restNewDay(doc, sheet, ref);
    expect(result.doc.live.hp.current).toBe(sheet.hp.max);
  });

  it("issue #43: Arcane Reservoir rests to its RAW refill (below cap), not to max", () => {
    const extraReservoirId = Object.entries(ref.feats).find(
      ([, f]) => f.name === "Extra Reservoir",
    )![0];
    let doc = addClass(createEmptyDoc("t"), "arcanist");
    doc = setClassLevel(doc, "arcanist", 4);
    doc = { ...doc, build: { ...doc.build, feats: [extraReservoirId] } };

    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const reservoir = pools.find((p) => p.name === "Arcane Reservoir")!;
    expect(reservoir.max).toBe(10); // 3 + 4 + 3 (Extra Reservoir)
    expect(reservoir.restValue).toBe(8); // 3 + floor(4/2) + 3

    // Sync the live pool at full, spend down to 2 remaining (used = 8).
    doc = syncDerivedPools(doc, pools);
    doc = drainResource(doc, reservoir.id, 8);
    expect(remaining(doc.live.resources[reservoir.id]!)).toBe(2);

    // Renewed day sets the pool to the refill value (8), not the cap (10).
    const result = restNewDay(doc, sheet, ref);
    expect(remaining(result.doc.live.resources[reservoir.id]!)).toBe(8);
    expect(result.doc.live.resources[reservoir.id]!.max).toBe(10);
  });

  it("issue #43: resting with more than the refill remaining still drops to the refill value (leftover points are lost)", () => {
    let doc = addClass(createEmptyDoc("t"), "arcanist");
    doc = setClassLevel(doc, "arcanist", 4);

    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const reservoir = pools.find((p) => p.name === "Arcane Reservoir")!;
    expect(reservoir.max).toBe(7); // 3 + 4
    expect(reservoir.restValue).toBe(5); // 3 + floor(4/2)

    // Full pool (7 remaining) going into rest.
    doc = syncDerivedPools(doc, pools);
    expect(remaining(doc.live.resources[reservoir.id]!)).toBe(7);

    const result = restNewDay(doc, sheet, ref);
    // RAW: rest SETS the pool to the refill value; the 2 points above it
    // are lost rather than carried through to cap.
    expect(remaining(result.doc.live.resources[reservoir.id]!)).toBe(5);
  });

  it("issue #43: a non-Arcane-Reservoir pool (Rage) still rests to its cap", () => {
    let doc = addClass(createEmptyDoc("t"), "barbarian");
    doc = setClassLevel(doc, "barbarian", 5);

    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = pools.find((p) => p.name === "Rage")!;
    doc = syncDerivedPools(doc, pools);
    doc = drainResource(doc, rage.id, rage.max);
    expect(remaining(doc.live.resources[rage.id]!)).toBe(0);

    const result = restNewDay(doc, sheet, ref);
    expect(remaining(result.doc.live.resources[rage.id]!)).toBe(rage.max);
  });
});
