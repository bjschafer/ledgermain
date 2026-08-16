/**
 * Ki Pool spend toggles (monk/monk unchained ki powers, ninja tricks that
 * cost ki) — the `tableOptions` counterpart to `bardic-performances.ts` /
 * `raging-song.ts` for the Ki Pool resource pool (`resources.ts`'s
 * `feature.tag === "kiPool"` branch, three class-tag bearers: monk,
 * monkUnchained, ninja).
 *
 * Two kinds of entries populate the table:
 *   - Base spends every bearer of the class gets for free, hand-authored
 *     here (verified against aonprd.com's live Monk/Ninja class pages,
 *     2026-08-16, cross-checked against the vendored `class-features.json`
 *     Ki Pool description text for each class):
 *       - Monk (chained), 4th level: "Ki Speed" (+20 land speed, untyped,
 *         1 round) and "Ki Dodge" (+4 dodge AC, 1 round), both a swift
 *         action for 1 ki point.
 *       - Ninja, 2nd level: "Ki Speed" (+20 land speed, untyped, 1 round)
 *         and "Ki Stealth" (+4 insight on Stealth, 1 round), same cost/
 *         action shape.
 *       - Monk Unchained has NO base numeric spend — its only automatic
 *         Ki Pool spend is an extra unarmed strike during a flurry (action
 *         economy, not a typed `Change`; see the extra-attack note below).
 *     Ironskin Monk (`monk:ironskin-monk`) replaces the base Ki Speed option
 *     with a damage bonus vs. objects/constructs that has no matching
 *     `Change` target (see `archetype-extracted/monk.ts`'s
 *     `monk:ironskin-monk:ki-pool:4` entry) — `monkBaseOptions` excludes Ki
 *     Speed for that archetype and keeps Ki Dodge, which Ironskin Monk never
 *     touches. No other chained-monk archetype (56 checked) modifies the
 *     base Ki Pool menu. In particular, Maneuver Master's vendored
 *     `ki-pool-magic:4`/`ki-pool:7`/`ki-pool-lawful:10`/`ki-pool-adamantine:16`
 *     rows are Ironskin Monk boilerplate stamped under the wrong archetype
 *     id (see `archetype-extracted/monk.ts`'s corrected classification note)
 *     — Maneuver Master keeps the full, unmodified base menu.
 *   - Pick-gated spends for specific Monk Unchained ki powers
 *     (`monk-ki-powers.ts`) and ninja tricks (`ninja-tricks.ts`) that carry
 *     their own `spendToggle` field, surfaced only when the character has
 *     actually picked that power/trick. Every other ki power/trick stays
 *     `displayOnly` (extra attacks, dice-based damage, enemy-facing effects,
 *     or a random downside with no safe always-on modeling — see each file's
 *     own doc comment for why).
 *
 * Extra-attack spends (monk's extra flurry attack, monk unchained's extra
 * unarmed strike, ninja's extra full-attack attack) stay out of this table
 * entirely: `ToggleBuffOption.changes` is a typed-modifier list, and no
 * target represents "grant one additional attack."
 *
 * Every entry carries a context note stating its ki cost, action type, and
 * duration, and reminding the player that the pool itself is not
 * auto-decremented by toggling an option here (same activation UX as every
 * other `tableOptions` toggle in this engine — see `bardic-performances.ts`'s
 * `MAINTAIN_NOTE` for the sustained-performance equivalent).
 */

import type { ContextNote } from "@pf1/schema";

import { MONK_KI_POWERS } from "./monk-ki-powers.js";
import { NINJA_TRICKS } from "./ninja-tricks.js";
import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for the Ki Pool — see `resources.ts`'s `feature.tag === "kiPool"` branch. */
export const KI_POOL_DETAIL = "ki points · toggle powers below";

