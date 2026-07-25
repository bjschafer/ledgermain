import { describe, expect, it } from "bun:test";

import type { Buff } from "@pf1/schema";

import { loadRefData } from "../src/index.js";
import {
  SUPPLEMENTAL_BUFF_CHANGES,
  SUPPLEMENTAL_BUFF_CONTEXT_NOTES,
  applyBuffSupplements,
} from "../src/supplements.js";

const ref = loadRefData();

describe("buff names are not unique, which is why the supplement tables key on id", () => {
  it('the vendored slice really does carry two distinct buffs named "Resistance"', () => {
    // The whole reason for id keying. If upstream ever renames one of these,
    // this test should fail loudly so the decision can be revisited rather
    // than quietly outliving its reason.
    const named = Object.values(ref.buffs).filter((b) => b.name === "Resistance");
    expect(named).toHaveLength(2);
    expect(new Set(named.map((b) => b.id)).size).toBe(2);
  });

  it("addresses the saving-throw one and the energy-resistance one separately", () => {
    const saves = ref.buffs["GdU6Xlwn2phRnfc6"];
    const energy = ref.buffs["W9TR1oh1KpDxOKr1"];
    expect(saves?.name).toBe("Resistance");
    expect(energy?.name).toBe("Resistance");
    expect(saves?.changes.some((c) => c.target === "allSavingThrows")).toBe(true);
    expect(energy?.changes).toEqual([]);
  });
});

describe("every supplement id resolves to the buff it claims", () => {
  it.each(Object.entries(SUPPLEMENTAL_BUFF_CHANGES).map(([id, s]) => [s.name, id] as const))(
    "%s (%s)",
    (name, id) => {
      expect(ref.buffs[id]?.name).toBe(name);
    },
  );

  it.each(Object.entries(SUPPLEMENTAL_BUFF_CONTEXT_NOTES).map(([id, s]) => [s.name, id] as const))(
    "%s (%s)",
    (name, id) => {
      expect(ref.buffs[id]?.name).toBe(name);
    },
  );
});

describe("applyBuffSupplements drift guards", () => {
  const bare = (id: string, name: string): Buff =>
    ({ id, name, uuid: `Compendium.pf1.buffs.Item.${id}`, changes: [], contextNotes: [] }) as Buff;

  it("throws when a supplemented id is missing from the vendored set", () => {
    expect(() => applyBuffSupplements([bare("some-other-id", "Whatever")])).toThrow(
      /not found in vendored buffs/,
    );
  });

  it("throws when the id now points at a differently-named buff", () => {
    // An opaque id that quietly stops matching after a content re-vendor is
    // exactly the drift this guard exists to catch.
    const all = Object.keys(SUPPLEMENTAL_BUFF_CHANGES).map((id) => bare(id, "Renamed Upstream"));
    const notes = Object.keys(SUPPLEMENTAL_BUFF_CONTEXT_NOTES).map((id) => bare(id, "Aid"));
    expect(() => applyBuffSupplements([...all, ...notes])).toThrow(/named "Renamed Upstream"/);
  });

  it("appends rather than replacing existing changes", () => {
    const stoneskin = { ...bare("dYMrU01t5FNMgNra", "Stoneskin") };
    stoneskin.changes = [{ formula: "1", target: "ac", type: "untyped" }];
    const rest = Object.entries(SUPPLEMENTAL_BUFF_CHANGES)
      .filter(([id]) => id !== "dYMrU01t5FNMgNra")
      .map(([id, s]) => bare(id, s.name));
    const notes = Object.entries(SUPPLEMENTAL_BUFF_CONTEXT_NOTES).map(([id, s]) =>
      bare(id, s.name),
    );

    applyBuffSupplements([stoneskin, ...rest, ...notes]);
    expect(stoneskin.changes).toHaveLength(2);
    expect(stoneskin.changes[1]).toEqual({
      formula: "10",
      target: "dr.adamantine",
      type: "untyped",
    });
  });
});
