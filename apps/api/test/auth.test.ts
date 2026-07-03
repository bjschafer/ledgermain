import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { createSession, getSession } from "../src/session.js";
import { request } from "./helpers.js";

describe("GET /auth/github/start", () => {
  it("400s when redirect_uri is missing", async () => {
    const res = await request("https://api.test/auth/github/start");
    expect(res.status).toBe(400);
  });

  it("400s when redirect_uri isn't in ALLOWED_APP_ORIGINS", async () => {
    const res = await request(
      "https://api.test/auth/github/start?redirect_uri=https://evil.example/callback",
    );
    expect(res.status).toBe(400);
  });

  it("redirects to GitHub's authorize endpoint for an allowed redirect_uri", async () => {
    const res = await request(
      "https://api.test/auth/github/start?redirect_uri=http://localhost:5173/",
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("https://github.com");
    expect(location.pathname).toBe("/login/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe(env.GITHUB_CLIENT_ID);
    expect(location.searchParams.get("state")).toBeTruthy();
  });
});

describe("GET /auth/github/callback", () => {
  it("400s when code/state are missing", async () => {
    const res = await request("https://api.test/auth/github/callback");
    expect(res.status).toBe(400);
  });

  it("400s on an unknown/expired state", async () => {
    const res = await request(
      "https://api.test/auth/github/callback?code=abc&state=not-a-real-nonce",
    );
    expect(res.status).toBe(400);
  });
});

describe("session-gated routes", () => {
  it("GET /api/me 401s without a session", async () => {
    const res = await request("https://api.test/api/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/me returns the session's ownerId", async () => {
    const token = await createSession(env.KV, "github:42");
    const res = await request("https://api.test/api/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ownerId: "github:42" });
  });

  it("ignores a malformed Authorization header", async () => {
    const res = await request("https://api.test/api/me", {
      headers: { authorization: "not-a-bearer-token" },
    });
    expect(res.status).toBe(401);
  });

  it("POST /auth/logout invalidates the session", async () => {
    const token = await createSession(env.KV, "github:42");
    const logoutRes = await request("https://api.test/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status).toBe(204);
    expect(await getSession(env.KV, token)).toBeNull();

    const meRes = await request("https://api.test/api/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(401);
  });
});

describe("unmatched routes", () => {
  it("404s", async () => {
    const res = await request("https://api.test/nope");
    expect(res.status).toBe(404);
  });
});
