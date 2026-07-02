import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenFeatCount,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  setFeatChoice,
} from "../src/model/feats.js";
import { toggleFeat } from "../src/model/doc.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  race?: string;
  feats?: string[];
  featChoices?: Record<string, string>;
  gmFeatSlots?: number;
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Human"),
      classes: over.classes,
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      gmGrants: over.gmFeatSlots != null ? { featSlots: over.gmFeatSlots } : undefined,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// Cleric has no `bonusFeats`-targeting class features in the vendored slice, so
// it is used here as a "no class bonus" vehicle for exercising the base
// progression + human racial bonus in isolation. (Wizard/Sorcerer/Fighter each
// have granted class features that add to the count — see the dedicated
// describe blocks below.)
describe("expectedFeatCount: base progression", () => {
  it("level 0 (no classes) → 0 feats", () => {
    const doc = makeDoc({ classes: [], race: "Human" });
    expect(expectedFeatCount(doc, ref)).toBe(0);
  });

  it("level 1 Human → 1 base + 1 human = 2", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 1 }], race: "Human" });
    // base: ceil(1/2)=1; humanBonus=1; classBonus=0
    expect(expectedFeatCount(doc, ref)).toBe(2);
  });

  it("level 1 Elf → 1 base, no racial bonus", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(1);
  });

  it("level 3 Human → 2 base + 1 human = 3", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 3 }], race: "Human" });
    // base: ceil(3/2)=2; humanBonus=1
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("level 5 Elf → 3 base feats (odd levels 1, 3, 5)", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 5 }], race: "Elf" });
    // base: ceil(5/2)=3
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("level 6 Elf → still 3 base feats (no feat at even level 6)", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 6 }], race: "Elf" });
    // base: ceil(6/2)=3
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("level 7 Elf → 4 base feats (new feat at odd level 7)", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 7 }], race: "Elf" });
    // base: ceil(7/2)=4
    expect(expectedFeatCount(doc, ref)).toBe(4);
  });
});

describe("expectedFeatCount: Fighter bonus feats", () => {
  // Fighter bonus feats: 1 at fL 1, then +1 every even fL (2, 4, 6, …).
  // Formula: 1 + floor(fL / 2).

  it("Fighter 1 Human → 1 base + 1 human + 1 fighter = 3", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], race: "Human" });
    // base: ceil(1/2)=1; humanBonus=1; fighterBonus: 1+floor(1/2)=1 → total=3
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("Fighter 2 Elf → 1 base + 2 fighter = 3", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 2 }], race: "Elf" });
    // base: ceil(2/2)=1; humanBonus=0; fighterBonus: 1+floor(2/2)=2 → total=3
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("Fighter 4 Elf → 2 base + 3 fighter = 5", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 4 }], race: "Elf" });
    // base: ceil(4/2)=2; humanBonus=0; fighterBonus: 1+floor(4/2)=3 → total=5
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });

  it("Fighter 1 / Wizard 1 multiclass Elf → 1 base + 1 fighter + 1 wizard (Scribe Scroll) = 3", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }, { tag: "wizard", level: 1 }],
      race: "Elf",
    });
    // charLevel=2: base ceil(2/2)=1; humanBonus=0;
    // fighter bonus: fL=1 → 1+floor(1/2)=1
    // wizard bonus: wL=1 grants "Scribe Scroll" (a genuine bonus feat, formula "1")
    // total=1+0+1+1=3
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });
});

describe("expectedFeatCount: Wizard bonus feats", () => {
  // Wizard grants "Scribe Scroll" as a bonus feat at 1st level (formula "1"),
  // then Arcane School bonus feats at 5th/10th/15th/20th (floor(unlevel / 5)).

  it("Wizard 1 Elf → 1 base + 1 Scribe Scroll = 2", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(2);
  });

  it("Wizard 10 Elf → 5 base + 3 bonus (1 Scribe Scroll + 2 Arcane School) = 8", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 10 }], race: "Elf" });
    // base: ceil(10/2)=5; Scribe Scroll=1; Arcane School: floor(10/5)=2 → total=8
    expect(expectedFeatCount(doc, ref)).toBe(8);
  });
});

