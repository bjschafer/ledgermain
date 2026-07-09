/**
 * Metamagic model tests (issue #71): owned-feat detection, slot/effective
 * level math, and the per-prepared-instance attach transitions.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel, toggleFeat } from "../src/model/doc.js";
import {
  metamagicEffectiveIncrease,
  metamagicSlotIncrease,
  ownedMetamagic,
  resolveAppliedMetamagic,
} from "../src/model/metamagic.js";
import {
  prepareSpell,
  preparedSpells,
  setPreparedMetamagicLevels,
  togglePreparedMetamagic,
} from "../src/model/preparedSpells.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function wizardWith(...featNames: string[]): CharacterDoc {
  let doc = setClassLevel(addClass(createEmptyDoc("t"), "wizard"), "wizard", 20);
  for (const n of featNames) doc = toggleFeat(doc, featId(n));
  return doc;
}

describe("ownedMetamagic", () => {
  it("returns only owned, modeled metamagic feats, sorted by name", () => {
    const doc = wizardWith("Empower Spell", "Quicken Spell", "Power Attack");
    expect(ownedMetamagic(doc, ref).map((d) => d.name)).toEqual(["Empower Spell", "Quicken Spell"]);
  });

  it("is empty for a character with no metamagic feats", () => {
    expect(ownedMetamagic(wizardWith("Power Attack"), ref)).toEqual([]);
  });
});

describe("slot / effective level math", () => {
  it("sums fixed slot increases; Heighten is the only DC-raising feat", () => {
    const applied = [{ slug: "empower-spell" }, { slug: "silent-spell" }];
    expect(metamagicSlotIncrease(applied)).toBe(3); // +2 empower, +1 silent
    expect(metamagicEffectiveIncrease(applied)).toBe(0); // neither raises DC
  });

  it("variable feats use chosen levels, defaulting to the registry minimum", () => {
    expect(metamagicSlotIncrease([{ slug: "heighten-spell", levels: 3 }])).toBe(3);
    expect(metamagicSlotIncrease([{ slug: "heighten-spell" }])).toBe(1); // default
    expect(metamagicEffectiveIncrease([{ slug: "heighten-spell", levels: 3 }])).toBe(3);
    // Reach is variable but does NOT raise the effective level.
    expect(metamagicSlotIncrease([{ slug: "reach-spell", levels: 2 }])).toBe(2);
    expect(metamagicEffectiveIncrease([{ slug: "reach-spell", levels: 2 }])).toBe(0);
  });

  it("undefined / unknown slugs contribute 0", () => {
    expect(metamagicSlotIncrease(undefined)).toBe(0);
    expect(metamagicSlotIncrease([{ slug: "not-a-feat" }])).toBe(0);
  });

  it("resolveAppliedMetamagic drops unmodeled slugs and reports increases", () => {
    const resolved = resolveAppliedMetamagic([{ slug: "maximize-spell" }, { slug: "not-a-feat" }]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.def.name).toBe("Maximize Spell");
    expect(resolved[0]!.increase).toBe(3);
  });
});

describe("prepared-instance metamagic transitions", () => {
  it("toggle adds then removes; empty metamagic array is normalized away", () => {
    let doc = prepareSpell(wizardWith("Empower Spell"), "fireball");
    doc = togglePreparedMetamagic(doc, 0, "empower-spell");
    expect(preparedSpells(doc)[0]!.metamagic).toEqual([{ slug: "empower-spell" }]);

    doc = togglePreparedMetamagic(doc, 0, "empower-spell");
    // Removing the last one drops the field entirely (pre-#71 shape).
    expect(preparedSpells(doc)[0]).toEqual({ spellId: "fireball", expended: false });
  });

  it("adds a variable feat with its default levels, then updates them", () => {
    let doc = prepareSpell(wizardWith("Heighten Spell"), "fireball");
    doc = togglePreparedMetamagic(doc, 0, "heighten-spell");
    expect(preparedSpells(doc)[0]!.metamagic).toEqual([{ slug: "heighten-spell", levels: 1 }]);

    doc = setPreparedMetamagicLevels(doc, 0, "heighten-spell", 4);
    expect(preparedSpells(doc)[0]!.metamagic).toEqual([{ slug: "heighten-spell", levels: 4 }]);
  });

  it("no-ops on unmodeled slugs, non-variable level-sets, and out-of-range indexes", () => {
    const doc = prepareSpell(wizardWith("Empower Spell"), "fireball");
    expect(togglePreparedMetamagic(doc, 0, "not-a-feat")).toBe(doc);
    expect(togglePreparedMetamagic(doc, 5, "empower-spell")).toBe(doc);
    // Empower isn't variable, so setting levels is a no-op even when applied.
    const withEmpower = togglePreparedMetamagic(doc, 0, "empower-spell");
    expect(setPreparedMetamagicLevels(withEmpower, 0, "empower-spell", 3)).toBe(withEmpower);
  });
});
