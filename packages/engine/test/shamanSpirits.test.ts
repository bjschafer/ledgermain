/**
 * Hand-computed fixture tests for shaman spirits + hexes (issue #65). Almost
 * every hex in `SHAMAN_SPIRITS[tag].hexes` is note-tier prose with `changes:
 * []` — one promotion exists (Flame's Cinder Dance, a flat landSpeed bump —
 * see `shaman-spirits.ts`'s doc comment for its RAW citation and the
 * near-misses left blocked). What IS exercised: the table's shape (8 spirits
 * × 9 spirit-magic spells × 5 hexes), the spirit ability + hexes surfacing
 * through `collectGrantedFeatures`/`resolveClassFeatures` gated on actual
 * shaman levels AND a chosen spirit, per-spirit hex scoping (display AND
 * numeric), unknown-id tolerance, and Cinder Dance's real `compute()` effect
 * on `speeds.land` — same pattern as `oracleRevelations.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, compute, resolveClassFeatures } from "../src/index.js";
import {
  findShamanHex,
  hexesForSpirit,
  SHAMAN_SPIRIT_TAGS,
  SHAMAN_SPIRITS,
} from "../src/shaman-spirits.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeShaman(level: number, shamanSpirit?: string, shamanHexes?: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "shaman", level }],
    },
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 16, cha: 12 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(shamanSpirit ? { shamanSpirit } : {}),
      ...(shamanHexes ? { shamanHexes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function spiritAndHexFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "spirit" || f.origin?.kind === "hex")
    .map((f) => f.name)
    .sort();
}

describe("SHAMAN_SPIRITS table", () => {
  it("covers exactly the 8 ACG core spirits", () => {
    expect([...SHAMAN_SPIRIT_TAGS].sort()).toEqual(
      ["battle", "bones", "flame", "heavens", "life", "nature", "stone", "waves"].sort(),
    );
  });

  it("every spirit has 9 spirit-magic spells, levels 1-9 in order, each a real vendored spell id", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.spiritMagicSpells.map((sp) => sp.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const sp of spirit.spiritMagicSpells) {
        expect(ref.spells[sp.id]).toBeDefined();
      }
    }
  });

  it("every spirit has exactly 5 hexes, ids prefixed with the spirit's own tag", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.hexes).toHaveLength(5);
      for (const h of spirit.hexes) {
        expect(h.id.startsWith(`${tag}:`)).toBe(true);
      }
    }
  });

  it("every spirit has a named 1st-level ability with a summary", () => {
    for (const tag of SHAMAN_SPIRIT_TAGS) {
      const spirit = SHAMAN_SPIRITS[tag]!;
      expect(spirit.ability.name.length).toBeGreaterThan(0);
      expect(spirit.ability.summary.length).toBeGreaterThan(0);
    }
  });

  it("hexesForSpirit returns the same 5 hexes as the table entry", () => {
    expect(hexesForSpirit("battle")).toEqual(SHAMAN_SPIRITS.battle!.hexes);
  });

  it("hexesForSpirit returns [] for an unknown spirit tag", () => {
    expect(hexesForSpirit("not-a-spirit")).toEqual([]);
  });

  it("findShamanHex resolves a valid id and returns undefined for an unknown one", () => {
    expect(findShamanHex("battle:battleMaster")?.name).toBe("Battle Master");
    expect(findShamanHex("battle:notReal")).toBeUndefined();
    expect(findShamanHex("not-a-spirit:foo")).toBeUndefined();
  });

  it("exactly one hex across all 40 carries a real Change — Flame's Cinder Dance", () => {
    const withChanges = SHAMAN_SPIRIT_TAGS.flatMap((tag) =>
      SHAMAN_SPIRITS[tag]!.hexes.filter((h) => h.changes.length > 0),
    );
    expect(withChanges.map((h) => h.id)).toEqual(["flame:cinderDance"]);
    expect(withChanges[0]!.displayOnly).toBe(false);
  });

  it("Cinder Dance's Change: RAW +10 ft. to base land speed (Ex, no action, no per-day limit)", () => {
    const cinderDance = findShamanHex("flame:cinderDance")!;
    expect(cinderDance.changes).toEqual([{ formula: "10", target: "landSpeed", type: "untyped" }]);
  });
});

describe("shaman spirit + hexes (collectGrantedFeatures / resolveClassFeatures display)", () => {
  it("a chosen spirit surfaces its 1st-level ability, gated on actual shaman levels", () => {
    const doc = makeShaman(1, "battle");
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("no spirit chosen surfaces nothing, even at high level", () => {
    const doc = makeShaman(10);
    expect(spiritAndHexFeatureNames(doc)).toEqual([]);
  });

  it("chosen hexes from the CURRENT spirit are surfaced alongside the ability", () => {
    const doc = makeShaman(4, "battle", ["battle:battleMaster", "battle:hamperingHex"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(
      ["Battle Master", "Battle Spirit", "Hampering Hex"].sort(),
    );
  });

  it("a hex id from a DIFFERENT spirit than the one chosen is skipped", () => {
    const doc = makeShaman(4, "battle", ["life:channel"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("unknown hex ids are skipped, never crash", () => {
    const doc = makeShaman(4, "battle", ["not-a-real-hex"]);
    expect(spiritAndHexFeatureNames(doc)).toEqual(["Battle Spirit"]);
  });

  it("collectGrantedFeatures gives the spirit ability a resolved grant with origin.kind 'spirit'", () => {
    const doc = makeShaman(1, "life");
    const granted = collectGrantedFeatures(doc, ref);
    const spiritGrant = granted.find((g) => g.origin?.kind === "spirit");
    expect(spiritGrant?.grant.name).toBe("Channel");
    expect(spiritGrant?.detail).toContain("Cha modifier times/day");
  });
});

describe("Cinder Dance (flame:cinderDance) — the one promoted spirit hex", () => {
  it("bumps land speed by 10 ft. via compute() when picked under the Flame spirit", () => {
    const base = compute(makeShaman(2, "flame"), ref);
    const withHex = compute(makeShaman(2, "flame", ["flame:cinderDance"]), ref);
    expect(withHex.speeds.land).toBe((base.speeds.land ?? 0) + 10);
  });

  it("does NOT apply while a different spirit is currently chosen (stale pick, same tolerance collectGrantedFeatures already gives the display side)", () => {
    const base = compute(makeShaman(2, "battle"), ref);
    const withStaleHex = compute(makeShaman(2, "battle", ["flame:cinderDance"]), ref);
    expect(withStaleHex.speeds.land).toBe(base.speeds.land);
  });

  it("does NOT apply with no shaman levels at all (gated on the granting class, same as every other loop here)", () => {
    const doc = makeShaman(2, "flame", ["flame:cinderDance"]);
    const noClassDoc: CharacterDoc = { ...doc, identity: { ...doc.identity, classes: [] } };
    const withHex = compute(noClassDoc, ref);
    const withoutHex = compute(
      { ...noClassDoc, build: { ...noClassDoc.build, shamanHexes: [] } },
      ref,
    );
    expect(withHex.speeds.land).toBe(withoutHex.speeds.land);
  });
});
