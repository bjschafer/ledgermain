/**
 * What an add costs, so every "+ Add ..." in the build can offer to pay for it.
 *
 * The purse (`live.money`) was previously spent only by the consumables
 * crafting flow; everything else appeared for free, which reads as a bug the
 * first time a player buys a potion. This module is the one place that answers
 * "what would that cost?", for each of the five things a build can gain:
 * a vendored item, a kit, a generated consumable, a free-text custom entry,
 * and a configured armor/shield or weapon.
 *
 * ### Pricing (PF1 Core Rulebook, Magic Items)
 *
 * A configured suit or weapon is priced from its parts, since the vendored
 * data only carries the mundane base:
 *
 * - masterwork: +150 gp for armor or a shield, +300 gp for a weapon, and a
 *   magic enhancement bonus implies it (so it is charged either way).
 * - enhancement: the *total* bonus (the numeric enhancement plus every special
 *   ability priced as a bonus equivalent) squared, times 1,000 gp for armor and
 *   shields or 2,000 gp for weapons. Squaring the combined total is the whole
 *   point of the rule: a +1 shadow suit is priced as +2.
 * - special abilities priced in flat gp are added on top and consume no bonus
 *   budget.
 *
 * ### What is deliberately not priced
 *
 * Special materials (mithral, adamantine, cold iron, ...). The vendored data
 * carries no price for them and their real surcharges are per weight class or
 * per pound, so a quote for a special-material item says so rather than
 * quietly charging the steel price. {@link Quote.caveat} carries that sentence
 * to the picker.
 */
import type { ArmorRef, CharacterDoc, Item, WeaponRef } from "@pf1/schema";

import type { AbilityCatalog } from "./abilities.js";
import { spendMoney } from "./doc.js";
import type { Kit } from "./kits.js";

/** A price to show next to an add, and what the number leaves out. */
export interface Quote {
  /** Market price in gp, or `null` when nothing in the data prices it. */
  gp: number | null;
  /** Why `gp` is knowably low, in player language. Absent when the quote is complete. */
  caveat?: string;
}

const UNPRICED: Quote = { gp: null };

/** Masterwork surcharge by what is being made. */
const MASTERWORK_COST = { armor: 150, shield: 150, weapon: 300 } as const;

/** gp per point of (total enhancement bonus)². */
const ENHANCEMENT_COST = { armor: 1000, shield: 1000, weapon: 2000 } as const;

const MATERIAL_CAVEAT = "special material not priced";

type Craftable = keyof typeof MASTERWORK_COST;

/** A vendored item, at its listed price. */
export function itemQuote(item: Item | undefined, quantity = 1): Quote {
  if (!item || item.price == null) return UNPRICED;
  return { gp: item.price * quantity };
}

/**
 * A kit at its own listed price, or the sum of what it packs.
 *
 * A container's own price is supposed to cover its contents (which is why
 * `addKit` never adds the kit row itself), but the vendored kits carry a price
 * of 0 and hold their value in the linked items instead, so the contents are
 * totted up whenever the kit itself is priced at nothing. A packed row prices
 * like any other gear row: its own snapshot first, then the item it links to.
 */
export function kitQuote(kit: Kit, items: Record<string, Item>): Quote {
  if (kit.price != null && kit.price > 0) return { gp: kit.price };
  let total = 0;
  let priced = false;
  for (const entry of kit.contents) {
    const price = entry.price ?? (entry.itemId ? items[entry.itemId]?.price : undefined);
    if (price == null) continue;
    priced = true;
    total += price * (entry.quantity ?? 1);
  }
  return priced ? { gp: total } : UNPRICED;
}

/** A free-text custom entry, at the price and quantity the player typed. */
export function customQuote(price: number, quantity = 1): Quote {
  if (!(price > 0)) return UNPRICED;
  return { gp: price * Math.max(0, quantity) };
}

/** How a suit or weapon was configured in the picker. */
export interface BuildOptions {
  enhancement?: number;
  masterwork?: boolean;
  /** Material id from `model/materials.ts`; anything but steel makes the quote incomplete. */
  material?: string;
  /** Selected ability ids, resolved against `catalog` for their cost. */
  abilities?: readonly string[];
}

/**
 * Price a configured armor/shield or weapon: mundane base, plus masterwork,
 * plus the squared-total enhancement surcharge, plus flat-priced abilities.
 * Returns an unpriced quote when the base itself has no listed price, since a
 * surcharge on an unknown number is not a price.
 */
function buildQuote(
  base: number | undefined,
  kind: Craftable,
  opts: BuildOptions,
  catalog: AbilityCatalog,
): Quote {
  if (base == null) return UNPRICED;
  const enhancement = Math.max(0, Math.trunc(opts.enhancement ?? 0));
  const magic = enhancement > 0;

  let bonusTotal = enhancement;
  let flat = 0;
  for (const id of opts.abilities ?? []) {
    const option = catalog.options.find((o) => o.id === id);
    if (!option) continue;
    if (option.cost != null) bonusTotal += option.cost;
    if (option.price != null) flat += option.price;
  }

  const masterwork = magic || opts.masterwork === true ? MASTERWORK_COST[kind] : 0;
  const gp = base + masterwork + bonusTotal * bonusTotal * ENHANCEMENT_COST[kind] + flat;
  const material = opts.material && opts.material !== "steel";
  return material ? { gp, caveat: MATERIAL_CAVEAT } : { gp };
}

/** Price an armor or shield as configured in the gear picker. */
export function armorQuote(ref: ArmorRef, opts: BuildOptions, catalog: AbilityCatalog): Quote {
  return buildQuote(ref.price, ref.slot === "shield" ? "shield" : "armor", opts, catalog);
}

/** Price a weapon as configured in the weapons picker. */
export function weaponQuote(ref: WeaponRef, opts: BuildOptions, catalog: AbilityCatalog): Quote {
  return buildQuote(ref.price, "weapon", opts, catalog);
}

/** `1650` -> `"1,650"`, and `12.5` -> `"12.5"` — prices run from copper to kingdoms. */
export function formatGp(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, fraction] = String(rounded).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/** Total purse value in gp, for the "carrying X gp" readout. */
export function purseGp(doc: CharacterDoc): number {
  const m = doc.live.money ?? {};
  return (m.pp ?? 0) * 10 + (m.gp ?? 0) + (m.sp ?? 0) / 10 + (m.cp ?? 0) / 100;
}

/** What {@link addPaying} did, so the caller can say it out loud. */
export interface PaymentResult {
  doc: CharacterDoc;
  /** The purse couldn't cover it. The add still happened. */
  short: boolean;
  /** How much was actually taken, absent when nothing was. */
  paid?: number;
}

/**
 * Apply `add`, then take `gp` out of the purse when the player asked to pay.
 *
 * Too little coin never blocks the add: the item is still gained and the
 * shortfall is reported, because a build entered out of order (gear before
 * starting wealth) is normal and losing the add would be the worse failure.
 */
export function addPaying(
  doc: CharacterDoc,
  add: (doc: CharacterDoc) => CharacterDoc,
  gp: number | null,
  pay: boolean,
): PaymentResult {
  const next = add(doc);
  if (!pay || gp == null || gp <= 0) return { doc: next, short: false };
  const paid = spendMoney(next, gp);
  if (!paid) return { doc: next, short: true };
  return { doc: paid, short: false, paid: gp };
}
