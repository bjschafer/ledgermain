/**
 * Bearer-token session storage for the sync API (see `apps/api/src/session.ts`
 * / `apps/api/src/discord-oauth.ts` for the server half). No cookies — the
 * API and this app are near-certainly different origins, so a bearer token
 * in `localStorage` sidesteps cross-site cookie/`SameSite` complexity
 * entirely (documented in `apps/api/README.md`).
 */
const TOKEN_KEY = "pf1-tracker:sessionToken";

/** Parse a `#session=<token>` URL fragment (left by the API's OAuth-callback redirect). Pure. */
export function parseSessionFragment(hash: string): string | null {
  const match = /^#session=(.+)$/.exec(hash);
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

/** Build the URL that starts the Discord OAuth login flow. Pure. */
export function loginUrl(apiBase: string, redirectUri: string): string {
  const url = new URL("/auth/discord/start", apiBase);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private browsing, disabled storage) — sync
    // degrades to "signed out", same posture as the active-character
    // pointer in db/characters.ts.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // See setStoredToken.
  }
}

/**
 * The bits of `Location`/`History` this module actually touches. `window.location`
 * / `window.history` satisfy these structurally, but narrowing to just what's
 * used lets tests pass small plain objects instead of casting real DOM types.
 */
export interface FragmentLocation {
  hash: string;
  pathname: string;
  search: string;
}
export interface FragmentHistory {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

/**
 * Consume a `#session=<token>` fragment left by the API's OAuth callback, if
 * present: stores the token and strips the fragment from the URL bar (so a
 * refresh/share/browser-history entry never carries a live session token).
 * Safe to call unconditionally on every app load — a no-op without the
 * fragment. Returns the token if one was consumed.
 */
export function consumeSessionFragment(
  location: FragmentLocation,
  history: FragmentHistory,
): string | null {
  const token = parseSessionFragment(location.hash);
  if (!token) return null;
  setStoredToken(token);
  history.replaceState(null, "", location.pathname + location.search);
  return token;
}
