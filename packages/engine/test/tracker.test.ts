import { describe, expect, it } from "bun:test";

import type { ActiveBuff, Buff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { advanceRounds } from "../src/duration.js";
import { deriveResourcePools } from "../src/resources.js";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffByName(name: string): Buff {
  const found = Object.values(ref.buffs).find((b) => b.name === name);
  if (!found) throw new Error(`buff not found: ${name}`);
  return found;
}

function activeFrom(name: string, remainingRounds?: number): ActiveBuff {
  const b = buffByName(name);
  return {
    instanceId: `inst-${b.id}`,
    buffId: b.id,
    name: b.name,
    changes: b.changes,
    casterLevel: 10,
    remainingRounds,
  };
}

function makeDoc(over?: Partial<CharacterDoc["live"]>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 5 }] },
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    build: {
      feats: [],
      skillRanks: { acr: 5 },
      classFeatureChoices: [],
      spells: { known: [], prepared: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      ...over,
    },
  };
}

describe("buffs + conditions feed compute() with exact deltas", () => {
  const base = compute(makeDoc(), ref);

  it("Haste + Bless + prone produce the right AC/attack/save deltas", () => {
    const doc = makeDoc({
      activeBuffs: [activeFrom("Haste"), activeFrom("Bless")],
      conditions: ["prone"],
    });
    const sheet = compute(doc, ref);

    // AC: +1 haste (dodge-ish "haste" type) - 4 prone = -3
    expect(sheet.ac.normal - base.ac.normal).toBe(-3);

    // Melee attack: +1 haste +1 morale(bless) -4 prone(mattack) = -2
    expect(sheet.attack.melee.total - base.attack.melee.total).toBe(-2);

    // Ranged attack: +1 haste +1 morale(bless), prone's mattack is melee-only = +2
    expect(sheet.attack.ranged.total - base.attack.ranged.total).toBe(2);

    // Reflex: +1 haste; Fort/Will unchanged
    expect(sheet.saves.ref.total - base.saves.ref.total).toBe(1);
    expect(sheet.saves.fort.total - base.saves.fort.total).toBe(0);
    expect(sheet.saves.will.total - base.saves.will.total).toBe(0);
  });

  it("a same-type buff bonus does NOT stack, but a same-type penalty does", () => {
    // Two morale bonuses to attack: only the highest applies. A morale penalty
    // (shaken) always applies (penalties stack regardless of type).
    const morale2: ActiveBuff = {
      instanceId: "heroism-like",
      name: "Heroism (custom)",
      changes: [{ formula: "2", target: "attack", type: "morale" }],
    };
    const doc = makeDoc({
      activeBuffs: [activeFrom("Bless"), morale2], // +1 and +2 morale
      conditions: ["shaken"], // -2 morale attack/saves/skills
    });
    const sheet = compute(doc, ref);

    // Attack: max(+1, +2) morale = +2, then -2 morale (shaken) = 0 net.
    expect(sheet.attack.melee.total - base.attack.melee.total).toBe(0);

    // Provenance: the +1 Bless morale bonus is overridden (struck) by the +2.
    const bless = sheet.attack.melee.components.find((c) => c.source === "Bless");
    expect(bless?.applied).toBe(false);
    const heroism = sheet.attack.melee.components.find((c) => c.source === "Heroism (custom)");
    expect(heroism?.applied).toBe(true);
    // The shaken penalty always applies.
    const shaken = sheet.attack.melee.components.find((c) => c.source === "Shaken");
    expect(shaken?.applied).toBe(true);

    // Saves: -2 morale (shaken) on all; skills also -2.
    expect(sheet.saves.will.total - base.saves.will.total).toBe(-2);
    expect(sheet.skills.acr!.total - base.skills.acr!.total).toBe(-2);
  });

  it("conditions with ability penalties cascade (fatigued lowers Str/Dex)", () => {
    const doc = makeDoc({ conditions: ["fatigued"] });
    const sheet = compute(doc, ref);
    expect(sheet.abilities.str.total).toBe(base.abilities.str.total - 2);
    expect(sheet.abilities.dex.total).toBe(base.abilities.dex.total - 2);
    // Str -2 -> mod drops by 1 -> melee attack -1; Dex -2 -> AC/ranged drop.
    expect(sheet.attack.melee.total - base.attack.melee.total).toBe(-1);
  });
});

describe("duration: advancing rounds expires timed buffs", () => {
  it("decrements timers and drops expired buffs (pure)", () => {
    const buffs: ActiveBuff[] = [
      { instanceId: "a", name: "Two-round", changes: [], remainingRounds: 2 },
      { instanceId: "b", name: "Indefinite", changes: [] },
    ];
    const r1 = advanceRounds(buffs, 1);
    expect(r1.expired).toHaveLength(0);
    expect(r1.buffs.find((b) => b.instanceId === "a")?.remainingRounds).toBe(1);

    const r2 = advanceRounds(r1.buffs, 1);
    expect(r2.expired.map((b) => b.instanceId)).toEqual(["a"]);
    expect(r2.buffs.map((b) => b.instanceId)).toEqual(["b"]); // indefinite survives
  });

  it("a stat reverts once its buff expires", () => {
    const base = compute(makeDoc(), ref);
    const doc = makeDoc({ activeBuffs: [activeFrom("Bless", 1)] });
    const buffed = compute(doc, ref);
    expect(buffed.attack.melee.total).toBe(base.attack.melee.total + 1);

    const { buffs } = advanceRounds(doc.live.activeBuffs, 1);
    const after = compute({ ...doc, live: { ...doc.live, activeBuffs: buffs } }, ref);
    expect(after.attack.melee.total).toBe(base.attack.melee.total);
  });
});

describe("resource pools derived from class features", () => {
  it("derives Rage rounds/day from the barbarian's maxFormula", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Grog", race: raceId("Human"), classes: [{ tag: "barbarian", level: 5 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = pools.find((p) => p.name === "Rage");
    // 4 + Con mod(2) + 2*(5-1) = 14 rounds/day
    expect(rage?.max).toBe(14);
    expect(rage?.per).toBe("day");
  });
});
