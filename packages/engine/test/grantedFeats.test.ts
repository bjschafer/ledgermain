/**
 * Fixture coverage for `granted-feats.ts` — the expansion that makes a feat a
 * class hands over behave like one the player picked.
 *
 * The shared fixture is a Str 12 (+1) / Dex 18 (+4) character holding a
 * rapier, so a Weapon Finesse grant moves the attack line by a visible 3 and
 * a failed grant is never mistakable for a successful one. Expected totals
 * are hand-computed from the published class tables and the feat text.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import {
  ARCHETYPE_PROSE_FEAT_GRANTS,
  grantedFeats,
  PROSE_FEAT_GRANTS,
  withGrantedFeats,
} from "../src/granted-feats.js";
import { featNameSlug } from "../src/feat-effects.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const slug = featNameSlug(name);
  const entry = Object.entries(ref.feats).find(([, f]) => featNameSlug(f.name) === slug);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function archetypeId(name: string, classTag: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === classTag,
  );
  if (!entry) throw new Error(`archetype not found: ${name}`);
  return entry.id;
}

const RAPIER: WeaponInstance = {
  name: "Rapier",
  attackAbility: "str",
  damageAbility: "str",
  damageDice: "1d6",
  group: "rapier",
  category: "melee",
};

const STR_MOD = 1;
const DEX_MOD = 4;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  feats?: string[];
  archetypes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: { str: 12, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: (over.feats ?? []).map(featId),
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [RAPIER],
      ...(over.archetypes ? { archetypes: over.archetypes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

/** The rapier's attack total, and the label the sheet shows for its ability half. */
function rapierAttack(doc: CharacterDoc): { total: number; ability: string | undefined } {
  const attack = compute(doc, ref).attacks[0]!;
  const ability = attack.attack.components.find((c) => /Strength|Dexterity/.test(c.source));
  return { total: attack.attack.total, ability: ability?.source };
}

describe("class-granted feats move the numbers they grant", () => {
  // Swashbuckler Finesse (ACG, 1st level): "a swashbuckler gains the benefits
  // of the Weapon Finesse feat with light or one-handed piercing melee
  // weapons". Swashbuckler is a high-BAB class, so at 1st level BAB +1.
  it("a swashbuckler finesses a rapier from 1st level", () => {
    const swashbuckler = rapierAttack(makeDoc({ classes: [{ tag: "swashbuckler", level: 1 }] }));
    expect(swashbuckler.total).toBe(1 + DEX_MOD);
    expect(swashbuckler.ability).toBe("Dexterity (Weapon Finesse)");
  });

  // Rogue (Unchained)'s Finesse Training already resolved to a granted Weapon
  // Finesse for the feat list; before the expansion it moved no number.
  // Rogue is a mid-BAB class: BAB +3 at 5th.
  it("an unchained rogue finesses a rapier from Finesse Training", () => {
    const rogue = rapierAttack(makeDoc({ classes: [{ tag: "rogueUnchained", level: 5 }] }));
    expect(rogue.total).toBe(3 + DEX_MOD);
    expect(rogue.ability).toBe("Dexterity (Weapon Finesse)");
  });

  // Warpriest's Focus Weapon grants Weapon Focus, worth a flat +1 on attacks
  // with the chosen weapon. Warpriest is mid-BAB: BAB +2 at 3rd. The grant is
  // choice-bearing and no choice is stored for it, so the +1 does NOT land —
  // asserted so the day a choice can be stored, this test says what changed.
  it("a warpriest's granted Weapon Focus is inert until it has a weapon", () => {
    const doc = makeDoc({ classes: [{ tag: "warpriest", level: 3 }] });
    expect(grantedFeats(doc, ref).map((g) => g.featName)).toContain("Weapon Focus");
    expect(rapierAttack(doc).total).toBe(2 + STR_MOD);
  });

  // A gunslinger's Gunsmith feature grants Gunsmithing in its closing
  // sentence, with no `bonusFeats` change to carry it — the prose-grant path.
  it("a gunslinger is granted Gunsmithing from prose alone", () => {
    const doc = makeDoc({ classes: [{ tag: "gunslinger", level: 1 }] });
    expect(grantedFeats(doc, ref).map((g) => g.featName)).toContain("Gunsmithing");
  });

  // Swashbuckler archetypes that trade Swashbuckler Finesse away must keep the
  // finesse their own replacement ability grants.
  it("an inspired blade keeps its finesse after trading the base feature away", () => {
    const doc = makeDoc({
      classes: [{ tag: "swashbuckler", level: 1 }],
      archetypes: [archetypeId("Inspired Blade", "swashbuckler")],
    });
    const granted = grantedFeats(doc, ref);
    expect(granted.map((g) => g.featName)).toEqual(["Weapon Finesse"]);
    expect(granted[0]!.featureName).toBe("Inspired Finesse");
    expect(rapierAttack(doc).ability).toBe("Dexterity (Weapon Finesse)");
  });
});

