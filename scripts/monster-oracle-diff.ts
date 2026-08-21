/**
 * Diff the vendored monster collection's numeric fields against the d20pfsrd
 * community "Monsters DB" spreadsheet (Mike Chopswil's, frozen Feb 2014) —
 * the external oracle for the bestiary import and for any future pfdata bump
 * that touches `monsters.json`.
 *
 *   bun scripts/monster-oracle-diff.ts /path/to/chopswil.csv
 *
 * The CSV is NOT committed (it's d20pfsrd's compilation, not ours to vendor):
 * export it from the Google Sheet linked on d20pfsrd's "Monsters DB" page
 * (docs.google.com/spreadsheets/d/1StTeUz_ZBU3pNlW120msjUX34p9cs7kqQbZ2Ym7cSBE).
 *
 * Reading the report: the oracle predates the Bestiary second-printing errata
 * passes, so a small mismatch set is EXPECTED — the 2026-08 import validated
 * all 16 then-mismatching Paizo-Bestiary monsters against current published
 * text and every one resolved in the vendored data's favor. The numbers that
 * matter: per-book all-exact should stay ≥95% for the four Bestiary sources,
 * and any NEW mismatch after a bump wants the same current-text check before
 * shipping. Tome of Horrors / d20pfsrd-original rows are name collisions with
 * different monsters (pfdata is Paizo-only) — ignore their exactness.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The numeric slice of `Monster` (@pf1/schema) this diff reads — scripts/ stays free of workspace imports, so restated structurally. */
interface MonsterSlice {
  id: string;
  name: string;
  mythicRank?: number;
  ac?: number;
  touchAc?: number;
  flatFootedAc?: number;
  hp?: number;
  fort?: string;
  ref?: string;
  will?: string;
  abilityScores?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: bun scripts/monster-oracle-diff.ts /path/to/chopswil.csv");
  process.exit(1);
}

/* ------------------------------------------------------------------ csv -- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ------------------------------------------------------------- matching -- */

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Name variants for fuzzy matching: with/without parentheticals, and the
 * oracle's occasional "Family, Variant" inversion undone.
 */
function variants(rawName: string): string[] {
  const out = new Set<string>();
  const base = rawName.trim();
  out.add(normName(base));
  out.add(normName(base.replace(/\([^)]*\)/g, " ")));
  const paren = /\(([^)]*)\)/.exec(base)?.[1];
  const noParen = base.replace(/\([^)]*\)/g, "").trim();
  const comma = noParen.split(",").map((part) => part.trim());
  if (comma.length === 2) {
    out.add(normName(`${comma[1]} ${comma[0]}`));
    if (paren) out.add(normName(`${paren} ${comma[1]} ${comma[0]}`));
  }
  if (paren) {
    out.add(normName(`${paren} ${noParen}`));
    out.add(normName(`${noParen} ${paren}`));
  }
  return [...out].filter((v) => v !== "");
}

function intOf(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const m = /^[+-]?\d+/.exec(v.trim());
  return m ? parseInt(m[0], 10) : undefined;
}

/* ---------------------------------------------------------------- diff -- */

