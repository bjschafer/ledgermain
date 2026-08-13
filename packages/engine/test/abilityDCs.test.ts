/**
 * Hand-computed fixture tests for `DerivedSheet.abilityDCs` (`ability-dcs.ts`)
 * — the character's own enemy-facing ability DCs: witch/shaman hex, channel
 * energy (and its cleric/paladin/warpriest/antipaladin reflavors), alchemist
 * bomb, antipaladin cruelty, mesmerist trick, Stunning Fist, Quivering Palm.
 * Every fixture goes through the full `compute()` pipeline (not
 * `computeAbilityDCs` directly) so the `targets.ts`/`compute.ts` wiring is
 * exercised too, matching the cookbook's `oracleMysteryCurse.test.ts` style.
 */

import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, resolveSaveDCText, saveDCContext } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human, `classes` as given, abilities defaulting to 10 with `abilities` overrides. */
function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: Partial<Record<AbilityId, number>>;
  feats?: string[];
  activeBuffs?: { instanceId: string; name: string; changes: unknown[] }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "ability-dc-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: HUMAN, classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: over.feats ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: over.activeBuffs ?? [],
      resources: {},
    },
  } as CharacterDoc;
}

function feat(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

describe("hex DC", () => {
  it("witch 6, Int 18 (+4) -> Hex DC 17 (APG: 10 + 1/2 witch level + Int mod)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "witch", level: 6 }], abilities: { int: 18 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([{ key: "hex", label: "Hex DC", dc: 17 }]);
  });

  it("shaman hexes start at 2nd level, not 1st (ACG class-feature table)", () => {
    const l1 = compute(
      makeDoc({ classes: [{ tag: "shaman", level: 1 }], abilities: { wis: 16 } }),
      ref,
    );
    expect(l1.abilityDCs).toBeUndefined();

    // Shaman 4, Wis 16 (+3): 10 + 2 + 3 = 15.
    const l4 = compute(
      makeDoc({ classes: [{ tag: "shaman", level: 4 }], abilities: { wis: 16 } }),
      ref,
    );
    expect(l4.abilityDCs).toEqual([{ key: "hex", label: "Hex DC", dc: 15 }]);
  });

  it("a witch/shaman multiclass gets two disambiguated hex lines", () => {
    // Witch 6, Int 18 (+4) -> 17. Shaman 4, Wis 16 (+3) -> 15.
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "witch", level: 6 },
          { tag: "shaman", level: 4 },
        ],
        abilities: { int: 18, wis: 16 },
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "hex", label: "Hex DC (Witch)", dc: 17 },
      { key: "hex", label: "Hex DC (Shaman)", dc: 15 },
    ]);
  });
});

describe("channel energy DC", () => {
  it("cleric 5, Cha 14 (+2) -> DC 14 (CRB: 10 + 1/2 cleric level + Cha mod)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "cleric", level: 5 }], abilities: { cha: 14 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 14, save: "Will" },
    ]);
  });

  it("paladin's Channel Positive Energy (4th level) uses the same DC shape", () => {
    // Paladin 8, Cha 16 (+3): 10 + 4 + 3 = 17. Below 4th level, no channel line.
    const l3 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 3 }], abilities: { cha: 16 } }),
      ref,
    );
    expect(l3.abilityDCs).toBeUndefined();

    const l8 = compute(
      makeDoc({ classes: [{ tag: "paladin", level: 8 }], abilities: { cha: 16 } }),
      ref,
    );
    expect(l8.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 17, save: "Will" },
    ]);
  });

  it("warpriest's Channel Energy (WAR) is Wisdom-based, not Charisma", () => {
    // Warpriest 8, Wis 18 (+4), Cha 6 (-2): 10 + 4 + 4 = 18 (Wis), proving the
    // vendored-dcFormula-reuse design actually keys off the right ability
    // rather than a hand-authored Cha-only formula.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "warpriest", level: 8 }],
        abilities: { wis: 18, cha: 6 },
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 18, save: "Will" },
    ]);
  });
});

describe("bomb DC", () => {
  it("alchemist 5, Int 16 (+3) -> DC 15 (APG: 10 + 1/2 alchemist level + Int mod)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "alchemist", level: 5 }], abilities: { int: 16 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([{ key: "bomb", label: "Bomb DC", dc: 15, save: "Reflex" }]);
  });
});

