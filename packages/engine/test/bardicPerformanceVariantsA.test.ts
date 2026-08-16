/**
 * Fixture tests for shard A of the bard archetype performance-variant table
 * (`bardic-performance-variants/shardA.ts`) — animal-speaker, arcane-duelist,
 * archivist, argent-voice, arrowsong-minstrel, averaka-arbiter, buccaneer,
 * celebrity, chelish-diva, chronicler-of-worlds, court-bard, court-fool, and
 * cultivator. Busker is deliberately excluded: its "busker stunts" ability
 * redefines the whole Bardic Performance pool rather than swapping individual
 * performance types, which this merge mechanism doesn't support (see
 * shardA.ts's doc comment).
 *
 * None of shard A's entries carry real numeric `Change`s — every one of these
 * thirteen archetypes' performance-shaped abilities is either enemy/ally
 * facing (a save DC, a penalty on someone else, a summoned effect) or a
 * reactive check substitute with a variable roll (Countersong's shape), so
 * there's nothing to hand-compute through `compute()`; these tests instead
 * verify the toggle list itself: removed base ids drop out, variant ids
 * appear at (and only at) the right level, and Inspire Courage removal is
 * tracked where RAW replaces it.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  bardicPerformanceToggleOptions,
  bardVariantRemovesInspireCourage,
} from "../src/bardic-performances.js";

// Loaded for its side effect of validating vendored data is available in this
// test environment, matching the sibling suites' pattern.
loadRefData();

function ids(level: number, archetypeId: string): string[] {
  return bardicPerformanceToggleOptions(level, [archetypeId]).map((o) => o.id);
}

describe("bard:animal-speaker", () => {
  const arch = "bard:animal-speaker";

  it("drops fascinate, inspire competence, suggestion, and mass suggestion at L20", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:fascinate");
    expect(list).not.toContain("bardicPerformance:inspireCompetence");
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
  });

  it("gains soothingPerformance at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:animal-speaker:soothingPerformance");
    expect(ids(3, arch)).toContain("bardicPerformance:animal-speaker:soothingPerformance");
  });

  it("gains attractRats at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:animal-speaker:attractRats");
    expect(ids(6, arch)).toContain("bardicPerformance:animal-speaker:attractRats");
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });
});

describe("bard:arcane-duelist", () => {
  const arch = "bard:arcane-duelist";

  it("drops countersong, suggestion, and mass suggestion", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:countersong");
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
  });

  it("gains rallyingCry at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:arcane-duelist:rallyingCry");
  });

  it("gains bladethirst at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:arcane-duelist:bladethirst");
    expect(ids(6, arch)).toContain("bardicPerformance:arcane-duelist:bladethirst");
  });

  it("gains massBladethirst at 18th, not before", () => {
    expect(ids(17, arch)).not.toContain("bardicPerformance:arcane-duelist:massBladethirst");
    expect(ids(18, arch)).toContain("bardicPerformance:arcane-duelist:massBladethirst");
  });
});

describe("bard:archivist", () => {
  const arch = "bard:archivist";

  it("drops suggestion and mass suggestion, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains naturalist at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:archivist:naturalist");
  });

  it("gains lamentableBelaborment at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:archivist:lamentableBelaborment");
    expect(ids(6, arch)).toContain("bardicPerformance:archivist:lamentableBelaborment");
  });

  it("gains pedanticLecture at 18th, not before", () => {
    expect(ids(17, arch)).not.toContain("bardicPerformance:archivist:pedanticLecture");
    expect(ids(18, arch)).toContain("bardicPerformance:archivist:pedanticLecture");
  });
});

describe("bard:argent-voice", () => {
  const arch = "bard:argent-voice";

  // removesTags verified against aonprd.com/d20pfsrd.com — the vendored
  // archetype-feature text for this archetype omits its "replaces" sentences.
  it("drops fascinate, suggestion, mass suggestion, dirge of doom, and frightening tune", () => {
    const list = ids(20, arch);
    for (const tag of [
      "fascinate",
      "suggestion",
      "massSuggestion",
      "dirgeOfDoom",
      "frighteningTune",
    ]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains limningVerse at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:argent-voice:limningVerse");
  });

  it("gains shatteringCrescendo at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:argent-voice:shatteringCrescendo");
    expect(ids(6, arch)).toContain("bardicPerformance:argent-voice:shatteringCrescendo");
  });

  it("gains devilbaneRefrain at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:argent-voice:devilbaneRefrain");
    expect(ids(8, arch)).toContain("bardicPerformance:argent-voice:devilbaneRefrain");
  });
});

describe("bard:arrowsong-minstrel", () => {
  const arch = "bard:arrowsong-minstrel";

  // removesTags verified against aonprd.com/d20pfsrd.com: Arcane Archery
  // (1st) alone drops five base performance types, none of which appear in
  // the vendored feature description's "replaces" sentence (it has none).
  it("drops dirge of doom, distraction, fascinate, inspire competence, and soothing performance at L1", () => {
    const list = ids(1, arch);
    for (const tag of [
      "dirgeOfDoom",
      "distraction",
      "fascinate",
      "inspireCompetence",
      "soothingPerformance",
    ]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
    // Countersong is untouched by this archetype.
    expect(list).toContain("bardicPerformance:countersong");
  });

  it("also drops suggestion and mass suggestion (Arrowsong Strike, 6th)", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
  });

  it("grants no archetype-specific toggle: neither Arcane Archery nor Arrowsong Strike is itself a performance", () => {
    const list = ids(20, arch);
    expect(list.some((id) => id.startsWith("bardicPerformance:arrowsong-minstrel:"))).toBe(false);
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });
});

describe("bard:averaka-arbiter", () => {
  const arch = "bard:averaka-arbiter";

  it("drops inspire competence and dirge of doom", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireCompetence");
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
  });

  it("gains inspireTeamwork at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:averaka-arbiter:inspireTeamwork");
    expect(ids(3, arch)).toContain("bardicPerformance:averaka-arbiter:inspireTeamwork");
  });

  it("gains ritualOfReconciliation at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:averaka-arbiter:ritualOfReconciliation");
    expect(ids(8, arch)).toContain("bardicPerformance:averaka-arbiter:ritualOfReconciliation");
  });
});

describe("bard:buccaneer", () => {
  const arch = "bard:buccaneer";

  it("drops suggestion and mass suggestion", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
  });

  it("gains songOfSurrender at 4th, not before", () => {
    expect(ids(3, arch)).not.toContain("bardicPerformance:buccaneer:songOfSurrender");
    expect(ids(4, arch)).toContain("bardicPerformance:buccaneer:songOfSurrender");
  });

  it("gains massSongOfSurrender at 18th, not before", () => {
    expect(ids(17, arch)).not.toContain("bardicPerformance:buccaneer:massSongOfSurrender");
    expect(ids(18, arch)).toContain("bardicPerformance:buccaneer:massSongOfSurrender");
  });
});

describe("bard:busker (not modeled)", () => {
  it("busker-stunts redefines the whole pool, so no shard entry exists for it and the base list is unaffected", () => {
    const base = ids(20, "bard:no-archetype-fixture");
    const withBusker = ids(20, "bard:busker");
    expect(withBusker).toEqual(base);
  });
});

describe("bard:celebrity", () => {
  const arch = "bard:celebrity";

  it("drops dirge of doom and grants no archetype-specific toggle (Shining Star only enhances base Fascinate)", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(list.some((id) => id.startsWith("bardicPerformance:celebrity:"))).toBe(false);
    // Fascinate itself is untouched.
    expect(list).toContain("bardicPerformance:fascinate");
  });
});

describe("bard:chelish-diva", () => {
  const arch = "bard:chelish-diva";

  it("drops inspire competence and dirge of doom", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireCompetence");
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
  });

  it("gains devastatingAria at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:chelish-diva:devastatingAria");
    expect(ids(3, arch)).toContain("bardicPerformance:chelish-diva:devastatingAria");
  });

  it("gains scathingTirade at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:chelish-diva:scathingTirade");
    expect(ids(8, arch)).toContain("bardicPerformance:chelish-diva:scathingTirade");
  });
});

describe("bard:chronicler-of-worlds", () => {
  const arch = "bard:chronicler-of-worlds";

  // removesTags verified against aonprd.com/d20pfsrd.com — the vendored
  // archetype-feature text for this archetype omits its "replaces" sentences.
  it("drops inspire greatness and inspire heroics", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireGreatness");
    expect(list).not.toContain("bardicPerformance:inspireHeroics");
  });

  it("gains quintessenceInfusion at 9th, not before", () => {
    expect(ids(8, arch)).not.toContain(
      "bardicPerformance:chronicler-of-worlds:quintessenceInfusion",
    );
    expect(ids(9, arch)).toContain("bardicPerformance:chronicler-of-worlds:quintessenceInfusion");
  });

  it("gains mantraOfTabris at 15th, not before", () => {
    expect(ids(14, arch)).not.toContain("bardicPerformance:chronicler-of-worlds:mantraOfTabris");
    expect(ids(15, arch)).toContain("bardicPerformance:chronicler-of-worlds:mantraOfTabris");
  });
});

describe("bard:court-bard", () => {
  const arch = "bard:court-bard";

  it("drops inspire competence, dirge of doom, and frightening tune, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireCompetence");
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(list).not.toContain("bardicPerformance:frighteningTune");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains satire at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:court-bard:satire");
  });

  it("gains mockery at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:court-bard:mockery");
    expect(ids(3, arch)).toContain("bardicPerformance:court-bard:mockery");
  });

  it("gains gloriousEpic at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:court-bard:gloriousEpic");
    expect(ids(8, arch)).toContain("bardicPerformance:court-bard:gloriousEpic");
  });

  it("gains scandal at 14th, not before", () => {
    expect(ids(13, arch)).not.toContain("bardicPerformance:court-bard:scandal");
    expect(ids(14, arch)).toContain("bardicPerformance:court-bard:scandal");
  });
});

describe("bard:court-fool", () => {
  const arch = "bard:court-fool";

  it("drops countersong and inspire competence", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:countersong");
    expect(list).not.toContain("bardicPerformance:inspireCompetence");
  });

  it("gains distractingMotley at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:court-fool:distractingMotley");
  });

  it("gains defuseTension at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:court-fool:defuseTension");
    expect(ids(3, arch)).toContain("bardicPerformance:court-fool:defuseTension");
  });
});

describe("bard:cultivator", () => {
  const arch = "bard:cultivator";

  it("drops countersong and grants songOfGrowth at 1st", () => {
    const list = ids(1, arch);
    expect(list).not.toContain("bardicPerformance:countersong");
    expect(list).toContain("bardicPerformance:cultivator:songOfGrowth");
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });
});
