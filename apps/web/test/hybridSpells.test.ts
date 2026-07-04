/**
 * The arcanist's hybrid casting loop (issue #13 follow-through): a limited
 * number of spells are PREPARED from the spellbook each day (wizard-shaped,
 * `preparedSpells.ts`), then any of them may be CAST spontaneously by
 * spending a per-level slot (sorcerer-shaped, `spontaneousSpells.ts`) —
 * casting never expends the specific prepared instance, only a slot. These
 * two modules already provide everything a hybrid caster needs; this file
 * exercises them together the way `HybridView` (PreparedSpellsPanel.tsx)
 * does, without needing a DOM.
 */
import { describe, expect, it } from "bun:test";

import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";
import {
  clearPrepared,
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  restPreparedSpells,
  unprepareSpell,
} from "../src/model/preparedSpells.js";
import {
  casterModelFor,
  preparedCapacityByLevel,
  spellSlotsByLevel,
} from "../src/model/spellcasting.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  slotsUsedAtLevel,
  spontaneousSlotStatus,
} from "../src/model/spontaneousSpells.js";

const arcanistModel = casterModelFor("arcanist")!;

function freshL4Arcanist() {
  let doc = createEmptyDoc("t");
  doc = addClass(doc, "arcanist");
  doc = setClassLevel(doc, "arcanist", 4);
  return doc;
}

describe("arcanist hybrid casting: prepare (wizard-shaped)", () => {
  it("preparing a spell adds it to the loadout, capped by preparedCapacityByLevel — not by spellSlotsByLevel", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile");
    doc = prepareSpell(doc, "shield");
    doc = prepareSpell(doc, "web"); // 3rd first-level spell, at the L4 prepared cap (3)
    expect(preparedSpells(doc)).toHaveLength(3);

    const limits = new Map(
      preparedCapacityByLevel(arcanistModel, 4).map((l) => [l.level, l.limit]),
    );
    expect(limits.get(1)).toBe(3); // spellbook readying cap at L4
    // The per-day CAST slot total at the same level is larger (4 base at L4) —
    // preparing does not draw from that pool at all.
    const slots = new Map(spellSlotsByLevel(arcanistModel, 4, 0).map((s) => [s.level, s.total]));
    expect(slots.get(1)).toBe(4);
  });

  it("unprepare / removePreparedAt drop a prepared instance without touching cast slots", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile");
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1); // cast it once
    expect(slotsUsedAtLevel(doc, 1)).toBe(1);

    doc = unprepareSpell(doc, "magic-missile");
    expect(preparedSpells(doc)).toEqual([]);
    // Un-preparing the spell does NOT restore the slot already spent casting it.
    expect(slotsUsedAtLevel(doc, 1)).toBe(1);
  });

  it("clearPrepared empties the loadout", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile");
    doc = prepareSpell(doc, "shield");
    doc = clearPrepared(doc);
    expect(preparedSpells(doc)).toEqual([]);
  });
});

describe("arcanist hybrid casting: cast (sorcerer-shaped slot pool)", () => {
  it("casting a prepared spell spends a slot, NOT the prepared instance itself", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile"); // only 1 first-level spell prepared

    // Cast it repeatedly — the same single prepared instance backs every cast,
    // limited only by the per-day slot pool (4 first-level slots at L4, Int mod
    // 0 here for simplicity).
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    expect(slotsUsedAtLevel(doc, 1)).toBe(3);
    // The prepared loadout is untouched by casting — still exactly 1 instance,
    // never marked expended (hybrid casters have no per-instance expend).
    expect(preparedSpells(doc)).toEqual([{ spellId: "magic-missile", expended: false }]);
  });

  it("cannot exceed the per-day slot total (clamped), independent of how many copies are prepared", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile");
    for (let i = 0; i < 10; i++) {
      doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    }
    const status = spontaneousSlotStatus(doc, arcanistModel, 4, 0);
    const l1 = status.find((s) => s.level === 1)!;
    expect(l1.used).toBe(l1.total); // 4 at L4, Int mod 0
    expect(l1.remaining).toBe(0);
  });

  it("bonus slots from a high Int score raise the per-day cast total but not the prepared cap", () => {
    // L4, Int mod +5 (Int 20): 1st 4+2=6, 2nd 2+1=3 (see engine tables.ts doc comment).
    const slots = new Map(spellSlotsByLevel(arcanistModel, 4, 5).map((s) => [s.level, s.total]));
    expect(slots.get(1)).toBe(6);
    expect(slots.get(2)).toBe(3);
    const prepared = new Map(
      preparedCapacityByLevel(arcanistModel, 4).map((l) => [l.level, l.limit]),
    );
    expect(prepared.get(1)).toBe(3); // unchanged by ability score
    expect(prepared.get(2)).toBe(1);
  });
});

describe("arcanist hybrid casting: new day", () => {
  it("resetSpontaneousSlots clears the cast pool; restPreparedSpells is a harmless no-op (nothing ever expended)", () => {
    let doc = freshL4Arcanist();
    doc = prepareSpell(doc, "magic-missile");
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    doc = castSpontaneousSlot(doc, arcanistModel, 4, 0, 1);
    expect(slotsUsedAtLevel(doc, 1)).toBe(2);

    const beforePrepared = preparedSpells(doc);
    doc = resetSpontaneousSlots(doc);
    doc = restPreparedSpells(doc);

    expect(slotsUsedAtLevel(doc, 1)).toBe(0); // slot pool refreshed
    expect(preparedSpells(doc)).toEqual(beforePrepared); // loadout untouched, still readied
  });

  it("removePreparedAt is a no-op on an out-of-range index", () => {
    const doc = prepareSpell(freshL4Arcanist(), "magic-missile");
    expect(removePreparedAt(doc, 5)).toBe(doc);
  });
});
