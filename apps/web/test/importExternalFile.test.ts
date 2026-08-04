/**
 * Unit tests for `model/importExternalFile.ts` — the content-based dispatcher
 * behind the Settings "Import character…" file picker: a native Ledgermain
 * export, a Pathbuilder 1e export, a Hero Lab `.por` portfolio, and a bare
 * Hero Lab statblock XML all go through one file input, disambiguated by
 * content.
 */
import { loadRefData } from "@pf1/data-pipeline";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

import { characterExportJson } from "../src/model/exportCharacter.js";
import { createEmptyDoc, setName } from "../src/model/doc.js";
import { importCharacterFile } from "../src/model/importExternalFile.js";

const ref = loadRefData();

/** The dispatcher reads bytes (a `.por` is binary), so text fixtures get encoded. */
const bytes = (text: string) => new TextEncoder().encode(text);

/** The error a rejected import threw, or undefined if it resolved. */
async function rejection(input: Uint8Array): Promise<unknown> {
  try {
    await importCharacterFile(input, ref);
    return undefined;
  } catch (err) {
    return err;
  }
}

describe("importCharacterFile", () => {
  it("recognizes a native Ledgermain export and reports nothing (native round-trip, no report)", async () => {
    const doc = setName(createEmptyDoc("abc"), "Thalia");
    const { doc: parsed, report } = await importCharacterFile(bytes(characterExportJson(doc)), ref);
    expect(parsed.identity.name).toBe("Thalia");
    expect(report).toBeUndefined();
  });

  it("falls back to the Pathbuilder importer for JSON that isn't a Ledgermain export", async () => {
    const raw = JSON.stringify({ name: "Grombar", race: "Human" });
    const { doc, report } = await importCharacterFile(bytes(raw), ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(report?.source).toBe("pathbuilder");
  });

  it("routes XML content (leading '<') to the Hero Lab importer", async () => {
    const xml = '<character name="Grombar" race="Human"/>';
    const { doc, report } = await importCharacterFile(bytes(xml), ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(report?.source).toBe("herolab");
  });

  it("tolerates leading whitespace before the XML declaration", async () => {
    const xml = '   \n<character name="Grombar"/>';
    const { doc } = await importCharacterFile(bytes(xml), ref);
    expect(doc.identity.name).toBe("Grombar");
  });

  it("routes a .por portfolio (ZIP magic) to the Hero Lab portfolio importer", async () => {
    const por = new Uint8Array(readFileSync("test/fixtures/herolab-crush.por"));
    const { doc, report } = await importCharacterFile(por, ref);
    expect(doc.identity.name).toBe("Crush");
    expect(report?.source).toBe("herolab");
  });

  it("throws a clean error for content that's neither valid JSON nor XML", async () => {
    expect(await rejection(bytes("not json, not xml, just garbage {{{"))).toBeInstanceOf(Error);
  });

  it("throws a clean error for valid JSON that isn't an object (e.g. a bare array)", async () => {
    expect(await rejection(bytes("[1,2,3]"))).toBeInstanceOf(Error);
  });
});
