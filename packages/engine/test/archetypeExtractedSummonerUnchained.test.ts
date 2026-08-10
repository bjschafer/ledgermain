import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
  SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/summonerUnchained.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The summonerUnchained slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: this class's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures assert
 * directly against the exported tables and verify
 * `resolveArchetypeFeatureEffect` behaves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` sanity-checks
 * that every id this file references actually exists in the real vendored
 * data slice.
 *
 * Unlike the magus/barbarianUnchained waves, this class's extracted-effects
 * table is EMPTY (see that file's doc comment): none of the 17 vendored
 * features clears the `numeric` bar — every one lands on the eidolon (an
 * unhooked derived-creature subsystem), the summon monster/gate SLA, or a
 * cross-class subsystem grant, and `archetype-effects.ts` (the hand-verified
 * table) carries zero `summonerUnchained:` keys, so there is no numeric
 * coverage to defer to either. There are therefore no formula fixtures to
 * evaluate; the provenance/applied-target loops below run over the (empty)
 * table anyway so they immediately guard any future entry added to it.
 */
const ref = loadRefData();

/** Mirror of the sweep's HTML-to-text strip, for re-verifying provenance quotes. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

describe("SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored summonerUnchained archetype feature exactly once", () => {
    const featureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("summonerUnchained:"))
      .map((f) => f.id);
    expect(featureIds.length).toBe(17);
    for (const id of featureIds) {
      expect(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(17);
  });

  it("spans all 5 vendored summonerUnchained archetypes", () => {
    const vendored = Object.values(ref.archetypes)
      .filter((a) => a.classTag === "summonerUnchained")
      .map((a) => a.id)
      .sort();
    expect(vendored.length).toBe(5);
    const classified = [
      ...new Set(
        Object.values(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION).map(
          (e) => e.archetypeId,
        ),
      ),
    ].sort();
    expect(classified).toEqual(vendored);
  });

  it("bucket counts match the audited totals (0 numeric / 1 situational / 16 subsystem / 0 blocked)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(0);
    expect(counts["situational"]).toBe(1);
    expect(counts["subsystem"]).toBe(16);
    expect(counts["blocked"]).toBe(0);
  });

  it("every classification entry's archetypeId/name/level matches the real vendored feature", () => {
    for (const [id, entry] of Object.entries(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });

  it("the one situational entry is Soulbound Life Link (the Life Link variant, per the companion-interaction posture)", () => {
    const situational = Object.entries(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "situational")
      .map(([id]) => id);
    expect(situational).toEqual(["summonerUnchained:soulbound-summoner:soulbound-life-link:1"]);
  });
});

describe("SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: empty, and 1:1 with the numeric bucket", () => {
  it("the extracted table is empty — no summonerUnchained feature clears the numeric bar", () => {
    expect(Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)).toEqual([]);
  });

  it("numeric-bucket ids and extracted-table ids correspond 1:1 (both empty), with no stray entries", () => {
    const numericIds = Object.entries(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds).toEqual([]);
    for (const id of numericIds) {
      expect(SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("hand-verified coverage is not being silently relied on: archetype-effects.ts has no summonerUnchained keys", () => {
    // If the hand-verified table ever grows a summonerUnchained entry, its
    // classification here should be revisited (the "already hand-verified"
    // escape hatch other classes use does not currently apply to this one).
    for (const id of Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(resolveArchetypeFeatureEffect(id, undefined, {})).toBeUndefined();
    }
  });

  it("every extracted entry's provenance survives HTML-strip + whitespace-squash as an exact substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      const description = squash(stripHtml(feature!.description ?? ""));
      const quote = squash(entry.provenance);
      expect(
        description.includes(quote),
        `${id} (${feature!.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every extracted change lands on an applied target with a non-empty formula", () => {
    for (const [id, entry] of Object.entries(SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const change of entry.changes) {
        expect(isTargetApplied(change.target), `${id}: unapplied target ${change.target}`).toBe(
          true,
        );
        expect(change.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("resolveArchetypeFeatureEffect: override-argument resolution against this file's tables", () => {
  it("returns undefined for every summonerUnchained feature when given this file's (empty) extracted table", () => {
    for (const id of Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(
        resolveArchetypeFeatureEffect(id, {}, SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED),
      ).toBeUndefined();
    }
  });

  it("still prefers a verified-table entry when one is supplied alongside the empty extracted table", () => {
    // Synthetic verified entry: proves the precedence path works for a
    // summonerUnchained id even though the real hand-verified table has none.
    const id = "summonerUnchained:soulbound-summoner:soulbound-life-link:1";
    const resolved = resolveArchetypeFeatureEffect(
      id,
      { [id]: { changes: [] } },
      SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("verified");
  });
});

describe("vendored-data pairings this file's notes rely on", () => {
  it("the five paired devil-binder/devil-impostor features point at the unchained base features the notes claim", () => {
    const paired: Record<string, string> = {
      "summonerUnchained:devil-binder:smite-chaos:6": "Maker's Call (UC)",
      "summonerUnchained:devil-impostor:bond-alignment:2": "Bond Senses (UC)",
      "summonerUnchained:devil-impostor:devil-s-flesh:4": "Shield Ally (UC)",
      "summonerUnchained:devil-impostor:devil-s-tongue:12": "Greater Shield Ally (UC)",
      "summonerUnchained:devil-impostor:fiendish-appearance:8": "Transposition (UC)",
    };
    for (const [id, baseName] of Object.entries(paired)) {
      const feature = ref.archetypeFeatures[id];
      const uuid = feature?.pairedBaseFeatureUuid;
      expect(uuid, `${id}: expected a pairedBaseFeatureUuid`).toBeDefined();
      const key = uuid!.split(".").pop()!;
      expect(ref.classFeatures[key]?.name).toBe(baseName);
    }
  });

  it("the twelve unpaired features carry no pairedBaseFeatureUuid", () => {
    const pairedIds = new Set([
      "summonerUnchained:devil-binder:smite-chaos:6",
      "summonerUnchained:devil-impostor:bond-alignment:2",
      "summonerUnchained:devil-impostor:devil-s-flesh:4",
      "summonerUnchained:devil-impostor:devil-s-tongue:12",
      "summonerUnchained:devil-impostor:fiendish-appearance:8",
    ]);
    for (const id of Object.keys(SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      if (pairedIds.has(id)) continue;
      expect(ref.archetypeFeatures[id]?.pairedBaseFeatureUuid).toBeUndefined();
    }
  });
});
