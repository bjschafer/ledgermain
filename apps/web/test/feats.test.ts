import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  chosenFeatCount,
  chosenFeatCountExcludingGranted,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  featDisplayName,
  featInstances,
  grantedFeats,
  setExtraFeatChoice,
  setFeatChoice,
} from "../src/model/feats.js";
import { addFeatInstance, removeFeatInstance, toggleFeat } from "../src/model/doc.js";
import { isRepeatableFeat, REPEATABLE_FEAT_SLUGS } from "../src/model/repeatableFeats.js";

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
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
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
      extraFeats: over.extraFeats,
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

describe("expectedFeatCount: Rogue (Unchained) Finesse Training grant + Rogue's Edge (UC) bonusFeats bug excluded", () => {
  // Finesse Training (UC) carries the same "bonusFeats change with a
  // mismatched feature name" shape as Monk's Unarmed Strike above — its
  // vendored `changes[]` entry (flat "1", target bonusFeats) represents the
  // automatic Weapon Finesse grant every Unchained Rogue gets at 1st level.
  // Fixed the same way, via `FEATURE_NAME_OVERRIDES`.
  it("Rogue (Unchained) 1 is granted Weapon Finesse outright (via the Finesse Training (UC) -> Weapon Finesse override)", () => {
    const doc = makeDoc({ classes: [{ tag: "rogueUnchained", level: 1 }], race: "Elf" });
    const granted = grantedFeats(doc, ref);
    expect(granted.map((g) => g.featName)).toEqual(["Weapon Finesse"]);
    const finesseTraining = granted.find((g) => g.featureName === "Finesse Training (UC)");
    expect(finesseTraining!.classTag).toBe("rogueUnchained");
  });

  it("Rogue (Unchained) 1 Elf → 1 base feat, no class bonus feats", () => {
    const doc = makeDoc({ classes: [{ tag: "rogueUnchained", level: 1 }], race: "Elf" });
    expect(expectedFeatCount(doc, ref)).toBe(1);
  });

  // Vendored-data bug (see IMPLEMENTATION_PLAN.md's Unchained-classes audit):
  // "Rogue's Edge (UC)" (granted at 5th level) carries a `bonusFeats` change
  // (`floor(@class.unlevel / 5)`), but the published ability grants "skill
  // unlock powers" for a chosen skill — nothing about bonus feats. Before the
  // fix, this would have inflated the budget by +1 at L5 (and further at
  // L10/L15/L20). The un-inflated (SRD-correct) budget is asserted below.
  it("Rogue (Unchained) 5 Elf → 3 base feats, Rogue's Edge (UC) contributes NO bonus-feat slots", () => {
    const doc = makeDoc({ classes: [{ tag: "rogueUnchained", level: 5 }], race: "Elf" });
    // base: ceil(5/2) = 3; class bonus feats: 0 (Rogue's Edge (UC) excluded).
    expect(expectedFeatCount(doc, ref)).toBe(3);
  });

  it("Rogue (Unchained) 20 Elf → 10 base feats, still no class bonus feats at max level", () => {
    const doc = makeDoc({ classes: [{ tag: "rogueUnchained", level: 20 }], race: "Elf" });
    // base: ceil(20/2) = 10; without the fix this would be 10 + floor(20/5) = 14.
    expect(expectedFeatCount(doc, ref)).toBe(10);
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

  it('returns the 8 schools of magic for type "school"', () => {
    const opts = featChoiceOptions("school", ref);
    expect(opts.map((o) => o.name)).toEqual([
      "Abjuration",
      "Conjuration",
      "Divination",
      "Enchantment",
      "Evocation",
      "Illusion",
      "Necromancy",
      "Transmutation",
    ]);
  });
});

// ─── issue #55: choice-requiring feats without a picker ─────────────────────

describe("featChoiceDescriptor: issue #55 additions", () => {
  it('Spell Focus gets a "school" descriptor (display-only, no engine effect)', () => {
    const desc = featChoiceDescriptor("Spell Focus");
    expect(desc).toEqual({ type: "school", label: "School" });
  });

  it('Greater Spell Focus gets a "school" descriptor (display-only, no engine effect)', () => {
    const desc = featChoiceDescriptor("Greater Spell Focus");
    expect(desc).toEqual({ type: "school", label: "School" });
  });

  it('Improved Critical gets a "weapon" descriptor (display-only, no crit-range wiring)', () => {
    const desc = featChoiceDescriptor("Improved Critical");
    expect(desc).toEqual({ type: "weapon", label: "Weapon Type" });
  });

  it("engine-wired choice feats (Weapon Focus, Skill Focus) still resolve through resolveFeatEffect first", () => {
    expect(featChoiceDescriptor("Weapon Focus")).toEqual({ type: "weapon", label: "Weapon Type" });
    expect(featChoiceDescriptor("Skill Focus")?.type).toBe("skill");
    // Greater Weapon Focus/Specialization (machine-extracted, issue #45) keep working.
    expect(featChoiceDescriptor("Greater Weapon Focus")?.type).toBe("weapon");
    expect(featChoiceDescriptor("Greater Weapon Specialization")?.type).toBe("weapon");
  });
});

// ─── featDisplayName ─────────────────────────────────────────────────────────

describe("featDisplayName", () => {
  function featIdNamed(name: string): string {
    const feat = Object.values(ref.feats).find((f) => f.name === name);
    if (!feat) throw new Error(`feat not found: ${name}`);
    return feat.id;
  }

  it("returns the bare feat name when no choice is stored", () => {
    const weaponFocus = ref.feats[featIdNamed("Weapon Focus")]!;
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [weaponFocus.id] });
    expect(featDisplayName(weaponFocus, doc, ref)).toBe("Weapon Focus");
  });

  it("appends the chosen weapon group to Weapon Focus", () => {
    const weaponFocus = ref.feats[featIdNamed("Weapon Focus")]!;
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [weaponFocus.id],
      featChoices: { [weaponFocus.id]: "Falchion" },
    });
    expect(featDisplayName(weaponFocus, doc, ref)).toBe("Weapon Focus: Falchion");
  });

  it("appends the chosen weapon group to Improved Critical (display-only)", () => {
    const improvedCritical = ref.feats[featIdNamed("Improved Critical")]!;
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 8 }],
      feats: [improvedCritical.id],
      featChoices: { [improvedCritical.id]: "Falchion" },
    });
    expect(featDisplayName(improvedCritical, doc, ref)).toBe("Improved Critical: Falchion");
  });

  it("appends the chosen skill's display name to Skill Focus", () => {
    const skillFocus = ref.feats[featIdNamed("Skill Focus")]!;
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [skillFocus.id],
      featChoices: { [skillFocus.id]: "per" },
    });
    expect(featDisplayName(skillFocus, doc, ref)).toBe("Skill Focus: Perception");
  });

  it("appends the chosen school's display name to Spell Focus", () => {
    const spellFocus = ref.feats[featIdNamed("Spell Focus")]!;
    const doc = makeDoc({
      classes: [{ tag: "wizard", level: 1 }],
      feats: [spellFocus.id],
      featChoices: { [spellFocus.id]: "evocation" },
    });
    expect(featDisplayName(spellFocus, doc, ref)).toBe("Spell Focus: Evocation");
  });

  it("falls back to the raw choiceId when it doesn't match a known option", () => {
    const skillFocus = ref.feats[featIdNamed("Skill Focus")]!;
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [skillFocus.id],
      featChoices: { [skillFocus.id]: "not-a-real-skill-id" },
    });
    expect(featDisplayName(skillFocus, doc, ref)).toBe("Skill Focus: not-a-real-skill-id");
  });

  it("returns the bare feat name for a feat with no choice descriptor at all", () => {
    const ironWill = ref.feats[featIdNamed("Iron Will")]!;
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [ironWill.id] });
    expect(featDisplayName(ironWill, doc, ref)).toBe("Iron Will");
  });
});

