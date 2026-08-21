import { describe, expect, it } from "bun:test";

import { newMonsterParseStats, parseMonsterEntry } from "../src/util/monsterStatblock.js";
import type { PfDataEntry } from "../src/util/pfdata.js";

/**
 * Parser edge cases on hand-built, upstream-shaped inputs. Fidelity against
 * the real corpus is covered by test/monsters.test.ts (vendored output) and
 * scripts/monster-oracle-diff.ts (external oracle).
 */

function entry(description: string[]): PfDataEntry {
  return { name: "Test Monster", description };
}

describe("parseMonsterEntry", () => {
  it("parses one full statblock into structured fields and display strings", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry([
        "*A test flavor line.*",
        "",
        '::mh[Testbeast]{cr="1/2" mr=2}',
        "",
        ":::div{className=reduce}",
        "",
        '::minfo{source="Pathfinder RPG Bestiary/232" xp=200 n small animal init=+3 dv=60 llv scent pcp=+4 aura="stench (10 ft., DC 12)"}',
        "",
        '::mdefense{ac="14/12/11" mod="+2 Dex, +1 size, +1 natural" hp="13~2d8+4" fort=+5 ref=+2 will=-1 dr="5/magic" immune="cold" sr=13 fh=2 eva rockCt}',
        "",
        '::moffense{sp=30 fl=60 good sw=20 melee="bite +4 (1d4+1)" space="2-1/2" reach=0 reachP="5 ft. with tail" specAtt="poison" constrict="1d4+1" grab=Small}',
        "",
        "::mfn[B~Bonus feat.]",
        "",
        '::mstats{str=10 dex=17 con=- int=2 wis=13 cha=4 bab=+1 cmb=-1 cmd="12 (16 vs. trip)" feats="Power Attack#B~M/Vital Strike~Skill Focus|Perception" skills="per|8~k|a/p|4~craft|traps|2|+4 on snares" racial="+4 Stealth in grass" lang="C~DX~~telepathy 100 ft." sq="hold breath"}',
        "",
        '::meco{env="any urban" org="solitary or pack (2-8)" treasure=X}',
        "",
        ":::",
        "",
        "::sh[Special Abilities]",
        "",
        "**Poison (Ex)** Bite; save Fort DC 13.",
        "",
        "::sh[Description]",
        "",
        "Body prose.",
      ]),
      stats,
    );

    expect(parsed).toBeDefined();
    expect(parsed!.blocks).toHaveLength(1);
    const monster = parsed!.blocks[0]!.monster;

    expect(parsed!.blocks[0]!.name).toBe("Testbeast");
    expect(monster.cr).toBe("1/2");
    expect(monster.mythicRank).toBe(2);
    expect(monster.xp).toBe(200);
    expect(monster.alignment).toBe("N");
    expect(monster.size).toBe("Small");
    expect(monster.creatureType).toBe("animal");
    expect(monster.init).toBe("+3");
    expect(monster.senses).toBe("darkvision 60 ft., low-light vision, scent; Perception +4");
    expect(monster.aura).toBe("stench (10 ft., DC 12)");
    expect(monster.sources).toEqual([{ id: "pathfinder-rpg-bestiary", pages: "232" }]);

    expect(monster.ac).toBe(14);
    expect(monster.touchAc).toBe(12);
    expect(monster.flatFootedAc).toBe(11);
    expect(monster.acMods).toBe("+2 Dex, +1 size, +1 natural");
    expect(monster.hp).toBe(13);
    expect(monster.hd).toBe("2d8+4");
    expect(monster.hpNote).toBe("fast healing 2");
    expect(monster.fort).toBe("+5");
    expect(monster.ref).toBe("+2");
    expect(monster.will).toBe("-1");
    expect(monster.dr).toBe("5/magic");
    expect(monster.immune).toBe("cold");
    expect(monster.sr).toBe("13");
    expect(monster.defensiveAbilities).toBe("evasion, rock catching");

    expect(monster.speed).toBe("30 ft., fly 60 ft. (good), swim 20 ft.");
    expect(monster.melee).toBe("bite +4 (1d4+1)");
    expect(monster.space).toBe("2-1/2 ft.");
    expect(monster.reach).toBe("0 ft. (5 ft. with tail)");
    expect(monster.specialAttacks).toBe("constrict (1d4+1), grab (Small), poison");

    // con="-" is a printed em dash: omitted from the score map, not zero.
    expect(monster.abilityScores).toEqual({ str: 10, dex: 17, int: 2, wis: 13, cha: 4 });
    expect(monster.bab).toBe("+1");
    expect(monster.cmb).toBe("-1");
    expect(monster.cmd).toBe("12 (16 vs. trip)");
    // Footnote marker expanded, mythic prefix applied, pipe-parenthetical kept.
    expect(monster.feats).toBe(
      "Power Attack (Bonus feat), Mythic Vital Strike, Skill Focus (Perception)",
    );
    expect(monster.skills).toBe(
      "Perception +8, Knowledge (arcana, planes) +4, Craft (traps) +2 (+4 on snares)",
    );
    expect(monster.racialModifiers).toBe("+4 Stealth in grass");
    expect(monster.languages).toBe("Common, Draconic (can't speak); telepathy 100 ft.");
    expect(monster.sq).toBe("hold breath");

    expect(monster.environment).toBe("any urban");
    expect(monster.organization).toBe("solitary or pack (2-8)");
    expect(monster.treasure).toBe("none");

    expect(parsed!.specialAbilitiesHtml).toContain("<strong>Poison (Ex)</strong>");
    expect(parsed!.descriptionHtml).toContain("<em>A test flavor line.</em>");
    expect(parsed!.descriptionHtml).toContain("<strong>Description</strong>");
    expect(parsed!.descriptionHtml).toContain("Body prose.");

    expect(stats.unknownKeys.size).toBe(0);
    expect(stats.numericFailures).toHaveLength(0);
  });

  it("splits a multi-::mh entry and drops a joined-listing restatement of the same block", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry([
        "::mh[Small Testbeast]{cr=1}",
        '::mdefense{ac="17/10/17" hp="13~2d10+2" fort=+4 ref=-1 will=+0}',
        "::sh[Description]",
        "Shared prose.",
        // The joined listing restates Small, then adds the other sizes.
        "::mh[Small Testbeast]{cr=1 jl}",
        '::mdefense{ac="17/10/17" hp="13~2d10+2" fort=+4 ref=-1 will=+0}',
        "::mh[Large Testbeast]{cr=5 jl}",
        '::mdefense{ac="18/9/18" hp="68~8d10+24" fort=+9 ref=+1 will=+2}',
      ]),
      stats,
    );

    expect(parsed!.blocks.map((block) => block.name)).toEqual([
      "Small Testbeast",
      "Large Testbeast",
    ]);
    expect(stats.duplicateBlocksDropped).toBe(1);
    expect(parsed!.blocks[1]!.monster.hp).toBe(68);
    // Entry-level prose is shared across blocks (duplicated onto each by the transform).
    expect(parsed!.descriptionHtml).toContain("Shared prose.");
  });

  it("keeps a statblock with missing directives rather than dropping it", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(entry(['::mh[Barebones]{cr="3"}']), stats);
    expect(parsed!.blocks).toHaveLength(1);
    expect(parsed!.blocks[0]!.monster.cr).toBe("3");
    expect(parsed!.blocks[0]!.monster.ac).toBeUndefined();
  });

  it("returns undefined for an entry with no ::mh at all", () => {
    const stats = newMonsterParseStats();
    expect(parseMonsterEntry(entry(["Just prose."]), stats)).toBeUndefined();
  });

  it("takes hpRaw verbatim and keeps its trailing note", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry([
        "::mh[Rawblood]{cr=20}",
        '::mdefense{ac="30/10/30" hpRaw="333 (23d6+253); sustaining joy" fort=+10 ref=+10 will=+10}',
      ]),
      stats,
    );
    const monster = parsed!.blocks[0]!.monster;
    expect(monster.hp).toBe(333);
    expect(monster.hd).toBe("23d6+253");
    expect(monster.hpNote).toBe("sustaining joy");
  });

  it('renders a Str "— (N while corporeal)" qualifier as a stat note, not a failure', () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry([
        "::mh[Ghostly]{cr=9}",
        '::mstats{str="- (20 while corporeal)" dex=17 con=- int=14 wis=13 cha=18 bab=+6 cmb=+9 cmd=20}',
      ]),
      stats,
    );
    const monster = parsed!.blocks[0]!.monster;
    expect(monster.abilityScores?.str).toBeUndefined();
    expect(monster.statNote).toBe("Str — (20 while corporeal)");
    expect(stats.numericFailures).toHaveLength(0);
  });

  it("renders ::mspell blocks in the printed shape", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry([
        "::mh[Caster]{cr=5}",
        '::mspell{sla cl=5 con=+8 constant="comprehend languages" atWill="detect magic~ray of exhaustion|DC 16" day="3~burning hands~cause fear|DC 12~~1~fear#D|DC 15"}',
        '::mspell{know=Sorcerer cl=5 con=+8 l1="7~charm person|DC 14~mage armor" l0="daze|DC 13~detect magic"}',
      ]),
      stats,
    );
    const html = parsed!.blocks[0]!.monster.spellsHtml!;
    expect(html).toContain("<strong>Spell-Like Abilities</strong> (CL 5th; concentration +8)");
    expect(html).toContain("<p>Constant—<em>comprehend languages</em></p>");
    expect(html).toContain(
      "<p>At will—<em>detect magic</em>, <em>ray of exhaustion</em> (DC 16)</p>",
    );
    expect(html).toContain("<p>3/day—<em>burning hands</em>, <em>cause fear</em> (DC 12)</p>");
    expect(html).toContain("<p>1/day—<em>fear</em><sup>D</sup> (DC 15)</p>");
    expect(html).toContain("<strong>Sorcerer Spells Known</strong> (CL 5th; concentration +8)");
    expect(html).toContain("<p>1st (7/day)—<em>charm person</em> (DC 14), <em>mage armor</em></p>");
    expect(html).toContain("<p>0 (at will)—<em>daze</em> (DC 13), <em>detect magic</em></p>");
    expect(stats.unknownKeys.size).toBe(0);
  });

  it("decodes base treasure letters and keeps only the plain-text tail of a compound code", () => {
    const stats = newMonsterParseStats();
    const parsed = parseMonsterEntry(
      entry(["::mh[Hoarder]{cr=2}", '::meco{env="any" treasure="S=Mw|Wt~!other treasure"}']),
      stats,
    );
    // The coded item list (Mw|Wt) is deliberately not decoded — see the module doc.
    expect(parsed!.blocks[0]!.monster.treasure).toBe("standard (other treasure)");
  });
});
