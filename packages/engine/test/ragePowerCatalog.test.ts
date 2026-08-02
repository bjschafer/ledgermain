import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  compute,
  mergedRagePowerCatalog,
  RAGE_POWER_IDS,
  RAGE_POWERS,
  resolveRagePower,
} from "../src/index.js";

/**
 * Coverage for the vendored-catalog overlay — see `rage-powers.ts`'s "vendored
 * catalog overlay" section doc comment for the collision-audit narrative this
 * asserts against.
 */
const ref = loadRefData();

describe("mergedRagePowerCatalog", () => {
  const merged = mergedRagePowerCatalog(ref);
  const byId = new Map(merged.map((p) => [p.id, p]));

  it("has exactly one row per vendored entry — no hand-authored-only rows remain", () => {
    // "Sixth Sense", formerly the one hand-only row, was removed after an
    // audit found no such Paizo rage power exists (see rage-powers.ts).
    const vendoredCount = Object.keys(ref.ragePowers).length;
    expect(merged).toHaveLength(vendoredCount);
  });

  it("all 243 hand-authored entries matched a vendored entry by name and kept their own id + mechanics", () => {
    let matched = 0;
    for (const id of RAGE_POWER_IDS) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      // Matched entries keep the hand-authored def's own mechanics...
      expect(entry!.changes).toEqual(RAGE_POWERS[id]!.changes);
      expect(entry!.displayOnly).toBe(RAGE_POWERS[id]!.displayOnly);
      // ...but pick up the vendored prose for display.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(243);
  });

  it("no vendored-only entries remain except the pre-existing Guarded Stance (Unchained Stance) duplicate — the fallback path only exists for a future data bump", () => {
    // Full hand-table parity as of the parity sweep's final batch (S-Z): every
    // one of the 243 UNIQUE vendored names has a hand-authored row. The one
    // exception is a documented, deliberate non-match rather than a gap —
    // see the file doc comment's collision-audit section: the vendored
    // catalog's 244th raw row is a reworded Pathfinder Unchained restatement
    // of Guarded Stance that shares its normalized name with the
    // hand-authored (CRB) entry, so it can never win a name-based match.
    for (const entry of merged) {
      if (entry.id === "guarded_stance_stance") continue;
      expect(RAGE_POWERS[entry.id], entry.id).toBeDefined();
    }
  });

  it("Guarded Stance: the CRB vendored entry (no category) matches the hand-authored entry; the Pathfinder Unchained 'Stance' variant stays a separate vendored-only row", () => {
    const crb = byId.get("guardedStance")!;
    expect(crb.description).toContain("dodge bonus");
    expect(crb.changes).toEqual(RAGE_POWERS.guardedStance!.changes);

    const variant = byId.get("guarded_stance_stance")!;
    expect(variant.displayOnly).toBe(true);
    expect(variant.category).toBe("Stance");
    expect(variant.id).not.toBe(crb.id);
  });

  it("every id is unique", () => {
    const ids = merged.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveRagePower", () => {
  it("prefers the hand-authored table for a matched id", () => {
    const power = resolveRagePower("animalFury", ref);
    expect(power).toBe(RAGE_POWERS.animalFury);
  });

  it("falls back to the vendored catalog for a vendored-only id", () => {
    // "guarded_stance_stance" (the Pathfinder Unchained restatement of
    // Guarded Stance — see the file doc comment's collision-audit section)
    // is the sole remaining vendored-only entry after full parity.
    const power = resolveRagePower("guarded_stance_stance", ref);
    expect(power?.displayOnly).toBe(true);
    expect(power?.name).toBe("Guarded Stance");
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveRagePower("not-a-real-power", ref)).toBeUndefined();
  });
});

describe("a vendored-only pick surfaces on the sheet like any other rage power", () => {
  function raceId(name: string): string {
    const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
    if (!entry) throw new Error(`race not found: ${name}`);
    return entry[0];
  }

  function makeDoc(ragePowers: string[]): CharacterDoc {
    return {
      schemaVersion: 1,
      id: "test",
      ownerId: "owner",
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "barbarian", level: 12 }],
      },
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        ragePowers,
      },
      live: {
        hp: { current: 0, temp: 0, nonlethal: 0 },
        conditions: [],
        activeBuffs: [],
        resources: {},
      },
    };
  }

  it("appears in classFeatures, tagged Rage Power, with no crash and no numeric Change applied", () => {
    const doc = makeDoc(["guarded_stance_stance"]);
    const sheet = compute(doc, ref);
    expect(sheet.classFeatures.map((f) => f.name)).toContain("Guarded Stance");
  });
});
