import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import { isTargetApplied } from "../src/targets.js";
import {
  SLAYER_ARCHETYPE_EFFECTS_EXTRACTED,
  SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/slayer.js";

/**
 * The slayer slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: slayer's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `SLAYER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` sanity-checks
 * that every archetypeId/name/description this file references actually
 * exists in the real vendored data slice.
 *
 * Slayer has NO suppression-composition case: every base feature the
 * numeric-bucket entries replace (Track, Swift Tracker) carries `changes: []`
 * upstream (confirmed by this file's own header doc comment and the fixture
 * below), so there's nothing to suppress and no `applied: false` to observe.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "slayer",
  );
  if (!entry) throw new Error(`slayer archetype not found: ${name}`);
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

const SLAYER_ARCHETYPE_IDS = new Set(
  Object.values(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
);

describe("SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored slayer archetype feature exactly once (26 archetypes, 133 features)", () => {
    expect(SLAYER_ARCHETYPE_IDS.size).toBe(26);
    const slayerFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("slayer:"))
      .map((f) => f.id);
    expect(slayerFeatureIds.length).toBe(133);
    for (const id of slayerFeatureIds) {
      expect(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(133);
  });

  it("bucket counts match the audited totals (91 subsystem / 27 situational / 10 blocked / 5 numeric)", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts.subsystem).toBe(91);
    expect(counts.situational).toBe(27);
    expect(counts.blocked).toBe(10);
    expect(counts.numeric).toBe(5);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(5);
    for (const id of numericIds) {
      expect(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("SLAYER_ARCHETYPE_EFFECTS_EXTRACTED: provenance is verbatim vendored text", () => {
  it("every provenance is a verbatim substring of the vendored description after HTML-stripping", () => {
    for (const [id, entry] of Object.entries(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature!.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of Object.entries(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Pureblade: Steely Mind grants a scaling resistance bonus vs. mind-affecting effects", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Pureblade")).toBe("slayer:pureblade");
  });

  it("+2 at L8, +4 at L12, +6 at L16, scoped to the 'mind' save category", () => {
    const id = "slayer:pureblade:steely-mind:8";
    const [change] = SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.type).toBe("resistance");
    expect(change!.saveCategories).toEqual(["mind"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(8)).toBe(2);
    expect(at(11)).toBe(2);
    expect(at(12)).toBe(4);
    expect(at(15)).toBe(4);
    expect(at(16)).toBe(6);
    expect(at(20)).toBe(6);
  });
});

describe("Vanguard: Lookout grants a flat, unconditional half-level initiative bonus", () => {
  it("max(1, floor(unlevel / 2)) — 1 at L1, 1 at L3, 2 at L4, 5 at L10", () => {
    const id = "slayer:vanguard:lookout:1";
    const [change] = SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("init");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(3)).toBe(1);
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
  });

  it("has no paired base-feature slot — the vendored Track it replaces carries zero changes[]", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "slayer:vanguard:lookout:1",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeDefined();
    const track = Object.values(ref.classFeatures).find((f) => f.name === "Track");
    expect(track?.changes ?? []).toEqual([]);
  });
});

describe("Velvet Blade: Courtly Graces grants a flat, unconditional half-level Knowledge (nobility) bonus", () => {
  it("max(1, floor(unlevel / 2)) skill.kno — 1 at L1, 3 at L6", () => {
    const id = "slayer:velvet-blade:courtly-graces:0";
    const [change] = SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.kno");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(3);
  });
});

describe("Spire Diver: Swift Swimmer grants a swim speed equal to base land speed", () => {
  it("sets swimSpeed to @attributes.speed.land.total via a base/set Change", () => {
    const id = "slayer:spire-diver:swift-swimmer:11";
    const [change] = SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("swimSpeed");
    expect(change!.type).toBe("base");
    expect(change!.operator).toBe("set");
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 30 } } } }),
    ).toBe(30);
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 20 } } } }),
    ).toBe(20);
  });
});

describe("Woodland Sniper: Branchwalking grants a climb speed equal to base land speed", () => {
  it("sets climbSpeed to @attributes.speed.land.total via a base/set Change", () => {
    const id = "slayer:woodland-sniper:branchwalking:11";
    const [change] = SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("climbSpeed");
    expect(change!.type).toBe("base");
    expect(change!.operator).toBe("set");
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 40 } } } }),
    ).toBe(40);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through slayer's tables when explicitly given as overrides", () => {
  it("falls back to the slayer extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "slayer:vanguard:lookout:1",
      {},
      SLAYER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("init");
  });

  it("returns undefined for a slayer feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "slayer:family-hunter:kinslayer:3",
        {},
        SLAYER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "slayer:bloody-jake:favored-terrain:1",
        {},
        SLAYER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: sneak attack progression alterations (no Change target, class note 3)", () => {
  it("Kinslayer explicitly alters sneak attack (+1d6 vs. a chosen family line) — recorded as blocked, not backfilled", () => {
    const entry = SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION["slayer:family-hunter:kinslayer:3"];
    expect(entry?.bucket).toBe("blocked");
    expect(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED["slayer:family-hunter:kinslayer:3"]).toBeUndefined();
  });

  it("Woodland Sniper's Ranged Sneak Attack and Velvet Blade's Treacherous Blade are blocked for the same reason", () => {
    expect(
      SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION["slayer:woodland-sniper:ranged-sneak-attack:3"]
        ?.bucket,
    ).toBe("blocked");
    expect(
      SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION["slayer:velvet-blade:treacherous-blade:7"]?.bucket,
    ).toBe("blocked");
  });

  it("the real vendored Sneak Attack class feature (if present) or the sneak-attack-dice hand table carries no Change to double-count against — there is no applied Change target for sneak attack dice/range at all", () => {
    expect(isTargetApplied("sneakAttack")).toBe(false);
    expect(isTargetApplied("sneakAttackDice")).toBe(false);
  });
});

describe("blocked bucket: class-skill-list swaps have no Change target", () => {
  it("Cutthroat, Sczarni Executioner, Velvet Blade, and Witch Killer's Class Skills entries are all blocked", () => {
    for (const id of [
      "slayer:cutthroat:class-skills:0",
      "slayer:sczarni-executioner:class-skills:0",
      "slayer:velvet-blade:class-skills:0",
      "slayer:witch-killer:class-skills:0",
    ]) {
      expect(SLAYER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(SLAYER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});
