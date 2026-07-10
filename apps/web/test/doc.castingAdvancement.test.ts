/**
 * Unit tests for issue #66 chunk 2 (prestige casting advancement) additions
 * to `model/doc.ts`: `setCastingAdvancementTarget`, and `removeClass`'s
 * dependent-choice cleanup of `build.castingAdvancement`.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  addClass,
  createEmptyDoc,
  removeClass,
  setCastingAdvancementTarget,
  setClassLevel,
} from "../src/model/doc.js";

const ref = loadRefData();

function classed(tags: { tag: string; level: number }[]) {
  let doc = createEmptyDoc("t");
  for (const { tag, level } of tags) {
    doc = addClass(doc, tag);
    doc = setClassLevel(doc, tag, level);
  }
  return doc;
}

describe("setCastingAdvancementTarget()", () => {
  it("stores a valid target at the given slot index", () => {
    const doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    const next = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");
    expect(next.build.castingAdvancement).toEqual({ eldritchKnight: ["wizard"] });
  });

  it("clears a slot when passed null", () => {
    let doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, null);
    expect(doc.build.castingAdvancement).toEqual({ eldritchKnight: [null] });
  });

  it("fills unset preceding slots with null when a later slot is set first", () => {
    const doc = classed([
      { tag: "wizard", level: 3 },
      { tag: "cleric", level: 3 },
      { tag: "mysticTheurge", level: 2 },
    ]);
    const next = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 1, "cleric");
    expect(next.build.castingAdvancement).toEqual({ mysticTheurge: [null, "cleric"] });
  });

  it("is a no-op for an ineligible target (wrong kind for the slot)", () => {
    const doc = classed([
      { tag: "cleric", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    // EK's only slot is arcane; cleric is divine.
    expect(setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "cleric")).toBe(doc);
  });

  it("is a no-op for a target not on the document's classes at all", () => {
    const doc = classed([{ tag: "eldritchKnight", level: 3 }]);
    expect(setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard")).toBe(doc);
  });

  it("is a no-op for an out-of-range slot index", () => {
    const doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    expect(setCastingAdvancementTarget(doc, ref, "eldritchKnight", 1, "wizard")).toBe(doc);
    expect(setCastingAdvancementTarget(doc, ref, "eldritchKnight", -1, "wizard")).toBe(doc);
  });

  it("is a no-op when the prestige class has no castingAdvancement slots at all", () => {
    const doc = classed([{ tag: "wizard", level: 5 }]);
    expect(setCastingAdvancementTarget(doc, ref, "wizard", 0, "wizard")).toBe(doc);
  });
});

describe("removeClass() casting-advancement cleanup", () => {
  it("drops a prestige class's own slots when the prestige class itself is removed", () => {
    let doc = classed([
      { tag: "wizard", level: 5 },
      { tag: "eldritchKnight", level: 3 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "eldritchKnight", 0, "wizard");
    doc = removeClass(doc, "eldritchKnight");
    expect(doc.build.castingAdvancement).toEqual({});
    expect(doc.identity.classes.map((c) => c.tag)).toEqual(["wizard"]);
  });

  it("nulls out just the affected slot when the chosen TARGET class is removed, leaving sibling slots intact", () => {
    let doc = classed([
      { tag: "wizard", level: 3 },
      { tag: "cleric", level: 3 },
      { tag: "mysticTheurge", level: 2 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 0, "wizard");
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 1, "cleric");
    doc = removeClass(doc, "wizard");
    expect(doc.build.castingAdvancement).toEqual({ mysticTheurge: [null, "cleric"] });
  });

  it("removing the prestige class AND clearing its target both work independently in either order", () => {
    let doc = classed([
      { tag: "wizard", level: 3 },
      { tag: "cleric", level: 3 },
      { tag: "mysticTheurge", level: 2 },
    ]);
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 0, "wizard");
    doc = setCastingAdvancementTarget(doc, ref, "mysticTheurge", 1, "cleric");
    doc = removeClass(doc, "cleric");
    expect(doc.build.castingAdvancement).toEqual({ mysticTheurge: ["wizard", null] });
    doc = removeClass(doc, "mysticTheurge");
    expect(doc.build.castingAdvancement).toEqual({});
  });

  it("leaves build.castingAdvancement untouched (absent) when there was nothing to clean up", () => {
    const doc = classed([{ tag: "fighter", level: 5 }]);
    expect(removeClass(doc, "fighter").build.castingAdvancement).toBeUndefined();
  });
});
