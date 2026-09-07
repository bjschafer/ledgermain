/**
 * Allowlist sanitizer for the rules prose the sheet renders as HTML.
 *
 * Descriptions reach `dangerouslySetInnerHTML` in several panels, and not all
 * of them are vendored: homebrew feats and abilities overlay onto the same
 * `RefData` collections (`model/homebrew.ts`), and imported picks carry a
 * `description` snapshot in the doc. The doc is a plain JSON blob that a
 * player can hand-edit or import from a file, so it is the untrusted input
 * here — the authoring form escaping its own textarea
 * (`homebrewEditor.textToDescriptionHtml`) is not the last line of defence.
 *
 * This is a tokenizer, not a DOM pass: it has to run under `bun test` and in
 * the browser off the same code, and `DOMParser` is not available in both.
 * Anything it does not recognise is escaped or unwrapped rather than passed
 * through, so an unknown construct degrades to inert text.
 *
 * The tag and attribute lists are sized to what the vendored data actually
 * uses (tables with column widths, emphasis, headings, the occasional
 * Archives of Nethys link). `img` is deliberately absent: every vendored one
 * points at a Foundry-relative `images\...` path that 404s here anyway, and
 * an image is how attacker-authored prose would phone home.
 */

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

/** Void elements: no closing tag, so they never enter the open-element stack. */
const VOID_TAGS = new Set(["br", "hr", "wbr", "img", "col", "area", "input", "meta", "link"]);

/**
 * Elements whose CONTENT is dropped along with the tag, rather than unwrapped.
 * Escaping a `<script>` body would be inert but would print JavaScript as
 * visible prose; `<style>` would print CSS. Everything else here can act on
 * its own without script (a `<form>` that posts somewhere, a media element
 * that fetches a URL).
 */
const DROP_SUBTREE = new Set([
  "applet",
  "audio",
  "button",
  "canvas",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "math",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
]);

/** Attributes accepted on any allowed element. */
const GLOBAL_ATTRS = new Set(["align", "dir", "lang", "style", "title"]);

/** Attributes accepted only on specific elements. */
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target"]),
  table: new Set(["border", "cellpadding", "cellspacing"]),
  td: new Set(["colspan", "rowspan", "headers", "scope"]),
  th: new Set(["colspan", "rowspan", "headers", "scope"]),
};

/**
 * CSS properties kept from a `style=` attribute. The vendored data leans on
 * `width` for table columns and `text-decoration` for struck table cells;
 * the rest are ordinary typography. Layout properties that could cover the
 * page (`position`, `z-index`, `transform`) are absent on purpose.
 */
const ALLOWED_STYLE_PROPS = new Set([
  "background-color",
  "border",
  "border-bottom",
  "border-collapse",
  "border-color",
  "border-left",
  "border-right",
  "border-style",
  "border-top",
  "border-width",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "letter-spacing",
  "line-height",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-indent",
  "text-transform",
  "vertical-align",
  "white-space",
  "width",
  "word-spacing",
]);

/** Anything that could reach the network or the CSS parser's escape hatches. */
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|@import|[\\<>{}]/i;

/** A complete character-entity reference, which must survive re-escaping intact. */
const ENTITY = /&(#\d+;|#[xX][0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]{0,31};)?/g;

/**
 * Escapes bare `&` without double-escaping the entities the vendored prose is
 * full of (`&nbsp;`, `&rsquo;`, `&mdash;`).
 */
function escapeAmp(s: string): string {
  return s.replace(ENTITY, (match, entity: string | undefined) => (entity ? match : "&amp;"));
}

function escapeText(s: string): string {
  return escapeAmp(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeAmp(s).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Accepts only http(s), mailto, in-page anchors and site-relative paths.
 * Strips whitespace and control characters first, since `java\nscript:` and
 * `java&#9;script:` both survive the browser's URL parser.
 */
function safeUrl(raw: string): string | null {
  // oxlint-disable-next-line no-control-regex -- matching them is the point
  const url = raw.replace(/[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\ufeff]/g, "");
  if (!url) return null;
  if (/^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(url)) return url;
  // No scheme at all (a bare relative path) is fine; anything else is not.
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) ? null : url;
}

function safeStyle(raw: string): string | null {
  const kept: string[] = [];
  for (const decl of raw.split(";")) {
    const colon = decl.indexOf(":");
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !value || UNSAFE_STYLE_VALUE.test(value)) continue;
    kept.push(`${prop}: ${value}`);
  }
  return kept.length > 0 ? kept.join("; ") : null;
}

function attrValue(tag: string, name: string, raw: string): string | null {
  if (name.startsWith("on")) return null;
  if (!GLOBAL_ATTRS.has(name) && !TAG_ATTRS[tag]?.has(name)) return null;
  if (name === "style") return safeStyle(raw);
  if (name === "href") return safeUrl(raw);
  return raw;
}

interface OpenElement {
  name: string;
  /** False for an unwrapped element: its children were kept, its tags were not. */
  emitted: boolean;
}

/**
 * Returns `html` with every element, attribute and URL scheme outside the
 * allowlists removed. Text is escaped, unknown elements are unwrapped (their
 * prose survives), and the output is balanced regardless of how mismatched
 * the input was.
 */
export function sanitizeHtml(html: string): string {
  const out: string[] = [];
  const stack: OpenElement[] = [];
  /** Nesting depth inside a {@link DROP_SUBTREE} element; 0 when emitting. */
  let dropDepth = 0;
  let dropTag = "";
  let i = 0;

  const emitText = (text: string) => {
    if (dropDepth === 0 && text) out.push(escapeText(text));
  };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      emitText(html.slice(i));
      break;
    }
    emitText(html.slice(i, lt));

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt + 2);
      i = end < 0 ? html.length : end + 1;
      continue;
    }

    const opener = /^<(\/?)([a-zA-Z][a-zA-Z0-9:_-]*)/.exec(html.slice(lt));
    if (!opener) {
      // A stray `<` in prose ("a bonus of <5"), not a tag.
      emitText("<");
      i = lt + 1;
      continue;
    }

    const closing = opener[1] === "/";
    const name = opener[2]!.toLowerCase();
    const parsed = parseTag(html, lt + opener[0].length);
    i = parsed.end;

    if (dropDepth > 0) {
      if (name !== dropTag) continue;
      if (closing) {
        dropDepth -= 1;
        if (dropDepth === 0) dropTag = "";
      } else if (!parsed.selfClosing) {
        dropDepth += 1;
      }
      continue;
    }

    if (closing) {
      if (VOID_TAGS.has(name)) continue;
      const at = findOpen(stack, name);
      if (at < 0) continue;
      for (let k = stack.length - 1; k >= at; k -= 1) {
        if (stack[k]!.emitted) out.push(`</${stack[k]!.name}>`);
      }
      stack.length = at;
      continue;
    }

    if (DROP_SUBTREE.has(name)) {
      if (!parsed.selfClosing) {
        dropTag = name;
        dropDepth = 1;
      }
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) {
      // Unwrap: the tag goes, its children stay. Covers prose that looks like
      // markup ("<chosen weapon>") as well as elements we simply don't render.
      if (!VOID_TAGS.has(name) && !parsed.selfClosing) stack.push({ name, emitted: false });
      continue;
    }

    out.push(`<${name}${renderAttrs(name, parsed.attrs)}>`);
    // A self-closing non-void tag (`<p/>`) is an open tag in HTML, so it is
    // treated as one here too.
    if (!VOID_TAGS.has(name)) stack.push({ name, emitted: true });
  }

  for (let k = stack.length - 1; k >= 0; k -= 1) {
    if (stack[k]!.emitted) out.push(`</${stack[k]!.name}>`);
  }
  return out.join("");
}

