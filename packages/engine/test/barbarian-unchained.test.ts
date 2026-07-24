import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for Barbarian (Unchained) (`barbarianUnchained`), the
 * Pathfinder Unchained rewrite. Same BAB/save tiers/HD and same clean-room
 * Damage Reduction progression as the chained barbarian (verified below via
 * `barbarianDamageReduction`, extended to key off this class tag too — see
 * `archetypes.ts`/`defenses.ts`). Rage itself is a GENUINELY DIFFERENT buff
 * from chained Rage — confirmed by the vendored data: barbarianUnchained's
 * "Rage (UC)" class feature (`grantsBuffs`) points at a distinct buff, "Rage
 * (Unchained)" (not the chained "Rage" buff), whose own `changes[]` already
 * carry the correct Unchained numbers (+2 melee attack/damage/thrown damage/
 * Will, -2 AC, scaling by `@classes.barbarianUnchained.level` — NOT the
 * chained buff's Str/Con morale bonuses) — this rides the fully generic
 * resource-pool + buff-changes pipeline with zero hand-authoring needed.
 *
 * Scoped strictly by classTag (`barbarianUnchained`), not by name alone —
 * "Rage" (chained) and "Rage (Unchained)" (this class) are two different
 * `RefData.buffs` entries with different names, so a by-name lookup can't
 * collide, but every class-def lookup below still goes through
 * `doc.identity.classes`'s `tag` field to stay unambiguous.
 */
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

function makeDoc(over: {
  level: number;
  abilities?: CharacterDoc["abilities"];
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "barbarianUnchained", level: over.level }],
    },
    abilities: over.abilities ?? { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: over.archetypes,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

describe("Barbarian (Unchained) L13 (BAB high, Fort high/Ref+Will low, d12)", () => {
  const doc = makeDoc({ level: 13 });
  const sheet = compute(doc, ref);

  it("BAB +13", () => {
    expect(sheet.bab).toBe(13);
  });

  it("saves: Fort +10 (good), Ref +5 (poor), Will +4 (poor)", () => {
    // good = 2 + floor(13/2) = 8, +2 Con = 10.
    // poor = floor(13/3) = 4, Ref +1 Dex = 5, Will +0 Wis = 4.
    expect(sheet.saves.fort.total).toBe(10);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 122 (d12: L1 max 12, L2-13 12x(floor(12/2)+1=7)=84, +Con 2/level=26)", () => {
    expect(sheet.hp.max).toBe(122);
  });

  it("level-appropriate features present (L1-L13), Tireless Rage (L17) absent", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Fast Movement");
    expect(names).toContain("Rage (UC)");
    expect(names).toContain("Rage Powers (UC)");
    expect(names).toContain("Uncanny Dodge");
    expect(names).toContain("Danger Sense");
    expect(names).toContain("Improved Uncanny Dodge");
    expect(names).toContain("Damage Reduction");
    expect(names).toContain("Greater Rage (UC)"); // granted at L11
    expect(names).not.toContain("Tireless Rage (UC)");
  });

  it("Damage Reduction shows the same hand-authored progression as chained barbarian: DR 3/— at L13", () => {
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature).toBeDefined();
    expect(feature!.detail).toBe("3/—");

    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 3,
        qualifier: "—",
        components: [
          {
            source: "Damage Reduction",
            sourceId: "barbarian-dr",
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("Rage (UC) resource pool: 4 + Con mod (2) + (level-1)*2 = 4+2+24 = 30/day, linked to the Rage (Unchained) buff (not chained Rage)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const rage = pools.find((p) => p.name === "Rage (UC)");
    expect(rage).toBeDefined();
    expect(rage!.max).toBe(30);
    expect(rage!.per).toBe("day");
    expect(rage!.linkedBuffIds).toEqual([buffId("Rage (Unchained)")]);
  });

  it("toggling the Rage (Unchained) buff applies +2/+3-scaled melee attack/damage/Will and -2 AC — NOT a Str/Con score change (the chained-rage mechanic)", () => {
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const ragingDoc = makeDoc({
      level: 13,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    const baseline = compute(makeDoc({ level: 13 }), ref);
    const raging = compute(ragingDoc, ref);

    // +2 + floor((13-2)/9) = +2 + 1 = +3, on melee attack, melee weapon damage,
    // thrown weapon damage, and Will saves; -2 AC. Ability scores (Str/Con)
    // are untouched (the chained-rage-only mechanic).
    expect(raging.abilities.str.total).toBe(baseline.abilities.str.total);
    expect(raging.abilities.con.total).toBe(baseline.abilities.con.total);
    expect(raging.saves.will.total).toBe(baseline.saves.will.total + 3);
    expect(raging.ac.normal).toBe(baseline.ac.normal - 2);
  });

  it("Rage (Unchained) also grants temp HP: 3/HD at L13 (greater rage tier, not the flat 2/HD base)", () => {
    // Patched in at the engine layer (buff-effects.ts's BUFF_CHANGE_PATCHES,
    // not a data-pipeline supplement — the vendored buff's own `changes[]`
    // still carries no tempHp entry). Same tier formula as the melee
    // attack/damage/Will bonuses above: 2 + floor((13-2)/9) = 3 per Hit Die.
    // Total character HD at a single-classed L13 barbarian is 13, so 3*13=39.
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const ragingDoc = makeDoc({
      level: 13,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    const raging = compute(ragingDoc, ref);
    expect(raging.hp.grantedTemp.total).toBe(39);
    expect(raging.hp.grantedTemp.components).toEqual([
      {
        source: "Rage (Unchained)",
        sourceId: "rage-1",
        type: "untyped",
        value: 39,
        applied: true,
      },
    ]);
  });
});

describe("Barbarian (Unchained) temp HP tiers below and above the L13 greater-rage case", () => {
  function raging(level: number) {
    const rageBuff = ref.buffs[buffId("Rage (Unchained)")]!;
    const doc = makeDoc({
      level,
      activeBuffs: [
        {
          instanceId: "rage-1",
          buffId: rageBuff.id,
          name: rageBuff.name,
          changes: rageBuff.changes,
        },
      ],
    });
    return compute(doc, ref);
  }

  it("L6 (below greater rage): base 2/HD = 12 temp HP", () => {
    expect(raging(6).hp.grantedTemp.total).toBe(12);
  });

  it("L20 (mighty rage): 4/HD = 80 temp HP", () => {
    expect(raging(20).hp.grantedTemp.total).toBe(80);
  });
});

describe("Barbarian (Unchained) L6 has no Damage Reduction yet (gated at L7, same as chained)", () => {
  it("no defenses line at all", () => {
    const doc = makeDoc({ level: 6 });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });
});

describe("Barbarian (Unchained) Invulnerable Rager archetype replaces base Damage Reduction (issue: AMBIGUOUS_DR_REPLACEMENTS extended to barbarianUnchained's own archetype id)", () => {
  it("L7 with Invulnerable Rager active — no hardcoded barbarian-dr contribution", () => {
    const doc = makeDoc({ level: 7, archetypes: ["barbarianUnchained:invulnerable-rager"] });
    const sheet = compute(doc, ref);
    // Base DR would otherwise be 1/— at L7 — suppressed once the archetype
    // (gated at its own level-2 Invulnerability feature) is active.
    const dr = sheet.defenses?.dr ?? [];
    expect(dr.find((d) => d.components.some((c) => c.sourceId === "barbarian-dr"))).toBeUndefined();
  });
});
