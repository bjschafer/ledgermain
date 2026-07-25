/**
 * Live ablative-pool state: the bridge between an `ActiveBuff` carrying an
 * `absorbed` counter and the engine's `resolveDamage`, which wants to know how
 * much each pool has left.
 *
 * Capacity is deliberately not stored on the doc. It is a formula of the
 * buff's caster level (`BUFF_INSTANCE_STATE`), so deriving it on read means a
 * corrected caster level re-derives the right capacity instead of stranding a
 * stale total — the same reason the doc holds build choices and live state but
 * never derived values.
 */
import {
  buffInstanceState,
  tryEvaluateFormula,
  type AblativePool,
  type DamageTypeId,
  type PoolConsumption,
} from "@pf1/engine";
import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

/** A pool plus the display context the tracker needs to render it. */
export interface LivePool extends AblativePool {
  capacity: number;
  absorbed: number;
  exhaustedNote: string;
}

/**
 * Derives every ablative pool currently protecting the character, in
 * `activeBuffs` order. A buff whose spec has no `ablative` section, or whose
 * capacity formula doesn't resolve to a positive number, contributes nothing.
 */
export function livePools(doc: CharacterDoc, characterLevel: number): LivePool[] {
  const pools: LivePool[] = [];
  for (const buff of doc.live.activeBuffs) {
    const spec = buffInstanceState(buff.name)?.ablative;
    if (!spec) continue;
    const capacity = poolCapacity(buff, characterLevel);
    if (capacity <= 0) continue;
    const absorbed = Math.max(0, buff.absorbed ?? 0);
    pools.push({
      id: buff.instanceId,
      label: buff.name,
      capacity,
      absorbed,
      remaining: Math.max(0, capacity - absorbed),
      kind: spec.kind,
      element: buff.element as DamageTypeId | undefined,
      exhaustedNote: spec.exhaustedNote,
    });
  }
  return pools;
}

/**
 * Pool capacity for one buff. `@item.level` resolves to the buff's caster
 * level, matching how every other buff formula is evaluated; a buff with no
 * caster level falls back to character level.
 */
export function poolCapacity(buff: ActiveBuff, characterLevel: number): number {
  const spec = buffInstanceState(buff.name)?.ablative;
  if (!spec) return 0;
  const level = buff.casterLevel ?? characterLevel;
  const value = tryEvaluateFormula(spec.capacityFormula, { item: { level }, cl: level });
  return value !== null && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Applies an attack's pool draw-down: adds to each buff's `absorbed`, and
 * removes any buff whose pool this attack exhausted (a discharged spell ends
 * rather than lingering at zero).
 */
export function consumePools(
  doc: CharacterDoc,
  consumption: readonly PoolConsumption[],
): CharacterDoc {
  if (consumption.length === 0) return doc;
  const byId = new Map(consumption.map((c) => [c.id, c]));

  const activeBuffs = doc.live.activeBuffs
    .map((buff) => {
      const used = byId.get(buff.instanceId);
      if (!used) return buff;
      return { ...buff, absorbed: (buff.absorbed ?? 0) + used.absorbed };
    })
    .filter((buff) => !byId.get(buff.instanceId)?.exhausted);

  return { ...doc, live: { ...doc.live, activeBuffs } };
}
