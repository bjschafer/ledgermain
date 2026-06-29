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

function isStackingType(type: string): boolean {
  return STACKING_TYPES.has(type.toLowerCase());
}

/**
 * Resolve a homogeneous set of modifiers (all targeting the same thing) into a
 * total plus a per-modifier `applied` breakdown.
 */
export function resolveStack(mods: TypedModifier[]): StackResult {
  // Highest surviving bonus per non-stacking type. Track the winner's index so
  // ties keep the first-seen modifier applied (deterministic).
  const bestByType = new Map<string, number>();
  const result: ResolvedModifier[] = mods.map((m) => ({ ...m, applied: true }));

  result.forEach((m, idx) => {
    // Penalties and stacking-type bonuses always apply.
    if (m.value < 0 || isStackingType(m.type)) return;
    const key = m.type.toLowerCase();
    const bestIdx = bestByType.get(key);
    if (bestIdx === undefined) {
      bestByType.set(key, idx);
      return;
    }
    const best = result[bestIdx]!;
    if (m.value > best.value) {
      best.applied = false;
      bestByType.set(key, idx);
    } else {
      m.applied = false;
    }
  });

  const total = result.reduce((sum, m) => (m.applied ? sum + m.value : sum), 0);
  return { total, modifiers: result };
}
