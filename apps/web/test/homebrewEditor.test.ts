/**
 * Homebrew race/feat/trait editor form-state mapping (`model/
 * homebrewEditor.ts`, phase 2 of homebrew content support). Covers
 * validation, the ability-modifier encoding (must match vendored fixed-mod
 * races bit-for-bit — see `buildHomebrewRace`'s doc comment and the Elf
 * fixture below), and the draft <-> entity round-trip used by the edit form.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import { raceGrantsFlexibleAbility } from "@pf1/engine";

import {
  buildHomebrewFeat,
  buildHomebrewRace,
  buildHomebrewTrait,
  descriptionHtmlToText,
  emptyHomebrewFeatDraft,
  emptyHomebrewRaceDraft,
  emptyHomebrewTraitDraft,
  featToDraft,
  raceToDraft,
  textToDescriptionHtml,
  traitToDraft,
} from "../src/model/homebrewEditor.js";

const ref = loadRefData();

describe("buildHomebrewRace()", () => {
  it("rejects a blank name", () => {
    const result = buildHomebrewRace("hb-1", { ...emptyHomebrewRaceDraft(), name: "  " });
    expect(result.ok).toBe(false);
  });

  it("builds a flexible-ability race with no ability changes", () => {
    const result = buildHomebrewRace("hb-1", { ...emptyHomebrewRaceDraft(), name: "Sprite" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.changes.some((c) =>
        ["str", "dex", "con", "int", "wis", "cha"].includes(c.target),
      ),
    ).toBe(false);
    expect(raceGrantsFlexibleAbility(result.value)).toBe(true);
  });

  it("encodes fixed ability modifiers identically to a vendored fixed-mod race (Elf)", () => {
    const elf = Object.values(ref.races).find((r) => r.name === "Elf");
    if (!elf) throw new Error("Elf not found in vendored data");
    const elfDexChange = elf.changes.find((c) => c.target === "dex");
    expect(elfDexChange).toEqual({ formula: "2", target: "dex", type: "racial" });

    const result = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Fixed Folk",
      abilityMode: "fixed",
      abilityMods: { dex: 2, int: 2, con: -2 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual(
      expect.arrayContaining([
        { formula: "2", target: "dex", type: "racial" },
        { formula: "2", target: "int", type: "racial" },
        { formula: "-2", target: "con", type: "racial" },
      ]),
    );
    expect(raceGrantsFlexibleAbility(result.value)).toBe(false);
  });

  it("omits ability mods left at 0 in fixed mode", () => {
    const result = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Half Fixed",
      abilityMode: "fixed",
      abilityMods: { str: 2, dex: 0 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual([{ formula: "2", target: "str", type: "racial" }]);
  });

  it("builds speeds from land + other modes, dropping non-positive extras", () => {
    const result = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Flyer",
      landSpeed: 20,
      otherSpeeds: [
        { mode: "fly", value: 40 },
        { mode: "swim", value: 0 },
        { mode: "  ", value: 30 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.speeds).toEqual({ land: 20, fly: 40 });
  });

  it("defaults creature type to humanoid when left blank", () => {
    const result = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Blank Type",
      creatureType: "  ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.creatureTypes).toEqual(["humanoid"]);
  });

  it("includes classSkills only when non-empty", () => {
    const withSkills = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Swimmer",
      classSkills: ["swm"],
    });
    const withoutSkills = buildHomebrewRace("hb-1", { ...emptyHomebrewRaceDraft(), name: "Plain" });
    if (withSkills.ok) expect(withSkills.value.classSkills).toEqual(["swm"]);
    if (withoutSkills.ok) expect(withoutSkills.value.classSkills).toBeUndefined();
  });

  it("merges extra typed-bonus changes alongside ability changes", () => {
    const result = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Bonused",
      abilityMode: "fixed",
      abilityMods: { str: 2 },
      extraChanges: [{ target: "skill.per", type: "racial", value: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual(
      expect.arrayContaining([
        { formula: "2", target: "str", type: "racial" },
        { formula: "2", target: "skill.per", type: "racial" },
      ]),
    );
  });
});

describe("raceToDraft()", () => {
  it("round-trips a fixed-mod race's ability mods back into abilityMods", () => {
    const built = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Fixed Folk",
      abilityMode: "fixed",
      abilityMods: { dex: 2, con: -2 },
    });
    if (!built.ok) throw new Error("build failed");
    const draft = raceToDraft(built.value);
    expect(draft.abilityMode).toBe("fixed");
    expect(draft.abilityMods.dex).toBe(2);
    expect(draft.abilityMods.con).toBe(-2);
  });

  it("classifies a race with zero ability changes as flexible", () => {
    const built = buildHomebrewRace("hb-1", { ...emptyHomebrewRaceDraft(), name: "Flex" });
    if (!built.ok) throw new Error("build failed");
    expect(raceToDraft(built.value).abilityMode).toBe("flexible");
  });

  it("separates ability changes from other typed bonuses into extraChanges", () => {
    const built = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Bonused",
      abilityMode: "fixed",
      abilityMods: { str: 2 },
      extraChanges: [{ target: "skill.per", type: "racial", value: 2 }],
    });
    if (!built.ok) throw new Error("build failed");
    const draft = raceToDraft(built.value);
    expect(draft.extraChanges).toEqual([{ target: "skill.per", type: "racial", value: 2 }]);
  });

  it("round-trips speeds", () => {
    const built = buildHomebrewRace("hb-1", {
      ...emptyHomebrewRaceDraft(),
      name: "Flyer",
      landSpeed: 20,
      otherSpeeds: [{ mode: "fly", value: 40 }],
    });
    if (!built.ok) throw new Error("build failed");
    const draft = raceToDraft(built.value);
    expect(draft.landSpeed).toBe(20);
    expect(draft.otherSpeeds).toEqual([{ mode: "fly", value: 40 }]);
  });
});

describe("buildHomebrewFeat()", () => {
  it("rejects a blank name", () => {
    const result = buildHomebrewFeat("hb-1", { ...emptyHomebrewFeatDraft(), name: " " });
    expect(result.ok).toBe(false);
  });

  it("builds a feat with prereqText only (no structured prereqs) — hybrid-safe, never blocks", () => {
    const result = buildHomebrewFeat("hb-1", {
      ...emptyHomebrewFeatDraft(),
      name: "Homebrew Grit",
      prereqText: "GM approval",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.prerequisites.abilities).toEqual([]);
    expect(result.value.prerequisites.bab).toBeUndefined();
    expect(result.value.prerequisites.prereqText).toBe("GM approval");
  });

  it("omits prereqText when left blank", () => {
    const result = buildHomebrewFeat("hb-1", { ...emptyHomebrewFeatDraft(), name: "No Prereqs" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.prerequisites.prereqText).toBeUndefined();
  });

  it("maps the chosen category into a single-entry tags array", () => {
    const result = buildHomebrewFeat("hb-1", {
      ...emptyHomebrewFeatDraft(),
      name: "Combat Trick",
      category: "Combat",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tags).toEqual(["Combat"]);
  });

  it("converts typed-bonus drafts into feat.changes", () => {
    const result = buildHomebrewFeat("hb-1", {
      ...emptyHomebrewFeatDraft(),
      name: "Keen Nose",
      changes: [{ target: "skill.per", type: "untyped", value: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual([{ formula: "2", target: "skill.per", type: "untyped" }]);
  });
});

describe("featToDraft()", () => {
  it("round-trips name/prereqText/category/changes", () => {
    const built = buildHomebrewFeat("hb-1", {
      name: "Keen Nose",
      description: "",
      prereqText: "GM approval",
      category: "Combat",
      changes: [{ target: "skill.per", type: "untyped", value: 2 }],
    });
    if (!built.ok) throw new Error("build failed");
    const draft = featToDraft(built.value);
    expect(draft.name).toBe("Keen Nose");
    expect(draft.prereqText).toBe("GM approval");
    expect(draft.category).toBe("Combat");
    expect(draft.changes).toEqual([{ target: "skill.per", type: "untyped", value: 2 }]);
  });
});

describe("buildHomebrewTrait()", () => {
  it("rejects a blank name", () => {
    const result = buildHomebrewTrait("hb-1", { ...emptyHomebrewTraitDraft(), name: "  " });
    expect(result.ok).toBe(false);
  });

  it("builds a trait with the chosen category and trimmed summary", () => {
    const result = buildHomebrewTrait("hb-1", {
      ...emptyHomebrewTraitDraft(),
      name: "River Rat",
      category: "Social",
      summary: "  +1 trait bonus on Swim checks.  ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe("hb-1");
    expect(result.value.category).toBe("Social");
    expect(result.value.summary).toBe("+1 trait bonus on Swim checks.");
  });

  it("converts typed-bonus drafts into trait.changes", () => {
    const result = buildHomebrewTrait("hb-1", {
      ...emptyHomebrewTraitDraft(),
      name: "Stalwart",
      changes: [{ target: "fort", type: "trait", value: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual([{ formula: "1", target: "fort", type: "trait" }]);
  });

  it("defaults to an empty changes array when none are given", () => {
    const result = buildHomebrewTrait("hb-1", {
      ...emptyHomebrewTraitDraft(),
      name: "Display Only",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.changes).toEqual([]);
  });
});

describe("traitToDraft()", () => {
  it("round-trips name/category/summary/changes", () => {
    const built = buildHomebrewTrait("hb-1", {
      ...emptyHomebrewTraitDraft(),
      name: "Stalwart",
      category: "Faith",
      summary: "+1 trait bonus on Will saves.",
      changes: [{ target: "will", type: "trait", value: 1 }],
    });
    if (!built.ok) throw new Error("build failed");
    const draft = traitToDraft(built.value);
    expect(draft.name).toBe("Stalwart");
    expect(draft.category).toBe("Faith");
    expect(draft.summary).toBe("+1 trait bonus on Will saves.");
    expect(draft.changes).toEqual([{ target: "will", type: "trait", value: 1 }]);
  });
});

describe("textToDescriptionHtml() / descriptionHtmlToText()", () => {
  it("returns undefined for blank input", () => {
    expect(textToDescriptionHtml("   ")).toBeUndefined();
  });

  it("wraps a single paragraph in <p>", () => {
    expect(textToDescriptionHtml("Deal +2 damage.")).toBe("<p>Deal +2 damage.</p>");
  });

  it("splits blank-line-separated paragraphs and converts single newlines to <br>", () => {
    const html = textToDescriptionHtml("Line one\nline two\n\nSecond paragraph");
    expect(html).toBe("<p>Line one<br>line two</p><p>Second paragraph</p>");
  });

  it("escapes HTML-significant characters so authored text can't inject markup", () => {
    const html = textToDescriptionHtml('<script>alert(1)</script> & "quoted"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;quoted&quot;");
  });

  it("round-trips text -> html -> text", () => {
    const original = "First paragraph.\n\nSecond paragraph,\nwith a soft break.";
    expect(descriptionHtmlToText(textToDescriptionHtml(original))).toBe(original);
  });

  it("returns an empty string for undefined html", () => {
    expect(descriptionHtmlToText(undefined)).toBe("");
  });
});
