import { readFileSync } from "node:fs";

import type { SourceRef } from "@pf1/schema";

/**
 * Reader for the "Pf Data 1e" dataset's `json/*.json` files: each file is a
 * flat dictionary, keyed by a snake_case slug, of entries sharing one loose
 * shape (documented in the dataset's own `schema.json` / `JSON.md`). The SAME
 * shape backs every subsystem file in `json/` — rage powers, hexes, arcana,
 * talents, exploits, wild talents, … — so everything in this module is generic
 * across all of them; only the per-subsystem mapping from a `PfDataEntry` to a
 * RefData type (e.g. `transform/ ragePowers.ts`'s `transformRagePowers`) is
 * specific to one file.
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

/**
 * A `‹SOURCE Book Title/page›` citation line as its own `SourceRef` — for a
 * caller reading a citation that belongs to a SUB-section of an entry rather
 * than to the entry as a whole (a subdomain's own book/page, cited under its
 * `::h3[...]` heading inside the parent domain's entry), which
 * `pfDataSourceRefs` can't see because it only reads entry-level fields.
 * `undefined` when the line isn't a citation.
 */
export function pfDataSourceRefFromLine(line: string): SourceRef | undefined {
  const m = /^‹SOURCE\s+([^/›]+?)\s*(?:\/\s*(\d+))?›$/.exec(line.trim());
  if (!m) return undefined;
  return { id: slugifyBookTitle(m[1]!), ...(m[2] ? { pages: m[2] } : {}) };
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

/**
 * Named HTML character entities observed across the dataset's `json/*.json`
 * source prose (accented Latin letters, typographic punctuation, `&times;` for
 * a "x2"-style multiplier,...) — the source embeds these LITERALLY rather than
 * as raw Unicode, so decoding them back to a real character BEFORE
 * `escapeHtml` runs is required; otherwise `escapeHtml`'s blind `&` -> `&amp;`
 * re-escapes an already-valid entity into a broken one (e.g. `&mdash;` ->
 * `&amp;mdash;`, which browsers render as the literal text "&mdash;" instead
 * of an em dash). Covers every entity seen in the pinned clone as of the
 * magus-arcana import; extend this map if a future subsystem's slice surfaces
 * one not listed here.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  copy: "©",
  deg: "°",
  emsp: " ",
  shy: "­",
  mdash: "—",
  ndash: "–",
  times: "×",
  pi: "π",
  dagger: "†",
  Dagger: "‡",
  szlig: "ß",
  acirc: "â",
  auml: "ä",
  euml: "ë",
  ouml: "ö",
  uuml: "ü",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
};

function decodeNamedEntities(text: string): string {
  return text.replace(/&([A-Za-z]+);/g, (m, name: string) => NAMED_ENTITIES[name] ?? m);
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

/**
 * Inline-level conversion for one line/cell of source text: cross-refs,
 * link/formatting directives, entity-decoding, entity-escaping, then markdown
 * bold/italic. Exported for `util/monsterStatblock.ts`, which assembles
 * statblock display lines from directive prop values — each prop value is one
 * inline text fragment in exactly this dialect, never a block.
 */
export function inlineToHtml(raw: string): string {
  let text = resolveCrossRefs(raw);
  text = resolveLinkDirectives(text);
  text = decodeNamedEntities(text);
  text = escapeHtml(text);
  text = resolveFormattingDirectives(text);
  text = text.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  return text;
}

/**
 * Inline-level conversion to PLAIN TEXT: cross-refs and link/formatting
 * directives resolved to their display text, entities decoded, markdown
 * bold/italic markers stripped. For `util/monsterStatblock.ts`'s display-
 * string fields (senses, special attacks, ...), which the reference site
 * renders as text nodes — HTML tags there would print literally.
 */
export function inlineToPlainText(raw: string): string {
  let text = resolveCrossRefs(raw);
  text = resolveLinkDirectives(text);
  text = decodeNamedEntities(text);
  text = text.replace(/@(?:HL|hl|b|strong|i|em|span)\[([^\]]*)\](?:\{[^}]*\})?/g, "$1");
  text = text.replace(/\*\*([^*]+?)\*\*/g, "$1");
  text = text.replace(/\*([^*]+?)\*/g, "$1");
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
 * plain object; boolean flags map to `true`. Exported for `transform/
 * spellSr.ts`, which parses the `::spell{...}` directive's own prop list
 * (source citation, casting-time/range/SR tokens, ...) the same way every
 * other directive here does.
 */
