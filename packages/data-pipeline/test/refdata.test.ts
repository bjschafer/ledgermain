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
    expect(ref.meta.schemaVersion).toBe(6);
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
    expect(Object.keys(ref.classes)).toHaveLength(11); // fighter, barbarian, wizard, cleric, sorcerer, rogue, paladin, ranger, bard, monk, druid
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

describe("cleric domain spell lists (inverted learnedAt.domain)", () => {
  it("emits a non-empty domainSpellLists collection", () => {
    expect(Object.keys(ref.domainSpellLists).length).toBeGreaterThan(0);
    expect(ref.meta.counts.domainSpellLists).toBe(Object.keys(ref.domainSpellLists).length);
  });

  it("every entry is keyed by a domain tag present in some spell's learnedAt.domain", () => {
    const tagsFromSpells = new Set<string>();
    for (const sp of Object.values(ref.spells)) {
      for (const t of Object.keys(sp.learnedAt.domain ?? {})) tagsFromSpells.add(t);
    }
    for (const tag of Object.keys(ref.domainSpellLists)) {
      expect(tagsFromSpells.has(tag)).toBe(true);
    }
  });

  it("every spell id on a domain list actually carries that domain at the level", () => {
    for (const [tag, list] of Object.entries(ref.domainSpellLists)) {
      for (const [lvl, ids] of Object.entries(list)) {
        for (const id of ids) {
          const sp = ref.spells[id];
          expect(sp, `${tag} L${lvl} ${id}`).toBeDefined();
          const lvl2 = sp!.learnedAt.domain?.[tag] ?? sp!.learnedAt.subdomain?.[tag];
          expect(lvl2, `${tag} ${id}`).toBe(Number(lvl));
        }
      }
    }
  });

  it("domain-only spells that no sliced class knows are present in refData.spells", () => {
    // Find a spell whose learnedAt.class has no sliced tag but which carries a
    // domain entry — it must still be in the vendored spells (required for the
    // domain-slot UI to resolve it by id).
    const sliced = new Set(["wizard", "sorcerer", "cleric"]);
    let foundDomainOnly = false;
    for (const sp of Object.values(ref.spells)) {
      const classTags = Object.keys(sp.learnedAt.class);
      const onSliced = classTags.some((t) => sliced.has(t));
      const hasDomain = Object.keys(sp.learnedAt.domain ?? {}).length > 0;
      if (!onSliced && hasDomain) {
        foundDomainOnly = true;
        break;
      }
    }
    expect(foundDomainOnly).toBe(true);
  });
});

describe("cleric domain powers (top-level domains/*.yaml)", () => {
  it("emits ~35 domains (subdomains/druid-domains excluded)", () => {
    expect(Object.keys(ref.domains).length).toBeGreaterThan(30);
    expect(ref.meta.counts.domains).toBe(Object.keys(ref.domains).length);
  });

  it("Fire Domain grants Fire Bolt (level 1) and Fire Resistance (level 6)", () => {
    const fire = byName(ref.domains, "Fire Domain");
    expect(fire.tag).toBe("Fire");
    const byLevel = Object.fromEntries(fire.features.map((f) => [f.name, f.level]));
    expect(byLevel["Fire Bolt"]).toBeLessThanOrEqual(1);
    expect(byLevel["Fire Resistance"]).toBe(6);
  });

  it("every domain tag matches a real domainSpellLists key", () => {
    for (const domain of Object.values(ref.domains)) {
      expect(ref.domainSpellLists[domain.tag]).toBeDefined();
    }
  });

  it("resolved granted powers all map into classFeatures", () => {
    // A handful of domains (Darkness, Rune) grant a bonus FEAT rather than a
    // class-abilities entry (e.g. Blind-Fight) — `links.supplements` points at
    // the `feats` pack, which `resolveFeatureGrants`'s resolver doesn't search,
    // so those come back `resolved: false` (kept, not dropped — same posture
    // as `Class.features`' pre-existing unresolved-link handling).
    let unresolvedCount = 0;
    for (const domain of Object.values(ref.domains)) {
      for (const grant of domain.features) {
        if (!grant.resolved) {
          unresolvedCount++;
          continue;
        }
        expect(ref.classFeatures[grant.featureId], `${domain.name}: ${grant.name}`).toBeDefined();
      }
    }
    expect(unresolvedCount).toBeGreaterThan(0);
  });
});

