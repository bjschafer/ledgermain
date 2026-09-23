import { describe, expect, it } from "bun:test";

import {
  isPfDataCatalogEntry,
  pfDataBodyLines,
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

/**
 * The `::ab` props that carry rules text since the Pf Data 1e 0.15.3 rewrite.
 * Each fixture is a real source directive (trimmed); the expected text was
 * checked against the prose the previous pin printed for the same entry,
 * cited per test.
 */
describe("pfDataDescriptionToHtml: ::ab scaling, uses, and sections", () => {
  const one = (line: string) => pfDataDescriptionToHtml([line]);

  // Bear aspect, Ultimate Wilderness 29: "+2 ... At 8th level, the bonus
  // increases to +4, and at 15th level it increases to +6."
  it("decodes increment as base~interval~first~step", () => {
    expect(
      one(
        '::ab[Minor Form]{icon=def passive="You gain a +2 bonus to Constitution." increment="The bonus~1~7~4~2"}',
      ),
    ).toBe(
      "<p><strong>Minor Form:</strong> You gain a +2 bonus to Constitution. The bonus increases to +4 at 8th level and +6 at 15th level.</p>",
    );
  });

  // Snake aspect: "These bonuses increase to +4 at 8th level and +6 at 15th level."
  it("reads a p! prefix as a plural subject", () => {
    expect(one('::ab[Minor Form]{passive="Text." increment="p!These bonuses~1~7~4~2"}')).toContain(
      "These bonuses increase to +4 at 8th level and +6 at 15th level.",
    );
  });

  // Inspire courage, CRB 38: +1, rising by 1 at 5th and every six levels.
  it("defaults the first value to 2 and the step to 1", () => {
    expect(
      one('::ab[Inspire Courage]{ability="A +1 bonus." increment="p!These bonuses~-1~6"}'),
    ).toContain(
      "These bonuses increase to +2 at 5th level, +3 at 11th level, and +4 at 17th level.",
    );
  });

  // Plains druid domain: "one additional time per day for every 3 levels after 6th".
  it("puts incrementDesc before the first value and incrementEnd after every value", () => {
    expect(
      one(
        '::ab[Pounce]{ability="Once per day." incrementPlain="You can use this~6~3" incrementDesc=ability incrementEnd=" times a day."}',
      ),
    ).toContain(
      "You can use this ability 2 times a day at 9th level, 3 times a day at 12th level, 4 times a day at 15th level, and 5 times a day at 18th level.",
    );
  });

  // Chaos blessing, ACG 64: summon monster IV, +1 spell level every 2 levels
  // beyond 10th, to summon monster IX at 20th.
  it("completes an open cross-ref with a numeral, and shortens a long series", () => {
    expect(
      one(
        '::ab[Battle Companion]{ability="As summon monster IV." incrementRoman="This now behaves as ‹spell/summon~10~2~5" incrementDesc=monster incrementEnd="›."}',
      ),
    ).toContain(
      "This now behaves as summon monster V at 12th level, summon monster VI at 14th level, and so on every 2 levels, to summon monster IX at 20th level.",
    );
  });

  // Illusion implement, Occult Adventures 51: 5% per 2 levels, capped at 50%.
  it("stops a series at incrementMax", () => {
    expect(
      one(
        '::ab[Distortion]{passive="Text." incrementPlain="The miss chance maximum~0~2~10~5" incrementEnd="%." incrementMax=19}',
      ),
    ).toContain(
      "The miss chance maximum increases to 10% at 2nd level, 15% at 4th level, and so on every 2 levels, to 50% at 18th level.",
    );
  });

  // Wood mystery, Wood Weapon: "At 7th level, 15th level, and 19th level, the
  // weapon gains a +1 enhancement bonus."
  it("reads incrementAt's explicit levels", () => {
    expect(
      one(
        '::ab[Wood Weapon (Su)]{ability="Text." incrementAt="The weapon you create has~7~15~19~1/1" incrementDesc=a incrementEnd=" enhancement bonus."}',
      ),
    ).toContain(
      "The weapon you create has a +1 enhancement bonus at 7th level, +2 enhancement bonus at 15th level, and +3 enhancement bonus at 19th level.",
    );
  });

  // Dark Tapestry, Cloak of Darkness: +4 armor and +2 Stealth, both +2 at 7th
  // and every four levels thereafter.
  it("fills each incrementMulti slot from its own series", () => {
    expect(
      one(
        '::ab[Cloak of Darkness (Su)]{ability="Text." incrementMulti="These bonuses become +~ and +~, respectively.~3/4;6/2;4/2"}',
      ),
    ).toContain(
      "At 7th level, these bonuses become +6 and +4, respectively. At 11th level, these bonuses become +8 and +6, respectively. At 15th level, these bonuses become +10 and +8, respectively. At 19th level, these bonuses become +12 and +10, respectively.",
    );
  });

  it("orders scaling series among the impNN improvements by level", () => {
    expect(
      one(
        '::ab[Voice of the Grave (Su)]{ability="Speak with dead." imp5="The dead take a -2 penalty." incrementPlain="The penalty~5~5~-4~-2"}',
      ),
    ).toBe(
      "<p><strong>Voice of the Grave (Su):</strong> Speak with dead. At 5th level: The dead take a -2 penalty. The penalty increases to -4 at 10th level, -6 at 15th level, and -8 at 20th level.</p>",
    );
  });

  it("skips a series the prose already states", () => {
    const html = one(
      '::ab[Air Barrier (Ex)]{ability="A +4 armor bonus. At 7th level, and every four levels thereafter, this bonus increases by +2." increment="The armor bonus~3~4~6~2"}',
    );
    expect(html).not.toContain("increases to +6");
  });

  // Lore discipline, Memory Palace: "At 14th level and at each additional
  // level thereafter"; Apocalypse, Defy Elements: "At 5th level and every 5
  // levels thereafter".
  it("renders repeat as a first level and interval, a first of 0 starting at the interval", () => {
    expect(
      one('::ab[Memory Palace (Su)]{ability="Text." repeat="Choose another skill.~14~1"}'),
    ).toContain("At 14th level and every level thereafter: Choose another skill.");
    expect(
      one('::ab[Defy Elements (Ex)]{ability="Text." repeat="Choose another energy type.~0~5"}'),
    ).toContain("At 5th level and every 5 levels thereafter: Choose another energy type.");
  });

  // Inquisitions, Ultimate Magic 41-44.
  it("states the daily-use cap the use* props encode", () => {
    expect(
      one('::ab[Relentless Footing (Ex)]{ability="Add 10 feet." useMod=Wisdom3 useM}'),
    ).toContain(
      "You can use this ability a number of times per day equal to 3 + your Wisdom modifier (minimum 1).",
    );
    expect(
      one('::ab[Wings (Su)]{ability="You fly." useL=oracle useUnit=minute useNC=1}'),
    ).toContain(
      "You can use this ability for a number of minutes per day equal to your oracle level. These minutes do not need to be consecutive, but they must be spent in 1-minute increments.",
    );
    expect(
      one('::ab[Stare (Sp)]{ability="Feeblemind gaze." useInc=inquisitor~4~8 useF="8~1~4"}'),
    ).toContain(
      "You can use this ability once per day, plus one additional time per day for every 4 inquisitor levels beyond 8th.",
    );
    expect(
      one('::ab[Blood of Heroes (Su)]{ability="A bonus." useInc=oracle~5~+ useF="1~1~5~1~5"}'),
    ).toContain(
      "once per day, plus one additional time per day at 5th level and every 5 oracle levels thereafter.",
    );
  });

  it("labels the action type an action key implies, unless the prose says it", () => {
    expect(one('::ab[Sudden Shift (Sp)]{immediate="You can teleport 10 feet."}')).toBe(
      "<p><strong>Sudden Shift (Sp):</strong> <em>Immediate action:</em> You can teleport 10 feet.</p>",
    );
    expect(one('::ab[Wind Sight (Ex)]{standard="As a @HLstandard_action you can see."}')).toBe(
      "<p><strong>Wind Sight (Ex):</strong> As a standard action you can see.</p>",
    );
  });

  it("gives labelled sections paragraphs of their own, penalty before benefit, then the progression", () => {
    expect(
      one(
        '::ab{title="&L&Clouded Vision&FN&" flavor="Your eyes are obscured." xPenalty="You cannot see beyond 30 feet." benefit="Darkvision 30 ft." imp5="60 feet."}',
      ),
    ).toBe(
      [
        "<p><strong>Clouded Vision:</strong> Your eyes are obscured.</p>",
        "<p><strong>Penalty:</strong> You cannot see beyond 30 feet.</p>",
        "<p><strong>Benefit:</strong> Darkvision 30 ft.</p>",
        "<p>At 5th level: 60 feet.</p>",
      ].join("\n"),
    );
  });

  it("reads choice, ability2, and a ~~~ paragraph break", () => {
    expect(
      one(
        '::ab[Certainty (Ex)]{choice="Choose a skill." ability="Reroll it.~~~Take the better result." ability2="Also this."}',
      ),
    ).toBe(
      "<p><strong>Certainty (Ex):</strong> Choose a skill. Reroll it.</p>\n<p>Take the better result. Also this.</p>",
    );
  });

  it("keeps both halves of a prose key the source repeats", () => {
    expect(
      one('::ab[Interstellar Void (Su)]{ability="Cold." imp10="Fatigued." imp10="Twice a day."}'),
    ).toContain("At 10th level: Fatigued. Twice a day.");
  });

  it("drops a leaf label's own trailing colon, and keeps a nested title's ability type", () => {
    expect(one('::ab[Arcane Deed (Ex):]{ability="Text."}')).toBe(
      "<p><strong>Arcane Deed (Ex):</strong> Text.</p>",
    );
    expect(one('::ab{title="Morphic Form (Ex)" ability="Text."}')).toBe(
      "<p><strong>Morphic Form (Ex):</strong> Text.</p>",
    );
  });
});

describe("pfDataDescriptionToHtml: block-level forms of the 0.15.3 pin", () => {
  it("leads a fence's first prose line with its action label", () => {
    expect(
      pfDataDescriptionToHtml([
        ':::ab{title="Morphic Form (Ex)" action="At 5th Level"}',
        "",
        "You gain DR 5.",
        "",
        ":::",
      ]),
    ).toBe(
      "<p><strong>Morphic Form (Ex)</strong></p>\n<p><strong>At 5th level:</strong> You gain DR 5.</p>",
    );
  });

  it("renders a titled block's title and each of its stacked rows", () => {
    expect(
      pfDataDescriptionToHtml([
        ':::block{title="Bonus Spells" size=simple}',
        '::row[1st Level]{info="‹spell/Ray of enfeeblement›"}',
        '::row[4th Level]{info="‹spell/Alter self›"}',
        ":::",
      ]),
    ).toBe(
      [
        "<p><strong>Bonus Spells</strong></p>",
        "<p><strong>1st Level:</strong> Ray of enfeeblement</p>",
        "<p><strong>4th Level:</strong> Alter self</p>",
      ].join("\n"),
    );
  });

  // Ancestor mystery: "adds Linguistics, and all Knowledge skills".
  it("renders '::cskill' codes as skill names", () => {
    expect(pfDataDescriptionToHtml(["::cskill{gain=ling~ka~perf|oratory lose=intm}"])).toBe(
      "<p><strong>Class Skills:</strong> Linguistics, Knowledge (arcana), and Perform (oratory).</p>\n<p><strong>Loses Class Skills:</strong> Intimidate.</p>",
    );
  });

  it("resolves a link whose URL-only prefix ends in '>', and drops layout markers and &quot&", () => {
    expect(
      pfDataDescriptionToHtml([
        "A ‹umr/natural>primary bite» attack›, spells with &quot&cure&quot& in the name.&FN&",
      ]),
    ).toBe('<p>A primary bite attack, spells with "cure" in the name.</p>');
  });
});

describe("pfDataBodyLines", () => {
  // Arcanist exploits and magus arcana open with their own ability, whose
  // label restates the entry's name and suffix.
  it("unlabels an entry's own leading ability", () => {
    const lines = pfDataBodyLines([
      "‹SOURCE Ultimate Magic/12›",
      "",
      '::ab[Pool Strike (Su):]{standard="Charge your hand."}',
    ]);
    expect(lines).toEqual(['::ab{standard="Charge your hand."}']);
    expect(pfDataDescriptionToHtml(lines)).toBe(
      "<p><em>Standard action:</em> Charge your hand.</p>",
    );
  });
});
