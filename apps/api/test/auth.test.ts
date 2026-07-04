import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { createSession, getSession } from "../src/session.js";
import { request } from "./helpers.js";

describe("GET /auth/discord/start", () => {
  it("400s when redirect_uri is missing", async () => {
    const res = await request("https://api.test/auth/discord/start");
    expect(res.status).toBe(400);
  });

  it("400s when redirect_uri isn't in ALLOWED_APP_ORIGINS", async () => {
    const res = await request(
      "https://api.test/auth/discord/start?redirect_uri=https://evil.example/callback",
    );
    expect(res.status).toBe(400);
  });

  it("redirects to Discord's authorize endpoint for an allowed redirect_uri", async () => {
    const res = await request(
      "https://api.test/auth/discord/start?redirect_uri=http://localhost:5173/",
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("https://discord.com");
    expect(location.pathname).toBe("/oauth2/authorize");
    expect(location.searchParams.get("client_id")).toBe(env.DISCORD_CLIENT_ID);
    expect(location.searchParams.get("state")).toBeTruthy();
  });
});

describe("GET /auth/discord/callback", () => {
  it("400s when code/state are missing", async () => {
    const res = await request("https://api.test/auth/discord/callback");
    expect(res.status).toBe(400);
  });

  it("400s on an unknown/expired state", async () => {
    const res = await request(
      "https://api.test/auth/discord/callback?code=abc&state=not-a-real-nonce",
    );
    expect(res.status).toBe(400);
  });
});

describe("OAuth login-CSRF (browser-nonce cookie)", () => {
  /**
   * Drive the real /start endpoint and pull out the two halves the callback
   * must correlate: the `state` param sent to GitHub and the browser-nonce
   * cookie set on the initiating browser.
   */
  async function startFlow(): Promise<{ state: string; cookie: string }> {
    const res = await request(
      "https://api.test/auth/discord/start?redirect_uri=http://localhost:5173/",
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("__Host-oauth_nonce=");
    expect(setCookie).toContain("HttpOnly");
    const cookie = setCookie.split(";")[0]!; // "name=value"
    return { state, cookie };
  }

  it("400s a callback with a valid state but no nonce cookie", async () => {
    const { state } = await startFlow();
    const res = await request(`https://api.test/auth/discord/callback?code=abc&state=${state}`);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("not initiated by this browser");
  });

  it("400s a callback whose nonce cookie doesn't match the state record", async () => {
    const { state } = await startFlow();
    const res = await request(`https://api.test/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie: "__Host-oauth_nonce=wrong-nonce-value" },
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("not initiated by this browser");
  });

  it("burns the state on a failed cookie check (single use even when rejected)", async () => {
    const { state, cookie } = await startFlow();
    const first = await request(`https://api.test/auth/discord/callback?code=abc&state=${state}`);
    expect(first.status).toBe(400);
    // Replaying with the CORRECT cookie must now fail on the state itself.
    const replay = await request(`https://api.test/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie },
    });
    expect(replay.status).toBe(400);
    expect(await replay.text()).toContain("Invalid or expired OAuth state");
  });

  it("a matching nonce cookie passes the CSRF gate (proceeds to the Discord exchange)", async () => {
    // This test runtime has no fetch mocking available (`fetchMock` is not
    // exported by this vitest-pool-workers version) and no real network, so
    // full login success can't be exercised here — instead assert the
    // matching cookie gets PAST the nonce gate: the failure we get back is
    // the 502 from the (unreachable) Discord token exchange, NOT the 400
    // CSRF rejection. The rejection paths above prove the gate itself.
    const { state, cookie } = await startFlow();
    const res = await request(`https://api.test/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie },
      redirect: "manual",
    });
    expect(res.status).toBe(502);
    expect(await res.text()).toContain("Discord token exchange failed");
  });
});

describe("session-gated routes", () => {
  it("GET /api/me 401s without a session", async () => {
    const res = await request("https://api.test/api/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/me returns the session's ownerId", async () => {
    const token = await createSession(env.KV, "discord:42");
    const res = await request("https://api.test/api/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ownerId: "discord:42" });
  });

  it("ignores a malformed Authorization header", async () => {
    const res = await request("https://api.test/api/me", {
      headers: { authorization: "not-a-bearer-token" },
    });
    expect(res.status).toBe(401);
  });

  it("POST /auth/logout invalidates the session", async () => {
    const token = await createSession(env.KV, "discord:42");
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
