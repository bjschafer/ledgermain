import { describe, expect, test } from "bun:test";
import type { Monster } from "@pf1/schema";

import { applyAdjustments } from "../src/model/adjust/apply.js";
import {
  conditionAdjustment,
  conditionAdjustments,
  supersedingCondition,
  toggleCondition,
} from "../src/model/adjust/conditions.js";

/**
 * Wolf, Bestiary p. 278 (with a Stealth/Survival line added to exercise the
 * skill shifts). Expected values below are hand-computed from the CRB
 * conditions appendix, applied to these printed numbers.
 */
function wolf(): Monster {
  return {
    id: "wolf",
    name: "Wolf",
    uuid: "Compendium.pf1.test.Item.wolf",
    cr: "1",
    init: "+2",
    senses: "low-light vision, scent; Perception +8",
    ac: 14,
    touchAc: 12,
    flatFootedAc: 12,
    acMods: "+2 Dex, +2 natural",
    hp: 13,
    hd: "2d8+4",
    fort: "+5",
    ref: "+5",
    will: "+1",
    speed: "50 ft.",
    melee: "bite +2 (1d6+1 plus trip)",
    abilityScores: { str: 13, dex: 15, con: 15, int: 2, wis: 12, cha: 6 },
    bab: "+1",
    cmb: "+2",
    cmd: "14 (18 vs. trip)",
    skills: "Perception +8, Stealth +6, Survival +1 (+5 when tracking by scent)",
  };
}

function applyCondition(id: string, monster: Monster = wolf()) {
  const adj = conditionAdjustment(id);
  expect(adj).toBeDefined();
  return applyAdjustments(monster, [adj!]);
}

describe("condition adjustments on a statblock", () => {
  // Shaken: -2 on attack rolls, saving throws, and skill checks.
  test("shaken shifts attacks, saves, and every printed skill bonus", () => {
    const { monster } = applyCondition("shaken");
    expect(monster.melee).toBe("bite +0 (1d6+1 plus trip)");
    expect(monster.fort).toBe("+3");
    expect(monster.ref).toBe("+3");
    expect(monster.will).toBe("-1");
    expect(monster.skills).toBe(
      "Perception +6, Stealth +4, Survival -1 (+3 when tracking by scent)",
    );
    expect(monster.senses).toBe("low-light vision, scent; Perception +6");
    // Untouched: AC, hp, CMB/CMD, init.
    expect(monster.ac).toBe(14);
    expect(monster.cmb).toBe("+2");
    expect(monster.init).toBe("+2");
  });

  // Sickened: shaken's penalties plus -2 on weapon damage rolls.
  test("sickened also shifts weapon damage", () => {
    const { monster } = applyCondition("sickened");
    expect(monster.melee).toBe("bite +0 (1d6-1 plus trip)");
    expect(monster.fort).toBe("+3");
  });

  // Prone: -4 on melee attack rolls only, -4 AC (the vs-ranged bonus stays a summary nuance).
  test("prone shifts melee attack and AC, nothing else", () => {
    const { monster } = applyCondition("prone");
    expect(monster.melee).toBe("bite -2 (1d6+1 plus trip)");
    expect(monster.ac).toBe(10);
    expect(monster.touchAc).toBe(8);
    expect(monster.flatFootedAc).toBe(8);
    expect(monster.fort).toBe("+5");
    expect(monster.skills).toBe(wolf().skills);
  });

  // Dazzled: -1 on attack rolls and Perception checks only.
  test("dazzled shifts Perception alone among skills", () => {
    const { monster } = applyCondition("dazzled");
    expect(monster.melee).toBe("bite +1 (1d6+1 plus trip)");
    expect(monster.skills).toBe(
      "Perception +7, Stealth +6, Survival +1 (+5 when tracking by scent)",
    );
    expect(monster.senses).toBe("low-light vision, scent; Perception +7");
  });

  // Entangled: -2 attack, -4 Dex. Dex 15 -> 11 is a -2 modifier swing:
  // AC/touch -2, Ref -2, Init -2, CMD -2; flat-footed AC keeps no Dex.
  test("entangled's Dexterity penalty ripples through the Dex-based numbers", () => {
    const { monster } = applyCondition("entangled");
    expect(monster.abilityScores?.dex).toBe(11);
    expect(monster.ac).toBe(12);
    expect(monster.touchAc).toBe(10);
    expect(monster.flatFootedAc).toBe(12);
    expect(monster.ref).toBe("+3");
    expect(monster.init).toBe("+0");
    expect(monster.cmd).toBe("12 (18 vs. trip)");
    // Melee is Str-based, so only the flat -2 attack applies; damage untouched.
    expect(monster.melee).toBe("bite +0 (1d6+1 plus trip)");
    expect(monster.hp).toBe(13);
  });

  // Blinded: -2 AC (losing Dex to AC stays a summary nuance, mirroring the engine).
  test("blinded shifts AC only", () => {
    const { monster } = applyCondition("blinded");
    expect(monster.ac).toBe(12);
    expect(monster.touchAc).toBe(10);
    expect(monster.melee).toBe(wolf().melee);
  });

  // Deafened: -4 initiative.
  test("deafened shifts initiative", () => {
    const { monster } = applyCondition("deafened");
    expect(monster.init).toBe("-2");
    expect(monster.ac).toBe(14);
  });

  test("display-only conditions produce no adjustment", () => {
    for (const id of ["dazed", "staggered", "nauseated", "flatFooted", "unconscious"]) {
      expect(conditionAdjustment(id)).toBeUndefined();
    }
    expect(conditionAdjustment("not-a-condition")).toBeUndefined();
  });
});

describe("condition ladders", () => {
  test("activating a stricter member drops the milder one", () => {
    expect(toggleCondition(["shaken"], "frightened")).toEqual(["frightened"]);
    expect(toggleCondition(["fatigued", "prone"], "exhausted")).toEqual(["prone", "exhausted"]);
  });

  test("activating a milder member under a stricter one is a no-op", () => {
    expect(toggleCondition(["frightened"], "shaken")).toEqual(["frightened"]);
    expect(supersedingCondition(["frightened"], "shaken")).toBe("frightened");
    expect(supersedingCondition(["shaken"], "frightened")).toBeUndefined();
  });

  test("deactivating never cascades down the ladder", () => {
    expect(toggleCondition(["frightened"], "frightened")).toEqual([]);
  });

  test("a superseded milder member is never double-applied", () => {
    const adjs = conditionAdjustments(["shaken", "frightened"]);
    expect(adjs.map((a) => a.label)).toEqual(["Frightened"]);
  });

  test("adjustments come back in mark order, skipping display-only ids", () => {
    const adjs = conditionAdjustments(["prone", "dazed", "shaken"]);
    expect(adjs.map((a) => a.label)).toEqual(["Prone", "Shaken"]);
  });
});
