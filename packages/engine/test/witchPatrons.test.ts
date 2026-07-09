/**
 * Fixture tests for the witch patron table (issue #65). Unlike
 * `oracle-mysteries.ts`'s bonus spells (real vendored Foundry ids copied from
 * the mystery's own prose), a patron's bonus spells carry only a NAME (see
 * `witch-patrons.ts`'s doc comment for why) — resolved at runtime by
 * `apps/web/src/model/spellcasting.patronSpellsKnown`, not tested here (this
 * package has no dependency on the web app's model layer). What IS exercised
 * at the engine layer: table shape, the 9-spell-per-patron shape, and the
 * level progression (2, 4, 6, ..., 18).
 */

import { describe, expect, it } from "bun:test";

import { WITCH_PATRONS, WITCH_PATRON_TAGS } from "../src/witch-patrons.js";

describe("WITCH_PATRONS table", () => {
  it("covers the 17 APG/UM core patrons (later-splatbook patrons out of scope)", () => {
    expect(WITCH_PATRON_TAGS.length).toBe(17);
  });

  it("does NOT include non-APG/UM patrons (Protection is Heroes of the High Court; Wards/Portals aren't real PF1 patrons)", () => {
    expect(WITCH_PATRONS.protection).toBeUndefined();
    expect(WITCH_PATRONS.wards).toBeUndefined();
    expect(WITCH_PATRONS.portals).toBeUndefined();
  });

  it("includes well-known APG/UM patrons", () => {
    expect(WITCH_PATRONS.agility?.name).toBe("Agility");
    expect(WITCH_PATRONS.healing?.name).toBe("Healing");
    expect(WITCH_PATRONS.shadow?.name).toBe("Shadow");
  });

  it("every patron grants exactly 9 bonus spells, one per even level 2..18", () => {
    for (const tag of WITCH_PATRON_TAGS) {
      const patron = WITCH_PATRONS[tag]!;
      expect(patron.bonusSpells.length).toBe(9);
      expect(patron.bonusSpells.map((sp) => sp.level)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    }
  });

  it("every bonus spell has a non-empty name", () => {
    for (const tag of WITCH_PATRON_TAGS) {
      for (const sp of WITCH_PATRONS[tag]!.bonusSpells) {
        expect(sp.name.length).toBeGreaterThan(0);
      }
    }
  });
});
