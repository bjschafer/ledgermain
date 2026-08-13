import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, isTargetApplied, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED,
  KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/kineticist.js";

/**
 * The kineticist slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: kineticist's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` sanity-checks
 * that every archetypeId/name this file references actually exists in the
 * real vendored data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "kineticist",
  );
  if (!entry) throw new Error(`kineticist archetype not found: ${name}`);
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

describe("KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored kineticist archetype feature exactly once", () => {
    const kineticistFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("kineticist:"))
      .map((f) => f.id);
    expect(kineticistFeatureIds.length).toBe(86);
    for (const id of kineticistFeatureIds) {
      expect(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(86);
  });

  it("bucket counts", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts.numeric).toBe(5);
    expect(counts.situational).toBe(2);
    expect(counts.subsystem).toBe(46);
    expect(counts.blocked).toBe(33);
    expect(counts.numeric! + counts.situational! + counts.subsystem! + counts.blocked!).toBe(86);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(5);
    for (const id of numericIds) {
      expect(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
    expect(Object.keys(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(5);
  });

  it("every archetypeId referenced actually exists in the vendored data slice", () => {
    const seen = new Set<string>();
    for (const entry of Object.values(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      seen.add(entry.archetypeId);
    }
    for (const id of seen) {
      expect(ref.archetypes[id], `archetype not found: ${id}`).toBeDefined();
      expect(ref.archetypes[id]!.classTag).toBe("kineticist");
    }
  });
});

describe("Arakineticist: Accursed Shadow grants a save bonus vs. death effects and necromancy spells", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Arakineticist")).toBe("kineticist:arakineticist");
  });

  it("min(6, 2 + floor((unlevel-4)/4)) — +2 at L4, +3 at L8, +6 at L20, capped", () => {
    const id = "kineticist:arakineticist:accursed-shadow:4";
    const [change] = KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["death", "necromancy"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(2);
    expect(at(8)).toBe(3);
    expect(at(12)).toBe(4);
    expect(at(16)).toBe(5);
    expect(at(20)).toBe(6);
    expect(at(24)).toBe(6); // clamped at the published max
  });
});

describe("Elemental Ascetic: AC Bonus grants monk-style Wis-to-AC/CMD", () => {
  it("+Wis mod AC/CMD unarmored/shieldless/unencumbered, 0 when any condition fails", () => {
    const id = "kineticist:elemental-ascetic:ac-bonus:2";
    const [acChange, cmdChange] = KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acChange!.target).toBe("ac");
    expect(cmdChange!.target).toBe("cmd");
    const at = (
      level: number,
      armorType: number,
      shieldType: number,
      encLevel: number,
      wis: number,
    ) =>
      evaluateFormula(acChange!.formula, {
        class: { unlevel: level },
        armor: { type: armorType },
        shield: { type: shieldType },
        attributes: { encumbrance: { level: encLevel } },
        abilities: { wis: { mod: wis } },
      });
    expect(at(2, 0, 0, 0, 3)).toBe(3); // unarmored, no shield, unencumbered
    expect(at(6, 0, 0, 0, 3)).toBe(4); // +1 tier at L6
    expect(at(10, 0, 0, 0, 3)).toBe(5); // +2 tier at L10
    expect(at(2, 1, 0, 0, 3)).toBe(0); // wearing armor fails the condition
    expect(at(2, 0, 1, 0, 3)).toBe(0); // using a shield fails the condition
    expect(at(2, 0, 0, 1, 3)).toBe(0); // encumbered fails the condition
    expect(at(2, 0, 0, 0, -2)).toBe(0); // negative Wis mod is floored to 0, not a penalty
    expect(
      evaluateFormula(cmdChange!.formula, { armor: { type: 0 }, abilities: { wis: { mod: 2 } } }),
    ).toBe(2);
  });
});

describe("Elemental Annihilator: Bonus Feat grants an unpaired, additive bonus-feat count", () => {
  it("1 at L2, +1 each at L8/L10/L14/L18, total 5 by L18", () => {
    const id = "kineticist:elemental-annihilator:bonus-feat:2";
    const [feats] = KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(10)).toBe(3);
    expect(at(14)).toBe(4);
    expect(at(18)).toBe(5);
    expect(at(20)).toBe(5);
  });

  it("has no paired base-feature slot — kineticist has no baseline bonus-feat progression to swap", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "kineticist:elemental-annihilator:bonus-feat:2",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Overwhelming Soul: Overwhelming Power grants a flat kinetic-blast attack bonus", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +2 at L6, +3 at L9, +6 at L18", () => {
    const id = "kineticist:overwhelming-soul:overwhelming-power:3";
    const [attackChange] = KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(attackChange!.target).toBe("attack.weapon.kinetic-blast");
    expect(isTargetApplied(attackChange!.target)).toBe(true);
    const at = (level: number) =>
      evaluateFormula(attackChange!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(9)).toBe(3);
    expect(at(18)).toBe(6);
  });

  it("only one Change is extracted — the damage half is dropped, not just the target renamed", () => {
    const id = "kineticist:overwhelming-soul:overwhelming-power:3";
    expect(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes).toHaveLength(1);
  });
});

describe("Blood Kineticist: Blood Mastery grants a partial immunity extraction", () => {
  it("immEffect.bleed only — the other compound immunities have no matching closed-vocabulary slug", () => {
    const id = "kineticist:blood-kineticist:blood-mastery:20";
    const entry = KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED[id]!;
    expect(entry.changes).toHaveLength(1);
    expect(entry.changes[0]!.target).toBe("immEffect.bleed");
    expect(isTargetApplied(entry.changes[0]!.target)).toBe(true);
    expect(evaluateFormula(entry.changes[0]!.formula)).toBe(1);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through kineticist's tables when explicitly given as overrides", () => {
  it("falls back to the kineticist extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "kineticist:elemental-annihilator:bonus-feat:2",
      {},
      KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("bonusFeats");
  });

  it("returns undefined for a kineticist feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "kineticist:elemental-ascetic:elemental-flurry:1",
        {},
        KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "kineticist:terrakineticist:terrakinesis:1",
        {},
        KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });

  it("the hand-verified table wins for Psychokinetcist's Mental Overflow, which already has a prose-only entry there", () => {
    const resolved = resolveArchetypeFeatureEffect("kineticist:psychokinetcist:mental-overflow:3");
    expect(resolved?.source).toBe("verified");
    expect(resolved?.effect.changes).toEqual([]);
  });
});

describe("blocked bucket: burn/blast/infusion/defense arithmetic that would conflict with hardcoded engine math", () => {
  it("Mind Burn is already hand-wired outside this pipeline (resources.ts), so it stays blocked rather than double-authored", () => {
    const entry =
      KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION["kineticist:psychokinetcist:mind-burn:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED["kineticist:psychokinetcist:mind-burn:1"],
    ).toBeUndefined();
  });

  it("the vendored Burn class feature carries zero changes[] (only a uses.maxFormula resource) — confirms nothing for a Change to double-count against directly, the risk is purely cap/formula divergence", () => {
    const burn = Object.values(ref.classFeatures).find((f) => f.name === "Burn");
    expect(burn?.changes ?? []).toEqual([]);
    expect(burn?.uses?.maxFormula).toBe("3 + @abilities.con.mod");
  });

  it("Terrakinesis (the archetype's defining mechanic) is blocked, not subsystem — it restructures elements/blasts/defense all at once", () => {
    const entry =
      KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION["kineticist:terrakineticist:terrakinesis:1"];
    expect(entry?.bucket).toBe("blocked");
  });

  it("new composite/simple blast catalog entries (no room in kineticist-elements.ts) are blocked, not subsystem", () => {
    for (const id of [
      "kineticist:blood-kineticist:blood-blast:7",
      "kineticist:elysiokineticist:ghaelelight-blast:15",
      "kineticist:ioun-kineticist:azlanti-blast:7",
      "kineticist:elemental-annihilator:omnicide:20",
      "kineticist:psammokinetic:sand-blast:1",
      "kineticist:psammokinetic:sirocco-blast:1",
    ]) {
      expect(KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket, id).toBe("blocked");
    }
  });
});

describe("PROVENANCE: every extracted entry's provenance is a verbatim substring of the vendored description", () => {
  it("checks all 5 numeric entries", () => {
    for (const [id, entry] of Object.entries(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `archetype feature not found: ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature!.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("every extracted Change lands on an applied target with a non-empty formula", () => {
  it("checks all 5 numeric entries", () => {
    for (const [id, entry] of Object.entries(KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const ch of entry.changes) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });
});
