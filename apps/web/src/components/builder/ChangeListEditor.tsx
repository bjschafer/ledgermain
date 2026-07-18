import {
  CHANGE_TARGETS,
  CHANGE_TYPES,
  emptyChangeDraft,
  type ChangeDraft,
} from "../../model/changeEditor.js";
import { NumberField } from "./NumberField.js";

/**
 * Editable list of typed-modifier rows (target/type/value), shared by the
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
      {drafts.map((d, i) => (
        <div className="hb-change-row" key={i}>
          <select
            value={d.target}
            aria-label="Bonus target"
            onChange={(e) => update(i, { target: e.target.value })}
          >
            {CHANGE_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={d.type}
            aria-label="Bonus type"
            onChange={(e) => update(i, { type: e.target.value })}
          >
            {CHANGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
      <button type="button" className="btn-ghost" onClick={() => onChange([...drafts, newDraft()])}>
        + Add modifier
      </button>
    </div>
  );
}
