import { describe, expect, it } from "bun:test";

import {
  isPfDataCatalogEntry,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
} from "../src/util/pfdata.js";

/**
 * Unit coverage for the generic Pf Data 1e reader — the parts every future
 * subsystem import (hexes, arcana, talents, exploits, wild talents) reuses
 * as-is. `ragePowers.test.ts` covers the rage-power -specific mapping + the
 * real vendored slice end-to-end.
 */

describe("isPfDataCatalogEntry / pfDataCatalogEntries", () => {
  it("keeps a real entry, drops redirects/copies/alternates/disambiguation pages and non-catalog shapes", () => {
    const dict: PfDataDictionary = {
      real: { name: "Real Thing", description: ["Some text."] },
      alias: { redirect: "real" },
      copy: { name: "Copy Thing", copyof: "real" },
      alt: { name: "Alt Name", alternateOf: "real" },
      ambiguous: { name: "Ambiguous", disambiguation: true, description: ["See also..."] },
      noDescription: { name: "No Description" },
    };
    expect(isPfDataCatalogEntry(dict.real!)).toBe(true);
    expect(isPfDataCatalogEntry(dict.alias!)).toBe(false);
    expect(isPfDataCatalogEntry(dict.copy!)).toBe(false);
    expect(isPfDataCatalogEntry(dict.alt!)).toBe(false);
    expect(isPfDataCatalogEntry(dict.ambiguous!)).toBe(false);
    expect(isPfDataCatalogEntry(dict.noDescription!)).toBe(false);

    expect(pfDataCatalogEntries(dict).map(([key]) => key)).toEqual(["real"]);
  });

  it("also drops caller-supplied placeholder keys (e.g. a dataset's own 'not found' sentinel)", () => {
    const dict: PfDataDictionary = {
      not_found: { name: "Unknown", description: ["## Error"] },
      real: { name: "Real Thing", description: ["Some text."] },
    };
    expect(
      pfDataCatalogEntries(dict, { skipKeys: new Set(["not_found"]) }).map(([key]) => key),
    ).toEqual(["real"]);
  });
});

describe("pfDataSourceRefs", () => {
  it("maps [book, page] compilationSources pairs to SourceRef", () => {
    expect(pfDataSourceRefs({ compilationSources: [["PRPG Core Rulebook"]] })).toEqual([
      { id: "prpg-core-rulebook" },
    ]);
    expect(pfDataSourceRefs({ compilationSources: [["Some Book", 42]] })).toEqual([
      { id: "some-book", pages: "42" },
    ]);
  });

  it("returns undefined when there's nothing to report", () => {
    expect(pfDataSourceRefs({})).toBeUndefined();
  });
});

