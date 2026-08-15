/**
 * Hand-computed fixture tests for `TRAIT_CHOICES` (`trait-effects-extracted.ts`)
 * and the `collect.ts`/`traitGrantedClassSkills` consumption it feeds — the
 * trait pick-choice namespace's pilot (Deep Cover) plus the fixed-menu and
 * family-shaped waves that followed.
 *
 * Deep Cover (Pathfinder Society trait): "Bluff or Disguise (your choice) is
 * a class skill for you." The "always take 10 to assume/maintain your cover
 * identity" clause is unconditional but stays vendored `contextNotes` prose
 * (not this table's concern) — only the choose-one class-skill grant is
 * wired here.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveTraitDef, TRAIT_CHOICES } from "../src/index.js";
import { SKILL_ABILITY, skillBaseId } from "../src/tables.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");
const DEEP_COVER = "9QVXtD2lZkIzyBt5";
const PICK_KEY = `trait:${DEEP_COVER}`;

/** Human fighter (no class-skill overlap with Bluff/Disguise), all abilities 10. */
function makeDoc(pickChoices?: Record<string, string>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "trait-choices-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "fighter", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      traits: [DEEP_COVER],
      pickChoices,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Deep Cover: Bluff-or-Disguise class-skill pick", () => {
  it("no stored pick: neither Bluff nor Disguise is a class skill from this trait", () => {
    const sheet = compute(makeDoc(), ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("a stale option id grants nothing", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "int" }), ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("Bluff pick: Bluff becomes a class skill, Disguise does not", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "blf" }), ref);
    expect(sheet.skills.blf!.classSkill).toBe(true);
    expect(sheet.skills.dis!.classSkill).toBe(false);
  });

  it("Disguise pick: Disguise becomes a class skill, Bluff does not", () => {
    const sheet = compute(makeDoc({ [PICK_KEY]: "dis" }), ref);
    expect(sheet.skills.dis!.classSkill).toBe(true);
    expect(sheet.skills.blf!.classSkill).toBe(false);
  });

  it("Bluff pick with 1 rank: the usual +3 class-skill bonus applies", () => {
    const doc = makeDoc({ [PICK_KEY]: "blf" });
    const withRank: CharacterDoc = {
      ...doc,
      build: { ...doc.build, skillRanks: { blf: 1 } },
    };
    const sheet = compute(withRank, ref);
    expect(sheet.skills.blf!.classSkillBonus).toBe(3);
  });

  it("without the trait taken at all, a stray pick under its key still grants nothing", () => {
    const doc = makeDoc({ [PICK_KEY]: "blf" });
    const withoutTrait: CharacterDoc = { ...doc, build: { ...doc.build, traits: [] } };
    const sheet = compute(withoutTrait, ref);
    expect(sheet.skills.blf!.classSkill).toBe(false);
  });
});

/**
 * Structural sanity over the WHOLE `TRAIT_CHOICES` table (not just the
 * fixtures below) — catches a typo'd option id, an unknown skill target, or
 * an unrecognized family before it ships silently broken. Mirrors
 * `traitEffectsExtracted.test.ts`'s sweep-wide checks for
 * `TRAIT_EFFECTS_EXTRACTED`.
 */