export function parseDirectiveProps(raw: string): Record<string, string | true> {
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
 * The ability-damage/-drain keys an `::aff` directive spells its effect with
 * (`effStr=1d3` is "1d3 Str damage"; the `D` suffix is drain). Also reused
 * with an `in`/`sec` prefix for split initial/secondary effects
 * (`ineffConD`/`seceffStr`).
 */
const AFF_EFFECT_KEYS: [string, string][] = [
  ["effStr", "Str damage"],
  ["effDex", "Dex damage"],
  ["effCon", "Con damage"],
  ["effInt", "Int damage"],
  ["effWis", "Wis damage"],
  ["effCha", "Cha damage"],
  ["effStrD", "Str drain"],
  ["effDexD", "Dex drain"],
  ["effConD", "Con drain"],
  ["effIntD", "Int drain"],
  ["effWisD", "Wis drain"],
  ["effChaD", "Cha drain"],
];

/** "1d3 Str damage, 1d3 Con damage and unconsciousness" — the composed effect of one `::aff` key set, or `undefined` when it states none. */
function affEffectText(props: Record<string, string | true>, prefix = ""): string | undefined {
  const parts: string[] = [];
  for (const [key, label] of AFF_EFFECT_KEYS) {
    const v = props[`${prefix}${key}`];
    if (typeof v === "string") parts.push(`${v} ${label}`);
  }
  const extra = props[`${prefix}effExtra`];
  if (typeof extra === "string") parts.push(extra);
  if (parts.length === 0) return undefined;
  const joiner = props[`${prefix}effOr`] !== undefined ? " or " : " and ";
  const last = parts.pop()!;
  return parts.length > 0 ? `${parts.join(", ")}${joiner}${last}` : last;
}

/** "1 save" / "2 consecutive saves" — the cure a `::aff` flag encodes. */
const AFF_CURE_FLAGS: [string, string][] = [
  ["cure1", "1 save"],
  ["cure2", "2 saves"],
  ["cure2c", "2 consecutive saves"],
  ["cure3", "3 saves"],
  ["cure3c", "3 consecutive saves"],
];

/**
 * `::aff[Name]{prop="value"...}` — an affliction (poison/disease/curse/
 * infestation) stat block, with or without the `[Name]` label (the name-less
 * variant is a natural-attack-embedded rider — e.g. a bite's poison — whose
 * `type=` is a delivery-vector tag like "Bite-injury", not a display name).
 * Composed into the printed one-line affliction shape: type; save; onset;
 * frequency; effect; cure — with the effect either stated as prose (`eff`),
 * spelled from ability-damage keys (`effStr=1d3` -> "1d3 Str damage"), or
 * split initial/secondary (`ineff*`/`seceff*`). Non-textual metadata
 * (`icon*`, `nolink`, `start`) is ignored. The rare formula-stated DCs
 * (`dcHD`/`dcF`/...) render as their closest prose.
 */
function renderAfflictionBlock(name: string | undefined, propsRaw: string): string {
  const props = parseDirectiveProps(propsRaw);
  const text = (v: string | true | undefined): string | undefined =>
    typeof v === "string" && v.trim() !== "" ? v : undefined;

  const supertype = props.poison
    ? "Poison"
    : props.curse
      ? "Curse"
      : props.infest
        ? "Infestation"
        : props.disease
          ? "Disease"
          : undefined;
  const type = [supertype, text(props.type)].filter((t) => t !== undefined).join("; ");

  let save = text(props.save);
  if (save === undefined && text(props.saveF)) save = `Fort DC ${props.saveF}`;
  if (save === undefined && text(props.saveW)) save = `Will DC ${props.saveW}`;
  if (save === undefined && (props.dcF || props.dcW) && (props.dcHD || props.dcLev)) {
    const kind = props.dcF ? "Fort" : "Will";
    const base = props.dcHD
      ? `1/2 the ${props.dcHD}'s HD`
      : `1/2 the ${String(props.dcLev)}'s level`;
    const mod = text(props.dcMod) ?? "";
    save = `${kind} DC 10 + ${base}${mod ? ` + their ${mod} modifier` : ""}`;
  }

  let frequency = text(props.freq);
  if (frequency === undefined) {
    const unit = props.freqR
      ? "round"
      : props.freqM
        ? "minute"
        : props.freqH
          ? "hour"
          : props.freqD
            ? "day"
            : undefined;
    const count = props.freqR ?? props.freqM ?? props.freqH ?? props.freqD;
    if (unit && typeof count === "string") frequency = `1/${unit} for ${count} ${unit}s`;
  }

  const effect = text(props.eff) ?? affEffectText(props);
  const initial = text(props.ineff) ?? affEffectText(props, "in");
  const secondary = text(props.seceff) ?? affEffectText(props, "sec");

  let cure = text(props.cure);
  if (cure === undefined) {
    cure = AFF_CURE_FLAGS.find(([flag]) => props[flag] !== undefined)?.[1];
  }

  const segments: string[] = [];
  if (type !== "") segments.push(inlineToHtml(type));
  if (save !== undefined) segments.push(`<em>save</em> ${inlineToHtml(save)}`);
  const onset = text(props.onset);
  if (onset !== undefined) segments.push(`<em>onset</em> ${inlineToHtml(onset)}`);
  if (frequency !== undefined) segments.push(`<em>frequency</em> ${inlineToHtml(frequency)}`);
  if (effect !== undefined) segments.push(`<em>effect</em> ${inlineToHtml(effect)}`);
  if (initial !== undefined) segments.push(`<em>initial effect</em> ${inlineToHtml(initial)}`);
  if (secondary !== undefined)
    segments.push(`<em>secondary effect</em> ${inlineToHtml(secondary)}`);
  if (cure !== undefined) segments.push(`<em>cure</em> ${inlineToHtml(cure)}`);
  let body = segments.join("; ");
  const extraText = text(props.extra);
  if (extraText !== undefined) body += `${body === "" ? "" : ". "}${inlineToHtml(extraText)}`;

  if (name === undefined) return body === "" ? "" : `<p>${body}</p>`;
  const label = inlineToHtml(name);
  if (body === "") return `<p><strong>${label}</strong></p>`;
  return `<p><strong>${label}:</strong> ${body}</p>`;
}

const AFFLICTION_BLOCK_RE = /^::aff(?:\[([^\]]*)\])?\{([^}]*)\}$/;