describe("cruelty DC", () => {
  it("cruelties aren't selectable (and no DC line shows) below 3rd level", () => {
    const l2 = compute(
      makeDoc({ classes: [{ tag: "antipaladin", level: 2 }], abilities: { cha: 16 } }),
      ref,
    );
    expect(l2.abilityDCs).toBeUndefined();
  });

  it("antipaladin 8, Cha 18 (+4) -> DC 18 (APG: 10 + 1/2 antipaladin level + Cha mod)", () => {
    // An antipaladin also gets Channel Negative Energy at 4th level (same
    // Cha-based DC shape), so both lines show at level 8.
    const sheet = compute(
      makeDoc({ classes: [{ tag: "antipaladin", level: 8 }], abilities: { cha: 18 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "channel", label: "Channel Energy DC", dc: 18, save: "Will" },
      { key: "cruelty", label: "Cruelty DC", dc: 18, save: "Fortitude" },
    ]);
  });
});

describe("mesmerist trick DC", () => {
  it("mesmerist 7, Cha 16 (+3) -> DC 16 (OA: 10 + 1/2 mesmerist level + Cha mod)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "mesmerist", level: 7 }], abilities: { cha: 16 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "mesmeristTrick", label: "Mesmerist Trick DC", dc: 16 },
    ]);
  });
});

describe("Stunning Fist DC", () => {
  it("monk-only: DC keys off monk level (== character level here)", () => {
    // Monk 5, Wis 16 (+3): 10 + 2 + 3 = 15.
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 5 }], abilities: { wis: 16 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 15, save: "Fortitude" },
    ]);
  });

  it("multiclass monk: DC keys off TOTAL character level, not just monk level", () => {
    // Fighter 3 / Monk 5 = character level 8, Wis 16 (+3): 10 + 4 + 3 = 17 —
    // NOT the vendored class feature's own @class.unlevel-based 10+2+3=15.
    const sheet = compute(
      makeDoc({
        classes: [
          { tag: "fighter", level: 3 },
          { tag: "monk", level: 5 },
        ],
        abilities: { wis: 16 },
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 17, save: "Fortitude" },
    ]);
  });

  it("unchained monk grants Stunning Fist too (CLASS_ALIASES pairing)", () => {
    // Monk (Unchained) 5, Wis 14 (+2): 10 + 2 + 2 = 14.
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monkUnchained", level: 5 }], abilities: { wis: 14 } }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 14, save: "Fortitude" },
    ]);
  });

  it("a non-monk with the Stunning Fist feat gets the line too, off character level", () => {
    // Fighter 9 (feat, no monk levels), Wis 14 (+2): 10 + 4 + 2 = 16.
    const sheet = compute(
      makeDoc({
        classes: [{ tag: "fighter", level: 9 }],
        abilities: { wis: 14 },
        feats: [feat("Stunning Fist")],
      }),
      ref,
    );
    expect(sheet.abilityDCs).toEqual([
      { key: "stunningFist", label: "Stunning Fist DC", dc: 16, save: "Fortitude" },
    ]);
  });
});

describe("Quivering Palm DC", () => {
  it("absent below chained-monk 15th level", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 14 }], abilities: { wis: 18 } }),
      ref,
    );
    expect(sheet.abilityDCs?.some((d) => d.key === "quiveringPalm")).toBe(false);
  });

  it("chained monk 15, Wis 18 (+4) -> DC 21 (CRB: 10 + 1/2 monk level + Wis mod)", () => {
    // 10 + floor(15/2) + 4 = 10 + 7 + 4 = 21.
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monk", level: 15 }], abilities: { wis: 18 } }),
      ref,
    );
    const qp = sheet.abilityDCs?.find((d) => d.key === "quiveringPalm");
    expect(qp).toEqual({
      key: "quiveringPalm",
      label: "Quivering Palm DC",
      dc: 21,
      save: "Fortitude",
    });
  });

  it("unchained monk 15 gets no automatic Quivering Palm line (it's an optional ki power there)", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "monkUnchained", level: 15 }], abilities: { wis: 18 } }),
      ref,
    );
    expect(sheet.abilityDCs?.some((d) => d.key === "quiveringPalm")).toBe(false);
  });
});

