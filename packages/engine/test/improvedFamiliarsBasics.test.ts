import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, compute, deriveFamiliar, type FamiliarMasterInputs } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeMasterDoc(
  level: number,
  build: Partial<CharacterDoc["build"]> = {},
  live: Partial<CharacterDoc["live"]> = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 20, wis: 12, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      settings: { statOverrides: { "hp.max": 40 } },
      ...build,
    },
    live: {
      hp: { current: 40, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      ...live,
    },
  } as CharacterDoc;
}

function familiarFor(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  const master: FamiliarMasterInputs = {
    maxHp: sheet.hp.max,
    bab: sheet.bab,
    baseSaves: {
      fort: sheet.saves.fort.components.find((c) => c.type === "base")?.value ?? 0,
      ref: sheet.saves.ref.components.find((c) => c.type === "base")?.value ?? 0,
      will: sheet.saves.will.components.find((c) => c.type === "base")?.value ?? 0,
    },
  };
  const rollData = buildRollData(doc, ref, sheet.abilities, sheet.speeds, sheet.bab);
  return deriveFamiliar(doc, master, rollData);
}

// Every fixture below uses a wizard at master level 7: BAB +3, base saves
// Fort +2 / Ref +2 / Will +5 (the same wizard-7 numbers already verified in
// improvedFamiliars.test.ts's imp fixture), and the familiar progression
// table's ML7 natural-armor adjustment +4 / Int 9 (ceil(7/2) = 4, 5+4 = 9).

describe("deriveFamiliar: fiendish template (Bestiary p.294, hand-computed)", () => {
  const doc = makeMasterDoc(3, {
    familiar: { speciesId: "cat", name: "Grim", template: "fiendish" },
  });
  const familiar = familiarFor(doc)!;

  it("prefixes the display name and keeps the cat chassis", () => {
    expect(familiar.speciesName).toBe("Fiendish Cat");
  });

  it("adds darkvision to the cat's own senses", () => {
    expect(familiar.senses).toContain("darkvision 60 ft.");
    expect(familiar.senses).toContain("low-light vision");
  });

  it("1-HD tier: resist cold 5 / fire 5, SR 5, no DR", () => {
    expect(familiar.defenses).toEqual({ resist: ["cold 5", "fire 5"] });
    expect(familiar.spellResistance).toBe(5);
  });

  it("carries the fiendish template note", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Fiendish template")).toBe(true);
  });
});

describe("deriveFamiliar: entropic template (Bestiary 2 p.294, hand-computed)", () => {
  const doc = makeMasterDoc(3, {
    familiar: { speciesId: "cat", name: "Riot", template: "entropic" },
  });
  const familiar = familiarFor(doc)!;

  it("prefixes the display name and keeps the cat chassis", () => {
    expect(familiar.speciesName).toBe("Entropic Cat");
  });

  it("1-HD tier: resist acid 5 / fire 5, SR 5, no DR", () => {
    expect(familiar.defenses).toEqual({ resist: ["acid 5", "fire 5"] });
    expect(familiar.spellResistance).toBe(5);
  });

  it("carries the entropic template note", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Entropic template")).toBe(true);
  });
});

describe("deriveFamiliar: resolute template (Bestiary 2 p.294, hand-computed)", () => {
  const doc = makeMasterDoc(3, {
    familiar: { speciesId: "cat", name: "Order", template: "resolute" },
  });
  const familiar = familiarFor(doc)!;

  it("prefixes the display name and keeps the cat chassis", () => {
    expect(familiar.speciesName).toBe("Resolute Cat");
  });

  // Verified against three independent source pulls: acid/cold/FIRE, not
  // acid/cold/sonic.
  it("1-HD tier: resist acid 5 / cold 5 / fire 5, SR 5, no DR", () => {
    expect(familiar.defenses).toEqual({ resist: ["acid 5", "cold 5", "fire 5"] });
    expect(familiar.spellResistance).toBe(5);
  });

  it("carries the resolute template note", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Resolute template")).toBe(true);
  });
});

