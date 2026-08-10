import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
  SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/swashbuckler.js";

/**
 * The swashbuckler slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: swashbuckler's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
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
    (a) => a.name === name && a.classTag === "swashbuckler",
  );
  if (!entry) throw new Error(`swashbuckler archetype not found: ${name}`);
  return entry.id;
}

describe("SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored swashbuckler archetype feature exactly once", () => {
    const swashFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("swashbuckler:"))
      .map((f) => f.id);
    expect(swashFeatureIds.length).toBe(68);
    for (const id of swashFeatureIds) {
      expect(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(68);
  });

  it("spans all 20 vendored swashbuckler archetypes", () => {
    const covered = new Set(
      Object.values(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(covered.size).toBe(20);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa (no stray entries)", () => {
    const numericIds = Object.entries(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(4);
    for (const id of numericIds) {
      expect(SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts: 4 numeric, 10 situational, 50 subsystem, 4 blocked", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts).toEqual({ numeric: 4, situational: 10, subsystem: 50, blocked: 4 });
  });

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping and whitespace-squashing", () => {
    for (const [id, entry] of Object.entries(SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Azatariel: Battle Dance grants a true enhancement bonus to base speed while lightly armored/loaded", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Azatariel")).toBe("swashbuckler:azatariel");
  });

  it("+10 ft. at 3rd, +20 at 7th, ..., +50 at 19th/20th, zero if armored or overloaded", () => {
    const id = "swashbuckler:azatariel:battle-dance:3";
    const [change] = SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("landSpeed");
    expect(change!.type).toBe("enhancement");
    const at = (level: number, armorType: number, encumbranceLevel: number) =>
      evaluateFormula(change!.formula, {
        class: { unlevel: level },
        armor: { type: armorType },
        attributes: { encumbrance: { level: encumbranceLevel } },
      });
    expect(at(3, 0, 0)).toBe(10);
    expect(at(6, 0, 0)).toBe(10);
    expect(at(7, 0, 0)).toBe(20);
    expect(at(11, 1, 0)).toBe(30); // light armor still qualifies
    expect(at(19, 0, 0)).toBe(50);
    expect(at(20, 0, 0)).toBe(50);
    expect(at(7, 2, 0)).toBe(0); // medium armor: loses the bonus
    expect(at(7, 0, 1)).toBe(0); // medium/heavy load: loses the bonus
  });

  it("replaces nimble; the paired base feature (Nimble (SWA)) carries its own dodge-AC Change, a different target with no interaction", () => {
    const feature = ref.archetypeFeatures["swashbuckler:azatariel:battle-dance:3"]!;
    expect(feature.pairedBaseFeatureUuid).toContain("H9Rq9os7iM27l8Gt");
    const nimble = Object.values(ref.classFeatures).find((f) => f.name === "Nimble (SWA)");
    expect(nimble?.changes).toEqual([
      { formula: "floor((@class.unlevel + 1) / 4)", target: "ac", type: "dodge" },
    ]);
  });
});

describe("Daring Infiltrator: Quick-Tongued grants a flat, level-scaling Bluff bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Daring Infiltrator")).toBe("swashbuckler:daring-infiltrator");
  });

  it("+1 Bluff at 2nd, +1 per 4 levels thereafter", () => {
    const id = "swashbuckler:daring-infiltrator:quick-tongued:2";
    const [change] = SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.blf");
    expect(change!.type).toBe("untyped");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(5)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(10)).toBe(3);
  });

  it("replaces charmed life; the paired base feature carries no vendored changes, only a uses pool", () => {
    const feature = ref.archetypeFeatures["swashbuckler:daring-infiltrator:quick-tongued:2"]!;
    expect(feature.pairedBaseFeatureUuid).toContain("etOoJgoeaBRenCir");
    const charmedLife = Object.values(ref.classFeatures).find((f) => f.name === "Charmed Life");
    expect(charmedLife?.changes ?? []).toEqual([]);
    expect(charmedLife?.uses?.maxFormula).toBe("2 + floor((@class.unlevel + 2) / 4)");
  });
});

describe("Noble Fencer: Aristocratic Discipline grants a Will save bonus scoped to mind-affecting effects", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Noble Fencer")).toBe("swashbuckler:noble-fencer");
  });

  it("+1 at 2nd, +2 at 6th, +5 at 18th, via allSavingThrows narrowed to the 'mind' category", () => {
    const id = "swashbuckler:noble-fencer:aristocratic-discipline:2";
    const [change] = SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.type).toBe("untyped");
    expect(change!.saveCategories).toEqual(["mind"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(5)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(18)).toBe(5);
  });

  it("replaces charmed life (uses-only, no vendored changes to double-count)", () => {
    const feature = ref.archetypeFeatures["swashbuckler:noble-fencer:aristocratic-discipline:2"]!;
    expect(feature.pairedBaseFeatureUuid).toContain("etOoJgoeaBRenCir");
  });
});

describe("Shackles Corsair: Swagger extracts only the Intimidate-check clause", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Shackles Corsair")).toBe("swashbuckler:shackles-corsair");
  });

  it("+1 Intimidate at 3rd, +1 per 4 levels thereafter; medium confidence for the partial extraction", () => {
    const id = "swashbuckler:shackles-corsair:swagger:3";
    const entry = SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED[id]!;
    expect(entry.confidence).toBe("medium");
    const [change] = entry.changes;
    expect(change!.target).toBe("skill.int");
    expect(change!.type).toBe("untyped");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(19)).toBe(5);
  });

  it("drops the DC-against-her clause, the Profession (sailor) morale bonus, and the 7th-level charmed-life rider (all cited in the provenance but unmodeled)", () => {
    const feature = ref.archetypeFeatures["swashbuckler:shackles-corsair:swagger:3"]!;
    const description = strippedDescription(feature.description ?? "");
    expect(description).toContain("the DC of Intimidate checks made against her increases by 1");
    expect(description).toContain("a +1 morale bonus on Profession (sailor) checks");
    expect(description).toContain("she uses charmed life");
  });

  it("replaces nimble; the paired base feature's dodge-AC Change is a different target, no interaction", () => {
    const feature = ref.archetypeFeatures["swashbuckler:shackles-corsair:swagger:3"]!;
    expect(feature.pairedBaseFeatureUuid).toContain("H9Rq9os7iM27l8Gt");
  });
});

describe("blocked bucket: pool-size/uses-count divergences from the vendored panache and charmed life formulas", () => {
  it("Inspired Panache resizes the panache pool basis away from the vendored max(1, @abilities.cha.mod)", () => {
    const panache = Object.values(ref.classFeatures).find((f) => f.name === "Panache");
    expect(panache?.uses?.maxFormula).toBe("max(1, @abilities.cha.mod)");
    expect(
      SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[
        "swashbuckler:inspired-blade:inspired-panache:0"
      ]?.bucket,
    ).toBe("blocked");
  });

  it("Greater Charmed Life and rondelero's Charmed Life both diverge from the vendored uses.maxFormula", () => {
    const charmedLife = Object.values(ref.classFeatures).find((f) => f.name === "Charmed Life");
    expect(charmedLife?.uses?.maxFormula).toBe("2 + floor((@class.unlevel + 2) / 4)");
    expect(
      SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[
        "swashbuckler:mysterious-avenger:greater-charmed-life:4"
      ]?.bucket,
    ).toBe("blocked");
    expect(
      SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[
        "swashbuckler:rondelero-swashbuckler:charmed-life:10"
      ]?.bucket,
    ).toBe("blocked");
  });

  it("Daring Teamwork replaces bonus feats without a pairedBaseFeatureUuid, so the vendored Bonus Feats (SWA) progression would stay live and double-count", () => {
    const feature = ref.archetypeFeatures["swashbuckler:guiding-blade:daring-teamwork:1"]!;
    expect(feature.pairedBaseFeatureUuid).toBeUndefined();
    const bonusFeats = Object.values(ref.classFeatures).find((f) => f.name === "Bonus Feats (SWA)");
    expect(bonusFeats?.changes).toEqual([
      { formula: "floor(@class.unlevel / 4)", target: "bonusFeats", type: "untyped" },
    ]);
    expect(
      SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION["swashbuckler:guiding-blade:daring-teamwork:1"]
        ?.bucket,
    ).toBe("blocked");
  });
});

describe("vendored-data oddities recorded in the classification (not guessed at)", () => {
  it("seven level-3 Deeds features are spuriously paired to Nimble (SWA) even though their prose replaces individual deeds", () => {
    const nimbleUuid = "Compendium.pf1.class-abilities.Item.H9Rq9os7iM27l8Gt";
    for (const id of [
      "swashbuckler:mouser:deeds:3",
      "swashbuckler:musketeer:deeds:3",
      "swashbuckler:rostland-bravo:deeds:3",
      "swashbuckler:shackles-corsair:deeds:3",
      "swashbuckler:veiled-blade:deeds:3",
      "swashbuckler:wildstrider:deeds:3",
    ]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(feature.pairedBaseFeatureUuid, `${id} pairing`).toBe(nimbleUuid);
      expect(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
    }
  });

  it("Inspired Blade's Deeds entry carries a vendored id level suffix of 0 while its own level field says 11", () => {
    const feature = ref.archetypeFeatures["swashbuckler:inspired-blade:deeds:0"]!;
    expect(feature.level).toBe(11);
    expect(
      SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION["swashbuckler:inspired-blade:deeds:0"]?.level,
    ).toBe(11);
  });

  it("Musketeer's Gifted Firearm and Weapon and Armor Proficiency prose is the cavalier Musketeer archetype's text, referencing 'cavalier' throughout", () => {
    for (const id of [
      "swashbuckler:musketeer:gifted-firearm:1",
      "swashbuckler:musketeer:weapon-and-armor-proficiency:1",
    ]) {
      const feature = ref.archetypeFeatures[id]!;
      expect(strippedDescription(feature.description ?? "")).toMatch(/cavalier/i);
      expect(SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("subsystem");
    }
  });

  it("Rondelero's Buckler Bash is spuriously paired to Charmed Life, not Nimble, but Charmed Life carries no vendored changes so nothing is at risk", () => {
    const feature = ref.archetypeFeatures["swashbuckler:rondelero-swashbuckler:buckler-bash:2"]!;
    expect(feature.pairedBaseFeatureUuid).toContain("etOoJgoeaBRenCir");
    const charmedLife = Object.values(ref.classFeatures).find((f) => f.name === "Charmed Life");
    expect(charmedLife?.changes ?? []).toEqual([]);
  });
});

describe("subsystem posture: the vendored panache/deeds/weapon-training base features this class rides", () => {
  it("Swashbuckler Weapon Training carries a live mattack/wdamage/bonusFeats Change that reflavor features can't safely narrow without a weapon-category formula input", () => {
    const feature = Object.values(ref.classFeatures).find(
      (f) => f.name === "Swashbuckler Weapon Training",
    );
    expect(feature?.changes).toEqual([
      { formula: "floor((@class.unlevel - 1) / 4)", target: "mattack", type: "untyped" },
      { formula: "floor((@class.unlevel - 1) / 4)", target: "wdamage", type: "untyped" },
      { formula: "1", target: "bonusFeats", type: "untyped" },
    ]);
  });

  it("Panache's resource pool rides a vendored uses.maxFormula with no changes array", () => {
    const panache = Object.values(ref.classFeatures).find((f) => f.name === "Panache");
    expect(panache?.changes ?? []).toEqual([]);
    expect(panache?.uses?.maxFormula).toBe("max(1, @abilities.cha.mod)");
  });
});

describe("resolveArchetypeFeatureEffect: resolves through swashbuckler's tables when explicitly given as overrides", () => {
  it("falls back to the swashbuckler extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "swashbuckler:azatariel:battle-dance:3",
      {},
      SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("landSpeed");
  });

  it("reports medium confidence for the partial Swagger extraction", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "swashbuckler:shackles-corsair:swagger:3",
      {},
      SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("medium");
  });

  it("returns undefined for a swashbuckler feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "swashbuckler:arrow-champion:deeds:1",
        {},
        SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "swashbuckler:courser:confounding-target:4",
        {},
        SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "swashbuckler:guiding-blade:daring-teamwork:1",
        {},
        SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
