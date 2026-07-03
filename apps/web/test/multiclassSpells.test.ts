/**
 * Multiclass spellcasting (issue #22): a cleric/wizard (or sorcerer/bard)
 * character must track known spells, prepared loadouts, spontaneous slot
 * usage, and casting ability independently PER caster class, while a
 * single-caster document keeps behaving exactly as it did before this
 * feature (zero migration, identical shape).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  addClass,
  createEmptyDoc,
  setClassLevel,
  setClericDomains,
  toggleKnownSpell,
} from "../src/model/doc.js";
import {
  clearPrepared,
  prepareDomainSpell,
  prepareSpell,
  preparedSpells,
  restPreparedSpells,
  setExpendedAt,
  unprepareSpell,
} from "../src/model/preparedSpells.js";
import {
  casterClassesOf,
  casterModelFor,
  knownSpellsFor,
  primaryCasterClassTag,
  spellSlotsByLevel,
  storedClassTag,
} from "../src/model/spellcasting.js";
import { castSpontaneousSlot, slotsUsedAtLevel } from "../src/model/spontaneousSpells.js";

const ref = loadRefData();

function fresh(): CharacterDoc {
  return createEmptyDoc("t");
}

/** A cleric 4 / wizard 3 multiclass, cleric added (and thus primary) first. */
function clericWizardDoc(clericLevel = 4, wizardLevel = 3): CharacterDoc {
  let doc = addClass(fresh(), "cleric");
  doc = setClassLevel(doc, "cleric", clericLevel);
  doc = addClass(doc, "wizard");
  doc = setClassLevel(doc, "wizard", wizardLevel);
  return doc;
}

const clericSpellId = ref.spellLists["cleric"]![1]![0]!;
const wizardSpellId = ref.spellLists["wizard"]![1]![0]!;

describe("casterClassesOf() / primaryCasterClassTag()", () => {
  it("single caster: one entry, and it is the primary", () => {
    const doc = addClass(fresh(), "wizard");
    expect(casterClassesOf(doc, ref).map((c) => c.tag)).toEqual(["wizard"]);
    expect(primaryCasterClassTag(doc, ref)).toBe("wizard");
  });

  it("multiclass: both classes enumerated in identity.classes order; first is primary", () => {
    const doc = clericWizardDoc();
    expect(casterClassesOf(doc, ref).map((c) => c.tag)).toEqual(["cleric", "wizard"]);
    expect(primaryCasterClassTag(doc, ref)).toBe("cleric");
  });

  it("a non-caster class contributes nothing", () => {
    const doc = addClass(fresh(), "fighter");
    expect(casterClassesOf(doc, ref)).toEqual([]);
    expect(primaryCasterClassTag(doc, ref)).toBeUndefined();
  });
});

describe("knownSpellsFor() / toggleKnownSpell() — independent spellbooks", () => {
  it("the primary class's known list lives in the flat `known` field", () => {
    let doc = clericWizardDoc();
    doc = toggleKnownSpell(doc, ref, clericSpellId, "cleric");
    expect(doc.build.spells.known).toEqual([clericSpellId]);
    expect(doc.build.spells.byClass?.["cleric"]).toBeUndefined();
  });

  it("a non-primary class's known list lives in byClass, never touching the flat field", () => {
    let doc = clericWizardDoc();
    doc = toggleKnownSpell(doc, ref, wizardSpellId, "wizard");
    expect(doc.build.spells.known).toEqual([]);
    expect(doc.build.spells.byClass?.["wizard"]?.known).toEqual([wizardSpellId]);
    expect(knownSpellsFor(doc, ref, "wizard")).toEqual([wizardSpellId]);
  });

  it("each class's known list is independent of the other", () => {
    let doc = clericWizardDoc();
    doc = toggleKnownSpell(doc, ref, clericSpellId, "cleric");
    doc = toggleKnownSpell(doc, ref, wizardSpellId, "wizard");
    expect(knownSpellsFor(doc, ref, "cleric")).toEqual([clericSpellId]);
    expect(knownSpellsFor(doc, ref, "wizard")).toEqual([wizardSpellId]);

    // Removing the wizard's spell doesn't disturb the cleric's list.
    doc = toggleKnownSpell(doc, ref, wizardSpellId, "wizard");
    expect(knownSpellsFor(doc, ref, "wizard")).toEqual([]);
    expect(knownSpellsFor(doc, ref, "cleric")).toEqual([clericSpellId]);
  });

  it("a single-caster document never populates byClass", () => {
    let doc = addClass(fresh(), "wizard");
    doc = toggleKnownSpell(doc, ref, wizardSpellId, "wizard");
    expect(doc.build.spells.known).toEqual([wizardSpellId]);
    expect(doc.build.spells.byClass).toBeUndefined();
  });
});

