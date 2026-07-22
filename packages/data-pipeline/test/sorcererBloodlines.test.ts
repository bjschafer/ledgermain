import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored sorcerer-bloodline catalog (issue #74
 * Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.sorcererBloodlines", () => {
  it("has 51 entries — 53 raw dictionary keys minus the 'not_found' sentinel and the 'kobold' -> 'kobold_sorcerer' redirect", () => {
    expect(Object.keys(ref.sorcererBloodlines)).toHaveLength(51);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.sorcererBloodlines.not_found).toBeUndefined();
    expect(ref.sorcererBloodlines.kobold).toBeUndefined();
    expect(ref.sorcererBloodlines.kobold_sorcerer).toBeDefined();
  });

  it("includes all 10 Core Rulebook bloodlines the hand-authored engine table covers", () => {
    for (const tag of [
      "aberrant",
      "abyssal",
      "arcane",
      "celestial",
      "destined",
      "draconic",
      "elemental",
      "fey",
      "infernal",
      "undead",
    ]) {
      expect(ref.sorcererBloodlines[tag]?.name).toBeDefined();
    }
  });

  it("flattens the source's blockquoted bloodline-powers list into plain paragraphs, and renders its Wildblooded Mutation sub-heading as bold text", () => {
    const aberrant = ref.sorcererBloodlines.aberrant!;
    expect(aberrant.name).toBe("Aberrant");
    expect(aberrant.description).not.toMatch(/&gt;/);
    expect(aberrant.description).toContain("Acidic Ray");
    expect(aberrant.description).toContain("<strong>Warped (Wildblooded Mutation)</strong>");
  });

  it("renders the Warped mutation's embedded GFM table", () => {
    const aberrant = ref.sorcererBloodlines.aberrant!;
    expect(aberrant.description).toContain("<table>");
    expect(aberrant.description).toContain("Double-Jointed");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const bloodline of Object.values(ref.sorcererBloodlines)) {
      expect(bloodline.description ?? "").not.toMatch(/[‹›«»]/);
      expect(bloodline.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, bloodline] of Object.entries(ref.sorcererBloodlines)) {
      expect(bloodline.id).toBe(key);
      expect(bloodline.uuid).toBe(`pfdata:sorcerer-bloodline:${key}`);
    }
  });

  it("meta records a hash for sorcerer-bloodlines.json and the collection count", () => {
    expect(ref.meta.hashes["sorcerer-bloodlines.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.sorcererBloodlines).toBe(51);
  });
});