/** Index of the innermost open `name`, or -1 — an unmatched close tag is dropped. */
function findOpen(stack: OpenElement[], name: string): number {
  for (let k = stack.length - 1; k >= 0; k -= 1) {
    if (stack[k]!.name === name) return k;
  }
  return -1;
}

function renderAttrs(tag: string, attrs: [string, string][]): string {
  const seen = new Set<string>();
  let rendered = "";
  let hasTarget = false;
  for (const [name, raw] of attrs) {
    if (seen.has(name)) continue;
    const value = attrValue(tag, name, raw);
    if (value === null) continue;
    seen.add(name);
    if (name === "target") hasTarget = true;
    rendered += ` ${name}="${escapeAttr(value)}"`;
  }
  // A link that opens a new tab hands that tab a live `window.opener` unless
  // told otherwise; the source `rel` is dropped above so this is the only one.
  if (tag === "a" && hasTarget) rendered += ' rel="noopener noreferrer"';
  return rendered;
}

interface ParsedTag {
  attrs: [string, string][];
  selfClosing: boolean;
  /** Index just past the tag's `>`. */
  end: number;
}

/** Reads a tag's attributes from just after its name up to the closing `>`. */
function parseTag(html: string, start: number): ParsedTag {
  const attrs: [string, string][] = [];
  let selfClosing = false;
  let j = start;
  while (j < html.length) {
    while (j < html.length && /\s/.test(html[j]!)) j += 1;
    if (j >= html.length) break;
    if (html[j] === ">") {
      j += 1;
      break;
    }
    if (html[j] === "/") {
      if (html[j + 1] === ">") {
        selfClosing = true;
        j += 2;
        break;
      }
      j += 1;
      continue;
    }
    const nameStart = j;
    while (j < html.length && !/[\s/>=]/.test(html[j]!)) j += 1;
    const name = html.slice(nameStart, j).toLowerCase();
    let value = "";
    let k = j;
    while (k < html.length && /\s/.test(html[k]!)) k += 1;
    if (html[k] === "=") {
      k += 1;
      while (k < html.length && /\s/.test(html[k]!)) k += 1;
      const quote = html[k];
      if (quote === '"' || quote === "'") {
        const end = html.indexOf(quote, k + 1);
        value = end < 0 ? html.slice(k + 1) : html.slice(k + 1, end);
        k = end < 0 ? html.length : end + 1;
      } else {
        const valueStart = k;
        while (k < html.length && !/[\s>]/.test(html[k]!)) k += 1;
        value = html.slice(valueStart, k);
      }
      j = k;
    }
    if (name) attrs.push([name, decodeAttrEntities(value)]);
  }
  return { attrs, selfClosing, end: j };
}

/** The named references that matter for an attribute-value bypass attempt. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: "\u00a0",
  quot: '"',
  tab: "\t",
  newline: "\n",
};

function codePoint(value: number): string {
  return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "";
}

/**
 * Attribute values are re-escaped on the way out, so they have to be decoded
 * on the way in — otherwise `href="javascript&#58;alert(1)"` would slip past
 * `safeUrl` as an innocent relative path and be handed back to the browser,
 * which decodes it.
 */
function decodeAttrEntities(value: string): string {
  if (!value.includes("&")) return value;
  return value.replace(
    /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{0,31});?/g,
    (match, ref: string) => {
      if (ref.startsWith("#x") || ref.startsWith("#X")) {
        return codePoint(Number.parseInt(ref.slice(2), 16));
      }
      if (ref.startsWith("#")) return codePoint(Number.parseInt(ref.slice(1), 10));
      return NAMED_ENTITIES[ref.toLowerCase()] ?? match;
    },
  );
}
