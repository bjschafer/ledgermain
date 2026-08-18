import { describe, expect, it } from "bun:test";

import {
  compute,
  effectiveSpellLevel,
  FAMILIAR_TEMPLATES,
  IMPROVED_FAMILIARS,
  spellIdByName,
  type DerivedFamiliarSla,
} from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  addClass,
  createEmptyDoc,
  setAlignment,
  setClassLevel,
  toggleFeat,
} from "../src/model/doc.js";
import { alignmentWithinOneStep } from "../src/model/alignment.js";
import {
  deriveFamiliarSheet,
  improvedFamiliarPrereqWarnings,
  resetFamiliarSlaUses,
  restoreFamiliarSla,
  setFamiliar,
  setFamiliarTemplate,
  spendFamiliarSla,
} from "../src/model/familiar.js";
import {
  familiarSlaDc,
  familiarTemplateOptions,
  formatCreatureDefenses,
  formatImprovedFamiliarPrereq,
  formatSlaFrequency,
  improvedFamiliarOptions,
} from "../src/model/familiarDisplay.js";
import { restNewDay } from "../src/model/rest.js";

const ref = loadRefData();

function wizard7(): CharacterDoc {
  let d = createEmptyDoc("t");
  d = addClass(d, "wizard");
  d = setClassLevel(d, "wizard", 7);
  d = { ...d, abilities: { ...d.abilities, int: 20 } };
  return d;
}

const improvedFamiliarFeatId = Object.values(ref.feats).find(
  (f) => f.name === "Improved Familiar",
)!.id;

describe("setFamiliar — improved species", () => {
  it("auto-names an improved species (no BASE_FAMILIARS entry)", () => {
    const d = setFamiliar(createEmptyDoc("t"), "imp", "");
    expect(d.build.familiar?.name).toBe("Imp");
  });

  it("drops a standard-animal template when switching to an improved species", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Whiskers");
    d = setFamiliarTemplate(d, "celestial");
    expect(d.build.familiar?.template).toBe("celestial");

    d = setFamiliar(d, "imp", "Whiskers");
    expect(d.build.familiar?.speciesId).toBe("imp");
    expect(d.build.familiar?.template).toBeUndefined();
  });
});

describe("setFamiliarTemplate", () => {
  it("no-ops without a familiar", () => {
    const d = createEmptyDoc("t");
    expect(setFamiliarTemplate(d, "celestial")).toBe(d);
  });

  it("no-ops when the current species is itself improved", () => {
    const d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    expect(setFamiliarTemplate(d, "celestial")).toBe(d);
  });

  it("no-ops for an unrecognized template id", () => {
    const d = setFamiliar(createEmptyDoc("t"), "cat", "Whiskers");
    expect(setFamiliarTemplate(d, "not-a-template")).toBe(d);
  });

  it("sets a valid template on a standard animal", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Whiskers");
    d = setFamiliarTemplate(d, "celestial");
    expect(d.build.familiar?.template).toBe("celestial");
  });

  it("undefined clears an existing template", () => {
    let d = setFamiliar(createEmptyDoc("t"), "cat", "Whiskers");
    d = setFamiliarTemplate(d, "celestial");
    d = setFamiliarTemplate(d, undefined);
    expect(d.build.familiar?.template).toBeUndefined();
  });
});

describe("spendFamiliarSla / restoreFamiliarSla / resetFamiliarSlaUses", () => {
  it("spend increments the spent counter, clamped to the def's usesMax (imp's augury: 1/day)", () => {
    let d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    d = spendFamiliarSla(d, "augury");
    expect(d.live.familiar?.slaUses?.augury).toBe(1);
    d = spendFamiliarSla(d, "augury");
    expect(d.live.familiar?.slaUses?.augury).toBe(1);
  });

  it("restore decrements the spent counter, clamped at 0", () => {
    let d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    d = spendFamiliarSla(d, "augury");
    d = restoreFamiliarSla(d, "augury");
    expect(d.live.familiar?.slaUses?.augury).toBe(0);
    d = restoreFamiliarSla(d, "augury");
    expect(d.live.familiar?.slaUses?.augury).toBe(0);
  });

  it("spend/restore no-op for an at-will ability (invisibility)", () => {
    const d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    expect(spendFamiliarSla(d, "invisibility")).toBe(d);
    expect(restoreFamiliarSla(d, "invisibility")).toBe(d);
  });

  it("spend/restore no-op for an unknown slug", () => {
    const d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    expect(spendFamiliarSla(d, "nope")).toBe(d);
    expect(restoreFamiliarSla(d, "nope")).toBe(d);
  });

  it("resetFamiliarSlaUses clears the spent-uses map", () => {
    let d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    d = spendFamiliarSla(d, "augury");
    d = resetFamiliarSlaUses(d);
    expect(d.live.familiar?.slaUses).toBeUndefined();
  });

  it("resetFamiliarSlaUses no-ops when nothing is spent", () => {
    const d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    expect(resetFamiliarSlaUses(d)).toBe(d);
  });
});

describe("restNewDay clears familiar SLA uses", () => {
  it("clears spent familiar SLA uses on a new day", () => {
    let d = setFamiliar(createEmptyDoc("t"), "imp", "Grimm");
    d = spendFamiliarSla(d, "augury");
    expect(d.live.familiar?.slaUses?.augury).toBe(1);

    const result = restNewDay(d);
    expect(result.doc.live.familiar?.slaUses).toBeUndefined();
  });

  it("leaves a familiar-less doc's live state unaffected", () => {
    const d = createEmptyDoc("t");
    const result = restNewDay(d);
    expect(result.doc.live.familiar).toBeUndefined();
  });
});

