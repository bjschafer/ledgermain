import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { verifyTurnstile } from "../src/turnstile.js";

const CHALLENGES = "https://challenges.cloudflare.com";
const SITEVERIFY = { path: "/turnstile/v0/siteverify", method: "POST" } as const;

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.assertNoPendingInterceptors());

describe("verifyTurnstile", () => {
  it("returns success + solving hostname on a passing token", async () => {
    fetchMock
      .get(CHALLENGES)
      .intercept(SITEVERIFY)
      .reply(200, { success: true, hostname: "ledgermain.whizkid.dev" });
    const result = await verifyTurnstile("secret", "good-token");
    expect(result.success).toBe(true);
    expect(result.hostname).toBe("ledgermain.whizkid.dev");
  });

  it("returns failure + error codes on a rejected token", async () => {
    fetchMock
      .get(CHALLENGES)
      .intercept(SITEVERIFY)
      .reply(200, { success: false, "error-codes": ["invalid-input-response"] });
    const result = await verifyTurnstile("secret", "bad-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("invalid-input-response");
  });

  it("fails closed when siteverify is unreachable", async () => {
    fetchMock.get(CHALLENGES).intercept(SITEVERIFY).replyWithError(new Error("unreachable"));
    const result = await verifyTurnstile("secret", "token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("siteverify-unreachable");
  });
});
