import type { RuleEntry } from "@pf1/schema";
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadRefData, OUTPUT_DIR } from "../src/index.js";

/** The vendored rules sidecar (`rules.json`), read only by the reference site. */

const rules = JSON.parse(readFileSync(join(OUTPUT_DIR, "rules.json"), "utf8")) as Record<
  string,
  RuleEntry
>;
const meta = loadRefData().meta;
const all = Object.values(rules);
const byName = (name: string) => all.filter((rule) => rule.name === name);

describe("rules.json (sidecar)", () => {
  it("agrees with meta's counts and hashes", () => {
    expect(meta.counts.rules).toBe(all.length);
    expect(meta.counts.ruleSections).toBe(all.reduce((n, rule) => n + rule.sections.length, 0));
    expect(meta.hashes["rules.json"]).toBeDefined();
  });

  it("forms one tree whose paths agree with its child lists", () => {
    const parentOf = new Map<string, string>();
    for (const rule of all) {
      for (const child of rule.children) {
        expect(rules[child.id]?.name).toBe(child.name);
        expect(parentOf.has(child.id)).toBe(false);
        parentOf.set(child.id, rule.id);
      }
    }
    const roots = all.filter((rule) => !parentOf.has(rule.id));
    expect(roots.map((rule) => rule.name)).toEqual(["Rules"]);
    const rootId = roots[0]!.id;

    for (const rule of all) {
      const ancestors: string[] = [];
      for (let up = parentOf.get(rule.id); up && up !== rootId; up = parentOf.get(up)) {
        ancestors.unshift(up);
      }
      expect(rule.path.map((link) => link.id)).toEqual(ancestors);
    }
  });

  it("links only to pages that exist", () => {
    for (const rule of all) {
      for (const m of rule.html.matchAll(/data-rule="([^"]+)"/g))
        expect(rules[m[1]!]).toBeDefined();
    }
  });

  it("addresses pages by name slug, parent-prefixed only when names clash", () => {
    expect(byName("Use Magic Device").map((rule) => rule.id)).toEqual(["use-magic-device"]);
    expect(byName("Bluff").map((rule) => rule.id)).toEqual(
      expect.arrayContaining(["skill-descriptions-bluff", "skills-in-conflict-bluff"]),
    );
  });

  it("leaves no Foundry enricher syntax and no empty placeholder pages", () => {
    for (const rule of all) {
      expect(rule.html).not.toMatch(/@[A-Z][A-Za-z]*\[|\[\[/);
      expect(rule.html !== "" || rule.children.length > 0).toBe(true);
    }
  });

  it("Take 5-Foot Step: nav header gone, filed under Miscellaneous Actions (CRB p. 189)", () => {
    const [step] = byName("Take 5-Foot Step");
    expect(step!.path.map((link) => link.name)).toEqual([
      "Combat Rules",
      "Actions in Combat",
      "Miscellaneous Actions",
    ]);
    expect(step!.html.startsWith("<p>You can move 5 feet in any round")).toBe(true);
    expect(step!.sources).toEqual([{ id: "PZO1110", pages: "189" }]);
  });

  it("Charge carries its headings as deep-linkable sections (CRB p. 198)", () => {
    const [charge] = byName("Charge");
    expect(charge!.sections.map((s) => s.title)).toContain("Movement During a Charge");
    expect(charge!.html).toContain('<h2 data-section="movement-during-a-charge">');
  });

  it("Use Magic Device: a skill page with its run-in heads as sections (CRB p. 108)", () => {
    const [umd] = byName("Use Magic Device");
    expect(umd!.path.map((link) => link.name)).toEqual(["Skills", "Skill Descriptions"]);
    expect(umd!.sections).toContainEqual({ id: "use-a-scroll", title: "Use a Scroll" });
    expect(umd!.html).toContain('<p data-section="use-a-scroll"><strong>Use a Scroll');
  });

  it("files the quick-reference tables as their own chapter", () => {
    const [aoo] = byName("Combat Actions (AoO)");
    expect(aoo!.path.map((link) => link.name)).toEqual(["Quick Reference"]);
    expect(aoo!.html).toContain("Provokes an Attack of Opportunity");
  });
});
