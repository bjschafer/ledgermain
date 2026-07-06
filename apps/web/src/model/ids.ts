/**
 * Locally-unique id generation, in one place.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS / localhost).
 * Over plain-HTTP LAN, in some SSR/embedded runtimes, or an old WebView the
 * global `crypto` may exist without `randomUUID`, so calling it directly
 * throws. Fall back to a timestamp plus a monotonic per-session counter — not
 * a real UUID, but unique within the session without needing crypto (all these
 * ids are local doc keys, never a security boundary). The optional `prefix`
 * tags fallback ids by origin (e.g. `"buff-"`) to aid debugging.
 */
let idCounter = 0;

export function localId(prefix = ""): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  idCounter += 1;
  return `${prefix}${Date.now()}-${idCounter}`;
}
