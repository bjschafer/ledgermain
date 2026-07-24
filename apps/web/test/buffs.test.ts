import { describe, expect, it } from "bun:test";
import type { ToggleBuffOption } from "@pf1/engine";
import type { Buff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  formatDuration,
  hasNoModeledEffect,
  isBuffOnMaster,
  roundsToDisplay,
  suggestRounds,
  toggleBuffMaster,
  toggleLinkedBuff,
  toggleTableBuff,
  toRounds,
} from "../src/model/buffs.js";

function buffWithDuration(units: string, value: string): Buff {
  return {
    id: "test-buff",
    name: "Test Buff",
    uuid: "Compendium.pf1.test.Item.test-buff",
    changes: [],
    contextNotes: [],
    duration: { units, value },
  };
}

describe("roundsToDisplay", () => {
  it("returns undefined for indefinite (undefined rounds)", () => {
    expect(roundsToDisplay(undefined)).toBeUndefined();
  });

  it("40 rds → 4 min — the 4-min/level CL4 case that motivated this helper", () => {
    expect(roundsToDisplay(40)).toEqual({ value: 4, unit: "min" });
  });

  it("100 rds → 10 min", () => {
    expect(roundsToDisplay(100)).toEqual({ value: 10, unit: "min" });
  });

  it("1200 rds → 2 hr", () => {
    expect(roundsToDisplay(1200)).toEqual({ value: 2, unit: "hr" });
  });

  it("600 rds → 1 hr (hr checked before min; 600 % 600 === 0 wins)", () => {
    expect(roundsToDisplay(600)).toEqual({ value: 1, unit: "hr" });
  });

  it("7 rds → 7 rds (not a multiple of 10)", () => {
    expect(roundsToDisplay(7)).toEqual({ value: 7, unit: "rds" });
  });

  it("90 rds → 9 min (clean multiple of 10)", () => {
    expect(roundsToDisplay(90)).toEqual({ value: 9, unit: "min" });
  });

  it("1 rds → 1 rds", () => {
    expect(roundsToDisplay(1)).toEqual({ value: 1, unit: "rds" });
  });

  it("10 rds → 1 min", () => {
    expect(roundsToDisplay(10)).toEqual({ value: 1, unit: "min" });
  });
});

describe("toRounds", () => {
  it("rds passthrough", () => {
    expect(toRounds(7, "rds")).toBe(7);
  });

  it("min → ×10", () => {
    expect(toRounds(4, "min")).toBe(40);
  });

  it("hr → ×600", () => {
    expect(toRounds(2, "hr")).toBe(1200);
  });

  it("fractional input rounds to nearest whole round", () => {
    expect(toRounds(1.5, "min")).toBe(15);
  });
});

describe("round-trip: roundsToDisplay → toRounds", () => {
  it("40 rds round-trips via min", () => {
    const d = roundsToDisplay(40)!;
    expect(toRounds(d.value, d.unit)).toBe(40);
  });

  it("1200 rds round-trips via hr", () => {
    const d = roundsToDisplay(1200)!;
    expect(toRounds(d.value, d.unit)).toBe(1200);
  });

  it("7 rds round-trips via rds", () => {
    const d = roundsToDisplay(7)!;
    expect(toRounds(d.value, d.unit)).toBe(7);
  });

  it("600 rds round-trips via hr", () => {
    const d = roundsToDisplay(600)!;
    expect(toRounds(d.value, d.unit)).toBe(600);
  });
});

describe("formatDuration", () => {
  it("undefined → ∞", () => {
    expect(formatDuration(undefined)).toBe("∞");
  });

  it("40 → '4 min'", () => {
    expect(formatDuration(40)).toBe("4 min");
  });

  it("7 → '7 rds'", () => {
    expect(formatDuration(7)).toBe("7 rds");
  });

  it("1200 → '2 hr'", () => {
    expect(formatDuration(1200)).toBe("2 hr");
  });

  it("600 → '1 hr'", () => {
    expect(formatDuration(600)).toBe("1 hr");
  });

  it("90 → '9 min'", () => {
    expect(formatDuration(90)).toBe("9 min");
  });
});

describe("suggestRounds", () => {
  it("treats @item.level as per-level (existing behavior)", () => {
    // duration "@item.level" minutes at CL4 → 4 * 10 = 40 rounds.
    expect(suggestRounds(buffWithDuration("minute", "@item.level"), 4)).toBe(40);
  });

  it("treats @cl as per-level (vendored durations use @cl, not @item.level)", () => {
    // duration "@cl" minutes at CL4 → 4 * 10 = 40 rounds.
    expect(suggestRounds(buffWithDuration("minute", "@cl"), 4)).toBe(40);
  });

  it("treats a formula containing @cl (e.g. '10 * @cl') as per-level too", () => {
    expect(suggestRounds(buffWithDuration("round", "10 * @cl"), 3)).toBe(3);
  });

  it("does not mistake @classes.*/@class.level paths for @cl", () => {
    // Not a per-level match: falls back to the literal-number parse, which
    // fails for a non-numeric formula and defaults to 1 round of base.
    expect(suggestRounds(buffWithDuration("round", "@classes.barbarian.level"), 5)).toBe(1);
  });

  it("returns undefined for a buff with no duration units", () => {
    expect(
      suggestRounds({ ...buffWithDuration("round", "1"), duration: undefined }, 5),
    ).toBeUndefined();
  });
});

