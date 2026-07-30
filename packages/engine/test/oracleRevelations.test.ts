/**
 * Hand-computed fixture tests for oracle revelations (issue #61). Almost
 * every revelation in `ORACLE_REVELATIONS` is `displayOnly` with
 * `changes: []` (see that file's doc comment), so `collectModifiers` should
 * never emit a numeric modifier for one. What IS exercised: gating on actual
 * oracle levels AND a chosen mystery, per-mystery scoping (a revelation from
 * a DIFFERENT mystery than the one selected is silently skipped), unknown-id
 * tolerance, and surfacing picked revelations through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `arcanistExploits.test.ts`.
 *
 * A small, deliberately narrow set of revelations WAS promoted off
 * `displayOnly` (see `oracle-revelations.ts`'s doc comment for the RAW
 * citations) — `PROMOTED_REVELATION_IDS` below is the explicit exceptions
 * list, and each has its own `compute()` fixture describe block further
 * down: right level/mystery moves the cited number, below the scaling
 * breakpoint gives the smaller number, and the wrong mystery contributes
 * nothing.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { collectGrantedFeatures, compute, resolveClassFeatures } from "../src/index.js";
import { ORACLE_MYSTERIES, ORACLE_MYSTERY_TAGS } from "../src/oracle-mysteries.js";
import {
  ORACLE_MYSTERY_FINAL_REVELATIONS,
  ORACLE_REVELATIONS,
  ORACLE_REVELATION_IDS,
  revelationsForMystery,
} from "../src/oracle-revelations.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeOracle(
  level: number,
  oracleMystery?: string,
  oracleRevelations?: string[],
  pickChoices?: Record<string, string>,
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "oracle", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(oracleMystery ? { oracleMystery } : {}),
      ...(oracleRevelations ? { oracleRevelations } : {}),
      ...(pickChoices ? { pickChoices } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function revelationFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "revelation")
    .map((f) => f.name)
    .sort();
}

/**
 * Every revelation promoted off `displayOnly` (issue #75-style pass — see
 * `oracle-revelations.ts`'s doc comment for each one's RAW citation). This
 * is the explicit exceptions list the invariant test below checks against —
 * any revelation NOT in this set must still be `displayOnly` with
 * `changes: []`.
 */
const PROMOTED_REVELATION_IDS = [
  "metal:ironConstitution",
  "elemental:elementalResistance",
  "spellscar:eldritchResistance",
  "spellscar:spellResistance",
  "flame:moltenSkin",
  "stone:acidSkin",
  "waves:icySkin",
  "wind:sparkSkin",
  "winter:icySkin",
  "streets:faceInTheCrowd",
  "dark_tapestry:pierceTheVeil",
  "shadow:pierceTheShadows",
  "outer_rifts:telepathy",
];

/**
 * The chosen-element trio promoted via the choose-one mechanism
 * (`choice`/`choiceChanges` — see `oracle-revelations.ts`'s doc comment):
 * their numbers key off a stored `pickChoices` selection rather than (or, for
 * Draconic Resistance's natural armor, in addition to) unconditional
 * `changes`.
 */
const CHOICE_PROMOTED_REVELATION_IDS = [
  "apocalypse:defyElements",
  "dragon:draconicResistance",
  "elemental:elementalAegis",
];

describe("ORACLE_REVELATIONS table", () => {
  it("every non-promoted revelation is displayOnly with no changes (no unconditional flat number)", () => {
    const promoted = new Set([...PROMOTED_REVELATION_IDS, ...CHOICE_PROMOTED_REVELATION_IDS]);
    for (const id of ORACLE_REVELATION_IDS) {
      if (promoted.has(id)) continue;
      const revelation = ORACLE_REVELATIONS[id]!;
      expect(revelation.displayOnly, id).toBe(true);
      expect(revelation.changes, id).toEqual([]);
      expect(revelation.choiceChanges, id).toBeUndefined();
    }
  });

  it("every promoted revelation actually carries a non-empty changes[] and displayOnly: false", () => {
    for (const id of PROMOTED_REVELATION_IDS) {
      const revelation = ORACLE_REVELATIONS[id];
      expect(revelation, id).toBeDefined();
      expect(revelation!.displayOnly, id).toBe(false);
      expect(revelation!.changes.length, id).toBeGreaterThan(0);
    }
  });

  it("every choice-promoted revelation carries non-empty choiceChanges and resolves its pick key", () => {
    for (const id of CHOICE_PROMOTED_REVELATION_IDS) {
      const revelation = ORACLE_REVELATIONS[id];
      expect(revelation, id).toBeDefined();
      expect(revelation!.displayOnly, id).toBe(false);
      expect(Object.keys(revelation!.choiceChanges ?? {}).length, id).toBeGreaterThan(0);
      if (revelation!.choiceFromMystery) {
        // The declaring pick lives on the mystery — it must actually declare
        // one, and every choiceChanges key must be one of its option ids.
        const mystery = ORACLE_MYSTERIES[revelation!.mysteryTag];
        expect(mystery?.choice, id).toBeDefined();
        const optionIds = new Set(mystery!.choice!.options.map((o) => o.id));
        for (const key of Object.keys(revelation!.choiceChanges!)) {
          expect(optionIds.has(key), `${id} option ${key}`).toBe(true);
        }
      } else {
        expect(revelation!.choice, id).toBeDefined();
        const optionIds = new Set(revelation!.choice!.options.map((o) => o.id));
        for (const key of Object.keys(revelation!.choiceChanges!)) {
          expect(optionIds.has(key), `${id} option ${key}`).toBe(true);
        }
      }
    }
  });

  it("covers every modeled mystery with its full published revelation list", () => {
    // All 34 vendored mysteries are modeled (issue #74). Most publish
    // exactly 10 revelations; the exceptions genuinely have fewer RAW —
    // Ascetic 8 (Ultimate Magic), Juju 9 (Faiths & Philosophies), Streets 9
    // (Ultimate Magic) — each confirmed against aonprd.com by its authoring
    // pass, not a data gap.
    expect(ORACLE_MYSTERY_TAGS.length).toBe(34);
    const published: Record<string, number> = { ascetic: 8, juju: 9, streets: 9 };
    let total = 0;
    for (const tag of ORACLE_MYSTERY_TAGS) {
      const count = published[tag] ?? 10;
      expect(revelationsForMystery(tag).length, tag).toBe(count);
      total += count;
    }
    expect(ORACLE_REVELATION_IDS.length).toBe(total);
  });

  it("every mystery has a Final Revelation", () => {
    for (const tag of ORACLE_MYSTERY_TAGS) {
      expect(ORACLE_MYSTERY_FINAL_REVELATIONS[tag]).toBeDefined();
    }
  });

  it("ids are mystery-scoped and unique (Combat Healer appears in both Battle and Life)", () => {
    expect(ORACLE_REVELATIONS["battle:combatHealer"]?.name).toBe("Combat Healer");
    expect(ORACLE_REVELATIONS["life:combatHealer"]?.name).toBe("Combat Healer");
    expect(ORACLE_REVELATIONS["battle:combatHealer"]).not.toBe(
      ORACLE_REVELATIONS["life:combatHealer"],
    );
  });
});

