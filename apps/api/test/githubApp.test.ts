import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createIssue, fetchInstallationToken, signAppJwt } from "../src/githubApp.js";

const GITHUB = "https://api.github.com";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.assertNoPendingInterceptors());

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
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const wrapped = b64.match(/.{1,64}/g)!.join("\n");
  return { pem: `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`, publicKey: pair.publicKey };
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
  it("POSTs to the installation endpoint and returns the token", async () => {
    fetchMock
      .get(GITHUB)
      .intercept({ path: "/app/installations/99/access_tokens", method: "POST" })
      .reply(201, { token: "ghs_installation", expires_at: "2026-01-01T00:00:00Z" });
    const result = await fetchInstallationToken("signed.jwt.here", "99");
    expect(result.token).toBe("ghs_installation");
    expect(result.expires_at).toBe("2026-01-01T00:00:00Z");
  });
});

describe("createIssue", () => {
  it("POSTs the issue to the configured repo and returns number + url", async () => {
    const env = { GITHUB_FEEDBACK_REPO: "owner/repo" } as unknown as Env;
    fetchMock
      .get(GITHUB)
      .intercept({ path: "/repos/owner/repo/issues", method: "POST" })
      .reply(201, { number: 7, html_url: "https://github.com/owner/repo/issues/7" });
    const created = await createIssue(env, "token", {
      title: "[Missing] Fey Foundling",
      body: "body",
      labels: ["feedback"],
    });
    expect(created.number).toBe(7);
    expect(created.htmlUrl).toBe("https://github.com/owner/repo/issues/7");
  });
});
