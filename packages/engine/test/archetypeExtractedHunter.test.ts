import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  HUNTER_ARCHETYPE_EFFECTS_EXTRACTED,
  HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/hunter.js";

/**
 * The hunter slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: hunter's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `HUNTER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact published-
 * rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` is used to
 * sanity-check that every archetypeId/name this file references actually
 * exists in the real vendored data slice, same posture as
 * `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

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

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "hunter",
  );
  if (!entry) throw new Error(`hunter archetype not found: ${name}`);
  return entry.id;
}

describe("HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored hunter archetype feature exactly once", () => {
    const hunterFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("hunter:"))
      .map((f) => f.id);
    expect(hunterFeatureIds.length).toBe(102);
    for (const id of hunterFeatureIds) {
      expect(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(102);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(5);
    for (const id of numericIds) {
      expect(HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(HUNTER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 5 numeric, 2 blocked, and the remainder split between situational/subsystem", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(5);
    expect(counts.blocked).toBe(2);
    expect(counts.situational + counts.subsystem).toBe(102 - 5 - 2);
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(HUNTER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Forester: Bonus Feat grants an unpaired, additive bonus-feat schedule", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Forester")).toBe("hunter:forester");
  });

  it("0 below 2nd, 1 at L2/L6, 2 at L7/L12, 3 at L13/L18, 4 at L19/L20", () => {
    const id = "hunter:forester:bonus-feat:2";
    const [feats] = HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(12)).toBe(2);
    expect(at(13)).toBe(3);
    expect(at(18)).toBe(3);
    expect(at(19)).toBe(4);
    expect(at(20)).toBe(4);
  });

  it("has no paired base-feature slot — hunter has no baseline bonus-combat-feat progression to swap", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "hunter:forester:bonus-feat:2",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Patient Ambusher: Trapfinding grants a flat, unconditional half-level Disable Device bonus", () => {
  it("max(1, floor(unlevel/2)) skill.dev — minimum +1 at L1, +3 at L6", () => {
    const id = "hunter:patient-ambusher:trapfinding:1";
    const [change] = HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.dev");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(3);
    expect(at(20)).toBe(10);
  });
});

describe("Roof Runner: Master Climber grants a climb speed equal to base land speed", () => {
  it("sets climbSpeed to @attributes.speed.land.total via a base/set Change", () => {
    const id = "hunter:roof-runner:master-climber:20";
    const [change] = HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("climbSpeed");
    expect(change!.type).toBe("base");
    expect(change!.operator).toBe("set");
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 30 } } } }),
    ).toBe(30);
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 40 } } } }),
    ).toBe(40);
  });

  it("replaces Master Hunter, which carries zero vendored changes — no double-count risk", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "hunter:roof-runner:master-climber:20",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeDefined();
    const masterHunter = Object.values(ref.classFeatures).find(
      (f) => f.name === "Master Hunter (HUN)",
    );
    expect(masterHunter?.changes ?? []).toEqual([]);
  });
});

describe("Flood Flourisher: Watery Stride grants a swim speed equal to base land speed, capped at 30", () => {
  it("min(30, land speed) via a base/set Change", () => {
    const id = "hunter:flood-flourisher:watery-stride:5";
    const [change] = HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("swimSpeed");
    expect(change!.type).toBe("base");
    expect(change!.operator).toBe("set");
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 20 } } } }),
    ).toBe(20);
    expect(
      evaluateFormula(change!.formula, { attributes: { speed: { land: { total: 40 } } } }),
    ).toBe(30);
  });
});

describe("blocked composition trap: Fast Swimmer collides with Watery Stride's set-based swim speed (compute.ts's applySpeedTarget)", () => {
  it("Fast Swimmer has no entry in either effects table", () => {
    expect(
      HUNTER_ARCHETYPE_EFFECTS_EXTRACTED["hunter:flood-flourisher:fast-swimmer:18"],
    ).toBeUndefined();
    expect(
      HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION["hunter:flood-flourisher:fast-swimmer:18"]?.bucket,
    ).toBe("blocked");
  });

  it("demonstrates the underlying engine rule directly: a plain additive mod on a target is dropped once ANY 'set' mod exists for that same target", () => {
    // Mirrors compute.ts's applySpeedTarget: setMods.length > 0 short-circuits
    // to Math.min(...setMods), never adding the plain mod on top. This is the
    // exact reason Fast Swimmer's flat "+20 ft." can't safely coexist with
    // Watery Stride's own "base"/"set" swimSpeed Change in this file.
    function applySpeedTarget(
      mods: { value: number; operator?: "add" | "set" }[],
    ): number | undefined {
      if (mods.length === 0) return undefined;
      const setMods = mods.filter((m) => m.operator === "set");
      if (setMods.length > 0) return Math.min(...setMods.map((m) => m.value));
      return mods.reduce((s, m) => s + m.value, 0);
    }
    const wateryStride = { value: 30, operator: "set" as const };
    const fastSwimmerIfAdded = { value: 20, operator: undefined };
    expect(applySpeedTarget([wateryStride, fastSwimmerIfAdded])).toBe(30); // the +20 vanishes
  });
});

describe("Treestrider: Brachiation grants a climb speed equal to base land speed from 15th level on", () => {
  it("0 below 15th (duration-limited, not modeled), = land speed at 15th and beyond", () => {
    const id = "hunter:treestrider:brachiation:1";
    const [change] = HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("climbSpeed");
    expect(change!.operator).toBeUndefined();
    expect(
      evaluateFormula(change!.formula, {
        class: { unlevel: 8 },
        attributes: { speed: { land: { total: 30 } } },
      }),
    ).toBe(0);
    expect(
      evaluateFormula(change!.formula, {
        class: { unlevel: 15 },
        attributes: { speed: { land: { total: 30 } } },
      }),
    ).toBe(30);
    expect(
      evaluateFormula(change!.formula, {
        class: { unlevel: 20 },
        attributes: { speed: { land: { total: 40 } } },
      }),
    ).toBe(40);
  });
});

describe("blocked composition trap: Urban Hunter's Captor vs. the base Teamwork Feat schedule (issue #45, hunter)", () => {
  // Captor (3rd level) claims to replace "hunter tactics and teamwork feat"
  // but carries no pairedBaseFeatureUuid — the base Teamwork Feat class
  // feature's own bonusFeats formula (floor(@class.unlevel / 3)) is never
  // suppressed, so a backfilled bonus-feat count for Captor's own 6th-level-
  // and-up schedule would double up rather than replace. Classified
  // `blocked` rather than guessed at, same shape as ranger.ts's Beast
  // Master/Falconer partial-tier Combat Style Feat traps.
  it("Captor has no entry in either effects table", () => {
    expect(HUNTER_ARCHETYPE_EFFECTS_EXTRACTED["hunter:urban-hunter:captor:3"]).toBeUndefined();
    expect(HUNTER_ARCHETYPE_FEATURE_CLASSIFICATION["hunter:urban-hunter:captor:3"]?.bucket).toBe(
      "blocked",
    );
  });

  it("Captor is unpaired while the base Teamwork Feat it claims to replace carries a real vendored bonusFeats formula", () => {
    const captor = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "hunter:urban-hunter:captor:3",
    );
    expect(captor?.pairedBaseFeatureUuid).toBeUndefined();
    const teamworkFeat = Object.values(ref.classFeatures).find(
      (f) => f.name === "Teamwork Feat (HUN)",
    );
    expect(teamworkFeat?.changes).toEqual([
      { formula: "floor(@class.unlevel / 3)", target: "bonusFeats", type: "untyped" },
    ]);
  });
});

describe("vendored-data class-tag mismatch: Divine Hunter describes Paladin features, not hunter ones (issue #45, hunter)", () => {
  it("Divine Hunter exists in the vendored data under the hunter class tag", () => {
    expect(archetypeId("Divine Hunter")).toBe("hunter:divine-hunter");
  });

  it("none of Divine Hunter's 9 features have an extracted entry", () => {
    const divineHunterIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId === "hunter:divine-hunter")
      .map((f) => f.id);
    expect(divineHunterIds.length).toBe(9);
    for (const id of divineHunterIds) {
      expect(HUNTER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });

  it("Precise Shot's own text confirms the mismatch: it claims to replace Heavy Armor Proficiency, which the hunter class doesn't grant", () => {
    const feature = ref.archetypeFeatures["hunter:divine-hunter:precise-shot:1"]!;
    expect(strippedDescription(feature.description ?? "")).toContain("Heavy Armor Proficiency");
    const hunterClass = Object.values(ref.classes).find((cls) => cls.tag === "hunter");
    expect(hunterClass?.armorProf).not.toContain("hvy");
  });
});

describe("resolveArchetypeFeatureEffect: resolves through hunter's tables when explicitly given as overrides", () => {
  it("falls back to the hunter extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "hunter:roof-runner:master-climber:20",
      {},
      HUNTER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("climbSpeed");
  });

  it("returns undefined for a hunter feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "hunter:feral-hunter:solitary:1",
        {},
        HUNTER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "hunter:urban-hunter:captor:3",
        {},
        HUNTER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
