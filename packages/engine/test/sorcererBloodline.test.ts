import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

/**
 * Issue #34 (bloodline arcana + powers) gave `build.sorcererBloodline` real
 * numeric weight: a KNOWN bloodline tag (one of the 10 CRB bloodlines
 * hand-authored in `@pf1/engine` `bloodlines.ts`) now changes `compute()`'s
 * output (e.g. Draconic's +1 HP/level arcana). An UNKNOWN tag, or the field
 * set on a non-sorcerer, still changes nothing — same posture as an
 * unresolvable cleric domain/wizard school tag.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  classes: { tag: string; level: number }[],
  sorcererBloodline?: string,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes,
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(sorcererBloodline ? { sorcererBloodline } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute() + build.sorcererBloodline (issue #34)", () => {
  it("a Draconic sorcerer 7 gets +7 HP (arcana) over the same doc with no bloodline", () => {
    const withBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], "Draconic"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], undefined), ref);
    expect(withBloodline.hp.max).toBe(withoutBloodline.hp.max + 7);
    const bonus = withBloodline.hp.components.find((c) => c.source.includes("Draconic"));
    expect(bonus).toBeDefined();
    expect(bonus!.value).toBe(7);
    expect(bonus!.applied).toBe(true);
  });

  it("an unknown bloodline tag computes byte-identically to no bloodline (engine ignores it)", () => {
    const withUnknown = compute(makeDoc([{ tag: "sorcerer", level: 7 }], "NotARealBloodline"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "sorcerer", level: 7 }], undefined), ref);
    expect(withUnknown).toEqual(withoutBloodline);
  });

  it("a non-sorcerer with a stale Draconic bloodline field gets nothing", () => {
    const withBloodline = compute(makeDoc([{ tag: "fighter", level: 7 }], "Draconic"), ref);
    const withoutBloodline = compute(makeDoc([{ tag: "fighter", level: 7 }], undefined), ref);
    expect(withBloodline).toEqual(withoutBloodline);
  });
});
