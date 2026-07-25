/**
 * Free-text damage parser — turns what a GM actually says at the table into
 * typed damage terms, with a bare number staying exactly as fast as it is
 * today.
 *
 * The design constraint is that typing must be optional and near-free.
 * `"17"` parses to a single unspecified term and behaves identically to the
 * plain number field it replaces; everything below is opt-in shorthand that
 * costs a few keystrokes when the GM happens to name a type.
 *
 * Two phrasings are common and mean opposite things:
 *
 *   - "12 bludgeoning and 6 cold"          -> ADDITIVE, 18 total
 *   - "9 damage, 3 of which are cold"      -> CARVE-OUT, 9 total (6 + 3)
 *
 * They are distinguished by whether the leading term carries a type. A bare
 * untyped number in front reads as a stated *total* that the typed terms
 * partition; a typed leading term reads as one damage component among
 * several. An explicit `+`/`and`/`plus` always forces additive, and an
 * explicit "of which" always forces carve-out, so either reading stays
 * reachable when the heuristic guesses wrong.
 *
 * Nothing here decides what the numbers *mean* for a character — no DR or
 * resistance is consulted. This module only answers "what did they say",
 * which keeps it testable without a doc, a sheet, or RefData.
 */
import { resolveDamageWord, type DamageTypeId } from "@pf1/engine";

/**
 * What an amount with no type word attached is assumed to be. Unqualified
 * damage at a table is overwhelmingly weapon damage ("you take 9 damage" from
 * a claw or a greatsword), and assuming otherwise would silently skip the DR
 * the character actually has. `unspecified` stays reachable by typing it, for
 * the case where DR genuinely shouldn't apply.
 */
export const DEFAULT_DAMAGE_TYPE: DamageTypeId = "weapon";

/** One component of an incoming attack. */
export interface DamageTerm {
  amount: number;
  type: DamageTypeId;
  /**
   * True when `type` came from {@link DEFAULT_DAMAGE_TYPE} rather than from a
   * word in the input. Drives two things: the carve-out heuristic (a bare
   * leading amount reads as a stated total, a named one doesn't), and the
   * UI's ability to mark an assumed type as assumed rather than presenting a
   * guess as though the GM had said it.
   */
  inferred?: boolean;
}

/**
 * Which reading the parser took. Surfaced so the UI can show it and offer the
 * other one — a misread must cost a keystroke, not a wrong HP total.
 */
export type DamageParseMode = "additive" | "carve-out";

export interface DamageParse {
  /** False when the input contained no number at all; `terms` is then empty. */
  ok: boolean;
  terms: DamageTerm[];
  /** Sum of `terms` — the amount that would actually be applied. */
  total: number;
  mode: DamageParseMode;
  /**
   * Human-readable notes about anything the parser had to decide or discard
   * (an unrecognized type word, a carve-out that overflowed its total).
   * Always safe to ignore; never a reason to reject the input.
   */
  warnings: string[];
}

/**
 * Words that carry no meaning in a damage phrase and are dropped before
 * parsing, so "9 points of fire damage" reduces to "9 fire". `damage` is
 * filler while `weapon` is a type, which is what lets "9 points of weapon
 * damage" resolve correctly.
 */
const FILLER = new Set([
  "points",
  "point",
  "pts",
  "pt",
  "hp",
  "of",
  "are",
  "is",
  "in",
  "you",
  "take",
  "takes",
  "took",
  "for",
  "damage",
  "dmg",
  "the",
  "a",
  "an",
]);

/** Tokens that force the additive reading. */
const ADDITIVE_MARKERS = new Set(["+", "and", "plus", "&"]);

/** Tokens that force the carve-out reading ("9 damage, 3 of which are cold"). */
const CARVE_MARKERS = new Set(["which"]);

/**
 * Splits raw input into comparable tokens: punctuation becomes whitespace,
 * `+`/`&` survive as their own tokens, and a digit run glued to a letter run
 * (`"12b"`) is separated so the shorthand works without a space.
 */
