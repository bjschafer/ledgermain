/**
 * Hand-computed fixtures for armor check penalties, armor proficiency and
 * speed: Armor Training's normal speed in medium/heavy armor and its ACP
 * reduction on body armor only, mithral as masterwork and its proficiency
 * category, same-type speed bonuses, and `<ability>Skills` targets.
 *
 * Base character: Human, Str 16 (+3), Dex 14 (+2), 1 rank in Climb (a class
 * skill for fighters and monks, so +3), land speed 30.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, ItemInstance, WornArmor } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function idByName<T extends { name: string }>(coll: Record<string, T>, name: string): string {
  const entry = Object.entries(coll).find(([, v]) => v.name === name);
  if (!entry) throw new Error(`not found: ${name}`);
  return entry[0];
}

function vendoredBuff(name: string, casterLevel: number): ActiveBuff {
  const id = idByName(ref.buffs, name);
  const buff = ref.buffs[id]!;
  return { instanceId: name, buffId: id, name, changes: buff.changes, casterLevel };
}

/** A catalog armor as worn; mithral applies its CRB p. 154 stat changes. */
function worn(name: string, opts: { mithral?: boolean; enhancement?: number } = {}): ItemInstance {
  const armorId = idByName(ref.armors, name);
  const a = ref.armors[armorId]!;
  const m = opts.mithral ?? false;
  const armor: WornArmor = {
    slot: a.slot === "shield" ? "shield" : "armor",
    ac: a.ac ?? 0,
    ...(opts.enhancement ? { enhancement: opts.enhancement } : {}),
    ...(m ? { material: "mithral" } : {}),
    ...(a.maxDex != null ? { maxDex: a.maxDex + (m ? 2 : 0) } : {}),
    acp: -Math.max(0, (a.acp ?? 0) - (m ? 3 : 0)),
    ...(a.weightClass ? { type: m ? Math.max(1, a.weightClass - 1) : a.weightClass } : {}),
    ...(a.slot === "shield" ? { shieldTier: "heavy" as const } : {}),
  };
  return { equipped: true, name, armorId, armor };
}

function makeDoc(opts: {
  classes: { tag: string; level: number }[];
  gear?: ItemInstance[];
  buffs?: ActiveBuff[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "armor-and-speed-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: idByName(ref.races, "Human"), classes: opts.classes },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: { clm: 1 },
      classFeatureChoices: [],
      spells: { known: [] },
      gear: opts.gear ?? [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.buffs ?? [],
      resources: {},
    },
  };
}

describe("Armor Training: normal speed in armor (CRB p. 55)", () => {
  it("fighter 3 in a breastplate (medium) keeps 30 ft", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 3 }], gear: [worn("Breastplate")] });
    expect(compute(doc, ref).speeds.land).toBe(30);
  });

  it("fighter 3 in full plate (heavy) slows to 20 ft", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 3 }], gear: [worn("Full Plate")] });
    expect(compute(doc, ref).speeds.land).toBe(20);
  });

  it("fighter 7 in full plate keeps 30 ft", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 7 }], gear: [worn("Full Plate")] });
    expect(compute(doc, ref).speeds.land).toBe(30);
  });

  it("fighter 2, before Armor Training, slows to 20 ft in a breastplate", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 2 }], gear: [worn("Breastplate")] });
    expect(compute(doc, ref).speeds.land).toBe(20);
  });
});

describe("Armor Training lessens the armor's penalty, not the shield's (CRB p. 55)", () => {
  it("fighter 3, breastplate (4 - 1 = 3) + heavy steel shield (2): Climb ACP -5", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 3 }],
      gear: [worn("Breastplate"), worn("Heavy Steel Shield")],
    });
    expect(compute(doc, ref).skills.clm!.acp).toBe(-5);
  });

  it("fighter 7, mithral chain shirt (2 - 3 = 0) + heavy steel shield: the unused 2 doesn't reach the shield", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 7 }],
      gear: [worn("Chain Shirt", { mithral: true }), worn("Heavy Steel Shield")],
    });
    expect(compute(doc, ref).skills.clm!.acp).toBe(-2);
  });
});

describe("mithral armor (CRB p. 154)", () => {
  it("is masterwork: mithral breastplate, 4 - 3 - 1 = 0 ACP", () => {
    const doc = makeDoc({
      classes: [{ tag: "cleric", level: 1 }],
      gear: [worn("Breastplate", { mithral: true })],
    });
    expect(compute(doc, ref).skills.clm!.acp).toBe(0);
  });

  it("keeps its category for proficiency: cleric 1 in mithral full plate adds 6 - 3 - 1 = 2 to attacks", () => {
    const plain = compute(makeDoc({ classes: [{ tag: "cleric", level: 1 }] }), ref);
    const armored = compute(
      makeDoc({
        classes: [{ tag: "cleric", level: 1 }],
        gear: [worn("Full Plate", { mithral: true })],
      }),
      ref,
    );
    expect(armored.attack.melee.total).toBe(plain.attack.melee.total - 2);
  });
});

describe("speed bonuses stack by type (CRB p. 208)", () => {
  it("monk 6 hasted: fast movement +20 and haste +30 are both enhancement, so 30 + 30 = 60", () => {
    const base = compute(makeDoc({ classes: [{ tag: "monk", level: 6 }] }), ref);
    expect(base.speeds.land).toBe(50);
    const hasted = compute(
      makeDoc({ classes: [{ tag: "monk", level: 6 }], buffs: [vendoredBuff("Haste", 6)] }),
      ref,
    );
    expect(hasted.speeds.land).toBe(60);
  });
});

describe("Str-based skill bonuses (Divine Power, CRB p. 273)", () => {
  it("caster level 12: +4 luck on Climb, 1 + 3 + 3 + 4 = 11", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 1 }],
      buffs: [vendoredBuff("Divine Power", 12)],
    });
    expect(compute(doc, ref).skills.clm!.total).toBe(11);
  });
});
