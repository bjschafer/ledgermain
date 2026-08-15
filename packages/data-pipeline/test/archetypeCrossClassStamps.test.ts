import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * Same-named archetypes of different classes are distinct published
 * archetypes that collide on the name; the source pack gave every such doc
 * one shared supplements list (the union of every class's real features), so
 * each class showed the other classes' rules text. `MISLINKED_SUPPLEMENTS`
 * (transform/archetypes.ts) cuts each doc back to its own class's published
 * feature set — these fixtures pin the surviving sets and the tell-tale
 * class-specific prose, per aonprd.com:
 *
 *   Skirmisher: Fighter (Ultimate Wilderness p. 50) vs Ranger (APG p. 128)
 *   Infiltrator: Inquisitor (UM p. 45) vs Investigator (ACG p. 100) vs
 *     Ranger (APG p. 125)
 *   Roof Runner: Hunter (Ultimate Intrigue p. 65) vs Rogue (UC p. 74)
 */
const ref = loadRefData();

function featureSlugs(archetypeId: string): string[] {
  return Object.keys(ref.archetypeFeatures)
    .filter((id) => id.startsWith(`${archetypeId}:`))
    .map((id) => id.slice(archetypeId.length + 1))
    .sort();
}

describe("Skirmisher (fighter vs ranger)", () => {
  it("fighter keeps its six Ultimate Wilderness features, ranger keeps Hunter's Tricks", () => {
    expect(featureSlugs("fighter:skirmisher")).toEqual([
      "conditioning:2",
      "mobile-mastery:19",
      "mobility-training:3",
      "reconnaissance-training:2",
      "weapon-and-armor-proficiency:1",
      "wilderness-training:1",
    ]);
    expect(featureSlugs("ranger:skirmisher")).toEqual(["hunter-s-tricks:5"]);
  });

  it("fighter's Conditioning carries the real specialization text, not the pack's 'undefined' duplicate", () => {
    const description = ref.archetypeFeatures["fighter:skirmisher:conditioning:2"]?.description;
    expect(description).toContain("Alpine Training");
    expect(description).not.toBe("undefined");
  });

  it("ranger's one surviving feature is the ranger's own prose", () => {
    expect(ref.archetypeFeatures["ranger:skirmisher:hunter-s-tricks:5"]?.description).toContain(
      "replaces the ranger's spells class feature",
    );
  });
});

describe("Infiltrator (inquisitor vs investigator vs ranger)", () => {
  it("each class keeps only its own published features", () => {
    expect(featureSlugs("inquisitor:infiltrator")).toEqual([
      "forbidden-lore:2",
      "guileful-lore:1",
      "misdirection:1",
      "necessary-lies:5",
    ]);
    expect(featureSlugs("investigator:infiltrator")).toEqual([
      "master-of-disguise:1",
      "mimic-mastery:2",
      "voice-mimicry:2",
    ]);
    expect(featureSlugs("ranger:infiltrator")).toEqual(["adaptation:3"]);
  });

  it("surviving prose names each class's own replaced abilities", () => {
    expect(ref.archetypeFeatures["inquisitor:infiltrator:misdirection:1"]?.description).toContain(
      "replaces stern gaze",
    );
    expect(
      ref.archetypeFeatures["investigator:infiltrator:master-of-disguise:1"]?.description,
    ).toContain("replaces trapfinding");
    expect(ref.archetypeFeatures["ranger:infiltrator:adaptation:3"]?.description).toContain(
      "replaces favored terrain",
    );
  });
});

describe("Roof Runner (hunter vs rogue/rogueUnchained)", () => {
  it("each class keeps only its own published features", () => {
    expect(featureSlugs("hunter:roof-runner")).toEqual([
      "alley-ghost:8",
      "master-climber:20",
      "natural-leaper:2",
      "shingle-stride:5",
      "skilled:1",
      "weapon-and-armor-proficiency:1",
    ]);
    for (const tag of ["rogue", "rogueUnchained"]) {
      expect(featureSlugs(`${tag}:roof-runner`)).toEqual(["roof-running:1", "tumbling-descent:2"]);
    }
  });

  it("surviving prose belongs to each side's own class", () => {
    expect(ref.archetypeFeatures["hunter:roof-runner:natural-leaper:2"]?.description).toContain(
      "hunter level",
    );
    expect(ref.archetypeFeatures["rogue:roof-runner:roof-running:1"]?.description).toContain(
      "replaces trapfinding",
    );
  });
});