describe("oracle revelations (collectModifiers)", () => {
  it("a chosen displayOnly revelation contributes no numeric modifier", () => {
    const doc = makeOracle(7, "life", ["life:channel", "life:combatHealer"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("life:"))).toBe(false);
  });

  it("no revelations chosen contributes nothing", () => {
    const doc = makeOracle(7, "life");
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.length).toBeGreaterThanOrEqual(0);
  });

  it("unknown revelation ids are skipped, never crash", () => {
    const doc = makeOracle(7, "life", ["not-a-real-revelation"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("a non-oracle with a stale oracleRevelations field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeOracle(0, "life", ["life:channel"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId?.startsWith("life:"))).toBe(false);
  });
});

describe("oracle revelations (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen revelation is surfaced with origin.kind 'revelation'", () => {
    const doc = makeOracle(7, "life", ["life:channel", "life:combatHealer"]);
    expect(revelationFeatureNames(doc)).toEqual(["Channel", "Combat Healer"]);
  });

  it("no revelations chosen surfaces nothing", () => {
    const doc = makeOracle(7, "life");
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("a revelation id from a DIFFERENT mystery than the one chosen is skipped", () => {
    const doc = makeOracle(7, "life", ["battle:battlecry"]);
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("no mystery chosen at all surfaces nothing, even with revelation ids present", () => {
    const doc = makeOracle(7, undefined, ["life:channel"]);
    expect(revelationFeatureNames(doc)).toEqual([]);
  });

  it("carries the revelation's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeOracle(7, "life", ["life:channel"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "revelation");
    expect(feature?.detail).toBe(ORACLE_REVELATIONS["life:channel"]!.summary);
  });

  it("collectGrantedFeatures gates on oracle level (0 for a non-oracle)", () => {
    const doc: CharacterDoc = {
      ...makeOracle(0, "life", ["life:channel"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "fighter", level: 4 }],
      },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "revelation")).toBe(false);
  });
});

// Promoted revelations (see oracle-revelations.ts's doc comment for each
// RAW citation). Each block exercises: right level/mystery moves the number
// by the cited amount, below the scaling breakpoint gives the smaller
// number, and the wrong mystery contributes nothing.
describe("promoted revelation: metal:ironConstitution", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Metal): "You gain a +1 bonus on
  // Fortitude saves. At 7th level, and again at 14th level, this bonus
  // increases by +1."
  it("grants +1 Fortitude at 1st level", () => {
    const doc = makeOracle(1, "metal", ["metal:ironConstitution"]);
    const before = compute(makeOracle(1, "metal", []), ref);
    const after = compute(doc, ref);
    expect(after.saves.fort.total - before.saves.fort.total).toBe(1);
  });

  it("increases to +2 at 7th level", () => {
    const doc = makeOracle(7, "metal", ["metal:ironConstitution"]);
    const before = compute(makeOracle(7, "metal", []), ref);
    const after = compute(doc, ref);
    expect(after.saves.fort.total - before.saves.fort.total).toBe(2);
  });

  it("increases to +3 at 14th level", () => {
    const doc = makeOracle(14, "metal", ["metal:ironConstitution"]);
    const before = compute(makeOracle(14, "metal", []), ref);
    const after = compute(doc, ref);
    expect(after.saves.fort.total - before.saves.fort.total).toBe(3);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(14, "life", ["metal:ironConstitution"]);
    const sheet = compute(doc, ref);
    expect(sheet.saves.fort.total).toBe(compute(makeOracle(14, "life", []), ref).saves.fort.total);
  });
});