describe("hasNoModeledEffect", () => {
  it("empty changes + empty contextNotes -> true (a silent no-op buff)", () => {
    expect(hasNoModeledEffect({ changes: [], contextNotes: [] })).toBe(true);
  });

  it("empty changes + undefined contextNotes -> true", () => {
    expect(hasNoModeledEffect({ changes: [] })).toBe(true);
  });

  it("a buff with only contextNotes (no changes) does NOT get flagged", () => {
    expect(
      hasNoModeledEffect({
        changes: [],
        contextNotes: [{ target: "cmd", text: "Cannot be grappled." }],
      }),
    ).toBe(false);
  });

  it("a buff with changes (no contextNotes) does NOT get flagged", () => {
    expect(
      hasNoModeledEffect({
        changes: [{ formula: "2", target: "ac", type: "dodge" }],
        contextNotes: [],
      }),
    ).toBe(false);
  });

  it("real vendored data: Invisibility is flagged, Stoneskin (DR supplement) is not", () => {
    const ref = loadRefData();
    const stoneskin = Object.values(ref.buffs).find((b) => b.name === "Stoneskin");
    const invisibility = Object.values(ref.buffs).find((b) => b.name === "Invisibility");
    expect(stoneskin).toBeDefined();
    expect(invisibility).toBeDefined();
    expect(hasNoModeledEffect(stoneskin!)).toBe(false);
    expect(hasNoModeledEffect(invisibility!)).toBe(true);
  });

  it("real vendored data: Freedom of Movement has contextNotes only and is NOT flagged", () => {
    const ref = loadRefData();
    const fom = Object.values(ref.buffs).find((b) => b.name === "Freedom of Movement");
    expect(fom).toBeDefined();
    expect(fom!.changes).toEqual([]);
    expect(fom!.contextNotes.length).toBeGreaterThan(0);
    expect(hasNoModeledEffect(fom!)).toBe(false);
  });
});

function makeDoc(activeBuffs: CharacterDoc["live"]["activeBuffs"] = []): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [{ tag: "bard", level: 5 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs,
      resources: {},
    },
  };
}

// Issue #45 follow-up: the "activated performance/song buff" mechanism the
// pipeline waves found missing (see `packages/engine/src/archetype-extracted/
// bard.ts`'s wave-2 doc comment) turned out to already exist generically —
// `deriveResourcePools`'s `linkedBuffIds` (Rage, Inspire Courage, Aura of
// Protection) plus `ResourcesPanel`'s toggle button, built the same day in a
// later commit than that wave's classification pass. `toggleLinkedBuff` is
// the pure decision logic behind that toggle button, pulled out of the
// component (per CLAUDE.md's "logic in model/, thin component wiring")
// instead of living only in JSX where a DOM test would be the only way to
// exercise it.
describe("toggleLinkedBuff", () => {
  const ref = loadRefData();
  const inspireCourage = Object.values(ref.buffs).find((b) => b.name === "Inspire Courage")!;

  it("activates a not-yet-active linked buff, seeding casterLevel + suggested duration", () => {
    const doc = toggleLinkedBuff(makeDoc(), inspireCourage, 5);
    expect(doc.live.activeBuffs).toHaveLength(1);
    const active = doc.live.activeBuffs[0]!;
    expect(active.buffId).toBe(inspireCourage.id);
    expect(active.name).toBe("Inspire Courage");
    expect(active.casterLevel).toBe(5);
    // Snapshotted, not a live reference to the ref-data buff's changes.
    expect(active.changes).toEqual(inspireCourage.changes);
    expect(active.changes).not.toBe(inspireCourage.changes);
  });

  it("deactivates an already-active linked buff (matched by buffId, not instanceId)", () => {
    const withActive = makeDoc([
      {
        instanceId: "some-instance",
        buffId: inspireCourage.id,
        name: inspireCourage.name,
        changes: inspireCourage.changes,
        casterLevel: 5,
      },
    ]);
    const doc = toggleLinkedBuff(withActive, inspireCourage, 5);
    expect(doc.live.activeBuffs).toHaveLength(0);
  });

  it("toggling twice is a round trip back to no active buffs", () => {
    const on = toggleLinkedBuff(makeDoc(), inspireCourage, 11);
    const off = toggleLinkedBuff(on, inspireCourage, 11);
    expect(off.live.activeBuffs).toHaveLength(0);
  });

  it("never drains any resource pool — pool state is untouched by the toggle", () => {
    const doc = makeDoc();
    const withPool = {
      ...doc,
      live: { ...doc.live, resources: { bardicPerformance: { used: 0, max: 15 } } },
    };
    const toggled = toggleLinkedBuff(withPool, inspireCourage, 5);
    expect(toggled.live.resources).toEqual(withPool.live.resources);
  });
});

