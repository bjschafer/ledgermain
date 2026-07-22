import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { isAdvancedSlayerTalent, resolveSlayerTalent, slayerTalentCatalog } from "../src/index.js";

/**
 * Coverage for the pure vendored-catalog slayer-talent module (issue #74
 * Phase 3b) — UNLIKE `rogueTalentCatalog.test.ts`/`ninjaTrickCatalog.test.ts`/
 * `ragePowerCatalog.test.ts`, there is no hand-authored table to overlay
 * here, so every row is display-only; see `slayer-talents.ts`'s doc comment.
 */
const ref = loadRefData();

describe("slayerTalentCatalog", () => {
  const catalog = slayerTalentCatalog(ref);

  it("has exactly one row per vendored entry, all display-only", () => {
    expect(catalog).toHaveLength(Object.keys(ref.slayerTalents).length);
    expect(catalog.every((t) => t.displayOnly)).toBe(true);
  });

  it("flags the 10th-level Advanced Slayer Talents tier", () => {
    const advanced = catalog.find((t) => t.id === "armored_marauder")!;
    expect(advanced.advanced).toBe(true);
    expect(advanced.category).toBe("Advanced Slayer Talents");

    const base = catalog.find((t) => t.id === "poison_use")!;
    expect(base.advanced).toBe(false);
  });

  it("every id is unique", () => {
    const ids = catalog.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isAdvancedSlayerTalent", () => {
  it("true for an 'Advanced ' category prefix, false otherwise (including undefined)", () => {
    expect(isAdvancedSlayerTalent("Advanced Slayer Talents")).toBe(true);
    expect(isAdvancedSlayerTalent("Other Talents")).toBe(false);
    expect(isAdvancedSlayerTalent(undefined)).toBe(false);
  });
});

describe("resolveSlayerTalent", () => {
  it("resolves a vendored entry, display-only", () => {
    const talent = resolveSlayerTalent("poison_use", ref);
    expect(talent?.name).toBe("Poison Use");
    expect(talent?.displayOnly).toBe(true);
  });

  it("returns undefined for an unknown id", () => {
    expect(resolveSlayerTalent("not-a-real-talent", ref)).toBeUndefined();
  });
});
