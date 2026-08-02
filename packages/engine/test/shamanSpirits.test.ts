/**
 * Hand-computed fixture tests for shaman spirits + hexes. Almost every hex in
 * `SHAMAN_SPIRITS[tag].hexes` is note-tier prose with `changes: []` — two
 * promotions exist (Flame's Cinder Dance, a flat landSpeed bump, and Dark
 * Tapestry's Pierce the Veil, additive darkvision plus a level-8-gated
 * see-in-darkness flag — see `shaman-spirits.ts`'s doc comment for RAW
 * citations and the near-misses left blocked). What IS exercised: the table's
 * shape (18 spirits × 9 spirit-magic spells × 5 hexes, except Slums' 4), the
 * spirit ability + hexes surfacing through
 * `collectGrantedFeatures`/`resolveClassFeatures` gated on actual shaman
 * levels AND a chosen spirit, per-spirit hex scoping (display AND numeric),
 * unknown-id tolerance, and the promoted hexes'/tiers' real `compute` effects
 * — same pattern as `oracleRevelations.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, compute, resolveClassFeatures } from "../src/index.js";
import {
  findShamanHex,
  hexesForSpirit,
  SHAMAN_GREATER_SPIRIT_LEVEL,
  SHAMAN_MANIFESTATION_LEVEL,
  SHAMAN_SPIRIT_TAGS,
  SHAMAN_SPIRITS,
  SHAMAN_TRUE_SPIRIT_LEVEL,
} from "../src/shaman-spirits.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeShaman(level: number, shamanSpirit?: string, shamanHexes?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "shaman", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 16, cha: 12 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(shamanSpirit ? { shamanSpirit } : {}),
      ...(shamanHexes ? { shamanHexes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function spiritAndHexFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "spirit" || f.origin?.kind === "hex")
    .map((f) => f.name)
    .sort();
}

describe("SHAMAN_SPIRITS table", () => {
  it("covers all 18 published spirits (8 ACG core + 10 splatbook)", () => {
    expect([...SHAMAN_SPIRIT_TAGS].sort()).toEqual(
      [
        "ancestors",
        "battle",
        "bones",
        "dark_tapestry",
        "flame",
        "frost",
        "heavens",
        "life",
        "lore",
        "mammoth",
        "nature",
        "restoration",
        "slums",
        "stone",
        "tribe",
        "waves",
        "wind",
        "wood",
      ].sort(),
    );
  });

  it("every spirit has 9 spirit-magic spells, levels 1-9 in order, each a real vendored spell id", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.spiritMagicSpells.map((sp) => sp.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const sp of spirit.spiritMagicSpells) {
        expect(ref.spells[sp.id]).toBeDefined();
      }
    }
  });

  it("every spirit has 5 hexes (Slums genuinely has only 4 — confirmed on aonprd.com, not a vendoring gap), ids prefixed with the spirit's own tag", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.hexes).toHaveLength(tag === "slums" ? 4 : 5);
      for (const h of spirit.hexes) {
        expect(h.id.startsWith(`${tag}:`)).toBe(true);
      }
    }
  });

  it("every spirit has a named 1st-level ability with a summary", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.ability.name.length).toBeGreaterThan(0);
      expect(spirit.ability.summary.length).toBeGreaterThan(0);
    }
  });

  it("every spirit has a named greater/true/manifestation ability, each with a summary (aonprd.com Shaman class + per-spirit pages)", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      for (const tier of [spirit.greaterAbility, spirit.trueAbility, spirit.manifestation]) {
        expect(tier.name.length).toBeGreaterThan(0);
        expect(tier.summary.length).toBeGreaterThan(0);
      }
    }
  });

  it("gates the three higher tiers at the verified class-level thresholds (aonprd.com ClassDisplay.aspx?ItemName=Shaman)", () => {
    expect(SHAMAN_GREATER_SPIRIT_LEVEL).toBe(8);
    expect(SHAMAN_TRUE_SPIRIT_LEVEL).toBe(16);
    expect(SHAMAN_MANIFESTATION_LEVEL).toBe(20);
  });

  it("hexesForSpirit returns the same 5 hexes as the table entry", () => {
    expect(hexesForSpirit("battle")).toEqual(SHAMAN_SPIRITS.battle!.hexes);
  });

  it("hexesForSpirit returns [] for an unknown spirit tag", () => {
    expect(hexesForSpirit("not-a-spirit")).toEqual([]);
  });

  it("findShamanHex resolves a valid id and returns undefined for an unknown one", () => {
    expect(findShamanHex("battle:battleMaster")?.name).toBe("Battle Master");
    expect(findShamanHex("battle:notReal")).toBeUndefined();
    expect(findShamanHex("not-a-spirit:foo")).toBeUndefined();
  });

  it("exactly two hexes across all 89 carry a real Change — Flame's Cinder Dance and Dark Tapestry's Pierce the Veil", () => {
    const withChanges = SHAMAN_SPIRIT_TAGS.flatMap((tag) =>
      SHAMAN_SPIRITS[tag]!.hexes.filter((h) => h.changes.length > 0),
    );
    expect(withChanges.map((h) => h.id).sort()).toEqual(
      ["dark_tapestry:pierceTheVeil", "flame:cinderDance"].sort(),
    );
    expect(withChanges.every((h) => h.displayOnly === false)).toBe(true);
  });

  it("Cinder Dance's Change: RAW +10 ft. to base land speed (Ex, no action, no per-day limit)", () => {
    const cinderDance = findShamanHex("flame:cinderDance")!;
    expect(cinderDance.changes).toEqual([{ formula: "10", target: "landSpeed", type: "untyped" }]);
  });
});

describe("shaman spirit + hexes (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen spirit surfaces its 1st-level ability, gated on actual shaman levels", () => {
    const doc = makeShaman(1, "battle");
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("no spirit chosen surfaces nothing, even at high level", () => {
    const doc = makeShaman(10);
    expect(spiritAndHexFeatureNames(doc)).toEqual([]);
  });

  it("chosen hexes from the CURRENT spirit are surfaced alongside the ability", () => {
    const doc = makeShaman(4, "battle", ["battle:battleMaster", "battle:hamperingHex"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(
      ["Battle Master", "Battle Spirit", "Hampering Hex"].sort(),
    );
  });

  it("a hex id from a DIFFERENT spirit than the one chosen is skipped", () => {
    const doc = makeShaman(4, "battle", ["life:channel"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("unknown hex ids are skipped, never crash", () => {
    const doc = makeShaman(4, "battle", ["not-a-real-hex"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("collectGrantedFeatures gives the spirit ability a resolved grant with origin.kind 'spirit'", () => {
    const doc = makeShaman(1, "life");
    const granted = collectGrantedFeatures(doc, ref);
    const spiritGrant = granted.find((g) => g.origin?.kind === "spirit");
    expect(spiritGrant?.grant.name).toBe("Channel");
    expect(spiritGrant?.detail).toContain("Cha modifier times/day");
  });
});

describe("Cinder Dance (flame:cinderDance) — the one promoted spirit hex", () => {
  it("bumps land speed by 10 ft. via compute() when picked under the Flame spirit", () => {
    const base = compute(makeShaman(2, "flame"), ref);
    const withHex = compute(makeShaman(2, "flame", ["flame:cinderDance"]), ref);
    expect(withHex.speeds.land).toBe((base.speeds.land ?? 0) + 10);
  });

  it("does NOT apply while a different spirit is currently chosen (stale pick, same tolerance collectGrantedFeatures already gives the display side)", () => {
    const base = compute(makeShaman(2, "battle"), ref);
    const withStaleHex = compute(makeShaman(2, "battle", ["flame:cinderDance"]), ref);
    expect(withStaleHex.speeds.land).toBe(base.speeds.land);
  });

  it("does NOT apply with no shaman levels at all (gated on the granting class, same as every other loop here)", () => {
    const doc = makeShaman(2, "flame", ["flame:cinderDance"]);
    const noClassDoc: CharacterDoc = { ...doc, identity: { ...doc.identity, classes: [] } };
    const withHex = compute(noClassDoc, ref);
    const withoutHex = compute(
      { ...noClassDoc, build: { ...noClassDoc.build, shamanHexes: [] } },
      ref,
    );
    expect(withHex.speeds.land).toBe(withoutHex.speeds.land);
  });
});

/** `sheet.defenses` only materializes when at least one dr/resistance/immunity entry exists (see `defenses.ts`'s doc comment) — these helpers keep the fixture tests below from repeating the optional-chaining dance. */
function drTotal(sheet: ReturnType<typeof compute>, qualifier: string): number | undefined {
  return sheet.defenses?.dr.find((d) => d.qualifier === qualifier)?.total;
}
function resistanceTotal(sheet: ReturnType<typeof compute>, qualifier: string): number | undefined {
  return sheet.defenses?.resistances.find((r) => r.qualifier === qualifier)?.total;
}
function hasEffectImmunity(sheet: ReturnType<typeof compute>, qualifier: string): boolean {
  return sheet.defenses?.effectImmunities?.some((e) => e.qualifier === qualifier) ?? false;
}

