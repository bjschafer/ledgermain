import { describe, expect, it } from "bun:test";

import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import {
  SAVE_DC_PHRASES,
  compute,
  resolveSaveDCText,
  saveDCContext,
  witchHexDC,
} from "../src/index.js";

/**
 * Hand-authored `contextNotes` state a save DC as the rulebook's formula
 * ("DC = 10 + 1/2 witch level + Int mod"); the sheet has to show the number.
 * Expected values below are the published APG hex formula worked by hand:
 * DC = 10 + floor(class level / 2) + ability modifier.
 */

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(over: {
  classes: { tag: string; level: number }[];
  abilities?: Partial<Record<AbilityId, number>>;
  witchHexes?: string[];
}): CharacterDoc {
  return {
    schemaVersion: 2,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: over.classes },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over.abilities },
    build: {
      feats: [],
      skillRanks: {},
      archetypes: [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      ...(over.witchHexes ? { witchHexes: over.witchHexes } : {}),
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("resolveSaveDCText", () => {
  // Witch 9, Int 20 (+5): 10 + floor(9/2) + 5 = 19.
  const witch = makeDoc({ classes: [{ tag: "witch", level: 9 }], abilities: { int: 20 } });
  const ctx = saveDCContext(witch, compute(witch, ref).abilities);

  it("replaces the `DC = <formula>` spelling with the computed number", () => {
    expect(resolveSaveDCText("Will negates; DC = 10 + 1/2 witch level + Int mod.", ctx)).toBe(
      "Will negates; DC 19.",
    );
  });

  it("replaces the parenthetical `DC <formula>` spelling too", () => {
    const ninja = makeDoc({ classes: [{ tag: "ninja", level: 6 }], abilities: { int: 14 } });
    const nctx = saveDCContext(ninja, compute(ninja, ref).abilities);
    // Ninja 6, Int 14 (+2): 10 + 3 + 2 = 15.
    expect(resolveSaveDCText("Save DC = 10 + 1/2 ninja level + Int modifier.", nctx)).toBe(
      "Save DC 15.",
    );
  });

  it("substitutes every occurrence in one note", () => {
    const text =
      "Fort negates; DC = 10 + 1/2 witch level + Int mod. Will negates too; DC = 10 + 1/2 witch level + Int mod.";
    expect(resolveSaveDCText(text, ctx)).toBe("Fort negates; DC 19. Will negates too; DC 19.");
  });

  it("agrees with witchHexDC, the table this formula also lives in", () => {
    expect(resolveSaveDCText("DC = 10 + 1/2 witch level + Int mod", ctx)).toBe(
      `DC ${witchHexDC(9, 5)}`,
    );
  });

  it("leaves the formula alone when the character has no levels in its class", () => {
    const fighter = makeDoc({ classes: [{ tag: "fighter", level: 9 }], abilities: { int: 20 } });
    const fctx = saveDCContext(fighter, compute(fighter, ref).abilities);
    const text = "Will negates; DC = 10 + 1/2 witch level + Int mod.";
    expect(resolveSaveDCText(text, fctx)).toBe(text);
  });

  it("leaves an unrecognized phrasing alone rather than half-parsing it", () => {
    const text = "Will negates; DC = 12 + the phase of the moon.";
    expect(resolveSaveDCText(text, ctx)).toBe(text);
  });

  it("keys 'character level' off total level across a multiclass", () => {
    // Rogue 3 / witch 4 = character level 7, Int 16 (+3): 10 + 3 + 3 = 16.
    const multi = makeDoc({
      classes: [
        { tag: "rogue", level: 3 },
        { tag: "witch", level: 4 },
      ],
      abilities: { int: 16 },
    });
    const mctx = saveDCContext(multi, compute(multi, ref).abilities);
    expect(resolveSaveDCText("(DC 10 + 1/2 character level + Int modifier)", mctx)).toBe("(DC 16)");
  });

  it("resolves a chained/unchained sibling's talent phrasing", () => {
    // An unchained rogue's talent note still says "rogue level".
    // Rogue 8, Int 14 (+2): 10 + 4 + 2 = 16.
    const uc = makeDoc({ classes: [{ tag: "rogueUnchained", level: 8 }], abilities: { int: 14 } });
    const uctx = saveDCContext(uc, compute(uc, ref).abilities);
    expect(resolveSaveDCText("(DC 10 + half rogue level + Intelligence modifier)", uctx)).toBe(
      "(DC 16)",
    );
  });

  it("never lets a shorter phrase shadow a longer one it prefixes", () => {
    // "...+ Int mod" is a prefix of "...+ Int modifier"; both must resolve
    // whole, leaving no orphaned "ifier" behind.
    // Character level 7, Int 18 (+4): 10 + 3 + 4 = 17.
    const multi = makeDoc({ classes: [{ tag: "witch", level: 7 }], abilities: { int: 18 } });
    const mctx = saveDCContext(multi, compute(multi, ref).abilities);
    expect(resolveSaveDCText("DC = 10 + 1/2 character level + Int modifier", mctx)).toBe("DC 17");
  });
});

describe("SAVE_DC_PHRASES covers what the hand-authored tables actually write", () => {
  it("has no duplicate phrases", () => {
    const seen = new Set(SAVE_DC_PHRASES.map((p) => p.phrase));
    expect(seen.size).toBe(SAVE_DC_PHRASES.length);
  });
});

describe("a witch's hex contextNotes reach the sheet with real numbers", () => {
  // Witch 9, Int 20 (+5) -> hex DC 19 (APG: 10 + 1/2 witch level + Int mod).
  const doc = makeDoc({
    classes: [{ tag: "witch", level: 9 }],
    abilities: { int: 20 },
    witchHexes: ["evilEye", "slumber"],
  });
  const sheet = compute(doc, ref);

  it("shows the computed DC, not the formula", () => {
    const slumber = sheet.classFeatures.find((f) => f.name === "Slumber");
    const note = slumber?.contextNotes?.[0]?.text ?? "";
    expect(note).toContain("DC 19");
    expect(note).not.toContain("1/2 witch level");
  });

  it("tracks the final Int modifier, not the raw score", () => {
    // Human's floating +2 pointed at Int: 20 -> 22 (+6), so the hex DC moves
    // 19 -> 20. A DC read off `doc.abilities` alone would stay at 19.
    const withRacial: CharacterDoc = {
      ...doc,
      identity: { ...doc.identity, flexibleAbility: "int" },
    };
    const boosted = compute(withRacial, ref);
    expect(boosted.abilities.int.total).toBe(22);
    const evilEye = boosted.classFeatures.find((f) => f.name === "Evil Eye");
    expect(evilEye?.contextNotes?.[0]?.text).toContain("DC 20");
  });
});
