import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  buildRequest,
  buildSearchMissDraft,
  DEFAULT_CATEGORY,
  describeUserAgent,
  emptyDraft,
  formatContext,
  MAX_BUILD_LENGTH,
  MAX_MESSAGE_LENGTH,
  validateDraft,
  type FeedbackContext,
} from "../src/model/feedback.js";

const context: FeedbackContext = {
  mode: "build",
  userAgent: "TestBrowser/1.0",
  appVersion: "abc1234",
  viewport: "1440x900",
};

const doc = { id: "c1", name: "Vex" } as unknown as CharacterDoc;

describe("validateDraft", () => {
  it("rejects an empty / whitespace-only message", () => {
    expect(validateDraft({ ...emptyDraft(), message: "" })).toBeTruthy();
    expect(validateDraft({ ...emptyDraft(), message: "   " })).toBeTruthy();
  });

  it("rejects an over-length message", () => {
    const message = "x".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateDraft({ ...emptyDraft(), message })).toBeTruthy();
  });

  it("rejects an over-length contact", () => {
    const draft = { ...emptyDraft(), message: "hi", contact: "y".repeat(300), includeBuild: false };
    expect(validateDraft(draft)).toBeTruthy();
  });

  it("accepts a valid draft (returns null)", () => {
    expect(validateDraft({ ...emptyDraft(), message: "Fey Foundling is missing" })).toBeNull();
  });
});

describe("buildRequest", () => {
  it("trims the message and includes formatted context + token", () => {
    const draft = {
      category: "missing-content",
      message: "  needs it  ",
      contact: "",
      includeBuild: false,
    };
    const req = buildRequest(draft, context, "tok-123");
    expect(req.message).toBe("needs it");
    expect(req.category).toBe("missing-content");
    expect(req.turnstileToken).toBe("tok-123");
    expect(req.context).toBe(formatContext(context));
    expect(req.userAgent).toBe("TestBrowser/1.0");
  });

  it("omits an empty contact but keeps a real one (trimmed)", () => {
    const withContact = buildRequest(
      {
        category: DEFAULT_CATEGORY,
        message: "m",
        contact: "  me@example.com ",
        includeBuild: false,
      },
      context,
      "t",
    );
    expect(withContact.contact).toBe("me@example.com");

    const without = buildRequest(
      { category: DEFAULT_CATEGORY, message: "m", contact: "   ", includeBuild: false },
      context,
      "t",
    );
    expect(without.contact).toBeUndefined();
  });

  it("attaches the character only when opted in", () => {
    const draft = { category: "bug", message: "m", contact: "", includeBuild: false };

    // Opted out: the doc is present but must not ride along.
    expect(buildRequest(draft, context, "t", doc).build).toBeUndefined();
    // Opted in, but nothing to attach.
    expect(buildRequest({ ...draft, includeBuild: true }, context, "t").build).toBeUndefined();

    const opted = buildRequest({ ...draft, includeBuild: true }, context, "t", doc);
    expect(JSON.parse(opted.build!)).toEqual(doc);
  });

  it("drops an attachment that exceeds the cap rather than failing the send", () => {
    const huge = { ...doc, name: "x".repeat(MAX_BUILD_LENGTH) } as unknown as CharacterDoc;
    const req = buildRequest(
      { category: "bug", message: "m", contact: "", includeBuild: true },
      context,
      "t",
      huge,
    );
    expect(req.build).toBeUndefined();
    expect(req.message).toBe("m");
  });
});

describe("describeUserAgent", () => {
  it("names the browser and OS", () => {
    const firefox =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";
    expect(describeUserAgent(firefox)).toBe("Firefox 152 on Windows");

    const safari =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
    expect(describeUserAgent(safari)).toBe("Safari 17 on macOS");
  });

  it("picks the real browser out of Chromium's overlapping claims", () => {
    const chrome =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    expect(describeUserAgent(chrome)).toBe("Chrome 131 on Linux");

    // Edge claims Chrome *and* Safari; the most specific match must win.
    const edge = `${chrome} Edg/131.0.0.0`;
    expect(describeUserAgent(edge)).toBe("Edge 131 on Linux");
  });

  it("falls back to the raw string when nothing matches", () => {
    expect(describeUserAgent("SomeCrawler/9")).toBe("SomeCrawler/9");
  });
});

describe("formatContext", () => {
  it("is a compact, readable, non-identifying one-liner", () => {
    expect(formatContext(context)).toBe(
      "Build mode · TestBrowser/1.0 · viewport 1440x900 · app abc1234",
    );
  });
});

describe("buildSearchMissDraft", () => {
  it("folds the query and picker noun into the message, filed as missing content", () => {
    const draft = buildSearchMissDraft("Fey Foundling", "feat");
    expect(draft.category).toBe(DEFAULT_CATEGORY);
    expect(draft.message).toBe(`Can't find a feat for "Fey Foundling".`);
    expect(draft.contact).toBe("");
    expect(draft.includeBuild).toBe(false);
  });

  it("produces a draft that passes validation as-is", () => {
    const draft = buildSearchMissDraft("Zzznotarealthing", "spell");
    expect(validateDraft(draft)).toBeNull();
  });
});
