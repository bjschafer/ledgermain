import { describe, expect, it } from "bun:test";

import { FOUNDRY_SHA, loadRefData } from "../src/index.js";

/**
 * These tests assert known PF1 facts against the vendored normalized data. They
 * read the committed `data/` output (no network / no Foundry clone needed), so
 * they double as a regression guard whenever the pinned SHA is bumped.
 */
const ref = loadRefData();

function classByTag(tag: string) {
  const cls = Object.values(ref.classes).find((c) => c.tag === tag);
  if (!cls) throw new Error(`class not found: ${tag}`);
  return cls;
}

function byName<T extends { name: string }>(rec: Record<string, T>, name: string) {
  const found = Object.values(rec).find((e) => e.name === name);
  if (!found) throw new Error(`entity not found: ${name}`);
  return found;
}

describe("metadata + provenance", () => {
  it("is generated from the pinned source SHA", () => {
    expect(ref.meta.sourceSha).toBe(FOUNDRY_SHA);
    expect(ref.meta.systemVersion).toBe("11.11");
    expect(ref.meta.schemaVersion).toBe(3);
  });

  it("records a content hash for every emitted file", () => {
    expect(Object.keys(ref.meta.hashes).length).toBeGreaterThan(0);
    for (const hash of Object.values(ref.meta.hashes)) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("includes hashes for the new armors + weapons files", () => {
    expect(ref.meta.hashes["armors.json"]).toBeDefined();
    expect(ref.meta.hashes["weapons.json"]).toBeDefined();
  });

  it("has the archetype collections wired", () => {
    expect(ref.meta.hashes["archetypes.json"]).toBeDefined();
    expect(ref.meta.hashes["archetype-features.json"]).toBeDefined();
    expect(Object.keys(ref.archetypes).length).toBeGreaterThan(0);
    expect(Object.keys(ref.archetypeFeatures).length).toBeGreaterThan(0);
  });

  it("contains the expected slice", () => {
    expect(Object.keys(ref.races)).toHaveLength(7);
    expect(Object.keys(ref.classes)).toHaveLength(5); // fighter, barbarian, wizard, cleric, sorcerer
    expect(Object.keys(ref.feats)).toHaveLength(390);
    expect(Object.keys(ref.spells).length).toBeGreaterThan(0);
  });
});

describe("classes + resolved feature links", () => {
  it("barbarian has high BAB and good Fort saves", () => {
    const barb = classByTag("barbarian");
    expect(barb.bab).toBe("high");
    expect(barb.saves.fort).toBe("high");
    expect(barb.saves.ref).toBe("low");
    expect(barb.hd).toBe(12);
  });

  it("barbarian gains Rage at level 1 via a resolved supplement link", () => {
    const barb = classByTag("barbarian");
    const rage = barb.features.find((f) => f.name === "Rage");
    expect(rage).toBeDefined();
    expect(rage?.level).toBe(1);
    expect(rage?.resolved).toBe(true);

    // The resolved feature exists with its uses formula intact.
    const feature = ref.classFeatures[rage!.featureId];
    expect(feature?.name).toBe("Rage");
    expect(feature?.uses?.maxFormula).toContain("@abilities.con.mod");
  });

  it("every selected class fully resolves its feature links", () => {
    for (const cls of Object.values(ref.classes)) {
      for (const f of cls.features) {
        expect(f.resolved, `${cls.tag}: ${f.uuid}`).toBe(true);
      }
    }
  });
});

describe("feat prerequisites (hybrid parse)", () => {
  it("Cleave requires Power Attack as a structured feat prereq", () => {
    const cleave = byName(ref.feats, "Cleave");
    const names = cleave.prerequisites.feats.map((f) => f.name);
    expect(names).toContain("Power Attack");
    // The referenced id resolves to a real feat in the dataset.
    const ref0 = cleave.prerequisites.feats.find((f) => f.name === "Power Attack");
    expect(ref.feats[ref0!.id]?.name).toBe("Power Attack");
  });

  it("Cleave parses Str 13 and BAB +1, and retains raw prereq text", () => {
    const cleave = byName(ref.feats, "Cleave");
    expect(cleave.prerequisites.abilities).toContainEqual({
      ability: "str",
      min: 13,
    });
    expect(cleave.prerequisites.bab).toBe(1);
    expect(cleave.prerequisites.prereqText).toContain("base attack bonus +1");
  });
});

describe("wizard spell list (inverted learnedAt.class)", () => {
  it("Fireball is a wizard level-3 spell", () => {
    const fireball = byName(ref.spells, "Fireball");
    expect(fireball.learnedAt.class.wizard).toBe(3);
    expect(ref.spellLists.wizard![3]).toContain(fireball.id);
  });

  it("preserves the damage formula DSL for the engine", () => {
    const fireball = byName(ref.spells, "Fireball");
    const part = fireball.actions[0]?.damage?.parts[0];
    expect(part?.formula).toBe("(min(10, @cl))d6");
    expect(part?.types).toContain("fire");
    expect(fireball.actions[0]?.save?.type).toBe("ref");
  });

  it("every spell on the wizard list actually lists wizard in learnedAt", () => {
    for (const [, ids] of Object.entries(ref.spellLists.wizard!)) {
      for (const id of ids) {
        expect(ref.spells[id]?.learnedAt.class.wizard).toBeTypeOf("number");
      }
    }
  });
});

describe("typed-modifier data (engine input)", () => {
  it("Bless carries a +1 morale bonus to attack", () => {
    const bless = byName(ref.buffs, "Bless");
    const change = bless.changes.find((c) => c.target === "attack");
    expect(change).toMatchObject({ formula: "1", type: "morale" });
  });

  it("Elf has racial ability changes", () => {
    const elf = byName(ref.races, "Elf");
    const dex = elf.changes.find((c) => c.target === "dex");
    expect(dex).toMatchObject({ formula: "2", type: "racial" });
  });
});

describe("mundane armor & shields (new in schema v2)", () => {
  it("vendors the expected mundane slice (no named magical suits)", () => {
    // 62 entries as of the pinned SHA (v11.11). Bumping the SHA may shift this;
    // changes here should be deliberate + reviewed.
    expect(Object.keys(ref.armors).length).toBe(62);
  });

  it("Full Plate is a heavy body armor with AC 9 / max Dex 1 / ACP 6", () => {
    const fp = byName(ref.armors, "Full Plate");
    expect(fp).toMatchObject({
      slot: "armor",
      ac: 9,
      maxDex: 1,
      acp: 6,
      weightClass: 3,
      proficiency: "heavyArmor",
    });
  });

  it("Buckler is a shield (no weight class; slot identifies it)", () => {
    const b = byName(ref.armors, "Buckler");
    expect(b).toMatchObject({ slot: "shield", ac: 1, acp: 1 });
    expect(b.weightClass).toBeUndefined();
  });

  it("no mundane armor carries an enhancement/aura/masterwork marker", () => {
    // `armors.json` was filtered upstream to mundane-only; this guards regressions
    // in the filter (a magical entry would still pass as an ArmorRef).
    for (const a of Object.values(ref.armors)) {
      // magic gear lives in RefData.items; if it leaked here, counts would jump.
      expect(["armor", "shield"]).toContain(a.slot);
    }
  });
});

describe("mundane weapons (new in schema v2)", () => {
  it("vendors the expected mundane slice (no named magical weapons, no ammo)", () => {
    // 340 entries as of the pinned SHA (v11.11). Includes simple/martial/exotic
    // (firearms & exotic melee count as mundane exotic in PF1).
    expect(Object.keys(ref.weapons).length).toBe(340);
  });

  it("Longsword is martial, melee, crit 19/×2, damage 1d8, group 'longsword'", () => {
    const ls = byName(ref.weapons, "Longsword");
    expect(ls).toMatchObject({
      proficiency: "martial",
      category: "melee",
      attackAbility: "str",
      damageAbility: "str",
      critRange: 19,
      critMult: 2,
      damageDice: "1d8",
      group: "longsword",
      weaponSubtype: "1h",
    });
  });

  it("Greatsword is a two-handed weapon with damageMultiplier 1.5", () => {
    const gs = byName(ref.weapons, "Greatsword");
    expect(gs).toMatchObject({
      damageDice: "2d6",
      damageMultiplier: 1.5,
      weaponSubtype: "2h",
    });
  });

  it("Composite Longbow is ranged, dex-attack, STR-to-damage", () => {
    const cl = byName(ref.weapons, "Composite Longbow");
    expect(cl).toMatchObject({
      category: "ranged",
      attackAbility: "dex",
      damageAbility: "str",
      damageDice: "1d8",
      critRange: 20,
      critMult: 3,
      group: "longbow",
    });
  });

  it("every mundane weapon has a (slugified) group derived from baseTypes", () => {
    for (const w of Object.values(ref.weapons)) {
      expect(w.group).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("archetypes (Stage 11, third-party dataset — no archetype data in Foundry)", () => {
  it("vendors archetypes for all 5 sliced classes", () => {
    const tags = new Set(Object.values(ref.archetypes).map((a) => a.classTag));
    expect(tags).toEqual(new Set(["fighter", "barbarian", "wizard", "cleric", "sorcerer"]));
  });

  it("every archetype feature points back to a real archetype of the same class", () => {
    for (const f of Object.values(ref.archetypeFeatures)) {
      const parent = ref.archetypes[f.archetypeId];
      expect(parent).toBeDefined();
      expect(parent?.classTag).toBe(f.classTag);
    }
  });

  it("Two-Handed Fighter's swapped features pair to the correct base-class grants", () => {
    const fighter = classByTag("fighter");
    const thf = byName(ref.archetypes, "Two-Handed Fighter");
    const byLevel = new Map(
      Object.values(ref.archetypeFeatures)
        .filter((f) => f.archetypeId === thf.id)
        .map((f) => [f.level, f] as const),
    );

    const bravery = fighter.features.find((f) => f.name === "Bravery")!;
    expect(byLevel.get(2)).toMatchObject({
      name: "Shattering Strike",
      pairedBaseFeatureUuid: bravery.uuid,
    });

    const armorTraining = fighter.features.find((f) => f.name === "Armor Training")!;
    expect(byLevel.get(3)).toMatchObject({
      name: "Overhand Chop",
      pairedBaseFeatureUuid: armorTraining.uuid,
    });

    const weaponTraining = fighter.features.find((f) => f.name === "Weapon Training")!;
    expect(byLevel.get(5)).toMatchObject({
      name: "Weapon Training",
      pairedBaseFeatureUuid: weaponTraining.uuid,
    });

    // 11th/15th/19th level features have no base-fighter grant in our slice to
    // pair against (Stage 1 collapsed Weapon/Armor Training into single
    // grants) — correctly left unpaired rather than guessed.
    expect(byLevel.get(11)?.pairedBaseFeatureUuid).toBeUndefined();
  });

  it("doesn't auto-pair ambiguous multi-feature levels (cleric's entire kit sits at level 1)", () => {
    for (const f of Object.values(ref.archetypeFeatures)) {
      if (f.classTag === "cleric") expect(f.pairedBaseFeatureUuid).toBeUndefined();
    }
  });

  it("doesn't auto-pair Bonus Feat slots even when otherwise unambiguous", () => {
    const wizard = classByTag("wizard");
    const bonusFeats = wizard.features.find((f) => f.name === "Bonus Feats (WIZ)")!;
    for (const f of Object.values(ref.archetypeFeatures)) {
      expect(f.pairedBaseFeatureUuid).not.toBe(bonusFeats.uuid);
    }
  });
});
