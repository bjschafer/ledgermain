/**
 * Hand-computed fixture tests for the skald archetype raging-song variants
 * (`raging-song-variants.ts`). RAW numbers verified against the vendored
 * `archetype-features.json` skald archetype-feature text (2026-08-16), plus
 * d20pfsrd's Undying Word archetype page for the Inspire Resilience
 * Constitution-bonus question (2026-08-16, see that file's comment).
 * Follows the fixture pattern in `ragingSong.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import { ragingSongToggleOptions } from "../src/raging-song.js";
import { RAGING_SONG_VARIANTS } from "../src/raging-song-variants.js";
import type { ToggleBuffOption } from "../src/toggle-buffs.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const LONGSWORD: WeaponInstance = {
  name: "Longsword",
  attackAbility: "str",
  damageDice: "1d8",
  critRange: 19,
  critMult: 2,
};

function makeDoc(opts: {
  level: number;
  abilities?: CharacterDoc["abilities"];
  activeBuffs?: ActiveBuff[];
  weapons?: WeaponInstance[];
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
      classes: [{ tag: "skald", level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 16 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: opts.weapons ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function findOption(id: string, level: number, archetypeIds: readonly string[]): ToggleBuffOption {
  const option = ragingSongToggleOptions(level, archetypeIds).find((o) => o.id === id);
  if (!option) throw new Error(`option not found: ${id} at level ${level}`);
  return option;
}

function activeBuffFor(option: ToggleBuffOption): ActiveBuff {
  return {
    instanceId: `buff-${option.id}`,
    effectTag: option.id,
    name: option.name,
    changes: option.changes,
    contextNotes: option.contextNotes,
  };
}

describe("RAGING_SONG_VARIANTS drift/shape sanity", () => {
  it("has one entry per archetype in this shard, alphabetical by slug", () => {
    const ids = RAGING_SONG_VARIANTS.map((v) => v.archetypeId);
    expect(ids).toEqual([
      "skald:bacchanal",
      "skald:battle-scion",
      "skald:boaster",
      "skald:court-poet",
      "skald:dragon-skald",
      "skald:instigator",
      "skald:spell-warrior",
      "skald:twilight-speaker",
      "skald:undying-word",
      "skald:wyrm-singer",
    ]);
  });
});

describe("skald:bacchanal", () => {
  const ids = ["skald:bacchanal"];

  it("drops songOfMarching/dirgeOfDoom, adds songOfUrging at 3rd and maddeningDance at 10th", () => {
    const at2 = ragingSongToggleOptions(2, ids).map((o) => o.id);
    expect(at2).not.toContain("ragingSong:songOfMarching");
    expect(at2).not.toContain("ragingSong:bacchanal:songOfUrging");

    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).toContain("ragingSong:bacchanal:songOfUrging");
    expect(at9).not.toContain("ragingSong:dirgeOfDoom");
    expect(at9).not.toContain("ragingSong:bacchanal:maddeningDance");

    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).toContain("ragingSong:bacchanal:maddeningDance");
  });

  it("keeps unmodified Song of Strength and Song of the Fallen", () => {
    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:songOfStrength");
    expect(at14).toContain("ragingSong:songOfTheFallen");
  });

  it("both variant songs are note-tier (no Change entries)", () => {
    expect(findOption("ragingSong:bacchanal:songOfUrging", 3, ids).changes).toEqual([]);
    expect(findOption("ragingSong:bacchanal:maddeningDance", 10, ids).changes).toEqual([]);
  });
});

describe("skald:battle-scion", () => {
  const ids = ["skald:battle-scion"];

  it("drops dirgeOfDoom/songOfTheFallen, adds songOfQuesting at 10th", () => {
    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).not.toContain("ragingSong:battle-scion:songOfQuesting");

    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).toContain("ragingSong:battle-scion:songOfQuesting");
    expect(at10).not.toContain("ragingSong:dirgeOfDoom");
    expect(at10).not.toContain("ragingSong:songOfTheFallen");
  });

  it("keeps unmodified Inspired Rage, Song of Marching, and Song of Strength", () => {
    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).toContain("ragingSong:inspiredRage");
    expect(at10).toContain("ragingSong:songOfMarching");
    expect(at10).toContain("ragingSong:songOfStrength");
  });
});

describe("skald:boaster", () => {
  const ids = ["skald:boaster"];

  it("Song of Endurance (3rd) and Song of Surmounting (7th) are additions, not replacements", () => {
    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).toContain("ragingSong:songOfMarching");
    expect(at9).toContain("ragingSong:boaster:songOfEndurance");
    expect(at9).toContain("ragingSong:boaster:songOfSurmounting");
  });

  it("keeps unmodified Dirge of Doom, drops Song of the Fallen for Frightful Boast at 14th", () => {
    const at13 = ragingSongToggleOptions(13, ids).map((o) => o.id);
    expect(at13).toContain("ragingSong:dirgeOfDoom");
    expect(at13).not.toContain("ragingSong:boaster:frightfulBoast");

    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:boaster:frightfulBoast");
    expect(at14).not.toContain("ragingSong:songOfTheFallen");
  });

  it("all three variant songs are note-tier (no Change entries)", () => {
    expect(findOption("ragingSong:boaster:songOfEndurance", 3, ids).changes).toEqual([]);
    expect(findOption("ragingSong:boaster:songOfSurmounting", 7, ids).changes).toEqual([]);
    expect(findOption("ragingSong:boaster:frightfulBoast", 14, ids).changes).toEqual([]);
  });
});

describe("skald:court-poet: Insightful Contemplation (Inspired Rage, Int/Cha instead of Str/Con)", () => {
  const ids = ["skald:court-poet"];

  it("L1: +2 morale Int/Cha, +1 morale Will, -1 AC", () => {
    const noBuff = compute(makeDoc({ level: 1 }), ref);
    const option = findOption("ragingSong:court-poet:insightfulContemplation", 1, ids);
    const withBuff = compute(makeDoc({ level: 1, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.abilities.int.total).toBe(noBuff.abilities.int.total + 2);
    expect(withBuff.abilities.cha.total).toBe(noBuff.abilities.cha.total + 2);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 1);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal - 1);
  });

  it("L8: Int/Cha jump to +4, Will to +3 (1 + floor(8/4))", () => {
    const noBuff = compute(makeDoc({ level: 8 }), ref);
    const option = findOption("ragingSong:court-poet:insightfulContemplation", 8, ids);
    const withBuff = compute(makeDoc({ level: 8, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.abilities.int.total).toBe(noBuff.abilities.int.total + 4);
    expect(withBuff.abilities.cha.total).toBe(noBuff.abilities.cha.total + 4);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 3);
  });

  it("drops inspiredRage and songOfStrength base ids", () => {
    const at6 = ragingSongToggleOptions(6, ids).map((o) => o.id);
    expect(at6).not.toContain("ragingSong:inspiredRage");
    expect(at6).not.toContain("ragingSong:songOfStrength");
    expect(at6).toContain("ragingSong:court-poet:insightfulContemplation");
    expect(at6).toContain("ragingSong:court-poet:songOfInspiration");
  });
});

describe("skald:court-poet: Song of Inspiration (Wisdom-skill version of Song of Strength)", () => {
  const ids = ["skald:court-poet"];

  it("L7: max(1, floor(7/2)) = 3 on Perception/Heal/Sense Motive/Survival", () => {
    const noBuff = compute(makeDoc({ level: 7 }), ref);
    const option = findOption("ragingSong:court-poet:songOfInspiration", 7, ids);
    const withBuff = compute(makeDoc({ level: 7, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.skills["per"]!.total - noBuff.skills["per"]!.total).toBe(3);
    expect(withBuff.skills["hea"]!.total - noBuff.skills["hea"]!.total).toBe(3);
    expect(withBuff.skills["sen"]!.total - noBuff.skills["sen"]!.total).toBe(3);
    expect(withBuff.skills["sur"]!.total - noBuff.skills["sur"]!.total).toBe(3);
  });

  it("not offered below 6th level", () => {
    const at5 = ragingSongToggleOptions(5, ids).map((o) => o.id);
    expect(at5).not.toContain("ragingSong:court-poet:songOfInspiration");
  });
});

describe("skald:dragon-skald", () => {
  const ids = ["skald:dragon-skald"];

  it("drops songOfMarching, adds gloriousEpic (note-tier) at 3rd", () => {
    const at2 = ragingSongToggleOptions(2, ids).map((o) => o.id);
    expect(at2).not.toContain("ragingSong:dragon-skald:gloriousEpic");

    const at3 = ragingSongToggleOptions(3, ids).map((o) => o.id);
    expect(at3).not.toContain("ragingSong:songOfMarching");
    expect(at3).toContain("ragingSong:dragon-skald:gloriousEpic");
    expect(findOption("ragingSong:dragon-skald:gloriousEpic", 3, ids).changes).toEqual([]);
  });

  it("keeps unmodified Inspired Rage/Song of Strength/Dirge of Doom/Song of the Fallen", () => {
    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:inspiredRage");
    expect(at14).toContain("ragingSong:songOfStrength");
    expect(at14).toContain("ragingSong:dirgeOfDoom");
    expect(at14).toContain("ragingSong:songOfTheFallen");
  });
});

describe("skald:instigator", () => {
  const ids = ["skald:instigator"];

  it("Song of Rabble-Rousing (5th) is an addition, not a replacement", () => {
    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).toContain("ragingSong:songOfMarching");
    expect(at9).toContain("ragingSong:songOfStrength");
    expect(at9).toContain("ragingSong:instigator:songOfRabbleRousing");
  });

  it("keeps unmodified Song of the Fallen, drops Dirge of Doom for Song of Riot at 10th", () => {
    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).not.toContain("ragingSong:dirgeOfDoom");
    expect(at9).not.toContain("ragingSong:instigator:songOfRiot");

    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:instigator:songOfRiot");
    expect(at14).toContain("ragingSong:songOfTheFallen");
  });
});

describe("skald:spell-warrior", () => {
  const ids = ["skald:spell-warrior"];

  it("drops inspiredRage for Enhance Weapons (note-tier) from 1st level", () => {
    const at1 = ragingSongToggleOptions(1, ids).map((o) => o.id);
    expect(at1).not.toContain("ragingSong:inspiredRage");
    expect(at1).toContain("ragingSong:spell-warrior:enhanceWeapons");
    expect(findOption("ragingSong:spell-warrior:enhanceWeapons", 1, ids).changes).toEqual([]);
  });

  it("drops dirgeOfDoom for Song of Arcane Manipulation (note-tier) at 10th", () => {
    const at9 = ragingSongToggleOptions(9, ids).map((o) => o.id);
    expect(at9).not.toContain("ragingSong:spell-warrior:songOfArcaneManipulation");

    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).not.toContain("ragingSong:dirgeOfDoom");
    expect(at10).toContain("ragingSong:spell-warrior:songOfArcaneManipulation");
  });

  it("keeps unmodified Song of Marching and Song of the Fallen", () => {
    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:songOfMarching");
    expect(at14).toContain("ragingSong:songOfTheFallen");
  });
});

describe("skald:twilight-speaker: Inspired Devotion (competence attack + morale save)", () => {
  const ids = ["skald:twilight-speaker"];

  it("L1: +1 competence attack, +1 morale all saves, no AC penalty", () => {
    const noBuff = compute(makeDoc({ level: 1, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:twilight-speaker:inspiredDevotion", 1, ids);
    const withBuff = compute(
      makeDoc({ level: 1, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(1);
    expect(withBuff.saves.will.total - noBuff.saves.will.total).toBe(1);
    expect(withBuff.saves.fort.total - noBuff.saves.fort.total).toBe(1);
    expect(withBuff.saves.ref.total - noBuff.saves.ref.total).toBe(1);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal);
  });

  it("L6: bonuses reach +2 (1 + floor(6/6))", () => {
    const noBuff = compute(makeDoc({ level: 6, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:twilight-speaker:inspiredDevotion", 6, ids);
    const withBuff = compute(
      makeDoc({ level: 6, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(2);
    expect(withBuff.saves.will.total - noBuff.saves.will.total).toBe(2);
  });

  it("L18: bonuses reach +4 (1 + floor(18/6))", () => {
    const noBuff = compute(makeDoc({ level: 18, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:twilight-speaker:inspiredDevotion", 18, ids);
    const withBuff = compute(
      makeDoc({ level: 18, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(4);
    expect(withBuff.saves.will.total - noBuff.saves.will.total).toBe(4);
  });
});

describe("skald:twilight-speaker: Song of Secrecy (Stealth bonus, Dirge of Doom slot)", () => {
  const ids = ["skald:twilight-speaker"];

  it("L10: floor(10/2) = 5 Stealth", () => {
    const noBuff = compute(makeDoc({ level: 10 }), ref);
    const option = findOption("ragingSong:twilight-speaker:songOfSecrecy", 10, ids);
    const withBuff = compute(makeDoc({ level: 10, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.skills["ste"]!.total - noBuff.skills["ste"]!.total).toBe(5);
  });

  it("L14: floor(14/2) = 7 Stealth", () => {
    const noBuff = compute(makeDoc({ level: 14 }), ref);
    const option = findOption("ragingSong:twilight-speaker:songOfSecrecy", 14, ids);
    const withBuff = compute(makeDoc({ level: 14, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.skills["ste"]!.total - noBuff.skills["ste"]!.total).toBe(7);
  });

  it("drops inspiredRage/songOfStrength/dirgeOfDoom base ids, keeps songOfMarching/songOfTheFallen", () => {
    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).not.toContain("ragingSong:inspiredRage");
    expect(at10).not.toContain("ragingSong:songOfStrength");
    expect(at10).not.toContain("ragingSong:dirgeOfDoom");
    expect(at10).toContain("ragingSong:songOfMarching");

    const at14 = ragingSongToggleOptions(14, ids).map((o) => o.id);
    expect(at14).toContain("ragingSong:songOfTheFallen");
  });
});

describe("skald:undying-word: Inspire Resilience (Con/Will only, no Str, no AC penalty)", () => {
  const ids = ["skald:undying-word"];

  it("L1: +2 morale Con, +1 morale Will, no Str change, no AC penalty", () => {
    const noBuff = compute(makeDoc({ level: 1 }), ref);
    const option = findOption("ragingSong:undying-word:inspireResilience", 1, ids);
    const withBuff = compute(makeDoc({ level: 1, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.abilities.con.total).toBe(noBuff.abilities.con.total + 2);
    expect(withBuff.abilities.str.total).toBe(noBuff.abilities.str.total);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 1);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal);
  });

  it("L16: Con reaches +6, Will reaches +5", () => {
    const noBuff = compute(makeDoc({ level: 16 }), ref);
    const option = findOption("ragingSong:undying-word:inspireResilience", 16, ids);
    const withBuff = compute(makeDoc({ level: 16, activeBuffs: [activeBuffFor(option)] }), ref);
    expect(withBuff.abilities.con.total).toBe(noBuff.abilities.con.total + 6);
    expect(withBuff.saves.will.total).toBe(noBuff.saves.will.total + 5);
  });

  it("drops inspiredRage/songOfStrength/dirgeOfDoom, adds songOfDefiance at 6th and dirgeOfDetermination at 10th", () => {
    const at1 = ragingSongToggleOptions(1, ids).map((o) => o.id);
    expect(at1).not.toContain("ragingSong:inspiredRage");
    expect(at1).toContain("ragingSong:undying-word:inspireResilience");

    const at6 = ragingSongToggleOptions(6, ids).map((o) => o.id);
    expect(at6).not.toContain("ragingSong:songOfStrength");
    expect(at6).toContain("ragingSong:undying-word:songOfDefiance");
    expect(findOption("ragingSong:undying-word:songOfDefiance", 6, ids).changes).toEqual([]);

    const at10 = ragingSongToggleOptions(10, ids).map((o) => o.id);
    expect(at10).not.toContain("ragingSong:dirgeOfDoom");
    expect(at10).toContain("ragingSong:undying-word:dirgeOfDetermination");
    expect(findOption("ragingSong:undying-word:dirgeOfDetermination", 10, ids).changes).toEqual([]);
  });
});

describe("skald:wyrm-singer: Draconic Rage (melee attack/damage, paralysis/sleep saves)", () => {
  const ids = ["skald:wyrm-singer"];

  it("L1: +2 morale melee attack/damage, +2 morale vs. paralysis/sleep, -1 AC", () => {
    const noBuff = compute(makeDoc({ level: 1, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:wyrm-singer:draconicRage", 1, ids);
    const withBuff = compute(
      makeDoc({ level: 1, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(2);
    expect(withBuff.attacks[0]!.damageBonus.total - noBuff.attacks[0]!.damageBonus.total).toBe(2);
    expect(withBuff.ac.normal).toBe(noBuff.ac.normal - 1);
    // Save-category totals aren't separately exposed on DerivedSheet's
    // headline fields; assert the saveCategories shape directly on the def's
    // Changes (mirrors targets.ts's documented saveCategories mechanism).
    const paralysisSleep = option.changes.find(
      (c) => c.target === "allSavingThrows" && c.saveCategories?.includes("paralysis"),
    );
    expect(paralysisSleep?.formula).toBe("2 + floor(@classes.skald.level / 4)");
    expect(paralysisSleep?.saveCategories).toEqual(["paralysis", "sleep"]);
  });

  it("L8: melee attack/damage bonus reaches +3 (2 + floor(8/8))", () => {
    const noBuff = compute(makeDoc({ level: 8, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:wyrm-singer:draconicRage", 8, ids);
    const withBuff = compute(
      makeDoc({ level: 8, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(3);
  });

  it("L16: melee attack/damage bonus reaches +4 (2 + floor(16/8))", () => {
    const noBuff = compute(makeDoc({ level: 16, weapons: [LONGSWORD] }), ref);
    const option = findOption("ragingSong:wyrm-singer:draconicRage", 16, ids);
    const withBuff = compute(
      makeDoc({ level: 16, weapons: [LONGSWORD], activeBuffs: [activeBuffFor(option)] }),
      ref,
    );
    expect(withBuff.attacks[0]!.attack.total - noBuff.attacks[0]!.attack.total).toBe(4);
  });

  it("drops inspiredRage base id", () => {
    const at1 = ragingSongToggleOptions(1, ids).map((o) => o.id);
    expect(at1).not.toContain("ragingSong:inspiredRage");
    expect(at1).toContain("ragingSong:wyrm-singer:draconicRage");
  });
});
