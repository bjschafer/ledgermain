import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { setCreatureChanges } from "../src/model/creatureChanges.js";

function doc(build: Partial<CharacterDoc["build"]>): CharacterDoc {
  return { build } as unknown as CharacterDoc;
}

const REF4 = [{ target: "ref", type: "untyped", formula: "4" }];

describe("setCreatureChanges", () => {
  it("writes changes onto the named creature, keeping its other fields", () => {
    const next = setCreatureChanges(
      doc({ familiar: { speciesId: "cat", name: "Mortlach", notes: "grumpy" } }),
      "familiar",
      REF4,
    );
    expect(next.build.familiar).toEqual({
      speciesId: "cat",
      name: "Mortlach",
      notes: "grumpy",
      changes: REF4,
    });
  });

  it("drops the field when the list empties", () => {
    const next = setCreatureChanges(
      doc({ familiar: { speciesId: "cat", name: "Mortlach", changes: REF4 } }),
      "familiar",
      [],
    );
    expect(next.build.familiar).toEqual({ speciesId: "cat", name: "Mortlach" });
  });

  it("no-ops when that creature isn't tracked", () => {
    const before = doc({});
    expect(setCreatureChanges(before, "animalCompanion", REF4)).toBe(before);
  });
});
