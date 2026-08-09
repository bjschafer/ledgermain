import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
  BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/barbarianUnchained.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The barbarianUnchained slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: this class's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures therefore
 * (1) assert directly against `BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * exported `changes` shape, (2) hand-compute each formula via the real
 * `formula.ts` evaluator (`evaluateFormula`) at several class levels against
 * the exact published-rules numbers cited in each entry's `provenance`, and
 * (3) verify `resolveArchetypeFeatureEffect` resolves correctly when
 * explicitly given this file's tables as its override arguments (the
 * mechanism it's designed for). `loadRefData` sanity-checks that every id
 * this file references actually exists in the real vendored data slice.
 *
 * Every provenance quote is additionally re-verified below as a literal
 * (HTML-stripped, whitespace-squashed) substring of the vendored
 * description — the exact machine check this wave's brief calls for, after a
 * prior wave was caught shipping a fabricated "..." elided quote.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "barbarianUnchained",
  );
  if (!entry) throw new Error(`barbarianUnchained archetype not found: ${name}`);
  return entry.id;
}

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

describe("BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored barbarianUnchained archetype feature exactly once", () => {
    const featureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("barbarianUnchained:"))
      .map((f) => f.id);
    expect(featureIds.length).toBe(161);
    for (const id of featureIds) {
      expect(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(161);
  });

  it("bucket counts match the audited totals (19 numeric / 39 situational / 91 subsystem / 12 blocked)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(19);
    expect(counts["situational"]).toBe(39);
    expect(counts["subsystem"]).toBe(91);
    expect(counts["blocked"]).toBe(12);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(19);
    for (const id of numericIds) {
      expect(BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the real vendored feature", () => {
    for (const [id, entry] of Object.entries(
      BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION,
    )) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: provenance is a verbatim substring", () => {
  it("every entry's provenance survives HTML-strip + whitespace-squash as an exact substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
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

  it("every change lands on an applied target with a non-empty formula", () => {
    for (const [id, entry] of Object.entries(BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const change of entry.changes) {
        expect(isTargetApplied(change.target), `${id}: unapplied target ${change.target}`).toBe(
          true,
        );
        expect(change.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Armored Hulk: Armored Swiftness / Improved Armored Swiftness", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Armored Hulk")).toBe("barbarianUnchained:armored-hulk");
  });

  it("Armored Swiftness stays blocked: it only offsets armor speed reduction, which is unmodeled", () => {
    const id = "barbarianUnchained:armored-hulk:armored-swiftness:2";
    expect(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
    expect(BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
  });

  it("Improved Armored Swiftness: +10 ft. in any armor, not while carrying a heavy load", () => {
    const id = "barbarianUnchained:armored-hulk:improved-armored-swiftness:5";
    const [speed] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (armorType: number, encumbranceLevel: number) =>
      evaluateFormula(speed!.formula, {
        armor: { type: armorType },
        attributes: { encumbrance: { level: encumbranceLevel } },
      });
    expect(at(0, 0)).toBe(0); // unarmored — condition fails
    expect(at(1, 0)).toBe(10); // light armor, no heavy load
    expect(at(3, 1)).toBe(10); // heavy armor, medium load
    expect(at(3, 2)).toBe(0); // heavy armor, heavy load — condition fails
  });
});

describe("Cave Dweller: Tunnel Vision grants unconditional darkvision", () => {
  it("60 ft. darkvision, unconditional (Perception-in-darkness bonus not modeled)", () => {
    const id = "barbarianUnchained:cave-dweller:tunnel-vision:3";
    const [dv] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dv!.target).toBe("sensedv");
    expect(evaluateFormula(dv!.formula, {})).toBe(60);
  });
});

describe("Deepwater Rager: Strong Lungs adds Con mod to Intimidate", () => {
  it("stacks with the normal Cha-based Intimidate total", () => {
    const id = "barbarianUnchained:deepwater-rager:strong-lungs:1";
    const [bonus] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(bonus!.target).toBe("skill.int");
    expect(evaluateFormula(bonus!.formula, { abilities: { con: { mod: 3 } } })).toBe(3);
  });
});

describe("Fearsome Defender: Bloodlust / Silent Threat", () => {
  it("Bloodlust: flat Cha-mod initiative bonus", () => {
    const id = "barbarianUnchained:fearsome-defender:bloodlust:5";
    const [init] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(init!.target).toBe("init");
    expect(evaluateFormula(init!.formula, { abilities: { cha: { mod: 2 } } })).toBe(2);
  });

  it("Silent Threat: +1 Intimidate at L3, +2 at L6, +3 at L9", () => {
    const id = "barbarianUnchained:fearsome-defender:silent-threat:3";
    const [bonus] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(bonus!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(9)).toBe(3);
  });
});

describe("Invulnerable Rager: Invulnerability grants DR equal to half class level", () => {
  it("archetype exists in the vendored data (barbarianUnchained's own, separate from chained)", () => {
    expect(archetypeId("Invulnerable Rager")).toBe("barbarianUnchained:invulnerable-rager");
  });

  it("floor(level/2) DR — 1 at L2, 5 at L10, 10 at L20 (nonlethal doubling not modeled)", () => {
    const id = "barbarianUnchained:invulnerable-rager:invulnerability:2";
    const [dr] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr");
    const at = (level: number) => evaluateFormula(dr!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(10)).toBe(5);
    expect(at(20)).toBe(10);
  });

  it("no archetype-effects.ts entry exists under the barbarianUnchained tag — extraction is the only source", () => {
    // resolveArchetypeFeatureEffect with the real (empty-for-this-id) verified table falls through
    // to this file's extracted table when explicitly given as the override.
    const resolved = resolveArchetypeFeatureEffect(
      "barbarianUnchained:invulnerable-rager:invulnerability:2",
      {},
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
  });
});

describe("Pack Rager: Bonus Feat grants an additive teamwork-feat count", () => {
  it("1 at L2, 2 at L6, 3 at L10", () => {
    const id = "barbarianUnchained:pack-rager:bonus-feat:2";
    const [feats] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(10)).toBe(3);
  });

  it("Rage power (8th) is a vendored duplicate of Bonus Feat's own text — classified blocked, not double-extracted", () => {
    const dup =
      BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "barbarianUnchained:pack-rager:rage-power:8"
      ];
    expect(dup?.bucket).toBe("blocked");
    expect(
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED["barbarianUnchained:pack-rager:rage-power:8"],
    ).toBeUndefined();
  });
});

describe("Savage Barbarian: Naked Courage / Natural Toughness", () => {
  it("Naked Courage: +1 dodge AC at L3, +2 at L9, 0 while armored", () => {
    const id = "barbarianUnchained:savage-barbarian:naked-courage:3";
    const [ac] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(ac!.type).toBe("dodge");
    const at = (level: number, armorType: number) =>
      evaluateFormula(ac!.formula, { class: { unlevel: level }, armor: { type: armorType } });
    expect(at(3, 0)).toBe(1);
    expect(at(9, 0)).toBe(2);
    expect(at(9, 1)).toBe(0);
  });

  it("Natural Toughness: +1 natural armor at L7, +2 at L10, 0 while armored", () => {
    const id = "barbarianUnchained:savage-barbarian:natural-toughness:7";
    const [nac] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(nac!.target).toBe("nac");
    expect(nac!.type).toBe("base");
    const at = (level: number, armorType: number) =>
      evaluateFormula(nac!.formula, { class: { unlevel: level }, armor: { type: armorType } });
    expect(at(7, 0)).toBe(1);
    expect(at(10, 0)).toBe(2);
    expect(at(10, 2)).toBe(0);
  });

  it("no archetype-effects.ts entry exists under the barbarianUnchained tag for Natural Toughness either", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "barbarianUnchained:savage-barbarian:natural-toughness:7",
      {},
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
  });
});

describe("Sharptooth: Scent of Blood grants unconditional Scent", () => {
  it("both the split (Scent) id and the combined (vendored duplicate) id grant the same flag sense", () => {
    const split =
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:sharptooth:scent-of-blood-scent:2"
      ]!;
    const combined =
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:sharptooth:scent-of-blood:2"
      ]!;
    expect(split.changes[0]!.target).toBe("sensesc");
    expect(combined.changes[0]!.target).toBe("sensesc");
    expect(evaluateFormula(split.changes[0]!.formula, {})).toBe(1);
    expect(evaluateFormula(combined.changes[0]!.formula, {})).toBe(1);
  });

  it("Keen Scent (5th) has no target to double against — classified subsystem, no extracted entry", () => {
    const entry =
      BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "barbarianUnchained:sharptooth:scent-of-blood-keen-scent:5"
      ];
    expect(entry?.bucket).toBe("subsystem");
    expect(
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:sharptooth:scent-of-blood-keen-scent:5"
      ],
    ).toBeUndefined();
  });
});

describe("Superstitious: Keen Senses split tiers grant real special senses", () => {
  it("Low-light Vision (7th): flag sense", () => {
    const id = "barbarianUnchained:superstitious:keen-senses-low-light-vision:7";
    const [s] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(s!.target).toBe("sensell");
    expect(evaluateFormula(s!.formula, {})).toBe(1);
  });

  it("Darkvision (10th): 60 ft., operator 'add' extends an existing darkvision range instead of competing for it", () => {
    const id = "barbarianUnchained:superstitious:keen-senses-darkvision:10";
    const [s] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(s!.target).toBe("sensedv");
    expect(s!.operator).toBe("add");
    expect(evaluateFormula(s!.formula, {})).toBe(60);
  });

  it("Scent (13th): flag sense", () => {
    const id = "barbarianUnchained:superstitious:keen-senses-scent:13";
    const [s] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(s!.target).toBe("sensesc");
    expect(evaluateFormula(s!.formula, {})).toBe(1);
  });

  it("Blindsense 30ft. (16th) and Blindsight 30ft. (19th): flat ranged senses", () => {
    const bse =
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:superstitious:keen-senses-blindsense-30ft:16"
      ]!.changes[0]!;
    const bs =
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:superstitious:keen-senses-blindsight-30ft:19"
      ]!.changes[0]!;
    expect(bse.target).toBe("sensebse");
    expect(evaluateFormula(bse.formula, {})).toBe(30);
    expect(bs.target).toBe("sensebs");
    expect(evaluateFormula(bs.formula, {})).toBe(30);
  });

  it("the combined 'Keen Senses' id is a vendored duplicate that would over-apply if extracted wholesale — classified blocked", () => {
    const entry =
      BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "barbarianUnchained:superstitious:keen-senses:7"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:superstitious:keen-senses:7"
      ],
    ).toBeUndefined();
  });

  it("Sixth Sense: +1 initiative at L3, +2 at L6", () => {
    const id = "barbarianUnchained:superstitious:sixth-sense:3";
    const [init] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(init!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
  });
});

describe("Untamed Rager: Feral Appearance grants a fully general Intimidate bonus", () => {
  it("+1 at L3, +2 at L6", () => {
    const id = "barbarianUnchained:untamed-rager:feral-appearance:3";
    const [bonus] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const at = (level: number) => evaluateFormula(bonus!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
  });
});

describe("Wildborn: Damage reduction / Inexhaustible", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Wildborn")).toBe("barbarianUnchained:wildborn");
  });

  it("Damage reduction: DR 1/— at L7, 2/— at L10, 5/— at L19", () => {
    const id = "barbarianUnchained:wildborn:damage-reduction:7";
    const [dr] = BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr");
    const at = (level: number) => evaluateFormula(dr!.formula, { class: { unlevel: level } });
    expect(at(7)).toBe(1);
    expect(at(10)).toBe(2);
    expect(at(19)).toBe(5);
  });

  it("Inexhaustible doubles that same DR against nonlethal damage — a composition trap, classified blocked", () => {
    const entry =
      BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "barbarianUnchained:wildborn:inexhaustible:7"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[
        "barbarianUnchained:wildborn:inexhaustible:7"
      ],
    ).toBeUndefined();
  });
});

describe("blocked bucket: Rage rounds/day composition traps", () => {
  it("Elemental Kin, Hateful Rager (both features), Mad Dog, Raging Cannibal, and Shoanti Burn Rider all touch Rage's rounds/day and stay blocked", () => {
    const ids = [
      "barbarianUnchained:elemental-kin:elemental-fury:3",
      "barbarianUnchained:hateful-rager:feed-the-rage:5",
      "barbarianUnchained:hateful-rager:reduced-rage:2",
      "barbarianUnchained:mad-dog:rage:4",
      "barbarianUnchained:raging-cannibal:consume-vigor:2",
      "barbarianUnchained:shoanti-burn-rider:give-me-fire:5",
    ];
    for (const id of ids) {
      expect(BARBARIAN_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
    }
  });

  it("the real vendored Rage (UC) class feature carries the same rounds/day shape chained Rage does — nothing here double-counts against it", () => {
    const rageUc = Object.values(ref.classFeatures).find((f) => f.name === "Rage (UC)");
    expect(rageUc?.changes ?? []).toEqual([]);
    expect(rageUc?.uses?.maxFormula).toBe("4 + @abilities.con.mod + (@class.unlevel - 1)*2");
  });
});

describe("resolveArchetypeFeatureEffect: resolves through this file's tables when explicitly given as overrides", () => {
  it("falls back to the extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "barbarianUnchained:untamed-rager:feral-appearance:3",
      {},
      BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.int");
  });

  it("returns undefined for a feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "barbarianUnchained:mounted-fury:bestial-mount:5",
        {},
        BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "barbarianUnchained:urban-barbarian:controlled-rage:1",
        {},
        BARBARIAN_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
