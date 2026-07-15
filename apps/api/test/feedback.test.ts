import { describe, expect, it } from "vitest";

import { request } from "./helpers.js";

const ORIGIN = "http://localhost:5173";

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return request("https://api.test/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Guard-rail coverage for the public feedback endpoint: everything that must be
 * rejected *before* Turnstile/GitHub are ever reached. The Turnstile + GitHub
 * happy path is covered as focused unit tests (turnstile.test.ts,
 * githubApp.test.ts) since driving it end-to-end needs live secrets.
 */
describe("POST /api/feedback — guard rails", () => {
  it("405s a non-POST method", async () => {
    const res = await request("https://api.test/api/feedback", { method: "GET" });
    expect(res.status).toBe(405);
  });

  it("400s invalid JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("400s a missing message", async () => {
    const res = await post({ category: "bug", turnstileToken: "t" });
    expect(res.status).toBe(400);
  });

  it("400s a blank message", async () => {
    const res = await post({ message: "   ", turnstileToken: "t" });
    expect(res.status).toBe(400);
  });

  it("400s a missing turnstile token", async () => {
    const res = await post({ message: "Fey Foundling is missing" });
    expect(res.status).toBe(400);
  });

  it("400s an over-length message", async () => {
    const res = await post({ message: "x".repeat(5000), turnstileToken: "t" });
    expect(res.status).toBe(400);
  });

  it("413s an oversized declared body", async () => {
    const res = await post({ message: "hi", turnstileToken: "t" }, { "content-length": "999999" });
    expect(res.status).toBe(413);
  });
});

describe("CORS for /api/feedback", () => {
  it("preflight allows POST for an allowed origin", async () => {
    const res = await request("https://api.test/api/feedback", {
      method: "OPTIONS",
      headers: { origin: ORIGIN },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });
});
