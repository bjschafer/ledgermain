/**
 * Hand-computed fixture tests for alchemist discoveries (issue #65; full
 * vendored parity since the #74 Phase 5 extension). Nearly every discovery
 * in `ALCHEMIST_DISCOVERIES` is `displayOnly` with `changes: []` (see that
 * file's doc comment) — the five always-on promotions have cited fixtures
 * below. Also exercised: gating on actual alchemist levels, unknown-id
 * tolerance, and surfacing picked discoveries through
 * `collectGrantedFeatures`/`resolveClassFeatures` — same pattern as
 * `magusArcana.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectModifiers } from "../src/collect.js";
import { ALCHEMIST_DISCOVERIES, ALCHEMIST_DISCOVERY_IDS } from "../src/alchemist-discoveries.js";
import {
  COGNATOGEN_BUFF_IDS,
  COGNATOGEN_BUFFS,
  collectGrantedFeatures,
  compute,
  deriveResourcePools,
  resolveClassFeatures,
} from "../src/index.js";
import { buildRollData } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeAlchemist(level: number, alchemistDiscoveries?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "alchemist", level }],
    },
    abilities: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(alchemistDiscoveries ? { alchemistDiscoveries } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function discoveryFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "discovery")
    .map((f) => f.name)
    .sort();
}

describe("ALCHEMIST_DISCOVERIES table", () => {
  it("only the five Phase 5 promotions carry unconditional changes; Cognatogen alone is modeled without them", () => {
    const withChanges: string[] = [];
    for (const id of ALCHEMIST_DISCOVERY_IDS) {
      const discovery = ALCHEMIST_DISCOVERIES[id]!;
      if (discovery.changes.length > 0) withChanges.push(id);
      // Cognatogen's mechanics ride toggleable buffs, not `changes` — it and
      // the changes[] promotions are what the picker's "M" badge marks.
      expect(discovery.displayOnly).toBe(id !== "cognatogen" && discovery.changes.length === 0);
    }
    expect(withChanges.sort()).toEqual([
      "awakenedIntellect",
      "chameleon",
      "mummification",
      "pheromones",
      "webbedExtremities",
    ]);
  });

  it("includes well-known APG entries", () => {
    expect(ALCHEMIST_DISCOVERIES.acidBomb?.name).toBe("Acid Bomb");
    expect(ALCHEMIST_DISCOVERIES.feralMutagen?.name).toBe("Feral Mutagen");
    expect(ALCHEMIST_DISCOVERIES.infusion?.name).toBe("Infusion");
  });

  it("includes the Cognatogen line (Ultimate Magic, same numeric shape as Mutagen per RAW)", () => {
    expect(ALCHEMIST_DISCOVERIES.cognatogen?.name).toBe("Cognatogen");
    expect(ALCHEMIST_DISCOVERIES.greaterCognatogen?.minLevel).toBe(12);
    expect(ALCHEMIST_DISCOVERIES.grandCognatogen?.minLevel).toBe(16);
  });

  it("covers the full 168-entry vendored catalog (issue #74 Phase 5 parity)", () => {
    expect(ALCHEMIST_DISCOVERY_IDS.length).toBe(168);
  });

  it("every entry has a minLevel of at least 2 (no discovery before 2nd level)", () => {
    for (const id of ALCHEMIST_DISCOVERY_IDS) {
      expect(ALCHEMIST_DISCOVERIES[id]!.minLevel).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("alchemist discoveries (collectModifiers)", () => {
  it("a chosen displayOnly discovery contributes no numeric modifier", () => {
    const doc = makeAlchemist(6, ["acidBomb", "cognatogen", "infusion"]);
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "acidBomb" || m.sourceId === "cognatogen")).toBe(false);
  });

  it("unknown discovery ids are skipped, never crash", () => {
    const doc = makeAlchemist(6, ["not-a-real-discovery"]);
    const rollData = buildRollData(doc, ref);
    expect(() => collectModifiers(doc, ref, rollData)).not.toThrow();
  });

  it("Chameleon (Advanced Race Guide): +4 enhancement to Stealth, +8 from alchemist 10th", () => {
    const at6 = collectModifiers(
      makeAlchemist(6, ["chameleon"]),
      ref,
      buildRollData(makeAlchemist(6, ["chameleon"]), ref),
    );
    const mod6 = at6.find((m) => m.sourceId === "chameleon");
    expect(mod6?.target).toBe("skill.ste");
    expect(mod6?.value).toBe(4);
    const doc10 = makeAlchemist(10, ["chameleon"]);
    const mod10 = collectModifiers(doc10, ref, buildRollData(doc10, ref)).find(
      (m) => m.sourceId === "chameleon",
    );
    expect(mod10?.value).toBe(8);
  });

  it("Pheromones (Ultimate Wilderness): permanent +3 competence to Bluff, Diplomacy, Intimidate", () => {
    const doc = makeAlchemist(6, ["pheromones"]);
    const mods = collectModifiers(doc, ref, buildRollData(doc, ref)).filter(
      (m) => m.sourceId === "pheromones",
    );
    expect(mods.map((m) => [m.target, m.value]).sort()).toEqual([
      ["skill.blf", 3],
      ["skill.dip", 3],
      ["skill.int", 3],
    ]);
    for (const m of mods) expect(m.type).toBe("competence");
  });

  it("Webbed Extremities (Pathfinder #123): +4 alchemical to Swim", () => {
    const doc = makeAlchemist(4, ["webbedExtremities"]);
    const mod = collectModifiers(doc, ref, buildRollData(doc, ref)).find(
      (m) => m.sourceId === "webbedExtremities",
    );
    expect(mod?.target).toBe("skill.swm");
    expect(mod?.value).toBe(4);
    expect(mod?.type).toBe("alchemical");
  });

  it("Awakened Intellect (APG grand discovery): permanent +2 Intelligence", () => {
    const doc = makeAlchemist(20, ["awakenedIntellect"]);
    const mod = collectModifiers(doc, ref, buildRollData(doc, ref)).find(
      (m) => m.sourceId === "awakenedIntellect",
    );
    expect(mod?.target).toBe("int");
    expect(mod?.value).toBe(2);
    expect(ALCHEMIST_DISCOVERIES.awakenedIntellect!.minLevel).toBe(20);
  });

  it("Mummification (Ultimate Magic): cold immunity + paralysis/sleep/nonlethal effect immunities on the sheet", () => {
    const doc = makeAlchemist(10, ["mummification"]);
    const sheet = compute(doc, ref);
    expect(sheet.defenses?.immunities?.some((i) => i.qualifier === "cold")).toBe(true);
    const slugs = sheet.defenses?.effectImmunities?.map((e) => e.qualifier) ?? [];
    expect(slugs).toContain("paralysis");
    expect(slugs).toContain("sleep");
    expect(slugs).toContain("nonlethalDamage");
  });

  it("a non-alchemist with a stale alchemistDiscoveries field gets nothing (gated on class level)", () => {
    const doc: CharacterDoc = {
      ...makeAlchemist(0, ["acidBomb"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const rollData = buildRollData(doc, ref);
    const mods = collectModifiers(doc, ref, rollData);
    expect(mods.some((m) => m.sourceId === "acidBomb")).toBe(false);
  });
});

describe("alchemist discoveries (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen discovery is surfaced with origin.kind 'discovery'", () => {
    const doc = makeAlchemist(6, ["acidBomb", "infusion"]);
    expect(discoveryFeatureNames(doc)).toEqual(["Acid Bomb", "Infusion"]);
  });

  it("no discovery chosen surfaces nothing", () => {
    const doc = makeAlchemist(6);
    expect(discoveryFeatureNames(doc)).toEqual([]);
  });

  it("carries the discovery's summary as detail (no vendored description to fall back to)", () => {
    const doc = makeAlchemist(6, ["acidBomb"]);
    const { classFeatures } = resolveClassFeatures(doc, ref);
    const feature = classFeatures.find((f) => f.origin?.kind === "discovery");
    expect(feature?.detail).toBe(ALCHEMIST_DISCOVERIES.acidBomb!.summary);
  });

  it("collectGrantedFeatures gates on alchemist level (0 for a non-alchemist)", () => {
    const doc: CharacterDoc = {
      ...makeAlchemist(0, ["acidBomb"]),
      identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 4 }] },
    };
    const granted = collectGrantedFeatures(doc, ref);
    expect(granted.some((g) => g.origin?.kind === "discovery")).toBe(false);
  });
});

describe("Cognatogen buffs (cognatogen.ts) and their Mutagen-pool link", () => {
  const mutagenPool = (doc: CharacterDoc) =>
    deriveResourcePools(doc, ref).find((p) => p.name === "Mutagen");

  it("the Mutagen pool links only the 3 vendored Mutagen buffs without the discovery", () => {
    const pool = mutagenPool(makeAlchemist(6));
    expect(pool).toBeDefined();
    for (const id of Object.values(COGNATOGEN_BUFF_IDS)) {
      expect(pool!.linkedBuffIds).not.toContain(id);
    }
  });

  it("taking Cognatogen adds its 3 buffs to the SAME pool (RAW: brewed in place of a mutagen)", () => {
    const pool = mutagenPool(makeAlchemist(6, ["cognatogen"]))!;
    for (const id of Object.values(COGNATOGEN_BUFF_IDS)) {
      expect(pool.linkedBuffIds).toContain(id);
    }
    // The vendored Mutagen buffs are still there — cognatogen adds, not replaces.
    expect(pool.linkedBuffIds.length).toBe(6);
  });

  it("each Cognatogen buff mirrors Mutagen: +4 mental, -2 to the linked physical score, +2 natural armor", () => {
    const expected: Record<string, [string, string]> = {
      [COGNATOGEN_BUFF_IDS.int]: ["int", "str"],
      [COGNATOGEN_BUFF_IDS.wis]: ["wis", "dex"],
      [COGNATOGEN_BUFF_IDS.cha]: ["cha", "con"],
    };
    for (const [id, [boosted, penalized]] of Object.entries(expected)) {
      const buff = COGNATOGEN_BUFFS[id]!;
      expect(buff.changes).toEqual([
        { formula: "4", target: boosted, type: "alchemical" },
        { formula: "-2", target: penalized, type: "alchemical" },
        { formula: "2", target: "nac", type: "alchemical" },
      ]);
      // Namespaced so it can never collide with a real vendored buff key.
      expect(ref.buffs[id]).toBeUndefined();
    }
  });

  it("a Cognatogen buff applies as an alchemical bonus once activated", () => {
    const doc = makeAlchemist(6, ["cognatogen"]);
    const buff = COGNATOGEN_BUFFS[COGNATOGEN_BUFF_IDS.int]!;
    // The tracker's linked-buff toggle copies a `Buff`'s changes into the
    // `ActiveBuff` instance (see `model/buffs.ts` `makeActiveBuff`), which is
    // what makes a non-`refData.buffs` buff computable at all.
    const active: CharacterDoc = {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          {
            instanceId: "buff-cognatogen-int",
            buffId: buff.id,
            name: buff.name,
            changes: buff.changes.map((c) => ({ ...c })),
          },
        ],
      },
    };
    const sheet = compute(active, ref);
    expect(sheet.abilities.int.total).toBe(doc.abilities.int + 4);
    expect(sheet.abilities.str.total).toBe(doc.abilities.str - 2);
  });
});
