import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, compute, type FamiliarMasterInputs } from "../src/index.js";
import { deriveFamiliar } from "../src/familiar.js";

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

// Every fixture below is a wizard 7 (BAB 3; base saves Fort 2/Ref 2/Will 5;
// max HP 40 from the settings override), matching improvedFamiliars.test.ts's
// imp fixture so the master-derived numbers are already known-good.

describe("deriveFamiliar: quasit for a wizard 7 (Bestiary p.66, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "quasit", name: "Skitter" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar).toBeDefined();
    expect(familiar.creatureType).toBe("Outsider (chaotic, demon, evil, extraplanar)");
    expect(familiar.hd).toBe(3);
  });

  it("AC 20 (10 +2 Dex +2 size +6 natural: own 2 + table 4), touch 14, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("saves better-of: Fort +2 (master 2 > own 1), Ref +5 (own 3 + Dex 2), Will +6 (master 5 + Wis 1)", () => {
    expect(familiar.saves.fort).toBe(2);
    expect(familiar.saves.ref).toBe(5);
    expect(familiar.saves.will).toBe(6);
  });

  it("2 claws +7 (1d3-1 plus poison), bite +7 (1d4-1) — master BAB 3 + Dex 2 + size 2", () => {
    expect(familiar.attacks).toHaveLength(2);
    const claw = familiar.attacks.find((a) => a.name === "Claw")!;
    const bite = familiar.attacks.find((a) => a.name === "Bite")!;
    expect(claw.attack).toBe(7);
    expect(claw.count).toBe(2);
    expect(claw.damageBonus).toBe(-1);
    expect(claw.note).toBe("plus poison");
    expect(bite.attack).toBe(7);
    expect(bite.damageBonus).toBe(-1);
    expect(bite.note).toBeUndefined();
  });

  it("own skill ranks + own class skills reproduce the printed totals", () => {
    // Printed: Bluff +6, Fly +20, Intimidate +6, Knowledge (planes) +6,
    // Perception +7, Stealth +16 — all reconcile from 3 ranks (= its HD)
    // plus the class-skill +3, e.g. Fly = Dex 2 + size 4 + perfect 8 + 3 + 3.
    expect(familiar.skills.blf!.total).toBe(6);
    expect(familiar.skills.fly!.total).toBe(20);
    expect(familiar.skills.int!.total).toBe(6);
    expect(familiar.skills.kpl!.total).toBe(6);
    expect(familiar.skills.per!.total).toBe(7);
    expect(familiar.skills.ste!.total).toBe(16);
  });

  it("defenses block as printed; no SR at ML 7 (quasit has none of its own)", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/cold iron or good",
      fastHealing: 2,
      resist: ["acid 10", "cold 10", "fire 10"],
      immune: ["electricity", "poison"],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("five SLAs with the printed meters and CL (Commune stays CL 6, unlike the imp's elevated 12)", () => {
    expect(familiar.slas).toHaveLength(5);
    const causeFear = familiar.slas!.find((s) => s.slug === "cause-fear")!;
    expect(causeFear.usesMax).toBe(1);
    expect(causeFear.usesRemaining).toBe(1);
    expect(causeFear.dcMod).toBe(0);
    const commune = familiar.slas!.find((s) => s.slug === "commune")!;
    expect(commune.per).toBe("week");
    expect(commune.cl).toBe(6);
    const invisibility = familiar.slas!.find((s) => s.slug === "invisibility")!;
    expect(invisibility.frequency).toBe("atWill");
    expect(invisibility.usesRemaining).toBeUndefined();
    const detectGood = familiar.slas!.find((s) => s.slug === "detect-good")!;
    expect(detectGood.frequency).toBe("constant");
  });

  it("never gains Speak with Animals of Its Kind (the feat's second exception)", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });
});

