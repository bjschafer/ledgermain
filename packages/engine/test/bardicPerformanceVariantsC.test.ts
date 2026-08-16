/**
 * Hand-computed fixture tests for shard C of the bard archetype
 * performance-variant table (`packages/engine/src/bardic-performance-variants/shardC.ts`):
 * hatharat-agent, hoaxer, impervious-messenger, luring-piper, magician,
 * masked-performer, mute-musician, negotiator, phrenologist, plant-speaker,
 * and prankster. Follows the pattern in `bardicPerformances.test.ts`.
 *
 * Numbers verified against aonprd.com / d20pfsrd's mirror of the Core
 * Rulebook-era Ultimate Intrigue and other bard archetype text (2026-08-16):
 * Impervious Messenger's Song of Subterfuge replaces both suggestion and
 * mass suggestion, and Unbroken Stride replaces both dirge of doom and
 * frightening tune; Masked Performer's Seamless Guise replaces countersong,
 * Exaggerated Pose replaces inspire competence, Stage Combat replaces
 * suggestion, and Multiplicity of Masks replaces mass suggestion; Mute
 * Musician's Symphony of Silence replaces inspire competence, Maddening
 * Harmonics replaces frightening tune, Song of the Conjunction replaces
 * mass suggestion, and Ceaseless Performance (an action-economy modifier,
 * not itself a performance def in this table) replaces inspire heroics.
 * Lotus Geisha and Provocateur, this shard's other two assigned archetypes,
 * carry no entry at all (see shardC.ts's file doc comment for why).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  bardicPerformanceToggleOptions,
  bardVariantRemovesInspireCourage,
} from "../src/bardic-performances.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  level: number;
  activeBuffs?: ActiveBuff[];
  skillRanks?: Record<string, number>;
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
      classes: [{ tag: "bard", level: opts.level }],
    },
    abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
    build: {
      feats: [],
      skillRanks: opts.skillRanks ?? {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

/** Builds an ActiveBuff from a variant's merged toggle option, for compute()-level fixtures. */
function variantBuff(archetypeIds: string[], id: string, level: number): ActiveBuff {
  const opt = bardicPerformanceToggleOptions(level, archetypeIds).find((o) => o.id === id);
  if (!opt) throw new Error(`variant toggle not found: ${id} at level ${level}`);
  return {
    instanceId: `buff-${id}`,
    effectTag: id,
    name: opt.name,
    changes: opt.changes,
    contextNotes: opt.contextNotes,
  };
}

describe("shard C: bard:hatharat-agent", () => {
  const ids = ["bard:hatharat-agent"];

  it("drops dirge of doom, adds Master of Manipulation at 8th, not before", () => {
    const at7 = bardicPerformanceToggleOptions(7, ids).map((o) => o.id);
    expect(at7).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(at7).not.toContain("bardicPerformance:hatharat-agent:masterOfManipulation");

    const at8 = bardicPerformanceToggleOptions(8, ids).map((o) => o.id);
    expect(at8).toContain("bardicPerformance:hatharat-agent:masterOfManipulation");
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage(ids)).toBe(false);
  });
});

describe("shard C: bard:hoaxer", () => {
  const ids = ["bard:hoaxer"];

  it("drops countersong, distraction, inspire competence, and inspire greatness; removes Inspire Courage", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:countersong");
    expect(options).not.toContain("bardicPerformance:distraction");
    expect(options).not.toContain("bardicPerformance:inspireCompetence");
    expect(options).not.toContain("bardicPerformance:inspireGreatness");
    expect(bardVariantRemovesInspireCourage(ids)).toBe(true);
  });

  it("gains Bad Deal, Buyer Beware, and Personal Guarantee at 1st; Curse Breaker only at 12th", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:hoaxer:badDeal");
    expect(at1).toContain("bardicPerformance:hoaxer:buyerBeware");
    expect(at1).toContain("bardicPerformance:hoaxer:personalGuarantee");
    expect(at1).not.toContain("bardicPerformance:hoaxer:curseBreaker");

    const at12 = bardicPerformanceToggleOptions(12, ids).map((o) => o.id);
    expect(at12).toContain("bardicPerformance:hoaxer:curseBreaker");
  });
});

