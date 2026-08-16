import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc, ItemInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_TIER_REPLACEMENTS,
  ARMOR_TRAINING_GRANT_UUID,
  archetypeReplacedSlotKeys,
  archetypeSwappedUuids,
  armorTrainingTiersKept,
  compute,
  replacedTierLevels,
  resolveClassFeatures,
} from "../src/index.js";

/**
 * Fixture tests for `archetype-tier-replacements.ts` — single-tier Armor
 * Training / bonus-feat instance replacements. Hand-computed against the
 * published rules: fighter Armor Training tiers at 3rd/7th/11th/15th, each
 * +1 max Dex / -1 ACP (CRB p. 55); Unbreakable's Quick Recovery/Unlimited
 * Endurance replace armor training 3/4 (UC p. 47).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag?: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && (classTag === undefined || a.classTag === classTag),
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
  abilities?: Partial<Record<AbilityId, number>>;
  gear?: ItemInstance[];
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
      classes: over.classes,
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      ...over.abilities,
    },
    build: {
      feats: [],
      skillRanks: {},
      archetypes: over.archetypes ?? [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

function stripTags(html: string | undefined): string {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("ARCHETYPE_TIER_REPLACEMENTS: drift guards", () => {
  it("every key resolves to a vendored archetype feature whose text still says the keyword", () => {
    for (const [id, entry] of Object.entries(ARCHETYPE_TIER_REPLACEMENTS)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `table key ${id} no longer resolves to a vendored feature`).toBeDefined();
      expect(
        stripTags(feature!.description).includes(entry.keyword.toLowerCase()),
        `${id}: vendored description no longer says "${entry.keyword}" — re-verify the replacement before re-keying`,
      ).toBe(true);
    }
  });

  it("armor-training entries belong to fighter archetypes that do NOT wholesale-pair the grant", () => {
    for (const [id, entry] of Object.entries(ARCHETYPE_TIER_REPLACEMENTS)) {
      if (entry.kind !== "armor training") continue;
      const feature = ref.archetypeFeatures[id]!;
      expect(feature.classTag).toBe("fighter");
      // A whole-grant swap (post-correction view — the raw vendored pairing
      // may be neutralized in `archetypes.ts`) means every tier is already
      // suppressed; a tier entry on top would double-remove. Those
      // archetypes use suppress-plus-backfill instead — see the table's doc
      // comment.
      expect(
        archetypeSwappedUuids(ref, feature.archetypeId).has(ARMOR_TRAINING_GRANT_UUID),
        `${id}: archetype now wholesale-swaps Armor Training — retire the tier entry`,
      ).toBe(false);
    }
  });

  it("no table key duplicates a vendored leveled replacesSlot of the same kind", () => {
    for (const [id, entry] of Object.entries(ARCHETYPE_TIER_REPLACEMENTS)) {
      const slot = ref.archetypeFeatures[id]!.replacesSlot;
      expect(
        slot?.kind === entry.kind && slot.level !== undefined,
        `${id}: vendored data now carries the slot upstream — retire its table entry`,
      ).toBe(false);
    }
  });

  it("levels are valid gain levels for their kind", () => {
    for (const [id, entry] of Object.entries(ARCHETYPE_TIER_REPLACEMENTS)) {
      for (const level of entry.levels) {
        if (entry.kind === "armor training") {
          expect([3, 7, 11, 15], `${id}: ${level} is not an Armor Training tier level`).toContain(
            level,
          );
        } else {
          // Fighter bonus feats: 1st and every even level (CRB p. 55).
          expect(
            level === 1 || level % 2 === 0,
            `${id}: ${level} is not a fighter bonus-feat gain level`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("replacedTierLevels", () => {
  const unbreakable = archetypeId("Unbreakable", "fighter");

  it("gates each replaced instance on its own gain level, not the feature's grant level", () => {
    const at = (level: number) =>
      replacedTierLevels(
        makeDoc({ classes: [{ tag: "fighter", level }], archetypes: [unbreakable] }),
        ref,
        "armor training",
        "fighter",
      );
    expect([...at(10)]).toEqual([]);
    expect([...at(11)].sort(), "Quick Recovery trades tier 3 away at 11").toEqual([11]);
    expect([...at(15)].sort((a, b) => a - b)).toEqual([11, 15]);
  });

  it("unions hand-table bonus-feat instances (Druman Blackjacket's four)", () => {
    const druman = archetypeId("Druman Blackjacket", "fighter");
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 16 }], archetypes: [druman] });
    expect(
      [...replacedTierLevels(doc, ref, "bonus feat", "fighter")].sort((a, b) => a - b),
    ).toEqual([4, 8, 12, 16]);
    const at10 = makeDoc({ classes: [{ tag: "fighter", level: 10 }], archetypes: [druman] });
    expect(
      [...replacedTierLevels(at10, ref, "bonus feat", "fighter")].sort((a, b) => a - b),
    ).toEqual([4, 8]);
  });

  it("picks up vendored leveled 'bonus feat' replacesSlot entries (warpriest)", () => {
    const champion = archetypeId("Champion of the Faith", "warpriest");
    const doc = makeDoc({ classes: [{ tag: "warpriest", level: 6 }], archetypes: [champion] });
    // Detect Alignment carries `replacesSlot: { kind: "bonus feat", level: 3 }`
    // upstream — no hand-table entry involved.
    expect([...replacedTierLevels(doc, ref, "bonus feat", "warpriest")]).toEqual([3]);
  });

  it("scopes to the archetype's own class", () => {
    const unb = makeDoc({
      classes: [
        { tag: "fighter", level: 15 },
        { tag: "rogue", level: 2 },
      ],
      archetypes: [unbreakable],
    });
    expect(replacedTierLevels(unb, ref, "armor training", "rogue").size).toBe(0);
  });
});

describe("armorTrainingTiersKept", () => {
  it("counts only gained, unreplaced tiers", () => {
    expect(armorTrainingTiersKept(2, new Set())).toBe(0);
    expect(armorTrainingTiersKept(11, new Set())).toBe(3);
    expect(armorTrainingTiersKept(11, new Set([11]))).toBe(2);
    expect(armorTrainingTiersKept(15, new Set([11, 15]))).toBe(2);
    expect(armorTrainingTiersKept(20, new Set([3, 7, 11, 15]))).toBe(0);
  });
});

describe("Unbreakable: partial-tier Armor Training in compute()", () => {
  // Dex 22 (+6) against a maxDex-1 breastplate makes every Armor Training
  // tier visible in normal AC; -3 ACP keeps the reduction visible too.
  const unbreakable = archetypeId("Unbreakable", "fighter");
  const dex22: Partial<Record<AbilityId, number>> = { dex: 22 };
  const breastplate: ItemInstance = {
    equipped: true,
    name: "Test Breastplate",
    armor: { slot: "armor", ac: 6, maxDex: 1, acp: -3, type: 2 },
  };
  const sheet = (level: number, archetypes: string[]) =>
    compute(
      makeDoc({
        classes: [{ tag: "fighter", level }],
        archetypes,
        abilities: dex22,
        gear: [breastplate],
      }),
      ref,
    );

  it("below the first replaced tier, identical to a plain fighter", () => {
    const plain = sheet(10, []);
    const unb = sheet(10, [unbreakable]);
    expect(unb.ac.normal).toBe(plain.ac.normal);
    expect(unb.skills.clm!.acp).toBe(plain.skills.clm!.acp);
  });

  it("L11: tier 3 is gone (max Dex cap 3, not 4; ACP -1, not 0)", () => {
    const plain = sheet(11, []);
    const unb = sheet(11, [unbreakable]);
    // Plain: cap 1+3=4 -> 4 Dex to AC. Unbreakable keeps tiers 1-2: cap 3.
    expect(plain.ac.normal - unb.ac.normal).toBe(1);
    expect(plain.skills.clm!.acp).toBe(0); // -3 + 3
    expect(unb.skills.clm!.acp).toBe(-1); // -3 + 2
  });

  it("L15+: tiers 3 and 4 are gone; tiers 1-2 remain (RAW UC p. 47)", () => {
    const plain = sheet(15, []);
    const unb = sheet(15, [unbreakable]);
    // Plain: cap 1+4=5 -> 5 Dex to AC. Unbreakable: cap 1+2=3.
    expect(plain.ac.normal - unb.ac.normal).toBe(2);
    expect(unb.skills.clm!.acp).toBe(-1);
    const unb20 = sheet(20, [unbreakable]);
    expect(unb20.skills.clm!.acp).toBe(-1);
  });

  it("the base Armor Training row is NOT struck through (the fighter keeps tiers 1-2)", () => {
    const unb = sheet(15, [unbreakable]);
    const feature = unb.classFeatures.find((f) => f.name === "Armor Training" && f.level === 3);
    expect(feature?.applied).toBe(true);
    expect(feature?.replacedBy).toBeUndefined();
  });
});

describe("Unarmed Fighter: keeps ONLY armor training tier 3 (UC p. 48)", () => {
  // Tough Guy (3rd) / Clever Wrestler (7th) / Sucker Punch (17th) replace
  // tiers 1, 2, and 4; nothing replaces tier 3, so it manifests alone at
  // L11+. Tough Guy's vendored whole-grant pairing is neutralized in
  // `archetypes.ts` — without that the whole progression would vanish.
  const unarmed = archetypeId("Unarmed Fighter", "fighter");
  const dex22: Partial<Record<AbilityId, number>> = { dex: 22 };
  const breastplate: ItemInstance = {
    equipped: true,
    name: "Test Breastplate",
    armor: { slot: "armor", ac: 6, maxDex: 1, acp: -3, type: 2 },
  };
  const sheet = (level: number, archetypes: string[]) =>
    compute(
      makeDoc({
        classes: [{ tag: "fighter", level }],
        archetypes,
        abilities: dex22,
        gear: [breastplate],
      }),
      ref,
    );

  it("L7: tiers 1-2 are both traded away — no Armor Training value at all", () => {
    const plain = sheet(7, []);
    const unarmedSheet = sheet(7, [unarmed]);
    expect(plain.ac.normal - unarmedSheet.ac.normal).toBe(2); // plain has tiers 1-2
    expect(unarmedSheet.skills.clm!.acp).toBe(-3); // untouched ACP
  });

  it("L11-14: tier 3 manifests (+1 max Dex / -1 ACP)", () => {
    const unarmedSheet = sheet(11, [unarmed]);
    expect(sheet(11, []).ac.normal - unarmedSheet.ac.normal).toBe(2); // plain 3, unarmed 1
    expect(unarmedSheet.skills.clm!.acp).toBe(-2);
  });

  it("L15+: Sucker Punch's tier-4 trade bites at 15 (before the feature arrives at 17)", () => {
    const unarmedSheet = sheet(15, [unarmed]);
    expect(sheet(15, []).ac.normal - unarmedSheet.ac.normal).toBe(3); // plain 4, unarmed 1
    expect(unarmedSheet.skills.clm!.acp).toBe(-2);
    expect(sheet(20, [unarmed]).skills.clm!.acp).toBe(-2);
  });
});

describe("suppress-plus-backfill archetypes are untouched by the tier table", () => {
  // Tactician keeps armor training tiers 1-2, modeled the OTHER way: its own
  // vendored "Armor Training" row wholesale-pairs the base grant and carries
  // the kept schedule as an extracted effect. The tier table must not touch
  // it (a tier entry on top would double-remove — the drift guard above pins
  // this split).
  it("Tactician L15: kept tiers 1-2 via backfill, not via the tier table", () => {
    const dex22: Partial<Record<AbilityId, number>> = { dex: 22 };
    const breastplate: ItemInstance = {
      equipped: true,
      name: "Test Breastplate",
      armor: { slot: "armor", ac: 6, maxDex: 1, acp: -3, type: 2 },
    };
    const tactician = archetypeId("Tactician", "fighter");
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 15 }],
      archetypes: [tactician],
      abilities: dex22,
      gear: [breastplate],
    });
    expect(replacedTierLevels(doc, ref, "armor training", "fighter").size).toBe(0);
    const plain = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 15 }], abilities: dex22, gear: [breastplate] }),
      ref,
    );
    // Plain fighter: 4 tiers; tactician backfill: 2 -> AC differs by 2.
    expect(plain.ac.normal - compute(doc, ref).ac.normal).toBe(2);
  });
});

describe("Bravery mispairings neutralized: bonus-feat trades no longer strike Bravery", () => {
  it("Corsair keeps Bravery (Deck Fighting trades a feat slot, not Bravery)", () => {
    const corsair = archetypeId("Corsair", "fighter");
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 6 }], archetypes: [corsair] });
    const bravery = resolveClassFeatures(doc, ref).classFeatures.find((f) => f.name === "Bravery");
    expect(bravery?.applied).toBe(true);
    expect(bravery?.replacedBy).toBeUndefined();
  });

  it("Eldritch Guardian still loses Bravery — to Steel Will, its real replacement", () => {
    const eldritch = archetypeId("Eldritch Guardian", "fighter");
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 6 }], archetypes: [eldritch] });
    const bravery = resolveClassFeatures(doc, ref).classFeatures.find((f) => f.name === "Bravery");
    expect(bravery?.applied).toBe(false);
    expect(bravery?.replacedBy).toBe("Steel Will");
  });
});

describe("tier replacements claim conflict slot keys", () => {
  it("Unbreakable claims armor-training tier slots; Druman Blackjacket claims bonus-feat slots", () => {
    const unbSlots = archetypeReplacedSlotKeys(ref, archetypeId("Unbreakable", "fighter"));
    expect(unbSlots.has("armor training:11")).toBe(true);
    expect(unbSlots.has("armor training:15")).toBe(true);
    const drumanSlots = archetypeReplacedSlotKeys(
      ref,
      archetypeId("Druman Blackjacket", "fighter"),
    );
    expect(drumanSlots.has("bonus feat:8")).toBe(true);
  });
});
