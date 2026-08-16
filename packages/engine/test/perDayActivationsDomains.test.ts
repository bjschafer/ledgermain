/**
 * Fixture tests for the Domains per-day-activation shard
 * (`per-day-activations/domains.ts`), which is empty: every cleric/subdomain
 * granted power in `class-feature-classification/unroutedDomains.ts` whose
 * self-facing effect scales while active turns out to scale by the granting
 * class's own level, a formula this table can't express safely for a power a
 * cleric, inquisitor, or druid nature bond can all grant under the same
 * feature id (no `@class.unlevel` context here, unlike the collection loop
 * `granted-power-effects/` runs in).
 *
 * The two powers in that classification file that came closest to
 * qualifying — Aura of Protection and Deflection Aura, both self-facing (for
 * Aura of Protection) or flat (for Deflection Aura) — turn out to already be
 * modeled through a different, pre-existing mechanism: both carry a real
 * vendored linked buff (`ClassFeature.grantsBuffs`) that `resources.ts`'s own
 * `linkedBuffIds` pass resolves and surfaces as an activate/deactivate toggle
 * on the granting feature's pool row, with no entry needed in this table.
 * This file's second half verifies that existing route empirically, since
 * `unroutedDomains.ts`'s classification note for both powers now depends on
 * it.
 *
 * RAW sources (both cross-checked against aonprd.com):
 *   - Aura of Protection (Advanced Player's Guide p. 46, Protection domain,
 *     8th level): "You and your allies within this aura gain a +1
 *     deflection bonus to AC and resistance 5 against all elements... The
 *     deflection bonus increases by +1 for every four cleric levels you
 *     possess beyond 8th." At cleric level 8: +1 deflection AC. At level 12:
 *     +2 (1 + floor((12-8)/4)).
 *   - Deflection Aura (Advanced Player's Guide p. 89, Defense subdomain of
 *     Protection, replaces Resistant Touch, 1st level): "Allies within the
 *     aura gain a +2 deflection bonus to AC and combat maneuver defense." A
 *     flat +2/+2 with no cleric-level scaling.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, perDayActivationToggleOptions } from "../src/index.js";
import { PER_DAY_ACTIVATIONS_DOMAINS } from "../src/per-day-activations/domains.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human cleric, Wis 16 (+3 mod), chosen domains as given, no active buffs. */
function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "per-day-activations-domains-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Cleric",
      race: HUMAN,
      classes: [{ tag: "cleric", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      clericDomains,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function withActiveBuff(doc: CharacterDoc, buff: ActiveBuff): CharacterDoc {
  return { ...doc, live: { ...doc.live, activeBuffs: [buff] } };
}

function activeBuffFor(buffId: string, casterLevel: number): ActiveBuff {
  const buff = ref.buffs[buffId];
  if (!buff) throw new Error(`buff not found in vendored data: ${buffId}`);
  return {
    instanceId: `buff-${buffId}`,
    buffId,
    name: buff.name,
    changes: buff.changes,
    casterLevel,
  };
}

describe("PER_DAY_ACTIVATIONS_DOMAINS: no wired entries (see file doc comment)", () => {
  it("the shard is empty", () => {
    expect(PER_DAY_ACTIVATIONS_DOMAINS).toEqual({});
  });

  it("none of the audited domain-power feature ids surface a toggle at any level", () => {
    const auditedFeatureIds = [
      "kHXw5V06TkymXxF3", // Aura of Protection — already modeled via grantsBuffs
      "yDG7xVuH7oqWS4Mt", // Deflection Aura — already modeled via grantsBuffs
      "LY6y8GWhXzK8wDDZ", // Wooden Fist — self-facing but level-scaling
      "WMtJbAlvzaLnzYVy", // Might of the Gods — self-facing but level-scaling
      "GidNLmDQBdokwgUn", // Bramble Armor — dice damage to attackers, not the cleric
    ];
    for (const featureId of auditedFeatureIds) {
      expect(perDayActivationToggleOptions(featureId, "cleric", 20)).toEqual([]);
    }
  });
});

describe("Aura of Protection (Protection domain, 8th level): already modeled via grantsBuffs, not this table", () => {
  it("the granting pool's linkedBuffIds already includes the vendored buff", () => {
    const pools = deriveResourcePools(makeCleric(8, ["Protection"]), ref);
    const pool = pools.find((p) => p.id === "kHXw5V06TkymXxF3");
    expect(pool?.linkedBuffIds).toContain("7ReQuzKvSVUtwuC9");
  });

  it("toggling that buff on applies +1 deflection AC at 8th level", () => {
    const noBuff = compute(makeCleric(8, ["Protection"]), ref);
    const withBuff = compute(
      withActiveBuff(makeCleric(8, ["Protection"]), activeBuffFor("7ReQuzKvSVUtwuC9", 8)),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(1);
  });

  it("toggling that buff on applies +2 deflection AC at 12th level (scales +1 per 4 levels beyond 8th)", () => {
    const noBuff = compute(makeCleric(12, ["Protection"]), ref);
    const withBuff = compute(
      withActiveBuff(makeCleric(12, ["Protection"]), activeBuffFor("7ReQuzKvSVUtwuC9", 12)),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(2);
  });
});

describe("Deflection Aura (Defense subdomain, 1st level): already modeled via grantsBuffs, not this table", () => {
  it("the granting pool's linkedBuffIds already includes the vendored buff", () => {
    const pools = deriveResourcePools(makeCleric(1, ["Defense"]), ref);
    const pool = pools.find((p) => p.id === "yDG7xVuH7oqWS4Mt");
    expect(pool?.linkedBuffIds).toContain("GS2jJQtdIw0TlCaD");
  });

  it("toggling that buff on applies +2 deflection AC and +2 CMD", () => {
    const noBuff = compute(makeCleric(1, ["Defense"]), ref);
    const withBuff = compute(
      withActiveBuff(makeCleric(1, ["Defense"]), activeBuffFor("GS2jJQtdIw0TlCaD", 1)),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(2);
    expect(withBuff.cmd - noBuff.cmd).toBe(2);
  });
});
