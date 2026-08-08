import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  deriveResourcePools,
  PSYCHIC_DISCIPLINES,
  PSYCHIC_DISCIPLINE_TAGS,
} from "../src/index.js";

/**
 * Psychic disciplines (Occult Adventures, issue: 17-class expansion follow-up
 * wave) — hand-authored table validation against the real vendored data slice
 * plus the Phrenic Pool resource derivation, mirroring
 * `oracleMysteryCurse.test.ts` / `sorcererBloodline.test.ts`'s patterns.
 * Lookups are scoped by classTag (never bare name).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(
  classes: { tag: string; level: number }[],
  abilities: CharacterDoc["abilities"],
  psychicDiscipline?: string,
  gear: CharacterDoc["build"]["gear"] = [],
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes },
    abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear,
      ...(psychicDiscipline ? { psychicDiscipline } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const BASE_ABILITIES = { str: 10, dex: 10, con: 10, int: 18, wis: 16, cha: 10 } as const;

describe("PSYCHIC_DISCIPLINES table shape", () => {
  it("ships all 23 published psychic disciplines", () => {
    expect(PSYCHIC_DISCIPLINE_TAGS).toHaveLength(23);
    expect([...PSYCHIC_DISCIPLINE_TAGS].sort()).toEqual([
      "abomination",
      "bleaching",
      "dream",
      "enlightenment",
      "faith",
      "ferocity",
      "hag_called",
      "haunted",
      "lore",
      "mindtech",
      "pageantry",
      "pain",
      "psychedelia",
      "rapport",
      "rebirth",
      "rivethun",
      "self-perfection",
      "shadow",
      "sorrow",
      "superiority",
      "symbiosis",
      "tranquility",
      "warp",
    ]);
  });

  it("every discipline: 9 bonus spells at the RAW cadence (1, 4, 6, ..., 18), ascending", () => {
    for (const tag of PSYCHIC_DISCIPLINE_TAGS) {
      const d = PSYCHIC_DISCIPLINES[tag]!;
      expect(d.bonusSpells.map((sp) => sp.level)).toEqual([1, 4, 6, 8, 10, 12, 14, 16, 18]);
    }
  });

  it("every bonus-spell id resolves against the vendored RefData.spells slice", () => {
    for (const tag of PSYCHIC_DISCIPLINE_TAGS) {
      for (const sp of PSYCHIC_DISCIPLINES[tag]!.bonusSpells) {
        const vendored = ref.spells[sp.id];
        expect(vendored).toBeDefined();
        expect(vendored!.name).toBe(sp.name);
      }
    }
  });

  it("phrenic pool ability split matches the vendored prose: 10 Wisdom, 13 Charisma", () => {
    const wis = PSYCHIC_DISCIPLINE_TAGS.filter(
      (t) => PSYCHIC_DISCIPLINES[t]!.phrenicPoolAbility === "wis",
    ).sort();
    const cha = PSYCHIC_DISCIPLINE_TAGS.filter(
      (t) => PSYCHIC_DISCIPLINES[t]!.phrenicPoolAbility === "cha",
    ).sort();
    expect(wis).toEqual([
      "bleaching",
      "enlightenment",
      "faith",
      "ferocity",
      "lore",
      "mindtech",
      "psychedelia",
      "self-perfection",
      "shadow",
      "tranquility",
    ]);
    expect(cha).toEqual([
      "abomination",
      "dream",
      "hag_called",
      "haunted",
      "pageantry",
      "pain",
      "rapport",
      "rebirth",
      "rivethun",
      "sorrow",
      "superiority",
      "symbiosis",
      "warp",
    ]);
  });
});

describe("psychic class vend + Phrenic Pool resource", () => {
  it("psychic 6 vends: low BAB (+3), good Will (+5 base), poor Fort/Ref (+2 base)", () => {
    const sheet = compute(makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES), ref);
    expect(sheet.bab).toBe(3); // low: floor(6/2)
    expect(sheet.saves.will.total).toBe(5 + 3); // good base 5 + Wis +3
    expect(sheet.saves.fort.total).toBe(2); // poor base 2 + Con 0
    expect(sheet.saves.ref.total).toBe(2); // poor base 2 + Dex 0
  });

  it("Phrenic Pool with no discipline chosen: vendored formula (floor(level/2) + Cha mod)", () => {
    // Cha 10 (+0) so the vendored cha-keyed formula gives exactly floor(6/2).
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES);
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool).toBeDefined();
    expect(pool!.max).toBe(3); // floor(6/2) + 0
    expect(pool!.per).toBe("day");
  });

  it("Phrenic Pool with a WISDOM discipline (faith): floor(level/2) + Wis mod", () => {
    // Wis 16 (+3), Cha 10 (+0): the wis-alias correction must yield 3 + 3,
    // not the vendored cha-keyed 3 + 0.
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6);
  });

  it("Phrenic Pool with a CHARISMA discipline (abomination): floor(level/2) + Cha mod", () => {
    const abilities = { ...BASE_ABILITIES, wis: 10, cha: 16 };
    const doc = makeDoc([{ tag: "psychic", level: 6 }], abilities, "abomination");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6); // floor(6/2) + cha 3 — wis 10 must NOT leak in
  });

  it("an unknown discipline tag falls back to the vendored cha formula (soft posture)", () => {
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES, "notARealDiscipline");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(3);
  });

  it("psychic has a vendored spell list; kineticist has none (it does not cast)", () => {
    expect(ref.spellLists["psychic"]).toBeDefined();
    expect(ref.spellLists["kineticist"]).toBeUndefined();
  });
});

describe("Discipline Powers grant collection (issue #65 follow-through)", () => {
  it("a psychic 13 with a chosen discipline gets all three power-tier grants (1st/5th/13th) surfaced in classFeatures", () => {
    const doc = makeDoc([{ tag: "psychic", level: 13 }], BASE_ABILITIES, "dream");
    const sheet = compute(doc, ref);
    const dreamLeech = sheet.classFeatures.find((f) => f.name === "Dream Leech");
    const oneiromancy = sheet.classFeatures.find((f) => f.name === "Oneiromancy");
    const mindHeist = sheet.classFeatures.find((f) => f.name === "Mind Heist");
    const wakingDream = sheet.classFeatures.find((f) => f.name === "Waking Dream");
    expect(dreamLeech).toBeDefined();
    expect(oneiromancy).toBeDefined();
    expect(mindHeist).toBeDefined();
    expect(wakingDream).toBeDefined();
    expect(dreamLeech!.classTag).toBe("psychic");
    expect(dreamLeech!.origin).toEqual({ kind: "discipline", label: "Dream Discipline" });
    expect(dreamLeech!.detail).toBe(PSYCHIC_DISCIPLINES.dream!.powers[0]!.summary);
  });

  it("a psychic 5 does NOT yet get the 13th-level power", () => {
    const doc = makeDoc([{ tag: "psychic", level: 5 }], BASE_ABILITIES, "dream");
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Mind Heist")).toBe(true);
    expect(sheet.classFeatures.some((f) => f.name === "Waking Dream")).toBe(false);
  });

  it("no discipline chosen: no power grants at all, even at high level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 13 }], BASE_ABILITIES);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Dream Leech")).toBe(false);
  });

  it("a non-psychic character with a stale psychicDiscipline field gets nothing granted", () => {
    const doc = makeDoc([{ tag: "mesmerist", level: 13 }], BASE_ABILITIES, "dream");
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.some((f) => f.name === "Dream Leech")).toBe(false);
  });
});

/**
 * Promotion audit (2026-07-29): the handful of Discipline Powers that are
 * genuinely unconditional and always-on once gained, verified against
 * aonprd.com's individual discipline pages and hand-computed here the same
 * way `sorcererBloodline.test.ts` / `bloodragerBloodline.test.ts` verify
 * their own promoted bloodline powers.
 */
