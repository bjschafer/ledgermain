import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  MONK_ARCHETYPE_EFFECTS_EXTRACTED,
  MONK_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/monk.js";
import { ARCHETYPE_FEATURE_EFFECTS, compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Fixture tests for `archetype-extracted/monk.ts`. Covers the classification
 * table's completeness guarantee, the three `blocked` composition traps, and
 * a hand-computed compute() fixture for every entry in
 * `MONK_ARCHETYPE_EFFECTS_EXTRACTED`.
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

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
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
      classes: over.classes,
    },
    abilities: ABILITIES,
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function sheetWith(archetypeName: string, level: number) {
  const id = archetypeId(archetypeName, "monk");
  return compute(makeDoc({ classes: [{ tag: "monk", level }], archetypes: [id] }), ref);
}

function sheetWithout(level: number) {
  return compute(makeDoc({ classes: [{ tag: "monk", level }] }), ref);
}

/**
 * Non-damage-type immunities the ARCHETYPE adds at `level`, isolated from
 * whatever vanilla monk already grants at that level (Purity of Body/Diamond
 * Body/Timeless Body's disease/poison/magicalAging immunities aren't
 * suppressed by these archetypes' replacement text — a pre-existing engine
 * behavior, out of scope here — so a plain read of `effectImmunities` would
 * pick up grants this pass never added).
 */
function newEffectImmunitiesAt(archetypeName: string, level: number): string[] {
  const withSet = new Set(
    (sheetWith(archetypeName, level).defenses?.effectImmunities ?? []).map((e) => e.qualifier),
  );
  const withoutSet = new Set(
    (sheetWithout(level).defenses?.effectImmunities ?? []).map((e) => e.qualifier),
  );
  return [...withSet].filter((q) => !withoutSet.has(q)).sort();
}