// ─── issue #58: repeatable feats — instance model ────────────────────────────

function featIdNamedTop(name: string): string {
  const feat = Object.values(ref.feats).find((f) => f.name === name);
  if (!feat) throw new Error(`feat not found: ${name}`);
  return feat.id;
}

describe("REPEATABLE_FEAT_SLUGS: cross-checked against the vendored feats.json", () => {
  it("every slug in the curated set names a real feat in the vendored data", () => {
    const names = new Set(Object.values(ref.feats).map((f) => f.name));
    const slugToName = new Map(
      [...names].map((n) => [
        n
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        n,
      ]),
    );
    for (const slug of REPEATABLE_FEAT_SLUGS) {
      expect(slugToName.has(slug)).toBe(true);
    }
  });

  it("isRepeatableFeat recognizes Weapon Focus, Skill Focus, Extra Rage, Improved Critical", () => {
    expect(isRepeatableFeat("Weapon Focus")).toBe(true);
    expect(isRepeatableFeat("Skill Focus")).toBe(true);
    expect(isRepeatableFeat("Extra Rage")).toBe(true);
    expect(isRepeatableFeat("Improved Critical")).toBe(true);
  });

  it("isRepeatableFeat rejects a normally-single-take feat (Iron Will) and a near-miss false positive (Combat Reflexes)", () => {
    expect(isRepeatableFeat("Iron Will")).toBe(false);
    // "Combat Reflexes"'s vendored text contains "more than once per round"
    // (limiting a rogue's opportunist ability), not a repeatability grant.
    expect(isRepeatableFeat("Combat Reflexes")).toBe(false);
  });
});

