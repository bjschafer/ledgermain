import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "../src/turnstile.js";
import { stubFetch } from "./helpers.js";

afterEach(() => vi.unstubAllGlobals());

describe("verifyTurnstile", () => {
  it("POSTs secret + token to siteverify and returns success + solving hostname", async () => {
    const calls = stubFetch(async () =>
      Response.json({ success: true, hostname: "ledgermain.whizkid.dev" }),
    );
    const result = await verifyTurnstile("secret", "good-token", "203.0.113.9");
    expect(result.success).toBe(true);
    expect(result.hostname).toBe("ledgermain.whizkid.dev");

    expect(calls).toHaveLength(1);
    expect(String(calls[0]!.input)).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(calls[0]!.init?.method).toBe("POST");
    const form = calls[0]!.init?.body as FormData;
    expect(form.get("secret")).toBe("secret");
    expect(form.get("response")).toBe("good-token");
    expect(form.get("remoteip")).toBe("203.0.113.9");
  });

  it("returns failure + error codes on a rejected token", async () => {
    stubFetch(async () =>
      Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
    );
    const result = await verifyTurnstile("secret", "bad-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("invalid-input-response");
  });

  it("fails closed when siteverify is unreachable", async () => {
    stubFetch(() => Promise.reject(new Error("unreachable")));
    const result = await verifyTurnstile("secret", "token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("siteverify-unreachable");
  });

  it("fails closed on a non-JSON siteverify response", async () => {
    stubFetch(async () => new Response("<html>bad gateway</html>", { status: 502 }));
    const result = await verifyTurnstile("secret", "token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("siteverify-unreachable");
  });
});
