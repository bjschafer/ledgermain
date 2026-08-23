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

/** Toggle grid of templates / feat-style adjustments the reader can stack. */
export function AdjustmentPicker({
  options,
  selected,
  onToggle,
  title,
  hint,
  disabled,
}: {
  options: readonly StatblockAdjustment[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  title?: string;
  /** Quiet aside next to the group title ("stack freely", "pick one"). */
  hint?: string;
  /** Options this creature can't take, keyed to the reason shown on hover. */
  disabled?: ReadonlyMap<string, string>;
}) {
  return (
    <div className="adjust-picker">
      {title && (
        <div className="adjust-picker-head">
          <span className="adjust-picker-title">{title}</span>
          {hint && <span className="adjust-picker-hint">{hint}</span>}
        </div>
      )}
      <div className="adjust-picker-grid">
        {options.map((option) => {
          const cr = crHint(option);
          const on = selected.has(option.key);
          const why = disabled?.get(option.key);
          const classes = ["adjust-option"];
          if (on) classes.push("is-on");
          if (why) classes.push("is-disabled");
          return (
            <label
              key={option.key}
              className={classes.join(" ")}
              title={why ? `${option.label}: ${why}.` : option.notes?.join(" ")}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={why !== undefined && !on}
                onChange={() => onToggle(option.key)}
              />
              <span className="adjust-option-box" aria-hidden="true" />
              <span className="adjust-option-label">{option.label}</span>
              {cr && <span className="adjust-option-cr">{cr}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The notes an `applyAdjustments` result carries: manual call-outs read loud,
 * info notes read quiet. Stacked templates repeat each other's standing
 * caveats, so identical lines are printed once.
 */
export function AdjustmentNotes({ notes }: { notes: readonly AdjustNote[] }) {
  const seen = new Set<string>();
  const unique = notes.filter((note) => {
    const key = `${note.severity}|${note.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return null;
  return (
    <ul className="adjust-note-list">
      {unique.map((note, i) => (
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