describe("promoted revelation: elemental:elementalResistance", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Elemental): resistance 2 to acid,
  // cold, electricity, and fire; 5 at 7th, 10 at 11th, 20 at 17th.
  it("grants resistance 2 to all four energies at 1st level", () => {
    const doc = makeOracle(1, "elemental", ["elemental:elementalResistance"]);
    const sheet = compute(doc, ref);
    for (const energy of ["acid", "cold", "electricity", "fire"]) {
      expect(sheet.defenses?.resistances.find((r) => r.qualifier === energy)?.total, energy).toBe(
        2,
      );
    }
  });

  it("increases to 5 at 7th level (below the 11th-level breakpoint)", () => {
    const doc = makeOracle(7, "elemental", ["elemental:elementalResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
  });

  it("increases to 20 at 17th level", () => {
    const doc = makeOracle(17, "elemental", ["elemental:elementalResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(20);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(17, "life", ["elemental:elementalResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });
});

describe("promoted revelation: spellscar:eldritchResistance", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Spellscar): resistance 2 to acid,
  // cold, electricity, fire, and sonic; 5 at 5th, 10 at 11th, 20 at 17th.
  it("grants resistance 2 to all five energies at 1st level, including sonic", () => {
    const doc = makeOracle(1, "spellscar", ["spellscar:eldritchResistance"]);
    const sheet = compute(doc, ref);
    for (const energy of ["acid", "cold", "electricity", "fire", "sonic"]) {
      expect(sheet.defenses?.resistances.find((r) => r.qualifier === energy)?.total, energy).toBe(
        2,
      );
    }
  });

  it("increases to 5 at 5th level (below the 11th-level breakpoint)", () => {
    const doc = makeOracle(5, "spellscar", ["spellscar:eldritchResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "sonic")?.total).toBe(5);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(17, "life", ["spellscar:eldritchResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });
});

describe("promoted revelation: spellscar:spellResistance", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Spellscar): "You gain SR equal to your
  // oracle level + 5. You must be at least 11th level before selecting this
  // revelation." minLevel is soft-filtered only, so the Change self-gates.
  it("grants SR = oracle level + 5 at 11th level (16)", () => {
    const doc = makeOracle(11, "spellscar", ["spellscar:spellResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr?.total).toBe(16);
  });

  it("grants SR 20 at 15th level", () => {
    const doc = makeOracle(15, "spellscar", ["spellscar:spellResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr?.total).toBe(20);
  });

  it("grants nothing below the 11th-level RAW minimum, even if picked early", () => {
    const doc = makeOracle(7, "spellscar", ["spellscar:spellResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr).toBeUndefined();
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(15, "life", ["spellscar:spellResistance"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr).toBeUndefined();
  });
});

describe.each([
  ["flame", "moltenSkin", "fire"],
  ["stone", "acidSkin", "acid"],
  ["waves", "icySkin", "cold"],
  ["wind", "sparkSkin", "electricity"],
  ["winter", "icySkin", "cold"],
] as const)("promoted revelation: %s:%s (single-energy resist/immunity)", (mystery, id, energy) => {
  // AoN: "You gain resist <energy> 5. This resistance increases to 10 at 5th
  // level and 20 at 11th level. At 17th level, you gain immunity to
  // <energy>." (Flame/Stone/Waves/Wind mysteries; People of the North's
  // Winter mystery reuses the identical published Icy Skin ability.)
  const revelationId = `${mystery}:${id}`;

  it("grants resist 5 at 1st level, no immunity yet", () => {
    const sheet = compute(makeOracle(1, mystery, [revelationId]), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === energy)?.total).toBe(5);
    expect(sheet.defenses?.immunities?.some((i) => i.qualifier === energy)).toBeFalsy();
  });

  it("increases to 10 at 5th level (below the 11th-level breakpoint)", () => {
    const sheet = compute(makeOracle(5, mystery, [revelationId]), ref);
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === energy)?.total).toBe(10);
  });

  it("reaches immunity at 17th level", () => {
    const sheet = compute(makeOracle(17, mystery, [revelationId]), ref);
    expect(sheet.defenses?.immunities?.some((i) => i.qualifier === energy)).toBe(true);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const sheet = compute(makeOracle(17, "life", [revelationId]), ref);
    expect(sheet.defenses).toBeUndefined();
  });
});

describe("promoted revelation: streets:faceInTheCrowd", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Streets): "You gain a +4 bonus on
  // Stealth checks..." — unconditional, no crowd requirement on the +4.
  it("grants +4 Stealth at 1st level", () => {
    const doc = makeOracle(1, "streets", ["streets:faceInTheCrowd"]);
    const sheet = compute(doc, ref);
    expect(sheet.skills["ste"]!.miscMod).toBe(4);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(7, "life", ["streets:faceInTheCrowd"]);
    const sheet = compute(doc, ref);
    expect(sheet.skills["ste"]!.miscMod).toBe(0);
  });
});

describe("promoted revelation: dark_tapestry:pierceTheVeil", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Dark+Tapestry): "You gain darkvision
  // 60 feet. At 11th level, you can see perfectly in darkness of any kind..."
  it("grants darkvision 60 ft. below 11th level, no perfect-darkness sight yet", () => {
    const doc = makeOracle(7, "dark_tapestry", ["dark_tapestry:pierceTheVeil"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);
    expect(sheet.senses.some((s) => s.kind === "seeInDarkness")).toBe(false);
  });

  it("adds perfect-darkness sight at 11th level", () => {
    const doc = makeOracle(11, "dark_tapestry", ["dark_tapestry:pierceTheVeil"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);
    expect(sheet.senses.some((s) => s.kind === "seeInDarkness")).toBe(true);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(11, "life", ["dark_tapestry:pierceTheVeil"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.length).toBe(0);
  });
});

describe("promoted revelation: shadow:pierceTheShadows", () => {
  // AoN (shadow mystery): "You gain darkvision 60 feet. If you already have
  // darkvision, increase your existing darkvision by 60 feet instead. At
  // 11th level, you can see perfectly in darkness of any kind..." — modeled
  // with `operator: "add"` (senses.ts), so both halves compute: a human
  // oracle reads 0 + 60, a race with darkvision reads existing + 60 (the
  // additive-sense fixtures in senses.test.ts cover the second half).
  it("grants darkvision 60 ft. to a human oracle below 11th, no perfect-darkness sight yet", () => {
    const doc = makeOracle(7, "shadow", ["shadow:pierceTheShadows"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);
    expect(sheet.senses.some((s) => s.kind === "seeInDarkness")).toBe(false);
  });

  it("adds perfect-darkness sight at 11th level", () => {
    const doc = makeOracle(11, "shadow", ["shadow:pierceTheShadows"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.find((s) => s.kind === "darkvision")?.range).toBe(60);
    expect(sheet.senses.some((s) => s.kind === "seeInDarkness")).toBe(true);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(11, "life", ["shadow:pierceTheShadows"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.length).toBe(0);
  });
});

describe("promoted revelation: outer_rifts:telepathy", () => {
  // AoN (MysteryDisplay.aspx?ItemName=Outer+Rifts): "At 11th level, you can
  // communicate telepathically with any creature within 100 feet that has a
  // language, as per the telepathy ability of demons and angels." Self-gated
  // on the RAW 11th-level minimum (minLevel is soft-filtered only), same
  // posture as spellscar:spellResistance.
  it("grants telepathy 100 ft. at 11th level", () => {
    const doc = makeOracle(11, "outer_rifts", ["outer_rifts:telepathy"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.find((s) => s.kind === "telepathy")?.range).toBe(100);
  });

  it("grants nothing on an off-spec pick below 11th level", () => {
    const doc = makeOracle(7, "outer_rifts", ["outer_rifts:telepathy"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.length).toBe(0);
  });

  it("contributes nothing when picked under the wrong mystery", () => {
    const doc = makeOracle(11, "life", ["outer_rifts:telepathy"]);
    const sheet = compute(doc, ref);
    expect(sheet.senses.length).toBe(0);
  });
});

describe("Solar mystery (Inner Sea Gods)", () => {
  it("surfaces the revelations a 14th-level solar oracle picked", () => {
    // Moeru Tsubasa: tengu oracle 14, solar mystery via the Shigenjo archetype.
    const doc = makeOracle(14, "solar", [
      "solar:astralCaravan",
      "solar:blisteredCaress",
      "solar:luminousForm",
      "solar:starlightAgility",
    ]);
    expect(revelationFeatureNames(doc)).toEqual([
      "Astral Caravan",
      "Blistered Caress",
      "Luminous Form",
      "Starlight Agility",
    ]);
  });

  it("soft-gates the two revelations with a 5th-level minimum", () => {
    expect(ORACLE_REVELATIONS["solar:sunStride"]?.minLevel).toBe(5);
    expect(ORACLE_REVELATIONS["solar:sungazer"]?.minLevel).toBe(5);
    // Everything else in the mystery is selectable from 1st.
    const others = revelationsForMystery("solar").filter(
      (r) => !["solar:sunStride", "solar:sungazer"].includes(r.id),
    );
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves every bonus spell by name to exactly one vendored spell", () => {
    // Solar comes from the `pfdata` catalog, whose prose carries no @UUID
    // spell links — so unlike the APG ten these ids were resolved by name.
    // This pins that each still points at the spell it claims to.
    const solar = ORACLE_MYSTERIES["solar"]!;
    expect(solar.bonusSpells.length).toBe(9);
    for (const bonus of solar.bonusSpells) {
      expect(ref.spells[bonus.id]?.name, bonus.name).toBe(bonus.name);
    }
    expect(solar.bonusSpells.map((b) => b.level)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
  });
});

// Ancestor mystery (Ultimate Magic pg. 53; https://aonprd.com/MysteryDisplay.aspx?ItemName=Ancestor)
describe("ancestor mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("ancestor").length).toBe(10);
  });

  it("Spirit of the Warrior requires 11th level (AoN: 'must be at least 11th level to select this revelation')", () => {
    expect(ORACLE_REVELATIONS["ancestor:spiritOfTheWarrior"]?.minLevel).toBe(11);
  });

  it("Spirit Walk also requires 11th level", () => {
    expect(ORACLE_REVELATIONS["ancestor:spiritWalk"]?.minLevel).toBe(11);
  });

  it("Storm of Souls requires 7th level", () => {
    expect(ORACLE_REVELATIONS["ancestor:stormOfSouls"]?.minLevel).toBe(7);
  });

  it("has a Final Revelation", () => {
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS.ancestor).toBeDefined();
  });

  it("level-2 bonus spell resolves to Unseen Servant in loadRefData()", () => {
    const spell = ORACLE_MYSTERIES.ancestor!.bonusSpells[0]!;
    expect(spell.level).toBe(2);
    expect(ref.spells[spell.id]?.name).toBe("Unseen Servant");
  });

  it("level-12 bonus spell resolves to the name-inverted 'Heroism, Greater' vendored spell", () => {
    const spell = ORACLE_MYSTERIES.ancestor!.bonusSpells.find((s) => s.level === 12)!;
    expect(spell.name).toBe("Greater Heroism");
    expect(ref.spells[spell.id]?.name).toBe("Heroism, Greater");
  });
});

// Apocalypse mystery (Monster Codex pg. 56; https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Apocalypse)
describe("apocalypse mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("apocalypse").length).toBe(10);
  });

  it("Destructive Roots and Doomsayer require 7th level", () => {
    expect(ORACLE_REVELATIONS["apocalypse:destructiveRoots"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["apocalypse:doomsayer"]?.minLevel).toBe(7);
  });

  it("Power of the Fallen requires 5th level", () => {
    expect(ORACLE_REVELATIONS["apocalypse:powerOfTheFallen"]?.minLevel).toBe(5);
  });

  it("has a Final Revelation", () => {
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS.apocalypse).toBeDefined();
  });

  it("level-2 bonus spell resolves to Deathwatch in loadRefData()", () => {
    const spell = ORACLE_MYSTERIES.apocalypse!.bonusSpells[0]!;
    expect(spell.level).toBe(2);
    expect(ref.spells[spell.id]?.name).toBe("Deathwatch");
  });
});

// Ascetic mystery (Villain Codex pg. 104; https://aonprd.com/MysteryDisplay.aspx?ItemName=Ascetic)
// NOTE: unlike every other mystery modeled so far, Ascetic has only 8 revelations
// (both the vendored description and AoN confirm no more exist), not 10 — any
// shared "N mysteries x 10 revelations apiece" assertion elsewhere needs an
// exception for this tag.
describe("ascetic mystery", () => {
  it("has 8 revelations (not the usual 10)", () => {
    expect(revelationsForMystery("ascetic").length).toBe(8);
  });

  it("Oracular Spellstrike requires 7th level", () => {
    expect(ORACLE_REVELATIONS["ascetic:oracularSpellstrike"]?.minLevel).toBe(7);
  });

  it("Spell Deflection requires 11th level", () => {
    expect(ORACLE_REVELATIONS["ascetic:spellDeflection"]?.minLevel).toBe(11);
  });

  it("has a Final Revelation", () => {
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS.ascetic).toBeDefined();
  });

  it("level-2 bonus spell resolves to Stone Fist in loadRefData()", () => {
    const spell = ORACLE_MYSTERIES.ascetic!.bonusSpells[0]!;
    expect(spell.level).toBe(2);
    expect(ref.spells[spell.id]?.name).toBe("Stone Fist");
  });
});

// Dark Tapestry mystery (Ultimate Magic pg. 54; https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Dark+Tapestry)
describe("dark_tapestry mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("dark_tapestry").length).toBe(10);
  });

  it("Dweller in Darkness requires 11th level", () => {
    expect(ORACLE_REVELATIONS["dark_tapestry:dwellerInDarkness"]?.minLevel).toBe(11);
  });

  it("Many Forms requires 3rd level", () => {
    expect(ORACLE_REVELATIONS["dark_tapestry:manyForms"]?.minLevel).toBe(3);
  });

  it("Read the Tapestry and Wings of Darkness require 7th level", () => {
    expect(ORACLE_REVELATIONS["dark_tapestry:readTheTapestry"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["dark_tapestry:wingsOfDarkness"]?.minLevel).toBe(7);
  });

  it("has a Final Revelation", () => {
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS.dark_tapestry).toBeDefined();
  });

  it("level-2 bonus spell resolves to Entropic Shield in loadRefData()", () => {
    const spell = ORACLE_MYSTERIES.dark_tapestry!.bonusSpells[0]!;
    expect(spell.level).toBe(2);
    expect(ref.spells[spell.id]?.name).toBe("Entropic Shield");
  });
});

