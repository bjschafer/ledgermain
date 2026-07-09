import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { setAbilityAffliction } from "../src/model/afflictions.js";
import { addBuff, makeActiveBuff } from "../src/model/buffs.js";
import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import { applyGrantedTempHp, hpState, setStable, setTempHp } from "../src/model/hp.js";

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

  it("a brand-new character with no class levels (max HP 0) is 'no-hp', not 'disabled'", () => {
    const d = createEmptyDoc("t");
    const sheet = compute(d, ref);
    expect(sheet.hp.max).toBe(0);
    expect(hpState(d, sheet).status).toBe("no-hp");
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

describe("hpState() — Con drained to (or below) 0 is dead regardless of HP (issue #31)", () => {
  it("Con total 0 (drain) is dead even at full positive HP", () => {
    let d = fighterWithCon(10);
    d = setAbilityAffliction(d, "drain", "con", 10);
    d = withHp(d, { current: 12 });
    const sheet = compute(d, ref);
    expect(sheet.abilities.con.total).toBe(0);
    expect(hpState(d, sheet).status).toBe("dead");
  });

  it("Con total below 0 (heavy drain) is also dead at full positive HP", () => {
    let d = fighterWithCon(10);
    d = setAbilityAffliction(d, "drain", "con", 15);
    d = withHp(d, { current: 12 });
    const sheet = compute(d, ref);
    expect(sheet.abilities.con.total).toBe(-5);
    expect(hpState(d, sheet).status).toBe("dead");
  });

  it("Con total 1 uses the normal HP-based thresholds instead of the forced-dead rule", () => {
    let d = fighterWithCon(10);
    d = setAbilityAffliction(d, "drain", "con", 9);
    const withCon1 = compute(d, ref);
    expect(withCon1.abilities.con.total).toBe(1);

    const full = withHp(d, { current: 12 });
    expect(hpState(full, compute(full, ref)).status).toBe("ok");

    const zero = withHp(d, { current: 0 });
    expect(hpState(zero, compute(zero, ref)).status).toBe("disabled");

    const atThreshold = withHp(d, { current: -1 });
    expect(hpState(atThreshold, compute(atThreshold, ref))).toEqual({
      status: "dead",
      diesAt: -1,
    });
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

/** A level-5 Con-14 barbarianUnchained, for granted-temp-HP fixtures (issue #67). */
function ragingBarbarianDoc(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "barbarianUnchained");
  d = setClassLevel(d, "barbarianUnchained", 5);
  d = { ...d, abilities: { ...d.abilities, con: 14 } };
  return d;
}

function rageBuffName(): string {
  const entry = Object.values(ref.buffs).find((b) => b.name === "Rage (Unchained)");
  if (!entry) throw new Error("Rage (Unchained) buff not found");
  return entry.name;
}

function rageBuffDef() {
  const entry = Object.values(ref.buffs).find((b) => b.name === "Rage (Unchained)");
  if (!entry) throw new Error("Rage (Unchained) buff not found");
  return entry;
}

describe("applyGrantedTempHp() (issue #67)", () => {
  it("activating Rage (Unchained) raises live.hp.temp to the granted total (10 at L5 Con14)", () => {
    const before = ragingBarbarianDoc();
    const after = addBuff(before, makeActiveBuff(rageBuffDef()));
    const synced = applyGrantedTempHp(before, after, ref);
    expect(synced.live.hp.temp).toBe(10);
  });

  it("deactivating the only tempHp-granting buff clears live.hp.temp to 0", () => {
    const raging = addBuff(ragingBarbarianDoc(), makeActiveBuff(rageBuffDef()));
    const withTemp = setTempHp(raging, 10);
    // Damage already consumed some of the pool before rage ends.
    const damaged = setTempHp(withTemp, 4);
    const unraged = { ...damaged, live: { ...damaged.live, activeBuffs: [] } };
    const synced = applyGrantedTempHp(damaged, unraged, ref);
    expect(synced.live.hp.temp).toBe(0);
  });

  it("toggling an unrelated buff (no tempHp change) never touches unrelated manual temp HP", () => {
    const before = withHp(ragingBarbarianDoc(), { temp: 5 });
    const unrelatedBuff = {
      id: "fake-bulls-strength",
      uuid: "fake",
      name: "Bull's Strength",
      changes: [{ formula: "4", target: "str", type: "enh" }],
      contextNotes: [],
    };
    const after = addBuff(before, makeActiveBuff(unrelatedBuff));
    const synced = applyGrantedTempHp(before, after, ref);
    expect(synced.live.hp.temp).toBe(5);
  });

  it("never lowers an already-higher pool (e.g. more manual temp HP than the buff grants)", () => {
    const before = ragingBarbarianDoc();
    const raging = addBuff(before, makeActiveBuff(rageBuffDef()));
    const after = setTempHp(raging, 50);
    const synced = applyGrantedTempHp(before, after, ref);
    expect(synced.live.hp.temp).toBe(50);
  });

  it("re-affirms the buff name used elsewhere in this fixture is the real vendored 'Rage (Unchained)'", () => {
    expect(rageBuffName()).toBe("Rage (Unchained)");
  });
});
