import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  COMBAT_STANCES,
  COMBAT_STANCE_REFERENCE_BUFF_IDS,
  compute,
  type CombatStanceId,
} from "../src/index.js";

const ref = loadRefData();

function idByName(collection: "races" | "feats", name: string): string {
  const entry = Object.entries(ref[collection]).find(([, item]) => item.name === name);
  if (!entry) throw new Error(`${collection} entry not found: ${name}`);
  return entry[0];
}

function stanceBuff(id: CombatStanceId): CharacterDoc["live"]["activeBuffs"][number] {
  const stance = COMBAT_STANCES.find((entry) => entry.id === id);
  if (!stance) throw new Error(`stance not found: ${id}`);
  return {
    instanceId: `active-${id}`,
    effectTag: stance.id,
    name: stance.name,
    changes: stance.changes,
    contextNotes: stance.contextNotes,
  };
}

function makeDoc({
  stance,
  acrobatics = 0,
  craneStyle = false,
  craneStyleActive = false,
}: {
  stance?: CombatStanceId;
  acrobatics?: number;
  craneStyle?: boolean;
  craneStyleActive?: boolean;
} = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "combat-stance-test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-09-03T00:00:00.000Z",
    identity: {
      name: "Stance Tester",
      race: idByName("races", "Human"),
      classes: [{ tag: "fighter", level: 5 }],
    },
    abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
    build: {
      feats: craneStyle ? [idByName("feats", "Crane Style")] : [],
      skillRanks: acrobatics > 0 ? { acr: acrobatics } : {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [
        ...(stance ? [stanceBuff(stance)] : []),
        ...(craneStyleActive
          ? [
              {
                instanceId: "active-crane-style",
                effectTag: "combatStyle:crane-style",
                name: "Crane Style",
                changes: [],
              },
            ]
          : []),
      ],
      resources: {},
    },
  };
}

function stanceDelta(options: Parameters<typeof makeDoc>[0]) {
  const sheet = compute(makeDoc(options), ref);
  const baseline = compute(makeDoc({ ...options, stance: undefined }), ref);
  return { sheet, baseline };
}

