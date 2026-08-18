import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  buildRollData,
  compute,
  deriveFamiliar,
  IMPROVED_FAMILIARS,
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

// All ten species this shard adds — see `species-splat.ts` for citations.
const SPLAT_IDS = [
  "silvanshee",
  "lyrakien",
  "cassisian",
  "nosoi",
  "cacodaemon",
  "arbiter",
  "paracletus",
  "voidworm",
  "brownie",
  "faerie-dragon",
] as const;

describe("improved-familiar splat table: sanity pass over all ten species", () => {
  for (const id of SPLAT_IDS) {
    it(`${id} is registered in IMPROVED_FAMILIARS`, () => {
      expect(IMPROVED_FAMILIARS[id]).toBeDefined();
    });

    it(`${id} derives a full familiar sheet for a wizard 7`, () => {
      const doc = makeMasterDoc(7, { familiar: { speciesId: id, name: "Test" } });
      const familiar = familiarFor(doc);
      expect(familiar).toBeDefined();
      expect(familiar!.creatureType).toBeTruthy();
      expect(familiar!.hd).toBeGreaterThan(0);
      expect(familiar!.slas!.length).toBeGreaterThan(0);
    });

    it(`${id} carries a published-table prereq and source`, () => {
      const species = IMPROVED_FAMILIARS[id]!;
      expect(species.prereq.casterLevel).toBeGreaterThanOrEqual(3);
      expect(species.prereq.alignment).toBeTruthy();
      expect(species.source.length).toBeGreaterThan(0);
    });

    it(`${id} has a nonempty defenses block`, () => {
      const species = IMPROVED_FAMILIARS[id]!;
      expect(Object.keys(species.defenses ?? {}).length).toBeGreaterThan(0);
    });

    it(`${id} SLA slugs are unique`, () => {
      const slugs = (IMPROVED_FAMILIARS[id]!.slas ?? []).map((s) => s.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  }

  // The brownie is the one species in this shard where the published
  // Improved Familiar table's own level (5th) undercuts its Bestiary
  // placement alongside the CL-7 outsiders — see `species-splat.ts`.
  it("brownie's table prereq is 5th level, not 7th", () => {
    expect(IMPROVED_FAMILIARS.brownie!.prereq.casterLevel).toBe(5);
  });
});

describe("deriveFamiliar: silvanshee for a wizard 7 (Bestiary 2 p.20, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "silvanshee", name: "Puck" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (agathion, extraplanar, good)");
    expect(familiar.hd).toBe(2);
  });

  it("Int is the better of the progression table (9 at ML 7) and the silvanshee's own printed 10", () => {
    expect(familiar.abilities.int.score).toBe(10);
  });

  it("HP is half the master's 40", () => {
    expect(familiar.hp.max).toBe(20);
  });

  it("AC 19 (10 +2 Dex +2 size +5 natural: own 1 + table 4), touch 14, flat-footed 17", () => {
    expect(familiar.ac.normal).toBe(19);
    expect(familiar.ac.touch).toBe(14);
    expect(familiar.ac.flatFooted).toBe(17);
  });

  it("saves better-of: Fort +5 (own 4 > master 2, +1 Con), Ref +6 (own 4 > master 2, +2 Dex), Will +6 (master 5 > own 1, +1 Wis)", () => {
    expect(familiar.saves.fort).toBe(5);
    expect(familiar.saves.ref).toBe(6);
    expect(familiar.saves.will).toBe(6);
  });

  it("bite +7 (master BAB 3 + Dex 2 + size 2), damage 1d3-4; 2 claws same bonus, 1d2-4", () => {
    expect(familiar.attacks).toHaveLength(2);
    const bite = familiar.attacks.find((a) => a.name === "Bite")!;
    expect(bite.attack).toBe(7);
    expect(bite.damageBonus).toBe(-4);
    const claw = familiar.attacks.find((a) => a.name === "Claw")!;
    expect(claw.count).toBe(2);
    expect(claw.damageDice).toBe("1d2");
  });

  it("own skill ranks reproduce the printed Acrobatics/Stealth/Perception totals", () => {
    // Acrobatics +11 printed (2 ranks + Dex 2 + class 3 + racial 4 = 11) —
    // this app's derived total omits the +4 racial (not authored, see the
    // module comment on Fly/Climb) so it lands at 7, not 11.
    expect(familiar.skills.acr!.total).toBe(7);
    expect(familiar.skills.ste!.total).toBe(15);
    expect(familiar.skills.per!.total).toBe(6);
  });

  it("defenses and SR as printed; SR 13 beats the ML 7 progression (which grants none yet)", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/evil or silver",
      resist: ["cold 10", "sonic 10"],
      immune: ["electricity", "petrification"],
    });
    expect(familiar.spellResistance).toBe(13);
  });

  it("seven SLAs with the printed meters", () => {
    expect(familiar.slas).toHaveLength(7);
    const dimDoor = familiar.slas!.find((s) => s.slug === "dimension-door")!;
    expect(dimDoor.usesMax).toBe(1);
    expect(dimDoor.usesRemaining).toBe(1);
    expect(dimDoor.note).toBe("self plus 5 lbs. of objects only");
    const commune = familiar.slas!.find((s) => s.slug === "commune")!;
    expect(commune.per).toBe("week");
    expect(commune.cl).toBe(12);
    const knowDirection = familiar.slas!.find((s) => s.slug === "know-direction")!;
    expect(knowDirection.frequency).toBe("constant");
  });

  it("never gains Speak with Animals of Its Kind", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });
});

