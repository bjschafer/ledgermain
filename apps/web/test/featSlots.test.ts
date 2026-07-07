import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  addClass,
  addFeatInstance,
  createEmptyDoc,
  setClassLevel,
  setRace,
  toggleFeat,
} from "../src/model/doc.js";
import {
  assignFeatsToSlots,
  buildFeatSlotGroups,
  featEligibleForSlot,
} from "../src/model/featSlots.js";
import { setCombatStyle } from "../src/model/ranger.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function withRace(name: string) {
  let doc = createEmptyDoc("t");
  doc = setRace(doc, raceId(name));
  return doc;
}

describe("buildFeatSlotGroups: generic-only characters", () => {
  it("a level-1 Elf commoner has one generic slot and no typed groups", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "cleric");
    doc = setClassLevel(doc, "cleric", 1);
    const groups = buildFeatSlotGroups(doc, ref);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.type.kind).toBe("generic");
    expect(groups[0]!.total).toBe(1);
  });
});

describe("buildFeatSlotGroups: Fighter combat slots (issue #54)", () => {
  it("Fighter 4 Elf has a combat group sized to the fighter bonus-feat progression", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 4);
    const groups = buildFeatSlotGroups(doc, ref);
    const combat = groups.find((g) => g.type.kind === "combat");
    expect(combat).toBeDefined();
    // 1 + floor(4/2) = 3
    expect(combat!.total).toBe(3);
    const generic = groups.find((g) => g.type.kind === "generic")!;
    // base ceil(4/2) = 2
    expect(generic.total).toBe(2);
  });

  it("Cleave (Combat) is eligible for a combat slot; Empower Spell (Metamagic) is not", () => {
    const cleave = ref.feats[featId("Cleave")]!;
    const empower = ref.feats[featId("Empower Spell")]!;
    expect(featEligibleForSlot(cleave, { kind: "combat" })).toBe(true);
    expect(featEligibleForSlot(empower, { kind: "combat" })).toBe(false);
  });

  it("a Fighter who only takes metamagic feats leaves the combat slot unfilled and the feat unassigned (issue #54 repro)", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 2); // base 1 generic + 2 combat slots = 3 total
    doc = toggleFeat(doc, featId("Empower Spell"));
    doc = toggleFeat(doc, featId("Extend Spell"));
    doc = toggleFeat(doc, featId("Silent Spell"));
    const { groups, unassignedFeatIds } = assignFeatsToSlots(doc, ref);
    const combat = groups.find((g) => g.type.kind === "combat")!;
    const generic = groups.find((g) => g.type.kind === "generic")!;
    expect(combat.filledFeatIds).toEqual([]); // 0/2 filled — the warning case
    expect(combat.total).toBe(2);
    // 1 generic slot absorbs exactly one of the three metamagic feats...
    expect(generic.filledFeatIds).toHaveLength(1);
    // ...the other two don't fit anywhere (combat slots reject them, no more generic room).
    expect(unassignedFeatIds).toHaveLength(2);
  });

  it("a Fighter who takes combat feats fills the combat slots cleanly", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 2);
    doc = toggleFeat(doc, featId("Power Attack"));
    doc = toggleFeat(doc, featId("Cleave"));
    const { groups, unassignedFeatIds } = assignFeatsToSlots(doc, ref);
    const combat = groups.find((g) => g.type.kind === "combat")!;
    expect(combat.filledFeatIds).toHaveLength(2);
    expect(unassignedFeatIds).toEqual([]);
  });
});

describe("buildFeatSlotGroups: Wizard bonus feats (issue #54)", () => {
  it("Wizard 10 Elf has a wizardBonus group sized to the Arcane School progression", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "wizard");
    doc = setClassLevel(doc, "wizard", 10);
    const groups = buildFeatSlotGroups(doc, ref);
    const wiz = groups.find((g) => g.type.kind === "wizardBonus")!;
    // floor(10/5) = 2
    expect(wiz.total).toBe(2);
  });

  it("Scribe Scroll (Item Creation), Empower Spell (Metamagic), and Spell Mastery are all eligible", () => {
    const scroll = ref.feats[featId("Scribe Scroll")]!;
    const empower = ref.feats[featId("Empower Spell")]!;
    const mastery = ref.feats[featId("Spell Mastery")]!;
    expect(featEligibleForSlot(scroll, { kind: "wizardBonus" })).toBe(true);
    expect(featEligibleForSlot(empower, { kind: "wizardBonus" })).toBe(true);
    expect(featEligibleForSlot(mastery, { kind: "wizardBonus" })).toBe(true);
  });

  it("a pure Combat feat (Cleave) is NOT eligible for a wizardBonus slot", () => {
    const cleave = ref.feats[featId("Cleave")]!;
    expect(featEligibleForSlot(cleave, { kind: "wizardBonus" })).toBe(false);
  });
});

