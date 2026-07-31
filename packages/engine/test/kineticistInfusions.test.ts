import { describe, expect, it } from "bun:test";

import type { CharacterDoc, DerivedKineticBlast, KineticistBlastLoadout } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  gatherPowerReduction,
  kineticBlastEffectiveSpellLevel,
  metakinesisBurn,
  resolveBlastBurn,
} from "../src/index.js";

/**
 * The per-activation layer on a kinetic blast. Expected values are
 * hand-computed from the published rules (Occult Adventures):
 *
 *   - Wild Talents: "kinetic blast and defense wild talents are always
 *     considered to have an effective spell level equal to 1/2 the
 *     kineticist's class level (to a maximum effective spell level of 9th at
 *     kineticist level 18th)", and "the DC for a saving throw against a wild
 *     talent is equal to 10 + the wild talent's effective spell level + the
 *     kineticist's Constitution modifier".
 *   - Infusion: the infusion's burn "is added to the burn cost of the kinetic
 *     blast the infusion modifies"; its save DC uses "the associated kinetic
 *     blast's effective spell level, not the level of the infusion"; and
 *     "the DCs for form infusions are calculated using the kineticist's
 *     Dexterity modifier instead of her Constitution modifier".
 *   - Infusion Specialization: -1 at 5th, +1 more at 8th/11th/14th/17th/20th,
 *     off the infusions' combined cost only.
 *   - Gather Power: -1 (move), -2 (full round), -3 (full round then move),
 *     each raised by Supercharge at 11th.
 *   - Metakinesis: Empower 1, Maximize 2, Quicken 3, twice-in-one-action 4.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const BURN_FEATURE_ID = Object.values(ref.classFeatures).find((f) => f.tag === "burn")!.id;

function makeKineticist(opts: {
  level: number;
  element: string;
  expanded?: string[];
  talents?: string[];
  loadout?: KineticistBlastLoadout;
  con?: number;
  dex?: number;
  burn?: number;
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
      classes: [{ tag: "kineticist", level: opts.level }],
    },
    abilities: {
      str: 10,
      dex: opts.dex ?? 14,
      con: opts.con ?? 16,
      int: 10,
      wis: 10,
      cha: 10,
    },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      kineticistElement: opts.element,
      kineticistExpandedElements: opts.expanded,
      kineticistWildTalents: opts.talents,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: opts.burn ? { [BURN_FEATURE_ID]: { used: opts.burn, max: 10 } } : {},
      kineticistBlastLoadout: opts.loadout,
    },
  };
}

function blast(doc: CharacterDoc, name: string): DerivedKineticBlast {
  const found = compute(doc, ref).kineticBlasts.find((b) => b.name === name);
  if (!found) throw new Error(`blast not on sheet: ${name}`);
  return found;
}

describe("effective spell level", () => {
  it("is half the class level, floored at 1st and capped at 9th", () => {
    expect(kineticBlastEffectiveSpellLevel(1)).toBe(1);
    expect(kineticBlastEffectiveSpellLevel(2)).toBe(1);
    expect(kineticBlastEffectiveSpellLevel(7)).toBe(3);
    expect(kineticBlastEffectiveSpellLevel(18)).toBe(9);
    expect(kineticBlastEffectiveSpellLevel(20)).toBe(9);
  });
});

describe("burn arithmetic", () => {
  it("Infusion Specialization comes off the infusions only, never the blast", () => {
    // Level 8: reduction 2. Composite blast (2) + one 2-burn infusion.
    const burn = resolveBlastBurn({
      blastBurn: 2,
      infusionBurn: 2,
      metakinesisBurn: 0,
      kineticistLevel: 8,
      gatherPower: undefined,
    });
    // The reduction is clamped to the 2 points of infusion cost, so the
    // composite's own 2 survives it.
    expect(burn.infusionSpecialization).toBe(2);
    expect(burn.total).toBe(2);
  });

  it("Gather Power comes off everything, and neither reduction goes below zero", () => {
    const burn = resolveBlastBurn({
      blastBurn: 0,
      infusionBurn: 1,
      metakinesisBurn: 0,
      kineticistLevel: 5,
      gatherPower: "move",
    });
    // Infusion Specialization eats the whole 1-point infusion cost, leaving
    // Gather Power nothing to reduce — it must report 0, not a phantom -1.
    expect(burn.infusionSpecialization).toBe(1);
    expect(burn.gatherPower).toBe(0);
    expect(burn.total).toBe(0);
  });

  it("Supercharge raises every Gather Power stance at 11th", () => {
    expect(gatherPowerReduction("move", 10)).toBe(1);
    expect(gatherPowerReduction("fullRound", 10)).toBe(2);
    expect(gatherPowerReduction("fullRoundThenMove", 10)).toBe(3);
    expect(gatherPowerReduction("move", 11)).toBe(2);
    expect(gatherPowerReduction("fullRound", 11)).toBe(3);
    expect(gatherPowerReduction("fullRoundThenMove", 11)).toBe(5);
  });

  it("Metakinesis options sum, and duplicates are ignored", () => {
    expect(metakinesisBurn(["empower"])).toBe(1);
    expect(metakinesisBurn(["empower", "maximize"])).toBe(3);
    expect(metakinesisBurn(["empower", "empower"])).toBe(1);
    expect(metakinesisBurn(["empower", "maximize", "quicken", "twice"])).toBe(10);
  });
});

describe("a loadout on the blast line", () => {
  it("Torrent turns Fire Blast into a 30-ft. line with a Dexterity-based Reflex DC", () => {
    // Kineticist 6: effective spell level 3, Dex 14 (+2), Con 16 (+3).
    // Form infusion DC = 10 + 3 + 2 (Dex) = 15.
    const fire = blast(
      makeKineticist({
        level: 6,
        element: "fire",
        talents: ["universal:torrent"],
        loadout: { form: "universal:torrent" },
      }),
      "Fire Blast",
    );
    expect(fire.delivery).toBe("area");
    expect(fire.area).toBe("30-ft. line");
    expect(fire.effectiveSpellLevel).toBe(3);
    expect(fire.infusions).toHaveLength(1);
    expect(fire.infusions[0]!.save).toEqual({
      type: "ref",
      effect: "half",
      dc: 15,
      ability: "dex",
      components: [
        { source: "Base", type: "base", value: 10, applied: true },
        { source: "Blast's effective spell level", type: "untyped", value: 3, applied: true },
        { source: "Dexterity", type: "ability", value: 2, applied: true },
      ],
    });
    // Torrent is a 2-burn infusion; Infusion Specialization is +1 at 5th, so
    // a 6th-level kineticist pays 1.
    expect(fire.burnCost.infusions).toBe(2);
    expect(fire.burnCost.infusionSpecialization).toBe(1);
    expect(fire.burnCost.total).toBe(1);
  });

  it("a substance infusion's DC is Constitution-based off the SAME blast level", () => {
    // Same 6th-level kineticist: 10 + 3 + 3 (Con) = 16.
    const fire = blast(
      makeKineticist({
        level: 6,
        element: "fire",
        talents: ["fire:dazzlingInfusion"],
        loadout: { substance: "fire:dazzlingInfusion" },
      }),
      "Fire Blast",
    );
    expect(fire.infusions[0]!.save?.dc).toBe(16);
    expect(fire.infusions[0]!.save?.ability).toBe("con");
    // Dazzling Infusion is a 1st-level infusion; its own level never enters
    // the DC, only the blast's.
    expect(fire.effectiveSpellLevel).toBe(3);
  });

  it("Extended Range moves the range, and Extreme Range moves it further", () => {
    const doc = (form: string) =>
      makeKineticist({
        level: 6,
        element: "fire",
        talents: ["universal:extendedRange", "universal:extremeRange"],
        loadout: { form },
      });
    expect(blast(doc("universal:extendedRange"), "Fire Blast").range).toBe(120);
    expect(blast(doc("universal:extremeRange"), "Fire Blast").range).toBe(480);
  });

  it("Kinetic Blade goes melee and drops Elemental Overflow's damage bonus", () => {
    // Kineticist 9 holding 3 burn: overflow cap floor(9/3) = 3, so +3 attack
    // and +6 damage normally. Earth Blast is physical: 5d6+5 rider + 3 Con.
    const opts = {
      level: 9,
      element: "earth",
      burn: 3,
      talents: ["universal:kineticBlade"],
    };
    const bare = blast(makeKineticist(opts), "Earth Blast");
    expect(bare.damageBonus.total).toBe(14); // 5 rider + 3 Con + 6 overflow
    expect(bare.attack.total).toBe(11); // 6 BAB + 2 Dex + 3 overflow

    const bladed = blast(
      makeKineticist({ ...opts, loadout: { form: "universal:kineticBlade" } }),
      "Earth Blast",
    );
    expect(bladed.delivery).toBe("melee");
    expect(bladed.damageBonus.total).toBe(8); // overflow's +6 is gone
    expect(bladed.attack.total).toBe(11); // ... but the attack bonus stays
  });

  it("Focused Blast's enhancement bonus lands on the attack roll", () => {
    const focused = blast(
      makeKineticist({
        level: 6,
        element: "fire",
        talents: ["universal:focusedBlast"],
        loadout: { form: "universal:focusedBlast" },
      }),
      "Fire Blast",
    );
    // 4 BAB (med, 6th) + 2 Dex + 1 enhancement.
    expect(focused.attack.total).toBe(7);
  });

  it("both infusions apply at once, and their damage qualifiers read substance first", () => {
    const fire = blast(
      makeKineticist({
        level: 12,
        element: "fire",
        talents: ["universal:torrent", "universal:drainingInfusion"],
        loadout: {
          form: "universal:torrent",
          substance: "universal:drainingInfusion",
          metakinesis: ["empower"],
        },
      }),
      "Fire Blast",
    );
    expect(fire.infusions.map((i) => i.kind)).toEqual(["substance", "form"]);
    expect(fire.damageQualifier?.startsWith("1/4 damage on a save")).toBe(true);
    expect(fire.damageQualifier?.includes("half damage for a physical blast")).toBe(true);
    // Torrent 2 + Draining 1 = 3, less Infusion Specialization 3 at 12th = 0,
    // plus Empower's 1.
    expect(fire.burnCost.infusionSpecialization).toBe(3);
    expect(fire.burnCost.metakinesis).toBe(1);
    expect(fire.burnCost.total).toBe(1);
  });

  it("an infusion the character doesn't know is ignored rather than charged for", () => {
    const fire = blast(
      makeKineticist({
        level: 6,
        element: "fire",
        talents: [],
        loadout: { form: "universal:torrent" },
      }),
      "Fire Blast",
    );
    expect(fire.infusions).toHaveLength(0);
    expect(fire.burnCost.total).toBe(0);
    expect(fire.range).toBe(30);
  });

  it("a substance infusion put in the form slot is ignored", () => {
    const fire = blast(
      makeKineticist({
        level: 6,
        element: "fire",
        talents: ["fire:dazzlingInfusion"],
        loadout: { form: "fire:dazzlingInfusion" },
      }),
      "Fire Blast",
    );
    expect(fire.infusions).toHaveLength(0);
  });

  it("Fire's Fury adds the overflow bonus again, but only to blasts that include fire", () => {
    // Kineticist 9 holding 3 burn: overflow cap floor(9/3) = 3, so the
    // elemental overflow bonus is +3 (and +6 to damage). Fire is primary,
    // earth expanded, so Magma Blast (earth + fire) and Mud Blast (earth +
    // water... not available) let us contrast a fire composite with a
    // non-fire simple blast.
    const doc = makeKineticist({
      level: 9,
      element: "fire",
      expanded: ["earth"],
      burn: 3,
      talents: ["fire:firesFury"],
    });
    // Fire Blast: energy, 5d6 + floor(3/2) Con + 6 overflow + 3 Fire's Fury.
    expect(blast(doc, "Fire Blast").damageBonus.total).toBe(10);
    // Earth Blast: physical and no fire, so no Fire's Fury.
    // 5 rider + 3 Con + 6 overflow.
    expect(blast(doc, "Earth Blast").damageBonus.total).toBe(14);
    // Magma Blast: a composite that includes fire, so it does get it.
    // 10 rider + 3 Con + 6 overflow + 3 Fire's Fury.
    expect(blast(doc, "Magma Blast").damageBonus.total).toBe(22);
  });

  it("reports the published caps on what burn can be accepted", () => {
    const fire = blast(
      makeKineticist({ level: 6, element: "fire", con: 16, burn: 2 }),
      "Fire Blast",
    );
    expect(fire.burnCost.perRoundLimit).toBe(2); // rises to 2 at 6th
    expect(fire.burnCost.maxHeld).toBe(6); // 3 + Con modifier
    expect(fire.burnCost.held).toBe(2);
  });
});
