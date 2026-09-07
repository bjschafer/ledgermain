import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, ItemInstance } from "@pf1/schema";

import { COMBAT_STANCES, compute, featNameSlug, type CombatStanceId } from "../src/index.js";

const ref = loadRefData();

function idByName(collection: "races" | "feats", name: string): string {
  const entry = Object.entries(ref[collection]).find(([, item]) => item.name === name);
  if (!entry) throw new Error(`${collection} entry not found: ${name}`);
  return entry[0];
}

interface Options {
  /** Style feat name, always owned; `active` decides whether its stance is up. */
  style: string;
  active: boolean;
  stance?: CombatStanceId;
  dex?: number;
  gear?: ItemInstance[];
}

function makeDoc({ style, active, stance, dex = 14, gear = [] }: Options): CharacterDoc {
  const stanceEntry = stance ? COMBAT_STANCES.find((entry) => entry.id === stance) : undefined;
  if (stance && !stanceEntry) throw new Error(`stance not found: ${stance}`);
  return {
    schemaVersion: 1,
    id: "combat-style-test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-09-07T00:00:00.000Z",
    identity: {
      name: "Style Tester",
      race: idByName("races", "Human"),
      classes: [{ tag: "fighter", level: 5 }],
    },
    abilities: { str: 16, dex, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [idByName("feats", style)],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [
        ...(stanceEntry
          ? [
              {
                instanceId: `active-${stanceEntry.id}`,
                effectTag: stanceEntry.id,
                name: stanceEntry.name,
                changes: stanceEntry.changes,
                contextNotes: stanceEntry.contextNotes,
              },
            ]
          : []),
        ...(active
          ? [
              {
                instanceId: "active-style",
                effectTag: `combatStyle:${featNameSlug(style)}`,
                name: style,
                changes: [],
              },
            ]
          : []),
      ],
      resources: {},
    },
  };
}

/** The style's own contribution: stance up minus the same character with it down. */
function styleDelta(options: Omit<Options, "active">) {
  return {
    sheet: compute(makeDoc({ ...options, active: true }), ref),
    baseline: compute(makeDoc({ ...options, active: false }), ref),
  };
}

function conditional(
  totals: { total: number; categories: string[] }[] | undefined,
  category: string,
): number | undefined {
  return totals?.find((entry) => entry.categories.includes(category))?.total;
}

const CHAIN_SHIRT: ItemInstance = {
  equipped: true,
  name: "Chain Shirt",
  armor: { slot: "armor", ac: 4, maxDex: 4, acp: -2, type: 1, asf: 20 },
};

const FULL_PLATE: ItemInstance = {
  equipped: true,
  name: "Full Plate",
  armor: { slot: "armor", ac: 9, maxDex: 1, acp: -6, type: 2, asf: 35 },
};

