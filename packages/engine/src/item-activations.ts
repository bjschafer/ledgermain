/**
 * Worn magic items that switch on a spell effect when activated, and how much
 * of it they hold per day. Each entry becomes a resource pool while the item is
 * equipped (`resources.ts`), with the spell's vendored buff as its linked
 * Activate toggle.
 *
 * Hand-authored because the vendored items carry nothing to derive it from:
 * Boots of Speed has no `uses` block and no reference to *haste*, only prose.
 * Keyed by item name for the same reason `item-effects.ts` is: the vendored id
 * can shift on a data-pipeline rebuild.
 *
 * Only items whose activation is the whole spell effect on the wearer are
 * listed. At-will items (Ring of Invisibility) have no budget to make a pool
 * from, and items that add more than the buff models (Phoenix Armor's fire
 * shield, Weirding Watch's age resistance) or gate it on a patron deity are
 * left as prose.
 *
 * Durations: an item that states its own (Winged Boots' "up to 5 minutes per
 * flight") carries `rounds`; the rest run for the spell's duration at the
 * item's vendored caster level.
 */

export interface ItemActivationDef {
  /** Name of the vendored spell buff the item activates. */
  buff: string;
  /** Daily budget: rounds for a `"round"` meter, activations for `"use"`. */
  perDay: number;
  /**
   * `"round"`: the budget is spent one round at a time while the buff runs,
   * in any split ("need not be consecutive rounds"). `"use"`: each activation
   * spends one, for the full duration.
   */
  meter: "round" | "use";
  /** Duration in rounds where the item states one instead of the spell's. */
  rounds?: number;
}

export const ITEM_ACTIVATIONS: Readonly<Record<string, ItemActivationDef>> = {
  // CRB p. 503: "act as though affected by a haste spell for up to 10 rounds each day."
  "Boots of Speed": { buff: "Haste", perDay: 10, meter: "round" },
  // CRB p. 504: "fly three times per day for up to 5 minutes per flight."
  "Winged Boots": { buff: "Fly", perDay: 3, meter: "use", rounds: 50 },
  "Celestial Armor": { buff: "Fly", perDay: 1, meter: "use" },
  "Wyvern Cloak": { buff: "Fly", perDay: 1, meter: "use" },
  "Ghost Battling Ring": { buff: "Haste", perDay: 1, meter: "use" },
  "Key of the Second Vault": { buff: "Shield of Faith", perDay: 1, meter: "use" },
  "Mwangi Spirit Shield": { buff: "Bull's Strength", perDay: 1, meter: "use", rounds: 10 },
  "Seafarer's Waders": { buff: "Spider Climb", perDay: 1, meter: "use", rounds: 300 },
  "Cartouche of Distinctive Warding": { buff: "Shield", perDay: 2, meter: "use" },
  "Unfettered Shirt": { buff: "Freedom of Movement", perDay: 1, meter: "use", rounds: 100 },
  "Pirate Lord's Patch": { buff: "See Invisibility", perDay: 1, meter: "use", rounds: 50 },
  "Hand of Glory": { buff: "See Invisibility", perDay: 1, meter: "use" },
  "Cloak of the Crusader": { buff: "Bless", perDay: 1, meter: "use" },
  "Golden Eagle Epaulets": { buff: "Bless", perDay: 1, meter: "use" },
  "Cassock of the Clergy": { buff: "Bless", perDay: 1, meter: "use" },
  "Vambraces of the Genie (Efreeti)": { buff: "Invisibility", perDay: 1, meter: "use" },
  "Cape of Effulgent Escape": { buff: "Invisibility", perDay: 2, meter: "use", rounds: 10 },
  "Sihedron Medallion": { buff: "False Life", perDay: 1, meter: "use" },
};

/** Pool-id prefix for an item activation, so the tracker can tell them apart from manual pools. */
export const ITEM_ACTIVATION_POOL_PREFIX = "item:";

export function itemActivationPoolId(itemId: string): string {
  return `${ITEM_ACTIVATION_POOL_PREFIX}${itemId}`;
}

export function isItemActivationPoolId(id: string): boolean {
  return id.startsWith(ITEM_ACTIVATION_POOL_PREFIX);
}
