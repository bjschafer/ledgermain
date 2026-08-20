/**
 * Metamagic model tests: owned-feat detection, slot/effective level math, and
 * the per-prepared-instance attach transitions.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel, toggleFeat } from "../src/model/doc.js";
import {
  metamagicDiscountFor,
  metamagicDiscountSources,
  metamagicDiscountSpellOptions,
  metamagicDiscountTrait,
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
import { bloodlineSpellsKnown } from "../src/model/spellcasting.js";
import { setTraitChoice, toggleTrait } from "../src/model/traits.js";

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

describe("always-on metamagic cost discounts", () => {
  function spellId(name: string): string {
    const entry = Object.entries(ref.spells).find(([, s]) => s.name === name);
    if (!entry) throw new Error(`spell not found: ${name}`);
    return entry[0];
  }

  // Vendored catalog id for Wayang Spellhunter (the hand-authored table
  // doesn't carry it; the vendored name has a region suffix).
  const wayangId = Object.entries(ref.traits).find(([, t]) =>
    t.name.startsWith("Wayang Spellhunter"),
  )![0];

  const fireball = spellId("Fireball");

  /** A wizard with Magical Lineage naming `spell`. */
  function withMagicalLineage(spell: string): CharacterDoc {
    let doc = setClassLevel(addClass(createEmptyDoc("t"), "wizard"), "wizard", 10);
    doc = toggleTrait(doc, "magicalLineage");
    return setTraitChoice(doc, "magicalLineage", spell);
  }

  it("a discount trait with no stored spell pick contributes nothing", () => {
    const doc = toggleTrait(createEmptyDoc("t"), "magicalLineage");
    expect(metamagicDiscountSources(doc, ref)).toEqual([]);
  });

  it("recognizes both traits by name, across catalogs", () => {
    expect(metamagicDiscountTrait({ name: "Magical Lineage" })?.label).toBe("Magical Lineage");
    expect(metamagicDiscountTrait({ name: ref.traits[wayangId]!.name })?.maxSpellLevel).toBe(3);
    expect(metamagicDiscountTrait({ name: "Reactionary" })).toBeUndefined();
  });

  it("Magical Lineage reduces the SUMMED increase by 1, on the chosen spell only", () => {
    // Trait text: "Pick one spell when you choose this trait. When you apply
    // metamagic feats to this spell, treat its actual level as 1 lower for
    // determining the spell's final adjusted level." — i.e. the whole cast's
    // total increase drops by 1, not each feat's.
    const doc = withMagicalLineage(fireball);
    const sources = metamagicDiscountSources(doc, ref);
    const applied = [{ slug: "empower-spell" }, { slug: "silent-spell" }]; // +2 +1
    const match = metamagicDiscountFor(sources, fireball);
    expect(match).toEqual({ amount: 1, labels: ["Magical Lineage"] });
    expect(metamagicSlotIncrease(applied, match.amount)).toBe(2);
    // A spell the trait doesn't name pays full price.
    const other = metamagicDiscountFor(sources, spellId("Lightning Bolt"));
    expect(other.amount).toBe(0);
    expect(metamagicSlotIncrease(applied, other.amount)).toBe(3);
  });

  it("never reduces the total increase below 0 (the slot never drops below the base level)", () => {
    const doc = withMagicalLineage(fireball);
    const { amount } = metamagicDiscountFor(metamagicDiscountSources(doc, ref), fireball);
    // Still Spell is +1; discounted the cast sits in its ordinary base slot.
    expect(metamagicSlotIncrease([{ slug: "still-spell" }], amount)).toBe(0);
    // No metamagic applied means nothing to discount.
    expect(metamagicSlotIncrease([], amount)).toBe(0);
    expect(metamagicSlotIncrease(undefined, amount)).toBe(0);
  });

  it("Magical Lineage and Wayang Spellhunter both apply when both name the same spell", () => {
    // Neither trait's benefit is a typed "trait bonus" on a roll (each is an
    // untyped cost reduction with no non-stacking clause), so the common RAW
    // reading lets both reduce the same cast. Wayang Spellhunter: "Select a
    // spell of 3rd level or below. When you use the chosen spell with a
    // metamagic feat, it uses up a spell slot one level lower than it
    // normally would."
    let doc = withMagicalLineage(fireball);
    doc = setTraitChoice(toggleTrait(doc, wayangId), wayangId, fireball);
    const discount = metamagicDiscountFor(metamagicDiscountSources(doc, ref), fireball);
    expect(discount.amount).toBe(2);
    expect(discount.labels.sort()).toEqual(["Magical Lineage", "Wayang Spellhunter"]);
    // Quickened (+4) Fireball: 3rd + max(0, 4 - 2) = a 5th-level slot.
    expect(metamagicSlotIncrease([{ slug: "quicken-spell" }], discount.amount)).toBe(2);
  });

  it("Heighten interplay: the discount lowers the slot cost, never the chosen DC bump", () => {
    const doc = withMagicalLineage(fireball);
    const { amount } = metamagicDiscountFor(metamagicDiscountSources(doc, ref), fireball);
    const applied = [{ slug: "heighten-spell", levels: 3 }];
    // Heighten Fireball to 6th with Magical Lineage: occupies a 5th-level
    // slot (3 + max(0, 3 - 1) = 5)...
    expect(metamagicSlotIncrease(applied, amount)).toBe(2);
    // ...but the spell is still a 6th-level effect for save DC purposes —
    // Heighten's effective level is the level the player chose to heighten
    // to, not the discounted slot.
    expect(metamagicEffectiveIncrease(applied)).toBe(3);
  });

  it("Seeker Magic applies to bloodline bonus spells at sorcerer 15+, and never stacks", () => {
    // Archetype text: "When a seeker applies a metamagic feat to any bonus
    // spells granted by his mystery or his bloodline, he reduces the
    // metamagic feat's spell level adjustment by 1. ... This reduction ...
    // does not stack with similar reductions from other abilities."
    let doc = setClassLevel(addClass(createEmptyDoc("t"), "sorcerer"), "sorcerer", 15);
    doc = {
      ...doc,
      build: { ...doc.build, archetypes: ["sorcerer:seeker"], sorcererBloodline: "Draconic" },
    };
    const bonusIds = bloodlineSpellsKnown(ref, "Draconic", 15).map((sp) => sp.id);
    expect(bonusIds.length).toBeGreaterThan(0);
    const sources = metamagicDiscountSources(doc, ref, "sorcerer");
    expect(metamagicDiscountFor(sources, bonusIds[0]!)).toEqual({
      amount: 1,
      labels: ["Seeker Magic"],
    });
    // Not a bloodline bonus spell: no discount.
    expect(metamagicDiscountFor(sources, fireball).amount).toBe(0);
    // Non-stacking: Magical Lineage naming the same bonus spell doesn't add
    // Seeker Magic's reduction on top.
    let both = toggleTrait(doc, "magicalLineage");
    both = setTraitChoice(both, "magicalLineage", bonusIds[0]!);
    const stacked = metamagicDiscountFor(
      metamagicDiscountSources(both, ref, "sorcerer"),
      bonusIds[0]!,
    );
    expect(stacked).toEqual({ amount: 1, labels: ["Magical Lineage"] });
    // The feature unlocks at 15th level; below that there is no source.
    const low = setClassLevel(doc, "sorcerer", 14);
    expect(metamagicDiscountSources(low, ref, "sorcerer")).toEqual([]);
    // The class scoping matters: the same doc viewed as another class's
    // panel gets no Seeker source.
    expect(metamagicDiscountSources(doc, ref, "wizard")).toEqual([]);
  });

  it("Wayang Spellhunter's picker offers only spells of 3rd level or below", () => {
    const wayangOptions = metamagicDiscountSpellOptions(ref, 3);
    expect(wayangOptions.length).toBeGreaterThan(0);
    expect(wayangOptions.every((o) => o.level <= 3)).toBe(true);
    // Magical Lineage has no level cap: the full catalog is offered.
    const allOptions = metamagicDiscountSpellOptions(ref);
    expect(allOptions.some((o) => o.level === 9)).toBe(true);
    expect(allOptions.length).toBeGreaterThan(wayangOptions.length);
  });
});

describe("prepared-instance metamagic transitions", () => {
  it("toggle adds then removes; empty metamagic array is normalized away", () => {
    let doc = prepareSpell(wizardWith("Empower Spell"), "fireball");
    doc = togglePreparedMetamagic(doc, 0, "empower-spell");
    expect(preparedSpells(doc)[0]!.metamagic).toEqual([{ slug: "empower-spell" }]);

    doc = togglePreparedMetamagic(doc, 0, "empower-spell");
    // Removing the last one drops the field entirely (the earlier shape).
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
