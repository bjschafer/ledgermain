/**
 * User-adjustable text size — a device/display preference, not part of the
 * character document, persisted in localStorage (mirrors the `useCollapsed`
 * idiom) and applied as a `<html>` `font-size` percentage so every `rem`
 * value in styles.css (and any inline `rem` style) scales with it.
 */
import { useCallback, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "lm:textSize";

export const TEXT_SIZES = ["small", "default", "large", "xlarge"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_SIZE_LABEL: Record<TextSize, string> = {
  small: "Small",
  default: "Default",
  large: "Large",
  xlarge: "Extra-large",
};

const ROOT_PERCENT: Record<TextSize, string> = {
  small: "87.5%",
  default: "100%",
  large: "112.5%",
  xlarge: "125%",
};

function isTextSize(val: string | null): val is TextSize {
  return val != null && (TEXT_SIZES as readonly string[]).includes(val);
}

function readStorage(): TextSize {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isTextSize(raw) ? raw : "default";
  } catch {
    return "default";
  }
}

function writeStorage(size: TextSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    /* quota exceeded / SSR — silently ignore */
  }
}

/**
 * @returns [size, setSize] — `setSize` persists the choice and updates the
 *   document root's font-size immediately (before paint, via layout effect,
 *   so switching sizes doesn't visibly flash at the old size first).
 */
export function useTextSize(): [TextSize, (size: TextSize) => void] {
  const [size, setSizeState] = useState<TextSize>(() => readStorage());

  useLayoutEffect(() => {
    document.documentElement.style.fontSize = ROOT_PERCENT[size];
  }, [size]);

  const setSize = useCallback((next: TextSize) => {
    setSizeState(next);
    writeStorage(next);
  }, []);

  return [size, setSize];
}
