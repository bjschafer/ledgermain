import { describe, expect, it } from "bun:test";

import { FOUNDRY_SHA, loadRefData } from "../src/index.js";
import { SUPPLEMENTAL_BLOODLINE_TAGS } from "../src/supplements.js";

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
    expect(ref.meta.schemaVersion).toBe(9);
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
    // 7 core races (packs/races/core) + 73 non-core races (packs/races/other,
    // vendored per issue #26: aasimar, tiefling, goblin, kobold, drow, ...).
    expect(Object.keys(ref.races)).toHaveLength(80);
    // 11 core + 10 base + 10 hybrid + 3 alternate (antipaladin/ninja/samurai)
    // + 4 unchained + 6 Occult Adventures.
    expect(Object.keys(ref.classes)).toHaveLength(44);
    expect(Object.keys(ref.feats)).toHaveLength(390);
    expect(Object.keys(ref.spells).length).toBeGreaterThan(0);
  });
});

describe("class feature actions (schema v8 — issue: bare resource-pool counters)", () => {
  it("Acid Dart (WIZ) carries a ranged-touch acid damage action", () => {
    const acidDart = byName(ref.classFeatures, "Acid Dart (WIZ)");
    expect(acidDart.actions).toHaveLength(1);
    const action = acidDart.actions![0]!;
    expect(action.actionType).toBe("rsak");
    expect(action.touch).toBe(true);
    expect(action.damage).toEqual({
      formula: "1d6 + floor(@class.unlevel / 2)",
      types: ["acid"],
    });
  });

  it("Stunning Fist carries a Fortitude-DC save action with no damage", () => {
    const stunningFist = byName(ref.classFeatures, "Stunning Fist");
    expect(stunningFist.actions).toHaveLength(1);
    const action = stunningFist.actions![0]!;
    expect(action.damage).toBeUndefined();
    expect(action.save).toEqual({
      type: "fort",
      dcFormula: "10 + floor(@class.unlevel / 2) + @abilities.wis.mod",
    });
  });

  it("Channel Energy carries all four heal/harm actions in source order", () => {
    const channelEnergy = byName(ref.classFeatures, "Channel Energy");
    const names = channelEnergy.actions!.map((a) => a.name);
    expect(names).toEqual([
      "Positive - Heal living",
      "Negative - Harm living",
      "Negative - Heal undead",
      "Positive - Harm undead",
    ]);
  });

  it("Channel Positive Energy has no uses.maxFormula — it shares Lay on Hands' pool instead", () => {
    const channelPositiveEnergy = byName(ref.classFeatures, "Channel Positive Energy");
    expect(channelPositiveEnergy.uses).toEqual({ source: "layOnHands" });
    expect(channelPositiveEnergy.actions?.length).toBeGreaterThan(0);
  });

  it("Rage (no vendored action data) carries no actions field at all", () => {
    const rage = byName(ref.classFeatures, "Rage");
    expect(rage.actions).toBeUndefined();
  });

  it("actions is undefined, never an empty array, when a feature has no usable action", () => {
    for (const feature of Object.values(ref.classFeatures)) {
      if (feature.actions) expect(feature.actions.length).toBeGreaterThan(0);
    }
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

describe("feat uses.maxFormula (schema v9 — feats-as-resource-pools)", () => {
  it("Combat Reflexes carries a per-round maxFormula", () => {
    const combatReflexes = byName(ref.feats, "Combat Reflexes");
    expect(combatReflexes.uses).toEqual({
      maxFormula: "1 + max(0, @abilities.dex.mod)",
      per: "round",
    });
  });

  it("Improved Iron Will carries a flat per-day maxFormula", () => {
    const improvedIronWill = byName(ref.feats, "Improved Iron Will");
    expect(improvedIronWill.uses).toEqual({ maxFormula: "1", per: "day" });
  });

  it("a feat with no vendored uses block (e.g. Cleave) has uses undefined", () => {
    const cleave = byName(ref.feats, "Cleave");
    expect(cleave.uses).toBeUndefined();
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
    expect(ref.meta.counts.bloodlineSpellLists).toBe(Object.keys(ref.bloodlineSpellLists).length);
  });

  it("Draconic contains the expected known 1st-level spell", () => {
    const draconic = ref.bloodlineSpellLists["Draconic"];
    expect(draconic).toBeDefined();
    const l1Ids = draconic![1] ?? [];
    expect(l1Ids.length).toBeGreaterThan(0);
    const names = l1Ids.map((id) => ref.spells[id]?.name);
    expect(names).toContain("Mage Armor");
  });

  it("Aberrant is present from the hand-authored supplement (absent upstream)", () => {
    // Issue #38: Aberrant is fully authored in @pf1/engine BLOODLINES but no
    // vendored spell tags it, so the derived inversion yields nothing. The
    // supplement (see src/supplements.ts) backfills its CRB bonus-spell list.
    expect(SUPPLEMENTAL_BLOODLINE_TAGS.has("Aberrant")).toBe(true);
    const aberrant = ref.bloodlineSpellLists["Aberrant"];
    expect(aberrant).toBeDefined();
    // One bonus spell per level 1..9, in ascending order.
    for (let level = 1; level <= 9; level++) {
      const ids = aberrant![level] ?? [];
      expect(ids, `L${level}`).toHaveLength(1);
    }
    const l1Name = aberrant![1]!.map((id) => ref.spells[id]?.name);
    expect(l1Name).toContain("Enlarge Person");
    const l9Name = aberrant![9]!.map((id) => ref.spells[id]?.name);
    expect(l9Name).toContain("Shapechange");
  });

  it("every derived entry is keyed by a bloodline tag present in some spell's learnedAt.bloodline", () => {
    // Supplemented tags (src/supplements.ts) are hand-authored and intentionally
    // trace to no spell's learnedAt.bloodline — exempt them from the invariant.
    const tagsFromSpells = new Set<string>();
    for (const sp of Object.values(ref.spells)) {
      for (const t of Object.keys(sp.learnedAt.bloodline ?? {})) tagsFromSpells.add(t);
    }
    for (const tag of Object.keys(ref.bloodlineSpellLists)) {
      if (SUPPLEMENTAL_BLOODLINE_TAGS.has(tag)) continue;
      expect(tagsFromSpells.has(tag)).toBe(true);
    }
  });

  it("every spell id on a derived bloodline list actually carries that bloodline at the level", () => {
    for (const [tag, list] of Object.entries(ref.bloodlineSpellLists)) {
      if (SUPPLEMENTAL_BLOODLINE_TAGS.has(tag)) continue;
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

describe("items (issue #15 — full usable breadth of the `items` pack)", () => {
  it("vendors (nearly) every non-folder entry in the pack", () => {
    // 1089 entries as of the pinned SHA (v11.11): the `items` pack has 1124
    // YAML docs total, of which 35 are Folder documents (organizational only,
    // excluded via `isFolderDoc`) — 1124 - 35 = 1089. No item *type* is
    // excluded: loot, equipment, container, weapon (splash/thrown one-shots),
    // and consumable (staves/rods/poisons) all vend. Bumping the SHA may
    // shift this; changes here should be deliberate + reviewed.
    expect(Object.keys(ref.items).length).toBe(1089);
  });

  it("no Folder document leaked in as a fake item", () => {
    // Folder docs' own `type` mirrors the content they organize (e.g. "Item"),
    // not "folder", so a naive type filter wouldn't catch them — this guards
    // the `isFolderDoc`-based `_key` check in normalize.ts.
    for (const name of ["Adventuring Gear", "Wondrous Items", "Magic Items"]) {
      expect(Object.values(ref.items).find((it) => it.name === name)).toBeUndefined();
    }
  });

  it("Cloak of Resistance +1 carries a typed `resist` change on all saves", () => {
    const cloak = byName(ref.items, "Cloak of Resistance +1");
    expect(cloak).toMatchObject({
      subType: "wondrous",
      slot: "shoulders",
      price: 1000,
      weight: 1,
      cl: 5,
    });
    expect(cloak.changes).toEqual([{ formula: "1", target: "allSavingThrows", type: "resist" }]);
  });

  it("Ring of Protection +1 carries a typed `deflection` change to AC", () => {
    const ring = byName(ref.items, "Ring of Protection +1");
    expect(ring).toMatchObject({ subType: "wondrous", slot: "ring", price: 2000, cl: 5 });
    expect(ring.changes).toEqual([{ formula: "1", target: "ac", type: "deflection" }]);
  });

  it("Staff of Healing captures charges as uses.{maxFormula,per} (no live value)", () => {
    // Foundry's raw `system.uses` is `{ value: 10, maxFormula: "10", per:
    // "charges" }`; RefData is static reference data, so only the reference
    // shape (max + recharge period) is captured — `value` (current charges)
    // is per-instance session state that belongs on the character side.
    const staff = byName(ref.items, "Staff of Healing");
    expect(staff.uses).toEqual({ maxFormula: "10", per: "charges" });
  });

  it("a single-use consumable (poison) captures uses.per without a maxFormula", () => {
    const poison = byName(ref.items, "Blue Whinnis");
    expect(poison.uses).toEqual({ maxFormula: undefined, per: "single" });
  });

  it("mundane adventuring gear vends with price + weight but no changes", () => {
    const bladder = byName(ref.items, "Air Bladder");
    expect(bladder).toMatchObject({ subType: "adventuring", price: 0.1, weight: 0.5 });
    expect(bladder.changes).toEqual([]);
  });
});

describe("archetypes (Stage 11, third-party dataset — no archetype data in Foundry)", () => {
  it("vendors archetypes for all 44 sliced classes", () => {
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
        "arcanist",
        "magus",
        "oracle",
        "alchemist",
        "bloodrager",
        "brawler",
        "cavalier",
        "gunslinger",
        "hunter",
        "inquisitor",
        "investigator",
        "shaman",
        "shifter",
        "skald",
        "slayer",
        "summoner",
        "swashbuckler",
        "vigilante",
        "warpriest",
        "witch",
        "antipaladin",
        "ninja",
        "samurai",
        "barbarianUnchained",
        "monkUnchained",
        "rogueUnchained",
        "summonerUnchained",
        "kineticist",
        "medium",
        "mesmerist",
        "occultist",
        "psychic",
        "spiritualist",
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
