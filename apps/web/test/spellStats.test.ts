/**
 * Display-formatting of a spell's at-the-table facts — range, duration,
 * components, and damage — resolved to a concrete caster level. Fixtures use
 * real vendored spells (Fireball, Magic Missile, Cure Light Wounds) so the
 * @cl-scaled range bands / durations / damage formulas exercise the actual
 * data shapes, not synthetic ones.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import { metamagicSpellEffects } from "@pf1/engine";
import type { RefData, Spell } from "@pf1/schema";

import {
  formatCastingTime,
  formatSpellArea,
  formatSpellComponents,
  formatSpellDuration,
  formatSpellRange,
  spellDamageParts,
} from "../src/model/spellStats.js";

const refData: RefData = loadRefData();

function spellByName(name: string): Spell {
  const found = Object.values(refData.spells).find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (!found) throw new Error(`spell not found: ${name}`);
  return found;
}

describe("formatSpellRange", () => {
  it("resolves the medium band to a distance at the caster level", () => {
    // medium = 100 ft. + 10 ft./level
    const missile = spellByName("Magic Missile");
    expect(formatSpellRange(missile, 4)).toBe("Medium (140 ft.)");
    expect(formatSpellRange(missile, 1)).toBe("Medium (110 ft.)");
  });

  it("resolves the long band", () => {
    // long = 400 ft. + 40 ft./level
    const fireball = spellByName("Fireball");
    expect(formatSpellRange(fireball, 5)).toBe("Long (600 ft.)");
  });

  it("resolves the close band with its half-level step", () => {
    // close = 25 ft. + 5 ft./2 levels
    const ray = spellByName("Scorching Ray");
    expect(formatSpellRange(ray, 7)).toBe("Close (40 ft.)"); // 25 + 5*3
  });

  it("shows Touch verbatim for a touch spell", () => {
    expect(formatSpellRange(spellByName("Cure Light Wounds"), 7)).toBe("Touch");
  });
});

describe("formatSpellDuration", () => {
  it("labels an instantaneous spell", () => {
    expect(formatSpellDuration(spellByName("Fireball"), 5)).toBe("Instantaneous");
    expect(formatSpellDuration(spellByName("Magic Missile"), 5)).toBe("Instantaneous");
  });
});

describe("formatCastingTime", () => {
  it("labels a standard-action cast (Magic Missile)", () => {
    expect(formatCastingTime(spellByName("Magic Missile"))).toBe("Standard action");
  });

  it("labels an immediate-action cast (Feather Fall)", () => {
    expect(formatCastingTime(spellByName("Feather Fall"))).toBe("Immediate action");
  });

  it("defaults an unspecified round cost to 1 round (Summon Monster I)", () => {
    expect(formatCastingTime(spellByName("Summon Monster I"))).toBe("1 round");
  });

  it("applies a minute-type cost multiplier (Alpha Instinct: 10 minutes)", () => {
    expect(formatCastingTime(spellByName("Alpha Instinct"))).toBe("10 minutes");
  });

  it("applies a full-round-type cost multiplier (Regenerate: 3 full rounds)", () => {
    expect(formatCastingTime(spellByName("Regenerate"))).toBe("3 full rounds");
  });

  it("never throws formatting any vendored spell's casting time", () => {
    for (const spell of Object.values(refData.spells)) {
      expect(() => formatCastingTime(spell)).not.toThrow();
    }
  });

  it("prefers the direct-hit action's casting time over a nonaction splash rider (Molten Orb)", () => {
    // Molten Orb (PZO1129 pg. 188): "Casting Time 1 standard action." The
    // vendored actions array lists the splash rider ("nonaction", since it
    // rides along on the direct hit) before the direct attack ("standard"),
    // so the primary action isn't simply first in the array.
    expect(formatCastingTime(spellByName("Molten Orb"))).toBe("Standard action");
  });
});

describe("formatSpellComponents", () => {
  it("joins the present components in V, S, M order", () => {
    // Magic Missile: V, S (no material)
    expect(formatSpellComponents(spellByName("Magic Missile"))).toBe("V, S");
    // Fireball: V, S, M
    expect(formatSpellComponents(spellByName("Fireball"))).toBe("V, S, M");
  });
});

describe("spellDamageParts", () => {
  it("keeps dice symbolic but resolves @cl-scaled dice count (Fireball)", () => {
    const fireball = spellByName("Fireball"); // (min(10, @cl))d6
    expect(spellDamageParts(fireball, 4)).toEqual([{ text: "4d6", types: ["fire"] }]);
    // capped at 10d6
    expect(spellDamageParts(fireball, 15)).toEqual([{ text: "10d6", types: ["fire"] }]);
  });

  it("resolves the @cl modifier while keeping the die (Cure Light Wounds)", () => {
    const clw = spellByName("Cure Light Wounds"); // 1d8 + min(5, @cl)
    expect(spellDamageParts(clw, 3)).toEqual([{ text: "1d8+3", types: ["positive"] }]);
    expect(spellDamageParts(clw, 9)).toEqual([{ text: "1d8+5", types: ["positive"] }]); // capped
  });

  it("resolves the multi-projectile count from the hand-authored supplement (Magic Missile)", () => {
    // The vendored formula is a flat 1d4+1 — the missile count (1 + 1/2 levels
    // beyond 1st, max 5) lives in prose, supplied via Spell.projectileCount.
    // Per-hit dice stay honest; the count rides alongside as `count`.
    const missile = spellByName("Magic Missile");
    // CL 1–2: one missile — no ×N note (count omitted).
    expect(spellDamageParts(missile, 1)).toEqual([{ text: "1d4+1", types: ["force"] }]);
    expect(spellDamageParts(missile, 2)).toEqual([{ text: "1d4+1", types: ["force"] }]);
    // CL 3 → 2, CL 7 → 4, CL 9+ → capped at 5.
    expect(spellDamageParts(missile, 3)).toEqual([{ text: "1d4+1", types: ["force"], count: 2 }]);
    expect(spellDamageParts(missile, 7)).toEqual([{ text: "1d4+1", types: ["force"], count: 4 }]);
    expect(spellDamageParts(missile, 20)).toEqual([{ text: "1d4+1", types: ["force"], count: 5 }]);
  });

  it("resolves the ray count for Scorching Ray (4d6 per ray, not folded together)", () => {
    const ray = spellByName("Scorching Ray"); // 1 ray + 1/4 levels beyond 3rd, max 3
    // CL 3–6: one ray — dice unchanged, no count.
    expect(spellDamageParts(ray, 5)).toEqual([{ text: "4d6", types: ["fire"] }]);
    // CL 7 → 2 rays, CL 11+ → capped at 3.
    expect(spellDamageParts(ray, 7)).toEqual([{ text: "4d6", types: ["fire"], count: 2 }]);
    expect(spellDamageParts(ray, 20)).toEqual([{ text: "4d6", types: ["fire"], count: 3 }]);
  });

  it("returns no parts for a spell that deals no rolled damage", () => {
    expect(spellDamageParts(spellByName("Shield"), 5)).toEqual([]);
  });

  it("resolves a size-scaled die to its Medium dice (Ghost Whip)", () => {
    // Vendored as sizeRoll(1, 3, @size) — a Medium creature's whip deals 1d3.
    expect(spellDamageParts(spellByName("Ghost Whip"), 7)).toEqual([
      { text: "1d3", types: ["slashing"] },
    ]);
  });

  it("resolves a formula whose bonus carries a flavor label (Coin Shot at CL 9)", () => {
    // 1d8 + min(floor(@cl / 2), 10)[CL/2] — the bracketed label names the
    // bonus for upstream's roll log and doesn't change the number.
    expect(spellDamageParts(spellByName("Coin Shot"), 9)).toEqual([
      { text: "1d8+4", types: ["bludgeoning", "piercing"] },
    ]);
  });

  it("picks the direct-hit action, not the nonaction splash rider (Molten Orb)", () => {
    // Molten Orb (PZO1129 pg. 188): "A direct hit deals 2d6 points of fire
    // damage." The 1d6 splash is a separate, lesser effect on nearby
    // creatures — the vendored actions array lists the splash rider first,
    // but it's a "nonaction" (it rides along on the direct hit) while the
    // direct attack is the spell's real "standard" action.
    expect(spellDamageParts(spellByName("Molten Orb"), 5)).toEqual([
      { text: "2d6", types: ["fire"] },
    ]);
  });

  it("picks the primary failed-save damage over the nonaction reduced-save rider (Slay Living)", () => {
    // Slay Living: "The target takes 12d6 points of damage + 1 point per
    // caster level. If the target's Fortitude saving throw succeeds, it
    // instead takes 3d6 points of damage + 1 point per caster level." The
    // reduced-save number is a "nonaction" fallback in the vendored data and
    // sits before the primary "standard" action in the array.
    expect(spellDamageParts(spellByName("Slay Living"), 10)).toEqual([
      { text: "12d6+10", types: ["untyped"] },
    ]);
  });

  it("picks the initial burst over the nonaction subsequent-round rider (Caustic Eruption)", () => {
    // Caustic Eruption: "Acid erupts from your space in all directions,
    // causing 1d6 points of damage per caster level (maximum 20d6)" as the
    // initial ("standard") effect; "creatures ... that failed their saves
    // ... take an additional 1d6 ... per 2 caster levels (maximum 10d6)" the
    // following round is a "nonaction" rider.
    expect(spellDamageParts(spellByName("Caustic Eruption"), 8)).toEqual([
      { text: "8d6", types: ["untyped"] },
    ]);
  });

  it("still falls back to a nonaction action when no primary action carries damage (Produce Flame)", () => {
    // Produce Flame's "standard" action ("Use") only conjures the flame; the
    // 1d6 + CL (max +5) fire damage lives entirely on the "nonaction" attack
    // actions ("Hurl", "Melee") that spend the touch attack instead of a
    // separate action. With no primary action carrying damage, the fallback
    // pass must still find it.
    expect(spellDamageParts(spellByName("Produce Flame"), 3)).toEqual([
      { text: "1d6+3", types: ["fire"] },
    ]);
    expect(spellDamageParts(spellByName("Produce Flame"), 11)).toEqual([
      { text: "1d6+5", types: ["fire"] },
    ]);
  });

  it("falls back to the raw formula for a value the DSL can't parse", () => {
    // Clenched Fist's damage is "1d8 + 11[Strength]" — the [flavor] annotation
    // is not DSL, so both the dice-format and numeric evals throw; the display
    // must survive by showing the formula verbatim, never crash.
    const fist = spellByName("Clenched Fist");
    const parts = spellDamageParts(fist, 5);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts[0]!.text).toContain("1d8");
  });
});

describe("robustness — prose values never throw", () => {
  it("returns prose durations verbatim instead of throwing", () => {
    // These carry non-DSL prose ("1 hour/level; see text", "concentration").
    // formatSpellDuration must return a string, not blow up.
    for (const name of ["Wind Walk", "Animal Trance", "Protection from Arrows"]) {
      const spell = spellByName(name);
      expect(() => formatSpellDuration(spell, 7)).not.toThrow();
      expect(formatSpellDuration(spell, 7)).not.toBeNull();
    }
  });

  it("never throws formatting any vendored spell's range/duration/damage", () => {
    for (const spell of Object.values(refData.spells)) {
      expect(() => {
        formatSpellRange(spell, 9);
        formatSpellDuration(spell, 9);
        spellDamageParts(spell, 9);
      }).not.toThrow();
    }
  });
});

/**
 * The formatters under metamagic. The rules arithmetic itself is fixtured in
 * the engine (`test/metamagicEffects.test.ts`); what's checked here is that
 * each formatter actually spends the aggregate on the string it prints.
 */
