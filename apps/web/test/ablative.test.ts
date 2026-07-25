import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import { consumePools, livePools, poolCapacity } from "../src/model/ablative.js";
import { hasNoModeledEffect, makeActiveBuff } from "../src/model/buffs.js";

function doc(activeBuffs: ActiveBuff[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "t",
    ownerId: "o",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "T", race: "human", classes: [{ tag: "wizard", level: 10 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: { hp: { current: 0, temp: 0, nonlethal: 0 }, conditions: [], activeBuffs, resources: {} },
  };
}

/** Vendored buff ids the instance-state catalog is keyed on. */
const IDS = {
  Stoneskin: "dYMrU01t5FNMgNra",
  "Protection From Energy": "p2JgcKLVXMawO3uL",
  "Resist Energy": "H9Qopdm0LVhvA4Pm",
  Resistance: "W9TR1oh1KpDxOKr1",
  Barkskin: "not-a-catalogued-buff",
} as const;

function buff(name: keyof typeof IDS, extra: Partial<ActiveBuff> = {}): ActiveBuff {
  return { instanceId: `inst-${name}`, buffId: IDS[name], name, changes: [], ...extra };
}

describe("pool capacity is derived from caster level, never stored", () => {
  it("stoneskin absorbs 10 per caster level, capped at 150", () => {
    expect(poolCapacity(buff("Stoneskin", { casterLevel: 7 }), 1)).toBe(70);
    expect(poolCapacity(buff("Stoneskin", { casterLevel: 15 }), 1)).toBe(150);
    expect(poolCapacity(buff("Stoneskin", { casterLevel: 20 }), 1)).toBe(150);
  });

  it("protection from energy absorbs 12 per caster level, capped at 120", () => {
    // The vendored description says 10/level; the published spell says 12.
    expect(poolCapacity(buff("Protection From Energy", { casterLevel: 5 }), 1)).toBe(60);
    expect(poolCapacity(buff("Protection From Energy", { casterLevel: 10 }), 1)).toBe(120);
    expect(poolCapacity(buff("Protection From Energy", { casterLevel: 20 }), 1)).toBe(120);
  });

  it("falls back to character level when the buff has no caster level", () => {
    expect(poolCapacity(buff("Stoneskin"), 6)).toBe(60);
  });

  it("is zero for a buff with no ablative pool", () => {
    expect(poolCapacity(buff("Barkskin", { casterLevel: 10 }), 10)).toBe(0);
  });

  it("re-derives after a caster level correction rather than stranding a stale total", () => {
    const b = buff("Stoneskin", { casterLevel: 4 });
    expect(poolCapacity(b, 1)).toBe(40);
    expect(poolCapacity({ ...b, casterLevel: 11 }, 1)).toBe(110);
  });
});

describe("livePools", () => {
  it("reports remaining as capacity minus what has been absorbed", () => {
    const pools = livePools(doc([buff("Stoneskin", { casterLevel: 10, absorbed: 30 })]), 10);
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      id: "inst-Stoneskin",
      capacity: 100,
      absorbed: 30,
      remaining: 70,
      kind: "dr",
    });
  });

  it("carries the chosen element through for an energy pool", () => {
    const pools = livePools(
      doc([buff("Protection From Energy", { casterLevel: 5, element: "cold" })]),
      5,
    );
    expect(pools[0]).toMatchObject({ kind: "energy", element: "cold", remaining: 60 });
  });

  it("ignores buffs with no pool", () => {
    expect(livePools(doc([buff("Barkskin", { casterLevel: 10 })]), 10)).toEqual([]);
  });

  it("never reports negative remaining", () => {
    const pools = livePools(doc([buff("Stoneskin", { casterLevel: 1, absorbed: 999 })]), 1);
    expect(pools[0]!.remaining).toBe(0);
  });
});

