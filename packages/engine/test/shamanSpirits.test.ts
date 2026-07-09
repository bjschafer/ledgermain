/**
 * Hand-computed fixture tests for shaman spirits + hexes (issue #65). Every
 * hex in `SHAMAN_SPIRITS[tag].hexes` is note-tier prose with no `changes[]`
 * field at all (the type doesn't carry one — see `shaman-spirits.ts`'s doc
 * comment), so there's nothing for `collectModifiers` to apply; what IS
 * exercised: the table's shape (8 spirits × 9 spirit-magic spells × 5
 * hexes), the spirit ability + hexes surfacing through
 * `collectGrantedFeatures`/`resolveClassFeatures` gated on actual shaman
 * levels AND a chosen spirit, per-spirit hex scoping, and unknown-id
 * tolerance — same pattern as `oracleRevelations.test.ts`.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { collectGrantedFeatures, resolveClassFeatures } from "../src/index.js";
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
