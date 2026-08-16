/**
 * Arcane Pool (magus) and Arcane Reservoir (arcanist) spend toggles — the
 * `tableOptions` counterpart to `bardic-performances.ts` / `raging-song.ts`
 * for these two resource pools (`resources.ts`'s `feature.tag ===
 * "arcanePool"` / `"arcaneReservoir"` branches).
 *
 * `arcanePoolToggleOptions` surfaces two independent slices: the base
 * weapon-enhancement spend every magus gets at 1st level (or its
 * archetype-redirected equivalent, see below), plus a `spendToggle` row for
 * every picked magus arcanum that carries one (`magus-arcana.ts`).
 * `arcaneReservoirToggleOptions` mirrors this for the arcanist: the base
 * "boost a spell's DC" spend, plus a `spendToggle` row per picked exploit
 * (`arcanist-exploits.ts`). Arcane Reservoir has no archetype-aware base
 * table today (unlike Arcane Pool, which the magus's own archetypes can
 * redirect), so `arcaneReservoirToggleOptions` takes no `classLevel`/
 * `classArchetypeIds`.
 *
 * Archetype redirects (Arcane Pool only): `class-feature-classification`'s
 * magus entries note two archetypes that stop the base Arcane Pool from
 * enhancing a weapon at all (`archetype-extracted/magus.ts`) —
 * `magus:armored-battlemage` (redirects the identical point/level schedule
 * onto worn armor instead) and `magus:greensting-slayer` (redirects it into
 * sneak attack dice, a dice-based bonus this engine can't express as a flat
 * Change). The base weapon option is swapped for an armor variant for the
 * former and suppressed (context-note only) for the latter — see
 * `ARCANE_POOL_ARMOR_ARCHETYPES` / `ARCANE_POOL_SNEAK_ATTACK_ARCHETYPES`
 * below. Every other magus archetype that touches Arcane Pool only
 * restricts or extends what it can enhance (ranged weapons, unarmed
 * strikes, shields, ...) without dropping the weapon option itself, so the
 * base option stays wired for those.
 */

import type { Change, ContextNote } from "@pf1/schema";

import { ARCANIST_EXPLOITS } from "./arcanist-exploits.js";
import { MAGUS_ARCANA } from "./magus-arcana.js";
import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for the Arcane Pool — see `resources.ts`'s `feature.tag === "arcanePool"` branch. */
export const ARCANE_POOL_DETAIL = "points/day · toggle arcana below";

/** Resource-pool `detail` line for the Arcane Reservoir — see `resources.ts`'s `feature.tag === "arcaneReservoir"` branch. */
export const ARCANE_RESERVOIR_DETAIL = "points · toggle exploits below";

/** RAW schedule shared by both the base weapon spend and the Armored Battlemage armor redirect: +1 enhancement at 1st, +1 per 4 magus levels beyond 1st, max +5 at 17th. */
const ARCANE_POOL_ENHANCEMENT_FORMULA = "min(5, 1 + floor((@classes.magus.level - 1) / 4))";

/** Magus archetype ids whose Arcane Pool redirects the base weapon spend onto worn armor instead (Armored Battlemage, UM p.4). */
const ARCANE_POOL_ARMOR_ARCHETYPES = new Set(["magus:armored-battlemage"]);

/** Magus archetype ids whose Arcane Pool redirects the base weapon spend into sneak attack dice instead (Greensting Slayer). */
const ARCANE_POOL_SNEAK_ATTACK_ARCHETYPES = new Set(["magus:greensting-slayer"]);

function archetypeSlug(archetypeId: string): string {
  return archetypeId.split(":")[1] ?? archetypeId;
}

/**
 * The base 1st-level Arcane Pool weapon-enhancement spend. Applies only to
 * the one weapon the magus enhances, which the "attack"/"wdamage" targets
 * (unscoped to a specific weapon instance) can't express — see the
 * contextNotes below for the honest caveat, same posture the deeds.ts doc
 * comment takes for Precise Strike's identical per-weapon-instance gap.
 */
function arcanePoolWeaponOption(): ToggleBuffOption {
  return {
    id: "arcanePool:weapon",
    name: "Arcane Pool: Weapon",
    changes: [
      { formula: ARCANE_POOL_ENHANCEMENT_FORMULA, target: "attack", type: "enhancement" },
      { formula: ARCANE_POOL_ENHANCEMENT_FORMULA, target: "wdamage", type: "enhancement" },
    ],
    contextNotes: [
      {
        target: "attack",
        text: "Applies only to the one weapon you enhance: turn this toggle off for any attack made with a different weapon, including an off-hand weapon in two-weapon fighting or a natural attack made during spell combat.",
      },
      {
        target: "attack",
        text: "At 5th level you can spend arcane pool points on a weapon special ability (dancing, flaming, frost, keen, and the rest) instead of a flat enhancement bonus, at its price-modifier cost: that option is not modeled here.",
      },
    ],
  };
}

