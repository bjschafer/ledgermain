import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  MESMERIST_BOLD_STARE_IDS,
  MESMERIST_BOLD_STARES,
  mergedMesmeristBoldStareCatalog,
  resolveMesmeristBoldStare,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `mesmerist-bold-stares.ts`'s
 * "vendored catalog overlay" section doc comment for the collision-audit
 * narrative this asserts against, and `witchHexCatalog.test.ts` for the
 * full-parity pattern this mirrors.
 */
const ref = loadRefData();

describe("mergedMesmeristBoldStareCatalog", () => {
  const merged = mergedMesmeristBoldStareCatalog(ref);
  const byId = new Map(merged.map((s) => [s.id, s]));

  it("has exactly one row per vendored entry — all 24 hand-authored entries matched", () => {
    expect(merged).toHaveLength(Object.keys(ref.mesmeristBoldStares).length);
    expect(merged).toHaveLength(24);
  });

  it("all 24 hand-authored entries matched a vendored entry by name and kept their own id + riderText", () => {
    let matched = 0;
    for (const id of MESMERIST_BOLD_STARE_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.riderText).toBe(MESMERIST_BOLD_STARES[id]!.riderText);
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(24);
  });

  it("no vendored-only bold stares remain — the fallback path only exists for a future data bump", () => {
    for (const entry of merged) {
      expect(MESMERIST_BOLD_STARES[entry.id], entry.id).toBeDefined();
    }
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

  it("resolves a formerly vendored-only stare (now hand-authored, issue #74) via the hand table", () => {
    const stare = resolveMesmeristBoldStare("nightmare", ref);
    expect(stare).toBe(MESMERIST_BOLD_STARES.nightmare);
    expect(stare?.displayOnly).toBe(true);
    expect(stare?.name).toBe("Nightmare");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMesmeristBoldStare("not-a-real-stare", ref)).toBeUndefined();
  });
});
