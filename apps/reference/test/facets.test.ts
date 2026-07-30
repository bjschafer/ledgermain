import type { ConditionDef } from "@pf1/engine";
import type { ArmorRef, Feat, Item, Spell, WeaponRef } from "@pf1/schema";
import { describe, expect, it } from "bun:test";

import {
  armorFacet,
  conditionFacet,
  featFacet,
  itemFacet,
  spellFacet,
  weaponFacet,
} from "../src/shared/facets.js";

describe("spellFacet", () => {
  const fireball: Spell = {
    id: "fireball",
    name: "Fireball",
    uuid: "Compendium.pf1.spells.Item.fireball",
    level: 3,
    school: "evo",
    descriptors: ["fire"],
    sr: "yes",
    components: { verbal: true, somatic: true, material: true },
    learnedAt: { class: { wizard: 3, sorcerer: 3 } },
    actions: [],
  };

  it("leads with the full school name and level, then per-class levels", () => {
    expect(spellFacet(fireball)).toBe("Evocation 3 · sorcerer 3, wizard 3");
  });

  it("elides a long class list rather than wrapping a result row", () => {
    const wide: Spell = {
      ...fireball,
      learnedAt: { class: { bard: 1, cleric: 1, druid: 1, ranger: 1, wizard: 1 } },
    };
    expect(spellFacet(wide)).toBe("Evocation 3 · bard 1, cleric 1, druid 1, ranger 1, …");
  });

  it("falls back to a bare level when the school is missing", () => {
    expect(spellFacet({ ...fireball, school: undefined, learnedAt: { class: {} } })).toBe(
      "Level 3",
    );
  });
});

describe("featFacet", () => {
  it("shows the feat's tags", () => {
    const feat: Feat = {
      id: "power-attack",
      name: "Power Attack",
      uuid: "Compendium.pf1.feats.Item.powerattack",
      tags: ["Combat"],
      prerequisites: { abilities: [], feats: [], skills: [] },
    };
    expect(featFacet(feat)).toBe("Combat");
  });

  it("falls back to the collection name when untagged", () => {
    const feat: Feat = {
      id: "x",
      name: "X",
      uuid: "u",
      tags: [],
      prerequisites: { abilities: [], feats: [], skills: [] },
    };
    expect(featFacet(feat)).toBe("Feat");
  });
});

describe("weaponFacet", () => {
  it("shows damage, crit, and how you get to use it", () => {
    const longsword: WeaponRef = {
      id: "longsword",
      name: "Longsword",
      uuid: "u",
      damageDice: "1d8",
      critRange: 19,
      critMult: 2,
      category: "melee",
      attackAbility: "str",
      proficiency: "martial",
    };
    expect(weaponFacet(longsword)).toBe("1d8 19–20/×2 · martial melee");
  });

  it("writes a natural-20 threat range as the multiplier alone", () => {
    const club: WeaponRef = {
      id: "club",
      name: "Club",
      uuid: "u",
      damageDice: "1d6",
      category: "melee",
      attackAbility: "str",
      proficiency: "simple",
    };
    expect(weaponFacet(club)).toBe("1d6 ×2 · simple melee");
  });
});

describe("armorFacet", () => {
  it("shows AC, the Dex cap, and the check penalty", () => {
    const chain: ArmorRef = {
      id: "chain-shirt",
      name: "Chain Shirt",
      uuid: "u",
      slot: "armor",
      ac: 4,
      maxDex: 4,
      acp: 2,
    };
    expect(armorFacet(chain)).toBe("+4 AC · max Dex +4 · ACP -2");
  });

  it("omits a zero check penalty", () => {
    const buckler: ArmorRef = {
      id: "b",
      name: "Buckler",
      uuid: "u",
      slot: "shield",
      ac: 1,
      acp: 0,
    };
    expect(armorFacet(buckler)).toBe("+1 AC");
  });
});

describe("itemFacet", () => {
  it("marks an item magic from its aura or caster level, not a subType", () => {
    const ring: Item = {
      id: "ring",
      name: "Ring of Protection +2",
      uuid: "u",
      subType: "wondrous",
      slot: "ring",
      price: 8000,
      cl: 6,
      aura: { school: "abj" },
      changes: [],
      contextNotes: [],
    };
    expect(itemFacet(ring)).toBe("8,000 gp · ring · magic");
  });

  it("falls back to the subType when an item has no slot, and stays mundane", () => {
    const rope: Item = {
      id: "rope",
      name: "Rope, hempen (50 ft.)",
      uuid: "u",
      subType: "adventuring",
      price: 1,
      changes: [],
      contextNotes: [],
    };
    expect(itemFacet(rope)).toBe("1 gp · adventuring");
  });
});

describe("conditionFacet", () => {
  it("labels the collection — a condition's summary is the detail page's job", () => {
    const shaken: ConditionDef = {
      id: "shaken",
      name: "Shaken",
      summary: "-2 penalty on attack rolls, saving throws, and skill checks.",
      changes: [],
    };
    expect(conditionFacet(shaken)).toBe("Condition");
  });
});