// Source: https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Dragon (Legacy of Dragons)
describe("Dragon mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("dragon").length).toBe(10);
  });

  it("gates Form of the Dragon behind 11th level ('You must be at least 11th level to select this revelation')", () => {
    expect(ORACLE_REVELATIONS["dragon:formOfTheDragon"]?.minLevel).toBe(11);
    // Scaled Toughness and Wings of the Dragon share the mystery's other stated minimum.
    expect(ORACLE_REVELATIONS["dragon:scaledToughness"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["dragon:wingsOfTheDragon"]?.minLevel).toBe(7);
    // Everything else is selectable from 1st.
    const gated = new Set([
      "dragon:formOfTheDragon",
      "dragon:scaledToughness",
      "dragon:wingsOfTheDragon",
    ]);
    const others = revelationsForMystery("dragon").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (cause fear) to the vendored spell of that name", () => {
    const dragon = ORACLE_MYSTERIES["dragon"]!;
    const bonus = dragon.bonusSpells.find((b) => b.level === 2)!;
    expect(bonus.name).toBe("Cause Fear");
    expect(ref.spells[bonus.id]?.name).toBe("Cause Fear");
  });
});

// Source: https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Elemental (Elemental Master's Handbook)
describe("Elemental mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("elemental").length).toBe(10);
  });

  it("gates Desert Mirage behind 3rd level and Elemental Allies behind 7th level", () => {
    expect(ORACLE_REVELATIONS["elemental:desertMirage"]?.minLevel).toBe(3);
    expect(ORACLE_REVELATIONS["elemental:elementalAllies"]?.minLevel).toBe(7);
    const gated = new Set(["elemental:desertMirage", "elemental:elementalAllies"]);
    const others = revelationsForMystery("elemental").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (endure elements) to the vendored spell of that name", () => {
    const elemental = ORACLE_MYSTERIES["elemental"]!;
    const bonus = elemental.bonusSpells.find((b) => b.level === 2)!;
    expect(bonus.name).toBe("Endure Elements");
    expect(ref.spells[bonus.id]?.name).toBe("Endure Elements");
  });
});

