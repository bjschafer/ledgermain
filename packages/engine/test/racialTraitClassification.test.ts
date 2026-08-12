/**
 * Structural guards for the vendored-racial-trait classification audit
 * (`src/racial-trait-classification/`): every verdict must still describe a
 * real vendored entry (a refdata bump that rekeys or renames fails loudly,
 * same posture as the data-pipeline supplement guards), shards must not
 * collide or misfile across their alphabetical ranges, and a `numeric`
 * verdict is only honest if some wired route actually carries the number.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  RACIAL_TRAIT_CLASSIFICATION,
  RACIAL_TRAIT_CLASSIFICATION_SHARDS,
} from "../src/racial-trait-classification/index.js";
import { RACIAL_TRAITS } from "../src/racial-traits.js";
import {
  saveChangesFromNotes,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "../src/vendored-trait-save-notes.js";
import {
  maneuverChangesFromNotes,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
} from "../src/vendored-trait-maneuver-notes.js";

const ref = loadRefData();

const SHARD_RANGES: readonly [first: string, last: string][] = [
  ["A", "D"],
  ["E", "G"],
  ["H", "R"],
  ["S", "Z"],
];

describe("RACIAL_TRAIT_CLASSIFICATION: structural guards", () => {
  it("every entry matches a vendored racial trait by id, race, and name", () => {
    for (const [id, entry] of Object.entries(RACIAL_TRAIT_CLASSIFICATION)) {
      const vendored = ref.racialTraits[id];
      expect(vendored, `${entry.race} :: ${entry.name} (${id}) not in vendored set`).toBeDefined();
      expect(entry.id).toBe(id);
      expect(vendored?.race.join(",")).toBe(entry.race);
      expect(vendored?.name).toBe(entry.name);
    }
  });

  it("shards are collision-free and filed under their alphabetical range", () => {
    const total = RACIAL_TRAIT_CLASSIFICATION_SHARDS.reduce(
      (n, shard) => n + Object.keys(shard).length,
      0,
    );
    expect(Object.keys(RACIAL_TRAIT_CLASSIFICATION).length).toBe(total);
    for (const [i, shard] of RACIAL_TRAIT_CLASSIFICATION_SHARDS.entries()) {
      const [first, last] = SHARD_RANGES[i]!;
      for (const entry of Object.values(shard)) {
        const initial = entry.race.slice(0, 1).toUpperCase();
        expect(
          initial >= first && initial <= last,
          `${entry.race} :: ${entry.name} misfiled in shard ${first}-${last}`,
        ).toBe(true);
      }
    }
  });

  it("every numeric verdict has a wired route carrying the number", () => {
    const handByRaceName = new Map(
      Object.values(RACIAL_TRAITS).map((def) => [`${def.race}|${def.name}`, def]),
    );
    for (const entry of Object.values(RACIAL_TRAIT_CLASSIFICATION)) {
      if (entry.bucket !== "numeric") continue;
      const vendored = ref.racialTraits[entry.id];
      if (!vendored) continue; // covered by the id guard above
      const hand = handByRaceName.get(`${entry.race}|${entry.name}`);
      const wired =
        vendored.changes.length > 0 ||
        (vendored.openChanges?.length ?? 0) > 0 ||
        saveChangesFromNotes(vendored.contextNotes, VENDORED_RACIAL_TRAIT_SAVE_NOTES).length > 0 ||
        maneuverChangesFromNotes(vendored.contextNotes, VENDORED_RACIAL_TRAIT_MANEUVER_NOTES)
          .length > 0 ||
        (hand !== undefined && JSON.stringify(hand).includes('"formula"'));
      expect(wired, `${entry.race} :: ${entry.name} is numeric but no route is wired`).toBe(true);
    }
  });
});
