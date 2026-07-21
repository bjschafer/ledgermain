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

  describe("combat-expertise", () => {
    const entry = SITUATIONAL_FEAT_EFFECTS["combat-expertise"]!;

    it("BAB 1: p = 1 -> -1 attack / +1 dodge AC", () => {
      expect(entry.effect({ bab: 1 })).toEqual({ attack: -1, acDelta: 1 });
    });

    it("BAB 4: p = 2 -> -2 attack / +2 dodge AC", () => {
      expect(entry.effect({ bab: 4 })).toEqual({ attack: -2, acDelta: 2 });
    });

    it("BAB 16: p = 5 -> -5 attack / +5 dodge AC", () => {
      expect(entry.effect({ bab: 16 })).toEqual({ attack: -5, acDelta: 5 });
    });

    it("is tagged melee", () => {
      expect(entry.appliesTo).toBe("melee");
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

  describe("piranha-strike", () => {
    const entry = SITUATIONAL_FEAT_EFFECTS["piranha-strike"]!;

    it("BAB 1: p = 1 -> -1/+2 (always 2p damage, light weapons)", () => {
      expect(entry.effect({ bab: 1 })).toEqual({
        attack: -1,
        damage: 2,
        note: "light weapons only",
      });
    });

    it("BAB 8: p = 3 -> -3/+6", () => {
      expect(entry.effect({ bab: 8 })).toEqual({
        attack: -3,
        damage: 6,
        note: "light weapons only",
      });
    });

    it("has no grip options (no two-handed variant)", () => {
      expect(entry.options).toBeUndefined();
    });

    it("is tagged melee", () => {
      expect(entry.appliesTo).toBe("melee");
    });
  });

  describe("note-only melee reminders (Power Attack tree + single-attack feats)", () => {
    const cases: Array<[string, string]> = [
      ["cleave", "1 foe + 1 adjacent foe (both at full BAB); −2 AC until next turn"],
      ["great-cleave", "chain to each adjacent foe while you keep hitting; −2 AC until next turn"],
      ["cornugon-smash", "free Intimidate to demoralize when you damage with Power Attack"],
      ["dreadful-carnage", "drop a foe in melee → free Intimidate vs all foes within 30 ft"],
      [
        "furious-finish",
        "Power Attack: max weapon damage on one attack (no Str/other attack bonus; 1/rest)",
      ],
      ["vital-strike", "single attack: roll weapon damage dice 2× (other bonuses added once)"],
      [
        "improved-vital-strike",
        "single attack: roll weapon damage dice 3× (other bonuses added once)",
      ],
      [
        "greater-vital-strike",
        "single attack: roll weapon damage dice 4× (other bonuses added once)",
      ],
    ];

    for (const [slug, note] of cases) {
      it(`${slug} is a melee note with no numeric fields`, () => {
        const entry = SITUATIONAL_FEAT_EFFECTS[slug]!;
        expect(entry.appliesTo).toBe("melee");
        const result = entry.effect({ bab: 12 });
        expect(result.attack).toBeUndefined();
        expect(result.damage).toBeUndefined();
        expect(result.extraAttacks).toBeUndefined();
        expect(result.acDelta).toBeUndefined();
        expect(result.note).toBe(note);
      });
    }
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
