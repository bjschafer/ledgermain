/**
 * Resolves an incoming attack against a character's damage reduction and
 * energy resistance (clean-room from the published PF1 rules).
 *
 * Deliberately NOT part of `compute`. `compute(doc, refData)` is a pure
 * function of stored state; an incoming attack is neither stored nor derived
 * from the doc, so this is a second entry point that takes the already-derived
 * {@link Defenses} and the damage someone just announced.
 *
 * Three rules drive the shape here, and each is somewhere a naive pass gets it
 * wrong:
 *
 *  1. **DR applies once per attack, not once per damage type.** A hit for 12
 *     slashing and 6 piercing meets DR 10/— once against the combined 18
 *     physical, not twice for 20. Energy in the same hit is untouched by DR.
 *  2. **Multiple DR lines don't stack — the best applicable one applies.**
 *     Against a nonmagical weapon, a creature with DR 5/— and DR 10/magic
 *     uses the 10; against a magic weapon, only the 5/— still bites. Which is
 *     "best" is decided by how much each would actually absorb, which is
 *     equivalent to picking the highest value in the ordinary case and
 *     correct in the mixed-type ones.
 *  3. **Energy resistance applies per energy type, per instance.** Resist
 *     Fire 10 does nothing to cold damage in the same hit, and applies in
 *     full to every separate fire hit in a round.
 *
 * What bypasses a DR line is not derivable — the engine cannot know the
 * attacker's weapon material or alignment. `bypasses` is therefore an input
 * the player supplies from what the GM said, defaulting to empty (nothing
 * bypasses). The one exception is a DR qualified by a physical damage type
 * (DR 5/bludgeoning): that is decided by the damage itself, so it resolves
 * here without asking. `weapon`-typed damage never satisfies such a
 * qualifier — an unstated subtype is not evidence of the right subtype.
 */

import type { DefenseEntry, Defenses } from "@pf1/schema";

import {
  DR_NONE_QUALIFIER,
  isEnergyDamage,
  isPhysicalDamage,
  normalizeQualifier,
  qualifierLabel,
  type DamageTypeId,
} from "./damage-types.js";

/** One component of an incoming attack. */
export interface IncomingDamage {
  amount: number;
  type: DamageTypeId;
}

/** A defense that actually absorbed something, for the explanation line. */
export interface AppliedReduction {
  /** Display label, e.g. `"DR 10/—"` or `"Resist Fire 10"`. */
  label: string;
  absorbed: number;
}

/**
 * A depleting damage pool contributed by an active buff (*stoneskin*,
 * *protection from energy*). Capacity lives in the buff's caster level; only
 * what is left is passed here.
 */
export interface AblativePool {
  /**
   * The owning buff's `ActiveBuff.instanceId`. For a `"dr"` pool this is
   * matched against the DR line's applied component `sourceId`, which is how
   * a pool is tied to the DR it bounds.
   */
  id: string;
  label: string;
  /** Damage this pool can still absorb. */
  remaining: number;
  /** See `AblativeSpec.kind`. */
  kind: "dr" | "energy";
  /** For an `"energy"` pool, the damage type it soaks. Unused for `"dr"`. */
  element?: DamageTypeId;
}

/** How much of a pool this attack consumed, for the caller to persist. */
export interface PoolConsumption {
  id: string;
  absorbed: number;
  /** True when this attack drained the pool to nothing, ending the buff. */
  exhausted: boolean;
}

/** Per-term outcome, in input order. */
export interface ResolvedDamageTerm {
  amount: number;
  type: DamageTypeId;
  /** What this term contributes after reduction. */
  final: number;
}

export interface DamageResolution {
  /** Total before any reduction. */
  raw: number;
  /** Total after DR and energy resistance — the number to apply to HP. */
  final: number;
  reductions: AppliedReduction[];
  terms: ResolvedDamageTerm[];
  /** Pool draw-down this attack caused; empty when no pool was touched. */
  pools: PoolConsumption[];
}

export interface DamageResolutionOptions {
  /**
   * Qualifiers this attack satisfies — `["adamantine"]`, `["magic",
   * "silver"]`. Supplied by the player from what the GM said, never inferred.
   */
  bypasses?: readonly string[];
  /** Ablative pools currently protecting the character. */
  pools?: readonly AblativePool[];
}

/**
 * Whether `bypasses` satisfies a DR qualifier. Handles the compound forms:
 * "silver and magic" needs both, "cold iron or good" needs either. `—` is
 * never satisfied.
 *
 * The `-and-`/`-or-` split is safe against hyphenated qualifiers because the
 * separators carry their own surrounding hyphens: `cold-iron-or-good` splits
 * on `-or-` into `cold-iron` and `good`.
 */
export function qualifierBypassedBy(qualifier: string, bypasses: readonly string[]): boolean {
  if (qualifier === DR_NONE_QUALIFIER) return false;
  const have = new Set(bypasses.map(normalizeQualifier));

  if (qualifier.includes("-and-")) {
    return qualifier.split("-and-").every((part) => have.has(part));
  }
  if (qualifier.includes("-or-")) {
    return qualifier.split("-or-").some((part) => have.has(part));
  }
  return have.has(qualifier);
}

/**
 * Physical damage a given DR line can bite into: everything physical, minus
 * any term whose own damage type satisfies the qualifier (DR 5/bludgeoning
 * against a hit that includes bludgeoning). Returns 0 when the attack's
 * declared `bypasses` defeat the line outright.
 */
