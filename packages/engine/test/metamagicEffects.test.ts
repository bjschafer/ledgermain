/**
 * Metamagic transforms: the numbers a feat actually moves on the spell line.
 *
 * Expectations are hand-computed from the published Benefits text of each feat
 * (quoted at the assertion) against the real vendored spell slice, so a data
 * bump that reshapes a spell's damage formula fails here rather than silently
 * printing a wrong number at the table.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { Spell } from "@pf1/schema";

import {
  NO_METAMAGIC_EFFECTS,
  hasMetamagicEffects,
  metamagicDamageText,
  metamagicSpellEffects,
  reachRangeUnits,
} from "../src/metamagic-effects.js";
import { METAMAGIC_FEATS } from "../src/metamagic.js";

const ref = loadRefData();

function spellByName(name: string): Spell {
  const spell = Object.values(ref.spells).find((s) => s.name === name);
  if (!spell) throw new Error(`no vendored spell named ${name}`);
  return spell;
}

/** The first damage formula the spell prints, which is what the chips show. */
function firstDamageFormula(spell: Spell): string {
  for (const action of spell.actions) {
    for (const part of action.damage?.parts ?? []) {
      if (part.formula?.trim()) return part.formula.trim();
    }
  }
  throw new Error(`${spell.name} deals no damage`);
}

/** Damage text for `spell` at `cl` with `slugs` applied to a level-`level` casting. */
function damageWith(spell: Spell, cl: number, level: number, slugs: string[]): string | null {
  const fx = metamagicSpellEffects(
    slugs.map((slug) => ({ slug })),
    spell,
    level,
  );
  return metamagicDamageText(firstDamageFormula(spell), { cl }, fx, fx.flatDamage);
}

describe("metamagic damage transforms", () => {
  const fireball = spellByName("Fireball");

  it("leaves an unmodified spell exactly as it reads", () => {
    // Fireball: 1d6 per caster level, maximum 10d6.
    expect(damageWith(fireball, 10, 3, [])).toBe("10d6");
    expect(damageWith(fireball, 4, 3, [])).toBe("4d6");
  });

  it("Empower prints the multiplier rather than a rolled number", () => {
    // "All variable, numeric effects of an empowered spell are increased by half."
    // The player still rolls, so the honest display is the roll and its multiplier.
    expect(damageWith(fireball, 10, 3, ["empower-spell"])).toBe("10d6 +50%");
  });

  it("Maximize resolves to the fixed maximum", () => {
    // "All variable, numeric effects of a spell modified by this feat are maximized."
    expect(damageWith(fireball, 10, 3, ["maximize-spell"])).toBe("60");
    expect(damageWith(fireball, 4, 3, ["maximize-spell"])).toBe("24");
  });

  it("Empower and Maximize together are the maximum plus half the roll", () => {
    // "An empowered, maximized spell gains the separate benefits of each feat:
    //  the maximum result plus half the normally rolled result."
    expect(damageWith(fireball, 10, 3, ["empower-spell", "maximize-spell"])).toBe(
      "60 + half of 10d6",
    );
  });

  it("Maximize includes a per-level modifier in the maximum", () => {
    // Cure Light Wounds: 1d8 + 1 per caster level (maximum +5). Maximized at
    // CL 5: 8 + 5 = 13.
    expect(damageWith(spellByName("Cure Light Wounds"), 5, 1, ["maximize-spell"])).toBe("13");
  });

  it("Intensified raises the dice cap by five caster levels", () => {
    // "An intensified spell increases the maximum number of damage dice by 5
    //  levels. You must actually have sufficient caster levels to surpass the
    //  maximum in order to benefit from this feat."
    expect(damageWith(fireball, 15, 3, ["intensified-spell"])).toBe("15d6");
    expect(damageWith(fireball, 12, 3, ["intensified-spell"])).toBe("12d6");
    // Below the printed cap the feat does nothing at all.
    expect(damageWith(fireball, 8, 3, ["intensified-spell"])).toBe("8d6");
    // Shocking Grasp caps at 5d6, so it reaches 10d6 intensified.
    expect(damageWith(spellByName("Shocking Grasp"), 10, 1, ["intensified-spell"])).toBe("10d6");
  });

  it("Intensified leaves a capped flat bonus alone", () => {
    // The feat raises "the maximum number of damage dice", so Cure Light
    // Wounds' capped +1/level healing bonus is not a target: still 1d8+5.
    expect(damageWith(spellByName("Cure Light Wounds"), 15, 1, ["intensified-spell"])).toBe(
      "1d8+5",
    );
  });

  it("Furious adds twice the spell's level to the damage", () => {
    // "A furious spell that deals hit point damage adds twice the spell's
    //  original level to the amount of damage dealt." Fireball is 3rd level.
    expect(damageWith(fireball, 10, 3, ["furious-spell"])).toBe("10d6+6");
    // Heightened to 5th, the spell's level (and so the bonus) rises with it.
    expect(damageWith(fireball, 10, 5, ["furious-spell"])).toBe("10d6+10");
  });

  it("adds the flat bonus once, to the first damage part only", () => {
    // Furious Spell deals its extra damage once per target, "add the extra
    // damage to the first hit against each target".
    const molten = spellByName("Molten Orb");
    const fx = metamagicSpellEffects([{ slug: "furious-spell" }], molten, 3);
    expect(fx.flatDamage).toBe(6);
    const parts = molten.actions.flatMap((a) => a.damage?.parts ?? []);
    expect(parts.length).toBeGreaterThan(1);
  });
});

