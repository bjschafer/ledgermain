import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { isOwner, type StoredContact } from "../src/feedbackContacts.js";
import { authedRequest, request } from "./helpers.js";

const REF = "0123456789abcdef";
const OWNER = "discord:owner-under-test";

async function storeFixture(ref: string, contact: string): Promise<void> {
  const record: StoredContact = {
    contact,
    createdAt: "2026-08-24T00:00:00.000Z",
    issueNumber: 512,
  };
  await env.FEEDBACK_CONTACTS.put(ref, JSON.stringify(record));
}

/**
 * `OWNER_ID` decides who may read a submitter's contact handle, so the unset
 * case is the one that matters most: a deploy that hasn't been given an owner
 * must expose nothing, not everything.
 */
describe("isOwner", () => {
  it("fails closed when no owner is configured", () => {
    expect(isOwner(OWNER, undefined)).toBe(false);
    expect(isOwner(OWNER, "")).toBe(false);
    expect(isOwner(OWNER, "   ")).toBe(false);
  });

  it("matches only the configured account", () => {
    expect(isOwner(OWNER, OWNER)).toBe(true);
    expect(isOwner("discord:someone-else", OWNER)).toBe(false);
    expect(isOwner(null, OWNER)).toBe(false);
  });
});

describe("GET /api/feedback/contact/:ref", () => {
  it("401s an unauthenticated caller", async () => {
    const res = await request(`https://api.test/api/feedback/contact/${REF}`);
    expect(res.status).toBe(401);
  });

  it("403s a signed-in account that isn't the owner", async () => {
    await storeFixture(REF, "player@example.com");
    const res = await authedRequest("discord:someone-else", `/api/feedback/contact/${REF}`);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("player@example.com");
  });

  it("hands the owner the stored handle", async () => {
    await storeFixture(REF, "player@example.com");
    const res = await authedRequest(OWNER, `/api/feedback/contact/${REF}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ref: REF,
      contact: "player@example.com",
      createdAt: "2026-08-24T00:00:00.000Z",
      issueNumber: 512,
    });
  });

  it("404s a ref with nothing (or nothing any longer) stored against it", async () => {
    const res = await authedRequest(OWNER, `/api/feedback/contact/${"f".repeat(16)}`);
    expect(res.status).toBe(404);
  });

  // Shape-checked in the router, so a junk ref never reaches KV as a lookup.
  it("404s a malformed ref", async () => {
    const res = await authedRequest(OWNER, "/api/feedback/contact/not-a-ref");
    expect(res.status).toBe(404);
  });

  it("405s a non-GET method", async () => {
    const res = await authedRequest(OWNER, `/api/feedback/contact/${REF}`, { method: "DELETE" });
    expect(res.status).toBe(405);
  });
});
