import { describe, expect, it } from "bun:test";

import { isLocalHost, shouldShowPreviewNotice } from "../src/model/previewNotice.js";

describe("isLocalHost()", () => {
  it("treats localhost, loopback IPs, and empty hostnames as local", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("::1")).toBe(true);
    expect(isLocalHost("")).toBe(true);
  });

  it("treats any deployed hostname as non-local", () => {
    expect(isLocalHost("ledgermain.example.com")).toBe(false);
    expect(isLocalHost("192.168.1.50")).toBe(false);
  });
});

describe("shouldShowPreviewNotice()", () => {
  it("shows on a deployed host that hasn't dismissed it", () => {
    expect(shouldShowPreviewNotice("ledgermain.example.com", false)).toBe(true);
  });

  it("never shows on localhost, dismissed or not", () => {
    expect(shouldShowPreviewNotice("localhost", false)).toBe(false);
    expect(shouldShowPreviewNotice("localhost", true)).toBe(false);
  });

  it("stays hidden once dismissed on a deployed host", () => {
    expect(shouldShowPreviewNotice("ledgermain.example.com", true)).toBe(false);
  });
});