describe('Heavens\' Void Adaptation (greater, 8th) — RAW aonprd.com ShamanSpiritDisplay.aspx?ItemName=Heavens: "gains darkvision 60 feet"', () => {
  it("grants darkvision 60 ft. at 8th level", () => {
    const sheet = compute(makeShaman(8, "heavens"), ref);
    const dv = sheet.senses.find((s) => s.kind === "darkvision");
    expect(dv?.range).toBe(60);
  });

  it("does NOT grant darkvision below 8th level (gated on Greater Spirit Ability, not just having Heavens)", () => {
    const sheet = compute(makeShaman(7, "heavens"), ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")).toBeUndefined();
  });

  it("does NOT apply while a different spirit is currently chosen", () => {
    const sheet = compute(makeShaman(8, "battle"), ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")).toBeUndefined();
  });
});

describe('Heavens\' Manifestation (20th) — RAW: "bonus on all saving throws equal to her Wisdom modifier" + "immune to fear effects"', () => {
  it("adds Wisdom modifier (+3 for Wis 16) to all three saves at 20th level", () => {
    const base = compute(makeShaman(20, "battle"), ref); // same level, no Heavens Manifestation
    const withHeavens = compute(makeShaman(20, "heavens"), ref);
    expect(withHeavens.saves.fort.total).toBe(base.saves.fort.total + 3);
    expect(withHeavens.saves.ref.total).toBe(base.saves.ref.total + 3);
    expect(withHeavens.saves.will.total).toBe(base.saves.will.total + 3);
  });

  it("grants fear immunity at 20th level", () => {
    const sheet = compute(makeShaman(20, "heavens"), ref);
    expect(hasEffectImmunity(sheet, "fear")).toBe(true);
  });

  it("does NOT apply the save bonus or fear immunity below 20th level", () => {
    const sheet = compute(makeShaman(19, "heavens"), ref);
    const base = compute(makeShaman(19, "battle"), ref);
    expect(sheet.saves.will.total).toBe(base.saves.will.total);
    expect(hasEffectImmunity(sheet, "fear")).toBe(false);
  });
});

describe('Bones\' Shard Soul (greater, 8th) — RAW: "DR 3/magic. This DR increases by 1 for every 4 shaman levels she possesses beyond 8th"', () => {
  it("grants DR 3/magic at 8th level", () => {
    expect(drTotal(compute(makeShaman(8, "bones"), ref), "magic")).toBe(3);
  });

  it("scales to DR 4/magic at 12th, DR 5/magic at 16th, DR 6/magic at 20th", () => {
    expect(drTotal(compute(makeShaman(12, "bones"), ref), "magic")).toBe(4);
    expect(drTotal(compute(makeShaman(16, "bones"), ref), "magic")).toBe(5);
    expect(drTotal(compute(makeShaman(20, "bones"), ref), "magic")).toBe(6);
  });

  it("does NOT grant DR/magic below 8th level", () => {
    expect(drTotal(compute(makeShaman(7, "bones"), ref), "magic")).toBeUndefined();
  });
});

describe('Stone\'s Body of Earth (greater, 8th) — RAW: "DR 2/adamantine. This DR increases by 1 for every 4 levels beyond 8th"', () => {
  it("grants DR 2/adamantine at 8th level, scaling to DR 5/adamantine at 20th", () => {
    expect(drTotal(compute(makeShaman(8, "stone"), ref), "adamantine")).toBe(2);
    expect(drTotal(compute(makeShaman(20, "stone"), ref), "adamantine")).toBe(5);
  });

  it("does NOT grant DR/adamantine below 8th level", () => {
    expect(drTotal(compute(makeShaman(7, "stone"), ref), "adamantine")).toBeUndefined();
  });
});

describe('Flame\'s Fiery Soul (greater, 8th) and Manifestation (20th) — RAW: fire resistance 10, then "gains fire resistance 30"', () => {
  it("grants fire resistance 10 at 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(8, "flame"), ref), "fire")).toBe(10);
  });

  it("resolves to fire resistance 30 (not 40) at 20th level — same qualifier, highest wins", () => {
    expect(resistanceTotal(compute(makeShaman(20, "flame"), ref), "fire")).toBe(30);
  });

  it("does NOT grant fire resistance below 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(7, "flame"), ref), "fire")).toBeUndefined();
  });
});