const monsters = Object.values(
  JSON.parse(
    readFileSync(join(repoRoot, "packages/data-pipeline/data/monsters.json"), "utf8"),
  ) as Record<string, MonsterSlice>,
);
const byName = new Map<string, MonsterSlice>();
const byNameMythic = new Map<string, MonsterSlice>();
for (const monster of monsters) {
  const map = monster.mythicRank !== undefined ? byNameMythic : byName;
  for (const v of variants(monster.name)) if (!map.has(v)) map.set(v, monster);
  // The oracle names mythic rows without the "Mythic" prefix the vendored
  // display name carries ("Apocalypse Locust" vs "Mythic Apocalypse Locust").
  if (monster.mythicRank !== undefined && monster.name.startsWith("Mythic ")) {
    for (const v of variants(monster.name.slice("Mythic ".length))) {
      if (!map.has(v)) map.set(v, monster);
    }
  }
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8"));
const col = Object.fromEntries(header!.map((h, i) => [h, i]));

const FIELDS: [string, (m: MonsterSlice) => number | undefined][] = [
  ["AC", (m) => m.ac],
  ["AC_Touch", (m) => m.touchAc],
  ["AC_Flat-footed", (m) => m.flatFootedAc],
  ["HP", (m) => m.hp],
  ["Fort", (m) => intOf(m.fort)],
  ["Ref", (m) => intOf(m.ref)],
  ["Will", (m) => intOf(m.will)],
  ["Str", (m) => m.abilityScores?.str],
  ["Dex", (m) => m.abilityScores?.dex],
  ["Con", (m) => m.abilityScores?.con],
  ["Int", (m) => m.abilityScores?.int],
  ["Wis", (m) => m.abilityScores?.wis],
  ["Cha", (m) => m.abilityScores?.cha],
];

const PAIZO_BESTIARIES = new Set([
  "PFRPG Bestiary",
  "PFRPG Bestiary 2",
  "PFRPG Bestiary 3",
  "PFRPG Bestiary 4",
]);

interface SourceStats {
  rows: number;
  matched: number;
  exactRows: number;
  mismatches: string[];
}
const perSource = new Map<string, SourceStats>();
const fieldStats = new Map<string, { compared: number; exact: number }>();
let matched = 0;
let unmatched = 0;

for (const row of rows) {
  const rawName = row[col.Name!];
  if (!rawName) continue;
  const source = row[col.Source!] ?? "??";
  const stats = perSource.get(source) ?? { rows: 0, matched: 0, exactRows: 0, mismatches: [] };
  perSource.set(source, stats);
  stats.rows++;

  const wantMythic = (row[col.Mythic!] ?? "").trim() === "1";
  const map = wantMythic ? byNameMythic : byName;
  let hit: MonsterSlice | undefined;
  for (const v of variants(rawName)) {
    hit = map.get(v);
    if (hit) break;
  }
  if (!hit) {
    unmatched++;
    continue;
  }
  matched++;
  stats.matched++;

  const rowMismatches: string[] = [];
  for (const [column, get] of FIELDS) {
    const oracle = intOf(row[col[column]!]);
    const ours = get(hit);
    if (oracle === undefined || ours === undefined) continue;
    const fs = fieldStats.get(column) ?? { compared: 0, exact: 0 };
    fieldStats.set(column, fs);
    if (PAIZO_BESTIARIES.has(source) || source === "Mythic Adventures") {
      fs.compared++;
      if (oracle === ours) fs.exact++;
    }
    if (oracle !== ours) rowMismatches.push(`${column} ours ${ours} vs oracle ${oracle}`);
  }
  if (rowMismatches.length === 0) stats.exactRows++;
  else stats.mismatches.push(`${rawName} [${hit.id}]: ${rowMismatches.join(", ")}`);
}

console.log(
  `vendored monsters: ${monsters.length}; oracle rows matched: ${matched}, unmatched: ${unmatched}`,
);
console.log("\nper-field exactness (Paizo Bestiary 1-4 + Mythic Adventures rows only):");
for (const [column, fs] of fieldStats) {
  console.log(
    `  ${column.padEnd(15)} compared ${String(fs.compared).padStart(5)}  exact ${((100 * fs.exact) / fs.compared).toFixed(2)}%`,
  );
}
console.log("\nper-source (>= 8 rows):");
for (const [source, stats] of [...perSource.entries()].sort((a, b) => b[1].rows - a[1].rows)) {
  if (stats.rows < 8) continue;
  const pct = stats.matched > 0 ? ((100 * stats.exactRows) / stats.matched).toFixed(1) : "-";
  console.log(
    `  ${source.padEnd(34)} rows ${String(stats.rows).padStart(4)}  matched ${String(stats.matched).padStart(4)}  all-exact ${pct}%`,
  );
}
for (const book of PAIZO_BESTIARIES) {
  const stats = perSource.get(book);
  if (!stats || stats.mismatches.length === 0) continue;
  console.log(`\n${book} mismatches:`);
  for (const line of stats.mismatches) console.log(`  ${line}`);
}
