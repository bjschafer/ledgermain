import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { evaluateFormula, resolveArchetypeFeatureEffect } from "../src/index.js";
import {
  ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
  ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION,
} from "../src/archetype-extracted/rogueUnchained.js";

/**
 * The Rogue (Unchained) slice of the prose->Change extraction pipeline.
 *
 * TEST APPROACH: rogueUnchained's aggregator wiring (`archetype-extracted/
 * index.ts`) is a later integration step this pass doesn't touch, so
 * `resolveArchetypeFeatureEffect`/`compute` do NOT pick up this file's tables
 * yet through the normal production path. These fixtures therefore (1) assert
 * directly against `ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED`'s exported
 * `changes` shape, (2) hand-compute each formula via the real `formula.ts`
 * evaluator (`evaluateFormula`) at several class levels against the exact
 * published-rules numbers cited in each entry's `provenance`, and (3) verify
 * `resolveArchetypeFeatureEffect` resolves correctly when explicitly given
 * this file's tables as its override arguments (the mechanism it's designed
 * for — see its doc comment). `loadRefData` is used to sanity-check that
 * every archetypeId this file references actually exists in the real
 * vendored data slice, same posture as `archetypeEffectsExtracted.test.ts`.
 */
const ref = loadRefData();

describe("ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: coverage", () => {
  it("covers every vendored rogueUnchained: archetype feature exactly once", () => {
    const rogueUnchainedFeatureIds = Object.values(ref.archetypeFeatures)
      .filter((f) => f.archetypeId.startsWith("rogueUnchained:"))
      .map((f) => f.id);
    expect(rogueUnchainedFeatureIds.length).toBe(257);
    for (const id of rogueUnchainedFeatureIds) {
      expect(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]).toBeDefined();
    }
    expect(Object.keys(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION).length).toBe(257);
  });

  it("buckets total 257 with the measured counts (numeric 32 / situational 48 / subsystem 173 / blocked 4)", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      counts[entry.bucket] = (counts[entry.bucket] ?? 0) + 1;
    }
    expect(counts["numeric"]).toBe(32);
    expect(counts["situational"]).toBe(48);
    expect(counts["subsystem"]).toBe(173);
    expect(counts["blocked"]).toBe(4);
  });

  it("every numeric-bucket classification entry has a matching extracted-effects entry, and no stray entries exist", () => {
    const numericIds = Object.entries(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)
      .filter(([, entry]) => entry.bucket === "numeric")
      .map(([id]) => id);
    expect(numericIds.length).toBe(32);
    for (const id of numericIds) {
      expect(ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeDefined();
    }
    for (const id of Object.keys(ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
      expect(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("numeric");
    }
  });

  it("every classification entry's archetypeId exists in the vendored data as a rogueUnchained archetype", () => {
    for (const [id, entry] of Object.entries(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION)) {
      const archetype = ref.archetypes[entry.archetypeId];
      expect(archetype, `${id}: archetype ${entry.archetypeId} not found`).toBeDefined();
      expect(archetype?.classTag).toBe("rogueUnchained");
    }
  });
});

describe("blocked bucket: sneak attack reprints and the Roof Runner class mismatch", () => {
  it("the three Sneak Attack archetype-feature rows are byte-identical to the base description, not a real change", () => {
    const baseSneakAttack = Object.values(ref.classFeatures).find((f) => f.name === "Sneak Attack");
    expect(baseSneakAttack).toBeDefined();
    expect(baseSneakAttack?.changes).toEqual([]);
    for (const id of [
      "rogueUnchained:carnivalist:sneak-attack:2",
      "rogueUnchained:eldritch-scoundrel:sneak-attack:3",
      "rogueUnchained:snare-setter:sneak-attack:5",
    ]) {
      expect(ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[id]?.bucket).toBe("blocked");
      expect(ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]).toBeUndefined();
    }
  });

  it("Roof Runner's Master Climber is blocked (verified against aonprd.com: it's Hunter's Roof Runner content, not a real rogue ability)", () => {
    // aonprd.com's Hunter Roof Runner archetype (ArchetypeDisplay.aspx?
    // FixedName=Hunter+Roof+Runner) has the 20th-level Master Climber that
    // matches this entry's text verbatim; aonprd.com's Rogue Roof Runner
    // archetype (PZO1118, Pathfinder Society Field Guide) has only two
    // features total (Roof Running 1st, Tumbling Descent 2nd) and no
    // 20th-level ability at all. Nothing to backfill.
    const entry =
      ROGUE_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION[
        "rogueUnchained:roof-runner:master-climber:20"
      ];
    expect(entry?.bucket).toBe("blocked");
    expect(
      ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED["rogueUnchained:roof-runner:master-climber:20"],
    ).toBeUndefined();
  });

  it("Trapfinding carries a real vendored skill.dev change, unlike every other rogueUnchained base feature", () => {
    const trapfinding = Object.values(ref.classFeatures).find(
      (f) => f.name === "Trapfinding" && (f.changes?.length ?? 0) > 0,
    );
    expect(trapfinding?.changes).toEqual([
      { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.dev", type: "untyped" },
    ]);
  });
});

describe("Acrobat: Expert Acrobat grants a competence bonus only when fully unarmored", () => {
  it("if(eq(armor.type,0), 2, 0) — +2 at armor.type 0, +0 at armor.type 1+", () => {
    const id = "rogueUnchained:acrobat:expert-acrobat:1";
    const [acr, fly] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(evaluateFormula(acr!.formula, { armor: { type: 0 } })).toBe(2);
    expect(evaluateFormula(acr!.formula, { armor: { type: 1 } })).toBe(0);
    expect(evaluateFormula(fly!.formula, { armor: { type: 0 } })).toBe(2);
  });
});

describe("Bekyar Kidnapper: Abductor grants maneuver-scoped cmb/cmd vs. grapple", () => {
  it("+1 at L3, +2 at L6, cmb attempting/cmd resisting grapple", () => {
    const id = "rogueUnchained:bekyar-kidnapper:abductor:3";
    const [cmbChange, cmdChange] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(cmbChange!.target).toBe("cmb");
    expect(cmbChange!.maneuverCategories).toEqual(["grapple"]);
    expect(cmdChange!.target).toBe("cmd");
    expect(cmdChange!.maneuverCategories).toEqual(["grapple"]);
    const at = (level: number) =>
      evaluateFormula(cmbChange!.formula, { class: { unlevel: level } });
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
  });
});

describe("Dark Lurker: Instinctual Sense grants flat blindsight", () => {
  it("30 ft., unconditional", () => {
    const id = "rogueUnchained:dark-lurker:instinctual-sense:20";
    const [sense] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(sense!.target).toBe("sensebs");
    expect(evaluateFormula(sense!.formula, {})).toBe(30);
  });
});

describe("Discretion Specialist: Fast Talker — max(1, floor(unlevel/2)) on three skills", () => {
  it("+1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:discretion-specialist:fast-talker:1";
    const changes = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(changes.map((c) => c.target)).toEqual(["skill.blf", "skill.dip", "skill.int"]);
    for (const ch of changes) {
      expect(evaluateFormula(ch.formula, { class: { unlevel: 1 } })).toBe(1);
      expect(evaluateFormula(ch.formula, { class: { unlevel: 10 } })).toBe(5);
    }
  });
});