// Source: https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Godclaw (Path of the Hellknight)
describe("Godclaw mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("godclaw").length).toBe(10);
  });

  it("gates Might of the Godclaw behind 3rd level and Iron Order behind 7th level", () => {
    expect(ORACLE_REVELATIONS["godclaw:mightOfTheGodclaw"]?.minLevel).toBe(3);
    expect(ORACLE_REVELATIONS["godclaw:ironOrder"]?.minLevel).toBe(7);
    const gated = new Set(["godclaw:mightOfTheGodclaw", "godclaw:ironOrder"]);
    const others = revelationsForMystery("godclaw").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (cause fear) to the vendored spell of that name", () => {
    const godclaw = ORACLE_MYSTERIES["godclaw"]!;
    const bonus = godclaw.bonusSpells.find((b) => b.level === 2)!;
    expect(bonus.name).toBe("Cause Fear");
    expect(ref.spells[bonus.id]?.name).toBe("Cause Fear");
  });
});

// Source: https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Intrigue (Ultimate Intrigue)
describe("Intrigue mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("intrigue").length).toBe(10);
  });

  it("gates Forgotten Presence, Gossip Guru, and Mirrored Retreat behind 7th level, and Tracer Touch behind 11th", () => {
    expect(ORACLE_REVELATIONS["intrigue:forgottenPresence"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["intrigue:gossipGuru"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["intrigue:mirroredRetreat"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["intrigue:tracerTouch"]?.minLevel).toBe(11);
    const gated = new Set([
      "intrigue:forgottenPresence",
      "intrigue:gossipGuru",
      "intrigue:mirroredRetreat",
      "intrigue:tracerTouch",
    ]);
    const others = revelationsForMystery("intrigue").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (charm person) to the vendored spell of that name", () => {
    const intrigue = ORACLE_MYSTERIES["intrigue"]!;
    const bonus = intrigue.bonusSpells.find((b) => b.level === 2)!;
    expect(bonus.name).toBe("Charm Person");
    expect(ref.spells[bonus.id]?.name).toBe("Charm Person");
  });

  it("resolves the level-14 bonus spell to the vendored 'Scrying, Greater' entry (name-inverted from the prose's 'greater scrying')", () => {
    const intrigue = ORACLE_MYSTERIES["intrigue"]!;
    const bonus = intrigue.bonusSpells.find((b) => b.level === 14)!;
    expect(bonus.name).toBe("Scrying, Greater");
    expect(ref.spells[bonus.id]?.name).toBe("Scrying, Greater");
  });
});

describe("Juju mystery", () => {
  it("has 9 revelations plus a Final Revelation (AoN: aonprd.com/MysteryDisplay.aspx?ItemName=Juju)", () => {
    expect(revelationsForMystery("juju").length).toBe(9);
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS["juju"]).toBeDefined();
  });

  it("gates Night Terror and Path of the Snake at 11th level, Unwilling Host at 7th, Summon Nature's Spirits at 5th", () => {
    expect(ORACLE_REVELATIONS["juju:nightTerror"]?.minLevel).toBe(11);
    expect(ORACLE_REVELATIONS["juju:pathOfTheSnake"]?.minLevel).toBe(11);
    expect(ORACLE_REVELATIONS["juju:unwillingHost"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["juju:summonNaturesSpirits"]?.minLevel).toBe(5);
    // Everything else is selectable from 1st.
    const gated = new Set([
      "juju:nightTerror",
      "juju:pathOfTheSnake",
      "juju:unwillingHost",
      "juju:summonNaturesSpirits",
    ]);
    const others = revelationsForMystery("juju").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (Speak with Animals) against the vendored spell set", () => {
    const juju = ORACLE_MYSTERIES["juju"]!;
    const level2 = juju.bonusSpells.find((b) => b.level === 2)!;
    expect(ref.spells[level2.id]?.name).toBe("Speak with Animals");
  });
});

describe("Lunar mystery", () => {
  it("has 10 revelations plus a Final Revelation (AoN: aonprd.com/MysteryDisplay.aspx?ItemName=Lunar)", () => {
    expect(revelationsForMystery("lunar").length).toBe(10);
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS["lunar"]).toBeDefined();
  });

  it("gates Form of the Beast and Touch of the Moon at 7th level; everything else selectable from 1st", () => {
    expect(ORACLE_REVELATIONS["lunar:formOfTheBeast"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["lunar:touchOfTheMoon"]?.minLevel).toBe(7);
    const gated = new Set(["lunar:formOfTheBeast", "lunar:touchOfTheMoon"]);
    const others = revelationsForMystery("lunar").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (Fumbletongue) against the vendored spell set", () => {
    const lunar = ORACLE_MYSTERIES["lunar"]!;
    const level2 = lunar.bonusSpells.find((b) => b.level === 2)!;
    expect(ref.spells[level2.id]?.name).toBe("Fumbletongue");
  });
});

describe("Metal mystery", () => {
  it("has 10 revelations plus a Final Revelation (AoN: aonprd.com/MysteryDisplay.aspx?ItemName=Metal)", () => {
    expect(revelationsForMystery("metal").length).toBe(10);
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS["metal"]).toBeDefined();
  });

  it("gates Iron Skin at 11th level, Rusting Grasp and Vision in Iron at 7th; everything else from 1st", () => {
    expect(ORACLE_REVELATIONS["metal:ironSkin"]?.minLevel).toBe(11);
    expect(ORACLE_REVELATIONS["metal:rustingGrasp"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["metal:visionInIron"]?.minLevel).toBe(7);
    const gated = new Set(["metal:ironSkin", "metal:rustingGrasp", "metal:visionInIron"]);
    const others = revelationsForMystery("metal").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (Lead Blades) against the vendored spell set", () => {
    const metal = ORACLE_MYSTERIES["metal"]!;
    const level2 = metal.bonusSpells.find((b) => b.level === 2)!;
    expect(ref.spells[level2.id]?.name).toBe("Lead Blades");
  });
});

describe("Occult mystery", () => {
  it("has 10 revelations plus a Final Revelation (AoN: aonprd.com/MysteryDisplay.aspx?ItemName=Occult)", () => {
    expect(revelationsForMystery("occult").length).toBe(10);
    expect(ORACLE_MYSTERY_FINAL_REVELATIONS["occult"]).toBeDefined();
  });

  it("gates Project Psyche and Spirit Walk at 11th level, Shroud of Retribution at 7th; everything else from 1st", () => {
    expect(ORACLE_REVELATIONS["occult:projectPsyche"]?.minLevel).toBe(11);
    expect(ORACLE_REVELATIONS["occult:spiritWalk"]?.minLevel).toBe(11);
    expect(ORACLE_REVELATIONS["occult:shroudOfRetribution"]?.minLevel).toBe(7);
    const gated = new Set([
      "occult:projectPsyche",
      "occult:spiritWalk",
      "occult:shroudOfRetribution",
    ]);
    const others = revelationsForMystery("occult").filter((r) => !gated.has(r.id));
    expect(others.every((r) => r.minLevel === 1)).toBe(true);
  });

  it("resolves the level-2 bonus spell (Unseen Servant) against the vendored spell set", () => {
    const occult = ORACLE_MYSTERIES["occult"]!;
    const level2 = occult.bonusSpells.find((b) => b.level === 2)!;
    expect(ref.spells[level2.id]?.name).toBe("Unseen Servant");
  });
});

// Outer Rifts mystery (Inner Sea Magic pg. 31; https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Outer+Rifts)
describe("Outer Rifts mystery (Inner Sea Magic)", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("outer_rifts").length).toBe(10);
  });

  it("soft-gates Wings of Terror at 7th level", () => {
    // "You must be at least 7th level to select this revelation." (AoN, Wings of Terror)
    expect(ORACLE_REVELATIONS["outer_rifts:wingsOfTerror"]?.minLevel).toBe(7);
  });

  it("resolves the level-2 bonus spell (endure elements) by id", () => {
    // "Bonus Spells: endure elements (2nd), ..." (AoN, Outer Rifts)
    const mystery = ORACLE_MYSTERIES["outer_rifts"]!;
    const level2 = mystery.bonusSpells.find((b) => b.level === 2)!;
    expect(level2.name).toBe("Endure Elements");
    expect(ref.spells[level2.id]?.name).toBe("Endure Elements");
  });
});

