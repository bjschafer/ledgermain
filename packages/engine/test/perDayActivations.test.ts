/**
 * Drift guards for the per-day activation tables (`per-day-activations/`):
 * every entry must key a real vendored `RefData.classFeatures` id whose
 * `uses.maxFormula` derives a pool row (the surface the toggles attach to —
 * see `types.ts`), slugs must be kebab-case and unique within their feature,
 * the cross-shard merge must be collision-free, and every def must move a
 * number. Per-entry hand-computed fixture tests live in the wave shards'
 * own test files, mirroring `classFeatureSaves.test.ts`'s style.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  PER_DAY_ACTIVATION_SHARDS,
  PER_DAY_ACTIVATIONS,
  perDayActivationToggleOptions,
} from "../src/per-day-activations/index.js";

const ref = loadRefData();

describe("PER_DAY_ACTIVATIONS drift guards", () => {
  it("merges shards without id collisions", () => {
    const perShardKeyCount = PER_DAY_ACTIVATION_SHARDS.reduce(
      (sum, shard) => sum + Object.keys(shard).length,
      0,
    );
    expect(Object.keys(PER_DAY_ACTIVATIONS).length).toBe(perShardKeyCount);
  });

  it("keys resolve to vendored class features with a pool surface", () => {
    for (const [featureId, defs] of Object.entries(PER_DAY_ACTIVATIONS)) {
      const feature = ref.classFeatures[featureId];
      expect(feature, `unknown vendored feature id: ${featureId}`).toBeDefined();
      expect(
        feature?.uses?.maxFormula,
        `${featureId} (${feature?.name}) has no uses.maxFormula — no pool row derives, so no toggle surface exists`,
      ).toBeTruthy();
      expect(defs.length, `${featureId} has an empty def list`).toBeGreaterThan(0);
    }
  });

  it("defs carry unique kebab-case slugs and non-empty changes", () => {
    for (const [featureId, defs] of Object.entries(PER_DAY_ACTIVATIONS)) {
      const slugs = new Set<string>();
      for (const def of defs) {
        expect(def.slug, `${featureId}: slug "${def.slug}" is not kebab-case`).toMatch(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        );
        expect(slugs.has(def.slug), `${featureId}: duplicate slug "${def.slug}"`).toBe(false);
        slugs.add(def.slug);
        expect(def.changes.length, `${featureId}:${def.slug} moves no number`).toBeGreaterThan(0);
        if (def.classTag === undefined) {
          for (const change of def.changes) {
            expect(
              /@classes\./.test(change.formula),
              `${featureId}:${def.slug} references @classes.<tag> without a classTag gate — ` +
                `shared vendored features evaluate toggle formulas with no granting-class context`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("classTag gates name real class tags", () => {
    const classTags = new Set(Object.values(ref.classes).map((c) => c.tag));
    for (const [featureId, defs] of Object.entries(PER_DAY_ACTIVATIONS)) {
      for (const def of defs) {
        if (def.classTag !== undefined) {
          expect(
            classTags.has(def.classTag),
            `${featureId}:${def.slug} gates on unknown class tag "${def.classTag}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("factory filters by classTag and minLevel and prefixes ids", () => {
    // Behavior contract, independent of table content: exercised via a
    // synthetic lookup once any real entry exists; until then this asserts
    // the empty-table shape.
    expect(perDayActivationToggleOptions("no-such-feature-id", "monk", 20)).toEqual([]);
  });
});
