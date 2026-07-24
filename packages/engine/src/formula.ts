/**
 * Formula DSL evaluator (clean-room).
 *
 * Evaluates the Foundry PF1 roll-formula dialect that appears in the data:
 *   - data paths (`@abilities.con.mod`, `@cl`, `@skills.acr.rank`, ...)
 *   - functions (`if`, `gte`, `min`, `max`, and the obvious siblings)
 *   - arithmetic with the usual precedence and parentheses
 *   - dice terms (`(min(10, @cl))d6`) — parsed and represented, but not rolled.
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
      while (j < n && (isAlpha(src[j]!) || isDigit(src[j]!) || src[j] === ".")) j++;
      tokens.push({ t: "path", v: src.slice(i + 1, j) });
      i = j;
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
};

/* -------------------------------------------------------------- evaluator -- */

function resolvePath(path: string, data: RollData): number {
  let cur: unknown = data;
  for (const seg of path.split(".")) {
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

interface DiceChainParts {
  /** Symbolic dice terms in source order, e.g. ["1d6"], sign-prefixed if negative. */
  diceTerms: string[];
  /** Sum of every non-dice term in the chain. */
  modifier: number;
}

/**
 * Walk a formula's root-level `+`/`-` chain, evaluating everything EXCEPT
 * dice terms numerically and summing it into `modifier`, while keeping each
 * dice term as a symbolic `"NdF"` string (its own `count`/`faces`
 * sub-expressions ARE evaluated numerically — they must not themselves
 * contain nested dice, e.g. `(ceil(@class.unlevel / 2))d6`). Throws
 * {@link DiceTermError} if a dice term (or nested dice) turns up somewhere
 * this walk can't isolate (e.g. multiplied by a non-dice factor, such as
 * `2 * (1d6)`) — the vendored data never shapes a formula that way, so
 * `formatDiceFormula` treats that as "unsupported", not "no dice".
 */
function flattenDiceChain(
  node: FormulaNode,
  data: RollData,
  sign: 1 | -1,
  out: DiceChainParts,
): void {
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
    const count = evaluateNode(node.count, data);
    const faces = evaluateNode(node.faces, data);
    const term = `${count}d${faces}`;
    out.diceTerms.push(sign < 0 ? `-${term}` : term);
    return;
  }
  out.modifier += sign * evaluateNode(node, data);
}

/**
 * Format a formula that may contain dice terms for display — evaluating the
 * numeric parts but keeping dice symbolic, e.g. `"1d6 + floor(@class.unlevel
 * / 2)"` at `@class.unlevel = 4` becomes `"1d6+2"`, and `"(ceil(@class.unlevel
 * / 2))d6"` at level 7 becomes `"4d6"`. Returns `null` when the formula has no
 * dice term at all (callers should fall back to `tryEvaluateFormula` for a
 * plain number) or when its dice appear in a shape this can't isolate (see
 * {@link flattenDiceChain}) — never throws.
 */
export function formatDiceFormula(src: string, data: RollData = {}): string | null {
  const node = parseFormula(src);
  const parts: DiceChainParts = { diceTerms: [], modifier: 0 };
  try {
    flattenDiceChain(node, data, 1, parts);
  } catch (err) {
    if (err instanceof DiceTermError) return null;
    throw err;
  }
  if (parts.diceTerms.length === 0) return null;

  let result = parts.diceTerms[0]!;
  for (let i = 1; i < parts.diceTerms.length; i++) {
    const term = parts.diceTerms[i]!;
    result += term.startsWith("-") ? ` - ${term.slice(1)}` : ` + ${term}`;
  }
  if (parts.modifier !== 0) {
    result += parts.modifier > 0 ? `+${parts.modifier}` : `${parts.modifier}`;
  }
  return result;
}