// Reaper mystery (Pathfinder #139: The Dead Road[s] pg. 66; https://aonprd.com/MysteryDisplay.aspx?ItemName=Reaper)
describe("Reaper mystery (Pathfinder #139: The Dead Road)", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("reaper").length).toBe(10);
  });

  it("soft-gates Terminal Aura at 11th level", () => {
    // "You must be at least 11th level to select this revelation." (AoN, Terminal Aura)
    expect(ORACLE_REVELATIONS["reaper:terminalAura"]?.minLevel).toBe(11);
  });

  it("resolves the level-2 bonus spell (chill touch) by id", () => {
    // "Bonus Spells: chill touch (2nd), ..." (AoN, Reaper)
    const mystery = ORACLE_MYSTERIES["reaper"]!;
    const level2 = mystery.bonusSpells.find((b) => b.level === 2)!;
    expect(level2.name).toBe("Chill Touch");
    expect(ref.spells[level2.id]?.name).toBe("Chill Touch");
  });
});

// Shadow mystery (Blood of Shadows pg. 12; https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Shadow)
describe("Shadow mystery (Blood of Shadows)", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("shadow").length).toBe(10);
  });

  it("soft-gates Living Shadow at 7th level", () => {
    // "You must be at least 7th level to choose this revelation." (AoN, Living Shadow)
    expect(ORACLE_REVELATIONS["shadow:livingShadow"]?.minLevel).toBe(7);
  });

  it("resolves the level-2 bonus spell (blurred movement) by id", () => {
    // "Bonus Spells: blurred movement (2nd), ..." (AoN, Shadow)
    const mystery = ORACLE_MYSTERIES["shadow"]!;
    const level2 = mystery.bonusSpells.find((b) => b.level === 2)!;
    expect(level2.name).toBe("Blurred Movement");
    expect(ref.spells[level2.id]?.name).toBe("Blurred Movement");
  });
});

// Spellscar mystery (Inner Sea Magic pg. 30; https://www.aonprd.com/MysteryDisplay.aspx?ItemName=Spellscar)
describe("Spellscar mystery (Inner Sea Magic)", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("spellscar").length).toBe(10);
  });

  it("soft-gates Spell Resistance at 11th level", () => {
    // "You must be at least 11th level before selecting this revelation." (AoN, Spell Resistance)
    expect(ORACLE_REVELATIONS["spellscar:spellResistance"]?.minLevel).toBe(11);
  });

  it("resolves the level-2 bonus spell (ray of enfeeblement) by id", () => {
    // "Bonus Spells: ray of enfeeblement (2nd), ..." (AoN, Spellscar)
    const mystery = ORACLE_MYSTERIES["spellscar"]!;
    const level2 = mystery.bonusSpells.find((b) => b.level === 2)!;
    expect(level2.name).toBe("Ray of Enfeeblement");
    expect(ref.spells[level2.id]?.name).toBe("Ray of Enfeeblement");
  });
});

