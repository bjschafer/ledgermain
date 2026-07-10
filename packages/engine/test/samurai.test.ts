import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";

/**
 * Fixture coverage for the Samurai (UC) — a cavalier-chassis alternate class:
 * BAB high, good Fort, poor Ref/Will, d10, same 2/4/6/... skill-per-level
 * disadvantage-free layout as cavalier. Given cavalier equivalent treatment
 * (`nonCasterClasses.test.ts`'s cavalier fixture is the direct sibling of
 * this file):
 *
 * - **Resolve** rides the fully generic `uses.maxFormula` pipeline
 *   (`ceil(@class.unlevel / 2)`) with zero hand-authoring, same as cavalier's
 *   Challenge/Tactician.
 * - **Honorable Stand** (L11, an extra resolve-spending option) also carries
 *   its own vendored `uses.maxFormula`
 *   (`1 + if(gte(@class.unlevel, 16), 1)`), bumping from 1/day to 2/day at
 *   L16 — confirmed generic too.
 * - **Bonus Feat (SAM)** carries the identical vendored `changes: [{formula:
 *   "floor(@class.unlevel / 6)", target: "bonusFeats"}]` as cavalier's own
 *   Bonus Feat (CAV) — generic, no hand-authoring.
 *
 * **Vendored-data gap found (worth an issue #47 entry): Challenge (SAM) has
 * NO `uses` block at all**, unlike cavalier's byte-identical Challenge (CAV)
 * (`uses.maxFormula: "1 + floor((@class.unlevel - 1) / 3)"`, same SRD
 * wording verbatim: "once per day... plus one additional time per day for
 * every three levels beyond 1st, to a maximum of seven times per day at
 * 19th level"). Per this project's established posture for a vendored gap on
 * an otherwise-plain numeric feature (see Shifter Aspect's precedent in
 * `nonCasterClasses.test.ts`), this is left AS-IS (no synthetic pool
 * override) rather than hand-authored — the test below documents the
 * current (missing) behavior explicitly so a future data-pipeline fix is
 * caught, not silently masked.
 *
 * Mount (SAM) / Order (SAM) (companion + order-of-choice subsystems) are
 * deferred, mirroring cavalier's own Mount/Order (neither is modeled at all
 * for cavalier either).
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(tag: string, level: number, abilities: CharacterDoc["abilities"]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag, level }] },
    abilities,
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

describe("samurai L9 (BAB high, Fort good, Ref/Will poor, d10)", () => {
  const doc = makeDoc("samurai", 9, { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 });
  const sheet = compute(doc, ref);

  it("BAB +9", () => {
    expect(sheet.bab).toBe(9);
  });

  it("saves: Fort +8 (good), Ref +4 (poor), Will +4 (poor)", () => {
    // good = 2+floor(9/2)=6, +Con2=8; poor = floor(9/3)=3, +Dex1/Wis1=4.
    expect(sheet.saves.fort.total).toBe(8);
    expect(sheet.saves.ref.total).toBe(4);
    expect(sheet.saves.will.total).toBe(4);
  });

  it("HP 76 (average mode: L1 max d10=10, L2-9 8x(floor(10/2)+1=6)=48, +Con 2/level=18)", () => {
    expect(sheet.hp.max).toBe(76);
  });

  it("level-appropriate features present (L1-L9), Honorable Stand (L11) absent", () => {
    const names = sheet.classFeatures.map((f) => f.name);
    expect(names).toContain("Challenge (SAM)");
    expect(names).toContain("Mount (SAM)");
    expect(names).toContain("Order (SAM)");
    expect(names).toContain("Resolve");
    expect(names).toContain("Weapon Expertise");
    expect(names).toContain("Mounted Archer");
    expect(names).toContain("Banner (SAM)");
    expect(names).toContain("Bonus Feat (SAM)");
    expect(names).toContain("Greater Resolve");
    expect(names).not.toContain("Honorable Stand");
  });

  it("Resolve: ceil(9/2) = 5/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const resolve = pools.find((p) => p.name === "Resolve");
    expect(resolve?.max).toBe(5);
    expect(resolve?.per).toBe("day");
  });

  it("Challenge (SAM) derives NO pool — vendored-data gap: unlike cavalier's Challenge (CAV), this feature carries no uses.maxFormula at all despite identical SRD wording (see this file's doc comment)", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Challenge (SAM)")).toBeUndefined();
  });
});

describe("samurai L16 — Honorable Stand's uses bump", () => {
  const doc = makeDoc("samurai", 16, { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 });
  const sheet = compute(doc, ref);

  it("Resolve: ceil(16/2) = 8/day; Honorable Stand: 1 + (level>=16 ? 1 : 0) = 2/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Resolve")?.max).toBe(8);
    const stand = pools.find((p) => p.name === "Honorable Stand");
    expect(stand?.max).toBe(2);
    expect(stand?.per).toBe("day");
  });
});

describe("samurai L1 — earliest level", () => {
  const doc = makeDoc("samurai", 1, { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 });
  const sheet = compute(doc, ref);

  it("Resolve: ceil(1/2) = 1/day", () => {
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Resolve")?.max).toBe(1);
  });
});
