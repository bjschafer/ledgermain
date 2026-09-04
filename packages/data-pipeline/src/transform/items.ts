import type { Item, ItemContent } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  normalizeUses,
  readPrice,
  readWeight,
  type UuidResolver,
} from "./common.js";

/**
 * The container a doc is packed inside, if any. Docs carrying this are copies
 * held by a container (36 separate "Torch" docs, one per kit that packs one),
 * never catalog entries in their own right — emitting them would put 600
 * duplicates in front of anyone browsing gear.
 */
export function packedInsideContainer(doc: RawDoc): string | undefined {
  const flags = (doc.flags ?? {}) as Record<string, unknown>;
  const pf1 = (flags.pf1 ?? {}) as Record<string, unknown>;
  return typeof pf1.container === "string" ? pf1.container : undefined;
}

/**
 * A container's contents, built from the sibling docs that name it in
 * `flags.pf1.container`. They used to be embedded under `system.items` with a
 * `_stats.compendiumSource` link back to the catalog entry they copy; the pack
 * rewrite that landed after v11.11 promoted them to standalone docs and
 * dropped that link, so the catalog entry is recovered by name instead
 * (`itemIdByName`, built over the catalog docs only). An entry that resolves to
 * nothing keeps a weight/price snapshot, the same fallback the one genuine
 * cross-pack case has always used (the Vampire Slayer's Kit's wooden stake).
 *
 * Deliberately non-recursive: a packed container stays one entry.
 */
export function buildContainerContents(
  children: RawDoc[],
  /** Catalog item ids keyed by lowercased name. */
  itemIdByName: ReadonlyMap<string, string>,
): ItemContent[] {
  const entries: ItemContent[] = [];
  for (const child of children) {
    const name = child.name;
    if (typeof name !== "string" || name === "") continue;

    const sys = (child.system ?? {}) as Record<string, unknown>;
    const itemId = itemIdByName.get(name.toLowerCase());

    const entry: ItemContent = { name };
    if (itemId) entry.itemId = itemId;

    const quantity = asNumber(sys.quantity);
    if (quantity != null && quantity !== 1) entry.quantity = quantity;

    // Only unlinked entries need a snapshot; a linked one resolves both off
    // `RefData.items[itemId]` at expand time.
    if (!itemId) {
      const weight = readWeight(sys.weight);
      if (weight != null) entry.weight = weight;
      const price = readPrice(sys.price);
      if (price != null) entry.price = price;
    }

    entries.push(entry);
  }
  return entries;
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
    price: readPrice(sys.price),
    weight: readWeight(sys.weight),
    cl: asNumber(sys.cl),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    uses: normalizeUses(sys.uses),
    aura: aura && typeof aura.school === "string" ? { school: aura.school } : undefined,
  };
}
