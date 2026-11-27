/**
 * Fixture tests for `noteCoverage` / `noteAppliedSurface`: the single
 * question the UI asks of a note — is its bonus already fully expressed as a
 * `Change` ("full"), only partly ("partial", a documented remainder still
 * needs hand-applying), or not promoted at all ("none")? Mirrors the doc
 * comments in the promotion tables that call out which entries are partial.
 */

import { describe, expect, it } from "bun:test";
import { loadRefData } from "@pf1/data-pipeline";

import {
  BUFF_AC_NOTE_COVERAGE,
  BUFF_SAVE_NOTE_COVERAGE,
  noteAppliedSurface,
  noteCoverage,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "../src/index.js";

function note(text: string, target = "allSavingThrows") {
  return { target, text };
}

describe("saveNoteCoverage — character traits", () => {
  it("a fully-promoted note reports full", () => {
    expect(
      noteCoverage({ catalog: "characterTrait" }, note("+2 Trait bonus against fear effects.")),
    ).toBe("full");
  });

  it("a documented partial promotion reports partial (Draconic Lineage: the dragon-created-effects half stays prose)", () => {
    expect(
      noteCoverage(
        { catalog: "characterTrait" },
        note(
          "+1 Trait bonus against fear and against any effect created by a creature of the dragon type.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpromoted note reports none", () => {
    expect(noteCoverage({ catalog: "characterTrait" }, note("Some unrelated prose."))).toBe("none");
  });

  it("a note on a different target is never promoted, even with matching text", () => {
    expect(
      noteCoverage(
        { catalog: "characterTrait" },
        note("+2 Trait bonus against fear effects.", "skill.per"),
      ),
    ).toBe("none");
  });
});

describe("saveNoteCoverage — vendored racial traits", () => {
  it("a fully-promoted note reports full", () => {
    expect(noteCoverage({ catalog: "racialTrait" }, note("+2 Racial bonus against disease."))).toBe(
      "full",
    );
  });

  it("a documented partial promotion reports partial (hexes carry no descriptor, so they stay in the note)", () => {
    expect(
      noteCoverage(
        { catalog: "racialTrait" },
        note(
          "+2 Racial bonus against curse effects and hexes. This bonus stacks with the bonus granted by halfling luck.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpromoted note reports none", () => {
    expect(noteCoverage({ catalog: "racialTrait" }, note("Not a real vendored note."))).toBe(
      "none",
    );
  });
});

describe("saveNoteCoverage — standard racial traits (race-keyed substring match)", () => {
  it("a fully-promoted race note reports full (Dwarf Hardy)", () => {
    expect(
      noteCoverage(
        { catalog: "race", raceName: "Dwarf" },
        note("+2 Racial vs Poisons, Spells and Spell-likes"),
      ),
    ).toBe("full");
  });

  it("a fully-promoted race note reports full (Android: mind, paralysis, poison, and stun all fit)", () => {
    expect(
      noteCoverage(
        { catalog: "race", raceName: "Android" },
        note("+4 Racial vs Mind Affecting, Paralysis, Poison, Stun"),
      ),
    ).toBe("full");
  });

  it("a race with no promotion table reports none", () => {
    expect(noteCoverage({ catalog: "race", raceName: "Half-Orc" }, note("anything"))).toBe("none");
  });

  it("a race that has a table but no matching note text reports none", () => {
    expect(noteCoverage({ catalog: "race", raceName: "Dwarf" }, note("unrelated dwarf note"))).toBe(
      "none",
    );
  });
});

describe("saveNoteCoverage — buffs (name-keyed)", () => {
  it("Bless's fear note reports full", () => {
    expect(
      noteCoverage({ catalog: "buff", buffName: "Bless" }, note("+1 Morale vs Fear effects")),
    ).toBe("full");
  });

  it("Death Ward's note reports partial ('even if a save is not normally allowed' has no Change form)", () => {
    expect(
      noteCoverage(
        { catalog: "buff", buffName: "Death Ward" },
        note(
          "+4 Morale vs death spells and magical death effects, even if a save is not normally allowed.",
        ),
      ),
    ).toBe("partial");
  });

  it("an unpatched buff reports none", () => {
    expect(noteCoverage({ catalog: "buff", buffName: "Haste" }, note("anything"))).toBe("none");
  });
});

describe("noteCoverage — buff AC notes (name then text keyed)", () => {
  it("Mage Armor's incorporeal-touch note is fully promoted, and lands on touch AC", () => {
    const n = note("+4 against incorporeal touch attacks.", "ac");
    expect(noteCoverage({ catalog: "buff", buffName: "Mage Armor" }, n)).toBe("full");
    expect(noteAppliedSurface({ catalog: "buff", buffName: "Mage Armor" }, n)).toBe("touch AC");
  });

  it("Angelic Aspect promotes its deflection line onto normal AC but not its bodily-contact line", () => {
    const src = { catalog: "buff", buffName: "Angelic Aspect" } as const;
    expect(noteAppliedSurface(src, note("+2 Deflection vs Evil creatures.", "ac"))).toBe("AC");
    expect(
      noteCoverage(src, note("Bodily contact prevented by Evil summoned creatures.", "ac")),
    ).toBe("none");
  });

  it("a partial or unpromoted note has no applied surface", () => {
    expect(
      noteAppliedSurface(
        { catalog: "buff", buffName: "Death Ward" },
        note(
          "+4 Morale vs death spells and magical death effects, even if a save is not normally allowed.",
        ),
      ),
    ).toBeUndefined();
  });
});

describe("noteCoverage — trait and race maneuver/AC notes", () => {
  it("reads a fully-promoted character trait maneuver note as full, on CMB", () => {
    // Rovagug's Zealot promotes whole via VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES.
    const n = note("+2 Trait bonus on checks made to sunder.", "cmb");
    expect(noteCoverage({ catalog: "characterTrait" }, n)).toBe("full");
    expect(noteAppliedSurface({ catalog: "characterTrait" }, n)).toBe("CMB");
  });

  it("reads a partially-promoted character trait maneuver note as partial", () => {
    // Prankster: the flatfooted-duration rider has no Change form.
    expect(
      noteCoverage(
        { catalog: "characterTrait" },
        note(
          "+1 Trait bonus on dirty trick combat maneuver checks.  If you succeed at a dirty trick combat maneuver check against a flatfooted opponent, increase the duration of the condition caused by 1 round.",
          "cmb",
        ),
      ),
    ).toBe("partial");
  });

  it("reads racial trait maneuver notes as full or partial", () => {
    expect(
      noteCoverage({ catalog: "racialTrait" }, note("+1 bonus against trip maneuvers.", "cmd")),
    ).toBe("full");
    // Half-Orc Destructive: the break-objects half is a different target.
    expect(
      noteCoverage({ catalog: "racialTrait" }, note("+2 bonus on sunder attempts.", "cmb")),
    ).toBe("partial");
  });

  it("reads a fully-promoted standard race maneuver note as full, on CMD", () => {
    // Dwarf Stability, recovered by STANDARD_RACE_MANEUVER_BONUSES's match.
    const n = note(
      "+4 Racial bonus to CMD when resisting a Bull Rush and Trip while on ground.",
      "cmd",
    );
    expect(noteAppliedSurface({ catalog: "race", raceName: "Dwarf" }, n)).toBe("CMD");
  });

  it("reads an unpromoted maneuver or AC note as none", () => {
    expect(
      noteCoverage(
        { catalog: "characterTrait" },
        note("+1 Trait bonus on checks made to feint.", "cmb"),
      ),
    ).toBe("none");
    expect(noteCoverage({ catalog: "characterTrait" }, note("+1 dodge bonus to AC.", "ac"))).toBe(
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

  it("every BUFF_AC_NOTE_COVERAGE entry names a real vendored buff and its exact ac note", () => {
    const buffs = Object.values(loadRefData().buffs);
    for (const [buffName, notes] of Object.entries(BUFF_AC_NOTE_COVERAGE)) {
      const buff = buffs.find((b) => b.name === buffName);
      expect(buff).toBeDefined();
      const acTexts = (buff?.contextNotes ?? [])
        .filter((n) => n.target === "ac")
        .map((n) => n.text.trim());
      for (const text of Object.keys(notes)) expect(acTexts).toContain(text);
    }
  });
});
