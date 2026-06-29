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

type Pools = CharacterDoc["live"]["resources"];

function withPools(doc: CharacterDoc, resources: Pools): CharacterDoc {
  return { ...doc, live: { ...doc.live, resources } };
}

/** Ensure each derived pool exists with the current max, preserving `used`. */
export function syncDerivedPools(
  doc: CharacterDoc,
  derived: DerivedResourcePool[],
): CharacterDoc {
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

/** Rest: every pool refilled to full (used → 0). */
export function restAllResources(doc: CharacterDoc): CharacterDoc {
  const resources: Pools = {};
  for (const [id, pool] of Object.entries(doc.live.resources)) {
    resources[id] = { ...pool, used: 0 };
  }
  return withPools(doc, resources);
}

/** Remaining uses of a pool. */
export function remaining(pool: { used: number; max: number }): number {
  return Math.max(0, pool.max - pool.used);
}
