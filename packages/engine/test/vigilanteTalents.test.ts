/**
 * Hand-computed fixture tests for the vigilante subsystem (issue #65):
 * specialization's BAB seam (Avenger full-BAB override in `compute.ts`),
 * Hidden Strike's dice (`hiddenStrikeDice`), and the social/vigilante
 * talent tables (both `displayOnly`-shaped except the handful of genuine
 * numeric entries called out in `vigilante-talents.ts`'s doc comment).
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/compute.js";
import { collectModifiers } from "../src/collect.js";
import {
  VIGILANTE_SOCIAL_TALENTS,
  VIGILANTE_SOCIAL_TALENT_IDS,
  VIGILANTE_TALENTS,
  VIGILANTE_TALENT_IDS,
  vigilanteTalentsForSpecialization,
} from "../src/vigilante-talents.js";
import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
import { hiddenStrikeDice } from "../src/tables.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeVigilante(
  level: number,
  spec?: "avenger" | "stalker",
  extra: Partial<CharacterDoc["build"]> = {},
): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "vigilante", level }],
    },
    abilities: { str: 14, dex: 16, con: 14, int: 12, wis: 12, cha: 14 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(spec ? { vigilanteSpecialization: spec } : {}),
      ...extra,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("Avenger BAB override (compute.ts)", () => {
  it("avenger vigilante L5 gets full BAB (= 5), not the class's normal 3/4 tier", () => {
    const doc = makeVigilante(5, "avenger");
    expect(compute(doc, ref).bab).toBe(5);
  });

  it("stalker vigilante L5 keeps the normal 3/4 BAB tier (= 3)", () => {
    const doc = makeVigilante(5, "stalker");
    expect(compute(doc, ref).bab).toBe(3);
  });

  it("no specialization chosen yet keeps the normal 3/4 BAB tier", () => {
    const doc = makeVigilante(5);
    expect(compute(doc, ref).bab).toBe(3);
  });

  it("avenger override is scoped to vigilante levels only, in a multiclass", () => {
    const doc = makeVigilante(4, "avenger");
    doc.identity.classes.push({ tag: "wizard", level: 4 });
    // Avenger vigilante 4 (full BAB = 4) + wizard 4 (low tier = 2) = 6.
    expect(compute(doc, ref).bab).toBe(6);
  });
});

describe("hiddenStrikeDice", () => {
  it("vigilante level 1 -> 1d8 (base)", () => {
    expect(hiddenStrikeDice(1)).toEqual({ dice: 1, diceLabel: "1d8" });
  });

  it("vigilante level 2 -> still 1d8 (next bump is 3rd)", () => {
    expect(hiddenStrikeDice(2)).toEqual({ dice: 1, diceLabel: "1d8" });
  });

  it("vigilante level 3 -> 2d8", () => {
    expect(hiddenStrikeDice(3)).toEqual({ dice: 2, diceLabel: "2d8" });
  });

  it("vigilante level 19 -> 10d8", () => {
    expect(hiddenStrikeDice(19)).toEqual({ dice: 10, diceLabel: "10d8" });
  });

  it("level 0 -> 0d8", () => {
    expect(hiddenStrikeDice(0)).toEqual({ dice: 0, diceLabel: "0d8" });
  });
});

describe("Vigilante Specialization class-feature detail line", () => {
  it("avenger shows the full-BAB note", () => {
    const doc = makeVigilante(5, "avenger");
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const spec = classFeatures.find((f) => f.name === "Vigilante Specialization");
    expect(spec?.detail).toBe("Avenger: full BAB (= vigilante level)");
  });

  it("stalker shows Hidden Strike dice", () => {
    const doc = makeVigilante(5, "stalker");
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const spec = classFeatures.find((f) => f.name === "Vigilante Specialization");
    expect(spec?.detail).toBe("Stalker: Hidden Strike 3d8");
  });
});

describe("VIGILANTE_SOCIAL_TALENTS / VIGILANTE_TALENTS tables", () => {
  it("social talents have no displayOnly-violating changes on identity-gated entries", () => {
    // Renown's Intimidate bonus is identity-scoped (unmodeled) — must stay
    // note-only, not a live Change, per the honesty-bar doc comment.
    expect(VIGILANTE_SOCIAL_TALENTS.renown?.changes).toEqual([]);
    expect(VIGILANTE_SOCIAL_TALENTS.renown?.contextNotes?.length).toBeGreaterThan(0);
  });

  it("Shadow's Speed carries a genuine landSpeed Change", () => {
    const talent = VIGILANTE_TALENTS.shadowsSpeed;
    expect(talent?.changes.length).toBe(1);
    expect(talent?.changes[0]?.target).toBe("landSpeed");
  });

  it("Monkey's Paws carries a genuine Escape Artist competence Change", () => {
    const talent = VIGILANTE_TALENTS.monkeysPaws;
    expect(talent?.changes).toEqual([{ formula: "4", target: "skill.esc", type: "competence" }]);
  });

  it("gate-restricted talents filter correctly by specialization", () => {
    const avengerOnly = vigilanteTalentsForSpecialization("avenger");
    const stalkerOnly = vigilanteTalentsForSpecialization("stalker");
    expect(avengerOnly.some((t) => t.id === "fistOfTheAvenger")).toBe(true);
    expect(avengerOnly.some((t) => t.id === "evasion")).toBe(false);
    expect(stalkerOnly.some((t) => t.id === "evasion")).toBe(true);
    expect(stalkerOnly.some((t) => t.id === "fistOfTheAvenger")).toBe(false);
    // "either"-gated talents show up for both.
    expect(avengerOnly.some((t) => t.id === "shadowsSpeed")).toBe(true);
    expect(stalkerOnly.some((t) => t.id === "shadowsSpeed")).toBe(true);
  });

  it("social talent ids are unique and non-empty", () => {
    expect(VIGILANTE_SOCIAL_TALENT_IDS.length).toBeGreaterThan(10);
    expect(new Set(VIGILANTE_SOCIAL_TALENT_IDS).size).toBe(VIGILANTE_SOCIAL_TALENT_IDS.length);
  });

  it("vigilante talent ids are unique and non-empty", () => {
    expect(VIGILANTE_TALENT_IDS.length).toBeGreaterThan(10);
    expect(new Set(VIGILANTE_TALENT_IDS).size).toBe(VIGILANTE_TALENT_IDS.length);
  });
});

describe("Shadow's Speed's Change formula (applied as an active buff, mirroring the shifter-aspect toggle shape)", () => {
  it("evaluates to +10 ft. landSpeed below 10th level, +20 ft. at 10th+", () => {
    for (const [level, expected] of [
      [5, 10],
      [10, 20],
      [15, 20],
    ] as const) {
      const doc = makeVigilante(level, "avenger");
      doc.live.activeBuffs = [
        {
          instanceId: "b1",
          buffId: "vigilante-talent:shadowsSpeed",
          name: "Shadow's Speed",
          changes: VIGILANTE_TALENTS.shadowsSpeed!.changes.map((c) => ({ ...c })),
        },
      ];
      const rollData = buildRollData(doc, ref);
      const mods = collectModifiers(doc, ref, rollData);
      const speedMod = mods.find((m) => m.target === "landSpeed" && m.source === "Shadow's Speed");
      expect(speedMod?.value).toBe(expected);
    }
  });
});

describe("vigilante talents (collectGrantedFeatures / resolveClassFeatures display)", () => {
  function socialFeatureNames(doc: CharacterDoc): string[] {
    const { classFeatures } = resolveClassFeatures(doc, ref);
    return classFeatures
      .filter((f) => f.origin?.kind === "vigilanteSocialTalent")
      .map((f) => f.name)
      .sort();
  }
  function talentFeatureNames(doc: CharacterDoc): string[] {
    const { classFeatures } = resolveClassFeatures(doc, ref);
    return classFeatures
      .filter((f) => f.origin?.kind === "vigilanteTalent")
      .map((f) => f.name)
      .sort();
  }

  it("chosen social + vigilante talents are surfaced with distinct origin kinds", () => {
    const doc = makeVigilante(4, "avenger", {
      vigilanteSocialTalents: ["renown", "doubleTime"],
      vigilanteTalents: ["shadowsSpeed"],
    });
    expect(socialFeatureNames(doc)).toEqual(["Double Time", "Renown"]);
    expect(talentFeatureNames(doc)).toEqual(["Shadow's Speed"]);
  });

  it("collectGrantedFeatures gates on vigilante level (0 for a non-vigilante)", () => {
    const doc: CharacterDoc = {
      ...makeVigilante(0, undefined, { vigilanteSocialTalents: ["renown"] }),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "vigilanteSocialTalent")).toBe(false);
  });

  it("unknown talent ids are skipped, never crash", () => {
    const doc = makeVigilante(4, "avenger", {
      vigilanteSocialTalents: ["not-a-real-talent"],
      vigilanteTalents: ["also-not-real"],
    });
    expect(() => resolveClassFeatures(doc, ref)).not.toThrow();
  });
});
