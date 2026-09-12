import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { authedRequest, request } from "./helpers.js";

interface ShareBody {
  token: string;
  characterId: string;
  kind: "snapshot" | "live";
  createdAt: string;
}

interface SharedBody {
  kind: "snapshot" | "live";
  createdAt: string;
  doc: Record<string, unknown>;
}

async function putDoc(ownerId: string, id: string, version: number, hp = 10) {
  const res = await authedRequest(ownerId, `/api/characters/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      schemaVersion: 1,
      id,
      version,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: { name: id, race: "human", classes: [] },
      live: { hp },
    }),
  });
  expect(res.status).toBe(200);
}

async function share(ownerId: string, characterId: string, kind: string): Promise<ShareBody> {
  const res = await authedRequest(ownerId, "/api/me/shares", {
    method: "POST",
    body: JSON.stringify({ characterId, kind }),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as ShareBody;
}

function readShared(token: string, query = "") {
  return request(`https://api.test/api/shared/${token}${query}`);
}

describe("share links", () => {
  it("401s the owner routes without a session, but reads need none", async () => {
    expect((await request("https://api.test/api/me/shares")).status).toBe(401);
    const post = await request("https://api.test/api/me/shares", {
      method: "POST",
      body: JSON.stringify({ characterId: "x", kind: "live" }),
    });
    expect(post.status).toBe(401);

    const ownerId = "discord:share-anon";
    await putDoc(ownerId, "hero", 1);
    const { token } = await share(ownerId, "hero", "live");
    expect((await readShared(token)).status).toBe(200);
  });

  it("mints a long random token that names neither owner nor character", async () => {
    const ownerId = "discord:share-token";
    await putDoc(ownerId, "hero", 1);
    const a = await share(ownerId, "hero", "snapshot");
    const b = await share(ownerId, "hero", "snapshot");
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.token).not.toContain("hero");
  });

  it("freezes a snapshot at publish time", async () => {
    const ownerId = "discord:share-snap";
    await putDoc(ownerId, "hero", 1, 10);
    const { token } = await share(ownerId, "hero", "snapshot");
    await putDoc(ownerId, "hero", 2, 3);

    const res = await readShared(token);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as SharedBody;
    expect(body.kind).toBe("snapshot");
    expect(body.doc).toMatchObject({ id: "hero", version: 1, live: { hp: 10 } });
  });

  it("follows the character for a live share", async () => {
    const ownerId = "discord:share-live";
    await putDoc(ownerId, "hero", 1, 10);
    const { token } = await share(ownerId, "hero", "live");
    await putDoc(ownerId, "hero", 2, 3);

    const body = (await (await readShared(token)).json()) as SharedBody;
    expect(body.kind).toBe("live");
    expect(body.doc).toMatchObject({ version: 2, live: { hp: 3 } });
  });

  it("answers a live poll with 204 when the version hasn't moved", async () => {
    const ownerId = "discord:share-poll";
    await putDoc(ownerId, "hero", 4);
    const { token } = await share(ownerId, "hero", "live");

    const same = await readShared(token, "?since=4");
    expect(same.status).toBe(204);
    expect(await same.text()).toBe("");

    await putDoc(ownerId, "hero", 5);
    const moved = await readShared(token, "?since=4");
    expect(moved.status).toBe(200);
  });

  it("never serves the owner's account id", async () => {
    const ownerId = "discord:share-private";
    await putDoc(ownerId, "hero", 1);
    const snap = await share(ownerId, "hero", "snapshot");
    const live = await share(ownerId, "hero", "live");

    const texts = await Promise.all(
      [snap, live].map(async ({ token }) => (await readShared(token)).text()),
    );
    for (const text of texts) {
      expect(text).not.toContain(ownerId);
      expect((JSON.parse(text) as SharedBody).doc).not.toHaveProperty("ownerId");
    }
  });

  it("404s a character that was never synced", async () => {
    const res = await authedRequest("discord:share-missing", "/api/me/shares", {
      method: "POST",
      body: JSON.stringify({ characterId: "ghost", kind: "live" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects a malformed publish request", async () => {
    const ownerId = "discord:share-bad";
    const responses = await Promise.all(
      ["{nope", JSON.stringify({ characterId: "hero", kind: "forever" })].map((body) =>
        authedRequest(ownerId, "/api/me/shares", { method: "POST", body }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([400, 400]);
  });

  it("lists only the caller's shares, newest first", async () => {
    const ownerId = "discord:share-list";
    await putDoc(ownerId, "hero", 1);
    await putDoc("discord:share-list-other", "villain", 1);
    const first = await share(ownerId, "hero", "snapshot");
    await new Promise((r) => setTimeout(r, 5));
    const second = await share(ownerId, "hero", "live");
    await share("discord:share-list-other", "villain", "live");

    const res = await authedRequest(ownerId, "/api/me/shares");
    const { shares } = (await res.json()) as { shares: ShareBody[] };
    expect(shares).toEqual([second, first]);
  });

  it("404s a revoked token, and revoke is idempotent", async () => {
    const ownerId = "discord:share-revoke";
    await putDoc(ownerId, "hero", 1);
    const { token } = await share(ownerId, "hero", "snapshot");

    const revoke = () => authedRequest(ownerId, `/api/me/shares/${token}`, { method: "DELETE" });
    expect((await revoke()).status).toBe(204);
    expect((await readShared(token)).status).toBe(404);
    expect((await revoke()).status).toBe(204);

    // Gone from the server, not just hidden: neither key survives.
    expect(await env.CHARACTERS.get(`share::${token}`)).toBeNull();
    const list = (await (await authedRequest(ownerId, "/api/me/shares")).json()) as {
      shares: unknown[];
    };
    expect(list.shares).toEqual([]);
  });

  it("won't let one account revoke another's share", async () => {
    const ownerId = "discord:share-victim";
    await putDoc(ownerId, "hero", 1);
    const { token } = await share(ownerId, "hero", "live");

    const res = await authedRequest("discord:share-attacker", `/api/me/shares/${token}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    // Still readable: the attacker's revoke answered like a success and did nothing.
    expect((await readShared(token)).status).toBe(200);
  });

  it("takes a character's shares with it when the character is deleted", async () => {
    const ownerId = "discord:share-cascade";
    await putDoc(ownerId, "doomed", 1);
    await putDoc(ownerId, "kept", 1);
    const snap = await share(ownerId, "doomed", "snapshot");
    const live = await share(ownerId, "doomed", "live");
    const other = await share(ownerId, "kept", "snapshot");

    await authedRequest(ownerId, "/api/characters/doomed", { method: "DELETE" });

    expect((await readShared(snap.token)).status).toBe(404);
    expect((await readShared(live.token)).status).toBe(404);
    expect((await readShared(other.token)).status).toBe(200);
    const { shares } = (await (await authedRequest(ownerId, "/api/me/shares")).json()) as {
      shares: ShareBody[];
    };
    expect(shares.map((s) => s.token)).toEqual([other.token]);
  });

  it("is erased by the account purge", async () => {
    const ownerId = "discord:share-purge";
    await putDoc(ownerId, "hero", 1);
    const { token } = await share(ownerId, "hero", "snapshot");

    const res = await authedRequest(ownerId, "/api/me", { method: "DELETE" });
    expect(await res.json()).toMatchObject({ complete: true, deleted: 3 });
    expect((await readShared(token)).status).toBe(404);
    expect(await env.CHARACTERS.get(`ownershare::${ownerId}::${token}`)).toBeNull();
  });

  it("404s a token of the wrong shape without touching storage", async () => {
    expect((await readShared("not-a-token")).status).toBe(404);
    expect((await readShared("A".repeat(64))).status).toBe(404);
  });

  it("405s a write to the public read path", async () => {
    const res = await request(`https://api.test/api/shared/${"a".repeat(64)}`, { method: "PUT" });
    expect(res.status).toBe(405);
  });
});
