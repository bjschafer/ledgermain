/**
 * Hand-computed fixture tests for `FEAT_SAVE_CATEGORY_CHANGES`
 * (`feat-save-categories.ts`) — category-scoped save bonuses promoted from
 * vendored feat description text that ships no `Change` of its own. Mirrors
 * `classFeatureSaves.test.ts`'s fixture style (a bare `CharacterDoc` through
 * `compute()`, hand-verified numbers cited against the feat's own vendored
 * text), but exercises the feat collection path: `doc.build.feats` rather
 * than a granted class feature.
 *
 * Every fixture below is a Wizard 1 (`fort: "low"`, `ref: "low"`, `will:
 * "high"` per `RefData.classes.wizard.saves`), all abilities at 10 (no
 * ability-mod contribution), so the headline totals are pure class-tier
 * arithmetic from `saveForLevels` (`tables.ts`): Fort/Ref = floor(1/3) = 0,
 * Will = 2 + floor(1/2) = 2.
 */

import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";
import { featNameSlug } from "../src/feat-effects.js";
import { resolveFeatEffect } from "../src/feat-effects-resolve.js";
import { FEAT_SAVE_CATEGORY_CHANGES } from "../src/feat-save-categories.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

const HUMAN = raceId("Human");

/** Human Wizard 1, all abilities 10, plus whichever feats are under test. */
function makeDoc(feats: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "feat-save-category-test",
    ownerId: "tester",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: HUMAN,
      classes: [{ tag: "wizard", level: 1 }],
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats,
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("FEAT_SAVE_CATEGORY_CHANGES drift guard", () => {
  it("every key names a real feat, and none double-ships an overlapping save-target change", () => {
    const problems: string[] = [];
    const bySlug = new Map<string, string>(); // slug -> feat id, first match wins
    for (const [id, f] of Object.entries(ref.feats)) {
      const slug = featNameSlug(f.name);
      if (!bySlug.has(slug)) bySlug.set(slug, id);
    }

    const saveTargets = new Set(["fort", "ref", "will", "allSavingThrows"]);
    for (const slug of Object.keys(FEAT_SAVE_CATEGORY_CHANGES)) {
      const featIdMatch = bySlug.get(slug);
      if (!featIdMatch) {
        problems.push(`"${slug}" matches no RefData.feats name`);
        continue;
      }
      // A resolveFeatEffect entry emitting a save-target change is only a
      // real double-count risk if it shares a category with this table's own
      // entry for the same slug (or is itself unscoped, i.e. a blanket
      // bonus) — a resolveFeatEffect entry scoped to a DIFFERENT category
      // (e.g. Filth Forager's disease line here, nausea in
      // feat-effects-extracted-community.ts) composes safely, the same
      // additive way this table composes with an unrelated skill bonus.
      const ownCategories = new Set(
        FEAT_SAVE_CATEGORY_CHANGES[slug]?.flatMap((ch) => ch.saveCategories ?? []) ?? [],
      );
      const resolved = resolveFeatEffect(slug);
      if (resolved?.entry.type === "static") {
        for (const ch of resolved.entry.changes) {
          if (!saveTargets.has(ch.target)) continue;
          const otherCategories = ch.saveCategories ?? [];
          const overlaps =
            otherCategories.length === 0 || otherCategories.some((c) => ownCategories.has(c));
          if (overlaps) {
            problems.push(
              `"${slug}" already has a resolveFeatEffect entry emitting an overlapping "${ch.target}" change — would double-count`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("Stoic (Iron Will chain, flat bonus on Will)", () => {
  it("+1 untyped vs. fear at 1st level", () => {
    // "You gain a +1 bonus on all saving throws against fear effects."
    // Wizard 1 Will = 2 + floor(1/2) = 2. Conditional = 2 + 1 = 3.
    const base = makeDoc([]);
    const withFeat = makeDoc([featId("Stoic")]);
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.saves.will.total).toBe(2);
    expect(featSheet.saves.will.total).toBe(baseSheet.saves.will.total); // headline untouched
    expect(featSheet.saves.will.conditionals).toEqual([
      { total: 3, categories: ["fear"], labels: ["fear"] },
    ]);
  });
});

describe("Pure Faith (Fortitude-only category, proves it does not bleed onto Will/Reflex)", () => {
  it("+4 sacred vs. poison at 1st level, Will and Reflex untouched", () => {
    // "You gain a +4 sacred bonus to saving throws against poison." Poison is
    // Fortitude-only per SAVE_CATEGORIES, so Will/Reflex must show no line at
    // all despite the character having the feat.
    // Wizard 1 Fort = floor(1/3) = 0. Conditional = 0 + 4 = 4.
    const withFeat = makeDoc([featId("Pure Faith")]);
    const sheet = compute(withFeat, ref);
    expect(sheet.saves.fort.total).toBe(0);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 4, categories: ["poison"], labels: ["poison"] },
    ]);
    expect(sheet.saves.will.conditionals).toBeUndefined();
    expect(sheet.saves.ref.conditionals).toBeUndefined();
  });
});

describe("Jungle Survivalist (two named categories resolving to one merged line)", () => {
  it("+2 untyped vs. disease and poison at 1st level, one line not two", () => {
    // "You gain a +2 bonus on saving throws against diseases, poisons, and
    // the distraction ability of creatures with the swarm subtype" (the
    // distraction clause names no SAVE_CATEGORIES entry and is left prose).
    // Wizard 1 Fort = 0. Both disease and poison resolve to 0 + 2 = 2, so
    // they collapse into a single line naming both — `poison` sorts first
    // (SAVE_CATEGORY_ORDER), even though the text names disease first.
    const withFeat = makeDoc([featId("Jungle Survivalist")]);
    const sheet = compute(withFeat, ref);
    expect(sheet.saves.fort.total).toBe(0);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 2, categories: ["poison", "disease"], labels: ["poison", "disease"] },
    ]);
  });
});

describe("Discerning Eye (headline provably unchanged)", () => {
  it("+2 racial vs. illusions at 1st level, Will total identical with or without the feat", () => {
    // "You receive a +2 racial bonus on saving throws against illusion
    // spells and effects..." Wizard 1 Will = 2. Conditional = 2 + 2 = 4.
    const base = makeDoc([]);
    const withFeat = makeDoc([featId("Discerning Eye")]);
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    // The category-scoped bonus is held out of the headline total entirely —
    // adding the feat changes NOTHING about sheet.saves.will.total.
    expect(featSheet.saves.will.total).toBe(baseSheet.saves.will.total);
    expect(featSheet.saves.will.total).toBe(2);
    expect(featSheet.saves.will.conditionals).toEqual([
      { total: 4, categories: ["illusion"], labels: ["illusions"] },
    ]);
  });
});

describe("Jackal Heritage (category inheritance: mind + fear together)", () => {
  it("a fear-only feat's line inherits a separate mind-affecting feat's bonus", () => {
    // Jackal Heritage: "+2 racial bonus on saving throws against
    // mind-affecting effects." Stoic: "+1 bonus... against fear effects."
    // `fear`'s parent is `mind` (save-categories.ts), so a fear roll stacks
    // BOTH modifiers even though only Stoic names fear directly. Wizard 1
    // Will = 2.
    //   mind line (named only by Jackal Heritage):  2 + 2 = 4.
    //   fear line (named by Stoic, inherits mind's +2 too): 2 + 2 + 1 = 5.
    // Racial and untyped are different stacking types, so both add rather
    // than one overriding the other.
    const withBoth = makeDoc([featId("Jackal Heritage"), featId("Stoic")]);
    const sheet = compute(withBoth, ref);
    expect(sheet.saves.will.total).toBe(2); // headline still untouched
    expect(sheet.saves.will.conditionals).toEqual([
      { total: 5, categories: ["fear"], labels: ["fear"] },
      { total: 4, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });
});

describe("Jackal Heritage alone (composes with its own unconditional table entry)", () => {
  it("the Perception bonus and the mind-affecting save line both apply, neither lost", () => {
    // Jackal Heritage carries TWO effects from two different tables:
    // `FEAT_EFFECTS_EXTRACTED_COMMUNITY`'s unconditional "+2 racial bonus on
    // Perception checks" (target: skill.per), and this table's category-
    // scoped "+2 racial bonus on saving throws against mind-affecting
    // effects" (target: allSavingThrows, saveCategories: ["mind"]). Both must
    // land — this is exactly the additive-composition case
    // feat-save-categories.ts's own doc comment describes.
    const base = makeDoc([]);
    const withFeat = makeDoc([featId("Jackal Heritage")]);
    const baseSheet = compute(base, ref);
    const featSheet = compute(withFeat, ref);
    expect(featSheet.skills["per"]!.total - baseSheet.skills["per"]!.total).toBe(2);
    expect(featSheet.saves.will.total).toBe(baseSheet.saves.will.total);
    expect(featSheet.saves.will.conditionals).toEqual([
      { total: 4, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });
});

describe("Steel Soul (a feat that REPLACES a racial bonus of the same type)", () => {
  /** Dwarf Fighter 1, all abilities 10 before racial adjustments. */
  function dwarf(feats: string[]): CharacterDoc {
    const doc = makeDoc(feats);
    return {
      ...doc,
      identity: { ...doc.identity, race: raceId("Dwarf"), classes: [{ tag: "fighter", level: 1 }] },
    };
  }

  it("raises the dwarf's spell line from +2 to +4 without touching poison", () => {
    // Hardy is "+2 racial vs. poison, spells, and spell-like abilities";
    // Steel Soul is "+4 racial ... against spells and spell-like abilities.
    // This replaces the normal bonus from the dwarf's hardy racial trait."
    // Both are racial, so highest-within-type performs the replacement with
    // no suppression machinery. Fighter 1 Fort = 2 + Con 12 (+1) = 3, so
    // spells read 3 + 4 = 7 and poison keeps Hardy's 3 + 2 = 5.
    const sheet = compute(dwarf([featId("Steel Soul")]), ref);
    expect(sheet.saves.fort.total).toBe(3);
    expect(sheet.saves.fort.conditionals).toEqual([
      { total: 7, categories: ["spell", "sla"], labels: ["spells", "SLAs"] },
      { total: 5, categories: ["poison"], labels: ["poison"] },
    ]);
  });

  it("does not double up with the alternate racial trait of the same name", () => {
    // The ARG alternate `dwarf-steel-soul` is a separate source with the same
    // published effect. A dwarf carrying both still lands on +4, not +8.
    const doc = dwarf([featId("Steel Soul")]);
    const both = compute(
      { ...doc, build: { ...doc.build, racialTraits: ["dwarf-steel-soul"] } },
      ref,
    );
    expect(both.saves.fort.conditionals?.[0]).toEqual({
      total: 7,
      categories: ["spell", "sla"],
      labels: ["spells", "SLAs"],
    });
  });
});
