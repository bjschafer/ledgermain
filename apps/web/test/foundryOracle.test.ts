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
import {
  ABILITY_IDS,
  normalizeSkillId,
  type CharacterDoc,
  type DerivedSheet,
  type SavedRoll,
} from "@pf1/schema";

import type { OracleAttack, OracleSpec } from "../scripts/foundry-oracle/specs.js";
import { importFoundryActor, isFoundryActorExport } from "../src/model/importFoundry.js";
import { setWeaponTrainingGroup } from "../src/model/doc.js";
import { setFeatChoice } from "../src/model/feats.js";
import { ownedFeatSlugs, resolveSavedRoll } from "../src/model/savedRolls.js";
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

/** One weapon used one way: the full-attack sequence and its damage. */
interface FoundryAttack {
  attack: number[];
  damage: number;
  dice: string;
}

interface Fixture {
  spec: OracleSpec;
  scenarios: Record<
    string,
    { actor: unknown; derived: FoundryDerived; attacks: Record<string, FoundryAttack> }
  >;
}

type Stat = number | string | undefined;

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

/**
 * The same use of the weapon at `index` in Ledgermain: the attack-dialog
 * settings become what a player sets here instead (a grip on the weapon,
 * Power Attack attached to a saved roll), and the numbers come off the
 * resolved roll's copyable formulas.
 */
function ourAttack(
  doc: CharacterDoc,
  index: number,
  variant: OracleAttack | undefined,
): { attack: number[]; damage: number; dice: string } | undefined {
  let d = doc;
  if (variant?.held === "2h") {
    const weapons = (d.build.weapons ?? []).map((w, i) =>
      i === index ? { ...w, damageMultiplier: 1.5 } : w,
    );
    d = { ...d, build: { ...d.build, weapons } };
  }
  const sheet = compute(d, refData);
  const atk = sheet.attacks[index];
  if (!atk) return undefined;
  const roll: SavedRoll = {
    id: "oracle",
    label: "oracle",
    source: { kind: "weapon", weaponName: atk.name },
    ...(variant?.powerAttack
      ? {
          feats: [
            {
              slug: "power-attack",
              name: "Power Attack",
              option: (atk.damageMultiplier ?? 1) >= 1.5 ? "two-handed" : "one-handed",
            },
          ],
        }
      : {}),
    ...(variant?.held === "oh" ? { twf: { offHand: "light", offHandWeapon: atk.name } } : {}),
  };
  const resolved = resolveSavedRoll(roll, sheet, ownedFeatSlugs(d, refData));
  const damage = variant?.held === "oh" ? resolved.offHandDamage : resolved.damage;
  if (!resolved.formula || !damage) return undefined;
  const damageParts = /^(\d+d\d+)(?: ([+-]) (\d+))?$/.exec(damage.formula);
  if (!damageParts && !/^-?\d+$/.test(damage.formula)) {
    throw new Error(`Unsupported damage formula: ${damage.formula}`);
  }
  return {
    attack: resolved.formula.split("\n").map((f) => {
      const parts = /^1d20(?: ([+-]) (\d+))?$/.exec(f);
      if (!parts) throw new Error(`Unsupported attack formula: ${f}`);
      return parts[2] ? Number(`${parts[1]}${parts[2]}`) : 0;
    }),
    damage: damageParts
      ? damageParts[3]
        ? Number(`${damageParts[2]}${damageParts[3]}`)
        : 0
      : Number(damage.formula),
    dice: damageParts?.[1] ?? "",
  };
}

/** Every weapon line, keyed `attacks.<weapon>[.<variant>]`. */
function attackStats(
  fixture: Fixture,
  actor: { items?: { type?: string; name?: string }[] },
  doc: CharacterDoc,
  attacks: Record<string, FoundryAttack>,
): [stat: string, foundry: Stat, ours: Stat][] {
  const weapons = (actor.items ?? [])
    .filter((i) => i.type === "weapon")
    .map((i) => {
      if (!i.name) throw new Error("Weapon export has no name");
      return i.name;
    });
  const rows: [string, Stat, Stat][] = [];
  // A missing dump or variant must fail, not quietly remove comparisons.
  const expectedKeys = weapons.flatMap((name) => [
    name,
    ...(fixture.spec.items.find((i) => i.name === name)?.attacks ?? []).map(
      (v) => `${name}.${v.id}`,
    ),
  ]);
  expect(Object.keys(attacks).sort()).toEqual(expectedKeys.sort());
  expect(doc.build.weapons?.length ?? 0).toBe(weapons.length);
  for (const [key, foundry] of Object.entries(attacks)) {
    const [name, variantId] = key.split(".");
    const variant = variantId
      ? fixture.spec.items.find((i) => i.name === name)?.attacks?.find((a) => a.id === variantId)
      : undefined;
    const ours = ourAttack(doc, weapons.indexOf(name!), variant);
    const prefix = `attacks.${key}`;
    // Foundry's off-hand toggle only changes damage; two-weapon attack
    // penalties and extra attacks are left to the player there.
    if (variant?.held !== "oh") {
      rows.push([`${prefix}.attack`, foundry.attack.join("/"), ours?.attack.join("/")]);
    }
    rows.push([`${prefix}.damage`, foundry.damage, ours?.damage]);
    rows.push([`${prefix}.dice`, foundry.dice, ours?.dice]);
  }
  return rows;
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
    for (const [scenario, { actor, derived, attacks }] of Object.entries(fixture.scenarios)) {
      it(`${id} [${scenario}] imports cleanly and matches Foundry`, () => {
        if (!isFoundryActorExport(actor)) throw new Error(`${id}: not a Foundry actor export`);
        const imported = importFoundryActor(actor, refData);
        const featChoices = fixture.spec.choices?.feats ?? {};
        expect([...imported.report.unmapped].sort()).toEqual(
          Object.keys(featChoices)
            .map((name) => `Feat: ${name} needs its choice picked on the Feats step.`)
            .sort(),
        );
        let doc = imported.doc;
        for (const [name, choice] of Object.entries(featChoices)) {
          const feat = Object.values(refData.feats).find((f) => f.name === name);
          if (!feat || !doc.build.feats.includes(feat.id)) throw new Error(`Missing feat ${name}`);
          doc = setFeatChoice(doc, feat.id, choice);
        }
        for (const [tier, group] of (fixture.spec.choices?.weaponTrainingGroups ?? []).entries()) {
          doc = setWeaponTrainingGroup(doc, tier, group);
        }

        const sheet = compute(doc, refData);
        const rows: [string, Stat, Stat][] = [
          ...[...foundryStats(derived)].map(([stat, foundry]): [string, Stat, Stat] => [
            stat,
            foundry,
            ourStat(sheet, stat),
          ]),
          ...attackStats(fixture, actor, doc, attacks),
        ];
        const unlisted: string[] = [];
        for (const [stat, foundry, ours] of rows) {
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
