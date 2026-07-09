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

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
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
      spells: { known: [] },
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

  it("panicked (issue #10): -2 saves/skills, no attack penalty (a panicked creature can't attack)", () => {
    const doc = makeDoc({ conditions: ["panicked"] });
    const sheet = compute(doc, ref);
    expect(sheet.saves.will.total - base.saves.will.total).toBe(-2);
    expect(sheet.skills.acr!.total - base.skills.acr!.total).toBe(-2);
    expect(sheet.attack.melee.total - base.attack.melee.total).toBe(0);
  });

  it("pinned (issue #10): flat -4 AC on top of grappled's own penalties (the two don't stack in the ladder)", () => {
    const doc = makeDoc({ conditions: ["pinned"] });
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal - base.ac.normal).toBe(-4);
    // Pinned's own table entry doesn't duplicate grappled's -4 Dex/-2 attack —
    // ladder auto-upgrade (apps/web/src/model/conditions.ts) is what keeps
    // "grappled" from also being active once "pinned" is toggled on.
    expect(sheet.attack.melee.total - base.attack.melee.total).toBe(0);
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
    // Rage carries no prose-only scaling → no detail line.
    expect(rage?.detail).toBeUndefined();
  });

  it("derives Channel Energy uses/day + an action-derived 'Xd6 (DC Y Will)' detail for a cleric", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      // Cha 14 (+2) → 3 + 2 = 5 uses/day. L5 → 3d6, DC = 10 + 2 + 2 = 14.
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
      identity: { name: "Hex", race: raceId("Human"), classes: [{ tag: "cleric", level: 5 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const channel = pools.find((p) => p.name === "Channel Energy");
    expect(channel).toBeDefined();
    expect(channel?.max).toBe(5);
    expect(channel?.per).toBe("day");
    // Derived from the feature's vendored `actions[]` now (issue: bare
    // resource-pool detail) rather than the old cleric-gated hand-authored
    // `channelEnergyDetail` — see `resources.ts`'s `actionBasedDetail`.
    expect(channel?.detail).toBe("3d6 (DC 14 Will)");
  });

  it("derives Smite Evil uses/day (uses.maxFormula, already vendored) + hand-authored attack/dmg/AC detail", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      // Cha 16 (+3). HD total 5 → floor((5-1)/3)+1 = 2 uses/day.
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 5 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const smite = pools.find((p) => p.name === "Smite Evil");
    expect(smite).toBeDefined();
    expect(smite?.max).toBe(2);
    expect(smite?.per).toBe("day");
    expect(smite?.detail).toBe("+3 atk, +5 dmg, +3 AC vs. evil");
  });

  it("derives Lay on Hands uses/day + an action-derived healing-dice detail, plus a merged Channel Positive Energy addendum", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      // Cha 16 (+3). L5 → floor(5/2) + 3 = 5 uses/day; healing dice floor(5/2) = 2d6.
      abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
      identity: { name: "Aria", race: raceId("Human"), classes: [{ tag: "paladin", level: 5 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const loh = pools.find((p) => p.name === "Lay on Hands");
    expect(loh).toBeDefined();
    expect(loh?.max).toBe(5);
    expect(loh?.per).toBe("day");
    // Lay on Hands' own action-derived heal dice ("heal 2d6"), plus a merged
    // addendum for Channel Positive Energy (level 4+, `uses.source:
    // "layOnHands"` — no cap of its own, so it can't be a separate pool row;
    // see the "linked features" pass in `deriveResourcePools`). This is the
    // paladin-side fix for the old cleric-only Channel Energy detail gate:
    // DC = 10 + floor(5/2) + 3 = 15, dice = ceil(5/2) = 3d6.
    expect(loh?.detail).toBe("heal 2d6 · Channel Positive Energy: 3d6 (DC 15 Will)");
  });

  it("derives Wild Shape uses/day from the druid's maxFormula (already vendored, no hand-authoring needed)", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      // min(floor((6-2)/2), 8) = 2 uses/day at L6.
      identity: { name: "Fern", race: raceId("Human"), classes: [{ tag: "druid", level: 6 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const wildShape = pools.find((p) => p.name === "Wild Shape");
    expect(wildShape).toBeDefined();
    expect(wildShape?.max).toBe(2);
    expect(wildShape?.per).toBe("day");
    // No hand-authored dice/save scaling — the form's stat block isn't modeled.
    expect(wildShape?.detail).toBeUndefined();
  });

  it("Wild Shape is inaccessible (0 uses, filtered out) below 4th level", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Fern", race: raceId("Human"), classes: [{ tag: "druid", level: 3 }] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Wild Shape")).toBeUndefined();
  });
});

