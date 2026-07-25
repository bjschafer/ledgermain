import { describe, expect, it } from "bun:test";

import { describeDamageParse, parseDamageInput } from "../src/model/damageInput.js";

/** Terms as `[amount, type]` pairs, for compact assertions. */
function pairs(input: string): [number, string][] {
  return parseDamageInput(input).terms.map((t) => [t.amount, t.type]);
}

describe("bare numbers stay exactly as fast as the plain field they replace", () => {
  it("parses a bare number as one unspecified term", () => {
    const parse = parseDamageInput("17");
    expect(parse.ok).toBe(true);
    expect(parse.total).toBe(17);
    expect(parse.terms).toEqual([{ amount: 17, type: "unspecified" }]);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseDamageInput("  8  ").total).toBe(8);
  });

  it("reports not-ok for input with no number, without throwing", () => {
    for (const raw of ["", "   ", "fire", "ouch"]) {
      const parse = parseDamageInput(raw);
      expect(parse.ok).toBe(false);
      expect(parse.terms).toEqual([]);
      expect(parse.total).toBe(0);
    }
  });
});

describe("additive phrasing", () => {
  it("parses glued shorthand", () => {
    expect(pairs("12b 6c")).toEqual([
      [12, "bludgeoning"],
      [6, "cold"],
    ]);
    expect(parseDamageInput("12b 6c").total).toBe(18);
  });

  it("parses the spoken form with filler words", () => {
    // "you take 9 points of weapon damage and 7 points of sonic damage"
    const parse = parseDamageInput("9 points of weapon damage and 7 points of sonic damage");
    expect(parse.mode).toBe("additive");
    expect(parse.total).toBe(16);
    expect(parse.terms).toEqual([
      { amount: 9, type: "weapon" },
      { amount: 7, type: "sonic" },
    ]);
  });

  it("treats a typed leading term as additive without needing a marker", () => {
    expect(parseDamageInput("12 bludgeoning 6 cold").mode).toBe("additive");
    expect(parseDamageInput("12 bludgeoning 6 cold").total).toBe(18);
  });

  it("honors an explicit + even when the carve-out heuristic would fire", () => {
    // Untyped leader and 3 <= 9, so this would otherwise be read as a total.
    const parse = parseDamageInput("9 + 3c");
    expect(parse.mode).toBe("additive");
    expect(parse.total).toBe(12);
  });
});

describe("carve-out phrasing", () => {
  it('reads "9 damage, 3 of which are cold" as a stated total', () => {
    const parse = parseDamageInput("9 points of damage, 3 of which are cold");
    expect(parse.mode).toBe("carve-out");
    expect(parse.total).toBe(9);
    expect(parse.terms).toEqual([
      { amount: 6, type: "unspecified" },
      { amount: 3, type: "cold" },
    ]);
  });

  it("fires on the terse form too", () => {
    const parse = parseDamageInput("9 3c");
    expect(parse.mode).toBe("carve-out");
    expect(parse.total).toBe(9);
    expect(pairs("9 3c")).toEqual([
      [6, "unspecified"],
      [3, "cold"],
    ]);
  });

  it("drops a zero remainder instead of showing an empty term", () => {
    const parse = parseDamageInput("9 9c");
    expect(parse.mode).toBe("carve-out");
    expect(parse.total).toBe(9);
    expect(parse.terms).toEqual([{ amount: 9, type: "cold" }]);
  });

  it("falls back to additive when the named parts overflow the stated total", () => {
    const parse = parseDamageInput("9 damage, 12 of which are cold");
    expect(parse.mode).toBe("additive");
    expect(parse.total).toBe(21);
    expect(parse.warnings.join(" ")).toContain("exceeds the stated total");
  });

  it("does not carve when the leading term is typed", () => {
    // "12 fire 3 cold" is two components, not a 12-point total with 3 cold in it.
    expect(parseDamageInput("12f 3c").mode).toBe("additive");
    expect(parseDamageInput("12f 3c").total).toBe(15);
  });
});

describe("warnings", () => {
  it("notes an unrecognized type word but still parses the numbers", () => {
    const parse = parseDamageInput("10 banana");
    expect(parse.ok).toBe(true);
    expect(parse.total).toBe(10);
    expect(parse.warnings.join(" ")).toContain("banana");
  });

  it("notes a type word with no amount in front of it", () => {
    const parse = parseDamageInput("fire 10");
    expect(parse.warnings.join(" ")).toContain("no amount before it");
    expect(parse.total).toBe(10);
  });
});

describe("describeDamageParse", () => {
  it("echoes a multi-term parse with its total", () => {
    expect(describeDamageParse(parseDamageInput("9 3c"))).toBe("6 unspecified + 3 cold = 9");
  });

  it("omits the total for a single term", () => {
    expect(describeDamageParse(parseDamageInput("17"))).toBe("17 unspecified");
  });

  it("is empty for unparseable input", () => {
    expect(describeDamageParse(parseDamageInput(""))).toBe("");
  });
});
