import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setAlignment, setClassLevel } from "../src/model/doc.js";
import {
  addEidolonEvolution,
  applyEidolonDamage,
  clearEidolon,
  deriveEidolonSheet,
  eidolonBaseAbilityScores,
  eidolonEvolutionPointsAvailable,
  eidolonEvolutionPointsSpent,
  eidolonEvolutionPoolNeedsWarning,
  eidolonFeatPrereqContext,
  eidolonHasCustomBaseAbilities,
  eidolonHasWeaponFinesse,
  eidolonSubtypeAlignmentWarning,
  eidolonSubtypeFormWarning,
  eidolonSupersedingCondition,
  hasEidolonCondition,
  healEidolon,
  healEidolonNonlethal,
  addEidolonNonlethal,
  isEidolonConditionImplied,
  isEidolonSummoned,
  isSharedWithEidolon,
  removeEidolonEvolution,
  resetEidolonBaseAbilities,
  restEidolon,
  setEidolon,
  setEidolonAbilityIncrease,
  setEidolonBaseAbility,
  setEidolonNotes,
  setEidolonSubtype,
  setEidolonSubtypeGrantChoice,
  toggleEidolonCondition,
  toggleEidolonFeat,
  toggleEidolonSummoned,
  toggleSharedBuffEidolon,
} from "../src/model/eidolon.js";

const ref = loadRefData();

function summoner7(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "summoner");
  d = setClassLevel(d, "summoner", 7);
  return d;
}

describe("model/eidolon.ts transitions", () => {
  it("setEidolon sets base form + name, trimming a blank name, and seeds an empty evolutions list", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "  Grix  ");
    expect(d.build.eidolon).toEqual({ baseForm: "biped", name: "Grix", evolutions: [] });
  });

  it("setEidolon with a blank name falls back to 'Eidolon'", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "   ");
    expect(d.build.eidolon?.name).toBe("Eidolon");
  });

  it("setEidolon preserves existing evolutions when changing the base form", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "bite");
    d = setEidolon(d, "quadruped", "Grix");
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "bite", choice: undefined }]);
  });

  it("setEidolonNotes no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonNotes(d, "hi")).toBe(d);
  });

  it("clearEidolon removes both build and live state", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 3);
    d = clearEidolon(d);
    expect(d.build.eidolon).toBeUndefined();
    expect(d.live.eidolon).toBeUndefined();
  });

  it("addEidolonEvolution appends a pick; no-ops without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(addEidolonEvolution(empty, "bite")).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "ability-increase", "str");
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "ability-increase", choice: "str" }]);
  });

  it("removeEidolonEvolution removes by index (not by id, so repeats stay unambiguous)", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "ability-increase", "str");
    d = addEidolonEvolution(d, "ability-increase", "con");
    d = removeEidolonEvolution(d, 0);
    expect(d.build.eidolon?.evolutions).toEqual([{ id: "ability-increase", choice: "con" }]);
  });

  it("removeEidolonEvolution no-ops out of range or without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(removeEidolonEvolution(empty, 0)).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonEvolution(d, "bite");
    expect(removeEidolonEvolution(d, 5)).toBe(d);
  });

  it("applyEidolonDamage / healEidolon track a damage counter", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 10);
    expect(d.live.eidolon?.damage).toBe(10);
    d = healEidolon(d, 4);
    expect(d.live.eidolon?.damage).toBe(6);
    d = healEidolon(d, 99);
    expect(d.live.eidolon?.damage).toBe(0);
  });

  it("addEidolonNonlethal / healEidolonNonlethal track nonlethal separately", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = addEidolonNonlethal(d, 4);
    expect(d.live.eidolon?.nonlethal).toBe(4);
    d = healEidolonNonlethal(d, 10);
    expect(d.live.eidolon?.nonlethal).toBe(0);
  });

  it("restEidolon clears damage and nonlethal", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = applyEidolonDamage(d, 5);
    d = addEidolonNonlethal(d, 2);
    d = restEidolon(d);
    expect(d.live.eidolon?.damage).toBe(0);
    expect(d.live.eidolon?.nonlethal).toBe(0);
  });

  it("toggleSharedBuffEidolon / isSharedWithEidolon", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(false);
    d = toggleSharedBuffEidolon(d, "buff-1");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(true);
    d = toggleSharedBuffEidolon(d, "buff-1");
    expect(isSharedWithEidolon(d, "buff-1")).toBe(false);
  });

  it("isEidolonSummoned defaults to true; toggleEidolonSummoned flips it", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(isEidolonSummoned(d)).toBe(true);
    d = toggleEidolonSummoned(d);
    expect(isEidolonSummoned(d)).toBe(false);
    d = toggleEidolonSummoned(d);
    expect(isEidolonSummoned(d)).toBe(true);
  });

  it("toggleEidolonSummoned no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(toggleEidolonSummoned(d)).toBe(d);
  });
});

