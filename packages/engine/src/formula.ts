/**
 * Formula DSL evaluator (clean-room).
 *
 * Evaluates the Foundry PF1 roll-formula dialect that appears in the data:
 *   - data paths (`@abilities.con.mod`, `@cl`, `@skills.acr.rank`, ...)
 *   - functions (`if`, `gte`, `min`, `max`, and the obvious siblings)
 *   - arithmetic with the usual precedence and parentheses
 *   - dice terms (`(min(10, @cl))d6`, `sizeRoll(1, 6, @size)`) — parsed and
 *     represented, but not rolled.
 *   - per-term flavor annotations (`4[Enhancement]`, `1d6[fire]`) — skipped.
 *
 * Implemented as a small recursive-descent parser + tree-walking evaluator. No
 * `eval`, no `Function`. Reimplemented from the documented dialect behaviour; the
 * Foundry source is used only as a correctness oracle in tests (DESIGN §6).
 */

/* --------------------------------------------------------------- roll data -- */

/**
 * The context object formulas resolve `@paths` against. Arbitrarily nested;
 * leaves are numbers. Missing paths resolve to 0 (matching Foundry behaviour),
 * so partial contexts never throw on an absent stat.
 */
export type RollData = Record<string, unknown>;

/* ------------------------------------------------------------------- nodes -- */

export type FormulaNode =
  | { kind: "num"; value: number }
  | { kind: "path"; path: string }
  | { kind: "call"; name: string; args: FormulaNode[] }
  | { kind: "unary"; op: "-" | "+"; operand: FormulaNode }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "%"; left: FormulaNode; right: FormulaNode }
  | { kind: "dice"; count: FormulaNode; faces: FormulaNode };

/** Thrown when a numeric evaluation hits a dice term (which we do not roll). */
export class DiceTermError extends Error {
  constructor(message = "formula contains a dice term and cannot be evaluated to a number") {
    super(message);
    this.name = "DiceTermError";
  }
}

export class FormulaSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaSyntaxError";
  }
}

/* --------------------------------------------------------------- tokenizer -- */

type Token =
  | { t: "num"; v: number }
  | { t: "path"; v: string }
  | { t: "ident"; v: string }
  | { t: "op"; v: string }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "comma" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isAlpha = (c: string) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";

  while (i < n) {
    const c = src[i]!;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < n && (isDigit(src[j]!) || src[j] === ".")) j++;
      const text = src.slice(i, j);
      const value = Number(text);
      if (Number.isNaN(value)) throw new FormulaSyntaxError(`invalid number: ${text}`);
      tokens.push({ t: "num", v: value });
      i = j;
      continue;
    }
    if (c === "@") {
      let j = i + 1;
      // "-" continues a path when followed by a letter (hyphenated skill
      // instance slugs: `@skills.crf.basket-weaving.rank`), or by a digit
      // ONLY under the `skills.` prefix (dedup suffixes: `prf.oratory-2`).
      // Everywhere else "-" before a digit stays the minus operator, because
      // vendored inline rolls subtract with no surrounding space
      // (`@item.level-8` in buffs.json) and must keep meaning "path minus 8";
      // no vendored formula subtracts spacelessly under `@skills.`.
      while (
        j < n &&
        (isAlpha(src[j]!) ||
          isDigit(src[j]!) ||
          src[j] === "." ||
          (src[j] === "-" &&
            j + 1 < n &&
            (isAlpha(src[j + 1]!) || (isDigit(src[j + 1]!) && src.startsWith("skills.", i + 1)))))
      )
        j++;
      tokens.push({ t: "path", v: src.slice(i + 1, j) });
      i = j;
      continue;
    }
    if (c === "[") {
      // Flavor annotation: upstream labels a term for its roll log
      // (`floor(@cl / 2)[CL/2]`, `1d6[fire]`) without changing its value, so
      // the whole bracket is skipped rather than tokenized.
      const end = src.indexOf("]", i + 1);
      if (end === -1) throw new FormulaSyntaxError(`unclosed '[' at index ${i}`);
      i = end + 1;
      continue;
    }
    if (isAlpha(c)) {
      // Identifiers are letters only, so the dice operator `d` and the trailing
      // faces digits in `2d6` tokenize separately (ident "d", then num 6).
      let j = i;
      while (j < n && isAlpha(src[j]!)) j++;
      tokens.push({ t: "ident", v: src.slice(i, j) });
      i = j;
      continue;
    }
    throw new FormulaSyntaxError(`unexpected character '${c}' at index ${i}`);
  }
  return tokens;
}

