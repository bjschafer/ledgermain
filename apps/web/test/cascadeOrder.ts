/**
 * Finds style rules that can never take effect: a *modifier* class (one that
 * never appears as an element's only class, so it exists to refine a base)
 * defined EARLIER in the stylesheet than the base it refines. The two tie on
 * specificity, so the later base wins on source order and every declaration
 * they share is silently discarded from the modifier.
 *
 * Seven of these had shipped: a deeds row lost its summary into the 20px caret
 * gutter of the class it reused, and six chip/row modifiers had been inert
 * since the day they were written. Three carried comments describing the very
 * behaviour the cascade was throwing away, which is why reading the stylesheet
 * never caught them.
 *
 * Only the losing direction is reported. A modifier defined *after* its base
 * wins as intended, which is the normal pattern and most of the stylesheet.
 *
 * Shorthand/longhand pairs (`padding` against `padding-left`) are not compared;
 * only the same property name on both sides counts.
 */
import { readFileSync } from "node:fs";
import { Glob } from "bun";

import { attributeValue } from "./unstyledClasses";

interface Declaration {
  value: string;
  important: boolean;
}

export interface Rule {
  /** Source order: the tiebreaker when specificity is equal. */
  order: number;
  line: number;
  selector: string;
  /** Rules in different at-rule contexts are never compared. */
  media: string | null;
  props: Map<string, Declaration>;
}

/**
 * One element's classes. `required` are always applied; `all` includes classes
 * behind a conditional; `exclusive` pairs come from opposite branches of one
 * ternary and can never appear together.
 */
export interface ElementUse {
  required: Set<string>;
  all: Set<string>;
  exclusive: [string, string][];
  where: string;
}

export interface Conflict {
  property: string;
  loser: { selector: string; line: number; value: string };
  winner: { selector: string; line: number; value: string };
  where: string;
}

/** Blank out comments, keeping newlines so line numbers stay true. */
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** Split a selector list on top-level commas, ignoring those inside :is()/:not(). */
function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of prelude) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

export function parseRules(source: string): Rule[] {
  const css = stripComments(source);
  const rules: Rule[] = [];
  const atRules: string[] = [];
  let i = 0;
  let order = 0;
  let prelude = "";
  let line = 1;

  while (i < css.length) {
    const ch = css[i]!;
    if (ch === "\n") line++;
    if (ch === "{") {
      const head = prelude.trim();
      prelude = "";
      if (head.startsWith("@")) {
        atRules.push(head);
        i++;
        continue;
      }
      // Consume to the matching close brace.
      let depth = 1;
      let j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        if (depth === 0) break;
        j++;
      }
      const body = css.slice(i + 1, j);
      const props = new Map<string, Declaration>();
      for (const decl of body.split(";")) {
        const colon = decl.indexOf(":");
        if (colon < 0 || /[{}]/.test(decl)) continue;
        const name = decl.slice(0, colon).trim().toLowerCase();
        let value = decl.slice(colon + 1).trim();
        if (!name || name.startsWith("--")) continue;
        const important = value.endsWith("!important");
        if (important) value = value.slice(0, -"!important".length).trim();
        props.set(name, { value, important });
      }
      // Keyframe stops are not cascade participants.
      if (props.size > 0 && !atRules.some((a) => /@(-\w+-)?keyframes/.test(a))) {
        for (const selector of splitSelectors(head)) {
          rules.push({
            order: order++,
            line,
            selector,
            media: atRules.length > 0 ? atRules.join(" && ") : null,
            props,
          });
        }
      }
      line += body.split("\n").length - 1;
      i = j + 1;
      continue;
    }
    if (ch === "}") {
      atRules.pop();
      prelude = "";
      i++;
      continue;
    }
    prelude += ch;
    i++;
  }
  return rules;
}

