/**
 * Hand-checked fixture tests for what a character's own weapons overcome for
 * damage reduction.
 *
 * Expected values come from the published rules:
 *   - CRB, "Damage Reduction" (Overcoming DR): a +1 or higher enhancement
 *     bonus counts as magic (masterwork does not); the table there gives +3
 *     for cold iron/silver, +4 for adamantine (with the footnote that this
 *     does NOT bypass hardness the way real adamantine does), +5 for
 *     alignment-based DR.
 *   - CRB, Special Materials: adamantine, cold iron and alchemical silver
 *     each answer their own DR; mithral counts as silver.
 *   - CRB, Monk (Ki Pool): magic 4th, cold iron/silver 7th, lawful 10th,
 *     adamantine 16th. Unchained monk's pool starts at 3rd instead.
 *   - ACG, Brawler (Brawler's Strike): magic 5th, cold iron/silver 9th, one
 *     chosen alignment 12th, adamantine 17th.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { UNARMED_STRIKE_GROUP, compute, weaponDrBypasses } from "../src/index.js";

const ref = loadRefData();

const humanId =
  Object.entries(ref.races).find(([, r]) => r.name === "Human")?.[0] ??
  (() => {
    throw new Error("Human race not found in ref data");
  })();

function makeDoc(
  classes: CharacterDoc["identity"]["classes"],
  weapons: WeaponInstance[] = [],
  build: Partial<CharacterDoc["build"]> = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "dr-bypass-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: humanId, classes },
    abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons,
      ...build,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

const longsword: WeaponInstance = {
  name: "Longsword",
  attackAbility: "str",
  damageDice: "1d8",
  group: "longsword",
  category: "melee",
};

const unarmed: WeaponInstance = {
  name: "Unarmed Strike",
  attackAbility: "str",
  damageDice: "1d6",
  group: UNARMED_STRIKE_GROUP,
  category: "melee",
};

/** Just the qualifiers, in the order the sheet will list them. */
function qualifiers(doc: CharacterDoc, w: WeaponInstance): string[] {
  return weaponDrBypasses(doc, ref, w).map((b) => b.qualifier);
}

describe("DR bypass: plain and masterwork weapons", () => {
  it("a plain steel longsword bypasses nothing", () => {
    expect(qualifiers(makeDoc([{ tag: "fighter", level: 5 }]), longsword)).toEqual([]);
  });

  it("masterwork alone is not magic", () => {
    const doc = makeDoc([{ tag: "fighter", level: 5 }]);
    expect(qualifiers(doc, { ...longsword, masterwork: true })).toEqual([]);
  });
});

describe("DR bypass: enhancement bonus", () => {
  const doc = makeDoc([{ tag: "fighter", level: 20 }]);

  it("+1 counts as magic and nothing else", () => {
    expect(qualifiers(doc, { ...longsword, enhancement: 1 })).toEqual(["magic"]);
  });

  it("+2 is still only magic", () => {
    expect(qualifiers(doc, { ...longsword, enhancement: 2 })).toEqual(["magic"]);
  });

  it("+3 adds cold iron and silver", () => {
    expect(qualifiers(doc, { ...longsword, enhancement: 3 })).toEqual([
      "cold-iron",
      "silver",
      "magic",
    ]);
  });

  it("+4 adds adamantine, but not its hardness bypass", () => {
    const bypasses = weaponDrBypasses(doc, ref, { ...longsword, enhancement: 4 });
    const adamantine = bypasses.find((b) => b.qualifier === "adamantine");
    expect(adamantine?.sources).toEqual(["+4 enhancement"]);
    expect(adamantine?.hardness).toBeUndefined();
  });

  it("+5 adds all four alignment components", () => {
    expect(qualifiers(doc, { ...longsword, enhancement: 5 })).toEqual([
      "adamantine",
      "cold-iron",
      "silver",
      "magic",
      "chaotic",
      "evil",
      "good",
      "lawful",
    ]);
  });
});

