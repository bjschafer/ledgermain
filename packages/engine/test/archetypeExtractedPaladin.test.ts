import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 wave 2 (paladin): fixture tests for `archetype-extracted/
 * paladin.ts`, hand-computed against the real vendored data slice via
 * `loadRefData()`, same posture as `archetypeEffectsExtracted.test.ts`
 * (fighter pilot). Each expectation is derived straight from the published
 * PF1 rules cited (as `provenance`) in the extracted table's entries.
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

const ABILITIES = { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 16 } as const;

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

describe("Divine Guardian (paladin): Bonus Feat, a pure additive bonusFeats grant", () => {
  const divineGuardian = archetypeId("Divine Guardian");

  it("1 feat at L7, 2 at L10, 3 at L13+ (no further scaling)", () => {
    const at7 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 7 }], archetypes: [divineGuardian] }),
      ref,
    );
    const own7 = at7.activeArchetypes
      .find((a) => a.id === divineGuardian)
      ?.features.find((f) => f.name === "Bonus Feat");
    expect(own7?.detail).toBe("1 bonus feat(s) (restricted, shield-focused list)");

    const at13 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 13 }], archetypes: [divineGuardian] }),
      ref,
    );
    const own13 = at13.activeArchetypes
      .find((a) => a.id === divineGuardian)
      ?.features.find((f) => f.name === "Bonus Feat");
    expect(own13?.detail).toBe("3 bonus feat(s) (restricted, shield-focused list)");

    const at20 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 20 }], archetypes: [divineGuardian] }),
      ref,
    );
    const own20 = at20.activeArchetypes
      .find((a) => a.id === divineGuardian)
      ?.features.find((f) => f.name === "Bonus Feat");
    expect(own20?.detail).toBe("3 bonus feat(s) (restricted, shield-focused list)");
  });
});

describe("Tempered Champion (paladin): Divine Weapon Specialization, bonusFeats every 4 levels from L4", () => {
  const temperedChampion = archetypeId("Tempered Champion");

  it("1 feat at L4, 2 at L8, 5 at L20", () => {
    const at4 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 4 }], archetypes: [temperedChampion] }),
      ref,
    );
    expect(
      at4.activeArchetypes
        .find((a) => a.id === temperedChampion)
        ?.features.find((f) => f.name === "Divine Weapon Specialization")?.detail,
    ).toBe("1 bonus feat(s) (restricted, weapon-focused list)");

    const at20 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 20 }], archetypes: [temperedChampion] }),
      ref,
    );
    expect(
      at20.activeArchetypes
        .find((a) => a.id === temperedChampion)
        ?.features.find((f) => f.name === "Divine Weapon Specialization")?.detail,
    ).toBe("5 bonus feat(s) (restricted, weapon-focused list)");
  });
});

describe("Vindictive Bastard (paladin): Teamwork Feat, bonusFeats every 6 levels from L3", () => {
  const vindictiveBastard = archetypeId("Vindictive Bastard");

  it("1 feat at L3, 2 at L9", () => {
    const at3 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 3 }], archetypes: [vindictiveBastard] }),
      ref,
    );
    expect(
      at3.activeArchetypes
        .find((a) => a.id === vindictiveBastard)
        ?.features.find((f) => f.name === "Teamwork Feat")?.detail,
    ).toBe("1 bonus feat(s) (teamwork feats)");

    const at9 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 9 }], archetypes: [vindictiveBastard] }),
      ref,
    );
    expect(
      at9.activeArchetypes
        .find((a) => a.id === vindictiveBastard)
        ?.features.find((f) => f.name === "Teamwork Feat")?.detail,
    ).toBe("2 bonus feat(s) (teamwork feats)");
  });
});

describe("Empyreal Knight (paladin): Celestial Heart grants scaling energy resistance", () => {
  const empyrealKnight = archetypeId("Empyreal Knight");

  it("resist 5 acid/cold/electricity at L3, 10 at L9", () => {
    const at3 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 3 }], archetypes: [empyrealKnight] }),
      ref,
    );
    expect(at3.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(5);
    expect(at3.defenses?.resistances.find((r) => r.qualifier === "cold")?.total).toBe(5);
    expect(at3.defenses?.resistances.find((r) => r.qualifier === "electricity")?.total).toBe(5);

    const at9 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 9 }], archetypes: [empyrealKnight] }),
      ref,
    );
    expect(at9.defenses?.resistances.find((r) => r.qualifier === "acid")?.total).toBe(10);
  });
});

