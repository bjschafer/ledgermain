/**
 * Fixture tests for shard E's bard archetype performance variants
 * (sound-striker, speaker-of-the-palatine-eye, stonesinger, street-performer,
 * studious-librarian, thundercaller, voice-of-brigh, voice-of-the-wild,
 * watersinger, wit). See `bardic-performance-variants/shardE.ts` for the
 * per-archetype rules citations. None of this shard's archetypes have a
 * legitimate self-facing target, so every variant def is note-tier
 * (`changes: []`) — these tests check id presence/level-gating and the base
 * tags each archetype drops, mirroring `bardicPerformances.test.ts`'s
 * level-filtering patterns.
 */

import { describe, expect, it } from "bun:test";

import {
  bardicPerformanceToggleOptions,
  bardVariantRemovesInspireCourage,
} from "../src/bardic-performances.js";

function idsAt(level: number, archetypeId: string): string[] {
  return bardicPerformanceToggleOptions(level, [archetypeId]).map((o) => o.id);
}

describe("shard E: bard:sound-striker", () => {
  const id = "bard:sound-striker";

  it("drops inspire competence and suggestion", () => {
    const ids = idsAt(20, id);
    expect(ids).not.toContain("bardicPerformance:inspireCompetence");
    expect(ids).not.toContain("bardicPerformance:suggestion");
  });

  it("Wordstrike is available at 3rd, not below", () => {
    expect(idsAt(2, id)).not.toContain("bardicPerformance:sound-striker:wordstrike");
    expect(idsAt(3, id)).toContain("bardicPerformance:sound-striker:wordstrike");
  });

  it("Weird Words is available at 6th, not below", () => {
    expect(idsAt(5, id)).not.toContain("bardicPerformance:sound-striker:weirdWords");
    expect(idsAt(6, id)).toContain("bardicPerformance:sound-striker:weirdWords");
  });
});

describe("shard E: bard:speaker-of-the-palatine-eye", () => {
  const id = "bard:speaker-of-the-palatine-eye";

  it("drops countersong and grants no toggle-worthy variant performance", () => {
    const ids = idsAt(20, id);
    expect(ids).not.toContain("bardicPerformance:countersong");
    expect(ids.filter((i) => i.includes("speaker-of-the-palatine-eye"))).toHaveLength(0);
  });
});

describe("shard E: bard:stonesinger", () => {
  const id = "bard:stonesinger";

  it("drops countersong and dirge of doom, grants no toggle-worthy variant performance", () => {
    const ids = idsAt(20, id);
    expect(ids).not.toContain("bardicPerformance:countersong");
    expect(ids).not.toContain("bardicPerformance:dirgeOfDoom");
    expect(ids.filter((i) => i.includes("stonesinger"))).toHaveLength(0);
  });
});

