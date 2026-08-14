import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  TRAIT_EFFECTS_EXTRACTED,
  TRAIT_PROMOTION_BLOCKERS,
} from "../src/trait-effects-extracted.js";
import { isTargetApplied } from "../src/targets.js";
import { SKILL_ABILITY, skillBaseId } from "../src/tables.js";
import { mergedTraits, resolveTraitDef } from "../src/traits.js";

const ref = loadRefData();

/** The same normalization the sweep's batch files used: tags out, whitespace squashed. */
function strippedDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;|&ndash;/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("TRAIT_EFFECTS_EXTRACTED", () => {
  const entries = Object.entries(TRAIT_EFFECTS_EXTRACTED);

  it("every entry keys a vendored trait that is prose-only upstream", () => {
    for (const [id] of entries) {
      const tr = ref.traits[id];
      expect(tr, `unknown vendored trait id ${id}`).toBeDefined();
      expect(
        tr!.changes,
        `${id} (${tr!.name}) has upstream changes — supplement would double-apply`,
      ).toHaveLength(0);
    }
  });

  it("every provenance is a verbatim substring of the vendored description", () => {
    for (const [id, entry] of entries) {
      const tr = ref.traits[id]!;
      const description = strippedDescription(tr.description ?? "");
      expect(
        description.includes(entry.provenance),
        `${id} (${tr.name}): provenance drifted from vendored text`,
      ).toBe(true);
    }
  });

  it("every change lands on an applied target with a real formula", () => {
    for (const [id, entry] of entries) {
      for (const ch of entry.changes ?? []) {
        expect(isTargetApplied(ch.target), `${id}: unapplied target ${ch.target}`).toBe(true);
        expect(ch.formula.length).toBeGreaterThan(0);
      }
    }
  });

  it("classSkills grants use known base or parameterized-instance skill ids", () => {
    for (const [id, entry] of entries) {
      for (const s of entry.classSkills ?? []) {
        expect(SKILL_ABILITY[skillBaseId(s)], `${id}: unknown skill id ${s}`).toBeDefined();
      }
    }
  });

  it("every entry moves something and resolves as a non-displayOnly def", () => {
    for (const [id, entry] of entries) {
      const moves = (entry.changes?.length ?? 0) > 0 || (entry.classSkills?.length ?? 0) > 0;
      expect(moves, `${id}: entry with no changes and no classSkills`).toBe(true);
      const def = resolveTraitDef(id, ref);
      expect(def?.displayOnly ?? false, `${id}: resolves displayOnly despite supplement`).toBe(
        false,
      );
    }
  });

  it("blockers key real prose-only vendored traits and never overlap the movers", () => {
    for (const id of Object.keys(TRAIT_PROMOTION_BLOCKERS)) {
      const tr = ref.traits[id];
      expect(tr, `blocker keys unknown vendored trait id ${id}`).toBeDefined();
      expect(tr!.changes).toHaveLength(0);
      expect(TRAIT_EFFECTS_EXTRACTED[id], `${id} is both promoted and blocked`).toBeUndefined();
    }
  });

  it("no entry hides behind a hand-authored name collision", () => {
    // A supplemented vendored trait that mergedTraits drops (hand-authored
    // name wins) would silently never surface its entry in the picker.
    const merged = mergedTraits(ref);
    for (const [id] of entries) {
      expect(
        merged[id],
        `${id} (${ref.traits[id]!.name}) shadowed by a hand-authored trait`,
      ).toBeDefined();
    }
  });
});