/** Armored Battlemage's redirect of the base weapon spend onto worn armor, same schedule, verified verbatim against archetype-features.json's own text. */
function arcanePoolArmorOption(archetypeId: string): ToggleBuffOption {
  return {
    id: `arcanePool:${archetypeSlug(archetypeId)}:armor`,
    name: "Arcane Pool: Armor (Armored Battlemage)",
    // Armor enhancement bonus, not a bare "ac" target: `aac` is this
    // engine's dedicated armor-bonus target (`ac-bonus-types.ts`), which is
    // what lets it stack arithmetically on top of the armor's own bonus
    // (the "magic vestment" pattern that file's doc comment describes)
    // instead of landing in the touch-AC-eligible "generic" category a bare
    // "ac" target would fall into.
    changes: [{ formula: ARCANE_POOL_ENHANCEMENT_FORMULA, target: "aac", type: "enhancement" }],
    contextNotes: [
      {
        target: "ac",
        text: "An armored battlemage cannot enhance a weapon this way: applies only to the one suit of armor you enhance, and stops working if anyone but you wears it.",
      },
      {
        target: "ac",
        text: "At 5th level you can spend points on an armor special ability (fortification, spell resistance, and the rest) instead of a flat enhancement bonus, at its price-modifier cost: that option is not modeled here.",
      },
    ],
  };
}

/** Greensting Slayer's redirect of the base weapon spend into sneak attack dice, context-note only since a dice-based bonus has no flat Change target. */
function arcanePoolSneakAttackOption(archetypeId: string): ToggleBuffOption {
  return {
    id: `arcanePool:${archetypeSlug(archetypeId)}:sneakAttack`,
    name: "Arcane Pool: Sneak Attack (Greensting Slayer)",
    changes: [],
    contextNotes: [
      {
        target: "damage",
        text: "A greensting slayer cannot enhance a weapon this way: instead, 1 arcane pool point adds 1d6 sneak attack damage to your next qualifying melee attack this round, plus 1d6 per four levels beyond 1st, to a maximum of 5d6 at 17th level. This dice-based bonus is not modeled as a flat Change.",
      },
    ],
  };
}

/**
 * The Arcane Pool's `tableOptions`: the base weapon spend (redirected or
 * suppressed for the two archetypes that change it, see file doc comment),
 * plus a `spendToggle` row for every picked magus arcanum that carries one.
 */
export function arcanePoolToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
  arcanaIds: readonly string[],
): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];

  if (classLevel >= 1) {
    const armorArchetype = classArchetypeIds.find((id) => ARCANE_POOL_ARMOR_ARCHETYPES.has(id));
    const sneakAttackArchetype = classArchetypeIds.find((id) =>
      ARCANE_POOL_SNEAK_ATTACK_ARCHETYPES.has(id),
    );
    if (armorArchetype) {
      options.push(arcanePoolArmorOption(armorArchetype));
    } else if (sneakAttackArchetype) {
      options.push(arcanePoolSneakAttackOption(sneakAttackArchetype));
    } else {
      options.push(arcanePoolWeaponOption());
    }
  }

  for (const id of arcanaIds) {
    const spend = MAGUS_ARCANA[id]?.spendToggle;
    if (!spend) continue;
    options.push({
      id: `arcanePool:arcana:${id}`,
      name: spend.name ?? MAGUS_ARCANA[id]!.name,
      changes: spend.changes,
      contextNotes: spend.contextNotes,
    });
  }

  return options;
}

/** RAW: free action when casting an arcanist spell, 1 reservoir point (max 1 per spell cast) to increase that spell's DC by 1 (Potent Magic doubles it to 2) — the caster-level half of the spend stays unmodeled, see `cl`'s doc comment in spell-dcs.ts. */
function arcaneReservoirSpellDcOption(exploitIds: readonly string[]): ToggleBuffOption {
  const hasPotentMagic = exploitIds.includes("potentMagic");
  const changes: Change[] = [
    { formula: hasPotentMagic ? "2" : "1", target: "spellDC", type: "untyped" },
  ];
  const contextNotes: ContextNote[] = [
    {
      target: "spellDC",
      text: "Costs 1 arcane reservoir point per spell cast (maximum 1 point per spell): only toggle this on while it's actually being spent on the spells you're casting, and back off once you stop spending reservoir points on DC. The caster-level half of this spend (a +1, or +2 with Potent Magic, to that spell's caster level instead of its DC) is not modeled.",
    },
  ];
  if (hasPotentMagic) {
    contextNotes.push({
      target: "spellDC",
      text: "Potent Magic doubles the spend to +2, already reflected in the toggle above.",
    });
  }
  return {
    id: "arcaneReservoir:spellDC",
    name: "Arcane Reservoir: Spell DC",
    changes,
    contextNotes,
  };
}

/**
 * The Arcane Reservoir's `tableOptions`: the base spell-DC spend (branching
 * its formula on whether Potent Magic is known), plus a `spendToggle` row
 * (and an optional second-tier row) for every picked exploit that carries
 * one.
 */
export function arcaneReservoirToggleOptions(exploitIds: readonly string[]): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [arcaneReservoirSpellDcOption(exploitIds)];

  for (const id of exploitIds) {
    const def = ARCANIST_EXPLOITS[id];
    if (!def) continue;
    if (def.spendToggle) {
      options.push({
        id: `arcaneReservoir:exploit:${id}`,
        name: def.spendToggle.name ?? def.name,
        changes: def.spendToggle.changes,
        contextNotes: def.spendToggle.contextNotes,
      });
    }
    if (def.spendToggleTier2) {
      options.push({
        id: `arcaneReservoir:exploit:${id}:2`,
        name: def.spendToggleTier2.name ?? def.name,
        changes: def.spendToggleTier2.changes,
        contextNotes: def.spendToggleTier2.contextNotes,
      });
    }
  }

  return options;
}
