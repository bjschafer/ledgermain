import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored phrenic-amplification catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice, mirroring
 * `ragePowers.test.ts`.
 */
const ref = loadRefData();

describe("RefData.phrenicAmplifications", () => {
  it("has 31 entries — 32 raw dictionary keys minus the 'not_found' sentinel", () => {
    expect(Object.keys(ref.phrenicAmplifications)).toHaveLength(31);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.phrenicAmplifications.not_found).toBeUndefined();
  });

  it("a known entry (Biokinetic Healing) has the expected fields", () => {
    const amp = ref.phrenicAmplifications.biokinetic_healing!;
    expect(amp.name).toBe("Biokinetic Healing");
    expect(amp.nameSuffix).toBe("(Su)");
    expect(amp.tier).toBe("basic");
    expect(amp.description).toContain("transmutation");
  });

  it("tags the major-amplification tier via the source's own `MajorAmp` category", () => {
    expect(ref.phrenicAmplifications.deflection_field!.tier).toBe("major");
    expect(ref.phrenicAmplifications.biokinetic_healing!.tier).toBe("basic");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const amp of Object.values(ref.phrenicAmplifications)) {
      expect(amp.description ?? "").not.toMatch(/[‹›«»]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, amp] of Object.entries(ref.phrenicAmplifications)) {
      expect(amp.id).toBe(key);
      expect(amp.uuid).toBe(`pfdata:phrenic-amplification:${key}`);
    }
  });

  it("meta records a hash for phrenic-amplifications.json and the collection count", () => {
    expect(ref.meta.hashes["phrenic-amplifications.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.phrenicAmplifications).toBe(31);
  });
});