describe("prepared-spell independence across classes", () => {
  it("prepareSpell stores classTag only for the non-primary class", () => {
    let doc = clericWizardDoc();
    doc = prepareSpell(doc, clericSpellId, storedClassTag(doc, ref, "cleric"));
    doc = prepareSpell(doc, wizardSpellId, storedClassTag(doc, ref, "wizard"));
    expect(preparedSpells(doc)).toEqual([
      { spellId: clericSpellId, expended: false },
      { spellId: wizardSpellId, expended: false, classTag: "wizard" },
    ]);
  });

  it("restPreparedSpells / clearPrepared only affect the targeted class's loadout", () => {
    let doc = clericWizardDoc();
    doc = prepareSpell(doc, clericSpellId, undefined); // cleric, primary
    doc = prepareSpell(doc, wizardSpellId, "wizard");
    doc = setExpendedAt(doc, 0, true);
    doc = setExpendedAt(doc, 1, true);

    doc = restPreparedSpells(doc, undefined); // rest cleric's loadout only
    expect(preparedSpells(doc)[0]!.expended).toBe(false); // cleric: rested
    expect(preparedSpells(doc)[1]!.expended).toBe(true); // wizard: untouched

    doc = clearPrepared(doc, "wizard");
    expect(preparedSpells(doc)).toEqual([{ spellId: clericSpellId, expended: false }]);
  });

  it("unprepareSpell restricted by classTag only removes that class's instance", () => {
    let doc = clericWizardDoc();
    doc = prepareSpell(doc, clericSpellId, undefined); // cleric copy
    doc = prepareSpell(doc, clericSpellId, "wizard"); // contrived: wizard copy of the same id
    doc = unprepareSpell(doc, clericSpellId, undefined, "wizard");
    expect(preparedSpells(doc)).toEqual([{ spellId: clericSpellId, expended: false }]);
  });
});

describe("domain slots stay cleric-only in a cleric/X multiclass", () => {
  const domainSpellId = ref.domainSpellLists["Air"]![1]![0]!;

  it("cleric-primary multiclass: domain instance stores no classTag (matches the primary convention)", () => {
    let doc = clericWizardDoc();
    doc = setClericDomains(doc, ["Air"]);
    doc = prepareDomainSpell(doc, domainSpellId, storedClassTag(doc, ref, "cleric"));
    expect(preparedSpells(doc)).toEqual([{ spellId: domainSpellId, expended: false, kind: "domain" }]);
  });

  it("wizard-primary multiclass: cleric's domain instance is explicitly classTag: 'cleric'", () => {
    let doc = addClass(fresh(), "wizard"); // wizard added first => primary
    doc = setClassLevel(doc, "wizard", 3);
    doc = addClass(doc, "cleric");
    doc = setClassLevel(doc, "cleric", 4);
    doc = setClericDomains(doc, ["Air"]);
    expect(primaryCasterClassTag(doc, ref)).toBe("wizard");

    doc = prepareDomainSpell(doc, domainSpellId, storedClassTag(doc, ref, "cleric"));
    expect(preparedSpells(doc)).toEqual([
      { spellId: domainSpellId, expended: false, kind: "domain", classTag: "cleric" },
    ]);
  });
});

describe("per-class casting ability on a multiclass document", () => {
  it("cleric slots scale off WIS, wizard slots scale off INT, independently", () => {
    const clericModel = casterModelFor("cleric")!;
    const wizardModel = casterModelFor("wizard")!;
    // Cleric 4 (WIS mod +3), wizard 3 (INT mod +5) on the same character.
    const clericSlots = spellSlotsByLevel(clericModel, 4, 3);
    const wizardSlots = spellSlotsByLevel(wizardModel, 3, 5);
    const clericL1 = clericSlots.find((s) => s.level === 1)!;
    const wizardL1 = wizardSlots.find((s) => s.level === 1)!;
    expect(clericL1.bonus).toBe(1); // WIS +3: floor((3-1)/4)+1 = 1
    expect(wizardL1.bonus).toBe(2); // INT +5: floor((5-1)/4)+1 = 2
    // Same spell level, different ability scores => different bonus spells,
    // proving each class's slot math is keyed to its own casting ability.
    expect(clericL1.bonus).not.toBe(wizardL1.bonus);
  });
});

describe("spontaneous slot-usage independence (e.g. sorcerer/bard multiclass)", () => {
  it("each class's slotsUsed is tracked in its own bucket", () => {
    let doc = addClass(fresh(), "sorcerer");
    doc = setClassLevel(doc, "sorcerer", 5);
    doc = addClass(doc, "bard");
    doc = setClassLevel(doc, "bard", 4);
    const sorcModel = casterModelFor("sorcerer")!;
    const bardModel = casterModelFor("bard")!;
    const sorcTag = storedClassTag(doc, ref, "sorcerer"); // undefined: primary
    const bardTag = storedClassTag(doc, ref, "bard"); // "bard"

    doc = castSpontaneousSlot(doc, sorcModel, 5, 0, 1, sorcTag);
    doc = castSpontaneousSlot(doc, bardModel, 4, 0, 1, bardTag);

    expect(slotsUsedAtLevel(doc, 1, sorcTag)).toBe(1);
    expect(slotsUsedAtLevel(doc, 1, bardTag)).toBe(1);
    expect(doc.live.spells?.slotsUsed).toEqual({ 1: 1 });
    expect(doc.live.spells?.slotsUsedByClass?.["bard"]).toEqual({ 1: 1 });
  });
});

describe("legacy single-caster documents need zero migration", () => {
  it("a flat known list + classless prepared entries are the (only) primary class's, unchanged", () => {
    let doc = addClass(fresh(), "wizard");
    doc = toggleKnownSpell(doc, ref, wizardSpellId, "wizard");
    doc = prepareSpell(doc, wizardSpellId); // no classTag — exactly pre-multiclass shape

    expect(primaryCasterClassTag(doc, ref)).toBe("wizard");
    expect(knownSpellsFor(doc, ref, "wizard")).toEqual(doc.build.spells.known);
    expect(preparedSpells(doc)).toEqual([{ spellId: wizardSpellId, expended: false }]);
    expect(doc.build.spells.byClass).toBeUndefined();
    expect(doc.live.spells?.slotsUsedByClass).toBeUndefined();
  });
});
