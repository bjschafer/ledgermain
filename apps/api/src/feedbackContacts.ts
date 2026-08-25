/**
 * Private storage for the opt-in contact handle a feedback submission carries.
 *
 * The handle never reaches the GitHub issue. That tracker is public, GitHub
 * keeps issue-body edit history readable by anyone with read access (so
 * redacting an address after the fact still leaks it), and public trackers are
 * scraped for addresses. The issue carries an opaque `ref` instead; the handle
 * itself lives here, in a namespace only the owner can read.
 *
 * Why its own KV binding rather than a corner of `KV`: every key in `KV` is
 * regenerable operational state (sessions, OAuth nonces, the cached
 * installation token, rate-limit counters), the kind of thing that can be
 * cleared wholesale during an incident without losing anything. This is
 * user-submitted personal data with a retention window, so it belongs on the
 * `CHARACTERS` side of that line, where "everything in here expires, and
 * nothing else does" stays a property of the whole namespace.
 */
import { errorJson, json } from "./http.js";
import { ownerIdFromRequest, randomToken } from "./session.js";

/**
 * Retention window. The expiry is the point rather than an implementation
 * detail: a handle this old is useless for following up on a bug report, and a
 * TTL keeps the store from quietly becoming a contact database nobody decided
 * to keep.
 */
const CONTACT_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

/** One stored handle. `issueNumber` closes the loop back to the public issue. */
export interface StoredContact {
  contact: string;
  createdAt: string;
  issueNumber: number;
}

/**
 * The token printed in the public issue body. Not a secret and can't be one,
 * since it's published: it's an identifier, and the lookup route is what
 * enforces access. Sized only so refs don't collide.
 */
export function newContactRef(): string {
  return randomToken(8);
}

/** The shape a ref may take in a URL; anything else is rejected before KV is touched. */
export const CONTACT_REF_PATTERN = /^[0-9a-f]{16}$/;

export async function storeContact(
  env: Env,
  ref: string,
  contact: string,
  issueNumber: number,
): Promise<void> {
  const record: StoredContact = {
    contact,
    createdAt: new Date().toISOString(),
    issueNumber,
  };
  await env.FEEDBACK_CONTACTS.put(ref, JSON.stringify(record), {
    expirationTtl: CONTACT_TTL_SECONDS,
  });
}

/**
 * Whether the caller is the single account allowed to read stored handles.
 * Fails closed when `OWNER_ID` is unset, so an unprovisioned deploy exposes
 * nothing rather than everything. Plain `===` because an `ownerId` is a
 * Discord user id, not a secret needing a constant-time compare.
 */
export function isOwner(ownerId: string | null, configuredOwnerId: string | undefined): boolean {
  const configured = configuredOwnerId?.trim();
  return Boolean(configured) && ownerId === configured;
}

/** `GET /api/feedback/contact/:ref` — the owner's side of the private handoff. */
export async function handleContactLookup(
  request: Request,
  env: Env,
  ref: string,
): Promise<Response> {
  const ownerId = await ownerIdFromRequest(request, env.KV);
  if (!ownerId) return errorJson(401, "Not authenticated");
  if (!isOwner(ownerId, env.OWNER_ID)) return errorJson(403, "Not allowed");

  const record = await env.FEEDBACK_CONTACTS.get<StoredContact>(ref, "json");
  // An expired handle and a ref that never existed answer identically: the
  // handle is gone either way, and distinguishing them only invites a hunt.
  if (!record) return errorJson(404, "No contact stored for that ref");
  return json({ ref, ...record });
}