/**
 * `::h3[Text]{...props}` and its siblings — a sub-heading (e.g. a sorcerer
 * bloodline's "Wildblooded Mutation" variant, a bloodrager bloodline's
 * alternate form; `::sh` for a monster's "Special Abilities" divider). We
 * don't model the section structurally, just render its heading as a bold
 * paragraph so it doesn't leak raw directive syntax into the prose.
 *
 * The whole `h2`-`h6`/`gh`/`sh` family is matched rather than `h3` alone: they
 * differ only in the visual weight the dataset's own renderer gives them,
 * which this reader flattens anyway, and matching one of them meant the others
 * leaked verbatim.
 */
const HEADING_DIRECTIVE_RE = /^::(?:h[2-6]|gh|sh)\[([^\]]*)\](?:\{([^}]*)\})?$/;

/**
 * `::prereq{...}` — an entry's prerequisites, which the dataset states
 * structurally rather than as a prose line: `c`/`l` a class and its minimum
 * level, `r` a race, `gN`/`gNtitle` a titled group of alternatives, and
 * `other` free prose for everything that resists structure. Rendered as the
 * "Prerequisite(s):" line the books print, since nothing downstream gates on
 * it (feat prereqs come from the Foundry side; see the hybrid-prereq rule in
 * CLAUDE.md) and dropping it would lose real published text.
 */