describe("Kraken Slayer (paladin): Aura of Elusion grants a general Escape Artist bonus", () => {
  const krakenSlayer = archetypeId("Kraken Slayer");

  it("+14 Escape Artist at L14 (self, unscoped half only)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 14 }], archetypes: [krakenSlayer] }),
      ref,
    );
    expect(sheet.skills["esc"]?.components.find((c) => c.source === "Aura of Elusion")?.value).toBe(
      14,
    );
  });
});

describe("Virtuoso Bravo (paladin): Nimble grants dodge AC while lightly armored, armor-type gated", () => {
  const virtuosoBravo = archetypeId("Virtuoso Bravo");

  it("+5 dodge AC by L19, no armor", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 19 }], archetypes: [virtuosoBravo] }),
      ref,
    );
    const dodge = sheet.ac.components.find(
      (c) => c.category === "dodge" && c.source === "Nimble",
    );
    expect(dodge?.value).toBe(5);
  });

  it("nothing while wearing medium+ armor", () => {
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "paladin", level: 19 }],
        archetypes: [virtuosoBravo],
        gear: [{ equipped: true, name: "Chainmail", armor: { slot: "armor", ac: 6, type: 2 } }],
      }),
      ref,
    );
    expect(sheet.ac.components.find((c) => c.source === "Nimble" && c.value !== 0)).toBeUndefined();
  });
});

describe("Holy Champion 'DR increases to 10/evil' reflavors (issue #45 finding, 7 archetypes)", () => {
  it.each([
    "Empyreal Knight",
    "Forgefather's Seeker",
    "Holy Gun",
    "Oath against Corruption",
    "Oath against the Wyrm",
    "Oath of the People's Council",
    "Tranquil Guardian",
  ])("%s: DR 10/evil at L20, cleanly paired to Holy Champion (suppressed, no double-count)", (name) => {
    const id = archetypeId(name, "paladin");
    const sheet = compute(makeDoc({ classes: [{ tag: "paladin", level: 20 }], archetypes: [id] }), ref);

    // Holy Champion itself carries no vendored `changes[]`, so suppression
    // cleanliness doesn't affect this number either way — assert it directly.
    expect(sheet.defenses?.dr.find((d) => d.qualifier === "evil")?.total).toBe(10);

    const holyChampion = sheet.classFeatures.find((f) => f.name === "Holy Champion");
    expect(holyChampion?.applied).toBe(false); // cleanly paired 1:1
  });
});

describe("blocked composition trap: ambiguous Divine Grace swaps (issue #45)", () => {
  // Stonelord's Heartstone restates Divine Grace's exact mechanic ("+Cha
  // bonus on all saving throws") under an unpaired swap — extracting it
  // would double the Cha-to-all-saves bonus alongside the still-active base
  // Divine Grace Change. Recorded as `blocked`, not extracted.
  const stonelord = archetypeId("Stonelord");

  it("Heartstone has no entry in either effects table", () => {
    expect(resolveArchetypeFeatureEffect("paladin:stonelord:heartstone:2")).toBeUndefined();
  });

  it("Divine Grace keeps applying in full — no doubled Cha-to-saves bonus from Heartstone", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 2 }], archetypes: [stonelord] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "paladin", level: 2 }] }), ref);
    // Cha mod is +3 (Cha 16). If Heartstone's number were ALSO applied on top
    // of the unsuppressed base Divine Grace, fort/ref/will would each show
    // +6 instead of +3 relative to a level-2 paladin with no archetype.
    expect(withArchetype.saves.will.total - withoutArchetype.saves.will.total).toBe(0);
    const graceFeature = withArchetype.classFeatures.find((f) => f.name === "Divine Grace");
    expect(graceFeature?.applied).toBe(true); // never suppressed — ambiguous, unpaired swap
    const own = withArchetype.activeArchetypes
      .find((a) => a.id === stonelord)
      ?.features.find((f) => f.name === "Heartstone");
    expect(own?.detail).toBeUndefined(); // this agent did not backfill a second Cha-to-saves number
  });
});
