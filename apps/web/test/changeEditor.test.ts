/**
 * Shared Change-list authoring model (`model/changeEditor.ts`): draft <-> `Change`
 * conversion used by the homebrew race/feat editors and (via extraction)
 * BuffsPanel's custom-buff form.
 */
import { describe, expect, it } from "bun:test";

import {
  CHANGE_TARGET_GROUPS,
  CHANGE_TARGETS,
  CHANGE_TYPE_OPTIONS,
  changesToDrafts,
  draftsToChanges,
  emptyChangeDraft,
} from "../src/model/changeEditor.js";
import { changeTargetLabel } from "../src/model/names.js";

describe("CHANGE_TARGET_GROUPS", () => {
  it("offers only targets the sheet knows how to name, so no row renders as a raw id", () => {
    const unnamed = CHANGE_TARGETS.filter((t) => changeTargetLabel(t) === t);
    expect(unnamed).toEqual([]);
  });

  it("lists every target exactly once across its groups", () => {
    expect(new Set(CHANGE_TARGETS).size).toBe(CHANGE_TARGETS.length);
  });

  it("gives every option a label distinct from its raw engine id", () => {
    const raw = CHANGE_TARGET_GROUPS.flatMap((g) => g.options).filter((o) => o.label === o.id);
    expect(raw).toEqual([]);
  });
});

describe("CHANGE_TYPE_OPTIONS", () => {
  it("labels every stacking type without repeating an id", () => {
    expect(new Set(CHANGE_TYPE_OPTIONS.map((o) => o.id)).size).toBe(CHANGE_TYPE_OPTIONS.length);
    expect(CHANGE_TYPE_OPTIONS.every((o) => o.label.length > 0)).toBe(true);
  });

  it("defaults to untyped, the only choice that is always safe to stack", () => {
    expect(CHANGE_TYPE_OPTIONS[0]?.id).toBe("untyped");
  });
});

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
