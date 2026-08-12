import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED,
  INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/investigator.js";

/**
 * The investigator slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: investigator's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures therefore
 * (1) assert directly against `INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * exported `changes` shape, (2) hand-compute each formula via the real
 * `formula.ts` evaluator (`evaluateFormula`) at several class levels against
 * the exact published-rules numbers cited in each entry's `provenance`, and
 * (3) verify `resolveArchetypeFeatureEffect` resolves correctly when
 * explicitly given this file's tables as its override arguments (the
 * mechanism it's designed for). `loadRefData` sanity-checks that every
 * archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeExtractedMagus.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "investigator",
  );
  if (!entry) throw new Error(`investigator archetype not found: ${name}`);
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

describe("INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored investigator archetype feature exactly once", () => {
    const investigatorFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("investigator:"))
      .map((f) => f.id);
    expect(investigatorFeatureIds.length).toBe(158);
    for (const id of investigatorFeatureIds) {
      expect(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(158);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(29);
    for (const id of numericIds) {
      expect(INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts match this pass's audit plus the save-categories re-sweep (158 total: 29 numeric, 32 situational, 86 subsystem, 11 blocked)", () => {
    const counts: Record<string, number> = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts).toEqual({ numeric: 29, situational: 32, subsystem: 86, blocked: 11 });
  });

  it("every classification entry references a real vendored feature id/name/level/archetypeId", () => {
    for (const [id, entry] of Object.entries(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(feature!.name).toBe(entry.name);
      expect(feature!.level).toBe(entry.level);
      expect(feature!.archetypeId).toBe(entry.archetypeId);
    }
  });
});

describe("INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED: provenance", () => {
  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of Object.entries(INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED)) {
      for (const ch of entry.changes) {
        expect(ch.formula.length, `${id}: empty formula`).toBeGreaterThan(0);
        expect(ch.target.length, `${id}: empty target`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Antiquarian: Curse Resistance scaling save bonus vs. curse effects", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Antiquarian")).toBe("investigator:antiquarian");
  });

  it("+2 at L2, +4 at L5, +6 at L8 and beyond (11th-level immunity not modeled)", () => {
    const id = "investigator:antiquarian:curse-resistance:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["curse"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
    expect(at(11)).toBe(6);
    expect(at(20)).toBe(6);
  });
});

describe("Conspirator: Underhanded grants an unconditional Disguise bonus", () => {
  it("max(1, floor(unlevel/2)) — 1 at L1, 2 at L4, 5 at L10", () => {
    const id = "investigator:conspirator:underhanded:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.dis");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
  });
});

describe("Cult Hunter: Purify Mind and Body scaling save bonus vs. poison", () => {
  it("+2 at L2, +4 at L5, +6 at L8 and beyond", () => {
    const id = "investigator:cult-hunter:purify-mind-and-body:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["poison"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
    expect(at(15)).toBe(6);
  });

  it("has no paired base-feature slot; the paired 'reroll' duplicate at 11th is blocked, not extracted", () => {
    const feature = ref.archetypeFeatures["investigator:cult-hunter:purify-mind-and-body:2"];
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
    expect(
      INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION[
        "investigator:cult-hunter:purify-mind-and-body-reroll:11"
      ]?.bucket,
    ).toBe("blocked");
    expect(
      INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[
        "investigator:cult-hunter:purify-mind-and-body-reroll:11"
      ],
    ).toBeUndefined();
  });
});

describe("Cult Hunter: Sense Madness grants an unconditional Sense Motive bonus", () => {
  it("max(1, floor(unlevel/2)) — 1 at L1, 3 at L5", () => {
    const id = "investigator:cult-hunter:sense-madness:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(5)).toBe(2);
  });
});

describe("Empiricist: Unfailing Logic insight Will-save bonus vs. illusion disbelief", () => {
  it("+2 insight at L4, +4 at L8 and beyond", () => {
    const id = "investigator:empiricist:unfailing-logic:4";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.type).toBe("insight");
    expect(change!.saveCategories).toEqual(["illusion"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(4)).toBe(2);
    expect(at(8)).toBe(4);
    expect(at(16)).toBe(4);
  });
});

describe("Engineer: Mechanical Understanding Knowledge (engineering) bonus", () => {
  it("1 + floor((unlevel-3)/3) — 1 at L3, 2 at L6, 3 at L9", () => {
    const id = "investigator:engineer:mechanical-understanding:3";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.ken");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(9)).toBe(3);
  });
});

describe("Forensic Physician: Disease Lore uncapped save bonus vs. disease", () => {
  it("2 + 2*floor((unlevel-3)/3) — 2 at L3, 4 at L6, 6 at L9, 8 at L12", () => {
    const id = "investigator:forensic-physician:disease-lore:3";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["disease"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(2);
    expect(at(6)).toBe(4);
    expect(at(9)).toBe(6);
    expect(at(12)).toBe(8);
  });

  it("Medical Expertise grants an unconditional Heal bonus", () => {
    const id = "investigator:forensic-physician:medical-expertise:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.hea");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 6 } })).toBe(3);
  });
});

describe("Gravedigger: Deny Death uncapped save bonus vs. death effects", () => {
  it("scales 2/4/6/8 at L2/5/8/11, holds at 8 beyond", () => {
    const id = "investigator:gravedigger:deny-death:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["death"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
    expect(at(11)).toBe(8);
    expect(at(20)).toBe(8);
  });
});

describe("Guardian of Immortality: Desert Survivor's fire-resistance clause", () => {
  it("resist fire 10 only from 5th level on", () => {
    const id = "investigator:guardian-of-immortality:desert-survivor:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("eres.fire");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 2 } })).toBe(0);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 5 } })).toBe(10);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 20 } })).toBe(10);
  });

  it("Guardian's Gaze grants an unconditional Sense Motive bonus", () => {
    const id = "investigator:guardian-of-immortality:guardian-s-gaze:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 4 } })).toBe(2);
  });

  it("Orchid's Drop grants a flat +1 alchemical bonus to all saving throws", () => {
    const id = "investigator:guardian-of-immortality:orchid-s-drop:11";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.type).toBe("alchemical");
    expect(evaluateFormula(change!.formula, {})).toBe(1);
  });
});

describe("Infiltrator: Guileful Lore stacks Wisdom modifier onto Bluff and Diplomacy", () => {
  it("adds Wis mod to both skills, unconditionally", () => {
    const id = "investigator:infiltrator:guileful-lore:1";
    const [blf, dip] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(dip!.target).toBe("skill.dip");
    expect(evaluateFormula(blf!.formula, { abilities: { wis: { mod: 3 } } })).toBe(3);
    expect(evaluateFormula(dip!.formula, { abilities: { wis: { mod: -1 } } })).toBe(-1);
  });
});

describe("Jinyiwei: Celestial Insight save bonus vs. enchantment and illusion", () => {
  it("+1 at L3, +2 at L6, capped +6 at L18", () => {
    const id = "investigator:jinyiwei:celestial-insight:3";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.type).toBe("competence");
    expect(change!.saveCategories).toEqual(["enchantment", "illusion"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
    expect(at(18)).toBe(6);
    expect(at(20)).toBe(6);
  });

  it("Suspicious Mind grants an unconditional Sense Motive bonus", () => {
    const id = "investigator:jinyiwei:suspicious-mind:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 3 } })).toBe(1);
  });
});

describe("Lamplighter: Ready for the Revelation's 12th-level init bonus", () => {
  it("+Int mod to init only from 12th on", () => {
    const id = "investigator:lamplighter:ready-for-the-revelation:3";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("init");
    expect(
      evaluateFormula(change!.formula, { class: { unlevel: 6 }, abilities: { int: { mod: 4 } } }),
    ).toBe(0);
    expect(
      evaluateFormula(change!.formula, { class: { unlevel: 12 }, abilities: { int: { mod: 4 } } }),
    ).toBe(4);
    expect(
      evaluateFormula(change!.formula, { class: { unlevel: 12 }, abilities: { int: { mod: -1 } } }),
    ).toBe(-1);
  });
});

describe("Lepidstadt Inspector: Interrogation and Keen Mind", () => {
  it("Interrogation grants an unconditional Sense Motive bonus", () => {
    const id = "investigator:lepidstadt-inspector:interrogation:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 2 } })).toBe(1);
  });

  it("Keen Mind grants matching Perception and Will-save bonuses on a 3-tier schedule", () => {
    const id = "investigator:lepidstadt-inspector:keen-mind:3";
    const [per, will] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(per!.target).toBe("skill.per");
    expect(will!.target).toBe("will");
    const at = (level: number) => evaluateFormula(per!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(9)).toBe(2);
    expect(at(15)).toBe(3);
    expect(evaluateFormula(will!.formula, { class: { unlevel: 9 } })).toBe(2);
  });
});

describe("Natural Philosopher: Herbalism's Craft (alchemy) competence bonus", () => {
  it("equals class level, using the established skill.crf.alchemy convention", () => {
    const id = "investigator:natural-philosopher:herbalism:3";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.crf.alchemy");
    expect(change!.type).toBe("competence");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 7 } })).toBe(7);
  });
});

describe("Profiler: Expert Profiler grants an unconditional Sense Motive bonus", () => {
  it("max(1, floor(unlevel/2))", () => {
    const id = "investigator:profiler:expert-profiler:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 1 } })).toBe(1);
  });
});

describe("Questioner: Know-It-All bonus to every Knowledge subskill", () => {
  it("min(6, 1+floor((unlevel-2)/3)) targets skill.knowledge (fans out to every k** subskill)", () => {
    const id = "investigator:questioner:know-it-all:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.knowledge");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(5)).toBe(2);
    expect(at(17)).toBe(6);
    expect(at(20)).toBe(6);
  });
});

describe("Ruthless Agent: Enhanced Intimidation grants an unconditional Intimidate bonus", () => {
  it("max(1, floor(unlevel/2))", () => {
    const id = "investigator:ruthless-agent:enhanced-intimidation:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.int");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 3 } })).toBe(1);
  });
});

describe("Spiritualist: Strong Life save bonus vs. death effects", () => {
  it("+2 at L2, +4 at L5, +6 at L8 and beyond (negative-energy-damage clause not modeled)", () => {
    const id = "investigator:spiritualist:strong-life:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["death"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
  });
});

describe("Star Watcher: Starfinding grants an unconditional Knowledge (geography) bonus", () => {
  it("max(1, floor(unlevel/2))", () => {
    const id = "investigator:star-watcher:starfinding:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.kge");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 4 } })).toBe(2);
  });
});

describe("Tekritanin Arbiter: Poison Resistance (gate-delayed) and Tekritanin", () => {
  it("Poison Resistance holds at +4 from its 5th-level gate, +6 from 8th", () => {
    const id = "investigator:tekritanin-arbiter:poison-resistance:5";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["poison"]);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 5 } })).toBe(4);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 8 } })).toBe(6);
  });

  it("Tekritanin grants an unconditional Linguistics bonus", () => {
    const id = "investigator:tekritanin-arbiter:tekritanin:1";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.lin");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 2 } })).toBe(1);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through investigator's tables when explicitly given as overrides", () => {
  it("falls back to the investigator extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "investigator:guardian-of-immortality:guardian-s-gaze:2",
      {},
      INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.sen");
  });

  it("returns undefined for an investigator feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "investigator:sleuth:sleuth-s-luck:1",
        {},
        INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "investigator:cipher:tenuous-threat:5",
        {},
        INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: inspiration-pool basis/size divergences and missing SAVE_CATEGORIES entries", () => {
  it("Jinyiwei's Divine Inspiration swaps the pool's ability-score basis (Int -> Wis) — recorded as blocked, not backfilled", () => {
    const entry =
      INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION["investigator:jinyiwei:divine-inspiration:1"];
    expect(entry?.bucket).toBe("blocked");
    expect(
      INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED["investigator:jinyiwei:divine-inspiration:1"],
    ).toBeUndefined();
  });

  it("the real vendored Inspiration class feature carries a real uses.maxFormula keyed to Intelligence (confirms the divergence risk)", () => {
    const inspiration = Object.values(ref.classFeatures).find((f) => f.name === "Inspiration");
    expect(inspiration?.uses?.maxFormula).toBe(
      "max(1, @abilities.int.mod + floor(@class.unlevel / 2))",
    );
  });

  it("no SAVE_CATEGORIES entry exists for drug addiction or teleportation, so those scaling-save features are blocked rather than mis-extracted", () => {
    for (const id of [
      "investigator:hallucinist:drug-resistance:2",
      "investigator:portal-seeker:resist-teleportation:2",
    ]) {
      expect(INVESTIGATOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("Cipher: Null Aura flat save bonus vs. divination", () => {
  it("+4 on all saves against divination spells/SLAs/effects, unconditional at every level", () => {
    const id = "investigator:cipher:null-aura:4";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["divination"]);
    expect(evaluateFormula(change!.formula, {})).toBe(4);
  });
});

describe("Profiler: Divination Analysis scaling save bonus vs. divinations", () => {
  it("+1 at L2, +2 at L5, +3 at L8 and beyond (caster-level/extract-duration and inspiration clauses not modeled)", () => {
    const id = "investigator:profiler:divination-analysis:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["divination"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(1);
    expect(at(5)).toBe(2);
    expect(at(8)).toBe(3);
    expect(at(20)).toBe(3);
  });
});

describe("Tekritanin Arbiter: Hidden Meaning scaling save bonus vs. language-dependent effects", () => {
  it("+2 at L2, +4 at L5, +6 at L8 and beyond (11th-level immunity not modeled)", () => {
    const id = "investigator:tekritanin-arbiter:hidden-meaning:2";
    const [change] = INVESTIGATOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.saveCategories).toEqual(["languageDependent"]);
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(4);
    expect(at(8)).toBe(6);
    expect(at(11)).toBe(6);
  });
});