describe("shard C: bard:impervious-messenger", () => {
  const ids = ["bard:impervious-messenger"];

  it("drops suggestion, mass suggestion, dirge of doom, and frightening tune", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:suggestion");
    expect(options).not.toContain("bardicPerformance:massSuggestion");
    expect(options).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(options).not.toContain("bardicPerformance:frighteningTune");
  });

  it("gains Song of Subterfuge at 6th, Unbroken Stride at 8th", () => {
    const at5 = bardicPerformanceToggleOptions(5, ids).map((o) => o.id);
    expect(at5).not.toContain("bardicPerformance:impervious-messenger:songOfSubterfuge");

    const at6 = bardicPerformanceToggleOptions(6, ids).map((o) => o.id);
    expect(at6).toContain("bardicPerformance:impervious-messenger:songOfSubterfuge");
    expect(at6).not.toContain("bardicPerformance:impervious-messenger:unbrokenStride");

    const at8 = bardicPerformanceToggleOptions(8, ids).map((o) => o.id);
    expect(at8).toContain("bardicPerformance:impervious-messenger:unbrokenStride");
  });

  // Unbroken Stride, RAW: "an insight bonus equal to half his bard level" on
  // Acrobatics/Climb/Fly/Ride, plus a +10-foot enhancement bonus to land
  // speed (+30 feet at 12th level or higher).
  it("Unbroken Stride at bard L8: +4 insight on Acrobatics/Climb/Fly/Ride, +10 land speed", () => {
    const noBuff = compute(makeDoc({ level: 8 }), ref);
    const withBuff = compute(
      makeDoc({
        level: 8,
        activeBuffs: [variantBuff(ids, "bardicPerformance:impervious-messenger:unbrokenStride", 8)],
      }),
      ref,
    );
    expect(withBuff.skills["acr"]!.total - noBuff.skills["acr"]!.total).toBe(4);
    expect(withBuff.skills["clm"]!.total - noBuff.skills["clm"]!.total).toBe(4);
    expect(withBuff.skills["fly"]!.total - noBuff.skills["fly"]!.total).toBe(4);
    expect(withBuff.skills["rid"]!.total - noBuff.skills["rid"]!.total).toBe(4);
    expect((withBuff.speeds.land ?? 0) - (noBuff.speeds.land ?? 0)).toBe(10);
  });

  it("Unbroken Stride at bard L12: +6 insight, +30 land speed", () => {
    const noBuff = compute(makeDoc({ level: 12 }), ref);
    const withBuff = compute(
      makeDoc({
        level: 12,
        activeBuffs: [
          variantBuff(ids, "bardicPerformance:impervious-messenger:unbrokenStride", 12),
        ],
      }),
      ref,
    );
    expect(withBuff.skills["acr"]!.total - noBuff.skills["acr"]!.total).toBe(6);
    expect((withBuff.speeds.land ?? 0) - (noBuff.speeds.land ?? 0)).toBe(30);
  });
});

describe("shard C: bard:luring-piper", () => {
  const ids = ["bard:luring-piper"];

  it("drops only soothing performance, adds Fey-Wounding Song at 12th", () => {
    const at11 = bardicPerformanceToggleOptions(11, ids).map((o) => o.id);
    expect(at11).not.toContain("bardicPerformance:soothingPerformance");
    expect(at11).toContain("bardicPerformance:fascinate");
    expect(at11).toContain("bardicPerformance:suggestion");
    expect(at11).not.toContain("bardicPerformance:luring-piper:feyWoundingSong");

    const at12 = bardicPerformanceToggleOptions(12, ids).map((o) => o.id);
    expect(at12).toContain("bardicPerformance:luring-piper:feyWoundingSong");
  });
});

describe("shard C: bard:magician", () => {
  const ids = ["bard:magician"];

  it("drops countersong, dirge of doom, and frightening tune; removes Inspire Courage", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:countersong");
    expect(options).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(options).not.toContain("bardicPerformance:frighteningTune");
    expect(bardVariantRemovesInspireCourage(ids)).toBe(true);
  });

  it("gains Dweomercraft at 1st, Spell Suppression at 8th, Metamagic Mastery at 14th", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:magician:dweomercraft");

    const at13 = bardicPerformanceToggleOptions(13, ids).map((o) => o.id);
    expect(at13).toContain("bardicPerformance:magician:spellSuppression");
    expect(at13).not.toContain("bardicPerformance:magician:metamagicMastery");

    const at14 = bardicPerformanceToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("bardicPerformance:magician:metamagicMastery");
  });

  it("Dweomercraft carries no self-facing Change (RAW: allies only, not the magician)", () => {
    const dweomercraft = bardicPerformanceToggleOptions(1, ids).find(
      (o) => o.id === "bardicPerformance:magician:dweomercraft",
    )!;
    expect(dweomercraft.changes).toEqual([]);
  });
});

