import { describe, expect, it } from "bun:test";

import { loadMonsters, loadMonsterTemplates, loadRefData } from "../src/index.js";

/**
 * The vendored monster sidecar collections. Numeric spot-checks are
 * hand-computed from the printed statblocks (book + page cited per case);
 * corpus-wide numeric fidelity is validated externally against the d20pfsrd
 * community spreadsheet — see scripts/monster-oracle-diff.ts (2026-08 import:
 * every per-field exactness ≥99.4% on the comparable Bestiary 1-4 + Mythic
 * Adventures rows, with all mismatches verified as the oracle's pre-errata
 * vintage, not vendored errors).
 */

const monsters = loadMonsters();
const templates = loadMonsterTemplates();
const meta = loadRefData().meta;

describe("monsters.json (sidecar)", () => {
  it("contains the expected slice", () => {
    expect(Object.keys(monsters).length).toBe(2989);
    expect(meta.counts.monsters).toBe(2989);
    expect(meta.hashes["monsters.json"]).toBeDefined();
  });

  it("parsed the whole corpus without unknown directive keys or numeric failures", () => {
    expect(meta.counts.monsterParseUnknownKeys).toBe(0);
    expect(meta.counts.monsterParseNumericFailures).toBe(0);
    // Prose lines inside a statblock region — observed, rendered into the
    // description rather than dropped. Bump deliberately on a source bump.
    expect(meta.counts.monsterParseStrayProseLines).toBe(4);
  });

  it("nearly every statblock carries the core numbers (keep-with-gaps, not drop)", () => {
    const all = Object.values(monsters);
    const withCore = all.filter(
      (monster) => monster.cr !== "" && monster.ac !== undefined && monster.hp !== undefined,
    );
    expect(withCore.length / all.length).toBeGreaterThan(0.99);
  });

  it("Dire Rat matches the printed statblock (Bestiary p. 232)", () => {
    const rat = monsters["rat_dire_rat"]!;
    expect(rat.name).toBe("Dire Rat");
    expect(rat.cr).toBe("1/3");
    expect(rat.xp).toBe(135);
    expect(rat.alignment).toBe("N");
    expect(rat.size).toBe("Small");
    expect(rat.creatureType).toBe("animal");
    expect(rat.init).toBe("+3");
    expect(rat.senses).toBe("low-light vision, scent; Perception +4");
    expect(rat.ac).toBe(14);
    expect(rat.touchAc).toBe(14);
    expect(rat.flatFootedAc).toBe(11);
    expect(rat.hp).toBe(5);
    expect(rat.hd).toBe("1d8+1");
    expect(rat.fort).toBe("+3");
    expect(rat.ref).toBe("+5");
    expect(rat.will).toBe("+1");
    expect(rat.speed).toBe("40 ft., climb 20 ft., swim 20 ft.");
    expect(rat.melee).toBe("bite +1 (1d4 plus disease)");
    expect(rat.abilityScores).toEqual({ str: 10, dex: 17, con: 13, int: 2, wis: 13, cha: 4 });
    expect(rat.cmd).toBe("12 (16 vs. trip)");
    expect(rat.feats).toBe("Skill Focus (Perception)");
    expect(rat.treasure).toBe("none");
    expect(rat.specialAbilitiesHtml).toContain("Disease (Ex)");
  });

  it("splits the elemental size ladder into per-size entries (Bestiary p. 122)", () => {
    const small = monsters["earth_elemental--small_earth_elemental"]!;
    expect(small.name).toBe("Small Earth Elemental");
    expect(small.cr).toBe("1");
    expect(small.ac).toBe(17);
    expect(small.touchAc).toBe(10);
    expect(small.flatFootedAc).toBe(17);
    expect(small.hp).toBe(13);
    expect(small.hd).toBe("2d10+2");
    const elder = monsters["earth_elemental--elder_earth_elemental"]!;
    expect(elder.cr).toBe("11");
    // No bare-key block exists for a multi-statblock entry.
    expect(monsters["earth_elemental"]).toBeUndefined();
  });

  it("the joined-listing restatement of a lead statblock is deduplicated, not doubled", () => {
    const smallAir = Object.values(monsters).filter(
      (monster) => monster.name === "Small Air Elemental",
    );
    expect(smallAir).toHaveLength(1);
  });

  it("a caster's spell blocks render in the printed shape (Aranea, Bestiary p. 30)", () => {
    const aranea = monsters["aranea"]!;
    expect(aranea.spellsHtml).toContain("<strong>Sorcerer Spells Known</strong>");
    expect(aranea.spellsHtml).toContain("2nd (5/day)—<em>invisibility</em>");
  });

  it("mythic statblocks keep their printed name and rank (Mythic Aboleth, MR 3)", () => {
    const aboleth = monsters["aboleth_mythic"]!;
    expect(aboleth.name).toBe("Mythic Aboleth");
    expect(aboleth.mythicRank).toBe(3);
  });

  it("a single-statblock entry keeps the fuller display name (Bralani (Azata))", () => {
    expect(monsters["azata_bralani"]!.name).toBe("Bralani (Azata)");
  });

  it("descriptions and special abilities carry only the restricted HTML tag set", () => {
    // The reference site injects these via dangerouslySetInnerHTML — the
    // pipeline contract is p/em/strong/br/sup plus table markup, nothing else.
    const allowed = /^(p|em|strong|br|sup|table|thead|tbody|tr|th|td|h[1-6])$/;
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g;
    for (const monster of Object.values(monsters)) {
      for (const html of [monster.description, monster.specialAbilitiesHtml, monster.spellsHtml]) {
        if (html === undefined) continue;
        for (const match of html.matchAll(tagRe)) {
          expect(match[1]).toMatch(allowed);
        }
      }
    }
  });
});

describe("monster-templates.json (sidecar)", () => {
  it("contains the expected slice", () => {
    expect(Object.keys(templates).length).toBe(169);
    expect(meta.counts["monster-templates"]).toBe(169);
    expect(meta.hashes["monster-templates.json"]).toBeDefined();
  });

  it("Celestial carries the printed CR adjustment, flags, and defense table (Bestiary p. 294)", () => {
    const celestial = Object.values(templates).find((template) => template.name === "Celestial")!;
    expect(celestial.cr).toBe("+0 or +1");
    expect(celestial.acquired).toBe(true);
    expect(celestial.simple).toBe(true);
    expect(celestial.summonable).toBe(true);
    expect(celestial.description).toContain("<table>");
    expect(celestial.description).not.toContain("::");
  });

  it("no template body leaks raw directive syntax", () => {
    for (const template of Object.values(templates)) {
      expect(template.description ?? "").not.toContain("::");
    }
  });
});
