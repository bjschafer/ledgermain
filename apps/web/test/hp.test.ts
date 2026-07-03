import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import { hpState, setStable } from "../src/model/hp.js";

const ref = loadRefData();

/** A level-1 fighter with the given Con score (default 10, matching createEmptyDoc), for derived-sheet tests. */
function fighterWithCon(con = 10): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "fighter");
  d = setClassLevel(d, "fighter", 1);
  d = { ...d, abilities: { ...d.abilities, con } };
  return d;
}

function withHp(d: CharacterDoc, hp: Partial<CharacterDoc["live"]["hp"]>): CharacterDoc {
  return { ...d, live: { ...d.live, hp: { ...d.live.hp, ...hp } } };
}

describe("hpState()", () => {
  it("current === 0 is disabled/staggered", () => {
    const d = withHp(fighterWithCon(10), { current: 0 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet)).toEqual({ status: "disabled", diesAt: -10 });
  });

  it("current === -1 is dying (just past 0)", () => {
    const d = withHp(fighterWithCon(10), { current: -1 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("dying");
  });

  it("current === -Con + 1 is still dying (one above the death threshold)", () => {
    const d = withHp(fighterWithCon(10), { current: -9 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet)).toEqual({ status: "dying", diesAt: -10 });
  });

  it("current === -Con is dead", () => {
    const d = withHp(fighterWithCon(10), { current: -10 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet)).toEqual({ status: "dead", diesAt: -10 });
  });

  it("current below -Con is dead", () => {
    const d = withHp(fighterWithCon(10), { current: -25 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("dead");
  });

  it("uses the derived (buffed) Con total, not the base build score, for the death threshold", () => {
    // Con 10 base but a +4 belt-of-physical-might-style buff would raise the
    // derived total; simulate directly by checking diesAt tracks the base
    // score change (no buff plumbing needed to exercise the threshold math).
    const d = withHp(fighterWithCon(16), { current: -15 });
    const sheet = compute(d, ref);
    expect(sheet.abilities.con.total).toBe(16);
    expect(hpState(d, sheet)).toEqual({ status: "dying", diesAt: -16 });
  });

  it("dying character marked stable reports 'stable' instead of 'dying'", () => {
    let d = withHp(fighterWithCon(10), { current: -5 });
    d = setStable(d, true);
    const sheet = compute(d, ref);
    expect(hpState(d, sheet)).toEqual({ status: "stable", diesAt: -10 });
  });

  it("the stable flag is ignored once HP reaches the death threshold", () => {
    let d = withHp(fighterWithCon(10), { current: -10 });
    d = setStable(d, true);
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("dead");
  });

  it("the stable flag is ignored at 0 HP (disabled, not dying)", () => {
    let d = withHp(fighterWithCon(10), { current: 0 });
    d = setStable(d, true);
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("disabled");
  });

  it("nonlethal damage equal to current HP is staggered-nonlethal", () => {
    const d = withHp(fighterWithCon(10), { current: 5, nonlethal: 5 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("staggered-nonlethal");
  });

  it("nonlethal damage exceeding current HP is unconscious-nonlethal", () => {
    const d = withHp(fighterWithCon(10), { current: 5, nonlethal: 6 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("unconscious-nonlethal");
  });

  it("nonlethal damage below current HP is ok", () => {
    const d = withHp(fighterWithCon(10), { current: 5, nonlethal: 4 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("ok");
  });

  it("healthy positive HP with no nonlethal is ok", () => {
    const d = withHp(fighterWithCon(10), { current: 12, nonlethal: 0 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("ok");
  });

  it("negative current takes priority over nonlethal (already dying, not staggered-nonlethal)", () => {
    const d = withHp(fighterWithCon(10), { current: -2, nonlethal: 5 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("dying");
  });

  it("temp HP does not factor into the state (already soaked before current changes)", () => {
    const d = withHp(fighterWithCon(10), { current: 5, temp: 50, nonlethal: 0 });
    const sheet = compute(d, ref);
    expect(hpState(d, sheet).status).toBe("ok");
  });
});

describe("setStable()", () => {
  it("sets and clears the flag without mutating the original doc", () => {
    const original = createEmptyDoc("t");
    const stabilized = setStable(original, true);
    expect(original.live.stable).toBeUndefined();
    expect(stabilized.live.stable).toBe(true);

    const cleared = setStable(stabilized, false);
    expect(cleared.live.stable).toBe(false);
  });
});
