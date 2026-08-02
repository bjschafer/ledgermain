/**
 * Unit tests for the weapon/armor ability helpers: the +10 enhancement-
 * equivalent cap, and the shared selection helpers the builder UI drives off
 * of. Note: PF1 RAW "burst" abilities (flaming-burst/icy-burst/
 * shocking-burst) do NOT require their base energy ability (a "+1 flaming
 * burst" weapon is legal on its own) — the `requires` plumbing is exercised
 * only via `keen`/`speed`-style combinations here since no current ability
 * data declares a `requires` prerequisite.
 */
import { describe, expect, it } from "bun:test";

import type { ItemAbilityRef } from "@pf1/schema";

import {
  abilityNotes,
  abilitySelectable,
  buildAbilityCatalog,
  sanitizeAbilities,
  toggleAbilitySelection,
  totalBonusEquivalent,
} from "../src/model/abilities.js";

describe("totalBonusEquivalent()", () => {
  it("sums bonusEquivalent across ability ids", () => {
    expect(totalBonusEquivalent(["keen", "flaming"])).toBe(2); // 1 + 1
    expect(totalBonusEquivalent(["speed"])).toBe(3);
  });

  it("returns 0 for undefined or empty input", () => {
    expect(totalBonusEquivalent(undefined)).toBe(0);
    expect(totalBonusEquivalent([])).toBe(0);
  });

  it("ignores unknown ids", () => {
    expect(totalBonusEquivalent(["not-a-real-ability"])).toBe(0);
  });
});

describe("sanitizeAbilities()", () => {
  it("keeps a valid combination unchanged", () => {
    expect(sanitizeAbilities(["keen", "flaming"], 2)).toEqual(["keen", "flaming"]);
  });

  it("truncates to fit the +10 combined-bonus cap, keeping earliest first", () => {
    // keen(1) + flaming(1) = 2, but only 1 point of budget remains at enh=9.
    expect(sanitizeAbilities(["keen", "flaming"], 9)).toEqual(["keen"]);
  });

  it("keeps flaming-burst without flaming present (RAW: no base-ability prerequisite)", () => {
    expect(sanitizeAbilities(["flaming-burst"], 5)).toEqual(["flaming-burst"]);
  });

  it("keeps flaming-burst when flaming is also selected", () => {
    expect(sanitizeAbilities(["flaming", "flaming-burst"], 5)).toEqual([
      "flaming",
      "flaming-burst",
    ]);
  });

  it("keeps icy-burst without frost, and shocking-burst without shock", () => {
    expect(sanitizeAbilities(["icy-burst"], 5)).toEqual(["icy-burst"]);
    expect(sanitizeAbilities(["shocking-burst"], 5)).toEqual(["shocking-burst"]);
  });

  it("keeps flaming-burst even at minimal remaining budget", () => {
    // enh=1 leaves 9 points of budget, well within flaming-burst's cost of 2.
    expect(sanitizeAbilities(["flaming-burst"], 1)).toEqual(["flaming-burst"]);
  });

  it("truncates independently when budget can't fit both abilities", () => {
    // enh=8 leaves 2 points of budget. flaming-burst(2) is kept first (uses
    // the whole budget); flaming(1) no longer has a prerequisite relationship
    // to it, so it's simply truncated for lack of remaining budget.
    expect(sanitizeAbilities(["flaming-burst", "flaming"], 8)).toEqual(["flaming-burst"]);
  });
});

describe("abilitySelectable()", () => {
  it("is false for any ability when enhancement is 0", () => {
    expect(abilitySelectable([], "keen", 0)).toBe(false);
  });

  it("is true for a plain ability once enhancement is >= 1", () => {
    expect(abilitySelectable([], "keen", 1)).toBe(true);
  });

  it("is true for flaming-burst on its own (RAW: no base-ability prerequisite)", () => {
    expect(abilitySelectable([], "flaming-burst", 5)).toBe(true);
    expect(abilitySelectable(["flaming"], "flaming-burst", 5)).toBe(true);
  });

  it("is false when adding would exceed the +10 cap", () => {
    // enh=9 leaves 1 point of budget; speed (no prerequisite) costs 3.
    expect(abilitySelectable([], "speed", 9)).toBe(false);
  });

  it("is always true for an already-selected ability (so it can be toggled off)", () => {
    // Even though enhancement is 0 here, an already-selected ability must
    // remain clickable to deselect.
    expect(abilitySelectable(["keen"], "keen", 0)).toBe(true);
  });
});

