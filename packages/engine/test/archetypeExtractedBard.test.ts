import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveArchetypeFeatureEffect } from "../src/index.js";

/**
 * Issue #45 bard wave: fixture tests for `archetype-extracted/bard.ts`,
 * hand-computed against the real vendored data slice via `loadRefData()`,
 * same posture as `archetypeEffectsExtracted.test.ts` (the fighter pilot).
 * Each expectation is derived straight from the published PF1 rules cited
 * (as `provenance`) in the extracted table's entries.
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

const ABILITIES = { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 16 } as const;

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  archetypes?: string[];
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
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Archaeologist (bard): Clever Explorer grants +1/2 level Disable Device/Perception", () => {
  const archaeologist = archetypeId("Archaeologist", "bard");

  it("+2 at L5", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 5 }], archetypes: [archaeologist] }),
      ref,
    );
    expect(sheet.skills["dev"]?.components.find((c) => c.source === "Clever Explorer")?.value).toBe(
      2,
    );
    expect(sheet.skills["per"]?.components.find((c) => c.source === "Clever Explorer")?.value).toBe(
      2,
    );
  });
});

describe("Brazen Deceiver (bard): Shameless Scoundrel grants +1/2 level (min 1) on Bluff/Disguise/Stealth", () => {
  const brazenDeceiver = archetypeId("Brazen Deceiver", "bard");

  it("minimum +1 even at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 1 }], archetypes: [brazenDeceiver] }),
      ref,
    );
    expect(
      sheet.skills["blf"]?.components.find((c) => c.source === "Shameless Scoundrel")?.value,
    ).toBe(1);
    expect(
      sheet.skills["dis"]?.components.find((c) => c.source === "Shameless Scoundrel")?.value,
    ).toBe(1);
    expect(
      sheet.skills["ste"]?.components.find((c) => c.source === "Shameless Scoundrel")?.value,
    ).toBe(1);
  });

  it("+4 at L8", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 8 }], archetypes: [brazenDeceiver] }),
      ref,
    );
    expect(
      sheet.skills["blf"]?.components.find((c) => c.source === "Shameless Scoundrel")?.value,
    ).toBe(4);
  });
});

describe("Daredevil (bard): Agile replaces bardic knowledge with a non-overlapping bonus", () => {
  const daredevil = archetypeId("Daredevil", "bard");

  it("+2 Acrobatics/Bluff/Climb/Escape Artist at L4 (min 1, floor(4/2)=2)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 4 }], archetypes: [daredevil] }),
      ref,
    );
    expect(sheet.skills["acr"]?.components.find((c) => c.source === "Agile")?.value).toBe(2);
    expect(sheet.skills["esc"]?.components.find((c) => c.source === "Agile")?.value).toBe(2);
  });

  it("Bardic Knowledge itself still applies (unpaired swap — pre-existing gap, not worsened by this extraction)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 4 }], archetypes: [daredevil] }),
      ref,
    );
    // Bardic Knowledge fans out to every Knowledge subskill; confirm it's
    // still contributing on top of Agile's (non-overlapping) skills.
    expect(
      sheet.skills["kar"]?.components.find((c) => c.source === "Bardic Knowledge"),
    ).toBeDefined();
  });
});

describe("Dragon Herald (bard): Dragon Voice grants +1/2 level on Intimidate/Diplomacy", () => {
  const dragonHerald = archetypeId("Dragon Herald", "bard");

  it("+3 at L6", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 6 }], archetypes: [dragonHerald] }),
      ref,
    );
    expect(sheet.skills["int"]?.components.find((c) => c.source === "Dragon Voice")?.value).toBe(3);
    expect(sheet.skills["dip"]?.components.find((c) => c.source === "Dragon Voice")?.value).toBe(3);
  });
});

describe("Voice of Brigh (bard): Brigh's Knowledge stacks with Bardic Knowledge (both untyped)", () => {
  const voiceOfBrigh = archetypeId("Voice of Brigh", "bard");

  it("Knowledge (arcana) totals BOTH Bardic Knowledge and Brigh's Knowledge at L10", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "bard", level: 10 }], archetypes: [voiceOfBrigh] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "bard", level: 10 }] }), ref);
    // Bardic Knowledge alone at L10: floor(10/2) = 5. Brigh's Knowledge adds
    // another +5 (max(1, floor(10/2))) on top since both are untyped and sum.
    const brighComponent = withArchetype.skills["kar"]?.components.find(
      (c) => c.source === "Brigh's Knowledge",
    );
    expect(brighComponent?.value).toBe(5);
    expect(
      (withArchetype.skills["kar"]?.total ?? 0) - (withoutArchetype.skills["kar"]?.total ?? 0),
    ).toBe(5);
  });
});

describe("Wasteland Chronicler (bard): Wasteland Knowledge is purely additive (no bardic-knowledge swap claimed)", () => {
  const wastelandChronicler = archetypeId("Wasteland Chronicler", "bard");

  it("+1/2 level (min 1) on Knowledge(geography/local/nature/planes)/Survival at L2", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 2 }], archetypes: [wastelandChronicler] }),
      ref,
    );
    expect(
      sheet.skills["kge"]?.components.find((c) => c.source === "Wasteland Knowledge")?.value,
    ).toBe(1);
    expect(
      sheet.skills["sur"]?.components.find((c) => c.source === "Wasteland Knowledge")?.value,
    ).toBe(1);
  });
});

describe("Wit (bard): Way with Words scales +1 every 4 levels, capped at +6", () => {
  const wit = archetypeId("Wit", "bard");

  it("+1 at L1", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 1 }], archetypes: [wit] }),
      ref,
    );
    expect(sheet.skills["sen"]?.components.find((c) => c.source === "Way with Words")?.value).toBe(
      1,
    );
  });

  it("caps at +6 by L20", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 20 }], archetypes: [wit] }),
      ref,
    );
    expect(sheet.skills["sen"]?.components.find((c) => c.source === "Way with Words")?.value).toBe(
      6,
    );
  });
});

describe("Flamesinger (bard): Wildfire grants scaling enhancement land speed", () => {
  const flamesinger = archetypeId("Flamesinger", "bard");

  it("+10 ft. at L6", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "bard", level: 6 }], archetypes: [flamesinger] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "bard", level: 6 }] }), ref);
    expect((withArchetype.speeds.land ?? 0) - (withoutArchetype.speeds.land ?? 0)).toBe(10);
  });

  it("caps at +25 ft. by L18", () => {
    const withArchetype = compute(
      makeDoc({ classes: [{ tag: "bard", level: 18 }], archetypes: [flamesinger] }),
      ref,
    );
    const withoutArchetype = compute(makeDoc({ classes: [{ tag: "bard", level: 18 }] }), ref);
    expect((withArchetype.speeds.land ?? 0) - (withoutArchetype.speeds.land ?? 0)).toBe(25);
  });
});

describe("Averaka Arbiter / Dwarven Scholar (bard): bonus-feat-count reflavors", () => {
  it("Averaka Arbiter's Versatile Teamwork grants 2 bonus feats at L6", () => {
    const averakaArbiter = archetypeId("Averaka Arbiter", "bard");
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 6 }], archetypes: [averakaArbiter] }),
      ref,
    );
    const feature = sheet.activeArchetypes
      .find((a) => a.id === averakaArbiter)
      ?.features.find((f) => f.name === "Versatile Teamwork");
    expect(feature?.detail).toBe("2 bonus teamwork feat(s)");
  });

  it("Dwarven Scholar's Dwarven Training grants 1 bonus feat at L2", () => {
    const dwarvenScholar = archetypeId("Dwarven Scholar", "bard");
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 2 }], archetypes: [dwarvenScholar] }),
      ref,
    );
    const feature = sheet.activeArchetypes
      .find((a) => a.id === dwarvenScholar)
      ?.features.find((f) => f.name === "Dwarven Training");
    expect(feature?.detail).toBe("1 bonus combat feat(s)");
  });
});

describe("Dervish Dancer (bard): Versatile Dance grants a fixed-Perform-subtype bonus", () => {
  const dervishDancer = archetypeId("Dervish Dancer", "bard");

  it("+3 Perform (dance) at L6", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 6 }], archetypes: [dervishDancer] }),
      ref,
    );
    expect(
      sheet.skills["prf.dance"]?.components.find((c) => c.source === "Versatile Dance")?.value,
    ).toBe(3);
  });
});

describe("Impervious Messenger (bard): Cryptic Whisper models only the Linguistics half", () => {
  const imperviousMessenger = archetypeId("Impervious Messenger", "bard");

  it("+3 Linguistics at L6 (Bluff-to-deliver-secret-messages half not modeled)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 6 }], archetypes: [imperviousMessenger] }),
      ref,
    );
    expect(sheet.skills["lin"]?.components.find((c) => c.source === "Cryptic Whisper")?.value).toBe(
      3,
    );
    expect(
      sheet.skills["blf"]?.components.find((c) => c.source === "Cryptic Whisper"),
    ).toBeUndefined();
  });
});

describe("Court Bard (bard): Heraldic Expertise is blocked (Bardic Knowledge overlap, unpaired swap)", () => {
  const courtBard = archetypeId("Court Bard", "bard");

  it("has no entry in either effects table", () => {
    expect(resolveArchetypeFeatureEffect("bard:court-bard:heraldic-expertise:1")).toBeUndefined();
  });

  it("Bardic Knowledge stays fully applied — no double-count, but also not suppressed as RAW intends", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "bard", level: 10 }], archetypes: [courtBard] }),
      ref,
    );
    // Heraldic Expertise itself carries no `detail` (never backfilled).
    const archEntry = sheet.activeArchetypes.find((a) => a.id === courtBard);
    expect(
      archEntry?.features.find((f) => f.name === "Heraldic Expertise")?.detail,
    ).toBeUndefined();
    // Bardic Knowledge (the feature this archetype claims to replace) is
    // still fully active since the swap is unpaired.
    expect(
      sheet.skills["khi"]?.components.find((c) => c.source === "Bardic Knowledge"),
    ).toBeDefined();
  });
});