// Issue #65: the "no vendored buff at all" counterpart to `toggleLinkedBuff`
// above — inquisitor Judgments and skald Inspired Rage carry no
// `RefData.buffs` entry to resolve, so `DerivedResourcePool.tableOptions`
// (packages/engine/src/resources.ts) surfaces a hand-authored
// `ToggleBuffOption` instead, and this is its toggle logic.
describe("toggleTableBuff", () => {
  const destruction: ToggleBuffOption = {
    id: "judgment:destruction",
    name: "Destruction",
    changes: [{ formula: "1", target: "wdamage", type: "sacred" }],
    contextNotes: [{ target: "allChecks", text: "some note" }],
  };

  it("activates a not-yet-active table buff, keyed by effectTag (not buffId)", () => {
    const doc = toggleTableBuff(makeDoc(), destruction);
    expect(doc.live.activeBuffs).toHaveLength(1);
    const active = doc.live.activeBuffs[0]!;
    expect(active.effectTag).toBe("judgment:destruction");
    expect(active.buffId).toBeUndefined();
    expect(active.name).toBe("Destruction");
    expect(active.changes).toEqual(destruction.changes);
    expect(active.changes).not.toBe(destruction.changes);
    expect(active.contextNotes).toEqual(destruction.contextNotes);
  });

  it("deactivates an already-active table buff (matched by effectTag)", () => {
    const withActive = makeDoc([
      {
        instanceId: "some-instance",
        effectTag: "judgment:destruction",
        name: "Destruction",
        changes: destruction.changes,
      },
    ]);
    const doc = toggleTableBuff(withActive, destruction);
    expect(doc.live.activeBuffs).toHaveLength(0);
  });

  it("toggling twice is a round trip back to no active buffs", () => {
    const on = toggleTableBuff(makeDoc(), destruction);
    const off = toggleTableBuff(on, destruction);
    expect(off.live.activeBuffs).toHaveLength(0);
  });

  it("two different table buffs (e.g. two judgments) can be active at once — no exclusivity enforced", () => {
    const justice: ToggleBuffOption = {
      id: "judgment:justice",
      name: "Justice",
      changes: [{ formula: "1", target: "attack", type: "sacred" }],
    };
    const withDestruction = toggleTableBuff(makeDoc(), destruction);
    const withBoth = toggleTableBuff(withDestruction, justice);
    expect(withBoth.live.activeBuffs).toHaveLength(2);
  });
});

describe("toggleBuffMaster / isBuffOnMaster (Share Spells: cast on companion instead of self)", () => {
  const mageArmor = {
    instanceId: "mage-armor-1",
    name: "Mage Armor",
    changes: [{ target: "aac", type: "untyped", formula: "4" }],
  };

  it("a fresh buff applies to the master by default", () => {
    expect(isBuffOnMaster(makeDoc([mageArmor]), "mage-armor-1")).toBe(true);
  });

  it("toggling off flags excludeMaster without removing the buff", () => {
    const doc = toggleBuffMaster(makeDoc([mageArmor]), "mage-armor-1");
    expect(doc.live.activeBuffs).toHaveLength(1);
    expect(doc.live.activeBuffs[0]!.excludeMaster).toBe(true);
    expect(isBuffOnMaster(doc, "mage-armor-1")).toBe(false);
  });

  it("toggling twice is a round trip back to applying to the master", () => {
    const off = toggleBuffMaster(makeDoc([mageArmor]), "mage-armor-1");
    const on = toggleBuffMaster(off, "mage-armor-1");
    expect(on.live.activeBuffs[0]!.excludeMaster).toBe(false);
    expect(isBuffOnMaster(on, "mage-armor-1")).toBe(true);
  });

  it("leaves other buffs untouched", () => {
    const other = { instanceId: "bless-1", name: "Bless", changes: [] };
    const doc = toggleBuffMaster(makeDoc([mageArmor, other]), "mage-armor-1");
    expect(isBuffOnMaster(doc, "bless-1")).toBe(true);
  });

  it("isBuffOnMaster returns false for an unknown instance id", () => {
    expect(isBuffOnMaster(makeDoc([mageArmor]), "nope")).toBe(false);
  });
});
