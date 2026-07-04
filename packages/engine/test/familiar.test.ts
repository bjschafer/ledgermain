import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { buildRollData, compute, deriveFamiliar, type FamiliarMasterInputs } from "../src/index.js";

/**
 * Hand-computed fixture: the owner's actual familiar, "Mortlach" the cat,
 * bonded to an arcanist 4 master. This worktree's vendored data has no
 * Arcanist class (a parallel agent is adding it elsewhere), so the master
 * side is stood in with a wizard 4 — which, for the numbers this fixture
 * actually exercises, is identical: PF1 Arcanist shares the Wizard's BAB
 * tier (low, "3/4"... actually 1/2/level) and save tiers (poor Fort/Ref,
 * good Will), and `hp.max` is forced via `settings.statOverrides["hp.max"]`
 * to the fixture's stated 25 regardless of either class's HD. This gives
 * BAB +2, base saves Fort 1/Ref 1/Will 4, and max HP 25 — exactly the
 * task's stated arcanist-4 numbers — without depending on arcanist refdata.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeMasterDoc(overrides: Partial<CharacterDoc["build"]> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Master",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level: 4 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 20, wis: 12, cha: 10 },
    build: {
      feats: [],
      skillRanks: { ste: 1, per: 3, sen: 2, spl: 4, acr: 1, lin: 1 },
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      settings: { statOverrides: { "hp.max": 25 } },
      ...overrides,
    },
    live: {
      hp: { current: 25, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("deriveFamiliar (Mortlach the cat, hand-computed fixture)", () => {
  const doc = makeMasterDoc({ familiar: { speciesId: "cat", name: "Mortlach" } });
  const sheet = compute(doc, ref);

  // Sanity check on the wizard-4 stand-in producing the stated arcanist-4 numbers.
  it("master stand-in reproduces the stated arcanist-4 numbers", () => {
    expect(sheet.bab).toBe(2);
    expect(sheet.hp.max).toBe(25);
    expect(sheet.saves.fort.components.find((c) => c.type === "base")?.value).toBe(1);
    expect(sheet.saves.ref.components.find((c) => c.type === "base")?.value).toBe(1);
    expect(sheet.saves.will.components.find((c) => c.type === "base")?.value).toBe(4);
  });

  const master: FamiliarMasterInputs = {
    maxHp: sheet.hp.max,
    bab: sheet.bab,
    baseSaves: { fort: 1, ref: 1, will: 4 },
  };
  const rollData = buildRollData(doc, ref, sheet.abilities, sheet.speeds, sheet.bab);
  const familiar = deriveFamiliar(doc, master, rollData);

  it("derives a familiar", () => {
    expect(familiar).toBeDefined();
  });

  it("HP 12, Init +2, Speed 30 ft", () => {
    expect(familiar!.hp.max).toBe(12);
    expect(familiar!.init).toBe(2);
    expect(familiar!.speeds.land).toBe(30);
  });

  it("AC 16 (10 +2 Dex +2 size +2 natural), touch 14, flat-footed 14", () => {
    expect(familiar!.ac.normal).toBe(16);
    expect(familiar!.ac.touch).toBe(14);
    expect(familiar!.ac.flatFooted).toBe(14);
  });

  it("Saves: Fort +1, Ref +4, Will +5 (better-of the two base saves + familiar's own ability mods)", () => {
    expect(familiar!.saves.fort).toBe(1);
    expect(familiar!.saves.ref).toBe(4);
    expect(familiar!.saves.will).toBe(5);
  });

  it("Attacks: bite +6 (1d3-4), 2 claws +6 (1d2-4)", () => {
    const bite = familiar!.attacks.find((a) => a.name === "Bite");
    const claw = familiar!.attacks.find((a) => a.name === "Claw");
    expect(bite).toMatchObject({ attack: 6, damageDice: "1d3", damageBonus: -4 });
    expect(claw).toMatchObject({ attack: 6, damageDice: "1d2", damageBonus: -4, count: 2 });
  });

  it("CMB +2, CMD 8", () => {
    expect(familiar!.cmb).toBe(2);
    expect(familiar!.cmd).toBe(8);
  });

  it("Skills: Stealth +18, Perception +7, Acrobatics +6, Climb +6, Sense Motive +3, Spellcraft +2, Linguistics -1", () => {
    expect(familiar!.skills.ste!.total).toBe(18);
    expect(familiar!.skills.per!.total).toBe(7);
    expect(familiar!.skills.acr!.total).toBe(6);
    expect(familiar!.skills.clm!.total).toBe(6);
    expect(familiar!.skills.sen!.total).toBe(3);
    expect(familiar!.skills.spl!.total).toBe(2);
    expect(familiar!.skills.lin!.total).toBe(-1);
  });

  it("shared Mage Armor (+4 armor) yields AC 20, touch 14, flat-footed 18", () => {
    const withBuff: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "mage-armor-1",
            name: "Mage Armor",
            changes: [{ target: "aac", type: "untyped", formula: "4" }],
          },
        ],
        familiar: { sharedBuffIds: ["mage-armor-1"] },
      },
    };
    const buffedFamiliar = deriveFamiliar(withBuff, master, rollData);
    expect(buffedFamiliar!.ac.normal).toBe(20);
    expect(buffedFamiliar!.ac.touch).toBe(14);
    expect(buffedFamiliar!.ac.flatFooted).toBe(18);
  });

  it("special abilities at master level 4: Alertness/Improved Evasion/Share Spells/Empathic Link (L1) + Deliver Touch Spells (L3)", () => {
    const names = familiar!.specialAbilities.map((a) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Alertness",
        "Improved Evasion",
        "Share Spells",
        "Empathic Link",
        "Deliver Touch Spells",
      ]),
    );
    expect(names).not.toContain("Speak with Master");
    expect(familiar!.naturalArmor).toBe(2);
    expect(familiar!.abilities.int.score).toBe(7);
    expect(familiar!.spellResistance).toBeUndefined();
  });
});

describe("deriveFamiliar edge cases", () => {
  const doc = makeMasterDoc();
  const sheet = compute(doc, ref);
  const master: FamiliarMasterInputs = {
    maxHp: sheet.hp.max,
    bab: sheet.bab,
    baseSaves: { fort: 1, ref: 1, will: 4 },
  };
  const rollData = buildRollData(doc, ref, sheet.abilities, sheet.speeds, sheet.bab);

  it("returns undefined with no build.familiar", () => {
    expect(deriveFamiliar(doc, master, rollData)).toBeUndefined();
  });

  it("returns undefined for an unknown species id (soft fail, no crash)", () => {
    const withUnknown: CharacterDoc = {
      ...doc,
      build: { ...doc.build, familiar: { speciesId: "dire-tiger", name: "Rex" } },
    };
    expect(deriveFamiliar(withUnknown, master, rollData)).toBeUndefined();
  });
});

describe("tracked familiar (build.familiar): master-side bonuses", () => {
  const baseline = compute(makeMasterDoc(), ref);

  it("cat familiar grants the master +3 Stealth (reusing familiars.ts's table)", () => {
    const doc = makeMasterDoc({ familiar: { speciesId: "cat", name: "Mortlach" } });
    const sheet = compute(doc, ref);
    expect(sheet.skills.ste!.total).toBe(baseline.skills.ste!.total + 3);
  });

  it("familiar in reach (default true) grants +2 Perception / +2 Sense Motive (Alertness)", () => {
    const doc = makeMasterDoc({ familiar: { speciesId: "cat", name: "Mortlach" } });
    const sheet = compute(doc, ref);
    expect(sheet.skills.per!.total).toBe(baseline.skills.per!.total + 2);
    expect(sheet.skills.sen!.total).toBe(baseline.skills.sen!.total + 2);
  });

  it("toggling familiarInReach off removes the Alertness bonus", () => {
    const doc: CharacterDoc = {
      ...makeMasterDoc({ familiar: { speciesId: "cat", name: "Mortlach" } }),
      live: { ...makeMasterDoc().live, familiarInReach: false },
    };
    const sheet = compute(doc, ref);
    expect(sheet.skills.per!.total).toBe(baseline.skills.per!.total);
    expect(sheet.skills.sen!.total).toBe(baseline.skills.sen!.total);
    // Stealth (the species bonus, unrelated to Alertness) is unaffected by the toggle.
    expect(sheet.skills.ste!.total).toBe(baseline.skills.ste!.total + 3);
  });

  it("no familiar at all means no Alertness bonus even though the default is 'in reach'", () => {
    expect(compute(makeMasterDoc(), ref)).toEqual(baseline);
  });

  it("owner's full acceptance numbers: Stealth +7, Perception +6, Sense Motive +5 contribution stack", () => {
    // "from your contributions' perspective" per the coordinator's scope-add:
    // 1 rank + 3 Dex + 3 familiar (Stealth); 3 ranks + 1 Wis + 2 Alertness (Perception);
    // 2 ranks + 1 Wis + 2 Alertness (Sense Motive). This doc's master has Dex 10 (mod
    // +0), not the owner's real Dex 16 — that's a different agent's racial-trait work
    // (Whispering Wind +4) layering on top, out of scope here — so we assert the
    // Stealth/Perception/Sense Motive DELTA our own contributions add over a no-familiar
    // baseline, matching the coordinator's numbers modulo the Dex/racial pieces owned
    // by other agents.
    const doc = makeMasterDoc({ familiar: { speciesId: "cat", name: "Mortlach" } });
    const sheet = compute(doc, ref);
    // Stealth: 1 rank + 0 Dex (this doc) + 3 familiar = baseline + 3.
    expect(sheet.skills.ste!.total).toBe(1 + 0 + 3);
    // Perception: 3 ranks + 1 Wis + 2 Alertness.
    expect(sheet.skills.per!.total).toBe(3 + 1 + 2);
    // Sense Motive: 2 ranks + 1 Wis + 2 Alertness.
    expect(sheet.skills.sen!.total).toBe(2 + 1 + 2);
  });
});
