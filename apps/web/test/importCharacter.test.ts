import { describe, expect, it } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import { parseImportedDoc } from "../src/model/importCharacter.js";

describe("parseImportedDoc", () => {
  it("accepts a document round-tripped through JSON", () => {
    const doc = createEmptyDoc("abc");
    const parsed = parseImportedDoc(JSON.parse(JSON.stringify(doc)));
    expect(parsed.id).toBe("abc");
    expect(parsed.identity.name).toBe("New Adventurer");
  });

  it("rejects non-object input", () => {
    expect(() => parseImportedDoc("not a doc")).toThrow();
    expect(() => parseImportedDoc(null)).toThrow();
    expect(() => parseImportedDoc(undefined)).toThrow();
    expect(() => parseImportedDoc([1, 2, 3])).toThrow();
  });

  it("rejects objects missing required fields", () => {
    expect(() => parseImportedDoc({ schemaVersion: 1 })).toThrow();
    expect(() =>
      parseImportedDoc({
        id: "x",
        identity: { name: "x" },
        abilities: {},
        build: {},
        // missing `live` and `schemaVersion`
      }),
    ).toThrow();
  });

  it("rejects a doc with an empty id", () => {
    const doc = { ...createEmptyDoc("abc"), id: "" };
    expect(() => parseImportedDoc(doc)).toThrow();
  });

  it("migrates legacy build.spells.prepared into live.spells", () => {
    const base = createEmptyDoc("legacy");
    const legacy = {
      ...base,
      build: {
        ...base.build,
        spells: { known: ["acid-splash"], prepared: [] },
      },
      live: {
        hp: base.live.hp,
        conditions: [],
        activeBuffs: [],
        resources: {},
        // no live.spells — pre-migration shape
      },
    };
    const parsed = parseImportedDoc(legacy);
    expect(parsed.live.spells).toEqual({ prepared: [] });
    expect("prepared" in parsed.build.spells).toBe(false);
    expect(parsed.build.spells.known).toEqual(["acid-splash"]);
  });
});
