/**
 * Unit tests for the vendored-note display helpers: HTML emphasis stripping
 * and the per-source dedupe the gear rows use. The last block runs against the
 * real vendored items pack, which is where both problems actually come from.
 */
import { describe, expect, it } from "bun:test";
import { loadRefData } from "@pf1/data-pipeline";
import type { ContextNote } from "@pf1/schema";

import { contextNoteCoverage, noteLines, stripNoteMarkup } from "../src/model/rulesNotes.js";

describe("stripNoteMarkup", () => {
  it("leaves plain prose untouched", () => {
    const text = "+2 circumstance to conceal a small object on your body";
    expect(stripNoteMarkup(text)).toBe(text);
  });

  it("drops HTML emphasis tags without eating the words", () => {
    expect(stripNoteMarkup("+5 <b>Circumstance</b> vs cold weather effects")).toBe(
      "+5 Circumstance vs cold weather effects",
    );
    expect(stripNoteMarkup("<em>+2</em> to <strong>Appraise</strong>")).toBe("+2 to Appraise");
  });

  it("keeps prose placeholders the source author wrote in angle brackets", () => {
    const text = "+2 Trait bonus against poison. In addition, you are immune to <chosen poison>.";
    expect(stripNoteMarkup(text)).toBe(text);
    expect(stripNoteMarkup("+1 Trait bonus on <selected Combat Maneuvers>")).toBe(
      "+1 Trait bonus on <selected Combat Maneuvers>",
    );
  });

  it("turns a block tag into a space and collapses the run", () => {
    expect(stripNoteMarkup("first line<br>second line")).toBe("first line second line");
  });

  it("preserves newlines, which a two-sentence note uses as its own break", () => {
    expect(stripNoteMarkup("+2 to force a door.\nA second person adds +2.")).toContain("\n");
  });
});

describe("noteLines", () => {
  const note = (target: string, text: string): ContextNote => ({ target, text });

  it("returns nothing for an absent or empty list", () => {
    expect(noteLines(undefined)).toEqual([]);
    expect(noteLines([])).toEqual([]);
  });

  it("collapses one rules line that ships once per stat it touches", () => {
    expect(
      noteLines([
        note("cmb.trip", "-4 on rough ice"),
        note("cmb.drag", "-4 on rough ice"),
        note("landSpeed", "full speed on level icy surfaces"),
        note("cmb.bullRush", "-4 on rough ice"),
      ]),
    ).toEqual(["-4 on rough ice", "full speed on level icy surfaces"]);
  });

  it("dedupes on the stripped text, so markup does not split a duplicate", () => {
    expect(
      noteLines([
        note("fort", "+5 <b>Circumstance</b> vs cold"),
        note("ref", "+5 Circumstance vs cold"),
      ]),
    ).toEqual(["+5 Circumstance vs cold"]);
  });

  it("drops a note whose text is nothing but markup", () => {
    expect(noteLines([note("fort", "<b></b>")])).toEqual([]);
  });
});

describe("contextNoteCoverage", () => {
  const note = (target: string, text: string): ContextNote => ({ target, text });

  it("reads a fully-promoted character trait maneuver note as full", () => {
    // Rovagug's Zealot: "+2 Trait bonus on checks made to sunder." promotes
    // whole via VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES.
    expect(
      contextNoteCoverage(
        { catalog: "characterTrait" },
        note("cmb", "+2 Trait bonus on checks made to sunder."),
      ),
    ).toBe("full");
  });

  it("reads a partially-promoted character trait maneuver note as partial", () => {
    // Prankster: the cmb half promotes, but the flatfooted-duration rider in
    // the same note has no Change form and stays prose.
    expect(
      contextNoteCoverage(
        { catalog: "characterTrait" },
        note(
          "cmb",
          "+1 Trait bonus on dirty trick combat maneuver checks.  If you succeed at a dirty trick combat maneuver check against a flatfooted opponent, increase the duration of the condition caused by 1 round.",
        ),
      ),
    ).toBe("partial");
  });

  it("reads a fully-promoted racial trait maneuver note as full", () => {
    expect(
      contextNoteCoverage(
        { catalog: "racialTrait" },
        note("cmd", "+1 bonus against trip maneuvers."),
      ),
    ).toBe("full");
  });

  it("reads a partially-promoted racial trait maneuver note as partial", () => {
    // Half-Orc Destructive: the Strength-check-to-break-objects half of the
    // same benefit is a different target and not this table's concern.
    expect(
      contextNoteCoverage({ catalog: "racialTrait" }, note("cmb", "+2 bonus on sunder attempts.")),
    ).toBe("partial");
  });

  it("reads a fully-promoted standard race maneuver note as full", () => {
    // Dwarf Stability, recovered by STANDARD_RACE_MANEUVER_BONUSES's "Bull
    // Rush and Trip" match against the compendium's own note text.
    expect(
      contextNoteCoverage(
        { catalog: "race", raceName: "Dwarf" },
        note("cmd", "+4 Racial bonus to CMD when resisting a Bull Rush and Trip while on ground."),
      ),
    ).toBe("full");
  });

  it("reads an unpromoted maneuver note as none", () => {
    expect(
      contextNoteCoverage(
        { catalog: "characterTrait" },
        note("cmb", "+1 Trait bonus on checks made to feint."),
      ),
    ).toBe("none");
  });

  it("still reads a fully-promoted save note as full, unchanged by the maneuver route", () => {
    expect(
      contextNoteCoverage(
        { catalog: "characterTrait" },
        note("allSavingThrows", "+2 Trait bonus against fear effects."),
      ),
    ).toBe("full");
  });

  it("reads a note whose target is neither a save nor a maneuver target as none", () => {
    expect(
      contextNoteCoverage({ catalog: "characterTrait" }, note("ac", "+1 dodge bonus to AC.")),
    ).toBe("none");
  });
});

describe("noteLines against the vendored items pack", () => {
  const refData = loadRefData();
  const items = Object.values(refData.items);

  it("finds the equipped-gear notes that motivated this", () => {
    const withNotes = items.filter((i) => (i.contextNotes?.length ?? 0) > 0);
    expect(withNotes.length).toBeGreaterThan(40);
  });

  it("renders no leftover HTML emphasis tag on any item note", () => {
    const leftovers = items.flatMap((i) =>
      noteLines(i.contextNotes)
        .filter((line) => /<\/?(?:b|i|em|strong|u|span)\s*>/i.test(line))
        .map((line) => `${i.name}: ${line}`),
    );
    expect(leftovers).toEqual([]);
  });

  it("reads the Cold-weather outfit note as prose", () => {
    const outfit = items.find((i) => i.name === "Cold-weather outfit");
    expect(outfit).toBeDefined();
    expect(noteLines(outfit!.contextNotes)).toEqual(["+5 Circumstance vs cold weather effects"]);
  });

  it("collapses Skates' five per-stat notes into three distinct lines", () => {
    const skates = items.find((i) => i.name === "Skates");
    expect(skates?.contextNotes).toHaveLength(5);
    expect(noteLines(skates!.contextNotes)).toEqual([
      "-4 on rough ice",
      "full speed on level icy surfaces",
      "-4 on rough ice against bull rush, drag or trip maneuver",
    ]);
  });
});
