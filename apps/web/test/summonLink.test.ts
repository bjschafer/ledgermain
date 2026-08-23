/**
 * summonLink model tests: spell-name detection (roman numerals, apostrophe
 * variants, non-summon spells), owned-feat slug detection, and the built
 * href's shape.
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addClass, createEmptyDoc, setClassLevel, toggleFeat } from "../src/model/doc.js";
import { detectSummonSpell, summonFeatSlugs, summonHelperHref } from "../src/model/summonLink.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function wizardWith(...featNames: string[]): CharacterDoc {
  let doc = setClassLevel(addClass(createEmptyDoc("t"), "wizard"), "wizard", 20);
  for (const n of featNames) doc = toggleFeat(doc, featId(n));
  return doc;
}

describe("detectSummonSpell", () => {
  it("detects Summon Monster I through IX", () => {
    for (let level = 1; level <= 9; level++) {
      const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][level - 1];
      expect(detectSummonSpell(`Summon Monster ${roman}`)).toEqual({ list: "sm", level });
    }
  });

  it("detects Summon Nature's Ally I through IX, straight or curly apostrophe", () => {
    expect(detectSummonSpell("Summon Nature's Ally III")).toEqual({ list: "sna", level: 3 });
    expect(detectSummonSpell("Summon Nature’s Ally III")).toEqual({ list: "sna", level: 3 });
  });

  it("matches case-insensitively", () => {
    expect(detectSummonSpell("summon monster iv")).toEqual({ list: "sm", level: 4 });
  });

  it("returns null for unrelated spells and near misses", () => {
    expect(detectSummonSpell("Fireball")).toBeNull();
    expect(detectSummonSpell("Summon Monster")).toBeNull();
    expect(detectSummonSpell("Summon Monster X")).toBeNull();
    expect(detectSummonSpell("Summon Swarm")).toBeNull();
  });
});

describe("summonFeatSlugs", () => {
  it("is empty for a character with neither feat", () => {
    const doc = wizardWith("Toughness");
    expect(summonFeatSlugs(doc, ref)).toEqual([]);
  });

  it("includes augment-summoning and superior-summoning when owned", () => {
    const doc = wizardWith("Augment Summoning", "Superior Summoning");
    expect(summonFeatSlugs(doc, ref)).toEqual(["augment-summoning", "superior-summoning"]);
  });

  it("includes only the feat actually owned", () => {
    const doc = wizardWith("Augment Summoning");
    expect(summonFeatSlugs(doc, ref)).toEqual(["augment-summoning"]);
  });
});

describe("summonHelperHref", () => {
  it("always includes cl, and omits feats when empty", () => {
    const href = summonHelperHref({ list: "sm", level: 3 }, [], 7);
    expect(href).toBe("https://ref.ledgermain.whizkid.dev/#/summon/sm/3?cl=7");
  });

  it("includes feats when present, in the given order", () => {
    const href = summonHelperHref(
      { list: "sm", level: 3 },
      ["augment-summoning", "superior-summoning"],
      7,
    );
    expect(href).toBe(
      "https://ref.ledgermain.whizkid.dev/#/summon/sm/3?feats=augment-summoning%2Csuperior-summoning&cl=7",
    );
  });

  it("builds the sna variant", () => {
    expect(summonHelperHref({ list: "sna", level: 1 }, [], 1)).toBe(
      "https://ref.ledgermain.whizkid.dev/#/summon/sna/1?cl=1",
    );
  });
});
