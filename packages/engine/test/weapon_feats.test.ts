/**
 * Tests for Weapon Focus and Weapon Specialization feat effects.
 *
 * Design: `weapon-focus` emits `attack.weapon.<group>` (+1 untyped) and
 * `weapon-specialization` emits `damage.weapon.<group>` (+2 untyped).
 * `computeWeaponAttacks` runs forTarget for those group-specific targets when
 * a weapon has a matching group, so the bonus appears only on that weapon.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

/**
 * Minimal doc: Fighter L4 (satisfies Weapon Specialization's Fighter-4
 * prereq in real PF1, though we don't hard-enforce it) with configurable
 * weapons + feat choices.
 */
function makeDoc(over: {
  weapons?: WeaponInstance[];
  feats?: string[];
  featChoices?: Record<string, string>;
  extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "weapon-feat-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test Fighter",
      race: raceId("Human"),
      classes: [{ tag: "fighter", level: 4 }],
    },
    // Abilities all 10 → no ability mod contribution; isolates feat effects.
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: over.feats ?? [],
      featChoices: over.featChoices,
      extraFeats: over.extraFeats,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: over.weapons ?? [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

// Fighter L4 has BAB = 4 (high progression). All abilities = 10 → mod 0.
// Baseline attack on a longsword (group "longsword") = BAB(4) + STR(0) = 4.

const longsword: WeaponInstance = {
  name: "Longsword",
  attackAbility: "str",
  damageDice: "1d8",
  group: "longsword",
  category: "melee",
};

const dagger: WeaponInstance = {
  name: "Dagger",
  attackAbility: "str",
  damageDice: "1d4",
  group: "dagger",
  category: "melee",
};

// ─── Weapon Focus ─────────────────────────────────────────────────────────────

describe("Weapon Focus (longsword)", () => {
  const wfId = featId("Weapon Focus");

  it("adds +1 to attack with the chosen weapon type", () => {
    const base = makeDoc({ weapons: [longsword] });
    const withFeat = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
  });

  it("does NOT add +1 to a weapon of a different group", () => {
    // Weapon Focus (longsword) should not affect the dagger.
    const base = makeDoc({ weapons: [longsword, dagger] });
    const withFeat = makeDoc({
      weapons: [longsword, dagger],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Longsword gets +1; dagger stays the same.
    expect(featSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
    expect(featSheet.attacks[1]!.attack.total).toBe(baseSheet.attacks[1]!.attack.total);
  });

  it("gives +0 when no choice is set (never crashes)", () => {
    const base = makeDoc({ weapons: [longsword] });
    const withFeatNoChoice = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      // featChoices intentionally absent
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeatNoChoice, ref);
    expect(featSheet.attacks[0]!.attack.total).toBe(baseSheet.attacks[0]!.attack.total);
  });

  it("gives +0 when the choice does not match the weapon's group", () => {
    // Choosing "greataxe" when you only have a longsword: no bonus.
    const base = makeDoc({ weapons: [longsword] });
    const withFeat = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      featChoices: { [wfId]: "greataxe" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.attacks[0]!.attack.total).toBe(baseSheet.attacks[0]!.attack.total);
  });

  it("Weapon Focus component appears in provenance for the matching weapon", () => {
    const doc = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const sheet = compute(doc, ref);
    const comps = sheet.attacks[0]!.attack.components;
    const wfComp = comps.find((c) => c.source === "Weapon Focus");
    expect(wfComp?.value).toBe(1);
    expect(wfComp?.applied).toBe(true);
  });

  it("does not affect the base melee attack line (group-specific target only)", () => {
    const base = makeDoc({ weapons: [longsword] });
    const withFeat = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Base melee attack (sheet.attack.melee) does not read group-specific targets.
    expect(featSheet.attack.melee.total).toBe(baseSheet.attack.melee.total);
  });
});

// ─── Weapon Specialization ───────────────────────────────────────────────────

describe("Weapon Specialization (longsword)", () => {
  const wsId = featId("Weapon Specialization");

  it("adds +2 to damage with the chosen weapon type", () => {
    const base = makeDoc({ weapons: [longsword] });
    const withFeat = makeDoc({
      weapons: [longsword],
      feats: [wsId],
      featChoices: { [wsId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(
      2,
    );
  });

  it("does NOT add +2 damage to a weapon of a different group", () => {
    const base = makeDoc({ weapons: [longsword, dagger] });
    const withFeat = makeDoc({
      weapons: [longsword, dagger],
      feats: [wsId],
      featChoices: { [wsId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Longsword gets +2 damage; dagger is unchanged.
    expect(featSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(
      2,
    );
    expect(featSheet.attacks[1]!.damageBonus.total).toBe(baseSheet.attacks[1]!.damageBonus.total);
  });

  it("gives +0 damage when no choice is set", () => {
    const base = makeDoc({ weapons: [longsword] });
    const withFeatNoChoice = makeDoc({
      weapons: [longsword],
      feats: [wsId],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeatNoChoice, ref);
    expect(featSheet.attacks[0]!.damageBonus.total).toBe(baseSheet.attacks[0]!.damageBonus.total);
  });

  it("Weapon Specialization component appears in damage provenance", () => {
    const doc = makeDoc({
      weapons: [longsword],
      feats: [wsId],
      featChoices: { [wsId]: "longsword" },
    });
    const sheet = compute(doc, ref);
    const comps = sheet.attacks[0]!.damageBonus.components;
    const wsComp = comps.find((c) => c.source === "Weapon Specialization");
    expect(wsComp?.value).toBe(2);
    expect(wsComp?.applied).toBe(true);
  });
});

// ─── Both feats together ─────────────────────────────────────────────────────

describe("Weapon Focus + Weapon Specialization together", () => {
  it("stacks both bonuses on the matching weapon", () => {
    const wfId = featId("Weapon Focus");
    const wsId = featId("Weapon Specialization");
    const base = makeDoc({ weapons: [longsword] });
    const withBoth = makeDoc({
      weapons: [longsword],
      feats: [wfId, wsId],
      featChoices: { [wfId]: "longsword", [wsId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withBoth, ref);
    expect(featSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
    expect(featSheet.attacks[0]!.damageBonus.total - baseSheet.attacks[0]!.damageBonus.total).toBe(
      2,
    );
  });
});

// ─── Two Weapon Focus instances, two different weapons (issue #58) ──────────

describe("Weapon Focus taken twice for two different weapons (issue #58)", () => {
  it("the primary instance (longsword) and an extraFeats instance (dagger) each buff only their own weapon", () => {
    const wfId = featId("Weapon Focus");
    const base = makeDoc({ weapons: [longsword, dagger] });
    const withBoth = makeDoc({
      weapons: [longsword, dagger],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
      extraFeats: [{ instanceId: "feat-2", featId: wfId, choiceId: "dagger" }],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withBoth, ref);
    // Longsword (primary instance's choice) gets +1...
    expect(featSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
    // ...and dagger (the extra instance's choice) ALSO gets +1, independently.
    expect(featSheet.attacks[1]!.attack.total - baseSheet.attacks[1]!.attack.total).toBe(1);
  });

  it("provenance shows two distinct Weapon Focus components, one per instance", () => {
    const wfId = featId("Weapon Focus");
    const doc = makeDoc({
      weapons: [longsword, dagger],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
      extraFeats: [{ instanceId: "feat-2", featId: wfId, choiceId: "dagger" }],
    });
    const sheet = compute(doc, ref);
    const longswordComp = sheet.attacks[0]!.attack.components.find(
      (c) => c.source === "Weapon Focus",
    );
    const daggerComp = sheet.attacks[1]!.attack.components.find((c) => c.source === "Weapon Focus");
    expect(longswordComp?.value).toBe(1);
    expect(daggerComp?.value).toBe(1);
    // Different sourceId per instance — the primary's is the feat id, the
    // extra instance's is its own instanceId (never collapsed together).
    expect(longswordComp?.sourceId).toBe(wfId);
    expect(daggerComp?.sourceId).toBe("feat-2");
  });

  it("an extra instance with NO choice stored yet contributes nothing (never crashes)", () => {
    const wfId = featId("Weapon Focus");
    const base = makeDoc({ weapons: [longsword] });
    const withFeat = makeDoc({
      weapons: [longsword],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
      extraFeats: [{ instanceId: "feat-2", featId: wfId }],
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // Only the primary's +1 applies; the choiceless extra instance adds nothing.
    expect(featSheet.attacks[0]!.attack.total - baseSheet.attacks[0]!.attack.total).toBe(1);
  });
});

// ─── Weapon with no group ─────────────────────────────────────────────────────

describe("weapon with no group set", () => {
  it("Weapon Focus does not crash or affect a weapon with no group", () => {
    const wfId = featId("Weapon Focus");
    const noGroupWeapon: WeaponInstance = {
      name: "Improvised",
      attackAbility: "str",
      damageDice: "1d4",
      // group deliberately absent
    };
    const base = makeDoc({ weapons: [noGroupWeapon] });
    const withFeat = makeDoc({
      weapons: [noGroupWeapon],
      feats: [wfId],
      featChoices: { [wfId]: "longsword" },
    });
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.attacks[0]!.attack.total).toBe(baseSheet.attacks[0]!.attack.total);
  });
});
