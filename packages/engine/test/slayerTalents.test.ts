import { describe, expect, it } from "bun:test";

import type { CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, compute } from "../src/index.js";

/**
 * Fixture coverage for the slayer-talent hand-table overlay — see
 * `slayer-talents.ts`'s doc comment for the sourcing and honesty-bar
 * rationale. `slayerTalentCatalog.test.ts` covers the table shape/merge
 * behavior; this file covers the three live-Change entries actually landing on
 * `compute`'s output, plus the standard unknown-id/wrong-class gating shape
 * every `collect.ts` build-choice loop gets (cookbook §3.1).
 *
 * Sources: `legacy.aonprd.com/advancedClassGuide/classes/slayer.html` (core
 * ACG "Slayer Talents"/"Advanced Talents") and `aonprd.com/SlayerTalents.aspx`
 * (full compiled index, incl. splatbook page cites) — Foil Scrutiny (ACG
 * p. 53) and Armored Marauder/Armored Swiftness (Chronicle of Legends p. 6).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const FULL_PLATE: ItemInstance = {
  equipped: true,
  name: "Full Plate",
  armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 3 },
};

function makeDoc(over: {
  classTag: string;
  level: number;
  slayerTalents?: string[];
  gear?: ItemInstance[];
  dex?: number;
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
    abilities: { str: 14, dex: over.dex ?? 12, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
      slayerTalents: over.slayerTalents,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("compute() + Foil Scrutiny (unconditional +2 Bluff/Disguise)", () => {
  it("a slayer with Foil Scrutiny gets +2 on both Bluff and Disguise over an otherwise-identical slayer without it", () => {
    const base = compute(makeDoc({ classTag: "slayer", level: 2 }), ref);
    const withTalent = compute(
      makeDoc({ classTag: "slayer", level: 2, slayerTalents: ["foil_scrutiny"] }),
      ref,
    );
    expect(withTalent.skills.blf!.total - base.skills.blf!.total).toBe(2);
    expect(withTalent.skills.dis!.total - base.skills.dis!.total).toBe(2);
  });
});

describe("compute() + Armored Marauder (acpA, gated on @armor.type === 3)", () => {
  it("a 12th-level slayer in heavy armor gets a 2-point armor check penalty reduction (floor(12/6))", () => {
    const base = compute(makeDoc({ classTag: "slayer", level: 12, gear: [FULL_PLATE] }), ref);
    const withTalent = compute(
      makeDoc({
        classTag: "slayer",
        level: 12,
        gear: [FULL_PLATE],
        slayerTalents: ["armored_marauder"],
      }),
      ref,
    );
    // Climb (Str-based) uses ACP — full plate's -6 becomes -4 once reduced by 2.
    expect(base.skills.clm!.acp).toBe(-6);
    expect(withTalent.skills.clm!.acp).toBe(-4);
    expect(withTalent.skills.clm!.total - base.skills.clm!.total).toBe(2);
  });

  it("does nothing while NOT wearing heavy armor — the reduction is scoped to @armor.type === 3, per RAW ('any heavy armor the slayer wears')", () => {
    const lightArmor: ItemInstance = {
      equipped: true,
      name: "Leather Armor",
      armor: { slot: "armor", ac: 2, maxDex: 6, acp: 0, type: 1 },
    };
    const base = compute(makeDoc({ classTag: "slayer", level: 12, gear: [lightArmor] }), ref);
    const withTalent = compute(
      makeDoc({
        classTag: "slayer",
        level: 12,
        gear: [lightArmor],
        slayerTalents: ["armored_marauder"],
      }),
      ref,
    );
    expect(withTalent.skills.clm!.total).toBe(base.skills.clm!.total);
  });

  it("does nothing below 6th slayer level even in heavy armor (floor(5/6) === 0)", () => {
    const base = compute(makeDoc({ classTag: "slayer", level: 5, gear: [FULL_PLATE] }), ref);
    const withTalent = compute(
      makeDoc({
        classTag: "slayer",
        level: 5,
        gear: [FULL_PLATE],
        slayerTalents: ["armored_marauder"],
      }),
      ref,
    );
    expect(withTalent.skills.clm!.total).toBe(base.skills.clm!.total);
  });
});

describe("compute() + Armored Swiftness (mDexA, gated on @armor.type === 3)", () => {
  it("a 12th-level slayer in heavy armor (max Dex +1) with Dex 18 gets 2 more points of AC once the max-Dex cap is raised by floor(12/6)", () => {
    const base = compute(
      makeDoc({ classTag: "slayer", level: 12, gear: [FULL_PLATE], dex: 18 }),
      ref,
    );
    const withTalent = compute(
      makeDoc({
        classTag: "slayer",
        level: 12,
        gear: [FULL_PLATE],
        dex: 18,
        slayerTalents: ["armored_swiftness"],
      }),
      ref,
    );
    // Dex mod +4, base max-Dex cap 1 -> only +1 AC from Dex; talent raises the
    // cap to 3, so +3 AC from Dex applies instead — a 2-point AC swing.
    expect(withTalent.ac.normal - base.ac.normal).toBe(2);
  });
});

describe("collect.ts gating: unknown id / non-slayer", () => {
  it("an unrecognized slayer talent id is silently ignored (no crash, no effect)", () => {
    const doc = makeDoc({ classTag: "slayer", level: 12, slayerTalents: ["not-a-real-talent"] });
    expect(() => compute(doc, ref)).not.toThrow();
    const base = compute(makeDoc({ classTag: "slayer", level: 12 }), ref);
    const withUnknown = compute(doc, ref);
    expect(withUnknown.skills.blf!.total).toBe(base.skills.blf!.total);
  });

  it("a non-slayer's stale slayerTalents field grants nothing", () => {
    const doc = makeDoc({ classTag: "fighter", level: 5, slayerTalents: ["foil_scrutiny"] });
    const base = compute(makeDoc({ classTag: "fighter", level: 5 }), ref);
    const withStaleField = compute(doc, ref);
    expect(withStaleField.skills.blf!.total).toBe(base.skills.blf!.total);
  });

  it("collectGrantedFeatures still reports origin.kind 'slayerTalent' for a display-only pick", () => {
    const doc = makeDoc({ classTag: "slayer", level: 2, slayerTalents: ["poison_use"] });
    const granted = collectGrantedFeatures(doc, ref);
    const entry = granted.find((g) => g.grant.name === "Poison Use");
    expect(entry?.origin).toEqual({ kind: "slayerTalent", label: "Slayer Talent" });
  });
});
