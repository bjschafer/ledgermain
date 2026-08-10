/**
 * Mechanization-coverage audit: for every selectable option and granted
 * feature in the refdata, reports whether it moves numbers through the
 * engine (a `Change`/`choiceChanges` route, vendored or hand-authored),
 * is surfaced as a reminder (`contextNotes` / a notes-only effect entry),
 * or is pure prose — and flags prose whose text implies a numeric effect
 * the sheet never applies (typed bonuses, level-scaling additions,
 * resistances, speeds).
 *
 * `bun run coverage:mech` prints the per-domain summary and top candidates.
 * `bun run coverage:mech --md <path>` also writes the full ranked report.
 *
 * Archetype features additionally consult `ARCHETYPE_FEATURE_CLASSIFICATION`:
 * a feature the extraction waves deliberately ruled situational/subsystem/
 * blocked counts as reviewed and never flags; a `numeric` verdict that never
 * produced a wired effect still does.
 *
 * Heuristic, not a verdict: a flagged entry may be legitimately
 * situational, and an unflagged one may still deserve wiring. It ranks
 * candidates for promotion; it does not close them.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { RefData } from "../packages/schema/src/index.js";
import { loadRefData } from "../packages/data-pipeline/src/index.js";

import { mergedAlchemistDiscoveryCatalog } from "../packages/engine/src/alchemist-discoveries.js";
import { mergedArcanistExploitCatalog } from "../packages/engine/src/arcanist-exploits.js";
import { resolveArchetypeFeatureEffect } from "../packages/engine/src/archetype-effects-resolve.js";
import { ARCHETYPE_FEATURE_CLASSIFICATION } from "../packages/engine/src/archetype-extracted/index.js";
import { mergedSorcererBloodlineCatalog } from "../packages/engine/src/bloodlines.js";
import { mergedBloodragerBloodlineCatalog } from "../packages/engine/src/bloodrager-bloodlines.js";
import { BUFF_CHANGE_PATCHES } from "../packages/engine/src/buff-effects.js";
import { mergedOrderCatalog } from "../packages/engine/src/cavalier-orders.js";
import { CLASS_FEATURE_CHANGE_PATCHES } from "../packages/engine/src/class-feature-effects.js";
import { featNameSlug } from "../packages/engine/src/feat-effects.js";
import { resolveFeatEffect } from "../packages/engine/src/feat-effects-resolve.js";
import { mergedInvestigatorTalentCatalog } from "../packages/engine/src/investigator-talents.js";
import { mergedKineticistWildTalentCatalog } from "../packages/engine/src/kineticist-wild-talents.js";
import { mergedMagusArcanaCatalog } from "../packages/engine/src/magus-arcana.js";
import { mergedMediumSpiritCatalog } from "../packages/engine/src/medium-spirits.js";
import { mergedMesmeristBoldStareCatalog } from "../packages/engine/src/mesmerist-bold-stares.js";
import { mergedMesmeristTrickCatalog } from "../packages/engine/src/mesmerist-tricks.js";
import { mergedMonkKiPowerCatalog } from "../packages/engine/src/monk-ki-powers.js";
import { mergedMonkStyleStrikeCatalog } from "../packages/engine/src/monk-style-strikes.js";
import { mergedNinjaTrickCatalog } from "../packages/engine/src/ninja-tricks.js";
import { mergedOccultistImplementCatalog } from "../packages/engine/src/occultist-implements.js";
import { mergedOracleCurseCatalog } from "../packages/engine/src/oracle-curses.js";
import { mergedOracleMysteryCatalog } from "../packages/engine/src/oracle-mysteries.js";
import { ORACLE_REVELATIONS } from "../packages/engine/src/oracle-revelations.js";
import { mergedPhrenicAmplificationCatalog } from "../packages/engine/src/phrenic-amplifications.js";
import { mergedPsychicDisciplineCatalog } from "../packages/engine/src/psychic-disciplines.js";
import { RACIAL_TRAITS } from "../packages/engine/src/racial-traits.js";
import { mergedRagePowerCatalog } from "../packages/engine/src/rage-powers.js";
import { mergedRogueTalentCatalog } from "../packages/engine/src/rogue-talents.js";
import { mergedShamanHexCatalog } from "../packages/engine/src/shaman-hexes.js";
import { mergedShamanSpiritCatalog } from "../packages/engine/src/shaman-spirits.js";
import { mergedShifterAspectCatalog } from "../packages/engine/src/shifter-aspects.js";
import { mergedSlayerTalentCatalog } from "../packages/engine/src/slayer-talents.js";
import { resolveTraitDef } from "../packages/engine/src/traits.js";
import {
  mergedVigilanteSocialTalentCatalog,
  mergedVigilanteTalentCatalog,
} from "../packages/engine/src/vigilante-talents.js";
import { mergedWitchHexCatalog } from "../packages/engine/src/witch-hexes.js";
import { mergedWitchPatronCatalog } from "../packages/engine/src/witch-patrons.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "packages", "data-pipeline", "data");

// ---------------------------------------------------------------------------
// Prose signals: text that implies a number the sheet should be moving.
// Weighted so passive always-on effects outrank activated/situational ones.
// ---------------------------------------------------------------------------

const SIGNALS: readonly [name: string, weight: number, rx: RegExp][] = [
  [
    "typed-bonus",
    3,
    /[+-]\d+\s+(?:(?:dodge|morale|insight|luck|sacred|profane|competence|circumstance|enhancement|deflection|natural armor|resistance|alchemical|racial|size|trait|untyped)\s+)?(?:bonus|penalty)/i,
  ],
  [
    "bonus-on-roll",
    3,
    /(?:bonus|penalty)\s+(?:on|to)\s+(?:attack|damage|saving throws?|saves?|initiative|AC|armor class|CMB|CMD|caster level|concentration|skill|[A-Z][a-z]+ checks?)/i,
  ],
  ["level-scaling", 3, /equal to (?:1\/2\s+|half\s+)?(?:your|her|his|their)?\s*(?:\w+\s+)?level/i],
  [
    "ability-mod",
    3,
    /(?:add|equal to)\s+(?:your|her|his|their)\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(?:modifier|bonus)/i,
  ],
  ["increase-by", 2, /increases?\s+(?:by|to)\s+\d+|\bby\s+an?\s+additional\s+\d+/i],
  [
    "resistance-dr",
    2,
    /(?:resistance|DR|damage reduction|spell resistance|SR)\s*\d+|resistance\s+\d+\s+(?:against|to)/i,
  ],
  [
    "speed",
    2,
    /speed\s+(?:increases?|of|by)\s+\d+\s*(?:feet|ft)|\bfly speed\b|\bclimb speed\b|\bswim speed\b|\bburrow speed\b/i,
  ],
  ["hp", 2, /(?:hit points?|temporary hit points?)\s+(?:equal to|per|\+)/i],
  ["crit-range", 2, /critical (?:threat )?range|threat range/i],
  ["extra-attack", 2, /additional attack|extra attack/i],
  ["uses-per-day", 1, /\d+\s*(?:time|use)s?\s+per\s+day|per\s+day\s+equal to/i],
  ["pool", 1, /\bpool\b.{0,40}\bpoints?\b/i],
  ["class-skill", 1, /(?:is|are|becomes?|as)\s+(?:a\s+)?class skills?\b/i],
];

const ACTIVATED =
  /as a (?:standard|move|swift|immediate|full-round) action|\bspend\b|\bexpend\b|when you|whenever (?:you|she|he|they)|until the (?:beginning|end) of/i;

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;|&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Entry model
// ---------------------------------------------------------------------------

type Status = "wired" | "noted" | "prose";

interface Audited {
  domain: string;
  name: string;
  status: Status;
  /** Explicitly triaged as prose-only by a hand table (`displayOnly: true`). */
  acknowledged: boolean;
  /**
   * An extraction wave issued a deliberate not-wireable verdict
   * (classification bucket `situational`/`subsystem`/`blocked`), so this
   * entry is reviewed backlog, not undiscovered backlog — excluded from
   * flagging entirely, unlike `acknowledged` which only annotates.
   */
  reviewed: boolean;
  activated: boolean;
  score: number;
  signals: string[];
  excerpt: string;
}

