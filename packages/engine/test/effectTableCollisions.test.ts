/**
 * Three places in the engine merge effect tables that were written by
 * different hands: a hand-verified table and one or more machine-extracted
 * ones for feats and archetype features, and three by-origin tables for
 * granted powers. Nothing asserted their key sets were disjoint.
 *
 * A collision is never benign, but it is quiet in two different ways
 * depending on the merge:
 *
 * - `resolveFeatEffect` / `resolveArchetypeFeatureEffect` pick the earlier
 *   table and ignore the rest, so a duplicated key means one of the two
 *   entries is dead code that reads as live. Whichever is wrong, only one is
 *   ever exercised, and a fixture written against the shadowed one passes for
 *   the wrong reason.
 * - `GRANTED_POWER_CHANGE_PATCHES` is a plain object spread, so the last
 *   table wins by file order. Adding an entry to `domains.ts` for a name that
 *   `schools.ts` already patches silently swaps which changes apply.
 *
 * These are guards, not fixtures: all six sets are disjoint today, and the
 * point is that they stay that way as content waves land.
 */
import { describe, expect, test } from "bun:test";

import { ARCHETYPE_FEATURE_EFFECTS } from "../src/archetype-effects.js";
import { ARCHETYPE_FEATURE_EFFECTS_EXTRACTED } from "../src/archetype-extracted/index.js";
import { FEAT_EFFECTS } from "../src/feat-effects.js";
import { FEAT_EFFECTS_EXTRACTED } from "../src/feat-effects-extracted.js";
import { FEAT_EFFECTS_EXTRACTED_COMMUNITY } from "../src/feat-effects-extracted-community.js";
import { DOMAIN_POWER_PATCHES } from "../src/granted-power-effects/domains.js";
import { INQUISITION_POWER_PATCHES } from "../src/granted-power-effects/inquisitions.js";
import { SCHOOL_POWER_PATCHES } from "../src/granted-power-effects/schools.js";

function sharedKeys(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>) {
  return Object.keys(a).filter((key) => Object.hasOwn(b, key));
}

/** Fails naming the shared keys, since the fix is always to delete one side. */
function expectDisjoint(
  aName: string,
  a: Readonly<Record<string, unknown>>,
  bName: string,
  b: Readonly<Record<string, unknown>>,
): void {
  const shared = sharedKeys(a, b);
  if (shared.length > 0) {
    throw new Error(
      `${aName} and ${bName} both define ${shared.length} key(s), so only one side is ` +
        `ever read. Keep the correct entry and delete the other:\n  ${shared.join("\n  ")}`,
    );
  }
  expect(shared).toEqual([]);
}

describe("feat effects", () => {
  test("the hand-verified table shares no slug with either extracted table", () => {
    expectDisjoint("FEAT_EFFECTS", FEAT_EFFECTS, "FEAT_EFFECTS_EXTRACTED", FEAT_EFFECTS_EXTRACTED);
    expectDisjoint(
      "FEAT_EFFECTS",
      FEAT_EFFECTS,
      "FEAT_EFFECTS_EXTRACTED_COMMUNITY",
      FEAT_EFFECTS_EXTRACTED_COMMUNITY,
    );
  });

  test("the two extracted tables share no slug", () => {
    // The community sweep excluded every system-pack slug by construction;
    // this is what makes their relative order in resolveFeatEffect a
    // formality rather than a precedence rule anyone has to remember.
    expectDisjoint(
      "FEAT_EFFECTS_EXTRACTED",
      FEAT_EFFECTS_EXTRACTED,
      "FEAT_EFFECTS_EXTRACTED_COMMUNITY",
      FEAT_EFFECTS_EXTRACTED_COMMUNITY,
    );
  });
});

describe("archetype feature effects", () => {
  test("the hand-verified table shares no feature id with the extracted table", () => {
    expectDisjoint(
      "ARCHETYPE_FEATURE_EFFECTS",
      ARCHETYPE_FEATURE_EFFECTS,
      "ARCHETYPE_FEATURE_EFFECTS_EXTRACTED",
      ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
    );
  });
});

describe("granted power patches", () => {
  test("the three by-origin tables share no power name", () => {
    // Keys are looked up against a granted power's `name`, which has to be
    // unique across domains, subdomains, schools, focused schools and
    // inquisitions all at once — the spread that merges these three cannot
    // tell a deliberate re-use from a mistake.
    expectDisjoint(
      "DOMAIN_POWER_PATCHES",
      DOMAIN_POWER_PATCHES,
      "SCHOOL_POWER_PATCHES",
      SCHOOL_POWER_PATCHES,
    );
    expectDisjoint(
      "DOMAIN_POWER_PATCHES",
      DOMAIN_POWER_PATCHES,
      "INQUISITION_POWER_PATCHES",
      INQUISITION_POWER_PATCHES,
    );
    expectDisjoint(
      "SCHOOL_POWER_PATCHES",
      SCHOOL_POWER_PATCHES,
      "INQUISITION_POWER_PATCHES",
      INQUISITION_POWER_PATCHES,
    );
  });
});