const PREREQ_DIRECTIVE_RE = /^::prereq\{([^}]*)\}$/;

/**
 * `::div{...}` — a layout container (`className=reduce` and friends), carrying
 * no content of its own. The `:::div` fenced form is already blanked by
 * `stripBlockLevelMarkers`; this is the leaf form.
 */
const DIV_DIRECTIVE_RE = /^::div\{[^}]*\}$/;

function renderPrereqDirective(propsRaw: string): string {
  const props = parseDirectiveProps(propsRaw);
  const parts: string[] = [];

  const cls = typeof props.c === "string" ? props.c : undefined;
  const level = typeof props.l === "string" ? props.l : undefined;
  if (cls && level) parts.push(`${inlineToHtml(cls)} ${level}`);
  else if (cls) parts.push(inlineToHtml(cls));
  else if (level) parts.push(`${level}${ordinalSuffix(Number(level))} level`);

  if (typeof props.r === "string") parts.push(inlineToHtml(props.r));

  // Titled groups of alternatives: `g1="anguish bomb" g1title="Class Feature
  // or Discovery"`. Only `g1` exists today; read them generically so a `g2`
  // appearing upstream doesn't silently vanish.
  const groups = Object.keys(props)
    .map((k) => /^g(\d+)$/.exec(k)?.[1])
    .filter((n): n is string => n !== undefined)
    .sort((a, b) => Number(a) - Number(b));
  for (const n of groups) {
    const value = props[`g${n}`];
    if (typeof value !== "string") continue;
    const title = props[`g${n}title`];
    const items = inlineToHtml(value.split("~").join(", "));
    parts.push(typeof title === "string" ? `${inlineToHtml(title)}: ${items}` : items);
  }

  if (typeof props.other === "string") parts.push(inlineToHtml(props.other));

  if (parts.length === 0) return "";
  const label = parts.length === 1 ? "Prerequisite" : "Prerequisites";
  return `<p><strong>${label}:</strong> ${parts.join("; ")}</p>`;
}

/**
 * `::list[Label]{... all="A~B~C"}` — a tilde-separated named list (e.g. a
 * bloodrager bloodline's "Bonus Feats"). Renders as a labeled, comma-joined
 * line; falls back to just the label if the source omits `all`.
 */
const LIST_DIRECTIVE_RE = /^::list\[([^\]]*)\]\{([^}]*)\}$/;

function renderListDirective(label: string, propsRaw: string): string {
  const props = parseDirectiveProps(propsRaw);
  const all = typeof props.all === "string" ? props.all : undefined;
  const labelHtml = inlineToHtml(label);
  if (!all) return `<p><strong>${labelHtml}</strong></p>`;
  const items = all
    .split("~")
    .map((s) => inlineToHtml(s))
    .join(", ");
  return `<p><strong>${labelHtml}:</strong> ${items}</p>`;
}

/**
 * `::ab[Name]{l=N icon=... <kind>="text" impNN="text" usage="..."}` — a
 * bloodrager bloodline power/ability stat block (`icon` is non-textual
 * metadata this reader ignores; the `use*` family encodes a daily-use cap
 * and is read separately by `pfDataAbilityUses`). `<kind>` is
 * whichever action-type key the source used (`passive`/`immediate`/
 * `standard`/`swift`/`free`/`ability`) holding the actual ability text;
 * `impNN` keys are level-gated improvements, folded in as "At Nth level: ..."
 * sentences. A "Bonus Spells by Bloodrager Level"-style entry has no `<kind>`
 * text at all, only level-keyed spell names (`s7`/`s10`/...) — rendered as a
 * level list instead.
 */
// The label moved from a `[bracket]` into a `title="&L&Name (Ex)&FN&"` prop
// in the pack rewrite that followed the v11.11 tag, so both forms are matched
// and `renderAbDirective` takes whichever one carries the name. Matching only
// the bracketed form meant every rewritten entry leaked its whole directive.
const AB_DIRECTIVE_RE = /^::ab(?:\[([^\]]*)\])?\{([^}]*)\}$/;

