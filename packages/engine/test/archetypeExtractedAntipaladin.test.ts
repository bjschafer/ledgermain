import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
  ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/antipaladin.js";

/**
 * The antipaladin slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: antipaladin's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
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
    (a) => a.name === name && a.classTag === "antipaladin",
  );
  if (!entry) throw new Error(`antipaladin archetype not found: ${name}`);
  return entry.id;
}

describe("ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored antipaladin archetype feature exactly once", () => {
    const antipaladinFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("antipaladin:"))
      .map((f) => f.id);
    expect(antipaladinFeatureIds.length).toBe(45);
    for (const id of antipaladinFeatureIds) {
      expect(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(45);
  });

  it("spans all 9 antipaladin archetypes that carry any features", () => {
    const covered = new Set(
      Object.values(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(covered.size).toBe(9);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(9);
    for (const id of numericIds) {
      expect(ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 9 numeric, 14 situational, 21 subsystem, 1 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 9, situational: 14, subsystem: 21, blocked: 1 });
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Insinuator: Bonus Feat, 1 at 4th then +1 at 7th and every 3 levels thereafter", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Insinuator")).toBe("antipaladin:insinuator");
  });

  it("matches the published progression: 1/1/2/3/4/6", () => {
    const id = "antipaladin:insinuator:bonus-feat:4";
    const [change] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(1); // 4th level grant only
    expect(at(6)).toBe(1); // still 1 right before 7th
    expect(at(7)).toBe(2); // 1st "additional" feat at 7th
    expect(at(10)).toBe(3); // 2nd additional at 10th
    expect(at(13)).toBe(4); // 3rd additional at 13th
    expect(at(19)).toBe(6); // 5th additional at 19th
  });

  it("is unpaired — replaces antipaladin spells, which have no bonus-feat progression to suppress", () => {
    const feature = ref.archetypeFeatures["antipaladin:insinuator:bonus-feat:4"]!;
    expect(feature.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Iron Tyrant: Bonus Feats, 1 at 3rd and every 3 levels thereafter", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Iron Tyrant")).toBe("antipaladin:iron-tyrant");
  });

  it("matches the published progression: 1/1/2/3", () => {
    const id = "antipaladin:iron-tyrant:bonus-feats:3";
    const [change] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(5)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(9)).toBe(3);
  });

  it("is cleanly paired to Cruelty, which carries zero vendored changes (no double-count)", () => {
    const feature = ref.archetypeFeatures["antipaladin:iron-tyrant:bonus-feats:3"]!;
    expect(feature.pairedBaseFeatureUuid).toBeDefined();
    const uuid = feature.pairedBaseFeatureUuid!.split(".").pop()!;
    const base = ref.classFeatures[uuid];
    expect(base?.name).toBe("Cruelty");
    expect(base?.changes ?? []).toEqual([]);
  });
});

describe("Knight of the Sepulcher: undead-adjacent ladder of unconditional saves, immunities, and DR", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Knight of the Sepulcher")).toBe("antipaladin:knight-of-the-sepulcher");
  });

  it("Touch of the Crypt: flat +2 on saves vs. mind-affecting/death/poison, level-independent", () => {
    const id = "antipaladin:knight-of-the-sepulcher:touch-of-the-crypt:5";
    const [change] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.type).toBe("untyped");
    expect(change!.saveCategories).toEqual(["mind", "death", "poison"]);
    expect(evaluateFormula(change!.formula)).toBe(2);
  });

  it("Fortitude of the Crypt: poison immunity + darkvision 60 ft.", () => {
    const id = "antipaladin:knight-of-the-sepulcher:fortitude-of-the-crypt:8";
    const [immChange, senseChange] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(immChange!.target).toBe("immEffect.poison");
    expect(evaluateFormula(immChange!.formula)).toBe(1);
    expect(senseChange!.target).toBe("sensedv");
    expect(evaluateFormula(senseChange!.formula)).toBe(60);
  });

  it("Cloak of the Crypt: energy drain immunity only (harmful negative-energy effects and 50% fortification have no Change target)", () => {
    const id = "antipaladin:knight-of-the-sepulcher:cloak-of-the-crypt:10";
    const changes = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]!.target).toBe("immEffect.energyDrain");
    expect(evaluateFormula(changes[0]!.formula)).toBe(1);
  });

  it("Will of the Crypt: +2 delta on mind-affecting/death only, summing with Touch of the Crypt's +2 to the published +4 (untyped bonuses sum in stacking.ts)", () => {
    const touchId = "antipaladin:knight-of-the-sepulcher:touch-of-the-crypt:5";
    const willId = "antipaladin:knight-of-the-sepulcher:will-of-the-crypt:11";
    const [touch] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[touchId]!.changes;
    const [will] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[willId]!.changes;
    expect(will!.target).toBe("allSavingThrows");
    expect(will!.type).toBe("untyped");
    expect(will!.saveCategories).toEqual(["mind", "death"]);
    expect(evaluateFormula(will!.formula)).toBe(2);
    // Both entries are untyped, so stacking.ts sums same-type/target bonuses
    // rather than taking the highest — the pair composes to +4 on
    // mind-affecting/death while the poison scope (Touch only) stays +2.
    expect(evaluateFormula(touch!.formula) + evaluateFormula(will!.formula)).toBe(4);
  });

  it("Crypt Lord: five unconditional immunities (75% fortification and the exhaustion downgrade have no Change target)", () => {
    const id = "antipaladin:knight-of-the-sepulcher:crypt-lord:15";
    const changes = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const targets = changes.map((ch) => ch.target);
    expect(targets).toEqual([
      "immEffect.deathEffects",
      "immEffect.paralysis",
      "immEffect.sleep",
      "immEffect.stunned",
      "immEffect.fatigue",
    ]);
    for (const change of changes) {
      expect(evaluateFormula(change.formula)).toBe(1);
    }
  });

  it("Soul of the Crypt then Undying Champion: DR 5, then 10, both/bludgeoning and good — highest-per-qualifier composes to the published progression", () => {
    const soulId = "antipaladin:knight-of-the-sepulcher:soul-of-the-crypt:17";
    const undyingId = "antipaladin:knight-of-the-sepulcher:undying-champion:20";
    const [soul] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[soulId]!.changes;
    const [undying] = ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED[undyingId]!.changes;
    expect(soul!.target).toBe("dr.bludgeoning-and-good");
    expect(undying!.target).toBe("dr.bludgeoning-and-good");
    expect(evaluateFormula(soul!.formula)).toBe(5);
    expect(evaluateFormula(undying!.formula)).toBe(10);
    // defenses.ts's groupByQualifier keeps only the highest value per
    // qualifier — with both entries sharing this qualifier, 10 wins once
    // Undying Champion is active, matching the published "DR increases to
    // 10/bludgeoning and good" (not an additional +5).
    expect(Math.max(evaluateFormula(soul!.formula), evaluateFormula(undying!.formula))).toBe(10);
  });

  it("Soul of the Crypt is cleanly paired to Aura of Depravity, so the hand-tabled base antipaladin DR is withheld for this combo (no double-count)", () => {
    const feature =
      ref.archetypeFeatures["antipaladin:knight-of-the-sepulcher:soul-of-the-crypt:17"]!;
    expect(feature.pairedBaseFeatureUuid).toBe(
      "Compendium.pf1.class-abilities.Item.LkbGAZaa2KDrnS89",
    );
    const aod = Object.values(ref.classFeatures).find((f) => f.name === "Aura of Depravity");
    expect(aod?.changes ?? []).toEqual([]);
  });
});

describe("subsystem posture: the base features these numeric entries pair against carry zero vendored changes", () => {
  it("Fiendish Boon, Aura of Despair, Aura of Sin, and Cruelty (Knight of the Sepulcher's other pairings) all have empty changes", () => {
    for (const name of ["Fiendish Boon", "Aura of Despair", "Aura of Sin", "Cruelty"]) {
      const feature = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(feature, `base class feature not found: ${name}`).toBeDefined();
      expect(feature?.changes ?? [], `${name} unexpectedly carries changes`).toEqual([]);
    }
  });

  it("Smite Good and Touch of Corruption carry no Change effects, only vendored resource pools", () => {
    for (const name of ["Smite Good", "Touch of Corruption"]) {
      const feature = Object.values(ref.classFeatures).find((f) => f.name === name);
      expect(feature, `base class feature not found: ${name}`).toBeDefined();
      expect(feature?.changes ?? [], `${name} unexpectedly carries changes`).toEqual([]);
      expect(feature?.uses?.maxFormula, `${name} missing its vendored resource pool`).toBeDefined();
    }
  });
});

describe("vendored-data oddities recorded in the classification (not guessed at)", () => {
  it("Dread Vanguard's Beacon of Evil is blocked: its one unconditional numeric clause is a pool-size change to Touch of Corruption's vendored resource formula", () => {
    const id = "antipaladin:dread-vanguard:beacon-of-evil:4";
    expect(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
    const feature = ref.archetypeFeatures[id]!;
    expect(strippedDescription(feature.description ?? "")).toContain(
      "gains one additional use of his touch of corruption ability per day",
    );
  });

  it("Dark Emissary's own id/level says 17th, but its text grants at 14th and claims to replace aura of sin while the vendored pairing points at Aura of Depravity", () => {
    const id = "antipaladin:dread-vanguard:dark-emissary:17";
    const feature = ref.archetypeFeatures[id]!;
    expect(feature.level).toBe(17);
    expect(strippedDescription(feature.description ?? "")).toContain(
      "At 14th level, a dread vanguard becomes a true messenger",
    );
    expect(strippedDescription(feature.description ?? "")).toContain(
      "This ability replaces aura of sin.",
    );
    expect(feature.pairedBaseFeatureUuid).toBe(
      "Compendium.pf1.class-abilities.Item.LkbGAZaa2KDrnS89",
    );
    const aod = Object.values(ref.classFeatures).find((f) => f.name === "Aura of Depravity");
    expect(aod?.uuid).toBe(feature.pairedBaseFeatureUuid);
    expect(ANTIPALADIN_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
  });

  it("the vendored antipaladin archetype list carries a split Rough Rampage / Rough Rampager pair: only the 'rough-rampage' slug has features, 'rough-rampager' carries the real name/description/sources but zero features", () => {
    const withFeatures = archetypeId("Rough Rampage");
    expect(withFeatures).toBe("antipaladin:rough-rampage");
    const rampager = Object.values(ref.archetypes).find(
      (a) => a.name === "Rough Rampager" && a.classTag === "antipaladin",
    );
    expect(rampager?.id).toBe("antipaladin:rough-rampager");
    expect(rampager?.description).toBeDefined();
    const rampagerFeatures = Object.values(ref.archetypeFeatures).filter(
      (f) => f.archetypeId === "antipaladin:rough-rampager",
    );
    expect(rampagerFeatures).toHaveLength(0);
    const rampageFeatures = Object.values(ref.archetypeFeatures).filter(
      (f) => f.archetypeId === "antipaladin:rough-rampage",
    );
    expect(rampageFeatures).toHaveLength(3);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through antipaladin's tables when explicitly given as overrides", () => {
  it("falls back to the antipaladin extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "antipaladin:knight-of-the-sepulcher:soul-of-the-crypt:17",
      {},
      ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("dr.bludgeoning-and-good");
  });

  it("returns undefined for an antipaladin feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "antipaladin:seal-breaker:corpse-rider:5",
        {},
        ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "antipaladin:blighted-myrmidon:aura-of-decay:11",
        {},
        ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "antipaladin:dread-vanguard:beacon-of-evil:4",
        {},
        ANTIPALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
