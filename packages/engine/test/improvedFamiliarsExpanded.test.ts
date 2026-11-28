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

function makeMasterDoc(level: number, build: Partial<CharacterDoc["build"]> = {}): CharacterDoc {
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
  return deriveFamiliar(doc, master, rollData)!;
}

// Wizard 7 master throughout: BAB 3, base saves Fort 2 / Ref 2 / Will 5,
// familiar natural armor +4 and Int 9 from the progression table.

describe("deriveFamiliar: sootwing bat for a wizard 7 (Monster Codex p.88, hand-computed)", () => {
  const familiar = familiarFor(
    makeMasterDoc(7, { familiar: { speciesId: "sootwing-bat", name: "Ash" } }),
  );

  it("undead Fortitude uses Charisma: master's base 2 + Cha -1 = +1 (Con would give +2)", () => {
    expect(familiar.saves.fort).toBe(1);
  });

  it("Ref +3 (master 2 + Dex 1), Will +6 (master 5 + Wis 1)", () => {
    expect(familiar.saves.ref).toBe(3);
    expect(familiar.saves.will).toBe(6);
  });

  it("AC 18 (10 +1 Dex +2 size +5 natural: own 1 + table 4)", () => {
    expect(familiar.ac.normal).toBe(18);
  });

  it("a mindless-grade Int 2 gives way to the table's 9", () => {
    expect(familiar.abilities.int.score).toBe(9);
  });

  it("printed Perception +5 and Fly +9 reproduce", () => {
    expect(familiar.skills.per!.total).toBe(5);
    expect(familiar.skills.fly!.total).toBe(9);
  });
});

describe("deriveFamiliar: shikigami for a wizard 7 (Bestiary 3 p.163, hand-computed)", () => {
  it("printed Perception +11: 3 ranks + Wis 3 + class 3 + Alertness 2", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, { familiar: { speciesId: "shikigami", name: "Kage" } }),
    );
    expect(familiar.skills.per!.total).toBe(11);
  });

  it("Alertness survives a master with more Perception ranks: 7 + Wis 3 + class 3 + 2 = 15", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, {
        familiar: { speciesId: "shikigami", name: "Kage" },
        skillRanks: { per: 7 },
      }),
    );
    expect(familiar.skills.per!.total).toBe(15);
  });

  it("Will +8: Iron Will folded into its own base 5, tied with the master's 5, + Wis 3", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, { familiar: { speciesId: "shikigami", name: "Kage" } }),
    );
    expect(familiar.saves.will).toBe(8);
  });
});

describe("deriveFamiliar: pipefox for a wizard 7 (Bestiary 4 p.215, hand-computed)", () => {
  it("Climb keeps Str despite its climb speed: 1 rank + Str -5 + 8 + class 3 = printed +7", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, { familiar: { speciesId: "pipefox", name: "Fude" } }),
    );
    expect(familiar.skills.clm!.ability).toBe("str");
    expect(familiar.skills.clm!.total).toBe(7);
  });
});

describe("deriveFamiliar: smokeshade for a wizard 7 (Nidal, Land of Shadows p.63, hand-computed)", () => {
  it("aberration class skills give the master's Escape Artist ranks the +3: 5 + Dex 2 + 3 = 10", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, {
        familiar: { speciesId: "smokeshade", name: "Wisp" },
        skillRanks: { esc: 5 },
      }),
    );
    expect(familiar.skills.esc!.total).toBe(10);
  });

  it("its own SR 13 beats the ML 7 progression (none yet)", () => {
    const familiar = familiarFor(
      makeMasterDoc(7, { familiar: { speciesId: "smokeshade", name: "Wisp" } }),
    );
    expect(familiar.spellResistance).toBe(13);
  });
});

describe("deriveFamiliar: fey-touched hawk for a wizard 7 (Heroes from the Fringe template)", () => {
  const familiar = familiarFor(
    makeMasterDoc(7, { familiar: { speciesId: "hawk", name: "Bramble", template: "fey-touched" } }),
  );

  it("Will +9: master's 5 + Wis 2 + the template's flat +2", () => {
    expect(familiar.saves.will).toBe(9);
  });

  it("1-HD tier: SR 5, no DR", () => {
    expect(familiar.spellResistance).toBe(5);
    expect(familiar.defenses).toBeUndefined();
  });

  it("low-light vision is not listed twice", () => {
    expect(familiar.senses.filter((s) => s === "low-light vision")).toHaveLength(1);
  });
});
