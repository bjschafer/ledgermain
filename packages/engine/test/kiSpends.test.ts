/**
 * Hand-computed fixture tests for the Ki Pool spend-toggle table
 * (`ki-spends.ts`): the base monk/ninja spends (verified against
 * aonprd.com's live Monk/Ninja class pages, 2026-08-16) and the pick-gated
 * Monk Unchained ki-power / ninja-trick spends (`monk-ki-powers.ts` /
 * `ninja-tricks.ts`).
 *
 * RAW numbers exercised here:
 *   - Monk (chained) Ki Pool, 4th level+: "Ki Speed" (+20 land speed,
 *     untyped, 1 round) and "Ki Dodge" (+4 dodge AC, 1 round), 1 ki point/
 *     swift action each.
 *   - Ironskin Monk (`monk:ironskin-monk`) replaces the base Ki Speed option
 *     with a damage bonus vs. objects/constructs (no matching Change target
 *     in this engine, so it drops out entirely rather than being replaced by
 *     anything) — Ki Dodge is untouched.
 *   - Ninja Ki Pool, 2nd level+: "Ki Speed" (+20 land speed, untyped) and
 *     "Ki Stealth" (+4 insight on Stealth, `skill.ste`).
 *   - Monk Unchained's base Ki Pool spend is only an extra flurry attack
 *     (action economy, no Change) — no base tableOptions at all without a
 *     ki-power pick.
 *   - Furious Defense (Monk Unchained ki power, 7th level): +4 dodge AC.
 *   - Herbal Compound (ninja trick, 2nd level): +4 alchemical Will, -2
 *     untyped AC, -2 untyped Reflex (aonprd.com's Ninja Tricks index).
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, kiSpendToggleOptions } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  classTag: string;
  level: number;
  archetypes?: string[];
  monkKiPowers?: string[];
  ninjaTricks?: string[];
  activeBuffs?: ActiveBuff[];
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
      classes: [{ tag: opts.classTag, level: opts.level }],
    },
    abilities: { str: 14, dex: 14, con: 14, int: 10, wis: 14, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      archetypes: opts.archetypes,
      monkKiPowers: opts.monkKiPowers,
      ninjaTricks: opts.ninjaTricks,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
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

describe("kiSpendToggleOptions: monk (chained) base options", () => {
  it("monk L4 sees Ki Speed and Ki Dodge", () => {
    const options = kiSpendToggleOptions("monk", 4, [], [], []);
    expect(options.map((o) => o.id)).toEqual(["kiPool:monk:speed", "kiPool:monk:dodge"]);
  });

  it("monk L3 (below the 4th-level gate) sees nothing", () => {
    expect(kiSpendToggleOptions("monk", 3, [], [], [])).toEqual([]);
  });

  it("monk L4 with the Ironskin Monk archetype loses Ki Speed but keeps Ki Dodge", () => {
    const options = kiSpendToggleOptions("monk", 4, ["monk:ironskin-monk"], [], []);
    expect(options.map((o) => o.id)).toEqual(["kiPool:monk:dodge"]);
  });

  it("monk L4 with the Maneuver Master archetype keeps the full base menu (vendored Ki Pool rows under this id are Ironskin Monk contamination, not a real replacement)", () => {
    const options = kiSpendToggleOptions("monk", 4, ["monk:maneuver-master"], [], []);
    expect(options.map((o) => o.id)).toEqual(["kiPool:monk:speed", "kiPool:monk:dodge"]);
  });

  it("toggling Ki Dodge on applies +4 dodge AC through compute()", () => {
    const options = kiSpendToggleOptions("monk", 4, [], [], []);
    const dodge = options.find((o) => o.id === "kiPool:monk:dodge")!;
    const noBuff = compute(makeDoc({ classTag: "monk", level: 4 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "monk", level: 4, activeBuffs: [activeBuffFor(dodge)] }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(4);
  });

  it("toggling Ki Speed on applies +20 land speed through compute()", () => {
    const options = kiSpendToggleOptions("monk", 4, [], [], []);
    const speed = options.find((o) => o.id === "kiPool:monk:speed")!;
    const noBuff = compute(makeDoc({ classTag: "monk", level: 4 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "monk", level: 4, activeBuffs: [activeBuffFor(speed)] }),
      ref,
    );
    expect((withBuff.speeds.land ?? 0) - (noBuff.speeds.land ?? 0)).toBe(20);
  });
});

describe("kiSpendToggleOptions: ninja base options", () => {
  it("ninja L2 sees Ki Speed and Ki Stealth", () => {
    const options = kiSpendToggleOptions("ninja", 2, [], [], []);
    expect(options.map((o) => o.id)).toEqual(["kiPool:ninja:speed", "kiPool:ninja:stealth"]);
  });

  it("ninja L1 (below the 2nd-level gate) sees nothing", () => {
    expect(kiSpendToggleOptions("ninja", 1, [], [], [])).toEqual([]);
  });

  it("toggling Ki Stealth on applies +4 insight Stealth through compute()", () => {
    const options = kiSpendToggleOptions("ninja", 2, [], [], []);
    const stealth = options.find((o) => o.id === "kiPool:ninja:stealth")!;
    const noBuff = compute(makeDoc({ classTag: "ninja", level: 2 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "ninja", level: 2, activeBuffs: [activeBuffFor(stealth)] }),
      ref,
    );
    expect(withBuff.skills["ste"]!.total - noBuff.skills["ste"]!.total).toBe(4);
  });
});

describe("kiSpendToggleOptions: monk unchained has no base spend", () => {
  it("monk unchained L3 with no ki-power picks gets an empty table", () => {
    expect(kiSpendToggleOptions("monkUnchained", 3, [], [], [])).toEqual([]);
  });

  it("deriveResourcePools surfaces no tableOptions at all (undefined, not [])", () => {
    const doc = makeDoc({ classTag: "monkUnchained", level: 3 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const kiPool = pools.find((p) => p.name === "Ki Pool (UC)");
    expect(kiPool).toBeDefined();
    expect(kiPool!.tableOptions).toBeUndefined();
  });
});

describe("kiSpendToggleOptions: monk unchained ki-power picks", () => {
  it("furiousDefense pick surfaces its spend toggle", () => {
    const options = kiSpendToggleOptions("monkUnchained", 7, [], ["furiousDefense"], []);
    expect(options.map((o) => o.id)).toEqual(["kiPool:kiPower:furiousDefense"]);
  });

  it("deriveResourcePools surfaces the furiousDefense toggle once picked", () => {
    const doc = makeDoc({ classTag: "monkUnchained", level: 7, monkKiPowers: ["furiousDefense"] });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const kiPool = pools.find((p) => p.name === "Ki Pool (UC)");
    expect(kiPool!.tableOptions?.map((o) => o.id)).toEqual(["kiPool:kiPower:furiousDefense"]);
  });

  it("toggling the furiousDefense spend on applies +4 dodge AC through compute()", () => {
    const options = kiSpendToggleOptions("monkUnchained", 7, [], ["furiousDefense"], []);
    const furiousDefense = options.find((o) => o.id === "kiPool:kiPower:furiousDefense")!;
    const noBuff = compute(makeDoc({ classTag: "monkUnchained", level: 7 }), ref);
    const withBuff = compute(
      makeDoc({
        classTag: "monkUnchained",
        level: 7,
        activeBuffs: [activeBuffFor(furiousDefense)],
      }),
      ref,
    );
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(4);
  });

  it("a pick below its own minLevel doesn't surface a toggle", () => {
    // Diamond Soul requires 12th level; a 7th-level unchained monk can't
    // actually have picked it, but the factory double-checks anyway.
    expect(kiSpendToggleOptions("monkUnchained", 7, [], ["diamondSoul"], [])).toEqual([]);
  });

  it("Diamond Soul applies spell resistance equal to monk level + 10 through compute()", () => {
    const options = kiSpendToggleOptions("monkUnchained", 12, [], ["diamondSoul"], []);
    const diamondSoul = options.find((o) => o.id === "kiPool:kiPower:diamondSoul")!;
    const withBuff = compute(
      makeDoc({
        classTag: "monkUnchained",
        level: 12,
        activeBuffs: [activeBuffFor(diamondSoul)],
      }),
      ref,
    );
    expect(withBuff.defenses?.sr?.total).toBe(22);
  });

  it("Diamond Resilience grants DR 2/- below 16th level", () => {
    const options = kiSpendToggleOptions("monkUnchained", 12, [], ["diamondResilience"], []);
    const diamondResilience = options.find((o) => o.id === "kiPool:kiPower:diamondResilience")!;
    const withBuff = compute(
      makeDoc({
        classTag: "monkUnchained",
        level: 12,
        activeBuffs: [activeBuffFor(diamondResilience)],
      }),
      ref,
    );
    const dr = withBuff.defenses?.dr.find((d) => d.qualifier === "—");
    expect(dr?.total).toBe(2);
  });

  it("Diamond Resilience scales to DR 4/- at 16th level", () => {
    const options = kiSpendToggleOptions("monkUnchained", 16, [], ["diamondResilience"], []);
    const diamondResilience = options.find((o) => o.id === "kiPool:kiPower:diamondResilience")!;
    const withBuff = compute(
      makeDoc({
        classTag: "monkUnchained",
        level: 16,
        activeBuffs: [activeBuffFor(diamondResilience)],
      }),
      ref,
    );
    const dr = withBuff.defenses?.dr.find((d) => d.qualifier === "—");
    expect(dr?.total).toBe(4);
  });

  it("Wind Jump grants a fly speed equal to base land speed through compute()", () => {
    const options = kiSpendToggleOptions("monkUnchained", 8, [], ["windJump"], []);
    const windJump = options.find((o) => o.id === "kiPool:kiPower:windJump")!;
    const withBuff = compute(
      makeDoc({ classTag: "monkUnchained", level: 8, activeBuffs: [activeBuffFor(windJump)] }),
      ref,
    );
    // `@attributes.speed.land.total` is the character's race BASE land speed
    // (30 ft for Human), deliberately unaffected by class features like Fast
    // Movement — the same value RAW's "equal to your base land speed" asks
    // for, not whatever `speeds.land` shows after every other buff/class
    // bonus applies (which could be higher at 8th level). See `windJump`'s
    // spendToggle comment in monk-ki-powers.ts.
    expect(withBuff.speeds.fly).toBe(30);
  });

  it("Building-Up Koan and Elemental Fury stay display-only (no spendToggle, no Change)", () => {
    const options = kiSpendToggleOptions(
      "monkUnchained",
      8,
      [],
      ["buildingUpKoan", "elementalFury"],
      [],
    );
    expect(options).toEqual([]);
  });
});

describe("kiSpendToggleOptions: ninja trick picks", () => {
  it("herbalCompound pick surfaces its spend toggle", () => {
    const options = kiSpendToggleOptions("ninja", 2, [], [], ["herbalCompound"]);
    expect(options.map((o) => o.id)).toEqual([
      "kiPool:ninja:speed",
      "kiPool:ninja:stealth",
      "kiPool:ninjaTrick:herbalCompound",
    ]);
  });

  it("toggling herbalCompound on applies +4 Will, -2 AC, -2 Reflex through compute()", () => {
    const options = kiSpendToggleOptions("ninja", 2, [], [], ["herbalCompound"]);
    const herbalCompound = options.find((o) => o.id === "kiPool:ninjaTrick:herbalCompound")!;
    const noBuff = compute(makeDoc({ classTag: "ninja", level: 2 }), ref);
    const withBuff = compute(
      makeDoc({ classTag: "ninja", level: 2, activeBuffs: [activeBuffFor(herbalCompound)] }),
      ref,
    );
    expect(withBuff.saves.will.total - noBuff.saves.will.total).toBe(4);
    expect(withBuff.ac.normal - noBuff.ac.normal).toBe(-2);
    expect(withBuff.saves.ref.total - noBuff.saves.ref.total).toBe(-2);
  });

  it("acrobaticMaster stays display-only (single-check bonus, not a standing Change): only the base options surface", () => {
    const options = kiSpendToggleOptions("ninja", 2, [], [], ["acrobaticMaster"]);
    expect(options.map((o) => o.id)).toEqual(["kiPool:ninja:speed", "kiPool:ninja:stealth"]);
  });
});
