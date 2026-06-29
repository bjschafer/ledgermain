import { useEffect, useState } from "react";

interface NumberFieldProps {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * A controlled number input that lets the user edit freely while focused,
 * committing the value to the parent only on blur or Enter. This avoids the
 * "clamp on every keystroke" problem where deleting a digit mid-edit snaps the
 * value to the min/max before the user can finish typing.
 *
 * The committed value is `Number(raw)` — NaN (empty field, non-numeric text)
 * becomes 0 before being passed to `onCommit`. The model layer is responsible
 * for clamping to the valid range (1–50 for abilities, 0–maxRank for skills).
 *
 * When `value` changes externally (e.g. maxRank drops due to a class removal)
 * the local display resyncs to the new value.
 */
export function NumberField({
  value,
  min,
  max,
  onCommit,
  className,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  const [local, setLocal] = useState(String(value));

  // Resync display when the committed prop value changes externally.
  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  function commit(raw: string): void {
    onCommit(Number(raw));
  }

  return (
    <input
      type="number"
      className={className}
      min={min}
      max={max}
      value={local}
      aria-label={ariaLabel}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit((e.target as HTMLInputElement).value);
        }
      }}
    />
  );
}