// Source: Advanced Player's Guide via Heroes of the Streets (vendored
// oracle-mysteries.json "streets"); cross-checked against
// https://aonprd.com/MysteryDisplay.aspx?ItemName=Streets (2026-07-28).
describe("streets mystery", () => {
  it("has 9 revelations", () => {
    expect(revelationsForMystery("streets").length).toBe(9);
  });

  it("has no revelation with an elevated minLevel gate — all select at 1st level", () => {
    // Unlike most mysteries, none of Streets's 9 revelations state "you must
    // be at least Xth level to select this revelation" in the source text.
    for (const revelation of revelationsForMystery("streets")) {
      expect(revelation.minLevel, revelation.name).toBe(1);
    }
    expect(ORACLE_REVELATIONS["streets:faceInTheCrowd"]?.minLevel).toBe(1);
  });

  it("resolves the level-2 bonus spell (disguise self) against the vendored spell list", () => {
    const spell = ORACLE_MYSTERIES.streets!.bonusSpells.find((s) => s.level === 2)!;
    expect(spell.id).toBe("oj36nfak6jc2s5ky");
    expect(ref.spells[spell.id]?.name).toBe("Disguise Self");
  });
});

// Source: Healer's Handbook (vendored oracle-mysteries.json "succor");
// cross-checked against https://aonprd.com/MysteryDisplay.aspx?ItemName=Succor
// (2026-07-28).
describe("succor mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("succor").length).toBe(10);
  });

  it("gates Shell of Succor at 3rd level", () => {
    // "You must be at least 3rd level before selecting this revelation."
    expect(ORACLE_REVELATIONS["succor:shellOfSuccor"]?.minLevel).toBe(3);
  });

  it("gates Combat Healer, Curse of Dampening, and Soul Siphon at 7th level", () => {
    expect(ORACLE_REVELATIONS["succor:combatHealer"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["succor:curseOfDampening"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["succor:soulSiphon"]?.minLevel).toBe(7);
  });

  it("resolves the level-2 bonus spell (ray of enfeeblement) against the vendored spell list", () => {
    const spell = ORACLE_MYSTERIES.succor!.bonusSpells.find((s) => s.level === 2)!;
    expect(spell.id).toBe("mczdgwo3xl8c6e26");
    expect(ref.spells[spell.id]?.name).toBe("Ray of Enfeeblement");
  });

  it("resolves the level-8 bonus spell despite the vendored name's comma inversion", () => {
    // Vendored spells.json stores this spell as "Shield of Fortification,
    // Greater" (see oracle-mysteries.ts's doc comment re: "Restoration,
    // Lesser" vs "Lesser Restoration"); the mystery def's `name` field uses
    // the natural reading order, matching that file's existing convention.
    const spell = ORACLE_MYSTERIES.succor!.bonusSpells.find((s) => s.level === 8)!;
    expect(spell.id).toBe("rxenoze8iyh9iyng");
    expect(ref.spells[spell.id]?.name).toBe("Shield of Fortification, Greater");
    expect(spell.name).toBe("Greater Shield of Fortification");
  });
});