describe("expectedFeatCount: Sorcerer bonus feats", () => {
  // Sorcerer grants "Eschew Materials" as a bonus feat at 1st level (formula "1"),
  // then a bloodline bonus feat at 7th and every 6 levels thereafter
  // (floor((unlevel - 1) / 6)).

  it("Sorcerer 7 Elf → 4 base + 2 bonus (1 Eschew Materials + 1 bloodline feat) = 6", () => {
    const doc = makeDoc({ classes: [{ tag: "sorcerer", level: 7 }], race: "Elf" });
    // base: ceil(7/2)=4; Eschew Materials=1; bloodline: floor((7-1)/6)=1 → total=6
    expect(expectedFeatCount(doc, ref)).toBe(6);
  });
});

describe("expectedFeatCount: multiclass fighter + wizard bonus feats stack", () => {
  it("Fighter 2 / Wizard 5 Elf → base + fighter bonus + wizard bonus", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 2 }, { tag: "wizard", level: 5 }],
      race: "Elf",
    });
    // charLevel=7: base ceil(7/2)=4
    // fighter bonus: fL=2 → 1+floor(2/2)=2
    // wizard bonus: wL=5 → Scribe Scroll(1) + Arcane School floor(5/5)=1 → 2
    // total=4+0+2+2=8
    expect(expectedFeatCount(doc, ref)).toBe(8);
  });
});

describe("chosenFeatCount", () => {
  it("returns 0 when no feats chosen", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    expect(chosenFeatCount(doc)).toBe(0);
  });

  it("returns the length of build.feats", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: ["feat1", "feat2"],
    });
    expect(chosenFeatCount(doc)).toBe(2);
  });
});

// ─── expectedFeatCount: GM-grant addend ──────────────────────────────────────
// Uses Cleric (no `bonusFeats`-targeting class features) to isolate the addend.
describe("expectedFeatCount: GM-grant feat-slot addend", () => {
  it("adds a positive grant to the expected count", () => {
    const base = makeDoc({ classes: [{ tag: "cleric", level: 1 }], race: "Elf" });
    const granted = makeDoc({
      classes: [{ tag: "cleric", level: 1 }],
      race: "Elf",
      gmFeatSlots: 2,
    });
    expect(expectedFeatCount(base, ref)).toBe(1);
    expect(expectedFeatCount(granted, ref)).toBe(3);
  });

  it("a negative grant (claw-back) reduces the expected count", () => {
    const granted = makeDoc({
      classes: [{ tag: "cleric", level: 1 }],
      race: "Elf",
      gmFeatSlots: -1,
    });
    expect(expectedFeatCount(granted, ref)).toBe(0);
  });

  it("an absent gmGrants object behaves as 0 (back-compat)", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 1 }], race: "Elf" });
    expect(doc.build.gmGrants).toBeUndefined();
    expect(expectedFeatCount(doc, ref)).toBe(1);
  });

  it("a gmGrants object with no featSlots key behaves as 0", () => {
    const doc = makeDoc({ classes: [{ tag: "cleric", level: 1 }], race: "Elf" });
    const withSkillOnly: CharacterDoc = {
      ...doc,
      build: { ...doc.build, gmGrants: { skillRanks: 5 } },
    };
    expect(expectedFeatCount(withSkillOnly, ref)).toBe(1);
  });

  it("does not change chosenFeatCount (grants adjust budget, not chosen)", () => {
    const granted = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      feats: ["a", "b"],
      gmFeatSlots: 2,
    });
    expect(chosenFeatCount(granted)).toBe(2);
  });
});

// ─── setFeatChoice ───────────────────────────────────────────────────────────

