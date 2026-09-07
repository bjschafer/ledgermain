/**
 * Vendored (non-hand-authored) prestige classes. `prestigeClasses.test.ts`
 * covers the eleven hand-authored CRB/AG classes; this file covers the ~108
 * remaining splatbook classes read from the same third-party archetype
 * module's `pf-prestige-classes`/`pf-prestige-features` packs (see
 * `src/transform/prestigeClasses.ts`).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

const ref = loadRefData();

const HAND_AUTHORED_NAMES = new Set([
  "Arcane Archer",
  "Arcane Trickster",
  "Assassin",
  "Dragon Disciple",
  "Duelist",
  "Eldritch Knight",
  "Loremaster",
  "Mystic Theurge",
  "Pathfinder Chronicler",
  "Shadowdancer",
  "Student of War",
]);

const allPrestige = () => Object.values(ref.classes).filter((c) => c.subType === "prestige");

function classByName(name: string) {
  const cls = Object.values(ref.classes).find((c) => c.name === name);
  if (!cls) throw new Error(`class not found: ${name}`);
  return cls;
}

describe("vendored prestige catalog size", () => {
  it("vendors exactly 108 non-hand-authored prestige classes, 119 total", () => {
    const prestige = allPrestige();
    expect(prestige.length).toBe(119);
    const vendored = prestige.filter((c) => !HAND_AUTHORED_NAMES.has(c.name));
    expect(vendored.length).toBe(108);
  });

  it("suppresses all eleven hand-authored classes as duplicates (never re-vendored)", () => {
    for (const name of HAND_AUTHORED_NAMES) {
      const matches = Object.values(ref.classes).filter((c) => c.name === name);
      expect(matches.length, name).toBe(1);
      // The one surviving entry is the hand-authored one (its own id/uuid
      // scheme — see `supplements.ts`), never the vendored `_id`-based uuid.
      expect(matches[0]!.uuid, name).toMatch(/^prestige-class:[a-z-]+$/);
    }
  });

  it("reads casting advancement off the published table for 55 classes", () => {
    // Every advancing class the source's own "Spells Per Day" column can be
    // read from. A class absent here has no such column (a non-caster
    // prestige class) or prints its own spell progression instead.
    const vendored = allPrestige().filter((c) => !HAND_AUTHORED_NAMES.has(c.name));
    expect(vendored.filter((c) => c.castingAdvancement).length).toBe(55);
  });

  it("Soul Warden advances a spellcasting class at every level 1-10", () => {
    // Undead Slayer's Handbook p.30: all ten rows read "+1 level of
    // spellcasting class", unrestricted as to arcane/divine (its own Channel
    // Casting example advances a sorcerer).
    expect(classByName("Soul Warden").castingAdvancement).toEqual([
      { kind: "any", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("transcribes the skipped-level schedules exactly", () => {
    // Advanced Player's Guide: the three classes whose column is blank on
    // some rows — the failure this guards is an off-by-one that quietly hands
    // a caster the levels the printed table withholds.
    expect(classByName("Holy Vindicator").castingAdvancement).toEqual([
      { kind: "divine", levels: [2, 3, 4, 6, 7, 8, 10] }, // blank at 1st, 5th, 9th
    ]);
    expect(classByName("Rage Prophet").castingAdvancement).toEqual([
      { kind: "divine", levels: [2, 3, 4, 6, 7, 9, 10] }, // blank at 1st, 5th, 8th
    ]);
    expect(classByName("Master Chymist").castingAdvancement).toEqual([
      { classTags: ["alchemist"], kind: "any", levels: [2, 3, 5, 6, 7, 9, 10] }, // blank at 1st, 4th, 8th
    ]);
  });

  it("keeps a column that names its classes restricted to them", () => {
    // Irrisen: Land of Eternal Winter — "+1 level of witch class", not of any
    // arcane class, so an arcane `kind` would let it advance a sorcerer.
    expect(classByName("Winter Witch").castingAdvancement).toEqual([
      { classTags: ["witch"], kind: "any", levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
    // Faction Guide p.56: a 3-level class reading "+1 level of cleric or
    // paladin" on every row.
    expect(classByName("Inheritor's Crusader").castingAdvancement).toEqual([
      { classTags: ["cleric", "paladin"], kind: "any", levels: [1, 2, 3] },
    ]);
  });

  it("names only real class tags in a classTags restriction", () => {
    const tags = new Set(Object.values(ref.classes).map((c) => c.tag));
    for (const c of allPrestige()) {
      for (const slot of c.castingAdvancement ?? []) {
        for (const tag of slot.classTags ?? [])
          expect(tags.has(tag), `${c.name}: ${tag}`).toBe(true);
      }
    }
  });

  it("leaves a class with its own spell progression untracked", () => {
    // Prophet of Kalistrade and Red Mantis Assassin print numbered 1st-4th
    // spells-per-day columns of their own rather than advancing an existing
    // class — a shape `castingAdvancement` cannot represent, so claiming an
    // advancement here would be worse than claiming nothing.
    expect(classByName("Prophet of Kalistrade").castingAdvancement).toBeUndefined();
    expect(classByName("Red Mantis Assassin").castingAdvancement).toBeUndefined();
  });

  it("advances at contiguous, in-range prestige levels", () => {
    for (const c of allPrestige()) {
      for (const slot of c.castingAdvancement ?? []) {
        expect(slot.levels.length, c.name).toBeGreaterThan(0);
        expect(slot.levels, c.name).toEqual([...slot.levels].sort((a, b) => a - b));
        expect(new Set(slot.levels).size, c.name).toBe(slot.levels.length);
        expect(Math.min(...slot.levels), c.name).toBeGreaterThanOrEqual(1);
        expect(Math.max(...slot.levels), c.name).toBeLessThanOrEqual(10);
      }
    }
  });

  it("every vendored class's feature grants resolve to a real classFeature", () => {
    const vendored = allPrestige().filter((c) => !HAND_AUTHORED_NAMES.has(c.name));
    for (const c of vendored) {
      for (const grant of c.features) {
        expect(grant.resolved, `${c.name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId]?.name, `${c.name}: ${grant.name}`).toBe(
          grant.name,
        );
        // Every prestige class in this pack is a 10-level table.
        expect(grant.level, `${c.name}: ${grant.name}`).toBeGreaterThanOrEqual(1);
        expect(grant.level, `${c.name}: ${grant.name}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it("no vendored class collides with any other class's id/uuid/tag/name", () => {
    const all = Object.values(ref.classes);
    const byId = new Map<string, string>();
    const byUuid = new Map<string, string>();
    const byTag = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const c of all) {
      for (const [map, key] of [
        [byId, c.id],
        [byUuid, c.uuid],
        [byTag, c.tag],
        [byName, c.name],
      ] as const) {
        expect(map.has(key), `duplicate ${key} (${c.name} vs ${map.get(key)})`).toBe(false);
        map.set(key, c.name);
      }
    }
  });
});

describe("Hellknight (Pathfinder Campaign Setting, PZO9226) — vendored chassis spot check", () => {
  const hellknight = classByName("Hellknight");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 2+Int skills", () => {
    expect(hellknight.hd).toBe(10);
    expect(hellknight.bab).toBe("high");
    expect(hellknight.armorProf).toEqual([]);
    expect(hellknight.weaponProf).toEqual([]);
    expect(hellknight.skillsPerLevel).toBe(2);
    expect(hellknight.subType).toBe("prestige");
    expect(hellknight.tag).toBe("hellknight");
  });

  it("has a good (highPrestige) Fort save and poor (lowPrestige) Ref/Will — a 10-level prestige table, not the 20-level base tier", () => {
    expect(hellknight.saves).toEqual({
      fort: "highPrestige",
      ref: "lowPrestige",
      will: "lowPrestige",
    });
  });

  it("carries the verbatim requirements as a soft advisory only, never a hard-blocking structured prereq", () => {
    expect(hellknight.prereqs?.prereqText).toContain("Base Attack Bonus");
    expect(hellknight.prereqs?.prereqText).toContain("slay a devil");
    expect(hellknight.prereqs?.bab).toBeUndefined();
    expect(hellknight.prereqs?.feats).toBeUndefined();
  });

  it("preserves source-book metadata (both the CRB-successor and the campaign-setting page)", () => {
    expect(hellknight.sources?.map((s) => s.id)).toEqual(["PZO1138", "PZO9226"]);
  });

  it("grants its level-linked features at the published levels (level-linked feature spot check)", () => {
    const byLevel = new Map(hellknight.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Aura of Law")).toBe(1);
    expect(byLevel.get("Smite Chaos")).toBe(1);
    expect(byLevel.get("Discern Lies")).toBe(2);
    expect(byLevel.get("Disciplines")).toBe(3);
    expect(byLevel.get("Lawbringer")).toBe(7);
    expect(byLevel.get("Hell's Knight")).toBe(10);
  });
});

describe("Technomancer — headingless requirements degrade to no prereqs rather than noisy prose", () => {
  it("has no prereqs at all (never a wrong/overly-broad advisory)", () => {
    const technomancer = classByName("Technomancer");
    expect(technomancer.prereqs).toBeUndefined();
  });
});
