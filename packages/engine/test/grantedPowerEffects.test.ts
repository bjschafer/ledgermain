/**
 * Fixture tests for `GRANTED_POWER_CHANGE_PATCHES` (`granted-power-effects/`)
 * and the `collect.ts` loop that applies it — the hook that lets a chosen
 * cleric/inquisitor domain, wizard arcane school, or inquisitor inquisition
 * grant an unconditional numeric bonus, which nothing wired before this hook
 * existed (`collectGrantedFeatures` only resolved these powers for display
 * and uses/day tracking).
 *
 * Proof entry: Guarded Mind, granted by the Void domain (and its Isolation
 * and Stars subdomains) — "You gain a +2 insight bonus on saving throws
 * against all mind-affecting effects." (Advanced Player's Guide p. 182).
 * Its vendored grant level is 0 (immediate — any cleric level with the
 * domain has it), so there is no cleric level at which the domain is chosen
 * but the power isn't granted yet; the constructible gating case is the
 * granting class being entirely absent (`domainCasterLevel() === 0`), see
 * the "no cleric or inquisitor levels at all" test below.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human cleric, Wis 16 (+3 mod), chosen domains as given. */
function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "granted-power-effects-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "cleric", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      clericDomains,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Guarded Mind (Void domain, +2 insight vs. mind-affecting on Will)", () => {
  it("a level-1 cleric with the Void domain gets the Will conditional", () => {
    // Cleric Will is a good save: 2 + floor(level/2). Level 1: 2 + 0 = 2.
    // Wis 16 -> +3 mod. Headline Will = 2 + 3 = 5. Guarded Mind's +2 insight
    // (scoped to the "mind" save category) never joins the headline, only
    // the situational total: 5 + 2 = 7.
    const sheet = compute(makeCleric(1, ["Void"]), ref);
    expect(sheet.saves.will.total).toBe(5);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 7, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });

  it("still applies at a higher cleric level (headline and conditional both climb)", () => {
    // Level 5: Will base = 2 + floor(5/2) = 4. Headline = 4 + 3 = 7.
    // Conditional = 7 + 2 = 9.
    const sheet = compute(makeCleric(5, ["Void"]), ref);
    expect(sheet.saves.will.total).toBe(7);
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 9, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });

  it("no cleric or inquisitor levels at all: domainCasterLevel() is 0, so nothing is granted", () => {
    // A stale `clericDomains` build field (e.g. left over from a build that
    // used to be a cleric) grants nothing once the character has no cleric
    // or inquisitor levels to resolve `domainCasterLevel()` against — this
    // is the level gate `collectGrantedFeatures` (and this loop's own
    // defensive `grantingLevel === 0` check) actually enforces, since
    // Guarded Mind's own grant level (0) never gates anything on its own.
    const doc = makeCleric(5, ["Void"]);
    const fighter = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 5 }] },
    };
    // A level-5 fighter's own Bravery ("+1 on Will saves against fear") adds
    // an unrelated "fear" conditional — orthogonal to this hook, so the
    // assertion targets "mind" specifically rather than the whole array.
    const sheet = compute(fighter, ref);
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("mind"))).toBe(false);
  });

  it("a cleric with a different domain gets nothing", () => {
    const sheet = compute(makeCleric(5, ["Fire"]), ref);
    expect(sheet.saves.will.conditionals).toBeUndefined();
  });

  it("a fighter with no domain access at all computes cleanly with no conditional", () => {
    // Origin-scoping sanity: `GRANTED_POWER_CHANGE_PATCHES` is only ever
    // consulted for `origin.kind` "domain"/"school"/"inquisition" grants —
    // a class with none of those in play must never pick up a stray
    // conditional, and `compute()` must not throw walking a doc with no
    // `build.clericDomains` field at all.
    const doc: CharacterDoc = {
      schemaVersion: 1,
      id: "granted-power-effects-fighter",
      ownerId: "tester",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: { name: "Test", race: HUMAN, classes: [{ tag: "fighter", level: 5 }] },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
    // Same Bravery caveat as above: a level-5 fighter still carries its own
    // unrelated "fear" conditional; the assertion is scoped to "mind".
    const sheet = compute(doc, ref);
    expect(sheet.saves.will.conditionals?.some((c) => c.categories.includes("mind"))).toBe(false);
  });
});
