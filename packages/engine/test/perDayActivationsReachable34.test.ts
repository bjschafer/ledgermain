/**
 * Hand-computed fixture tests for the reachable3/reachable4 per-day
 * activation shard (`per-day-activations/reachable34.ts`).
 *
 * RAW numbers exercised here (verified against aonprd.com's live class
 * pages, 2026-08-16):
 *   - Sacred Armor (warpriest, 7th level+, Advanced Class Guide): "+1
 *     enhancement bonus. For every 3 levels beyond 7th, this bonus increases
 *     by 1 (to a maximum of +5 at 19th level)." So 7th level = +1, 10th = +2,
 *     19th (and beyond) caps at +5.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, perDayActivationToggleOptions } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  classTag: string;
  level: number;
  activeBuffs?: ActiveBuff[];
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
      classes: [{ tag: opts.classTag, level: opts.level }],
    },
    abilities: { str: 14, dex: 14, con: 14, int: 10, wis: 14, cha: 16 },
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
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function activeBuffFor(option: {
  id: string;
  name: string;
  changes: unknown;
  contextNotes?: unknown;
}): ActiveBuff {
  return {
    instanceId: `buff-${option.id}`,
    effectTag: option.id,
    name: option.name,
    changes: option.changes as ActiveBuff["changes"],
    contextNotes: option.contextNotes as ActiveBuff["contextNotes"],
  };
}

const SACRED_ARMOR_ID = "UBv1y1h93jrnhWxO";

describe("perDayActivationToggleOptions: Sacred Armor (warpriest)", () => {
  it("7th level sees the enhancement toggle", () => {
    const options = perDayActivationToggleOptions(SACRED_ARMOR_ID, "warpriest", 7);
    expect(options.map((o) => o.id)).toEqual(["perDay:UBv1y1h93jrnhWxO:enhance"]);
  });

  it("toggling the enhancement on at 7th level applies +1 enhancement AC", () => {
    const options = perDayActivationToggleOptions(SACRED_ARMOR_ID, "warpriest", 7);
    const enhance = options.find((o) => o.id === "perDay:UBv1y1h93jrnhWxO:enhance")!;
    const noBuff = compute(makeDoc({ classTag: "warpriest", level: 7 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "warpriest", level: 7, activeBuffs: [activeBuffFor(enhance)] }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(1);
  });

  it("10th level scales the enhancement bonus to +2", () => {
    const options = perDayActivationToggleOptions(SACRED_ARMOR_ID, "warpriest", 10);
    const enhance = options.find((o) => o.id === "perDay:UBv1y1h93jrnhWxO:enhance")!;
    const noBuff = compute(makeDoc({ classTag: "warpriest", level: 10 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "warpriest", level: 10, activeBuffs: [activeBuffFor(enhance)] }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(2);
  });

  it("caps the enhancement bonus at +5 from 19th level onward", () => {
    const at19 = perDayActivationToggleOptions(SACRED_ARMOR_ID, "warpriest", 19).find(
      (o) => o.id === "perDay:UBv1y1h93jrnhWxO:enhance",
    )!;
    const noBuff19 = compute(makeDoc({ classTag: "warpriest", level: 19 }), ref);
    const withBuff19 = compute(
      makeDoc({ classTag: "warpriest", level: 19, activeBuffs: [activeBuffFor(at19)] }),
      ref,
    );
    expect(withBuff19.ac.normal - noBuff19.ac.normal).toBe(5);

    const at20 = perDayActivationToggleOptions(SACRED_ARMOR_ID, "warpriest", 20).find(
      (o) => o.id === "perDay:UBv1y1h93jrnhWxO:enhance",
    )!;
    const noBuff20 = compute(makeDoc({ classTag: "warpriest", level: 20 }), ref);
    const withBuff20 = compute(
      makeDoc({ classTag: "warpriest", level: 20, activeBuffs: [activeBuffFor(at20)] }),
      ref,
    );
    expect(withBuff20.ac.normal - noBuff20.ac.normal).toBe(5);
  });

  it("does not surface for a different granting class", () => {
    expect(perDayActivationToggleOptions(SACRED_ARMOR_ID, "cleric", 7)).toEqual([]);
  });
});