describe("Escapologist: Elusive — max(1, floor(unlevel/2)) on Disable Device and Escape Artist", () => {
  it("+1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:escapologist:elusive:1";
    const [dev, esc] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dev!.target).toBe("skill.dev");
    expect(esc!.target).toBe("skill.esc");
    expect(evaluateFormula(dev!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(dev!.formula, { class: { unlevel: 10 } })).toBe(5);
    expect(evaluateFormula(esc!.formula, { class: { unlevel: 10 } })).toBe(5);
  });

  it("has no paired base-feature slot conflict — Trapfinding's own skill.dev change is suppressed by the swap", () => {
    const feature = Object.values(ref.archetypeFeatures).find(
      (f) => f.id === "rogueUnchained:escapologist:elusive:1",
    );
    expect(feature).toBeDefined();
  });
});

describe("Fey Prankster: Mischievous Talent — max(1, floor(unlevel/2)) on four skills", () => {
  it("+1 at L1, +3 at L6", () => {
    const id = "rogueUnchained:fey-prankster:mischievous-talent:1";
    const changes = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(changes.map((c) => c.target)).toEqual([
      "skill.blf",
      "skill.dis",
      "skill.slt",
      "skill.ste",
    ]);
    for (const ch of changes) {
      expect(evaluateFormula(ch.formula, { class: { unlevel: 1 } })).toBe(1);
      expect(evaluateFormula(ch.formula, { class: { unlevel: 6 } })).toBe(3);
    }
  });
});