/**
 * "Moves a real number" for a hand/merged def of any domain shape: every
 * `Change` (top-level, choice-keyed, or option-keyed) serializes with a
 * `"formula"` key, and nothing prose-only does (`contextNotes` are
 * `{target, text}`; `uses.maxFormula` serializes capitalized).
 */
function defMovesNumbers(def: unknown): boolean {
  return /"formula"/.test(JSON.stringify(def) ?? "");
}

function rec(v: unknown): Record<string, unknown> {
  return (v ?? {}) as Record<string, unknown>;
}

function arrayLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function scoreProse(text: string): Pick<Audited, "activated" | "score" | "signals"> {
  const signals: string[] = [];
  let score = 0;
  for (const [name, weight, rx] of SIGNALS) {
    if (rx.test(text)) {
      signals.push(name);
      score += weight;
    }
  }
  const activated = ACTIVATED.test(text);
  if (activated && score > 0) score -= 1;
  return { activated, score, signals };
}

function audit(
  domain: string,
  name: string,
  status: Status,
  acknowledged: boolean,
  text: string,
  reviewed = false,
): Audited {
  const prose = stripHtml(text);
  const { activated, score, signals } =
    status === "wired"
      ? { activated: false, score: 0, signals: [] as string[] }
      : scoreProse(prose);
  return {
    domain,
    name,
    status,
    acknowledged,
    reviewed,
    activated,
    score,
    signals,
    excerpt: prose.slice(0, 200),
  };
}

