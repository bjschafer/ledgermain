/**
 * Unit tests for `model/importHeroLab.ts`.
 *
 * The headline fixture is `fixtures/herolab-crush.por` — a real portfolio
 * saved by Hero Lab classic 8.8.8h (Pathfinder data set 14.20), reduced to
 * the three files the importer reads and with the Paizo rules prose stripped
 * out of every `<description>` (that text is the publisher's, and none of it
 * is anything the importer looks at). The expected numbers below are Hero
 * Lab's own, straight off the character's stat block, so these assert that
 * our engine lands on the same sheet the source tool did.
 *
 * The hand-written XML fixtures alongside it cover the tolerant fallbacks:
 * flatter/older shapes, and malformed input failing cleanly.
 */
import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

import {
  cleanFeatName,
  cleanResourceName,
  flexibleAbilityFromNativeSave,
  heroLabXmlToIntermediate,
  importHeroLabPortfolio,
  importHeroLabXml,
  splitEnhancement,
} from "../src/model/importHeroLab.js";
import { parseXml } from "../src/model/xml.js";

const ref = loadRefData();

const CRUSH_POR = new Uint8Array(readFileSync("test/fixtures/herolab-crush.por"));

const MINIMAL_XML = `<character name="Grombar" race="Human" alignment="CE"/>`;

const FULL_XML = `<?xml version="1.0"?>
<document signature="Hero Lab">
  <public>
    <character name="Grombar" alignment="CE" gender="Male">
      <race name="Human"/>
      <classes>
        <class name="Fighter" level="3"/>
      </classes>
      <attributes>
        <attribute name="Strength" score="18"/>
        <attribute name="Dexterity" score="14"/>
      </attributes>
      <feats>
        <feat name="Power Attack"/>
        <feat name="Not A Real Feat"/>
      </feats>
      <skills>
        <skill name="Intimidate" ranks="3"/>
      </skills>
      <languages>
        <language name="Common"/>
      </languages>
      <gear>
        <item name="Cloak of Resistance +3"/>
        <item name="Suspiciously Fake Item" quantity="2"/>
      </gear>
      <money pp="0" gp="35" sp="0" cp="0"/>
    </character>
  </public>
</document>`;

describe("heroLabXmlToIntermediate", () => {
  it("reads a minimal character element with only attributes", () => {
    const data = heroLabXmlToIntermediate(parseXml(MINIMAL_XML));
    expect(data.name).toBe("Grombar");
    expect(data.race).toBe("Human");
    expect(data.alignment).toBe("CE");
  });

  it("reads a fuller nested document (deep search for each concept)", () => {
    const data = heroLabXmlToIntermediate(parseXml(FULL_XML));
    expect(data.name).toBe("Grombar");
    expect(data.race).toBe("Human");
    expect(data.classes).toEqual([{ name: "Fighter", level: 3 }]);
    expect(data.abilities.str).toBe(18);
    expect(data.abilities.dex).toBe(14);
    expect(data.feats).toEqual(["Power Attack", "Not A Real Feat"]);
    expect(data.skills).toEqual([{ name: "Intimidate", ranks: 3 }]);
    expect(data.languages).toEqual(["Common"]);
    expect(data.gear).toEqual([
      { name: "Cloak of Resistance +3", quantity: undefined },
      { name: "Suspiciously Fake Item", quantity: 2 },
    ]);
    expect(data.money).toEqual({ pp: 0, gp: 35, sp: 0, cp: 0 });
  });

  it("returns empty fields when nothing recognizable is present, rather than throwing", () => {
    const data = heroLabXmlToIntermediate(parseXml("<somethingElse/>"));
    expect(data.classes).toEqual([]);
    expect(data.feats).toEqual([]);
    expect(data.name).toBeUndefined();
  });
});

describe("importHeroLabXml", () => {
  it("produces a compute()-safe doc and a report for the fuller fixture", () => {
    const { doc, report } = importHeroLabXml(FULL_XML, ref);
    expect(doc.identity.name).toBe("Grombar");
    expect(doc.identity.classes).toEqual([{ tag: "fighter", level: 3 }]);
    expect(report.mapped.length).toBeGreaterThan(0);
    expect(report.unmapped.some((l) => l.includes("Not A Real Feat"))).toBe(true);
    expect(report.unmapped.some((l) => l.includes("Suspiciously Fake Item"))).toBe(true);
    expect(() => compute(doc, ref)).not.toThrow();
  });

  it("throws a clean error on malformed XML rather than letting the parser exception escape", () => {
    expect(() => importHeroLabXml("<character><unterminated>", ref)).toThrow(
      /Couldn't read the XML export/,
    );
  });

  it("throws a clean error on complete garbage input", () => {
    expect(() => importHeroLabXml("this is not xml at all", ref)).toThrow(
      /Couldn't read the XML export/,
    );
  });
});

describe("name cleanup", () => {
  it("strips the mechanical annotation Hero Lab appends to a feat name", () => {
    expect(cleanFeatName("Combat Expertise +/-2")).toBe("Combat Expertise");
    expect(cleanFeatName("Power Attack -2/+4")).toBe("Power Attack");
  });

  it("keeps a parenthetical that is part of the real feat name", () => {
    expect(cleanFeatName("Armor Proficiency (Light)")).toBe("Armor Proficiency (Light)");
    expect(cleanFeatName("Skill Focus (Perception)")).toBe("Skill Focus (Perception)");
  });

  it("strips rate/DC and ability-type tags from a tracked resource name", () => {
    expect(cleanResourceName("Knockout (1/day, DC 17) (Ex)")).toBe("Knockout");
    expect(cleanResourceName("Martial Flexibility (move action, 5/day) (Ex)")).toBe(
      "Martial Flexibility",
    );
    expect(cleanResourceName("Orc Ferocity (1/day)")).toBe("Orc Ferocity");
    expect(cleanResourceName("Torch")).toBe("Torch");
  });

  it("splits a magic item's enhancement bonus off its base name", () => {
    expect(splitEnhancement("+1 chain shirt")).toEqual({ name: "chain shirt", enhancement: 1 });
    expect(splitEnhancement("Chain shirt")).toEqual({ name: "Chain shirt", enhancement: 0 });
  });
});

