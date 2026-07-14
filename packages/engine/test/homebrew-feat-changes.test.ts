/**
 * `Feat.changes` (homebrew-only field — see its doc comment in
 * `@pf1/schema`'s `refdata.ts`): a homebrew feat has no name-slug entry in
 * the hand-curated `FEAT_EFFECTS` table, so it needs its mechanical effect
 * encoded directly on the entity, the same way `Race.changes`/`Item.changes`
 * already work. Verifies `collectModifiers` applies it — both for the
 * primary feat slot and a repeatable feat's extra instances — without
 * disturbing the existing table-resolved path for vendored feats.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, Feat, RefData } from "@pf1/schema";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HOMEBREW_FEAT_ID = "hb-feat-grit";

function homebrewFeat(over: Partial<Feat> = {}): Feat {
  return {
    id: HOMEBREW_FEAT_ID,
    uuid: HOMEBREW_FEAT_ID,
    name: "Homebrew Grit",
    tags: [],
    prerequisites: { abilities: [], feats: [], skills: [] },
    changes: [{ formula: "2", target: "skill.per", type: "untyped" }],
    ...over,
  };
}

function overlaidRef(feat: Feat): RefData {
  return { ...ref, feats: { ...ref.feats, [feat.id]: feat } };
}

function makeDoc(over: {
  feats?: string[];
  featChoices?: Record<string, string>;
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      extraFeats: over.extraFeats,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("Feat.changes (homebrew)", () => {
  it("applies a homebrew feat's own changes even though no FEAT_EFFECTS entry exists for it", () => {
    const feat = homebrewFeat();
    const overlaid = overlaidRef(feat);
    const withoutFeat = compute(makeDoc({}), overlaid);
    const withFeat = compute(makeDoc({ feats: [feat.id] }), overlaid);
    expect(withFeat.skills.per!.total - withoutFeat.skills.per!.total).toBe(2);
  });

  it("applies the same changes for a repeatable extra-instance copy", () => {
    const feat = homebrewFeat({ changes: [{ formula: "1", target: "ac", type: "dodge" }] });
    const overlaid = overlaidRef(feat);
    const base = compute(makeDoc({}), overlaid);
    const withExtra = compute(
      makeDoc({ extraFeats: [{ instanceId: "i1", featId: feat.id }] }),
      overlaid,
    );
    expect(withExtra.ac.normal - base.ac.normal).toBe(1);
  });

  it("does not affect vendored feats that carry no `changes` field (table-resolved path untouched)", () => {
    const toughnessId = Object.entries(ref.feats).find(([, f]) => f.name === "Toughness")?.[0];
    if (!toughnessId) throw new Error("Toughness not found in vendored data");
    const base = compute(makeDoc({}), ref);
    const withFeat = compute(makeDoc({ feats: [toughnessId] }), ref);
    // Toughness still grants its normal HP bonus via FEAT_EFFECTS, unaffected
    // by the new (unused, since vendored Toughness has no `changes`) code path.
    expect(withFeat.hp.max).toBeGreaterThan(base.hp.max);
  });
});