/**
 * The dataset wraps a directive's display name in `&L&`/`&FN&` markers (a
 * link-and-footnote hint for its own renderer). Strip them, and the ability
 * type suffix with them: `nameSuffix` carries that separately, so leaving it
 * on the heading prints "Animal Fury (Ex) (Ex)".
 */
function abTitleName(title: string): string {
  return title
    .replace(/&L&/g, "")
    .replace(/&FN&/g, "")
    .replace(/\s*\((?:Ex|Su|Sp|Ps)\)\s*$/i, "")
    .trim();
}
const AB_KIND_KEYS = [
  "passive",
  "immediate",
  "standard",
  "swift",
  "free",
  "ability",
  "full",
  "reaction",
  // The source uses both `full` and `fullround` for a full-round action.
  // Listed last so a directive carrying one of the keys above keeps picking
  // that one; these only ever supply the text when nothing else does.
  "fullround",
  "move",
] as const;

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * The ability's prose, inline-converted: its action-type text plus any
 * level-gated `impNN` improvements and a trailing `usage` note. `undefined`
 * when the directive carries no action-type key at all (the level-keyed
 * "Bonus Spells by Bloodrager Level" shape, handled separately by
 * `renderAbDirective`).
 */
function abBodyText(props: Record<string, string | true>): string | undefined {
  let mainText: string | undefined;
  for (const key of AB_KIND_KEYS) {
    const v = props[key];
    if (typeof v === "string") {
      mainText = v;
      break;
    }
  }
  if (mainText === undefined) return undefined;

  let text = inlineToHtml(mainText);
  const improvements = Object.entries(props)
    .filter((e): e is [string, string] => /^imp\d+$/.test(e[0]) && typeof e[1] === "string")
    .map(([k, v]) => ({ level: Number(k.slice(3)), text: v }))
    .sort((a, b) => a.level - b.level);
  for (const imp of improvements) {
    text += ` At ${imp.level}${ordinalSuffix(imp.level)} level: ${inlineToHtml(imp.text)}`;
  }
  if (typeof props.special === "string") text += ` ${inlineToHtml(props.special)}`;
  if (typeof props.prereq === "string") {
    text += ` (Prerequisite: ${inlineToHtml(props.prereq.split("~").join(", "))})`;
  }
  if (typeof props.usage === "string") text += ` (${inlineToHtml(props.usage)})`;
  return text;
}

/**
 * One `::ab[...]` directive parsed as structured data rather than rendered
 * inline into surrounding prose — for a caller that needs to promote the
 * ability into a RefData entry of its own (`transform/subdomainPowers.ts`
 * turns each subdomain's replacement power into a `ClassFeature`). `props`
 * is the raw directive property list, so a caller can read the keys this
 * module treats as non-textual metadata (e.g. `replace`, naming the parent
 * power a subdomain power displaces).
 */
export interface PfDataAbility {
  /** Directive label verbatim, ability-type suffix included (e.g. "Sudden Shift (Sp)"). */
  name: string;
  /** The `l=` gate, when the source states one. */
  level?: number;
  /** The ability's prose as a single `<p>` paragraph. */
  bodyHtml: string;
  props: Record<string, string | true>;
}

const USE_MOD_ABILITIES: Record<string, string> = {
  str: "str",
  strength: "str",
  dex: "dex",
  dexterity: "dex",
  con: "con",
  constitution: "con",
  int: "int",
  intelligence: "int",
  wis: "wis",
  wisdom: "wis",
  cha: "cha",
  charisma: "cha",
};

