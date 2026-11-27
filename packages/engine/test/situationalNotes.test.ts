/**
 * Fixture tests for `DerivedSheet.situationalNotes`: every ACTIVE source's
 * hand-apply reminders reach the sheet, a note whose bonus is already a real
 * number is dropped, and an inactive source contributes nothing. Expected
 * behavior is read off the vendored catalogs' own `contextNotes` and the
 * promotion tables `noteCoverage` consults.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute } from "../src/index.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function featId(name: string): string {
  const entry = Object.values(ref.feats).find((f) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry.id;
}

function itemId(name: string): string {
  const entry = Object.values(ref.items).find((i) => i.name === name);
  if (!entry) throw new Error(`item not found: ${name}`);
  return entry.id;
}

function activeBuff(name: string, extra: Partial<ActiveBuff> = {}): ActiveBuff {
  const entry = Object.values(ref.buffs).find((b) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return {
    instanceId: `${name}-1`,
    buffId: entry.id,
    name: entry.name,
    changes: entry.changes,
    contextNotes: entry.contextNotes,
    ...extra,
  };
}

function makeDoc(overrides: Partial<CharacterDoc> = {}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "situational-notes-test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: raceId("Human"), classes: [{ tag: "fighter", level: 1 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 1, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
    ...overrides,
  } as CharacterDoc;
}

function notesFor(doc: CharacterDoc) {
  return compute(doc, ref).situationalNotes ?? [];
}

describe("active buffs", () => {
  it("carries an unpromoted save note, with the buff's caster level", () => {
    const notes = notesFor(
      makeDoc({
        live: {
          ...makeDoc().live,
          activeBuffs: [activeBuff("Freedom of Movement", { casterLevel: 7 })],
        },
      }),
    );
    expect(notes).toContainEqual({
      target: "allSavingThrows",
      text: "Immune to effects that impedes movement.",
      source: "Freedom of Movement",
      casterLevel: 7,
    });
  });

  it("drops a fully promoted AC note (Mage Armor) and a fully promoted save note (Bless)", () => {
    const doc = makeDoc();
    const notes = notesFor({
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [activeBuff("Mage Armor"), activeBuff("Bless")],
      },
    });
    expect(notes.some((n) => n.text === "+4 against incorporeal touch attacks.")).toBe(false);
    expect(notes.some((n) => n.source === "Bless")).toBe(false);
  });

  it("keeps a partially promoted save note (Death Ward) as a reminder", () => {
    const doc = makeDoc();
    const notes = notesFor({
      ...doc,
      live: { ...doc.live, activeBuffs: [activeBuff("Death Ward")] },
    });
    expect(notes.some((n) => n.source === "Death Ward" && n.target === "allSavingThrows")).toBe(
      true,
    );
  });

  it("ignores a paused buff and a buff excluded from the master", () => {
    const doc = makeDoc();
    const notes = notesFor({
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff("Freedom of Movement", { instanceId: "paused", paused: true }),
          activeBuff("Freedom of Movement", { instanceId: "excluded", excludeMaster: true }),
        ],
      },
    });
    expect(notes.some((n) => n.source === "Freedom of Movement")).toBe(false);
  });

  it("dedupes the same note from two copies of one buff", () => {
    const doc = makeDoc();
    const notes = notesFor({
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: [
          activeBuff("Freedom of Movement", { instanceId: "a" }),
          activeBuff("Freedom of Movement", { instanceId: "b" }),
        ],
      },
    });
    expect(
      notes.filter((n) => n.source === "Freedom of Movement" && n.target === "allSavingThrows"),
    ).toHaveLength(1);
  });
});

describe("taken feats and traits", () => {
  it("carries a feat's off-sheet contextNote", () => {
    const doc = makeDoc({ build: { ...makeDoc().build, feats: [featId("Augment Summoning")] } });
    expect(notesFor(doc)).toContainEqual(
      expect.objectContaining({ target: "allChecks", source: "Augment Summoning" }),
    );
  });

  it("carries a trait's contextNote", () => {
    const doc = makeDoc({ build: { ...makeDoc().build, traits: ["anatomist"] } });
    expect(notesFor(doc)).toContainEqual(
      expect.objectContaining({ target: "critConfirm", source: "Anatomist" }),
    );
  });
});

describe("race and racial traits", () => {
  it("carries an unpromoted race note but drops the race's promoted Hardy/Stability/giant notes", () => {
    const doc = makeDoc({ identity: { ...makeDoc().identity, race: raceId("Dwarf") } });
    const notes = notesFor(doc);
    expect(notes).toContainEqual(
      expect.objectContaining({
        target: "skill.per",
        text: "+2 to Notice Unusual Stonework",
        source: "Dwarf",
      }),
    );
    expect(notes.some((n) => n.text.includes("Poisons, Spells and Spell-likes"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Bull Rush and Trip"))).toBe(false);
    expect(notes.some((n) => n.text.includes("Dodge vs Giants"))).toBe(false);
  });

  it("carries an active vendored racial trait's note", () => {
    const doc = makeDoc({
      identity: { ...makeDoc().identity, race: raceId("Dwarf") },
      build: {
        ...makeDoc().build,
        vendoredRacialTraits: ["QdzlzrqWtgfjE4Fs"], // Ancient Enmity
      },
    });
    expect(notesFor(doc)).toContainEqual(
      expect.objectContaining({ target: "attack", source: "Ancient Enmity" }),
    );
  });

  it("skips a race note an active alternate trait retires", () => {
    const doc = makeDoc({
      identity: { ...makeDoc().identity, race: raceId("Dwarf") },
      build: {
        ...makeDoc().build,
        racialTraits: ["dwarf-rock-stepper"], // replaces Stonecunning
      },
    });
    const notes = notesFor(doc);
    expect(notes.some((n) => n.text === "+2 to Notice Unusual Stonework")).toBe(false);
    expect(notes).toContainEqual(
      expect.objectContaining({ source: "Rock Stepper", target: "landSpeed" }),
    );
  });
});

describe("equipped items and granted class features", () => {
  it("carries an equipped item's note, and skips it when unequipped", () => {
    const item = itemId("Cold-weather outfit");
    const equipped = makeDoc({
      build: {
        ...makeDoc().build,
        gear: [{ itemId: item, equipped: true }],
      },
    });
    expect(notesFor(equipped)).toContainEqual(
      expect.objectContaining({ target: "fort", source: "Cold-weather outfit" }),
    );

    const stowed = makeDoc({
      build: {
        ...makeDoc().build,
        gear: [{ itemId: item, equipped: false }],
      },
    });
    expect(notesFor(stowed).some((n) => n.source === "Cold-weather outfit")).toBe(false);
  });

  it("carries a granted hex's contextNote", () => {
    const doc = makeDoc({
      identity: { ...makeDoc().identity, classes: [{ tag: "witch", level: 1 }] },
      build: { ...makeDoc().build, witchHexes: ["charm"] },
    });
    expect(notesFor(doc)).toContainEqual(
      expect.objectContaining({ target: "allChecks", source: "Charm" }),
    );
  });
});
