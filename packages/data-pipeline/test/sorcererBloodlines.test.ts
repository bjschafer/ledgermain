import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored sorcerer-bloodline catalog against the
 * real pinned Pf Data 1e slice — mirrors `ragePowers.test.ts`.
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

  it("flattens the source's blockquoted bloodline-powers list into plain paragraphs", () => {
    const aberrant = ref.sorcererBloodlines.aberrant!;
    expect(aberrant.name).toBe("Aberrant");
    expect(aberrant.description).not.toMatch(/&gt;/);
    expect(aberrant.description).toContain("Acidic Ray");
  });

  it("no longer inlines a Wildblooded Mutation sub-heading into the parent's description", () => {
    const aberrant = ref.sorcererBloodlines.aberrant!;
    expect(aberrant.description).not.toContain("Wildblooded Mutation");
    expect(aberrant.description).not.toContain("Warp Touch");
    expect(aberrant.description).not.toContain("<table>");
    expect(aberrant.description).not.toContain("Double-Jointed");
  });

  it("a bloodline's OTHER h3 sections (not a mutation) still render inline as bold text", () => {
    const draconic = ref.sorcererBloodlines.draconic!;
    expect(draconic.description).toContain("<strong>Expanded Bloodlines</strong>");
    expect(draconic.description).not.toContain("Linnorm");
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

describe("RefData.sorcererBloodlineMutations", () => {
  it("has 24 entries — every '(Wildblooded Mutation)' heading in the pinned slice", () => {
    expect(Object.keys(ref.sorcererBloodlineMutations)).toHaveLength(24);
  });

  it("promotes Sage out from under Arcane, with a parentBloodlineId link", () => {
    const sage = ref.sorcererBloodlineMutations["arcane-sage"]!;
    expect(sage.name).toBe("Sage");
    expect(sage.parentBloodlineId).toBe("arcane");
    expect(sage.description).toContain("Arcane Bolt");
    expect(sage.description).toContain("replaces");
    expect(sage.description).not.toContain("Metamagic Adept");
  });

  it("every parentBloodlineId names a real entry in RefData.sorcererBloodlines", () => {
    for (const mutation of Object.values(ref.sorcererBloodlineMutations)) {
      expect(ref.sorcererBloodlines[mutation.parentBloodlineId]).toBeDefined();
    }
  });

  it("a parent bloodline with two mutations (Elemental: Primal, Lifewater) promotes both", () => {
    const mutations = Object.values(ref.sorcererBloodlineMutations).filter(
      (m) => m.parentBloodlineId === "elemental",
    );
    expect(mutations.map((m) => m.name).sort()).toEqual(["Lifewater", "Primal"]);
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const mutation of Object.values(ref.sorcererBloodlineMutations)) {
      expect(mutation.description ?? "").not.toMatch(/[‹›«»]/);
      expect(mutation.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
    }
  });

  it("every entry has a synthetic uuid matching its id", () => {
    for (const [key, mutation] of Object.entries(ref.sorcererBloodlineMutations)) {
      expect(mutation.id).toBe(key);
      expect(mutation.uuid).toBe(`pfdata:sorcerer-bloodline-mutation:${key}`);
    }
  });

  it("meta records a hash for sorcerer-bloodline-mutations.json and the collection count", () => {
    expect(ref.meta.hashes["sorcerer-bloodline-mutations.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.sorcererBloodlineMutations).toBe(24);
  });
});
