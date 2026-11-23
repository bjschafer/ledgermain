/**
 * Differential test against Foundry PF1 as a behavioral oracle. Each fixture
 * in `fixtures/foundry/` is a character Foundry built and computed (see
 * `scripts/foundry-oracle/dump.ts`): its exported actor data next to the
 * numbers Foundry derived. Here the same export goes through the player-facing
 * importer, then `compute`, and every number is compared. A difference fails
 * unless `foundryDivergences.ts` lists it with a verdict, and a listed
 * divergence that no longer occurs fails too, so the list only shrinks.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadRefData } from "@pf1/data-pipeline";
import { compute } from "@pf1/engine";
import { ABILITY_IDS, normalizeSkillId, type DerivedSheet } from "@pf1/schema";

import { importFoundryActor, isFoundryActorExport } from "../src/model/importFoundry.js";
import { DIVERGENCES, type Divergence } from "./foundryDivergences.js";

interface FoundryDerived {
  abilities: Record<string, { total: number; mod: number }>;
  ac: { normal: number; touch: number; flatFooted: number };
  cmb: number;
  cmd: { total: number; flatFooted: number };
  saves: { fort: number; ref: number; will: number };
  init: number;
  bab: number;
  attack: { melee: number; ranged: number };
  hp: { max: number };
  speed: { land: number };
  sr: number;
  skills: Record<string, number>;
}

interface Fixture {
  scenarios: Record<string, { actor: unknown; derived: FoundryDerived }>;
}

/** Foundry's parent rows for skills that only exist as subskills. */
const SKILL_PARENTS: Record<string, true> = { knowledge: true };

function foundryStats(d: FoundryDerived): Map<string, number> {
  const out = new Map<string, number>();
  for (const ability of ABILITY_IDS) {
    out.set(`abilities.${ability}.total`, d.abilities[ability]!.total);
    out.set(`abilities.${ability}.mod`, d.abilities[ability]!.mod);
  }
  out.set("ac.normal", d.ac.normal);
  out.set("ac.touch", d.ac.touch);
  out.set("ac.flatFooted", d.ac.flatFooted);
  out.set("cmb", d.cmb);
  out.set("cmd", d.cmd.total);
  out.set("cmd.flatFooted", d.cmd.flatFooted);
  out.set("saves.fort", d.saves.fort);
  out.set("saves.ref", d.saves.ref);
  out.set("saves.will", d.saves.will);
  out.set("init", d.init);
  out.set("bab", d.bab);
  out.set("attack.melee", d.attack.melee);
  out.set("attack.ranged", d.attack.ranged);
  out.set("hp.max", d.hp.max);
  out.set("speed.land", d.speed.land);
  out.set("sr", d.sr);
  for (const [long, total] of Object.entries(d.skills)) {
    if (SKILL_PARENTS[long]) continue;
    out.set(`skills.${normalizeSkillId(long)}`, total);
  }
  return out;
}

function ourStat(sheet: DerivedSheet, key: string): number | undefined {
  const [head, a, b] = key.split(".");
  switch (head) {
    case "abilities":
      return b === "mod" ? sheet.abilities[a as "str"].mod : sheet.abilities[a as "str"].total;
    case "ac":
      return sheet.ac[a as "normal" | "touch" | "flatFooted"];
    case "cmb":
      return sheet.cmb;
    case "cmd":
      return a === "flatFooted" ? sheet.cmdFlatFooted : sheet.cmd;
    case "saves":
      return sheet.saves[a as "fort" | "ref" | "will"].total;
    case "init":
      return sheet.initiative.total;
    case "bab":
      return sheet.bab;
    case "attack":
      return sheet.attack[a as "melee" | "ranged"].total;
    case "hp":
      return sheet.hp.max;
    case "speed":
      return sheet.speeds.land ?? 0;
    case "sr":
      return sheet.defenses?.sr?.total ?? 0;
    case "skills":
      return sheet.skills[key.slice("skills.".length)]?.total;
    default:
      return undefined;
  }
}

function listed(actor: string, scenario: string, stat: string): Divergence | undefined {
  return DIVERGENCES.find(
    (d) =>
      (d.actor === "*" || d.actor === actor) &&
      (d.scenario === "*" || d.scenario === scenario) &&
      d.stat === stat,
  );
}

const refData = loadRefData();
const dir = join(import.meta.dir, "fixtures/foundry");
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({
    id: f.replace(/\.json$/, ""),
    fixture: JSON.parse(readFileSync(join(dir, f), "utf8")) as Fixture,
  }));

describe("Foundry PF1 oracle", () => {
  const seen = new Set<Divergence>();

  for (const { id, fixture } of fixtures) {
    for (const [scenario, { actor, derived }] of Object.entries(fixture.scenarios)) {
      it(`${id} [${scenario}] imports cleanly and matches Foundry`, () => {
        if (!isFoundryActorExport(actor)) throw new Error(`${id}: not a Foundry actor export`);
        const { doc, report } = importFoundryActor(actor, refData);
        expect(report.unmapped).toEqual([]);

        const sheet = compute(doc, refData);
        const unlisted: string[] = [];
        for (const [stat, foundry] of foundryStats(derived)) {
          const ours = ourStat(sheet, stat);
          if (ours === foundry) continue;
          const entry = listed(id, scenario, stat);
          if (
            entry &&
            (!entry.values ||
              (entry.values.foundry === foundry && entry.values.ledgermain === ours))
          ) {
            seen.add(entry);
            continue;
          }
          unlisted.push(`${stat}: foundry ${foundry}, ledgermain ${ours}`);
        }
        expect(unlisted).toEqual([]);
      });
    }
  }

  it("lists no divergence that no longer occurs", () => {
    const stale = DIVERGENCES.filter((d) => !seen.has(d)).map(
      (d) => `${d.actor} [${d.scenario}] ${d.stat}`,
    );
    expect(stale).toEqual([]);
  });
});
