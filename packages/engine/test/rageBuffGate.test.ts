import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, RAGE_POWERS } from "../src/index.js";

/**
 * Fixture coverage for the buff-gated-changes mechanism (issue #75):
 * `Change.activeWhenBuff`, gated at collect-time by `@pf1/engine`
 * `collect.ts`'s `buffGateSatisfied`, applied to the small set of rage
 * powers promoted off `displayOnly` (see `rage-powers.ts`'s file doc
 * comment for the full promotion rationale and the two deliberately-still-
 * display-only near misses, Superstition and Raging Leaper).
 *
 * Note on scope: the original issue sketch asked for a Superstition fixture
 * ("typed as morale so it correctly does NOT stack with Rage's own morale
 * Will bonus") — Superstition was NOT promoted (its bonus is scoped to
 * saves against spells/SLAs/Su only, and the engine has no
 * "saves-vs-a-source-category" Change target — see `rage-powers.ts`'s doc
 * comment for the full honest-call writeup), so there is no live
 * Superstition Change to fixture-test here. Instead, this file covers the
 * three entries that WERE promoted (Raging Climber, Raging Swimmer, Swift
 * Foot) raging vs. not, plus a dedicated typed-stacking check (highest-wins
 * within a type, same rule Rage's own morale bonuses rely on) to prove a
 * gated Change flows through the exact same `resolveStack` pipeline as
 * every unconditional source.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffByName(name: string) {
  const entry = Object.values(ref.buffs).find((b) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry;
}

function makeDoc(over: {
  classTag: string;
  level: number;
  ragePowers?: string[];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: over.classTag, level: over.level }],
    },
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ragePowers: over.ragePowers,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

describe("rage-power while-raging buff gate (issue #75)", () => {
  it("the promoted entries' activeWhenBuff matches both real vendored Rage buff ids, not by name", () => {
    const chainedRage = buffByName("Rage");
    const unchainedRage = buffByName("Rage (Unchained)");
    // Pinned against real refdata, not hardcoded from memory — if these
    // change upstream this assertion (not just rage-powers.ts's constant)
    // will catch the drift.
    expect(chainedRage.id).toBe("UgjpRD8vtiSWRxuL");
    expect(unchainedRage.id).toBe("ciAO4KwMonUzAGY0");

    for (const id of ["ragingClimber", "ragingSwimmer", "swiftFoot"]) {
      const gate = RAGE_POWERS[id]!.changes[0]!.activeWhenBuff;
      expect(gate?.buffIds).toContain(chainedRage.id);
      expect(gate?.buffIds).toContain(unchainedRage.id);
    }
  });

  it("Superstition and Raging Leaper are deliberately left displayOnly (conditional-target near misses)", () => {
    expect(RAGE_POWERS.superstition!.displayOnly).toBe(true);
    expect(RAGE_POWERS.superstition!.changes).toEqual([]);
    expect(RAGE_POWERS.ragingLeaper!.displayOnly).toBe(true);
    expect(RAGE_POWERS.ragingLeaper!.changes).toEqual([]);
  });

  it("Raging Climber/Raging Swimmer/Swift Foot are promoted: displayOnly false, real gated Change", () => {
    for (const id of ["ragingClimber", "ragingSwimmer", "swiftFoot"]) {
      const power = RAGE_POWERS[id]!;
      expect(power.displayOnly).toBe(false);
      expect(power.changes.length).toBeGreaterThan(0);
      expect(power.changes[0]!.activeWhenBuff).toBeDefined();
    }
  });

  describe("L10 barbarian with Raging Climber, Raging Swimmer, Swift Foot known", () => {
    function doc(activeBuffs: CharacterDoc["live"]["activeBuffs"]) {
      return makeDoc({
        classTag: "barbarian",
        level: 10,
        ragePowers: ["ragingClimber", "ragingSwimmer", "swiftFoot"],
        activeBuffs,
      });
    }

    it("not raging: no rage-power skill/speed bonuses appear", () => {
      const sheet = compute(doc([]), ref);
      const baseline = compute(makeDoc({ classTag: "barbarian", level: 10 }), ref);
      expect(sheet.skills["clm"]!.total).toBe(baseline.skills["clm"]!.total);
      expect(sheet.skills["swm"]!.total).toBe(baseline.skills["swm"]!.total);
      expect(sheet.speeds.land).toBe(baseline.speeds.land);
    });

    it("raging (chained Rage buff active): all three bonuses appear at their RAW values", () => {
      const rageBuff = buffByName("Rage");
      const rageInstance = {
        instanceId: "rage-1",
        buffId: rageBuff.id,
        name: rageBuff.name,
        changes: rageBuff.changes,
      };
      const sheet = compute(doc([rageInstance]), ref);
      // Baseline is raging WITHOUT the rage powers — chained Rage's own +4
      // morale Str raises the Str mod by +2, which feeds Climb/Swim too;
      // this isolates the rage POWERS' own contribution.
      const baseline = compute(
        makeDoc({ classTag: "barbarian", level: 10, activeBuffs: [rageInstance] }),
        ref,
      );
      // Raging Climber/Raging Swimmer: enhancement bonus == barbarian level (10).
      expect(sheet.skills["clm"]!.total - baseline.skills["clm"]!.total).toBe(10);
      expect(sheet.skills["swm"]!.total - baseline.skills["swm"]!.total).toBe(10);
      // Swift Foot: flat +5 ft. enhancement to land speed.
      expect((sheet.speeds.land ?? 0) - (baseline.speeds.land ?? 0)).toBe(5);
      // Provenance: the gated change carries the rage power's own name.
      const climberComp = sheet.skills["clm"]!.components.find(
        (c) => c.source === "Raging Climber",
      );
      expect(climberComp?.value).toBe(10);
      expect(climberComp?.type).toBe("enhancement");
      expect(climberComp?.applied).toBe(true);
    });

    it("raging via the Unchained Rage buff also unlocks the same gated bonuses (shared table, either edition)", () => {
      const ucDoc: CharacterDoc = {
        ...doc([]),
        identity: { ...doc([]).identity, classes: [{ tag: "barbarianUnchained", level: 10 }] },
      };
      const rageBuff = buffByName("Rage (Unchained)");
      const raging = compute(
        {
          ...ucDoc,
          live: {
            ...ucDoc.live,
            activeBuffs: [
              {
                instanceId: "rage-1",
                buffId: rageBuff.id,
                name: rageBuff.name,
                changes: rageBuff.changes,
              },
            ],
          },
        },
        ref,
      );
      const baseline = compute(ucDoc, ref);
      expect(raging.skills["clm"]!.total - baseline.skills["clm"]!.total).toBe(10);
      expect((raging.speeds.land ?? 0) - (baseline.speeds.land ?? 0)).toBe(5);
    });

    it("a skald's Inspired Rage (effectTag, not the Rage buffId) does NOT unlock rage powers — RAW requires Master Skald", () => {
      const sheet = compute(
        doc([
          {
            instanceId: "inspired-1",
            effectTag: "ragingSong:inspiredRage",
            name: "Inspired Rage",
            changes: [],
          },
        ]),
        ref,
      );
      const baseline = compute(makeDoc({ classTag: "barbarian", level: 10 }), ref);
      expect(sheet.skills["clm"]!.total).toBe(baseline.skills["clm"]!.total);
      expect(sheet.speeds.land ?? 0).toBe(baseline.speeds.land ?? 0);
    });

    it("removing the Rage buff removes the gated bonuses again (toggle off)", () => {
      const rageBuff = buffByName("Rage");
      const raging = doc([
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ]);
      const stillRaging = compute(raging, ref);
      const noLongerRaging = compute({ ...raging, live: { ...raging.live, activeBuffs: [] } }, ref);
      expect((stillRaging.speeds.land ?? 0) - (noLongerRaging.speeds.land ?? 0)).toBe(5);
    });
  });

  describe("typed-stacking: a gated Change flows through the same highest-wins pipeline as any other source", () => {
    it("Raging Climber's gated enhancement Climb bonus does not stack with a second enhancement Climb source — highest wins, per RAW", () => {
      const rageBuff = buffByName("Rage");
      const docWithSecondSource = makeDoc({
        classTag: "barbarian",
        level: 10,
        ragePowers: ["ragingClimber"],
        activeBuffs: [
          {
            instanceId: "rage-1",
            buffId: rageBuff.id,
            name: rageBuff.name,
            changes: rageBuff.changes,
          },
          {
            instanceId: "gloves-1",
            name: "Gloves of Climbing (test fixture)",
            changes: [{ formula: "4", target: "skill.clm", type: "enhancement" }],
          },
        ],
      });
      const sheet = compute(docWithSecondSource, ref);
      // Baseline is raging-with-gloves but WITHOUT the rage power, so Rage's
      // own Str-mod contribution and the gloves cancel out of the diff.
      const baselineDoc = makeDoc({
        classTag: "barbarian",
        level: 10,
        activeBuffs: docWithSecondSource.live.activeBuffs,
      });
      const baseline = compute(baselineDoc, ref);
      // Raging Climber grants +10 (barbarian level); the fixture item only
      // grants +4 — same "enhancement" type, so the HIGHER of the two (10)
      // applies, not their sum: adding the power on top of the gloves gains
      // exactly 10 - 4 = 6, and provenance marks the gloves overridden.
      expect(sheet.skills["clm"]!.total - baseline.skills["clm"]!.total).toBe(6);
      const comps = sheet.skills["clm"]!.components;
      expect(comps.find((c) => c.source === "Raging Climber")?.applied).toBe(true);
      expect(comps.find((c) => c.source === "Gloves of Climbing (test fixture)")?.applied).toBe(
        false,
      );
    });

    it("Rage's own morale Will bonus is unaffected by (does not double with) the gated rage-power Changes", () => {
      const rageBuff = buffByName("Rage");
      const raging = makeDoc({
        classTag: "barbarian",
        level: 10,
        ragePowers: ["ragingClimber", "ragingSwimmer", "swiftFoot"],
        activeBuffs: [
          {
            instanceId: "rage-1",
            buffId: rageBuff.id,
            name: rageBuff.name,
            changes: rageBuff.changes,
          },
        ],
      });
      const withoutPowers = makeDoc({
        classTag: "barbarian",
        level: 10,
        activeBuffs: [
          {
            instanceId: "rage-1",
            buffId: rageBuff.id,
            name: rageBuff.name,
            changes: rageBuff.changes,
          },
        ],
      });
      const sheetWithPowers = compute(raging, ref);
      const sheetWithoutPowers = compute(withoutPowers, ref);
      // Rage's Will morale bonus is identical whether or not the raging
      // character also knows these gated rage powers — the two Change
      // sources target entirely different things (skills/speed vs. Will).
      expect(sheetWithPowers.saves.will.total).toBe(sheetWithoutPowers.saves.will.total);
    });
  });
});

/**
 * Fixture coverage for the #74 parity-sweep batch-1 (A-F) promotions added
 * alongside the original issue #75 three (see `rage-powers.ts`'s doc
 * comment for the full per-power promotion rationale). Beast Totem,
 * Celestial Blood, Chaos Totem, Draconic Blood, and Earth Totem use the same
 * while-raging `activeWhenBuff` gate as Raging Climber/Swimmer/Swift Foot;
 * the three Linnorm Death Curses are a NEW shape — a flat damage bonus
 * verified as unconditional (not scoped to "while raging" at all), so they
 * carry a plain ungated `Change`.
 */
