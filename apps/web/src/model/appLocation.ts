/**
 * Where you are in the app — which tab, and which section of it — expressed as
 * a URL fragment, so a reload lands you back where you were and a spot worth
 * pointing someone at can just be pasted.
 *
 * The shape is `#/settings/settings-whats-new`: mode, then the DOM id of the
 * section anchor within it. The leading `/` is load-bearing — the API's OAuth
 * callback parks a `#session=<token>` fragment on the URL that
 * `sync/session.ts` consumes later in the load, and anything that doesn't
 * start with `/` here is somebody else's fragment to leave alone.
 */

export type Mode = "build" | "play" | "settings";

export interface AppLocation {
  mode: Mode;
  /** DOM id of the section to scroll to, when one was recorded. */
  section?: string;
}

const MODES: ReadonlySet<string> = new Set(["build", "play", "settings"]);

/** Section ids are `getElementById` fodder; keep them to what we ever emit. */
const SECTION_ID = /^[a-z0-9-]+$/i;

/**
 * Short hand-typeable spellings for places worth linking to from outside the
 * app. Parsed, never emitted by scroll tracking — `whatsNewHash()` is what
 * hands one out.
 */
const ALIASES: Readonly<Record<string, AppLocation>> = {
  "whats-new": { mode: "settings", section: "settings-whats-new" },
};

export const DEFAULT_LOCATION: AppLocation = { mode: "build" };

/** The alias to share; `parseLocationHash` resolves it to the Settings panel. */
export function whatsNewHash(): string {
  return "#/whats-new";
}

/**
 * Read a location out of a URL fragment. Returns `null` for anything that
 * isn't ours — an empty hash, a `#session=` token, a stale bookmark naming a
 * mode that no longer exists — so callers can fall through to a default
 * rather than landing somewhere arbitrary.
 */
export function parseLocationHash(hash: string): AppLocation | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith("/")) return null;
  const parts = raw.slice(1).split("/").filter(Boolean);
  const head = parts[0];
  if (!head) return null;

  const alias = ALIASES[head];
  if (alias) return parts.length === 1 ? alias : null;
  if (!MODES.has(head)) return null;

  const mode = head as Mode;
  const section = parts[1];
  if (parts.length > 2) return null;
  if (section === undefined) return { mode };
  return SECTION_ID.test(section) ? { mode, section } : { mode };
}

export function formatLocationHash(location: AppLocation): string {
  return location.section ? `#/${location.mode}/${location.section}` : `#/${location.mode}`;
}

export function sameLocation(a: AppLocation, b: AppLocation): boolean {
  return a.mode === b.mode && a.section === b.section;
}

/**
 * An absolute, pasteable link to `hash` from wherever the app is currently
 * served — deployed origin, a LAN dev box, a preview URL. Takes the href
 * rather than reading `window` so it stays testable.
 */
export function absoluteLink(currentHref: string, hash: string): string {
  const base = currentHref.split("#")[0] ?? currentHref;
  return base + hash;
}