describe("Filcher: Rummage — floor(unlevel/3) Appraise", () => {
  it("+1 at L3, +3 at L9", () => {
    const id = "rogueUnchained:filcher:rummage:3";
    const [apr] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(apr!.target).toBe("skill.apr");
    expect(evaluateFormula(apr!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(apr!.formula, { class: { unlevel: 6 } })).toBe(2);
    expect(evaluateFormula(apr!.formula, { class: { unlevel: 9 } })).toBe(3);
  });
});

describe("Kintargo Rebel: Sophisticated Stealth — Knowledge (nobility) only", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +3 at L9", () => {
    const id = "rogueUnchained:kintargo-rebel:sophisticated-stealth:3";
    const [kno] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(kno!.target).toBe("skill.kno");
    expect(evaluateFormula(kno!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(kno!.formula, { class: { unlevel: 9 } })).toBe(3);
  });
});

describe("Kitsune Trickster: Kitsune's Guile — flat Int modifier on four skills", () => {
  it("adds int.mod unconditionally", () => {
    const id = "rogueUnchained:kitsune-trickster:kitsune-s-guile:1";
    const changes = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(changes.map((c) => c.target)).toEqual([
      "skill.blf",
      "skill.dip",
      "skill.dis",
      "skill.sen",
    ]);
    for (const ch of changes) {
      expect(evaluateFormula(ch.formula, { abilities: { int: { mod: 3 } } })).toBe(3);
      expect(evaluateFormula(ch.formula, { abilities: { int: { mod: -1 } } })).toBe(-1);
    }
  });
});

describe("Master of Disguise: Consummate Actor — Disguise only", () => {
  it("max(1, floor(unlevel/2)) — +1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:master-of-disguise:consummate-actor:1";
    const [dis] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dis!.target).toBe("skill.dis");
    expect(evaluateFormula(dis!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(dis!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Needler: Adroit Poisoner — base Sleight of Hand bonus, poison-draw rider dropped", () => {
  it("+2 below L8, +4 at L8+", () => {
    const id = "rogueUnchained:needler:adroit-poisoner:2";
    const [slt] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(slt!.target).toBe("skill.slt");
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 2 } })).toBe(2);
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 7 } })).toBe(2);
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 8 } })).toBe(4);
  });
});

describe("Okeno Liberator: Bond Breaker — Escape Artist, no stated minimum", () => {
  it("floor(unlevel/2) — 0 at L1, +5 at L10", () => {
    const id = "rogueUnchained:okeno-liberator:bond-breaker:1";
    const [esc] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(esc!.target).toBe("skill.esc");
    expect(evaluateFormula(esc!.formula, { class: { unlevel: 1 } })).toBe(0);
    expect(evaluateFormula(esc!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Pirate: Unflinching — saves vs. fear/mind-affecting via saveCategories: ['mind']", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +6 at L18", () => {
    const id = "rogueUnchained:pirate:unflinching:3";
    const [save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.target).toBe("allSavingThrows");
    expect(save!.saveCategories).toEqual(["mind"]);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 18 } })).toBe(6);
  });
});

describe("Rake: Rake's Smile — morale bonus on Bluff and Diplomacy", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +2 at L6", () => {
    const id = "rogueUnchained:rake:rake-s-smile:3";
    const [blf, dip] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.type).toBe("morale");
    expect(dip!.type).toBe("morale");
    expect(evaluateFormula(blf!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(dip!.formula, { class: { unlevel: 6 } })).toBe(2);
  });
});

describe("Relic Raider: Curse Sense — saves vs. curses only (haunts dropped)", () => {
  it("1 below L6, then 2 + floor((unlevel-6)/3) — +1 at L4, +2 at L6, +6 at L18", () => {
    const id = "rogueUnchained:relic-raider:curse-sense:4";
    const [save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.saveCategories).toEqual(["curse"]);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 4 } })).toBe(1);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 6 } })).toBe(2);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 18 } })).toBe(6);
  });
});

describe("River Rat: Rat's Resilience — saves vs. disease/poison", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +6 at L18", () => {
    const id = "rogueUnchained:river-rat:rat-s-resilience:3";
    const [save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.saveCategories).toEqual(["disease", "poison"]);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 18 } })).toBe(6);
  });
});

describe("River Rat: Swamper — Swim bonus gated on being unarmored/light armor", () => {
  it("0 while medium+ armored, max(1,floor(unlevel/2)) while light/unarmored", () => {
    const id = "rogueUnchained:river-rat:swamper:1";
    const [swm] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(swm!.target).toBe("skill.swm");
    expect(evaluateFormula(swm!.formula, { armor: { type: 2 }, class: { unlevel: 10 } })).toBe(0);
    expect(evaluateFormula(swm!.formula, { armor: { type: 1 }, class: { unlevel: 10 } })).toBe(5);
    expect(evaluateFormula(swm!.formula, { armor: { type: 0 }, class: { unlevel: 1 } })).toBe(1);
  });
});