describe("promoted discipline power: Faith's Resilience of the Faithful (5th)", () => {
  // AoN: "At 5th level, you gain a +2 resistance bonus on all saving
  // throws. This bonus increases by 1 for every 5 levels you possess
  // beyond 5th." → +2 at 5th, +3 at 10th, +4 at 15th, +5 at 20th.
  it("grants +2 resistance on all saves at 5th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 5 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(1 + 0 + 2); // poor base floor(5/3)=1 + Con 0 + resistance 2
    expect(sheet.saves.will.total).toBe(4 + 3 + 2); // good base floor(5/2)+2=4 + Wis 3 + resistance 2
  });

  it("scales to +3 at 10th level and +5 at 20th", () => {
    const at10 = compute(makeDoc([{ tag: "psychic", level: 10 }], BASE_ABILITIES, "faith"), ref);
    expect(at10.saves.ref.total).toBe(3 + 0 + 3); // poor base floor(10/3)=3 + Dex 0 + resistance 3
    const at20 = compute(makeDoc([{ tag: "psychic", level: 20 }], BASE_ABILITIES, "faith"), ref);
    expect(at20.saves.ref.total).toBe(6 + 0 + 5); // poor base floor(20/3)=6 + Dex 0 + resistance 5
  });

  it("grants nothing below 5th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 4 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    expect(sheet.saves.will.total).toBe(4 + 3); // good base floor(4/2)+2=4 + Wis 3, no resistance yet
  });
});

