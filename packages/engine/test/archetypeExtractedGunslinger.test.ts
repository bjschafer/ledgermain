import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED,
  GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/gunslinger.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The gunslinger slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: gunslinger's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that
 * every archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeExtractedMagus.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "gunslinger",
  );
  if (!entry) throw new Error(`gunslinger archetype not found: ${name}`);
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

describe("GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored gunslinger archetype feature exactly once", () => {
    const gunslingerFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("gunslinger:"))
      .map((f) => f.id);
    expect(gunslingerFeatureIds.length).toBe(82);
    for (const id of gunslingerFeatureIds) {
      expect(GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(82);
  });

  it("bucket counts match the audited totals (65 subsystem, 10 situational, 3 blocked, 4 numeric)", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["subsystem"]).toBe(65);
    expect(counts["situational"]).toBe(10);
    expect(counts["blocked"]).toBe(3);
    expect(counts["numeric"]).toBe(4);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(4);
    for (const id of numericIds) {
      expect(GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("Gun Tank: Armor Training on a 4-level cadence starting 4th", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Gun Tank")).toBe("gunslinger:gun-tank");
  });

  it("clamp(1 + floor((unlevel-4)/4), 0, 4) mDexA/acpA — +1 at L4, +2 at L8, +3 at L12, +4 at L16, capped at L20", () => {
    const id = "gunslinger:gun-tank:armor-training:4";
    const [mDexA, acpA] = GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(mDexA!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(1);
    expect(at(7)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(12)).toBe(3);
    expect(at(16)).toBe(4);
    expect(at(20)).toBe(4); // capped, no further tier past 16th in the published text
    expect(evaluateFormula(acpA!.formula, { class: { unlevel: 16 } })).toBe(-4);
    expect(mDexA!.target).toBe("mDexA");
    expect(acpA!.target).toBe("acpA");
  });
});

describe("Mysterious Stranger: Lucky grants a scaling luck bonus on Will saves", () => {
  it("1 + floor((unlevel-2)/4) — +1 at L2, +2 at L6, +3 at L10, +4 at L14, +5 at L18/L20", () => {
    const id = "gunslinger:mysterious-stranger:lucky:2";
    const [willChange] = GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(willChange!.target).toBe("will");
    expect(willChange!.type).toBe("luck");
    const at = (level: number) =>
      evaluateFormula(willChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(10)).toBe(3);
    expect(at(14)).toBe(4);
    expect(at(18)).toBe(5);
    expect(at(20)).toBe(5); // "maximum of +5 at 20th level"
  });
});

describe("Siege Gunner: Engineer Training grants a half-level Knowledge (engineering) bonus", () => {
  it("floor(unlevel/2) — +1 at L2, +5 at L10, +10 at L20", () => {
    const id = "gunslinger:siege-gunner:engineer-training:2";
    const [kenChange] = GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(kenChange!.target).toBe("skill.ken");
    const at = (level: number) =>
      evaluateFormula(kenChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(10)).toBe(5);
    expect(at(20)).toBe(10);
  });
});

describe("Thronewarden: Hair-Trigger Reflexes grants a scaling initiative bonus", () => {
  it("1 + floor((unlevel-2)/4) — +1 at L2, +2 at L6, +5 at L18", () => {
    const id = "gunslinger:thronewarden:hair-trigger-reflexes:2";
    const [initChange] = GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(initChange!.target).toBe("init");
    const at = (level: number) =>
      evaluateFormula(initChange!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(18)).toBe(5);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through gunslinger's tables when explicitly given as overrides", () => {
  it("falls back to the gunslinger extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "gunslinger:mysterious-stranger:lucky:2",
      {},
      GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("will");
  });

  it("returns undefined for a gunslinger feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "gunslinger:buccaneer:grit:1",
        {},
        GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "gunslinger:musket-master:musket-training:5",
        {},
        GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: grit pool-size/cadence divergences (class note 1)", () => {
  it("Bushwhacker's Trembling Grit resizes the pool to Wis mod - 1 — not backfilled (resource-pool sizing is never a Change target)", () => {
    const entry =
      GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION["gunslinger:bushwhacker:trembling-grit:1"];
    expect(entry?.bucket).toBe("subsystem");
    expect(
      GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED["gunslinger:bushwhacker:trembling-grit:1"],
    ).toBeUndefined();
  });

  it("the real vendored Grit class feature carries zero changes[] (only a uses.maxFormula resource) — confirms there is nothing for a Change to double-count against directly, the risk is purely formula/basis divergence", () => {
    const grit = ref.classFeatures["Rh4www7gtV7wvUzg"];
    expect(grit?.name).toBe("Grit");
    expect(grit?.changes ?? []).toEqual([]);
    expect(grit?.uses?.maxFormula).toBe("max(1, @abilities.wis.mod)");
  });
});

describe("blocked bucket: Bonus Feats (GUN) replacement-suppression gap (class note 6)", () => {
  it("Siege Gunner's Bonus Feat claims to replace the base progression but isn't structurally paired to it", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "gunslinger:siege-gunner:bonus-feat:4",
    );
    // No pairedBaseFeatureUuid at all — the vendored data never links this
    // feature to the Bonus Feats (GUN) compendium item it claims to replace.
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
    expect(
      GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION["gunslinger:siege-gunner:bonus-feat:4"]?.bucket,
    ).toBe("blocked");
    expect(
      GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED["gunslinger:siege-gunner:bonus-feat:4"],
    ).toBeUndefined();
  });

  it("the real vendored Bonus Feats (GUN) class feature DOES carry a Change (floor(@class.unlevel/4) bonusFeats) — confirming the double-count risk is real, not hypothetical", () => {
    const bonusFeats = ref.classFeatures["c1DXh24tF5vQFLaI"];
    expect(bonusFeats?.name).toBe("Bonus Feats (GUN)");
    expect(bonusFeats?.changes).toEqual([
      { formula: "floor(@class.unlevel / 4)", target: "bonusFeats", type: "untyped" },
    ]);
  });
});

describe("replacement suppression: Nimble is structurally replaced by ten archetype features (class note 5)", () => {
  it("every feature this file flags as 'replaces Nimble (pure loss)' is paired to Nimble's own compendium uuid", () => {
    const nimble = ref.classFeatures["BTkYdjVLcQMfFsv9"];
    expect(nimble?.name).toBe("Nimble");
    expect(nimble?.changes).toEqual([
      { formula: "1 + floor((@class.unlevel - 2) / 4)", target: "ac", type: "dodge" },
    ]);
    const nimbleUuid = "Compendium.pf1.class-abilities.Item.BTkYdjVLcQMfFsv9";
    const pureLossIds = [
      "gunslinger:buccaneer:liquid-courage:2",
      "gunslinger:commando:favored-terrain:2",
      "gunslinger:gun-scavenger:arbitrary-aim:2",
      "gunslinger:gun-tank:bullet-defection:2",
      "gunslinger:gunner-squire:safe-handling:2",
      "gunslinger:mysterious-stranger:lucky:2",
      "gunslinger:planar-rifter:planar-resistance:2",
      "gunslinger:siege-gunner:engineer-training:2",
      "gunslinger:thronewarden:hair-trigger-reflexes:2",
    ];
    for (const id of pureLossIds) {
      const feature = Object.values(ref.archetypeFeatures).find((f) => f.id === id);
      expect(feature?.pairedBaseFeatureUuid, id).toBe(nimbleUuid);
    }
  });
});

describe("GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED: shape checks", () => {
  const entries = Object.entries(GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED);

  it("every entry keys a real vendored gunslinger archetype feature", () => {
    for (const [id] of entries) {
      const f = Object.values(ref.archetypeFeatures).find((x) => x.id === id);
      expect(f, `unknown vendored archetype feature id ${id}`).toBeDefined();
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

  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of entries) {
      const f = Object.values(ref.archetypeFeatures).find((x) => x.id === id)!;
      const description = strippedDescription(f.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${f.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});
