import { describe, expect, it } from "bun:test";

import type { DefenseEntry, Defenses } from "@pf1/schema";

import { qualifierBypassedBy, resolveDamage } from "../src/damage-resolution.js";

/** Minimal DR/resistance entry — `components` is provenance the resolver ignores. */
function entry(total: number, qualifier: string): DefenseEntry {
  return { total, qualifier, components: [] };
}

function defenses(dr: DefenseEntry[] = [], resistances: DefenseEntry[] = []): Defenses {
  return { dr, resistances };
}

describe("no defenses", () => {
  it("passes damage through untouched when the character has none", () => {
    const out = resolveDamage([{ amount: 12, type: "weapon" }], undefined);
    expect(out.raw).toBe(12);
    expect(out.final).toBe(12);
    expect(out.reductions).toEqual([]);
  });
});

describe("damage reduction applies once per attack, not per type", () => {
  it("meets DR once against the combined physical total", () => {
    // 12 slashing + 6 piercing vs DR 10/— is 18 - 10 = 8, NOT 18 - 20 = 0.
    const out = resolveDamage(
      [
        { amount: 12, type: "slashing" },
        { amount: 6, type: "piercing" },
      ],
      defenses([entry(10, "—")]),
    );
    expect(out.final).toBe(8);
    expect(out.reductions).toEqual([{ label: "DR 10/—", absorbed: 10 }]);
  });

  it("leaves energy in the same hit untouched by DR", () => {
    // "12 bludgeoning and 6 cold" vs DR 10/—: DR eats 10 of the bludgeoning.
    const out = resolveDamage(
      [
        { amount: 12, type: "bludgeoning" },
        { amount: 6, type: "cold" },
      ],
      defenses([entry(10, "—")]),
    );
    expect(out.final).toBe(8);
    expect(out.terms).toEqual([
      { amount: 12, type: "bludgeoning", final: 2 },
      { amount: 6, type: "cold", final: 6 },
    ]);
  });

  it("never reduces below zero", () => {
    const out = resolveDamage([{ amount: 3, type: "weapon" }], defenses([entry(10, "—")]));
    expect(out.final).toBe(0);
    expect(out.reductions).toEqual([{ label: "DR 10/—", absorbed: 3 }]);
  });

  it("ignores DR entirely for unspecified damage", () => {
    const out = resolveDamage([{ amount: 9, type: "unspecified" }], defenses([entry(10, "—")]));
    expect(out.final).toBe(9);
    expect(out.reductions).toEqual([]);
  });
});

describe("multiple DR lines don't stack — the best applicable one applies", () => {
  const both = defenses([entry(5, "—"), entry(10, "magic")]);

  it("uses the higher line when nothing bypasses", () => {
    expect(resolveDamage([{ amount: 20, type: "weapon" }], both).final).toBe(10);
  });

  it("falls back to DR/— once the better line is bypassed", () => {
    const out = resolveDamage([{ amount: 20, type: "weapon" }], both, { bypasses: ["magic"] });
    expect(out.final).toBe(15);
    expect(out.reductions).toEqual([{ label: "DR 5/—", absorbed: 5 }]);
  });

  it("still applies DR/— when every qualified line is bypassed", () => {
    const out = resolveDamage([{ amount: 20, type: "weapon" }], defenses([entry(5, "—")]), {
      bypasses: ["adamantine", "magic"],
    });
    expect(out.final).toBe(15);
  });
});

describe("bypasses", () => {
  it("removes a single-qualifier line", () => {
    const out = resolveDamage(
      [{ amount: 20, type: "weapon" }],
      defenses([entry(10, "adamantine")]),
      {
        bypasses: ["adamantine"],
      },
    );
    expect(out.final).toBe(20);
    expect(out.reductions).toEqual([]);
  });

  it("normalizes the supplied bypass spelling", () => {
    const out = resolveDamage(
      [{ amount: 20, type: "weapon" }],
      defenses([entry(10, "cold-iron")]),
      {
        bypasses: ["coldIron"],
      },
    );
    expect(out.final).toBe(20);
  });

  it("is bypassed by damage of the qualifying physical type", () => {
    // DR 5/bludgeoning vs a mace: the damage itself satisfies the qualifier.
    const out = resolveDamage(
      [{ amount: 12, type: "bludgeoning" }],
      defenses([entry(5, "bludgeoning")]),
    );
    expect(out.final).toBe(12);
  });

  it("is NOT bypassed by weapon damage of unstated subtype", () => {
    // An unstated B/P/S subtype is not evidence of the right one.
    const out = resolveDamage(
      [{ amount: 12, type: "weapon" }],
      defenses([entry(5, "bludgeoning")]),
    );
    expect(out.final).toBe(7);
  });
});

describe("compound qualifiers", () => {
  it("requires both halves of an 'and' qualifier", () => {
    expect(qualifierBypassedBy("silver-and-magic", ["silver"])).toBe(false);
    expect(qualifierBypassedBy("silver-and-magic", ["silver", "magic"])).toBe(true);
  });

  it("accepts either half of an 'or' qualifier", () => {
    expect(qualifierBypassedBy("cold-iron-or-good", ["good"])).toBe(true);
    expect(qualifierBypassedBy("cold-iron-or-good", ["cold-iron"])).toBe(true);
    expect(qualifierBypassedBy("cold-iron-or-good", ["magic"])).toBe(false);
  });

  it("never treats DR/— as bypassable", () => {
    expect(qualifierBypassedBy("—", ["adamantine", "magic", "epic"])).toBe(false);
  });
});

describe("energy resistance applies per type", () => {
  it("reduces only the matching energy type", () => {
    const out = resolveDamage(
      [
        { amount: 12, type: "fire" },
        { amount: 6, type: "cold" },
      ],
      defenses([], [entry(10, "fire")]),
    );
    expect(out.final).toBe(8);
    expect(out.terms).toEqual([
      { amount: 12, type: "fire", final: 2 },
      { amount: 6, type: "cold", final: 6 },
    ]);
  });

  it("does nothing when no resistance matches", () => {
    const out = resolveDamage([{ amount: 6, type: "cold" }], defenses([], [entry(10, "fire")]));
    expect(out.final).toBe(6);
    expect(out.reductions).toEqual([]);
  });

  it("never reduces below zero", () => {
    const out = resolveDamage([{ amount: 4, type: "fire" }], defenses([], [entry(10, "fire")]));
    expect(out.final).toBe(0);
    expect(out.reductions).toEqual([{ label: "Resist fire 10", absorbed: 4 }]);
  });

  it("shares one pool across terms of the same type in a single hit", () => {
    const out = resolveDamage(
      [
        { amount: 6, type: "fire" },
        { amount: 6, type: "fire" },
      ],
      defenses([], [entry(10, "fire")]),
    );
    expect(out.final).toBe(2);
  });
});

describe("DR and resistance together", () => {
  it("applies each to its own branch of the hit", () => {
    // "12 bludgeoning and 6 cold" vs DR 10/— and Resist Cold 5 -> 2 + 1.
    const out = resolveDamage(
      [
        { amount: 12, type: "bludgeoning" },
        { amount: 6, type: "cold" },
      ],
      defenses([entry(10, "—")], [entry(5, "cold")]),
    );
    expect(out.raw).toBe(18);
    expect(out.final).toBe(3);
    expect(out.reductions).toEqual([
      { label: "DR 10/—", absorbed: 10 },
      { label: "Resist cold 5", absorbed: 5 },
    ]);
  });
});
