import { useEffect, useState } from "react";

/**
 * Base props for {@link NumberField}. Every numeric control in the app renders
 * through this component so that builder fields, tracker fields, and the
 * class-level / ability-increase steppers all share one visual language: a
 * bordered pill with `−` / `+` buttons flanking an editable value.
 */
type BaseProps = {
  /** Inclusive lower bound; also disables the `−` button when reached. */
  min?: number;
  /** Inclusive upper bound; also disables the `+` button when reached. */
  max?: number;
  /** Increment applied by the `−` / `+` buttons and arrow keys (default 1). */
  step?: number;
  /** Input width in `ch` units (default 4). Ignored when a `className` width rule applies. */
  size?: number;
  /** Shown when the field is empty (only meaningful with `allowEmpty`). */
  placeholder?: string;
  /** Applied to the underlying `<input>` (e.g. `"num"` for the mono font). */
  className?: string;
  "aria-label"?: string;
  /** Render the `−` / `+` buttons (default `true`). Set `false` for tight or ∞-semantic fields. */
  stepper?: boolean;
  /** Disable the entire field. */
  disabled?: boolean;
  /**
   * Stretch the pill to fill its container, with the value flexing between the
   * `−` / `+` buttons. Use for prominent cells (e.g. ability scores) where a
   * shrink-wrapped pill would look lost.
   */
  block?: boolean;
  /**
   * Render the value as a non-editable label (no `<input>`) — the `−` / `+`
   * buttons remain the only way to change it. Used for counters that should
   * not be free-typed (e.g. class level).
   */
  readOnly?: boolean;
  /** Disable only the `+` button (e.g. a shared budget exhausted elsewhere). */
  plusDisabled?: boolean;
  /** Disable only the `−` button. */
  minusDisabled?: boolean;
  /**
   * Commit on every keystroke instead of on blur/Enter. Use for transient,
   * un-clamped local state (HP damage amount, stepper-only counters) where the
   * "clamp mid-edit" problem does not apply.
   */
  commitOnChange?: boolean;
};

/** Variant whose value is always a concrete number (the common case). */
type RequiredProps = BaseProps & {
  value: number;
  onCommit: (n: number) => void;
  allowEmpty?: false;
};

/** Variant whose value may be empty/`undefined` (e.g. buff rounds = ∞). */
type OptionalProps = BaseProps & {
  value: number | undefined;
  onCommit: (n: number | undefined) => void;
  allowEmpty: true;
};

export type NumberFieldProps = RequiredProps | OptionalProps;

/**
 * A controlled numeric input rendered as a `− value +` stepper pill.
 *
 * Typing edits freely while focused; the value commits to the parent on blur or
 * Enter (or on every keystroke when `commitOnChange` is set). This avoids the
 * "clamp on every keystroke" problem where deleting a digit mid-edit snaps the
 * value to the min/max before the user can finish typing. The `−` / `+` buttons
 * and arrow keys commit immediately, clamped to `[min, max]`.
 *
 * The committed value is `Number(raw)` — NaN (non-numeric text) becomes 0, so
 * the model layer is responsible for any further clamping (1–50 for abilities,
 * 0–maxRank for skills, etc.). When `allowEmpty` is set, an empty field commits
 * `undefined` instead (used for "infinite" buff durations).
 *
 * When `value` changes externally (e.g. maxRank drops due to a class removal)
 * the local display resyncs to the new value.
 */
export function NumberField(props: NumberFieldProps) {
  const {
    value,
    min,
    max,
    step = 1,
    size = 4,
    placeholder,
    className,
    "aria-label": ariaLabel,
    stepper = true,
    disabled = false,
    plusDisabled = false,
    minusDisabled = false,
    commitOnChange = false,
    allowEmpty = false,
    readOnly = false,
    block = false,
    onCommit,
  } = props as BaseProps & {
    value: number | undefined;
    onCommit: (n: number | undefined) => void;
    allowEmpty?: boolean;
  };

  const [local, setLocal] = useState(value == null ? "" : String(value));

  // Resync display when the committed prop value changes externally.
  useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  function commit(raw: string): void {
    if (allowEmpty && raw.trim() === "") {
      onCommit(undefined);
      return;
    }
    onCommit(Number(raw));
  }

  function clamp(n: number): number {
    let r = n;
    if (min != null) r = Math.max(min, r);
    if (max != null) r = Math.min(max, r);
    return r;
  }

  /** Apply `delta` to the committed value (used by buttons and arrow keys). */
  function bump(delta: number): void {
    const base = value == null ? (min ?? 0) : value;
    onCommit(clamp(base + delta));
  }

  const display = readOnly ? (
    <span className={`stepper-val ${className ?? ""}`.trim()} aria-label={ariaLabel}>
      {value ?? "—"}
    </span>
  ) : (
    <input
      type="number"
      className={className}
      min={min}
      max={max}
      step={step}
      style={block ? undefined : { width: `${size}ch` }}
      value={local}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(e) => {
        setLocal(e.target.value);
        if (commitOnChange) commit(e.target.value);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit((e.target as HTMLInputElement).value);
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          bump(step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          bump(-step);
        }
      }}
    />
  );

  if (!stepper) return <>{display}</>;

  return (
    <span className={block ? "stepper stepper-block" : "stepper"}>
      <button
        type="button"
        aria-label="decrement"
        disabled={disabled || minusDisabled || (min != null && (value ?? min) <= min)}
        onClick={() => bump(-step)}
      >
        −
      </button>
      {display}
      <button
        type="button"
        aria-label="increment"
        disabled={disabled || plusDisabled || (max != null && (value ?? min ?? 0) >= max)}
        onClick={() => bump(step)}
      >
        +
      </button>
    </span>
  );
}