describe('Stone\'s Manifestation (20th) — RAW: "gains acid resistance 30"', () => {
  it("grants acid resistance 30 at 20th level, not before", () => {
    expect(resistanceTotal(compute(makeShaman(20, "stone"), ref), "acid")).toBe(30);
    expect(resistanceTotal(compute(makeShaman(19, "stone"), ref), "acid")).toBeUndefined();
  });
});

describe('Waves\' Manifestation (20th) — RAW: "gains cold resistance 30"', () => {
  it("grants cold resistance 30 at 20th level, not before", () => {
    expect(resistanceTotal(compute(makeShaman(20, "waves"), ref), "cold")).toBe(30);
    expect(resistanceTotal(compute(makeShaman(19, "waves"), ref), "cold")).toBeUndefined();
  });
});

describe("Life's Healer's Touch (greater, 8th) — RAW: \"gains a +4 bonus on Heal checks\"", () => {
  it("adds +4 to the Heal skill at 8th level", () => {
    const base = compute(makeShaman(8, "battle"), ref);
    const withLife = compute(makeShaman(8, "life"), ref);
    expect(withLife.skills.hea!.total).toBe(base.skills.hea!.total + 4);
  });

  it("does NOT apply below 8th level", () => {
    const base = compute(makeShaman(7, "battle"), ref);
    const withLife = compute(makeShaman(7, "life"), ref);
    expect(withLife.skills.hea!.total).toBe(base.skills.hea!.total);
  });
});

