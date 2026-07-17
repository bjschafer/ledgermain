/**
 * Class kits and pre-packed bundles (issue #80).
 *
 * PF1 sells starting gear as kits ("Kit, Wizard's" — backpack, bedroll, ink,
 * 10 torches, ...). Adding those a dozen rows at a time is the most tedious
 * part of a first-level build, so a kit expands to its constituent gear in one
 * action.
 *
 * The kit itself is *never* added alongside its contents: a container's listed
 * weight and price already account for what's inside it, so carrying both would
 * double-count both totals. Expanding replaces the kit rather than filling it.
 */
import type { CharacterDoc, Item, ItemInstance, RefData } from "@pf1/schema";

/** A vendored item that packs other items — i.e. one worth offering to expand. */
export interface Kit extends Item {
  contents: NonNullable<Item["contents"]>;
}

export function isKit(item: Item): item is Kit {
  return (item.contents?.length ?? 0) > 0;
}

/** Every expandable container in the vendored data, sorted by display name. */
export function listKits(refData: RefData): Kit[] {
  return Object.values(refData.items)
    .filter(isKit)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The gear rows a kit expands into.
 *
 * Linked entries keep only their `itemId` (plus a non-default quantity) so
 * weight/price stay live against the vendored data — the same fallback every
 * other RefData-linked gear row relies on. Unlinked entries (a kit packing
 * something outside the items pack, e.g. the Vampire Slayer's Kit's wooden
 * stake) carry the name/weight/price snapshot the pipeline captured instead.
 *
 * `equipped` is true to match every other gear-add path, where it doubles as
 * "carried, not left behind" for the encumbrance total.
 */
export function kitContents(kit: Kit): ItemInstance[] {
  return kit.contents.map((entry) => {
    const inst: ItemInstance = { equipped: true };
    if (entry.itemId) {
      inst.itemId = entry.itemId;
    } else {
      inst.name = entry.name;
      if (entry.weight != null) inst.weight = entry.weight;
      if (entry.price != null) inst.price = entry.price;
    }
    if (entry.quantity != null && entry.quantity !== 1) inst.quantity = entry.quantity;
    return inst;
  });
}

/**
 * Append a kit's contents to gear. A `kitId` that isn't a known kit is a no-op,
 * so the UI can call this straight from a click handler.
 */
export function addKit(doc: CharacterDoc, kitId: string, refData: RefData): CharacterDoc {
  const item = refData.items[kitId];
  if (!item || !isKit(item)) return doc;
  const gear = [...doc.build.gear, ...kitContents(item)];
  return { ...doc, build: { ...doc.build, gear } };
}
