import { describe, expect, it } from "bun:test";

import { parseLocationHash } from "../src/model/appLocation.js";
import { parseShareHash, shareHash, shareReadiness } from "../src/model/shareLink.js";

const TOKEN = "0123456789abcdef".repeat(4);

describe("parseShareHash", () => {
  it("round-trips a token through the fragment", () => {
    expect(parseShareHash(shareHash(TOKEN))).toBe(TOKEN);
  });

  it("accepts the fragment with its # already stripped", () => {
    expect(parseShareHash(`/shared/${TOKEN}`)).toBe(TOKEN);
  });

  it("rejects anything that isn't exactly a share token", () => {
    expect(parseShareHash("")).toBeNull();
    expect(parseShareHash("#/play")).toBeNull();
    expect(parseShareHash(`#session=${TOKEN}`)).toBeNull();
    expect(parseShareHash("#/shared/abc")).toBeNull();
    expect(parseShareHash(`#/shared/${TOKEN.toUpperCase()}`)).toBeNull();
    expect(parseShareHash(`#/shared/${TOKEN}/extra`)).toBeNull();
  });

  it("is a fragment the player's own location parser leaves alone", () => {
    expect(parseLocationHash(shareHash(TOKEN))).toBeNull();
  });
});

describe("shareReadiness", () => {
  it("pushes a character the server has never seen", () => {
    expect(shareReadiness(3, undefined)).toBe("push");
  });

  it("pushes when this device saved past the server's copy", () => {
    expect(shareReadiness(5, 4)).toBe("push");
  });

  it("is ready when both sides hold the same version", () => {
    expect(shareReadiness(4, 4)).toBe("ready");
  });

  it("refuses to share over newer changes from another device", () => {
    expect(shareReadiness(4, 6)).toBe("newer-elsewhere");
  });
});
