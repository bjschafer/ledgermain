/**
 * Structural guards for the vendored-class-feature classification audit
 * (`src/class-feature-classification/`): every verdict must still describe a
 * real vendored entry (a refdata bump that rekeys or renames fails loudly,
 * same posture as the racial-trait classification guards), shards must not
 * collide, and a `numeric` verdict is only honest if some wired route
 * actually carries the number — the entry's own vendored `changes[]`, a
 * `CLASS_FEATURE_CHANGE_PATCHES` entry, or a `GRANTED_POWER_CHANGE_PATCHES`
 * entry, matching the feature's name.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  CLASS_FEATURE_CLASSIFICATION,
  CLASS_FEATURE_CLASSIFICATION_SHARDS,
} from "../src/class-feature-classification/index.js";
import { CLASS_FEATURE_CHANGE_PATCHES } from "../src/class-feature-effects.js";
import { GRANTED_POWER_CHANGE_PATCHES } from "../src/granted-power-effects/index.js";

const ref = loadRefData();

describe("CLASS_FEATURE_CLASSIFICATION: structural guards", () => {
  it("every entry matches a vendored class feature by id and name", () => {
    for (const [id, entry] of Object.entries(CLASS_FEATURE_CLASSIFICATION)) {
      const vendored = ref.classFeatures[id];
      expect(vendored, `${entry.name} (${id}) not in vendored set`).toBeDefined();
      expect(entry.id).toBe(id);
      expect(vendored?.name).toBe(entry.name);
    }
  });

  it("shards are collision-free", () => {
    const total = CLASS_FEATURE_CLASSIFICATION_SHARDS.reduce(
      (n, shard) => n + Object.keys(shard).length,
      0,
    );
    expect(Object.keys(CLASS_FEATURE_CLASSIFICATION).length).toBe(total);
  });

  it("every numeric verdict has a wired route carrying the number", () => {
    for (const entry of Object.values(CLASS_FEATURE_CLASSIFICATION)) {
      if (entry.bucket !== "numeric") continue;
      const vendored = ref.classFeatures[entry.id];
      if (!vendored) continue; // covered by the id guard above
      const wired =
        vendored.changes.length > 0 ||
        CLASS_FEATURE_CHANGE_PATCHES[entry.name] !== undefined ||
        GRANTED_POWER_CHANGE_PATCHES[entry.name] !== undefined;
      expect(wired, `${entry.name} (${entry.id}) is numeric but no route is wired`).toBe(true);
    }
  });
});
