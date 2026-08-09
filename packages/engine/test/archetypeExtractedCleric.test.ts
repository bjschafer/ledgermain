import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  CLERIC_ARCHETYPE_EFFECTS_EXTRACTED,
  CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/cleric.js";

/**
 * The cleric slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: cleric's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path (same posture as
 * `archetypeExtractedMagus.test.ts`). These fixtures therefore (1) assert
 * directly against `CLERIC_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` is used to
 * sanity-check that every archetypeId/name this file references actually
 * exists in the real vendored data slice.
 *
 * Two ids — Cloistered Cleric's Breadth of Knowledge and Crusader's Bonus
 * Feat — are already hand-verified in `archetype-effects.ts`. They are
 * classified `numeric` here (they truly are) but deliberately absent from
 * `CLERIC_ARCHETYPE_EFFECTS_EXTRACTED`, matching the precedent set by
 * `archetypeExtractedBarbarian.test.ts`'s "hand-verified ids are classified
 * but never duplicated" case.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "cleric",
  );
  if (!entry) throw new Error(`cleric archetype not found: ${name}`);
  return entry.id;
}

const CLERIC_FEATURE_IDS = Object.values(ref.archetypeFeatures)
  .filter((f) => f.archetypeId.startsWith("cleric:"))
  .map((f) => f.id);

describe("CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored cleric archetype feature exactly once (137 features)", () => {
    expect(CLERIC_FEATURE_IDS.length).toBe(137);
    for (const id of CLERIC_FEATURE_IDS) {
      expect(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(137);
  });

  it("every classification key matches a real vendored archetype-feature id", () => {
    for (const id of Object.keys(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(ref.archetypeFeatures[id]).toBeDefined();
    }
  });

  it("bucket counts: 11 numeric, 36 situational, 84 subsystem, 6 blocked", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(11);
    expect(counts["situational"]).toBe(36);
    expect(counts["subsystem"]).toBe(84);
    expect(counts["blocked"]).toBe(6);
  });

  it("blocked entries are the channel-dice/uses divergences and the unapplied-target case", () => {
    const blocked = Object.entries(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, e]) => e.bucket === "blocked")
      .map(([id]) => id);
    expect(blocked.sort()).toEqual(
      [
        "cleric:appeaser:channel-utility:0",
        "cleric:blossoming-light:luminous-font:1",
        "cleric:evangelist:sermonic-performance:1",
        "cleric:fiendish-vessel:channel-evil:1",
        "cleric:forgemaster:divine-smith:1",
        "cleric:scroll-scholar:secrets-revealed:5",
      ].sort(),
    );
  });

  it("the two hand-verified ids are classified numeric but never duplicated into the extracted table", () => {
    const handVerifiedIds = [
      "cleric:cloistered-cleric:breadth-of-knowledge:1",
      "cleric:crusader:bonus-feat:1",
    ];
    for (const id of handVerifiedIds) {
      expect(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
      expect(CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, except the two hand-verified ids", () => {
    const numericIds = Object.entries(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(11);
    const handVerified = new Set([
      "cleric:cloistered-cleric:breadth-of-knowledge:1",
      "cleric:crusader:bonus-feat:1",
    ]);
    for (const id of numericIds) {
      if (handVerified.has(id)) continue;
      expect(CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    expect(Object.keys(CLERIC_ARCHETYPE_EFFECTS_EXTRACTED).length).toBe(9);
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(CLERIC_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("provenance: every extracted entry quotes the real vendored description verbatim", () => {
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

  it("every provenance is a verbatim substring of the vendored description after HTML-stripping", () => {
    for (const [id, entry] of Object.entries(CLERIC_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored archetype feature ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id}: provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Asmodean Advocate: Devil in the Details grants an insight bonus on Profession (barrister)", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Asmodean Advocate")).toBe("cleric:asmodean-advocate");
  });

  it("max(1, floor(unlevel/2)) skill.pro.barrister — +1 at L1, +1 at L2 (min +1), +3 at L7, +5 at L10", () => {
    const id = "cleric:asmodean-advocate:devil-in-the-details:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.pro.barrister");
    expect(change!.type).toBe("insight");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(1);
    expect(at(7)).toBe(3);
    expect(at(10)).toBe(5);
  });
});

describe("Cardinal: Political Skill doubles skill ranks/level via bonusSkillRanks", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Cardinal")).toBe("cleric:cardinal");
  });

  it("4 * unlevel — a flat +4/level delta (6 + Int vs. 2 + Int)", () => {
    const id = "cleric:cardinal:political-skill:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("bonusSkillRanks");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(4);
    expect(at(5)).toBe(20);
    expect(at(20)).toBe(80);
  });
});

describe("Divine Strategist: Master Tactician grants a self-only initiative bonus", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Divine Strategist")).toBe("cleric:divine-strategist");
  });

  it("floor(unlevel/2) init — +0 at L1, +3 at L7, +10 at L20", () => {
    const id = "cleric:divine-strategist:master-tactician:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("init");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(7)).toBe(3);
    expect(at(20)).toBe(10);
  });
});

describe("Elder Mythos Cultist: Forbidden Knowledge grants a flat +2 profane bonus on five Knowledge skills", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Elder Mythos Cultist")).toBe("cleric:elder-mythos-cultist");
  });

  it("all five changes are a flat +2 profane, unrelated to level", () => {
    const id = "cleric:elder-mythos-cultist:forbidden-knowledge:1";
    const changes = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(changes).toHaveLength(5);
    const targets = changes.map((c) => c.target).sort();
    expect(targets).toEqual(
      ["skill.kar", "skill.kdu", "skill.khi", "skill.kpl", "skill.kre"].sort(),
    );
    for (const change of changes) {
      expect(change.type).toBe("profane");
      expect(evaluateFormula(change.formula, {})).toBe(2);
    }
  });
});

describe("Elder Mythos Cultist: Unhinged Mind imposes a Will penalty vs. mind-affecting effects", () => {
  it("-2 allSavingThrows, scoped via saveCategories to 'mind'", () => {
    const id = "cleric:elder-mythos-cultist:unhinged-mind:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["mind"]);
    expect(evaluateFormula(change!.formula, {})).toBe(-2);
  });
});

describe("Foundation of Faith: Bastion adds Constitution modifier to CMD", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Foundation of Faith")).toBe("cleric:foundation-of-faith");
  });

  it("@abilities.con.mod on cmd, untyped", () => {
    const id = "cleric:foundation-of-faith:bastion:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("cmd");
    expect(change!.type).toBe("untyped");
    expect(evaluateFormula(change!.formula, { abilities: { con: { mod: 3 } } })).toBe(3);
    expect(evaluateFormula(change!.formula, { abilities: { con: { mod: -1 } } })).toBe(-1);
  });
});

describe("Mendevian Priest: Teamwork Feat grants a two-tier bonus-feat count", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Mendevian Priest")).toBe("cleric:mendevian-priest");
  });

  it("0 below L4, 1 at L4-7, 2 at L8+", () => {
    const id = "cleric:mendevian-priest:teamwork-feat:4";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(0);
    expect(at(4)).toBe(1);
    expect(at(7)).toBe(1);
    expect(at(8)).toBe(2);
    expect(at(20)).toBe(2);
  });
});

describe("Sacred Attendant: Nimble grants a scaling dodge bonus to AC/CMD while unarmored", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Sacred Attendant")).toBe("cleric:sacred-attendant");
  });

  it("min(6, 1 + floor((unlevel+2)/4)) — +1 at L1, +2 at L2/L5, +3 at L6/L9, +6 at L18+", () => {
    const id = "cleric:sacred-attendant:nimble:1";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("ac");
    expect(change!.type).toBe("dodge");
    // Missing @armor.type/@attributes.encumbrance.level paths resolve to 0
    // (unarmored, light load), so the gate is open in these fixtures.
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(2);
    expect(at(6)).toBe(3);
    expect(at(9)).toBe(3);
    expect(at(10)).toBe(4);
    expect(at(14)).toBe(5);
    expect(at(18)).toBe(6);
    expect(at(20)).toBe(6);
    // Wearing any armor, or carrying more than a light load, zeroes it.
    expect(evaluateFormula(change!.formula, { class: { unlevel: 18 }, armor: { type: 1 } })).toBe(
      0,
    );
    expect(
      evaluateFormula(change!.formula, {
        class: { unlevel: 18 },
        attributes: { encumbrance: { level: 1 } },
      }),
    ).toBe(0);
  });
});

describe("Undead Lord: Bonus Feats grants a single restricted-list feat at 10th level", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Undead lord")).toBe("cleric:undead-lord");
  });

  it("0 below L10, 1 at L10+ (Command Undead's fixed grant not modeled)", () => {
    const id = "cleric:undead-lord:bonus-feats:0";
    const [change] = CLERIC_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(9)).toBe(0);
    expect(at(10)).toBe(1);
    expect(at(20)).toBe(1);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through cleric's tables when explicitly given as overrides", () => {
  it("falls back to the cleric extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "cleric:foundation-of-faith:bastion:1",
      {},
      CLERIC_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("medium");
    expect(resolved?.effect.changes[0]?.target).toBe("cmd");
  });

  it("returns undefined for a cleric feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "cleric:appeaser:mollified-domain:1",
        {},
        CLERIC_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "cleric:blossoming-light:luminous-font:1",
        {},
        CLERIC_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });

  it("the two hand-verified ids resolve through the (real, production) verified table, not this file's extracted table", () => {
    expect(
      resolveArchetypeFeatureEffect("cleric:cloistered-cleric:breadth-of-knowledge:1")?.source,
    ).toBe("verified");
    expect(resolveArchetypeFeatureEffect("cleric:crusader:bonus-feat:1")?.source).toBe("verified");
  });
});

describe("blocked bucket: channel-dice/uses divergences (cleric)", () => {
  it("Blossoming Light's Luminous Font resizes channel energy's uses/day — recorded as blocked, not backfilled", () => {
    const entry =
      CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION["cleric:blossoming-light:luminous-font:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      CLERIC_ARCHETYPE_EFFECTS_EXTRACTED["cleric:blossoming-light:luminous-font:1"],
    ).toBeUndefined();
  });

  it("the real vendored Channel Energy class feature carries zero changes[] (only a uses.maxFormula resource) — confirms there is nothing for a Change to double-count against directly, the risk is purely dice/uses-formula divergence", () => {
    const channelEnergy = Object.values(ref.classFeatures).find(
      (f) => f.name === "Channel Energy" && f.uses !== undefined,
    );
    expect(channelEnergy?.changes ?? []).toEqual([]);
    expect(channelEnergy?.uses?.maxFormula).toBe("3 + @abilities.cha.mod");
  });

  it("Fiendish Vessel's Channel Evil promises a d4-based progression divergent from the vendored d6-based one — blocked", () => {
    const entry = CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION["cleric:fiendish-vessel:channel-evil:1"];
    expect(entry?.bucket).toBe("blocked");
  });
});
