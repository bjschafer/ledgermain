import { describe, expect, it } from "bun:test";

import { COMBAT_STANCES, COMBAT_STANCE_REFERENCE_BUFF_IDS } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import {
  activeCombatStanceId,
  activeCombatStyleTags,
  dropUnavailableCombatStyles,
  maxActiveCombatStyles,
  availableCombatStyles,
  toggleCombatStance,
  toggleCombatStyle,
} from "../src/model/combatStances.js";

function makeDoc(activeBuffs: ActiveBuff[] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-09-03T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

const fightingDefensively = COMBAT_STANCES[0]!;
const totalDefense = COMBAT_STANCES[1]!;
const charge = COMBAT_STANCES[2]!;
const ref = loadRefData();

function featId(name: string): string {
  const feat = Object.values(ref.feats).find((entry) => entry.name === name);
  if (!feat) throw new Error(`feat not found: ${name}`);
  return feat.id;
}

/** Pick a style by name, so a ranking change can't silently retarget a test. */
function style(doc: CharacterDoc, name: string) {
  const found = availableCombatStyles(doc, ref).find((entry) => entry.name === name);
  if (!found) throw new Error(`style not available: ${name}`);
  return found;
}

describe("combat stance transitions", () => {
  it("activates a stance as a self-contained live modifier", () => {
    const result = toggleCombatStance(makeDoc(), fightingDefensively);
    expect(activeCombatStanceId(result)).toBe("combatStance:fightingDefensively");
    expect(result.live.activeBuffs[0]).toMatchObject({
      effectTag: fightingDefensively.id,
      name: "Fighting Defensively",
      changes: fightingDefensively.changes,
    });
    expect(result.live.activeBuffs[0]!.changes).not.toBe(fightingDefensively.changes);
  });

  it("pressing the active stance turns it off", () => {
    const active = toggleCombatStance(makeDoc(), charge);
    const result = toggleCombatStance(active, charge);
    expect(activeCombatStanceId(result)).toBeUndefined();
    expect(result.live.activeBuffs).toEqual([]);
  });

  it("switching stance replaces the prior stance and preserves unrelated buffs", () => {
    const spellBuff: ActiveBuff = {
      instanceId: "haste-1",
      buffId: "haste",
      name: "Haste",
      changes: [{ formula: "1", target: "attack", type: "untyped" }],
    };
    const fighting = toggleCombatStance(makeDoc([spellBuff]), fightingDefensively);
    const result = toggleCombatStance(fighting, totalDefense);

    expect(activeCombatStanceId(result)).toBe("combatStance:totalDefense");
    expect(
      result.live.activeBuffs.filter((buff) => buff.effectTag?.startsWith("combatStance:")),
    ).toHaveLength(1);
    expect(result.live.activeBuffs).toContainEqual(spellBuff);
  });

  it("recognizes and replaces the older reference-buff controls instead of stacking them", () => {
    const referenceBuff: ActiveBuff = {
      instanceId: "old-fighting-defensively",
      buffId: COMBAT_STANCE_REFERENCE_BUFF_IDS["combatStance:fightingDefensively"],
      name: "Fighting Defensively",
      changes: fightingDefensively.changes,
    };
    const doc = makeDoc([referenceBuff]);
    expect(activeCombatStanceId(doc)).toBe("combatStance:fightingDefensively");

    const result = toggleCombatStance(doc, charge);
    expect(activeCombatStanceId(result)).toBe("combatStance:charge");
    expect(result.live.activeBuffs).toHaveLength(1);
    expect(result.live.activeBuffs[0]!.effectTag).toBe(charge.id);
  });

  it("Total Defense keeps its no-attacks reminder on the active instance", () => {
    const result = toggleCombatStance(makeDoc(), totalDefense);
    expect(result.live.activeBuffs[0]!.contextNotes?.[0]?.text).toContain("cannot make attacks");
  });
});

describe("combat style transitions", () => {
  it("discovers every owned Combat + Style feat from RefData and excludes other combat feats", () => {
    const base = makeDoc();
    const doc: CharacterDoc = {
      ...base,
      build: {
        ...base.build,
        feats: [featId("Crane Style"), featId("Dragon Style"), featId("Power Attack")],
      },
    };
    expect(
      availableCombatStyles(doc, ref)
        .map((entry) => entry.name)
        .sort(),
    ).toEqual(["Crane Style", "Dragon Style"]);
  });

  it("marks only the styles some available feat gates a modifier on", () => {
    const base = makeDoc();
    const doc: CharacterDoc = {
      ...base,
      // Boar Style's whole benefit is extra damage on a second unarmed strike,
      // which has no target, so it stays a reference-only chip.
      build: {
        ...base.build,
        feats: [featId("Crane Style"), featId("Boar Style")],
      },
    };
    const marked = Object.fromEntries(
      availableCombatStyles(doc, ref).map((entry) => [entry.name, entry.movesNumbers]),
    );
    expect(marked).toEqual({ "Crane Style": true, "Boar Style": false });
  });

  it("reads a style against the selected action, ranking the mechanical ones first", () => {
    const base = makeDoc();
    const withStyles: CharacterDoc = {
      ...base,
      // Boar Style sorts before Crane Style alphabetically, so Crane leading
      // can only come from the interaction ranking.
      build: { ...base.build, feats: [featId("Boar Style"), featId("Crane Style")] },
    };

    // Crane Style gates on fighting defensively and total defense, not charge,
    // so charging leaves it mechanical in general but inert right now.
    const charging = toggleCombatStance(withStyles, charge);
    const whileCharging = availableCombatStyles(charging, ref, activeCombatStanceId(charging));
    expect(whileCharging.map((style) => style.name)).toEqual(["Crane Style", "Boar Style"]);
    expect(whileCharging[0]!.appliesToActiveStance).toBe(false);

    const defending = toggleCombatStance(withStyles, fightingDefensively);
    const whileDefending = availableCombatStyles(defending, ref, activeCombatStanceId(defending));
    expect(whileDefending[0]!.name).toBe("Crane Style");
    expect(whileDefending[0]!.appliesToActiveStance).toBe(true);
    expect(whileDefending[1]!.appliesToActiveStance).toBe(false);
  });

  it("holds one style at a time, so entering another replaces it", () => {
    const base = makeDoc();
    const doc: CharacterDoc = {
      ...base,
      build: {
        ...base.build,
        feats: [featId("Crane Style"), featId("Dragon Style")],
      },
    };
    expect(maxActiveCombatStyles(doc)).toBe(1);

    const crane = style(doc, "Crane Style");
    const dragon = style(doc, "Dragon Style");
    const craneOn = toggleCombatStyle(doc, crane);
    expect(activeCombatStyleTags(craneOn)).toEqual(new Set(["combatStyle:crane-style"]));

    const dragonOn = toggleCombatStyle(craneOn, dragon);
    expect(activeCombatStyleTags(dragonOn)).toEqual(new Set(["combatStyle:dragon-style"]));

    expect(activeCombatStyleTags(toggleCombatStyle(dragonOn, dragon)).size).toBe(0);
  });

  it("raises the limit for Master of Many Styles, dropping the oldest stance past it", () => {
    const base = makeDoc();
    const moms = (level: number): CharacterDoc => ({
      ...base,
      identity: { ...base.identity, classes: [{ tag: "monk", level }] },
      build: {
        ...base.build,
        archetypes: ["monk:master-of-many-styles"],
        feats: [featId("Crane Style"), featId("Dragon Style"), featId("Snake Style")],
      },
    });

    // Fuse Style: two stances at 1st, three at 8th, four at 15th, five at 20th.
    expect([1, 8, 15, 20].map((level) => maxActiveCombatStyles(moms(level)))).toEqual([2, 3, 4, 5]);

    const doc = moms(1);
    const two = toggleCombatStyle(
      toggleCombatStyle(doc, style(doc, "Crane Style")),
      style(doc, "Dragon Style"),
    );
    expect(activeCombatStyleTags(two)).toEqual(
      new Set(["combatStyle:crane-style", "combatStyle:dragon-style"]),
    );

    // A third at 1st level pushes out Crane Style, the stance entered first.
    const three = toggleCombatStyle(two, style(doc, "Snake Style"));
    expect(activeCombatStyleTags(three)).toEqual(
      new Set(["combatStyle:dragon-style", "combatStyle:snake-style"]),
    );
  });

  it("leaves buffs that are not styles alone when the limit pushes one out", () => {
    const base = makeDoc([
      { instanceId: "spell", buffId: "some-vendored-buff", name: "Haste", changes: [] },
    ]);
    const doc: CharacterDoc = {
      ...base,
      build: {
        ...base.build,
        feats: [featId("Crane Style"), featId("Dragon Style")],
      },
    };
    const swapped = toggleCombatStyle(
      toggleCombatStyle(doc, style(doc, "Crane Style")),
      style(doc, "Dragon Style"),
    );
    expect(swapped.live.activeBuffs.map((buff) => buff.name)).toEqual(["Haste", "Dragon Style"]);
  });

  it("offers a style a brawler is borrowing through Martial Flexibility", () => {
    const base = makeDoc();
    const doc: CharacterDoc = {
      ...base,
      live: { ...base.live, martialFlexibilityFeatId: featId("Dragon Style") },
    };
    const borrowed = style(doc, "Dragon Style");
    expect(borrowed.movesNumbers).toBe(true);
    expect(activeCombatStyleTags(toggleCombatStyle(doc, borrowed))).toEqual(
      new Set(["combatStyle:dragon-style"]),
    );
  });

  it("keeps a borrowed feat that is not a Style feat out of the panel", () => {
    const base = makeDoc();
    // Giant-Killer Stance is tagged Combat only: "Stance" is in its name, not
    // its rules, and it is not a stance anyone enters.
    const doc: CharacterDoc = {
      ...base,
      live: { ...base.live, martialFlexibilityFeatId: featId("Giant-Killer Stance") },
    };
    expect(availableCombatStyles(doc, ref)).toEqual([]);
  });

  it("clears a stance whose feat the character no longer has", () => {
    const base = makeDoc();
    const borrowing: CharacterDoc = {
      ...base,
      live: { ...base.live, martialFlexibilityFeatId: featId("Dragon Style") },
    };
    const entered = toggleCombatStyle(borrowing, style(borrowing, "Dragon Style"));
    const returned: CharacterDoc = {
      ...entered,
      live: { ...entered.live, martialFlexibilityFeatId: undefined },
    };

    expect(activeCombatStyleTags(returned).size).toBe(1);
    expect(activeCombatStyleTags(dropUnavailableCombatStyles(returned, ref)).size).toBe(0);
  });

  it("leaves an owned style and every non-style buff alone when clearing stances", () => {
    const base = makeDoc([
      { instanceId: "spell", buffId: "some-vendored-buff", name: "Haste", changes: [] },
    ]);
    const doc: CharacterDoc = {
      ...base,
      build: { ...base.build, feats: [featId("Crane Style")] },
    };
    const entered = toggleCombatStyle(doc, style(doc, "Crane Style"));
    expect(dropUnavailableCombatStyles(entered, ref)).toBe(entered);
  });

  it("keeps combat action and style state on separate axes", () => {
    const base = makeDoc();
    const doc: CharacterDoc = {
      ...base,
      build: { ...base.build, feats: [featId("Crane Style")] },
    };
    const result = toggleCombatStance(
      toggleCombatStyle(doc, style(doc, "Crane Style")),
      fightingDefensively,
    );
    expect(activeCombatStyleTags(result)).toEqual(new Set(["combatStyle:crane-style"]));
    expect(activeCombatStanceId(result)).toBe("combatStance:fightingDefensively");
  });
});
