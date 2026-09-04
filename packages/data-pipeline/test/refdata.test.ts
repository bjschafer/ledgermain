import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { SUPPLEMENTAL_BLOODLINE_TAGS, SUPPLEMENTAL_ITEMS } from "../src/supplements.js";

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

// Provenance (every pin vs. its constant, schemaVersion, dataVersion) lives in
// pinIntegrity.test.ts.

describe("metadata + provenance", () => {
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
    // vendored: aasimar, tiefling, goblin, kobold, drow,...).
    expect(Object.keys(ref.races)).toHaveLength(80);
    // 11 core + 10 base + 10 hybrid + 3 alternate (antipaladin/ninja/samurai)
    // + 4 unchained + 6 Occult Adventures + 11 hand-authored prestige classes
    // (the CRB ten — Arcane Archer, Arcane Trickster, Assassin, Dragon
    // Disciple, Duelist, Eldritch Knight, Loremaster, Mystic Theurge,
    // Pathfinder Chronicler, Shadowdancer — plus Student of War from the
    // Adventurer's Guide. Foundry ships no prestige classes at all) + 108
    // vendored prestige classes (the remaining splatbook prestige classes from
    // the same third-party archetype module, see
    // `vendoredPrestigeClasses.test.ts`).
    expect(Object.keys(ref.classes)).toHaveLength(163);
    // 390 system-pack feats + ~3,150 merged in from the community pf1-content
    // module (390 + 3,251 - 77 name collisions - 1 internal dupe; see
    // config.ts's PF_CONTENT_REPO and normalize.ts's feats merge).
    expect(Object.keys(ref.feats)).toHaveLength(3563);
    // 1,998 pf-traits YAML files, deduped by normalized name within the pack
    // itself (no system-pack traits exist to prefer).
    expect(Object.keys(ref.traits)).toHaveLength(1981);
    expect(Object.keys(ref.spells).length).toBeGreaterThan(0);
  });
});

describe("trait catalog (pf1-content pf-traits pack, issue #74)", () => {
  function traitByName(name: string) {
    const found = Object.values(ref.traits).find((t) => t.name === name);
    if (!found) throw new Error(`trait not found: ${name}`);
    return found;
  }

  it("records a content hash for the new traits file", () => {
    expect(ref.meta.hashes["traits.json"]).toBeDefined();
  });

  it("Reactionary carries the same structured Change as the hand-authored engine table", () => {
    const trait = traitByName("Reactionary");
    expect(trait.traitType).toBe("combat");
    expect(trait.changes).toEqual([{ formula: "2", target: "init", type: "trait" }]);
  });

  it("Anxious (a drawback) carries an untyped penalty, not a trait bonus", () => {
    const trait = traitByName("Anxious");
    expect(trait.traitType).toBe("drawback");
    expect(trait.changes).toEqual([{ formula: "-2", target: "skill.dip", type: "untyped" }]);
  });

  it("a limited-use trait (A Sure Thing (Silver Crusade)) carries uses.maxFormula/per", () => {
    const trait = traitByName("A Sure Thing (Silver Crusade)");
    expect(trait.uses).toEqual({ maxFormula: "1", per: "day" });
  });

  it("a trait's description resolves @UUID enrichers the same way a feat's does", () => {
    const trait = traitByName("Reactionary");
    expect(trait.description).not.toContain("@UUID");
  });

  it("every traitType observed in the source data survives normalization", () => {
    const types = new Set(Object.values(ref.traits).map((t) => t.traitType));
    for (const expected of ["combat", "faith", "magic", "social", "drawback", "region", "race"]) {
      expect(types.has(expected)).toBe(true);
    }
  });
});

