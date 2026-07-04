/**
 * Hand-computed fixtures for SITUATIONAL_FEAT_EFFECTS (feat attachments on
 * saved rolls). These entries are pure functions of `{ bab }` (+ an optional
 * variant option) — no CharacterDoc/RefData involved, unlike FEAT_EFFECTS.
 */

import { describe, expect, it } from "bun:test";

import { SITUATIONAL_FEAT_EFFECTS } from "../src/index.js";

describe("SITUATIONAL_FEAT_EFFECTS", () => {
  describe("deadly-aim", () => {
    const entry = SITUATIONAL_FEAT_EFFECTS["deadly-aim"]!;

    it("BAB 1: p = 1 -> -1/+2", () => {
      expect(entry.effect({ bab: 1 })).toEqual({ attack: -1, damage: 2 });
    });

    it("BAB 4: p = 2 -> -2/+4", () => {
      expect(entry.effect({ bab: 4 })).toEqual({ attack: -2, damage: 4 });
    });

    it("BAB 8: p = 3 -> -3/+6", () => {
      expect(entry.effect({ bab: 8 })).toEqual({ attack: -3, damage: 6 });
    });

    it("BAB 12: p = 4 -> -4/+8", () => {
      expect(entry.effect({ bab: 12 })).toEqual({ attack: -4, damage: 8 });
    });
  });

  describe("power-attack", () => {
    const entry = SITUATIONAL_FEAT_EFFECTS["power-attack"]!;

    it("BAB 4 two-handed: p = 2 -> -2/+6", () => {
      expect(entry.effect({ bab: 4 }, "two-handed")).toEqual({ attack: -2, damage: 6 });
    });

    it("BAB 4 one-handed: p = 2 -> -2/+4", () => {
      expect(entry.effect({ bab: 4 }, "one-handed")).toEqual({ attack: -2, damage: 4 });
    });

    it("no option defaults to one-handed", () => {
      expect(entry.effect({ bab: 4 })).toEqual({ attack: -2, damage: 4 });
    });

    it("declares the two grip options", () => {
      expect(entry.options).toEqual([
        { id: "one-handed", label: "One-handed" },
        { id: "two-handed", label: "Two-handed" },
      ]);
    });
  });

  describe("rapid-shot", () => {
    const entry = SITUATIONAL_FEAT_EFFECTS["rapid-shot"]!;

    it("shape: -2 attack, +1 extra attack, full-attack-only note", () => {
      expect(entry.effect({ bab: 6 })).toEqual({
        attack: -2,
        extraAttacks: 1,
        note: "full attack only",
      });
    });
  });

  describe("point-blank-shot", () => {
    it("+1 attack, +1 damage, range note", () => {
      const entry = SITUATIONAL_FEAT_EFFECTS["point-blank-shot"]!;
      expect(entry.effect({ bab: 0 })).toEqual({ attack: 1, damage: 1, note: "within 30 ft" });
    });
  });

  describe("note-only entries", () => {
    it("precise-shot has no numeric fields", () => {
      const entry = SITUATIONAL_FEAT_EFFECTS["precise-shot"]!;
      const result = entry.effect({ bab: 10 });
      expect(result.attack).toBeUndefined();
      expect(result.damage).toBeUndefined();
      expect(result.extraAttacks).toBeUndefined();
      expect(result.note).toBe("no −4 for firing into melee");
    });

    it("manyshot has no numeric fields", () => {
      const entry = SITUATIONAL_FEAT_EFFECTS.manyshot!;
      const result = entry.effect({ bab: 10 });
      expect(result.attack).toBeUndefined();
      expect(result.damage).toBeUndefined();
      expect(result.extraAttacks).toBeUndefined();
      expect(result.note).toBe("first attack: 2 arrows (precision damage once)");
    });

    it("furious-focus has no numeric fields", () => {
      const entry = SITUATIONAL_FEAT_EFFECTS["furious-focus"]!;
      const result = entry.effect({ bab: 10 });
      expect(result.attack).toBeUndefined();
      expect(result.damage).toBeUndefined();
      expect(result.extraAttacks).toBeUndefined();
      expect(result.note).toBe("ignore Power Attack penalty on first attack each turn");
    });
  });

  describe("appliesTo tags", () => {
    it("ranged feats are tagged ranged", () => {
      for (const slug of [
        "point-blank-shot",
        "precise-shot",
        "rapid-shot",
        "manyshot",
        "deadly-aim",
      ]) {
        expect(SITUATIONAL_FEAT_EFFECTS[slug]!.appliesTo).toBe("ranged");
      }
    });

    it("melee feats are tagged melee", () => {
      for (const slug of ["power-attack", "furious-focus"]) {
        expect(SITUATIONAL_FEAT_EFFECTS[slug]!.appliesTo).toBe("melee");
      }
    });
  });
});
