import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  addNaturalAttack,
  allPolymorphTiers,
  currentActiveForm,
  druidLevel,
  endActiveForm,
  formOptionKey,
  polymorphFormOptions,
  polymorphTierName,
  removeNaturalAttack,
  setActiveFormName,
  setActiveFormNotes,
  sizeLabel,
  startActiveForm,
  updateNaturalAttack,
  wildShapeTiers,
} from "../src/model/polymorph.js";

function makeDoc(over: { classes?: { tag: string; level: number }[] } = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: over.classes ?? [{ tag: "druid", level: 8 }] },
    abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("model/polymorph: druidLevel / wildShapeTiers", () => {
  it("0 for a non-druid", () => {
    const doc = makeDoc({ classes: [{ tag: "wizard", level: 8 }] });
    expect(druidLevel(doc)).toBe(0);
    expect(wildShapeTiers(doc)).toEqual([]);
  });

  it("druid 8 grants Beast Shape I/II/III + Elemental Body I/II + Plant Shape I", () => {
    const doc = makeDoc({ classes: [{ tag: "druid", level: 8 }] });
    expect(druidLevel(doc)).toBe(8);
    const tiers = wildShapeTiers(doc);
    expect(tiers).toContain("beastShapeIII");
    expect(tiers).toContain("plantShapeI");
    expect(tiers).not.toContain("elementalBodyIII");
  });

  it("allPolymorphTiers returns every tier, independent of druid level", () => {
    expect(allPolymorphTiers().length).toBeGreaterThanOrEqual(11);
  });
});

describe("model/polymorph: tier/option lookups", () => {
  it("polymorphTierName resolves a known tier, falls back to the raw id otherwise", () => {
    expect(polymorphTierName("beastShapeI")).toBe("Beast Shape I");
    expect(polymorphTierName("madeUpTier")).toBe("madeUpTier");
  });

  it("polymorphFormOptions lists every row for a tier, empty for an unknown tier", () => {
    const options = polymorphFormOptions("beastShapeI");
    expect(options.length).toBe(2);
    expect(polymorphFormOptions("notATier")).toEqual([]);
  });

  it("formOptionKey is stable and distinguishes creatureType/size/element", () => {
    const a = { creatureType: "animal" as const, size: "sm" as const };
    const b = { creatureType: "magicalBeast" as const, size: "sm" as const };
    expect(formOptionKey(a)).not.toBe(formOptionKey(b));
  });

  it("sizeLabel maps every SizeId to a human-readable name", () => {
    expect(sizeLabel("huge")).toBe("Huge");
    expect(sizeLabel("sm")).toBe("Small");
  });
});

describe("model/polymorph: startActiveForm / endActiveForm", () => {
  it("starting a form sets live.activeForm with an empty attack list", () => {
    const doc = startActiveForm(makeDoc(), {
      tier: "beastShapeIII",
      creatureType: "animal",
      size: "huge",
      formName: "Dire Wolf",
    });
    expect(doc.live.activeForm).toEqual({
      tier: "beastShapeIII",
      creatureType: "animal",
      size: "huge",
      element: undefined,
      formName: "Dire Wolf",
      naturalAttacks: [],
    });
    expect(currentActiveForm(doc)).toBe(doc.live.activeForm);
  });

  it("a blank form name falls back to a default label", () => {
    const doc = startActiveForm(makeDoc(), {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "sm",
      formName: "   ",
    });
    expect(doc.live.activeForm?.formName).toBe("Wild Shape form");
  });

  it("starting a form replaces any currently-active one", () => {
    let doc = startActiveForm(makeDoc(), {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "sm",
      formName: "Cat",
    });
    doc = startActiveForm(doc, {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "med",
      formName: "Wolf",
    });
    expect(doc.live.activeForm?.formName).toBe("Wolf");
    expect(doc.live.activeForm?.size).toBe("med");
  });

  it("endActiveForm clears the field; no-op when already absent", () => {
    let doc = startActiveForm(makeDoc(), {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "med",
      formName: "Wolf",
    });
    doc = endActiveForm(doc);
    expect(doc.live.activeForm).toBeUndefined();
    const again = endActiveForm(doc);
    expect(again).toBe(doc); // no-op returns the same reference
  });
});

describe("model/polymorph: name/notes edits", () => {
  it("setActiveFormName/setActiveFormNotes are no-ops with no active form", () => {
    const doc = makeDoc();
    expect(setActiveFormName(doc, "Bear")).toBe(doc);
    expect(setActiveFormNotes(doc, "notes")).toBe(doc);
  });

  it("setActiveFormName updates the label", () => {
    let doc = startActiveForm(makeDoc(), {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "med",
      formName: "Wolf",
    });
    doc = setActiveFormName(doc, "Grey Wolf");
    expect(doc.live.activeForm?.formName).toBe("Grey Wolf");
  });

  it("setActiveFormNotes stores free text, clearing to undefined on empty string", () => {
    let doc = startActiveForm(makeDoc(), {
      tier: "beastShapeI",
      creatureType: "animal",
      size: "med",
      formName: "Wolf",
    });
    doc = setActiveFormNotes(doc, "Trip on bite");
    expect(doc.live.activeForm?.notes).toBe("Trip on bite");
    doc = setActiveFormNotes(doc, "");
    expect(doc.live.activeForm?.notes).toBeUndefined();
  });
});

describe("model/polymorph: natural-attack line editing", () => {
  function shaped(): CharacterDoc {
    return startActiveForm(makeDoc(), {
      tier: "beastShapeIII",
      creatureType: "animal",
      size: "huge",
      formName: "Dire Wolf",
    });
  }

  it("addNaturalAttack appends a line; no-op with no active form", () => {
    const unshaped = makeDoc();
    expect(addNaturalAttack(unshaped, { name: "Bite" })).toBe(unshaped);

    let doc = shaped();
    doc = addNaturalAttack(doc, { name: "Bite", damageDice: "2d6", kind: "primary" });
    doc = addNaturalAttack(doc, { name: "Claw", count: 2, damageDice: "1d8", kind: "secondary" });
    expect(doc.live.activeForm?.naturalAttacks).toEqual([
      { name: "Bite", damageDice: "2d6", kind: "primary" },
      { name: "Claw", count: 2, damageDice: "1d8", kind: "secondary" },
    ]);
  });

  it("updateNaturalAttack patches one line by index; ignores an out-of-range index", () => {
    let doc = shaped();
    doc = addNaturalAttack(doc, { name: "Bite", kind: "primary" });
    doc = updateNaturalAttack(doc, 0, { name: "Bite (edited)", damageDice: "3d6" });
    expect(doc.live.activeForm?.naturalAttacks?.[0]).toEqual({
      name: "Bite (edited)",
      kind: "primary",
      damageDice: "3d6",
    });
    expect(updateNaturalAttack(doc, 5, { name: "nope" })).toBe(doc);
  });

  it("removeNaturalAttack removes one line by index; ignores an out-of-range index", () => {
    let doc = shaped();
    doc = addNaturalAttack(doc, { name: "Bite" });
    doc = addNaturalAttack(doc, { name: "Claw" });
    doc = removeNaturalAttack(doc, 0);
    expect(doc.live.activeForm?.naturalAttacks).toEqual([{ name: "Claw" }]);
    expect(removeNaturalAttack(doc, 9)).toBe(doc);
  });
});