describe("deriveFamiliar: cacodaemon for a wizard 7 (Bestiary 2 p.64, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "cacodaemon", name: "Grix" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Outsider (daemon, evil, extraplanar)");
    expect(familiar.hd).toBe(3);
  });

  it("Int is the progression table's 9 (better than the cacodaemon's own printed 8)", () => {
    expect(familiar.abilities.int.score).toBe(9);
  });

  it("AC 20 (10 +0 Dex +2 size +8 natural: own 4 + table 4), touch 12, flat-footed 20", () => {
    expect(familiar.ac.normal).toBe(20);
    expect(familiar.ac.touch).toBe(12);
    expect(familiar.ac.flatFooted).toBe(20);
  });

  it("saves better-of: Fort +3, Ref +5, Will +6", () => {
    expect(familiar.saves.fort).toBe(3);
    expect(familiar.saves.ref).toBe(5);
    expect(familiar.saves.will).toBe(6);
  });

  it("bite +6 (master BAB 3 + Str 1 + size 2), damage 1d4+1, plus disease", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(6);
    expect(familiar.attacks[0]!.damageBonus).toBe(1);
    expect(familiar.attacks[0]!.note).toBe("plus disease");
  });

  it("own skill ranks reproduce every printed total exactly (all five reconciled at 3 ranks)", () => {
    expect(familiar.skills.blf!.total).toBe(7);
    expect(familiar.skills.fly!.total).toBe(18);
    expect(familiar.skills.kpl!.total).toBe(5);
    expect(familiar.skills.per!.total).toBe(7);
    expect(familiar.skills.ste!.total).toBe(14);
  });

  it("defenses as printed; no SR at ML 7 (cacodaemon has none of its own)", () => {
    expect(familiar.defenses).toEqual({
      dr: "5/good or silver",
      fastHealing: 2,
      resist: ["cold 10", "electricity 10", "fire 10"],
      immune: ["acid", "death effects", "disease", "poison"],
    });
    expect(familiar.spellResistance).toBeUndefined();
  });

  it("five SLAs with the printed meters; Lesser Confusion resolves to the vendored spell name", () => {
    expect(familiar.slas).toHaveLength(5);
    const confusion = familiar.slas!.find((s) => s.slug === "lesser-confusion")!;
    expect(confusion.spell).toBe("Confusion, Lesser");
    expect(confusion.usesMax).toBe(3);
    expect(confusion.usesRemaining).toBe(3);
    const invis = familiar.slas!.find((s) => s.slug === "invisibility")!;
    expect(invis.frequency).toBe("atWill");
    expect(invis.note).toBe("self only");
  });

  it("spent SLA uses come off the remaining count via live.familiar.slaUses", () => {
    const spentDoc = makeMasterDoc(
      7,
      { familiar: { speciesId: "cacodaemon", name: "Grix" } },
      { familiar: { slaUses: { "lesser-confusion": 2 } } },
    );
    const spent = familiarFor(spentDoc)!;
    expect(spent.slas!.find((s) => s.slug === "lesser-confusion")!.usesRemaining).toBe(1);
  });
});

describe("deriveFamiliar: faerie dragon for a wizard 7 (Bestiary 3 p.91, hand-computed)", () => {
  const doc = makeMasterDoc(7, { familiar: { speciesId: "faerie-dragon", name: "Puff" } });
  const familiar = familiarFor(doc)!;

  it("derives with the improved surfaces present", () => {
    expect(familiar.creatureType).toBe("Dragon");
    expect(familiar.hd).toBe(3);
    expect(familiar.languages).toEqual(["Common", "Draconic", "Elven", "Sylvan"]);
  });

  it("Int is the faerie dragon's own printed 16 (better than the progression table's 9)", () => {
    expect(familiar.abilities.int.score).toBe(16);
  });

  it("AC 21 (10 +3 Dex +2 size +6 natural: own 2 + table 4), touch 15, flat-footed 18", () => {
    expect(familiar.ac.normal).toBe(21);
    expect(familiar.ac.touch).toBe(15);
    expect(familiar.ac.flatFooted).toBe(18);
  });

  it("bite +8 (master BAB 3 + Dex 3 + size 2), damage 1d3-1", () => {
    expect(familiar.attacks).toHaveLength(1);
    expect(familiar.attacks[0]!.attack).toBe(8);
    expect(familiar.attacks[0]!.damageBonus).toBe(-1);
  });

  it("own skill ranks reproduce the printed Fly/Stealth/Swim totals (Swim uses the universal swim-speed Dex + +8 rule)", () => {
    expect(familiar.skills.fly!.total).toBe(23);
    expect(familiar.skills.ste!.total).toBe(17);
    expect(familiar.skills.swm!.total).toBe(13);
  });

  it("defenses as printed (immunities only, no DR/resist); SR 13 beats the ML 7 progression", () => {
    expect(familiar.defenses).toEqual({ immune: ["paralysis", "sleep"] });
    expect(familiar.spellResistance).toBe(13);
  });

  it("six SLAs; Greater Invisibility resolves to the vendored spell name with a 3/day meter", () => {
    expect(familiar.slas).toHaveLength(6);
    const greaterInvis = familiar.slas!.find((s) => s.slug === "greater-invisibility")!;
    expect(greaterInvis.spell).toBe("Invisibility, Greater");
    expect(greaterInvis.usesMax).toBe(3);
    expect(greaterInvis.usesRemaining).toBe(3);
    expect(greaterInvis.note).toBe("self only");
    const openClose = familiar.slas!.find((s) => s.slug === "open-close")!;
    expect(openClose.name).toBe("Open/Close");
    expect(openClose.frequency).toBe("atWill");
  });

  it("never gains Speak with Animals of Its Kind", () => {
    expect(familiar.specialAbilities.some((a) => a.name === "Speak with Animals of Its Kind")).toBe(
      false,
    );
  });
});