describe("alignmentWithinOneStep", () => {
  it("LE vs LN — within one step (moral axis only)", () => {
    expect(alignmentWithinOneStep("LE", "LN")).toBe(true);
  });

  it("LE vs CG — two steps on both axes", () => {
    expect(alignmentWithinOneStep("LE", "CG")).toBe(false);
  });

  it("N (true neutral) is within one step of any alignment", () => {
    expect(alignmentWithinOneStep("N", "LG")).toBe(true);
    expect(alignmentWithinOneStep("N", "CE")).toBe(true);
    expect(alignmentWithinOneStep("N", "LE")).toBe(true);
  });

  it("bare 'N' parses as true neutral on both sides", () => {
    expect(alignmentWithinOneStep("N", "N")).toBe(true);
  });

  it("returns undefined when either side fails to parse", () => {
    expect(alignmentWithinOneStep("garbage", "LE")).toBeUndefined();
    expect(alignmentWithinOneStep("LE", "???")).toBeUndefined();
  });
});

describe("improvedFamiliarPrereqWarnings — imp's prereq (CL 7, LE)", () => {
  const impPrereq = IMPROVED_FAMILIARS.imp!.prereq;

  it("warns when the Improved Familiar feat is missing", () => {
    let d = wizard7();
    d = setAlignment(d, "LE");
    const warnings = improvedFamiliarPrereqWarnings(d, ref, impPrereq);
    expect(warnings).toContain("Requires the Improved Familiar feat");
  });

  it("warns when caster level falls short", () => {
    let d = wizard7();
    d = setClassLevel(d, "wizard", 3);
    d = toggleFeat(d, improvedFamiliarFeatId);
    d = setAlignment(d, "LE");
    const warnings = improvedFamiliarPrereqWarnings(d, ref, impPrereq);
    expect(warnings.some((w) => w.includes("caster level 7"))).toBe(true);
  });

  it("warns when alignment is out of range", () => {
    let d = wizard7();
    d = toggleFeat(d, improvedFamiliarFeatId);
    d = setAlignment(d, "NG");
    const warnings = improvedFamiliarPrereqWarnings(d, ref, impPrereq);
    expect(warnings.some((w) => w.includes("Alignment"))).toBe(true);
  });

  it("returns no warnings when every prerequisite is met", () => {
    let d = wizard7();
    d = toggleFeat(d, improvedFamiliarFeatId);
    d = setAlignment(d, "LE");
    expect(improvedFamiliarPrereqWarnings(d, ref, impPrereq)).toEqual([]);
  });

  it("never warns about alignment when the master's alignment is unset", () => {
    let d = wizard7();
    d = toggleFeat(d, improvedFamiliarFeatId);
    const warnings = improvedFamiliarPrereqWarnings(d, ref, impPrereq);
    expect(warnings.some((w) => w.includes("Alignment"))).toBe(false);
  });
});

describe("formatCreatureDefenses / formatSlaFrequency / familiarSlaDc — imp + celestial fixtures", () => {
  it("formatCreatureDefenses formats the imp's printed defenses", () => {
    const text = formatCreatureDefenses(IMPROVED_FAMILIARS.imp!.defenses);
    expect(text).toBe(
      "DR 5/good or silver · Immune fire, poison · Resist acid 10, cold 10 · Fast healing 2",
    );
  });

  it("formatCreatureDefenses formats the celestial template's 1-HD tier", () => {
    const text = formatCreatureDefenses(FAMILIAR_TEMPLATES.celestial!.defensesForHd(1));
    expect(text).toBe("Resist acid 5, cold 5, electricity 5");
  });

  it("formatSlaFrequency labels constant / at-will / metered frequencies", () => {
    expect(formatSlaFrequency("constant")).toBe("Constant");
    expect(formatSlaFrequency("atWill")).toBe("At will");
    expect(formatSlaFrequency({ uses: 1, per: "day" })).toBe("1/day");
    expect(formatSlaFrequency({ uses: 2, per: "day" })).toBe("2/day");
    expect(formatSlaFrequency({ uses: 1, per: "week" })).toBe("1/week");
  });

  it("familiarSlaDc resolves the imp's augury DC against real refData", () => {
    let d = wizard7();
    d = setFamiliar(d, "imp", "Grimm");
    const sheet = compute(d, ref);
    const familiar = deriveFamiliarSheet(d, ref, sheet)!;
    const augury = familiar.slas!.find((s) => s.slug === "augury")!;

    const dc = familiarSlaDc(augury, ref);
    const spellId = spellIdByName(ref, augury.spell)!;
    const spell = ref.spells[spellId]!;
    expect(dc).toBe(10 + effectiveSpellLevel(spell) + augury.dcMod);
  });

  it("familiarSlaDc returns undefined when the spell name doesn't resolve", () => {
    const bogus: DerivedFamiliarSla = {
      slug: "x",
      name: "Nonexistent Spell",
      spell: "Nonexistent Spell",
      frequency: "atWill",
      cl: 6,
      dcMod: 2,
    };
    expect(familiarSlaDc(bogus, ref)).toBeUndefined();
  });

  it("formatImprovedFamiliarPrereq quotes the published prereq, alignment clause included", () => {
    expect(formatImprovedFamiliarPrereq(IMPROVED_FAMILIARS.imp!.prereq)).toBe(
      "Improved Familiar feat, caster level 7, alignment within one step of LE",
    );
  });

  it("improvedFamiliarOptions/familiarTemplateOptions include the imp and celestial fixtures", () => {
    expect(improvedFamiliarOptions().some((o) => o.id === "imp")).toBe(true);
    expect(familiarTemplateOptions().some((o) => o.id === "celestial")).toBe(true);
  });
});