export function specificity(selector: string): number {
  const s = selector.replace(/::[\w-]+/g, " ELEMENT ");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes =
    (s.match(/\.[\w-]+/g) ?? []).length +
    (s.match(/\[[^\]]+\]/g) ?? []).length +
    (s.match(/:(?!:)[\w-]+/g) ?? []).filter((p) => !/^:(not|is|where|has)$/.test(p)).length;
  const tags =
    (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length + (s.match(/ELEMENT/g) ?? []).length;
  return ids * 10000 + classes * 100 + tags;
}

/** The compound after the last combinator: what the selector actually matches. */
const subject = (selector: string): string => {
  const parts = selector.split(/[\s>+~]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : selector;
};

const classesOf = (selector: string): string[] =>
  (subject(selector).match(/\.[\w-]+/g) ?? []).map((c) => c.slice(1));

/**
 * Only plain class compounds are compared. A descendant selector's ancestor
 * can't be confirmed from markup alone, and a pseudo-class or attribute
 * selector applies in states this can't see.
 */
const isPlain = (selector: string): boolean =>
  !/[\s>+~]/.test(selector.trim()) &&
  !/[:[]/.test(subject(selector)) &&
  classesOf(selector).length > 0;

const tokens = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => /^-?[A-Za-z_][\w-]*$/.test(t));

/** Class tokens in every string literal of an expression fragment. */
function literalTokens(expr: string): string[] {
  const out: string[] = [];
  for (const lit of expr.match(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g) ?? [])
    out.push(...tokens(lit.slice(1, -1)));
  return out;
}

/** Static chunks and `${...}` bodies of a template literal, in order. */
function splitTemplate(tpl: string): { statics: string[]; interps: string[] } {
  const statics: string[] = [];
  const interps: string[] = [];
  let cur = "";
  let i = 0;
  while (i < tpl.length) {
    if (tpl[i] === "$" && tpl[i + 1] === "{") {
      statics.push(cur);
      cur = "";
      let depth = 0;
      const start = i + 2;
      i++;
      while (i < tpl.length) {
        if (tpl[i] === "{") depth++;
        else if (tpl[i] === "}") {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      interps.push(tpl.slice(start, i));
      i++;
      continue;
    }
    cur += tpl[i];
    i++;
  }
  statics.push(cur);
  return { statics, interps };
}

/** `cond ? A : B` split at the top level, skipping strings and nesting. */
function ternaryBranches(expr: string): [string, string] | null {
  let depth = 0;
  let questionAt = -1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "?" && depth === 0 && expr[i + 1] !== "?" && expr[i - 1] !== "?") questionAt = i;
    else if (c === ":" && depth === 0 && questionAt >= 0) {
      return [expr.slice(questionAt + 1, i), expr.slice(i + 1)];
    }
  }
  return null;
}

/**
 * Parse a raw `className=` value (quoted or braced, exactly as it appears in
 * the source) into the classes an element carries.
 *
 * The distinction that matters: a class written in a template literal's static
 * text still stands alone when every conditional around it is false, so it is
 * a base. Treating those conditionals as always-on is what made an earlier
 * version of this check mistake bases for modifiers and report nothing.
 */
export function parseClassAttr(raw: string, where: string): ElementUse {
  const required = new Set<string>();
  const all = new Set<string>();
  const exclusive: [string, string][] = [];

  const addBranching = (expr: string): void => {
    const branches = ternaryBranches(expr);
    if (!branches) {
      for (const t of literalTokens(expr)) all.add(t);
      return;
    }
    const [left, right] = [literalTokens(branches[0]), literalTokens(branches[1])];
    for (const t of [...left, ...right]) all.add(t);
    // Present in both branches means present either way.
    for (const t of left) if (right.includes(t)) required.add(t);
    for (const a of left.filter((t) => !right.includes(t)))
      for (const b of right.filter((t) => !left.includes(t))) exclusive.push([a, b]);
  };

  const body = raw.trim();
  if (body.startsWith('"') || body.startsWith("'")) {
    for (const t of tokens(body.slice(1, -1))) {
      required.add(t);
      all.add(t);
    }
  } else if (body.startsWith("{")) {
    const inner = body.slice(1, -1).trim();
    if (inner.startsWith("`")) {
      const { statics, interps } = splitTemplate(inner.slice(1, -1));
      for (const chunk of statics)
        for (const t of tokens(chunk)) {
          required.add(t);
          all.add(t);
        }
      for (const chunk of interps) addBranching(chunk);
    } else if (/^(["']).*\1$/.test(inner)) {
      for (const t of tokens(inner.slice(1, -1))) {
        required.add(t);
        all.add(t);
      }
    } else addBranching(inner);
  }
  return { required, all, exclusive, where };
}

export function collectElements(srcDir: string): ElementUse[] {
  const out: ElementUse[] = [];
  for (const rel of new Glob("**/*.tsx").scanSync({ cwd: srcDir })) {
    const text = readFileSync(`${srcDir}/${rel}`, "utf8");
    for (const attr of text.matchAll(/(^|[\s(])className\s*=\s*(?=["'{])/g)) {
      const at = attr.index + attr[0].length;
      const use = parseClassAttr(
        attributeValue(text, at),
        `${rel}:${text.slice(0, at).split("\n").length}`,
      );
      if (use.all.size > 0) out.push(use);
    }
  }
  return out;
}

export function findCascadeConflicts(css: string, elements: ElementUse[]): Conflict[] {
  const rules = parseRules(css).filter((r) => isPlain(r.selector));

  // A base is any class that can stand as an element's only required class.
  const bases = new Set<string>();
  for (const el of elements) if (el.required.size === 1) bases.add([...el.required][0]!);

  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (el.all.size < 2) continue;
    const exclusive = (a: string, b: string): boolean =>
      el.exclusive.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const selfConsistent = (cls: string[]): boolean =>
      !cls.some((a, i) => cls.slice(i + 1).some((b) => exclusive(a, b)));

    const matching = rules.filter((r) => {
      const cls = classesOf(r.selector);
      return cls.every((c) => el.all.has(c)) && selfConsistent(cls);
    });

    for (let a = 0; a < matching.length; a++) {
      for (let b = a + 1; b < matching.length; b++) {
        const first = matching[a]!;
        const second = matching[b]!;
        // Rules whose classes exclude one another never apply to the same element.
        if (
          classesOf(first.selector).some((x) =>
            classesOf(second.selector).some((y) => exclusive(x, y)),
          )
        )
          continue;
        const [early, late] = first.order < second.order ? [first, second] : [second, first];
        if (early.media !== late.media) continue;
        if (specificity(early.selector) !== specificity(late.selector)) continue;
        // Only the modifier losing to its base is a defect.
        if (!classesOf(early.selector).every((c) => !bases.has(c))) continue;
        if (classesOf(late.selector).every((c) => !bases.has(c))) continue;

        for (const [property, losing] of early.props) {
          const winning = late.props.get(property);
          if (!winning || winning.value === losing.value) continue;
          if (losing.important && !winning.important) continue;
          const key = `${early.selector}|${late.selector}|${property}`;
          if (seen.has(key)) continue;
          seen.add(key);
          conflicts.push({
            property,
            loser: { selector: early.selector, line: early.line, value: losing.value },
            winner: { selector: late.selector, line: late.line, value: winning.value },
            where: el.where,
          });
        }
      }
    }
  }
  return conflicts.sort(
    (x, y) => x.loser.line - y.loser.line || x.property.localeCompare(y.property),
  );
}

export function findConflicts(srcDir: string, cssPath: string): Conflict[] {
  return findCascadeConflicts(readFileSync(cssPath, "utf8"), collectElements(srcDir));
}

export const formatConflict = (c: Conflict): string =>
  `  ${c.property}: ${c.loser.selector} (line ${c.loser.line}) wants ${c.loser.value}, ` +
  `but ${c.winner.selector} (line ${c.winner.line}) wins with ${c.winner.value}\n` +
  `      seen on ${c.where}`;