function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[+&]/g, " $& ")
    .replace(/[^a-z0-9+&]+/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Parses free-text damage. Never throws: unparseable input comes back with
 * `ok: false` and an empty term list, which callers treat as "no damage
 * entered yet" rather than as an error to show.
 */
export function parseDamageInput(raw: string): DamageParse {
  const tokens = tokenize(raw);
  const warnings: string[] = [];

  const terms: DamageTerm[] = [];
  let sawAdditiveMarker = false;
  let sawCarveMarker = false;

  for (const token of tokens) {
    if (ADDITIVE_MARKERS.has(token)) {
      sawAdditiveMarker = true;
      continue;
    }
    if (CARVE_MARKERS.has(token)) {
      sawCarveMarker = true;
      continue;
    }
    if (FILLER.has(token)) continue;

    if (/^\d+$/.test(token)) {
      terms.push({ amount: Number(token), type: DEFAULT_DAMAGE_TYPE, inferred: true });
      continue;
    }

    // A type word attaches to the most recent number; a type word with no
    // number before it has nothing to describe and is dropped with a note.
    const type = resolveDamageWord(token);
    const target = terms[terms.length - 1];
    if (!type) {
      warnings.push(`Ignored "${token}" — not a damage type.`);
      continue;
    }
    if (!target) {
      warnings.push(`Ignored "${token}" — no amount before it.`);
      continue;
    }
    if (!target.inferred) {
      warnings.push(`Ignored "${token}" — ${target.amount} is already ${target.type}.`);
      continue;
    }
    target.type = type;
    target.inferred = false;
  }

  if (terms.length === 0) {
    return { ok: false, terms: [], total: 0, mode: "additive", warnings };
  }

  const lead = terms[0]!;
  const rest = terms.slice(1);
  const restTotal = rest.reduce((sum, t) => sum + t.amount, 0);

  // Carve-out applies only when there is a stated total to carve from: a
  // leading amount that names no specific type, with typed terms that fit
  // inside it. "Names no specific type" covers both the bare number (whose
  // type was inferred) and an explicit "untyped" — either way the GM stated a
  // total rather than a component. An explicit additive marker always wins;
  // an explicit "of which" forces the reading the heuristic wouldn't take.
  const leadIsBareTotal = lead.inferred === true || lead.type === "unspecified";
  const heuristicCarve =
    leadIsBareTotal && rest.length > 0 && !sawAdditiveMarker && restTotal <= lead.amount;

  if (sawCarveMarker && rest.length > 0 && restTotal > lead.amount) {
    warnings.push(
      `The ${restTotal} typed damage exceeds the stated total of ${lead.amount} — read as additive.`,
    );
  } else if (sawCarveMarker && rest.length > 0) {
    return carveOut(lead, rest, warnings);
  } else if (heuristicCarve) {
    return carveOut(lead, rest, warnings);
  }

  return {
    ok: true,
    terms,
    total: terms.reduce((sum, t) => sum + t.amount, 0),
    mode: "additive",
    warnings,
  };
}

/**
 * Splits a stated total into its named parts plus whatever is left over. The
 * remainder keeps the lead's type and its `inferred` flag, so "9 damage, 3 of
 * which are cold" leaves 6 assumed-weapon (DR applies, flagged as an
 * assumption) while "9 untyped, 3 of which are cold" leaves 6 genuinely
 * untyped.
 */
function carveOut(lead: DamageTerm, rest: DamageTerm[], warnings: string[]): DamageParse {
  const restTotal = rest.reduce((sum, t) => sum + t.amount, 0);
  const remainder = lead.amount - restTotal;
  const terms =
    remainder > 0
      ? [{ amount: remainder, type: lead.type, inferred: lead.inferred }, ...rest]
      : rest;
  return { ok: true, terms, total: lead.amount, mode: "carve-out", warnings };
}

/** One-line echo of a parse, e.g. `"6 unspecified + 3 cold = 9"`. */
export function describeDamageParse(parse: DamageParse): string {
  if (!parse.ok) return "";
  const parts = parse.terms.map((t) => `${t.amount} ${t.type}`).join(" + ");
  return parse.terms.length > 1 ? `${parts} = ${parse.total}` : parts;
}
