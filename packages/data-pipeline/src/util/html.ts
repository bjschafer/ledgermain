const UUID_LINK_RE = /@UUID\[([^\]]+)\](?:\{([^}]*)\})?/g;

/**
 * Resolve Foundry `@UUID[...]` enrichers to plain display text: braced links
 * (`@UUID[...]{Name}`) use their own display name; bare links are resolved
 * against `resolveName` (a lookup over every compendium doc, since the
 * referenced item is often outside this dataset's slice) and dropped if
 * unresolvable.
 */
export function resolveUuidLinks(
  html: string,
  resolveName: (uuid: string) => string | undefined,
): string {
  return html.replace(UUID_LINK_RE, (_match, uuid: string, display?: string) => {
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
