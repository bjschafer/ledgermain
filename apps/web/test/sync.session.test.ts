import { describe, expect, test } from "bun:test";

import {
  clearStoredToken,
  consumeSessionFragment,
  getStoredToken,
  loginUrl,
  parseSessionFragment,
  setStoredToken,
} from "../src/sync/session.js";

describe("parseSessionFragment", () => {
  test("extracts a token from a #session=... fragment", () => {
    expect(parseSessionFragment("#session=abc123")).toBe("abc123");
  });

  test("URL-decodes the token", () => {
    expect(parseSessionFragment("#session=a%2Bb")).toBe("a+b");
  });

  test("returns null for an unrelated or empty fragment", () => {
    expect(parseSessionFragment("")).toBeNull();
    expect(parseSessionFragment("#other=stuff")).toBeNull();
  });
});

describe("loginUrl", () => {
  test("points at the API's GitHub OAuth start route with redirect_uri", () => {
    const url = new URL(loginUrl("https://api.example.com", "https://app.example.com/"));
    expect(url.origin).toBe("https://api.example.com");
    expect(url.pathname).toBe("/auth/github/start");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/");
  });
});

describe("token storage (no localStorage in the bun test runtime)", () => {
  // Mirrors db/characters.ts's "storage unavailable" posture: every function
  // here degrades gracefully (never throws) when `localStorage` doesn't
  // exist, which is exactly bun's test environment — a useful free test of
  // the fallback path itself, not just a limitation to work around.
  test("getStoredToken returns null instead of throwing", () => {
    expect(getStoredToken()).toBeNull();
  });

  test("setStoredToken/clearStoredToken don't throw", () => {
    expect(() => setStoredToken("token")).not.toThrow();
    expect(() => clearStoredToken()).not.toThrow();
  });
});

describe("consumeSessionFragment", () => {
  test("returns null and touches nothing when there's no fragment", () => {
    let replaceStateCalls = 0;
    const location = { hash: "", pathname: "/", search: "" };
    const history = {
      replaceState: () => {
        replaceStateCalls++;
      },
    };
    expect(consumeSessionFragment(location, history)).toBeNull();
    expect(replaceStateCalls).toBe(0);
  });

  test("strips the fragment from the URL bar when a token is present", () => {
    const location = { hash: "#session=tok-123", pathname: "/app", search: "?x=1" };
    let replacedTo: string | undefined;
    const history = {
      replaceState: (_data: unknown, _title: string, url?: string | URL | null) => {
        replacedTo = url == null ? undefined : String(url);
      },
    };
    expect(consumeSessionFragment(location, history)).toBe("tok-123");
    expect(replacedTo).toBe("/app?x=1");
  });
});
