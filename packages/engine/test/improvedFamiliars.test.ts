import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  BASE_FAMILIARS,
  buildRollData,
  compute,
  deriveFamiliar,
  FAMILIAR_TEMPLATES,
  IMPROVED_FAMILIARS,
  SKILL_ABILITY,
  type FamiliarMasterInputs,
} from "../src/index.js";

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

describe("improved-familiar tables (drift guards)", () => {
  it("standard and improved species share one id namespace without collisions", () => {
    for (const id of Object.keys(IMPROVED_FAMILIARS)) {
      expect(BASE_FAMILIARS[id]).toBeUndefined();
    }
  });

  it("every improved entry's skill references use known skill ids", () => {
    for (const [id, species] of Object.entries(IMPROVED_FAMILIARS)) {
      for (const key of [
        ...Object.keys(species.ownSkillRanks ?? {}),
        ...(species.classSkills ?? []),
        ...Object.keys(species.skillRacialMods ?? {}),
      ]) {
        // Parameterized instances ("crf.alchemy") validate on their base id.
        const base = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
        expect(SKILL_ABILITY[base], `${id}: unknown skill id ${key}`).toBeDefined();
      }
    }
  });

  it("every improved entry carries a published prereq and source, and SLA slugs are unique", () => {
    for (const [id, species] of Object.entries(IMPROVED_FAMILIARS)) {
      expect(species.prereq.casterLevel, `${id}: prereq`).toBeGreaterThanOrEqual(3);
      expect(species.source.length, `${id}: source`).toBeGreaterThan(0);
      const slugs = (species.slas ?? []).map((s) => s.slug);
      expect(new Set(slugs).size, `${id}: duplicate SLA slug`).toBe(slugs.length);
    }
  });

  it("every template resolves a 1-HD defenses tier", () => {
    for (const [id, template] of Object.entries(FAMILIAR_TEMPLATES)) {
      expect(Object.keys(template.defensesForHd(1)).length, `${id}`).toBeGreaterThan(0);
      expect(template.prereq.casterLevel).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("deriveFamiliar: imp for a wizard 7 (Bestiary p.78, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "imp", name: "Zixit" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar).toBeDefined();
    expect(familiar.creatureType).toBe("Outsider (devil, evil, extraplanar, lawful)");
    expect(familiar.hd).toBe(3);
    expect(familiar.languages).toEqual(["Common", "Infernal"]);
  });

  it("Int is the better of the progression table (9 at ML 7) and the imp's own 13", () => {
    expect(familiar.abilities.int.score).toBe(13);
    expect(familiar.abilities.int.mod).toBe(1);
  });

  it("HP is half the master's 40 — the published feat keeps the normal familiar HP rule", () => {
    expect(familiar.hp.max).toBe(20);
  });

  it("AC 20 (10 +3 Dex +2 size +5 natural: own 1 + table 4), touch 15, flat-footed 17", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(15);
    expect(familiar.ac.flatFooted).toBe(17);
  });

  it("saves better-of: Fort +2 (master 2 > own 1), Ref +6 (own 3 + Dex 3), Will +6 (master 5 + Wis 1)", () => {
    // Wizard 7 base saves: Fort 2 / Ref 2 / Will 5.
    expect(familiar.saves.fort).toBe(2);
    expect(familiar.saves.ref).toBe(6);
    expect(familiar.saves.will).toBe(6);
  });

  it("sting +8 (master BAB 3 + Dex 3 + size 2), damage 1d4+0", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(8);
    expect(familiar.attacks[0]!.damageBonus).toBe(0);
  });

  it("CMB +4 / CMD 14 (RAW Tiny-Dex rule; the printed +1/15 uses Str and folds in Dodge, neither modeled)", () => {
    expect(familiar.cmb).toBe(4);
    expect(familiar.cmd).toBe(14);
  });

  it("own skill ranks + own class skills reproduce the printed totals", () => {
    // Fly +21 = Dex 3 + size 4 + perfect 8 + 3 ranks + class 3.
    expect(familiar.skills.fly!.total).toBe(21);
    expect(familiar.skills.blf!.total).toBe(8);
    expect(familiar.skills.kar!.total).toBe(7);
    expect(familiar.skills.kpl!.total).toBe(7);
    expect(familiar.skills.per!.total).toBe(7);
    expect(familiar.skills.spl!.total).toBe(7);
    expect(familiar.skills.acr!.total).toBe(9);
    // Stealth is NOT an imp class skill (the animal set doesn't apply to an
    // outsider): Dex 3 + Tiny size 8, no +3.
    expect(familiar.skills.ste!.total).toBe(11);
  });

  it("defenses block as printed; no SR at ML 7 (imp has none of its own)", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/good or silver",
      fastHealing: 2,
      resist: ["acid 10", "cold 10"],
      immune: ["fire", "poison"],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("six SLAs with the printed meters; Suggestion has 1/day remaining", () => {
    expect(familiar.slas).toHaveLength(6);
    const suggestion = familiar.slas!.find((s) => s.slug === "suggestion")!;
    expect(suggestion.usesMax).toBe(1);
    expect(suggestion.usesRemaining).toBe(1);
    expect(suggestion.dcMod).toBe(2);
    const commune = familiar.slas!.find((s) => s.slug === "commune")!;
    expect(commune.per).toBe("week");
    expect(commune.cl).toBe(12);
    const invisibility = familiar.slas!.find((s) => s.slug === "invisibility")!;
    expect(invisibility.frequency).toBe("atWill");
    expect(invisibility.usesRemaining).toBeUndefined();
  });

  it("spent SLA uses come off the remaining count via live.familiar.slaUses", () => {
    const spentDoc = makeMasterDoc(
      7,
      { familiar: { speciesId: "imp", name: "Zixit" } },
      { familiar: { slaUses: { suggestion: 1, augury: 3 } } },
    );
    const spent = familiarFor(spentDoc)!;
    expect(spent.slas!.find((s) => s.slug === "suggestion")!.usesRemaining).toBe(0);
    // Over-spend clamps at 0, never negative.
    expect(spent.slas!.find((s) => s.slug === "augury")!.usesRemaining).toBe(0);
  });

  it("never gains Speak with Animals of Its Kind (the feat's second exception)", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Master")).toBe(true);
  });

  it("progression SR takes over at ML 11 (11 + 5 = 16)", () => {
    const doc11 = makeMasterDoc(11, { familiar: { speciesId: "imp", name: "Zixit" } });
    expect(familiarFor(doc11)!.spellResistance).toBe(16);
  });
});