describe('Life\'s Manifestation (20th) — RAW: "gains immunity to bleed, death attacks, and negative energy, as well as to the exhausted, fatigued, nauseated, and sickened conditions" (the slices with immEffect slugs, see shaman-spirits.ts doc comment)', () => {
  it("grants death-effects, fatigue, and exhaustion immunity at 20th level, not before", () => {
    const at20 = compute(makeShaman(20, "life"), ref);
    const at19 = compute(makeShaman(19, "life"), ref);
    for (const slug of ["deathEffects", "fatigue", "exhaustion"]) {
      expect(hasEffectImmunity(at20, slug)).toBe(true);
      expect(hasEffectImmunity(at19, slug)).toBe(false);
    }
  });
});

describe('Frost\'s Frigid Blast (greater, 8th) — RAW: "gains cold resistance 10"', () => {
  it("grants cold resistance 10 at 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(8, "frost"), ref), "cold")).toBe(10);
  });

  it("does NOT grant cold resistance below 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(7, "frost"), ref), "cold")).toBeUndefined();
  });
});

describe('Wind\'s Spark Soul (greater, 8th) and Manifestation (20th) — RAW: electricity resistance 10, then "gains electricity resistance 30"', () => {
  it("grants electricity resistance 10 at 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(8, "wind"), ref), "electricity")).toBe(10);
  });

  it("resolves to electricity resistance 30 (not 40) at 20th level — same qualifier, highest wins", () => {
    expect(resistanceTotal(compute(makeShaman(20, "wind"), ref), "electricity")).toBe(30);
  });

  it("does NOT grant electricity resistance below 8th level", () => {
    expect(resistanceTotal(compute(makeShaman(7, "wind"), ref), "electricity")).toBeUndefined();
  });
});

