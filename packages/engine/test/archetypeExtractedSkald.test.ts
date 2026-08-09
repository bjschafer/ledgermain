import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  SKALD_ARCHETYPE_EFFECTS_EXTRACTED,
  SKALD_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/skald.js";

/**
 * The skald slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: skald's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `SKALD_ARCHETYPE_EFFECTS_EXTRACTED`'s exported `changes`
 * shape, (2) hand-compute each formula via the real `formula.ts` evaluator
 * (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments. `loadRefData` is used to
 * sanity-check that every archetypeId/name this file references actually
 * exists in the real vendored data slice, same posture as
 * `archetypeExtractedMagus.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "skald",
  );
  if (!entry) throw new Error(`skald archetype not found: ${name}`);
  return entry.id;
}

describe("SKALD_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored skald archetype feature exactly once", () => {
    const skaldFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("skald:"))
      .map((f) => f.id);
    expect(skaldFeatureIds.length).toBe(100);
    for (const id of skaldFeatureIds) {
      expect(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(100);
  });

  it("covers all 26 vendored skald archetypes", () => {
    const archetypeIds = new Set(
      Object.values(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION).map((e) => e.archetypeId),
    );
    expect(archetypeIds.size).toBe(26);
    const vendoredSkaldArchetypeIds = new Set(
      Object.values(ref.archetypes)
        .filter((a) => a.classTag === "skald")
        .map((a) => a.id),
    );
    expect(vendoredSkaldArchetypeIds.size).toBe(26);
    for (const id of vendoredSkaldArchetypeIds) {
      expect(archetypeIds.has(id)).toBe(true);
    }
  });

  it("bucket counts sum to the total and numeric count matches the extracted table", () => {
    const buckets = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      buckets[entry.bucket]++;
    }
    expect(buckets.numeric + buckets.situational + buckets.subsystem + buckets.blocked).toBe(100);
    expect(buckets.numeric).toBe(11);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(11);
    for (const id of numericIds) {
      expect(SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(SKALD_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(SKALD_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });
});

describe("provenance: every extracted entry's provenance is a verbatim substring of the vendored description", () => {
  /** Same normalization the batch-extraction sweeps used: tags out, whitespace squashed. */
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

  for (const [id, entry] of Object.entries(SKALD_ARCHETYPE_EFFECTS_EXTRACTED)) {
    it(`${id}: provenance drifted from vendored text?`, () => {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored archetype feature id ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(description.includes(entry.provenance)).toBe(true);
    });
  }
});

describe("Battle Scion: Courtly Presence grants half CHARACTER level (not skald level) to Intimidate", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Battle Scion")).toBe("skald:battle-scion");
  });

  it("floor(hd.total / 2) on skill.int", () => {
    const id = "skald:battle-scion:courtly-presence:1";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.int");
    const at = (hd: number) =>
      evaluateFormula(change!.formula, { attributes: { hd: { total: hd } } });
    expect(at(2)).toBe(1);
    expect(at(10)).toBe(5);
    expect(at(15)).toBe(7);
  });
});

describe("Belkzen War Drummer: Fearsome Mien grants +1/2 class level (min 1) to Intimidate/Bluff", () => {
  it("max(1, floor(unlevel/2)) on both skills", () => {
    const id = "skald:belkzen-war-drummer:fearsome-mien:1";
    const [intChange, blfChange] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(intChange!.target).toBe("skill.int");
    expect(blfChange!.target).toBe("skill.blf");
    const at = (level: number) =>
      evaluateFormula(intChange!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1); // minimum 1
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
  });
});

describe("Dragon Skald: Fearless Raider grants a flat +4 save vs. fear", () => {
  it("flat 4, saveCategories fear", () => {
    const id = "skald:dragon-skald:fearless-raider:2";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["fear"]);
    expect(evaluateFormula(change!.formula, {})).toBe(4);
  });
});

describe("Dragon Skald: Sea Legs extracts only the unconditional Swim clause", () => {
  it("max(1, floor(unlevel/2)) on skill.swm", () => {
    const id = "skald:dragon-skald:sea-legs:1";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.swm");
    expect(SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes.length).toBe(1);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(10)).toBe(5);
  });
});

describe("Elegist: Steady Hearted grants a flat +4 save vs. emotion", () => {
  it("flat 4, saveCategories emotion", () => {
    const id = "skald:elegist:steady-hearted:2";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["emotion"]);
    expect(evaluateFormula(change!.formula, {})).toBe(4);
  });
});

describe("Fated Champion: Watcher of the Weave grants insight initiative equal to half skald level", () => {
  it("floor(unlevel/2), insight type", () => {
    const id = "skald:fated-champion:watcher-of-the-weave:2";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("init");
    expect(change!.type).toBe("insight");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(7)).toBe(3);
    expect(at(10)).toBe(5);
  });
});

describe("Twilight Speaker: Twilight Envoy grants half skald level on three skills", () => {
  it("floor(unlevel/2) on Bluff/Diplomacy/Sense Motive", () => {
    const id = "skald:twilight-speaker:twilight-envoy:1";
    const [blf, dip, sen] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(dip!.target).toBe("skill.dip");
    expect(sen!.target).toBe("skill.sen");
    const at = (level: number) => evaluateFormula(blf!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(10)).toBe(5);
  });
});

