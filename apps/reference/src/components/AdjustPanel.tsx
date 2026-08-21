import type { AdjustNote, AdjustOp, StatblockAdjustment } from "../model/adjust/types.js";

/** The lone `crTiers` op on an adjustment, summarized for the picker ("CR +1", "CR +0 to +1"). */
function crHint(adjustment: StatblockAdjustment): string | null {
  const op = adjustment.ops.find(
    (o): o is Extract<AdjustOp, { kind: "crTiers" }> => o.kind === "crTiers",
  );
  if (!op || op.tiers.length === 0) return null;
  const values = op.tiers.map((t) => t.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  return min === max ? `CR ${fmt(min)}` : `CR ${fmt(min)} to ${fmt(max)}`;
}

/** Checkbox list of templates / feat-style adjustments the reader can toggle and stack. */
export function AdjustmentPicker({
  options,
  selected,
  onToggle,
  title,
}: {
  options: readonly StatblockAdjustment[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  title?: string;
}) {
  return (
    <div className="adjust-picker">
      {title && <span className="adjust-picker-title">{title}</span>}
      <ul className="adjust-picker-list">
        {options.map((option) => {
          const hint = crHint(option);
          return (
            <li key={option.key}>
              <label className="adjust-picker-item">
                <input
                  type="checkbox"
                  checked={selected.has(option.key)}
                  onChange={() => onToggle(option.key)}
                />
                <span className="adjust-picker-label">{option.label}</span>
                {hint && <span className="adjust-picker-hint">{hint}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The notes an `applyAdjustments` result carries: manual call-outs read loud, info notes read quiet. */
export function AdjustmentNotes({ notes }: { notes: readonly AdjustNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="adjust-note-list">
      {notes.map((note, i) => (
        <li
          key={`${note.severity}-${i}`}
          className={note.severity === "manual" ? "adjust-note is-manual" : "adjust-note"}
        >
          {note.text}
        </li>
      ))}
    </ul>
  );
}
