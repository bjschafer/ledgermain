/**
 * Parser, renderer, and shifter for printed melee/ranged attack-line strings
 * ("bite +2 (1d4+1)", "2 claws +5 (1d6+3), bite +5 (1d8+4 plus grab)").
 *
 * The grammar is derived by inspection of the vendored corpus
 * (packages/data-pipeline/data/monsters.json), not from any Foundry source: PF1
 * statblocks alternate weapon routines with " or ", list simultaneous attacks
 * with ", ", and each attack is `name [+bonus[/+bonus...]] [touch|ranged touch]
 * [(damage[/extra...][ plus rider])]`.
 *
 * Round-trip fidelity (`renderAttackLine(parseAttackLine(line)) === line`) is
 * the correctness anchor, not semantic completeness: every fragment we don't
 * need to reason about (weapon names, crit-range/multiplier extras, riders,
 * whitespace) is captured and replayed verbatim rather than reformatted.
 * A handful of attacks print with no bonus at all (swarms: "swarm (1d6 plus
 * distraction)"), which is legitimate PF1 grammar, not a parse failure.
 */

export type DamageTerm =
  | { kind: "dice"; count: number; sides: number; bonus: number | null }
  | { kind: "flat"; value: number }
  /** Non-numeric damage text: "special", "see below", "by spell", etc. */
  | { kind: "raw"; text: string };

export interface ParsedDamage {
  core: DamageTerm;
  /** "/"-separated trailing segments (crit range, multiplier), kept verbatim and never shifted. */
  extras: string[];
  /** Raw text from the first " plus " to the end of the parenthetical, or "" when there is none. */
  rider: string;
}

export interface ParsedAttack {
  /** Weapon/natural-attack name, including any leading count ("2 claws") or enhancement prefix ("+1 lance"). */
  namePart: string;
  /** Exact whitespace between `namePart` and the bonus list (or, when `bonuses` is empty, before the damage paren). */
  headGap: string;
  /** Iterative attack bonuses, e.g. [11, 6, 1] for "+11/+6/+1". Empty when the line prints no bonus (swarms). */
  bonuses: number[];
  /** Raw text after the bonus list and before the damage paren (or end of segment): "", " touch", " ranged touch". */
  tail: string;
  /** `null` when the attack has no trailing parenthetical at all. */
  damage: ParsedDamage | null;
}

export interface AttackGroup {
  attacks: ParsedAttack[];
  /** The ", " separator text between consecutive attacks; `seps.length === attacks.length - 1`. */
  seps: string[];
}

export interface ParsedAttackLine {
  groups: AttackGroup[];
  /** The " or "/", or " separator text between consecutive groups; `groupSeps.length === groups.length - 1`. */
  groupSeps: string[];
}

const GROUP_SEPS = [", or ", " or "];
const ATTACK_SEP = ", ";

const ATTACK_TAIL_RE = /^(.*\S)(\s+)([+-]\d+(?:\/[+-]\d+)*)((?:\s+\S+)*\s*)$/s;
const NO_BONUS_RE = /^(.*\S)(\s*)$/s;
const DICE_RE = /^(\d+)d(\d+)([+-]\d+)?$/;
const FLAT_RE = /^(\d+)$/;

/** Split `s` on any of `seps` at paren-depth 0, longest separator first at each position. */
function splitAtDepth0(s: string, seps: string[]): { parts: string[]; used: string[] } {
  const ordered = [...seps].sort((a, b) => b.length - a.length);
  const parts: string[] = [];
  const used: string[] = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0) {
      const hit = ordered.find((sep) => s.startsWith(sep, i));
      if (hit) {
        parts.push(s.slice(last, i));
        used.push(hit);
        i += hit.length - 1;
        last = i + 1;
      }
    }
  }
  parts.push(s.slice(last));
  return { parts, used };
}

/**
 * `undefined` return means "no top-level paren at all" (attack has no damage).
 * `null` means a top-level paren exists but doesn't reach the segment end (trailing
 * garbage like " Occultist") -- that's a genuine parse failure, not "no damage".
 */
function splitDamageParen(
  segment: string,
): { preParen: string; damageContent: string | undefined } | null {
  let depth = 0;
  let start = -1;
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (c === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) spans.push([start, i]);
    }
  }
  if (spans.length === 0) return { preParen: segment, damageContent: undefined };
  const [s, e] = spans[spans.length - 1]!;
  if (e !== segment.length - 1) return null;
  return { preParen: segment.slice(0, s), damageContent: segment.slice(s + 1, e) };
}

