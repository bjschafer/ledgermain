import { useState } from "react";

import { type GearDetails } from "../../../model/doc.js";
import { NumberField } from "../NumberField.js";

/**
 * Inline editor for any gear row that isn't worn armor (which gets the richer
 * {@link ArmorForm}) — vendored items, generated consumables, and free-text
 * custom entries alike. Every field is an override: leaving weight / price /
 * max charges at 0 means "whatever the vendored item says", so a RefData-linked
 * row keeps tracking the reference until the player deliberately types over it.
 * `refMeta` describes those inherited values so the 0s aren't read as "weighs
 * nothing".
 */
export function GearForm({
  initial,
  refMeta,
  onSave,
  onCancel,
}: {
  initial: GearDetails;
  refMeta: { weight?: number; price?: number; charges?: number };
  onSave: (details: GearDetails) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GearDetails>(initial);

  function field<K extends keyof GearDetails>(key: K, val: GearDetails[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const inherited = (value: number | undefined, unit: string) =>
    value ? `from item data: ${value}${unit}` : "0 = none";
  const maxCharges = form.charges || refMeta.charges || 0;

  return (
    <div className="gear-armor-form">
      <div className="gear-armor-head">
        <span className="eyebrow">Edit Item</span>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="gear-armor-grid">
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={form.name}
            autoFocus
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Quantity</span>
          <NumberField
            value={form.quantity}
            min={0}
            max={99999}
            commitOnChange
            onCommit={(n) => field("quantity", n)}
            aria-label="Quantity"
          />
        </label>
        <label className="field">
          <span>Unit weight (lb)</span>
          <input
            type="number"
            value={form.weight}
            min={0}
            step={0.1}
            title={inherited(refMeta.weight, " lb")}
            onChange={(e) => field("weight", Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Unit price (gp)</span>
          <input
            type="number"
            value={form.price}
            min={0}
            step={0.01}
            title={inherited(refMeta.price, " gp")}
            onChange={(e) => field("price", Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Max charges</span>
          <input
            type="number"
            value={form.charges}
            min={0}
            max={99999}
            title={inherited(refMeta.charges, " charges")}
            onChange={(e) => field("charges", Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Charges used</span>
          <NumberField
            value={form.chargesUsed}
            min={0}
            max={maxCharges || 99999}
            commitOnChange
            onCommit={(n) => field("chargesUsed", n)}
            aria-label="Charges used"
          />
        </label>
      </div>
      <p className="hint">
        Weight, price, and max charges fall back to the reference item when left at 0. A 50-charge
        wand with 3 used reads “47 remaining”.
      </p>
      <button
        type="button"
        className="pick-btn add"
        disabled={!form.name.trim()}
        onClick={() => onSave(form)}
      >
        Save changes
      </button>
    </div>
  );
}
