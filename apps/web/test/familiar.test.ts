import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addFamiliarNonlethal,
  applyFamiliarDamage,
  clearFamiliar,
  deriveFamiliarSheet,
  familiarSupersedingCondition,
  hasFamiliarCondition,
  healFamiliar,
  healFamiliarNonlethal,
  isFamiliarConditionImplied,
  isSharedWithFamiliar,
  restFamiliar,
  setFamiliar,
  setFamiliarInReach,
  setFamiliarNotes,
  toggleFamiliarCondition,
  toggleSharedBuff,
} from "../src/model/familiar.js";

const ref = loadRefData();

function wizard4(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "wizard");
  d = setClassLevel(d, "wizard", 4);
  d = { ...d, abilities: { ...d.abilities, int: 20, wis: 12 } };
  d = {
    ...d,
    build: { ...d.build, settings: { statOverrides: { "hp.max": 25 } } },
  };
  return d;
}

describe("model/familiar.ts transitions", () => {
  it("setFamiliar sets species + name, trimming a blank name", () => {
    const d = setFamiliar(createEmptyDoc("t"), "cat", "  Mortlach  ");
    expect(d.build.familiar).toEqual({ speciesId: "cat", name: "Mortlach" });
  });

  it("setFamiliar with a blank name falls back to 'Familiar'", () => {
    const d = setFamiliar(createEmptyDoc("t"), "cat", "   ");
    expect(d.build.familiar?.name).toBe("Familiar");
  });

  it("setFamiliar preserves existing notes when only changing species/name", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = setFamiliarNotes(d, "Loves naps");
    d = setFamiliar(d, "raven", "Mortlach");
    expect(d.build.familiar).toEqual({ speciesId: "raven", name: "Mortlach", notes: "Loves naps" });
  });

  it("setFamiliarNotes no-ops without a familiar", () => {
    const d = createEmptyDoc("t");
    expect(setFamiliarNotes(d, "hi")).toBe(d);
  });

  it("clearFamiliar removes both build and live state", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = applyFamiliarDamage(d, 3);
    d = clearFamiliar(d);
    expect(d.build.familiar).toBeUndefined();
    expect(d.live.familiar).toBeUndefined();
  });

  it("applyFamiliarDamage / healFamiliar track a damage counter", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = applyFamiliarDamage(d, 5);
    expect(d.live.familiar?.damage).toBe(5);
    d = healFamiliar(d, 2);
    expect(d.live.familiar?.damage).toBe(3);
    // Healing past 0 damage floors at 0, never negative.
    d = healFamiliar(d, 99);
    expect(d.live.familiar?.damage).toBe(0);
  });

  it("addFamiliarNonlethal / healFamiliarNonlethal track nonlethal separately", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = addFamiliarNonlethal(d, 4);
    expect(d.live.familiar?.nonlethal).toBe(4);
    d = healFamiliarNonlethal(d, 10);
    expect(d.live.familiar?.nonlethal).toBe(0);
  });

  it("restFamiliar clears damage and nonlethal", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = applyFamiliarDamage(d, 5);
    d = addFamiliarNonlethal(d, 2);
    d = restFamiliar(d);
    expect(d.live.familiar?.damage).toBe(0);
    expect(d.live.familiar?.nonlethal).toBe(0);
  });

  it("toggleSharedBuff / isSharedWithFamiliar", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    expect(isSharedWithFamiliar(d, "buff-1")).toBe(false);
    d = toggleSharedBuff(d, "buff-1");
    expect(isSharedWithFamiliar(d, "buff-1")).toBe(true);
    d = toggleSharedBuff(d, "buff-1");
    expect(isSharedWithFamiliar(d, "buff-1")).toBe(false);
  });

  it("setFamiliarInReach records the toggle", () => {
    let d = createEmptyDoc("t");
    expect(d.live.familiarInReach).toBeUndefined();
    d = setFamiliarInReach(d, false);
    expect(d.live.familiarInReach).toBe(false);
  });
});

describe("deriveFamiliarSheet() — Mortlach the cat wired through the normal doc model", () => {
  it("returns undefined without a familiar", () => {
    const d = wizard4();
    const sheet = compute(d, ref);
    expect(deriveFamiliarSheet(d, ref, sheet)).toBeUndefined();
  });

  it("hand-computed fixture: HP 12, AC 16/14/14, saves +1/+4/+5, cat's +3 Stealth on the master", () => {
    let d = wizard4();
    d = {
      ...d,
      build: {
        ...d.build,
        familiar: { speciesId: "cat", name: "Mortlach" },
        skillRanks: { ste: 1, per: 3, sen: 2, spl: 4, acr: 1, lin: 1 },
      },
    };
    const sheet = compute(d, ref);
    // Master-side: BAB/base-saves/hp.max match the arcanist-4 fixture via the
    // wizard-4 stand-in (see engine test's doc comment for why).
    expect(sheet.bab).toBe(2);
    expect(sheet.hp.max).toBe(25);

    const familiar = deriveFamiliarSheet(d, ref, sheet);
    expect(familiar).toBeDefined();
    expect(familiar!.hp.max).toBe(12);
    expect(familiar!.ac).toMatchObject({ normal: 16, touch: 14, flatFooted: 14 });
    expect(familiar!.saves).toEqual({ fort: 1, ref: 4, will: 5 });
    expect(familiar!.skills.ste!.total).toBe(18);

    // Master's own sheet picks up the cat's published +3 Stealth master bonus.
    expect(sheet.skills.ste!.total).toBeGreaterThanOrEqual(3);
  });
});

describe("familiar's own active conditions", () => {
  it("toggleFamiliarCondition no-ops without a familiar", () => {
    const d = createEmptyDoc("t");
    expect(toggleFamiliarCondition(d, "shaken")).toBe(d);
  });

  it("toggleFamiliarCondition adds then removes a condition id", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    expect(hasFamiliarCondition(d, "shaken")).toBe(false);
    d = toggleFamiliarCondition(d, "shaken");
    expect(hasFamiliarCondition(d, "shaken")).toBe(true);
    d = toggleFamiliarCondition(d, "shaken");
    expect(hasFamiliarCondition(d, "shaken")).toBe(false);
  });

  it("is independent of the master's own live.conditions", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = toggleFamiliarCondition(d, "shaken");
    expect(d.live.conditions).toEqual([]);
    expect(hasFamiliarCondition(d, "shaken")).toBe(true);
  });

  it("ladder auto-upgrade: activating 'frightened' (stricter) supersedes an active 'shaken' (milder)", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Mortlach");
    d = toggleFamiliarCondition(d, "shaken");
    d = toggleFamiliarCondition(d, "frightened");
    expect(d.live.familiar?.conditions).toEqual(["frightened"]);
    expect(isFamiliarConditionImplied(d, "shaken")).toBe(true);
    expect(familiarSupersedingCondition(d, "shaken")).toBe("frightened");
  });
});