describe("deriveFamiliar: celestial template on a standard animal", () => {
  const doc = makeMasterDoc(3, {
    familiar: { speciesId: "cat", name: "Halo", template: "celestial" },
  });
  const familiar = familiarFor(doc)!;

  it("keeps the cat chassis and prefixes the display name", () => {
    expect(familiar.speciesName).toBe("Celestial Cat");
    expect(familiar.speeds.land).toBe(30);
  });

  it("adds darkvision to the cat's own senses", () => {
    expect(familiar.senses).toContain("darkvision 60 ft.");
    expect(familiar.senses).toContain("low-light vision");
  });

  it("1-HD tier defenses: resist 5 ×3, SR 5, no DR", () => {
    expect(familiar.defenses).toEqual({
      resist: ["acid 5", "cold 5", "electricity 5"],
    });
    expect(familiar.spellResistance).toBe(5);
  });

  it("carries the smite note and loses Speak with Animals of Its Kind at ML 7+", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Celestial template")).toBe(true);
    const doc7 = makeMasterDoc(7, {
      familiar: { speciesId: "cat", name: "Halo", template: "celestial" },
    });
    const fam7 = familiarFor(doc7)!;
    expect(fam7.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });

  it("an unknown template id degrades to the plain species", () => {
    const doc2 = makeMasterDoc(3, {
      familiar: { speciesId: "cat", name: "Halo", template: "nope" },
    });
    const fam = familiarFor(doc2)!;
    expect(fam.speciesName).toBe("Cat");
    expect(fam.defenses).toBeUndefined();
  });
});

describe("deriveFamiliar: bat Fly regression (RAW maneuverability values + own rank)", () => {
  it("Fly +16 = Dex 2 + size 6 + good 4 + 1 own rank + class 3", () => {
    const doc = makeMasterDoc(4, { familiar: { speciesId: "bat", name: "Echo" } });
    const familiar = familiarFor(doc)!;
    expect(familiar.skills.fly!.total).toBe(16);
  });
});
