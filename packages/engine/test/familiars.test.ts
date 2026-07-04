import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, FAMILIARS } from "../src/index.js";

/**
 * Stage 3 (arcane bonds): a familiar grants its master a small always-on
 * bonus (hand-computed here from the published PF1 rules). Bonded objects and
 * unknown familiar kinds apply nothing. All expectations are hand-computed
 * deltas against the same doc with no bond.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(arcaneBond?: CharacterDoc["build"]["arcaneBond"]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "wizard", level: 5 }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(arcaneBond ? { arcaneBond } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

const baseline = compute(makeDoc(), ref);

function familiarSheet(kind: string) {
  return compute(makeDoc({ type: "familiar", familiarKind: kind }), ref);
}

describe("familiar master bonuses (hand-computed)", () => {
  it("bat grants +3 Fly", () => {
    const sheet = familiarSheet("bat");
    expect(sheet.skills.fly!.total).toBe(baseline.skills.fly!.total + 3);
    const comp = sheet.skills.fly!.components.find((c) => c.source === "Bat (familiar)");
    expect(comp).toBeDefined();
    expect(comp!.type).toBe("untyped");
    expect(comp!.value).toBe(3);
    expect(comp!.applied).toBe(true);
  });

  it("cat grants +3 Stealth", () => {
    const sheet = familiarSheet("cat");
    expect(sheet.skills.ste!.total).toBe(baseline.skills.ste!.total + 3);
  });

  it("toad grants +3 max HP", () => {
    const sheet = familiarSheet("toad");
    expect(sheet.hp.max).toBe(baseline.hp.max + 3);
    expect(sheet.hp.components.some((c) => c.source === "Toad (familiar)" && c.value === 3)).toBe(
      true,
    );
  });

  it("rat grants +2 Fortitude", () => {
    const sheet = familiarSheet("rat");
    expect(sheet.saves.fort.total).toBe(baseline.saves.fort.total + 2);
  });

  it("weasel grants +2 Reflex", () => {
    const sheet = familiarSheet("weasel");
    expect(sheet.saves.ref.total).toBe(baseline.saves.ref.total + 2);
  });

  it("hawk's conditional bonus is a display note, not an applied change", () => {
    expect(FAMILIARS.hawk!.changes).toHaveLength(0);
    expect(FAMILIARS.hawk!.note).toContain("Perception");
    expect(familiarSheet("hawk")).toEqual(baseline);
  });

  it("familiar bonus routes through stacking: untyped +3 sums with a typed buff bonus", () => {
    const doc = makeDoc({ type: "familiar", familiarKind: "cat" });
    const withBuff: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "buff-1",
            name: "Cloak of Shadows",
            changes: [{ target: "skill.ste", type: "competence", formula: "5" }],
          },
        ],
      },
    };
    const sheet = compute(withBuff, ref);
    // untyped (familiar) stacks with competence (buff): +3 +5 = +8 over baseline.
    expect(sheet.skills.ste!.total).toBe(baseline.skills.ste!.total + 8);
    const applied = sheet.skills.ste!.components.filter((c) => c.applied);
    expect(applied.map((c) => c.value).sort()).toEqual([3, 5]);
  });
});

describe("bonds that apply nothing", () => {
  it("an unknown familiar kind computes identically to no bond (soft fail, no crash)", () => {
    expect(familiarSheet("dire-tiger")).toEqual(baseline);
  });

  it("a bonded object computes identically to no bond (display-only in v1)", () => {
    const sheet = compute(makeDoc({ type: "object", bondedItemName: "Grandfather's ring" }), ref);
    expect(sheet).toEqual(baseline);
  });

  it("a doc without arcaneBond is unaffected (back-compat pin)", () => {
    expect(compute(makeDoc(undefined), ref)).toEqual(baseline);
  });
});