describe("#74 parity sweep batch 1 (A-F): newly promoted rage powers", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(over: {
    level: number;
    ragePowers?: string[];
    activeBuffs?: CharacterDoc["live"]["activeBuffs"];
    weapons?: WeaponInstance[];
  }): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: over.level }],
      },
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers: over.ragePowers,
        weapons: over.weapons,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: over.activeBuffs ?? [],
        resources: {},
      },
    };
  }

  function raging(activeBuffs: CharacterDoc["live"]["activeBuffs"] = []) {
    const rageBuff = buffByName("Rage");
    return [
      ...activeBuffs,
      {
        instanceId: "rage-1",
        buffId: rageBuff.id,
        name: rageBuff.name,
        changes: rageBuff.changes,
      },
    ];
  }

  it("Beast Totem: +1 natural armor at 6th, +2 at 10th, only while raging", () => {
    const l6 = compute(
      makeDoc({ level: 6, ragePowers: ["beastTotem"], activeBuffs: raging() }),
      ref,
    );
    const l6Baseline = compute(makeDoc({ level: 6, activeBuffs: raging() }), ref);
    expect(l6.ac.normal - l6Baseline.ac.normal).toBe(1);

    const l10 = compute(
      makeDoc({ level: 10, ragePowers: ["beastTotem"], activeBuffs: raging() }),
      ref,
    );
    const l10Baseline = compute(makeDoc({ level: 10, activeBuffs: raging() }), ref);
    expect(l10.ac.normal - l10Baseline.ac.normal).toBe(2);

    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["beastTotem"] }), ref);
    const notRagingBaseline = compute(makeDoc({ level: 10 }), ref);
    expect(notRaging.ac.normal).toBe(notRagingBaseline.ac.normal);
  });

  it("Celestial Blood: resistance 5 to acid and cold while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["celestialBlood"], activeBuffs: raging() }),
      ref,
    );
    const acid = sheet.defenses?.resistances.find((r) => r.qualifier === "acid");
    const cold = sheet.defenses?.resistances.find((r) => r.qualifier === "cold");
    expect(acid?.total).toBe(5);
    expect(cold?.total).toBe(5);

    const notRaging = compute(makeDoc({ level: 6, ragePowers: ["celestialBlood"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "acid")).toBeUndefined();
  });

  it("Chaos Totem: +4 Escape Artist while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["chaosTotem"], activeBuffs: raging() }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 6, activeBuffs: raging() }), ref);
    expect(sheet.skills["esc"]!.total - baseline.skills["esc"]!.total).toBe(4);

    const notRaging = compute(makeDoc({ level: 6, ragePowers: ["chaosTotem"] }), ref);
    const notRagingBaseline = compute(makeDoc({ level: 6 }), ref);
    expect(notRaging.skills["esc"]!.total).toBe(notRagingBaseline.skills["esc"]!.total);
  });

  it("Draconic Blood: +1 natural armor while raging only (energy resistance is a player choice, not modeled)", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["draconicBlood"], activeBuffs: raging() }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 6, activeBuffs: raging() }), ref);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(1);
  });

  it("Earth Totem: burrow speed 20 ft. while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["earthTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.speeds.burrow).toBe(20);

    const notRaging = compute(makeDoc({ level: 6, ragePowers: ["earthTotem"] }), ref);
    expect(notRaging.speeds.burrow ?? 0).toBe(0);
  });

  it("Crag Linnorm Death Curse: +1 melee weapon damage, UNCONDITIONAL (no rage-buff gate)", () => {
    expect(RAGE_POWERS.cragLinnormDeathCurse!.changes[0]!.activeWhenBuff).toBeUndefined();
    const sword: WeaponInstance = { name: "Longsword", category: "melee", attackAbility: "str" };
    const sheet = compute(
      makeDoc({ level: 4, ragePowers: ["cragLinnormDeathCurse"], weapons: [sword] }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 4, weapons: [sword] }), ref);
    // Not raging at all — the bonus still applies, unlike every gated entry above.
    expect(sheet.attacks[0]!.damageBonus.total - baseline.attacks[0]!.damageBonus.total).toBe(1);
  });

  it("Cairn/Fjord Linnorm Death Curse also carry ungated +1 mwdamage Changes", () => {
    for (const id of ["cairnLinnormDeathCurse", "fjordLinnormDeathCurse"]) {
      const power = RAGE_POWERS[id]!;
      expect(power.displayOnly).toBe(false);
      expect(power.changes).toEqual([{ formula: "1", target: "mwdamage", type: "untyped" }]);
    }
  });
});

