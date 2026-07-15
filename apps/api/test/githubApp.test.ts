import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createIssue,
  fetchInstallationToken,
  getInstallationToken,
  signAppJwt,
} from "../src/githubApp.js";
import { stubFetch } from "./helpers.js";

afterEach(() => vi.unstubAllGlobals());

/** A throwaway RSA keypair, exported as a PKCS#8 PEM (what the Worker imports). */
async function generatePkcs8Pem(): Promise<{ pem: string; publicKey: CryptoKey }> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const pkcs8 = (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer;
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const wrapped = b64.match(/.{1,64}/g)!.join("\n");
  return {
    pem: `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`,
    publicKey: pair.publicKey,
  };
}

function base64urlToBytes(segment: string): Uint8Array {
  const b64 = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

describe("signAppJwt", () => {
  it("produces a verifiable RS256 JWT with the expected App claims", async () => {
    const { pem, publicKey } = await generatePkcs8Pem();
    const now = 1_700_000_000;
    const jwt = await signAppJwt("42", pem, now);

    const [header, payload, signature] = jwt.split(".");
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      base64urlToBytes(signature!),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(verified).toBe(true);

    const claims = JSON.parse(new TextDecoder().decode(base64urlToBytes(payload!)));
    expect(claims.iss).toBe("42");
    expect(claims.iat).toBe(now - 60); // backdated for clock skew
    expect(claims.exp).toBe(now + 600); // 10-minute cap
  });
});

describe("fetchInstallationToken", () => {
  it("POSTs the App JWT to the installation endpoint and returns the token", async () => {
    const calls = stubFetch(async () =>
      Response.json(
        { token: "ghs_installation", expires_at: "2026-01-01T00:00:00Z" },
        {
          status: 201,
        },
      ),
    );
    const result = await fetchInstallationToken("signed.jwt.here", "99");
    expect(result.token).toBe("ghs_installation");
    expect(result.expires_at).toBe("2026-01-01T00:00:00Z");

    expect(String(calls[0]!.input)).toBe(
      "https://api.github.com/app/installations/99/access_tokens",
    );
    const headers = new Headers(calls[0]!.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer signed.jwt.here");
  });

  it("throws on a non-2xx exchange", async () => {
    stubFetch(async () => new Response("Bad credentials", { status: 401 }));
    await expect(fetchInstallationToken("bad.jwt", "99")).rejects.toThrow(
      "installation token exchange failed: 401",
    );
  });
});

describe("getInstallationToken", () => {
  it("mints once and serves the cached token from KV until expiry", async () => {
    const { pem } = await generatePkcs8Pem();
    const now = 1_700_000_000;
    const expiresAt = new Date((now + 3600) * 1000).toISOString();
    const calls = stubFetch(async () =>
      Response.json({ token: "ghs_cached", expires_at: expiresAt }, { status: 201 }),
    );
    const fakeEnv = {
      KV: env.KV,
      GITHUB_APP_ID: "42",
      GITHUB_APP_PRIVATE_KEY: pem,
      GITHUB_APP_INSTALLATION_ID: "99",
    } as unknown as Env;

    expect(await getInstallationToken(fakeEnv, now)).toBe("ghs_cached");
    expect(await getInstallationToken(fakeEnv, now)).toBe("ghs_cached");
    expect(calls).toHaveLength(1); // second call served from KV, no new exchange
  });
});

describe("createIssue", () => {
  it("POSTs the issue to the configured repo and returns number + url", async () => {
    const calls = stubFetch(async () =>
      Response.json(
        { number: 7, html_url: "https://github.com/owner/repo/issues/7" },
        {
          status: 201,
        },
      ),
    );
    const fakeEnv = { GITHUB_FEEDBACK_REPO: "owner/repo" } as unknown as Env;
    const created = await createIssue(fakeEnv, "token", {
      title: "[Missing] Fey Foundling",
      body: "body",
      labels: ["feedback"],
    });
    expect(created.number).toBe(7);
    expect(created.htmlUrl).toBe("https://github.com/owner/repo/issues/7");

    expect(String(calls[0]!.input)).toBe("https://api.github.com/repos/owner/repo/issues");
    const posted = JSON.parse(String(calls[0]!.init?.body)) as {
      title: string;
      labels: string[];
    };
    expect(posted.title).toBe("[Missing] Fey Foundling");
    expect(posted.labels).toEqual(["feedback"]);
  });

  it("throws on a non-2xx create", async () => {
    stubFetch(async () => new Response("Validation Failed", { status: 422 }));
    const fakeEnv = { GITHUB_FEEDBACK_REPO: "owner/repo" } as unknown as Env;
    await expect(createIssue(fakeEnv, "token", { title: "t", body: "b" })).rejects.toThrow(
      "create issue failed: 422",
    );
  });
});
