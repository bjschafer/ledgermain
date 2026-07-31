/**
 * Pure transitions for live resource pools (`doc.live.resources`: id → {used, max}).
 *
 * Two kinds of pool:
 *   - Derived: class-feature pools whose max comes from `uses.maxFormula`
 *     (Rage rounds/day, Channel Energy). The engine's `deriveResourcePools`
 *     supplies id + max; `syncDerivedPools` keeps them in step with the build.
 *   - Manual: spell slots and item charges. The vendored data has no per-class
 *     spell-slot tables or item charge counts, so these are user-entered pools
 *     (the documented Stage 4 limitation). Their key doubles as the display label.
 */

import type { DerivedResourcePool } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { addNonlethal, healNonlethal } from "./hp.js";

type Pools = CharacterDoc["live"]["resources"];

function withPools(doc: CharacterDoc, resources: Pools): CharacterDoc {
  return { ...doc, live: { ...doc.live, resources } };
}

/** Ensure each derived pool exists with the current max, preserving `used`. */
export function syncDerivedPools(doc: CharacterDoc, derived: DerivedResourcePool[]): CharacterDoc {
  let changed = false;
  const resources: Pools = { ...doc.live.resources };
  for (const pool of derived) {
    const existing = resources[pool.id];
    if (!existing) {
      resources[pool.id] = { used: 0, max: pool.max };
      changed = true;
    } else if (existing.max !== pool.max) {
      resources[pool.id] = { used: Math.min(existing.used, pool.max), max: pool.max };
      changed = true;
    }
  }
  return changed ? withPools(doc, resources) : doc;
}

/** Add (or overwrite the max of) a manual pool keyed by its display label. */
export function addManualPool(doc: CharacterDoc, label: string, max: number): CharacterDoc {
  const key = label.trim();
  if (!key) return doc;
  const m = Math.max(0, Math.trunc(max));
  const existing = doc.live.resources[key];
  return withPools(doc, {
    ...doc.live.resources,
    [key]: { used: existing ? Math.min(existing.used, m) : 0, max: m },
  });
}

export function removePool(doc: CharacterDoc, id: string): CharacterDoc {
  if (!(id in doc.live.resources)) return doc;
  const resources = { ...doc.live.resources };
  delete resources[id];
  return withPools(doc, resources);
}

/** Spend `n` uses from a pool (clamped to its max). */
export function drainResource(doc: CharacterDoc, id: string, n = 1): CharacterDoc {
  const pool = doc.live.resources[id];
  if (!pool) return doc;
  const used = Math.min(pool.max, pool.used + Math.trunc(n));
  return withPools(doc, { ...doc.live.resources, [id]: { ...pool, used } });
}

/** Restore `n` uses to a pool (floored at 0). */
export function restoreResource(doc: CharacterDoc, id: string, n = 1): CharacterDoc {
  const pool = doc.live.resources[id];
  if (!pool) return doc;
  const used = Math.max(0, pool.used - Math.trunc(n));
  return withPools(doc, { ...doc.live.resources, [id]: { ...pool, used } });
}

/**
 * Rest: every pool's remaining uses reset to its refill value (issue #43).
 * `derived` (from `deriveResourcePools`) supplies each pool's `restValue` —
 * `max` for almost every pool (byte-identical to the old always-full
 * behavior), but strictly below `max` for Arcane Reservoir (see
 * `DerivedResourcePool.restValue`'s doc comment for the RAW citation).
 * A pool with no matching entry in `derived` (manual pools: spell slots,
 * item charges, or any call site that omits `derived` entirely) falls back
 * to the pre-#43 behavior of refilling to full.
 */
export function restAllResources(
  doc: CharacterDoc,
  derived?: readonly Pick<DerivedResourcePool, "id" | "restValue">[],
): CharacterDoc {
  const restValueById = new Map(derived?.map((p) => [p.id, p.restValue]));
  const resources: Pools = {};
  for (const [id, pool] of Object.entries(doc.live.resources)) {
    const restValue = restValueById.get(id);
    const used = restValue === undefined ? 0 : Math.max(0, pool.max - restValue);
    resources[id] = { ...pool, used };
  }
  return withPools(doc, resources);
}

/** Remaining uses of a pool. */
export function remaining(pool: { used: number; max: number }): number {
  return Math.max(0, pool.max - pool.used);
}

/* ------------------------------------------------- self-damaging pools -- */

/** The `deriveResourcePools` fields these helpers need — see `DerivedResourcePool`. */
type SelfDamagingPool = Pick<DerivedResourcePool, "id" | "nonlethalPerUse">;

/**
 * Spend `n` uses and take the nonlethal damage that spending them costs.
 *
 * The kineticist's Burn is the only pool that carries `nonlethalPerUse`
 * ("For each point of burn she accepts, a kineticist takes 1 point of
 * nonlethal damage per character level"), and the amount comes from the
 * engine rather than being re-derived here.
 *
 * `immuneToNonlethal` (from `isImmuneToNonlethal`) suppresses the damage.
 * RAW a kineticist who can't take nonlethal damage can't accept burn at all;
 * this app warns rather than blocks everywhere else, so the counter still
 * moves and only the hit points are left alone.
 *
 * What this CANNOT know: which of a character's accumulated nonlethal damage
 * came from burn. Releasing burn heals the same amount it cost, so a level
 * change between accepting and releasing leaves the two out of step — the
 * same limitation `applyGrantedTempHp` documents for temp HP.
 */
export function spendPool(
  doc: CharacterDoc,
  pool: SelfDamagingPool,
  n = 1,
  opts?: { immuneToNonlethal?: boolean },
): CharacterDoc {
  const before = doc.live.resources[pool.id];
  const spent = drainResource(doc, pool.id, n);
  const actual = (spent.live.resources[pool.id]?.used ?? 0) - (before?.used ?? 0);
  if (actual <= 0 || !pool.nonlethalPerUse || opts?.immuneToNonlethal) return spent;
  return addNonlethal(spent, actual * pool.nonlethalPerUse);
}

/** Restore `n` uses, healing the nonlethal damage those uses inflicted. Inverse of {@link spendPool}. */
export function restorePool(doc: CharacterDoc, pool: SelfDamagingPool, n = 1): CharacterDoc {
  const before = doc.live.resources[pool.id];
  const restored = restoreResource(doc, pool.id, n);
  const actual = (before?.used ?? 0) - (restored.live.resources[pool.id]?.used ?? 0);
  if (actual <= 0 || !pool.nonlethalPerUse) return restored;
  return healNonlethal(restored, actual * pool.nonlethalPerUse);
}

/**
 * Rest every pool, healing the nonlethal damage the self-damaging ones were
 * holding — "a full night's rest ... removes all burn and associated
 * nonlethal damage". Nonlethal from other sources is left alone, since this
 * is the Resources panel's rest button and not a night's sleep; the Play
 * tab's New Day action clears nonlethal outright (see `model/rest.ts`).
 */
export function restAllResourcesWithRecovery(
  doc: CharacterDoc,
  derived: readonly DerivedResourcePool[],
): CharacterDoc {
  let healed = doc;
  for (const pool of derived) {
    if (!pool.nonlethalPerUse) continue;
    const used = doc.live.resources[pool.id]?.used ?? 0;
    const released = Math.max(0, used - Math.max(0, pool.max - pool.restValue));
    if (released > 0) healed = healNonlethal(healed, released * pool.nonlethalPerUse);
  }
  return restAllResources(healed, derived);
}
