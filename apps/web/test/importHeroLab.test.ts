/**
 * Unit tests for `model/importHeroLab.ts`. No confirmed sample of a real
 * Hero Lab classic Pathfinder export was available (see that module's doc
 * comment) — these fixtures exercise `heroLabXmlToIntermediate` against the
 * inferred `<character>`-rooted shape it's written against, and confirm
 * hostile/malformed XML fails cleanly rather than crashing.
 */
import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import { describe, expect, it } from "bun:test";

import { heroLabXmlToIntermediate, importHeroLabXml } from "../src/model/importHeroLab.js";
import { parseXml } from "../src/model/xml.js";

const ref = loadRefData();

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
      /Couldn't parse that as XML/,
    );
  });

  it("throws a clean error on complete garbage input", () => {
    expect(() => importHeroLabXml("this is not xml at all", ref)).toThrow(
      /Couldn't parse that as XML/,
    );
  });
});
