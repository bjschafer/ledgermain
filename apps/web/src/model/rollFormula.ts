/**
 * VTT-pasteable roll formulas (issue #96). The tracker has no dice roller by
 * design (see `savedRolls.ts`) — the at-the-table loop is "read the number,
 * roll it somewhere else", and for most tables "somewhere else" is a VTT chat
 * box. These turn a total the engine already computed into the plain text
 * that box expects.
 *
 * Output is ASCII with spaces around the operator (`1d20 + 10`) — the dialect
 * Foundry (`/r 1d20 + 10`) and Roll20 (`/roll 1d20+10`) both parse. Nothing
 * here is display formatting: `signed`/`signedSequence` in `names.ts` still
 * own how a number *reads* on the sheet.
 */

/** One `1d20 ± n` term. A zero total is bare `1d20` — no `+ 0` noise. */
function d20Term(total: number): string {
  if (total === 0) return "1d20";
  return `1d20 ${total > 0 ? "+" : "-"} ${Math.abs(total)}`;
}

/**
 * One d20 formula per entry in `totals`, newline-separated — an iterative full
 * attack (`+11/+6`) copies as two independently-rollable formulas rather than
 * one meaningless combined roll. Both major VTT chat inputs are textareas and
 * take the pasted newline as-is.
 */
export function d20Formula(totals: number[]): string {
  if (totals.length === 0) return d20Term(0);
  return totals.map(d20Term).join("\n");
}

/**
 * `d20Formula` for a stat that may carry an iterative attack sequence,
 * mirroring `signedSequence`'s single-total fallback so the copied formula and
 * the displayed value never disagree about how many attacks there are.
 */
export function d20FormulaFor(total: number, iteratives?: number[]): string {
  return d20Formula(iteratives && iteratives.length > 1 ? iteratives : [total]);
}

/**
 * A damage formula, e.g. `1d8 + 6`. Falls back to the bare bonus when a
 * weapon has no damage dice, and to the bare dice when the bonus is zero.
 */
export function damageFormula(dice: string | undefined, bonus: number): string {
  const d = dice?.trim();
  if (!d) return String(bonus);
  if (bonus === 0) return d;
  return `${d} ${bonus > 0 ? "+" : "-"} ${Math.abs(bonus)}`;
}

/**
 * How a copied formula is announced in the toast: the formula itself when
 * it's a single roll, a count when it's a multi-attack sequence (the whole
 * sequence would overflow the toast and read as noise).
 */
export function formulaPreview(formula: string): string {
  const lines = formula.split("\n");
  return lines.length > 1 ? `${lines.length} rolls` : `"${formula}"`;
}