describe("abilityDC.<family> Change-target modifiers", () => {
  it("an untyped +1 buff on abilityDC.hex raises the Hex DC by 1", () => {
    const doc = makeDoc({
      classes: [{ tag: "witch", level: 6 }],
      abilities: { int: 18 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "Test Buff",
          changes: [{ formula: "1", target: "abilityDC.hex", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.abilityDCs).toEqual([{ key: "hex", label: "Hex DC", dc: 18 }]);
  });

  it("two same-typed +2 bonuses to abilityDC.hex stack to +2, not +4 (typed-bonus stacking)", () => {
    const doc = makeDoc({
      classes: [{ tag: "witch", level: 6 }],
      abilities: { int: 18 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "First Profane Source",
          changes: [{ formula: "2", target: "abilityDC.hex", type: "profane" }],
        },
        {
          instanceId: "b2",
          name: "Second Profane Source",
          changes: [{ formula: "2", target: "abilityDC.hex", type: "profane" }],
        },
      ],
    });
    const sheet = compute(doc, ref);
    // Base 17 + 2 (highest-of-two same-typed "profane" bonuses) = 19, not 21.
    expect(sheet.abilityDCs).toEqual([{ key: "hex", label: "Hex DC", dc: 19 }]);
  });

  it("a witch/shaman multiclass's abilityDC.hex modifier raises BOTH hex lines (no per-instance scoping in v1)", () => {
    const doc = makeDoc({
      classes: [
        { tag: "witch", level: 6 },
        { tag: "shaman", level: 4 },
      ],
      abilities: { int: 18, wis: 16 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "Test Buff",
          changes: [{ formula: "1", target: "abilityDC.hex", type: "untyped" }],
        },
      ],
    });
    const sheet = compute(doc, ref);
    expect(sheet.abilityDCs).toEqual([
      { key: "hex", label: "Hex DC (Witch)", dc: 18 },
      { key: "hex", label: "Hex DC (Shaman)", dc: 16 },
    ]);
  });
});

describe("three-shape: unknown class / stale state / no families", () => {
  it("a fighter with none of the seven families gets `abilityDCs` omitted entirely", () => {
    const sheet = compute(makeDoc({ classes: [{ tag: "fighter", level: 10 }] }), ref);
    expect(sheet.abilityDCs).toBeUndefined();
  });

  it("a stale/unresolvable feat id in build.feats doesn't crash and grants no Stunning Fist line", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "fighter", level: 10 }], feats: ["not-a-real-feat-id"] }),
      ref,
    );
    expect(sheet.abilityDCs).toBeUndefined();
  });

  it("a non-witch caster (sorcerer) with no hex levels produces no hex line", () => {
    const sheet = compute(
      makeDoc({ classes: [{ tag: "sorcerer", level: 10 }], abilities: { int: 20 } }),
      ref,
    );
    expect(sheet.abilityDCs).toBeUndefined();
  });
});

describe("feature-save-dc.ts family substitution stays consistent with the panel", () => {
  it("a witch hex contextNote reflects an abilityDC.hex modifier, matching the panel", () => {
    const doc = makeDoc({
      classes: [{ tag: "witch", level: 9 }],
      abilities: { int: 20 },
      activeBuffs: [
        {
          instanceId: "b1",
          name: "Test Buff",
          changes: [{ formula: "1", target: "abilityDC.hex", type: "untyped" }],
        },
      ],
    });
    const withHexes: CharacterDoc = {
      ...doc,
      build: { ...doc.build, witchHexes: ["evilEye"] } as CharacterDoc["build"],
    };
    const sheet = compute(withHexes, ref);
    // Base 10 + 4 + 5 = 19, +1 from the buff = 20 — matches the panel line.
    expect(sheet.abilityDCs).toEqual([{ key: "hex", label: "Hex DC", dc: 20 }]);
    const evilEye = sheet.classFeatures.find((f) => f.name === "Evil Eye");
    expect(evilEye?.contextNotes?.[0]?.text).toContain("DC 20");
  });

  it("resolveSaveDCText prefers familyDCs over recomputing when both are given", () => {
    const doc = makeDoc({ classes: [{ tag: "witch", level: 9 }], abilities: { int: 20 } });
    const ctx = saveDCContext(doc, compute(doc, ref).abilities, { hex: 99 });
    expect(resolveSaveDCText("DC = 10 + 1/2 witch level + Int mod", ctx)).toBe("DC 99");
  });

  it("without familyDCs, resolveSaveDCText falls back to the plain formula (backward compatible)", () => {
    const doc = makeDoc({ classes: [{ tag: "witch", level: 9 }], abilities: { int: 20 } });
    const ctx = saveDCContext(doc, compute(doc, ref).abilities);
    expect(resolveSaveDCText("DC = 10 + 1/2 witch level + Int mod", ctx)).toBe("DC 19");
  });
});
