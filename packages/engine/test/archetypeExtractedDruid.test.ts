import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  ARCHETYPE_FEATURE_EFFECTS,
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  compute,
  resolveArchetypeFeatureEffect,
} from "../src/index.js";

/**
 * Issue #45 (druid wave, 2026-07-06): fixture tests for
 * `archetype-extracted/druid.ts`, hand-computed against the real vendored
 * data slice via `loadRefData()`, same posture as
 * `archetypeEffectsExtracted.test.ts` (the fighter pilot's fixture file).
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

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 14, cha: 10 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
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
      race: raceId("Human"),
      classes: over.classes,
    },
    abilities: ABILITIES,
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

describe("Cave Druid: Cavesense grants a flat Knowledge (dungeoneering) / Survival bonus", () => {
  const caveDruid = archetypeId("Cave Druid");

  it("+2 Knowledge (dungeoneering) and Survival at L1, unconditional", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 1 }], archetypes: [caveDruid] }),
      ref,
    );
    expect(sheet.skills["kdu"]?.components.find((c) => c.source === "Cavesense")?.value).toBe(2);
    expect(sheet.skills["sur"]?.components.find((c) => c.source === "Cavesense")?.value).toBe(2);
  });
});

describe("Halcyon Druid: Peacekeeper grants a scaling min-1 Diplomacy / Knowledge (local) bonus", () => {
  const halcyonDruid = archetypeId("Halcyon Druid");

  it("min +1 at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 1 }], archetypes: [halcyonDruid] }),
      ref,
    );
    expect(sheet.skills["dip"]?.components.find((c) => c.source === "Peacekeeper")?.value).toBe(1);
    expect(sheet.skills["klo"]?.components.find((c) => c.source === "Peacekeeper")?.value).toBe(1);
  });

  it("+6 at L12 (floor(12/2))", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 12 }], archetypes: [halcyonDruid] }),
      ref,
    );
    expect(sheet.skills["dip"]?.components.find((c) => c.source === "Peacekeeper")?.value).toBe(6);
  });
});

describe("Mooncaller: Wolfsbane grants a scaling DR/silver", () => {
  const mooncaller = archetypeId("Mooncaller");

  it("DR 3/silver at L13", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 13 }], archetypes: [mooncaller] }),
      ref,
    );
    expect(sheet.defenses?.dr).toEqual([
      {
        total: 3,
        qualifier: "silver",
        components: [
          {
            source: "Wolfsbane",
            sourceId: expect.any(String),
            type: "untyped",
            value: 3,
            applied: true,
          },
        ],
      },
    ]);
  });

  it("DR 4/silver at L16, DR 5/silver at L19", () => {
    const at16 = compute(
      makeDoc({ classes: [{ tag: "druid", level: 16 }], archetypes: [mooncaller] }),
      ref,
    );
    expect(at16.defenses?.dr[0]?.total).toBe(4);

    const at19 = compute(
      makeDoc({ classes: [{ tag: "druid", level: 19 }], archetypes: [mooncaller] }),
      ref,
    );
    expect(at19.defenses?.dr[0]?.total).toBe(5);
  });
});

describe("shaman family: 9th-level bonus feat, restricted list (Bear Shaman spot-check)", () => {
  const bearShaman = archetypeId("Bear Shaman");

  it("1 bonus feat at L9, 2 at L13", () => {
    const at9 = compute(
      makeDoc({ classes: [{ tag: "druid", level: 9 }], archetypes: [bearShaman] }),
      ref,
    );
    const at9NoArch = compute(makeDoc({ classes: [{ tag: "druid", level: 9 }] }), ref);
    // bonusFeats is consumed outside compute() by apps/web's feats budget model,
    // so assert via the resolved effect's own formula evaluation instead of a
    // DerivedSheet field (same posture the fighter fixture file uses for
    // bonusFeats-shaped entries via Crusader/ranger Combat Style precedent).
    expect(at9).toBeDefined();
    expect(at9NoArch).toBeDefined();
    const resolved = resolveArchetypeFeatureEffect("druid:bear-shaman:bonus-feat:9");
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.effect.detail?.(9)).toBe("1 bonus feat(s) (restricted list)");
    expect(resolved?.effect.detail?.(13)).toBe("2 bonus feat(s) (restricted list)");
  });
});

describe("Aquatic Druid: Natural Swimmer/Seaborn composition (same-archetype swimSpeed, not double-counted)", () => {
  const aquaticDruid = archetypeId("Aquatic Druid");

  it("swim speed = half land speed at L3", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 3 }], archetypes: [aquaticDruid] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "druid", level: 3 }] }), ref);
    const land = withoutArchetype.speeds.land ?? 0;
    expect(sheet.speeds.swim).toBe(Math.floor(land / 2));
  });

  it("swim speed = full land speed at L9+, not 1.5x (seaborn doesn't double up on natural-swimmer)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 9 }], archetypes: [aquaticDruid] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "druid", level: 9 }] }), ref);
    expect(sheet.speeds.swim).toBe(withoutArchetype.speeds.land);
  });
});

describe("Plains Druid: Run Like the Wind grants +10 land speed while light/no armor (@armor.type gate)", () => {
  const plainsDruid = archetypeId("Plains Druid");

  it("+10 land speed unarmored at L3", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "druid", level: 3 }], archetypes: [plainsDruid] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "druid", level: 3 }] }), ref);
    expect((sheet.speeds.land ?? 0) - (withoutArchetype.speeds.land ?? 0)).toBe(10);
  });

  it("no bonus in medium armor", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "druid", level: 3 }],
        archetypes: [plainsDruid],
        gear: [{ equipped: true, name: "Hide Armor", armor: { slot: "armor", ac: 3, type: 2 } }],
      }),
      ref,
    );
    const withoutArchetype = compute(
      makeDoc({
        classes: [{ tag: "druid", level: 3 }],
        gear: [{ equipped: true, name: "Hide Armor", armor: { slot: "armor", ac: 3, type: 2 } }],
      }),
      ref,
    );
    expect(sheet.speeds.land).toBe(withoutArchetype.speeds.land);
  });
});

describe("resolveArchetypeFeatureEffect precedence: Menhir Savant's Spirit Sense stays hand-verified", () => {
  it("hand-verified table wins; druid.ts's extracted table has no entry for it", () => {
    const resolved = resolveArchetypeFeatureEffect("druid:menhir-savant:spirit-sense:1");
    expect(resolved?.source).toBe("verified");
    expect(
      ARCHETYPE_FEATURE_EFFECTS_EXTRACTED["druid:menhir-savant:spirit-sense:1"],
    ).toBeUndefined();
    expect(ARCHETYPE_FEATURE_EFFECTS["druid:menhir-savant:spirit-sense:1"]).toBeDefined();
  });
});
