import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED,
  CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/cavalier.js";

/**
 * The cavalier slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: cavalier's aggregator wiring (`archetype-extracted/index.ts`)
 * is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that
 * every archetypeId/name this file references actually exists in the real
 * vendored data slice, same posture as `archetypeExtractedMagus.test.ts`.
 *
 * Unlike magus, cavalier covers ALL 37 vendored cavalier archetypes (190
 * features) — the archetype dataset wasn't repointed mid-pass the way
 * magus's was, so there's no "originally audited" subset caveat here.
 */
const ref = loadRefData();

function archetypeId(name: string): string {
  const entry = Object.values(ref.archetypes).find(
    (a) => a.name === name && a.classTag === "cavalier",
  );
  if (!entry) throw new Error(`cavalier archetype not found: ${name}`);
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

describe("CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every feature of every vendored cavalier archetype exactly once", () => {
    const cavalierArchetypeIds = new Set(
      Object.values(ref.archetypes)
        .filter((a) => a.classTag === "cavalier")
        .map((a) => a.id),
    );
    expect(cavalierArchetypeIds.size).toBe(37);

    const cavalierFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("cavalier:"))
      .map((f) => f.id);
    expect(cavalierFeatureIds.length).toBe(190);
    for (const id of cavalierFeatureIds) {
      expect(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(190);

    // Every classified archetypeId is a real, resolvable cavalier archetype.
    for (const entry of Object.values(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      expect(cavalierArchetypeIds.has(entry.archetypeId), entry.archetypeId).toBe(true);
    }
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(9);
    for (const id of numericIds) {
      expect(CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("bucket counts sum to the full 190-feature audit", () => {
    const counts = { numeric: 0, situational: 0, subsystem: 0, blocked: 0 };
    for (const entry of Object.values(CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket]++;
    }
    expect(counts.numeric).toBe(9);
    expect(counts.situational).toBe(60);
    expect(counts.subsystem).toBe(114);
    expect(counts.blocked).toBe(7);
    expect(counts.numeric + counts.situational + counts.subsystem + counts.blocked).toBe(190);
  });
});

describe("CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED: provenance is verbatim vendored text", () => {
  it("every provenance is a substring of the vendored (HTML-stripped, whitespace-squashed) description", () => {
    for (const [id, entry] of Object.entries(CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED)) {
      const feature = ref.archetypeFeatures[id];
      expect(feature, `unknown vendored archetype feature id ${id}`).toBeDefined();
      const description = strippedDescription(feature!.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${feature!.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });
});

describe("Charger: Courser grants the vendored barbarian Fast Movement condition", () => {
  it("archetype exists in the vendored data", () => {
    expect(archetypeId("Charger")).toBe("cavalier:charger");
  });

  it("+10 land speed while no/light/medium armor and not carrying a heavy load", () => {
    const id = "cavalier:charger:courser:4";
    const [landSpeed] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(landSpeed!.target).toBe("landSpeed");
    expect(landSpeed!.type).toBe("base");
    const at = (armorType: number, encLevel: number) =>
      evaluateFormula(landSpeed!.formula, {
        armor: { type: armorType },
        attributes: { encumbrance: { level: encLevel } },
      });
    expect(at(0, 0)).toBe(10); // unarmored, unencumbered
    expect(at(2, 1)).toBe(10); // medium armor, medium load
    expect(at(3, 0)).toBe(0); // heavy armor disqualifies
    expect(at(0, 2)).toBe(0); // heavy load disqualifies
  });
});

describe("Constable: Apprehend grants a scaling Perception bonus (maneuver-specific CMB half dropped)", () => {
  it("no bonus below 2nd level, +1 at 2nd, +2 at 7th, +3 at 12th, +4 at 17th", () => {
    const id = "cavalier:constable:apprehend:1";
    const [per] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(per!.target).toBe("skill.per");
    const at = (level: number) => evaluateFormula(per!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(0);
    expect(at(2)).toBe(1);
    expect(at(6)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(12)).toBe(3);
    expect(at(17)).toBe(4);
    expect(at(20)).toBe(4);
  });
});

describe("Courtly Knight: Social Presence grants a scaling bonus on four named skills", () => {
  it("+1 at 1st, +2 at 4th, capped at +6 from 20th on", () => {
    const id = "cavalier:courtly-knight:social-presence:1";
    const changes = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const targets = changes.map((ch) => ch.target).sort();
    expect(targets).toEqual(["skill.blf", "skill.dip", "skill.int", "skill.sen"]);
    const at = (level: number) =>
      evaluateFormula(changes[0]!.formula, { class: { unlevel: level } });
    expect(at(1)).toBe(1);
    expect(at(4)).toBe(2);
    expect(at(8)).toBe(3);
    expect(at(20)).toBe(6);
    expect(at(24)).toBe(6); // clamps even past the level cap
    // Every one of the four skills scales identically.
    for (const ch of changes) {
      expect(evaluateFormula(ch.formula, { class: { unlevel: 12 } })).toBe(4);
    }
  });
});

describe("Daring Champion: Nimble grants a scaling dodge AC bonus while light/unarmored and lightly loaded or less", () => {
  it("+1 at 3rd, scaling to +5 at 19th, zeroed by armor or load", () => {
    const id = "cavalier:daring-champion:nimble:3";
    const [ac] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(ac!.type).toBe("dodge");
    const at = (level: number, armorType: number, encLevel: number) =>
      evaluateFormula(ac!.formula, {
        class: { unlevel: level },
        armor: { type: armorType },
        attributes: { encumbrance: { level: encLevel } },
      });
    expect(at(3, 0, 0)).toBe(1);
    expect(at(7, 0, 0)).toBe(2);
    expect(at(19, 0, 0)).toBe(5);
    expect(at(19, 2, 0)).toBe(0); // medium armor disqualifies
    expect(at(19, 0, 1)).toBe(0); // medium load disqualifies
  });
});

describe("Ghost Rider: Fearless grants unconditional fear immunity", () => {
  it("immEffect.fear = 1, unconditionally", () => {
    const id = "cavalier:ghost-rider:fearless:3";
    const [fear] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(fear!.target).toBe("immEffect.fear");
    expect(evaluateFormula(fear!.formula, {})).toBe(1);
  });
});

describe("Green Knight: Indestructible grants +6 Con and death-effect immunity", () => {
  it("both changes are flat and unconditional", () => {
    const id = "cavalier:green-knight:indestructible:20";
    const changes = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const con = changes.find((ch) => ch.target === "con");
    const death = changes.find((ch) => ch.target === "immEffect.deathEffects");
    expect(evaluateFormula(con!.formula, {})).toBe(6);
    expect(evaluateFormula(death!.formula, {})).toBe(1);
  });
});

describe("Green Knight: Oaken Vitality grants disease and poison immunity (infestation dropped)", () => {
  it("both changes are flat and unconditional", () => {
    const id = "cavalier:green-knight:oaken-vitality:11";
    const changes = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    const disease = changes.find((ch) => ch.target === "immEffect.disease");
    const poison = changes.find((ch) => ch.target === "immEffect.poison");
    expect(evaluateFormula(disease!.formula, {})).toBe(1);
    expect(evaluateFormula(poison!.formula, {})).toBe(1);
  });
});

describe("Herald Squire: Fleet of Foot grants the vendored barbarian Fast Movement condition", () => {
  it("+10 land speed while no/light/medium armor and not carrying a heavy load", () => {
    const id = "cavalier:herald-squire:fleet-of-foot:2";
    const [landSpeed] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(landSpeed!.target).toBe("landSpeed");
    expect(landSpeed!.type).toBe("base");
    const at = (armorType: number, encLevel: number) =>
      evaluateFormula(landSpeed!.formula, {
        armor: { type: armorType },
        attributes: { encumbrance: { level: encLevel } },
      });
    expect(at(1, 0)).toBe(10); // light armor
    expect(at(3, 0)).toBe(0); // heavy armor disqualifies
  });
});

describe("Spellscar Drifter: Spell Severed grants SR scaled off character level, not cavalier level", () => {
  it("10 + @attributes.hd.total", () => {
    const id = "cavalier:spellscar-drifter:spell-severed:12";
    const [sr] = CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(sr!.target).toBe("spellResist");
    expect(evaluateFormula(sr!.formula, { attributes: { hd: { total: 12 } } })).toBe(22);
    expect(evaluateFormula(sr!.formula, { attributes: { hd: { total: 20 } } })).toBe(30);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through cavalier's tables when explicitly given as overrides", () => {
  it("falls back to the cavalier extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "cavalier:ghost-rider:fearless:3",
      {},
      CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("immEffect.fear");
  });

  it("returns undefined for a cavalier feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "cavalier:emissary:bonus-feat:6",
        {},
        CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "cavalier:huntmaster:hunting-pack:1",
        {},
        CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("blocked bucket: Bonus Feat reflavors that double-count the base Bonus Feat (CAV) grant", () => {
  it("the real vendored Bonus Feat (CAV) class feature carries a live bonusFeats Change (unlike magus's Arcane-Pool-shaped traps, cavalier has an actual baseline to double against)", () => {
    const bonusFeat = Object.values(ref.classFeatures).find((f) => f.name === "Bonus Feat (CAV)");
    expect(bonusFeat?.changes).toEqual([
      { formula: "floor(@class.unlevel / 6)", target: "bonusFeats", type: "untyped" },
    ]);
  });

  it("Emissary's Bonus feat restates the identical cadence unpaired — blocked, not backfilled", () => {
    const entry = CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION["cavalier:emissary:bonus-feat:6"];
    expect(entry?.bucket).toBe("blocked");
    expect(CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED["cavalier:emissary:bonus-feat:6"]).toBeUndefined();
  });

  it("Gendarme's Bonus Feat claims to replace the base grant with no pairedBaseFeatureUuid — also blocked", () => {
    const entry = CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION["cavalier:gendarme:bonus-feat:1"];
    expect(entry?.bucket).toBe("blocked");
    const feature = ref.archetypeFeatures["cavalier:gendarme:bonus-feat:1"];
    expect(feature?.pairedBaseFeatureUuid).toBeUndefined();
  });

  it("Strategist's Tactician reschedules the vendored resource's own daily-use cadence — blocked, same class of trap as pool sizing", () => {
    const tactician = Object.values(ref.classFeatures).find((f) => f.name === "Tactician");
    expect(tactician?.uses?.maxFormula).toBe("1 + floor(@class.unlevel / 5)");
    const entry = CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION["cavalier:strategist:tactician:1"];
    expect(entry?.bucket).toBe("blocked");
  });
});