describe("feats that raise a derived resource pool's max (feat-effects.ts FEAT_POOL_EFFECTS)", () => {
  it("Extra Reservoir: arcanist 4's Arcane Reservoir (3 + level = 7) gains +3 -> 10", () => {
    const base: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Lyle", race: raceId("Human"), classes: [{ tag: "arcanist", level: 4 }] },
    };
    const withFeat: CharacterDoc = {
      ...base,
      build: { ...base.build, feats: [featId("Extra Reservoir")] },
    };
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    const baseReservoir = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Arcane Reservoir",
    );
    const featReservoir = deriveResourcePools(withFeat, ref, featSheet.abilities).find(
      (p) => p.name === "Arcane Reservoir",
    );
    expect(baseReservoir?.max).toBe(7);
    expect(featReservoir?.max).toBe(10);
  });

  it("issue #43: Arcane Reservoir's daily refill (3 + floor(level/2)) is below cap, and Extra Reservoir's +3 applies to both", () => {
    const base: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Lyle", race: raceId("Human"), classes: [{ tag: "arcanist", level: 4 }] },
    };
    const withFeat: CharacterDoc = {
      ...base,
      build: { ...base.build, feats: [featId("Extra Reservoir")] },
    };
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    const baseReservoir = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Arcane Reservoir",
    );
    const featReservoir = deriveResourcePools(withFeat, ref, featSheet.abilities).find(
      (p) => p.name === "Arcane Reservoir",
    );
    // Cap 7 (3 + 4), refill 3 + floor(4/2) = 5 -- strictly below cap.
    expect(baseReservoir?.max).toBe(7);
    expect(baseReservoir?.restValue).toBe(5);
    // Extra Reservoir: cap 10 (7 + 3), refill 5 + 3 = 8 (feat text applies
    // the +3 to both "three more points ... and the maximum").
    expect(featReservoir?.max).toBe(10);
    expect(featReservoir?.restValue).toBe(8);
  });

  it("issue #43: a non-Arcane-Reservoir pool (Rage) still refills to its cap", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Grog", race: raceId("Human"), classes: [{ tag: "barbarian", level: 5 }] },
    };
    const sheet = compute(doc, ref);
    const rage = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Rage");
    expect(rage?.restValue).toBe(rage?.max);
  });

  it("Extra Rage: barbarian 5's Rage (4 + Con mod + 2*(lvl-1) = 14) gains +6 -> 20", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Grog", race: raceId("Human"), classes: [{ tag: "barbarian", level: 5 }] },
      build: { ...makeDoc().build, feats: [featId("Extra Rage")] },
    };
    const sheet = compute(doc, ref);
    const rage = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Rage");
    expect(rage?.max).toBe(20);
  });

  it("Extra Rage stacks when taken twice: +12 total -> 26", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Grog", race: raceId("Human"), classes: [{ tag: "barbarian", level: 5 }] },
      build: { ...makeDoc().build, feats: [featId("Extra Rage"), featId("Extra Rage")] },
    };
    const sheet = compute(doc, ref);
    const rage = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Rage");
    expect(rage?.max).toBe(26);
  });

  it("issue #58: a 2nd Extra Rage stored in build.extraFeats (the app's real repeatable-feat shape) stacks the same as a 2nd build.feats entry", () => {
    const extraRageId = featId("Extra Rage");
    const doc: CharacterDoc = {
      ...makeDoc(),
      identity: { name: "Grog", race: raceId("Human"), classes: [{ tag: "barbarian", level: 5 }] },
      build: {
        ...makeDoc().build,
        feats: [extraRageId],
        extraFeats: [{ instanceId: "feat-2", featId: extraRageId }],
      },
    };
    const sheet = compute(doc, ref);
    const rage = deriveResourcePools(doc, ref, sheet.abilities).find((p) => p.name === "Rage");
    expect(rage?.max).toBe(26);
  });

  it("a feat's pool bonus doesn't leak onto an unrelated pool of the same character", () => {
    // A cleric with Extra Rage (no rage class feature present) should show no
    // Rage pool at all, and Channel Energy should be unaffected.
    const doc: CharacterDoc = {
      ...makeDoc(),
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
      identity: { name: "Hex", race: raceId("Human"), classes: [{ tag: "cleric", level: 5 }] },
      build: { ...makeDoc().build, feats: [featId("Extra Rage")] },
    };
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Rage")).toBeUndefined();
    expect(pools.find((p) => p.name === "Channel Energy")?.max).toBe(5);
  });

  // Issue #65's multi-target follow-up: `FeatPoolEffect.featureTag` can now
  // be an array, so one feat can raise whichever of several class features
  // the character actually has. Extra Lay On Hands is the first (and, per
  // the vendored data audit, only unambiguous) case — see
  // `feat-effects.ts`'s `extra-lay-on-hands` entry doc comment for the
  // verbatim vendored Touch of Corruption text this is built from.
  it("Extra Lay On Hands (multi-target): boosts a PALADIN's Lay on Hands pool", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 16 },
      identity: { name: "Paladin", race: raceId("Human"), classes: [{ tag: "paladin", level: 6 }] },
      build: { ...makeDoc().build, feats: [featId("Extra Lay On Hands")] },
    };
    const base: CharacterDoc = { ...doc, build: { ...doc.build, feats: [] } };
    const baseSheet = compute(base, ref);
    const featSheet = compute(doc, ref);
    const baseLoh = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Lay on Hands",
    );
    const featLoh = deriveResourcePools(doc, ref, featSheet.abilities).find(
      (p) => p.name === "Lay on Hands",
    );
    // floor(6/2) + Cha mod(3) = 6, +2 from the feat = 8.
    expect(baseLoh?.max).toBe(6);
    expect(featLoh?.max).toBe(8);
    // The same feat must NOT invent a Touch of Corruption pool for a paladin.
    expect(
      deriveResourcePools(doc, ref, featSheet.abilities).find(
        (p) => p.name === "Touch of Corruption",
      ),
    ).toBeUndefined();
  });

  it("Extra Lay On Hands (multi-target): boosts an ANTIPALADIN's Touch of Corruption pool instead, per the vendored RAW cross-reference", () => {
    const doc: CharacterDoc = {
      ...makeDoc(),
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 18 },
      identity: {
        name: "Antipaladin",
        race: raceId("Human"),
        classes: [{ tag: "antipaladin", level: 6 }],
      },
      build: { ...makeDoc().build, feats: [featId("Extra Lay On Hands")] },
    };
    const base: CharacterDoc = { ...doc, build: { ...doc.build, feats: [] } };
    const baseSheet = compute(base, ref);
    const featSheet = compute(doc, ref);
    const baseTouch = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Touch of Corruption",
    );
    const featTouch = deriveResourcePools(doc, ref, featSheet.abilities).find(
      (p) => p.name === "Touch of Corruption",
    );
    // floor(6/2) + Cha mod(4) = 7, +2 from the feat = 9.
    expect(baseTouch?.max).toBe(7);
    expect(featTouch?.max).toBe(9);
    // The same feat must NOT invent a Lay on Hands pool for an antipaladin.
    expect(
      deriveResourcePools(doc, ref, featSheet.abilities).find((p) => p.name === "Lay on Hands"),
    ).toBeUndefined();
  });
});