describe("wizard arcane school powers (top-level wizard-schools/*.yaml)", () => {
  it("emits exactly 9 schools (8 specialist + Universalist)", () => {
    expect(Object.keys(ref.wizardSchools).length).toBe(9);
    expect(ref.meta.counts.wizardSchools).toBe(9);
  });

  it("Evocation School grants Force Missile + Intense Spells (level 1) and Elemental Wall (level 8)", () => {
    const evo = byName(ref.wizardSchools, "Evocation School");
    expect(evo.tag).toBe("evo");
    const byLevel = Object.fromEntries(evo.features.map((f) => [f.name, f.level]));
    expect(byLevel["Force Missile"]).toBeLessThanOrEqual(1);
    expect(byLevel["Intense Spells"]).toBeLessThanOrEqual(1);
    expect(byLevel["Elemental Wall"]).toBe(8);
  });

  it("Universalist School grants Hand of the Apprentice + Metamagic Mastery", () => {
    const uni = byName(ref.wizardSchools, "Universalist School");
    expect(uni.tag).toBe("uni");
    const names = uni.features.map((f) => f.name).sort();
    expect(names).toEqual(["Hand of the Apprentice", "Metamagic Mastery"]);
  });

  it("every granted power resolves into classFeatures", () => {
    for (const school of Object.values(ref.wizardSchools)) {
      for (const grant of school.features) {
        expect(grant.resolved, `${school.name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId]).toBeDefined();
      }
    }
  });
});

describe("sorcerer bloodline spell lists (inverted learnedAt.bloodline)", () => {
  it("emits a non-empty bloodlineSpellLists collection", () => {
    expect(Object.keys(ref.bloodlineSpellLists).length).toBeGreaterThan(0);
    expect(ref.meta.counts.bloodlineSpellLists).toBe(
      Object.keys(ref.bloodlineSpellLists).length,
    );
  });

  it("Draconic contains the expected known 1st-level spell", () => {
    const draconic = ref.bloodlineSpellLists["Draconic"];
    expect(draconic).toBeDefined();
    const l1Ids = draconic![1] ?? [];
    expect(l1Ids.length).toBeGreaterThan(0);
    const names = l1Ids.map((id) => ref.spells[id]?.name);
    expect(names).toContain("Mage Armor");
  });

  it("every entry is keyed by a bloodline tag present in some spell's learnedAt.bloodline", () => {
    const tagsFromSpells = new Set<string>();
    for (const sp of Object.values(ref.spells)) {
      for (const t of Object.keys(sp.learnedAt.bloodline ?? {})) tagsFromSpells.add(t);
    }
    for (const tag of Object.keys(ref.bloodlineSpellLists)) {
      expect(tagsFromSpells.has(tag)).toBe(true);
    }
  });

  it("every spell id on a bloodline list actually carries that bloodline at the level", () => {
    for (const [tag, list] of Object.entries(ref.bloodlineSpellLists)) {
      for (const [lvl, ids] of Object.entries(list)) {
        for (const id of ids) {
          const sp = ref.spells[id];
          expect(sp, `${tag} L${lvl} ${id}`).toBeDefined();
          expect(sp!.learnedAt.bloodline?.[tag], `${tag} ${id}`).toBe(Number(lvl));
        }
      }
    }
  });

  it("bloodline-only spells that no sliced class knows are present in refData.spells", () => {
    // Regression for the keep-filter extension: a spell carrying only a
    // bloodline entry (no sliced class list, no domain) would otherwise be
    // dropped by the slice filter before it could be inverted.
    const sliced = new Set(["wizard", "sorcerer", "cleric"]);
    let foundBloodlineOnly = false;
    for (const sp of Object.values(ref.spells)) {
      const classTags = Object.keys(sp.learnedAt.class);
      const onSliced = classTags.some((t) => sliced.has(t));
      const hasDomain =
        Object.keys(sp.learnedAt.domain ?? {}).length > 0 ||
        Object.keys(sp.learnedAt.subdomain ?? {}).length > 0;
      const hasBloodline = Object.keys(sp.learnedAt.bloodline ?? {}).length > 0;
      if (!onSliced && !hasDomain && hasBloodline) {
        foundBloodlineOnly = true;
        break;
      }
    }
    expect(foundBloodlineOnly).toBe(true);
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

  it("Slow carries operator: set on its speed changes (A3)", () => {
    const slow = byName(ref.buffs, "Slow");
    const landSpeed = slow.changes.find((c) => c.target === "landSpeed");
    expect(landSpeed).toBeDefined();
    expect(landSpeed?.operator).toBe("set");
    // Additive (non-speed) changes on the same buff must NOT pick up an
    // operator — normalizeChanges only carries "set" through.
    const attack = slow.changes.find((c) => c.target === "attack");
    expect(attack?.operator).toBeUndefined();
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
  it("vendors archetypes for all 11 sliced classes", () => {
    const tags = new Set(Object.values(ref.archetypes).map((a) => a.classTag));
    expect(tags).toEqual(
      new Set([
        "fighter",
        "barbarian",
        "wizard",
        "cleric",
        "sorcerer",
        "rogue",
        "paladin",
        "ranger",
        "bard",
        "monk",
        "druid",
      ]),
    );
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