describe("promoted discipline power: Rebirth's Past-Life Memories (1st)", () => {
  // AoN: "You add a bonus equal to half your psychic level (minimum 1) to
  // all Knowledge checks and can attempt all Knowledge skill checks
  // untrained." Same `skill.knowledge` fan-out target as Cloistered
  // Cleric's Breadth of Knowledge (archetypeEffects.test.ts).
  it("grants the minimum +1 at 1st level on every Knowledge subskill", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "rebirth");
    const sheet = compute(doc, ref);
    const arcana = sheet.skills["kar"]!; // Knowledge (arcana)
    const comp = arcana.components.find(
      (c) => c.source === "Past-Life Memories (Rebirth Discipline)",
    );
    expect(comp?.value).toBe(1); // max(1, floor(1/2))
  });

  it("scales to floor(level/2) at higher level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 10 }], BASE_ABILITIES, "rebirth");
    const sheet = compute(doc, ref);
    const religion = sheet.skills["kre"]!; // Knowledge (religion)
    const comp = religion.components.find(
      (c) => c.source === "Past-Life Memories (Rebirth Discipline)",
    );
    expect(comp?.value).toBe(5); // floor(10/2)
  });

  it("contributes nothing under a different discipline", () => {
    const doc = makeDoc([{ tag: "psychic", level: 10 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    const arcana = sheet.skills["kar"]!;
    expect(
      arcana.components.some((c) => c.source === "Past-Life Memories (Rebirth Discipline)"),
    ).toBe(false);
  });
});

describe("promoted discipline power: Ferocity's Enhanced Senses (1st)", () => {
  // AoN: "You gain scent as per the universal monster rule." (The same
  // power's phrenic-pool-activated blindsense upgrade is NOT modeled.)
  it("grants scent at 1st level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "ferocity");
    const sheet = compute(doc, ref);
    expect(sheet.senses.map((s) => s.kind)).toContain("scent");
  });

  it("grants nothing under a different discipline", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    expect(sheet.senses.map((s) => s.kind)).not.toContain("scent");
  });
});

describe("promoted discipline power: Abomination's Psychic Safeguard (13th)", () => {
  // AoN: "You project constant mental defenses, gaining spell resistance
  // equal to 8 + your caster level." Only the constant base is modeled —
  // the dark-half-manifested increase to 16 + caster level is conditional
  // on the (activated) Dark Half power, so it's excluded.
  it("grants SR 8 + caster level at 13th level (21)", () => {
    const doc = makeDoc([{ tag: "psychic", level: 13 }], BASE_ABILITIES, "abomination");
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr?.total).toBe(21); // 8 + 13
  });

  it("grants nothing below 13th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 12 }], BASE_ABILITIES, "abomination");
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr).toBeUndefined();
  });
});

describe("promoted discipline power: Self-Perfection's Pure Body (13th)", () => {
  // AoN: "At 13th level, you gain immunity to diseases and poisons."
  it("grants disease and poison immunity at 13th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 13 }], BASE_ABILITIES, "self-perfection");
    const sheet = compute(doc, ref);
    expect((sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier).sort()).toEqual([
      "disease",
      "poison",
    ]);
  });

  it("grants nothing below 13th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 12 }], BASE_ABILITIES, "self-perfection");
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.effectImmunities).toBeUndefined();
  });
});

describe("promoted discipline power: Self-Perfection's AC Bonus (1st)", () => {
  // AoN: "When unarmored and unencumbered, you add your Wisdom bonus (if
  // any) to your AC and CMD." Same armor/shield/encumbrance gate as the
  // vendored Monk "AC Bonus (MNK)" class feature (compute.test.ts's "compute:
  // monk AC Bonus" suite) — this power carries no separate level-scaling
  // term, unlike the monk's.
  it("unarmored psychic with positive Wis gets the AC/CMD bonus", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "self-perfection");
    const sheet = compute(doc, ref);
    // wis 16 => +3. ac.normal = 10 base + dex0 + wisToAc3 = 13.
    expect(sheet.ac.normal).toBe(13);
    expect(sheet.ac.touch).toBe(13);
    // cmd = 10 + bab0 + str0 + dex0 + size0 + wisToAc3(explicit cmd copy) = 13
    expect(sheet.cmd).toBe(13);
  });

  it("armored psychic does NOT get the AC/CMD bonus", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "self-perfection", [
      {
        equipped: true,
        name: "Studded Leather",
        armor: { slot: "armor", ac: 3, maxDex: 5, acp: -1, type: 1 },
      },
    ]);
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(10 + 3); // 10 base + armor 3, no Wis-to-AC
  });

  it("contributes nothing under a different discipline", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    expect(sheet.ac.normal).toBe(10); // no Dex (10), no Wis-to-AC
  });
});