describe("TRAIT_CHOICES: structural sanity", () => {
  const entries = Object.entries(TRAIT_CHOICES);

  it("every entry keys a resolvable trait id", () => {
    for (const [id] of entries) {
      expect(resolveTraitDef(id, ref), `unknown trait id ${id}`).toBeDefined();
    }
  });

  it("fixed-menu choiceClassSkills/choiceChanges keys are declared options", () => {
    for (const [id, entry] of entries) {
      if (!("options" in entry.choice)) continue;
      const known = new Set(entry.choice.options.map((o) => o.id));
      for (const key of Object.keys(entry.choiceClassSkills ?? {})) {
        expect(
          known.has(key),
          `${id}: choiceClassSkills key "${key}" isn't a declared option`,
        ).toBe(true);
      }
      for (const key of Object.keys(entry.choiceChanges ?? {})) {
        expect(known.has(key), `${id}: choiceChanges key "${key}" isn't a declared option`).toBe(
          true,
        );
      }
    }
  });

  it("fixed-menu skill targets and classSkills resolve to known skill ids", () => {
    for (const [id, entry] of entries) {
      if (!("options" in entry.choice)) continue;
      for (const grants of Object.values(entry.choiceClassSkills ?? {})) {
        for (const s of grants) {
          expect(
            SKILL_ABILITY[skillBaseId(s)],
            `${id}: unknown classSkill id "${s}"`,
          ).toBeDefined();
        }
      }
      for (const changes of Object.values(entry.choiceChanges ?? {})) {
        for (const ch of changes) {
          if (!ch.target.startsWith("skill.")) continue;
          const skillId = ch.target.slice("skill.".length);
          expect(
            SKILL_ABILITY[skillBaseId(skillId)],
            `${id}: unknown skill target "${ch.target}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it("family-shaped choices only use the craft/perform/profession vocabulary and declare a template", () => {
    const validFamilies = new Set(["craft", "perform", "profession"]);
    for (const [id, entry] of entries) {
      if (!("families" in entry.choice)) continue;
      expect(entry.choice.families.length, `${id}: empty families list`).toBeGreaterThan(0);
      for (const f of entry.choice.families) {
        expect(validFamilies.has(f), `${id}: unknown family "${f}"`).toBe(true);
      }
      expect(
        entry.familyChangeTemplate ?? entry.familyClassSkillTemplate,
        `${id}: family choice with neither a change nor a class-skill template`,
      ).toBeDefined();
    }
  });
});

describe("fixed-menu trait choices: bonus + class skill on either option", () => {
  // Antiquities Smuggler (Osirion): "Choose one of the following skills:
  // Appraise, Bluff, or Sleight of Hand. You gain a +1 trait bonus on that
  // skill, and it is always a class skill for you."
  const ANTIQUITIES_SMUGGLER = "tcVTjbd9IzRKoB8c";

  it("no stored pick: nothing granted", () => {
    const doc = makeDoc();
    doc.build.traits = [ANTIQUITIES_SMUGGLER];
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(false);
    expect(sheet.skills.apr!.miscMod).toBe(0);
  });

  it("Appraise pick: +1 trait bonus and class skill on Appraise only", () => {
    const doc = makeDoc({ [`trait:${ANTIQUITIES_SMUGGLER}`]: "apr" });
    doc.build.traits = [ANTIQUITIES_SMUGGLER];
    const sheet = compute(doc, ref);
    expect(sheet.skills.apr!.classSkill).toBe(true);
    expect(sheet.skills.apr!.miscMod).toBe(1);
    expect(sheet.skills.blf!.classSkill).toBe(false);
    expect(sheet.skills.slt!.classSkill).toBe(false);
  });
});

describe("fixed-menu trait choices: class skill only (bonus stays scoped/prose)", () => {
  // Ancient Historian (Scarab Sages): "Choose either Knowledge (history) or
  // Linguistics. That skill becomes a class skill for you..."
  const ANCIENT_HISTORIAN = "HF99WVZ2z8QpQ55n";

  it("Linguistics pick: class skill only, no flat bonus (none published)", () => {
    const doc = makeDoc({ [`trait:${ANCIENT_HISTORIAN}`]: "lin" });
    doc.build.traits = [ANCIENT_HISTORIAN];
    const sheet = compute(doc, ref);
    expect(sheet.skills.lin!.classSkill).toBe(true);
    expect(sheet.skills.lin!.miscMod).toBe(0);
    expect(sheet.skills.khi!.classSkill).toBe(false);
  });
});

describe("fixed-menu trait choices: bonus only (no class-skill grant in the text)", () => {
  // Athletic (Ruins of Azlant): "...you gain a +1 trait bonus to one of these
  // three skills [Acrobatics, Climb, Swim], chosen when you take this
  // trait." (the ACP-reduction clause stays prose, see TRAIT_PROMOTION_BLOCKERS)
  const ATHLETIC = "vu5DPmp9Rhtsv4L7";

  // Acrobatics (unlike Climb/Swim) isn't a fighter class skill, so this
  // isolates the trait's bonus from any class-granted class-skill status.
  it("Acrobatics pick: +1 trait bonus, no class-skill grant", () => {
    const doc = makeDoc({ [`trait:${ATHLETIC}`]: "acr" });
    doc.build.traits = [ATHLETIC];
    const sheet = compute(doc, ref);
    expect(sheet.skills.acr!.miscMod).toBe(1);
    expect(sheet.skills.acr!.classSkill).toBe(false);
    expect(sheet.skills.clm!.miscMod).toBe(0);
  });
});

describe("fixed-menu trait choices: the Knowledge-10 menu", () => {
  // Secret Knowledge (Norgorber): "...you may choose one Knowledge skill. You
  // gain a permanent +2 trait bonus on checks with that skill, and it is a
  // class skill for you."
  const SECRET_KNOWLEDGE = "OGSwFuCBoB2ouaw7";

  it("Knowledge (planes) pick: +2 trait bonus and class skill, only on that subtype", () => {
    const doc = makeDoc({ [`trait:${SECRET_KNOWLEDGE}`]: "kpl" });
    doc.build.traits = [SECRET_KNOWLEDGE];
    const sheet = compute(doc, ref);
    expect(sheet.skills.kpl!.classSkill).toBe(true);
    expect(sheet.skills.kpl!.miscMod).toBe(2);
    expect(sheet.skills.kar!.classSkill).toBe(false);
    expect(sheet.skills.kar!.miscMod).toBe(0);
  });
});

describe("fixed-menu trait choices: branching options with DIFFERENT benefit shapes", () => {
  // Drug Addict (Curse of the Crimson Throne): "Addicted Friend" grants a +1
  // Knowledge (local) trait bonus + class skill; "Personal Addiction" grants
  // a flat +1 Fortitude save bonus instead — hand-authored since the two
  // options aren't uniform.
  const DRUG_ADDICT = "ox1UTgNrZAGHFm6C";

  it("Addicted Friend: Knowledge (local) class skill + bonus, no save bonus", () => {
    const doc = makeDoc({ [`trait:${DRUG_ADDICT}`]: "addicted-friend" });
    doc.build.traits = [DRUG_ADDICT];
    const withPick = compute(doc, ref);
    expect(withPick.skills.klo!.classSkill).toBe(true);
    expect(withPick.skills.klo!.miscMod).toBe(1);

    const baseline = compute({ ...doc, build: { ...doc.build, pickChoices: undefined } }, ref);
    expect(withPick.saves.fort.total).toBe(baseline.saves.fort.total);
  });

  it("Personal Addiction: +1 Fortitude save, no Knowledge (local) grant", () => {
    const doc = makeDoc({ [`trait:${DRUG_ADDICT}`]: "personal-addiction" });
    doc.build.traits = [DRUG_ADDICT];
    const withPick = compute(doc, ref);
    const baseline = compute({ ...doc, build: { ...doc.build, pickChoices: undefined } }, ref);
    expect(withPick.saves.fort.total).toBe(baseline.saves.fort.total + 1);
    expect(withPick.skills.klo!.classSkill).toBe(false);
    expect(withPick.skills.klo!.miscMod).toBe(0);
  });

  // Missing Child (Curse of the Crimson Throne): "Missing Sibling" grants
  // Diplomacy AND Sense Motive as class skills with no flat bonus; "Missing
  // Son or Daughter" grants a flat +1 Will save instead.
  const MISSING_CHILD = "17mo4Jjxp01HsKnN";

  it("Missing Sibling: both Diplomacy and Sense Motive become class skills", () => {
    const doc = makeDoc({ [`trait:${MISSING_CHILD}`]: "missing-sibling" });
    doc.build.traits = [MISSING_CHILD];
    const sheet = compute(doc, ref);
    expect(sheet.skills.dip!.classSkill).toBe(true);
    expect(sheet.skills.sen!.classSkill).toBe(true);
  });

  it("Missing Son or Daughter: +1 Will save, no class-skill grant", () => {
    const doc = makeDoc({ [`trait:${MISSING_CHILD}`]: "missing-child" });
    doc.build.traits = [MISSING_CHILD];
    const withPick = compute(doc, ref);
    const baseline = compute({ ...doc, build: { ...doc.build, pickChoices: undefined } }, ref);
    expect(withPick.saves.will.total).toBe(baseline.saves.will.total + 1);
    expect(withPick.skills.dip!.classSkill).toBe(false);
    expect(withPick.skills.sen!.classSkill).toBe(false);
  });
});

describe("family-shaped trait choices: own Craft/Perform/Profession instance", () => {
  // Clan Artisan (Xa Hoi): "Pick one Craft skill. You gain a +2 trait bonus
  // on checks with that skill, and it becomes a class skill for you."
  const CLAN_ARTISAN = "JxJr7ofe0yC95eDJ";

  it("no stored pick: nothing granted", () => {
    const doc = makeDoc();
    doc.build.traits = [CLAN_ARTISAN];
    const sheet = compute(doc, ref);
    expect(sheet.skills["crf.alchemy"]).toBeUndefined();
  });

  it("crf.alchemy pick: +2 trait bonus and class skill on exactly that instance", () => {
    const doc = makeDoc({ [`trait:${CLAN_ARTISAN}`]: "crf.alchemy" });
    doc.build.traits = [CLAN_ARTISAN];
    const sheet = compute(doc, ref);
    expect(sheet.skills["crf.alchemy"]!.classSkill).toBe(true);
    expect(sheet.skills["crf.alchemy"]!.miscMod).toBe(2);
  });

  it("only the picked instance gets the grant, not any other Craft instance", () => {
    const doc = makeDoc({ [`trait:${CLAN_ARTISAN}`]: "crf.traps" });
    doc.build.traits = [CLAN_ARTISAN];
    const sheet = compute(doc, ref);
    expect(sheet.skills["crf.traps"]!.classSkill).toBe(true);
    expect(sheet.skills["crf.alchemy"]).toBeUndefined();
  });
});

describe("family-shaped trait choices: bonus only, no class-skill grant", () => {
  // Eager Performer (Rise of the Runelords): "You gain a +1 trait bonus on
  // checks for any one Perform skill." (the enchantment spell-DC bonus stays
  // prose, no modeled target)
  const EAGER_PERFORMER = "yAJ5AiuQ7VjXcE57";

  it("prf.sing pick: +1 trait bonus, no class-skill grant", () => {
    const doc = makeDoc({ [`trait:${EAGER_PERFORMER}`]: "prf.sing" });
    doc.build.traits = [EAGER_PERFORMER];
    const sheet = compute(doc, ref);
    expect(sheet.skills["prf.sing"]!.miscMod).toBe(1);
    expect(sheet.skills["prf.sing"]!.classSkill).toBe(false);
  });
});

describe("family-shaped trait choices: multi-family combo", () => {
  // Tattooed Focus (Human; Varisian): "Choose a Craft, Perform, or
  // Profession skill. You gain a +2 trait bonus on checks with that skill,
  // and it is always a class skill for you."
  const TATTOOED_FOCUS = "Y99VFesddmNwLMaq";

  it("a Profession instance pick works the same as a Craft/Perform one", () => {
    const doc = makeDoc({ [`trait:${TATTOOED_FOCUS}`]: "pro.sailor" });
    doc.build.traits = [TATTOOED_FOCUS];
    const sheet = compute(doc, ref);
    expect(sheet.skills["pro.sailor"]!.classSkill).toBe(true);
    expect(sheet.skills["pro.sailor"]!.miscMod).toBe(2);
  });
});