describe("eidolon evolution-pool budget helpers", () => {
  it("eidolonEvolutionPointsSpent sums resolved costs, ignoring unknown ids", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    d = addEidolonEvolution(d, "bite"); // 1
    d = addEidolonEvolution(d, "ability-increase", "str"); // 2
    d = addEidolonEvolution(d, "not-a-real-evolution"); // 0
    expect(eidolonEvolutionPointsSpent(d)).toBe(3);
  });

  it("eidolonEvolutionPointsAvailable reads the progression table at the current summoner level", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    // level 7 row: evolutionPool 10.
    expect(eidolonEvolutionPointsAvailable(d)).toBe(10);
  });

  it("eidolonEvolutionPointsAvailable is 0 with no summoner levels", () => {
    const d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(eidolonEvolutionPointsAvailable(d)).toBe(0);
  });

  it("eidolonEvolutionPoolNeedsWarning flags overspend but never blocks", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    expect(eidolonEvolutionPoolNeedsWarning(d)).toBe(false);
    for (let i = 0; i < 12; i++) d = addEidolonEvolution(d, "tentacle");
    expect(eidolonEvolutionPointsSpent(d)).toBe(12);
    expect(eidolonEvolutionPoolNeedsWarning(d)).toBe(true);
  });
});

describe("derivEidolonSheet() — wired through the normal doc model", () => {
  it("returns undefined without an eidolon", () => {
    const d = summoner7();
    expect(deriveEidolonSheet(d, ref)).toBeUndefined();
  });

  it("hand-computed fixture: summoner-7 biped eidolon, HD 6, BAB +6, Medium", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");

    const eidolon = deriveEidolonSheet(d, ref);
    expect(eidolon).toBeDefined();
    expect(eidolon!.level).toBe(7);
    expect(eidolon!.hd).toBe(6);
    expect(eidolon!.bab).toBe(6);
    expect(eidolon!.size).toBe("med");
  });

  it("returns undefined for an unknown base form id", () => {
    let d = summoner7();
    d = setEidolon(d, "not-a-form", "Ghost");
    expect(deriveEidolonSheet(d, ref)).toBeUndefined();
  });
});

