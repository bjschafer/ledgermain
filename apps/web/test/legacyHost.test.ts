import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import sampleCharacterJson from "../src/data/sample-character.json";
import { createEmptyDoc } from "../src/model/doc.js";
import {
  decodeHandoff,
  encodeHandoff,
  isWorthMoving,
  parseHandoffHash,
  parseMoveHash,
  planHandoff,
  type HandoffCharacter,
} from "../src/model/legacyHost.js";

const SAMPLE_ID = sampleCharacterJson.id;

function named(id: string, name: string, version = 3): CharacterDoc {
  const doc = createEmptyDoc(id);
  return { ...doc, version, identity: { ...doc.identity, name } };
}

function character(id: string, name: string): HandoffCharacter {
  return { doc: named(id, name), log: [] };
}

describe("isWorthMoving", () => {
  it("leaves behind what the app created on its own", () => {
    expect(isWorthMoving(sampleCharacterJson as unknown as CharacterDoc, SAMPLE_ID)).toBe(false);
    expect(isWorthMoving(createEmptyDoc("blank"), SAMPLE_ID)).toBe(false);
  });

  it("moves an edited sample and an unedited import", () => {
    const sample = sampleCharacterJson as unknown as CharacterDoc;
    expect(isWorthMoving({ ...sample, version: 2 }, SAMPLE_ID)).toBe(true);
    // A file or Pathbuilder import arrives at version 1 with real content.
    expect(isWorthMoving(named("imported", "Ayla", 1), SAMPLE_ID)).toBe(true);
  });
});

describe("handoff payloads", () => {
  it("round-trips characters with their session logs", async () => {
    const log = [{ id: "l1", at: 1_700_000_000_000, text: "Took 6", tone: "harm", kind: "hp" }];
    const encoded = await encodeHandoff({
      part: 1,
      parts: 1,
      activeId: "a",
      characters: [{ doc: named("a", "Kordrek"), log: log as HandoffCharacter["log"] }],
    });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = await decodeHandoff(encoded);
    expect(decoded.part).toBe(1);
    expect(decoded.activeId).toBe("a");
    expect(decoded.characters[0]?.doc.identity.name).toBe("Kordrek");
    expect(decoded.characters[0]?.log.map((e) => e.text)).toEqual(["Took 6"]);
  });

  it("rejects a damaged link and a forged character", async () => {
    await expect(decodeHandoff("not-a-payload")).rejects.toThrow("damaged");

    const forged = await encodeHandoff({
      part: 1,
      parts: 1,
      activeId: null,
      characters: [{ doc: { id: "x" } as unknown as CharacterDoc, log: [] }],
    });
    await expect(decodeHandoff(forged)).rejects.toThrow("character export");
  });
});

describe("planHandoff", () => {
  it("splits into numbered parts under the budget, keeping every character once", async () => {
    const characters = [character("c", "Cael"), character("a", "Ayla"), character("b", "Bram")];
    const single = await encodeHandoff({
      part: 1,
      parts: 1,
      activeId: null,
      characters: [characters[0]!],
    });
    // Room for two per part, not three.
    const budget = Math.floor(single.length * 2.5);

    const plan = await planHandoff(characters, "c", budget);
    expect(plan.tooLarge).toEqual([]);
    expect(plan.parts).toHaveLength(2);

    const decoded = await Promise.all(plan.parts.map(decodeHandoff));
    expect(decoded.map((p) => [p.part, p.parts])).toEqual([
      [1, 2],
      [2, 2],
    ]);
    for (const encoded of plan.parts) expect(encoded.length).toBeLessThanOrEqual(budget);
    // Fixed order, so a revisit to the old address rebuilds the same parts.
    expect(decoded.flatMap((p) => p.characters.map((c) => c.doc.id))).toEqual(["a", "b", "c"]);
    // The open character is named only in the part that carries it.
    expect(decoded.map((p) => p.activeId)).toEqual([null, "c"]);
  });

  it("sets aside a character too large for any link", async () => {
    const plan = await planHandoff([character("a", "Ayla")], null, 10);
    expect(plan.parts).toEqual([]);
    expect(plan.tooLarge.map((d) => d.id)).toEqual(["a"]);
  });
});

describe("fragments", () => {
  it("reads only well-formed handoff and move fragments", () => {
    expect(parseHandoffHash("#handoff=abc_-9")).toBe("abc_-9");
    expect(parseHandoffHash("#/play")).toBeNull();
    expect(parseMoveHash("#move=2")).toBe(2);
    expect(parseMoveHash("#move=0")).toBeNull();
    expect(parseMoveHash("#move=")).toBeNull();
  });
});