function parseDamageCore(text: string): DamageTerm {
  const dice = text.match(DICE_RE);
  if (dice) {
    return {
      kind: "dice",
      count: Number(dice[1]),
      sides: Number(dice[2]),
      bonus: dice[3] !== undefined ? Number(dice[3]) : null,
    };
  }
  const flat = text.match(FLAT_RE);
  if (flat) return { kind: "flat", value: Number(flat[1]) };
  return { kind: "raw", text };
}

function renderDamageCore(term: DamageTerm): string {
  if (term.kind === "raw") return term.text;
  if (term.kind === "flat") return String(term.value);
  const base = `${term.count}d${term.sides}`;
  return term.bonus === null ? base : base + (term.bonus >= 0 ? "+" : "") + term.bonus;
}

function parseDamage(content: string): ParsedDamage {
  const plusIdx = content.indexOf(" plus ");
  const corePart = plusIdx >= 0 ? content.slice(0, plusIdx) : content;
  const rider = plusIdx >= 0 ? content.slice(plusIdx) : "";
  const [core, ...extras] = corePart.split("/");
  return { core: parseDamageCore(core ?? ""), extras, rider };
}

function parseAttack(segment: string): ParsedAttack | null {
  const split = splitDamageParen(segment);
  if (split === null) return null;
  const { preParen, damageContent } = split;
  if (preParen.trim() === "") return null;

  let namePart: string;
  let headGap: string;
  let bonuses: number[];
  let tail: string;

  const tailMatch = preParen.match(ATTACK_TAIL_RE);
  if (tailMatch) {
    namePart = tailMatch[1]!;
    headGap = tailMatch[2]!;
    bonuses = tailMatch[3]!.split("/").map(Number);
    tail = tailMatch[4]!;
  } else {
    const bare = preParen.match(NO_BONUS_RE);
    if (!bare) return null;
    namePart = bare[1]!;
    headGap = bare[2]!;
    bonuses = [];
    tail = "";
  }

  const damage = damageContent === undefined ? null : parseDamage(damageContent);
  return { namePart, headGap, bonuses, tail, damage };
}

function renderBonus(n: number): string {
  return (n >= 0 ? "+" : "") + n;
}

export function renderAttack(attack: ParsedAttack): string {
  let s =
    attack.namePart + attack.headGap + attack.bonuses.map(renderBonus).join("/") + attack.tail;
  if (attack.damage) {
    const d = attack.damage;
    s += `(${renderDamageCore(d.core)}${d.extras.map((e) => "/" + e).join("")}${d.rider})`;
  }
  return s;
}

/** Parses a printed melee/ranged line. Returns `null` when any attack segment can't be decomposed. */
export function parseAttackLine(line: string): ParsedAttackLine | null {
  const { parts: rawGroups, used: groupSeps } = splitAtDepth0(line, GROUP_SEPS);
  const groups: AttackGroup[] = [];
  for (const rawGroup of rawGroups) {
    const { parts: rawAttacks, used: seps } = splitAtDepth0(rawGroup, [ATTACK_SEP]);
    const attacks: ParsedAttack[] = [];
    for (const rawAttack of rawAttacks) {
      const attack = parseAttack(rawAttack);
      if (!attack) return null;
      attacks.push(attack);
    }
    groups.push({ attacks, seps });
  }
  return { groups, groupSeps };
}

export function renderAttackLine(parsed: ParsedAttackLine): string {
  const groupStrs = parsed.groups.map((g) => {
    let s = "";
    g.attacks.forEach((a, i) => {
      s += renderAttack(a);
      if (i < g.seps.length) s += g.seps[i];
    });
    return s;
  });
  let out = "";
  groupStrs.forEach((s, i) => {
    out += s;
    if (i < parsed.groupSeps.length) out += parsed.groupSeps[i];
  });
  return out;
}

/** All attacks across every alternative group, in printed order. */
export function flattenAttacks(parsed: ParsedAttackLine): ParsedAttack[] {
  return parsed.groups.flatMap((g) => g.attacks);
}

