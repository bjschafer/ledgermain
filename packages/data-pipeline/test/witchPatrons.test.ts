import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored witch-patron catalog (issue #74 Phase
 * 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.witchPatrons", () => {
  it("has 61 entries — 62 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.witchPatrons)).toHaveLength(61);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.witchPatrons.not_found).toBeUndefined();
  });

  it("includes all 17 APG/Ultimate Magic core patrons the hand-authored engine table covers", () => {
    for (const key of [
      "agility",
      "animals",
      "deception",
      "elements",
      "endurance",
      "healing",
      "light",
      "moon",
      "plague",
      "strength",
      "transformation",
      "trickery",
      "water",
      "wisdom",
      "shadow",
      "time",
      "vengeance",
    ]) {
      expect(ref.witchPatrons[key]?.name).toBeDefined();
    }
  });

  it("tags a 'basic' patron's simple 9-spell progression and a 'unique' patron's themed prose distinctly", () => {
    const agility = ref.witchPatrons.agility!;
    expect(agility.category).toBe("basic");
    expect(agility.description).toContain("jump");

    const celestialAgenda = ref.witchPatrons.celestial_agenda!;
    expect(celestialAgenda.category).toBe("unique");
    expect(celestialAgenda.description).toContain("Available Patron Themes");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const patron of Object.values(ref.witchPatrons)) {
      expect(patron.description ?? "").not.toMatch(/[‹›«»]/);
      expect(patron.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, patron] of Object.entries(ref.witchPatrons)) {
      expect(patron.id).toBe(key);
      expect(patron.uuid).toBe(`pfdata:witch-patron:${key}`);
    }
  });

  it("meta records a hash for witch-patrons.json and the collection count", () => {
    expect(ref.meta.hashes["witch-patrons.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.witchPatrons).toBe(61);
  });
});