describe("DR bypass: special materials", () => {
  const doc = makeDoc([{ tag: "fighter", level: 5 }]);

  it("cold iron answers DR/cold iron with no plus at all", () => {
    expect(qualifiers(doc, { ...longsword, material: "cold-iron" })).toEqual(["cold-iron"]);
  });

  it("adamantine bypasses hardness too", () => {
    const [adamantine] = weaponDrBypasses(doc, ref, { ...longsword, material: "adamantine" });
    expect(adamantine?.qualifier).toBe("adamantine");
    expect(adamantine?.hardness).toBe(true);
  });

  it("mithral counts as silver, not as its own qualifier", () => {
    const [silver] = weaponDrBypasses(doc, ref, { ...longsword, material: "mithral" });
    expect(silver?.qualifier).toBe("silver");
    expect(silver?.sources).toEqual(["Mithral"]);
  });

  it("darkwood and steel carry no DR bearing", () => {
    expect(qualifiers(doc, { ...longsword, material: "steel" })).toEqual([]);
    expect(qualifiers(doc, { ...longsword, material: "darkwood" })).toEqual([]);
  });

  it("a material and a plus that name the same qualifier merge into one entry", () => {
    const bypasses = weaponDrBypasses(doc, ref, {
      ...longsword,
      material: "cold-iron",
      enhancement: 3,
    });
    const coldIron = bypasses.filter((b) => b.qualifier === "cold-iron");
    expect(coldIron).toHaveLength(1);
    expect(coldIron[0]?.sources).toEqual(["Cold iron", "+3 enhancement"]);
  });
});

describe("DR bypass: alignment weapon abilities", () => {
  const doc = makeDoc([{ tag: "fighter", level: 10 }]);

  it("holy makes the weapon good", () => {
    expect(qualifiers(doc, { ...longsword, enhancement: 2, abilities: ["holy"] })).toEqual([
      "magic",
      "good",
    ]);
  });

  it("a vendored ability id resolves the same as the curated one", () => {
    const bypasses = weaponDrBypasses(doc, ref, {
      ...longsword,
      enhancement: 2,
      abilities: ["ability:anarchic"],
    });
    expect(bypasses.find((b) => b.qualifier === "chaotic")?.sources).toEqual(["Anarchic"]);
  });
});

describe("DR bypass: monk ki strike", () => {
  it("a 3rd-level monk's fists bypass nothing yet", () => {
    expect(qualifiers(makeDoc([{ tag: "monk", level: 3 }], [unarmed]), unarmed)).toEqual([]);
  });

  it("magic at 4th, and only while ki remains", () => {
    const doc = makeDoc([{ tag: "monk", level: 4 }], [unarmed]);
    const [magic] = weaponDrBypasses(doc, ref, unarmed);
    expect(magic?.qualifier).toBe("magic");
    expect(magic?.sources).toEqual(["Monk 4"]);
    expect(magic?.condition).toBe("while you have at least 1 ki point");
  });

  it("cold iron and silver at 7th, lawful at 10th, adamantine at 16th", () => {
    expect(qualifiers(makeDoc([{ tag: "monk", level: 7 }], [unarmed]), unarmed)).toEqual([
      "cold-iron",
      "silver",
      "magic",
    ]);
    expect(qualifiers(makeDoc([{ tag: "monk", level: 10 }], [unarmed]), unarmed)).toEqual([
      "cold-iron",
      "silver",
      "magic",
      "lawful",
    ]);
    const sixteen = weaponDrBypasses(
      makeDoc([{ tag: "monk", level: 16 }], [unarmed]),
      ref,
      unarmed,
    );
    expect(sixteen.find((b) => b.qualifier === "adamantine")?.hardness).toBe(true);
  });

  it("the Unchained monk's pool starts a level earlier", () => {
    expect(qualifiers(makeDoc([{ tag: "monkUnchained", level: 3 }], [unarmed]), unarmed)).toEqual([
      "magic",
    ]);
  });

  it("ki strike does not reach a held weapon", () => {
    const doc = makeDoc([{ tag: "monk", level: 16 }], [longsword]);
    expect(qualifiers(doc, longsword)).toEqual([]);
  });

  it("an amulet's enhancement bonus makes the magic bypass unconditional", () => {
    const doc = makeDoc([{ tag: "monk", level: 4 }], [unarmed]);
    const [magic] = weaponDrBypasses(doc, ref, { ...unarmed, enhancement: 1 });
    expect(magic?.qualifier).toBe("magic");
    expect(magic?.sources).toEqual(["+1 enhancement", "Monk 4"]);
    expect(magic?.condition).toBeUndefined();
  });
});