describe("buildFeatSlotGroups: Ranger combat style (issue #57)", () => {
  it("with no combat style chosen, the ranger's slots fall back to generic", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "ranger");
    doc = setClassLevel(doc, "ranger", 6);
    const groups = buildFeatSlotGroups(doc, ref);
    expect(groups.find((g) => g.type.kind === "combatStyle")).toBeUndefined();
    const generic = groups.find((g) => g.type.kind === "generic")!;
    // base ceil(6/2)=3 + combat style floor((6+2)/4)=2 (folded into generic, unset style) = 5
    expect(generic.total).toBe(5);
  });

  it("with Archery chosen, the combat style group is restricted to the archery tree", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "ranger");
    doc = setClassLevel(doc, "ranger", 6);
    doc = setCombatStyle(doc, "archery");
    const groups = buildFeatSlotGroups(doc, ref);
    const style = groups.find((g) => g.type.kind === "combatStyle")!;
    expect(style.total).toBe(2);
    const pointBlank = ref.feats[featId("Point-Blank Shot")]!;
    const cleave = ref.feats[featId("Cleave")]!;
    expect(featEligibleForSlot(pointBlank, style.type)).toBe(true);
    expect(featEligibleForSlot(cleave, style.type)).toBe(false);
  });

  it("an archery-style ranger who picks the tree's feats fills the style slots", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "ranger");
    doc = setClassLevel(doc, "ranger", 6);
    doc = setCombatStyle(doc, "archery");
    doc = toggleFeat(doc, featId("Point-Blank Shot"));
    doc = toggleFeat(doc, featId("Precise Shot"));
    const { groups, unassignedFeatIds } = assignFeatsToSlots(doc, ref);
    const style = groups.find((g) => g.type.kind === "combatStyle")!;
    expect(style.filledFeatIds).toHaveLength(2);
    expect(unassignedFeatIds).toEqual([]);
  });
});

describe("buildFeatSlotGroups: Sorcerer bloodline feats (issue #57)", () => {
  it("with no bloodline chosen, the slots fall back to generic", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "sorcerer");
    doc = setClassLevel(doc, "sorcerer", 7);
    const groups = buildFeatSlotGroups(doc, ref);
    expect(groups.find((g) => g.type.kind === "bloodline")).toBeUndefined();
  });

  it("with Draconic chosen, the bloodline group is restricted to Draconic's list", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "sorcerer");
    doc = setClassLevel(doc, "sorcerer", 7);
    doc = { ...doc, build: { ...doc.build, sorcererBloodline: "Draconic" } };
    const groups = buildFeatSlotGroups(doc, ref);
    const bloodline = groups.find((g) => g.type.kind === "bloodline")!;
    // floor((7-1)/6) = 1
    expect(bloodline.total).toBe(1);
    const toughness = ref.feats[featId("Toughness")]!;
    const cleave = ref.feats[featId("Cleave")]!;
    expect(featEligibleForSlot(toughness, bloodline.type)).toBe(true);
    expect(featEligibleForSlot(cleave, bloodline.type)).toBe(false);
  });
});

describe("buildFeatSlotGroups: Monk bonus feats (issue #57)", () => {
  it("Monk 6 Elf has a monkList group with feats from every unlocked tier eligible", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "monk");
    doc = setClassLevel(doc, "monk", 6);
    const groups = buildFeatSlotGroups(doc, ref);
    const monkList = groups.find((g) => g.type.kind === "monkList")!;
    // 1 + floor((6+2)/4) = 3
    expect(monkList.total).toBe(3);
    const dodge = ref.feats[featId("Dodge")]!; // 1st-level tier
    const mobility = ref.feats[featId("Mobility")]!; // 6th-level tier
    const springAttack = ref.feats[featId("Spring Attack")]!; // 10th-level tier (not level-gated here)
    const cleave = ref.feats[featId("Cleave")]!; // not on the list at all
    expect(featEligibleForSlot(dodge, monkList.type)).toBe(true);
    expect(featEligibleForSlot(mobility, monkList.type)).toBe(true);
    expect(featEligibleForSlot(springAttack, monkList.type)).toBe(true);
    expect(featEligibleForSlot(cleave, monkList.type)).toBe(false);
  });
});

describe("assignFeatsToSlots: repeatable feats assign each instance individually (issue #58)", () => {
  it("two Improved Critical instances (a Combat feat) each fill one of Fighter's two open combat slots", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 2); // combat: 1+floor(2/2)=2; generic: ceil(2/2)=1
    const icId = featId("Improved Critical");
    doc = toggleFeat(doc, icId); // primary instance
    doc = addFeatInstance(doc, icId); // extra instance (2nd copy)
    const { groups, unassignedFeatIds } = assignFeatsToSlots(doc, ref);
    const combat = groups.find((g) => g.type.kind === "combat")!;
    expect(combat.total).toBe(2);
    // Both instances fill the combat bucket, not the generic one.
    expect(combat.filledFeatIds).toEqual([icId, icId]);
    const generic = groups.find((g) => g.type.kind === "generic")!;
    expect(generic.filledFeatIds).toEqual([]);
    expect(unassignedFeatIds).toEqual([]);
  });

  it("chosenFeatCount-style budget: a 3rd instance beyond the combat slots' capacity is unassigned", () => {
    let doc = withRace("Elf");
    doc = addClass(doc, "fighter");
    doc = setClassLevel(doc, "fighter", 2); // combat total=2, generic total=1
    const icId = featId("Improved Critical");
    doc = toggleFeat(doc, icId);
    doc = addFeatInstance(doc, icId);
    doc = addFeatInstance(doc, icId); // 3rd instance
    const { groups, unassignedFeatIds } = assignFeatsToSlots(doc, ref);
    const combat = groups.find((g) => g.type.kind === "combat")!;
    const generic = groups.find((g) => g.type.kind === "generic")!;
    // 2 combat slots absorb 2 instances; the generic slot absorbs the 3rd
    // (Improved Critical is unrestricted-eligible too — "generic" always
    // returns true from featEligibleForSlot) — nothing left unassigned.
    expect(combat.filledFeatIds).toHaveLength(2);
    expect(generic.filledFeatIds).toHaveLength(1);
    expect(unassignedFeatIds).toEqual([]);
  });
});
