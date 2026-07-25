import { describe, expect, it } from "bun:test";

import type { DefenseEntry, Defenses } from "@pf1/schema";

import { bypassOptionsFor, damagePreview } from "../src/model/damagePreview.js";

function entry(total: number, qualifier: string): DefenseEntry {
  return { total, qualifier, components: [] };
}

function defenses(dr: DefenseEntry[] = [], resistances: DefenseEntry[] = []): Defenses {
  return { dr, resistances };
}

describe("a character with no defenses is unaffected", () => {
  it("applies the raw number and reports nothing to show", () => {
    const p = damagePreview("17", undefined);
    expect(p.amount).toBe(17);
    expect(p.raw).toBe(17);
    expect(p.reduced).toBe(false);
    expect(p.assumed).toBe(false);
    expect(p.bypassOptions).toEqual([]);
  });

  it("is not ok for empty input, so the panel shows no preview", () => {
    expect(damagePreview("", undefined).ok).toBe(false);
    expect(damagePreview("", undefined).amount).toBe(0);
  });
});

describe("bare numbers meet DR via the weapon assumption", () => {
  const dr10 = defenses([entry(10, "—")]);

  it("reduces an untyped amount and flags it as an assumption", () => {
    const p = damagePreview("17", dr10);
    expect(p.amount).toBe(7);
    expect(p.reduced).toBe(true);
    expect(p.assumed).toBe(true);
    expect(p.summary).toBe("17 → 7 · DR 10/—");
  });

  it("does not flag an assumption when the type was stated", () => {
    const p = damagePreview("17 slashing", dr10);
    expect(p.amount).toBe(7);
    expect(p.assumed).toBe(false);
  });

  it("lets an explicit 'untyped' opt out of DR entirely", () => {
    const p = damagePreview("17 untyped", dr10);
    expect(p.amount).toBe(17);
    expect(p.reduced).toBe(false);
  });

  it("does not flag an assumption when nothing was reduced", () => {
    // The inferred type is real but changed no outcome, so saying so is noise.
    expect(damagePreview("17", defenses([], [entry(10, "fire")])).assumed).toBe(false);
  });
});

describe("Heal and Nonlethal use the raw total", () => {
  it("keeps raw separate from the reduced damage amount", () => {
    const p = damagePreview("17", defenses([entry(10, "—")]));
    expect(p.raw).toBe(17);
    expect(p.amount).toBe(7);
  });
});

describe("mixed typed damage", () => {
  it("routes each part to its own defense", () => {
    const p = damagePreview("12b 6c", defenses([entry(10, "—")], [entry(5, "cold")]));
    expect(p.raw).toBe(18);
    expect(p.amount).toBe(3);
    expect(p.summary).toBe("18 → 3 · DR 10/—, Resist cold 5");
  });

  it("handles the carve-out phrasing end to end", () => {
    // "9 damage, 3 of which are cold": 6 assumed-weapon meets DR, 3 cold doesn't.
    const p = damagePreview("9 points of damage, 3 of which are cold", defenses([entry(5, "—")]));
    expect(p.raw).toBe(9);
    expect(p.amount).toBe(4);
    expect(p.resolution.terms).toEqual([
      { amount: 6, type: "weapon", final: 1 },
      { amount: 3, type: "cold", final: 3 },
    ]);
  });
});

describe("bypass chips", () => {
  it("offers every bypassable qualifier and never offers DR/—", () => {
    const d = defenses([entry(5, "—"), entry(10, "adamantine"), entry(8, "magic")]);
    expect(bypassOptionsFor(d)).toEqual(["adamantine", "magic"]);
  });

  it("splits a compound qualifier into separately togglable atoms", () => {
    expect(bypassOptionsFor(defenses([entry(10, "silver-and-magic")]))).toEqual([
      "magic",
      "silver",
    ]);
  });

  it("falls back to the next-best DR once a chip is toggled on", () => {
    const d = defenses([entry(5, "—"), entry(10, "magic")]);
    expect(damagePreview("20", d).amount).toBe(10);
    expect(damagePreview("20", d, ["magic"]).amount).toBe(15);
  });

  it("is empty for a character whose only DR is unbypassable", () => {
    expect(bypassOptionsFor(defenses([entry(5, "—")]))).toEqual([]);
  });
});

describe("what the panel should show", () => {
  it("treats a plain number as bare and shows no term echo", () => {
    const p = damagePreview("17", undefined);
    expect(p.bare).toBe(true);
    expect(p.showTerms).toBe(false);
  });

  it("echoes the terms as soon as a type is named, even with nothing to reduce", () => {
    // The gap this fixes: "5 fire" on a character with no fire resistance
    // used to show nothing at all, so the parse was invisible.
    const p = damagePreview("5 fire", undefined);
    expect(p.bare).toBe(false);
    expect(p.showTerms).toBe(true);
  });

  it("echoes a bare number once a defense has changed it", () => {
    const p = damagePreview("17", defenses([entry(10, "—")]));
    expect(p.bare).toBe(true);
    expect(p.showTerms).toBe(true);
  });

  it("shows nothing for unparseable input", () => {
    expect(damagePreview("", undefined).showTerms).toBe(false);
  });

  it("reports physical damage so the bypass chips can hide against pure energy", () => {
    expect(damagePreview("17", undefined).hasPhysical).toBe(true);
    expect(damagePreview("12b 6c", undefined).hasPhysical).toBe(true);
    expect(damagePreview("5 fire", undefined).hasPhysical).toBe(false);
    expect(damagePreview("5 untyped", undefined).hasPhysical).toBe(false);
  });
});