describe("setFeatChoice", () => {
  const BASE = makeDoc({ classes: [{ tag: "wizard", level: 1 }], feats: ["feat-a", "feat-b"] });

  it("sets a choice for a feat", () => {
    const next = setFeatChoice(BASE, "feat-a", "per");
    expect(next.build.featChoices?.["feat-a"]).toBe("per");
  });

  it("does not mutate the original doc (immutable transition)", () => {
    setFeatChoice(BASE, "feat-a", "per");
    expect(BASE.build.featChoices).toBeUndefined();
  });

  it("overwrites an existing choice", () => {
    const withChoice = setFeatChoice(BASE, "feat-a", "per");
    const updated = setFeatChoice(withChoice, "feat-a", "ste");
    expect(updated.build.featChoices?.["feat-a"]).toBe("ste");
  });

  it("preserves choices for other feats when setting one", () => {
    const withB = setFeatChoice(BASE, "feat-b", "blf");
    const withBoth = setFeatChoice(withB, "feat-a", "per");
    expect(withBoth.build.featChoices?.["feat-a"]).toBe("per");
    expect(withBoth.build.featChoices?.["feat-b"]).toBe("blf");
  });

  it("clears a choice when null is passed", () => {
    const withChoice = setFeatChoice(BASE, "feat-a", "per");
    const cleared = setFeatChoice(withChoice, "feat-a", null);
    expect(cleared.build.featChoices?.["feat-a"]).toBeUndefined();
  });

  it("preserves choices for other feats when clearing one", () => {
    const withBoth = setFeatChoice(setFeatChoice(BASE, "feat-a", "per"), "feat-b", "blf");
    const cleared = setFeatChoice(withBoth, "feat-a", null);
    expect(cleared.build.featChoices?.["feat-b"]).toBe("blf");
    expect(cleared.build.featChoices?.["feat-a"]).toBeUndefined();
  });
});

// ─── toggleFeat clears choices ───────────────────────────────────────────────

describe("toggleFeat clears feat choices on removal", () => {
  it("removes the feat's choice entry when the feat is removed", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: ["feat-a"],
      featChoices: { "feat-a": "per" },
    });
    const next = toggleFeat(doc, "feat-a");
    expect(next.build.feats).not.toContain("feat-a");
    expect(next.build.featChoices?.["feat-a"]).toBeUndefined();
  });

  it("preserves other feats' choices when removing one", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: ["feat-a", "feat-b"],
      featChoices: { "feat-a": "per", "feat-b": "blf" },
    });
    const next = toggleFeat(doc, "feat-a");
    expect(next.build.featChoices?.["feat-b"]).toBe("blf");
    expect(next.build.featChoices?.["feat-a"]).toBeUndefined();
  });

  it("adding a feat does not affect featChoices", () => {
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [],
      featChoices: { "feat-b": "blf" },
    });
    const next = toggleFeat(doc, "feat-a");
    expect(next.build.feats).toContain("feat-a");
    expect(next.build.featChoices?.["feat-b"]).toBe("blf");
  });
});

// ─── featChoiceDescriptor ────────────────────────────────────────────────────

describe("featChoiceDescriptor", () => {
  it('returns skill choice descriptor for "Skill Focus"', () => {
    const desc = featChoiceDescriptor("Skill Focus");
    expect(desc).not.toBeNull();
    expect(desc?.type).toBe("skill");
    expect(desc?.label).toBeDefined();
  });

  it("returns null for a static feat (Iron Will)", () => {
    expect(featChoiceDescriptor("Iron Will")).toBeNull();
  });

  it("returns null for an unknown feat slug", () => {
    expect(featChoiceDescriptor("Nonexistent Feat XYZ")).toBeNull();
  });
});

// ─── featChoiceOptions ───────────────────────────────────────────────────────

describe("featChoiceOptions", () => {
  it('returns the full skill list for type "skill"', () => {
    const opts = featChoiceOptions("skill", ref);
    expect(opts.length).toBeGreaterThan(0);
    // Each option has an id and a name.
    expect(opts[0]).toHaveProperty("id");
    expect(opts[0]).toHaveProperty("name");
  });

  it("includes Perception in the skill options", () => {
    const opts = featChoiceOptions("skill", ref);
    expect(opts.some((o) => o.id === "per" && o.name === "Perception")).toBe(true);
  });

  it("returns empty for type weapon (deferred)", () => {
    const opts = featChoiceOptions("weapon", ref);
    expect(opts).toHaveLength(0);
  });
});