describe("deriveFamiliar: homunculus for a wizard 7 (Bestiary p.176, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "homunculus", name: "Grix" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar).toBeDefined();
    expect(familiar.creatureType).toBe("Construct");
    expect(familiar.hd).toBe(2);
  });

  it("has no Constitution score modeled — the abilities field uses the neutral 10/+0 stand-in", () => {
    expect(familiar.abilities.con.score).toBe(10);
    expect(familiar.abilities.con.mod).toBe(0);
  });

  it("AC 18 (10 +2 Dex +2 size +4 natural: own 0 + table 4), touch 14, flat-footed 16", () => {
    expect(familiar.ac.normal).toBe(18);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(16);
  });

  it("saves better-of: Fort +2 (master 2 > own 0), Ref +4 (own 2 + Dex 2), Will +6 (master 5 + Wis 1)", () => {
    expect(familiar.saves.fort).toBe(2);
    expect(familiar.saves.ref).toBe(4);
    expect(familiar.saves.will).toBe(6);
  });

  it("bite +7 (1d4-1 plus poison) — master BAB 3 + Dex 2 + size 2", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(7);
    expect(familiar.attacks[0]!.damageBonus).toBe(-1);
    expect(familiar.attacks[0]!.note).toBe("plus poison");
  });

  it("own skill ranks reproduce the printed totals (no class skills — none reconcile with +3)", () => {
    // Printed: Fly +10, Perception +3, Stealth +12. Fly needs 0 ranks (Dex 2
    // + size 4 + good 4 already totals 10); Perception/Stealth reconcile
    // from 2 ranks (its HD) with no class-skill bonus.
    expect(familiar.skills.fly!.total).toBe(10);
    expect(familiar.skills.per!.total).toBe(3);
    expect(familiar.skills.ste!.total).toBe(12);
  });

  it("construct-traits defenses block as printed; no SR", () => {
    expect(familiar.defenses).toEqual({
      immune: [
        "construct traits",
        "mind-affecting effects",
        "poison",
        "sleep",
        "paralysis",
        "stunning",
        "disease",
        "death effects",
        "energy drain",
        "ability drain",
        "exhaustion",
        "fatigue",
        "nonlethal damage",
        "ability damage",
        "bleed damage",
      ],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("carries no spell-like abilities", () => {
    expect(familiar.slas).toBeUndefined();
  });
});

describe("deriveFamiliar: pseudodragon for a wizard 7 (Bestiary p.229, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "pseudodragon", name: "Ember" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar).toBeDefined();
    expect(familiar.creatureType).toBe("Dragon");
    expect(familiar.hd).toBe(2);
  });

  it("AC 20 (10 +2 Dex +2 size +6 natural: own 2 + table 4), touch 14, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("saves better-of: Fort +4 (own 3 + Con 1), Ref +5 (own 3 + Dex 2), Will +6 (master 5 + Wis 1)", () => {
    // Wizard 7 base saves Fort 2/Ref 2/Will 5; the pseudodragon's own good
    // 2-HD base save (3) beats the master's on Fort and Ref.
    expect(familiar.saves.fort).toBe(4);
    expect(familiar.saves.ref).toBe(5);
    expect(familiar.saves.will).toBe(6);
  });

  it("sting +7 (1d3-2 plus poison), bite +7 (1d2-2) — master BAB 3 + Dex 2 + size 2", () => {
    expect(familiar.attacks).toHaveLength(2);
    const sting = familiar.attacks.find((a) => a.name === "Sting")!;
    const bite = familiar.attacks.find((a) => a.name === "Bite")!;
    expect(sting.attack).toBe(7);
    expect(sting.damageBonus).toBe(-2);
    expect(sting.note).toBe("plus poison");
    expect(bite.attack).toBe(7);
    expect(bite.damageBonus).toBe(-2);
  });

  it("own skill ranks + own class skills + the printed Stealth racial reproduce the totals", () => {
    // Printed: Diplomacy +5, Fly +15, Perception +6, Sense Motive +6,
    // Survival +6, Stealth +19 — all reconcile from 2 ranks (its HD) plus
    // the class-skill +3, and Stealth additionally carries its own printed
    // +4 racial bonus (Dex 2 + size 8 + 2 + 3 + 4 = 19). The further "+23 in
    // forests" is a situational bonus this module doesn't bake in.
    expect(familiar.skills.dip!.total).toBe(5);
    expect(familiar.skills.fly!.total).toBe(15);
    expect(familiar.skills.per!.total).toBe(6);
    expect(familiar.skills.sen!.total).toBe(6);
    expect(familiar.skills.sur!.total).toBe(6);
    expect(familiar.skills.ste!.total).toBe(19);
  });

  it("defenses block as printed (SR 12, immune to paralysis/sleep)", () => {
    expect(familiar.defenses).toEqual({ immune: ["paralysis", "sleep"] });
  });

  it("its own SR 12 applies below master level 11, where the progression is inactive", () => {
    expect(familiar.spellResistance).toBe(12);
  });

  it("the master-level progression (level + 5) overtakes the printed SR 12 at high master level", () => {
    const doc15 = makeMasterDoc(15, { familiar: { speciesId: "pseudodragon", name: "Ember" } });
    expect(familiarFor(doc15)!.spellResistance).toBe(20);
  });

  it("never gains Speak with Animals of Its Kind (the feat's second exception)", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });
});