describe("Rotdrinker: Poison Resistance — saves vs. poison", () => {
  it("+2 below L8, +4 at L8+", () => {
    const id = "rogueUnchained:rotdrinker:poison-resistance:2";
    const [save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.saveCategories).toEqual(["poison"]);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 2 } })).toBe(2);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 8 } })).toBe(4);
  });
});

describe("Sanctified Rogue: Divine Purpose — flat sacred Fortitude/Will", () => {
  it("+1 sacred, unconditional", () => {
    const id = "rogueUnchained:sanctified-rogue:divine-purpose:4";
    const [fort, will] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(fort!.target).toBe("fort");
    expect(fort!.type).toBe("sacred");
    expect(will!.target).toBe("will");
    expect(evaluateFormula(fort!.formula, {})).toBe(1);
    expect(evaluateFormula(will!.formula, {})).toBe(1);
  });
});

describe("Sczarni Swindler: No Fool — scaling Will save", () => {
  it("min(5, 1 + floor((unlevel-4)/4)) — +1 at L4, +5 at L20", () => {
    const id = "rogueUnchained:sczarni-swindler:no-fool:4";
    const [will] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(will!.target).toBe("will");
    expect(evaluateFormula(will!.formula, { class: { unlevel: 4 } })).toBe(1);
    expect(evaluateFormula(will!.formula, { class: { unlevel: 20 } })).toBe(5);
  });
});

describe("Sczarni Swindler: Poker Face — Bluff/Profession (gambler)/Sense Motive", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +2 at L6", () => {
    const id = "rogueUnchained:sczarni-swindler:poker-face:3";
    const [blf, pro, sen] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(blf!.target).toBe("skill.blf");
    expect(pro!.target).toBe("skill.pro.gambler");
    expect(sen!.target).toBe("skill.sen");
    expect(evaluateFormula(blf!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(pro!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(sen!.formula, { class: { unlevel: 6 } })).toBe(2);
  });
});

describe("Shadow Scion: Shadow Dweller / Shadow Walker: Expanded Sight — scaling darkvision", () => {
  it("30 + 10*floor((unlevel-1)/2) — 30 at L1, 40 at L3, 120 at L19", () => {
    for (const id of [
      "rogueUnchained:shadow-scion:shadow-dweller:1",
      "rogueUnchained:shadow-walker:expanded-sight:1",
    ]) {
      const [sense] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
      expect(sense!.target).toBe("sensedv");
      expect(evaluateFormula(sense!.formula, { class: { unlevel: 1 } })).toBe(30);
      expect(evaluateFormula(sense!.formula, { class: { unlevel: 3 } })).toBe(40);
      expect(evaluateFormula(sense!.formula, { class: { unlevel: 19 } })).toBe(120);
    }
  });
});

describe("Sharper: Lucky Save — luck bonus on all saving throws", () => {
  it("+1 at L3, +2 at L9, +3 at L15", () => {
    const id = "rogueUnchained:sharper:lucky-save:3";
    const [save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(save!.target).toBe("allSavingThrows");
    expect(save!.type).toBe("luck");
    expect(evaluateFormula(save!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 9 } })).toBe(2);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 15 } })).toBe(3);
  });
});

