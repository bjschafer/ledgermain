import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  activeAbilityAfflictions,
  getAbilityAffliction,
  getNegativeLevels,
  hasAnyAffliction,
  isDisabledByDamage,
  negLevelDeathWarning,
  setAbilityAffliction,
  setNegativeLevels,
  totalNegativeLevels,
} from "../src/model/afflictions.js";

const ref = loadRefData();

function doc() {
  return createEmptyDoc("t");
}

/** A level-`level` fighter with the given ability scores, for derived-sheet tests. */
function fighterAt(level: number, abilities: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>> = {}) {
  let d = createEmptyDoc("t");
  d = addClass(d, "fighter");
  d = setClassLevel(d, "fighter", level);
  d = { ...d, abilities: { ...d.abilities, ...abilities } };
  return d;
}

describe("ability afflictions: get/set", () => {
  it("reads 0 when unset", () => {
    expect(getAbilityAffliction(doc(), "damage", "str")).toBe(0);
    expect(getAbilityAffliction(doc(), "drain", "con")).toBe(0);
    expect(getAbilityAffliction(doc(), "penalty", "wis")).toBe(0);
  });

  it("sets and reads back", () => {
    let d = doc();
    d = setAbilityAffliction(d, "damage", "str", 4);
    expect(getAbilityAffliction(d, "damage", "str")).toBe(4);
    expect(d.live.abilityDamage).toEqual({ str: 4 });
  });

  it("clamps negative values to 0", () => {
    const d = setAbilityAffliction(doc(), "drain", "con", -3);
    expect(getAbilityAffliction(d, "drain", "con")).toBe(0);
  });

  it("truncates fractional/NaN input", () => {
    expect(getAbilityAffliction(setAbilityAffliction(doc(), "penalty", "dex", 2.9), "penalty", "dex")).toBe(2);
    expect(getAbilityAffliction(setAbilityAffliction(doc(), "penalty", "dex", NaN), "penalty", "dex")).toBe(0);
  });

  it("setting to 0 removes the entry rather than storing an explicit 0", () => {
    let d = doc();
    d = setAbilityAffliction(d, "damage", "str", 3);
    d = setAbilityAffliction(d, "damage", "str", 0);
    expect(d.live.abilityDamage).toEqual({});
  });

  it("different kinds are independent", () => {
    let d = doc();
    d = setAbilityAffliction(d, "damage", "str", 2);
    d = setAbilityAffliction(d, "drain", "str", 1);
    d = setAbilityAffliction(d, "penalty", "str", 3);
    expect(getAbilityAffliction(d, "damage", "str")).toBe(2);
    expect(getAbilityAffliction(d, "drain", "str")).toBe(1);
    expect(getAbilityAffliction(d, "penalty", "str")).toBe(3);
  });

  it("does not mutate the original doc", () => {
    const original = doc();
    setAbilityAffliction(original, "damage", "str", 5);
    expect(getAbilityAffliction(original, "damage", "str")).toBe(0);
  });
});

describe("activeAbilityAfflictions()", () => {
  it("empty by default", () => {
    expect(activeAbilityAfflictions(doc())).toEqual([]);
  });

  it("lists every nonzero entry across all three kinds", () => {
    let d = doc();
    d = setAbilityAffliction(d, "damage", "con", 4);
    d = setAbilityAffliction(d, "drain", "dex", 2);
    const list = activeAbilityAfflictions(d);
    expect(list).toHaveLength(2);
    expect(list).toContainEqual({ ability: "con", kind: "damage", points: 4 });
    expect(list).toContainEqual({ ability: "dex", kind: "drain", points: 2 });
  });
});

describe("negative levels: get/set/total", () => {
  it("both 0 by default", () => {
    expect(getNegativeLevels(doc())).toEqual({ temporary: 0, permanent: 0 });
    expect(totalNegativeLevels(doc())).toBe(0);
  });

  it("sets temporary and permanent independently", () => {
    let d = doc();
    d = setNegativeLevels(d, "temporary", 2);
    d = setNegativeLevels(d, "permanent", 1);
    expect(getNegativeLevels(d)).toEqual({ temporary: 2, permanent: 1 });
    expect(totalNegativeLevels(d)).toBe(3);
  });

  it("clamps negative input to 0", () => {
    const d = setNegativeLevels(doc(), "temporary", -1);
    expect(getNegativeLevels(d).temporary).toBe(0);
  });
});

describe("hasAnyAffliction()", () => {
  it("false for a fresh doc", () => {
    expect(hasAnyAffliction(doc())).toBe(false);
  });

  it("true when an ability affliction is set", () => {
    expect(hasAnyAffliction(setAbilityAffliction(doc(), "damage", "str", 1))).toBe(true);
  });

  it("true when a negative level is set", () => {
    expect(hasAnyAffliction(setNegativeLevels(doc(), "permanent", 1))).toBe(true);
  });
});

describe("isDisabledByDamage()", () => {
  it("false with no damage", () => {
    const d = fighterAt(1, { con: 14 });
    const sheet = compute(d, ref);
    expect(isDisabledByDamage(d, sheet, "con")).toBe(false);
  });

  it("false when damage is below the current score", () => {
    let d = fighterAt(1, { con: 14 });
    d = setAbilityAffliction(d, "damage", "con", 4); // well below 14
    const sheet = compute(d, ref);
    expect(isDisabledByDamage(d, sheet, "con")).toBe(false);
  });

  it("true when damage reaches the current score", () => {
    let d = fighterAt(1, { con: 10 });
    d = setAbilityAffliction(d, "damage", "con", 10); // damage === score
    const sheet = compute(d, ref);
    expect(isDisabledByDamage(d, sheet, "con")).toBe(true);
  });

  it("true when damage exceeds the current score", () => {
    let d = fighterAt(1, { str: 8 });
    d = setAbilityAffliction(d, "damage", "str", 12); // exceeds 8
    const sheet = compute(d, ref);
    expect(isDisabledByDamage(d, sheet, "str")).toBe(true);
  });
});

describe("negLevelDeathWarning()", () => {
  it("false with no negative levels", () => {
    const d = fighterAt(5);
    const sheet = compute(d, ref);
    expect(negLevelDeathWarning(d, sheet)).toBe(false);
  });

  it("false when total negative levels are below character level", () => {
    let d = fighterAt(5);
    d = setNegativeLevels(d, "temporary", 2);
    const sheet = compute(d, ref);
    expect(negLevelDeathWarning(d, sheet)).toBe(false);
  });

  it("true when total negative levels reach character level", () => {
    let d = fighterAt(3);
    d = setNegativeLevels(d, "temporary", 2);
    d = setNegativeLevels(d, "permanent", 1);
    const sheet = compute(d, ref);
    expect(negLevelDeathWarning(d, sheet)).toBe(true);
  });

  it("true when total negative levels exceed character level", () => {
    let d = fighterAt(2);
    d = setNegativeLevels(d, "permanent", 5);
    const sheet = compute(d, ref);
    expect(negLevelDeathWarning(d, sheet)).toBe(true);
  });
});