describe('Lore\'s Perfect Knowledge (true, 16th) — RAW: "+10 competence bonus on all Knowledge, Linguistics, and Spellcraft checks"', () => {
  it("adds +10 to Knowledge, Linguistics, and Spellcraft at 16th level", () => {
    const base = compute(makeShaman(16, "battle"), ref);
    const withLore = compute(makeShaman(16, "lore"), ref);
    for (const skillId of ["kar", "khi", "lin", "spl"] as const) {
      if (!base.skills[skillId] || !withLore.skills[skillId]) continue;
      expect(withLore.skills[skillId]!.total).toBe(base.skills[skillId]!.total + 10);
    }
    expect(withLore.skills.lin!.total).toBe(base.skills.lin!.total + 10);
    expect(withLore.skills.spl!.total).toBe(base.skills.spl!.total + 10);
  });

  it("does NOT apply below 16th level", () => {
    const base = compute(makeShaman(15, "battle"), ref);
    const withLore = compute(makeShaman(15, "lore"), ref);
    expect(withLore.skills.spl!.total).toBe(base.skills.spl!.total);
  });
});

describe('Mammoth\'s Strength of the Beast (greater, 8th) — RAW: "+2 enhancement bonus to Strength... increases by 2 every 6 shaman levels thereafter (at 14th and 20th levels for her spirit)"', () => {
  it("grants +2 Str enhancement at 8th level", () => {
    const base = compute(makeShaman(8, "battle"), ref);
    const withMammoth = compute(makeShaman(8, "mammoth"), ref);
    expect(withMammoth.abilities.str.total).toBe(base.abilities.str.total + 2);
  });

  it("stays at +2 just below 14th level", () => {
    const base = compute(makeShaman(13, "battle"), ref);
    const withMammoth = compute(makeShaman(13, "mammoth"), ref);
    expect(withMammoth.abilities.str.total).toBe(base.abilities.str.total + 2);
  });

  it("scales to +4 at 14th level and +6 at 20th level", () => {
    const base14 = compute(makeShaman(14, "battle"), ref);
    const withMammoth14 = compute(makeShaman(14, "mammoth"), ref);
    expect(withMammoth14.abilities.str.total).toBe(base14.abilities.str.total + 4);

    const base20 = compute(makeShaman(20, "battle"), ref);
    const withMammoth20 = compute(makeShaman(20, "mammoth"), ref);
    expect(withMammoth20.abilities.str.total).toBe(base20.abilities.str.total + 6);
  });

  it("does NOT apply below 8th level", () => {
    const base = compute(makeShaman(7, "battle"), ref);
    const withMammoth = compute(makeShaman(7, "mammoth"), ref);
    expect(withMammoth.abilities.str.total).toBe(base.abilities.str.total);
  });
});