/* ----------------------------------------------------------------- parser -- */

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): FormulaNode {
    const node = this.parseExpr();
    if (this.pos !== this.tokens.length) {
      throw new FormulaSyntaxError("unexpected trailing tokens in formula");
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new FormulaSyntaxError("unexpected end of formula");
    this.pos++;
    return tok;
  }

  // expr := term (('+' | '-') term)*
  private parseExpr(): FormulaNode {
    let left = this.parseTerm();
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "op" && (tok.v === "+" || tok.v === "-")) {
        this.pos++;
        const right = this.parseTerm();
        left = { kind: "bin", op: tok.v, left, right };
      } else {
        return left;
      }
    }
  }

  // term := unary (('*' | '/' | '%') unary)*
  private parseTerm(): FormulaNode {
    let left = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "op" && (tok.v === "*" || tok.v === "/" || tok.v === "%")) {
        this.pos++;
        const right = this.parseUnary();
        left = { kind: "bin", op: tok.v, left, right };
      } else {
        return left;
      }
    }
  }

  // unary := ('-' | '+') unary | dice
  private parseUnary(): FormulaNode {
    const tok = this.peek();
    if (tok?.t === "op" && (tok.v === "+" || tok.v === "-")) {
      this.pos++;
      return { kind: "unary", op: tok.v, operand: this.parseUnary() };
    }
    return this.parseDice();
  }

  // dice := primary ('d' primary)?
  private parseDice(): FormulaNode {
    const left = this.parsePrimary();
    const tok = this.peek();
    if (tok?.t === "ident" && tok.v === "d") {
      this.pos++;
      const faces = this.parsePrimary();
      return { kind: "dice", count: left, faces };
    }
    return left;
  }

  // primary := number | path | ident '(' args ')' | '(' expr ')'
  private parsePrimary(): FormulaNode {
    const tok = this.next();
    if (tok.t === "num") return { kind: "num", value: tok.v };
    if (tok.t === "path") return { kind: "path", path: tok.v };
    if (tok.t === "lparen") {
      const inner = this.parseExpr();
      const close = this.next();
      if (close.t !== "rparen") throw new FormulaSyntaxError("expected ')'");
      return inner;
    }
    if (tok.t === "ident") {
      const open = this.peek();
      if (open?.t !== "lparen") {
        throw new FormulaSyntaxError(`expected '(' after function '${tok.v}'`);
      }
      this.pos++; // consume '('
      const args: FormulaNode[] = [];
      if (this.peek()?.t !== "rparen") {
        args.push(this.parseExpr());
        while (this.peek()?.t === "comma") {
          this.pos++;
          args.push(this.parseExpr());
        }
      }
      const close = this.next();
      if (close.t !== "rparen") throw new FormulaSyntaxError("expected ')' to close arguments");
      // `sizeRoll(count, faces, size)` is a dice term whose die steps up or down
      // with the creature's size; its first two arguments are the Medium dice.
      // This engine models Medium only (same posture as the hand-authored dice
      // tables in `tables.ts`), so the size argument is dropped and what's left
      // is an ordinary `count`d`faces` term.
      if (tok.v === "sizeRoll" && args[0] && args[1]) {
        return { kind: "dice", count: args[0], faces: args[1] };
      }
      return { kind: "call", name: tok.v, args };
    }
    throw new FormulaSyntaxError(`unexpected token in formula`);
  }
}

export function parseFormula(src: string): FormulaNode {
  return new Parser(tokenize(src)).parse();
}

/* -------------------------------------------------------------- functions -- */

const truthy = (n: number) => n !== 0;
const bool = (b: boolean) => (b ? 1 : 0);

type Fn = (args: number[]) => number;