describe("shard C: bard:masked-performer", () => {
  const ids = ["bard:masked-performer"];

  it("drops countersong, inspire competence, suggestion, and mass suggestion", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:countersong");
    expect(options).not.toContain("bardicPerformance:inspireCompetence");
    expect(options).not.toContain("bardicPerformance:suggestion");
    expect(options).not.toContain("bardicPerformance:massSuggestion");
  });

  it("gains Seamless Guise at 1st, Exaggerated Pose at 3rd, Stage Combat at 6th, Multiplicity of Masks at 18th", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:masked-performer:seamlessGuise");
    expect(at1).not.toContain("bardicPerformance:masked-performer:exaggeratedPose");

    const at18 = bardicPerformanceToggleOptions(18, ids).map((o) => o.id);
    expect(at18).toContain("bardicPerformance:masked-performer:exaggeratedPose");
    expect(at18).toContain("bardicPerformance:masked-performer:stageCombat");
    expect(at18).toContain("bardicPerformance:masked-performer:multiplicityOfMasks");
  });

  // Seamless Guise, RAW: "a +10 bonus on Disguise and Perform (act) checks",
  // no bonus type stated, modeled as untyped per this engine's convention
  // for RAW-silent bonus types.
  it("Seamless Guise: +10 untyped on Disguise and Perform (act)", () => {
    // Perform (act) is a named skill instance; it only gets a row once the
    // character has ranks in it, so the fixture seeds one.
    const ranks = { "prf.act": 1 };
    const noBuff = compute(makeDoc({ level: 1, skillRanks: ranks }), ref);
    const withBuff = compute(
      makeDoc({
        level: 1,
        skillRanks: ranks,
        activeBuffs: [variantBuff(ids, "bardicPerformance:masked-performer:seamlessGuise", 1)],
      }),
      ref,
    );
    expect(withBuff.skills["dis"]!.total - noBuff.skills["dis"]!.total).toBe(10);
    expect(withBuff.skills["prf.act"]!.total - noBuff.skills["prf.act"]!.total).toBe(10);
  });

  it("Seamless Guise's bonus is untyped, so it stacks unchanged at any level", () => {
    const noBuff = compute(makeDoc({ level: 10 }), ref);
    const withBuff = compute(
      makeDoc({
        level: 10,
        activeBuffs: [variantBuff(ids, "bardicPerformance:masked-performer:seamlessGuise", 10)],
      }),
      ref,
    );
    expect(withBuff.skills["dis"]!.total - noBuff.skills["dis"]!.total).toBe(10);
  });
});

describe("shard C: bard:mute-musician", () => {
  const ids = ["bard:mute-musician"];

  it("drops inspire competence, frightening tune, mass suggestion, and inspire heroics", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:inspireCompetence");
    expect(options).not.toContain("bardicPerformance:frighteningTune");
    expect(options).not.toContain("bardicPerformance:massSuggestion");
    expect(options).not.toContain("bardicPerformance:inspireHeroics");
  });

  it("gains Symphony of Silence at 3rd, Maddening Harmonics at 14th, Song of the Conjunction at 18th", () => {
    const at2 = bardicPerformanceToggleOptions(2, ids).map((o) => o.id);
    expect(at2).not.toContain("bardicPerformance:mute-musician:symphonyOfSilence");

    const at3 = bardicPerformanceToggleOptions(3, ids).map((o) => o.id);
    expect(at3).toContain("bardicPerformance:mute-musician:symphonyOfSilence");

    const at17 = bardicPerformanceToggleOptions(17, ids).map((o) => o.id);
    expect(at17).toContain("bardicPerformance:mute-musician:maddeningHarmonics");
    expect(at17).not.toContain("bardicPerformance:mute-musician:songOfTheConjunction");

    const at18 = bardicPerformanceToggleOptions(18, ids).map((o) => o.id);
    expect(at18).toContain("bardicPerformance:mute-musician:songOfTheConjunction");
  });

  it("Symphony of Silence carries no Change (scoped-save bonus this engine can't target)", () => {
    const def = bardicPerformanceToggleOptions(3, ids).find(
      (o) => o.id === "bardicPerformance:mute-musician:symphonyOfSilence",
    )!;
    expect(def.changes).toEqual([]);
  });
});

