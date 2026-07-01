/**
 * Pure logic for the one-time "this is a preview" disclaimer. Only relevant on
 * a deployed build — a developer running locally already knows the data is
 * ephemeral, so the notice would just be noise there.
 */

const DISMISSED_KEY = "pf1-tracker:previewNoticeDismissed";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", ""]);

/** True for local dev hosts (including an empty hostname, e.g. `file://`). */
export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

/** Whether the notice should be shown for this hostname + prior dismissal. */
export function shouldShowPreviewNotice(
  hostname: string,
  dismissed: boolean,
): boolean {
  return !isLocalHost(hostname) && !dismissed;
}

/** Has the user already dismissed the notice on this device/browser? */
export function getPreviewNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Record the dismissal so the notice doesn't reappear on this device. */
export function setPreviewNoticeDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage unavailable — the notice will just show again next load.
  }
}
