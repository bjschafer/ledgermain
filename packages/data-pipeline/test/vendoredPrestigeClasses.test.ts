/**
 * Vendored (non-hand-authored) prestige classes — issue #74 phase 2c.
 * `prestigeClasses.test.ts` covers the eleven hand-authored CRB/AG classes;
 * this file covers the ~108 remaining splatbook classes read from the same
 * third-party archetype module's `pf-prestige-classes`/`pf-prestige-features`
 * packs (see `src/transform/prestigeClasses.ts`).
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

  it("every vendored class carries no castingAdvancement (out of scope; see prereqs-are-prose posture)", () => {
    const vendored = allPrestige().filter((c) => !HAND_AUTHORED_NAMES.has(c.name));
    for (const c of vendored) {
      expect(c.castingAdvancement, c.name).toBeUndefined();
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
