/**
 * Composes the free-text damage parser with the engine's DR/resistance
 * resolver into the single view object `HpPanel` renders — parse what was
 * typed, resolve it against the character's defenses, and say plainly what
 * will be applied and why.
 *
 * The whole point of surfacing this rather than silently applying a reduced
 * number is that two of its inputs are assumptions the app is not entitled to
 * make on its own: an untyped amount is *assumed* to be weapon damage (see
 * `DEFAULT_DAMAGE_TYPE`), and whether the attack bypassed a DR line is
 * something only the GM knows. Both are visible and both are overridable —
 * type an explicit damage type to fix the first, toggle a bypass chip for the
 * second.
 */
import { resolveDamage, type DamageResolution } from "@pf1/engine";
import type { Defenses } from "@pf1/schema";

import { parseDamageInput, type DamageParse } from "./damageInput.js";

export interface DamagePreview {
  /** False when nothing parseable was typed; the panel shows no preview. */
  ok: boolean;
  parse: DamageParse;
  resolution: DamageResolution;
  /** What the Damage button applies — the post-DR/resistance total. */
  amount: number;
  /** Raw total, which is what Heal and Nonlethal use (neither is reduced). */
  raw: number;
  /** True when defenses actually changed the number. */
  reduced: boolean;
  /**
   * True when the amount that will be applied rests on the weapon-damage
   * assumption rather than a stated type, so the panel can say so.
   */
  assumed: boolean;
  /** Distinct bypass atoms the character's DR cares about, for the chip row. */
  bypassOptions: string[];
  /** One-line explanation, e.g. `"18 → 3 · DR 10/—, Resist cold 5"`. */
  summary: string;
}

/**
 * Every distinct qualifier atom across the character's DR lines, minus the
 * unbypassable `—`. Compound qualifiers are split into their parts so "DR
 * 10/silver and magic" offers a `silver` chip and a `magic` chip rather than
 * one unusable combined chip.
 */
export function bypassOptionsFor(defenses: Defenses | undefined): string[] {
  const atoms = new Set<string>();
  for (const entry of defenses?.dr ?? []) {
    if (entry.qualifier === "—") continue;
    for (const part of entry.qualifier.split(/-and-|-or-/)) {
      if (part) atoms.add(part);
    }
  }
  return [...atoms].sort();
}

/** Builds the panel's view of what typing `raw` would do. */
export function damagePreview(
  raw: string,
  defenses: Defenses | undefined,
  bypasses: readonly string[] = [],
): DamagePreview {
  const parse = parseDamageInput(raw);
  const resolution = resolveDamage(parse.terms, defenses, { bypasses });
  const reduced = resolution.final !== resolution.raw;
  // Only an assumption that DR actually acted on is worth flagging; an
  // inferred type on a character with no DR changed nothing.
  const assumed = reduced && parse.terms.some((t) => t.inferred);

  const detail = resolution.reductions.map((r) => r.label).join(", ");
  const summary = !parse.ok
    ? ""
    : reduced
      ? `${resolution.raw} → ${resolution.final}${detail ? ` · ${detail}` : ""}`
      : `${resolution.final}`;

  return {
    ok: parse.ok,
    parse,
    resolution,
    amount: resolution.final,
    raw: resolution.raw,
    reduced,
    assumed,
    bypassOptions: bypassOptionsFor(defenses),
    summary,
  };
}
