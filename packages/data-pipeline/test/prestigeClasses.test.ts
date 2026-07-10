/**
 * Hand-authored prestige-class chassis (issue #66 chunk 1 — Eldritch Knight,
 * Mystic Theurge). Foundry's pf1 pack ships no prestige classes at all, so
 * unlike the rest of `refdata.test.ts` this isn't guarding a transform of
 * upstream data — it's a spot-check of the hand-authored chassis in
 * `src/supplements.ts` against the values verified there (Core Rulebook,
 * cross-checked against legacy.aonprd.com raw HTML, d20pfsrd.com, and
 * aonprd.com).
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

const ref = loadRefData();

function classByName(name: string) {
  const cls = Object.values(ref.classes).find((c) => c.name === name);
  if (!cls) throw new Error(`class not found: ${name}`);
  return cls;
}

describe("Eldritch Knight (CRB, PZO1110)", () => {
  const ek = classByName("Eldritch Knight");

  it("has the published chassis: d10 HD, full BAB, no proficiencies, 2+Int skills", () => {
    expect(ek.hd).toBe(10);
    expect(ek.bab).toBe("high");
    expect(ek.armorProf).toEqual([]);
    expect(ek.weaponProf).toEqual([]);
    expect(ek.skillsPerLevel).toBe(2);
    expect(ek.subType).toBe("prestige");
    expect(ek.tag).toBe("eldritchKnight");
  });

  it("has a good (highPrestige) Fort save and poor (lowPrestige) Ref/Will", () => {
    expect(ek.saves).toEqual({ fort: "highPrestige", ref: "lowPrestige", will: "lowPrestige" });
  });

  it("advances one arcane casting slot starting at 2nd level (no 1st-level slot)", () => {
    expect(ek.castingAdvancement).toEqual([
      { kind: "arcane", levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("grants Diverse Training + Bonus Combat Feat at 1st and Spell Critical at 10th", () => {
    const byLevel = new Map(ek.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Diverse Training")).toBe(1);
    expect(byLevel.get("Bonus Combat Feat")).toBe(1);
    expect(byLevel.get("Spell Critical")).toBe(10);
  });
});

describe("Mystic Theurge (CRB, PZO1110)", () => {
  const mt = classByName("Mystic Theurge");

  it("has the published chassis: d6 HD, half BAB, no proficiencies, 2+Int skills", () => {
    expect(mt.hd).toBe(6);
    expect(mt.bab).toBe("low");
    expect(mt.armorProf).toEqual([]);
    expect(mt.weaponProf).toEqual([]);
    expect(mt.skillsPerLevel).toBe(2);
    expect(mt.subType).toBe("prestige");
    expect(mt.tag).toBe("mysticTheurge");
  });

  it("has a good (highPrestige) Will save and poor (lowPrestige) Fort/Ref", () => {
    expect(mt.saves).toEqual({ fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" });
  });

  it("advances two casting slots (arcane + divine), both starting at 1st level", () => {
    expect(mt.castingAdvancement).toEqual([
      { kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { kind: "divine", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ]);
  });

  it("grants Combined Spells at 1st and Spell Synthesis at 10th", () => {
    const byLevel = new Map(mt.features.map((f) => [f.name, f.level]));
    expect(byLevel.get("Combined Spells")).toBe(1);
    expect(byLevel.get("Spell Synthesis")).toBe(10);
  });
});

describe("prestige class feature resolution", () => {
  it("every ClassFeatureGrant on both prestige classes resolves to an existing classFeature id", () => {
    for (const name of ["Eldritch Knight", "Mystic Theurge"]) {
      const cls = classByName(name);
      for (const grant of cls.features) {
        expect(grant.resolved, `${name}: ${grant.name}`).toBe(true);
        expect(ref.classFeatures[grant.featureId]?.name, `${name}: ${grant.name}`).toBe(grant.name);
      }
    }
  });

  it("neither prestige class collides with a vendored class id/uuid/tag/name", () => {
    const ek = classByName("Eldritch Knight");
    const mt = classByName("Mystic Theurge");
    const others = Object.values(ref.classes).filter((c) => c !== ek && c !== mt);
    for (const cls of [ek, mt]) {
      for (const other of others) {
        expect(other.id).not.toBe(cls.id);
        expect(other.uuid).not.toBe(cls.uuid);
        expect(other.tag).not.toBe(cls.tag);
        expect(other.name).not.toBe(cls.name);
      }
    }
  });
});