describe('Ancestors\' Manifestation (20th) — RAW: "bonus on Will saving throws equal to her Charisma modifier, blindsense out to a range of 60 feet"', () => {
  it("adds Charisma modifier to Will only (not Fort/Ref) at 20th level", () => {
    const base = compute(makeShaman(20, "battle"), ref);
    const withAncestors = compute(makeShaman(20, "ancestors"), ref);
    expect(withAncestors.saves.will.total).toBe(base.saves.will.total + 1); // Cha 12 -> +1
    expect(withAncestors.saves.fort.total).toBe(base.saves.fort.total);
    expect(withAncestors.saves.ref.total).toBe(base.saves.ref.total);
  });

  it("grants blindsense 60 ft. at 20th level", () => {
    const sheet = compute(makeShaman(20, "ancestors"), ref);
    expect(sheet.senses.find((s) => s.kind === "blindsense")?.range).toBe(60);
  });

  it("does NOT apply the save bonus or blindsense below 20th level", () => {
    const sheet = compute(makeShaman(19, "ancestors"), ref);
    const base = compute(makeShaman(19, "battle"), ref);
    expect(sheet.saves.will.total).toBe(base.saves.will.total);
    expect(sheet.senses.find((s) => s.kind === "blindsense")).toBeUndefined();
  });
});

describe('Dark Tapestry\'s Manifestation (20th) — RAW: "gains damage reduction 5/- and immunity to acid, critical hits, and sneak attacks"', () => {
  it("grants DR 5/-, acid immunity, and critical-hit immunity at 20th level", () => {
    const sheet = compute(makeShaman(20, "dark_tapestry"), ref);
    expect(drTotal(sheet, "—")).toBe(5);
    expect(sheet.defenses?.immunities?.some((i) => i.qualifier === "acid")).toBe(true);
    expect(hasEffectImmunity(sheet, "criticalHits")).toBe(true);
  });

  it("does NOT apply DR, acid immunity, or critical-hit immunity below 20th level", () => {
    const sheet = compute(makeShaman(19, "dark_tapestry"), ref);
    expect(drTotal(sheet, "—")).toBeUndefined();
    expect(sheet.defenses?.immunities?.some((i) => i.qualifier === "acid")).toBeFalsy();
    expect(hasEffectImmunity(sheet, "criticalHits")).toBe(false);
  });
});

