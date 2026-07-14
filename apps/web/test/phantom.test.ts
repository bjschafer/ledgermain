import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addPhantomNonlethal,
  applyPhantomDamage,
  clearPhantom,
  derivePhantomSheet,
  hasPhantomCondition,
  healPhantom,
  healPhantomNonlethal,
  isPhantomConditionImplied,
  isSharedWithPhantom,
  phantomSupersedingCondition,
  restPhantom,
  setPhantom,
  setPhantomAbilityIncrease,
  setPhantomManifestation,
  setPhantomNotes,
  setPhantomSize,
  togglePhantomCondition,
  toggleSharedBuffPhantom,
} from "../src/model/phantom.js";

const ref = loadRefData();

function spiritualist7(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "spiritualist");
  d = setClassLevel(d, "spiritualist", 7);
  return d;
}

describe("model/phantom.ts transitions", () => {
  it("setPhantom sets focus + name, trimming a blank name", () => {
    const d = setPhantom(createEmptyDoc("t"), "anger", "  Grief  ");
    expect(d.build.phantom).toEqual({ focus: "anger", name: "Grief" });
  });

  it("setPhantom with a blank name falls back to 'Phantom'", () => {
    const d = setPhantom(createEmptyDoc("t"), "anger", "   ");
    expect(d.build.phantom?.name).toBe("Phantom");
  });

  it("setPhantomNotes no-ops without a phantom", () => {
    const d = createEmptyDoc("t");
    expect(setPhantomNotes(d, "hi")).toBe(d);
  });

  it("setPhantomSize no-ops without a phantom, otherwise sets size", () => {
    const empty = createEmptyDoc("t");
    expect(setPhantomSize(empty, "lg")).toBe(empty);

    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = setPhantomSize(d, "lg");
    expect(d.build.phantom?.size).toBe("lg");
  });

  it("clearPhantom removes both build and live state", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = applyPhantomDamage(d, 3);
    d = clearPhantom(d);
    expect(d.build.phantom).toBeUndefined();
    expect(d.live.phantom).toBeUndefined();
  });

  it("applyPhantomDamage / healPhantom track a damage counter", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = applyPhantomDamage(d, 10);
    expect(d.live.phantom?.damage).toBe(10);
    d = healPhantom(d, 4);
    expect(d.live.phantom?.damage).toBe(6);
    d = healPhantom(d, 99);
    expect(d.live.phantom?.damage).toBe(0);
  });

  it("addPhantomNonlethal / healPhantomNonlethal track nonlethal separately", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = addPhantomNonlethal(d, 4);
    expect(d.live.phantom?.nonlethal).toBe(4);
    d = healPhantomNonlethal(d, 10);
    expect(d.live.phantom?.nonlethal).toBe(0);
  });

  it("restPhantom clears damage and nonlethal", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = applyPhantomDamage(d, 5);
    d = addPhantomNonlethal(d, 2);
    d = restPhantom(d);
    expect(d.live.phantom?.damage).toBe(0);
    expect(d.live.phantom?.nonlethal).toBe(0);
  });

  it("toggleSharedBuffPhantom / isSharedWithPhantom", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    expect(isSharedWithPhantom(d, "buff-1")).toBe(false);
    d = toggleSharedBuffPhantom(d, "buff-1");
    expect(isSharedWithPhantom(d, "buff-1")).toBe(true);
    d = toggleSharedBuffPhantom(d, "buff-1");
    expect(isSharedWithPhantom(d, "buff-1")).toBe(false);
  });

  it("setPhantomAbilityIncrease sets a slot, padding earlier unset slots with 'cha'", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = setPhantomAbilityIncrease(d, 1, "str");
    expect(d.build.phantom?.abilityIncreases).toEqual(["cha", "str"]);
  });

  it("setPhantomManifestation no-ops without a phantom, otherwise sets live state", () => {
    const empty = createEmptyDoc("t");
    expect(setPhantomManifestation(empty, "incorporeal")).toBe(empty);

    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = setPhantomManifestation(d, "confined");
    expect(d.live.phantom?.manifestation).toBe("confined");
  });
});

describe("derivePhantomSheet() — wired through the normal doc model", () => {
  it("returns undefined without a phantom", () => {
    const d = spiritualist7();
    expect(derivePhantomSheet(d, ref)).toBeUndefined();
  });

  it("hand-computed fixture: spiritualist-7 anger phantom, HD 6, BAB +6, Medium", () => {
    let d = spiritualist7();
    d = setPhantom(d, "anger", "Grief");

    const phantom = derivePhantomSheet(d, ref);
    expect(phantom).toBeDefined();
    expect(phantom!.level).toBe(7);
    expect(phantom!.hd).toBe(6);
    expect(phantom!.bab).toBe(6);
    expect(phantom!.size).toBe("med");
  });

  it("returns undefined for an unknown Emotional Focus id", () => {
    let d = spiritualist7();
    d = setPhantom(d, "not-a-focus", "Ghost");
    expect(derivePhantomSheet(d, ref)).toBeUndefined();
  });
});

describe("phantom's own active conditions", () => {
  it("togglePhantomCondition no-ops without a phantom", () => {
    const d = createEmptyDoc("t");
    expect(togglePhantomCondition(d, "shaken")).toBe(d);
  });

  it("togglePhantomCondition adds then removes a condition id", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    expect(hasPhantomCondition(d, "shaken")).toBe(false);
    d = togglePhantomCondition(d, "shaken");
    expect(hasPhantomCondition(d, "shaken")).toBe(true);
    d = togglePhantomCondition(d, "shaken");
    expect(hasPhantomCondition(d, "shaken")).toBe(false);
  });

  it("is independent of the spiritualist's own live.conditions", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = togglePhantomCondition(d, "shaken");
    expect(d.live.conditions).toEqual([]);
    expect(hasPhantomCondition(d, "shaken")).toBe(true);
  });

  it("ladder auto-upgrade: activating 'frightened' (stricter) supersedes an active 'shaken' (milder)", () => {
    let d = setPhantom(createEmptyDoc("t"), "anger", "Grief");
    d = togglePhantomCondition(d, "shaken");
    d = togglePhantomCondition(d, "frightened");
    expect(d.live.phantom?.conditions).toEqual(["frightened"]);
    expect(isPhantomConditionImplied(d, "shaken")).toBe(true);
    expect(phantomSupersedingCondition(d, "shaken")).toBe("frightened");
  });
});
