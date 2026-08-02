import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MESMERIST_TRICK_IDS,
  MESMERIST_TRICKS,
  mergedMesmeristTrickCatalog,
  resolveMesmeristTrick,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `mesmerist-tricks.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against, and `witchHexCatalog.test.ts` for the
 * full-parity pattern this mirrors.
 */
const ref = loadRefData();

describe("mergedMesmeristTrickCatalog", () => {
  const merged = mergedMesmeristTrickCatalog(ref);
  const byId = new Map(merged.map((t) => [t.id, t]));

  it("has exactly one row per vendored entry — all 44 hand-authored entries matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.mesmeristTricks).length);
    expect(merged).toHaveLength(44);
  });

  it("all 44 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of MESMERIST_TRICK_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.tier).toBe(MESMERIST_TRICKS[id]!.tier);
      expect(entry!.actionNote).toBe(MESMERIST_TRICKS[id]!.actionNote);
      // Vendored prose attached for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(44);
  });

  it("no vendored-only tricks remain — the fallback path only exists for a future data bump", () => {
    for (const entry of merged) {
      expect(MESMERIST_TRICKS[entry.id], entry.id).toBeDefined();
    }
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

  it("resolves a formerly vendored-only trick (now hand-authored, issue #74) via the hand table", () => {
    const trick = resolveMesmeristTrick("chainOfEyes", ref);
    expect(trick).toBe(MESMERIST_TRICKS.chainOfEyes);
    expect(trick?.displayOnly).toBe(true);
    expect(trick?.name).toBe("Chain of Eyes");
  });

  it("resolves the AoN-confirmed 'Life Revier' spelling (not a transcription typo) via the hand table", () => {
    const trick = resolveMesmeristTrick("lifeRevier", ref);
    expect(trick).toBe(MESMERIST_TRICKS.lifeRevier);
    expect(trick?.name).toBe("Life Revier");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMesmeristTrick("not-a-real-trick", ref)).toBeUndefined();
  });
});
