/**
 * The summon route is a published deep-link contract (external callers build
 * these URLs), so its parsing is pinned here: additions only, no param renames,
 * unknown input degrades gracefully instead of erroring.
 */
import { describe, expect, it } from "bun:test";

import { parseHash, summonHref, type Route } from "../src/hooks/useHashRoute.js";

function summonRoute(hash: string): Extract<Route, { kind: "summon" }> {
  const route = parseHash(hash);
  if (route.kind !== "summon") throw new Error(`expected a summon route, got ${route.kind}`);
  return route;
}

describe("parseHash", () => {
  it("keeps the existing routes", () => {
    expect(parseHash("")).toEqual({ kind: "search" });
    expect(parseHash("#/")).toEqual({ kind: "search" });
    expect(parseHash("#/spells/fireball")).toEqual({
      kind: "detail",
      collection: "spells",
      id: "fireball",
    });
    expect(parseHash("#/not-a-collection/x")).toEqual({ kind: "search" });
  });

  it("parses the summon route at every depth", () => {
    expect(parseHash("#/summon")).toEqual({
      kind: "summon",
      spell: undefined,
      level: undefined,
      params: { feats: [], template: undefined, creature: undefined },
    });
    expect(parseHash("#/summon/sm")).toMatchObject({
      kind: "summon",
      spell: "sm",
      level: undefined,
    });
    expect(parseHash("#/summon/sna/3")).toMatchObject({ kind: "summon", spell: "sna", level: 3 });
  });

  it("parses the full deep-link shape", () => {
    const route = parseHash(
      "#/summon/sm/5?feats=augment-summoning,superior-summoning&template=celestial&creature=dog_riding_dog",
    );
    expect(route).toEqual({
      kind: "summon",
      spell: "sm",
      level: 5,
      params: {
        feats: ["augment-summoning", "superior-summoning"],
        template: "celestial",
        creature: "dog_riding_dog",
      },
    });
  });

  it("degrades gracefully on junk instead of erroring", () => {
    expect(parseHash("#/summon/xx/5")).toMatchObject({ kind: "summon", spell: undefined });
    expect(parseHash("#/summon/sm/12")).toMatchObject({
      kind: "summon",
      spell: "sm",
      level: undefined,
    });
    expect(parseHash("#/summon/sm/abc")).toMatchObject({ kind: "summon", level: undefined });
    // Unknown query params are ignored, known ones still parse.
    expect(parseHash("#/summon/sm/1?future=thing&feats=augment-summoning")).toMatchObject({
      params: { feats: ["augment-summoning"] },
    });
    expect(summonRoute("#/summon/sm/1?cl=0").params.cl).toBeUndefined();
    expect(summonRoute("#/summon/sm/1?cl=banana").params.cl).toBeUndefined();
  });

  it("carries caster level when given", () => {
    expect(summonRoute("#/summon/sm/5?cl=9").params.cl).toBe(9);
    expect(summonRoute(summonHref("sm", 5, { cl: 9 })).params.cl).toBe(9);
  });

  it("round-trips through summonHref", () => {
    const href = summonHref("sm", 5, {
      feats: ["augment-summoning"],
      template: "celestial",
      creature: "dog",
    });
    expect(parseHash(href)).toEqual({
      kind: "summon",
      spell: "sm",
      level: 5,
      params: { feats: ["augment-summoning"], template: "celestial", creature: "dog" },
    });
    expect(summonHref()).toBe("#/summon");
    expect(summonHref("sna", 2)).toBe("#/summon/sna/2");
  });
});
