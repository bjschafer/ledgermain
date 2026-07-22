import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored rage-power catalog (issue #74 Phase
 * 3a) against the real pinned Pf Data 1e slice — the exemplar the NEXT
 * subsystem import (hexes, arcana, talents, exploits, wild talents) follows.
 * `pfdata.test.ts` covers the generic reader in isolation.
 */
const ref = loadRefData();

describe("RefData.ragePowers", () => {
  it("has 244 entries — 315 raw dictionary keys minus the 'not_found' sentinel, 69 redirect aliases, and 1 disambiguation page", () => {
    expect(Object.keys(ref.ragePowers)).toHaveLength(244);
  });

  it("never includes the dataset's own junk keys", () => {
    expect(ref.ragePowers.not_found).toBeUndefined();
    // A representative redirect alias and the one disambiguation page.
    expect(ref.ragePowers.brawler_greater).toBeUndefined();
    expect(ref.ragePowers.linnorm_death_curse).toBeUndefined();
  });

  it("a known entry (Animal Fury) has the expected fields", () => {
    const power = ref.ragePowers.animal_fury!;
    expect(power.name).toBe("Animal Fury");
    expect(power.nameSuffix).toBe("(Ex)");
    expect(power.description).toContain("bite attack");
    expect(power.sources).toEqual([{ id: "prpg-core-rulebook" }]);
    // No stated level minimum in the source for this one.
    expect(power.level).toBeUndefined();
  });

  it("carries the source's raw `level` field uninterpreted (NOT a barbarian-level gate — see RagePower.level's doc comment)", () => {
    // The Beast Totem chain: no `level` on the base tier, then 1, then 2 —
    // clearly a within-chain depth counter, not "requires Nth level"
    // (contrast Terrifying Howl below, an actual 8th-level rage power that
    // the source tags `level: 1`).
    expect(ref.ragePowers.lesser_beast_totem!.level).toBeUndefined();
    expect(ref.ragePowers.beast_totem!.level).toBe(1);
    expect(ref.ragePowers.greater_beast_totem!.level).toBe(2);
    expect(ref.ragePowers.terrifying_howl!.level).toBe(1);
  });

  it("resolves ‹ragepower/…› cross-refs between entries to plain display text", () => {
    const power = ref.ragePowers.greater_animal_fury!;
    expect(power.description).toContain("animal fury");
    expect(power.description).not.toMatch(/[‹›]/);
  });

  it("renders a markdown table (Savage Dirty Trick's penalty chart)", () => {
    const power = ref.ragePowers.savage_dirty_trick!;
    expect(power.description).toContain("<table>");
    expect(power.description).toContain("Blinded");
  });

  it("renders a ::aff[...] curse block as labeled prose", () => {
    const power = ref.ragePowers.cairn_linnorm_death_curse!;
    expect(power.description).toContain("<strong>Curse of Decay:</strong>");
  });

  it("no emitted description anywhere retains the dataset's cross-ref or directive syntax", () => {
    for (const power of Object.values(ref.ragePowers)) {
      expect(power.description ?? "").not.toMatch(/[‹›«»]/);
      expect(power.description ?? "").not.toMatch(/@(?:ripple|hll|HL|hl|b|strong|i|em|span)\[/);
      expect(power.description ?? "").not.toMatch(/::[a-z]/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, power] of Object.entries(ref.ragePowers)) {
      expect(power.id).toBe(key);
      expect(power.uuid).toBe(`pfdata:rage-power:${key}`);
    }
  });

  it("meta records a hash for rage-powers.json and the collection count", () => {
    expect(ref.meta.hashes["rage-powers.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.ragePowers).toBe(244);
  });
});
