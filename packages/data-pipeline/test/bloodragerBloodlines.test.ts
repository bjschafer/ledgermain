import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored bloodrager-bloodline catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.bloodragerBloodlines", () => {
  it("has 24 entries — 25 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.bloodragerBloodlines)).toHaveLength(24);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.bloodragerBloodlines.not_found).toBeUndefined();
  });

  it("includes all 10 Advanced Class Guide bloodlines the hand-authored engine table covers", () => {
    for (const tag of [
      "abyssal",
      "arcane",
      "celestial",
      "destined",
      "draconic",
      "elemental",
      "fey",
      "infernal",
      "undead",
      "martyred",
    ]) {
      expect(ref.bloodragerBloodlines[tag]?.name).toBeDefined();
    }
  });

  it("has no hand-authored counterpart for Aberrant (vendored-only for this class, unlike sorcerer)", () => {
    expect(ref.bloodragerBloodlines.aberrant?.name).toBe("Aberrant");
  });

  it("renders the source's ::list[...]/::ab[...] directives as readable labeled prose, not raw directive syntax", () => {
    const aberrant = ref.bloodragerBloodlines.aberrant!;
    expect(aberrant.description).toContain("<strong>Bonus Feats:</strong> Combat Reflexes");
    expect(aberrant.description).toContain(
      "<strong>Bonus Spells by Bloodrager Level:</strong> Level 7: Enlarge person",
    );
    expect(aberrant.description).toContain("<strong>Staggering Strike (Su) (Level 1):</strong>");
    expect(aberrant.description).not.toMatch(/::(ab|list)/);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const bloodline of Object.values(ref.bloodragerBloodlines)) {
      expect(bloodline.description ?? "").not.toMatch(/[‹›«»]/);
      expect(bloodline.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, bloodline] of Object.entries(ref.bloodragerBloodlines)) {
      expect(bloodline.id).toBe(key);
      expect(bloodline.uuid).toBe(`pfdata:bloodrager-bloodline:${key}`);
    }
  });

  it("meta records a hash for bloodrager-bloodlines.json and the collection count", () => {
    expect(ref.meta.hashes["bloodrager-bloodlines.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.bloodragerBloodlines).toBe(24);
  });
});