describe("toggleAbilitySelection()", () => {
  it("adds an ability when selectable", () => {
    expect(toggleAbilitySelection([], "keen", 1)).toEqual(["keen"]);
  });

  it("is a no-op when the ability isn't selectable (enhancement 0)", () => {
    expect(toggleAbilitySelection([], "keen", 0)).toEqual([]);
  });

  it("adds flaming-burst on its own (RAW: no base-ability prerequisite)", () => {
    expect(toggleAbilitySelection([], "flaming-burst", 5)).toEqual(["flaming-burst"]);
  });

  it("is a no-op when it would exceed the +10 cap", () => {
    expect(toggleAbilitySelection(["keen"], "speed", 9)).toEqual(["keen"]); // 1 + 3 > 10 - 9
  });

  it("removes an already-selected ability", () => {
    expect(toggleAbilitySelection(["keen", "flaming"], "keen", 5)).toEqual(["flaming"]);
  });

  it("removing flaming does not cascade to flaming-burst (RAW: independent abilities)", () => {
    const selected = ["flaming", "flaming-burst"];
    expect(toggleAbilitySelection(selected, "flaming", 5)).toEqual(["flaming-burst"]);
  });

  it("leaves unrelated abilities alone when removing one with no dependents", () => {
    const selected = ["flaming", "flaming-burst", "keen"];
    expect(toggleAbilitySelection(selected, "flaming", 5)).toEqual(["flaming-burst", "keen"]);
  });
});

// ---------------------------------------------------------------------------
// buildAbilityCatalog() — merges the hand-curated table with a
// RefData.itemAbilities-shaped fixture (the real file, item-abilities.json,
// is emitted by a parallel data-pipeline change and may not exist on disk).
// ---------------------------------------------------------------------------
const FLAMING_DUP: ItemAbilityRef = {
  id: "ability:flaming",
  name: "Flaming",
  appliesTo: ["weapon"],
  bonusEquivalent: 1,
  description: "Upstream flaming prose.",
};

const GHOST_TOUCH_WEAPON: ItemAbilityRef = {
  id: "ability:ghost_touch_weapon",
  name: "Ghost Touch (weapon)",
  appliesTo: ["weapon"],
  bonusEquivalent: 1,
  description: "Upstream ghost touch (weapon) prose.",
};

const FORTIFICATION: ItemAbilityRef = {
  id: "ability:fortification",
  name: "Fortification",
  appliesTo: ["armor"],
  bonusEquivalent: 1,
  description: "Upstream fortification prose (light tier only).",
};

const SPELL_RESISTANCE: ItemAbilityRef = {
  id: "ability:spell_resistance",
  name: "Spell Resistance",
  appliesTo: ["armor", "shield"],
  bonusEquivalent: 2,
  description: "Upstream spell resistance prose (SR 13 tier only).",
};

const BANE: ItemAbilityRef = {
  id: "ability:bane",
  name: "Bane",
  appliesTo: ["weapon"],
  bonusEquivalent: 1,
  description: "Bane prose.",
};

const DANCING: ItemAbilityRef = {
  id: "ability:dancing",
  name: "Dancing",
  appliesTo: ["weapon"],
  bonusEquivalent: 4,
  description: "Dancing prose.",
};

const ENERGY_RESISTANCE: ItemAbilityRef = {
  id: "ability:energy_resistance",
  name: "Energy Resistance",
  appliesTo: ["armor", "shield"],
  price: 18000,
  description: "Energy resistance prose.",
};