describe("eidolon feat investment", () => {
  const powerAttackId = Object.values(ref.feats).find((f) => f.name === "Power Attack")!.id;

  it("toggleEidolonFeat adds then removes a feat id, no-ops without an eidolon", () => {
    const empty = createEmptyDoc("t");
    expect(toggleEidolonFeat(empty, powerAttackId)).toBe(empty);

    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = toggleEidolonFeat(d, powerAttackId);
    expect(d.build.eidolon?.feats).toEqual([powerAttackId]);
    d = toggleEidolonFeat(d, powerAttackId);
    expect(d.build.eidolon?.feats).toEqual([]);
  });

  it("eidolonFeatPrereqContext checks structured prereqs against the EIDOLON's own BAB/abilities, not the summoner's", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    const eidolon = deriveEidolonSheet(d, ref)!;
    d = toggleEidolonFeat(d, powerAttackId);
    const ctx = eidolonFeatPrereqContext(d, eidolon, ref);
    expect(ctx.bab).toBe(eidolon.bab);
    expect(ctx.abilityTotals.str).toBe(eidolon.abilities.str.score);
    expect(ctx.casterLevel).toBe(0);
    expect(ctx.selectedFeats).toEqual(new Set([powerAttackId]));
  });

  it("eidolonHasWeaponFinesse reads the EIDOLON's own feats (build.eidolon.feats), not the summoner's", () => {
    const weaponFinesseId = Object.values(ref.feats).find((f) => f.name === "Weapon Finesse")!.id;
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(eidolonHasWeaponFinesse(d, ref)).toBe(false);
    d = toggleEidolonFeat(d, weaponFinesseId);
    expect(eidolonHasWeaponFinesse(d, ref)).toBe(true);
  });

  it("Weapon Finesse switches the attack roll to Dex; damage stays Str-based (issue #68)", () => {
    // summoner-1 serpentine eidolon: Str 12 (mod +1), Dex 16 (mod +3) — Dex
    // ahead of Str, so this fixture can show the swap.
    const weaponFinesseId = Object.values(ref.feats).find((f) => f.name === "Weapon Finesse")!.id;
    let d = createEmptyDoc("t");
    d = addClass(d, "summoner");
    d = setClassLevel(d, "summoner", 1);
    d = setEidolon(d, "serpentine", "Coil");

    const withoutFinesse = deriveEidolonSheet(d, ref)!;
    const biteWithout = withoutFinesse.attacks.find((a) => a.name === "Bite")!;
    // HD 1, BAB +1; Medium (size mod 0). bab(1) + strMod(1) + size(0) = 2.
    expect(biteWithout).toMatchObject({ attack: 2, damageBonus: 1 });

    d = toggleEidolonFeat(d, weaponFinesseId);
    const withFinesse = deriveEidolonSheet(d, ref)!;
    const biteWith = withFinesse.attacks.find((a) => a.name === "Bite")!;
    // bab(1) + dexMod(3) + size(0) = 4; damage stays Str-based (strMod 1).
    expect(biteWith).toMatchObject({ attack: 4, damageBonus: 1 });
  });
});

describe("eidolon's own active conditions", () => {
  it("toggleEidolonCondition no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(toggleEidolonCondition(d, "shaken")).toBe(d);
  });

  it("toggleEidolonCondition adds then removes a condition id", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    expect(hasEidolonCondition(d, "shaken")).toBe(false);
    d = toggleEidolonCondition(d, "shaken");
    expect(hasEidolonCondition(d, "shaken")).toBe(true);
    d = toggleEidolonCondition(d, "shaken");
    expect(hasEidolonCondition(d, "shaken")).toBe(false);
  });

  it("is independent of the summoner's own live.conditions", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = toggleEidolonCondition(d, "shaken");
    expect(d.live.conditions).toEqual([]);
    expect(hasEidolonCondition(d, "shaken")).toBe(true);
  });

  it("ladder auto-upgrade: activating 'frightened' (stricter) supersedes an active 'shaken' (milder)", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = toggleEidolonCondition(d, "shaken");
    d = toggleEidolonCondition(d, "frightened");
    expect(d.live.eidolon?.conditions).toEqual(["frightened"]);
    expect(isEidolonConditionImplied(d, "shaken")).toBe(true);
    expect(eidolonSupersedingCondition(d, "shaken")).toBe("frightened");
  });
});

function summonerUnchained(level: number): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "summonerUnchained");
  d = setClassLevel(d, "summonerUnchained", level);
  return d;
}

