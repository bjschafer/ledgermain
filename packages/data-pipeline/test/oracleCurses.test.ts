import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored oracle-curse catalog (issue #74 Phase
 * 3c) against the real pinned Pf Data 1e slice — mirrors
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.oracleCurses", () => {
  it("has 41 entries — 42 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.oracleCurses)).toHaveLength(41);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.oracleCurses.not_found).toBeUndefined();
  });

  it("includes all 6 base APG curses the hand-authored engine table covers", () => {
    for (const key of ["clouded_vision", "deaf", "haunted", "lame", "tongues", "wasting"]) {
      expect(ref.oracleCurses[key]?.name).toBeDefined();
    }
  });

  it("strips the entry's own leading SOURCE citation line (this file has no '## Name' header at all)", () => {
    const aboleth = ref.oracleCurses.aboleth!;
    expect(aboleth.name).toBe("Aboleth");
    expect(aboleth.description).not.toContain("SOURCE Horror Realms");
    expect(aboleth.description).toContain("<strong>Penalty:</strong>");
    expect(aboleth.description).toContain("<strong>Benefit:</strong>");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const curse of Object.values(ref.oracleCurses)) {
      expect(curse.description ?? "").not.toMatch(/[‹›«»]/);
      expect(curse.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, curse] of Object.entries(ref.oracleCurses)) {
      expect(curse.id).toBe(key);
      expect(curse.uuid).toBe(`pfdata:oracle-curse:${key}`);
    }
  });

  it("meta records a hash for oracle-curses.json and the collection count", () => {
    expect(ref.meta.hashes["oracle-curses.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.oracleCurses).toBe(41);
  });
});
