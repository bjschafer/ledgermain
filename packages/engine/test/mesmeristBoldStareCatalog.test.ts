import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MESMERIST_BOLD_STARE_IDS,
  MESMERIST_BOLD_STARES,
  mergedMesmeristBoldStareCatalog,
  resolveMesmeristBoldStare,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay (issue #74 Phase 3c) — see
 * `mesmerist-bold-stares.ts`'s "vendored catalog overlay" section doc
 * comment for the collision-audit narrative this asserts against.
 */
const ref = loadRefData();

describe("mergedMesmeristBoldStareCatalog", () => {
  const merged = mergedMesmeristBoldStareCatalog(ref);
  const byId = new Map(merged.map((s) => [s.id, s]));

  it("has exactly one row per vendored entry — every one of the 7 hand-authored entries matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.mesmeristBoldStares).length);
  });

  it("all 7 hand-authored entries matched a vendored entry by name and kept their own id + riderText", () => {
    for (const id of MESMERIST_BOLD_STARE_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.riderText).toBe(MESMERIST_BOLD_STARES[id]!.riderText);
      expect(entry!.description).toBeDefined();
    }
  });

  it("a vendored-only entry resolves display-only with empty riderText", () => {
    const entry = byId.get("nightmare")!;
    expect(entry.displayOnly).toBe(true);
    expect(entry.riderText).toBe("");
    expect(MESMERIST_BOLD_STARES.nightmare).toBeUndefined();
  });

  it("every id is unique", () => {
    const ids = merged.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveMesmeristBoldStare", () => {
  it("prefers the hand-authored table for a matched id", () => {
    expect(resolveMesmeristBoldStare("allure", ref)).toBe(MESMERIST_BOLD_STARES.allure);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    const stare = resolveMesmeristBoldStare("nightmare", ref);
    expect(stare?.displayOnly).toBe(true);
    expect(stare?.name).toBe("Nightmare");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMesmeristBoldStare("not-a-real-stare", ref)).toBeUndefined();
  });
});
