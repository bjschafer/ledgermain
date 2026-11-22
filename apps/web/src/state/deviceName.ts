/**
 * What this device calls itself in a sync conflict ("Work laptop", or failing
 * that "Chrome on macOS"). A browser can't read the computer's own name, so
 * the default comes from the user agent and the player can override it.
 *
 * Device-local on purpose: `build.settings` syncs, so a name kept there would
 * read the same on every device. The effective label is stamped onto each
 * save as `CharacterDoc.savedOn`, which is how the *other* device learns it.
 */
import { useCallback, useSyncExternalStore } from "react";

import type { CharacterDoc } from "@pf1/schema";

const STORAGE_KEY = "lm:pref:deviceName";

/** Longest custom name kept; it has to fit in a banner sentence. */
export const DEVICE_NAME_MAX = 40;

type Listener = () => void;

const listeners = new Set<Listener>();

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

let customName = read();

/**
 * "Chrome on macOS"-style label from a user-agent string. Brand checks run
 * most-specific first because every Chromium browser also claims Chrome and
 * Safari. iPadOS reports itself as a Mac, so a touch-capable "Mac" is an iPad.
 */
export function describeBrowser(ua: string, maxTouchPoints = 0): string {
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : undefined;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Mac OS X|Macintosh/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : undefined;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown browser";
}

/** The label this device gets when the player hasn't named it. */
export function defaultDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown browser";
  return describeBrowser(navigator.userAgent, navigator.maxTouchPoints);
}

/** The player's own name for this device, or `""` when unset. */
export function getCustomDeviceName(): string {
  return customName;
}

/** The name stamped onto saves: the player's, else the browser-derived one. */
export function deviceName(): string {
  return customName || defaultDeviceName();
}

export function setCustomDeviceName(value: string): void {
  customName = value.trim().slice(0, DEVICE_NAME_MAX);
  try {
    if (customName) localStorage.setItem(STORAGE_KEY, customName);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota exceeded / storage disabled: the session still uses it */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `[customName, setCustomName]`; `""` means "use the browser's name". */
export function useCustomDeviceName(): [string, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, getCustomDeviceName, getCustomDeviceName);
  const set = useCallback((next: string) => setCustomDeviceName(next), []);
  return [value, set];
}

/** A copy of `doc` marked as saved here, now. Every local write goes through this. */
export function stampLocalSave(doc: CharacterDoc): CharacterDoc {
  return { ...doc, updatedAt: new Date().toISOString(), savedOn: deviceName() };
}
