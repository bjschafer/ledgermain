import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import { toggleCondition } from "../src/model/conditions.js";
import { setAbilityAffliction, setNegativeLevels } from "../src/model/afflictions.js";
import { baselineSheet } from "../src/model/baseline.js";

const ref = loadRefData();

function fighterAt(level: number) {
  let d = createEmptyDoc("t");
  d = addClass(d, "fighter");
  d = setClassLevel(d, "fighter", level);
  return d;
}

describe("baselineSheet", () => {
  it("matches compute() when no live effects are active", () => {
    const doc = fighterAt(4);
    expect(baselineSheet(doc, ref).ac.normal).toBe(compute(doc, ref).ac.normal);
  });

  it("strips Prone's AC penalty — live AC differs, baseline does not", () => {
    let doc = fighterAt(4);
    const before = compute(doc, ref).ac.normal;
    doc = toggleCondition(doc, "prone");
    const live = compute(doc, ref);
    const base = baselineSheet(doc, ref);

    expect(live.ac.normal).toBeLessThan(before);
    expect(base.ac.normal).toBe(before);
    expect(live.ac.normal).not.toBe(base.ac.normal);
  });

  it("strips active buffs", () => {
    let doc = fighterAt(4);
    const before = compute(doc, ref).ac.normal;
    doc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "b1",
            name: "Mage Armor",
            changes: [{ target: "ac", formula: "4", type: "armor" }],
          },
        ],
      },
    };
    const live = compute(doc, ref);
    const base = baselineSheet(doc, ref);
    expect(live.ac.normal).toBe(before + 4);
    expect(base.ac.normal).toBe(before);
  });

  it("strips ability damage/penalty and negative levels", () => {
    let doc = fighterAt(4);
    const before = compute(doc, ref);
    doc = setAbilityAffliction(doc, "damage", "str", 4);
    doc = setAbilityAffliction(doc, "penalty", "dex", 2);
    doc = setNegativeLevels(doc, "temporary", 1);
    const live = compute(doc, ref);
    const base = baselineSheet(doc, ref);

    expect(live.attack.melee.total).not.toBe(base.attack.melee.total);
    expect(base.attack.melee.total).toBe(before.attack.melee.total);
    expect(base.hp.max).toBe(before.hp.max);
  });

  it("keeps ability drain in the baseline (a lasting, not transient, effect)", () => {
    let doc = fighterAt(4);
    doc = setAbilityAffliction(doc, "drain", "str", 2);
    const live = compute(doc, ref);
    const base = baselineSheet(doc, ref);
    expect(base.attack.melee.total).toBe(live.attack.melee.total);
  });

  it("never mutates the input doc", () => {
    let doc = fighterAt(4);
    doc = toggleCondition(doc, "prone");
    const snapshot = JSON.stringify(doc);
    baselineSheet(doc, ref);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });
});