describe("DR bypass: brawler's strike", () => {
  it("magic at 5th, cold iron and silver at 9th", () => {
    expect(qualifiers(makeDoc([{ tag: "brawler", level: 5 }], [unarmed]), unarmed)).toEqual([
      "magic",
    ]);
    expect(qualifiers(makeDoc([{ tag: "brawler", level: 9 }], [unarmed]), unarmed)).toEqual([
      "cold-iron",
      "silver",
      "magic",
    ]);
  });

  it("carries no ki condition", () => {
    const doc = makeDoc([{ tag: "brawler", level: 5 }], [unarmed]);
    expect(weaponDrBypasses(doc, ref, unarmed)[0]?.condition).toBeUndefined();
  });

  it("the 12th-level alignment applies only once chosen", () => {
    const unchosen = makeDoc([{ tag: "brawler", level: 12 }], [unarmed]);
    expect(qualifiers(unchosen, unarmed)).toEqual(["cold-iron", "silver", "magic"]);

    const chosen = makeDoc([{ tag: "brawler", level: 12 }], [unarmed], {
      brawlerStrikeAlignment: "lawful",
    });
    expect(qualifiers(chosen, unarmed)).toEqual(["cold-iron", "silver", "magic", "lawful"]);
  });

  it("a chosen alignment below 12th level does nothing", () => {
    const doc = makeDoc([{ tag: "brawler", level: 11 }], [unarmed], {
      brawlerStrikeAlignment: "good",
    });
    expect(qualifiers(doc, unarmed)).toEqual(["cold-iron", "silver", "magic"]);
  });
});

describe("DR bypass: multiclass and archetype interaction", () => {
  it("monk and brawler levels each read their own table rather than summing", () => {
    // Monk 4 grants magic; brawler 4 is a level short of Brawler's Strike, and
    // the two do not add up to a 7th-level cold iron/silver tier.
    const doc = makeDoc(
      [
        { tag: "monk", level: 4 },
        { tag: "brawler", level: 4 },
      ],
      [unarmed],
    );
    expect(qualifiers(doc, unarmed)).toEqual(["magic"]);
  });

  it("an archetype that trades the ki pool away takes ki strike with it", () => {
    const martialArtist = Object.entries(ref.archetypes).find(
      ([, a]) => a.name === "Martial Artist",
    )?.[0];
    expect(martialArtist).toBeDefined();
    const doc = makeDoc([{ tag: "monk", level: 16 }], [unarmed], {
      archetypes: [martialArtist as string],
    });
    expect(qualifiers(doc, unarmed)).toEqual([]);
  });
});

describe("DR bypass: on the derived sheet", () => {
  it("compute puts the list on the weapon's attack line", () => {
    const doc = makeDoc([{ tag: "monk", level: 10 }], [unarmed, { ...longsword, enhancement: 1 }]);
    const sheet = compute(doc, ref);
    expect(sheet.attacks[0]?.drBypass?.map((b) => b.qualifier)).toEqual([
      "cold-iron",
      "silver",
      "magic",
      "lawful",
    ]);
    expect(sheet.attacks[1]?.drBypass?.map((b) => b.qualifier)).toEqual(["magic"]);
  });

  it("a weapon that bypasses nothing carries no field at all", () => {
    const sheet = compute(makeDoc([{ tag: "fighter", level: 1 }], [longsword]), ref);
    expect(sheet.attacks[0]?.drBypass).toBeUndefined();
  });
});