describe("deriveFamiliar: dire rat for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "dire-rat", name: "Skitters" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Animal");
    expect(familiar.hd).toBe(1);
  });

  it("AC 18 (10 +3 Dex +1 size +4 natural: own 0 + table 4), touch 14, flat-footed 15", () => {
    expect(familiar.ac.normal).toBe(18);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(15);
  });

  it("saves better-of: Fort +3 (own 2 = master 2, +Con 1), Ref +5 (own 2 = master 2, +Dex 3), Will +6 (master 5 + Wis 1)", () => {
    expect(familiar.saves.fort).toBe(3);
    expect(familiar.saves.ref).toBe(5);
    expect(familiar.saves.will).toBe(6);
  });

  it("bite +7 (master BAB 3 + Dex 3 + size 1), damage 1d4+0, plus disease", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(7);
    expect(familiar.attacks[0]!.damageDice).toBe("1d4");
    expect(familiar.attacks[0]!.damageBonus).toBe(0);
    expect(familiar.attacks[0]!.note).toBe("plus disease");
  });

  it("printed skill totals reconcile: Climb +11, Swim +11, Stealth +11, Perception +4", () => {
    // Climb/Swim: Dex 3 + auto climb/swim-speed racial 8 (0 own ranks).
    expect(familiar.skills.clm!.total).toBe(11);
    expect(familiar.skills.swm!.total).toBe(11);
    // Stealth: Dex 3 + size 4 + 1 own rank + class 3 (animal class-skill set).
    expect(familiar.skills.ste!.total).toBe(11);
    // Perception: Wis 1 + Skill Focus (Perception) folded into racial 3.
    expect(familiar.skills.per!.total).toBe(4);
  });

  it("no defenses block (dire rat carries none)", () => {
    expect(familiar.defenses).toBeUndefined();
  });

  it("carries the disease special note", () => {
    expect(familiar.specialNotes).toContain(
      "Disease (bite): filth fever, Fort DC 11, onset 1d3 days, 1/day, 1d3 Dex and 1d3 Con damage, cure 2 consecutive saves",
    );
  });
});

describe("deriveFamiliar: stirge for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "stirge", name: "Needle" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Magical Beast");
    expect(familiar.hd).toBe(1);
  });

  it("AC 20 (10 +4 Dex +2 size +4 natural: own 0 + table 4), touch 16, flat-footed 16", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(16);
    expect(familiar.ac.flatFooted).toBe(16);
  });

  it("saves better-of: Fort +2, Ref +6 (own 2 = master 2, +Dex 4), Will +6 (master 5 + Wis 1)", () => {
    expect(familiar.saves.fort).toBe(2);
    expect(familiar.saves.ref).toBe(6);
    expect(familiar.saves.will).toBe(6);
  });

  it("proboscis attaches instead of dealing damage (display quirk: Str mod still applies)", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.damageDice).toBe("0");
    // Str 3 (mod -4) is always added by deriveFamiliar's generic attack math,
    // even though the proboscis's RAW damage is "0" (it attaches instead).
    expect(familiar.attacks[0]!.damageBonus).toBe(-4);
  });

  it("printed skill totals reconcile: Fly +8, Stealth +16", () => {
    // Fly: Dex 4 + size 4 + average 0, no ranks needed (not a class skill here).
    expect(familiar.skills.fly!.total).toBe(8);
    // Stealth: Dex 4 + size 8 + 1 own rank + class 3 (stirge's own class list).
    expect(familiar.skills.ste!.total).toBe(16);
  });

  it("carries the attach/blood-drain special notes", () => {
    expect(familiar.specialNotes).toContain(
      "Attach: a successful proboscis touch attack attaches the stirge instead of dealing damage",
    );
  });
});

describe("deriveFamiliar: small air elemental for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "air-elemental", name: "Zephyr" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (air, elemental, extraplanar)");
    expect(familiar.hd).toBe(2);
    expect(familiar.languages).toEqual(["Auran"]);
  });

  it("AC 21 (10 +3 Dex +1 size +7 natural: own 3 + table 4), touch 14, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(21);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("saves better-of: Fort +4 (own 3 + Con 1), Ref +6 (own 3 + Dex 3), Will +5 (master 5, Wis 0)", () => {
    expect(familiar.saves.fort).toBe(4);
    expect(familiar.saves.ref).toBe(6);
    expect(familiar.saves.will).toBe(5);
  });

  it("slam +7 (master BAB 3 + Str/Dex better 3 + size 1), damage 1d4+1", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(7);
    expect(familiar.attacks[0]!.damageDice).toBe("1d4");
    expect(familiar.attacks[0]!.damageBonus).toBe(1);
  });

  it("printed skill totals reconcile: Fly +17, Stealth +11", () => {
    // Fly: Dex 3 + size 2 + perfect 8 + 1 own rank + class 3.
    expect(familiar.skills.fly!.total).toBe(17);
    // Stealth: Dex 3 + size 4 + 1 own rank + class 3.
    expect(familiar.skills.ste!.total).toBe(11);
  });

  it("immune to elemental traits, no SR of its own", () => {
    expect(familiar.defenses).toEqual({ immune: ["elemental traits"] });
    expect(familiar.spellResistance).toBeUndefined();
  });
});