describe("consumePools", () => {
  it("adds to the absorbed counter", () => {
    const before = doc([buff("Stoneskin", { casterLevel: 10, absorbed: 30 })]);
    const after = consumePools(before, [{ id: "inst-Stoneskin", absorbed: 10, exhausted: false }]);
    expect(after.live.activeBuffs[0]!.absorbed).toBe(40);
  });

  it("removes a buff whose pool this attack exhausted", () => {
    const before = doc([buff("Stoneskin", { casterLevel: 1, absorbed: 6 })]);
    const after = consumePools(before, [{ id: "inst-Stoneskin", absorbed: 4, exhausted: true }]);
    expect(after.live.activeBuffs).toEqual([]);
  });

  it("leaves other buffs untouched", () => {
    const before = doc([
      buff("Stoneskin", { casterLevel: 10 }),
      buff("Barkskin", { casterLevel: 10 }),
    ]);
    const after = consumePools(before, [{ id: "inst-Stoneskin", absorbed: 10, exhausted: false }]);
    expect(after.live.activeBuffs).toHaveLength(2);
    expect(after.live.activeBuffs[1]!.absorbed).toBeUndefined();
  });

  it("is a no-op for an empty consumption list, returning the same doc", () => {
    const before = doc([buff("Stoneskin", { casterLevel: 10 })]);
    expect(consumePools(before, [])).toBe(before);
  });
});

describe("element choice is resolved at activation", () => {
  const refBuff = (name: keyof typeof IDS) => ({
    id: IDS[name],
    name,
    changes: [],
    contextNotes: [],
  });

  it("bakes a concrete eres.<element> change into the instance", () => {
    const b = makeActiveBuff(refBuff("Resist Energy") as never, {
      casterLevel: 7,
      element: "cold",
    });
    expect(b.element).toBe("cold");
    expect(b.changes).toEqual([
      {
        formula: "10 * min(3, 1 + floor(max(0, @item.level - 3) / 4))",
        target: "eres.cold",
        type: "untyped",
      },
    ]);
  });

  it("grants no change for protection from energy — its pool is the whole effect", () => {
    const b = makeActiveBuff(refBuff("Protection From Energy") as never, {
      casterLevel: 10,
      element: "fire",
    });
    expect(b.element).toBe("fire");
    expect(b.changes).toEqual([]);
  });

  it("ignores an element on a buff that doesn't take one", () => {
    const b = makeActiveBuff(refBuff("Barkskin") as never, { element: "fire" });
    expect(b.element).toBeUndefined();
    expect(b.changes).toEqual([]);
  });

  it("does not flag a pool-only buff as having no modeled effect", () => {
    expect(
      hasNoModeledEffect({
        buffId: IDS["Protection From Energy"],
        changes: [],
        contextNotes: [],
      }),
    ).toBe(false);
    expect(
      hasNoModeledEffect({ buffId: "some-invisibility-id", changes: [], contextNotes: [] }),
    ).toBe(true);
    // A user-authored buff has no id at all and must not blow up the lookup.
    expect(hasNoModeledEffect({ changes: [], contextNotes: [] })).toBe(true);
  });
});

describe('the two buffs named "Resistance" are addressed independently', () => {
  it("the energy-resistance one takes an element and grants eres.<element>", () => {
    // Unreachable while the supplement tables keyed on name: a lookup for
    // "Resistance" could only ever find one of the two.
    const b = makeActiveBuff(
      { id: IDS.Resistance, name: "Resistance", changes: [], contextNotes: [] } as never,
      { casterLevel: 9, element: "acid" },
    );
    expect(b.element).toBe("acid");
    expect(b.changes).toEqual([
      { formula: "(1 + floor(@item.level / 3)) * 2", target: "eres.acid", type: "untyped" },
    ]);
  });

  it("the saving-throw cantrip of the same name takes no element", () => {
    const saves = { id: "GdU6Xlwn2phRnfc6", name: "Resistance", changes: [], contextNotes: [] };
    const b = makeActiveBuff(saves as never, { casterLevel: 9, element: "acid" });
    expect(b.element).toBeUndefined();
    expect(b.changes).toEqual([]);
  });
});

describe("buffs whose effect arrives at activation are not badged as unmodeled", () => {
  it.each([
    ["Protection From Energy", IDS["Protection From Energy"]],
    ["Resist Energy", IDS["Resist Energy"]],
    ["Resistance (energy)", IDS.Resistance],
  ])("%s", (_label, buffId) => {
    // Vendored `changes[]` is empty for all three — the pool or the chosen
    // element supplies the effect — so a naive emptiness check mislabels them.
    expect(hasNoModeledEffect({ buffId, changes: [], contextNotes: [] })).toBe(false);
  });

  it("still badges a genuinely unmodeled buff", () => {
    expect(hasNoModeledEffect({ buffId: "invisibility-id", changes: [], contextNotes: [] })).toBe(
      true,
    );
  });
});
