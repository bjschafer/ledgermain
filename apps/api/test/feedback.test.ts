import { describe, expect, it } from "vitest";

import { issueBody, issueTitle } from "../src/feedback.js";
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

describe("issueTitle", () => {
  it("tags the title by category", () => {
    expect(issueTitle("idea", "Let me set eidolon stats")).toBe("[Idea] Let me set eidolon stats");
    expect(issueTitle("missing-content", "No Fey Foundling")).toBe("[Missing] No Fey Foundling");
    expect(issueTitle("wrong-numbers", "AC is 2 low")).toBe("[Rules] AC is 2 low");
    expect(issueTitle("bug", "It exploded")).toBe("[Bug] It exploded");
    expect(issueTitle("other", "Hello")).toBe("[Feedback] Hello");
  });

  it("keeps a normal sentence whole, minus its trailing period", () => {
    const message =
      "Being able to manually set an eidolon's starting ability scores would be dope.";
    expect(issueTitle("idea", message)).toBe(
      "[Idea] Being able to manually set an eidolon's starting ability scores would be dope",
    );
  });

  it("truncates on a word boundary, never mid-word", () => {
    const message = `${"alpha bravo ".repeat(20)}charlie`;
    const title = issueTitle("bug", message);
    expect(title.length).toBeLessThanOrEqual(106);
    expect(title.endsWith("…")).toBe(true);
    // Every token that survived is a whole word — no "alph" / "brav" stubs.
    const words = title
      .replace(/^\[Bug\] /, "")
      .replace(/…$/, "")
      .split(" ");
    expect(words.every((w) => w === "alpha" || w === "bravo")).toBe(true);
  });

  it("hard-cuts a single unbroken word rather than emitting a bare ellipsis", () => {
    const title = issueTitle("bug", "x".repeat(200));
    expect(title).toBe(`[Bug] ${"x".repeat(99)}…`);
  });

  it("collapses whitespace and uses only the first line", () => {
    expect(issueTitle("bug", "  AC   looks\nwrong on page 2  ")).toBe("[Bug] AC looks");
  });

  it("neutralizes mentions", () => {
    expect(issueTitle("bug", "@everyone look")).toBe("[Bug] @​everyone look");
  });
});

describe("issueBody", () => {
  const base = { category: "bug", message: "AC is wrong", turnstileToken: "t" };

  it("leads with the message and lists context compactly", () => {
    const body = issueBody({ ...base, context: "Play mode · Firefox 152 on Windows" });
    expect(body).toContain("> AC is wrong");
    expect(body).toContain("**Context:** Play mode · Firefox 152 on Windows");
    expect(body.indexOf("> AC is wrong")).toBeLessThan(body.indexOf("**Category:**"));
  });

  it("tucks the user agent and attached build into collapsed blocks", () => {
    const body = issueBody({
      ...base,
      userAgent: "Mozilla/5.0 (X11)",
      build: '{\n  "id": "c1"\n}',
    });
    expect(body).toContain("<details><summary>User agent</summary>");
    expect(body).toContain("Mozilla/5.0 (X11)");
    expect(body).toContain("<details><summary>Attached character (opt-in)</summary>");
    expect(body).toContain('"id": "c1"');
  });

  it("omits the optional blocks entirely when absent", () => {
    const body = issueBody(base);
    expect(body).not.toContain("<details>");
    expect(body).not.toContain("Contact");
  });

  it("neutralizes mentions in the message and contact", () => {
    const body = issueBody({ ...base, message: "cc @maintainer", contact: "@someone" });
    expect(body).toContain("@​maintainer");
    expect(body).toContain("@​someone");
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