/**
 * Splatbook disciplines (later Occult Adventures-adjacent books, verified
 * 2026-08-07): the same fixture coverage as the core-12 promotion audit
 * above, spot-checking bonus spell cadence, phrenic pool ability resolution,
 * and the two promoted (unconditional, always-on) powers this batch adds.
 */
describe("splatbook discipline: bonus spells and phrenic pool ability", () => {
  it("Bleaching (Wisdom): 1st-level bonus spell is Decrepit Disguise, 18th is Energy Drain", () => {
    const bleaching = PSYCHIC_DISCIPLINES.bleaching!;
    expect(bleaching.phrenicPoolAbility).toBe("wis");
    expect(bleaching.bonusSpells[0]).toEqual({
      level: 1,
      id: "7u45op4znvtkvgv3",
      name: "Decrepit Disguise",
    });
    expect(bleaching.bonusSpells.at(-1)).toEqual({
      level: 18,
      id: "khfprkujokr9uigq",
      name: "Energy Drain",
    });
  });

  it("Phrenic Pool with Bleaching (Wisdom-keyed): floor(level/2) + Wis mod, not the vendored Cha formula", () => {
    // Wis 16 (+3), Cha 10 (+0) — same setup as the core-12 Faith fixture
    // above, confirming the wis-alias correction also fires for a
    // splatbook discipline.
    const doc = makeDoc([{ tag: "psychic", level: 6 }], BASE_ABILITIES, "bleaching");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6); // floor(6/2) + Wis 3
  });

  it("Sorrow (Charisma): 4th-level bonus spell is Silence, phrenic pool uses Cha", () => {
    const sorrow = PSYCHIC_DISCIPLINES.sorrow!;
    expect(sorrow.phrenicPoolAbility).toBe("cha");
    expect(sorrow.bonusSpells.find((sp) => sp.level === 4)).toEqual({
      level: 4,
      id: "ow4t1zox6dtybgji",
      name: "Silence",
    });
  });

  it("Phrenic Pool with Sorrow (Charisma-keyed): unaffected by the wis-alias, stays floor(level/2) + Cha mod", () => {
    const abilities = { ...BASE_ABILITIES, wis: 10, cha: 16 };
    const doc = makeDoc([{ tag: "psychic", level: 6 }], abilities, "sorrow");
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.classTag === "psychic" && p.name === "Phrenic Pool",
    );
    expect(pool!.max).toBe(6); // floor(6/2) + Cha 3 — Wis 10 must NOT leak in
  });
});

describe("promoted discipline power: Hag-Called's Curse Mastery (13th)", () => {
  // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Hag-Called): "You become
  // immune to spells of the curse subschool and curse effects."
  it("grants curse immunity at 13th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 13 }], BASE_ABILITIES, "hag_called");
    const sheet = compute(doc, ref);
    expect((sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier)).toEqual(["curse"]);
  });

  it("grants nothing below 13th level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 12 }], BASE_ABILITIES, "hag_called");
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.effectImmunities).toBeUndefined();
  });
});

describe("promoted discipline power: Symbiosis's One with Nature (1st)", () => {
  // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Symbiosis): "You gain a +2
  // insight bonus on Knowledge (nature) checks." Only the flat bonus is
  // modeled; the +4-while-scrying and 7th-level speak-with-animals upgrades
  // are not.
  it("grants +2 insight on Knowledge (nature) at 1st level", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "symbiosis");
    const sheet = compute(doc, ref);
    const natureKnowledge = sheet.skills["kna"]!;
    const comp = natureKnowledge.components.find(
      (c) => c.source === "One with Nature (Symbiosis Discipline)",
    );
    expect(comp?.value).toBe(2);
    expect(comp?.type).toBe("insight");
  });

  it("contributes nothing under a different discipline", () => {
    const doc = makeDoc([{ tag: "psychic", level: 1 }], BASE_ABILITIES, "faith");
    const sheet = compute(doc, ref);
    const natureKnowledge = sheet.skills["kna"]!;
    expect(
      natureKnowledge.components.some((c) => c.source === "One with Nature (Symbiosis Discipline)"),
    ).toBe(false);
  });
});