describe("shard E: bard:street-performer", () => {
  const id = "bard:street-performer";

  it("drops countersong, inspire competence, inspire greatness, and inspire heroics", () => {
    const ids = idsAt(20, id);
    for (const tag of ["countersong", "inspireCompetence", "inspireGreatness", "inspireHeroics"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("removes Inspire Courage (Disappearing Act replaces it)", () => {
    expect(bardVariantRemovesInspireCourage([id])).toBe(true);
  });

  it("Disappearing Act is available at 1st", () => {
    expect(idsAt(1, id)).toContain("bardicPerformance:street-performer:disappearingAct");
  });

  it("Harmless Performer is available at 3rd, not below", () => {
    expect(idsAt(2, id)).not.toContain("bardicPerformance:street-performer:harmlessPerformer");
    expect(idsAt(3, id)).toContain("bardicPerformance:street-performer:harmlessPerformer");
  });

  it("Madcap Prank is available at 9th, not below", () => {
    expect(idsAt(8, id)).not.toContain("bardicPerformance:street-performer:madcapPrank");
    expect(idsAt(9, id)).toContain("bardicPerformance:street-performer:madcapPrank");
  });
});

describe("shard E: bard:studious-librarian", () => {
  const id = "bard:studious-librarian";

  it("drops distraction, suggestion, dirge of doom, mass suggestion, and deadly performance, grants no toggle-worthy variant performance", () => {
    const ids = idsAt(20, id);
    for (const tag of [
      "distraction",
      "suggestion",
      "dirgeOfDoom",
      "massSuggestion",
      "deadlyPerformance",
    ]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
    expect(ids.filter((i) => i.includes("studious-librarian"))).toHaveLength(0);
  });
});

describe("shard E: bard:thundercaller", () => {
  const id = "bard:thundercaller";

  it("drops inspire competence, suggestion, mass suggestion, dirge of doom, and frightening tune", () => {
    const ids = idsAt(20, id);
    for (const tag of [
      "inspireCompetence",
      "suggestion",
      "massSuggestion",
      "dirgeOfDoom",
      "frighteningTune",
    ]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("grants Thunder Call (3rd), Incite Rage (6th), Call Lightning (8th), Call Lightning Storm (14th), each level-gated", () => {
    expect(idsAt(2, id)).not.toContain("bardicPerformance:thundercaller:thunderCall");
    expect(idsAt(3, id)).toContain("bardicPerformance:thundercaller:thunderCall");

    expect(idsAt(5, id)).not.toContain("bardicPerformance:thundercaller:inciteRage");
    expect(idsAt(6, id)).toContain("bardicPerformance:thundercaller:inciteRage");

    expect(idsAt(7, id)).not.toContain("bardicPerformance:thundercaller:callLightning");
    expect(idsAt(8, id)).toContain("bardicPerformance:thundercaller:callLightning");

    expect(idsAt(13, id)).not.toContain("bardicPerformance:thundercaller:callLightningStorm");
    expect(idsAt(14, id)).toContain("bardicPerformance:thundercaller:callLightningStorm");
  });
});

describe("shard E: bard:voice-of-brigh", () => {
  const id = "bard:voice-of-brigh";

  it("drops fascinate, dirge of doom, soothing performance, and frightening tune", () => {
    const ids = idsAt(20, id);
    for (const tag of ["fascinate", "dirgeOfDoom", "soothingPerformance", "frighteningTune"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("grants Brigh's Soothing (1st), Brigh's Anger (8th), Brigh's Spark (12th), Brigh's Wrath (14th), each level-gated", () => {
    expect(idsAt(1, id)).toContain("bardicPerformance:voice-of-brigh:brighsSoothing");

    expect(idsAt(7, id)).not.toContain("bardicPerformance:voice-of-brigh:brighsAnger");
    expect(idsAt(8, id)).toContain("bardicPerformance:voice-of-brigh:brighsAnger");

    expect(idsAt(11, id)).not.toContain("bardicPerformance:voice-of-brigh:brighsSpark");
    expect(idsAt(12, id)).toContain("bardicPerformance:voice-of-brigh:brighsSpark");

    expect(idsAt(13, id)).not.toContain("bardicPerformance:voice-of-brigh:brighsWrath");
    expect(idsAt(14, id)).toContain("bardicPerformance:voice-of-brigh:brighsWrath");
  });

  it("has no separate Distraction variant (suspected duplicate of Brigh's Soothing in vendored data)", () => {
    const ids = idsAt(20, id);
    expect(ids).not.toContain("bardicPerformance:voice-of-brigh:distraction");
  });
});

describe("shard E: bard:voice-of-the-wild", () => {
  const id = "bard:voice-of-the-wild";

  it("drops countersong, inspire competence, dirge of doom, and inspire heroics", () => {
    const ids = idsAt(20, id);
    for (const tag of ["countersong", "inspireCompetence", "dirgeOfDoom", "inspireHeroics"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("Song of the Wild is available at 3rd, not below", () => {
    expect(idsAt(2, id)).not.toContain("bardicPerformance:voice-of-the-wild:songOfTheWild");
    expect(idsAt(3, id)).toContain("bardicPerformance:voice-of-the-wild:songOfTheWild");
  });
});

describe("shard E: bard:watersinger", () => {
  const id = "bard:watersinger";

  it("drops fascinate, suggestion, mass suggestion, and inspire competence", () => {
    const ids = idsAt(20, id);
    for (const tag of ["fascinate", "suggestion", "massSuggestion", "inspireCompetence"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("grants Watersong (1st), Waterstrike (3rd), Lifewater (5th), each level-gated", () => {
    expect(idsAt(1, id)).toContain("bardicPerformance:watersinger:watersong");

    expect(idsAt(2, id)).not.toContain("bardicPerformance:watersinger:waterstrike");
    expect(idsAt(3, id)).toContain("bardicPerformance:watersinger:waterstrike");

    expect(idsAt(4, id)).not.toContain("bardicPerformance:watersinger:lifewater");
    expect(idsAt(5, id)).toContain("bardicPerformance:watersinger:lifewater");
  });
});

describe("shard E: bard:wit", () => {
  const id = "bard:wit";

  it("drops inspire competence, dirge of doom, and frightening tune", () => {
    const ids = idsAt(20, id);
    for (const tag of ["inspireCompetence", "dirgeOfDoom", "frighteningTune"]) {
      expect(ids).not.toContain(`bardicPerformance:${tag}`);
    }
  });

  it("Cutting Remark is available at 3rd, not below, and carries both tier-upgrade notes", () => {
    expect(idsAt(2, id)).not.toContain("bardicPerformance:wit:cuttingRemark");
    const options = bardicPerformanceToggleOptions(20, [id]);
    const cuttingRemark = options.find((o) => o.id === "bardicPerformance:wit:cuttingRemark");
    expect(cuttingRemark).toBeDefined();
    expect(cuttingRemark!.contextNotes?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe("shard E: note-tier defs apply no numeric change", () => {
  it("Wordstrike (bard:sound-striker) has no changes, only context notes", () => {
    const options = bardicPerformanceToggleOptions(20, ["bard:sound-striker"]);
    const wordstrike = options.find((o) => o.id === "bardicPerformance:sound-striker:wordstrike");
    expect(wordstrike).toBeDefined();
    expect(wordstrike!.changes).toEqual([]);
    expect(wordstrike!.contextNotes?.length ?? 0).toBeGreaterThan(0);
  });
});
