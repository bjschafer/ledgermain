import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { deriveResourcePools } from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeBrawler(level: number, martialFlexibilityFeatId?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "brawler", level }],
    },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      ...(martialFlexibilityFeatId ? { martialFlexibilityFeatId } : {}),
    },
  } as CharacterDoc;
}

describe("Brawler AC Bonus / Bonus Combat Feats (already vendored, sanity check — issue #65)", () => {
  // NOTE (flagged, not fixed — out of scope for issue #65's bloodrager/
  // brawler build): the vendored "AC Bonus (BRA)" formula
  // (`clamp(floor((@class.unlevel - 1) / 4), 0, 4)`) evaluates to 0 at
  // class level 4 and only becomes +1 starting at level 5 — one level later
  // than the published table ("4th: AC bonus +1"). This is a pre-existing
  // vendored-data quirk (same `changes[]`-formula-vs-prose-table mismatch
  // category `archetypes.ts` already documents for other classes), not
  // something authored by this pass. These assertions describe the ACTUAL
  // (already-shipped) behavior rather than the RAW table.
  it("AC Bonus (BRA) grants +1 dodge AC/CMD starting at 5th level (see NOTE above)", () => {
    const at4 = collectModifiers(makeBrawler(4), ref, buildRollData(makeBrawler(4), ref));
    expect(at4.find((m) => m.target === "ac" && m.type === "dodge")!.value).toBe(0);

    const at5 = collectModifiers(makeBrawler(5), ref, buildRollData(makeBrawler(5), ref));
    const acMod = at5.find((m) => m.target === "ac" && m.type === "dodge");
    expect(acMod!.value).toBe(1);
    expect(at5.find((m) => m.target === "cmd" && m.type === "dodge")!.value).toBe(1);
  });

  it("AC Bonus (BRA) scales to +2 at 9th level", () => {
    const doc = makeBrawler(9);
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    expect(mods.find((m) => m.target === "ac" && m.type === "dodge")!.value).toBe(2);
  });

  it("Bonus Combat Feats (BRA) scales from 1 slot at 2nd level to 2 at 5th", () => {
    // Isolated by source name — a Human brawler ALSO gets a flat +1
    // "bonusFeats" from the racial bonus feat, and Unarmed Strike (BRA)
    // grants its own flat +1 (Improved Unarmed Strike); both are unrelated
    // to this feature's own scaling, so `.find()`-by-name avoids that noise.
    const bonusCombatFeats = (doc: CharacterDoc) =>
      collectModifiers(doc, ref, buildRollData(doc, ref)).find(
        (m) => m.source === "Bonus Combat Feats (BRA)",
      )!.value;

    expect(bonusCombatFeats(makeBrawler(2))).toBe(1);
    expect(bonusCombatFeats(makeBrawler(5))).toBe(2);
  });
});

describe("Martial Flexibility resource pool (issue #65, already vendored)", () => {
  it("a level-1 brawler's pool is 3 + floor(level/2) = 3", () => {
    const pool = deriveResourcePools(makeBrawler(1), ref).find(
      (p) => p.name === "Martial Flexibility",
    );
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(3);
  });

  it("a level-10 brawler's pool is 3 + floor(10/2) = 8", () => {
    const pool = deriveResourcePools(makeBrawler(10), ref).find(
      (p) => p.name === "Martial Flexibility",
    );
    expect(pool!.max).toBe(8);
  });
});

describe("Martial Flexibility borrowed-feat effect (collectModifiers, issue #65)", () => {
  it("with no feat borrowed, no Martial Flexibility modifier is emitted", () => {
    const doc = makeBrawler(6);
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    expect(mods.some((m) => m.sourceId?.startsWith("martialFlexibility:"))).toBe(false);
  });

  it("borrowing Dodge applies its +1 dodge AC bonus for real", () => {
    const doc = makeBrawler(6, featId("Dodge"));
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    const dodgeMod = mods.find((m) => m.sourceId === `martialFlexibility:${featId("Dodge")}`);
    expect(dodgeMod).toBeDefined();
    expect(dodgeMod!.target).toBe("ac");
    expect(dodgeMod!.type).toBe("dodge");
    expect(dodgeMod!.value).toBe(1);
  });

  it("borrowing Great Fortitude applies its +2 Fortitude bonus for real", () => {
    const doc = makeBrawler(6, featId("Great Fortitude"));
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    const mod = mods.find((m) => m.target === "fort");
    expect(mod).toBeDefined();
    expect(mod!.value).toBe(2);
  });

  it("an unknown/stale borrowed feat id is ignored, not an error", () => {
    const doc = makeBrawler(6, "not-a-real-feat-id");
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref));
    expect(mods.some((m) => m.sourceId?.startsWith("martialFlexibility:"))).toBe(false);
  });
});
