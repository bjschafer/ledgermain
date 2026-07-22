import { describe, expect, it } from "bun:test";

import {
  isPfDataCatalogEntry,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
} from "../src/util/pfdata.js";

/**
 * Unit coverage for the generic Pf Data 1e reader (issue #74 Phase 3a) — the
 * parts every future subsystem import (hexes, arcana, talents, exploits,
 * wild talents) reuses as-is. `ragePowers.test.ts` covers the rage-power
 * -specific mapping + the real vendored slice end-to-end.
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

  it('renders a ::aff[Name]{eff="..."} affliction block as a labeled paragraph, cross-refs resolved', () => {
    const html = pfDataDescriptionToHtml([
      '::aff[Curse of Fire]{iconC curse eff="Target gains ‹umr/vulnerability› to fire"}',
    ]);
    expect(html).toBe("<p><strong>Curse of Fire:</strong> Target gains vulnerability to fire</p>");
  });

  it("escapes stray HTML-significant characters in prose", () => {
    const html = pfDataDescriptionToHtml(["Deals 1 < 2 & 3 > 0 damage."]);
    expect(html).toBe("<p>Deals 1 &lt; 2 &amp; 3 &gt; 0 damage.</p>");
  });
});
