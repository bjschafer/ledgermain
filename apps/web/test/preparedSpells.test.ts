import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { addClass, createEmptyDoc, migrateDoc } from "../src/model/doc.js";
import {
  clearPrepared,
  prepareSpell,
  preparedSpells,
  reconcileGrantedCantrips,
  removePreparedAt,
  restPreparedSpells,
  setExpendedAt,
  unprepareSpell,
} from "../src/model/preparedSpells.js";
import { casterModelFor, spellSlotsByLevel } from "../src/model/spellcasting.js";

const ref = loadRefData();

function fresh(): CharacterDoc {
  return createEmptyDoc("t");
}

describe("preparedSpells transitions", () => {
  it("prepare appends independent instances (same spell twice)", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball");
    doc = prepareSpell(doc, "fireball");
    expect(preparedSpells(doc)).toEqual([
      { spellId: "fireball", expended: false },
      { spellId: "fireball", expended: false },
    ]);
  });

  it("cast expends one instance; rest un-expends without dropping it", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball");
    doc = setExpendedAt(doc, 0, true);
    expect(preparedSpells(doc)[0]!.expended).toBe(true);

    doc = restPreparedSpells(doc);
    expect(preparedSpells(doc)).toEqual([{ spellId: "fireball", expended: false }]);
  });

  it("unprepare removes a non-expended instance before an expended one", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball"); // index 0
    doc = prepareSpell(doc, "fireball"); // index 1
    doc = setExpendedAt(doc, 0, true); // index 0 cast
    doc = unprepareSpell(doc, "fireball");
    // The still-available (index 1) copy is removed; the cast one is kept.
    expect(preparedSpells(doc)).toEqual([{ spellId: "fireball", expended: true }]);
  });

  it("removePreparedAt and clearPrepared drop instances", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "a");
    doc = prepareSpell(doc, "b");
    doc = removePreparedAt(doc, 0);
    expect(preparedSpells(doc)).toEqual([{ spellId: "b", expended: false }]);
    expect(preparedSpells(clearPrepared(doc))).toEqual([]);
  });

  it("transitions are no-ops on out-of-range / unknown targets", () => {
    const doc = prepareSpell(fresh(), "a");
    expect(setExpendedAt(doc, 5, true)).toBe(doc);
    expect(removePreparedAt(doc, -1)).toBe(doc);
    expect(unprepareSpell(doc, "missing")).toBe(doc);
    expect(restPreparedSpells(doc)).toBe(doc); // nothing expended
  });
});

describe("migrateDoc()", () => {
  it("moves a legacy build.spells.prepared doc to live.spells", () => {
    const legacy = {
      ...fresh(),
      build: { ...fresh().build, spells: { known: ["x"], prepared: [] } },
      live: { ...fresh().live, spells: undefined },
    } as unknown as CharacterDoc;
    const migrated = migrateDoc(legacy);
    expect(migrated.live.spells).toEqual({ prepared: [] });
    expect(migrated.build.spells).toEqual({ known: ["x"] });
    expect("prepared" in migrated.build.spells).toBe(false);
  });

  it("is a no-op for an already-current doc", () => {
    const doc = fresh();
    expect(migrateDoc(doc)).toBe(doc);
  });
});

describe("spellSlotsByLevel() — wizard", () => {
  const wizard = casterModelFor("wizard")!;

  it("level-1 wizard with Int +0: 3 cantrips + 1 first-level, no bonus", () => {
    const slots = spellSlotsByLevel(wizard, 1, 0);
    expect(slots).toEqual([
      { level: 0, base: 3, bonus: 0, total: 3 },
      { level: 1, base: 1, bonus: 0, total: 1 },
    ]);
  });

  it("Int +3 grants a bonus first-level slot but never bonus cantrips", () => {
    const slots = spellSlotsByLevel(wizard, 1, 3);
    expect(slots.find((s) => s.level === 0)).toEqual({
      level: 0,
      base: 3,
      bonus: 0,
      total: 3,
    });
    expect(slots.find((s) => s.level === 1)).toEqual({
      level: 1,
      base: 1,
      bonus: 1,
      total: 2,
    });
  });

  it("omits inaccessible spell levels", () => {
    const slots = spellSlotsByLevel(wizard, 1, 5);
    expect(slots.map((s) => s.level)).toEqual([0, 1]);
  });
});

describe("reconcileGrantedCantrips()", () => {
  // Two real wizard cantrip ids and one real level-1 spell from the vendored data.
  const cantripIds = ref.spellLists["wizard"]![0]!;
  const fireballId = ref.spellLists["wizard"]![3]![0]!;
  const c1 = cantripIds[0]!;
  const c2 = cantripIds[1]!;

  function wizardDoc(): CharacterDoc {
    return addClass(fresh(), "wizard");
  }

  it("strips cantrips from build.spells.known but keeps level 1+ spells", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: {
        ...doc.build,
        spells: { known: [c1, fireballId, c2] },
      },
    };
    const result = reconcileGrantedCantrips(doc, ref);
    expect(result.build.spells.known).toEqual([fireballId]);
  });

  it("strips cantrips from live.spells.prepared but keeps level 1+ prepared", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: { ...doc.build, spells: { known: [fireballId] } },
      live: {
        ...doc.live,
        spells: {
          prepared: [
            { spellId: c1, expended: false },
            { spellId: fireballId, expended: true },
            { spellId: c2, expended: false },
          ],
        },
      },
    };
    const result = reconcileGrantedCantrips(doc, ref);
    expect(result.live.spells!.prepared).toEqual([
      { spellId: fireballId, expended: true },
    ]);
  });

  it("is a no-op when no cantrips are stored", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: { ...doc.build, spells: { known: [fireballId] } },
    };
    expect(reconcileGrantedCantrips(doc, ref)).toBe(doc);
  });

  it("is a no-op for a non-caster (no spell list)", () => {
    const doc = addClass(fresh(), "fighter");
    expect(reconcileGrantedCantrips(doc, ref)).toBe(doc);
  });
});
