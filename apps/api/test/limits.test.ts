import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { overRateLimit } from "../src/rateLimit.js";

import { authedRequest } from "./helpers.js";

const rule = { max: 3, windowSeconds: 60 };

function docBody(id: string, version = 1) {
  return JSON.stringify({
    schemaVersion: 1,
    id,
    version,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: id, race: "human", classes: [] },
  });
}

describe("overRateLimit", () => {
  it("lets `max` calls through and blocks the next", async () => {
    const key = `test:rl:${crypto.randomUUID()}`;
    expect(await overRateLimit(env.KV, key, rule)).toBe(false);
    expect(await overRateLimit(env.KV, key, rule)).toBe(false);
    expect(await overRateLimit(env.KV, key, rule)).toBe(false);
    expect(await overRateLimit(env.KV, key, rule)).toBe(true);
  });

  it("keeps separate keys on separate budgets", async () => {
    const a = `test:rl:${crypto.randomUUID()}`;
    const b = `test:rl:${crypto.randomUUID()}`;
    await env.KV.put(a, "3", { expirationTtl: 60 });
    expect(await overRateLimit(env.KV, a, rule)).toBe(true);
    expect(await overRateLimit(env.KV, b, rule)).toBe(false);
  });

  it("treats a garbled counter as zero rather than disabling itself", async () => {
    const key = `test:rl:${crypto.randomUUID()}`;
    await env.KV.put(key, "not-a-number", { expirationTtl: 60 });
    expect(await overRateLimit(env.KV, key, rule)).toBe(false);
    expect(await env.KV.get(key)).toBe("1");
  });

  it("does not count a request it rejected", async () => {
    const key = `test:rl:${crypto.randomUUID()}`;
    await env.KV.put(key, "9", { expirationTtl: 60 });
    expect(await overRateLimit(env.KV, key, rule)).toBe(true);
    expect(await env.KV.get(key)).toBe("9");
  });
});

describe("PUT /api/characters/:id write limit", () => {
  const ownerId = "discord:writer";

  it("429s with a Retry-After once the owner's budget is spent", async () => {
    // Priming the counter directly beats issuing hundreds of real writes, and
    // the key shape is the thing worth pinning anyway.
    await env.KV.put(`charput:rl:${ownerId}`, "240", { expirationTtl: 3600 });
    const res = await authedRequest(ownerId, "/api/characters/blocked", {
      method: "PUT",
      body: docBody("blocked"),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
    // Rejected before the body was ever stored.
    expect(await env.CHARACTERS.get(`${ownerId}::blocked`)).toBeNull();
  });

  it("leaves an owner under budget alone", async () => {
    // A different account: the primed counter above is owner-scoped, which is
    // exactly the property this asserts.
    const res = await authedRequest("discord:writer-2", "/api/characters/fine", {
      method: "PUT",
      body: docBody("fine"),
    });
    expect(res.status).toBe(200);
  });
});

describe("per-owner document cap", () => {
  const ownerId = "discord:hoarder";

  async function fillToCap() {
    await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        env.CHARACTERS.put(`${ownerId}::seeded-${i}`, "{}", {
          metadata: { version: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
        }),
      ),
    );
  }

  it("refuses a new document at the cap", async () => {
    await fillToCap();
    const res = await authedRequest(ownerId, "/api/characters/one-too-many", {
      method: "PUT",
      body: docBody("one-too-many"),
    });
    expect(res.status).toBe(403);
    expect(await env.CHARACTERS.get(`${ownerId}::one-too-many`)).toBeNull();
  });

  it("still accepts an edit to a document that already exists", async () => {
    await fillToCap();
    const res = await authedRequest(ownerId, "/api/characters/seeded-0", {
      method: "PUT",
      body: docBody("seeded-0", 2),
    });
    expect(res.status).toBe(200);
  });

  it("lets a new document through once one is deleted", async () => {
    await fillToCap();
    await env.CHARACTERS.delete(`${ownerId}::seeded-0`);
    const res = await authedRequest(ownerId, "/api/characters/replacement", {
      method: "PUT",
      body: docBody("replacement"),
    });
    expect(res.status).toBe(200);
  });
});
