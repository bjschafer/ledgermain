/**
 * Fixture tests for shard B of the bard archetype performance-variant table
 * (`bardic-performance-variants/shardB.ts`) — demagogue, detective,
 * dirge-bard, disciple-of-the-forked-tongue, dragon-herald, dragon-yapper,
 * duettist, fey-courtier, fey-prankster, filidh, first-world-minstrel,
 * flame-dancer, and fortune-teller. Dawnflower Dervish and Dervish Dancer are
 * deliberately excluded: both redefine bardic performance into a self-only
 * "battle dance," which this merge mechanism doesn't support (see shardB.ts's
 * doc comment).
 *
 * None of shard B's entries carry real numeric `Change`s — every one of
 * these thirteen archetypes' performance-shaped abilities is enemy/ally
 * facing (a save DC, a penalty or bonus on someone else) or a reactive
 * check/resource substitute, so there's nothing to hand-compute through
 * `compute()`; these tests instead verify the toggle list itself: removed
 * base ids drop out, variant ids appear at (and only at) the right level, and
 * Inspire Courage removal is tracked where RAW replaces it.
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

describe("bard:dawnflower-dervish / bard:dervish-dancer (not modeled)", () => {
  it("battle-dance archetypes redefine the whole pool, so no shard entry exists for either and the base list is unaffected", () => {
    const base = ids(20, "bard:no-archetype-fixture");
    expect(ids(20, "bard:dawnflower-dervish")).toEqual(base);
    expect(ids(20, "bard:dervish-dancer")).toEqual(base);
  });
});

describe("bard:demagogue", () => {
  const arch = "bard:demagogue";

  it("drops suggestion and mass suggestion, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:suggestion");
    expect(list).not.toContain("bardicPerformance:massSuggestion");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains inciteViolence at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:demagogue:inciteViolence");
    expect(ids(6, arch)).toContain("bardicPerformance:demagogue:inciteViolence");
  });

  it("gains righteousCause at 18th, not before", () => {
    expect(ids(17, arch)).not.toContain("bardicPerformance:demagogue:righteousCause");
    expect(ids(18, arch)).toContain("bardicPerformance:demagogue:righteousCause");
  });
});

describe("bard:detective", () => {
  const arch = "bard:detective";

  it("drops inspire greatness and inspire heroics, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireGreatness");
    expect(list).not.toContain("bardicPerformance:inspireHeroics");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains carefulTeamwork at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:detective:carefulTeamwork");
  });

  it("gains trueConfession at 9th, not before", () => {
    expect(ids(8, arch)).not.toContain("bardicPerformance:detective:trueConfession");
    expect(ids(9, arch)).toContain("bardicPerformance:detective:trueConfession");
  });

  it("gains showYourselves at 15th, not before", () => {
    expect(ids(14, arch)).not.toContain("bardicPerformance:detective:showYourselves");
    expect(ids(15, arch)).toContain("bardicPerformance:detective:showYourselves");
  });
});

describe("bard:dirge-bard", () => {
  const arch = "bard:dirge-bard";

  it("removes no base performance tags (Jack of All Trades isn't a tracked performance) and does not remove Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).toContain("bardicPerformance:countersong");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });

  it("gains danceOfTheDead at 10th, not before", () => {
    expect(ids(9, arch)).not.toContain("bardicPerformance:dirge-bard:danceOfTheDead");
    expect(ids(10, arch)).toContain("bardicPerformance:dirge-bard:danceOfTheDead");
  });
});

describe("bard:disciple-of-the-forked-tongue", () => {
  const arch = "bard:disciple-of-the-forked-tongue";

  it("drops inspire greatness, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:inspireGreatness");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains discordantSpiral at 1st", () => {
    expect(ids(1, arch)).toContain(
      "bardicPerformance:disciple-of-the-forked-tongue:discordantSpiral",
    );
  });

  it("gains venomousWhispers at 9th, not before", () => {
    expect(ids(8, arch)).not.toContain(
      "bardicPerformance:disciple-of-the-forked-tongue:venomousWhispers",
    );
    expect(ids(9, arch)).toContain(
      "bardicPerformance:disciple-of-the-forked-tongue:venomousWhispers",
    );
  });
});

describe("bard:dragon-herald", () => {
  const arch = "bard:dragon-herald";

  it("drops countersong, fascinate, inspire competence, soothing performance, and inspire heroics", () => {
    const list = ids(20, arch);
    for (const tag of [
      "countersong",
      "fascinate",
      "inspireCompetence",
      "soothingPerformance",
      "inspireHeroics",
    ]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains diplomaticImmunity at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:dragon-herald:diplomaticImmunity");
  });

  it("gains diplomaticProtection at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:dragon-herald:diplomaticProtection");
    expect(ids(3, arch)).toContain("bardicPerformance:dragon-herald:diplomaticProtection");
  });

  it("gains rebukeFoes at 12th, not before", () => {
    expect(ids(11, arch)).not.toContain("bardicPerformance:dragon-herald:rebukeFoes");
    expect(ids(12, arch)).toContain("bardicPerformance:dragon-herald:rebukeFoes");
  });
});

describe("bard:dragon-yapper", () => {
  const arch = "bard:dragon-yapper";

  it("drops fascinate and dirge of doom", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:fascinate");
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
  });

  it("gains yappingSong at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:dragon-yapper:yappingSong");
  });

  it("gains frightfulSong at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:dragon-yapper:frightfulSong");
    expect(ids(8, arch)).toContain("bardicPerformance:dragon-yapper:frightfulSong");
  });
});

describe("bard:duettist", () => {
  const arch = "bard:duettist";

  it("drops dirge of doom and frightening tune, and grants no archetype-specific toggle", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(list).not.toContain("bardicPerformance:frighteningTune");
    expect(list.some((id) => id.startsWith("bardicPerformance:duettist:"))).toBe(false);
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });
});

describe("bard:fey-courtier", () => {
  const arch = "bard:fey-courtier";

  it("drops dirge of doom, frightening tune, inspire heroics, and inspire competence", () => {
    const list = ids(20, arch);
    for (const tag of ["dirgeOfDoom", "frighteningTune", "inspireHeroics", "inspireCompetence"]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains scornOfTheWilds at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:fey-courtier:scornOfTheWilds");
    expect(ids(8, arch)).toContain("bardicPerformance:fey-courtier:scornOfTheWilds");
  });

  it("gains stoneDance at 15th, not before", () => {
    expect(ids(14, arch)).not.toContain("bardicPerformance:fey-courtier:stoneDance");
    expect(ids(15, arch)).toContain("bardicPerformance:fey-courtier:stoneDance");
  });
});

describe("bard:fey-prankster", () => {
  const arch = "bard:fey-prankster";

  it("drops countersong and dirge of doom, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:countersong");
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains songOfClumsiness and inciteUnreliability at 1st", () => {
    const list = ids(1, arch);
    expect(list).toContain("bardicPerformance:fey-prankster:songOfClumsiness");
    expect(list).toContain("bardicPerformance:fey-prankster:inciteUnreliability");
  });

  it("gains embarrassingSatire at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:fey-prankster:embarrassingSatire");
    expect(ids(8, arch)).toContain("bardicPerformance:fey-prankster:embarrassingSatire");
  });
});

describe("bard:filidh", () => {
  const arch = "bard:filidh";

  it("drops suggestion, dirge of doom, inspire heroics, and deadly performance, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    for (const tag of ["suggestion", "dirgeOfDoom", "inspireHeroics", "deadlyPerformance"]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains echoesOfNaturesSong at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:filidh:echoesOfNaturesSong");
  });

  it("gains divinatorySong at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:filidh:divinatorySong");
    expect(ids(6, arch)).toContain("bardicPerformance:filidh:divinatorySong");
  });

  it("gains voicesOfLife at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:filidh:voicesOfLife");
    expect(ids(8, arch)).toContain("bardicPerformance:filidh:voicesOfLife");
  });

  it("gains unityOfLife at 15th, not before", () => {
    expect(ids(14, arch)).not.toContain("bardicPerformance:filidh:unityOfLife");
    expect(ids(15, arch)).toContain("bardicPerformance:filidh:unityOfLife");
  });

  it("gains songOfTheCycle at 20th, not before", () => {
    expect(ids(19, arch)).not.toContain("bardicPerformance:filidh:songOfTheCycle");
    expect(ids(20, arch)).toContain("bardicPerformance:filidh:songOfTheCycle");
  });
});

describe("bard:first-world-minstrel", () => {
  const arch = "bard:first-world-minstrel";

  it("drops dirge of doom, and removes Inspire Courage", () => {
    const list = ids(20, arch);
    expect(list).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(bardVariantRemovesInspireCourage([arch])).toBe(true);
  });

  it("gains echoesOfTheFirstWorld at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:first-world-minstrel:echoesOfTheFirstWorld");
  });

  it("gains gremlinsLuck at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:first-world-minstrel:gremlinsLuck");
    expect(ids(8, arch)).toContain("bardicPerformance:first-world-minstrel:gremlinsLuck");
  });
});

describe("bard:flame-dancer", () => {
  const arch = "bard:flame-dancer";

  it("drops countersong, inspire competence, suggestion, and dirge of doom", () => {
    const list = ids(20, arch);
    for (const tag of ["countersong", "inspireCompetence", "suggestion", "dirgeOfDoom"]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("gains fireDance at 1st", () => {
    expect(ids(1, arch)).toContain("bardicPerformance:flame-dancer:fireDance");
  });

  it("gains songOfTheFieryGaze at 3rd, not before", () => {
    expect(ids(2, arch)).not.toContain("bardicPerformance:flame-dancer:songOfTheFieryGaze");
    expect(ids(3, arch)).toContain("bardicPerformance:flame-dancer:songOfTheFieryGaze");
  });

  it("gains fireBreak at 6th, not before", () => {
    expect(ids(5, arch)).not.toContain("bardicPerformance:flame-dancer:fireBreak");
    expect(ids(6, arch)).toContain("bardicPerformance:flame-dancer:fireBreak");
  });
});

describe("bard:fortune-teller", () => {
  const arch = "bard:fortune-teller";

  it("drops countersong, distraction, and dirge of doom, and grants only transparentFate", () => {
    const list = ids(20, arch);
    for (const tag of ["countersong", "distraction", "dirgeOfDoom"]) {
      expect(list).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(list.filter((id) => id.startsWith("bardicPerformance:fortune-teller:"))).toEqual([
      "bardicPerformance:fortune-teller:transparentFate",
    ]);
  });

  it("gains transparentFate at 8th, not before", () => {
    expect(ids(7, arch)).not.toContain("bardicPerformance:fortune-teller:transparentFate");
    expect(ids(8, arch)).toContain("bardicPerformance:fortune-teller:transparentFate");
  });

  it("does not remove Inspire Courage", () => {
    expect(bardVariantRemovesInspireCourage([arch])).toBe(false);
  });
});
