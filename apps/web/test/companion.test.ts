import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  addCompanionNonlethal,
  animalFocusBuffs,
  applyCompanionDamage,
  cavalierLevel,
  clearCompanion,
  deriveCompanionSheet,
  hasBoonCompanionFeat,
  healCompanion,
  healCompanionNonlethal,
  hunterLevel,
  isSharedWithCompanion,
  mountSpeciesHint,
  restCompanion,
  samuraiLevel,
  setCompanion,
  setCompanionAbilityIncrease,
  setCompanionFocus,
  setCompanionNotes,
  toggleCompanionSource,
  toggleSharedBuffCompanion,
} from "../src/model/companion.js";

const ref = loadRefData();

function druid7(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "druid");
  d = setClassLevel(d, "druid", 7);
  return d;
}

function hunter5(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "hunter");
  d = setClassLevel(d, "hunter", 5);
  return d;
}

describe("model/companion.ts transitions", () => {
  it("setCompanion sets species + name, trimming a blank name, seeding an empty source list", () => {
    const d = setCompanion(createEmptyDoc("t"), "wolf", "  Fang  ");
    expect(d.build.animalCompanion).toEqual({ speciesId: "wolf", name: "Fang", source: [] });
  });

  it("setCompanion with a blank name falls back to 'Companion'", () => {
    const d = setCompanion(createEmptyDoc("t"), "wolf", "   ");
    expect(d.build.animalCompanion?.name).toBe("Companion");
  });

  it("setCompanionNotes no-ops without a companion", () => {
    const d = createEmptyDoc("t");
    expect(setCompanionNotes(d, "hi")).toBe(d);
  });

  it("clearCompanion removes both build and live state", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = applyCompanionDamage(d, 3);
    d = clearCompanion(d);
    expect(d.build.animalCompanion).toBeUndefined();
    expect(d.live.animalCompanion).toBeUndefined();
  });

  it("applyCompanionDamage / healCompanion track a damage counter", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = applyCompanionDamage(d, 10);
    expect(d.live.animalCompanion?.damage).toBe(10);
    d = healCompanion(d, 4);
    expect(d.live.animalCompanion?.damage).toBe(6);
    d = healCompanion(d, 99);
    expect(d.live.animalCompanion?.damage).toBe(0);
  });

  it("addCompanionNonlethal / healCompanionNonlethal track nonlethal separately", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = addCompanionNonlethal(d, 4);
    expect(d.live.animalCompanion?.nonlethal).toBe(4);
    d = healCompanionNonlethal(d, 10);
    expect(d.live.animalCompanion?.nonlethal).toBe(0);
  });

  it("restCompanion clears damage and nonlethal", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = applyCompanionDamage(d, 5);
    d = addCompanionNonlethal(d, 2);
    d = restCompanion(d);
    expect(d.live.animalCompanion?.damage).toBe(0);
    expect(d.live.animalCompanion?.nonlethal).toBe(0);
  });

  it("toggleSharedBuffCompanion / isSharedWithCompanion", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    expect(isSharedWithCompanion(d, "buff-1")).toBe(false);
    d = toggleSharedBuffCompanion(d, "buff-1");
    expect(isSharedWithCompanion(d, "buff-1")).toBe(true);
    d = toggleSharedBuffCompanion(d, "buff-1");
    expect(isSharedWithCompanion(d, "buff-1")).toBe(false);
  });

  it("toggleCompanionSource seeds a default wolf companion when none exists yet", () => {
    const d = toggleCompanionSource(createEmptyDoc("t"), "nature-bond");
    expect(d.build.animalCompanion).toEqual({
      speciesId: "wolf",
      name: "Companion",
      source: ["nature-bond"],
    });
  });

  it("toggleCompanionSource toggles a source off again without losing species/name", () => {
    let d = setCompanion(createEmptyDoc("t"), "dog", "Rex");
    d = toggleCompanionSource(d, "hunters-bond");
    expect(d.build.animalCompanion?.source).toEqual(["hunters-bond"]);
    d = toggleCompanionSource(d, "hunters-bond");
    expect(d.build.animalCompanion?.source).toEqual([]);
    expect(d.build.animalCompanion?.speciesId).toBe("dog");
    expect(d.build.animalCompanion?.name).toBe("Rex");
  });

  it("toggleCompanionSource supports both sources active at once (multiclass)", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = toggleCompanionSource(d, "nature-bond");
    d = toggleCompanionSource(d, "hunters-bond");
    expect(d.build.animalCompanion?.source).toEqual(["nature-bond", "hunters-bond"]);
  });

  it("setCompanionAbilityIncrease sets a slot, padding earlier unset slots with 'str'", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = setCompanionAbilityIncrease(d, 1, "dex");
    expect(d.build.animalCompanion?.abilityIncreases).toEqual(["str", "dex"]);
  });

  it("hasBoonCompanionFeat is false when the feat isn't owned", () => {
    const d = createEmptyDoc("t");
    expect(hasBoonCompanionFeat(d, ref)).toBe(false);
  });
});

