import { describe, expect, it } from "bun:test";

import { describeDamageParse, parseDamageInput } from "../src/model/damageInput.js";

/** Terms as `[amount, type]` pairs, for compact assertions. */
function pairs(input: string): [number, string][] {
  return parseDamageInput(input).terms.map((t) => [t.amount, t.type]);
}

describe("bare numbers stay exactly as fast as the plain field they replace", () => {
  it("parses a bare number as one assumed-weapon term", () => {
    // Unqualified damage at a table is almost always weapon damage, so DR
    // gets a chance to apply; `inferred` marks it as an assumption.
    const parse = parseDamageInput("17");
    expect(parse.ok).toBe(true);
    expect(parse.total).toBe(17);
    expect(parse.terms).toEqual([{ amount: 17, type: "weapon", inferred: true }]);
  });

  it("keeps a stated type unflagged, so assumptions are distinguishable", () => {
    expect(parseDamageInput("17 fire").terms).toEqual([
      { amount: 17, type: "fire", inferred: false },
    ]);
  });

  it("still reaches genuinely untyped damage explicitly", () => {
    expect(parseDamageInput("17 untyped").terms).toEqual([
      { amount: 17, type: "unspecified", inferred: false },
    ]);
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
      { amount: 9, type: "weapon", inferred: false },
      { amount: 7, type: "sonic", inferred: false },
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
      { amount: 6, type: "weapon", inferred: true },
      { amount: 3, type: "cold", inferred: false },
    ]);
  });

  it("fires on the terse form too", () => {
    const parse = parseDamageInput("9 3c");
    expect(parse.mode).toBe("carve-out");
    expect(parse.total).toBe(9);
    expect(pairs("9 3c")).toEqual([
      [6, "weapon"],
      [3, "cold"],
    ]);
  });

  it("drops a zero remainder instead of showing an empty term", () => {
    const parse = parseDamageInput("9 9c");
    expect(parse.mode).toBe("carve-out");
    expect(parse.total).toBe(9);
    expect(parse.terms).toEqual([{ amount: 9, type: "cold", inferred: false }]);
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

describe("materials and other DR bypasses", () => {
  it("pulls a material out of the amount instead of typing the damage with it", () => {
    const parse = parseDamageInput("12 adamantine");
    expect(parse.bypasses).toEqual(["adamantine"]);
    expect(parse.total).toBe(12);
    expect(parse.terms).toEqual([{ amount: 12, type: "weapon", inferred: true }]);
    expect(parse.warnings).toEqual([]);
  });

  it("joins a two-word material rather than reading its first word as a type", () => {
    expect(parseDamageInput("12 cold iron").bypasses).toEqual(["cold-iron"]);
    expect(parseDamageInput("12 cold iron").terms[0]!.type).toBe("weapon");
    // The damage type still wins when the second word isn't there.
    expect(parseDamageInput("12 cold").terms[0]!.type).toBe("cold");
    expect(parseDamageInput("12 cold").bypasses).toEqual([]);
  });

  it("keeps a cold-iron weapon and cold damage in the same hit apart", () => {
    // "cold" only stops being a damage type when "iron" is the very next word.
    const parse = parseDamageInput("12 cold iron and 6 cold");
    expect(parse.bypasses).toEqual(["cold-iron"]);
    expect(parse.terms).toEqual([
      { amount: 12, type: "weapon", inferred: true },
      { amount: 6, type: "cold", inferred: false },
    ]);
  });

  it("folds alternate spellings onto the canonical qualifier", () => {
    expect(parseDamageInput("12 alchemical silver").bypasses).toEqual(["silver"]);
    expect(parseDamageInput("12 silvered").bypasses).toEqual(["silver"]);
    expect(parseDamageInput("12 magical").bypasses).toEqual(["magic"]);
  });

  it("treats mithral as silver, which is what it counts as for DR", () => {
    expect(parseDamageInput("12 mithral").bypasses).toEqual(["silver"]);
    expect(parseDamageInput("12 mithril").bypasses).toEqual(["silver"]);
    // ...unless the character's own DR names mithral, which is then meant literally.
    expect(parseDamageInput("12 mithral", ["mithral"]).bypasses).toEqual(["mithral"]);
  });

  it("abbreviates a material down to an unambiguous prefix", () => {
    const bypassOf = (raw: string) => parseDamageInput(raw).bypasses;
    expect(bypassOf("12 ad")).toEqual(["adamantine"]);
    expect(bypassOf("12 ada")).toEqual(["adamantine"]);
    expect(bypassOf("12 sil")).toEqual(["silver"]);
    expect(bypassOf("12 mith")).toEqual(["silver"]);
    expect(bypassOf("12 ma")).toEqual(["magic"]);
    expect(bypassOf("12 ep")).toEqual(["epic"]);
    expect(bypassOf("12 ev")).toEqual(["evil"]);
    expect(bypassOf("12 go")).toEqual(["good"]);
    expect(bypassOf("12 la")).toEqual(["lawful"]);
    expect(bypassOf("12 ch")).toEqual(["chaotic"]);
    // "cold iron" has no short prefix of its own, so it gets a curated one —
    // and abbreviates by its second word too.
    expect(bypassOf("12 ci")).toEqual(["cold-iron"]);
    expect(bypassOf("12 cold i")).toEqual(["cold-iron"]);
  });

  it("refuses an abbreviation that names two bypasses at once", () => {
    // "m" is magic or mithral-as-silver. Guessing is worse than saying
    // nothing, so it falls through to the warning.
    expect(parseDamageInput("12 m").bypasses).toEqual([]);
    expect(parseDamageInput("12 m").warnings.length).toBe(1);
  });

  it("never lets a material abbreviation shadow a damage-type one", () => {
    // The letters the damage types already claim keep meaning damage: "s" is
    // slashing not silver, "e" is electricity not epic/evil, "a" is acid not
    // adamantine, "frost" is cold rather than a prefix of some homebrew DR.
    expect(parseDamageInput("12 s").terms[0]!.type).toBe("slashing");
    expect(parseDamageInput("12 e").terms[0]!.type).toBe("electricity");
    expect(parseDamageInput("12 a").terms[0]!.type).toBe("acid");
    expect(parseDamageInput("12 frost", ["frostbitten"]).terms[0]!.type).toBe("cold");
    expect(parseDamageInput("12 a").bypasses).toEqual([]);
  });

  it("abbreviates a homebrew qualifier the character's DR names", () => {
    expect(parseDamageInput("12 frostb", ["frostbitten"]).bypasses).toEqual(["frostbitten"]);
  });

  it("takes a material anywhere in the phrase, including before the amount", () => {
    expect(parseDamageInput("adamantine, 12 points of damage").bypasses).toEqual(["adamantine"]);
    expect(parseDamageInput("adamantine, 12 points of damage").total).toBe(12);
  });

  it("keeps materials and damage types in one phrase apart", () => {
    const parse = parseDamageInput("12 slashing silver and 6 fire");
    expect(parse.bypasses).toEqual(["silver"]);
    expect(parse.total).toBe(18);
    expect(parse.terms.map((t) => t.type)).toEqual(["slashing", "fire"]);
  });

  it("accepts a qualifier the caller supplies that the built-in list has never heard of", () => {
    expect(parseDamageInput("12 frostbitten").warnings.length).toBe(1);
    expect(parseDamageInput("12 frostbitten", ["frostbitten"]).bypasses).toEqual(["frostbitten"]);
    expect(parseDamageInput("12 frostbitten", ["frostbitten"]).warnings).toEqual([]);
  });

  it("never treats a B/P/S word as a bypass — the resolver decides those from the damage", () => {
    const parse = parseDamageInput("12 bludgeoning", ["bludgeoning"]);
    expect(parse.bypasses).toEqual([]);
    expect(parse.terms[0]!.type).toBe("bludgeoning");
  });
});

describe("the article/acid collision", () => {
  it("reads a lone 'a' as acid when it types the amount it follows", () => {
    expect(parseDamageInput("12 a").terms).toEqual([{ amount: 12, type: "acid", inferred: false }]);
  });

  it("keeps the article reading everywhere else", () => {
    expect(parseDamageInput("you take a 9").terms).toEqual([
      { amount: 9, type: "weapon", inferred: true },
    ]);
    expect(parseDamageInput("you take a 9").warnings).toEqual([]);
    // Filler in between means the "a" is prose, not a type for the 9.
    expect(parseDamageInput("9 points of a fire spell").terms[0]!.type).toBe("fire");
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
    expect(describeDamageParse(parseDamageInput("9 3c"))).toBe("6 weapon + 3 cold = 9");
  });

  it("omits the total for a single term", () => {
    expect(describeDamageParse(parseDamageInput("17"))).toBe("17 weapon");
  });

  it("is empty for unparseable input", () => {
    expect(describeDamageParse(parseDamageInput(""))).toBe("");
  });
});
