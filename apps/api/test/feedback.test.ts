import { afterEach, describe, expect, it, vi } from "vitest";

import { issueBody, issueTitle } from "../src/feedback.js";
import { request, stubFetch } from "./helpers.js";

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

  // `content-length` is a claim, not a fact: a client can omit it (chunked /
  // HTTP2) or send garbage. Either way the cap has to hold, or one request
  // buffers unbounded input into the isolate before any validation runs.
  it("413s an oversized body sent with no content-length at all", async () => {
    const payload = JSON.stringify({ message: "x".repeat(200_000), turnstileToken: "t" });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const res = await request("https://api.test/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      // @ts-expect-error `duplex` is required for a streamed request body
      duplex: "half",
    });
    expect(res.status).toBe(413);
  });

  it("413s an oversized body behind a non-numeric content-length", async () => {
    const res = await post(
      { message: "x".repeat(200_000), turnstileToken: "t" },
      {
        "content-length": "not-a-number",
      },
    );
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

  it("neutralizes issue references so the bot can't backlink-spam", () => {
    const body = issueBody({ ...base, message: "like #74 and torvalds/linux#1" });
    expect(body).not.toContain("#74");
    expect(body).not.toContain("linux#1");
    expect(body).toContain("#​74");
  });

  // A fixed-width fence is closable by content holding that many backticks,
  // which would land raw attacker markdown (mentions included) in the issue.
  it("sizes the fence so fenced content cannot break out", () => {
    const escape = ["Mozilla/5.0", "``````", "", "</details>", "", "cc @maintainer"].join("\n");
    const body = issueBody({ ...base, userAgent: escape });
    const fence = "`".repeat(7);
    expect(body).toContain(`${fence}\n${escape}\n${fence}`);
    expect(body).not.toContain("\n@maintainer");
  });

  it("keeps the fence unclosable for an arbitrarily long backtick run", () => {
    const build = `{"note":"${"`".repeat(20)}"}`;
    const body = issueBody({ ...base, build });
    expect(body).toContain(`${"`".repeat(21)}json`);
  });
});

/**
 * The hostname assertion is what turns "a human solved a CAPTCHA" into "a human
 * solved *our* CAPTCHA on *our* site". It must fail closed on a hostname we
 * can't match — including one siteverify didn't report — or the assertion is
 * skippable rather than enforced.
 */
describe("POST /api/feedback — Turnstile hostname assertion", () => {
  afterEach(() => vi.unstubAllGlobals());

  const siteverify = (payload: object) => stubFetch(() => Promise.resolve(Response.json(payload)));

  it("403s when the challenge was solved on someone else's hostname", async () => {
    siteverify({ success: true, hostname: "evil.example" });
    const res = await post({ message: "hi", turnstileToken: "t" });
    expect(res.status).toBe(403);
  });

  it("403s when siteverify reports no hostname at all", async () => {
    siteverify({ success: true });
    const res = await post({ message: "hi", turnstileToken: "t" });
    expect(res.status).toBe(403);
  });

  it("gets past the assertion for one of our own hostnames", async () => {
    siteverify({ success: true, hostname: "ledgermain.whizkid.dev" });
    const res = await post({ message: "hi", turnstileToken: "t" });
    // Past the gate; the same stub then feeds the GitHub App call nonsense, so
    // anything but a 403 proves the hostname check let this through.
    expect(res.status).not.toBe(403);
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