describe("addFeatInstance / removeFeatInstance (issue #58)", () => {
  it("addFeatInstance on an unowned feat adds the primary instance (same as toggleFeat's add)", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }] });
    const wfId = featIdNamedTop("Weapon Focus");
    const next = addFeatInstance(doc, wfId);
    expect(next.build.feats).toEqual([wfId]);
    expect(next.build.extraFeats).toBeUndefined();
  });

  it("addFeatInstance on an already-owned feat appends an extraFeats entry", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [wfId] });
    const next = addFeatInstance(doc, wfId);
    expect(next.build.feats).toEqual([wfId]);
    expect(next.build.extraFeats).toHaveLength(1);
    expect(next.build.extraFeats![0]!.featId).toBe(wfId);
    expect(next.build.extraFeats![0]!.choiceId).toBeUndefined();
    expect(next.build.extraFeats![0]!.instanceId).not.toBe(wfId);
  });

  it("a third addFeatInstance appends a second extraFeats entry with a distinct instance id", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [wfId] });
    doc = addFeatInstance(doc, wfId);
    doc = addFeatInstance(doc, wfId);
    expect(doc.build.extraFeats).toHaveLength(2);
    const [a, b] = doc.build.extraFeats!;
    expect(a!.instanceId).not.toBe(b!.instanceId);
  });

  it("featInstances lists the primary then every extra instance, in order", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    doc = addFeatInstance(doc, wfId);
    doc = setExtraFeatChoice(doc, doc.build.extraFeats![0]!.instanceId, "dagger");
    const instances = featInstances(doc);
    expect(instances).toHaveLength(2);
    expect(instances[0]).toEqual({
      instanceId: wfId,
      featId: wfId,
      choiceId: "longsword",
      isExtra: false,
    });
    expect(instances[1]!.choiceId).toBe("dagger");
    expect(instances[1]!.isExtra).toBe(true);
  });

  it("chosenFeatCount counts primary + every extra instance", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [wfId] });
    expect(chosenFeatCount(doc)).toBe(1);
    doc = addFeatInstance(doc, wfId);
    expect(chosenFeatCount(doc)).toBe(2);
    doc = addFeatInstance(doc, wfId);
    expect(chosenFeatCount(doc)).toBe(3);
  });

  it("removeFeatInstance with an instanceId removes only that extra instance", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    doc = addFeatInstance(doc, wfId);
    doc = setExtraFeatChoice(doc, doc.build.extraFeats![0]!.instanceId, "dagger");
    doc = addFeatInstance(doc, wfId); // a second extra instance, no choice
    const secondInstanceId = doc.build.extraFeats![0]!.instanceId;
    doc = removeFeatInstance(doc, wfId, secondInstanceId);
    // Primary + one remaining extra instance.
    expect(doc.build.feats).toEqual([wfId]);
    expect(doc.build.featChoices?.[wfId]).toBe("longsword");
    expect(doc.build.extraFeats).toHaveLength(1);
    expect(doc.build.extraFeats![0]!.choiceId).toBeUndefined();
  });

  it("removeFeatInstance without an instanceId, with no extras, behaves exactly like toggleFeat's remove (pre-#58 behavior)", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const next = removeFeatInstance(doc, wfId);
    expect(next.build.feats).not.toContain(wfId);
    expect(next.build.featChoices?.[wfId]).toBeUndefined();
  });

  it("removeFeatInstance without an instanceId, WITH extras, promotes the first extra instance into the primary slot", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    doc = addFeatInstance(doc, wfId);
    doc = setExtraFeatChoice(doc, doc.build.extraFeats![0]!.instanceId, "dagger");
    doc = addFeatInstance(doc, wfId); // second extra, no choice
    doc = removeFeatInstance(doc, wfId); // remove the primary
    // The feat is still owned (invariant: primary present iff any instance is)...
    expect(doc.build.feats).toEqual([wfId]);
    // ...and the promoted choice is the FIRST extra instance's ("dagger").
    expect(doc.build.featChoices?.[wfId]).toBe("dagger");
    // Only the second (choiceless) extra instance remains.
    expect(doc.build.extraFeats).toHaveLength(1);
    expect(doc.build.extraFeats![0]!.choiceId).toBeUndefined();
  });

  it("toggleFeat's remove branch delegates to removeFeatInstance (promotes when extras exist)", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    doc = addFeatInstance(doc, wfId);
    doc = setExtraFeatChoice(doc, doc.build.extraFeats![0]!.instanceId, "dagger");
    doc = toggleFeat(doc, wfId);
    expect(doc.build.feats).toEqual([wfId]);
    expect(doc.build.featChoices?.[wfId]).toBe("dagger");
    expect(doc.build.extraFeats).toBeUndefined();
  });

  it("chosenFeatCountExcludingGranted counts extra instances too", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({ classes: [{ tag: "fighter", level: 1 }], feats: [wfId] });
    doc = addFeatInstance(doc, wfId);
    expect(chosenFeatCountExcludingGranted(doc, ref)).toBe(2);
  });

  it("legacy doc with no extraFeats field loads and behaves identically to before issue #58", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    const legacyDoc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    // No extraFeats key at all on this doc (undefined, not []).
    expect(legacyDoc.build.extraFeats).toBeUndefined();
    expect(featInstances(legacyDoc)).toEqual([
      { instanceId: wfId, featId: wfId, choiceId: "longsword", isExtra: false },
    ]);
    expect(chosenFeatCount(legacyDoc)).toBe(1);
    // No `doc.build.weapons` set here, so the "weapon" choice picker has no
    // options to resolve against and falls back to the raw stored choiceId
    // (matches the pre-existing "falls back to the raw choiceId" behavior
    // exercised above for Skill Focus).
    expect(featDisplayName(ref.feats[wfId]!, legacyDoc, ref)).toBe("Weapon Focus: longsword");
  });
});

describe("duplicate-choice warning data (issue #58)", () => {
  it("two instances with the identical choice can be detected via featInstances (UI warns, never blocks)", () => {
    const wfId = featIdNamedTop("Weapon Focus");
    let doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    doc = addFeatInstance(doc, wfId);
    doc = setExtraFeatChoice(doc, doc.build.extraFeats![0]!.instanceId, "longsword");
    const instances = featInstances(doc);
    const choiceCounts = new Map<string, number>();
    for (const inst of instances) {
      if (inst.choiceId)
        choiceCounts.set(inst.choiceId, (choiceCounts.get(inst.choiceId) ?? 0) + 1);
    }
    expect(choiceCounts.get("longsword")).toBe(2);
    // Both instances still store their (redundant) choice — never blocked or
    // silently dropped, matching the project's hybrid soft-warning posture.
    expect(instances.every((i) => i.choiceId === "longsword")).toBe(true);
  });
});
