/**
 * Homebrew abilities (`build.homebrew.classFeatures`): GM-granted campaign
 * features that belong to no class table. `collectGrantedFeatures` synthesizes
 * a grant for each, which is what puts them in `sheet.classFeatures` and, when
 * they declare `uses`, in the derived resource pools; their `changes[]` apply
 * through `collectModifiers`' own homebrew path (vendored class-feature changes
 * are routed per-subsystem instead, so there's no generic route to reuse).
 *
 * Expected values here are arithmetic on the modifiers under test, not
 * rulebook tables: a homebrew entity's numbers are whatever the player typed.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, HomebrewClassFeature, RefData } from "@pf1/schema";

import { compute, deriveResourcePools } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const ABILITY_ID = "hb-storm-mark";

function ability(over: Partial<HomebrewClassFeature> = {}): HomebrewClassFeature {
  return {
    id: ABILITY_ID,
    uuid: ABILITY_ID,
    name: "Mark of the Storm Herald",
    level: 3,
    changes: [],
    grantsBuffs: [],
    ...over,
  };
}

/**
 * The web layer overlays homebrew onto `RefData` before calling `compute`
 * (`apps/web/src/model/homebrew.ts` `resolveRefData`) — the engine reads the
 * overlaid catalog, so a test that wants description/`uses` lookups to resolve
 * has to do the same.
 */
function overlaidRef(a: HomebrewClassFeature): RefData {
  return { ...ref, classFeatures: { ...ref.classFeatures, [a.id]: a } };
}

function makeDoc(abilities: HomebrewClassFeature[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 5 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      homebrew: abilities.length
        ? { classFeatures: Object.fromEntries(abilities.map((a) => [a.id, a])) }
        : undefined,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("homebrew abilities", () => {
  it("appears in the class-feature timeline at its authored level, labelled Custom", () => {
    const a = ability();
    const sheet = compute(makeDoc([a]), overlaidRef(a));
    const entry = sheet.classFeatures.find((f) => f.featureId === ABILITY_ID);
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("Mark of the Storm Herald");
    expect(entry!.level).toBe(3);
    expect(entry!.origin).toEqual({ kind: "custom", label: "Custom" });
    // Nothing can swap out an ability nothing else references.
    expect(entry!.applied).toBe(true);
  });

  it("carries an empty classTag when the ability belongs to no class", () => {
    const a = ability();
    const sheet = compute(makeDoc([a]), overlaidRef(a));
    expect(sheet.classFeatures.find((f) => f.featureId === ABILITY_ID)!.classTag).toBe("");
  });

  it("attributes the entry to the granting class when one is named", () => {
    const a = ability({ classTag: "fighter" });
    const sheet = compute(makeDoc([a]), overlaidRef(a));
    expect(sheet.classFeatures.find((f) => f.featureId === ABILITY_ID)!.classTag).toBe("fighter");
  });

  it("applies its authored changes unconditionally", () => {
    const a = ability({ changes: [{ formula: "2", target: "will", type: "sacred" }] });
    const overlaid = overlaidRef(a);
    const base = compute(makeDoc([]), overlaid);
    const withAbility = compute(makeDoc([a]), overlaid);
    expect(withAbility.saves.will.total - base.saves.will.total).toBe(2);
  });

  it("stacks by type like any other source (two sacred bonuses do not sum)", () => {
    const a = ability({ changes: [{ formula: "2", target: "will", type: "sacred" }] });
    const b = ability({
      id: "hb-second",
      uuid: "hb-second",
      name: "Second Mark",
      changes: [{ formula: "1", target: "will", type: "sacred" }],
    });
    const overlaid = { ...ref, classFeatures: { ...ref.classFeatures, [a.id]: a, [b.id]: b } };
    const base = compute(makeDoc([]), overlaid);
    const both = compute(makeDoc([a, b]), overlaid);
    expect(both.saves.will.total - base.saves.will.total).toBe(2);
  });

  it("becomes a tracked resource pool when it declares uses", () => {
    const a = ability({ uses: { maxFormula: "3", per: "day" } });
    const pools = deriveResourcePools(makeDoc([a]), overlaidRef(a));
    const pool = pools.find((p) => p.id === ABILITY_ID);
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(3);
    expect(pool!.restValue).toBe(3);
    expect(pool!.per).toBe("day");
  });

  it("gets no pool when it declares no uses", () => {
    const a = ability();
    const pools = deriveResourcePools(makeDoc([a]), overlaidRef(a));
    expect(pools.some((p) => p.id === ABILITY_ID)).toBe(false);
  });

  it("changes nothing for a doc with no homebrew abilities", () => {
    const a = ability({ changes: [{ formula: "5", target: "ac", type: "untyped" }] });
    const overlaid = overlaidRef(a);
    // The definition is in RefData but not in the doc: an overlaid entry is
    // only granted when the doc actually holds it.
    expect(compute(makeDoc([]), overlaid).ac.normal).toBe(compute(makeDoc([]), ref).ac.normal);
  });
});
