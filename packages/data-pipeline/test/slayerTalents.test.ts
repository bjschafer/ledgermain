import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored slayer-talent catalog (issue #74
 * Phase 3b) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts` exactly. UNLIKE the sibling rogue-family subsystems,
 * there is no hand-authored mechanics table to merge against here — see
 * `@pf1/engine` `slayer-talents.ts`'s doc comment.
 */
const ref = loadRefData();

describe("RefData.slayerTalents", () => {
  it("has 43 entries — 46 raw dictionary keys minus the 'not_found' sentinel and 2 redirect aliases", () => {
    expect(Object.keys(ref.slayerTalents)).toHaveLength(43);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.slayerTalents.not_found).toBeUndefined();
  });

  it("carries the source's raw `level` field uninterpreted — a within-chain tier, NOT a slayer-level gate", () => {
    expect(ref.slayerTalents.jaguars_pounce!.level).toBe(1);
    expect(ref.slayerTalents.jaguars_protection!.level).toBe(2);
  });

  it("tags the 10th-level Advanced Slayer Talents tier via an `Advanced ` category prefix", () => {
    expect(ref.slayerTalents.armored_marauder!.category).toBe("Advanced Slayer Talents");
  });

  it("structurally documents PF1 RAW's rogue/ninja advanced-talent cross-class option as its own catalog entries (no cross-wired mechanic needed)", () => {
    const rogueTalentOption = ref.slayerTalents.rogue_talent!;
    expect(rogueTalentOption.name).toBe("Rogue Talent");
    expect(rogueTalentOption.description).toContain("rogue talent");

    const advancedOption = ref.slayerTalents.rogue_and_ninja_advanced_talents!;
    expect(advancedOption.category).toBe("Advanced Slayer Talents");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const talent of Object.values(ref.slayerTalents)) {
      expect(talent.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.slayerTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:slayer-talent:${key}`);
    }
  });

  it("meta records a hash for slayer-talents.json and the collection count", () => {
    expect(ref.meta.hashes["slayer-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.slayerTalents).toBe(43);
  });
});