/** Shared cost/duration reminder for every base (non-picked) ki-spend option below — all four share the identical shape. */
const KI_SPEND_NOTE: ContextNote = {
  target: "allChecks",
  text: "Costs 1 ki point, swift action, lasts 1 round. This pool is not auto-decremented while a toggle here is on; track your own points spent.",
};

/** Chained-monk archetypes whose Ki Pool replacement removes the base Ki Speed option — see file doc comment. */
const MONK_SPEED_REPLACING_ARCHETYPES = new Set(["monk:ironskin-monk"]);

function monkBaseOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
): ToggleBuffOption[] {
  if (classLevel < 4) return [];
  const options: ToggleBuffOption[] = [];
  const speedReplaced = classArchetypeIds.some((id) => MONK_SPEED_REPLACING_ARCHETYPES.has(id));
  if (!speedReplaced) {
    options.push({
      id: "kiPool:monk:speed",
      name: "Ki Speed",
      changes: [{ formula: "20", target: "landSpeed", type: "untyped" }],
      contextNotes: [KI_SPEND_NOTE],
    });
  }
  options.push({
    id: "kiPool:monk:dodge",
    name: "Ki Dodge",
    changes: [{ formula: "4", target: "ac", type: "dodge" }],
    contextNotes: [KI_SPEND_NOTE],
  });
  return options;
}

function ninjaBaseOptions(classLevel: number): ToggleBuffOption[] {
  if (classLevel < 2) return [];
  return [
    {
      id: "kiPool:ninja:speed",
      name: "Ki Speed",
      changes: [{ formula: "20", target: "landSpeed", type: "untyped" }],
      contextNotes: [KI_SPEND_NOTE],
    },
    {
      id: "kiPool:ninja:stealth",
      name: "Ki Stealth",
      changes: [{ formula: "4", target: "skill.ste", type: "insight" }],
      contextNotes: [KI_SPEND_NOTE],
    },
  ];
}

/** Monk Unchained ki-power picks that carry a `spendToggle` — surfaced only for a power the character actually knows. */
function monkPickOptions(kiPowerIds: readonly string[], classLevel: number): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];
  for (const id of kiPowerIds) {
    const def = MONK_KI_POWERS[id];
    const spend = def?.spendToggle;
    if (!def || !spend || classLevel < def.minLevel) continue;
    options.push({
      id: `kiPool:kiPower:${id}`,
      name: spend.name ?? def.name,
      changes: spend.changes,
      contextNotes: spend.contextNotes,
    });
  }
  return options;
}

/** Ninja trick picks that carry a `spendToggle` — surfaced only for a trick the character actually knows. */
function ninjaPickOptions(
  ninjaTrickIds: readonly string[],
  classLevel: number,
): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];
  for (const id of ninjaTrickIds) {
    const def = NINJA_TRICKS[id];
    const spend = def?.spendToggle;
    if (!def || !spend || classLevel < def.minLevel) continue;
    options.push({
      id: `kiPool:ninjaTrick:${id}`,
      name: spend.name ?? def.name,
      changes: spend.changes,
      contextNotes: spend.contextNotes,
    });
  }
  return options;
}

/**
 * The Ki Pool's `tableOptions`, filtered to the ki-spending powers the
 * character actually knows — see file doc comment for the base/pick split
 * and the Ironskin Monk exclusion.
 */
export function kiSpendToggleOptions(
  classTag: "monk" | "monkUnchained" | "ninja",
  classLevel: number,
  classArchetypeIds: readonly string[],
  kiPowerIds: readonly string[],
  ninjaTrickIds: readonly string[],
): ToggleBuffOption[] {
  if (classTag === "monk") {
    return monkBaseOptions(classLevel, classArchetypeIds);
  }
  if (classTag === "ninja") {
    return [...ninjaBaseOptions(classLevel), ...ninjaPickOptions(ninjaTrickIds, classLevel)];
  }
  // monkUnchained: no base numeric spend at all — see file doc comment.
  return monkPickOptions(kiPowerIds, classLevel);
}
