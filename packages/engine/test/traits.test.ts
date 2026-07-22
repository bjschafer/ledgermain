import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Issue #23 (character traits): the 28 entries this file originally covered
 * are hand-authored clean-room content (not in the vendored Foundry pack —
 * see `src/traits.ts`), so those expectations are hand-computed straight
 * from the published PF1 rules, not derived from any oracle data. All deltas
 * are compared against the same doc with no traits chosen.
 *
 * Issue #74 Phase 1 added the full vendored trait catalog (`RefData.traits`)
 * as a second source `collect.ts` resolves against — the "vendored trait"
 * block at the bottom exercises THAT path with a real catalog entry.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitIdByName(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

function makeDoc(traits: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 3 }],
    },
    abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      traits,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

const baseline = compute(makeDoc([]), ref);

describe("traits (hand-computed)", () => {
  it("Reactionary grants +2 initiative", () => {
    const sheet = compute(makeDoc(["reactionary"]), ref);
    expect(sheet.initiative.total).toBe(baseline.initiative.total + 2);
    const comp = sheet.initiative.components.find((c) => c.source === "Reactionary");
    expect(comp).toBeDefined();
    expect(comp!.type).toBe("trait");
    expect(comp!.value).toBe(2);
    expect(comp!.applied).toBe(true);
  });

  it("Deft Dodger moves the Reflex save by +1", () => {
    const sheet = compute(makeDoc(["deftDodger"]), ref);
    expect(sheet.saves.ref.total).toBe(baseline.saves.ref.total + 1);
    const comp = sheet.saves.ref.components.find((c) => c.source === "Deft Dodger");
    expect(comp).toBeDefined();
    expect(comp!.type).toBe("trait");
    expect(comp!.value).toBe(1);
  });

  it("Resilient moves the Fortitude save by +1", () => {
    const sheet = compute(makeDoc(["resilient"]), ref);
    expect(sheet.saves.fort.total).toBe(baseline.saves.fort.total + 1);
  });

  it("two trait-type bonuses to the same target don't stack (highest only)", () => {
    // Taking the same trait id twice (a data-entry mistake, or two traits that
    // happened to grant the same flat bonus) still yields only +1 Will, not
    // +2 — "trait" is not a stacking type (see stacking.ts / stacking.test.ts),
    // so resolveStack keeps only the highest same-type bonus per target.
    const sheet = compute(makeDoc(["indomitableFaith", "indomitableFaith"]), ref);
    expect(sheet.saves.will.total).toBe(baseline.saves.will.total + 1);
  });

  it("unknown trait id is ignored without crashing", () => {
    const sheet = compute(makeDoc(["not-a-real-trait"]), ref);
    expect(sheet.initiative.total).toBe(baseline.initiative.total);
    expect(sheet.saves.will.total).toBe(baseline.saves.will.total);
  });

  it("skill-granting traits (e.g. Dangerously Curious) add +1 to the named skill", () => {
    const sheet = compute(makeDoc(["dangerouslyCurious"]), ref);
    expect(sheet.skills.umd!.total).toBe(baseline.skills.umd!.total + 1);
  });

  it("Honest grants +1 Diplomacy (the friendly/helpful +2 is not auto-applied)", () => {
    const sheet = compute(makeDoc(["honest"]), ref);
    expect(sheet.skills.dip!.total).toBe(baseline.skills.dip!.total + 1);
    const comp = sheet.skills.dip!.components.find((c) => c.source === "Honest");
    expect(comp).toBeDefined();
    expect(comp!.value).toBe(1);
  });

  it("Natural-Born Leader applies no flat modifier to its own sheet", () => {
    // The +1 morale bonus goes to cohorts/followers/summons, and the
    // Leadership-score bonus has no sheet target — nothing lands on the PC.
    const sheet = compute(makeDoc(["naturalBornLeader"]), ref);
    expect(sheet.saves.will.total).toBe(baseline.saves.will.total);
    expect(sheet.skills.dip!.total).toBe(baseline.skills.dip!.total);
  });
});

describe("traits: vendored catalog (issue #74 Phase 1, RefData.traits)", () => {
  it("a vendored-only trait's structured Change applies through the same collect.ts path as the hand-authored table", () => {
    // Ambush Training (Pathfinder Society): "+1 trait bonus on initiative
    // checks" (PZO9435 p.15) — a real published trait not among the 28
    // hand-authored entries, resolved purely from RefData.traits.
    const id = traitIdByName("Ambush Training (Pathfinder Society)");
    const sheet = compute(makeDoc([id]), ref);
    expect(sheet.initiative.total).toBe(baseline.initiative.total + 1);
    const comp = sheet.initiative.components.find(
      (c) => c.source === "Ambush Training (Pathfinder Society)",
    );
    expect(comp).toBeDefined();
    expect(comp!.type).toBe("trait");
    expect(comp!.value).toBe(1);
    expect(comp!.applied).toBe(true);
  });

  it("a vendored trait's own duplicate of a hand-authored trait's id namespace never collides — the hand-authored entry still wins for the legacy id", () => {
    // Reactionary exists in BOTH tables under different ids: "reactionary"
    // (hand-authored, +2 init) and a distinct Foundry id (vendored, same
    // rules text). An existing CharacterDoc referencing "reactionary" must
    // keep getting exactly +2, not a re-resolution through the vendored copy.
    const sheet = compute(makeDoc(["reactionary"]), ref);
    expect(sheet.initiative.total).toBe(baseline.initiative.total + 2);
  });
});