describe("the expansion never doubles a feat", () => {
  it("a hand-bought copy of the granted feat yields one entry, not two", () => {
    const doc = makeDoc({
      classes: [{ tag: "swashbuckler", level: 1 }],
      feats: ["Weapon Finesse"],
    });
    const expanded = withGrantedFeats(doc, ref);
    expect(expanded.build.feats).toEqual([featId("Weapon Finesse")]);
  });

  it("a character with no grants is returned unchanged", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 5 }] });
    expect(withGrantedFeats(doc, ref)).toBe(doc);
  });

  it("the stored document is never mutated by compute", () => {
    const doc = makeDoc({ classes: [{ tag: "swashbuckler", level: 1 }] });
    compute(doc, ref);
    expect(doc.build.feats).toEqual([]);
  });
});

describe("prose feat grants resolve against the vendored data", () => {
  // A hand-authored table naming features and feats by id/name goes stale
  // silently when the pinned reference data moves. Every entry must still
  // find both halves.
  it("every prose-granted feat exists and is granted at its own level", () => {
    // Twilight Talon's single 2nd-level feature spreads its grants to 5th and
    // 9th, the one case `minLevel` exists for.
    const early = makeDoc({ classes: [{ tag: "twilightTalon", level: 4 }] });
    expect(grantedFeats(early, ref)).toEqual([]);
    const mid = makeDoc({ classes: [{ tag: "twilightTalon", level: 5 }] });
    expect(grantedFeats(mid, ref).map((g) => g.featName)).toEqual(["Critical Focus"]);
    const late = makeDoc({ classes: [{ tag: "twilightTalon", level: 9 }] });
    expect(grantedFeats(late, ref).map((g) => g.featName)).toEqual([
      "Critical Focus",
      "Staggering Critical",
    ]);
  });

  // A table keyed by feature uuid/id and feat name goes stale SILENTLY when
  // the pinned reference data moves: a key that matches nothing simply grants
  // nothing. Both halves of every entry must still resolve.
  it("every table key names a real feature and a real feat", () => {
    const featNames = new Set(Object.values(ref.feats).map((f) => f.name.trim().toLowerCase()));
    const featureUuids = new Set(Object.values(ref.classFeatures).map((f) => f.uuid));
    for (const [uuid, grants] of Object.entries(PROSE_FEAT_GRANTS)) {
      expect(featureUuids).toContain(uuid);
      for (const grant of grants) expect(featNames).toContain(grant.feat);
    }
    const archetypeFeatureIds = new Set(Object.values(ref.archetypeFeatures).map((f) => f.id));
    for (const [id, grants] of Object.entries(ARCHETYPE_PROSE_FEAT_GRANTS)) {
      expect(archetypeFeatureIds).toContain(id);
      for (const grant of grants) expect(featNames).toContain(grant.feat);
    }
  });

  // The prose path exists for features the `bonusFeats` path can't see. If a
  // data bump ever gives one of them a resolvable `bonusFeats` change, the
  // table entry becomes a duplicate and should be deleted instead.
  it("no prose-granted class feature also carries a bonusFeats change", () => {
    for (const uuid of Object.keys(PROSE_FEAT_GRANTS)) {
      const feature = Object.values(ref.classFeatures).find((f) => f.uuid === uuid)!;
      expect(feature.changes ?? []).not.toContainEqual(
        expect.objectContaining({ target: "bonusFeats" }),
      );
    }
  });

  it("a duelist is granted Combat Reflexes at 4th and Deflect Arrows at 9th", () => {
    const third = makeDoc({ classes: [{ tag: "duelist", level: 3 }] });
    expect(grantedFeats(third, ref)).toEqual([]);
    const fourth = makeDoc({ classes: [{ tag: "duelist", level: 4 }] });
    expect(grantedFeats(fourth, ref).map((g) => g.featName)).toEqual(["Combat Reflexes"]);
    const ninth = makeDoc({ classes: [{ tag: "duelist", level: 9 }] });
    expect(grantedFeats(ninth, ref).map((g) => g.featName)).toEqual([
      "Combat Reflexes",
      "Deflect Arrows",
    ]);
  });
});