describe("Sharper: Scam Artist — Bluff/Sleight of Hand", () => {
  it("max(1, floor(unlevel/2)) — +1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:sharper:scam-artist:1";
    const [blf, slt] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(evaluateFormula(blf!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Smuggler: Conceal Item — Sleight of Hand", () => {
  it("max(1, floor(unlevel/2)) — +1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:smuggler:conceal-item:1";
    const [slt] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(slt!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Snare Setter: Trapsmithing — Craft (traps) only (Perception-vs-traps half dropped)", () => {
  it("floor(unlevel/2) — +1 at L2, +5 at L10", () => {
    const id = "rogueUnchained:snare-setter:trapsmithing:1";
    const [crf] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(crf!.target).toBe("skill.crf.traps");
    expect(evaluateFormula(crf!.formula, { class: { unlevel: 2 } })).toBe(1);
    expect(evaluateFormula(crf!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Swamp Poisoner: Mucous Membrane — Escape Artist only (grapple CMD dropped)", () => {
  it("max(1, floor(unlevel/2)) — +1 at L1, +5 at L10", () => {
    const id = "rogueUnchained:swamp-poisoner:mucous-membrane:1";
    const [esc] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(esc!.target).toBe("skill.esc");
    expect(evaluateFormula(esc!.formula, { class: { unlevel: 1 } })).toBe(1);
    expect(evaluateFormula(esc!.formula, { class: { unlevel: 10 } })).toBe(5);
  });
});

describe("Swashbuckler: Daring — morale Acrobatics and morale saves vs. fear, same formula", () => {
  it("1 + floor((unlevel-3)/3) — +1 at L3, +2 at L6", () => {
    const id = "rogueUnchained:swashbuckler:daring:3";
    const [acr, save] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(acr!.target).toBe("skill.acr");
    expect(acr!.type).toBe("morale");
    expect(save!.target).toBe("allSavingThrows");
    expect(save!.saveCategories).toEqual(["fear"]);
    expect(evaluateFormula(acr!.formula, { class: { unlevel: 3 } })).toBe(1);
    expect(evaluateFormula(save!.formula, { class: { unlevel: 6 } })).toBe(2);
  });
});

describe("Sylvan Trickster: Fey Resistance — scaling DR/cold iron", () => {
  it("2 at L8, 4 at L11, 10 at L20", () => {
    const id = "rogueUnchained:sylvan-trickster:fey-resistance:8";
    const [dr] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(dr!.target).toBe("dr.cold-iron");
    expect(evaluateFormula(dr!.formula, { class: { unlevel: 8 } })).toBe(2);
    expect(evaluateFormula(dr!.formula, { class: { unlevel: 11 } })).toBe(4);
    expect(evaluateFormula(dr!.formula, { class: { unlevel: 20 } })).toBe(10);
  });
});

describe("Tidal Trickster: Wisdom of the Waves — swim speed, Swim, and Bluff (underwater Will bonus dropped)", () => {
  // aonprd.com "Tidal Trickster" (Rogue (Unchained) Archetype), Wisdom of the
  // Waves (1st): "A tidal trickster gains a swim speed equal to her
  // unmodified base land speed... she gains a racial bonus on Swim checks
  // equal to 4 + half her rogue level... a bonus on Bluff checks equal to
  // half her rogue level."
  it("swim speed = base land speed via a base/set Change", () => {
    const id = "rogueUnchained:tidal-trickster:wisdom-of-the-waves:1";
    const [swimSpeed] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(swimSpeed!.target).toBe("swimSpeed");
    expect(swimSpeed!.type).toBe("base");
    expect(swimSpeed!.operator).toBe("set");
    expect(
      evaluateFormula(swimSpeed!.formula, { attributes: { speed: { land: { total: 30 } } } }),
    ).toBe(30);
  });

  it("4+floor(unlevel/2) racial Swim, floor(unlevel/2) Bluff", () => {
    const id = "rogueUnchained:tidal-trickster:wisdom-of-the-waves:1";
    const [, swm, blf] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(swm!.target).toBe("skill.swm");
    expect(swm!.type).toBe("racial");
    expect(blf!.target).toBe("skill.blf");
    expect(evaluateFormula(swm!.formula, { class: { unlevel: 6 } })).toBe(7);
    expect(evaluateFormula(blf!.formula, { class: { unlevel: 6 } })).toBe(3);
  });
});

describe("Underground Chemist: Chemical Weapons — Craft (alchemy) only (splash damage dropped)", () => {
  it("floor(unlevel/2) via the crf.alchemy convention", () => {
    const id = "rogueUnchained:underground-chemist:chemical-weapons:2";
    const [crf] = ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED[id]!.changes;
    expect(crf!.target).toBe("skill.crf.alchemy");
    expect(evaluateFormula(crf!.formula, { class: { unlevel: 6 } })).toBe(3);
  });
});

describe("resolveArchetypeFeatureEffect: resolves through rogueUnchained's tables when explicitly given as overrides", () => {
  it("falls back to the extracted table when the verified table is empty", () => {
    const resolved = resolveArchetypeFeatureEffect(
      "rogueUnchained:dark-lurker:instinctual-sense:20",
      {},
      ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
    );
    expect(resolved?.source).toBe("extracted");
    expect(resolved?.confidence).toBe("high");
    expect(resolved?.effect.changes[0]?.target).toBe("sensebs");
  });

  it("returns undefined for a rogueUnchained feature classified subsystem/situational/blocked (no extracted entry)", () => {
    expect(
      resolveArchetypeFeatureEffect(
        "rogueUnchained:acrobat:second-chance:3",
        {},
        ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "rogueUnchained:knife-master:sneak-stab:1",
        {},
        ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
    expect(
      resolveArchetypeFeatureEffect(
        "rogueUnchained:carnivalist:sneak-attack:2",
        {},
        ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED,
      ),
    ).toBeUndefined();
  });
});

describe("ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: provenance", () => {
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

  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of Object.entries(ROGUE_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED)) {
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
