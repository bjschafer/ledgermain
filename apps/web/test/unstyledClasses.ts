/**
 * Finds elements that render with no styling at all: every `className` token on
 * them matches zero rules in `styles.css`, and their tag carries no global rule
 * either. This is a recurring bug here because the shared selector groups in
 * `styles.css` enumerate their members (`.mystery-preview, .curse-preview, …`),
 * so a new picker copied from an old one gets the markup and the class name but
 * never joins the group, and renders as bare running text.
 *
 * A class with no rule is only a bug when it is the element's *only* class: a
 * name like `.spell-pane-title` on a span inside a styled flex header is a
 * label, not a defect, and those are deliberately not reported.
 */
import { readFileSync } from "node:fs";
import { Glob } from "bun";

/** Tags with no global rule, so an unstyled class means an unstyled element. */
const BARE_TAGS = new Set([
  "div",
  "span",
  "p",
  "ul",
  "ol",
  "li",
  "section",
  "header",
  "footer",
  "nav",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "small",
  "strong",
  "em",
  "dl",
  "dt",
  "dd",
  "figure",
  "aside",
]);

/** Stands in for a `${}` interpolation, so half-built names aren't reported. */
const INTERPOLATION = "\u0000";

export type NakedElement = {
  /** The unstyled class, or the first of several on the same element. */
  className: string;
  tag: string;
  file: string;
  line: number;
};

/** Every class named in a selector, at any position and any nesting depth. */
export function definedClasses(cssPath: string): Set<string> {
  const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Set<string>();
  for (const block of css.matchAll(/([^{}]*)\{/g)) {
    for (const cls of block[1]!.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(cls[1]!);
  }
  return out;
}

/** Class tokens in a `className=` attribute value, dropping computed fragments. */
function tokensIn(expr: string): string[] {
  const out: string[] = [];
  for (const lit of expr.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    let body = lit[2]!;
    if (lit[1] === "`") body = body.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, INTERPOLATION);
    for (const token of body.split(/\s+/)) {
      if (token && !token.includes(INTERPOLATION) && /^-?[A-Za-z_][\w-]*$/.test(token)) {
        out.push(token);
      }
    }
  }
  return out;
}

/** Reads the `className=` value that starts at `from`, quoted or braced. */
function attributeValue(text: string, from: number): string {
  if (text[from] !== "{") {
    const quote = text[from]!;
    return text.slice(from, text.indexOf(quote, from + 1) + 1);
  }
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(from, i + 1);
  }
  return text.slice(from);
}

export function findNakedElements(srcDir: string, cssPath: string): NakedElement[] {
  const defined = definedClasses(cssPath);
  const found: NakedElement[] = [];

  for (const rel of new Glob("**/*.tsx").scanSync({ cwd: srcDir })) {
    const text = readFileSync(`${srcDir}/${rel}`, "utf8");
    for (const attr of text.matchAll(/(^|[\s(])className\s*=\s*(?=["'{])/g)) {
      const at = attr.index! + attr[0].length;
      const tokens = tokensIn(attributeValue(text, at));
      if (tokens.length === 0 || tokens.some((t) => defined.has(t))) continue;

      const before = text.slice(Math.max(0, at - 600), at);
      const tag = [...before.matchAll(/<([A-Za-z][\w.]*)/g)].pop()?.[1] ?? "";
      if (!BARE_TAGS.has(tag)) continue;

      found.push({
        className: tokens[0]!,
        tag,
        file: rel,
        line: text.slice(0, at).split("\n").length,
      });
    }
  }
  return found;
}
