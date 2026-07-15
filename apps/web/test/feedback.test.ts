import { describe, expect, it } from "bun:test";

import {
  buildRequest,
  DEFAULT_CATEGORY,
  emptyDraft,
  formatContext,
  MAX_MESSAGE_LENGTH,
  validateDraft,
  type FeedbackContext,
} from "../src/model/feedback.js";

const context: FeedbackContext = { mode: "build", userAgent: "TestBrowser/1.0" };

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
    const draft = { ...emptyDraft(), message: "hi", contact: "y".repeat(300) };
    expect(validateDraft(draft)).toBeTruthy();
  });

  it("accepts a valid draft (returns null)", () => {
    expect(validateDraft({ ...emptyDraft(), message: "Fey Foundling is missing" })).toBeNull();
  });
});

describe("buildRequest", () => {
  it("trims the message and includes formatted context + token", () => {
    const draft = { category: "missing-content", message: "  needs it  ", contact: "" };
    const req = buildRequest(draft, context, "tok-123");
    expect(req.message).toBe("needs it");
    expect(req.category).toBe("missing-content");
    expect(req.turnstileToken).toBe("tok-123");
    expect(req.context).toBe(formatContext(context));
  });

  it("omits an empty contact but keeps a real one (trimmed)", () => {
    const withContact = buildRequest(
      { category: DEFAULT_CATEGORY, message: "m", contact: "  me@example.com " },
      context,
      "t",
    );
    expect(withContact.contact).toBe("me@example.com");

    const without = buildRequest(
      { category: DEFAULT_CATEGORY, message: "m", contact: "   " },
      context,
      "t",
    );
    expect(without.contact).toBeUndefined();
  });
});

describe("formatContext", () => {
  it("is a compact, non-identifying one-liner", () => {
    expect(formatContext(context)).toBe("mode=build; TestBrowser/1.0");
  });
});
