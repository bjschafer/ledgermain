/**
 * Unit tests for weapon doc transitions (addWeapon, updateWeapon, replaceWeapon,
 * removeWeapon) and the weapon-group choice option selector
 * (featChoiceOptions "weapon" type).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  addWeapon,
  addWeaponFromRef,
  createEmptyDoc,
  removeWeapon,
  replaceWeapon,
  updateWeapon,
} from "../src/model/doc.js";
import { featChoiceOptions } from "../src/model/feats.js";

const ref = loadRefData();

function doc(): CharacterDoc {
  return createEmptyDoc("t");
}

const LONGSWORD: WeaponInstance = {
  name: "Longsword",
  attackAbility: "str",
  damageDice: "1d8",
  group: "longsword",
  category: "melee",
};

const SHORTBOW: WeaponInstance = {
  name: "Shortbow",
  attackAbility: "dex",
  damageAbility: "none",
  damageDice: "1d6",
  group: "shortbow",
  category: "ranged",
};

// ---------------------------------------------------------------------------
// addWeapon
// ---------------------------------------------------------------------------
describe("addWeapon()", () => {
  it("appends a weapon to an empty weapons list", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(d.build.weapons).toHaveLength(1);
    expect(d.build.weapons![0]).toEqual(LONGSWORD);
  });

  it("appends when build.weapons is undefined (back-compat)", () => {
    // createEmptyDoc does not set build.weapons.
    const d = doc();
    expect(d.build.weapons).toBeUndefined();
    const next = addWeapon(d, LONGSWORD);
    expect(next.build.weapons).toHaveLength(1);
  });

  it("appends a second weapon after the first", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = addWeapon(d, SHORTBOW);
    expect(d.build.weapons).toHaveLength(2);
    expect(d.build.weapons![0]!.name).toBe("Longsword");
    expect(d.build.weapons![1]!.name).toBe("Shortbow");
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addWeapon(d, LONGSWORD);
    expect(d.build.weapons).toBeUndefined();
  });

  it("allows adding the same weapon template more than once", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = addWeapon(d, LONGSWORD);
    expect(d.build.weapons).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// updateWeapon
// ---------------------------------------------------------------------------
describe("updateWeapon()", () => {
  it("applies a partial patch to the weapon at the given index", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = updateWeapon(d, 0, { name: "Longsword +2", enhancement: 2 });
    expect(d.build.weapons![0]!.name).toBe("Longsword +2");
    expect(d.build.weapons![0]!.enhancement).toBe(2);
    // Other fields unchanged.
    expect(d.build.weapons![0]!.damageDice).toBe("1d8");
    expect(d.build.weapons![0]!.group).toBe("longsword");
  });

  it("only modifies the weapon at the specified index", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = addWeapon(d, SHORTBOW);
    d = updateWeapon(d, 0, { name: "Magic Longsword" });
    expect(d.build.weapons![0]!.name).toBe("Magic Longsword");
    expect(d.build.weapons![1]!.name).toBe("Shortbow");
  });

  it("is a no-op for an out-of-range index (positive)", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(updateWeapon(d, 5, { name: "Ghost" })).toBe(d);
  });

  it("is a no-op for an out-of-range index (negative)", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(updateWeapon(d, -1, { name: "Ghost" })).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addWeapon(doc(), LONGSWORD);
    updateWeapon(d, 0, { name: "Changed" });
    expect(d.build.weapons![0]!.name).toBe("Longsword");
  });

  it("clamps enhancement to [0, 10] on update", () => {
    const d = addWeapon(doc(), LONGSWORD);
    const updated = updateWeapon(d, 0, { enhancement: 99 });
    expect(updated.build.weapons![0]!.enhancement).toBe(10);
  });

  it("drops abilities when enhancement is patched down to 0", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = updateWeapon(d, 0, { enhancement: 1, abilities: ["keen"] });
    expect(d.build.weapons![0]!.abilities).toEqual(["keen"]);
    d = updateWeapon(d, 0, { enhancement: 0 });
    expect(d.build.weapons![0]!.abilities).toBeUndefined();
  });

  it("drops masterwork once enhancement is patched to a positive value", () => {
    let d = addWeapon(doc(), { ...LONGSWORD, masterwork: true });
    expect(d.build.weapons![0]!.masterwork).toBe(true);
    d = updateWeapon(d, 0, { enhancement: 1 });
    expect(d.build.weapons![0]!.masterwork).toBeUndefined();
  });

  it("truncates abilities to stay within the +10 combined-bonus cap", () => {
    let d = addWeapon(doc(), { ...LONGSWORD, enhancement: 9 });
    d = updateWeapon(d, 0, { abilities: ["keen", "flaming"] });
    expect(d.build.weapons![0]!.abilities).toEqual(["keen"]);
  });
});

// ---------------------------------------------------------------------------
// replaceWeapon
// ---------------------------------------------------------------------------
describe("replaceWeapon()", () => {
  it("wholesale-replaces the weapon at the given index", () => {
    const d = replaceWeapon(addWeapon(doc(), LONGSWORD), 0, SHORTBOW);
    expect(d.build.weapons![0]).toEqual(SHORTBOW);
  });

  it("regression: reverting enhancement back to 0 actually clears it (the edit-form bug)", () => {
    // The edit form omits `enhancement` from its saved object once it's 0
    // (doc minimalism). updateWeapon's merge-patch semantics would then
    // treat that omission as "leave unchanged" and keep the stale +1.
    // replaceWeapon must not have that problem.
    let d = addWeapon(doc(), { ...LONGSWORD, enhancement: 1 });
    expect(d.build.weapons![0]!.enhancement).toBe(1);
    const edited: WeaponInstance = { ...LONGSWORD }; // no `enhancement` key at all
    d = replaceWeapon(d, 0, edited);
    expect(d.build.weapons![0]!.enhancement).toBeUndefined();
  });

  it("same regression for material/abilities/masterwork reverting to their defaults", () => {
    let d = addWeapon(doc(), {
      ...LONGSWORD,
      enhancement: 1,
      material: "silver",
      abilities: ["keen"],
    });
    const edited: WeaponInstance = { ...LONGSWORD, enhancement: 1 }; // material/abilities dropped
    d = replaceWeapon(d, 0, edited);
    expect(d.build.weapons![0]!.material).toBeUndefined();
    expect(d.build.weapons![0]!.abilities).toBeUndefined();
  });

  it("still runs the replacement through normalizeWeaponInstance's invariants", () => {
    const d = replaceWeapon(addWeapon(doc(), LONGSWORD), 0, {
      ...LONGSWORD,
      enhancement: 99,
      masterwork: true,
    });
    const w = d.build.weapons![0]!;
    expect(w.enhancement).toBe(10); // clamped
    expect(w.masterwork).toBeUndefined(); // dropped: enhancement > 0
  });

  it("is a no-op for an out-of-range index", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(replaceWeapon(d, 5, SHORTBOW)).toBe(d);
    expect(replaceWeapon(d, -1, SHORTBOW)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addWeapon(doc(), LONGSWORD);
    replaceWeapon(d, 0, SHORTBOW);
    expect(d.build.weapons![0]!.name).toBe("Longsword");
  });
});

// ---------------------------------------------------------------------------
// removeWeapon
// ---------------------------------------------------------------------------
describe("removeWeapon()", () => {
  it("removes the weapon at the given index", () => {
    const d = removeWeapon(addWeapon(doc(), LONGSWORD), 0);
    expect(d.build.weapons).toHaveLength(0);
  });

  it("removes only the specified weapon when multiple exist", () => {
    let d = addWeapon(doc(), LONGSWORD);
    d = addWeapon(d, SHORTBOW);
    d = removeWeapon(d, 0);
    expect(d.build.weapons).toHaveLength(1);
    expect(d.build.weapons![0]!.name).toBe("Shortbow");
  });

  it("is a no-op for an out-of-range index (positive)", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(removeWeapon(d, 5)).toBe(d);
  });

  it("is a no-op for an out-of-range index (negative)", () => {
    const d = addWeapon(doc(), LONGSWORD);
    expect(removeWeapon(d, -1)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addWeapon(doc(), LONGSWORD);
    removeWeapon(d, 0);
    expect(d.build.weapons).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// featChoiceOptions("weapon", refData, doc)
// ---------------------------------------------------------------------------
describe("featChoiceOptions weapon type", () => {
  it("returns empty when no weapons are present", () => {
    const opts = featChoiceOptions("weapon", ref, doc());
    expect(opts).toHaveLength(0);
  });

  it("returns empty when weapons have no group set", () => {
    const noGroup: WeaponInstance = { name: "Improvised", attackAbility: "str" };
    const d = addWeapon(doc(), noGroup);
    expect(featChoiceOptions("weapon", ref, d)).toHaveLength(0);
  });

  it("returns the distinct group label for a single weapon", () => {
    const d = addWeapon(doc(), LONGSWORD);
    const opts = featChoiceOptions("weapon", ref, d);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toEqual({ id: "longsword", name: "longsword" });
  });

  it("deduplicates groups when two weapons share the same group", () => {
    let d = addWeapon(doc(), LONGSWORD);
    const longsword2: WeaponInstance = { ...LONGSWORD, name: "Longsword (backup)" };
    d = addWeapon(d, longsword2);
    const opts = featChoiceOptions("weapon", ref, d);
    expect(opts).toHaveLength(1);
    expect(opts[0]!.id).toBe("longsword");
  });

  it("returns all distinct groups sorted alphabetically", () => {
    let d = addWeapon(doc(), SHORTBOW); // "shortbow" first in doc order
    d = addWeapon(d, LONGSWORD); // "longsword" second
    const opts = featChoiceOptions("weapon", ref, d);
    expect(opts).toHaveLength(2);
    // Alphabetical: longsword < shortbow
    expect(opts[0]!.id).toBe("longsword");
    expect(opts[1]!.id).toBe("shortbow");
  });

  it("ignores weapons with an empty or whitespace-only group", () => {
    const blankGroup: WeaponInstance = { ...LONGSWORD, group: "" };
    const d = addWeapon(doc(), blankGroup);
    expect(featChoiceOptions("weapon", ref, d)).toHaveLength(0);
  });

  it("returns empty when doc is not provided (defensive)", () => {
    // Calling without doc should not crash.
    expect(featChoiceOptions("weapon", ref)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addWeaponFromRef (Stage 8 — weapon picker)
// ---------------------------------------------------------------------------
const longswordRef = Object.values(ref.weapons).find((w) => w.name === "Longsword")!;
const greatswordRef = Object.values(ref.weapons).find((w) => w.name === "Greatsword")!;
const compositeLongbowRef = Object.values(ref.weapons).find((w) => w.name === "Composite Longbow")!;

describe("addWeaponFromRef()", () => {
  it("snapshots a mundane Longsword (no enhancement; crit range 19 stored, default ×2 omitted)", () => {
    const d = addWeaponFromRef(doc(), longswordRef);
    expect(d.build.weapons).toHaveLength(1);
    const w = d.build.weapons![0]!;
    expect(w).toEqual({
      name: "Longsword",
      attackAbility: "str",
      damageAbility: "str",
      category: "melee",
      damageDice: "1d8",
      critRange: 19, // 19 ≠ default 20 → stored
      group: "longsword",
      weaponGroups: ["blades-heavy"], // normalized from vendored "bladesHeavy" (issue #45)
      weaponId: longswordRef.id,
      weight: longswordRef.weight,
    } satisfies WeaponInstance);
    // crit ×2 is the default → omitted for doc minimalism.
    expect(w.critMult).toBeUndefined();
    expect(w.enhancement).toBeUndefined();
  });

  it("applies a +3 enhancement: name suffix, enhancement field set", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 3);
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Longsword +3");
    expect(w.enhancement).toBe(3);
    expect(w.weaponId).toBe(longswordRef.id);
  });

  it("omits critMult when it equals the default (2)", () => {
    // Longsword is ×2 — the default — so the field is omitted for doc minimalism.
    const d = addWeaponFromRef(doc(), longswordRef);
    expect(d.build.weapons![0]!.critMult).toBeUndefined();
  });

  it("keeps critMult=3 for a Composite Longbow (non-default)", () => {
    const d = addWeaponFromRef(doc(), compositeLongbowRef);
    const w = d.build.weapons![0]!;
    expect(w.critMult).toBe(3);
    expect(w.critRange).toBeUndefined(); // 20 is the default
    expect(w.category).toBe("ranged");
    expect(w.attackAbility).toBe("dex");
    expect(w.damageAbility).toBe("str"); // composite bows add STR to damage
  });

  it("records damageMultiplier=1.5 for a two-handed Greatsword", () => {
    const d = addWeaponFromRef(doc(), greatswordRef);
    const w = d.build.weapons![0]!;
    expect(w.damageMultiplier).toBe(1.5);
    expect(w.damageDice).toBe("2d6");
    expect(w.critRange).toBe(19);
  });

  it("clamps enhancement to [0, 10] and floors negatives to 0", () => {
    const d = addWeaponFromRef(doc(), longswordRef, -5);
    expect(d.build.weapons![0]!.enhancement).toBeUndefined();
    expect(d.build.weapons![0]!.name).toBe("Longsword");
    // Sanity: a high enhancement still applies.
    const d2 = addWeaponFromRef(doc(), longswordRef, 7);
    expect(d2.build.weapons![0]!.enhancement).toBe(7);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addWeaponFromRef(d, longswordRef, 1);
    expect(d.build.weapons).toBeUndefined();
  });

  it("the snapshotted weapon still routes through the engine's group target", () => {
    // featChoiceOptions reads w.group to populate the Weapon Focus choice list;
    // a Longsword selected from ref should surface "longsword" there.
    const d = addWeaponFromRef(doc(), longswordRef);
    const opts = featChoiceOptions("weapon", ref, d);
    expect(opts).toContainEqual({ id: "longsword", name: "longsword" });
  });

  it("applies a material prefix to the display name (silver +1 longsword)", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 1, "silver");
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Alchemical Silver Longsword +1");
    expect(w.material).toBe("silver");
  });

  it("combines material + enhancement: 'Mithral Greatsword +3'", () => {
    const d = addWeaponFromRef(doc(), greatswordRef, 3, "mithral");
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Mithral Greatsword +3");
    expect(w.material).toBe("mithral");
    // mithral is display-only for weapons (no stat modifiers the engine tracks)
    expect(w.damageDice).toBe("2d6");
    expect(w.damageMultiplier).toBe(1.5);
  });

  it("steel material is the default (no prefix, no material field)", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 0, "steel");
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Longsword");
    expect(w.material).toBeUndefined();
  });

  it("keen doubles the crit range: longsword 19→17 (requires +1 enhancement)", () => {
    // Longsword base critRange is 19 (threat 19-20). Keen doubles to 17-20.
    const d = addWeaponFromRef(doc(), longswordRef, 1, "steel", ["keen"]);
    const w = d.build.weapons![0]!;
    expect(w.critRange).toBe(17);
    expect(w.abilities).toEqual(["keen"]);
  });

  it("keen on a default-threat weapon (20) yields 19", () => {
    // A weapon with critRange 20 (threat 20 only). Keen → 19-20.
    const d = addWeaponFromRef(doc(), greatswordRef, 1, "steel", ["keen"]);
    // Greatsword base critRange is 19 (from the refdata), not 20.
    // So keen gives 2*19-21 = 17.
    expect(d.build.weapons![0]!.critRange).toBe(17);
  });

  it("special abilities require enhancement >= 1: dropped (and not applied) at +0", () => {
    // PF1 magic item rules: a special ability can't be added to a weapon
    // with no enhancement bonus. Keen's crit-range effect must not apply either.
    const d = addWeaponFromRef(doc(), longswordRef, 0, "steel", ["keen"]);
    const w = d.build.weapons![0]!;
    expect(w.abilities).toBeUndefined();
    expect(w.critRange).toBe(19); // unchanged base threat, not doubled
  });

  it("flaming is display-only (no stat change, stored in abilities)", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 1, "steel", ["flaming"]);
    const w = d.build.weapons![0]!;
    expect(w.abilities).toEqual(["flaming"]);
    // critRange unchanged (flaming doesn't modify it)
    expect(w.critRange).toBe(19);
  });

  it("combines keen + flaming + enhancement + material", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 2, "mithral", ["keen", "flaming"]);
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Mithral Longsword +2");
    expect(w.enhancement).toBe(2);
    expect(w.material).toBe("mithral");
    expect(w.abilities).toEqual(["keen", "flaming"]);
    expect(w.critRange).toBe(17); // keen: 2*19-21 = 17
    expect(w.damageDice).toBe("1d8");
  });

  it("no abilities → no abilities field on the doc", () => {
    const d = addWeaponFromRef(doc(), longswordRef);
    expect(d.build.weapons![0]!.abilities).toBeUndefined();
  });

  it("masterwork on a +0 weapon: name prefix and flag set", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 0, "steel", undefined, true);
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Masterwork Longsword");
    expect(w.masterwork).toBe(true);
    expect(w.enhancement).toBeUndefined();
  });

  it("masterwork is dropped once enhancement is positive (implied by the magic bonus)", () => {
    const d = addWeaponFromRef(doc(), longswordRef, 1, "steel", undefined, true);
    const w = d.build.weapons![0]!;
    expect(w.name).toBe("Longsword +1");
    expect(w.masterwork).toBeUndefined();
  });

  it("caps enhancement + abilities' combined bonus-equivalent at +10", () => {
    // keen (+1) and flaming (+1) cost 2 total; only 1 point of budget remains at +9.
    const d = addWeaponFromRef(doc(), longswordRef, 9, "steel", ["keen", "flaming"]);
    const w = d.build.weapons![0]!;
    expect(w.enhancement).toBe(9);
    expect(w.abilities).toEqual(["keen"]);
  });
});
