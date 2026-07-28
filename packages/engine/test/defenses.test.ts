import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { EFFECT_IMMUNITY_LABELS } from "../src/defenses.js";
import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function buffId(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities: CharacterDoc["abilities"];
  race?: string;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  gear?: CharacterDoc["build"]["gear"];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId(over.race ?? "Human"),
      classes: over.classes,
    },
    abilities: over.abilities,
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: over.gear ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  };
}

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } as const;

describe("compute: defenses (issue #21)", () => {
  it("a character with no DR/resistance/SR sources has no defenses line at all", () => {
    const doc = makeDoc({ classes: [{ tag: "fighter", level: 5 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("barbarian L13 gets hand-authored DR 3/— (1 at L7, +1 every 3 levels)", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarian", level: 13 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);

    // classFeatures list shows the "DR 3/—" detail string alongside the grant.
    const feature = sheet.classFeatures.find((f) => f.name === "Damage Reduction");
    expect(feature).toBeDefined();
    expect(feature!.detail).toBe("3/—");

    // and the defenses line carries the same number with provenance.
    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 3,
        qualifier: "—",
        components: [
          {
            source: "Damage Reduction",
            sourceId: "barbarian-dr",
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
      },
    ]);
    expect(sheet.defenses!.resistances).toEqual([]);
    expect(sheet.defenses!.sr).toBeUndefined();
  });

  it("barbarian below L7 has no DR yet", () => {
    const doc = makeDoc({ classes: [{ tag: "barbarian", level: 6 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("Diamond Soul (monk L13, vendored spellResist change) routes into sr = 10 + level", () => {
    const doc = makeDoc({ classes: [{ tag: "monk", level: 13 }], abilities: ABILITIES });
    const sheet = compute(doc, ref);

    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.sr).toBeDefined();
    expect(sheet.defenses!.sr!.total).toBe(23);
    expect(sheet.defenses!.sr!.components).toEqual([
      {
        source: "Diamond Soul",
        sourceId: expect.any(String),
        type: "base",
        value: 23,
        applied: true,
      },
    ]);
  });

  it("Drow Noble's vendored spellResist Change (set, 11 + level) routes into sr", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 4 }],
      abilities: ABILITIES,
      race: "Drow Noble",
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr).toEqual({
      total: 15,
      components: [
        {
          source: "Drow Noble",
          sourceId: raceId("Drow Noble"),
          type: "racial",
          value: 15,
          applied: true,
        },
      ],
    });
  });

  it("the Spell Resistance buff (12 + CL, set) routes into sr at the buff's caster level", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 9 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sr-buff",
          buffId: buffId("Spell Resistance"),
          name: "Spell Resistance",
          changes: ref.buffs[buffId("Spell Resistance")]!.changes,
          casterLevel: 9,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr?.total).toBe(21);
  });

  it("SR from two `set` sources doesn't stack — only the higher value applies, the loser kept unapplied", () => {
    // Drow Noble (L4): 11 + 4 = 15. Spell Resistance buff at CL9: 12 + 9 = 21.
    // The buff wins; Drow Noble's own racial SR stays in components, struck through.
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 4 }],
      abilities: ABILITIES,
      race: "Drow Noble",
      activeBuffs: [
        {
          instanceId: "sr-buff",
          buffId: buffId("Spell Resistance"),
          name: "Spell Resistance",
          changes: ref.buffs[buffId("Spell Resistance")]!.changes,
          casterLevel: 9,
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.sr?.total).toBe(21);
    const byApplied = Object.fromEntries(
      sheet.defenses!.sr!.components.map((c) => [c.source, c.applied]),
    );
    expect(byApplied).toEqual({ "Drow Noble": false, "Spell Resistance": true });
  });

  it("a custom (user-authored) buff granting fire resistance 10 flows through with provenance, no special-casing", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "buff-1",
          name: "Resist Energy (Fire)",
          changes: [{ formula: "10", target: "eres.fire", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);

    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([]);
    expect(sheet.defenses!.resistances).toEqual([
      {
        total: 10,
        qualifier: "fire",
        components: [
          {
            source: "Resist Energy (Fire)",
            sourceId: "buff-1",
            type: "untyped",
            value: 10,
            applied: true,
          },
        ],
      },
    ]);
    expect(sheet.defenses!.sr).toBeUndefined();
  });

  it("a conditional dr Change that evaluates to 0 does NOT materialize a spurious Defenses line (issue #45 finding 2, the dr-at-0 wart)", () => {
    // Reproduces the exact shape of Warlord's Sun-Bronzed Skin: DR 5/- gated
    // on being unarmored (@armor.type == 0). An armored character with no
    // other DR/resistance/SR source used to still get a "DR/— 0" seal,
    // because the conditional Change is collected even when it evaluates to
    // 0 (only ac/skill-shaped always-rendered totals safely absorb a zero
    // component; defenses.ts only materializes the section at all when a
    // dr/resistance/sr entry exists).
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 19 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      // Wearing armor -> @armor.type is 2 (medium) -> the condition is false -> 0.
      gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeUndefined();
  });

  it("the same conditional dr Change DOES show once its condition is met", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 19 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      // No gear at all -> @armor.type resolves to 0 (unarmored).
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeDefined();
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 5,
        qualifier: "—",
        components: [
          {
            source: "Sun-Bronzed Skin",
            sourceId: "sun-bronzed-skin",
            type: "untyped",
            value: 5,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("a conditional dr Change that evaluates to 0 doesn't suppress a real DR source on another qualifier", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 13 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "sun-bronzed-skin",
          name: "Sun-Bronzed Skin",
          changes: [{ formula: "if(eq(@armor.type,0),5,0)", target: "dr", type: "untyped" }],
        },
      ],
      gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
    });
    const sheet = compute(doc, ref);
    expect(sheet.defenses).toBeDefined();
    // Barbarian DR (—) still wins the qualifier (3 > 0); Sun-Bronzed Skin's
    // now-0 contribution stays visible as a losing, unapplied component (same
    // strike-through convention as typed-bonus stacking) rather than either
    // disappearing silently or spuriously creating its OWN "—" entry.
    expect(sheet.defenses!.dr).toEqual([
      {
        total: 3,
        qualifier: "—",
        components: [
          {
            source: "Sun-Bronzed Skin",
            sourceId: "sun-bronzed-skin",
            type: "untyped",
            value: 0,
            applied: false,
          },
          {
            source: "Damage Reduction",
            sourceId: "barbarian-dr",
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("a custom buff granting DR/magic combines with barbarian DR/— as separate qualifiers", () => {
    const doc = makeDoc({
      classes: [{ tag: "barbarian", level: 13 }],
      abilities: ABILITIES,
      activeBuffs: [
        {
          instanceId: "buff-2",
          name: "Stoneskin (homebrew changes)",
          changes: [{ formula: "10", target: "dr.magic", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);

    expect(sheet.defenses!.dr).toHaveLength(2);
    const byQualifier = Object.fromEntries(sheet.defenses!.dr.map((d) => [d.qualifier, d.total]));
    expect(byQualifier).toEqual({ "—": 3, magic: 10 });
  });
});

/**
 * Immunity to things that aren't damage (`immEffect.<slug>`) — hand-authored
 * onto the races in `data-pipeline`'s `SUPPLEMENTAL_RACE_EFFECT_IMMUNITY`,
 * since the vendored races carry these only as description prose. Expected
 * values quote the published racial trait each comes from.
 */
describe("compute: non-damage immunities", () => {
  function effectImmunities(race: string): string[] {
    const sheet = compute(makeDoc({ classes: [], abilities: ABILITIES, race }), ref);
    return (sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier).sort();
  }

  it("gives an elf immunity to magic sleep (Elven Immunities)", () => {
    expect(effectImmunities("Elf")).toEqual(["magicSleep"]);
  });

  it("gives a half-elf the same, via elf blood", () => {
    expect(effectImmunities("Half-Elf")).toEqual(["magicSleep"]);
  });

  it("gives a duergar paralysis, phantasms, and poison (Duergar Immunities)", () => {
    expect(effectImmunities("Duergar")).toEqual(["paralysis", "phantasms", "poison"]);
  });

  it("gives an android all six of its Constructed/Emotionless immunities", () => {
    expect(effectImmunities("Android")).toEqual([
      "disease",
      "emotion",
      "exhaustion",
      "fatigue",
      "fear",
      "sleep",
    ]);
  });

  it("gives a being of Ib immunity to critical hits and precision damage", () => {
    expect(effectImmunities("Being of Ib")).toEqual(["criticalHits", "precisionDamage"]);
  });

  it("gives a human none", () => {
    expect(effectImmunities("Human")).toEqual([]);
  });

  it("does not give a plant-type race the immunities its type would normally carry", () => {
    // Ghoran's own prose exists to say it LACKS them.
    expect(effectImmunities("Ghoran")).toEqual([]);
  });

  it("names its source, so the sheet can say where the immunity came from", () => {
    const sheet = compute(makeDoc({ classes: [], abilities: ABILITIES, race: "Elf" }), ref);
    const entry = sheet.defenses!.effectImmunities!.find((e) => e.qualifier === "magicSleep")!;
    expect(entry.components.some((c) => c.applied && c.source === "Elf")).toBe(true);
  });

  it("keeps effect immunity out of damage-type immunity entirely", () => {
    const sheet = compute(makeDoc({ classes: [], abilities: ABILITIES, race: "Duergar" }), ref);
    expect(sheet.defenses!.immunities).toBeUndefined();
  });
});

/**
 * Class-feature non-damage immunities — hand-authored in `data-pipeline`'s
 * `SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY`, prose-only upstream. Expected
 * values quote the published class feature each comes from; level gating is
 * the feature grant's own level, so each case asserts the level just below
 * the grant stays clean.
 */
describe("compute: class-feature non-damage immunities", () => {
  function classImmunities(tag: string, level: number): string[] {
    const sheet = compute(makeDoc({ classes: [{ tag, level }], abilities: ABILITIES }), ref);
    return (sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier).sort();
  }

  it("every immEffect slug in the vendored data is in the engine's closed vocabulary", () => {
    // defenses.ts silently drops an unknown slug, so a typo'd supplement
    // would otherwise vanish rather than fail.
    const slugs = new Set(
      Object.values(ref.classFeatures)
        .flatMap((f) => f.changes)
        .map((c) => c.target)
        .filter((t) => t.startsWith("immEffect."))
        .map((t) => t.slice("immEffect.".length)),
    );
    for (const slug of slugs) expect(EFFECT_IMMUNITY_LABELS[slug]).toBeDefined();
  });

  it("gives a 3rd-level paladin disease and fear immunity (Divine Health, Aura of Courage)", () => {
    // "is immune to all diseases" / "is immune to fear (magical or
    // otherwise)", both gained at 3rd (CRB, paladin).
    expect(classImmunities("paladin", 3)).toEqual(["disease", "fear"]);
    expect(classImmunities("paladin", 2)).toEqual([]);
  });

  it("adds charm at paladin 8 (Aura of Resolve) and compulsion at 17 (Aura of Righteousness)", () => {
    // "immune to charm spells and spell-like abilities" at 8th; "immunity to
    // compulsion spells and spell-like abilities" at 17th (CRB, paladin).
    expect(classImmunities("paladin", 8)).toEqual(["charm", "disease", "fear"]);
    expect(classImmunities("paladin", 16)).toEqual(["charm", "disease", "fear"]);
    expect(classImmunities("paladin", 17)).toEqual(["charm", "compulsion", "disease", "fear"]);
  });

  it("gives a monk disease at 5 (Purity of Body) and poison at 11 (Diamond Body)", () => {
    // "immunity to all diseases" at 5th; "immunity to poisons of all kinds"
    // at 11th (CRB, monk).
    expect(classImmunities("monk", 4)).toEqual([]);
    expect(classImmunities("monk", 5)).toEqual(["disease"]);
    expect(classImmunities("monk", 11)).toEqual(["disease", "poison"]);
  });

  it("gives an unchained monk Purity of Body too (shared feature), but never Diamond Body", () => {
    // The unchained monk keeps Purity of Body at 5th; Diamond Body became an
    // optional ki power rather than a granted feature (Pathfinder Unchained).
    expect(classImmunities("monkUnchained", 5)).toEqual(["disease"]);
    expect(classImmunities("monkUnchained", 11)).toEqual(["disease"]);
  });

  it("gives a druid poison at 9 (Venom Immunity) and magical-aging at 15 (Timeless Body)", () => {
    // "immunity to all poisons" at 9th; "cannot be magically aged" at 15th
    // (CRB, druid).
    expect(classImmunities("druid", 9)).toEqual(["poison"]);
    expect(classImmunities("druid", 15)).toEqual(["magicalAging", "poison"]);
  });

  it("gives an alchemist poison immunity at 10 and an investigator the same at 11", () => {
    // "becomes completely immune to poison" — Poison Immunity, one shared
    // feature granted at alchemist 10 (APG) / investigator 11 (ACG).
    expect(classImmunities("alchemist", 9)).toEqual([]);
    expect(classImmunities("alchemist", 10)).toEqual(["poison"]);
    expect(classImmunities("investigator", 10)).toEqual([]);
    expect(classImmunities("investigator", 11)).toEqual(["poison"]);
  });

  it("gives an antipaladin disease immunity at 3 (Plague Bringer)", () => {
    // "does not take any damage or take any penalty from diseases" (APG);
    // the still-a-carrier nuance stays in the feature's own prose.
    expect(classImmunities("antipaladin", 3)).toEqual(["disease"]);
  });

  it("stacks race and class sources on one sheet", () => {
    // An elf paladin 3 has the racial magic-sleep immunity alongside both
    // 3rd-level aura grants.
    const sheet = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 3 }], abilities: ABILITIES, race: "Elf" }),
      ref,
    );
    const qualifiers = (sheet.defenses?.effectImmunities ?? []).map((e) => e.qualifier).sort();
    expect(qualifiers).toEqual(["disease", "fear", "magicSleep"]);
  });

  it("names the granting feature as the source", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 3 }], abilities: ABILITIES }),
      ref,
    );
    const entry = sheet.defenses!.effectImmunities!.find((e) => e.qualifier === "fear")!;
    expect(entry.components.some((c) => c.applied && c.source === "Aura of Courage")).toBe(true);
  });
});
