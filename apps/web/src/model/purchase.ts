/**
 * What an add costs, so every "+ Add ..." in the build can offer to pay for it.
 *
 * The purse (`live.money`) pays for every build addition, not just the
 * consumables crafting flow: an addition that appeared for free would read as
 * a bug the first time a player buys a potion. This module is the one place
 * that answers "what would that cost?", for each of the five things a build
 * can gain: a vendored item, a kit, a generated consumable, a free-text custom
 * entry, and a configured armor/shield or weapon.
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
 * - special materials (Core Rulebook and Ultimate Equipment, Special
 *   Materials): mithral and adamantine by armor weight class, shield, or
 *   weapon (mithral weapons at 500 gp/lb), both with masterwork included;
 *   darkwood at 10 gp/lb on top of masterwork; alchemical silver by
 *   handedness; cold iron at double the base, plus 2,000 gp once enchanted.
 *
 * A material whose published price keys off something the data does not
 * carry (an adamantine shield, a silvered ranged weapon, an item with no
 * listed weight) is quoted without its surcharge and says so through
 * {@link Quote.caveat}, rather than quietly charging the steel price.
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

/** Body-armor surcharge by weight class (1 light, 2 medium, 3 heavy). */
const MITHRAL_ARMOR: Partial<Record<number, number>> = { 1: 1000, 2: 4000, 3: 9000 };
const ADAMANTINE_ARMOR: Partial<Record<number, number>> = { 1: 5000, 2: 10000, 3: 15000 };
/** Alchemical silver by `WeaponRef.weaponSubtype`. */
const SILVER_WEAPON: Partial<Record<string, number>> = { light: 20, "1h": 90, "2h": 180 };

/** The base-item facts a material's price is keyed by. */
interface Craft {
  price?: number;
  weight?: number;
  weightClass?: number;
  weaponSubtype?: string;
}

interface MaterialCost {
  gp: number;
  /** Mithral and adamantine include masterwork; darkwood is priced on top of it. */
  masterwork: "included" | "required" | "optional";
}

/** A material's surcharge, or `null` when the published price keys off something unknown. */
function materialCost(
  material: string,
  kind: Craftable,
  item: Craft,
  base: number,
  enchanted: boolean,
): MaterialCost | null {
  const priced = (gp: number | undefined, masterwork: MaterialCost["masterwork"]) =>
    gp == null ? null : { gp, masterwork };
  switch (material) {
    case "mithral":
      if (kind === "shield") return priced(1000, "included");
      if (kind === "armor") return priced(MITHRAL_ARMOR[item.weightClass ?? 0], "included");
      return priced(item.weight == null ? undefined : 500 * item.weight, "included");
    case "adamantine":
      if (kind === "weapon") return priced(3000, "included");
      if (kind === "armor") return priced(ADAMANTINE_ARMOR[item.weightClass ?? 0], "included");
      return null;
    case "darkwood":
      return priced(item.weight == null ? undefined : 10 * item.weight, "required");
    case "silver":
      return kind === "weapon" ? priced(SILVER_WEAPON[item.weaponSubtype ?? ""], "optional") : null;
    case "cold-iron":
      return priced(base + (enchanted ? 2000 : 0), "optional");
    default:
      return null;
  }
}

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
  /** Material id from `model/materials.ts`. */
  material?: string;
  /** Selected ability ids, resolved against `catalog` for their cost. */
  abilities?: readonly string[];
}

/**
 * Price a configured armor/shield or weapon: mundane base, plus masterwork,
 * plus the squared-total enhancement surcharge, plus flat-priced abilities,
 * plus any special material. Returns an unpriced quote when the base itself
 * has no listed price, since a surcharge on an unknown number is not a price.
 */
function buildQuote(
  item: Craft,
  kind: Craftable,
  opts: BuildOptions,
  catalog: AbilityCatalog,
): Quote {
  const base = item.price;
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

  const special = opts.material && opts.material !== "steel" ? opts.material : undefined;
  const material = special
    ? materialCost(special, kind, item, base, bonusTotal > 0 || flat > 0)
    : undefined;
  const wantsMasterwork = magic || opts.masterwork === true || material?.masterwork === "required";
  const masterwork =
    wantsMasterwork && material?.masterwork !== "included" ? MASTERWORK_COST[kind] : 0;
  const gp =
    base +
    masterwork +
    bonusTotal * bonusTotal * ENHANCEMENT_COST[kind] +
    flat +
    (material?.gp ?? 0);
  return material === null ? { gp, caveat: MATERIAL_CAVEAT } : { gp };
}

/** Price an armor or shield as configured in the gear picker. */
export function armorQuote(ref: ArmorRef, opts: BuildOptions, catalog: AbilityCatalog): Quote {
  return buildQuote(ref, ref.slot === "shield" ? "shield" : "armor", opts, catalog);
}

/** Price a weapon as configured in the weapons picker. */
export function weaponQuote(ref: WeaponRef, opts: BuildOptions, catalog: AbilityCatalog): Quote {
  return buildQuote(ref, "weapon", opts, catalog);
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
