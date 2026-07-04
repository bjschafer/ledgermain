import { describe, expect, it } from "bun:test";

import { CONDITIONS, CONDITION_IDS, CONDITION_LADDERS } from "../src/index.js";

describe("CONDITION_LADDERS (issue #10)", () => {
  it("every ladder id is a real entry in the CONDITIONS table", () => {
    for (const ladder of CONDITION_LADDERS) {
      for (const id of ladder) {
        expect(CONDITIONS[id]).toBeDefined();
        expect(CONDITION_IDS).toContain(id);
      }
    }
  });

  it("no id appears in more than one ladder, and no ladder repeats an id", () => {
    const seen = new Set<string>();
    for (const ladder of CONDITION_LADDERS) {
      expect(new Set(ladder).size).toBe(ladder.length); // no dupes within a ladder
      for (const id of ladder) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it("covers the pairs called out in issue #10", () => {
    const pairs = CONDITION_LADDERS.map((ladder) => [...ladder]);
    expect(pairs).toContainEqual(["shaken", "frightened", "panicked"]);
    expect(pairs).toContainEqual(["fatigued", "exhausted"]);
    expect(pairs).toContainEqual(["sickened", "nauseated"]);
    expect(pairs).toContainEqual(["dazzled", "blinded"]);
    expect(pairs).toContainEqual(["grappled", "pinned"]);
  });
});

describe("pinned condition table entry (issue #10)", () => {
  it("exists, is not display-only, and carries the RAW -4 AC penalty", () => {
    const pinned = CONDITIONS.pinned;
    expect(pinned).toBeDefined();
    expect(pinned!.displayOnly).toBeFalsy();
    expect(pinned!.changes).toEqual([{ formula: "-4", target: "ac", type: "untyped" }]);
  });
});

describe("panicked condition table entry (issue #10)", () => {
  it("carries -2 saves/skills but no attack penalty (a panicked creature can't attack)", () => {
    const panicked = CONDITIONS.panicked;
    expect(panicked).toBeDefined();
    const targets = panicked!.changes.map((c) => c.target);
    expect(targets).toEqual(expect.arrayContaining(["allSavingThrows", "skills"]));
    expect(targets).not.toContain("attack");
  });
});