function fixtureItemAbilities(): Record<string, ItemAbilityRef> {
  return {
    [FLAMING_DUP.id]: FLAMING_DUP,
    [GHOST_TOUCH_WEAPON.id]: GHOST_TOUCH_WEAPON,
    [FORTIFICATION.id]: FORTIFICATION,
    [SPELL_RESISTANCE.id]: SPELL_RESISTANCE,
    [BANE.id]: BANE,
    [DANCING.id]: DANCING,
    [ENERGY_RESISTANCE.id]: ENERGY_RESISTANCE,
  };
}

describe("buildAbilityCatalog()", () => {
  it("does not duplicate Flaming: import dropped, description grafted onto the hand-curated entry", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    const flamingMatches = options.filter((o) => o.name === "Flaming");
    expect(flamingMatches).toHaveLength(1);
    expect(flamingMatches[0]!.cost).toBe(1); // hand-curated cost, not the import's
    expect(flamingMatches[0]!.description).toBe(FLAMING_DUP.description);
  });

  it("grafts 'Ghost Touch (weapon)' onto the weapon variant only, not the armor/shield one", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    const ghostTouchOptions = options.filter((o) => o.name === "Ghost Touch");
    expect(ghostTouchOptions).toHaveLength(2);
    const weaponVariant = ghostTouchOptions.find((o) => o.appliesTo.includes("weapon"))!;
    const armorVariant = ghostTouchOptions.find((o) => o.appliesTo.includes("armor"))!;
    expect(weaponVariant.description).toBe(GHOST_TOUCH_WEAPON.description);
    expect(armorVariant.description).toBeUndefined();
  });

  it("excludes the fortification/spell-resistance imports but grafts their prose onto the tier options", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    expect(options.find((o) => o.id === "ability:fortification")).toBeUndefined();
    expect(options.find((o) => o.id === "ability:spell_resistance")).toBeUndefined();
    for (const id of ["light-fortification", "medium-fortification", "heavy-fortification"]) {
      expect(options.find((o) => o.id === id)!.description).toBe(FORTIFICATION.description);
    }
    for (const id of [
      "spell-resistance-13",
      "spell-resistance-15",
      "spell-resistance-17",
      "spell-resistance-19",
    ]) {
      expect(options.find((o) => o.id === id)!.description).toBe(SPELL_RESISTANCE.description);
    }
  });

  it("includes Bane and Dancing as new imported options, cost from bonusEquivalent", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    const bane = options.find((o) => o.id === "ability:bane")!;
    expect(bane.name).toBe("Bane");
    expect(bane.cost).toBe(1);
    const dancing = options.find((o) => o.id === "ability:dancing")!;
    expect(dancing.cost).toBe(4);
  });

  it("carries price and no cost for a gp-priced import (Energy Resistance)", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    const er = options.find((o) => o.id === "ability:energy_resistance")!;
    expect(er.price).toBe(18000);
    expect(er.cost).toBeUndefined();
  });

  it("sorts the merged catalog alphabetically by name", () => {
    const { options } = buildAbilityCatalog(fixtureItemAbilities());
    const names = options.map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("returns an info lookup keyed by imported option id only (dropped/grafted entries never appear)", () => {
    const { info } = buildAbilityCatalog(fixtureItemAbilities());
    expect(info["ability:bane"]).toEqual({ name: "Bane", cost: 1 });
    expect(info["ability:dancing"]).toEqual({ name: "Dancing", cost: 4 });
    expect(info["ability:energy_resistance"]).toEqual({ name: "Energy Resistance" });
    expect(info["ability:flaming"]).toBeUndefined();
    expect(info["ability:ghost_touch_weapon"]).toBeUndefined();
    expect(info["ability:fortification"]).toBeUndefined();
    expect(info["ability:spell_resistance"]).toBeUndefined();
  });
});

