/**
 * Foundry compendium UUIDs look like:
 *   Compendium.pf1.<pack>.Item.<foundryId>
 * The `<foundryId>` is the document `_id` (and the filename suffix).
 */
export interface ParsedUuid {
  pack: string;
  id: string;
}

const UUID_RE = /^Compendium\.pf1\.([^.]+)\.Item\.([^.]+)$/;

export function parseUuid(uuid: string): ParsedUuid | null {
  const m = UUID_RE.exec(uuid.trim());
  if (!m) return null;
  return { pack: m[1]!, id: m[2]! };
}

export function makeUuid(pack: string, id: string): string {
  return `Compendium.pf1.${pack}.Item.${id}`;
}
