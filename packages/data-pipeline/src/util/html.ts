/**
 * Foundry enrichers — `@Name[args]{Display}` — are authoring shorthand its own
 * renderer expands at display time. Nothing downstream of this pipeline does
 * that, so any enricher left in place is raw syntax a player reads verbatim on
 * their sheet ("+[[1]] Trait bonus to disable traps", "@Distance[20 ft;dual]
 * below you"). This module resolves them to the plain text they stand for.
 */

/**
 * Every `@Name[args]{Display}` enricher, braces optional. Covers `@UUID` and
 * the legacy `@Compendium` link forms alongside the display-only ones
 * (`@Distance`, `@Condition`, `@Toggle`, …).
 */
const ENRICHER_RE = /@([A-Z][A-Za-z]*)\[([^\]]*)\](?:\{([^}]*)\})?/g;

/** Foundry's inline rolls: `[[3]]`, `[[/r 2d6]]`, `[[@item.level + 1]]`. */
const INLINE_ROLL_RE = /\[\[(.+?)\]\]/g;

/**
 * A handful of source entries mistype the closing `]]` (`+[[1] Trait bonus`,
 * `+[[1[[ Trait bonus`). Run only after the well-formed pass has consumed the
 * real ones, so this sees nothing but the typos and the `@`-path rolls it
 * declines to touch anyway.
 */
const MALFORMED_INLINE_ROLL_RE = /\[\[([^[\]]+)(?:\]|\[\[)/g;

/** A leading chat-roll command inside an inline roll (`[[/r 2d6]]`). */
const ROLL_COMMAND_RE = /^\/(?:gm)?r(?:oll)?\s+|^\/b(?:lind)?r(?:oll)?\s+/i;

/**
 * Enrichers that name another compendium document. Braced links use their own
 * display text; bare ones are resolved against the caller's name index (the
 * referenced doc is often outside this dataset's slice) and dropped when
 * unresolvable.
 */
const LINK_ENRICHERS = new Set(["UUID", "Compendium", "Draw"]);

/**
 * Foundry's inline-render directive for another doc (a domain embedding its
 * granted-power items, an archetype embedding one of its own features). The
 * embedded content is already surfaced wherever the referenced doc is itself
 * normalized, so the directive is dropped whole — including any trailing
 * `{Display}` override, which the archetype dataset always writes and which
 * would otherwise leak into the prose as a literal `{...}`.
 */
const DROPPED_ENRICHERS = new Set(["Embed"]);

/** Display flags that carry no text of their own (metric dual-display, chat-card styling, …). */
const NOISE_FLAGS = new Set(["dual", "card", "info", "speaker"]);

/** Unit suffix for the enrichers whose argument is a bare magnitude. */
const ENRICHER_UNIT: Readonly<Record<string, { pattern: RegExp; suffix: string }>> = {
  Distance: { pattern: /\bft\b/i, suffix: " ft." },
  Weight: { pattern: /\blbs?\b/i, suffix: " lbs." },
};

/** Flags that do carry text, in the order they should be appended. */
const FLAG_TEXT: readonly { pattern: RegExp; render: (value: string) => string }[] = [
  { pattern: /^dc\s*=\s*(.+)$/i, render: (v) => ` DC ${v}` },
  { pattern: /^pages?\s*=\s*(.+)$/i, render: (v) => ` p. ${v}` },
];

/**
 * Render a display-only enricher's arguments: the first `;`-separated segment
 * is the value, the rest are flags. Only the flags a player actually needs
 * survive as text — "@Save[will;dc=23]" -> "will DC 23", "@Source[PZO9458;
 * pages=18]" -> "PZO9458 p. 18".
 */
function renderEnricherArgs(name: string, args: string): string {
  const [head = "", ...flags] = args.split(";").map((s) => s.trim());
  const unit = ENRICHER_UNIT[name];
  let text = head;
  if (unit && text !== "") {
    // The argument usually spells its own unit ("30 ft") but not always ("200").
    if (!unit.pattern.test(text)) text += unit.suffix;
    else if (!text.endsWith(".")) text += ".";
  }
  for (const flag of flags) {
    if (NOISE_FLAGS.has(flag.toLowerCase())) continue;
    for (const { pattern, render } of FLAG_TEXT) {
      const m = pattern.exec(flag);
      if (m) text += render(m[1]!.trim());
    }
  }
  return text;
}

/**
 * Resolve a Foundry inline roll to the text it displays. A constant is just
 * its number and a dice expression reads fine on its own, but anything drawing
 * on `@`-paths needs a character to evaluate against and there isn't one here,
 * so those are left in place rather than reduced to a wrong number.
 */
function resolveInlineRoll(expression: string): string | undefined {
  const expr = expression.replace(ROLL_COMMAND_RE, "").trim();
  if (expr === "" || expr.includes("@")) return undefined;
  const constant = /^[+-]?\d+(?:\.\d+)?$/.exec(expr);
  return constant ? String(Number(expr)) : expr;
}

/**
 * Resolve every Foundry enricher and inline roll in `html` to plain display
 * text, so raw authoring syntax never reaches the rendered sheet.
 *
 * `resolveName` looks a compendium doc's name up from the uuid of a bare
 * (unbraced) link.
 */
export function resolveFoundryMarkup(
  html: string,
  resolveName: (uuid: string) => string | undefined,
): string {
  return html
    .replace(ENRICHER_RE, (match, name: string, args: string, display?: string) => {
      if (DROPPED_ENRICHERS.has(name)) return "";
      if (display !== undefined) return display;
      if (LINK_ENRICHERS.has(name)) return resolveName(args.trim()) ?? "";
      return renderEnricherArgs(name, args) || match;
    })
    .replace(INLINE_ROLL_RE, (match, expr: string) => resolveInlineRoll(expr) ?? match)
    .replace(MALFORMED_INLINE_ROLL_RE, (match, expr: string) => resolveInlineRoll(expr) ?? match);
}

/** Strip HTML tags and collapse whitespace into a single readable line. */
export function stripHtml(html: string): string {
  return (
    html
      // Foundry enrichers: @UUID[...]{Display Name} -> Display Name
      .replace(/@UUID\[[^\]]+\]\{([^}]*)\}/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}
