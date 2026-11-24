import { describe, expect, it } from "bun:test";

import { buildRequest, type FeedbackContext } from "../src/model/feedback.js";

const context: FeedbackContext = {
  page: "#/spell/fireball",
  userAgent: "UA",
  appVersion: "abc1234",
  viewport: "1440x900",
};

describe("buildRequest", () => {
  it("names the page being viewed and omits a blank contact", () => {
    const req = buildRequest(
      { category: "wrong-numbers", message: "  range is off  ", contact: "  " },
      context,
      "tok",
    );
    expect(req.message).toBe("range is off");
    expect(req.context).toContain("page #/spell/fireball");
    expect("contact" in req).toBe(false);
  });

  // The Worker 400s a context over 500 chars, and summon deep links carry
  // arbitrary query params, so the page must be clipped client-side.
  it("keeps the context under the Worker's cap for a very long hash", () => {
    const req = buildRequest(
      { category: "bug", message: "x", contact: "" },
      { ...context, page: `#/summon?${"a=1&".repeat(400)}` },
      "tok",
    );
    expect(req.context).toContain(`${"a=1&".repeat(10)}`);
    expect(req.context.length).toBeLessThanOrEqual(500);
    expect(req.context).toContain("…");
  });
});
