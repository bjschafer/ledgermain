import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setName } from "../src/model/doc.js";
import {
	characterExportFilename,
	characterExportJson,
} from "../src/model/exportCharacter.js";

describe("characterExportJson", () => {
	it("round-trips a document through JSON.parse", () => {
		const doc = createEmptyDoc("abc");
		expect(JSON.parse(characterExportJson(doc))).toEqual(doc);
	});
});

describe("characterExportFilename", () => {
	it("slugifies the character name", () => {
		const doc = setName(createEmptyDoc("abc"), "Thalia Stormrider");
		expect(characterExportFilename(doc)).toBe(
			"thalia-stormrider.ledgermain.json",
		);
	});

	it("strips punctuation into single hyphens", () => {
		const doc = setName(createEmptyDoc("abc"), "Tom's Bot #2!!");
		expect(characterExportFilename(doc)).toBe("tom-s-bot-2.ledgermain.json");
	});

	it("falls back to 'character' for an empty/blank name", () => {
		const doc = setName(createEmptyDoc("abc"), "   ");
		expect(characterExportFilename(doc)).toBe("character.ledgermain.json");
	});
});
