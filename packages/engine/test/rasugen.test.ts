/**
 * Hand-computed fixture tests for the alchemist mnemostiller archetype's
 * Rasugen (`rasugen.ts`) — same posture as `alchemistDiscoveries.test.ts`'s
 * Cognatogen fixtures, since Rasugen is the same "hand-authored buff wired
 * into the Mutagen pool" shape.
 *
 * RAW (Pathfinder Campaign Setting: Distant Realms p.52, verified via aonprd.com, "Mnemostiller"):
 * "Once imbibed, a rasugen grants a +2 alchemical bonus on all saving throws
 * and 2 temporary hit points per alchemist level for 10 minutes per
 * alchemist level. In addition, while the rasugen is in effect, a
 * mnemostiller takes a -2 penalty to his Intelligence score and can't
 * attempt checks using Appraise, Craft, Disable Device, Heal, Knowledge
 * (any), Profession, Sleight of Hand, or Spellcraft. This acts in all other
 * ways like a mutagen. This replaces mutagen. A mnemostiller can never gain
 * the mutagen, cognatogen, or inspiring cognatogen ability, even from a
 * discovery or another class."
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  COGNATOGEN_BUFF_IDS,
  compute,
  deriveResourcePools,
  RASUGEN_BUFF,
  RASUGEN_BUFF_ID,
} from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

function makeAlchemist(level: number, archetypes?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "alchemist", level }],
    },
    abilities: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(archetypes ? { archetypes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Mutagen pool: mnemostiller replaces the vendored buffs with Rasugen", () => {
  const mutagenPool = (doc: CharacterDoc) =>
    deriveResourcePools(doc, ref).find((p) => p.name === "Mutagen");

  it("a plain alchemist still sees the 3 vendored Mutagen buffs, not Rasugen", () => {
    const pool = mutagenPool(makeAlchemist(5));
    expect(pool).toBeDefined();
    expect(pool!.linkedBuffIds.sort()).toEqual(
      [buffId("Mutagen, Str"), buffId("Mutagen, Dex"), buffId("Mutagen, Con")].sort(),
    );
    expect(pool!.linkedBuffIds).not.toContain(RASUGEN_BUFF_ID);
  });

  it("a mnemostiller sees only Rasugen on the pool — no vendored Mutagen buffs, no Cognatogen", () => {
    const pool = mutagenPool(makeAlchemist(5, ["alchemist:mnemostiller"]));
    expect(pool).toBeDefined();
    expect(pool!.linkedBuffIds).toEqual([RASUGEN_BUFF_ID]);
    for (const id of Object.values(COGNATOGEN_BUFF_IDS)) {
      expect(pool!.linkedBuffIds).not.toContain(id);
    }
    expect(pool!.linkedBuffIds).not.toContain(buffId("Mutagen, Str"));
    expect(pool!.linkedBuffIds).not.toContain(buffId("Mutagen, Dex"));
    expect(pool!.linkedBuffIds).not.toContain(buffId("Mutagen, Con"));
  });

  it("RASUGEN_BUFF_ID is namespaced so it can never collide with a real refData.buffs key", () => {
    expect(ref.buffs[RASUGEN_BUFF_ID]).toBeUndefined();
  });
});

describe("RASUGEN_BUFF shape (rasugen.ts)", () => {
  it("grants +2 alchemical on all saves, temp HP scaling with alchemist level, and -2 alchemical Int", () => {
    expect(RASUGEN_BUFF.changes).toEqual([
      { formula: "2", target: "allSavingThrows", type: "alchemical" },
      { formula: "2 * @classes.alchemist.level", target: "tempHp", type: "alchemical" },
      { formula: "-2", target: "int", type: "alchemical" },
    ]);
  });

  it("carries a contextNote reminder for the skill-check prohibition and the 14th-level duration extension", () => {
    const text = RASUGEN_BUFF.contextNotes[0]?.text ?? "";
    expect(text).toMatch(/Appraise/);
    expect(text).toMatch(/Spellcraft/);
    expect(text).toMatch(/14th level/);
    expect(text).not.toMatch(/[–—]/); // no en/em dashes in player-facing copy
  });
});

describe("Rasugen applies as a real toggle once activated", () => {
  it("a 10th-level mnemostiller gains +2 to all three saves, 20 temp HP, and -2 Int", () => {
    const doc = makeAlchemist(10, ["alchemist:mnemostiller"]);
    const before = compute(doc, ref);

    // The tracker's linked-buff toggle copies a `Buff`'s changes into the
    // `ActiveBuff` instance (see `apps/web/src/model/buffs.ts`), which is
    // what makes a non-`refData.buffs` buff computable at all — mirrors
    // `alchemistDiscoveries.test.ts`'s Cognatogen activation fixture.
    const active: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "buff-rasugen",
            buffId: RASUGEN_BUFF_ID,
            name: RASUGEN_BUFF.name,
            changes: RASUGEN_BUFF.changes.map((c) => ({ ...c })),
          },
        ],
      },
    };
    const sheet = compute(active, ref);

    expect(sheet.saves.fort.total).toBe(before.saves.fort.total + 2);
    expect(sheet.saves.ref.total).toBe(before.saves.ref.total + 2);
    expect(sheet.saves.will.total).toBe(before.saves.will.total + 2);
    expect(sheet.hp.grantedTemp.total).toBe(20); // 2 * alchemist level 10
    expect(sheet.abilities.int.total).toBe(before.abilities.int.total - 2);
  });

  it("temp HP scales with alchemist level (1st level: 2 temp HP)", () => {
    const doc = makeAlchemist(1, ["alchemist:mnemostiller"]);
    const active: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "buff-rasugen",
            buffId: RASUGEN_BUFF_ID,
            name: RASUGEN_BUFF.name,
            changes: RASUGEN_BUFF.changes.map((c) => ({ ...c })),
          },
        ],
      },
    };
    const sheet = compute(active, ref);
    expect(sheet.hp.grantedTemp.total).toBe(2);
  });
});
