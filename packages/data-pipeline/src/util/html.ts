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
