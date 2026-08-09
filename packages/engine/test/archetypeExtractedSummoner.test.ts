import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED,
  SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/summoner.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The summoner slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: summoner's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that every
 * archetypeId/name this file references actually exists in the real vendored
 * data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "summoner",
  );
  if (!entry) throw new Error(`summoner archetype not found: ${name}`);
  return entry.id;
}

/** The same normalization the sweep's batch files used: tags out, whitespace squashed. */
function strippedDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;|&ndash;/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalizes curly quotes too, for comparing two archetypes' near-verbatim copy-pasted prose. */
function normalizeQuotes(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

describe("SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored summoner archetype feature exactly once", () => {
    const summonerFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("summoner:"))
      .map((f) => f.id);
    expect(summonerFeatureIds.length).toBe(88);
    for (const id of summonerFeatureIds) {
      expect(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(88);
  });

  it("bucket counts match this wave's audit", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(1);
    expect(counts["situational"]).toBe(12);
    expect(counts["blocked"]).toBe(3);
    expect(counts["subsystem"]).toBe(72);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(1);
    for (const id of numericIds) {
      expect(SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the vendored feature", () => {
    for (const [id, entry] of Object.entries(SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `${id}: not found in vendored data`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED: provenance and applied-target hygiene", () => {
  const entries = Object.entries(SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED);

  it("has exactly 1 entry", () => {
    expect(entries.length).toBe(1);
  });

  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of entries) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of entries) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Twinned Summoner: Teamwork Feat grants a cumulative bonus-feat count", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Twinned Summoner")).toBe("summoner:twinned-summoner");
  });

  it("0 below L4, 1 at L4-L11, 2 at L12+", () => {
    const id = "summoner:twinned-summoner:teamwork-feat:4";
    const [feats] = SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(3)).toBe(0);
    expect(at(4)).toBe(1);
    expect(at(11)).toBe(1);
    expect(at(12)).toBe(2);
    expect(at(20)).toBe(2);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through summoner's tables when explicitly given as overrides", () => {
  it("falls back to the summoner extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "summoner:twinned-summoner:teamwork-feat:4",
      {},
      SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("medium");
    expect(resolved?.effect.changes[0]?.target).toBe("bonusFeats");
  });

  it("returns undefined for a summoner feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "summoner:broodmaster:eidolon-brood:2",
        {},
        SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "summoner:blood-summoner:blood-offering:4",
        {},
        SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "summoner:naturalist:natural-focus:1",
        {},
        SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: duplicate id and unquantifiable-number cases", () => {
  it("teamwork-feats:12 is a byte-identical duplicate of teamwork-feat:4 — recorded as blocked, not double-extracted", () => {
    const earlier = ref.archetypeFeatures["summoner:twinned-summoner:teamwork-feat:4"]!;
    const later = ref.archetypeFeatures["summoner:twinned-summoner:teamwork-feats:12"]!;
    expect(strippedDescription(later.description ?? "")).toBe(
      strippedDescription(earlier.description ?? ""),
    );
    const entry =
      SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION["summoner:twinned-summoner:teamwork-feats:12"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED["summoner:twinned-summoner:teamwork-feats:12"],
    ).toBeUndefined();
  });

  it("Naturalist's Natural Focus grants a dice-term bonus off an undefined resource — blocked, not guessed", () => {
    const entry = SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION["summoner:naturalist:natural-focus:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED["summoner:naturalist:natural-focus:1"],
    ).toBeUndefined();
  });

  it("Storm Caller's Storm's Wings grants the summoner flight at 10th level but never states a speed — blocked, not guessed", () => {
    const entry =
      SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION["summoner:storm-caller:storm-s-wings:6"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      SUMMONER_ARCHETYPE_EFFECTS_EXTRACTED["summoner:storm-caller:storm-s-wings:6"],
    ).toBeUndefined();
  });
});