describe("model/eidolon.ts unchained subtype transitions", () => {
  it("setEidolonSubtype sets, then clears (undefined) the subtype field", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = setEidolonSubtype(d, "angel");
    expect(d.build.eidolon?.subtype).toBe("angel");
    d = setEidolonSubtype(d, undefined);
    expect(d.build.eidolon?.subtype).toBeUndefined();
  });

  it("setEidolonSubtype no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonSubtype(d, "angel")).toBe(d);
  });

  it("setEidolonAbilityIncrease sets a slot positionally, defaulting earlier unset slots to str", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = setEidolonAbilityIncrease(d, 1, "con");
    expect(d.build.eidolon?.abilityIncreases).toEqual(["str", "con"]);
    d = setEidolonAbilityIncrease(d, 0, "dex");
    expect(d.build.eidolon?.abilityIncreases).toEqual(["dex", "con"]);
  });

  it("setEidolonAbilityIncrease no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonAbilityIncrease(d, 0, "str")).toBe(d);
  });

  it("setEidolonSubtypeGrantChoice keys by grant level as a string, preserving other entries", () => {
    let d = setEidolon(createEmptyDoc("t"), "biped", "Grix");
    d = setEidolonSubtypeGrantChoice(d, 8, "cha");
    expect(d.build.eidolon?.subtypeGrantChoices).toEqual({ "8": "cha" });
    d = setEidolonSubtypeGrantChoice(d, 12, "con");
    expect(d.build.eidolon?.subtypeGrantChoices).toEqual({ "8": "cha", "12": "con" });
  });

  it("setEidolonSubtypeGrantChoice no-ops without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonSubtypeGrantChoice(d, 8, "str")).toBe(d);
  });
});

describe("eidolonEvolutionPointsAvailable — variant-aware pool math", () => {
  it("a chained summoner still reads the flat chained pool (regression guard)", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    expect(eidolonEvolutionPointsAvailable(d)).toBe(10);
  });

  it("an unchained summoner with no subtype reads the smaller unchained pool", () => {
    let d = summonerUnchained(7);
    d = setEidolon(d, "biped", "Grix");
    // Unchained pool row 7 (index 6): 6.
    expect(eidolonEvolutionPointsAvailable(d)).toBe(6);
  });

  it("Archon 4th level adds its +1 pool grant on top of the unchained base pool", () => {
    let d = summonerUnchained(4);
    d = setEidolon(d, "biped", "Grix");
    d = setEidolonSubtype(d, "archon");
    // Unchained pool row 4 (index 3): 3, plus Archon's 4th-level +1 = 4.
    expect(eidolonEvolutionPointsAvailable(d)).toBe(4);
  });

  it("a subtype's poolBonus is ignored on a CHAINED doc even if (unusually) set", () => {
    let d = summoner7();
    d = setEidolon(d, "biped", "Grix");
    d = setEidolonSubtype(d, "archon");
    // Chained pool row 7 is 10 regardless of the (meaningless, chained-side) subtype.
    expect(eidolonEvolutionPointsAvailable(d)).toBe(10);
  });
});

describe("eidolon subtype soft warnings", () => {
  it("eidolonSubtypeFormWarning is undefined with no subtype set", () => {
    const d = setEidolon(summonerUnchained(1), "biped", "Grix");
    expect(eidolonSubtypeFormWarning(d)).toBeUndefined();
  });

  it("eidolonSubtypeFormWarning is undefined when the subtype models the chosen form", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    d = setEidolonSubtype(d, "angel"); // Angel only models biped.
    expect(eidolonSubtypeFormWarning(d)).toBeUndefined();
  });

  it("eidolonSubtypeFormWarning warns when the subtype doesn't model the chosen form", () => {
    let d = setEidolon(summonerUnchained(1), "quadruped", "Grix");
    d = setEidolonSubtype(d, "angel"); // Angel only models biped, not quadruped.
    expect(eidolonSubtypeFormWarning(d)).toMatch(/Angel/);
  });

  it("eidolonSubtypeFormWarning never fires on a chained doc (subtype is meaningless there)", () => {
    let d = setEidolon(summoner7(), "quadruped", "Grix");
    d = setEidolonSubtype(d, "angel");
    expect(eidolonSubtypeFormWarning(d)).toBeUndefined();
  });

  it("eidolonSubtypeAlignmentWarning is undefined with no alignment set", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    d = setEidolonSubtype(d, "archon"); // Lawful good only.
    expect(eidolonSubtypeAlignmentWarning(d)).toBeUndefined();
  });

  it("eidolonSubtypeAlignmentWarning warns on a mismatched alignment, silent on a match", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    d = setEidolonSubtype(d, "archon"); // Lawful good only.
    d = setAlignment(d, "Chaotic Evil");
    expect(eidolonSubtypeAlignmentWarning(d)).toMatch(/Lawful good/);
    d = setAlignment(d, "Lawful Good");
    expect(eidolonSubtypeAlignmentWarning(d)).toBeUndefined();
  });

  it("eidolonSubtypeAlignmentWarning is silent on unrecognized alignment text (nothing to check against)", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    d = setEidolonSubtype(d, "archon");
    d = { ...d, identity: { ...d.identity, alignment: "???" } };
    expect(eidolonSubtypeAlignmentWarning(d)).toBeUndefined();
  });
});

