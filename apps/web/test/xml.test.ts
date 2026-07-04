/**
 * Unit tests for the hand-rolled XML parser (`model/xml.ts`) — the only
 * "DOM-shaped" dependency the Hero Lab importer needs, deliberately written
 * without `DOMParser` so it behaves identically in Bun's test runner and the
 * browser (see that module's doc comment).
 */
import { describe, expect, it } from "bun:test";

import { attrValue, findAllTags, findFirstTag, nodeText, parseXml } from "../src/model/xml.js";

describe("parseXml", () => {
  it("parses a simple element with attributes", () => {
    const root = parseXml('<character name="Grombar" alignment="CE"/>');
    expect(root.tag).toBe("character");
    expect(root.attrs.name).toBe("Grombar");
    expect(root.attrs.alignment).toBe("CE");
    expect(root.children).toEqual([]);
  });

  it("parses nested elements and text content", () => {
    const root = parseXml("<a><b>hello</b><c/></a>");
    expect(root.children.length).toBe(2);
    expect(root.children[0]!.tag).toBe("b");
    expect(root.children[0]!.text).toBe("hello");
    expect(root.children[1]!.tag).toBe("c");
  });

  it("decodes standard entities and numeric character references", () => {
    const root = parseXml("<a>Tom &amp; Jerry &lt;3 &#65;&#x42;</a>");
    expect(root.text).toBe("Tom & Jerry <3 AB");
  });

  it("supports CDATA sections", () => {
    const root = parseXml("<a><![CDATA[<not a tag> & raw text]]></a>");
    expect(root.text).toBe("<not a tag> & raw text");
  });

  it("skips comments and the XML declaration/DOCTYPE", () => {
    const root = parseXml(
      '<?xml version="1.0"?><!DOCTYPE foo><!-- a comment --><a><!-- inline --><b/></a>',
    );
    expect(root.tag).toBe("a");
    expect(root.children.length).toBe(1);
  });

  it("handles single-quoted attribute values", () => {
    const root = parseXml("<a name='Grombar'/>");
    expect(root.attrs.name).toBe("Grombar");
  });

  it("throws on mismatched closing tags", () => {
    expect(() => parseXml("<a><b></c></a>")).toThrow();
  });

  it("throws on unterminated elements", () => {
    expect(() => parseXml("<a><b>")).toThrow();
  });

  it("throws when there's no root element", () => {
    expect(() => parseXml("just some text, not xml")).toThrow();
  });

  it("throws on completely garbage input rather than hanging or crashing oddly", () => {
    expect(() => parseXml("<<<<>>>>")).toThrow();
    expect(() => parseXml("")).toThrow();
  });
});

describe("findAllTags / findFirstTag / attrValue / nodeText", () => {
  const root = parseXml(
    '<character name="Grombar"><feats><feat name="Power Attack"/><feat name="Cleave"/></feats><classes><class name="Barbarian" level="5"/></classes></character>',
  );

  it("finds all descendants matching a tag name, case-insensitively", () => {
    const feats = findAllTags(root, ["FEAT"]);
    expect(feats.length).toBe(2);
    expect(feats.map((f) => f.attrs.name)).toEqual(["Power Attack", "Cleave"]);
  });

  it("finds the first descendant matching any of several candidate tags", () => {
    const cls = findFirstTag(root, ["characterclass", "class"]);
    expect(cls?.attrs.name).toBe("Barbarian");
  });

  it("reads an attribute case-insensitively from a candidate list", () => {
    expect(attrValue(root, ["NAME"])).toBe("Grombar");
    expect(attrValue(root, ["missing", "name"])).toBe("Grombar");
  });

  it("returns undefined text/attr for text content on an attribute-only node", () => {
    const feat = findFirstTag(root, ["feat"])!;
    expect(nodeText(feat)).toBe("");
  });
});
