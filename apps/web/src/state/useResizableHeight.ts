/**
 * Persists and retrieves a manually-set panel height (in px) in localStorage,
 * mirroring the `useCollapsed` pattern. `null` means "no override" — the
 * panel keeps its natural, content-driven height.
 */
import { useCallback, useState } from "react";

const PREFIX = "lm:panelHeight:";
const MIN_HEIGHT = 80;

function readStorage(key: string): number | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const val = Number(raw);
    return Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, val: number | null): void {
  try {
    if (val === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, String(val));
  } catch {
    /* quota exceeded / SSR — silently ignore */
  }
}

/**
 * @param key  Stable storage key, e.g. "panel:HitPoints".
 * @returns [height, setHeight, reset] — `height` is `null` when unset (natural
 *   height). `setHeight` persists a new value; `reset` clears the override.
 */
export function useResizableHeight(key: string): [number | null, (px: number) => void, () => void] {
  const [height, setHeightState] = useState<number | null>(() => readStorage(key));

  const setHeight = useCallback(
    (px: number) => {
      const clamped = Math.max(MIN_HEIGHT, Math.round(px));
      setHeightState(clamped);
      writeStorage(key, clamped);
    },
    [key],
  );

  const reset = useCallback(() => {
    setHeightState(null);
    writeStorage(key, null);
  }, [key]);

  return [height, setHeight, reset];
}
