import { describe, expect, it } from "bun:test";

import { loadMonsters, loadMonsterTemplates, loadRefData } from "../src/index.js";

/**
 * The Pf Data 1e dataset writes its prose in a `marked-directive` dialect
 * (`util/pfdata.ts`). An unhandled directive is not dropped, it is emitted
 * verbatim, so it reaches the reader as `::prereq{l=8 c=alchemist}` where the
 * book prints "Prerequisite: alchemist 8".
 *
 * Several collections carried a guard like this of their own and several did
 * not, which is exactly how 231 leaks came to ship: the directives that only
 * appear in an unguarded collection had nothing watching them. This sweeps
 * every prose field of every collection instead, so the next time the dataset
 * changes its authoring format the failure lands here rather than on screen.
 *
 * Matching is deliberately narrow: `::name{` / `::name[` is directive syntax,
 * while a bare `::` is not (the archetype module has a genuine "Bonus Feat::"
 * typo, which is upstream's prose to fix, not a parser gap).
 */
const DIRECTIVE_RE = /::[a-z][a-zA-Z0-9]*[[{]/;
/** The dataset's angle-quote cross-ref system, and its inline link directives. */
const CROSS_REF_RE = /[‹›«»]/;
// Two forms. Every inline directive has a bracketed one; only the link family
// also has a bracket-less `@HLfree_action`, which the bracketed-only pattern
// missed entirely (1,592 occurrences upstream). The bare form is deliberately
// NOT extended to `b`/`i`/`em`/`span`: Foundry roll data is full of
// `@item.level` and `@abilities.str.mod`, which such a pattern would read as a
// leaked `@i`/`@b` directive.
const INLINE_DIRECTIVE_RE =
  /@(?:ripple|hll|HL|hl|b|strong|i|em|span|FN|list)\[|@(?:HL|hll|hl|ripple)[A-Za-z][A-Za-z0-9_]*/;

/** Every string field that carries rendered prose to a reader. */
const PROSE_FIELDS = [
  "description",
  "minorPower",
  "majorPower",
  "specialAbilitiesHtml",
  "spellsHtml",
  "prereqText",
] as const;

function proseOf(value: unknown): { field: string; text: string }[] {
  if (typeof value !== "object" || value === null) return [];
  const out: { field: string; text: string }[] = [];
  for (const field of PROSE_FIELDS) {
    const text = (value as Record<string, unknown>)[field];
    if (typeof text === "string" && text !== "") out.push({ field, text });
  }
  return out;
}

/** Every named collection in RefData, plus the two sidecars, as `[label, entries]`. */
function allCollections(): [string, unknown[]][] {
  const ref = loadRefData() as unknown as Record<string, unknown>;
  const out: [string, unknown[]][] = [];
  for (const [name, collection] of Object.entries(ref)) {
    if (name === "meta" || typeof collection !== "object" || collection === null) continue;
    out.push([name, Object.values(collection as Record<string, unknown>)]);
  }
  out.push(["monsters", Object.values(loadMonsters())]);
  out.push(["monsterTemplates", Object.values(loadMonsterTemplates())]);
  return out;
}

const COLLECTIONS = allCollections();

describe("no collection leaks the Pf Data 1e authoring syntax", () => {
  it("covers every collection, including the monster sidecars", () => {
    // A collection that stops being swept is the failure mode this whole file
    // exists to prevent, so assert the sweep is actually wide.
    expect(COLLECTIONS.length).toBeGreaterThan(50);
    expect(COLLECTIONS.map(([name]) => name)).toContain("monsters");
    expect(COLLECTIONS.map(([name]) => name)).toContain("alchemistDiscoveries");
  });

  for (const [name, entries] of COLLECTIONS) {
    it(`${name} renders every directive`, () => {
      const leaks: string[] = [];
      for (const entry of entries) {
        for (const { field, text } of proseOf(entry)) {
          if (!DIRECTIVE_RE.test(text)) continue;
          const at = text.search(DIRECTIVE_RE);
          const label = (entry as { name?: string }).name ?? "?";
          leaks.push(`${label} [${field}]: ${text.slice(at, at + 80)}`);
        }
      }
      expect(leaks.slice(0, 5), `${leaks.length} entries leak directive syntax`).toEqual([]);
    });

    it(`${name} resolves every cross-ref and inline directive`, () => {
      const leaks: string[] = [];
      for (const entry of entries) {
        for (const { field, text } of proseOf(entry)) {
          if (!CROSS_REF_RE.test(text) && !INLINE_DIRECTIVE_RE.test(text)) continue;
          const label = (entry as { name?: string }).name ?? "?";
          leaks.push(`${label} [${field}]`);
        }
      }
      expect(leaks.slice(0, 5), `${leaks.length} entries leak cross-ref syntax`).toEqual([]);
    });
  }
});
