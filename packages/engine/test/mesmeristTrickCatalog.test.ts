import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MESMERIST_TRICK_IDS,
  MESMERIST_TRICKS,
  mergedMesmeristTrickCatalog,
  resolveMesmeristTrick,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `mesmerist-tricks.ts`'s "vendored catalog overlay" section doc comment for
 * the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedMesmeristTrickCatalog", () => {
  const merged = mergedMesmeristTrickCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — every one of the 26 hand-authored entries matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.mesmeristTricks).length);
  });

  it("all 26 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    for (const id of MESMERIST_TRICK_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.tier).toBe(MESMERIST_TRICKS[id]!.tier);
      expect(entry!.actionNote).toBe(MESMERIST_TRICKS[id]!.actionNote);
      // Vendored prose attached for display.
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only entry (no hand-authored counterpart) resolves display-only with its own id + prose, empty actionNote", () => {
    const entry = byId.get("chain_of_eyes")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.actionNote).toBe("");
    expect(entry.description).toContain("mesmerist");
    expect(MESMERIST_TRICKS.chain_of_eyes).toBeUndefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveMesmeristTrick", () => {
  it("prefers the hand-authored table for a matched id", () => {
    expect(resolveMesmeristTrick("astoundingAvoidance", ref)).toBe(
      MESMERIST_TRICKS.astoundingAvoidance,
    );
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const trick = resolveMesmeristTrick("chain_of_eyes", ref);
    expect(trick?.displayOnly).toBe(true);
    expect(trick?.name).toBe("Chain of Eyes");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMesmeristTrick("not-a-real-trick", ref)).toBeUndefined();
  });
});