describe("deriveFamiliar: small earth elemental for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "earth-elemental", name: "Bedrock" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (earth, elemental, extraplanar)");
    expect(familiar.hd).toBe(2);
    expect(familiar.languages).toEqual(["Terran"]);
  });

  it("AC 21 (10 -1 Dex +1 size +11 natural: own 7 + table 4), touch 10, flat-footed 22", () => {
    expect(familiar.ac.normal).toBe(21);
    expect(familiar.ac.touch).toBe(10);
    expect(familiar.ac.flatFooted).toBe(22);
  });

  // Earth's own baseSaves (good Fort/Will, poor Ref) is the mirror image of
  // air/fire/water's (good Fort/Ref, poor Will) — verified, not assumed.
  it("saves better-of: Fort +4 (own 3 + Con 1), Ref +1 (master 2, Dex -1), Will +5 (master 5, Wis 0)", () => {
    expect(familiar.saves.fort).toBe(4);
    expect(familiar.saves.ref).toBe(1);
    expect(familiar.saves.will).toBe(5);
  });

  it("slam +7 (master BAB 3 + Str/Dex better 3 + size 1), damage 1d6+3", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(7);
    expect(familiar.attacks[0]!.damageDice).toBe("1d6");
    expect(familiar.attacks[0]!.damageBonus).toBe(3);
  });

  it("printed skill totals reconcile: Climb +7, Perception +4", () => {
    // Climb: Str 3 + 1 own rank + class 3 (no climb speed on this creature).
    expect(familiar.skills.clm!.total).toBe(7);
    expect(familiar.skills.per!.total).toBe(4);
  });

  it("immune to elemental traits, no SR of its own", () => {
    expect(familiar.defenses).toEqual({ immune: ["elemental traits"] });
    expect(familiar.spellResistance).toBeUndefined();
  });
});

describe("deriveFamiliar: small fire elemental for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "fire-elemental", name: "Cinder" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (elemental, extraplanar, fire)");
    expect(familiar.hd).toBe(2);
    expect(familiar.languages).toEqual(["Ignan"]);
  });

  // Printed AC 16 includes a +1 dodge bonus from its own Dodge feat, which
  // this module has no field for (accepted gap, same as the imp's Dodge —
  // see the specialNotes assertion below).
  it("AC 19 (10 +1 Dex +1 size +7 natural: own 3 + table 4; dodge not modeled), touch 12, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(19);
    expect(familiar.ac.touch).toBe(12);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("saves better-of: Fort +3, Ref +4 (own 3 + Dex 1), Will +5 (master 5, Wis 0)", () => {
    expect(familiar.saves.fort).toBe(3);
    expect(familiar.saves.ref).toBe(4);
    expect(familiar.saves.will).toBe(5);
  });

  it("slam +5 (master BAB 3 + Str/Dex better 1 + size 1), damage 1d4+0, plus burn", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(5);
    expect(familiar.attacks[0]!.damageDice).toBe("1d4");
    expect(familiar.attacks[0]!.damageBonus).toBe(0);
    expect(familiar.attacks[0]!.note).toContain("burn");
  });

  it("printed skill totals reconcile: Climb +4, Intimidate +4", () => {
    expect(familiar.skills.clm!.total).toBe(4);
    expect(familiar.skills.int!.total).toBe(4);
  });

  it("immune to elemental traits and fire, vulnerable to cold, no SR", () => {
    expect(familiar.defenses).toEqual({
      immune: ["elemental traits", "fire"],
      weaknesses: ["vulnerability to cold"],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("notes the un-modeled Dodge feat", () => {
    expect(familiar.specialNotes).toContain(
      "Own feat: Dodge (its +1 dodge AC is not folded into the derived AC)",
    );
  });
});

describe("deriveFamiliar: small water elemental for a wizard 7 (Bestiary, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "water-elemental", name: "Ripple" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (elemental, extraplanar, water)");
    expect(familiar.hd).toBe(2);
    expect(familiar.languages).toEqual(["Aquan"]);
  });

  it("AC 21 (10 +0 Dex +1 size +10 natural: own 6 + table 4), touch 11, flat-footed 21", () => {
    expect(familiar.ac.normal).toBe(21);
    expect(familiar.ac.touch).toBe(11);
    expect(familiar.ac.flatFooted).toBe(21);
  });

  it("saves better-of: Fort +4 (own 3 + Con 1), Ref +3 (own 3, Dex 0), Will +5 (master 5, Wis 0)", () => {
    expect(familiar.saves.fort).toBe(4);
    expect(familiar.saves.ref).toBe(3);
    expect(familiar.saves.will).toBe(5);
  });

  it("slam +6 (master BAB 3 + Str/Dex better 2 + size 1), damage 1d6+2", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(6);
    expect(familiar.attacks[0]!.damageDice).toBe("1d6");
    expect(familiar.attacks[0]!.damageBonus).toBe(2);
  });

  it("printed skill totals reconcile: Swim +14, Stealth +8", () => {
    // Swim: Dex 0 (swim-speed override) + auto racial 8 + 3 own ranks + class 3.
    expect(familiar.skills.swm!.total).toBe(14);
    // Stealth: Dex 0 + size 4 + 1 own rank + class 3.
    expect(familiar.skills.ste!.total).toBe(8);
  });

  it("immune to elemental traits, no SR of its own", () => {
    expect(familiar.defenses).toEqual({ immune: ["elemental traits"] });
    expect(familiar.spellResistance).toBeUndefined();
  });
});
