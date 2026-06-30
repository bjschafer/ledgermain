import { describe, expect, it } from "bun:test";

import { FOUNDRY_SHA, loadRefData } from "../src/index.js";

/**
 * These tests assert known PF1 facts against the vendored normalized data. They
 * read the committed `data/` output (no network / no Foundry clone needed), so
 * they double as a regression guard whenever the pinned SHA is bumped.
 */
const ref = loadRefData();

function classByTag(tag: string) {
  const cls = Object.values(ref.classes).find((c) => c.tag === tag);
  if (!cls) throw new Error(`class not found: ${tag}`);
  return cls;
}

function byName<T extends { name: string }>(rec: Record<string, T>, name: string) {
  const found = Object.values(rec).find((e) => e.name === name);
  if (!found) throw new Error(`entity not found: ${name}`);
  return found;
}

describe("metadata + provenance", () => {
  it("is generated from the pinned source SHA", () => {
    expect(ref.meta.sourceSha).toBe(FOUNDRY_SHA);
    expect(ref.meta.systemVersion).toBe("11.11");
    expect(ref.meta.schemaVersion).toBe(1);
  });

  it("records a content hash for every emitted file", () => {
    expect(Object.keys(ref.meta.hashes).length).toBeGreaterThan(0);
    for (const hash of Object.values(ref.meta.hashes)) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("contains the expected slice", () => {
    expect(Object.keys(ref.races)).toHaveLength(7);
    expect(Object.keys(ref.classes)).toHaveLength(5); // fighter, barbarian, wizard, cleric, sorcerer
    expect(Object.keys(ref.feats)).toHaveLength(390);
    expect(Object.keys(ref.spells).length).toBeGreaterThan(0);
  });
});

describe("classes + resolved feature links", () => {
  it("barbarian has high BAB and good Fort saves", () => {
    const barb = classByTag("barbarian");
    expect(barb.bab).toBe("high");
    expect(barb.saves.fort).toBe("high");
    expect(barb.saves.ref).toBe("low");
    expect(barb.hd).toBe(12);
  });

  it("barbarian gains Rage at level 1 via a resolved supplement link", () => {
    const barb = classByTag("barbarian");
    const rage = barb.features.find((f) => f.name === "Rage");
    expect(rage).toBeDefined();
    expect(rage?.level).toBe(1);
    expect(rage?.resolved).toBe(true);

    // The resolved feature exists with its uses formula intact.
    const feature = ref.classFeatures[rage!.featureId];
    expect(feature?.name).toBe("Rage");
    expect(feature?.uses?.maxFormula).toContain("@abilities.con.mod");
  });

  it("every selected class fully resolves its feature links", () => {
    for (const cls of Object.values(ref.classes)) {
      for (const f of cls.features) {
        expect(f.resolved, `${cls.tag}: ${f.uuid}`).toBe(true);
      }
    }
  });
});

describe("feat prerequisites (hybrid parse)", () => {
  it("Cleave requires Power Attack as a structured feat prereq", () => {
    const cleave = byName(ref.feats, "Cleave");
    const names = cleave.prerequisites.feats.map((f) => f.name);
    expect(names).toContain("Power Attack");
    // The referenced id resolves to a real feat in the dataset.
    const ref0 = cleave.prerequisites.feats.find((f) => f.name === "Power Attack");
    expect(ref.feats[ref0!.id]?.name).toBe("Power Attack");
  });

  it("Cleave parses Str 13 and BAB +1, and retains raw prereq text", () => {
    const cleave = byName(ref.feats, "Cleave");
    expect(cleave.prerequisites.abilities).toContainEqual({
      ability: "str",
      min: 13,
    });
    expect(cleave.prerequisites.bab).toBe(1);
    expect(cleave.prerequisites.prereqText).toContain("base attack bonus +1");
  });
});

describe("wizard spell list (inverted learnedAt.class)", () => {
  it("Fireball is a wizard level-3 spell", () => {
    const fireball = byName(ref.spells, "Fireball");
    expect(fireball.learnedAt.class.wizard).toBe(3);
    expect(ref.spellLists.wizard![3]).toContain(fireball.id);
  });

  it("preserves the damage formula DSL for the engine", () => {
    const fireball = byName(ref.spells, "Fireball");
    const part = fireball.actions[0]?.damage?.parts[0];
    expect(part?.formula).toBe("(min(10, @cl))d6");
    expect(part?.types).toContain("fire");
    expect(fireball.actions[0]?.save?.type).toBe("ref");
  });

  it("every spell on the wizard list actually lists wizard in learnedAt", () => {
    for (const [, ids] of Object.entries(ref.spellLists.wizard!)) {
      for (const id of ids) {
        expect(ref.spells[id]?.learnedAt.class.wizard).toBeTypeOf("number");
      }
    }
  });
});

describe("typed-modifier data (engine input)", () => {
  it("Bless carries a +1 morale bonus to attack", () => {
    const bless = byName(ref.buffs, "Bless");
    const change = bless.changes.find((c) => c.target === "attack");
    expect(change).toMatchObject({ formula: "1", type: "morale" });
  });

  it("Elf has racial ability changes", () => {
    const elf = byName(ref.races, "Elf");
    const dex = elf.changes.find((c) => c.target === "dex");
    expect(dex).toMatchObject({ formula: "2", type: "racial" });
  });
});
