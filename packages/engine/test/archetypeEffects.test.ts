import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { archetypeHasModeledEffects, compute } from "../src/index.js";

/**
 * Issue #7 (archetype numeric effects): hand-computed against the real
 * vendored data slice via `loadRefData()`, same posture as
 * `traits.test.ts`/`sorcererBloodline.test.ts` for other hand-authored
 * clean-room content. Each expectation is derived straight from the
 * published PF1 rules cited in `archetype-effects.ts`'s comments, not from
 * any Foundry oracle (the vendored archetype dataset carries no mechanics at
 * all to compare against).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  gear?: CharacterDoc["build"]["gear"];
  abilities?: CharacterDoc["abilities"];
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
      classes: over.classes,
    },
    abilities: over.abilities ?? ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("issue #7 bug fix: a swapped-out base feature's changes stop applying", () => {
  // Two-Handed Fighter's own replacement (Overhand Chop, L3) is a per-attack
  // situational rule (double Str on a single two-handed attack), not an
  // always-on Change — unlike Weapon Master below, nothing replaces Armor
  // Training's mDexA once it's swapped out, so this is the clearest possible
  // regression check: prior to the fix, `collect.ts`'s `classDef.features`
  // walk had no idea `doc.build.archetypes` existed, so Armor Training's
  // max-Dex-cap increase kept applying (and inflating AC) regardless.
  const lightArmorMaxDex2: CharacterDoc["build"]["gear"] = [
    {
      equipped: true,
      name: "Test Light Armor",
      armor: { slot: "armor", ac: 2, maxDex: 2, type: 1 },
    },
  ];
  const highDex = { ...ABILITIES, dex: 18 };

  it("Armor Training's max-Dex-cap bonus applies normally with no archetype", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 3 }],
      gear: lightArmorMaxDex2,
      abilities: highDex,
    });
    const sheet = compute(doc, ref);
    // maxDex 2 + Armor Training's clamp(floor((3+1)/4),0,4)=1 -> effective cap 3,
    // capped by Dex mod +4 -> Dex component is 3.
    const dexComp = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComp?.value).toBe(3);
  });

  it("Two-Handed Fighter drops that bonus (Dex cap reverts to the armor's own maxDex)", () => {
    const thf = archetypeId("Two-Handed Fighter");
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 3 }],
      archetypes: [thf],
      gear: lightArmorMaxDex2,
      abilities: highDex,
    });
    const sheet = compute(doc, ref);

    const feature = sheet.classFeatures.find((f) => f.name === "Armor Training" && f.level === 3);
    expect(feature?.applied).toBe(false);
    expect(feature?.replacedBy).toBe("Overhand Chop");

    // No mDexA bonus anymore -> capped at the armor's raw maxDex (2), not 3.
    const dexComp = sheet.ac.components.find((c) => c.category === "dex");
    expect(dexComp?.value).toBe(2);
  });

  it("barbarian Damage Reduction is suppressed once Wildborn (paired 1:1 swap) takes over", () => {
    const wildborn = archetypeId("Wildborn");
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "barbarian", level: 10 }], archetypes: [wildborn] }),
      ref,
    );
    const drEntry = withArchetype.defenses?.dr.find((d) => d.qualifier === "—");
    expect(drEntry).toBeDefined();
    // Only ONE applied "—" DR component — the archetype's own, not both.
    const applied = drEntry!.components.filter((c) => c.applied);
    expect(applied).toHaveLength(1);
    expect(applied[0]!.source).toBe("Damage reduction");
  });
});

describe("Weapon Master (fighter): Weapon Training reflavors Armor Training", () => {
  const weaponMaster = archetypeId("Weapon Master");

  it("grants the same mDexA/acpA progression as base Armor Training at L3", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 3 }], archetypes: [weaponMaster] }),
      ref,
    );
    const feature = sheet.classFeatures.find((f) => f.name === "Armor Training" && f.level === 3);
    expect(feature?.applied).toBe(false); // swapped out
    // The archetype's own feature carries the detail summary.
    const archEntry = sheet.activeArchetypes.find((a) => a.id === weaponMaster);
    const weaponTraining = archEntry?.features.find((f) => f.name === "Weapon Training");
    expect(weaponTraining?.detail).toBe("+1 max Dex / -ACP (armor)");
  });

  it("nothing applies before L3 (feature level gate)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 2 }], archetypes: [weaponMaster] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === weaponMaster);
    expect(archEntry?.features.some((f) => f.name === "Weapon Training")).toBe(false);
  });
});

describe("Invulnerable Rager (barbarian): Invulnerability grants DR = half barbarian level", () => {
  const invulnerableRager = archetypeId("Invulnerable Rager");

  it("DR floor(level/2) at L10 (below where base barbarian DR would even start)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "barbarian", level: 10 }], archetypes: [invulnerableRager] }),
      ref,
    );
    const drEntry = sheet.defenses?.dr.find((d) => d.qualifier === "—");
    expect(drEntry?.total).toBe(5); // floor(10/2)
  });

  it("already active at L4 (base barbarian DR doesn't exist until L7)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "barbarian", level: 4 }], archetypes: [invulnerableRager] }),
      ref,
    );
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")?.total).toBe(2); // floor(4/2)
  });
});

describe("Savage Barbarian (barbarian): Natural Toughness (no armor only)", () => {
  const savageBarbarian = archetypeId("Savage Barbarian");

  it("grants scaling natural armor while wearing no armor", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "barbarian", level: 10 }], archetypes: [savageBarbarian] }),
      ref,
    );
    // 1 + floor((10-7)/3) = 2
    const natural = sheet.ac.components.find(
      (c) => c.category === "natural" && c.source === "Natural Toughness (+1)",
    );
    expect(natural?.value).toBe(2);
    expect(natural?.applied).toBe(true);
  });

  it("grants nothing while wearing armor", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "barbarian", level: 10 }],
        archetypes: [savageBarbarian],
        gear: [
          {
            equipped: true,
            name: "Chain Shirt",
            armor: { slot: "armor", ac: 4, type: 1 },
          },
        ],
      }),
      ref,
    );
    const natural = sheet.ac.components.find((c) => c.source === "Natural Toughness (+1)");
    expect(natural?.value ?? 0).toBe(0);
  });

  it("barbarian Damage Reduction is suppressed once Natural Toughness takes over", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "barbarian", level: 13 }], archetypes: [savageBarbarian] }),
      ref,
    );
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "—")).toBeUndefined();
  });
});

describe("Cloistered Cleric (cleric): Breadth of Knowledge", () => {
  const cloisteredCleric = archetypeId("Cloistered Cleric");

  it("+max(1, floor(level/2)) untrained on every Knowledge skill", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "cleric", level: 8 }], archetypes: [cloisteredCleric] }),
      ref,
    );
    const arcana = sheet.skills["kar"]; // Knowledge (arcana)
    expect(arcana).toBeDefined();
    const comp = arcana!.components.find((c) => c.source === "Breadth of Knowledge");
    expect(comp?.value).toBe(4); // floor(8/2)
  });

  it("minimum +1 even at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "cleric", level: 1 }], archetypes: [cloisteredCleric] }),
      ref,
    );
    const comp = sheet.skills["kre"]?.components.find((c) => c.source === "Breadth of Knowledge");
    expect(comp?.value).toBe(1);
  });
});

describe("Archer (fighter): Hawkeye replaces Bravery with a scaling Perception bonus", () => {
  const archer = archetypeId("Archer");

  it("+1 Perception at L2, +1 every 4 levels beyond", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 10 }], archetypes: [archer] }),
      ref,
    );
    // 1 + floor((10-2)/4) = 3
    const per = sheet.skills["per"];
    const comp = per?.components.find((c) => c.source === "Hawkeye");
    expect(comp?.value).toBe(3);
  });

  it("Bravery is struck through (swapped out) once Hawkeye takes over", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 2 }], archetypes: [archer] }),
      ref,
    );
    const bravery = sheet.classFeatures.find((f) => f.name === "Bravery" && f.level === 2);
    expect(bravery?.applied).toBe(false);
    expect(bravery?.replacedBy).toBe("Hawkeye");
  });
});

describe("Crusader (cleric): restricted-list bonus feats, 1st/5th/+5 thereafter", () => {
  const crusader = archetypeId("Crusader");

  it("grants floor(level/5)+1 bonus feats (e.g. 3 at L11)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "cleric", level: 11 }], archetypes: [crusader] }),
      ref,
    );
    const archEntry = sheet.activeArchetypes.find((a) => a.id === crusader);
    const bonusFeat = archEntry?.features.find((f) => f.name === "Bonus Feat");
    expect(bonusFeat?.detail).toBe("3 bonus feat(s) (restricted list)");
  });
});

describe("Sorcerer of Sleep (sorcerer): Pesh Expert grants +1/2 level (min 1) on 4 skills", () => {
  const sorcererOfSleep = archetypeId("Sorcerer of Sleep");

  it("+4 at L8 on Appraise, Craft (alchemy), Heal, Knowledge (local)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 8 }], archetypes: [sorcererOfSleep] }),
      ref,
    );
    for (const skillId of ["apr", "crf.alchemy", "hea", "klo"]) {
      const comp = sheet.skills[skillId]?.components.find((c) => c.source === "Pesh Expert");
      expect(comp?.value).toBe(4);
    }
  });

  it("minimum +1 even at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 1 }], archetypes: [sorcererOfSleep] }),
      ref,
    );
    const comp = sheet.skills["hea"]?.components.find((c) => c.source === "Pesh Expert");
    expect(comp?.value).toBe(1);
  });
});

describe("Seeker (sorcerer): Tinkering grants +1/2 level (min 1) on Disable Device", () => {
  const seeker = archetypeId("Seeker", "sorcerer");

  it("+3 at L6", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 6 }], archetypes: [seeker] }),
      ref,
    );
    const comp = sheet.skills["dev"]?.components.find((c) => c.source === "Tinkering");
    expect(comp?.value).toBe(3);
  });
});

describe("Nornkith (monk): Nimble Reflexes grants a flat +2 Reflex save", () => {
  const nornkith = archetypeId("Nornkith");

  it("+2 Reflex at L3 (an ambiguous/unpaired swap — Still Mind has no vendored number to suppress)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 3 }], archetypes: [nornkith] }),
      ref,
    );
    const comp = sheet.saves.ref.components.find((c) => c.source === "Nimble Reflexes");
    expect(comp?.value).toBe(2);
    const archEntry = sheet.activeArchetypes.find((a) => a.id === nornkith);
    const feature = archEntry?.features.find((f) => f.name === "Nimble Reflexes");
    expect(feature?.ambiguous).toBe(true);
  });
});

describe("Notes-only archetypes carry a detail summary but no numeric effect", () => {
  it.each([
    ["Scout", "rogue"],
    ["Knife Master", "rogue"],
    ["Oath of Vengeance", "paladin"],
    ["Divine Hunter", "paladin"],
    ["Archaeologist", "bard"],
    ["Menhir Savant", "druid"],
    ["Spell Sage", "wizard"],
    ["School Savant", "arcanist"],
    ["Urban Barbarian", "barbarian"],
    ["Two-Handed Fighter", "fighter"],
  ])("%s is not badged as modeled (archetypeHasModeledEffects is false)", (name) => {
    const id = archetypeId(name);
    expect(archetypeHasModeledEffects(ref, id)).toBe(false);
  });
});

describe("Ranger Combat Style reflavors (Bow Nomad, Horse Lord, ...): same bonusFeats schedule", () => {
  // `bonusFeats` has no dedicated DerivedSheet field — the player-facing
  // budget lives in `apps/web/src/model/feats.ts`, which (pre-existing gap,
  // not fixed by this change — see the issue #7 report) reads
  // `refData.classFeatures` directly and doesn't consult archetype swaps or
  // `ARCHETYPE_FEATURE_EFFECTS` at all. What IS asserted here, at the engine
  // level: the base Combat Style Feat grant is correctly suppressed (no
  // double-counting), and the archetype's own feature carries the right
  // `detail` summary for `ClassFeaturesList`.
  it.each([
    ["Bow Nomad", "2 archery bonus feat(s)"],
    ["Horse Lord", "2 mounted combat bonus feat(s)"],
    ["Ilsurian Archer", "2 archery bonus feat(s)"],
    ["Shapeshifter", "2 natural weapon bonus feat(s)"],
    ["Stormwalker", "2 archery bonus feat(s)"],
    ["Toxophilite", "2 ranged combat bonus feat(s)"],
  ])(
    "%s grants floor((level+2)/4) bonus feats at L6, matching the base Combat Style Feat schedule",
    (name, detail) => {
      const id = archetypeId(name);
      const sheet = compute(
        makeDoc({ classes: [{ tag: "ranger", level: 6 }], archetypes: [id] }),
        ref,
      );

      const feature = sheet.classFeatures.find((f) => f.name === "Combat Style Feat");
      expect(feature?.applied).toBe(false); // swapped out — no double-counting

      const archEntry = sheet.activeArchetypes.find((a) => a.id === id);
      const own = archEntry?.features.find((f) => f.name === "Combat Style Feat");
      expect(own?.detail).toBe(detail);
    },
  );
});
