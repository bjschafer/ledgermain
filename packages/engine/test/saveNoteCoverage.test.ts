/**
 * Fixture tests for `saveNoteCoverage` (situational-saves UI truth-telling):
 * the single function the UI asks whether a note's bonus is already fully
 * expressed as a `Change` ("full"), only partly ("partial", a documented
 * remainder still needs hand-applying), or not promoted at all ("none").
 * Mirrors the doc comments in `vendored-trait-save-notes.ts`, `race-save-
 * notes.ts`, and `buff-effects.ts` that call out which entries are partial.
 */

import { describe, expect, it } from "bun:test";

import {
  BUFF_SAVE_NOTE_COVERAGE,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
  saveNoteCoverage,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "../src/index.js";

function note(text: string, target = "allSavingThrows") {
  return { target, text };
}

describe("saveNoteCoverage — character traits", () => {
  it("a fully-promoted note reports full", () => {
    expect(
      saveNoteCoverage({ catalog: "characterTrait" }, note("+2 Trait bonus against fear effects.")),
    ).toBe("full");
  });

  it("a documented partial promotion reports partial (Draconic Lineage: the dragon-created-effects half stays prose)", () => {
    expect(
      saveNoteCoverage(
        { catalog: "characterTrait" },
        note(
          "+1 Trait bonus against fear and against any effect created by a creature of the dragon type.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpromoted note reports none", () => {
    expect(saveNoteCoverage({ catalog: "characterTrait" }, note("Some unrelated prose."))).toBe(
      "none",
    );
  });

  it("a note on a different target is never promoted, even with matching text", () => {
    expect(
      saveNoteCoverage(
        { catalog: "characterTrait" },
        note("+2 Trait bonus against fear effects.", "skill.per"),
      ),
    ).toBe("none");
  });
});

describe("saveNoteCoverage — vendored racial traits", () => {
  it("a fully-promoted note reports full", () => {
    expect(
      saveNoteCoverage({ catalog: "racialTrait" }, note("+2 Racial bonus against disease.")),
    ).toBe("full");
  });

  it("a documented partial promotion reports partial (hexes carry no descriptor, so they stay in the note)", () => {
    expect(
      saveNoteCoverage(
        { catalog: "racialTrait" },
        note(
          "+2 Racial bonus against curse effects and hexes. This bonus stacks with the bonus granted by halfling luck.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpromoted note reports none", () => {
    expect(saveNoteCoverage({ catalog: "racialTrait" }, note("Not a real vendored note."))).toBe(
      "none",
    );
  });
});

describe("saveNoteCoverage — standard racial traits (race-keyed substring match)", () => {
  it("a fully-promoted race note reports full (Dwarf Hardy)", () => {
    expect(
      saveNoteCoverage(
        { catalog: "race", raceName: "Dwarf" },
        note("+2 Racial vs Poisons, Spells and Spell-likes"),
      ),
    ).toBe("full");
  });

  it("a documented partial promotion reports partial (Android: paralysis has no vocabulary entry)", () => {
    expect(
      saveNoteCoverage(
        { catalog: "race", raceName: "Android" },
        note("+4 Racial vs Mind Affecting, Paralysis, Poison, Stun"),
      ),
    ).toBe("partial");
  });

  it("a race with no promotion table reports none", () => {
    expect(saveNoteCoverage({ catalog: "race", raceName: "Half-Orc" }, note("anything"))).toBe(
      "none",
    );
  });

  it("a race that has a table but no matching note text reports none", () => {
    expect(
      saveNoteCoverage({ catalog: "race", raceName: "Dwarf" }, note("unrelated dwarf note")),
    ).toBe("none");
  });
});

describe("saveNoteCoverage — buffs (name-keyed)", () => {
  it("Bless's fear note reports full", () => {
    expect(
      saveNoteCoverage({ catalog: "buff", buffName: "Bless" }, note("+1 Morale vs Fear effects")),
    ).toBe("full");
  });

  it("Death Ward's note reports partial ('even if a save is not normally allowed' has no Change form)", () => {
    expect(
      saveNoteCoverage(
        { catalog: "buff", buffName: "Death Ward" },
        note(
          "+4 Morale vs death spells and magical death effects, even if a save is not normally allowed.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpatched buff reports none", () => {
    expect(saveNoteCoverage({ catalog: "buff", buffName: "Mage Armor" }, note("anything"))).toBe(
      "none",
    );
  });
});

describe("drift guards", () => {
  it("every partially-promoted character-trait key is a real key in the main table", () => {
    for (const key of PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES) {
      expect(key in VENDORED_CHARACTER_TRAIT_SAVE_NOTES).toBe(true);
    }
  });

  it("every partially-promoted racial-trait key is a real key in the main table", () => {
    for (const key of PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES) {
      expect(key in VENDORED_RACIAL_TRAIT_SAVE_NOTES).toBe(true);
    }
  });

  it("BUFF_SAVE_NOTE_COVERAGE only ever says full or partial, never a third value", () => {
    for (const value of Object.values(BUFF_SAVE_NOTE_COVERAGE)) {
      expect(["full", "partial"]).toContain(value);
    }
  });
});