// ---------------------------------------------------------------------------
// Description index: entry name (lowercased) -> vendored description prose.
// Merged catalog entries carry short summaries; the vendored description is
// the richer signal source, so prefer it when a name matches.
// ---------------------------------------------------------------------------

function buildDescriptionIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith(".json") || file === "meta.json") continue;
    const parsed: unknown = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) continue;
    for (const raw of Object.values(parsed)) {
      const e = rec(raw);
      if (typeof e.name === "string" && typeof e.description === "string") {
        const key = e.name.toLowerCase();
        if (!index.has(key)) index.set(key, e.description);
      }
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

function loadDataFile(file: string): Record<string, Record<string, unknown>> {
  return JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")) as Record<
    string,
    Record<string, unknown>
  >;
}

function main(): void {
  const refData = loadRefData();
  const descriptions = buildDescriptionIndex();
  const results: Audited[] = [];

  const textFor = (name: string, summary: unknown): string => {
    const desc = descriptions.get(name.toLowerCase());
    const sum = typeof summary === "string" ? summary : "";
    // Both when available: the summary sometimes states mechanics the
    // vendored blob buries, and vice versa.
    return desc ? `${desc} ${sum}` : sum;
  };

  const auditCatalog = (domain: string, entries: unknown[]): void => {
    for (const raw of entries) {
      const e = rec(raw);
      const name = typeof e.name === "string" ? e.name : String(e.id ?? e.slug ?? "?");
      const wired = defMovesNumbers(raw);
      const noted = arrayLen(e.contextNotes) > 0;
      const status: Status = wired ? "wired" : noted ? "noted" : "prose";
      results.push(audit(domain, name, status, e.displayOnly === true, textFor(name, e.summary)));
    }
  };

  const catalogs: readonly [string, (ref: RefData) => unknown[]][] = [
    ["alchemist-discoveries", mergedAlchemistDiscoveryCatalog],
    ["arcanist-exploits", mergedArcanistExploitCatalog],
    ["bloodrager-bloodlines", mergedBloodragerBloodlineCatalog],
    ["cavalier-orders", mergedOrderCatalog],
    ["investigator-talents", mergedInvestigatorTalentCatalog],
    ["kineticist-wild-talents", mergedKineticistWildTalentCatalog],
    ["magus-arcana", mergedMagusArcanaCatalog],
    ["medium-spirits", mergedMediumSpiritCatalog],
    ["mesmerist-bold-stares", mergedMesmeristBoldStareCatalog],
    ["mesmerist-tricks", mergedMesmeristTrickCatalog],
    ["monk-ki-powers", mergedMonkKiPowerCatalog],
    ["monk-style-strikes", mergedMonkStyleStrikeCatalog],
    ["ninja-tricks", mergedNinjaTrickCatalog],
    ["occultist-implements", mergedOccultistImplementCatalog],
    ["oracle-curses", mergedOracleCurseCatalog],
    ["oracle-mysteries", mergedOracleMysteryCatalog],
    ["phrenic-amplifications", mergedPhrenicAmplificationCatalog],
    ["psychic-disciplines", mergedPsychicDisciplineCatalog],
    ["rage-powers", mergedRagePowerCatalog],
    ["rogue-talents", mergedRogueTalentCatalog],
    ["shaman-hexes", mergedShamanHexCatalog],
    ["shaman-spirits", mergedShamanSpiritCatalog],
    ["shifter-aspects", mergedShifterAspectCatalog],
    ["slayer-talents", mergedSlayerTalentCatalog],
    ["sorcerer-bloodlines", mergedSorcererBloodlineCatalog],
    ["vigilante-social-talents", mergedVigilanteSocialTalentCatalog],
    ["vigilante-talents", mergedVigilanteTalentCatalog],
    ["witch-hexes", mergedWitchHexCatalog],
    ["witch-patrons", mergedWitchPatronCatalog],
  ];
  for (const [domain, catalog] of catalogs) auditCatalog(domain, catalog(refData));

  auditCatalog("oracle-revelations", Object.values(ORACLE_REVELATIONS));

  // Vendored-changes domains: the vendored entry itself may carry changes,
  // with a hand table or patch layered on top.
  for (const [id, e] of Object.entries(loadDataFile("class-features.json"))) {
    const name = typeof e.name === "string" ? e.name : id;
    const wired = arrayLen(e.changes) > 0 || CLASS_FEATURE_CHANGE_PATCHES[name] !== undefined;
    const noted = arrayLen(e.actions) > 0 || e.uses !== undefined || arrayLen(e.grantsBuffs) > 0;
    results.push(
      audit(
        "class-features",
        name,
        wired ? "wired" : noted ? "noted" : "prose",
        false,
        typeof e.description === "string" ? e.description : "",
      ),
    );
  }

  for (const [id, e] of Object.entries(loadDataFile("archetype-features.json"))) {
    const name = typeof e.name === "string" ? e.name : id;
    const resolved = resolveArchetypeFeatureEffect(id);
    const wired = resolved !== undefined && resolved.effect.changes.length > 0;
    // A wave verdict of situational/subsystem/blocked is a deliberate
    // prose-only ruling; `numeric` without an effect entry is real backlog.
    const verdict = ARCHETYPE_FEATURE_CLASSIFICATION[id];
    const reviewed = verdict !== undefined && verdict.bucket !== "numeric";
    results.push(
      audit(
        "archetype-features",
        name,
        wired ? "wired" : resolved !== undefined ? "noted" : "prose",
        false,
        typeof e.description === "string" ? e.description : "",
        reviewed,
      ),
    );
  }

  for (const e of Object.values(loadDataFile("feats.json"))) {
    if (typeof e.name !== "string") continue;
    const resolved = resolveFeatEffect(featNameSlug(e.name));
    const wired = resolved !== undefined && defMovesNumbers(resolved.entry);
    results.push(
      audit(
        "feats",
        e.name,
        wired ? "wired" : resolved !== undefined ? "noted" : "prose",
        false,
        typeof e.description === "string" ? e.description : "",
      ),
    );
  }

  for (const [id, e] of Object.entries(loadDataFile("traits.json"))) {
    const name = typeof e.name === "string" ? e.name : id;
    const def = resolveTraitDef(id, refData);
    const wired = arrayLen(e.changes) > 0 || (def !== undefined && defMovesNumbers(def));
    const noted = arrayLen(e.contextNotes) > 0;
    results.push(
      audit(
        "traits",
        name,
        wired ? "wired" : noted ? "noted" : "prose",
        rec(def).displayOnly === true,
        typeof e.description === "string" ? e.description : "",
      ),
    );
  }

  for (const [id, e] of Object.entries(loadDataFile("racial-traits.json"))) {
    const name = typeof e.name === "string" ? e.name : id;
    const hand: unknown = RACIAL_TRAITS[id];
    const wired = arrayLen(e.changes) > 0 || (hand !== undefined && defMovesNumbers(hand));
    const noted = arrayLen(e.contextNotes) > 0;
    results.push(
      audit(
        "racial-traits",
        name,
        wired ? "wired" : noted ? "noted" : "prose",
        false,
        typeof e.description === "string" ? e.description : "",
      ),
    );
  }

  for (const [id, e] of Object.entries(loadDataFile("buffs.json"))) {
    const name = typeof e.name === "string" ? e.name : id;
    const wired = arrayLen(e.changes) > 0 || BUFF_CHANGE_PATCHES[name] !== undefined;
    const noted = arrayLen(e.contextNotes) > 0;
    results.push(
      audit(
        "buffs",
        name,
        wired ? "wired" : noted ? "noted" : "prose",
        false,
        typeof e.description === "string" ? e.description : "",
      ),
    );
  }

  report(results);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const FLAG_THRESHOLD = 3;

function report(results: Audited[]): void {
  const domains = [...new Set(results.map((r) => r.domain))].sort();
  const lines: string[] = [];
  lines.push(
    `${"domain".padEnd(26)} ${"total".padStart(6)} ${"wired".padStart(6)} ${"noted".padStart(6)} ${"prose".padStart(6)} ${"revwd".padStart(6)} ${"flagged".padStart(8)}`,
  );
  let flaggedTotal = 0;
  for (const domain of domains) {
    const rs = results.filter((r) => r.domain === domain);
    const wired = rs.filter((r) => r.status === "wired").length;
    const noted = rs.filter((r) => r.status === "noted").length;
    const prose = rs.filter((r) => r.status === "prose").length;
    const reviewed = rs.filter((r) => r.reviewed).length;
    const flagged = rs.filter(
      (r) => r.status !== "wired" && !r.reviewed && r.score >= FLAG_THRESHOLD,
    ).length;
    flaggedTotal += flagged;
    lines.push(
      `${domain.padEnd(26)} ${String(rs.length).padStart(6)} ${String(wired).padStart(6)} ${String(noted).padStart(6)} ${String(prose).padStart(6)} ${String(reviewed).padStart(6)} ${String(flagged).padStart(8)}`,
    );
  }
  lines.push("");
  lines.push(
    `flagged = not numbers-wired, not review-triaged (revwd), and prose signals score >= ${FLAG_THRESHOLD}. Total flagged: ${flaggedTotal}`,
  );
  console.log(lines.join("\n"));

  const ranked = results
    .filter((r) => r.status !== "wired" && !r.reviewed && r.score >= FLAG_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  console.log("\nTop candidates (passive weighted above activated):");
  for (const r of ranked.slice(0, 30)) {
    const marks = [r.status, r.acknowledged ? "ack" : "", r.activated ? "act" : ""]
      .filter(Boolean)
      .join(",");
    console.log(
      `  [${String(r.score).padStart(2)}] ${r.domain} :: ${r.name} (${marks}) ${r.signals.join(",")}`,
    );
  }

  const mdFlag = process.argv.indexOf("--md");
  if (mdFlag !== -1) {
    const path = process.argv[mdFlag + 1];
    if (!path) {
      console.error("--md requires a file path");
      process.exit(1);
    }
    const md: string[] = ["# Mechanization coverage report", ""];
    md.push("```text", ...lines, "```", "");
    for (const domain of domains) {
      const rs = ranked.filter((r) => r.domain === domain);
      if (rs.length === 0) continue;
      md.push(`## ${domain} (${rs.length} flagged)`, "");
      for (const r of rs) {
        const marks = [
          r.status,
          r.acknowledged ? "acknowledged" : "",
          r.activated ? "activated" : "",
        ]
          .filter(Boolean)
          .join(", ");
        md.push(`- **${r.name}** [${r.score}] (${marks}) ${r.signals.join(", ")}`);
        md.push(`  > ${r.excerpt}`);
      }
      md.push("");
    }
    writeFileSync(path, md.join("\n"));
    console.log(`\nFull report written to ${path}`);
  }
}

main();
