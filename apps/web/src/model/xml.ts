/**
 * A small, dependency-free XML parser: text -> a generic element tree.
 *
 * Hero Lab classic's XML export is the only consumer today (see
 * `importHeroLab.ts`), but this is deliberately standalone with no DOM
 * dependency. The browser has `DOMParser`; Bun's test runner does not (no
 * `happy-dom`/`jsdom` in this repo, and adding one just for this felt like
 * the wrong tradeoff) — rather than special-case test vs. runtime behavior,
 * this hand-rolled parser runs identically in both, so the importer's tests
 * exercise the exact same parsing path production does.
 *
 * Deliberately minimal: element names, attributes (single/double-quoted),
 * text content, CDATA sections, comments, and the standard 5 XML entities
 * plus numeric character references. No namespaces, no DTD/entity
 * expansion beyond that. Throws a descriptive `Error` on malformed input —
 * callers (see `importHeroLab.ts`) turn that into a clean, user-facing
 * rejection rather than letting a crash escape.
 */

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Concatenated direct text content (entity/CDATA-decoded), not trimmed. */
  text: string;
}

const ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ent: string) => {
    if (ent.startsWith("#")) {
      const isHex = ent[1] === "x" || ent[1] === "X";
      const code = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[ent] ?? match;
  });
}

/** Parse an XML document string into its root element. Throws on malformed input. */
export function parseXml(input: string): XmlNode {
  let i = 0;
  const n = input.length;

  function fail(msg: string): never {
    throw new Error(`XML parse error: ${msg} (near offset ${i})`);
  }

  function skipWhitespace() {
    while (i < n && /\s/.test(input[i]!)) i++;
  }

  /** Skip `<?...?>` PIs, `<!-- -->` comments, and `<!DOCTYPE ...>` before the root element. */
  function skipMisc() {
    for (;;) {
      skipWhitespace();
      if (input.startsWith("<?", i)) {
        const end = input.indexOf("?>", i);
        if (end === -1) fail("unterminated processing instruction");
        i = end + 2;
        continue;
      }
      if (input.startsWith("<!--", i)) {
        const end = input.indexOf("-->", i);
        if (end === -1) fail("unterminated comment");
        i = end + 3;
        continue;
      }
      if (input.startsWith("<!", i)) {
        const end = input.indexOf(">", i);
        if (end === -1) fail("unterminated declaration");
        i = end + 1;
        continue;
      }
      break;
    }
  }

  function parseAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (;;) {
      skipWhitespace();
      const rest = input.slice(i);
      const m = /^[^\s=/>]+/.exec(rest);
      if (!m) break;
      const name = m[0];
      i += name.length;
      skipWhitespace();
      if (input[i] !== "=") {
        attrs[name] = "";
        continue;
      }
      i++; // '='
      skipWhitespace();
      const quote = input[i];
      if (quote !== '"' && quote !== "'") fail(`expected quoted value for attribute "${name}"`);
      i++;
      const end = input.indexOf(quote, i);
      if (end === -1) fail(`unterminated value for attribute "${name}"`);
      attrs[name] = decodeEntities(input.slice(i, end));
      i = end + 1;
    }
    return attrs;
  }

  function parseElement(): XmlNode {
    if (input[i] !== "<") fail("expected '<'");
    i++;
    const m = /^[^\s/>]+/.exec(input.slice(i));
    if (!m) fail("expected a tag name");
    const tag = m[0];
    i += tag.length;
    const attrs = parseAttrs();
    skipWhitespace();
    if (input.startsWith("/>", i)) {
      i += 2;
      return { tag, attrs, children: [], text: "" };
    }
    if (input[i] !== ">") fail(`expected '>' closing <${tag}>`);
    i++;

    const children: XmlNode[] = [];
    let text = "";
    for (;;) {
      if (i >= n) fail(`unexpected end of input inside <${tag}>`);
      if (input.startsWith("<!--", i)) {
        const end = input.indexOf("-->", i);
        if (end === -1) fail("unterminated comment");
        i = end + 3;
        continue;
      }
      if (input.startsWith("<![CDATA[", i)) {
        const end = input.indexOf("]]>", i);
        if (end === -1) fail("unterminated CDATA section");
        text += input.slice(i + 9, end);
        i = end + 3;
        continue;
      }
      if (input.startsWith("</", i)) {
        const end = input.indexOf(">", i);
        if (end === -1) fail("unterminated closing tag");
        const closeTag = input.slice(i + 2, end).trim();
        if (closeTag !== tag)
          fail(`mismatched closing tag: expected </${tag}> but got </${closeTag}>`);
        i = end + 1;
        break;
      }
      if (input[i] === "<") {
        children.push(parseElement());
        continue;
      }
      const next = input.indexOf("<", i);
      if (next === -1) fail(`unexpected end of input inside <${tag}>`);
      text += decodeEntities(input.slice(i, next));
      i = next;
    }
    return { tag, attrs, children, text };
  }

  skipMisc();
  if (i >= n || input[i] !== "<") fail("no root element found");
  return parseElement();
}

/** Case-insensitive first attribute value found among `names`. */
export function attrValue(node: XmlNode, names: readonly string[]): string | undefined {
  const lower = new Map(Object.entries(node.attrs).map(([k, v]) => [k.toLowerCase(), v]));
  for (const name of names) {
    const v = lower.get(name.toLowerCase());
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

/** Trimmed direct text content of a node (does not include descendant elements' text). */
export function nodeText(node: XmlNode): string {
  return node.text.trim();
}

/** Depth-first search for every descendant (not the node itself) whose tag matches `names` (case-insensitive). */
export function findAllTags(node: XmlNode, names: readonly string[]): XmlNode[] {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  const out: XmlNode[] = [];
  function walk(n: XmlNode) {
    for (const child of n.children) {
      if (wanted.has(child.tag.toLowerCase())) out.push(child);
      walk(child);
    }
  }
  walk(node);
  return out;
}

/** First descendant (searched depth-first, not the node itself) whose tag matches `names`. */
export function findFirstTag(node: XmlNode, names: readonly string[]): XmlNode | undefined {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  let found: XmlNode | undefined;
  function walk(n: XmlNode) {
    if (found) return;
    for (const child of n.children) {
      if (wanted.has(child.tag.toLowerCase())) {
        found = child;
        return;
      }
      walk(child);
      if (found) return;
    }
  }
  walk(node);
  return found;
}
