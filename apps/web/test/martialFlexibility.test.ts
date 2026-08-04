import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { addBuff, makeActiveBuff } from "../src/model/buffs.js";
import { createEmptyDoc, setAbility, setRace } from "../src/model/doc.js";
import {
  combatFeatsForMartialFlexibility,
  featBenefitSummary,
} from "../src/model/martialFlexibility.js";
import { buildPrereqContext, evaluatePrereqs } from "../src/model/prereqs.js";

const ref = loadRefData();

function featByName(name: string) {
  const entry = Object.values(ref.feats).find((f) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry;
}

function buffByName(name: string) {
  const entry = Object.values(ref.buffs).find((b) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry;
}

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeBrawler(): CharacterDoc {
  let doc = createEmptyDoc("mf-test");
  doc = setRace(doc, raceId("Human"));
  doc = { ...doc, identity: { ...doc.identity, classes: [{ tag: "brawler", level: 6 }] } };
  doc = setAbility(doc, "str", 16);
  doc = setAbility(doc, "dex", 10);
  doc = setAbility(doc, "con", 14);
  doc = setAbility(doc, "int", 10);
  doc = setAbility(doc, "wis", 12);
  doc = setAbility(doc, "cha", 8);
  return doc;
}

describe("combatFeatsForMartialFlexibility() — RAW: only combat feats can be borrowed", () => {
  it("returns only feats tagged Combat", () => {
    const feats = combatFeatsForMartialFlexibility(ref);
    expect(feats.length).toBeGreaterThan(0);
    expect(feats.every((f) => f.tags.includes("Combat"))).toBe(true);
  });

  it("excludes a non-combat feat (Skill Focus)", () => {
    const feats = combatFeatsForMartialFlexibility(ref);
    expect(feats.some((f) => f.name === "Skill Focus")).toBe(false);
  });

  it("includes a known combat feat (Dodge)", () => {
    const feats = combatFeatsForMartialFlexibility(ref);
    expect(feats.some((f) => f.name === "Dodge")).toBe(true);
  });

  it("is sorted by name", () => {
    const feats = combatFeatsForMartialFlexibility(ref);
    const names = feats.map((f) => f.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("featBenefitSummary() — plain-text picker-row preview", () => {
  it("strips HTML tags and collapses whitespace", () => {
    expect(featBenefitSummary("<p>You get a +1 <b>dodge bonus</b> to AC.</p>")).toBe(
      "You get a +1 dodge bonus to AC.",
    );
  });

  it("decodes common HTML entities", () => {
    expect(featBenefitSummary("<p>Str &amp; Dex &lt;both&gt;</p>")).toBe("Str & Dex <both>");
  });

  it("truncates long text with an ellipsis, never mid-tag", () => {
    const long = `<p>${"x".repeat(200)}</p>`;
    const summary = featBenefitSummary(long, 50);
    expect(summary.length).toBe(50);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("leaves short text under the max untouched", () => {
    expect(featBenefitSummary("<p>Short.</p>", 50)).toBe("Short.");
  });
});

describe("buildPrereqContext() drives the SAME evaluatePrereqs the builder uses", () => {
  it("blocks Dodge (Dex 13) for a brawler with Dex 10", () => {
    const doc = makeBrawler();
    const sheet = compute(doc, ref);
    const ctx = buildPrereqContext(doc, sheet, ref);
    const res = evaluatePrereqs(featByName("Dodge"), ctx);
    expect(res.blocked).toBe(true);
  });

  it("issue-parity: reads LIVE (buffed) ability totals, not the raw build score", () => {
    // Cat's Grace (+4 enhancement Dex) pushes a Dex-10 brawler to 14 — enough
    // to qualify for Dodge's Dex 13 prereq. Martial Flexibility must see this
    // the moment the buff is toggled on, since a brawler's stats routinely
    // shift mid-encounter (this is the whole point of a live tracker).
    let doc = makeBrawler();
    doc = addBuff(doc, makeActiveBuff(buffByName("Cat's Grace"), { instanceId: "cg-1" }));
    const sheet = compute(doc, ref);
    expect(sheet.abilities.dex.total).toBe(14);

    const ctx = buildPrereqContext(doc, sheet, ref);
    const res = evaluatePrereqs(featByName("Dodge"), ctx);
    expect(res.blocked).toBe(false);
  });

  it("hard-blocks a feat requiring another feat the character doesn't have (Cleave needs Power Attack)", () => {
    const doc = makeBrawler();
    const sheet = compute(doc, ref);
    const ctx = buildPrereqContext(doc, sheet, ref);
    const res = evaluatePrereqs(featByName("Cleave"), ctx);
    expect(res.blocked).toBe(true);
  });
});
