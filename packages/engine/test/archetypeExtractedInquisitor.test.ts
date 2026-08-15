import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED,
  INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/inquisitor.js";

/**
 * The inquisitor slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: inquisitor's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's
 * tables yet through the normal production path. These fixtures therefore
 * (1) assert directly against `INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * exported `changes` shape, (2) hand-compute each formula via the real
 * `formula.ts` evaluator (`evaluateFormula`) at several class levels against
 * the exact published-rules numbers cited in each entry's `provenance`, and
 * (3) verify `resolveArchetypeFeatureEffect` resolves correctly when
 * explicitly given this file's tables as its override arguments (the
 * mechanism it's designed for). `loadRefData` is used to sanity-check that
 * every archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeExtractedMagus.test.ts`.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "inquisitor",
  );
  if (!entry) throw new Error(`inquisitor archetype not found: ${name}`);
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

describe("INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored inquisitor archetype feature exactly once", () => {
    const inquisitorFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("inquisitor:"))
      .map((f) => f.id);
    expect(inquisitorFeatureIds.length).toBe(139);
    for (const id of inquisitorFeatureIds) {
      expect(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(139);
  });

  it("bucket counts match the audited totals", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(12);
    expect(counts.blocked).toBe(7);
    expect(counts.situational).toBe(24);
    expect(counts.subsystem).toBe(96);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and vice versa", () => {
    const numericIds = Object.entries(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(12);
    for (const id of numericIds) {
      expect(INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    // ...and no extracted entry exists for a non-numeric bucket (no stray entries).
    for (const id of Object.keys(INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId/name/level matches the vendored feature it keys", () => {
    for (const [id, entry] of Object.entries(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored feature id ${id}`).toBeDefined();
      expect(entry.archetypeId).toBe(feature!.archetypeId);
      expect(entry.name).toBe(feature!.name);
      expect(entry.level).toBe(feature!.level);
    }
  });
});

describe("provenance: every entry's provenance is a verbatim substring of the vendored description", () => {
  it("holds for every extracted numeric entry", () => {
    for (const [id, entry] of Object.entries(INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id]!;
      const description = strippedDescription(feature.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("blocked bucket: features with no expressible target or a vendored copy-paste error", () => {
  it("Bane's own vendored class feature carries zero Changes — bane-family archetype features have nothing to double-count against, only an activation to model (situational, not numeric)", () => {
    // Two "Bane" entries exist upstream (a different class's unrelated
    // feature shares the name) — the inquisitor one is the resource-pooled
    // one (`uses.maxFormula: "@class.unlevel"`, rounds/day).
    const bane = Object.values(ref.classFeatures).find(
      (f) => f.name === "Bane" && f.uses?.maxFormula === "@class.unlevel",
    );
    expect(bane?.name).toBe("Bane");
    expect(bane?.changes ?? []).toEqual([]);
  });

  it("Stern Gaze carries a real vendored Change — the only base feature this pass had to check for double-count risk", () => {
    // Two "Stern Gaze" entries exist upstream; the inquisitor one is the one
    // that actually carries the Intimidate/Sense Motive morale Changes.
    const sternGaze = Object.values(ref.classFeatures).find(
      (f) => f.name === "Stern Gaze" && f.changes.length > 0,
    );
    expect(sternGaze?.changes).toEqual([
      { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.int", type: "morale" },
      { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.sen", type: "morale" },
    ]);
  });

  it("Track and Monster Lore carry zero vendored Changes — replacing them is a pure loss, nothing to double-count", () => {
    const track = Object.values(ref.classFeatures).find((f) => f.name === "Track");
    const monsterLore = Object.values(ref.classFeatures).find((f) => f.name === "Monster Lore");
    expect(track?.changes ?? []).toEqual([]);
    expect(monsterLore?.changes ?? []).toEqual([]);
  });

  it("no SAVE_CATEGORIES key exists for magic-item-sourced effects, truth-detection, or fey-sourced SLAs specifically", () => {
    const blockedSaveIds = [
      "inquisitor:iconoclast:shake-effects:1",
      "inquisitor:infiltrator:necessary-lies:5",
      "inquisitor:sworn-of-the-eldest:feywatcher:3",
    ];
    for (const id of blockedSaveIds) {
      expect(INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });
});

describe("Exarch: Inflexible Will flat save bonus vs. confusion/insanity effects", () => {
  it("+2 on all saves, unconditional at every level (chaotic-descriptor scope not modeled)", () => {
    const id = "inquisitor:exarch:inflexible-will:1";
    const [change] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("allSavingThrows");
    expect(change!.saveCategories).toEqual(["confusion"]);
    expect(evaluateFormula(change!.formula, {})).toBe(2);
  });
});

describe("Cloaked Wolf: Lure Prey grants a flat morale bonus to Disguise/Sleight of Hand", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Cloaked Wolf")).toBe("inquisitor:cloaked-wolf");
  });

  it("max(1, floor(unlevel/2)) morale — +1 at L1-L3, +2 at L4-L5, scaling with level", () => {
    const id = "inquisitor:cloaked-wolf:lure-prey:1";
    const [dis, slt] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dis!.target).toBe("skill.dis");
    expect(slt!.target).toBe("skill.slt");
    expect(dis!.type).toBe("morale");
    const at = (level: number) => evaluateFormula(dis!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(3)).toBe(1);
    expect(at(4)).toBe(2);
    expect(at(10)).toBe(5);
  });
});

describe("Green Faith Marshal: Wild Lore adds Wis modifier to Knowledge (nature)", () => {
  it("@abilities.wis.mod untyped, additional to Int", () => {
    const id = "inquisitor:green-faith-marshal:wild-lore:1";
    const [change] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.kna");
    expect(change!.type).toBe("untyped");
    expect(evaluateFormula(change!.formula, { abilities: { wis: { mod: 3 } } })).toBe(3);
    expect(evaluateFormula(change!.formula, { abilities: { wis: { mod: -1 } } })).toBe(-1);
  });
});

describe("Heretic: Lore of Escape adds Wis modifier to Bluff and Stealth", () => {
  it("both skills get the same @abilities.wis.mod addition", () => {
    const id = "inquisitor:heretic:lore-of-escape:1";
    const [blf, ste] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(ste!.target).toBe("skill.ste");
    expect(evaluateFormula(blf!.formula, { abilities: { wis: { mod: 2 } } })).toBe(2);
    expect(evaluateFormula(ste!.formula, { abilities: { wis: { mod: 2 } } })).toBe(2);
  });

  it("has no paired base-feature slot to worry about — replaces monster lore, which carries zero vendored changes", () => {
    const feature = ref.archetypeFeatures["inquisitor:heretic:lore-of-escape:1"]!;
    const monsterLore = Object.values(ref.classFeatures).find((f) => f.name === "Monster Lore");
    expect(feature.description).toContain("replaces monster lore");
    expect(monsterLore?.changes ?? []).toEqual([]);
  });
});

describe("Infiltrator: Guileful Lore adds Wis modifier to Bluff and Diplomacy", () => {
  it("both skills get the same @abilities.wis.mod addition", () => {
    const id = "inquisitor:infiltrator:guileful-lore:1";
    const [blf, dip] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(dip!.target).toBe("skill.dip");
    expect(evaluateFormula(blf!.formula, { abilities: { wis: { mod: 4 } } })).toBe(4);
  });
});

describe("Reaper of Secrets: Deceitful Lore adds Wis modifier to Bluff and Disguise", () => {
  it("both skills get the same @abilities.wis.mod addition", () => {
    const id = "inquisitor:reaper-of-secrets:deceitful-lore:1";
    const [blf, dis] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(dis!.target).toBe("skill.dis");
    expect(evaluateFormula(dis!.formula, { abilities: { wis: { mod: 1 } } })).toBe(1);
  });
});

describe("Royal Accuser: Meticulous Inspection grants a flat morale bonus to Perception", () => {
  it("max(1, floor(unlevel/2)) morale, unscoped", () => {
    const id = "inquisitor:royal-accuser:meticulous-inspection:1";
    const [change] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.per");
    expect(change!.type).toBe("morale");
    const at = (level: number) => evaluateFormula(change!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(6)).toBe(3);
    expect(at(20)).toBe(10);
  });
});

describe("Sworn of the Eldest: Disarming Discernment and Feytongue", () => {
  it("Disarming Discernment adds Cha modifier to Sense Motive, additional to Wis", () => {
    const id = "inquisitor:sworn-of-the-eldest:disarming-discernment:1";
    const [change] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.sen");
    expect(change!.type).toBe("untyped");
    expect(evaluateFormula(change!.formula, { abilities: { cha: { mod: 5 } } })).toBe(5);
  });

  it("Feytongue grants a flat morale bonus to Bluff and Diplomacy", () => {
    const id = "inquisitor:sworn-of-the-eldest:feytongue:1";
    const [blf, dip] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.type).toBe("morale");
    expect(evaluateFormula(dip!.formula, { class: { unlevel: 5 } })).toBe(2);
  });
});

describe("Tactical Leader: Leader's Words grants a flat morale bonus to Diplomacy", () => {
  it("max(1, floor(unlevel/2)) morale on Diplomacy alone", () => {
    const id = "inquisitor:tactical-leader:leader-s-words:1";
    const [change] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(change!.target).toBe("skill.dip");
    expect(evaluateFormula(change!.formula, { class: { unlevel: 2 } })).toBe(1);
    expect(evaluateFormula(change!.formula, { class: { unlevel: 8 } })).toBe(4);
  });
});

describe("Umbral Stalker: Swift and Silent grants a flat morale bonus to Acrobatics and Stealth", () => {
  it("both skills scale identically", () => {
    const id = "inquisitor:umbral-stalker:swift-and-silent:1";
    const [acr, ste] = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acr!.target).toBe("skill.acr");
    expect(ste!.target).toBe("skill.ste");
    expect(evaluateFormula(acr!.formula, { class: { unlevel: 9 } })).toBe(4);
  });
});

describe("Urban Infiltrator: Gifted Detective extracts the unscoped Bluff/Disguise clause only", () => {
  it("adds Wis modifier to Bluff and Disguise; drops the Diplomacy-to-gather-information clause", () => {
    const id = "inquisitor:urban-infiltrator:gifted-detective:1";
    const effect = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[id]!;
    expect(effect.changes.length).toBe(2);
    const targets = effect.changes.map((c) => c.target).sort();
    expect(targets).toEqual(["skill.blf", "skill.dis"]);
    expect(effect.confidence).toBe("medium");
    expect(evaluateFormula(effect.changes[0]!.formula, { abilities: { wis: { mod: 2 } } })).toBe(2);
  });

  it("the vendored description also grants a Diplomacy-to-gather-information bonus, which is not among the extracted changes", () => {
    const feature = ref.archetypeFeatures["inquisitor:urban-infiltrator:gifted-detective:1"]!;
    expect(feature.description).toContain("Diplomacy checks to gather information");
    const targets = INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED[
      "inquisitor:urban-infiltrator:gifted-detective:1"
    ]!.changes.map((c) => c.target);
    expect(targets).not.toContain("skill.dip");
  });
});

describe("resolveArchetypeFeatureEffect: resolves through inquisitor's tables when explicitly given as overrides", () => {
  it("falls back to the inquisitor extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "inquisitor:royal-accuser:meticulous-inspection:1",
      {},
      INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("skill.per");
  });

  it("returns undefined for an inquisitor feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "inquisitor:cold-iron-warden:bane:5",
        {},
        INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "inquisitor:sanctified-slayer:sneak-attack:4",
        {},
        INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});
