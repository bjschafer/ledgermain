import { readFileSync } from "node:fs";

import type { SourceRef } from "@pf1/schema";

/**
 * Reader for the "Pf Data 1e" dataset's `json/*.json` files (issue #74 Phase
 * 3a): each file is a flat dictionary, keyed by a snake_case slug, of entries
 * sharing one loose shape (documented in the dataset's own `schema.json` /
 * `JSON.md`). The SAME shape backs every subsystem file in `json/` — rage
 * powers, hexes, arcana, talents, exploits, wild talents, … — so everything
 * in this module is generic across all of them; only the per-subsystem
 * mapping from a `PfDataEntry` to a RefData type (e.g. `transform/
 * ragePowers.ts`'s `transformRagePowers`) is specific to one file.
 *
 * Deliberately covers only what the format spec (`JSON.md`) documents and
 * the rage-power file actually exercises — not a full reimplementation of
 * the dataset's `marked`-based renderer (headers/lists/footnotes/the dozens
 * of other block & inline directives are out of scope until a subsystem
 * that actually uses them needs them).
 */

/** One entry in a Pf Data 1e dictionary file. Not every field applies to every entry — see `isPfDataCatalogEntry`. */
export interface PfDataEntry {
  name?: string;
  /** Ability-type suffix as published, e.g. "(Ex)", "(Su)", "(Sp)". */
  nameSuffix?: string;
  /** Grouping tag, e.g. "Totem", "Blood", "Stance" for rage powers. */
  category?: string;
  /** Minimum class level to select/use this entry, when the source states one. */
  level?: number;
  /** `[book title, page?]` pairs — the shape used by class-ability-style dictionaries (rage powers included). */
  compilationSources?: [string, number?][];
  /** Plain source-book title list — the shape used by other dictionary shapes in this dataset. */
  sources?: string[];
  /**
   * One array element per line of the entry's markdown source (NOT one per
   * paragraph) — a blank string element is a blank line, i.e. a paragraph
   * break. See `pfDataDescriptionToHtml`.
   */
  description?: string[];
  /** Present on a redirect/alias entry — the real entry lives under this key instead. Never a catalog entry. */
  redirect?: string;
  /** Present on a "this is the same as X" copy entry. Never a catalog entry (no `description` of its own). */
  copyof?: string;
  /** Present on an "alternate name of X, matched by regex" entry. Never a catalog entry. */
  alternateOf?: string;
  /** True on a disambiguation index page (e.g. a name shared by several real entries). Never a catalog entry. */
  disambiguation?: boolean;
  /**
   * `[parent page title, parent page link]` — a "this entry belongs under
   * this table-of-contents page" pointer (e.g. an arcanist greater exploit's
   * `["Greater Exploits", "ability/greater_exploits"]`, or a kineticist wild
   * talent's `["Infusions", "ability/infusion_wild_talents"]`). Absent from
   * the rage-power file (Phase 3a didn't need it); present and useful as a
   * grouping/tier signal on later subsystem files (Phase 3b) — see those
   * transforms' doc comments for how each one interprets it.
   */
  topLink?: [string, string];
}

export type PfDataDictionary = Record<string, PfDataEntry>;

/** Parse one `json/*.json` dictionary file from the pinned Pf Data 1e clone. */
export function readPfDataDictionary(filePath: string): PfDataDictionary {
  return JSON.parse(readFileSync(filePath, "utf8")) as PfDataDictionary;
}

/**
 * True for an entry that is a real catalog item — has its own name +
 * description — as opposed to a redirect/copy/alternate-name alias or a
 * disambiguation index page (all of which point elsewhere rather than
 * describing a thing in their own right).
 */
export function isPfDataCatalogEntry(entry: PfDataEntry): boolean {
  return (
    entry.description !== undefined &&
    entry.name !== undefined &&
    entry.redirect === undefined &&
    entry.copyof === undefined &&
    entry.alternateOf === undefined &&
    entry.disambiguation !== true
  );
}

/**
 * Every real catalog entry in `dict`, filtering out redirects/copies/
 * disambiguation pages (see `isPfDataCatalogEntry`) plus any caller-supplied
 * placeholder keys — the dataset's "not found" sentinel entries pass the
 * structural check above (they have a `name`/`description` of their own,
 * e.g. rage powers' `not_found` -> `{ name: "Unknown", ... }`) so they can't
 * be filtered generically and must be named explicitly per file.
 */
export function pfDataCatalogEntries(
  dict: PfDataDictionary,
  opts: { skipKeys?: ReadonlySet<string> } = {},
): [string, PfDataEntry][] {
  return Object.entries(dict).filter(
    ([key, entry]) => !opts.skipKeys?.has(key) && isPfDataCatalogEntry(entry),
  );
}

function slugifyBookTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convert an entry's `compilationSources`/`sources` into `RefEntity.sources` (book-title slugs; not cross-referenced against Foundry's own `sources.json` registry — this is a different dataset's book list). */
export function pfDataSourceRefs(entry: PfDataEntry): SourceRef[] | undefined {
  const fromCompilation = (entry.compilationSources ?? []).map(([book, page]) => ({
    id: slugifyBookTitle(book),
    ...(page !== undefined ? { pages: String(page) } : {}),
  }));
  const fromPlain = (entry.sources ?? []).map((book) => ({ id: slugifyBookTitle(book) }));
  const refs = [...fromCompilation, ...fromPlain];
  return refs.length > 0 ? refs : undefined;
}

/* ---------------------------------------------------- markdown -> HTML -- */

/**
 * The dataset's cross-reference syntax (see `JSON.md` "Link System"):
 * `‹protocol/link text›` (U+2039/U+203A, not ASCII `<>`). We only ever need
 * the *display* text (this app has nowhere to send the link), so this
 * resolves each reference to its plain text — dropping the protocol prefix,
 * `<extra_url>`-only segments (angle brackets — not part of display text),
 * and the `«extra text»` markers themselves while KEEPING their content
 * (guillemets mark text that's part of display but excluded from the URL
 * slug, so for display purposes stripping just the marks is correct
 * regardless of which of the two orientations — `«text»` or `»text«` — the
 * source uses for it).
 */
function linkDisplayText(inner: string): string {
  const slash = inner.indexOf("/");
  const rest = slash === -1 ? inner : inner.slice(slash + 1);
  return rest.replace(/<[^>]*>?/g, "").replace(/[«»]/g, "");
}

function resolveCrossRefs(text: string): string {
  return text.replace(/‹([^›]*)›/g, (_m, inner: string) => linkDisplayText(inner));
}

/** `@ripple[protocol/text]` / `@hll[protocol/text]` — a link, same "protocol/text" convention as `‹…›`. Resolved to plain display text. */
function resolveLinkDirectives(text: string): string {
  return text.replace(/@(?:ripple|hll)\[([^\]]*)\]/g, (_m, inner: string) =>
    linkDisplayText(inner),
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** `@HL[text]`/`@hl[text]`/`@b[text]`/`@strong[text]`/`@i[text]`/`@em[text]`/`@span[text]` (any trailing `{…}` properties are ignored — this app has no use for e.g. a `className` prop). Run AFTER `escapeHtml` so the tags these introduce survive. */
function resolveFormattingDirectives(text: string): string {
  return text
    .replace(/@(?:HL|hl|b|strong)\[([^\]]*)\](?:\{[^}]*\})?/g, "<strong>$1</strong>")
    .replace(/@(?:i|em)\[([^\]]*)\](?:\{[^}]*\})?/g, "<em>$1</em>")
    .replace(/@span\[([^\]]*)\](?:\{[^}]*\})?/g, "$1");
}

/** Inline-level conversion for one line/cell of source text: cross-refs, link/formatting directives, entity-escaping, then markdown bold/italic. */
function inlineToHtml(raw: string): string {
  let text = resolveCrossRefs(raw);
  text = resolveLinkDirectives(text);
  text = escapeHtml(text);
  text = resolveFormattingDirectives(text);
  text = text.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  return text;
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|");
}

function splitTableRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.trim());
}

function isTableSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/** A GFM-style `| a | b |` table (only shape the dataset's Markdown uses for tables). */
function renderTable(lines: string[]): string {
  const rows = lines.map(splitTableRow);
  const hasHeader = rows.length >= 2 && isTableSeparatorRow(rows[1]!);
  const header = hasHeader ? rows[0]! : undefined;
  const body = hasHeader ? rows.slice(2) : rows;
  const cell = (c: string, tag: "td" | "th") => `<${tag}>${inlineToHtml(c)}</${tag}>`;
  const head = header ? `<thead><tr>${header.map((c) => cell(c, "th")).join("")}</tr></thead>` : "";
  const body_ = `<tbody>${body.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("")}</tbody>`;
  return `<table>${head}${body_}</table>`;
}

/**
 * Loosely parses a directive's `{key="quoted value" key2=bareValue flag}`
 * property list (single-quote-free — the source never uses them) into a
 * plain object; boolean flags map to `true`.
 */
function parseDirectiveProps(raw: string): Record<string, string | true> {
  const props: Record<string, string | true> = {};
  const re = /([a-zA-Z][a-zA-Z0-9]*)(=(?:"([^"]*)"|(\S+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1]!;
    props[key] = m[2] === undefined ? true : (m[3] ?? m[4] ?? "");
  }
  return props;
}

