/**
 * The collections this site covers, in display order. The order is load-bearing:
 * a collection's position is its integer code in the encoded index, so appending
 * is safe but reordering silently rewrites every entry's collection.
 */

export const COLLECTIONS = [
  "spells",
  "feats",
  "weapons",
  "armors",
  "items",
  "conditions",
  "monsters",
  "monster-templates",
] as const;

export type CollectionId = (typeof COLLECTIONS)[number];

export const COLLECTION_LABEL: Record<CollectionId, string> = {
  spells: "Spells",
  feats: "Feats",
  weapons: "Weapons",
  armors: "Armor",
  items: "Items",
  conditions: "Conditions",
  monsters: "Monsters",
  "monster-templates": "Templates",
};

/** Singular label for a badge on a single result row. */
export const COLLECTION_BADGE: Record<CollectionId, string> = {
  spells: "Spell",
  feats: "Feat",
  weapons: "Weapon",
  armors: "Armor",
  items: "Item",
  conditions: "Condition",
  monsters: "Monster",
  "monster-templates": "Template",
};

export function isCollectionId(value: string): value is CollectionId {
  return (COLLECTIONS as readonly string[]).includes(value);
}

export function collectionCode(id: CollectionId): number {
  return COLLECTIONS.indexOf(id);
}

export function collectionAt(code: number): CollectionId | undefined {
  return COLLECTIONS[code];
}
