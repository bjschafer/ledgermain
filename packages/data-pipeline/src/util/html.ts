const UUID_LINK_RE = /@UUID\[([^\]]+)\](?:\{([^}]*)\})?/g;
const EMBED_RE = /@Embed\[[^\]]+\]/g;

/**
 * Resolve Foundry `@UUID[...]` enrichers to plain display text: braced links
 * (`@UUID[...]{Name}`) use their own display name; bare links are resolved
 * against `resolveName` (a lookup over every compendium doc, since the
 * referenced item is often outside this dataset's slice) and dropped if
 * unresolvable. Also strips `@Embed[...]` enrichers (Foundry's inline-render
 * directive for another doc, e.g. a domain's description embedding its own
 * granted-power items) — the embedded content is already surfaced separately
 * wherever the referenced doc is itself normalized, so the raw enricher would
 * otherwise leak into the rendered prose.
 */
export function resolveUuidLinks(
  html: string,
  resolveName: (uuid: string) => string | undefined,
): string {
  return html
    .replace(EMBED_RE, "")
    .replace(UUID_LINK_RE, (_match, uuid: string, display?: string) => {
      if (display) return display;
      return resolveName(uuid.trim()) ?? "";
    });
}

/** Strip HTML tags and collapse whitespace into a single readable line. */
export function stripHtml(html: string): string {
  return html
    // Foundry enrichers: @UUID[...]{Display Name} -> Display Name
    .replace(/@UUID\[[^\]]+\]\{([^}]*)\}/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
