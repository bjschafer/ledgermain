/**
 * Hand-computed fixture tests for the summoning-feat pass (community
 * pf1-content pack — see `feat-effects.ts`'s "Summoning feats" section).
 * Extra Summons is the one summoning feat with a real PC-sheet number (a
 * `FEAT_POOL_EFFECTS` pool bonus, same shape as Extra Rage/Extra Arcane
 * Pool — see `tracker.test.ts`'s pool-feat describe block for the sibling
 * pattern this mirrors). Every other summoning feat is `changes: []` with a
 * `contextNotes` reminder, so `compute()` must be a true no-op for them —
 * exercised the same way `alchemistDiscoveries.test.ts` checks its
 * displayOnly table.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { featNameSlug } from "../src/feat-effects.js";
import { resolveFeatEffect } from "../src/feat-effects-resolve.js";
import { compute } from "../src/index.js";
import { deriveResourcePools } from "../src/resources.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  extraFeats?: { instanceId: string; featId: string }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: over.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    build: {
      feats: over.feats ?? [],
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

describe("Extra Summons (FEAT_POOL_EFFECTS)", () => {
  // Summoner 5, Cha 14 (mod +2): Summon Monster pool = 3 + 2 = 5 uses/day.
  // Extra Summons' vendored text is "You gain 1 additional use of your summon
  // monster spell-like ability per day" (+1, not +2) — one instance raises
  // 5 -> 6.
  it("summoner 5 (Cha 14): Summon Monster pool 3+Cha=5 gains +1 -> 6 with one Extra Summons", () => {
    const base = makeDoc({ classes: [{ tag: "summoner", level: 5 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "summoner", level: 5 }],
      feats: [featId("Extra Summons")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    const basePool = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Summon Monster",
    );
    const featPool = deriveResourcePools(withFeat, ref, featSheet.abilities).find(
      (p) => p.name === "Summon Monster",
    );
    expect(basePool?.max).toBe(5);
    expect(featPool?.max).toBe(6);
  });

  // The feat is explicitly repeatable ("once for every five summoner levels
  // you possess") — two instances (primary + a build.extraFeats copy, same
  // shape issue #58 established for Extra Rage) stack to +2, taking the pool
  // from 3+Cha (5) to 5+Cha (7).
  it("two instances of Extra Summons (primary + extraFeats) stack to +2 -> 5+Cha", () => {
    const extraSummonsId = featId("Extra Summons");
    const doc = makeDoc({
      classes: [{ tag: "summoner", level: 10 }],
      feats: [extraSummonsId],
      extraFeats: [{ instanceId: "feat-2", featId: extraSummonsId }],
    });
    const sheet = compute(doc, ref);
    const pool = deriveResourcePools(doc, ref, sheet.abilities).find(
      (p) => p.name === "Summon Monster",
    );
    // 3 + Cha(2) + 1 + 1 = 7.
    expect(pool?.max).toBe(7);
  });

  // Unchained summoner's "Summon Monster (UC)" shares the vendored tag
  // `summonMonster` with the base summoner's feature, so the same feat
  // raises it too, without a second FEAT_POOL_EFFECTS entry.
  it("unchained summoner: the same feat raises Summon Monster (UC)'s pool", () => {
    const base = makeDoc({ classes: [{ tag: "summonerUnchained", level: 3 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "summonerUnchained", level: 3 }],
      feats: [featId("Extra Summons")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    const basePool = deriveResourcePools(base, ref, baseSheet.abilities).find(
      (p) => p.name === "Summon Monster (UC)",
    );
    const featPool = deriveResourcePools(withFeat, ref, featSheet.abilities).find(
      (p) => p.name === "Summon Monster (UC)",
    );
    expect(basePool?.max).toBe(5);
    expect(featPool?.max).toBe(6);
  });

  // Negative case (matches the Extra Arcane Pool/Extra Rage precedent in
  // tracker.test.ts): a class with no Summon Monster class feature at all
  // gets no phantom pool and compute() doesn't crash.
  it("a non-summoner with Extra Summons gets no phantom pool and doesn't crash", () => {
    const doc = makeDoc({
      classes: [{ tag: "fighter", level: 5 }],
      feats: [featId("Extra Summons")],
    });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name.startsWith("Summon Monster"))).toBeUndefined();
  });
});

describe("summoning feats with a contextNote-only effect (no PC-sheet Change)", () => {
  it("Augment Summoning resolves to a static entry with changes:[] and a contextNote carrying its +4/+4 numbers", () => {
    const resolved = resolveFeatEffect(featNameSlug("Augment Summoning"));
    expect(resolved?.entry.type).toBe("static");
    if (resolved?.entry.type === "static") {
      expect(resolved.entry.changes).toEqual([]);
      expect(resolved.entry.contextNotes?.[0]?.text).toMatch(
        /\+4 enhancement bonus to Strength and Constitution/,
      );
    }
  });

  it("adding Augment Summoning to a doc changes nothing on the derived sheet (changes:[] is a true no-op)", () => {
    const base = makeDoc({ classes: [{ tag: "wizard", level: 5 }] });
    const withFeat = makeDoc({
      classes: [{ tag: "wizard", level: 5 }],
      feats: [featId("Augment Summoning")],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet).toEqual(baseSheet);
  });

  it("Augment Summoning (Mythic) is flagged as mythic-not-modeled in its contextNote", () => {
    const resolved = resolveFeatEffect(featNameSlug("Augment Summoning (Mythic)"));
    expect(resolved?.entry.type).toBe("static");
    if (resolved?.entry.type === "static") {
      expect(resolved.entry.contextNotes?.[0]?.text).toMatch(/Mythic tier isn't modeled/);
    }
  });

  // Every hand-authored summoning-feat slug added in this pass resolves to a
  // real vendored feat name — guards against a typo'd slug silently never
  // matching (resolveFeatEffect would just return undefined, no crash, but
  // also no effect — this test would catch the drift).
  it("every hand-authored summoning-feat slug resolves to a real vendored feat name", () => {
    const slugs = [
      "extra-summons",
      "augment-summoning",
      "augment-summoning-mythic",
      "superior-summoning",
      "sacred-summons",
      "blackfire-summoning",
      "summon-good-monster",
      "summon-evil-monster",
      "summon-neutral-monster",
      "summon-plant-ally",
      "expanded-summon-monster",
      "evolved-summoned-monster",
      "ferocious-summons",
      "putrid-summons",
      "retributive-summoning",
      "harrowed-summoning",
      "sunlight-summons",
      "moonlight-summons",
      "starlight-summons",
      "scouting-summons",
      "proxy-summoning",
      "summoner-s-call",
      "summon-guardian-spirit",
      "skeleton-summoner",
      "spider-summoner",
      "nimble-natural-summons",
      "versatile-summon-monster",
      "versatile-summon-nature-s-ally",
      "spiritualist-s-call",
      "fire-music",
      "fire-music-mythic",
      "profane-studies",
      "ally-caller",
      "aquatic-squires",
      "dimensional-awareness",
      "banishing-critical",
      "dimensional-disruption",
      "painful-anchor",
    ];
    const nameSlugs = new Set(Object.values(ref.feats).map((f) => featNameSlug(f.name)));
    const missing = slugs.filter((s) => !nameSlugs.has(s));
    expect(missing).toEqual([]);
  });
});