describe("combat stances", () => {
  it("Fighting Defensively applies -4 attack and +2 dodge AC", () => {
    const { sheet, baseline } = stanceDelta({
      stance: "combatStance:fightingDefensively",
    });
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(-4);
    expect(sheet.attack.ranged.total - baseline.attack.ranged.total).toBe(-4);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(2);
    expect(sheet.ac.touch - baseline.ac.touch).toBe(2);
    expect(sheet.ac.flatFooted - baseline.ac.flatFooted).toBe(0);
    expect(sheet.attack.melee.components).toContainEqual(
      expect.objectContaining({ source: "Fighting Defensively", value: -4, applied: true }),
    );
    expect(sheet.ac.components).toContainEqual(
      expect.objectContaining({
        source: "Fighting Defensively",
        value: 2,
        type: "dodge",
        applied: true,
      }),
    );
  });

  it("3 Acrobatics ranks improve Fighting Defensively to +3 dodge AC", () => {
    const { sheet, baseline } = stanceDelta({
      stance: "combatStance:fightingDefensively",
      acrobatics: 3,
    });
    expect(sheet.ac.normal - baseline.ac.normal).toBe(3);
  });

  it("Total Defense applies +4 dodge AC, or +6 with 3 Acrobatics ranks, without changing attacks", () => {
    const untrained = stanceDelta({ stance: "combatStance:totalDefense" });
    const trained = stanceDelta({ stance: "combatStance:totalDefense", acrobatics: 3 });
    expect(untrained.sheet.ac.normal - untrained.baseline.ac.normal).toBe(4);
    expect(trained.sheet.ac.normal - trained.baseline.ac.normal).toBe(6);
    expect(untrained.sheet.attack.melee.total).toBe(untrained.baseline.attack.melee.total);
    expect(untrained.sheet.ac.components).toContainEqual(
      expect.objectContaining({ source: "Total Defense", value: 4, applied: true }),
    );
  });

  it("Charge applies +2 melee attack, nothing ranged, and -2 to every AC variant", () => {
    const { sheet, baseline } = stanceDelta({ stance: "combatStance:charge" });
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(2);
    // A charge ends in a single melee attack (CRB p. 198), so the ranged line
    // must not move.
    expect(sheet.attack.ranged.total - baseline.attack.ranged.total).toBe(0);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(-2);
    expect(sheet.ac.touch - baseline.ac.touch).toBe(-2);
    expect(sheet.ac.flatFooted - baseline.ac.flatFooted).toBe(-2);
    expect(sheet.attack.melee.components).toContainEqual(
      expect.objectContaining({ source: "Charge", value: 2, applied: true }),
    );
    expect(sheet.ac.components).toContainEqual(
      expect.objectContaining({ source: "Charge", value: -2, applied: true }),
    );
  });

  it("Crane Style reduces Fighting Defensively to -2 attack and adds +1 dodge AC as its own source", () => {
    const { sheet, baseline } = stanceDelta({
      stance: "combatStance:fightingDefensively",
      acrobatics: 3,
      craneStyle: true,
      craneStyleActive: true,
    });
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(-2);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(4);
    expect(sheet.attack.melee.components).toContainEqual(
      expect.objectContaining({ source: "Crane Style", value: 2, applied: true }),
    );
    expect(sheet.ac.components).toContainEqual(
      expect.objectContaining({ source: "Crane Style", value: 1, type: "dodge", applied: true }),
    );
  });

  it("Crane Style adds +1 dodge AC to Total Defense and applies nothing without a stance", () => {
    const totalDefense = stanceDelta({
      stance: "combatStance:totalDefense",
      acrobatics: 3,
      craneStyle: true,
      craneStyleActive: true,
    });
    expect(totalDefense.sheet.ac.normal - totalDefense.baseline.ac.normal).toBe(7);

    const noStance = compute(makeDoc({ craneStyle: true, craneStyleActive: true }), ref);
    expect(noStance.ac.components.some((component) => component.source === "Crane Style")).toBe(
      false,
    );
    expect(
      noStance.attack.melee.components.some((component) => component.source === "Crane Style"),
    ).toBe(false);
  });

  it("owning Crane Style does not apply its stance-gated modifiers until the style is active", () => {
    const { sheet, baseline } = stanceDelta({
      stance: "combatStance:fightingDefensively",
      craneStyle: true,
    });
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(-4);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(2);
    expect(sheet.ac.components.some((component) => component.source === "Crane Style")).toBe(false);
  });

  it("pins every reference buff id to the name it carries upstream", () => {
    // These are upstream Foundry `_id`s. If a bump moves one, the stance stops
    // recognizing the vendored buff and its dodge bonus stacks with the
    // toggle's, so fail loudly here rather than double-count at the table.
    const expected: Record<string, string> = {
      "combatStance:fightingDefensively": "Fighting Defensively",
      "combatStance:totalDefense": "Total Defense",
    };
    for (const [stanceId, buffId] of Object.entries(COMBAT_STANCE_REFERENCE_BUFF_IDS)) {
      expect(ref.buffs[buffId]?.name).toBe(expected[stanceId]!);
    }
  });

  it("treats the existing reference buff as the same Crane-compatible stance", () => {
    const buffId = COMBAT_STANCE_REFERENCE_BUFF_IDS["combatStance:fightingDefensively"];
    const buff = ref.buffs[buffId];
    expect(buff?.name).toBe("Fighting Defensively");

    const doc = makeDoc({ craneStyle: true, craneStyleActive: true });
    doc.live.activeBuffs.push({
      instanceId: "reference-fighting-defensively",
      buffId,
      name: buff!.name,
      changes: buff!.changes,
    });
    const sheet = compute(doc, ref);
    const baseline = compute(makeDoc({ craneStyle: true, craneStyleActive: true }), ref);
    expect(sheet.attack.melee.total - baseline.attack.melee.total).toBe(-2);
    expect(sheet.ac.normal - baseline.ac.normal).toBe(3);
  });
});
