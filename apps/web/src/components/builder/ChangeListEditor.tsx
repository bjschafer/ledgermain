import type { SelectHTMLAttributes } from "react";

import {
  CHANGE_TARGET_GROUPS,
  CHANGE_TYPE_OPTIONS,
  emptyChangeDraft,
  type ChangeDraft,
} from "../../model/changeEditor.js";
import { NumberField } from "./NumberField.js";

/**
 * The "what does this bonus apply to" dropdown, grouped into `<optgroup>`s so
 * a 30-entry list stays scannable. Shared with the tracker's custom-buff form,
 * which is the same authoring decision in a one-row layout.
 */
export function ChangeTargetSelect({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {CHANGE_TARGET_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** The stacking-type dropdown, sharing its option labels with {@link ChangeTargetSelect}'s form. */
export function ChangeTypeSelect({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {CHANGE_TYPE_OPTIONS.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Editable list of typed-modifier rows (applies-to/type/value), shared by the
 * homebrew race/feat/trait editors for their "additional typed bonuses"
 * section. One row per {@link ChangeDraft}; `onChange` receives the whole
 * updated array (the caller owns the draft state, same pattern every other
 * builder form in this app uses).
 *
 * `newDraft` (default {@link emptyChangeDraft}) is what "+ Add modifier"
 * appends — the homebrew trait editor overrides it to default the type to
 * "trait" (every real PF1 trait bonus uses that stacking type; see
 * `@pf1/engine` `traits.ts`'s doc comment) instead of "untyped".
 */
export function ChangeListEditor({
  drafts,
  onChange,
  newDraft = emptyChangeDraft,
}: {
  drafts: readonly ChangeDraft[];
  onChange: (next: ChangeDraft[]) => void;
  newDraft?: () => ChangeDraft;
}) {
  function update(index: number, patch: Partial<ChangeDraft>) {
    onChange(drafts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }
  function remove(index: number) {
    onChange(drafts.filter((_, i) => i !== index));
  }

  return (
    <div className="hb-field">
      {drafts.length > 0 && (
        <div className="hb-change-row hb-change-head" aria-hidden="true">
          <span>Applies to</span>
          <span>Bonus type</span>
          <span>Amount</span>
          <span />
        </div>
      )}
      {drafts.map((d, i) => (
        <div className="hb-change-row" key={i}>
          <ChangeTargetSelect
            value={d.target}
            aria-label="Bonus applies to"
            onChange={(target) => update(i, { target })}
          />
          <ChangeTypeSelect
            value={d.type}
            aria-label="Bonus type"
            onChange={(type) => update(i, { type })}
          />
          <NumberField
            className="num"
            size={3}
            value={d.value}
            onCommit={(n) => update(i, { value: n })}
            aria-label="Bonus value"
          />
          <button type="button" className="btn-ghost" onClick={() => remove(i)}>
            Remove
          </button>
        </div>
      ))}
      {drafts.length > 0 && (
        <span className="hb-field-label">
          A negative amount is a penalty. Two bonuses of the same type don't add up: the higher one
          applies. Untyped, dodge, and circumstance bonuses do add up.
        </span>
      )}
      <button type="button" className="btn-ghost" onClick={() => onChange([...drafts, newDraft()])}>
        + Add modifier
      </button>
    </div>
  );
}
