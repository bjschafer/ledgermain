import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenFeatCount,
  chosenFeatCountExcludingGranted,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  grantedFeats,
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
  archetypes?: string[];
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
      archetypes: over.archetypes,
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

  it("Fighter 1 / Wizard 1 multiclass Elf → 1 base + 1 fighter = 2 (Scribe Scroll auto-granted, not a slot)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 1 },
        { tag: "wizard", level: 1 },
      ],
      race: "Elf",
    });
    // charLevel=2: base ceil(2/2)=1; humanBonus=0;
    // fighter bonus: fL=1 → 1+floor(1/2)=1
    // wizard's "Scribe Scroll" is a fixed feat grant → grantedFeats(), not a slot
    // total=1+0+1=2
    expect(expectedFeatCount(doc, ref)).toBe(2);
  });
});

describe("expectedFeatCount: Wizard bonus feats", () => {
  // Wizard's "Scribe Scroll" (formula "1") is a FIXED grant of that specific
  // feat — auto-granted via grantedFeats(), excluded from the slot budget.
  // Arcane School bonus feats at 5th/10th/15th/20th (floor(unlevel / 5)) are
  // free slots and stay in the budget.

  it("Wizard 1 Elf → 1 base, Scribe Scroll granted not budgeted = 1", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(1);
  });

  it("Wizard 10 Elf → 5 base + 2 Arcane School = 7", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 10 }], race: "Elf" });
    // base: ceil(10/2)=5; Arcane School: floor(10/5)=2; Scribe Scroll granted → total=7
    expect(expectedFeatCount(doc, ref)).toBe(7);
  });
});

describe("expectedFeatCount: Sorcerer bonus feats", () => {
  // Sorcerer's "Eschew Materials" is a fixed grant (auto-granted, not
  // budgeted); the bloodline bonus feat at 7th and every 6 levels thereafter
  // (floor((unlevel - 1) / 6)) is a free slot and stays in the budget.

  it("Sorcerer 7 Elf → 4 base + 1 bloodline feat = 5", () => {
    const doc = makeDoc({ classes: [{ tag: "sorcerer", level: 7 }], race: "Elf" });
    // base: ceil(7/2)=4; bloodline: floor((7-1)/6)=1; Eschew Materials granted → total=5
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });
});

describe("expectedFeatCount: Ranger Combat Style bonus feats", () => {
  // Ranger's "Combat Style Feat" (granted at rL 2) carries a vendored
  // `changes[]` entry targeting `bonusFeats` with formula
  // "floor((@class.unlevel + 2) / 4)" — this flows through the same generic
  // classBonusFeats() pipeline as Fighter/Wizard/Sorcerer with no
  // hand-authoring needed (issue #13 step 2 audit). No feat is literally
  // named "Combat Style Feat", so it's a free slot, not a fixed grant.

  it("Ranger 6 Elf → 3 base + 2 combat style = 5", () => {
    const doc = makeDoc({ classes: [{ tag: "ranger", level: 6 }], race: "Elf" });
    // base: ceil(6/2)=3; combat style: floor((6+2)/4)=2 → total=5
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });

  it("Ranger 1 Elf → 1 base, no combat style slot yet (feature grants at rL 2)", () => {
    const doc = makeDoc({ classes: [{ tag: "ranger", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(1);
  });
});

describe("expectedFeatCount: archetype swaps of bonus-feat features (issue #40)", () => {
  // Two ranger archetypes both swap out the base "Combat Style Feat" (which
  // grants the bonus-feat slots counted above) at rL 2, but differ in what
  // they hand back — exercising both halves of the archetype-aware budget:
  //
  //  * Sable Company Marine's Hippogriff Companion is vendored as paired to
  //    Combat Style Feat, but that pairing is a data bug (the feature is
  //    additive per RAW) — the engine ignores it via MISPAIRED_ADDITIVE_FEATURES
  //    (f3b5255), so the budget keeps the full base style progression.
  //  * Bow Nomad replaces it with an identical-schedule archery combat style
  //    (an ARCHETYPE_FEATURE_EFFECTS `bonusFeats` reflavor), so the count nets
  //    out unchanged — guarding against both double-counting (base + archetype)
  //    and dropping the slots entirely.

  it("Sable Company Marine ranger 6 Elf → 3 base + 2 combat style (mispaired swap ignored) = 5", () => {
    const doc = makeDoc({
      classes: [{ tag: "ranger", level: 6 }],
      race: "Elf",
      archetypes: ["ranger:sable-company-marine"],
    });
    // Hippogriff Companion is additive per RAW; the vendored pairing to Combat
    // Style Feat is a data bug ignored via MISPAIRED_ADDITIVE_FEATURES
    // (engine/archetypes.ts), so the style progression survives:
    // base ceil(6/2)=3 + combat style feats at L2/L6 = 5.
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });

  it("Bow Nomad ranger 6 Elf → 3 base + 2 archetype combat style = 5 (unchanged)", () => {
    const doc = makeDoc({
      classes: [{ tag: "ranger", level: 6 }],
      race: "Elf",
      archetypes: ["ranger:bow-nomad"],
    });
    // base: ceil(6/2)=3; base Combat Style swapped out (−2) but re-granted by the
    // archetype's identical floor((6+2)/4)=2 → net 5, same as the vanilla ranger.
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });
});

describe("expectedFeatCount: Monk Bonus Feat (Unarmed Strike quirk fixed)", () => {
  // Monk's "Bonus Feat (MNK)" (granted at rL 1) carries a vendored `changes[]`
  // entry targeting `bonusFeats` with formula "1 + floor((@class.unlevel + 2)
  // / 4)" — flows through the same generic classBonusFeats() pipeline with no
  // hand-authoring needed (issue #13 step 1 audit).
  //
  // Also discovered while auditing (step 1): Monk's "Unarmed Strike" class
  // feature ALSO carries a vendored `changes[]` entry targeting `bonusFeats`
  // with a flat formula of "1" — Foundry's way of representing the automatic
  // Improved Unarmed Strike grant every monk gets at L1. Its feature name
  // ("Unarmed Strike") doesn't match the feat it grants ("Improved Unarmed
  // Strike"), so `classBonusFeats()`'s by-name fixed-grant filter used to
  // miss it and inflate the free bonus-feat-slot budget by +1 at every monk
  // level. Fixed in step 2 via `FEATURE_NAME_OVERRIDES` in `feats.ts` — the
  // expectations below assert the SRD-correct (un-inflated) behavior.

  it("Monk 1 Elf → 1 base + Bonus Feat(1), Unarmed Strike no longer inflates the budget = 2", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(2);
  });

  it("Monk 5 Elf → 3 base + Bonus Feat(2) = 5", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 5 }], race: "Elf" });
    // base: ceil(5/2)=3; Bonus Feat: 1+floor(7/4)=2 → total=5
    expect(expectedFeatCount(doc, ref)).toBe(5);
  });

  it("Monk 1 is granted Improved Unarmed Strike (via the Unarmed Strike -> Improved Unarmed Strike override)", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 1 }], race: "Elf" });
    const granted = grantedFeats(doc, ref);
    // Stunning Fist is a separate, pre-existing fixed grant (its class feature
    // name already matches a real feat by name, no override needed) — both
    // are granted outright at monk level 1.
    expect(granted.map((g) => g.featName)).toEqual(["Stunning Fist", "Improved Unarmed Strike"]);
    const unarmed = granted.find((g) => g.featureName === "Unarmed Strike");
    expect(unarmed!.classTag).toBe("monk");
  });
});

