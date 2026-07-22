import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored rogue-talent catalog (issue #74 Phase
 * 3b) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts` exactly.
 */
const ref = loadRefData();

describe("RefData.rogueTalents", () => {
  it("has 234 entries — 235 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.rogueTalents)).toHaveLength(234);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.rogueTalents.not_found).toBeUndefined();
  });

  it("a known entry (Bleeding Attack) has the expected fields", () => {
    const talent = ref.rogueTalents.bleeding_attack!;
    expect(talent.name).toBe("Bleeding Attack");
    expect(talent.nameSuffix).toBe("(Ex)");
    expect(talent.category).toBe("Primary Sneak Attack Talents");
    expect(talent.description).toContain("bleed");
    expect(talent.sources).toEqual([{ id: "prpg-core-rulebook", pages: "68" }]);
  });

  it("carries the source's raw `level` field uninterpreted — a within-chain tier, NOT a rogue-level gate (see RogueTalent.level's doc comment)", () => {
    expect(ref.rogueTalents.gloom_magic!.level).toBe(1);
    expect(ref.rogueTalents.greater_gloom_magic!.level).toBe(2);
    // Most entries carry no `level` at all.
    expect(ref.rogueTalents.fast_stealth!.level).toBeUndefined();
  });

  it("distinguishes chained-Rogue-specific vs. Rogue (Unchained)-specific wording as SEPARATE entries, tagged via `category`'s R_/UR_ prefix", () => {
    const chained = ref.rogueTalents.powerful_sneak!;
    const unchained = ref.rogueTalents.powerful_sneak_unchained_rogue!;
    expect(chained.category).toBe("R_Primary Sneak Attack Talents");
    expect(chained.name).toBe("Powerful Sneak");
    expect(unchained.category).toBe("UR_Primary Sneak Attack Talents");
    expect(unchained.name).toBe("Powerful Sneak (Unchained Rogue)");
  });

  it("tags the 10th-level Advanced Talents tier via an `Advanced ` category prefix", () => {
    expect(ref.rogueTalents.deadly_sneak!.category).toBe("R_Advanced Primary Sneak Attack Talents");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const talent of Object.values(ref.rogueTalents)) {
      expect(talent.description ?? "").not.toMatch(/[‹›«»]/);
      expect(talent.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, talent] of Object.entries(ref.rogueTalents)) {
      expect(talent.id).toBe(key);
      expect(talent.uuid).toBe(`pfdata:rogue-talent:${key}`);
    }
  });

  it("meta records a hash for rogue-talents.json and the collection count", () => {
    expect(ref.meta.hashes["rogue-talents.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.rogueTalents).toBe(234);
  });
});