function applicablePhysical(
  entry: DefenseEntry,
  terms: readonly IncomingDamage[],
  bypasses: readonly string[],
): number {
  if (qualifierBypassedBy(entry.qualifier, bypasses)) return 0;
  return terms
    .filter((t) => isPhysicalDamage(t.type) && t.type !== entry.qualifier)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Applies DR and energy resistance to an incoming attack.
 *
 * `defenses` is `DerivedSheet.defenses`, which is `undefined` for a character
 * with no DR/resistance/SR at all — that case resolves to the raw damage
 * unchanged rather than being an error.
 *
 * Per-term `final` values distribute the single DR absorption across physical
 * terms greedily in input order. The total is exact either way; the split
 * only affects how the preview renders a mixed-physical hit.
 */
export function resolveDamage(
  terms: readonly IncomingDamage[],
  defenses: Defenses | undefined,
  options: DamageResolutionOptions = {},
): DamageResolution {
  const bypasses = options.bypasses ?? [];
  const allPools = options.pools ?? [];
  const raw = terms.reduce((sum, t) => sum + t.amount, 0);
  const reductions: AppliedReduction[] = [];
  const finals = terms.map((t) => t.amount);
  const consumed = new Map<string, number>();

  const drawPool = (pool: AblativePool, amount: number) => {
    if (amount <= 0) return;
    consumed.set(pool.id, (consumed.get(pool.id) ?? 0) + amount);
  };

  // --- Ablative energy pools absorb first. RAW: when both protection from
  // energy and resist energy are up, the pool is spent before the resistance
  // applies. ---
  for (const pool of allPools) {
    if (pool.kind !== "energy" || !pool.element) continue;
    let left = pool.remaining;
    for (let i = 0; i < terms.length && left > 0; i++) {
      if (terms[i]!.type !== pool.element) continue;
      const bite = Math.min(left, finals[i]!);
      if (bite <= 0) continue;
      finals[i] = finals[i]! - bite;
      left -= bite;
      drawPool(pool, bite);
    }
    const used = consumed.get(pool.id) ?? 0;
    if (used > 0) reductions.push({ label: pool.label, absorbed: used });
  }

  // --- Damage reduction: one line, once, across all physical damage. ---
  // A DR line backed by a pool can absorb no more than the pool has left, so
  // the pool is folded in before choosing the best line — a nearly-spent
  // stoneskin should lose to a smaller but unlimited DR/—.
  const poolForEntry = (entry: DefenseEntry): AblativePool | undefined => {
    const applied = entry.components.find((c) => c.applied);
    if (!applied?.sourceId) return undefined;
    return allPools.find((p) => p.kind === "dr" && p.id === applied.sourceId);
  };

  let bestEntry: DefenseEntry | undefined;
  let bestPool: AblativePool | undefined;
  let bestAbsorbed = 0;
  for (const entry of defenses?.dr ?? []) {
    const available = applicablePhysical(entry, terms, bypasses);
    const pool = poolForEntry(entry);
    const cap = pool ? Math.min(entry.total, pool.remaining) : entry.total;
    const absorbed = Math.min(cap, available);
    if (absorbed > bestAbsorbed) {
      bestAbsorbed = absorbed;
      bestEntry = entry;
      bestPool = pool;
    }
  }

  if (bestEntry && bestAbsorbed > 0) {
    reductions.push({
      label: `DR ${bestEntry.total}/${qualifierLabel(bestEntry.qualifier)}`,
      absorbed: bestAbsorbed,
    });
    if (bestPool) drawPool(bestPool, bestAbsorbed);
    let remaining = bestAbsorbed;
    for (let i = 0; i < terms.length && remaining > 0; i++) {
      const term = terms[i]!;
      if (!isPhysicalDamage(term.type) || term.type === bestEntry.qualifier) continue;
      const bite = Math.min(remaining, finals[i]!);
      finals[i] = finals[i]! - bite;
      remaining -= bite;
    }
  }

  // --- Energy resistance: independently, per energy type. ---
  const byType = new Map<string, DefenseEntry>();
  for (const entry of defenses?.resistances ?? []) byType.set(entry.qualifier, entry);

  const absorbedByType = new Map<string, number>();
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i]!;
    if (!isEnergyDamage(term.type)) continue;
    const entry = byType.get(term.type);
    if (!entry) continue;
    // Resistance applies in full to each separate instance, but a single
    // announced hit lists a given energy type once, so terms sharing a type
    // are treated as one instance and share the pool.
    const alreadyUsed = absorbedByType.get(term.type) ?? 0;
    const bite = Math.min(finals[i]!, Math.max(0, entry.total - alreadyUsed));
    if (bite <= 0) continue;
    finals[i] = finals[i]! - bite;
    absorbedByType.set(term.type, alreadyUsed + bite);
  }

  for (const [type, absorbed] of absorbedByType) {
    const entry = byType.get(type)!;
    reductions.push({
      label: `Resist ${qualifierLabel(entry.qualifier)} ${entry.total}`,
      absorbed,
    });
  }

  return {
    raw,
    final: finals.reduce((sum, n) => sum + n, 0),
    reductions,
    terms: terms.map((t, i) => ({ amount: t.amount, type: t.type, final: finals[i]! })),
    pools: [...consumed].map(([id, absorbed]) => ({
      id,
      absorbed,
      exhausted: absorbed >= (allPools.find((p) => p.id === id)?.remaining ?? 0),
    })),
  };
}
