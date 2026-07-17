import type { Item, ItemContent } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid, parseUuid } from "../util/uuid.js";
import {
  asNumber,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  normalizeUses,
  readWeight,
  type UuidResolver,
} from "./common.js";

/**
 * Foundry models a container's contents as embedded copies of the packed items,
 * each carrying a `compendiumSource` UUID back to the canonical entry. We keep
 * the link when it points into the `items` pack and snapshot the embedded copy
 * otherwise (the sole cross-pack case today is a weapon — see `ItemContent`).
 * Deliberately non-recursive: a packed container stays one entry.
 */
function normalizeContents(value: unknown): ItemContent[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const entries: ItemContent[] = [];

  for (const raw of Object.values(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const child = raw as Record<string, unknown>;
    const name = child.name;
    if (typeof name !== "string" || name === "") continue;

    const sys = (child.system ?? {}) as Record<string, unknown>;
    const stats = (child._stats ?? {}) as Record<string, unknown>;
    const source = typeof stats.compendiumSource === "string" ? stats.compendiumSource : "";
    const parsed = source ? parseUuid(source) : null;
    const itemId = parsed?.pack === "items" ? parsed.id : undefined;

    const entry: ItemContent = { name };
    if (itemId) entry.itemId = itemId;

    const quantity = asNumber(sys.quantity);
    if (quantity != null && quantity !== 1) entry.quantity = quantity;

    // Only unlinked entries need a snapshot; a linked one resolves both off
    // `RefData.items[itemId]` at expand time.
    if (!itemId) {
      const weight = readWeight(sys.weight);
      if (weight != null) entry.weight = weight;
      const price = asNumber(sys.price);
      if (price != null) entry.price = price;
    }

    entries.push(entry);
  }

  return entries.length > 0 ? entries : undefined;
}

export function transformItem(doc: RawDoc, resolveUuid: UuidResolver): Item {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const aura = sys.aura as Record<string, unknown> | undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("items", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    slot: typeof sys.slot === "string" ? sys.slot : undefined,
    price: asNumber(sys.price),
    weight: readWeight(sys.weight),
    cl: asNumber(sys.cl),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    uses: normalizeUses(sys.uses),
    aura: aura && typeof aura.school === "string" ? { school: aura.school } : undefined,
    contents: normalizeContents(sys.items),
  };
}
