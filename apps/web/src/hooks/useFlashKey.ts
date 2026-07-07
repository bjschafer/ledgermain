import { useEffect, useRef, useState } from "react";

/**
 * Tracks a displayed value across renders and bumps a counter whenever it
 * changes, for a one-shot CSS "flash" the caller re-triggers by keying an
 * element on the returned number (see `StatSeal`'s `.seal-flash` overlay and
 * Sheet.tsx's skill-total rows — the "recompute shimmer" cue from the living-
 * sheet UX audit: the engine recomputes the whole sheet on every doc change,
 * but nothing showed a number had actually changed).
 *
 * Returns 0 on mount and stays 0 until the first real change, so nothing
 * flashes on initial render. Pass `resetKey` (e.g. `doc.id`) to resync the
 * tracked value silently on an identity change (switching characters) instead
 * of flashing every value at once — a full-sheet flash storm reads as noise,
 * not signal.
 */
export function useFlashKey(value: unknown, resetKey?: string | number): number {
  const prevValueRef = useRef(value);
  const prevResetKeyRef = useRef(resetKey);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      prevValueRef.current = value;
      return;
    }
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value, resetKey]);

  return flashKey;
}
