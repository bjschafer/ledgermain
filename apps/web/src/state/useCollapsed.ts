/**
 * Persists and retrieves a boolean "collapsed" state in localStorage. Each
 * caller supplies a stable string key (e.g. "panel:AbilityScores") so the
 * preference survives page reloads. The default is `false` (expanded) unless
 * `defaultCollapsed` is explicitly passed as `true`.
 */
import { useCallback, useState } from "react";

const PREFIX = "lm:collapsed:";

function readStorage(key: string, defaultVal: boolean): boolean {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultVal;
    return raw === "1";
  } catch {
    return defaultVal;
  }
}

function writeStorage(key: string, val: boolean): void {
  try {
    localStorage.setItem(PREFIX + key, val ? "1" : "0");
  } catch {
    /* quota exceeded / SSR — silently ignore */
  }
}

/**
 * @param key    Stable storage key, e.g. "panel:HitPoints".
 * @param defaultCollapsed  Initial state when no stored value exists. Default `false`.
 * @returns [collapsed, toggle] — `toggle` flips the state and persists it.
 */
export function useCollapsed(key: string, defaultCollapsed = false): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStorage(key, defaultCollapsed));

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeStorage(key, next);
      return next;
    });
  }, [key]);

  return [collapsed, toggle];
}