describe("Monk archetype classification: full coverage of every vendored feature", () => {
  it("every monk:* archetype feature in the vendored data has a classification entry, and vice versa", () => {
    const vendoredIds = Object.keys(ref.archetypeFeatures).filter((id) => id.startsWith("monk:"));
    const classifiedIds = Object.keys(MONK_ARCHETYPE_FEATURE_CLASSIFICATION);
    expect(classifiedIds.sort()).toEqual(vendoredIds.sort());
  });

  it("covers all 56 vendored monk archetypes across 328 features", () => {
    const archetypeIds = new Set(
      Object.values(MONK_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(archetypeIds.size).toBe(56);
    expect(Object.keys(MONK_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(328);
  });

  it("bucket counts (24 numeric, 39 situational, 260 subsystem, 5 blocked)", () => {
    const counts: Record<"numeric" | "situational" | "subsystem" | "blocked", number> = {
      numeric: 0,
      situational: 0,
      subsystem: 0,
      blocked: 0,
    };
    for (const entry of Object.values(MONK_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    // +2 numeric / -2 subsystem vs. the original audit: master-of-many-styles
    // and martial-artist's "Pain Points" promoted once abilityDC.stunningFist
    // / abilityDC.quiveringPalm (ability-dcs.ts) gave the DC half a target.
    expect(counts).toEqual({ numeric: 24, situational: 39, subsystem: 260, blocked: 5 });
  });

  it("every numeric-bucketed feature resolves to a real effect (hand-verified or extracted)", () => {
    for (const [id, entry] of Object.entries(MONK_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      if (entry.bucket !== "numeric") continue;
      expect(resolveArchetypeFeatureEffect(id)).toBeDefined();
    }
  });

  it("23 features are extracted; Nornkith's nimble-reflexes:3 stays solely hand-verified", () => {
    expect(Object.keys(MONK_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(23);
    expect(MONK_ARCHETYPE_EFFECTS_EXTRACTED["monk:nornkith:nimble-reflexes:3"]).toBeUndefined();
  });
});

describe("Nornkith / Nimble Guardian (monk): Nimble Reflexes, hand-verified plus its duplicate-archetype twin", () => {
  it("Nornkith resolves through the hand-verified table, not duplicated in the extracted table", () => {
    const resolved = resolveArchetypeFeatureEffect("monk:nornkith:nimble-reflexes:3");
    expect(resolved?.source).toBe("verified");
    expect(ARCHETYPE_FEATURE_EFFECTS["monk:nornkith:nimble-reflexes:3"]).toBeDefined();
    expect(MONK_ARCHETYPE_EFFECTS_EXTRACTED["monk:nornkith:nimble-reflexes:3"]).toBeUndefined();
  });

  it("+2 Reflex saves at L3, applied on the sheet (Nornkith)", () => {
    const sheet = sheetWith("Nornkith", 3);
    const without = sheetWithout(3);
    expect(sheet.saves.ref.total - without.saves.ref.total).toBe(2);
  });

  it("Nimble Guardian's identical Nimble Reflexes resolves through the EXTRACTED table under its own id", () => {
    const resolved = resolveArchetypeFeatureEffect("monk:nimble-guardian:nimble-reflexes:3");
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
  });

  it("+2 Reflex saves at L3, applied on the sheet (Nimble Guardian)", () => {
    const sheet = sheetWith("Nimble Guardian", 3);
    const without = sheetWithout(3);
    expect(sheet.saves.ref.total - without.saves.ref.total).toBe(2);
  });
});

describe("blocked composition traps: Ironskin Monk, in both its own vendored id and its Maneuver Master twin", () => {
  for (const archetypeName of ["Maneuver Master", "Ironskin Monk"]) {
    const slug = archetypeName === "Maneuver Master" ? "maneuver-master" : "ironskin-monk";

    it(`${archetypeName}: Iron Skin and Tough as Nails have no entry in either effects table`, () => {
      expect(resolveArchetypeFeatureEffect(`monk:${slug}:iron-skin:1`)).toBeUndefined();
      expect(resolveArchetypeFeatureEffect(`monk:${slug}:tough-as-nails:6`)).toBeUndefined();
    });

    it(`${archetypeName}: both are classified blocked, citing the AC Bonus (MNK) Wis-to-AC and Fast Movement landSpeed traps`, () => {
      const ironSkin = MONK_ARCHETYPE_FEATURE_CLASSIFICATION[`monk:${slug}:iron-skin:1`];
      const toughAsNails = MONK_ARCHETYPE_FEATURE_CLASSIFICATION[`monk:${slug}:tough-as-nails:6`];
      expect(ironSkin?.bucket).toBe("blocked");
      expect(toughAsNails?.bucket).toBe("blocked");
      expect(ironSkin?.note).toContain("Wis-to-AC");
      expect(toughAsNails?.note).toContain("landSpeed");
    });

    it(`${archetypeName}: base monk's AC Bonus (Wis-to-AC) and Fast Movement (landSpeed) keep applying in full — neither table piles a number on top`, () => {
      const id = archetypeId(archetypeName, "monk");
      const sheet = compute(
        makeDoc({ classes: [{ tag: "monk", level: 6 }], archetypes: [id] }),
        ref,
      );
      const withoutArchetype = compute(makeDoc({ classes: [{ tag: "monk", level: 6 }] }), ref);
      expect(sheet.ac.normal).toBe(withoutArchetype.ac.normal);
      expect(sheet.speeds.land).toBe(withoutArchetype.speeds.land);
    });
  }
});

describe("blocked composition trap: Softstrike Monk's Nonlethal Strikes (tables.ts unarmed-strike-die trap)", () => {
  it("has no entry in either effects table and is classified blocked, citing tables.ts", () => {
    expect(
      resolveArchetypeFeatureEffect("monk:softstrike-monk:nonlethal-strikes:1"),
    ).toBeUndefined();
    const entry = MONK_ARCHETYPE_FEATURE_CLASSIFICATION["monk:softstrike-monk:nonlethal-strikes:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(entry?.note).toContain("tables.ts");
  });
});

describe("Ki Mystic: Mystic Prescience (flat insight AC/CMD, scaling at 20th)", () => {
  it("+2 insight AC/CMD at L13", () => {
    const sheet = sheetWith("Ki Mystic", 13);
    const without = sheetWithout(13);
    expect(sheet.ac.normal - without.ac.normal).toBe(2);
    expect(sheet.cmd - without.cmd).toBe(2);
  });

  it("+4 insight AC/CMD at L20", () => {
    const sheet = sheetWith("Ki Mystic", 20);
    const without = sheetWithout(20);
    expect(sheet.ac.normal - without.ac.normal).toBe(4);
    expect(sheet.cmd - without.cmd).toBe(4);
  });
});

describe("Martial Artist: Bonus Feats (purely additive +1 slot, traded for Abundant Step)", () => {
  it("+1 bonus feat at L12, via the resolved effect's own formula (bonusFeats isn't read by compute())", () => {
    const resolved = resolveArchetypeFeatureEffect("monk:martial-artist:bonus-feats:12");
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.effect.detail?.(11)).toBe("no bonus feat yet");
    expect(resolved?.effect.detail?.(12)).toBe("+1 bonus feat");
  });
});

describe("Martial Artist: Extreme Endurance (immunities unlocking by level)", () => {
  it("fatigue only at L5", () => {
    expect(newEffectImmunitiesAt("Martial Artist", 5)).toEqual(["fatigue"]);
  });

  it("adds exhaustion at L10", () => {
    expect(newEffectImmunitiesAt("Martial Artist", 10)).toEqual(["exhaustion", "fatigue"]);
  });

  it("adds stunned at L15", () => {
    expect(newEffectImmunitiesAt("Martial Artist", 15)).toEqual([
      "exhaustion",
      "fatigue",
      "stunned",
    ]);
  });

  it("adds death effects and energy drain at L20", () => {
    expect(newEffectImmunitiesAt("Martial Artist", 20)).toEqual([
      "deathEffects",
      "energyDrain",
      "exhaustion",
      "fatigue",
      "stunned",
    ]);
  });
});

describe("Monk of the Sacred Mountain: Iron Monk (+1 natural armor) and Adamantine Monk (level-scaled DR)", () => {
  it("Iron Monk: +1 AC at L2", () => {
    const sheet = sheetWith("Monk of the Sacred Mountain", 2);
    const without = sheetWithout(2);
    expect(sheet.ac.normal - without.ac.normal).toBe(1);
  });

  it("Adamantine Monk: DR 1/— at L9", () => {
    const sheet = sheetWith("Monk of the Sacred Mountain", 9);
    expect(sheet.defenses?.dr[0]?.total).toBe(1);
    expect(sheet.defenses?.dr[0]?.qualifier).toBe("—");
  });

  it("Adamantine Monk: DR 2/— at L12 (1 + floor((12-9)/3))", () => {
    const sheet = sheetWith("Monk of the Sacred Mountain", 12);
    expect(sheet.defenses?.dr[0]?.total).toBe(2);
  });
});

describe("Perfect Scholar: Lore (flat Knowledge bonus, half monk level)", () => {
  it("+2 to every Knowledge sub-skill at L4 (floor(4/2))", () => {
    const sheet = sheetWith("Perfect Scholar", 4);
    const without = sheetWithout(4);
    expect(sheet.skills["kar"]!.total - without.skills["kar"]!.total).toBe(2);
    expect(sheet.skills["klo"]!.total - without.skills["klo"]!.total).toBe(2);
  });
});

describe("Terra-Cotta Monk: Stone Grip (flat Climb bonus, equal to monk level)", () => {
  it("+5 Climb at L5", () => {
    const sheet = sheetWith("Terra-Cotta Monk", 5);
    const without = sheetWithout(5);
    expect(sheet.skills["clm"]!.total - without.skills["clm"]!.total).toBe(5);
  });
});

describe("Terra-Cotta Monk: Trap Dodge (Wis modifier bonus on ALL saves vs. traps)", () => {
  it("+3 (Wis 16 modifier) on fort/ref/will vs. traps at 10th level, headlines untouched", () => {
    // "At 10th level, a terra-cotta monk gains a bonus equal to his Wisdom
    // modifier on all saving throws made against effects produced by
    // mechanical traps." Wis 16 -> +3 modifier (this file's ABILITIES).
    const sheet = sheetWith("Terra-Cotta Monk", 10);
    const without = sheetWithout(10);
    expect(sheet.saves.fort.total).toBe(without.saves.fort.total);
    expect(sheet.saves.ref.total).toBe(without.saves.ref.total);
    expect(sheet.saves.will.total).toBe(without.saves.will.total);
    const trapsOf = (conds: { categories: string[]; total: number }[] | undefined) =>
      conds?.find((c) => c.categories.includes("traps"));
    expect(trapsOf(sheet.saves.fort.conditionals)?.total).toBe(sheet.saves.fort.total + 3);
    expect(trapsOf(sheet.saves.ref.conditionals)?.total).toBe(sheet.saves.ref.total + 3);
    expect(trapsOf(sheet.saves.will.conditionals)?.total).toBe(sheet.saves.will.total + 3);
  });
});

describe("Wildcat: Brawler Maneuver Training (dirty-trick-scoped cmb/cmd, tiered)", () => {
  it("+1 CMB/CMD vs. dirty trick at 4th level, +2 at 7th", () => {
    // "At 4th level, a wildcat gains additional training with the dirty
    // trick combat maneuver... a +1 bonus on combat maneuver checks... and
    // a +1 bonus to his CMD... At 7th... the bonuses for the dirty trick
    // combat maneuver increase to +2." Only the fixed dirty-trick tier is
    // modeled; the 7th/10th/16th free-choice picks of another maneuver stay
    // unmodeled, so the headline cmb/cmd (which those free picks don't
    // touch either) stay identical with/without the archetype.
    const at4 = sheetWith("Wildcat", 4);
    const without4 = sheetWithout(4);
    expect(at4.cmb).toBe(without4.cmb);
    expect(at4.cmd).toBe(without4.cmd);
    expect(at4.cmbConditionals).toEqual([
      { total: at4.cmb + 1, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
    expect(at4.cmdConditionals).toEqual([
      { total: at4.cmd + 1, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);

    const at7 = sheetWith("Wildcat", 7);
    expect(at7.cmbConditionals).toEqual([
      { total: at7.cmb + 2, categories: ["dirtyTrick"], labels: ["dirty trick"] },
    ]);
  });
});

describe("Scaled Fist: Draconic Mettle (+2 vs. fear/sleep, paralysis not modeled)", () => {
  it("headline Will save is unaffected; the fear/sleep conditional adds +2 on top", () => {
    const sheet = sheetWith("Scaled Fist", 4);
    const without = sheetWithout(4);
    expect(sheet.saves.will.total).toBe(without.saves.will.total);
    // Base monk's Still Mind (class-feature-effects.ts) independently grants
    // +2 vs. enchantment, unreplaced by Scaled Fist — same +2 total as
    // Draconic Mettle's fear/sleep, so they merge into one conditional line.
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: without.saves.will.total + 2,
        categories: ["fear", "sleep", "enchantment"],
        labels: ["fear", "sleep", "enchantment"],
      },
    ]);
  });
});

describe("Hamatulatsu Master: Infernal Resilience (+2 vs. stun only; sicken/nauseate/stagger/pain not modeled)", () => {
  it("headline saves are unaffected; the stun conditional adds +2 on fort/ref/will", () => {
    const sheet = sheetWith("Hamatulatsu Master", 5);
    const without = sheetWithout(5);
    expect(sheet.saves.fort.total).toBe(without.saves.fort.total);
    expect(sheet.saves.ref.total).toBe(without.saves.ref.total);
    expect(sheet.saves.will.total).toBe(without.saves.will.total);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: without.saves.fort.total + 2, categories: ["stun"], labels: ["stunning"] },
    ]);
    expect(sheet.saves.ref.conditionals).toEqual([
      { total: without.saves.ref.total + 2, categories: ["stun"], labels: ["stunning"] },
    ]);
    // Base monk's Still Mind independently grants +2 vs. enchantment
    // (unreplaced here), will-only — merges with the stun line on Will only,
    // since enchantment has no meaning on Fortitude/Reflex.
    expect(sheet.saves.will.conditionals).toEqual([
      {
        total: without.saves.will.total + 2,
        categories: ["enchantment", "stun"],
        labels: ["enchantment", "stunning"],
      },
    ]);
  });
});

describe("Sohei: Devoted Guardian (flat init bonus, half monk level)", () => {
  it("+5 initiative at L10 (floor(10/2)); nat-20/surprise-round riders not modeled", () => {
    const sheet = sheetWith("Sohei", 10);
    const without = sheetWithout(10);
    expect(sheet.initiative.total - without.initiative.total).toBe(5);
  });
});

describe("Wildcat: Ready for Anything (flat +2 initiative; surprise-round Perception bonus not modeled)", () => {
  it("+2 initiative at L3", () => {
    const sheet = sheetWith("Wildcat", 3);
    const without = sheetWithout(3);
    expect(sheet.initiative.total - without.initiative.total).toBe(2);
  });
});

describe("Soul Shepherd: Otherworldly Resilience (flat DR/adamantine + cold/electricity resistance, scaling at 9th)", () => {
  it("DR 2/adamantine, cold/electricity resistance 5 at L2", () => {
    const sheet = sheetWith("Soul Shepherd", 2);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "adamantine")?.total).toBe(2);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(5);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "electricity")?.total).toBe(5);
  });

  it("DR 5/adamantine, cold/electricity resistance 10 at L9", () => {
    const sheet = sheetWith("Soul Shepherd", 9);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "adamantine")?.total).toBe(5);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(10);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "electricity")?.total).toBe(10);
  });
});

