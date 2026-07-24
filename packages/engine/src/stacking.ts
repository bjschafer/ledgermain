/**
 * Typed bonus-stacking engine (clean-room), implemented from the PF1 rules:
 *
 *   - Same-type *bonuses* do NOT stack → take the highest.
 *   - `dodge`, `untyped`, and `circumstance` bonuses DO stack → sum.
 *   - *Penalties* (negative values) always stack, regardless of type.
 *   - Untyped values (bonus or penalty) always stack.
 *
 * Provenance is preserved: every input modifier appears in the result with an
 * `applied` flag (false = overridden by a higher same-type bonus), so the UI can
 * strike out the loser. Reimplemented from the rules; Foundry's apply-changes is
 * used only as a behavioural oracle in tests (DESIGN §6).
 */

/** A typed modifier ready for stacking (its formula already evaluated). */
export interface TypedModifier {
  /** Stacking category, e.g. "enh", "morale", "dodge", "untyped", "racial". */
  type: string;
  value: number;
  /** Human-readable provenance label, e.g. "Belt of Physical Might +4". */
  source: string;
  /** Originating entity id, where applicable. */
  sourceId?: string;
}

export interface ResolvedModifier extends TypedModifier {
  /** False when overridden by a higher same-type bonus. */
  applied: boolean;
}

export interface StackResult {
  /** Sum of all applied modifier values. */
  total: number;
  /** Every input modifier, with its `applied` flag set. */
  modifiers: ResolvedModifier[];
}

/**
 * Bonus types whose same-type bonuses stack (sum) rather than taking the highest.
 * Empty string is treated as untyped.
 */
const STACKING_TYPES = new Set(["dodge", "untyped", "circumstance", ""]);

/**
 * Of the stacking types above, `circumstance` is the one RAW carves an
 * exception into: bonuses stack "unless from essentially the same source".
 * Grouped by display-name `source` — the same "same source" convention
 * `computeGrantedTempHp` (compute.ts) uses for temp HP, since two instances of
 * the identical effect share a `source` string even when their `sourceId`s
 * differ. Dodge/untyped bonuses have no such exception and always stack.
 */
const SAME_SOURCE_LIMITED_TYPES = new Set(["circumstance"]);

function isStackingType(type: string): boolean {
  return STACKING_TYPES.has(type.toLowerCase());
}

/** Applies `m` against the current best-seen modifier for `key`, marking the loser unapplied. */
function competeAgainstBest(
  result: ResolvedModifier[],
  best: Map<string, number>,
  key: string,
  m: ResolvedModifier,
  idx: number,
): void {
  const bestIdx = best.get(key);
  if (bestIdx === undefined) {
    best.set(key, idx);
    return;
  }
  const bestMod = result[bestIdx]!;
  if (m.value > bestMod.value) {
    bestMod.applied = false;
    best.set(key, idx);
  } else {
    m.applied = false;
  }
}

/**
 * Resolve a homogeneous set of modifiers (all targeting the same thing) into a
 * total plus a per-modifier `applied` breakdown.
 */
export function resolveStack(mods: TypedModifier[]): StackResult {
  // Highest surviving bonus per non-stacking type, and (separately) per
  // same-source group within a same-source-limited stacking type. Track the
  // winner's index so ties keep the first-seen modifier applied (deterministic).
  const bestByType = new Map<string, number>();
  const bestBySource = new Map<string, number>();
  const result: ResolvedModifier[] = mods.map((m) => ({ ...m, applied: true }));

  result.forEach((m, idx) => {
    if (m.value < 0) return; // penalties always stack, regardless of type
    const type = m.type.toLowerCase();
    if (SAME_SOURCE_LIMITED_TYPES.has(type)) {
      competeAgainstBest(result, bestBySource, `${type}|${m.source}`, m, idx);
      return;
    }
    if (isStackingType(type)) return; // dodge/untyped/"" bonuses always stack
    competeAgainstBest(result, bestByType, type, m, idx);
  });

  const total = result.reduce((sum, m) => (m.applied ? sum + m.value : sum), 0);
  return { total, modifiers: result };
}
