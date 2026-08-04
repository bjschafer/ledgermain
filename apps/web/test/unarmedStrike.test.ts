/**
 * Unit tests for `model/unarmedStrike.ts` — the synthesized unarmed strike
 * weapon entry (there is no compendium weapon to pick), its damage die, and
 * the level-up staleness check.
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  UNARMED_STRIKE_GROUP,
  isUnarmedStrike,
  staleUnarmedDamage,
  unarmedStrikeMeta,
  unarmedStrikeSource,
  unarmedStrikeWeapon,
} from "../src/model/unarmedStrike.js";

const ref = loadRefData();

const HUMAN = "e6IaBxKgMxy1yKlr";
const HALFLING = "Hf31mrYb3uucNyLO";

function character(classes: { tag: string; level: number }[], race: string = HUMAN): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, race, classes } };
}

describe("unarmedStrikeSource", () => {
  it("reads the class table for a brawler", () => {
    const src = unarmedStrikeSource(character([{ tag: "brawler", level: 5 }]), ref);
    expect(src).toMatchObject({ className: "Brawler", level: 5, dieLabel: "1d8" });
  });

  it("reads the same table for a monk", () => {
    const src = unarmedStrikeSource(character([{ tag: "monk", level: 8 }]), ref);
    expect(src).toMatchObject({ className: "Monk", dieLabel: "1d10" });
  });

  it("uses the Small column for a halfling brawler", () => {
    const src = unarmedStrikeSource(character([{ tag: "brawler", level: 5 }], HALFLING), ref);
    expect(src.dieLabel).toBe("1d6");
  });

  it("takes the highest level rather than summing monk and brawler", () => {
    const src = unarmedStrikeSource(
      character([
        { tag: "brawler", level: 3 },
        { tag: "monk", level: 2 },
      ]),
      ref,
    );
    expect(src).toMatchObject({ level: 3, dieLabel: "1d6" });
  });

  it("falls back to the base 1d3, nonlethal, with no class or feat", () => {
    const src = unarmedStrikeSource(character([{ tag: "fighter", level: 6 }]), ref);
    expect(src).toMatchObject({ level: 0, dieLabel: "1d3", nonlethal: true });
    expect(src.className).toBeUndefined();
  });

  it("base damage steps down for a Small character", () => {
    const src = unarmedStrikeSource(character([{ tag: "fighter", level: 1 }], HALFLING), ref);
    expect(src.dieLabel).toBe("1d2");
  });
});

describe("unarmedStrikeWeapon", () => {
  it("is proficient, Str to hit and damage, tagged for the feat pickers", () => {
    const w = unarmedStrikeWeapon(character([{ tag: "brawler", level: 5 }]), ref);
    expect(w).toEqual({
      name: "Unarmed Strike",
      attackAbility: "str",
      damageAbility: "str",
      damageDice: "1d8",
      group: UNARMED_STRIKE_GROUP,
      category: "melee",
    });
    // No `proficiency`: the engine reads that as "nothing to be non-proficient
    // with", which is what keeps a monk off the -4.
    expect(w.proficiency).toBeUndefined();
  });

  it("carries an amulet of mighty fists as an enhancement bonus", () => {
    const w = unarmedStrikeWeapon(character([{ tag: "monk", level: 4 }]), ref, 2);
    expect(w).toMatchObject({ name: "Unarmed Strike +2", enhancement: 2 });
  });
});

describe("unarmedStrikeMeta", () => {
  it("names the class driving the die", () => {
    const meta = unarmedStrikeMeta(
      unarmedStrikeSource(character([{ tag: "brawler", level: 5 }]), ref),
    );
    expect(meta).toContain("1d8");
    expect(meta).toContain("Brawler 5");
  });

  it("warns that a strike is nonlethal without Improved Unarmed Strike", () => {
    const meta = unarmedStrikeMeta(
      unarmedStrikeSource(character([{ tag: "fighter", level: 1 }]), ref),
    );
    expect(meta).toContain("nonlethal");
  });
});

describe("staleUnarmedDamage", () => {
  const doc = character([{ tag: "brawler", level: 8 }]);
  const entry = (damageDice: string, group = UNARMED_STRIKE_GROUP): WeaponInstance => ({
    name: "Unarmed Strike",
    attackAbility: "str",
    damageDice,
    group,
    category: "melee",
  });

  it("reports the die a levelled-up brawler should be showing", () => {
    expect(staleUnarmedDamage(entry("1d8"), doc, ref)).toBe("1d10");
  });

  it("says nothing when the entry is already right", () => {
    expect(staleUnarmedDamage(entry("1d10"), doc, ref)).toBeUndefined();
  });

  it("leaves other weapons alone", () => {
    expect(staleUnarmedDamage(entry("1d8", "longsword"), doc, ref)).toBeUndefined();
  });

  it("matches the tag case-insensitively", () => {
    expect(isUnarmedStrike(entry("1d10", "Unarmed Strike"))).toBe(true);
  });
});