/**
 * The daily-use cap an `::ab[]` directive encodes, as a `uses` block in the
 * same shape `ClassFeature`/`Feat` already carry. `undefined` for an ability
 * with no cap at all (a passive one), which is the majority.
 *
 * The source spells the cap out in three mutually exclusive forms, none of
 * which appears in the rendered prose — an ability capped this way reads as
 * unlimited unless this is folded back in:
 *
 * - `useMod=Wis3` — "3 + your Wisdom modifier times per day", the standard
 *   domain-power cadence. The trailing number is optional (`useMod=Wis` is a
 *   bare "equal to your Wisdom bonus"), and the ability is spelled either
 *   abbreviated or in full (`Cha`/`Charisma`).
 * - `useL=cleric` — "equal to your cleric level".
 * - `useF="8~1~4"` — "once per day at 8th level, plus one additional time per
 *   day for every four levels beyond 8th": `start~base~step`. The companion
 *   `useInc` restates the class and step and adds nothing this needs.
 *
 * `useUnit` names what is being counted (uses, rounds, minutes) and `useNC`
 * flags that they need not be consecutive. Neither changes the number, and a
 * rounds-per-day pool is already modeled as `per: "day"` holding a round
 * count (Rage, Master's Illusion), so both are ignored here.
 *
 * Formulas are emitted against `@class.unlevel` — the granting class's level
 * in the contextual roll data — matching how the vendored pack writes the
 * same caps (Lightning Rod's `floor((@class.unlevel - 4) / 4)` is the
 * `useF="8~1~4"` shape).
 */
export function pfDataAbilityUses(
  props: Record<string, string | true>,
): { maxFormula: string; per: string } | undefined {
  const per = "day";

  const mod = typeof props.useMod === "string" ? /^([A-Za-z]+)(\d*)$/.exec(props.useMod) : null;
  if (mod) {
    const ability = USE_MOD_ABILITIES[mod[1]!.toLowerCase()];
    if (ability) {
      const base = mod[2] ? Number(mod[2]) : 0;
      const modTerm = `@abilities.${ability}.mod`;
      return { maxFormula: base > 0 ? `${base} + ${modTerm}` : modTerm, per };
    }
  }

  if (typeof props.useF === "string") {
    const [start, base, step] = props.useF.split("~").map((n) => Number(n.trim()));
    if (Number.isFinite(base)) {
      if (!Number.isFinite(start) || !Number.isFinite(step) || step! <= 0) {
        return { maxFormula: String(base), per };
      }
      // Clamped because the two Plague listings of Touch of Virulence
      // disagree on the gate level: the one stating none is granted at 1st,
      // where the unclamped formula would go negative.
      return { maxFormula: `max(0, ${base} + floor((@class.unlevel - ${start}) / ${step}))`, per };
    }
  }

  if (typeof props.useL === "string") return { maxFormula: "@class.unlevel", per };

  return undefined;
}

/** Parse a lone `::ab[Name]{...}` line; `null` when the line isn't one, or carries no prose. */
export function parsePfDataAbility(line: string): PfDataAbility | null {
  const m = AB_DIRECTIVE_RE.exec(line.trim());
  if (!m) return null;
  const props = parseDirectiveProps(m[2]!);
  const body = abBodyText(props);
  if (body === undefined) return null;
  const level = typeof props.l === "string" ? Number(props.l) : NaN;
  return {
    name: m[1]!,
    ...(Number.isFinite(level) ? { level } : {}),
    bodyHtml: `<p>${body}</p>`,
    props,
  };
}

function renderAbDirective(name: string | undefined, propsRaw: string): string {
  const props = parseDirectiveProps(propsRaw);
  const title = typeof props.title === "string" ? abTitleName(props.title) : undefined;
  const nameHtml = inlineToHtml(name ?? title ?? "");
  const text = abBodyText(props);

  if (text === undefined) {
    const spellLevelEntries = Object.entries(props)
      .filter((e): e is [string, string] => /^s\d+$/.test(e[0]) && typeof e[1] === "string")
      .map(([k, v]) => ({ level: Number(k.slice(1)), text: v }))
      .sort((a, b) => a.level - b.level);
    if (spellLevelEntries.length > 0) {
      const items = spellLevelEntries
        .map((e) => `Level ${e.level}: ${inlineToHtml(e.text)}`)
        .join("; ");
      return `<p><strong>${nameHtml}:</strong> ${items}</p>`;
    }

    // A level-scaling stat line with no action-type key at all — e.g. a
    // bloodrager bloodline's Watersense: `l8="You gain tremorsense..."
    // l12="...range of 60 feet..."`. Each `lNN` key is the CLASS level a
    // stage comes online at, distinct from the single `l=N` "minimum level
    // to use this ability" gate `abBodyText`'s caller reads off `props.l`.
    const classLevelEntries = Object.entries(props)
      .filter((e): e is [string, string] => /^l\d+$/.test(e[0]) && typeof e[1] === "string")
      .map(([k, v]) => ({ level: Number(k.slice(1)), text: v }))
      .sort((a, b) => a.level - b.level);
    if (classLevelEntries.length > 0) {
      const items = classLevelEntries
        .map((e) => `At ${e.level}${ordinalSuffix(e.level)} level: ${inlineToHtml(e.text)}`)
        .join(" ");
      return `<p><strong>${nameHtml}:</strong> ${items}</p>`;
    }

    return `<p><strong>${nameHtml}</strong></p>`;
  }

  const level = typeof props.l === "string" ? props.l : undefined;
  const label = level ? `${nameHtml} (Level ${level})` : nameHtml;
  return `<p><strong>${label}:</strong> ${text}</p>`;
}