describe("pfDataDescriptionToHtml", () => {
  it("joins soft-wrapped lines into one paragraph and converts markdown emphasis", () => {
    const html = pfDataDescriptionToHtml(["While *raging,* the barbarian gains a **bonus**."]);
    expect(html).toBe(
      "<p>While <em>raging,</em> the barbarian gains a <strong>bonus</strong>.</p>",
    );
  });

  it("splits blank-line-delimited blocks into separate paragraphs", () => {
    const html = pfDataDescriptionToHtml(["First paragraph.", "", "Second paragraph."]);
    expect(html).toBe("<p>First paragraph.</p>\n<p>Second paragraph.</p>");
  });

  it("resolves ‹protocol/text› cross-refs to plain display text, dropping <url-only> and «»-marked-but-kept segments", () => {
    const html = pfDataDescriptionToHtml(["Requires ‹ragepower/animal fury›."]);
    expect(html).toBe("<p>Requires animal fury.</p>");

    const withUrlOnly = pfDataDescriptionToHtml(["Choose ‹ragepower/spring<_rage› or similar."]);
    expect(withUrlOnly).toBe("<p>Choose spring or similar.</p>");

    const withExtraText = pfDataDescriptionToHtml(["Deals bleed ‹eq-weapon/dagger«s»› damage."]);
    expect(withExtraText).toBe("<p>Deals bleed daggers damage.</p>");
  });

  it("resolves @ripple/@hll link directives the same way as ‹…›", () => {
    const html = pfDataDescriptionToHtml(["Becomes @ripple[misc/Staggered]."]);
    expect(html).toBe("<p>Becomes Staggered.</p>");
  });

  it("leaves no ‹›«» characters in the output", () => {
    const html = pfDataDescriptionToHtml([
      "A ‹protocol/complex«extra» text<_url> reference› here.",
    ]);
    expect(html).not.toMatch(/[‹›«»]/);
  });

  it("renders a GFM-style table with a header row", () => {
    const html = pfDataDescriptionToHtml([
      "| A | B |",
      "| --- | --- |",
      "| one | @ripple[misc/Two] |",
    ]);
    expect(html).toBe(
      "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>one</td><td>Two</td></tr></tbody></table>",
    );
  });

  it("renders a ::aff[Name]{...} affliction block as the printed one-line shape, cross-refs resolved", () => {
    const html = pfDataDescriptionToHtml([
      '::aff[Curse of Fire]{iconC curse eff="Target gains ‹umr/vulnerability› to fire"}',
    ]);
    expect(html).toBe(
      "<p><strong>Curse of Fire:</strong> Curse; <em>effect</em> Target gains vulnerability to fire</p>",
    );
  });

  it("spells an ::aff effect from ability-damage keys and composes save/frequency/cure", () => {
    const html = pfDataDescriptionToHtml([
      '::aff{iconP poison type=Bite-injury saveF=14 freqR=6 effStr="1d3" cure1}',
    ]);
    expect(html).toBe(
      "<p>Poison; Bite-injury; <em>save</em> Fort DC 14; <em>frequency</em> 1/round for 6 rounds; <em>effect</em> 1d3 Str damage; <em>cure</em> 1 save</p>",
    );
  });

  it("escapes stray HTML-significant characters in prose", () => {
    const html = pfDataDescriptionToHtml(["Deals 1 < 2 & 3 > 0 damage."]);
    expect(html).toBe("<p>Deals 1 &lt; 2 &amp; 3 &gt; 0 damage.</p>");
  });

  it("strips blockquote '>' markers, treating a bare '>' line as a paragraph break (issue #74)", () => {
    const html = pfDataDescriptionToHtml([
      ">**First Power (Su):** Does a thing.",
      ">",
      ">**Second Power (Ex):** Does another thing.",
    ]);
    expect(html).toBe(
      "<p><strong>First Power (Su):</strong> Does a thing.</p>\n<p><strong>Second Power (Ex):</strong> Does another thing.</p>",
    );
  });

  it("drops a ':::label' ... ':::' fenced note block's delimiter lines, keeping its content as plain prose", () => {
    const html = pfDataDescriptionToHtml([
      "Before.",
      "",
      ":::elephant",
      "Extra errata text.",
      ":::",
      "",
      "After.",
    ]);
    expect(html).toBe("<p>Before.</p>\n<p>Extra errata text.</p>\n<p>After.</p>");
  });

  it("renders an inline '### Section' markdown header as a bold paragraph, not literal '###' text", () => {
    const html = pfDataDescriptionToHtml(["### Bloodline Powers"]);
    expect(html).toBe("<p><strong>Bloodline Powers</strong></p>");
  });

  it("renders a '::h3[Text]{...}' sub-heading directive as a bold paragraph", () => {
    const html = pfDataDescriptionToHtml(["::h3[Warped (Wildblooded Mutation)]{jl}"]);
    expect(html).toBe("<p><strong>Warped (Wildblooded Mutation)</strong></p>");
  });

  it("renders a '::list[Label]{all=\"A~B~C\"}' directive as a labeled comma-joined list", () => {
    const html = pfDataDescriptionToHtml(['::list[Bonus Feats]{link=feat all="Dodge~Toughness"}']);
    expect(html).toBe("<p><strong>Bonus Feats:</strong> Dodge, Toughness</p>");
  });

  it('renders a \'::ab[Name]{l=N passive="..." impNN="..."}\' ability directive with its level and improvement folded in', () => {
    const html = pfDataDescriptionToHtml([
      '::ab[Aberrant Fortitude (Su)]{l=8 icon=def passive="You become immune to sickened." imp16="Also immune to nauseated."}',
    ]);
    expect(html).toBe(
      "<p><strong>Aberrant Fortitude (Su) (Level 8):</strong> You become immune to sickened. At 16th level: Also immune to nauseated.</p>",
    );
  });

  it("renders a '::ab[...]' directive with only level-keyed spell values as a level list", () => {
    const html = pfDataDescriptionToHtml([
      '::ab[Bonus Spells by Bloodrager Level]{icon=learn s7="Bless" s10="Resist energy"}',
    ]);
    expect(html).toBe(
      "<p><strong>Bonus Spells by Bloodrager Level:</strong> Level 7: Bless; Level 10: Resist energy</p>",
    );
  });

  it("renders a '::ab[...]' directive with only level-keyed lNN stat lines as an 'At Nth level' list (Aquatic bloodrager bloodline's Watersense)", () => {
    const html = pfDataDescriptionToHtml([
      '::ab[Watersense (Ex)]{icon=power l6="Gain resist electricity 10" l12="Resistance increases to 20"}',
    ]);
    expect(html).toBe(
      "<p><strong>Watersense (Ex):</strong> At 6th level: Gain resist electricity 10 At 12th level: Resistance increases to 20</p>",
    );
  });

  // The dataset moved the ability name out of the `[bracket]` and into a
  // `title` prop wrapped in its own `&L&`/`&FN&` markers. Both forms occur.
  it("reads a bracket-less '::ab' directive's name from its title prop", () => {
    const html = pfDataDescriptionToHtml([
      '::ab{title="&L&Animal Fury (Ex)&FN&" icon=melee ability="The barbarian gains a bite attack."}',
    ]);
    expect(html).toBe("<p><strong>Animal Fury:</strong> The barbarian gains a bite attack.</p>");
  });

  it("folds an '::ab' directive's special and prereq props into its body", () => {
    const html = pfDataDescriptionToHtml([
      '::ab{title="&L&Greater Fury&FN&" ability="Works as animal fury." special="The bite deals more damage." prereq="‹ragepower/Animal fury›"}',
    ]);
    expect(html).toBe(
      "<p><strong>Greater Fury:</strong> Works as animal fury. The bite deals more damage. (Prerequisite: Animal fury)</p>",
    );
  });

  it("renders a '::prereq' directive as the prerequisite line the books print", () => {
    expect(pfDataDescriptionToHtml(["::prereq{r=Goblin}"])).toBe(
      "<p><strong>Prerequisite:</strong> Goblin</p>",
    );
    expect(pfDataDescriptionToHtml(["::prereq{l=6 c=alchemist}"])).toBe(
      "<p><strong>Prerequisite:</strong> alchemist 6</p>",
    );
    expect(
      pfDataDescriptionToHtml([
        '::prereq{l=6 c=alchemist g1="anguish bomb" g1title="Class Feature or Discovery"}',
      ]),
    ).toBe(
      "<p><strong>Prerequisites:</strong> alchemist 6; Class Feature or Discovery: anguish bomb</p>",
    );
  });

  it("resolves cross-refs inside a '::prereq' directive's free-prose 'other'", () => {
    const html = pfDataDescriptionToHtml([
      '::prereq{other="A mooncursed must either be a ‹type/humanoid› or ‹type/monstrous humanoid›."}',
    ]);
    expect(html).toBe(
      "<p><strong>Prerequisite:</strong> A mooncursed must either be a humanoid or monstrous humanoid.</p>",
    );
  });

  it("renders the whole heading-directive family, not just ::h3", () => {
    expect(pfDataDescriptionToHtml(["::sh[Special Abilities]"])).toBe(
      "<p><strong>Special Abilities</strong></p>",
    );
    expect(pfDataDescriptionToHtml(['::h4[Archdevils]{jl extra="(aligned and racial)"}'])).toBe(
      "<p><strong>Archdevils</strong> (aligned and racial)</p>",
    );
  });

  it("drops a bare layout '::div' container, which carries no content", () => {
    expect(pfDataDescriptionToHtml(["::div{className=reduce}", "", "Real prose."])).toBe(
      "<p>Real prose.</p>",
    );
  });
});