describe("hand-curated table: SR tiers, bashing, and appliesTo defaults", () => {
  it("Spell Resistance tiers exist with costs 2/3/4/5", () => {
    const { options } = buildAbilityCatalog({});
    expect(options.find((o) => o.id === "spell-resistance-13")!.cost).toBe(2);
    expect(options.find((o) => o.id === "spell-resistance-15")!.cost).toBe(3);
    expect(options.find((o) => o.id === "spell-resistance-17")!.cost).toBe(4);
    expect(options.find((o) => o.id === "spell-resistance-19")!.cost).toBe(5);
  });

  it("bashing applies to shield only (PF1 RAW), not body armor", () => {
    const { options } = buildAbilityCatalog({});
    expect(options.find((o) => o.id === "bashing")!.appliesTo).toEqual(["shield"]);
  });

  it("keen defaults to weapon-only; fortification defaults to armor+shield", () => {
    const { options } = buildAbilityCatalog({});
    expect(options.find((o) => o.id === "keen")!.appliesTo).toEqual(["weapon"]);
    expect(options.find((o) => o.id === "light-fortification")!.appliesTo).toEqual([
      "armor",
      "shield",
    ]);
  });
});

// ---------------------------------------------------------------------------
// cost math + snapshot-aware helpers, given a `WeaponInstance.abilityInfo`-
// shaped lookup (see buildAbilityCatalog()'s companion `info` return).
// ---------------------------------------------------------------------------
describe("cost math with an info snapshot", () => {
  const info = {
    "ability:dancing": { name: "Dancing", cost: 4 },
    "ability:energy_resistance": { name: "Energy Resistance" },
  };

  it("counts an imported ability's cost against the +10 cap", () => {
    expect(totalBonusEquivalent(["keen", "ability:dancing"], info)).toBe(5); // 1 + 4
  });

  it("counts a gp-priced imported ability as 0", () => {
    expect(totalBonusEquivalent(["ability:energy_resistance"], info)).toBe(0);
  });

  it("hand-curated cost wins over a conflicting info cost for the same id", () => {
    const conflicting = { keen: { name: "Keen", cost: 99 } };
    expect(totalBonusEquivalent(["keen"], conflicting)).toBe(1);
  });
});

describe("sanitizeAbilities() with an info snapshot", () => {
  const info = { "ability:dancing": { name: "Dancing", cost: 4 } };

  it("drops an over-cap imported ability when enhancement rises", () => {
    // enhancement 8 leaves budget 2; Dancing costs 4.
    expect(sanitizeAbilities(["ability:dancing"], 8, info)).toEqual([]);
  });

  it("keeps an imported ability that fits the remaining budget", () => {
    expect(sanitizeAbilities(["ability:dancing"], 5, info)).toEqual(["ability:dancing"]);
  });

  it("keeps an unknown legacy id (treated as cost 0) even with no info entry", () => {
    expect(sanitizeAbilities(["legacy-unknown-id"], 10)).toEqual(["legacy-unknown-id"]);
  });
});

describe("abilitySelectable()/toggleAbilitySelection() with info", () => {
  const info = { "ability:dancing": { name: "Dancing", cost: 4 } };

  it("an imported id is selectable only when its info entry is provided", () => {
    expect(abilitySelectable([], "ability:dancing", 1, info)).toBe(true);
    expect(abilitySelectable([], "ability:dancing", 1)).toBe(false);
  });

  it("toggles an imported ability on and off", () => {
    const added = toggleAbilitySelection([], "ability:dancing", 5, info);
    expect(added).toEqual(["ability:dancing"]);
    const removed = toggleAbilitySelection(added, "ability:dancing", 5, info);
    expect(removed).toEqual([]);
  });
});

describe("abilityNotes() with info", () => {
  const info = { "ability:dancing": { name: "Dancing", cost: 4 } };

  it("falls back to info's name with no note for an imported id", () => {
    expect(abilityNotes(["ability:dancing"], info)).toEqual([{ name: "Dancing" }]);
  });

  it("uses the hand-curated definition (name + note) when a hand-curated id is passed alongside info", () => {
    expect(abilityNotes(["keen"], info)).toEqual([{ name: "Keen", note: "doubled threat range" }]);
  });
});