describe("eidolon-only and companion-interaction features stay unmodeled (class notes 1 and 2)", () => {
  it("features that only modify the eidolon's stats/form/evolutions are classified subsystem, never numeric", () => {
    for (const id of [
      "summoner:broodmaster:eidolon-brood:2",
      "summoner:first-worlder:eidolon:1",
      "summoner:leshy-caller:leshy-eidolon:1",
      "summoner:master-summoner:lesser-eidolon:1",
      "summoner:morphic-savant:eidolon-of-chaos:1",
      "summoner:evolutionist:evolve-base-form:8",
      "summoner:evolutionist:mutate-eidolon:6",
    ]) {
      const entry = SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION[id];
      expect(entry, id).toBeDefined();
      expect(entry?.bucket).toBe("subsystem");
    }
  });

  it("Life Link / Shield Ally / Bond Senses reflavors are classified situational, never numeric", () => {
    for (const id of [
      "summoner:broodmaster:shield-ally:4",
      "summoner:broodmaster:brood-link:2",
      "summoner:broodmaster:bond-senses:2",
      "summoner:synthesist:shielded-meld:4",
      "summoner:synthesist:fused-link:1",
    ]) {
      const entry = SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION[id];
      expect(entry, id).toBeDefined();
      expect(entry?.bucket).toBe("situational");
    }
  });

  it("summon monster / summon nature's ally SLA changes are classified subsystem, never numeric", () => {
    for (const id of [
      "summoner:first-worlder:summon-nature-s-ally:1",
      "summoner:leshy-caller:summon-nature-s-ally:1",
      "summoner:shadow-caller:shadow-summoning:1",
      "summoner:naturalist:nature-s-call:1",
    ]) {
      const entry = SUMMONER_ARCHETYPE_FEATURE_CLASSIFICATION[id];
      expect(entry, id).toBeDefined();
      expect(entry?.bucket).toBe("subsystem");
    }
  });
});

describe("vendored-data oddities: copy-pasted archetype text (no numeric impact)", () => {
  it("Pyroclast's features are near-verbatim reprints of Morphic Savant's (never renamed)", () => {
    const pyroclast = normalizeQuotes(
      strippedDescription(
        ref.archetypeFeatures["summoner:pyroclast:eidolon-of-chaos:1"]!.description ?? "",
      ),
    );
    const morphicSavant = normalizeQuotes(
      strippedDescription(
        ref.archetypeFeatures["summoner:morphic-savant:eidolon-of-chaos:1"]!.description ?? "",
      ),
    );
    // morphic-savant's text carries a "Eidolon of Chaos: " lead-in pyroclast's lacks; the body is identical.
    expect(morphicSavant).toContain(pyroclast);
    expect(pyroclast).toContain("morphic savant");
  });

  it("Spirit Summoner's features are near-verbatim reprints of Shadow Caller's (never renamed)", () => {
    const spiritSummoner = normalizeQuotes(
      strippedDescription(
        ref.archetypeFeatures["summoner:spirit-summoner:shadow-eidolon:1"]!.description ?? "",
      ),
    );
    const shadowCaller = normalizeQuotes(
      strippedDescription(
        ref.archetypeFeatures["summoner:shadow-caller:shadow-eidolon:1"]!.description ?? "",
      ),
    );
    // shadow-caller's text carries a "Shadow Eidolon: " lead-in and trailing sentence spirit-summoner's lacks.
    expect(shadowCaller).toContain(spiritSummoner);
    expect(spiritSummoner).toContain("shadow caller");
  });

  it("Unwavering Conduit's Eidolon of Law/Unwavering Monsters carry a stale ':0' id suffix but a real level of 3", () => {
    expect(ref.archetypeFeatures["summoner:unwavering-conduit:eidolon-of-law:0"]!.level).toBe(3);
    expect(ref.archetypeFeatures["summoner:unwavering-conduit:unwavering-monsters:0"]!.level).toBe(
      3,
    );
  });
});
