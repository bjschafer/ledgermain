import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import {
  addClass,
  createEmptyDoc,
  setClassLevel,
  setName,
  toggleKnownSpell,
} from "../src/model/doc.js";
import {
  descriptionToMarkdown,
  spellbookFilename,
  spellbookMarkdown,
} from "../src/model/exportSpellbook.js";

const ref = loadRefData();

function spellId(name: string): string {
  const entry = Object.entries(ref.spells).find(([, s]) => s.name === name);
  if (!entry) throw new Error(`spell not found: ${name}`);
  return entry[0];
}

function wizardDoc(level: number) {
  let doc = createEmptyDoc("t");
  doc = addClass(doc, "wizard");
  doc = setClassLevel(doc, "wizard", level);
  return doc;
}

describe("spellbookMarkdown", () => {
  it("renders a header and a per-class section with spell statblocks", () => {
    let doc = setName(wizardDoc(3), "Thalia");
    const id = ref.spellLists["wizard"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, id, "wizard");
    const sheet = compute(doc, ref);
    const md = spellbookMarkdown(doc, sheet, ref);

    expect(md).toContain("# Thalia: Spellbook");
    expect(md).toContain("## Wizard Spellbook (CL 3)");
    expect(md).toContain(`#### ${ref.spells[id]!.name}`);
    expect(md).toContain("- **Casting Time:**");
    expect(md).toContain("- **Range:**");
    // The description is HTML in RefData but must arrive as readable text.
    const plain = descriptionToMarkdown(ref.spells[id]!.description!);
    expect(plain.length).toBeGreaterThan(0);
    expect(md).toContain(plain);
    expect(md).not.toMatch(/<\/?(p|strong|em|ul|li)\b/i);
  });

  it("includes the free cantrips a grantsAllCantrips caster knows", () => {
    let doc = wizardDoc(3);
    const id = ref.spellLists["wizard"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, id, "wizard");
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    expect(md).toContain("### Level 0 (cantrips)");
    expect(md).toContain(`#### ${ref.spells[spellId("Detect Magic")]!.name}`);
    expect(md).toContain("### Level 1\n\n#### ");
  });

  it("resolves @cl-scaled values at the caster's level", () => {
    let doc = wizardDoc(7);
    const magicMissile = spellId("Magic Missile");
    doc = toggleKnownSpell(doc, ref, magicMissile, "wizard");
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    // 1d4+1 force per missile, four missiles at CL 7.
    expect(md).toContain("1d4+1 force ×4");
  });

  it("resolves a range band against the caster level", () => {
    let doc = wizardDoc(7);
    const id = spellId("Magic Missile");
    doc = toggleKnownSpell(doc, ref, id, "wizard");
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    // Close range: 25 ft. + 5 ft./2 levels = 40 ft. at CL 7.
    expect(md).toContain("Close (40 ft.)");
  });

  it("formats school and descriptors statblock-style", () => {
    let doc = wizardDoc(3);
    const id = spellId("Magic Missile");
    doc = toggleKnownSpell(doc, ref, id, "wizard");
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    expect(md).toContain("- **School:** evocation [force]");
  });

  it("notes a preparesFromClassList caster instead of dumping the class list", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "cleric");
    doc = setClassLevel(doc, "cleric", 5);
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    expect(md).toContain("## Cleric (CL 5)");
    expect(md).toContain("no spellbook to export");
    expect(md).not.toContain("#### ");
  });

  it("names spell ids the reference data cannot resolve", () => {
    let doc = wizardDoc(3);
    doc = {
      ...doc,
      build: { ...doc.build, spells: { ...doc.build.spells, known: ["not-a-spell"] } },
    };
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    expect(md).toContain("Unknown spell ids: not-a-spell");
  });

  it("returns an empty string for a character with no spells at all", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "fighter");
    expect(spellbookMarkdown(doc, compute(doc, ref), ref)).toBe("");
  });

  it("gives each multiclass caster class its own section", () => {
    let doc = createEmptyDoc("t");
    doc = addClass(doc, "wizard");
    doc = setClassLevel(doc, "wizard", 5);
    doc = addClass(doc, "sorcerer");
    doc = setClassLevel(doc, "sorcerer", 5);
    const sorcId = ref.spellLists["sorcerer"]![1]![0]!;
    doc = toggleKnownSpell(doc, ref, sorcId, "sorcerer");
    const md = spellbookMarkdown(doc, compute(doc, ref), ref);

    expect(md).toContain("## Wizard Spellbook (CL 5)");
    expect(md).toContain("## Sorcerer Spells Known (CL 5)");
  });
});

describe("descriptionToMarkdown", () => {
  it("converts paragraphs, emphasis, and lists", () => {
    const out = descriptionToMarkdown(
      "<p>A <strong>bold</strong> and <em>italic</em> phrase.</p><ul><li><p>item one</p></li><li><p>item two</p></li></ul>",
    );
    expect(out).toContain("**bold**");
    expect(out).toContain("*italic*");
    expect(out).toContain("- item one");
    expect(out).toContain("- item two");
    expect(out).not.toContain("<");
  });

  it("unescapes entities", () => {
    expect(descriptionToMarkdown("<p>fire &amp; ice &mdash; done</p>")).toBe("fire & ice — done");
  });
});

describe("spellbookFilename", () => {
  it("slugs the character name", () => {
    const doc = createEmptyDoc("t");
    doc.identity = { ...doc.identity, name: "Thalia Stormrider" };
    expect(spellbookFilename(doc)).toBe("thalia-stormrider-spellbook.md");
  });

  it("falls back for a character with no name", () => {
    const doc = setName(createEmptyDoc("t"), "");
    expect(spellbookFilename(doc)).toBe("character-spellbook.md");
  });
});
