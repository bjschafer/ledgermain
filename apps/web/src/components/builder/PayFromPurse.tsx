/**
 * The one purchase control, rendered at the top of every add flow in the
 * build: "Pay from purse", plus what the character is carrying.
 *
 * Every picker shows the same row, wired to the same preference
 * (`state/payFromPurse.ts`), so buying a potion, a kit, a suit of plate, and a
 * longsword all behave the same way. {@link usePurchase} is the other half:
 * it adds the thing, pays for it when the toggle is on, and says what
 * happened.
 */
import type { CharacterDoc } from "@pf1/schema";

import { addPaying, formatGp, type Quote, purseGp } from "../../model/purchase.js";
import { usePayFromPurse } from "../../state/payFromPurse.js";
import { showToast } from "../../state/toast.js";

export function PayFromPurse({ doc }: { doc: CharacterDoc }) {
  const [pay, setPay] = usePayFromPurse();
  return (
    <div className="picker-controls">
      <label className="check">
        <input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} />
        <span>Pay from purse</span>
      </label>
      <span className="purse-note">carrying {formatGp(purseGp(doc))} gp</span>
    </div>
  );
}

/**
 * A quote in a picker row: what the thing costs as configured, and what the
 * number leaves out. Renders nothing when the data prices nothing.
 */
export function PriceTag({ quote }: { quote: Quote }) {
  if (quote.gp == null) return null;
  return (
    <span>
      {formatGp(quote.gp)} gp
      {quote.caveat ? <span className="soft"> ({quote.caveat})</span> : null}
    </span>
  );
}

export interface PurchaseRequest {
  /** What was gained, for the receipt. */
  name: string;
  quote: Quote;
  add: (doc: CharacterDoc) => CharacterDoc;
  /** Receipt verb. "bought" unless the item was made rather than bought. */
  verb?: "bought" | "crafted";
  /** Report even when nothing was paid. Crafting always reports; buying stays quiet. */
  alwaysAnnounce?: boolean;
}

/** The label an add button should carry: buying is a different act from adding. */
export function addLabel(pay: boolean, quote: Quote): string {
  return pay && quote.gp != null ? "Buy" : "Add";
}

/**
 * Returns `purchase(request)`: apply an add, pay for it when the player asked
 * to, and toast the receipt.
 *
 * The receipt is the only place a shortfall or an incomplete quote surfaces,
 * so it stays specific: what was gained, what it cost, and what the price
 * left out.
 */
export function usePurchase(update: (fn: (doc: CharacterDoc) => CharacterDoc) => void) {
  const [pay] = usePayFromPurse();

  return function purchase({ name, quote, add, verb = "bought", alwaysAnnounce }: PurchaseRequest) {
    let short = false;
    let paid: number | undefined;
    update((d) => {
      const result = addPaying(d, add, quote.gp, pay);
      short = result.short;
      paid = result.paid;
      return result.doc;
    });

    const aside = quote.caveat ? ` (${quote.caveat})` : "";
    if (short && quote.gp != null) {
      showToast({
        message: `${name} added, but there wasn't ${formatGp(quote.gp)} gp to pay for it${aside}`,
      });
      return;
    }
    if (paid != null) {
      showToast({ message: `${name} ${verb} for ${formatGp(paid)} gp${aside}` });
      return;
    }
    if (pay && quote.gp == null) {
      showToast({ message: `${name} added. Nothing in the rules data prices it, so it was free.` });
      return;
    }
    if (alwaysAnnounce) showToast({ message: `${name} ${verb}${aside}` });
  };
}
