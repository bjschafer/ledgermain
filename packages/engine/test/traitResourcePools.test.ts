import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, resourceTagSlug } from "../src/index.js";

/**
 * Fixture tests for character-trait resource pools (`Trait.uses`, ~290 of the
 * 1,998 vendored `RefData.traits`) — the `deriveTraitResourcePools` counterpart
 * to a racial trait's `uses.maxFormula` (see `vendoredRacialTraits.test.ts`'s
 * "vendored racial-trait resource pools" block). Also covers `resourceTagSlug`
 * (Foundry's `@resources.<tag>` naming rule) and the deliberate skip of a
 * `uses.maxFormula` that references `@resources.*` (Gunslinger Utility Shot):
 * a formula linked to another pool must not become a counted pool of its own,
 * since RAW states no per-day count for it.
 */
const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function traitId(name: string): string {
  const entry = Object.values(ref.traits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored trait not found: ${name}`);
  return entry.id;
}

function vendoredRacialTraitId(name: string): string {
  const entry = Object.values(ref.racialTraits).find((t) => t.name === name);
  if (!entry) throw new Error(`vendored racial trait not found: ${name}`);
  return entry.id;
}

function baseDoc(over: Partial<CharacterDoc>): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...over,
  } as CharacterDoc;
}

function pools(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return deriveResourcePools(doc, ref, sheet.abilities);
}

describe("character trait resource pools", () => {
  const secretsOfTheSphinx = traitId("Secrets of the Sphinx (Scarab Sages)");
  const adaptableLuck = vendoredRacialTraitId("Adaptable Luck");

  it("Halfling + Adaptable Luck racial trait AND Secrets of the Sphinx campaign trait both derive pools", () => {
    const doc = baseDoc({
      identity: { name: "Pip", race: raceId("Halfling"), classes: [{ tag: "fighter", level: 1 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        traits: [secretsOfTheSphinx],
        vendoredRacialTraits: [adaptableLuck],
      },
    });
    const derived = pools(doc);

    const trait = derived.find((p) => p.id === secretsOfTheSphinx);
    expect(trait).toMatchObject({
      name: "Secrets of the Sphinx (Scarab Sages)",
      max: 1,
      restValue: 1,
      per: "day",
      classTag: "trait",
    });

    const racial = derived.find((p) => p.id === adaptableLuck);
    expect(racial).toMatchObject({
      name: "Adaptable Luck",
      max: 3,
      restValue: 3,
      per: "day",
      classTag: "racial",
    });
  });

  it("no pool for a trait the character hasn't chosen", () => {
    const doc = baseDoc({
      identity: { name: "Pip", race: raceId("Halfling"), classes: [{ tag: "fighter", level: 1 }] },
    });
    expect(pools(doc).find((p) => p.id === secretsOfTheSphinx)).toBeUndefined();
  });

  it("a hand-authored trait id (no `uses`) is a harmless no-op — never a pool", () => {
    const doc = baseDoc({
      identity: { name: "Pip", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
        traits: ["reactionary"],
      },
    });
    expect(pools(doc).find((p) => p.id === "reactionary")).toBeUndefined();
  });
});

describe("resourceTagSlug (Foundry's @resources.<tag> naming rule)", () => {
  it("single-word names lowercase entirely", () => {
    expect(resourceTagSlug("Grit")).toBe("grit");
    expect(resourceTagSlug("Burn")).toBe("burn");
    expect(resourceTagSlug("Tenacious")).toBe("tenacious");
  });

  it("multi-word names camelCase after the first word", () => {
    expect(resourceTagSlug("Adaptable Luck")).toBe("adaptableLuck");
  });

  it("parenthetical/compound names drop punctuation and keep every word", () => {
    expect(resourceTagSlug("Secrets of the Sphinx (Scarab Sages)")).toBe(
      "secretsOfTheSphinxScarabSages",
    );
    expect(resourceTagSlug("Formerly Mindswapped (Strange Aeons)")).toBe(
      "formerlyMindswappedStrangeAeons",
    );
  });
});

describe("Gunslinger Utility Shot (@resources-linked maxFormula, deliberately not a pool)", () => {
  function gunslingerDoc(level: number, wis: number): CharacterDoc {
    return baseDoc({
      identity: { name: "Rue", race: raceId("Human"), classes: [{ tag: "gunslinger", level }] },
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis, cha: 10 },
    });
  }

  it("level 3 gunslinger, Wis 14 (+2): Grit pool max 2, and no Utility Shot pool", () => {
    // RAW (Ultimate Combat, deeds): "if the gunslinger has at least 1 grit
    // point, she can perform all of the following utility shots" — a grit
    // GATE, not a use count. The vendored `uses.maxFormula`
    // (`@resources.grit.value`) is a live link to the Grit pool, and
    // deriving a counted pool from it would invent a daily limit the book
    // doesn't state, so `deriveResourcePools` skips it.
    const derived = pools(gunslingerDoc(3, 14));
    // Grit itself: max(1, Wis mod(2)) = 2.
    expect(derived.find((p) => p.name === "Grit")?.max).toBe(2);
    expect(derived.find((p) => p.name === "Utility Shot")).toBeUndefined();
  });
});
