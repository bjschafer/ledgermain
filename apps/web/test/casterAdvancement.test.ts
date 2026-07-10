/**
 * Unit tests for issue #66 chunk 2 (prestige casting advancement) additions
 * to `model/casterLevel.ts`: `CASTER_KIND`, `castingAdvancementBonus`,
 * `effectiveCasterClassLevel`, `effectiveCasterLevel`, and
 * `eligibleAdvancementTargets`. Uses the real vendored refdata (loadRefData)
 * since the Eldritch Knight / Mystic Theurge chassis (issue #66 chunk 1) only
 * exists there, not in a hand-rolled fixture.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  CASTER_KIND,
  casterLevelForClass,
  castingAdvancementBonus,
  effectiveCasterClassLevel,
  effectiveCasterLevel,
  eligibleAdvancementTargets,
} from "../src/model/casterLevel.js";
import {
  addClass,
  createEmptyDoc,
  setCastingAdvancementTarget,
  setClassLevel,
} from "../src/model/doc.js";
import {
  CASTER_MODELS,
  spellSlotsByLevel,
  spellsKnownLimitsByLevel,
} from "../src/model/spellcasting.js";

const ref = loadRefData();

function classed(tags: { tag: string; level: number }[]) {
  let doc = createEmptyDoc("t");
  for (const { tag, level } of tags) {
    doc = addClass(doc, tag);
    doc = setClassLevel(doc, tag, level);
  }
  return doc;
}

describe("CASTER_KIND", () => {
  it("classifies arcane, divine, and psychic casters", () => {
    expect(CASTER_KIND.wizard).toBe("arcane");
    expect(CASTER_KIND.sorcerer).toBe("arcane");
    expect(CASTER_KIND.bard).toBe("arcane");
    expect(CASTER_KIND.cleric).toBe("divine");
    expect(CASTER_KIND.oracle).toBe("divine");
    expect(CASTER_KIND.paladin).toBe("divine");
    expect(CASTER_KIND.psychic).toBe("psychic");
    expect(CASTER_KIND.mesmerist).toBe("psychic");
  });

  it("deliberately excludes alchemist/investigator — extract preparers, not spellcasters", () => {
    expect(CASTER_KIND.alchemist).toBeUndefined();
    expect(CASTER_KIND.investigator).toBeUndefined();
  });

  it("excludes prestige class tags — a prestige class never targets itself", () => {
    expect(CASTER_KIND.eldritchKnight).toBeUndefined();
    expect(CASTER_KIND.mysticTheurge).toBeUndefined();
  });
});

describe("eligibleAdvancementTargets", () => {
  it("Eldritch Knight's single arcane slot accepts an arcane class on the doc, not a divine one", () => {
    const doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "cleric", level: 3 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    expect(eligibleAdvancementTargets(doc, ref, "eldritchKnight", 0)).toEqual(["wizard"]);
  });

  it("Mystic Theurge's two slots split arcane (slot 0) vs divine (slot 1)", () => {
    const doc = classed([
      { tag: "wizard", level: 3 },
      { tag: "cleric", level: 3 },
      { tag: "mysticTheurge", level: 2 },
    ]);
    expect(eligibleAdvancementTargets(doc, ref, "mysticTheurge", 0)).toEqual(["wizard"]);
    expect(eligibleAdvancementTargets(doc, ref, "mysticTheurge", 1)).toEqual(["cleric"]);
  });

  it("returns [] for a class with no castingAdvancement slots, or an out-of-range slot index", () => {
    const doc = classed([{ tag: "wizard", level: 5 }]);
    expect(eligibleAdvancementTargets(doc, ref, "wizard", 0)).toEqual([]);
    expect(eligibleAdvancementTargets(doc, ref, "eldritchKnight", 5)).toEqual([]);
  });
});

describe("castingAdvancementBonus / effectiveCasterClassLevel", () => {
  it("Wizard 5 / Eldritch Knight 3, slot 0 -> wizard: EK's 1st level grants nothing, 2nd+3rd grant +1 each", () => {
    let doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");

    expect(castingAdvancementBonus(doc, ref, "wizard")).toBe(2);
    expect(effectiveCasterClassLevel(doc, ref, "wizard")).toBe(7);
    expect(casterLevelForClass("wizard", effectiveCasterClassLevel(doc, ref, "wizard"))).toBe(7);
    expect(effectiveCasterLevel(doc, ref)).toBe(7);

    // Feeds the wizard's spells-per-day TABLE at the effective level, not the
    // raw class level — the two tables genuinely differ.
    const atEffective = spellSlotsByLevel(CASTER_MODELS.wizard!, 7, 3);
    const atRaw = spellSlotsByLevel(CASTER_MODELS.wizard!, 5, 3);
    expect(atEffective).not.toEqual(atRaw);
  });

  it("Wizard 3 / Cleric 3 / Mystic Theurge 2: both slots grant +2, both classes reach effective 5", () => {
    let doc = classed([
      { tag: "wizard", level: 3 },
      { tag: "cleric", level: 3 },
      { tag: "mysticTheurge", level: 2 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 0, "wizard");
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 1, "cleric");

    expect(effectiveCasterClassLevel(doc, ref, "wizard")).toBe(5);
    expect(effectiveCasterClassLevel(doc, ref, "cleric")).toBe(5);
  });

  it("Sorcerer 5 / Eldritch Knight 2 -> sorcerer: effective 6 feeds the spells-KNOWN table", () => {
    let doc = classed([
      { tag: "sorcerer", level: 5 },
      { tag: "eldritchKnight", level: 2 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "sorcerer");

    expect(effectiveCasterClassLevel(doc, ref, "sorcerer")).toBe(6);

    // Sorcerer's known-spells table genuinely differs between level 5 and 6
    // (level 5: [6,4,2]; level 6: [7,4,2,1] — a 3rd-level slot unlocks at 6).
    const knownAtEffective = spellsKnownLimitsByLevel(CASTER_MODELS.sorcerer!, 6);
    const knownAtRaw = spellsKnownLimitsByLevel(CASTER_MODELS.sorcerer!, 5);
    expect(knownAtEffective).not.toEqual(knownAtRaw);

    // Bloodline bonus spells known are a CLASS FEATURE tied to the sorcerer's
    // own real level (PF1 RAW) — advancement must never accelerate them, so
    // any caller computing them must keep feeding the RAW level (5), not the
    // effective one (6). This module doesn't expose a "raw class level"
    // helper because none is needed: `identity.classes` already IS that
    // value, unaffected by anything in this file.
    const rawSorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")!.level;
    expect(rawSorcererLevel).toBe(5);
  });

  it("a stale stored target (the target class was since removed from the build) contributes 0", () => {
    let doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");
    // Bypass removeClass's own cleanup to prove castingAdvancementBonus's
    // OWN defensive guard (not just doc.ts's cleanup) rejects a stale target.
    doc = {
      ...doc,
      identity: {
        ...doc.identity,
        classes: doc.identity.classes.filter((c) => c.tag !== "wizard"),
      },
    };

    expect(castingAdvancementBonus(doc, ref, "wizard")).toBe(0);
    expect(effectiveCasterClassLevel(doc, ref, "wizard")).toBe(0);
  });

  it("a kind-mismatched stored target (garbage written directly to the doc) contributes 0", () => {
    const base = classed([
      { tag: "wizard", level: 5 },
      { tag: "cleric", level: 5 },
      { tag: "mysticTheurge", level: 5 },
    ]);
    // Mystic Theurge slot 0 is "arcane" — force a divine target into it,
    // bypassing setCastingAdvancementTarget's own validation entirely.
    const doc = {
      ...base,
      build: { ...base.build, castingAdvancement: { mysticTheurge: ["cleric", null] } },
    };

    expect(castingAdvancementBonus(doc, ref, "cleric")).toBe(0);
    expect(effectiveCasterClassLevel(doc, ref, "cleric")).toBe(5); // own level only, no bonus
  });

  it("clamps effective class level at 20", () => {
    let doc = classed([
      { tag: "wizard", level: 17 },
      { tag: "eldritchKnight", level: 10 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");

    // EK levels 2-10 are all <= 10, so the bonus is the full 9-entry slot.
    expect(castingAdvancementBonus(doc, ref, "wizard")).toBe(9);
    expect(effectiveCasterClassLevel(doc, ref, "wizard")).toBe(20); // 17 + 9 = 26, clamped
  });

  it("returns 0 for a class the document doesn't have at all", () => {
    const doc = classed([{ tag: "eldritchKnight", level: 3 }]);
    expect(effectiveCasterClassLevel(doc, ref, "wizard")).toBe(0);
  });
});