describe("Spirit Master: Spirit Mastery capstone (DR 10/evil + ability-damage/-drain immunity)", () => {
  it("DR 10/evil and both immunities at L20; weekly true-resurrection ritual not modeled", () => {
    const sheet = sheetWith("Spirit Master", 20);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "evil")?.total).toBe(10);
    expect(newEffectImmunitiesAt("Spirit Master", 20)).toEqual(["abilityDamage", "abilityDrain"]);
  });
});

describe("Student of Stone: Stone Self capstone (DR/chaotic, burrow speed, tremorsense)", () => {
  it("DR 5/chaotic, 20 ft. burrow speed, 20 ft. tremorsense at L20; earth-outsider type change not modeled", () => {
    const sheet = sheetWith("Student of Stone", 20);
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "chaotic")?.total).toBe(5);
    expect(sheet.speeds["burrow"]).toBe(20);
    expect(sheet.senses.find((s) => s.kind === "tremorsense")?.range).toBe(20);
  });
});

describe("Weapon Adept: Pure Power capstone (+2 Str/Dex/Wis)", () => {
  it("+2 to all three abilities at L20", () => {
    const sheet = sheetWith("Weapon Adept", 20);
    const without = sheetWithout(20);
    expect(sheet.abilities.str.total - without.abilities.str.total).toBe(2);
    expect(sheet.abilities.dex.total - without.abilities.dex.total).toBe(2);
    expect(sheet.abilities.wis.total - without.abilities.wis.total).toBe(2);
  });
});

describe("Ironskin Monk: Unbreakable capstone (death-effect/stun/ability-damage/-drain immunity; 75% crit mitigation not modeled)", () => {
  it("all four immunities at L20", () => {
    expect(newEffectImmunitiesAt("Ironskin Monk", 20)).toEqual([
      "abilityDamage",
      "abilityDrain",
      "deathEffects",
      "stunned",
    ]);
  });
});

describe("Sin Monk: Spawn of Sin capstone (mind-affecting immunity; aberration type change/sinspawn rule not modeled)", () => {
  it("mind-affecting immunity at L20", () => {
    expect(newEffectImmunitiesAt("Sin Monk", 20)).toEqual(["mindAffecting"]);
  });
});

describe("Brazen Disciple: Genie Apotheosis capstone (fire immunity; outsider type change/limited wish not modeled)", () => {
  it("fire immunity at L20", () => {
    const sheet = sheetWith("Brazen Disciple", 20);
    const immunities = (sheet.defenses?.immunities ?? []).map((e) => e.qualifier);
    expect(immunities).toEqual(["fire"]);
  });
});