/**
 * Fixture coverage for the #74 parity-sweep batch-2 (G-R) promotions (see
 * `rage-powers.ts`'s doc comment for the full per-power promotion
 * rationale). Greater Chaos Totem uses the `dr.<qualifier>` shape (new for
 * this table — DR is inherently bypass-qualified, unlike a plain `dr`
 * Change); the rest are either the same `eres.<energy>`-while-raging shape
 * as Celestial Blood, the same `sensedv`-while-raging shape as
 * shifter-aspects.ts's Bat aspect (this batch's corrected understanding that
 * senses resolve highest-wins, not lowest — see the file doc comment), the
 * same enhancement-skill-while-raging shape as Raging Climber/Swimmer, or an
 * ungated flat damage Change like the other Linnorm Death Curses.
 */
describe("#74 parity sweep batch 2 (G-R): newly promoted rage powers", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(over: {
    level: number;
    ragePowers?: string[];
    activeBuffs?: CharacterDoc["live"]["activeBuffs"];
    weapons?: WeaponInstance[];
  }): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: over.level }],
      },
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers: over.ragePowers,
        weapons: over.weapons,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: over.activeBuffs ?? [],
        resources: {},
      },
    };
  }

  function raging(activeBuffs: CharacterDoc["live"]["activeBuffs"] = []) {
    const rageBuff = buffByName("Rage");
    return [
      ...activeBuffs,
      {
        instanceId: "rage-1",
        buffId: rageBuff.id,
        name: rageBuff.name,
        changes: rageBuff.changes,
      },
    ];
  }

  it("Greater Abyssal Blood: resistance 5 to acid, cold, and fire while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 10, ragePowers: ["greaterAbyssalBlood"], activeBuffs: raging() }),
      ref,
    );
    for (const qualifier of ["acid", "cold", "fire"]) {
      expect(sheet.defenses?.resistances.find((r) => r.qualifier === qualifier)?.total).toBe(5);
    }
    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["greaterAbyssalBlood"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "acid")).toBeUndefined();
  });

  it("Greater Chaos Totem: DR/lawful equal to half barbarian level, while raging only", () => {
    const l10 = compute(
      makeDoc({ level: 10, ragePowers: ["greaterChaosTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(l10.defenses?.dr.find((d) => d.qualifier === "lawful")?.total).toBe(5);

    const l20 = compute(
      makeDoc({ level: 20, ragePowers: ["greaterChaosTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(l20.defenses?.dr.find((d) => d.qualifier === "lawful")?.total).toBe(10);

    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["greaterChaosTotem"] }), ref);
    expect(notRaging.defenses?.dr.find((d) => d.qualifier === "lawful")).toBeUndefined();
  });

  it("Greater Sun Totem: fire resistance 20 while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 10, ragePowers: ["greaterSunTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(20);

    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["greaterSunTotem"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("Greater Sun Totem's fire resistance 20 beats Lesser Sun Totem's 5 when both are known (highest-wins, not summed)", () => {
    const sheet = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserSunTotem", "greaterSunTotem"],
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(20);
  });

  it("Greater Undead Blood: cold resistance 10 while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 10, ragePowers: ["greaterUndeadBlood"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(10);

    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["greaterUndeadBlood"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "cold")).toBeUndefined();
  });

  it("Infernal Blood: fire resistance 5 while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["infernalBlood"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);

    const notRaging = compute(makeDoc({ level: 6, ragePowers: ["infernalBlood"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("Lesser Sun Totem: fire resistance 5 while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 1, ragePowers: ["lesserSunTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);

    const notRaging = compute(makeDoc({ level: 1, ragePowers: ["lesserSunTotem"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("Night Vision: darkvision 60 ft. while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 1, ragePowers: ["nightVision"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);

    const notRaging = compute(makeDoc({ level: 1, ragePowers: ["nightVision"] }), ref);
    expect(notRaging.senses.find((s) => s.kind === "darkvision")).toBeUndefined();
  });

  it("Lesser Moon Totem: darkvision 30 ft. while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 1, ragePowers: ["lesserMoonTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(30);
  });

  it("Lesser Moon Totem adds its 30 ft. on top of Night Vision's 60 ft. (additive operator, senses.ts)", () => {
    // RAW: Night Vision grants darkvision 60; Lesser Moon Totem "increases
    // by 30 ft." darkvision you already have — `operator: "add"`, so 90.
    // This also regression-guards the rage-power collect loop actually
    // passing `ch.operator` through (it silently dropped it once).
    const sheet = compute(
      makeDoc({
        level: 1,
        ragePowers: ["lesserMoonTotem", "nightVision"],
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(90);
  });

  it("Raging Flyer: enhancement bonus equal to barbarian level on Fly checks, while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 10, ragePowers: ["ragingFlyer"], activeBuffs: raging() }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 10, activeBuffs: raging() }), ref);
    expect(sheet.skills["fly"]!.total - baseline.skills["fly"]!.total).toBe(10);

    const notRaging = compute(makeDoc({ level: 10, ragePowers: ["ragingFlyer"] }), ref);
    const notRagingBaseline = compute(makeDoc({ level: 10 }), ref);
    expect(notRaging.skills["fly"]!.total).toBe(notRagingBaseline.skills["fly"]!.total);
  });

  it("Ice Linnorm Death Curse: +1 melee weapon cold damage, UNCONDITIONAL (no rage-buff gate)", () => {
    expect(RAGE_POWERS.iceLinnormDeathCurse!.changes[0]!.activeWhenBuff).toBeUndefined();
    const sword: WeaponInstance = { name: "Longsword", category: "melee", attackAbility: "str" };
    const sheet = compute(
      makeDoc({ level: 4, ragePowers: ["iceLinnormDeathCurse"], weapons: [sword] }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 4, weapons: [sword] }), ref);
    expect(sheet.attacks[0]!.damageBonus.total - baseline.attacks[0]!.damageBonus.total).toBe(1);
  });
});

/**
 * Fixture coverage for the #74 parity-sweep batch-3 (S-Z) promotions,
 * closing out full vendored parity — see `rage-powers.ts`'s doc comment for
 * the full per-power promotion rationale. Sun Totem is the same
 * `eres.fire`-while-raging shape as Lesser/Greater Sun Totem; Unrestrained
 * Rage is a new shape for this table (`immEffect.paralysis`, the engine's
 * closed effect-immunity vocabulary); Taiga/Tarn/Tor Linnorm Death Curse are
 * three more ungated flat `mwdamage` Changes, same as the other Linnorm
 * Death Curses; Low-Light Vision and Scent are the legacy revisit — two
 * original-29-entry rows promoted this batch using the same
 * `sensell`/`sensesc` flag-Change shape as `vigilante-talents.ts`'s Shadow's
 * Sight and `shifter-aspects.ts`'s aspects.
 */
describe("#74 parity sweep batch 3 (S-Z): newly promoted rage powers", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(over: {
    level: number;
    ragePowers?: string[];
    activeBuffs?: CharacterDoc["live"]["activeBuffs"];
    weapons?: WeaponInstance[];
  }): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: over.level }],
      },
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers: over.ragePowers,
        weapons: over.weapons,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: over.activeBuffs ?? [],
        resources: {},
      },
    };
  }

  function raging(activeBuffs: CharacterDoc["live"]["activeBuffs"] = []) {
    const rageBuff = buffByName("Rage");
    return [
      ...activeBuffs,
      {
        instanceId: "rage-1",
        buffId: rageBuff.id,
        name: rageBuff.name,
        changes: rageBuff.changes,
      },
    ];
  }

  it("Sun Totem: fire resistance 10 while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 6, ragePowers: ["sunTotem"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(10);

    const notRaging = compute(makeDoc({ level: 6, ragePowers: ["sunTotem"] }), ref);
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("Sun Totem's fire resistance 10 sits between Lesser (5) and Greater (20) — highest-wins, not summed", () => {
    const sheet = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserSunTotem", "sunTotem"],
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(10);

    const withGreater = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserSunTotem", "sunTotem", "greaterSunTotem"],
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(withGreater.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(20);
  });

  it("Unrestrained Rage: immune to paralysis while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 12, ragePowers: ["unrestrainedRage"], activeBuffs: raging() }),
      ref,
    );
    const slugs = sheet.defenses?.effectImmunities?.map((e) => e.qualifier) ?? [];
    expect(slugs).toContain("paralysis");

    const notRaging = compute(makeDoc({ level: 12, ragePowers: ["unrestrainedRage"] }), ref);
    const notRagingSlugs = notRaging.defenses?.effectImmunities?.map((e) => e.qualifier) ?? [];
    expect(notRagingSlugs).not.toContain("paralysis");
  });

  it("Taiga/Tarn/Tor Linnorm Death Curse each carry ungated +1 mwdamage Changes", () => {
    for (const id of ["taigaLinnormDeathCurse", "tarnLinnormDeathCurse", "torLinnormDeathCurse"]) {
      const power = RAGE_POWERS[id]!;
      expect(power.displayOnly).toBe(false);
      expect(power.changes).toEqual([{ formula: "1", target: "mwdamage", type: "untyped" }]);
      expect(power.changes[0]!.activeWhenBuff).toBeUndefined();
    }
  });

  it("Tor Linnorm Death Curse: +1 melee weapon fire damage applies without raging", () => {
    const sword: WeaponInstance = { name: "Longsword", category: "melee", attackAbility: "str" };
    const sheet = compute(
      makeDoc({ level: 8, ragePowers: ["torLinnormDeathCurse"], weapons: [sword] }),
      ref,
    );
    const baseline = compute(makeDoc({ level: 8, weapons: [sword] }), ref);
    expect(sheet.attacks[0]!.damageBonus.total - baseline.attacks[0]!.damageBonus.total).toBe(1);
  });

  it("legacy revisit — Low-Light Vision: flag grant while raging only", () => {
    const sheet = compute(
      makeDoc({ level: 1, ragePowers: ["lowLightVision"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.senses.find((s) => s.kind === "lowLight")).toBeDefined();

    const notRaging = compute(makeDoc({ level: 1, ragePowers: ["lowLightVision"] }), ref);
    expect(notRaging.senses.find((s) => s.kind === "lowLight")).toBeUndefined();
  });

  it("legacy revisit — Scent: flag grant while raging only", () => {
    const sheet = compute(makeDoc({ level: 1, ragePowers: ["scent"], activeBuffs: raging() }), ref);
    expect(sheet.senses.find((s) => s.kind === "scent")).toBeDefined();

    const notRaging = compute(makeDoc({ level: 1, ragePowers: ["scent"] }), ref);
    expect(notRaging.senses.find((s) => s.kind === "scent")).toBeUndefined();
  });
});

/**
 * Choose-one rage powers (`RagePowerDef.choice`/`choiceChanges`, stored in
 * `build.pickChoices` under the declaring power's `ragePower:<id>` key):
 * Energy Resistance, Draconic Blood, and the Lesser Elemental Blood chain.
 * RAW citations live on the entries; the fixtures pin the three behaviors
 * that matter — a stored pick applies, no pick applies nothing, and chain
 * powers read the DECLARING power's key.
 */
describe("choose-one rage powers (build.pickChoices)", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(over: {
    level: number;
    ragePowers?: string[];
    pickChoices?: Record<string, string>;
    activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  }): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: over.level }],
      },
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers: over.ragePowers,
        pickChoices: over.pickChoices,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: over.activeBuffs ?? [],
        resources: {},
      },
    };
  }

  function raging() {
    const rageBuff = buffByName("Rage");
    return [
      { instanceId: "rage-1", buffId: rageBuff.id, name: rageBuff.name, changes: rageBuff.changes },
    ];
  }

  it("Energy Resistance: chosen fire resistance equal to half level (min 1), while raging only", () => {
    // RAW (aonprd.com, Advanced Player's Guide): "While raging, the
    // barbarian gains resistance to one energy type (acid, cold,
    // electricity, fire, or sonic) equal to 1/2 her barbarian level
    // (minimum 1)." — L8 → 4.
    const sheet = compute(
      makeDoc({
        level: 8,
        ragePowers: ["energyResistance"],
        pickChoices: { "ragePower:energyResistance": "fire" },
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(4);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")).toBeUndefined();

    const notRaging = compute(
      makeDoc({
        level: 8,
        ragePowers: ["energyResistance"],
        pickChoices: { "ragePower:energyResistance": "fire" },
      }),
      ref,
    );
    expect(notRaging.defenses?.resistances.find((r) => r.qualifier === "fire")).toBeUndefined();
  });

  it("Energy Resistance: level 1 floor (minimum 1) and the sonic fifth option", () => {
    const sheet = compute(
      makeDoc({
        level: 1,
        ragePowers: ["energyResistance"],
        pickChoices: { "ragePower:energyResistance": "sonic" },
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "sonic")?.total).toBe(1);
  });

  it("Energy Resistance: no stored choice applies nothing, even while raging", () => {
    const sheet = compute(
      makeDoc({ level: 8, ragePowers: ["energyResistance"], activeBuffs: raging() }),
      ref,
    );
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Draconic Blood: chosen acid resistance 5 alongside the unconditional-while-raging +1 natural armor", () => {
    const sheet = compute(
      makeDoc({
        level: 6,
        ragePowers: ["draconicBlood"],
        pickChoices: { "ragePower:draconicBlood": "acid" },
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
    const noChoice = compute(
      makeDoc({ level: 6, ragePowers: ["draconicBlood"], activeBuffs: raging() }),
      ref,
    );
    // The natural-armor half never depended on the choice.
    expect(noChoice.ac.normal).toBe(sheet.ac.normal);
    expect(noChoice.defenses?.resistances ?? []).toEqual([]);
  });

  it("Elemental Blood chain: both powers key off Lesser Elemental Blood's stored choice", () => {
    // RAW: Elemental Blood grants resistance 10 to the type chosen at
    // Lesser Elemental Blood; Greater Elemental Blood keys its movement to
    // the same pick (electricity → fly 60 ft.).
    const sheet = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserElementalBlood", "elementalBlood", "greaterElementalBlood"],
        pickChoices: { "ragePower:lesserElementalBlood": "electricity" },
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "electricity")?.total).toBe(10);
    expect(sheet.speeds.fly).toBe(60);

    const notRaging = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserElementalBlood", "elementalBlood", "greaterElementalBlood"],
        pickChoices: { "ragePower:lesserElementalBlood": "electricity" },
      }),
      ref,
    );
    expect(notRaging.speeds.fly ?? 0).toBe(0);
  });

  it("Greater Elemental Blood: fire's +30 ft. is additive to land speed (fast movement included)", () => {
    const sheet = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserElementalBlood", "greaterElementalBlood"],
        pickChoices: { "ragePower:lesserElementalBlood": "fire" },
        activeBuffs: raging(),
      }),
      ref,
    );
    const baseline = compute(
      makeDoc({
        level: 10,
        ragePowers: ["lesserElementalBlood", "greaterElementalBlood"],
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.speeds.land).toBe(baseline.speeds.land! + 30);
  });

  it("a stale option id (edited by hand, option since renamed) applies nothing", () => {
    const sheet = compute(
      makeDoc({
        level: 8,
        ragePowers: ["energyResistance"],
        pickChoices: { "ragePower:energyResistance": "force" },
        activeBuffs: raging(),
      }),
      ref,
    );
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });
});