describe("importHeroLabPortfolio (real Hero Lab classic .por)", () => {
  it("reads identity, class, and level off the portfolio", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    expect(doc.identity.name).toBe("Crush");
    expect(ref.races[doc.identity.race]?.name).toBe("Half-Orc");
    expect(doc.identity.classes).toEqual([{ tag: "brawler", level: 5 }]);
    expect(doc.identity.alignment).toBe("LN");
    expect(doc.identity.gender).toBe("Female");
  });

  it("backs the racial +2 out of the quoted scores, recovering the pre-racial build", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    // Hero Lab quotes Str 18 (before the belt). The Half-Orc's flexible +2
    // went to Str, so the score the player actually bought is 16.
    expect(doc.identity.flexibleAbility).toBe("str");
    expect(doc.abilities).toEqual({ str: 16, dex: 16, con: 16, int: 15, wis: 13, cha: 12 });
  });

  it("recomputes the same ability totals, AC, and saves Hero Lab printed", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    const sheet = compute(doc, ref);
    // Stat block: Str 20, Dex 16, Con 16, Int 15, Wis 13, Cha 12.
    expect(sheet.abilities.str.total).toBe(20);
    expect(sheet.abilities.dex.total).toBe(16);
    expect(sheet.abilities.con.total).toBe(16);
    expect(sheet.abilities.int.total).toBe(15);
    // Stat block: "AC 19, touch 14, flat-footed 15".
    expect(sheet.ac.normal).toBe(19);
    expect(sheet.ac.touch).toBe(14);
    expect(sheet.ac.flatFooted).toBe(15);
    // Stat block: "Fort +7, Ref +7, Will +4"; "Base Atk +5"; "CMD 24"; "Init +3".
    expect(sheet.saves.fort.total).toBe(7);
    expect(sheet.saves.ref.total).toBe(7);
    expect(sheet.saves.will.total).toBe(4);
    expect(sheet.bab).toBe(5);
  });

  it("imports only the feats the player chose, not the ones Hero Lab granted", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    const names = doc.build.feats.map((id) => ref.feats[id]?.name).sort();
    // Improved Unarmed Strike, Armor Proficiency (Light), Shield Proficiency
    // and Simple Weapon Proficiency are all `useradded="no"` grants — our own
    // engine grants them, and importing them would spend feat slots twice.
    expect(names).toEqual([
      "Belier's Bite",
      "Combat Expertise",
      "Endurance",
      "Iron Will",
      "Power Attack",
      "Precise Strike",
    ]);
  });

  it("brings worn armor across with real stats rather than as a bare gear row", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    const armor = doc.build.gear.find((g) => g.armor);
    expect(armor?.armor?.ac).toBe(4);
    expect(armor?.armor?.enhancement).toBe(1);
    expect(armor?.equipped).toBe(true);
    // ...and isn't also duplicated as a stat-less custom item.
    expect(doc.build.gear.filter((g) => /chain shirt/i.test(g.name ?? "")).length).toBe(1);
  });

  it("carries live session state: current HP and spent class-feature uses", async () => {
    const { doc } = await importHeroLabPortfolio(CRUSH_POR, ref);
    // Stat block: "hp 56 (5d10+20) (currently 32)".
    expect(doc.live.hp.current).toBe(32);
    // Martial Flexibility was 4 of 5 spent.
    const pools = Object.values(doc.live.resources);
    expect(pools).toContainEqual({ used: 4, max: 5 });
  });

  it("reports what it couldn't place instead of silently dropping or inventing it", async () => {
    const { report } = await importHeroLabPortfolio(CRUSH_POR, ref);
    expect(report.source).toBe("herolab");
    // Hero Lab rolled HP and took the favored-class HP bonus; we compute the
    // average, so the difference is surfaced rather than papered over.
    expect(report.unmapped.some((l) => /Maximum HP is 56/.test(l))).toBe(true);
    // Consumable counters aren't class-feature pools; they're flagged, not faked.
    expect(report.unmapped.some((l) => /Tracked "Torch"/.test(l))).toBe(true);
    expect(report.mapped.some((l) => /Current HP: 32/.test(l))).toBe(true);
  });

  it("rejects a non-portfolio ZIP with a clean, actionable error", async () => {
    // An empty-but-valid archive (bare end-of-central-directory record): a
    // real ZIP with no statblock in it.
    const notAPortfolio = new Uint8Array([
      0x50,
      0x4b,
      0x05,
      0x06,
      ...Array.from({ length: 18 }, () => 0),
    ]);
    let message = "";
    try {
      await importHeroLabPortfolio(notAPortfolio, ref);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/no XML statblock/);
  });
});

describe("flexibleAbilityFromNativeSave", () => {
  it("reads the racial +2 choice out of Hero Lab's own save format", () => {
    const xml = `<document><pick thing="raAttr2Sel"><field id="usrChosen1" menuthing="aDEX"/></pick></document>`;
    expect(flexibleAbilityFromNativeSave(parseXml(xml))).toBe("dex");
  });

  it("returns undefined when the pick isn't there, rather than guessing", () => {
    const xml = `<document><pick thing="raHOFeroc"><field id="usrChosen1"/></pick></document>`;
    expect(flexibleAbilityFromNativeSave(parseXml(xml))).toBeUndefined();
  });
});
