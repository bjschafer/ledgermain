/**
 * Unit tests for the Gun Training (Ultimate Combat) picker support in
 * `model/gunTraining.ts`: active-grant resolution (base vs. archetype vs.
 * suppressed), unlocked-tier counts, the option pool derived from vendored
 * weapon data, and the pick-setter transition.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData, WeaponRef } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  activeGunTrainingGrant,
  activeGunTrainingPicksGrant,
  gunTrainingOptionPool,
  pickGroupSingularLabel,
  setGunTrainingPick,
  unlockedGunTrainingPicks,
} from "../src/model/gunTraining.js";

const ref = loadRefData();

function gunslinger(level: number): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "gunslinger");
  d = setClassLevel(d, "gunslinger", level);
  return d;
}

// ---------------------------------------------------------------------------
// activeGunTrainingGrant / activeGunTrainingPicksGrant
// ---------------------------------------------------------------------------
describe("activeGunTrainingGrant()", () => {
  it("returns undefined for a class with no grant at all", () => {
    let d = createEmptyDoc("t");
    d = addClass(d, "fighter");
    expect(activeGunTrainingGrant(d, "fighter")).toBeUndefined();
  });

  it("returns the base gunslinger grant when no archetype is selected", () => {
    const d = gunslinger(5);
    const grant = activeGunTrainingGrant(d, "gunslinger");
    expect(grant).toBeDefined();
    expect(grant!.archetypeId).toBeUndefined();
    expect(grant!.scope.kind).toBe("picks");
  });

  it("returns the musket master archetype grant (groups scope) once selected", () => {
    let d = gunslinger(5);
    d = { ...d, build: { ...d.build, archetypes: ["gunslinger:musket-master"] } };
    const grant = activeGunTrainingGrant(d, "gunslinger");
    expect(grant!.archetypeId).toBe("gunslinger:musket-master");
    expect(grant!.scope.kind).toBe("groups");
  });

  it("activeGunTrainingPicksGrant is undefined once an archetype replaces the base picks grant", () => {
    let d = gunslinger(5);
    d = { ...d, build: { ...d.build, archetypes: ["gunslinger:musket-master"] } };
    expect(activeGunTrainingPicksGrant(d, "gunslinger")).toBeUndefined();
  });

  it("activeGunTrainingPicksGrant resolves the base grant for a plain gunslinger", () => {
    const d = gunslinger(9);
    const grant = activeGunTrainingPicksGrant(d, "gunslinger");
    expect(grant).toBeDefined();
    expect(grant!.scope.unlockLevels).toEqual([5, 9, 13, 17]);
  });

  it("resolves Bolt Ace as a picks-scope grant with pickGroupTag 'crossbows'", () => {
    let d = gunslinger(9);
    d = { ...d, build: { ...d.build, archetypes: ["gunslinger:bolt-ace"] } };
    const grant = activeGunTrainingPicksGrant(d, "gunslinger");
    expect(grant).toBeDefined();
    expect(grant!.scope.pickGroupTag).toBe("crossbows");
    expect(grant!.scope.unlockLevels).toEqual([5, 9, 13, 17]);
  });

  it("resolves a partial-tier archetype (Buccaneer, 13th level only)", () => {
    let d = gunslinger(13);
    d = { ...d, build: { ...d.build, archetypes: ["gunslinger:buccaneer"] } };
    expect(unlockedGunTrainingPicks(d, "gunslinger")).toBe(1);
    const grant = activeGunTrainingPicksGrant(d, "gunslinger");
    expect(grant!.scope.unlockLevels).toEqual([13]);
  });
});

// ---------------------------------------------------------------------------
// unlockedGunTrainingPicks
// ---------------------------------------------------------------------------
describe("unlockedGunTrainingPicks()", () => {
  it("is 0 below 5th level", () => {
    expect(unlockedGunTrainingPicks(gunslinger(4), "gunslinger")).toBe(0);
  });

  it("is 1 at 5th, 2 at 9th, 4 at 17th+", () => {
    expect(unlockedGunTrainingPicks(gunslinger(5), "gunslinger")).toBe(1);
    expect(unlockedGunTrainingPicks(gunslinger(8), "gunslinger")).toBe(1);
    expect(unlockedGunTrainingPicks(gunslinger(9), "gunslinger")).toBe(2);
    expect(unlockedGunTrainingPicks(gunslinger(17), "gunslinger")).toBe(4);
    expect(unlockedGunTrainingPicks(gunslinger(20), "gunslinger")).toBe(4);
  });

  it("is 0 for a class with no active picks grant (e.g. no class levels at all)", () => {
    expect(unlockedGunTrainingPicks(createEmptyDoc("t"), "gunslinger")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// gunTrainingOptionPool
// ---------------------------------------------------------------------------
describe("gunTrainingOptionPool()", () => {
  it("returns distinct WeaponRef.group slugs for real vendored firearms", () => {
    const pool = gunTrainingOptionPool(ref);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool).toContain("revolver");
    // Sorted.
    expect(pool).toEqual([...pool].sort());
    // No duplicates.
    expect(new Set(pool).size).toBe(pool.length);
  });

  it("excludes non-firearm weapon groups", () => {
    const pool = gunTrainingOptionPool(ref);
    expect(pool).not.toContain("longsword");
  });

  it("draws from a different pickGroupTag (Bolt Ace's 'crossbows')", () => {
    const pool = gunTrainingOptionPool(ref, "crossbows");
    expect(pool).toContain("hand-crossbow");
    expect(pool).not.toContain("revolver");
  });

  it("works against a small fake RefData, matching normalized weaponGroups tags", () => {
    const fake = {
      weapons: {
        a: {
          id: "a",
          name: "Test Pistol",
          group: "test-pistol",
          weaponGroups: ["firearmsOneHanded"],
          category: "ranged",
          attackAbility: "dex",
          proficiency: "exotic",
        } as unknown as WeaponRef,
        b: {
          id: "b",
          name: "Test Sword",
          group: "test-sword",
          weaponGroups: ["bladesHeavy"],
          category: "melee",
          attackAbility: "str",
          proficiency: "martial",
        } as unknown as WeaponRef,
      },
    } as unknown as RefData;
    // "firearmsOneHanded" normalizes to "firearms-one-handed", not "firearms" —
    // the default pool tag only matches a weapon tagged with the base "firearms"
    // group, which every vendored firearm also carries alongside its subgroup.
    expect(gunTrainingOptionPool(fake, "firearms")).toEqual([]);
    expect(gunTrainingOptionPool(fake, "firearmsOneHanded")).toEqual(["test-pistol"]);
  });
});

// ---------------------------------------------------------------------------
// pickGroupSingularLabel
// ---------------------------------------------------------------------------
describe("pickGroupSingularLabel()", () => {
  it("singularizes a plural tag", () => {
    expect(pickGroupSingularLabel("firearms")).toBe("firearm");
    expect(pickGroupSingularLabel("crossbows")).toBe("crossbow");
  });

  it("returns a tag unchanged when it doesn't end in 's'", () => {
    expect(pickGroupSingularLabel("close")).toBe("close");
  });
});

// ---------------------------------------------------------------------------
// setGunTrainingPick
// ---------------------------------------------------------------------------
describe("setGunTrainingPick()", () => {
  it("sets a pick at the given tier for the given class", () => {
    const d = setGunTrainingPick(createEmptyDoc("t"), "gunslinger", 0, "revolver");
    expect(d.build.gunTrainingPicks).toEqual({ gunslinger: ["revolver"] });
  });

  it("fills gaps with empty strings when setting a later tier first", () => {
    const d = setGunTrainingPick(createEmptyDoc("t"), "gunslinger", 2, "musket");
    expect(d.build.gunTrainingPicks!.gunslinger).toEqual(["", "", "musket"]);
  });

  it("clears a pick and trims trailing empty slots", () => {
    let d = setGunTrainingPick(createEmptyDoc("t"), "gunslinger", 0, "revolver");
    d = setGunTrainingPick(d, "gunslinger", 1, "musket");
    d = setGunTrainingPick(d, "gunslinger", 1, null);
    expect(d.build.gunTrainingPicks!.gunslinger).toEqual(["revolver"]);
  });

  it("drops the class entry entirely once its array is empty", () => {
    let d = setGunTrainingPick(createEmptyDoc("t"), "gunslinger", 0, "revolver");
    d = setGunTrainingPick(d, "gunslinger", 0, "");
    expect(d.build.gunTrainingPicks).toBeUndefined();
  });

  it("keeps separate classes' picks independent", () => {
    let d = setGunTrainingPick(createEmptyDoc("t"), "gunslinger", 0, "revolver");
    d = setGunTrainingPick(d, "otherClass", 0, "musket");
    expect(d.build.gunTrainingPicks).toEqual({
      gunslinger: ["revolver"],
      otherClass: ["musket"],
    });
  });

  it("does not mutate the original doc", () => {
    const d = createEmptyDoc("t");
    setGunTrainingPick(d, "gunslinger", 0, "revolver");
    expect(d.build.gunTrainingPicks).toBeUndefined();
  });

  it("is a no-op for a negative tier index", () => {
    const d = createEmptyDoc("t");
    expect(setGunTrainingPick(d, "gunslinger", -1, "revolver")).toBe(d);
  });
});
