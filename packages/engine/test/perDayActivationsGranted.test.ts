/**
 * Hand-computed fixture tests for the "granted" per-day activation shard
 * (`per-day-activations/granted.ts`) — three wizard arcane-school powers
 * whose vendored `uses.maxFormula` derives a pool row on the school power
 * itself, wired as toggles on that row.
 *
 * RAW numbers exercised here (all verified against the vendored
 * `class-features.json` description text, 2026-08-16):
 *   - Protective Ward (Abjuration arcane school, Core Rulebook), granted at
 *     wizard level 1 (school grant level 0): "you can create a 10-foot-
 *     radius field of protective magic centered on you... All allies in
 *     this area (including you) receive a +1 deflection bonus to their
 *     Armor Class. This bonus increases by +1 for every five wizard levels
 *     you possess."
 *   - Perfection of Self (Enhancement subschool, Transmutation arcane
 *     school, Advanced Player's Guide), granted at
 *     wizard level 8: "as a swift action you can grant yourself an
 *     enhancement bonus to a single ability score equal to 1/2 your wizard
 *     level (maximum +10) for one round."
 *   - Shape Emotions (Manipulator subschool, Enchantment arcane school,
 *     Advanced Player's Guide), granted at wizard
 *     level 8: ward mode grants "you and your allies within this aura...
 *     a +4 morale bonus on saves against mind-affecting spells and
 *     effects."
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, perDayActivationToggleOptions } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

function makeWizard(opts: {
  level: number;
  wizardSchool?: string;
  wizardFocusedSchool?: string;
  activeBuffs?: ActiveBuff[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "per-day-activations-granted-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "wizard", level: opts.level }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      wizardSchool: opts.wizardSchool,
      wizardFocusedSchool: opts.wizardFocusedSchool,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  } as CharacterDoc;
}

function activeBuffFor(option: {
  id: string;
  name: string;
  changes: unknown;
  contextNotes?: unknown;
}): ActiveBuff {
  return {
    instanceId: `buff-${option.id}`,
    effectTag: option.id,
    name: option.name,
    changes: option.changes as ActiveBuff["changes"],
    contextNotes: option.contextNotes as ActiveBuff["contextNotes"],
  };
}

describe("Protective Ward (Abjuration arcane school)", () => {
  it("surfaces a single 'ward' toggle for an Abjuration wizard", () => {
    const options = perDayActivationToggleOptions("qIFUwyCjea79rUri", "wizard", 5);
    expect(options.map((o) => o.id)).toEqual(["perDay:qIFUwyCjea79rUri:ward"]);
  });

  it("toggling it on at level 4 applies +1 deflection AC (below the 5-level tier bump)", () => {
    const options = perDayActivationToggleOptions("qIFUwyCjea79rUri", "wizard", 4);
    const ward = options.find((o) => o.id === "perDay:qIFUwyCjea79rUri:ward")!;
    const noBuff = compute(makeWizard({ level: 4, wizardSchool: "abj" }), ref);
    const withBuff = compute(
      makeWizard({ level: 4, wizardSchool: "abj", activeBuffs: [activeBuffFor(ward)] }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(1);
  });

  it("toggling it on at level 10 applies +3 deflection AC (two 5-level tier bumps)", () => {
    const options = perDayActivationToggleOptions("qIFUwyCjea79rUri", "wizard", 10);
    const ward = options.find((o) => o.id === "perDay:qIFUwyCjea79rUri:ward")!;
    const noBuff = compute(makeWizard({ level: 10, wizardSchool: "abj" }), ref);
    const withBuff = compute(
      makeWizard({ level: 10, wizardSchool: "abj", activeBuffs: [activeBuffFor(ward)] }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(3);
  });
});

describe("Perfection of Self (Enhancement subschool, Transmutation arcane school)", () => {
  it("surfaces six ability-score toggles for an Enhancement-focused wizard at level 8", () => {
    const options = perDayActivationToggleOptions("qzCj0dGiKmIMw4wf", "wizard", 8);
    expect(options.map((o) => o.id)).toEqual([
      "perDay:qzCj0dGiKmIMw4wf:str",
      "perDay:qzCj0dGiKmIMw4wf:dex",
      "perDay:qzCj0dGiKmIMw4wf:con",
      "perDay:qzCj0dGiKmIMw4wf:int",
      "perDay:qzCj0dGiKmIMw4wf:wis",
      "perDay:qzCj0dGiKmIMw4wf:cha",
    ]);
  });

  it("toggling the Strength option on at level 8 applies +4 enhancement Strength (floor(8/2))", () => {
    const options = perDayActivationToggleOptions("qzCj0dGiKmIMw4wf", "wizard", 8);
    const str = options.find((o) => o.id === "perDay:qzCj0dGiKmIMw4wf:str")!;
    const noBuff = compute(
      makeWizard({ level: 8, wizardSchool: "trs", wizardFocusedSchool: "Enhancement" }),
      ref,
    );
    const withBuff = compute(
      makeWizard({
        level: 8,
        wizardSchool: "trs",
        wizardFocusedSchool: "Enhancement",
        activeBuffs: [activeBuffFor(str)],
      }),
      ref,
    );
    expect(withBuff.abilities.str.total - noBuff.abilities.str.total).toBe(4);
  });

  it("caps at +10 well above 20th level (min(10, floor(level/2)) at level 30)", () => {
    // Epic-range level to exercise the maximum-+10 cap; the wizard class
    // itself only goes to 20, but the formula's cap is worth pinning down.
    const options = perDayActivationToggleOptions("qzCj0dGiKmIMw4wf", "wizard", 30);
    const cha = options.find((o) => o.id === "perDay:qzCj0dGiKmIMw4wf:cha")!;
    const withBuff = compute(
      makeWizard({
        level: 30,
        wizardSchool: "trs",
        wizardFocusedSchool: "Enhancement",
        activeBuffs: [activeBuffFor(cha)],
      }),
      ref,
    );
    const noBuff = compute(
      makeWizard({ level: 30, wizardSchool: "trs", wizardFocusedSchool: "Enhancement" }),
      ref,
    );
    expect(withBuff.abilities.cha.total - noBuff.abilities.cha.total).toBe(10);
  });
});

describe("Shape Emotions (Manipulator subschool, Enchantment arcane school)", () => {
  it("surfaces a single 'ward' toggle for a Manipulator-focused wizard at level 8", () => {
    const options = perDayActivationToggleOptions("Lz9i4zNAH50umw3s", "wizard", 8);
    expect(options.map((o) => o.id)).toEqual(["perDay:Lz9i4zNAH50umw3s:ward"]);
  });

  it("toggling it on applies +4 morale on saves against mind-affecting effects", () => {
    const options = perDayActivationToggleOptions("Lz9i4zNAH50umw3s", "wizard", 8);
    const ward = options.find((o) => o.id === "perDay:Lz9i4zNAH50umw3s:ward")!;
    const doc = makeWizard({
      level: 8,
      wizardSchool: "enc",
      wizardFocusedSchool: "Manipulator",
      activeBuffs: [activeBuffFor(ward)],
    });
    const sheet = compute(doc, ref);
    const mindLine = sheet.saves.will.conditionals?.find((c) => c.categories.includes("mind"));
    // `conditionals[].total` is the FULL stacked Will save in that situation,
    // not a delta — compare against the ordinary (non-mind-affecting) Will
    // total to isolate the +4 morale bonus.
    expect((mindLine?.total ?? 0) - sheet.saves.will.total).toBe(4);
  });

  it("a plain Enchantment wizard (no Manipulator focus) never gets this pool row at all — Aura of Despair fills the 8th-level slot instead", () => {
    const doc = makeWizard({ level: 8, wizardSchool: "enc" });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.id === "Lz9i4zNAH50umw3s")).toBeUndefined();
    expect(pools.find((p) => p.id === "75Y2PY8Uha3o0fHE")).toBeDefined();
  });
});

describe("perDayActivationToggleOptions: granting-class and level gates (granted shard)", () => {
  it("a non-wizard with a stale wizardSchool field gets nothing (no wizard levels to grant the school)", () => {
    const doc = makeWizard({ level: 5, wizardSchool: "abj" });
    const fighter: CharacterDoc = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 5 }] },
    };
    const sheet = compute(fighter, ref);
    const pools = deriveResourcePools(fighter, ref, sheet.abilities);
    // No wizard levels at all, so no Abjuration school features are granted
    // in the first place — the pool row itself never derives, independent
    // of the toggle factory.
    expect(pools.find((p) => p.id === "qIFUwyCjea79rUri")).toBeUndefined();
  });

  it("a 7th-level wizard (below Perfection of Self's own 8th-level grant) never gets that pool row either", () => {
    const doc = makeWizard({
      level: 7,
      wizardSchool: "trs",
      wizardFocusedSchool: "Enhancement",
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    // No `minLevel` is set on this def — the grant's OWN level gate (8th) is
    // what keeps the pool row (and thus the toggle) from surfacing below
    // that level, not anything in the toggle factory itself.
    expect(pools.find((p) => p.id === "qzCj0dGiKmIMw4wf")).toBeUndefined();
  });
});