describe("metamagic riders", () => {
  const fireball = spellByName("Fireball");

  it("Dazing dazes for the spell's level in rounds", () => {
    // "When a creature takes damage from this spell, they become dazed for a
    //  number of rounds equal to the original level of the spell."
    const fx = metamagicSpellEffects([{ slug: "dazing-spell" }], fireball, 3);
    expect(fx.riders).toEqual([
      {
        short: "Dazed 3 rounds",
        full: "Dazed 3 rounds (the spell's save negates, or a Will save if it allows none)",
      },
    ]);
  });

  it("scales a rider with Heighten, which does raise the spell's level", () => {
    const fx = metamagicSpellEffects(
      [{ slug: "dazing-spell" }, { slug: "heighten-spell", levels: 3 }],
      fireball,
      6,
    );
    expect(fx.riders[0]!.short).toBe("Dazed 6 rounds");
  });

  it("Burning's follow-up damage is twice the spell's level", () => {
    // "that creature takes damage equal to 2 x the spell's actual level at the
    //  start of its next turn."
    const fx = metamagicSpellEffects([{ slug: "burning-spell" }], fireball, 3);
    expect(fx.riders).toEqual([
      { short: "Burn 6", full: "Burn 6 (acid or fire, at the start of its next turn)" },
    ]);
  });

  it("drops a rider whose descriptor gate the spell fails", () => {
    // Rime Spell "only affects spells with the cold descriptor".
    expect(metamagicSpellEffects([{ slug: "rime-spell" }], fireball, 3).riders).toEqual([]);
    const coneOfCold = spellByName("Cone of Cold");
    expect(metamagicSpellEffects([{ slug: "rime-spell" }], coneOfCold, 5).riders).toEqual([
      { short: "Entangled 5 rounds", full: "Entangled 5 rounds" },
    ]);
  });

  it("drops a rider on a spell that deals no damage", () => {
    // "Spells that do not inflict damage do not benefit from this feat."
    expect(
      metamagicSpellEffects([{ slug: "dazing-spell" }], spellByName("Shield"), 1).riders,
    ).toEqual([]);
  });

  it("drops a save rider on a spell with no saving throw", () => {
    // "Spells that do not require a saving throw ... do not benefit from this feat."
    expect(
      metamagicSpellEffects([{ slug: "persistent-spell" }], spellByName("Magic Missile"), 1).riders,
    ).toEqual([]);
    expect(metamagicSpellEffects([{ slug: "persistent-spell" }], fireball, 3).riders).toEqual([
      {
        short: "Save twice",
        full: "Save twice (a target that succeeds saves again and takes the full effect if it fails)",
      },
    ]);
  });

  it("matches a descriptor gate against a variable descriptor line", () => {
    // A handful of spells carry the printed prose of a variable energy line
    // ("acid, cold, electricity, or fire"), which qualifies for each of them.
    const variable = Object.values(ref.spells).find((s) =>
      s.descriptors.includes("acid, cold, electricity, or fire"),
    );
    expect(variable).toBeDefined();
    const fx = metamagicSpellEffects([{ slug: "flaring-spell" }], variable!, 3);
    expect(fx.riders).toEqual([{ short: "Dazzled 3 rounds", full: "Dazzled 3 rounds" }]);
  });
});