describe("metamagic on the spell line", () => {
  const fx = (spell: Spell, level: number, applied: { slug: string; levels?: number }[]) =>
    metamagicSpellEffects(applied, spell, level);

  it("Enlarge doubles the range band and Reach climbs it first", () => {
    const fireball = spellByName("Fireball");
    // Long range at CL 5 is 400 + 40x5 = 600 ft.; enlarged, 1200 ft.
    expect(formatSpellRange(fireball, 5, fx(fireball, 3, [{ slug: "enlarge-spell" }]))).toBe(
      "Long (1200 ft.)",
    );
    // Cure Light Wounds is a touch spell: Reach +2 makes it medium, which at
    // CL 5 is 100 + 10x5 = 150 ft.
    const clw = spellByName("Cure Light Wounds");
    expect(formatSpellRange(clw, 5, fx(clw, 1, [{ slug: "reach-spell", levels: 2 }]))).toBe(
      "Medium (150 ft.)",
    );
  });

  it("Extend doubles a resolved duration and Fleeting halves it", () => {
    const mageArmor = spellByName("Mage Armor");
    expect(formatSpellDuration(mageArmor, 5)).toBe("5 hours");
    expect(formatSpellDuration(mageArmor, 5, fx(mageArmor, 1, [{ slug: "extend-spell" }]))).toBe(
      "10 hours",
    );
    expect(formatSpellDuration(mageArmor, 5, fx(mageArmor, 1, [{ slug: "fleeting-spell" }]))).toBe(
      "2 hours",
    );
  });

  it("leaves an instantaneous duration alone", () => {
    const fireball = spellByName("Fireball");
    expect(formatSpellDuration(fireball, 5, fx(fireball, 3, [{ slug: "extend-spell" }]))).toBe(
      "Instantaneous",
    );
  });

  it("Widen doubles the measurements in a spread", () => {
    const fireball = spellByName("Fireball");
    expect(formatSpellArea(fireball)).toBe("20-ft.-radius spread");
    expect(formatSpellArea(fireball, fx(fireball, 3, [{ slug: "widen-spell" }]))).toBe(
      "40-ft.-radius spread",
    );
  });

  it("leaves an area Widen does not apply to alone", () => {
    // "Spells that do not have an area of one of these four sorts are not
    // affected by this feat" — a targeted spell keeps its printed target line.
    const clw = spellByName("Cure Light Wounds");
    const widened = formatSpellArea(clw, fx(clw, 1, [{ slug: "widen-spell" }]));
    expect(widened).toBe(formatSpellArea(clw));
  });

  it("rewrites the damage chips", () => {
    const fireball = spellByName("Fireball");
    expect(spellDamageParts(fireball, 10, fx(fireball, 3, [{ slug: "maximize-spell" }]))).toEqual([
      { text: "60", types: ["fire"] },
    ]);
    expect(spellDamageParts(fireball, 10, fx(fireball, 3, [{ slug: "empower-spell" }]))).toEqual([
      { text: "10d6 +50%", types: ["fire"] },
    ]);
  });

  it("adds Furious Spell's flat damage to the first part only", () => {
    // Molten Orb's splash rider follows its direct hit; the once-per-target
    // bonus rides on the first line.
    const molten = spellByName("Molten Orb");
    const parts = spellDamageParts(molten, 5, fx(molten, 3, [{ slug: "furious-spell" }]));
    const plain = spellDamageParts(molten, 5);
    expect(parts).toHaveLength(plain.length);
    expect(parts[0]!.text).not.toBe(plain[0]!.text);
    for (let i = 1; i < parts.length; i++) expect(parts[i]!.text).toBe(plain[i]!.text);
  });

  it("never throws across the whole catalog with metamagic applied", () => {
    const applied = [
      { slug: "empower-spell" },
      { slug: "maximize-spell" },
      { slug: "intensified-spell" },
      { slug: "furious-spell" },
      { slug: "extend-spell" },
      { slug: "enlarge-spell" },
      { slug: "widen-spell" },
      { slug: "reach-spell", levels: 3 },
      { slug: "dazing-spell" },
    ];
    for (const spell of Object.values(refData.spells)) {
      const effects = metamagicSpellEffects(applied, spell, spell.level);
      expect(() => {
        formatSpellRange(spell, 9, effects);
        formatSpellDuration(spell, 9, effects);
        formatSpellArea(spell, effects);
        spellDamageParts(spell, 9, effects);
      }).not.toThrow();
    }
  });
});
