/**
 * Model tests for the Craft/Profession/Perform parameterized-subskill
 * transitions added for issue #24: `addSkillInstance` / `renameSkillInstance`
 * in `model/doc.ts`, and the slug<->label helpers in `model/names.ts`.
 */
import { describe, expect, it } from "bun:test";

import {
  addClass,
  addSkillInstance,
  createEmptyDoc,
  renameSkillInstance,
  setClassLevel,
  setSkillRank,
} from "../src/model/doc.js";
import { skillName, slugifySkillLabel } from "../src/model/names.js";

/** A level-5 doc so skill ranks up to 5 don't get clamped by totalLevel. */
function leveledDoc() {
  return setClassLevel(addClass(createEmptyDoc("t"), "fighter"), "fighter", 5);
}

describe("slugifySkillLabel", () => {
  it("lowercases and collapses whitespace/punctuation to dashes", () => {
    expect(slugifySkillLabel("Alchemy")).toBe("alchemy");
    expect(slugifySkillLabel("Basket Weaving!")).toBe("basket-weaving");
    expect(slugifySkillLabel("  Oratory  ")).toBe("oratory");
  });

  it("returns '' for a label with no alphanumeric content", () => {
    expect(slugifySkillLabel("   ")).toBe("");
    expect(slugifySkillLabel("---")).toBe("");
  });
});

describe("skillName: parameterized instances", () => {
  it("renders 'Base (Label)' from the slug, with no separate stored label", () => {
    expect(skillName("crf.alchemy")).toBe("Craft (Alchemy)");
    expect(skillName("prf.basket-weaving")).toBe("Perform (Basket Weaving)");
  });

  it("bare ids are unaffected", () => {
    expect(skillName("crf")).toBe("Craft");
    expect(skillName("per")).toBe("Perception");
  });
});

describe("addSkillInstance", () => {
  it("creates a 'base.slug' id at 1 rank", () => {
    const doc = addSkillInstance(leveledDoc(), "crf", "Alchemy");
    expect(doc.build.skillRanks["crf.alchemy"]).toBe(1);
  });

  it("is a no-op for a blank label", () => {
    const base = leveledDoc();
    expect(addSkillInstance(base, "crf", "   ")).toBe(base);
  });

  it("disambiguates a slug collision with a numeric suffix", () => {
    let doc = addSkillInstance(leveledDoc(), "prf", "Oratory");
    doc = addSkillInstance(doc, "prf", "Oratory");
    expect(doc.build.skillRanks["prf.oratory"]).toBe(1);
    expect(doc.build.skillRanks["prf.oratory-2"]).toBe(1);
  });

  it("two Perform instances carry independent ranks (via setSkillRank afterward)", () => {
    let doc = addSkillInstance(leveledDoc(), "prf", "Oratory");
    doc = addSkillInstance(doc, "prf", "Dancing");
    doc = setSkillRank(doc, "prf.oratory", 5);
    doc = setSkillRank(doc, "prf.dancing", 2);
    expect(doc.build.skillRanks["prf.oratory"]).toBe(5);
    expect(doc.build.skillRanks["prf.dancing"]).toBe(2);
  });

  it("does not disturb an existing bare 'crf' entry (back-compat coexistence)", () => {
    let doc = setSkillRank(leveledDoc(), "crf", 3);
    doc = addSkillInstance(doc, "crf", "Alchemy");
    expect(doc.build.skillRanks.crf).toBe(3);
    expect(doc.build.skillRanks["crf.alchemy"]).toBe(1);
  });
});

describe("setSkillRank: removing a parameterized instance", () => {
  it("dropping ranks to 0 deletes the instance entirely, same as any skill", () => {
    let doc = addSkillInstance(leveledDoc(), "crf", "Alchemy");
    doc = setSkillRank(doc, "crf.alchemy", 0);
    expect("crf.alchemy" in doc.build.skillRanks).toBe(false);
  });
});

describe("renameSkillInstance", () => {
  it("moves ranks from the old id to the re-slugged new id", () => {
    let doc = addSkillInstance(leveledDoc(), "prf", "Oratory");
    doc = setSkillRank(doc, "prf.oratory", 4);
    doc = renameSkillInstance(doc, "prf.oratory", "Singing");
    expect(doc.build.skillRanks["prf.oratory"]).toBeUndefined();
    expect(doc.build.skillRanks["prf.singing"]).toBe(4);
  });

  it("is a no-op on a bare (non-parameterized) id", () => {
    const doc = setSkillRank(leveledDoc(), "crf", 2);
    expect(renameSkillInstance(doc, "crf", "Alchemy")).toBe(doc);
  });

  it("is a no-op when the new slug collides with an existing instance", () => {
    let doc = addSkillInstance(leveledDoc(), "prf", "Oratory");
    doc = addSkillInstance(doc, "prf", "Dancing");
    const before = doc;
    doc = renameSkillInstance(doc, "prf.oratory", "Dancing");
    expect(doc).toBe(before);
  });

  it("is a no-op for a blank new label", () => {
    let doc = addSkillInstance(leveledDoc(), "prf", "Oratory");
    const before = doc;
    doc = renameSkillInstance(doc, "prf.oratory", "   ");
    expect(doc).toBe(before);
  });
});