const FUNCTIONS: Record<string, Fn> = {
  // conditionals — `ifelse` is Foundry's own alias for the 3-arg `if` (see
  // its roll-terminology tests); vendored buffs use both spellings.
  if: (a) => (truthy(a[0] ?? 0) ? (a[1] ?? 0) : (a[2] ?? 0)),
  ifelse: (a) => (truthy(a[0] ?? 0) ? (a[1] ?? 0) : (a[2] ?? 0)),
  // comparisons (return 1/0)
  eq: (a) => bool((a[0] ?? 0) === (a[1] ?? 0)),
  ne: (a) => bool((a[0] ?? 0) !== (a[1] ?? 0)),
  gt: (a) => bool((a[0] ?? 0) > (a[1] ?? 0)),
  gte: (a) => bool((a[0] ?? 0) >= (a[1] ?? 0)),
  lt: (a) => bool((a[0] ?? 0) < (a[1] ?? 0)),
  lte: (a) => bool((a[0] ?? 0) <= (a[1] ?? 0)),
  // boolean logic
  and: (a) => bool(a.every(truthy)),
  or: (a) => bool(a.some(truthy)),
  not: (a) => bool(!truthy(a[0] ?? 0)),
  // numeric
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  floor: (a) => Math.floor(a[0] ?? 0),
  ceil: (a) => Math.ceil(a[0] ?? 0),
  round: (a) => Math.round(a[0] ?? 0),
  abs: (a) => Math.abs(a[0] ?? 0),
  sign: (a) => Math.sign(a[0] ?? 0),
  clamp: (a) => Math.min(Math.max(a[0] ?? 0, a[1] ?? 0), a[2] ?? 0),
  // Vendored spellings the same data uses alongside the canonical names:
  // `clamped` (Magical Knack) and `mins` (Caustic Blood) mean clamp and min.
  clamped: (a) => Math.min(Math.max(a[0] ?? 0, a[1] ?? 0), a[2] ?? 0),
  mins: (a) => Math.min(...a),
  // `lookup(index, ...values)` picks the zero-based `index`-th value, 0 when
  // out of range. The Age Resistance buffs use it to map an age category to
  // a bonus; a missing `@ageCategory` path resolves to 0, which selects the
  // adult (no bonus) entry, so an untracked age is harmless.
  lookup: (a) => {
    const idx = Math.trunc(a[0] ?? 0);
    return idx >= 0 && idx < a.length - 1 ? (a[idx + 1] ?? 0) : 0;
  },
};

/** Every function name the evaluator accepts, for data-vs-engine drift tests. */
export const FORMULA_FUNCTION_NAMES: readonly string[] = Object.keys(FUNCTIONS);

/* -------------------------------------------------------------- evaluator -- */

function resolvePath(path: string, data: RollData): number {
  const segs = path.split(".");
  // `@skills.<id>.<leaf>` is special: a parameterized skill instance id
  // (`"crf.alchemy"`) embeds its OWN dot (see rolldata.ts's flat `skills`
  // map, keyed by the full instance id), so segment-by-segment traversal
  // would look for a nested `skills.crf.alchemy` object that doesn't exist.
  // Every segment between `skills` and the trailing leaf is the id.
  if (segs[0] === "skills" && segs.length > 2) {
    const leaf = segs[segs.length - 1]!;
    const id = segs.slice(1, -1).join(".");
    const skills = (data as { skills?: Record<string, unknown> }).skills;
    const entry = skills?.[id];
    const v =
      entry != null && typeof entry === "object"
        ? (entry as Record<string, unknown>)[leaf]
        : undefined;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    return 0;
  }
  let cur: unknown = data;
  for (const seg of segs) {
    if (cur == null || typeof cur !== "object") return 0;
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (typeof cur === "number") return cur;
  if (typeof cur === "boolean") return cur ? 1 : 0;
  // Missing or non-numeric leaf → 0, matching Foundry's roll-data resolution.
  return 0;
}

/** Evaluate a parsed node to a number. Throws {@link DiceTermError} on dice. */
export function evaluateNode(node: FormulaNode, data: RollData): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "path":
      return resolvePath(node.path, data);
    case "unary": {
      const v = evaluateNode(node.operand, data);
      return node.op === "-" ? -v : v;
    }
    case "bin": {
      const l = evaluateNode(node.left, data);
      const r = evaluateNode(node.right, data);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
      }
      return 0;
    }
    case "call": {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new FormulaSyntaxError(`unknown function '${node.name}'`);
      return fn(node.args.map((a) => evaluateNode(a, data)));
    }
    case "dice":
      throw new DiceTermError();
  }
}

/** Parse + evaluate a formula to a number. Throws on dice terms or syntax errors. */
export function evaluateFormula(src: string, data: RollData = {}): number {
  return evaluateNode(parseFormula(src), data);
}

/**
 * Parse + evaluate, returning `null` instead of throwing when the formula
 * contains a dice term (e.g. damage formulas the static sheet need not roll).
 * Syntax errors still throw.
 */
export function tryEvaluateFormula(src: string, data: RollData = {}): number | null {
  const node = parseFormula(src);
  try {
    return evaluateNode(node, data);
  } catch (err) {
    if (err instanceof DiceTermError) return null;
    throw err;
  }
}

/** Whether a formula contains a dice term anywhere in its tree. */
export function containsDice(node: FormulaNode): boolean {
  switch (node.kind) {
    case "dice":
      return true;
    case "unary":
      return containsDice(node.operand);
    case "bin":
      return containsDice(node.left) || containsDice(node.right);
    case "call":
      return node.args.some(containsDice);
    default:
      return false;
  }
}

/* ------------------------------------------------ symbolic dice display -- */

