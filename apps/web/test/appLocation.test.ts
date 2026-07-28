import { describe, expect, it } from "bun:test";

import {
  absoluteLink,
  formatLocationHash,
  parseLocationHash,
  sameLocation,
  whatsNewHash,
} from "../src/model/appLocation.js";

describe("parseLocationHash", () => {
  it("reads a bare mode", () => {
    expect(parseLocationHash("#/play")).toEqual({ mode: "play" });
    expect(parseLocationHash("#/build")).toEqual({ mode: "build" });
    expect(parseLocationHash("#/settings")).toEqual({ mode: "settings" });
  });

  it("reads a mode plus section anchor", () => {
    expect(parseLocationHash("#/settings/settings-whats-new")).toEqual({
      mode: "settings",
      section: "settings-whats-new",
    });
    expect(parseLocationHash("#/build/section-feats")).toEqual({
      mode: "build",
      section: "section-feats",
    });
  });

  it("accepts a hash with the leading # already stripped", () => {
    expect(parseLocationHash("/play/play-hp")).toEqual({ mode: "play", section: "play-hp" });
  });

  it("resolves the whats-new alias", () => {
    expect(parseLocationHash(whatsNewHash())).toEqual({
      mode: "settings",
      section: "settings-whats-new",
    });
  });

  it("leaves fragments that aren't ours alone", () => {
    // The OAuth callback's token fragment (sync/session.ts) must survive until
    // that module consumes it.
    expect(parseLocationHash("#session=abc123")).toBeNull();
    expect(parseLocationHash("")).toBeNull();
    expect(parseLocationHash("#")).toBeNull();
    expect(parseLocationHash("#/")).toBeNull();
  });

  it("rejects an unknown mode rather than guessing", () => {
    expect(parseLocationHash("#/tracker")).toBeNull();
    expect(parseLocationHash("#/whats-new/extra")).toBeNull();
    expect(parseLocationHash("#/build/a/b")).toBeNull();
  });

  it("drops a section id that couldn't be one of ours, keeping the mode", () => {
    expect(parseLocationHash("#/build/<script>")).toEqual({ mode: "build" });
  });
});

describe("formatLocationHash", () => {
  it("round-trips through the parser", () => {
    for (const loc of [
      { mode: "build" as const },
      { mode: "play" as const, section: "play-conditions" },
      { mode: "settings" as const, section: "settings-whats-new" },
    ]) {
      expect(parseLocationHash(formatLocationHash(loc))).toEqual(loc);
    }
  });
});

describe("sameLocation", () => {
  it("compares mode and section together", () => {
    expect(sameLocation({ mode: "play" }, { mode: "play" })).toBe(true);
    expect(sameLocation({ mode: "play" }, { mode: "build" })).toBe(false);
    expect(sameLocation({ mode: "play" }, { mode: "play", section: "play-hp" })).toBe(false);
  });
});

describe("absoluteLink", () => {
  it("replaces any existing fragment", () => {
    expect(absoluteLink("https://ledgermain.example/#/play", "#/whats-new")).toBe(
      "https://ledgermain.example/#/whats-new",
    );
  });

  it("keeps the path and query of wherever the app is served", () => {
    expect(absoluteLink("http://192.168.1.4:5173/?debug=1", "#/whats-new")).toBe(
      "http://192.168.1.4:5173/?debug=1#/whats-new",
    );
  });
});