/**
 * Strip the dataset's blockquote (`>`) and fenced-note (`:::label` / `:::`)
 * markup, which this reader doesn't render as a distinct visual block —
 * converting each to plain prose (or a paragraph break, for a bare `>`
 * continuation/fence line) so the surrounding text still reads cleanly instead
 * of leaking raw markup. First exercised by the sorcerer/bloodrager bloodline
 * and shaman-spirit imports, whose "menu of named powers" sections are
 * blockquoted rather than plain paragraphs.
 */
function stripBlockLevelMarkers(lines: string[]): string[] {
  return lines.map((line) => {
    if (line.trim().startsWith(":::")) return "";
    // A `‹SOURCE ...›` citation embedded mid-prose (not just as the entry's
    // OWN leading citation, already handled by `pfDataBodyLines`) — e.g. a
    // nested variant/errata block citing its own book. Blanked rather than
    // left to run into the following line (see `pfDataBodyLines`'s doc
    // comment on why these lines carry no blank separator of their own).
    if (SOURCE_LINE_RE.test(line.trim())) return "";
    const bq = /^>[ \t]?(.*)$/.exec(line);
    return bq ? bq[1]! : line;
  });
}

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

/**
 * An inline (non-leading, see `pfDataBodyLines` for the leading case) markdown
 * header — a section divider like "### Revelations"/"### Bloodline Powers"
 * appearing partway through an entry's prose, first seen in the oracle-
 * mystery/bloodline imports. Rendered as a bold paragraph rather than left as
 * literal "###" text.
 */
const INLINE_HEADER_RE = /^#{2,4}\s+(.+)$/;

function renderBlock(lines: string[]): string {
  if (lines.every(isTableRow)) return renderTable(lines);

  if (lines.length === 1) {
    const aff = AFFLICTION_BLOCK_RE.exec(lines[0]!);
    if (aff) return renderAfflictionBlock(aff[1], aff[2]!);
    const heading = HEADING_DIRECTIVE_RE.exec(lines[0]!);
    if (heading) {
      const extra = heading[2] ? parseDirectiveProps(heading[2]).extra : undefined;
      const suffix = typeof extra === "string" ? ` ${inlineToHtml(extra)}` : "";
      return `<p><strong>${inlineToHtml(heading[1]!)}</strong>${suffix}</p>`;
    }
    if (DIV_DIRECTIVE_RE.test(lines[0]!)) return "";
    const prereq = PREREQ_DIRECTIVE_RE.exec(lines[0]!);
    if (prereq) return renderPrereqDirective(prereq[1]!);
    const list = LIST_DIRECTIVE_RE.exec(lines[0]!);
    if (list) return renderListDirective(list[1]!, list[2]!);
    const ab = AB_DIRECTIVE_RE.exec(lines[0]!);
    if (ab) return renderAbDirective(ab[1], ab[2]!);
    const header = INLINE_HEADER_RE.exec(lines[0]!.trim());
    if (header) return `<p><strong>${inlineToHtml(header[1]!)}</strong></p>`;
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
  return splitIntoBlocks(stripBlockLevelMarkers(lines))
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