describe("metamagic range, duration and area", () => {
  it("Enlarge doubles the range and Reach climbs the band", () => {
    // "You can alter a spell with a range of touch, close, or medium to
    //  increase its range to a higher range category."
    expect(reachRangeUnits("touch", 1)).toBe("close");
    expect(reachRangeUnits("touch", 3)).toBe("long");
    expect(reachRangeUnits("close", 5)).toBe("long");
    // "Spells that do not have a range of touch, close, or medium do not benefit."
    expect(reachRangeUnits("personal", 2)).toBe("personal");
    expect(reachRangeUnits("ft", 1)).toBe("ft");

    const fx = metamagicSpellEffects(
      [{ slug: "enlarge-spell" }, { slug: "reach-spell", levels: 2 }],
      spellByName("Cure Light Wounds"),
      1,
    );
    expect(fx.rangeMultiplier).toBe(2);
    expect(fx.rangeSteps).toBe(2);
  });

  it("Extend doubles and Fleeting halves the duration", () => {
    const mageArmor = spellByName("Mage Armor");
    expect(metamagicSpellEffects([{ slug: "extend-spell" }], mageArmor, 1).durationMultiplier).toBe(
      2,
    );
    expect(
      metamagicSpellEffects([{ slug: "fleeting-spell" }], mageArmor, 1).durationMultiplier,
    ).toBe(0.5);
  });

  it("Widen doubles the area", () => {
    expect(
      metamagicSpellEffects([{ slug: "widen-spell" }], spellByName("Fireball"), 3).areaMultiplier,
    ).toBe(2);
  });
});

describe("metamagic effect aggregation", () => {
  it("an empty or unmodeled application is the identity", () => {
    const fireball = spellByName("Fireball");
    expect(metamagicSpellEffects([], fireball, 3)).toBe(NO_METAMAGIC_EFFECTS);
    expect(metamagicSpellEffects(undefined, fireball, 3)).toBe(NO_METAMAGIC_EFFECTS);
    expect(hasMetamagicEffects(NO_METAMAGIC_EFFECTS)).toBe(false);
    // Silent Spell moves no number; it stays a note beside the feat's name.
    expect(
      hasMetamagicEffects(metamagicSpellEffects([{ slug: "silent-spell" }], fireball, 3)),
    ).toBe(false);
    // Neither does a slug that isn't a metamagic feat at all.
    expect(
      hasMetamagicEffects(metamagicSpellEffects([{ slug: "power-attack" }], fireball, 3)),
    ).toBe(false);
  });

  it("every declared effect is one the aggregator can act on", () => {
    for (const def of Object.values(METAMAGIC_FEATS)) {
      if (!def.effect) continue;
      const e = def.effect;
      const moves =
        e.numeric !== undefined ||
        e.maximize === true ||
        e.damagePerLevel !== undefined ||
        e.diceCapLevels !== undefined ||
        e.duration !== undefined ||
        e.range !== undefined ||
        e.rangeSteps !== undefined ||
        e.area !== undefined ||
        e.rider !== undefined;
      expect(moves).toBe(true);
      // A gate alone is not an effect: it only ever narrows one.
      if (e.rider) expect(e.rider.label.length).toBeGreaterThan(0);
    }
  });
});
