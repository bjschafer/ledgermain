/**
 * Unit tests for `model/importExternalFile.ts` — the content-based dispatcher
 * behind the Settings "Import character…" file picker (issue #3): a native
 * Ledgermain export, a Pathbuilder 1e export, and a Hero Lab classic export
 * all go through one file input, disambiguated by content.
 */
import { loadRefData } from "@pf1/data-pipeline";
import { describe, expect, it } from "bun:test";

import { characterExportJson } from "../src/model/exportCharacter.js";
import { createEmptyDoc, setName } from "../src/model/doc.js";
import { importCharacterFile } from "../src/model/importExternalFile.js";

const ref = loadRefData();

describe("importCharacterFile", () => {
  it("recognizes a native Ledgermain export and reports nothing (native round-trip, no report)", () => {
    const doc = setName(createEmptyDoc("abc"), "Thalia");
    const { doc: parsed, report } = importCharacterFile(characterExportJson(doc), ref);
    expect(parsed.identity.name).toBe("Thalia");
    expect(report).toBeUndefined();
  });

  it("falls back to the Pathbuilder importer for JSON that isn't a Ledgermain export", () => {
    const raw = JSON.stringify({ name: "Grombar", race: "Human" });
    const { doc, report } = importCharacterFile(raw, ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(report?.source).toBe("pathbuilder");
  });

  it("routes XML content (leading '<') to the Hero Lab importer", () => {
    const xml = '<character name="Grombar" race="Human"/>';
    const { doc, report } = importCharacterFile(xml, ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(report?.source).toBe("herolab");
  });

  it("tolerates leading whitespace before the XML declaration", () => {
    const xml = '   \n<character name="Grombar"/>';
    const { doc } = importCharacterFile(xml, ref);
    expect(doc.identity.name).toBe("Grombar");
  });

  it("throws a clean error for content that's neither valid JSON nor XML", () => {
    expect(() => importCharacterFile("not json, not xml, just garbage {{{", ref)).toThrow();
  });

  it("throws a clean error for valid JSON that isn't an object (e.g. a bare array)", () => {
    expect(() => importCharacterFile("[1,2,3]", ref)).toThrow();
  });
});