describe("deriveEidolonSheet() — unchained variant/subtype fixtures", () => {
  it("Angel L1 biped: variant unchained, slam attack (not claws), pool 1, natural armor 2", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Angelic");
    d = setEidolonSubtype(d, "angel");
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.variant).toBe("unchained");
    expect(eidolon.subtypeId).toBe("angel");
    expect(eidolon.subtypeName).toBe("Angel");
    expect(eidolon.evolutionPointsAvailable).toBe(1);
    expect(eidolon.naturalArmor).toBe(2); // +2 unchained base form, +0 table at level 1.
    expect(eidolon.attacks.map((a) => a.name)).toEqual(["Slam"]);
  });

  it("Elemental (Air) L8 quadruped: pool 6+1, fly speed = land speed, bite attack", () => {
    let d = setEidolon(summonerUnchained(8), "quadruped", "Zephyr");
    d = setEidolonSubtype(d, "elemental-air");
    const eidolon = deriveEidolonSheet(d, ref)!;
    // Unchained pool row 8 (index 7): 6, plus the 4th-level +1 grant = 7.
    expect(eidolon.evolutionPointsAvailable).toBe(7);
    expect(eidolon.attacks.map((a) => a.name)).toEqual(["Bite"]);
    expect(eidolon.speeds.fly).toBe(eidolon.speeds.land);
  });

  it("Demon L12 serpentine: bite+tail slap attacks, pool 9+1, ability increases reflected in Str", () => {
    let d = setEidolon(summonerUnchained(12), "serpentine", "Fiend");
    d = setEidolonSubtype(d, "demon");
    d = setEidolonAbilityIncrease(d, 0, "str");
    d = setEidolonAbilityIncrease(d, 1, "str");
    d = setEidolonSubtypeGrantChoice(d, 12, "str");
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.attacks.map((a) => a.name)).toEqual(["Bite", "Tail slap"]);
    // Unchained pool row 12 (index 11): 9, plus Demon's 8th-level +1 = 10.
    expect(eidolon.evolutionPointsAvailable).toBe(10);
    // Serpentine Str 12 + strDexBonus(row 12 = 5) + 2 automatic increases (+1
    // each, 5th/10th) + subtype's free +2 (12th) = 12 + 5 + 1 + 1 + 2 = 21.
    expect(eidolon.abilities.str.score).toBe(21);
  });

  it("Fire Elemental L8: land speed +20 ft. over the Biped form's base 30 ft.", () => {
    let d = setEidolon(summonerUnchained(8), "biped", "Cinder");
    d = setEidolonSubtype(d, "elemental-fire");
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.speeds.land).toBe(50);
  });

  it("no subtype set: falls back to the chained form's attacks, still unchained pool", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.variant).toBe("unchained");
    expect(eidolon.subtypeId).toBeUndefined();
    expect(eidolon.grantedEvolutions).toEqual([]);
    // Falls back to the chained Biped's own baseAttacks (2 claws), not undefined.
    expect(eidolon.attacks.map((a) => a.name)).toEqual(["Claw"]);
    expect(eidolon.evolutionPointsAvailable).toBe(1);
  });

  it("a chained summoner doc still gets the chained pool (regression guard both ways)", () => {
    let d = setEidolon(summoner7(), "biped", "Grix");
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.variant).toBe("chained");
    expect(eidolon.evolutionPointsAvailable).toBe(10);
  });

  it("grant unlock gating: a grant above the current level shows unlocked: false and contributes nothing", () => {
    let d = setEidolon(summonerUnchained(1), "biped", "Grix");
    d = setEidolonSubtype(d, "archon"); // 4th-level +1 pool grant.
    const eidolon = deriveEidolonSheet(d, ref)!;
    const fourthLevelGrant = eidolon.grantedEvolutions.find((g) => g.level === 4);
    expect(fourthLevelGrant?.unlocked).toBe(false);
    // At level 1, the 4th-level pool bonus hasn't kicked in yet.
    expect(eidolon.evolutionPointsAvailable).toBe(1);
  });

  it("ability-increase slots clamp: extra abilityIncreases entries beyond unlocked slots are ignored", () => {
    let d = setEidolon(summonerUnchained(5), "biped", "Grix"); // only slot 0 (5th) unlocked
    d = setEidolonAbilityIncrease(d, 0, "dex");
    d = setEidolonAbilityIncrease(d, 1, "con"); // slot 1 (10th) not yet unlocked
    const eidolon = deriveEidolonSheet(d, ref)!;
    expect(eidolon.abilityIncreaseSlots).toBe(1);
    // Biped Dex 12 + strDexBonus(row 5 = 2) + the one unlocked +1 Dex increase = 15;
    // the ignored 2nd entry (Con) never applies.
    expect(eidolon.abilities.dex.score).toBe(15);
    expect(eidolon.abilities.con.score).toBe(13);
  });
});

