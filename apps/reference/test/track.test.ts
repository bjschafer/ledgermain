import { describe, expect, test } from "bun:test";
import type { Monster } from "@pf1/schema";

import {
  clampDamage,
  DAMAGE_CAP,
  decodeTrackState,
  EMPTY_TRACK,
  encodeTrackState,
  hpStatus,
  isTrackEmpty,
} from "../src/model/track.js";

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: "m1",
    name: "Test Creature",
    uuid: "Compendium.pf1.test.Item.m1",
    cr: "1",
    ...overrides,
  };
}

describe("track state codec", () => {
  test("null, garbage, and non-object input all decode to empty", () => {
    expect(decodeTrackState(null)).toEqual(EMPTY_TRACK);
    expect(decodeTrackState("")).toEqual(EMPTY_TRACK);
    expect(decodeTrackState("{not json")).toEqual(EMPTY_TRACK);
    expect(decodeTrackState('"a string"')).toEqual(EMPTY_TRACK);
    expect(decodeTrackState("null")).toEqual(EMPTY_TRACK);
  });

  test("malformed fields collapse individually", () => {
    expect(decodeTrackState('{"damage":"seven","conditions":"dazed"}')).toEqual(EMPTY_TRACK);
    expect(decodeTrackState('{"damage":-4,"conditions":["dazed",7,null],"adjustments":5}')).toEqual(
      {
        damage: 0,
        conditions: ["dazed"],
        adjustments: [],
      },
    );
  });

  test("round-trips a real record", () => {
    const state = { damage: 17, conditions: ["dazed", "shaken"], adjustments: ["celestial"] };
    expect(decodeTrackState(encodeTrackState(state))).toEqual(state);
  });

  test("damage clamps to [0, cap] and truncates", () => {
    expect(clampDamage(-3)).toBe(0);
    expect(clampDamage(4.9)).toBe(4);
    expect(clampDamage(Number.NaN)).toBe(0);
    expect(clampDamage(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampDamage(DAMAGE_CAP + 1)).toBe(DAMAGE_CAP);
  });

  test("emptiness is all three fields at rest", () => {
    expect(isTrackEmpty(EMPTY_TRACK)).toBe(true);
    expect(isTrackEmpty({ damage: 1, conditions: [], adjustments: [] })).toBe(false);
    expect(isTrackEmpty({ damage: 0, conditions: ["prone"], adjustments: [] })).toBe(false);
    expect(isTrackEmpty({ damage: 0, conditions: [], adjustments: ["giant"] })).toBe(false);
  });
});

describe("hp status", () => {
  // CRB "Injury and Death" (pp. 189-191): disabled at exactly 0 hp, dying on
  // negatives, dead at negative hp equal to the Con score.
  const wolf = monster({ creatureType: "animal", abilityScores: { con: 15 }, hp: 13 });

  test("above zero has no status", () => {
    expect(hpStatus(wolf, 13)).toEqual({ kind: "up", text: null });
    expect(hpStatus(wolf, 1).kind).toBe("up");
  });

  test("exactly 0 is disabled, linked to the condition entry", () => {
    const status = hpStatus(wolf, 0);
    expect(status.kind).toBe("disabled");
    expect(status.conditionId).toBe("disabled");
  });

  test("negatives short of -Con are dying and name the death threshold", () => {
    const status = hpStatus(wolf, -1);
    expect(status.kind).toBe("dying");
    expect(status.conditionId).toBe("unconscious");
    expect(status.text).toContain("-15");
    expect(hpStatus(wolf, -14).kind).toBe("dying");
  });

  test("at or below -Con is dead", () => {
    expect(hpStatus(wolf, -15).kind).toBe("dead");
    expect(hpStatus(wolf, -30).kind).toBe("dead");
  });

  // Bestiary undead and construct traits: destroyed when reduced to 0 hp.
  // The nonability rule says the same for any creature with no Con score.
  test("undead, constructs, and no-Con creatures are destroyed at 0", () => {
    const skeleton = monster({ creatureType: "undead", abilityScores: {} });
    const golem = monster({ creatureType: "construct", abilityScores: {} });
    const noCon = monster({ creatureType: "outsider", abilityScores: { str: 20 } });
    for (const m of [skeleton, golem, noCon]) {
      expect(hpStatus(m, 1).kind).toBe("up");
      expect(hpStatus(m, 0).kind).toBe("destroyed");
      expect(hpStatus(m, -5).kind).toBe("destroyed");
    }
  });

  // Bestiary regeneration: the creature cannot die while its regeneration
  // functions, so a dying/dead reading carries the caveat.
  test("regeneration adds a cannot-die caveat to dying and dead readings", () => {
    const troll = monster({
      creatureType: "humanoid",
      abilityScores: { con: 23 },
      hp: 63,
      hpNote: "regeneration 5 (acid or fire)",
    });
    expect(hpStatus(troll, -5).regenerationCaveat).toBeDefined();
    expect(hpStatus(troll, -30).kind).toBe("dead");
    expect(hpStatus(troll, -30).regenerationCaveat).toBeDefined();
    expect(hpStatus(troll, 0).regenerationCaveat).toBeUndefined();
    expect(hpStatus(wolf, -5).regenerationCaveat).toBeUndefined();
  });
});
