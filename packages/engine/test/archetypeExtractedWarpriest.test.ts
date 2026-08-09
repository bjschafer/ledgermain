import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED,
  WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/warpriest.js";
import { isTargetApplied } from "../src/targets.js";

/**
 * The warpriest slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: warpriest's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures therefore
 * (1) assert directly against `WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * exported `changes` shape, (2) hand-compute each formula via the real
 * `formula.ts` evaluator (`evaluateFormula`) at several class levels against
 * the exact published-rules numbers cited in each entry's `provenance`, and
 * (3) verify `resolveArchetypeFeatureEffect` resolves correctly when
 * explicitly given this file's tables as its override arguments. `loadRefData`
 * sanity-checks that every id this file references actually exists in the
 * real vendored data slice.
 *
 * Every provenance quote is additionally re-verified below as a literal
 * (HTML-stripped, whitespace-squashed) substring of the vendored
 * description — the exact machine check this wave's brief calls for, after a
 * prior wave was caught shipping a fabricated "..." elided quote.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "warpriest",
  );
  if (!entry) throw new Error(`warpriest archetype not found: ${name}`);
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

describe("WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored warpriest archetype feature exactly once", () => {
    const featureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("warpriest:"))
      .map((f) => f.id);
    expect(featureIds.length).toBe(78);
    for (const id of featureIds) {
      expect(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(78);
  });

  it("bucket counts match the audited totals (4 numeric / 8 situational / 65 subsystem / 1 blocked)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(4);
    expect(counts["situational"]).toBe(8);
    expect(counts["subsystem"]).toBe(65);
    expect(counts["blocked"]).toBe(1);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(4);
    for (const id of numericIds) {
      expect(WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the real vendored feature", () => {
    for (const [id, entry] of Object.entries(WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED: provenance is a verbatim substring", () => {
  it("every entry's provenance survives HTML-strip + whitespace-squash as an exact substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED)) {
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
    for (const [id, entry] of Object.entries(WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const change of entry.changes) {
        expect(isTargetApplied(change.target), `${id}: unapplied target ${change.target}`).toBe(
          true,
        );
        expect(change.formula.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Cult Leader: Well-Hidden grants a flat +2 to two named skills", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Cult Leader")).toBe("warpriest:cult-leader");
  });

  it("+2 to Disguise and Stealth, unconditional", () => {
    const id = "warpriest:cult-leader:well-hidden:0";
    const [dis, ste] = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dis!.target).toBe("skill.dis");
    expect(ste!.target).toBe("skill.ste");
    expect(evaluateFormula(dis!.formula, {})).toBe(2);
    expect(evaluateFormula(ste!.formula, {})).toBe(2);
  });
});

describe("Cult Leader: Skill Ranks per Level doubles the base 2+Int delta", () => {
  it("2 * unlevel bonusSkillRanks — +2 at L1, +10 at L5, +40 at L20", () => {
    const id = "warpriest:cult-leader:skill-ranks-per-level:0";
    const [ranks] = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(ranks!.target).toBe("bonusSkillRanks");
    const at = (level: number) => evaluateFormula(ranks!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(2);
    expect(at(5)).toBe(10);
    expect(at(20)).toBe(40);
  });

  it("the base warpriest class really is 2 + Int skill ranks/level, confirming the +2/level delta", () => {
    const warpriest = Object.values(ref.classes).find((cls) => cls.tag === "warpriest");
    expect(warpriest?.skillsPerLevel).toBe(2);
  });
});

describe("Forgepriest: Heat of the Forge grants flat fire resistance", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Forgepriest")).toBe("warpriest:forgepriest");
  });

  it("fire resistance 5 at L6, 10 at L13, unconditional", () => {
    const id = "warpriest:forgepriest:heat-of-the-forge:6";
    const [eres] = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(eres!.target).toBe("eres.fire");
    const at = (level: number) => evaluateFormula(eres!.formula, { class: { unlevel: level } });
    expect(at(6)).toBe(5);
    expect(at(12)).toBe(5);
    expect(at(13)).toBe(10);
    expect(at(20)).toBe(10);
  });

  it("has no paired base-feature slot — replaces an unpaired bonus-feat slot, not a numeric base ability", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "warpriest:forgepriest:heat-of-the-forge:6",
    );
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Sacred Fist: AC Bonus grants Wis-mod plus scaling dodge AC/CMD while unarmored/unencumbered/shieldless", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Sacred Fist")).toBe("warpriest:sacred-fist");
  });

  it("Wis-mod (min 0) half applies to both ac and cmd, untyped, and is clamped at 0 for a negative modifier", () => {
    const id = "warpriest:sacred-fist:ac-bonus:0";
    const [acWis, cmdWis] = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acWis!.target).toBe("ac");
    expect(acWis!.type).toBe("untyped");
    expect(cmdWis!.target).toBe("cmd");
    expect(cmdWis!.type).toBe("untyped");
    const clean = {
      armor: { type: 0 },
      shield: { type: 0 },
      attributes: { encumbrance: { level: 0 } },
    };
    expect(evaluateFormula(acWis!.formula, { ...clean, abilities: { wis: { mod: 3 } } })).toBe(3);
    expect(evaluateFormula(acWis!.formula, { ...clean, abilities: { wis: { mod: -2 } } })).toBe(0);
    expect(evaluateFormula(cmdWis!.formula, { ...clean, abilities: { wis: { mod: 3 } } })).toBe(3);
  });

  it("dodge half scales +1 at L4, +2 at L8, maxes at +5 by L20 — only the ac target is needed (dodge auto-flows to CMD)", () => {
    const id = "warpriest:sacred-fist:ac-bonus:0";
    const dodge = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes[2]!;
    expect(dodge.target).toBe("ac");
    expect(dodge.type).toBe("dodge");
    const clean = {
      armor: { type: 0 },
      shield: { type: 0 },
      attributes: { encumbrance: { level: 0 } },
    };
    const at = (level: number) =>
      evaluateFormula(dodge.formula, { ...clean, class: { unlevel: level } });
    expect(at(4)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(20)).toBe(5);
  });

  it("all three changes drop to 0 while armored, shielded, or encumbered", () => {
    const id = "warpriest:sacred-fist:ac-bonus:0";
    const [acWis, , dodge] = WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const ctx = { class: { unlevel: 20 }, abilities: { wis: { mod: 4 } } };
    expect(
      evaluateFormula(acWis!.formula, { ...ctx, armor: { type: 1 }, shield: { type: 0 } }),
    ).toBe(0);
    expect(
      evaluateFormula(dodge!.formula, { ...ctx, armor: { type: 0 }, shield: { type: 1 } }),
    ).toBe(0);
    expect(
      evaluateFormula(dodge!.formula, {
        ...ctx,
        armor: { type: 0 },
        shield: { type: 0 },
        attributes: { encumbrance: { level: 1 } },
      }),
    ).toBe(0);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through warpriest's tables when explicitly given as overrides", () => {
  it("falls back to the warpriest extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "warpriest:forgepriest:heat-of-the-forge:6",
      {},
      WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("eres.fire");
  });

  it("returns undefined for a warpriest feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "warpriest:champion-of-the-faith:sacred-weapon:1",
        {},
        WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "warpriest:champion-of-the-faith:smite:4",
        {},
        WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "warpriest:sixth-wing-bulwark:sacred-shield:0",
        {},
        WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: level-metadata defect (Sixth Wing Bulwark's Sacred Shield)", () => {
  it("the vendored level field (20) is inconsistent with the ability it replaces (Sacred Weapon, a 1st-level feature) and its own prose (effects starting well before 20th) — recorded as blocked, not guessed at", () => {
    const id = "warpriest:sixth-wing-bulwark:sacred-shield:0";
    const entry = WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION[id];
    expect(entry?.bucket).toBe("blocked");
    expect(entry?.level).toBe(20);
    const feature = ref.archetypeFeatures[id];
    expect(feature?.pairedBaseFeatureUuid).toContain("YGbFrqaGvnCbAKKV"); // Sacred Weapon (1st level)
    expect(WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
  });
});

describe("class note 2: Sacred Weapon / Sacred Armor carry zero vendored changes — nothing to double-count", () => {
  it("the real vendored Sacred Weapon and Sacred Armor class features carry changes: [] (only a uses.maxFormula resource)", () => {
    const sacredWeapon = Object.values(ref.classFeatures).find((f) => f.name === "Sacred Weapon");
    const sacredArmor = Object.values(ref.classFeatures).find((f) => f.name === "Sacred Armor");
    expect(sacredWeapon?.changes ?? []).toEqual([]);
    expect(sacredArmor?.changes ?? []).toEqual([]);
    expect(sacredWeapon?.uses?.maxFormula).toBe("if(gte(@class.unlevel, 4), @class.unlevel)");
    expect(sacredArmor?.uses?.maxFormula).toBe("@class.unlevel");
  });
});

describe("class note 5: Bonus Feats (WAR) and Focus Weapon each carry their own real vendored bonusFeats change", () => {
  it("Bonus Feats (WAR) grants floor(unlevel/3) open bonus feats", () => {
    const bonusFeats = Object.values(ref.classFeatures).find((f) => f.name === "Bonus Feats (WAR)");
    expect(bonusFeats?.changes).toEqual([
      { formula: "floor(@class.unlevel / 3)", target: "bonusFeats", type: "untyped" },
    ]);
  });

  it("Focus Weapon grants a single fixed named feat via the same bonusFeats target", () => {
    const focusWeapon = Object.values(ref.classFeatures).find((f) => f.name === "Focus Weapon");
    expect(focusWeapon?.changes).toEqual([{ formula: "1", target: "bonusFeats", type: "untyped" }]);
  });
});