/** Rebuilds the line, replacing every attack with `fn(attack, flatIndex, totalCount)`, preserving all separators. */
export function mapAttacks(
  parsed: ParsedAttackLine,
  fn: (attack: ParsedAttack, index: number, total: number) => ParsedAttack,
): ParsedAttackLine {
  const total = flattenAttacks(parsed).length;
  let i = 0;
  return {
    groupSeps: parsed.groupSeps,
    groups: parsed.groups.map((g) => ({
      seps: g.seps,
      attacks: g.attacks.map((a) => fn(a, i++, total)),
    })),
  };
}

/** Adds `delta` to every iterative bonus on the attack. */
export function shiftAttackBonus(attack: ParsedAttack, delta: number): ParsedAttack {
  if (delta === 0 || attack.bonuses.length === 0) return attack;
  return { ...attack, bonuses: attack.bonuses.map((b) => b + delta) };
}

/**
 * Adds `delta` to a damage term's numeric bonus. A dice term with no printed
 * bonus gains one ("1d6" -> "1d6+2"); a bonus that lands on 0 goes back to
 * printing without one ("1d6+2" shifted by -2 -> "1d6"). `raw` terms (no
 * numeric bonus at all, e.g. "special") are returned unchanged.
 */
export function shiftDamageBonus(term: DamageTerm, delta: number): DamageTerm {
  if (delta === 0) return term;
  if (term.kind === "dice") {
    const next = (term.bonus ?? 0) + delta;
    return { ...term, bonus: next === 0 ? null : next };
  }
  if (term.kind === "flat") return { ...term, value: term.value + delta };
  return term;
}

/** Replaces just the core damage term of an attack, leaving extras/rider/qualifier untouched. */
export function withDamageCore(attack: ParsedAttack, core: DamageTerm): ParsedAttack {
  if (!attack.damage) return attack;
  return { ...attack, damage: { ...attack.damage, core } };
}

/**
 * The published "increasing damage dice by size" chart (Bestiary size rules):
 * each entry is one step. A flat "1" is its own bottom rung below any die.
 */
export const DICE_SIZE_CHART: readonly DamageTerm[] = [
  { kind: "flat", value: 1 },
  { kind: "dice", count: 1, sides: 2, bonus: null },
  { kind: "dice", count: 1, sides: 3, bonus: null },
  { kind: "dice", count: 1, sides: 4, bonus: null },
  { kind: "dice", count: 1, sides: 6, bonus: null },
  { kind: "dice", count: 1, sides: 8, bonus: null },
  { kind: "dice", count: 1, sides: 10, bonus: null },
  { kind: "dice", count: 2, sides: 6, bonus: null },
  { kind: "dice", count: 2, sides: 8, bonus: null },
  { kind: "dice", count: 3, sides: 6, bonus: null },
  { kind: "dice", count: 3, sides: 8, bonus: null },
  { kind: "dice", count: 4, sides: 6, bonus: null },
  { kind: "dice", count: 4, sides: 8, bonus: null },
  { kind: "dice", count: 6, sides: 6, bonus: null },
  { kind: "dice", count: 6, sides: 8, bonus: null },
  { kind: "dice", count: 8, sides: 6, bonus: null },
  { kind: "dice", count: 8, sides: 8, bonus: null },
  { kind: "dice", count: 12, sides: 6, bonus: null },
  { kind: "dice", count: 12, sides: 8, bonus: null },
  { kind: "dice", count: 16, sides: 6, bonus: null },
];

function diceChartIndex(term: DamageTerm): number | null {
  if (term.kind === "flat") return term.value === 1 ? 0 : null;
  if (term.kind === "raw") return null;
  const idx = DICE_SIZE_CHART.findIndex(
    (t) => t.kind === "dice" && t.count === term.count && t.sides === term.sides,
  );
  return idx < 0 ? null : idx;
}

/**
 * Steps a damage term `steps` places along `DICE_SIZE_CHART`, preserving its
 * bonus. Returns `null` when the term isn't on the chart (a raw term, or a
 * dice combination the chart doesn't cover) so the caller can leave it as
 * printed and flag it for manual review instead of guessing.
 */
export function stepDiceTerm(term: DamageTerm, steps: number): DamageTerm | null {
  const idx = diceChartIndex(term);
  if (idx === null) return null;
  const nextIdx = Math.max(0, Math.min(DICE_SIZE_CHART.length - 1, idx + steps));
  const next = DICE_SIZE_CHART[nextIdx]!;
  const bonus = term.kind === "dice" ? term.bonus : null;
  return next.kind === "dice" ? { ...next, bonus } : next;
}