describe("deriveCompanionSheet() — wired through the normal doc model", () => {
  it("returns undefined without a companion", () => {
    const d = druid7();
    expect(deriveCompanionSheet(d, ref)).toBeUndefined();
  });

  it("returns undefined until a companion source is chosen", () => {
    let d = druid7();
    d = setCompanion(d, "wolf", "Fang");
    expect(deriveCompanionSheet(d, ref)).toBeUndefined();
  });

  it("hand-computed fixture: druid-7 wolf, HD 6, BAB +4, grown Large", () => {
    let d = druid7();
    d = setCompanion(d, "wolf", "Fang");
    d = toggleCompanionSource(d, "nature-bond");

    const companion = deriveCompanionSheet(d, ref);
    expect(companion).toBeDefined();
    expect(companion!.level).toBe(7);
    expect(companion!.hd).toBe(6);
    expect(companion!.bab).toBe(4);
    expect(companion!.size).toBe("lg");
  });
});

describe("hunter's own Animal Companion feature (issue #65, source 'hunter-companion')", () => {
  it("toggleCompanionSource('hunter-companion') seeds a companion and wires end-to-end", () => {
    let d = hunter5();
    d = setCompanion(d, "wolf", "Fang");
    d = toggleCompanionSource(d, "hunter-companion");
    expect(d.build.animalCompanion?.source).toEqual(["hunter-companion"]);

    const companion = deriveCompanionSheet(d, ref);
    expect(companion).toBeDefined();
    expect(companion!.level).toBe(5);
  });

  it("hunterLevel() reads the hunter class level, 0 for a non-hunter", () => {
    expect(hunterLevel(hunter5())).toBe(5);
    expect(hunterLevel(druid7())).toBe(0);
  });
});

describe("cavalier/samurai Mount companion source (issue #68)", () => {
  function cavalier3(): CharacterDoc {
    let d = createEmptyDoc("t");
    d = addClass(d, "cavalier");
    d = setClassLevel(d, "cavalier", 3);
    return d;
  }

  it("cavalierLevel()/samuraiLevel() read the respective class level, 0 otherwise", () => {
    expect(cavalierLevel(cavalier3())).toBe(3);
    expect(samuraiLevel(cavalier3())).toBe(0);
    expect(cavalierLevel(druid7())).toBe(0);
  });

  it("toggleCompanionSource('cavalier-mount') wires end-to-end at effective level = cavalier level", () => {
    let d = cavalier3();
    d = setCompanion(d, "horse", "Comet");
    d = toggleCompanionSource(d, "cavalier-mount");
    expect(d.build.animalCompanion?.source).toEqual(["cavalier-mount"]);

    const companion = deriveCompanionSheet(d, ref);
    expect(companion).toBeDefined();
    expect(companion!.level).toBe(3);
  });

  it("mountSpeciesHint() defaults to the Medium rider list for an unresolved/Medium race", () => {
    const d = createEmptyDoc("t");
    expect(mountSpeciesHint(d, ref)).toEqual(["horse"]);
  });
});

describe("companion Animal Focus display chip (issue #65)", () => {
  it("setCompanionFocus no-ops without a companion", () => {
    const d = createEmptyDoc("t");
    expect(setCompanionFocus(d, "some-buff-id")).toBe(d);
  });

  it("setCompanionFocus sets and clears live.animalCompanion.focusBuffId", () => {
    let d = setCompanion(createEmptyDoc("t"), "wolf", "Fang");
    d = setCompanionFocus(d, "some-buff-id");
    expect(d.live.animalCompanion?.focusBuffId).toBe("some-buff-id");
    d = setCompanionFocus(d, undefined);
    expect(d.live.animalCompanion?.focusBuffId).toBeUndefined();
  });

  it("animalFocusBuffs() returns all 12 vendored Animal Focus buffs, sorted by name", () => {
    const foci = animalFocusBuffs(ref);
    expect(foci).toHaveLength(12);
    expect(foci.map((f) => f.name)).toEqual(foci.map((f) => f.name).sort());
    expect(foci.map((f) => f.name)).toContain("Animal Focus (Bear)");
  });
});
