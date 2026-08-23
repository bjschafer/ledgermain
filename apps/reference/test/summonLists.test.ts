/**
 * Structural checks on the hand-authored Summon Monster / Summon Nature's
 * Ally creature lists: every mapped id resolves against the real vendored
 * bestiary, the level shape is complete, and the printed counts match what
 * was hand-counted off the Core Rulebook's summon tables (see the per-level
 * comments in summonLists.ts, sourced from both the current and legacy
 * Archives of Nethys reproductions of "Table: Summon Monster" pg. 350 and
 * "Table: Summon Nature's Ally" pg. 351).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALTERNATIVE_SUMMONING_OPTIONS_SLUG,
  SUMMON_ALT_LIST_ORDER,
  SUMMON_ALT_LISTS,
  SUMMON_LISTS,
  SUMMON_SPELL_LABEL,
  type SummonSpell,
} from "../src/model/summonLists.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const dataDir = join(appRoot, "../../packages/data-pipeline/data");

const monsters = JSON.parse(readFileSync(join(dataDir, "monsters.json"), "utf8")) as Record<
  string,
  unknown
>;

const SPELLS: readonly SummonSpell[] = ["sm", "sna"];

// Hand-counted from each spell's own printed table (aonprd.com SpellDisplay
// pages for Summon Monster I-IX / Summon Nature's Ally I-IX, cross-checked
// against legacy.aonprd.com's single-page "Table: Summon Monster" /
// "Table: Summon Nature's Ally" reproductions).
const EXPECTED_COUNTS: Record<SummonSpell, Record<number, number>> = {
  sm: { 1: 8, 2: 12, 3: 15, 4: 16, 5: 12, 6: 12, 7: 11, 8: 3, 9: 6 },
  sna: { 1: 11, 2: 10, 3: 14, 4: 19, 5: 10, 6: 11, 7: 10, 8: 3, 9: 2 },
};

const DASH_RE = /[–—]/; // en dash, em dash

function allStrings(): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [];
  for (const spell of SPELLS) {
    out.push({ path: `SUMMON_SPELL_LABEL.${spell}`, value: SUMMON_SPELL_LABEL[spell] });
    for (const [level, entries] of Object.entries(SUMMON_LISTS[spell])) {
      entries.forEach((e, i) => {
        out.push({ path: `${spell}[${level}][${i}].label`, value: e.label });
        if (e.note !== undefined)
          out.push({ path: `${spell}[${level}][${i}].note`, value: e.note });
        e.variants?.forEach((v, j) =>
          out.push({ path: `${spell}[${level}][${i}].variants[${j}].label`, value: v.label }),
        );
      });
    }
  }
  return out;
}

describe("SUMMON_LISTS", () => {
  it("covers every level 1..9 for both spells, non-empty", () => {
    for (const spell of SPELLS) {
      for (let level = 1; level <= 9; level++) {
        const entries = SUMMON_LISTS[spell][level];
        expect(entries).toBeDefined();
        expect(entries?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("matches the hand-counted per-level row counts", () => {
    for (const spell of SPELLS) {
      for (let level = 1; level <= 9; level++) {
        expect(SUMMON_LISTS[spell][level]?.length).toBe(EXPECTED_COUNTS[spell][level] ?? -1);
      }
    }
  });

  it("every non-null monsterId and every variant id exists in the vendored bestiary", () => {
    const missing: string[] = [];
    for (const spell of SPELLS) {
      for (const [level, entries] of Object.entries(SUMMON_LISTS[spell])) {
        for (const e of entries) {
          if (e.monsterId !== null && !(e.monsterId in monsters)) {
            missing.push(`${spell}[${level}] "${e.label}" -> ${e.monsterId}`);
          }
          for (const v of e.variants ?? []) {
            if (!(v.monsterId in monsters)) {
              missing.push(
                `${spell}[${level}] "${e.label}" variant "${v.label}" -> ${v.monsterId}`,
              );
            }
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("every row reaches at least one statblock, via monsterId or variants", () => {
    const unreachable: string[] = [];
    for (const spell of SPELLS) {
      for (const [level, entries] of Object.entries(SUMMON_LISTS[spell])) {
        for (const e of entries) {
          if (e.monsterId === null && !e.variants?.length) {
            unreachable.push(`${spell}[${level}] "${e.label}"`);
          }
        }
      }
    }
    expect(unreachable).toEqual([]);
  });

  it("has no duplicate labels within a level per spell", () => {
    for (const spell of SPELLS) {
      for (const entries of Object.values(SUMMON_LISTS[spell])) {
        const labels = entries.map((e) => e.label);
        expect(new Set(labels).size).toBe(labels.length);
      }
    }
  });

  it("only marks `templated` under Summon Monster", () => {
    for (const [level, entries] of Object.entries(SUMMON_LISTS.sna)) {
      for (const e of entries) {
        expect(e.templated, `sna[${level}] "${e.label}"`).toBeUndefined();
      }
    }
    // Sanity: Summon Monster does use it (otherwise this whole check is moot).
    const anyTemplated = Object.values(SUMMON_LISTS.sm).some((entries) =>
      entries.some((e) => e.templated === true),
    );
    expect(anyTemplated).toBe(true);
  });

  it("carries no em or en dash in any string value", () => {
    const offenders = allStrings().filter(({ value }) => DASH_RE.test(value));
    expect(offenders).toEqual([]);
  });
});

// Hand-counted from each feat's table on aonprd.com (Summon Good Monster,
// Summon Neutral Monster, Summon Evil Monster FeatDisplay pages).
// The AP rows are hand-counted from d20pfsrd's "Alternative Summoning
// Options" tables on its Summon Monster / Summon Nature's Ally pages.
const EXPECTED_ALT_COUNTS: Record<string, Record<number, number>> = {
  good: { 1: 6, 2: 5, 3: 6, 4: 7, 5: 5, 6: 5, 7: 7, 8: 5, 9: 6 },
  neutral: { 1: 2, 2: 2, 3: 5, 4: 6, 5: 4, 6: 5, 7: 4, 8: 1, 9: 3 },
  evil: { 1: 6, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 7, 8: 7, 9: 7 },
  "ap-sm": { 1: 1, 2: 7, 3: 7, 4: 7, 5: 5, 6: 6, 7: 5, 8: 3, 9: 2 },
  "ap-sna": { 1: 0, 2: 5, 3: 1, 4: 5, 5: 4, 6: 2, 7: 3, 8: 0, 9: 0 },
};

const FEAT_LISTS = ["good", "neutral", "evil"] as const;

describe("SUMMON_ALT_LISTS (Summon Good/Neutral/Evil Monster, Alternative Summoning Options)", () => {
  it("matches the hand-counted row counts at every level", () => {
    for (const key of SUMMON_ALT_LIST_ORDER) {
      for (let level = 1; level <= 9; level++) {
        expect(SUMMON_ALT_LISTS[key].levels[level]?.length ?? 0, `${key}[${level}]`).toBe(
          EXPECTED_ALT_COUNTS[key]![level]!,
        );
      }
    }
  });

  it("the feat lists extend Summon Monster; the AP lists split by spell under one toggle", () => {
    for (const key of FEAT_LISTS) expect(SUMMON_ALT_LISTS[key].spell).toBe("sm");
    expect(SUMMON_ALT_LISTS["ap-sm"].spell).toBe("sm");
    expect(SUMMON_ALT_LISTS["ap-sna"].spell).toBe("sna");
    expect(SUMMON_ALT_LISTS["ap-sm"].toggleSlug).toBe(ALTERNATIVE_SUMMONING_OPTIONS_SLUG);
    expect(SUMMON_ALT_LISTS["ap-sna"].toggleSlug).toBe(ALTERNATIVE_SUMMONING_OPTIONS_SLUG);
  });

  it("every AP row names its Adventure Path", () => {
    for (const key of ["ap-sm", "ap-sna"] as const) {
      for (const entries of Object.values(SUMMON_ALT_LISTS[key].levels)) {
        for (const e of entries) {
          expect(e.note, `${key} "${e.label}"`).toMatch(/^Adventure Path #\d+/);
        }
      }
    }
  });

  it("every mapped id exists in the vendored bestiary, and every unmapped row says why", () => {
    const problems: string[] = [];
    for (const key of SUMMON_ALT_LIST_ORDER) {
      for (const [level, entries] of Object.entries(SUMMON_ALT_LISTS[key].levels)) {
        for (const e of entries) {
          if (e.monsterId !== null && !(e.monsterId in monsters)) {
            problems.push(`${key}[${level}] "${e.label}" -> ${e.monsterId}`);
          }
          if (e.monsterId === null && !e.note) {
            problems.push(`${key}[${level}] "${e.label}" has no id and no note`);
          }
          if (e.variants) problems.push(`${key}[${level}] "${e.label}" uses variants`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("only rows printed as celestial/fiendish (and, on the AP lists, young) carry a forced template", () => {
    for (const key of SUMMON_ALT_LIST_ORDER) {
      // "Young bronze dragon" on the good list is an age category, not the template.
      const re = key.startsWith("ap-") ? /^(Celestial|Fiendish|Young) / : /^(Celestial|Fiendish) /;
      for (const entries of Object.values(SUMMON_ALT_LISTS[key].levels)) {
        for (const e of entries) {
          const printed = re.exec(e.label)?.[1]?.toLowerCase();
          expect(e.template, `${key} "${e.label}"`).toBe(
            printed as "celestial" | "fiendish" | "young" | undefined,
          );
        }
      }
    }
  });

  it("feat-list rows never take the asterisk picker and their forced template matches the list's alignment", () => {
    for (const key of FEAT_LISTS) {
      for (const entries of Object.values(SUMMON_ALT_LISTS[key].levels)) {
        for (const e of entries) {
          expect(e.templated, `${key} "${e.label}"`).toBeUndefined();
          if (e.template) {
            expect(e.template, `${key} "${e.label}"`).toBe(
              key === "good" ? "celestial" : "fiendish",
            );
          }
        }
      }
    }
  });

  it("AP rows marked with the asterisk take the picker; young rows take both", () => {
    for (const key of ["ap-sm", "ap-sna"] as const) {
      for (const entries of Object.values(SUMMON_ALT_LISTS[key].levels)) {
        for (const e of entries) {
          expect(e.templated ?? false, `${key} "${e.label}"`).toBe(e.label.endsWith("*"));
          if (e.template === "young") expect(e.templated, `${key} "${e.label}"`).toBe(true);
        }
      }
    }
  });

  it("has unique labels within each level and no dashes anywhere", () => {
    for (const key of SUMMON_ALT_LIST_ORDER) {
      const def = SUMMON_ALT_LISTS[key];
      expect(DASH_RE.test(def.label + def.source)).toBe(false);
      for (const entries of Object.values(def.levels)) {
        const labels = entries.map((e) => e.label);
        expect(new Set(labels).size).toBe(labels.length);
        for (const e of entries) {
          expect(DASH_RE.test(e.label + (e.note ?? "")), `${key} "${e.label}"`).toBe(false);
        }
      }
    }
  });

  it("feat slugs follow the sheet's featNameSlug shape", () => {
    expect(FEAT_LISTS.map((k) => SUMMON_ALT_LISTS[k].toggleSlug)).toEqual([
      "summon-good-monster",
      "summon-neutral-monster",
      "summon-evil-monster",
    ]);
  });
});
