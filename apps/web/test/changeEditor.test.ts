/**
 * Shared Change-list authoring model (`model/changeEditor.ts`): draft <-> `Change`
 * conversion used by the homebrew race/feat editors and (via extraction)
 * BuffsPanel's custom-buff form.
 */
import { describe, expect, it } from "bun:test";

import { changesToDrafts, draftsToChanges, emptyChangeDraft } from "../src/model/changeEditor.js";

describe("emptyChangeDraft()", () => {
  it("returns a draft with a non-empty target/type and a nonzero default value", () => {
    const d = emptyChangeDraft();
    expect(d.target.length).toBeGreaterThan(0);
    expect(d.type.length).toBeGreaterThan(0);
    expect(d.value).not.toBe(0);
  });
});

describe("draftsToChanges()", () => {
  it("converts a valid draft to a Change with a string formula", () => {
    const out = draftsToChanges([{ target: "skill.per", type: "racial", value: 2 }]);
    expect(out).toEqual([{ formula: "2", target: "skill.per", type: "racial" }]);
  });

  it("drops rows with a zero value", () => {
    const out = draftsToChanges([{ target: "ac", type: "dodge", value: 0 }]);
    expect(out).toEqual([]);
  });

  it("drops rows with a blank target", () => {
    const out = draftsToChanges([{ target: "  ", type: "dodge", value: 1 }]);
    expect(out).toEqual([]);
  });

  it("defaults a blank type to untyped", () => {
    const out = draftsToChanges([{ target: "ac", type: "", value: 1 }]);
    expect(out[0]?.type).toBe("untyped");
  });

  it("preserves negative values (penalties encoded as negative formulas)", () => {
    const out = draftsToChanges([{ target: "str", type: "racial", value: -2 }]);
    expect(out).toEqual([{ formula: "-2", target: "str", type: "racial" }]);
  });
});

describe("changesToDrafts()", () => {
  it("round-trips through draftsToChanges for a well-formed Change", () => {
    const changes = draftsToChanges([{ target: "cmb", type: "morale", value: 1 }]);
    expect(changesToDrafts(changes)).toEqual([{ target: "cmb", type: "morale", value: 1 }]);
  });

  it("falls back to 0 for a non-numeric formula rather than throwing", () => {
    const drafts = changesToDrafts([{ formula: "1d6", target: "dr", type: "untyped" }]);
    expect(drafts).toEqual([{ target: "dr", type: "untyped", value: 0 }]);
  });
});