describe('Dark Tapestry\'s Pierce the Veil hex — RAW: "gains darkvision to a range of up to 30 feet... At 8th level... see perfectly in darkness of any kind"', () => {
  it("grants darkvision 30 ft. as soon as the hex is picked (no level gate on the base grant)", () => {
    const sheet = compute(makeShaman(2, "dark_tapestry", ["dark_tapestry:pierceTheVeil"]), ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(30);
  });

  it("grants see-in-darkness at 8th level", () => {
    const sheet = compute(makeShaman(8, "dark_tapestry", ["dark_tapestry:pierceTheVeil"]), ref);
    expect(sheet.senses.find((s) => s.kind === "seeInDarkness")).toBeDefined();
  });

  it("does NOT grant see-in-darkness below 8th level", () => {
    const sheet = compute(makeShaman(7, "dark_tapestry", ["dark_tapestry:pierceTheVeil"]), ref);
    expect(sheet.senses.find((s) => s.kind === "seeInDarkness")).toBeUndefined();
  });
});

describe('Slums\' Manifestation (20th) — RAW: "immune to all diseases and poisons"', () => {
  it("grants disease and poison immunity at 20th level, not before", () => {
    const at20 = compute(makeShaman(20, "slums"), ref);
    const at19 = compute(makeShaman(19, "slums"), ref);
    for (const slug of ["disease", "poison"]) {
      expect(hasEffectImmunity(at20, slug)).toBe(true);
      expect(hasEffectImmunity(at19, slug)).toBe(false);
    }
  });
});

describe('Tribe\'s Manifestation (20th) — RAW: "bonus on all of her saving throws equal to her Charisma modifier and becomes immune to compulsion spells and spell-like abilities"', () => {
  it("adds Charisma modifier to all three saves at 20th level", () => {
    const base = compute(makeShaman(20, "battle"), ref);
    const withTribe = compute(makeShaman(20, "tribe"), ref);
    expect(withTribe.saves.fort.total).toBe(base.saves.fort.total + 1); // Cha 12 -> +1
    expect(withTribe.saves.ref.total).toBe(base.saves.ref.total + 1);
    expect(withTribe.saves.will.total).toBe(base.saves.will.total + 1);
  });

  it("grants compulsion immunity at 20th level", () => {
    expect(hasEffectImmunity(compute(makeShaman(20, "tribe"), ref), "compulsion")).toBe(true);
  });

  it("does NOT apply the save bonus or compulsion immunity below 20th level", () => {
    const base = compute(makeShaman(19, "battle"), ref);
    const withTribe = compute(makeShaman(19, "tribe"), ref);
    expect(withTribe.saves.will.total).toBe(base.saves.will.total);
    expect(hasEffectImmunity(withTribe, "compulsion")).toBe(false);
  });
});

describe('Wood\'s Manifestation (20th) — RAW: "+4 natural armor bonus to her Armor Class... immunity to paralysis, poison, polymorph, sleep, and stun"', () => {
  it("grants +4 natural armor and paralysis/poison/sleep/stunned immunity at 20th level", () => {
    const base = compute(makeShaman(20, "battle"), ref);
    const withWood = compute(makeShaman(20, "wood"), ref);
    expect(withWood.ac.normal).toBe(base.ac.normal + 4);
    for (const slug of ["paralysis", "poison", "sleep", "stunned"]) {
      expect(hasEffectImmunity(withWood, slug)).toBe(true);
    }
  });

  it("does NOT apply below 20th level", () => {
    const base = compute(makeShaman(19, "battle"), ref);
    const withWood = compute(makeShaman(19, "wood"), ref);
    expect(withWood.ac.normal).toBe(base.ac.normal);
    for (const slug of ["paralysis", "poison", "sleep", "stunned"]) {
      expect(hasEffectImmunity(withWood, slug)).toBe(false);
    }
  });
});

describe("Restoration's Healer's Touch (greater, 8th) — RAW (d20pfsrd.com): \"gains a +4 bonus on Heal checks\"", () => {
  it("adds +4 to the Heal skill at 8th level", () => {
    const base = compute(makeShaman(8, "battle"), ref);
    const withRestoration = compute(makeShaman(8, "restoration"), ref);
    expect(withRestoration.skills.hea!.total).toBe(base.skills.hea!.total + 4);
  });

  it("does NOT apply below 8th level", () => {
    const base = compute(makeShaman(7, "battle"), ref);
    const withRestoration = compute(makeShaman(7, "restoration"), ref);
    expect(withRestoration.skills.hea!.total).toBe(base.skills.hea!.total);
  });
});

describe('Restoration\'s Manifestation (20th) — RAW (d20pfsrd.com): "immunity to bleed, death attacks, and negative energy, as well as to the exhausted, fatigued, nauseated, and sickened conditions" (the slices with immEffect slugs)', () => {
  it("grants death-effects, fatigue, and exhaustion immunity at 20th level, not before", () => {
    const at20 = compute(makeShaman(20, "restoration"), ref);
    const at19 = compute(makeShaman(19, "restoration"), ref);
    for (const slug of ["deathEffects", "fatigue", "exhaustion"]) {
      expect(hasEffectImmunity(at20, slug)).toBe(true);
      expect(hasEffectImmunity(at19, slug)).toBe(false);
    }
  });
});
