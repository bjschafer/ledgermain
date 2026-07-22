import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored witch-hex catalog (issue #74 Phase
 * 3b) against the real pinned Pf Data 1e slice — mirrors `ragePowers.test.ts`
 * exactly. `pfdata.test.ts` covers the generic reader in isolation.
 */
const ref = loadRefData();

describe("RefData.hexes", () => {
  it("has 104 entries — 105 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.hexes)).toHaveLength(104);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.hexes.not_found).toBeUndefined();
  });

  it("a known regular hex (Blight) has the expected fields", () => {
    const hex = ref.hexes.blight!;
    expect(hex.name).toBe("Blight");
    expect(hex.nameSuffix).toBe("(Su)");
    expect(hex.tier).toBe("hex");
    expect(hex.description).toContain("wither");
    expect(hex.sources).toEqual([{ id: "advanced-player-s-guide", pages: "66" }]);
  });

  it("tier is taken from the source's `category` field, not fabricated — 8 major, 5 grand, the rest regular (matching the 27 hand-authored entries' own tiers)", () => {
    expect(ref.hexes.agony!.tier).toBe("major");
    expect(ref.hexes.hags_eye!.tier).toBe("major");
    expect(ref.hexes.abominate!.tier).toBe("grand");
    expect(ref.hexes.death_curse!.tier).toBe("grand");

    const counts = { hex: 0, major: 0, grand: 0 };
    for (const hex of Object.values(ref.hexes)) counts[hex.tier]++;
    expect(counts).toEqual({ hex: 60, major: 31, grand: 13 });
  });

  it("renders a ::aff[...] curse block as labeled prose (Blight Hex)", () => {
    expect(ref.hexes.blight!.description).toContain("<strong>Blight Hex</strong>");
  });

  it("resolves ‹hex/…› cross-refs between entries to plain display text", () => {
    const hex = ref.hexes.cackle!;
    expect(hex.description).toContain("agony hex");
    expect(hex.description).not.toMatch(/[‹›]/);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const hex of Object.values(ref.hexes)) {
      expect(hex.description ?? "").not.toMatch(/[‹›«»]/);
      expect(hex.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
      expect(hex.description ?? "").not.toMatch(/::[a-z]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, hex] of Object.entries(ref.hexes)) {
      expect(hex.id).toBe(key);
      expect(hex.uuid).toBe(`pfdata:witch-hex:${key}`);
    }
  });

  it("meta records a hash for hexes.json and the collection count", () => {
    expect(ref.meta.hashes["hexes.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.hexes).toBe(104);
  });
});

describe("RefData.shamanHexes", () => {
  it("has 16 entries — 18 raw dictionary keys minus the 'not_found' sentinel and the 'witch_hex' meta-rule entry", () => {
    expect(Object.keys(ref.shamanHexes)).toHaveLength(16);
  });

  it("never includes the dataset's own junk keys, nor the 'Witch Hex' meta-rule (a rule statement, not a real hex)", () => {
    expect(ref.shamanHexes.not_found).toBeUndefined();
    expect(ref.shamanHexes.witch_hex).toBeUndefined();
  });

  it("a known entry (Chant) has the expected fields", () => {
    const hex = ref.shamanHexes.chant!;
    expect(hex.name).toBe("Chant");
    expect(hex.nameSuffix).toBe("(Su)");
    expect(hex.description).toContain("move action");
    expect(hex.sources).toEqual([{ id: "advanced-class-guide", pages: "36" }]);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const hex of Object.values(ref.shamanHexes)) {
      expect(hex.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, hex] of Object.entries(ref.shamanHexes)) {
      expect(hex.id).toBe(key);
      expect(hex.uuid).toBe(`pfdata:shaman-hex:${key}`);
    }
  });

  it("meta records a hash for shaman-hexes.json and the collection count", () => {
    expect(ref.meta.hashes["shaman-hexes.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.shamanHexes).toBe(16);
  });
});
