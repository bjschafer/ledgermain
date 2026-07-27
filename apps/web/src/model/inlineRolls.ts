/**
 * Resolves Foundry's `[[formula]]` inline-roll syntax in vendored rules text
 * to plain numbers at render time.
 *
 * The data-pipeline already flattens every inline roll it can at build time,
 * but the ones whose formula reads an `@` path need a character to evaluate
 * against — which a build step doesn't have — so they reach the app intact
 * and would otherwise be shown to the player verbatim ("You have SR
 * `[[5 + @attributes.hd.total]]`"). This module is the render-time other half:
 * given the active character's roll data, the same expressions become "SR 12".
 *
 * Two outcomes, and the distinction matters:
 *
 * - Every `@` path in the expression exists in the roll data → substitute the
 *   evaluated number.
 * - Any path is absent → the expression is NOT evaluated. Foundry resolves a
 *   missing path to 0, which here would print a confident, wrong number
 *   ("0 remaining uses"). Almost every such case is `@resources.*`, Foundry's
 *   per-day use counter, which this app tracks in its own resource pools
 *   rather than in roll data; the surrounding prose already states the
 *   frequency ("Once per day, … ([[…]] remaining uses)"), so the parenthetical
 *   is dropped whole and anything else becomes an em dash.
 */

import { tryEvaluateFormula } from "@pf1/engine";
import type { RollData } from "@pf1/engine";

/**
 * `[[ … ]]`, non-greedy so adjacent rolls in one string stay separate, and
 * tolerant of the mistyped terminators a handful of source entries ship
 * (`+[[1] Trait bonus`, `+[[1[[ Trait bonus`) — the same typos
 * `data-pipeline`'s `MALFORMED_INLINE_ROLL_RE` accommodates. Brackets are
 * excluded from the expression itself, so a typo can't swallow the rest of
 * the string looking for a terminator that never comes.
 */
const INLINE_ROLL = /\[\[([^[\]]*?)(?:\]\]|\]|\[\[)/g;

/** An `@path` token, matching the formula lexer's letters/digits/dots run. */
const DATA_PATH = /@[A-Za-z_][A-Za-z0-9_.]*/g;

/**
 * Placeholder for an expression that couldn't be resolved, parked in the
 * string so the cleanup pass below can find it. U+FFFC (OBJECT REPLACEMENT
 * CHARACTER) never appears in vendored rules text, so it can't collide with
 * real content.
 */
const UNRESOLVED = "\uFFFC";

/** A parenthetical whose only reason to exist is an unresolved expression. */
const DEAD_PARENTHETICAL = /\s*\([^()]*\uFFFC[^()]*\)/g;

/** True when `path` resolves to a number or boolean leaf, mirroring the evaluator's `resolvePath`. */
function pathResolves(path: string, data: RollData): boolean {
  let cur: unknown = data;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === "number" || typeof cur === "boolean";
}

/** Rounds to at most two decimals and drops a trailing `.0` (`3`, not `3.0`; `2.5` kept). */
function formatValue(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Substitutes one `[[expr]]`'s resolved value, or {@link UNRESOLVED} when the
 * expression reads a path this app has no roll-data entry for, when it carries
 * a dice term, or when it doesn't parse.
 */
function resolveExpression(expr: string, rollData: RollData): string {
  const paths = expr.match(DATA_PATH) ?? [];
  if (paths.some((p) => !pathResolves(p.slice(1), rollData))) return UNRESOLVED;
  const value = tryEvaluateFormula(expr, rollData);
  return value === null || Number.isNaN(value) ? UNRESOLVED : formatValue(value);
}

/**
 * Clears the wreckage an unresolved expression leaves behind: a parenthetical
 * built around it ("(… remaining uses)") goes entirely, a bare one becomes an
 * em dash, and the doubled spaces and spaces orphaned before punctuation are
 * collapsed.
 */
function tidy(text: string): string {
  return text
    .replace(DEAD_PARENTHETICAL, "")
    .replaceAll(UNRESOLVED, "—")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .trim();
}

/**
 * Resolves every inline roll in `text` against `rollData`. Returns `text`
 * untouched when it carries no inline-roll syntax at all — the overwhelmingly
 * common case, since only the vendored trait, alternate-racial-trait, race,
 * and buff strings carry any.
 *
 * Safe on HTML: inline rolls only ever occur in text content, and neither the
 * substitution nor the cleanup pass can introduce markup (the cleanup's
 * parenthetical strip is bounded by `[^()]*`, so it can't span a tag).
 */
export function resolveInlineRolls(text: string, rollData: RollData): string {
  if (!text.includes("[[")) return text;
  const substituted = text.replace(INLINE_ROLL, (_m, expr: string) =>
    resolveExpression(expr.trim(), rollData),
  );
  return substituted.includes(UNRESOLVED) ? tidy(substituted) : substituted;
}
