/**
 * The `#/shared/<token>` fragment a share link opens to.
 *
 * Kept apart from `appLocation.ts` on purpose: a share link is not a place in
 * the player's own app but a different app entirely, one that reads somebody
 * else's character and has no Build, Play, or Settings to navigate. `main.tsx`
 * checks for it before the player's app mounts, so none of the player's own
 * storage or sync ever starts for a reader.
 *
 * A fragment rather than a path, like every other location here, so the link
 * needs nothing from the static host and the token never reaches a server log
 * as part of a page request.
 */
import type { ShareKind } from "../sync/client.js";

const SHARE_HASH = /^#?\/shared\/([0-9a-f]{64})$/;

/** The share token in `hash`, or `null` when the fragment isn't a share link. */
export function parseShareHash(hash: string): string | null {
  return SHARE_HASH.exec(hash)?.[1] ?? null;
}

export function shareHash(token: string): string {
  return `#/shared/${token}`;
}

export const SHARE_KIND_LABEL: Readonly<Record<ShareKind, string>> = {
  snapshot: "Snapshot",
  live: "Live",
};

/**
 * What has to happen before a character can be shared, given the version this
 * device saved and the version the server holds. The server shares its own
 * copy, so a character whose latest save hasn't reached it must be pushed
 * first, or a snapshot would freeze an older sheet than the player is looking
 * at.
 */
export type ShareReadiness = "ready" | "push" | "newer-elsewhere";

export function shareReadiness(
  localVersion: number,
  remoteVersion: number | undefined,
): ShareReadiness {
  if (remoteVersion === undefined || localVersion > remoteVersion) return "push";
  return localVersion === remoteVersion ? "ready" : "newer-elsewhere";
}

/** How often a reader's page re-reads a live share while it is on screen. */
export const LIVE_SHARE_POLL_MS = 20_000;