describe("expectedFeatCount: multiclass fighter + wizard bonus feats stack", () => {
  it("Fighter 2 / Wizard 5 Elf → base + fighter bonus + wizard slot bonus", () => {
    const doc = makeDoc({
      classes: [
        { tag: "fighter", level: 2 },
        { tag: "wizard", level: 5 },
      ],
      race: "Elf",
    });
    // charLevel=7: base ceil(7/2)=4
    // fighter bonus: fL=2 → 1+floor(2/2)=2
    // wizard bonus: wL=5 → Arcane School floor(5/5)=1 (Scribe Scroll granted, not budgeted)
    // total=4+0+2+1=7
    expect(expectedFeatCount(doc, ref)).toBe(7);
  });
});

describe("grantedFeats: fixed class feat grants", () => {
  function featIdNamed(name: string): string {
    const feat = Object.values(ref.feats).find((f) => f.name === name);
    if (!feat) throw new Error(`feat not found: ${name}`);
    return feat.id;
  }

  it("Wizard 1 is granted Scribe Scroll", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 1 }] });
    const granted = grantedFeats(doc, ref);
    expect(granted.map((g) => g.featName)).toEqual(["Scribe Scroll"]);
    expect(granted[0]!.featId).toBe(featIdNamed("Scribe Scroll"));
    expect(granted[0]!.classTag).toBe("wizard");
  });

  it("Sorcerer 1 is granted Eschew Materials", () => {
    const doc = makeDoc({ classes: [{ tag: "sorcerer", level: 1 }] });
    expect(grantedFeats(doc, ref).map((g) => g.featName)).toEqual(["Eschew Materials"]);
  });

  it("Fighter has no fixed grants (bonus feats are player-choice slots)", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 10 }] });
    expect(grantedFeats(doc, ref)).toEqual([]);
  });

  it("a manually-added duplicate of a granted feat doesn't consume a budget slot", () => {
    const scribe = featIdNamed("Scribe Scroll");
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      race: "Elf",
      feats: [scribe, "some-other-feat"],
    });
    // Raw chosen count still sees both entries…
    expect(chosenFeatCount(doc)).toBe(2);
    // …but the budget-facing count excludes the granted duplicate.
    expect(chosenFeatCountExcludingGranted(doc, ref)).toBe(1);
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