/**
 * `::aff[Name]{prop="value" ...}` — a Foundry-style affliction/curse/poison
 * stat block (used by a handful of rage powers' curse chains). We aren't
 * trying to fully re-render the block's game-mechanical structure (onset,
 * frequency, cure DC, ...) — just surface its `eff`/`effStr` prose (the
 * human-readable effect description, which is what a player actually reads)
 * under the block's own name, so no data is silently dropped even though the
 * rendering is plainer than the source app's.
 */
function renderAfflictionBlock(name: string, propsRaw: string): string {
  const props = parseDirectiveProps(propsRaw);
  const effText = props.eff ?? props.effStr;
  const label = inlineToHtml(name);
  if (typeof effText === "string" && effText.trim() !== "") {
    return `<p><strong>${label}:</strong> ${inlineToHtml(effText)}</p>`;
  }
  return `<p><strong>${label}</strong></p>`;
}

const AFFLICTION_BLOCK_RE = /^::aff\[([^\]]*)\]\{([^}]*)\}$/;

/** Split an entry's `description` LINE array into blank-line-delimited blocks. */
function splitIntoBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

function renderBlock(lines: string[]): string {
  if (lines.every(isTableRow)) return renderTable(lines);

  if (lines.length === 1) {
    const aff = AFFLICTION_BLOCK_RE.exec(lines[0]!);
    if (aff) return renderAfflictionBlock(aff[1]!, aff[2]!);
  }

  // Soft-wrapped continuation lines within one paragraph join with a space.
  const text = lines.join(" ").trim();
  return text === "" ? "" : `<p>${inlineToHtml(text)}</p>`;
}

/**
 * Convert a `PfDataEntry.description` line array into the same simple
 * `<p>`/`<strong>`/`<em>`/`<table>` HTML-ish prose shape the rest of RefData
 * uses (see `FeatureDescription` in `apps/web`) — cross-refs resolved to
 * plain display text, dataset directives resolved to their nearest HTML
 * equivalent, markdown bold/italic converted, GFM tables rendered.
 */
export function pfDataDescriptionToHtml(lines: string[]): string {
  return splitIntoBlocks(lines)
    .map(renderBlock)
    .filter((html) => html !== "")
    .join("\n");
}

const HEADER_SUFFIX_RE = /^##\s*.+?\(([A-Za-z][A-Za-z, /]*)\)\s*$/;

/**
 * Some subsystem files (arcanist exploits, kineticist wild talents) don't
 * carry an ability-type suffix ("(Ex)"/"(Su)"/"(Sp)") as its own dictionary
 * field the way rage powers/investigator talents do — instead it's baked
 * into the entry's own markdown header, the FIRST line of `description`
 * (`## Acid Jet (Su)`). Returns the parenthesized suffix INCLUDING its
 * parens (matching the `RagePower.nameSuffix` convention), or `undefined`
 * when the header has no trailing parenthetical (a real, legitimate case —
 * e.g. several exploits state no activation type at all).
 */
export function pfDataHeaderNameSuffix(description: string[] | undefined): string | undefined {
  const header = description?.[0];
  if (!header) return undefined;
  const m = HEADER_SUFFIX_RE.exec(header.trim());
  return m ? `(${m[1]})` : undefined;
}

const HEADER_LINE_RE = /^##\s+.*$/;
const SOURCE_LINE_RE = /^‹SOURCE\b[^›]*›\s*$/;

/**
 * Some subsystem files' rendered page includes the entry's own markdown
 * header (`## Acid Jet (Su)`) and a `‹SOURCE Book[/page]›` citation line as
 * lines OF `description` itself (arcanist exploits, kineticist wild
 * talents) — both fully redundant with fields this reader already surfaces
 * structurally (`name`+`pfDataHeaderNameSuffix`, `pfDataSourceRefs`), so
 * rendering them verbatim would show a stray "## Acid Jet (Su)" / raw
 * "SOURCE Advanced Class Guide" paragraph atop the actual prose. Other
 * subsystem files (rage powers, investigator talents) never carry these
 * lines at all — verified against the full 315/68-entry catalogs — so this
 * is a no-op for them; call unconditionally rather than gating per-file.
 * Strips at most one header line and, independently, at most one source
 * line (either order, with an optional intervening blank line each side).
 */
export function pfDataBodyLines(description: string[]): string[] {
  let lines = description;
  if (lines[0] !== undefined && HEADER_LINE_RE.test(lines[0].trim())) {
    lines = lines.slice(1);
    if (lines[0]?.trim() === "") lines = lines.slice(1);
  }
  if (lines[0] !== undefined && SOURCE_LINE_RE.test(lines[0].trim())) {
    lines = lines.slice(1);
    if (lines[0]?.trim() === "") lines = lines.slice(1);
  }
  return lines;
}
