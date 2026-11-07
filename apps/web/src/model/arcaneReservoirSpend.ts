/**
 * The arcanist's base reservoir spend (+1 DC, +2 with Potent Magic) is a
 * per-spell cost, so its toggle is armed rather than held: switching it on
 * readies it for the next arcanist spell, and that cast pays the point and
 * switches it off.
 */
import { ARCANE_RESERVOIR_SPELL_DC_ID, type DerivedResourcePool } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { removeBuff } from "./buffs.js";
import { spendPool, syncDerivedPools } from "./resources.js";

function reservoirPool(pools: readonly DerivedResourcePool[]): DerivedResourcePool | undefined {
  return pools.find((p) => p.tableOptions?.some((o) => o.id === ARCANE_RESERVOIR_SPELL_DC_ID));
}

/** Whether the spell-DC spend is armed. */
export function reservoirDcArmed(doc: CharacterDoc): boolean {
  return doc.live.activeBuffs.some((b) => b.effectTag === ARCANE_RESERVOIR_SPELL_DC_ID);
}

/**
 * Pay for an armed spell-DC spend after an arcanist cast: 1 reservoir point,
 * and the toggle off. An empty reservoir still disarms it, since the cast that
 * would have paid for it has happened. Returns `doc` unchanged when nothing is
 * armed.
 */
export function payArmedReservoirDc(
  doc: CharacterDoc,
  pools: readonly DerivedResourcePool[],
): CharacterDoc {
  const armed = doc.live.activeBuffs.find((b) => b.effectTag === ARCANE_RESERVOIR_SPELL_DC_ID);
  if (!armed) return doc;
  const pool = reservoirPool(pools);
  const paid = pool ? spendPool(syncDerivedPools(doc, [pool]), pool, 1) : doc;
  return removeBuff(paid, armed.instanceId);
}