describe("alternate racial traits (issue #74 — pf1-content pf-racial-traits pack)", () => {
  it("emits only alternates and heritage variants (the pack's ~1,000 standard-trait entries are dropped)", () => {
    expect(Object.keys(ref.racialTraits).length).toBe(860);
    expect(ref.meta.counts.racialTraits).toBe(860);
  });

  it("Goblin's own 'Skilled' standard trait is NOT vendored here (already in races.json)", () => {
    // Regression guard for the standard-vs-alternate classifier: this entry
    // has no "Replaced Trait(s)" header, and its +4 Ride/Stealth bonus is
    // already baked into the Goblin race doc's own `changes`.
    expect(
      Object.values(ref.racialTraits).find((t) => t.name === "Skilled (Goblin)"),
    ).toBeUndefined();
    const goblin = byName(ref.races, "Goblin");
    expect(goblin.changes.find((c) => c.target === "skill.rid")).toMatchObject({ formula: "4" });
  });

  it("Granite Skin (Oread) is an alternate: structured change + replaced-trait name", () => {
    const graniteSkin = byName(ref.racialTraits, "Granite Skin");
    expect(graniteSkin.race).toEqual(["Oread"]);
    expect(graniteSkin.replacedTraitNames).toEqual(["Energy Resistance"]);
    expect(graniteSkin.changes).toEqual([{ formula: "1", target: "nac", type: "racial" }]);
  });

  it("a heritage-specific entry carries both its base race and heritage tags", () => {
    const drowHeritage = byName(ref.racialTraits, "Drow Heritage");
    expect(drowHeritage.race).toEqual(["Half-Elf", "Darkborn"]);
    expect(drowHeritage.heritage).toBe("Darkborn");
  });

  it("keeps a heritage variant that carries no 'Replaced Trait(s)' header (issue #102)", () => {
    // Plumekith's *see invisibility* stands in for the base aasimar's
    // *daylight*, but the source only says so in prose — the heritage tag is
    // the structured signal. Safe to vendor because races.json carries the
    // BASE aasimar only, so this can't double-apply.
    const plumekith = byName(ref.racialTraits, "Spell-Like Ability (Aasimar - Plumekith)");
    expect(plumekith.heritage).toBe("Plumekith");
    expect(plumekith.replacedTraitNames).toEqual([]);
    expect(plumekith.uses).toEqual({ maxFormula: "1", per: "day" });
  });

  it("Elf Blood's 'counts as' tag set is not mistaken for a heritage (issue #102)", () => {
    // `["Half-Elf", "Elf", "Human"]` — later tags name races, so it's a
    // standard trait, and standard traits stay dropped.
    expect(Object.values(ref.racialTraits).find((t) => t.name === "Elf Blood")).toBeUndefined();
  });

  it("every entry is either an alternate (replacedTraitNames) or a heritage variant", () => {
    for (const t of Object.values(ref.racialTraits)) {
      expect(t.replacedTraitNames.length > 0 || t.heritage !== undefined, t.name).toBe(true);
    }
  });

  it("reads all four punctuation variants of the 'Replaced Trait(s)' header (issue #102)", () => {
    // Singular "Trait", colon inside the <strong>, a name the source
    // italicized, and a name written as a @UUID link — each was dropped or
    // mangled by the original header regex.
    expect(
      byName(ref.racialTraits, "Change Shape (Skinwalker - Coldborn)").replacedTraitNames,
    ).toEqual(["Change Shape (Skinwalker)"]);
    expect(
      byName(ref.racialTraits, "Hag Racial Trait (Changeling - Waker May)").replacedTraitNames,
    ).toEqual(["Hag Racial Trait (Changeling)"]);
    expect(byName(ref.racialTraits, "Blood Enmity").replacedTraitNames).toEqual([
      "Invisibility Spell-Like Ability",
    ]);
    expect(
      byName(ref.racialTraits, "Alternate Skill Modifiers (Dhampir - Svetocher)")
        .replacedTraitNames,
    ).toEqual(["Manipulative"]);
  });

  it("keeps a 'choose one' change untargeted in openChanges, out of changes (issue #102)", () => {
    const kindredRaised = byName(ref.racialTraits, "Kindred-Raised");
    expect(kindredRaised.changes).toEqual([{ formula: "2", target: "cha", type: "untyped" }]);
    expect(kindredRaised.openChanges).toEqual([{ formula: "2", target: "", type: "untyped" }]);
    // Two blanks, both open: "select 2 different ability scores".
    expect(byName(ref.racialTraits, "Dual Talent").openChanges).toHaveLength(2);
  });

  it("covers races well beyond the 8 hand-authored in @pf1/engine's RACIAL_TRAITS", () => {
    const raceTags = new Set(Object.values(ref.racialTraits).flatMap((t) => t.race));
    for (const race of ["Oread", "Tiefling", "Aasimar", "Hobgoblin", "Kobold"]) {
      expect(raceTags.has(race)).toBe(true);
    }
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
    // Resolved via Cleric's own grant, not `byName` — vendors several
    // splatbook prestige classes with their own same-named "Channel Energy"
    // feature (name collisions across classes are expected and not deduped,
    // see `prestigeClasses.ts`), so a bare name lookup is no longer guaranteed
    // to land on the Cleric's class-abilities one.
    const cleric = Object.values(ref.classes).find((c) => c.tag === "cleric")!;
    const grant = cleric.features.find((f) => f.name === "Channel Energy")!;
    const channelEnergy = ref.classFeatures[grant.featureId]!;
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

describe("spell casting time (activation, issue #85)", () => {
  it("Magic Missile is a standard action", () => {
    expect(byName(ref.spells, "Magic Missile").actions[0]?.activation).toEqual({
      type: "standard",
      cost: undefined,
    });
  });

  it("Feather Fall is an immediate action", () => {
    expect(byName(ref.spells, "Feather Fall").actions[0]?.activation).toEqual({
      type: "immediate",
      cost: undefined,
    });
  });

  it("Summon Monster I takes 1 round (cost undefined -> 1)", () => {
    expect(byName(ref.spells, "Summon Monster I").actions[0]?.activation).toEqual({
      type: "round",
      cost: undefined,
    });
  });

  it("Alpha Instinct carries an explicit cost multiplier (10 minutes)", () => {
    expect(byName(ref.spells, "Alpha Instinct").actions[0]?.activation).toEqual({
      type: "minute",
      cost: 10,
    });
  });

  it("every spell has activation data on at least one action", () => {
    for (const spell of Object.values(ref.spells)) {
      expect(
        spell.actions.some((a) => a.activation?.type),
        spell.name,
      ).toBe(true);
    }
  });
});

describe("multi-projectile count supplement (hand-authored @cl formulas)", () => {
  it("attaches projectileCount to the multi-projectile spells", () => {
    // The `damage.parts` formula stays the flat per-hit dice; the count rides
    // in `projectileCount` (a @cl-keyed formula, resolved at display time).
    expect(byName(ref.spells, "Magic Missile").projectileCount).toBe(
      "min(5, max(1, 1 + floor((@cl - 1) / 2)))",
    );
    expect(byName(ref.spells, "Scorching Ray").projectileCount).toBe(
      "min(3, max(1, 1 + floor((@cl - 3) / 4)))",
    );
    // The vendored per-hit formula is untouched.
    expect(byName(ref.spells, "Magic Missile").actions[0]?.damage?.parts[0]?.formula).toBe("1d4+1");
  });

  it("leaves single-instance spells without a projectileCount", () => {
    expect(byName(ref.spells, "Fireball").projectileCount).toBeUndefined();
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
          const lvl2 = sp!.learnedAt.domain?.[tag];
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

  it("vendors the doc-level system.changes a handful of domains carry (issue #99)", () => {
    // Protection's save resistance, Travel's +10 speed, Darkness/Rune's bonus
    // feat — the direct `changes` block, distinct from the `links.supplements`
    // power grants above. Everything else has an empty `changes`.
    expect(byName(ref.domains, "Protection Domain").changes).toEqual([
      { formula: "1 + floor(@class.unlevel / 5)", target: "allSavingThrows", type: "resist" },
    ]);
    expect(byName(ref.domains, "Travel Domain").changes).toEqual([
      { formula: "10", target: "landSpeed", type: "base" },
    ]);
    expect(byName(ref.domains, "Darkness Domain").changes).toEqual([
      { formula: "1", target: "bonusFeats", type: "untyped" },
    ]);
    expect(byName(ref.domains, "Fire Domain").changes).toEqual([]);
  });

  it("every domain granted-power grant maps into classFeatures", () => {
    // A handful of domains (Darkness, Rune) grant a bonus FEAT rather than a
    // class-abilities entry (e.g. Blind-Fight) — `links.supplements` points at
    // the `feats` pack, which `resolveFeatureGrants`'s resolver doesn't search,
    // so those come back `resolved: false` upstream. Unlike `Class.features`
    // (which keeps an unresolved link so nothing vendored is silently
    // dropped), `transformDomain` filters them out entirely: the grant's
    // `name` is a raw compendium uuid, never player-facing, and the actual
    // bonus is already surfaced through the domain's own `changes`.
    for (const domain of Object.values(ref.domains)) {
      for (const grant of domain.features) {
        expect(grant.resolved, `${domain.name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId], `${domain.name}: ${grant.name}`).toBeDefined();
      }
    }
  });

  it("Darkness/Rune's unresolved bonus-feat link never appears in a domain or subdomain's granted-power list", () => {
    for (const domain of Object.values(ref.domains)) {
      expect(domain.features.some((f) => f.name.startsWith("Compendium."))).toBe(false);
    }
    for (const sub of Object.values(ref.subdomains)) {
      expect(sub.features.some((f) => f.name.startsWith("Compendium."))).toBe(false);
    }
  });

  it("Destruction domain grants both Destructive Smite (1st) and the hand-authored Destructive Aura (8th)", () => {
    const destruction = byName(ref.domains, "Destruction Domain");
    const byLevel = Object.fromEntries(destruction.features.map((f) => [f.name, f.level]));
    expect(byLevel["Destructive Smite"]).toBe(0);
    expect(byLevel["Destructive Aura"]).toBe(8);
  });

  it("Catastrophe/Hatred/Rage subdomains displace Destructive Aura, not Destructive Smite", () => {
    for (const name of ["Catastrophe Subdomain", "Hatred Subdomain", "Rage Subdomain"]) {
      const sub = byName(ref.subdomains, name);
      const powerNames = sub.features.map((f) => f.name);
      expect(powerNames, name).toContain("Destructive Smite");
      expect(powerNames, name).not.toContain("Destructive Aura");
    }
    // Torture replaces Destructive Smite instead, so it keeps Destructive Aura.
    const torture = byName(ref.subdomains, "Torture Subdomain");
    const tortureNames = torture.features.map((f) => f.name);
    expect(tortureNames).toContain("Destructive Aura");
    expect(tortureNames).not.toContain("Destructive Smite");
  });

  it("Glory domain grants the hand-authored Channel Boost preamble alongside Touch of Glory and Divine Presence", () => {
    const glory = byName(ref.domains, "Glory Domain");
    const byLevel = Object.fromEntries(glory.features.map((f) => [f.name, f.level]));
    expect(byLevel["Channel Boost"]).toBe(0);
    expect(byLevel["Touch of Glory"]).toBe(0);
    expect(byLevel["Divine Presence"]).toBe(8);
  });

  it("Hubris/Legend subdomains displace Channel Boost; Chivalry/Heroism/Honor keep it", () => {
    for (const name of ["Hubris Subdomain", "Legend Subdomain"]) {
      const sub = byName(ref.subdomains, name);
      expect(
        sub.features.map((f) => f.name),
        name,
      ).not.toContain("Channel Boost");
    }
    for (const name of ["Chivalry Subdomain", "Heroism Subdomain", "Honor Subdomain"]) {
      const sub = byName(ref.subdomains, name);
      expect(
        sub.features.map((f) => f.name),
        name,
      ).toContain("Channel Boost");
    }
  });
});

describe("wizard arcane school powers (wizard-schools/*.yaml + elemental-schools/*.yaml)", () => {
  it("emits exactly 17 schools (8 specialist + Universalist + 8 elemental)", () => {
    expect(Object.keys(ref.wizardSchools).length).toBe(17);
    expect(ref.meta.counts.wizardSchools).toBe(17);
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

  it("the 8 elemental schools carry an ElementalSchoolTag and their own granted powers", () => {
    const elementalTags = [
      "air-elemental",
      "earth-elemental",
      "fire-elemental",
      "water-elemental",
      "wood-elemental",
      "metal-elemental",
      "void-elemental",
      "aether-elemental",
    ];
    for (const tag of elementalTags) {
      const school = Object.values(ref.wizardSchools).find((s) => s.tag === tag);
      expect(school, tag).toBeDefined();
      expect(school!.features.length).toBeGreaterThan(0);
    }
  });

  it("every elemental school parses its opposition options; only the standard schools have none", () => {
    for (const school of Object.values(ref.wizardSchools)) {
      const isElemental = school.tag.endsWith("-elemental");
      if (!isElemental) {
        expect(school.oppositionOptions, school.name).toBeUndefined();
        continue;
      }
      expect(school.oppositionOptions?.length, school.name).toBeGreaterThan(0);
      for (const opt of school.oppositionOptions!) {
        expect(
          Object.values(ref.wizardSchools).some((s) => s.tag === opt),
          opt,
        ).toBe(true);
      }
    }
    const byTag = (tag: string) => Object.values(ref.wizardSchools).find((s) => s.tag === tag)!;
    // A fixed single opposite, a source-dependent pair, and the four-way pick.
    expect(byTag("air-elemental").oppositionOptions).toEqual(["earth-elemental"]);
    expect(byTag("earth-elemental").oppositionOptions).toEqual(["air-elemental", "wood-elemental"]);
    expect(byTag("void-elemental").oppositionOptions).toEqual([
      "air-elemental",
      "earth-elemental",
      "fire-elemental",
      "water-elemental",
    ]);
  });
});

describe("elemental school bonus-slot spell lists (elemental-school-spell-lists.json)", () => {
  it("emits a list for all 8 elemental schools, every level 0-9 populated", () => {
    expect(Object.keys(ref.elementalSchoolSpellLists).length).toBe(8);
    expect(ref.meta.counts.elementalSchoolSpellLists).toBe(8);
    for (const [tag, list] of Object.entries(ref.elementalSchoolSpellLists)) {
      for (let level = 0; level <= 9; level++) {
        expect(list[level]?.length, `${tag} L${level}`).toBeGreaterThan(0);
      }
    }
  });

  it("every listed spell id resolves against the vendored spell slice", () => {
    for (const [tag, list] of Object.entries(ref.elementalSchoolSpellLists)) {
      for (const ids of Object.values(list)) {
        for (const id of ids) expect(ref.spells[id], `${tag}: ${id}`).toBeDefined();
      }
    }
  });

  it("splits comma-bearing spell names by longest match, not by comma", () => {
    // Air's 3rd-level run reads "...protection from energy, resist energy,
    // communal, second wind..." — two spells, one of which contains the comma.
    const names = ref.elementalSchoolSpellLists["air-elemental"]![3]!.map(
      (id) => ref.spells[id]!.name,
    );
    expect(names).toContain("Protection from Energy");
    expect(names).toContain("Resist Energy, Communal");
    expect(names).not.toContain("Resist Energy");
  });

  it("matches names the source writes with arabic numerals or lowercase romans", () => {
    const names = (tag: string, level: number) =>
      ref.elementalSchoolSpellLists[tag]![level]!.map((id) => ref.spells[id]!.name);
    expect(names("air-elemental", 2)).toContain("Summon Monster II"); // "summon monster 2"
    expect(names("earth-elemental", 2)).toContain("Summon Monster II"); // "summon monster ii"
    expect(names("fire-elemental", 4)).toContain("Elemental Body I"); // "elemental body i"
  });

  // These three names were misspelled or run together upstream ("firey body",
  // "spiritual weaponlife pact", "share memorypact") and were repaired by a
  // hand-authored table here until upstream fixed the descriptions itself.
  // Kept as a guard that the spells still land, by whichever route.
  it("resolves the names that were once upstream defects", () => {
    const names = (tag: string, level: number) =>
      ref.elementalSchoolSpellLists[tag]![level]!.map((id) => ref.spells[id]!.name);
    expect(names("fire-elemental", 9)).toContain("Fiery Body");
    expect(names("aether-elemental", 2)).toContain("Spiritual Weapon");
    expect(names("void-elemental", 2)).toContain("Share Memory");
  });
});

describe("focused arcane schools (wizard-schools/focused-schools/*.yaml)", () => {
  it("emits exactly 22 focused schools, each resolving to a real parent school", () => {
    expect(Object.keys(ref.focusedSchools).length).toBe(22);
    expect(ref.meta.counts.focusedSchools).toBe(22);
    const schoolTags = new Set(Object.values(ref.wizardSchools).map((s) => s.tag));
    for (const focused of Object.values(ref.focusedSchools)) {
      expect(schoolTags.has(focused.parentTag), focused.name).toBe(true);
    }
  });

  it("every granted power resolves into classFeatures", () => {
    for (const focused of Object.values(ref.focusedSchools)) {
      for (const grant of focused.features) {
        expect(grant.resolved, `${focused.name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId], `${focused.name}: ${grant.name}`).toBeDefined();
      }
    }
  });

  it("Admixture replaces Evocation's Force Missile + Elemental Wall with Versatile Evocation + Elemental Manipulation, keeping Intense Spells", () => {
    const admixture = byName(ref.focusedSchools, "Admixture Subschool");
    expect(admixture.tag).toBe("Admixture");
    expect(admixture.parentTag).toBe("evo");
    const names = admixture.features.map((f) => f.name).sort();
    expect(names).toEqual(["Elemental Manipulation", "Intense Spells", "Versatile Evocation"]);
  });

  it("Infernal Binder (the one entry with no @UUID-linked replacement target) still resolves its two displaced Conjuration powers by name", () => {
    const infernalBinder = byName(ref.focusedSchools, "Infernal Binder Subschool");
    expect(infernalBinder.parentTag).toBe("con");
    const names = infernalBinder.features.map((f) => f.name);
    // Conjuration's own three powers are Summoner's Charm, Acid Dart (WIZ),
    // and Dimensional Steps; the prose names "acid dart and dimensional
    // steps" as displaced, so only Summoner's Charm survives from the parent.
    expect(names).toContain("Summoner's Charm");
    expect(names).not.toContain("Acid Dart (WIZ)");
    expect(names).not.toContain("Dimensional Steps");
  });

  it("Arcanamirium Crafter is a focus of Universalist, not one of the 8 standard schools", () => {
    const crafter = byName(ref.focusedSchools, "Arcanamirium Crafter Subschool");
    expect(crafter.parentTag).toBe("uni");
  });
});

describe("cleric subdomains (domains/subdomains/*.yaml)", () => {
  it("emits 140 subdomains, every one resolved to at least one parent domain", () => {
    expect(Object.keys(ref.subdomains).length).toBe(140);
    expect(ref.meta.counts.subdomains).toBe(140);
    for (const sub of Object.values(ref.subdomains)) {
      expect(sub.parentDomainTags.length, sub.name).toBeGreaterThan(0);
      for (const parentTag of sub.parentDomainTags) {
        expect(ref.domainSpellLists[parentTag], `${sub.name} -> ${parentTag}`).toBeDefined();
      }
    }
  });

  it("Cloud Subdomain (Air) overrides the 8th-level power with Thundercloud, keeps Lightning Arc", () => {
    const cloud = byName(ref.subdomains, "Cloud Subdomain");
    expect(cloud.tag).toBe("Cloud");
    expect(cloud.parentDomainTags).toEqual(["Air"]);
    const byLevel = Object.fromEntries(cloud.features.map((f) => [f.name, f.level]));
    expect(byLevel["Thundercloud"]).toBe(8);
    expect(byLevel["Lightning Arc"]).toBeLessThanOrEqual(1);
  });

  it("Aeon Subdomain (Knowledge) takes its replacement power from the imported set, keeping Lore Keeper", () => {
    const aeon = byName(ref.subdomains, "Aeon Subdomain");
    expect(aeon.parentDomainTags).toEqual(["Knowledge"]);
    const byLevel = Object.fromEntries(aeon.features.map((f) => [f.name, f.level]));
    // Void Form displaces Knowledge's 6th-level Remote Viewing; Lore Keeper stays.
    expect(byLevel["Void Form"]).toBe(6);
    expect(byLevel["Lore Keeper (Domain Power)"]).toBeLessThanOrEqual(1);
    expect(byLevel["Remote Viewing (Domain Power)"]).toBeUndefined();
  });

  it("every subdomain resolves granted powers of its own (65 imported, 75 from the Foundry pack)", () => {
    expect(ref.meta.counts.subdomainsWithImportedPowers).toBe(65);
    for (const sub of Object.values(ref.subdomains)) {
      expect(sub.features.length, sub.name).toBeGreaterThan(0);
    }
  });

  it("Deception Subdomain (Trickery) swaps copycat for Sudden Shift, keeps Master's Illusion", () => {
    const deception = byName(ref.subdomains, "Deception Subdomain");
    expect(deception.parentDomainTags).toEqual(["Trickery"]);
    expect(deception.features.map((f) => f.name)).toEqual(["Sudden Shift", "Master's Illusion"]);
    const suddenShift = ref.classFeatures[deception.features[0]!.featureId]!;
    expect(suddenShift.abilityType).toBe("sp");
    expect(suddenShift.description).toContain("teleport up to 10 feet");
    // APG p. 89 — the subdomain's own citation, not the parent domain's.
    // Cited by product code now that the power comes from the Foundry pack
    // rather than the Pf Data 1e import.
    expect(suddenShift.sources).toEqual([{ id: "PZO1115", pages: "89" }]);
  });

  it("a subdomain keeps its parent's non-power domain bonus unless it replaces it (Travel)", () => {
    const speed = [{ formula: "10", target: "landSpeed", type: "base" }];
    // Exploration trades away agile feet only, so Travel's +10 ft carries over.
    expect(byName(ref.subdomains, "Exploration Subdomain").changes).toEqual(speed);
    // Portal's Sacred Threshold replaces the speed increase itself.
    expect(byName(ref.subdomains, "Portal Subdomain").changes).toEqual([]);
  });

  it("Purity Subdomain (Protection) carries its own direct resistance-save bonus in `changes`", () => {
    const purity = byName(ref.subdomains, "Purity Subdomain");
    expect(purity.parentDomainTags).toEqual(["Protection"]);
    expect(purity.changes).toEqual([
      { formula: "1 + floor(@class.unlevel / 5)", target: "allSavingThrows", type: "resist" },
    ]);
  });

  it("a subdomain shared by two parent domains resolves both (Alchemy: Artifice + Magic)", () => {
    const alchemy = byName(ref.subdomains, "Alchemy Subdomain");
    expect([...alchemy.parentDomainTags].sort()).toEqual(["Artifice", "Magic"]);
  });

  it("every resolved granted power maps into classFeatures", () => {
    for (const sub of Object.values(ref.subdomains)) {
      for (const grant of sub.features) {
        if (!grant.resolved) continue;
        expect(ref.classFeatures[grant.featureId], `${sub.name}: ${grant.name}`).toBeDefined();
      }
    }
  });
});

describe("subdomain spell lists (subdomainSpellLists, merged onto the parent domain's list)", () => {
  it("emits one list per subdomain", () => {
    expect(Object.keys(ref.subdomainSpellLists).length).toBe(140);
    expect(ref.meta.counts.subdomainSpellLists).toBe(140);
  });

  it("Aeon overrides only levels 1/5/6 of Knowledge's list, keeps the rest", () => {
    const aeon = ref.subdomainSpellLists["Aeon"];
    const knowledge = ref.domainSpellLists["Knowledge"];
    expect(aeon).toBeDefined();
    expect(aeon![1]).not.toEqual(knowledge![1]);
    expect(aeon![5]).not.toEqual(knowledge![5]);
    expect(aeon![6]).not.toEqual(knowledge![6]);
    expect(aeon![2]).toEqual(knowledge![2]);
    expect(aeon![7]).toEqual(knowledge![7]);
  });

  it("Cloud (a full-list subdomain) has its own complete 1-9 list", () => {
    const cloud = ref.subdomainSpellLists["Cloud"];
    expect(cloud).toBeDefined();
    for (let lvl = 1; lvl <= 9; lvl++) {
      expect(cloud![lvl], `level ${lvl}`).toBeDefined();
    }
  });

  it("every spell id referenced resolves in refData.spells", () => {
    for (const [tag, list] of Object.entries(ref.subdomainSpellLists)) {
      for (const [lvl, ids] of Object.entries(list)) {
        for (const id of ids) {
          expect(ref.spells[id], `${tag} level ${lvl}: ${id}`).toBeDefined();
        }
      }
    }
  });
});

describe("druid nature-bond domains (domains/druid-domains/**)", () => {
  it("emits 9 animal domains + 16 terrain domains", () => {
    const all = Object.values(ref.druidDomains);
    expect(all.length).toBe(25);
    expect(ref.meta.counts.druidDomains).toBe(25);
    expect(all.filter((d) => d.kind === "animal").length).toBe(9);
    expect(all.filter((d) => d.kind === "terrain").length).toBe(16);
  });

  it("every domain carries at least one hand-authored granted power with a sane level gate", () => {
    // The source models these as free-text prose with no `class-abilities`
    // link at all (issue #117) — `features` is entirely hand-authored
    // (`supplements.ts`'s `SUPPLEMENTAL_DRUID_DOMAIN_FEATURES`), not derived.
    for (const domain of Object.values(ref.druidDomains)) {
      expect(domain.features.length, domain.name).toBeGreaterThan(0);
      for (const grant of domain.features) {
        const label = `${domain.name}: ${grant.name}`;
        expect(grant.resolved, label).toBe(true);
        expect(ref.classFeatures[grant.featureId], label).toBeDefined();
        expect(grant.level, label).toBeGreaterThanOrEqual(1);
        expect(grant.level, label).toBeLessThanOrEqual(20);
      }
    }
  });

  it("Badlands, Ruins, and Crocodile each grant a third power beyond the usual 1st/Nth pair", () => {
    const levelsOf = (name: string) => byName(ref.druidDomains, name).features.map((f) => f.level);
    expect(levelsOf("Badlands Domain")).toEqual([1, 2, 8]);
    expect(levelsOf("Ruins Domain")).toEqual([1, 4, 8]);
    expect(levelsOf("Crocodile Domain")).toEqual([1, 1, 6]);
  });

  it("Wolf grants Improved Trip as a fixed bonus feat (via changes, not a features entry) and Pack Tactics as its 8th-level prose power", () => {
    const wolf = byName(ref.druidDomains, "Wolf Domain");
    expect(wolf.features.map((f) => f.name)).toEqual(["Pack Tactics"]);
    expect(wolf.features[0]!.level).toBe(8);
    expect(wolf.changes).toEqual([{ formula: "1", target: "bonusFeats", type: "untyped" }]);
  });

  it("Wolf Domain (animal) and Desert Domain (terrain) are present with a description", () => {
    const wolf = byName(ref.druidDomains, "Wolf Domain");
    expect(wolf.kind).toBe("animal");
    expect(wolf.description).toBeDefined();
    const desert = byName(ref.druidDomains, "Desert Domain");
    expect(desert.kind).toBe("terrain");
    expect(desert.description).toBeDefined();
  });

  it("parses a domain spell list (from the description's @UUID links) for every domain", () => {
    expect(Object.keys(ref.druidDomainSpellLists).length).toBe(25);
    expect(ref.meta.counts.druidDomainSpellLists).toBe(25);
    // Every listed spell id resolves to a real vendored spell (the referenced
    // spells were retained through the slice).
    for (const [tag, list] of Object.entries(ref.druidDomainSpellLists)) {
      for (const [lvl, ids] of Object.entries(list)) {
        const n = Number(lvl);
        expect(n, `${tag} level key`).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(9);
        for (const id of ids) expect(ref.spells[id], `${tag} L${lvl} ${id}`).toBeDefined();
      }
    }
  });

  it("Wolf's list runs the full 1–9 with the expected spells", () => {
    const wolf = ref.druidDomainSpellLists["Wolf"];
    expect(wolf).toBeDefined();
    for (let lvl = 1; lvl <= 9; lvl++) expect(wolf![lvl], `Wolf L${lvl}`).toBeDefined();
    expect(ref.spells[wolf![1]![0]!]!.name).toBe("Hunter's Howl");
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
    // Aberrant is fully authored in @pf1/engine BLOODLINES but no vendored
    // spell tags it, so the derived inversion yields nothing. The supplement
    // (see src/supplements.ts) backfills its CRB bonus-spell list.
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
      const hasDomain = Object.keys(sp.learnedAt.domain ?? {}).length > 0;
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
    // shift this; changes here should be deliberate + reviewed. Counted
    // without the hand-authored and imported entries (Foundry ids are bare
    // alphanumerics; every non-pack id is namespaced with a colon) so this
    // stays a statement about the pack alone.
    const vendored = Object.values(ref.items).filter((it) => !it.id.includes(":"));
    expect(vendored.length).toBe(1089);
  });

  it("hand-authored supplements land alongside the pack", () => {
    for (const s of SUPPLEMENTAL_ITEMS) {
      expect(ref.items[s.id]).toEqual(s);
    }
  });

  it("Boots of the Cat is selectable with no invented mechanics (issue #111)", () => {
    // Absent from the vendored pack entirely; falling damage isn't modeled, so
    // the entry is deliberately effect-free rather than approximated.
    const boots = byName(ref.items, "Boots of the Cat");
    expect(boots).toMatchObject({
      id: "item:boots-of-the-cat",
      subType: "wondrous",
      slot: "feet",
      price: 1000,
      weight: 1,
      cl: 1,
    });
    expect(boots.changes).toEqual([]);
    expect(boots.sources).toEqual([{ id: "PZO1123", pages: "229" }]);
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

describe("magic-item catalog (Pf Data 1e import)", () => {
  const imported = Object.values(ref.items).filter((it) => it.id.startsWith("mi:"));

  it("imports the published catalog the pack omits", () => {
    // The pack carries ~5% of published magic items. Bumping PFDATA_SHA may
    // shift this; a change here should be deliberate + reviewed.
    expect(imported.length).toBe(3832);
  });

  it("every import is display-only", () => {
    // The whole catalog is prose. Encoding mechanics for it would mean
    // inventing them, so `changes[]` stays empty and the picker's "M" badge
    // marks the vendored entries that do carry real effects.
    expect(imported.every((it) => it.changes.length === 0)).toBe(true);
  });

  it("never shadows a vendored or hand-authored entry", () => {
    // A name collision must resolve to the pack's entry (which has real
    // changes[]) or the supplement's (which has a stable id), never the import.
    const byNormalizedName = new Map<string, string[]>();
    for (const it of Object.values(ref.items)) {
      const key = it.name.trim().toLowerCase();
      byNormalizedName.set(key, [...(byNormalizedName.get(key) ?? []), it.id]);
    }
    const duplicated = [...byNormalizedName.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicated).toEqual([]);

    const cloak = byName(ref.items, "Cloak of Resistance +1");
    expect(cloak.id).not.toStartWith("mi:");
    expect(cloak.changes.length).toBeGreaterThan(0);
    expect(byName(ref.items, "Boots of the Cat").id).toBe("item:boots-of-the-cat");
  });

  it("parses the stat block into structured fields", () => {
    const ring = byName(ref.items, "Ring of Invisibility");
    expect(ring).toMatchObject({ subType: "wondrous", slot: "ring", price: 20000, cl: 3 });
    expect(ring.aura).toEqual({ school: "ill" });
    expect(ring.sources).toContainEqual({ id: "ultimate-equipment", pages: "171" });
    // Prose only: the stat block and the Construction appendix are parsed out.
    expect(ring.description).not.toContain("**Slot**");
    expect(ring.description).not.toContain("Construction");
  });

  it("leaves slot blank on kinds where a body slot is meaningless", () => {
    // pfdata writes "**Slot** none" for a sword the same way it does for a
    // slotless wondrous item; only the latter is a real PF1 category.
    const avenger = byName(ref.items, "Holy Avenger");
    expect(avenger.subType).toBe("weapon");
    expect(avenger.slot).toBeUndefined();
    expect(byName(ref.items, "Aligned Horn of Valhalla").slot).toBe("slotless");
  });

  it("keeps a non-numeric price absent rather than guessing", () => {
    // Artifacts are routinely priced "-" or "varies"; 0 would read as free.
    expect(byName(ref.items, "Deck of Many Things").price).toBeUndefined();
  });

  it("every entry carries rules prose", () => {
    expect(imported.filter((it) => !it.description || it.description.length < 20)).toEqual([]);
  });

  it("weapon/armor special abilities never reach the gear picker", () => {
    // "**Slot** weapon quality" entries (flaming, keen, fortification) are
    // properties bought onto a weapon, not things you carry, so the transform
    // returns them separately — see transform/magicItems.ts.
    for (const name of ["Flaming", "Keen", "Fortification (light)", "Advancing (armor)"]) {
      expect(Object.values(ref.items).find((it) => it.name === name)).toBeUndefined();
    }
  });
});

describe("weapon/armor special abilities (Pf Data 1e import)", () => {
  const abilities = Object.values(ref.itemAbilities);

  it("imports exactly the 181 special abilities the catalog carries", () => {
    expect(abilities.length).toBe(181);
    const ids = abilities.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("ability:"))).toBe(true);
  });

  it("splits weapon/armor/shield the way the published catalog does", () => {
    expect(abilities.filter((a) => a.appliesTo.includes("weapon")).length).toBe(98);
    expect(abilities.filter((a) => a.appliesTo.includes("armor")).length).toBe(65);
    expect(abilities.filter((a) => a.appliesTo.includes("shield")).length).toBe(35);
    expect(abilities.every((a) => a.appliesTo.length > 0)).toBe(true);
  });

  it("parses Flaming's stat block into structured fields", () => {
    const flaming = byName(ref.itemAbilities, "Flaming");
    expect(flaming).toMatchObject({
      appliesTo: ["weapon"],
      bonusEquivalent: 1,
      aura: "evo",
      cl: 10,
    });
    expect(flaming.description).toContain("1d6");
  });

  it("keeps the 42 gp-priced abilities priced, not enhancement-equivalent", () => {
    // Most abilities are priced in bonus-equivalent terms ("+1 bonus"); a
    // minority (e.g. a bane weapon's flat surcharge) are priced in gp instead.
    const gpPriced = abilities.filter((a) => a.bonusEquivalent === undefined);
    expect(gpPriced.length).toBe(42);
    expect(gpPriced.every((a) => typeof a.price === "number")).toBe(true);
    expect(abilities.every((a) => a.bonusEquivalent !== undefined || a.price !== undefined)).toBe(
      true,
    );
  });

  it("keeps bonusEquivalent within PF1's +1 to +5 special-ability range", () => {
    const bonused = abilities.filter((a) => a.bonusEquivalent !== undefined);
    expect(bonused.every((a) => a.bonusEquivalent! >= 1 && a.bonusEquivalent! <= 5)).toBe(true);
  });

  it("carries the tiered-price abilities as a single entry", () => {
    // Fortification (light/moderate/heavy) and Spell Resistance (13/15/17/19)
    // each price across several tiers in the source prose; the parser takes
    // the first tier rather than splitting them. The web layer supersedes
    // both with hand-authored per-tier entries — this just asserts the
    // upstream single entry survives the import.
    expect(byName(ref.itemAbilities, "Fortification")).toBeDefined();
    expect(byName(ref.itemAbilities, "Spell Resistance")).toBeDefined();
  });

  it("every entry carries rules prose", () => {
    expect(abilities.every((a) => a.description.length > 0)).toBe(true);
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

  it("doesn't level-collision-pair ambiguous multi-feature levels (cleric's entire kit sits at level 1), but still pairs by name", () => {
    for (const f of Object.values(ref.archetypeFeatures)) {
      if (f.classTag !== "cleric") continue;
      // The level-collision heuristic never fires here (nothing to fall back
      // to at a level with six grants) — only a `replacesText` name match can
      // pair a cleric feature at all, e.g. Appeaser's own "Aura" below.
      if (f.replacesText === undefined) expect(f.pairedBaseFeatureUuid).toBeUndefined();
    }

    const cleric = classByTag("cleric");
    const aura = cleric.features.find((f) => f.name === "Aura")!;
    expect(ref.archetypeFeatures["cleric:appeaser:aura:0"]).toMatchObject({
      replacesText: "aura",
      pairedBaseFeatureUuid: aura.uuid,
    });
  });

  it("doesn't auto-pair Bonus Feat slots even when otherwise unambiguous", () => {
    const wizard = classByTag("wizard");
    const bonusFeats = wizard.features.find((f) => f.name === "Bonus Feats (WIZ)")!;
    for (const f of Object.values(ref.archetypeFeatures)) {
      expect(f.pairedBaseFeatureUuid).not.toBe(bonusFeats.uuid);
    }
  });

  describe("replacesText/replacesSlot/abilityType (source flags the pipeline reads)", () => {
    it("Mountain Witch's Mountain Beast Empathy: a leveled hex-slot replacement", () => {
      const f = ref.archetypeFeatures["witch:mountain-witch:mountain-beast-empathy:2"];
      expect(f).toMatchObject({
        level: 2,
        replacesText: "hex gained at 2nd level",
        replacesSlot: { kind: "hex", level: 2 },
        isReplacement: true,
        abilityType: "ex",
      });
      // A subsystem slot never pairs to a single base-class grant.
      expect(f?.pairedBaseFeatureUuid).toBeUndefined();
    });

    it("Mountain Witch's Stone Spirit Hex: an unleveled, bare hex-slot alteration", () => {
      const f = ref.archetypeFeatures["witch:mountain-witch:stone-spirit-hex:0"];
      expect(f).toMatchObject({
        level: 0,
        replacesText: "hex",
        replacesSlot: { kind: "hex" },
        isReplacement: true,
      });
      expect(f?.replacesSlot?.level).toBeUndefined();
      expect(f?.pairedBaseFeatureUuid).toBeUndefined();
    });

    it("pairs a named single-ability replacement by name where the old level-collision heuristic couldn't (Slayer's Track sits at a level with a second grant)", () => {
      const slayer = classByTag("slayer");
      const track = slayer.features.find((f) => f.name === "Track")!;
      // The old heuristic never pairs at slayer level 1 (Studied Target grants
      // there too), so this could only ever pair by matching "track" itself.
      expect(slayer.features.filter((f) => f.level === track.level)).toHaveLength(2);

      const f = ref.archetypeFeatures["slayer:covenbane:hag-sense:0"];
      expect(f).toMatchObject({
        level: 0,
        replacesText: "track",
        isReplacement: true,
        abilityType: "su",
        pairedBaseFeatureUuid: track.uuid,
      });
      expect(f?.replacesSlot).toBeUndefined();
    });
  });

  describe("witch Rhetorican/Rhetorician and Tatterdermalion/Tatterdemalion dedup", () => {
    it("merges the misspelled structured doc and the correctly-spelled inline-prose doc into one archetype each", () => {
      const witchArchetypes = Object.values(ref.archetypes).filter((a) => a.classTag === "witch");
      expect(witchArchetypes.filter((a) => a.name === "Rhetorician")).toHaveLength(1);
      expect(witchArchetypes.filter((a) => a.name === "Tatterdemalion")).toHaveLength(1);
      expect(ref.archetypes["witch:rhetorician"]).toBeUndefined();
      expect(ref.archetypes["witch:tatterdemalion"]).toBeUndefined();
      expect(ref.archetypes["witch:rhetorican"]?.name).toBe("Rhetorician");
      expect(ref.archetypes["witch:tatterdermalion"]?.name).toBe("Tatterdemalion");
    });

    it("carries over the dropped Tatterdemalion doc's features the structured doc didn't already have", () => {
      const names = Object.values(ref.archetypeFeatures)
        .filter((f) => f.archetypeId === "witch:tatterdermalion")
        .map((f) => f.name)
        .sort();
      expect(names).toEqual([
        "Cantrips",
        "Dancing Strings",
        "Lace Weaver",
        "Sinister Stitching",
        "Unravel",
        "Weapon Proficiency",
        "Witchweaver",
      ]);
      // Carried over from the dropped `witch:tatterdemalion` doc, keeping
      // their own levels (parsed from their own "At Nth level" prose).
      const byName = Object.fromEntries(
        Object.values(ref.archetypeFeatures)
          .filter((f) => f.archetypeId === "witch:tatterdermalion")
          .map((f) => [f.name, f]),
      );
      expect(byName["Lace Weaver"]?.level).toBe(8);
      expect(byName["Sinister Stitching"]?.level).toBe(12);
      expect(byName["Unravel"]?.level).toBe(16);
    });
  });

  describe("orphan features whose tags[0] is the class, not the archetype", () => {
    it("emits no archetype named after its own class", () => {
      // The vanished-parent pass names a synthesized archetype after the
      // orphan group's `tags[0]`. A handful of feature docs lead with the
      // CLASS name there, which would mint e.g. a "Kineticist" archetype for
      // the kineticist.
      const selfNamed = Object.values(ref.archetypes).filter(
        (a) => a.id === `${a.classTag}:${a.classTag}`,
      );
      expect(selfNamed).toEqual([]);
    });

    it("files Psammokinetic's two unlinked simple blasts under the archetype itself", () => {
      // Its Burning Winds feature grants both "in place of the air blast and
      // electric blast normally granted to an aerokinetic", but the archetype
      // doc leaves them out of `links.supplements`.
      expect(ref.archetypeFeatures["kineticist:psammokinetic:sand-blast:1"]?.name).toBe(
        "Sand Blast",
      );
      expect(ref.archetypeFeatures["kineticist:psammokinetic:sirocco-blast:1"]?.name).toBe(
        "Sirocco Blast",
      );
    });

    it("drops the base-class deed list filed among the gunslinger archetype features", () => {
      const deeds = Object.values(ref.archetypeFeatures).filter(
        (f) => f.classTag === "gunslinger" && f.name === "Deeds",
      );
      expect(deeds.length).toBeGreaterThan(0);
      for (const f of deeds) {
        expect(ref.archetypes[f.archetypeId]?.classTag).toBe("gunslinger");
        expect(f.archetypeId).not.toBe("gunslinger:gunslinger");
      }
    });
  });

  it("id stability: a feature's id keeps its old level even when `.level` itself is corrected", () => {
    // Same posture as `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL`: the id embeds
    // whatever the structured/legacy source would produce on its own, not the
    // better-informed `.level` field.
    expect(ref.archetypeFeatures["witch:tatterdermalion:cantrips:0"]).toMatchObject({
      level: 1,
      id: "witch:tatterdermalion:cantrips:0",
    });
    expect(ref.archetypeFeatures["slayer:covenbane:hag-sense:0"]?.level).toBe(0);
    // A plain sanity check that ordinary ids (explicit structured level, no
    // replaces flags at all) still resolve.
    expect(ref.archetypeFeatures["fighter:two-handed-fighter:overhand-chop:3"]).toBeDefined();
  });
});
