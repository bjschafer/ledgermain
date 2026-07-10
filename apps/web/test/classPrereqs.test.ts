/**
 * Unit tests for `model/classPrereqs.ts` (issue #66 chunk 3) — prestige-class
 * entry-requirement gating. Uses the real vendored refdata (loadRefData)
 * since the prestige classes (issue #66 chunks 1 + 4) only exist there.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { Class } from "@pf1/schema";

import { evaluateClassPrereqs } from "../src/model/classPrereqs.js";
import {
  addClass,
  addFeatInstance,
  createEmptyDoc,
  setClassLevel,
  setSkillRank,
} from "../src/model/doc.js";

const ref = loadRefData();

function classByTag(tag: string): Class {
  const cls = Object.values(ref.classes).find((c) => c.tag === tag);
  if (!cls) throw new Error(`fixture: class tag "${tag}" not found in vendored refdata`);
  return cls;
}

function classed(tags: { tag: string; level: number }[]) {
  let doc = createEmptyDoc("t");
  for (const { tag, level } of tags) {
    doc = addClass(doc, tag);
    doc = setClassLevel(doc, tag, level);
  }
  return doc;
}

function featIdByName(name: string): string {
  const feat = Object.values(ref.feats).find((f) => f.name === name);
  if (!feat) throw new Error(`fixture: feat "${name}" not found in vendored refdata`);
  return feat.id;
}

describe("evaluateClassPrereqs", () => {
  it("returns unblocked/no checks for a class with no prereqs field", () => {
    const cls: Class = { ...classByTag("eldritchKnight"), prereqs: undefined };
    const doc = createEmptyDoc("t");
    const res = evaluateClassPrereqs(cls, doc, ref, 0);
    expect(res.blocked).toBe(false);
    expect(res.warn).toBe(false);
    expect(res.checks).toEqual([]);
  });

  describe("bab", () => {
    const duelist = classByTag("duelist"); // bab: 6

    it("blocks when BAB is below the requirement", () => {
      const doc = classed([{ tag: "fighter", level: 1 }]);
      const res = evaluateClassPrereqs(duelist, doc, ref, 3);
      expect(res.checks.find((c) => c.label === "BAB +6")?.met).toBe(false);
      expect(res.blocked).toBe(true);
    });

    it("does not block once BAB meets the requirement (other structured checks still apply)", () => {
      let d = classed([{ tag: "fighter", level: 6 }]);
      d = addFeatInstance(d, featIdByName("Dodge"));
      d = addFeatInstance(d, featIdByName("Mobility"));
      d = addFeatInstance(d, featIdByName("Weapon Finesse"));
      d = setSkillRank(d, "acr", 2);
      d = setSkillRank(d, "prf", 2);
      const res = evaluateClassPrereqs(duelist, d, ref, 6);
      expect(res.checks.find((c) => c.label === "BAB +6")?.met).toBe(true);
      expect(res.blocked).toBe(false);
    });
  });

  describe("feats", () => {
    const duelist = classByTag("duelist"); // feats: Dodge, Mobility, Weapon Finesse

    it("blocks when a required feat is missing", () => {
      const doc = classed([{ tag: "fighter", level: 6 }]);
      const res = evaluateClassPrereqs(duelist, doc, ref, 6);
      expect(res.checks.find((c) => c.label === "Dodge")?.met).toBe(false);
      expect(res.blocked).toBe(true);
    });

    it("is met once the feat is selected", () => {
      let doc = classed([{ tag: "fighter", level: 6 }]);
      doc = addFeatInstance(doc, featIdByName("Dodge"));
      const res = evaluateClassPrereqs(duelist, doc, ref, 6);
      expect(res.checks.find((c) => c.label === "Dodge")?.met).toBe(true);
    });

    it("degrades an unresolvable feat name to prose-advisory — never a permanent hard block", () => {
      const synthetic: Class = {
        ...classByTag("duelist"),
        prereqs: {
          feats: ["This Feat Does Not Exist In The Vendored Slice"],
          prereqText: "Feats: This Feat Does Not Exist In The Vendored Slice.",
        },
      };
      const doc = createEmptyDoc("t");
      const res = evaluateClassPrereqs(synthetic, doc, ref, 0);
      expect(res.checks).toEqual([]);
      expect(res.blocked).toBe(false);
      expect(res.warn).toBe(true);
      expect(res.softText).toContain("This Feat Does Not Exist");
    });
  });

  describe("skillRanks", () => {
    const assassin = classByTag("assassin"); // dis 2, ste 5

    it("blocks when invested ranks are below the requirement", () => {
      let doc = classed([{ tag: "rogue", level: 5 }]);
      doc = setSkillRank(doc, "dis", 2);
      doc = setSkillRank(doc, "ste", 3);
      const res = evaluateClassPrereqs(assassin, doc, ref, 0);
      expect(res.checks.find((c) => c.label.startsWith("Stealth"))?.met).toBe(false);
      expect(res.blocked).toBe(true);
    });

    it("is met once ranks are invested", () => {
      let doc = classed([{ tag: "rogue", level: 5 }]);
      doc = setSkillRank(doc, "dis", 2);
      doc = setSkillRank(doc, "ste", 5);
      const res = evaluateClassPrereqs(assassin, doc, ref, 0);
      expect(res.blocked).toBe(false);
      expect(res.checks.every((c) => c.met)).toBe(true);
    });
  });

  describe("casting", () => {
    const eldritchKnight = classByTag("eldritchKnight"); // casting: arcane 3rd

    it("Wizard 5 satisfies 'able to cast 3rd-level arcane spells'", () => {
      const doc = classed([{ tag: "wizard", level: 5 }]);
      const res = evaluateClassPrereqs(eldritchKnight, doc, ref, 0);
      expect(res.checks.find((c) => c.label.includes("3rd-level"))?.met).toBe(true);
      expect(res.blocked).toBe(false);
    });

    it("Wizard 4 does not satisfy 'able to cast 3rd-level arcane spells'", () => {
      const doc = classed([{ tag: "wizard", level: 4 }]);
      const res = evaluateClassPrereqs(eldritchKnight, doc, ref, 0);
      expect(res.checks.find((c) => c.label.includes("3rd-level"))?.met).toBe(false);
      expect(res.blocked).toBe(true);
    });

    it("a Cleric does not satisfy an arcane-only casting requirement", () => {
      const doc = classed([{ tag: "cleric", level: 10 }]);
      const res = evaluateClassPrereqs(eldritchKnight, doc, ref, 0);
      expect(res.checks.find((c) => c.label.includes("3rd-level"))?.met).toBe(false);
      expect(res.blocked).toBe(true);
    });

    describe("Mystic Theurge (dual arcane AND divine requirement)", () => {
      const mysticTheurge = classByTag("mysticTheurge"); // arcane 2nd + divine 2nd, kar 3, kre 3

      function readyDoc(extra: { tag: string; level: number }[]) {
        let doc = classed(extra);
        doc = setSkillRank(doc, "kar", 3);
        doc = setSkillRank(doc, "kre", 3);
        return doc;
      }

      it("Wizard 3 alone does not satisfy — missing a divine caster", () => {
        const doc = readyDoc([{ tag: "wizard", level: 3 }]);
        const res = evaluateClassPrereqs(mysticTheurge, doc, ref, 0);
        expect(res.checks.find((c) => c.label.includes("divine"))?.met).toBe(false);
        expect(res.checks.find((c) => c.label.includes("arcane"))?.met).toBe(true);
        expect(res.blocked).toBe(true);
      });

      it("Cleric 3 alone does not satisfy — missing an arcane caster", () => {
        const doc = readyDoc([{ tag: "cleric", level: 3 }]);
        const res = evaluateClassPrereqs(mysticTheurge, doc, ref, 0);
        expect(res.checks.find((c) => c.label.includes("arcane"))?.met).toBe(false);
        expect(res.checks.find((c) => c.label.includes("divine"))?.met).toBe(true);
        expect(res.blocked).toBe(true);
      });

      it("a Wizard 3 / Cleric 3 multiclass satisfies BOTH requirements", () => {
        const doc = readyDoc([
          { tag: "wizard", level: 3 },
          { tag: "cleric", level: 3 },
        ]);
        const res = evaluateClassPrereqs(mysticTheurge, doc, ref, 0);
        expect(res.checks.every((c) => c.met)).toBe(true);
        expect(res.blocked).toBe(false);
      });
    });
  });

  describe("prose-only classes (Loremaster)", () => {
    const loremaster = classByTag("loremaster");

    it("has no structured checks and never blocks, but always warns", () => {
      const doc = createEmptyDoc("t");
      const res = evaluateClassPrereqs(loremaster, doc, ref, 0);
      expect(res.checks).toEqual([]);
      expect(res.blocked).toBe(false);
      expect(res.warn).toBe(true);
      expect(res.softText).toBeDefined();
    });

    it("still never blocks even for a high-level, fully-built character", () => {
      const doc = classed([{ tag: "wizard", level: 20 }]);
      const res = evaluateClassPrereqs(loremaster, doc, ref, 15);
      expect(res.blocked).toBe(false);
    });
  });
});