describe("Undying Word: Bonus Feat grants an unpaired, additive bonus-feat count", () => {
  it("1 + floor((unlevel-1)/6) — 1 at L1, 2 at L7, 3 at L13, 4 at L19", () => {
    const id = "skald:undying-word:bonus-feat:1";
    const [feats] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(feats!.target).toBe("bonusFeats");
    const at = (level: number) => evaluateFormula(feats!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(13)).toBe(3);
    expect(at(19)).toBe(4);
  });

  it("has no paired base-feature slot — skald has no baseline bonus-feat progression to swap", () => {
    const feature = ref.archetypeFeatures["skald:undying-word:bonus-feat:1"];
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });
});

describe("Warlord: Battle Bravado grants Cha-to-AC/CMD plus a stacking dodge bonus, gated on unarmored/unencumbered/no-shield", () => {
  it("Cha bonus (min 0) applies to both ac and cmd as untyped changes, only when all three conditions hold", () => {
    const id = "skald:warlord:battle-bravado:3";
    const [chaAc, chaCmd] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(chaAc!.target).toBe("ac");
    expect(chaAc!.type).toBe("untyped");
    expect(chaCmd!.target).toBe("cmd");
    expect(chaCmd!.type).toBe("untyped");

    const unarmored = {
      armor: { type: 0 },
      shield: { type: 0 },
      attributes: { encumbrance: { level: 0 } },
    };
    expect(
      evaluateFormula(chaAc!.formula, {
        ...unarmored,
        abilities: { cha: { mod: 3 } },
        class: { unlevel: 3 },
      }),
    ).toBe(3);
    // negative Cha mod clamps to 0, not a penalty
    expect(
      evaluateFormula(chaAc!.formula, {
        ...unarmored,
        abilities: { cha: { mod: -2 } },
        class: { unlevel: 3 },
      }),
    ).toBe(0);
    // wearing armor voids the bonus entirely
    expect(
      evaluateFormula(chaAc!.formula, {
        armor: { type: 1 },
        shield: { type: 0 },
        attributes: { encumbrance: { level: 0 } },
        abilities: { cha: { mod: 3 } },
        class: { unlevel: 3 },
      }),
    ).toBe(0);
    // carrying a shield voids the bonus entirely
    expect(
      evaluateFormula(chaAc!.formula, {
        armor: { type: 0 },
        shield: { type: 1 },
        attributes: { encumbrance: { level: 0 } },
        abilities: { cha: { mod: 3 } },
        class: { unlevel: 3 },
      }),
    ).toBe(0);
  });

  it("the stacking dodge bonus is +1 at 7th, +2 at 11th, +3 at 15th (cumulative, capped)", () => {
    const id = "skald:warlord:battle-bravado:3";
    const [, , dodge] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dodge!.target).toBe("ac");
    expect(dodge!.type).toBe("dodge");
    const unarmored = {
      armor: { type: 0 },
      shield: { type: 0 },
      attributes: { encumbrance: { level: 0 } },
    };
    const at = (level: number) =>
      evaluateFormula(dodge!.formula, { ...unarmored, class: { unlevel: level } });
    expect(at(3)).toBe(0);
    expect(at(7)).toBe(1);
    expect(at(11)).toBe(2);
    expect(at(15)).toBe(3);
    expect(at(20)).toBe(3);
  });
});

describe("Warlord: Sun-Bronzed Skin grants DR 5/- only with no armor AND no shield", () => {
  it("both conditions gate the bonus", () => {
    const id = "skald:warlord:sun-bronzed-skin:19";
    const [dr] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr");
    expect(evaluateFormula(dr!.formula, { armor: { type: 0 }, shield: { type: 0 } })).toBe(5);
    expect(evaluateFormula(dr!.formula, { armor: { type: 1 }, shield: { type: 0 } })).toBe(0);
    expect(evaluateFormula(dr!.formula, { armor: { type: 0 }, shield: { type: 1 } })).toBe(0);
  });
});

describe("Warlord: Unshakable grants a flat +2 save vs. fear", () => {
  it("flat 2, saveCategories fear", () => {
    const id = "skald:warlord:unshakable:2";
    const [change] = SKALD_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["fear"]);
    expect(evaluateFormula(change!.formula, {})).toBe(2);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through skald's tables when explicitly given as overrides", () => {
  it("falls back to the skald extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "skald:warlord:unshakable:2",
      {},
      SKALD_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("allSavingThrows");
  });

  it("returns undefined for a skald feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "skald:augur:raging-song:1",
        {},
        SKALD_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "skald:herald-of-the-horn:horn-call:7",
        {},
        SKALD_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: Horn Call's spell-DC bonus has no applied target (issue #45, skald)", () => {
  it("Horn Call is blocked, not extracted, for lack of a spell-save-DC Change target", () => {
    const entry = SKALD_ARCHETYPE_FEATURE_CLASSIFICATION["skald:herald-of-the-horn:horn-call:7"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      SKALD_ARCHETYPE_EFFECTS_EXTRACTED["skald:herald-of-the-horn:horn-call:7"],
    ).toBeUndefined();
  });

  it("the base skald features referenced by pairedBaseFeatureUuid across this file carry zero changes — nothing to double-count", () => {
    const loreMaster = ref.classFeatures["ptw7bHU3Z7HNj2qz"];
    expect(loreMaster?.name).toBe("Lore Master (SKA)");
    expect(loreMaster?.changes ?? []).toEqual([]);
    const damageReduction = ref.classFeatures["kMjMAG6Gjs7unAz5"];
    expect(damageReduction?.name).toBe("Damage Reduction (SKA)");
    expect(damageReduction?.changes ?? []).toEqual([]);
    const wellVersed = Object.values(ref.classFeatures).find((f) => f.name === "Well-Versed");
    expect(wellVersed?.changes ?? []).toEqual([]);
  });
});