describe("shard C: bard:negotiator", () => {
  const ids = ["bard:negotiator"];

  it("drops inspire greatness and removes Inspire Courage", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:inspireGreatness");
    expect(bardVariantRemovesInspireCourage(ids)).toBe(true);
  });

  it("gains Fast Talk at 1st, Binding Contract at 9th, not before", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:negotiator:fastTalk");
    expect(at1).not.toContain("bardicPerformance:negotiator:bindingContract");

    const at9 = bardicPerformanceToggleOptions(9, ids).map((o) => o.id);
    expect(at9).toContain("bardicPerformance:negotiator:bindingContract");
  });
});

describe("shard C: bard:phrenologist", () => {
  const ids = ["bard:phrenologist"];

  it("drops inspire competence and removes Inspire Courage", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:inspireCompetence");
    expect(bardVariantRemovesInspireCourage(ids)).toBe(true);
  });

  it("gains Skull Sonata at 1st, In Your Head at 3rd", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:phrenologist:skullSonata");
    expect(at1).not.toContain("bardicPerformance:phrenologist:inYourHead");

    const at3 = bardicPerformanceToggleOptions(3, ids).map((o) => o.id);
    expect(at3).toContain("bardicPerformance:phrenologist:inYourHead");
  });
});

describe("shard C: bard:plant-speaker", () => {
  const ids = ["bard:plant-speaker"];

  it("drops only inspire greatness, adds Mystical Allegory at 5th and Leshy Speaker at 9th", () => {
    const at8 = bardicPerformanceToggleOptions(8, ids).map((o) => o.id);
    expect(at8).not.toContain("bardicPerformance:inspireGreatness");
    expect(at8).toContain("bardicPerformance:plant-speaker:mysticalAllegory");
    expect(at8).not.toContain("bardicPerformance:plant-speaker:leshySpeaker");

    const at9 = bardicPerformanceToggleOptions(9, ids).map((o) => o.id);
    expect(at9).toContain("bardicPerformance:plant-speaker:leshySpeaker");
  });
});

describe("shard C: bard:prankster", () => {
  const ids = ["bard:prankster"];

  it("drops fascinate, suggestion, and mass suggestion", () => {
    const options = bardicPerformanceToggleOptions(20, ids).map((o) => o.id);
    expect(options).not.toContain("bardicPerformance:fascinate");
    expect(options).not.toContain("bardicPerformance:suggestion");
    expect(options).not.toContain("bardicPerformance:massSuggestion");
  });

  it("gains Mock at 1st, Punchline at 6th, Mass Punchline at 18th", () => {
    const at1 = bardicPerformanceToggleOptions(1, ids).map((o) => o.id);
    expect(at1).toContain("bardicPerformance:prankster:mock");
    expect(at1).not.toContain("bardicPerformance:prankster:punchline");

    const at6 = bardicPerformanceToggleOptions(6, ids).map((o) => o.id);
    expect(at6).toContain("bardicPerformance:prankster:punchline");
    expect(at6).not.toContain("bardicPerformance:prankster:massPunchline");

    const at18 = bardicPerformanceToggleOptions(18, ids).map((o) => o.id);
    expect(at18).toContain("bardicPerformance:prankster:massPunchline");
  });
});

describe("shard C: archetypes with no entry", () => {
  it("Lotus Geisha and Provocateur leave the base list untouched", () => {
    const base = bardicPerformanceToggleOptions(20).map((o) => o.id);
    const geisha = bardicPerformanceToggleOptions(20, ["bard:lotus-geisha"]).map((o) => o.id);
    const provocateur = bardicPerformanceToggleOptions(20, ["bard:provocateur"]).map((o) => o.id);
    expect(geisha).toEqual(base);
    expect(provocateur).toEqual(base);
  });
});