describe("style feats whose stance carries a number", () => {
  it("Blood Frenzy Style: +2 Strength, +2 Constitution, -2 AC", () => {
    const { sheet, baseline } = styleDelta({ style: "Blood Frenzy Style" });
    expect(sheet.abilities.str.total - baseline.abilities.str.total).toBe(2);
    expect(sheet.abilities.con.total - baseline.abilities.con.total).toBe(2);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(-2);
    // Str 16 -> 18 is one more modifier point on every melee attack.
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(1);
    // An AC penalty reaches CMD too (CRB p. 199), so CMD nets the -2 penalty
    // against the +1 the raised Strength modifier puts back.
    expect(sheet.cmd - baseline.cmd).toBe(-1);
  });

  it("Snapping Turtle Style: +1 shield AC, which touch AC never gets", () => {
    const { sheet, baseline } = styleDelta({ style: "Snapping Turtle Style" });
    expect(sheet.ac.normal - baseline.ac.normal).toBe(1);
    expect(sheet.ac.flatFooted - baseline.ac.flatFooted).toBe(1);
    expect(sheet.ac.touch - baseline.ac.touch).toBe(0);
    expect(sheet.ac.components).toContainEqual(
      expect.objectContaining({ source: "Snapping Turtle Style", value: 1, category: "shield" }),
    );
  });

  it("Shield Gauntlet Style: +1 shield AC, competing with a carried shield rather than stacking", () => {
    const shield: ItemInstance = {
      equipped: true,
      name: "Heavy Steel Shield",
      armor: { slot: "shield", ac: 2, maxDex: 0, acp: -2, type: 1, asf: 15 },
    };
    const withShield = styleDelta({ style: "Shield Gauntlet Style", gear: [shield] });
    // The shield's own +2 already beats the style's +1, so nothing is added.
    expect(withShield.sheet.ac.normal - withShield.baseline.ac.normal).toBe(0);

    const bare = styleDelta({ style: "Shield Gauntlet Style" });
    expect(bare.sheet.ac.normal - bare.baseline.ac.normal).toBe(1);
  });

  it("Shielded Staff Style: +2 shield AC and -1 on every attack", () => {
    const { sheet, baseline } = styleDelta({ style: "Shielded Staff Style" });
    expect(sheet.ac.normal - baseline.ac.normal).toBe(2);
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(-1);
    expect(sheet.attack.ranged.total - baseline.attack.ranged.total).toBe(-1);
  });

  it("Sisterhood Style: +1 Reflex and +1 Will, leaving Fortitude alone", () => {
    const { sheet, baseline } = styleDelta({ style: "Sisterhood Style" });
    expect(sheet.saves.ref.total - baseline.saves.ref.total).toBe(1);
    expect(sheet.saves.will.total - baseline.saves.will.total).toBe(1);
    expect(sheet.saves.fort.total - baseline.saves.fort.total).toBe(0);
  });

  it("Dragon Style: +2 against sleep, paralysis and stunning, off the headline saves", () => {
    const { sheet, baseline } = styleDelta({ style: "Dragon Style" });
    expect(sheet.saves.will.total).toBe(baseline.saves.will.total);
    expect(sheet.saves.fort.total).toBe(baseline.saves.fort.total);
    for (const category of ["sleep", "paralysis", "stun"]) {
      expect(conditional(sheet.saves.will.conditionals, category)).toBe(sheet.saves.will.total + 2);
    }
    // Paralysis and stunning both reach Fortitude as well; sleep does not.
    expect(conditional(sheet.saves.fort.conditionals, "paralysis")).toBe(
      sheet.saves.fort.total + 2,
    );
    expect(conditional(sheet.saves.fort.conditionals, "sleep")).toBeUndefined();
  });

  it("Tiger Style: +2 CMD against bull rush, overrun and trip, off the headline CMD", () => {
    const { sheet, baseline } = styleDelta({ style: "Tiger Style" });
    expect(sheet.cmd).toBe(baseline.cmd);
    for (const category of ["bullRush", "overrun", "trip"]) {
      expect(conditional(sheet.cmdConditionals, category)).toBe(sheet.cmd + 2);
    }
    expect(conditional(sheet.cmdConditionals, "grapple")).toBeUndefined();
  });

  it("Janni Style: the charge AC penalty becomes -1, and nothing changes off a charge", () => {
    const charging = styleDelta({ style: "Janni Style", stance: "combatStance:charge" });
    expect(charging.sheet.ac.normal - charging.baseline.ac.normal).toBe(1);

    const standing = styleDelta({ style: "Janni Style" });
    expect(standing.sheet.ac.normal).toBe(standing.baseline.ac.normal);
  });

  it("Demonic Style: +1 melee attack and nothing ranged, only on a charge", () => {
    const charging = styleDelta({ style: "Demonic Style", stance: "combatStance:charge" });
    expect(charging.sheet.attack.melee.total - charging.baseline.attack.melee.total).toBe(1);
    expect(charging.sheet.attack.ranged.total - charging.baseline.attack.ranged.total).toBe(0);

    const standing = styleDelta({ style: "Demonic Style" });
    expect(standing.sheet.attack.melee.total).toBe(standing.baseline.attack.melee.total);
  });

  it("Swift Iron Style: one more point of max Dex, and one less armor check penalty", () => {
    // Dex 18 against full plate's max Dex 1: the cap binds, so raising it by 1
    // is worth a point of AC.
    const plated = styleDelta({ style: "Swift Iron Style", dex: 18, gear: [FULL_PLATE] });
    expect(plated.sheet.ac.normal - plated.baseline.ac.normal).toBe(1);

    // A chain shirt's max Dex 4 does not bind at Dex 14, so only the check
    // penalty moves.
    const light = styleDelta({ style: "Swift Iron Style", gear: [CHAIN_SHIRT] });
    expect(light.sheet.ac.normal - light.baseline.ac.normal).toBe(0);
    const acpDelta = (light.sheet.skills.acr?.total ?? 0) - (light.baseline.skills.acr?.total ?? 0);
    expect(acpDelta).toBe(1);
  });

  it("owning a style feat applies nothing until its stance is entered", () => {
    for (const style of [
      "Blood Frenzy Style",
      "Snapping Turtle Style",
      "Shielded Staff Style",
      "Sisterhood Style",
      "Tiger Style",
      "Swift Iron Style",
    ]) {
      const owned = compute(makeDoc({ style, active: false, gear: [CHAIN_SHIRT] }), ref);
      const none = compute(
        {
          ...makeDoc({ style, active: false, gear: [CHAIN_SHIRT] }),
          build: {
            ...makeDoc({ style, active: false, gear: [CHAIN_SHIRT] }).build,
            feats: [],
          },
        },
        ref,
      );
      expect(`${style}: ${owned.ac.normal}/${owned.saves.will.total}`).toBe(
        `${style}: ${none.ac.normal}/${none.saves.will.total}`,
      );
    }
  });
});
