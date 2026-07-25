import { describe, expect, it } from "bun:test";

import {
  DAMAGE_TYPES,
  isEnergyDamage,
  isPhysicalDamage,
  normalizeQualifier,
  qualifierLabel,
  resolveDamageWord,
} from "../src/damage-types.js";

describe("damage type lattice", () => {
  it("treats weapon as physical, so DR resolves without a B/P/S subtype", () => {
    expect(isPhysicalDamage("weapon")).toBe(true);
    expect(isPhysicalDamage("bludgeoning")).toBe(true);
    expect(isPhysicalDamage("piercing")).toBe(true);
    expect(isPhysicalDamage("slashing")).toBe(true);
  });

  it("keeps unspecified off both branches so nothing applies automatically", () => {
    expect(isPhysicalDamage("unspecified")).toBe(false);
    expect(isEnergyDamage("unspecified")).toBe(false);
  });

  it("classifies the five energy types", () => {
    for (const id of ["acid", "cold", "electricity", "fire", "sonic"] as const) {
      expect(isEnergyDamage(id)).toBe(true);
      expect(isPhysicalDamage(id)).toBe(false);
    }
  });

  it("has no duplicate ids", () => {
    const ids = DAMAGE_TYPES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveDamageWord", () => {
  it("resolves full names", () => {
    expect(resolveDamageWord("bludgeoning")).toBe("bludgeoning");
    expect(resolveDamageWord("electricity")).toBe("electricity");
    expect(resolveDamageWord("sonic")).toBe("sonic");
  });

  it("resolves curated single letters to the common table reading", () => {
    expect(resolveDamageWord("b")).toBe("bludgeoning");
    expect(resolveDamageWord("p")).toBe("piercing");
    expect(resolveDamageWord("s")).toBe("slashing");
    expect(resolveDamageWord("f")).toBe("fire");
    expect(resolveDamageWord("c")).toBe("cold");
    expect(resolveDamageWord("w")).toBe("weapon");
  });

  it("reaches the shadowed readings by two-letter prefix", () => {
    // `p` is piercing and `s` is slashing, so physical/sonic need one more char.
    expect(resolveDamageWord("ph")).toBe("weapon");
    expect(resolveDamageWord("so")).toBe("sonic");
    expect(resolveDamageWord("sl")).toBe("slashing");
  });

  it("accepts table synonyms", () => {
    expect(resolveDamageWord("lightning")).toBe("electricity");
    expect(resolveDamageWord("physical")).toBe("weapon");
    expect(resolveDamageWord("untyped")).toBe("unspecified");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveDamageWord("  Fire ")).toBe("fire");
  });

  it("returns undefined rather than guessing at nonsense", () => {
    expect(resolveDamageWord("banana")).toBeUndefined();
    expect(resolveDamageWord("")).toBeUndefined();
  });
});

describe("normalizeQualifier", () => {
  it("folds every spelling of cold iron onto one canonical id", () => {
    // The bug this exists for: hand-authored engine content emitted
    // `dr.cold-iron` while the Change-authoring form offered `dr.coldIron`,
    // so the two never grouped and a character with both showed two seals.
    expect(normalizeQualifier("cold-iron")).toBe("cold-iron");
    expect(normalizeQualifier("coldIron")).toBe("cold-iron");
    expect(normalizeQualifier("Cold Iron")).toBe("cold-iron");
    expect(normalizeQualifier("cold_iron")).toBe("cold-iron");
    expect(normalizeQualifier("coldiron")).toBe("cold-iron");
  });

  it("leaves already-canonical single words alone", () => {
    expect(normalizeQualifier("adamantine")).toBe("adamantine");
    expect(normalizeQualifier("magic")).toBe("magic");
    expect(normalizeQualifier("good")).toBe("good");
  });

  it("passes unknown qualifiers through cleaned rather than dropping them", () => {
    // A user-authored buff may name any bypass; discarding one would lose a
    // real defense off the sheet.
    expect(normalizeQualifier("Bludgeoning And Magic")).toBe("bludgeoning-and-magic");
    expect(normalizeQualifier("chitin")).toBe("chitin");
  });

  it("preserves the no-bypass em dash", () => {
    expect(normalizeQualifier("—")).toBe("—");
    expect(qualifierLabel("—")).toBe("—");
  });

  it("folds alchemical silver onto silver", () => {
    expect(normalizeQualifier("alchemical silver")).toBe("silver");
  });
});

describe("qualifierLabel", () => {
  it("renders canonical ids as prose", () => {
    expect(qualifierLabel("cold-iron")).toBe("cold iron");
    expect(qualifierLabel("adamantine")).toBe("adamantine");
  });
});
