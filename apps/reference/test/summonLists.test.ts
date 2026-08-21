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

import { SUMMON_LISTS, SUMMON_SPELL_LABEL, type SummonSpell } from "../src/model/summonLists.js";

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