/** One dice term isolated from a formula's root-level `+`/`-` chain. */
export interface DiceChainTerm {
  /** Resolved die count, e.g. 4 for `(min(10,@cl))d6` at CL 4. */
  count: number;
  /** Resolved die faces. */
  faces: number;
  /** The sign the term carries in the chain. */
  sign: 1 | -1;
}

/** A formula split into symbolic dice terms plus one summed numeric modifier. */
export interface DiceChain {
  /** Dice terms in source order. */
  terms: DiceChainTerm[];
  /** Sum of every non-dice term in the chain. */
  modifier: number;
}

/**
 * Walk a formula's root-level `+`/`-` chain, evaluating everything EXCEPT
 * dice terms numerically and summing it into `modifier`, while keeping each
 * dice term symbolic (its own `count`/`faces` sub-expressions ARE evaluated
 * numerically — they must not themselves contain nested dice, e.g.
 * `(ceil(@class.unlevel / 2))d6`). Throws {@link DiceTermError} if a dice term
 * (or nested dice) turns up somewhere this walk can't isolate (e.g. multiplied
 * by a non-dice factor, such as `2 * (1d6)`) — the vendored data never shapes a
 * formula that way, so callers treat that as "unsupported", not "no dice".
 */
function flattenDiceChain(node: FormulaNode, data: RollData, sign: 1 | -1, out: DiceChain): void {
  if (node.kind === "bin" && (node.op === "+" || node.op === "-")) {
    flattenDiceChain(node.left, data, sign, out);
    flattenDiceChain(node.right, data, node.op === "-" ? (-sign as 1 | -1) : sign, out);
    return;
  }
  if (node.kind === "unary") {
    flattenDiceChain(node.operand, data, node.op === "-" ? (-sign as 1 | -1) : sign, out);
    return;
  }
  if (node.kind === "dice") {
    out.terms.push({
      count: evaluateNode(node.count, data),
      faces: evaluateNode(node.faces, data),
      sign,
    });
    return;
  }
  out.modifier += sign * evaluateNode(node, data);
}

/**
 * Split an already-parsed formula into its symbolic dice terms and summed
 * numeric modifier. `null` when the formula carries no dice term at all
 * (callers fall back to {@link evaluateFormula} for a plain number) or when
 * its dice appear in a shape {@link flattenDiceChain} can't isolate.
 *
 * This is the structured half of {@link formatDiceFormula}: a caller that
 * needs the NUMBERS (to maximize the dice, or to add a flat rider) rather than
 * a display string works from here — see the engine's `metamagic-effects.ts`.
 */
export function diceChainOf(node: FormulaNode, data: RollData = {}): DiceChain | null {
  const chain: DiceChain = { terms: [], modifier: 0 };
  try {
    flattenDiceChain(node, data, 1, chain);
  } catch (err) {
    if (err instanceof DiceTermError) return null;
    throw err;
  }
  return chain.terms.length > 0 ? chain : null;
}

/** {@link diceChainOf} straight from formula source. Parse errors still throw. */
export function diceChain(src: string, data: RollData = {}): DiceChain | null {
  return diceChainOf(parseFormula(src), data);
}

/** Render a {@link DiceChain} as `"10d6+3"` / `"1d6 - 1d4-2"`. */
export function formatDiceChain(chain: DiceChain, modifier = chain.modifier): string {
  let result = "";
  for (const [i, term] of chain.terms.entries()) {
    const text = `${term.count}d${term.faces}`;
    if (i === 0) result = term.sign < 0 ? `-${text}` : text;
    else result += term.sign < 0 ? ` - ${text}` : ` + ${text}`;
  }
  if (modifier !== 0) result += modifier > 0 ? `+${modifier}` : `${modifier}`;
  return result;
}

/**
 * Format a formula that may contain dice terms for display — evaluating the
 * numeric parts but keeping dice symbolic, e.g. `"1d6 + floor(@class.unlevel
 * / 2)"` at `@class.unlevel = 4` becomes `"1d6+2"`, and `"(ceil(@class.unlevel
 * / 2))d6"` at level 7 becomes `"4d6"`. Returns `null` when the formula has no
 * dice term at all (callers should fall back to `tryEvaluateFormula` for a
 * plain number) or when its dice appear in a shape this can't isolate (see
 * {@link flattenDiceChain}). Dice never make this throw; a formula that won't
 * parse or names an unknown function still does, so display callers wrap it.
 */
export function formatDiceFormula(src: string, data: RollData = {}): string | null {
  const chain = diceChainOf(parseFormula(src), data);
  return chain === null ? null : formatDiceChain(chain);
}