// Source: Ultimate Magic (vendored oracle-mysteries.json "time");
// cross-checked against https://aonprd.com/MysteryDisplay.aspx?ItemName=Time
// (2026-07-28).
describe("time mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("time").length).toBe(10);
  });

  it("gates Time Sight at 11th level, its highest minLevel", () => {
    // "You must be at least 11th level to select this revelation."
    expect(ORACLE_REVELATIONS["time:timeSight"]?.minLevel).toBe(11);
  });

  it("gates Rewind Time, Speed or Slow Time, and Time Hop at 7th level, and Time Flicker at 3rd", () => {
    expect(ORACLE_REVELATIONS["time:rewindTime"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["time:speedOrSlowTime"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["time:timeHop"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["time:timeFlicker"]?.minLevel).toBe(3);
  });

  it("resolves the level-2 bonus spell (memory lapse) against the vendored spell list", () => {
    const spell = ORACLE_MYSTERIES.time!.bonusSpells.find((s) => s.level === 2)!;
    expect(spell.id).toBe("5eg2f7nek9cjmv0n");
    expect(ref.spells[spell.id]?.name).toBe("Memory Lapse");
  });
});

// Source: Pathfinder #95, Anvil of Fire (vendored oracle-mysteries.json
// "volcano"); cross-checked against
// https://aonprd.com/MysteryDisplay.aspx?ItemName=Volcano (2026-07-28).
describe("volcano mystery", () => {
  it("has 10 revelations", () => {
    expect(revelationsForMystery("volcano").length).toBe(10);
  });

  it("gates Magma Form and Pyroclastic Shove at 7th level, Lava Walk at 3rd", () => {
    // "You must be at least 7th level to choose/select this revelation."
    expect(ORACLE_REVELATIONS["volcano:magmaForm"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["volcano:pyroclasticShove"]?.minLevel).toBe(7);
    expect(ORACLE_REVELATIONS["volcano:lavaWalk"]?.minLevel).toBe(3);
  });

  it("resolves the level-2 bonus spell (burning hands) against the vendored spell list", () => {
    const spell = ORACLE_MYSTERIES.volcano!.bonusSpells.find((s) => s.level === 2)!;
    expect(spell.id).toBe("lndeaqm2j2nvgm6p");
    expect(ref.spells[spell.id]?.name).toBe("Burning Hands");
  });
});

describe("Whimsy mystery (Legacy of the First World)", () => {
  it("has 10 revelations", () => {
    // aonprd.com/MysteryDisplay.aspx?ItemName=Whimsy — Revelations list.
    expect(revelationsForMystery("whimsy").length).toBe(10);
  });

  it("soft-gates Capricious Misdirection at 7th level", () => {
    // AoN: "You must be at least 7th level to select this revelation."
    expect(ORACLE_REVELATIONS["whimsy:capriciousMisdirection"]?.minLevel).toBe(7);
  });

  it("level-2 bonus spell resolves to Faerie Fire", () => {
    // AoN Bonus Spells: "faerie fire (2nd), ..."
    const whimsy = ORACLE_MYSTERIES["whimsy"]!;
    const levelTwo = whimsy.bonusSpells.find((b) => b.level === 2);
    expect(levelTwo?.name).toBe("Faerie Fire");
    expect(ref.spells[levelTwo!.id]?.name).toBe("Faerie Fire");
  });
});

describe("Winter mystery (People of the North)", () => {
  it("has 10 revelations", () => {
    // aonprd.com/MysteryDisplay.aspx?ItemName=Winter — Revelations list.
    expect(revelationsForMystery("winter").length).toBe(10);
  });

  it("soft-gates Blizzard at 11th level", () => {
    // AoN: "You must be 11th level to select this revelation."
    expect(ORACLE_REVELATIONS["winter:blizzard"]?.minLevel).toBe(11);
  });

  it("level-2 bonus spell resolves to Endure Elements", () => {
    // AoN Bonus Spells: "endure elements (2nd), ..."
    const winter = ORACLE_MYSTERIES["winter"]!;
    const levelTwo = winter.bonusSpells.find((b) => b.level === 2);
    expect(levelTwo?.name).toBe("Endure Elements");
    expect(ref.spells[levelTwo!.id]?.name).toBe("Endure Elements");
  });
});

describe("Wood mystery (Ultimate Magic)", () => {
  it("has 10 revelations", () => {
    // aonprd.com/MysteryDisplay.aspx?ItemName=Wood — Revelations list.
    expect(revelationsForMystery("wood").length).toBe(10);
  });

  it("soft-gates Lignification at 11th level", () => {
    // AoN: "You must be at least 11th level to select this revelation."
    expect(ORACLE_REVELATIONS["wood:lignification"]?.minLevel).toBe(11);
  });

  it("level-2 bonus spell resolves to Shillelagh", () => {
    // AoN Bonus Spells: "shillelagh (2nd), ..."
    const wood = ORACLE_MYSTERIES["wood"]!;
    const levelTwo = wood.bonusSpells.find((b) => b.level === 2);
    expect(levelTwo?.name).toBe("Shillelagh");
    expect(ref.spells[levelTwo!.id]?.name).toBe("Shillelagh");
  });
});

/**
 * Choose-one revelations (`OracleRevelationDef.choice`/`choiceChanges`,
 * stored in `build.pickChoices` — see `rage-powers.ts` for the mechanism's
 * origin): Defy Elements and Elemental Aegis declare their own pick;
 * Draconic Resistance reads the Dragon MYSTERY's associated element
 * (`choiceFromMystery`, key `oracleMystery:dragon`). RAW citations live on
 * the entries; expected values hand-computed from the AoN text quoted there.
 */
describe("choose-one revelations (build.pickChoices)", () => {
  it("Defy Elements: chosen sonic resistance 5 (the five-type list includes sonic)", () => {
    const sheet = compute(
      makeOracle(1, "apocalypse", ["apocalypse:defyElements"], {
        "oracleRevelation:apocalypse:defyElements": "sonic",
      }),
      ref,
    );
    expect(sheet.defenses?.resistances.find((r) => r.qualifier === "sonic")?.total).toBe(5);
  });

  it("Defy Elements: no stored choice applies nothing", () => {
    const sheet = compute(makeOracle(1, "apocalypse", ["apocalypse:defyElements"]), ref);
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Defy Elements: a stale option id applies nothing", () => {
    const sheet = compute(
      makeOracle(1, "apocalypse", ["apocalypse:defyElements"], {
        "oracleRevelation:apocalypse:defyElements": "force",
      }),
      ref,
    );
    expect(sheet.defenses?.resistances ?? []).toEqual([]);
  });

  it("Draconic Resistance: fire mystery pick scales resistance 5/10/20 at 1st/9th/15th", () => {
    // AoN Dragon mystery: resistance 5 → 10 at 9th → 20 at 15th.
    const pick = { "oracleMystery:dragon": "fire" };
    const at1 = compute(makeOracle(1, "dragon", ["dragon:draconicResistance"], pick), ref);
    expect(at1.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(5);
    const at9 = compute(makeOracle(9, "dragon", ["dragon:draconicResistance"], pick), ref);
    expect(at9.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(10);
    const at15 = compute(makeOracle(15, "dragon", ["dragon:draconicResistance"], pick), ref);
    expect(at15.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(20);
  });

  it("Draconic Resistance: natural armor +1/+2/+4 is unconditional (applies with no mystery pick)", () => {
    // AoN Dragon mystery: +1 natural armor → +2 at 9th → +4 at 15th.
    const before = compute(makeOracle(9, "dragon", []), ref);
    const at9 = compute(makeOracle(9, "dragon", ["dragon:draconicResistance"]), ref);
    expect(at9.ac.normal).toBe(before.ac.normal + 2);
    // No stored mystery element → no energy resistance, but the armor half
    // still applies.
    expect(at9.defenses?.resistances ?? []).toEqual([]);
    const at15 = compute(makeOracle(15, "dragon", ["dragon:draconicResistance"]), ref);
    expect(at15.ac.normal).toBe(compute(makeOracle(15, "dragon", []), ref).ac.normal + 4);
  });

  it("Elemental Aegis: the 13th-level boon keys off the chosen element (earth → +2 CMD)", () => {
    const pick = { "oracleRevelation:elemental:elementalAegis": "earth" };
    const at13 = compute(makeOracle(13, "elemental", ["elemental:elementalAegis"], pick), ref);
    const before = compute(makeOracle(13, "elemental", [], pick), ref);
    expect(at13.cmd).toBe(before.cmd + 2);
    // Below 13th the boon hasn't arrived yet (the formula self-gates, since
    // minLevel is soft-filtered only).
    const at12 = compute(makeOracle(12, "elemental", ["elemental:elementalAegis"], pick), ref);
    expect(at12.cmd).toBe(compute(makeOracle(12, "elemental", [], pick), ref).cmd);
  });

  it("Elemental Aegis: air grants +2 Reflex, water +4 Swim, fire resistance 2, all at 13th", () => {
    const air = compute(
      makeOracle(13, "elemental", ["elemental:elementalAegis"], {
        "oracleRevelation:elemental:elementalAegis": "air",
      }),
      ref,
    );
    const baseline = compute(makeOracle(13, "elemental", []), ref);
    expect(air.saves.ref.total).toBe(baseline.saves.ref.total + 2);

    const water = compute(
      makeOracle(13, "elemental", ["elemental:elementalAegis"], {
        "oracleRevelation:elemental:elementalAegis": "water",
      }),
      ref,
    );
    expect(water.skills.swm!.total).toBe(baseline.skills.swm!.total + 4);

    const fire = compute(
      makeOracle(13, "elemental", ["elemental:elementalAegis"], {
        "oracleRevelation:elemental:elementalAegis": "fire",
      }),
      ref,
    );
    expect(fire.defenses?.resistances.find((r) => r.qualifier === "fire")?.total).toBe(2);
  });

  it("the Dragon mystery declares its associated-element choice (acid/cold/electricity/fire)", () => {
    expect(ORACLE_MYSTERIES["dragon"]?.choice?.options.map((o) => o.id)).toEqual([
      "acid",
      "cold",
      "electricity",
      "fire",
    ]);
  });
});