describe("starting ability scores (build.eidolon.baseAbilities)", () => {
  it("defaults to the base form's own scores, with no override stored", () => {
    const d = setEidolon(summoner7(), "serpentine", "Grix");
    expect(eidolonBaseAbilityScores(d)).toEqual({
      str: 12,
      dex: 16,
      con: 13,
      int: 7,
      wis: 10,
      cha: 11,
    });
    expect(eidolonHasCustomBaseAbilities(d)).toBe(false);
  });

  it("setEidolonBaseAbility stores the override and reports it back", () => {
    let d = setEidolon(summoner7(), "biped", "Grix");
    d = setEidolonBaseAbility(d, "cha", 18);
    expect(d.build.eidolon?.baseAbilities).toEqual({ cha: 18 });
    expect(eidolonBaseAbilityScores(d).cha).toBe(18);
    expect(eidolonHasCustomBaseAbilities(d)).toBe(true);
    // the eidolon's derived sheet picks it up
    expect(deriveEidolonSheet(d, ref)!.abilities.cha).toEqual({ score: 18, mod: 4 });
  });

  it("setting a score back to the base form's default drops the override rather than pinning it", () => {
    let d = setEidolon(summoner7(), "biped", "Grix");
    d = setEidolonBaseAbility(d, "str", 18);
    d = setEidolonBaseAbility(d, "str", 16);
    expect(d.build.eidolon?.baseAbilities).toBeUndefined();
    expect(eidolonHasCustomBaseAbilities(d)).toBe(false);
  });

  it("clearing one of several overrides keeps the rest", () => {
    let d = setEidolon(summoner7(), "biped", "Grix");
    d = setEidolonBaseAbility(d, "str", 18);
    d = setEidolonBaseAbility(d, "int", 12);
    d = setEidolonBaseAbility(d, "str", undefined);
    expect(d.build.eidolon?.baseAbilities).toEqual({ int: 12 });
  });

  it("resetEidolonBaseAbilities returns the eidolon to RAW defaults", () => {
    let d = setEidolon(summoner7(), "biped", "Grix");
    d = setEidolonBaseAbility(d, "str", 20);
    d = resetEidolonBaseAbilities(d);
    expect(d.build.eidolon?.baseAbilities).toBeUndefined();
    expect(eidolonBaseAbilityScores(d).str).toBe(16);
  });

  it("both transitions no-op without an eidolon", () => {
    const d = createEmptyDoc("t");
    expect(setEidolonBaseAbility(d, "str", 18)).toBe(d);
    expect(resetEidolonBaseAbilities(d)).toBe(d);
  });
});
